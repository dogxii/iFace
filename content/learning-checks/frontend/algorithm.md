# 手写题 测试一下

## code-001

### Q1 single | 防抖语义

连续输入搜索关键词时，希望用户停止输入 300ms 后才请求接口，应该使用哪种机制？

- [x] A. 防抖：每次触发都重新计时，最后一次触发后延迟执行。
- [ ] B. 节流：固定时间窗口内最多执行一次。
- [ ] C. 轮询：固定间隔一直请求。
- [ ] D. 批处理：把所有请求一次性同步执行。

**解释**：防抖适合“只关心最后一次”的场景，例如搜索输入、窗口 resize 后重新计算。

### Q2 multiple | debounce 实现细节

实现通用 debounce 时，哪些细节是必要的？

- [x] A. 每次调用都清除旧 timer 并重新设置。
- [x] B. 用普通函数返回包装函数，方便保留调用时的 `this`。
- [x] C. 调用原函数时用 `fn.apply(this, args)` 传递上下文和参数。
- [ ] D. 每次触发都立即执行原函数，timer 只负责日志。
- [ ] E. 用全局变量保存 timer，让所有 debounce 实例共享同一个计时器。

**解释**：防抖实例之间的 timer 应互相隔离，并且要保留最后一次调用的上下文和参数。

### Q3 multiple | immediate/cancel/flush

关于增强版 debounce，哪些说法正确？

- [x] A. `immediate` 通常表示等待期第一下立即执行。
- [x] B. `cancel` 应清理 timer、`lastThis` 和 `lastArgs`。
- [x] C. `flush` 可立即执行最后一次待执行调用。
- [ ] D. `immediate` 开启后，等待期内每次触发都应立即执行。
- [ ] E. `cancel` 只需要把返回值置空，不需要清 timer。

**解释**：增强能力考验边界状态。`immediate` 不等于每次立即执行，`cancel/flush` 都要处理挂起调用。

## code-002

### Q1 single | 节流语义

滚动事件持续触发时，希望每 200ms 最多执行一次统计逻辑，应该使用什么？

- [ ] A. 防抖。
- [x] B. 节流。
- [ ] C. 深拷贝。
- [ ] D. Promise.allSettled。

**解释**：节流适合持续触发但需要稳定采样的场景，例如 scroll、mousemove、resize。

### Q2 multiple | leading/trailing

关于节流的 leading 和 trailing，哪些理解正确？

- [x] A. `leading: true` 可让第一次触发立即执行。
- [x] B. `trailing: true` 可保留时间窗口内最后一次调用。
- [x] C. 同时支持二者时，需要保存最新一次的 `this` 和参数。
- [ ] D. `trailing: false` 时仍必须执行最后一次调用。
- [ ] E. `leading: false` 表示永远不执行。

**解释**：节流的行为取决于窗口开头和结尾是否执行。真实实现要明确两端策略。

### Q3 multiple | 时间戳版与定时器版

哪些说法正确？

- [x] A. 时间戳版通常首次响应快，但可能没有最后一次 trailing 调用。
- [x] B. 定时器版可实现尾部执行，但首次可能延迟。
- [x] C. 不管任务成功失败，都要避免 timer 状态卡死。
- [ ] D. 节流实现不需要处理 `this` 和参数。
- [ ] E. 节流和防抖的执行时机完全相同。

**解释**：时间戳和定时器各有偏向。生产实现通常合并两者并提供配置项。

## code-003

### Q1 single | 循环引用

深拷贝遇到对象自引用时，最关键的处理是什么？

- [ ] A. 直接 `JSON.stringify`。
- [x] B. 用 `WeakMap` 记录原对象到克隆对象的映射。
- [ ] C. 忽略所有对象属性。
- [ ] D. 把循环引用都改成字符串。

**解释**：`WeakMap` 能在递归前缓存已创建的克隆对象，避免无限递归并保持引用关系。

### Q2 multiple | 特殊类型处理

高质量 deepClone 应该特别处理哪些类型或细节？

- [x] A. `Date` 复制时间戳。
- [x] B. `RegExp` 复制 source、flags 和 `lastIndex`。
- [x] C. `Map` 的 key 和 value 都递归克隆。
- [x] D. `Set` 的成员递归克隆。
- [ ] E. 函数一定要重新解析源码并创建新函数。

**解释**：深拷贝不是只递归普通对象。特殊内置对象要按语义复制，函数通常复用。

### Q3 multiple | 属性完整性

为了尽量保留对象属性特征，哪些做法合理？

- [x] A. 用 `Reflect.ownKeys` 覆盖字符串 key 和 symbol key。
- [x] B. 用 `Object.getOwnPropertyDescriptors` 保留不可枚举属性和访问器描述符。
- [x] C. 用 `Object.create(Object.getPrototypeOf(value))` 保留原型。
- [ ] D. 只遍历 `Object.keys` 就能完整复制所有属性。
- [ ] E. `structuredClone` 能克隆函数，所以可替代所有场景。

**解释**：普通枚举遍历会漏掉 symbol、不可枚举和描述符信息。`structuredClone` 也有类型限制。

## code-004

### Q1 single | Promise.all 行为

`Promise.all([p1, p2, p3])` 中 `p2` 先 reject 时，整体会怎样？

- [ ] A. 等所有 Promise 完成后 resolve 成状态数组。
- [x] B. 立即以 `p2` 的 reason reject。
- [ ] C. 忽略失败项，只返回成功项。
- [ ] D. 永远 pending。

**解释**：`Promise.all` 是 fail-fast，只要任意输入 reject，整体就 reject。

### Q2 multiple | 手写 Promise.all 细节

哪些实现细节正确？

- [x] A. 结果顺序应按输入顺序，而不是完成顺序。
- [x] B. 每一项用 `Promise.resolve(item)` 兼容普通值和 thenable。
- [x] C. 空 iterable 应 resolve 为 `[]`。
- [x] D. 遍历 iterable 过程中抛错，应 reject 外层 Promise。
- [ ] E. 只要某项完成，就可以 resolve 整个结果数组。

**解释**：`Promise.all` 要等待所有 fulfilled，并且保留输入顺序和 iterable 错误语义。

### Q3 multiple | 计数与索引

为什么手写 `Promise.all` 时要保存 `currentIndex`？

- [x] A. 异步完成顺序可能和输入顺序不同。
- [x] B. 闭包中直接使用递增后的 `index` 容易写错结果位置。
- [x] C. 需要把每个结果放回它原来的输入位置。
- [ ] D. 因为 Promise 只能按数字 key resolve。
- [ ] E. 因为数组不能存放普通值。

**解释**：并发任务完成顺序不可控，结果数组必须靠原始下标还原输入顺序。

## code-005

### Q1 single | allSettled 语义

`Promise.allSettled` 和 `Promise.all` 最大区别是什么？

- [x] A. `allSettled` 会等待所有输入 settled，不会因单个 reject 提前结束。
- [ ] B. `allSettled` 只接受成功的 Promise。
- [ ] C. `allSettled` 返回第一个成功值。
- [ ] D. `allSettled` 空数组会永远 pending。

**解释**：`allSettled` 适合批量请求汇总结果，失败项也要被记录下来。

### Q2 multiple | allSettled 返回值

哪些返回项格式正确？

- [x] A. `{ status: 'fulfilled', value }`
- [x] B. `{ status: 'rejected', reason }`
- [ ] C. `{ ok: true, data }`
- [ ] D. `{ error }`
- [ ] E. `{ status: 'pending' }`

**解释**：标准结果只有 fulfilled 和 rejected 两类状态，且字段分别是 `value` 和 `reason`。

### Q3 multiple | 实现注意点

手写 `allSettled` 时，哪些细节正确？

- [x] A. 普通值要包装成 fulfilled 结果。
- [x] B. 输出顺序仍然按输入顺序。
- [x] C. 每个任务完成后递增 settled 计数，全部完成再 resolve。
- [ ] D. 任意一个任务 reject 就 reject 外层 Promise。
- [ ] E. 非 iterable 输入应静默返回空数组。

**解释**：`allSettled` 只会因输入不可迭代或遍历异常等实现层错误 reject，不会因单项任务失败 reject。

## code-006

### Q1 single | race 与 any

`Promise.race` 和 `Promise.any` 的核心区别是什么？

- [ ] A. 二者都返回最后完成的 Promise。
- [x] B. `race` 看第一个 settled，`any` 看第一个 fulfilled。
- [ ] C. `race` 忽略失败，`any` 失败一次就 reject。
- [ ] D. 二者都必须等待全部完成。

**解释**：`race` 不区分成功失败，`any` 会忽略前面的失败直到出现成功或全部失败。

### Q2 multiple | Promise.any 细节

哪些说法正确？

- [x] A. 第一个 fulfilled 会让整体 resolve。
- [x] B. 全部 rejected 时整体 reject `AggregateError`。
- [x] C. 失败原因应按输入顺序保存。
- [x] D. 空 iterable 会 reject `AggregateError([])`。
- [ ] E. 第一个 rejected 会让整体立即 reject。

**解释**：`any` 的目标是“任意一个成功即可”，只有没有任何成功时才整体失败。

### Q3 multiple | Promise.race 场景

哪些场景适合 `Promise.race`？

