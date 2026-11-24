# 性能优化

<!-- id: perf-001; difficulty: 1; tags: Core Web Vitals, LCP, INP, CLS, 性能指标; source: 高频 -->
# 什么是 Core Web Vitals？包含哪些指标？

## Core Web Vitals

Core Web Vitals 是 Google 用来衡量真实用户体验的一组核心 Web 性能指标，当前核心指标是 LCP、INP、CLS。判断页面或站点是否达标时，通常看真实用户数据的第 75 百分位，而不是单次本地跑分。

### 三大核心指标
**LCP（Largest Contentful Paint）最大内容绘制**
- 衡量：视口内最大内容元素完成渲染的时间，反映加载体验
- 良好：≤ 2.5s；待改进：2.5s~4s；差：> 4s
- 常见元素：首屏大图、视频 poster、大块文本、背景图等

**INP（Interaction to Next Paint）交互到下一次绘制**
- 2024 年 3 月起取代 FID 成为核心响应性指标
- 衡量：用户点击、键盘输入、触摸等交互到下一次页面绘制的延迟
- 良好：≤ 200ms；待改进：200ms~500ms；差：> 500ms
- 比 FID 更全面，因为它覆盖交互处理、排队、渲染反馈等过程

**CLS（Cumulative Layout Shift）累积布局偏移**
- 衡量：页面生命周期中非预期布局移动的累计分数
- 良好：≤ 0.1；待改进：0.1~0.25；差：> 0.25
- 常见原因：图片无尺寸、广告位未预留、字体替换、动态插入内容

### 辅助指标
- **TTFB**：首字节时间，定位服务端、网络和 CDN 问题
- **FCP**：首次内容绘制，反映用户首次看到内容的时间
- **TBT**：总阻塞时间，实验室指标，常用于解释 INP 风险

### 测量方式
```js
import { onCLS, onINP, onLCP } from 'web-vitals';

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
```

实验室工具如 Lighthouse 适合复现和调试，CrUX、PageSpeed Insights、RUM 埋点更适合判断真实用户是否达标。

<!-- id: perf-002; difficulty: 1; tags: 重排, 重绘, 浏览器渲染, 性能优化; source: 高频 -->
# 什么是重排（Reflow）和重绘（Repaint）？如何减少它们？

## 重排与重绘

### 渲染流水线
```
DOM/CSSOM → Style → Layout → Paint → Composite
```

**重排 / Layout** 是重新计算元素几何信息，例如位置、尺寸、换行和滚动范围。它通常比单纯绘制更贵，但现代浏览器会尽量把影响范围局部化，不一定每次都重排整个文档。

**重绘 / Paint** 是重新生成像素绘制指令，例如颜色、背景、阴影变化。布局变化通常会带来重绘，但重绘不一定需要重新布局。

**合成 / Composite** 是把已有图层合成到屏幕。理想情况下，`transform`、`opacity` 动画可以只走合成，但前提是元素被提升到合成层；图层过多也会增加内存和合成成本。

### 常见触发
- Layout：改 `width/height/margin/display/font-size`，插入删除 DOM，读取 `offsetWidth/getBoundingClientRect()` 后又写样式
- Paint：改 `color/background/box-shadow/border-radius/visibility`
- Composite：改 `transform/opacity/filter` 等可能走合成路径

### 优化方法
**1. 读写分离，避免 layout thrashing**
```js
// 先读
const widths = elements.map((el) => el.offsetWidth);

// 再写
requestAnimationFrame(() => {
  elements.forEach((el, i) => {
    el.style.width = `${widths[i] + 10}px`;
  });
});
```

**2. 批量 DOM 更新**
```js
const fragment = document.createDocumentFragment();
for (let i = 0; i < 100; i++) {
  const li = document.createElement('li');
  li.textContent = `Item ${i}`;
  fragment.appendChild(li);
}
ul.appendChild(fragment);
```

**3. 用 class 切换复杂样式**
```js
el.classList.add('expanded');
```

**4. 动画优先使用 transform/opacity**
```css
.card {
  will-change: transform;
}
.card:hover {
  transform: translateY(-4px);
}
```

`will-change` 只在即将动画的少量元素上使用，用完及时移除，避免无意义图层占用内存。

**5. 隔离影响范围**
```css
.panel {
  contain: layout paint;
}
```

`contain`、虚拟列表、分页和减少深层 DOM 都能降低布局和绘制的影响范围。

<!-- id: perf-003; difficulty: 1; tags: 懒加载, 图片优化, IntersectionObserver; source: 高频 -->
# 图片懒加载是什么？如何实现？

## 图片懒加载

图片懒加载是把非首屏图片延后到接近视口时再加载，减少初始网络竞争、解码成本和内存占用。

### 原生懒加载
```html
<img
  src="gallery-800.webp"
  width="800"
  height="600"
  loading="lazy"
  decoding="async"
  alt="Gallery item"
/>
```

`loading="lazy"` 简单可靠，适合非首屏图片。首屏 LCP 图片不要懒加载，应正常加载并可配合 `fetchpriority="high"` 或 preload。

### IntersectionObserver
```js
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;

    const img = entry.target;
    img.src = img.dataset.src;
    img.srcset = img.dataset.srcset || '';
    observer.unobserve(img);
  }
}, { rootMargin: '200px 0px' });

document.querySelectorAll('img[data-src]').forEach((img) => observer.observe(img));
```

```html
<img
  src="placeholder.svg"
  data-src="photo-800.webp"
  data-srcset="photo-400.webp 400w, photo-800.webp 800w"
  sizes="(max-width: 600px) 100vw, 600px"
  width="800"
  height="600"
  alt="Photo"
/>
```

`rootMargin` 可以提前加载，避免用户滚到图片位置才开始请求。

### 旧式 scroll 方案
只能作为兼容兜底。需要 `passive: true`、节流或 `requestAnimationFrame`，避免滚动时频繁同步读取布局。

### 注意事项
- 总是设置 `width/height` 或 `aspect-ratio`，避免 CLS
- 不要懒加载首屏主图、logo、关键广告位等 LCP 候选元素
- 使用合适尺寸、`srcset/sizes`、AVIF/WebP，懒加载不能替代图片压缩
- 对列表图片可结合占位骨架、模糊预览和错误兜底

<!-- id: perf-004; difficulty: 1; tags: 防抖, 节流, 事件优化; source: 高频 -->
# 什么是防抖和节流？它们在性能优化中的应用？

## 防抖与节流

### 防抖（Debounce）
连续触发时只在最后一次触发后等待一段时间再执行，适合“只关心最终结果”的场景。

```js
function debounce(fn, delay) {
  let timer;

  const wrapped = function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };

  wrapped.cancel = () => clearTimeout(timer);
  return wrapped;
}

const search = debounce((keyword) => {
  fetch(`/api/search?q=${encodeURIComponent(keyword)}`);
}, 300);
```

适用：搜索联想、输入校验、resize 结束后重新布局、自动保存。

### 节流（Throttle）
持续触发时按固定频率执行，适合“需要过程反馈但不能太频繁”的场景。

```js
function throttle(fn, interval) {
  let last = 0;
  let timer;

  return function (...args) {
    const now = Date.now();
    const remaining = interval - (now - last);

    if (remaining <= 0) {
      clearTimeout(timer);
      timer = null;
      last = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}
```

适用：滚动进度、拖拽、mousemove、窗口滚动时的轻量统计。

### requestAnimationFrame 节流
和视觉更新相关的场景更适合对齐浏览器帧率：

```js
let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    updatePosition(window.scrollY);
    ticking = false;
  });
}, { passive: true });
```

### 区别
| | 防抖 | 节流 |
|--|------|------|
| 触发方式 | 停止触发后执行 | 按固定频率执行 |
| 关注点 | 最终值 | 过程中的采样值 |
| 典型场景 | 搜索、校验、保存 | 滚动、拖拽、指针移动 |

工程中直接用 lodash 的 `debounce/throttle` 更稳，可以配置 leading、trailing、maxWait 和 cancel。

<!-- id: perf-005; difficulty: 1; tags: 缓存, 强缓存, 协商缓存, HTTP; source: 高频 -->
# 什么是强缓存和协商缓存？

## 强缓存和协商缓存

### 缓存流程
```
检查本地缓存新鲜度
  ├─ fresh：直接使用内存/磁盘缓存，不发网络请求
  └─ stale：带条件请求向服务器再验证
        ├─ 304 Not Modified：继续使用本地缓存
        └─ 200 OK：下载新响应并更新缓存
```

### 强缓存
强缓存命中时不需要请求服务器，主要由 `Cache-Control` 和 `Expires` 控制。

```http
Cache-Control: max-age=3600
Cache-Control: public, max-age=31536000, immutable
Cache-Control: private, max-age=600
Cache-Control: no-cache
Cache-Control: no-store
```

- `max-age`：从响应生成开始的相对秒数
- `public`：允许共享缓存保存
- `private`：只允许浏览器私有缓存保存
- `no-cache`：可以存，但每次使用前必须再验证
- `no-store`：不要存储，适合隐私、支付、账号安全响应
- `immutable`：缓存期内认为资源不会变，适合带 hash 的静态资源
- `Expires` 是绝对时间，受客户端时钟影响；有 `Cache-Control` 时优先看 `Cache-Control`

### 协商缓存
协商缓存通过条件请求判断资源是否变化。

```http
ETag: "abc123"
If-None-Match: "abc123"
```

ETag 可以是强验证器或弱验证器，通常比 Last-Modified 更精确，但不一定必须是内容 hash。

```http
Last-Modified: Wed, 21 Oct 2024 07:28:00 GMT
If-Modified-Since: Wed, 21 Oct 2024 07:28:00 GMT
```

Last-Modified 精度通常到秒，可能无法识别一秒内多次修改，也可能受构建和文件系统时间影响。

### CDN 和共享缓存
```http
Cache-Control: public, max-age=60, s-maxage=600, stale-while-revalidate=30
Vary: Accept-Encoding, Origin
```

`s-maxage` 只影响 CDN/代理等共享缓存，并优先于共享缓存里的 `max-age`。`Vary` 会参与缓存键，配置错误可能导致命中率低或跨用户污染。

### 最佳实践
- HTML：`Cache-Control: no-cache`，保持入口文件可更新
- 带 hash 的 JS/CSS：`public, max-age=31536000, immutable`
- 用户敏感 API：`no-store`
- 公开图片和字体：结合文件名 hash、CDN TTL 和 CORS 策略

<!-- id: perf-006; difficulty: 1; tags: 代码分割, 懒加载, Webpack, Vite; source: 高频 -->
# 什么是代码分割（Code Splitting）？如何实现？

## 代码分割（Code Splitting）

代码分割是把一个大 bundle 拆成多个 chunk，让首屏只加载当前需要的代码，其余代码在路由切换、用户操作或空闲时按需加载。

### 动态 import
```js
button.addEventListener('click', async () => {
  const { openEditor } = await import('./editor.js');
  openEditor();
});
```

`import()` 会让打包器生成异步 chunk，运行到这行时再下载和执行。

### React 路由级分割
```jsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function AppRoutes() {
  return (
    <Suspense fallback={<RouteSkeleton />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

生产中还要配合 Error Boundary，处理 chunk 下载失败、版本更新后旧 HTML 引用旧 chunk 等问题。

### Vite / Rollup 手动分包
```js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
};
```

手动分包适合把稳定依赖和业务代码拆开，提高缓存命中率。但过度 vendor 拆包会增加请求、解析和缓存失效复杂度。

### 判断拆分边界
- 路由级：后台、详情页、设置页分开加载
- 重功能级：编辑器、图表、地图、富文本、PDF 预览按需加载
- 权限级：管理员功能不进入普通用户首屏包
- 缓存级：稳定第三方依赖和高频变动业务代码分开

### 注意事项
- 拆太细会增加 waterfall、调度成本和 Suspense 闪烁
- 关键首屏代码不要懒加载到用户可见路径之外
- 可用 `modulepreload`、路由 hover prefetch、预测加载优化下一跳
- 用 bundle analyzer 和 RUM 数据验证拆分是否真的降低 LCP/INP

<!-- id: perf-007; difficulty: 1; tags: preload, prefetch, 资源提示, 性能优化; source: 高频 -->
# 什么是 preload 和 prefetch？有什么区别？

## preload 与 prefetch

### preload：当前页面必需资源
```html
<link rel="preload" href="/hero.avif" as="image" fetchpriority="high">
<link rel="preload" href="/font.woff2" as="font" type="font/woff2" crossorigin>
<link rel="modulepreload" href="/assets/dashboard.js">
```

preload 会让浏览器尽早以指定资源类型下载当前页面必用资源。它只负责下载，不会执行脚本，也不会自动应用样式。`as`、`type`、`crossorigin` 要和真实请求一致，否则可能不能复用缓存。

适用：LCP 图片、关键字体、关键脚本依赖、浏览器发现得太晚但首屏必用的资源。

### prefetch：未来可能需要的资源
```html
<link rel="prefetch" href="/assets/settings-route.js" as="script">
```

prefetch 优先级低，通常在浏览器空闲时下载下一页或下一步可能用到的资源。浏览器可能因为网络、电量、省流量或缓存压力跳过它，所以不能依赖 prefetch 保证业务流程。

### preconnect / dns-prefetch
```html
<link rel="preconnect" href="https://api.example.com">
<link rel="dns-prefetch" href="//analytics.example.com">
```

`preconnect` 提前做 DNS、TCP、TLS 或 QUIC，适合马上要访问的关键第三方域名；`dns-prefetch` 只解析 DNS，成本更低，适合不确定的域名。

### 对比
| | preload | prefetch |
|--|---------|----------|
| 目标 | 当前导航必用 | 未来导航可能用 |
| 优先级 | 较高，会参与当前资源竞争 | 较低，通常空闲时进行 |
| 风险 | 抢占带宽、未使用警告 | 可能被浏览器跳过或浪费缓存 |
| 例子 | LCP 图、字体、modulepreload | 下一路由 chunk、下一页数据 |

原则：只 preload 少量关键资源；prefetch 要基于用户意图或路由预测，避免把“可能用”变成无意义下载。

<!-- id: perf-008; difficulty: 1; tags: Tree Shaking, 打包优化, ES Module, Webpack; source: 高频 -->
# 什么是 Tree Shaking？它是如何工作的？

## Tree Shaking

Tree Shaking 是打包阶段通过静态分析移除未使用导出，再由压缩器删除不可达代码的优化。它本质上是 Dead Code Elimination 在模块依赖图上的应用。

### 为什么依赖 ES Module
ESM 的 `import/export` 是静态结构，打包器能在构建时知道导入了哪些符号。

```js
// math.js
export const add = (a, b) => a + b;
export const sub = (a, b) => a - b;

