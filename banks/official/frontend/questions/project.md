# 项目深挖

<!-- id: proj-001; difficulty: 2; tags: Webpack, 工程化, 构建; source: 高频 -->
# Webpack 的构建流程是什么？从入口到输出经历了哪些阶段？

## Webpack 构建流程

Webpack 的核心是从入口出发构建模块图，再把模块图转成 chunk graph，最终生成 assets。

### 1. 初始化
- 合并 CLI 参数、配置文件和默认配置
- 创建 `Compiler`，注册插件：`plugin.apply(compiler)`
- 初始化 resolver、loader runner、NormalModuleFactory、Compilation 参数
- 调用 `compiler.run()` 或进入 watch 模式

### 2. 创建 Compilation
每一次构建都会创建新的 `Compilation`。`Compiler` 代表整个 webpack 实例，`Compilation` 代表一次具体构建，包含模块、依赖、chunk、assets、hash、warning/error 等状态。

### 3. Make：从 entry 构建模块图
```
entry → resolve 路径 → 创建 Module → 执行 loader → parser 分析依赖 → 递归构建
```

- Resolver 解析模块真实路径
- Loader 按配置转换源码，normal 阶段通常从右到左执行
- Parser 解析 JS AST，收集 `import`、`require`、动态导入等依赖
- 递归处理依赖，形成 Module Graph

### 4. Seal：生成 chunk 和优化
- 根据入口、动态 import、SplitChunks 等生成 Chunk Graph
- Tree Shaking、sideEffects、module concatenation 等优化模块
- Terser/CSS minimizer 等压缩产物
- 生成 runtime、content hash 和最终 assets

### 5. Process Assets / Emit
Webpack 5 推荐插件在 `compilation.hooks.processAssets` 阶段读取、修改或新增 assets。最后 emit 阶段把 assets 写入 `output.path`，并触发 `afterEmit`、`done` 等钩子。

### 核心对象
- `Compiler`：全局编译器，生命周期最长
- `Compilation`：一次构建的上下文
- `Module`：模块实体，通常对应源码或 loader 结果
- `Chunk`：一组会被输出到一起的模块
- `Asset`：最终输出文件内容

<!-- id: proj-002; difficulty: 2; tags: Webpack, Loader, Plugin; source: 高频 -->
# Webpack Loader 和 Plugin 的区别是什么？如何编写一个自定义 Loader 和 Plugin？

## Loader vs Plugin

| | Loader | Plugin |
|--|--------|--------|
| 作用 | 转换某类模块源码 | 扩展整个构建流程 |
| 粒度 | 模块级 | 构建级 / compilation 级 |
| 形式 | 导出函数，可同步/异步/Promise | 有 `apply(compiler)` 的对象或类 |
| 配置 | `module.rules` | `plugins` |
| 典型场景 | TS/JSX/CSS/图片转换 | 生成资源、注入变量、优化 chunk、上传产物 |

### Loader 要点
Loader normal 阶段通常从右到左执行，pitch 阶段从左到右执行。Loader 可以用 `this.getOptions()` 获取参数，用 `this.async()` 异步返回，用 `this.callback(err, code, map, meta)` 返回 source map 和元数据。

```js
// remove-console-loader.js
module.exports = function removeConsoleLoader(source) {
  const options = this.getOptions() || {};
  this.cacheable?.();

  const code = source.replace(/console\.log\([^)]*\);?/g, '');
  return code;
};
```

真实 loader 不建议靠正则处理 JS，应用 Babel、SWC 或 Acorn AST，避免误删字符串、注释和复杂表达式。

### 异步 Loader
```js
module.exports = function asyncLoader(source) {
  const callback = this.async();
  someAsyncTransform(source, (err, result, sourceMap) => {
    callback(err, result, sourceMap);
  });
};
```

### Plugin 示例
```js
const { Compilation, sources } = require('webpack');
const { RawSource } = sources;

class FileListPlugin {
  constructor(options = {}) {
    this.filename = options.filename || 'filelist.md';
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap('FileListPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'FileListPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        (assets) => {
          const content = Object.keys(assets)
            .map((name) => `- ${name} (${assets[name].size()} bytes)`)
            .join('\n');

          compilation.emitAsset(this.filename, new RawSource(`# 构建产物清单\n\n${content}`));
        },
      );
    });
  }
}

module.exports = FileListPlugin;
```

Webpack 5 中新增/更新资源应优先用 `compilation.emitAsset/updateAsset` 和 `processAssets`，不要直接改 `compilation.assets`。

<!-- id: proj-003; difficulty: 2; tags: Webpack, 优化, Tree Shaking; source: 高频 -->
# 如何优化 Webpack 构建速度和产物体积？

## Webpack 构建速度和产物体积优化

优化前先用 `webpack --profile --json > stats.json`、`webpack-bundle-analyzer`、SpeedMeasurePlugin 等找瓶颈。

### 构建速度
**1. 缩小编译范围**
```js
module.exports = {
  module: {
    rules: [{
      test: /\.[jt]sx?$/,
      include: path.resolve(__dirname, 'src'),
      use: 'babel-loader',
    }],
  },
};
```

**2. 持久化缓存**
```js
cache: {
  type: 'filesystem',
  buildDependencies: { config: [__filename] },
}
```

**3. 更快的 loader / minimizer**
- SWC、esbuild 可替代部分 Babel/Terser 工作
- TypeScript 类型检查放独立进程或 CI
- 开发环境关闭图片压缩、完整包分析等生产任务

**4. 多线程谨慎使用**
`thread-loader` 适合重型 Babel 转译，小任务会被 worker 启动和序列化成本抵消。

**5. DLL 的定位**
DLL Plugin 是历史方案。Webpack 5 有 filesystem cache 和 splitChunks 后，DLL 使用减少；`externals` 不是 DLL 的直接替代，它是把依赖从 bundle 中排除并交给外部全局变量/CDN 管理。

### 产物体积
**1. Tree Shaking**
- 使用 ESM 入口
- 正确声明 `sideEffects`
- 生产模式构建并压缩

**2. SplitChunks 和动态导入**
```js
optimization: {
  splitChunks: { chunks: 'all' },
}
```

```js
const Chart = lazy(() => import('./Chart'));
```

按路由、重组件和缓存生命周期拆分，不要机械拆成很多小 chunk。

**3. 依赖治理**
- 替换重型库、移除重复版本
- 图标、图表、日期库按需引入
- 避免把全部 locale、主题、语言包打进首屏

**4. 压缩和传输**
```js
optimization: {
  minimizer: [new TerserPlugin({ parallel: true }), new CssMinimizerPlugin()],
}
```

服务端配合 Brotli/Gzip，体积预算接入 CI，防止依赖回涨。

<!-- id: proj-004; difficulty: 2; tags: Vite, 工程化, ESBuild; source: 高频 -->
# Vite 为什么比 Webpack 快？Vite 的原理是什么？

## Vite 原理与优势

Vite 快主要指开发模式的冷启动和 HMR 快。它把传统 bundle-first 开发改成 request-first：先启动 dev server，浏览器请求到哪个源码模块，再按需转换哪个模块。

### 开发模式对比
| | 传统 bundler dev server | Vite dev server |
|--|--------------------------|-----------------|
| 冷启动 | 先构建整包或大模块图 | 直接启动，源码按需转换 |
| 源码加载 | 浏览器加载 bundle | 浏览器原生 ESM 按需请求模块 |
| HMR | 需要更新相关 bundle | 精确失效模块，浏览器动态 import 新模块 |
| 依赖 | 参与打包链路 | 预构建并强缓存 |

### 依赖预构建
Vite 开发时会预构建 `node_modules` 依赖，目的有两个：
1. 把 CommonJS/UMD 依赖转换成浏览器可加载的 ESM
2. 把内部模块很多的 ESM 包合并，避免浏览器一次发出大量请求

不同 Vite 版本内部实现有演进：Vite 7 传统链路常见是 esbuild 负责依赖预构建、Rollup 负责生产构建；Vite 8 迁移到 Rolldown/Oxc 方向，依赖优化和生产构建都在向 Rolldown 统一。

### 源码按需转换
```
浏览器请求 /src/App.tsx
  → Vite dev server 解析、转换 TSX/CSS/Vue 等
  → 返回 ESM
  → 浏览器继续请求 import 依赖
```

动态 import 后面的代码只有实际访问到对应页面或功能时才会被处理。

### HMR
Vite 维护模块依赖图。文件变化后，只让相关模块失效，通过 WebSocket 通知浏览器，浏览器重新 import 更新模块。React/Vue 插件在组件边界内做状态保留。

### 边界
- 首次访问大型页面仍可能因按需转换很多源码而慢
- 插件链、source map、TS/JSX 转换、monorepo 软链包会影响速度
- 生产构建是否更快取决于 Vite 版本、插件、压缩、代码分割和目标浏览器
- Full bundle dev 模式和 Rolldown 集成会让具体实现继续变化，面试要讲清“原理”而不是背死某个工具名

<!-- id: proj-005; difficulty: 3; tags: 微前端, qiankun, 架构; source: 高频 -->
# 什么是微前端？qiankun 的实现原理是什么？如何解决样式隔离和 JS 沙箱问题？

## 微前端与 qiankun 原理

微前端把大型前端拆成多个可独立开发、构建、部署的子应用，由主应用负责路由、加载、生命周期和公共能力。它主要解决组织协作、独立发布和遗留系统渐进迁移，不是天然性能优化方案。

### qiankun 加载流程
```js
import { registerMicroApps, start } from 'qiankun';

registerMicroApps([
  {
    name: 'react-app',
    entry: '//localhost:3001',
    container: '#sub-app',
    activeRule: '/react',
  },
]);

start();
```

- 基于 single-spa 管理子应用生命周期：bootstrap、mount、unmount
- 通过 HTML Entry 拉取子应用 HTML
- `import-html-entry` 解析 HTML，提取 JS/CSS
- 样式注入到容器，脚本在受控上下文中执行

### JS 沙箱
**SnapshotSandbox**：激活时保存 window 快照，卸载时还原变更。适合不支持 Proxy 的老环境，通常不支持多实例并行。

**ProxySandbox**：用 Proxy 包一层 fakeWindow，子应用写入落在 fakeWindow，读取时可回退到真实 window。支持多实例隔离，是现代环境常用方案。

```js
const fakeWindow = {};
const proxy = new Proxy(fakeWindow, {
  get(target, key) {
    return key in target ? target[key] : window[key];
  },
  set(target, key, value) {
    target[key] = value;
    return true;
  },
});
```

沙箱无法隔离所有副作用，例如网络请求、localStorage、IndexedDB、全局事件、定时器和 DOM 外挂节点仍要靠规范和生命周期清理。

### CSS 隔离
```js
start({
  sandbox: {
    strictStyleIsolation: true,
    // experimentalStyleIsolation: true,
  },
});
```

- `strictStyleIsolation`：用 Shadow DOM 包裹子应用，隔离强，但弹窗、全局样式、第三方组件库和样式穿透要适配
- `experimentalStyleIsolation`：运行时改写 CSS 选择器，给子应用容器加作用域前缀，隔离较弱但兼容性通常更好；官方仍称 experimental
- 动态加载/卸载样式只能减少残留，不能解决全局选择器污染

### 应用通信
```js
import { initGlobalState } from 'qiankun';

const actions = initGlobalState({ user: null });
actions.onGlobalStateChange((state, prev) => console.log(state, prev));
actions.setGlobalState({ user: { name: 'Alice' } });
```

更推荐通过 props、事件总线、URL、共享认证和后端状态做低耦合通信，避免子应用互相直接调用内部实现。

### 工程风险
- 重复依赖和重复运行时导致性能变差
- 样式、路由、全局状态、权限和监控要统一治理
- 子应用独立部署要处理版本兼容和回滚
- 微前端适合组织复杂度高的系统，不适合为了“技术炫技”引入

<!-- id: proj-006; difficulty: 2; tags: 监控, 错误上报, 埋点; source: 高频 -->
# 如何在前端项目中实现错误监控和上报？捕获哪些类型的错误？

## 前端错误监控体系

### 需要捕获的错误
1. JS 运行时错误
2. 未处理的 Promise rejection
3. 资源加载失败：script、link、img、video 等
4. 框架错误：React Error Boundary、Vue errorHandler
5. 接口错误和超时
6. 白屏、路由加载失败、chunk 加载失败等业务可用性错误

### 全局 JS 错误
```js
window.addEventListener('error', (event) => {
  if (event.target !== window) return;

  report({
    type: 'js_error',
    message: event.message,
    stack: event.error?.stack,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});
```

跨域脚本如果没有 `crossorigin` 和服务端 CORS，浏览器可能只给 `Script error.`，拿不到完整堆栈。

### Promise rejection
```js
window.addEventListener('unhandledrejection', (event) => {
  report({
    type: 'promise_error',
    message: event.reason?.message ?? String(event.reason),
    stack: event.reason?.stack,
  });
});
```

### 资源错误
```js
window.addEventListener('error', (event) => {
  const target = event.target;
  if (target === window) return;

  if (target instanceof HTMLScriptElement || target instanceof HTMLLinkElement || target instanceof HTMLImageElement) {
    report({
      type: 'resource_error',
      tagName: target.tagName,
      url: target.src || target.href,
    });
  }
}, true);
```

资源错误不冒泡，必须在捕获阶段监听。

### React 错误边界
```jsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error, info) {
    report({
      type: 'react_error',
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }
}
```

Error Boundary 不捕获事件处理器、异步回调、服务端渲染错误，需要配合全局监听和业务 try/catch。

### 接口错误
```js
axios.interceptors.response.use(
  (res) => res,
  (error) => {
    report({
      type: 'api_error',
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      requestId: error.response?.headers?.['x-request-id'],
      message: error.message,
    });
    return Promise.reject(error);
  },
);
```

### 上报策略
- 按 session 采样、去重、限流，避免错误风暴
- 批量队列，优先 `sendBeacon`，失败用 `fetch(..., { keepalive: true })` 兜底
- 带 release、route、user/session、设备、网络、requestId
- URL、用户信息、请求体、错误栈脱敏
- Source Map 上传到监控平台或私有存储，不要公开暴露；按 release 精确匹配还原堆栈

<!-- id: proj-007; difficulty: 2; tags: 埋点, 性能监控, 用户行为; source: 高频 -->
# 如何设计前端埋点系统？声明式埋点和命令式埋点有什么区别？

## 前端埋点系统设计

### 埋点类型
| 类型 | 做法 | 优点 | 缺点 |
|--|--|--|--|
| 命令式 | 业务代码显式 `track()` | 精准、适合复杂业务语义 | 侵入代码，维护成本高 |
| 声明式 | data 属性、指令、组件 props 描述 | 低侵入，适合点击/曝光 | 复杂条件和业务上下文表达弱 |
| 自动/无埋点 | 自动采集点击、路由、曝光 | 覆盖广 | 噪音大、语义弱、隐私风险高 |

### SDK 基础能力
```js
class Analytics {
  constructor({ dsn, sampleRate = 1 }) {
    this.dsn = dsn;
    this.sampled = Math.random() <= sampleRate;
    this.queue = [];
  }

  track(event, properties = {}) {
    if (!this.sampled) return;
    this.queue.push({ event, properties, context: this.getContext(), ts: Date.now() });
    if (this.queue.length >= 10) this.flush();
  }

  flush() {
    const body = JSON.stringify(this.queue.splice(0));
    navigator.sendBeacon?.(this.dsn, body) || fetch(this.dsn, { method: 'POST', body, keepalive: true });
  }
}
```

### 声明式点击埋点
```html
<button data-track-click data-event="add_to_cart" data-product-id="123">加入购物车</button>
```

```js
document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-track-click]');
  if (!target) return;

  analytics.track(target.dataset.event, {
    productId: target.dataset.productId,
  });
}, true);
```

### 曝光埋点
```js
const timers = new WeakMap();
const seen = new WeakSet();

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const el = entry.target;
    if (entry.intersectionRatio >= 0.5 && !seen.has(el)) {
      timers.set(el, setTimeout(() => {
        seen.add(el);
        analytics.track('element_exposure', { id: el.dataset.trackId });
        observer.unobserve(el);
      }, 1000));
    } else {
      clearTimeout(timers.get(el));
    }
  }
}, { threshold: [0, 0.5] });
```

曝光通常要满足可见比例和停留时间，避免一闪而过也算曝光。

### 数据模型
```json
{
  "event": "button_click",
  "schema_version": "1.0",
  "timestamp": 1704067200000,
  "session_id": "abc123",
  "anonymous_id": "anon_1",
  "user_id": "hash_user_456",
  "route": "/checkout",
  "release": "1.2.3",
  "properties": { "button_id": "submit" },
  "context": { "referrer": "...", "viewport": "1920x1080", "network": "4g" }
}
```

### 工程要点
- 建事件字典和 schema 校验，避免同一事件多种命名
- 按 session 采样，批量上报，页面隐藏时 flush
- 隐私脱敏，不上报明文手机号、邮箱、token、完整 URL 敏感参数
- SPA 路由变化要上报 page view
- 失败重试要有限制，不能阻塞业务主流程

<!-- id: proj-008; difficulty: 2; tags: 性能监控, Web Vitals, LCP; source: 高频 -->
# 如何在项目中采集和监控 Core Web Vitals（LCP、INP、CLS）？

## Core Web Vitals 监控实现

### 使用 web-vitals
```js
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