- [x] A. 请求和超时 Promise 竞争。
- [x] B. 多个数据源谁先有结果就用谁，包括失败也要快速暴露。
- [x] C. 实现“第一个 settled”的控制流。
- [ ] D. 收集所有请求结果。
- [ ] E. 只要第一个成功值，忽略失败值。

**解释**：收集全部用 all/allSettled，第一个成功用 any，第一个 settled 才是 race。

## code-007

### Q1 single | then 返回值

符合 Promises/A+ 的 `then` 必须返回什么？

- [ ] A. 当前 promise 自身。
- [x] B. 一个新的 promise。
- [ ] C. 回调函数本身。
- [ ] D. 永远返回 undefined。

**解释**：`then` 返回新 promise，才能根据回调返回值、异常和 thenable 继续链式解析。

### Q2 multiple | Promise Resolution Procedure

`resolvePromise(promise2, x, resolve, reject)` 需要处理哪些情况？

- [x] A. `x === promise2` 时 reject，避免循环引用。
- [x] B. `x` 是 thenable 时读取并调用它的 `then`。
- [x] C. thenable 的 resolve/reject 只能生效一次。
- [x] D. 读取或调用 `then` 抛错时按规范 reject。
- [ ] E. 只要 `x` 是对象，就直接 resolve，不看 `then`。

**解释**：Promise/A+ 难点在 thenable 同化和一次性保护，而不是简单保存状态。

### Q3 multiple | 状态与调度

哪些说法符合 Promise 规范精神？

- [x] A. 状态只能从 pending 变为 fulfilled 或 rejected，且只能一次。
- [x] B. fulfilled/rejected 回调必须异步执行。
- [x] C. `onFulfilled` 非函数时应透传值。
- [x] D. `onRejected` 非函数时应继续抛出 reason。
- [ ] E. executor 抛错后，如果已 resolve，仍应覆盖成 reject。

**解释**：状态不可逆且一次性。默认 handler 保证链式调用中的值和错误能继续传递。

## code-008

### Q1 single | call/apply 差异

`call` 和 `apply` 的核心差异是什么？

- [ ] A. `call` 不能改变 `this`。
- [x] B. 二者改变 `this` 的方式相同，参数传递形式不同。
- [ ] C. `apply` 一定异步执行。
- [ ] D. `call` 只能用于箭头函数。

**解释**：`call(context, a, b)` 是参数列表，`apply(context, [a, b])` 是数组或类数组参数。

### Q2 multiple | 手写 call/apply

哪些实现细节合理？

- [x] A. `context == null` 时常用 `globalThis` 作为非严格模式近似。
- [x] B. 对原始值 context 使用 `Object(context)` 装箱。
- [x] C. 临时挂载函数时用 `Symbol` 避免覆盖已有属性。
- [x] D. 用 `finally` 删除临时属性。
- [ ] E. 直接写 `context.fn = this` 永远不会冲突。

**解释**：手写 call/apply 的核心是借“对象方法调用”制造 this，同时避免属性冲突和清理泄漏。

### Q3 multiple | 手写 bind

关于 `bind`，哪些说法正确？

- [x] A. 支持预置参数，调用时再拼接后续参数。
- [x] B. 绑定函数作为构造函数 `new` 调用时，应忽略绑定的 context。
- [x] C. 为保持 `instanceof` 关系，可让绑定函数原型继承原函数原型。
- [ ] D. `bind` 返回的函数必须每次都立即执行原函数。
- [ ] E. `bind` 后的函数不能再接收参数。

**解释**：`bind` 不只是固定 `this`，还涉及偏函数参数和构造调用语义。

## code-009

### Q1 single | new 的步骤

手写 `new` 时，哪一步不是它的核心行为？

- [ ] A. 创建新对象。
- [ ] B. 将新对象原型指向构造函数的 `prototype`。
- [ ] C. 以新对象作为 `this` 执行构造函数。
- [x] D. 总是返回构造函数的返回值，即使它是基本类型。

**解释**：构造函数返回对象或函数时才覆盖新对象；返回基本类型会被忽略。

### Q2 multiple | myNew 边界

哪些处理正确？

- [x] A. Constructor 不是函数时抛 TypeError。
- [x] B. `Constructor.prototype` 不是对象或函数时，使用 `Object.prototype` 作为原型。
- [x] C. 用 `Object.create(prototype)` 创建实例。
- [x] D. 构造函数返回对象或函数时返回该结果。
- [ ] E. 构造函数返回 `null` 时也应返回 `null`。

**解释**：`null` 不是可用的对象返回值，应返回新实例。prototype 异常时也要有合理兜底。

### Q3 multiple | new 与原型

哪些判断正确？

- [x] A. 新对象可以通过原型链访问构造函数原型上的方法。
- [x] B. 构造函数内部给 `this` 赋值会成为实例自有属性。
- [x] C. `instanceof` 依赖原型链上能否找到构造函数的 `prototype`。
- [ ] D. `new` 会把构造函数的静态属性复制到实例上。
- [ ] E. `new` 会自动深拷贝原型对象。

**解释**：`new` 建立的是实例和 prototype 的原型链关系，不负责复制静态属性或深拷贝原型。

## code-010

### Q1 single | instanceof 原理

`obj instanceof Ctor` 的核心判断是什么？

- [ ] A. `obj.constructor.name === 'Ctor'`。
- [x] B. 沿着 `obj` 的原型链查找是否能找到 `Ctor.prototype`。
- [ ] C. 比较对象的 JSON 字符串。
- [ ] D. 检查对象是否有 `type` 字段。

**解释**：`instanceof` 本质是原型链判断，constructor 属性可能被修改，不能作为可靠依据。

### Q2 multiple | 手写 instanceof 边界

哪些处理合理？

- [x] A. 左侧不是对象或函数时直接返回 false。
- [x] B. 右侧不是函数时抛 TypeError。
- [x] C. 右侧 `prototype` 不是对象时也应按规范处理异常场景。
- [x] D. 通过 `Object.getPrototypeOf` 逐层向上查找。
- [ ] E. 只判断 `obj.__proto__ === Ctor.prototype` 一层就够了。

**解释**：原型链可能有多层，手写实现要一直查到 `null`。

### Q3 multiple | instanceof 局限

哪些说法正确？

- [x] A. 多 realm 场景下，数组等内置对象的 `instanceof` 可能不可靠。
- [x] B. 修改原型链可能改变 `instanceof` 结果。
- [x] C. 判断数组时 `Array.isArray` 通常比 `instanceof Array` 更稳。
- [ ] D. `instanceof` 可以判断所有基本类型。
- [ ] E. `instanceof` 不依赖原型链。

**解释**：`instanceof` 很适合原型链关系判断，但不适合所有类型检测场景。

## code-011

### Q1 single | flat 的 depth

`[1, [2, [3]]].flat(1)` 的结果更接近哪一个？

- [x] A. `[1, 2, [3]]`
- [ ] B. `[1, 2, 3]`
- [ ] C. `[1, [2, [3]]]`
- [ ] D. `[[1], [2], [3]]`

**解释**：`depth = 1` 只展开一层。要完全展开未知深度可使用 `Infinity` 或递归到没有数组。

### Q2 multiple | 手写 flat 细节

哪些实现细节正确？

- [x] A. 需要判断当前元素是否为数组。
- [x] B. `depth > 0` 时才递归展开子数组。
- [x] C. 不应修改原数组，通常返回新数组。
- [x] D. 可以用递归或栈实现。
- [ ] E. 所有对象都应该按数组展开。

**解释**：`flat` 只展开数组元素，不应把普通对象、Map、Set 当作数组处理。

### Q3 multiple | 稀疏数组与深度

关于 `flat` 的边界，哪些说法更稳？

- [x] A. 原生 `flat` 会移除展开层级中的空槽。
- [x] B. `Infinity` 可表示尽可能深地展开。
- [x] C. 深度过大时递归实现可能有调用栈风险。
- [ ] D. `flat` 会深拷贝所有对象元素。
- [ ] E. `flat(0)` 会把所有嵌套数组完全展开。

**解释**：`flat` 处理的是数组结构层级，不是对象深拷贝。极深嵌套可考虑迭代实现。

## code-012

### Q1 single | reduce 初始值

手写 `reduce` 时，如果没有传 `initialValue`，第一轮 accumulator 应该来自哪里？

- [ ] A. 永远是 `undefined`。
- [x] B. 数组中第一个存在的元素。
- [ ] C. 数组最后一个元素。
- [ ] D. 回调函数的返回值。

**解释**：没有初始值时，accumulator 取第一个有效元素，遍历从下一个索引开始。

### Q2 multiple | reduce 边界

哪些行为符合原生 `reduce` 语义？

- [x] A. 空数组且没有 `initialValue` 时抛 TypeError。
- [x] B. callback 必须是函数，否则抛 TypeError。
- [x] C. 回调参数包含 accumulator、currentValue、index、array。
- [x] D. 稀疏数组的空槽通常应跳过。
- [ ] E. `reduce` 必须从右往左遍历。

**解释**：从右往左是 `reduceRight`。`reduce` 的很多坑都集中在初始值和空数组上。

### Q3 multiple | reduce 使用场景

哪些场景适合用 `reduce` 表达？

- [x] A. 求和、计数、聚合对象。
- [x] B. 数组转 Map 或分组结果。
- [x] C. 串联 Promise 形成顺序执行链。
- [ ] D. 修改原数组长度作为唯一目标。
- [ ] E. 替代所有循环，让代码越短越好。