// main.js
import { add } from './math.js';
console.log(add(1, 2));
```

如果 `sub` 没被使用且模块没有必须保留的副作用，生产构建中就可能被移除。

CommonJS 是运行时模块系统，静态分析更困难，但现代打包器能处理一部分简单场景；不要绝对说 CommonJS 完全不能优化，只是效果通常比 ESM 差。

### 副作用声明
```json
{
  "sideEffects": false
}
```

如果项目有必须保留的副作用文件，要用数组白名单：

```json
{
  "sideEffects": ["*.css", "./src/polyfills.ts"]
}
```

错误标记 `sideEffects: false` 可能导致 CSS、polyfill、全局注册逻辑被误删。

### 常见失效原因
- 顶层代码有副作用，例如修改全局对象、注册 locale、执行埋点
- 使用动态属性访问或运行时 require，打包器难以判断
- 导入了 CommonJS 包或包的入口没有提供 ESM 构建
- 代码被转译成 CommonJS 后再交给打包器

### 导入方式
```js
// 更利于 tree shaking
import { debounce } from 'lodash-es';

// 可能把整个 CommonJS 入口拉进来
import _ from 'lodash';
```

### 验证
不要只看源码写法，要看构建产物。用 bundle analyzer、source-map-explorer、Vite/Rollup visualizer 等确认无用代码是否真的被移除。

<!-- id: perf-009; difficulty: 1; tags: 首屏优化, 性能优化, 加载速度; source: 高频 -->
# 如何优化首屏加载速度？

## 首屏加载优化

首屏优化要先定义目标：通常关注 TTFB、FCP、LCP 和首屏可交互风险，而不是泛泛地“加载快”。

### 1. 降低 TTFB
- CDN 边缘缓存 HTML 或接口结果
- SSR 数据并行获取，避免串行瀑布
- 数据库、接口、冷启动和鉴权链路加缓存或预热
- 对可流式渲染的页面使用 streaming SSR

### 2. 尽早发现关键资源
```html
<link rel="preconnect" href="https://cdn.example.com">
<link rel="preload" href="/hero.avif" as="image" fetchpriority="high">
<link rel="preload" href="/font.woff2" as="font" type="font/woff2" crossorigin>
<script type="module" src="/src/main.tsx"></script>
```

LCP 图片不要懒加载；关键字体和首屏图要让浏览器尽早发现。第三方脚本延后、异步或隔离加载。

### 3. 减少关键资源体积
- JS：路由级代码分割、Tree Shaking、移除重复依赖和重型 polyfill
- CSS：清理未使用样式，关键 CSS 可内联但要控制大小
- 图片：按展示尺寸输出，使用 AVIF/WebP、`srcset/sizes`
- 文本资源：Brotli 或 Gzip 压缩

### 4. 缓存策略
```http
# HTML 保持可更新
Cache-Control: no-cache

# 带 hash 的静态资源长期缓存
Cache-Control: public, max-age=31536000, immutable
```

静态资源命中浏览器缓存和 CDN 缓存，HTML 不长缓存，避免用户拿到旧资源清单。

### 5. 渲染和主线程
- 减少首屏 JS 执行、解析和 hydration 成本
- 长任务拆分，非关键逻辑放到 idle、worker 或交互后
- 避免首屏大列表和复杂同步计算
- 骨架屏只能改善感知，不能降低真实 LCP；不要用骨架替代性能优化

### 6. 验证方法
- Network 瀑布图：看 DNS/TLS/TTFB/资源发现/下载
- Performance 面板：看主线程、长任务、LCP 元素和渲染延迟
- RUM：按设备、网络、地区、浏览器分组看 P75 指标

### 目标
- LCP ≤ 2.5s
- INP ≤ 200ms
- CLS ≤ 0.1
- FCP 和 TTFB 用于定位问题，不是最终用户体验的全部

<!-- id: perf-010; difficulty: 1; tags: script加载, async, defer, 页面渲染; source: 高频 -->
# script 标签的 async 和 defer 有什么区别？

## async 与 defer

### 普通外部脚本
```html
<script src="app.js"></script>
```

HTML 解析遇到普通脚本会暂停，下载并执行脚本后再继续解析。脚本执行也可能等待前面已发现的阻塞样式表，因此会影响首屏渲染。

### async
```html
<script async src="analytics.js"></script>
```

- 下载不阻塞 HTML 解析
- 下载完成后尽快执行，执行时会暂停解析
- 多个 async 脚本执行顺序不保证
- 适合独立第三方脚本、统计、广告等不依赖 DOM 和其他脚本的代码

### defer
```html
<script defer src="app.js"></script>
```

- 下载不阻塞 HTML 解析
- 等文档解析完成后、`DOMContentLoaded` 前执行
- 多个 defer 脚本按文档顺序执行
- 适合应用主脚本和有顺序依赖的脚本

### module 脚本
```html
<script type="module" src="/src/main.js"></script>
```

模块脚本默认行为类似 defer，会等待依赖模块图加载和执行。`async` 也可以用于 module，此时模块图加载完成后尽快执行，不保证与其他脚本顺序。

### 注意事项
- `async` 和 `defer` 对内联脚本无效
- `defer` 只适用于外部 classic script；module 有自己的默认延迟行为
- 第三方脚本优先 `async` 或延后加载，避免阻塞主应用
- 应用入口优先使用 `type="module"` 或 `defer`，减少 parser-blocking

<!-- id: perf-011; difficulty: 2; tags: LCP, Core Web Vitals, 图片优化, 性能优化; source: 高频 -->
# 如何优化 LCP（最大内容绘制）指标？

## LCP 优化策略

LCP 衡量视口内最大内容元素完成渲染的时间。先在 DevTools 或 RUM 中确认 LCP 元素是谁，再按阶段定位。

### LCP 常见元素
- `<img>`、`<picture>` 中的图片
- `<video>` 的 poster
- CSS `background-image`
- 大块文本节点

### 按四段拆解
1. **TTFB**：HTML 首字节慢，说明服务端、CDN、网络或重定向慢
2. **Resource Load Delay**：LCP 资源发现太晚，例如图片在 JS 中才插入、背景图藏在 CSS 里
3. **Resource Load Duration**：资源本身体积大或下载慢
4. **Element Render Delay**：资源已下载但主线程、CSS、字体或 hydration 阻塞渲染

### 1. 降低 TTFB
- CDN/边缘缓存 HTML 或接口结果
- SSR 数据并行，避免接口串行 waterfall
- 优化数据库、冷启动、鉴权和模板渲染
- 减少重定向

### 2. 提前发现 LCP 资源
```html
<link
  rel="preload"
  as="image"
  href="hero-800.avif"
  imagesrcset="hero-400.avif 400w, hero-800.avif 800w"
  imagesizes="100vw"
/>

<img
  src="hero-800.avif"
  srcset="hero-400.avif 400w, hero-800.avif 800w"
  sizes="100vw"
  width="800"
  height="400"
  fetchpriority="high"
  loading="eager"
  alt=""
/>
```

首屏 LCP 图片不要 `loading="lazy"`。如果 LCP 是 CSS 背景图，浏览器发现会更晚，能改成 `<img>/<picture>` 通常更好。

### 3. 降低资源体积
- 使用 AVIF/WebP，按实际展示尺寸裁剪
- 配置 `srcset/sizes`，避免移动端下载桌面大图
- 文本资源启用 Brotli/Gzip
- 字体子集化，并设置合适的 `font-display`

### 4. 减少渲染延迟
- 内联少量关键 CSS，延后非关键 CSS
- 应用入口用 `defer` 或 `type="module"`
- 减少首屏 JS 执行和 hydration 成本
- 避免首屏长任务、复杂同步计算和大列表渲染

### Checklist
- LCP ≤ 2.5s，且使用真实用户 P75 验证
- TTFB 控制在合理范围，重定向少
- LCP 资源在 HTML 早期可发现
- LCP 图尺寸正确、未懒加载、格式和体积合理
- 主线程没有阻塞 LCP 渲染的长任务

<!-- id: perf-012; difficulty: 2; tags: CLS, Core Web Vitals, 布局偏移, 性能优化; source: 高频 -->
# 如何优化 CLS（累积布局偏移）？

## CLS 优化策略

CLS 衡量非预期布局偏移。单次布局偏移分数约等于：

```
layout shift score = impact fraction × distance fraction
```

页面的 CLS 使用布局偏移 session window 统计：相邻偏移间隔小于 1 秒、窗口最长 5 秒，取最大窗口分数。用户输入后短时间内发生的预期偏移通常不计入。

### 1. 图片、视频、iframe 预留尺寸
```html
<img src="photo.jpg" width="800" height="600" alt="" />
```

```css
.media {
  aspect-ratio: 4 / 3;
  width: 100%;
  object-fit: cover;
}
```

浏览器可以根据宽高比提前占位，避免资源加载后撑开页面。

### 2. 动态内容预留空间
```css
.ad-slot {
  min-height: 250px;
  width: 300px;
}
.toast-container {
  position: fixed;
  inset-block-start: 16px;
  inset-inline-end: 16px;
}
```

广告、横幅、推荐位、错误提示、Cookie banner 不应把已有内容突然向下推。能覆盖就覆盖，必须插入就提前占位。

### 3. 字体导致的偏移
```css
@font-face {
  font-family: Inter;
  src: url('/inter.woff2') format('woff2');
  font-display: optional;
}
```

使用字体子集、预加载关键字体、设置相近 fallback 字体，必要时用 `size-adjust` 等字体度量覆盖减少替换时的尺寸变化。

### 4. 动画使用 transform
```css
.panel-enter {
  transform: translateY(16px);
  opacity: 0;
}
.panel-enter-active {
  transform: translateY(0);
  opacity: 1;
}
```

避免用 `top/left/height/margin` 做入场动画，这些属性会改变布局流。

### 5. 调试方法
- Chrome DevTools Performance 里查看 Layout Shifts 轨迹和 affected nodes
- Lighthouse / PageSpeed Insights 看实验室和真实用户数据
- RUM 中用 `layout-shift` PerformanceObserver 上报无用户输入的偏移

<!-- id: perf-013; difficulty: 2; tags: 合成层, GPU加速, will-change, 渲染优化; source: 字节跳动 -->
# 什么是合成层（Composite Layer）？如何利用它优化渲染？

## 合成层（Composite Layer）

浏览器渲染大致经历 Layout、Paint、Composite。合成层是浏览器把某些内容单独栅格化成图层，再由合成器组合到屏幕上的机制。

### 为什么能优化
如果动画只改变合成属性，例如 `transform`、`opacity`，浏览器可能复用已绘制内容，只做图层合成，避免每一帧重新布局和重绘。

但合成层不是“免费 GPU 加速”。图层需要内存、上传纹理、栅格化和合成管理；层太多会造成内存压力和掉帧。

### 常见提升原因
```css
.card {
  will-change: transform;
}
.modal {
  transform: translateZ(0);
}
.fade {
  transition: opacity 200ms;
}
.blur {
  filter: blur(8px);
}
```

`video`、`canvas`、`iframe`、固定定位、3D transform、滤镜、will-change 等都可能触发独立合成层，但具体行为由浏览器实现决定，不应依赖某个 hack 永远有效。

### 正确使用 will-change
```js
el.addEventListener('pointerenter', () => {
  el.style.willChange = 'transform';
});