function reportMetric(metric) {
  analytics.track('web_vital', {
    metric_name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    metric_id: metric.id,
    navigation_type: metric.navigationType,
    route: location.pathname,
  });
}

onLCP(reportMetric);
onINP(reportMetric);
onCLS(reportMetric);
onFCP(reportMetric);
onTTFB(reportMetric);
```

真实站点要按 route、release、device、network 聚合 P75，而不是只看平均值。

### 手动 LCP
```js
let lcp;
const lcpObserver = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  lcp = entries[entries.length - 1];
});
lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && lcp) {
    report({ name: 'LCP', value: lcp.startTime, element: lcp.element?.tagName });
    lcpObserver.disconnect();
  }
});
```

LCP 会更新多次，最终值通常到页面隐藏前才确定。

### 手动 CLS：按 session window
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

手写容易漏细节，生产优先用 `web-vitals`。

### 阈值
| 指标 | 良好 | 待改进 | 差 |
|--|--|--|--|
| LCP | ≤ 2.5s | 2.5s~4.0s | > 4.0s |
| INP | ≤ 200ms | 200ms~500ms | > 500ms |
| CLS | ≤ 0.1 | 0.1~0.25 | > 0.25 |
| FCP | ≤ 1.8s | 1.8s~3.0s | > 3.0s |
| TTFB | ≤ 800ms | 800ms~1800ms | > 1800ms |

上报时用 `sendBeacon` 或 `fetch keepalive`，并做采样、脱敏和限流。

<!-- id: proj-009; difficulty: 2; tags: CI/CD, 部署, DevOps; source: 高频 -->
# 描述一个完整的前端 CI/CD 流程，包括代码检查、构建、测试、部署各阶段

## 前端 CI/CD 流程设计

以 Bun + GitHub Actions + 静态资源部署为例，流程通常分为：安装依赖、代码检查、测试、构建、预览部署、E2E、生产部署、发布后验证。

```yaml
name: ci

on:
  pull_request:
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run check
      - run: bun run build

  e2e:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run build
      - run: bun run preview &
      - run: bunx playwright test

  deploy:
    runs-on: ubuntu-latest
    needs: [quality, e2e]
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
      - name: Deploy to CDN
        run: |
          aws s3 sync dist/ s3://${{ secrets.S3_BUCKET }} --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CF_ID }} --paths "/index.html"
```

### 阶段说明
- **代码检查**：Biome/ESLint、TypeScript、格式检查、依赖合法性
- **测试**：单元测试、组件测试、E2E、视觉回归按风险选择
- **构建**：生产构建、产物体积预算、source map 生成和上传
- **部署**：预览环境用于 PR 验收，main 分支部署生产
- **发布后验证**：健康检查、错误率、Web Vitals、接口 5xx、回滚开关

### 关键实践
1. Secrets 管理 token 和云厂商凭证，避免写入仓库
2. 依赖安装使用 lockfile 和 frozen 模式，保证可复现
3. 静态资源 hash 长缓存，HTML 单独失效，避免全站 CDN purge
4. 灰度、蓝绿或 canary 发布，异常自动回滚
5. CI 并行化，但部署前要有明确的必过 gate

<!-- id: proj-010; difficulty: 3; tags: 架构设计, 大型项目, 模块化; source: 高频 -->
# 如何设计一个可维护的大型前端项目架构？包括目录结构、模块划分、状态管理等

## 大型前端项目架构设计

### 目录结构
```
src/
├── app/                 # 应用装配：路由、providers、全局初始化
├── pages/               # 页面层：组合 feature，不放复杂业务逻辑
├── features/            # 业务功能模块
│   ├── auth/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── model/
│   │   └── index.ts     # 公开 API
│   └── product/
├── entities/            # 可选：跨 feature 的业务实体模型
├── shared/              # 纯通用能力：UI、utils、hooks、types
└── infrastructure/      # http、storage、analytics、feature flags
```

### 模块边界
```ts
// features/auth/index.ts
export { LoginForm } from './components/LoginForm';
export { useAuth } from './hooks/useAuth';
export type { User } from './model/types';
```

其他模块只依赖公开 API，不直接 import `features/auth/model/internalStore` 这类内部文件。用 ESLint boundaries 或 dependency-cruiser 做约束。

### 依赖方向
```
app/pages → features/entities → shared
app/pages/features → infrastructure
shared 不依赖业务和基础设施副作用
```

`shared` 应保持纯净，不能因为方便把业务逻辑塞进去；否则会变成新的垃圾桶模块。

### 状态分层
```ts
// 服务端状态：TanStack Query / SWR，负责缓存、重试、失效、并发去重
const products = useQuery({ queryKey: ['products'], queryFn: fetchProducts });

// 全局客户端状态：Zustand/Redux，放主题、登录用户、全局 UI
const useAppStore = create<AppState>(() => ({ theme: 'light' }));

// 表单状态：React Hook Form / Formik 或局部 reducer
// 局部 UI 状态：useState / useReducer，就近管理
```

不要把服务端数据复制进全局 store 当缓存，容易失效和重复请求。

### API 层
```ts
// infrastructure/http/client.ts
export async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json() as Promise<T>;
}

// features/product/api/productApi.ts
export const productApi = {
  list: (params: ListParams) => request<Product[]>(`/api/products?${new URLSearchParams(params)}`),
};
```

统一处理鉴权、错误、超时、重试、requestId、埋点和取消。

### 可维护性机制
- 类型边界：API schema、DTO 到 ViewModel 转换
- 测试分层：utils 单测、组件测试、关键路径 E2E
- 性能预算：bundle size、Web Vitals、长任务
- 代码规范：Biome/ESLint、提交检查、CI gate
- 渐进式拆分：按业务边界拆 feature，不为抽象而抽象

<!-- id: proj-011; difficulty: 2; tags: Rollup, 打包, 库开发; source: 高频 -->
# 如何用 Rollup 打包一个 npm 组件库？需要注意哪些配置？

## Rollup 打包 npm 组件库

Rollup 适合库打包：输出干净、ESM 友好、Tree Shaking 效果好，常用于组件库、工具库和 SDK。

### 配置示例
```js
// rollup.config.mjs
import { createRequire } from 'node:module';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import { defineConfig } from 'rollup';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');
const external = [
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.dependencies || {}).filter((name) => name !== '@my/runtime-needed-in-bundle'),
];

export default defineConfig([
  {
    input: 'src/index.ts',
    external,
    output: [
      { file: 'dist/index.mjs', format: 'esm', sourcemap: true },
      { file: 'dist/index.cjs', format: 'cjs', sourcemap: true, exports: 'named' },
    ],
    plugins: [resolve(), commonjs(), typescript({ tsconfig: './tsconfig.json' })],
  },
  {
    input: 'dist/types/index.d.ts',
    output: { file: 'dist/index.d.ts', format: 'esm' },
    plugins: [dts()],
  },
]);
```

### package.json
```json
{
  "name": "my-component-lib",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./style.css": "./dist/style.css"
  },
  "files": ["dist"],
  "sideEffects": ["*.css"],
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  }
}
```

### 注意事项
- React、Vue 等宿主框架放 `peerDependencies` 并 external，避免消费方打出两份 React
- 如果 CSS 有副作用，不能简单写 `sideEffects: false`
- 类型声明可用 `tsc --emitDeclarationOnly` 或 `rollup-plugin-dts` 汇总
- 同时输出 ESM/CJS 时要关注 dual package hazard，确保 exports 指向清晰
- 组件库需要测试 tree shaking、按需引入、样式引入和 source map
- UMD/IIFE 只有浏览器 CDN 直引需求时才输出，并配置 `globals`

<!-- id: proj-012; difficulty: 2; tags: 性能, 白屏, 首屏优化; source: 高频 -->
# 项目首屏白屏时间过长，你会如何排查和优化？

## 首屏白屏排查与优化

### 先定位白屏发生在哪一段
- Network：HTML TTFB、重定向、JS/CSS/图片瀑布图
- Performance：FCP/LCP、主线程长任务、hydrate/初始化耗时
- Coverage / bundle analyzer：首屏未使用 JS/CSS
- RUM：按设备、网络、地区、浏览器看 P75/P95

### 1. HTML 太晚或太空
纯 CSR 常见链路是：空 HTML → 下载 JS → 执行框架 → 请求数据 → 渲染。优化方式：
- SSR/SSG/Streaming SSR 输出首屏 HTML
- 至少在 HTML 中输出 app shell 或关键骨架
- CDN/边缘缓存可缓存 HTML，降低 TTFB

### 2. JS Bundle 过大
```js
const Home = React.lazy(() => import('./pages/Home'));
const Editor = React.lazy(() => import('./components/Editor'));
```

- 路由级代码分割
- 富文本、图表、地图、PDF 等低频重组件按需加载
- 替换重型依赖，移除重复版本和无用 polyfill
- 通过 analyzer 验证真实产物，不只看源码 import

### 3. 关键资源阻塞
```html
<style>/* 少量 critical CSS */</style>
<link rel="preload" href="/hero.avif" as="image" fetchpriority="high">
<script type="module" src="/src/main.tsx"></script>
<script async src="https://analytics.example.com/a.js"></script>
```

主脚本用 module/defer，第三方脚本 async/延后。首屏字体和 LCP 图要早发现，非关键 CSS/JS 延迟。

### 4. 首屏数据慢
```js
const [user, config, products] = await Promise.all([
  fetchUser(),
  fetchConfig(),
  fetchProducts(),
]);
```

避免数据瀑布，BFF 聚合首屏接口，SSR 注入初始数据时要安全序列化并让客户端复用。

### 5. 图片和字体
- LCP 图不懒加载，使用合适尺寸、AVIF/WebP、`srcset/sizes`
- 图片提供 width/height，避免 CLS
- 字体用 WOFF2、子集化、preload 关键字体、`font-display`

### 骨架屏边界
骨架屏改善感知，不一定降低真实白屏。如果骨架也要等 JS 执行后才出现，价值有限。最好让骨架由 HTML/CSS 直接渲染。

### 评估
优化后看 FCP、LCP、TTFB、INP、CLS 和错误率。用 RUM 确认真实用户 P75 改善，而不是只看本地 Lighthouse。

<!-- id: proj-013; difficulty: 2; tags: Webpack, splitChunks, 代码分割; source: 高频 -->
# 详解 Webpack splitChunks 配置，如何合理分割 Chunk？

## Webpack splitChunks 设计

`splitChunks` 用来把公共模块、第三方依赖和异步模块拆成独立 chunk，目标是减少重复代码、优化首屏和提高长期缓存命中率。

### 基础配置
```js
optimization: {
  runtimeChunk: 'single',
  moduleIds: 'deterministic',
  chunkIds: 'deterministic',
  splitChunks: {
    chunks: 'all',
    minSize: 20_000,
    minChunks: 1,
    maxInitialRequests: 30,
    maxAsyncRequests: 30,
    cacheGroups: {
      react: {
        test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
        name: 'react-vendor',
        priority: 30,
        reuseExistingChunk: true,
      },
      vendors: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        priority: 10,
        reuseExistingChunk: true,
      },
      common: {
        minChunks: 2,
        priority: 0,
        reuseExistingChunk: true,
      },
    },
  },
}
```

`runtimeChunk: 'single'` 可以把 webpack runtime 单独拆出，减少业务 chunk 内容 hash 被 runtime 变化影响。

### cacheGroups 关键字段
- `test`：匹配模块路径
- `chunks`：作用于 async、initial 还是 all
- `priority`：多个组命中时优先级高者生效
- `minChunks`：至少被几个 chunk 复用
- `reuseExistingChunk`：复用已有 chunk，减少重复拆分
- `enforce`：强制忽略默认大小和请求数限制，谨慎使用

### 分割策略
```
app.[hash].js          入口和首屏业务，频繁变
runtime.[hash].js      webpack runtime
react-vendor.[hash].js React 相关，变化少
vendors.[hash].js      其他第三方依赖
page-*.chunk.js        路由级懒加载
```

不要把所有 node_modules 永远打成一个巨大 vendors。大依赖如图表、编辑器、地图可以随路由异步加载，避免拖累首屏。

### 评估指标
- 首屏请求数和 waterfall 是否恶化
- 初始 JS 下载、解析、执行时间是否下降
- 长期缓存命中率是否提升
- 是否出现重复依赖或过小 chunk

合理分割是结合业务路由、缓存生命周期、HTTP/2/3 和真实性能数据调出来的，不是固定模板。

<!-- id: proj-014; difficulty: 2; tags: Service Worker, 缓存, PWA; source: 高频 -->
# 如何在项目中使用 Service Worker 实现离线缓存和性能优化？

## Service Worker 离线缓存和性能优化

### 注册
```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const reg = await navigator.serviceWorker.register('/sw.js');
    console.log(reg.scope);
  });
}
```

SW 需要 HTTPS 或 localhost，不能直接操作 DOM，生命周期独立且事件驱动。

### 安全的运行时缓存
```js
const CACHE_NAME = 'app-v1';

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, '/offline.html'));
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || cache.match(fallbackUrl);
  }
}
```

不要缓存非 GET、错误响应、鉴权敏感 API 或用户隐私数据。

### 生命周期更新
- `install` 预缓存 app shell 和 offline 页面
- `activate` 清理旧版本缓存
- `skipWaiting()` / `clients.claim()` 可立即接管，但可能造成旧页面使用新缓存，需设计刷新提示

### Workbox / vite-plugin-pwa
```js
VitePWA({
  strategies: 'generateSW',
  workbox: {
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.pathname.startsWith('/assets/'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'assets',
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
    ],
  },
});
```

生产优先用 Workbox 管理 precache manifest、缓存过期、路由策略和更新流程。

### 注意事项
- Cache Storage 不等于 HTTP cache，要自己做版本和清理
- API 缓存要结合权限、实时性和退出登录清理
- DevTools Application 面板验证离线、更新和缓存命中
- SW bug 影响面大，必须有回滚和 unregister 策略

<!-- id: proj-015; difficulty: 2; tags: 技术选型, React, Vue; source: 高频 -->
# 你在项目中是如何做技术选型的？以"选 React 还是 Vue"为例说明思路

## 技术选型方法论

技术选型不是比较“哪个框架更强”，而是在约束下选择风险最小、长期成本可控的方案。

### 评估维度
- **业务约束**：上线时间、SEO、首屏性能、离线、国际化、可访问性
- **团队约束**：现有经验、招聘、维护人员、学习成本
- **生态**：路由、状态、表单、UI、测试、SSR/SSG、监控、社区活跃度
- **工程成本**：构建、调试、类型、代码规范、CI/CD、升级成本
- **风险**：框架生命周期、破坏性升级、供应链、长期维护

### React vs Vue
| 维度 | React | Vue |
|--|--|--|
| 思路 | UI 库，组合自由度高 | 渐进式框架，官方配套更完整 |
| 模板 | JSX，接近 JS 表达能力 | SFC template，约束更明确 |
| 状态 | 可选 Redux/Zustand/Jotai/Query 等 | Pinia 官方推荐，生态集中 |
| TS | 成熟 | Vue 3 + Volar 体验已很好 |
| SSR | Next.js、Remix 等生态强 | Nuxt 生态成熟 |
| 团队体验 | 适合已有 React/Hooks 心智团队 | 适合偏模板和约定的团队 |

性能不是通常的决定性因素，两者都能做出高性能应用；差异更多来自工程实践、包体、数据请求和渲染策略。

### 决策流程
1. 明确不可妥协约束：交付时间、SEO、团队技能、已有资产
2. 建候选方案和权重表
3. 用 POC 验证核心路径：路由、权限、表单、列表、构建、SSR、测试
4. 评估迁移和维护成本
5. 写 ADR，记录决策、理由、替代方案和后果

### ADR 示例
```markdown
# ADR-001: 选择 React + TypeScript + Vite

