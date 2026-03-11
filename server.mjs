import http from "node:http";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import net from "node:net";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, promises as fs } from "node:fs";
import readline from "node:readline";
import { Readable } from "node:stream";
import { WebSocketServer, WebSocket } from "ws";

loadDotEnv(path.join(process.cwd(), ".env"));

const PORT = Number(process.env.PORT || 4317);
const HOST = process.env.HOST || "0.0.0.0";
const CODEX_BIN = process.env.CODEX_BIN || (process.platform === "win32" ? "codex.cmd" : "codex");
const CODEX_MODEL = process.env.CODEX_MODEL || "gpt-5.4";
const CODEX_WORKDIR = process.env.CODEX_WORKDIR || process.cwd();
const CODEX_SANDBOX = process.env.CODEX_SANDBOX || "read-only";
const CODEX_APPROVAL_POLICY = process.env.CODEX_APPROVAL_POLICY || "never";
const CODEX_HOME = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const OPENAI_API_TOKEN = String(process.env.OPENAI_API_TOKEN || "").trim();
const OPENAI_UPSTREAM_BASE_URL = String(process.env.OPENAI_UPSTREAM_BASE_URL || "https://api.openai.com").trim().replace(/\/+$/, "");
const OPENAI_UPSTREAM_API_KEY = String(process.env.OPENAI_UPSTREAM_API_KEY || "").trim();
const OPENAI_FULL_COMPAT = parseBoolean(process.env.OPENAI_FULL_COMPAT);
const DEVICE_FILE_ROOTS = parseDeviceFileRoots(process.env.DEVICE_FILE_ROOTS);
const CHAT_TASK_STORE_PATH = process.env.CHAT_TASK_STORE_PATH || path.join(CODEX_HOME, "codexapi-chat-tasks.json");
const PUBLIC_DIR = path.join(process.cwd(), "public");
const PAIR_BROKER_URL = process.env.PAIR_BROKER_URL || "ws://localhost:8000/ws";
const PAIR_CODE_TTL_SECONDS = Number(process.env.PAIR_CODE_TTL_SECONDS || 90);
const PAIR_CODE_ROTATE_SECONDS = Number(process.env.PAIR_CODE_ROTATE_SECONDS || 60);
const PAIR_SERVER_NAME = process.env.PAIR_SERVER_NAME || `${os.hostname()}-${process.pid}`;
const TRUST_STORE_PATH = process.env.TRUST_STORE_PATH || path.join(CODEX_HOME, "codexapi-broker-state.json");
const CODE_LINK_DEFAULT_TTL_SECONDS = 300;
const CODE_LINK_MAX_TTL_SECONDS = 3600;
const codeLinks = new Map();
let pairAgent = null;

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!key || process.env[key] != null) continue;
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (requiresOpenAiAuth(url.pathname) && !isAuthorizedRequest(req.headers)) {
      return sendUnauthorized(res);
    }

    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, getHealthPayload());
    }

    if (req.method === "GET" && url.pathname === "/api/config") {
      return sendJson(res, 200, getConfigPayload());
    }

    if (req.method === "GET" && url.pathname === "/api/fs/list") {
      return handleDirectoryList(url, res);
    }

    if (req.method === "GET" && url.pathname === "/api/fs/roots") {
      return sendJson(res, 200, getFileRootsPayload());
    }

    if (req.method === "GET" && url.pathname === "/api/fs/download") {
      return handleFileDownload(url, res);
    }

    if (req.method === "POST" && url.pathname === "/api/fs/upload") {
      const body = await readJsonBody(req);
      return handleFileUpload(body, res);
    }

    if (req.method === "POST" && url.pathname === "/api/fs/transfer") {
      const body = await readJsonBody(req);
      return handleFileTransfer(body, res);
    }

    if (req.method === "GET" && url.pathname === "/v1/models") {
      if (shouldProxyModels(req.headers)) {
        return proxyOpenAiRequest(res, {
          method: "GET",
          pathname: "/v1/models",
          incomingHeaders: req.headers
        });
      }
      return sendJson(res, 200, { object: "list", data: await loadModels() });
    }

    if (req.method === "POST" && url.pathname === "/api/pair/create") {
      const body = await readJsonBody(req);
      const ttl = Number(body?.ttl_seconds || PAIR_CODE_TTL_SECONDS);
      const created = await pairAgent.refreshCode(ttl);
      return sendJson(res, 200, created);
    }

    if (req.method === "GET" && url.pathname === "/api/pair/status") {
      return sendJson(res, 200, pairAgent.status());
    }

    if (req.method === "POST" && url.pathname === "/api/link/create") {
      const body = await readJsonBody(req);
      return handleCreateLinkCode(res, body, req.headers);
    }

    if (req.method === "GET" && url.pathname === "/api/link/status") {
      return handleLinkStatus(url, res);
    }

    if (req.method === "POST" && url.pathname === "/api/chat/stream") {
      const body = await readJsonBody(req);
      return handleUiStream(res, body);
    }

    if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
      const body = await readJsonBody(req);
      return handleChatCompletions(res, body, req.headers);
    }

    if (req.method === "POST" && url.pathname === "/v1/responses") {
      const body = await readJsonBody(req);
      return handleResponses(res, body, req.headers);
    }

    if (req.method === "GET" && (url.pathname === "/" || url.pathname.startsWith("/assets/"))) {
      return serveStatic(url.pathname, res);
    }

    return sendJson(res, 404, invalidRequest(`Unknown route: ${req.method} ${url.pathname}`));
  } catch (error) {
    return sendJson(res, 500, {
      error: {
        message: error instanceof Error ? error.message : String(error),
        type: "server_error"
      }
    });
  }
});

server.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

const linkWss = new WebSocketServer({ noServer: true });
server.on("upgrade", (req, socket, head) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname !== "/api/link/connect") {
      socket.destroy();
      return;
    }
    const code = normalizeCode(url.searchParams.get("code"));
    if (!code) {
      socket.destroy();
      return;
    }
    pruneExpiredLinkCodes();
    const link = codeLinks.get(code);
    if (!link || link.expiresAt <= Date.now()) {
      socket.destroy();
      return;
    }
    if (link.usedCount >= link.maxUses) {
      socket.destroy();
      return;
    }
    link.usedCount += 1;
    link.lastUsedAt = Date.now();
    if (link.usedCount >= link.maxUses) {
      codeLinks.delete(code);
    }

    linkWss.handleUpgrade(req, socket, head, (ws) => {
      bridgeWsToTcp(ws, link);
    });
  } catch {
    socket.destroy();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`codex-local-chat listening on http://${HOST}:${PORT}`);
  pairAgent.start().catch((error) => {
    console.error("pair agent startup failed:", error);
  });
});

setInterval(pruneExpiredLinkCodes, 30_000).unref();

async function handleUiStream(res, body) {
  if (!body?.message || typeof body.message !== "string") {
    return sendJson(res, 400, invalidRequest("`message` must be a non-empty string."));
  }

  const model = body.model || CODEX_MODEL;
  const threadId = body.thread_id || null;
  const cwd = resolveWorkspace(body.cwd);
  const yolo = Boolean(body.yolo);

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  const stream = await createCodexTurnStream({
    model,
    threadId,
    prompt: body.message,
    cwd,
    yolo
  });

  let finalText = "";
  let finalThreadId = stream.threadId;
  let usage = null;

  writeSseEvent(res, "thread", {
    thread_id: finalThreadId,
    model
  });

  try {
    for await (const event of stream.events) {
      if (event.kind === "thread") {
        finalThreadId = event.threadId;
        writeSseEvent(res, "thread", { thread_id: event.threadId, model });
      } else if (event.kind === "delta") {
        finalText += event.delta;
        writeSseEvent(res, "delta", { delta: event.delta });
      } else if (event.kind === "item.completed") {
        writeSseEvent(res, "item", event.item);
      } else if (event.kind === "completed") {
        usage = event.usage;
      } else if (event.kind === "error") {
        writeSseEvent(res, "error", { message: event.message });
      }
    }

    writeSseEvent(res, "done", {
      text: finalText,
      thread_id: finalThreadId,
      usage: normalizeUsage(usage)
    });
  } catch (error) {
    writeSseEvent(res, "error", {
      message: error instanceof Error ? error.message : String(error)
    });
  } finally {
    res.write("data: [DONE]\n\n");
    res.end();
  }
}