el.addEventListener('transitionend', () => {
  el.style.willChange = 'auto';
});
```

`will-change` 要在动画前短时间添加，让浏览器有准备时间；动画结束后释放。不要全局使用。

### 推荐动画属性
```css
.toast {
  transform: translateY(16px);
  opacity: 0;
  transition: transform 200ms ease, opacity 200ms ease;
}
.toast[data-open="true"] {
  transform: translateY(0);
  opacity: 1;
}
```

避免用 `top/left/width/height/margin` 做高频动画，因为它们会触发布局。

### 调试工具
- Chrome DevTools Layers 面板查看图层数量和大小
- Rendering 面板打开 layer borders、paint flashing
- Performance 面板看是否发生 Layout、Paint、Composite 和长任务

<!-- id: perf-014; difficulty: 2; tags: 虚拟列表, 长列表优化, React; source: 高频 -->
# 固定高度虚拟列表如何实现？生产环境应该注意哪些问题？

## 固定高度虚拟列表

虚拟列表只渲染视口附近的少量行，用一个总高度占位容器撑开滚动条，再把可见行平移到正确位置。

### 固定高度计算
```
totalHeight = itemCount × itemHeight
startIndex = floor(scrollTop / itemHeight)
visibleCount = ceil(containerHeight / itemHeight)
endIndex = startIndex + visibleCount + overscan
offsetY = startIndex × itemHeight
```

`overscan` 用来额外渲染视口上下几行，避免快速滚动时白屏。

### 简化实现
```jsx
function VirtualList({ items, itemHeight = 50, height = 500, overscan = 3 }) {
  const [scrollTop, setScrollTop] = useState(0);

  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(height / itemHeight) + overscan * 2;
  const end = Math.min(items.length, start + visibleCount);
  const offsetY = start * itemHeight;

  return (
    <div
      style={{ height, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {items.slice(start, end).map((item) => (
            <div key={item.id} style={{ height: itemHeight }}>
              {item.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

生产环境滚动事件可能非常频繁，通常要用成熟库或至少用 `requestAnimationFrame` 合并更新。

### 推荐库
```jsx
import { FixedSizeList } from 'react-window';

function Row({ index, style }) {
  return <div style={style}>Row {index}</div>;
}

<FixedSizeList height={500} itemCount={10000} itemSize={50} width={320} overscanCount={4}>
  {Row}
</FixedSizeList>
```

可选：`react-window`、`react-virtualized`、`@tanstack/virtual`。

### 生产注意事项
- key 用稳定业务 id，避免插入、删除、排序时复用错误
- 保持 item 高度固定；动态高度要测量缓存，复杂度高很多
- 处理快速滚动白屏、overscan、滚动到指定项、列表反向加载
- 可访问性：键盘导航、焦点保持、屏幕阅读器的总数语义
- 无限加载要避免重复请求和滚动抖动
- 行内复杂组件要 memo，避免滚动时大量重复渲染

<!-- id: perf-015; difficulty: 2; tags: Webpack, 打包优化, Bundle分析, Tree Shaking; source: 高频 -->
# 如何分析和优化 Webpack 打包体积？

## Webpack 打包体积分析与优化

### 1. 先分析，不要凭感觉删依赖
```bash
bun add -d webpack-bundle-analyzer
```

```js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  plugins: [new BundleAnalyzerPlugin()],
};
```

也可以生成 stats 文件：
```bash
webpack --profile --json > stats.json
```

重点看：初始包大小、异步 chunk、重复依赖、polyfill、locale、图表/编辑器等重型模块、gzip/brotli 后体积。

### 2. Tree Shaking 和副作用
```json
{
  "sideEffects": ["*.css", "./src/polyfills.ts"]
}
```

保留必要副作用文件，避免误删 CSS 或 polyfill。业务包和第三方包尽量使用 ESM 入口。

### 3. 代码分割
```js
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendor',
        priority: 10,
      },
    },
  },
}
```

路由级拆分、重功能按需加载，比机械地把所有 vendor 拆到一个文件更重要。拆分后要观察首屏 waterfall 和缓存命中率。

### 4. 依赖替换和按需引入
```js
// 避免拉入整个 CommonJS 大入口
import { debounce } from 'lodash-es';
```

常见方向：Moment 换 Day.js/date-fns，图表库按需注册，富文本/地图/PDF 预览延迟加载，移除重复 polyfill。

### 5. 压缩和产物模式
```js
module.exports = {
  mode: 'production',
  optimization: {
    minimize: true,
  },
};
```

生产模式会启用压缩、环境变量替换和死代码删除。服务端还要开启 Brotli/Gzip，因为下载体积看的是压缩后大小。

### 6. Externals 谨慎使用
```js
externals: {
  react: 'React',
  'react-dom': 'ReactDOM',
}
```

外部化可以降低业务 bundle，但会引入全局变量、CDN 可用性、版本一致性、缓存和 SRI 管理问题。公共网站不应为了报告体积好看盲目外部化核心依赖。

### 7. 体积预算
```js
performance: {
  maxEntrypointSize: 250000,
  maxAssetSize: 250000,
}
```

把 bundle 预算接入 CI，防止依赖悄悄膨胀。Webpack filesystem cache 主要优化构建速度，不是运行时体积优化。

<!-- id: perf-016; difficulty: 2; tags: Service Worker, PWA, 缓存策略, 离线缓存; source: 高频 -->
# Service Worker 是什么？如何用它实现缓存策略？

## Service Worker 缓存策略

Service Worker 是事件驱动的 Worker，可拦截其 scope 下的网络请求，实现离线、预缓存、运行时缓存和推送。它不是常驻后台线程，浏览器会按需启动和终止。

### 基础特点
- 只能在 HTTPS 或 localhost 下注册
- 不能直接访问 DOM，只能通过 postMessage 与页面通信
- 生命周期包含 install、waiting、activate、fetch 等阶段
- 更新默认较保守，新 SW 通常等旧页面关闭后才接管

### 注册
```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log(registration.scope);
  });
}
```

### Cache First：静态版本化资源
```js
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open('static-v1');
    cache.put(request, response.clone());
  }
  return response;
}
```

适合带 hash 的 JS/CSS、字体、图片。不要缓存非 GET、错误响应和用户隐私数据。

### Network First：HTML 或需要新鲜度的数据
```js
async function networkFirst(request) {
  const cache = await caches.open('pages-v1');
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || caches.match('/offline.html');
  }
}
```

适合 HTML 导航和可离线降级的接口；支付、鉴权等敏感请求应 Network Only。

### Stale While Revalidate
```js
async function staleWhileRevalidate(request) {
  const cache = await caches.open('runtime-v1');
  const cached = await cache.match(request);

  const update = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });

  return cached || update;
}
```

适合头像、公开配置、低实时性资源：先快，再后台更新。

### fetch 路由
```js
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
  } else if (new URL(request.url).pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
  }
});
```

### 工程建议
- 生产优先用 Workbox 生成 precache manifest
- 设计版本、清理、回滚和“发现新版本刷新”体验
- DevTools Application 面板检查 SW 状态、Cache Storage 和离线行为
- `skipWaiting()` / `clients.claim()` 要谨慎，避免新 SW 控制旧页面导致资源版本不一致

<!-- id: perf-017; difficulty: 2; tags: React, 渲染优化, memo, useMemo, useCallback; source: 高频 -->
# 如何优化 React 应用的渲染性能？

## React 渲染性能优化

React 性能优化第一步是用 React DevTools Profiler、浏览器 Performance 面板或 RUM 找到慢组件、频繁更新源和长任务，不要先机械加 memo。

### 1. 缩小状态影响范围
把状态放在真正需要它的组件附近，避免父组件小状态变化导致大子树重渲染。

```jsx
function HoverTarget() {
  const [hover, setHover] = useState(false);
  return <div onPointerEnter={() => setHover(true)}>{hover ? 'On' : 'Off'}</div>;
}
```

### 2. memo / useMemo / useCallback 有针对性使用
```jsx
const Row = memo(function Row({ item, onSelect }) {
  return <button onClick={() => onSelect(item.id)}>{item.name}</button>;
});

function List({ items, query }) {
  const filtered = useMemo(
    () => items.filter((item) => item.name.includes(query)),
    [items, query],
  );

  const handleSelect = useCallback((id) => {
    console.log(id);
  }, []);

  return filtered.map((item) => <Row key={item.id} item={item} onSelect={handleSelect} />);
}
```

`useMemo/useCallback` 只应作为性能优化：计算明显慢、依赖很少变化、或传给 `memo` 子组件时才有价值。一个每次都新建的 prop 会让 memo 失效。

### 3. Context 拆分和选择性订阅
一个大 Context 值变化会让所有消费者重渲染。按主题、用户、权限、配置拆分 Context，或使用 selector 型 store，避免无关组件订阅整个对象。

### 4. 大列表虚拟化
```jsx
import { FixedSizeList } from 'react-window';
```

长列表、表格、日志面板优先虚拟化，而不是渲染几千个 DOM 再靠 memo 补救。

### 5. 并发特性改善响应性
```jsx
const [isPending, startTransition] = useTransition();

function onFilterChange(value) {
  setInput(value);
  startTransition(() => setFilter(value));
}
```

`useTransition` 和 `useDeferredValue` 可以让输入等高优先级交互先响应，重列表过滤、搜索结果刷新在后台更新。

### 6. 减少首屏和交互 JS
- 路由级代码分割，重组件懒加载
- 图表、编辑器、地图延迟到可见或交互时加载
- 服务端组件、SSR、流式渲染可减少客户端首屏工作量

React Compiler 在启用并配置后可以自动做部分 memo 化，减少手写 `memo/useMemo/useCallback` 的需求；没有启用时仍要按 profiler 证据手动优化。

<!-- id: perf-018; difficulty: 2; tags: 关键渲染路径, 浏览器渲染, 性能优化; source: 高频 -->
# 什么是关键渲染路径（Critical Rendering Path）？如何优化？

## 关键渲染路径（Critical Rendering Path）

关键渲染路径是浏览器从收到 HTML 到首次把有意义内容画到屏幕上所经过的关键步骤和资源依赖。

### 渲染步骤
```
HTML → DOM
CSS → CSSOM
DOM + CSSOM → Render Tree
Layout → Paint → Composite
```

CSS 是渲染阻塞资源：浏览器需要 CSSOM 才能正确计算样式。普通同步 `<script>` 是解析阻塞资源，并且执行前通常要等待前面已发现的阻塞样式表。

### 优化方向
**1. 减少关键 CSS**
```html
<style>
  body { margin: 0; }
  .hero { min-height: 60vh; }
</style>
<link rel="stylesheet" href="/app.css">
```

只内联首屏必要 CSS，避免内联过大导致 HTML 变慢。非关键 CSS 可延后加载，但要处理无样式闪烁和可访问性。

**2. 延后非关键 JS**
```html
<script type="module" src="/src/main.js"></script>
<script async src="https://analytics.example.com/a.js"></script>
```

应用入口用 `type="module"` 或 `defer`，第三方独立脚本用 `async` 或交互后加载。

**3. 提前关键连接和资源**
```html
<link rel="preconnect" href="https://cdn.example.com">
<link rel="preload" href="/hero.avif" as="image" fetchpriority="high">
```

只 preload 当前首屏必需资源，避免抢占带宽。

**4. 降低主线程阻塞**
- 减少首屏 hydration 和同步计算
- 拆分长任务，延后非关键组件
- 大列表虚拟化，重计算放 Web Worker

### 测量工具
```js
const [nav] = performance.getEntriesByType('navigation');
console.log(nav.responseStart - nav.requestStart); // 近似 TTFB
```

使用 Navigation Timing Level 2、PerformanceObserver、DevTools Performance/Network、Lighthouse 和 RUM 指标定位 CRP 中的瓶颈。

<!-- id: perf-019; difficulty: 2; tags: 字体优化, FOIT, FOUT, font-display; source: 高频 -->
# 如何优化 Web 字体加载？

## Web 字体优化

字体会影响加载体验和 CLS：加载太慢会 FOIT/FOUT，字体度量差异会导致文字替换后布局移动。

### font-display
```css
@font-face {
  font-family: Inter;
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: swap;
}
```

- `block`：短时间隐藏文本，容易 FOIT
- `swap`：立即用 fallback，字体到达后替换，适合品牌字体但可能 FOUT/CLS
- `fallback`：短暂等待，超时后使用 fallback，字体晚到也可能不替换
- `optional`：性能优先，慢网络下可能一直使用 fallback

具体时间窗口由浏览器实现决定，不要依赖精确秒数。

### 体积优化
- 使用 WOFF2
- 只加载需要的字重和字符集
- 用 `unicode-range` 拆分拉丁、数字、中文子集
- 中文字体很大，优先系统字体或按业务字符集子集化

```css
@font-face {
  font-family: Brand;
  src: url('/brand-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF;
}
```

### 预加载关键字体
```html
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
```

字体请求通常是 CORS 模式，preload 要带 `crossorigin` 才能和真实字体请求匹配。只 preload 首屏关键字体，避免抢占 LCP 图片。

### 减少字体替换导致的 CLS
```css
@font-face {
  font-family: InterAdjusted;
  src: url('/inter.woff2') format('woff2');
  font-display: swap;
  size-adjust: 100%;
  ascent-override: 90%;
  descent-override: 22%;
}
```

通过选择度量相近的 fallback 字体，或用 `size-adjust`、`ascent-override` 等描述符减少替换前后尺寸差。

### 可变字体
```css
@font-face {
  font-family: InterVariable;
  src: url('/inter-var.woff2') format('woff2');
  font-weight: 100 900;
}
```

可变字体能用一个文件覆盖多个字重，但单文件可能更大；是否划算取决于实际使用字重数量。

### 第三方字体
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

能自托管时更容易控制缓存、子集、preload 和隐私；使用第三方字体时要关注连接开销和可用性。

<!-- id: perf-020; difficulty: 2; tags: requestAnimationFrame, 动画优化, 渲染性能; source: 高频 -->
# 什么是 requestAnimationFrame？如何用它优化动画？

## requestAnimationFrame（rAF）

`requestAnimationFrame` 会在浏览器下一次绘制前调用回调，适合做与视觉更新相关的工作。它会跟随显示器刷新率，可能是 60Hz、120Hz 或更高；后台标签页中会被暂停或大幅节流。

### 基本动画
```js
let start;
let rafId;

function animate(timestamp) {
  start ??= timestamp;
  const elapsed = timestamp - start;
  const x = Math.min(500, elapsed * 0.2);

  element.style.transform = `translateX(${x}px)`;

  if (x < 500) {
    rafId = requestAnimationFrame(animate);
  }
}

rafId = requestAnimationFrame(animate);
```

使用 timestamp 计算 delta，不要假设每帧固定 16.67ms，否则高刷屏或掉帧时动画速度会不稳定。

### 与 setInterval 对比
```js
// 不推荐：不对齐绘制，还可能在页面不可见时继续排队
setInterval(updateAnimation, 16);

// 推荐：对齐下一帧绘制
requestAnimationFrame(updateAnimation);
```

rAF 不能保证不掉帧；如果回调里做了大量 JS、同步布局或绘制，仍然会超过帧预算。

### 滚动节流
```js
let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;

  requestAnimationFrame(() => {
    updateStickyHeader(window.scrollY);
    ticking = false;
  });
}, { passive: true });
```

### 读写分离
```js
requestAnimationFrame(() => {
  const rect = box.getBoundingClientRect();
  requestAnimationFrame(() => {
    box.style.transform = `translateX(${rect.width}px)`;
  });
});
```

实际项目可用 FastDOM 这类模式集中管理 DOM reads/writes，减少 layout thrashing。

### 选择建议
- CSS transition/animation 能表达的动画优先用 CSS
- JS 驱动动画用 rAF，并只改 `transform/opacity`
- 动画停止时调用 `cancelAnimationFrame(rafId)`
- 重计算放 worker 或拆成小任务，避免占满每帧预算

<!-- id: perf-021; difficulty: 2; tags: 图片优化, WebP, 响应式图片, 懒加载; source: 高频 -->
# 如何实现图片的性能优化？

## 图片性能优化

图片优化要同时处理体积、尺寸、加载时机、解码和布局稳定性。

### 1. 使用合适格式
```html
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="" width="1200" height="600">
</picture>
```

AVIF、WebP、JPEG、PNG 的大小没有绝对固定顺序，要看图片类型、质量参数和编码器。一般照片优先 AVIF/WebP，透明图可用 WebP/PNG，简单图标优先 SVG。

### 2. 响应式图片
```html
<img
  src="photo-800.webp"
  srcset="photo-400.webp 400w, photo-800.webp 800w, photo-1200.webp 1200w"
  sizes="(max-width: 600px) 100vw, 600px"
  width="800"
  height="600"
  alt="Product photo"
/>
```

`srcset/sizes` 让浏览器按设备宽度和 DPR 选择合适资源，避免移动端下载桌面大图。

### 3. 控制加载优先级
```html
<img src="hero.avif" fetchpriority="high" loading="eager" width="1200" height="600" alt="">
<img src="thumb.webp" loading="lazy" decoding="async" width="320" height="180" alt="">
```

LCP 图片不要懒加载；非首屏图片用 `loading="lazy"`。`decoding="async"` 可减少图片解码阻塞主线程的风险。

### 4. 避免 CLS
始终提供 `width/height` 或 CSS `aspect-ratio`，让浏览器在图片加载前就能预留空间。

### 5. CDN / 构建期处理
```html
<img src="https://img.example.com/photo.jpg?w=640&format=auto&q=75" alt="">
```

图片 CDN 可按宽度、格式、质量、DPR 生成资源，并配合长缓存。构建期可生成多尺寸、多格式产物，避免运行时压缩拖慢源站。

### 6. SVG 和图标
- SVG 用 SVGO 压缩，移除无用 metadata
- 图标优先 inline SVG 或 SVG sprite，通常不推荐 icon font 做新项目图标
- 对用户上传 SVG 要清洗，避免脚本和外链风险

### 7. 验证
看 Lighthouse、DevTools Network、LCP 元素、图片实际传输大小和解码耗时，不要只看文件扩展名。

<!-- id: perf-022; difficulty: 2; tags: 性能监控, Performance API, Core Web Vitals, 埋点; source: 高频 -->
# 什么是性能监控？如何在前端实现性能数据采集？

## 前端性能监控

前端性能监控要采集真实用户数据（RUM），按页面、设备、网络、地区、浏览器和版本聚合，重点看 P75/P95，而不是只看平均值。

### Navigation Timing
```js
const [nav] = performance.getEntriesByType('navigation');

send({
  type: 'navigation',
  ttfb: nav.responseStart - nav.requestStart,
  domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
  load: nav.loadEventEnd - nav.startTime,
  transferSize: nav.transferSize,
});
```

使用 Navigation Timing Level 2，不再依赖旧的 `performance.timing`。

### Core Web Vitals
```js
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

function report(metric) {
  const body = JSON.stringify({
    id: metric.id,
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    navigationType: metric.navigationType,
    path: location.pathname,
    ts: Date.now(),
  });

  navigator.sendBeacon('/analytics/perf', body);
}

onCLS(report);
onFCP(report);
onINP(report);
onLCP(report);
onTTFB(report);
```

LCP 和 CLS 的最终值可能到页面隐藏或卸载前才稳定，`sendBeacon` 适合在页面生命周期末尾可靠发送。

### 自定义指标
```js
performance.mark('editor:start');
await loadEditor();
performance.mark('editor:end');
performance.measure('editor-load', 'editor:start', 'editor:end');
```

组件初始化、路由切换、接口耗时、首个可交互业务时刻都可以用 mark/measure 埋点。

### PerformanceObserver
```js
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    send({ type: 'resource', name: entry.name, duration: entry.duration });
  }
}).observe({ type: 'resource', buffered: true });
```

跨域资源如果没有 `Timing-Allow-Origin`，很多详细时序会被隐藏。

### 错误和上下文
```js
window.addEventListener('error', (event) => {
  send({ type: 'js-error', message: event.message, stack: event.error?.stack });
});

window.addEventListener('unhandledrejection', (event) => {
  send({ type: 'promise-error', reason: String(event.reason) });
});
```

### 工程要点
- 采样和限流，避免监控本身拖慢页面
- 脱敏 URL、用户标识和错误栈
- 上报 release、route、deviceMemory、effectiveType 等维度
- 用仪表盘设置性能预算和回归告警

<!-- id: perf-023; difficulty: 2; tags: HTTP/2, 多路复用, 性能优化, 网络; source: 高频 -->
# HTTP/2 对前端性能有哪些提升？

## HTTP/2 对前端性能的提升

### HTTP/1.1 的主要问题
- 单连接常规模式一问一答，容易应用层队头阻塞
- 浏览器通常开多个 TCP 连接并发，握手和慢启动成本高
- Cookie、User-Agent 等头部重复传输
- 过去常用域名分片、雪碧图、强合并文件绕开连接限制

### HTTP/2 核心能力
**1. 多路复用**
```
一个 TCP 连接上多个 stream 并发传输
S1 HEADERS → S3 HEADERS → S1 DATA → S5 DATA → S3 DATA
```

请求和响应帧可以交错，慢响应不会在 HTTP 层阻塞其他响应。

**2. HPACK 头部压缩**
- 静态表复用常见头部
- 动态表复用连接内已出现的头部
- Huffman 编码压缩字符串

收益取决于 header 大小和重复程度，不能固定说一定减少某个百分比。

**3. 二进制分帧**
HTTP/2 用二进制帧表达 HEADERS、DATA、SETTINGS、WINDOW_UPDATE 等，更利于多路复用和流量控制；它不是单纯“二进制所以更小”。

### Server Push 的现状
HTTP/2 Server Push 理论上能提前推资源，但很难和浏览器缓存、优先级、用户路径匹配，现代浏览器实践中已不再是主流优化手段。更推荐 `preload`、`preconnect` 和 `103 Early Hints`。

### 对前端工程的影响
- 不再需要域名分片，分片反而破坏连接复用和头部压缩
- 不必为了减少请求盲目合并所有 JS/CSS，但也不能无限拆小
- 代码分割仍然重要，边界应按路由、缓存生命周期和关键路径设计
- 小图标可用 SVG/Sprite，但理由更多是管理和渲染，不只是减少请求

### 边界
HTTP/2 仍基于 TCP。丢包会影响同一连接内所有 stream 的字节交付；HTTP/3/QUIC 主要缓解这个传输层队头阻塞问题。

<!-- id: perf-024; difficulty: 2; tags: 内存泄漏, GC, 性能优化, React; source: 高频 -->
# 什么是内存泄漏？前端常见的内存泄漏场景有哪些？

## 前端内存泄漏

内存泄漏是对象已经不再需要，但仍被可达引用链持有，GC 无法回收，导致内存持续增长、GC 变慢、页面卡顿甚至崩溃。

### 常见场景
**1. 事件监听器未清理**
```js
useEffect(() => {
  function handleResize() {}
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

**2. 定时器和 rAF 未取消**
```js
useEffect(() => {
  const id = setInterval(fetchData, 1000);
  return () => clearInterval(id);
}, []);
```

**3. 观察器未断开**
```js
useEffect(() => {
  const observer = new ResizeObserver(onResize);
  observer.observe(ref.current);
  return () => observer.disconnect();
}, []);
```

MutationObserver、IntersectionObserver、ResizeObserver 都要清理。

**4. 未取消请求**
```js
useEffect(() => {
  const controller = new AbortController();

  fetch('/api/data', { signal: controller.signal })
    .then((res) => res.json())
    .then(setData)
    .catch((e) => {
      if (e.name !== 'AbortError') throw e;
    });

  return () => controller.abort();
}, []);
```

Promise 本身不可取消，但请求、流、订阅要取消。React 18+ 不再用旧警告作为可靠信号，仍应清理异步副作用。

**5. 闭包和全局缓存持有大对象**
```js
const cache = new Map();
cache.set(userId, hugeResponse); // 没有上限和淘汰策略
```

全局数组、Map、日志缓存、撤销栈、编辑器历史都要设置容量上限或释放策略。

**6. DOM / Blob URL / WebSocket**
```js
const url = URL.createObjectURL(file);
img.src = url;
img.onload = () => URL.revokeObjectURL(url);
```

Detached DOM 被 JS 引用、Object URL 不释放、WebSocket/EventSource 不关闭，也会造成泄漏。

### 排查工具
- Chrome DevTools Memory：Heap Snapshot、Allocation instrumentation、Detached DOM
- Performance 面板观察 GC 频率和内存曲线
- 连续执行“进入页面 -> 操作 -> 离开页面 -> 强制 GC”，对比快照 retained size 和引用链

### 经验
内存优化不是只看当前值，而是看重复操作后是否回落；持续上升且引用链能追到业务对象，才是有效泄漏证据。

<!-- id: perf-025; difficulty: 2; tags: Vite, 开发性能, HMR; source: 高频 -->
# Vite 开发模式为什么快？这种性能优势有哪些边界？

## Vite 开发性能原理与边界

### 核心结论
Vite 的开发体验快，主要来自“源码不预打包、浏览器原生 ESM 按需加载、依赖用 esbuild 预构建、HMR 精确失效”。它快的是开发服务器启动和热更新，不等于所有项目的生产构建都一定更快。

### 为什么启动快
- Webpack dev server 往往要先构建模块图并生成 bundle，项目越大启动越慢。
- Vite 启动时只启动 dev server，不急着打包所有业务源码。
- 浏览器访问某个模块时，Vite 再按需转换对应文件并返回 ESM。
- `node_modules` 依赖通过 esbuild 预构建，并缓存到 `.vite/deps`，避免每次重复处理 CommonJS 和深层依赖。

### 为什么 HMR 快
- Vite 维护模块依赖图，文件变更后只让相关模块失效。
- 浏览器通过 WebSocket 收到更新通知，再动态 import 新模块。
- React/Vue 等框架插件可以在组件边界内做状态保留，避免整页刷新。

### 性能优势的边界
- 首次访问某个大型页面时，仍可能因为按需转换大量源码而变慢。
- 插件链很重、源码转换复杂、source map 很大时，Vite 也会慢。
- 依赖预构建配置不合理时，可能出现频繁重扫依赖或重复预构建。
- 生产构建默认仍基于 Rollup，瓶颈通常变成 Tree Shaking、压缩、代码分割和插件成本。

### 工程优化方向
- 用 `optimizeDeps.include/exclude` 稳定依赖预构建。
- 拆分过大的页面入口，减少首次请求时的转换量。
- 排查慢插件，避免在开发环境跑生产级重转换。
- 大型 monorepo 中注意软链依赖、TS 路径别名和包的 ESM/CJS 格式。

### 面试表达
可以说：Vite 的快不是“编译器魔法”，而是把开发期从 bundle-first 改成 request-first；启动和 HMR 因此很快，但生产构建和超大型项目仍要看插件、依赖和代码分割设计。

<!-- id: perf-026; difficulty: 2; tags: INP, 长任务, Web Worker, 性能优化; source: Google -->
# 如何优化长任务（Long Task）以提升 INP 指标？

## 长任务优化与 INP

长任务是主线程上持续超过 50ms 的任务。INP 关注用户交互到下一次绘制的延迟，包含输入排队、事件处理、渲染和绘制反馈。长任务会让交互排队，直接拉高 INP。

### 检测长任务
```js
const observer = new PerformanceObserver((list) => {
  for (const task of list.getEntries()) {
    console.warn('long task', task.duration, task.attribution);
  }
});
observer.observe({ type: 'longtask', buffered: true });
```

Long Tasks API 只能看到主线程长任务，归因信息有限，仍要结合 DevTools Performance 火焰图定位具体代码。

### 1. 任务分块并让出主线程
```js
function yieldToMain() {
  if (globalThis.scheduler?.yield) return scheduler.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function processDataInChunks(items, chunkSize = 100) {
  for (let i = 0; i < items.length; i += chunkSize) {
    for (const item of items.slice(i, i + chunkSize)) {
      heavyProcess(item);
    }
    await yieldToMain();
  }
}
```

`setTimeout(0)` 是兜底方案；`scheduler.yield()` 可用时更适合表达“让出主线程”。

### 2. 把 CPU 密集任务移出主线程
```js
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
worker.postMessage(bigData);
worker.onmessage = ({ data }) => renderResult(data);
```

Worker 适合搜索索引、压缩、解析、大数据计算。要注意序列化成本，必要时使用 Transferable 或 SharedArrayBuffer。

### 3. 优化事件处理路径
- 事件回调只做必要状态更新，重计算延后
- 指针移动、滚动等高频事件使用 passive listener、rAF 节流
- DOM 读写分离，避免交互期间强制同步布局
- 减少 React 组件树在一次交互中的重渲染范围

### 4. React 响应性优化
```jsx
const [query, setQuery] = useState('');
const deferredQuery = useDeferredValue(query);

const filtered = useMemo(
  () => expensiveFilter(items, deferredQuery),
  [items, deferredQuery],
);
```

`startTransition` 只能降低状态更新优先级，不能让你在回调里同步执行的昂贵计算自动变快。重计算应放到 deferred value、memo、worker 或分块任务中。

### 5. 降低任务本身成本
- 减少包体和初始化代码
- 按需加载重组件
- 虚拟列表替代大 DOM 渲染
- 缓存纯计算结果，避免重复解析和格式化

<!-- id: perf-027; difficulty: 2; tags: CDN, 静态资源, 缓存, 性能优化; source: 高频 -->
# CDN 是什么？前端如何利用 CDN 优化性能？

## CDN 原理与前端应用

CDN 通过边缘节点、缓存和就近调度，把资源从离用户更近的位置返回，减少 RTT、回源压力和源站带宽。

### 工作原理
```
用户请求资源
  ↓ DNS/CNAME/Anycast 调度到边缘节点
边缘节点命中缓存 → 直接返回
边缘节点未命中 → 回源 → 写入缓存 → 返回
```

“最近”不是单纯地理距离，还会受运营商、路由、节点负载、健康状态和解析器位置影响。

### 前端最佳实践
**1. 静态资源长期缓存**
```http
Cache-Control: public, max-age=31536000, immutable
```

JS/CSS/图片/字体文件名带 content hash，内容变化时 URL 变化，适合 CDN 和浏览器长缓存。

**2. HTML 可走 CDN，但不能盲目长缓存**
```http
Cache-Control: no-cache
```

静态站、SSG、可缓存 SSR 页面可以走 CDN；入口 HTML 通常需要短缓存或协商缓存，避免引用过期资源清单。

**3. 构建配置**
```js
export default {
  base: 'https://cdn.example.com/static/',
};
```

```js
module.exports = {
  output: { publicPath: 'https://cdn.example.com/static/' },
};
```

**4. 图片 CDN**
```html
<img src="https://img.example.com/photo.jpg?w=640&format=auto&q=75" alt="">
```

按宽度、DPR、格式和质量动态生成图片，配合 `srcset/sizes` 效果更好。

### 注意事项
- 静态资源域名尽量不要带业务 Cookie，减少请求头体积和隐私风险
- 字体、canvas 读图、跨源下载头等场景要配置 CORS
- 使用第三方公共 CDN 外部化 React 等核心库要谨慎，会带来可用性、版本、SRI、缓存和隐私问题
- 监控命中率、回源带宽、边缘 4xx/5xx、各地区 TTFB 和缓存键污染
- `Vary`、Cookie、Authorization 配错可能导致命中率低或跨用户缓存泄露

<!-- id: perf-028; difficulty: 2; tags: 白屏时间, SSR, 骨架屏, FCP; source: 高频 -->
# 如何减少页面白屏时间？

## 减少白屏时间

白屏指用户打开页面后长期看不到任何有意义内容。要区分真实渲染变快和“用占位改善感知”。

### 常见原因
- TTFB 高：服务端慢、冷启动、跨地域、重定向多
- HTML 太空：CSR 应用只有根节点，必须等 JS 下载执行后才有内容
- CSS/JS 阻塞：关键样式、同步脚本、第三方脚本拖慢首屏
- 主线程长任务：框架初始化、hydration、数据处理耗时

### 1. 提高 HTML 可用性
- SSR/SSG 直接返回首屏 HTML
- Streaming SSR 先返回页面壳和关键内容
- CSR 项目至少在 HTML 中提供可见 app shell、noscript 或首屏占位

```html
<div id="root">
  <header class="app-shell">iFace</header>
  <main class="skeleton-list"></main>
</div>
<script type="module" src="/src/main.tsx"></script>
```

### 2. 优化 TTFB
- CDN 缓存静态 HTML 或边缘渲染
- 服务端接口并行、缓存、减少重定向
- 预热冷启动和数据库连接

### 3. 减少阻塞资源
```html
<style>/* critical shell CSS */</style>
<link rel="preload" href="/hero.avif" as="image" fetchpriority="high">
<script type="module" src="/src/main.tsx"></script>
<script async src="https://analytics.example.com/a.js"></script>
```

关键 CSS 控制大小，主脚本 defer/module，第三方脚本延后或异步。

### 4. 降低首屏 JS 成本
- 路由级代码分割，只加载当前页面代码
- 重组件交互后加载，例如图表、编辑器、地图
- 移除无用 polyfill 和重复依赖
- hydration 拆分或延迟非关键区域

### 5. 骨架屏的边界
骨架屏可以减少“空白感”，但如果骨架本身也要等大 JS 执行后才出现，就不能解决白屏。骨架应尽量由 HTML/CSS 直接渲染，并预留最终内容空间避免 CLS。

### 监控指标
看 FCP、LCP、TTFB、长任务和白屏自定义指标。白屏优化最终要用真实用户数据验证，而不是只看本地网络。

<!-- id: perf-029; difficulty: 3; tags: 渲染流水线, 浏览器渲染, 性能优化, 合成层; source: 字节跳动 -->
# 描述浏览器的完整渲染流水线，以及各阶段的性能瓶颈

## 浏览器渲染流水线

### 完整流程
```
网络获取 HTML/CSS/JS/图片
  ↓
HTML Parser → DOM
CSS Parser  → CSSOM
  ↓
样式计算 Style
  ↓
布局 Layout：计算盒子位置和尺寸
  ↓
分层 / Paint invalidation：确定绘制范围和合成层
  ↓
Paint：生成绘制记录
  ↓
Raster：把绘制记录栅格化成位图瓦片
  ↓
Composite：合成图层并提交到屏幕
```

Raster 可能在 CPU 或 GPU 相关线程完成，不能简单说“GPU 光栅化所有层”。现代浏览器有主线程、合成线程、栅格线程等协作。

### 各阶段瓶颈
**解析阶段**
- 同步脚本阻塞 HTML 解析
- CSS 阻塞渲染，脚本执行还可能等待阻塞样式表
- 优化：`type="module"`/`defer`、关键 CSS、减少第三方脚本

**样式计算**
- 选择器复杂、DOM 很大、频繁改 class 会增加成本
- 优化：减少 DOM 规模、避免高频全局样式变化、隔离组件影响范围

**布局**
- 读取布局信息后立即写样式会强制同步布局
- 大表格、大列表、复杂自适应布局成本高
- 优化：读写分离、虚拟列表、`contain: layout`、避免用布局属性做动画

**绘制**
- 大面积阴影、滤镜、渐变、背景图会增加 paint 成本
- 优化：减少重绘面积、`contain: paint`、避免高频 repaint

**合成**
- `transform/opacity` 动画通常能只走合成路径
- 层太多会导致内存和合成成本上升
- 优化：少量使用 `will-change`，动画结束后释放

### CSS Containment
```css
.card-list {
  content-visibility: auto;
  contain-intrinsic-size: auto 120px;
}
.widget {
  contain: layout paint;
}
```

`content-visibility: auto` 可跳过视口外内容的渲染工作，但要提供合理 intrinsic size，避免滚动条和布局跳动。

### 调试
DevTools Performance 看 Main、Raster、Compositor、Layout、Paint；Rendering 面板开启 paint flashing 和 layer borders；Layers 面板检查层数量和内存。

<!-- id: perf-030; difficulty: 3; tags: 性能监控, SDK设计, Core Web Vitals, 错误监控; source: 美团 -->
# 如何实现一个完整的前端性能监控 SDK？

## 前端性能监控 SDK 设计

### 架构
```
SDK
├── Collectors：Web Vitals、Navigation、Resource、Long Task、Error、自定义 mark
├── Context：appId、release、route、user/session、device、network
├── Processor：采样、脱敏、聚合、去重、过滤
└── Reporter：批量队列、sendBeacon、fetch keepalive、重试、离线缓存
```

### 核心实现
```js
class PerformanceSDK {
  constructor(options) {
    this.options = { sampleRate: 1, batchSize: 10, ...options };
    this.sampled = Math.random() <= this.options.sampleRate;
    this.queue = [];
  }

  start() {
    if (!this.sampled) return;
    this.collectWebVitals();
    this.collectResources();
    this.collectErrors();
    this.setupFlush();
  }

  async collectWebVitals() {
    const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import('web-vitals');
    const report = (metric) => this.push({
      type: 'web-vital',
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      navigationType: metric.navigationType,
    });

    onCLS(report);
    onFCP(report);
    onINP(report);
    onLCP(report);
    onTTFB(report);
  }

  collectResources() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 1000) {
          this.push({
            type: 'slow-resource',
            name: entry.name,
            initiatorType: entry.initiatorType,
            duration: entry.duration,
            transferSize: entry.transferSize,
          });
        }
      }
    });
    observer.observe({ type: 'resource', buffered: true });
  }

  collectErrors() {
    window.addEventListener('error', (event) => {
      this.push({ type: 'js-error', message: event.message, stack: event.error?.stack });
    });
    window.addEventListener('unhandledrejection', (event) => {
      this.push({ type: 'promise-error', reason: String(event.reason) });
    });
  }

  push(payload) {
    this.queue.push({
      ...payload,
      appId: this.options.appId,
      release: this.options.release,
      route: location.pathname,
      ts: Date.now(),
    });

    if (this.queue.length >= this.options.batchSize) this.flush();
  }

  flush() {
    if (!this.queue.length) return;
    const body = JSON.stringify(this.queue.splice(0));

    const ok = navigator.sendBeacon?.(this.options.dsn, body);
    if (!ok) {
      fetch(this.options.dsn, {
        method: 'POST',
        body,
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {});
    }
  }

  setupFlush() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush();
    });
    window.addEventListener('pagehide', () => this.flush());
  }
}
```

### 设计要点
- 采样最好按 session 决定，而不是每条事件随机采样，否则同一会话链路会断
- 上报要限流、批量、压缩字段，避免 SDK 自身影响性能
- URL、错误栈、用户标识要脱敏，遵守隐私和合规要求
- 资源时序跨域需要服务端配置 `Timing-Allow-Origin`
- 指标要带 release、route、设备、网络、地区，才能定位回归
- 后端要按 P75/P95 聚合，并建立性能预算和告警
- SDK 本身要小、可 tree-shake、失败静默，不能影响主业务

<!-- id: perf-031; difficulty: 3; tags: SPA优化, SSR, 代码分割, 架构设计; source: 阿里巴巴 -->
# 如何做大型单页应用的首屏性能优化？请从架构层面回答

## 大型 SPA 首屏性能优化（架构层面）

大型 SPA 的典型首屏链路是：HTML 空壳 → 下载 JS/CSS → 框架初始化 → 路由匹配 → 数据请求 → 渲染。瓶颈通常集中在首屏 JS 过大、数据 waterfall、服务端响应慢和 hydration/初始化长任务。

### 1. 选择合适渲染策略
```
CSR：架构简单，但首屏依赖 JS，白屏风险高
SSR：更快输出 HTML，利于 SEO 和 FCP/LCP，但要控制 TTFB 和 hydration 成本
SSG：构建期生成 HTML，适合内容相对稳定的页面，可直接 CDN 缓存
ISR/按需再验证：静态体验 + 后台更新，适合内容定期变化的页面
Streaming SSR：先返回 shell 和关键内容，后续分块到达
```

不是所有页面都要 SSR。后台管理低频页面可以 CSR，公开落地页、详情页、搜索页更适合 SSR/SSG。

### 2. 控制首屏 JS 架构
```js
const Dashboard = lazy(() => import('./pages/Dashboard'));
const RichEditor = lazy(() => import('./components/RichEditor'));
```

- 路由级分割是基础
- 图表、编辑器、地图、PDF、低频弹窗按需加载
- 公共依赖拆分要服务缓存命中，不要“激进拆到无限小”
- 对下一跳使用 hover、viewport、权限预测 prefetch

### 3. 消除数据瀑布
```js
const [user, permissions, dashboard] = await Promise.all([
  fetchUser(),
  fetchPermissions(),
  fetchDashboard(),
]);
```

SSR 注入初始数据时要安全序列化，避免 `</script>` 和 XSS 问题；客户端要复用初始数据，避免 hydrate 后重复请求。

### 4. 关键资源治理
```html
<link rel="preconnect" href="https://cdn.example.com">
<link rel="preload" href="/hero.avif" as="image" fetchpriority="high">
<link rel="modulepreload" href="/assets/dashboard.js">
```

关键 CSS、LCP 图片、入口模块要早发现；第三方脚本延后加载或隔离。

### 5. 微前端的边界
微前端解决组织和发布隔离，不天然提升首屏性能。它可能带来重复依赖、运行时框架、跨应用通信和样式隔离成本。要做共享依赖治理、子应用预加载和性能预算。

### 6. 指标目标
- LCP ≤ 2.5s
- INP ≤ 200ms
- CLS ≤ 0.1
- TTFB、FCP、长任务和 hydration 时间用于定位瓶颈

架构层面要建立 bundle budget、RUM 监控、CI 体积检查和性能回归告警。

<!-- id: perf-032; difficulty: 3; tags: Webpack, 构建优化, 编译速度; source: 高频 -->
# 如何优化 Webpack 的构建速度？

## Webpack 构建速度优化

### 先分析耗时
```bash
webpack --profile --json > stats.json
```

也可以用 `speed-measure-webpack-plugin` 分析 loader/plugin 耗时，但要注意它和部分 webpack 5 插件可能有兼容问题。目标是找出慢 loader、慢 plugin、过大的模块图和重复编译。

### 1. Webpack 5 filesystem cache
```js
module.exports = {
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
  },
};
```

持久化缓存通常是二次构建和本地开发最有效的优化之一，但提升幅度取决于项目和缓存命中率，不能固定承诺某个百分比。

### 2. 缩小编译范围
```js
module.exports = {
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  module: {
    rules: [{
      test: /\.[jt]sx?$/,
      include: path.resolve(__dirname, 'src'),
      use: 'babel-loader',
    }],
  },
};
```

用 `include` 限定源码范围，避免无意义处理 `node_modules`；减少 resolve extensions 数量和复杂 alias。

### 3. 更快的转译器
```js
module.exports = {
  module: {
    rules: [{
      test: /\.[jt]sx?$/,
      loader: 'swc-loader',
      options: { jsc: { parser: { syntax: 'typescript', tsx: true } } },
    }],
  },
};
```

可选择 `swc-loader` 或 `esbuild-loader` 替代 Babel/Terser 的部分工作。代价是 Babel 插件生态、语义细节、类型检查和 legacy transform 可能不同，需要回归验证。

### 4. 多线程要看任务粒度
```js
{
  loader: 'thread-loader',
  options: { workers: 4 }
}
```

thread-loader 有 worker 启动和序列化成本，适合 Babel 这类 CPU 重任务，不适合很轻的 loader。小项目可能变慢。

### 5. 优化 devtool 和 sourcemap
开发环境用较快的 source map，例如 `eval-cheap-module-source-map`；生产 source map 生成很慢时可按环境关闭或上传后删除。

### 6. 减少插件和生产级工作
开发环境不要跑图片压缩、完整 typecheck、复杂 lint、包分析等生产任务。TypeScript 类型检查可用 `fork-ts-checker-webpack-plugin` 放到独立进程。

### 7. DLL Plugin 的位置
DLL Plugin 是早期预编译 vendor 的方案。Webpack 5 有 filesystem cache、splitChunks 和现代包管理后，DLL 使用场景明显减少，除非是历史项目且收益经过验证。

<!-- id: perf-033; difficulty: 3; tags: 缓存策略, Service Worker, HTTP缓存, 性能优化; source: 高频 -->
# 如何设计一套完整的前端缓存策略？

## 前端缓存策略设计

缓存策略要按资源类型、更新频率、权限敏感性和失效方式分层设计。

### 缓存层次
```
HTTP cache：浏览器内存/磁盘缓存，受 Cache-Control、ETag 等控制
Service Worker Cache Storage：可编程缓存，适合离线和运行时策略
CDN/shared cache：边缘缓存，降低 TTFB 和回源
应用内存缓存：当前页面生命周期内最快，刷新即失效
本地存储：localStorage/IndexedDB，适合少量配置或大量结构化离线数据
服务端缓存：Redis、页面缓存、接口缓存
```

### HTML 入口
```nginx
location = /index.html {
  add_header Cache-Control "no-cache" always;
}
```

入口 HTML 要保持可更新。不要用每次变化的 `$request_id` 做 ETag，否则每次都无法命中 304；ETag 应代表内容版本。

### 带 hash 的静态资源
```nginx
location ~* \.(js|css|png|webp|woff2)$ {
  add_header Cache-Control "public, max-age=31536000, immutable" always;
}
```

内容变化会生成新文件名，旧文件可长期缓存。

### API 数据
```http
Cache-Control: private, max-age=60, stale-while-revalidate=30
ETag: "user-dashboard-v3"
```

公开数据可走 CDN；用户私有数据通常用 `private` 或 `no-store`。涉及权限、支付、账户安全的响应不要落盘缓存。

### 客户端 SWR 模式
```js
function createMemoryCache() {
  const cache = new Map();
  return {
    get(key) {
      const hit = cache.get(key);
      return hit && Date.now() < hit.expires ? hit.value : undefined;
    },
    set(key, value, ttl) {
      cache.set(key, { value, expires: Date.now() + ttl });
    },
  };
}
```

真实项目可用 TanStack Query、SWR 等库管理去重、过期、后台刷新、重试和窗口聚焦刷新。

### Service Worker 策略
```
App Shell / hashed assets：Cache First
HTML navigation：Network First + offline fallback
公开图片/字体：Stale While Revalidate
敏感 API：Network Only
```

### 失效手段
- 文件名 content hash：静态资源最可靠
- ETag/Last-Modified：协商缓存
- CDN purge/invalidation：紧急撤回
- 版本化 Cache Storage：SW activate 阶段清理旧缓存
- TTL + 后台刷新：应用数据缓存

### 风险
- `Vary`、Cookie、Authorization 配错会造成缓存污染或命中率低
- localStorage 同步阻塞主线程，不适合大数据；大数据用 IndexedDB
- 缓存敏感数据要评估隐私、退出登录清理和多账号切换

<!-- id: perf-034; difficulty: 3; tags: content-visibility, CSS优化, 长页面, 渲染优化; source: Google -->
# 什么是 content-visibility？如何用它优化长页面性能？

## content-visibility

`content-visibility` 允许浏览器跳过暂时不需要渲染的子树，减少初始渲染、布局和绘制成本。它适合长文档、信息流、折叠区块等内容很多但不一定立即可见的页面。

### 属性值
```css
content-visibility: visible; /* 默认，正常渲染 */
content-visibility: auto;    /* 视口外可跳过渲染，接近视口再渲染 */
content-visibility: hidden;  /* 跳过渲染并隐藏内容 */
```

### 基本用法
```css
.article-section {
  content-visibility: auto;
  contain-intrinsic-size: auto 800px;
}
```

`contain-intrinsic-size` 给跳过渲染的内容一个估计尺寸，避免滚动条跳动和 CLS。估计值越接近真实高度，体验越稳定。

### 与虚拟列表区别
```
虚拟列表：减少 DOM 节点数量，适合超长列表、表格、固定/可测量行高
content-visibility：DOM 仍存在，只是跳过渲染，适合长页面和区块内容
```

如果有几万行数据，虚拟列表仍然更合适；`content-visibility` 不是 JS 虚拟化的完全替代。

### 注意事项
- 被跳过的子树在某些 DOM 测量、查找、聚焦场景下可能触发渲染工作
- `content-visibility: hidden` 和 `display: none` 有相似隐藏效果，但保留渲染状态的语义不同
- 视口外内容仍在 DOM 中，占用内存，也会影响初始 HTML/DOM 解析成本
- 动态内容高度变化大时，intrinsic size 不准会导致滚动跳动

### 适用场景
```css
.feed-card,
.article-section,
.offscreen-panel {
  content-visibility: auto;
  contain-intrinsic-size: auto 480px;
}
```

现代 Chromium、Firefox、Safari 都已支持 `content-visibility`，但仍要在目标浏览器中实测，特别是可访问性、查找页面内容和滚动体验。

<!-- id: perf-035; difficulty: 2; tags: CSS动画, 渲染优化, 合成层, 60fps; source: 高频 -->
# 如何优化 CSS 动画的性能？

## CSS 动画性能优化

### 渲染路径
```
布局属性变化：Style → Layout → Paint → Composite
绘制属性变化：Style → Paint → Composite
合成属性变化：Style → Composite
```

性能通常是合成路径最好，但不是所有属性、所有元素都能稳定只走合成，最终要用 DevTools 验证。

### 优先动画 transform 和 opacity
```css
@keyframes slide-good {
  from { transform: translateX(-100px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
```

避免高频动画 `width/height/top/left/margin/font-size`，这些属性会影响布局。`filter`、大阴影、模糊等即使可合成，也可能非常昂贵，要谨慎。

### will-change
```js
card.addEventListener('pointerenter', () => {
  card.style.willChange = 'transform';
});
card.addEventListener('transitionend', () => {
  card.style.willChange = 'auto';
});
```

`will-change` 要在动画前给浏览器准备时间；只在少量即将动画的元素上用，动画后释放。写在 `:hover` 同一时刻通常准备时间不足。

### 控制动画规模
- 减少同时动画的元素数量
- 动画元素内部 DOM 尽量简单
- 避免动画期间读写布局或插入大量 DOM
- 大面积背景、滤镜、阴影要实测 paint/raster 成本

### 适配用户偏好
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

尊重减少动态效果偏好，也能降低低端设备负担。

### 帧预算
60Hz 下每帧约 16.67ms，120Hz 下只有约 8.33ms。JS、样式、布局、绘制、合成都共享这段预算。CSS 动画不等于一定流畅，主线程和合成线程都有可能成为瓶颈。

<!-- id: perf-036; difficulty: 1; tags: Gzip, Brotli, 压缩, Nginx; source: 高频 -->
# Gzip 和 Brotli 压缩有什么区别？如何配置？

## Gzip vs Brotli 压缩

### 对比
| | Gzip | Brotli |
|--|------|--------|
| 兼容性 | 极广 | 现代浏览器广泛支持，通常随 HTTPS 使用 |
| 压缩率 | 基准 | 通常比 Gzip 更小，具体取决于内容 |
| 动态压缩速度 | 较快 | 高压缩等级较慢 |
| 解压速度 | 快 | 通常也很快 |
| 适用 | 通用兜底 | 静态资源预压缩优先 |

不要固定说 Brotli 一定小 20%~30%，不同 JS/CSS/HTML、压缩等级和内容重复度差异很大。

### 协商过程
```http
Accept-Encoding: br, gzip, deflate
Content-Encoding: br
Vary: Accept-Encoding
```

`Vary: Accept-Encoding` 很重要，否则 CDN/代理可能把 Brotli 响应错误发给不支持 Brotli 的客户端。

### Nginx 配置
```nginx
gzip on;
gzip_min_length 1024;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript image/svg+xml;

# Brotli 需要对应模块或发行版支持
brotli on;
brotli_comp_level 5;
brotli_types text/plain text/css application/json application/javascript image/svg+xml;
```

### 预压缩静态资源
```js
import viteCompression from 'vite-plugin-compression';

export default {
  plugins: [
    viteCompression({ algorithm: 'gzip' }),
    viteCompression({ algorithm: 'brotliCompress', ext: '.br' }),
  ],
};
```

```nginx
gzip_static on;
brotli_static on;
```

构建期预压缩适合 JS/CSS/HTML/SVG/JSON，避免线上动态压缩占 CPU。图片、视频、woff2 这类本身已压缩资源通常不要再压。

### 实践建议
- Brotli 高等级适合构建期，不适合高流量动态响应实时压缩
- Gzip 作为兜底保留
- CDN 上确认是否自动压缩、是否缓存 `.br/.gz` 变体
- 用实际传输体积和 CPU 成本评估，不只看原始文件大小

<!-- id: perf-037; difficulty: 2; tags: TTFB, 服务器性能, CDN, 缓存; source: 高频 -->
# 什么是 TTFB？如何优化？

## TTFB（Time to First Byte）

TTFB 表示请求开始到收到响应第一个字节的时间，用来定位网络、连接、CDN、服务端处理和缓存问题。Core Web Vitals 辅助阈值通常是：≤ 800ms 良好，800ms~1800ms 需改进，> 1800ms 较差。

### 测量口径
```js
const [nav] = performance.getEntriesByType('navigation');

console.log({
  ttfbFromNavigationStart: nav.responseStart - nav.startTime,
  requestToFirstByte: nav.responseStart - nav.requestStart,
});
```

`responseStart - startTime` 更接近用户导航视角，可能包含重定向、Service Worker、DNS、TCP、TLS 等；`responseStart - requestStart` 更聚焦请求发出后的服务端和传输阶段。

### web-vitals 采集
```js
import { onTTFB } from 'web-vitals';

onTTFB((metric) => {
  console.log(metric.value, metric.rating);
});
```

### 优化方向
**降低服务端处理时间**
- 页面缓存、接口缓存、Redis/内存缓存
- 数据库索引、查询合并、避免 N+1
- SSR 数据并行，减少串行等待
- 预热冷启动、连接池和模板编译缓存

**降低网络和连接成本**
- HTML/API 靠近用户部署，使用 CDN、边缘计算或多地域
- 减少重定向
- 复用连接，启用 HTTP/2/HTTP/3
- 对关键第三方域名使用 `preconnect`

```html
<link rel="preconnect" href="https://api.example.com">
```

**提高缓存命中**
- 静态 HTML/SSG 页面走 CDN
- 可缓存 SSR 加 `s-maxage`、`stale-while-revalidate`
- 监控 CDN hit ratio 和回源 TTFB

TTFB 好不代表 LCP 一定好；它只是加载链路的第一段。

<!-- id: perf-038; difficulty: 2; tags: IntersectionObserver, 懒加载, 无限滚动, 曝光埋点; source: 高频 -->
# 什么是 Intersection Observer API？有哪些应用场景？

## Intersection Observer API

IntersectionObserver 异步观察目标元素与根容器的交叉状态，避免在滚动事件里频繁调用 `getBoundingClientRect()`。观察计算由浏览器调度，但回调仍在主线程执行，所以回调里也要保持轻量。

### 基本用法
```js
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      console.log(entry.target, entry.intersectionRatio);
    }
  }
}, {
  root: null,
  rootMargin: '200px 0px',
  threshold: [0, 0.5, 1],
});

