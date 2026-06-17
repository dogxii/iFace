# Vue 测试一下

## vue-001

### Q1 single | createApp 时机

Vue 3 中 `createApp(App)` 和 `app.mount('#app')` 的职责区分，哪项最准确？

- [ ] A. `createApp` 会立刻把根组件渲染到 DOM，`mount` 只负责注册插件。
- [x] B. `createApp` 创建应用实例和 app context，`mount` 才真正启动根组件渲染并接管容器。
- [ ] C. `createApp` 只能创建一个全局单例，多个应用会共享配置。
- [ ] D. `mount` 只会生成虚拟 DOM，不会操作真实 DOM。

**解释**：Vue 3 先创建独立 app 实例，再通过 `use/component/directive/provide` 配置应用级能力，最后 `mount` 创建根组件实例并 patch 到 DOM。

### Q2 multiple | 应用级配置

哪些能力通常应该通过 Vue 3 的 app 实例配置？

- [x] A. `app.use(router)` 注册插件。
- [x] B. `app.component()` 注册全局组件。
- [x] C. `app.directive()` 注册全局指令。
- [x] D. `app.provide()` 提供应用级依赖。
- [ ] E. 在 `createApp` 前访问根组件的真实 DOM 节点。

**解释**：app 实例是应用级上下文入口。真实 DOM 要等挂载后才可依赖，不能在 `createApp` 前当作已渲染结果访问。

### Q3 multiple | Vue 2 与 Vue 3 差异

关于 Vue 3 app 实例相对 Vue 2 全局构造器的变化，哪些说法正确？

- [x] A. Vue 3 更利于多个应用实例在同一页面共存。
- [x] B. 插件、全局组件和指令配置被收敛到具体 app 上，减少全局污染。
- [x] C. `createApp` 接收根组件并创建独立 app context。
- [ ] D. Vue 3 推荐所有项目继续用 `new Vue({ render }).$mount()`。
- [ ] E. 一个页面有多个 app 时，它们一定共享同一套路由和 store。

**解释**：Vue 3 的应用实例让全局配置变成 app 级配置。多个 app 可以有不同插件、组件和 provide 配置。

## vue-002

### Q1 single | 模板编译

Vue 模板和响应式渲染之间的关系，哪项更准确？

- [ ] A. 模板会在浏览器里直接作为字符串拼接成 HTML。
- [x] B. 模板会被编译成 render 函数，render 读取响应式状态并返回虚拟 DOM。
- [ ] C. 模板表达式可以写任意多条语句和副作用逻辑。
- [ ] D. 模板里的响应式读取不会参与依赖收集。

**解释**：模板是声明式 UI 描述，最终会变成 render 函数。复杂逻辑应移到 computed、方法或 composable 中。

### Q2 multiple | 指令匹配

下面哪些指令用途匹配正确？

- [x] A. `v-bind` 或 `:` 用来动态绑定属性。
- [x] B. `v-on` 或 `@` 用来绑定事件。
- [x] C. `v-if` 会按条件创建或销毁节点。
- [x] D. `v-for` 用来渲染列表，并应提供稳定 key。
- [ ] E. `v-show` 会在条件为假时销毁组件实例。

**解释**：`v-show` 只是切换 `display`，节点和组件实例仍保留。`v-if` 才是真正的条件创建/销毁。

### Q3 multiple | 模板注意点

关于 Vue 模板写法，哪些实践更合理？

- [x] A. 模板表达式保持简单，复杂逻辑放到 computed 或方法里。
- [x] B. 避免在模板中调用有副作用的函数。
- [x] C. Vue 3 中同一元素同时写 `v-if` 和 `v-for` 容易造成理解和优先级问题。
- [x] D. 列表过滤通常先用 computed 得到过滤后的数组。
- [ ] E. 在模板里直接发请求可以保证每次渲染都拿到最新数据，是推荐做法。

**解释**：模板可能随状态变化重复执行，副作用应放到事件、watch 或生命周期里。列表过滤放在 computed 中更清晰。

## vue-003

### Q1 single | ref 与 reactive

什么时候更适合优先使用 `ref`？

- [ ] A. 只能用于对象，不能用于数字或字符串。
- [x] B. 状态是原始值、可能整体替换，或需要跨函数返回和解构时。
- [ ] C. 需要完全避免 `.value` 时。
- [ ] D. 想让对象解构后每个字段自动保持响应式时。

**解释**：`ref` 用 `.value` 包装值，适合原始类型和可整体替换的状态。模板中会自动解包，脚本中要显式 `.value`。

### Q2 multiple | reactive 边界

关于 `reactive`，哪些说法正确？

- [x] A. 它返回对象的 Proxy，适合一组稳定引用的对象状态。
- [x] B. 直接解构 `reactive` 对象会丢失响应式连接。
- [x] C. 需要解构时可使用 `toRef` 或 `toRefs`。
- [x] D. 不适合直接整体替换成新对象来表达状态变化。
- [ ] E. 它最适合包装普通数字、字符串和布尔值。

**解释**：`reactive` 依赖代理对象本身保持稳定。解构会把属性值取出来，失去和原代理的连接。

### Q3 multiple | 团队实践

关于 `ref` / `reactive` 的选择，哪些判断合理？

- [x] A. 简单值、异步数据和 composable 返回值常优先用 `ref`。
- [x] B. 表单对象或复杂配置对象可以用 `reactive` 聚合。
- [x] C. 默认 `ref`、需要对象聚合时再用 `reactive` 有利于拆分逻辑。
- [ ] D. `reactive` 包出来的对象可以任意整体赋值且依赖自动迁移。
- [ ] E. `ref` 在模板和脚本中都必须写 `.value`。

**解释**：模板会自动解包 ref；脚本中才需要 `.value`。`reactive` 的旧引用不会自动跟随新对象迁移。

## vue-004

### Q1 single | computed 定位

以下哪种场景最适合使用 `computed`？

- [ ] A. 监听 keyword 变化后发请求。
- [x] B. 根据 `list` 和 `keyword` 计算过滤后的列表，并希望依赖不变时复用缓存。
- [ ] C. 组件挂载后添加 window 事件监听。
- [ ] D. 每次状态变化都执行日志上报。

**解释**：`computed` 用来声明派生状态，有返回值、惰性求值和缓存。副作用应使用 watch、watchEffect 或生命周期。

### Q2 multiple | watch 与 watchEffect

关于 `watch` 和 `watchEffect`，哪些说法正确？

- [x] A. `watch` 监听明确数据源，默认懒执行。
- [x] B. `watch` 能拿到新值和旧值。
- [x] C. `watchEffect` 默认立即执行，并自动追踪同步执行期间读到的依赖。
- [x] D. 异步 `watchEffect` 中只有 `await` 前同步读到的依赖会被追踪。
- [ ] E. `watchEffect` 永远比 `watch` 更可控。

**解释**：`watchEffect` 写起来省依赖声明，但依赖来源不如 `watch` 清晰。需要精确控制源、新旧值或执行时机时通常选 `watch`。

### Q3 multiple | 选择原则

面对 `computed`、`watch`、`watchEffect`，哪些选择更准确？

- [x] A. 目标是“算出一个值”，优先 `computed`。
- [x] B. 目标是“数据变化后做某件事”，考虑 `watch`。
- [x] C. 副作用依赖简单且希望自动收集时，可用 `watchEffect`。
- [ ] D. 只要逻辑里读了响应式数据，就必须写 `watchEffect`。
- [ ] E. `computed` 中适合写请求、埋点和 DOM 操作。

**解释**：派生值和副作用要分开。`computed` 应保持纯计算，副作用放到 watcher 或生命周期中。

## vue-005

### Q1 single | 创建与显示

`v-if` 和 `v-show` 的核心区别是什么？

- [x] A. `v-if` 控制节点是否创建/销毁，`v-show` 控制已渲染节点的 `display`。
- [ ] B. `v-if` 只改 CSS，`v-show` 会销毁组件实例。
- [ ] C. 二者都会在条件为假时移除 DOM 节点。
- [ ] D. 二者差异只存在于 Vue 2，Vue 3 中完全相同。

**解释**：`v-if` 是真正条件渲染；`v-show` 会保留节点和组件实例，只切换显示隐藏。

### Q2 multiple | 选择场景

哪些场景选择更合适？

- [x] A. 登录后才展示的模块、权限控制模块可用 `v-if`。
- [x] B. 频繁切换的 tab 或下拉面板可用 `v-show`。
- [x] C. 隐藏时需要释放重型图表资源时，优先考虑 `v-if`。
- [x] D. 初始条件为假且很少打开的内容可用 `v-if` 降低初始成本。
- [ ] E. 需要和 `v-else` 配合时应使用 `v-show`。

**解释**：`v-show` 不支持 `<template>`，也不能和 `v-else` 配合。频繁切换重显示成本时适合 `v-show`。

### Q3 multiple | 生命周期影响

关于生命周期和切换成本，哪些说法正确？

- [x] A. `v-if` 切换可能触发子组件挂载和卸载。
- [x] B. `v-show` 频繁切换通常成本更低。
- [x] C. `v-show` 隐藏时子组件实例仍然存在。
- [ ] D. `v-if` 为假时子组件仍会执行 mounted。
- [ ] E. `v-show` 隐藏时会自动清理定时器和订阅。

**解释**：保留实例意味着资源也会保留。需要释放副作用资源时要自己清理或用 `v-if` 触发卸载。

## vue-006

### Q1 single | key 的身份语义

`v-for` 中 `key` 的主要作用是什么？

- [ ] A. 让 CSS 选择器更容易选中节点。
- [x] B. 告诉 Vue 每个列表项的稳定身份，帮助 diff 判断复用、移动、插入和删除。
- [ ] C. 强制每次更新都销毁并重建所有节点。
- [ ] D. 只影响开发环境警告，不影响组件状态。

**解释**：key 是列表项身份标识。它直接影响节点和组件实例如何复用，关系到输入值、焦点和本地状态是否错位。

### Q2 multiple | index key 风险

为什么不推荐用数组下标作为动态列表的 key？

- [x] A. 插入元素后，同一个 index 可能对应不同业务数据。
- [x] B. 删除或排序后，组件实例可能被错误复用。
- [x] C. 输入框值、焦点、动画状态或子组件本地状态可能错位。
- [ ] D. Vue 完全不允许 `:key="index"`。
- [ ] E. index key 会让列表永远无法渲染。

**解释**：index 不是业务身份。只有列表完全静态、不插入删除排序且子项无状态时，index 才勉强可接受。

### Q3 multiple | 合理 key

哪些 key 选择更合理？

- [x] A. 后端返回的唯一 id。
- [x] B. 稳定唯一的 slug 或业务编码。
- [x] C. `string`、`number` 或 `symbol` 这类原始值。
- [ ] D. 每次渲染都重新创建的对象字面量。
- [ ] E. 动态列表默认都用数组下标，性能最好。

**解释**：key 要稳定、唯一、能代表业务身份。对象引用和 index 都容易导致身份漂移或不稳定。

## vue-007

### Q1 single | class 对象写法

`:class="{ active: selected, disabled: loading }"` 最适合表达什么？

- [ ] A. 把对象序列化后写进 class 属性。
- [x] B. 根据布尔状态决定某个 class 是否启用。
- [ ] C. 给元素动态绑定内联 style。
- [ ] D. 只在组件首次挂载时计算一次 class。

**解释**：class 对象写法的 key 是 class 名，value 决定是否添加。它会随着响应式状态变化重新计算。

### Q2 multiple | class/style 组合

关于 Vue 的 class 和 style 绑定，哪些说法正确？

- [x] A. class 支持字符串、对象和数组。
- [x] B. 数组写法适合组合基础 class、计算 class 和条件对象。
- [x] C. style 对象可绑定动态数值，例如 `{ fontSize: size + 'px' }`。
- [x] D. 复杂样式逻辑可放到 computed 中，保持模板清爽。
- [ ] E. `:style` 只能接收字符串，不能接收对象。

**解释**：Vue 对 class/style 做了增强绑定。对象和数组让状态组合更清晰，computed 适合承载复杂映射。

### Q3 multiple | 实践取舍

哪些样式实践更适合组件工程？

- [x] A. 组件库常把尺寸、变体、状态映射成 class。
- [x] B. 内联 style 更适合动态位置、尺寸、主题变量等值。
- [x] C. 模板里过长的条件 class 可以抽到 computed。
- [ ] D. 所有样式都应该写成内联 style，避免 CSS 文件。
- [ ] E. class 绑定不能和普通静态 class 共存。

**解释**：静态 class 和动态 class 可以共存。工程里通常用 class 管结构化样式，用 style 处理高度动态的数值。

## vue-008

### Q1 single | v-model 本质

`v-model` 的本质是什么？

- [ ] A. 一个只能用于文本框的特殊指令。
- [x] B. 表单值绑定和事件监听的语法糖，会按控件类型展开为不同属性和事件。
- [ ] C. 让 DOM 的初始 `value` 永远作为真实数据源。
- [ ] D. 一个运行时校验库。

**解释**：`v-model` 会以 JavaScript 状态为真实数据源，同步用户输入。不同控件使用的属性和事件不同。

### Q2 multiple | 控件差异

关于不同表单控件上的 `v-model`，哪些说法正确？

- [x] A. 文本输入通常绑定 `value` 并监听 `input`。
- [x] B. 单个 checkbox 通常绑定布尔 `checked`。
- [x] C. checkbox 多选数组会根据选项 value 加入或移出数组。
- [x] D. radio 会比较当前模型值和自身 value。
- [ ] E. select 永远只会得到 option 的显示文本。

**解释**：select 使用选中 option 的 value；如果通过 `:value` 绑定对象或非字符串值，模型也会接收对应值。

### Q3 multiple | 修饰符和值绑定

关于 `v-model` 修饰符和特殊值绑定，哪些判断正确？

- [x] A. `.trim` 会去除首尾空白。
- [x] B. `.number` 会尝试把输入转换为数字。
- [x] C. `.lazy` 会从 input 时同步改为 change 时同步。
- [x] D. checkbox 的 `true-value` / `false-value` 会影响模型值。
- [ ] E. 修饰符可以替代复杂表单校验层。

**解释**：修饰符处理轻量输入转换。复杂校验、错误展示和提交转换仍应由表单校验层处理。

## vue-009

### Q1 single | 修饰符价值