## 背景
团队 8 人，其中 5 人有 React 经验；项目是 B2B SaaS，需要复杂表格、权限和长周期维护。

## 决策
采用 React + TypeScript + Vite，服务端状态使用 TanStack Query，客户端状态使用 Zustand。

## 理由
- 团队经验匹配，交付风险低
- 组件和表格生态满足需求
- 与现有内部组件库兼容

## 后果
- 需要制定 Hooks、状态和数据请求规范
- 需要用性能预算约束复杂组件和包体
- 若后续招聘 Vue 团队，迁移成本高
```

关键是把选型变成可解释、可回滚、可复盘的工程决策。

<!-- id: proj-016; difficulty: 3; tags: SSR, Next.js, 渲染模式; source: 高频 -->
# 解释 CSR、SSR、SSG、ISR 四种渲染模式的区别和适用场景

## 四种渲染模式

核心差异是 HTML 在哪里、什么时候生成，以及数据新鲜度如何保证。

| 模式 | HTML 生成时机 | 首屏/SEO | 数据新鲜度 | 典型场景 |
|--|--|--|--|--|
| CSR | 浏览器下载 JS 后生成 | 首屏依赖 JS，SEO 弱 | 客户端请求实时数据 | 后台、控制台、强交互 SPA |
| SSR | 每次请求在服务端生成 | 首屏和 SEO 好，TTFB 受后端影响 | 每次请求最新 | 个性化页面、实时价格、登录态页面 |
| SSG | 构建时预生成 | 最快，可直接 CDN 缓存 | 依赖重新构建 | 文档、博客、营销页 |
| ISR | 先静态生成，再按时间或事件失效重建 | 接近 SSG | 秒级到分钟级最终一致 | 商品详情、CMS 内容、新闻列表 |

### CSR
```text
服务端返回空壳 HTML + JS -> 浏览器执行 JS -> 拉接口 -> 渲染页面
```

优点是部署简单、服务端压力小、交互体验容易做；缺点是首屏、低端机解析 JS、SEO 和无 JS 可用性较弱。适合登录后的业务系统，不适合依赖搜索收录的公开内容页。

### SSR
```tsx
// Next.js App Router：禁用数据缓存，每次请求取最新数据
export default async function Page() {
  const product = await fetch('https://api.example.com/product/1', {
    cache: 'no-store',
  }).then((res) => res.json())

  return <h1>{product.name}</h1>
}
```

SSR 返回可直接展示的 HTML，再由客户端 hydration 接管交互。它适合强 SEO 且数据按请求变化的页面，但要关注服务端容量、缓存策略、接口超时、hydration mismatch，以及把用户态数据错缓存给其他用户的风险。

### SSG
```tsx
// 构建时生成静态路径
export async function generateStaticParams() {
  const posts = await getPosts()
  return posts.map((post) => ({ id: post.id }))
}

export default async function Page({ params }) {
  const post = await getPost(params.id)
  return <article>{post.title}</article>
}
```

SSG 的 HTML 可以长期放在 CDN，性能和稳定性最好，但内容变化需要重新构建或发布。适合内容稳定、路径规模可控的站点。

### ISR
```tsx
// Next.js App Router：最多每 60 秒重新生成一次
export const revalidate = 60

export default async function Page() {
  const data = await fetch('https://api.example.com/posts', {
    next: { tags: ['posts'] },
  }).then((res) => res.json())

  return <PostList items={data} />
}
```

ISR 本质是“静态缓存 + 后台再生成”。过期后通常先返回旧内容，同时触发再生成；再生成失败时继续服务上一个成功版本。也可以用 `revalidatePath` 或 `revalidateTag` 做按需失效。限制是不能把它当强一致实时系统，静态导出也无法使用 ISR。

### 选择原则
- 后台、登录后强交互：优先 CSR，配合接口缓存和骨架屏
- 公开内容、内容稳定：优先 SSG
- 公开内容、定期更新、能接受最终一致：优先 ISR
- 强个性化或必须请求时最新：SSR，但要设计边缘/CDN/服务端缓存
- 混合页面很常见：首屏内容 SSR/SSG/ISR，非关键交互模块客户端渲染

<!-- id: proj-017; difficulty: 2; tags: monorepo, pnpm, Turborepo; source: 高频 -->
# 什么是 Monorepo？如何用 pnpm + Turborepo 管理 Monorepo 项目？

## Monorepo + pnpm + Turborepo

Monorepo 是把多个应用和共享包放在同一个 Git 仓库中管理，例如 `apps/web`、`apps/admin`、`packages/ui`、`packages/config`。它解决的是跨包协作、统一版本、原子提交和复用构建缓存的问题，不等于把所有代码耦合在一起。

### 适用与代价
优点：
- 同一 PR 可以同时修改应用和依赖包，避免多仓库发版串联
- 统一 TypeScript、Lint、测试、发布和依赖治理
- 通过任务图和缓存只构建受影响包，提高 CI 效率

代价：
- 仓库和 CI 配置更复杂
- 包边界容易被破坏，需要依赖规则和 CODEOWNERS
- 权限粒度通常粗于多仓库，需要用目录权限或流程补足

### pnpm workspace
```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// apps/web/package.json
{
  "name": "@acme/web",
  "dependencies": {
    "@acme/ui": "workspace:*",
    "@acme/utils": "workspace:^"
  }
}
```

pnpm 的 `workspace:*` 保证引用本仓库包，发布时再按真实版本替换。实践中还要固定根 `packageManager`、提交 `pnpm-lock.yaml`，共享 `tsconfig`/lint 配置，并让共享包声明正确的 `peerDependencies`，避免 React 等运行时依赖被打包多份。

### Turborepo 配置
新版 Turborepo 用 `tasks` 描述任务图，老资料里的 `pipeline` 已不是推荐写法。

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

关键点：
- `dependsOn: ["^build"]` 表示先构建依赖包的 `build`
- `dependsOn: ["build"]` 表示同一个包内先跑自己的 `build`
- `outputs` 决定哪些产物可缓存，不能把 `.next/cache` 这类机器相关缓存混进去
- `inputs` 和 `env` 要覆盖会影响产物的源码、配置和环境变量，否则会错误命中缓存

### 常用命令
```bash
pnpm turbo run build
pnpm turbo run lint test
pnpm turbo run build --filter=@acme/web
pnpm turbo run build --filter=...[HEAD^1]
```

CI 中通常按 `install -> lint -> typecheck -> test -> build` 组织，再开启远程缓存，让团队共享任务结果。真正的质量边界还要靠包导出约束、依赖方向检查、变更影响分析和发布策略，而不只是把目录放到一个仓库。

<!-- id: proj-018; difficulty: 2; tags: 安全, XSS, CSRF; source: 高频 -->
# 在前端项目中如何防御 XSS 和 CSRF 攻击？具体实践是什么？

## XSS 与 CSRF 防御

两者威胁模型不同：XSS 是攻击者让脚本在你的页面里执行；CSRF 是利用浏览器自动携带 Cookie，诱导用户对你的站点发起已登录请求。

### XSS 防御

核心原则是上下文相关编码和安全 Sink，不把不可信数据当代码执行。

```js
// 安全：作为文本输出
node.textContent = userInput

// 危险：把用户输入当 HTML 解析
node.innerHTML = userInput
```

React/Vue 默认会转义插值，但逃生口仍然危险：
```tsx
// 危险：未净化的富文本
<div dangerouslySetInnerHTML={{ __html: userHtml }} />

// 需要富文本时用白名单净化，并持续升级净化库
import DOMPurify from 'dompurify'

<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userHtml) }} />
```

不同上下文要用不同策略：
- HTML 文本：HTML entity encode 或框架默认转义
- HTML 属性：属性编码，属性名必须白名单，不允许 `on*` 事件属性
- URL：只允许 `https:`、`mailto:` 等白名单协议，拒绝 `javascript:`
- CSS：尽量不用用户输入拼接样式，必要时做结构化白名单
- JS 字符串/脚本：不要拼接；用 JSON 序列化并配合 CSP nonce

CSP 是纵深防御，不是替代输出编码：
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-random'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```

还要配合：避免第三方脚本过度授权、Cookie 加 `HttpOnly; Secure; SameSite`、上传文件做 MIME/扩展名/内容校验、源映射和错误日志不泄露敏感数据。

### CSRF 防御

CSRF 主要影响 Cookie 鉴权的状态变更接口。第一条规则是：`GET/HEAD/OPTIONS` 不做写操作，所有写操作走 `POST/PUT/PATCH/DELETE`。

常用组合：
```http
Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Lax; Path=/
```

```ts
// SPA 常见：cookie-to-header / double submit token
fetch('/api/order', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': readCookie('XSRF-TOKEN'),
  },
  body: JSON.stringify(payload),
})
```

服务端必须验证 token，而不是只检查前端有没有带：
- 有服务端会话：使用 synchronizer token，token 绑定会话并校验一次性或有效期
- 无状态 API：使用签名的 double-submit cookie，避免攻击者伪造同名 Cookie
- 对 JSON API：要求自定义请求头和非 simple content-type，利用 CORS 预检阻挡普通表单伪造
- 校验 `Origin`，缺失时再严格校验 `Referer`，比较完整 origin，不能用 `startsWith`
- 可增加 Fetch Metadata：拒绝 `Sec-Fetch-Site: cross-site` 的状态变更请求

SameSite 是重要防线，但不能单独依赖：`Lax` 仍可能在顶级安全方法导航中带 Cookie，且 same-site 不等于 same-origin。高风险操作还应二次确认、重新认证或验证码。

<!-- id: proj-019; difficulty: 2; tags: 代码规范, ESLint, 工程化; source: 高频 -->
# 如何在团队项目中建立统一的代码规范体系？

## 团队代码规范体系

代码规范不是装几个工具，而是把“写法、质量门禁、提交流程、例外处理”做成可执行系统。

### 1. 约定单一事实源
先确定基础约定：包管理器、Node 版本、TypeScript 严格度、格式化规则、命名规则、目录边界、提交信息。写进 `README`、`CONTRIBUTING.md` 或 `AGENTS.md`，避免规范只存在于口头。

```json
// package.json
{
  "packageManager": "bun@1.2.0",
  "scripts": {
    "check": "biome check .",
    "lint": "biome check --write .",
    "build": "tsc -b && vite build"
  }
}
```

### 2. 格式化和基础 lint 自动化
如果项目选择 Biome，就让 Biome 同时负责格式化和常规 lint，减少 ESLint + Prettier 冲突；如果有 React Hooks、a11y、框架专属规则，再按需补 ESLint。

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "formatter": {
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded",
      "trailingCommas": "all"
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  }
}
```

### 3. TypeScript 与工程边界
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

同时约束模块边界：页面只能依赖业务模块，业务模块不能反向依赖页面；共享层不能引用应用层。可以用 lint 规则、路径别名、包导出和代码评审共同保证。

### 4. Git Hook 与 CI 双门禁
本地 hook 提供快速反馈，CI 才是最终门禁，不能只依赖开发者本机。

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx,json,css,md}": ["bun run lint"]
  }
}
```

CI 至少跑：
```bash
bun install --frozen-lockfile
bun run check
bun run build
```

有测试时再加单测、组件测试、E2E，并把失败作为 merge blocker。

### 5. 提交、评审和例外机制
提交信息使用 Conventional Commits：
```text
feat(auth): add OAuth login
fix(cart): prevent checkout with zero quantity
perf(list): virtualize large table
```

评审清单关注行为正确性、边界条件、类型、性能、安全和可观测性。规则需要支持例外，但例外必须写明原因，例如 `// biome-ignore lint/suspicious/noExplicitAny: third-party SDK returns unknown shape`，避免随意关闭规则。

最终目标是：保存时自动格式化，提交前发现低级问题，CI 阻止坏变更，文档解释为什么这样做。

<!-- id: proj-020; difficulty: 3; tags: 性能, 长列表, 虚拟滚动; source: 高频 -->
# 项目中有一个包含 10 万条数据的列表，如何优化渲染性能？

## 10 万条长列表优化

先判断问题在哪一层：接口一次返回 10 万条、浏览器内存过高、过滤排序卡顿、DOM 节点过多，还是每行组件重渲染。通常组合方案是“服务端分页/查询 + 前端虚拟列表 + 计算下沉”。

### 方案取舍
| 方案 | 作用 | 适用场景 | 注意点 |
|--|--|--|--|
| 分页/游标 | 减少传输和内存 | 搜索、表格、后台列表 | 保证排序稳定，避免翻页重复/遗漏 |
| 无限滚动 | 分批加载数据 | 信息流 | 数据累积后仍需虚拟化或回收 |
| 虚拟滚动 | 只渲染可视区 DOM | 10 万行展示 | 处理动态高度、键盘可访问性、滚动定位 |
| Web Worker | 计算离开主线程 | 大量过滤/排序/聚合 | 注意结构化克隆成本，必要时传增量或索引 |

### React 虚拟列表
```tsx
import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

type Item = { id: string; name: string }

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 8,
    getItemKey: (index) => items[index].id,
  })

  return (
    <div ref={parentRef} style={{ height: 600, overflow: 'auto' }}>
      <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index]
          return (
            <div
              key={virtualRow.key}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <Row item={item} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

关键细节：外层固定高度并滚动，内层用总高度撑开滚动条，行元素绝对定位；`getItemKey` 用业务 id，动态高度用 `measureElement`，`overscan` 过小会露白，过大会增加渲染成本。

### 降低重渲染
```tsx
const Row = memo(function Row({ item }: { item: Item }) {
  return <div>{item.name}</div>
})

const filteredItems = useMemo(() => filterItems(items, keyword), [items, keyword])
const onSelect = useCallback((id: string) => setSelectedId(id), [])
```

注意不要在父组件每次渲染时新建大量行内对象、匿名函数或派生数组；列表项状态尽量按 `id` 存储，不按数组下标存。

### 数据和计算优化
- 服务端做分页、搜索、排序和聚合，接口返回必要字段
- 客户端过滤输入加 debounce，结果可按查询条件缓存
- 大排序、分词、高亮预计算放到 Worker，并用增量消息避免一次性阻塞
- 图片懒加载、固定尺寸，避免滚动时布局抖动
- 对非首屏低优先级任务使用 `requestIdleCallback` 时要提供 `setTimeout` fallback，并设置超时，不能依赖它执行关键逻辑

最后用 React Profiler、Performance 面板和真实设备验证：DOM 节点数量应稳定在可视区附近，滚动时主线程长任务减少，内存不会随滚动无限增长。

<!-- id: proj-021; difficulty: 2; tags: 测试, Jest, 单元测试; source: 高频 -->
# 前端项目如何做单元测试？如何测试 React 组件和自定义 Hooks？

## 前端单元测试实践

测试目标不是追求 100% 覆盖率，而是锁住稳定契约：纯函数边界、组件用户行为、自定义 Hook 状态转移、网络异常和回归风险。

### 工具栈
- Vitest/Jest：测试运行器和断言
- React Testing Library：按用户视角测试组件，不测试内部实现
- `@testing-library/user-event`：模拟真实点击、输入、键盘行为
- MSW：从网络层 mock API，避免把请求库实现写进测试
- Playwright/Cypress：覆盖关键端到端流程

### 纯函数测试
```ts
import { describe, expect, it } from 'vitest'
import { formatDate } from './formatDate'

describe('formatDate', () => {
  it('formats a valid timestamp', () => {
    expect(formatDate(1704067200000, 'en-US')).toBe('2024-01-01')
  })

  it('returns fallback for invalid input', () => {
    expect(formatDate(Number.NaN, 'en-US')).toBe('--')
  })
})
```

纯函数要重点覆盖正常值、边界值、异常输入和时区/语言等隐性依赖。涉及时间时固定系统时间，避免测试在不同时区不稳定。

### React 组件测试
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { Button } from './Button'

it('submits when user clicks the enabled button', async () => {
  const user = userEvent.setup()
  const onClick = vi.fn()

  render(<Button onClick={onClick}>Submit</Button>)
  await user.click(screen.getByRole('button', { name: /submit/i }))

  expect(onClick).toHaveBeenCalledTimes(1)
})

it('does not submit while loading', async () => {
  const user = userEvent.setup()
  const onClick = vi.fn()

  render(<Button loading onClick={onClick}>Submit</Button>)
  await user.click(screen.getByRole('button', { name: /submit/i }))

  expect(onClick).not.toHaveBeenCalled()
  expect(screen.getByRole('button')).toBeDisabled()
})
```

组件测试应优先使用 `getByRole`、`getByLabelText` 这类可访问性查询；少用 className、内部 state 和快照。快照只适合很稳定的小结构，不能替代行为断言。

