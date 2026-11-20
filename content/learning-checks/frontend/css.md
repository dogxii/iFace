# CSS 测试一下

## css-001

### Q1 single | 盒模型计算

一个元素设置 `box-sizing: content-box; width: 200px; padding: 20px; border: 5px solid`，不考虑 margin，它的渲染宽度是多少？

- [ ] A. 200px
- [ ] B. 220px
- [x] C. 250px
- [ ] D. 150px

**解释**：标准盒模型中 `width` 只包含 content。实际宽度是 `200 + 20*2 + 5*2 = 250px`。

### Q2 multiple | border-box 语义

关于 `box-sizing: border-box`，哪些说法正确？

- [x] A. `width` / `height` 包含 content、padding 和 border。
- [x] B. 设置 padding 和 border 后，content 区会被压缩。
- [x] C. 全局设置 `*, *::before, *::after { box-sizing: border-box; }` 是常见实践。
- [ ] D. margin 也会被包含进 `width`。
- [ ] E. `border-box` 会让元素不再参与正常布局。

**解释**：`border-box` 管的是内容、内边距和边框，不包含 margin，也不会改变元素参与布局的方式。

### Q3 multiple | JS 尺寸 API

哪些尺寸 API 的理解正确？

- [x] A. `offsetWidth` 包含 content、padding 和 border。
- [x] B. `clientWidth` 包含 content 和 padding，通常不包含 border。
- [x] C. `getBoundingClientRect().width` 返回实际渲染宽度，可包含小数。
- [ ] D. `clientWidth` 一定包含 margin。
- [ ] E. `offsetWidth` 会返回字符串，例如 `"200px"`。

**解释**：DOM 尺寸 API 的包含范围不同。margin 不属于 `offsetWidth` 或 `clientWidth`，返回值是数字。

## css-002

### Q1 single | BFC 定位

BFC 最准确的理解是什么？

- [ ] A. 一种让元素固定在视口上的定位方式。
- [x] B. 一个独立的块级布局区域，内部浮动、margin 折叠等规则和外部隔离。
- [ ] C. 一个只存在于 Flexbox 中的对齐算法。
- [ ] D. 一个 JavaScript 布局 API。

**解释**：BFC 是块级格式化上下文，它会包含内部浮动、阻止 BFC 内外 margin 折叠，并避免与外部浮动重叠。

### Q2 multiple | 创建 BFC

哪些写法可以常见地创建 BFC 或类似布局隔离区域？

- [x] A. `display: flow-root`
- [x] B. `overflow: hidden`
- [x] C. `position: absolute`
- [x] D. `display: inline-block`
- [ ] E. `color: red`

**解释**：现代清浮动优先 `display: flow-root`。`overflow`、浮动、绝对定位、inline-block 等也可创建 BFC，但可能有副作用。

### Q3 multiple | BFC 用途与副作用

关于 BFC 的用途，哪些说法正确？

- [x] A. 可以包含内部浮动，避免父元素高度塌陷。
- [x] B. 可以阻止父子 margin 折叠。
- [x] C. BFC 区域不会与外部 float 重叠。
- [ ] D. `overflow: hidden` 创建 BFC 永远没有副作用。
- [ ] E. BFC 会自动让所有子元素水平居中。

**解释**：`overflow: hidden` 可能裁剪阴影、弹层或溢出内容。BFC 是布局隔离，不是居中工具。

## css-003

### Q1 single | 主轴对齐

在 `display: flex; flex-direction: row` 的容器中，`justify-content` 控制哪个方向的对齐？

- [x] A. 主轴，也就是默认水平方向。
- [ ] B. 交叉轴，也就是默认垂直方向。
- [ ] C. z 轴层叠方向。
- [ ] D. 只控制文本基线。

**解释**：Flexbox 是一维布局。`flex-direction` 决定主轴，`justify-content` 控制主轴，`align-items` 控制交叉轴。

### Q2 multiple | Flex 子项属性

哪些是 Flex 子项属性或相关写法？

- [x] A. `flex-grow`
- [x] B. `flex-shrink`
- [x] C. `flex-basis`
- [x] D. `align-self`
- [ ] E. `grid-template-columns`

**解释**：`grid-template-columns` 是 Grid 容器属性。Flex 子项通过 grow、shrink、basis、align-self、order 等参与分配和对齐。

### Q3 multiple | Flex 常见坑

哪些 Flexbox 常见坑判断正确？

- [x] A. `align-content` 只在多行 flex 容器中有意义。
- [x] B. 长文本撑破 flex 子项时，常给子项加 `min-width: 0`。
- [x] C. `order` 只改变视觉顺序，不应替代 DOM 语义顺序。
- [ ] D. Flexbox 最适合复杂二维页面骨架，Grid 完全没必要。
- [ ] E. `flex: 1` 一定等价于 `flex: none`。

**解释**：Flex 适合一维分配，Grid 更适合二维布局。`flex: 1` 通常表示可增长和可收缩，而 `flex: none` 不伸缩。

## css-004

### Q1 single | Grid 定位

CSS Grid 相比 Flexbox 的核心优势是什么？

- [ ] A. 只能做水平居中。
- [x] B. 能同时控制行和列，适合二维布局。
- [ ] C. 只能用于表格元素。
- [ ] D. 不支持响应式。

**解释**：Grid 是二维布局系统，适合页面骨架、卡片矩阵、仪表盘和跨行跨列布局。

### Q2 multiple | Grid 容器属性

哪些属于 Grid 容器常用属性？

- [x] A. `grid-template-columns`
- [x] B. `grid-template-rows`
- [x] C. `grid-template-areas`
- [x] D. `gap`
- [ ] E. `flex-basis`

**解释**：`flex-basis` 是 Flex 子项属性。Grid 容器通过模板列/行、区域、gap 和对齐属性定义网格。

### Q3 multiple | Grid 实战细节

哪些 Grid 细节理解正确？

- [x] A. `fr` 表示按比例分配剩余空间。
- [x] B. `minmax(0, 1fr)` 常用于避免内容把轨道撑破。
- [x] C. `auto-fit` 会折叠空列，项目少时更容易拉伸填满。
- [x] D. `justify-items` / `align-items` 控制单元格内 item 对齐。
- [ ] E. `justify-content` 只控制单个 grid item 的水平对齐。

**解释**：`justify-content` / `align-content` 控制整个网格在容器中的对齐；单个格子里的 item 对齐看 items/self。

## css-005

### Q1 single | specificity 计算

选择器 `#nav .item:hover` 的优先级四元组更接近哪一个？

- [ ] A. `(0,0,1,0)`
- [x] B. `(0,1,2,0)`
- [ ] C. `(0,0,2,1)`
- [ ] D. `(1,0,0,0)`

**解释**：`#nav` 是 1 个 ID，`.item` 和 `:hover` 是 2 个 class/伪类级别，没有元素选择器，也不是内联样式。

### Q2 multiple | 现代选择器优先级

关于现代选择器优先级，哪些说法正确？

- [x] A. `:where()` 永远贡献 0 优先级。
- [x] B. `:is()` 取参数中最高优先级。
- [x] C. `:not()` 取参数优先级。
- [x] D. `:has()` 取参数优先级。
- [ ] E. 通配符 `*` 的优先级比 ID 更高。

**解释**：`:where()` 常用于写低优先级基础样式；`:is/:not/:has` 的优先级来自参数。通配符不贡献优先级。

### Q3 multiple | 层叠顺序

最终样式生效不只看选择器优先级，还要考虑哪些因素？

- [x] A. 样式来源和 `!important` 重要性。
- [x] B. cascade layer 层顺序。
- [x] C. 同优先级下的书写顺序。
- [x] D. 继承值和直接声明的关系。
- [ ] E. CSS 文件名长度。

**解释**：层叠顺序综合来源、重要性、layer、specificity 和源码顺序。继承值优先级低于直接匹配元素的声明。

## css-006

### Q1 single | 现代居中

现代项目里让一个未知宽高子元素水平垂直居中，最直接的容器写法是哪一个？

- [x] A. `display: flex; justify-content: center; align-items: center;`
- [ ] B. `line-height: 50px`，适用于所有多行内容。
- [ ] C. `float: left`
- [ ] D. `position: static; top: 50%`

**解释**：Flex 和 Grid 是现代居中的首选。`line-height` 只适合单行文本，static 元素 top/left 无效。

### Q2 multiple | 居中方案条件

哪些居中方案条件判断正确？

- [x] A. Grid 可用 `display: grid; place-items: center;`。
- [x] B. 绝对定位 + `transform: translate(-50%, -50%)` 不需要知道元素尺寸。
- [x] C. 绝对定位 + `inset: 0; margin: auto` 通常需要固定宽高。
- [x] D. 单行文本可用 `height` 等于 `line-height` 做垂直居中。
- [ ] E. `text-align: center` 可以让任意块级子元素垂直居中。

**解释**：`text-align` 控制行内内容的水平对齐，不负责垂直居中，也不直接居中任意块级盒。

### Q3 multiple | 方案选择

哪些居中方案选择更合理？

- [x] A. 普通组件内容居中优先 Flex/Grid。
- [x] B. 弹层或徽标定位可用 absolute + transform。
- [x] C. 单行按钮文字可用 line-height 或 Flex 居中。
- [ ] D. 所有居中问题都应用 `margin-left: -50%`。
- [ ] E. 为了居中必须修改 DOM 顺序。

**解释**：不同方案服务不同布局上下文。现代 CSS 已能在不改 DOM 语义的情况下完成大多数居中。

## css-007

### Q1 single | 伪类 vs 伪元素

`:hover` 和 `::before` 的本质区别是什么？

- [ ] A. 二者都是创建真实 DOM 节点。
- [x] B. `:hover` 选择已有元素状态，`::before` 创建或选择元素的虚拟部分。
- [ ] C. `::before` 只能用于链接。
- [ ] D. `:hover` 必须写双冒号。

**解释**：伪类表示状态、位置或条件；伪元素表示元素的一部分或虚拟结构。现代伪元素用双冒号。

### Q2 multiple | 伪类识别

哪些属于伪类？

- [x] A. `:focus`
- [x] B. `:checked`
- [x] C. `:nth-child(odd)`
- [x] D. `:not(.disabled)`
- [ ] E. `::placeholder`

**解释**：`::placeholder` 是伪元素。伪类一般以单冒号表示已有元素的状态、关系或条件。

### Q3 multiple | 伪元素实践

关于伪元素，哪些说法正确？

- [x] A. `::before` 和 `::after` 通常需要设置 `content` 才会生成盒子。
- [x] B. `::selection` 可定制文本选中样式。
- [x] C. `::marker` 可定制列表标记。
- [ ] D. 伪元素一定可以用 JS `querySelector` 直接获取。
- [ ] E. 伪元素一定会出现在 DOM 树中。

**解释**：伪元素不是真实 DOM 节点，不能直接通过 DOM API 获取；它们由 CSS 渲染生成。

## css-008

### Q1 single | CSS 变量本质

CSS Custom Properties 和 SCSS 变量最大的区别是什么？

- [ ] A. CSS 变量只能写数字，SCSS 变量只能写颜色。
- [x] B. CSS 变量是运行时能力，参与层叠和继承；SCSS 变量是编译期替换。
- [ ] C. CSS 变量必须通过 JavaScript 创建。
- [ ] D. SCSS 变量会被浏览器动态继承。