**解释**：`reduce` 适合“把一组值折叠成一个结果”。如果可读性变差，普通循环更好。

## code-013

### Q1 single | map/filter/find 返回

`filter` 的返回值是什么？

- [ ] A. 第一个满足条件的元素。
- [x] B. 所有满足条件元素组成的新数组。
- [ ] C. 原数组本身。
- [ ] D. 布尔值。

**解释**：`find` 返回第一个命中的元素，`filter` 返回所有命中元素的新数组，`map` 返回映射后的新数组。

### Q2 multiple | 原型方法实现

手写 `map`、`filter`、`find` 时，哪些点要注意？

- [x] A. callback 不是函数时应抛 TypeError。
- [x] B. 回调通常传入 value、index、array。
- [x] C. `map` 和 `filter` 不应修改原数组。
- [x] D. 支持可选 `thisArg` 时，应在调用 callback 时绑定。
- [ ] E. `map` 应只返回满足条件的元素。

**解释**：三者回调签名类似，但返回语义不同。`map` 变换，`filter` 筛选，`find` 查找第一个。

### Q3 multiple | 稀疏数组差异

关于数组空槽，哪些说法正确？

- [x] A. `map` 对空槽通常不调用 callback，并在结果中保留空槽。
- [x] B. `filter` 会跳过空槽，返回数组通常更紧凑。
- [x] C. 简版实现可以用 `i in array` 判断索引是否存在。
- [ ] D. 空槽和显式 `undefined` 在所有数组方法中完全一样。
- [ ] E. `filter` 会把所有空槽转换成 `undefined`。

**解释**：稀疏数组是手写原型方法的高频边界。空槽不是普通的 `undefined` 元素。

## code-014

### Q1 single | EventEmitter 核心

发布订阅模式里的 EventEmitter 最核心的数据结构通常是什么？

- [ ] A. 一个按时间排序的数组。
- [x] B. 事件名到监听器集合的映射。
- [ ] C. DOM 树。
- [ ] D. Promise 链。

**解释**：EventEmitter 需要按事件名管理多个 listener，常用 `Map<string, Set<Function>>`。

### Q2 multiple | on/off/once/emit

哪些实现细节正确？

- [x] A. `on` 添加监听器，`off` 移除监听器。
- [x] B. `once` 包装原 listener，触发后自动移除。
- [x] C. `emit` 应把参数传给所有监听器。
- [x] D. emit 前复制 listener 列表可避免遍历中增删造成异常行为。
- [ ] E. `once` 监听器触发后仍应永久保留。

**解释**：事件系统要处理监听器生命周期和遍历期间修改集合的问题。

### Q3 multiple | 工程边界

成熟的 EventEmitter 还需要考虑哪些问题？

- [x] A. 监听器异常是否中断后续 listener。
- [x] B. 同一 listener 重复注册的策略。
- [x] C. 最大监听器数量或泄漏告警。
- [x] D. 事件名支持 string 或 symbol。
- [ ] E. 所有事件必须同步发送到服务器。

**解释**：面试简版关注功能，工程版还要关注异常隔离、内存泄漏和事件名设计。

## code-015

### Q1 single | 观察者模式特点

观察者模式中，Subject 通常直接持有什么？

- [ ] A. 事件中心的全局主题表。
- [x] B. 观察者列表，并在自身状态变化时通知它们。
- [ ] C. HTTP 请求队列。
- [ ] D. CSS 选择器集合。

**解释**：观察者模式里 Subject 与 Observer 有直接关系，Subject 通知已注册观察者。

### Q2 multiple | 观察者 vs 发布订阅

哪些说法正确？

- [x] A. 观察者模式中，Subject 和 Observer 通常直接关联。
- [x] B. 发布订阅模式常通过事件中心或 broker 解耦发布者和订阅者。
- [x] C. EventEmitter 更接近发布订阅。
- [x] D. 观察者对象常暴露 `update` 之类方法。
- [ ] E. 两者完全没有任何共同点。

**解释**：两者都处理通知关系，但耦合方式不同。发布订阅多了一层事件中心。

### Q3 multiple | 实现注意

实现观察者模式时，哪些处理合理？

- [x] A. 订阅时避免重复添加同一个观察者。
- [x] B. 取消订阅时从列表中移除观察者。
- [x] C. 通知前复制观察者列表，避免通知过程中列表变化影响遍历。
- [ ] D. Subject 不需要保存任何观察者。
- [ ] E. 观察者更新失败必须让所有后续观察者都不执行。

**解释**：通知系统的稳定性来自明确的注册、注销和异常策略。

## code-016

### Q1 single | LRU 淘汰策略

LRU 缓存满了以后应该淘汰哪一项？

- [ ] A. 最近最常使用的一项。
- [x] B. 最近最少使用的一项。
- [ ] C. 随机一项。
- [ ] D. key 最大的一项。

**解释**：LRU 是 Least Recently Used，核心是按最近访问时间更新顺序，淘汰最久未使用的 key。

### Q2 multiple | Map 实现 LRU

用 JavaScript `Map` 实现 LRU 时，哪些做法正确？

- [x] A. `get` 命中后删除再重新 set，把 key 移到最新位置。
- [x] B. `set` 已存在 key 时也要刷新顺序。
- [x] C. 超出容量时删除 `map.keys().next().value` 对应的最旧 key。
- [x] D. `get` 未命中返回约定值，例如 `-1` 或 `undefined`。
- [ ] E. Map 会自动按访问顺序刷新 key，不需要手动操作。

**解释**：`Map` 保留插入顺序，不会因读取自动改变顺序，命中后要手动刷新。

### Q3 multiple | LRU 边界

哪些边界需要考虑？

- [x] A. capacity 必须是正整数。
- [x] B. key 的相等规则由 Map 的 SameValueZero 决定。
- [x] C. 若需要过期时间，应和 LRU 淘汰策略分开设计。
- [ ] D. LRU 一定能保证命中率最高。
- [ ] E. LRU 只能用数组实现，不能做到 O(1)。

**解释**：Map 版常见操作可接近 O(1)，但 LRU 只是启发式策略，不等于最优缓存策略。

## code-017

### Q1 single | 虚拟 DOM 最小模型

一个最小虚拟 DOM 节点通常至少包含什么？

- [ ] A. 真实 DOM 引用、浏览器窗口大小和网络状态。
- [x] B. 节点类型、props 和 children。
- [ ] C. CSS 文件路径。
- [ ] D. 数据库连接。

**解释**：虚拟 DOM 是真实 DOM 的轻量描述。最小模型通常用 type、props、children 表达结构。

### Q2 multiple | 简版 diff 规则

哪些规则适合最小 diff 实现？

- [x] A. 文本 vnode 单独处理。
- [x] B. 新节点不存在时移除旧 DOM。
- [x] C. 旧节点不存在时创建并插入新 DOM。
- [x] D. 类型不同直接替换。
- [x] E. 类型相同则复用 DOM，更新 props 和 children。

**解释**：这是最小可用 diff 的核心。真实框架会增加 key、组件、调度和 hydration 等逻辑。

### Q3 multiple | keyed diff

为什么真实框架需要 keyed diff？

- [x] A. 帮助在列表重排时复用正确的 DOM。
- [x] B. 避免仅按索引比较导致状态错位。
- [x] C. 减少不必要的删除和重新创建。
- [ ] D. key 会自动让所有渲染变成 O(1)。
- [ ] E. 没有 key 就无法创建任何 DOM 节点。

**解释**：key 不是性能魔法，而是给列表节点一个稳定身份，避免复用错误。

## code-018

### Q1 single | 柯里化定义

柯里化的核心是？

- [ ] A. 把异步任务变同步。
- [x] B. 把多参数函数转换成可分批接收参数的函数。
- [ ] C. 把对象深拷贝。
- [ ] D. 把数组排序。

**解释**：当收集到足够参数后，柯里化函数再调用原函数。

### Q2 multiple | curry 实现

哪些实现细节正确？

- [x] A. 默认 arity 可取 `fn.length`。
- [x] B. 收集参数数量达到 arity 后执行原函数。
- [x] C. 执行原函数时用 `apply` 保留调用时 `this`。
- [x] D. 支持一次传多个参数，例如 `curried(1, 2)(3)`。
- [ ] E. 每次调用都必须只传一个参数。

**解释**：柯里化强调分批收集，不限制每批只能一个参数。

### Q3 multiple | 占位符与 arity

关于带占位符的 curry，哪些说法正确？

- [x] A. 占位符表示当前位置等待后续参数填补。
- [x] B. 判断是否 ready 时，要确认前 arity 个参数没有占位符。
- [x] C. `fn.length` 遇到默认参数或剩余参数时可能不符合业务预期。
- [ ] D. 占位符会自动调用原函数两次。
- [ ] E. curry 和偏函数完全相同，没有区别。

**解释**：偏函数偏向固定部分参数，柯里化偏向分批收集直到满足 arity。

## code-019

### Q1 single | compose 与 pipe 方向

`compose(f, g, h)(x)` 的执行顺序是什么？

- [x] A. `f(g(h(x)))`
- [ ] B. `h(g(f(x)))`
- [ ] C. `f`、`g`、`h` 并行执行。
- [ ] D. 只执行 `h`。

**解释**：`compose` 从右到左，`pipe` 从左到右。