### 自定义 Hook 测试
```tsx
import { act, renderHook } from '@testing-library/react'
import { expect, it } from 'vitest'
import { useCounter } from './useCounter'

it('increments and resets counter', () => {
  const { result } = renderHook(() => useCounter({ initialValue: 1 }))

  act(() => result.current.increment())
  expect(result.current.count).toBe(2)

  act(() => result.current.reset())
  expect(result.current.count).toBe(1)
})
```

如果 Hook 依赖 Router、QueryClient、i18n 或 Store，需要通过 `wrapper` 注入 provider，而不是在测试里 mock 整个 React。

### 异步与接口测试
```tsx
import { http, HttpResponse } from 'msw'

server.use(
  http.get('/api/users', () => HttpResponse.json([{ id: '1', name: 'Alice' }])),
)

it('renders users after loading', async () => {
  render(<UserList />)

  expect(screen.getByText(/loading/i)).toBeInTheDocument()
  expect(await screen.findByText('Alice')).toBeInTheDocument()
})
```

异步测试不要硬等 `setTimeout`，优先用 `findBy*` 或 `waitFor`。还要覆盖加载、空数据、错误、重试、取消请求和权限不足等状态。CI 中可按 `unit -> component -> e2e` 分层运行，关键链路失败阻止合并。

<!-- id: proj-022; difficulty: 2; tags: CDN, 静态资源, 部署; source: 高频 -->
# 前端静态资源如何部署到 CDN？有哪些需要注意的点？

## 静态资源 CDN 部署

典型链路是 `build -> 上传对象存储 -> CDN 回源 -> 边缘缓存 -> HTML 失效 -> 监控回滚`。重点不是“上传到 CDN”，而是缓存策略和发布原子性。

### 缓存策略
```text
/index.html                 Cache-Control: no-cache 或 max-age=0, must-revalidate
/assets/app.8f3a1c.js       Cache-Control: public, max-age=31536000, immutable
/assets/app.91ac0e.css      Cache-Control: public, max-age=31536000, immutable
/favicon.ico                Cache-Control: public, max-age=86400
/manifest.webmanifest       Cache-Control: no-cache
```

JS/CSS/字体/图片要带 content hash，文件名变了就可以长期缓存；HTML、manifest、Service Worker 入口不能长期缓存，否则会引用不存在的新旧资源组合。

### 自动化上传示例
```js
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import fg from 'fast-glob'
import fs from 'node:fs/promises'
import path from 'node:path'
import mime from 'mime-types'

const s3 = new S3Client({ region: process.env.AWS_REGION })
const cloudFront = new CloudFrontClient({ region: process.env.AWS_REGION })

for (const file of await fg('dist/**/*', { nodir: true })) {
  const key = file.replace(/^dist\//, '')
  const isImmutable = /\.[a-f0-9]{8,}\.(js|css|png|jpg|webp|svg|woff2)$/.test(key)

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: await fs.readFile(file),
      ContentType: mime.lookup(file) || 'application/octet-stream',
      CacheControl: isImmutable
        ? 'public, max-age=31536000, immutable'
        : 'no-cache',
    }),
  )
}

await cloudFront.send(
  new CreateInvalidationCommand({
    DistributionId: process.env.CF_DISTRIBUTION_ID,
    InvalidationBatch: {
      CallerReference: String(Date.now()),
      Paths: { Quantity: 1, Items: ['/index.html'] },
    },
  }),
)
```

### 发布注意点
- 原子发布：先上传带 hash 的新资源，再更新/失效 `index.html`，避免 HTML 指向还未上传的资源
- 回滚：保留多个版本目录或构建产物，回滚时切回旧 HTML，不要马上删除旧 hash 文件
- 压缩：CDN 开启 Brotli/Gzip，源站正确设置 `Content-Type`，避免 JS 被当成二进制下载
- CORS：字体、图片、module script、source map 按域名配置 `Access-Control-Allow-Origin`
- 安全：生产环境 source map 不公开，或上传到错误监控平台并限制访问；必要时启用 SRI 和 `crossorigin`
- SPA 路由：CDN 404/403 fallback 到 `index.html`，但静态资源 404 不能也 fallback 成 HTML
- Service Worker：缓存策略要和 CDN 版本策略一致，否则可能长时间锁住旧版本
- 监控：发布后检查 HTML 状态码、主要资源命中率、错误率、白屏率和回源 5xx

<!-- id: proj-023; difficulty: 3; tags: 架构, 权限, RBAC; source: 高频 -->
# 如何在前端实现基于角色的权限控制（RBAC）？

## 前端 RBAC 权限控制

RBAC 是“用户 -> 角色 -> 权限”的模型。前端权限只负责体验：路由拦截、菜单裁剪、按钮隐藏/禁用；真正的安全必须由后端在每个接口上校验。

### 权限数据来源
不要把角色权限矩阵长期写死在前端包里，否则权限变更要重新发版，也容易被篡改。更常见做法是登录后从 `/me` 或权限接口拿到当前用户可用权限。

```ts
type Permission =
  | 'user:read'
  | 'user:create'
  | 'user:update'
  | 'user:delete'
  | 'order:read'
  | 'order:refund'

type CurrentUser = {
  id: string
  roles: string[]
  permissions: Permission[]
}
```

```ts
const permissionSet = new Set(currentUser.permissions)

export function can(permission: Permission) {
  return permissionSet.has(permission)
}

export function canAny(permissions: Permission[]) {
  return permissions.some((permission) => permissionSet.has(permission))
}

export function canAll(permissions: Permission[]) {
  return permissions.every((permission) => permissionSet.has(permission))
}
```

### 路由和菜单控制
```tsx
function RequirePermission({
  permission,
  children,
}: {
  permission: Permission
  children: React.ReactNode
}) {
  const { isLoading, isLogin, can } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageSkeleton />
  if (!isLogin) return <Navigate to='/login' state={{ from: location }} replace />
  if (!can(permission)) return <Navigate to='/403' replace />

  return <>{children}</>
}
```

路由 meta 和菜单配置可以共用同一份权限声明：
```ts
const routes = [
  { path: '/users', element: <UserPage />, permission: 'user:read' },
  { path: '/orders/refund', element: <RefundPage />, permission: 'order:refund' },
] satisfies Array<{ path: string; element: React.ReactNode; permission: Permission }>
```

这样可以同时生成路由守卫、侧边栏菜单和面包屑，减少权限声明散落。

### 按钮和字段级控制
```tsx
function PermissionButton({ permission, ...props }: ButtonProps & { permission: Permission }) {
  const { can } = useAuth()
  if (!can(permission)) return null
  return <Button {...props} />
}
```

隐藏按钮只是体验优化，不是安全。高风险操作推荐禁用并展示原因，或者点击后由后端返回 403 并刷新权限，避免用户看到旧权限状态。

### 工程细节
- 权限刷新：角色变更、token 刷新、切换租户后重新拉取权限
- 多租户：权限通常要带 tenant/project scope，不能只看全局角色
- ABAC 混合：是否能编辑订单可能取决于订单归属、状态、金额，这类资源级判断通常由后端返回 `editable` 或接口校验
- 缓存失效：权限数据可以短期缓存，但 401/403 后要清理或重新同步
- 审计：删除、退款、导出等敏感操作需要后端审计日志

面试时要强调：前端 RBAC 是 UI 层裁剪，后端鉴权是安全边界。

<!-- id: proj-024; difficulty: 2; tags: 国际化, i18n, 多语言; source: 高频 -->
# 如何在 React 项目中实现国际化（i18n）？有哪些需要考虑的细节？

## React i18n 实践

国际化不只是把中文替换成英文，还包括语言选择、翻译加载、复数、日期货币、RTL、SEO、文案治理和缺失 key 监控。React 常用 `react-i18next` 或 FormatJS；前者生态灵活，后者 ICU 消息格式能力更强。

### 初始化
```ts
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'
import { initReactI18next } from 'react-i18next'

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh-CN', 'ja', 'ar'],
    ns: ['common', 'product'],
    defaultNS: 'common',
    backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
    interpolation: { escapeValue: false },
  })

export default i18n
```

`escapeValue: false` 是因为 React 默认转义文本；如果把翻译内容作为 HTML 注入，仍然要净化，不能依赖 i18n 配置防 XSS。

### 使用方式
```tsx
import { Trans, useTranslation } from 'react-i18next'

function CartSummary({ count, total }: { count: number; total: number }) {
  const { t, i18n } = useTranslation(['common', 'product'])
  const money = new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'USD',
  }).format(total)

  return (
    <section>
      <h1>{t('product:cart.title')}</h1>
      <p>{t('product:cart.itemCount', { count })}</p>
      <p>{t('product:cart.total', { total: money })}</p>
      <Trans i18nKey='common:terms'>I agree to the <a href='/terms'>terms</a>.</Trans>
    </section>
  )
}
```

翻译文件要按 i18next 的复数规则写，而不是只写一个 `items`：
```json
{
  "cart": {
    "itemCount_one": "{{count}} item",
    "itemCount_other": "{{count}} items"
  }
}
```

### 关键细节
- 语言优先级：URL 路径/域名 > 用户设置 > cookie/localStorage > `Accept-Language` > fallback
- 命名空间：按业务域拆分，路由级懒加载，避免首包包含所有语言
- 文案变量：不要拼接句子，例如 `Hello ` + name；不同语言语序不同
- 日期数字：使用 `Intl.DateTimeFormat`、`Intl.NumberFormat`、`Intl.RelativeTimeFormat`
- RTL：设置 `<html dir='rtl'>`，CSS 使用 `margin-inline-start`、`padding-inline` 等逻辑属性
- 字体：中日韩、阿拉伯语字体体积大，要按语言加载字体子集
- 表单校验：错误文案、后端错误码、占位符、aria-label 都要翻译
- SEO：多语言路由、`hreflang`、canonical 和 sitemap 要一致
- 质量：CI 检查缺失 key、未使用 key 和翻译 JSON 格式，线上记录 missing key

切换语言时要同时更新 `document.documentElement.lang` 和 `dir`，并持久化用户选择。

<!-- id: proj-025; difficulty: 2; tags: 状态管理, Zustand, Redux; source: 高频 -->
# Zustand 和 Redux 的核心区别是什么？各自适用什么场景？

## Zustand vs Redux

先区分两类状态：服务端状态用 TanStack Query/SWR/RTK Query 管缓存、重试和失效；Zustand/Redux 主要管理客户端状态，例如登录态、筛选条件、弹窗、编辑器状态和跨组件 UI 状态。

### Redux Toolkit
Redux 的核心是可预测单向数据流：`dispatch(action) -> reducer -> new state -> view`。现代 Redux 推荐 Redux Toolkit，样板代码已经比旧 Redux 少很多。

```ts
import { createSlice, configureStore } from '@reduxjs/toolkit'

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment(state) {
      state.value += 1
    },
  },
})

export const { increment } = counterSlice.actions
export const store = configureStore({ reducer: { counter: counterSlice.reducer } })
```

优势：约束清晰、生态成熟、DevTools 强、适合复杂团队协作；配合 RTK Query 可以统一处理接口缓存。代价是概念更多，异步、slice、selector、middleware 都需要团队遵守规范。

### Zustand
Zustand 是轻量 store，API 接近普通 Hook，不需要 Provider，也不强制 action/reducer 模式。

```ts
import { create } from 'zustand'

const useCounterStore = create<{
  value: number
  increment: () => void
}>((set) => ({
  value: 0,
  increment: () => set((state) => ({ value: state.value + 1 })),
}))

const value = useCounterStore((state) => state.value)
const increment = useCounterStore((state) => state.increment)
```

Zustand 通过 selector 订阅局部状态；如果 selector 返回对象或数组，要配合 `useShallow` 或自定义 equality，避免每次返回新引用导致重渲染。

### 对比
| 维度 | Redux Toolkit | Zustand |
|--|--|--|
| 约束 | action/reducer/store 清晰 | 约束少，靠团队约定 |
| 代码量 | 中等，RTK 已简化 | 很少 |
| 调试 | Redux DevTools、时间旅行、action log 强 | 可接 DevTools，但语义取决于写法 |
| 异步 | thunk/listener middleware/RTK Query | 直接在 action 中写 async，常配 TanStack Query |
| 大团队 | 更容易统一流程和审计状态变化 | 需要额外规范拆分 store 和 action |
| 适配场景 | 复杂业务流、审计、回放、插件生态 | 中小型应用、局部跨组件状态、快速迭代 |

### 选型建议
- 表单局部状态：优先组件内 state 或表单库，不上全局 store
- 服务端数据：优先 TanStack Query/SWR/RTK Query
- 简单客户端状态：Zustand 更直接
- 状态变更需要严格追踪、多人维护复杂流程：Redux Toolkit 更稳
- 已有 Redux 体系不要为“少写代码”轻易迁移，先评估调试、规范和团队成本

面试答案可以总结为：Redux 更强调可预测和治理，Zustand 更强调轻量和灵活；复杂度来自业务本身，不来自库名。

<!-- id: proj-026; difficulty: 3; tags: Webpack, HMR, 热更新; source: 高频 -->
# Webpack HMR（热模块替换）的原理是什么？

## Webpack HMR 原理

HMR 是“重新编译变更模块 + 浏览器拉取热更新包 + 运行时替换模块 + 由业务声明如何接收更新”。它不是简单刷新页面，能否保留状态取决于更新边界和框架运行时。

### 流程
```text
文件变化
  -> webpack 重新编译受影响模块
  -> dev middleware 更新内存中的 hot-update 资源
  -> dev server 通过 WebSocket 通知浏览器新 hash
  -> 浏览器 HMR runtime 请求 hot-update manifest 和 chunk
  -> 替换模块工厂函数
  -> 执行 dispose/accept 回调；无法处理则 full reload
```

### 通信与拉取更新
webpack-dev-server 会向 bundle 注入客户端脚本，浏览器和 dev server 建立 WebSocket。

```js
socket.onmessage = (message) => {
  const payload = JSON.parse(message.data)
  if (payload.type === 'hash') currentHash = payload.data
  if (payload.type === 'ok') module.hot.check(true)
}
```

浏览器收到 `ok` 后，不是通过 WebSocket 直接拿模块代码，而是由 HMR runtime 根据 hash 请求更新清单和更新 chunk，例如：
```text
/main.<hash>.hot-update.json
/main.<hash>.hot-update.js
```

更新 chunk 会调用 webpack 注入的全局回调，把新模块工厂挂到运行时里。

### 模块替换和边界
```js
if (module.hot) {
  module.hot.accept('./render', () => {
    render()
  })

  module.hot.dispose((data) => {
    data.scrollTop = document.scrollingElement?.scrollTop ?? 0
  })
}
```

- `accept`：当前模块或依赖模块愿意接收更新
- `dispose`：旧模块被替换前清理副作用，如定时器、订阅、样式标签
- `decline` 或没有可接受边界：更新冒泡到父模块，最后可能整页刷新
- 运行时代码会清理模块缓存，让下一次 `require/import` 拿到新实现

CSS HMR 通常由 style-loader 或 mini-css 相关插件处理，替换样式标签即可；JS 需要业务或框架知道如何重渲染。

### React Fast Refresh
React Fast Refresh 建在 HMR 上，但额外做组件签名和状态保留：
- Babel/SWC 插件给组件注册 family 和 hooks 签名
- 模块更新后比较新旧签名，签名兼容则刷新组件实现并保留 state
- hooks 顺序、导出形态或组件边界不兼容时 remount，状态会丢失
- 模块有非 React 副作用时仍可能需要手写 cleanup

总结：Webpack 负责构建差量和运行时替换，dev server 负责通知，框架刷新插件负责把模块更新变成用户可感知的 UI 更新。

<!-- id: proj-027; difficulty: 2; tags: 缓存, 前端缓存, IndexedDB; source: 高频 -->
# 前端有哪些本地存储方案？如何选择？各自的限制是什么？

## 前端本地存储方案

选择存储要看四件事：容量、同步/异步、安全性、是否需要服务端自动携带。所有浏览器存储都可能被用户清理或在隐私模式下受限，不能当作可靠数据库。

