const DEFAULT_TTL_SECONDS = 90;
const RPC_TIMEOUT_MS = 10 * 60 * 1000;
const SSE_CHUNK_SIZE = 32;
const MAX_DIAGNOSTIC_EVENTS = 64;
const WS_PATH = "/ws";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && isApiLikePath(url.pathname)) {
      return withCors(new Response(null, { status: 204 }));
    }

    if (url.pathname === "/api/client-config") {
      return withCors(
        jsonResponse({
          ok: true,
          ws_url: `${url.protocol === "https:" ? "wss:" : "ws:"}//${url.host}${WS_PATH}`,
          broker_openai_auth_enabled: Boolean(activeOpenAiToken(env))
        })
      );
    }

    if (url.pathname === "/api/diagnostics") {
      if (!isAuthorizedRequest(request.headers, env)) {
        return withCors(sendUnauthorized());
      }
      const stub = env.BROKER.get(env.BROKER.idFromName("global"));
      return withCors(await stub.fetch(request));
    }

    if (url.pathname === "/api/client-events" && request.method === "POST") {
      const stub = env.BROKER.get(env.BROKER.idFromName("global"));
      return withCors(await stub.fetch(request));
    }

    if (url.pathname === "/health" || url.pathname === WS_PATH || url.pathname === "/v1/models" || url.pathname === "/v1/chat/completions" || url.pathname === "/v1/responses") {
      if (requiresOpenAiAuth(url.pathname) && !isAuthorizedRequest(request.headers, env)) {
        return withCors(sendUnauthorized());
      }

      const stub = env.BROKER.get(env.BROKER.idFromName("global"));
      const response = await stub.fetch(request);
      return url.pathname === WS_PATH ? response : withCors(response);
    }

    let response = await env.ASSETS.fetch(request);
    if (response.status === 404 && shouldServeAppShell(url.pathname)) {
      response = await env.ASSETS.fetch(new Request(new URL("/index.html", request.url).toString(), request));
    }
    return response;
  }
};