observer.observe(element);
observer.unobserve(element);
observer.disconnect();
```

- `root`：滚动容器，默认视口
- `rootMargin`：扩大或缩小触发区域，常用于提前加载
- `threshold`：交叉比例到达指定值时触发

### 图片懒加载
```js
const imageObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const img = entry.target;
    img.src = img.dataset.src;
    img.srcset = img.dataset.srcset || '';
    imageObserver.unobserve(img);
  }
}, { rootMargin: '200px' });
```

### 无限滚动
```jsx
function useInfiniteScroll(loadMore) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore();
    }, { rootMargin: '400px' });

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  return ref;
}
```

要配合请求去重、加载状态和 hasMore，避免哨兵反复进入视口导致重复请求。

### 曝光埋点
```js
const seen = new WeakSet();
const impressionObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.intersectionRatio >= 0.5 && !seen.has(entry.target)) {
      seen.add(entry.target);
      trackImpression(entry.target.dataset.id);
    }
  }
}, { threshold: 0.5 });
```

曝光统计通常还要加停留时间，例如连续可见 1 秒才算有效曝光。

### 适用场景
图片/组件懒加载、无限滚动、曝光埋点、进入视口触发动画、目录高亮。它不适合像素级碰撞检测或每帧动画判断。

<!-- id: perf-039; difficulty: 3; tags: requestIdleCallback, requestAnimationFrame, 调度, 性能; source: 高频 -->
# requestIdleCallback 和 requestAnimationFrame 的区别与适用场景

## requestIdleCallback vs requestAnimationFrame

### requestAnimationFrame（rAF）
在下一次绘制前执行，适合视觉更新：动画、Canvas 绘制、根据滚动位置更新 UI。

```js
function move(element, targetX) {
  let start;
  function step(ts) {
    start ??= ts;
    const progress = Math.min(1, (ts - start) / 300);
    element.style.transform = `translateX(${targetX * progress}px)`;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
```

rAF 跟随屏幕刷新率，不一定是 16ms；后台标签页会被节流或暂停。

### requestIdleCallback（rIC）
在浏览器空闲时执行低优先级任务。MDN 仍标记它为 Limited availability，不是 Baseline 特性；生产代码要有降级方案，并为必须完成的任务设置 timeout。

```js
function idleWork(deadline) {
  while ((deadline.timeRemaining() > 0 || deadline.didTimeout) && tasks.length) {
    tasks.shift()();
  }

  if (tasks.length) {
    requestIdleCallback(idleWork, { timeout: 2000 });
  }
}

requestIdleCallback(idleWork, { timeout: 2000 });
```

适合：非关键预计算、缓存清理、低优先级埋点整理、预取候选计算。不适合用户输入反馈、动画、必须立即执行的业务逻辑。

### 对比
| | rAF | rIC |
|--|-----|-----|
| 时机 | 绘制前 | 主线程空闲时 |
| 目标 | 视觉更新 | 低优先级后台任务 |
| 可靠性 | 可预测但仍会受掉帧影响 | 不保证很快执行，需 timeout |
| 回调预算 | 取决于刷新率和本帧剩余工作 | `deadline.timeRemaining()` |

### 降级封装
```js
const scheduleIdle = window.requestIdleCallback
  ? (cb) => requestIdleCallback(cb, { timeout: 2000 })
  : (cb) => setTimeout(() => cb({ timeRemaining: () => 0, didTimeout: true }), 1);
```

React 的调度器不直接依赖 rIC，主要是因为 rIC 触发不够稳定和精细，无法满足交互更新调度需求。

<!-- id: perf-040; difficulty: 2; tags: Core Web Vitals, LCP, INP, CLS; source: 高频 -->
# 什么是 Core Web Vitals？LCP、INP、CLS 分别代表什么？如何优化？

## Core Web Vitals 优化

Core Web Vitals 当前核心是 LCP、INP、CLS，分别衡量加载体验、交互响应和视觉稳定性。是否达标通常看真实用户数据 P75。

### LCP：Largest Contentful Paint
- 含义：视口内最大内容元素完成渲染的时间
- 目标：≤ 2.5s 良好，2.5s~4s 需改进，> 4s 较差

优化：
```html
<link rel="preload" href="/hero.avif" as="image" fetchpriority="high">
<img src="/hero.avif" width="1200" height="630" fetchpriority="high" loading="eager" alt="">
```

- 降低 TTFB：CDN、缓存、SSR 数据并行
- 提前发现 LCP 图片，不要懒加载首屏主图
- 图片用正确尺寸、AVIF/WebP、`srcset/sizes`
- 减少关键 CSS/JS 阻塞和主线程长任务

### INP：Interaction to Next Paint
- 含义：交互到下一次绘制的延迟，覆盖页面生命周期中的交互表现
- 目标：≤ 200ms 良好，200ms~500ms 需改进，> 500ms 较差

优化：
```js
function yieldToMain() {
  return globalThis.scheduler?.yield
    ? scheduler.yield()
    : new Promise((resolve) => setTimeout(resolve, 0));
}
```

- 拆分 Long Task，减少输入排队时间
- 事件处理函数只做必要工作
- 重计算放 Web Worker、缓存或分块执行
- React 中用 `useDeferredValue`、`startTransition` 降低非紧急更新优先级
- 降低 hydration、首屏 JS 和大列表渲染成本

### CLS：Cumulative Layout Shift
- 含义：非预期布局偏移的累计体验指标，按 session window 统计最大偏移窗口
- 目标：≤ 0.1 良好，0.1~0.25 需改进，> 0.25 较差

优化：
```html
<img src="/cover.jpg" width="800" height="600" alt="">
<div class="ad-slot"></div>
```

```css
.ad-slot { min-height: 250px; }
@font-face { font-display: optional; }
.panel-enter { transform: translateY(0); opacity: 1; }
```

- 图片、视频、iframe、广告位预留尺寸
- 不在已有内容上方突然插入横幅或推荐位
- 字体使用合适 fallback、预加载和 `font-display`
- 动画优先使用 `transform/opacity`

### 面试表达
LCP 慢看 TTFB、关键资源发现、资源下载和渲染延迟；INP 差看长任务、事件处理和主线程；CLS 高看尺寸预留、动态插入和字体替换。

<!-- id: perf-041; difficulty: 2; tags: 图片优化, WebP, AVIF, 懒加载; source: 高频 -->
# 前端图片优化有哪些手段？

## 图片优化策略

### 1. 选择合适格式
```
JPEG：照片，兼容性好，不支持透明
PNG：无损和透明，适合截图、少色块图，但照片体积大
WebP：照片、透明图、动图都可用，现代浏览器支持好
AVIF：压缩潜力高，适合照片和首屏大图，但编码更慢
SVG：矢量图标、Logo、简单插画
GIF：动图体积大，新项目优先视频或 animated WebP/AVIF
```

不同格式大小没有绝对排序，要用真实图片和质量参数比较。

```html
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" width="800" height="600" alt="描述">
</picture>
```

### 2. 响应式图片
```html
<img
  src="image-800.webp"
  srcset="image-400.webp 400w, image-800.webp 800w, image-1200.webp 1200w"
  sizes="(max-width: 600px) 100vw, 600px"
  width="800"
  height="600"
  alt="响应式图片"
/>
```

`srcset/sizes` 让浏览器结合视口和 DPR 选合适尺寸，避免过度下载。

### 3. 加载优先级
```html
<img src="hero.avif" loading="eager" fetchpriority="high" width="1200" height="630" alt="">
<img src="thumb.webp" loading="lazy" decoding="async" width="320" height="180" alt="">
```

首屏 LCP 图不要懒加载；非首屏图片懒加载。所有图片都应提供尺寸或 `aspect-ratio`，避免 CLS。

### 4. CDN 和构建工具
```
https://cdn.example.com/image.jpg?w=800&q=75&format=auto
```

图片 CDN 可做裁剪、质量、格式、DPR、自适应缓存。构建侧可用 sharp、Squoosh、vite-imagetools 等生成多尺寸多格式产物。

### 5. SVG 和安全
SVG 用 SVGO 压缩；用户上传 SVG 必须清洗或转成安全格式，避免脚本、外链和事件属性风险。

### 验证
看 LCP 元素、传输体积、解码时间、缓存命中率和移动端实际下载尺寸，而不是只看图片格式。

<!-- id: perf-042; difficulty: 2; tags: 代码分割, 懒加载, dynamic import, React; source: 高频 -->
# 什么是代码分割（Code Splitting）？如何在 React 项目中实现？

## React 代码分割

代码分割把首屏不需要的代码移出初始 bundle，在路由切换、用户交互或空闲时再加载，目标是降低首屏下载、解析、执行和 hydration 成本。

### 路由级分割
```jsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function AppRoutes() {
  return (
    <Suspense fallback={<RouteSkeleton />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

生产环境建议加 Error Boundary，处理 chunk 加载失败、离线、发布后旧 HTML 引用旧 chunk 等场景。

### 组件级分割
```jsx
const HeavyChart = lazy(() => import('./HeavyChart'));

function Dashboard({ showChart }) {
  return showChart ? (
    <Suspense fallback={<ChartSkeleton />}>
      <HeavyChart />
    </Suspense>
  ) : null;
}
```

适合图表、富文本、地图、PDF 预览、低频弹窗。

### 动态 import 和预取
```js
button.addEventListener('click', async () => {
  const { run } = await import('./heavy-module.js');
  run();
});

button.addEventListener('mouseenter', () => {
  import('./heavy-module.js');
});
```

hover/viewport 预取能优化下一步体验，但要避免无意义下载。

### 手动分包要谨慎
```js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
};
```

手动分包服务于缓存和首屏，不是越多越好。过度拆分会增加 waterfall、加载状态和缓存管理复杂度。

### 分析工具
```bash
bunx vite-bundle-visualizer
bunx webpack-bundle-analyzer stats.json
```

最终要用 bundle analyzer、Network 瀑布图、LCP/INP 数据确认收益。

<!-- id: perf-043; difficulty: 2; tags: 虚拟列表, 长列表, 性能; source: 高频 -->
# 什么是虚拟列表（Virtual List）？如何实现？

## 虚拟列表（Virtual List）

虚拟列表只渲染视口附近的少量 DOM，用总高度占位撑开滚动条，滚动时替换可见数据。它能降低 DOM 数量、内存占用、首次渲染和滚动更新成本。

### 固定高度核心计算
```
totalHeight = items.length × itemHeight
startIndex = floor(scrollTop / itemHeight)
visibleCount = ceil(containerHeight / itemHeight)
endIndex = startIndex + visibleCount + overscan × 2
offsetY = startIndex × itemHeight
```

### 简化实现
```jsx
function VirtualList({ items, itemHeight = 50, height = 400, overscan = 3 }) {
  const [scrollTop, setScrollTop] = useState(0);

  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const count = Math.ceil(height / itemHeight) + overscan * 2;
  const end = Math.min(items.length, start + count);
  const offsetY = start * itemHeight;

  return (
    <div style={{ height, overflow: 'auto' }} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {items.slice(start, end).map((item) => (
            <div key={item.id} style={{ height: itemHeight }}>
              {item.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

`overscan` 防止快速滚动白屏；key 应使用稳定业务 id，不能在数据会插入、删除、排序时依赖 index。

### 推荐库
```bash
bun add @tanstack/react-virtual
bun add react-window
bun add react-virtuoso
```

```jsx
import { FixedSizeList } from 'react-window';

function Row({ index, style }) {
  return <div style={style}>Row {index}</div>;
}

<FixedSizeList height={400} width={600} itemCount={10000} itemSize={50} overscanCount={4}>
  {Row}
</FixedSizeList>
```

### 生产注意事项
- 动态高度要测量和缓存，高度变化会引起滚动跳动
- 无限加载要做请求去重和 hasMore 判断
- 保持焦点、键盘导航和可访问性语义
- 行组件复杂时配合 memo，避免滚动时反复重渲染
- 表格、sticky header、分组、反向列表要选支持对应能力的库

<!-- id: perf-044; difficulty: 3; tags: 性能监控, PerformanceObserver, Web Vitals; source: 高频 -->
# 如何在前端代码中采集性能指标？PerformanceObserver 怎么用？

## 前端性能指标采集

### Navigation Timing
```js
const [nav] = performance.getEntriesByType('navigation');

const timing = {
  dns: nav.domainLookupEnd - nav.domainLookupStart,
  tcp: nav.connectEnd - nav.connectStart,
  tls: nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0,
  requestToFirstByte: nav.responseStart - nav.requestStart,
  navigationToFirstByte: nav.responseStart - nav.startTime,
  download: nav.responseEnd - nav.responseStart,
  domParse: nav.domInteractive - nav.responseEnd,
  load: nav.loadEventEnd - nav.startTime,
};
```

跨域资源的详细时序需要服务端配置 `Timing-Allow-Origin`。

### PerformanceObserver
```js
let lcpEntry;
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  lcpEntry = entries[entries.length - 1];
}).observe({ type: 'largest-contentful-paint', buffered: true });

addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && lcpEntry) {
    send({ type: 'LCP', value: lcpEntry.startTime });
  }
});
```

LCP 最终值通常到页面隐藏前才确定，不能看到第一个 entry 就上报最终值。

### 手写 CLS 要按 session window
```js
let cls = 0;
let sessionValue = 0;
let sessionStart = 0;
let lastShift = 0;