**解释**：CSS 变量最终保留在 CSS 中，可被媒体查询、状态和 JS 改变；SCSS 变量编译后不存在。

### Q2 multiple | CSS 变量用法

哪些 CSS 变量用法正确？

- [x] A. `--primary-color: #007bff;`
- [x] B. `color: var(--text-color, #111);`
- [x] C. 通过 `[data-theme="dark"]` 覆盖变量实现主题。
- [x] D. JS 可用 `style.setProperty('--primary-color', '#f00')` 修改变量。
- [ ] E. CSS 变量不参与继承和层叠。

**解释**：CSS 变量就是依赖继承和层叠来实现局部覆盖和主题系统的。

### Q3 multiple | @property 与性能

关于 `@property` 和 CSS 变量，哪些判断正确？

- [x] A. `@property` 可声明自定义属性语法、初始值和是否继承。
- [x] B. 类型化自定义属性更利于动画和浏览器解析。
- [x] C. 大量修改根节点变量会触发样式重新计算。
- [ ] D. `var()` fallback 会在变量有任意值时都生效。
- [ ] E. CSS 变量值在声明处就一定被验证为当前属性合法值。

**解释**：CSS 变量值是 token 序列，最终是否合法取决于使用它的属性。fallback 主要在变量未定义或无效时使用。

## css-009

### Q1 single | 移动优先

“移动优先”的媒体查询写法通常意味着什么？

- [x] A. 默认写小屏样式，再用 `@media (min-width: ...)` 增强大屏。
- [ ] B. 默认写桌面样式，再用 `max-width` 删除所有样式。
- [ ] C. 只支持手机，不支持桌面。
- [ ] D. 所有尺寸都必须用 px。

**解释**：移动优先让基础样式更轻，再随可用空间增加增强布局。断点应按内容需要重排来定。

### Q2 multiple | 响应式能力

响应式设计通常要考虑哪些维度？

- [x] A. 视口宽度和容器尺寸。
- [x] B. 暗色模式、减少动画等用户偏好。
- [x] C. 触摸/鼠标输入差异。
- [x] D. 响应式图片和高清资源。
- [ ] E. 只考虑某几个手机型号名称。

**解释**：响应式不是设备表，而是布局、媒体、输入方式和可访问性偏好的自适应。

### Q3 multiple | 容器查询与单位

哪些响应式写法理解正确？

- [x] A. `clamp(16px, 4vw, 32px)` 可做有上下限的流式尺寸。
- [x] B. `100dvh` 比传统 `100vh` 更适合移动端动态地址栏场景。
- [x] C. 容器查询按组件容器尺寸响应，不只看视口。
- [x] D. `srcset` / `sizes` 可让浏览器选择合适图片资源。
- [ ] E. 容器查询会自动替代所有媒体查询。

**解释**：媒体查询负责页面级断点，容器查询负责组件内部响应，两者可以共存。

## css-010

### Q1 single | absolute 参照

`position: absolute` 的元素通常相对于谁定位？

- [ ] A. 永远相对于视口。
- [x] B. 最近的非 `static` 定位祖先；某些 transform/filter/contain 祖先也可能创建 containing block。
- [ ] C. 永远相对于 body。
- [ ] D. 相对于自己的原位置，且不脱离文档流。

**解释**：absolute 脱离文档流，不占原空间。常见做法是在父元素上设置 `position: relative` 建立定位上下文。

### Q2 multiple | position 值

哪些 position 特性判断正确？

- [x] A. `static` 是默认值，top/right/bottom/left 无效。
- [x] B. `relative` 相对自身原位置偏移，原占位仍保留。
- [x] C. `fixed` 通常相对视口，但 transform 祖先可能改变其 containing block。
- [x] D. `sticky` 参与文档流，滚动到阈值后表现类似 fixed。
- [ ] E. `absolute` 不会脱离文档流。

**解释**：absolute/fixed 会脱离文档流。sticky 需要至少一个 inset，并受滚动容器和父元素边界限制。

### Q3 multiple | z-index 与 sticky

哪些定位相关坑判断正确？

- [x] A. sticky 不生效可能是没设置 `top` 等 inset。
- [x] B. sticky 会受最近滚动容器和父元素边界限制。
- [x] C. `z-index` 只在当前层叠上下文内比较。
- [ ] D. 子元素 `z-index: 999999` 一定能盖过页面所有元素。
- [ ] E. `position: relative` 偏移会改变原本占位位置。

**解释**：relative 的视觉偏移不改变原占位；z-index 受层叠上下文限制，不是全局数值竞赛。

## css-011

### Q1 single | 层叠上下文

为什么子元素 `z-index: 9999` 仍可能盖不过父元素外面的兄弟元素？

- [ ] A. `z-index` 只对文字颜色有效。
- [x] B. 子元素被限制在父元素创建的层叠上下文里，不能越过父上下文和外部元素比较。
- [ ] C. `z-index` 最大只能写 10。
- [ ] D. 只要使用 absolute 就一定在最上层。

**解释**：不同层叠上下文之间先比较上下文本身。子元素的 z-index 再大，也无法突破父上下文。

### Q2 multiple | 创建层叠上下文

哪些情况可能创建新的 stacking context？

- [x] A. `position: relative` 且 `z-index` 非 auto。
- [x] B. `opacity: 0.99`。
- [x] C. `transform: translateZ(0)`。
- [x] D. `isolation: isolate`。
- [ ] E. `font-weight: bold`。

**解释**：定位 + z-index、透明、transform、filter、contain、container-type、will-change 等都可能创建层叠上下文。

### Q3 multiple | 调试遮挡

调试弹层遮挡问题时，哪些做法合理？

- [x] A. 找最近创建 stacking context 的祖先。
- [x] B. 检查父级 `opacity`、`transform`、`z-index`、`contain` 等属性。
- [x] C. 必要时把弹层挂到更高层 portal 容器。
- [x] D. 设计统一 z-index token。
- [ ] E. 只要无限增大子元素 z-index，就一定解决。

**解释**：遮挡问题常在父级上下文。统一层级系统和 portal 比盲目加大数字更可靠。

## css-012

### Q1 single | transition vs animation

`transition` 和 `animation` 的核心区别是什么？

- [x] A. transition 依赖状态变化触发，animation 由 keyframes 驱动，可自动播放和循环。
- [ ] B. transition 必须写 `@keyframes`，animation 不需要。
- [ ] C. animation 只能用于 hover。
- [ ] D. transition 只能改变 display。

**解释**：transition 适合 hover、展开收起、主题切换等两态变化；animation 适合 loading、入场、多阶段动画。

### Q2 multiple | 动画属性

哪些 animation 属性用途匹配正确？

- [x] A. `animation-iteration-count` 控制播放次数或 infinite。
- [x] B. `animation-fill-mode: forwards` 可保留结束状态。
- [x] C. `animation-play-state` 可暂停或恢复动画。
- [x] D. `animation-direction` 可控制 reverse/alternate。
- [ ] E. `transition-delay` 控制 keyframes 中每一帧的位置。

**解释**：`transition-delay` 是 transition 延迟；keyframes 阶段由百分比或 from/to 控制。

### Q3 multiple | 性能与无障碍

关于 CSS 动画，哪些实践正确？

- [x] A. 优先动画 `transform` 和 `opacity`。
- [x] B. 避免频繁动画 `width`、`height`、`top`、`left`。
- [x] C. 尊重 `prefers-reduced-motion`。
- [x] D. `will-change` 只在动画前短时间使用。
- [ ] E. 所有动画都应无限循环，才能让页面更有反馈。

**解释**：无限动画容易消耗资源并影响可访问性。高成本布局属性动画更容易卡顿。

## css-013

### Q1 single | CSS Modules 本质

CSS Modules 主要解决什么问题？

- [ ] A. 让 CSS 只能在运行时通过 JS 生成。
- [x] B. 通过构建时局部作用域和哈希类名，避免全局类名污染。
- [ ] C. 自动把所有 CSS 改成 inline style。
- [ ] D. 完全替代 CSS 语法。

**解释**：CSS Modules 仍写 CSS，但 class 默认局部化，构建后生成唯一类名并通过 `styles.xxx` 引用。

### Q2 multiple | CSS Modules 用法

哪些 CSS Modules 用法正确？

- [x] A. `import styles from './Button.module.css'`。
- [x] B. `className={styles.button}` 引用局部类名。
- [x] C. `:global(.global-class)` 可声明全局样式。
- [x] D. `composes` 可组合本模块或其他模块的类。
- [ ] E. CSS Modules 中所有类名都会自动变成全局类名。

**解释**：CSS Modules 默认局部。需要全局样式时才显式使用 `:global()`。

### Q3 multiple | 方案对比

关于 CSS Modules 与其他方案，哪些判断正确？

- [x] A. 普通 CSS 是全局作用域，大项目容易冲突。
- [x] B. CSS Modules 可放心使用简单类名，因为构建会局部化。
- [x] C. CSS-in-JS 常支持运行时动态样式，但可能有运行时成本。
- [ ] D. CSS Modules 不需要构建工具支持。
- [ ] E. CSS Modules 会自动根据 props 计算样式分支。

**解释**：CSS Modules 是构建期方案，动态分支仍由组件代码决定组合哪些 class。

## css-014

### Q1 single | Sass 定位

SCSS/Sass 的本质是什么？

- [ ] A. 浏览器原生运行时变量系统。
- [x] B. CSS 预处理器，在构建阶段编译成普通 CSS。
- [ ] C. JavaScript 动画库。
- [ ] D. 只能用于 HTML 表格布局。

**解释**：Sass 提供变量、嵌套、mixin、函数、循环和模块化，但最终产物仍是普通 CSS。

### Q2 multiple | Sass 特性与风险

哪些 Sass 特性或风险判断正确？

- [x] A. `$primary` 这类变量是编译期变量。
- [x] B. `@mixin` / `@include` 适合复用样式逻辑。
- [x] C. 嵌套太深会生成复杂选择器，提高维护成本。
- [x] D. `@extend` 会合并选择器，复杂项目里可能难预测。
- [ ] E. Sass 变量可以被浏览器根据暗色模式运行时自动改写。

**解释**：Sass 变量编译后不存在。需要运行时主题切换时应使用 CSS 变量。

### Q3 multiple | Sass 模块化

关于 Sass 模块化和函数，哪些说法正确？

- [x] A. 现代 Sass 推荐 `@use` / `@forward`。
- [x] B. 旧 `@import` 容易造成全局污染和重复加载。
- [x] C. 可用 `@function` 封装 `rem()` 等计算。
- [x] D. `@for` 可批量生成工具类。
- [ ] E. Sass 函数会在浏览器运行时每帧重新计算。

**解释**：Sass 的函数和循环都在构建阶段执行。浏览器看到的是生成后的 CSS。

## css-015

### Q1 single | border 三角形

CSS border 三角形技巧的核心是什么？

- [ ] A. 给元素设置很大的 border-radius。
- [x] B. 元素宽高为 0，只显示某一侧 border，其他边透明。
- [ ] C. 必须使用 SVG path。
- [ ] D. 必须依赖 JavaScript 计算角度。

**解释**：宽高为 0 时，四条 border 形成四个三角区域。让三边透明、保留一边颜色即可得到三角形。

### Q2 multiple | 常见图形方案

哪些 CSS 图形实现方式匹配正确？

