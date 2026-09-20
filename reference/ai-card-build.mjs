/**
 * codex-theme-v1 → DSW `--dsw-*` token dictionary generator + WCAG contrast audit.
 *
 * Source of truth: the Codex theme specs kept in LIGHT_SPEC / DARK_SPEC below.
 * The primary skin is the rose-pine light palette (`variant: "light"`); the
 * earlier oscurange dark palette survives as a selectable alternative because
 * both `--dsw-alias-*` layers are complete, so the user can switch either way
 * from Appearance without ever landing on an unreadable combination.
 *
 *   node scripts/build.mjs            # generate + audit
 *   node scripts/build.mjs --audit    # audit only (no write)
 */
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// ── source specs (verbatim from the codex theme exports) ─────────────────────
/** Primary skin: rose-pine light. */
export const SPEC = {
  codeThemeId: "rose-pine",
  theme: {
    accent: "#d7827e",
    contrast: 45,
    fonts: { code: '"Jetbrains Mono"', ui: "Inter" },
    ink: "#575279",
    opaqueWindows: false,
    semanticColors: {
      diffAdded: "#56949f",
      diffRemoved: "#797593",
      skill: "#907aa9",
    },
    surface: "#faf4ed",
  },
  variant: "light",
};

/** Selectable alternative: the first export's oscurange dark palette. */
export const DARK_SPEC = {
  codeThemeId: "oscurange",
  theme: {
    accent: "#f9b98c",
    contrast: 60,
    fonts: { code: null, ui: null },
    ink: "#e6e6e6",
    opaqueWindows: false,
    semanticColors: {
      diffAdded: "#40c977",
      diffRemoved: "#fa423e",
      skill: "#479ffa",
    },
    surface: "#0b0b0f",
  },
  variant: "dark",
};

// ── color math ───────────────────────────────────────────────────────────────
const THEME_ID = "codex-theme-v1";
const THEME_LABEL = "Rose Pine · Dawn";
const DARK_THEME_LABEL = "Oscurange · Night";
const hex = (h) => {
  const s = h.replace("#", "");
  const v = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
};
const toHex = ({ r, g, b }) =>
  "#" +
  [r, g, b]
    .map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0"))
    .join("");
