# React 测试一下

## react-001

### Q1 single | useState 状态快照

下面组件初始显示 `0`，点击一次按钮后，按钮文本通常显示多少？

```tsx
function Counter() {
  const [count, setCount] = useState(0)

  function handleClick() {
    setCount(count + 1)
    setCount(count + 1)
  }

  return <button onClick={handleClick}>{count}</button>
}
```

- [ ] A. `0`，因为 `setState` 是异步的，当前点击不会触发更新。
- [x] B. `1`，因为两次更新都读取了本轮 render 中同一个 `count` 快照。
- [ ] C. `2`，因为调用了两次 `setCount`，React 会按调用次数累加。
- [ ] D. 不确定，React 18 并发模式下这个结果是随机的。

**解释**：`count` 是当前 render 的状态快照，两次 `setCount(count + 1)` 都等价于设置为 `1`。如果新状态依赖旧状态，应使用 `setCount(prev => prev + 1)`。

### Q2 single | 函数式更新

如果希望上面的点击一次稳定累加两次，最合适的写法是什么？

- [ ] A. 在第二次 `setCount` 外面包一层 `setTimeout`，让 React 来得及更新。
- [x] B. 连续调用 `setCount(prev => prev + 1)`，让每次更新基于队列中的上一个状态。
- [ ] C. 把 `count` 放进 `useRef`，然后只修改 `ref.current`。
- [ ] D. 使用 `flushSync` 包住两次更新，确保每次都立即渲染。

**解释**：函数式更新会接收更新队列中最新的前一个状态，适合“下一值依赖上一值”的场景。`setTimeout` 和 `flushSync` 都不是解决这种状态计算问题的首选方案。

### Q3 multiple | 不可变更新

关于 `useState` 更新对象或数组，下列哪些说法是正确的？

- [x] A. 直接修改旧对象再返回同一引用，可能导致 React 无法可靠感知变化。
- [ ] B. 只要对象里的字段变了，即使引用不变，React 也一定会重新渲染。
- [x] C. 推荐返回新对象或新数组，例如 `{ ...prev, name }` 或 `prev.filter(...)`。
- [ ] D. 深层对象更新必须全部改成全局状态库，否则 React 不支持。
- [x] E. 嵌套很深时可以考虑拆分状态、调整数据结构或使用 Immer。

**解释**：React 状态更新依赖引用变化来判断是否需要继续渲染。不可变更新不是形式主义，而是让状态变化可追踪、可比较、可调试。

## react-002

### Q1 single | effect 依赖

下面组件希望在 `userId` 改变时重新订阅用户数据。依赖数组应该怎么写？

```tsx
function Profile({ userId }: { userId: string }) {
  useEffect(() => {
    const unsubscribe = subscribeUser(userId)
    return unsubscribe
  }, [])
}
```

- [ ] A. 保持 `[]`，订阅通常只需要在组件挂载时执行一次。
- [x] B. 写成 `[userId]`，否则 `userId` 变化后仍然订阅旧用户。
- [ ] C. 省略依赖数组，让每次 render 都重新订阅，最保险。
- [ ] D. 写成 `[subscribeUser]`，因为真正调用的是订阅函数。

**解释**：effect 使用了 `userId` 这个响应式值，就应把它放入依赖数组。空数组会让 effect 只按初次 render 的 `userId` 执行，容易造成旧订阅和陈旧闭包。

### Q2 single | 清理函数

下面哪种场景最需要在 `useEffect` 中返回 cleanup 函数？

- [ ] A. 根据 props 计算一个普通字符串。
- [x] B. 注册事件监听、定时器、订阅或 WebSocket 连接。
- [ ] C. 在 render 中根据数组生成 JSX 列表。
- [ ] D. 调用 `setState` 更新一个表单输入值。

**解释**：cleanup 用于撤销 effect 创建的外部副作用，避免内存泄漏、重复监听或旧请求继续影响新状态。纯计算不应该放进 effect，更不需要 cleanup。

### Q3 multiple | 常见误区

关于 `useEffect` 的使用，下列哪些判断是合理的？

- [x] A. 能从 props/state 直接推导出的值，通常不需要再用 effect 同步到另一份 state。
- [ ] B. 为了避免重复执行，可以把依赖数组里的变量删掉。
- [x] C. 请求类 effect 应考虑竞态处理，例如 abort、ignore flag 或请求 id 校验。
- [ ] D. effect 一定在浏览器绘制前同步执行，所以适合读取布局后立即改样式。
- [x] E. 依赖数组比较使用类似 `Object.is` 的浅比较，引用值需要注意稳定性。

**解释**：高质量的 effect 写法强调“同步外部系统”，而不是把它当成通用数据流工具。删依赖会隐藏问题；布局同步需求通常应考虑 `useLayoutEffect`。

## react-003

### Q1 single | ref 与 render

下面代码点击按钮后，页面上的数字会发生什么变化？

```tsx
function Clicks() {
  const countRef = useRef(0)

  return (
    <button onClick={() => countRef.current++}>
      {countRef.current}
    </button>
  )
}
```

- [x] A. `ref.current` 会变化，但页面通常不会因为它变化而重新渲染。
- [ ] B. 页面会从 `0` 变成 `1`，因为 ref 是 React 状态的一种。
- [ ] C. React 会报错，因为 ref 只能绑定 DOM 节点。
- [ ] D. StrictMode 下会变成 `2`，因为点击事件执行两次。

**解释**：`useRef` 返回稳定对象，修改 `current` 不会触发 render。它适合保存不参与视图渲染的数据；需要显示更新时应使用 state。

### Q2 single | DOM 引用

想在输入框渲染后自动聚焦，哪种做法更合适？

- [ ] A. 在组件函数体中直接调用 `inputRef.current.focus()`。
- [x] B. 用 `useRef<HTMLInputElement>(null)` 获取 DOM，再在 effect 中判断并调用 `focus()`。
- [ ] C. 把输入框的 value 存到 ref 中，React 会自动聚焦。
- [ ] D. 给 input 加 `key={Date.now()}`，让它每次 render 都重新挂载。

**解释**：DOM 节点在 commit 后才可用，聚焦属于外部副作用，应该放在 effect 或合适的事件处理里。组件函数体应保持纯渲染。

### Q3 multiple | useRef 场景

哪些场景适合使用 `useRef`？

- [x] A. 保存 DOM 节点引用，例如 input、canvas、滚动容器。
- [x] B. 保存定时器 id、上一次值、请求序号等不直接参与渲染的数据。
- [ ] C. 保存所有表单字段，这样就完全不需要 state。
- [x] D. 在异步回调中读取“最新值”，避免只读到创建回调时的旧闭包。
- [ ] E. 替代 props 在父子组件之间传递数据。

**解释**：ref 的优势是稳定、可变、不会触发 render。它不是状态管理方案，也不应该用来绕过 React 的数据流。

## react-004

### Q1 single | useMemo 的收益

下面哪种情况最适合使用 `useMemo`？

- [ ] A. 包住所有普通字符串拼接，避免 React 重新渲染。
- [x] B. 缓存一次昂贵计算的结果，并且依赖变化频率明显低于组件渲染频率。
- [ ] C. 确保函数在子组件中不会重新创建。
- [ ] D. 让副作用只执行一次。

**解释**：`useMemo` 缓存的是计算结果，不是函数引用，也不是副作用控制器。它本身也有依赖比较和内存成本，应服务于明确的昂贵计算或引用稳定需求。

### Q2 single | useCallback 与 memo

父组件传给 `React.memo` 子组件一个回调 props。什么时候 `useCallback` 最有价值？

- [ ] A. 任何函数都应该包 `useCallback`，否则 React 会无法更新。
- [x] B. 子组件依赖函数引用做浅比较，且父组件频繁 render 导致子组件无意义重渲染。
- [ ] C. 回调内部用了 state，所以必须包 `useCallback` 才能读到最新 state。
- [ ] D. 回调函数很短时，`useCallback` 的收益最大。

**解释**：`useCallback` 缓存函数引用，常和 `React.memo`、依赖数组或自定义 Hook 组合使用。它不能自动解决陈旧闭包，依赖写错反而会制造 bug。

### Q3 multiple | 过度优化

关于 `useMemo` / `useCallback`，哪些说法是正确的？

- [x] A. 它们不是免费优化，依赖比较和缓存维护也有成本。
- [x] B. 依赖数组必须包含计算或回调中用到的响应式值。
- [ ] C. 空依赖数组可以安全避免所有闭包问题。
- [x] D. 如果没有 memoized 子组件或昂贵计算，盲目使用可能让代码更难读。
- [ ] E. `useMemo` 可以替代 `useEffect` 发请求，因为它也有依赖数组。

**解释**：这两个 Hook 的核心是缓存，不是生命周期。判断是否使用，应看是否存在实际性能瓶颈、引用稳定需求或昂贵计算。

## react-005

### Q1 single | Context 更新范围

一个 Context value 写成 `{ user, theme }`，Provider 每次 render 都创建新对象。下列哪个问题最可能出现？

- [ ] A. 消费者永远拿不到最新的 `user`。
- [x] B. 即使 `user` 和 `theme` 实际没变，消费者也可能因为 value 引用变化而重渲染。
- [ ] C. Context 只能传字符串，不能传对象。
- [ ] D. Provider 下所有组件都会丢失本地 state。

**解释**：Context value 按引用比较。每次创建新对象会让所有消费该 Context 的组件收到新 value，可能造成不必要重渲染。

### Q2 single | Context 适用边界

下列哪种状态最适合优先考虑 Context？

- [ ] A. 每秒变化几十次的鼠标坐标。
- [x] B. 主题、语言、当前用户等相对低频且跨层级读取的数据。
- [ ] C. 大量服务端列表数据、缓存、分页和重试状态。
- [ ] D. 每个输入框的临时输入字符。

**解释**：Context 适合低频、广泛读取的环境数据。高频变化或复杂服务端缓存更适合外部 store、状态库或数据请求库。

### Q3 multiple | Context 性能治理

如何缓解 Context 导致的无意义重渲染？

- [x] A. 拆分 Context，把低频和高频字段分开。
- [x] B. 使用 `useMemo` 稳定 Provider value 的对象引用。
- [ ] C. 在消费者里删除对 Context 的读取，改成直接读取全局变量。
- [x] D. 把 dispatch/action 和 state 分离，减少只触发 action 的组件重渲染。
- [ ] E. 给 Provider 加 `React.memo` 就一定能阻止所有消费者更新。

**解释**：Context 优化的关键是缩小变化范围、稳定 value、减少消费者订阅的数据。`React.memo` 不能阻止消费者因 Context value 变化而更新。

## react-006

### Q1 single | 生命周期对应关系

下面哪个 Hook 组合最接近“组件挂载时订阅，卸载时取消订阅”？

- [x] A. `useEffect(() => { subscribe(); return unsubscribe }, [])`
- [ ] B. `useMemo(() => subscribe(), [])`
- [ ] C. `useRef(() => subscribe())`
- [ ] D. 在函数组件顶层直接调用 `subscribe()`

**解释**：订阅属于外部副作用，应放在 effect 中；返回 cleanup 用于卸载时取消订阅。`useMemo` 不应用来执行副作用。

### Q2 single | 类组件更新阶段

类组件中哪个生命周期最常用于在 props/state 更新后执行副作用，并且需要小心避免无限循环？

- [ ] A. `constructor`
- [ ] B. `render`
- [x] C. `componentDidUpdate`
- [ ] D. `shouldComponentUpdate`

**解释**：`componentDidUpdate` 在更新提交后执行，适合根据更新结果同步外部系统；如果内部继续 `setState`，必须加条件判断，避免循环更新。

### Q3 multiple | 函数组件思维

从类组件迁移到函数组件时，哪些理解是正确的？

- [x] A. 不应机械寻找每个生命周期的一一替代，而要按“同步什么外部系统”拆 effect。
- [x] B. render 阶段应保持纯计算，副作用放到 effect 或事件处理里。
- [ ] C. `useEffect(..., [])` 等同于所有场景下的 `componentDidMount`，没有差异。
- [x] D. 一个类生命周期里的多种副作用，在函数组件中可以拆成多个 effect。
- [ ] E. 函数组件没有卸载阶段，所以不需要清理订阅。

**解释**：Hooks 更强调按副作用的目的组织代码，而不是按生命周期槽位组织。cleanup 仍然是卸载和下一次 effect 重建前的重要步骤。

## react-007

### Q1 single | 受控组件

下面输入框为什么属于受控组件？

```tsx
<input value={name} onChange={(event) => setName(event.target.value)} />
```

- [x] A. 输入框显示值由 React state 决定，用户输入通过 `onChange` 回写 state。
- [ ] B. 使用了 `onChange` 的表单元素都是受控组件。
- [ ] C. 只要 input 在 React 组件里渲染，就是受控组件。
- [ ] D. 因为浏览器不再保存输入框的值。

**解释**：受控组件的关键是 value 由 React state 驱动。只有监听事件但不传 `value`，并不一定是受控组件。

### Q2 single | 非受控组件

哪种场景更适合使用非受控组件或 ref 读取值？

- [ ] A. 需要每次输入都实时校验并控制错误展示的注册表单。
- [ ] B. 多字段之间强联动，输入会影响其他 UI。
- [x] C. 文件选择框或只在提交时读取一次值的简单表单。
- [ ] D. 需要把输入值同步到 URL 查询参数。

**解释**：非受控组件适合 DOM 自己管理值、React 只在特定时机读取的场景。复杂交互、实时校验和联动通常更适合受控模式。

### Q3 multiple | 表单陷阱

关于受控/非受控组件，哪些说法是正确的？

- [x] A. 同一个输入框不应在生命周期中从非受控切到受控，或反过来。
- [x] B. 受控组件更容易实现实时校验、格式化和条件禁用。
- [ ] C. 非受控组件完全不能用于 React 表单。
- [x] D. 文件输入通常不能直接用普通字符串 value 完全控制。
- [ ] E. 受控组件一定比非受控组件性能差，应该全部避免。

**解释**：两种模式各有适用场景。真正要避免的是混用导致状态来源不清，以及为了“省事”牺牲表单行为的一致性。

## react-008

### Q1 single | key 的作用

React 列表里的 `key` 主要用于什么？

- [ ] A. 让 DOM 节点拥有一个全局唯一的 HTML id。
- [x] B. 帮助 React 在同层子节点之间匹配旧 Fiber 和新元素，决定复用、移动或销毁。
- [ ] C. 告诉浏览器按 key 排序 DOM。
- [ ] D. 让数组遍历速度更快。

**解释**：`key` 是 React reconciliation 的身份标识，只在同层列表比较中有意义。它不等于 DOM id，也不会被作为普通 props 传给子组件。

### Q2 single | index key 风险

下面列表使用 index 作为 key。在哪种操作后最容易出现输入框内容错位？

```tsx
items.map((item, index) => <Row key={index} item={item} />)
```

- [ ] A. 只在列表末尾追加新项。
- [x] B. 在列表头部插入一项或对列表重新排序。
- [ ] C. 父组件重新 render 但列表顺序不变。
- [ ] D. 给 Row 增加一个 className。

**解释**：index key 会把“位置”当成身份。头部插入或排序会让原来的组件状态被错误复用到另一个数据项上，常见表现就是输入值、展开状态或动画状态错位。

### Q3 multiple | key 选择

哪些 key 选择更合理？

- [x] A. 后端返回的稳定业务 id，例如 `user.id`。
- [x] B. 不会随排序和过滤变化的唯一字段组合。
- [ ] C. `Math.random()`，这样每次都能保证唯一。
- [ ] D. 数组 index，适用于所有列表。
- [x] E. 对完全静态、不会增删改排序的展示列表，index 风险相对较低。