- [x] A. 圆形可用 `aspect-ratio: 1` + `border-radius: 50%`。
- [x] B. 多边形可用 `clip-path: polygon(...)`。
- [x] C. 圆环进度可用 `conic-gradient` + mask。
- [x] D. 装饰性图形可用伪元素避免污染 DOM 语义。
- [ ] E. 所有复杂交互图形都应该强行用 border 实现。

**解释**：border 适合简单三角和气泡箭头。复杂图形和可交互图形更适合 SVG、Canvas 或专门图形方案。

### Q3 multiple | 图形动画与可访问性

关于 CSS 图形和加载动画，哪些实践正确？

- [x] A. spinner 可用圆形 border 和 `transform: rotate()`。
- [x] B. 动画图形要考虑 `prefers-reduced-motion`。
- [x] C. 加载状态应提供可读语义，例如 `role="status"` 或文字。
- [ ] D. 装饰性伪元素一定会被读屏作为重要内容朗读。
- [ ] E. 为了视觉效果可以忽略动画敏感用户。

**解释**：纯装饰通常不应进入语义内容；动画和 loading 需要兼顾性能和可访问性。

## css-016

### Q1 single | contain 作用

`contain` 属性主要告诉浏览器什么？

- [ ] A. 该元素要固定在视口内。
- [x] B. 该元素及其子树与页面其他部分相对独立，可限制样式、布局、绘制影响范围。
- [ ] C. 该元素必须继承所有父级样式。
- [ ] D. 该元素不能有子元素。

**解释**：contain 是性能和隔离提示，能帮助浏览器减少不必要的样式、布局和绘制工作。

### Q2 multiple | contain 值和副作用

关于 `contain`，哪些说法正确？

- [x] A. `contain: layout` 表示内部布局不影响外部。
- [x] B. `contain: paint` 会限制绘制范围，阴影或弹层可能被裁剪。
- [x] C. `contain: size` 表示元素尺寸不依赖子元素，没明确尺寸时可能不符合预期。
- [x] D. `contain: content` 约等于 layout、paint、style。
- [ ] E. `contain: strict` 可以放心全局加到所有元素上。

**解释**：contain 要用于边界清晰、尺寸可控的组件。`strict` 包含 size，滥用容易造成布局异常。

### Q3 multiple | content-visibility

关于 `content-visibility: auto`，哪些判断正确？

- [x] A. 可让浏览器跳过视口外内容的布局和绘制。
- [x] B. 适合长列表、长文档、首屏以下大块内容。
- [x] C. 配合 `contain-intrinsic-size` 可减少滚动跳动。
- [ ] D. 它会自动删除视口外 DOM 节点。
- [ ] E. 它适合替代所有虚拟列表方案。

**解释**：content-visibility 是渲染跳过，不是 DOM 虚拟化。超大列表仍可能需要虚拟滚动。

## css-017

### Q1 single | Layout 触发

下面哪类修改最容易触发 Layout/Reflow？

- [x] A. 修改 `width`、`margin`、`display`、`font-size`。
- [ ] B. 只修改合成层上的 `opacity`。
- [ ] C. 只修改合成层上的 `transform`。
- [ ] D. 修改 CSS 变量名但不被任何属性使用。

**解释**：几何信息变化会影响盒子尺寸或位置，通常需要布局计算。transform/opacity 在合成层上常可跳过 layout/paint。

### Q2 multiple | forced layout

哪些读取可能触发 forced synchronous layout？

- [x] A. `el.offsetWidth`
- [x] B. `el.getBoundingClientRect()`
- [x] C. `getComputedStyle(el).width`
- [ ] D. `el.dataset.id`
- [ ] E. `console.log('hello')`

**解释**：读取布局信息时，浏览器可能必须先把之前的样式写入计算完，造成同步布局。

### Q3 multiple | 性能优化

减少重排重绘时，哪些做法正确？

- [x] A. 批量 DOM 写入，避免读写交替。
- [x] B. 动画优先使用 `transform` 和 `opacity`。
- [x] C. 谨慎使用 `will-change`，用前验证，用后移除。
- [x] D. 用 `contain` 限制独立组件的影响范围。
- [ ] E. 动画 `left/top` 永远比 `transform` 更稳。

**解释**：`left/top` 改变布局位置，更容易触发布局和重绘。优化要用 DevTools 验证实际阶段。

## css-018

### Q1 single | 单行省略

单行文字省略号通常至少需要哪组属性？

- [x] A. `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`
- [ ] B. `display: flex; color: red;`
- [ ] C. `line-height: 0; visibility: hidden;`
- [ ] D. `word-break: break-all; height: auto;`

**解释**：单行省略依赖不换行、裁剪溢出和省略号绘制。Flex/Grid 子项还常需要 `min-width: 0`。

### Q2 multiple | 多行省略

关于多行省略，哪些说法正确？

- [x] A. 常用 `display: -webkit-box`。
- [x] B. 常用 `-webkit-line-clamp: 3`。
- [x] C. 需要 `-webkit-box-orient: vertical` 和 `overflow: hidden`。
- [ ] D. `text-overflow: ellipsis` 单独就能稳定实现多行省略。
- [ ] E. 多行省略会自动提供完整内容给触摸和读屏用户。

**解释**：多行省略常用 WebKit line clamp 组合。重要内容还需要可访问的展开、tooltip 或详情方案。

### Q3 multiple | 省略号失败排查

哪些可能导致省略号不生效或体验不完整？

- [x] A. flex 子项默认 `min-width: auto` 把容器撑开。
- [x] B. 没有设置 `overflow: hidden`。
- [x] C. 多行纯 CSS 兜底只是视觉模拟，可能遮挡内容。
- [x] D. 只用 `title` 对键盘、触摸屏和辅助技术不总友好。
- [ ] E. 设置 `white-space: nowrap` 会自动处理所有可访问性问题。

**解释**：省略号是视觉处理，不等于完整信息可达。布局和无障碍都要额外考虑。

## css-019

### Q1 single | hairline 问题

移动端“1px 问题”的根源是什么？

- [ ] A. CSS 不能画边框。
- [x] B. 高 DPR 屏幕上 1 个 CSS 像素对应多个物理像素，视觉上比设计稿物理 1px 更粗。
- [ ] C. 浏览器禁止使用小数像素。
- [ ] D. 只有 Android 存在 CSS 像素。

**解释**：设计稿里的细线常指物理像素。高 DPR 下 `1px` CSS 像素会映射到多个物理像素。

### Q2 multiple | 细线实现

哪些是常见 hairline 实现方式？

- [x] A. 直接使用 `border: 0.5px` 并验证目标浏览器效果。
- [x] B. 伪元素画 1px，再用 `transform: scaleY(0.5)`。
- [x] C. 使用 `min-resolution: 2dppx` 等 DPR 媒体查询调整缩放比例。
- [x] D. 用 `box-shadow` 或背景渐变模拟。
- [ ] E. 修改 viewport scale 是现代默认首选方案。

**解释**：viewport 缩放会影响整页尺寸、rem、手势和第三方组件，现在通常不作为首选。

### Q3 multiple | 四边框缩放

四边 hairline 方案中，哪些细节正确？

- [x] A. 伪元素通常设为 `width: 200%; height: 200%`。
- [x] B. 再用 `transform: scale(0.5)` 缩回。
- [x] C. `transform-origin: 0 0` 可保证缩放对齐左上角。
- [x] D. `pointer-events: none` 避免伪元素拦截交互。
- [ ] E. 伪元素缩放后会自动改变父元素布局尺寸。

**解释**：伪元素通常绝对定位，不参与父元素布局。缩放只影响视觉绘制。

## css-020

### Q1 single | em 参照

`em` 在非 `font-size` 属性上通常相对于什么计算？

- [ ] A. 浏览器视口宽度。
- [x] B. 当前元素计算后的字体大小。
- [ ] C. 根元素宽度。
- [ ] D. 父元素的 margin。

**解释**：`font-size` 上的 em 相对父元素字体大小；其他属性上的 em 通常相对当前元素计算后的 font-size。

### Q2 multiple | 单位选择

哪些单位选择更合理？

- [x] A. 边框、阴影、精细线条常用 px。
- [x] B. 全局字号和间距 token 常用 rem。
- [x] C. 页面视口相关布局可用 vw/vh/dvh。
- [x] D. 容器响应可用 cqw/cqi 等容器查询单位。
- [ ] E. 所有场景都应该统一用 px，响应式更简单。

**解释**：不同单位表达不同参照系。响应式布局应结合 rem、vw/dvh、百分比、fr、容器单位和 clamp。

### Q3 multiple | 现代视口与排版单位

关于现代 CSS 单位，哪些说法正确？

- [x] A. `dvh` 是动态视口高度，更适合移动端地址栏变化场景。
- [x] B. `ch` 约等于字符 `0` 的宽度，可用于控制文章行长。
- [x] C. `lh` 等于当前元素行高。
- [x] D. `clamp()` 可限制流式字体的最小和最大值。
- [ ] E. `100vh` 在所有移动端场景都能完美避开动态工具栏问题。

**解释**：移动端传统 `vh` 可能受地址栏影响。`svh/lvh/dvh` 能更精细表达视口高度。

## css-021

### Q1 single | 左固定右自适应

要实现“左侧 200px 固定，右侧自适应且不会被长内容撑破”，最稳妥的 Grid 写法是哪一个？

- [ ] A. `grid-template-columns: 200px 1fr`，右侧不需要额外处理。
- [x] B. `grid-template-columns: 200px minmax(0, 1fr)`。
- [ ] C. `grid-template-columns: auto auto`，再给右侧 `width: 100%`。
- [ ] D. `grid-template-columns: 200px fit-content(100%)`。

**解释**：`minmax(0, 1fr)` 允许自适应列收缩到 0，能避免长文本、表格或图片把主内容列撑破。

### Q2 multiple | 三栏布局选择

关于三栏布局和圣杯布局，哪些判断正确？

- [x] A. 现代页面骨架优先用 Grid 或 Flex。
- [x] B. 圣杯布局常见目标是 DOM 中主内容优先，视觉上左右固定、中间自适应。
- [x] C. Flex 三栏中，中间栏通常也需要 `min-width: 0` 处理内容溢出。
- [ ] D. 圣杯布局比 Grid 更适合现代响应式页面。
- [ ] E. 三栏布局必须使用 `position: absolute` 才能稳定。

**解释**：圣杯布局是 float 时代的兼容方案。新项目通常用 Grid/Flex，历史方案理解原理即可。

### Q3 multiple | 布局细节

设计两栏或三栏自适应布局时，哪些细节容易影响最终效果？

- [x] A. 主内容区里的长单词、代码块、表格可能导致列被撑开。
- [x] B. 移动端通常需要把多栏降级为单栏或上下排列。
- [x] C. 页面级二维布局更适合 Grid，组件内部一维分配更适合 Flex。
- [ ] D. 给中间栏写 `width: 100%` 就一定能避免溢出。
- [ ] E. 固定栏宽度越大，响应式表现一定越好。

**解释**：布局题的关键不只是写出两栏，还要处理内容溢出、断点和布局模型选择。

## css-022

### Q1 single | display 的双重含义

现代 CSS 中，`display` 更准确的理解是什么？

- [ ] A. 只决定元素是否独占一行。
- [x] B. 同时决定元素外部如何参与布局，以及内部子元素使用什么布局模型。
- [ ] C. 只决定子元素是 Flex 还是 Grid。
- [ ] D. 只影响元素是否可见，不影响布局。

