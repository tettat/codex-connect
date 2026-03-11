const STORAGE_KEY = "codex-local-chat-sessions";
const state = {
  sessions: loadSessions(),
  activeId: null,
  streaming: false,
  config: null,
  directoryState: null
};

const sessionList = document.querySelector("#sessionList");
const chatWindow = document.querySelector("#chatWindow");
const sessionTitle = document.querySelector("#sessionTitle");
const sessionMeta = document.querySelector("#sessionMeta");
const statusPill = document.querySelector("#statusPill");
const messageInput = document.querySelector("#messageInput");
const composer = document.querySelector("#composer");
const sendBtn = document.querySelector("#sendBtn");
const newSessionBtn = document.querySelector("#newSessionBtn");
const sessionSettingsBtn = document.querySelector("#sessionSettingsBtn");
const workspaceDialog = document.querySelector("#workspaceDialog");
const closeDialogBtn = document.querySelector("#closeDialogBtn");
const workspacePath = document.querySelector("#workspacePath");
const yoloToggle = document.querySelector("#yoloToggle");
const directoryList = document.querySelector("#directoryList");
const goHomeBtn = document.querySelector("#goHomeBtn");
const goUpBtn = document.querySelector("#goUpBtn");
const messageTemplate = document.querySelector("#messageTemplate");

bootstrap();

async function bootstrap() {
  ensureSession();
  renderAll();
  await loadConfig();

  composer.addEventListener("submit", onSubmit);
  newSessionBtn.addEventListener("click", () => {
    state.activeId = createSession().id;
    persist();
    renderAll();
  });

  sessionSettingsBtn.addEventListener("click", openSettingsDialog);
  closeDialogBtn.addEventListener("click", () => workspaceDialog.close());
  yoloToggle.addEventListener("change", () => {
    const session = currentSession();
    session.yolo = yoloToggle.checked;
    persist();
    renderSessionHeader(session);
    renderSessionList();
  });
  goHomeBtn.addEventListener("click", () => loadDirectoryBrowser(state.config?.codex_home));
  goUpBtn.addEventListener("click", () => {
    if (state.directoryState?.parent) {
      loadDirectoryBrowser(state.directoryState.parent);
    }
  });
}

async function loadConfig() {
  try {
    const response = await fetch("/api/config");
    state.config = await response.json();
    statusPill.textContent = `LAN ready · ${state.config.codex_model} · ${state.config.host}:${state.config.port}`;
    for (const session of state.sessions) {
      session.cwd ||= state.config.codex_home;
      session.yolo ||= false;
    }
    persist();
    renderAll();
  } catch {
    statusPill.textContent = "Local Codex unavailable";
  }
}

async function onSubmit(event) {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text || state.streaming) return;

  const session = currentSession();
  state.streaming = true;
  messageInput.value = "";
  sendBtn.disabled = true;

  const userMessage = createMessage("user", text);
  const assistantMessage = createMessage("assistant", "");
  session.messages.push(userMessage, assistantMessage);
  session.updatedAt = Date.now();
  if (session.messages.length === 2) session.title = deriveTitle(text);
  persist();
  renderAll();
  scrollToBottom();

  try {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        thread_id: session.threadId,
        message: text,
        cwd: session.cwd,
        yolo: session.yolo
      })
    });

    await consumeSseStream(response, {
      delta(payload) {
        assistantMessage.content += payload.delta || "";
        renderMessages(session);
      },
      thread(payload) {
        if (payload.thread_id) {
          session.threadId = payload.thread_id;
          persist();
          renderSessionHeader(session);
          renderSessionList();
        }
      },
      done(payload) {
        assistantMessage.content = payload.text || assistantMessage.content;
        session.threadId = payload.thread_id || session.threadId;
        session.updatedAt = Date.now();
        persist();
        renderAll();
      },
      error(payload) {
        assistantMessage.content = `Error: ${payload.message || "Unknown error"}`;
        persist();
        renderMessages(session);
      }
    });
  } catch (error) {
    assistantMessage.content = `Error: ${error.message}`;
    persist();
    renderMessages(session);
  } finally {
    state.streaming = false;
    sendBtn.disabled = false;
    messageInput.focus();
  }
}

async function consumeSseStream(response, handlers) {
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      if (!part.trim()) continue;
      if (part.includes("data: [DONE]")) return;

      let eventName = "message";
      let data = "";

      for (const line of part.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        if (line.startsWith("data:")) data += line.slice(5).trim();
      }

      const payload = data ? JSON.parse(data) : {};
      if (handlers[eventName]) handlers[eventName](payload);
    }
  }
}

async function openSettingsDialog() {
  const session = currentSession();
  if (!state.config) {
    await loadConfig();
  }
  yoloToggle.checked = Boolean(session.yolo);
  workspacePath.value = session.cwd || state.config?.codex_home || "";
  await loadDirectoryBrowser(session.cwd || state.config?.codex_home);
  workspaceDialog.showModal();
}

