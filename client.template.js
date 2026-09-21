/**
 * dsh_skin_blossom — browser half.
 *
 * Applies `codex-theme-v1` to the DSH Web GUI through the supported extension
 * points only:
 *
 *   1. `ctx.theme.register()` — the theme id, `colorScheme: "dark"`, and the
 *      full generated token dictionary. ui-layout's ThemePresenter writes every
 *      entry onto `document.body` as an inline CSS variable, which outranks the
 *      shipped stylesheets; removing our plugin removes exactly those
 *      properties again (`ThemePresenter.dispose`).
 *   2. `ctx.theme.setTheme()` once on activation, so the skin shows up without
 *      the user hunting through Settings. After that the user owns the choice.
 *   3. One namespaced stylesheet for decoration that has no token seat
 *      (superellipse corners, selection colour), removed by the same effect's
 *      disposer.
 *   4. A Settings → General row that reports the active theme and links back to
 *      the built-in Appearance row for switching.
 *
 * Nothing here touches DSH's installed files or its bundled frontend, so the
 * whole skin is removable by deleting one row from cordis.patch.yml.
 */
(() => {
  try {
    window.__ModuleLoader__.load({
      id: "dsh_skin_blossom",
      factory: (require) => {
        var module = { exports: {} };
        var exports = module.exports;
        Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

        var react = require("react");

        // ui-theme provides `theme`; the Settings row needs `slots` and `locale`.
        var inject = ["theme", "slots", "locale"];

        var THEME_ID = "codex-theme-v1";
        // Theme name: Blossom. THEME_ID stays `codex-theme-v1` on purpose — it is the
        // identifier written into the Codex theme config, and renaming it would break
        // configurations already pointing at it.
        var THEME_LABEL = "Blossom";
        var SETTINGS_NS = "settings.codex-skin";
        var STYLE_ID = "dsh_skin_blossom-style";
        var DECO_ID = "dsh_skin_blossom-deco";
        var ANCHOR_ID = "dsh_skin_blossom-anchor";
        /** Decoration layer children, in paint order; all pure CSS shapes. */
        var DECO_PARTS = [
          // Dots first, then colour, then small marks. Nothing is anchored to the
          // composer: an earlier revision wrapped the input in brackets and laid
          // a "clean plate" under it, and both read as a floating decoration
          // that did not belong. The seat is left plain.
          "dsh-codex-deco__dots",
          "dsh-codex-deco__wash dsh-codex-deco__wash--tl",
          "dsh-codex-deco__wash dsh-codex-deco__wash--tr",
          "dsh-codex-deco__wash dsh-codex-deco__wash--bl",
          "dsh-codex-deco__wash dsh-codex-deco__wash--br",
          "dsh-codex-deco__panel dsh-codex-deco__panel--left",
          "dsh-codex-deco__panel dsh-codex-deco__panel--right",
          "dsh-codex-deco__panel dsh-codex-deco__panel--mid",
          "dsh-codex-deco__ring dsh-codex-deco__ring--tl",
          "dsh-codex-deco__ring dsh-codex-deco__ring--tr",
          "dsh-codex-deco__ring dsh-codex-deco__ring--bl",
          "dsh-codex-deco__ring dsh-codex-deco__ring--br",
          // The two flank bands. Stars here are not CSS animation on fixed marks:
          // they are spawned, lived and respawned by the particle engine below,
          // because "reborn somewhere else every time" cannot be expressed as a
          // looping keyframe — the rebirth position would be identical every cycle.
          "dsh-codex-particle-zone dsh-codex-particle-zone--left",
          "dsh-codex-particle-zone dsh-codex-particle-zone--right",
          .../*:DECO_PARTS:*/
        ];

        /**
         * Particle engine for the flank stars.
         *
         * Each star is spawned with its own random size, colour, brightness, spin
         * speed, spin direction and lifetime; it fades in, holds while it rotates,
         * fades out, and is removed. The next spawn happens at a NEW random spot
         * inside the same band, so a star never reappears where it died. Only the
         * population is fixed (STARS_PER_ZONE); everything else is rolled per
         * spawn, which is the model the design asked for.
         */
        /** Raised from 8 to 11 per side (22 in total) by request. */
        var STARS_PER_ZONE = 6;
        /**
         * Warm colour anchors, spread from deep wine to pale cream-gold.
         *
         * A five-swatch list (the previous cut) collided constantly: with 16 stars
         * drawn from five values, most of the field ended up the same two tones.
         * These anchors are the ends of the range; the actual colour is interpolated
         * between a rolled pair and then jittered, so the spacing between any two
         * stars is a continuous spread rather than one of five steps.
         */
        var STAR_COLOUR_ANCHORS = [
          "#8f3d3a", // deep wine
          "#b1524e", // rose
          "#d7827e", // rose-gold (the theme accent)
          "#e8bfba", // pale rose
          "#e0c9a6", // cream
          "#c98a4b", // ochre
          "#d9a05b", // warm gold
          "#a8613f", // burnt amber
        ];
        var STAR_MIN_PX = 7;
        /** Ceiling raised from 19px: the small end stayed, the big end grew. */
        var STAR_MAX_PX = 30;
        /** Lifetimes, doubled again so a star lives long enough to be watched. */
        var STAR_LIFE_MIN_MS = 42000;
        var STAR_LIFE_MAX_MS = 96000;
        /**
         * Non-overlap constraint, by explicit request ("星星间禁止重合").
         *
         * `STAR_MIN_GAP_PX` is the clear space required between two stars' edges on
         * top of their own sizes; `REJECTION_TRIES` bounds the search so a crowded
         * zone degrades to "skip this spawn" instead of looping.
         */
        var STAR_MIN_GAP_PX = 10;
        var REJECTION_TRIES = 24;
        /**
         * Spin, in degrees per SECOND, rolled per star.
         *
         * Do NOT multiply this by the lifetime. An earlier cut computed
         * `rate * life / 1000` degrees for the whole animation, which for a 30s
         * star meant 1300–3300° — about two turns per second. A cross turning that
         * fast reads as a blur or as standing still, which is exactly how it was
         * reported. These values give one full turn every 5–9s.
         *
         * The sweep is ONE direction, constant rate, for the whole life: `linear`
         * easing so no part of the turn speeds up or slows down, and no `alternate`
         * (a mark that reverses reads as a wobble, not as spinning).
         */
        var SPIN_MIN_DEG_PER_S = 39;
        /** Ceiling cut to 0.75x (68 -> 51) by request; the floor is unchanged. */
        var SPIN_MAX_DEG_PER_S = 51;
        /** One shared scheduler: `stopped` gates every pending spawn. */
        var particles = { stopped: true, timers: [] };
        /** 浮动泡泡引擎的调度状态（与星星引擎各自独立）。 */
        var bubbles = { stopped: true };

        function roll(min, max) {
          return min + Math.random() * (max - min);
        }

        /**
         * Pick a spawn position that does not overlap a star already in the zone.
         *
         * Overlap is checked between CENTRES against the sum of the two half-sizes
         * plus a comfort gap, so two large stars are pushed further apart than two
         * small ones. `REJECTION_TRIES` attempts are made; if the zone is too crowded
         * to satisfy the constraint the spawn is abandoned and the caller retries on
         * a later tick rather than dropping a star on top of another.
         */
        function pickPosition(zone, size) {
          var box = typeof zone.getBoundingClientRect === "function" ? zone.getBoundingClientRect() : null;
          if (box === null || box.width <= 0 || box.height <= 0) return null;
          var existing = zone.querySelectorAll(".dsh-codex-particle");
          for (var attempt = 0; attempt < REJECTION_TRIES; attempt += 1) {
            var x = roll(0, Math.max(1, box.width - size));
            var y = roll(0, Math.max(1, box.height - size));
            var cx = x + size / 2;
            var cy = y + size / 2;
            var clash = false;
            for (var i = 0; i < existing.length; i += 1) {
              var other = existing[i];
              var ow = Number.parseFloat(other.style.width) || size;
              var oh = Number.parseFloat(other.style.height) || size;
              var ox = (Number.parseFloat(other.style.left) || 0) + ow / 2;
              var oy = (Number.parseFloat(other.style.top) || 0) + oh / 2;
              var need = (size + Math.max(ow, oh)) / 2 + STAR_MIN_GAP_PX;
              if (Math.abs(cx - ox) < need && Math.abs(cy - oy) < need) {
                clash = true;
                break;
              }
            }
            if (!clash) return { x: x, y: y };
          }
          return null;
        }

        /**
         * A warm colour with real spread: pick two anchors, interpolate a random
         * distance between them, then jitter each channel. Sampling the anchors
         * directly would still give only eight possibilities; this gives a
         * continuum, so no two stars in the flank look like the same swatch.
         */
        function hexToRgb(hex) {
          return [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)];
        }

        function rollColour() {
          var a = hexToRgb(STAR_COLOUR_ANCHORS[Math.floor(Math.random() * STAR_COLOUR_ANCHORS.length)]);
          var b = hexToRgb(STAR_COLOUR_ANCHORS[Math.floor(Math.random() * STAR_COLOUR_ANCHORS.length)]);
          var t = roll(0, 1);
          var parts = [];
          for (var i = 0; i < 3; i += 1) {
            var value = a[i] + (b[i] - a[i]) * t + roll(-14, 14);
            parts.push(Math.max(0, Math.min(255, Math.round(value))));
          }
          return "rgb(" + parts[0] + "," + parts[1] + "," + parts[2] + ")";
        }

        function spawnStar(zone) {
          if (particles.stopped) return;
          // A hidden tab still runs timers; stealing the budget for invisible
          // work is pointless, so the spawn is parked and retried when visible.
          if (document.visibilityState === "hidden") {
            scheduleZone(zone, 2000);
            return;
          }
          var box = typeof zone.getBoundingClientRect === "function" ? zone.getBoundingClientRect() : null;
          if (box === null || box.width <= 0 || box.height <= 0) {
            scheduleZone(zone, 1000);
            return;
          }

          var size = Math.round(roll(STAR_MIN_PX, STAR_MAX_PX));
          var colour = rollColour();
          // Brightness per star. Ceiling raised to 0.90 by request; the floor
          // stays at 0.50 so a freshly born star is never nearly invisible.
          var peak = Number(roll(0.5, 0.9).toFixed(2));
          // Position last, because it depends on the size: the non-overlap test
          // needs to know how big this star is before it can look for a free spot.
          var spot = pickPosition(zone, size);
          if (spot === null) {
            // No free spot this time — try again shortly instead of overlapping.
            scheduleZone(zone, roll(600, 2500));
            return;
          }
          var x = spot.x;
          var y = spot.y;
          var life = roll(STAR_LIFE_MIN_MS, STAR_LIFE_MAX_MS);
          var direction = Math.random() < 0.5 ? -1 : 1;
          // Total rotation for this star's whole life, from a per-second rate:
          // one direction, constant angular speed, no reversal.
          var spinSweep = roll(SPIN_MIN_DEG_PER_S, SPIN_MAX_DEG_PER_S) * (life / 1000);
          // Where on its brightness curve this star starts, so a freshly spawned
          // star is not synchronised with the ones already on screen.
          var phase = Math.random();

          var outer = document.createElement("div");
          outer.className = "dsh-codex-particle";
          outer.style.left = Math.round(x) + "px";
          outer.style.top = Math.round(y) + "px";
          outer.style.width = size + "px";
          outer.style.height = size + "px";
          outer.setAttribute("aria-hidden", "true");

          // The SHAPE LIVES ON THE ROTATING ELEMENT. Keeping `clip-path` on the
          // outer box (an earlier cut) left the cross-hole stationary while the
          // texture slid around inside it, which reads as a shimmer rather than a
          // rotation. The fill is the star's own flat colour — no highlight by
          // request.
          //
          // Note the trade-off this creates: a flat-coloured plus is four-fold
          // symmetric, so its orientation is not readable and the spin can only be
          // seen as motion over time, not as a change in what the mark looks like.
          var inner = document.createElement("div");
          inner.className = "dsh-codex-particle__spin";
          inner.style.background = colour;
          outer.appendChild(inner);
          zone.appendChild(outer);

          // Birth, and then a TWINKLE rather than a flat hold: the published
          // star-field pattern is a multi-peak curve (brighten, dip, brighten
          // again, then fade), because a single symmetric swell is what makes an
          // animated field read as mechanical. Scale moves with brightness, since
          // a larger mark also reads as a brighter one.
          //
          // The two animations live on two elements: the outer owns scale and
          // opacity, the inner owns rotation — `transform` is one property, so a
          // single element cannot carry both.
          if (typeof outer.animate === "function") {
            outer.animate(
              [
                { opacity: 0, transform: "scale(0.3)" },
                { opacity: peak, transform: "scale(1)", offset: 0.09 },
                { opacity: peak * 0.62, transform: "scale(0.92)", offset: 0.22 },
                { opacity: peak, transform: "scale(1.06)", offset: 0.36 },
                { opacity: peak * 0.7, transform: "scale(0.95)", offset: 0.53 },
                { opacity: peak, transform: "scale(1)", offset: 0.7 },
                { opacity: peak * 0.5, transform: "scale(0.9)", offset: 0.86 },
                { opacity: 0, transform: "scale(0.4)" },
              ],
              { duration: life, easing: "ease-in-out", fill: "forwards" }
            );
          }
          if (typeof inner.animate === "function") {
            // ONE DIRECTION, constant rate, for the whole life: `linear` so no part
            // of the turn speeds up or slows down, and no `alternate` — a mark that
            // reverses reads as a wobble, not as spinning. `iterations: 1` with the
            // full angle baked in keeps it to a single unbroken sweep.
            inner.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(" + direction * spinSweep + "deg)" }], {
              duration: life,
              easing: "linear",
              fill: "forwards",
            });
          }

          var timer = setTimeout(function () {
            if (particles.stopped) return;
            if (typeof outer.remove === "function") outer.remove();
            // Wait a little before the replacement, so deaths and births are not
            // locked in step with each other.
            scheduleZone(zone, roll(200, 5000));
          }, life);
          particles.timers.push(timer);
        }

        function scheduleZone(zone, delay) {
          if (particles.stopped) return;
          var timer = setTimeout(function () {
            spawnStar(zone);
          }, delay);
          particles.timers.push(timer);
        }

        /** Fill both flank bands and return the disposer that empties them. */
        function startParticles(layer) {
          particles.stopped = false;
          particles.timers = [];
          var zones = layer.querySelectorAll(".dsh-codex-particle-zone");
          for (var z = 0; z < zones.length; z += 1) {
            for (var n = 0; n < STARS_PER_ZONE; n += 1) {
              scheduleZone(zones[z], 300 + Math.random() * 6000);
            }
          }
          return function () {
            particles.stopped = true;
            for (var i = 0; i < particles.timers.length; i += 1) clearTimeout(particles.timers[i]);
            particles.timers = [];
            var live = layer.querySelectorAll(".dsh-codex-particle");
            for (var j = 0; j < live.length; j += 1) live[j].remove();
          };
        }

        // ── 浮动泡泡（2026-09-21）──────────────────────────────────────────────
        /**
         * 泡泡引擎：每颗泡泡在「生成」的那一刻抽定 x、尺寸、浓度、颜色、上升时长，
         * 从面板底部长到顶边外，动画结束（animationend）即销毁并立刻重生一颗 ——
         * 重生时全部重新抽，所以每颗泡泡每次出现的位置都不一样。
         *
         * x 的概率分布按用户要求做成「统计学上中间多、两边少，但两边也要多少有一点」：
         * 取 BUBBLE_X_SAMPLES 个均匀随机数求平均 —— 2 个是三角分布（密度在中点最高、
         * 两端趋近 0 但可达），3 个更向中间集中，=1 就退回均匀分布。
         *
         * 三条硬约束（都是踩过的坑）：
         *   1) 回收时机由动画事件给出，不用定时器复刻时长；
         *   2) 泡泡挂在传进来的容器里，装饰层的直接子节点数保持 19（契约测试断言过）；
         *   3) 整个启动过程包 try/catch —— 装饰层不允许因为泡泡的异常而整体装不上。
         */
        var BUBBLE_COUNT = 20;
        /**
         * 尺寸改成整数、并抬上下限（2026-09-21 用户反馈「泡泡看起来不是圆的」）。
         *
         * 原因是锐边 + 尺寸过小 + 亚像素定位：3px 的实心圆在屏幕上只占 6 个物理像素
         * （DPR 2），再叠上 left 的百分比小数定位，栅格化后边缘会退化成方块感。
         * 修法：尺寸取整（Math.round）+ 下限抬到 4px 且只用偶数尺寸，让圆落在像素格上。
         */
        var BUBBLE_MIN_PX = 4;
        var BUBBLE_MAX_PX = 10;
        var BUBBLE_MIN_OPACITY = 0.1;
        var BUBBLE_MAX_OPACITY = 0.3;
        var BUBBLE_MIN_RISE_S = 45;
        var BUBBLE_MAX_RISE_S = 95;
        /**
         * 生成时的淡入时长（2026-09-21 用户：「泡泡出现时是瞬间刷新的，希望从透明逐渐变为不透明」）。
         * 只作用于「出生」这一段：透明度从 0 由缓出曲线升到该泡泡自己的峰值，之后保持不变。
         * 出生后立刻开始上浮，所以视觉上就是「在它该出现的位置慢慢显形，然后继续往上飘」。
         */
        var BUBBLE_FADE_MIN_S = 2.5;
        var BUBBLE_FADE_MAX_S = 5;
        /** 取几个均匀随机数求平均决定 x：2 = 三角分布（默认），3 = 更集中，1 = 均匀。 */
        var BUBBLE_X_SAMPLES = 2;
        /** 泡泡颜色：全部来自暖色调色板，避免出现冷色。 */
        var BUBBLE_COLOURS = ["#b1524e", "#d7827e", "#d9a05b", "#e8bfba"];

        /**
         * 泡泡的「正圆」是画出来的，不是靠 border-radius 切出来的。
         *
         * 2026-09-21 用户反馈「泡泡看起来不是圆的」：先前用的是「正方 div + border-radius:50%」，
         * 这条路依赖盒模型与宿主页面的圆角规则 —— 任何一条外部 CSS 改掉 border-radius，
         * 形状就退化成方块。现在改成 SVG 圆形当 background-image：几何由 SVG 自己保证，
         * 元素盒子是什么形状都不影响观感；颜色按泡泡各自的色值烘进 data URI。
         */
        var BUBBLE_FILLS = {};
        function bubbleFill(hex) {
          if (BUBBLE_FILLS[hex] === undefined) {
            BUBBLE_FILLS[hex] =
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23" +
              hex.slice(1) +
              "'/%3E%3C/svg%3E\")";
          }
          return BUBBLE_FILLS[hex];
        }

        /** 抽一个 x（百分比）：中间多、两边少，两端仍可达。 */
        function rollBubbleX() {
          var n = Math.max(1, BUBBLE_X_SAMPLES);
          var sum = 0;
          for (var i = 0; i < n; i += 1) sum += Math.random();
          return (sum / n) * 100;
        }

        /** 造一颗泡泡；动画结束后销毁并重新生成（x 重新抽）。 */
        function spawnBubble(host) {
          if (bubbles.stopped) return;
          // 偶数尺寸：直径落在整数像素上时，border-radius:50% 的圆边缘才不会被栅格化切方。
          var size = 2 * Math.round(roll(BUBBLE_MIN_PX, BUBBLE_MAX_PX) / 2);
          var duration = roll(BUBBLE_MIN_RISE_S, BUBBLE_MAX_RISE_S);
          // 负延迟：首屏的泡泡就散布在整条上升路径上，而不是全挤在底边一起出发。
          var offset = Math.random() * duration;
          var el = document.createElement("div");
          el.className = "dsh-codex-bubble";
          el.style.width = size.toFixed(1) + "px";
          el.style.height = size.toFixed(1) + "px";
          el.style.left = rollBubbleX().toFixed(2) + "%";
          el.style.opacity = roll(BUBBLE_MIN_OPACITY, BUBBLE_MAX_OPACITY).toFixed(2);
          var colour = BUBBLE_COLOURS[Math.floor(Math.random() * BUBBLE_COLOURS.length)];
          el.style.color = colour;                      // 兜底色：背景图万一不生效也不至于透明
          el.style.backgroundImage = bubbleFill(colour); // 真正的正圆（SVG circle）
          // 峰值浓度：既写成 opacity（无动画时的兜底），也写进 CSS 变量供淡入动画的 to 使用
          // —— 关键帧里直接用 opacity 会把每颗泡泡不同的浓度抹平成同一个值。
          var peak = roll(BUBBLE_MIN_OPACITY, BUBBLE_MAX_OPACITY);
          el.style.opacity = peak.toFixed(2);
          el.style.setProperty("--bubble-peak", peak.toFixed(2));
          var fade = roll(BUBBLE_FADE_MIN_S, BUBBLE_FADE_MAX_S);
          // 两个动画各用各的时长/延迟：① 上浮（负延迟，出生即散布在路径上的随机高度）
          // ② 淡入（从 0 开始，就是「出生」这一刻）
          el.style.animationDuration = duration.toFixed(1) + "s, " + fade.toFixed(1) + "s";
          el.style.animationDelay = (-offset).toFixed(1) + "s, 0s";
          var recycle = function (event) {
            // 元素上挂了两个动画，animationend 会来两次：只认上浮那一个，
            // 否则淡入结束（几秒后）就会把泡泡提前回收掉。
            if (event !== undefined && event.animationName !== undefined && event.animationName !== "dsh-codex-rise") return;
            if (bubbles.stopped) return;
            if (typeof el.remove === "function") el.remove();
            spawnBubble(host);
          };
          if (typeof el.addEventListener === "function") el.addEventListener("animationend", recycle);
          host.appendChild(el);
        }

        /** 铺满初始数量并返回清理函数。 */
        function startBubbles(host) {
          var noop = function () {};
          if (host === null || host === undefined || typeof host.appendChild !== "function") return noop;
          bubbles.stopped = false;
          // 尊重无障碍设置：开了「减弱动态效果」就不生成泡泡（静止的半透明点会像脏点）。
          var reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          if (reduced) return noop;
          try {
            for (var i = 0; i < BUBBLE_COUNT; i += 1) spawnBubble(host);
          } catch (error) {
            // 泡泡是纯装饰：这里出错就放弃它，绝不让异常冒上去把整个装饰层拖垮。
            bubbles.stopped = true;
            return noop;
          }
          return function () {
            bubbles.stopped = true;
            var live = host.querySelectorAll(".dsh-codex-bubble");
            for (var k = 0; k < live.length; k += 1) live[k].remove();
          };
        }

        // ── generated token dictionary (scripts/build.mjs) ────────────────────
        var TOKENS_LIGHT = /*:TOKENS_LIGHT:*/;
        var TOKENS_DARK = /*:TOKENS_DARK:*/;

        /**
         * Every generated token as a `{ light, dark }` pair. Both modes are
         * mandatory at this boundary even though the skin is dark-only, so a
         * `system` preference that resolves light never goes illegible.
         */
        function tokenPairs(light, dark) {
          var out = {};
          var names = Object.keys(dark);
          for (var i = 0; i < names.length; i += 1) {
            var name = names[i];
            out[name] = { light: light[name] !== undefined ? light[name] : dark[name], dark: dark[name] };
          }
          return out;
        }

        /** Decoration stylesheet, generated from the palette by scripts/build.mjs. */
        var DECO_CSS = /*:DECO:*/;

        /**
         * Tag the first and last flow item of every assistant run.
         *
         * The stylesheet needs to open and close one continuous slab per AI turn.
         * CSS alone cannot express "the first item whose previous sibling is not
         * the same kind of run": every sibling-combinator form was tested against
         * the live DOM and each one matched a single element instead of the six
         * run boundaries — `:not(A + B)`, `:not(:is(A + B))`, `:not(A:has(+B))`
         * and `:not(:has(~ B))` all returned exactly one hit. Rather than keep
         * guessing at selector semantics, the boundaries are computed here where
         * the neighbour relationship is unambiguous, exposed as two attributes,
         * and the CSS keys off those.
         */
        /**
         * Flow kinds that make up one assistant turn.
         *
         * `context` is the "上下文注入" chip. It renders immediately above the
         * reasoning rows of the same turn, so leaving it out split the slab: the
         * previous turn closed with its own rounded bottom edge and a fresh card
         * opened above the chip (this is the "开头还是不正常" report). The chip is
         * part of the turn's surface, not a separate object.
         */
        var AI_FLOW_KINDS = { "assistant-step": 1, "tool-call": 1, "turn-tail": 1, "turn-process": 1, context: 1, "model-retry": 1 };
        /**
         * Kinds that are metadata INSIDE a turn rather than its content.
         *
         * They belong to the slab's surface but never own its outline: the context
         * chip and the reasoning container are frameless rows, so the run's opening
         * role has to go to the first real content row. See markAiRuns.
         */
        var META_FLOW_KINDS = { context: 1, "turn-process": 1 };

        function markAiRuns() {
          if (typeof document === "undefined") return;
          var nodes = document.querySelectorAll("[data-chat-flow-kind]");
          // Pass 1: flag the VISIBLE row that ends each run.
          //
          // Visibility is part of this test on purpose. A hidden `turn-process`
          // (the reasoning container, which still occupies a 21px strip) is the last
          // DOM child of most runs, so a plain "next AI item is null" test marked the
          // hidden row as the end — and the closing corner was then drawn on a row
          // nobody can see, leaving the slab's visible bottom square. Measured: run 1
          // had `domFirst: turn-process (hidden, end)` and the first visible row
          // reported `border-top-left-radius: 0px`.
          // Pass 1: flag the row that ends each run.
          //
          // DOM-ONLY. The `[hidden]` attribute is the whole visibility test; an
          // earlier version also called `getBoundingClientRect()` on every node,
          // which forced synchronous layout across the transcript on every pass and
          // contributed to the interface becoming unusable. A hidden row is skipped
          // so the closing corner lands on the last row a reader can actually see.
          for (var i = 0; i < nodes.length; i += 1) {
            var el = nodes[i];
            if (!isAiFlowItem(el)) continue;
            if (!el.hasAttribute("hidden") && nextVisibleAiFlowItem(el) === null) el.setAttribute("data-codex-run-end", "");
            else el.removeAttribute("data-codex-run-end");
          }
          // Pass 2: assign the ROLE the stylesheet reads.
          //
          // Two rules, both learned from the same symptom ("ai 输出顶部还是没有圆角"):
          //
          //  1. Whichever row is the first VISIBLE one in a run carries the opening
          //     role, even when it is a meta row such as the context chip. Marking
          //     every meta row as a plain `seam` put the top corner on a row nobody
          //     sees.
          //  2. A HIDDEN row never carries a role that draws a corner. Giving a
          //     hidden row the closing role put the bottom radius on an invisible
          //     21px strip that is the run's last DOM child, so the slab's visible
          //     bottom stayed square and the radius sat on nothing.
          var seenVisible = false;
          for (var j = 0; j < nodes.length; j += 1) {
            var node = nodes[j];
            if (!isAiFlowItem(node)) {
              seenVisible = false;
              continue;
            }
            var hidden = node.hasAttribute("hidden");
            if (hidden) {
              node.setAttribute("data-codex-run", "seam");
              continue;
            }
            var isEnd = node.hasAttribute("data-codex-run-end");
            var opening = !seenVisible; // no VISIBLE row of this run seen yet
            seenVisible = true;
            var role;
            if (opening && isEnd) role = "both";
            else if (opening) role = "open";
            else if (isEnd) role = "end";
            else role = "mid";
            node.setAttribute("data-codex-run", role);
          }
        }

        function isAiFlowItem(el) {
          if (el === null || el === undefined || el.getAttribute === undefined) return false;
          var kind = el.getAttribute("data-chat-flow-kind");
          return kind !== null && AI_FLOW_KINDS[kind] === 1;
        }

        /**
         * Next sibling that belongs to the same assistant turn and is on screen.
         *
         * DOM-only on purpose: `[hidden]` is the visibility test. Calling
         * `getBoundingClientRect()` here forced synchronous layout for every node on
         * every marking pass — one of the causes of the unusable interface.
         */
        function nextVisibleAiFlowItem(el) {
          var node = el.nextElementSibling;
          while (node !== null) {
            if (isAiFlowItem(node)) {
              if (!node.hasAttribute("hidden")) return node;
              node = node.nextElementSibling;
              continue;
            }
            // A user bubble or any other kind ends the run.
            if (node.getAttribute("data-chat-flow-kind") !== null) return null;
            node = node.nextElementSibling;
          }
          return null;
        }

        /**
         * Mount the decoration INSIDE the conversation column, not on `body`.
         *
         * The shell is `…_frame` with two siblings that squeeze each other:
         * `…_sidebarCol` (280px, left) and `…_centerCol` (the conversation,
         * pushed right and narrowed when the sidebar opens). A layer parented to
         * `body` is the parent of both, so it spans the whole window and simply
         * does not move when the sidebar toggles — which is exactly the complaint.
         *
         * The conversation column has a TRANSPARENT background (verified: `…_frame`
         * is the one painting the page colour), so a `position:absolute; inset:0;
         * z-index:-1` child paints above that colour and below the content.
         * Parented there, the decoration follows the column: it is clipped when
         * the column narrows and grows when it widens, with no runtime measuring.
         */
        function mountLayer() {
          if (typeof document === "undefined") return null;
          var layer = document.getElementById(DECO_ID);
          var host = document.querySelector('[class*="centerCol"], [class*="scrollBody"]');
          if (layer === null || host === null) return layer;
          // The conversation panel carries NO positioning of its own, so every
          // absolute descendant resolves against an ancestor instead — measured
          // live twice: the layer came out at left=0/width=2532 while the panel is
          // left=280/width=2252, and a `position:relative` WRAPPER did not help
          // because the wrapper itself was absolute. The only fix is to give the
          // panel a positioning context: `position:relative` with `z-index:auto`
          // creates no stacking context, so a `z-index:-1` child still paints
          // above the panel's background and below its content.
          if (host.style.position !== "relative") host.style.position = "relative";
          var anchor = document.getElementById(ANCHOR_ID);
          if (anchor !== null) anchor.remove();
          if (layer.parentElement !== host) host.insertBefore(layer, host.firstChild);
          return layer;
        }

        /**
         * Remove the run-marker attributes a previous revision stamped.
         *
         * That revision styled one continuous card per assistant turn and tagged the
         * rows to do it. The styling has been rolled back, so nothing reads these
         * attributes any more — but the ones already in the DOM would survive a hot
         * reload and confuse anyone inspecting the transcript later. Clearing them
         * once at activation keeps the DOM honest.
         */
        function clearStaleRunMarkers() {
          if (typeof document === "undefined") return;
          var stale = document.querySelectorAll("[data-codex-run], [data-codex-run-end]");
          for (var i = 0; i < stale.length; i += 1) {
            stale[i].removeAttribute("data-codex-run");
            stale[i].removeAttribute("data-codex-run-end");
          }
        }

        /**
         * Sweep the stale markers for a few seconds after activation.
         *
         * The transcript mounts asynchronously, so a single sweep inside installDeco
         * runs before the rows exist and finds nothing. This bounded window covers
         * the render without leaving a permanent timer behind.
         */
        function sweepStaleRunMarkers() {
          var passes = 0;
          var timer = setInterval(function () {
            passes += 1;
            clearStaleRunMarkers();
            if (passes >= 10) clearInterval(timer);
          }, 500);
        }

        function installDeco() {
          if (typeof document === "undefined") return;
          clearStaleRunMarkers();
          sweepStaleRunMarkers();
          if (document.getElementById(STYLE_ID) === null) {
            var tag = document.createElement("style");
            tag.id = STYLE_ID;
            tag.dataset.plugin = "dsh_skin_blossom";
            tag.textContent = DECO_CSS;
            document.head.appendChild(tag);
          }
          if (document.getElementById(DECO_ID) === null) {
            var layer = document.createElement("div");
            layer.id = DECO_ID;
            layer.className = "dsh-codex-deco";
            layer.setAttribute("aria-hidden", "true");
            // 泡泡容器按引用记下来（引擎不做 DOM 查询，测试假 DOM 不支持查询）。
            var bubbleHost = null;
            for (var i = 0; i < DECO_PARTS.length; i += 1) {
              var part = document.createElement("div");
              part.className = DECO_PARTS[i];
              layer.appendChild(part);
              if (DECO_PARTS[i].indexOf("dsh-codex-deco__dots") >= 0) bubbleHost = part;
            }
            // Provisional parent: the shell may not have mounted yet, and the
            // mountLayer pass below moves it into the conversation column as soon
            // as that element exists.
            document.body.appendChild(layer);
            // Started once, on the element that outlives every re-mount: the
            // disposer rides on the node so teardown can stop the engine.
            layer.__stopParticles = startParticles(layer);
            layer.__stopBubbles = startBubbles(bubbleHost);
          }
          mountLayer();
          // The shell mounts asynchronously, so keep trying for a while rather
          // than only once at plugin activation. The transcript is rendered after
          // this point, so the stale-marker sweep rides this loop instead of running
          // once at activation (where it found nothing to clean).
          var tries = 0;
          var timer = setInterval(function () {
            tries += 1;
            mountLayer();
            clearStaleRunMarkers();
            if (tries >= 20) clearInterval(timer);
          }, 400);
          // Run boundaries are re-marked on a slow tick rather than through a
          // MutationObserver: the transcript re-renders constantly while a turn
          // streams, and the re-render also replaces elements the observer would
          // have to re-subscribe to. A 600ms pass over ~110 nodes is cheaper than
          // that bookkeeping and cannot desynchronise.
          var mounted = mountLayer();
          if (mounted !== null && mounted !== undefined) {
            if (mounted.__runsTimer !== undefined) clearInterval(mounted.__runsTimer);
            mounted.__runsTimer = setInterval(markAiRuns, 1500);
          }
          markAiRuns();
        }

        /*
         * No layout tracking any more. The previous revision measured the
         * sidebar's edge at runtime and wrote `--dsh-deco-lx/rx` so a body-parented
         * layer could fake alignment; parenting the layer to the conversation
         * column makes all of that unnecessary — the column is the thing that
         * moves, so anything inside it moves with it for free.
         */

        // ── Settings → General row ────────────────────────────────────────────
        var ROW_STYLE = {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "4px 0"
        };
        var TEXT_STYLE = { display: "flex", flexDirection: "column", gap: "2px", minWidth: "0" };
        var TITLE_STYLE = {
          color: "var(--dsw-alias-label-primary)",
          fontSize: "14px",
          lineHeight: "22px"
        };
        var DESC_STYLE = {
          color: "var(--dsw-alias-label-tertiary)",
          fontSize: "12px",
          lineHeight: "18px"
        };
        var PILL_STYLE = {
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          flex: "none",
          padding: "3px 10px",
          borderRadius: "999px",
          cornerShape: "round",
          border: "1px solid var(--dsw-alias-border-l2)",
          background: "var(--dsw-alias-bg-module-platform)",
          color: "var(--dsw-alias-label-secondary)",
          fontFamily: "inherit",
          fontSize: "12px",
          lineHeight: "18px",
          cursor: "pointer",
          userSelect: "none"
        };
        var DOT_STYLE = {
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          cornerShape: "round",
          flex: "none"
        };

        /** Remember an explicit choice so default activation never overrides it. */
        function markUserChoice() {
          try {
            sessionStorage.setItem("dsh_skin_blossom:user-choice", "1");
          } catch (error) {
            /* storage may be unavailable; the skin simply stays opt-out-by-choice-free */
          }
        }

        function CodexSkinRow(props) {
          var pair = react.useState(0);
          var setTick = pair[1];

          // Re-render on every theme change so the pill reflects the live theme.
          react.useEffect(function () {
            return props.ctx === undefined || props.ctx.on === undefined
              ? undefined
              : props.ctx.on("theme/change", function () {
                  setTick(function (n) {
                    return n + 1;
                  });
                });
          }, []);

          var theme = props.ctx !== undefined && props.ctx.theme !== undefined ? props.ctx.theme : null;
          var snapshot = theme !== null ? theme.getTheme() : null;
          var active = snapshot !== null ? snapshot.active.id : "unknown";
          var hasSkin = snapshot !== null && snapshot.themes.some(function (t) {
            return t.id === THEME_ID;
          });
          var on = active === THEME_ID;

          var handleClick = function () {
            if (theme === null) return;
            markUserChoice();
            try {
              theme.setTheme(on ? "light" : THEME_ID);
            } catch (error) {
              console.warn("[dsh_skin_blossom] setTheme failed:", error);
            }
          };

          var dot = Object.assign({}, DOT_STYLE, {
            background: on ? "var(--dsw-alias-brand-primary)" : "var(--dsw-alias-label-dimmed)"
          });

          return react.createElement(
            "div",
            { id: "dsh_skin_blossom-row", style: ROW_STYLE },
            react.createElement(
              "div",
              { style: TEXT_STYLE },
              react.createElement("div", { style: TITLE_STYLE }, "dsh_skin_blossom（Rose Pine Dawn）"),
              react.createElement(
                "div",
                { style: DESC_STYLE },
                hasSkin
                  ? "当前主题：" + active + "。点击右侧在 Blossom 与内置 dark 之间切换，或使用上方「外观」。"
                  : "主题未注册：请检查插件是否已启用。"
              )
            ),
            react.createElement(
              "button",
              {
                type: "button",
                onClick: handleClick,
                disabled: !hasSkin,
                style: Object.assign({}, PILL_STYLE, { opacity: hasSkin ? 1 : 0.5 }),
                title: "codex-theme-v1"
              },
              react.createElement("span", { style: dot }),
              react.createElement("span", null, on ? "已启用" : "点击启用")
            )
          );
        }

        // ── plugin body ───────────────────────────────────────────────────────
        function apply(ctx) {
          var pairs = tokenPairs(TOKENS_LIGHT, TOKENS_DARK);

          ctx.effect(function () {
            var offTheme = ctx.theme.register({
              id: THEME_ID,
              colorScheme: "light",
              tokens: TOKENS_LIGHT
            });
            var offOverride = ctx.theme.overrideTokens("dsh_skin_blossom", pairs);
            installDeco();
            return function () {
              offOverride();
              offTheme();
              var tag = typeof document !== "undefined" ? document.getElementById(STYLE_ID) : null;
              if (tag !== null) tag.remove();
              var layer = typeof document !== "undefined" ? document.getElementById(DECO_ID) : null;
              if (layer !== null) {
                // Stop the particle engine first: its timers hold references to
                // live nodes, and letting it run into a removed layer would leak
                // both the timers and the elements.
                if (typeof layer.__stopParticles === "function") layer.__stopParticles();
                if (typeof layer.__stopBubbles === "function") layer.__stopBubbles();
                if (layer.__runsTimer !== undefined) clearInterval(layer.__runsTimer);
                layer.remove();
              }
              var anchor = typeof document !== "undefined" ? document.getElementById(ANCHOR_ID) : null;
              if (anchor !== null) anchor.remove();
            };
          }, "dsh_skin_blossom: theme + deco");

          // Opt-in by default, without depending on timing: the skin claims the
          // session as soon as any snapshot arrives where the durable preference
          // is still a built-in one. A choice the user makes in this tab (the
          // Appearance cubes or our own row) is remembered in sessionStorage, so
          // the user's pick wins for the rest of the tab's life while a fresh tab
          // still gets the skin.
          ctx.effect(function () {
            var done = false;
            var STICKY_KEY = "dsh_skin_blossom:user-choice";
            var sticky = function () {
              try {
                return sessionStorage.getItem(STICKY_KEY) !== null;
              } catch (error) {
                return false;
              }
            };
            var settle = function () {
              if (done) return;
              var current = ctx.theme.getTheme();
              var known = current.themes.some(function (t) {
                return t.id === THEME_ID;
              });
              if (!known) return;
              var builtIn =
                current.preference === "system" ||
                current.preference === "light" ||
                current.preference === "dark";
              if (!builtIn || sticky()) {
                done = true;
                return;
              }
              try {
                ctx.theme.setTheme(THEME_ID);
                done = true;
                console.info("[dsh_skin_blossom] codex-theme-v1 active");
              } catch (error) {
                console.warn("[dsh_skin_blossom] activation failed, theme left untouched:", error);
              }
            };
            settle();
            var off = ctx.on("theme/change", settle);
            return function () {
              off();
            };
          }, "dsh_skin_blossom: default activation");

          ctx.effect(function () {
            return ctx.locale.register(SETTINGS_NS, {
              zh: {
                title: "dsh_skin_blossom（Rose Pine Dawn）",
                on: "已启用",
                off: "点击启用"
              },
              en: {
                title: "dsh_skin_blossom (Rose Pine Dawn)",
                on: "Active",
                off: "Enable"
              }
            });
          }, "dsh_skin_blossom: settings dictionaries");

          ctx.slots.inject("settings.general.item", function () {
            return ctx.slots.register(
              {
                name: "settings.general.item",
                id: "codex-skin",
                order: 12
              },
              CodexSkinRow
            );
          });
        }

        exports.name = "dsh_skin_blossom";
        exports.inject = inject;
        exports.apply = apply;
        exports.THEME_ID = THEME_ID;
        return module.exports;
      }
    });
  } catch (err) {
    console.warn("[dsh_skin_blossom] client runtime error:", err);
  }
})();
