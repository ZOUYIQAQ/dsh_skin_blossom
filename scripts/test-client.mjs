/**
 * Runtime harness for the generated ./client.js.
 *
 * Runs the shipped bundle against a stubbed module loader, cordis context and
 * DOM, then asserts the three things that decide whether the skin takes over:
 *   1. the bundle evaluates and exports a plugin (no runtime throw),
 *   2. apply() registers `codex-theme-v1` and the token dictionary,
 *   3. the default-activation policy picks the skin when nothing else has, and
 *      leaves the user's explicit in-session choice alone.
 *
 *   node scripts/test-client.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "client.js"), "utf8");

const checks = [];
const check = (name, ok, detail) => {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

// ── DOM stub ─────────────────────────────────────────────────────────────────
// One node list backs head and body so `getElementById`, `remove()` and the
// insertBefore ordering all behave like the real document.
const nodes = [];
const makeNode = () => {
  const node = {
    id: "",
    className: "",
    dataset: {},
    textContent: "",
    children: [],
    attributes: {},
    parent: null,
    appendChild(child) {
      child.parent = node;
      node.children.push(child);
      nodes.push(child);
      return child;
    },
    setAttribute(name, value) {
      node.attributes[name] = value;
    },
    // Minimal query support: the particle engine asks the layer for its zone
    // containers. Returning an empty list keeps the harness on the CSS/DOM shape
    // it can model; the live engine is verified in a real browser.
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return null;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 0, height: 0 };
    },
    remove() {
      const at = nodes.indexOf(node);
      if (at >= 0) nodes.splice(at, 1);
      if (node.parent !== null) {
        const childAt = node.parent.children.indexOf(node);
        if (childAt >= 0) node.parent.children.splice(childAt, 1);
      }
    },
  };
  return node;
};
const document = {
  head: makeNode(),
  body: makeNode(),
  getElementById: (id) => nodes.find((n) => n.id === id) ?? null,
  createElement: () => makeNode(),
  // The harness has no app shell, so the conversation column does not exist and
  // mountLayer leaves the layer on `body`. The real mount path (layer inside
  // `…_centerCol`, under a positioning anchor) is verified in a live browser.
  querySelector: () => null,
  querySelectorAll: () => [],
};
document.body.style = { setProperty() {}, removeProperty() {} };
Object.defineProperty(document.body, "firstChild", { get() { return document.body.children[0] ?? null; } });
document.body.insertBefore = (child, ref) => {
  child.parent = document.body;
  const at = ref === null ? document.body.children.length : document.body.children.indexOf(ref);
  document.body.children.splice(at < 0 ? document.body.children.length : at, 0, child);
  nodes.push(child);
  return child;
};

// ── module loader stub ───────────────────────────────────────────────────────
let factory = null;
const window = {
  innerWidth: 1418,
  innerHeight: 802,
  __ModuleLoader__: {
    load({ id, factory: f }) {
      factory = f;
      check("bundle registers loader entry", id === "dsh_skin_blossom", `id=${id}`);
    },
  },
};

// ── react stub ───────────────────────────────────────────────────────────────
const react = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: (v) => [v, () => {}],
  useEffect: () => {},
  useRef: (v) => ({ current: v }),
};

/** Stand-in for the ResizeObserver the layout tracker installs. */
const resizeObservers = [];
class ResizeObserverStub {
  constructor(callback) {
    this.callback = callback;
    resizeObservers.push(this);
  }
  observe() {}
  disconnect() {}
}

const requireShim = (name) => {
  if (name === "react") return react;
  throw new Error(`unexpected require(${name})`);
};

// ── sessionStorage stub (the sticky user-choice flag) ────────────────────────
const storage = new Map();
const sessionStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
};

// ── run the bundle ───────────────────────────────────────────────────────────
/**
 * The bundle arms a repeating interval to re-mark AI run boundaries. A real
 * interval would keep this process alive forever, so the harness passes a stub
 * that records the call and never fires.
 */
const intervalStub = () => 0;
const clearIntervalStub = () => {};
try {
  // eslint-disable-next-line no-new-func
  new Function(
    "window",
    "document",
    "setTimeout",
    "setInterval",
    "clearInterval",
    "console",
    "sessionStorage",
    "Storage",
    "ResizeObserver",
    "requestAnimationFrame",
    source
  )(window, document, setTimeout, intervalStub, clearIntervalStub, console, sessionStorage, sessionStorage, ResizeObserverStub, (fn) => fn());
  check("bundle evaluates", true);
} catch (error) {
  check("bundle evaluates", false, error.message);
}

if (factory === null) {
  console.error("\nfactory was never registered — cannot continue");
  process.exit(1);
}

let exports;
try {
  exports = factory(requireShim);
  check("factory materializes", typeof exports.apply === "function", `name=${exports.name}`);
} catch (error) {
  check("factory materializes", false, error.message);
  process.exit(1);
}