**解释**：好的 key 要稳定、可预测、能代表同一业务实体。随机 key 会导致每次 render 都重新挂载；index 只适合非常受限的静态列表。

## react-009

### Q1 single | React.memo 比较方式

`React.memo` 默认如何判断是否跳过子组件重渲染？

- [ ] A. 深度比较所有 props 的内部字段。
- [x] B. 对 props 做浅比较，引用值只比较引用是否相同。
- [ ] C. 只要父组件 render，memo 子组件一定不会 render。
- [ ] D. 只比较子组件 JSX 是否一样。

**解释**：`React.memo` 默认浅比较 props。对象、数组、函数如果每次都是新引用，即使内容相同，也会让 memo 失效。

### Q2 single | 使用时机

哪个场景最适合考虑 `React.memo`？

- [ ] A. 所有组件都应该默认包一层，越多越好。
- [x] B. 子组件渲染成本较高、props 经常不变、父组件又频繁重渲染。
- [ ] C. 子组件内部有 `useState`，所以必须 memo。
- [ ] D. 想阻止 Context 更新导致的消费者重渲染。

**解释**：`React.memo` 的收益来自“跳过昂贵且无意义的重渲染”。如果组件很轻、props 总是变、或更新来自 Context，memo 可能没有收益。

### Q3 multiple | memo 失效原因

哪些情况可能让 `React.memo` 达不到预期？

- [x] A. 父组件每次 render 都传入新的对象字面量。
- [x] B. 父组件每次 render 都创建新的回调函数，并作为 props 传给子组件。
- [ ] C. 子组件没有使用 class 组件写法。
- [x] D. 子组件自己读取的 Context value 发生变化。
- [ ] E. 子组件返回了多个 JSX 节点。

**解释**：memo 只控制 props 浅比较，不能阻止自身 state、Context 或新引用 props 引起的更新。要优化，需要同时稳定 props 和缩小订阅范围。

## react-010

### Q1 single | 虚拟 DOM 定位

虚拟 DOM 更准确的理解是什么？

- [ ] A. 浏览器提供的一套轻量 DOM API。
- [x] B. React 用普通 JavaScript 对象描述 UI 结构，再通过 diff 和 commit 更新真实 DOM。
- [ ] C. 一种一定比手写 DOM 操作更快的技术。
- [ ] D. React 18 后已经完全不存在的概念。

**解释**：虚拟 DOM 是 UI 描述和更新协调的一部分，价值在于声明式编程、跨平台抽象和批量协调；它不是浏览器能力，也不保证任何场景都最快。

### Q2 single | 优缺点判断

下面哪句话最准确？

- [ ] A. 虚拟 DOM 的主要目的就是让所有 DOM 操作变成 O(1)。
- [x] B. 虚拟 DOM 降低了手动维护 DOM 状态的复杂度，但 diff 和对象创建也有运行时成本。
- [ ] C. 有了虚拟 DOM，就不需要关注 key、memo 或渲染次数。
- [ ] D. 虚拟 DOM 会直接跳过浏览器的 layout 和 paint。

**解释**：虚拟 DOM 让开发者用状态描述 UI，但最终仍要更新真实 DOM，并经历浏览器渲染流水线。性能好坏取决于更新范围、diff 质量和组件设计。

### Q3 multiple | 性能误区

关于虚拟 DOM 与性能，哪些说法是正确的？

- [x] A. 稳定 key 可以帮助 diff 更准确地复用节点。
- [x] B. 过大的组件重渲染范围会增加虚拟 DOM 创建和 diff 成本。
- [ ] C. 虚拟 DOM 可以自动避免所有不必要的业务组件 render。
- [x] D. 在极高频、细粒度更新场景，直接操作 canvas 或专门渲染方案可能更合适。
- [ ] E. 只要使用虚拟 DOM，就不需要做列表虚拟化。

**解释**：虚拟 DOM 不是性能银弹。React 应用仍需要合理拆分组件、稳定身份、控制渲染范围，并针对长列表或高频绘制选择合适方案。

## react-011

### Q1 single | JSX 编译

下面 JSX 在现代 React 项目里最接近会被编译成什么？

```tsx
const node = <h1 className="title">Hello, {name}</h1>
```

- [ ] A. 一个 HTML 字符串：`"<h1 class='title'>Hello...</h1>"`。
- [x] B. React element 创建调用，例如 `_jsx('h1', { className: 'title', children: [...] })`。
- [ ] C. 真实 DOM 节点，编译后会立即调用 `document.createElement`。
- [ ] D. 一个必须依赖浏览器原生 JSX 解析能力的语法。

**解释**：JSX 是 JavaScript 的语法扩展，构建工具会把它编译成 React element 创建调用。它不是 HTML 字符串，也不会直接变成真实 DOM。

### Q2 single | JSX 表达式规则

下面哪种 JSX 写法是合法且语义清晰的条件渲染？

- [ ] A. `{if (isLoading) <Spinner />}`
- [x] B. `{isLoading ? <Spinner /> : <Content />}`
- [ ] C. `{for (const item of items) <Item item={item} />}`
- [ ] D. `<div class="panel" for="name">`

**解释**：JSX 的 `{}` 中放 JavaScript 表达式，不放 `if`、`for` 这类语句。DOM 属性也要用 React 约定，例如 `className`、`htmlFor`。

### Q3 multiple | JSX 常见陷阱

关于 JSX，下列哪些说法是正确的？

- [x] A. 自定义组件名必须大写开头，否则会被当成原生标签。
- [x] B. `0 && <Badge />` 可能把 `0` 渲染出来，不能总当成“什么都不渲染”。
- [ ] C. React 17+ 新 JSX Transform 下，JSX 文件完全不需要构建工具。
- [x] D. 列表渲染时仍需要稳定 key，JSX 本身不会替你推断业务身份。
- [ ] E. JSX 的 `style` 可以直接写字符串，例如 `"color: red"`。

**解释**：JSX 让 UI 声明更接近模板，但它仍然遵循 JavaScript 表达式和 React 渲染规则。常见 bug 来自把 JSX 当 HTML 或模板语言使用。

## react-012

### Q1 single | Props 只读

下面子组件直接修改传入的 `user`，主要问题是什么？

```tsx
function UserCard({ user }: { user: User }) {
  user.name = user.name.trim()
  return <div>{user.name}</div>
}
```

- [ ] A. TypeScript 会禁止所有 props 对象访问。
- [x] B. 子组件修改了父组件传入的数据，破坏单向数据流和可预测性。
- [ ] C. React props 只能传基础类型，不能传对象。
- [ ] D. 这样会自动触发父组件重新渲染，所以性能较差。

**解释**：props 是父组件传给子组件的只读输入。子组件应根据 props 渲染或通过回调请求父组件更新，而不是直接修改 props 对象。

### Q2 single | 类型验证选择

一个 TypeScript React 项目里，为 Button 组件约束 `variant` 只能是 `'primary' | 'secondary' | 'danger'`，首选方式是什么？

- [x] A. 用 TypeScript props 类型声明联合字面量类型。
- [ ] B. 只在 README 里说明可选值，运行时不需要任何约束。
- [ ] C. 所有 props 都写成 `any`，通过组件内部判断。
- [ ] D. 必须使用 PropTypes，TypeScript 不能约束 props。

**解释**：TypeScript 能在编译期约束 props、事件、children 和泛型，是现代 React 项目的首选。PropTypes 更适合 JS 库或运行时边界补充。

### Q3 multiple | Props 设计

关于 props 设计，哪些做法更合理？

- [x] A. 对可选 props 使用参数默认值，例如 `{ size = 40 }`。
- [x] B. 回调、对象、数组作为 props 时，关注引用稳定性对 memo 子组件的影响。
- [ ] C. 子组件需要变化时，直接改 props 比回调通知父组件更简单。
- [x] D. 需要透传原生 button 属性时，可以继承 `React.ComponentProps<'button'>`。
- [ ] E. props 变化一定意味着真实 DOM 会被完整销毁重建。

**解释**：好的 props 设计要表达清楚输入、默认值、事件回调和透传边界。props 变化会触发渲染，但最终 DOM 如何更新由 reconciliation 决定。

## react-013

### Q1 single | Fiber 设计目标

Fiber 相比旧的同步递归协调器，最核心的设计目标是什么？

- [ ] A. 把 React 改造成多线程渲染框架。
- [x] B. 把组件树更新拆成可暂停、可恢复、可设置优先级的工作单元。
- [ ] C. 完全跳过 render 阶段，只在 commit 阶段更新 DOM。
- [ ] D. 用浏览器原生 DOM 树替代 React element。

**解释**：Fiber 把递归调用栈改造成显式数据结构，让 render 阶段可以分片、打断和重做，为并发渲染和优先级调度打基础。

### Q2 single | render 与 commit

关于 Fiber 的 render 阶段和 commit 阶段，哪句话最准确？

- [x] A. render 阶段计算 workInProgress 树并标记副作用，可被中断；commit 阶段同步提交变更，不可中断。
- [ ] B. render 阶段直接修改 DOM，commit 阶段只负责执行组件函数。
- [ ] C. 两个阶段都可以随时中断，因为并发模式不保证 UI 一致性。
- [ ] D. commit 阶段会重新执行所有组件函数来确认最终结果。

**解释**：React 可以在 render 阶段让出主线程，但一旦进入 commit，就必须尽快同步完成 DOM/ref/layout effect 等提交，保证用户看到的一致 UI。

### Q3 multiple | Fiber 结构和调度

关于 Fiber，下列哪些说法是正确的？

- [x] A. Fiber 节点常见指针包括 `return`、`child`、`sibling` 和 `alternate`。
- [x] B. current tree 和 workInProgress tree 构成双缓冲，提交后交换角色。
- [ ] C. Fiber 的本质就是 `requestIdleCallback`，没有自己的调度策略。
- [x] D. lanes 用于表达更新优先级和批次，不同更新可以进入不同 lane。
- [ ] E. 只要用了 Fiber，组件渲染成本就可以忽略不计。

**解释**：Fiber 是数据结构也是执行模型；它让 React 更会“安排工作”，但不会消除组件计算、diff 和 DOM 提交本身的成本。

## react-014

### Q1 single | Diff 基本规则

下面两次渲染从 `<Counter />` 变成 `<Profile />`，且两者在同一位置。React 通常会怎么处理？

- [ ] A. 复用原组件实例，只更新 props。
- [x] B. 因为组件 type 不同，卸载旧子树并创建新子树，原状态丢失。
- [ ] C. 只要 JSX 结构相似，就保留所有 state。
- [ ] D. 由浏览器决定是否复用 DOM。

**解释**：React diff 的核心启发式之一是 type 不同视为不同子树。组件 type 变了，旧组件状态不会被保留。

### Q2 single | 列表移动

旧列表是 `A B C D`，新列表是 `A C B E`，key 都稳定。React 在多节点 diff 中为什么能识别 `B` 和 `C` 的身份？

- [ ] A. 因为它会对两棵树做完整最优编辑距离计算。
- [x] B. 因为同级列表可以通过稳定 key 建立旧节点到新节点的身份映射。
- [ ] C. 因为数组里的对象引用一定不会变化。
- [ ] D. 因为 DOM 节点文本相同就一定是同一个组件。

**解释**：React 不做昂贵的通用树编辑距离，而是基于同层比较、type 和 key 做启发式 diff。稳定 key 是列表项身份的关键。

### Q3 multiple | Reconciliation 误区

关于 React Diff / Reconciliation，哪些说法是正确的？

- [x] A. key 变化会让 React 把它当成不同实例，可能导致重新挂载。
- [x] B. type 相同的 DOM 元素通常会复用节点并更新 props。
- [ ] C. React 保证生成最少 DOM 操作，所以业务层无需关心渲染范围。
- [x] D. 错误 key 会导致 state 错位或频繁卸载重建。
- [ ] E. 不同层级的节点只要 key 一样，React 也会跨层级移动复用。

**解释**：React 的 diff 是同层启发式比较，不承诺全局最优。理解 type/key/同级比较，才能解释状态保留、重置和列表错位。

## react-015

### Q1 single | 并发含义

React 18 的“并发”最准确的理解是什么？

- [ ] A. React 会把组件渲染自动放到多个 CPU 线程同时执行。
- [x] B. React 可以把 render 工作拆分、暂停、继续或丢弃，让高优先级交互先响应。
- [ ] C. commit 阶段也可以被任意中断，因此 DOM 可能长期处于半更新状态。
- [ ] D. 使用 React 18 后所有慢组件都会自动变快。

**解释**：并发强调调度和响应性，不是多线程。React 可以中断 render 阶段，但 commit 阶段仍需同步完成。

### Q2 single | startTransition

在搜索框中输入时，希望输入值立即更新，而大列表过滤结果可以低优先级更新。更合适的写法是什么？

- [x] A. 立即 `setQuery(next)`，把更新列表查询条件的 state 放进 `startTransition`。
- [ ] B. 把输入框的 `setQuery` 也放进 `startTransition`，让输入本身滞后。
- [ ] C. 把昂贵同步搜索函数直接写进 `startTransition`，它就不会占用主线程。
- [ ] D. 使用 `flushSync` 包住所有更新，确保列表最快完成。

**解释**：`startTransition` 标记低优先级 UI 更新，适合让输入等高优先级交互先响应。它不会让同步计算离开主线程，必要时仍要配合 memo、虚拟列表或 Worker。

### Q3 multiple | React 18 能力边界

关于 React 18 并发相关能力，哪些说法是正确的？

- [x] A. 自动批处理覆盖更多异步场景，例如 Promise、setTimeout 和原生事件。
- [x] B. `useDeferredValue` 可以让昂贵子树使用滞后的值渲染，提升输入响应感。
- [ ] C. `flushSync` 应该默认包住所有更新，以便关闭并发带来的不确定性。
- [x] D. Suspense 与流式 SSR、选择性 hydration 等能力可以配合提升首屏体验。
- [ ] E. 并发能力可以替代所有性能优化，不再需要关注列表规模和组件拆分。

**解释**：React 18 提供更强的调度能力，但不会自动消除渲染量和计算量。性能优化仍然要结合数据结构、组件边界和实际指标。

## react-016

### Q1 single | useReducer 适用场景

下面哪种状态更适合考虑 `useReducer`？

- [ ] A. 一个独立的布尔值，例如弹窗是否打开。
- [x] B. 购物车里多个字段联动，包含 add/remove/clear 等明确事件。
- [ ] C. 一个输入框当前 value。
- [ ] D. 一个只在组件挂载时读取的 DOM ref。

**解释**：`useReducer` 适合复杂状态转移、多字段联动和多种更新来源。简单独立状态用 `useState` 更直接。

### Q2 single | reducer 纯净性

下面 reducer 写法最大的问题是什么？

```tsx
function reducer(state, action) {
  if (action.type === 'load') {
    fetch('/api/cart')
    return state
  }
  return state
}
```

- [ ] A. reducer 不能使用 `if`。
- [x] B. reducer 中执行了请求副作用，破坏纯函数约束。
- [ ] C. reducer 必须返回数组。
- [ ] D. `action.type` 只能是数字。

**解释**：reducer 应该是纯函数：根据当前 state 和 action 计算下一个 state。请求、随机数、外部变量修改等副作用应放在事件处理、effect 或异步流程里。

### Q3 multiple | useReducer 实践

关于 `useReducer`，哪些说法是正确的？