### Q2 multiple | 组合函数细节

哪些说法正确？

- [x] A. 空函数列表通常返回 identity 函数。
- [x] B. 多参数通常只传给第一步函数。
- [x] C. 后续函数一般接收上一步的单个返回值。
- [x] D. 应校验传入项是否都是函数。
- [ ] E. compose 必须修改所有函数的 `this`。

**解释**：函数组合强调数据流方向和返回值衔接。非法参数应尽早暴露。

### Q3 multiple | 异步 pipe

实现异步 `pipe` 时，哪些做法正确？

- [x] A. 用 `Promise.resolve(first.apply(this, args))` 统一同步和异步第一步。
- [x] B. 后续步骤用 `.then(value => fn.call(this, value))` 串起来。
- [x] C. 任一步 reject 会让整体 Promise reject。
- [ ] D. 所有函数必须同时并发执行。
- [ ] E. 异步版本不能保留 `this`。

**解释**：异步组合本质是 Promise 链，顺序执行并把上一步结果传给下一步。

## code-020

### Q1 single | 寄生组合式继承优势

寄生组合式继承相比 `Child.prototype = new Parent()` 的主要优势是什么？

- [ ] A. 完全不需要原型链。
- [x] B. 继承父类原型方法时不额外执行一次父构造函数。
- [ ] C. 自动深拷贝所有父类属性。
- [ ] D. 自动继承所有静态属性。

**解释**：`Object.create(Parent.prototype)` 只建立原型链，不会把父构造函数实例属性放到子类原型上。

### Q2 multiple | 实现步骤

哪些步骤属于寄生组合式继承？

- [x] A. 子构造函数中用 `Parent.call(this, ...)` 继承实例属性。
- [x] B. `Child.prototype = Object.create(Parent.prototype)`。
- [x] C. 重设 `Child.prototype.constructor` 指向 Child。
- [x] D. 在原型继承完成后再给 `Child.prototype` 挂子类方法。
- [ ] E. 把 `Child.prototype` 直接等于 `Parent.prototype`。

**解释**：直接共享同一个 prototype 会让子类方法污染父类原型。

### Q3 multiple | 继承边界

哪些说法正确？

- [x] A. 父构造函数里的引用类型实例属性不会被所有子实例共享。
- [x] B. 子实例可以通过原型链访问父类原型方法。
- [x] C. 静态属性不会自动继承，需要额外处理。
- [ ] D. `inheritPrototype` 后 `instanceof Parent` 一定失效。
- [ ] E. 子类原型方法应在设置 `Child.prototype` 之前挂载。

**解释**：设置 `Child.prototype` 会替换原型对象，所以子类原型方法应在继承关系建立后再添加。

## code-021

### Q1 single | History 路由刷新

History 路由上线后，刷新 `/about` 页面直接 404，最可能缺少什么？

- [ ] A. 浏览器不支持 `pushState`。
- [x] B. 服务端没有把前端路由 fallback 到 `index.html`。
- [ ] C. 没有使用 hash。
- [ ] D. 没有给链接加 `target="_blank"`。

**解释**：History 路由 URL 不带 `#`，服务端需要把深层路径交给前端应用处理。

### Q2 multiple | Hash 与 History

哪些说法正确？

- [x] A. Hash 路由通过 `location.hash` 表示路径。
- [x] B. hash 变化会触发 `hashchange`。
- [x] C. `pushState` 和 `replaceState` 不会主动触发 `popstate`。
- [x] D. 浏览器前进后退会触发 `popstate`。
- [ ] E. History 路由不需要任何服务端配置。

**解释**：两种路由的核心差异是 URL 表达和部署要求。History 更自然，但需要服务端配合。

### Q3 multiple | 简版路由扩展

真实前端路由通常还需要哪些能力？

- [x] A. 动态参数和嵌套路由。
- [x] B. 导航守卫和重定向。
- [x] C. 路由级懒加载。
- [x] D. 滚动恢复和 404 处理。
- [ ] E. 每次路由变化都强制整页刷新。

**解释**：手写简版只覆盖路径匹配和渲染触发，生产路由还要处理导航生命周期和用户体验。

## code-022

### Q1 single | Store 最小 API

Zustand 风格简版 store 的核心 API 更接近哪一组？

- [x] A. `getState`、`setState`、`subscribe`。
- [ ] B. `render`、`hydrate`、`diff`。
- [ ] C. `connect`、`listen`、`socket`。
- [ ] D. `pushState`、`replaceState`、`popstate`。

**解释**：状态管理最小核心是读取状态、更新状态、订阅变化。

### Q2 multiple | setState 与订阅

哪些实现细节正确？

- [x] A. `setState` 可接收对象或函数形式 partial。
- [x] B. 非 replace 模式下通常浅合并状态。
- [x] C. 状态变化后通知 listener，并传入新旧状态。
- [x] D. 通知前复制 listener 集合更稳，避免回调中增删订阅影响遍历。
- [ ] E. `subscribe` 不需要返回取消订阅函数。

**解释**：订阅系统要同时保证更新语义、取消能力和遍历稳定性。

### Q3 multiple | selector 订阅

为什么要支持 selector 和 equalityFn？

- [x] A. 只在关注的状态片段变化时通知。
- [x] B. 避免无关状态变化导致重复渲染。
- [x] C. 自定义相等判断可适配浅比较等场景。
- [ ] D. selector 会自动深拷贝整个 store。
- [ ] E. equalityFn 的作用是排序 listener。

**解释**：selector 订阅是状态库性能的重要基础，让组件只响应自己真正依赖的数据片段。

## code-023

### Q1 single | 并发池关键

限制并发请求数量时，队列里最应该存放什么？

- [x] A. 任务函数。
- [ ] B. 已经创建并开始执行的 Promise。
- [ ] C. 请求结果。
- [ ] D. DOM 节点。

**解释**：Promise 一创建通常就开始执行。要控制开始时机，队列里必须存任务函数。

### Q2 multiple | Promise 池实现

哪些做法正确？

- [x] A. `limit` 应校验为正整数。
- [x] B. 运行中的任务结束后要从 executing/running 中移除。
- [x] C. 若要求结果按输入顺序返回，需要保存原始 index。
- [x] D. 达到并发上限时可 `await Promise.race(executing)` 等一个任务结束。
- [ ] E. 并发控制可以靠 `Promise.all(tasks.map(task => task()))` 自动完成。

**解释**：`Promise.all` 会一次性启动所有任务，不能限制并发。并发池需要控制任务启动节奏。

### Q3 multiple | 业务扩展

真实请求队列常见扩展有哪些？

- [x] A. 优先级。
- [x] B. 取消和超时。
- [x] C. 重试。
- [x] D. 暂停和恢复。
- [ ] E. 强制所有请求串行，永远不能并发。

**解释**：基础并发池解决“最多同时 N 个”，业务层还会关心失败策略、用户取消和优先级。

## code-024

### Q1 single | 串行调度本质

异步任务串行调度器的核心是什么？

- [ ] A. 把所有任务同时 `Promise.all`。
- [x] B. 一个任务 `await` 完成后再执行下一个任务。
- [ ] C. 只执行最后一个任务。
- [ ] D. 把异步任务变成同步阻塞线程。

**解释**：串行调度保证顺序，任务总耗时通常接近各任务耗时之和。

### Q2 multiple | add/start 设计

哪些设计合理？

- [x] A. `add` 接收任务函数，而不是已启动的 Promise。
- [x] B. `start` 正在运行时再次 start 应有防重策略。
- [x] C. 默认 fail-fast 版本遇到 reject 可让 `start` reject。
- [x] D. `finally` 中恢复 running 状态。
- [ ] E. running 状态不重要，重复 start 不会有任何问题。

**解释**：调度器的状态机很重要。没有防重会导致同一队列被重复消费。

### Q3 multiple | settled 串行

如果希望某个任务失败后仍继续后续任务，应该怎么设计？

- [x] A. 对每个任务单独 try/catch。
- [x] B. 返回 `{ status: 'fulfilled', value }` 或 `{ status: 'rejected', reason }`。
- [x] C. 继续执行后续任务并收集所有结果。
- [ ] D. 第一个任务失败后直接清空后续任务且不返回原因。
- [ ] E. 把所有任务改成并发执行。

**解释**：是否 fail-fast 是调度器策略。allSettled 风格适合批处理结果汇总。

## code-025

### Q1 single | Object.create

`Object.create(proto)` 的核心作用是什么？

- [ ] A. 执行 proto 对应的构造函数。
- [x] B. 创建新对象，并把它的原型设置为 proto。
- [ ] C. 深拷贝 proto 的所有属性。
- [ ] D. 合并多个对象。

**解释**：`Object.create` 只建立原型关系，不会执行构造函数，也不会深拷贝原型属性。

### Q2 multiple | Object.create 边界

哪些说法正确？

- [x] A. `proto` 可以是对象、函数或 `null`。
- [x] B. `proto` 是基本类型时应抛 TypeError。
- [x] C. `Object.create(null)` 创建的对象没有 `Object.prototype`。
- [x] D. `propertiesObject` 可通过 `Object.defineProperties` 定义属性描述符。
- [ ] E. 构造函数中转写法能完美实现 `Object.create(null)`。

**解释**：`Object.create(null)` 是常见边界，普通构造函数中转法无法直接得到 null 原型对象。

### Q3 multiple | Object.assign