export class BrokerRelay {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.initialized = false;
    this.initPromise = null;
    this.sessionsBySocket = new Map();
    this.serversById = new Map();
    this.serversByInstallationId = new Map();
    this.clientsById = new Map();
    this.linksByClientId = new Map();
    this.codes = new Map();
    this.pendingHttpRpc = new Map();
    this.recentEvents = [];
  }

  async fetch(request) {
    await this.ensureReady();
    const url = new URL(request.url);

    if (url.pathname === WS_PATH) {
      return this.handleWebSocketUpgrade(request);
    }

    if (request.method === "GET" && url.pathname === "/health") {
      this.cleanupExpiredCodes();
      return jsonResponse(this.getHealthPayload());
    }

    if (request.method === "GET" && url.pathname === "/api/diagnostics") {
      this.cleanupExpiredCodes();
      return jsonResponse(this.getDiagnosticsPayload());
    }

    if (request.method === "POST" && url.pathname === "/api/client-events") {
      const body = await readJsonBody(request);
      await this.recordEvent(body?.level || "info", body?.type || "client-event", {
        source: "browser",
        event: sanitizeEventBody(body)
      });
      return jsonResponse({ ok: true });
    }

    if (request.method === "GET" && url.pathname === "/v1/models") {
      const payload = await this.handleModels(request.headers, url.searchParams);
      return jsonResponse(payload);
    }

    if (request.method === "POST" && url.pathname === "/v1/chat/completions") {
      const body = await readJsonBody(request);
      return this.handleChatCompletions(body, request.headers);
    }

    if (request.method === "POST" && url.pathname === "/v1/responses") {
      const body = await readJsonBody(request);
      return this.handleResponses(body, request.headers);
    }

    return jsonResponse(
      {
        error: {
          message: `Unknown route: ${request.method} ${url.pathname}`,
          type: "invalid_request_error"
        }
      },
      404
    );
  }

  async webSocketMessage(ws, message) {
    await this.ensureReady();
    const session = this.sessionsBySocket.get(ws);
    if (!session) return;
    const text = typeof message === "string" ? message : new TextDecoder().decode(message);
    await this.onMessage(session, text);
  }

  async webSocketClose(ws) {
    await this.ensureReady();
    const session = this.sessionsBySocket.get(ws);
    if (!session) return;
    this.onClose(session);
  }

  async webSocketError(ws) {
    await this.ensureReady();
    const session = this.sessionsBySocket.get(ws);
    if (!session) return;
    this.onClose(session);
  }

  async ensureReady() {
    if (this.initialized) return;
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    await this.initPromise;
  }

  async initialize() {
    const storedCodes = await this.state.storage.list({ prefix: "code:" });
    for (const [key, value] of storedCodes) {
      if (value && typeof value === "object" && value.code && Number(value.expiresAt) > Date.now()) {
        this.codes.set(String(value.code), value);
      } else {
        await this.state.storage.delete(key);
      }
    }

    const storedEvents = await this.state.storage.get("diag:events");
    if (Array.isArray(storedEvents)) {
      this.recentEvents = storedEvents.slice(0, MAX_DIAGNOSTIC_EVENTS);
    }

    for (const ws of this.state.getWebSockets()) {
      this.rehydrateSocket(ws);
    }

    this.cleanupExpiredCodes();
    this.initialized = true;
  }

  rehydrateSocket(ws) {
    const meta = deserializeSocket(ws);
    const session = createSession(ws, meta);
    this.sessionsBySocket.set(ws, session);
    this.indexSession(session);
  }

  handleWebSocketUpgrade(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return jsonResponse(
        {
          error: {
            message: "Expected websocket upgrade.",
            type: "invalid_request_error"
          }
        },
        426
      );
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.state.acceptWebSocket(server);

    const session = createSession(server, {});
    this.sessionsBySocket.set(server, session);
    this.persistSession(session);
    this.send(session, { type: "hello", service: "pair-broker" });
    this.recordEvent("info", "socket-open", { role: "unknown", session: sessionSummary(session) }).catch(() => {});

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  async onMessage(session, rawText) {
    session.lastEventAt = Date.now();
    let msg = null;
    try {
      msg = JSON.parse(rawText);
    } catch {
      this.send(session, errorReply(null, "invalid json"));
      return;
    }

    if (!msg || typeof msg !== "object" || typeof msg.type !== "string") {
      this.send(session, errorReply(msg?.req_id || null, "invalid message"));
      return;
    }

    try {
      switch (msg.type) {
        case "register_server":
          await this.handleRegisterServer(session, msg);
          return;
        case "create_code":
          await this.handleCreateCode(session, msg);
          return;
        case "pair_client":
          await this.handlePairClient(session, msg);
          return;
        case "resume_client":
          await this.handleResumeClient(session, msg);
          return;
        case "pair_accept":
          await this.handlePairAccept(session, msg);
          return;
        case "auth_result":
          await this.handleAuthResult(session, msg);
          return;
        case "rpc":
          await this.handleClientRpc(session, msg);
          return;
        case "rpc_result":
        case "rpc_stream":
        case "rpc_end":
          await this.handleServerRpcReply(session, msg);
          return;
        default:
          this.send(session, errorReply(msg.req_id || null, `unsupported type: ${msg.type}`));
      }
    } catch (error) {
      this.send(session, errorReply(msg.req_id || null, asErrorMessage(error)));
    }
  }

  async handleRegisterServer(session, msg) {
    const installationId = normalizeId(msg.installation_id);
    const serverName = safeString(msg.server_name, 120) || null;
    if (!installationId) {
      this.send(session, errorReply(msg.req_id || null, "installation_id is required"));
      return;
    }

    if (session.serverId) {
      await this.detachServer(session);
    }

    const previous = this.serversByInstallationId.get(installationId);
    if (previous && previous !== session) {
      this.send(previous, { type: "server_replaced" });
      this.safeClose(previous.ws, 4000, "replaced");
      await this.detachServer(previous);
    }

    this.unindexSession(session);
    session.role = "server";
    session.serverId = randomId("srv");
    session.serverName = serverName;
    session.installationId = installationId;
    session.clientId = null;
    session.clientInstallationId = null;
    session.linkedServerId = null;
    session.linkedInstallationId = null;
    session.deviceId = null;
    this.indexSession(session);
    this.persistSession(session);
    await this.recordEvent("info", "server-registered", {
      server_id: session.serverId,
      installation_id: installationId,
      server_name: serverName
    });

    this.send(session, {
      type: "server_registered",
      req_id: msg.req_id || null,
      server_id: session.serverId,
      installation_id: installationId
    });
  }

  async handleCreateCode(session, msg) {
    if (session.role !== "server" || !session.serverId || !session.installationId) {
      this.send(session, errorReply(msg.req_id || null, "create_code requires registered server"));
      return;
    }

    this.cleanupExpiredCodes();
    await this.deleteCodesForServer(session.serverId);

    const ttlSeconds = clampNumber(Number(msg.ttl_seconds) || DEFAULT_TTL_SECONDS, 30, 3600);
    const code = this.generateCode();
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const payload = {
      code,
      serverId: session.serverId,
      installationId: session.installationId,
      expiresAt,
      createdAt: Date.now()
    };
    this.codes.set(code, payload);
    await this.state.storage.put(`code:${code}`, payload);

    this.send(session, {
      type: "code_created",
      req_id: msg.req_id || null,
      code,
      ttl_seconds: ttlSeconds,
      expires_at: new Date(expiresAt).toISOString(),
      installation_id: session.installationId
    });
  }

  async handlePairClient(session, msg) {
    this.cleanupExpiredCodes();
    this.ensureClientIdentity(session);
    const code = normalizeCode(msg.code);
    if (!code) {
      this.send(session, errorReply(msg.req_id || null, "code is required"));
      return;
    }

    const found = this.codes.get(code);
    if (!found || found.expiresAt <= Date.now()) {
      this.send(session, errorReply(msg.req_id || null, "code not found or expired"));
      return;
    }

    const serverSession = this.serversById.get(found.serverId);
    if (!isOpen(serverSession)) {
      this.codes.delete(code);
      await this.state.storage.delete(`code:${code}`);
      await this.recordEvent("warn", "stale-code-rejected", {
        code,
        installation_id: found.installationId,
        server_id: found.serverId
      });
      this.send(session, errorReply(msg.req_id || null, "pair code is stale; refresh the desktop code"));
      return;
    }

    this.unindexSession(session);
    session.role = "client";
    session.pendingReqId = msg.req_id || null;
    session.pendingPairServerId = serverSession.serverId;
    session.clientInstallationId = normalizeId(msg.client_installation_id);
    this.indexSession(session);
    this.persistSession(session);
    this.codes.delete(code);
    await this.state.storage.delete(`code:${code}`);
    await this.recordEvent("info", "pair-requested", {
      code,
      client_id: session.clientId,
      client_installation_id: session.clientInstallationId,
      installation_id: found.installationId,
      server_id: serverSession.serverId,
      device_name: safeString(msg.device_name, 80)
    });

    this.send(serverSession, {
      type: "pair_request",
      client_id: session.clientId,
      code,
      device_name: safeString(msg.device_name, 80),
      client_installation_id: normalizeId(msg.client_installation_id)
    });
  }

  async handleResumeClient(session, msg) {
    this.ensureClientIdentity(session);
    const installationId = normalizeId(msg.installation_id);
    const deviceId = normalizeId(msg.device_id);
    const deviceToken = safeString(msg.device_token, 256);

    if (!installationId || !deviceId || !deviceToken) {
      this.send(session, errorReply(msg.req_id || null, "installation_id, device_id, and device_token are required"));
      return;
    }

    const serverSession = this.serversByInstallationId.get(installationId);
    if (!isOpen(serverSession)) {
      this.send(session, errorReply(msg.req_id || null, "server is offline"));
      return;
    }

    this.unindexSession(session);
    session.role = "client";
    session.pendingReqId = msg.req_id || null;
    session.pendingPairServerId = serverSession.serverId;
    this.indexSession(session);
    this.persistSession(session);
    await this.recordEvent("info", "resume-requested", {
      client_id: session.clientId,
      installation_id: installationId,
      device_id: deviceId,
      server_id: serverSession.serverId
    });

    this.send(serverSession, {
      type: "auth_request",
      client_id: session.clientId,
      device_id: deviceId,
      device_token: deviceToken
    });
  }

  async handlePairAccept(session, msg) {
    if (session.role !== "server" || !session.serverId || !session.installationId) {
      this.send(session, errorReply(msg.req_id || null, "pair_accept requires registered server"));
      return;
    }

    const clientId = normalizeId(msg.client_id);
    const deviceId = normalizeId(msg.device_id);
    const deviceToken = safeString(msg.device_token, 256);
    if (!clientId || !deviceId || !deviceToken) {
      this.send(session, errorReply(msg.req_id || null, "client_id, device_id, and device_token are required"));
      return;
    }

    const client = this.clientsById.get(clientId);
    if (!isOpen(client)) {
      this.send(session, errorReply(msg.req_id || null, "client is offline"));
      return;
    }

    this.linkClientToServer(client, session, {
      installationId: session.installationId,
      deviceId
    });

    this.send(client, {
      type: "paired",
      req_id: client.pendingReqId || null,
      client_id: client.clientId,
      installation_id: session.installationId,
      server_id: session.serverId,
      server_name: safeString(msg.server_name, 120),
      device_id: deviceId,
      device_token: deviceToken
    });

    client.pendingReqId = null;
    client.pendingPairServerId = null;
    this.persistSession(client);
    await this.recordEvent("info", "pair-accepted", {
      client_id: client.clientId,
      installation_id: session.installationId,
      server_id: session.serverId,
      device_id: deviceId
    });
  }

  async handleAuthResult(session, msg) {
    if (session.role !== "server" || !session.serverId || !session.installationId) {
      this.send(session, errorReply(msg.req_id || null, "auth_result requires registered server"));
      return;
    }

    const clientId = normalizeId(msg.client_id);
    if (!clientId) {
      this.send(session, errorReply(msg.req_id || null, "client_id is required"));
      return;
    }

    const client = this.clientsById.get(clientId);
    if (!isOpen(client)) {
      return;
    }

    if (!msg.ok) {
      this.send(client, errorReply(client.pendingReqId || null, safeString(msg.message, 200) || "authentication failed"));
      client.pendingReqId = null;
      client.pendingPairServerId = null;
      this.persistSession(client);
      await this.recordEvent("warn", "auth-rejected", {
        client_id: client.clientId,
        installation_id: session.installationId,
        server_id: session.serverId,
        message: safeString(msg.message, 200) || "authentication failed"
      });
      return;
    }

    const deviceId = normalizeId(msg.device_id);
    if (!deviceId) {
      this.send(client, errorReply(client.pendingReqId || null, "server returned invalid device_id"));
      client.pendingReqId = null;
      client.pendingPairServerId = null;
      this.persistSession(client);
      return;
    }

    this.linkClientToServer(client, session, {
      installationId: session.installationId,
      deviceId
    });

    this.send(client, {
      type: "authenticated",
      req_id: client.pendingReqId || null,
      client_id: client.clientId,
      installation_id: session.installationId,
      server_id: session.serverId,
      server_name: safeString(session.serverName, 120),
      device_id: deviceId
    });

    client.pendingReqId = null;
    client.pendingPairServerId = null;
    this.persistSession(client);
    await this.recordEvent("info", "auth-accepted", {
      client_id: client.clientId,
      installation_id: session.installationId,
      server_id: session.serverId,
      device_id: deviceId
    });
  }

  async handleClientRpc(session, msg) {
    if (session.role !== "client" || !session.clientId) {
      this.send(session, errorReply(msg.req_id || null, "rpc requires client session"));
      return;
    }

    const link = this.linksByClientId.get(session.clientId);
    if (!link) {
      this.send(session, errorReply(msg.req_id || null, "client is not authenticated"));
      return;
    }

    const server = this.serversById.get(link.serverId);
    if (!isOpen(server)) {
      this.linksByClientId.delete(session.clientId);
      this.unindexSession(session);
      session.linkedServerId = null;
      session.linkedInstallationId = null;
      session.deviceId = null;
      this.indexSession(session);
      this.persistSession(session);
      this.send(session, errorReply(msg.req_id || null, "server is offline"));
      return;
    }

    this.send(server, {
      type: "rpc",
      req_id: msg.req_id || null,
      client_id: session.clientId,
      method: safeString(msg.method, 80),
      body: msg.body ?? null
    });
  }

  async handleServerRpcReply(session, msg) {
    if (session.role !== "server" || !session.serverId) {
      this.send(session, errorReply(msg.req_id || null, `${msg.type} requires server session`));
      return;
    }

    const clientId = normalizeId(msg.client_id);
    if (!clientId) {
      this.send(session, errorReply(msg.req_id || null, "client_id is required"));
      return;
    }

    const httpKey = rpcRequestKey(clientId, msg.req_id);
    const pendingHttp = httpKey ? this.pendingHttpRpc.get(httpKey) : null;
    if (pendingHttp) {
      this.handlePendingHttpRpcMessage(pendingHttp, msg);
      return;
    }

    const link = this.linksByClientId.get(clientId);
    if (!link || link.serverId !== session.serverId) {
      return;
    }

    const client = this.clientsById.get(clientId);
    if (!isOpen(client)) {
      this.linksByClientId.delete(clientId);
      return;
    }

    this.send(client, {
      type: msg.type,
      req_id: msg.req_id || null,
      method: safeString(msg.method, 80),
      event: safeString(msg.event, 80),
      data: msg.data ?? null
    });
  }

  onClose(session) {
    if (session.closed) return;
    session.closed = true;
    this.sessionsBySocket.delete(session.ws);
    this.recordEvent("warn", "socket-closed", {
      role: session.role || "unknown",
      session: sessionSummary(session)
    }).catch(() => {});

    if (session.serverId) {
      this.failPendingHttpForServer(session.serverId, "server is offline");
      this.detachServer(session).catch(() => {});
      this.notifyClientsForServer(session.serverId, {
        type: "server_unavailable",
        installation_id: session.installationId
      });
      return;
    }

    if (session.clientId) {
      this.clientsById.delete(session.clientId);
      this.linksByClientId.delete(session.clientId);
    }
  }

  async detachServer(session) {
    if (!session?.serverId) return;
    const serverId = session.serverId;
    this.unindexSession(session);
    session.role = null;
    session.serverId = null;
    session.serverName = null;
    session.installationId = null;
    this.persistSession(session);
    await this.deleteCodesForServer(serverId);
  }

  notifyClientsForServer(serverId, payload) {
    for (const [clientId, link] of [...this.linksByClientId.entries()]) {
      if (link.serverId !== serverId) continue;
      this.linksByClientId.delete(clientId);
      const client = this.clientsById.get(clientId);
      if (!client) continue;
      this.unindexSession(client);
      client.linkedServerId = null;
      client.linkedInstallationId = null;
      client.deviceId = null;
      this.indexSession(client);
      this.persistSession(client);
      if (isOpen(client)) {
        this.send(client, payload);
      }
    }
  }

  async deleteCodesForServer(serverId) {
    for (const [code, item] of [...this.codes.entries()]) {
      if (item.serverId === serverId) {
        this.codes.delete(code);
        await this.state.storage.delete(`code:${code}`);
      }
    }
  }

  linkClientToServer(client, server, { installationId, deviceId }) {
    this.unindexSession(client);
    client.linkedServerId = server.serverId;
    client.linkedInstallationId = installationId;
    client.deviceId = deviceId;
    client.linkedAt = Date.now();
    this.indexSession(client);
    this.persistSession(client);
  }

  ensureClientIdentity(session) {
    if (session.clientId) return;
    this.unindexSession(session);
    session.clientId = randomId("cli");
    this.indexSession(session);
    this.persistSession(session);
  }

  cleanupExpiredCodes() {
    const now = Date.now();
    for (const [code, item] of [...this.codes.entries()]) {
      const server = this.serversById.get(item.serverId);
      if (item.expiresAt <= now || !isOpen(server)) {
        this.codes.delete(code);
        this.state.storage.delete(`code:${code}`).catch(() => {});
      }
    }
  }

  generateCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (let i = 0; i < 32; i += 1) {
      let code = "";
      for (let j = 0; j < 6; j += 1) {
        code += alphabet[randomNumber(alphabet.length)];
      }
      if (!this.codes.has(code)) return code;
    }
    throw new Error("failed to allocate code");
  }

  indexSession(session) {
    if (session.serverId) {
      this.serversById.set(session.serverId, session);
      if (session.installationId) {
        this.serversByInstallationId.set(session.installationId, session);
      }
    }

    if (session.clientId) {
      this.clientsById.set(session.clientId, session);
      if (session.linkedServerId) {
        this.linksByClientId.set(session.clientId, {
          clientId: session.clientId,
          serverId: session.linkedServerId,
          installationId: session.linkedInstallationId || null,
          deviceId: session.deviceId || null,
          linkedAt: session.linkedAt || Date.now()
        });
      }
    }
  }

  unindexSession(session) {
    if (session.serverId && this.serversById.get(session.serverId) === session) {
      this.serversById.delete(session.serverId);
    }
    if (session.installationId && this.serversByInstallationId.get(session.installationId) === session) {
      this.serversByInstallationId.delete(session.installationId);
    }
    if (session.clientId && this.clientsById.get(session.clientId) === session) {
      this.clientsById.delete(session.clientId);
    }
    if (session.clientId && this.linksByClientId.get(session.clientId)?.serverId === session.linkedServerId) {
      this.linksByClientId.delete(session.clientId);
    }
  }

  persistSession(session) {
    serializeSocket(session.ws, {
      sessionId: session.sessionId,
      role: session.role,
      serverId: session.serverId,
      serverName: session.serverName,
      installationId: session.installationId,
      clientId: session.clientId,
      clientInstallationId: session.clientInstallationId,
      linkedServerId: session.linkedServerId,
      linkedInstallationId: session.linkedInstallationId,
      deviceId: session.deviceId,
      pendingReqId: session.pendingReqId,
      pendingPairServerId: session.pendingPairServerId,
      linkedAt: session.linkedAt,
      connectedAt: session.connectedAt,
      lastEventAt: session.lastEventAt
    });
  }

  send(session, payload) {
    if (!isOpen(session)) return;
    try {
      session.ws.send(JSON.stringify(payload));
    } catch {}
  }

  safeClose(ws, code, reason) {
    try {
      ws.close(code, reason);
    } catch {}
  }

  getHealthPayload() {
    return {
      ok: true,
      service: "pair-broker-edge",
      servers: this.listConnectedServers().length,
      clients: [...this.clientsById.values()].filter(isOpen).length,
      active_codes: this.codes.size,
      linked_clients: this.linksByClientId.size,
      openai_api_auth_enabled: Boolean(activeOpenAiToken(this.env))
    };
  }

  getDiagnosticsPayload() {
    return {
      ...this.getHealthPayload(),
      generated_at: new Date().toISOString(),
      servers_detail: this.listConnectedServers().map((session) => sessionSummary(session)),
      clients_detail: this.listConnectedClients().map((session) => ({
        ...sessionSummary(session),
        linked: Boolean(session.linkedServerId),
        linked_installation_id: session.linkedInstallationId || null,
        linked_device_id: session.deviceId || null
      })),
      active_codes_detail: [...this.codes.values()]
        .sort((left, right) => left.expiresAt - right.expiresAt)
        .map((entry) => ({
          code: entry.code,
          installation_id: entry.installationId,
          server_id: entry.serverId,
          created_at: new Date(entry.createdAt).toISOString(),
          expires_at: new Date(entry.expiresAt).toISOString()
        })),
      recent_events: this.recentEvents.slice(0, MAX_DIAGNOSTIC_EVENTS)
    };
  }

  listConnectedServers() {
    return [...this.serversById.values()].filter(isOpen);
  }

  listConnectedClients() {
    return [...this.clientsById.values()].filter(isOpen);
  }

  async recordEvent(level, type, payload = null) {
    const entry = {
      id: randomId("evt"),
      at: new Date().toISOString(),
      level: safeString(level, 24) || "info",
      type: safeString(type, 80) || "event",
      payload: sanitizeDiagnosticPayload(payload)
    };
    this.recentEvents = [entry, ...this.recentEvents].slice(0, MAX_DIAGNOSTIC_EVENTS);
    await this.state.storage.put("diag:events", this.recentEvents);
  }

  selectInstallationId(headers, body, searchParams = null) {
    return normalizeId(
      body?.installation_id ||
        body?.metadata?.installation_id ||
        searchParams?.get("installation_id") ||
        headers.get("x-installation-id") ||
        headers.get("x-broker-installation-id") ||
        null
    );
  }

  resolveTargetServer(installationId) {
    if (installationId) {
      const byInstallation = this.serversByInstallationId.get(installationId);
      if (!isOpen(byInstallation)) {
        throw new Error(`server is offline for installation_id: ${installationId}`);
      }
      return byInstallation;
    }

    const connected = this.listConnectedServers();
    if (connected.length === 1) return connected[0];
    if (connected.length === 0) throw new Error("no connected main service is available");
    throw new Error("multiple main services are connected; specify installation_id or x-broker-installation-id");
  }

  async handleModels(headers, searchParams) {
    const installationId = this.selectInstallationId(headers, {}, searchParams);
    const servers = installationId ? [this.resolveTargetServer(installationId)] : this.listConnectedServers();
    const data = [];

    for (const server of servers) {
      const config = await this.invokeBrokerRpcOnce(server, "config.get", {});
      data.push({
        id: config?.codex_model || "unknown",
        object: "model",
        created: 0,
        owned_by: "openai",
        _broker: {
          installation_id: server.installationId || null
        }
      });
    }

    return { object: "list", data };
  }

  async handleChatCompletions(body, headers) {
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return jsonResponse(invalidRequest("`messages` must be a non-empty array."), 400);
    }

    const server = this.resolveTargetServer(this.selectInstallationId(headers, body));
    const config = await this.invokeBrokerRpcOnce(server, "config.get", {});
    const model = body.model || config?.codex_model || "unknown";
    const result = await this.invokeBrokerRpcOnce(server, "openai.chat", {
      ...body,
      model,
      stream: false
    });
    result._broker = { installation_id: server.installationId || null };

    if (body.stream) {
      return sseChatCompletionResponse(result);
    }

    return jsonResponse(result, 200, {
      "x-codex-thread-id": result?._codex?.thread_id || ""
    });
  }

  async handleResponses(body, headers) {
    const server = this.resolveTargetServer(this.selectInstallationId(headers, body));
    const config = await this.invokeBrokerRpcOnce(server, "config.get", {});
    const model = body?.model || config?.codex_model || "unknown";
    const result = await this.invokeBrokerRpcOnce(server, "openai.responses", {
      ...body,
      model,
      stream: false
    });
    result._broker = { installation_id: server.installationId || null };

    if (body?.stream) {
      return sseResponsesResponse(result);
    }

    return jsonResponse(result, 200, {
      "x-codex-thread-id": result?._codex?.thread_id || ""
    });
  }

  invokeBrokerRpcOnce(server, method, body) {
    if (!isOpen(server)) {
      throw new Error("server is offline");
    }

    return new Promise((resolve, reject) => {
      const clientId = randomId("http");
      const reqId = randomId("req");
      const key = rpcRequestKey(clientId, reqId);
      const timer = setTimeout(() => {
        this.pendingHttpRpc.delete(key);
        reject(new Error(`rpc timeout: ${method}`));
      }, RPC_TIMEOUT_MS);

      this.pendingHttpRpc.set(key, {
        key,
        serverId: server.serverId,
        method,
        timer,
        onResult: resolve,
        onEnd: resolve,
        onError: reject
      });

      this.send(server, {
        type: "rpc",
        req_id: reqId,
        client_id: clientId,
        method,
        body: body ?? null
      });
    });
  }

  handlePendingHttpRpcMessage(entry, msg) {
    clearTimeout(entry.timer);

    if (msg.type === "rpc_result") {
      this.pendingHttpRpc.delete(entry.key);
      entry.onResult?.(msg.data ?? null);
      return;
    }

    if (msg.type === "rpc_stream") {
      entry.timer = setTimeout(() => {
        this.pendingHttpRpc.delete(entry.key);
        entry.onError?.(new Error(`rpc timeout: ${entry.method}`));
      }, RPC_TIMEOUT_MS);
      return;
    }

    if (msg.type === "rpc_end") {
      this.pendingHttpRpc.delete(entry.key);
      const error = safeString(msg.data?.error, 500);
      if (error) {
        entry.onError?.(new Error(error));
        return;
      }
      entry.onEnd?.(msg.data ?? null);
    }
  }

  failPendingHttpForServer(serverId, message) {
    for (const [key, entry] of [...this.pendingHttpRpc.entries()]) {
      if (entry.serverId !== serverId) continue;
      clearTimeout(entry.timer);
      this.pendingHttpRpc.delete(key);
      entry.onError?.(new Error(message));
    }
  }
}

