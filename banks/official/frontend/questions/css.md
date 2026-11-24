# CSS

<!-- id: css-001; difficulty: 1; tags: 盒模型, box-sizing, 布局; source: 高频 -->
# CSS 盒模型是什么？标准盒模型和 IE 盒模型的区别？

## CSS 盒模型

每个 HTML 元素都是一个矩形盒子，由四部分组成：content、padding、border、margin。

### 标准盒模型（content-box）
```css
box-sizing: content-box; /* 默认值 */
/* width/height 只包含 content */
/* 实际占用宽度 = width + padding*2 + border*2 */
.box {
  width: 200px;
  padding: 20px;
  border: 5px solid;
  /* 渲染宽度 = 200 + 40 + 10 = 250px */
}
```

### IE 盒模型（border-box）
```css
box-sizing: border-box;
/* width/height 包含 content + padding + border */
.box {
  box-sizing: border-box;
  width: 200px;
  padding: 20px;
  border: 5px solid;
  /* 渲染宽度 = 200px，content 自动缩为 150px */
}
```

### 最佳实践
```css
*, *::before, *::after {
  box-sizing: border-box;
}
```

### JS 获取尺寸
```js
element.offsetWidth  // content + padding + border
element.clientWidth  // content + padding
element.getBoundingClientRect().width // 实际渲染宽度（含小数）
```

<!-- id: css-002; difficulty: 1; tags: BFC, 浮动, 布局, margin折叠; source: 高频 -->
# 什么是 BFC（块级格式化上下文）？如何创建？有什么用途？

## BFC 是什么

BFC（Block Formatting Context，块级格式化上下文）是一个独立的块级布局区域。BFC 内部的块盒按规则垂直排列，内部浮动会参与高度计算，BFC 区域不会和外部浮动元素重叠，内部布局也不会直接影响外部。

## 常见创建方式

```css
.bfc { display: flow-root; }      /* 推荐：语义明确，副作用少 */
.bfc { overflow: hidden; }        /* 常见，但可能裁剪内容 */
.bfc { overflow: auto; }
.bfc { float: left; }
.bfc { position: absolute; }
.bfc { position: fixed; }
.bfc { display: inline-block; }
.bfc { display: table-cell; }
.bfc { contain: layout; }
```

注意：`display: flex` / `display: grid` 创建的是 flex/grid formatting context，不是传统 BFC；但它们也会带来类似的布局隔离效果。严格谈 BFC 时，建议优先回答 `display: flow-root`、`overflow`、`float`、`position:absolute/fixed`、`inline-block` 等。

## 用途

### 1. 包含浮动，防止父元素高度塌陷

```css
.container {
  display: flow-root;
}
.float-child {
  float: left;
  height: 100px;
}
```

### 2. 阻止 margin 折叠

```css
.parent {
  display: flow-root;
}
.child {
  margin-top: 20px;
}
```

### 3. 避免与浮动元素重叠

```css
.sidebar {
  float: left;
  width: 200px;
}
.content {
  overflow: hidden;
}
```

## 关键点

1. BFC 会包含内部浮动。
2. BFC 内外的 margin 不会发生折叠。
3. BFC 的区域不会与外部 float 重叠。
4. 现代清浮动优先用 `display: flow-root`，少用 `overflow: hidden` 作为布局技巧。

<!-- id: css-003; difficulty: 1; tags: Flexbox, 布局, CSS; source: 高频 -->
# Flexbox 布局的核心属性有哪些？

## 核心概念

Flexbox 是一维布局模型，重点是主轴和交叉轴。`flex-direction` 决定主轴方向，`justify-content` 控制主轴对齐，`align-items` 控制交叉轴对齐。

## 容器属性

```css
.container {
  display: flex;
  flex-direction: row | row-reverse | column | column-reverse;
  flex-wrap: nowrap | wrap | wrap-reverse;
  flex-flow: row wrap; /* flex-direction + flex-wrap */
  justify-content: flex-start | flex-end | center | space-between | space-around | space-evenly;
  align-items: stretch | flex-start | flex-end | center | baseline;
  align-content: flex-start | flex-end | center | space-between | space-around | stretch; /* 多行有效 */
  gap: 16px;
}
```

## 子项属性

```css
.item {
  flex-grow: 0;      /* 剩余空间放大比例 */
  flex-shrink: 1;    /* 空间不足时缩小比例 */
  flex-basis: auto;  /* 分配空间前的基准大小 */
  flex: 1;           /* 通常等价于 flex: 1 1 0% */
  flex: auto;        /* flex: 1 1 auto */
  flex: none;        /* flex: 0 0 auto */
  align-self: center;
  order: 0;
}
```

## 常见布局

```css
/* 水平垂直居中 */
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 两端对齐导航 */
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 等分列 */
.cols {
  display: flex;
}
.col {
  flex: 1;
  min-width: 0;
}
```

## 常见坑

1. `align-content` 只在多行 flex 容器中生效，单行看 `align-items`。
2. flex 子项默认 `min-width: auto`，长文本或长 URL 可能撑破容器；常用 `min-width: 0` 修复。
3. `order` 只改变视觉顺序，不应依赖它改变 DOM 语义和可访问性顺序。
4. Flexbox 适合一维布局；二维网格更适合 CSS Grid。

<!-- id: css-004; difficulty: 1; tags: Grid, 布局, CSS; source: 高频 -->
# CSS Grid 布局是什么？核心属性有哪些？

## CSS Grid 是什么

CSS Grid 是二维布局系统，可以同时控制行和列。Flexbox 更适合一维布局，Grid 更适合页面骨架、卡片矩阵、仪表盘和复杂二维排版。

## 容器属性

```css
.grid {
  display: grid;
  grid-template-columns: 200px 1fr 200px;
  grid-template-columns: repeat(3, 1fr);
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  grid-template-rows: 60px 1fr 60px;
  grid-auto-rows: minmax(120px, auto);
  gap: 16px;

  justify-items: stretch;  /* 单元格内，水平对齐 item */
  align-items: stretch;    /* 单元格内，垂直对齐 item */
  place-items: center;     /* align-items + justify-items */

  justify-content: stretch; /* 整个 grid 在容器内水平对齐 */
  align-content: stretch;   /* 整个 grid 在容器内垂直对齐 */

  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
}
```

## 子项属性

```css
.item {
  grid-column: 1 / 3;
  grid-column: span 2;
  grid-row: 1 / 3;
  grid-area: header;
  justify-self: center;
  align-self: center;
  place-self: center;
}
```

## 示例：经典三栏布局

```css
.layout {
  min-height: 100vh;
  display: grid;
  grid-template-areas:
    "header header header"
    "sidebar main aside"
    "footer footer footer";
  grid-template-columns: 200px minmax(0, 1fr) 200px;
  grid-template-rows: 60px 1fr 60px;
  gap: 16px;
}
.header { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main { grid-area: main; min-width: 0; }
.aside { grid-area: aside; }
.footer { grid-area: footer; }
```

## 常见点

1. `fr` 表示分配剩余空间的比例。
2. `minmax(min, max)` 可以限制轨道最小和最大尺寸。
3. `auto-fill` 会尽量填充列，即使空列也占位；`auto-fit` 会折叠空列，更适合自适应卡片布局。
4. `justify-items/align-items` 对齐单元格里的 item，`justify-content/align-content` 对齐整个网格。
5. `minmax(0, 1fr)` 或 `min-width: 0` 常用于防止内容把 Grid/Flex 子项撑破。

<!-- id: css-005; difficulty: 1; tags: 选择器, 优先级, CSS, 层叠; source: 高频 -->
# CSS 选择器优先级是如何计算的？

## 基本计算

选择器优先级通常按四元组理解：`(inline, id, class, type)`。

```text
内联样式 style=""     (1,0,0,0)
ID 选择器 #id          (0,1,0,0)
类、属性、伪类          (0,0,1,0)
元素、伪元素            (0,0,0,1)
通配符、组合符          (0,0,0,0)
```

## 示例

```css
p { }                    /* 0,0,0,1 */
.text { }                /* 0,0,1,0 */
#title { }               /* 0,1,0,0 */
div p { }                /* 0,0,0,2 */
.nav .item { }           /* 0,0,2,0 */
div .item:hover { }      /* 0,0,2,1 */
#nav .item { }           /* 0,1,1,0 */
```

## 现代选择器规则

```css
:where(.card #title) { }      /* 0,0,0,0，:where 永远零优先级 */
:is(.card, #title) { }        /* 取参数中最高优先级：0,1,0,0 */
:not(.disabled) { }           /* 取参数优先级：0,0,1,0 */
:has(.error) { }              /* 取参数优先级：0,0,1,0 */
```

## 层叠顺序

最终生效不只看选择器优先级，完整顺序大致是：来源和重要性、cascade layer、选择器优先级、书写顺序。

```css
/* 同来源、同 layer、同优先级时，后写覆盖先写 */
.button { color: red; }
.button { color: blue; }
```

`!important` 会改变重要性排序，但不是“无条件覆盖一切”；它仍受来源、cascade layer 和同为 important 时的优先级/顺序影响。工程上应谨慎使用。

## 继承

继承值不是选择器匹配结果，优先级低于直接作用在元素上的声明。

```css
.parent { color: red; }
.child { color: inherit; }
```

常见可继承属性有 `color`、`font-*`、`line-height`、`text-align`；常见不可继承属性有 `width`、`height`、`margin`、`padding`、`border`。

<!-- id: css-006; difficulty: 1; tags: 居中, Flexbox, Grid, 布局; source: 高频 -->
# 如何实现水平垂直居中？有哪些方法？

## CSS 居中方案

### 方法1：Flexbox（推荐）
```css
.container {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

### 方法2：Grid
```css
.container {
  display: grid;
  place-items: center;
}
```

### 方法3：绝对定位 + transform
```css
.container { position: relative; }
.child {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  /* 无需知道元素尺寸 */
}
```

### 方法4：绝对定位 + margin: auto
```css
.container { position: relative; }
.child {
  position: absolute;
  inset: 0; /* top/right/bottom/left: 0 */
  margin: auto;
  width: 200px; /* 必须有固定宽高 */
  height: 100px;
}
```

### 方法5：单行文本
```css
.container {
  height: 50px;
  line-height: 50px; /* 垂直居中 */
  text-align: center; /* 水平居中 */
}
```

### 推荐
```
现代项目：Flexbox 或 Grid
需要兼容旧浏览器：绝对定位 + transform
单行文本：line-height
```

<!-- id: css-007; difficulty: 1; tags: 伪类, 伪元素, 选择器, CSS; source: 高频 -->
# 什么是 CSS 伪类和伪元素？有什么区别？

## 伪类和伪元素

### 伪类（单冒号 `:`）

伪类选择处于特定状态、位置或条件下的已有元素。

```css
a:link { }          /* 未访问链接 */
a:visited { }       /* 已访问链接 */
a:hover { }         /* 鼠标悬停 */
a:active { }        /* 激活状态 */
input:focus { }     /* 获得焦点 */
input:disabled { }
input:checked { }
li:first-child { }
li:last-child { }
li:nth-child(2) { }
li:nth-child(odd) { }
:not(.special) { }
:root { }
```

### 伪元素（双冒号 `::`）

伪元素选择或创建元素的一部分虚拟结构，不会真实出现在 DOM 树里。

```css
.item::before { content: '★'; color: gold; }
.item::after { content: ''; display: block; clear: both; }

