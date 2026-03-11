import http from "node:http";
import crypto from "node:crypto";
import { Readable } from "node:stream";
import { WebSocketServer } from "ws";

const HOST = process.env.BROKER_HOST || "0.0.0.0";
const PORT = Number(process.env.BROKER_PORT || 8000);
const WS_PATH = process.env.BROKER_WS_PATH || "/ws";
const DEFAULT_TTL_SECONDS = Number(process.env.BROKER_CODE_TTL || 90);
const OPENAI_API_TOKEN = String(process.env.BROKER_OPENAI_API_TOKEN || process.env.OPENAI_API_TOKEN || "").trim();
const OPENAI_UPSTREAM_BASE_URL = String(process.env.OPENAI_UPSTREAM_BASE_URL || "https://api.openai.com").trim().replace(/\/+$/, "");
const OPENAI_UPSTREAM_API_KEY = String(process.env.OPENAI_UPSTREAM_API_KEY || "").trim();
const OPENAI_FULL_COMPAT = parseBoolean(process.env.OPENAI_FULL_COMPAT);
const RPC_TIMEOUT_MS = Number(process.env.BROKER_RPC_TIMEOUT_MS || 10 * 60 * 1000);
const SSE_HEARTBEAT_MS = Number(process.env.BROKER_SSE_HEARTBEAT_MS || 15_000);

const serversById = new Map();
const serversByInstallationId = new Map();
const clientsById = new Map();
const codes = new Map();
const linksByClientId = new Map();
const pendingHttpRpc = new Map();

const httpServer = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (requiresOpenAiAuth(url.pathname) && !isAuthorizedRequest(req.headers)) {
      return sendUnauthorized(res);
    }

    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, getHealthPayload());
    }

    if (req.method === "GET" && url.pathname === "/v1/models") {
      if (shouldProxyModels(req.headers)) {
        return proxyOpenAiRequest(res, {
          method: "GET",
          pathname: "/v1/models",
          incomingHeaders: req.headers
        });
      }
      return handleModels(res, req.headers, url.searchParams);
    }

    if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
      const body = await readJsonBody(req);
      return handleChatCompletions(res, body, req.headers);
    }

    if (req.method === "POST" && url.pathname === "/v1/responses") {
      const body = await readJsonBody(req);
      return handleResponses(res, body, req.headers);
    }

    return sendJson(res, 404, {
      error: {
        message: `Unknown route: ${req.method} ${url.pathname}`,
        type: "invalid_request_error"
      }
    });
  } catch (error) {
    return sendJson(res, 500, {
      error: {
        message: error instanceof Error ? error.message : String(error),
        type: "server_error"
      }
    });
  }
});
httpServer.requestTimeout = 0;
httpServer.timeout = 0;

const wss = new WebSocketServer({ noServer: true });

httpServer.on("upgrade", (req, socket, head) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname !== WS_PATH) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      const session = {
        ws,
        sessionId: `sess_${crypto.randomUUID().replace(/-/g, "")}`,
        role: null,
        serverId: null,
        installationId: null,
        clientId: null
      };
      ws.on("message", (raw) => onMessage(session, raw));
      ws.on("close", () => onClose(session));
      ws.on("error", () => onClose(session));
      send(session, { type: "hello", service: "pair-broker" });
    });
  } catch {
    socket.destroy();
  }
});

httpServer.listen(PORT, HOST, () => {
  console.log(`[pair-broker] listening on ${HOST}:${PORT}${WS_PATH}`);
});

setInterval(cleanupExpiredCodes, 15_000).unref();