为什么 Vue 推荐用事件修饰符表达 DOM 事件细节？

- [ ] A. 因为方法里无法访问事件对象。
- [x] B. 因为 `.prevent`、`.stop` 等让模板负责 DOM 细节，业务方法只关心业务动作。
- [ ] C. 因为修饰符会把所有事件都变成异步事件。
- [ ] D. 因为修饰符能替代所有事件监听器。

**解释**：修饰符把阻止默认行为、冒泡控制、按键过滤等 DOM 细节留在模板中，让方法更容易复用和测试。

### Q2 multiple | 修饰符匹配

哪些事件修饰符用途匹配正确？

- [x] A. `.prevent` 调用 `event.preventDefault()`。
- [x] B. `.stop` 阻止事件冒泡。
- [x] C. `.self` 只在事件目标是当前元素时触发。
- [x] D. `.once` 让处理器只触发一次。
- [ ] E. `.passive` 表示一定会调用 `preventDefault()`。

**解释**：`.passive` 是告诉浏览器监听器不会阻止默认行为，常用于滚动优化。它不应该和 `.prevent` 一起使用。

### Q3 multiple | 顺序与组合

关于事件修饰符组合，哪些说法正确？

- [x] A. 修饰符可链式组合。
- [x] B. 修饰符顺序会影响生成代码和作用范围。
- [x] C. `@click.prevent.self` 和 `@click.self.prevent` 的行为可能不同。
- [x] D. `.passive` 和 `.prevent` 同用是冲突信号。
- [ ] E. 修饰符顺序只是代码风格，不影响语义。

**解释**：Vue 会按顺序生成对应保护逻辑。顺序改变时，阻止默认行为和目标判断的范围可能不同。

## vue-010

### Q1 single | setup 与 DOM

在 Vue 3 Composition API 中，为什么不应在 `setup` 同步阶段直接依赖真实 DOM？

- [ ] A. 因为 `setup` 永远不会执行。
- [x] B. 因为此时组件还没有挂载，真实 DOM 尚不可用。
- [ ] C. 因为 `setup` 只能写 TypeScript 类型，不能写逻辑。
- [ ] D. 因为 Vue 不支持访问 DOM。

**解释**：需要访问 DOM 时应放到 `onMounted`，或在状态更新后 `await nextTick()` 再读取更新后的 DOM。

### Q2 multiple | 常用生命周期

哪些生命周期钩子用途匹配正确？

- [x] A. `onMounted` 适合注册需要 DOM 的逻辑或原生事件。
- [x] B. `onUnmounted` 适合清理定时器、订阅、原生事件和第三方实例。
- [x] C. `onUpdated` 在响应式更新导致 DOM patch 后执行。
- [x] D. `onActivated` / `onDeactivated` 配合 `KeepAlive`。
- [ ] E. `onMounted` 会在 SSR 阶段正常访问浏览器 DOM。

**解释**：多数客户端生命周期不会在 SSR 阶段调用。SSR 数据预取可关注 `onServerPrefetch`。

### Q3 multiple | 注册时机与更新循环

关于生命周期注册和更新阶段，哪些说法正确？

- [x] A. 生命周期注册函数应在 `setup` 同步执行期间调用。
- [x] B. 不应在 `await` 之后才注册生命周期钩子。
- [x] C. 在 `onUpdated` 中修改会触发渲染的状态，容易形成更新循环。
- [x] D. 想等某次状态变化后的 DOM，可在修改状态后 `await nextTick()`。
- [ ] E. 生命周期钩子会自动清理所有外部副作用。

**解释**：Vue 不会自动清理你手动创建的外部副作用。事件监听、定时器和第三方实例需要在卸载时主动清理。

## vue-011

### Q1 single | 单向数据流

子组件收到 `props.modelValue` 后想修改输入值，最符合 Vue 单向数据流的做法是什么？

- [ ] A. 直接 `props.modelValue = nextValue`。
- [x] B. 通过 `emit('update:modelValue', nextValue)` 通知父组件更新。
- [ ] C. 把 props 深拷贝到全局变量里，再直接修改全局变量。
- [ ] D. 用 `delete props.modelValue` 触发父组件重新渲染。

**解释**：props 是父到子的只读输入，子组件应通过 emit 输出变更意图。父组件才是数据来源。

### Q2 multiple | props/emits 约束

关于 props 和 emits，哪些说法正确？

- [x] A. props 用于父组件向子组件传值。
- [x] B. emit 用于子组件向父组件发送事件。
- [x] C. 显式声明 emits 有利于类型推断和组件文档化。
- [x] D. 对象或数组 props 的内部属性技术上可能被改，但团队规范应避免。
- [ ] E. 子组件自定义事件会像 DOM 事件一样自动冒泡到所有祖先。

**解释**：组件自定义事件不做 DOM 式冒泡。父组件只能监听直接子组件 emit 出来的事件。

### Q3 multiple | 本地编辑与跨层通信

哪些组件通信设计更合理？

- [x] A. 表单本地编辑可复制一份内部状态，保存时再 emit。
- [x] B. 普通父子数据优先 props/emit。
- [x] C. 深层或兄弟组件共享可按场景考虑 provide/inject、Pinia 或路由状态。
- [ ] D. 所有子组件都应该偷偷修改对象 props，减少事件数量。
- [ ] E. 跨多层通信最好让每一层组件都手动转发同一个业务事件。

**解释**：本地草稿和提交事件能让数据流清晰。跨层事件一路传会让维护成本变高，应该选更合适的共享机制。

## vue-012

### Q1 single | 插槽作用域

关于插槽内容的作用域，哪项说法正确？

- [ ] A. 插槽内容默认在子组件作用域中编译，因此可以直接访问子组件所有内部变量。
- [x] B. 插槽内容在父组件作用域中编译，只能通过 slot props 获取子组件显式暴露的数据。
- [ ] C. 具名插槽一定比默认插槽性能更差。
- [ ] D. fallback 内容会和父组件传入内容同时显示。

**解释**：插槽让父组件决定局部内容，但作用域仍属于父组件。子组件想暴露数据必须通过 slot props。

### Q2 multiple | 插槽类型

哪些插槽用途匹配正确？

- [x] A. 默认插槽适合主体内容。
- [x] B. 具名插槽适合 header、footer、actions 等多个区域。
- [x] C. 作用域插槽适合表格行、列表项、表单字段等需要子组件传数据的场景。
- [x] D. 插槽可以提供 fallback 内容，父组件未传时显示。
- [ ] E. 作用域插槽只能传字符串，不能传对象或索引。

**解释**：作用域插槽可以通过属性传递任意模板需要的数据，例如 item、index、状态和方法。

### Q3 multiple | 组件封装

哪些场景适合使用插槽提升组件可组合性？

- [x] A. Card 子组件固定外壳布局，父组件自定义标题和主体。
- [x] B. Table 子组件控制数据循环，父组件自定义单元格渲染。
- [x] C. FormField 子组件控制校验布局，父组件自定义输入控件。
- [ ] D. 子组件需要强制父组件使用某个内部私有变量但不暴露 slot props。
- [ ] E. 所有父子通信都应该改成插槽，避免 props。

**解释**：插槽解决“结构由子组件掌控，局部内容由父组件填充”。普通数据输入仍应使用 props。

## vue-013

### Q1 single | provide/inject 场景

`provide` / `inject` 最适合解决哪类问题？

- [ ] A. 普通父子组件之间传一个标题文本。
- [x] B. 祖先向任意后代提供上下文或能力，避免多层 props 透传。
- [ ] C. 让所有组件事件自动冒泡。
- [ ] D. 替代路由参数和 URL query。

**解释**：provide/inject 是依赖注入机制，适合表单上下文、复合组件内部状态、主题、权限、插件服务等跨层能力。

### Q2 multiple | 安全封装

大型项目中封装 provide/inject，哪些做法更稳妥？

- [x] A. 使用 `Symbol` 或 `InjectionKey<T>` 作为 key。
- [x] B. 封装 `useXxxContext`，缺少 provider 时给出明确错误。
- [x] C. 默认值创建成本高时，用工厂默认值并传第三个参数 `true`。
- [x] D. 状态只读时可提供 `readonly()` 包裹后的响应式状态。
- [ ] E. 全部使用裸字符串 key，越短越好且不会冲突。

**解释**：Symbol key 和封装函数能减少冲突和隐式依赖问题。readonly 状态配合显式更新函数更能控制写入入口。

### Q3 multiple | 设计风险

关于 provide/inject 的风险，哪些判断正确？

- [x] A. 它会让依赖来源不如 props 直观。
- [x] B. 不适合普通、直接的父子数据传递。
- [x] C. 如果提供响应式对象，后代读到的是同一个响应式引用。
- [ ] D. inject 到的数据永远是深拷贝，后代修改不会影响 provider。
- [ ] E. 使用 provide/inject 后不需要考虑权限和修改入口。

**解释**：inject 是共享引用，不是自动隔离。需要通过 readonly、更新函数和上下文封装明确读写边界。

## vue-014

### Q1 single | 通信方式选择

一个详情页的筛选条件需要刷新可恢复、可分享、浏览器回退也能正确变化，优先考虑放在哪里？

- [ ] A. 任意子组件的本地 ref。
- [ ] B. 事件总线。
- [x] C. URL params、query 或 hash。
- [ ] D. 每个组件各自维护一份副本。

**解释**：能被 URL 表达的状态优先放进路由，天然支持刷新、分享、收藏和前进后退。

### Q2 multiple | 场景匹配

哪些通信方式和场景匹配合理？

- [x] A. 父传子用 props。
- [x] B. 子通知父用 emit。
- [x] C. 父调用子组件暴露的方法可用 template ref + `defineExpose`。
- [x] D. 复合组件内部跨层上下文可用 provide/inject。
- [ ] E. 所有页面级状态都应该放在每个组件自己的 local state 里。

**解释**：通信方式应匹配状态作用域。页面级、跨页面或远距离共享状态通常需要 Pinia、路由或数据缓存方案。

### Q3 multiple | 反模式识别

哪些做法容易让 Vue 组件通信变难维护？

- [x] A. 为了省事把所有状态都塞进全局 store。
- [x] B. 用事件总线承载复杂业务流程。
- [x] C. 让多层组件机械转发大量 props 和事件，且没有抽象上下文。
- [ ] D. 父子组件用 props/emit 表达输入输出。
- [ ] E. 复合组件用 provide/inject 管内部注册关系。

**解释**：通信反模式的共同点是数据流变隐式或作用域过大。清晰的输入输出和合适的共享边界更重要。

## vue-015

### Q1 single | 动态 vs 异步

动态组件和异步组件的区别，哪项说法最准确？

- [ ] A. 动态组件用于代码分包，异步组件用于运行时切换。
- [x] B. 动态组件解决“运行时切哪个组件”，异步组件解决“组件代码什么时候加载”。
- [ ] C. 二者完全一样，只是名字不同。
- [ ] D. 异步组件不能用于普通组件树。

**解释**：`<component :is="x">` 负责按状态选择组件；`defineAsyncComponent` 负责按需加载组件代码。

### Q2 multiple | KeepAlive 与动态组件

关于动态组件和 `KeepAlive`，哪些说法正确？

- [x] A. `<component :is="currentPanel" />` 可根据状态切换组件。
- [x] B. 用 `KeepAlive` 包裹可在切换时保留组件状态。
- [x] C. 适合 tab、步骤表单、配置化页面等场景。
- [ ] D. 动态组件每次切换都必须重新请求组件代码。
- [ ] E. `KeepAlive` 会让所有组件永远不再触发生命周期相关钩子。

**解释**：KeepAlive 缓存组件实例，切换时会涉及 activated/deactivated 等缓存生命周期，不等于没有生命周期。

### Q3 multiple | 异步组件边界

关于异步组件，哪些实践正确？

- [x] A. 重型弹窗、低频面板、图表编辑器适合异步加载。
- [x] B. `defineAsyncComponent` 可配置 loading、error、timeout 等状态。
- [x] C. Vue Router 的路由懒加载通常直接写 `() => import('./Page.vue')`。
- [ ] D. route component 必须再包一层 `defineAsyncComponent` 才能懒加载。
- [ ] E. 异步组件能自动解决所有数据请求 loading 状态。

**解释**：异步组件处理组件代码加载，不等于处理业务数据请求。路由懒加载由 Vue Router 支持，不需要额外包裹。

## vue-016

### Q1 single | Teleport 目的

`Teleport` 最核心的作用是什么？

- [ ] A. 改变组件逻辑父子关系，让 props/emit 失效。
- [x] B. 组件逻辑仍在当前树中，但把一段 DOM 渲染到指定容器。
- [ ] C. 把组件代码异步加载到浏览器。
- [ ] D. 自动实现弹窗焦点管理和滚动锁定。

**解释**：Teleport 改变 DOM 放置位置，不改变组件关系。props、emit、provide/inject 仍按组件树工作。

### Q2 multiple | 弹窗相关问题

为什么弹窗、抽屉、Toast 常用 Teleport 到 `body`？

- [x] A. 避免被父容器 `overflow` 裁剪。
- [x] B. 避免受父级 stacking context 和 z-index 影响。
- [x] C. 让视觉层级更容易统一管理。
- [ ] D. 因为 Teleport 会自动加遮罩、ESC 关闭和焦点陷阱。
- [ ] E. 因为 Teleport 后组件就不需要处理可访问性。

**解释**：Teleport 只解决 DOM 位置和层级问题。弹窗仍要处理焦点、键盘、滚动锁定和无障碍。

### Q3 multiple | Teleport 细节

关于 Teleport 的能力和限制，哪些说法正确？

- [x] A. 目标容器需要存在，SSR 场景要注意结构一致。
- [x] B. `disabled` 可让内容临时退回原位置渲染。
- [x] C. 多个 Teleport 可以挂到同一个目标容器。
- [x] D. Vue 3.5+ 的 `defer` 允许目标在同一轮稍后出现。
- [ ] E. `defer` 可以等到任意异步请求结束后再寻找目标容器。

**解释**：`defer` 不是无限等待，它只放宽同一轮挂载/更新中的目标查找时机，不能延迟到异步下一轮。

## vue-017

### Q1 single | Transition vs TransitionGroup

什么时候应该使用 `TransitionGroup`？

- [ ] A. 包裹单个元素的进入离开动画。
- [x] B. 列表元素需要进入、离开或移动动画。
- [ ] C. 只要组件使用了 Teleport。
- [ ] D. 所有 CSS 动画都必须用 TransitionGroup。

