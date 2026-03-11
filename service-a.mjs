import net from "node:net";

const PORT = Number(process.env.SERVICE_A_PORT || 8000);
const HOST = process.env.SERVICE_A_HOST || "0.0.0.0";

const server = net.createServer((socket) => {
  const remote = `${socket.remoteAddress || "unknown"}:${socket.remotePort || 0}`;
  socket.write(`[service-a] connected from ${remote}\n`);
  socket.write("[service-a] send any text, I will echo it with timestamp.\n");

  socket.on("data", (chunk) => {
    const text = chunk.toString("utf8");
    const stamp = new Date().toISOString();
    socket.write(`[service-a ${stamp}] ${text}`);
  });

  socket.on("error", () => {
    socket.destroy();
  });
});

server.on("error", (error) => {
  console.error("[service-a] fatal:", error);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`[service-a] listening on ${HOST}:${PORT}`);
});