function onMessage(session, raw) {
  const text = Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw);
  let msg = null;
  try {
    msg = JSON.parse(text);
  } catch {
    send(session, errorReply(null, "invalid json"));
    return;
  }

  if (!msg || typeof msg !== "object" || typeof msg.type !== "string") {
    send(session, errorReply(msg?.req_id || null, "invalid message"));
    return;
  }

  try {
    switch (msg.type) {
      case "register_server":
        return handleRegisterServer(session, msg);
      case "create_code":
        return handleCreateCode(session, msg);
      case "pair_client":
        return handlePairClient(session, msg);
      case "resume_client":
        return handleResumeClient(session, msg);
      case "pair_accept":
        return handlePairAccept(session, msg);
      case "auth_result":
        return handleAuthResult(session, msg);
      case "rpc":
        return handleClientRpc(session, msg);
      case "rpc_result":
      case "rpc_stream":
      case "rpc_end":
        return handleServerRpcReply(session, msg);
      default:
        send(session, errorReply(msg.req_id || null, `unsupported type: ${msg.type}`));
    }
  } catch (error) {
    send(session, errorReply(msg.req_id || null, error instanceof Error ? error.message : String(error)));
  }
}

function handleRegisterServer(session, msg) {
  const installationId = normalizeId(msg.installation_id);
  if (!installationId) {
    send(session, errorReply(msg.req_id || null, "installation_id is required"));
    return;
  }

  if (session.serverId) {
    detachServer(session);
  }

  const previous = serversByInstallationId.get(installationId);
  if (previous && previous !== session) {
    send(previous, { type: "server_replaced" });
    safeClose(previous.ws, 4000, "replaced");
    detachServer(previous);
  }

  const serverId = `srv_${crypto.randomUUID().replace(/-/g, "")}`;
  session.role = "server";
  session.serverId = serverId;
  session.installationId = installationId;
  serversById.set(serverId, session);
  serversByInstallationId.set(installationId, session);

  send(session, {
    type: "server_registered",
    req_id: msg.req_id || null,
    server_id: serverId,
    installation_id: installationId
  });
}

function handleCreateCode(session, msg) {
  if (session.role !== "server" || !session.serverId || !session.installationId) {
    send(session, errorReply(msg.req_id || null, "create_code requires registered server"));
    return;
  }

  cleanupExpiredCodes();
  deleteCodesForServer(session.serverId);
  const ttlSeconds = clampNumber(Number(msg.ttl_seconds) || DEFAULT_TTL_SECONDS, 30, 3600);
  const code = generateCode();
  const expiresAt = Date.now() + ttlSeconds * 1000;
  codes.set(code, {
    code,
    serverId: session.serverId,
    installationId: session.installationId,
    expiresAt,
    createdAt: Date.now()
  });

  send(session, {
    type: "code_created",
    req_id: msg.req_id || null,
    code,
    ttl_seconds: ttlSeconds,
    expires_at: new Date(expiresAt).toISOString(),
    installation_id: session.installationId
  });
}

function handlePairClient(session, msg) {
  cleanupExpiredCodes();
  ensureClientIdentity(session);
  const code = normalizeCode(msg.code);
  if (!code) {
    send(session, errorReply(msg.req_id || null, "code is required"));
    return;
  }

  const found = codes.get(code);
  if (!found || found.expiresAt <= Date.now()) {
    send(session, errorReply(msg.req_id || null, "code not found or expired"));
    return;
  }

  const serverSession = serversById.get(found.serverId);
  if (!isOpen(serverSession)) {
    send(session, errorReply(msg.req_id || null, "server is offline"));
    return;
  }

  session.role = "client";
  session.pendingReqId = msg.req_id || null;
  session.pendingPairServerId = serverSession.serverId;
  codes.delete(code);

  send(serverSession, {
    type: "pair_request",
    client_id: session.clientId,
    code,
    device_name: safeString(msg.device_name, 80),
    client_installation_id: normalizeId(msg.client_installation_id)
  });
}

function handleResumeClient(session, msg) {
  ensureClientIdentity(session);
  session.role = "client";
  const installationId = normalizeId(msg.installation_id);
  const deviceId = normalizeId(msg.device_id);
  const deviceToken = safeString(msg.device_token, 256);

  if (!installationId || !deviceId || !deviceToken) {
    send(session, errorReply(msg.req_id || null, "installation_id, device_id, and device_token are required"));
    return;
  }

  const serverSession = serversByInstallationId.get(installationId);
  if (!isOpen(serverSession)) {
    send(session, errorReply(msg.req_id || null, "server is offline"));
    return;
  }

  session.pendingReqId = msg.req_id || null;
  session.pendingPairServerId = serverSession.serverId;

  send(serverSession, {
    type: "auth_request",
    client_id: session.clientId,
    device_id: deviceId,
    device_token: deviceToken
  });
}