**解释**：`Transition` 面向单个元素或组件；`TransitionGroup` 面向列表项，并要求每个子项有唯一 key。

### Q2 multiple | CSS class 阶段

Vue `Transition` 会在进入/离开阶段自动添加哪些类型的 class？

- [x] A. `*-enter-from`
- [x] B. `*-enter-active`
- [x] C. `*-leave-to`
- [x] D. `*-leave-active`
- [ ] E. `*-mounted-permanent`

**解释**：Vue 根据 name 添加 enter/leave 的 from、active、to 阶段 class。不存在 `mounted-permanent` 这类阶段。

### Q3 multiple | 动画实践

关于 Vue 过渡动画，哪些实践正确？

- [x] A. 复杂动画优先使用 `transform` 和 `opacity`，减少布局开销。
- [x] B. `Transition` 默认插槽应是单个元素或组件。
- [x] C. `TransitionGroup` 需要列表子项提供唯一 key。
- [x] D. 弹窗动画要和 Teleport、焦点管理、滚动锁定配合。
- [ ] E. `TransitionGroup` 的过渡 class 会应用到 group 容器上，而不是每个列表项。

**解释**：TransitionGroup 的 class 应用于每个列表项。列表动画尤其依赖稳定 key 来判断移动和离开。

## vue-018

### Q1 single | 代码组织差异

Composition API 相比 Options API，在复杂组件中最突出的组织优势是什么？

- [ ] A. 强制所有逻辑都写在 `methods` 中。
- [x] B. 可以按逻辑主题组织状态、派生值、副作用和方法，便于抽成 composable。
- [ ] C. 完全不需要生命周期。
- [ ] D. 只能写 JavaScript，不能写 TypeScript。

**解释**：Options API 按选项分类；Composition API 按业务逻辑聚合，更适合复杂组件和逻辑复用。

### Q2 multiple | API 风格取舍

哪些关于 Composition API 和 Options API 的判断正确？

- [x] A. 新 Vue 3 + TypeScript 项目通常优先 Composition API 和 `<script setup>`。
- [x] B. Options API 上手简单、结构固定，对小组件和旧项目维护友好。
- [x] C. Composition API 的 composable 让逻辑复用更自然。
- [x] D. Options API 不会被废弃。
- [ ] E. Composition API 出现后，Options API 在任何场景都不能再用。

**解释**：选择 API 风格要看项目阶段、团队经验、类型需求和组件复杂度，不是简单“谁淘汰谁”。

### Q3 multiple | 混用策略

旧项目渐进迁移时，哪些策略更稳妥？

- [x] A. 可以在 Options 组件中通过 `setup()` 接入新的 composable。
- [x] B. 同一个组件里不要无节制混杂两种风格。
- [x] C. 用 Composition API 迁移复杂复用逻辑，而不是为了重写而重写。
- [ ] D. 必须一次性把所有 Options 组件改成 `<script setup>`。
- [ ] E. 混用 API 会让 Vue 完全无法编译。

**解释**：Vue 支持渐进迁移。关键是保持组件内部风格清晰，避免同一逻辑被拆散到多个 API 风格里。

## vue-019

### Q1 single | 编译器宏

`<script setup>` 中 `defineProps`、`defineEmits` 这类 API 的本质是什么？

- [ ] A. 必须从 `vue` 手动 import 的普通运行时函数。
- [x] B. 编译器宏，不需要 import，编译时被处理。
- [ ] C. 浏览器原生支持的 JavaScript 语法。
- [ ] D. 只能在模板中调用。

**解释**：这些宏由 SFC 编译器识别，不是普通运行时函数。因此也有参数提升和作用域限制。

### Q2 multiple | 宏用途

哪些宏用途匹配正确？

- [x] A. `defineProps` 声明组件 props。
- [x] B. `defineEmits` 声明组件事件并约束 emit。
- [x] C. `defineExpose` 控制父组件通过 template ref 能访问的能力。
- [x] D. `defineModel` 声明组件 v-model，底层对应 model prop 和 update 事件。
- [ ] E. `withDefaults` 用来注册全局默认插件。

**解释**：`withDefaults` 是给类型声明的 props 设置默认值的辅助宏，不是插件注册机制。

### Q3 multiple | 版本与边界

关于 `<script setup>` 的限制和版本细节，哪些说法正确？

- [x] A. 顶层变量、函数和导入会自动暴露给模板。
- [x] B. `defineProps` / `defineEmits` 的参数会被提升，不能引用 setup 内局部变量。
- [x] C. Vue 3.5+ 中 `defineProps` 解构变量在同一块内是响应式的编译转换。
- [x] D. `defineModel` 默认值设计不当可能造成父子初始状态不同步。
- [ ] E. `<script setup>` 顶层内容需要手动 `return` 才能给模板使用。

**解释**：`<script setup>` 的暴露和 props 解构响应式都来自编译器转换。公共组件要谨慎设计 model 默认值。

## vue-020

### Q1 single | reactive 解构

为什么普通 `reactive` 对象解构后会丢失响应式连接？

- [ ] A. 因为 Vue 3 不使用 Proxy。
- [x] B. 因为解构得到的是当前属性值，后续读写绕过了原代理的 get/set。
- [ ] C. 因为 `reactive` 只能在模板中使用。
- [ ] D. 因为所有 number 类型都不能响应式更新。

**解释**：依赖收集发生在读取代理属性时。解构成普通变量后，不再通过代理访问，自然无法继续追踪。

### Q2 multiple | toRefs / toRef

关于 `toRefs` 和 `toRef`，哪些说法正确？

- [x] A. `toRefs(state)` 会把当前已有可枚举属性转成 ref。
- [x] B. 这些 ref 读写时会代理回原对象属性。
- [x] C. 属性可能之后才出现时，`toRef(state, 'key')` 更合适。
- [ ] D. `toRefs` 会为未来新增的所有属性自动创建 ref。
- [ ] E. 使用 `toRefs` 后不再需要 `.value`。

**解释**：`toRefs` 只处理调用时已有属性，返回的是 ref，脚本中仍然要用 `.value` 读写。

### Q3 multiple | 响应式限制与例外

关于 Vue 3 响应式限制，哪些判断正确？

- [x] A. `reactive` 不适合整体替换，应保持代理引用稳定。
- [x] B. 原始值应使用 `ref`。
- [x] C. 数组和集合里的 ref 通常不会自动深层解包。
- [x] D. 第三方类实例或大型不可变数据可考虑 `markRaw`、`shallowRef`、`shallowReactive`。
- [ ] E. Vue 3.5+ 的 props 解构响应式说明所有 reactive 解构都自动响应式。

**解释**：props 解构响应式是 `<script setup>` 的编译器特殊转换，不代表普通 `reactive` 解构也能保持响应式。

## vue-021

### Q1 single | computed 缓存

模板中多次读取同一个 `filteredUsers`，为什么 `computed` 通常比直接调用 `getFilteredUsers()` 更合适？

- [ ] A. 因为 `computed` 每次读取都会强制重新执行 getter。
- [x] B. 因为 `computed` 会基于响应式依赖缓存结果，依赖没变时复用缓存。
- [ ] C. 因为 methods 不能访问响应式数据。
- [ ] D. 因为 methods 只能在事件处理器中调用，模板不能调用。

**解释**：`computed` 是派生状态，内部有 dirty 标记和依赖追踪；methods 是普通函数，模板每次调用都会执行。

### Q2 multiple | 依赖与失效

关于 `computed` 的缓存失效，哪些说法正确？

- [x] A. 只有 getter 中读取到的响应式依赖变化，才会让 computed 变脏。
- [x] B. `computed(() => Date.now())` 不会自己随时间自动更新。
- [x] C. 依赖变化后，computed 通常在下次读取 `.value` 时重新计算。
- [ ] D. computed 会监听所有全局变量变化。
- [ ] E. computed 的缓存失效不依赖响应式系统。

**解释**：computed 依赖响应式读取。非响应式来源如 `Date.now()`、普通全局变量不会自动触发重新计算。

### Q3 multiple | 可写 computed 与纯净性

关于可写 computed 和 getter 设计，哪些实践正确？

- [x] A. 可写 computed 适合对外暴露一个派生字段，内部拆分为多个状态。
- [x] B. computed getter 应尽量保持纯净，只计算并返回值。
- [x] C. 不应在 computed getter 中发请求、改状态或直接操作 DOM。
- [x] D. Vue 3.4+ getter 可读取上一次返回值，但常规派生状态不需要依赖这个能力。
- [ ] E. computed setter 会在依赖变化时自动执行。

**解释**：setter 只在外部写入 computed 时执行。getter 里放副作用会让渲染和依赖追踪变得不可预测。

## vue-022

### Q1 single | watch 定位

哪种场景最适合使用 `watch`？

- [ ] A. 根据 `firstName` 和 `lastName` 计算 `fullName`。
- [x] B. 监听搜索关键词变化，发起请求并取消过期请求。
- [ ] C. 在模板中多次复用一个派生数组。
- [ ] D. 把所有响应式状态同步成另一份完全相同的状态。

**解释**：`watch` 面向副作用，例如请求、同步 URL、写缓存、操作第三方实例。派生值优先用 computed。

### Q2 multiple | watch 选项

哪些 `watch` 选项用途匹配正确？

- [x] A. `immediate: true` 创建 watcher 后立即执行一次。
- [x] B. `deep: true` 深度遍历对象内部变化，但成本较高。
- [x] C. `flush: 'post'` 在 DOM 更新后执行，适合读取更新后的 DOM。
- [x] D. `flush: 'sync'` 同步触发，应谨慎使用。
- [ ] E. `deep: true` 能免费监听任意大对象，没有性能成本。

**解释**：deep watch 需要遍历对象，容易在大对象上造成开销。Vue 3.5+ 的 `deep: number` 可限制遍历深度。

### Q3 multiple | 清理过期副作用

关于 watcher 清理函数，哪些说法正确？

- [x] A. 清理函数可取消上一次请求，避免旧结果晚返回覆盖新结果。
- [x] B. watch 回调参数里的 `onCleanup` 可用于注册清理逻辑。
- [x] C. Vue 3.5+ 的 `onWatcherCleanup()` 必须在回调同步执行期间调用。
- [x] D. `onCleanup` 兼容 Vue 3.5 之前版本。
- [ ] E. 清理函数只会在组件卸载时执行，源变化时不会执行。

**解释**：watcher 失效包括源再次变化和 watcher 停止。清理过期副作用是 watch 处理异步竞态的关键。

## vue-023

### Q1 single | DOM 更新队列

为什么 `count.value++` 后立刻读取 DOM，可能拿到的仍是旧内容？

- [ ] A. Vue 不会响应 ref 的变化。
- [x] B. Vue 会把组件更新放入队列，同一轮中合并变化并在下一个 tick 批量 patch DOM。
- [ ] C. Vue 只在浏览器刷新页面时更新 DOM。
- [ ] D. `nextTick` 会阻止 DOM 更新。

**解释**：状态修改会触发更新调度，但 DOM patch 不是同步立刻完成。`await nextTick()` 可等待已排队更新 flush。

### Q2 multiple | nextTick 适用场景

哪些场景适合使用 `await nextTick()`？

- [x] A. 打开弹窗后等待输入框渲染，再聚焦。
- [x] B. 列表追加数据后，等 DOM 更新再滚动到底部。
- [x] C. 错误信息渲染后测量高度。
- [x] D. 容器显示后再初始化依赖尺寸的第三方图表。
- [ ] E. 等待远程图片加载完成。

**解释**：nextTick 等 Vue 的 DOM 更新队列，不等图片、CSS 动画或第三方异步任务。那些要监听对应事件或回调。

### Q3 multiple | 能等与不能等

关于 `nextTick` 的边界，哪些说法正确？

- [x] A. 它保证等待 Vue 已排队的 DOM 更新完成。
- [x] B. 它不保证 CSS transition 已结束。
- [x] C. 它不保证第三方库内部异步初始化完成。
- [x] D. 如果依赖图片尺寸，还需要监听图片 `load`。
- [ ] E. 它可以替代所有异步时机控制。

**解释**：nextTick 只和 Vue 更新队列有关。外部资源、动画和第三方任务有自己的完成时机。

## vue-024

### Q1 single | 渲染主链路

Vue 从模板到真实 DOM 的核心链路，哪项排序更准确？

- [x] A. template/SFC -> compile -> render function -> vnode -> mount/patch -> DOM。
- [ ] B. DOM -> vnode -> template -> compile -> setup。
- [ ] C. setup -> DOM 字符串拼接 -> innerHTML 全量替换。
- [ ] D. template -> CSSOM -> Pinia -> DOM。

**解释**：Vue 模板会编译成 render 函数，render 生成 vnode，运行时通过 mount/patch 应用到真实 DOM。

### Q2 multiple | 初次渲染

Vue 组件初次渲染通常会经历哪些步骤？

- [x] A. 创建组件实例并执行 `setup`。
- [x] B. 执行 render 函数并读取响应式状态。
- [x] C. 生成 vnode 树。
- [x] D. patch 到真实 DOM 后调用 mounted 相关钩子。
- [ ] E. 先调用 unmounted，再执行 setup。

**解释**：初次渲染是从实例创建、setup、render、patch 到 mounted。unmounted 属于卸载阶段。

### Q3 multiple | 更新与编译优化

关于 Vue 更新渲染和优化，哪些说法正确？

- [x] A. 响应式数据变化会触发相关组件渲染 effect 重新执行。
- [x] B. Vue 会把更新任务放进调度队列，合并同一轮重复更新。
- [x] C. 新旧 vnode diff 后再更新真实 DOM。
- [x] D. PatchFlag、Block Tree 等编译信息能帮助运行时跳过静态节点和定向更新动态绑定。
- [ ] E. Vue 每次状态变化都会完整重新遍历和重建整棵真实 DOM。

**解释**：Vue 的编译期和运行时配合减少不必要工作。真实 DOM 操作通常只发生在变化点。

## vue-025

### Q1 single | keyed diff

稳定 `key` 在 Vue 列表 diff 中的核心价值是什么？

- [ ] A. 告诉 Vue 永远不要复用 DOM。
- [x] B. 表示业务身份，帮助 Vue 判断复用、移动、插入和删除。
- [ ] C. 让所有列表项都跳过更新。
- [ ] D. 替代子组件 props。