function createSession(ws, meta = {}) {
  return {
    ws,
    sessionId: normalizeId(meta.sessionId) || randomId("sess"),
    role: meta.role || null,
    serverId: normalizeId(meta.serverId),
    serverName: safeString(meta.serverName, 120) || null,
    installationId: normalizeId(meta.installationId),
    clientId: normalizeId(meta.clientId),
    clientInstallationId: normalizeId(meta.clientInstallationId),
    linkedServerId: normalizeId(meta.linkedServerId),
    linkedInstallationId: normalizeId(meta.linkedInstallationId),
    deviceId: normalizeId(meta.deviceId),
    pendingReqId: normalizeId(meta.pendingReqId),
    pendingPairServerId: normalizeId(meta.pendingPairServerId),
    linkedAt: Number(meta.linkedAt) || Date.now(),
    connectedAt: Number(meta.connectedAt) || Date.now(),
    lastEventAt: Number(meta.lastEventAt) || Date.now(),
    closed: false
  };
}

function deserializeSocket(ws) {
  try {
    return ws.deserializeAttachment?.() || {};
  } catch {
    return {};
  }
}

function serializeSocket(ws, meta) {
  try {
    ws.serializeAttachment?.(meta);
  } catch {}
}

function isOpen(session) {
  return Boolean(session?.ws && session.ws.readyState === WebSocket.OPEN);
}