function handlePairAccept(session, msg) {
  if (session.role !== "server" || !session.serverId || !session.installationId) {
    send(session, errorReply(msg.req_id || null, "pair_accept requires registered server"));
    return;
  }

  const clientId = normalizeId(msg.client_id);
  const deviceId = normalizeId(msg.device_id);
  const deviceToken = safeString(msg.device_token, 256);
  if (!clientId || !deviceId || !deviceToken) {
    send(session, errorReply(msg.req_id || null, "client_id, device_id, and device_token are required"));
    return;
  }

  const client = clientsById.get(clientId);
  if (!isOpen(client)) {
    send(session, errorReply(msg.req_id || null, "client is offline"));
    return;
  }

  linkClientToServer(client, session, {
    installationId: session.installationId,
    deviceId
  });

  send(client, {
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
}

function handleAuthResult(session, msg) {
  if (session.role !== "server" || !session.serverId || !session.installationId) {
    send(session, errorReply(msg.req_id || null, "auth_result requires registered server"));
    return;
  }

  const clientId = normalizeId(msg.client_id);
  if (!clientId) {
    send(session, errorReply(msg.req_id || null, "client_id is required"));
    return;
  }

  const client = clientsById.get(clientId);
  if (!isOpen(client)) {
    return;
  }

  if (!msg.ok) {
    send(client, errorReply(client.pendingReqId || null, safeString(msg.message, 200) || "authentication failed"));
    client.pendingReqId = null;
    client.pendingPairServerId = null;
    return;
  }

  const deviceId = normalizeId(msg.device_id);
  if (!deviceId) {
    send(client, errorReply(client.pendingReqId || null, "server returned invalid device_id"));
    client.pendingReqId = null;
    client.pendingPairServerId = null;
    return;
  }

  linkClientToServer(client, session, {
    installationId: session.installationId,
    deviceId
  });

  send(client, {
    type: "authenticated",
    req_id: client.pendingReqId || null,
    client_id: client.clientId,
    installation_id: session.installationId,
    server_id: session.serverId,
    device_id: deviceId
  });

  client.pendingReqId = null;
  client.pendingPairServerId = null;
}

function handleClientRpc(session, msg) {
  if (session.role !== "client" || !session.clientId) {
    send(session, errorReply(msg.req_id || null, "rpc requires client session"));
    return;
  }

  const link = linksByClientId.get(session.clientId);
  if (!link) {
    send(session, errorReply(msg.req_id || null, "client is not authenticated"));
    return;
  }

  const server = serversById.get(link.serverId);
  if (!isOpen(server)) {
    linksByClientId.delete(session.clientId);
    send(session, errorReply(msg.req_id || null, "server is offline"));
    return;
  }

  send(server, {
    type: "rpc",
    req_id: msg.req_id || null,
    client_id: session.clientId,
    method: safeString(msg.method, 80),
    body: msg.body ?? null
  });
}

function handleServerRpcReply(session, msg) {
  if (session.role !== "server" || !session.serverId) {
    send(session, errorReply(msg.req_id || null, `${msg.type} requires server session`));
    return;
  }

  const clientId = normalizeId(msg.client_id);
  if (!clientId) {
    send(session, errorReply(msg.req_id || null, "client_id is required"));
    return;
  }

  const httpKey = rpcRequestKey(clientId, msg.req_id);
  const pendingHttp = httpKey ? pendingHttpRpc.get(httpKey) : null;
  if (pendingHttp) {
    handlePendingHttpRpcMessage(pendingHttp, msg);
    return;
  }

  const link = linksByClientId.get(clientId);
  if (!link || link.serverId !== session.serverId) {
    return;
  }

  const client = clientsById.get(clientId);
  if (!isOpen(client)) {
    linksByClientId.delete(clientId);
    return;
  }

  send(client, {
    type: msg.type,
    req_id: msg.req_id || null,
    method: safeString(msg.method, 80),
    event: safeString(msg.event, 80),
    data: msg.data ?? null
  });
}

function onClose(session) {
  if (session.closed) return;
  session.closed = true;

  if (session.serverId) {
    failPendingHttpForServer(session.serverId, "server is offline");
    detachServer(session);
    notifyClientsForServer(session.serverId, {
      type: "server_unavailable",
      installation_id: session.installationId
    });
    return;
  }

  if (session.clientId) {
    clientsById.delete(session.clientId);
    linksByClientId.delete(session.clientId);
  }
}

function detachServer(session) {
  if (!session?.serverId) return;
  serversById.delete(session.serverId);
  if (session.installationId && serversByInstallationId.get(session.installationId) === session) {
    serversByInstallationId.delete(session.installationId);
  }
  deleteCodesForServer(session.serverId);
}

function notifyClientsForServer(serverId, payload) {
  for (const [clientId, link] of linksByClientId) {
    if (link.serverId !== serverId) continue;
    linksByClientId.delete(clientId);
    const client = clientsById.get(clientId);
    if (isOpen(client)) {
      send(client, payload);
    }
  }
}

function deleteCodesForServer(serverId) {
  for (const [code, item] of codes) {
    if (item.serverId === serverId) {
      codes.delete(code);
    }
  }
}

function linkClientToServer(client, server, { installationId, deviceId }) {
  linksByClientId.set(client.clientId, {
    clientId: client.clientId,
    serverId: server.serverId,
    installationId,
    deviceId,
    linkedAt: Date.now()
  });
}

function ensureClientIdentity(session) {
  if (session.clientId) return;
  const clientId = `cli_${crypto.randomUUID().replace(/-/g, "")}`;
  session.clientId = clientId;
  clientsById.set(clientId, session);
}

function cleanupExpiredCodes() {
  const now = Date.now();
  for (const [code, item] of codes) {
    if (item.expiresAt <= now) {
      codes.delete(code);
    }
  }
}

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let i = 0; i < 32; i += 1) {
    let code = "";
    for (let j = 0; j < 6; j += 1) {
      code += alphabet[crypto.randomInt(0, alphabet.length)];
    }
    if (!codes.has(code)) return code;
  }
  throw new Error("failed to allocate code");
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

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function isOpen(session) {
  return Boolean(session?.ws && session.ws.readyState === 1);
}

function send(session, payload) {
  if (isOpen(session)) {
    session.ws.send(JSON.stringify(payload));
  }
}

function safeClose(ws, code, reason) {
  try {
    ws.close(code, reason);
  } catch {}
}

function errorReply(reqId, message) {
  return { type: "error", req_id: reqId || null, message };
}

function getHealthPayload() {
  return {
    ok: true,
    service: "pair-broker",
    servers: serversById.size,
    clients: clientsById.size,
    active_codes: codes.size,
    linked_clients: linksByClientId.size,
    openai_api_auth_enabled: Boolean(OPENAI_API_TOKEN)
  };
}

function requiresOpenAiAuth(pathname) {
  return pathname === "/v1/models" || pathname === "/v1/chat/completions" || pathname === "/v1/responses";
}

function isAuthorizedRequest(headers) {
  if (!OPENAI_API_TOKEN) return true;
  const token = getBearerToken(headers);
  if (!token) return false;
  return safeTokenEqual(token, OPENAI_API_TOKEN);
}

function getBearerToken(headers) {
  const header = headers.authorization;
  if (typeof header !== "string") return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function safeTokenEqual(actual, expected) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function sendUnauthorized(res) {
  return sendJson(
    res,
    401,
    {
      error: {
        message: "Invalid or missing bearer token.",
        type: "invalid_request_error",
        code: "invalid_api_key"
      }
    },
    { "WWW-Authenticate": 'Bearer realm="codex-broker"' }
  );
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  for (const [key, value] of Object.entries(extraHeaders)) {
    res.setHeader(key, value);
  }
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text ? JSON.parse(text) : {};
}

async function handleModels(res, headers, searchParams) {
  const requestedInstallationId = selectInstallationId(headers, { installation_id: searchParams.get("installation_id") });
  const servers = requestedInstallationId
    ? [resolveTargetServer(requestedInstallationId)]
    : listConnectedServers();

  const data = [];
  for (const server of servers) {
    const config = await invokeBrokerRpcOnce(server, "config.get", {});
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

  return sendJson(res, 200, { object: "list", data });
}

async function handleChatCompletions(res, body, headers) {
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return sendJson(res, 400, invalidRequest("`messages` must be a non-empty array."));
  }
  if (shouldProxyChatCompletions(body, headers)) {
    return proxyOpenAiRequest(res, {
      method: "POST",
      pathname: "/v1/chat/completions",
      incomingHeaders: headers,
      body
    });
  }
  const server = resolveTargetServer(selectInstallationId(headers, body));
  const model = body.model || (await invokeBrokerRpcOnce(server, "config.get", {}))?.codex_model || "unknown";

  if (body.stream) {
    return handleStreamingChatCompletion(res, server, body, model);
  }

  const result = await invokeBrokerRpcOnce(server, "openai.chat", {
    ...body,
    model
  });
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("x-codex-thread-id", result?._codex?.thread_id || "");
  result._broker = {
    installation_id: server.installationId || null
  };
  res.end(JSON.stringify(result));
}

async function handleStreamingChatCompletion(res, server, body, model) {
  const result = await invokeBrokerRpcOnce(server, "openai.chat", {
    ...body,
    stream: false,
    model
  });
  result._broker = {
    installation_id: server.installationId || null
  };
  return streamChatCompletionResponse(res, result);
}

async function handleResponses(res, body, headers) {
  if (shouldProxyResponses(body, headers)) {
    return proxyOpenAiRequest(res, {
      method: "POST",
      pathname: "/v1/responses",
      incomingHeaders: headers,
      body
    });
  }
  const server = resolveTargetServer(selectInstallationId(headers, body));
  const config = await invokeBrokerRpcOnce(server, "config.get", {});
  const model = body?.model || config?.codex_model || "unknown";
  const result = await invokeBrokerRpcOnce(server, "openai.responses", {
    ...body,
    model
  });

  res.statusCode = 200;
  if (body?.stream) {
    result._broker = {
      installation_id: server.installationId || null
    };
    return streamResponsesApiResponse(res, result);
  }
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("x-codex-thread-id", result?._codex?.thread_id || "");
  result._broker = {
    installation_id: server.installationId || null
  };
  res.end(JSON.stringify(result));
}

function streamChatCompletionResponse(res, response) {
  const id = response.id || `chatcmpl_${crypto.randomUUID().replace(/-/g, "")}`;
  const created = response.created || nowSeconds();
  const model = response.model || "unknown";
  const threadId = response?._codex?.thread_id || "";
  const choice = response.choices?.[0] || {};

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("x-codex-thread-id", threadId);

  writeSse(res, {
    id,
    object: "chat.completion.chunk",
    created,
    model,
    choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }]
  });

  if (Array.isArray(choice.message?.tool_calls) && choice.message.tool_calls.length > 0) {
    for (const [index, toolCall] of choice.message.tool_calls.entries()) {
      writeSse(res, {
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
    }
  } else {
    for (const chunk of splitForStreaming(choice.message?.content || "")) {
      writeSse(res, {
        id,
        object: "chat.completion.chunk",
        created,
        model,
        choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }]
      });
    }
  }

  writeSse(res, {
    id,
    object: "chat.completion.chunk",
    created,
    model,
    choices: [{ index: 0, delta: {}, finish_reason: choice.finish_reason || "stop" }],
    usage: response.usage,
    _codex: response._codex,
    _broker: response._broker
  });
  res.write("data: [DONE]\n\n");
  res.end();
}