**解释**：key 让 Vue 知道“哪个 vnode 对应同一个数据项”。这对保持组件状态、输入值和动画状态尤其重要。

### Q2 multiple | Vue 列表 diff 思路

对 keyed children 的乱序更新，Vue 大致会做哪些事？

- [x] A. 从头部同步比较相同节点。
- [x] B. 从尾部同步比较相同节点。
- [x] C. 对乱序区间建立 key 到新索引的映射。
- [x] D. 使用最长递增子序列减少 DOM 移动次数。
- [ ] E. 不管变化多小，都删除整段列表再重建。

**解释**：Vue 会尽量复用和移动已有节点。最长递增子序列用于减少真实 DOM 移动操作。

### Q3 multiple | 无 key / index key

关于无 key 或 index key 的列表，哪些判断正确？

- [x] A. 无 key 时 Vue 默认尽量按当前位置就地 patch。
- [x] B. 就地 patch 适合列表渲染结果不依赖子组件状态或临时 DOM 状态的场景。
- [x] C. index key 在插入、删除、排序时可能导致组件状态错位。
- [ ] D. index key 总是比业务 id 更准确表达身份。
- [ ] E. 没有 key 时 Vue 会自动识别每条业务数据的唯一身份。

**解释**：Vue 无法凭空知道业务身份。动态列表应提供稳定业务 key，避免状态被错误复用。

## vue-026

### Q1 single | 组件 v-model 展开

组件上默认的 `<BaseInput v-model="name" />` 本质上对应哪组 prop 和事件？

- [ ] A. `value` 和 `input`。
- [x] B. `modelValue` 和 `update:modelValue`。
- [ ] C. `checked` 和 `change`。
- [ ] D. `name` 和 `update:name`。

**解释**：组件 v-model 默认使用 `modelValue` 作为 prop，使用 `update:modelValue` 作为更新事件。

### Q2 multiple | 多 v-model 与 defineModel

关于组件 `v-model`，哪些说法正确？

- [x] A. `v-model:start` 对应 `start` 和 `update:start`。
- [x] B. 一个组件可以声明多个 v-model。
- [x] C. Vue 3.4+ 可用 `defineModel` 简化 model prop 和 update 事件声明。
- [x] D. `defineModel('start')` 可声明命名 model。
- [ ] E. `defineModel` 返回普通字符串，不是 ref。

**解释**：`defineModel` 返回可读写 ref，写入它会触发对应 update 事件。

### Q3 multiple | 组件 model 设计边界

公共输入组件设计 v-model 时，哪些事项需要注意？

- [x] A. 默认值设计不当可能造成父子初始状态不同步。
- [x] B. 输入法组合事件可能影响何时 emit 更新。
- [x] C. 自定义修饰符可通过 `defineModel()` 解构拿到 modifiers 并在 get/set 中处理。
- [x] D. 多 v-model 场景下每个 model 参数有自己的修饰符集合。
- [ ] E. 使用 v-model 后组件内部就不需要任何类型和校验设计。

**解释**：v-model 是输入输出协议，不是校验系统。公共组件仍要处理受控边界、默认值、IME、类型和修饰符。

## vue-027

### Q1 single | fallthrough attributes

Vue 中 fallthrough attributes 指的是什么？

- [ ] A. 子组件声明过的所有 props。
- [x] B. 父组件传给子组件、但未被声明为 props 或 emits 的属性/监听器。
- [ ] C. 只能在 setup 中创建的响应式变量。
- [ ] D. Vue Router 自动注入的路由参数。

**解释**：未声明为 props/emits 的属性会进入 `$attrs`。单根组件默认会把它们透传到根元素。

### Q2 multiple | $attrs 与 inheritAttrs

关于 `$attrs` 和 `inheritAttrs`，哪些说法正确？

- [x] A. 单根组件默认会把 fallthrough attributes 透传到根元素。
- [x] B. `class` 和 `style` 会和子组件根元素已有值合并。
- [x] C. `inheritAttrs: false` 可关闭默认继承，然后手动 `v-bind="$attrs"` 到指定元素。
- [x] D. 多根组件不会自动判断属性应该落到哪个根节点。
- [ ] E. `$attrs` 在 JavaScript 中是响应式对象，适合直接 watch。

**解释**：`$attrs` 不是响应式对象。多根组件需要显式绑定，否则 Vue 会警告无法自动继承。

### Q3 multiple | emits 与公共组件

为什么公共组件应显式声明 props 和 emits？

- [x] A. 避免父组件事件被错误地绑定到内部 DOM 上。
- [x] B. 让事件是否进入 `$attrs` 更可控。
- [x] C. 提升类型推断和组件 API 文档性。
- [x] D. 对 input/button 封装组件，可明确哪些 aria、data、id、name 等属性透传。
- [ ] E. 声明 emits 后，组件自定义事件会自动冒泡到祖先组件。

**解释**：emits 声明影响事件监听器是否被当作 fallthrough attribute。自定义事件仍不会自动冒泡。

## vue-028

### Q1 single | 表格作用域插槽

表格组件中使用作用域插槽的主要价值是什么？

- [ ] A. 让父组件接管表格所有循环和布局。
- [x] B. 表格组件负责数据遍历和结构，业务侧自定义单元格如何渲染。
- [ ] C. 让每个单元格自动变成全局状态。
- [ ] D. 完全消除大表格的渲染成本。

**解释**：作用域插槽在表格里提供扩展点：组件控制通用结构，业务通过 `row`、`value`、`index` 等 slot props 定制展示。

### Q2 multiple | 动态列与优先级

关于配置化表格的插槽设计，哪些说法正确？

- [x] A. 动态 slot 名适合按列 key 覆盖默认渲染，例如 `#price`、`#actions`。
- [x] B. 组件内部可定义优先级：业务 slot 优先，其次 formatter，最后默认文本。
- [x] C. slot props 可传 `row`、`value`、`index` 等必要数据。
- [ ] D. 父组件插槽模板可以直接访问表格子组件未暴露的内部局部变量。
- [ ] E. slot 名必须在运行时随机生成，避免复用。

**解释**：插槽内容仍在父作用域中编译，只能使用父作用域变量和子组件显式传出的 slot props。

### Q3 multiple | 性能边界

大数据表格使用作用域插槽时，哪些性能注意点正确？

- [x] A. 行数据和列配置要有稳定 key。
- [x] B. 插槽模板里避免昂贵计算，复杂逻辑提前 computed 或预处理。
- [x] C. 大数据表格需要虚拟滚动控制渲染规模。
- [x] D. 表格内部应避免每次渲染给每个单元格创建复杂临时对象。
- [ ] E. 使用 slot 后，Vue 会自动只渲染可视区域。

**解释**：slot 本质上仍会参与渲染函数调用。大数据性能要靠稳定输入、少计算和虚拟滚动。

## vue-029

### Q1 single | 自定义指令定位

Vue 自定义指令最适合封装什么？

- [ ] A. 页面级业务流程和数据请求状态。
- [x] B. 可复用的底层 DOM 行为，例如自动聚焦、点击外部关闭、拖拽、曝光。
- [ ] C. 所有组件通信。
- [ ] D. Pinia store 的替代品。

**解释**：自定义指令面向 DOM 行为。复杂业务状态更适合组件、composable 或状态管理。

### Q2 multiple | 点击外部关闭实现

实现点击外部关闭指令时，哪些细节正确？

- [x] A. mounted 时注册 document 级事件监听。
- [x] B. 判断 `event.target` 是否是 Node，且不在当前元素内部。
- [x] C. updated 中同步最新 binding 回调，避免闭包旧值。
- [x] D. unmounted 时移除事件监听并清理挂在元素上的引用。
- [ ] E. 不需要清理事件，Vue 会自动移除所有原生 document 监听。

**解释**：手动注册到 document 的监听器必须手动清理。updated 同步回调能避免指令值变化后仍调用旧函数。

### Q3 multiple | 指令边界

关于自定义指令的边界，哪些说法正确？

- [x] A. 移动端可能要考虑 `pointerdown` 或 `touchstart`。
- [x] B. Teleport 弹层会影响“外部”的边界判断。
- [x] C. 自定义指令主要面向普通 DOM 元素。
- [x] D. 不推荐直接挂在组件上；多根组件上会被忽略并产生警告。
- [ ] E. 指令比组件更适合承载复杂业务状态机。

**解释**：指令适合贴近 DOM 的行为复用。业务状态机用组件、composable 或 store 更清晰。

## vue-030

### Q1 single | composable 设计

一个好的 composable 不应该只是“把代码搬到函数里”。它最应该形成什么？

- [ ] A. 直接依赖某个具体组件模板结构的隐藏脚本。
- [x] B. 边界清晰、返回稳定、能清理副作用的小 API。
- [ ] C. 一个全局单例对象，所有组件共享所有内部状态。
- [ ] D. 一个只能在 mounted 后调用的 DOM 工具。

**解释**：Composable 是逻辑复用函数，应有明确输入输出，返回 ref/computed/方法，并负责自己的副作用生命周期。

### Q2 multiple | useRequest 竞态处理

请求类 composable 为什么要处理取消和竞态？

- [x] A. 快速连续调用时，旧请求可能晚于新请求返回。
- [x] B. 可用递增 requestId 判断当前返回是否仍是最新请求。
- [x] C. 可用 AbortController 取消过期请求。
- [x] D. 组件作用域销毁时应取消未完成请求。
- [ ] E. JavaScript Promise 会自动保证最后发出的请求最后返回。

**解释**：网络返回顺序不可控。requestId、AbortController 和 onScopeDispose 能避免旧结果覆盖新状态和卸载后继续更新。

### Q3 multiple | composable 边界与 SSR

设计 composable 时，哪些实践更稳妥？

- [x] A. 返回 ref、computed 和方法，不要返回失去响应式连接的普通快照。
- [x] B. 注册事件、定时器、订阅时，用 `onScopeDispose` 清理。
- [x] C. 参数支持 ref 或 getter 时，可用 `toValue` 配合 watcher 正确追踪。
- [x] D. DOM 副作用放到 `onMounted` 后处理，避免 SSR 问题。
- [ ] E. composable 可以在任意异步回调里第一次调用，不受组件作用域限制。

**解释**：Composable 通常应同步在 setup 中调用，以绑定当前 effect scope。DOM 相关逻辑要考虑 SSR 和挂载时机。

## vue-031

### Q1 single | Pinia store 组成

Pinia Option Store 中 `state`、`getters`、`actions` 的定位，哪项最准确？

- [ ] A. `state` 只能写对象字面量，`actions` 只能同步。
- [x] B. `state` 存数据，`getters` 类似 computed，`actions` 类似 methods 且可异步。
- [ ] C. `getters` 用来修改状态，`actions` 只能读取状态。
- [ ] D. Pinia 必须通过 mutations 才能修改 state。

**解释**：Pinia 没有 Vuex mutations。Option Store 中 state 写函数，getters 表达派生状态，actions 负责同步或异步业务行为。

### Q2 multiple | storeToRefs

为什么从 Pinia store 读取 state/getters 时常用 `storeToRefs(store)`？

- [x] A. 直接解构 store 的 state/getters 可能丢失响应式连接。
- [x] B. `storeToRefs` 会把 state/getters 转成 ref，保留响应式。
- [x] C. actions 可以直接从 store 解构，因为它们是方法。
- [ ] D. `storeToRefs` 会把 actions 也变成 ref。
- [ ] E. Pinia store 本身不是响应式对象，所以必须全部 `.value`。

**解释**：store 本身是 reactive 包装对象，直接读 state/getters 不需要 `.value`；解构读取状态时才需要 `storeToRefs`。

### Q3 multiple | store 设计边界

哪些 Pinia 使用实践更合理？

- [x] A. `defineStore` 的 id 应全局唯一，便于 devtools 和插件识别。
- [x] B. Setup Store 要 return 所有需要成为 state 的属性。
- [x] C. 跨页面共享、需持久化或多处协作的状态适合放 store。
- [ ] D. 组件内部临时 loading 和输入框草稿都应该默认进 Pinia。
- [ ] E. Setup Store 未 return 的 ref 仍会自动进入 SSR 序列化。

**解释**：Pinia 适合共享状态，不是所有局部 UI 状态的归宿。Setup Store 未 return 的状态不会成为 store 公开状态，也会影响 SSR/devtools/插件。

## vue-032

### Q1 single | Pinia 推荐原因

Vue 3 新项目通常优先选择 Pinia 而不是 Vuex 的主要原因是什么？

- [ ] A. Vuex 不能在 Vue 3 中使用。
- [x] B. Pinia API 更简洁、类型推断更友好、模块化更自然。
- [ ] C. Pinia 不支持 devtools，所以更轻。
- [ ] D. Pinia 只能写 Options API 项目。

**解释**：Vuex 4 仍可用于 Vue 3，但 Pinia 更贴近 Composition API，减少 mutations 和命名空间样板，TypeScript 体验更好。

### Q2 multiple | Pinia vs Vuex

哪些是 Pinia 相比 Vuex 的常见差异？

- [x] A. Pinia 没有 mutations，actions 可同步也可异步。
- [x] B. Pinia 每个 store 天然模块化。
- [x] C. Pinia 直接导入并调用 store，自动补全更友好。
- [x] D. Pinia 的 store 通常按需创建。
- [ ] E. Pinia 必须依赖字符串形式的 mutation type。

**解释**：Pinia 去掉了 mutation 层，模块组织也更自然，减少了大量字符串 type 和 namespace 心智负担。

### Q3 multiple | 状态归属

哪些状态更适合放进 Pinia？

- [x] A. 用户信息和登录态。
- [x] B. 权限、主题、跨页面缓存。
- [x] C. 多个远距离组件需要协作的业务状态。
- [ ] D. 某个输入框正在输入的临时值。
- [ ] E. 某个弹窗内部按钮 hover 状态。

**解释**：状态管理的重点是状态归属和更新链路清晰。局部、短生命周期的 UI 状态就近放在组件里更简单。

## vue-033

### Q1 single | 鉴权守卫返回值

Vue Router 4 中未登录访问受保护页面，推荐在 `beforeEach` 中怎么处理？

- [ ] A. 必须调用 `next('/login')`，不能 return。
- [x] B. 直接 return 一个登录页路由位置，并带上 redirect。
- [ ] C. 在 `afterEach` 里阻止导航。
- [ ] D. 抛出任意字符串让浏览器刷新。