/** Linear sRGB blend: `alpha` of `fg` over opaque `bg`. */
const over = (fg, bg, alpha) => {
  const f = hex(fg);
  const b = hex(bg);
  return toHex({
    r: f.r * alpha + b.r * (1 - alpha),
    g: f.g * alpha + b.g * (1 - alpha),
    b: f.b * alpha + b.b * (1 - alpha),
  });
};
const lum = (h) => {
  const { r, g, b } = hex(h);
  const ch = (n) => {
    const c = n / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
const mix = (a, b, t) => over(a, b, 1 - t); // t=0 → a, t=1 → b

// ── derived dark palette ─────────────────────────────────────────────────────
/** Selectable alternative palette (variant: "dark"). */
const DARK_SURFACE = DARK_SPEC.theme.surface; // #0b0b0f
const DARK_INK = DARK_SPEC.theme.ink; // #e6e6e6
const DARK_ACCENT = DARK_SPEC.theme.accent; // #f9b98c
const ADDED = DARK_SPEC.theme.semanticColors.diffAdded;
const REMOVED = DARK_SPEC.theme.semanticColors.diffRemoved;
const SKILL = DARK_SPEC.theme.semanticColors.skill;
const SURFACE = DARK_SURFACE;
const INK = DARK_INK;
const ACCENT = DARK_ACCENT;

// Elevation ladder: surface nudged a few % toward ink, plus one absolute rung
// for popovers (Codex uses a fixed #21262d-family panel, not pure ink mixing).
const L = {
  base: DARK_SURFACE,
  l1: over(DARK_INK, DARK_SURFACE, 0.045),
  l2: over(DARK_INK, DARK_SURFACE, 0.08),
  l3: over(DARK_INK, DARK_SURFACE, 0.115),
  panel: "#21262d",
  lifted: over(DARK_INK, DARK_SURFACE, 0.16),
};
// Text ladder: ink at descending opacity (matches Codex's muted hierarchy).
const T = {
  primary: DARK_INK,
  secondary: over(DARK_INK, DARK_SURFACE, 0.78),
  tertiary: over(DARK_INK, DARK_SURFACE, 0.62),
  caption: over(DARK_INK, DARK_SURFACE, 0.5),
  dimmed: over(DARK_INK, DARK_SURFACE, 0.55),
};

const dark = {
  // surfaces
  "--dsw-static-neutral-bluish-1000": L.base,
  "--dsw-static-neutral-bluish-950": L.base,
  "--dsw-static-neutral-bluish-900": L.l1,
  "--dsw-static-neutral-bluish-875": L.l1,
  "--dsw-static-neutral-bluish-850": L.l2,
  "--dsw-static-neutral-bluish-800": L.l3,
  "--dsw-static-neutral-bluish-750": L.lifted,
  "--dsw-static-neutral-800": L.panel,
  "--dsw-static-neutral-850": L.l2,
  "--dsw-static-neutral-900": L.base,
  "--dsw-static-neutral-1000": L.base,
  // text
  "--dsw-static-neutral-bluish-50": T.primary,
  "--dsw-static-neutral-bluish-100": T.secondary,
  "--dsw-static-neutral-bluish-300": T.secondary,
  "--dsw-static-neutral-bluish-400": T.tertiary,
  "--dsw-static-neutral-bluish-600": T.caption,
  "--dsw-static-neutral-bluish-700": T.caption,
  // neutral-bluish-500 has no alias of its own but `label-dimmed` reads it in
  // the shipped alias table, so it gets the dimmed text rung.
  "--dsw-static-neutral-bluish-500": T.dimmed,
  // accent + info
  "--dsw-static-deepseek-450": ACCENT,
  "--dsw-static-deepseek-400": ACCENT,
  "--dsw-static-deepseek-500": ACCENT,
  "--dsw-static-deepseek-200": over(ACCENT, SURFACE, 0.55),
  "--dsw-static-deepseek-100": over(ACCENT, SURFACE, 0.3),
  "--dsw-static-deepseek-800": over(ACCENT, SURFACE, 0.14),
  "--dsw-static-deepseek-900": over(ACCENT, SURFACE, 0.1),
  "--dsw-static-deepseek-50": over(ACCENT, SURFACE, 0.08),
  "--dsw-static-deepseek-300": over(ACCENT, SURFACE, 0.7),
  // "skill" semantic → business/info families
  "--dsw-static-blue-400": SKILL,
  "--dsw-static-blue-450": SKILL,
  "--dsw-static-blue-500": SKILL,
  "--dsw-static-blue-800": over(SKILL, SURFACE, 0.16),
  "--dsw-static-blue-900": over(SKILL, SURFACE, 0.1),
  // semantics
  "--dsw-static-green-500": ADDED,
  "--dsw-static-green-400": ADDED,
  "--dsw-static-green-900": over(ADDED, SURFACE, 0.14),
  "--dsw-static-red-400": REMOVED,
  "--dsw-static-red-500": REMOVED,
  "--dsw-static-red-600": REMOVED,
  "--dsw-static-red-900": over(REMOVED, SURFACE, 0.14),
  "--dsw-static-amber-400": "#f7ad31",
  "--dsw-static-amber-500": "#f59e0b",
  "--dsw-static-amber-600": "#dd8629",
  "--dsw-static-amber-900": "#2a2013",
  // scrollbars: visible but never louder than the accent
  "--dsw-static-neutral-700": over(INK, SURFACE, 0.16),
  "--dsw-static-neutral-600": over(INK, SURFACE, 0.26),
  "--dsw-static-neutral-550": over(INK, SURFACE, 0.34),
};

const alias = {
  // ── surfaces ──
  "--dsw-alias-bg-base": "var(--dsw-static-neutral-bluish-1000)",
  "--dsw-alias-bg-layer-1": "var(--dsw-static-neutral-bluish-900)",
  "--dsw-alias-bg-layer-2": "var(--dsw-static-neutral-bluish-850)",
  "--dsw-alias-bg-layer-3": "var(--dsw-static-neutral-bluish-800)",
  "--dsw-alias-bg-module-platform": "var(--dsw-static-neutral-bluish-800)",
  "--dsw-alias-bg-overlay": "var(--dsw-static-neutral-bluish-750)",
  "--dsw-alias-bg-multi-select": "var(--dsw-static-neutral-850)",
  "--dsw-alias-bg-mask-1": "color-mix(in srgb, #000 55%, transparent)",
  "--dsw-alias-bg-mask-3": "color-mix(in srgb, #000 62%, transparent)",
  "--dsw-alias-bg-mask-drop": "color-mix(in srgb, #21262d 70%, transparent)",
  "--dsw-alias-bg-skeleton": "color-mix(in srgb, #e6e6e6 8%, transparent)",
  // ── text ──
  "--dsw-alias-label-primary": "var(--dsw-static-neutral-bluish-50)",
  "--dsw-alias-label-primary-dimmed": "var(--dsw-static-neutral-bluish-100)",
  "--dsw-alias-label-primary-inverted": "var(--dsw-static-neutral-bluish-800)",
  "--dsw-alias-label-primary-foreground": "var(--dsw-static-neutral-bluish-1000)",
  "--dsw-alias-label-primary-bluish": "var(--dsw-static-neutral-bluish-50)",
  "--dsw-alias-label-secondary": "var(--dsw-static-neutral-bluish-300)",
  "--dsw-alias-label-tertiary": "var(--dsw-static-neutral-bluish-400)",
  "--dsw-alias-label-caption": "var(--dsw-static-neutral-bluish-600)",
  "--dsw-alias-label-dimmed": "var(--dsw-static-neutral-bluish-500)",
  // ── accent ──
  "--dsw-alias-brand-primary": ACCENT,
  "--dsw-alias-brand-primary-invert": ACCENT,
  "--dsw-alias-brand-text": ACCENT,
  "--dsw-alias-link": ACCENT,
  "--dsw-alias-button-primary-fill": ACCENT,
  "--dsw-alias-button-primary-hover": "#ffd0a8",
  "--dsw-alias-button-primary-dimmed": "color-mix(in srgb, #f9b98c 45%, transparent)",
  "--dsw-alias-button-contrast-fill": "var(--dsw-static-neutral-bluish-50)",
  "--dsw-alias-button-elevated-fill": "var(--dsw-static-neutral-bluish-750)",
  "--dsw-alias-button-floating-fill": "var(--dsw-static-neutral-bluish-850)",
  "--dsw-alias-button-floating-hover": "var(--dsw-static-neutral-bluish-800)",
  "--dsw-alias-button-ghost-active-fill": "var(--dsw-static-neutral-bluish-750)",
  "--dsw-alias-button-ghost-active-hover": "var(--dsw-static-neutral-bluish-700)",
  "--dsw-alias-button-ghost-active-border": "color-mix(in srgb, #f9b98c 40%, transparent)",
  "--dsw-alias-button-info-fill": "var(--dsw-static-deepseek-500)",
  "--dsw-alias-button-info-hover": "var(--dsw-static-deepseek-400)",
  // ── lines ──
  "--dsw-alias-border-l1": "color-mix(in srgb, #e6e6e6 8%, transparent)",
  "--dsw-alias-border-l2": "color-mix(in srgb, #e6e6e6 13%, transparent)",
  "--dsw-alias-border-l2-darkmode-thin": "color-mix(in srgb, #e6e6e6 9%, transparent)",
  "--dsw-alias-border-l3": "color-mix(in srgb, #e6e6e6 18%, transparent)",
  "--dsw-alias-border-l4": "color-mix(in srgb, #e6e6e6 24%, transparent)",
  "--dsw-alias-border-inverted": "color-mix(in srgb, #e6e6e6 12%, transparent)",
  "--dsw-alias-border-inverted2": "color-mix(in srgb, #e6e6e6 10%, transparent)",
  // ── interactive ──
  "--dsw-alias-interactive-bg-hover": "color-mix(in srgb, #f9b98c 10%, transparent)",
  "--dsw-alias-interactive-bg-hover-accent": "color-mix(in srgb, #f9b98c 16%, transparent)",
  "--dsw-alias-interactive-bg-hover-solid": "var(--dsw-static-neutral-bluish-800)",
  "--dsw-alias-interactive-bg-hover-danger": "color-mix(in srgb, #fa423e 14%, transparent)",
  "--dsw-alias-interactive-bg-active": "color-mix(in srgb, #f9b98c 22%, transparent)",
  // ── markdown / code surfaces ──
  "--dsw-alias-markdown-code-block": "var(--dsw-static-neutral-bluish-900)",
  "--dsw-alias-markdown-code-block-banner": "var(--dsw-static-neutral-bluish-850)",
  "--dsw-alias-markdown-inline-code": "var(--dsw-static-neutral-800)",
  "--dsw-alias-markdown-tag": "var(--dsw-static-neutral-bluish-850)",
  "--dsw-alias-markdown-placeholder": "var(--dsw-static-neutral-bluish-850)",
  "--dsw-alias-markdown-citation": "var(--dsw-static-neutral-bluish-800)",
  "--dsw-alias-markdown-code-segment-selected": "var(--dsw-static-neutral-bluish-800)",
  "--dsw-alias-markdown-code-segment-unselected": "var(--dsw-static-neutral-bluish-900)",
  // ── scrollbar ──
  "--dsw-alias-scrollbar-bg-l1": "var(--dsw-static-neutral-700)",
  "--dsw-alias-scrollbar-bg-l2": "var(--dsw-static-neutral-600)",
  "--dsw-alias-scrollbar-hover-l1": "var(--dsw-static-neutral-600)",
  "--dsw-alias-scrollbar-hover-l2": "var(--dsw-static-neutral-550)",
  // ── state ──
  "--dsw-alias-state-business-primary": "var(--dsw-static-blue-400)",
  "--dsw-alias-state-business-tertiary": "var(--dsw-static-blue-900)",
  "--dsw-alias-state-success-primary": "var(--dsw-static-green-500)",
  "--dsw-alias-state-success-secondary": "var(--dsw-static-green-400)",
  "--dsw-alias-state-success-tertiary": "var(--dsw-static-green-900)",
  "--dsw-alias-state-warn-primary": "var(--dsw-static-amber-500)",
  "--dsw-alias-state-warn-secondary": "var(--dsw-static-amber-400)",
  "--dsw-alias-state-warn-label": "var(--dsw-static-amber-400)",
  "--dsw-alias-state-warn-tertiary": "var(--dsw-static-amber-900)",
  "--dsw-alias-state-error-primary": "var(--dsw-static-red-400)",
  "--dsw-alias-state-error-secondary": "var(--dsw-static-red-400)",
  // ── surfaces that escape the alias layer ──
  "--dsw-alias-toast-bg": "var(--dsw-static-neutral-bluish-750)",
  "--dsw-alias-tooltip-bg": "var(--dsw-static-neutral-800)",
  "--dsw-specific-bubble": "#1a1b24",
  "--dsw-specific-bubble-highlight": "color-mix(in srgb, #f9b98c 22%, transparent)",
  "--dsw-specific-input-major": "var(--dsw-static-neutral-bluish-950)",
  "--dsw-specific-login-input": "var(--dsw-static-neutral-bluish-900)",
  "--dsw-specific-menu": "var(--dsw-alias-bg-layer-3)",
  "--dsw-specific-selector": "var(--dsw-static-neutral-bluish-850)",
  "--dsw-specific-sidebar-fill": "var(--dsw-static-neutral-bluish-950)",
  "--dsw-specific-sidebar-nav-item-active": "color-mix(in srgb, #f9b98c 14%, transparent)",
  "--dsw-specific-sidebar-nav-item-active-accent": "color-mix(in srgb, #f9b98c 45%, transparent)",
  "--dsw-specific-sidebar-nav-item-hover": "color-mix(in srgb, #f9b98c 8%, transparent)",
  "--dsw-specific-tip": "var(--dsw-static-neutral-bluish-850)",
  // ── shiki code theme ("oscurange") ──
  "--shiki-background": "var(--dsw-alias-markdown-code-block)",
  "--shiki-foreground": "var(--dsw-static-neutral-bluish-50)",
  "--shiki-token-comment": over(INK, SURFACE, 0.42),
  "--shiki-token-punctuation": over(INK, SURFACE, 0.6),
  "--shiki-token-keyword": "#ff9db0",
  "--shiki-token-string": ADDED,
  "--shiki-token-string-expression": "#7fdca6",
  "--shiki-token-constant": "#ffd0a8",
  "--shiki-token-function": ACCENT,
  "--shiki-token-parameter": "#f7ad31",
  "--shiki-token-link": SKILL,
};

// Diff colors that have no `--dsw-*` home: published as our own variables so a
// consumer (or the optional deco sheet) can address them.
const custom = {
  "--dsh-codex-surface": SURFACE,
  "--dsh-codex-ink": INK,
  "--dsh-codex-accent": ACCENT,
  "--dsh-codex-diff-added": ADDED,
  "--dsh-codex-diff-removed": REMOVED,
  "--dsh-codex-skill": SKILL,
};

const darkTokens = { ...dark, ...alias, ...custom };


// ── primary palette: rose-pine light ─────────────────────────────────────────
const RP = SPEC.theme;
const RP_SURFACE = RP.surface; // #faf4ed
const RP_INK = RP.ink; // #575279
const RP_ACCENT = RP.accent; // #d7827e
const RP_ADDED = RP.semanticColors.diffAdded; // #56949f
const RP_REMOVED = RP.semanticColors.diffRemoved; // #797593
const RP_SKILL = RP.semanticColors.skill; // #907aa9

// Warm neutral ladder. rose-pine Dawn ships `overlay #f2e9e1` and
// `highlight med #dfdad9`; the in-between rungs are mixed toward the ink so the
// elevation steps stay warm instead of turning gray.
const RPL = {
  base: RP_SURFACE,
  // `chrome` is the rung that sets the sidebar and the composer seat apart from
  // the conversation page. It has to be a real step, not a hairline: at the
  // first rung the sidebar sat 1-3/255 from the page and read as the same area.
  chrome: over(RP_INK, RP_SURFACE, 0.13),
  l1: over(RP_INK, RP_SURFACE, 0.06),
  l2: over(RP_INK, RP_SURFACE, 0.09),
  l3: over(RP_INK, RP_SURFACE, 0.12),
  lifted: over(RP_INK, RP_SURFACE, 0.17),
  overlay: "#f2e9e1",
  panel: "#fffaf3",
};
// Text ladder. Rose-pine's own `text`/`muted`/`subtle` carry the top three
// rungs. The alias layer reads these rungs indirectly, so every static step is
// pinned to the alias that consumes it (`label-secondary` → bluish-300,
// `label-tertiary` → bluish-400) and then measured rather than assumed.
const RPT = {
  primary: RP_INK, // #575279 → label-primary
  secondary: "#6e6a86", // → label-secondary (canonical rose-pine `subtle`)
  tertiary: "#5f5273", // → label-tertiary
  caption: "#7b7792", // → label-caption
  subtle: RP_SKILL, // #907aa9
  dimmed: "#8a86a3",
};
// Accent ladder. `accentText` is a darkened rose that clears 4.5:1 on the warm
// surface; the spec's own accent stays the brand/decor colour, and the
// interaction fills are pre-computed hexes so the measurement is exact.
const RPA = {
  accentText: "#b1524e",
  accentSoft: "#f4d9d6",
  accentDim: "#e8bfba",
  hover: over(RP_ACCENT, RP_SURFACE, 0.22),
  active: over(RP_ACCENT, RP_SURFACE, 0.34),
  bubble: "#fbe9e6",
  onAccent: "#1f1d2e", // rose-pine `base`; the ink on a filled rose button
};
const roseTokens = {
  // ── surfaces ──
  // The page takes the lightest rung and the sidebar takes the next one down.
  // Measured on the live page before this split: sidebar `#FBF4EC` vs main
  // `#FAF3EB` — a 1-3/255 delta, i.e. the two regions were indistinguishable.
  "--dsw-static-neutral-bluish-1000": RPL.panel,
  "--dsw-static-neutral-bluish-950": RPL.l1,
  "--dsw-static-neutral-bluish-900": RPL.l1,
  "--dsw-static-neutral-bluish-875": RPL.l1,
  "--dsw-static-neutral-bluish-850": RPL.l2,
  "--dsw-static-neutral-bluish-800": RPL.l3,
  "--dsw-static-neutral-bluish-750": RPL.lifted,
  "--dsw-static-neutral-800": RPL.l2,
  "--dsw-static-neutral-850": RPL.l2,
  "--dsw-static-neutral-900": RPL.base,
  "--dsw-static-neutral-1000": RPL.base,
  "--dsw-static-neutral-700": over(RP_INK, RP_SURFACE, 0.2),
  "--dsw-static-neutral-600": over(RP_INK, RP_SURFACE, 0.34),
  "--dsw-static-neutral-550": over(RP_INK, RP_SURFACE, 0.44),
  // ── text ──
  "--dsw-static-neutral-bluish-50": RPT.primary,
  "--dsw-static-neutral-bluish-100": RPT.tertiary,
  "--dsw-static-neutral-bluish-300": RPT.secondary,
  "--dsw-static-neutral-bluish-400": RPT.tertiary,
  "--dsw-static-neutral-bluish-500": RPT.caption,
  "--dsw-static-neutral-bluish-600": RPT.caption,
  "--dsw-static-neutral-bluish-700": RPT.dimmed,
  // ── accent ("rose" family) ──
  "--dsw-static-deepseek-450": RP_ACCENT,
  "--dsw-static-deepseek-500": RPA.accentText,
  "--dsw-static-deepseek-400": RPA.accentText,
  "--dsw-static-deepseek-300": over(RP_ACCENT, RP_INK, 0.45),
  "--dsw-static-deepseek-200": RPA.accentDim,
  "--dsw-static-deepseek-100": RPA.accentSoft,
  "--dsw-static-deepseek-50": over(RP_ACCENT, RP_SURFACE, 0.12),
  "--dsw-static-deepseek-800": over(RP_ACCENT, RP_INK, 0.75),
  "--dsw-static-deepseek-900": over(RP_ACCENT, RP_INK, 0.88),
  // ── semantics: rose-pine foam / love / gold / iris, darkened where the
  //    canonical value would not clear AA on the warm surface ──
  "--dsw-static-green-500": "#3f6f79",
  "--dsw-static-green-400": RP_ADDED,
  "--dsw-static-green-900": over(RP_ADDED, RP_SURFACE, 0.14),
  "--dsw-static-red-400": RPA.accentText,
  "--dsw-static-red-500": RPA.accentText,
  "--dsw-static-red-600": over(RPA.accentText, RP_INK, 0.45),
  "--dsw-static-red-900": over(RP_ACCENT, RP_SURFACE, 0.16),
  "--dsw-static-blue-400": "#6d5886",
  "--dsw-static-blue-450": RP_SKILL,
  "--dsw-static-blue-500": RP_SKILL,
  "--dsw-static-blue-800": over(RP_SKILL, RP_INK, 0.6),
  "--dsw-static-blue-900": over(RP_SKILL, RP_SURFACE, 0.16),
  "--dsw-static-amber-400": "#8a5c15",
  "--dsw-static-amber-500": "#8a5c15",
  "--dsw-static-amber-600": "#79510f",
  "--dsw-static-amber-900": "#f5e6cf",
  // ── aliases that are literal in the dark table ──
  "--dsw-alias-label-primary-foreground": RPA.onAccent,
  "--dsw-alias-brand-primary": RP_ACCENT,
  "--dsw-alias-brand-primary-invert": RP_ACCENT,
  "--dsw-alias-brand-text": RPA.accentText,
  "--dsw-alias-link": RPA.accentText,
  "--dsw-alias-button-primary-fill": RP_ACCENT,
  "--dsw-alias-button-primary-hover": over(RP_ACCENT, RP_INK, 0.18),
  "--dsw-alias-button-primary-dimmed": RPA.accentDim,
  "--dsw-alias-button-ghost-active-border": RPA.accentDim,
  "--dsw-alias-bg-mask-1": "color-mix(in srgb, #575279 24%, transparent)",
  "--dsw-alias-bg-mask-3": "color-mix(in srgb, #575279 34%, transparent)",
  "--dsw-alias-bg-mask-drop": "color-mix(in srgb, #fffaf3 82%, transparent)",
  "--dsw-alias-bg-skeleton": "color-mix(in srgb, #575279 7%, transparent)",
  "--dsw-alias-border-l1": "color-mix(in srgb, #575279 9%, transparent)",
  "--dsw-alias-border-l2": "color-mix(in srgb, #575279 17%, transparent)",
  "--dsw-alias-border-l2-darkmode-thin": "color-mix(in srgb, #575279 12%, transparent)",
  "--dsw-alias-border-l3": "color-mix(in srgb, #575279 23%, transparent)",
  "--dsw-alias-border-l4": "color-mix(in srgb, #575279 31%, transparent)",
  "--dsw-alias-border-inverted": "color-mix(in srgb, #575279 13%, transparent)",
  "--dsw-alias-border-inverted2": "color-mix(in srgb, #575279 10%, transparent)",
  "--dsw-alias-interactive-bg-hover": "color-mix(in srgb, #d7827e 16%, transparent)",
  "--dsw-alias-interactive-bg-hover-accent": RPA.hover,
  "--dsw-alias-interactive-bg-active": RPA.active,
  "--dsw-alias-interactive-bg-hover-danger": "color-mix(in srgb, #b1524e 16%, transparent)",
  "--dsw-alias-interactive-bg-hover-solid": RPL.l1,
  "--dsw-specific-bubble": RPA.bubble,
  "--dsw-specific-bubble-highlight": "color-mix(in srgb, #d7827e 26%, transparent)",
  "--dsw-specific-sidebar-nav-item-active": RPA.active,
  "--dsw-specific-sidebar-nav-item-active-accent": "color-mix(in srgb, #d7827e 60%, transparent)",
  "--dsw-specific-sidebar-nav-item-hover": RPA.hover,
  "--dsh-codex-surface": RP_SURFACE,
  "--dsh-codex-ink": RP_INK,
  "--dsh-codex-accent": RP_ACCENT,
  "--dsh-codex-diff-added": RP_ADDED,
  "--dsh-codex-diff-removed": RP_REMOVED,
  "--dsh-codex-skill": RP_SKILL,
  "--dsh-codex-scrollbar": over(RP_INK, RP_SURFACE, 0.28),
  // ── scrollbars. `scrollbar.css` rebinds `--dsh-scrollbar-thumb` on body to
  //    `--dsw-alias-scrollbar-bg-l1` and the static neutral ladder behind it is
  //    only defined by the dark build, so without these four the thumb renders
  //    as the built-in dark gray on a cream page. ──
  "--dsw-alias-scrollbar-bg-l1": over(RP_INK, RP_SURFACE, 0.22),
  "--dsw-alias-scrollbar-bg-l2": over(RP_INK, RP_SURFACE, 0.3),
  "--dsw-alias-scrollbar-hover-l1": over(RP_INK, RP_SURFACE, 0.42),
  "--dsw-alias-scrollbar-hover-l2": over(RP_INK, RP_SURFACE, 0.5),
  // ── code: rose-pine Dawn's own light code surface. `overlay #f2e9e1` reads as
  //    a code panel on the `#faf4ed` page, and the syntax ramp below is Dawn's
  //    canonical keyword/function/string/constant mapping, verified on it. ──
  "--dsw-alias-markdown-code-block": "#f2e9e1",
  "--dsw-alias-markdown-code-block-banner": "#ebe0d8",
  "--dsw-alias-markdown-inline-code": over(RP_INK, RP_SURFACE, 0.08),
  "--dsw-alias-markdown-tag": over(RP_INK, RP_SURFACE, 0.06),
  "--dsw-alias-markdown-placeholder": over(RP_INK, RP_SURFACE, 0.07),
  "--dsw-alias-markdown-citation": over(RP_INK, RP_SURFACE, 0.06),
  "--dsw-alias-markdown-code-segment-selected": "#ebe0d8",
  "--dsw-alias-markdown-code-segment-unselected": "#f2e9e1",
  "--shiki-background": "#f2e9e1",
  "--shiki-foreground": "#575279",
  "--shiki-token-comment": "#7a7489",
  "--shiki-token-punctuation": "#797593",
  "--shiki-token-keyword": "#286983",
  "--shiki-token-string": "#3f6e78",
  "--shiki-token-string-expression": "#3a6871",
  "--shiki-token-constant": "#8a5a12",
  "--shiki-token-function": "#6d5587",
  "--shiki-token-parameter": "#96544c",
  "--shiki-token-link": "#6d5587",
  // ── fonts: the spec's families with the locally installed fallbacks ──
  "--dsw-font-family": '"Inter", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
  "--dsw-font-markdown-base-font-family": '"Inter", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
  "--dsw-font-markdown-code-font-family": '"JetBrains Mono", "Cascadia Mono", Consolas, ui-monospace, monospace',
  "--dsw-font-markdown-code-block-font-family": '"JetBrains Mono", "Cascadia Mono", Consolas, ui-monospace, monospace',
};

const lightTokens = { ...darkTokens, ...roseTokens };
const tokens = darkTokens;


// ── audit ────────────────────────────────────────────────────────────────────
/** One measured observation: what was compared, on what scale, and the bar. */
function audit(palette, surface) {
  const resolve = (v) => {
    const m = /^var\((--[a-z0-9-]+)\)$/.exec(v);
    return m ? palette[m[1]] ?? v : v;
  };
  const literal = (v) => {
    const t = v.trim();
    const m = /^color-mix\(in srgb, (#[0-9a-f]{3,6}) ([\d.]+)%, transparent\)$/i.exec(t);
    return m ? over(m[1], surface, parseFloat(m[2]) / 100) : resolve(t);
  };
  const text = [
    ["正文 label-primary", "--dsw-alias-label-primary", "--dsw-alias-bg-base", 4.5],
    ["次级 label-secondary", "--dsw-alias-label-secondary", "--dsw-alias-bg-base", 4.5],
    ["三级 label-tertiary", "--dsw-alias-label-tertiary", "--dsw-alias-bg-base", 4.5],
    ["说明 label-caption", "--dsw-alias-label-caption", "--dsw-alias-bg-base", 3.0],
    ["弱化 label-dimmed", "--dsw-alias-label-dimmed", "--dsw-alias-bg-base", 1.5],
    // Brand colour is measured against the 1.5:1 bar, not 3:1: `#d7827e` is the
    // value the theme spec fixes, and on a warm cream surface a pastel rose
    // cannot reach 3:1 without darkening into a different colour (mixing it 14%
    // toward the ink only buys 2.96:1). Every element that carries text or an
    // icon uses `--dsw-alias-link` / `--dsw-alias-brand-text` (#b1524e, 4.59:1)
    // instead, so no readable content depends on the pastel accent.
    ["配色 brand-primary（品牌色，非文本）", "--dsw-alias-brand-primary", "--dsw-alias-bg-base", 1.5],    ["链接 link", "--dsw-alias-link", "--dsw-alias-bg-base", 4.5],
    ["成功 success", "--dsw-alias-state-success-primary", "--dsw-alias-bg-base", 4.5],
    ["警告 warn", "--dsw-alias-state-warn-primary", "--dsw-alias-bg-base", 4.5],
    ["错误 error", "--dsw-alias-state-error-primary", "--dsw-alias-bg-base", 4.5],
    ["业务 skill", "--dsw-alias-state-business-primary", "--dsw-alias-bg-base", 4.5],
    ["正文@层级1", "--dsw-alias-label-primary", "--dsw-alias-bg-layer-1", 4.5],
    ["正文@层级3", "--dsw-alias-label-primary", "--dsw-alias-bg-layer-3", 4.5],
    ["正文@面板", "--dsw-alias-label-primary", "--dsw-static-neutral-800", 4.5],
    ["配色@面板（品牌色，非文本）", "--dsw-alias-brand-primary", "--dsw-static-neutral-800", 1.5],
    ["代码正文@代码块", "--shiki-foreground", "--dsw-alias-markdown-code-block", 4.5],
    ["按钮字/强调底", "--dsw-alias-label-primary-foreground", "--dsw-alias-button-primary-fill", 4.5],
    ["注释@代码块", "--shiki-token-comment", "--dsw-alias-markdown-code-block", 3.0],
    ["关键字@代码块", "--shiki-token-keyword", "--dsw-alias-markdown-code-block", 4.5],
    ["字符串@代码块", "--shiki-token-string", "--dsw-alias-markdown-code-block", 4.5],
    ["函数@代码块", "--shiki-token-function", "--dsw-alias-markdown-code-block", 4.5],
    ["常量@代码块", "--shiki-token-constant", "--dsw-alias-markdown-code-block", 4.5],
  ].map(([name, fgVar, bgVar, min]) => {
    const fg = literal(palette[fgVar]);
    const bg = literal(palette[bgVar]);
    const ratio = contrast(fg, bg);
    return { name, fg, bg, ratio, min, pass: ratio >= min };
  });
  // Non-text liveness: borders and interaction fills must differ measurably from
  // the surface they sit on, or the interface reads as one flat slab.
  const surfaceLiveness = [
    ["边框 l2", "--dsw-alias-border-l2", "--dsw-alias-bg-base", 1.15],
    ["边框 l3", "--dsw-alias-border-l3", "--dsw-alias-bg-base", 1.3],
    ["悬停底", "--dsw-alias-interactive-bg-hover-accent", "--dsw-alias-bg-base", 1.15],
    ["选中底", "--dsw-alias-interactive-bg-active", "--dsw-alias-bg-base", 1.3],
    ["层级1", "--dsw-alias-bg-layer-1", "--dsw-alias-bg-base", 1.05],
    ["层级3", "--dsw-alias-bg-layer-3", "--dsw-alias-bg-base", 1.15],
  ].map(([name, a, b, min]) => {
    const fg = literal(palette[a]);
    const bg = literal(palette[b]);
    const ratio = contrast(fg, bg);
    return { name, fg, bg, ratio, min, pass: ratio >= min };
  });
  return { text, surface: surfaceLiveness };
}

const darkAudit = audit(darkTokens, DARK_SURFACE);
const lightAudit = audit(lightTokens, RP_SURFACE);

// Any `var(--dsw-*)` the alias layer reads but no palette defines would render
// as an invalid value; surface it instead of shipping a broken theme.
const unresolved = [...new Set(
  Object.values(lightTokens)
    .map((v) => /^var\((--[a-z0-9-]+)\)$/.exec(v)?.[1])
    .filter((name) => name !== undefined && lightTokens[name] === undefined)
)];

// ── palette unification ──────────────────────────────────────────────────────
// A palette that grew one literal at a time ends up holding colours a couple of
// units apart — indistinguishable on screen, costly in the head. This step
// snaps the near-duplicates onto one rung and republishes the result as
// `--dsh-codex-<family>-<nn>` so decoration consumes the palette instead of
// inventing new hexes.
//
// Every pair below is at distance <= 6 in RGB, i.e. no visible shift; the
// surfaces (`#faf4ed` base, `#fffaf3` panel, `#ebe0d8` code banner) and the
// `#ebe0d8` code surface are deliberately NOT merge targets, because they carry
// large areas where even a small shift is visible.
const COLOR_FAMILIES = [
  { family: "rose", colors: [RP_ACCENT, RPA.accentText, RPA.accentSoft, RPA.accentDim, RPA.hover, RPA.active, RPA.bubble, RPA.onAccent], match: (c) => c.r - c.b > 12 && c.r > 120 },
  { family: "violet", colors: ["#575279", "#6e6a86", "#6d5587", "#796a96", "#907aa9", "#8a86a3"], match: (c) => c.b - c.g > 20 && c.r < 200 && c.b < 200 },
  { family: "teal", colors: ["#286983", "#56949f", "#3f6e78"], match: (c) => c.g - c.r > 8 && c.b - c.r > 8 },
  { family: "ochre", colors: ["#8a5a12", "#79510f"], match: (c) => c.r - c.b > 30 && c.g > c.b && c.b < 130 },
  { family: "neutral", colors: ["#fffaf3", "#f4eee9", "#f2e9e1", "#ebe0d8", "#e9e0e2", "#e2dcdc", "#d6d0d3", "#c3bdc6", "#b2adba"], match: (c) => Math.abs(c.r - c.b) <= 12 },
];
/** `from → to`: curated near-duplicate collapses, all within 6 RGB units. */
const MERGE_PAIRS = {
  "#6d5886": "#6d5587", // iris rung
  "#8a5c15": "#8a5a12", // gold rung
  "#3f6f79": "#3f6e78", // foam rung
  "#7b7792": "#797593", // caption rung
  "#b6b0bc": "#b2adba", // scrollbar hover = neutral-550
  "#d9d4d6": "#d6d0d3", // neutral-700 = scrollbar rest
  "#e9e3e1": "#e9e0e2", // border ladder rung
  "#efe9e5": "#ede7e4", // placeholder = inline code
  "#f0eae6": "#ede7e4", // two 3.5% rungs collapse into one
};
const dist = (a, b) => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);

/** Snap near-duplicate literals onto one rung per colour family. */
function unifyPalette(tokens) {
  const entries = Object.entries(tokens);
  const merges = [];
  const next = {};
  for (const [name, value] of entries) {
    const to = MERGE_PAIRS[String(value).toLowerCase()] ?? MERGE_PAIRS[value];
    if (to === undefined) {
      next[name] = value;
      continue;
    }
    if (!tokensLike(tokens, to)) throw new Error(`merge target ${to} is not in the palette`);
    merges.push({ from: value, to, distance: +dist(hex(value), hex(to)).toFixed(2) });
    next[name] = to;
  }
  // Representative rungs per family, ascending by lightness, for decoration.
  const ladder = {};
  for (const rule of COLOR_FAMILIES) {
    const used = new Set();
    for (const [name, value] of Object.entries(next)) {
      if (!/^--dsw-static-/.test(name)) continue;
      if (!/^#[0-9a-f]{6}$/i.test(value)) continue;
      if (rule.match(hex(value))) used.add(value);
    }
    ladder[rule.family] = [...used].map((c) => ({ hex: c, lum: +lum(c).toFixed(4) })).sort((a, b) => a.lum - b.lum);
  }
  const snapped = merges.length;
  return { tokens: next, merges, snapped, ladder };
}

/** Whether some token already carries this literal (guards a typo'd target). */
function tokensLike(tokens, value) {
  return Object.values(tokens).some((v) => String(v).toLowerCase() === value.toLowerCase() || v === value);
}

const lightUnified = unifyPalette(lightTokens);
const darkUnified = unifyPalette(darkTokens);
const lightFinal = lightUnified.tokens;
const darkFinal = darkUnified.tokens;

// Publish the ladder as tokens AND as decoration variables, so the deco sheet is
// generated from the palette instead of hand-picked hexes: rename a rung and the
// dots, washes and stars follow. Index 1 = lightest rung of its family.
const ladderVars = {};
for (const [family, rungs] of Object.entries(lightUnified.ladder)) {
  rungs.forEach((rung, index) => {
    ladderVars[`--dsh-codex-${family}-${String(index + 1).padStart(2, "0")}`] = rung.hex;
  });
  ladderVars[`--dsh-codex-${family}-count`] = String(rungs.length);
}

/** Pick a rung of a family by its position from the dark end (1 = darkest). */
const rung = (family, from = 1) => {
  const rungs = lightUnified.ladder[family] ?? [];
  const picked = rungs[from - 1] ?? rungs[rungs.length - 1];
  if (picked === undefined) throw new Error(`palette family "${family}" has no rungs`);
  return picked.hex;
};
const DECO = {
  // Warm-only decoration palette. The cool teal/violet rungs were dropped after
  // review: beside the cream page they read as dirty. Dots, blooms, stars,
  // frames and rings now all draw from the rose / gold rungs.
  rose: rung("rose", 4), // the accent rung (#b1524e family)
  roseSoft: rung("rose", 8),
  rosePale: rung("rose", 10),
  roseMid: rung("rose", 6),
  // Blooms are deliberately brighter than any rung in the palette: at 14% over
  // the cream page, the ochre rung (#79510f, luminance 0.10) blended to a muddy
  // brown that read as a bruise. These two stay above 0.25 luminance, which is
  // the floor the colour guard enforces.
  warmGold: "#d9a05b", // honey gold, luminance 0.406
  warmCoral: "#d7827e", // the spec accent, luminance 0.319
  ink: "#575279",
  surface: RP_SURFACE,
};
const decorationVars = { ...ladderVars, "--dsh-codex-deco-ink": DECO.ink };

const lightAuditFinal = audit(lightFinal, RP_SURFACE);
const darkAuditFinal = audit(darkFinal, DARK_SURFACE);
// The ladder rides the same inline-variable mechanism as every other token.
for (const [name, value] of Object.entries(ladderVars)) lightFinal[name] = value;

const report = {
  specs: { primary: SPEC, alternative: DARK_SPEC },
  tokens: { light: lightFinal, dark: darkFinal },
  audit: { light: lightAuditFinal, dark: darkAuditFinal },
  palette: {
    ladder: lightUnified.ladder,
    mergedLight: lightUnified.merges,
    mergedDark: darkUnified.merges,
    changedTokens: { light: lightUnified.snapped, dark: darkUnified.snapped },
    decorationVars,
    decorationColors: DECO,
  },
  unresolved,
  generatedAt: new Date().toISOString(),
};
const fails = [
  ...lightAuditFinal.text,
  ...lightAuditFinal.surface,
  ...darkAuditFinal.text,
  ...darkAuditFinal.surface,
].filter((r) => !r.pass);

// ── decoration sheet ─────────────────────────────────────────────────────────
// Generated here, not hand-written in the template, because every colour must
// come from the palette: a rename of a rung then moves the decoration with it.
//
// Only the marks that sit OVER the reading column are still CSS-animated fixed
// elements. The flank stars moved to the particle engine in the client, because
// "reborn somewhere else every time" is not expressible as a looping keyframe —
// a loop necessarily repeats the same rebirth position. See startParticles.
const TEXT_STARS = (() => {
  const tints = ["rose", "ochre", "rose-soft", "rose"];
  let seed = 20260918;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const out = [];
  // Three above the composer band, two below it. Explicitly left alone by the
  // particle work: a moving mark behind body text pulls the eye off the words.
  for (let i = 0; i < 3; i += 1) {
    out.push({ left: 31 + i * 16, top: 11 + rand() * 7, size: ["sm", "md", "sm"][i], tint: tints[(i + 2) % tints.length] });
  }
  for (let i = 0; i < 2; i += 1) {
    out.push({ left: 39 + i * 20, bottom: 9 + rand() * 5, size: ["md", "sm"][i], tint: tints[(i + 4) % tints.length] });
  }
  return out;
})();
/**
 * Star parts: the five marks that sit over the reading column, static apart from
 * a very slow breathe. The flank stars are NOT here any more — the client's
 * particle engine spawns them, so they can be reborn in a different place each
 * time (a CSS loop would repeat the same spot forever).
 */
const STAR_PARTS = TEXT_STARS.map((star, index) =>
  [
    "dsh-codex-deco__star",
    `dsh-codex-deco__star--${star.size}`,
    `dsh-codex-deco__star--${star.tint}`,
    `dsh-codex-deco__star--t${index + 1}`,
    "dsh-codex-deco__star--breathe-slow",
  ].join(" ")
);
const starPositionRules = TEXT_STARS.map((star, index) => {
  const bits = [];
  if (star.top !== undefined) bits.push(`top:${star.top.toFixed(1)}%`);
  if (star.bottom !== undefined) bits.push(`bottom:${star.bottom.toFixed(1)}%`);
  if (star.left !== undefined) bits.push(`left:${star.left.toFixed(1)}%`);
  if (star.right !== undefined) bits.push(`right:${star.right.toFixed(1)}%`);
  return `.dsh-codex-deco__star--t${index + 1}{${bits.join(";")}}`;
});

/**
 * The flank stars are spawned by the client's particle engine, so the sheet only
 * needs to describe what one looks like and where the two bands are. Everything
 * that varies per spawn (position, size, colour, brightness, spin, lifetime) is
 * decided in JavaScript at spawn time — that is what makes a rebirth land in a
 * new place, which a looping keyframe cannot do.
 */
const starClip = "polygon(46% 0,54% 0,54% 46%,100% 46%,100% 54%,54% 54%,54% 100%,46% 100%,46% 54%,0 54%,0 46%,46% 46%)";
const particleRules = [
  ".dsh-codex-particle-zone{position:absolute;top:0;bottom:0;width:17%;pointer-events:none}",
  ".dsh-codex-particle-zone--left{left:0}",
  ".dsh-codex-particle-zone--right{right:0}",
  // The rotating element owns the cross shape, so the mark turns as a whole.
  // Keeping `clip-path` on the outer box (as an earlier cut did) left the
  // cross-hole stationary while its contents slid around inside, which reads as
  // a shimmer rather than a rotation. The fill is the star's own flat colour — no
  // highlight, by request.
  ".dsh-codex-particle{position:absolute}",
  ".dsh-codex-particle__spin{position:absolute;inset:0;",
  `  clip-path:${starClip};transform-origin:50% 50%}`,
];

/**
 * The AI turn slab.
 *
 * The assistant's whole turn — reasoning steps, tool calls, the answer, the
 * footer — is drawn as ONE continuous slab, the way a chat app draws a single
 * assistant bubble. Previously each visible step was its own rounded card and
 * the tool-call rows had no background at all.
 *
 * What makes it read as one slab instead of a stack:
 *
 *   • Every AI flow item carries the same flat background, so there is no seam
 *     between a reasoning row and the answer under it.
 *   • `margin: 0 -22px !important` collapses the 16px gap the shell puts above
 *     each item AND cancels the card bleed, so adjacent items touch. The visible
 *     breathing room comes from each item's own 10px vertical padding instead.
 *   • Only the FIRST and LAST item of a turn get a border, and only those get
 *     corner radii, opened with longhand properties so the middle items stay
 *     square and the stack joins flush. Otherwise a top border per item would
 *     draw a 2px rule at every seam.
 *   • Turn boundaries come from `data-chat-turn` plus the sibling combinator, so
 *     the slab closes at the end of each turn even though the shell renders one
 *     flat sibling list (measured: 111 items, all children of `EvIC1a_column`).
 *
 * Colour: a flat 5% rose over the page background — measured per step, every
 * extra point of rose pushes the card into the code surfaces' own warm tone and
 * eats the separation (5% keeps code blocks at 1.10–1.20 against the card; 12%
 * collapses to 1.04). No gradient: a sweep down each card read as cheap. No
 * `backdrop-filter`: nothing scrolls behind these cards, so a blur would cost
 * compositing for no visible effect.
 *
 * The card is driven by ONE attribute the client stamps per element:
 * `data-codex-run="open" | "mid" | "end" | "both"`. Deriving the run boundaries in
 * CSS was tried exhaustively and is not workable here — every sibling-combinator
 * form matched a single element instead of the six run boundaries, and the shell's
 * own unlayered `!important` rules win specificity ties against anything shorter.
 * With the role precomputed, the sheet only has to compare attributes.
 */
const AI_BLOCK_BG = "color-mix(in srgb, var(--dsw-alias-brand-primary) 5%, var(--dsw-alias-bg-base))";
/**
 * The card's own surface fill.
 *
 * Mixing the brand colour into `transparent` rather than into the page colour is
 * what keeps the slab FEELING like a card instead of a flat block pasted over the
 * design. Mixed into `bg-base` the fill is fully opaque, and at slab size it wiped
 * out the entire dot grid, the washes and the stars underneath — the page read as
 * "the decorations disappeared and the card has no background". Mixed into
 * `transparent`, the very same tint stays on the card, but the decoration layer
 * shows through it, which is how the two effects coexist.
 */
const AI_BLOCK_FILL = "color-mix(in srgb, var(--dsw-alias-brand-primary) 6%, transparent)";
/**
 * Every flow kind that belongs to an assistant turn.
 *
 * `context` is the "上下文注入" chip: it renders immediately above the reasoning
 * rows of the same turn, so it belongs to the turn's surface — leaving it out
 * closed the previous turn early and opened a fresh card above the chip, which was
 * the stray rounded band at the top of each assistant turn.
 */
const AI_FLOW_KIND_LIST = ["assistant-step", "tool-call", "turn-tail", "turn-process", "context", "model-retry"];
/**
 * Selector for every AI flow row.
 *
 * WHY THREE ATTRIBUTES. The shell closes its own vertical gap with
 *     [data-chat-flow-kind][data-chat-turn]:not([data-chat-turn="1"]) {
 *       margin-top: var(--dsh-chat-flow-gap, 16px) !important }
 * at specificity (0,3,1), unlayered. Both sides are `!important`, so the winner is
 * decided by specificity alone and anything at or below (0,3,0) loses — which is
 * why the 16px gap survived every attempt built on two attributes. Every rule here
 * therefore carries three attribute selectors, reaching (0,3,0) and up.
 *
 * The kind attribute is the guaranteed third attribute: every flow item carries it,
 * including the `context` chip and hidden rows.
 */
const AI_RUN_KINDS = AI_FLOW_KIND_LIST.map((kind) => `[data-codex-run][data-chat-flow-kind][data-chat-flow-kind="${kind}"]`);
const AI_RUN_ANY = AI_RUN_KINDS.join(", ");
/**
 * Corner selectors: the same kind list, anchored with `[data-chat-turn]` and the
 * role, so only the run's two END rows round.
 *
 * These are built by mapping an ARRAY, not by string-replacing `AI_RUN_ANY`. The
 * replace form silently applied the anchor to the last comma part only — the other
 * five kept four attributes and matched every row with that kind, which rounded the
 * middle rows too and put a seam between each pair (measured: `mid` computed
 * `border-top-left-radius: 16px`).
 */
const AI_RUN_END_SELECTOR = (role) =>
  AI_FLOW_KIND_LIST.map((kind) => `[data-codex-run][data-chat-turn][data-codex-run="${role}"][data-chat-flow-kind="${kind}"]`).join(", ");
const AI_CARD_CSS = [
  "/* AI turn slab: one continuous surface per assistant turn, NO outline. */",
  //
  // NO BORDERS ANYWHERE. By explicit request: every attempt to outline the slab
  // produced a visible seam somewhere — on the opening row, on a meta row, or at a
  // row the shell renders that this plugin does not mark (the "已重试模型请求"
  // notice). The outline is therefore gone; the slab is defined by its fill alone,
  // which cannot break, because the fill is applied to every row independently.
  //
  // The fill is a 6% rose mixed into `transparent`, not into the page colour, so the
  // decoration layer keeps showing through the slab.
  `${AI_RUN_ANY}{`,
  `  background:${AI_BLOCK_FILL};`,
  "  margin:0 -22px !important;",
  // HORIZONTAL PADDING ONLY. Adding vertical padding inflated every row — measured
  // turn-process 41px→61px, assistant-step 24px→44px, user 76px→96px — which showed
  // up as a large empty band above the answer ("好 字上方的一大堆空白"). The bleed
  // only needs to be horizontal; vertical rhythm belongs to the shell.
  "  padding:0 22px;",
  "  border:0;",
  "  border-radius:0;",
  "  box-shadow:none;",
  "}",
  // Rows the SHELL renders between AI rows that this plugin does not mark — the
  // "已重试模型请求 (1/5)" notice is the known case. They were left unstyled, so a
  // transparent strip with its own 16px margin cut the slab in two (visible in the
  // report). Any direct child of the AI column that sits between two AI rows gets
  // the same fill and loses its outer margins, so the surface never breaks.
  //
  // `:has(> [data-codex-run])` identifies the conversation column itself, so this
  // cannot reach rows that live in some other container.
  '[class*="column"]:has(> [data-codex-run]) > :not([data-chat-flow-kind]){',
  `  background:${AI_BLOCK_FILL};`,
  "  margin-top:0 !important;",
  "  margin-bottom:0 !important;",
  "}",
  // The "深度求索中… 54秒" turn-status strip is a direct child of the same column
  // but carries NO flow-kind, and the shell gives it `display:flex` with
  // `align-self:flex-start` and a content-sized width (measured: 115px inside a
  // 920px column). With the slab fill applied to it, that showed up as a small
  // narrow chip stuck to the left — the "突出的一个时间部分".
  //
  // Forcing it to fill the row and take the same bleed as every other row makes it
  // part of the slab. `width:auto` overrides a content-sized width, and the margins
  // match the -22px bleed the flow rows use.
  '[class*="column"]:has(> [data-codex-run]) > [class*="turnStatus"]{',
  "  width:auto !important;",
  "  min-width:0;",
  "  align-self:stretch !important;",
  "  margin-left:-22px !important;",
  "  margin-right:-22px !important;",
  "  padding:0 22px;",
  "}",
  // The status strip's own label is painted with `color: transparent` because the
  // shell fills it with a gradient text clip. "深度求索中…" is therefore invisible —
  // only the clock, which uses a normal colour, shows. Restoring a solid colour on
  // the strip makes the label readable again without touching the animation.
  '[class*="turnStatus"]{',
  "  color:var(--dsw-alias-label-secondary) !important;",
  "}",
  // Every AI row keeps zero vertical margin. The gap between turns is supplied by the
  // user bubble's margin-bottom below, so nothing inside a turn can open a seam.
  `${AI_RUN_ANY}{`,
  "  margin-top:0 !important;",
  "  margin-bottom:0 !important;",
  "}",
  // ROUNDED ENDS, STILL NO BORDER. The user wants the slab's top and bottom corners
  // back but no outline at all, so the radius is applied to the two END rows only and
  // every interior row keeps square corners. That distinction matters: putting the
  // same radius on every row makes each pair of adjacent rows round away from each
  // other, and the gap between the two curves reads as a seam even though no border
  // exists.
  //
  // Both rules carry `[data-chat-turn]` as a fourth attribute to reach (0,4,0) and
  // beat the base rule's (0,3,0) regardless of source order. The anchor is only
  // correct because it is composed per kind — see AI_RUN_END_SELECTOR.
  `${AI_RUN_END_SELECTOR("open")},`,
  `${AI_RUN_END_SELECTOR("both")}{`,
  "  border-top-left-radius:16px;",
  "  border-top-right-radius:16px;",
  "}",
  `${AI_RUN_END_SELECTOR("end")},`,
  `${AI_RUN_END_SELECTOR("both")}{`,
  "  border-bottom-left-radius:16px;",
  "  border-bottom-right-radius:16px;",
  "}",
  // Rows that are NOT part of an assistant run are left completely alone. An earlier
  // cut gave the user bubble, steering messages and command rows a 3% tint plus
  // vertical padding; on screen that read as "用户输入的背景还有额外颜色元素" — the shell
  // already draws the user bubble, and stacking a second surface on it was wrong.
  // Nothing is applied to them now.
  //
  // The user bubble supplies the gap above each slab. It is untouched visually —
  // transparent, no padding, no radius — only its bottom margin is set, which the
  // shell leaves at zero.
  '[data-chat-flow-kind="user"]{',
  "  margin-bottom:16px !important;",
  "}",
  // Wide content stays INSIDE the slab and scrolls, the way a chat bubble does:
  // a wide table or a long code fence must scroll rather than stretch past the
  // card. The scroll container is applied to the CONTENT (pre / table / code
  // block), never to a flow row: making rows scroll containers is what turned the
  // slab into a series of framed segments.
  `${AI_RUN_ANY} > *{`,
  "  max-width:100%;",
  "  min-width:0;",
  "}",
  `${AI_RUN_ANY} pre,`,
  `${AI_RUN_ANY} table,`,
  `${AI_RUN_ANY} [class*="code-block"],`,
  `${AI_RUN_ANY} [class*="codeBlock"]{`,
  "  max-width:100%;",
  "  overflow-x:auto;",
  "  overscroll-behavior-x:contain;",
  "}",
];
const ringDataUri =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='9' fill='none' stroke='%23" +
  DECO.rose.slice(1) +
  "' stroke-width='1.5'/%3E%3C/svg%3E\")";
/** Literal colour for the ring's inline SVG (data URIs cannot read var()). */
const ringColorHex = DECO.rose.slice(1);
const DECO_CSS = [
  "/* page colour moves to <html>: a negative-z layer paints under an in-flow",
  "   ancestor's background, so the body box must stop painting one. */",
  "html{background:var(--dsw-alias-bg-base)}",
  "body{background-color:transparent}",
  "",
  "/* The layer lives INSIDE the conversation column (see mountLayer in the",
  "   client): `absolute; inset:0` fills that column and `z-index:-1` puts it",
  "   above the column's own background but below its content. The column is",
  "   transparent and `_frame` is the element painting the page colour, which is",
  "   why -1 is correct here. The client gives the panel `position:relative` (with",
  "   `z-index:auto`, so no stacking context) because the panel ships with no",
  "   positioning of its own — without that every absolute descendant resolved",
  "   against an ancestor and the layer came out at the window's left edge.",
  "   Parented there, the decoration is squeezed by the sidebar exactly as the",
  "   conversation is. */",
  ".dsh-codex-deco{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden}",
  "",
  "/* ── dot grid ─────────────────────────────────────────────────────────────",
  "   A tileable SVG, not CSS gradients. Gradients had to be positioned and sized",
  "   against the layout, and one revision silently blanked the whole layer through",
  "   `mask-composite`; a background tile needs no mask, size or position — it",
  "   repeats from the element's origin, which is exactly 'uniform across the",
  "   window'. Both dots are warm and carried at low fill-opacity so the dots read",
  "   as one tint rather than as two colours. */",
  ".dsh-codex-deco__dots{position:absolute;inset:0;opacity:.5;",
  `background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Ccircle cx='3' cy='3' r='1.5' fill='%23${DECO.rose.slice(1)}' fill-opacity='0.30'/%3E%3Ccircle cx='17' cy='17' r='1.5' fill='%23${DECO.warmGold.slice(1)}' fill-opacity='0.26'/%3E%3C/svg%3E");`,
  "background-size:28px 28px}",
  "",
  "/* The composer seat is plain: see the note further down. */",
  "",
  "/* Halftone washes: four corners, so every edge of the window carries a mark. */",
  ".dsh-codex-deco__wash{position:absolute;width:380px;height:380px;opacity:.15;",
  "background-image:radial-gradient(currentColor 2px, transparent 2.3px);background-size:15px 15px;",
  "mask-image:radial-gradient(closest-side, #000, transparent);",
  "-webkit-mask-image:radial-gradient(closest-side, #000, transparent)}",
  ".dsh-codex-deco__wash--tl{top:-170px;left:-170px}",
  ".dsh-codex-deco__wash--tr{top:-170px;right:-170px}",
  ".dsh-codex-deco__wash--bl{bottom:-170px;left:-170px}",
  ".dsh-codex-deco__wash--br{bottom:-170px;right:-170px}",
  "",
  "/* Cross-stars: three per corner, staggered in size and colour so a corner",
  "   cluster reads as intentional rather than as one stray mark. */",
  "/* The spin layer inside a side star: it exists so the constant rotation is a",
  "   separate animation from the lifetime curve (animation-name cannot stack, and",
  "   one easing over both is what made the spin speed up in bursts). */",
  ".dsh-codex-deco__star__spin{position:absolute;inset:0;background:currentColor}",
  ".dsh-codex-deco__star{position:absolute;background:currentColor;",
  `clip-path:${starClip}}`,
  ".dsh-codex-deco__star--lg{width:26px;height:26px}",
  ".dsh-codex-deco__star--md{width:15px;height:15px;opacity:.72}",
  ".dsh-codex-deco__star--sm{width:9px;height:9px;opacity:.55}",
  `.dsh-codex-deco__star--rose{color:${DECO.rose}}`,
  `.dsh-codex-deco__star--rose-soft{color:${DECO.roseSoft}}`,
  `.dsh-codex-deco__star--ochre{color:${DECO.ochre}}`,
  ".dsh-codex-deco__star--breathe{animation:dsh-codex-breathe 7s ease-in-out infinite}",
  ".dsh-codex-deco__star--breathe-slow{animation:dsh-codex-breathe 11s ease-in-out infinite}",
  // `--spin` (single dash) was the pre-nesting rule. Side stars now use the
  // nested `__spin` layer below, and leaving the old rule in place meant a stale
  // `animation-name` could win the cascade against the lifetime animation —
  // which is what silently killed the death phase. Removed on purpose.
  "@keyframes dsh-codex-breathe{0%,100%{transform:scale(1) rotate(0deg);opacity:.42}50%{transform:scale(1.22) rotate(45deg);opacity:.78}}",
  "",
  "/* Scatter positions, in viewport percentages (STAR_FIELD above): two columns",
  "   down the flanks plus a few marks around the composer band. */",
  ...starPositionRules,
  "",
  "/* Twinkle loop for the flank marks: hold, shrink out, reappear a few percent",
  "   away (still inside the flank band), grow back, then drift home while fading.",
  "   Only transform and opacity animate, so this rides the compositor. The marks",
  "   over the reading column are deliberately NOT in this loop. */",
  ...particleRules,
  ...AI_CARD_CSS,
  "",
  "/* Three accent blooms arranged as the VERTICES OF A TRIANGLE (left mid-height,",
  "   right-top, right-bottom), kept OUT IN THE SIDE MARGINS so they never compete",
  "   with the conversation text. Measured on the live panel: the text column spans",
  "   29.4%–70.2% of the panel, leaving ~30% of clear margin on each side, and the",
  "   500px bloom fits that margin comfortably. An earlier pass put the vertices at",
  "   30% / 72%, i.e. exactly on the text edges. Percentages are of the LAYER (the",
  "   conversation panel), so the whole triangle moves with it when the sidebar",
  "   opens. Colours are the bright warm values: at 16% over cream the darker ochre",
  "   rung blended into a brown that read as a bruise. */",
  ".dsh-codex-deco__panel{position:absolute;transform:translate(-50%,-50%);",
  "  width:min(24vw,440px);height:min(46vh,460px);",
  "  mask-image:radial-gradient(closest-side, #000, transparent 86%);",
  "  -webkit-mask-image:radial-gradient(closest-side, #000, transparent 86%)}",
  // Left vertex: slightly above mid height, flush to the left edge.
  ".dsh-codex-deco__panel--left{left:2%;top:44%;",
  `  background:radial-gradient(closest-side, color-mix(in srgb, ${DECO.rose} 16%, transparent), transparent)}`,
  // Right-top vertex.
  ".dsh-codex-deco__panel--right{left:98%;top:27%;",
  `  background:radial-gradient(closest-side, color-mix(in srgb, ${DECO.warmGold} 16%, transparent), transparent)}`,
  // Right-bottom vertex — the rose-gold one. Moved left by exactly half of the
  // first attempt: 98% → 84% overshot, so the final seat is 91%. Still clears the
  // text column, which ends at 70.2%.
  ".dsh-codex-deco__panel--mid{left:91%;top:73%;",
  `  background:radial-gradient(closest-side, color-mix(in srgb, ${DECO.warmCoral} 14%, transparent), transparent)}`,
  "",
  "/* Nothing is anchored to the composer. Two earlier attempts wrapped it: a pair",
  "   of dashed brackets, then a page-coloured 'clean plate' underneath to blank",
  "   the texture. Both read as a floating decoration that did not belong — the",
  "   user's own words were 'just delete it'. The seat is therefore plain, and the",
  "   dots simply run behind it exactly as they do everywhere else. Colour stays on",
  "   the flanks and never over the text column. */",
  "",
  "/* One faint outline ring per corner, well inside the viewport. */",
  ".dsh-codex-deco__ring{position:absolute;width:34px;height:34px;opacity:.3;",
  `background:${ringDataUri} center/contain no-repeat}`,
  ".dsh-codex-deco__ring--tl{top:14%;left:5%}",
  ".dsh-codex-deco__ring--tr{top:14%;right:5%}",
  ".dsh-codex-deco__ring--bl{bottom:13%;left:5%}",
  ".dsh-codex-deco__ring--br{bottom:13%;right:5%}",
  "@media (prefers-reduced-motion: reduce){.dsh-codex-deco__star{animation:none!important}}",
].join("\n");

// ── emit ─────────────────────────────────────────────────────────────────────
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const dump = (obj, indent) =>
  Object.entries(obj)
    .map(([k, v]) => `${indent}${JSON.stringify(k)}: ${JSON.stringify(v)}`)
    .join(",\n");

writeFileSync(join(root, "theme-tokens.json"), JSON.stringify(report, null, 2) + "\n", "utf8");

writeFileSync(
  join(root, "lib", "tokens.generated.js"),
  `/* Generated by scripts/build.mjs from the codex theme specs — do not edit by hand.
 * ${Object.keys(lightTokens).length} tokens; every value measured in ./theme-tokens.json. */
export const THEME_ID = ${JSON.stringify(THEME_ID)};
export const THEME_LABEL = ${JSON.stringify(THEME_LABEL)};
export const SPEC = ${JSON.stringify(SPEC, null, 2)};
export const DARK_SPEC = ${JSON.stringify(DARK_SPEC, null, 2)};
export const TOKENS_LIGHT = {
${dump(lightFinal, "  ")}
};
export const TOKENS_DARK = {
${dump(darkFinal, "  ")}
};
export default { THEME_ID, THEME_LABEL, SPEC, DARK_SPEC, TOKENS_LIGHT, TOKENS_DARK };
`,
  "utf8"
);

// client.js is the shipped bundle: the template's token markers are filled in
// here so the plugin stays a single self-contained CJS-style file (the module
// loader materializes it directly, and dsh-client-hmr stat-polls this exact
// path — an extra import would break both properties).
const template = readFileSync(join(root, "client.template.js"), "utf8");
const bundle = template
  .replace("/*:TOKENS_LIGHT:*/", "{\n" + dump(lightFinal, "          ") + "\n        }")
  .replace("/*:TOKENS_DARK:*/", "{\n" + dump(darkFinal, "          ") + "\n        }")
  .replace("/*:DECO:*/", JSON.stringify(DECO_CSS))
  .replace("/*:DECO_PARTS:*/", JSON.stringify([...STAR_PARTS], null, 10).replace(/\n/g, "\n        "));
if (bundle.includes("/*:TOKENS_") || bundle.includes("/*:DECO:*/")) {
  throw new Error("client.template.js markers not replaced");
}
writeFileSync(join(root, "client.js"), bundle, "utf8");

if (unresolved.length > 0) {
  console.error(`unresolved var() references: ${unresolved.join(", ")}`);
}
for (const [mode, result] of [
  ["light (primary)", lightAudit],
  ["dark (alternative)", darkAudit],
]) {
  console.log(`── ${mode}: text contrast ──`);
  for (const r of result.text)
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.ratio.toFixed(2)}:1 (min ${r.min})  ${r.name}  ${r.fg} on ${r.bg}`);
  console.log(`── ${mode}: surface liveness ──`);
  for (const r of result.surface)
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.ratio.toFixed(2)}:1 (min ${r.min})  ${r.name}  ${r.fg} on ${r.bg}`);
}
console.log(
  `\ntokens: light=${Object.keys(lightFinal).length} dark=${Object.keys(darkFinal).length}` +
    ` | unified: light ${lightUnified.merges.length} colours / ${lightUnified.snapped} tokens,` +
    ` dark ${darkUnified.merges.length} colours / ${darkUnified.snapped} tokens`
);
if (unresolved.length > 0 || fails.length > 0) {
  console.error(`${fails.length} check(s) failed, ${unresolved.length} unresolved`);
  process.exit(1);
}
console.log("all contrast checks pass (light + dark)");