async function loadDirectoryBrowser(targetPath) {
  const response = await fetch(`/api/fs/list?path=${encodeURIComponent(targetPath || "")}`);
  const payload = await response.json();
  state.directoryState = payload;
  renderDirectoryBrowser();
}

function renderDirectoryBrowser() {
  const session = currentSession();
  const current = state.directoryState;
  workspacePath.value = session.cwd || current.current;
  goUpBtn.disabled = !current.parent;
  directoryList.innerHTML = "";

  const currentButton = document.createElement("button");
  currentButton.className = "dir-entry selected";
  currentButton.textContent = `Use this folder · ${current.current}`;
  currentButton.addEventListener("click", () => {
    session.cwd = current.current;
    persist();
    workspacePath.value = session.cwd;
    renderSessionHeader(session);
    renderSessionList();
  });
  directoryList.appendChild(currentButton);

  for (const dir of current.directories) {
    const row = document.createElement("div");
    row.className = "dir-row";

    const openBtn = document.createElement("button");
    openBtn.className = "dir-entry";
    openBtn.textContent = dir.name;
    openBtn.addEventListener("click", () => loadDirectoryBrowser(dir.path));

    const chooseBtn = document.createElement("button");
    chooseBtn.className = "ghost-btn compact";
    chooseBtn.textContent = "Select";
    chooseBtn.addEventListener("click", () => {
      session.cwd = dir.path;
      persist();
      workspacePath.value = session.cwd;
      renderSessionHeader(session);
      renderSessionList();
    });

    row.append(openBtn, chooseBtn);
    directoryList.appendChild(row);
  }
}

function renderAll() {
  renderSessionList();
  renderSessionHeader(currentSession());
  renderMessages(currentSession());
}

function renderSessionList() {
  sessionList.innerHTML = "";
  const sessions = [...state.sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  for (const session of sessions) {
    const button = document.createElement("button");
    button.className = `session-card${session.id === state.activeId ? " active" : ""}`;
    const modeLabel = session.yolo ? "yolo" : "guarded";
    button.innerHTML = `
      <span class="session-card-title">${escapeHtml(session.title)}</span>
      <span class="session-card-meta">${escapeHtml(shortPath(session.cwd || state.config?.codex_home || "~"))} · ${modeLabel}</span>
    `;
    button.addEventListener("click", () => {
      state.activeId = session.id;
      persist();
      renderAll();
    });
    sessionList.appendChild(button);
  }
}

function renderSessionHeader(session) {
  const modeLabel = session.yolo ? "YOLO mode" : "Guarded mode";
  sessionTitle.textContent = session.title;
  sessionMeta.textContent = `${modeLabel} · ${shortPath(session.cwd || state.config?.codex_home || "~")} · ${session.threadId ? `Thread ${session.threadId.slice(0, 12)}...` : "new thread"}`;
}

function renderMessages(session) {
  chatWindow.innerHTML = "";

  if (session.messages.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <p class="empty-kicker">Independent session</p>
      <h3>Pick a workspace and start coding with local Codex</h3>
      <p>This session keeps its own thread, workspace folder, and yolo setting.</p>
    `;
    chatWindow.appendChild(empty);
    return;
  }

  for (const message of session.messages) {
    const node = messageTemplate.content.firstElementChild.cloneNode(true);
    node.classList.add(message.role);
    node.querySelector(".message-role").textContent = message.role === "user" ? "You" : "Codex";
    node.querySelector(".message-body").textContent = message.content;
    chatWindow.appendChild(node);
  }

  scrollToBottom();
}

function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function ensureSession() {
  if (state.sessions.length === 0) {
    const session = createSession();
    state.activeId = session.id;
    persist();
    return;
  }

  if (!state.activeId || !state.sessions.find((session) => session.id === state.activeId)) {
    state.activeId = state.sessions[0].id;
  }
}

function currentSession() {
  return state.sessions.find((session) => session.id === state.activeId);
}

function createSession() {
  const session = {
    id: crypto.randomUUID(),
    title: "New Session",
    threadId: null,
    cwd: state.config?.codex_home || "",
    yolo: false,
    messages: [],
    updatedAt: Date.now()
  };
  state.sessions.unshift(session);
  return session;
}

function createMessage(role, content) {
  return {
    id: crypto.randomUUID(),
    role,
    content
  };
}

function deriveTitle(text) {
  return text.trim().slice(0, 28) || "New Session";
}

function shortPath(value) {
  if (!value) return "~";
  if (state.config?.codex_home && value.startsWith(state.config.codex_home)) {
    return `~${value.slice(state.config.codex_home.length) || ""}`;
  }
  return value;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.sessions));
}

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