function normalizeCode(value) {
  const code = String(value || "").trim().toUpperCase();
  return /^[A-Z2-9]{6}$/.test(code) ? code : null;
}

function normalizeId(value) {
  const text = String(value || "").trim();
  return /^[a-zA-Z0-9._:-]{3,128}$/.test(text) ? text : null;
}

function safeString(value, maxLength = 120) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.slice(0, maxLength);
}

function sessionSummary(session) {
  return {
    session_id: session.sessionId,
    role: session.role || "unknown",
    server_id: session.serverId || null,
    server_name: session.serverName || null,
    installation_id: session.installationId || null,
    client_id: session.clientId || null,
    client_installation_id: session.clientInstallationId || null,
    linked_server_id: session.linkedServerId || null,
    linked_installation_id: session.linkedInstallationId || null,
    device_id: session.deviceId || null,
    connected_at: new Date(session.connectedAt || Date.now()).toISOString(),
    last_event_at: new Date(session.lastEventAt || Date.now()).toISOString()
  };
}

function sanitizeEventBody(body) {
  if (!body || typeof body !== "object") return null;
  return sanitizeDiagnosticPayload({
    app_version: safeString(body.app_version, 48),
    page: safeString(body.page, 120),
    detail: body.detail ?? null,
    user_agent: safeString(body.user_agent, 220),
    device_label: safeString(body.device_label, 120),
    client_installation_id: normalizeId(body.client_installation_id),
    href: safeString(body.href, 220)
  });
}