async function streamUiTurnToCallbacks(body, callbacks) {
  if (!body?.message || typeof body.message !== "string") {
    throw new Error("`message` must be a non-empty string.");
  }

  const model = body.model || CODEX_MODEL;
  const threadId = body.thread_id || null;
  const cwd = resolveWorkspace(body.cwd);
  const yolo = Boolean(body.yolo);

  const stream = await createCodexTurnStream({
    model,
    threadId,
    prompt: body.message,
    cwd,
    yolo
  });

  let finalText = "";
  let finalThreadId = stream.threadId;
  let usage = null;

  callbacks.onThread?.({
    thread_id: finalThreadId,
    model
  });

  try {
    for await (const event of stream.events) {
      if (event.kind === "thread") {
        finalThreadId = event.threadId;
        callbacks.onThread?.({ thread_id: event.threadId, model });
      } else if (event.kind === "delta") {
        finalText += event.delta;
        callbacks.onDelta?.({ delta: event.delta });
      } else if (event.kind === "item.completed") {
        callbacks.onItem?.(event.item);
      } else if (event.kind === "completed") {
        usage = event.usage;
      } else if (event.kind === "error") {
        callbacks.onError?.({ message: event.message });
      }
    }
  } catch (error) {
    callbacks.onError?.({
      message: error instanceof Error ? error.message : String(error)
    });
    return;
  }

  callbacks.onDone?.({
    text: finalText,
    thread_id: finalThreadId,
    usage: normalizeUsage(usage)
  });
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
  if (Boolean(body.stream)) {
    return streamOpenAiChatCompletionFromBody(res, body, headers);
  }

  const response = await runOpenAiChatCompletion(body, headers);
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("x-codex-thread-id", response._codex?.thread_id || "");
  res.end(JSON.stringify(response));
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
  if (Boolean(body?.stream)) {
    return streamOpenAiResponsesFromBody(res, body, headers);
  }

  const response = await runOpenAiResponses(body, headers);
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("x-codex-thread-id", response._codex?.thread_id || "");
  res.end(JSON.stringify(response));
}

function streamOpenAiChatCompletion(res, result, model) {
  const id = `chatcmpl_${crypto.randomUUID().replace(/-/g, "")}`;
  const created = nowSeconds();

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("x-codex-thread-id", result.threadId || "");

  writeSse(res, {
    id,
    object: "chat.completion.chunk",
    created,
    model,
    choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }]
  });

  for (const chunk of splitForStreaming(result.text)) {
    writeSse(res, {
      id,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }]
    });
  }

  writeSse(res, {
    id,
    object: "chat.completion.chunk",
    created,
    model,
    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
    usage: normalizeUsage(result.usage),
    _codex: { thread_id: result.threadId }
  });

  res.write("data: [DONE]\n\n");
  res.end();
}

async function runOpenAiChatCompletion(body, headers = {}) {
  const model = body.model || CODEX_MODEL;
  const requestedThreadId = extractThreadId(body, headers);
  const cwd = resolveWorkspace(body.cwd);
  const yolo = Boolean(body.yolo);
  const plan = await buildChatTurnPlan(body.messages, requestedThreadId, body.tools, body.tool_choice);
  const result = await collectCodexTurn({
    model,
    threadId: requestedThreadId,
    inputItems: plan.inputItems,
    cwd,
    yolo,
    outputSchema: plan.outputSchema
  });
  const completion = finalizeToolAwareResult(result.text, plan);
  return createChatCompletionResponse({ model, result, completion });
}

async function streamOpenAiChatCompletionFromBody(res, body, headers = {}) {
  const response = await runOpenAiChatCompletion(body, headers);
  const id = response.id;
  const created = response.created;
  const model = response.model;
  const threadId = response._codex?.thread_id || "";

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

  const choice = response.choices?.[0] || {};
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
    _codex: response._codex
  });
  res.write("data: [DONE]\n\n");
  res.end();
}

async function runOpenAiResponses(body, headers = {}) {
  const model = body?.model || CODEX_MODEL;
  const requestedThreadId = extractThreadId(body, headers);
  const cwd = resolveWorkspace(body?.cwd);
  const yolo = Boolean(body?.yolo);
  const plan = await buildResponsesTurnPlan(body?.input, requestedThreadId, body?.tools, body?.tool_choice);
  const result = await collectCodexTurn({
    model,
    threadId: requestedThreadId,
    inputItems: plan.inputItems,
    cwd,
    yolo,
    outputSchema: plan.outputSchema
  });
  const completion = finalizeToolAwareResult(result.text, plan);
  return createResponsesApiResponse({ model, result, completion });
}

async function streamOpenAiResponsesFromBody(res, body, headers = {}) {
  const response = await runOpenAiResponses(body, headers);
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("x-codex-thread-id", response._codex?.thread_id || "");

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

async function buildChatTurnPlan(messages, threadId, tools, toolChoice) {
  const selected = threadId ? selectTurnMessages(messages) : messages;
  return buildConversationTurnPlan(selected, threadId, tools, toolChoice, "chat");
}

async function buildResponsesTurnPlan(input, threadId, tools, toolChoice) {
  const messages = normalizeResponsesInputToMessages(input);
  const selected = threadId ? selectTurnMessages(messages) : messages;
  return buildConversationTurnPlan(selected, threadId, tools, toolChoice, "responses");
}

async function buildConversationTurnPlan(messages, threadId, tools, toolChoice, apiKind) {
  const normalizedTools = normalizeOpenAiTools(tools);
  const inputItems = [];
  const transcriptPrefix = buildTranscriptPrefix(messages, threadId);
  const latestUser = findLatestUserMessage(messages);

  if (normalizedTools.length) {
    inputItems.push(createTextInput(buildToolInstructionBlock(normalizedTools, toolChoice, apiKind)));
  }

  if (transcriptPrefix) {
    inputItems.push(createTextInput(transcriptPrefix));
  }

  if (latestUser && messageHasVisionContent(latestUser.content)) {
    inputItems.push(...(await convertUserContentToInputItems(latestUser.content)));
  } else if (latestUser && latestUser.content != null) {
    const latestText = normalizeContent(latestUser.content);
    if (latestText) inputItems.push(createTextInput(latestText));
  } else if (!inputItems.length) {
    const fallbackText = buildPlainTranscript(messages);
    if (fallbackText) inputItems.push(createTextInput(fallbackText));
  }

  if (!inputItems.length) {
    throw new Error("No supported input content was provided.");
  }

  return {
    inputItems,
    tools: normalizedTools,
    outputSchema: normalizedTools.length ? buildToolEnvelopeSchema(normalizedTools) : null
  };
}

function selectTurnMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  let boundary = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (String(messages[index]?.role || "") === "assistant") {
      boundary = index;
      break;
    }
  }
  const selected = boundary >= 0 ? messages.slice(boundary + 1) : messages;
  return selected.length ? selected : messages.slice(-1);
}

function buildTranscriptPrefix(messages, threadId) {
  if (!Array.isArray(messages) || messages.length === 0) return "";
  const latestUser = findLatestUserMessage(messages);
  const withoutLatestUser = latestUser ? messages.filter((message) => message !== latestUser) : messages;
  const transcript = buildPlainTranscript(withoutLatestUser);
  if (transcript) {
    return threadId ? transcript : `Continue this conversation and answer as the assistant.\n\n${transcript}`;
  }
  return threadId ? "" : "Continue this conversation and answer as the assistant.";
}

function buildPlainTranscript(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return "";
  return messages
    .map((message) => formatTranscriptMessage(message))
    .filter(Boolean)
    .join("\n\n");
}