- [x] A. `dispatch` 引用稳定，适合传给子组件或放入 Context。
- [x] B. reducer 中仍需要不可变更新，不能直接 `push` 原数组后返回原对象。
- [ ] C. 能从 state 推导出的 `total` 最好也存进 state，避免每次计算。
- [x] D. 初始状态计算昂贵时，可以使用第三个参数 lazy initializer。
- [ ] E. `useReducer` 会自动把本地状态同步到 Redux DevTools。

**解释**：`useReducer` 的价值是集中状态转移逻辑和提升可测试性。派生值通常按需计算，避免维护多份可能不同步的状态。

## react-017

### Q1 single | React.lazy 限制

下面动态导入组件时，为什么常见写法要求模块有 default export？

```tsx
const Dashboard = lazy(() => import('./Dashboard'))
```

- [x] A. `React.lazy` 期望 Promise 解析为 `{ default: Component }`。
- [ ] B. 动态 `import()` 不能导入命名导出。
- [ ] C. Suspense 只能渲染 default export。
- [ ] D. Vite/Webpack 只能对 default export 做代码分割。

**解释**：`React.lazy` 的约定是读取模块的 `default`。如果组件是命名导出，可以在 then 里转换为 `{ default: mod.Settings }`。

### Q2 single | Suspense 与错误

懒加载 chunk 因网络或发布缓存问题加载失败时，应该靠什么兜底？

- [ ] A. Suspense fallback 会自动捕获错误并重试。
- [x] B. 在 Suspense 外层或合适位置放 ErrorBoundary，提供重试/刷新等降级 UI。
- [ ] C. 删除所有代码分割，生产环境不能懒加载。
- [ ] D. 使用 `useMemo` 包住 lazy 组件。

**解释**：Suspense 处理“等待中”的 UI，不负责捕获加载错误。chunk 加载失败要靠 ErrorBoundary 和清晰的恢复入口。

### Q3 multiple | 分割策略

关于代码分割和懒加载，哪些判断是合理的？

- [x] A. 路由级页面通常是自然的代码分割点。
- [x] B. 导出 PDF、图表、地图、编辑器等重型低频库适合按需加载。
- [ ] C. 首屏必要代码拆得越碎越好，请求越多性能越好。
- [x] D. 可以在链接 hover/focus 时预加载用户很可能访问的下一页。
- [ ] E. 只看源码体积就够了，gzip 后体积和执行时间不用关注。

**解释**：代码分割的目标是减少首屏下载和执行成本，但过度拆分会制造请求瀑布。需要结合访问路径、体积、执行时间和预加载策略。

## react-018

### Q1 single | Error Boundary 捕获范围

下面哪类错误通常可以被 Error Boundary 捕获？

- [x] A. 子组件 render 过程中抛出的错误。
- [ ] B. 按钮 `onClick` 事件处理器里异步抛出的错误。
- [ ] C. `setTimeout` 回调里抛出的错误。
- [ ] D. 服务端渲染期间抛出的错误。

**解释**：错误边界捕获子组件渲染、生命周期和 constructor 中的错误。事件处理器、Promise、定时器和 SSR 错误需要其他错误处理与上报机制。

### Q2 single | 类组件实现

一个基础 Error Boundary 至少需要哪些类组件能力？

- [ ] A. `shouldComponentUpdate` 和 `forceUpdate`。
- [x] B. `static getDerivedStateFromError` 更新降级状态，并用 `componentDidCatch` 上报错误。
- [ ] C. `componentWillMount` 捕获渲染错误。
- [ ] D. `useEffect` 和 `useState`。

**解释**：当前 Error Boundary 通常仍用类组件实现。`getDerivedStateFromError` 用于渲染 fallback，`componentDidCatch` 可拿到 error 和 componentStack 做上报。

### Q3 multiple | 工程落地

关于 Error Boundary 的使用，哪些做法合理？

- [x] A. 路由级放大边界，防止整站白屏。
- [x] B. 复杂模块或懒加载 chunk 外放局部边界，缩小影响范围。
- [ ] C. 用 Error Boundary 处理所有接口 404、权限失败和表单校验。
- [x] D. fallback 提供重试、刷新或返回上一页等恢复入口。
- [ ] E. 上报错误时可以直接附带完整表单内容和 token，方便排查。

**解释**：错误边界是 UI 崩溃降级机制，不是业务错误状态管理。上报要有 route、release、componentStack 等上下文，但不能泄露敏感数据。

## react-019

### Q1 single | Portal 本质

React Portal 改变了什么，没有改变什么？

- [x] A. 改变 DOM 挂载位置，但不改变 React 组件树中的父子关系。
- [ ] B. 改变 React 组件树关系，Portal 子节点不再属于原父组件。
- [ ] C. 让组件脱离 React 渲染系统，由浏览器直接管理。
- [ ] D. 只能用于服务端渲染，客户端不需要。

**解释**：Portal 会把 DOM 渲染到指定容器，例如 `document.body`，但 React 事件和上下文仍按原组件树工作。

### Q2 single | Portal 事件冒泡

父组件有 `onClick`，Modal 通过 Portal 挂到 `document.body`。点击 Modal 内按钮仍触发父组件 `onClick`，最可能的原因是什么？

- [ ] A. 浏览器 DOM 冒泡忽略了 Portal 的 DOM 位置。
- [x] B. React 事件会沿 React 组件树冒泡，而 Portal 仍在原 React 父子关系中。
- [ ] C. Portal 会自动把所有事件转发给 `window`。
- [ ] D. 因为按钮没有设置 `type="button"`。

**解释**：Portal 改变 DOM 位置，不改变 React 事件传播路径。需要在合适层级 `stopPropagation` 或重新设计事件边界。

### Q3 multiple | Modal 工程细节

用 Portal 实现 Modal 时，哪些细节通常需要考虑？

- [x] A. 焦点陷阱、Esc 关闭和关闭后返回触发元素焦点。
- [x] B. `role="dialog"`、`aria-modal`、标题关联等可访问性属性。
- [ ] C. 只要挂到 `body`，就天然满足所有可访问性要求。
- [x] D. 滚动锁定、z-index 层级管理和 SSR 中 `document` 不存在的问题。
- [ ] E. Modal 内点击一定不会影响外层 React 组件。

**解释**：Portal 只是浮层基础设施。一个可用的 Modal 还要处理焦点、键盘、滚动、层级、SSR 和事件边界。

## react-020

### Q1 single | 自定义 Hook 抽象边界

什么时候最适合把逻辑抽成自定义 Hook？

- [ ] A. 任何超过 5 行的组件代码都必须抽成 Hook。
- [x] B. 有可复用的状态逻辑或复杂生命周期，抽出后能提升语义、测试性或复用性。
- [ ] C. 为了绕过 Hooks 调用顺序限制，把条件里的 Hook 包一层。
- [ ] D. 为了让服务端缓存、分页、重试全部手写在一个 `useFetch` 里。

**解释**：自定义 Hook 的价值是封装可复用状态逻辑和生命周期，而不是为了抽象而抽象。它仍必须遵守 Hooks 顶层调用规则。

### Q2 single | useDebouncedValue 清理

下面 `useDebouncedValue` 为什么要在 effect cleanup 中清除定时器？

```tsx
useEffect(() => {
  const timer = window.setTimeout(() => setDebounced(value), delay)
  return () => window.clearTimeout(timer)
}, [value, delay])
```

- [x] A. 避免旧 value 的定时器在新 value 到来后仍然触发，造成过期更新。
- [ ] B. 因为 React 不允许在 effect 里调用 `setTimeout`。
- [ ] C. 因为 cleanup 会让 effect 只执行一次。
- [ ] D. 为了让 `delay` 不需要写进依赖数组。

**解释**：debounce 的关键是取消上一轮未到期任务，只保留最新值对应的定时器。`value` 和 `delay` 都是 effect 使用的响应式值，应放入依赖数组。

### Q3 multiple | 自定义 Hook 设计实践

关于自定义 Hook，哪些做法合理？

- [x] A. 名字以 `use` 开头，并表达业务意图，例如 `useOnlineStatus`。
- [x] B. SSR 场景避免初始渲染直接访问 `window`、`document` 或 `localStorage`。
- [ ] C. 自定义 Hook 可以在普通函数、循环或条件分支中随意调用。
- [x] D. 对浏览器外部状态，必要时用 `useSyncExternalStore` 保证快照一致性。
- [ ] E. 返回值越多越好，最好把所有内部 state 和 setter 都暴露出去。

**解释**：好的 Hook 应隐藏复杂生命周期，暴露稳定、清晰、最小必要的接口。它不是逃离 React 规则的后门，也不该泄露过多内部实现。

## react-021

### Q1 single | 状态类型判断

一个页面需要缓存用户列表、分页结果、重试失败请求，并在多个页面间复用。优先应该考虑什么？

- [ ] A. 用一个全局 Context 保存所有接口响应，组件直接读写。
- [ ] B. 用 Redux 保存所有服务端数据，因为 Redux 一定比请求库快。
- [x] C. 优先考虑 TanStack Query、SWR 或 RTK Query 这类服务端状态方案。
- [ ] D. 把每个接口响应都放进 `useState`，需要时逐层传 props。

**解释**：服务端状态包含缓存、失效、重试、分页、加载和错误状态，和客户端 UI 状态不是一类问题。优先用专门的数据请求/缓存库，避免手写一套不完整缓存系统。

### Q2 single | Context 边界

下面哪个场景最适合 Context？

- [x] A. 主题、语言、当前用户摘要或权限能力等低频跨层数据。
- [ ] B. 每次鼠标移动都更新的坐标。
- [ ] C. 大型表格中每一行的实时编辑状态。
- [ ] D. 需要 action 日志、时间旅行和中间件治理的大型状态流。

**解释**：Context 更像依赖注入和跨层传值工具。它适合低频、范围明确的数据；频繁变化的大状态会让消费者大面积重渲染。

### Q3 multiple | Redux/Zustand 选型

关于 Redux Toolkit、Zustand 和 Context 的选择，哪些说法合理？

- [x] A. Redux Toolkit 适合复杂状态流、大团队协作、DevTools、日志和中间件需求。
- [x] B. Zustand 适合中小型客户端状态，但团队要约定 store 拆分、action 命名和持久化规则。
- [ ] C. Context 的 value 变化不会影响消费者重渲染，所以可以承载任何高频状态。
- [x] D. Redux selector 返回新对象时仍可能导致重渲染，需要 memoized selector 或浅比较。
- [ ] E. 状态管理选型只看项目大小，不需要看状态变化频率和治理需求。

**解释**：选型关键是状态类型、变化频率、调试治理、团队协作和服务端状态占比。Redux、Zustand、Context 都不是银弹。

## react-022

### Q1 single | 性能优化顺序

一个 React 页面交互卡顿，最合理的第一步是什么？

- [ ] A. 给所有组件加 `React.memo`。
- [ ] B. 把所有函数都用 `useCallback` 包起来。
- [x] C. 用 React DevTools Profiler、Performance 面板或真实用户指标定位瓶颈。
- [ ] D. 直接把状态迁移到 Redux。

**解释**：性能优化应先测量，再行动。卡顿可能来自重复渲染、单次渲染过慢、长列表、JS 包过大、图片或网络阻塞，不同瓶颈对应完全不同的方案。

### Q2 single | 长列表优化

一个列表有 2 万行，每行包含图片和多个交互控件。最直接有效的 React 层优化通常是什么？

- [ ] A. 给每个行组件都加 `useMemo`。
- [x] B. 使用虚拟列表，只渲染视口附近的行，并保持 key 稳定。
- [ ] C. 把列表数据放进 Context。
- [ ] D. 使用 `flushSync` 让每次滚动立即提交。

**解释**：长列表的核心问题是 DOM 数量和渲染范围过大。虚拟列表从源头减少渲染节点，比盲目 memo 更有效。

### Q3 multiple | React 性能手段

关于 React 性能优化，哪些说法是正确的？

- [x] A. 状态应尽量放在真正需要它的最近公共父组件，避免顶层状态牵动整页。
- [x] B. Context 应按领域拆分，避免一个 value 变化触发大量消费者。
- [ ] C. `startTransition` 会把昂贵同步计算自动移到后台线程。
- [x] D. 代码分割适合低频重型模块，如图表、编辑器、地图和导出功能。
- [ ] E. Suspense 骨架屏能解决所有真实长任务问题。

**解释**：React 性能优化通常是减少渲染范围、降低单次渲染成本、拆分资源和改善调度。感知优化不能替代真实瓶颈治理。

## react-023

### Q1 single | Render Props 本质

Render Props 模式的核心是什么？

- [ ] A. 父组件把 JSX 字符串传给子组件，由子组件解析。
- [x] B. 组件负责状态或逻辑，把“如何渲染”作为函数交给调用方控制。
- [ ] C. 用 class 组件替代函数组件。
- [ ] D. 通过 Context 自动注入所有 props。

**解释**：Render Props 是逻辑组件调用一个渲染函数来返回 UI，常见形式是 `children` 函数或显式 `render` prop。它强调 headless 复用和渲染控制权。

### Q2 single | Hooks 替代边界

什么时候自定义 Hook 比 Render Props 更直接？

- [x] A. 只是复用状态逻辑，例如鼠标位置、在线状态或 debounce 值。
- [ ] B. 调用方必须提供多个复杂插槽，组件还要掌控上下文结构。
- [ ] C. 需要兼容只能接受组件 children 函数的老 API。
- [ ] D. 希望逻辑组件完全控制渲染树层级。

**解释**：Hooks 更适合复用状态逻辑，不增加组件层级。Render Props 在 headless 组件、复杂插槽和兼容旧模式时仍有价值。

### Q3 multiple | Render Props 取舍

关于 Render Props，哪些说法合理？

- [x] A. 调用方可以完全控制 UI 结构，逻辑组件只提供状态和行为。
- [x] B. 嵌套过多可能形成 wrapper hell，降低可读性。
- [ ] C. Render Props 不会创建函数，因此天然比 Hooks 性能更好。
- [x] D. 每次 render 传入的新函数可能影响 memo 优化，需要结合场景判断。
- [ ] E. Render Props 只能通过名为 `render` 的 prop 实现，不能用 `children`。

**解释**：Render Props 的优势是灵活，代价是层级、函数引用和类型复杂度。现代 React 里要和 Hooks 按场景取舍。

## react-024

### Q1 single | HOC 本质

高阶组件 HOC 的定义更准确的是哪一个？

- [ ] A. 接收 props 并返回普通对象的函数。
- [x] B. 接收一个组件并返回增强组件的函数。
- [ ] C. 只能用于类组件，不能包装函数组件。
- [ ] D. React 内置的组件继承机制。

**解释**：HOC 的形态是 `Component -> EnhancedComponent`，用于包装渲染、注入 props、权限守卫、埋点或兼容旧生态。

### Q2 single | render 中创建 HOC

为什么不应该在组件 render 过程中动态创建 HOC？

- [x] A. 每次 render 都会得到新的组件类型，可能导致子树卸载重建和状态丢失。
- [ ] B. React 不允许函数返回组件。
- [ ] C. HOC 只能在服务端创建。
- [ ] D. TypeScript 会禁止所有 HOC。

**解释**：React 根据组件 type 判断是否复用。render 中创建新 HOC 会让 type 每次不同，破坏复用，导致 state、DOM 和 effect 生命周期异常。

### Q3 multiple | HOC 注意事项

实现 HOC 时，哪些点需要注意？

