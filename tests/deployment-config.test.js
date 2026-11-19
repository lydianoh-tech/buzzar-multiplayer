import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("frontend targets the standard Netlify Function URL directly", async () => {
  const client = await readFile(new URL("../src/gameClient.js", import.meta.url), "utf8");
  assert.match(client, /const ENDPOINT = "\/.netlify\/functions\/game"/);
  assert.doesNotMatch(client, /\/api\/game/);
  const functionSource = await readFile(new URL("../netlify/functions/game.ts", import.meta.url), "utf8");
  assert.doesNotMatch(functionSource, /config\s*\.\s*path|export\s+const\s+config/);
  assert.match(functionSource, /getStore\(\{ name: "bible-buzz-rooms", consistency: "strong" \}\)/);
  const toml = await readFile(new URL("../netlify.toml", import.meta.url), "utf8");
  assert.match(toml, /functions\s*=\s*"netlify\/functions"/);
});