关于 `Object.assign`，哪些说法正确？

- [x] A. 只复制 source 的自身可枚举属性。
- [x] B. 会复制可枚举 symbol 属性。
- [x] C. 是浅拷贝，嵌套对象仍共享引用。
- [x] D. 读取 source getter，并通过赋值触发 target setter。
- [ ] E. 会复制继承属性和不可枚举属性。

**解释**：`Object.assign` 是赋值语义，不是描述符级复制，也不是深拷贝。

## code-026

### Q1 single | 模板变量安全

简单模板引擎中，普通 `{{ name }}` 默认应该怎么处理用户输入？

- [ ] A. 原样拼进 HTML。
- [x] B. 做 HTML 转义后输出。
- [ ] C. 用 `eval` 执行。
- [ ] D. 自动发送到服务端。

**解释**：普通插值默认转义可降低 XSS 风险；非转义输出应显式使用特殊语法并限制来源。

### Q2 multiple | 简版模板语法

哪些能力常见于简版模板引擎？

- [x] A. `{{ variable }}` 变量替换。
- [x] B. `{{#if condition}}...{{/if}}` 条件块。
- [x] C. `{{#each list}}...{{/each}}` 列表渲染。
- [x] D. `a.b.c` 路径访问。
- [ ] E. 自动把所有模板转换为数据库索引。

**解释**：模板引擎的核心是解析模板结构，根据数据生成字符串或渲染结果。

### Q3 multiple | 正则实现限制

为什么正则版模板引擎不适合完整生产能力？

- [x] A. 同类块深度嵌套处理困难。
- [x] B. 表达式、else、错误定位会变复杂。
- [x] C. 更完整的实现通常需要 tokenizer、parser 和 AST。
- [ ] D. 正则不能匹配任何字符串。
- [ ] E. 正则实现天然比 AST 更安全。

**解释**：面试简版可以用正则，但复杂语法需要结构化解析，否则边界会迅速失控。

## code-027

### Q1 single | JSONP 原理

JSONP 能跨域的核心原因是什么？

- [ ] A. 它绕过了所有浏览器安全限制。
- [x] B. `script` 标签可以跨域加载并执行脚本。
- [ ] C. 它使用了 WebSocket。
- [ ] D. 它自动开启 CORS。

**解释**：JSONP 本质是加载服务端返回的 JavaScript，例如 `callbackName(data)`。

### Q2 multiple | JSONP 限制

哪些说法正确？

- [x] A. JSONP 只能发 GET 请求。
- [x] B. 服务端必须配合返回指定回调调用。
- [x] C. `script.onerror` 不能可靠拿到 HTTP 状态码和响应体。
- [x] D. 必须清理全局回调、script 标签和 timeout。
- [ ] E. JSONP 比 CORS 更适合所有现代接口。

**解释**：JSONP 是历史跨域方案，能力有限且会执行远程代码，现代项目优先 CORS。

### Q3 multiple | JSONP 安全

JSONP 有哪些安全或工程风险？

- [x] A. 会执行远程脚本，存在 XSS 风险。
- [x] B. 回调名如果可控不严，可能被污染或冲突。
- [x] C. 超时后若不清理，可能泄漏全局函数和 DOM 节点。
- [ ] D. JSONP 默认会校验响应 JSON Schema。
- [ ] E. JSONP 可以安全发送用户密码到任意第三方。

**解释**：JSONP 只能用于可信来源和受控接口，不能当作现代通用跨域方案。

## code-028

### Q1 single | XHR 中 FormData

使用 XHR 发送 `FormData` 时，为什么通常不手动设置 `Content-Type`？

- [ ] A. FormData 不能通过 XHR 发送。
- [x] B. 浏览器会自动设置包含 boundary 的 multipart Content-Type。
- [ ] C. Content-Type 对请求没有任何影响。
- [ ] D. 只能设置为 `text/plain`。

**解释**：手动设置 multipart Content-Type 容易丢失 boundary，导致服务端无法正确解析。

### Q2 multiple | Ajax 封装细节

哪些处理合理？

- [x] A. GET 请求参数合并进 URL 查询串。
- [x] B. 2xx 和按业务允许的 304 可视为成功。
- [x] C. 处理 `error`、`timeout`、`abort`。
- [x] D. 支持 `withCredentials` 和 headers。
- [ ] E. 不管 HTTP 状态码是多少都 resolve。

**解释**：XHR 封装要明确成功条件、请求体序列化、超时和中断语义。

### Q3 multiple | AbortController 与 XHR

用 `AbortController` 接入 XHR 时，哪些做法正确？

- [x] A. 如果 `signal.aborted` 已经为 true，应立即 abort。
- [x] B. 监听 signal 的 `abort` 事件并调用 `xhr.abort()`。
- [x] C. abort 后应让 Promise reject 或按约定返回取消结果。
- [ ] D. AbortController 只能用于 fetch，绝对不能和 XHR 配合。
- [ ] E. abort 后请求仍必须继续发送完整 body。

**解释**：XHR 有自己的 `abort()`，可以用 AbortController 做统一取消接口。

## code-029

### Q1 single | IntersectionObserver 懒加载

图片懒加载优先使用 IntersectionObserver 的主要原因是什么？

- [ ] A. 它会自动压缩图片体积。
- [x] B. 它避免每次滚动都手动计算所有图片位置。
- [ ] C. 它只能在服务端运行。
- [ ] D. 它会强制图片同步加载。

**解释**：IntersectionObserver 由浏览器批量观察可见性变化，性能和表达都更适合懒加载。

### Q2 multiple | 懒加载细节

哪些做法正确？

- [x] A. 使用 `rootMargin` 或 offset 提前加载。
- [x] B. 图片加载后 `unobserve` 或从待检查数组中移除。
- [x] C. 滚动监听兜底方案要节流。
- [x] D. scroll listener 使用 `{ passive: true }` 减少滚动阻塞。
- [ ] E. 每次 scroll 都同步检查页面所有图片，越频繁越好。

**解释**：懒加载要避免用户看到空白，也要避免滚动时造成过多主线程工作。

### Q3 multiple | 原生 lazy 与自定义懒加载

哪些说法正确？

- [x] A. `<img loading="lazy">` 是现代浏览器的原生能力。
- [x] B. 自定义懒加载仍适合占位、渐进加载、动画和兼容需求。
- [x] C. `data-srcset` 也应在加载时正确转移到 `srcset`。
- [ ] D. 原生 lazy 能替代所有复杂图片加载策略。
- [ ] E. 懒加载后不需要考虑图片尺寸占位。

**解释**：原生 lazy 简单好用，但复杂体验仍需要自定义逻辑；尺寸占位可减少布局偏移。

## code-030

### Q1 single | 虚拟滚动核心

固定高度虚拟滚动列表的核心思想是什么？

- [ ] A. 一次性渲染全部数据。
- [x] B. 只渲染可视区域附近的 DOM，并用 spacer 撑开总滚动高度。
- [ ] C. 禁止用户滚动。
- [ ] D. 每个列表项都使用 iframe。

**解释**：虚拟滚动减少 DOM 数量，spacer 负责保持真实滚动条高度。

### Q2 multiple | 固定高度虚拟列表

哪些实现细节正确？

- [x] A. `total * itemHeight` 可得到 spacer 高度。
- [x] B. 根据 `scrollTop / itemHeight` 计算起始索引。
- [x] C. `overscan` 可减少快速滚动白屏。
- [x] D. 用 `transform: translateY(offsetY)` 移动内容窗口。
- [ ] E. 可视 DOM 数量应该等于总数据量。

**解释**：固定高度版本依赖可预测的 itemHeight，渲染窗口大小约为可视条数加 overscan。

### Q3 multiple | 动态高度虚拟列表

动态高度列表比固定高度复杂在哪里？

- [x] A. 需要缓存每项实际高度。
- [x] B. 需要前缀和或二分查找从 scrollTop 定位起始项。
- [x] C. 需要测量回填并处理高度变化。
- [ ] D. 不需要 spacer。
- [ ] E. 动态高度时所有元素都不能虚拟化。

**解释**：动态高度的难点是滚动位置和索引之间不再是简单除法，需要高度数据结构辅助。

## code-031

### Q1 single | 驼峰转短横线

把 `backgroundColor` 转成 CSS 短横线命名，正确结果是什么？

- [x] A. `background-color`
- [ ] B. `Background-Color`
- [ ] C. `background_color`
- [ ] D. `backgroundcolor`

**解释**：驼峰转短横线通常在小写字母或数字后遇到大写字母时插入 `-`，再整体转小写。

### Q2 multiple | 字符串工具边界

哪些边界需要考虑？

- [x] A. 连续大写缩写，例如 `XMLHttpRequest`。
- [x] B. 千分位格式化中的负数。
- [x] C. 千分位格式化中的小数部分。
- [x] D. URL 参数重复 key 可能需要收集成数组。
- [ ] E. URL 参数值一定应该自动转成数字或布尔值。

**解释**：字符串工具题的质量主要看边界。URL 参数天然是字符串，类型转换应由业务决定。

### Q3 multiple | URLSearchParams

关于 URL 参数解析，哪些说法正确？

- [x] A. `URLSearchParams` 能处理百分号编码。
- [x] B. `+` 的空格语义需要按 URL 查询串规则理解。
- [x] C. hash 片段不应当作 query 参数解析。
- [ ] D. 直接按 `&` 和 `=` split 就能覆盖所有编码边界。
- [ ] E. 重复参数一定只能保留最后一个。