function sanitizeDiagnosticPayload(value) {
  return JSON.parse(
    JSON.stringify(value ?? null, (key, inner) => {
      if (typeof key === "string" && /token|authorization|secret|password/i.test(key)) {
        return "[redacted]";
      }
      if (typeof inner === "string") {
        return inner.slice(0, 500);
      }
      return inner;
    })
  );
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function randomId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function randomNumber(max) {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] % max;
}

function errorReply(reqId, message) {
  return { type: "error", req_id: reqId || null, message };
}

function rpcRequestKey(clientId, reqId) {
  const client = normalizeId(clientId);
  const request = normalizeId(reqId);
  if (!client || !request) return null;
  return `${client}:${request}`;
}

function invalidRequest(message) {
  return {
    error: {
      message,
      type: "invalid_request_error"
    }
  };
}

function activeOpenAiToken(env) {
  return String(env.BROKER_OPENAI_API_TOKEN || env.OPENAI_API_TOKEN || "").trim();
}

function requiresOpenAiAuth(pathname) {
  return pathname === "/v1/models" || pathname === "/v1/chat/completions" || pathname === "/v1/responses";
}

function isAuthorizedRequest(headers, env) {
  const expected = activeOpenAiToken(env);
  if (!expected) return true;
  const actual = getBearerToken(headers);
  return Boolean(actual) && actual === expected;
}