- [x] A. 透传无关 props，避免吞掉调用方传入的属性。
- [x] B. 设置有意义的 `displayName`，便于调试组件树。
- [x] C. ref 不会自动穿过 HOC，需要 `forwardRef` 或 React 19 的 ref 策略配合。
- [ ] D. HOC 会自动复制被包装组件的所有静态属性。
- [ ] E. 多个 HOC 嵌套不会增加类型和调试复杂度。

**解释**：HOC 是强大的包装模式，但容易引入 props、ref、静态属性和调试复杂度问题。现代项目中，纯状态逻辑复用通常优先 Hook。

## react-025

### Q1 single | 执行时机

`useLayoutEffect` 和 `useEffect` 的执行时机差异是什么？

- [x] A. `useLayoutEffect` 在 DOM commit 后、浏览器绘制前同步执行；`useEffect` 通常在绘制后执行。
- [ ] B. `useEffect` 在 render 阶段执行，`useLayoutEffect` 在 commit 前执行。
- [ ] C. 两者完全相同，只是命名不同。
- [ ] D. `useLayoutEffect` 只在服务端执行。

**解释**：`useLayoutEffect` 会阻塞绘制，适合用户看到前必须完成的布局测量和修正；`useEffect` 适合绝大多数非布局副作用。

### Q2 single | 使用场景

下面哪个场景最适合 `useLayoutEffect`？

- [ ] A. 发起普通数据请求。
- [ ] B. 注册一个不影响首帧布局的日志上报。
- [x] C. 测量 tooltip 的高度，并在用户看到前修正其位置避免闪烁。
- [ ] D. 每秒执行一次定时器。

**解释**：需要同步读取布局并在绘制前修正 UI 时，`useLayoutEffect` 才有必要。滥用会阻塞绘制，让页面更卡。

### Q3 multiple | SSR 与性能

关于 `useLayoutEffect`，哪些说法是正确的？

- [x] A. 默认优先使用 `useEffect`，只有明确需要同步布局时才用 `useLayoutEffect`。
- [x] B. 服务端没有布局信息，通用组件库常用同构 effect 封装避免警告。
- [ ] C. `useLayoutEffect` 能让所有副作用更快，因此应替换 `useEffect`。
- [x] D. 如果其中调用 `setState`，React 会在绘制前立即再次渲染。
- [ ] E. `useLayoutEffect` 适合把所有接口请求提前到绘制前。

**解释**：`useLayoutEffect` 是布局逃生口，不是更高级的 effect。它的同步特性有价值也有成本。

## react-026

### Q1 single | forwardRef 用途

在 React 18 及以前，`forwardRef` 主要解决什么问题？

- [x] A. 让父组件传入的 ref 能够到达子组件内部 DOM 节点或自定义实例。
- [ ] B. 让子组件直接修改父组件 state。
- [ ] C. 让所有 props 自动变成 ref。
- [ ] D. 让函数组件拥有 class 实例。

**解释**：普通 props 不包含特殊的 ref 传递语义。`forwardRef` 用来显式接收父组件 ref，并把它转发到内部 DOM 或 imperative handle。

### Q2 single | useImperativeHandle

为什么有时会用 `useImperativeHandle` 而不是直接把内部 input DOM 暴露给父组件？

- [ ] A. 因为 ref 不能指向 DOM。
- [x] B. 可以只暴露稳定、受控的小 API，例如 `focus()` 和 `clear()`，避免父组件依赖内部 DOM 结构。
- [ ] C. 它会自动把子组件变成受控组件。
- [ ] D. 它能让父组件读取子组件所有 state。

**解释**：imperative API 应该小而稳定。直接暴露 DOM 会让父组件更容易耦合子组件内部实现。

### Q3 multiple | ref 设计

关于 `forwardRef` 和 ref，哪些说法合理？

- [x] A. ref 是逃生口，优先通过 props 表达数据和行为。
- [x] B. HOC 包装组件时 ref 不会自动透传，需要显式处理。
- [ ] C. React 19 支持 ref 作为 prop 后，团队可以无视旧组件库兼容性随意混用写法。
- [x] D. 组件库需要根据 React 版本和类型支持决定 ref API。
- [ ] E. 父组件拿到 ref 后，最好直接操作子组件内部所有 DOM 节点。

**解释**：ref API 影响组件封装边界。React 19 简化了 ref 传递，但实际项目仍要考虑版本、类型和库生态兼容。

## react-027

### Q1 single | Suspense 数据获取

为什么普通 `useEffect + fetch` 不会自动触发 Suspense fallback？

- [ ] A. Suspense 只能用于图片加载。
- [x] B. Suspense 需要组件或数据层在未就绪时抛出 Promise，普通 effect 是提交后才执行的副作用。
- [ ] C. fetch API 不支持 Promise。
- [ ] D. React 18 已经移除了 Suspense。

**解释**：Suspense 的等待发生在渲染路径中；普通 effect 不会阻塞当前 render，也不会自动把 pending 状态交给 Suspense。

### Q2 single | Suspense 与错误边界

使用 `React.lazy` 懒加载组件时，下列哪种边界组合更合理？

- [x] A. `ErrorBoundary` 包住 `Suspense`，Suspense 负责 pending，ErrorBoundary 负责加载失败等错误。
- [ ] B. 只用 Suspense，因为 fallback 会捕获所有错误。
- [ ] C. 只用 ErrorBoundary，因为错误边界会显示 loading。
- [ ] D. 两者都不需要，lazy 会同步加载完成。

**解释**：Suspense 处理等待态，不处理错误态。懒加载 chunk 失败、数据请求失败等错误需要 ErrorBoundary 或数据层错误边界兜底。

### Q3 multiple | Suspense 边界设计

关于 Suspense 边界设计，哪些说法正确？

- [x] A. 边界越粗，加载态越统一，但阻塞范围可能更大。
- [x] B. 边界越细，页面可渐进显示，但可能出现多个 skeleton 闪烁。
- [ ] C. Suspense 可以替代所有 loading 和 error 状态设计。
- [x] D. 流式 SSR 可以先发送 shell，再在资源就绪后继续补齐内容。
- [ ] E. 可以在任意客户端组件里直接 `await fetch()`，React 都会自动处理。

**解释**：Suspense 是异步 UI 协调机制，需要框架或数据层配合。边界切分应按用户感知区域和错误恢复策略设计。

## react-028

### Q1 single | 自动批处理

React 18 使用 `createRoot` 后，下面代码通常会产生几次重新渲染？

```tsx
setTimeout(() => {
  setCount((count) => count + 1)
  setFlag((flag) => !flag)
}, 0)
```

- [ ] A. 一定两次，因为 `setTimeout` 不参与批处理。
- [x] B. 通常一次，因为 React 18 会在更多异步场景自动批处理。
- [ ] C. 零次，因为异步回调里的 state 更新会被忽略。
- [ ] D. 次数随机，取决于浏览器刷新率。

**解释**：React 18 自动批处理扩展到 Promise、setTimeout、原生事件等更多场景，减少重复 render 和 commit。

### Q2 single | flushSync 使用

下面哪种情况比较适合谨慎使用 `flushSync`？

- [x] A. 新增一条消息后必须立即读取 DOM 高度并滚动到底部。
- [ ] B. 每次点击按钮都想立刻看到最新 state 变量。
- [ ] C. 为了让所有 React 更新都绕过批处理。
- [ ] D. 为了让异步请求更快返回。

**解释**：`flushSync` 会强制立即提交 DOM，可能打断调度并影响性能。它只适合必须和 imperative DOM API 同步集成的少数场景。

### Q3 multiple | 批处理语义

关于批处理，哪些说法正确？

- [x] A. 批处理减少渲染次数，但不改变函数式 updater 的必要性。
- [x] B. 多次依赖旧值的更新应写成 `setCount(count => count + 1)`。
- [ ] C. 批处理会把不同用户的两次独立点击错误合并成一次。
- [x] D. class 组件老代码中依赖 `this.state` 立即更新的写法可能暴露问题。
- [ ] E. 批处理能消除 render 中昂贵计算的执行成本。

**解释**：批处理是合并提交，不是改变状态计算语义。它减少重复工作，但不会消除慢计算或错误的旧值读取。

## react-029

### Q1 single | SSR 与 CSR 流程

哪句话最准确地区分 SSR 和 CSR？

- [ ] A. CSR 不需要 JavaScript，SSR 必须等 JavaScript 执行完才能看到内容。
- [x] B. SSR 先在服务端生成 HTML，客户端再 hydration 接管交互；CSR 主要在浏览器执行 React 后生成内容。
- [ ] C. SSR 只适合后台管理系统，CSR 只适合 SEO 页面。
- [ ] D. SSR 不需要处理数据请求。

**解释**：SSR 的优势是首屏内容和 SEO，代价是服务端成本、缓存、鉴权和 hydration 复杂度。CSR 则更简单但首屏依赖 JS 下载执行。

### Q2 single | Hydration mismatch

下面哪段 render 逻辑最容易导致 hydration mismatch？

- [ ] A. 根据 props 渲染服务端传入的标题。
- [x] B. 在 render 中直接使用 `Date.now()` 生成显示内容。
- [ ] C. 使用稳定的 `useId` 给 label 和 input 建立关联。
- [ ] D. 服务端和客户端都用同一份数据渲染列表。

**解释**：服务端 HTML 和客户端首次 render 结果必须一致。`Date.now()`、`Math.random()`、浏览器环境状态和非确定性排序都可能导致 mismatch。

### Q3 multiple | SSR 选型

关于 SSR/CSR 的选择，哪些说法合理？

- [x] A. 公开内容、营销页、详情页更常受益于 SSR/SSG/ISR。
- [x] B. 后台强交互区域可以更多采用 CSR 或混合方案。
- [ ] C. SSR 会自动解决所有性能问题，TTFB 和服务端压力不用关注。
- [x] D. render 中直接访问 `window`、`localStorage` 可能造成服务端错误或首屏不一致。
- [ ] E. Hydration 只绑定事件，不需要客户端生成同样的组件树。

**解释**：实际项目常混合使用渲染模式。SSR 提升可见内容和 SEO，但要严肃处理一致性、缓存、鉴权和服务端成本。

## react-030

### Q1 single | Effect 职责

下面哪种逻辑最不应该用 `useEffect + state` 实现？

- [x] A. 从已有 props/state 直接推导一个显示字符串。
- [ ] B. 订阅 WebSocket 并在卸载时断开。
- [ ] C. 根据 `userId` 发起请求并取消旧请求。
- [ ] D. 注册窗口 resize 监听并清理。

**解释**：`useEffect` 的核心是同步外部系统。能在 render 中由现有数据直接计算出的值，不应再存一份 state 并用 effect 同步，否则容易出现额外 render 和不同步。

### Q2 single | 无限循环

下面 effect 为什么可能每次 render 都重新执行？

```tsx
const options = { type: optionType }
useEffect(() => {
  fetchData(options)
}, [options])
```

- [ ] A. `useEffect` 不能依赖对象。
- [x] B. `options` 每次 render 都是新对象引用，依赖比较会认为它变化了。
- [ ] C. `fetchData` 返回 Promise，所以 React 会强制重跑。
- [ ] D. `optionType` 是字符串，字符串不能作为依赖。

**解释**：依赖比较关注引用稳定性。更好的写法通常是把对象创建放进 effect，依赖基本值 `[optionType]`，而不是盲目用 `useMemo` 掩盖设计问题。

### Q3 multiple | useEffect 最佳实践

关于 `useEffect`，哪些说法正确？

- [x] A. 开启并遵守 `eslint-plugin-react-hooks` 的 exhaustive-deps 规则。
- [x] B. 每个 effect 尽量只同步一种外部资源，cleanup 撤销 setup 做过的事。
- [ ] C. 漏依赖时直接禁用 lint，比重构依赖更可靠。
- [x] D. 异步请求需要考虑竞态和取消，例如 `AbortController` 或请求 id 校验。
- [ ] E. 用户点击触发的动作都应先写入 state，再统一由 effect 执行。

**解释**：effect 不是业务流程调度器。事件导致的动作应放事件处理器；外部系统同步、订阅和请求才适合 effect，并且要处理依赖、清理和竞态。

## react-031

### Q1 single | RSC 与 SSR 区别

关于 React Server Components 和传统 SSR，哪句话最准确？

- [ ] A. RSC 和 SSR 都只是把组件渲染成 HTML 字符串，没有本质区别。
- [x] B. SSR 主要生成 HTML，RSC 生成可序列化的组件树描述，框架中常和 SSR/Streaming 组合使用。
- [ ] C. RSC 会把所有组件都变成客户端组件，从而减少服务器压力。
- [ ] D. RSC 只是一种新的数据请求 Hook，和组件模型无关。

**解释**：RSC 是服务端执行的组件模型，输出 RSC payload 而不是直接等同于 HTML。Next.js 等框架通常把 RSC、SSR、Streaming 和 Client Components 组合起来使用。

### Q2 single | Server/Client 边界

下面哪个组件必须标记为 Client Component？

- [ ] A. 只读取数据库并渲染文章标题的页面组件。
- [ ] B. 只引入服务器端 Markdown 解析库并返回 JSX 的组件。
- [x] C. 使用 `useState` 并绑定 `onClick` 的点赞按钮。
- [ ] D. 只把可序列化的 `posts` 数组传给子组件的列表组件。

**解释**：Server Component 不能使用状态 Hook、Effect、事件处理器和浏览器 API。需要交互的部分必须用 `'use client'` 切到客户端边界。

### Q3 multiple | RSC 安全与序列化

关于 RSC 和 Server Actions/Server Functions，哪些说法正确？

- [x] A. Server Component 可以直接访问数据库、文件系统和私有环境变量，但不能把敏感数据序列化传给客户端。
- [x] B. 传给 Client Component 的 props 必须可序列化，不能直接传数据库连接、函数或类实例。
- [ ] C. `'use server'` 表示当前文件里的组件都是 Server Component。
- [x] D. Server Action 从客户端调用时本质仍是网络请求，需要鉴权、参数校验和审计。
- [ ] E. 因为服务端函数写在同一个仓库里，所以可以完全信任来自客户端的参数。

**解释**：RSC 能把敏感逻辑留在服务器，但序列化边界非常关键。Server Action 不是“可信本地函数调用”，而是需要完整安全治理的服务端入口。

## react-032

### Q1 single | Scheduler 解决的问题

React Scheduler 主要解决什么问题？

- [ ] A. 把 JavaScript 渲染工作自动分配到多个线程。
- [x] B. 在单线程主线程上按优先级协调可中断的 render 工作，减少输入和动画被长任务阻塞。
- [ ] C. 让 commit 阶段也可以随时暂停，从而提升响应速度。
- [ ] D. 让业务代码可以直接调用 `shouldYield()` 控制浏览器调度。

**解释**：Scheduler 不是多线程方案，也不是业务 API。它配合 Fiber 让 render 阶段可中断、可恢复或可丢弃，高优先级交互可以先处理。

### Q2 single | lane 优先级

在 React 18+ 中，transition 更新和输入框受控值更新进入不同 lane。为什么这很重要？

- [x] A. React 可以优先处理输入等高优先级 lane，低优先级 transition 可被打断后继续。
- [ ] B. lane 会让低优先级更新永远不执行。
- [ ] C. lane 会把所有更新都合并成同步 DOM 操作。
- [ ] D. lane 只用于调试 DevTools，不影响调度。

**解释**：lane 是优先级和批次的表示。React 可以选择先处理高优先级 lane，低优先级任务等待、继续或重做。

### Q3 multiple | 调度边界

关于 React 调度机制，哪些说法正确？

