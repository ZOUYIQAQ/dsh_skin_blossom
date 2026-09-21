/**
 * Write the market note (description) for this plugin.
 *
 * dsh-market does NOT read a local plugin's description from its package.json — it
 * renders its own note store, keyed by plugin id. That is why the card for this
 * plugin showed an empty description while the others had one: the store still held
 * the note under the OLD id (`dsh-codex-skin`) and nothing under `peach-fizz`.
 *
 * Sent from a file rather than inline so the CJK text is never mangled by shell
 * quoting or the console code page.
 *
 *   node scripts/set-market-note.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** MAX_NOTE in dsh-market's hot.js is 200 — keep it under that. */
const NOTE = "桃子味气泡水主题";

const PLUGIN_ID = "peach-fizz";
const PORT = process.env.DSH_PORT ?? "3080";
const ORIGIN = `http://127.0.0.1:${PORT}`;

// The note endpoint enforces a same-origin check, so the Origin header is required.
const response = await fetch(`${ORIGIN}/dsh-market/note`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: ORIGIN },
  body: JSON.stringify({ name: PLUGIN_ID, text: NOTE }),
});

const text = await response.text();
console.log(`POST /dsh-market/note -> ${response.status}`);
console.log(text.slice(0, 300));

// Verify against the store itself.
const statePath = join(root, "..", "..", "profiles", "web", ".dsh-market", "state.json");
if (existsSync(statePath)) {
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  const stored = state.notes?.[PLUGIN_ID];
  console.log(`stored[${PLUGIN_ID}] = ${stored === undefined ? "(missing)" : stored}`);
  console.log(`note length = ${NOTE.length} / 200`);
}