**解释**：Vue Router 4 守卫可以返回路由位置、`false` 或抛错。老式 `next` 写法通常不再需要。

### Q2 multiple | 守卫类型

哪些路由守卫用途匹配正确？

- [x] A. `beforeEach` 适合全局登录态和权限检查。
- [x] B. `beforeEnter` 是路由记录独享守卫。
- [x] C. `onBeforeRouteLeave` 适合离开页面前确认或阻止。
- [x] D. `afterEach` 适合埋点、标题、日志等副作用。
- [ ] E. `afterEach` 可以阻止导航并重定向。

**解释**：`afterEach` 在导航确认后执行，只做副作用，不能阻止或改写导航结果。

### Q3 multiple | 鉴权边界

实现登录鉴权时，哪些细节需要处理？

- [x] A. 避免登录页本身被重复拦截造成重定向循环。
- [x] B. 有 token 但用户信息未加载时，先拉取 profile 再判断角色。
- [x] C. 缺少角色权限时跳转 Forbidden 或安全页面。
- [x] D. TypeScript 项目可扩展 `RouteMeta` 类型化 `requiresAuth`、`roles`。
- [ ] E. 前端路由守卫通过后，后端接口就不需要鉴权。

**解释**：前端守卫只控制体验和入口，后端仍必须校验接口权限。守卫还要处理用户信息加载失败、token 失效和循环跳转。

## vue-034

### Q1 single | path 与 params

Vue Router 中如果调用 `router.push({ path: '/users', params: { id: '1' } })`，需要注意什么？

- [ ] A. `params` 会自动拼成 `/users/1`。
- [x] B. 同时传 `path` 和 `params` 时，`params` 会被忽略。
- [ ] C. `params` 会变成 query。
- [ ] D. Router 会抛出语法错误。

**解释**：使用 params 时应优先配合命名路由，例如 `{ name: 'user', params: { id: '1' } }`，让 Router 负责路径生成和编码。

### Q2 multiple | params/query/hash

哪些参数选择更合适？

- [x] A. `/users/:id` 的资源身份适合 params。
- [x] B. `page=1&keyword=vue` 这种分页筛选适合 query。
- [x] C. 页面内锚点跳转适合 hash。
- [x] D. query 更适合刷新和分享筛选状态。
- [ ] E. hash 会被发送到服务端用于接口查询。

**解释**：hash 是 URL 片段，通常不会发送给服务端。资源身份用 params，用户可分享筛选状态常用 query。

### Q3 multiple | 同组件复用

从 `/users/1` 切换到 `/users/2` 时，哪些说法正确？

- [x] A. 如果匹配同一路由记录和组件，组件实例可能被复用。
- [x] B. `onMounted` 不会因为 params 变化而重新执行。
- [x] C. 可 watch `route.params.id` 并设置 `immediate: true` 拉取数据。
- [x] D. 需要取消导航或串行加载时，可用 `onBeforeRouteUpdate`。
- [ ] E. Vue Router 一定会销毁旧组件并重新创建。

**解释**：路由复用是性能优化，但需要开发者响应 params/query 变化。滥用 `<RouterView :key="route.fullPath">` 会强制重建，需谨慎。

## vue-035

### Q1 single | KeepAlive 作用

`KeepAlive` 的核心作用是什么？

- [ ] A. 让组件永远不会占用内存。
- [x] B. 缓存动态组件实例，切换时避免销毁和重新创建。
- [ ] C. 强制所有组件每次切换都重新 mounted。
- [ ] D. 只用于服务端渲染。

**解释**：KeepAlive 保存组件实例和状态，常用于 tab、后台列表返回、详情页回退等体验优化。

### Q2 multiple | include/exclude/max

关于 `KeepAlive` 配置，哪些说法正确？

- [x] A. `include` 只缓存匹配名称的组件。
- [x] B. `exclude` 排除匹配名称的组件。
- [x] C. `max` 超出后按 LRU 策略销毁最久未访问缓存。
- [x] D. `include` / `exclude` 匹配组件 name。
- [ ] E. `include` 匹配的是路由 path，和组件 name 无关。

**解释**：缓存规则依赖组件名称。`<script setup>` 文件名可推断 name，但复杂场景建议显式命名。

### Q3 multiple | 生命周期与资源

关于 KeepAlive 生命周期，哪些判断正确？

- [x] A. 被缓存组件不会反复 mounted/unmounted。
- [x] B. 激活时触发 `onActivated`，停用时触发 `onDeactivated`。
- [x] C. `onActivated` 首次挂载时也会触发。
- [x] D. 停用时应暂停轮询、视频播放或图表动画。
- [ ] E. 被 KeepAlive 缓存后，所有外部资源都会自动暂停。

**解释**：KeepAlive 保留实例，也会保留资源。开发者需要在 deactivated/activated 中明确暂停和恢复。

## vue-036

### Q1 single | Suspense 接管加载态

异步组件在父链上存在 `Suspense` 且默认 `suspensible` 时，会发生什么？

- [ ] A. 异步组件自己的 loadingComponent 一定优先显示。
- [x] B. 加载状态由 Suspense 接管，异步组件自身 loading/error/delay/timeout 配置不再生效。
- [ ] C. 异步组件不会再加载。
- [ ] D. Suspense 只能用于路由组件，不能包普通组件。

**解释**：异步组件默认可被 Suspense 接管。若想自己管理加载态，可设置 `suspensible: false`。

### Q2 multiple | 异步组件适用场景

哪些适合使用异步组件或懒加载？

- [x] A. Markdown 编辑器、代码编辑器、地图、图表库。
- [x] B. 低频重型弹窗。
- [x] C. 页面级路由可用 Vue Router 动态 import 懒加载。
- [ ] D. 所有小按钮组件都必须异步加载。
- [ ] E. 异步组件能自动缓存接口返回的数据。

**解释**：异步组件优化代码加载，不负责业务数据缓存。过度拆分小组件会增加请求和调度成本。

### Q3 multiple | Suspense 边界

关于 Suspense，哪些说法正确？

- [x] A. 可等待异步组件、`async setup()` 或 `<script setup>` 顶层 `await`。
- [x] B. fallback 过大可能造成整块页面闪烁。
- [x] C. default 和 fallback 插槽都只能有一个直接子节点。
- [x] D. 它能统一 loading，但不是完整错误边界。
- [ ] E. 官方已把 Suspense 作为完全稳定且无任何边界的长期 API。

**解释**：Suspense 仍需谨慎设计边界和错误降级。错误通常还要结合 `onErrorCaptured` 或全局错误处理。

## vue-037

### Q1 single | 局部错误边界

`onErrorCaptured` 返回 `false` 表示什么？

- [ ] A. 让错误继续向上传播到所有父级和全局 errorHandler。
- [x] B. 表示当前边界已处理错误，阻止继续向上传播。
- [ ] C. 让组件立刻重新加载页面。
- [ ] D. 忽略下一次所有 Promise 拒绝。

**解释**：默认捕获的错误会继续传播；返回 `false` 可以阻止更上层 `onErrorCaptured` 和全局 `errorHandler` 继续处理。

### Q2 multiple | 错误处理层次

哪些错误处理归属更合理？

- [x] A. `app.config.errorHandler` 统一上报 Vue 应用内未处理错误。
- [x] B. 复杂面板局部失败可用 `onErrorCaptured` 展示降级 UI。
- [x] C. API 状态码和业务码应在请求层归一化处理。
- [x] D. 未捕获 Promise 可监听 `window.unhandledrejection` 并补充业务 try/catch。
- [ ] E. 所有错误都应该在组件模板里用 `v-if` 吞掉，不需要上报。

**解释**：稳定项目要分层处理错误：局部降级、全局上报、请求归一、用户恢复动作和告警链路都要考虑。

### Q3 multiple | 错误边界风险

关于错误边界，哪些注意点正确？

- [x] A. 降级状态不能继续渲染原本出错的子树，否则可能无限错误循环。
- [x] B. 生产环境 `info` 可能是错误码，需要结合 Vue 错误码表还原。
- [x] C. 路由动态 import chunk 失败也需要单独处理。
- [x] D. 异步组件加载失败可配置 errorComponent 或局部错误态。
- [ ] E. 全局 errorHandler 能捕获并自动修复所有网络错误。

**解释**：errorHandler 是上报和兜底入口，不是自动恢复系统。网络和资源加载错误需要对应层处理。

## vue-038

### Q1 single | 优化前提

Vue 性能优化最应该先做什么？

- [ ] A. 先把所有组件都改成异步组件。
- [x] B. 先定位瓶颈，区分加载慢、渲染慢、更新慢还是交互卡顿。
- [ ] C. 先把所有状态放到 Pinia。
- [ ] D. 先删掉所有 computed。

**解释**：性能优化要有指标和证据。不同瓶颈对应不同手段，盲目优化容易增加复杂度。

### Q2 multiple | 更新性能优化

哪些手段主要针对更新或渲染性能？

- [x] A. 保持传给子组件的 props 稳定，避免所有子项依赖同一个 `activeId`。
- [x] B. 大列表使用虚拟滚动。
- [x] C. 永不变化内容用 `v-once`。
- [x] D. 大子树或大列表可用 `v-memo` 跳过更新。
- [ ] E. 把所有内容都 SSR 后，客户端更新性能一定最好。

**解释**：SSR 主要影响首屏和 SEO，不自动解决客户端大列表、频繁输入和复杂更新卡顿。

### Q3 multiple | 加载与响应式优化

哪些优化判断正确？

- [x] A. 路由懒加载和重型组件异步加载可减少首屏 JS。
- [x] B. 大型不可变数据可用 `shallowRef`、`shallowReactive` 或 `markRaw` 降低深层转换成本。
- [x] C. Chrome Performance、Vue DevTools、Web Vitals 和生产数据都可用于验证收益。
- [ ] D. computed 每次返回新对象一定不会影响子组件更新。
- [ ] E. 页面慢一定是 Vue diff 慢。

**解释**：慢可能来自 API、图片、第三方脚本、JS 体积、DOM 节点或响应式深层转换。computed 若返回新对象会破坏引用稳定性。

## vue-039

### Q1 single | 虚拟列表核心

固定高度虚拟列表的核心思想是什么？

- [ ] A. 一次性渲染所有数据，靠 CSS 隐藏不可见行。
- [x] B. 只渲染视口附近数据，用总高度占位并把可见项移动到正确位置。
- [ ] C. 每次滚动都重新请求服务器。
- [ ] D. 用 `v-show` 切换每一行显示隐藏。

**解释**：虚拟列表通过少量 DOM 表示大量数据，使用占位高度保持滚动条，使用 offset 定位可见片段。

### Q2 multiple | 固定高度实现

固定高度虚拟列表通常需要哪些计算或处理？

- [x] A. `totalHeight = itemCount * itemHeight`。
- [x] B. 根据 `scrollTop / itemHeight` 计算 start。
- [x] C. 使用 overscan 向前后扩展渲染范围，减少快速滚动白屏。
- [x] D. 用 `transform: translateY(offset)` 移动可见列表。
- [ ] E. 使用可见区下标作为业务 key，保证状态不乱。

**解释**：可见区下标会随滚动复用，不能代表业务身份。列表项仍应使用稳定业务 id。

### Q3 multiple | 动态高度与 Vue 边界

动态高度虚拟列表有哪些难点？

- [x] A. 需要维护每项高度和前缀和。
- [x] B. 根据 `scrollTop` 找 start 时常用二分查找。
- [x] C. 渲染后可能要用 `ResizeObserver` 或测量更新高度缓存。
- [x] D. 未测量项常用预估高度兜底，再渐进修正。
- [ ] E. 动态高度比固定高度简单，因为不需要 offset。

**解释**：动态高度要处理测量、缓存、跳动修正、容器 resize、滚动到指定项等问题，复杂度明显更高。

## vue-040

### Q1 single | 表单校验分层

可维护表单校验方案为什么不建议把所有 if 都散写在 input 事件里？

- [ ] A. 因为 Vue 不支持 input 事件。
- [x] B. 因为字段状态、规则、错误展示、异步校验和提交流程需要清晰分层。
- [ ] C. 因为表单只能靠后端校验。
- [ ] D. 因为 v-model 已经包含完整校验能力。

**解释**：`v-model` 只解决值同步。校验规则、触发时机、错误映射、提交禁用和异步竞态都要单独建模。

### Q2 multiple | 字段状态

哪些属于表单字段或表单流程中应建模的状态？

- [x] A. `touched`、`dirty`。
- [x] B. `validating`、`disabled`。
- [x] C. 字段错误和表单级错误。
- [x] D. 提交中状态，用于防重复点击。
- [ ] E. 每个字段都必须进全局 Pinia。

**解释**：表单状态通常就近管理或由表单库管理。只有跨页面共享的草稿等特殊状态才考虑全局 store。

### Q3 multiple | 异步校验与可访问性

哪些表单工程实践正确？

- [x] A. 异步校验要防抖并处理竞态，避免旧结果覆盖新结果。
- [x] B. 服务端字段错误应能回填到对应字段。
- [x] C. 非字段错误应展示在表单级错误区。
- [x] D. 错误提示可通过 `aria-invalid`、`aria-describedby` 关联输入框。
- [ ] E. 为了即时反馈，应在每个字符输入时立刻展示所有错误。

**解释**：触发时机要区分 input、blur、change 和 submit，避免过度打扰用户。可访问性也需要错误和输入框建立明确关系。

## vue-041

### Q1 single | 渲染模式选择

内容稳定、构建时能确定的文档或博客，更适合哪种渲染模式？

- [ ] A. 纯 CSR，所有内容等浏览器请求后再渲染。
- [ ] B. 每次请求都 SSR。
- [x] C. SSG，构建时预生成静态 HTML。
- [ ] D. 只使用 Hydration，不需要 HTML。

**解释**：SSG 适合内容在构建时确定的页面，运行时成本低。数据变化时通常需要重新构建或增量生成。

### Q2 multiple | Hydration mismatch

哪些情况容易导致 hydration mismatch？

- [x] A. 模板里直接调用 `Date.now()` 或 `Math.random()`。
- [x] B. 客户端首次渲染依赖 localStorage，但服务端无法获得。
- [x] C. 服务端和客户端时区或语言环境不同。
- [x] D. HTML 嵌套非法，被浏览器自动修正。
- [ ] E. 服务端和客户端使用完全相同的 payload 和初始状态。