**解释**：`display` 可以拆成 outer display 和 inner display，例如 `inline flex` 与传统 `inline-flex` 类似。

### Q2 multiple | display 值辨析

哪些说法正确？

- [x] A. `display: none` 会让元素不参与布局，通常也不进入无障碍树。
- [x] B. `display: inline-block` 外部按行内排列，内部可设置宽高。
- [x] C. `display: flow-root` 会创建 BFC，常用于清浮动和阻止 margin 折叠。
- [x] D. `display: contents` 会让元素自身不生成盒子，但 DOM 节点仍存在。
- [ ] E. `display: inline` 的 `width` 和 `height` 会像 block 一样生效。

**解释**：这些值的差异来自“外部布局参与方式”和“内部格式化上下文”两条线索。

### Q3 multiple | display: contents 风险

使用 `display: contents` 时，哪些判断更稳妥？

- [x] A. 它可用于不破坏 Grid/Flex 布局的语义包装。
- [x] B. 它只移除盒子，不等于移除 DOM 节点。
- [x] C. 交互元素和依赖可访问语义的结构要谨慎使用。
- [ ] D. 它等价于 `display: none`，只是名字不同。
- [ ] E. 它一定能保留所有浏览器和辅助技术中的语义表现。

**解释**：`display: contents` 很有用，但历史上可访问性支持有差异，不适合无脑套在交互结构上。

## css-023

### Q1 single | Grid 和 Flex 的核心差别

如果一个布局需要同时控制行和列，并且有跨行跨列的区域，优先选择什么？

- [ ] A. Flex，因为 Flex 天然是二维布局。
- [x] B. Grid，因为 Grid 适合二维布局和显式轨道控制。
- [ ] C. Float，因为 float 能自动处理所有跨列。
- [ ] D. Inline-block，因为它最适合复杂页面骨架。

**解释**：Flex 是一维布局，Grid 是二维布局。页面骨架、卡片网格和仪表盘通常更适合 Grid。

### Q2 multiple | 适用场景

哪些场景和布局模型匹配合理？

- [x] A. 导航栏按钮一行排列，用 Flex。
- [x] B. 页面 header/main/footer 三段骨架，用 Grid。
- [x] C. 卡片内部标题、正文、按钮纵向分布，用 Flex。
- [x] D. 图片画廊按列自适应，用 Grid。
- [ ] E. 所有布局都应该统一用 Flex，避免团队学习 Grid。

**解释**：Flex 和 Grid 可以混用。外层二维骨架用 Grid，内层一维对齐用 Flex 是常见组合。

### Q3 multiple | 混用策略

关于 Grid 和 Flex 混用，哪些说法正确？

- [x] A. Grid 容器里的单个 grid item 内部仍然可以使用 Flex。
- [x] B. Flex 卡片列表也可以在每张卡片内部使用 Grid 对齐局部区域。
- [x] C. 选择模型时应先看主问题是一维分配还是二维轨道。
- [ ] D. 一个页面里混用 Grid 和 Flex 会导致浏览器无法布局。
- [ ] E. Grid 只能用于整页，不能用于组件内部。

**解释**：现代 CSS 布局不是二选一。关键是让每层布局模型解决它擅长的问题。

## css-024

### Q1 single | Houdini 的定位

CSS Houdini 的核心目标是什么？

- [ ] A. 用 JS 替代所有 CSS。
- [x] B. 把部分 CSS 解析、属性类型、绘制、布局和动画能力开放给开发者。
- [ ] C. 让浏览器自动把所有动画变成 GPU 动画。
- [ ] D. 只用于给 Sass 增加变量功能。

**解释**：Houdini 是一组底层 CSS API，不是一个单独框架。它让 JS 能更结构化地参与 CSS 渲染管线。

### Q2 multiple | Houdini API 能力

哪些能力属于 Houdini 相关方向？

- [x] A. `CSS.registerProperty` 给自定义属性注册类型和初始值。
- [x] B. Paint Worklet 用 `paint(name)` 生成自定义背景或纹理。
- [x] C. Typed OM 用结构化对象读写 CSS 值，减少字符串拼接。
- [ ] D. `localStorage` 自动把 CSS 变量同步到服务端。
- [ ] E. `z-index` 自动计算最优层级。

**解释**：Houdini 关注 CSS 引擎接口。注册属性、绘制 worklet、Typed OM 都是典型能力。

### Q3 multiple | 生产使用注意

生产环境使用 Houdini 时，哪些做法正确？

- [x] A. 先做 feature detection，再提供降级方案。
- [x] B. 认识到 Worklet 环境受限，不能直接访问 DOM。
- [x] C. 简单图形优先考虑 CSS 或 SVG，不为炫技强上 Houdini。
- [x] D. 针对目标浏览器验证兼容性。
- [ ] E. 只要用了 Paint API，就不需要考虑性能。

**解释**：Houdini 能力强但支持度和成本差异大，实际项目应以兼容性、维护性和性能验证为准。

## css-025

### Q1 single | 平滑滚动可访问性

为页面启用平滑滚动时，哪项处理最必要？

- [ ] A. 给所有元素都加 `scroll-behavior: smooth`。
- [x] B. 在 `prefers-reduced-motion: reduce` 下关闭或弱化平滑滚动。
- [ ] C. 禁止键盘滚动，避免和动画冲突。
- [ ] D. 用 `setInterval` 每 16ms 手动滚动。

**解释**：平滑滚动和滚动动画可能影响眩晕敏感用户，应尊重系统的减少动态效果偏好。

### Q2 multiple | 滚动体验控制

哪些 CSS 能改善滚动容器体验或稳定性？

- [x] A. `overscroll-behavior: contain` 防止内部滚到底后带动外层。
- [x] B. `scroll-snap-type` 配合 `scroll-snap-align` 实现吸附。
- [x] C. `scroll-padding-top` 处理固定头部遮挡锚点。
- [x] D. `scrollbar-gutter: stable` 减少滚动条出现导致的布局抖动。
- [ ] E. 隐藏滚动条就等于禁用了滚动。

**解释**：滚动体验包括边界、吸附、锚点偏移、滚动条占位和可访问性，不只是滚得顺不顺。

### Q3 multiple | 滚动性能

关于滚动监听和长内容优化，哪些做法合理？

- [x] A. JS 滚动监听使用 passive listener，避免阻塞滚动。
- [x] B. 高频滚动更新放到 `requestAnimationFrame` 或节流逻辑里。
- [x] C. 长页面可用 `content-visibility: auto` 跳过视口外渲染。
- [ ] D. 每次 scroll 事件都同步读取布局再写样式是最佳实践。
- [ ] E. 滚动容器越多，性能一定越好。

**解释**：滚动性能的重点是减少主线程阻塞、避免布局抖动，并控制视口外内容渲染成本。

## css-026

### Q1 single | will-change 的本质

`will-change` 最准确的定位是什么？

- [ ] A. 强制某个属性一定只走 GPU。
- [x] B. 提前告诉浏览器某些属性即将变化，让浏览器有机会做优化。
- [ ] C. 自动修复所有动画卡顿。
- [ ] D. 替代 `transition` 和 `animation`。

**解释**：`will-change` 是优化提示，不是性能保证。它可能触发合成层准备，也可能带来额外成本。

### Q2 multiple | 正确使用 will-change

哪些做法更合理？

- [x] A. 在动画开始前短时间添加。
- [x] B. 动画结束后移除或恢复为 `auto`。
- [x] C. 主要用于 `transform`、`opacity` 等确实即将变化的属性。
- [ ] D. 全站所有卡片永久写 `will-change: transform`。
- [ ] E. 写 `will-change: all` 让浏览器自己猜。

**解释**：长期、大量、宽泛地使用 `will-change` 会增加内存和合成成本，可能适得其反。

### Q3 multiple | 滥用风险

滥用 `will-change` 可能造成哪些问题？

- [x] A. 产生过多合成层。
- [x] B. 增加内存占用和 GPU 纹理成本。
- [x] C. 纹理上传、合成和功耗开销变高。
- [x] D. DevTools 中看到 Layers 变复杂。
- [ ] E. CSS 选择器会全部失效。

**解释**：`will-change` 要用工具验证收益。优化提示用错了，可能把问题从卡顿变成内存和合成压力。

## css-027

### Q1 single | 手动主题优先级

暗色模式同时支持系统偏好和用户手动选择时，哪个优先级更合理？

- [ ] A. 永远使用系统偏好，不允许用户覆盖。
- [x] B. 用户手动选择优先；没有选择时才跟随系统偏好。
- [ ] C. 每次刷新随机选择亮色或暗色。
- [ ] D. 只用 CSS，不需要考虑持久化。

**解释**：主题是用户偏好。手动选择应持久化并优先于系统偏好，系统变化只影响未手动设置的用户。

### Q2 multiple | 暗色模式实现要点

哪些做法正确？

- [x] A. 用语义 CSS 变量管理颜色 token。
- [x] B. 设置 `color-scheme` 让原生控件和滚动条跟随主题。
- [x] C. 初始化主题脚本尽量早执行，减少明暗闪烁。
- [x] D. 重新检查暗色下的对比度、阴影、边框和状态色。
- [ ] E. 对整页统一 `filter: invert(1)` 就是完整暗色模式。

**解释**：暗色模式不是简单反色。变量、原生 UI、首屏防闪和视觉校验都要一起处理。

### Q3 multiple | 资源适配

关于暗色模式中的图片和资源，哪些判断正确？

- [x] A. 照片、图表和品牌图不应默认全局反色。
- [x] B. Logo、图标、插图可提供亮暗两套资源。
- [x] C. 单色图标可用变量或受控 filter 做主题适配。
- [ ] D. 暗色模式下所有图片都必须变成黑白。
- [ ] E. `color-scheme` 会自动重绘业务图片。

**解释**：图片资源需要按类型处理。照片、图表、品牌资产和 UI 图标的适配策略不同。

## css-028

### Q1 single | overflow: clip 与 hidden

`overflow: clip` 和 `overflow: hidden` 的关键区别是什么？

- [ ] A. `clip` 会自动创建滚动条。
- [x] B. `clip` 裁剪溢出但不创建滚动容器；`hidden/auto/scroll` 通常会创建滚动容器。
- [ ] C. `hidden` 不会裁剪内容。
- [ ] D. 两者完全等价。

**解释**：`overflow: clip` 更像纯裁剪。如果既要裁剪又要 BFC，可配合 `display: flow-root`。

### Q2 multiple | overflow 的副作用

哪些说法正确？

- [x] A. `overflow: hidden` 会裁剪内容，也可能让用户无法滚到被裁剪内容。
- [x] B. `overflow: auto` 比 `scroll` 更适合“溢出时才出现滚动条”的区域。
- [x] C. 为清浮动使用 `overflow: hidden` 可能误裁阴影、下拉层或焦点环。
- [x] D. `overflow` 会影响 sticky、滚动容器和裁剪边界。
- [ ] E. `overflow` 只影响视觉，不影响布局和滚动行为。

**解释**：`overflow` 常被当作小属性，但它会牵动 BFC、滚动容器、裁剪和定位行为。

### Q3 multiple | 常见使用场景

哪些场景适合用 overflow 相关能力处理？

