const ttlInput = document.querySelector("#ttlInput");
const createCodeBtn = document.querySelector("#createCodeBtn");
const refreshBtn = document.querySelector("#refreshBtn");
const codeValue = document.querySelector("#codeValue");
const codeMeta = document.querySelector("#codeMeta");
const countdownValue = document.querySelector("#countdownValue");
const brokerUrl = document.querySelector("#brokerUrl");
const serverId = document.querySelector("#serverId");
const pairId = document.querySelector("#pairId");
const lastError = document.querySelector("#lastError");
const mobileUrl = document.querySelector("#mobileUrl");
const openMobileBtn = document.querySelector("#openMobileBtn");
const copyMobileBtn = document.querySelector("#copyMobileBtn");
const qrImage = document.querySelector("#qrImage");
const connectedState = document.querySelector("#connectedState");
const trustedDevicesValue = document.querySelector("#trustedDevicesValue");
const logBox = document.querySelector("#logBox");

createCodeBtn.addEventListener("click", createCode);
refreshBtn.addEventListener("click", loadStatus);
copyMobileBtn.addEventListener("click", copyMobileLink);
loadStatus();
setInterval(loadStatus, 5000);
setInterval(updateCountdown, 1000);

const DEFAULT_PWA_URL = "https://codex-connect-edge.wahtmelon.workers.dev";
let currentExpiresAt = null;
let creatingCode = false;

function log(message) {
  const line = `[${new Date().toLocaleTimeString()}] ${message}`;
  logBox.textContent += `${line}\n`;
  logBox.scrollTop = logBox.scrollHeight;
}

async function createCode() {
  if (creatingCode) return;
  try {
    creatingCode = true;
    const ttl = Number(ttlInput.value || 300);
    const response = await fetch("/api/pair/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ttl_seconds: ttl })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);

    codeValue.textContent = payload.current_code || payload.code || "------";
    currentExpiresAt = payload.expires_at || null;
    updateCodeMeta(payload);
    log(`code refreshed: ${payload.current_code || payload.code || "-"}`);
    await loadStatus();
  } catch (error) {
    log(`create failed: ${error.message}`);
  } finally {
    creatingCode = false;
  }
}

async function loadStatus() {
  try {
    const response = await fetch("/api/pair/status");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
    brokerUrl.value = payload.broker_url || "";
    serverId.value = payload.server_id || "";
    pairId.value = payload.installation_id || "";
    lastError.value = payload.last_error || "";
    codeValue.textContent = payload.current_code || "------";
    currentExpiresAt = payload.expires_at || null;
    connectedState.textContent = payload.connected ? "Connected" : "Disconnected";
    trustedDevicesValue.textContent = String(payload.trusted_devices ?? 0);
    updateCodeMeta(payload);
    updateMobileEntry(resolvePwaUrl(payload.broker_url || ""));
    log(`status: connected=${payload.connected ? "yes" : "no"} server_id=${payload.server_id || "-"}`);
    if (payload.connected && !payload.current_code && !creatingCode) {
      log("no active code, creating one automatically");
      await createCode();
    }
  } catch (error) {
    log(`status failed: ${error.message}`);
  }
}

function updateCodeMeta(payload) {
  codeMeta.textContent = `expires: ${payload.expires_at || "-"} | trusted devices: ${payload.trusted_devices ?? 0}`;
  updateCountdown();
}

function updateCountdown() {
  if (!currentExpiresAt) {
    countdownValue.textContent = "Waiting for a code.";
    return;
  }
  const expiresMs = Date.parse(currentExpiresAt);
  if (!Number.isFinite(expiresMs)) {
    countdownValue.textContent = `Expires at ${currentExpiresAt}`;
    return;
  }
  const remainingMs = expiresMs - Date.now();
  if (remainingMs <= 0) {
    countdownValue.textContent = "Code expired. Refresh to issue a new one.";
    return;
  }
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  countdownValue.textContent = `Expires in ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function resolvePwaUrl(currentBrokerUrl) {
  if (!currentBrokerUrl) return DEFAULT_PWA_URL;
  try {
    const url = new URL(currentBrokerUrl);
    url.protocol = url.protocol === "wss:" ? "https:" : "http:";
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_PWA_URL;
  }
}

function updateMobileEntry(url) {
  mobileUrl.value = url;
  openMobileBtn.href = url;
  qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=216x216&data=${encodeURIComponent(url)}`;
}

async function copyMobileLink() {
  try {
    await navigator.clipboard.writeText(mobileUrl.value || "");
    log("phone link copied");
  } catch (error) {
    log(`copy failed: ${error.message}`);
  }
}
