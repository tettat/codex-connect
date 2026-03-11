const ttlInput = document.querySelector("#ttlInput");
const createCodeBtn = document.querySelector("#createCodeBtn");
const refreshBtn = document.querySelector("#refreshBtn");
const codeValue = document.querySelector("#codeValue");
const codeMeta = document.querySelector("#codeMeta");
const brokerUrl = document.querySelector("#brokerUrl");
const serverId = document.querySelector("#serverId");
const pairId = document.querySelector("#pairId");
const lastError = document.querySelector("#lastError");
const logBox = document.querySelector("#logBox");

createCodeBtn.addEventListener("click", createCode);
refreshBtn.addEventListener("click", loadStatus);
loadStatus();
setInterval(loadStatus, 5000);

function log(message) {
  const line = `[${new Date().toLocaleTimeString()}] ${message}`;
  logBox.textContent += `${line}\n`;
  logBox.scrollTop = logBox.scrollHeight;
}

async function createCode() {
  try {
    const ttl = Number(ttlInput.value || 300);
    const response = await fetch("/api/pair/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ttl_seconds: ttl })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);

    codeValue.textContent = payload.current_code || payload.code || "------";
    codeMeta.textContent = `expires: ${payload.expires_at || "-"} | broker: ${payload.broker_url || "-"}`;
    log(`code refreshed: ${payload.current_code || payload.code || "-"}`);
    await loadStatus();
  } catch (error) {
    log(`create failed: ${error.message}`);
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
    codeMeta.textContent = `expires: ${payload.expires_at || "-"} | trusted devices: ${payload.trusted_devices ?? 0}`;
    log(`status: connected=${payload.connected ? "yes" : "no"} server_id=${payload.server_id || "-"}`);
  } catch (error) {
    log(`status failed: ${error.message}`);
  }
}