**解释**：Hydration 要求服务端 DOM 和客户端首次 vnode 一致。随机数、时间、浏览器 API、非法 HTML 都会制造差异。

### Q3 multiple | SSR 工程边界

Vue SSR 项目中，哪些实践正确？

- [x] A. 客户端入口使用 `createSSRApp()` 执行 hydration。
- [x] B. app、router、Pinia store 应按请求创建，避免跨请求污染。
- [x] C. `window`、`document`、localStorage 访问放到客户端生命周期或条件分支。
- [x] D. 复杂 SSR 项目可优先考虑 Nuxt。
- [ ] E. 把用户状态放在模块顶层单例里，性能最好且没有安全问题。

**解释**：SSR 是多请求环境，模块顶层用户状态可能泄漏到其他请求。浏览器能力也不能在服务端直接使用。

## vue-042

### Q1 single | Nuxt 定位

Nuxt 相比纯 Vue SPA，主要解决的是什么层面的问题？

- [ ] A. 只提供一个按钮组件库。
- [x] B. 提供路由约定、渲染模式、数据获取、SEO、服务端能力和部署适配等应用框架能力。
- [ ] C. 让 Vue 不再需要组件。
- [ ] D. 只用于替代 Pinia。

**解释**：Nuxt 是 Vue 元框架，解决应用组织和运行时问题，不只是组件渲染。

### Q2 multiple | Nuxt 能力

哪些是 Nuxt 常见能力？

- [x] A. `pages/` 文件路由和 `layouts/` 布局。
- [x] B. SSR、SSG、混合渲染和 routeRules。
- [x] C. `useFetch` / `useAsyncData` 服务端取数并序列化 payload。
- [x] D. `server/api` 提供轻量后端接口。
- [ ] E. 自动让所有浏览器 API 在服务端可用。

**解释**：Nuxt 提供服务端运行时，但服务端仍没有浏览器 DOM、localStorage 等 API。代码要区分客户端和服务端边界。

### Q3 multiple | 选择 Nuxt 的边界

哪些项目更适合或不适合 Nuxt？

- [x] A. 内容站、官网、文档、博客适合考虑 Nuxt。
- [x] B. 需要 SEO 的商品详情和活动页适合考虑 Nuxt。
- [x] C. 纯后台系统、强客户端交互、对 SEO 不敏感时，Vite SPA 往往更简单。
- [x] D. Nuxt 增加了约定、构建链路和服务端运行时心智成本。
- [ ] E. 只要是 Vue 项目，都必须用 Nuxt 才能上线。

**解释**：Nuxt 的价值来自 SSR/SSG/SEO/服务端能力和约定式应用框架；不敏感场景用纯 SPA 更轻。

## vue-043

### Q1 single | props 类型声明

在 `<script setup lang="ts">` 中，关于 `defineProps` 的说法哪项正确？

- [ ] A. 运行时声明和类型声明必须同时使用。
- [x] B. 可以使用运行时声明或类型声明，但不应两种混用。
- [ ] C. `defineProps` 必须手动从 `vue` import。
- [ ] D. 类型声明的 props 不支持默认值。

**解释**：`defineProps` 是编译器宏，可用运行时对象或 TS 类型声明。默认值可通过 `withDefaults` 或 Vue 3.5+ 响应式解构处理。

### Q2 multiple | ref 类型

哪些 ref 类型实践正确？

- [x] A. `ref<number>(0)` 明确数字类型。
- [x] B. `ref<User | null>(null)` 适合初始为空的对象。
- [x] C. `ref<User[]>([])` 避免空数组推断不符合预期。
- [x] D. `ref<T>()` 不传初始值时结果会包含 `undefined`，使用时要处理。
- [ ] E. `ref<T>()` 不传初值也保证永远有 T。

**解释**：初始值为 null、空数组、未传初值时常需要显式类型。未传初值意味着 `.value` 可能是 undefined。

### Q3 multiple | 模板引用与组件实例

关于 Vue + TS 的模板引用，哪些说法正确？

- [x] A. Vue 3.5+ 推荐 `useTemplateRef()`。
- [x] B. DOM ref 挂载前可能是 null，访问要做空值判断。
- [x] C. 子组件实例引用可用 `InstanceType<typeof Child>`。
- [x] D. `<script setup>` 子组件默认私有，父组件只能访问 `defineExpose` 暴露的内容。
- [ ] E. 父组件应该依赖子组件所有内部变量，方便快速开发。

**解释**：组件 ref 是命令式 escape hatch，公共 API 应由 `defineExpose` 明确暴露，避免父子强耦合。

## vue-044

### Q1 single | template ref 时机

Template ref 通常什么时候可以安全访问 DOM？

- [ ] A. 模块加载时。
- [ ] B. `setup` 一开始。
- [x] C. `onMounted` 之后，且要考虑 `v-if` 让 ref 重新变 null。
- [ ] D. 服务端渲染阶段。

**解释**：DOM 只有挂载后才存在；条件渲染卸载时 ref 可能回到 null，所以访问要判空。

### Q2 multiple | defineExpose

父组件通过 ref 调用子组件方法时，哪些说法正确？

- [x] A. `<script setup>` 子组件默认不会暴露内部变量。
- [x] B. 子组件需用 `defineExpose({ reset })` 显式暴露方法。
- [x] C. `defineExpose` 必须在任何 `await` 之前调用。
- [x] D. ref 更适合聚焦、滚动、重置这类命令式能力。
- [ ] E. 所有父子通信都应该改成 ref 调方法。

**解释**：数据流优先 props/emit；template ref 适合少量命令式能力。过度使用会让父子强耦合。

### Q3 multiple | ref 列表与公开 API

关于 template ref 的边界，哪些说法正确？

- [x] A. Options API 或非 `<script setup>` 子组件默认暴露完整组件实例，可能造成耦合。
- [x] B. 可用 Options API 的 `expose` 限制公开 API。
- [x] C. ref 用在 `v-for` 中得到数组，但顺序不保证和源数组完全一致。
- [x] D. 函数 ref 在元素卸载时会收到 `null`。
- [ ] E. `v-for` 中 ref 数组永远等于源数组顺序，可用于业务排序依据。

**解释**：列表 ref 的顺序不应作为业务语义依赖。复杂列表可用函数 ref 自己维护映射和清理。

## vue-045

### Q1 single | InjectionKey 价值

为什么推荐用 `InjectionKey<T>` 类型化 provide/inject？

- [ ] A. 因为字符串 key 不能用于 inject。
- [x] B. 因为它基于 Symbol，能避免 key 冲突，并在 provider/consumer 之间携带类型。
- [ ] C. 因为它会把注入值自动变成 readonly。
- [ ] D. 因为它会在运行时校验所有字段。

**解释**：`InjectionKey<T>` 是带泛型的 Symbol key。它提升类型联动和唯一性，但不做运行时 schema 校验。

### Q2 multiple | 类型化上下文封装

哪些 provide/inject 封装实践合理？

- [x] A. 把 key 放到单独文件导出，provider 和 consumer 复用。
- [x] B. 封装 `useFormContext()`，缺少 provider 时抛出明确错误。
- [x] C. 可选注入可提供默认值；高成本默认值可用工厂并传第三个参数 `true`。
- [x] D. 状态只读时，把接口类型建模为 `Readonly<Ref<T>>`。
- [ ] E. 字符串 key 手动写泛型后，provider 和 consumer 类型就能自动联动。

**解释**：字符串 key 上的泛型只约束当前 inject 调用，不会和 provider 自动关联。InjectionKey 才能建立跨端类型关系。

### Q3 multiple | 注入行为

关于 provide/inject 行为，哪些判断正确？

- [x] A. 如果提供的是 ref，注入方拿到的仍是这个 ref，不会自动解包。
- [x] B. 多个祖先提供同一个 key 时，注入会解析最近的 provider。
- [x] C. `provide()` / `inject()` 应同步调用在 setup 或 `<script setup>` 中。
- [x] D. 修改逻辑更推荐留在 provider 内，通过显式方法暴露。
- [ ] E. inject 每次都会深拷贝一份状态给子组件。

**解释**：inject 得到的是提供的同一引用。要控制写入边界，应提供 readonly 状态和明确的更新方法。

## vue-046

### Q1 single | Vue 默认转义

用户输入 `<img onerror=alert(1)>` 被 `{{ userInput }}` 渲染时，默认会怎样？

- [x] A. 作为文本转义显示，不会当 HTML 执行。
- [ ] B. 自动变成真实 img 并执行 onerror。
- [ ] C. 被 Vue 编译成模板表达式执行。
- [ ] D. Vue 会自动调用 DOMPurify 清洗后插入。

**解释**：Vue 模板插值默认转义 HTML。主动使用 `v-html` 或动态编译模板时才绕过这层保护。

### Q2 multiple | v-html 风险

哪些属于 `v-html` 或 `innerHTML` 渲染不可信内容的风险？

- [x] A. HTML 注入和事件属性。
- [x] B. 危险链接，例如 `javascript:`。
- [x] C. 样式注入造成遮罩诱导点击等攻击。
- [x] D. 第三方富文本中夹带未知标签和属性。
- [ ] E. Vue 会自动把所有 v-html 内容转义成纯文本。

**解释**：`v-html` 会把字符串作为 HTML 插入 DOM，必须由开发者负责白名单清洗和安全策略。

### Q3 multiple | XSS 防御

哪些 Vue 安全实践正确？

- [x] A. 永远不要把不可信内容当 Vue template 编译。
- [x] B. 必须渲染富文本时，使用 DOMPurify 等白名单清洗。
- [x] C. 后端也要清洗和校验 URL、富文本、错误文案等不可信内容。
- [x] D. 配置 CSP 可降低脚本注入后的破坏面。
- [ ] E. 只要用了 Vue，token 放 localStorage 就完全不怕 XSS。

**解释**：Vue 只默认保护普通插值。主动绕过转义、存储敏感 token、动态编译模板都需要额外安全设计。

## vue-047

### Q1 single | 组件库 Button

组件库 Button 底层优先使用原生 `<button>` 时，为什么常默认 `type="button"`？

- [ ] A. 因为 button 不能用于表单。
- [x] B. 避免放在表单里时意外触发 submit。
- [ ] C. 因为 `type="submit"` 在 Vue 中无效。
- [ ] D. 因为只有 `type="button"` 才能绑定 click。

**解释**：原生 button 在表单中默认可能提交表单。组件库应避免默认行为造成意外提交。

### Q2 multiple | Modal 可访问性

一个完整 Modal 需要考虑哪些能力？

- [x] A. Teleport 到 body，避免层级和裁剪问题。
- [x] B. `role="dialog"`、`aria-modal` 和标题关联。
- [x] C. 打开后管理焦点，关闭后恢复触发按钮焦点。
- [x] D. ESC、遮罩、关闭按钮、确认取消走统一关闭流程。
- [ ] E. 只要 `v-if` 显示出来，就天然具备焦点陷阱和滚动锁。

**解释**：Modal 的难点是交互上下文。显示浮层只是第一步，焦点、滚动、键盘和可访问性都要明确实现。

### Q3 multiple | 公共组件工程细节

哪些组件库工程细节正确？

- [x] A. props、emits、slots、attrs 透传要类型化和文档化。
- [x] B. 有包装元素时，用 `inheritAttrs: false` 把 `aria-*` 等透传到真正交互元素。
- [x] C. 支持 CSS 变量、主题 token、暗色模式和必要定制。
- [x] D. Modal 多实例要处理 z-index 和 body 滚动锁计数。
- [ ] E. 公共组件只要当前页面能用，不需要测试和 API 稳定性。

**解释**：公共组件的目标是稳定、可组合、可预测，需要覆盖 API、可访问性、主题、边界和测试。

## vue-048

### Q1 single | 测试重点

Vue 组件测试最应该优先验证什么？

- [ ] A. 私有 ref 的变量名是否和源码一致。
- [x] B. 用户可观察行为和组件契约，例如渲染、交互、emit、异步状态。
- [ ] C. 每一行实现代码是否被快照保存。
- [ ] D. 只测试 CSS class 名，不测试行为。

**解释**：测试应像用户一样交互，再断言 DOM、emit、请求调用、路由跳转或可访问状态，避免绑死实现细节。

### Q2 multiple | 异步组件测试

哪些 Vue 测试异步处理是正确的？

- [x] A. `trigger()`、`setValue()` 这类触发更新的方法通常要 `await`。
- [x] B. 组件内部 Promise 或接口 mock 常配合 `flushPromises()`。
- [x] C. 定时器逻辑可用 Vitest fake timers 控制时间。
- [ ] D. Vue DOM 更新都是同步的，所以不需要等待。
- [ ] E. `flushPromises()` 能替代所有用户交互。

**解释**：Vue DOM 更新和 Promise 都可能异步。`flushPromises` 等待 Promise，不等于模拟真实交互。

### Q3 multiple | 测试依赖注入

依赖 Router、Pinia、provide/inject 或重型子组件时，哪些做法合理？

- [x] A. 用 `global.plugins` 注入测试 router/store。
- [x] B. 用 `global.provide` 提供上下文。
- [x] C. 用 `global.stubs` 隔离不关心的重型子组件。
- [x] D. 选择器优先用 `data-test`，少依赖样式类和脆弱 DOM 结构。
- [ ] E. 每个组件测试都直接启动真实应用入口。

**解释**：组件测试应控制依赖和范围。真实全应用入口更适合 E2E，不适合每个单元测试反复启动。

## vue-049

### Q1 single | 请求层分层

成熟 Vue 项目中，HTTP client 层主要负责什么？

- [ ] A. 直接渲染页面 DOM。
- [x] B. baseURL、headers、超时、取消、错误归一和登录态等通用请求能力。
- [ ] C. 保存所有页面局部表单状态。
- [ ] D. 代替后端做所有权限校验。

**解释**：HTTP client 是基础设施层；业务 API 暴露具体函数；页面/store/query 工具负责 loading、缓存和 UI 状态。

### Q2 multiple | 请求状态归属

哪些请求状态管理判断正确？

- [x] A. 简单页面可在组件内维护 idle/loading/success/error。
- [x] B. 跨页面共享、缓存、重试、失效刷新可考虑 TanStack Query for Vue。
- [x] C. Pinia 更适合登录态、权限、主题、购物车等客户端状态。
- [ ] D. 所有接口 loading 都应该全局共享。
- [ ] E. AbortError 应该总是展示为用户错误 toast。

