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
/**
 * 正文区那 5 颗固定星的运动参数（2026-09-21 用户三条要求）。
 *
 * 关键澄清：用户说的「左右摇摆」**指的是旋转**，不是水平位移 —— 所以这里没有 translateX，
 * 摇摆幅度就是角度的摆幅 `rock`（度）。
 *
 *   ① 旋转过慢 → 周期从统一的 11s 收到 3.4–5.25s，并按摆幅折算角速度：
 *                 平均角速度 = 4 × rock / 周期 ≈ 32–71 °/s（原 45°/11s ≈ 8 °/s）
 *   ② 节奏统一 → 每颗自己的周期 + 负延迟错相位（原来 5 颗全是同一个 11s 且同相位）
 *   ③ 摇摆不足 → 角度摆幅由原来单向 45° 改成对称 ±38°…±60°（总行程 76°–120°，约 2 倍）
 * 位置/大小/配色仍由 TEXT_STARS 决定，这里只动「怎么动」。
 */
const STAR_MOTION = [
  // 2026-09-21 二次调整：用户「左右摇摆的速度不够快」→ 周期整体 ×0.5
  // （摆幅 angle 不变，所以是纯提速；角速度约 32–71 °/s，改前是 8.2 °/s）。
  // phase 是「摇摆」那条动画在周期里的起始位置（0..1），另外两条按固定偏移错开。
  { duration: 3.7, phase: 0.10, rock: 52 },
  { duration: 4.8, phase: 0.38, rock: 38 },
  { duration: 3.4, phase: 0.62, rock: 60 },
  { duration: 5.25, phase: 0.24, rock: 44 },
  { duration: 4.1, phase: 0.78, rock: 57 },
];
const STAR_PARTS = TEXT_STARS.map((star, index) =>
  [
    "dsh-codex-deco__star",
    `dsh-codex-deco__star--${star.size}`,
    `dsh-codex-deco__star--${star.tint}`,
    `dsh-codex-deco__star--t${index + 1}`,
    "dsh-codex-deco__star--sway",
  ].join(" ")
);
const starPositionRules = TEXT_STARS.map((star, index) => {
  const bits = [];
  if (star.top !== undefined) bits.push(`top:${star.top.toFixed(1)}%`);
  if (star.bottom !== undefined) bits.push(`bottom:${star.bottom.toFixed(1)}%`);
  if (star.left !== undefined) bits.push(`left:${star.left.toFixed(1)}%`);
  if (star.right !== undefined) bits.push(`right:${star.right.toFixed(1)}%`);
  // 运动参数与位置写在同一条规则里（同选择器的两条规则也行，合成一条更好读）。
  const motion = STAR_MOTION[index];
  if (motion !== undefined) {
    // 三条动画的周期/相位各不相同 —— 比例取得刻意"不整"（1.37 / 0.79），
    // 这样它们不会周期性重合，观感上也不会出现"转到右边正好也最亮最大"。
    // 解耦策略（2026-09-21 第二轮）：上一版只是把周期改成 1 : 1.37 : 0.79，长期相关性虽然
    // 已经是 0，但三条的周期太接近、且 t=0 时都落在各自周期的 11–19%（都在从最小值往上走），
    // 所以刚打开时看起来仍然是"一起动"。现在改成：
    //   周期比例 1 : 2.8 : 1.7（差得更远）、相位刻意停在周期的不同位置、
    //   缓动也区分开（rotate/scale 用 ease-in-out，opacity 用 linear）。
    const rockT = motion.duration;
    const scaleT = rockT * 2.8;
    const fadeT = rockT * 1.7;
    const rockP = motion.phase;
    const scaleP = (rockP + 0.52) % 1;
    const fadeP = (rockP + 0.25) % 1;
    const rockD = -rockP * rockT;
    const scaleD = -scaleP * scaleT;
    const fadeD = -fadeP * fadeT;
    bits.push(
      `--rock:${motion.rock}deg`,
      `animation-duration:${rockT}s, ${scaleT.toFixed(2)}s, ${fadeT.toFixed(2)}s`,
      `animation-delay:${rockD.toFixed(2)}s, ${scaleD.toFixed(2)}s, ${fadeD.toFixed(2)}s`
    );
  }
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

const ringDataUri =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='9' fill='none' stroke='%23" +
  DECO.rose.slice(1) +
  "' stroke-width='1.5'/%3E%3C/svg%3E\")";
/** Literal colour for the ring's inline SVG (data URIs cannot read var()). */
const ringColorHex = DECO.rose.slice(1);

// ── 背景装饰：2026-09-21 改版后的口径 ──────────────────────────────────────────
// 已撤掉：全屏铺满的主点阵（__dots 的两档点）与试做过的网格线。
// 保留／新增（都在下面的 DECO_CSS 里）：
//   __wash   四角 halftone（用户明确要求保留）
//   __panel  三处光斑，放大到 1.5 倍，并做了位置/浓度/收边微调
//   __ring   四角圆环（原版）
//   __dots   现在只当「叠加层」容器：挂浮动泡泡粒子（300px 瓦片 + 60s transform 上浮）
// 要还原主点阵，按这组参数重建（值取自移除前最后一次口径）：
//   28px 瓦片，玫瑰 #b1524e fill-opacity 0.22 + 暖金 #d9a05b 0.26，
//   层 opacity .5，background-size:28px 28px。

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
  "/* ── 试做 19：浮动泡泡（2026-09-21，真粒子引擎版）─────────────────────────",
  "   泡泡不再是背景瓦片，而是逐颗生成的 DOM：引擎在 client.template.js 的",
  "   startBubbles()，每颗在生成时抽定 x / 尺寸 / 浓度 / 颜色 / 上升时长，",
  "   升出顶边后按 animationend 销毁并重生（重生时重新抽，x 每次都不一样）。",
  "   x 的分布按用户要求做成「统计上中间多、两边少，两端也要有一点」：",
  "   取两个均匀随机数求平均（三角分布）→ 中点密度最高、两端趋近 0 但可达；",
  "   BUBBLE_X_SAMPLES 改 3 更集中、改 1 就是均匀分布。",
  "   这里只负责容器与单颗泡泡的静态样式：柔边用 radial-gradient（不是硬边圆点），",
  "   上升动画只用 transform，走合成器；prefers-reduced-motion 时引擎不生成。",
  "   历史留档：02→18 全部已轮到本方案；本方案取代了之前的「瓦片 + 遮罩」写法。 */",
  ".dsh-codex-deco__dots{position:absolute;inset:0;overflow:hidden;pointer-events:none}",
  "/* 2026-09-21 用户要求「非模糊版本」：从 radial-gradient 柔边改成纯色实心圆，",
  "   边缘由 border-radius 切出来，是锐利的（不再有 72% 处的渐隐）。",
  "   要回到柔边版就把 background-color 换回",
  "   background-image:radial-gradient(circle at 50% 50%, currentColor, transparent 72%)。 */",
  "/* 形状锁：即使宿主页面里有别的 flex/尺寸规则，也不允许泡泡被拉扁。",
  "   （用户反馈过「看起来不是圆的」；真机实测直径是偶数、填充率 0.776 ≈ 正圆 0.785，",
  "   所以这里把会破坏圆形的可能性逐条堵死。） */",
  ".dsh-codex-bubble{position:absolute;bottom:-24px;",
  "  width:auto;height:auto;min-width:0;min-height:0;max-width:none;max-height:none;",
  "  flex:none;aspect-ratio:1/1;overflow:hidden;",
  "  /* 三重保证圆形（用户要求 border-radius 写 100）：",
  "     ① 背景是 SVG circle（几何由 SVG 自己保证）",
  "     ② border-radius:100%（比 50% 更狠，浏览器会按边夹到极限值，仍是正圆）",
  "     ③ clip-path:circle(50%) —— 万一圆角被外部 CSS 改掉，裁剪仍然切出正圆 */",
  "  border-radius:100%;clip-path:circle(50% at 50% 50%);-webkit-clip-path:circle(50% at 50% 50%);",
  "  /* 形状由 SVG circle 保证（见 client.template.js 的 bubbleFill）；background-color 只是兜底。",
  "     background-size:100% 100% 是关键：少了它，100×100 的 SVG 会按原始尺寸铺进几像素的盒子里，",
  "     只露出圆的一角，看起来就像方块。 */",
  "  background-color:currentColor;",
  "  background-size:100% 100%;background-position:center;background-repeat:no-repeat;",
  "  /* 两个动画并存：① dsh-codex-rise 只管位移（线性上浮）",
  "     ② dsh-codex-fade 只管「出生」那一段的透明度（0 → 该泡泡自己的峰值）——",
  "     用户 2026-09-21：「出现时是瞬间刷新的，希望从透明逐渐变为不透明」。",
  "     峰值走 CSS 变量 --bubble-peak（由 client.template.js 每颗写入），",
  "     否则关键帧里写死值会把每颗泡泡不同的浓度抹平。 */",
  "  animation-name:dsh-codex-rise, dsh-codex-fade;",
  "  animation-timing-function:linear, ease-out;",
  "  animation-fill-mode:forwards, forwards}",
  "@keyframes dsh-codex-rise{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,-108vh,0)}}",
  "@keyframes dsh-codex-fade{from{opacity:0}to{opacity:var(--bubble-peak, 1)}}",
  "/* The composer seat is plain: see the note further down. */",
  "",
  "/* Halftone washes: four corners, so every edge of the window carries a mark.",
  "   2026-09-21 用户明确要求保留这一层（关掉的只有全屏铺满的主点阵）。",
  "   颜色仍是历史遗留的 currentColor：元素没设颜色，会继承正文色（冷紫灰），",
  "   暖色门禁只扫十六进制字面量、扫不到 currentColor，故一直没被发现。",
  "   要改暖：给下面这条规则加显式 color，取值用 DECO 里的暖色即可。 */",
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
  "/* 固定星的运动：每颗三条独立动画（摇摆 / 缩放 / 明暗），周期与相位都由 --t1…--t5 给。",
  "   注意「摇摆」是旋转，不是位移 —— 用户明确澄清过。 */",
  "/* 三条动画并行，属性彼此独立：",
  "     rotate → dsh-codex-star-rock（摇摆）  scale → dsh-codex-star-scale（呼吸缩放）",
  "     opacity → dsh-codex-star-fade（明暗）",
  "   它们各自有独立的周期与相位（见 --t1…--t5 规则），所以不会再出现「转到右边的那一刻正好",
  "   也最亮最大」这种被绑在一起的观感。用 rotate/scale 这两个独立变换属性而不是 transform，",
  "   正是为了让旋转与缩放在同一条时间线上解耦。 */",
  ".dsh-codex-deco__star--sway{",
  "  animation-name:dsh-codex-star-rock, dsh-codex-star-scale, dsh-codex-star-fade;",
  "  animation-timing-function:ease-in-out, ease-in-out, linear;",
  "  animation-iteration-count:infinite, infinite, infinite}",
  // `--spin` (single dash) was the pre-nesting rule. Side stars now use the
  // nested `__spin` layer below, and leaving the old rule in place meant a stale
  // `animation-name` could win the cascade against the lifetime animation —
  // which is what silently killed the death phase. Removed on purpose.
  "@keyframes dsh-codex-star-rock{0%,100%{rotate:calc(-1 * var(--rock, 45deg))}50%{rotate:var(--rock, 45deg)}}",
  "@keyframes dsh-codex-star-scale{0%,100%{scale:1}50%{scale:1.22}}",
  "@keyframes dsh-codex-star-fade{0%,100%{opacity:.42}50%{opacity:.78}}",
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
  "/* 光斑尺寸：2026-09-21 按用户要求整体放大到 1.5 倍。",
  "   原尺寸 min(24vw,440px) × min(46vh,460px)，现为 min(36vw,660px) × min(69vh,690px)；",
  "   顶点位置（left/top 百分比）与 16%/14% 的浓度都没动，所以只是「变大」，不是「变浓」。",
  "   注意：遮罩仍是 closest-side + transparent 86%，会随尺寸等比放大；",
  "   放大后右侧两颗会侵入正文列（正文列约占面板 29.4%–70.2%），这是本尺寸下的必然结果。 */",
  ".dsh-codex-deco__panel{position:absolute;transform:translate(-50%,-50%);",
  "  width:min(36vw,660px);height:min(69vh,690px);",
  "  mask-image:radial-gradient(closest-side, #000, transparent 80%);",
  "  -webkit-mask-image:radial-gradient(closest-side, #000, transparent 80%)}",
  // Left vertex: slightly above mid height, flush to the left edge.
  ".dsh-codex-deco__panel--left{left:2%;top:44%;",
  `  background:radial-gradient(closest-side, color-mix(in srgb, ${DECO.rose} 14%, transparent), transparent)}`,
  // Right-top vertex.
  ".dsh-codex-deco__panel--right{left:98%;top:27%;",
  `  background:radial-gradient(closest-side, color-mix(in srgb, ${DECO.warmGold} 14%, transparent), transparent)}`,
  // Right-bottom vertex — the rose-gold one. Moved left by exactly half of the
  // first attempt: 98% → 84% overshot, so the final seat is 91%. Still clears the
  // text column, which ends at 70.2%.
  ".dsh-codex-deco__panel--mid{left:95%;top:73%;",
  `  background:radial-gradient(closest-side, color-mix(in srgb, ${DECO.warmCoral} 12%, transparent), transparent)}`,
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


