# Blossom — a DSH Web GUI skin

为 **DeepSeek Harness (DSH) Web GUI** 做的第三方皮肤：rose-pine Dawn 暖调配色 + 侧栏装饰粒子，走"动漫 / 简洁 / 色彩干净"路线。

## 它长什么样

| 部分 | 做法 |
|---|---|
| 配色基底 | rose-pine Dawn：奶油面 `#faf4ed`、面板 `#fffaf3`、正文 `#575279`、强调 `#d7827e` |
| 代码高亮 | rose-pine Dawn（`--shiki-*`），代码面 `#f2e9e1` |
| 装饰层 | 挂在对话栏内部的一层 `pointer-events:none` 装饰：细点阵底纹、三处暖色泛光、**左右两侧的粒子星星** |
| 粒子星星 | 每颗**出生时随机**决定位置 / 大小 / 颜色 / 亮度 / 转速 / 方向 / 寿命；死后**换一个位置重生**；两侧各 6 颗，**互不重合** |
| 静态星 | 正文背景上 5 颗静止星，只做极慢呼吸（按用户要求不参与粒子化） |
| 主题 id | `codex-theme-v1`（保持不变，兼容既有配置） |

## 安装

插件通过 DSH 的 profile 机制加载。以 `web` profile 为例：

```bash
# 1) 把本仓库放到插件目录，例如
#    <DSH_HOME>/data/plugins/dsh-codex-skin

# 2) 在该 profile 的 package.json 里加依赖
#    "dsh-codex-skin": "file:../../plugins/dsh-codex-skin"

# 3) 让它进入 profile bundles
#    "bundles": [ ..., "dsh-codex-skin" ]
```

激活方式有两条：
- **默认**：插件在**首次运行**时自动接管（只在用户没有显式选择过主题时生效）；
- **手动**：设置 → 通用 → 皮肤卡片点「启用」；点旁边即可切回 DSH 内置主题。

用户一旦手动选择过，插件就不再自动接管（选择记在 `sessionStorage: dsh-codex-skin:user-choice`）。

## 配置

顶层常量集中在 `client.template.js`（生成后写入 `client.js`）：

| 常量 | 默认 | 含义 |
|---|---|---|
| `STARS_PER_ZONE` | `6` | 每侧粒子数（两侧共 12） |
| `STAR_MIN_PX` / `STAR_MAX_PX` | `7` / `30` | 粒子尺寸区间 |
| `STAR_MIN_GAP_PX` | `10` | 两颗星边缘之间要求的净空（**禁止重合**） |
| `REJECTION_TRIES` | `24` | 找空位的最大尝试次数；取不到就放弃本轮、稍后重试 |
| `STAR_LIFE_MIN_MS` / `STAR_LIFE_MAX_MS` | `42000` / `96000` | 寿命区间 |
| `SPIN_MIN_DEG_PER_S` / `SPIN_MAX_DEG_PER_S` | `39` / `51` | 自转角速度区间（单向匀速） |

配色与 token 全部由 `scripts/build.mjs` 从调色板推导，**不在装饰里手写颜色**。

## 开发与门禁

```bash
node scripts/build.mjs              # 生成 client.js：调色板 + 装饰样式 + 对比度审计
node scripts/test-client.mjs        # 19 项运行时契约测试
node scripts/report-deco-colors.mjs # 断言装饰样式表里只有暖色
node scripts/report-palette.mjs     # 调色板合并报告
```

`build.mjs` 是唯一数据源：改调色板、改装饰参数都改它，然后重新构建。构建时会跑对比度审计（浅色 23 项 + 深色 23 项，全部必须通过）与 alias 全表比对（确保没有 token 掉回深色）。

## 目录

```
client.template.js        手写的浏览器端源码（构建输入的模板）
client.js                 构建产物（DSH 实际加载的文件）
scripts/build.mjs         生成器：调色板推导、装饰样式、对比度审计
scripts/test-client.mjs   运行时契约测试
lib/tokens.generated.js   生成的 token 表
theme-tokens.json         对比度审计报告
cordis.patch.yml          插件在 DSH 里的注册形态
reference/                被回退的实现留档，仅作参考，不参与构建
artifacts/                点阵装饰的截图证据
```

## 已知边界

- 皮肤只做**视觉层**（token 覆盖 + 装饰层），不介入 DSH 的会话/进程逻辑。
- 「AI 回复整块卡片」那一版实现已按用户要求**整体回退**，留档在 `reference/`。
- 壳自身的「完成后自动收起推理过程」由 DSH 判定控制，皮肤不接管。

## 许可

未声明许可，默认保留所有权利。