**解释**：取消请求通常是正常控制流，不应作为用户错误展示。server state 和 client state 要区分。

### Q3 multiple | 取消与 token 刷新

请求层工程中，哪些处理更稳妥？

- [x] A. 搜索和路由切换时用 AbortController 或请求序号处理竞态。
- [x] B. Vue 3.5+ watch 请求可用 `onWatcherCleanup()` 取消过期请求。
- [x] C. token 刷新应避免并发刷新风暴，可维护 refresh promise 队列。
- [x] D. 刷新失败后统一登出并清理缓存。
- [ ] E. 旧请求晚返回覆盖新结果是浏览器会自动避免的问题。

**解释**：网络顺序不可控，必须显式处理取消和竞态。token 刷新也要协调并发请求。

## vue-050

### Q1 single | 权限层次

后台权限中，真正的数据和接口鉴权必须在哪里完成？

- [ ] A. 只在按钮隐藏逻辑里完成。
- [ ] B. 只在前端路由守卫里完成。
- [x] C. 后端接口和数据查询层必须校验，前端只负责体验和入口控制。
- [ ] D. 只要菜单隐藏就足够。

**解释**：前端权限可以改善体验，但不能防止用户直接调用接口。后端必须做资源和数据级鉴权。

### Q2 multiple | 路由和菜单权限

哪些权限控制实践正确？

- [x] A. 路由 meta 可声明 `requiresAuth`、`roles` 或 `permission`。
- [x] B. 全局守卫中先加载用户权限，再判断目标路由。
- [x] C. 菜单和路由来源应保持一致，避免菜单隐藏但 URL 可访问。
- [x] D. 动态路由登出或切换账号时要清理。
- [ ] E. 后端下发任意组件 import 路径时，前端应直接执行。

**解释**：动态路由也要本地白名单映射组件，不能信任任意远程路径。权限变化时要重置路由和缓存。

### Q3 multiple | 按钮与数据权限

关于按钮权限和数据权限，哪些说法正确？

- [x] A. 按钮权限可封装 `v-permission` 或 `<Can>` 组件。
- [x] B. 权限码应基于稳定 code，例如 `user:create`，不要绑定中文文案。
- [x] C. 隐藏和禁用是不同产品语义，要按场景选择。
- [x] D. 数据级权限如“只能看本部门订单”必须由后端查询和写入接口校验。
- [ ] E. 按钮隐藏后，用户就无法通过任何方式调用接口。

**解释**：按钮权限只是前端入口控制。数据级规则更复杂，必须后端保证。

## vue-051

### Q1 single | i18n 文案组织

为什么国际化不推荐在代码里拼接句子？

- [ ] A. 因为 vue-i18n 不能处理插值。
- [x] B. 不同语言语序、复数和上下文不同，应使用完整句子翻译和插值规则。
- [ ] C. 因为所有语言都和中文语序一致。
- [ ] D. 因为拼接句子会让 Vue 无法编译模板。

**解释**：国际化要把完整语义交给语言包处理。拼接句子容易在语序、复数、性别和上下文上出错。

### Q2 multiple | i18n 工程实践

哪些国际化实践正确？

- [x] A. 语言包可按路由或模块拆分，避免首屏加载所有语言。
- [x] B. 日期、数字、货币使用 Intl 或 i18n 工具格式化。
- [x] C. 后端错误码映射为前端可翻译 key。
- [x] D. SSR/Nuxt 中服务端和客户端初始 locale 要一致。
- [ ] E. RTL 语言不需要处理 `dir` 和布局逻辑属性。

**解释**：RTL 需要同步 `dir="rtl"`，并优先使用 `margin-inline-start` 等逻辑属性。SSR 初始 locale 不一致会导致 hydration mismatch。

### Q3 multiple | 主题切换

关于主题切换，哪些实践正确？

- [x] A. 用 CSS 变量和根节点 `data-theme` 管理主题。
- [x] B. 支持 `system` 时可读取 `prefers-color-scheme`。
- [x] C. 首次渲染前尽早应用主题，避免闪烁。
- [x] D. 组件库应使用 token 和语义变量，而不是散落硬编码颜色。
- [ ] E. 暗色模式只需要改 body 背景，不用考虑图表、图标、代码高亮和对比度。

**解释**：主题是系统设计问题。图表、第三方组件、阴影、边框、可访问性对比度都要覆盖。

## vue-052

### Q1 single | 微前端生命周期

Vue 子应用接入微前端时，为什么要暴露 `mount` / `unmount` 这类生命周期？

- [ ] A. 让子应用只能独立运行，不能被主应用控制。
- [x] B. 让主应用能控制子应用何时创建、挂载、更新和销毁。
- [ ] C. 让 Vue Router 失效。
- [ ] D. 让所有状态都挂到 window 上。

**解释**：微前端的核心是生命周期可重复、资源可定位、状态可隔离、通信有边界、卸载无残留。

### Q2 multiple | 子应用隔离

Vue 微前端子应用需要重点处理哪些问题？

- [x] A. 路由 base 与主应用挂载路径匹配。
- [x] B. 样式隔离和全局变量污染。
- [x] C. 资源路径、动态 import chunk、图片和字体路径。
- [x] D. 主子应用通信通过 props、事件或明确服务协议。
- [ ] E. 子应用可以随意互相 import 对方业务模块。

**解释**：跨应用直接 import 业务模块会破坏边界和独立部署。通信应通过清晰协议。

### Q3 multiple | 卸载清理

子应用 `unmount` 时应该清理哪些资源？

- [x] A. `app.unmount()`。
- [x] B. router guard、Pinia 订阅、全局事件、定时器。
- [x] C. WebSocket、ResizeObserver、第三方库实例。
- [x] D. 挂到 body 的 Teleport 弹窗容器或遗留 DOM。
- [ ] E. 只把 app 变量设为 null 就足够，Vue 会清理所有外部资源。

**解释**：Vue 会清理组件作用域内的内容，但手动注册的外部资源、全局监听和第三方实例要自己释放。

## vue-053

### Q1 single | 依赖结构

Vue 3 响应式依赖收集常用的数据结构可以概括为哪一个？

- [x] A. `WeakMap<object, Map<key, Set<ReactiveEffect>>>`。
- [ ] B. `Array<Array<string>>`。
- [ ] C. 每个组件一个全局字符串列表。
- [ ] D. DOM 节点到 CSS class 的映射。

**解释**：targetMap 用目标对象作为 WeakMap key，属性 key 映射到依赖该属性的 effect 集合。

### Q2 multiple | track / trigger

关于 `track` 和 `trigger`，哪些说法正确？

- [x] A. 读取响应式属性时，通过 get 拦截调用 `track`。
- [x] B. 修改响应式属性时，通过 set/delete 等拦截调用 `trigger`。
- [x] C. `track` 会把当前 activeEffect 加入对应 dep。
- [x] D. `trigger` 找到 dep 后交给 scheduler 或直接执行 effect。
- [ ] E. `track` 会在没有 activeEffect 时仍然强制收集依赖。

**解释**：没有 activeEffect 说明当前读取不在响应式 effect 中，不需要收集依赖。

### Q3 multiple | 真实实现难点

哪些是 Vue 响应式真实实现需要处理的难点？

- [x] A. effect 栈和嵌套 effect。
- [x] B. 分支切换时依赖清理。
- [x] C. 数组 length、Map/Set、迭代依赖。
- [x] D. 只读、浅响应式、调度器和停止监听。
- [ ] E. 追踪普通局部变量的读写。

**解释**：运行时响应式只能拦截代理对象属性访问，不能追踪普通局部变量。依赖清理避免旧分支字段继续触发更新。

## vue-054

### Q1 single | 调度器目标

Vue 调度器为什么要把组件 update job 放进队列？

- [ ] A. 为了让每次状态修改都同步渲染多次。
- [x] B. 为了去重并在微任务中批量 flush，避免同一轮重复渲染。
- [ ] C. 为了跳过所有 watcher。
- [ ] D. 为了让 DOM 永远不更新。

**解释**：响应式负责发现变化，scheduler 负责安排什么时候更新。多次触发同一组件通常只入队一个稳定 update job。

### Q2 multiple | flush 顺序与 watcher

关于调度器和 watcher flush，哪些说法正确？

- [x] A. `flush: 'pre'` watcher 默认在组件 DOM 更新前执行。
- [x] B. `flush: 'post'` watcher 适合读取更新后的 DOM。
- [x] C. `flush: 'sync'` 绕过批处理同步执行，频繁修改时要谨慎。
- [x] D. 队列会按一定顺序执行，通常父组件先于子组件更新。
- [ ] E. 所有 watcher 都必须同步立即执行，不能排队。

**解释**：不同 flush 选项服务不同副作用时机。sync 不是默认选择，容易造成性能问题。

### Q3 multiple | nextTick 关系

关于 `nextTick` 和调度队列，哪些判断正确？

- [x] A. `nextTick` 等待的是当前已排队的更新 flush 完成。
- [x] B. 如果没有待 flush 更新，通常返回已 resolved 的 Promise。
- [x] C. `nextTick` 不是创建一次更新，而是等待这一轮更新结束。
- [x] D. 需要等布局绘制时可能还要 `requestAnimationFrame`。
- [ ] E. `nextTick` 等价于浏览器下一帧绘制完成。

**解释**：nextTick 和 Vue 微任务更新队列有关，不保证浏览器已经完成布局、绘制或动画。

## vue-055

### Q1 single | SFC descriptor

`.vue` 文件编译第一步通常会解析成什么？

- [ ] A. 直接生成浏览器 DOM。
- [x] B. SFC descriptor，包含 template、script、script setup、style 等 block。
- [ ] C. Pinia store。
- [ ] D. 路由记录。

**解释**：`@vue/compiler-sfc` 会先把 SFC 拆成 descriptor，再由构建工具按不同 query 分别处理 block。

### Q2 multiple | SFC 编译步骤

哪些属于 SFC 编译处理内容？

- [x] A. `compileScript` 处理 `<script setup>` 宏、props/emits 提升和绑定分析。
- [x] B. `compileTemplate` 把 template 转成 render 函数。
- [x] C. `compileStyle` 处理 scoped、CSS modules、`v-bind()` CSS vars。
- [x] D. facade module 组合 script、render、style、scope id 和 HMR 信息。
- [ ] E. SFC 编译会自动生成后端数据库表。

**解释**：SFC 编译是前端构建过程，负责把 `.vue` 拆分、转换并组合成 JS/CSS 模块。

### Q3 multiple | 编译期收益

为什么 Vue SFC 编译很重要？

- [x] A. 模板可静态分析，生成 PatchFlag 等优化信息。
- [x] B. `<script setup>` 宏是编译期能力，运行时不存在 `defineProps` 这类函数。
- [x] C. `<style scoped>` 通过 scope id 改写选择器和模板节点。
- [x] D. HMR 可按 template/style/script 变化尽量保留状态或局部更新。
- [ ] E. 使用 SFC 后运行时完全不需要 JavaScript。

**解释**：编译期让运行时代码更少猜测，也提升开发体验，但组件仍需要 JavaScript 执行。

## vue-056

### Q1 single | PatchFlag

PatchFlag 的作用是什么？

- [ ] A. 让所有节点都跳过更新。
- [x] B. 标记动态节点哪些部分可能变化，让运行时定向 patch。
- [ ] C. 只用于 CSS scoped。
- [ ] D. 替代响应式系统。

**解释**：PatchFlag 是编译器给运行时的提示，例如 TEXT、CLASS、STYLE、PROPS 等，用于减少完整 props/children 比较。

### Q2 multiple | Block Tree

关于 Block Tree，哪些说法正确？

- [x] A. `openBlock()` 会开启动态节点收集。
- [x] B. `createElementBlock()` 会创建 block root。
- [x] C. 动态子孙节点会收集到 `dynamicChildren`。
- [x] D. 更新时可跳过大量稳定结构，只遍历动态节点。
- [ ] E. `dynamicChildren` 只可能包含直接子节点，不能包含动态后代。

**解释**：dynamicChildren 收集的是有 PatchFlag 的动态后代，不限于直接子节点。

### Q3 multiple | 优化边界

哪些情况可能降低编译优化效果？

- [x] A. 手写 render 函数。
- [x] B. 高度动态的 slot。
- [x] C. 动态组件和 `FULL_PROPS`。
- [x] D. 手动 clone vnode。
- [ ] E. 普通静态模板标题。

**解释**：编译器需要静态信息才能生成精确优化提示。高度动态场景会更保守，进入完整 diff 或 bail out。

## vue-057

### Q1 single | scoped CSS 原理

`<style scoped>` 的本质是什么？

- [ ] A. 浏览器原生 Shadow DOM。
- [x] B. 编译器给模板节点和 CSS 选择器加同一个 scope 属性。
- [ ] C. 自动把所有样式变成 inline style。
- [ ] D. 只在 SSR 中生效。

**解释**：scoped CSS 是属性选择器改写，不是真正 Shadow DOM。它降低样式串扰，但不是强隔离。

### Q2 multiple | 特殊选择器

哪些 scoped CSS 特殊选择器用途匹配正确？

- [x] A. `:deep()` 穿透到子组件或第三方组件内部。
- [x] B. `:slotted()` 选择父组件传入的插槽内容。
- [x] C. `:global()` 声明不加 scope 的全局样式。
- [ ] D. `:deep()` 能自动防御 XSS。
- [ ] E. `:slotted()` 会让插槽内容改由子组件作用域编译。

**解释**：这些选择器只影响 CSS 匹配，不改变模板作用域，也不提供安全清洗。

### Q3 multiple | scoped 边界

关于 scoped CSS，哪些注意点正确？

- [x] A. 子组件根节点会同时带父子 scope 属性，父组件可布局子组件根节点。
- [x] B. `v-html` 生成的 DOM 不会带 scope 属性，普通 scoped 选择器选不到。
- [x] C. 深度选择器会增加耦合，公共组件应优先暴露 CSS 变量或 class。
- [x] D. 复杂递归组件中后代选择器可能影响递归子树。
- [ ] E. scoped CSS 可以完全隔绝全局样式、CSS 变量和 Teleport 内容影响。

**解释**：scoped 是普通 CSS 改写，仍受继承、全局样式、Teleport、第三方样式等影响。