- [x] A. 被中断的是 render 阶段，commit 阶段必须同步完成以保证 DOM 一致。
- [x] B. Fiber 的 `child/sibling/return` 等指针让 React 能保存和恢复遍历进度。
- [ ] C. Scheduler 的存在意味着大列表和大计算不再需要虚拟化或 Worker。
- [x] D. React 会通过过期等机制避免低优先级任务长期饥饿。
- [ ] E. Scheduler 本质就是业务层可以依赖的 `requestIdleCallback` 封装。

**解释**：调度提升的是响应性，而不是消除工作量。大树、大列表和 CPU 重计算仍要通过拆分、memo、虚拟化或 Worker 处理。

## react-033

### Q1 single | startTransition 使用

搜索框中输入时，哪种写法最符合 `startTransition` 的设计？

- [x] A. 输入框 value 的 state 立即更新，把驱动昂贵结果列表的 state 放进 `startTransition`。
- [ ] B. 把输入框 value 的 state 也放进 `startTransition`，让输入显示滞后。
- [ ] C. 把真正昂贵的同步搜索函数包进 `startTransition`，它就不会占主线程。
- [ ] D. 用 `setTimeout` 替代 `startTransition`，两者能提供相同的优先级语义。

**解释**：受控输入必须同步响应。Transition 适合标记非紧急 UI 更新，让输入优先；它不能把 CPU 计算移出主线程。

### Q2 single | await 之后的更新

下面写法中，`await` 之后的 `setData` 如果仍希望作为 transition，当前应如何处理？

```tsx
startTransition(async () => {
  const data = await fetchData()
  setData(data)
})
```

- [ ] A. 不需要处理，`await` 之后的所有更新都会自动继承 transition。
- [x] B. 在 `await` 之后再次用 `startTransition(() => setData(data))` 包住更新。
- [ ] C. 改成 `flushSync(() => setData(data))`。
- [ ] D. 把 `fetchData` 放到 render 里。

**解释**：当前 React 对 `await` 后更新的 transition 语义需要再次标记。否则后续更新可能不会按预期归入 transition。

### Q3 multiple | Transition 边界

关于 `startTransition`，哪些说法正确？

- [x] A. transition 更新可以被更高优先级输入打断并重启。
- [x] B. `useTransition` 的 `isPending` 可用于展示旧内容仍在、后台更新进行中的状态。
- [ ] C. `startTransition` 会延迟执行回调，类似 `setTimeout(fn, 0)`。
- [x] D. 与 Suspense 配合时，transition 可减少已显示内容被 fallback 替换的突兀感。
- [ ] E. transition 能替代 memo、虚拟列表和 Web Worker。

**解释**：Transition 是调度语义，不是延迟器或后台线程。它改善交互响应，但真正的计算量和渲染量仍需单独治理。

## react-034

### Q1 single | 固定高度虚拟列表

固定高度虚拟列表中，`scrollTop = 960`、`rowHeight = 48`，不考虑 overscan 时起始索引通常是多少？

- [ ] A. `0`
- [ ] B. `10`
- [x] C. `20`
- [ ] D. `48`

**解释**：固定高度场景可以用 `Math.floor(scrollTop / rowHeight)` 估算可视区起始行。`960 / 48 = 20`。

### Q2 single | key 选择

虚拟列表只渲染窗口内的少量行，为什么仍不应该用“窗口内 index”作为 key？

- [x] A. 滚动时同一个窗口位置会对应不同数据项，状态可能被错误复用到另一行。
- [ ] B. 虚拟列表不需要 key。
- [ ] C. React 不允许虚拟列表使用 key。
- [ ] D. index key 会让滚动条高度变成 0。

**解释**：虚拟列表更需要稳定业务 id。窗口内 index 会随着滚动复用位置，导致输入值、焦点、展开状态等错位。

### Q3 multiple | 动态高度难点

动态高度虚拟列表相比固定高度更难，主要难在哪里？

- [x] A. 需要测量每行高度，并维护高度缓存和位置映射。
- [x] B. 快速滚动、插入数据和图片加载会影响滚动锚点与偏移修正。
- [ ] C. 动态高度列表不需要 overscan。
- [x] D. 常需要 ResizeObserver、二分查找起始项和成熟库处理边界。
- [ ] E. 动态高度只要给每行加 `height: auto` 就能精确虚拟化。

**解释**：动态高度的核心是“不知道每行位置直到测量完成”。生产中优先考虑 TanStack Virtual、react-virtuoso 等成熟库。

## react-035

### Q1 single | boolean 组合问题

为什么多个 boolean 表达异步请求状态容易出问题？

- [x] A. 可能组合出非法状态，例如 `isLoading` 和 `isSuccess` 同时为 true。
- [ ] B. React 不允许一个组件里有多个 boolean state。
- [ ] C. boolean state 不能触发渲染。
- [ ] D. TypeScript 无法声明 boolean。

**解释**：多个 boolean 没有表达互斥关系。状态机或 discriminated union 可以把合法状态收敛到明确集合。

### Q2 single | 联合类型收窄

下面状态类型中，为什么在 `status === 'success'` 分支里读取 `data` 更安全？

```ts
type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }
```

- [x] A. `status` 是判别字段，TypeScript 能在分支里收窄到对应状态。
- [ ] B. 所有联合成员都有 `data` 字段。
- [ ] C. React 会在运行时自动补上 `data`。
- [ ] D. 只要字段名叫 `status`，就不需要处理错误状态。

**解释**：discriminated union 让状态和数据绑定在一起，避免在 error/idle/loading 状态读取不存在的数据。

### Q3 multiple | 状态机适用场景

哪些场景适合考虑状态机或 `useReducer + discriminated union`？

- [x] A. 多步表单、上传、支付、审批等状态转移明确的流程。
- [x] B. 需要防止非法状态组合，并清楚表达事件如何触发状态转移。
- [ ] C. 单个 `isOpen` 开关。
- [x] D. 流程复杂到需要 guard、嵌套状态、可视化和测试时，可以考虑 XState。
- [ ] E. 所有 React 状态都必须用专业状态机库。

**解释**：状态机适合状态边界和事件转移复杂的流程。简单开关用状态机反而增加样板和学习成本。

## react-036

### Q1 single | StrictMode 目的

React StrictMode 的主要作用是什么？

- [ ] A. 提升生产环境运行性能。
- [x] B. 在开发期暴露不纯渲染、Effect 清理不完整和废弃 API 等问题。
- [ ] C. 自动修复所有 Hooks 依赖错误。
- [ ] D. 让组件只渲染一次，避免重复日志。

**解释**：StrictMode 是开发期检查工具，不影响生产环境行为。它帮助组件满足更严格、并发安全的约束。

### Q2 single | Effect 执行两次

开发环境 StrictMode 下看到 effect setup/cleanup/setup，正确反应是什么？

- [ ] A. 删除 StrictMode，否则生产也一定重复请求。
- [x] B. 检查 effect 是否可重复 setup/cleanup，补齐订阅、连接、定时器等清理逻辑。
- [ ] C. 把依赖数组全部改成 `[]`。
- [ ] D. 把所有 effect 改成 `useLayoutEffect`。

**解释**：StrictMode 故意让清理不完整的问题更早暴露。正确修复是让副作用可撤销、可重建，而不是关闭检查。

### Q3 multiple | StrictMode 检查内容

StrictMode 可能帮助发现哪些问题？

- [x] A. render 阶段有副作用，例如修改外部变量或发请求。
- [x] B. effect 缺少 cleanup，导致重复订阅或重复连接。
- [ ] C. 生产环境所有性能瓶颈。
- [x] D. legacy lifecycle、字符串 ref、`findDOMNode` 等废弃 API。
- [ ] E. 服务端接口鉴权漏洞。

**解释**：StrictMode 聚焦 React 组件纯度、生命周期清理和废弃 API。它不是性能分析器，也不是安全扫描器。

## react-037

### Q1 single | Fragment 作用

React Fragment 的主要作用是什么？

- [x] A. 返回多个相邻节点而不额外生成 DOM wrapper。
- [ ] B. 创建一个带默认样式的 div。
- [ ] C. 让子组件自动 memo。
- [ ] D. 替代 key 解决列表身份问题。

**解释**：Fragment 解决的是结构表达问题：多个节点需要并列返回，但不想添加无意义 DOM。

### Q2 single | Fragment key

列表中每个 item 需要返回一组 `<dt>/<dd>`，并且要提供 key，应该使用哪种写法？

- [ ] A. `<>` 简写 Fragment，并在里面的第一个 `<dt>` 写 key。
- [x] B. `<Fragment key={item.id}>...</Fragment>` 完整写法。
- [ ] C. 外面包一个 `<div key={item.id}>`，不管它是否破坏 `dl` 语义。
- [ ] D. 不需要 key，因为 Fragment 不生成 DOM。

**解释**：Fragment 简写不能接收 key。列表里需要 key 时，必须使用完整的 `Fragment` 写法。

### Q3 multiple | Fragment 使用场景

哪些场景常适合 Fragment？

- [x] A. 在 `dl` 中返回相邻的 `dt` 和 `dd`。
- [x] B. 避免无意义 wrapper 破坏 table、list、flex/grid 或语义结构。
- [ ] C. 需要给一组节点统一绑定 DOM 事件和样式。
- [x] D. 组件必须返回一个根结构，但不想新增真实 DOM 节点。
- [ ] E. 想让 React 跳过 diff。

**解释**：Fragment 不产生 DOM，因此不能承载样式、事件或 ref。它是语义和结构工具，不是性能魔法。

## react-038

### Q1 single | Compound Component 本质

复合组件模式最核心的价值是什么？

- [ ] A. 把所有子组件写在一个文件里，减少 import。
- [x] B. 一组子组件通过共同父组件或 Context 协作，同时让调用方保持语义化组合结构。
- [ ] C. 用 HOC 自动包装所有子组件。
- [ ] D. 让组件只能以固定布局渲染，禁止调用方调整结构。

**解释**：Compound Component 常用于 Tabs、Accordion、Select。它把状态和行为集中在父组件/Context，同时把布局组合权交给调用方。

### Q2 single | 受控/非受控

一个 Tabs 组件同时支持 `value/onValueChange` 和 `defaultValue`，这种设计解决什么问题？

- [x] A. 调用方既可以完全控制当前 tab，也可以让组件内部管理初始值后的状态。
- [ ] B. 让 Context 不再需要 Provider。
- [ ] C. 让所有 Trigger 都变成原生链接。
- [ ] D. 避免处理键盘可访问性。

**解释**：高质量复合组件通常同时支持受控和非受控用法。`value` 存在时外部控制，只有 `defaultValue` 时内部维护。

### Q3 multiple | Tabs 复合组件细节

实现一个专业 Tabs 复合组件，哪些点需要考虑？

- [x] A. `role=tablist/tab/tabpanel`、`aria-selected`、`aria-controls` 和 `aria-labelledby`。
- [x] B. 方向键、Home/End、焦点 roving tabindex 等键盘交互。
- [ ] C. 子组件找不到 Context 时静默失败，避免打扰用户。
- [x] D. Context value 要稳定，并避免无关状态变化导致全部子组件重渲染。
- [ ] E. 只要能点击切换，就已经满足可访问性。

**解释**：复合组件 API 看起来优雅，但真正难点在受控/非受控、Context、键盘可访问性、id 关联和错误提示。

## react-039

### Q1 single | 表单库选择

复杂表单包含字段校验、服务端错误回填、提交状态和可访问性。更合理的方案是什么？

- [ ] A. 每个字段单独 `useState`，错误统一弹 toast，不需要字段级错误。
- [x] B. 使用 React Hook Form 配合 Zod/Yup/Valibot 等 schema，并处理服务端错误回填。
- [ ] C. 只依赖 HTML5 required，业务校验全部省略。
- [ ] D. 所有校验都放在 CSS 里。

**解释**：复杂表单需要清晰的 values/errors/touched/isSubmitting 模型。React Hook Form + schema 能减少样板，并让类型和校验规则更集中。

### Q2 single | 服务端错误

登录接口返回“邮箱或密码错误”，下面哪种处理更合适？

- [x] A. 用 `setError('root', { message })` 或对应字段错误展示在表单内，并允许屏幕阅读器读到。
- [ ] B. 只在控制台打印错误。
- [ ] C. 直接清空所有输入框，不展示原因。
- [ ] D. 把错误吞掉，避免用户看到失败。

**解释**：服务端错误是表单状态的一部分。应该回填到 root 或字段错误，给用户明确、可访问、可恢复的反馈。

### Q3 multiple | 表单可访问性

关于表单验证可访问性，哪些做法正确？

- [x] A. 错误输入设置 `aria-invalid`。
- [x] B. 用 `aria-describedby` 把输入框和错误文案关联。
- [ ] C. 只把边框变红，不需要文字说明。
- [x] D. 全局错误可以使用 `role="alert"` 或可聚焦区域提示。
- [ ] E. 提交中按钮不需要禁用，因为用户可以自己控制不重复点。

**解释**：表单错误不能只靠颜色。输入、错误文本、提交状态和服务端反馈都要让键盘和屏幕阅读器用户可理解、可操作。

## react-040

### Q1 single | createSlice 与 Immer

在 Redux Toolkit 的 `createSlice` reducer 中写 `state.list.push(user)`，为什么是允许的？

- [ ] A. Redux Toolkit 放弃了不可变更新原则。
- [x] B. RTK 内置 Immer，把看似可变的写法转换成不可变更新。
- [ ] C. Redux store 本来就是可变对象，不需要比较引用。
- [ ] D. 只有数组 push 被允许，其他字段不能修改。

**解释**：RTK 通过 Immer 降低不可变更新样板。开发者写“mutating syntax”，最终仍产生不可变结果。

### Q2 single | reducer 纯函数

下面哪段逻辑不应该写在 RTK reducer 中？

- [ ] A. 根据 action payload 把用户加入列表。
- [ ] B. 根据 id 过滤删除用户。
- [x] C. 发起 `fetch('/api/users')` 请求并等待响应。
- [ ] D. 把状态 status 从 `idle` 改成 `loading`。

**解释**：Redux reducer 仍然必须纯净。请求、时间、随机数和外部副作用应放在 thunk、listener middleware、RTK Query 或组件事件流程中。

### Q3 multiple | RTK Query 与 createAsyncThunk

关于 Redux Toolkit 生态，哪些说法合理？

- [x] A. `configureStore` 默认集成常用中间件和开发期检查，减少手动配置。
- [x] B. 少量异步流程可以用 `createAsyncThunk`，复杂服务端缓存更适合 RTK Query。
- [ ] C. RTK Query 只负责发请求，不处理缓存、去重、失效或请求状态。
- [x] D. RTK Query 的 tag invalidation 可用于 mutation 后刷新相关 query。
- [ ] E. 使用 RTK 后就不需要 selector，组件可以直接订阅整个 store。

**解释**：RTK 的核心价值是约束、样板减少和可观测性。服务端状态推荐 RTK Query；客户端订阅仍要用 selector 控制重渲染范围。

## react-041

### Q1 single | Portal 的边界

一个 Modal 用 `createPortal(..., document.body)` 渲染后，下面哪种理解最准确？

- [ ] A. Portal 会自动完成焦点陷阱、Esc 关闭和屏幕阅读器隔离。
- [x] B. Portal 只改变 DOM 挂载位置，焦点管理、键盘交互和 a11y 仍要单独实现。
- [ ] C. Portal 会让 Modal 脱离 React 树，因此 Context 和事件都失效。
- [ ] D. Portal 的主要作用是让组件不再参与 React 渲染。

**解释**：Portal 解决的是层级和遮挡问题，不解决交互语义。React 事件和 Context 仍按 React 树工作，但 dialog 行为要自己或用成熟库实现。