- [x] A. 固定高度侧栏内部滚动。
- [x] B. 卡片图片按圆角裁剪。
- [x] C. 单行文本省略配合 `white-space: nowrap`。
- [x] D. 横向代码块使用 `overflow-x: auto`。
- [ ] E. 用 `overflow: hidden` 作为所有弹窗定位问题的通用解。

**解释**：overflow 很适合滚动、裁剪和省略，但不能滥用来掩盖层级、定位或布局问题。

## css-029

### Q1 single | 逻辑属性的价值

CSS 逻辑属性主要解决什么问题？

- [ ] A. 让 CSS 文件自动压缩。
- [x] B. 用 block/inline 方向表达布局，更好适配 RTL 和不同 writing-mode。
- [ ] C. 让所有长度单位自动换成 rem。
- [ ] D. 替代 Flex 和 Grid。

**解释**：逻辑属性不绑定物理左上右下，而是跟随文字方向和书写模式。

### Q2 multiple | 属性对应关系

哪些对应关系正确？

- [x] A. `margin-left` 在 LTR 中常对应 `margin-inline-start`。
- [x] B. `width` 常可对应逻辑尺寸 `inline-size`。
- [x] C. `height` 常可对应逻辑尺寸 `block-size`。
- [x] D. `left` 可对应 `inset-inline-start`。
- [ ] E. `padding-top` 对应 `padding-inline-end`。

**解释**：block 是块流方向，inline 是行内文字方向。LTR/RTL 下 inline-start 的物理方向会变化。

### Q3 multiple | 国际化细节

使用逻辑属性做国际化布局时，哪些判断正确？

- [x] A. `text-align: start` 能随方向切换文本起始对齐。
- [x] B. 图标间距可用 `margin-inline-end` 代替固定 `margin-right`。
- [x] C. 背景图位置、transform 和图标方向不一定自动逻辑化。
- [ ] D. 使用逻辑属性后就永远不需要处理 RTL 特例。
- [ ] E. `inset: 0` 是按逻辑方向设置四边。

**解释**：逻辑属性能减少方向相关覆盖，但复杂视觉资源和变换仍可能需要单独适配。

## css-030

### Q1 single | auto-fit 视觉效果

`repeat(auto-fit, minmax(200px, 1fr))` 在项目数量少于可容纳列数时通常会怎样？

- [ ] A. 保留空列，让已有项目保持 200px。
- [x] B. 折叠空列，让已有项目拉伸填满容器。
- [ ] C. 自动变成一列。
- [ ] D. 禁止项目换行。

**解释**：`auto-fit` 会折叠空轨道，已有项目获得更多空间；`auto-fill` 会保留空轨道位置。

### Q2 multiple | auto-fill 与 auto-fit

哪些说法正确？

- [x] A. 两者都常和 `repeat()`、`minmax()` 搭配做自适应列。
- [x] B. `auto-fill` 会尽可能填充轨道，即使部分轨道没有内容也保留空间。
- [x] C. `auto-fit` 更常用于卡片网格，让少量卡片填满容器。
- [x] D. 需要保留网格占位或拖拽对齐时，`auto-fill` 可能更合适。
- [ ] E. `auto-fill` 和 `auto-fit` 在任何情况下视觉都完全相同。

**解释**：区别通常在“空轨道是否保留”。项目刚好填满时可能看不出差别，项目少时差异明显。

### Q3 multiple | Grid 自适应细节

哪些写法或判断更稳妥？

- [x] A. `minmax(280px, 1fr)` 能设定卡片最小宽度和剩余空间分配。
- [x] B. `gap` 应参与响应式设计，不能只盯列宽。
- [x] C. 小屏下如果最小宽度过大，可能产生横向溢出。
- [ ] D. `1fr` 总是可以忽略内容最小宽度，不会被撑开。
- [ ] E. 自适应网格不需要考虑图片比例和卡片高度。

**解释**：自适应列数只是第一步，内容最小尺寸、间距、图片比例和溢出都决定最终体验。

## css-031

### Q1 single | spinner 动画属性

加载动画中，哪类属性通常更适合高频动画？

- [ ] A. `width` 和 `height`。
- [x] B. `transform` 和 `opacity`。
- [ ] C. `top` 和 `left`。
- [ ] D. `border-width` 和 `font-size`。

**解释**：`transform` 和 `opacity` 更容易走合成阶段，通常比频繁改几何属性更稳定。

### Q2 multiple | 加载状态可访问性

哪些做法更适合真实产品里的 loading？

- [x] A. 给加载指示器提供 `role="status"` 或可读文案。
- [x] B. 长时间 loading 提供具体状态、重试或取消入口。
- [x] C. 在 `prefers-reduced-motion: reduce` 下关闭或弱化循环动画。
- [ ] D. 只要动画足够明显，就不需要文本或语义提示。
- [ ] E. 所有 loading 都应该无限旋转，不需要超时策略。

**解释**：加载动画不是纯视觉装饰。用户要知道发生了什么，以及卡住时能做什么。

### Q3 multiple | 骨架屏和闪光效果

关于 skeleton shimmer，哪些判断正确？

- [x] A. 常用线性渐变和 `background-position` 制造扫光效果。
- [x] B. 要避免在大量列表项上同时创建过重动画。
- [x] C. 内容结构应尽量接近最终布局，减少加载完成后的跳动。
- [ ] D. 骨架屏越花哨，感知性能一定越好。
- [ ] E. 骨架屏可以替代实际错误处理。

**解释**：骨架屏的价值是稳定预期和减少等待焦虑，不是用动画掩盖慢请求或错误状态。

## css-032

### Q1 single | margin 折叠结果

相邻两个普通块元素，一个 `margin-bottom: 20px`，另一个 `margin-top: 30px`，两者间距通常是多少？

- [ ] A. `50px`。
- [x] B. `30px`。
- [ ] C. `20px`。
- [ ] D. `10px`。

**解释**：相邻垂直 margin 折叠时，两个正值通常取较大值，不是相加。

### Q2 multiple | 折叠发生条件

哪些场景可能发生垂直 margin 折叠？

- [x] A. 相邻普通块级兄弟元素。
- [x] B. 父元素和第一个子元素之间，且父元素没有 border、padding、BFC 等隔离。
- [x] C. 空块元素自身的上下 margin。
- [ ] D. Flex 容器中的 flex item 之间。
- [ ] E. 水平方向的 `margin-left` 和 `margin-right`。

**解释**：margin 折叠主要存在于普通块格式化上下文的垂直方向。Flex/Grid 子项不会折叠。

### Q3 multiple | 阻止折叠

哪些方式可以阻止或规避父子 margin 折叠？

- [x] A. 给父元素 `display: flow-root` 创建 BFC。
- [x] B. 给父元素加 `padding-top` 或 `border-top`。
- [x] C. 使用 Flex/Grid 布局并用 `gap` 管理间距。
- [ ] D. 给子元素设置更大的 `margin-top`。
- [ ] E. 给父元素设置 `color`。

**解释**：要阻止折叠，需要改变格式化上下文或用边框、内边距隔开，而不是继续调 margin 大小。

## css-033

### Q1 single | 无单位 line-height

为什么正文常推荐使用无单位 `line-height`？

- [ ] A. 因为无单位行高会被浏览器当作 `0`。
- [x] B. 因为它继承的是比例，子元素会按自己的 `font-size` 计算行高。
- [ ] C. 因为它可以自动让所有文本严格垂直居中。
- [ ] D. 因为只有无单位行高能设置动画。

**解释**：`line-height: 1.6` 继承比例，比继承固定像素或百分比结果更符合嵌套排版预期。

### Q2 multiple | vertical-align 辨析

哪些说法正确？

- [x] A. `vertical-align` 作用于 inline、inline-block、inline-table 或 table-cell。
- [x] B. 它对普通 block 元素的整体垂直居中无效。
- [x] C. `middle` 不是严格几何居中，而是和基线及 x-height 有关。
- [ ] D. Flex 容器里的垂直居中应该优先用 `vertical-align`。
- [ ] E. `vertical-align` 可以替代所有 `align-items`。

**解释**：`vertical-align` 是行内排版和表格单元格里的对齐属性，不是通用布局居中方案。

### Q3 multiple | 图片底部空隙

`img` 下方出现空隙时，哪些解释和处理正确？

- [x] A. 默认 `img` 是 inline-level replaced element，会按 baseline 对齐。
- [x] B. 基线下方会预留给文字下伸部的空间。
- [x] C. 可以把图片设为 `display: block`。
- [x] D. 也可以用 `vertical-align: bottom` 处理。
- [ ] E. 空隙一定是图片文件自带透明边。

**解释**：这类空隙来自 IFC 的基线对齐规则，不一定是图片素材问题。

## css-034

### Q1 single | CSS Columns 瀑布流限制

使用 CSS Columns 做瀑布流时，最重要的限制是什么？

- [ ] A. 不能自适应列宽。
- [x] B. 视觉顺序通常按列从上到下，可能和 DOM/阅读顺序不一致。
- [ ] C. 必须用 JavaScript 计算每个元素高度。
- [ ] D. 不能设置列间距。

**解释**：Columns 方案简单，但视觉顺序和键盘、读屏顺序可能不一致，内容排序要求高时要谨慎。

### Q2 multiple | 瀑布流方案选择

哪些判断正确？

- [x] A. 内容展示、顺序要求不高时，CSS Columns 可以是低成本方案。
- [x] B. 需要按最短列放置、图片加载后重排、无限滚动时，JS 方案更灵活。
- [x] C. Grid masonry 可作为渐进增强，但要验证目标浏览器支持。
- [ ] D. 瀑布流只能用 float 实现。
- [ ] E. CSS Columns 的视觉顺序一定等于按行从左到右。

**解释**：瀑布流没有单一最佳方案，要按顺序要求、兼容性和重排能力选择。

### Q3 multiple | 图片瀑布流稳定性

做图片瀑布流时，哪些措施能减少布局跳动？

- [x] A. 提前知道图片宽高或设置 `aspect-ratio`。
- [x] B. 使用占位图或占位尺寸。
- [x] C. 图片加载完成后再计算或修正布局。
- [x] D. 使用 ResizeObserver 监听尺寸变化。
- [ ] E. 等图片自然把页面撑开，不需要任何占位。

**解释**：瀑布流最怕图片尺寸未知导致重排。稳定尺寸信息是体验和性能的基础。

## css-035

### Q1 single | 渲染流水线顺序

浏览器从页面结构到屏幕输出的常见顺序更接近哪一个？

- [ ] A. Paint -> Layout -> DOM -> CSSOM -> Composite。
- [x] B. DOM/CSSOM -> Render/Layout Tree -> Layout -> Paint -> Composite。
- [ ] C. Composite -> Paint -> Layout -> CSSOM。
- [ ] D. CSSOM -> Composite -> DOM -> Layout。

**解释**：先解析结构和样式，再计算布局、绘制指令，最后合成输出。

### Q2 multiple | 属性变化成本

哪些判断通常成立？

- [x] A. 改 `width`、`margin`、`font-size` 通常会触发布局。
- [x] B. 改 `color`、`background` 通常至少涉及绘制。
- [x] C. 合成层上的 `transform`、`opacity` 动画通常可以只做合成。
- [ ] D. `display: none` 只影响合成，不影响布局树。
- [ ] E. 所有 `transform` 在任何场景都绝对不会触发 Paint。