**解释**：标准 API 能避免很多编码细节错误。重复 key 的合并策略应按业务定义。

## code-032

### Q1 single | 快排复杂度

快速排序平均时间复杂度通常是多少？

- [ ] A. `O(n)`。
- [x] B. `O(n log n)`。
- [ ] C. `O(n^2 log n)`。
- [ ] D. `O(1)`。

**解释**：快排平均 `O(n log n)`，但 pivot 选择很差时最坏可能退化到 `O(n^2)`。

### Q2 multiple | 快速排序与归并排序

哪些说法正确？

- [x] A. 随机 pivot 可降低快排退化概率。
- [x] B. 原地快排通常不稳定。
- [x] C. 归并排序时间复杂度稳定为 `O(n log n)`。
- [x] D. 归并排序通常需要 `O(n)` 额外空间。
- [ ] E. 快排在任何输入下都严格 `O(n log n)`。

**解释**：排序题要同时比较平均/最坏、稳定性和空间复杂度。

### Q3 multiple | 稳定排序

关于归并排序的稳定性，哪些判断正确？

- [x] A. 合并时相等元素优先取左侧，可保持原相对顺序。
- [x] B. 稳定性对对象列表按多字段排序很重要。
- [x] C. 非原地归并更容易写出稳定版本。
- [ ] D. 只要算法叫排序，就一定稳定。
- [ ] E. 快排天然稳定，不需要额外处理。

**解释**：稳定性不是所有排序算法天然具备。合并过程的相等处理会影响归并排序是否稳定。

## code-033

### Q1 single | 二分前提

二分查找最重要的前提是什么？

- [ ] A. 数组必须是稀疏数组。
- [x] B. 搜索空间有序或满足可二分的单调性。
- [ ] C. 数组长度必须是偶数。
- [ ] D. 元素必须都是字符串。

**解释**：二分依赖单调性来每次排除一半搜索空间，没有有序/单调前提就不能直接二分。

### Q2 multiple | 左右边界

查找左边界时，哪些做法正确？

- [x] A. 命中 target 后记录答案，并继续向左收缩。
- [x] B. `array[mid] >= target` 时可移动右边界。
- [x] C. 找不到时返回 `-1` 或按约定返回插入位置。
- [ ] D. 命中后立即返回任意一个索引。
- [ ] E. 左边界查找不需要处理重复元素。

**解释**：边界查找和普通二分不同，命中后不能立刻结束，要继续寻找更靠左或更靠右的位置。

### Q3 multiple | 二分实现细节

哪些细节能减少二分 bug？

- [x] A. 明确使用闭区间 `[left, right]` 还是半开区间 `[left, right)`。
- [x] B. 循环条件和边界更新要与区间定义一致。
- [x] C. `mid` 可写成 `left + Math.floor((right - left) / 2)`。
- [x] D. 每轮必须缩小搜索区间，避免死循环。
- [ ] E. 所有二分都必须用递归写法。

**解释**：二分难点不是代码长，而是区间定义一致性。手写时先定边界模型。

## code-034

### Q1 single | BFS 数据结构

树或图的广度优先遍历通常使用什么数据结构？

- [ ] A. 栈。
- [x] B. 队列。
- [ ] C. Set 排序器。
- [ ] D. Promise。

**解释**：BFS 按层访问，先进先出队列最自然。DFS 常用递归或栈。

### Q2 multiple | DFS/BFS 对比

哪些说法正确？

- [x] A. DFS 可用递归实现，也可用显式栈实现。
- [x] B. BFS 常用于层序遍历和最短步数类问题。
- [x] C. 树的前序、中序、后序属于 DFS 范畴。
- [x] D. 图遍历通常需要 visited 集合避免重复和环。
- [ ] E. BFS 和 DFS 的访问顺序完全相同。

**解释**：DFS 关注一路深入，BFS 关注逐层扩展。图结构要额外处理环和重复访问。

### Q3 multiple | 队列性能

JavaScript 中实现 BFS 队列时，哪些做法更好？

- [x] A. 用数组加 head 指针代替频繁 `shift()`。
- [x] B. 每次出队后移动 head，避免整体搬移。
- [x] C. 数据量小时 `shift()` 可读性尚可，但大数据要注意成本。
- [ ] D. 每次出队都对队列排序。
- [ ] E. BFS 必须递归，否则不是 BFS。

**解释**：`Array.prototype.shift()` 可能导致元素搬移，大规模遍历时 head 指针更稳。

## code-035

### Q1 single | 反转链表

迭代反转单链表时，最关键的三个指针通常是什么？

- [x] A. `prev`、`current`、`next`。
- [ ] B. `left`、`mid`、`right`。
- [ ] C. `parent`、`child`、`sibling`。
- [ ] D. `resolve`、`reject`、`then`。

**解释**：反转时要先保存 next，再把 current.next 指向 prev，最后整体向前移动。

### Q2 multiple | 链表检测环

关于快慢指针检测环，哪些说法正确？

- [x] A. slow 每次走一步，fast 每次走两步。
- [x] B. 如果有环，二者最终会相遇。
- [x] C. 如果 fast 或 fast.next 为空，说明无环。
- [ ] D. 必须额外用数组保存所有节点才能检测环。
- [ ] E. 快慢指针只适用于数组，不适用于链表。

**解释**：Floyd 判圈可以用 O(1) 额外空间检测链表是否有环。

### Q3 multiple | 合并有序链表

合并两个有序链表时，哪些实现细节合理？

- [x] A. 使用 dummy 头节点简化边界。
- [x] B. 每次连接较小节点，并移动对应链表指针。
- [x] C. 循环结束后把剩余链表接到尾部。
- [x] D. 结果可复用原节点，避免创建大量新节点。
- [ ] E. 必须先把两个链表都转成数组排序。

**解释**：dummy 节点能减少首节点特殊判断。两个有序链表合并可在线性时间完成。

## code-036

### Q1 single | 单例模式目标

单例模式的目标是什么？

- [ ] A. 每次调用都创建新实例。
- [x] B. 保证某个类或资源在应用中只有一个共享实例。
- [ ] C. 把所有方法都改成静态方法。
- [ ] D. 自动实现深拷贝。

**解释**：单例适合全局唯一资源，例如配置中心、日志器、连接管理器等，但要避免滥用全局状态。

### Q2 multiple | 普通单例实现

哪些做法可以实现普通单例？

- [x] A. 闭包保存 instance。
- [x] B. 静态 `getInstance` 中懒创建实例。
- [x] C. 多次调用返回同一个对象引用。
- [ ] D. 在构造函数中无条件返回新对象。
- [ ] E. 把 instance 存到局部变量里且每次调用重新初始化。

**解释**：单例的关键是实例存储位置稳定，并且创建逻辑只发生一次。

### Q3 multiple | Proxy 单例

用 Proxy 包装构造函数实现单例时，哪些说法正确？

- [x] A. 可以拦截 `construct`。
- [x] B. 第一次 `new` 时创建实例，后续返回缓存实例。
- [x] C. 应保持构造参数只在首次创建时真正生效，或明确业务策略。
- [ ] D. Proxy 会自动让所有类都线程安全。
- [ ] E. Proxy 单例会让 `instanceof` 必然失效。

**解释**：Proxy 可以控制构造行为，但参数语义、测试隔离和全局状态风险仍要设计清楚。

## code-037

### Q1 single | 策略模式

策略模式最适合解决哪类问题？

- [ ] A. 所有网络请求都失败。
- [x] B. 多种可替换算法或规则，根据场景选择执行。
- [ ] C. 对象无法被 JSON 序列化。
- [ ] D. CSS 无法居中。

**解释**：策略模式把规则封装成独立策略，减少庞大的 if/else 或 switch。

### Q2 multiple | 表单校验策略

用策略模式做表单校验时，哪些设计合理？

- [x] A. 把 `required`、`minLength`、`pattern` 等规则拆成策略函数。
- [x] B. 每条规则返回错误信息或空值。
- [x] C. 规则表可配置，便于复用和扩展。
- [x] D. 新增规则尽量不修改已有调用流程。
- [ ] E. 所有校验逻辑都写进一个超长 if/else。

**解释**：策略模式的收益是扩展规则时改动局部化，调用流程保持稳定。

### Q3 multiple | 策略模式边界

哪些判断正确？

- [x] A. 策略之间应尽量保持同一输入输出约定。
- [x] B. 策略名到策略函数的映射表能降低选择逻辑复杂度。
- [x] C. 过度拆分很少变化的简单逻辑，可能增加理解成本。
- [ ] D. 策略模式会自动消除所有业务复杂度。
- [ ] E. 策略函数不能接收参数。

**解释**：策略模式解决的是规则选择和扩展问题，不应为了模式而过度抽象。

## code-038

### Q1 single | Vue3 响应式核心

基于 Proxy 的响应式系统，最核心的两步是什么？

- [ ] A. JSON 序列化和反序列化。
- [x] B. getter 中 track 依赖，setter 中 trigger 依赖。
- [ ] C. setTimeout 轮询所有对象。
- [ ] D. 用 CSS 选择器扫描 DOM。

**解释**：响应式系统要知道“谁读取了哪个 key”，并在 key 变化时通知对应 effect。

