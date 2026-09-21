/**
 * peach-fizz — browser half.
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
      id: "peach-fizz",
      factory: (require) => {
        var module = { exports: {} };
        var exports = module.exports;
        Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

        var react = require("react");

        // ui-theme provides `theme`; the Settings row needs `slots` and `locale`.
        var inject = ["theme", "slots", "locale"];

        var THEME_ID = "codex-theme-v1";
        // Theme name: 桃子气泡水（Peach Fizz）. THEME_ID stays `codex-theme-v1` on purpose — it is the
        // identifier written into the Codex theme config, and renaming it would break
        // configurations already pointing at it.
        var THEME_LABEL = "桃子气泡水";
        var SETTINGS_NS = "settings.codex-skin";
        var STYLE_ID = "peach-fizz-style";
        var DECO_ID = "peach-fizz-deco";
        var ANCHOR_ID = "peach-fizz-anchor";
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
          ...[
                  "dsh-codex-deco__star dsh-codex-deco__star--sm dsh-codex-deco__star--rose-soft dsh-codex-deco__star--t1 dsh-codex-deco__star--sway",
                  "dsh-codex-deco__star dsh-codex-deco__star--md dsh-codex-deco__star--rose dsh-codex-deco__star--t2 dsh-codex-deco__star--sway",
                  "dsh-codex-deco__star dsh-codex-deco__star--sm dsh-codex-deco__star--rose dsh-codex-deco__star--t3 dsh-codex-deco__star--sway",
                  "dsh-codex-deco__star dsh-codex-deco__star--md dsh-codex-deco__star--rose dsh-codex-deco__star--t4 dsh-codex-deco__star--sway",
                  "dsh-codex-deco__star dsh-codex-deco__star--sm dsh-codex-deco__star--ochre dsh-codex-deco__star--t5 dsh-codex-deco__star--sway"
        ]
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
         * 显形段占寿命的比例：从透明涨到满亮度所花的时间 = life × 这个值。
         *
         * 2026-09-21 用户：「他们的显形速度有些过慢了，希望加快大约一倍」
         *   → 0.09 → 0.045。按寿命 42–96s 算，显形时间由 3.8–8.6s 变成 1.9–4.3s。
         * 只压缩「显形」这一段；之后的闪烁/呼吸曲线（0.22 / 0.36 / 0.53 / 0.7 / 0.86）
         * 位置不动，所以中后期的节奏与观感不变。
         */
        var STAR_EMERGE_FRACTION = 0.045;
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
          /**
           * 位置一律用百分比（2026-09-21）。原来存的是 px，而 px 是相对「当时的盒子」算的：
           * 层刚建立时还挂在 body 上，zone 的盒子是整个视口；等 mountLayer 把它移进对话栏
           * （更窄、且整体右移）之后，那些 px 就落到错的位置，右侧那带甚至会跑到面板外，
           * 只能等自然重生（42–96s）才回位 —— 这就是用户反馈的「第一次打开页面有些迟钝」。
           * 百分比与挂载时机、窗口尺寸都无关，从根上杜绝这类换算问题（泡泡也是这么做的）。
           */
          var maxXPct = Math.max(0, 1 - size / box.width);
          var maxYPct = Math.max(0, 1 - size / box.height);
          for (var attempt = 0; attempt < REJECTION_TRIES; attempt += 1) {
            var x = roll(0, maxXPct);
            var y = roll(0, maxYPct);
            // 重叠判定需要真实距离，这里按当前盒子把百分比换算回 px 再比（只在本次判定里用，
            // 不落盘，所以不会再产生「存下来的 px 会过期」的问题）。
            var cx = x * box.width + size / 2;
            var cy = y * box.height + size / 2;
            var clash = false;
            for (var i = 0; i < existing.length; i += 1) {
              var other = existing[i];
              var ow = Number.parseFloat(other.style.width) || size;
              var oh = Number.parseFloat(other.style.height) || size;
              var ox = (Number.parseFloat(other.style.left) / 100 || 0) * box.width + ow / 2;
              var oy = (Number.parseFloat(other.style.top) / 100 || 0) * box.height + oh / 2;
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
          // x/y 是 0..1 的比例，写入即百分比 —— 见 pickPosition 的注释。
          outer.style.left = (x * 100).toFixed(3) + "%";
          outer.style.top = (y * 100).toFixed(3) + "%";
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
                { opacity: peak, transform: "scale(1)", offset: STAR_EMERGE_FRACTION },
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
              // 首批不排队（2026-09-21 用户：「泡泡可以迅速加载第一批，十字星却要等一段时间」）。
              // 原来这里是 `300 + Math.random() * 6000`，12 颗被撒在 0.3–6.3 秒之间，所以刚启动时
              // 画面上一颗都没有。改成 0 延迟后首批立即出生；出生后的显形曲线（寿命的前 9%）
              // 与后续重生的随机间隔都保持原样，稳态观感不变。
              scheduleZone(zones[z], 0);
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
        var TOKENS_LIGHT = {
          "--dsw-static-neutral-bluish-1000": "#fffaf3",
          "--dsw-static-neutral-bluish-950": "#ede7e4",
          "--dsw-static-neutral-bluish-900": "#ede7e4",
          "--dsw-static-neutral-bluish-875": "#ede7e4",
          "--dsw-static-neutral-bluish-850": "#ebe5e3",
          "--dsw-static-neutral-bluish-800": "#e6e1df",
          "--dsw-static-neutral-bluish-750": "#ded8d9",
          "--dsw-static-neutral-800": "#ebe5e3",
          "--dsw-static-neutral-850": "#ebe5e3",
          "--dsw-static-neutral-900": "#faf4ed",
          "--dsw-static-neutral-1000": "#faf4ed",
          "--dsw-static-neutral-bluish-50": "#575279",
          "--dsw-static-neutral-bluish-100": "#5f5273",
          "--dsw-static-neutral-bluish-300": "#6e6a86",
          "--dsw-static-neutral-bluish-400": "#5f5273",
          "--dsw-static-neutral-bluish-600": "#797593",
          "--dsw-static-neutral-bluish-700": "#8a86a3",
          "--dsw-static-neutral-bluish-500": "#797593",
          "--dsw-static-deepseek-450": "#d7827e",
          "--dsw-static-deepseek-400": "#b1524e",
          "--dsw-static-deepseek-500": "#b1524e",
          "--dsw-static-deepseek-200": "#e8bfba",
          "--dsw-static-deepseek-100": "#f4d9d6",
          "--dsw-static-deepseek-800": "#b7767d",
          "--dsw-static-deepseek-900": "#c87c7d",
          "--dsw-static-deepseek-50": "#f6e6e0",
          "--dsw-static-deepseek-300": "#91687b",
          "--dsw-static-blue-400": "#6d5587",
          "--dsw-static-blue-450": "#907aa9",
          "--dsw-static-blue-500": "#907aa9",
          "--dsw-static-blue-800": "#796a96",
          "--dsw-static-blue-900": "#e9e0e2",
          "--dsw-static-green-500": "#3f6e78",
          "--dsw-static-green-400": "#56949f",
          "--dsw-static-green-900": "#e3e7e2",
          "--dsw-static-red-400": "#b1524e",
          "--dsw-static-red-500": "#b1524e",
          "--dsw-static-red-600": "#805266",
          "--dsw-static-red-900": "#f4e2db",
          "--dsw-static-amber-400": "#8a5a12",
          "--dsw-static-amber-500": "#8a5a12",
          "--dsw-static-amber-600": "#79510f",
          "--dsw-static-amber-900": "#f5e6cf",
          "--dsw-static-neutral-700": "#d6d0d3",
          "--dsw-static-neutral-600": "#c3bdc6",
          "--dsw-static-neutral-550": "#b2adba",
          "--dsw-alias-bg-base": "var(--dsw-static-neutral-bluish-1000)",
          "--dsw-alias-bg-layer-1": "var(--dsw-static-neutral-bluish-900)",
          "--dsw-alias-bg-layer-2": "var(--dsw-static-neutral-bluish-850)",
          "--dsw-alias-bg-layer-3": "var(--dsw-static-neutral-bluish-800)",
          "--dsw-alias-bg-module-platform": "var(--dsw-static-neutral-bluish-800)",
          "--dsw-alias-bg-overlay": "var(--dsw-static-neutral-bluish-750)",
          "--dsw-alias-bg-multi-select": "var(--dsw-static-neutral-850)",
          "--dsw-alias-bg-mask-1": "color-mix(in srgb, #575279 24%, transparent)",
          "--dsw-alias-bg-mask-3": "color-mix(in srgb, #575279 34%, transparent)",
          "--dsw-alias-bg-mask-drop": "color-mix(in srgb, #fffaf3 82%, transparent)",
          "--dsw-alias-bg-skeleton": "color-mix(in srgb, #575279 7%, transparent)",
          "--dsw-alias-label-primary": "var(--dsw-static-neutral-bluish-50)",
          "--dsw-alias-label-primary-dimmed": "var(--dsw-static-neutral-bluish-100)",
          "--dsw-alias-label-primary-inverted": "var(--dsw-static-neutral-bluish-800)",
          "--dsw-alias-label-primary-foreground": "#1f1d2e",
          "--dsw-alias-label-primary-bluish": "var(--dsw-static-neutral-bluish-50)",
          "--dsw-alias-label-secondary": "var(--dsw-static-neutral-bluish-300)",
          "--dsw-alias-label-tertiary": "var(--dsw-static-neutral-bluish-400)",
          "--dsw-alias-label-caption": "var(--dsw-static-neutral-bluish-600)",
          "--dsw-alias-label-dimmed": "var(--dsw-static-neutral-bluish-500)",
          "--dsw-alias-brand-primary": "#d7827e",
          "--dsw-alias-brand-primary-invert": "#d7827e",
          "--dsw-alias-brand-text": "#b1524e",
          "--dsw-alias-link": "#b1524e",
          "--dsw-alias-button-primary-fill": "#d7827e",
          "--dsw-alias-button-primary-hover": "#6e5b7a",
          "--dsw-alias-button-primary-dimmed": "#e8bfba",
          "--dsw-alias-button-contrast-fill": "var(--dsw-static-neutral-bluish-50)",
          "--dsw-alias-button-elevated-fill": "var(--dsw-static-neutral-bluish-750)",
          "--dsw-alias-button-floating-fill": "var(--dsw-static-neutral-bluish-850)",
          "--dsw-alias-button-floating-hover": "var(--dsw-static-neutral-bluish-800)",
          "--dsw-alias-button-ghost-active-fill": "var(--dsw-static-neutral-bluish-750)",
          "--dsw-alias-button-ghost-active-hover": "var(--dsw-static-neutral-bluish-700)",
          "--dsw-alias-button-ghost-active-border": "#e8bfba",
          "--dsw-alias-button-info-fill": "var(--dsw-static-deepseek-500)",
          "--dsw-alias-button-info-hover": "var(--dsw-static-deepseek-400)",
          "--dsw-alias-border-l1": "color-mix(in srgb, #575279 9%, transparent)",
          "--dsw-alias-border-l2": "color-mix(in srgb, #575279 17%, transparent)",
          "--dsw-alias-border-l2-darkmode-thin": "color-mix(in srgb, #575279 12%, transparent)",
          "--dsw-alias-border-l3": "color-mix(in srgb, #575279 23%, transparent)",
          "--dsw-alias-border-l4": "color-mix(in srgb, #575279 31%, transparent)",
          "--dsw-alias-border-inverted": "color-mix(in srgb, #575279 13%, transparent)",
          "--dsw-alias-border-inverted2": "color-mix(in srgb, #575279 10%, transparent)",
          "--dsw-alias-interactive-bg-hover": "color-mix(in srgb, #d7827e 16%, transparent)",
          "--dsw-alias-interactive-bg-hover-accent": "#f2dbd5",
          "--dsw-alias-interactive-bg-hover-solid": "#ede7e4",
          "--dsw-alias-interactive-bg-hover-danger": "color-mix(in srgb, #b1524e 16%, transparent)",
          "--dsw-alias-interactive-bg-active": "#eecdc7",
          "--dsw-alias-markdown-code-block": "#f2e9e1",
          "--dsw-alias-markdown-code-block-banner": "#ebe0d8",
          "--dsw-alias-markdown-inline-code": "#ede7e4",
          "--dsw-alias-markdown-tag": "#ede7e4",
          "--dsw-alias-markdown-placeholder": "#ede7e4",
          "--dsw-alias-markdown-citation": "#ede7e4",
          "--dsw-alias-markdown-code-segment-selected": "#ebe0d8",
          "--dsw-alias-markdown-code-segment-unselected": "#f2e9e1",
          "--dsw-alias-scrollbar-bg-l1": "#d6d0d3",
          "--dsw-alias-scrollbar-bg-l2": "#c9c3ca",
          "--dsw-alias-scrollbar-hover-l1": "#b2adba",
          "--dsw-alias-scrollbar-hover-l2": "#a9a3b3",
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
          "--dsw-alias-toast-bg": "var(--dsw-static-neutral-bluish-750)",
          "--dsw-alias-tooltip-bg": "var(--dsw-static-neutral-800)",
          "--dsw-specific-bubble": "#fbe9e6",
          "--dsw-specific-bubble-highlight": "color-mix(in srgb, #d7827e 26%, transparent)",
          "--dsw-specific-input-major": "var(--dsw-static-neutral-bluish-950)",
          "--dsw-specific-login-input": "var(--dsw-static-neutral-bluish-900)",
          "--dsw-specific-menu": "var(--dsw-alias-bg-layer-3)",
          "--dsw-specific-selector": "var(--dsw-static-neutral-bluish-850)",
          "--dsw-specific-sidebar-fill": "var(--dsw-static-neutral-bluish-950)",
          "--dsw-specific-sidebar-nav-item-active": "#eecdc7",
          "--dsw-specific-sidebar-nav-item-active-accent": "color-mix(in srgb, #d7827e 60%, transparent)",
          "--dsw-specific-sidebar-nav-item-hover": "#f2dbd5",
          "--dsw-specific-tip": "var(--dsw-static-neutral-bluish-850)",
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
          "--dsh-codex-surface": "#faf4ed",
          "--dsh-codex-ink": "#575279",
          "--dsh-codex-accent": "#d7827e",
          "--dsh-codex-diff-added": "#56949f",
          "--dsh-codex-diff-removed": "#797593",
          "--dsh-codex-skill": "#907aa9",
          "--dsh-codex-scrollbar": "#ccc7cd",
          "--dsw-font-family": "\"Inter\", \"Segoe UI Variable Text\", \"Segoe UI\", system-ui, sans-serif",
          "--dsw-font-markdown-base-font-family": "\"Inter\", \"Segoe UI Variable Text\", \"Segoe UI\", system-ui, sans-serif",
          "--dsw-font-markdown-code-font-family": "\"JetBrains Mono\", \"Cascadia Mono\", Consolas, ui-monospace, monospace",
          "--dsw-font-markdown-code-block-font-family": "\"JetBrains Mono\", \"Cascadia Mono\", Consolas, ui-monospace, monospace",
          "--dsh-codex-rose-01": "#79510f",
          "--dsh-codex-rose-02": "#805266",
          "--dsh-codex-rose-03": "#8a5a12",
          "--dsh-codex-rose-04": "#b1524e",
          "--dsh-codex-rose-05": "#91687b",
          "--dsh-codex-rose-06": "#b7767d",
          "--dsh-codex-rose-07": "#c87c7d",
          "--dsh-codex-rose-08": "#d7827e",
          "--dsh-codex-rose-09": "#e8bfba",
          "--dsh-codex-rose-10": "#f4d9d6",
          "--dsh-codex-rose-11": "#f4e2db",
          "--dsh-codex-rose-12": "#f5e6cf",
          "--dsh-codex-rose-13": "#f6e6e0",
          "--dsh-codex-rose-14": "#faf4ed",
          "--dsh-codex-rose-count": "14",
          "--dsh-codex-violet-01": "#575279",
          "--dsh-codex-violet-02": "#5f5273",
          "--dsh-codex-violet-03": "#6d5587",
          "--dsh-codex-violet-04": "#6e6a86",
          "--dsh-codex-violet-05": "#796a96",
          "--dsh-codex-violet-06": "#797593",
          "--dsh-codex-violet-07": "#907aa9",
          "--dsh-codex-violet-08": "#8a86a3",
          "--dsh-codex-violet-count": "8",
          "--dsh-codex-teal-01": "#3f6e78",
          "--dsh-codex-teal-02": "#56949f",
          "--dsh-codex-teal-count": "2",
          "--dsh-codex-ochre-01": "#79510f",
          "--dsh-codex-ochre-02": "#8a5a12",
          "--dsh-codex-ochre-03": "#b1524e",
          "--dsh-codex-ochre-04": "#d7827e",
          "--dsh-codex-ochre-count": "4",
          "--dsh-codex-neutral-01": "#b2adba",
          "--dsh-codex-neutral-02": "#c3bdc6",
          "--dsh-codex-neutral-03": "#d6d0d3",
          "--dsh-codex-neutral-04": "#ded8d9",
          "--dsh-codex-neutral-05": "#e6e1df",
          "--dsh-codex-neutral-06": "#e9e0e2",
          "--dsh-codex-neutral-07": "#e3e7e2",
          "--dsh-codex-neutral-08": "#ebe5e3",
          "--dsh-codex-neutral-09": "#ede7e4",
          "--dsh-codex-neutral-10": "#fffaf3",
          "--dsh-codex-neutral-count": "10"
        };
        var TOKENS_DARK = {
          "--dsw-static-neutral-bluish-1000": "#0b0b0f",
          "--dsw-static-neutral-bluish-950": "#0b0b0f",
          "--dsw-static-neutral-bluish-900": "#151519",
          "--dsw-static-neutral-bluish-875": "#151519",
          "--dsw-static-neutral-bluish-850": "#1d1d20",
          "--dsw-static-neutral-bluish-800": "#242428",
          "--dsw-static-neutral-bluish-750": "#2e2e31",
          "--dsw-static-neutral-800": "#21262d",
          "--dsw-static-neutral-850": "#1d1d20",
          "--dsw-static-neutral-900": "#0b0b0f",
          "--dsw-static-neutral-1000": "#0b0b0f",
          "--dsw-static-neutral-bluish-50": "#e6e6e6",
          "--dsw-static-neutral-bluish-100": "#b6b6b7",
          "--dsw-static-neutral-bluish-300": "#b6b6b7",
          "--dsw-static-neutral-bluish-400": "#939394",
          "--dsw-static-neutral-bluish-600": "#79797b",
          "--dsw-static-neutral-bluish-700": "#79797b",
          "--dsw-static-neutral-bluish-500": "#838385",
          "--dsw-static-deepseek-450": "#f9b98c",
          "--dsw-static-deepseek-400": "#f9b98c",
          "--dsw-static-deepseek-500": "#f9b98c",
          "--dsw-static-deepseek-200": "#8e6b54",
          "--dsw-static-deepseek-100": "#523f35",
          "--dsw-static-deepseek-800": "#2c2321",
          "--dsw-static-deepseek-900": "#231c1c",
          "--dsw-static-deepseek-50": "#1e1919",
          "--dsw-static-deepseek-300": "#b28567",
          "--dsw-static-blue-400": "#479ffa",
          "--dsw-static-blue-450": "#479ffa",
          "--dsw-static-blue-500": "#479ffa",
          "--dsw-static-blue-800": "#152335",
          "--dsw-static-blue-900": "#111a27",
          "--dsw-static-green-500": "#40c977",
          "--dsw-static-green-400": "#40c977",
          "--dsw-static-green-900": "#12261e",
          "--dsw-static-red-400": "#fa423e",
          "--dsw-static-red-500": "#fa423e",
          "--dsw-static-red-600": "#fa423e",
          "--dsw-static-red-900": "#2c1316",
          "--dsw-static-amber-400": "#f7ad31",
          "--dsw-static-amber-500": "#f59e0b",
          "--dsw-static-amber-600": "#dd8629",
          "--dsw-static-amber-900": "#2a2013",
          "--dsw-static-neutral-700": "#2e2e31",
          "--dsw-static-neutral-600": "#444447",
          "--dsw-static-neutral-550": "#555558",
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
          "--dsw-alias-label-primary": "var(--dsw-static-neutral-bluish-50)",
          "--dsw-alias-label-primary-dimmed": "var(--dsw-static-neutral-bluish-100)",
          "--dsw-alias-label-primary-inverted": "var(--dsw-static-neutral-bluish-800)",
          "--dsw-alias-label-primary-foreground": "var(--dsw-static-neutral-bluish-1000)",
          "--dsw-alias-label-primary-bluish": "var(--dsw-static-neutral-bluish-50)",
          "--dsw-alias-label-secondary": "var(--dsw-static-neutral-bluish-300)",
          "--dsw-alias-label-tertiary": "var(--dsw-static-neutral-bluish-400)",
          "--dsw-alias-label-caption": "var(--dsw-static-neutral-bluish-600)",
          "--dsw-alias-label-dimmed": "var(--dsw-static-neutral-bluish-500)",
          "--dsw-alias-brand-primary": "#f9b98c",
          "--dsw-alias-brand-primary-invert": "#f9b98c",
          "--dsw-alias-brand-text": "#f9b98c",
          "--dsw-alias-link": "#f9b98c",
          "--dsw-alias-button-primary-fill": "#f9b98c",
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
          "--dsw-alias-border-l1": "color-mix(in srgb, #e6e6e6 8%, transparent)",
          "--dsw-alias-border-l2": "color-mix(in srgb, #e6e6e6 13%, transparent)",
          "--dsw-alias-border-l2-darkmode-thin": "color-mix(in srgb, #e6e6e6 9%, transparent)",
          "--dsw-alias-border-l3": "color-mix(in srgb, #e6e6e6 18%, transparent)",
          "--dsw-alias-border-l4": "color-mix(in srgb, #e6e6e6 24%, transparent)",
          "--dsw-alias-border-inverted": "color-mix(in srgb, #e6e6e6 12%, transparent)",
          "--dsw-alias-border-inverted2": "color-mix(in srgb, #e6e6e6 10%, transparent)",
          "--dsw-alias-interactive-bg-hover": "color-mix(in srgb, #f9b98c 10%, transparent)",
          "--dsw-alias-interactive-bg-hover-accent": "color-mix(in srgb, #f9b98c 16%, transparent)",
          "--dsw-alias-interactive-bg-hover-solid": "var(--dsw-static-neutral-bluish-800)",
          "--dsw-alias-interactive-bg-hover-danger": "color-mix(in srgb, #fa423e 14%, transparent)",
          "--dsw-alias-interactive-bg-active": "color-mix(in srgb, #f9b98c 22%, transparent)",
          "--dsw-alias-markdown-code-block": "var(--dsw-static-neutral-bluish-900)",
          "--dsw-alias-markdown-code-block-banner": "var(--dsw-static-neutral-bluish-850)",
          "--dsw-alias-markdown-inline-code": "var(--dsw-static-neutral-800)",
          "--dsw-alias-markdown-tag": "var(--dsw-static-neutral-bluish-850)",
          "--dsw-alias-markdown-placeholder": "var(--dsw-static-neutral-bluish-850)",
          "--dsw-alias-markdown-citation": "var(--dsw-static-neutral-bluish-800)",
          "--dsw-alias-markdown-code-segment-selected": "var(--dsw-static-neutral-bluish-800)",
          "--dsw-alias-markdown-code-segment-unselected": "var(--dsw-static-neutral-bluish-900)",
          "--dsw-alias-scrollbar-bg-l1": "var(--dsw-static-neutral-700)",
          "--dsw-alias-scrollbar-bg-l2": "var(--dsw-static-neutral-600)",
          "--dsw-alias-scrollbar-hover-l1": "var(--dsw-static-neutral-600)",
          "--dsw-alias-scrollbar-hover-l2": "var(--dsw-static-neutral-550)",
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
          "--shiki-background": "var(--dsw-alias-markdown-code-block)",
          "--shiki-foreground": "var(--dsw-static-neutral-bluish-50)",
          "--shiki-token-comment": "#676769",
          "--shiki-token-punctuation": "#8e8e90",
          "--shiki-token-keyword": "#ff9db0",
          "--shiki-token-string": "#40c977",
          "--shiki-token-string-expression": "#7fdca6",
          "--shiki-token-constant": "#ffd0a8",
          "--shiki-token-function": "#f9b98c",
          "--shiki-token-parameter": "#f7ad31",
          "--shiki-token-link": "#479ffa",
          "--dsh-codex-surface": "#0b0b0f",
          "--dsh-codex-ink": "#e6e6e6",
          "--dsh-codex-accent": "#f9b98c",
          "--dsh-codex-diff-added": "#40c977",
          "--dsh-codex-diff-removed": "#fa423e",
          "--dsh-codex-skill": "#479ffa"
        };

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
        var DECO_CSS = "/* page colour moves to <html>: a negative-z layer paints under an in-flow\n   ancestor's background, so the body box must stop painting one. */\nhtml{background:var(--dsw-alias-bg-base)}\nbody{background-color:transparent}\n\n/* The layer lives INSIDE the conversation column (see mountLayer in the\n   client): `absolute; inset:0` fills that column and `z-index:-1` puts it\n   above the column's own background but below its content. The column is\n   transparent and `_frame` is the element painting the page colour, which is\n   why -1 is correct here. The client gives the panel `position:relative` (with\n   `z-index:auto`, so no stacking context) because the panel ships with no\n   positioning of its own — without that every absolute descendant resolved\n   against an ancestor and the layer came out at the window's left edge.\n   Parented there, the decoration is squeezed by the sidebar exactly as the\n   conversation is. */\n.dsh-codex-deco{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden}\n\n/* ── 试做 19：浮动泡泡（2026-09-21，真粒子引擎版）─────────────────────────\n   泡泡不再是背景瓦片，而是逐颗生成的 DOM：引擎在 client.template.js 的\n   startBubbles()，每颗在生成时抽定 x / 尺寸 / 浓度 / 颜色 / 上升时长，\n   升出顶边后按 animationend 销毁并重生（重生时重新抽，x 每次都不一样）。\n   x 的分布按用户要求做成「统计上中间多、两边少，两端也要有一点」：\n   取两个均匀随机数求平均（三角分布）→ 中点密度最高、两端趋近 0 但可达；\n   BUBBLE_X_SAMPLES 改 3 更集中、改 1 就是均匀分布。\n   这里只负责容器与单颗泡泡的静态样式：柔边用 radial-gradient（不是硬边圆点），\n   上升动画只用 transform，走合成器；prefers-reduced-motion 时引擎不生成。\n   历史留档：02→18 全部已轮到本方案；本方案取代了之前的「瓦片 + 遮罩」写法。 */\n.dsh-codex-deco__dots{position:absolute;inset:0;overflow:hidden;pointer-events:none}\n/* 2026-09-21 用户要求「非模糊版本」：从 radial-gradient 柔边改成纯色实心圆，\n   边缘由 border-radius 切出来，是锐利的（不再有 72% 处的渐隐）。\n   要回到柔边版就把 background-color 换回\n   background-image:radial-gradient(circle at 50% 50%, currentColor, transparent 72%)。 */\n/* 形状锁：即使宿主页面里有别的 flex/尺寸规则，也不允许泡泡被拉扁。\n   （用户反馈过「看起来不是圆的」；真机实测直径是偶数、填充率 0.776 ≈ 正圆 0.785，\n   所以这里把会破坏圆形的可能性逐条堵死。） */\n.dsh-codex-bubble{position:absolute;bottom:-24px;\n  width:auto;height:auto;min-width:0;min-height:0;max-width:none;max-height:none;\n  flex:none;aspect-ratio:1/1;overflow:hidden;\n  /* 三重保证圆形（用户要求 border-radius 写 100）：\n     ① 背景是 SVG circle（几何由 SVG 自己保证）\n     ② border-radius:100%（比 50% 更狠，浏览器会按边夹到极限值，仍是正圆）\n     ③ clip-path:circle(50%) —— 万一圆角被外部 CSS 改掉，裁剪仍然切出正圆 */\n  border-radius:100%;clip-path:circle(50% at 50% 50%);-webkit-clip-path:circle(50% at 50% 50%);\n  /* 形状由 SVG circle 保证（见 client.template.js 的 bubbleFill）；background-color 只是兜底。\n     background-size:100% 100% 是关键：少了它，100×100 的 SVG 会按原始尺寸铺进几像素的盒子里，\n     只露出圆的一角，看起来就像方块。 */\n  background-color:currentColor;\n  background-size:100% 100%;background-position:center;background-repeat:no-repeat;\n  /* 两个动画并存：① dsh-codex-rise 只管位移（线性上浮）\n     ② dsh-codex-fade 只管「出生」那一段的透明度（0 → 该泡泡自己的峰值）——\n     用户 2026-09-21：「出现时是瞬间刷新的，希望从透明逐渐变为不透明」。\n     峰值走 CSS 变量 --bubble-peak（由 client.template.js 每颗写入），\n     否则关键帧里写死值会把每颗泡泡不同的浓度抹平。 */\n  animation-name:dsh-codex-rise, dsh-codex-fade;\n  animation-timing-function:linear, ease-out;\n  animation-fill-mode:forwards, forwards}\n@keyframes dsh-codex-rise{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,-108vh,0)}}\n@keyframes dsh-codex-fade{from{opacity:0}to{opacity:var(--bubble-peak, 1)}}\n/* The composer seat is plain: see the note further down. */\n\n/* Halftone washes: four corners, so every edge of the window carries a mark.\n   2026-09-21 用户明确要求保留这一层（关掉的只有全屏铺满的主点阵）。\n   颜色仍是历史遗留的 currentColor：元素没设颜色，会继承正文色（冷紫灰），\n   暖色门禁只扫十六进制字面量、扫不到 currentColor，故一直没被发现。\n   要改暖：给下面这条规则加显式 color，取值用 DECO 里的暖色即可。 */\n.dsh-codex-deco__wash{position:absolute;width:380px;height:380px;opacity:.15;\nbackground-image:radial-gradient(currentColor 2px, transparent 2.3px);background-size:15px 15px;\nmask-image:radial-gradient(closest-side, #000, transparent);\n-webkit-mask-image:radial-gradient(closest-side, #000, transparent)}\n.dsh-codex-deco__wash--tl{top:-170px;left:-170px}\n.dsh-codex-deco__wash--tr{top:-170px;right:-170px}\n.dsh-codex-deco__wash--bl{bottom:-170px;left:-170px}\n.dsh-codex-deco__wash--br{bottom:-170px;right:-170px}\n\n/* Cross-stars: three per corner, staggered in size and colour so a corner\n   cluster reads as intentional rather than as one stray mark. */\n/* The spin layer inside a side star: it exists so the constant rotation is a\n   separate animation from the lifetime curve (animation-name cannot stack, and\n   one easing over both is what made the spin speed up in bursts). */\n.dsh-codex-deco__star__spin{position:absolute;inset:0;background:currentColor}\n.dsh-codex-deco__star{position:absolute;background:currentColor;\nclip-path:polygon(46% 0,54% 0,54% 46%,100% 46%,100% 54%,54% 54%,54% 100%,46% 100%,46% 54%,0 54%,0 46%,46% 46%)}\n.dsh-codex-deco__star--lg{width:26px;height:26px}\n.dsh-codex-deco__star--md{width:15px;height:15px;opacity:.72}\n.dsh-codex-deco__star--sm{width:9px;height:9px;opacity:.55}\n.dsh-codex-deco__star--rose{color:#b1524e}\n.dsh-codex-deco__star--rose-soft{color:#d7827e}\n.dsh-codex-deco__star--ochre{color:undefined}\n/* 固定星的运动：每颗三条独立动画（摇摆 / 缩放 / 明暗），周期与相位都由 --t1…--t5 给。\n   注意「摇摆」是旋转，不是位移 —— 用户明确澄清过。 */\n/* 三条动画并行，属性彼此独立：\n     rotate → dsh-codex-star-rock（摇摆）  scale → dsh-codex-star-scale（呼吸缩放）\n     opacity → dsh-codex-star-fade（明暗）\n   它们各自有独立的周期与相位（见 --t1…--t5 规则），所以不会再出现「转到右边的那一刻正好\n   也最亮最大」这种被绑在一起的观感。用 rotate/scale 这两个独立变换属性而不是 transform，\n   正是为了让旋转与缩放在同一条时间线上解耦。 */\n.dsh-codex-deco__star--sway{\n  animation-name:dsh-codex-star-rock, dsh-codex-star-scale, dsh-codex-star-fade;\n  animation-timing-function:ease-in-out, ease-in-out, linear;\n  animation-iteration-count:infinite, infinite, infinite}\n@keyframes dsh-codex-star-rock{0%,100%{rotate:calc(-1 * var(--rock, 45deg))}50%{rotate:var(--rock, 45deg)}}\n@keyframes dsh-codex-star-scale{0%,100%{scale:1}50%{scale:1.22}}\n@keyframes dsh-codex-star-fade{0%,100%{opacity:.42}50%{opacity:.78}}\n\n/* Scatter positions, in viewport percentages (STAR_FIELD above): two columns\n   down the flanks plus a few marks around the composer band. */\n.dsh-codex-deco__star--t1{top:11.3%;left:31.0%;--rock:52deg;animation-duration:3.7s, 10.36s, 6.29s;animation-delay:-0.37s, -6.42s, -2.20s}\n.dsh-codex-deco__star--t2{top:16.9%;left:47.0%;--rock:38deg;animation-duration:4.8s, 13.44s, 8.16s;animation-delay:-1.82s, -12.10s, -5.14s}\n.dsh-codex-deco__star--t3{top:15.1%;left:63.0%;--rock:60deg;animation-duration:3.4s, 9.52s, 5.78s;animation-delay:-2.11s, -1.33s, -5.03s}\n.dsh-codex-deco__star--t4{bottom:12.6%;left:39.0%;--rock:44deg;animation-duration:5.25s, 14.70s, 8.92s;animation-delay:-1.26s, -11.17s, -4.37s}\n.dsh-codex-deco__star--t5{bottom:10.2%;left:59.0%;--rock:57deg;animation-duration:4.1s, 11.48s, 6.97s;animation-delay:-3.20s, -3.44s, -0.21s}\n\n/* Twinkle loop for the flank marks: hold, shrink out, reappear a few percent\n   away (still inside the flank band), grow back, then drift home while fading.\n   Only transform and opacity animate, so this rides the compositor. The marks\n   over the reading column are deliberately NOT in this loop. */\n.dsh-codex-particle-zone{position:absolute;top:0;bottom:0;width:17%;pointer-events:none}\n.dsh-codex-particle-zone--left{left:0}\n.dsh-codex-particle-zone--right{right:0}\n.dsh-codex-particle{position:absolute}\n.dsh-codex-particle__spin{position:absolute;inset:0;\n  clip-path:polygon(46% 0,54% 0,54% 46%,100% 46%,100% 54%,54% 54%,54% 100%,46% 100%,46% 54%,0 54%,0 46%,46% 46%);transform-origin:50% 50%}\n\n/* Three accent blooms arranged as the VERTICES OF A TRIANGLE (left mid-height,\n   right-top, right-bottom), kept OUT IN THE SIDE MARGINS so they never compete\n   with the conversation text. Measured on the live panel: the text column spans\n   29.4%–70.2% of the panel, leaving ~30% of clear margin on each side, and the\n   500px bloom fits that margin comfortably. An earlier pass put the vertices at\n   30% / 72%, i.e. exactly on the text edges. Percentages are of the LAYER (the\n   conversation panel), so the whole triangle moves with it when the sidebar\n   opens. Colours are the bright warm values: at 16% over cream the darker ochre\n   rung blended into a brown that read as a bruise. */\n/* 光斑尺寸：2026-09-21 按用户要求整体放大到 1.5 倍。\n   原尺寸 min(24vw,440px) × min(46vh,460px)，现为 min(36vw,660px) × min(69vh,690px)；\n   顶点位置（left/top 百分比）与 16%/14% 的浓度都没动，所以只是「变大」，不是「变浓」。\n   注意：遮罩仍是 closest-side + transparent 86%，会随尺寸等比放大；\n   放大后右侧两颗会侵入正文列（正文列约占面板 29.4%–70.2%），这是本尺寸下的必然结果。 */\n.dsh-codex-deco__panel{position:absolute;transform:translate(-50%,-50%);\n  width:min(36vw,660px);height:min(69vh,690px);\n  mask-image:radial-gradient(closest-side, #000, transparent 80%);\n  -webkit-mask-image:radial-gradient(closest-side, #000, transparent 80%)}\n.dsh-codex-deco__panel--left{left:2%;top:44%;\n  background:radial-gradient(closest-side, color-mix(in srgb, #b1524e 14%, transparent), transparent)}\n.dsh-codex-deco__panel--right{left:98%;top:27%;\n  background:radial-gradient(closest-side, color-mix(in srgb, #d9a05b 14%, transparent), transparent)}\n.dsh-codex-deco__panel--mid{left:95%;top:73%;\n  background:radial-gradient(closest-side, color-mix(in srgb, #d7827e 12%, transparent), transparent)}\n\n/* Nothing is anchored to the composer. Two earlier attempts wrapped it: a pair\n   of dashed brackets, then a page-coloured 'clean plate' underneath to blank\n   the texture. Both read as a floating decoration that did not belong — the\n   user's own words were 'just delete it'. The seat is therefore plain, and the\n   dots simply run behind it exactly as they do everywhere else. Colour stays on\n   the flanks and never over the text column. */\n\n/* One faint outline ring per corner, well inside the viewport. */\n.dsh-codex-deco__ring{position:absolute;width:34px;height:34px;opacity:.3;\nbackground:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='9' fill='none' stroke='%23b1524e' stroke-width='1.5'/%3E%3C/svg%3E\") center/contain no-repeat}\n.dsh-codex-deco__ring--tl{top:14%;left:5%}\n.dsh-codex-deco__ring--tr{top:14%;right:5%}\n.dsh-codex-deco__ring--bl{bottom:13%;left:5%}\n.dsh-codex-deco__ring--br{bottom:13%;right:5%}\n@media (prefers-reduced-motion: reduce){.dsh-codex-deco__star{animation:none!important}}";

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
            tag.dataset.plugin = "peach-fizz";
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
            sessionStorage.setItem("peach-fizz:user-choice", "1");
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
              console.warn("[peach-fizz] setTheme failed:", error);
            }
          };

          var dot = Object.assign({}, DOT_STYLE, {
            background: on ? "var(--dsw-alias-brand-primary)" : "var(--dsw-alias-label-dimmed)"
          });

          return react.createElement(
            "div",
            { id: "peach-fizz-row", style: ROW_STYLE },
            react.createElement(
              "div",
              { style: TEXT_STYLE },
              react.createElement("div", { style: TITLE_STYLE }, "桃子气泡水（Rose Pine Dawn）"),
              react.createElement(
                "div",
                { style: DESC_STYLE },
                hasSkin
                  ? "当前主题：" + active + "。点击右侧在" + THEME_LABEL + "与内置 dark 之间切换，或使用上方「外观」。"
                  : "主题未注册：请检查插件是否已启用；若是刚更新或改名过插件，重启 DSH 一次即可恢复。"
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
            /**
             * 主题注册要容错（2026-09-21 实测踩到）：
             *
             * DSH 的主题注册表对重复 id 是**直接抛错**的
             * （`theme "${id}" is already registered`，见 @deepseek-ai/dsh-client-ui-theme 的
             * `ThemeRegistry.register`）。插件改名/换行 id 之后，旧实例那一行并不会被当成
             * “同一条被重建”，它注册的 id 还留在表里 —— 此时新实例一注册就抛，而抛出点在
             * 本 effect 内部，会把后面的 overrideTokens 与 installDeco 一起带下去，
             * 表现就是「设置里那张卡片说主题未注册，装饰层也没了」。
             *
             * 所以这里把注册单独 try/catch：注册失败只是少了「外观」里那一项可选主题，
             * 调色板覆盖（overrideTokens）与装饰层照常生效，不至于整个皮肤失效。
             * 彻底恢复「外观」里的可选项，重启一次 DSH 进程即可（旧行随之消失）。
             */
            var offTheme = null;
            try {
              offTheme = ctx.theme.register({
                id: THEME_ID,
                colorScheme: "light",
                tokens: TOKENS_LIGHT
              });
            } catch (error) {
              console.warn("[peach-fizz] theme register skipped:", error);
            }
            var offOverride = ctx.theme.overrideTokens("peach-fizz", pairs);
            installDeco();
            return function () {
              offOverride();
              if (typeof offTheme === "function") offTheme();
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
          }, "peach-fizz: theme + deco");

          // Opt-in by default, without depending on timing: the skin claims the
          // session as soon as any snapshot arrives where the durable preference
          // is still a built-in one. A choice the user makes in this tab (the
          // Appearance cubes or our own row) is remembered in sessionStorage, so
          // the user's pick wins for the rest of the tab's life while a fresh tab
          // still gets the skin.
          ctx.effect(function () {
            var done = false;
            var STICKY_KEY = "peach-fizz:user-choice";
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
                console.info("[peach-fizz] codex-theme-v1 active");
              } catch (error) {
                console.warn("[peach-fizz] activation failed, theme left untouched:", error);
              }
            };
            settle();
            var off = ctx.on("theme/change", settle);
            return function () {
              off();
            };
          }, "peach-fizz: default activation");

          ctx.effect(function () {
            return ctx.locale.register(SETTINGS_NS, {
              zh: {
                title: "桃子气泡水（Rose Pine Dawn）",
                on: "已启用",
                off: "点击启用"
              },
              en: {
                title: "Peach Fizz (Rose Pine Dawn)",
                on: "Active",
                off: "Enable"
              }
            });
          }, "peach-fizz: settings dictionaries");

          ctx.slots.inject("settings.general.item", function () {
            return ctx.slots.register(
              {
                name: "settings.general.item",
                id: "peach-fizz",
                order: 12
              },
              CodexSkinRow
            );
          });
        }

        exports.name = "peach-fizz";
        exports.inject = inject;
        exports.apply = apply;
        exports.THEME_ID = THEME_ID;
        return module.exports;
      }
    });
  } catch (err) {
    console.warn("[peach-fizz] client runtime error:", err);
  }
})();