function streamResponsesApiResponse(res, response) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("x-codex-thread-id", response?._codex?.thread_id || "");

  writeSseEvent(res, "response.created", {
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
      writeSseEvent(res, "response.output_text.delta", {
        response_id: response.id,
        delta: chunk
      });
    }
  } else {
    for (const item of output) {
      writeSseEvent(res, "response.output_item.added", {
        response_id: response.id,
        item
      });
    }
  }

  writeSseEvent(res, "response.completed", response);
  res.write("data: [DONE]\n\n");
  res.end();
}

function listConnectedServers() {
  return [...serversById.values()].filter(isOpen);
}

function selectInstallationId(headers, body) {
  return normalizeId(
    body?.installation_id ||
      body?.metadata?.installation_id ||
      headers["x-installation-id"] ||
      headers["x-broker-installation-id"] ||
      null
  );
}

function resolveTargetServer(installationId) {
  if (installationId) {
    const byInstallation = serversByInstallationId.get(installationId);
    if (!isOpen(byInstallation)) {
      throw new Error(`server is offline for installation_id: ${installationId}`);
    }
    return byInstallation;
  }

  const connected = listConnectedServers();
  if (connected.length === 1) {
    return connected[0];
  }
  if (connected.length === 0) {
    throw new Error("no connected main service is available");
  }
  throw new Error("multiple main services are connected; specify installation_id or x-broker-installation-id");
}

