/** Report which palette colours the generated decoration stylesheet uses. */
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../client.js", import.meta.url), "utf8");
const matched = /var DECO_CSS = ("(?:[^"\\]|\\.)*")/.exec(source);
if (matched === null) throw new Error("DECO_CSS literal not found in client.js");
const css = JSON.parse(matched[1]);

const hexes = [...new Set([...css.matchAll(/#[0-9a-f]{6}/gi)].map((m) => m[0].toLowerCase()))].sort();
console.log("colours referenced by the deco sheet:");
for (const hex of hexes) console.log(`  ${hex}`);

const check = (label, hex) => console.log(`${css.toLowerCase().includes(hex) ? "USED" : "absent"}  ${label} ${hex}`);
check("teal  ", "#56949f");
check("violet", "#907aa9");
check("ochre ", "#79510f");
check("rose  ", "#b1524e");
check("roseSoft", "#d7827e");

const warmOnly = hexes.filter((hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return b > r + 6; // blue-dominant = cool
});
console.log("\nrules still carrying a cool colour:");
for (const hex of warmOnly) {
  for (const line of css.split("\n")) {
    if (line.toLowerCase().includes(hex)) console.log(`  ${hex}  ${line.trim().slice(0, 120)}`);
  }
}
console.log(warmOnly.length === 0 ? "\nPASS: every colour in the deco sheet is warm" : `\nFAIL: cool colours remain: ${warmOnly.join(", ")}`);
if (warmOnly.length > 0) process.exit(1);