| 方案 | 特点 | 适用 | 限制 |
|--|--|--|--|
| Cookie | 每次符合条件的请求自动携带 | 登录会话、CSRF token、少量服务端需要的数据 | 单条约 4KB，请求负担，受 SameSite/Domain/Path 限制 |
| sessionStorage | 按 tab 会话隔离，同步 API | 临时表单草稿、单页流程状态 | 标签页关闭清除，刷新保留，不能跨 tab |
| localStorage | 同源共享，同步 API | 主题、语言、轻量偏好 | 阻塞主线程，容量小，不适合敏感信息和大对象 |
| IndexedDB | 异步、事务、索引、容量较大 | 离线数据、题库、草稿箱、大量结构化数据 | API 复杂，需要版本迁移和异常处理 |
| Cache API | 缓存 Request/Response | PWA 离线、静态资源、接口响应缓存 | 通常配合 Service Worker，需管理版本和清理 |
| OPFS | 文件系统式访问 | 大文件、编辑器、wasm 应用 | 兼容性和使用复杂度更高 |

### Cookie
```http
Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/
```

登录态优先放 HttpOnly Cookie，避免 JS 读取后被 XSS 窃取。若前后端跨站点，还要同时处理 `SameSite=None; Secure`、CORS credentials 和 CSRF 防护。

### localStorage/sessionStorage 封装
```ts
type Stored<T> = { value: T; expiresAt?: number }

export function getStorageValue<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback

    const data = JSON.parse(raw) as Stored<T>
    if (data.expiresAt && data.expiresAt < Date.now()) {
      localStorage.removeItem(key)
      return fallback
    }
    return data.value
  } catch {
    return fallback
  }
}

export function setStorageValue<T>(key: string, value: T, ttlMs?: number) {
  const payload: Stored<T> = {
    value,
    expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
  }
  localStorage.setItem(key, JSON.stringify(payload))
}
```

注意捕获 `QuotaExceededError`，并且不要存 access token、身份证、银行卡、明文隐私数据。

### IndexedDB
```ts
import { openDB } from 'idb'

const db = await openDB('app-db', 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      db.createObjectStore('drafts', { keyPath: 'id' })
    }
    if (oldVersion < 2) {
      db.createObjectStore('questions', { keyPath: 'id' }).createIndex('category', 'category')
    }
  },
})

await db.put('drafts', { id: 'post-1', content: '...', updatedAt: Date.now() })
const draft = await db.get('drafts', 'post-1')
```

IndexedDB 适合大量结构化数据，但要设计 schema 版本、迁移失败恢复、数据清理和多标签页并发。

### 选择建议
- 认证会话：HttpOnly + Secure Cookie
- 用户偏好：localStorage 或同步到账号配置
- 单次流程临时状态：sessionStorage
- 离线业务数据/大缓存：IndexedDB
- HTTP 响应和静态资源离线：Cache API + Service Worker
- 大文件或本地编辑器：OPFS

上线前用 `navigator.storage.estimate()` 观察容量，用 `navigator.storage.persist()` 申请持久化，并设计存储清理策略。

<!-- id: proj-028; difficulty: 2; tags: 图片优化, WebP, 资源优化; source: 高频 -->
# 前端项目中如何做图片优化？有哪些格式选择和加载策略？

## 前端图片优化

图片优化要同时处理“传得少、解码快、布局稳、关键图先到、非关键图延后”。先用真实数据看图片是否影响 LCP、CLS 和带宽，再决定格式和策略。

### 格式选择
| 格式 | 适用 | 注意点 |
|--|--|--|
| AVIF | 高质量照片、首屏大图、带透明图片 | 压缩率高但编码慢，低端设备解码成本要实测 |
| WebP | 通用位图、兼容性和体积平衡 | 常作为 AVIF fallback |
| JPEG | 照片兼容兜底 | 不支持透明，可用 progressive JPEG |
| PNG | 透明、无损截图、少量颜色图 | 体积大，不适合照片 |
| SVG | 图标、Logo、简单矢量图 | 外部 SVG 要净化，避免脚本和外链风险 |

### 响应式与格式降级
```html
<picture>
  <source type="image/avif" srcset="/hero-640.avif 640w, /hero-1280.avif 1280w" />
  <source type="image/webp" srcset="/hero-640.webp 640w, /hero-1280.webp 1280w" />
  <img
    src="/hero-1280.jpg"
    srcset="/hero-640.jpg 640w, /hero-1280.jpg 1280w"
    sizes="(max-width: 768px) 100vw, 1280px"
    width="1280"
    height="720"
    alt="产品截图"
  />
</picture>
```

`srcset` 给浏览器候选图，`sizes` 告诉浏览器图片最终显示宽度；二者缺一会导致浏览器选错资源。必须写 `width`/`height` 或 CSS `aspect-ratio`，避免图片加载后触发 CLS。

### 加载策略
```html
<link rel="preload" as="image" href="/hero-1280.avif" imagesrcset="/hero-640.avif 640w, /hero-1280.avif 1280w" imagesizes="100vw" fetchpriority="high" />

<img src="/avatar.webp" width="80" height="80" loading="lazy" decoding="async" alt="用户头像" />
```

- LCP 图片不要懒加载，必要时 `preload` 或 `fetchpriority="high"`
- 非首屏图片使用 `loading="lazy"`，但不要滥用到首屏可见区域
- 长列表图片要配合虚拟列表、占位色、固定尺寸和错误兜底
- CSS 背景图不适合关键内容图，因为缺少 `alt`、`srcset` 和优先级控制

### 生产处理
- 构建或 CDN 生成多尺寸、多格式，按 URL 参数裁剪：`?w=800&format=webp&q=80`
- 服务端根据 `Accept` 和设备宽度返回合适格式，但要正确设置 `Vary`
- 图片文件名带 content hash，CDN 长缓存
- 上传时限制尺寸、体积、EXIF，去掉隐私元数据，生成缩略图
- 对用户上传 SVG 做白名单净化或转安全格式

### 验证指标
用 Lighthouse、WebPageTest 或 RUM 观察：LCP 图片是否过大、是否被晚发现、是否优先级过低、是否导致 CLS、实际下载尺寸是否远大于展示尺寸。

<!-- id: proj-029; difficulty: 3; tags: WebSocket, 实时通信, 项目; source: 高频 -->
# 项目中如何实现实时消息推送？WebSocket 连接断开如何处理重连？

## 实时消息推送与 WebSocket 重连

方案先按通信模型选：轮询简单但延迟和浪费高；SSE 适合服务端单向推送通知、日志、进度；WebSocket 适合双向低延迟场景，如 IM、协同编辑、实时看板。

### WebSocket 重连策略
可靠重连要处理：指数退避、随机抖动、主动关闭不重连、网络离线暂停、鉴权刷新、心跳检测、消息补偿。

```ts
type MessageHandler = (data: unknown) => void

class ReconnectingSocket {
  private ws: WebSocket | null = null
  private retry = 0
  private timer: number | undefined
  private closedByUser = false
  private lastAckSeq = 0
  private listeners = new Set<MessageHandler>()

  constructor(private readonly getUrl: () => Promise<string>) {}

  async connect() {
    if (this.closedByUser) return
    const url = await this.getUrl()
    const ws = new WebSocket(url)
    this.ws = ws

    ws.onopen = () => {
      this.retry = 0
      this.send({ type: 'resume', fromSeq: this.lastAckSeq + 1 })
      this.startHeartbeat()
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (typeof data.seq === 'number') this.lastAckSeq = data.seq
      this.listeners.forEach((listener) => listener(data))
    }

    ws.onclose = () => {
      this.stopHeartbeat()
      if (!this.closedByUser && navigator.onLine) this.scheduleReconnect()
    }

    ws.onerror = () => {
      ws.close()
    }
  }

  private scheduleReconnect() {
    window.clearTimeout(this.timer)
    const base = Math.min(1000 * 2 ** this.retry, 30000)
    const jitter = Math.random() * 1000
    this.retry += 1
    this.timer = window.setTimeout(() => this.connect(), base + jitter)
  }

  send(payload: unknown) {
    if (this.ws?.readyState !== WebSocket.OPEN) return false
    this.ws.send(JSON.stringify(payload))
    return true
  }

  onMessage(listener: MessageHandler) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  close() {
    this.closedByUser = true
    window.clearTimeout(this.timer)
    this.ws?.close(1000, 'client close')
  }

  private startHeartbeat() {
    // 实际项目中定时 ping，超过阈值未收到 pong 就 close 触发重连
  }

  private stopHeartbeat() {}
}
```

### 关键工程细节
- 鉴权：不要把长期 token 暴露在 URL；使用短期 token，重连前刷新
- 断线补偿：服务端消息带递增 `seq`，客户端重连时从 `lastAckSeq + 1` 拉缺失消息
- 幂等：客户端发送消息带 `clientMsgId`，重试后服务端按 id 去重
- 背压：高频消息做合并、节流或丢弃低优先级消息，避免 React 每条消息都 setState
- 多标签页：可用 BroadcastChannel 共享连接状态，避免每个 tab 都建连接
- 可观测性：上报连接次数、重连次数、关闭码、延迟、消息积压和恢复耗时

### React 使用
Hook 中创建连接时要在 cleanup 主动关闭，避免路由切换后旧连接继续推送。状态更新要按业务聚合，例如每 100ms 批量刷一次消息，而不是每条 WebSocket 消息都触发渲染。

兜底方案：如果环境不支持 WebSocket 或代理不稳定，可降级到 SSE 或短轮询。

<!-- id: proj-030; difficulty: 2; tags: polyfill, 兼容性, babel; source: 高频 -->
# 如何处理前端项目的浏览器兼容性？Babel 和 Polyfill 是如何工作的？

## 浏览器兼容性处理

兼容性先从业务目标开始：用用户数据和合同要求确定 `browserslist`/构建 target，而不是默认兼容所有浏览器。现代前端通常支持最近主流版本；是否支持旧 Safari、企业内网 Chromium 或 IE，需要单独评估成本。

### Babel 做什么
```text
源码 -> parser 生成 AST -> plugin/preset 转换 AST -> generator 输出代码
```

Babel 主要处理语法转换，例如箭头函数、可选链、class fields。它不能凭空让浏览器拥有新 API，API 需要 polyfill。

```js
// 语法转换：新语法变旧语法
const getName = (user) => user?.profile?.name ?? 'anonymous'

// polyfill：补齐运行时 API
Array.prototype.at
Promise.any
Intl.RelativeTimeFormat
```

### preset-env 与 polyfill
```js
export default {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: '> 0.5%, last 2 versions, not dead',
        useBuiltIns: 'usage',
        corejs: '3.37',
      },
    ],
    '@babel/preset-react',
    '@babel/preset-typescript',
  ],
}
```

- `useBuiltIns: 'usage'`：按源码中使用到的 API 注入 core-js polyfill
- `useBuiltIns: 'entry'`：入口手动引入，按 targets 裁剪
- `false`：不自动注入，适合由应用或运行环境统一管理
- 库项目不要污染全局原型，通常用 `@babel/plugin-transform-runtime` 或明确声明 peer/runtime 要求

注意：polyfill 能补 API，但不能补所有平台能力，例如 Web Bluetooth、部分 CSS 能力、WebGL 性能差异、浏览器 bug 等。

### CSS 和资源兼容
- CSS 前缀：PostCSS + Autoprefixer，根据 browserslist 添加必要前缀
- CSS 新特性：使用 `@supports` 做渐进增强，例如 `grid`、`container queries`
- 图片：AVIF/WebP 用 `<picture>` fallback
- 字体：准备 WOFF2 以及必要 fallback 字体
- DOM/事件：触摸、Pointer Events、输入法、滚动行为要在真机验证

### Vite/现代构建
Vite 生产构建通常用 `build.target` 控制语法降级，语法转换主要由 esbuild/Rollup 处理；如需旧浏览器，可引入 legacy 插件生成 `module/nomodule` 双包。

```ts
import legacy from '@vitejs/plugin-legacy'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: ['chrome107', 'edge107', 'firefox104', 'safari16'],
  },
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11'],
      modernPolyfills: true,
    }),
  ],
})
```

### 实践流程
1. 用埋点确认真实浏览器分布，写入 browserslist/构建 target
2. 明确最低支持矩阵和降级策略
3. 对语法、API、CSS、资源分别处理，不能只配 Babel
4. 对第三方依赖做兼容检查，必要时把未转译依赖纳入构建转换
5. 在 BrowserStack/真机/企业目标浏览器跑冒烟和 E2E
6. 线上按浏览器版本监控 JS 错误率、白屏率和核心路径成功率

面试中要把“语法转换”和“运行时 polyfill”讲清楚：Babel 负责把代码变成目标浏览器能解析的语法，polyfill 负责补目标浏览器缺失的标准 API。

<!-- id: proj-031; difficulty: 2; tags: Docker, 容器化, 部署; source: 高频 -->
# 如何将前端项目容器化部署？Dockerfile 如何编写？

## 前端容器化部署

前端容器化通常是多阶段构建：第一阶段安装依赖并生成 `dist`，第二阶段用 Nginx/Caddy 等静态服务器运行产物。关键点是镜像小、缓存命中好、静态资源缓存正确、运行时配置清晰。

### Vite + Bun 多阶段 Dockerfile
```dockerfile
# syntax=docker/dockerfile:1
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN bun run check && bun run build

FROM nginx:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

还要准备 `.dockerignore`，避免把 `node_modules`、`dist`、`.git`、日志和本地环境文件打进镜像。

### Nginx 配置
```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  gzip on;
  gzip_types text/plain text/css application/javascript application/json image/svg+xml;

  location = /healthz {
    access_log off;
    return 200 "ok";
  }

  location ~* \.(js|css|png|jpg|jpeg|webp|avif|svg|woff2)$ {
    try_files $uri =404;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  location = /index.html {
    add_header Cache-Control "no-cache";
  }

  location / {
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "no-cache";
  }
}
```

注意 SPA fallback 只应该作用在页面路由上，静态资源 404 不能回退成 `index.html`，否则浏览器会把 HTML 当 JS/CSS 加载并产生难排查错误。

### 环境变量
Vite 的 `VITE_*` 变量默认是构建期注入，镜像构建后再改容器环境变量不会自动生效。需要运行时配置时常见方案是：
- 启动时生成 `/config.js` 或 `/config.json`
- 前端启动时请求配置接口
- 每个环境构建独立镜像或独立 HTML

### 部署注意点
- 非敏感配置可进前端，密钥不能进镜像和产物
- 静态资源带 hash 长缓存，HTML no-cache
- 保留旧 hash 资源，避免滚动发布期间旧 HTML 找不到旧 JS
- 容器只做静态服务，API 代理、TLS 和 WAF 通常放在网关/Ingress/CDN
- CI 里跑 `check/build`，构建镜像后做 smoke test，再推 registry
- 如果要非 root 运行，可用 unprivileged nginx 镜像或改监听 8080

<!-- id: proj-032; difficulty: 2; tags: React Query, 数据请求, 缓存; source: 高频 -->
# React Query 解决了什么问题？核心概念是什么？如何处理缓存和数据同步？

## TanStack Query 解决什么问题

React Query 现在通常指 TanStack Query。它管理的是服务端状态：请求、缓存、过期、重试、并发去重、后台刷新、分页、预取、乐观更新和失效同步。它不是 Redux/Zustand 的替代品，而是把“远端数据缓存”从组件状态里拆出来。

### useQuery
```tsx
import { useQuery } from '@tanstack/react-query'

function ProductDetail({ id }: { id?: string }) {
  const query = useQuery({
    queryKey: ['product', id],
    enabled: Boolean(id),
    queryFn: ({ signal }) => api.getProduct(id!, { signal }),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => shouldRetry(error) && failureCount < 2,
  })

  if (query.isPending) return <Skeleton />
  if (query.isError) return <ErrorView error={query.error} />

  return <ProductView product={query.data} refreshing={query.isFetching} />
}
```

核心概念：
- `queryKey`：缓存身份，必须稳定且包含影响请求结果的参数
- `staleTime`：多久内认为数据新鲜，新鲜数据不会因重新挂载自动请求
- `gcTime`：无观察者后缓存保留多久，v5 中替代旧名 `cacheTime`
- `isPending`：首次无数据加载；`isFetching`：任何后台请求中
- `enabled`：参数未准备好时禁止请求
- `signal`：组件卸载或请求被取消时终止 fetch

### 失效和同步
```tsx
const queryClient = useQueryClient()