new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.hadRecentInput) continue;

    if (sessionStart === 0 || entry.startTime - lastShift > 1000 || entry.startTime - sessionStart > 5000) {
      sessionStart = entry.startTime;
      sessionValue = 0;
    }

    sessionValue += entry.value;
    lastShift = entry.startTime;
    cls = Math.max(cls, sessionValue);
  }
}).observe({ type: 'layout-shift', buffered: true });
```

真实项目建议直接用 `web-vitals`，避免自己实现细节出错。

### web-vitals 上报
```js
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  const body = JSON.stringify({
    id: metric.id,
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    path: location.pathname,
  });

  navigator.sendBeacon('/api/metrics', body)
    || fetch('/api/metrics', { method: 'POST', body, keepalive: true });
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

### 自定义性能标记
```js
performance.mark('render:start');
renderHeavyComponent();
performance.mark('render:end');
performance.measure('render', 'render:start', 'render:end');
```

用 mark/measure 采集路由切换、组件初始化、首个业务数据可见等业务指标。

<!-- id: perf-045; difficulty: 2; tags: Tree Shaking, Bundle优化, Webpack, Vite; source: 高频 -->
# 什么是 Tree Shaking？如何确保它正确工作？

## Tree Shaking

Tree Shaking 是打包器基于模块依赖图标记未使用导出，再由压缩器删除无用代码的优化，最适合静态 ES Module。