function invokeBrokerRpcOnce(server, method, body) {
  return new Promise((resolve, reject) => {
    const request = createPendingHttpRpc(server, method, body, {
      onResult: (data) => resolve(data),
      onError: reject
    });
    send(server, request.message);
  });
}

function invokeBrokerRpcStream(server, method, body, callbacks) {
  return new Promise((resolve, reject) => {
    const request = createPendingHttpRpc(server, method, body, {
      onStream: callbacks?.onStream,
      onEnd: (data) => {
        callbacks?.onEnd?.(data);
        resolve(data);
      },
      onError: reject
    });
    send(server, request.message);
  });
}

function createPendingHttpRpc(server, method, body, callbacks) {
  if (!isOpen(server)) {
    throw new Error("server is offline");
  }
  const clientId = `http_${crypto.randomUUID().replace(/-/g, "")}`;
  const reqId = `req_${crypto.randomUUID().replace(/-/g, "")}`;
  const key = rpcRequestKey(clientId, reqId);
  const timer = setTimeout(() => {
    pendingHttpRpc.delete(key);
    callbacks.onError?.(new Error(`rpc timeout: ${method}`));
  }, RPC_TIMEOUT_MS);
  pendingHttpRpc.set(key, {
    key,
    serverId: server.serverId,
    reqId,
    clientId,
    method,
    timer,
    timeoutMs: RPC_TIMEOUT_MS,
    onResult: callbacks.onResult,
    onStream: callbacks.onStream,
    onEnd: callbacks.onEnd,
    onError: callbacks.onError
  });
  return {
    message: {
      type: "rpc",
      req_id: reqId,
      client_id: clientId,
      method,
      body: body ?? null
    }
  };
}