const mutation = useMutation({
  mutationFn: createProduct,
  onSuccess: (created) => {
    queryClient.setQueryData(['product', created.id], created)
    queryClient.invalidateQueries({ queryKey: ['products'] })
  },
})
```

写操作成功后有两种策略：直接 `setQueryData` 更新已知缓存，或者 `invalidateQueries` 标记过期并重新拉取。列表、详情、统计数据要按 queryKey 体系设计好，否则容易出现“详情更新了，列表没更新”。

### 乐观更新
```tsx
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (patch) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] })
    const previous = queryClient.getQueryData<Todo[]>(['todos'])

    queryClient.setQueryData<Todo[]>(['todos'], (old = []) =>
      old.map((todo) => (todo.id === patch.id ? { ...todo, ...patch } : todo)),
    )

    return { previous }
  },
  onError: (_error, _patch, context) => {
    queryClient.setQueryData(['todos'], context?.previous)
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
})
```

乐观更新适合点赞、收藏、轻量编辑；涉及库存、金额、权限等强一致业务时要谨慎，失败回滚和冲突提示必须明确。

### 项目实践
- queryKey 工厂化：`productKeys.detail(id)`、`productKeys.list(params)`
- 用 `prefetchQuery`/路由 loader 预取下一页或详情
- 分页用 `useInfiniteQuery`，配合游标而不是纯 offset
- SSR/SSG 场景用 dehydrate/hydrate 复用服务端数据
- 默认重试不要用于 401/403/业务错误
- window focus/refetch、网络恢复刷新要按业务开启或关闭
- 表单编辑态不要直接用 query cache 当本地草稿，避免后台刷新覆盖用户输入

<!-- id: proj-033; difficulty: 2; tags: Vite, 插件, 工程化; source: 高频 -->
# 如何编写一个 Vite 插件？Vite 插件与 Rollup 插件的关系是什么？

## Vite 插件开发

Vite 插件兼容大部分 Rollup 插件钩子，并扩展了 dev server、HMR、HTML 转换等能力。差异是：开发模式下 Vite 按请求转换单个模块，不会像 Rollup 构建那样一次性生成完整 bundle；因此有些 `generateBundle` 类逻辑只在 build 阶段生效。

### 常用钩子
```ts
import type { Plugin } from 'vite'

const plugin: Plugin = {
  name: 'my-plugin',
  enforce: 'pre',
  apply: 'serve',
  config(config, env) {},
  configResolved(resolvedConfig) {},
  configureServer(server) {},
  resolveId(id, importer) {},
  load(id) {},
  transform(code, id) {},
  transformIndexHtml(html) {},
  handleHotUpdate(ctx) {},
}
```

- `resolveId`：把导入路径解析成模块 id，可处理虚拟模块
- `load`：根据 id 返回模块源码
- `transform`：转换源码，最好返回 source map
- `configureServer`：添加中间件或访问 Vite dev server
- `handleHotUpdate`：自定义某些文件变化后的 HMR 行为
- `enforce`：控制 pre/post 顺序；`apply`：限定 serve/build

### 示例：虚拟构建信息模块
```ts
import type { Plugin } from 'vite'

const virtualId = 'virtual:build-info'
const resolvedVirtualId = '\0' + virtualId

export function buildInfoPlugin(): Plugin {
  return {
    name: 'vite-plugin-build-info',

    resolveId(id) {
      if (id === virtualId) return resolvedVirtualId
    },

    load(id) {
      if (id !== resolvedVirtualId) return null
      return `export const buildTime = ${JSON.stringify(new Date().toISOString())}`
    },
  }
}
```

使用：
```ts
import { buildTime } from 'virtual:build-info'
```

虚拟模块需要用 `\0` 前缀防止其他解析器继续处理，这是 Rollup 插件生态里的约定。

### 示例：处理自定义查询
```ts
export function rawTextPlugin(): Plugin {
  return {
    name: 'vite-plugin-raw-text',

    async transform(_code, id) {
      const [file, query = ''] = id.split('?')
      if (!query.includes('raw-text')) return null

      const source = await this.load({ id: file, resolveDependencies: false })
      return {
        code: `export default ${JSON.stringify(source?.code ?? '')}`,
        map: { mappings: '' },
      }
    },
  }
}
```

真实项目中还要处理 Windows 路径、多个查询参数、source map、缓存、watch 文件和错误提示。

### 与 Rollup 插件的关系
- 构建阶段 Vite 底层使用 Rollup，很多 Rollup 插件可以直接复用
- 开发阶段 Vite 有自己的模块图、预构建和 HMR，部分 Rollup 输出阶段钩子不会运行
- Vite 插件可以通过 `config` 修改 esbuild、resolve、server、build 等 Vite 配置
- 插件顺序会影响别名解析、框架插件和自定义 transform，复杂插件要明确 `enforce`

<!-- id: proj-034; difficulty: 2; tags: 动画, 性能, CSS动画; source: 高频 -->
# 前端动画有哪些实现方案？如何选择和优化动画性能？

## 前端动画方案与性能

选动画方案先看复杂度：简单交互用 CSS，组件进出场用动画库，精确时序用 Web Animations API，高频绘制用 Canvas/WebGL，物理和游戏场景用 rAF 或专用引擎。

| 方案 | 适用 | 注意点 |
|--|--|--|
| CSS transition | hover、展开收起、状态切换 | 控制能力有限 |
| CSS keyframes | 循环动画、loading、简单入场 | 复杂交互难同步 |
| Web Animations API | 需要 JS 控制 pause/reverse/cancel | 仍要避开布局属性 |
| React 动画库 | 页面切换、弹窗、列表重排 | 注意包体和过度渲染 |
| requestAnimationFrame | 拖拽、游戏、物理模拟 | 主线程忙会掉帧 |
| Canvas/WebGL | 大量对象、粒子、3D | 需要自己处理可访问性和事件 |

### 性能原则
```css
/* 优先动画 transform 和 opacity */
.button {
  transition: transform 160ms ease, opacity 160ms ease;
}

.button:hover {
  transform: translateY(-2px) scale(1.02);
  opacity: 0.92;
}

/* 避免动画 width/height/top/left/margin 等布局属性 */
```

浏览器渲染大致是 style -> layout -> paint -> composite。`transform` 和 `opacity` 通常可在合成阶段完成，成本最低；`width/top` 会触发布局，`box-shadow/filter` 可能触发昂贵绘制。

`will-change` 只在动画即将发生前短暂使用，不能给大量元素长期加，否则会占用显存。

### Web Animations API
```js
const animation = element.animate(
  [
    { transform: 'translateY(12px)', opacity: 0 },
    { transform: 'translateY(0)', opacity: 1 },
  ],
  { duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'both' },
)

animation.finished.then(() => animation.commitStyles())
```

WAAPI 比 CSS 更容易通过 JS 控制播放、暂停、反向和取消；但动画属性选择仍决定性能。

### 列表重排与 FLIP
列表插入、删除、排序时，可以用 FLIP：先记录 First 位置，更新 DOM 后记录 Last，计算 Invert 位移，最后 Play transform 动画。这样把布局变化转成合成层动画。

### rAF 模式
```js
let rafId = 0
let previous = performance.now()

function tick(now) {
  const delta = Math.min(now - previous, 32)
  previous = now
  updatePhysics(delta)
  render()
  rafId = requestAnimationFrame(tick)
}

rafId = requestAnimationFrame(tick)
```

rAF 要用时间差而不是固定步长，并在组件卸载或页面隐藏时取消，避免后台耗电。

### 可访问性与验证
- 尊重 `prefers-reduced-motion`，为敏感用户关闭大位移动画
- 交互动画不应阻塞点击和键盘焦点
- 用 Chrome Performance/Rendering 面板检查 FPS、long task、layout、paint 和 layer 数量
- 动画目标是辅助理解状态变化，不是增加页面负担

<!-- id: proj-035; difficulty: 3; tags: 微前端, 模块联邦, Webpack; source: 高频 -->
# Webpack Module Federation（模块联邦）是什么？与 qiankun 微前端的区别？

## Module Federation 与 qiankun

Module Federation 是运行时模块共享机制：一个应用作为 host，在运行时加载另一个应用 remote 暴露的模块。它解决的是“独立构建、运行时组合、依赖共享”。

### 核心机制
```text
Host 启动
  -> 加载 remoteEntry.js
  -> 初始化 share scope
  -> 协商 shared 依赖版本
  -> import('remote/Button') 获取远程模块工厂
  -> 渲染远程组件或调用远程函数
```

Remote：
```js
new ModuleFederationPlugin({
  name: 'product',
  filename: 'remoteEntry.js',
  exposes: {
    './ProductList': './src/ProductList',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^19.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
  },
})
```

Host：
```js
new ModuleFederationPlugin({
  name: 'shell',
  remotes: {
    product: 'product@https://cdn.example.com/product/remoteEntry.js',
  },
  shared: {
    react: { singleton: true },
    'react-dom': { singleton: true },
  },
})
```

```tsx
const ProductList = lazy(() => import('product/ProductList'))

<Suspense fallback={<Loading />}>
  <ErrorBoundary>
    <ProductList tenantId={tenantId} />
  </ErrorBoundary>
</Suspense>
```

### 与 qiankun 的区别
| 维度 | Module Federation | qiankun |
|--|--|--|
| 组合粒度 | 模块/组件/函数级 | 应用级 |
| 运行方式 | 远程模块被 host import | 子应用按生命周期 mount/unmount |
| 隔离 | 不内置强隔离，依赖共享为主 | JS 沙箱、样式隔离能力更完整 |
| 技术栈 | Webpack/Rspack/Vite 插件等构建生态相关 | 基于 single-spa，框架无关性更强 |
| 通信 | 组件 props、共享状态、事件总线 | props、globalState、事件总线 |
| 适合 | 跨应用复用组件/能力，统一壳工程 | 多团队独立应用接入、遗留系统整合 |

### 风险和治理
- 版本协商：React、router、状态库要 `singleton`，否则可能出现多 React 实例或上下文失效
- 远程入口失败：必须有 loading、error boundary、超时、降级和监控
- 发布兼容：remote 暴露模块是运行时契约，破坏性变更要版本化
- 缓存：`remoteEntry.js` 不应长期 immutable，内部 chunk 可以 hash 长缓存
- 安全：remote 代码等同执行第三方 JS，要限制来源、权限和审计发布链路
- 样式：模块联邦不解决样式隔离，需要 CSS Modules、命名空间、Shadow DOM 或设计系统约束

选择建议：如果目标是“一个主应用装多个完整子应用”，qiankun 更贴近；如果目标是“跨团队共享运行时组件和能力”，Module Federation 更直接。大型系统也可能两者混用，但治理成本会明显上升。

<!-- id: proj-036; difficulty: 2; tags: Sentry, 错误监控, APM; source: 高频 -->
# 如何在项目中集成 Sentry 进行错误监控？Source Map 是如何关联到原始代码的？

## Sentry 集成与 Source Map

Sentry 集成要同时解决采集、降噪、分组、隐私、版本关联和 sourcemap 上传。只在入口 `init` 还不够，必须把 release 和构建产物绑定起来。

### React 初始化
```ts
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_RELEASE,
  sendDefaultPii: false,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  ],
  tracesSampleRate: 0.05,
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event) {
    if (event.exception?.values?.some((item) => item.value?.includes('ResizeObserver'))) {
      return null
    }
    return event
  },
})
```

React 组件树用错误边界兜底：
```tsx
<Sentry.ErrorBoundary fallback={<ErrorPage />} showDialog={false}>
  <App />
</Sentry.ErrorBoundary>
```

错误边界只能捕获渲染、生命周期和子组件错误；事件处理器、异步回调、资源加载错误仍需要全局错误监听、Promise rejection、请求拦截器和业务埋点补充。

### Source Map 上传
```ts
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  build: { sourcemap: true },
  plugins: [
    sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: 'acme',
      project: 'web',
      release: { name: process.env.APP_RELEASE },
      sourcemaps: {
        assets: './dist/**',
        filesToDeleteAfterUpload: './dist/**/*.map',
      },
    }),
  ],
})
```

生产环境不要公开 `.map` 文件；上传到 Sentry 后从产物删除，或 CDN 禁止访问。

### 还原原理
1. 构建时生成压缩 JS 和 `.map`，map 中保存 generated 行列到 original 文件、行列、符号名的映射
2. 上传 sourcemap artifact，并绑定 release/debug id/dist 等版本信息
3. 浏览器报错时 stack trace 带压缩后文件 URL、行列号和 release
4. Sentry 根据 release/debug id 找到对应 artifact，用 sourcemap 还原原始源码位置

### 线上治理
- release 使用 git sha 或构建号，前端运行时和上传 sourcemap 必须一致
- source map 上传作为 CI/CD 步骤，失败应阻断生产发布或至少告警
- 用 `ignoreErrors`、`denyUrls`、`beforeSend` 过滤浏览器插件和第三方脚本噪音
- 给用户、租户、路由、feature flag 加 tag/context，但不要上传 token、手机号、身份证等敏感信息
- 对关键 API 错误、白屏、资源加载失败单独上报，不能只依赖未捕获异常

<!-- id: proj-037; difficulty: 2; tags: GraphQL, API, 数据层; source: 高频 -->
# GraphQL 相比 REST API 有什么优势？在项目中如何实践 GraphQL？

## GraphQL vs REST

GraphQL 的核心是客户端声明需要的数据形状，服务端按 schema 解析并返回同形状结果。它能缓解 REST 常见的 over-fetching、under-fetching 和多端字段差异问题，但会引入 schema 治理、缓存、安全和网关复杂度。

### 优势
```graphql
query ProductPage($id: ID!) {
  product(id: $id) {
    id
    name
    price
    image { url alt }
    seller { id name rating }
    reviews(first: 10) { nodes { id content score } }
  }
}
```

同一个页面不用串行请求商品、卖家、评论多个 REST 接口；移动端和 PC 端也可以各自声明字段，减少无用数据。

### 前端实践
```tsx
import { ApolloClient, InMemoryCache, gql, useQuery } from '@apollo/client'

const client = new ApolloClient({
  uri: '/graphql',
  cache: new InMemoryCache({
    typePolicies: {
      Product: { keyFields: ['id'] },
    },
  }),
})

const GET_PRODUCTS = gql`
  query GetProducts($category: String!, $first: Int!) {
    products(category: $category, first: $first) {
      nodes { id name price image { url alt } }
      pageInfo { endCursor hasNextPage }
    }
  }
`

function ProductList() {
  const { data, loading, error, fetchMore } = useQuery(GET_PRODUCTS, {
    variables: { category: 'electronics', first: 20 },
    fetchPolicy: 'cache-and-network',
  })

  if (loading && !data) return <Skeleton />
  if (error) return <ErrorView error={error} />
  return <ProductGrid items={data.products.nodes} onLoadMore={() => fetchMore({ variables: { first: 20 } })} />
}
```

生产项目通常会加 GraphQL Code Generator，根据 schema 和 `.graphql` 文档生成 TypeScript 类型，避免手写 `data` 类型。

### 缓存与同步
GraphQL 客户端常用 normalized cache：按 `__typename + id` 存实体，多个查询引用同一个实体。mutation 后可以：
- `refetchQueries`：简单但多请求
- `cache.modify`：精确更新列表和计数
- `writeFragment`：更新某个实体字段
- 订阅或轮询：处理实时变化

### 治理风险
- N+1：服务端 resolver 需要 DataLoader 或批处理
- 查询复杂度：限制 depth、cost、分页大小，防止恶意大查询
- 缓存：REST 可天然利用 HTTP 缓存，GraphQL 通常需要 persisted query/CDN/客户端 normalized cache
- 错误模型：GraphQL 可能部分成功，前端要处理 `data` 和 `errors` 同时存在
- 版本演进：字段只能废弃再迁移，避免直接破坏 schema
- 文件上传、二进制下载、大列表导出不一定适合 GraphQL

选择建议：多端、多数据关系、字段差异大时 GraphQL 价值明显；简单 CRUD 或强依赖 HTTP 缓存的系统，REST 更简单直接。

<!-- id: proj-038; difficulty: 3; tags: 性能, 卡顿, 优化, Long Task; source: 高频 -->
# 页面出现明显卡顿，如何排查和优化 Long Task？

## Long Task 排查与优化

浏览器主线程上执行超过 50ms 的任务会被视为 Long Task。它会阻塞输入、渲染和 JS 执行，是 INP 变差、点击没反应和滚动卡顿的常见原因。

### 排查路径
1. Chrome Performance 录制卡顿操作，定位 Main 线程上的长任务、调用栈和脚本来源
2. 打开 Bottom-Up/Call Tree，看耗时集中在脚本执行、样式布局、绘制还是 GC
3. 用 React Profiler 看是否有大组件树重复渲染
4. 在线上用 PerformanceObserver 采样上报 longtask 和页面路由

```js
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    report({
      type: 'long_task',
      duration: entry.duration,
      startTime: entry.startTime,
      page: location.pathname,
    })
  }
})