**解释**：属性成本是经验规则，不是绝对保证。元素是否在合成层、效果组合和内容变化都会影响实际阶段。

### Q3 multiple | 避免布局抖动

哪些做法能降低运行时渲染成本？

- [x] A. 批量读写 DOM，避免写样式后马上读布局再写样式。
- [x] B. 动画优先使用 `transform` 和 `opacity`。
- [x] C. 大列表使用分页或虚拟滚动减少 DOM 数量。
- [x] D. 用 DevTools Performance/Layers 验证实际瓶颈。
- [ ] E. 给所有元素都加 `will-change`。

**解释**：性能优化要减少 Layout/Paint 和无效 DOM 工作，并通过工具确认瓶颈。

## css-036

### Q1 single | 移动导航关闭状态

移动端菜单关闭时，除了移出视口，还应处理什么？

- [ ] A. 让链接仍然可以被点击，方便快速打开。
- [x] B. 设置 `visibility`、`pointer-events` 或焦点管理，避免隐藏链接仍可交互。
- [ ] C. 删除所有 ARIA 属性。
- [ ] D. 把菜单固定为 `display: block` 即可。

**解释**：视觉隐藏不等于交互隐藏。关闭状态要避免鼠标、触摸、键盘和读屏状态不一致。

### Q2 multiple | 响应式导航可访问性

哪些做法正确？

- [x] A. 汉堡按钮使用 `aria-controls` 关联菜单。
- [x] B. `aria-expanded` 要和菜单打开状态同步。
- [x] C. 按钮文案或 `aria-label` 应区分打开和关闭菜单。
- [x] D. 覆盖层菜单应考虑 Escape 关闭和焦点管理。
- [ ] E. 只用三个横线图标即可，不需要按钮语义。

**解释**：导航菜单是交互控件，不是纯视觉动画。状态、焦点和键盘行为都属于完整实现。

### Q3 multiple | CSS/JS 分工

关于响应式导航实现，哪些判断合理？

- [x] A. CSS 负责断点、布局和过渡。
- [x] B. 少量 JS 负责打开状态和 ARIA 同步。
- [x] C. `prefers-reduced-motion` 下应关闭或弱化菜单过渡。
- [ ] D. checkbox hack 永远比 JS 更适合生产项目。
- [ ] E. 移动端菜单不需要处理点击外部关闭。

**解释**：真实产品中，样式和状态需要配合。只靠视觉切换容易漏掉可访问和交互细节。

## css-037

### Q1 single | font-display 取舍

正文 Web Font 通常更适合选择哪类 `font-display` 策略？

- [ ] A. `block`，让正文一直隐藏直到字体加载完成。
- [x] B. `swap` 或 `optional`，优先保证正文尽快可见。
- [ ] C. 删除所有 fallback 字体。
- [ ] D. 把字体文件内联到每个组件里。

**解释**：正文可读性优先。`swap` 或 `optional` 能减少 FOIT，具体取舍看品牌一致性和性能要求。

### Q2 multiple | 字体性能优化

哪些做法正确？

- [x] A. 优先使用 WOFF2。
- [x] B. 对大字体做子集化和 `unicode-range` 拆分。
- [x] C. 只 preload 首屏真正关键的字体。
- [x] D. 使用合理缓存策略。
- [ ] E. 把所有字重、所有语言字体都 preload。

**解释**：字体优化的关键是少、准、可缓存。过度 preload 会抢占其他关键资源。

### Q3 multiple | 字体导致 CLS

关于字体切换导致的布局偏移，哪些说法正确？

- [x] A. 自定义字体和 fallback 字体度量不同，会导致加载后重排。
- [x] B. 可以选择更接近的 fallback 字体降低差异。
- [x] C. 可用 `size-adjust`、`ascent-override` 等 metric override 精调。
- [ ] D. `font-display: swap` 一定不会产生任何布局变化。
- [ ] E. CLS 只和图片尺寸有关，和字体无关。

**解释**：字体加载会改变文字宽高和换行，进而影响布局。度量匹配是减少 CLS 的重要手段。

## css-038

### Q1 single | transform 为什么常更快

动画中使用 `transform: translateY(...)` 通常比改 `top` 更稳，是因为？

- [ ] A. `transform` 会改变文档流里的布局位置。
- [x] B. `transform` 改变的是绘制结果的变换矩阵，合适情况下可跳过 Layout/Paint。
- [ ] C. `top` 在浏览器中完全不可用。
- [ ] D. `transform` 会自动压缩图片。

**解释**：`top/left` 影响布局几何；`transform` 不改变布局盒位置，合成层上通常只需更新合成。

### Q2 multiple | transform 的副作用

哪些说法正确？

- [x] A. 非 `none` 的 transform 会创建新的 stacking context。
- [x] B. transform 可能成为绝对定位或固定定位后代的 containing block。
- [x] C. transform 后的视觉位置不会改变 `offsetTop` 等布局指标。
- [x] D. `transform-origin` 会影响旋转和缩放结果。
- [ ] E. transform 顺序不影响最终视觉。

**解释**：transform 是矩阵变换，顺序、原点、层叠上下文和定位包含块都会影响实际行为。

### Q3 multiple | 合成层策略

哪些优化策略更健康？

- [x] A. 动画前短时间添加 `will-change: transform, opacity`。
- [x] B. 动画结束后移除合成提示。
- [x] C. 用 DevTools 验证是否真的减少 Layout/Paint。
- [ ] D. 给所有元素加 `translateZ(0)`。
- [ ] E. 默认认为 `filter` 和 `backdrop-filter` 都一定只走合成。

**解释**：合成层是资源，不是免费午餐。只提升真正需要动画的元素，并用工具验证。

## css-039

### Q1 single | IFC 的职责

Inline Formatting Context 主要负责什么？

- [ ] A. 页面整体二维网格布局。
- [x] B. 行内级内容排成一行行 line box，并按基线、行高和对齐规则布局。
- [ ] C. 把所有元素变成绝对定位。
- [ ] D. 管理 JavaScript 事件冒泡。

**解释**：IFC 是文字、span、img、inline-block 图文混排背后的行内排版规则。

### Q2 multiple | IFC 现象

哪些问题可以用 IFC 规则解释？

- [x] A. 图片底部出现基线空隙。
- [x] B. 相邻 `inline-block` 因 HTML 空白出现间隙。
- [x] C. 单行省略依赖不换行、溢出裁剪和文本溢出。
- [x] D. float 会缩短附近 line box 的可用宽度。
- [ ] E. Grid 子项跨列是 IFC 造成的。

**解释**：IFC 处理行内内容排列、换行、基线、空白和图文环绕，不负责 Grid 轨道。

### Q3 multiple | line box 与 baseline

哪些说法正确？

- [x] A. 一行中最高或最低的 inline box 会影响 line box 高度。
- [x] B. `line-height`、字体度量和 replaced element 都可能参与行盒高度计算。
- [x] C. `vertical-align` 控制行内级盒子相对基线或行盒的垂直对齐。
- [ ] D. line box 高度永远等于父元素的 `font-size`。
- [ ] E. baseline 只存在于英文文本，中文排版不会受影响。

**解释**：行盒是多个行内级盒子共同决定的结果，不能简单等同于字体大小。

## css-040

### Q1 single | 视差滚动性能

视差滚动中，滚动过程中优先动画哪个属性更稳？

- [ ] A. `top`。
- [ ] B. `height`。
- [x] C. `transform`。
- [ ] D. `background-size`。

**解释**：视差层通常用 `transform` 移动，能减少布局和绘制压力。滚动中频繁改几何属性风险更高。

### Q2 multiple | 视差方案取舍

哪些判断正确？

- [x] A. `background-attachment: fixed` 简单，但移动端和性能表现要验证。
- [x] B. CSS 3D perspective 方案对结构、层叠上下文和滚动容器要求较高。
- [x] C. Scroll-driven Animations 可作为声明式渐进增强。
- [x] D. JS 方案应在 scroll 里记录状态，把 DOM 写入放进 `requestAnimationFrame`。
- [ ] E. 视差滚动越强，用户体验一定越好。

**解释**：视差是增强效果，不是核心信息。实现方案要看兼容性、结构复杂度和性能预算。

### Q3 multiple | 视差工程注意

上线视差效果前，哪些检查必要？

- [x] A. 压缩图片并控制视差层尺寸，避免超大纹理。
- [x] B. 用 passive scroll listener，避免阻塞滚动。
- [x] C. 在 `prefers-reduced-motion: reduce` 下关闭或弱化效果。
- [x] D. 用 Performance 面板检查 Paint、Layout 和掉帧。
- [ ] E. 给所有视差层永久设置 `will-change`。

**解释**：视差效果很容易变成滚动性能问题。性能验证和减少动态效果支持都不能省。

## css-041

### Q1 single | @layer 优先级

在普通 author 样式中，未分层样式和已分层样式谁的优先级更高？

- [x] A. 未分层普通样式会高于所有已分层普通样式。
- [ ] B. 已分层样式一定高于未分层样式。
- [ ] C. 两者只比较选择器长度，层没有影响。
- [ ] D. 只有 `!important` 才能让 @layer 生效。

**解释**：普通声明中，未分层样式是最高优先级逃逸口。因此大型项目最好约定全局 CSS 都进入明确 layer。

### Q2 multiple | @layer 工程治理

哪些做法符合 `@layer` 的最佳实践？

- [x] A. 集中声明层顺序，例如 `reset, base, components, utilities`。
- [x] B. 把 reset 和第三方库放在较低层。
- [x] C. 把业务覆盖或工具类放在较高层。
- [x] D. 用 `@import url(...) layer(name)` 导入第三方样式到指定层。
- [ ] E. 在项目中随意写未分层样式，让它自然覆盖一切。

**解释**：`@layer` 的价值是把覆盖关系显式化，减少靠选择器加长和 `!important` 抢优先级。

### Q3 multiple | important 特殊规则

关于 `@layer` 和 `!important`，哪些说法正确？

- [x] A. `!important` 会反转 layer 顺序，较早声明的层优先级更高。
- [x] B. 分层 important 声明会高于未分层 important 声明。
- [x] C. 工程上不应依赖大量 important 作为主要覆盖机制。
- [ ] D. `!important` 在 `@layer` 中完全失效。
- [ ] E. `@layer` 可以替代 CSS Modules 的局部作用域能力。

**解释**：`@layer` 管的是层叠顺序，不是作用域隔离。important 规则需要理解，但不应成为常规写法。

## css-042

### Q1 single | Token 分层

在大型主题系统中，业务组件最应该直接消费哪一层 token？

- [ ] A. 原始色板 token，例如 `--palette-blue-500`。
- [x] B. 语义 token 或组件 token，例如 `--color-danger-text`、`--button-bg`。
- [ ] C. 任意硬编码颜色值。
- [ ] D. 图片文件名。

**解释**：业务代码依赖语义用途更稳定。原始色板变化时，语义 token 可以保持组件 API 不变。

### Q2 multiple | Design Tokens 治理

哪些做法适合大型项目？

- [x] A. 用 JSON/YAML/Figma Tokens 等作为单一来源。
- [x] B. 通过构建脚本生成 CSS variables、TypeScript 类型和多端资源。
- [x] C. 对颜色 token 做对比度校验。
- [x] D. 对废弃 token 做迁移说明和 changelog。
- [ ] E. 允许业务组件随意写裸色值，后期再统一替换。