### 前提
- 使用 ESM `import/export`
- 生产模式构建并启用压缩
- 模块副作用可被正确声明
- 第三方包提供可静态分析的入口

CommonJS 不是绝对不能优化，现代工具能处理部分简单场景，但动态 `require`、运行时导出和副作用会让优化效果明显变差。

### 副作用声明
如果所有模块都无副作用：
```json
{
  "sideEffects": false
}
```

如果 CSS、polyfill、全局注册必须保留：
```json
{
  "sideEffects": ["*.css", "*.scss", "./src/polyfills.js"]
}
```

`sideEffects` 只能是布尔值或数组，不要在同一个 JSON 对象里同时写两个同名字段。错误声明可能把必须执行的代码删掉。

### 常见失败原因
```js
// 动态 require，无法静态确定依赖
const fn = require(`./plugins/${name}`);

// 纯副作用导入，通常必须保留
import './setup';

// CommonJS 大入口，tree shaking 效果弱
import _ from 'lodash';
```

`import * as utils from './utils'` 不一定必然失败；如果后续访问是静态的，Rollup/Vite 仍可能摇掉未用导出。但写成更明确的具名导入更容易优化和阅读。

### 第三方库
```js
import { debounce } from 'lodash-es';
// 或
import debounce from 'lodash/debounce';
```