observer.observe({ type: 'longtask', buffered: true })
```

### 常见原因
- 首屏 JS 包过大，解析、编译、执行时间长
- 大数组同步过滤、排序、JSON parse/stringify
- React 大面积重渲染或列表未虚拟化
- 强制同步布局：读写布局属性交错，例如 `offsetHeight` 后立刻改样式再读
- 大量 DOM 插入、复杂 CSS selector、昂贵绘制效果
- 第三方脚本、埋点 SDK、广告脚本阻塞主线程

### 优化手段
把大计算移出主线程：
```js
const worker = new Worker(new URL('./search.worker.ts', import.meta.url), { type: 'module' })
worker.postMessage({ type: 'filter', items, keyword })
worker.onmessage = (event) => setResult(event.data)
```

把可切分任务分片执行：
```js
async function processInChunks(items, handle, chunkSize = 100) {
  for (let i = 0; i < items.length; i += chunkSize) {
    for (const item of items.slice(i, i + chunkSize)) handle(item)
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}
```

减少渲染量：
```tsx
const Row = memo(function Row({ item }: { item: Item }) {
  return <div>{item.name}</div>
})

const visibleItems = useMemo(() => filterItems(items, deferredKeyword), [items, deferredKeyword])
```

`startTransition` 只能降低 React 状态更新优先级，不会把已经同步执行的 `heavyFilter(items)` 移到后台线程；重计算要用 memo、分片、Worker 或把输入值 `useDeferredValue` 后再计算。

### DOM 与布局优化
- 批量读写 DOM，避免 read/write 交错触发布局抖动
- 长列表用虚拟滚动，图片固定尺寸
- 动画只改 `transform`/`opacity`
- 拆分路由和组件，减少首屏 JS
- 延后非关键第三方脚本，监控其耗时

验证标准是：Performance 面板中长任务减少，交互后的下一帧更快出现，线上 INP 和 JS 错误率下降。

<!-- id: proj-039; difficulty: 2; tags: 字体, 性能, Web Font; source: 高频 -->
# Web Font 加载会导致哪些性能问题？如何优化字体加载？

## Web Font 性能优化

字体会影响两个指标：文本是否及时可见，以及字体替换时是否造成布局偏移。常见问题是 FOIT（字体加载前文字不可见）、FOUT（先显示 fallback 再替换）和中文字体体积过大。

### font-display
```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
}
```

- `swap`：优先显示 fallback，字体到后替换，避免空白
- `fallback`：短暂等待后显示 fallback，后续替换窗口较短
- `optional`：网络差时直接用 fallback，最利于稳定布局
- `block`：可能出现 FOIT，通常不推荐

### 预加载与缓存
```html
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin />
```

只预加载首屏必需字体和字重，不能把所有语言、所有字重都 preload。字体文件应带 hash 并长期缓存；跨域字体必须配置 CORS，并且 preload 也要带 `crossorigin`，否则可能重复下载。

### 子集化与 unicode-range
中文、日文、韩文字体尤其需要子集化：
```css
@font-face {
  font-family: 'Noto Sans SC';
  src: url('/fonts/noto-sc-basic.woff2') format('woff2');
  unicode-range: U+4E00-9FFF, U+3000-303F, U+FF00-FFEF;
  font-display: swap;
}
```

可以按页面使用字符、常用字表或语言拆分子集，减少首屏下载体积。图标字体应优先替换为 SVG，避免字体加载失败导致图标不可见。

### 降低布局偏移
```css
@font-face {
  font-family: 'BrandFont';
  src: url('/fonts/brand.woff2') format('woff2');
  font-display: swap;
  size-adjust: 102%;
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
}
```

通过选择 metrics 接近的 fallback 字体，或使用 `size-adjust`、`ascent-override` 等描述符，让替换前后文本尺寸接近，降低 CLS。

### 实践建议
- 英文字体优先用 WOFF2 可变字体，减少多个字重文件
- CJK 字体按语言和字符子集拆分
- 首屏关键字体 preload，非关键字体延后加载
- 使用系统字体栈时不用强行引入 Web Font
- 用 Performance 面板检查字体发现时间、下载耗时和是否重复下载
- 监控 CLS、LCP 和字体加载失败率

<!-- id: proj-040; difficulty: 3; tags: 架构, DDD, 前端架构; source: 高频 -->
# 什么是前端领域驱动设计（DDD）？如何在大型项目中落地？

## 前端 DDD 落地

前端 DDD 的目标不是把后端分层照搬到浏览器，而是在复杂业务中把领域规则从 UI、接口格式和状态库里分离出来，让业务概念、约束和用例可测试、可复用、可演进。

### 适用边界
适合：交易、审批、报价、权限、低代码、复杂表单等规则多、生命周期长的系统。不适合：纯展示页、轻量活动页、简单 CRUD；这类项目过度 DDD 会增加目录和抽象成本。

### 目录示例
```text
src/features/order/
  domain/
    Order.ts
    orderRules.ts
  application/
    createOrder.ts
    cancelOrder.ts
  infrastructure/
    orderApi.ts
    orderMapper.ts
  ui/
    OrderForm.tsx
    OrderDetailPage.tsx
```

按业务域切分，每个域内部再分 domain/application/infrastructure/ui，比全局 `components/services/utils` 更容易控制依赖方向。

### 领域模型
```ts
type OrderStatus = 'draft' | 'pending' | 'paid' | 'cancelled'

type OrderItem = { productId: string; price: number; quantity: number }

export class Order {
  constructor(
    readonly id: string,
    private items: OrderItem[],
    private status: OrderStatus,
  ) {}

  addItem(item: OrderItem) {
    if (this.status !== 'draft') throw new Error('Only draft orders can be edited')
    if (item.quantity <= 0) throw new Error('Quantity must be positive')
    this.items = [...this.items, item]
  }

  cancel() {
    if (!['draft', 'pending'].includes(this.status)) throw new Error('Order cannot be cancelled')
    this.status = 'cancelled'
  }

  total() {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }
}
```

领域层不依赖 React、Router、请求库或 Zustand。这样规则可以用普通单元测试覆盖。

### 应用层与防腐层
```ts
export async function createOrder(command: CreateOrderCommand, deps: Deps) {
  const products = await deps.productRepo.findByIds(command.items.map((item) => item.productId))
  const order = Order.create(command, products)
  await deps.orderRepo.save(order)
  deps.eventBus.emit({ type: 'order.created', orderId: order.id })
  return order.id
}
```

`orderMapper` 负责把后端 DTO 转成领域对象，把领域对象转回提交 payload。这样后端字段变化不会扩散到 UI。

### UI 层
React 组件只做交互和展示：读取 query/mutation，调用 use case，展示校验错误。表单状态可以用 React Hook Form，服务端状态用 TanStack Query，客户端 UI 状态用 Zustand，但领域规则不要散落在这些库的 callback 里。

### 落地要点
- 统一领域语言：命名跟产品、后端、测试保持一致
- 单向依赖：ui -> application -> domain，infrastructure 实现接口
- 复杂规则进 domain，流程编排进 application，接口适配进 infrastructure
- 给领域规则写单元测试，给关键用例写集成测试
- 从高复杂域开始渐进落地，不要一次性重构全项目

面试回答要强调：前端 DDD 是控制复杂业务的手段，不是目录模板；是否使用取决于业务复杂度和团队维护成本。

<!-- id: proj-041; difficulty: 2; tags: 低代码, 可视化编辑器, 架构; source: 高频 -->
# 如何设计一个低代码/可视化页面编辑器的前端架构？

## 低代码/可视化编辑器架构

低代码编辑器的核心是“可序列化 schema + 组件物料协议 + 编辑器状态 + 渲染运行时”。编辑态和运行态要解耦：编辑器负责拖拽、选中、属性面板、历史记录；运行时负责安全地把 schema 渲染成页面。

### Schema 模型
```ts
interface PageSchema {
  version: string
  id: string
  title: string
  root: NodeSchema
  variables: Record<string, unknown>
  apis: ApiSchema[]
}

interface NodeSchema {
  id: string
  type: string
  props: Record<string, unknown>
  style?: Record<string, string | number>
  children?: NodeSchema[]
  events?: Record<string, ActionSchema[]>
  bindings?: Record<string, ExpressionSchema>
}
```

必须有 `version`，后续组件协议、事件协议、样式协议变化时才能做迁移。schema 要用 JSON Schema/Zod 校验，导入内容不能直接信任。

### 核心模块
- 组件物料库：组件实现、属性面板 schema、默认 props、插槽规则、图标和分类
- 渲染引擎：递归渲染 schema，处理表达式、数据绑定、权限和兜底组件
- 编辑器画布：选中框、hover 框、拖拽排序、缩放、参考线、吸附
- 属性面板：根据组件 meta 生成表单，支持校验和联动
- 状态管理：当前 schema、选中节点、hover 节点、剪贴板、历史栈
- 动作系统：新增、删除、移动、更新 props，所有变更都走 command，便于 undo/redo
- 预览/发布：保存草稿、版本管理、发布快照、回滚

### 渲染引擎
```tsx
function Renderer({ node }: { node: NodeSchema }) {
  const definition = registry.get(node.type)
  if (!definition) return <UnknownComponent type={node.type} />

  const props = resolveBindings(node.props, node.bindings)
  const Component = definition.component

  return (
    <Component {...props} style={node.style}>
      {node.children?.map((child) => <Renderer key={child.id} node={child} />)}
    </Component>
  )
}
```

运行时不能执行任意用户 JS。表达式和事件应使用受控 DSL 或沙箱，例如 `setState`、`callApi`、`navigate`、`emitEvent`，避免 `eval`、`new Function` 和任意脚本注入。

### 历史记录
```ts
type Command =
  | { type: 'updateProps'; id: string; patch: Record<string, unknown> }
  | { type: 'moveNode'; id: string; parentId: string; index: number }
  | { type: 'deleteNode'; id: string }
```

历史栈存 command 或 patch，比每次保存完整 schema 更省内存。拖拽、输入框连续变化要合并成一次历史记录，避免 undo 体验很差。

### 工程难点
- 节点树最好同时维护 `id -> node` 索引，避免大页面频繁深遍历
- 拖拽可用 dnd-kit，但画布内 iframe、缩放和滚动容器要单独处理坐标
- 样式建议用 token 和受控属性，不允许用户任意覆盖全局 CSS
- 组件升级需要兼容旧 schema，提供 migration
- 预览运行时要和线上运行时尽量同构，避免编辑器里能看、线上不能跑
- 权限、审计、协同编辑和发布审批是企业低代码常见刚需

<!-- id: proj-042; difficulty: 2; tags: 前端安全, JWT, 认证; source: 高频 -->
# 前端如何安全地存储和使用 JWT Token？Token 刷新机制如何实现？

## JWT 安全存储与刷新

前端无法“绝对安全”保存 token。安全设计要在 XSS、CSRF、刷新体验、多标签页和失效策略之间取舍。

| 存储方式 | XSS 风险 | CSRF 风险 | 适用 |
|--|--|--|--|
| localStorage/sessionStorage | JS 可读，被 XSS 窃取风险高 | 低 | 不推荐存长期 token |
| 内存变量 | 刷新即丢，XSS 仍可发请求 | 低 | 短期 access token |
| HttpOnly Cookie | JS 不可读 | 需要 CSRF 防护 | refresh token 或纯 cookie session |

常见方案：access token 放内存，refresh token 放 `HttpOnly; Secure; SameSite=Lax/Strict` Cookie。刷新接口必须做 CSRF 防护、refresh token 轮换和复用检测。

### 并发刷新
```ts
let accessToken: string | null = null
let refreshPromise: Promise<string> | null = null

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch('/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRF-Token': getCsrfToken() },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('refresh failed')
        const data = await res.json()
        accessToken = data.accessToken
        return data.accessToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  let res = await fetch(input, { ...init, headers, credentials: 'include' })
  if (res.status !== 401) return res

  const nextToken = await refreshAccessToken()
  headers.set('Authorization', `Bearer ${nextToken}`)
  res = await fetch(input, { ...init, headers, credentials: 'include' })
  return res
}
```

`refreshPromise` 保证多个 401 同时发生时只发一次刷新请求。刷新失败要清空内存 token、通知所有等待请求失败，并跳转登录或展示登录过期。

### 安全细节
- Access token 短有效期，refresh token 长有效期并轮换
- Refresh token 放 HttpOnly Cookie，接口校验 CSRF token、Origin/Referer 或 Fetch Metadata
- 退出登录要服务端吊销 refresh token，同时清理 Cookie
- 多标签页用 BroadcastChannel 同步登录、刷新失败和退出事件
- 不把 JWT payload 当可信权限源，权限以服务端校验为准
- 不在 URL、localStorage、错误日志、埋点中暴露 token
- XSS 防护仍然关键：HttpOnly 防窃取，但不能阻止已注入脚本以用户身份发请求

<!-- id: proj-043; difficulty: 2; tags: 工程化, 环境变量, 配置; source: 高频 -->
# 前端项目如何管理多环境配置（开发、测试、生产）？有哪些最佳实践？

## 前端多环境配置

前端配置分两类：构建期配置和运行时配置。Vite 的 `import.meta.env` 是构建期替换，打包后再改容器环境变量不会生效；需要部署后动态切换时要用运行时配置。

### Vite 环境文件
```text
.env                  所有模式共享
.env.local            本地私有，不提交
.env.development      开发模式
.env.staging          测试/预发模式
.env.production       生产模式
```

只有 `VITE_` 前缀变量会暴露给浏览器：
```env
VITE_APP_ENV=staging
VITE_API_BASE_URL=https://staging-api.example.com
VITE_SENTRY_DSN=https://public-dsn@example
VITE_ENABLE_DEVTOOLS=false
```

### 类型和校验
```ts
import { z } from 'zod'

const EnvSchema = z.object({
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']),
  VITE_API_BASE_URL: z.string().url(),
  VITE_ENABLE_DEVTOOLS: z.enum(['true', 'false']).default('false'),
})

const env = EnvSchema.parse(import.meta.env)

export const config = {
  appEnv: env.VITE_APP_ENV,
  apiBaseUrl: env.VITE_API_BASE_URL,
  enableDevtools: env.VITE_ENABLE_DEVTOOLS === 'true',
  isProd: env.VITE_APP_ENV === 'production',
} as const
```

不要在业务代码里散落 `import.meta.env`，统一从 `config` 读取，便于测试和审计。

### 构建脚本
```json
{
  "scripts": {
    "dev": "vite",
    "build:staging": "vite build --mode staging",
    "build": "vite build --mode production",
    "preview": "vite preview"
  }
}
```

### 运行时配置
```html
<script src="/config.js"></script>
```

```js
window.__APP_CONFIG__ = {
  apiBaseUrl: 'https://api.example.com',
  featureFlags: { newCheckout: true },
}
```

容器或 CI/CD 在启动时生成 `config.js`，这样同一个镜像可以部署到不同环境。`config.js` 应该 `no-cache`，否则切环境后用户可能拿到旧配置。

### 最佳实践
- 前端没有真正的 secret，API key、私钥、数据库密码只能放服务端
- `.env.local`、CI secret、Sentry auth token 不提交仓库
- 配置变更要可审计，生产配置最好由发布系统或配置中心管理
- 功能开关不要只靠 `.env`，需要运行时动态控制
- 构建产物中检查是否误打入 secret
- 配置错误要启动失败或展示明确错误，不能静默走默认生产接口

<!-- id: proj-044; difficulty: 3; tags: 性能, 内存泄漏, 排查; source: 高频 -->
# 前端内存泄漏如何排查？常见的内存泄漏场景有哪些？

## 前端内存泄漏排查

内存泄漏的判断标准不是“内存上涨”，而是完成一轮操作并触发 GC 后，相关对象仍然被引用无法释放。排查要用可重复操作和快照对比。

### 排查流程
1. Chrome DevTools Performance Monitor 观察 JS heap 是否持续上升
2. Memory 面板拍 Heap Snapshot：操作前一张，重复打开/关闭页面或弹窗多次后一张
3. 手动触发 GC 后用 Comparison 看 retained size 增长的对象
4. 在 Retainers 中找到谁持有它：事件监听器、闭包、全局缓存、DOM 引用、第三方库
5. 用 Allocation instrumentation on timeline 定位持续分配来源

### 常见场景
事件、定时器、Observer 未清理：
```tsx
useEffect(() => {
  const controller = new AbortController()
  window.addEventListener('resize', handleResize, { signal: controller.signal })

  const timer = window.setInterval(poll, 5000)
  const observer = new ResizeObserver(handleResize)
  observer.observe(node)

  return () => {
    controller.abort()
    window.clearInterval(timer)
    observer.disconnect()
  }
}, [])
```

请求和订阅未取消：
```tsx
useEffect(() => {
  const controller = new AbortController()

  fetch('/api/data', { signal: controller.signal })
    .then((res) => res.json())
    .then(setData)
    .catch((error) => {
      if (error.name !== 'AbortError') report(error)
    })

  return () => controller.abort()
}, [])
```

缓存无限增长：
```ts
const cache = new Map<string, Data>()

