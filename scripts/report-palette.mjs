/** Report which near-duplicate literals would collapse at each tolerance. */
import { readFileSync } from "node:fs";

const report = JSON.parse(readFileSync(new URL("../theme-tokens.json", import.meta.url), "utf8"));
const light = report.tokens.light;

const hex = (h) => {
  const s = h.replace("#", "");
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) };
};
const lum = (h) => {
  const { r, g, b } = hex(h);
  const c = (n) => {
    const v = n / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
};
const dist = (a, b) => Math.hypot(hex(a).r - hex(b).r, hex(a).g - hex(b).g, hex(a).b - hex(b).b);

const paletteTokens = Object.entries(light).filter(([k]) => !k.startsWith("--dsh-codex-"));
const colors = [...new Set(paletteTokens.map(([, v]) => v).filter((v) => /^#[0-9a-f]{6}$/i.test(v)))];
console.log(`palette literals: ${colors.length}`);

for (const tol of [6, 8, 10, 12, 14]) {
  const reps = [];
  const merges = [];
  for (const c of [...colors].sort((a, b) => lum(a) - lum(b))) {
    const hit = reps.find((rep) => dist(rep, c) <= tol);
    if (hit !== undefined) merges.push([c, hit, dist(c, hit)]);
    else reps.push(c);
  }
  console.log(`tolerance ${String(tol).padStart(2)} → merge ${String(merges.length).padStart(2)}, remaining ${reps.length} rungs`);
}

const tol = 10;
const reps = [];
const merges = [];
for (const c of [...colors].sort((a, b) => lum(a) - lum(b))) {
  const hit = reps.find((rep) => dist(rep, c) <= tol);
  if (hit !== undefined) merges.push([c, hit, dist(c, hit)]);
  else reps.push(c);
}
console.log(`\nmerges at tolerance ${tol} (from → to, distance):`);
for (const [from, to, d] of merges) console.log(`  ${from} → ${to}   (${d.toFixed(1)})`);

console.log("\ndecoration ladder published:");
for (const [name, value] of Object.entries(light)) {
  if (name.startsWith("--dsh-codex-") && !name.endsWith("-count")) console.log(`  ${name} = ${value}`);
}