::selection { background: #ff6b6b; color: white; }
input::placeholder { color: #999; }
p::first-line { font-weight: bold; }
p::first-letter { font-size: 2em; }
li::marker { color: red; }
```

`::before` 和 `::after` 通常必须设置 `content` 才会生成盒子。

## 区别

```text
伪类：选择已有元素的状态或关系，例如 :hover、:focus、:nth-child
伪元素：选择或创建元素的一部分，例如 ::before、::after、::first-line
```

## 注意点

1. 现代写法中伪元素使用双冒号 `::`。
2. 为兼容历史 CSS2，`:before`、`:after`、`:first-line`、`:first-letter` 等老伪元素的单冒号写法仍常见，但新代码建议用双冒号。
3. 伪元素不是 DOM 节点，不能直接用 JS `querySelector` 获取。

<!-- id: css-008; difficulty: 1; tags: CSS变量, 自定义属性, 主题, CSS; source: 高频 -->
# 什么是 CSS 变量（Custom Properties）？如何使用？

## CSS 变量是什么

CSS 变量也叫 Custom Properties，使用 `--name` 声明，用 `var(--name)` 读取。它参与 CSS 层叠和继承，是运行时能力，不是预处理器的编译期替换。

## 基本用法

```css
:root {
  --primary-color: #007bff;
  --font-size-base: 16px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --border-radius: 4px;
}

.button {
  background-color: var(--primary-color);
  font-size: var(--font-size-base);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius);
  color: var(--button-color, white); /* fallback */
}
```

## 作用域和主题

```css
.card {
  --card-bg: white;
  background: var(--card-bg);
}

.card.danger {
  --card-bg: #fee2e2;
}

[data-theme="light"] {
  --bg: white;
  --text: #333;
}

[data-theme="dark"] {
  --bg: #1a1a1a;
  --text: #fff;
}

body {
  background: var(--bg);
  color: var(--text);
}
```

## JS 读写

```js
const root = document.documentElement;
const color = getComputedStyle(root).getPropertyValue('--primary-color').trim();

root.style.setProperty('--primary-color', '#ff6b6b');
root.setAttribute('data-theme', 'dark');
```

## 类型化自定义属性

`@property` 可以声明语法、初始值和是否继承，便于动画和类型校验。

```css
@property --progress {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 0%;
}

.bar {
  width: var(--progress);
  transition: --progress 300ms;
}
```

## 与 SCSS 变量区别

```text
CSS 变量：运行时、参与继承和层叠、可由 JS/媒体查询/状态动态改变
SCSS 变量：编译时、最终 CSS 中不存在、不能被浏览器运行时修改
```

## 注意点

1. `var()` fallback 只在变量未定义或变量值无效时使用。
2. CSS 变量值本身只是 token 序列，最终是否有效取决于使用它的属性。
3. 大量在根节点修改变量会触发样式重新计算，应把变量作用域控制在需要的子树。

<!-- id: css-009; difficulty: 1; tags: 响应式, 媒体查询, 移动端, 布局; source: 高频 -->
# 什么是响应式设计？如何使用媒体查询？

## 响应式设计是什么

响应式设计是让同一套页面根据设备宽度、容器尺寸、输入方式、主题偏好和可访问性设置自动调整布局、字号、图片和交互。

## viewport meta

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

移动端页面通常必须设置 viewport，否则浏览器可能按默认布局视口缩放页面。

## 媒体查询

```css
/* 移动优先 */
.container {
  padding: 16px;
}

@media (min-width: 768px) {
  .container { padding: 24px; }
}

@media (min-width: 1024px) {
  .container { padding: 32px; }
}

/* 范围查询 */
@media (768px <= width <= 1024px) {
  .sidebar { display: none; }
}

/* 用户偏好 */
@media (prefers-color-scheme: dark) {
  body { background: #1a1a1a; color: white; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

@media print {
  .no-print { display: none; }
}
```

## 响应式单位和函数

```css
.card {
  width: min(100%, 720px);
  padding: clamp(16px, 4vw, 32px);
  font-size: clamp(16px, 1.5vw, 20px);
}

.hero {
  min-height: 100dvh; /* 动态视口高度，移动端比 100vh 更可靠 */
}
```

## 容器查询

容器查询按组件容器尺寸响应，而不是按整个视口响应，适合组件化布局。

```css
.card-list {
  container-type: inline-size;
}

@container (min-width: 600px) {
  .card {
    display: grid;
    grid-template-columns: 160px 1fr;
  }
}
```

## 响应式媒体

```html
<img
  src="avatar-400.jpg"
  srcset="avatar-400.jpg 400w, avatar-800.jpg 800w"
  sizes="(min-width: 768px) 240px, 120px"
  alt="用户头像"
>
```

## 关键点

1. 推荐移动优先：默认写小屏样式，再用 `min-width` 增强大屏。
2. 不要只按设备名设计断点，应按内容何时需要重排来选断点。
3. 布局优先用 Flex/Grid、百分比、`minmax`、`clamp`，不要到处写固定宽度。
4. 响应式不仅是宽度，还包括暗色模式、减少动画、打印、触摸/鼠标输入差异和高清图片。

<!-- id: css-010; difficulty: 1; tags: position, 定位, z-index, 布局; source: 高频 -->
# position 属性有哪些值？各有什么特点？

## static

默认值，元素在正常文档流中布局，`top/right/bottom/left` 无效，普通 `z-index` 也不生效。

## relative

```css
.el {
  position: relative;
  top: 20px;
  left: 20px;
}
```

相对自身原位置偏移，不脱离文档流，原位置仍占空间。常用来给绝对定位子元素提供 containing block。

## absolute

```css
.parent {
  position: relative;
}
.child {
  position: absolute;
  top: 0;
  right: 0;
}
```

脱离文档流，不占据原空间。通常相对于最近的非 `static` 定位祖先定位；某些属性如 `transform`、`filter`、`contain` 也可能创建 containing block。

## fixed

```css
.header {
  position: fixed;
  inset: 0 0 auto 0;
}
```

脱离文档流，通常相对于视口定位，滚动时不移动。但如果祖先元素有 `transform`、`filter`、`perspective` 等，fixed 可能相对于该祖先的 containing block。

## sticky

```css
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
}
```

正常情况下参与文档流；滚动到指定阈值后表现得像 fixed。必须设置至少一个 inset，如 `top`。它受最近滚动容器和父元素边界限制。

表格固定表头：

```css
th {
  position: sticky;
  top: 0;
  background: white;
  z-index: 1;
}
```

## z-index

```css
.modal {
  position: fixed;
  z-index: 1000;
}
```

`z-index` 对定位元素、flex/grid item 等场景有效，并且只在当前层叠上下文内比较。父级创建了新的 stacking context 时，子元素的 `z-index` 再大也不能越出父级上下文。

## 常见坑

1. absolute/fixed 会脱离文档流，可能遮挡内容，需要留出占位或控制层级。
2. sticky 不生效常见原因：没有设置 `top` 等 inset、祖先滚动容器不符合预期、父元素高度不足或 overflow 限制。
3. `position: relative` 偏移只改变视觉位置，不改变原本占位。

<!-- id: css-011; difficulty: 2; tags: 层叠上下文, z-index, Stacking Context; source: 高频 -->
# 什么是层叠上下文（Stacking Context）？它是如何形成的？

## 概念

层叠上下文是元素在 z 轴方向上的独立绘制区域。同一层叠上下文内的子元素按规则比较层级；不同层叠上下文之间先比较上下文本身，子元素的 `z-index` 不能越过父上下文去和外部元素直接比较。

## 常见触发条件

```css
/* 根元素天然创建层叠上下文 */
html { }

/* position + z-index 非 auto */
.el { position: relative; z-index: 1; }
.el { position: absolute; z-index: 1; }
.el { position: fixed; }
.el { position: sticky; }

/* flex/grid item + z-index 非 auto */
.item { z-index: 1; }

/* 透明、变换、滤镜、混合 */
.el { opacity: 0.99; }
.el { transform: translateZ(0); }
.el { filter: blur(0); }
.el { mix-blend-mode: multiply; }

/* 隔离、包含、裁剪 */
.el { isolation: isolate; }
.el { contain: layout; }
.el { contain: paint; }
.el { container-type: inline-size; }
.el { clip-path: inset(0); }
.el { mask: linear-gradient(black, transparent); }

/* will-change 指向会创建上下文的属性 */
.el { will-change: transform; }
```

## 同一上下文中的绘制顺序

```text
1. 当前元素背景和边框
2. 负 z-index 子层叠上下文
3. 普通文档流中的块级盒
4. 浮动元素
5. inline / inline-block 内容
6. z-index: auto 或 0 的定位元素/子上下文
7. 正 z-index 子层叠上下文
```

## 常见陷阱

```css
.parent {
  position: relative;
  z-index: 1;
}
.child {
  position: absolute;
  z-index: 9999;
}
.sibling {
  position: relative;
  z-index: 2;
}
```

即使 `.child` 是 `9999`，也不能盖过 `.sibling`，因为 `.child` 被限制在 `.parent` 这个层叠上下文里。常见解决方式是调整父级层叠上下文、把弹层挂到更高层的 portal 容器，或统一设计 z-index token。

## 关键点

1. `z-index` 不是全局比较，而是在层叠上下文内比较。
2. `opacity: 0.99`、`transform: translateZ(0)`、`will-change` 等可能无意中创建新上下文。
3. 调试弹层遮挡问题时，先找最近的 stacking context，而不是只加大子元素 `z-index`。

<!-- id: css-012; difficulty: 2; tags: animation, transition, CSS动画, keyframes; source: 高频 -->
# CSS 动画和过渡的区别？如何使用 animation 和 transition？

## transition

`transition` 描述属性从一个状态变化到另一个状态的过渡过程，需要状态变化触发，例如 `:hover`、class 切换、JS 修改样式。

```css
.button {
  background-color: blue;
  transform: scale(1);
  transition:
    background-color 0.3s ease,
    transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.button:hover {
  background-color: darkblue;
  transform: scale(1.05);
}
```

常用属性：

```css
transition-property: opacity, transform;
transition-duration: 300ms;
transition-timing-function: ease | linear | ease-in | ease-out | ease-in-out;
transition-delay: 100ms;
```

## animation

`animation` 基于 `@keyframes`，可自动播放、多关键帧、循环、反向、暂停。

```css
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.card {
  animation: fade-in-up 0.5s ease 0s 1 normal forwards;
}

.spinner {
  animation: spin 1s linear infinite;
}
```

常用属性：

```css
animation-name: fade-in-up;
animation-duration: 500ms;
animation-timing-function: ease;
animation-delay: 0s;
animation-iteration-count: 1 | infinite;
animation-direction: normal | reverse | alternate;
animation-fill-mode: none | forwards | backwards | both;
animation-play-state: running | paused;
```

## 区别

```text
transition：依赖状态变化触发，通常是两态变化，适合 hover、展开收起、主题切换
animation：由 keyframes 驱动，可自动播放和循环，适合 loading、入场动画、复杂多阶段动画
```

## 性能和无障碍

```css
/* 优先动画 transform 和 opacity，减少 layout/paint 成本 */
.panel {
  transition: transform 200ms ease, opacity 200ms ease;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 关键点

1. 避免频繁动画 `width`、`height`、`top`、`left` 这类容易触发布局的属性。
2. 不要滥用 `will-change`，只在动画前短时间使用。
3. JS 可监听 `transitionend`、`animationstart`、`animationend`、`animationiteration`。

<!-- id: css-013; difficulty: 2; tags: CSS Modules, 局部作用域, React; source: 高频 -->
# 什么是 CSS Modules？与普通 CSS 的区别？

## CSS Modules

### 概念
CSS Modules 通过局部作用域避免 CSS 类名全局污染，构建时将类名转换为唯一哈希值。

### 基本用法
```css
/* Button.module.css */
.button { background: blue; color: white; padding: 8px 16px; }
.button:hover { background: darkblue; }
.primary { background: #007bff; }
```

```jsx
import styles from './Button.module.css';

function Button({ children, variant }) {
  return (
    <button className={`${styles.button} ${variant === 'primary' ? styles.primary : ''}`}>
      {children}
    </button>
  );
}
// 编译后：<button class="Button_button_abc123 Button_primary_def456">
```

### 全局样式
```css
:global(.global-class) { color: red; }  /* 全局 */
:local(.local-class) { color: blue; }   /* 局部（默认）*/
```

### composes（样式组合）
```css
.base { padding: 8px 16px; border-radius: 4px; }
.primary {
  composes: base;  /* 继承 base */
  background: blue;
}
/* 从其他模块 */
.special { composes: base from './common.module.css'; }
```

### 对比
```
普通 CSS：全局作用域，大项目易类名冲突
CSS Modules：局部作用域，可放心使用简单类名，构建时哈希化
CSS-in-JS：运行时，支持动态样式，但有性能开销
```

<!-- id: css-014; difficulty: 2; tags: SCSS, Sass, CSS预处理器, Mixin; source: 高频 -->
# 什么是 SCSS/Sass？有哪些核心特性？

## SCSS/Sass 是什么

Sass 是 CSS 预处理器，SCSS 是 Sass 的一种语法，兼容 CSS 写法。它在构建阶段编译成普通 CSS，提供变量、嵌套、mixin、函数、循环和模块化能力。

## 变量

```scss
$primary: #007bff;
$spacing: 16px;

.button {
  background: $primary;
  padding: $spacing;
}
```

## 嵌套和父选择器

```scss
.nav {
  background: #333;

  ul { list-style: none; }

  li a {
    color: white;

    &:hover { color: #ccc; }
    &.active { font-weight: bold; }
  }

  &--dark { background: #000; }
}
```

注意不要嵌套太深，否则生成的选择器复杂、优先级高、难维护。

## Mixin

```scss
@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

@mixin respond-to($bp) {
  @if $bp == md {
    @media (min-width: 768px) { @content; }
  } @else if $bp == lg {
    @media (min-width: 1024px) { @content; }
  }
}

.container {
  @include flex-center;
  @include respond-to(md) { padding: 24px; }
}
```

## Extend

```scss
%card-base {
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
}

.user-card { @extend %card-base; background: white; }
.product-card { @extend %card-base; background: #f5f5f5; }
```

`@extend` 会合并选择器，复杂项目里可能生成难预测的 CSS；很多团队更偏向 mixin 或工具类。

## 函数、循环和模块

```scss
@use 'sass:math';

@function rem($px) {
  @return math.div($px, 16) * 1rem;
}

.title { font-size: rem(24); }

@for $i from 1 through 4 {
  .col-#{$i} { width: 25% * $i; }
}
```

现代 Sass 推荐 `@use` / `@forward` 做模块化，避免旧的 `@import` 带来的全局污染和重复加载。

## 与 CSS 变量区别

```text
SCSS 变量：编译期，不能运行时改变
CSS 变量：运行时，参与继承和层叠，可被 JS、媒体查询、主题状态改变
```

## 关键点

1. Sass 提升 CSS 组织能力，但最终产物仍是 CSS。
2. 变量、mixin、函数适合设计 token 和复用逻辑。
3. 过度嵌套、滥用 `@extend`、全局 `@import` 是常见维护问题。

<!-- id: css-015; difficulty: 2; tags: CSS形状, border技巧, clip-path; source: 高频 -->
# 如何用 CSS 实现三角形等常见图形？

## 三角形：border 技巧

```css
.triangle-up {
  width: 0;
  height: 0;
  border-left: 20px solid transparent;
  border-right: 20px solid transparent;
  border-bottom: 40px solid red;
}

.triangle-right {
  width: 0;
  height: 0;
  border-top: 20px solid transparent;
  border-bottom: 20px solid transparent;
  border-left: 40px solid red;
}

.bubble {
  position: relative;
}

.bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 20px;
  border: 8px solid transparent;
  border-top-color: #007bff;
}
```

## 圆形和椭圆

```css
.circle {
  width: 100px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: blue;
}

.ellipse {
  width: 200px;
  height: 100px;
  border-radius: 50%;
  background: red;
}
```

## clip-path 多边形

```css
.shape {
  width: 120px;
  aspect-ratio: 1;
  background: #4f46e5;
}

.diamond {
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
}

.hexagon {
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
}

.arrow {
  clip-path: polygon(0 0, 60% 0, 100% 50%, 60% 100%, 0 100%, 40% 50%);
}
```

## 圆环和进度环

```css
.ring {
  width: 100px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: conic-gradient(#2563eb 75%, #e5e7eb 0);
  mask: radial-gradient(circle, transparent 55%, black 56%);
}
```

## 加载 spinner

```css
.spinner {
  width: 48px;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 6px solid #e5e7eb;
  border-top-color: #2563eb;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

## 关键点

1. border 三角形的本质是元素宽高为 0，只显示某一侧 border。
2. `clip-path` 适合多边形，但复杂图形和可交互图形更适合 SVG。
3. 装饰性图形最好用伪元素，避免污染 DOM 语义。
4. 动画图形要考虑 `prefers-reduced-motion`。

<!-- id: css-016; difficulty: 2; tags: contain, content-visibility, 性能, CSS; source: 高频 -->
# 什么是 CSS 的 contain 属性？有什么作用？

## contain 是什么

`contain` 告诉浏览器某个元素及其子树和页面其他部分相对独立。浏览器可以据此减少样式、布局、绘制的影响范围，从而优化大型页面、虚拟列表和复杂组件的性能。

## 常见值

```css
.el {
  contain: none;    /* 默认，不隔离 */
  contain: size;    /* 元素尺寸不依赖子元素 */
  contain: layout;  /* 内部布局不影响外部 */
  contain: paint;   /* 子元素不绘制到边界外 */
  contain: style;   /* 某些样式影响不外泄，如计数器 */
  contain: content; /* layout paint style */
  contain: strict;  /* size layout paint style */
}
```

## 应用场景

```css
/* 虚拟列表固定高度项 */
.list-item {
  height: 50px;
  contain: layout paint;
}

/* 第三方 widget 或独立卡片 */
.widget {
  contain: content;
}

/* 视口外内容跳过渲染 */
.section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px;
}
```

## content-visibility

`content-visibility: auto` 允许浏览器跳过视口外内容的布局和绘制，适合长列表、长文档和首屏以下的大块内容。

```css
.long-section {
  content-visibility: auto;
  contain-intrinsic-size: auto 600px;
}
```

`contain-intrinsic-size` 用来给未渲染内容提供预估占位，减少滚动时布局跳动。

## 注意点

1. `contain: size` 会让元素尺寸不依赖子元素，如果没有明确尺寸，可能出现高度塌陷或尺寸不符合预期。
2. `contain: paint` 会限制绘制范围，阴影、弹层、绝对定位子元素可能被裁剪。
3. `contain` 可能创建新的 containing block 或 stacking context，影响定位和层级。
4. 不要全局乱加 `contain: strict`；应只给边界清晰、尺寸可控的组件使用。

<!-- id: css-017; difficulty: 2; tags: 重排, 重绘, 性能优化, CSS; source: 高频 -->
# CSS 属性变化如何触发 Layout、Paint 和 Composite？如何减少重排重绘？

## 渲染阶段

浏览器渲染通常可以粗略拆成：Style、Layout、Paint、Composite。不同 CSS 属性变化触发的成本不同。

## Layout / Reflow

几何信息变化会触发布局计算，影响元素位置或尺寸，成本通常最高。

```js
el.style.width = '200px';
el.style.margin = '10px';
el.style.display = 'none';
el.style.fontSize = '18px';
```

读取某些布局信息也可能强制浏览器把之前的写操作立即计算出来，形成 forced synchronous layout：

```js
const width = el.offsetWidth;
const rect = el.getBoundingClientRect();
const style = getComputedStyle(el).width;
```

## Paint

外观变化但不影响布局时会重绘。

```js
el.style.color = 'red';
el.style.backgroundColor = '#f00';
el.style.visibility = 'hidden';
el.style.boxShadow = '0 4px 20px rgb(0 0 0 / 20%)';
```

## Composite

如果元素在合成层上，`transform`、`opacity` 等变化通常可以只走合成，不重新布局和重绘。

```js
el.style.transform = 'translateX(100px)';
el.style.opacity = '0.5';
```

注意：初次创建合成层、复杂滤镜、巨大元素、阴影或混合模式仍可能产生额外 paint 和内存成本。不能把“transform 一定零成本”理解得过度绝对。

## 优化策略

```js
// 1. 批量 DOM 写入
const fragment = document.createDocumentFragment();
for (let i = 0; i < 100; i += 1) {
  fragment.appendChild(document.createElement('li'));
}
ul.appendChild(fragment);

// 2. 避免读写交替
const left = el.offsetLeft;
requestAnimationFrame(() => {
  el.style.left = `${left + 10}px`;
});
```

```css
/* 3. 动画优先用 transform / opacity */
.card {
  transition: transform 200ms ease, opacity 200ms ease;
}

/* 4. 谨慎使用 will-change，只在即将动画时使用 */
.card.is-animating {
  will-change: transform;
}

/* 5. 用 contain 限制影响范围 */
.widget {
  contain: layout paint;
}
```

## 关键点

1. 修改布局属性会触发 Layout，修改视觉属性通常触发 Paint，合成层上的 transform/opacity 通常只触发 Composite。
2. 最危险的是布局抖动：写样式、读布局、再写、再读。
3. 大量 DOM 更新要批量处理，复杂列表要虚拟化。
4. `will-change` 不是越多越好，过度使用会增加内存和合成开销。

<!-- id: css-018; difficulty: 2; tags: text-overflow, 省略号, 溢出, CSS; source: 高频 -->
# 如何实现 CSS 文字溢出省略号效果？

## 单行省略

```css
.single-line {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

如果文本在 flex/grid 子项里，常常还需要给子项设置 `min-width: 0`，否则内容可能把容器撑开，省略号不生效。

```css
.row {
  display: flex;
}
.title {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

## 多行省略

```css
.multi-line {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

`-webkit-line-clamp` 是当前最常用的多行省略写法。标准 `line-clamp` 正在推进，实际项目通常仍保留前缀写法。

```css
.clamp {
  line-clamp: 3;
  -webkit-line-clamp: 3;
}
```

## 纯 CSS 兜底

```css
.multi-line-fallback {
  position: relative;
  overflow: hidden;
  line-height: 1.5;
  max-height: calc(1.5em * 3);
}

.multi-line-fallback::after {
  content: '...';
  position: absolute;
  right: 0;
  bottom: 0;
  padding-left: 20px;
  background: linear-gradient(to right, transparent, white 50%);
}
```

兜底方案只是视觉模拟，无法精确知道文字是否真的溢出，也可能遮挡最后一行内容。

## 展示完整内容

```html
<p class="single-line" title="完整的文字内容">
  这是一段很长的文字，会被截断...
</p>
```

`title` 对键盘、触摸屏和辅助技术并不总是友好。重要内容应提供可访问的展开、tooltip、详情页或 `aria-label` 方案。

## 关键点

1. 单行省略必须同时具备不换行、隐藏溢出、`text-overflow: ellipsis`。
2. 多行省略常用 `-webkit-line-clamp`。
3. Flex/Grid 子项省略失败时，优先检查 `min-width: 0` 或 `min-height: 0`。

<!-- id: css-019; difficulty: 2; tags: 1px问题, 移动端, DPR, transform; source: 高频 -->
# 如何实现 0.5px 的细线（1px 问题）？

## 问题原因

移动端设计稿里的“1px 线”通常指 1 个物理像素。高 DPR 屏幕上，`1px` CSS 像素会对应多个物理像素，视觉上可能比设计稿更粗，所以需要实现更细的 hairline。

## 方案 1：直接使用 0.5px

```css
.hairline {
  border-bottom: 0.5px solid #ddd;
}
```

现代浏览器对亚像素渲染支持更好时，这是最简单的方案。但兼容性和具体渲染效果仍要按目标设备验证。

## 方案 2：伪元素 + transform 缩放

```css
.border-1px {
  position: relative;
}

.border-1px::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background: #ddd;
  transform: scaleY(0.5);
  transform-origin: 0 100%;
  pointer-events: none;
}
```

四边框：

```css
.border-all {
  position: relative;
}

.border-all::after {
  content: '';
  position: absolute;
  inset: 0;
  width: 200%;
  height: 200%;
  border: 1px solid #ddd;
  transform: scale(0.5);
  transform-origin: 0 0;
  pointer-events: none;
  box-sizing: border-box;
}
```

## 方案 3：DPR 媒体查询

```css
@media (min-resolution: 2dppx) {
  .border-1px::after {
    transform: scaleY(0.5);
  }
}

@media (min-resolution: 3dppx) {
  .border-1px::after {
    transform: scaleY(0.3333);
  }
}
```

## 其他方案

```css
.shadow-border {
  box-shadow: 0 0.5px 0 #ddd;
}

.background-border {
  background-image: linear-gradient(to bottom, #ddd, #ddd);
  background-size: 100% 1px;
  background-repeat: no-repeat;
  background-position: left bottom;
}
```

## 不推荐默认使用 viewport 缩放

早期移动端会通过修改 viewport scale 解决 1px 问题，但它会影响整页尺寸、rem 计算、手势缩放和第三方组件，现在通常不作为首选方案。

## 关键点

1. 最常用稳妥方案是伪元素绘制 1px，再按 DPR 缩放。
2. 四边框缩放时要把伪元素放大到 `200%` / `300%`，再 `scale` 回来。
3. 细线方案要在真实设备上验证，因为不同浏览器的亚像素渲染不同。

<!-- id: css-020; difficulty: 2; tags: 单位, rem, em, vw, 响应式; source: 高频 -->
# CSS 中 em、rem、vw、vh 等单位的区别是什么？

## px

`px` 是 CSS 像素，适合边框、阴影、图标线宽等需要稳定视觉尺寸的地方。

## em

`em` 在 `font-size` 上相对于父元素字体大小，在其他属性上通常相对于当前元素计算后的字体大小。

```css
.parent { font-size: 16px; }
.child {
  font-size: 1.5em;  /* 24px */
  padding: 1em;      /* 相对于自身 font-size，24px */
}
```

嵌套使用 `em` 可能层层放大或缩小。

## rem

`rem` 相对于根元素 `html` 的字体大小，不会因为组件嵌套而叠加。

```css
html { font-size: 16px; }
.title { font-size: 1.5rem; } /* 24px */

html { font-size: clamp(14px, 1vw, 18px); }
```

## 百分比

`%` 的参照对象取决于属性：宽度通常相对于包含块宽度，`translate: 50%` 相对于自身尺寸，`line-height: 150%` 相对于当前字体大小。

```css
.child { width: 50%; }
.icon { transform: translateX(50%); }
```

## vw / vh / vmin / vmax

```css
.hero {
  width: 100vw;
  min-height: 100dvh;
}

.title {
  font-size: clamp(24px, 4vw, 48px);
}

.square {
  width: 50vmin;
  height: 50vmin;
}
```

`vw` / `vh` 基于视口，`vmin` 取视口宽高中较小值，`vmax` 取较大值。移动端全屏高度优先考虑 `svh`、`lvh`、`dvh`：

```css
.panel { min-height: 100svh; } /* small viewport */
.sheet { min-height: 100dvh; } /* dynamic viewport */
```

## ch / lh

```css
.article {
  max-width: 70ch;
  padding-block: 1lh;
}
```

`ch` 约等于字符 `0` 的宽度，适合控制文章行长；`lh` 等于当前元素行高。

## 容器查询单位

```css
.card-list {
  container-type: inline-size;
}
.card-title {
  font-size: clamp(16px, 5cqw, 24px);
}
```

`cqw`、`cqh`、`cqi`、`cqb` 等相对于查询容器，而不是视口。

## 选择建议

```text
边框/阴影/精细线条 -> px
组件内部随字号变化的间距 -> em
全局字号/间距 token -> rem
页面全屏或视口相关布局 -> vw/vh/dvh
组件容器响应 -> container query units
流式字体 -> clamp() + vw/cqw
```

<!-- id: css-021; difficulty: 2; tags: 两栏布局, 三栏布局, 圣杯布局, 布局; source: 高频 -->
# CSS 如何实现两栏布局和三栏布局？

## 两栏布局：左固定，右自适应

### Flex

```css
.layout {
  display: flex;
}
.sidebar {
  width: 200px;
  flex: 0 0 auto;
}
.main {
  flex: 1;
  min-width: 0;
}
```

`min-width: 0` 可以防止主内容里的长文本、表格或图片把 flex 子项撑破。

### Grid

```css
.layout {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
}
```

### Float + BFC

```css
.sidebar {
  float: left;
  width: 200px;
}
.main {
  overflow: hidden;
}
```

这是老方案，依赖 BFC 避免内容与浮动元素重叠。

## 三栏布局：左右固定，中间自适应

### Flex

```css
.layout {
  display: flex;
}
.left,
.right {
  width: 200px;
  flex: 0 0 auto;
}
.main {
  flex: 1;
  min-width: 0;
}
```

### Grid

```css
.layout {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr) 200px;
}
```

Grid 更适合页面级二维布局，也方便响应式改成单栏。

```css
@media (max-width: 768px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
```

## 圣杯布局

圣杯布局是 float 时代的三栏方案，常见目标是 DOM 中主内容优先，视觉上左右栏固定、中间自适应。

```css
.container {
  padding: 0 200px;
  overflow: hidden;
}
.main {
  float: left;
  width: 100%;
}
.left {
  float: left;
  width: 200px;
  margin-left: -100%;
  position: relative;
  left: -200px;
}
.right {
  float: left;
  width: 200px;
  margin-left: -200px;
  position: relative;
  right: -200px;
}
```

## 关键点

1. 现代项目优先用 Flex 或 Grid。
2. 页面骨架和二维控制优先 Grid；单行/单列弹性分配优先 Flex。
3. 圣杯/双飞翼主要是历史兼容题，理解原理即可，不建议新项目使用。
4. 中间栏自适应时要关注 `min-width: 0`、内容溢出和移动端降级。

<!-- id: css-022; difficulty: 2; tags: display, 块级元素, 行内元素, CSS; source: 高频 -->
# CSS 中 display 有哪些常见值？各有什么特点？

## display 的作用

`display` 同时决定元素自身如何参与外部布局，以及它的子元素使用什么内部布局模型。现代 CSS 可以理解为 outer display + inner display，例如 `inline flex` 对应传统 `inline-flex`。

## 常见值

### block

```css
.box { display: block; }
```

独占一行，可设置宽高，默认宽度撑满包含块。

### inline

```css
.text { display: inline; }
```

行内排列，不独占一行。`width/height` 不生效，垂直方向 margin/padding 对布局影响有限。

### inline-block

```css
.button { display: inline-block; }
```

外部像 inline 一样参与行内排版，内部像 block 一样可设置宽高，常用于按钮、标签、图标容器。

### flex / inline-flex

```css
.container { display: flex; }
.inline-container { display: inline-flex; }
```

创建弹性布局容器，子元素成为 flex item。

### grid / inline-grid

```css
.layout { display: grid; }
.inline-layout { display: inline-grid; }
```

创建网格布局容器，适合二维布局。

### none

```css
.hidden { display: none; }
```

元素不渲染，不占空间，也通常不会进入无障碍树。对比：`visibility: hidden` 占空间但不可见；`opacity: 0` 占空间且仍可能响应事件。

### table 系列

```css
.table { display: table; }
.row { display: table-row; }
.cell { display: table-cell; }
```

模拟表格布局，历史上常用于垂直居中，现在更多由 Flex/Grid 取代。

### flow-root

```css
.container { display: flow-root; }
```

创建 BFC，常用于包含浮动、阻止 margin 折叠，副作用比 `overflow: hidden` 更少。

### contents

```css
.wrapper { display: contents; }
```

元素自身不生成盒子，子元素像直接挂在父元素下一样参与布局。可用于不破坏 Grid/Flex 布局的语义包装，但要谨慎：不同浏览器/辅助技术对它的语义和可访问性支持曾有差异，交互元素不应随意使用。

### list-item

```css
.item { display: list-item; }
```

生成列表项盒子和 marker，可配合 `::marker` 定制标记样式。

## 关键点

1. `display: none` 会让元素完全不参与布局。
2. `inline-block` 常用来让行内元素获得宽高能力。
3. Flex 是一维布局，Grid 是二维布局。
4. `display: flow-root` 是现代清浮动和创建 BFC 的推荐方式。
5. `display: contents` 只移除盒子，不等于移除 DOM 节点。

<!-- id: css-023; difficulty: 2; tags: Grid, Flexbox, 布局, 对比; source: 高频 -->
# CSS Grid 和 Flexbox 各自的适用场景是什么？

## Grid vs Flexbox

### 核心区别
```
Flexbox：一维布局（一行或一列）
Grid：   二维布局（同时控制行和列）
```

### Flexbox 适用场景
```css
/* 1. 导航栏 */
.nav { display: flex; justify-content: space-between; align-items: center; }

/* 2. 卡片内部布局（垂直方向排列）*/
.card { display: flex; flex-direction: column; }
.card-body { flex: 1; }  /* 撑满剩余空间 */

/* 3. 工具栏（一行按钮）*/
.toolbar { display: flex; gap: 8px; }

/* 4. 居中对齐 */
.center { display: flex; justify-content: center; align-items: center; }
```

### Grid 适用场景
```css
/* 1. 整体页面布局 */
.page {
  display: grid;
  grid-template-areas: "header" "main" "footer";
  grid-template-rows: 60px 1fr 40px;
  min-height: 100vh;
}

/* 2. 卡片网格（大小一致）*/
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

/* 3. 复杂仪表盘（跨行跨列）*/
.dashboard {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}
.widget-large { grid-column: span 2; grid-row: span 2; }
```

### 可以混用
```css
/* Grid 做外层布局，Flexbox 做组件内部 */
.page { display: grid; }
.card { display: flex; flex-direction: column; }
```

<!-- id: css-024; difficulty: 2; tags: Houdini, CSS扩展, Paint API, 高级CSS; source: 字节跳动 -->
# 什么是 CSS Houdini？它能做什么？

## CSS Houdini 是什么

CSS Houdini 是一组底层 CSS API，目标是把浏览器渲染管线中的部分能力开放给开发者，让 JS 可以更早、更结构化地参与样式解析、属性类型、绘制、布局和动画，而不是只能在 DOM/CSSOM 之后做 hack。

## 主要能力

### 1. Properties and Values API

给自定义属性注册类型、初始值和继承行为。注册后，自定义属性可以被浏览器按类型解析，并更可靠地参与动画。

```js
CSS.registerProperty({
  name: '--progress',
  syntax: '<percentage>',
  inherits: false,
  initialValue: '0%',
});
```

```css
.bar {
  --progress: 20%;
  width: var(--progress);
  transition: --progress 300ms ease;
}

.bar.active {
  --progress: 80%;
}
```

### 2. Paint API

通过 paint worklet 自定义绘制图案，再在 CSS 中用 `paint(name)` 引用。

```js
// painter.js
registerPaint('dots', class {
  static get inputProperties() {
    return ['--dot-color'];
  }

  paint(ctx, size, properties) {
    ctx.fillStyle = properties.get('--dot-color').toString() || '#000';
    for (let x = 4; x < size.width; x += 12) {
      for (let y = 4; y < size.height; y += 12) {
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
});
```

```js
if ('paintWorklet' in CSS) {
  CSS.paintWorklet.addModule('/painter.js');
}
```

```css
.card {
  --dot-color: #94a3b8;
  background-image: paint(dots);
}
```

### 3. Typed OM

Typed OM 用结构化对象读写 CSS 值，减少字符串拼接和解析。

```js
el.attributeStyleMap.set('opacity', CSS.number(0.8));
el.attributeStyleMap.set('width', CSS.px(320));
```

### 4. Layout / Animation Worklet

这些能力用于自定义布局或更靠近渲染管线的动画，但支持度和标准成熟度差异较大，实际项目要谨慎评估。

## 能做什么

1. 定义可动画的自定义属性。
2. 用 paint worklet 生成背景纹理、装饰图案、骨架屏、复杂边框等。
3. 用 Typed OM 更可靠地操作 CSS 数值。
4. 在浏览器支持的范围内减少主线程 JS 和 CSS hack。

## 生产注意

1. Houdini 各 API 支持度不一致，使用前必须做 feature detection 和降级。
2. Worklet 环境受限，不能直接访问 DOM，适合纯计算和绘制。
3. 不要为了炫技使用 Houdini；简单图形优先 CSS/SVG，复杂可交互图形优先 Canvas/SVG。
4. 浏览器支持信息变化较快，应以当前目标浏览器和官方兼容表为准。

<!-- id: css-025; difficulty: 2; tags: 滚动, scroll-snap, overscroll-behavior, CSS; source: 高频 -->
# CSS 滚动行为有哪些优化手段？

## 平滑滚动

```css
html {
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}
```

```js
element.scrollIntoView({ behavior: 'smooth', block: 'start' });
```

平滑滚动要尊重 `prefers-reduced-motion`，否则可能影响眩晕敏感用户。

## 滚动边界控制

```css
.modal {
  overscroll-behavior: contain;
}

body {
  overscroll-behavior-y: none;
}
```

`overscroll-behavior` 可以阻止滚动链，避免内部容器滚到底后带动外层页面滚动，也可用于控制移动端下拉刷新行为。

## Scroll Snap

```css
.carousel {
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: 16px;
}

.slide {
  scroll-snap-align: start;
  scroll-snap-stop: always;
}
```

`mandatory` 强制吸附，`proximity` 接近时吸附。适合轮播、分页卡片、横向列表。

## 锚点偏移

固定头部页面跳转锚点时，可以用 `scroll-padding` 或 `scroll-margin` 避免内容被遮挡。

```css
html {
  scroll-padding-top: 72px;
}

.section-title {
  scroll-margin-top: 72px;
}
```

## 滚动条和布局稳定

```css
.panel {
  scrollbar-width: thin;
  scrollbar-color: #ccc transparent;
  scrollbar-gutter: stable;
}

.panel::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.panel::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}

.no-scrollbar {
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
```

`scrollbar-gutter: stable` 可以预留滚动条空间，减少滚动条出现/消失导致的布局抖动。

## 其他优化

```css
.long-section {
  content-visibility: auto;
  contain-intrinsic-size: auto 600px;
}

.chat-list {
  overflow-anchor: none;
}
```

`content-visibility` 可减少视口外内容渲染成本。`overflow-anchor` 控制滚动锚定，适合聊天、日志流等需要自行管理滚动位置的场景。

## 关键点

1. CSS 负责滚动体验和布局稳定，JS 滚动监听应使用 passive listener 并节流。
2. 隐藏滚动条不等于禁用滚动，要保留键盘和触摸可达性。
3. 滚动吸附、平滑滚动和动画都要考虑可访问性和用户偏好。

<!-- id: css-026; difficulty: 2; tags: will-change, 合成层, GPU加速, 性能; source: 高频 -->
# 什么是 will-change？使用时需要注意什么？

## will-change 是什么

`will-change` 用来提前告诉浏览器某个元素的某些属性即将变化，让浏览器有机会提前做优化，例如准备合成层或缓存绘制结果，从而降低动画开始时的卡顿。

## 用法

```css
.animated {
  will-change: transform;
}

.fade {
  will-change: opacity;
}

.complex {
  will-change: transform, opacity;
}
```

常见适用属性是 `transform`、`opacity`、`scroll-position`、`contents`。不要写 `will-change: all`。

## 正确使用方式

`will-change` 应在变化发生前短时间添加，变化结束后移除。

```css
.card {
  transition: transform 300ms ease;
}

.card.is-active {
  transform: translateY(-8px);
}
```

```js
const card = document.querySelector('.card');

card.addEventListener('mouseenter', () => {
  card.style.willChange = 'transform';
  requestAnimationFrame(() => {
    card.classList.add('is-active');
  });
});

card.addEventListener('mouseleave', () => {
  card.classList.remove('is-active');
});

card.addEventListener('transitionend', () => {
  card.style.willChange = 'auto';
});
```

## 注意事项

1. 不要长期给大量元素设置 `will-change`，会增加内存和合成成本。
2. 不要在静态元素上永久设置。
3. 合成层过多可能导致内存压力、纹理上传成本和性能下降。
4. `will-change` 不是性能问题的万能解，使用前后应通过 DevTools Performance/Layers 验证。
5. 过去常用 `transform: translateZ(0)` 强行提升层级，但副作用更隐晦，现代写法优先用 `will-change` 且按需移除。

## 关键点

`will-change` 是浏览器优化提示，不是强制保证。它能改善合适场景的动画启动体验，但滥用会适得其反。

<!-- id: css-027; difficulty: 2; tags: 暗色模式, Dark Mode, CSS变量, 媒体查询; source: 高频 -->
# CSS 如何实现暗色模式（Dark Mode）？

## CSS 变量 + 系统偏好

```css
:root {
  color-scheme: light;
  --bg: #ffffff;
  --text: #1f2937;
  --border: #e5e7eb;
}

@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --bg: #111827;
    --text: #f9fafb;
    --border: #374151;
  }
}

body {
  background: var(--bg);
  color: var(--text);
}
```

`color-scheme` 告诉浏览器页面支持亮/暗主题，浏览器可以相应调整表单控件、滚动条、内置 UI 等。

## 手动切换

```css
:root[data-theme="light"] {
  color-scheme: light;
  --bg: #ffffff;
  --text: #1f2937;
  --border: #e5e7eb;
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --bg: #111827;
  --text: #f9fafb;
  --border: #374151;
}
```

```js
const root = document.documentElement;
const media = window.matchMedia('(prefers-color-scheme: dark)');

function getSystemTheme() {
  return media.matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  root.dataset.theme = theme;
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  applyTheme(savedTheme || getSystemTheme());
}

function toggleTheme() {
  const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', nextTheme);
  applyTheme(nextTheme);
}

media.addEventListener('change', () => {
  if (!localStorage.getItem('theme')) {
    applyTheme(getSystemTheme());
  }
});

initTheme();
```

## 图片和资源适配

不要对所有图片统一 `filter: invert()`，这会破坏照片、图表和品牌图。更好的方式是为图标、logo 或插图提供主题版本。

```html
<picture>
  <source srcset="logo-dark.svg" media="(prefers-color-scheme: dark)">
  <img src="logo-light.svg" alt="Logo">
</picture>
```

```css
.logo-monochrome {
  filter: var(--logo-filter, none);
}

:root[data-theme="dark"] {
  --logo-filter: invert(1);
}
```

## 关键点

1. 用 CSS 变量管理颜色 token，避免散落硬编码颜色。
2. 用户手动选择应优先于系统偏好，并持久化到 localStorage 或后端。
3. 初始化主题要尽量早，避免页面先亮后暗的闪烁。
4. 暗色模式不只是反色，还要重新检查对比度、阴影、边框、图表和状态色。

<!-- id: css-028; difficulty: 2; tags: overflow, 滚动, BFC, CSS; source: 高频 -->
# CSS 中 overflow 属性的值和使用场景？

## 常见值

```css
.el {
  overflow: visible; /* 默认，溢出内容可见 */
  overflow: hidden;  /* 裁剪溢出内容，不提供滚动条 */
  overflow: scroll;  /* 始终显示滚动条 */
  overflow: auto;    /* 溢出时才出现滚动条 */
  overflow: clip;    /* 裁剪溢出内容，不创建滚动容器 */

  overflow-x: hidden;
  overflow-y: auto;
}
```

`overflow: hidden/auto/scroll` 会创建新的 BFC；`overflow: clip` 只裁剪，不创建滚动容器，也不一定创建 BFC。如果需要裁剪并创建 BFC，可配合 `display: flow-root`。

```css
.clipped-flow-root {
  overflow: clip;
  display: flow-root;
}
```

## 使用场景

```css
/* 1. 现代清浮动更推荐 flow-root，而不是 hidden */
.clearfix { display: flow-root; }

/* 2. 固定高度滚动区域 */
.sidebar {
  max-height: 100dvh;
  overflow-y: auto;
}

/* 3. 卡片内图片裁剪 */
.card {
  border-radius: 8px;
  overflow: hidden;
}

/* 4. 单行文字省略 */
.title {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 5. 横向滚动代码块 */
.code-block {
  overflow-x: auto;
  white-space: pre;
}
```

## 滚动体验

```css
.scroll-container {
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  -webkit-overflow-scrolling: touch; /* iOS 旧版本惯性滚动 */
}
```

```css
.clip-with-margin {
  overflow: clip;
  overflow-clip-margin: 8px;
}
```

`overflow-clip-margin` 可以扩大 clip 裁剪边界，避免阴影等内容被裁得太硬。

## 关键点

1. `hidden` 会裁剪内容，也会阻止用户滚动到被裁剪内容。
2. `auto` 更适合滚动容器，`scroll` 会一直显示滚动条，可能影响布局。
3. `overflow` 会影响 sticky、BFC、滚动容器、绝对定位裁剪和阴影可见性。
4. 为了清浮动使用 `overflow: hidden` 可能误裁内容；现代写法优先 `display: flow-root`。

<!-- id: css-029; difficulty: 3; tags: 逻辑属性, RTL, 国际化, CSS; source: 高频 -->
# 什么是 CSS 逻辑属性？为什么要使用它？

## CSS 逻辑属性是什么

传统 CSS 属性使用物理方向，例如 `top/right/bottom/left`。逻辑属性使用内容流方向，例如 `block-start`、`block-end`、`inline-start`、`inline-end`，能更好适配 RTL 语言和竖排书写模式。

## 方向概念

```text
block 方向：块级内容排列方向，通常是垂直方向
inline 方向：文本行内方向，LTR 中从左到右，RTL 中从右到左
```

## 常见对应关系

```text
margin-top        -> margin-block-start
margin-bottom     -> margin-block-end
margin-left       -> margin-inline-start（LTR 中是 left，RTL 中是 right）
margin-right      -> margin-inline-end

padding-top       -> padding-block-start
padding-left      -> padding-inline-start

border-top        -> border-block-start
border-left       -> border-inline-start

width             -> inline-size
height            -> block-size
min-width         -> min-inline-size
max-height        -> max-block-size

top               -> inset-block-start
left              -> inset-inline-start
```

## 简写

```css
.card {
  margin-block: 16px;
  margin-inline: auto;
  padding-block: 12px;
  padding-inline: 16px;
  border-block-end: 1px solid #ddd;
  inline-size: min(100%, 720px);
}

.popover {
  position: absolute;
  inset-block-start: 100%;
  inset-inline-start: 0;
}
```

`inset: 0` 仍然是物理四边简写；`inset-inline`、`inset-block` 才是按逻辑方向设置。

## RTL 示例

```css
.button {
  padding-inline-start: 40px;
  padding-inline-end: 16px;
  text-align: start;
}

.icon {
  margin-inline-end: 8px;
}
```

在 LTR 中，`inline-start` 是左侧；在 RTL 中，`inline-start` 是右侧。这样按钮内边距、图标间距、文本对齐可以自动镜像。

## 为什么使用

1. 更适合国际化，减少 `[dir="rtl"]` 覆盖样式。
2. 更适合组件库，组件不需要假设文本方向。
3. 更容易支持竖排书写模式和不同 writing-mode。
4. 表达语义更清楚：`inline-size` 表示文本行方向尺寸，而不是固定的物理宽度。

## 注意点

背景图位置、复杂 transform、图标方向等不一定会自动逻辑化，可能仍需要针对 RTL 单独处理或使用镜像资源。

<!-- id: css-030; difficulty: 2; tags: Grid, auto-fill, auto-fit, 响应式; source: 高频 -->
# CSS Grid 的 auto-fill 和 auto-fit 有什么区别？

## auto-fill vs auto-fit

### 共同点
都用于 `repeat()` 中，让列数自适应容器宽度。

### 区别
```css
/* auto-fill：填充尽可能多的列，即使空列也保留空间 */
.grid-fill {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

/* auto-fit：填充列后，空列折叠为 0，已有项目拉伸填满 */
.grid-fit {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
```

### 视觉对比
```
容器宽度 800px，minmax(200px, 1fr)：

auto-fill：可放 4 列，3 个项目 → 3 列有内容 + 1 列空的（保留空间）
  |  200px  |  200px  |  200px  |  200px  |
  | item1   | item2   | item3   |         |

auto-fit：3 个项目各自拉伸填满容器
  |     267px    |     267px    |     267px    |
  |    item1     |    item2     |    item3     |
```

### 何时使用
```
auto-fit：  项目少时充满容器，做画廊/卡片布局（常用）
auto-fill： 需要保留网格对齐位置时使用（如拖拽排序）

// 实际开发中 auto-fit 更常用
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}
```

<!-- id: css-031; difficulty: 2; tags: loading, spinner, CSS动画, 骨架屏; source: 高频 -->
# 如何用纯 CSS 实现一个加载动画（Spinner）？

## 旋转圆环

```html
<div class="spinner" role="status" aria-label="加载中"></div>
```

```css
.spinner {
  width: 40px;
  aspect-ratio: 1;
  border: 4px solid #e5e7eb;
  border-top-color: #3498db;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

## 双弧 spinner

```css
.md-spinner {
  width: 40px;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 4px solid transparent;
  border-top-color: #3498db;
  border-right-color: #3498db;
  animation: spin 0.8s linear infinite;
}
```

## 三点脉冲

```css
.dots {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.dot {
  width: 10px;
  aspect-ratio: 1;
  background: #3498db;
  border-radius: 50%;
  animation: pulse 1.4s ease-in-out infinite;
}

.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes pulse {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}
```

## 骨架屏闪光

```css
.skeleton {
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}
```

## 减少动画

```css
@media (prefers-reduced-motion: reduce) {
  .spinner,
  .md-spinner,
  .dot,
  .skeleton {
    animation: none;
  }
}
```

## 关键点

1. spinner 动画优先使用 `transform` 和 `opacity`，性能更稳。
2. 加载状态应给辅助技术可读提示，例如 `role="status"` 或 `aria-live` 文案。
3. 长时间 loading 最好提供具体状态、重试或取消入口，而不是无限转圈。

<!-- id: css-032; difficulty: 2; tags: margin折叠, margin, BFC, CSS; source: 高频 -->
# CSS 中 margin 折叠（Margin Collapse）是什么？什么情况下发生？

## Margin 折叠是什么

在普通块级格式化上下文中，相邻的垂直 margin 可能合并成一个 margin，而不是简单相加。它主要发生在 block 方向，水平 margin 不折叠。

## 发生场景

### 1. 相邻兄弟元素

```css
.a { margin-bottom: 20px; }
.b { margin-top: 30px; }
```

两者实际间距是 `30px`，不是 `50px`。

### 2. 父子元素

```css
.parent { margin-top: 20px; }
.child { margin-top: 30px; }
```

如果父元素没有 border、padding、inline content、高度约束或 BFC 隔离，子元素的 `margin-top` 可能和父元素的 `margin-top` 折叠，看起来像子元素 margin 穿透父元素。

### 3. 空块元素

```css
.empty {
  margin-top: 10px;
  margin-bottom: 20px;
}
```

空块自身的上下 margin 可能折叠。

## 折叠结果如何计算

```text
都是正 margin：取较大值
都是负 margin：取绝对值更大的负值
正负混合：最大正值 + 最小负值
```

例如 `margin-bottom: 30px` 和 `margin-top: -10px` 折叠后结果是 `20px`。

## 阻止折叠

```css
/* 1. 创建 BFC */
.parent { display: flow-root; }

/* 2. 添加 border 或 padding 隔开 */
.parent { padding-top: 1px; }
.parent { border-top: 1px solid transparent; }

/* 3. 使用 flex/grid 布局 */
.parent { display: flex; flex-direction: column; }
.parent { display: grid; }

/* 4. 让元素脱离普通流 */
.child { position: absolute; }
```

## 注意点

1. float、absolute/fixed 元素不参与 margin 折叠。
2. Flex/Grid 容器内的子项不会发生 margin 折叠。
3. BFC 可以阻止父子 margin 折叠，也能包含浮动。
4. 现代布局中如果不想处理折叠，优先用 `gap` 管理列表间距。

<!-- id: css-033; difficulty: 2; tags: line-height, vertical-align, 排版, CSS; source: 高频 -->
# CSS 如何处理文字排版？line-height 和 vertical-align 的原理是什么？

## line-height

`line-height` 定义行盒的高度。对多行文本来说，它决定行与行之间的节奏；对单行文本来说，也常被用来做垂直居中。

```css
body {
  line-height: 1.6; /* 推荐：无单位 */
}

p {
  line-height: 24px;
  line-height: 1.5em;
  line-height: 150%;
}

.single-line {
  height: 50px;
  line-height: 50px;
}
```

推荐使用无单位 `line-height`，因为它继承的是比例，子元素会按自己的 `font-size` 计算行高；`px`、`em`、`%` 更容易在嵌套时得到不符合预期的继承值。

## 行盒模型

```text
inline 元素参与 inline formatting context
文本按 baseline 对齐
line-height 会在字体内容区上下分配半行距
一行中最高/最低的 inline box 共同决定 line box 高度
```

所以行高不只是“字体高度”，还包含字体度量和半行距。

## vertical-align

`vertical-align` 控制 inline、inline-block、inline-table 或 table-cell 的垂直对齐。它对普通 block 元素无效。

```css
.icon { vertical-align: middle; }
.text { vertical-align: baseline; }
.sub { vertical-align: sub; }
.super { vertical-align: super; }
.shift-up { vertical-align: 4px; }
.shift-down { vertical-align: -4px; }
```

常见值：

```text
baseline：默认，基线对齐
middle：元素中线与父元素基线加 x-height 一半对齐，不是严格几何居中
top / bottom：与 line box 顶部/底部对齐
text-top / text-bottom：与父元素字体内容区顶部/底部对齐
sub / super：下标/上标
```

## 图片底部间隙

`img` 默认是 inline-level 元素，按 baseline 对齐，底部会留出给字母下伸部的空间。

```css
img { display: block; }
/* 或 */
img { vertical-align: bottom; }
```

## 关键点

1. 多行文本排版优先设置合理的 `line-height`。
2. 单行文本可用 `height === line-height` 做垂直居中，但多行不适用。
3. `vertical-align` 不用于 flex/grid/block 的整体垂直居中；这些场景用 `align-items`、`place-items` 等。

<!-- id: css-034; difficulty: 3; tags: 瀑布流, columns, Grid, 布局; source: 高频 -->
# CSS 如何实现瀑布流布局？

## 方案 1：CSS Columns

最简单，适合内容展示型瀑布流。

```css
.masonry {
  columns: 300px;
  column-gap: 16px;
}

.card {
  display: inline-block;
  width: 100%;
  margin-block-end: 16px;
  break-inside: avoid;
}
```

优点是 CSS 简单、自适应自然；缺点是视觉顺序按列从上到下排列，不是按行从左到右，键盘/读屏顺序也可能和视觉顺序不一致。

## 方案 2：Grid masonry

CSS Grid masonry 能表达真正的瀑布流，但它仍属于需要关注浏览器支持状态的能力，生产使用前必须按目标浏览器验证和降级。

```css
.masonry {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  grid-template-rows: masonry;
  gap: 16px;
}
```

## 方案 3：JS 计算布局

JS 方案最灵活，可以按“当前最短列”放置卡片，适合图片墙、无限滚动和需要行列顺序控制的场景。

```js
function createMasonry(container, options = {}) {
  const { minColumnWidth = 240, gap = 16 } = options;

  function layout() {
    const containerWidth = container.clientWidth;
    const columnCount = Math.max(1, Math.floor((containerWidth + gap) / (minColumnWidth + gap)));
    const columnWidth = (containerWidth - gap * (columnCount - 1)) / columnCount;
    const columnHeights = Array(columnCount).fill(0);
    const items = Array.from(container.children);

    container.style.position = 'relative';

    items.forEach((item) => {
      item.style.position = 'absolute';
      item.style.width = `${columnWidth}px`;

      const columnIndex = columnHeights.indexOf(Math.min(...columnHeights));
      const x = columnIndex * (columnWidth + gap);
      const y = columnHeights[columnIndex];

      item.style.transform = `translate(${x}px, ${y}px)`;
      columnHeights[columnIndex] += item.offsetHeight + gap;
    });

    container.style.height = `${Math.max(...columnHeights) - gap}px`;
  }

  const observer = new ResizeObserver(layout);
  observer.observe(container);
  Array.from(container.children).forEach((item) => observer.observe(item));

  layout();

  return () => observer.disconnect();
}
```

## 方案选择

1. 内容展示、顺序要求不高：优先 CSS Columns。
2. 要精确控制列高、图片加载后重排、无限滚动：使用 JS。
3. Grid masonry 可作为渐进增强，但要做兼容性验证。
4. 图片瀑布流要在图片加载完成或尺寸已知后布局，否则会跳动；可以用固定宽高、`aspect-ratio`、占位图或 ResizeObserver。

<!-- id: css-035; difficulty: 3; tags: 渲染流水线, 重排, 重绘, 合成层, 性能; source: 高频 -->
# 解释 CSS 渲染流水线（Rendering Pipeline）

## 基本流程

```text
1. 解析 HTML -> DOM Tree
2. 解析 CSS -> CSSOM Tree
3. DOM + CSSOM -> Render Tree / Layout Tree
4. Layout -> 计算盒子的尺寸和位置
5. Paint -> 生成绘制指令，例如文字、颜色、阴影、边框
6. Composite -> 合成图层并输出到屏幕
```

`display: none` 的元素不会进入布局树；`visibility: hidden` 仍占布局空间，只是不绘制可见内容。

## 属性变化对应阶段

```js
// 通常触发 Layout + Paint + Composite
el.style.width = '100px';
el.style.margin = '10px';
el.style.display = 'none';
el.style.fontSize = '18px';

// 通常触发 Paint + Composite
el.style.color = 'red';
el.style.background = 'blue';
el.style.boxShadow = '0 4px 12px rgb(0 0 0 / 20%)';

// 在合成层上通常只触发 Composite
el.style.transform = 'translateX(10px)';
el.style.opacity = '0.5';
```

“只触发 Composite”不是绝对保证：元素是否在合成层、属性组合、滤镜、阴影、混合模式和元素大小都会影响实际成本。

## 合成层

```css
.layer {
  will-change: transform;
}

.animating {
  transform: translate3d(0, 0, 0);
}
```

合成层能让某些动画不影响其他层，减少重绘范围。但图层过多会增加内存、纹理上传和合成成本。

## requestAnimationFrame

```js
let x = 0;

function animate() {
  el.style.transform = `translateX(${x}px)`;
  x += 1;
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
```

`requestAnimationFrame` 在下一次绘制前调用，适合把视觉更新和浏览器刷新节奏对齐。

## 性能建议

1. 动画优先使用 `transform` 和 `opacity`。
2. 批量读写 DOM，避免“写样式 -> 读布局 -> 写样式”的布局抖动。
3. 大列表使用虚拟滚动或分页，减少 DOM 数量。
4. 谨慎使用 `will-change`，用完移除。
5. 用 DevTools Performance/Layers 验证实际触发的是 Layout、Paint 还是 Composite。

<!-- id: css-036; difficulty: 3; tags: 响应式, Navbar, 汉堡菜单, 移动端; source: 高频 -->
# 如何用 CSS 实现一个响应式 Navbar，在移动端变为汉堡菜单？

## HTML

```html
<nav class="navbar" aria-label="主导航">
  <a class="brand" href="/">Logo</a>

  <button
    class="hamburger"
    type="button"
    aria-label="打开菜单"
    aria-controls="primary-menu"
    aria-expanded="false"
  >
    <span></span>
    <span></span>
    <span></span>
  </button>

  <ul id="primary-menu" class="nav-menu">
    <li><a href="#">首页</a></li>
    <li><a href="#">产品</a></li>
    <li><a href="#">关于</a></li>
  </ul>
</nav>
```

## CSS

```css
.navbar {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-inline: 24px;
  background: #fff;
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
}

.brand {
  color: inherit;
  text-decoration: none;
  font-weight: 700;
}

.nav-menu {
  display: flex;
  gap: 24px;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-menu a {
  color: inherit;
  text-decoration: none;
}

.hamburger {
  display: none;
  flex-direction: column;
  gap: 5px;
  padding: 8px;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.hamburger span {
  width: 24px;
  height: 2px;
  background: currentColor;
  transition: transform 200ms ease, opacity 200ms ease;
}
```

## 移动端

```css
@media (max-width: 768px) {
  .hamburger {
    display: inline-flex;
  }

  .nav-menu {
    position: fixed;
    inset-block-start: 60px;
    inset-inline: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: 16px 24px;
    background: #fff;
    box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
    transform: translateY(-120%);
    visibility: hidden;
    pointer-events: none;
    transition: transform 240ms ease, visibility 0s linear 240ms;
  }

  .nav-menu.open {
    transform: translateY(0);
    visibility: visible;
    pointer-events: auto;
    transition: transform 240ms ease;
  }

  .nav-menu a {
    display: block;
    padding-block: 12px;
  }

  .hamburger[aria-expanded="true"] span:nth-child(1) {
    transform: translateY(7px) rotate(45deg);
  }

  .hamburger[aria-expanded="true"] span:nth-child(2) {
    opacity: 0;
  }

  .hamburger[aria-expanded="true"] span:nth-child(3) {
    transform: translateY(-7px) rotate(-45deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-menu,
  .hamburger span {
    transition: none;
  }
}
```

## JS 切换状态

```js
const button = document.querySelector('.hamburger');
const menu = document.querySelector('#primary-menu');

button.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  button.setAttribute('aria-expanded', String(open));
  button.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
});
```

## 关键点

1. 纯 CSS 可以用 checkbox hack，但真实项目更推荐少量 JS 管理可访问状态。
2. 关闭状态要避免菜单链接仍可点击或被键盘聚焦。
3. `aria-expanded` 要和视觉状态同步。
4. 如果菜单作为覆盖层，还应处理 Escape 关闭、点击外部关闭和焦点管理。

<!-- id: css-037; difficulty: 3; tags: font-face, 字体, 性能优化, font-display; source: 高频 -->
# CSS 中如何处理 font-face 和自定义字体性能优化？

## @font-face 基本用法

```css
@font-face {
  font-family: 'MyFont';
  src: url('/fonts/myfont.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

body {
  font-family: 'MyFont', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

优先使用 WOFF2，体积更小、压缩更好。除非有明确兼容需求，否则不必加载太多旧格式。

## font-display

```css
font-display: auto;     /* 浏览器默认策略 */
font-display: block;    /* 短时间隐藏文本，等待字体，容易 FOIT */
font-display: swap;     /* 先显示后备字体，字体加载后替换，可能 FOUT */
font-display: fallback; /* 折中策略 */
font-display: optional; /* 更偏性能，慢网可能一直用后备字体 */
```

常见选择：正文优先 `swap` 或 `optional`，品牌标题字体可根据视觉要求选择更严格策略，但要避免长时间不可见文本。

## preload 和子集化

```html
<link
  rel="preload"
  href="/fonts/myfont-latin.woff2"
  as="font"
  type="font/woff2"
  crossorigin
>
```

```css
@font-face {
  font-family: 'MyFont';
  src: url('/fonts/myfont-latin.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
  unicode-range: U+0000-00FF;
}
```

只 preload 首屏关键字体。过度 preload 会抢占图片、CSS、JS 等关键资源。中文字体体积大，通常需要按业务做子集化、按页面拆分或使用系统字体。

## 减少字体切换导致的 CLS

后备字体和自定义字体度量不同，会导致加载后文字重新排版。可以用字体度量覆盖降低布局偏移。

```css
@font-face {
  font-family: 'MyFont Fallback Adjusted';
  src: local('Arial');
  size-adjust: 102%;
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
}

body {
  font-family: 'MyFont', 'MyFont Fallback Adjusted', sans-serif;
}
```

具体数值要基于实际字体测量，不能随便套用。

## Font Loading API

```js
document.fonts.load('16px MyFont').then(() => {
  document.documentElement.classList.add('fonts-loaded');
});
```

也可以用 `document.fonts.ready` 判断所有字体加载状态，但不要阻塞首屏正文渲染。

## 优化原则

1. 优先系统字体栈，必要时再用 Web Font。
2. 使用 WOFF2、子集化、`unicode-range`、合理缓存。
3. 只 preload 首屏必需字体。
4. 用 `font-display` 平衡 FOIT、FOUT 和品牌一致性。
5. 关注 CLS，必要时用 metric override 或更接近的 fallback 字体。

<!-- id: css-038; difficulty: 3; tags: transform, 合成层, GPU加速, 性能; source: 高频 -->
# CSS 中 transform 的性能优化原理是什么？

## transform 性能优化原理

### 核心区别
```css
/* 改 top/left 会改变布局位置：通常需要 Layout -> Paint -> Composite */
.bad { position: absolute; top: 100px; }

/* 改 transform 只改变视觉变换，不改变布局盒和文档流 */
.good { transform: translateY(100px); }
```

`top`、`left`、`width`、`margin` 等属性会影响布局几何，浏览器往往要重新计算布局并重绘。`transform` 操作的是元素绘制结果的变换矩阵；如果该元素已经在独立合成层中，动画时通常可以跳过 Layout/Paint，只做 Composite。

### 渲染流水线
```
Style -> Layout -> Paint -> Composite
```

1. Layout：计算盒子的尺寸和位置。
2. Paint：把内容栅格化成位图或纹理。
3. Composite：合成多个图层，并应用 transform、opacity 等矩阵变化。

`transform`/`opacity` 适合动画，是因为合成线程可以更新图层的变换和透明度，主线程繁忙时也更不容易卡住动画。但这不是零成本：首次样式计算、图层提升、栅格化、纹理上传仍然有开销；如果图层内容本身变化，或者效果需要重新绘制，仍可能触发 Paint。

### 合理使用合成层
```css
.card {
  transition: transform 200ms ease, opacity 200ms ease;
}

.card.is-moving {
  will-change: transform, opacity;
}

.card.done {
  will-change: auto;
}
```

`will-change` 适合在动画前短时间使用，动画结束后移除。`translateZ(0)`、`translate3d(0, 0, 0)` 这类传统 hack 可能强制创建图层，但不要全站滥用；图层过多会增加内存、纹理上传和功耗，反而变慢。

### 适合动画的属性
- `transform`：translate、scale、rotate、skew，以及现代的独立 transform 属性。
- `opacity`：通常也可以走合成。
- `filter`、`backdrop-filter`：和浏览器、具体效果有关，不能默认认为只触发合成。

### 注意事项
```css
.el {
  transform: translate(50%, 50%);      /* 百分比基于自身宽高 */
  transform-origin: center center;     /* 变换原点，默认中心 */
}

.el-a { transform: rotate(45deg) translateX(100px); }
.el-b { transform: translateX(100px) rotate(45deg); }
/* 顺序不同会得到不同矩阵和不同视觉结果 */
```

补充：`transform` 不占据额外布局空间，`offsetTop` 等布局指标不会因为视觉移动而改变；非 `none` 的 transform 会创建新的 stacking context，并可能成为绝对定位或固定定位后代的 containing block。实际优化要用 DevTools Performance、Layers、Paint flashing 验证是否真的没有 Layout/Paint。

<!-- id: css-039; difficulty: 3; tags: IFC, 行盒子, 内联布局, CSS; source: 字节跳动 -->
# 解释 CSS 中的 IFC（内联格式化上下文）

## IFC（Inline Formatting Context）

### 概念
IFC 是块容器内部布局行内级内容的格式化上下文。文本、`span`、`img`、`inline-block` 等会被排进一行行 line box 中；没有显式包裹的文本会生成匿名内联盒。

### 什么时候出现
```
块容器中的内容由行内级盒子组成时，会形成 IFC。
行内级盒子包括：inline、inline-block、inline-table、inline-flex、replaced element（如 img）、文本节点等。
```

IFC 不是一个可以通过某个 CSS 属性直接开启的布局模式，它是普通段落、文字混排、图文混排背后的排版规则。

### 核心规则
1. 行内级盒子沿 inline 方向排列，空间不足时拆成多行。
2. 每一行形成一个 line box，多个 line box 沿 block 方向堆叠。
3. float 会占据空间并缩短附近 line box 的可用宽度。
4. `text-align` 控制 line box 内行内内容的水平分布。
5. `vertical-align` 控制行内级盒子相对基线、行盒的垂直对齐。
6. 空白字符如何折叠、换行，受 `white-space` 影响。

### line box 和 baseline
```css
.paragraph {
  font-size: 16px;
  line-height: 1.5; /* 给文本行建立 24px 左右的行高 strut */
}

.icon {
  display: inline-block;
  width: 16px;
  height: 16px;
  vertical-align: middle;
}
```

line box 的高度不是简单等于父元素 `line-height`，它由本行所有行内级盒子的度量共同决定：文本的 `line-height`、字体 ascent/descent、replaced element、`inline-block` 的 margin box 都可能参与。默认按 baseline 对齐，所以图片或 inline-block 底部经常会出现空隙。

### 常见问题
```css
/* 1. 图片底部有空隙：默认按基线对齐，基线下面预留 descender 空间 */
img { display: block; }
/* 或 */
img { vertical-align: bottom; }

/* 2. 相邻 inline-block 之间有缝隙：HTML 空格和换行被当成文本空白 */
.parent { font-size: 0; }
.child { display: inline-block; font-size: 16px; }

/* 3. 单行省略依赖 IFC 的不换行和溢出裁剪 */
.ellipsis {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
```

### 面试表达
IFC 负责行内排版：把行内级盒子按行拆分成 line box，并用 baseline、`line-height`、`vertical-align`、`text-align` 等规则决定每行的水平和垂直对齐。它解释了图片底部空隙、inline-block 间隙、文字换行、图文混排等问题。

<!-- id: css-040; difficulty: 3; tags: 视差滚动, Parallax, scroll-driven, CSS动画; source: 高频 -->
# CSS 中如何实现视差滚动（Parallax）效果？

## CSS 视差滚动（Parallax）

视差滚动的本质是让背景层、内容层、装饰层以不同速度响应滚动，制造远近层次感。实现时优先使用 `transform` 和 `opacity`，避免在滚动中频繁改 `top`、`height`、`background-position` 等容易触发布局或重绘的属性。

### 方案 1：background-attachment: fixed
```css
.parallax-section {
  min-height: 420px;
  background-image: url('/bg.jpg');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}
```

优点是简单，适合静态背景。缺点是移动端和部分浏览器表现不稳定，背景重绘成本也可能较高；大型图片和长页面要谨慎使用。

### 方案 2：CSS 3D perspective
```css
.parallax-scroller {
  height: 100vh;
  overflow-x: hidden;
  overflow-y: auto;
  perspective: 1px;
  transform-style: preserve-3d;
}

.layer-back {
  transform: translateZ(-1px) scale(2);
}

.layer-front {
  transform: translateZ(0);
}
```

`translateZ(-1px)` 让远景层看起来更远，`scale(2)` 用来补偿透视导致的缩小。这个方案是 CSS-only，但对结构、层叠上下文、滚动容器要求较高，调试成本比普通布局更大。

### 方案 3：Scroll-driven Animations 渐进增强
```css
@keyframes parallax-y {
  from { transform: translateY(0); }
  to { transform: translateY(-25%); }
}

@supports (animation-timeline: scroll()) {
  .parallax-bg {
    animation: parallax-y linear both;
    animation-timeline: scroll(root block);
  }
}
```

这种方式把滚动进度交给 CSS 动画系统，语义更清晰；上线前仍要检查目标浏览器兼容性，并为不支持的浏览器保留普通静态背景或 JS 降级。

### 方案 4：JavaScript + transform
```js
const layer = document.querySelector('.parallax-bg');
let ticking = false;
let latestY = 0;

window.addEventListener(
  'scroll',
  () => {
    latestY = window.scrollY;

    if (!ticking) {
      requestAnimationFrame(() => {
        layer.style.transform = `translate3d(0, ${latestY * 0.35}px, 0)`;
        ticking = false;
      });
      ticking = true;
    }
  },
  { passive: true },
);
```

滚动事件里只记录状态，把 DOM 写入放进 `requestAnimationFrame`；监听器用 `passive: true`，避免阻塞滚动。不要在同一帧里反复读写 layout 属性，防止 forced reflow。

### 工程注意点
1. 对视差层设置合理尺寸和图片压缩，避免超大纹理。
2. 只对真正动画的层使用 `will-change: transform`，结束后移除。
3. 用 DevTools Performance 检查是否出现大量 Paint、Layout 或掉帧。
4. 尊重 `prefers-reduced-motion`，为减少动态效果的用户关闭或弱化视差。

```css
@media (prefers-reduced-motion: reduce) {
  .parallax-bg {
    animation: none;
    transform: none;
    background-attachment: scroll;
  }
}
```

<!-- id: css-041; difficulty: 3; tags: @layer, 层叠, 优先级, CSS; source: 字节跳动 -->
# 什么是 CSS @layer 层叠层？它解决了什么问题？

## CSS @layer（Cascade Layers）

### 解决的问题
大型项目里常见样式来源很多：reset、组件库、业务组件、工具类、临时覆盖。没有层叠层时，经常只能靠更长选择器或 `!important` 抢优先级。`@layer` 把样式按来源分层，让层的顺序先于 specificity 决定普通声明的胜负。

### 基本用法
```css
/* 先声明层顺序：普通声明下，越靠后的层优先级越高 */
@layer reset, base, components, utilities;

@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; }
}

@layer base {
  body { font: 16px/1.5 system-ui, sans-serif; color: #222; }
  a { color: royalblue; }
}

@layer components {
  .button { padding: 8px 16px; color: white; background: royalblue; }
}

@layer utilities {
  .text-red { color: red; }
}
```

### 普通声明的层叠顺序
```css
@layer reset, components, utilities;

@layer reset { .button { color: black; } }
@layer components { .button { color: blue; } }
@layer utilities { .button { color: red; } }

.button { color: green; } /* 未分层普通样式最高 */
```

普通 author 样式从低到高可以简化为：`reset < components < utilities < 未分层样式`。同一层内再比较选择器 specificity 和源码顺序。注意：未分层普通样式会压过所有分层普通样式，所以项目里最好约定所有全局 CSS 都进入明确的 layer。

### `!important` 的特殊规则
`!important` 会反转 layer 顺序：较早声明的层优先级更高，而且分层的 important 声明会高于未分层 important 声明。工程上不要依赖这个特性大量写 important，只需要知道它避免了第三方库 important 无法覆盖的问题。

### 导入第三方样式
```css
/* @import 必须在顶层靠前位置，不能写进 @layer {} 块里 */
@import url('/vendor/normalize.css') layer(reset);
@import url('/vendor/ui-lib.css') layer(components);

@layer reset, components, overrides;

@layer overrides {
  .ui-button { border-radius: 6px; }
}
```

### 最佳实践
1. 先集中声明层顺序，避免层的创建顺序散落在多个文件里。
2. 把 reset、第三方库放低层，把业务组件和工具类放高层。
3. 尽量不要写未分层普通样式，否则它会成为最高优先级的逃逸口。
4. `@layer` 只解决层叠管理，不替代 CSS Modules、BEM、Shadow DOM 等作用域方案。

<!-- id: css-042; difficulty: 3; tags: Design Tokens, 主题系统, CSS变量, 设计系统; source: 阿里巴巴 -->
# 如何实现 CSS 主题系统？大型项目中怎么管理设计令牌（Design Tokens）？

## CSS 主题系统与 Design Tokens

### 令牌分层
大型项目不要直接在组件里写颜色和尺寸，而是把设计值拆成三层。

```css
/* 1. Primitive tokens：原始调色板和基础尺寸，少量场景直接使用 */
:root {
  --palette-blue-500: #2563eb;
  --palette-blue-600: #1d4ed8;
  --palette-gray-50: #f8fafc;
  --palette-gray-200: #e5e7eb;
  --palette-gray-900: #111827;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --radius-2: 6px;
}

/* 2. Semantic tokens：表达用途，是业务代码主要依赖的层 */
:root {
  --color-bg: #ffffff;
  --color-surface: var(--palette-gray-50);
  --color-text: var(--palette-gray-900);
  --color-border: var(--palette-gray-200);
  --color-brand: var(--palette-blue-500);
  --color-brand-hover: var(--palette-blue-600);

  --spacing-sm: var(--space-2);
  --spacing-md: var(--space-4);
  --radius-control: var(--radius-2);
}

/* 3. Component tokens：组件内部 API，便于局部换肤 */
.button {
  --button-bg: var(--color-brand);
  --button-bg-hover: var(--color-brand-hover);
  --button-radius: var(--radius-control);
  --button-padding: var(--spacing-sm) var(--spacing-md);

  padding: var(--button-padding);
  border-radius: var(--button-radius);
  background: var(--button-bg);
}
```

### 多主题覆盖
```css
:root,
[data-theme='light'] {
  color-scheme: light;
  --color-bg: #ffffff;
  --color-surface: #f8fafc;
  --color-text: #111827;
  --color-border: #e5e7eb;
  --color-brand: #2563eb;
}

[data-theme='dark'] {
  color-scheme: dark;
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-text: #f8fafc;
  --color-border: #334155;
  --color-brand: #60a5fa;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    color-scheme: dark;
    --color-bg: #0f172a;
    --color-surface: #1e293b;
    --color-text: #f8fafc;
    --color-border: #334155;
    --color-brand: #60a5fa;
  }
}
```

### 运行时切换
```ts
const setTheme = (theme: 'light' | 'dark' | 'system') => {
  const root = document.documentElement;

  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.dataset.theme = theme;
  }

  localStorage.setItem('theme', theme);
};
```

SSR 或静态站点要在首屏 CSS 生效前注入极小的初始化脚本，提前设置 `data-theme`，避免明暗主题闪烁。

### 大型项目治理
1. 用 JSON/YAML/Figma Tokens 作为单一来源，通过 Style Dictionary 或自研脚本生成 CSS variables、TypeScript 类型、设计稿变量和移动端资源。
2. 组件只消费 semantic/component tokens，禁止硬编码品牌色、灰阶和魔法间距。
3. token 命名按用途而不是颜色外观，例如 `--color-danger-text` 优于 `--color-red-600`。
4. 对颜色 token 做对比度校验，对废弃 token 做版本迁移和 changelog。
5. 用 lint 或代码扫描限制裸色值，避免主题系统被绕过。

### 关键点
CSS 变量天然支持级联和运行时变更，适合做 Web 主题；Design Tokens 负责跨端一致性和治理。真正的大型主题系统重点不是变量语法，而是令牌分层、命名规范、构建产物和回归校验。

<!-- id: css-043; difficulty: 3; tags: Scroll-driven, CSS动画, 性能, 现代CSS; source: 高频 -->
# 什么是 CSS Scroll-driven Animations？如何使用？

## CSS Scroll-driven Animations

### 概念
Scroll-driven Animations 把 CSS 动画的时间轴从真实时间改成滚动进度：页面滚到哪里，动画就播放到哪里。它可以减少滚动监听里的 JS 计算，适合滚动进度条、元素入场、视差和阅读进度等场景。

### scroll()：绑定滚动容器进度
```css
@keyframes grow-bar {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

@supports (animation-timeline: scroll()) {
  .progress-bar {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 10;
    width: 100%;
    height: 4px;
    transform-origin: left center;
    background: royalblue;
    animation: grow-bar linear both;
    animation-timeline: scroll(root block);
  }
}
```

`scroll(root block)` 表示使用根滚动容器在 block 方向上的滚动进度。也可以绑定最近的滚动容器或命名 timeline。

### 命名 scroll timeline
```css
.scroller {
  overflow: auto;
  scroll-timeline-name: --list-scroll;
  scroll-timeline-axis: block;
}

.item-marker {
  animation: grow-bar linear both;
  animation-timeline: --list-scroll;
}
```

命名 timeline 适合组件内部滚动容器，不必依赖页面根滚动。

### view()：绑定元素可见性进度
```css
@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(32px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@supports (animation-timeline: view()) {
  .card {
    opacity: 0;
    animation: reveal linear both;
    animation-timeline: view(block);
    animation-range: entry 0% entry 100%;
  }
}
```

`view()` 使用元素和视口或滚动容器的相交过程作为时间轴。`animation-range` 用来截取动画区间，常见关键字有 `entry`、`exit`、`cover`、`contain`。

### 和 JS 方案对比
1. CSS 方案不需要在 scroll 事件中读写 DOM，表达更声明式。
2. 仍要关注动画属性，优先 `transform`、`opacity`，避免滚动中触发布局和重绘。
3. 兼容性不足时，用 `@supports` 包裹增强效果，并提供静态样式、IntersectionObserver 或 rAF 降级。
4. 对大量入场动画和视差效果，要配合 `prefers-reduced-motion` 降低动态强度。

```css
@media (prefers-reduced-motion: reduce) {
  .card,
  .progress-bar {
    animation: none;
    transform: none;
  }
}
```

<!-- id: css-044; difficulty: 3; tags: 容器查询, Container Queries, 响应式, 现代CSS; source: 高频 -->
# 什么是 CSS 容器查询（Container Queries）？

## CSS 容器查询（Container Queries）

### 解决的问题
媒体查询根据视口大小响应，适合页面级布局；但组件经常被放在侧栏、弹窗、主内容区等不同容器里，同一个视口下可用宽度不同。容器查询让组件根据祖先容器尺寸调整样式，提升组件复用性。

### 基本用法
```css
/* 1. 在组件外层或布局槽位上声明查询容器 */
.card-shell {
  container: card / inline-size;
}

/* 2. 查询名为 card 的最近祖先容器 */
@container card (min-width: 420px) {
  .card {
    display: grid;
    grid-template-columns: 160px 1fr;
    gap: 16px;
  }
}

@container card (width < 420px) {
  .card {
    display: block;
  }
}
```

`@container` 查询的是匹配条件的祖先容器，通常不能让元素根据自己的尺寸直接改自己，否则容易形成循环依赖。实践中会给组件外包一层容器，再改内部元素样式。

### container-type
```css
.panel {
  container-type: normal;      /* 默认，不作为尺寸查询容器 */
  container-type: inline-size; /* 常用：查询行向尺寸，通常就是宽度 */
  container-type: size;        /* 查询宽高，尺寸包含更强，使用更谨慎 */
}

.named-panel {
  container-name: profile-card;
  container-type: inline-size;
}

/* 简写 */
.named-panel { container: profile-card / inline-size; }
```

`inline-size` 适合绝大多数响应式组件。`size` 会引入更强的尺寸包含，元素尺寸不能简单依赖内容撑开，容易影响布局，需要明确宽高或约束。

### 容器查询单位
```css
.card-title {
  font-size: clamp(16px, 5cqi, 28px);
}

.card-media {
  width: 40cqw;   /* 查询容器宽度的 40% */
  min-height: 30cqb;
}
```

常见单位：`cqw`、`cqh`、`cqi`、`cqb`、`cqmin`、`cqmax`。多语言和不同书写模式下，优先理解 `cqi` 是 inline 方向、`cqb` 是 block 方向。

### 和媒体查询的关系
1. 媒体查询负责页面断点、导航结构、全局栅格。
2. 容器查询负责组件在不同容器宽度里的内部布局。
3. 两者可以共存，不是互相替代。
4. 对旧浏览器要提供默认样式，再用 `@supports (container-type: inline-size)` 做增强。

```css
.card { display: block; }

@supports (container-type: inline-size) {
  .card-shell { container: card / inline-size; }
}
```

<!-- id: css-045; difficulty: 1; tags: 浮动, clearfix, 清除浮动, BFC; source: 高频 -->
# 什么是浮动（float）？清除浮动的方法有哪些？

## 浮动（float）

### 概念
`float` 最初用于图文环绕：元素向左或向右浮动，块级盒子会当它不在普通流里计算高度，但行内内容会绕开它排版。

```css
.float-left { float: left; }
.float-right { float: right; }
.no-float { float: none; }
```

### 典型问题：父元素高度塌陷
```css
.parent {
  border: 1px solid #999;
}

.child {
  float: left;
  width: 100px;
  height: 100px;
}
```

如果父元素内部全是浮动元素，父元素计算普通流高度时不会把浮动子元素算进去，视觉上就像高度变成 0。

### 清除浮动的方法
```css
/* 1. clearfix：兼容性好，适合旧项目 */
.clearfix::after {
  content: '';
  display: block;
  clear: both;
}

/* 2. 直接添加清除元素：语义较差，不推荐新代码使用 */
.clear { clear: both; }

/* 3. 创建 BFC：能包含内部浮动，但 overflow 可能裁剪内容或产生滚动条 */
.parent { overflow: hidden; }
.parent { overflow: auto; }

/* 4. flow-root：现代推荐，语义就是创建新的 BFC 来包住浮动 */
.parent { display: flow-root; }
```

### clear 的含义
```css
.next {
  clear: left;  /* 左侧不允许有浮动元素 */
  clear: right; /* 右侧不允许有浮动元素 */
  clear: both;  /* 两侧都不允许有浮动元素 */
}
```

`clear` 作用在当前元素自己身上，让它移动到浮动元素下面；它不是直接修改前面的浮动元素。

### 现代用法
现代页面布局优先用 Flex/Grid。`float` 现在主要保留给图文环绕场景。

```css
.article img {
  float: left;
  margin: 0 16px 12px 0;
}
```

<!-- id: css-046; difficulty: 1; tags: 隐藏元素, display, visibility, opacity; source: 高频 -->
# CSS 中 visibility: hidden、display: none 和 opacity: 0 的区别？

## `display: none`、`visibility: hidden`、`opacity: 0`

### 核心区别
| 写法 | 是否占位 | 是否绘制可见内容 | 事件命中 | 子元素能否单独显示 | 常见用途 |
| --- | --- | --- | --- | --- | --- |
| `display: none` | 不占位 | 不生成可见盒 | 不能 | 不能 | 条件渲染、彻底隐藏 |
| `visibility: hidden` | 占位 | 盒子保留但内容不可见 | 不能 | 可以设回 `visible` | 保留布局占位 |
| `opacity: 0` | 占位 | 透明绘制 | 可以 | 不行，继承透明结果 | 淡入淡出动画 |

### display: none
```css
.panel[hidden] {
  display: none;
}
```

元素不参与布局，不占空间，后代也不能通过自己的 `display` 显示出来。切换它通常会触发布局重新计算，适合状态变化不频繁、确实要从页面结构中隐藏的内容。

### visibility: hidden
```css
.placeholder {
  visibility: hidden;
}

.placeholder .badge {
  visibility: visible;
}
```

元素仍参与布局并保留尺寸，但自身不可见，也不会响应鼠标事件。子元素可以重新设置 `visibility: visible` 单独显示，这是它和 `opacity` 的重要区别。

### opacity: 0
```css
.fade {
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms ease;
}

.fade.is-open {
  opacity: 1;
  pointer-events: auto;
}
```

元素仍在布局中，也仍可能被点击、聚焦和读屏访问。做淡入淡出时通常要配合 `pointer-events`、`visibility`、`aria-hidden` 或焦点管理，避免透明元素挡住页面。

### 性能和可访问性
1. `display` 切换影响布局，适合彻底隐藏。
2. `visibility` 保留布局，一般影响绘制和命中测试。
3. `opacity` 动画通常比较友好，但不是无条件零成本；大面积透明层仍可能增加合成和内存成本。
4. `display: none` 和 `visibility: hidden` 通常不会暴露给辅助技术；`opacity: 0` 只是视觉透明，需要额外处理语义隐藏。

### 视觉隐藏但保留给读屏
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

<!-- id: css-047; difficulty: 1; tags: px, em, rem, 单位, 响应式; source: 高频 -->
# CSS 中 px、em、rem 如何选择？什么场景用哪种？

## px、em、rem 如何选择

### px：精确尺寸
```css
.card {
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
}
```

`px` 适合边框、阴影、图标尺寸、设计稿要求非常明确的小尺寸。现代浏览器里的 CSS px 是视觉参考单位，不等于物理屏幕像素；用户缩放页面时它仍会整体放大。

### em：相对当前元素字体大小
```css
.button {
  font-size: 1rem;
  padding: 0.5em 1em;
  border-radius: 0.375em;
}

.button--sm { font-size: 0.875rem; }
.button--lg { font-size: 1.125rem; }
```

`em` 适合组件内部跟随字号缩放的间距、圆角、图标间距。注意 `font-size: 1.2em` 会相对父元素字号计算，嵌套多层时可能逐级放大或缩小。

### rem：相对根元素字体大小
```css
html {
  font-size: 100%; /* 尊重用户默认字号，通常是 16px */
}

body { font-size: 1rem; }
h1 { font-size: 2rem; }
.article { max-width: 42rem; }
.section { padding-block: 3rem; }
```

`rem` 适合全局排版尺度、页面间距、容器宽度。它不会受组件嵌套字号影响，比 `em` 更稳定，也更容易和设计 token 对齐。

### 响应式字体
```css
.hero-title {
  font-size: clamp(2rem, 4vw + 1rem, 4.5rem);
}
```

`clamp(min, preferred, max)` 适合响应式字号，但不要只用 `vw`，否则用户缩放和小屏可读性会变差。常见写法是 `rem + vw`，并设置上下限。

### 实践规则
1. 字体大小：优先 `rem`，组件变体可用 `em`。
2. 组件内部 padding、gap、圆角：希望随字号变化时用 `em`，否则用 `rem` 或 token。
3. 页面级间距、最大宽度、排版节奏：优先 `rem`。
4. 边框、阴影、hairline、少量固定图标：通常用 `px`。
5. 布局列宽：用 `%`、`fr`、`minmax()`、`clamp()`，不要只靠固定 `px`。
6. 不建议把 `html { font-size: 62.5%; }` 当默认方案，它会影响用户字号偏好和第三方组件预期。

<!-- id: css-048; difficulty: 2; tags: Tailwind, Utility-First, CSS框架, 原子化CSS; source: 高频 -->
# 什么是 Tailwind CSS？它的原理和优缺点是什么？

## Tailwind CSS

### 概念
Tailwind 是 utility-first CSS 框架。它提供大量原子化工具类，开发者通过组合 class 完成布局、颜色、间距、状态和响应式样式。

```html
<button class='rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700'>
  保存
</button>
```

传统 CSS 往往先抽象 `.btn-primary`，Tailwind 则把样式约束沉到设计 token 和工具类里，组件上直接表达最终样式。

### 工作原理
1. 扫描项目源码，把可能是工具类的 token 找出来。
2. 根据检测到的完整 class 生成对应 CSS，未使用的工具类不会进入产物。
3. 变体前缀如 `hover:`、`focus:`、`md:`、`dark:` 会生成对应状态或媒体查询规则。
4. 任意值如 `w-[37px]`、`grid-cols-[240px_1fr]` 也依赖源码中出现完整 class。

### Tailwind v4 的 CSS-first 配置
```css
@import 'tailwindcss';

@theme {
  --color-brand: #2563eb;
  --color-brand-contrast: #ffffff;
  --spacing-card: 1.25rem;
  --radius-control: 0.5rem;
}

@source '../src';
@source '../node_modules/@acme/ui-lib';
```

v4 更推荐在 CSS 中用 `@theme` 定义设计令牌，用 `@source` 显式补充需要扫描的路径。旧项目中的 `tailwind.config.js` 仍可能存在，但在 v4 中需要按升级规则显式加载，不能再把它当成唯一标准写法。

### 动态 class 的坑
```tsx
// 错误：源码里没有完整的 bg-red-600 或 bg-blue-600
const className = `bg-${color}-600`;

// 正确：把完整 class 写出来，Tailwind 才能检测到
const colorClass = color === 'red' ? 'bg-red-600' : 'bg-blue-600';

// 更适合组件库：用映射表约束可选样式
const toneClass = {
  danger: 'bg-red-600 text-white hover:bg-red-700',
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
};
```

### 优点
1. 减少 class 命名和 CSS 文件膨胀，样式修改通常局部完成。
2. 间距、颜色、字号来自统一 scale，有利于设计系统一致性。
3. 响应式、暗色模式、状态样式表达清晰，例如 `md:grid-cols-2`、`dark:bg-slate-900`。
4. 产物只包含实际使用到的工具类，体积可控。
5. 和组件化开发契合，样式跟随组件迁移。

### 缺点
1. class 较长，复杂组件可读性会下降，需要抽组件或用 class 合并工具治理。
2. 学习成本从 CSS 命名转移到工具类、变体、设计 token 体系。
3. 动态拼接 class、外部组件库扫描、运行时生成内容都需要特别处理。
4. 容易把一次性视觉细节堆在模板里，缺少组件边界时会变得难维护。
5. 团队需要统一格式化、排序、冲突合并和设计 token 规范。

### 面试总结
Tailwind 的核心不是免写 CSS，而是把样式抽象从语义 class 转为可组合的受约束工具类。它适合组件化、设计系统明确、需要快速迭代的项目；对高度定制、团队规范薄弱或模板非常复杂的项目，需要配合组件抽象和工程约束使用。

<!-- id: css-049; difficulty: 2; tags: sticky-footer, Flexbox, 布局, CSS; source: 高频 -->
# CSS 中如何实现粘性页脚（Sticky Footer）？

## 粘性页脚（Sticky Footer）

Sticky Footer 指：内容不足一屏时，footer 贴在视口底部；内容超过一屏时，footer 跟随文档自然出现在内容后面。它不是 `position: fixed`，因为 fixed footer 会一直悬浮并可能遮挡内容。

### Flexbox 推荐方案
```html
<body>
  <header>Header</header>
  <main>内容区域</main>
  <footer>Footer</footer>
</body>
```

```css
html,
body {
  min-height: 100%;
  margin: 0;
}

body {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1 0 auto;
}

footer {
  flex-shrink: 0;
}
```

`main` 占据剩余空间，把 footer 推到底部；内容变多时页面自然变高。`100dvh` 更适合移动端动态地址栏，`100vh` 可以作为兼容兜底。

### Grid 方案
```css
body {
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
}
```

三行分别是 header、main、footer，中间的 `1fr` 吃掉剩余空间。

### 旧方案：calc 固定 footer 高度
```css
.wrapper {
  min-height: calc(100vh - 64px);
}

footer {
  height: 64px;
}
```

这个方案依赖 footer 固定高度，内容变化或响应式时维护成本高，现代项目优先用 Flex/Grid。

### 不推荐：fixed footer
```css
footer {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
}
```

`fixed` 是固定悬浮页脚，不是 sticky footer。它需要额外给内容区留 padding，而且在移动端键盘、刘海屏、安全区域下更容易出问题。

<!-- id: css-050; difficulty: 2; tags: 等高列, Flexbox, Grid, 布局; source: 高频 -->
# CSS 中如何实现等高列布局？

## 等高列布局

### Flexbox：常用方案
```css
.columns {
  display: flex;
  align-items: stretch; /* 默认值，同一 flex line 内项目拉伸到等高 */
  gap: 16px;
}

.column {
  flex: 1 1 0;
  min-width: 0;
}
```

Flex 的等高发生在同一行内。如果允许换行，每一行只和本行最高项等高，不会跨行等高。

### Grid：二维布局更合适
```css
.columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch; /* 默认 */
}

.column {
  min-width: 0;
}
```

Grid 同一行轨道会按最高内容撑开，适合多列卡片、后台面板等二维布局。多行卡片要做瀑布流时，Grid 的等高行反而可能不是目标效果。

### 卡片内部底部对齐
```css
.card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-body {
  flex: 1;
}

.card-footer {
  margin-top: auto;
}
```

外层负责等高，卡片内部再用列向 Flex 把按钮、价格、操作区推到底部，这是商品卡、文章卡很常见的组合。

### table-cell：旧兼容方案
```css
.columns {
  display: table;
  width: 100%;
  table-layout: fixed;
  border-spacing: 16px 0;
}

.column {
  display: table-cell;
  vertical-align: top;
}
```

`table-cell` 天然同行等高，但语义和响应式能力不如 Flex/Grid，新代码一般不用。

### padding + 负 margin：老式视觉方案
```css
.columns {
  overflow: hidden;
}

.column {
  float: left;
  width: 33.333%;
  padding-bottom: 9999px;
  margin-bottom: -9999px;
}
```

这是视觉等高，实际盒子高度没有真正一致，容易影响滚动、锚点、背景和可维护性。现代项目只作为历史方案了解即可。

### 面试总结
等高列优先 Flex 或 Grid：一维排列用 Flex，二维网格用 Grid；如果还要卡片底部按钮对齐，在子卡片内部再套一层列向 Flex。

<!-- id: css-051; difficulty: 2; tags: filter, backdrop-filter, 毛玻璃, CSS效果; source: 高频 -->
# CSS filter 属性有哪些用法？

## CSS `filter` 属性

### 常用函数
```css
.image {
  filter: blur(4px);                    /* 高斯模糊 */
  filter: brightness(1.2);              /* 亮度，1 为原图 */
  filter: contrast(1.15);               /* 对比度 */
  filter: grayscale(1);                 /* 灰度 */
  filter: invert(1);                    /* 反色 */
  filter: opacity(0.5);                 /* 滤镜透明度，不等同于 opacity 属性的最佳选择 */
  filter: saturate(1.6);                /* 饱和度 */
  filter: sepia(0.8);                   /* 棕褐色 */
  filter: hue-rotate(90deg);            /* 色相旋转 */
  filter: drop-shadow(0 4px 12px rgb(0 0 0 / 35%));
}
```

多个滤镜可以组合，执行顺序从左到右，顺序不同结果可能不同。

```css
.photo {
  filter: brightness(0.9) contrast(1.2) saturate(1.1);
}
```

### drop-shadow 和 box-shadow
```css
.logo-png {
  filter: drop-shadow(0 4px 8px rgb(0 0 0 / 30%));
}

.card {
  box-shadow: 0 4px 8px rgb(0 0 0 / 30%);
}
```

`drop-shadow()` 根据元素渲染后的 alpha 轮廓投影，适合透明 PNG、SVG 图标等不规则形状；`box-shadow` 基于元素边框盒投影，支持 spread、inset 等能力。`drop-shadow()` 不等于完整替代 `box-shadow`。

### backdrop-filter
```css
.glass {
  background: rgb(255 255 255 / 20%);
  border: 1px solid rgb(255 255 255 / 35%);
  backdrop-filter: blur(16px) saturate(1.4);
}
```

`filter` 作用在元素自身及其内容上；`backdrop-filter` 作用在元素背后的已绘制内容上。毛玻璃效果需要元素背景有透明度，否则看不到背后内容被处理。

### SVG filter
```css
.card {
  filter: url('#noise') contrast(1.1);
}
```

`url()` 可以引用 SVG filter，适合更复杂的模糊、噪声、位移、颜色矩阵效果，但调试和性能成本更高。

### 使用注意
1. 非 `none` 的 `filter` 通常会创建新的 stacking context。
2. 大面积 `blur()`、`backdrop-filter` 成本较高，滚动列表和全屏遮罩中要谨慎。
3. 动画滤镜不一定只走合成，实际要用 DevTools Performance 检查 Paint 和 Composite。
4. 暗色模式不要简单全站 `invert()`，图片、视频、品牌色和可读性都容易出问题。

<!-- id: css-052; difficulty: 3; tags: 主题切换, Dark Mode, View Transitions, CSS变量; source: 高频 -->
# 如何用 CSS 实现一个完整的暗色/亮色主题切换系统，包含过渡动画？

## 暗色/亮色主题切换系统

### 1. 用语义 CSS 变量建主题
```css
:root,
[data-theme='light'] {
  color-scheme: light;
  --color-bg: #ffffff;
  --color-surface: #f8fafc;
  --color-text: #111827;
  --color-muted: #64748b;
  --color-border: #e5e7eb;
  --color-primary: #2563eb;
  --shadow-card: 0 8px 24px rgb(15 23 42 / 8%);
}

[data-theme='dark'] {
  color-scheme: dark;
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-text: #f8fafc;
  --color-muted: #94a3b8;
  --color-border: #334155;
  --color-primary: #60a5fa;
  --shadow-card: 0 8px 24px rgb(0 0 0 / 35%);
}

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text);
}

.card {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
}
```

变量要按语义命名，例如 `--color-bg`、`--color-text`，不要在业务组件里直接写 `--blue-500` 或裸色值。

### 2. 首屏防闪初始化
```html
<script>
  (() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved === 'light' || saved === 'dark' ? saved : prefersDark ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
  })();
</script>
```

这段脚本要放在 CSS 加载前或尽量靠前，避免页面先亮后暗或先暗后亮。

### 3. 受控过渡，不要全局通配
```css
:root {
  --theme-duration: 220ms;
  --theme-ease: cubic-bezier(0.2, 0, 0, 1);
}

.theme-animate body,
.theme-animate .card,
.theme-animate .button {
  transition:
    background-color var(--theme-duration) var(--theme-ease),
    color var(--theme-duration) var(--theme-ease),
    border-color var(--theme-duration) var(--theme-ease),
    box-shadow var(--theme-duration) var(--theme-ease);
}

@media (prefers-reduced-motion: reduce) {
  .theme-animate body,
  .theme-animate .card,
  .theme-animate .button {
    transition: none;
  }
}
```

不要给 `*` 加全局 transition，它会影响布局动画、弹窗动画和第三方组件。切主题时临时给根元素加 `.theme-animate`，过渡结束后移除。

### 4. JS 切换逻辑
```js
const root = document.documentElement;

const applyTheme = (theme) => {
  root.dataset.theme = theme;
  localStorage.setItem('theme', theme);
};

const toggleTheme = () => {
  const current = root.dataset.theme === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';

  root.classList.add('theme-animate');
  applyTheme(next);
  window.setTimeout(() => root.classList.remove('theme-animate'), 260);
};
```

如果产品支持 `system` 模式，需要保存的是 `system`，并监听 `(prefers-color-scheme: dark)` 变化后重新计算实际主题。

### 5. View Transitions 渐进增强
```js
const toggleThemeWithTransition = (event) => {
  const current = root.dataset.theme === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  const x = event?.clientX ?? window.innerWidth / 2;
  const y = event?.clientY ?? window.innerHeight / 2;

  root.style.setProperty('--theme-x', `${x}px`);
  root.style.setProperty('--theme-y', `${y}px`);

  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    applyTheme(next);
    return;
  }

  document.startViewTransition(() => applyTheme(next));
};
```

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 420ms;
  animation-timing-function: ease-out;
  mix-blend-mode: normal;
}

::view-transition-new(root) {
  clip-path: circle(0 at var(--theme-x, 50%) var(--theme-y, 50%));
  animation-name: theme-reveal;
}

@keyframes theme-reveal {
  to {
    clip-path: circle(150vmax at var(--theme-x, 50%) var(--theme-y, 50%));
  }
}
```

### 工程要点
1. `color-scheme` 要同步设置，让表单控件、滚动条等原生 UI 跟随主题。
2. 图片、图表、代码高亮、阴影、focus ring 都要有暗色 token。
3. 切主题要处理 localStorage、系统偏好、SSR 首屏、防闪和减少动态效果。
4. 过渡动画只作用于颜色类属性，不要在主题切换里动画布局尺寸。

<!-- id: css-053; difficulty: 3; tags: 交错动画, Intersection Observer, CSS动画, Grid; source: 高频 -->
# CSS 中如何实现复杂的网格动画效果（如交错动画）？

## CSS 复杂网格交错动画

### 1. 固定数量：nth-child 延迟
```css
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.grid-item {
  opacity: 0;
  animation: fade-in-up 420ms cubic-bezier(0.2, 0, 0, 1) both;
}

.grid-item:nth-child(1) { animation-delay: 0ms; }
.grid-item:nth-child(2) { animation-delay: 50ms; }
.grid-item:nth-child(3) { animation-delay: 100ms; }
.grid-item:nth-child(4) { animation-delay: 150ms; }
```

适合数量固定的菜单、卡片入口动画。缺点是数量多时 CSS 冗余。

### 2. 自定义属性：动态索引
```css
.grid-item {
  --delay-step: 55ms;
  opacity: 0;
  animation: fade-in-up 420ms cubic-bezier(0.2, 0, 0, 1) both;
  animation-delay: calc(var(--i, 0) * var(--delay-step));
}
```

```js
document.querySelectorAll('.grid-item').forEach((el, index) => {
  el.style.setProperty('--i', index);
});
```

如果希望按行或按列交错，可以传入行列索引。

```js
const columns = 4;
document.querySelectorAll('.grid-item').forEach((el, index) => {
  const row = Math.floor(index / columns);
  const col = index % columns;
  el.style.setProperty('--i', row + col);
});
```

### 3. IntersectionObserver 触发入场
```css
.grid-item {
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 420ms ease,
    transform 420ms ease;
  transition-delay: calc(var(--i, 0) * 55ms);
}

.grid-item.is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

```js
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  },
  { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
);

document.querySelectorAll('.grid-item').forEach((el, index) => {
  el.style.setProperty('--i', index % 6);
  observer.observe(el);
});
```

### 4. Scroll-driven 渐进增强
```css
@supports (animation-timeline: view()) {
  .grid-item {
    animation: fade-in-up linear both;
    animation-timeline: view(block);
    animation-range: entry 0% entry 80%;
    animation-delay: 0s;
  }
}
```

Scroll-driven 适合滚动进度驱动的入场，不需要 JS 监听滚动；兼容性不足时保留 IntersectionObserver 或静态样式。

### 性能和体验
1. 优先动画 `transform`、`opacity`，不要在大量网格项上动画 `top`、`width`、`height`。
2. 交错延迟不要过长，否则用户会觉得界面响应慢。
3. 列表很长时只给进入视口的元素加动画，避免首屏创建大量动画。
4. 尊重 `prefers-reduced-motion`。

```css
@media (prefers-reduced-motion: reduce) {
  .grid-item {
    animation: none;
    transition: none;
    opacity: 1;
    transform: none;
  }
}
```

<!-- id: css-054; difficulty: 3; tags: CSS性能, 重排重绘, 合成层, 优化; source: 高频 -->
# CSS 性能优化有哪些常见手段？

## CSS 性能优化

CSS 性能主要看两类：加载阶段是否阻塞首屏，运行阶段是否造成大量 Layout、Paint、Composite 开销。

### 1. 控制 CSS 体积和阻塞
```html
<style>
  body { margin: 0; font-family: system-ui, sans-serif; }
  .app-shell { min-height: 100vh; }
</style>

<link rel='preload' href='/assets/app.css' as='style'>
<link rel='stylesheet' href='/assets/app.css'>
```

1. 提取首屏 critical CSS，非首屏样式按路由或组件拆分。
2. 删除未使用 CSS，压缩产物，开启 Brotli/Gzip。
3. 避免一个全站巨型 CSS 包阻塞所有页面。
4. 第三方组件库按需引入样式，别整包加载。

### 2. 减少 Layout 和 Paint
```css
/* 几何属性变化容易影响布局 */
.bad { left: 100px; width: 240px; }

/* 动画优先用 transform/opacity */
.good { transform: translateX(100px); opacity: 0.8; }
```

`transform`、`opacity` 在元素已被合成的情况下通常可以跳过 Layout/Paint，但不是无条件零成本。首次绘制、图层提升、纹理上传和内容变化仍然会有开销。

### 3. 合理使用合成层
```css
.card {
  transition: transform 180ms ease, opacity 180ms ease;
}

.card.is-animating {
  will-change: transform, opacity;
}
```

`will-change` 只给即将动画的元素短时间使用，动画结束后移除。过多合成层会增加内存、GPU 纹理和功耗，可能比不提升更慢。

### 4. 使用 contain 和 content-visibility
```css
.widget {
  contain: layout paint style;
}

.long-section {
  content-visibility: auto;
  contain-intrinsic-size: auto 480px;
}
```

`contain` 可以限制布局、绘制、样式影响范围，适合独立卡片、组件边界。`content-visibility: auto` 可以跳过视口外内容的渲染，长列表和长文档收益明显；要提供合理 intrinsic size，避免滚动条跳动。

### 5. 选择器和级联治理
```css
/* 避免过深嵌套和大范围后代选择器 */
.sidebar .menu .item .label { color: #111; }

/* 更推荐稳定、扁平的类名或作用域 */
.menu-label { color: #111; }
```

现代浏览器选择器匹配通常不是最大瓶颈，不要为了微优化牺牲可维护性。真正要避免的是深层后代选择器、全局通配选择器影响大范围节点，以及频繁动态插入会触发全局样式重算的规则。

### 6. 字体和图片相关 CSS
```css
@font-face {
  font-family: 'InterVar';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-display: swap;
}
```

字体使用 WOFF2、子集化、合理 preload 和 `font-display`。背景图片要压缩、按尺寸加载，避免用 CSS 背景承载必须有语义和懒加载需求的关键图片。

### 7. 动画策略
1. 优先 `transform`、`opacity`。
2. 避免动画 `filter: blur()`、巨大阴影、`backdrop-filter`、`height: auto` 等高成本效果。
3. 用 `prefers-reduced-motion` 降低动画强度。
4. 大量列表项动画要分批触发，不要首屏同时创建几百个动画。

### 8. 用工具验证
不要只凭经验判断。用 DevTools Performance 看 Recalculate Style、Layout、Paint、Composite；用 Coverage 找未使用 CSS；用 Lighthouse/Web Vitals 关注 FCP、LCP、CLS、INP。

<!-- id: css-055; difficulty: 3; tags: Subgrid, Grid, 子网格, CSS; source: 高频 -->
# 解释 CSS 中的 Subgrid（子网格），它解决了什么问题？

## CSS Subgrid（子网格）

### 解决的问题
普通嵌套 Grid 会创建一套新的网格轨道，子网格的列宽、行高和父网格没有天然关系。Subgrid 允许网格子项在某个方向上复用父网格轨道，让嵌套内容和外层网格精确对齐，避免硬编码尺寸或 JS 测量。

### 基本用法：继承列轨道
```css
.page-grid {
  display: grid;
  grid-template-columns: [full-start] 1fr [content-start] minmax(0, 960px) [content-end] 1fr [full-end];
  gap: 24px;
}

.article-section {
  grid-column: full-start / full-end;
  display: grid;
  grid-template-columns: subgrid;
}

.article-content {
  grid-column: content-start / content-end;
}
```

`.article-section` 作为父网格的子项，跨了父网格多列；设置 `grid-template-columns: subgrid` 后，它的子元素可以继续使用父网格的列线和列宽。

### 卡片内部区域对齐
```css
.card-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  grid-auto-rows: auto auto auto;
  gap: 24px;
}

.card {
  display: grid;
  grid-row: span 3;
  grid-template-rows: subgrid;
  gap: 12px;
}

.card-media { grid-row: 1; }
.card-title { grid-row: 2; }
.card-actions { grid-row: 3; align-self: end; }
```

每张卡片跨 3 条父网格行，并把内部行设为 subgrid。这样不同卡片的标题、正文、按钮可以按同一组行轨道对齐。

### 行、列可以分别使用
```css
.child-a {
  grid-template-columns: subgrid;
  grid-template-rows: auto auto;
}

.child-b {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: subgrid;
}
```

可以只对子网格列使用 `subgrid`，也可以只对行使用。未使用 subgrid 的方向仍然是普通 Grid。

### 注意事项
1. Subgrid 只对网格子项生效：元素必须先是父 grid 的 item，再把自己设为 grid container。
2. 子网格复用的是它跨越范围内的父网格轨道，跨几条轨道就只能使用这些轨道。
3. gap 会继承父网格的间距，也可以在子网格上覆盖。
4. 它解决的是跨嵌套层级对齐问题，不是 Masonry 瀑布流。
5. 上线前用 `@supports (grid-template-columns: subgrid)` 做增强和降级。

```css
@supports (grid-template-columns: subgrid) {
  .card { grid-template-rows: subgrid; }
}
```