function handlePendingHttpRpcMessage(entry, msg) {
  refreshPendingHttpRpcTimer(entry);

  if (msg.type === "rpc_result") {
    clearTimeout(entry.timer);
    pendingHttpRpc.delete(entry.key);
    entry.onResult?.(msg.data ?? null);
    return;
  }

  if (msg.type === "rpc_stream") {
    entry.onStream?.(msg.event, msg.data ?? null);
    return;
  }

  if (msg.type === "rpc_end") {
    clearTimeout(entry.timer);
    pendingHttpRpc.delete(entry.key);
    const error = safeString(msg.data?.error, 500);
    if (error) {
      entry.onError?.(new Error(error));
      return;
    }
    entry.onEnd?.(msg.data ?? null);
  }
}

function refreshPendingHttpRpcTimer(entry) {
  clearTimeout(entry.timer);
  entry.timer = setTimeout(() => {
    pendingHttpRpc.delete(entry.key);
    entry.onError?.(new Error(`rpc timeout: ${entry.method}`));
  }, entry.timeoutMs || RPC_TIMEOUT_MS);
}

function failPendingHttpForServer(serverId, message) {
  for (const [key, entry] of pendingHttpRpc) {
    if (entry.serverId !== serverId) continue;
    clearTimeout(entry.timer);
    pendingHttpRpc.delete(key);
    entry.onError?.(new Error(message));
  }
}