## vue-058

### Q1 single | mismatch 本质

Hydration mismatch 的本质是什么？

- [ ] A. 服务端和客户端都没有渲染任何 HTML。
- [x] B. 服务端输出的 DOM 与客户端首次渲染 vnode 结果不一致。
- [ ] C. 浏览器不支持 Vue 模板。
- [ ] D. CSS 文件加载过慢。

**解释**：Hydration 要求用客户端应用接管已有 DOM。如果首次结果不同，Vue 需要修正甚至局部重渲染。

### Q2 multiple | mismatch 常见原因

哪些会造成 SSR hydration mismatch？

- [x] A. 服务端和客户端初始 store 状态不同。
- [x] B. 模板中使用随机数、当前时间、用户时区。
- [x] C. 依赖 viewport、localStorage、window 等浏览器专属信息。
- [x] D. Teleport SSR 内容没有注入正确容器。
- [ ] E. 客户端入口使用 `createSSRApp()` 并复用服务端 payload。

**解释**：复用服务端 payload 和 `createSSRApp()` 是正确方向。浏览器专属、随机和容器不一致才是高风险来源。

### Q3 multiple | 修复与排查

哪些 hydration mismatch 修复/排查方式正确？

- [x] A. 首次渲染数据放到服务端 payload 并在客户端复用。
- [x] B. 浏览器专属内容延迟到 mounted 后渲染，或使用 ClientOnly。
- [x] C. 检查非法 HTML 嵌套和第三方组件服务端/客户端结构。
- [x] D. Vue 3.5+ 的 `data-allow-mismatch` 只作为不可避免局部差异的最后手段。
- [ ] E. 看到 mismatch 警告后直接全部加 `data-allow-mismatch` 就完成修复。

**解释**：抑制警告不是修复。要确认内容、事件绑定和状态接管都正确。

## vue-059

### Q1 single | Pinia 插件时机

Pinia 插件通过 `pinia.use()` 注册后，什么时候应用到 store？

- [ ] A. 所有已创建和未创建 store 都会立刻自动重建。
- [x] B. 每个 store 创建时执行插件，通常只影响插件注册之后创建的 store。
- [ ] C. 只在组件 mounted 时执行。
- [ ] D. 只在 SSR 阶段执行。

**解释**：Pinia 插件在 store 创建时拿到上下文。要确保插件在创建 store 前注册，并通常在 `app.use(pinia)` 之后生效。

### Q2 multiple | 持久化插件设计

设计 Pinia 持久化插件时，哪些事项正确？

- [x] A. SSR 下不能直接访问 localStorage，要判断运行环境。
- [x] B. 可配置 paths，只持久化必要字段。
- [x] C. 需要处理版本迁移和 JSON 序列化失败。
- [x] D. 大对象写入可节流，避免每次小变更都完整写 localStorage。
- [ ] E. access token、refresh token 和敏感权限字段都适合明文持久化。

**解释**：持久化要过滤敏感字段，并处理迁移、异常、多标签同步和写入成本。

### Q3 multiple | 插件扩展与调试

关于 Pinia 插件扩展，哪些说法正确？

- [x] A. 返回对象可给 store 添加属性，并被 devtools 追踪。
- [x] B. 直接写到 store 上的自定义属性，开发环境可加入 `store._customProperties` 方便调试。
- [x] C. 给 store 添加 router 等外部对象时可用 `markRaw()` 避免响应式包装。
- [x] D. 新增 store 属性或自定义 options 应通过 TypeScript module augmentation 扩展类型。
- [ ] E. 插件新增属性时，业务代码只能用 `any`。

**解释**：Pinia 支持类型扩展。合理 augmentation 能让插件 API 保持类型安全。

## vue-060

### Q1 single | History 模式选择

使用 `createWebHistory()` 部署 SPA 时，服务端必须注意什么？

- [ ] A. 禁止所有刷新操作。
- [x] B. 未知前端路径要回退到 `index.html`，同时保留资源和 API 的真实 404。
- [ ] C. 所有 URL 都必须带 `#`。
- [ ] D. 每个路由都要生成一个 HTML 文件。

**解释**：HTML5 history 的路径会发送给服务端。服务端需要 fallback 给前端路由接管。

### Q2 multiple | history 类型

哪些 Vue Router history 判断正确？

- [x] A. `createWebHistory` URL 正常，但需要服务器 fallback。
- [x] B. `createWebHashHistory` 部署简单，hash 不会发送给服务端。
- [x] C. `createMemoryHistory` 常用于 SSR 或测试。
- [x] D. 部署在子路径时 base path 配错会影响刷新、资源路径和跳转。
- [ ] E. hash 模式 SEO 和 URL 观感一定优于 web history。

**解释**：hash 部署省心，但 URL 观感和 SEO 通常不如 web history。子路径部署要同时配置 Router base 和构建 base。

### Q3 multiple | matcher 与导航

关于 Router matcher 和导航流程，哪些说法正确？

- [x] A. matcher 把路由配置编译成可匹配记录，并提取 params。
- [x] B. 静态片段通常比动态参数优先，动态参数又比通配符优先。
- [x] C. `router.resolve()` 可得到标准化 route 信息和 href。
- [x] D. 导航会经历 leave 守卫、全局守卫、update 守卫、beforeEnter、异步组件解析等步骤。
- [ ] E. 如果同时传 `path` 和 `params`，params 一定参与路径生成。

**解释**：命名路由配合 params 更安全；传 path 时 params 会被忽略。matcher 负责解析和排序匹配。

## vue-061

### Q1 single | Modal 受控关闭

受控 Modal 内部想关闭时，最合理的做法是什么？

- [ ] A. 直接修改 `props.open = false`。
- [x] B. 走统一关闭流程，必要时等待 `beforeClose`，然后 emit `update:open` 和 close 事件。
- [ ] C. 直接删除 DOM 节点，不通知父组件。
- [ ] D. 用全局变量强行同步状态。

**解释**：受控组件的显示状态由父组件持有，内部通过事件请求更新。统一关闭流程便于处理拦截、原因和副作用。

### Q2 multiple | 焦点与可访问性

完整 Modal 需要哪些焦点和无障碍处理？

- [x] A. 打开时聚焦弹窗或第一个合适的可聚焦元素。
- [x] B. Tab/Shift+Tab 应限制在弹窗内循环。
- [x] C. 关闭后恢复到触发元素或合理位置。
- [x] D. 使用 `role="dialog"`、`aria-modal`、标题关联。
- [ ] E. 只设置 `aria-modal` 就能自动阻止背景所有鼠标和键盘交互。

**解释**：ARIA 描述语义，不自动实现交互限制。背景不可交互、焦点陷阱和恢复都要额外处理。

### Q3 multiple | Modal 边界

哪些 Modal 边界处理正确？

- [x] A. 多弹窗滚动锁要计数，不能一个关闭就提前解锁。
- [x] B. 嵌套弹窗时只允许最顶层响应 ESC 和焦点陷阱。
- [x] C. Transition 下关闭动画结束前 DOM 可能仍存在，焦点和滚动锁要协调。
- [x] D. 路由切换、异步确认、防重复提交都要纳入关闭流程。
- [ ] E. Teleport 到 body 后就不需要清理任何遗留内容。

**解释**：Teleport 只改变渲染位置。弹窗生命周期、滚动锁、焦点锁和遗留 DOM 都要管理。

## vue-062

### Q1 single | 构建优化第一步

Vue + Vite 构建优化前，最应该先做什么？

- [ ] A. 盲目把 node_modules 全部手动拆成独立 chunk。
- [x] B. 分析首屏 chunk、最大依赖、缓存命中、压缩后体积和真实网络耗时。
- [ ] C. 关闭所有 sourcemap 和报警后直接上线。
- [ ] D. 把所有页面改成同步 import。

**解释**：构建优化要先用报告和真实指标定位问题，再决定懒加载、拆包、替换依赖或缓存策略。

### Q2 multiple | Vite/Rollup 优化手段

哪些是常见构建优化手段？

- [x] A. 路由级动态 import。
- [x] B. 重型库如编辑器、图表、地图异步加载。
- [x] C. 组件库按需导入。
- [x] D. 使用 rollup-plugin-visualizer 分析产物。
- [ ] E. chunk 拆得越碎越好，没有任何请求成本。

**解释**：过度拆分会增加请求和调度成本。chunk 策略要围绕首屏路径和缓存稳定性设计。

### Q3 multiple | 缓存和产物

哪些产物和缓存策略正确？

- [x] A. HTML 通常 no-cache。
- [x] B. 带 hash 的静态资源可 immutable 长缓存。
- [x] C. 开启 gzip/br 压缩可降低传输体积。
- [x] D. 选择合适 `build.target` 可减少不必要转译和 polyfill。
- [ ] E. 未压缩体积下降就一定代表真实用户体验改善。

**解释**：真实体验还受网络、缓存、解析执行、主线程、LCP/INP 等影响。压缩后体积和运行成本都要看。

## vue-063

### Q1 single | 泄漏来源

Vue 组件卸载时，哪类资源不会由 Vue 自动完整清理？

- [ ] A. 模板中声明的普通事件绑定。
- [x] B. 手动注册到 window/document 的事件、第三方实例、定时器、WebSocket 等外部资源。
- [ ] C. 组件自身同步创建的响应式 render effect。
- [ ] D. 普通模板插值。

**解释**：Vue 会清理组件作用域内的响应式 effect 和模板事件，但外部资源必须由开发者在卸载/停用时释放。

### Q2 multiple | KeepAlive 与泄漏

KeepAlive 场景下，哪些处理正确？

- [x] A. 组件停用不会卸载，轮询可能仍继续。
- [x] B. 可在 `onDeactivated` 暂停轮询、视频播放、图表动画。
- [x] C. 可在 `onActivated` 恢复必要资源或刷新过期数据。
- [x] D. 真正销毁资源仍放在 `onUnmounted` 或 `onScopeDispose`。
- [ ] E. KeepAlive 会自动暂停所有异步任务。

**解释**：缓存是保留实例。暂停与恢复需要开发者根据业务资源显式处理。

### Q3 multiple | 排查与预防

哪些内存泄漏排查/预防方式正确？

- [x] A. 反复进入离开页面，手动 GC，观察 heap snapshot 是否持续增长。
- [x] B. 沿 retained size 和 retainers 找到是谁还引用对象。
- [x] C. Observer 要 `disconnect()`，Worker 要 `terminate()`，Object URL 要 revoke。
- [x] D. 异步创建的 watcher 或手动 effectScope 要保存 stop 或调用 `scope.stop()`。
- [ ] E. 全局 store 保存 DOM 节点和组件实例是推荐缓存策略。

**解释**：全局引用会延长对象生命周期。缓存应保存普通数据和 id，并设置容量、过期或清理入口。

## vue-064

### Q1 single | Vue 2 到 Vue 3 创建应用

Vue 3 中应用创建方式的关键变化是什么？

- [ ] A. 继续使用 `new Vue()` 作为推荐入口。
- [x] B. 使用 `createApp` 创建应用实例，并通过 app 实例配置插件和全局能力。
- [ ] C. 所有全局 API 都必须挂到 window。
- [ ] D. Vue 3 不再支持插件。

**解释**：Vue 3 把全局配置收敛到 app 实例，减少多个应用之间的全局污染。

### Q2 multiple | 破坏性变化

Vue 2 迁移 Vue 3 时，哪些变化需要重点关注？

- [x] A. `v-model` 默认变为 `modelValue` / `update:modelValue`，`.sync` 被参数化 v-model 替代。
- [x] B. `$listeners` 并入 `$attrs`，attrs 透传要重新检查。
- [x] C. `.native` 修饰符移除，需要声明 emits 避免监听器误透传。
- [x] D. filters、事件实例 API、`$children` 等被移除。
- [ ] E. Vue 3 仍然需要 `Vue.set` 才能追踪新增属性。

**解释**：Vue 3 基于 Proxy，新增属性和数组索引不再需要 Vue.set，但不支持 IE11。

### Q3 multiple | 迁移策略

大型 Vue 2 项目迁移时，哪些策略更稳妥？

- [x] A. 先盘点依赖和 UI 库是否支持 Vue 3。
- [x] B. 可先升级到 Vue 2.7，清理 filters、事件总线、`.sync` 等高风险写法。
- [x] C. 使用 migration build 收集运行时告警。
- [x] D. 迁移和 Composition API 重写、UI 改版、状态架构重构尽量拆开。
- [ ] E. 必须一次性重写所有组件，否则无法迁移。

**解释**：迁移首要目标是稳定运行和行为一致。Options API 在 Vue 3 中仍可用，重构可以渐进进行。

## vue-065

### Q1 single | 手写响应式核心

手写简化 Vue 响应式系统时，最核心的流程是什么？

- [ ] A. 每秒轮询所有对象属性是否变化。
- [x] B. Proxy 拦截读写，读时 `track` 收集 activeEffect，写时 `trigger` 触发依赖。
- [ ] C. 直接修改 DOM innerHTML。
- [ ] D. 用 JSON.stringify 比较整个对象。

**解释**：Vue 3 响应式是运行时拦截属性访问。effect 执行时读取属性建立依赖，属性变化后触发对应 effect。

### Q2 multiple | 最小实现能力

一个简化响应式系统至少要包含哪些能力？

- [x] A. `reactive` 返回 Proxy。
- [x] B. `effect` 执行函数并记录当前 activeEffect。
- [x] C. `track` / `trigger` 维护 WeakMap -> Map -> Set 依赖结构。
- [x] D. 依赖清理，避免条件分支旧依赖继续触发。
- [ ] E. 直接追踪所有普通局部变量赋值。

**解释**：运行时系统只能追踪代理对象属性访问。依赖清理是处理分支切换的关键。

### Q3 multiple | 真实 Vue 还需处理

相对简化版，真实 Vue 响应式还要处理哪些问题？

- [x] A. raw 到 proxy 缓存，避免重复代理。
- [x] B. `stop`、computed、ref、watch。
- [x] C. 数组 length、Map/Set、has/ownKeys 迭代依赖。
- [x] D. 只读/浅响应式、批量调度和开发态调试钩子。
- [ ] E. 把所有对象都深拷贝一份再响应式。

**解释**：真实实现需要性能、边界和调试能力。Proxy 不是深拷贝，响应式代理要保持原对象和代理映射关系。