优先选择 ESM 入口、按需导入、避免引入整个 locale、图标库或 polyfill 包。

### 验证
```bash
bunx rollup-plugin-visualizer
bunx webpack-bundle-analyzer stats.json
bunx source-map-explorer 'dist/assets/*.js'
```

不要只看源码写法，要检查生产产物中未使用代码是否真的消失。

<!-- id: perf-046; difficulty: 2; tags: 防抖, 节流, 性能, 事件优化; source: 高频 -->
# 防抖（debounce）和节流（throttle）的区别是什么？各自适合什么场景？

## 防抖与节流

### 防抖（Debounce）
高频触发时等待一段安静期，只执行最后一次，适合“只关心最终结果”。

```js
function debounce(fn, delay) {
  let timer;

  const wrapped = function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };

  wrapped.cancel = () => clearTimeout(timer);
  return wrapped;
}

const search = debounce((query) => {
  fetchResults(query);
}, 300);
```

适用：搜索联想、输入校验、resize 结束后重新布局、自动保存。

### 节流（Throttle）
高频触发时按固定频率执行，适合“过程需要持续反馈”。

```js
function throttle(fn, interval) {
  let last = 0;
  let timer;

  return function (...args) {
    const now = Date.now();
    const remaining = interval - (now - last);

    if (remaining <= 0) {
      clearTimeout(timer);
      timer = null;
      last = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}
```