function rpcRequestKey(clientId, reqId) {
  const client = normalizeId(clientId);
  const request = normalizeId(reqId);
  if (!client || !request) return null;
  return `${client}:${request}`;
}

async function invokeChatStream(server, payload) {
  let finalText = "";
  let finalThreadId = payload.thread_id || null;
  let usage = null;

  await invokeBrokerRpcStream(server, "chat.stream", payload, {
    onStream: (event, data) => {
      if (event === "thread" && data?.thread_id) {
        finalThreadId = data.thread_id;
      } else if (event === "delta" && data?.delta) {
        finalText += data.delta;
      } else if (event === "item" && data?.text && !finalText) {
        finalText = data.text;
      }
    },
    onEnd: (data) => {
      if (data?.thread_id) {
        finalThreadId = data.thread_id;
      }
      if (typeof data?.text === "string" && data.text && !finalText) {
        finalText = data.text;
      }
      usage = data?.usage || null;
    }
  });

  return {
    text: finalText,
    threadId: finalThreadId,
    usage
  };
}

function invalidRequest(message) {
  return {
    error: {
      message,
      type: "invalid_request_error"
    }
  };
}

function buildChatPrompt(messages, threadId) {
  if (threadId) {
    const latest = [...messages].reverse().find((item) => item?.role === "user");
    if (!latest) {
      throw new Error("When `thread_id` is provided, `messages` must contain a user message.");
    }
    return normalizeContent(latest.content);
  }

  const transcript = messages
    .map((item) => `${String(item?.role || "user").toUpperCase()}:\n${normalizeContent(item?.content)}`)
    .join("\n\n");

  return `Continue this conversation and answer as the assistant.\n\n${transcript}`;
}

function buildResponsesPrompt(input, threadId) {
  if (typeof input === "string") return input;
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("`input` must be a non-empty string or array.");
  }

  if (threadId) {
    const latest = [...input].reverse().find((item) => item?.role === "user");
    if (!latest) {
      throw new Error("When `thread_id` is provided, `input` must contain a user message.");
    }
    return normalizeContent(latest.content || latest.input_text || latest.text);
  }

  const transcript = input
    .map((item) => `${String(item?.role || "user").toUpperCase()}:\n${normalizeContent(item?.content || item?.input_text || item?.text)}`)
    .join("\n\n");

  return `Continue this conversation and answer as the assistant.\n\n${transcript}`;
}

function normalizeContent(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part?.type === "text" || part?.type === "input_text" || part?.type === "output_text") return part.text || "";
        return part?.content || "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (content && typeof content === "object") return content.text || content.content || "";
  return "";
}

function findUnsupportedOpenAiChatFeatures(body) {
  const unsupported = [];
  if (body?.tool_choice != null && body.tool_choice !== "none" && body.tool_choice !== "auto" && body.tool_choice !== "required" && !(body.tool_choice?.type === "function")) {
    unsupported.push("tool_choice");
  }
  if (body?.response_format != null) {
    unsupported.push("response_format");
  }
  return unsupported;
}

function shouldProxyModels(headers) {
  return OPENAI_FULL_COMPAT && Boolean(resolveUpstreamAuthorization(headers));
}

function shouldProxyChatCompletions(body, headers) {
  return (OPENAI_FULL_COMPAT || findUnsupportedOpenAiChatFeatures(body).length > 0) && Boolean(resolveUpstreamAuthorization(headers));
}

function shouldProxyResponses(body, headers) {
  return (OPENAI_FULL_COMPAT || findUnsupportedResponsesFeatures(body).length > 0) && Boolean(resolveUpstreamAuthorization(headers));
}

function findUnsupportedResponsesFeatures(body) {
  const unsupported = [];
  if (body?.tool_choice != null && body.tool_choice !== "none" && body.tool_choice !== "auto" && body.tool_choice !== "required" && !(body.tool_choice?.type === "function")) {
    unsupported.push("tool_choice");
  }
  if (body?.text?.format != null || body?.response_format != null) {
    unsupported.push("structured output format");
  }
  return unsupported;
}

function messagesContainUnsupportedContent(messages) {
  if (!Array.isArray(messages)) return false;
  return messages.some((message) => contentHasUnsupportedParts(message?.content));
}