function setCache(key: string, value: Data) {
  if (cache.size > 500) cache.delete(cache.keys().next().value)
  cache.set(key, value)
}
```

还包括：
- 闭包持有大数组或大对象
- detached DOM 被 JS 变量、事件或第三方库持有
- `URL.createObjectURL` 后未 `URL.revokeObjectURL`
- Canvas/WebGL/图表实例未 `dispose`
- WebSocket、BroadcastChannel、Worker 未关闭
- 全局 store 保留已离开页面的数据

React 里“卸载后 setState”本身不一定等于泄漏，但它常提示异步任务生命周期没管理好。真正要看是否仍有外部任务持有组件相关闭包。

### 预防
- 所有 `useEffect` 注册外部资源都返回 cleanup
- 大对象不要放全局单例，缓存要有上限和过期策略
- 路由离开时清理页面级 store 和查询缓存
- 第三方库封装统一的 `destroy/dispose`
- 对内存敏感流程做自动化冒烟：重复进出页面 20 次，监控 heap 是否回落

<!-- id: proj-045; difficulty: 2; tags: A/B测试, 功能开关, 工程化; source: 高频 -->
# 如何在前端实现 A/B 测试和功能开关（Feature Flag）？

## Feature Flag 与 A/B 测试

Feature Flag 是发布控制和风险控制工具，A/B 测试是实验统计工具。两者可以共用分流系统，但目标不同：开关关注是否启用和能否回滚，实验关注随机分组、曝光、指标和统计显著性。

### Feature Flag 模型
```ts
type Flags = {
  newCheckout: boolean
  recommendationModel: 'v1' | 'v2'
  maxUploadSizeMB: number
}

function getFlag<T extends keyof Flags>(flags: Flags, key: T): Flags[T] {
  return flags[key]
}
```

Flag 通常由服务端按用户、租户、地区、版本、白名单、百分比灰度计算后返回，前端只消费结果。关键业务不要只在前端隐藏入口，后端也要按相同开关校验。

### React 使用
```tsx
function CheckoutPage() {
  const flags = useFeatureFlags()
  return flags.newCheckout ? <NewCheckout /> : <LegacyCheckout />
}
```

为避免首屏闪烁，首屏必要 flag 可以由 SSR/HTML 注入，或在应用启动前拉取；非关键 flag 可异步加载并提供默认值。

### A/B 分组
```ts
function assignVariant(userKey: string, experimentId: string) {
  const bucket = hash(`${experimentId}:${userKey}`) % 10000
  if (bucket < 5000) return 'control'
  if (bucket < 7500) return 'variant_a'
  return 'variant_b'
}
```

分组要稳定、互斥、可复现。匿名用户用匿名 id，登录后要处理 id 合并策略，避免同一用户反复换组。真正严肃的实验更推荐服务端分组，前端只接收 variant。

### 曝光与指标
```tsx
function useExperimentExposure(experimentId: string, variant: string, visible: boolean) {
  const exposedRef = useRef(false)

  useEffect(() => {
    if (!visible || exposedRef.current) return
    exposedRef.current = true
    analytics.track('experiment_exposure', { experimentId, variant })
  }, [experimentId, variant, visible])
}
```

曝光应在用户真正看到实验内容时上报，而不是分组时上报。指标要包含主指标和护栏指标，例如转化率、收入、错误率、性能、退款率。

### 治理要点
- Flag 有 owner、创建时间、过期时间和清理计划，避免长期堆积
- 实验互斥层管理，避免多个实验相互污染
- 发布开关和实验开关分开命名和权限
- 本地默认值要保守，远程配置失败时可降级
- 灰度发布先内部、白名单、小比例，再全量
- 所有关键变体都要带监控和一键回滚
- 涉及隐私和个性化时要遵守同意和数据合规要求

<!-- id: proj-046; difficulty: 2; tags: SSE, 流式输出, AI; source: 高频 -->
# 如何实现类似 ChatGPT 的流式文字输出效果？SSE 如何处理断线重连？

## 流式文字输出与 SSE 重连

类似 ChatGPT 的输出通常是服务端边生成边发送，前端逐步解析并渲染。实现方式有两类：`fetch` 读取 ReadableStream，适合 POST + 自定义鉴权；`EventSource` 使用 SSE，适合 GET + 服务端单向推送并自带重连。

### Fetch Streams 解析
流式 chunk 可能从任意位置切开，不能简单对每个 chunk `split('\n')` 后就 JSON.parse，必须维护 buffer。

```ts
async function* streamChat(input: string, signal: AbortSignal) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
    signal,
  })

  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  if (!response.body) throw new Error('ReadableStream is not supported')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const frames = buffer.split('\n\n')
      buffer = frames.pop() ?? ''

      for (const frame of frames) {
        const data = frame
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trimStart())
          .join('\n')

        if (!data) continue
        if (data === '[DONE]') return
        yield JSON.parse(data).delta ?? ''
      }
    }
  } finally {
    reader.releaseLock()
  }
}
```

React 中用 `AbortController` 支持停止生成，并把 token 更新做批处理，避免每个字符都触发一次渲染。

```tsx
const abortRef = useRef<AbortController | null>(null)

async function send(input: string) {
  abortRef.current?.abort()
  const controller = new AbortController()
  abortRef.current = controller

  let pending = ''
  for await (const delta of streamChat(input, controller.signal)) {
    pending += delta
    requestAnimationFrame(() => {
      setContent((prev) => prev + pending)
      pending = ''
    })
  }
}
```

### SSE 与断线重连
SSE 响应格式：
```text
id: 42
event: message
data: {"delta":"hello"}

```

浏览器 `EventSource` 会自动重连；服务端可通过 `retry:` 指定重连间隔。若事件带 `id`，浏览器重连时会携带 `Last-Event-ID`，服务端可从该 id 之后补发。

```ts
const es = new EventSource('/api/events', { withCredentials: true })

es.addEventListener('message', (event) => {
  const payload = JSON.parse(event.data)
  append(payload.delta)
})

es.onerror = () => {
  // 浏览器会自动重连，这里只更新 UI 状态或上报
  setStatus('reconnecting')
}
```

EventSource 只能发 GET，不能自定义请求头；鉴权通常用 Cookie、短期 URL token，或改用 fetch stream。无论哪种方式，都要处理重复消息、缺失补偿、用户手动停止、服务端超时和 Markdown 增量渲染。

<!-- id: proj-047; difficulty: 2; tags: 前端监控, 用户行为, Session Replay; source: 高频 -->
# 如何实现前端用户行为录制与回放（Session Replay）？rrweb 的原理是什么？

## Session Replay 与 rrweb 原理

Session Replay 是把用户会话转成可回放事件流，用于定位线上错误和体验问题。rrweb 的核心是“初始 DOM 快照 + 增量变更 + 用户交互事件”。

### 录制流程
```text
full snapshot：序列化 DOM、样式、视口信息
incremental snapshot：MutationObserver 记录 DOM 增删改
interaction：鼠标、点击、滚动、输入、视口变化
batch upload：按时间戳批量压缩上报
```

回放时在隔离 iframe 中重建 DOM，按时间戳顺序应用增量事件，并绘制鼠标轨迹、滚动位置和输入变化。

### 集成示例
```ts
import { record } from 'rrweb'

const events: eventWithTime[] = []
const stop = record({
  emit(event) {
    events.push(event)
    if (events.length >= 100) flush(events.splice(0))
  },
  maskAllInputs: true,
  maskInputOptions: { password: true, email: true, tel: true },
  blockClass: 'replay-block',
  ignoreClass: 'replay-ignore',
  sampling: {
    mousemove: 50,
    scroll: 150,
    input: 'last',
  },
  recordCanvas: false,
})
```

线上通常维护最近 N 秒环形缓冲，出错时上报错误前后的 replay，而不是全量录制所有用户。

### 隐私与合规
rrweb 事件可能包含 DOM 文本、输入内容、URL、属性和截图相关信息；不能说“只存结构就没有隐私”。必须在录制前脱敏：
- 默认 mask input、textarea、contenteditable
- 对姓名、手机号、邮箱、身份证、金额等区域加 block/mask class
- 不录制密码、支付、医疗、私密聊天等页面
- 支持用户 opt-out，按地区处理同意要求
- 传输和存储加密，设置保留期限和访问审计

### 工程难点
- CSS、字体、图片、跨域资源要能在回放环境加载，否则页面样式失真
- iframe、Canvas、WebGL、视频录制成本高且不一定完整
- 高频鼠标和滚动事件需要采样和压缩
- SPA 路由切换要记录 URL 和上下文
- 回放数据要关联 release、用户、错误事件、网络请求和控制台日志

Session Replay 适合排查“用户当时怎么操作”的问题，但成本和隐私风险高，必须采样、脱敏、限权。

<!-- id: proj-048; difficulty: 3; tags: 编译器, AST, Babel插件; source: 高频 -->
# 如何编写一个 Babel 插件？以自动添加函数执行时间日志为例

## Babel 插件：自动注入耗时日志

Babel 插件本质是 AST 转换：parser 把源码转 AST，visitor 遍历节点，插件修改节点，generator 输出新代码。写插件前先用 AST Explorer 看目标语法结构。

### 目标
```js
function fetchUser(id) {
  return api.get('/user/' + id)
}
```

转换为：
```js
function fetchUser(id) {
  const _start = performance.now()
  try {
    return api.get('/user/' + id)
  } finally {
    console.log('[perf] fetchUser', performance.now() - _start)
  }
}
```

用 `try/finally` 的好处是函数正常 return、提前 return 或抛异常时都能记录耗时。

### 插件实现
```js
module.exports = function perfLoggerPlugin({ types: t }) {
  function nowCall() {
    return t.callExpression(
      t.memberExpression(t.identifier('performance'), t.identifier('now')),
      [],
    )
  }

  function getFunctionName(path) {
    if (path.node.id?.name) return path.node.id.name
    const parent = path.parent
    if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) return parent.id.name
    if (t.isObjectProperty(parent) && t.isIdentifier(parent.key)) return parent.key.name
    return 'anonymous'
  }

  function instrument(path) {
    if (path.node.__perfInstrumented) return
    path.node.__perfInstrumented = true

    const bodyPath = path.get('body')
    if (!bodyPath.isBlockStatement()) {
      bodyPath.replaceWith(t.blockStatement([t.returnStatement(bodyPath.node)]))
    }

    const startId = path.scope.generateUidIdentifier('perfStart')
    const fnName = getFunctionName(path)
    const originalBody = path.node.body.body

    path.node.body.body = [
      t.variableDeclaration('const', [t.variableDeclarator(startId, nowCall())]),
      t.tryStatement(
        t.blockStatement(originalBody),
        null,
        t.blockStatement([
          t.expressionStatement(
            t.callExpression(t.memberExpression(t.identifier('console'), t.identifier('log')), [
              t.stringLiteral(`[perf] ${fnName}`),
              t.binaryExpression('-', nowCall(), startId),
            ]),
          ),
        ]),
      ),
    ]
  }

  return {
    name: 'perf-logger',
    visitor: {
      FunctionDeclaration: instrument,
      FunctionExpression: instrument,
      ArrowFunctionExpression: instrument,
    },
  }
}
```

### 注意点
- 用 `scope.generateUidIdentifier` 避免变量名和业务代码冲突
- 箭头函数表达式体要先转成 block + return
- 不要只在最后一个 return 前插日志，否则多 return、throw、异常路径会漏
- 生产环境应通过插件参数过滤文件、函数名或只在 dev/test 开启
- async 函数记录的是 Promise 创建到 settle 的耗时吗？上面写法只包住同步执行；若要统计 await 后总耗时，需要把 finally 包在 async 函数的 await 链路里并仔细测试
- sourcemap 要保留，否则调试会很痛苦

<!-- id: proj-049; difficulty: 2; tags: 前端架构, BFF, 接口层; source: 高频 -->
# 什么是 BFF（Backend for Frontend）？前端为什么需要 BFF 层？

## BFF（Backend for Frontend）

BFF 是面向特定前端体验的服务层，位于 Web/App 和后端服务之间。它不只是转发代理，而是负责聚合、裁剪、适配、鉴权上下文、缓存和错误收敛。

```text
Web/App -> BFF -> user-service
              -> order-service
              -> product-service
```

### 解决的问题
- 聚合多个后端接口，减少前端瀑布请求
- 裁剪字段和结构，返回页面真正需要的数据
- 适配不同终端：Web、移动端、管理后台可以有不同 BFF
- 屏蔽后端微服务变更，降低前端耦合
- 统一认证、灰度、缓存、限流、日志和错误格式

### 示例
```ts
app.get('/api/order-detail/:id', async (req, res, next) => {
  try {
    const order = await orderService.getOrder(req.params.id, req.user)
    const [user, products] = await Promise.all([
      userService.getUser(order.userId),
      productService.getProducts(order.items.map((item) => item.productId)),
    ])

    res.json({
      id: order.id,
      status: order.status,
      buyer: { id: user.id, name: user.name, avatar: user.avatar },
      items: order.items.map((item) => {
        const product = products.find((p) => p.id === item.productId)
        return { id: item.productId, name: product?.name, quantity: item.quantity }
      }),
    })
  } catch (error) {
    next(error)
  }
})
```

注意不能在 `Promise.all` 里先用 `order.userId`，必须先拿到 order 再并行请求依赖数据。

### 技术选择
- Node/Fastify/NestJS：前端团队易维护，适合 Web BFF
- Next.js/Remix server route：和页面同仓库，适合全栈 React
- GraphQL Gateway：多端字段差异大、数据关系复杂
- tRPC：全栈 TypeScript、小到中型团队类型体验好
- Edge Function：轻量聚合、A/B、鉴权、地理就近，但运行时限制更多

### 风险
BFF 容易变成“第二后端”或巨型胶水层。治理上要明确边界：业务核心规则仍在领域服务，BFF 做体验适配；所有下游调用要有超时、熔断、缓存、日志、trace id 和错误降级。

<!-- id: proj-050; difficulty: 3; tags: 前端架构, 性能预算, 工程化; source: 高频 -->
# 什么是性能预算（Performance Budget）？如何在 CI 中强制执行性能预算？

## 性能预算与 CI 强制执行

性能预算是把性能目标变成工程门禁。预算不只看 Lighthouse 分数，还应覆盖资源体积、关键路径请求数、JS 执行成本、Core Web Vitals 和真实用户监控。

### 常见预算
```text
资源预算：
  initial JS gzip <= 180KB
  route chunk gzip <= 80KB
  CSS gzip <= 50KB
  third-party JS <= 120KB

实验室指标：
  Lighthouse performance >= 0.9
  LCP <= 2500ms
  CLS <= 0.1
  TBT <= 300ms

真实用户指标：
  p75 LCP <= 2500ms
  p75 INP <= 200ms
  p75 CLS <= 0.1
```

CI 适合强制构建产物体积和可重复的 lab 指标；RUM 指标受网络和设备影响，通常用于发布后告警和回滚决策。

### Bundle 预算
```json
{
  "scripts": {
    "build": "tsc -b && vite build",
    "size": "size-limit"
  },
  "size-limit": [
    { "path": "dist/assets/*.js", "limit": "300 KB" },
    { "path": "dist/assets/*.css", "limit": "60 KB" }
  ]
}
```

CI：
```yaml
- run: bun install --frozen-lockfile
- run: bun run build
- run: bun run size
```

更好的做法是同时输出 bundle analyzer 报告，在 PR 里评论新增依赖、chunk 变化和 gzip/brotli 体积差异。

### Lighthouse CI
```js
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'bun run preview --host 127.0.0.1',
      url: ['http://127.0.0.1:4173/'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
}
```

Lighthouse 在 CI 里波动较大，所以要固定网络/CPU 模拟、跑多次取中位数，并区分 error 和 warn。不要把单次 Lighthouse 当作唯一真实性能结论。

### 落地流程
1. 先测当前基线，把预算设在“阻止明显回退”的位置
2. 对首屏路由、核心交易路径分别设预算
3. PR 阶段阻断 bundle 明显增大和 Lighthouse 严重回退
4. 发布后用 RUM 看 p75 Core Web Vitals，超阈值告警
5. 预算例外必须写明原因、负责人和清理时间
6. 定期收紧预算，尤其是第三方脚本和首屏 JS

性能预算的价值在于提前阻止回归，而不是等线上 INP/LCP 变差后再靠专项优化补救。