### Q2 multiple | 依赖存储结构

常见响应式依赖结构包括哪些层级？

- [x] A. `WeakMap`：target -> depsMap。
- [x] B. `Map`：key -> dep。
- [x] C. `Set`：保存依赖该 key 的 effect。
- [ ] D. `Array`：按随机顺序保存所有 CSS 文件。
- [ ] E. `localStorage`：保存每次 getter 调用。

**解释**：`WeakMap -> Map -> Set` 是常见结构，既按对象和 key 精确索引，又有利于垃圾回收。

### Q3 multiple | Proxy 响应式细节

哪些实现细节更可靠？

- [x] A. 使用 `Reflect.get` 和 `Reflect.set` 保持语义和 receiver。
- [x] B. 设置值时用 `Object.is` 判断是否真的变化。
- [x] C. effect 执行前后管理 activeEffect，避免错误收集。
- [x] D. 可用 scheduler 批量或延迟执行 effect。
- [ ] E. 每次读取属性都立即触发所有 effect 更新。

**解释**：track 只收集依赖，trigger 才更新。调度、去重和 receiver 语义决定响应式系统是否稳定。

## code-039

### Q1 single | memoize 作用

函数记忆化主要用来做什么？

- [ ] A. 删除函数参数。
- [x] B. 缓存相同输入的计算结果，避免重复计算。
- [ ] C. 强制函数异步执行。
- [ ] D. 把对象变成数组。

**解释**：memoize 适合纯函数或可用 key 表示输入的计算密集场景。

### Q2 multiple | 缓存 key

设计 memoize 的缓存 key 时，哪些说法正确？

- [x] A. 简单参数可直接用 Map 嵌套或稳定序列化。
- [x] B. `JSON.stringify` 对 key 顺序、函数、undefined、循环引用有局限。
- [x] C. 可允许用户传入 resolver 自定义 key。
- [ ] D. 所有对象参数都能天然作为同一个 key。
- [ ] E. 缓存 key 不重要，随便返回常量即可。

**解释**：memoize 的正确性很大程度取决于 key。错误 key 会导致缓存污染或命中不足。

### Q3 multiple | 工程化 memoize

真实项目中的 memoize 还要考虑哪些问题？

- [x] A. 缓存容量限制，避免内存无限增长。
- [x] B. TTL 或失效机制。
- [x] C. 异步请求的 in-flight Promise 复用。
- [x] D. 保留调用时 `this` 的语义。
- [ ] E. 所有函数都应该永久 memoize。

**解释**：记忆化不是万能优化。副作用函数、输入巨大或命中率低的场景可能得不偿失。

## code-040

### Q1 single | 优先级调度

带优先级的任务调度器最核心的能力是什么？

- [ ] A. 把所有任务按添加顺序无条件串行。
- [x] B. 按优先级选择下一个要执行的任务。
- [ ] C. 禁止任务异步。
- [ ] D. 把任务结果写入 CSS。

**解释**：优先级调度器要在待执行队列中选择更重要的任务先运行，同时维护运行状态。

### Q2 multiple | 调度器实现

哪些实现细节正确？

- [x] A. 可用优先队列或排序队列管理待执行任务。
- [x] B. 同优先级任务可用递增序号保持 FIFO。
- [x] C. 任务完成后要释放 running 并继续调度下一个。
- [x] D. 异步任务应返回 Promise，调度器统一处理 fulfilled/rejected。
- [ ] E. 任务失败后 running 永远不释放。

**解释**：调度器最怕状态卡死。成功、失败、取消都要让队列继续推进或进入明确终态。

### Q3 multiple | 优先级风险

优先级调度可能遇到哪些问题？

- [x] A. 低优先级任务长期饥饿。
- [x] B. 高优先级任务过多导致普通任务延迟明显。
- [x] C. 需要取消、超时、暂停或 aging 等策略。
- [ ] D. 优先级越高，任务一定执行越快且不会失败。
- [ ] E. 有优先级后就不需要并发上限。

**解释**：优先级只影响调度顺序，不改变任务本身耗时和失败概率。工程上要防止饥饿和资源耗尽。

## code-041

### Q1 single | Set 去重

数组基本类型去重时，最简洁的现代写法通常是哪一个？

- [x] A. `[...new Set(array)]`
- [ ] B. `array.sort()` 后直接返回原数组。
- [ ] C. `JSON.stringify(array)`。
- [ ] D. `array.map(Boolean)`。

**解释**：`Set` 基于 SameValueZero 判断相等，适合基本类型去重，能正确处理 `NaN`。

### Q2 multiple | 去重方法对比

哪些说法正确？

- [x] A. `Set` 去重平均时间复杂度接近 `O(n)`。
- [x] B. `indexOf` 双重判断方式通常是 `O(n^2)`。
- [x] C. 排序后相邻比较通常是 `O(n log n)`，但会改变顺序或需要额外保留顺序。
- [x] D. 对象数组去重要先定义唯一 key 或比较规则。
- [ ] E. `Set` 会按对象内容深度去重。

**解释**：对象引用相等不等于内容相等。对象数组去重要明确按 id、字段组合还是深比较。

### Q3 multiple | 相等语义

关于 JavaScript 去重相等语义，哪些判断正确？

- [x] A. `Set` 认为 `NaN` 和 `NaN` 相等。
- [x] B. `Set` 中 `0` 和 `-0` 视为相等。
- [x] C. 两个字面量对象 `{}` 和 `{}` 是不同引用。
- [ ] D. `indexOf(NaN)` 可以正常找到 `NaN`。
- [ ] E. 所有去重方法对 `NaN`、对象和顺序的表现都一样。

**解释**：去重题要先说清楚相等规则。不同方法对 `NaN`、引用和顺序的处理不同。

## code-042

### Q1 single | 请求超时

基于 `fetch` 做请求超时时，常见做法是什么？

- [ ] A. 只在控制台打印超时日志。
- [x] B. 使用 `AbortController`，定时调用 `abort()`。
- [ ] C. 把 URL 改成空字符串。
- [ ] D. 让 Promise 永远 pending。

**解释**：`fetch` 本身没有 timeout 参数，常用 AbortController 取消超时请求。

### Q2 multiple | 重试策略

哪些重试策略更合理？

- [x] A. 只对网络错误、超时或可重试状态码重试。
- [x] B. 设置最大重试次数。
- [x] C. 使用指数退避和少量随机抖动。
- [x] D. 写请求重试前确认幂等性或业务补偿。
- [ ] E. 所有 4xx 错误都无限重试。

**解释**：重试不是越多越好。要避免放大故障、重复写入和无意义请求。

### Q3 multiple | 超时重试实现细节

实现带超时和重试的请求函数时，哪些细节正确？

- [x] A. 每次尝试都应创建新的 AbortController。
- [x] B. 成功、失败或取消后清理 timeout。
- [x] C. 最后一次失败应抛出最终错误或保留上下文。
- [x] D. 外部 signal 取消时应停止后续重试。
- [ ] E. 第一次超时后继续复用同一个已 abort 的 signal。

**解释**：AbortController 是一次性状态，abort 后不能复原。每次重试都要有独立取消控制。

## code-043

### Q1 single | iterable 协议

一个对象能被 `for...of` 遍历，关键是实现什么？

- [x] A. `[Symbol.iterator]()` 返回 iterator。
- [ ] B. `toString()` 返回数组。
- [ ] C. `length` 必须大于 0。
- [ ] D. 必须继承 Array。

**解释**：可迭代对象通过 `Symbol.iterator` 暴露迭代器，迭代器的 `next()` 返回 `{ value, done }`。

### Q2 multiple | 生成器特性

哪些说法正确？

- [x] A. `function*` 会返回生成器对象。
- [x] B. `yield` 可以暂停并产出一个值。
- [x] C. 生成器天然实现 iterator/iterable 协议。
- [x] D. 无限序列必须搭配 `take` 等截断操作消费。
- [ ] E. 生成器会一次性计算完所有值。

**解释**：生成器是惰性的，只有消费时才继续执行。无限序列不能直接展开。

### Q3 multiple | range 设计

实现 `range(start, end, step)` 时，哪些边界值得处理？

- [x] A. `step` 不能为 0。
- [x] B. 正向和反向区间需要不同终止条件。
- [x] C. 返回 iterable 可以让同一个 range 多次遍历。
- [ ] D. 所有 range 都必须先生成完整数组。
- [ ] E. `next()` 可以只返回 value，不需要 done。

**解释**：惰性 range 的价值是不用预先分配数组，但必须正确实现迭代协议和终止条件。

## code-044

### Q1 single | async/await 转换模型

用 Generator 实现 async/await 的核心模型是什么？

- [ ] A. Generator + CSS 动画。
- [x] B. Generator + 自动执行器，每次等待 yielded Promise 后继续 next。
- [ ] C. JSONP + EventEmitter。
- [ ] D. Proxy + Trie。

**解释**：async 函数可理解为把异步流程写成 Generator，再由执行器自动驱动。

### Q2 multiple | 自动执行器细节

哪些实现细节正确？

- [x] A. fulfilled 后调用 `gen.next(value)`。
- [x] B. rejected 后调用 `gen.throw(error)`。
- [x] C. `yield` 普通值也用 `Promise.resolve` 统一处理。
- [x] D. `done: true` 时用 `value` resolve 外层 Promise。
- [ ] E. `yield` 出错后应直接忽略并继续 next。

