import http from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHandler } from "../netlify/lib/gameHandler.ts";

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json" };

// In-memory room store with the same conditional-write contract as Netlify Blobs (single instance only).
class MemoryStore {
  constructor() { this.values = new Map(); this.version = 0; }
  async getWithMetadata(key) {
    const entry = this.values.get(key);
    return entry ? { data: structuredClone(entry.data), etag: entry.etag, metadata: {} } : null;
  }
  async setJSON(key, data, options = {}) {
    const old = this.values.get(key);
    if (options.onlyIfNew && old) return { modified: false };
    if (options.onlyIfMatch && (!old || old.etag !== options.onlyIfMatch)) return { modified: false };
    const etag = `"mem-${++this.version}"`;
    this.values.set(key, { data: structuredClone(data), etag });
    return { modified: true, etag };
  }
}

const handler = createHandler(new MemoryStore());

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname === "/health") { res.writeHead(200, { "content-type": "application/json" }); res.end('{"ok":true}'); return; }
    if (url.pathname === "/.netlify/functions/game") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const response = await handler(new Request(url, { method: req.method, headers: { "content-type": "application/json" }, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks) }));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    let file = path.join(dist, path.normalize(decodeURIComponent(url.pathname)));
    if (!file.startsWith(dist)) { res.writeHead(403); res.end(); return; }
    let body;
    try { body = await readFile(file); } catch { file = path.join(dist, "index.html"); body = await readFile(file); }
    res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch (error) {
    console.error(error);
    res.writeHead(500); res.end("Server error");
  }
});

server.listen(process.env.PORT || 3000, "0.0.0.0", () => console.log("Bible Buzz listening"));