**解释**：主题系统难点不在变量语法，而在单一来源、生成链路、校验和迁移治理。

### Q3 multiple | CSS 变量主题切换

哪些说法正确？

- [x] A. CSS 变量天然支持级联，适合运行时主题切换。
- [x] B. `data-theme` 可作为亮暗主题或品牌主题的覆盖入口。
- [x] C. SSR 或静态首屏应尽早设置主题标记，避免闪烁。
- [x] D. `color-scheme` 应和当前主题同步。
- [ ] E. 只要用了 CSS 变量，就不需要设计 token 命名规范。

**解释**：CSS 变量提供机制，Design Tokens 提供语义和治理。两者配合才适合大型项目。

## css-043

### Q1 single | Scroll-driven Animations 概念

Scroll-driven Animations 和普通 CSS 动画的关键区别是什么？

- [ ] A. 它只能用 JavaScript 编写。
- [x] B. 它把动画时间轴从真实时间改为滚动进度或元素可见性进度。
- [ ] C. 它会自动让所有属性只走合成。
- [ ] D. 它只能用于加载动画。

**解释**：滚动驱动动画让“滚到哪里，动画播到哪里”，适合进度条、入场、视差等场景。

### Q2 multiple | scroll() 与 view()

哪些判断正确？

- [x] A. `animation-timeline: scroll(root block)` 可绑定根滚动容器的 block 方向滚动进度。
- [x] B. 命名 scroll timeline 适合组件内部滚动容器。
- [x] C. `animation-timeline: view(block)` 使用元素进入和离开视口的过程作为时间轴。
- [x] D. `animation-range` 可限制动画在 entry、exit、cover 等区间播放。
- [ ] E. `view()` 等价于 IntersectionObserver 的 JavaScript API 调用。

**解释**：`scroll()` 关注滚动容器进度，`view()` 关注元素可见性过程。它们是 CSS 声明式能力。

### Q3 multiple | 渐进增强

使用 Scroll-driven Animations 时，哪些做法合理？

- [x] A. 用 `@supports (animation-timeline: scroll())` 或 `view()` 包裹增强效果。
- [x] B. 不支持时提供静态样式、IntersectionObserver 或 rAF 降级。
- [x] C. 仍然优先动画 `transform` 和 `opacity`。
- [x] D. 配合 `prefers-reduced-motion` 降低动态效果。
- [ ] E. 有了滚动时间轴就可以安全动画 `height`、`top` 和复杂滤镜。

**解释**：滚动驱动只改变时间轴，不自动解决属性性能、兼容性和可访问性问题。

## css-044

### Q1 single | 容器查询解决的问题

容器查询最适合解决哪类问题？

- [ ] A. 根据当前时间切换主题。
- [x] B. 组件根据所在容器尺寸调整内部布局，而不是只看视口尺寸。
- [ ] C. 替代所有 JavaScript 状态管理。
- [ ] D. 自动压缩图片资源。

**解释**：媒体查询看视口，容器查询看祖先容器。它让组件在侧栏、弹窗、主内容区中更可复用。

### Q2 multiple | container-type

哪些说法正确？

- [x] A. `container-type: inline-size` 是常见选择，通常查询容器宽度方向。
- [x] B. `container: card / inline-size` 同时声明名称和类型。
- [x] C. `container-type: size` 会引入更强尺寸包含，使用要谨慎。
- [ ] D. `container-type: normal` 可以进行尺寸查询。
- [ ] E. 容器查询总是查询元素自身尺寸，不需要祖先容器。

**解释**：容器查询依赖合适的查询容器。通常给外层壳声明容器，再改内部元素样式。

### Q3 multiple | 容器查询实践

哪些实践更稳妥？

- [x] A. 默认样式先可用，再用 `@supports` 增强容器查询。
- [x] B. 媒体查询负责页面级断点，容器查询负责组件内部响应。
- [x] C. 使用 `cqi`、`cqw` 等容器单位时要理解查询容器来源。
- [x] D. 避免让元素直接根据自己的尺寸改自己，造成循环依赖风险。
- [ ] E. 有了容器查询后就不需要任何媒体查询。

**解释**：容器查询和媒体查询是互补关系。组件级响应增强了复用，但页面级结构仍需要媒体查询。

## css-045

### Q1 single | float 的现代定位

现代 CSS 中，`float` 最适合保留在哪类场景？

- [x] A. 图文环绕。
- [ ] B. 页面主布局。
- [ ] C. 复杂仪表盘二维布局。
- [ ] D. 响应式导航栏对齐。

**解释**：现代页面布局优先 Flex/Grid。`float` 的原始强项是让文字围绕浮动元素排版。

### Q2 multiple | 清除浮动

哪些方式可以处理父元素包含内部浮动的问题？

- [x] A. `.clearfix::after { content: ''; display: block; clear: both; }`
- [x] B. 给父元素 `display: flow-root`。
- [x] C. 给父元素创建 BFC，例如 `overflow: hidden`，但要注意裁剪副作用。
- [ ] D. 给父元素设置 `color: transparent`。
- [ ] E. 给浮动子元素设置更大的 `z-index`。

**解释**：浮动子元素脱离普通流，父元素高度可能塌陷。清浮动本质是让父元素重新包住浮动或让后续元素避开浮动。

### Q3 multiple | clear 的含义

关于 `clear`，哪些说法正确？

- [x] A. `clear` 作用在当前元素自己身上。
- [x] B. `clear: both` 表示当前元素两侧都不允许有浮动元素。
- [x] C. 它会让当前元素移动到相关浮动元素下方。
- [ ] D. `clear` 会直接删除前一个浮动元素的 `float`。
- [ ] E. `clear` 只能写在伪元素上，普通元素不能用。

**解释**：`clear` 不是修改浮动元素，而是改变当前元素对浮动的避让行为。

## css-046

### Q1 single | 透明但仍可交互

哪个隐藏方式会保留布局，并且元素仍可能响应点击和聚焦？

- [ ] A. `display: none`。
- [ ] B. `visibility: hidden`。
- [x] C. `opacity: 0`。
- [ ] D. `hidden` 属性一定等同于 `opacity: 0`。

**解释**：`opacity: 0` 只是视觉透明，元素仍在页面中，通常还会参与命中测试和辅助技术访问。

### Q2 multiple | 三种隐藏方式

哪些说法正确？

- [x] A. `display: none` 不占位，后代也不能单独显示出来。
- [x] B. `visibility: hidden` 占位，后代可以设置 `visibility: visible` 重新显示。
- [x] C. `opacity: 0` 占位且透明，淡入淡出常用它。
- [x] D. `display` 切换通常会影响布局。
- [ ] E. 三者对事件命中、布局和可访问性的影响完全相同。

**解释**：隐藏方式选择取决于是否占位、是否需要动画、是否可交互以及是否应暴露给辅助技术。

### Q3 multiple | 弹窗淡出实践

做弹窗淡入淡出时，哪些处理更完整？

- [x] A. 透明关闭状态配合 `pointer-events: none`。
- [x] B. 根据状态处理 `aria-hidden` 或语义可见性。
- [x] C. 管理焦点，避免键盘进入不可见内容。
- [x] D. 动画结束后可切换到彻底隐藏，减少不可见内容干扰。
- [ ] E. 只设置 `opacity: 0` 就能完成所有隐藏语义。

**解释**：动画隐藏和语义隐藏是两件事。真实交互需要同时处理视觉、事件、焦点和辅助技术。

## css-047

### Q1 single | em 的适用场景

组件按钮的 padding 希望跟随按钮字号一起缩放，最适合使用什么单位？

- [ ] A. 只用固定 `px`。
- [x] B. `em`。
- [ ] C. `vh`。
- [ ] D. `deg`。

**解释**：`em` 在非 `font-size` 属性上通常相对当前元素计算后的字体大小，很适合组件内部随字号缩放的间距。

### Q2 multiple | px/em/rem 选择

哪些选择合理？

- [x] A. 边框、阴影、少量固定图标尺寸常用 `px`。
- [x] B. 全局字号、页面间距和排版节奏常用 `rem`。
- [x] C. 组件内部想随字号缩放的 padding、gap、圆角可用 `em`。
- [x] D. 响应式字号可用 `clamp()` 结合 `rem + vw` 并设置上下限。
- [ ] E. 所有尺寸都统一改成 `px` 才是响应式最佳实践。

**解释**：单位表达参照系。好用的 CSS 尺寸系统通常混合 px、em、rem、百分比、fr 和 clamp。

### Q3 multiple | 根字号与用户偏好

关于 `rem` 和根字号，哪些说法正确？

- [x] A. `rem` 相对根元素字体大小。
- [x] B. `html { font-size: 100%; }` 通常更尊重用户默认字号。
- [x] C. 把根字号固定成特殊比例可能影响用户偏好和第三方组件预期。
- [ ] D. `rem` 会随着每层父元素字体大小逐级变化。
- [ ] E. 用户缩放页面时 CSS px 完全不会被放大。

**解释**：`rem` 比 `em` 更不受组件嵌套影响，但根字号策略仍要尊重可访问性和生态预期。

## css-048

### Q1 single | Tailwind 核心

Tailwind 的核心抽象更接近哪一个？

- [ ] A. 每个组件都必须写一个语义 CSS class。
- [x] B. 用受设计 token 约束的原子工具类组合样式。
- [ ] C. 运行时根据用户点击生成 CSS。
- [ ] D. 只提供 CSS reset。

**解释**：Tailwind 的重点不是“不写 CSS”，而是把样式表达放到可组合的工具类和设计 token 体系里。

### Q2 multiple | 动态 class 陷阱

哪些写法或判断正确？

- [x] A. `bg-${color}-600` 这类拼接可能无法被扫描器识别完整 class。
- [x] B. 把完整 class 写进映射表更可靠。
- [x] C. 外部组件库或非默认路径需要用 `@source` 或配置纳入扫描。
- [x] D. 任意值 class 也需要在源码中以完整 token 出现。
- [ ] E. Tailwind 会在浏览器运行时自动猜出所有动态 class。

**解释**：Tailwind 产物来自源码扫描。扫描不到完整 class，就不会生成对应 CSS。

### Q3 multiple | Tailwind 适配场景

哪些说法更客观？

- [x] A. Tailwind 适合组件化、设计系统明确、快速迭代的项目。
- [x] B. 复杂组件 class 很长时，需要抽组件或用 class 合并工具治理。
- [x] C. 团队应统一格式化、排序、冲突合并和 token 规范。
- [x] D. 高度定制项目也能用 Tailwind，但更依赖工程约束。
- [ ] E. 使用 Tailwind 后就不需要理解 CSS 层叠和布局。

**解释**：Tailwind 降低了命名和样式分散成本，但没有消除 CSS 基础、组件抽象和团队规范问题。

## css-049

### Q1 single | Sticky Footer 定义

Sticky Footer 和 `position: fixed` footer 的关键区别是什么？

- [ ] A. Sticky Footer 永远悬浮在视口底部。
- [x] B. 内容不足一屏时 footer 贴底，内容超过一屏时跟随文档自然出现在内容后。
- [ ] C. Sticky Footer 必须遮挡页面底部内容。
- [ ] D. Sticky Footer 只能用 JavaScript 实现。

**解释**：Sticky Footer 不是固定悬浮页脚，而是文档布局里的自然贴底效果。

### Q2 multiple | 实现方案