function formatTranscriptMessage(message) {
  const role = String(message?.role || "user").toUpperCase();
  if (Array.isArray(message?.tool_calls) && message.tool_calls.length) {
    const calls = message.tool_calls
      .map((toolCall) => {
        const name = toolCall?.function?.name || toolCall?.name || "unknown_tool";
        const args = toolCall?.function?.arguments || toolCall?.arguments || "{}";
        return `- ${name}(${args})`;
      })
      .join("\n");
    const text = normalizeContent(message?.content);
    return `${role}:\n${text ? `${text}\n` : ""}Requested tool calls:\n${calls}`;
  }
  if (message?.role === "tool" || message?.role === "function") {
    const name = message?.name || message?.tool_call_id || "tool";
    return `TOOL RESULT (${name}):\n${normalizeContent(message?.content || message?.output || "")}`;
  }
  return `${role}:\n${normalizeContent(message?.content || message?.input_text || message?.text || "")}`;
}

function findLatestUserMessage(messages) {
  if (!Array.isArray(messages)) return null;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (String(messages[index]?.role || "") === "user") {
      return messages[index];
    }
  }
  return null;
}

function messageHasVisionContent(content) {
  return Array.isArray(content) && content.some((part) => isImageContentPart(part));
}

async function convertUserContentToInputItems(content) {
  if (typeof content === "string") return [createTextInput(content)];
  if (!Array.isArray(content)) return [createTextInput(normalizeContent(content))].filter((item) => item.text);

  const items = [];
  for (const part of content) {
    if (typeof part === "string") {
      if (part) items.push(createTextInput(part));
      continue;
    }
    if (!part || typeof part !== "object") continue;
    const type = String(part.type || "");
    if (type === "text" || type === "input_text" || type === "output_text") {
      if (part.text) items.push(createTextInput(part.text));
      continue;
    }
    if (isImageContentPart(part)) {
      const imageUrl = await normalizeImageUrl(part);
      if (imageUrl) items.push({ type: "image", url: imageUrl });
      continue;
    }
    const fallback = part.text || part.content || "";
    if (fallback) items.push(createTextInput(fallback));
  }

  return items.length ? items : [createTextInput(normalizeContent(content))].filter((item) => item.text);
}

function createTextInput(text) {
  return {
    type: "text",
    text: String(text || ""),
    text_elements: []
  };
}

function isImageContentPart(part) {
  const type = String(part?.type || "");
  return type === "image_url" || type === "input_image" || type === "image";
}

async function normalizeImageUrl(part) {
  if (!part || typeof part !== "object") return null;
  if (typeof part.image_url === "string") return materializeImageUrl(part.image_url);
  if (typeof part.url === "string") return materializeImageUrl(part.url);
  if (typeof part.image === "string") return materializeImageUrl(part.image);
  if (part.image_url && typeof part.image_url === "object" && typeof part.image_url.url === "string") {
    return materializeImageUrl(part.image_url.url);
  }
  return null;
}

async function materializeImageUrl(url) {
  const text = String(url || "").trim();
  if (!text) return null;
  if (text.startsWith("data:")) return text;
  if (!/^https?:\/\//i.test(text)) return text;

  const response = await fetch(text, {
    headers: {
      "User-Agent": "codexapi-image-fetch/1.0"
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${text} (${response.status})`);
  }
  const mimeType = String(response.headers.get("content-type") || "application/octet-stream").split(";")[0].trim();
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function normalizeOpenAiTools(tools) {
  if (!Array.isArray(tools)) return [];
  return tools
    .map((tool) => {
      if (!tool || typeof tool !== "object") return null;
      const fn = tool.function || tool;
      const name = safeToolName(fn?.name);
      if (!name) return null;
      return {
        name,
        description: String(fn?.description || ""),
        inputSchema: fn?.parameters && typeof fn.parameters === "object" ? fn.parameters : {}
      };
    })
    .filter(Boolean);
}

function safeToolName(value) {
  const text = String(value || "").trim();
  return /^[a-zA-Z0-9_.:-]{1,128}$/.test(text) ? text : null;
}

function buildToolInstructionBlock(tools, toolChoice, apiKind) {
  const forcedName = normalizeForcedToolName(toolChoice);
  const required = toolChoice === "required" || Boolean(forcedName);
  const toolLines = tools
    .map((tool) => `- ${tool.name}: ${tool.description || "No description"}\n  schema: ${JSON.stringify(tool.inputSchema)}`)
    .join("\n");
  return [
    `You are responding through the OpenAI ${apiKind} API compatibility layer.`,
    "The listed tools are client-side tools. You must never execute them yourself.",
    "If a tool is needed, return only JSON that matches the provided schema.",
    'For a normal answer return {"type":"message","content":"...","tool_calls":[]}',
    'For tool use return {"type":"tool_calls","content":"","tool_calls":[{"name":"tool_name","arguments_json":"{\\"key\\":\\"value\\"}"}]}',
    forcedName ? `You must call the tool named \`${forcedName}\`.` : required ? "You must produce a tool call response." : "You may either answer normally or request tool calls.",
    "Available tools:",
    toolLines
  ].join("\n");
}

function normalizeForcedToolName(toolChoice) {
  if (!toolChoice || typeof toolChoice !== "object") return null;
  if (toolChoice.type === "function" && toolChoice.function?.name) {
    return safeToolName(toolChoice.function.name);
  }
  return null;
}

function buildToolEnvelopeSchema(tools) {
  const toolNames = tools.map((tool) => tool.name);
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      type: { type: "string", enum: ["message", "tool_calls"] },
      content: { type: "string" },
      tool_calls: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string", enum: toolNames.length ? toolNames : undefined },
            arguments_json: { type: "string" }
          },
          required: ["name", "arguments_json"]
        }
      }
    },
    required: ["type", "content", "tool_calls"]
  };
}

function finalizeToolAwareResult(text, plan) {
  const parsed = tryParseJsonEnvelope(text);
  if (!plan?.tools?.length) {
    if (parsed?.type === "message" && typeof parsed.content === "string") {
      return { kind: "message", content: parsed.content };
    }
    return { kind: "message", content: text };
  }
  if (!parsed || parsed.type === "message") {
    return { kind: "message", content: parsed?.content || text };
  }
  const toolCalls = Array.isArray(parsed.tool_calls)
    ? parsed.tool_calls
        .map((toolCall) => {
          const name = safeToolName(toolCall?.name);
          if (!name) return null;
          return {
            id: `call_${crypto.randomUUID().replace(/-/g, "")}`,
            type: "function",
            function: {
              name,
              arguments: normalizeToolArgumentsString(toolCall?.arguments_json)
            }
          };
        })
        .filter(Boolean)
    : [];
  if (!toolCalls.length) {
    return { kind: "message", content: text };
  }
  return { kind: "tool_calls", toolCalls };
}