### Q2 multiple | 焦点与键盘

实现可访问 Modal 时，哪些焦点和键盘细节是必要的？

- [x] A. 打开时保存触发元素，并把焦点移入对话框。
- [x] B. 关闭时尽量恢复焦点到打开 Modal 前的元素。
- [x] C. 处理 Esc 关闭，并让 Tab/Shift+Tab 在对话框内循环。
- [ ] D. 只要给外层 overlay 加 `onClick`，键盘用户就可以正常使用。
- [ ] E. 打开 Modal 后把焦点留在页面原位置，避免干扰用户。

**解释**：Modal 是临时焦点上下文。用户进入后应被引导到 dialog 内，并且不能在未关闭时 Tab 到背景内容。

### Q3 multiple | 生产级 Modal 边界

哪些问题是生产级 Modal 常见但容易漏掉的边界？

- [x] A. 背景内容需要 inert 或 `aria-hidden`，避免辅助技术继续访问背景。
- [x] B. body 滚动锁要考虑嵌套弹窗、滚动条补偿和卸载恢复。
- [x] C. 有退出动画时不能在 `open=false` 的瞬间立刻卸载 DOM。
- [ ] D. 只要 overlay 层级够高，就不需要 `role="dialog"`。
- [ ] E. SSR 中可以无条件访问 `document.body`，不会有任何问题。

**解释**：Modal 的难点在状态生命周期和浏览器环境细节。成熟库通常已经处理这些边界，手写时必须显式覆盖。

## react-042

### Q1 single | `&&` 渲染数字

下面代码中，当 `count` 为 `0` 时页面会发生什么？

```tsx
return <div>{count && <Badge count={count} />}</div>
```

- [ ] A. 什么都不渲染，因为 `0` 是 falsy。
- [x] B. 会渲染出文本 `0`，因为表达式结果就是数字 `0`。
- [ ] C. React 会自动把 `0` 转成 `null`。
- [ ] D. 会抛出错误，因为 JSX 里不能写数字条件。

**解释**：`&&` 返回的是左侧原值或右侧表达式。数字 `0` 是合法 React child，会被渲染；应写成 `count > 0 && ...`。

### Q2 single | 状态保留与重置

用户切换 `userId` 后，希望同一个表单组件完全重置本地输入状态。下面哪种方式最直接？

```tsx
<Form userId={userId} />
```

- [ ] A. 保持组件类型和位置不变，React 一定会自动清空 state。
- [x] B. 给表单加和用户相关的 `key`，例如 `<Form key={userId} userId={userId} />`。
- [ ] C. 把所有条件渲染都改成三元表达式。
- [ ] D. 用 `&&` 包住 Form，React 就不会保留 state。

**解释**：同一位置的同一组件类型通常会保留 state。改变 key 会让 React 视为新实例，从而重新挂载。

### Q3 multiple | 条件渲染选择

关于 React 条件渲染，哪些判断是合理的？

- [x] A. 大分支页面适合用 `if/return` 提前退出，避免 JSX 过度嵌套。
- [x] B. 二选一的小片段适合三元表达式，但嵌套三元会降低可读性。
- [ ] C. 条件渲染只影响显示，不会影响组件卸载、Effect 清理或 state 保留。
- [x] D. 状态到视图的映射表可以提升清晰度，但简单场景不必过度抽象。
- [ ] E. `null`、`false`、`0` 在 React 中都会被忽略。

**解释**：条件渲染既是代码组织问题，也是生命周期问题。是否卸载、是否复用、是否重置，都取决于位置、类型和 key。

## react-043

### Q1 single | queryKey 参数

下面查询会根据 `page` 和 `keyword` 返回不同结果。哪个 `queryKey` 更合理？

```tsx
useQuery({
  queryKey: ?,
  queryFn: () => fetchUsers({ page, keyword }),
})
```

- [ ] A. `['users']`，所有用户列表都应该共用同一份缓存。
- [x] B. `['users', { page, keyword }]`，把影响结果的参数放进 key。
- [ ] C. `[fetchUsers]`，函数引用能代表所有参数。
- [ ] D. `['users', Date.now()]`，每次都生成新 key 避免缓存问题。

**解释**：queryKey 是缓存身份。漏掉影响结果的参数会串缓存；加入随机值会让缓存和去重基本失效。

### Q2 single | isPending 与 isFetching

一个列表已有缓存数据，此时窗口重新聚焦触发后台刷新。UI 更适合如何处理？

- [ ] A. 看到 `isFetching` 就把列表替换成全屏 Loading。
- [x] B. 保留已有列表，用轻量刷新状态表示后台请求中。
- [ ] C. 忽略 `isFetching`，因为有缓存时不会再请求。
- [ ] D. 把 `staleTime` 设为 `Infinity`，这样永远不会有刷新。

**解释**：`isPending` 更偏首次无数据加载，`isFetching` 包括后台刷新。已有数据时通常不应闪回空白 Loading。

### Q3 multiple | Mutation 与乐观更新

关于 TanStack Query 的 mutation，哪些做法是合理的？

- [x] A. 创建成功后可以 `setQueryData(['user', id], user)` 填充详情缓存。
- [x] B. 变更列表数据后可以 `invalidateQueries({ queryKey: ['users'] })` 触发相关列表刷新。
- [x] C. 乐观更新前先取消相关查询并保存 previous，用于失败回滚。
- [ ] D. 乐观更新适合库存、支付等强一致场景，失败也不需要回滚。
- [ ] E. `useMutation` 会自动知道所有受影响的 query，不需要配置失效或写缓存。

**解释**：mutation 不会神奇推断业务影响范围。缓存写入、失效、乐观更新和回滚都要按数据关系显式设计。

## react-044

### Q1 single | 更新列表项

下面哪段代码更符合 React 列表状态更新原则？

- [ ] A. `todos[index].done = true; setTodos(todos)`
- [x] B. `setTodos(prev => prev.map(todo => todo.id === id ? { ...todo, done: !todo.done } : todo))`
- [ ] C. `todos.push(nextTodo); setTodos(todos)`
- [ ] D. `setTodos(prev => { prev.splice(0, 1); return prev })`

**解释**：React 依赖引用变化判断更新。数组和对象都应返回新引用；基于旧状态时优先使用函数式 setState。

### Q2 single | key 与移动

待办列表支持删除、插入、拖拽排序，并且每行里有输入框。为什么不能用 index 当 key？

- [x] A. 行的位置变化后，React 可能把旧行 state 复用到新数据上，导致输入值或焦点错位。
- [ ] B. index key 会让 React 完全无法渲染数组。
- [ ] C. index key 只影响 CSS，不影响组件状态。
- [ ] D. 使用 index key 会让所有事件监听失效。

**解释**：key 表示数据身份，不是视觉位置。会增删移动的列表必须用稳定业务 id。

### Q3 multiple | 列表增删改实践

关于列表状态，哪些做法正确？

- [x] A. 添加时返回新数组，例如 `[...prev, nextItem]`。
- [x] B. 删除时使用 `filter`，更新时使用 `map` 或 Immer。
- [x] C. 移动元素时先复制数组，再对副本 `splice`，最后返回副本。
- [ ] D. `Date.now()` 在所有场景都可以当作可靠唯一 id。
- [ ] E. 使用 Immer 后就可以在 React state 外部随意修改原对象。

**解释**：简单列表用数组方法即可。Immer 只是把草稿写法转换为不可变结果，不等于允许修改外部共享对象。

## react-045

### Q1 single | 防止重复加载

无限滚动哨兵进入视口时，哪段触发逻辑更稳妥？

- [ ] A. 只要进入视口就调用 `fetchNextPage()`，不需要判断状态。
- [x] B. `if (hasNextPage && !isFetchingNextPage) fetchNextPage()`。
- [ ] C. 每次滚动都把页码加一，再请求对应页。
- [ ] D. 进入视口后先清空已有列表，再重新请求第一页。

**解释**：哨兵可能连续触发。需要同时检查是否还有下一页、是否已经在请求，避免并发重复加载。

### Q2 multiple | Cursor 分页

为什么信息流无限滚动更推荐 cursor 分页？

- [x] A. 新数据插入时，cursor 比 page number 更不容易出现重复或遗漏。
- [x] B. cursor 可以表达“从上一页最后一条之后继续取”的位置。
- [ ] C. cursor 分页意味着前端永远不需要去重。
- [ ] D. cursor 分页会自动解决 DOM 无限增长问题。
- [x] E. 后端返回 `nextCursor`，前端可以用它作为 `getNextPageParam`。

**解释**：cursor 解决的是数据窗口稳定性，不解决所有前端问题。前端仍要处理去重、并发、错误和长列表性能。

### Q3 multiple | 无限滚动体验

哪些属于高质量无限滚动需要考虑的体验和工程问题？

- [x] A. 提供“加载更多”按钮兜底，照顾键盘和屏幕阅读器用户。
- [x] B. 列表很长时配合虚拟列表，避免 DOM 无限增长。
- [x] C. 路由返回时恢复滚动位置和已加载页。
- [ ] D. 错误后隐藏重试入口，让用户继续滚动触发。
- [ ] E. 无限滚动适合所有后台表格和 SEO 页面。

**解释**：无限滚动适合信息流，但对定位、可访问性、SEO 和性能都有代价。工程上必须有重试、兜底和恢复策略。

## react-046

### Q1 single | selector 订阅

在 Zustand 中，为什么不推荐组件里直接写 `const state = useStore()`？

- [ ] A. Zustand 不允许组件读取整个 store。
- [x] B. 组件会订阅整个 store，任意字段变化都可能导致它重渲染。
- [ ] C. 这样读取不到 action，只能读取数据。
- [ ] D. 这样会绕过 React 的事件系统。

**解释**：Zustand 的性能关键在 selector。组件只订阅自己需要的切片，多个字段可拆 selector 或使用 shallow 比较。

### Q2 multiple | persist 中间件

使用 Zustand `persist` 时，哪些做法更安全？

- [x] A. 用 `partialize` 只持久化真正需要恢复的字段。
- [x] B. 不把 token、临时错误状态、巨大列表无脑写入 localStorage。
- [x] C. 设计版本迁移，避免 store 结构变化后旧缓存污染新逻辑。
- [ ] D. 把整个 store 持久化最省事，也最适合所有生产项目。
- [ ] E. persist 后就不需要考虑数据过期或隐私问题。

**解释**：持久化是长期状态契约。字段选择、迁移、容量和安全都要显式设计。

### Q3 multiple | Zustand 与 Redux/Query

关于 Zustand、Redux Toolkit 和服务端状态，哪些判断合理？

- [x] A. Zustand 约束少、上手快，但大团队需要额外约定 store 拆分和 action 命名。
- [x] B. Redux Toolkit 更适合复杂状态流、审计、回放和团队统一规范。
- [x] C. 服务端缓存、去重、失效和后台刷新更适合 TanStack Query/RTK Query。
- [ ] D. Zustand 的 action 里能写 async，所以它天然替代 Query 类库。
- [ ] E. Redux Toolkit 使用后组件就可以订阅整个 store，不会影响渲染。

**解释**：客户端状态管理和服务端状态管理是不同问题。不要用自由度高的 store 手写复杂缓存协议。

## react-047

### Q1 single | useId 适用场景

下面哪个场景最适合使用 `useId`？

- [x] A. 生成 input、label、hint/error 文案之间的 DOM id 关联。
- [ ] B. 给数组列表生成 `key`。
- [ ] C. 给数据库记录生成业务主键。
- [ ] D. 生成每次请求都不同的 trace id。

**解释**：`useId` 解决的是 React 渲染中的稳定 DOM id，尤其是 a11y 关联和 SSR hydration 一致性，不是业务 id 生成器。

### Q2 single | SSR 随机 id

SSR 页面中用 `Math.random()` 生成 input 的 id，最可能带来什么问题？

- [ ] A. React 会自动把服务端和客户端随机数同步。
- [x] B. 服务端 HTML 和客户端首屏 id 不一致，可能造成 hydration mismatch 或关联错误。
- [ ] C. 浏览器不允许 id 中出现数字。
- [ ] D. 只有生产环境会执行 `Math.random()`，开发环境不会。

**解释**：服务端和客户端初次渲染必须对得上。`useId` 会按 React 树生成稳定 id，适合这个场景。

### Q3 multiple | useId 注意事项

关于 `useId`，哪些说法正确？

- [x] A. 不能在循环、条件或普通函数中调用，仍要遵守 Hooks 规则。
- [x] B. 不应依赖它生成的具体字符串格式。
- [x] C. 多个 React 根共存时，可以通过一致的 `identifierPrefix` 降低跨根冲突风险。
- [ ] D. `useId` 生成的值可以作为列表 key，因为它足够唯一。
- [ ] E. `useId` 会在每次点击事件后生成新的随机值。

**解释**：`useId` 的稳定性服务于渲染和 hydration，不服务于数据身份。列表 key 必须来自数据本身。

## react-048

### Q1 single | 库选择

做应用内排序拖拽列表，为什么通常更推荐 `@dnd-kit` 而不是只用 HTML5 Drag and Drop API？

- [ ] A. HTML5 Drag and Drop API 无法处理任何拖拽事件。
- [x] B. `@dnd-kit` 更适合自定义排序、触摸、键盘传感器、碰撞检测和可访问性扩展。
- [ ] C. `@dnd-kit` 会自动把所有列表状态存到后端。
- [ ] D. HTML5 Drag and Drop API 只能在 React 之外使用。

**解释**：原生 DnD 对文件拖放有价值，但应用内排序的移动端、键盘和动画体验通常需要更专业的抽象。

### Q2 single | onDragEnd 边界

`dnd-kit` 的 `onDragEnd({ active, over })` 中为什么要先判断 `!over || active.id === over.id`？

- [x] A. 拖出可投放区域时 `over` 可能为 null，同一项也无需重排。
- [ ] B. `active.id` 永远不可靠，不能用于排序。
- [ ] C. 这样可以让拖拽过程中每一帧都更新数组。
- [ ] D. React 不允许在事件回调中调用 setState。

**解释**：拖拽结束时不一定落在有效目标上。没有目标或目标没变时应直接返回，避免错误移动。

### Q3 multiple | 拖拽排序实践

实现高质量拖拽排序时，哪些点需要考虑？

- [x] A. item 使用稳定 id，不要用 index 作为拖拽身份和 React key。
- [x] B. 同时配置 PointerSensor 和 KeyboardSensor，照顾鼠标、触摸和键盘。
- [x] C. 通常在 drag end 后提交最终顺序，而不是拖拽中频繁重排真实数据。
- [ ] D. 拖拽排序天然对屏幕阅读器友好，不需要额外反馈。
- [ ] E. 虚拟列表和拖拽组合时不需要额外测量或 overlay 处理。

**解释**：DnD 是复杂交互，不只是鼠标移动。输入方式、可访问性、滚动容器、虚拟列表和动画都可能影响方案。

## react-049

### Q1 single | getSnapshot 稳定性

下面的 `getSnapshot` 为什么有问题？

```tsx
const value = useSyncExternalStore(
  store.subscribe,
  () => ({ count: store.getState().count }),
  () => ({ count: 0 }),
)
```

- [ ] A. `getSnapshot` 不能读取 store。
- [x] B. 每次都返回新对象，即使 count 没变也会被认为 snapshot 变化。
- [ ] C. `useSyncExternalStore` 只能返回 boolean。
- [ ] D. 服务端 snapshot 不能是对象。

**解释**：snapshot 没变时应返回同一个值。每次创建新对象可能造成重复渲染甚至无限循环，应返回原始值或做缓存/selector 封装。