function responsesInputContainsUnsupportedContent(input) {
  if (!Array.isArray(input)) return false;
  return input.some((item) => contentHasUnsupportedParts(item?.content || item?.input_text || item?.text));
}

function contentHasUnsupportedParts(content) {
  if (!Array.isArray(content)) return false;
  return content.some((part) => {
    if (!part || typeof part !== "object") return false;
    const type = String(part.type || "");
    return type && type !== "text" && type !== "input_text" && type !== "output_text";
  });
}

async function proxyOpenAiRequest(res, { method, pathname, incomingHeaders, body }) {
  const authorization = resolveUpstreamAuthorization(incomingHeaders);
  if (!authorization) {
    return sendJson(res, 400, invalidRequest("OpenAI passthrough requires a bearer token or `OPENAI_UPSTREAM_API_KEY`."));
  }

  const upstreamUrl = `${OPENAI_UPSTREAM_BASE_URL}${pathname}`;
  const upstreamHeaders = {
    Authorization: authorization
  };
  const requestAccept = headerValue(incomingHeaders, "accept");
  const requestBeta = headerValue(incomingHeaders, "openai-beta");
  const requestIdempotency = headerValue(incomingHeaders, "idempotency-key");
  if (requestAccept) upstreamHeaders.Accept = requestAccept;
  if (requestBeta) upstreamHeaders["OpenAI-Beta"] = requestBeta;
  if (requestIdempotency) upstreamHeaders["Idempotency-Key"] = requestIdempotency;
  if (body != null) {
    upstreamHeaders["Content-Type"] = "application/json";
  }

  const upstreamResponse = await fetch(upstreamUrl, {
    method,
    headers: upstreamHeaders,
    body: body != null ? JSON.stringify(body) : undefined
  });

  res.statusCode = upstreamResponse.status;
  copyProxyResponseHeaders(upstreamResponse, res);

  if (!upstreamResponse.body) {
    res.end();
    return;
  }

  const stream = Readable.fromWeb(upstreamResponse.body);
  for await (const chunk of stream) {
    res.write(chunk);
  }
  res.end();
}

function resolveUpstreamAuthorization(headers) {
  const inbound = headerValue(headers, "authorization");
  if (typeof inbound === "string" && /^Bearer\s+\S+/i.test(inbound)) {
    return inbound;
  }
  if (OPENAI_UPSTREAM_API_KEY) {
    return `Bearer ${OPENAI_UPSTREAM_API_KEY}`;
  }
  return null;
}

function headerValue(headers, name) {
  const value = headers?.[name];
  if (Array.isArray(value)) return value.join(", ");
  return typeof value === "string" ? value : null;
}

function copyProxyResponseHeaders(upstreamResponse, res) {
  for (const [key, value] of upstreamResponse.headers.entries()) {
    const lower = key.toLowerCase();
    if (lower === "connection" || lower === "transfer-encoding" || lower === "content-length") {
      continue;
    }
    res.setHeader(key, value);
  }
}

function extractThreadId(body, headers) {
  return (
    body?.thread_id ||
    body?.conversation_id ||
    body?.metadata?.thread_id ||
    headers["x-codex-thread-id"] ||
    headers["x-thread-id"] ||
    null
  );
}

function normalizeUsage(usage) {
  if (!usage) return null;
  const promptTokens = Number(usage.inputTokens || usage.input_tokens || 0);
  const completionTokens = Number(usage.outputTokens || usage.output_tokens || 0);
  const cachedTokens = Number(usage.cachedInputTokens || usage.cached_input_tokens || 0);
  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
    cached_prompt_tokens: cachedTokens
  };
}

function writeSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function startSseHeartbeat(res) {
  if (!(SSE_HEARTBEAT_MS > 0)) {
    return () => {};
  }
  const timer = setInterval(() => {
    try {
      if (!res.writableEnded) {
        res.write(": ping\n\n");
      }
    } catch {}
  }, SSE_HEARTBEAT_MS);
  timer.unref?.();
  return () => clearInterval(timer);
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function parseBoolean(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}