**解释**：错误要通过 `gen.throw` 抛回 Generator，让内部 try/catch 有机会处理。

### Q3 multiple | this 与异常

封装 `asyncToGenerator` 时，哪些点要注意？

- [x] A. 调用 generatorFn 时保留外层 `this` 和参数。
- [x] B. 创建 generator 本身抛错时，应 reject 外层 Promise。
- [x] C. `gen.next` 或 `gen.throw` 抛错时，也应 reject。
- [ ] D. 自动执行器不需要返回 Promise。
- [ ] E. Generator 内未捕获异常应被吞掉。

**解释**：async 函数最终返回 Promise，未捕获异常会变成外层 Promise 的 rejection。

## code-045

### Q1 single | Vue2 响应式核心

Vue2 风格响应式主要依赖什么 API 劫持属性？

- [ ] A. `Proxy`。
- [x] B. `Object.defineProperty`。
- [ ] C. `JSON.parse`。
- [ ] D. `setInterval`。

**解释**：Vue2 使用 getter 收集依赖、setter 触发更新；Vue3 才主要基于 Proxy。

### Q2 multiple | Dep 与 Watcher

哪些说法正确？

- [x] A. getter 中通过 `Dep.target` 收集当前 Watcher。
- [x] B. setter 中数据变化后调用 dep.notify。
- [x] C. Watcher 初始化时读取数据以触发依赖收集。
- [x] D. 更新时可比较新旧值，避免无意义回调。
- [ ] E. Watcher 不需要保存旧值。

**解释**：Dep 管依赖集合，Watcher 表示具体订阅者。读取建立关系，写入触发通知。

### Q3 multiple | Vue2 限制

`Object.defineProperty` 响应式有哪些天然限制？

- [x] A. 新增属性无法自动被劫持。
- [x] B. 删除属性无法自动触发响应式通知。
- [x] C. 数组索引和 length 变化有特殊限制。
- [x] D. 需要 `Vue.set`、`Vue.delete` 或数组方法劫持补齐。
- [ ] E. 它可以无配置监听 Map 和 Set 的内部变化。

**解释**：defineProperty 是按已有属性定义 getter/setter，新增和删除需要额外 API 补偿。

## code-046

### Q1 single | 内置对象类型判断

跨 iframe 判断数组、Date、Map 等内置类型时，哪种方式通常比 `instanceof` 更稳？

- [x] A. `Object.prototype.toString.call(value)`。
- [ ] B. `value.constructor.name`。
- [ ] C. `typeof value === 'object'`。
- [ ] D. `JSON.stringify(value)`。

**解释**：不同 realm 有不同构造函数，`instanceof` 可能失效；toString 标签更适合内置类型判断。

### Q2 multiple | 基础类型坑点

哪些说法正确？

- [x] A. `typeof null` 是 `'object'`。
- [x] B. `Number.isNaN(NaN)` 为 true。
- [x] C. 是否把 `NaN` 算作 number 要先定义工具函数语义。
- [x] D. `value == null` 可同时判断 null 和 undefined。
- [ ] E. `typeof []` 是 `'array'`。

**解释**：类型工具的关键是语义明确，不同项目对 `NaN`、空值和对象的定义可能不同。

### Q3 multiple | plainObject 与 promiseLike

哪些判断正确？

- [x] A. plainObject 通常要求原型是 `Object.prototype` 或 `null`。
- [x] B. 数组、Date、Map 不应被当作 plainObject。
- [x] C. promiseLike 判断的是对象或函数上是否有可调用的 `then`。
- [ ] D. thenable 一定是原生 Promise。
- [ ] E. `Object.create(null)` 永远不是普通对象。

**解释**：plainObject 关注“普通对象”语义，thenable 关注协议兼容而非构造函数来源。

## code-047

### Q1 single | Trie 适用场景

Trie 最适合解决哪类问题？

- [ ] A. 任意图的最短路径。
- [x] B. 字符串前缀匹配和自动补全。
- [ ] C. CSS 居中。
- [ ] D. Promise 并发控制。

**解释**：Trie 的路径对应字符序列，天然适合按前缀查找。

### Q2 multiple | Trie 节点字段

哪些字段设计合理？

- [x] A. `children` 保存字符到子节点的映射。
- [x] B. `endCount` 标记某个单词结束次数。
- [x] C. `passCount` 记录经过节点的单词数量，便于删除剪枝。
- [ ] D. 每个节点必须保存整棵树所有单词。
- [ ] E. 每个节点只能有一个子节点。

**解释**：children 表达分支，endCount 和 passCount 分别支持重复单词和删除优化。

### Q3 multiple | 自动补全排序

自动补全结果可以按哪些策略排序？

- [x] A. 词频。
- [x] B. 字典序。
- [x] C. 最近使用时间。
- [x] D. 业务权重。
- [ ] E. 只能按字符串长度从长到短。

**解释**：Trie 负责快速找出前缀候选，最终排序策略通常由业务决定。

## code-048

### Q1 single | Koa 洋葱模型

Koa 洋葱模型依赖什么形成“进入从外到内，退出从内到外”？

- [ ] A. `setInterval`。
- [x] B. `await next()`。
- [ ] C. `JSON.stringify`。
- [ ] D. `Object.assign`。

**解释**：上游中间件 `await next()` 后，下游完成再回到上游继续执行后置逻辑。

### Q2 multiple | compose 实现

哪些实现细节正确？

- [x] A. `dispatch(i)` 执行第 i 个中间件。
- [x] B. `i <= index` 可防止同一个中间件多次调用 `next()`。
- [x] C. `Promise.resolve` 可兼容同步和异步中间件。
- [x] D. 当 `i === middlewares.length` 时可执行外部传入的 next。
- [ ] E. next 被调用多次应静默忽略。

**解释**：多次调用 next 会破坏洋葱执行顺序，应当作为错误暴露。

### Q3 multiple | Koa 与 Express

哪些说法正确？

- [x] A. Koa 中间件通常返回 Promise。
- [x] B. Koa 可用 `try/catch await next()` 做统一错误处理。
- [x] C. Express 传统中间件是 `(req, res, next)` callback 风格。
- [ ] D. Express 的 `next()` 天然等价于 Koa 的 `await next()` 洋葱回溯。
- [ ] E. Koa compose 不需要处理异常。

**解释**：Koa 的 async 洋葱模型让前后置逻辑更自然，错误沿 Promise 链向外冒泡。

## code-049

### Q1 single | pick 的属性来源

实现 `pick(obj, keys)` 时，通常应该只取什么属性？

- [x] A. obj 的自身属性。
- [ ] B. obj 原型链上的所有属性。
- [ ] C. 全局对象上的属性。
- [ ] D. JSON 字符串里的属性。

**解释**：工具函数默认不应把原型链属性带入结果，否则容易产生意外和安全风险。

### Q2 multiple | merge 安全

实现深合并时，哪些处理更安全？

- [x] A. 只递归合并普通对象。
- [x] B. 跳过 `__proto__`、`constructor`、`prototype` 等危险 key。
- [x] C. 数组、Date、Map、Set 的合并策略要按业务定义。
- [x] D. 避免污染目标对象原型。
- [ ] E. 对任意对象都直接递归写入，越深越好。

**解释**：深合并是原型污染高风险区域。普通对象之外的类型必须明确策略。

### Q3 multiple | groupBy

关于 `groupBy`，哪些说法正确？

- [x] A. 返回普通对象时，key 会被字符串化。
- [x] B. key 可能是对象时，用 Map 版本更合适。
- [x] C. iteratee 可以是函数，也可以是属性名。
- [ ] D. groupBy 会自动对每个分组排序。
- [ ] E. groupBy 只能处理字符串数组。

**解释**：分组逻辑要明确 key 的类型和输出容器。对象 key 场景用 Map 能避免字符串化。

## code-050

### Q1 single | 请求合并核心

同一时刻多个相同 GET 请求要合并，最核心的做法是什么？

- [ ] A. 每次都发新请求，最后取最快的。
- [x] B. 用稳定 key 保存进行中的 Promise，相同 key 复用同一个 Promise。
- [ ] C. 把所有请求都改成 POST。
- [ ] D. 让后来的请求永远 pending。

**解释**：请求合并的关键是 pending Map。第一个请求创建 Promise，后续相同 key 直接复用。

### Q2 multiple | dedup key 设计

稳定请求 key 通常应包含哪些信息？

- [x] A. URL。
- [x] B. query/body 等请求参数。
- [x] C. 用户身份、租户或权限上下文。
- [x] D. 会影响响应的 headers 或环境信息。
- [ ] E. 当前随机数，确保每次都不同。

**解释**：key 太粗会串数据，key 太细会失去合并效果。必须覆盖影响响应的上下文。

### Q3 multiple | 工程注意

请求合并和短期缓存要注意什么？

- [x] A. pending Promise 在 `finally` 中清理，失败也要清。
- [x] B. GET/只读请求最适合合并。
- [x] C. 写请求合并前必须考虑幂等性。
- [x] D. TTL 缓存、手动失效、后台刷新和错误重试应分开设计。
- [ ] E. 失败 Promise 应永久留在 pending 中，避免再次请求。

**解释**：请求合并解决“同时重复请求”，缓存解决“短期复用数据”。失败清理和 key 设计决定可靠性。