### Q2 multiple | 外部 store 协议

使用 `useSyncExternalStore` 封装外部 store 时，哪些要求是正确的？

- [x] A. `subscribe` 注册监听并返回 unsubscribe。
- [x] B. `getSnapshot` 必须同步、无副作用。
- [x] C. SSR 时提供 `getServerSnapshot`，且 hydration 初始值要兼容。
- [ ] D. `getSnapshot` 可以返回 Promise，React 会自动等待。
- [ ] E. 每次 render 都创建一个全新的 store 实例更安全。

**解释**：这是 React 与外部数据源之间的同步订阅协议。它要求同步读取和稳定订阅，才能在并发渲染下避免 tearing。

### Q3 single | 何时使用

哪个场景最适合直接或间接使用 `useSyncExternalStore`？

- [ ] A. 管理一个只在组件内部使用的输入框 value。
- [x] B. 封装浏览器在线状态、媒体查询或自定义外部 store 订阅。
- [ ] C. 替代所有 `useEffect`。
- [ ] D. 在 render 阶段发起网络请求。

**解释**：它面向 React 外部的同步状态源。普通组件本地状态继续用 `useState/useReducer`，服务端异步数据通常用 Query 类库。

## react-050

### Q1 single | render 与 commit

关于 React Reconciliation，下面哪种说法正确？

- [ ] A. 协调阶段会立即修改真实 DOM。
- [x] B. 协调发生在 render 阶段，计算并标记变更；真实宿主环境修改发生在 commit 阶段。
- [ ] C. commit 阶段可以被随意中断并重试。
- [ ] D. Reconciliation 的唯一目标是生成理论上的最小 DOM 操作集。

**解释**：render 阶段可被调度、中断和重做；commit 阶段执行 mutation/layout/passive 等提交工作，不能随意中断。

### Q2 multiple | key、type 与状态复用

列表 diff 中，哪些判断是合理的？

- [x] A. type 和 key 相同通常可以复用 Fiber，并保留组件状态。
- [x] B. type 不同通常会删除旧子树并创建新子树。
- [x] C. key 表示兄弟节点中的数据身份，React 可用它判断移动和复用。
- [ ] D. key 只影响首次渲染，后续更新不会再用。
- [ ] E. 使用随机 key 可以最大化状态复用。

**解释**：React 的复用以 type/key/位置等信息为基础。随机 key 会让节点每次像新实例，导致状态丢失和额外工作。

### Q3 multiple | Fiber 与性能

关于 Fiber 协调和性能优化，哪些说法正确？

- [x] A. `alternate` 连接 current tree 和 workInProgress tree，支持双缓冲。
- [x] B. `React.memo`、稳定 props 和 selector 可以帮助 React bailout 无变化子树。
- [x] C. Context value 变化会让消费者重新渲染，高频状态应谨慎放入大 Context。
- [ ] D. 现代 React 主要依赖一个全局 effectList，组件不会在 Fiber 上记录 flags。
- [ ] E. 只要用了 Fiber，所有 render 工作都能自动跳过。

**解释**：Fiber 是可调度的工作单元和树结构，不是性能自动开关。能否跳过工作仍取决于状态、props、context、lanes 和组件边界设计。

## react-051

### Q1 single | Zustand vs Jotai

项目里有很多局部组合状态和派生状态，例如多个 atom 互相计算、组件只订阅自己用到的细粒度数据。哪种选择更贴近这个模型？

- [ ] A. Recoil，新项目优先选择，因为生态正在快速增长。
- [ ] B. Zustand，因为它强制把每个字段拆成 atom。
- [x] C. Jotai，因为 atom 依赖图天然适合细粒度组合和派生状态。
- [ ] D. TanStack Query，因为它主要负责本地 UI 状态。

**解释**：Zustand 是集中 store + selector；Jotai 是 atom 模型。服务端缓存仍应交给 Query 类库，不要混进本地状态方案。

### Q2 single | Recoil 选型

关于 Recoil，新项目更合理的态度是什么？

- [ ] A. 仍然首选 Recoil，因为它已经成为 React 官方状态库。
- [x] B. 不建议新选；已有项目可以维护，但应评估迁移到 Jotai、Zustand 或 Redux Toolkit 等方案。
- [ ] C. 只有服务端状态才应该用 Recoil。
- [ ] D. Recoil 与 Jotai 完全相同，可以无成本互换。

**解释**：Recoil 属于 atom/selector 模型，但生态已停滞。新项目应优先选择仍活跃、团队能长期维护的方案。

### Q3 multiple | 状态方案分工

关于 Zustand、Jotai、Redux Toolkit 和 Query 类库的分工，哪些判断合理？

- [x] A. 简单全局 UI/业务状态可以选 Zustand。
- [x] B. 原子级组合和复杂派生状态可以选 Jotai。
- [x] C. 强流程治理、审计、回放和团队规范可以选 Redux Toolkit。
- [ ] D. 服务端分页、重试、缓存失效应优先放进 Zustand/Jotai 手写。
- [ ] E. 状态库选型只看 API 行数，不需要考虑团队规模和维护周期。

**解释**：不同库解决的问题不同。服务端状态和客户端状态要分开看，团队治理和长期维护也会影响选型。

## react-052

### Q1 single | 旧请求覆盖新状态

下面 effect 在用户快速从 A 切到 B 时，最可能出现什么问题？

```tsx
useEffect(() => {
  fetchUser(userId).then(setUser)
}, [userId])
```

- [ ] A. React 会自动取消 A 请求，所以不会有问题。
- [x] B. A 请求可能比 B 晚返回，旧结果覆盖当前 B 页面。
- [ ] C. `then(setUser)` 在 React 中不会触发渲染。
- [ ] D. 只要依赖数组写了 `userId`，请求顺序就会被保证。

**解释**：依赖数组只决定何时发起副作用，不保证异步返回顺序。旧请求晚返回是典型竞态。

### Q2 multiple | 处理竞态

哪些方式可以降低 React 异步竞态风险？

- [x] A. 使用 `AbortController`，cleanup 时 abort 上一次请求。
- [x] B. 对无法 abort 的 Promise 使用请求序号，只接受最新一次结果。
- [x] C. 使用 TanStack Query，并把 `userId` 放入 queryKey，queryFn 接收 `signal`。
- [ ] D. 把依赖数组改成 `[]`，这样就永远不会竞态。
- [ ] E. 在旧请求返回时无条件 `setState`，React 会自动判断是否过期。

**解释**：竞态要么取消旧任务，要么在结果落地前验证它仍然是最新任务。数据框架能处理一部分，但业务冲突仍要设计。

### Q3 multiple | 其他竞态场景

下面哪些也属于需要关注竞态或重复提交的场景？

- [x] A. 搜索输入连续变化，旧关键词请求晚于新关键词返回。
- [x] B. 提交按钮被连续点击，后端创建了重复记录。
- [x] C. WebSocket 或流式消息乱序到达，需要按 seq/version 丢弃旧消息。
- [ ] D. 静态文案组件只渲染固定标题。
- [ ] E. 单纯 CSS hover 样式变化。

**解释**：竞态本质是“多个异步事件争夺同一份状态”。搜索、提交、路由切换、流式数据都常见。

## react-053

### Q1 single | aria-hidden 误用

Dialog portal 到 `document.body` 后，给 `document.body` 设置 `aria-hidden="true"` 会有什么风险？

- [x] A. 可能把 Dialog 自身也隐藏给辅助技术。
- [ ] B. 会让 Dialog 自动获得焦点陷阱。
- [ ] C. 会让 React Context 失效。
- [ ] D. 会阻止鼠标点击，但不影响屏幕阅读器。

**解释**：如果 Dialog 也是 body 的子节点，隐藏 body 等于把 Dialog 一起隐藏。应隐藏应用根节点或使用 inert/成熟库处理背景隔离。

### Q2 multiple | Dialog ARIA

一个基础 Dialog 结构中，哪些 ARIA/语义设置是合理的？

- [x] A. Dialog 容器设置 `role="dialog"`。
- [x] B. 设置 `aria-modal="true"` 表达模态语义。
- [x] C. 用 `aria-labelledby` 关联标题，用 `aria-describedby` 关联描述。
- [ ] D. 标题只靠字体变大，不需要可访问名称。
- [ ] E. 关闭按钮可以没有文本也没有 `aria-label`。

**解释**：屏幕阅读器需要知道当前进入的是对话框、它的标题是什么、内容描述是什么，以及如何关闭。

### Q3 multiple | 交互策略

关于 Dialog 交互，哪些判断正确？

- [x] A. 打开前保存焦点，关闭后恢复焦点到触发元素。
- [x] B. Tab/Shift+Tab 应限制在 Dialog 内部循环。
- [x] C. Escape 通常可关闭，但危险操作确认弹窗可以要求业务确认。
- [ ] D. 点击遮罩关闭是所有 Dialog 的必选行为。
- [ ] E. Portal 自动保证键盘和屏幕阅读器用户体验。

**解释**：Dialog 的核心是临时接管交互上下文。点击遮罩只是可选交互，重要确认弹窗反而要防误关。

## react-054

### Q1 single | Module Federation 粒度

下面哪种场景更适合 Module Federation？

- [ ] A. 只想把一个普通函数拆到另一个文件。
- [x] B. Host 运行时加载远程团队发布的组件/模块，并共享 React 等依赖。
- [ ] C. 想让浏览器自动隔离所有 CSS 和全局变量。
- [ ] D. 单团队小项目想减少一次 import。

**解释**：Module Federation 是运行时模块组合方案，适合跨构建、跨团队发布的组件或业务模块组合。

### Q2 multiple | 微前端运行时风险

集成远程 React 子应用或远程模块时，哪些工程风险必须考虑？

- [x] A. remoteEntry 加载失败、超时或版本不兼容，需要降级和监控。
- [x] B. React/ReactDOM 多实例可能导致 Context、Hooks 或 DevTools 问题。
- [x] C. 样式隔离、路由 basename、主子应用跳转和卸载清理。
- [ ] D. 远程模块加载后一定比本地代码更快。
- [ ] E. 微前端会自动统一权限、埋点和错误监控。

**解释**：微前端带来组织和部署收益，也带来运行时依赖、隔离、治理和可观测性成本。

### Q3 single | qiankun 生命周期

qiankun 子应用中，`unmount` 最重要的职责是什么？

- [ ] A. 重新创建主应用路由。
- [x] B. 卸载 React root，并清理定时器、订阅、全局事件等副作用。
- [ ] C. 把所有请求缓存写入 localStorage。
- [ ] D. 修改远程模块的构建配置。

**解释**：应用级接入要求子应用能被反复 mount/unmount。卸载不干净会造成内存泄漏、重复事件和样式污染。

## react-055

### Q1 single | 避免主题闪烁

为什么暗色主题通常要在 React hydration 前就把主题写到 `<html>` 上？

- [ ] A. React hydration 后无法修改 DOM 属性。
- [x] B. 避免首屏先按默认亮色渲染，再切到暗色造成闪烁。
- [ ] C. CSS 变量只能在 hydration 前声明。
- [ ] D. 浏览器不支持运行时读取 localStorage。

**解释**：主题选择会影响首屏颜色。内联脚本先读取本地设置或系统偏好，可以让初次绘制就使用正确主题。

### Q2 multiple | CSS 变量主题

用 CSS 变量实现主题切换有哪些优势？

- [x] A. 视觉 token 集中在根节点或主题选择器中，组件只使用 `var(...)`。
- [x] B. 切换主题主要由 CSS 生效，不必让大量业务组件因为颜色重渲染。
- [x] C. 可以覆盖普通 CSS、伪元素、组件库样式和非 React 节点。
- [ ] D. CSS 变量会自动生成所有暗色图片和图表配色。
- [ ] E. 使用 CSS 变量后就不需要处理 `color-scheme`。

**解释**：CSS 变量适合表达设计 token，但图片、图表、代码高亮和原生控件仍要单独适配。

### Q3 multiple | system 主题

实现 `light/dark/system` 三态主题时，哪些逻辑是合理的？

- [x] A. 用户选择 `system` 时监听 `prefers-color-scheme` 变化。
- [x] B. 用户明确选择 light/dark 时，不应被系统主题变化覆盖。
- [x] C. 把用户选择持久化，刷新后恢复。
- [ ] D. 每次 render 都直接写 localStorage，保证“实时”。
- [ ] E. 主题状态必须放进 Redux，否则无法切换。

**解释**：`system` 是跟随系统，light/dark 是显式偏好。主题存储和 DOM 应用要分层处理，避免无意义重渲染。

## react-056

### Q1 single | 数据向下事件向上

下面哪种写法最符合 React 单向数据流？

- [ ] A. 子组件直接修改父组件传入的 `user.name`。
- [x] B. 父组件持有 state，把值传给子组件，子组件通过回调通知父组件更新。
- [ ] C. 子组件通过 DOM 查询找到父组件 state 并修改。
- [ ] D. 所有数据都放到 window 全局变量中，组件随便读写。

**解释**：props 应视为只读。子组件想改变数据，应通过 callback、dispatch 或 mutation 通知状态拥有者。

### Q2 multiple | 状态提升

哪些情况适合把状态提升到最近共同父组件？

- [x] A. 两个兄弟组件需要展示和修改同一份值。
- [x] B. 一个输入框变化会影响另一个组件的计算结果。
- [ ] C. 某个按钮 hover 状态只影响按钮自己。
- [x] D. 多个子组件各自复制一份状态后经常不同步。
- [ ] E. 所有组件的所有状态都必须提升到应用根节点。

**解释**：状态提升是为了解决共享和同步，不是把所有状态集中到最顶层。状态应放在离使用处最近且能满足共享的位置。

### Q3 multiple | 派生状态

关于派生状态，哪些判断正确？

- [x] A. 能从 props/state 计算出的值，通常不应再复制一份 state。
- [x] B. 昂贵计算可以用 `useMemo` 缓存，但源数据仍应清晰。
- [ ] C. 把派生值存进 state 一定能提升性能。
- [x] D. 重复存储会带来同步问题，例如源数据变了派生 state 忘记更新。
- [ ] E. 单向数据流意味着子组件不能有任何本地 state。

**解释**：单向数据流关注状态归属和更新路径。组件当然可以有本地 state，但不要无意义复制可推导数据。

## react-057

### Q1 single | useInsertionEffect 用途

`useInsertionEffect` 最典型的用途是什么？

- [ ] A. 在业务组件里发起网络请求。
- [ ] B. 读取元素尺寸并同步调整布局。
- [x] C. CSS-in-JS 库在 layout effect 前插入动态样式。
- [ ] D. 替代所有 `useEffect`，让副作用更早执行。

**解释**：它是给样式库作者的低层 Hook，解决样式插入顺序问题，不是通用业务副作用工具。

### Q2 multiple | 执行时机限制

关于 `useInsertionEffect`，哪些说法正确？

- [x] A. 它早于 `useLayoutEffect`，适合在布局读取前插入样式。
- [x] B. 不应该读取布局或依赖 ref，因为此阶段 DOM/ref 不适合作为稳定输入。
- [x] C. 不应该在其中调度 state 更新。
- [ ] D. 它在服务端渲染时会自动把样式插到 HTML 里。
- [ ] E. 它是“更快的 useLayoutEffect”，业务组件应优先使用。

**解释**：`useInsertionEffect` 的职责很窄。SSR 样式抽取、去重和缓存仍要由框架或 CSS-in-JS 库完成。

### Q3 single | 与 layout effect 区别

组件需要在 DOM 更新后读取元素宽度并同步设置位置，应该优先用什么？