// ── cordis context stub ──────────────────────────────────────────────────────
function makeCtx({ preference, activeId, palette }) {
  const effects = [];
  const disposers = [];
  const listeners = [];
  const registered = [];
  const overridden = [];
  const setThemeCalls = [];
  const themes = [
    { id: "light", colorScheme: "light", tokens: {} },
    { id: "dark", colorScheme: "dark", tokens: {} },
  ];
  const snapshot = () => ({
    preference,
    fontSize: 14,
    active: { id: activeId, colorScheme: palette, tokens: {} },
    themes: [...themes, ...registered.map((t) => ({ id: t.id, colorScheme: t.colorScheme }))],
    revision: registered.length + 1,
  });
  const ctx = {
    _setThemeCalls: setThemeCalls,
    _registered: registered,
    _overridden: overridden,
    _listeners: listeners,
    _effects: effects,
    theme: {
      getTheme: () => snapshot(),
      register: (def) => {
        registered.push(def);
        return () => {};
      },
      overrideTokens: (src, tokens) => {
        overridden.push({ src, tokens });
        return () => {};
      },
      setTheme: (id) => {
        setThemeCalls.push(id);
        preference = id;
        activeId = id;
        for (const fn of listeners) fn(snapshot());
      },
    },
    slots: {
      inject: (name, fn) => {
        ctx._slotName = name;
        ctx._slotResult = fn();
      },
      register: (spec, comp) => {
        ctx._slotSpec = spec;
        ctx._slotComp = comp;
        return () => {};
      },
    },
    locale: { register: () => () => {} },
    on: (event, fn) => {
      listeners.push(fn);
      return () => {};
    },
    effect: (fn, label) => {
      const dispose = fn();
      effects.push({ label, dispose });
      if (typeof dispose === "function") disposers.push({ label, dispose });
    },
  };
  return ctx;
}

// ── scenario 1: fresh boot (system preference, resolves light) ───────────────
{
  storage.clear();
  const ctx = makeCtx({ preference: "system", activeId: "light", palette: "light" });
  exports.apply(ctx);

  const reg = ctx._registered[0];
  check("registers codex-theme-v1", reg?.id === "codex-theme-v1", `id=${reg?.id}`);
  check("theme uses the light palette", reg?.colorScheme === "light", `colorScheme=${reg?.colorScheme}`);
  check(
    "registers the full token dictionary",
    reg?.tokens?.["--dsw-alias-bg-base"] === "var(--dsw-static-neutral-bluish-1000)" &&
      reg?.tokens?.["--dsw-static-neutral-bluish-1000"] === "#fffaf3" &&
      reg?.tokens?.["--shiki-token-keyword"] === "#286983" &&
    `tokens=${Object.keys(reg?.tokens ?? {}).length}`
  );
  check(
    "override layer carries light+dark pairs",
    ctx._overridden[0]?.tokens?.["--dsw-alias-bg-base"]?.light !== undefined &&
      ctx._overridden[0]?.tokens?.["--dsw-alias-bg-base"]?.dark !== undefined,
    `pairs=${Object.keys(ctx._overridden[0]?.tokens ?? {}).length}`
  );
  check("injects the deco stylesheet", document.getElementById("dsh_skin_blossom-style") !== null);
  check("appends the inert deco layer after the app root", (() => {
    const layer = document.getElementById("dsh_skin_blossom-deco");
    if (layer === null) return false;
    if (layer.children.length !== 19) return false;
    if (layer.attributes["aria-hidden"] !== "true") return false;
    return document.body.children.indexOf(layer) === document.body.children.length - 1;
  })(), `children=${document.getElementById("dsh_skin_blossom-deco")?.children.length}`);
  check("settings row targets the general item slot", ctx._slotName === "settings.general.item", `slot=${ctx._slotName}`);
  check("settings row id is namespaced", ctx._slotSpec?.id === "codex-skin", `id=${ctx._slotSpec?.id}`);
  check("claims the skin on the first snapshot (no timer)", ctx._setThemeCalls.includes("codex-theme-v1"), JSON.stringify(ctx._setThemeCalls));
}

// ── scenario 2: durable preference is already the built-in dark ──────────────
{
  storage.clear();
  const ctx = makeCtx({ preference: "dark", activeId: "dark", palette: "dark" });
  exports.apply(ctx);
  check("claims the skin over a stale built-in dark", ctx._setThemeCalls.includes("codex-theme-v1"), JSON.stringify(ctx._setThemeCalls));
}

// ── scenario 3: the user already chose in this tab ───────────────────────────
{
  storage.clear();
  storage.set("dsh_skin_blossom:user-choice", "1");
  const ctx = makeCtx({ preference: "light", activeId: "light", palette: "light" });
  exports.apply(ctx);
  check("respects the in-tab user choice", !ctx._setThemeCalls.includes("codex-theme-v1"), JSON.stringify(ctx._setThemeCalls));
}

// ── scenario 4: the row toggles the skin off and records the choice ──────────
{
  storage.clear();
  const ctx = makeCtx({ preference: "codex-theme-v1", activeId: "codex-theme-v1", palette: "dark" });
  exports.apply(ctx);
  const row = ctx._slotComp({ ctx });
  row.children[1].props.onClick();
  check("row switches back to built-in light", ctx._setThemeCalls.at(-1) === "light", JSON.stringify(ctx._setThemeCalls.slice(-1)));
  check("row records the user choice", storage.get("dsh_skin_blossom:user-choice") === "1");

  // A second apply in the same tab must not steal the choice back.
  const ctx2 = makeCtx({ preference: "dark", activeId: "dark", palette: "dark" });
  exports.apply(ctx2);
  check("no re-claim after the user opted out", !ctx2._setThemeCalls.includes("codex-theme-v1"), JSON.stringify(ctx2._setThemeCalls));
}

// ── scenario 5: unloading the plugin leaves no DOM behind ─────────────────────
{
  storage.clear();
  for (const node of [...nodes]) node.remove();
  const ctx = makeCtx({ preference: "codex-theme-v1", activeId: "codex-theme-v1", palette: "light" });
  exports.apply(ctx);
  const styles = () => document.getElementById("dsh_skin_blossom-style");
  const layer = () => document.getElementById("dsh_skin_blossom-deco");
  check("deco installed before teardown", styles() !== null && layer() !== null);
  for (const { dispose } of ctx._effects) if (typeof dispose === "function") dispose();
  check("teardown removes the stylesheet and the layer", styles() === null && layer() === null);
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length > 0) process.exit(1);