function getBearerToken(headers) {
  const header = headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function sendUnauthorized() {
  return jsonResponse(
    {
      error: {
        message: "Invalid or missing bearer token.",
        type: "invalid_request_error",
        code: "invalid_api_key"
      }
    },
    401,
    {
      "WWW-Authenticate": 'Bearer realm="codex-broker"'
    }
  );
}

function isApiLikePath(pathname) {
  return pathname === "/health" || pathname === "/api/client-config" || pathname.startsWith("/v1/");
}

function shouldServeAppShell(pathname) {
  if (pathname === "/" || pathname === "") return true;
  return !pathname.includes(".");
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    ...extraHeaders
  });
  return new Response(JSON.stringify(payload), {
    status,
    headers
  });
}

async function readJsonBody(request) {
  const text = await request.text();
  return text.trim() ? JSON.parse(text) : {};
}

function withCors(response) {
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
  headers.set("access-control-allow-headers", "authorization,content-type,x-installation-id,x-broker-installation-id,x-codex-thread-id,x-thread-id");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function sseChatCompletionResponse(response) {
  const id = response.id || randomId("chatcmpl");
  const created = response.created || nowSeconds();
  const model = response.model || "unknown";
  const threadId = response?._codex?.thread_id || "";
  const choice = response.choices?.[0] || {};

  return sseResponse(
    (writer) => {
      writeSse(writer, {
        id,
        object: "chat.completion.chunk",
        created,
        model,
        choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }]
      });

      if (Array.isArray(choice.message?.tool_calls) && choice.message.tool_calls.length > 0) {
        choice.message.tool_calls.forEach((toolCall, index) => {
          writeSse(writer, {
            id,
            object: "chat.completion.chunk",
            created,
            model,
            choices: [
              {
                index: 0,
                delta: {
                  tool_calls: [
                    {
                      index,
                      id: toolCall.id,
                      type: "function",
                      function: toolCall.function
                    }
                  ]
                },
                finish_reason: null
              }
            ]
          });
        });
      } else {
        for (const chunk of splitForStreaming(choice.message?.content || "")) {
          writeSse(writer, {
            id,
            object: "chat.completion.chunk",
            created,
            model,
            choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }]
          });
        }
      }

      writeSse(writer, {
        id,
        object: "chat.completion.chunk",
        created,
        model,
        choices: [{ index: 0, delta: {}, finish_reason: choice.finish_reason || "stop" }],
        usage: response.usage,
        _codex: response._codex,
        _broker: response._broker
      });
      writer.write("data: [DONE]\n\n");
    },
    {
      "x-codex-thread-id": threadId
    }
  );
}