- [ ] A. `useInsertionEffect`
- [x] B. `useLayoutEffect`
- [ ] C. `useId`
- [ ] D. 在 render 里读取 `getBoundingClientRect`

**解释**：布局读取属于 `useLayoutEffect` 场景。`useInsertionEffect` 不适合读布局或操作 ref。

## react-058

### Q1 single | 表格处理管线

客户端表格同时支持筛选、排序和分页时，一般更合理的数据处理顺序是什么？

- [ ] A. paginate -> sort -> filter
- [x] B. filter -> sort -> paginate
- [ ] C. sort -> paginate -> filter
- [ ] D. paginate -> filter -> sort

**解释**：用户通常期望在全量结果中筛选和排序，再对最终结果分页。先分页会导致只在当前页内筛选或排序，结果不符合预期。

### Q2 multiple | 通用表格 API

设计通用 React 表格组件时，哪些 API 或能力很关键？

- [x] A. `columns` 描述 header、accessor、cell、sortable/filter 等列能力。
- [x] B. `getRowId` 提供稳定业务 id，避免用 index 当 key。
- [x] C. 支持 controlled/manual 模式，把排序筛选分页交给服务端。
- [ ] D. 把所有单元格都强制渲染为字符串，禁止自定义 cell。
- [ ] E. 表格内部固定请求某个 URL，调用方不能接入已有数据源。

**解释**：通用表格的价值在于状态和渲染可组合。列定义、行 id、受控状态和服务端模式是核心扩展点。

### Q3 multiple | 表格可访问性与性能

哪些属于成熟表格组件需要考虑的问题？

- [x] A. 排序按钮可键盘操作，并用 `aria-sort` 表达当前排序状态。
- [x] B. loading、empty、error 状态要明确。
- [x] C. 大数据滚动可接虚拟列表，避免一次渲染过多 DOM。
- [ ] D. 排序状态只用颜色表示即可，不需要文本或 ARIA。
- [ ] E. 列配置每次 render 都创建新数组，对性能没有任何影响。

**解释**：表格常用于高密度数据操作。可访问性、状态反馈、列配置稳定性和虚拟滚动都会影响真实可用性。

## react-059

### Q1 single | React.memo 与 Context

一个组件用 `useContext(AuthContext)` 读取用户信息，即使用 `React.memo` 包裹，Provider value 变化时会怎样？

- [ ] A. `React.memo` 会阻止所有 Context 更新。
- [x] B. 只要该组件消费的 Context value 变化，它仍会重新渲染。
- [ ] C. Context 更新只影响 Provider，不影响 Consumer。
- [ ] D. 只有 props 变化才可能触发任何渲染。

**解释**：`React.memo` 比较的是 props。Context 变化是独立更新来源，Consumer 会响应它读取的 Context。

### Q2 multiple | 优化 Context

哪些方式可以降低 Context 造成的无关重渲染？

- [x] A. 用 `useMemo` 稳定 Provider 的对象 value，避免无关父组件渲染导致新引用。
- [x] B. 按职责和更新频率拆分多个 Context。
- [x] C. 拆分 state 和 dispatch Context，让只 dispatch 的组件不订阅 state。
- [ ] D. 把高频变化的所有字段塞进一个大 Context，减少 Provider 数量。
- [ ] E. Consumer 外层包一层 `React.memo` 就能解决所有 Context 性能问题。

**解释**：Context 适合低频、全局、配置类数据。高频细粒度订阅应考虑 selector 或外部 store。

### Q3 single | 何时不用 Context

下面哪个场景更不适合直接用一个巨大的 Context 管理？

- [ ] A. 全局主题色模式。
- [ ] B. 当前登录用户的低频基础信息。
- [x] C. 高频更新、组件只需要订阅其中小片段的实时数据。
- [ ] D. 国际化语言配置。

**解释**：内置 `useContext` 没有 selector。高频且细粒度的数据用巨大 Context 容易让大量消费者一起更新。

## react-060

### Q1 single | useOptimistic 适用场景

哪个交互更适合使用 `useOptimistic`？

- [ ] A. 支付扣款成功页，未确认前先显示支付完成。
- [x] B. 评论发送后先把临时评论显示为 sending，失败时回滚并提示重试。
- [ ] C. 渲染一个完全静态的标题。
- [ ] D. 在 render 阶段同步读取 localStorage。

**解释**：乐观 UI 适合失败成本较低、用户期望即时反馈的操作。高风险强一致操作不能只靠乐观成功表达。

### Q2 multiple | useOptimistic 模型

关于 `useOptimistic(state, updateFn)`，哪些说法正确？

- [x] A. `state` 是权威状态，最终应以服务端或父级传入数据为准。
- [x] B. `updateFn` 应是纯函数，根据当前临时状态和 optimistic value 计算新状态。
- [x] C. `addOptimistic` 会叠加临时状态，Action 完成后回到权威状态对应的结果。
- [ ] D. `updateFn` 里适合直接发请求和写 localStorage。
- [ ] E. `useOptimistic` 会把数据自动持久化到数据库。

**解释**：`useOptimistic` 管的是临时 UI 状态，不是数据落库。副作用仍在 Action、mutation 或数据层处理。

### Q3 multiple | 乐观更新工程细节

实现评论乐观发送时，哪些处理是合理的？

- [x] A. 临时评论使用临时 id，服务端成功后用真实 id 对齐权威数据。
- [x] B. 失败时展示错误、回滚到权威状态，并提供重试入口。
- [x] C. 权威数据回来后，以服务端结果或查询缓存为准。
- [ ] D. 成功前就永久移除失败处理，让用户以为一定成功。
- [ ] E. 乐观更新不需要考虑 key，因为 React 会自动匹配临时项和真实项。

**解释**：乐观 UI 是体验优化，不是事实来源。临时 id、失败回滚、真实数据替换和错误反馈都要设计清楚。

## react-061

### Q1 single | JSX 到 React Element

React 17+ 新 JSX transform 下，`<button className="primary">Save</button>` 通常会被编译成什么层面的东西？

- [ ] A. 浏览器能直接执行的原生 JSX 语法。
- [x] B. `jsx/jsxs` runtime 调用，创建描述 UI 的 React Element 普通对象。
- [ ] C. 立即创建并插入真实 DOM 节点。
- [ ] D. Fiber 节点本身，跳过 React Element。

**解释**：JSX 先变成 React Element，Element 是不可变描述对象。Fiber 是 React 后续协调时创建/复用的工作节点，DOM 修改要到 commit 阶段。

### Q2 multiple | 更新触发与 render 阶段

哪些更新源会进入 React 调度并触发新的 render/reconciliation 工作？

- [x] A. `setState` 或 `dispatch`。
- [x] B. Context Provider 的 value 变化。
- [x] C. 外部 store 通过 `useSyncExternalStore` 通知订阅者。
- [x] D. Suspense 数据就绪或 transition 中断后继续执行。
- [ ] E. 直接修改一个普通对象属性但没有通知 React。

**解释**：React 需要明确的更新入口才能调度工作。普通对象原地修改不会自动让 React 知道需要重新渲染。

### Q3 multiple | Commit 阶段顺序

关于 commit 阶段，哪些说法正确？

- [x] A. mutation 阶段会插入、删除、更新真实 DOM，并处理 ref detach。
- [x] B. layout 阶段 DOM 已更新、浏览器绘制前，适合 `useLayoutEffect` 读取布局。
- [x] C. passive effects 通常在提交后调度，执行 `useEffect` cleanup/setup。
- [ ] D. render 阶段可以安全修改 DOM，因为最终会被 commit 覆盖。
- [ ] E. commit 阶段像 render 阶段一样可以随意中断并丢弃。

**解释**：render 阶段应保持纯净，可被中断；commit 阶段把结果同步提交到宿主环境，不应被随意中断。

## react-062

### Q1 single | React 17 事件委托

React 17 以后，React 事件主要委托到哪里？

- [ ] A. 始终委托到 `document`，所有版本都一样。
- [x] B. 委托到 React root 容器，更利于多个 root 和渐进升级隔离。
- [ ] C. 每个 JSX 节点都独立绑定一个原生监听器。
- [ ] D. 委托到 `window.localStorage`。

**解释**：React 17 调整了事件委托位置。这样不同 React root 的事件边界更清楚，也便于混合不同版本或渐进迁移。

### Q2 multiple | SyntheticEvent 细节

关于 React 合成事件，哪些说法正确？

- [x] A. 事件名使用驼峰，例如 `onClick`、`onClickCapture`。
- [x] B. `event.target` 是真实触发事件的元素，`event.currentTarget` 是当前绑定 handler 的元素。
- [x] C. React 17+ 不再池化事件对象，异步读取字段通常不需要 `event.persist()`。
- [ ] D. 在 handler 中 `return false` 会自动阻止默认行为和冒泡。
- [ ] E. 合成事件没有 `nativeEvent`，无法访问原生事件。

**解释**：阻止默认行为和传播要显式调用 `preventDefault`/`stopPropagation`。`nativeEvent` 仍可访问原生事件对象。

### Q3 multiple | 原生事件混用

React 合成事件和原生事件混用时，哪些判断合理？

- [x] A. 原生监听器如果在事件到达 React root 前阻止传播，React 合成事件可能收不到。
- [x] B. Portal 中的合成事件会按 React 组件树冒泡，不完全等同于 DOM 树。
- [x] C. 原生 `addEventListener` 要在 cleanup 中移除，避免泄漏和重复绑定。
- [ ] D. 原生事件和合成事件永远按完全相同顺序执行。
- [ ] E. `onScroll` 在 React 17+ 中仍像多数事件一样冒泡。

**解释**：混用时要明确传播路径和监听位置。Portal 和 root 委托会让 React 事件路径与纯 DOM 路径出现差异。

## react-063

### Q1 single | Transition + Suspense 旧 UI

Tab 切换被 `startTransition` 包住，新 Tab 内容在 Suspense 中挂起，且旧 Tab 已经显示。React 通常会怎样处理？

- [ ] A. 立即清空旧 UI，只显示 fallback。
- [x] B. 尽量保留旧 UI，并用 `isPending` 之类状态给轻量反馈，等新内容准备好再切换。
- [ ] C. 阻塞所有输入，直到请求完成。
- [ ] D. 自动取消这次 Tab 切换。

**解释**：Transition 把更新标记为非紧急。配合 Suspense 时，React 可以避免已经显示的内容闪回大块 fallback。

### Q2 multiple | Suspense 数据源

哪些说法符合 Suspense 与数据加载的真实边界？

- [x] A. 普通 `useEffect` 请求不会自动让组件 Suspense。
- [x] B. Suspense 数据源通常来自框架、Relay、React Query suspense API 或资源封装。
- [x] C. 初次加载没有旧 UI 可保留时，仍可能显示 fallback。
- [ ] D. 只要组件里有 Promise，React 就会自动捕获并展示 fallback。
- [ ] E. Suspense 可以替代所有错误处理，不需要 Error Boundary。

**解释**：Suspense 依赖“渲染时挂起”的数据源协议。错误仍应由 Error Boundary 或数据层错误状态处理。

### Q3 multiple | Transition 注意事项

使用 `useTransition/startTransition` 时，哪些注意事项正确？

- [x] A. 受控输入的 value 更新不应放进 Transition，否则输入会滞后。
- [x] B. `await` 之后的更新如果仍要保持 Transition 标记，需要再次包 `startTransition`。
- [x] C. 粗粒度 Suspense fallback 可能造成整块 UI 闪烁，应拆分边界。
- [ ] D. 所有状态更新都应该放进 Transition。
- [ ] E. `isPending` 表示网络请求一定正在进行。

**解释**：Transition 是更新优先级标记，不等同于网络状态。紧急输入更新要保持同步，异步边界也要小心设计。

## react-064

### Q1 single | 优化前提

遇到“子组件经常重渲染”，最稳妥的第一步是什么？

- [ ] A. 立刻给所有组件加 `React.memo`。
- [ ] B. 把所有函数都包上 `useCallback`。
- [x] C. 用 React DevTools Profiler 等工具确认瓶颈和实际渲染成本。
- [ ] D. 把所有 state 都提升到根组件。

**解释**：很多重渲染成本很低。先测量再优化，才能避免把代码复杂度花在非瓶颈上。

### Q2 multiple | memo/useCallback 边界

关于 `React.memo`、`useCallback` 和 `useMemo`，哪些说法正确？

- [x] A. `React.memo` 默认浅比较 props，props 引用稳定才更容易跳过渲染。
- [x] B. `useCallback` 常在传给 memo 子组件的函数 props 上才更有价值。
- [x] C. 子组件自身 state 或消费的 Context 变化，仍会触发渲染。
- [ ] D. `useCallback` 可以阻止函数内部读取到陈旧闭包。
- [ ] E. `React.memo` 能阻止所有外部 store selector 变化带来的渲染。

**解释**：memo 只处理 props 比较。闭包新旧、Context 更新、store 订阅和本地 state 都是不同问题。

### Q3 multiple | 减少无关重渲染

哪些方式通常能有效降低无关重渲染？

- [x] A. 把局部状态下沉到真正需要的最小子树。
- [x] B. 拆分大 Context，或使用带 selector 的外部 store。
- [x] C. 大列表使用稳定 key、行组件 memo 和虚拟滚动。
- [ ] D. 在父组件每次 render 时创建新的对象 props，再期待 memo 跳过。
- [ ] E. 所有派生数据都存成 state，避免计算。

**解释**：优化通常从状态归属、订阅粒度和列表规模入手。memo 是工具，不是替代架构边界的魔法。

## react-065

### Q1 single | Hooks 顺序

为什么 Hook 不能写在条件分支里？

- [ ] A. JavaScript 语法不允许在 if 里调用函数。
- [x] B. React 按调用顺序在 Fiber 的 Hook 链表中匹配状态，条件调用会破坏顺序。
- [ ] C. Hook 必须和变量名一一对应，条件分支会改变量名。
- [ ] D. 只有 `useEffect` 不能写在条件里，`useState` 可以。

**解释**：Hooks 不是按变量名保存，而是按“第几个 Hook”匹配。顺序不稳定会让状态和 effect 对错位置。

### Q2 multiple | Hook 节点与状态

关于 Fiber 上的 Hook 链表，哪些说法正确？

- [x] A. 函数组件 Fiber 的 `memoizedState` 可以指向 Hook 链表头节点。
- [x] B. `useState/useReducer` 的 Hook 节点会保存当前 state 和更新队列相关信息。
- [x] C. `useMemo/useCallback` 会保存缓存值和依赖数组。
- [ ] D. React 根据 Hook 变量名查找上一次 state。
- [ ] E. 每次 render 都会丢弃所有 Hook 状态，重新从初始值开始。

**解释**：不同 Hook 的 `memoizedState` 含义不同，但都依赖稳定的链表顺序和 Fiber 关联来复用状态。

### Q3 multiple | useEffect 与闭包

关于 Hooks 底层行为，哪些判断合理？

- [x] A. `useEffect` 在 render 阶段登记 effect，cleanup/setup 在 commit 后的 passive effects 阶段执行。
- [x] B. 依赖数组比较使用类似 `Object.is` 的语义。
- [x] C. 事件处理器会捕获创建它那次 render 中的变量，异步回调可能读到旧值。
- [ ] D. 只要使用 `useCallback`，异步回调就一定能读到最新 state。
- [ ] E. effect 依赖数组为空时，里面读取的 props/state 会自动保持最新。

**解释**：每次 render 都是新的函数调用。解决陈旧闭包要用函数式更新、ref、正确依赖或专门的事件封装，而不是盲目省依赖。