适用：滚动进度、拖拽、mousemove、埋点采样。视觉更新可以用 rAF 节流：

```js
let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    updateScrollProgress();
    ticking = false;
  });
}, { passive: true });
```

### 区别
| | 防抖 | 节流 |
|--|------|------|
| 执行时机 | 停止触发后 | 固定频率 |
| 关注点 | 最终值 | 过程采样 |
| 典型场景 | 搜索、校验、保存 | 滚动、拖拽、指针移动 |

按钮防连击不能只靠节流，关键操作还要禁用按钮、服务端幂等键和提交状态保护。

<!-- id: perf-047; difficulty: 3; tags: Web Worker, 多线程, 性能; source: 高频 -->
# Web Worker 是什么？如何用它优化性能？

## Web Worker

Web Worker 在独立线程执行 JS，能把 CPU 密集任务从主线程移走，降低长任务和 INP 风险。

### 能力与限制
- 不能访问 DOM、`window`、`document`
- 通过 `postMessage` 和主线程通信
- 可使用 `fetch`、WebSocket、IndexedDB、部分 Web Crypto 等 API
- 不能使用 `localStorage`，因为它是同步 Web Storage API，会阻塞主线程模型
- 数据传输默认使用 structured clone，大对象复制有成本；ArrayBuffer 可用 Transferable 转移所有权

### 基本用法
```js
// main.js
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

worker.postMessage({ type: 'compute', data: largeArray });
worker.onmessage = ({ data }) => renderResult(data);
worker.onerror = (event) => console.error(event.message);

// 不再需要时释放线程
worker.terminate();
```

```js
// worker.js
self.onmessage = ({ data }) => {
  if (data.type === 'compute') {
    const result = heavyComputation(data.data);
    self.postMessage({ type: 'result', result });
  }
};
```

### Transferable
```js
const buffer = new ArrayBuffer(1024 * 1024);
worker.postMessage(buffer, [buffer]); // 转移后主线程不再拥有这个 buffer
```

适合大二进制数据，避免复制成本。

### Comlink
```js
// worker.js
import { expose } from 'comlink';

expose({
  async computeHash(data) {
    return crypto.subtle.digest('SHA-256', data);
  },
});
```

```js
// main.js
import { wrap } from 'comlink';

const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
const api = wrap(worker);
const hash = await api.computeHash(data);
```

### 适用场景
图片处理、压缩、加密、搜索索引、大 JSON 解析、数据聚合、PDF/Excel 生成、语法高亮等 CPU 密集任务。

### 不适用
很小的计算、频繁小消息、强依赖 DOM 的逻辑不适合 Worker。Worker 能降低主线程压力，但会增加通信、序列化、线程生命周期管理成本。

<!-- id: perf-048; difficulty: 2; tags: requestAnimationFrame, requestIdleCallback, 动画; source: 高频 -->
# requestAnimationFrame 和 requestIdleCallback 的区别和使用场景？

## requestAnimationFrame 与 requestIdleCallback

### requestAnimationFrame（rAF）
在下一次绘制前执行，适合视觉更新：动画、Canvas、滚动相关 UI。

```js
let start;
function animate(ts) {
  start ??= ts;
  const progress = Math.min(1, (ts - start) / 300);
  el.style.transform = `translateX(${300 * progress}px)`;
  if (progress < 1) requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

rAF 跟随屏幕刷新率，不一定是 60fps；后台标签页会被暂停或节流。动画要用 timestamp/delta 计算，不要假设每帧固定 16.67ms。

### requestIdleCallback（rIC）
在主线程空闲时执行低优先级任务。它不是所有主流环境都稳定可用的 Baseline 特性，生产要有降级，并为必须完成的任务设置 timeout。

```js
function processIdle(deadline) {
  while ((deadline.timeRemaining() > 0 || deadline.didTimeout) && tasks.length) {
    tasks.shift()();
  }
  if (tasks.length) requestIdleCallback(processIdle, { timeout: 2000 });
}

requestIdleCallback(processIdle, { timeout: 2000 });
```

适合：低优先级缓存清理、非关键预计算、埋点整理。不适合动画、输入响应、关键业务提交。

### 对比
| | rAF | rIC |
|--|-----|-----|
| 执行时机 | 绘制前 | 空闲时 |
| 用途 | 视觉更新 | 低优先级后台任务 |
| 可靠性 | 跟随帧率，但可能掉帧 | 可能长时间不执行，需 timeout |
| 预算 | 受刷新率和本帧工作影响 | `deadline.timeRemaining()` |

### 降级封装
```js
const scheduleIdle = window.requestIdleCallback
  ? (cb) => requestIdleCallback(cb, { timeout: 2000 })
  : (cb) => setTimeout(() => cb({ timeRemaining: () => 0, didTimeout: true }), 1);
```

视觉更新用 rAF；可推迟的非关键工作用 rIC 或任务队列。

<!-- id: perf-049; difficulty: 3; tags: 内存泄漏, 内存管理, Chrome DevTools; source: 高频 -->
# 前端内存泄漏有哪些常见原因？如何排查和修复？

## 前端内存泄漏排查与修复

内存泄漏是无用对象仍被引用链持有，GC 无法回收。判断标准不是“内存变大”，而是重复进入、操作、离开并强制 GC 后，内存仍持续上升且引用链指向业务对象。

### 常见原因
**事件、定时器、rAF 未清理**
```js
useEffect(() => {
  const id = setInterval(fetchData, 1000);
  window.addEventListener('resize', handleResize);

  return () => {
    clearInterval(id);
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

**Observer 未断开**
```js
useEffect(() => {
  const observer = new IntersectionObserver(callback);
  observer.observe(ref.current);
  return () => observer.disconnect();
}, []);
```

**未取消请求、流和订阅**
```js
useEffect(() => {
  const controller = new AbortController();
  fetch('/api/data', { signal: controller.signal }).then(/* ... */);
  return () => controller.abort();
}, []);
```

WebSocket、EventSource、RxJS subscription、MediaStream 也要关闭。

**闭包和全局缓存持有大对象**
```js
const cache = new Map(); // 需要 TTL/LRU/容量上限
```

日志数组、撤销栈、编辑器历史、虚拟列表缓存都要有淘汰策略。

**Detached DOM 和 Object URL**
```js
const url = URL.createObjectURL(file);
img.onload = () => URL.revokeObjectURL(url);
```

DOM 从页面移除后如果仍被 JS 引用，会留在内存里。

### DevTools 排查步骤
1. Memory 面板拍 Heap Snapshot
2. 执行可疑流程：进入页面、操作、离开页面
3. 手动 GC 后再拍快照
4. 对比 retained size、constructor、detached nodes
5. 查看 retaining path 找到是谁持有引用
6. 用 Allocation instrumentation 观察持续分配来源

### 修复原则
生命周期内创建的外部资源必须在生命周期结束时释放；全局缓存必须有边界；异步任务要可取消；大对象引用用完置空或移出闭包。

<!-- id: perf-050; difficulty: 3; tags: 首屏优化, SSR, 骨架屏, 性能; source: 高频 -->
# 如何系统性地优化首屏加载性能？从哪些维度入手？

## 系统性优化首屏加载

首屏优化要先用数据拆阶段：连接和 TTFB、关键资源发现、资源下载、主线程执行、渲染和 LCP 元素。不要只堆技巧。

### 1. 缩短关键渲染路径
```html
<head>
  <style>/* 少量首屏必要 CSS */</style>
  <link rel="preload" href="/hero.avif" as="image" fetchpriority="high">
  <script type="module" src="/src/main.tsx"></script>
  <script async src="https://analytics.example.com/a.js"></script>
</head>
```

关键 CSS 可以内联，但要控制体积；非关键 CSS/JS 延后。第三方脚本异步、延迟或隔离加载。

### 2. 控制 JS 成本
- 路由级代码分割和重组件按需加载
- Tree Shaking、删除无用依赖、避免重复 polyfill
- 长任务拆分，非关键计算延后或放 Worker
- 减少 hydration 范围和首屏组件复杂度

### 3. 选择渲染策略
```
CSR：实现简单，但首屏依赖 JS
SSR/Streaming SSR：更快输出 HTML，但要控制 TTFB 和 hydration
SSG：构建期生成，适合 CDN 缓存
边缘渲染：降低跨地域 TTFB
```

公开页面和 SEO 页面优先 SSR/SSG；后台系统可更偏 CSR，但仍要控制包体。

### 4. 资源优化
- 图片：LCP 图不懒加载，AVIF/WebP、响应式尺寸、CDN、正确宽高
- 字体：WOFF2、子集化、preload 关键字体、`font-display`、减少 CLS
- 网络：CDN、HTTP/2/3、Brotli/Gzip、连接复用、`preconnect`
- 缓存：HTML `no-cache`，hash 静态资源长期缓存

### 5. 数据请求
- SSR 阶段并行请求，避免数据 waterfall
- BFF 聚合首屏接口，减少客户端串行等待
- 可缓存数据用 CDN/服务端缓存/SWR
- 客户端复用 SSR 初始数据，避免 hydrate 后重复请求

### 6. 骨架屏边界
骨架屏改善感知但不等于真实首屏变快。它应尽量由 HTML/CSS 直接出现，并预留最终内容空间，避免等待大 JS 后才显示骨架。

### 7. 监控闭环
```js
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
[onLCP, onINP, onCLS, onFCP, onTTFB].forEach((fn) => fn(sendToServer));
```

目标：LCP ≤ 2.5s、INP ≤ 200ms、CLS ≤ 0.1；FCP、TTFB、长任务、资源瀑布图用于定位瓶颈。优化完成后用 RUM P75 按设备、网络、地区验证。