function sseResponsesResponse(response) {
  return sseResponse(
    (writer) => {
      writeSseEvent(writer, "response.created", {
        id: response.id,
        object: "response",
        created_at: response.created_at,
        model: response.model,
        status: "in_progress"
      });

      const output = Array.isArray(response.output) ? response.output : [];
      if (output.length && output[0]?.type === "message") {
        const text = output[0]?.content?.[0]?.text || "";
        for (const chunk of splitForStreaming(text)) {
          writeSseEvent(writer, "response.output_text.delta", {
            response_id: response.id,
            delta: chunk
          });
        }
      } else {
        for (const item of output) {
          writeSseEvent(writer, "response.output_item.added", {
            response_id: response.id,
            item
          });
        }
      }

      writeSseEvent(writer, "response.completed", response);
      writer.write("data: [DONE]\n\n");
    },
    {
      "x-codex-thread-id": response?._codex?.thread_id || ""
    }
  );
}

function sseResponse(writeFn, extraHeaders = {}) {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  const wrapped = {
    write(text) {
      return writer.write(encoder.encode(text));
    }
  };

  Promise.resolve()
    .then(() => writeFn(wrapped))
    .catch((error) => {
      writeSseEvent(wrapped, "error", { message: asErrorMessage(error) });
    })
    .finally(() => writer.close());

  return new Response(stream.readable, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      ...extraHeaders
    }
  });
}

function writeSse(writer, payload) {
  writer.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function writeSseEvent(writer, event, payload) {
  writer.write(`event: ${event}\n`);
  writer.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function splitForStreaming(text) {
  return String(text || "").match(new RegExp(`.{1,${SSE_CHUNK_SIZE}}`, "gs")) || [String(text || "")];
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function asErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