哪些方案适合现代 Sticky Footer？

- [x] A. `body` 使用列向 Flex，`main { flex: 1 0 auto; }`。
- [x] B. `body` 使用 Grid，`grid-template-rows: auto 1fr auto`。
- [x] C. 移动端可考虑 `100dvh` 处理动态地址栏。
- [ ] D. 永远用 `position: fixed`，不需要给内容留空间。
- [ ] E. 用固定 footer 高度的 `calc()` 是现代首选。

**解释**：Flex 和 Grid 都能让主内容吃掉剩余空间。fixed 是悬浮页脚，语义和体验不同。

### Q3 multiple | 移动端与安全区域

关于页脚布局，哪些细节值得注意？

- [x] A. fixed footer 可能遮挡内容，需要额外 padding。
- [x] B. 移动端键盘、动态地址栏和安全区域会影响 fixed/footer 体验。
- [x] C. `min-height: 100vh; min-height: 100dvh;` 可以作为渐进写法。
- [ ] D. footer 高度在所有设备上都应该写死。
- [ ] E. Sticky Footer 不需要考虑内容超过一屏的情况。

**解释**：页脚题容易混淆 sticky footer 和 fixed footer。真实页面要同时处理短内容和长内容。

## css-050

### Q1 single | 等高列首选

三列卡片在同一行内需要等高，现代 CSS 最常用的基础方案是什么？

- [ ] A. padding-bottom: 9999px 加负 margin。
- [x] B. Flex 或 Grid 的 stretch 对齐。
- [ ] C. 每张卡片用 JS 固定高度。
- [ ] D. 全部使用 float。

**解释**：Flex/Grid 默认就能处理同一行或同一轨道的拉伸，老式视觉等高方案维护成本高。

### Q2 multiple | Flex 与 Grid 等高

哪些判断正确？

- [x] A. Flex 的等高发生在同一 flex line 内。
- [x] B. Flex 换行后，每一行只和本行最高项等高。
- [x] C. Grid 同一行轨道会按最高内容撑开。
- [x] D. 多行卡片如果目标是瀑布流，Grid 等高行可能不是想要的效果。
- [ ] E. Flex 可以天然让所有换行后的卡片跨行等高。

**解释**：等高范围取决于布局模型。跨行等高、瀑布流和卡片内部对齐是不同问题。

### Q3 multiple | 卡片底部按钮对齐

商品卡片等高后，还希望按钮贴底，哪些做法合理？

- [x] A. 外层列表负责卡片等高。
- [x] B. 卡片内部使用 `display: flex; flex-direction: column`。
- [x] C. 正文区域 `flex: 1` 或按钮区 `margin-top: auto`。
- [ ] D. 给所有标题写固定高度并截断就是唯一方案。
- [ ] E. 用 `position: absolute` 把按钮压到底，不需要考虑内容流。

**解释**：外层解决等高，内层解决底部对齐，是卡片布局里很常见的组合。

## css-051

### Q1 single | filter 与 backdrop-filter

`filter` 和 `backdrop-filter` 的核心区别是什么？

- [ ] A. 二者完全相同。
- [x] B. `filter` 作用于元素自身及内容，`backdrop-filter` 作用于元素背后的已绘制内容。
- [ ] C. `filter` 只能用于文字，不能用于图片。
- [ ] D. `backdrop-filter` 不需要透明背景也能看到毛玻璃效果。

**解释**：毛玻璃效果依赖处理背后的内容，并且前景元素通常需要半透明背景才能看见效果。

### Q2 multiple | drop-shadow 与 box-shadow

哪些说法正确？

- [x] A. `drop-shadow()` 根据渲染后的 alpha 轮廓投影。
- [x] B. `box-shadow` 基于元素边框盒投影。
- [x] C. 透明 PNG 或 SVG 图标的不规则阴影常适合 `drop-shadow()`。
- [x] D. `box-shadow` 支持 spread、inset 等能力。
- [ ] E. `drop-shadow()` 完全替代了 `box-shadow`。

**解释**：两者服务的形状模型不同。规则盒子阴影和不规则透明轮廓阴影不能简单互换。

### Q3 multiple | filter 性能和层叠

使用滤镜时，哪些判断正确？

- [x] A. 非 `none` 的 `filter` 通常会创建新的 stacking context。
- [x] B. 大面积 `blur()` 和 `backdrop-filter` 成本较高。
- [x] C. 动画滤镜前应通过 DevTools 检查 Paint 和 Composite。
- [x] D. 暗色模式不应简单全站 `invert()`。
- [ ] E. 所有滤镜动画都保证只走 GPU 合成且零成本。

**解释**：滤镜很容易影响绘制和合成成本，尤其是模糊、毛玻璃和大面积滚动场景。

## css-052

### Q1 single | 主题首屏防闪

为了减少页面先亮后暗或先暗后亮，主题初始化脚本应放在哪里更合理？

- [x] A. 尽量放在首屏 CSS 生效前或非常靠前的位置。
- [ ] B. 放到所有图片加载完成后。
- [ ] C. 放到用户第一次点击页面后。
- [ ] D. 不需要初始化，CSS 会自动读取 localStorage。

**解释**：浏览器不会在 CSS 中直接读取 localStorage。主题标记越早设置，首屏闪烁越少。

### Q2 multiple | 主题切换过渡

哪些做法更稳妥？

- [x] A. 只对颜色、背景、边框、阴影等颜色相关属性做受控过渡。
- [x] B. 切换时临时添加动画类，结束后移除。
- [x] C. 尊重 `prefers-reduced-motion`。
- [ ] D. 给 `*` 设置全局 transition，所有属性都动画。
- [ ] E. 主题切换时动画布局尺寸，制造更强视觉变化。

**解释**：全局通配 transition 会影响弹窗、布局和第三方组件。主题过渡应小范围、可控、可关闭。

### Q3 multiple | system 模式

如果主题支持 `light`、`dark`、`system`，哪些处理正确？

- [x] A. 存储用户选择的模式，而不是只存当前实际亮暗结果。
- [x] B. `system` 模式下监听 `(prefers-color-scheme: dark)` 变化。
- [x] C. 实际应用主题时根据模式计算当前亮暗。
- [x] D. `color-scheme` 和 token 覆盖要同步。
- [ ] E. 用户选择 `system` 后就不需要再响应系统变化。

**解释**：`system` 是一种模式，不是一次性结果。系统偏好变化后，实际主题应随之更新。

## css-053

### Q1 single | 交错动画延迟来源

动态列表做交错入场时，哪种方式比写大量 `nth-child` 更灵活？

- [ ] A. 给所有元素写同一个固定 `animation-delay`。
- [x] B. 用自定义属性传入索引，再用 `calc(var(--i) * step)` 计算延迟。
- [ ] C. 给每个元素随机设置 `position: absolute`。
- [ ] D. 动画 `height: auto`。

**解释**：自定义属性能把动态索引从 JS 或模板传给 CSS，避免为未知数量写大量选择器。

### Q2 multiple | 交错动画性能

哪些做法合理？

- [x] A. 优先动画 `transform` 和 `opacity`。
- [x] B. 列表很长时只给进入视口的元素触发动画。
- [x] C. 交错延迟不要过长，避免界面显得迟钝。
- [x] D. 在 `prefers-reduced-motion` 下关闭或弱化动画。
- [ ] E. 首屏同时给几百个项目创建复杂动画一定没问题。

**解释**：交错动画的目标是增强层次，不应拖慢首屏或让用户等待控件出现。

### Q3 multiple | 触发方式选择

哪些判断正确？

- [x] A. 固定数量入口可用 `nth-child`。
- [x] B. 动态网格可由 JS 或模板写入 `--i`。
- [x] C. 滚动入场可用 IntersectionObserver。
- [x] D. Scroll-driven Animations 可作为支持浏览器中的渐进增强。
- [ ] E. 所有滚动入场都必须用 scroll 事件手写计算。

**解释**：触发方式要看数量、动态性、兼容性和滚动场景。不要把所有动画都压到 scroll 事件里。

## css-054

### Q1 single | CSS 性能两大阶段

CSS 性能主要可以分成哪两类问题？

- [ ] A. 变量命名和注释格式。
- [x] B. 加载阶段是否阻塞首屏，运行阶段是否造成 Layout/Paint/Composite 开销。
- [ ] C. 只看选择器长度。
- [ ] D. 只看颜色数量。

**解释**：CSS 既会影响资源加载和首屏，也会影响交互时的样式计算、布局、绘制和合成。

### Q2 multiple | 加载阶段优化

哪些做法有助于加载阶段 CSS 性能？

- [x] A. 提取首屏 critical CSS。
- [x] B. 按路由或组件拆分非首屏样式。
- [x] C. 删除未使用 CSS，压缩并开启 Brotli/Gzip。
- [x] D. 第三方组件库按需引入样式。
- [ ] E. 把所有页面样式打进一个巨大 CSS 文件最利于首屏。

**解释**：首屏需要的 CSS 越少越准越快，浏览器越早能完成渲染阻塞资源处理。

### Q3 multiple | 运行阶段优化

哪些做法更符合运行时 CSS 性能优化？

- [x] A. 动画优先使用 `transform`、`opacity`。
- [x] B. `will-change` 只给即将动画的元素短时间使用。
- [x] C. 用 `contain` 限制独立组件的影响范围。
- [x] D. 长内容可用 `content-visibility: auto` 并提供合理 intrinsic size。
- [ ] E. 为了选择器最快，牺牲所有可维护性去写最短 class。

**解释**：选择器匹配通常不是最大瓶颈。更重要的是减少布局、绘制、合成和不必要的渲染范围。

## css-055

### Q1 single | Subgrid 解决的问题

CSS Subgrid 主要解决什么？

- [ ] A. 让 CSS Grid 自动变成瀑布流。
- [x] B. 让嵌套网格在某个方向复用父网格轨道，实现跨层级对齐。
- [ ] C. 让 Flex 子项自动换行。
- [ ] D. 让所有元素自动等高。

**解释**：Subgrid 的核心是复用父网格轨道，解决嵌套内容和外层网格精确对齐的问题。

### Q2 multiple | Subgrid 使用条件

哪些说法正确？

- [x] A. 元素必须先是父 grid 的 item，再把自己设为 grid container。
- [x] B. 子网格复用的是它跨越范围内的父网格轨道。
- [x] C. 可以只在列方向或行方向使用 `subgrid`。
- [x] D. gap 会继承父网格，也可以在子网格上覆盖。
- [ ] E. 任意普通 block 元素都能直接使用 `grid-template-columns: subgrid` 继承祖先网格。

**解释**：Subgrid 不是“全局继承任意祖先网格”，它依赖元素在父网格中的跨轨道范围。

### Q3 multiple | Subgrid 降级和场景

哪些判断合理？

- [x] A. 卡片内部标题、正文、按钮跨卡片对齐是 subgrid 的典型场景。
- [x] B. 页面内容区和 full-bleed 区域跨嵌套层级对齐也适合 subgrid。
- [x] C. 上线前可用 `@supports (grid-template-columns: subgrid)` 做增强和降级。
- [ ] D. Subgrid 等同于 Masonry 瀑布流。
- [ ] E. 使用 Subgrid 后不需要考虑浏览器兼容性。

**解释**：Subgrid 解决的是轨道对齐，不是瀑布流。作为较新的能力，应按目标浏览器做渐进增强。