function tryParseJsonEnvelope(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const stripped = raw.startsWith("```") ? raw.replace(/^```(?:json)?\s*|\s*```$/g, "") : raw;
  try {
    const parsed = JSON.parse(stripped);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeToolArgumentsString(value) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return "{}";
}

function createChatCompletionResponse({ model, result, completion }) {
  const id = `chatcmpl_${crypto.randomUUID().replace(/-/g, "")}`;
  const created = nowSeconds();
  const finishReason = completion.kind === "tool_calls" ? "tool_calls" : "stop";
  return {
    id,
    object: "chat.completion",
    created,
    model,
    choices: [
      {
        index: 0,
        message:
          completion.kind === "tool_calls"
            ? {
                role: "assistant",
                content: null,
                tool_calls: completion.toolCalls
              }
            : {
                role: "assistant",
                content: completion.content
              },
        finish_reason: finishReason
      }
    ],
    usage: normalizeUsage(result.usage),
    _codex: {
      thread_id: result.threadId,
      mode: "local_codex_cli"
    }
  };
}

function createResponsesApiResponse({ model, result, completion }) {
  const responseId = `resp_${crypto.randomUUID().replace(/-/g, "")}`;
  const output =
    completion.kind === "tool_calls"
      ? completion.toolCalls.map((toolCall) => ({
          id: `fc_${crypto.randomUUID().replace(/-/g, "")}`,
          type: "function_call",
          call_id: toolCall.id,
          name: toolCall.function.name,
          arguments: toolCall.function.arguments
        }))
      : [
          {
            id: `msg_${crypto.randomUUID().replace(/-/g, "")}`,
            type: "message",
            role: "assistant",
            content: [
              {
                type: "output_text",
                text: completion.content,
                annotations: []
              }
            ]
          }
        ];
  return {
    id: responseId,
    object: "response",
    created_at: new Date().toISOString(),
    status: "completed",
    model,
    output,
    output_text: completion.kind === "tool_calls" ? "" : completion.content,
    usage: normalizeUsage(result.usage),
    _codex: {
      thread_id: result.threadId,
      mode: "local_codex_cli"
    }
  };
}

function normalizeResponsesInputToMessages(input) {
  if (typeof input === "string") {
    return [{ role: "user", content: input }];
  }
  if (!Array.isArray(input)) {
    throw new Error("`input` must be a string or an array.");
  }
  return input
    .map((item) => normalizeResponsesItemToMessage(item))
    .filter(Boolean);
}

function normalizeResponsesItemToMessage(item) {
  if (!item || typeof item !== "object") return null;
  if (item.type === "function_call_output") {
    return {
      role: "tool",
      name: item.call_id || item.name || "tool",
      content: item.output || item.content || ""
    };
  }
  if (item.type === "function_call") {
    return {
      role: "assistant",
      content: "",
      tool_calls: [
        {
          function: {
            name: item.name,
            arguments: item.arguments
          }
        }
      ]
    };
  }
  if (item.type === "message" || item.role) {
    return {
      role: item.role || "user",
      content: item.content || item.input_text || item.text || ""
    };
  }
  if (item.type === "input_text" || item.type === "output_text") {
    return { role: "user", content: [{ type: "text", text: item.text || "" }] };
  }
  if (item.type === "input_image") {
    return { role: "user", content: [item] };
  }
  return null;
}

async function collectCodexTurn({ model, threadId, prompt, inputItems, cwd, yolo, outputSchema }) {
  const stream = await createCodexTurnStream({ model, threadId, prompt, inputItems, cwd, yolo, outputSchema });
  let finalText = "";
  let finalThreadId = stream.threadId;
  let usage = null;

  for await (const event of stream.events) {
    if (event.kind === "thread") {
      finalThreadId = event.threadId;
    } else if (event.kind === "delta") {
      finalText += event.delta;
    } else if (event.kind === "item.completed" && event.item?.text && !finalText) {
      finalText = event.item.text;
    } else if (event.kind === "completed") {
      usage = event.usage;
    } else if (event.kind === "error") {
      throw new Error(event.message);
    }
  }

  return {
    text: finalText,
    threadId: finalThreadId,
    usage
  };
}

async function createCodexTurnStream({ model, threadId, prompt, inputItems, cwd, yolo, outputSchema }) {
  const session = new CodexAppServerClient();
  await session.start();

  let activeThreadId = threadId;
  const sandbox = yolo ? "danger-full-access" : sandboxValue();
  const approvalPolicy = "never";
  const turnInput = Array.isArray(inputItems) && inputItems.length
    ? inputItems
    : [
        {
          type: "text",
          text: prompt,
          text_elements: []
        }
      ];
  if (activeThreadId) {
    const resumeResponse = await session.request("thread/resume", {
      threadId: activeThreadId,
      cwd,
      model,
      approvalPolicy,
      sandbox,
      persistExtendedHistory: true
    });
    activeThreadId = resumeResponse?.thread?.id || activeThreadId;
  } else {
    const startResponse = await session.request("thread/start", {
      cwd,
      model,
      approvalPolicy,
      sandbox,
      experimentalRawEvents: true,
      persistExtendedHistory: true
    });
    activeThreadId = startResponse?.thread?.id || null;
  }

  if (!activeThreadId) {
    await session.close();
    throw new Error("Failed to initialize Codex thread.");
  }

  const turnResponse = await session.request("turn/start", {
    threadId: activeThreadId,
    cwd,
    approvalPolicy,
    sandbox,
    input: turnInput,
    outputSchema: outputSchema || undefined
  });

  const turnId = turnResponse?.turn?.id;
  if (!turnId) {
    await session.close();
    throw new Error("Failed to start Codex turn.");
  }

  const events = (async function* () {
    try {
      yield { kind: "thread", threadId: activeThreadId };

      for await (const msg of session.notifications()) {
        if (msg.method === "thread/started" && msg.params?.thread?.id) {
          yield { kind: "thread", threadId: msg.params.thread.id };
        }

        if (msg.method === "item/agentMessage/delta" && msg.params?.turnId === turnId) {
          yield { kind: "delta", delta: msg.params.delta || "" };
        }

        if (msg.method === "item/completed" && msg.params?.item) {
          const item = normalizeThreadItem(msg.params.item);
          if (msg.params.turnId === turnId && item?.type === "agent_message") {
            yield { kind: "item.completed", item };
          }
        }

        if (msg.method === "turn/completed" && msg.params?.turn?.id === turnId) {
          if (msg.params.turn.status === "failed") {
            const message = msg.params.turn.error?.message || "Codex turn failed.";
            yield { kind: "error", message };
          } else {
            yield { kind: "completed", usage: msg.params.turn.usage || null };
          }
          break;
        }

        if (msg.method === "error" && msg.params?.error?.message) {
          yield { kind: "error", message: msg.params.error.message };
          break;
        }
      }
    } finally {
      await session.close();
    }
  })();

  return {
    threadId: activeThreadId,
    events
  };
}

class CodexAppServerClient {
  constructor() {
    this.requestId = 1;
    this.pending = new Map();
    this.queue = [];
    this.waiters = [];
    this.closed = false;
  }

  async start() {
    const args = ["app-server"];
    this.child = spawn(CODEX_BIN, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
      shell: process.platform === "win32"
    });

    this.stderr = "";
    if (this.child.stderr) {
      this.child.stderr.on("data", (chunk) => {
        this.stderr += chunk.toString("utf8");
      });
    }

    this.child.once("error", (error) => this.failAll(error));
    this.child.once("close", () => {
      this.closed = true;
      this.flushWaiters(null);
    });

    this.rl = readline.createInterface({
      input: this.child.stdout,
      crlfDelay: Infinity
    });

    this.rl.on("line", (line) => this.onLine(line));

    await this.request("initialize", {
      clientInfo: {
        name: "codex_local_chat",
        title: "Codex Local Chat",
        version: "0.1.0"
      },
      capabilities: {
        experimentalApi: true
      }
    });

    this.notify("initialized");
  }

  async close() {
    if (this.closed) {
      return;
    }

    this.closed = true;
    try {
      this.rl?.close();
    } catch {}
    try {
      this.child?.stdin?.end();
    } catch {}
    try {
      this.child?.kill();
    } catch {}
  }

  async request(method, params) {
    const id = this.requestId++;
    const payload = { id, method, params };

    const promise = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
    });

    this.write(payload);
    return promise;
  }

  notify(method, params = undefined) {
    this.write({ method, params });
  }

  async *notifications() {
    while (true) {
      const next = await this.nextNotification();
      if (next === null) {
        break;
      }
      yield next;
    }
  }

  nextNotification() {
    if (this.queue.length > 0) {
      return Promise.resolve(this.queue.shift());
    }

    if (this.closed) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      this.waiters.push(resolve);
    });
  }

  onLine(line) {
    if (!line.trim()) {
      return;
    }

    let message;
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(message, "id")) {
      const entry = this.pending.get(message.id);
      if (!entry) {
        return;
      }
      this.pending.delete(message.id);
      if (message.error) {
        entry.reject(new Error(message.error.message || `Codex app-server error in ${entry.method}`));
      } else {
        entry.resolve(message.result);
      }
      return;
    }

    if (message.method) {
      this.pushNotification(message);
    }
  }

  pushNotification(message) {
    if (this.waiters.length > 0) {
      const resolve = this.waiters.shift();
      resolve(message);
      return;
    }
    this.queue.push(message);
  }

  flushWaiters(value) {
    while (this.waiters.length > 0) {
      const resolve = this.waiters.shift();
      resolve(value);
    }
  }

  failAll(error) {
    for (const entry of this.pending.values()) {
      entry.reject(error);
    }
    this.pending.clear();
    this.flushWaiters(null);
  }

  write(message) {
    if (!this.child?.stdin?.writable) {
      throw new Error(`Codex app-server stdin is not writable. ${this.stderr || ""}`.trim());
    }
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }
}

function normalizeThreadItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  if ("text" in item && typeof item.text === "string") {
    if ("content" in item) {
      return { id: item.id, type: "plan", text: item.text };
    }
    return { id: item.id, type: "agent_message", text: item.text };
  }

  return item;
}

function sandboxValue() {
  if (CODEX_SANDBOX === "read-only") return "read-only";
  if (CODEX_SANDBOX === "danger-full-access") return "danger-full-access";
  return "workspace-write";
}

function buildChatPrompt(messages, threadId) {
  if (threadId) {
    const latestUser = [...messages].reverse().find((message) => message?.role === "user");
    if (!latestUser) {
      throw new Error("When `thread_id` is provided, at least one user message is required.");
    }
    return normalizeContent(latestUser.content);
  }

  const transcript = messages
    .map((message) => `${String(message?.role || "user").toUpperCase()}:\n${normalizeContent(message?.content)}`)
    .join("\n\n");

  return `Continue this conversation and answer as the assistant.\n\n${transcript}`;
}

function buildResponsesPrompt(input, threadId) {
  if (typeof input === "string") {
    return input;
  }

  if (!Array.isArray(input)) {
    throw new Error("`input` must be a string or an array.");
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
        if (part?.type === "text" || part?.type === "input_text") return part.text || "";
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

function parseBoolean(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
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

async function loadModels() {
  try {
    const raw = await fs.readFile(path.join(CODEX_HOME, "models_cache.json"), "utf8");
    const parsed = JSON.parse(raw);
    return parsed.models
      .filter((model) => model?.slug)
      .map((model) => ({ id: model.slug, object: "model", created: 0, owned_by: "openai" }));
  } catch {
    return [{ id: CODEX_MODEL, object: "model", created: 0, owned_by: "openai" }];
  }
}

function getHealthPayload() {
  return {
    ok: true,
    service: "codex-local-chat",
    codex_bin: CODEX_BIN,
    codex_model: CODEX_MODEL,
    codex_workdir: CODEX_WORKDIR,
    mode: "local_codex_cli"
  };
}

function getConfigPayload() {
  return {
    mode: "local_codex_cli",
    codex_model: CODEX_MODEL,
    codex_workdir: CODEX_WORKDIR,
    codex_home: os.homedir(),
    host: HOST,
    port: PORT,
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
  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function sendUnauthorized(res) {
  res.statusCode = 401;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("WWW-Authenticate", 'Bearer realm="codexapi"');
  res.end(
    JSON.stringify({
      error: {
        message: "Invalid or missing bearer token.",
        type: "invalid_request_error",
        code: "invalid_api_key"
      }
    })
  );
}

function getFileRootsPayload() {
  return {
    roots: DEVICE_FILE_ROOTS.map((rootPath) => ({
      name: path.basename(rootPath) || rootPath,
      path: rootPath
    }))
  };
}

async function handleDirectoryList(url, res) {
  const requestedPath = url.searchParams.get("path");
  return sendJson(res, 200, await getDirectoryListing(requestedPath || DEVICE_FILE_ROOTS[0] || os.homedir()));
}

async function getDirectoryListing(requestedPath) {
  const target = resolveAllowedPath(requestedPath || DEVICE_FILE_ROOTS[0] || os.homedir());
  const stats = await fs.stat(target);
  if (!stats.isDirectory()) {
    throw new Error("Requested path is not a directory.");
  }
  const root = getOwningRoot(target);
  const parent = target === root ? null : path.dirname(target);
  const entries = await fs.readdir(target, { withFileTypes: true });

  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      path: path.join(target, entry.name)
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  const files = [];
  for (const entry of entries.filter((item) => item.isFile())) {
    const filePath = path.join(target, entry.name);
    const stat = await fs.stat(filePath);
    files.push({
      name: entry.name,
      path: filePath,
      size: stat.size,
      modified_at: stat.mtime.toISOString()
    });
  }
  files.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  return {
    root,
    current: target,
    parent: parent && isWithinAllowedRoots(parent) ? parent : null,
    directories,
    files
  };
}

async function handleFileDownload(url, res) {
  const requestedPath = url.searchParams.get("path");
  if (!requestedPath) {
    return sendJson(res, 400, invalidRequest("`path` is required."));
  }
  const payload = await getFileDownloadPayload(requestedPath);
  return sendJson(res, 200, payload);
}

async function getFileDownloadPayload(requestedPath) {
  const target = resolveAllowedPath(requestedPath);
  const stats = await fs.stat(target);
  if (!stats.isFile()) {
    throw new Error("Requested path is not a file.");
  }
  if (stats.size > 10 * 1024 * 1024) {
    throw new Error("File is too large. Max 10 MB per transfer.");
  }
  const content = await fs.readFile(target);
  return {
    name: path.basename(target),
    path: target,
    size: stats.size,
    modified_at: stats.mtime.toISOString(),
    mime_type: contentType(target),
    data_base64: content.toString("base64")
  };
}

async function handleFileUpload(body, res) {
  const result = await uploadFile(body);
  return sendJson(res, 200, result);
}

async function handleFileTransfer(body, res) {
  const result = await createFileTransfer(body);
  return sendJson(res, 200, result);
}

async function uploadFile(body) {
  const directory = resolveAllowedPath(body?.directory || DEVICE_FILE_ROOTS[0] || os.homedir());
  const name = sanitizeFileName(body?.name);
  const dataBase64 = typeof body?.data_base64 === "string" ? body.data_base64 : "";
  if (!name) {
    throw new Error("`name` is required.");
  }
  if (!dataBase64) {
    throw new Error("`data_base64` is required.");
  }
  const dirStats = await fs.stat(directory);
  if (!dirStats.isDirectory()) {
    throw new Error("Upload target must be a directory.");
  }
  const buffer = Buffer.from(dataBase64, "base64");
  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error("Upload is too large. Max 10 MB per transfer.");
  }
  const filePath = path.join(directory, name);
  await fs.writeFile(filePath, buffer);
  const stats = await fs.stat(filePath);
  return {
    ok: true,
    name,
    path: filePath,
    size: stats.size,
    modified_at: stats.mtime.toISOString()
  };
}

async function createFileTransfer(body) {
  const target = resolveAllowedPath(body?.path || "");
  const stats = await fs.stat(target);
  if (!stats.isFile()) {
    throw new Error("Requested path is not a file.");
  }
  if (stats.size > 4 * 1024 * 1024 * 1024) {
    throw new Error("File is too large for temp.sh. Max 4 GB per transfer.");
  }
  const content = await fs.readFile(target);
  const form = new FormData();
  form.set("file", new Blob([content], { type: contentType(target) }), path.basename(target));

  const response = await fetch("https://temp.sh/upload", {
    method: "POST",
    body: form
  });
  const link = (await response.text()).trim();
  if (!response.ok || !/^https?:\/\//.test(link)) {
    throw new Error(`temp.sh upload failed with status ${response.status}`);
  }
  return {
    ok: true,
    provider: "temp.sh",
    name: path.basename(target),
    path: target,
    size: stats.size,
    modified_at: stats.mtime.toISOString(),
    link,
    expiry: "3d",
    auto_delete: false
  };
}

async function serveStatic(urlPath, res) {
  const target = urlPath === "/" ? path.join(PUBLIC_DIR, "index.html") : path.join(PUBLIC_DIR, urlPath.replace(/^\/assets\//, ""));
  try {
    const content = await fs.readFile(target);
    res.statusCode = 200;
    res.setHeader("Content-Type", contentType(target));
    res.end(content);
  } catch {
    sendJson(res, 404, invalidRequest(`Static file not found: ${urlPath}`));
  }
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".txt") || filePath.endsWith(".md") || filePath.endsWith(".log")) return "text/plain; charset=utf-8";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

function resolveWorkspace(candidatePath) {
  const fallback = resolveHomePath(os.homedir());
  if (!candidatePath || typeof candidatePath !== "string") {
    return fallback;
  }

  const expanded = candidatePath.startsWith("~")
    ? path.join(os.homedir(), candidatePath.slice(1))
    : candidatePath;
  const resolved = resolveHomePath(expanded);
  if (!isWithinHome(resolved)) {
    throw new Error("Workspace path must stay within the current user home directory.");
  }
  return resolved;
}

function parseDeviceFileRoots(value) {
  const raw = String(value || "").trim();
  const defaults = [os.homedir(), "F:\\"]
    .map((item) => resolveDevicePath(item))
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .filter((item) => {
      try {
        return existsSync(item);
      } catch {
        return false;
      }
    });
  const items = (raw ? raw.split(path.delimiter) : defaults)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => resolveDevicePath(item.startsWith("~") ? path.join(os.homedir(), item.slice(1)) : item))
    .filter((item) => {
      try {
        return existsSync(item);
      } catch {
        return false;
      }
    })
    .filter((item, index, arr) => arr.indexOf(item) === index);
  return items.length ? items : defaults;
}

function resolveAllowedPath(candidatePath) {
  const resolved = resolveDevicePath(candidatePath);
  if (!isWithinAllowedRoots(resolved)) {
    throw new Error("Path must stay within the allowed device file roots.");
  }
  return resolved;
}

function isWithinAllowedRoots(candidatePath) {
  const target = resolveDevicePath(candidatePath);
  return DEVICE_FILE_ROOTS.some((root) => isPathWithinRoot(target, root));
}

function getOwningRoot(candidatePath) {
  const target = resolveDevicePath(candidatePath);
  return DEVICE_FILE_ROOTS.find((root) => isPathWithinRoot(target, root)) || DEVICE_FILE_ROOTS[0] || os.homedir();
}

function sanitizeFileName(value) {
  const name = String(value || "").trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
  if (!name || name === "." || name === "..") return "";
  return name.slice(0, 180);
}

function resolveHomePath(candidatePath) {
  return path.resolve(candidatePath);
}

function resolveDevicePath(candidatePath) {
  if (!candidatePath || typeof candidatePath !== "string") {
    return resolveHomePath(os.homedir());
  }
  const expanded = candidatePath.startsWith("~")
    ? path.join(os.homedir(), candidatePath.slice(1))
    : candidatePath;
  return resolveHomePath(expanded);
}

function isPathWithinRoot(targetPath, rootPath) {
  const relative = path.relative(rootPath, targetPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isWithinHome(candidatePath) {
  const home = resolveHomePath(os.homedir());
  const target = resolveHomePath(candidatePath);
  return target === home || target.startsWith(`${home}${path.sep}`);
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 5 * 1024 * 1024) throw new Error("Request body too large.");
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function invalidRequest(message) {
  return {
    error: {
      message,
      type: "invalid_request_error"
    }
  };
}

function writeSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function writeSseEvent(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function splitForStreaming(text) {
  return text.match(/.{1,32}/gs) || [text];
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

class PairServerAgent {
  constructor({ brokerUrl, serverName, defaultTtlSeconds, rotateSeconds, trustStore, chatTaskStore }) {
    this.brokerUrl = brokerUrl;
    this.serverName = serverName;
    this.defaultTtlSeconds = Number(defaultTtlSeconds) || 90;
    this.rotateSeconds = Math.max(30, Number(rotateSeconds) || 60);
    this.trustStore = trustStore;
    this.chatTaskStore = chatTaskStore;
    this.ws = null;
    this.serverId = null;
    this.installationId = trustStore.installationId;
    this.currentCode = null;
    this.currentCodeExpiresAt = null;
    this.pending = new Map();
    this.seq = 1;
    this.connecting = null;
    this.shouldRun = true;
    this.reconnectTimer = null;
    this.rotateTimer = null;
    this.lastError = null;
  }

  async start() {
    await this.trustStore.loadPromise;
    this.installationId = this.trustStore.installationId;
    if (!this.shouldRun) this.shouldRun = true;
    await this.ensureConnected();
    this.ensureRotateLoop();
  }

  async ensureConnected() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (this.connecting) return this.connecting;

    this.connecting = new Promise((resolve, reject) => {
      const ws = new WebSocket(this.brokerUrl);
      this.ws = ws;
      let settled = false;

      ws.on("open", () => {
        this.lastError = null;
        this.send({
          type: "register_server",
          server_name: this.serverName,
          installation_id: this.installationId
        });
      });

      ws.on("message", (raw) => {
        const text = Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw);
        this.onMessage(text);
        if (!settled && this.serverId) {
          settled = true;
          resolve();
        }
      });

      ws.on("close", () => {
        this.ws = null;
        this.serverId = null;
        this.currentCode = null;
        this.currentCodeExpiresAt = null;
        this.failAllPending("broker connection closed");
        if (!settled) {
          settled = true;
          reject(new Error("broker connection closed"));
        }
        this.scheduleReconnect();
      });

      ws.on("error", (error) => {
        this.lastError = error instanceof Error ? error.message : String(error);
        if (!settled) {
          settled = true;
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    }).finally(() => {
      this.connecting = null;
    });

    return this.connecting;
  }

  scheduleReconnect() {
    if (!this.shouldRun || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.ensureConnected().catch(() => {});
    }, 2000);
    this.reconnectTimer.unref?.();
  }

  ensureRotateLoop() {
    if (this.rotateTimer) return;
    this.rotateTimer = setInterval(() => {
      this.refreshCode().catch((error) => {
        this.lastError = error instanceof Error ? error.message : String(error);
      });
    }, this.rotateSeconds * 1000);
    this.rotateTimer.unref?.();
  }

  send(payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("pair broker socket is not connected");
    }
    this.ws.send(JSON.stringify(payload));
  }

  request(type, payload = {}) {
    const reqId = `req_${this.seq++}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(reqId);
        reject(new Error(`${type} timeout`));
      }, 8000);
      this.pending.set(reqId, { resolve, reject, timer });
      try {
        this.send({ type, req_id: reqId, ...payload });
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(reqId);
        reject(error);
      }
    });
  }

  async refreshCode(ttlSeconds = this.defaultTtlSeconds) {
    const ttl = clampNumber(Number(ttlSeconds) || this.defaultTtlSeconds, 30, 3600);
    await this.ensureConnected();
    await this.request("create_code", { ttl_seconds: ttl });
    return this.status();
  }

  status() {
    return {
      broker_url: this.brokerUrl,
      connected: Boolean(this.ws && this.ws.readyState === WebSocket.OPEN),
      server_id: this.serverId,
      installation_id: this.installationId,
      current_code: this.currentCode,
      expires_at: this.currentCodeExpiresAt,
      trusted_devices: this.trustStore.count(),
      last_error: this.lastError
    };
  }

  async onPairRequest(msg) {
    const issued = await this.trustStore.issueDevice(msg.device_name || "Android Device", msg.client_installation_id || null);
    this.send({
      type: "pair_accept",
      client_id: msg.client_id,
      device_id: issued.deviceId,
      device_token: issued.deviceToken,
      server_name: this.serverName
    });
  }

  async onAuthRequest(msg) {
    const ok = await this.trustStore.authenticateDevice(msg.device_id, msg.device_token);
    this.send({
      type: "auth_result",
      client_id: msg.client_id,
      ok,
      device_id: msg.device_id,
      message: ok ? null : "device is not trusted"
    });
  }

  async onRpc(msg) {
    const method = msg.method;
    try {
      if (method === "config.get") {
        this.sendRpcResult(msg, getConfigPayload());
        return;
      }

      if (method === "fs.list") {
        this.sendRpcResult(msg, await getDirectoryListing(msg.body?.path || DEVICE_FILE_ROOTS[0] || os.homedir()));
        return;
      }

      if (method === "fs.roots") {
        this.sendRpcResult(msg, getFileRootsPayload());
        return;
      }

      if (method === "fs.download") {
        this.sendRpcResult(msg, await getFileDownloadPayload(msg.body?.path));
        return;
      }

      if (method === "fs.upload") {
        this.sendRpcResult(msg, await uploadFile(msg.body || {}));
        return;
      }

      if (method === "fs.transfer") {
        this.sendRpcResult(msg, await createFileTransfer(msg.body || {}));
        return;
      }

      if (method === "chat.stream") {
        const requestId = normalizeStoreId(msg.body?.request_id) || msg.req_id;
        const sessionId = normalizeStoreId(msg.body?.session_id) || null;
        await this.chatTaskStore.startTask({
          clientId: msg.client_id,
          requestId,
          sessionId,
          threadId: msg.body?.thread_id || null,
          cwd: msg.body?.cwd || null,
          message: msg.body?.message || ""
        });
        await streamUiTurnToCallbacks(msg.body || {}, {
          onThread: (data) => {
            this.chatTaskStore.updateTask({ clientId: msg.client_id, requestId, threadId: data?.thread_id, appendText: "" }).catch(() => {});
            this.sendRpcStream(msg, "thread", data);
          },
          onDelta: (data) => {
            this.chatTaskStore.updateTask({ clientId: msg.client_id, requestId, appendText: data?.delta || "" }).catch(() => {});
            this.sendRpcStream(msg, "delta", data);
          },
          onItem: (data) => this.sendRpcStream(msg, "item", data),
          onDone: (data) => {
            this.chatTaskStore.completeTask({
              clientId: msg.client_id,
              requestId,
              threadId: data?.thread_id || null,
              text: data?.text || "",
              error: null
            }).catch(() => {});
            this.sendRpcEnd(msg, data);
          },
          onError: (data) => {
            this.chatTaskStore.completeTask({
              clientId: msg.client_id,
              requestId,
              threadId: null,
              text: null,
              error: data?.message || "unknown error"
            }).catch(() => {});
            this.sendRpcEnd(msg, { error: data?.message || "unknown error" });
          }
        });
        return;
      }

      if (method === "chat.sync") {
        this.sendRpcResult(msg, { tasks: await this.chatTaskStore.listClientTasks(msg.client_id) });
        return;
      }

      if (method === "openai.chat") {
        if (msg.body?.stream) {
          const response = await runOpenAiChatCompletion({ ...msg.body, stream: false }, {});
          this.sendRpcResult(msg, response);
        } else {
          this.sendRpcResult(msg, await runOpenAiChatCompletion(msg.body || {}, {}));
        }
        return;
      }

      if (method === "openai.responses") {
        if (msg.body?.stream) {
          const response = await runOpenAiResponses({ ...msg.body, stream: false }, {});
          this.sendRpcResult(msg, response);
        } else {
          this.sendRpcResult(msg, await runOpenAiResponses(msg.body || {}, {}));
        }
        return;
      }

      this.sendRpcEnd(msg, { error: `unsupported method: ${method}` });
    } catch (error) {
      this.sendRpcEnd(msg, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  sendRpcResult(msg, data) {
    this.send({
      type: "rpc_result",
      client_id: msg.client_id,
      req_id: msg.req_id,
      method: msg.method,
      data
    });
  }

  sendRpcStream(msg, event, data) {
    this.send({
      type: "rpc_stream",
      client_id: msg.client_id,
      req_id: msg.req_id,
      method: msg.method,
      event,
      data
    });
  }

  sendRpcEnd(msg, data) {
    this.send({
      type: "rpc_end",
      client_id: msg.client_id,
      req_id: msg.req_id,
      method: msg.method,
      data
    });
  }

  onMessage(text) {
    let msg = null;
    try {
      msg = JSON.parse(text);
    } catch {
      return;
    }
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "server_registered" && msg.server_id) {
      this.serverId = msg.server_id;
      this.installationId = msg.installation_id || this.installationId;
      this.refreshCode().catch(() => {});
      return;
    }

    if (msg.type === "code_created") {
      this.currentCode = msg.code || null;
      this.currentCodeExpiresAt = msg.expires_at || null;
    }

    if (msg.type === "pair_request" && msg.client_id) {
      this.onPairRequest(msg).catch((error) => {
        this.lastError = error instanceof Error ? error.message : String(error);
      });
      return;
    }

    if (msg.type === "auth_request" && msg.client_id) {
      this.onAuthRequest(msg).catch((error) => {
        this.lastError = error instanceof Error ? error.message : String(error);
      });
      return;
    }

    if (msg.type === "rpc" && msg.client_id && msg.req_id && msg.method) {
      this.onRpc(msg).catch((error) => {
        this.sendRpcEnd(msg, {
          error: error instanceof Error ? error.message : String(error)
        });
      });
      return;
    }

    if (msg.req_id && this.pending.has(msg.req_id)) {
      const entry = this.pending.get(msg.req_id);
      this.pending.delete(msg.req_id);
      clearTimeout(entry.timer);
      if (msg.type === "error") {
        entry.reject(new Error(msg.message || "broker error"));
      } else {
        entry.resolve(msg);
      }
    }
  }

  failAllPending(message) {
    for (const [id, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(new Error(message));
      this.pending.delete(id);
    }
  }
}

class TrustedDeviceStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.state = {
      installationId: `inst_${crypto.randomUUID().replace(/-/g, "")}`,
      devices: []
    };
    this.loadPromise = this.load();
  }

  get installationId() {
    return this.state.installationId;
  }

  async load() {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      const installationId = normalizeStoreId(parsed?.installationId) || this.state.installationId;
      const devices = Array.isArray(parsed?.devices)
        ? parsed.devices
            .filter((item) => normalizeStoreId(item?.deviceId) && typeof item?.tokenHash === "string")
            .map((item) => ({
              ...item,
              clientInstallationId: normalizeStoreId(item?.clientInstallationId) || null
            }))
        : [];
      this.state = { installationId, devices: dedupeTrustedDevices(devices) };
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      await this.save();
    }
  }

  async save() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.state, null, 2), "utf8");
  }

  async issueDevice(deviceName, clientInstallationIdRaw = null) {
    await this.loadPromise;
    const clientInstallationId = normalizeStoreId(clientInstallationIdRaw) || null;
    const existing = clientInstallationId
      ? this.state.devices.find((entry) => entry.clientInstallationId === clientInstallationId)
      : null;
    const deviceId = existing?.deviceId || `dev_${crypto.randomUUID().replace(/-/g, "")}`;
    const deviceToken = crypto.randomBytes(24).toString("base64url");
    const tokenHash = hashToken(deviceToken);
    const now = new Date().toISOString();
    if (existing) {
      existing.tokenHash = tokenHash;
      existing.deviceName = String(deviceName || "Android Device").slice(0, 120);
      existing.clientInstallationId = clientInstallationId;
      existing.lastSeenAt = now;
    } else {
      this.state.devices.push({
        deviceId,
        tokenHash,
        deviceName: String(deviceName || "Android Device").slice(0, 120),
        clientInstallationId,
        createdAt: now,
        lastSeenAt: now
      });
    }
    await this.save();
    return { deviceId, deviceToken };
  }

  async authenticateDevice(deviceId, deviceToken) {
    await this.loadPromise;
    const item = this.state.devices.find((entry) => entry.deviceId === deviceId);
    if (!item) return false;
    if (item.tokenHash !== hashToken(deviceToken)) return false;
    item.lastSeenAt = new Date().toISOString();
    await this.save();
    return true;
  }

  count() {
    return this.state.devices.length;
  }
}

class ChatTaskStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.state = { tasks: [] };
    this.loadPromise = this.load();
  }

  async load() {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      this.state.tasks = Array.isArray(parsed?.tasks) ? parsed.tasks : [];
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      await this.save();
    }
  }

  async save() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const tasks = this.state.tasks.slice(-200);
    await fs.writeFile(this.filePath, JSON.stringify({ tasks }, null, 2), "utf8");
  }

  async startTask({ clientId, requestId, sessionId, threadId, cwd, message }) {
    await this.loadPromise;
    const now = new Date().toISOString();
    const existing = this.state.tasks.find((item) => item.clientId === clientId && item.requestId === requestId);
    const next = existing || {
      clientId,
      requestId,
      sessionId,
      threadId,
      cwd,
      message,
      text: "",
      status: "running",
      createdAt: now,
      updatedAt: now
    };
    next.sessionId = sessionId || next.sessionId || null;
    next.threadId = threadId || next.threadId || null;
    next.cwd = cwd || next.cwd || null;
    next.message = message || next.message || "";
    next.status = "running";
    next.updatedAt = now;
    if (!existing) this.state.tasks.push(next);
    await this.save();
  }

  async updateTask({ clientId, requestId, threadId, appendText }) {
    await this.loadPromise;
    const item = this.state.tasks.find((entry) => entry.clientId === clientId && entry.requestId === requestId);
    if (!item) return;
    if (threadId) item.threadId = threadId;
    if (appendText) item.text = `${item.text || ""}${appendText}`;
    item.updatedAt = new Date().toISOString();
    await this.save();
  }

  async completeTask({ clientId, requestId, threadId, text, error }) {
    await this.loadPromise;
    const item = this.state.tasks.find((entry) => entry.clientId === clientId && entry.requestId === requestId);
    if (!item) return;
    item.threadId = threadId || item.threadId || null;
    item.text = typeof text === "string" ? text : item.text || "";
    item.status = error ? "error" : "completed";
    item.error = error || null;
    item.updatedAt = new Date().toISOString();
    await this.save();
  }

  async listClientTasks(clientId) {
    await this.loadPromise;
    return this.state.tasks
      .filter((item) => item.clientId === clientId)
      .slice(-100)
      .sort((a, b) => String(a.updatedAt).localeCompare(String(b.updatedAt)));
  }
}

function hashToken(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function normalizeStoreId(value) {
  const text = String(value || "").trim();
  return /^[a-zA-Z0-9._:-]{3,128}$/.test(text) ? text : null;
}

function dedupeTrustedDevices(devices) {
  const byClientInstallationId = new Map();
  const passthrough = [];
  for (const device of devices) {
    if (!device.clientInstallationId) {
      passthrough.push(device);
      continue;
    }
    const existing = byClientInstallationId.get(device.clientInstallationId);
    if (!existing || String(existing.lastSeenAt || "") <= String(device.lastSeenAt || "")) {
      byClientInstallationId.set(device.clientInstallationId, device);
    }
  }
  return [...passthrough, ...byClientInstallationId.values()];
}

const trustStore = new TrustedDeviceStore(TRUST_STORE_PATH);
const chatTaskStore = new ChatTaskStore(CHAT_TASK_STORE_PATH);
pairAgent = new PairServerAgent({
  brokerUrl: PAIR_BROKER_URL,
  serverName: PAIR_SERVER_NAME,
  defaultTtlSeconds: PAIR_CODE_TTL_SECONDS,
  rotateSeconds: PAIR_CODE_ROTATE_SECONDS,
  trustStore,
  chatTaskStore
});

function handleCreateLinkCode(res, body, headers) {
  const targetHost = String(body?.target_host || "localhost").trim();
  const targetPort = Number(body?.target_port || 8000);
  const requestedTtl = Number(body?.ttl_seconds || CODE_LINK_DEFAULT_TTL_SECONDS);
  const ttlSeconds = clampNumber(
    Number.isFinite(requestedTtl) ? requestedTtl : CODE_LINK_DEFAULT_TTL_SECONDS,
    30,
    CODE_LINK_MAX_TTL_SECONDS
  );
  const maxUsesRequested = Number(body?.max_uses || 1);
  const maxUses = clampNumber(Number.isFinite(maxUsesRequested) ? maxUsesRequested : 1, 1, 20);

  if (!Number.isInteger(targetPort) || targetPort < 1 || targetPort > 65535) {
    return sendJson(res, 400, invalidRequest("`target_port` must be an integer between 1 and 65535."));
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(targetHost)) {
    return sendJson(res, 400, invalidRequest("`target_host` includes unsupported characters."));
  }

  const code = generateLinkCode();
  const createdAt = Date.now();
  const expiresAt = createdAt + ttlSeconds * 1000;
  codeLinks.set(code, {
    code,
    targetHost,
    targetPort,
    createdAt,
    expiresAt,
    maxUses,
    usedCount: 0,
    lastUsedAt: null
  });

  const protocol = String(headers["x-forwarded-proto"] || "").split(",")[0].trim() || "http";
  const requestHost = headers.host || `localhost:${PORT}`;
  const wsProtocol = protocol === "https" ? "wss" : "ws";
  const connectPath = `/api/link/connect?code=${encodeURIComponent(code)}`;

  return sendJson(res, 200, {
    code,
    target_host: targetHost,
    target_port: targetPort,
    ttl_seconds: ttlSeconds,
    max_uses: maxUses,
    used_count: 0,
    created_at: new Date(createdAt).toISOString(),
    expires_at: new Date(expiresAt).toISOString(),
    connect_path: connectPath,
    connect_url: `${wsProtocol}://${requestHost}${connectPath}`
  });
}

function handleLinkStatus(url, res) {
  pruneExpiredLinkCodes();
  const code = normalizeCode(url.searchParams.get("code"));
  if (!code) {
    return sendJson(res, 400, invalidRequest("`code` query parameter is required."));
  }
  const item = codeLinks.get(code);
  if (!item) {
    return sendJson(res, 404, invalidRequest("Link code not found or expired."));
  }
  return sendJson(res, 200, {
    code: item.code,
    target_host: item.targetHost,
    target_port: item.targetPort,
    max_uses: item.maxUses,
    used_count: item.usedCount,
    created_at: new Date(item.createdAt).toISOString(),
    expires_at: new Date(item.expiresAt).toISOString(),
    last_used_at: item.lastUsedAt ? new Date(item.lastUsedAt).toISOString() : null
  });
}

function bridgeWsToTcp(ws, link) {
  let closed = false;
  let isTcpReady = false;
  const queued = [];
  const socket = net.createConnection({
    host: link.targetHost,
    port: link.targetPort
  });

  const closeBoth = () => {
    if (closed) return;
    closed = true;
    try {
      socket.destroy();
    } catch {}
    try {
      ws.close();
    } catch {}
  };

  socket.on("connect", () => {
    isTcpReady = true;
    ws.send(
      JSON.stringify({
        type: "connected",
        target_host: link.targetHost,
        target_port: link.targetPort
      })
    );
    while (queued.length > 0) {
      const chunk = queued.shift();
      socket.write(chunk);
    }
  });

  socket.on("data", (chunk) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(chunk, { binary: true });
    }
  });

  socket.on("error", (error) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
    closeBoth();
  });

  socket.on("close", () => {
    closeBoth();
  });

  ws.on("message", (message) => {
    const data = Buffer.isBuffer(message) ? message : Buffer.from(message);
    if (!isTcpReady) {
      queued.push(data);
      return;
    }
    socket.write(data);
  });

  ws.on("close", () => {
    closeBoth();
  });

  ws.on("error", () => {
    closeBoth();
  });
}

function pruneExpiredLinkCodes() {
  const now = Date.now();
  for (const [code, item] of codeLinks) {
    if (item.expiresAt <= now) {
      codeLinks.delete(code);
    }
  }
}

function normalizeCode(value) {
  if (!value || typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(normalized) ? normalized : null;
}

function generateLinkCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let i = 0; i < 16; i += 1) {
    let code = "";
    for (let j = 0; j < 6; j += 1) {
      code += alphabet[crypto.randomInt(0, alphabet.length)];
    }
    if (!codeLinks.has(code)) {
      return code;
    }
  }
  throw new Error("Failed to allocate unique link code.");
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, Math.floor(value)));
}
