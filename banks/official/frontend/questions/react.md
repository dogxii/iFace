# React

<!-- id: react-001; difficulty: 1; tags: useState, Hooks, 状态管理; source: 高频 -->
# React 中 useState 的用法和注意事项

## useState

`useState` 用来给函数组件保存本地状态。调用 setter 后，React 会安排下一次渲染；当前这次渲染里的变量不会立刻变。

```tsx
const [count, setCount] = useState(0)
const [user, setUser] = useState(() => ({ name: '', age: 0 }))
```

### 函数式更新
如果新状态依赖旧状态，用函数式更新，避免同一事件批处理中读到旧闭包值。

```tsx
setCount(count + 1)
setCount(count + 1) // 结果通常只 +1，因为两次都基于本次渲染的 count

setCount((prev) => prev + 1)
setCount((prev) => prev + 1) // 正确累加 +2
```

### 不要直接修改对象/数组
React 使用引用判断状态是否变化，直接改原对象再返回同一引用会导致更新不可靠。

```tsx
// 错误
setUser((prev) => {
  prev.name = 'Alice'
  return prev
})

// 正确
setUser((prev) => ({ ...prev, name: 'Alice' }))
setList((prev) => prev.filter((item) => item.id !== id))
```

复杂嵌套更新可以考虑 Immer 或把状态拆小。

### 惰性初始化
```tsx
const [data] = useState(() => expensiveCompute())
```

初始化函数只用于初始渲染；开发 Strict Mode 下 React 可能调用两次来检查纯函数，所以 initializer 必须无副作用。

### 选择原则
- UI 局部、简单状态：`useState`
- 多字段联动、状态转移复杂：`useReducer`
- 服务端数据缓存：TanStack Query/SWR，不要手写一堆 loading/error/data state
- 能从 props/state 推导出的值不要再存一份，避免状态不同步

<!-- id: react-002; difficulty: 1; tags: useEffect, Hooks, 副作用, 生命周期; source: 高频 -->
# useEffect 的用法、依赖项和清理函数

## useEffect

`useEffect` 用来把组件和外部系统同步，例如 DOM API、订阅、定时器、网络连接、第三方组件。它不是用来推导渲染数据的工具；能在 render/useMemo 中算出的值不要放 Effect 里再 setState。

```tsx
useEffect(() => {
  const subscription = source.subscribe(handleChange)
  return () => subscription.unsubscribe()
}, [source])
```

### 依赖项
```tsx
useEffect(() => {
  console.log('after every render')
})

useEffect(() => {
  connect()
  return disconnect
}, [])

useEffect(() => {
  document.title = `Count: ${count}`
}, [count])
```

依赖数组必须包含 Effect 中读取的响应式值：props、state、组件内声明的变量和函数。不要为了“只执行一次”故意漏依赖；应该重构代码、把非响应式逻辑移出组件，或让函数引用稳定。

### 清理函数
清理函数会在组件卸载前执行，也会在依赖变化导致下一次 setup 前执行。

```tsx
useEffect(() => {
  const controller = new AbortController()

  fetch(`/api/users/${userId}`, { signal: controller.signal })
    .then((res) => res.json())
    .then(setUser)
    .catch((error) => {
      if (error.name !== 'AbortError') setError(error)
    })

  return () => controller.abort()
}, [userId])
```

### Strict Mode
开发 Strict Mode 下，React 会额外执行一次 setup -> cleanup -> setup，用来发现清理不完整的问题。所以 Effect 必须可重复执行，不能依赖“只挂载一次”的副作用假设。

### 常见误区
- 数据请求可以写在 Effect，但复杂缓存、重试、去重更适合 TanStack Query/SWR
- 事件处理逻辑优先放在事件回调中，不要通过 Effect 监听某个 state 再触发动作
- 视觉测量或同步布局修改用 `useLayoutEffect`，普通副作用用 `useEffect`
- Effect 不会在服务端渲染期间执行

<!-- id: react-003; difficulty: 1; tags: useRef, Hooks, DOM; source: 高频 -->
# useRef 的用法和应用场景

## useRef

`useRef` 返回一个稳定对象 `{ current }`。修改 `ref.current` 不会触发重新渲染，适合保存不参与 UI 渲染的可变值，或访问 DOM/组件实例。

```tsx
const inputRef = useRef<HTMLInputElement | null>(null)
```

### 访问 DOM
```tsx
function SearchInput() {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return <input ref={inputRef} />
}
```

### 保存定时器或外部实例
```tsx
function Timer() {
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    timerRef.current = window.setInterval(tick, 1000)
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
    }
  }, [])

  return null
}
```

### 保存上一次值
```tsx
function usePrevious<T>(value: T) {
  const ref = useRef<T | undefined>(undefined)
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current
}
```

### 保存最新 callback
```tsx
function useLatest<T>(value: T) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref
}
```

这种模式常用于事件监听器或定时器中读取最新值，同时避免反复解绑绑定。

### 注意事项
- 不要把用于渲染的状态放进 ref，否则 UI 不会更新
- 不要在渲染过程中随意读写 ref；React 期望组件渲染是纯的。惰性初始化这类稳定写入例外可以接受
- DOM ref 在提交后才有值，首次 render 时通常是 `null`
- 需要把 ref 透传给子组件时使用 `forwardRef`，React 19 中也可以按新版 ref 传递能力设计组件 API

| 对比 | useRef | useState |
|--|--|--|
| 修改后是否渲染 | 否 | 是 |
| 适合 | DOM、计时器、外部实例、最新值 | 影响 UI 的状态 |

<!-- id: react-004; difficulty: 1; tags: useMemo, useCallback, 性能优化, Hooks; source: 高频 -->
# useMemo 和 useCallback 的区别及使用时机

## useMemo 和 useCallback

`useMemo` 缓存计算结果，`useCallback` 缓存函数引用。二者都是性能优化工具，不应该用来修正业务逻辑。React 可以丢弃 memo 缓存重新计算，所以代码必须在没有 memo 时也正确。

### useMemo
```tsx
const visibleItems = useMemo(() => {
  return items.filter((item) => item.active).sort((a, b) => a.name.localeCompare(b.name))
}, [items])
```

适合昂贵计算、传给 memo 子组件的对象/数组、作为其他 Hook 依赖且需要稳定引用的值。

### useCallback
```tsx
const handleDelete = useCallback((id: string) => {
  dispatch({ type: 'delete', id })
}, [dispatch])
```

`useCallback(fn, deps)` 基本等价于 `useMemo(() => fn, deps)`。它的价值通常体现在：函数传给 `memo` 子组件、作为自定义 Hook 的稳定回调、或避免 Effect 因函数引用变化反复执行。

### 不要过度使用
```tsx
// 没必要：计算很便宜
const total = useMemo(() => a + b, [a, b])

// 没必要：子组件没有 memo，稳定函数引用也阻止不了父子渲染
const onClick = useCallback(() => setCount((count) => count + 1), [])

// 有意义：大列表排序，并传给 memo 子组件
const sorted = useMemo(() => sortLargeList(list), [list])
```

### 注意点
- 依赖项必须完整，否则会产生 stale closure
- memo 本身也有成本，简单计算不值得缓存
- 如果每次都创建新对象作为依赖，memo 会失效
- `React.memo`、`useMemo`、`useCallback` 要配套看，单独使用常常没有收益
- 启用 React Compiler 的项目中，很多手写 memoization 可以减少，但外部库边界和明确性能瓶颈仍可能需要手动控制

<!-- id: react-005; difficulty: 1; tags: useContext, Context, 状态管理, Hooks; source: 高频 -->
# useContext 的用法和注意事项

## useContext

`useContext` 用来读取距离当前组件最近的 Context 值，适合主题、语言、当前用户、权限、依赖注入这类跨层级但变化不太频繁的数据。

```tsx
type ThemeContextValue = {
  theme: 'light' | 'dark'
  setTheme: React.Dispatch<React.SetStateAction<'light' | 'dark'>>
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const value = useMemo(() => ({ theme, setTheme }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside ThemeProvider')
  return value
}
```

React 19 支持更简洁的 provider 写法，项目也可以继续使用 `.Provider`，关键是团队保持一致。

### 使用
```tsx
function ThemeButton() {
  const { theme, setTheme } = useTheme()
  return <button onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}>{theme}</button>
}
```

### 性能注意
Context value 变化时，所有消费这个 Context 的组件都会重新渲染。优化方式：
- Provider 的 `value` 用 `useMemo` 稳定对象引用
- 把 state 和 dispatch 拆成两个 Context，减少只用 dispatch 的组件重渲染
- 按领域拆分 Context，不要把整个应用状态塞进一个大 Context
- 高频变化状态不要用 Context 广播，考虑外部 store、selector 或局部 state

Context 是依赖传递工具，不是通用状态管理银弹。服务端缓存、表单状态、动画状态、大列表选择状态都应该分别选择更合适的工具。

<!-- id: react-006; difficulty: 1; tags: 生命周期, 类组件, Hooks; source: 高频 -->
# React 组件的生命周期（类组件 vs 函数组件）

## React 生命周期

类组件生命周期围绕 mount、update、unmount；函数组件不再逐个映射生命周期，而是用 Hook 描述“渲染后需要同步的副作用”。

### 类组件
```tsx
class Page extends React.Component<Props, State> {
  state = { count: 0 }

  componentDidMount() {
    subscribe()
  }

  shouldComponentUpdate(nextProps: Props, nextState: State) {
    return nextProps.id !== this.props.id || nextState.count !== this.state.count
  }

  getSnapshotBeforeUpdate(prevProps: Props) {
    return prevProps.id !== this.props.id ? getScrollTop() : null
  }

  componentDidUpdate(prevProps: Props, _prevState: State, snapshot: number | null) {
    if (snapshot !== null) restoreScroll(snapshot)
  }

  componentWillUnmount() {
    unsubscribe()
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    report(error, info)
  }
}
```

`getDerivedStateFromProps` 很少需要，用不好会造成 props/state 双源数据不同步。错误边界目前仍通常用类组件或第三方封装。

### 函数组件对应思路
```tsx
useEffect(() => {
  subscribe(id)
  return () => unsubscribe(id)
}, [id])

useLayoutEffect(() => {
  const snapshot = measureBeforePaint()
  return () => cleanup(snapshot)
}, [dep])
```

- mount/update 后同步外部系统：`useEffect`
- 需要在浏览器绘制前测量 DOM 或同步布局：`useLayoutEffect`
- 阻止无意义重渲染：`memo`、`useMemo`、`useCallback`，而不是 `shouldComponentUpdate`
- 卸载清理：Effect 返回 cleanup

### render 与 commit
React 会先 render 计算 UI，再 commit 更新 DOM，然后运行 Effect。并发渲染下 render 阶段可能被中断或重做，所以渲染函数必须纯净，不应在 render 中发请求、订阅或改 DOM。

<!-- id: react-007; difficulty: 1; tags: 受控组件, 非受控组件, 表单, ref; source: 高频 -->
# React 中的受控组件和非受控组件

## 受控组件和非受控组件

受控组件的表单值由 React state 决定；非受控组件的值由 DOM 自己维护，React 只设置初始值或通过 ref 读取。

### 受控组件
```tsx
function ControlledInput() {
  const [value, setValue] = useState('')

  return <input value={value} onChange={(event) => setValue(event.target.value)} />
}
```

优点是实时校验、格式化、联动 UI、提交前状态可预测。缺点是大量字段高频输入时可能带来渲染成本，需要拆分组件、debounce 或表单库优化。

### 非受控组件
```tsx
function UncontrolledForm() {
  const inputRef = useRef<HTMLInputElement | null>(null)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    console.log(inputRef.current?.value)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input ref={inputRef} defaultValue='initial' />
      <button type='submit'>Submit</button>
    </form>
  )
}
```

`defaultValue` 只设置初始值，后续 DOM 值不受 React 控制。文件上传 `<input type='file'>` 只能是非受控，文件列表通过 DOM API 读取。

### 注意事项
- 同一个 input 不要在受控和非受控之间切换，例如一会儿 `value={undefined}`，一会儿 `value='x'`
- 受控 input 必须有 `onChange`，否则会变成只读
- checkbox/radio 用 `checked/defaultChecked`，文本输入用 `value/defaultValue`
- 复杂表单可用 React Hook Form 这类库，它常通过非受控方式减少重渲染，同时提供校验和提交状态

| 对比 | 受控 | 非受控 |
|--|--|--|
| 数据源 | React state | DOM |
| 实时校验 | 方便 | 需要提交或 ref 读取 |
| 性能 | 字段多时要优化 | 输入过程重渲染少 |
| 文件上传 | 不适合 | 必须使用 |

<!-- id: react-008; difficulty: 1; tags: key, 列表渲染, Diff算法; source: 高频 -->
# React 中的 key 的作用，为什么不能用 index 作为 key？

## React key 的作用

`key` 是 React 在同级列表中识别元素身份的标识。它帮助 React 判断某个组件是“同一个实例更新”还是“旧实例卸载、新实例挂载”，从而保留或重置组件状态。

```tsx
{items.map((item) => <TodoItem key={item.id} item={item} />)}
```

### 为什么不推荐 index
```tsx
{list.map((name, index) => <input key={index} defaultValue={name} />)}
```

如果在头部插入一项，原来的 `key=0` 会从 Apple 变成 Date，`key=1` 从 Banana 变成 Apple。React 会复用错误的组件实例和 DOM 节点，非受控 input、本地 state、动画状态都可能错位。

### 什么时候可以用 index
同时满足这些条件才可以：
- 列表完全静态
- 不会排序、过滤、插入、删除
- 列表项没有本地状态、ref、非受控输入或动画状态

只要列表来自后端数据，优先使用稳定业务 id。不要用 `Math.random()` 或每次生成的新 uuid 当 key，否则每次渲染都会强制卸载重建，状态丢失且性能变差。

### key 的其他用途
改变 key 可以主动重置组件状态：
```tsx
<ProfileForm key={userId} userId={userId} />
```

`userId` 变化时，`ProfileForm` 会重新挂载，表单本地状态被清空。这是处理“切换对象后重置局部状态”的常用手段。

<!-- id: react-009; difficulty: 1; tags: React.memo, 性能优化, 重渲染; source: 高频 -->
# 什么是 React.memo，什么时候使用？

## React.memo

`React.memo` 用来记忆组件渲染结果：父组件重渲染时，如果 memo 组件的 props 与上次浅比较相同，React 可以跳过这次子组件渲染。

```tsx
const UserCard = memo(function UserCard({ user, onSelect }: Props) {
  return <button onClick={() => onSelect(user.id)}>{user.name}</button>
})
```

默认比较使用 `Object.is` 浅比较 props。对象、数组、函数如果每次 render 都新建，就会让 memo 失效。

### 配合 useMemo/useCallback
```tsx
function Parent({ user }: { user: User }) {
  const onSelect = useCallback((id: string) => selectUser(id), [])
  const displayUser = useMemo(() => ({ id: user.id, name: user.name }), [user.id, user.name])

  return <UserCard user={displayUser} onSelect={onSelect} />
}
```

### 自定义比较
```tsx
const MemoList = memo(List, (prev, next) => {
  return prev.items.length === next.items.length && prev.items.every((item, index) => item.id === next.items[index].id)
})
```

自定义比较返回 `true` 表示跳过渲染。它必须比较所有会影响渲染的 props，包括函数；漏比较容易产生 stale props/stale closure。深比较通常很贵，可能比重新渲染更慢。

### 仍会重渲染的情况
- 组件自己的 state 变化
- 组件读取的 context 变化
- props 浅比较不同
- React 为了内部原因选择重新渲染

### 使用时机
用 React Profiler 证明组件渲染成本高、且经常收到相同 props 时再加。简单组件、props 总是变化的组件、还没测量的性能问题，不要机械套 memo。启用 React Compiler 的项目中，很多场景可以减少手写 memo。

<!-- id: react-010; difficulty: 1; tags: 虚拟DOM, Diff算法, 性能; source: 高频 -->
# React 的虚拟 DOM（Virtual DOM）是什么？有什么优缺点？

## Virtual DOM

Virtual DOM 通常指 React element/Fiber 这类内存中的 UI 描述。JSX 会被编译成创建 React element 的调用，React 再根据这些描述进行 reconciliation，最终在 commit 阶段更新真实宿主环境。

```tsx
const element = <div className='app'><h1>Hello</h1></div>
```

可以近似理解为：
```js
{
  type: 'div',
  props: {
    className: 'app',
    children: { type: 'h1', props: { children: 'Hello' } },
  },
}
```

### 工作流程
```text
state/props 变化
  -> 重新执行组件，得到新的 element tree
  -> reconciliation 比较新旧树，生成 Fiber 更新
  -> commit 阶段把必要变更应用到 DOM/Native
  -> 运行 layout/effect 等副作用
```

React 的 diff 是基于启发式规则，不保证数学意义上的最小变更集。`type` 不同会重建子树；同级列表用 `key` 判断身份。

### 优点
- 声明式：开发者描述 UI 应该是什么，React 负责更新过程
- 跨平台：同一模型可渲染到 DOM、Native、SSR、测试环境
- 调度能力：Fiber 让 React 能拆分、暂停、恢复渲染工作
- 批处理：把多次状态更新合并，减少无意义 DOM 操作

### 缺点
- 有内存和 diff 计算开销
- 首次渲染并不会因为 Virtual DOM 天然更快
- 对超大列表、频繁动画、Canvas 场景不一定合适，需要虚拟滚动或命令式绘制
- 直接 DOM 操作可能绕过 React，造成状态和真实 DOM 不一致

结论：Virtual DOM 的核心价值不是“永远比 DOM 快”，而是在可维护的声明式模型下提供足够好的性能和跨平台抽象。

<!-- id: react-011; difficulty: 1; tags: JSX, React基础, 编译; source: 高频 -->
# JSX 是什么？它是如何工作的？

## JSX

JSX 是 JavaScript 的语法扩展，用来声明 UI 结构。它不是 HTML 字符串，也不会直接进入浏览器；构建工具会把 JSX 编译成 React element 创建调用。

### 编译过程
```tsx
const element = <h1 className='title'>Hello, {name}</h1>
```

旧转换大致是：
```tsx
const element = React.createElement('h1', { className: 'title' }, 'Hello, ', name)
```

React 17+ 的新 JSX Transform 会从 `react/jsx-runtime` 引入运行时函数，因此文件里不必为了 JSX 单独 `import React`：
```tsx
import { jsx as _jsx } from 'react/jsx-runtime'

const element = _jsx('h1', { className: 'title', children: ['Hello, ', name] })
```

### 规则
- 组件必须返回一个根节点，可以用 Fragment `<>...</>` 包裹
- 标签必须闭合，`<img />`、`<input />` 不能省略闭合
- DOM 属性多用驼峰：`className`、`htmlFor`、`tabIndex`、`onClick`
- `{}` 中写 JavaScript 表达式，不写语句；`if` 要放到外面或用三元表达式
- `style` 是对象，属性名用驼峰，数值单位按 React 规则处理
- 自定义组件必须大写开头，否则会被当成原生标签

### 条件和列表
```tsx
return (
  <section>
    {isLoading ? <Spinner /> : <Content />}
    {items.map((item) => <Item key={item.id} item={item} />)}
  </section>
)
```

注意 `0 && <A />` 会渲染出 `0`，需要写成 `Boolean(count) && <A />` 或三元。列表必须使用稳定 key，不能随便用随机值。

<!-- id: react-012; difficulty: 1; tags: Props, PropTypes, TypeScript, React基础; source: 高频 -->
# 什么是 React 的 Props？如何进行 Props 类型验证？

## Props

Props 是父组件传给子组件的只读输入。组件应该把 props 当作不可变数据，不要在子组件里修改 props 对象本身。

```tsx
<Button variant='primary' size='large' disabled onClick={handleClick}>Save</Button>
```

```tsx
type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  children: React.ReactNode
}

function Button({ variant = 'primary', size = 'medium', disabled = false, onClick, children }: ButtonProps) {
  return (
    <button className={`btn btn-${variant} btn-${size}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}
```

### 类型验证
TypeScript 是现代 React 项目的首选，可以在编译期约束 props、事件类型、children 和组件泛型。公共 JS 组件库或运行时边界仍可使用 PropTypes 或 Zod 这类运行时校验。

```tsx
import PropTypes from 'prop-types'

UserCard.propTypes = {
  name: PropTypes.string.isRequired,
  age: PropTypes.number,
  roles: PropTypes.arrayOf(PropTypes.string),
  children: PropTypes.node,
  as: PropTypes.elementType,
}
```

### 默认值
函数组件优先使用参数默认值：
```tsx
function Avatar({ size = 40, src }: { size?: number; src: string }) {}
```

`defaultProps` 在函数组件里不再是推荐写法；类组件或老代码中仍可能看到。

### 注意事项
- props 变化会触发子组件重新渲染，但是否更新 DOM 由 React reconciliation 决定
- 回调函数、对象、数组作为 props 时要关注引用稳定性
- 组件需要透传原生属性时可继承 `React.ComponentProps<'button'>`
- render props 本质是把函数作为 props 传递，用于让父组件控制渲染逻辑

<!-- id: react-013; difficulty: 2; tags: Fiber, 架构, 调度, 协调; source: 高频 -->
# React Fiber 架构的原理和设计目标

## React Fiber 架构

Fiber 是 React 的协调器数据结构和执行模型。它把组件树拆成可遍历、可暂停、可恢复、可设置优先级的工作单元，为并发渲染、Suspense、过渡更新等能力打基础。

### 为什么需要 Fiber
旧的 Stack Reconciler 通过递归同步遍历组件树，一旦开始更新就难以中断。大树更新可能长时间占用主线程，导致输入和动画卡顿。Fiber 把递归调用栈改造成显式链表结构，使 React 可以分片处理工作。

### Fiber 节点
每个组件或宿主节点大致对应一个 Fiber，常见指针包括：
```text
return    指向父 Fiber
child     指向第一个子 Fiber
sibling   指向下一个兄弟 Fiber
alternate 指向 current/workInProgress 的另一棵树
```

Fiber 节点还保存 pending props、memoized state、effect flags、lanes 等信息，用于描述更新、优先级和副作用。

### 两个阶段
Render 阶段：
- 计算新的 workInProgress 树
- 执行组件函数，做 reconciliation
- 标记需要新增、更新、删除的副作用
- 可被更高优先级任务中断或重做

Commit 阶段：
- 把变更同步提交到 DOM/宿主环境
- 执行 ref、layout effect、passive effect 调度等
- 不可中断，必须尽快完成

### 调度和优先级
现代 React 使用 lanes 表示更新优先级和批次，不是简单的五档枚举。用户输入、同步更新、transition、idle 等更新会进入不同 lane，React 根据优先级决定先处理谁。

不要把 Fiber 简化成 `requestIdleCallback` 实现。React 有自己的 Scheduler，会结合 MessageChannel、时间切片和优先级调度；核心思想是让 render 阶段可中断，而 commit 阶段保持一致性。

### 双缓冲
屏幕上展示的是 current tree，正在计算的是 workInProgress tree。计算完成并 commit 后，两棵树切换角色。这样 React 可以在不破坏当前 UI 的情况下准备下一版 UI。

<!-- id: react-014; difficulty: 2; tags: Diff算法, Reconciliation, 性能; source: 高频 -->
# React 的 Diff 算法原理

## React Diff / Reconciliation

React 不做任意两棵树的最优编辑距离计算，而是基于 UI 的常见规律做启发式 diff，把复杂度控制在接近 O(n)。核心规则是 type、key 和同级比较。

### 基本规则
- 元素 type 不同：卸载旧子树，创建新子树，例如 `<div>` 变 `<span>`
- 元素 type 相同：复用节点，更新 props，并继续比较 children
- 组件 type 相同：复用组件实例/Fiber，保留 state
- 同级列表用 key 判断身份，key 变了就视为不同实例

```tsx
{items.map((item) => <Row key={item.id} item={item} />)}
```

### 单节点
新旧节点 key 和 type 都相同则复用；否则删除旧节点并创建新节点。复用意味着组件 state、DOM 节点和 ref 可能保留。

### 多节点列表
React 会先从左到右快速匹配相同位置的节点；遇到不匹配后，把剩余旧节点按 key 或 index 建表，再遍历新节点查找可复用项。`lastPlacedIndex` 用于判断节点是否需要移动。

```text
旧: A(0) B(1) C(2) D(3)
新: A    C    B    E
```

A 可复用且位置不动；C 旧位置 2，不需要移动；B 旧位置 1 小于 lastPlacedIndex 2，需要移动；E 新增；D 删除。

### key 的意义
key 不是为了消除 warning，而是为了告诉 React “这个列表项跨渲染的身份是什么”。稳定 key 可以保留正确状态；错误 key 会导致状态错位或频繁卸载重建。

### 注意
React 计算的是需要提交的 effect flags，不承诺生成绝对最小 DOM 操作。实际性能还取决于组件渲染成本、列表规模、memo、状态设计和浏览器布局绘制成本。

<!-- id: react-015; difficulty: 2; tags: React 18, 并发, useTransition, useDeferredValue; source: 高频 -->
# React 18 的并发特性有哪些？

## React 18 并发特性

React 18 通过 `createRoot` 启用新的并发能力。并发不是多线程，而是 React 可以把 render 工作拆分、暂停、继续或丢弃，让高优先级交互先响应。commit 阶段仍然是同步提交。

```tsx
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')!).render(<App />)
```

### 自动批处理
React 18 会在更多场景批处理 state 更新，包括 Promise、setTimeout、原生事件等。

```tsx
setTimeout(() => {
  setCount((count) => count + 1)
  setVisible((visible) => !visible)
  // 通常只触发一次渲染
})
```

需要立即读取 DOM 更新结果时才谨慎使用 `flushSync`。

### useTransition
`useTransition` 把某些 state 更新标记为低优先级过渡更新。

```tsx
const [query, setQuery] = useState('')
const [isPending, startTransition] = useTransition()

function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
  const nextQuery = event.target.value
  setQuery(nextQuery)
  startTransition(() => {
    setSearchQuery(nextQuery)
  })
}
```

不要把昂贵同步计算直接放进 `startTransition` 里期待它不上主线程；计算仍会执行。正确做法是让低优先级 state 驱动列表渲染，必要时配合 memo、虚拟列表或 Worker。

### useDeferredValue
```tsx
const deferredQuery = useDeferredValue(query)
const results = useMemo(() => search(items, deferredQuery), [items, deferredQuery])
```

输入框先响应最新 `query`，列表可以滞后使用 `deferredQuery`。适合父组件无法控制更新源、但子树渲染昂贵的场景。

### Suspense 和流式 SSR
React 18 改进了 Suspense 在服务端渲染和 hydration 中的能力：服务端可以流式发送 HTML，客户端可以选择性 hydration。数据框架会在此基础上封装路由级加载、错误边界和缓存。

### 其他相关能力
- `useId`：生成 SSR/CSR 一致的稳定 id
- `startTransition`：也可以作为函数在组件外标记过渡更新
- 严格模式开发下会做更多重复调用检查，帮助发现不纯渲染和不完整清理

并发能力提升的是响应性和调度，不会自动让所有组件变快；渲染量、计算量和数据结构仍然要优化。

<!-- id: react-016; difficulty: 2; tags: useReducer, 状态管理, Hooks; source: 高频 -->
# useReducer 的用法及与 useState 的区别

## useReducer

`useReducer` 适合状态转移复杂、多个字段相互关联、更新来源多的组件。它把“根据 action 计算下一个 state”的逻辑收敛到一个纯函数里。

```tsx
const [state, dispatch] = useReducer(reducer, initialState)
```

### 示例
```tsx
type CartItem = { id: string; price: number; quantity: number }
type State = { items: CartItem[] }
type Action =
  | { type: 'add'; item: CartItem }
  | { type: 'remove'; id: string }
  | { type: 'clear' }

const initialState: State = { items: [] }

function cartReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add':
      return { ...state, items: [...state.items, action.item] }
    case 'remove':
      return { ...state, items: state.items.filter((item) => item.id !== action.id) }
    case 'clear':
      return initialState
    default:
      return state
  }
}

function Cart() {
  const [cart, dispatch] = useReducer(cartReducer, initialState)
  const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return <button onClick={() => dispatch({ type: 'clear' })}>Total: {total}</button>
}
```

`total` 能从 `items` 推导出来，通常不要同时存一份，避免增删改数量时维护不同步。

### 与 useState 对比
| 维度 | useState | useReducer |
|--|--|--|
| 适用 | 简单、独立状态 | 复杂状态机、多字段联动 |
| 更新方式 | setter 直接给值或 updater | dispatch 描述事件 |
| 逻辑位置 | 分散在多个回调中 | 集中在 reducer |
| 可测试性 | 一般 | reducer 纯函数易测 |

### 注意事项
- reducer 必须纯净，不要在里面请求接口、生成随机数或修改外部变量
- state 仍要不可变更新，不要直接 push/splice 原对象
- `dispatch` 引用稳定，可以安全传给子组件或 Context
- 初始状态计算昂贵时可用第三个参数 lazy initializer

```tsx
const [state, dispatch] = useReducer(reducer, props, createInitialState)
```

配合 Context 时建议拆成 StateContext 和 DispatchContext，减少只派发 action 的组件重渲染。

<!-- id: react-017; difficulty: 2; tags: 代码分割, 懒加载, Suspense, 性能优化; source: 高频 -->
# React 中如何实现代码分割和懒加载？

## React 代码分割和懒加载

代码分割的目标是减少首屏 JS，把低频页面、重型组件和大型第三方库延后加载。构建工具通过动态 `import()` 生成独立 chunk。

### React.lazy + Suspense
```tsx
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./pages/Dashboard'))

function App() {
  return (
    <ErrorBoundary fallback={<ChunkError />}> 
      <Suspense fallback={<PageSkeleton />}>
        <Dashboard />
      </Suspense>
    </ErrorBoundary>
  )
}
```

`React.lazy` 默认要求模块有 `default export`。如果只有命名导出，可以转换：
```tsx
const Settings = lazy(() => import('./Settings').then((mod) => ({ default: mod.Settings })))
```

### 路由级拆分
路由是最自然的分割点：
```tsx
const routes = [
  { path: '/', element: <Home /> },
  { path: '/settings', element: <Settings /> },
]
```

实际项目中常配合 React Router lazy route、Next.js dynamic import 或框架自带的文件路由分包。

### 动态加载大型库
```tsx
async function exportPdf() {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  doc.save('report.pdf')
}
```

导出、图表、编辑器、地图、Markdown 渲染器都适合按需加载。

### 预加载与错误处理
```tsx
const loadDashboard = () => import('./pages/Dashboard')
const Dashboard = lazy(loadDashboard)

<Link to='/dashboard' onMouseEnter={loadDashboard} onFocus={loadDashboard}>Dashboard</Link>
```

懒加载 chunk 可能因网络、发布后旧 HTML 指向已删除文件、CDN 缓存等失败，所以 Suspense 只处理 loading，错误要靠 ErrorBoundary 兜底，并给用户重试/刷新入口。

### 拆分原则
- 首屏必要代码不要过度拆分，避免请求瀑布
- 低频且体积大的模块优先拆
- 关注 gzip/brotli 后体积和实际执行时间，不只看原始大小
- 预加载用户很可能访问的下一页，但不要把所有 chunk 都 preload 回来

<!-- id: react-018; difficulty: 2; tags: 错误边界, ErrorBoundary, 异常处理; source: 高频 -->
# React 的错误边界（Error Boundary）如何实现？

## Error Boundary

错误边界用于捕获子组件在渲染、生命周期、constructor 中抛出的错误，展示降级 UI，并把错误上报。它避免单个组件崩溃导致整棵 React 树卸载。

### 基本实现
```tsx
class ErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError(error, { componentStack: info.componentStack })
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}
```

目前错误边界通常仍用类组件实现，函数组件项目可直接使用 `react-error-boundary` 这类封装。

### 捕获不到什么
- 事件处理器中的错误，需要 try/catch 或全局上报
- Promise、setTimeout、requestAnimationFrame 等异步回调里的错误
- 服务端渲染期间的错误
- 错误边界自身抛出的错误

```tsx
function Button() {
  return (
    <button
      onClick={() => {
        try {
          riskyAction()
        } catch (error) {
          reportError(error)
        }
      }}
    />
  )
}
```

### 使用建议
- 路由级放一个大边界，防止整站白屏
- 复杂模块或懒加载 chunk 外再放局部边界
- fallback 要提供重试、返回上一页或刷新能力
- 通过改变 `key` 或调用库提供的 reset API 重置错误状态
- 上报时带 release、route、user/session、componentStack，但不要带敏感数据

错误边界是 UI 降级机制，不是业务错误处理机制；接口错误、表单校验和权限失败应在业务状态里明确处理。

<!-- id: react-019; difficulty: 2; tags: Portal, Modal, DOM; source: 高频 -->
# React Portal 是什么，有哪些使用场景？

## React Portal

Portal 允许把子节点渲染到父组件 DOM 层级之外，但它仍然属于原来的 React 组件树。

```tsx
import { createPortal } from 'react-dom'

function Modal({ open, onClose, children }: Props) {
  if (!open) return null

  return createPortal(
    <div className='overlay' onClick={onClose}>
      <div role='dialog' aria-modal='true' className='modal' onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  )
}
```

### 使用场景
- Modal、Dialog、Drawer
- Tooltip、Popover、Dropdown
- Toast、全局浮层、右键菜单
- 需要逃离父级 `overflow: hidden`、`transform`、`z-index` stacking context 的内容

### 事件冒泡
Portal 改变的是 DOM 挂载位置，不改变 React 父子关系。Portal 内部触发的 React 事件会沿 React 组件树冒泡到父组件，而不是只按 DOM 树冒泡。

```tsx
function Parent() {
  return (
    <div onClick={() => console.log('parent')}> 
      <Modal open> <button>Click</button> </Modal>
    </div>
  )
}
```

点击 modal 内按钮可能触发 Parent 的 onClick，需要在合适位置 `stopPropagation` 或调整事件设计。

### 工程注意
- SSR 中 `document.body` 不存在，要在客户端挂载后再创建 portal，或使用框架提供的 client-only 机制
- Modal 要处理焦点陷阱、Esc 关闭、滚动锁定、aria 属性和返回焦点
- 多浮层要统一 z-index、层级管理和滚动容器定位
- Tooltip/Popover 需要处理视口碰撞、滚动重定位和 ResizeObserver

Portal 是浮层基础设施，不只是把 DOM 插到 body 下。

<!-- id: react-020; difficulty: 2; tags: 自定义Hook, Hooks, 最佳实践; source: 高频 -->
# React 中的自定义 Hook 如何设计？

## 自定义 Hook 设计

自定义 Hook 是把可复用的状态逻辑封装成函数。它必须以 `use` 开头，只能在组件或其他 Hook 顶层调用，并且内部可以组合 React 内置 Hook 和其他自定义 Hook。

### 设计原则
- 名字表达业务意图：`useAuth`、`useDebouncedValue`、`useOnlineStatus`
- 返回值稳定且语义清晰：对象适合多字段，元组适合少量固定位置
- 管理好 Effect 生命周期：订阅、定时器、请求都要 cleanup
- 不把服务端缓存、重试、分页全部手写进通用 `useFetch`，复杂数据请求优先用 TanStack Query/SWR
- SSR 场景避免初始渲染直接访问 `window`、`document`、`localStorage`

### useDebouncedValue
```tsx
function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])

  return debounced
}
```

### useLocalStorage
```tsx
function useLocalStorageState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const value = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next
        window.localStorage.setItem(key, JSON.stringify(value))
        return value
      })
    },
    [key],
  )

  return [value, update] as const
}
```

### useWindowSize
浏览器外部状态更严格的方案是 `useSyncExternalStore`，可以避免并发渲染下快照不一致。

```tsx
function subscribe(callback: () => void) {
  window.addEventListener('resize', callback)
  return () => window.removeEventListener('resize', callback)
}

function getSnapshot() {
  return { width: window.innerWidth, height: window.innerHeight }
}

function getServerSnapshot() {
  return { width: 0, height: 0 }
}

function useWindowSize() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
```

自定义 Hook 的价值是隔离复杂生命周期和复用逻辑，而不是把所有逻辑都抽成 Hook；只在有复用、可测试性或可读性收益时抽象。

<!-- id: react-021; difficulty: 2; tags: Context, Redux, Zustand, 状态管理; source: 高频 -->
# React 中的 Context 和 Redux 如何选择？

## Context vs Redux

先区分状态类型：服务端状态优先用 TanStack Query/SWR/RTK Query；组件局部状态用 `useState/useReducer`；跨组件客户端状态才考虑 Context、Redux、Zustand 等。

### Context 适合什么
Context 更像依赖注入和跨层传值工具，适合低频变化、范围明确的数据：主题、语言、当前用户摘要、权限能力、配置对象。

```tsx
const ThemeContext = createContext<'light' | 'dark'>('light')
function useTheme() {
  return useContext(ThemeContext)
}
```

不适合把频繁变化的大状态塞进一个 Context，因为 value 变化会让所有消费者重新渲染。可以拆分 Context、稳定 value、或改用带 selector 的外部 store。

### Redux 适合什么
现代 Redux 应使用 Redux Toolkit。它适合复杂状态流、大团队协作、需要 action 日志、DevTools、时间旅行、持久化、中间件或 RTK Query 的项目。

```tsx
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => {
      state.value += 1
    },
  },
})

const value = useSelector((state: RootState) => state.counter.value)
const dispatch = useDispatch()
dispatch(counterSlice.actions.increment())
```

Redux 的性能来自 selector 和订阅模型，不是“自动更快”。selector 返回新对象时仍会导致重渲染，需要 memoized selector 或浅比较。

### Zustand 等轻量 store
Zustand 适合中小型客户端状态，API 简洁，但约束少，需要团队自己规定 store 拆分、action 命名、持久化和调试方式。

```tsx
const count = useStore((state) => state.count)
const increment = useStore((state) => state.increment)
```

不要 `const { count, increment } = useStore()` 直接订阅整个 store，否则任意状态变化都可能触发重渲染。

### 选择建议
| 场景 | 建议 |
|--|--|
| 主题、语言、配置 | Context |
| 局部复杂表单/流程 | useReducer 或表单库 |
| 服务端缓存、分页、重试 | TanStack Query/SWR/RTK Query |
| 大型客户端状态、审计和团队规范 | Redux Toolkit |
| 中小型 UI/业务状态 | Zustand/Jotai 等轻量方案 |

选型不要只按应用大小，关键看状态变化频率、调试治理需求、团队约束和服务端状态占比。

<!-- id: react-022; difficulty: 2; tags: 性能优化, React.memo, 虚拟化, 代码分割; source: 高频 -->
# React 中如何进行性能优化？

## React 性能优化

先测量，再优化。用 React DevTools Profiler、浏览器 Performance 面板和真实用户指标定位瓶颈：是组件重复渲染、单次渲染太慢、列表 DOM 太多、JS 包太大，还是网络/图片阻塞。

### 减少无效渲染
```tsx
const Row = memo(function Row({ item, onSelect }: Props) {
  return <button onClick={() => onSelect(item.id)}>{item.name}</button>
})

const onSelect = useCallback((id: string) => setSelectedId(id), [])
const visibleItems = useMemo(() => filterItems(items, keyword), [items, keyword])
```

`memo/useMemo/useCallback` 要基于 Profiler 结果使用。简单组件或每次 props 都变化的组件，加 memo 可能没有收益。

### 优化状态位置
- 状态放到真正需要它的最近公共父组件，避免顶层状态变化带动整页
- 拆分高频状态和低频状态
- Context 按领域拆分，避免一个 value 变化触发大量消费者
- 外部 store 使用 selector，避免订阅整个 store

### 长列表和大树
```tsx
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 48,
})
```

长列表必须虚拟化，图片固定尺寸并懒加载，行组件保持 key 稳定。

### 代码分割和资源优化
```tsx
const HeavyChart = lazy(() => import('./HeavyChart'))
```

按路由、弹窗、图表、编辑器等低频大模块拆包，并配合预加载和错误边界。图片、字体和第三方脚本也会影响 React 页面性能。

### 并发能力
```tsx
const deferredKeyword = useDeferredValue(keyword)
const results = useMemo(() => search(items, deferredKeyword), [items, deferredKeyword])
```

`startTransition/useDeferredValue` 能降低非紧急渲染优先级，改善输入响应；它们不会把昂贵同步计算移到后台线程。真正重计算要用 memo、分片、Worker 或服务端处理。

### 其他手段
- 避免在 render 中执行副作用和大计算
- 稳定 key，避免组件被无意义卸载重建
- 生产构建、移除 dev-only 日志和检查
- 对动画优先使用 transform/opacity
- 用 Suspense/骨架屏改善感知，但不要掩盖实际长任务

<!-- id: react-023; difficulty: 2; tags: Render Props, 设计模式, 组件复用; source: 高频 -->
# React 中的 Render Props 模式是什么？

## Render Props

Render Props 是把“如何渲染”作为函数传给组件，组件负责状态或逻辑，调用这个函数返回 UI。它曾是复用状态逻辑的重要模式，现在很多场景被自定义 Hook 替代，但在 Headless UI、复杂插槽和兼容旧代码里仍有价值。

```tsx
function Toggle({ children }: { children: (state: { on: boolean; toggle: () => void }) => React.ReactNode }) {
  const [on, setOn] = useState(false)
  const toggle = useCallback(() => setOn((value) => !value), [])
  return children({ on, toggle })
}

<Toggle>
  {({ on, toggle }) => <button onClick={toggle}>{on ? 'ON' : 'OFF'}</button>}
</Toggle>
```

也可以用显式 `render` prop：
```tsx
<MouseTracker render={({ x, y }) => <span>{x}, {y}</span>} />
```

### 优点
- 调用方完全控制渲染结构
- 逻辑组件不关心 UI，实现 headless 复用
- 可以表达多个渲染出口，比单一 children 更灵活

### 缺点
- 嵌套过多会形成 wrapper hell
- 每次 render 传入的新函数可能影响 memo 优化
- TypeScript 类型会比普通组件复杂一些

### 与 Hooks 的关系
```tsx
function useMouse() {
  // 复用状态逻辑
  return position
}
```

如果只是复用状态逻辑，Hook 更直接；如果组件需要掌控生命周期、上下文或插槽，并把渲染权交给调用方，Render Props 仍然适用。

<!-- id: react-024; difficulty: 2; tags: HOC, 高阶组件, 设计模式, 组件复用; source: 高频 -->
# React 中的高阶组件（HOC）是什么？

## HOC 高阶组件

HOC 是接收组件并返回增强组件的函数：`Component -> EnhancedComponent`。它复用的是组件包装能力，而不是 Hook 那种状态逻辑函数。

```tsx
function withLoading<P>(Wrapped: React.ComponentType<P>) {
  function WithLoading(props: P & { isLoading: boolean }) {
    const { isLoading, ...rest } = props
    if (isLoading) return <Spinner />
    return <Wrapped {...(rest as P)} />
  }

  WithLoading.displayName = `withLoading(${Wrapped.displayName ?? Wrapped.name ?? 'Component'})`
  return WithLoading
}
```

### 常见场景
- 权限和登录态守卫
- 路由级 layout 包装
- 注入日志、埋点、feature flag
- 兼容类组件或旧生态库，例如 `connect`、`withRouter` 老写法

### 注意事项
- 不要在 render 中创建 HOC，否则每次都是新组件类型，会导致卸载重建
- 要透传无关 props，不要吞掉调用方 props
- ref 不会自动穿过 HOC，需要 `forwardRef`
- 静态属性不会自动复制，需要 `hoist-non-react-statics`
- 多个 HOC 嵌套会让组件树和类型变复杂

```tsx
function withFeature<P, R>(Wrapped: React.ForwardRefRenderFunction<R, P>) {
  const Enhanced = forwardRef<R, P>((props, ref) => <Wrapped {...props} ref={ref} />)
  return Enhanced
}
```

### 与 Hooks
现代 React 里，纯状态逻辑复用优先写自定义 Hook；需要包装渲染、拦截 props、兼容类组件或接入老生态时，HOC 仍有价值。

<!-- id: react-025; difficulty: 2; tags: useLayoutEffect, useEffect, DOM, 性能; source: 高频 -->
# useLayoutEffect 和 useEffect 的区别

## useLayoutEffect vs useEffect

二者都在 React commit 后执行，区别是执行时机是否阻塞浏览器绘制。

```text
render -> commit DOM -> useLayoutEffect -> browser paint -> useEffect
```

`useLayoutEffect` 会在浏览器绘制前同步执行，如果里面 setState，React 会立即再次渲染并在用户看到前完成。它能避免视觉闪烁，但会阻塞绘制，滥用会让页面更卡。

### useLayoutEffect 场景
```tsx
function Tooltip({ targetRect }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    const rect = ref.current?.getBoundingClientRect()
    if (rect) setHeight(rect.height)
  }, [])

  return <div ref={ref} style={{ top: targetRect.top - height }} />
}
```

适合：测量 DOM、定位 tooltip/popover、设置动画初始状态、需要在用户看到前同步完成的布局修正。

### useEffect 场景
```tsx
useEffect(() => {
  const id = window.setInterval(tick, 1000)
  return () => window.clearInterval(id)
}, [])
```

适合绝大多数副作用：请求、订阅、日志、定时器、非布局相关 DOM 操作。

### SSR 注意
服务端没有布局信息，`useLayoutEffect` 不会在服务端执行，还可能产生警告。通用组件库常用同构封装：
```tsx
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
```

原则是默认用 `useEffect`，只有确认需要阻止闪烁或同步测量布局时才用 `useLayoutEffect`。

<!-- id: react-026; difficulty: 2; tags: forwardRef, ref, useImperativeHandle, Hooks; source: 高频 -->
# React 中的 forwardRef 是什么，如何使用？

## forwardRef

`forwardRef` 用来让父组件把 ref 传到子组件内部的 DOM 节点或自定义实例上。React 19 中 ref 可以作为普通 prop 传递，`forwardRef` 更多用于兼容旧版本 React 和现有组件库 API，但理解它仍然重要。

### React 18 及以前常见写法
```tsx
type InputProps = React.ComponentPropsWithoutRef<'input'> & { label: string }

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ label, ...props }, ref) {
  return (
    <label>
      {label}
      <input ref={ref} {...props} />
    </label>
  )
})
```

```tsx
const inputRef = useRef<HTMLInputElement | null>(null)
<Input label='Name' ref={inputRef} />
<button onClick={() => inputRef.current?.focus()}>Focus</button>
```

### React 19 思路
React 19 中可以把 `ref` 当成 prop 接收，再传给内部元素：
```tsx
function Input({ label, ref, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  return (
    <label>
      {label}
      <input ref={ref} {...props} />
    </label>
  )
}
```

团队需要根据 React 版本、组件库兼容性和类型支持选择写法，不要混用造成 API 不一致。

### useImperativeHandle
如果不想暴露完整 DOM，可以暴露受控方法：
```tsx
type InputHandle = { focus: () => void; clear: () => void }

const FancyInput = React.forwardRef<InputHandle, InputProps>(function FancyInput(props, ref) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => {
      if (inputRef.current) inputRef.current.value = ''
    },
  }), [])

  return <input ref={inputRef} {...props} />
})
```

### 注意事项
- ref 是逃生口，优先通过 props 表达数据和行为
- HOC 包装组件时 ref 不会自动透传，需要显式处理
- 暴露 imperative API 时保持小而稳定，避免父组件依赖子组件内部 DOM 结构

<!-- id: react-027; difficulty: 2; tags: Suspense, 懒加载, 数据获取, React 18; source: 高频 -->
# React 中的 Suspense 和数据获取

## Suspense 和数据获取

Suspense 让组件在等待某些异步资源时，向上交给最近的 `<Suspense fallback>` 展示加载态。最稳定的场景是代码分割；数据获取需要使用支持 Suspense 的框架或数据层。

### 代码分割
```tsx
const HeavyChart = lazy(() => import('./HeavyChart'))

<Suspense fallback={<ChartSkeleton />}>
  <HeavyChart />
</Suspense>
```

懒加载失败会抛错误，必须配合 ErrorBoundary；Suspense 只负责 pending，不负责 error。

### 数据获取
普通 `useEffect + fetch` 不会自动触发 Suspense。数据层需要在未就绪时抛出 Promise，或者使用框架封装。

TanStack Query v5 示例：
```tsx
function UserProfile({ userId }: { userId: string }) {
  const { data: user } = useSuspenseQuery({
    queryKey: ['user', userId],
    queryFn: () => getUser(userId),
  })

  return <h1>{user.name}</h1>
}
```

```tsx
<ErrorBoundary fallback={<ErrorMessage />}>
  <Suspense fallback={<UserSkeleton />}>
    <UserProfile userId='1' />
  </Suspense>
</ErrorBoundary>
```

React Server Components/框架中，也可能通过服务端 `async` 组件或 React `use` 读取 Promise，但这依赖框架约束，不能在任意客户端组件里随便 await。

### 嵌套边界
```tsx
<Layout>
  <Suspense fallback={<HeaderSkeleton />}><Header /></Suspense>
  <Suspense fallback={<MainSkeleton />}><Main /></Suspense>
</Layout>
```

边界越粗，加载态越统一但阻塞范围越大；边界越细，页面可渐进显示但可能出现多个 skeleton 闪烁。实际应按用户感知的区域切分。

### Streaming SSR
React 18+ 支持服务端流式渲染，先发送 shell，再在数据或代码就绪后继续流式补齐内容，并支持选择性 hydration。Next.js、Remix 等框架通常已经封装了底层 `renderToPipeableStream`/`renderToReadableStream`。

<!-- id: react-028; difficulty: 2; tags: 批处理, 性能优化, React 18, flushSync; source: 高频 -->
# React 中的批处理（Batching）机制

## React 批处理 Batching

批处理是把同一轮任务中的多次 state 更新合并成较少的渲染和提交，减少重复工作。

### React 18+ 自动批处理
使用 `createRoot` 后，React 会在事件、Promise、setTimeout、原生事件等更多场景自动批处理。

```tsx
setTimeout(() => {
  setCount((count) => count + 1)
  setFlag((flag) => !flag)
  // 通常只产生一次重新渲染
}, 0)

async function load() {
  const data = await fetchData()
  setData(data)
  setLoading(false)
  // 同一轮中会被批处理
}
```

批处理不改变 updater 的语义。多次依赖旧值的更新仍然要用函数式写法：
```tsx
setCount((count) => count + 1)
setCount((count) => count + 1)
```

### flushSync
`flushSync` 可以强制 React 立即把更新提交到 DOM，但会打断调度、降低性能，甚至让 Suspense fallback 提前出现。只在必须同步读取 DOM 或集成第三方 imperative API 时使用。

```tsx
import { flushSync } from 'react-dom'

flushSync(() => {
  setItems((items) => [...items, newItem])
})
listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
```

### 注意
- React 仍会保证不同用户事件之间的状态隔离，不会把两次独立点击错误合并
- 批处理减少渲染次数，但不会让昂贵计算消失
- class 组件老代码里依赖 `this.state` 立即更新的写法，在自动批处理下更容易暴露问题
- 不要为了“看到最新 state”滥用 `flushSync`，通常应使用 updater、Effect 或 ref

<!-- id: react-029; difficulty: 2; tags: SSR, CSR, Next.js, Hydration; source: 高频 -->
# React 服务端渲染（SSR）和客户端渲染（CSR）的区别

## SSR vs CSR

CSR 是浏览器下载空壳 HTML 和 JS 后，由客户端执行 React、请求数据并渲染页面。SSR 是服务端先生成 HTML，浏览器先看到内容，再下载 JS 做 hydration 接管交互。

### CSR
```text
HTML shell -> JS bundle -> execute React -> fetch data -> render content
```

优点：部署简单、服务器压力小、登录后强交互体验容易做。缺点：首屏依赖 JS 下载和执行，SEO 和低端设备体验较差。

### SSR
```text
server fetch/render -> HTML visible -> download JS -> hydrate -> interactive
```

优点：首屏内容更快可见、SEO 更好、可流式输出。缺点：服务端成本和 TTFB 更敏感，缓存、鉴权、hydration mismatch 和服务端异常处理更复杂。

### Hydration
Hydration 是客户端 React 在已有 HTML 上重建组件树并绑定事件。服务端和客户端首次渲染结果必须一致，否则可能出现 mismatch，React 会尝试恢复，严重时会丢弃部分 SSR HTML 重新客户端渲染。

常见 mismatch 原因：
- render 中直接使用 `Date.now()`、`Math.random()`
- 服务端和客户端读到不同 localStorage/window 状态
- 根据 userAgent 或屏幕宽度生成不同结构
- 非确定性的 id 或列表顺序

### Next.js 例子
Pages Router：
```tsx
export async function getServerSideProps(ctx) {
  return { props: { user: await fetchUser(ctx.params.id) } }
}
```

App Router / Server Components：
```tsx
export default async function Page({ params }) {
  const res = await fetch(`https://api.example.com/users/${params.id}`, { cache: 'no-store' })
  const user = await res.json()
  return <UserView user={user} />
}
```

实际项目常混合使用：公开内容 SSR/SSG/ISR，后台和强交互区域 CSR，非关键交互模块客户端加载。

<!-- id: react-030; difficulty: 2; tags: useEffect, 陷阱, 闭包, 最佳实践; source: 高频 -->
# React 中 useEffect 的常见陷阱和最佳实践

## useEffect 常见陷阱

`useEffect` 的核心是同步外部系统，不是“监听状态变化然后写业务流程”。很多问题来自漏依赖、把可推导状态放进 Effect、或没有清理外部资源。

### 无限循环
```tsx
const options = { type: optionType }
useEffect(() => {
  fetchData(options)
}, [options]) // 每次 render 都是新对象
```

优先把对象创建移进 Effect，依赖基本值：
```tsx
useEffect(() => {
  fetchData({ type: optionType })
}, [optionType])
```

`useMemo` 可以稳定引用，但不应作为修复依赖设计的第一选择。

### Stale closure
```tsx
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1)
  }, 1000)
  return () => clearInterval(id)
}, [])
```

这里 interval 捕获了初次渲染的 `count`。如果只是基于旧值更新，用函数式更新：
```tsx
useEffect(() => {
  const id = setInterval(() => setCount((count) => count + 1), 1000)
  return () => clearInterval(id)
}, [])
```

如果 Effect 需要读取最新值但不想重新订阅，可用 ref 保存最新值，或在支持的版本中使用 Effect Event 模式。

### 函数依赖
```tsx
useEffect(() => {
  async function load() {
    const user = await fetchUser(userId)
    setUser(user)
  }
  load()
}, [userId])
```

能放进 Effect 的函数就放进去；需要在多个地方复用时，再用 `useCallback` 稳定函数引用。

### 异步竞态和清理
```tsx
useEffect(() => {
  const controller = new AbortController()

  fetch(`/api/users/${userId}`, { signal: controller.signal })
    .then((res) => res.json())
    .then(setUser)
    .catch((error) => {
      if (error.name !== 'AbortError') setError(error)
    })

  return () => controller.abort()
}, [userId])
```

### 最佳实践
- 开启 `eslint-plugin-react-hooks`，不要随意禁用 exhaustive-deps
- 每个 Effect 只同步一种外部资源
- cleanup 必须能撤销 setup 做过的事
- 能在 render 中计算的不要放 Effect + state
- 用户事件触发的动作放事件处理器，不要绕到 Effect 里
- 复杂数据获取交给数据框架，减少手写竞态、缓存、重试和取消逻辑

<!-- id: react-031; difficulty: 3; tags: RSC, Server Components, Next.js, App Router; source: 字节 -->
# React Server Components（RSC）的原理和优势

## React Server Components（RSC）

RSC 是在服务器环境中执行的组件模型。Server Component 的代码不会进入客户端 bundle，客户端收到的是可序列化的 RSC payload，再与 Client Component 合并渲染。它和 SSR 不同：SSR 生成 HTML，RSC 生成组件树描述；实际框架通常会把 RSC、SSR、流式渲染一起使用。

### Next.js App Router 示例
```tsx
// app/users/[id]/page.tsx，默认是 Server Component
export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await db.user.findUnique({ where: { id: params.id } })
  const posts = await db.post.findMany({ where: { userId: params.id } })

  return (
    <main>
      <UserProfile user={user} />
      <PostList posts={posts} />
      <LikeButton postId={posts[0]?.id} />
    </main>
  )
}
```

```tsx
// LikeButton.tsx
'use client'

export function LikeButton({ postId }: { postId?: string }) {
  const [liked, setLiked] = useState(false)
  return <button onClick={() => setLiked((value) => !value)}>Like</button>
}
```

`'use client'` 标记客户端边界；没有 `'use server component'` 这种指令。`'use server'` 是给 Server Functions/Server Actions 用的。

### Server Component 能做什么
- 直接访问数据库、文件系统、内部服务和私有环境变量
- 使用 async/await 获取数据
- 引入只在服务器用的大依赖，避免发到客户端
- 把可序列化数据和 JSX 传给 Client Component

### 限制
- 不能使用 `useState`、`useEffect`、事件处理器和浏览器 API
- 传给 Client Component 的 props 必须可序列化，不能直接传函数、类实例、数据库连接等
- 需要交互的部分必须拆成 Client Component
- 不能把敏感数据误传给客户端组件或序列化输出

### 优势
- 减少客户端 JS 和 hydration 成本
- 数据获取靠近数据源，减少瀑布请求
- 敏感逻辑留在服务器
- 和 Suspense/Streaming 配合实现渐进式加载

### Server Actions / Server Functions
```tsx
'use server'

export async function createPost(formData: FormData) {
  const title = String(formData.get('title') ?? '')
  await db.post.create({ data: { title } })
  revalidatePath('/posts')
}
```

Server Function 从客户端调用时本质是网络请求，参数和返回值会被序列化。它仍然需要鉴权、参数校验、CSRF/来源保护和审计，不能因为写在同一个仓库里就当作可信前端调用。

<!-- id: react-032; difficulty: 3; tags: Scheduler, 调度, 时间分片, 优先级, Fiber; source: 字节 -->
# 深入理解 React 的调度机制（Scheduler）

## React Scheduler 调度机制

Scheduler 解决的是：主线程上既要执行 React 渲染，又要响应输入、动画和浏览器任务。React 通过 Fiber、优先级和时间切片，让 render 阶段可以中断、恢复或丢弃。

### 时间切片
简化模型：
```js
function workLoop() {
  while (nextUnitOfWork && !shouldYield()) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }

  if (nextUnitOfWork) scheduleNextCallback()
  else commitRoot()
}
```

`shouldYield` 会根据当前时间片、输入压力等判断是否让出主线程。React Scheduler 常使用 MessageChannel 等机制安排下一轮任务；这些是实现细节，不应当成业务 API。

### Fiber 与可中断
Fiber 把组件树变成链表式工作单元：`child/sibling/return`。每处理一个 Fiber，React 都有机会检查是否应该暂停。被中断的是 render 阶段；commit 阶段必须同步完成，保证 DOM 一致。

### Lane 模型
React 18+ 使用 lanes 表示更新优先级和批次。lane 是位图，可以高效合并、选择和比较更新。

```text
SyncLane             同步更新
InputContinuousLane  连续输入，如滚动、拖拽
DefaultLane          默认更新
TransitionLanes      过渡更新
IdleLane             空闲更新
```

点击、输入、transition、数据加载等更新会进入不同 lane。React 先处理高优先级 lane，低优先级更新可以被打断，等待后续继续。

### 饥饿和过期
如果低优先级任务一直被高优先级任务打断，React 会通过过期时间等机制避免任务永远不执行。但这不意味着业务可以提交无限大渲染任务；大列表、大计算仍然要虚拟化、memo、分片或放到 Worker。

### 为什么不是 Generator
Generator 可以暂停/恢复，但需要调用链配合，生态和编译成本高。Fiber 用显式数据结构保存工作进度，不要求用户组件写成 generator。

面试中重点讲清：Scheduler 不是让 JS 多线程运行，而是在单线程上按优先级协调可中断的 render 工作。

<!-- id: react-033; difficulty: 3; tags: startTransition, React 18, 并发, 优先级; source: 高频 -->
# React 18 的 startTransition 底层原理

## startTransition 原理

`startTransition` 把其中同步触发的 state 更新标记为 Transition。Transition 是非阻塞更新：更高优先级的输入可以打断它，React 之后再继续或重做过渡渲染。

```tsx
const [isPending, startTransition] = useTransition()

function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
  const value = event.target.value
  setInputValue(value) // 紧急更新，控制输入框

  startTransition(() => {
    setQuery(value) // 非紧急更新，驱动昂贵列表
  })
}
```

### 底层思路
在 `startTransition(action)` 执行期间，React 会把同步安排的更新放入 transition lanes。后续调度时，这些 lane 的优先级低于输入等紧急更新，因此可中断。

这不是 `setTimeout`：
- `setTimeout` 只是延后执行，不能让 React 知道更新优先级
- transition 更新可以被输入打断并重启
- `useTransition` 提供 `isPending`，可展示旧内容的 pending 状态
- transition 与 Suspense 配合时可以避免不必要地隐藏已显示内容

### 重要限制
- Transition 不能用于控制文本输入的 `value`，输入框状态必须同步更新
- `startTransition` 里的函数会立即执行；昂贵同步计算仍会占用主线程
- `await` 之后的 setState 当前仍需要再次包一层 `startTransition`

```tsx
startTransition(async () => {
  const data = await fetchData()
  startTransition(() => {
    setData(data)
  })
})
```

如果要优化真正的 CPU 重计算，应配合 `useDeferredValue`、memo、虚拟列表、分片或 Web Worker。Transition 优化的是渲染调度和交互响应，不是把计算搬到后台线程。

<!-- id: react-034; difficulty: 3; tags: 虚拟列表, 性能优化, 长列表; source: 字节 -->
# 实现一个高性能的虚拟列表（Virtual List）

## 高性能虚拟列表

虚拟列表只渲染可视区附近的行，用一个总高度容器撑开滚动条，再把真实渲染的行绝对定位到正确位置。它解决 DOM 节点过多和渲染成本过高的问题。

### 固定高度实现
```tsx
function VirtualList<T extends { id: string }>({ items, rowHeight, height, renderRow }: Props<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const overscan = 6

  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  const visibleCount = Math.ceil(height / rowHeight)
  const end = Math.min(items.length, start + visibleCount + overscan * 2)
  const visibleItems = items.slice(start, end)

  return (
    <div style={{ height, overflow: 'auto', position: 'relative' }} onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
      <div style={{ height: items.length * rowHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => {
          const rowIndex = start + index
          return (
            <div key={item.id} style={{ position: 'absolute', insetInline: 0, height: rowHeight, transform: `translateY(${rowIndex * rowHeight}px)` }}>
              {renderRow(item, rowIndex)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

### 关键细节
- `overscan` 防止快速滚动露白，但过大会增加渲染成本
- 使用稳定业务 id 作为 key，不要用窗口内 index
- 行组件用 `memo`，避免滚动时无关 props 变化
- 图片设置固定尺寸和 lazy loading，避免动态撑高造成跳动
- 滚动事件状态更新要轻量，复杂计算放到 memo 或虚拟化库内部
- 可访问性要保留键盘导航、aria 行数和焦点管理

### 动态高度
动态高度需要维护每行测量高度和前缀和位置，滚动时通过二分查找找 startIndex。手写容易踩坑：ResizeObserver 生命周期、测量抖动、滚动锚点、快速跳转、数据插入后的偏移修正。

生产项目优先用成熟库：
- TanStack Virtual：灵活，支持动态尺寸和多框架
- react-window：轻量，固定尺寸场景简单
- react-virtuoso：功能完整，适合聊天/复杂列表

面试手写固定高度版本即可，但要能说明动态高度为什么更难，以及如何测量和维护位置。

<!-- id: react-035; difficulty: 3; tags: 状态机, XState, 状态管理, 设计模式; source: 高频 -->
# React 中如何实现状态机（State Machine）？

## React 状态机

状态机用有限状态和事件转移来描述流程，避免多个 boolean 组合出非法状态。

```tsx
// 容易出现 loading 和 success 同时为 true
const [isLoading, setLoading] = useState(false)
const [isSuccess, setSuccess] = useState(false)
const [isError, setError] = useState(false)
```

### 用联合类型表达状态
```tsx
type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }

type Action<T> =
  | { type: 'fetch' }
  | { type: 'resolve'; data: T }
  | { type: 'reject'; error: Error }
  | { type: 'reset' }

function reducer<T>(state: FetchState<T>, action: Action<T>): FetchState<T> {
  switch (action.type) {
    case 'fetch':
      return { status: 'loading' }
    case 'resolve':
      return { status: 'success', data: action.data }
    case 'reject':
      return { status: 'error', error: action.error }
    case 'reset':
      return { status: 'idle' }
    default:
      return state
  }
}
```

UI 只按 `status` 分支渲染，TypeScript 会缩小类型，避免在 error 状态读取不存在的 data。

### 什么时候用状态机
适合登录、多步表单、支付、上传、审批、播放器、协同编辑等状态转移明确且边界多的流程。不适合简单开关或纯展示状态。

### XState
```tsx
const uploadMachine = createMachine({
  initial: 'idle',
  states: {
    idle: { on: { SELECT: 'ready' } },
    ready: { on: { UPLOAD: 'uploading' } },
    uploading: { on: { DONE: 'success', FAIL: 'failure', CANCEL: 'idle' } },
    success: { on: { RESET: 'idle' } },
    failure: { on: { RETRY: 'uploading', RESET: 'idle' } },
  },
})
```

专业状态机库能提供守卫条件、并行状态、嵌套状态、可视化和测试工具；代价是学习成本和样板代码。项目中可先用 `useReducer + discriminated union`，流程复杂后再引入 XState。

<!-- id: react-036; difficulty: 2; tags: StrictMode, 开发工具, 最佳实践; source: 高频 -->
# React 中的 StrictMode 有什么作用？

## React StrictMode

`StrictMode` 是开发期检查工具，不影响生产环境行为。它会主动暴露不纯渲染、Effect 清理不完整、ref 清理问题和废弃 API 使用。

```tsx
import { StrictMode } from 'react'

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

### 主要检查
开发模式下，React 可能额外调用：
- 组件函数体、state initializer、reducer initializer，用来发现 render 中的副作用
- Effect 的 setup/cleanup，再 setup 一次，用来发现清理不完整
- ref callback 的 setup/cleanup，用来发现 ref 泄漏

```tsx
useEffect(() => {
  const socket = new WebSocket(url)
  return () => socket.close()
}, [url])
```

如果上面缺少 cleanup，StrictMode 下会更容易看到重复连接问题。

### 废弃 API 警告
StrictMode 还会提示 legacy lifecycle、旧 Context、字符串 ref、`findDOMNode` 等不推荐 API，帮助项目迁移到并发安全的写法。

### 注意事项
- StrictMode 下开发环境日志、请求、Effect 看起来可能执行两次，不代表生产也执行两次
- 正确修复不是删除 StrictMode，而是让渲染纯净、Effect 可重复 setup/cleanup
- 第三方库如果不兼容 StrictMode，优先升级库或隔离问题，不要全局关闭

面试回答重点：StrictMode 是为了让组件满足未来并发渲染的约束，而不是性能优化开关。

<!-- id: react-037; difficulty: 1; tags: Fragment, React基础, DOM结构; source: 高频 -->
# 什么是 React Fragment？为什么需要它？

## React Fragment

Fragment 用来返回多个相邻节点而不额外生成 DOM 元素。它常用于保持 HTML 语义结构，避免为了满足单根返回而加无意义的 `<div>`。

```tsx
function DescriptionItem() {
  return (
    <>
      <dt>Title</dt>
      <dd>Content</dd>
    </>
  )
}
```

在 `dl`、`table`、`ul`、flex/grid 布局中，额外包一层 div 可能破坏语义或样式，Fragment 更合适。

### 完整写法和 key
简写 `<>...</>` 不能传 key。列表中需要 key 时要使用完整写法：
```tsx
import { Fragment } from 'react'

function DefinitionList({ items }: { items: Item[] }) {
  return (
    <dl>
      {items.map((item) => (
        <Fragment key={item.id}>
          <dt>{item.title}</dt>
          <dd>{item.content}</dd>
        </Fragment>
      ))}
    </dl>
  )
}
```

### 好处
- 不产生额外 DOM 节点
- 保持语义和 CSS 选择器结构
- 减少不必要的 wrapper

Fragment 不是性能优化神器，只是避免多余 DOM 和表达正确结构的工具。

<!-- id: react-038; difficulty: 2; tags: Compound Component, 设计模式, Context; source: 高频 -->
# React 中的 Compound Component 模式

## Compound Component 复合组件

复合组件是一组协同工作的组件，通过共同父组件或 Context 共享状态，让调用方用接近语义结构的方式组合 UI。典型例子是 Tabs、Accordion、Select。

```tsx
<Tabs defaultValue='profile'>
  <Tabs.List>
    <Tabs.Trigger value='profile'>Profile</Tabs.Trigger>
    <Tabs.Trigger value='settings'>Settings</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Panel value='profile'>Profile content</Tabs.Panel>
  <Tabs.Panel value='settings'>Settings content</Tabs.Panel>
</Tabs>
```

### 实现要点
```tsx
const TabsContext = createContext<TabsContextValue | null>(null)

function Tabs({ value, defaultValue, onValueChange, children }: TabsProps) {
  const [innerValue, setInnerValue] = useState(defaultValue)
  const currentValue = value ?? innerValue

  const setValue = useCallback((next: string) => {
    if (value === undefined) setInnerValue(next)
    onValueChange?.(next)
  }, [value, onValueChange])

  const context = useMemo(() => ({ value: currentValue, setValue }), [currentValue, setValue])
  return <TabsContext.Provider value={context}>{children}</TabsContext.Provider>
}
```

子组件通过 Context 读取状态：
```tsx
function Trigger({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = useTabsContext()
  const selected = ctx.value === value

  return (
    <button role='tab' aria-selected={selected} tabIndex={selected ? 0 : -1} onClick={() => ctx.setValue(value)}>
      {children}
    </button>
  )
}
```

### 高质量实现还要考虑
- 受控和非受控两种用法：`value/onValueChange` 与 `defaultValue`
- 键盘可访问性：方向键切换、Home/End、正确 `role=tablist/tab/tabpanel`
- id 关联：`aria-controls` 和 `aria-labelledby`
- Context 缺失时抛出清晰错误
- 避免把所有状态塞进一个 Context 导致不必要重渲染

优势是 API 语义清晰、调用方布局灵活；代价是实现复杂度和 a11y 细节更多。

<!-- id: react-039; difficulty: 2; tags: 表单, 验证, React Hook Form, Zod; source: 高频 -->
# 如何在 React 中处理表单验证？

## React 表单验证

表单验证要覆盖客户端即时反馈、提交前校验、服务端错误回填和可访问性。简单表单可以手写，复杂表单推荐 React Hook Form + Zod/Yup/Valibot。

### React Hook Form + Zod
```tsx
const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
})

type FormValues = z.infer<typeof schema>

function LoginForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onBlur' })

  async function onSubmit(values: FormValues) {
    const result = await login(values)
    if (!result.ok) {
      setError('root', { message: result.message })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <input aria-invalid={!!errors.email} aria-describedby='email-error' {...register('email')} />
      {errors.email && <p id='email-error'>{errors.email.message}</p>}

      <input type='password' aria-invalid={!!errors.password} {...register('password')} />
      {errors.password && <p>{errors.password.message}</p>}

      {errors.root && <p role='alert'>{errors.root.message}</p>}
      <button disabled={isSubmitting}>Submit</button>
    </form>
  )
}
```

### 手写时的关键点
- `values/errors/touched/isSubmitting` 分开管理
- 校验时机明确：onChange、onBlur、onSubmit 不要混乱
- 提交期间禁用按钮，防止重复提交
- 服务端错误按字段回填，不能只弹 toast
- 正则只做基本格式校验，核心约束仍由服务端最终校验

### 可访问性
错误信息要和输入框关联：`aria-invalid`、`aria-describedby`、`role='alert'`。不要只用红色表达错误；错误文案要可读、可聚焦、可被屏幕阅读器读取。

<!-- id: react-040; difficulty: 2; tags: Redux, RTK, Redux Toolkit, 状态管理; source: 高频 -->
# Redux Toolkit 的使用和原理

## Redux Toolkit（RTK）

Redux Toolkit 是现代 Redux 官方推荐写法，内置 `configureStore`、`createSlice`、Immer、Thunk 中间件和开发期检查，减少手写 action type、action creator 和不可变更新样板。

### Store
```tsx
export const store = configureStore({
  reducer: {
    users: usersReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```

### createSlice
```tsx
type UsersState = {
  list: User[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error?: string
}

const initialState: UsersState = { list: [], status: 'idle' }

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    addUser(state, action: PayloadAction<User>) {
      state.list.push(action.payload)
    },
    removeUser(state, action: PayloadAction<string>) {
      state.list = state.list.filter((user) => user.id !== action.payload)
    },
  },
})
```

看起来像直接修改 state，实际由 Immer 生成不可变更新。不要在 reducer 里发请求、读时间、生成随机数或修改外部变量。

### createAsyncThunk
适合少量异步流程；复杂服务端缓存更推荐 RTK Query。
```tsx
export const fetchUsers = createAsyncThunk<User[], void, { rejectValue: string }>(
  'users/fetch',
  async (_, { rejectWithValue, signal }) => {
    const res = await fetch('/api/users', { signal })
    if (!res.ok) return rejectWithValue('Fetch users failed')
    return res.json()
  },
)
```

### RTK Query
```tsx
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['User'],
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => '/users',
      providesTags: ['User'],
    }),
    createUser: builder.mutation<User, Partial<User>>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
  }),
})

export const { useGetUsersQuery, useCreateUserMutation } = api
```

RTK Query 负责缓存、去重、重试、失效、轮询和请求状态。Redux Toolkit 的核心价值是约束和可观测性，适合需要统一状态流、DevTools 和团队规范的大中型应用。

<!-- id: react-041; difficulty: 3; tags: Modal, 可访问性, 焦点管理, Portal; source: 高频 -->
# React 中如何实现一个 Modal 组件（包含动画、焦点管理、可访问性）？

## 完整 Modal 组件

高质量 Modal 需要同时处理 Portal、焦点管理、键盘交互、滚动锁、可访问性、动画和 SSR。生产项目优先使用 Radix Dialog、React Aria、Headless UI 这类成熟实现；手写时要知道关键点。

```tsx
function Modal({ open, onClose, title, children }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previousFocusRef.current = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    requestAnimationFrame(() => dialogRef.current?.focus())

    return () => {
      document.body.style.overflow = previousOverflow
      previousFocusRef.current?.focus()
    }
  }, [open])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') onClose()
    if (event.key !== 'Tab') return

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    if (!focusable?.length) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }, [onClose])

  if (!open) return null

  return createPortal(
    <div className='modalOverlay' onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={dialogRef} role='dialog' aria-modal='true' aria-labelledby='modal-title' tabIndex={-1} className='modal' onKeyDown={handleKeyDown}>
        <h2 id='modal-title'>{title}</h2>
        <button type='button' aria-label='Close dialog' onClick={onClose}>Close</button>
        {children}
      </div>
    </div>,
    document.body,
  )
}
```

### 关键点
- `role='dialog'`、`aria-modal='true'`、`aria-labelledby/aria-describedby`
- 打开时把焦点移入，关闭时恢复到触发元素
- Tab/Shift+Tab 不离开对话框，Esc 关闭
- 背景内容最好 inert 或 aria-hidden，避免屏幕阅读器访问背景
- body 滚动锁要支持嵌套弹窗和滚动条补偿
- 退出动画不能在 `open=false` 时立刻卸载，需要 `closing` 状态或动画库等待结束
- Portal 只解决挂载层级，不自动解决 a11y

<!-- id: react-042; difficulty: 1; tags: 条件渲染, React基础; source: 高频 -->
# React 中条件渲染的几种方式

## React 条件渲染

### if/else 提前返回
```tsx
function Page({ status }: { status: Status }) {
  if (status === 'loading') return <Spinner />
  if (status === 'error') return <ErrorView />
  return <Content />
}
```

适合分支较大、需要提前退出的页面。

### 三元表达式
```tsx
{isLoggedIn ? <UserMenu /> : <LoginButton />}
```

适合二选一。嵌套三元可读性差，复杂时改成变量或子组件。

### && 短路
```tsx
{isLoading && <Spinner />}
{count > 0 && <Badge count={count} />}
```

注意 `0 && <List />` 会渲染 `0`，所以数字条件要写成 `count > 0` 或 `Boolean(count)`。

### 变量或映射表
```tsx
let content: React.ReactNode
if (status === 'idle') content = <Empty />
else if (status === 'loading') content = <Spinner />
else content = <Data />

return <section>{content}</section>
```

也可以用状态到组件的映射表，但要避免过度抽象。

### 状态保留和重置
同一位置渲染同一组件类型时，React 会尽量保留 state；如果希望条件变化时重置状态，可以改变 key：
```tsx
<Form key={userId} userId={userId} />
```

条件渲染不仅是语法问题，也会影响组件是否卸载、Effect 是否清理、本地 state 是否保留。

<!-- id: react-043; difficulty: 2; tags: React Query, 数据获取, 缓存; source: 高频 -->
# React Query（TanStack Query）的核心概念和使用

## TanStack Query 核心概念

TanStack Query 管理服务端状态：缓存、去重、过期、后台刷新、重试、分页、预取、乐观更新和失效。它不替代本地 UI 状态管理。

### Provider
```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 2 },
  },
})

root.render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
)
```

### Query
```tsx
function Users() {
  const query = useQuery({
    queryKey: ['users', { page: 1 }],
    queryFn: ({ signal }) => fetch('/api/users?page=1', { signal }).then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  if (query.isPending) return <Spinner />
  if (query.isError) return <ErrorView error={query.error} />
  return <UserList users={query.data} refreshing={query.isFetching} />
}
```

`queryKey` 必须包含影响结果的参数；`isPending` 表示首次无数据加载，`isFetching` 表示后台请求中。

### Mutation 与失效
```tsx
const queryClient = useQueryClient()
const mutation = useMutation({
  mutationFn: createUser,
  onSuccess: (user) => {
    queryClient.setQueryData(['user', user.id], user)
    queryClient.invalidateQueries({ queryKey: ['users'] })
  },
})
```

### 乐观更新
```tsx
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (patch) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] })
    const previous = queryClient.getQueryData<Todo[]>(['todos'])
    queryClient.setQueryData<Todo[]>(['todos'], (old = []) => old.map((todo) => todo.id === patch.id ? { ...todo, ...patch } : todo))
    return { previous }
  },
  onError: (_error, _patch, context) => queryClient.setQueryData(['todos'], context?.previous),
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
})
```

复杂项目应建立 query key factory、统一错误处理和接口层；库存、支付等强一致业务慎用乐观更新。

<!-- id: react-044; difficulty: 2; tags: 列表, 不可变, 状态更新; source: 高频 -->
# React 中如何处理列表的增删改操作？

## React 列表增删改

核心原则是不可变更新：不要直接修改 state 中的数组或对象，而是返回新引用。列表渲染使用稳定业务 id 作为 key。

```tsx
type Todo = { id: string; text: string; done: boolean }
const [todos, setTodos] = useState<Todo[]>([])
```

### 添加
```tsx
function addTodo(text: string) {
  setTodos((prev) => [...prev, { id: crypto.randomUUID(), text, done: false }])
}
```

### 删除
```tsx
function removeTodo(id: string) {
  setTodos((prev) => prev.filter((todo) => todo.id !== id))
}
```

### 更新
```tsx
function toggleTodo(id: string) {
  setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)))
}
```

### 移动
```tsx
function moveTodo(from: number, to: number) {
  setTodos((prev) => {
    const next = [...prev]
    const [item] = next.splice(from, 1)
    if (!item) return prev
    next.splice(to, 0, item)
    return next
  })
}
```

### Immer
```tsx
updateTodos((draft) => {
  const todo = draft.find((item) => item.id === id)
  if (todo) todo.done = !todo.done
})
```

Immer 让写法像可变更新，但仍生成不可变结果。适合深层结构，简单数组操作不一定需要。

### 注意事项
- 不要用数组 index 当 key，增删移动会造成状态错位
- 不要用 `Date.now()` 作为高并发唯一 id，可能冲突；客户端可用 `crypto.randomUUID()`，服务端数据用服务端 id
- 基于旧数组更新时用函数式 `setTodos((prev) => ...)`
- 大列表增删改要配合虚拟列表、memo 和局部状态设计

<!-- id: react-045; difficulty: 3; tags: 无限滚动, IntersectionObserver, 性能优化; source: 高频 -->
# React 中如何实现一个完整的无限滚动（Infinite Scroll）？

## Infinite Scroll 实现

无限滚动适合信息流，不适合所有列表。后台表格、可定位结果和 SEO 页面通常分页更清晰。实现时要处理去重、并发请求、游标分页、加载状态、错误重试、可访问性和滚动性能。

### IntersectionObserver Hook
```tsx
function useIntersection(callback: () => void, enabled: boolean) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  return useCallback((node: HTMLElement | null) => {
    if (!node || !enabled) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) callbackRef.current()
      },
      { rootMargin: '300px 0px', threshold: 0 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled])
}
```

实际 React callback ref 不能直接依赖返回 cleanup 跨版本表现，工程中常用 `useEffect + sentinelRef` 管理 observer，或使用成熟 hook。

### TanStack Query
```tsx
function Feed() {
  const query = useInfiniteQuery({
    queryKey: ['feed'],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => fetchFeed({ cursor: pageParam, signal }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  const sentinelRef = useIntersection(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage()
  }, Boolean(query.hasNextPage))

  const items = query.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <section aria-busy={query.isFetchingNextPage}>
      {items.map((item) => <FeedItem key={item.id} item={item} />)}
      {query.isError && <button onClick={() => query.fetchNextPage()}>Retry</button>}
      {query.hasNextPage && <div ref={sentinelRef} aria-hidden />}
      {query.isFetchingNextPage && <Spinner />}
    </section>
  )
}
```

### 关键点
- 后端优先 cursor 分页，不要只靠 page number，避免插入数据导致重复/遗漏
- 请求要防并发：`isFetchingNextPage` 时不再触发
- item 按 id 去重，尤其是实时数据或刷新后
- 列表很长时配合虚拟列表，否则 DOM 会无限增长
- 提供“加载更多”按钮兜底，方便键盘和屏幕阅读器用户
- 路由返回时恢复滚动位置和已加载页
- 错误要允许重试，不能让哨兵失效后用户卡住

<!-- id: react-046; difficulty: 2; tags: Zustand, 状态管理, Redux; source: 高频 -->
# Zustand 的原理和与 Redux 的对比

## Zustand 原理和 Redux 对比

Zustand 是轻量外部 store。组件通过 hook 订阅 store 的某个 selector，store 更新后只通知 selector 结果变化的组件。它适合客户端 UI/业务状态，不负责服务端缓存、请求去重和失效。

### 基本使用
```tsx
type State = {
  bears: number
  increment: () => void
  reset: () => void
}

const useBearStore = create<State>((set) => ({
  bears: 0,
  increment: () => set((state) => ({ bears: state.bears + 1 })),
  reset: () => set({ bears: 0 }),
}))

function BearCounter() {
  const bears = useBearStore((state) => state.bears)
  const increment = useBearStore((state) => state.increment)
  return <button onClick={increment}>{bears}</button>
}
```

不要直接 `const state = useBearStore()` 订阅整个 store；这样任意字段变化都会让组件重渲染。多个字段可用 `useShallow` 或拆成多个 selector。

### 中间件
```tsx
const useStore = create<State>()(
  devtools(
    persist(
      immer((set) => ({
        count: 0,
        increment: () => set((state) => { state.count += 1 }),
      })),
      { name: 'app-store', partialize: (state) => ({ count: state.count }) },
    ),
  ),
)
```

持久化要谨慎选择字段，不能把 token、临时错误、巨大列表全塞进 localStorage。

### 与 Redux Toolkit
| 维度 | Redux Toolkit | Zustand |
|--|--|--|
| 约束 | action/reducer/store 流程清晰 | 约束少，写法自由 |
| 调试 | DevTools action log 强 | 可接 DevTools，但语义取决于 action 写法 |
| 异步 | thunk/listener/RTK Query | action 中直接 async，常配 TanStack Query |
| 大团队治理 | 更容易统一规范 | 需要额外约定 store 拆分和命名 |
| 适用 | 复杂状态流、审计、回放 | 中小型客户端状态、快速开发 |

Redux 更偏工程治理，Zustand 更偏轻量灵活。服务端数据不要用两者手写缓存，优先使用 Query 类库。

<!-- id: react-047; difficulty: 2; tags: useId, React 18, SSR, 可访问性; source: 高频 -->
# React 中的 useId Hook 有什么用途？

## useId

`useId` 用来生成稳定且 SSR/CSR 一致的唯一 id，主要用于可访问性属性关联，例如 `label htmlFor`、`aria-describedby`、`aria-labelledby`。

```tsx
function TextField({ label, hint }: { label: string; hint?: string }) {
  const id = useId()
  const inputId = `${id}-input`
  const hintId = `${id}-hint`

  return (
    <div>
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} aria-describedby={hint ? hintId : undefined} />
      {hint && <p id={hintId}>{hint}</p>}
    </div>
  )
}
```

### 为什么不用随机数
SSR 场景下，服务端和客户端初次渲染必须生成同样的 id。`Math.random()`、全局自增计数器都可能导致 hydration mismatch。

### 注意事项
- 不要用于列表 key；key 应来自数据稳定 id
- 不要依赖生成格式，React 可能改变
- 不要在循环或条件中调用 Hook，`useId` 也必须遵守 Hooks 规则
- 如果多个 React 根共存，需要配置一致的 `identifierPrefix` 防止跨根 id 冲突

`useId` 解决的是 DOM id 稳定性，不是业务实体 id 生成器。

<!-- id: react-048; difficulty: 3; tags: 拖拽, DnD, 交互; source: 高频 -->
# 如何在 React 中实现一个完整的拖拽（Drag and Drop）功能？

## React 拖拽 Drag and Drop

拖拽要考虑输入方式、碰撞检测、排序算法、动画、滚动容器、键盘可访问性和移动端。HTML5 Drag and Drop API 对文件拖放有用，但移动端和自定义排序体验一般；应用内排序更推荐 `@dnd-kit`。

### dnd-kit 排序列表
```tsx
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableItem({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  return <div ref={setNodeRef} style={style} {...attributes} {...listeners}>{id}</div>
}

function SortableList() {
  const [items, setItems] = useState(['a', 'b', 'c'])
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => {
      if (!over || active.id === over.id) return
      setItems((items) => arrayMove(items, items.indexOf(String(active.id)), items.indexOf(String(over.id))))
    }}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map((id) => <SortableItem key={id} id={id} />)}
      </SortableContext>
    </DndContext>
  )
}
```

### 关键点
- 使用稳定 id，不要用 index
- `over` 可能为 null，必须兜底
- PointerSensor + KeyboardSensor 同时支持鼠标、触摸和键盘
- 拖拽中不要频繁重排真实数组，通常在 drag end 后提交最终顺序
- 长列表要结合虚拟滚动时要额外处理测量和拖拽 overlay
- 对屏幕阅读器提供可理解的排序反馈和操作说明
- 文件拖放可用原生 Drag and Drop，但要阻止默认行为并校验文件类型/大小

<!-- id: react-049; difficulty: 2; tags: useSyncExternalStore, React 18, 外部Store, 并发; source: 高频 -->
# React 中的 useSyncExternalStore 有什么用途？

## useSyncExternalStore

`useSyncExternalStore` 是 React 提供给外部 store 的订阅协议，用来在并发渲染下安全读取外部状态，避免 tearing。它适合状态管理库、浏览器 API 订阅和自定义外部数据源。

### 在线状态
```tsx
function subscribe(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getSnapshot() {
  return navigator.onLine
}

function getServerSnapshot() {
  return true
}

function useOnlineStatus() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
```

### 自定义 store
```tsx
function createStore<T>(initialState: T) {
  let state = initialState
  const listeners = new Set<() => void>()

  return {
    getState: () => state,
    setState: (next: T) => {
      state = next
      listeners.forEach((listener) => listener())
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

const count = useSyncExternalStore(store.subscribe, () => store.getState().count, () => 0)
```

### 注意事项
- `getSnapshot` 必须同步、无副作用
- 如果 store 没变，`getSnapshot` 应返回同一个值；不要每次返回新对象，否则会无限重渲染
- SSR 时提供 `getServerSnapshot`，并保证客户端 hydration 初始值兼容
- 需要 selector/equality 时要自己封装，或使用成熟库

Redux、Zustand 等现代库底层都围绕类似订阅模型处理并发安全。

<!-- id: react-050; difficulty: 3; tags: Reconciliation, Fiber, 协调, 性能; source: 高频 -->
# React 中的 Reconciliation（协调）算法详解

## Reconciliation 协调算法

Reconciliation 是 React 根据新旧 element/Fiber 树计算下一次 UI 变化的过程。它发生在 render 阶段，结果是在 Fiber 上标记需要提交的变更；真正修改 DOM 发生在 commit 阶段。

```text
state/props/context 更新 -> render phase 协调 -> 标记 flags -> commit phase 更新宿主环境
```

### Fiber 结构
```ts
type Fiber = {
  type: string | Function
  key: null | string
  stateNode: unknown
  return: Fiber | null
  child: Fiber | null
  sibling: Fiber | null
  alternate: Fiber | null
  flags: number
  subtreeFlags: number
  pendingProps: unknown
  memoizedProps: unknown
  memoizedState: unknown
  lanes: Lanes
}
```

`alternate` 连接 current tree 和 workInProgress tree，用于双缓冲。

### beginWork
向下遍历：
- 函数组件执行组件函数并处理 Hooks
- 类组件调用 render
- HostComponent 比较 props
- 根据 children 做 diff，生成或复用子 Fiber
- 如果 props/state/context/lane 都没有变化，可以 bailout 跳过子树

### completeWork
向上归并：
- 对新 HostComponent 创建 DOM 节点
- 准备 DOM 属性更新
- 冒泡 `flags/subtreeFlags`
- 建立子节点关系，供 commit 阶段使用

现代 React 不应再简单描述为收集一个 effectList；更准确是 Fiber 上记录 flags，并在 commit 中按阶段处理 mutation、layout、passive effect。

### 子节点 diff
- type 不同：删除旧子树，新建子树
- type 和 key 相同：复用 Fiber，保留状态
- 列表通过 key 找身份，并用 `lastPlacedIndex` 判断移动

### bailout 和性能
`React.memo`、`PureComponent`、selector、稳定 props 都是在帮助 React 更容易跳过无变化子树。但 Context value 变化会让消费者重新渲染，所以高频状态应拆 Context 或使用带 selector 的 store。

协调的核心不是“生成最小 DOM 操作”，而是在可接受复杂度内尽量复用节点和状态，并让调度器可以中断 render 工作。

<!-- id: react-051; difficulty: 2; tags: Zustand, Jotai, 状态管理, 对比; source: 高频 -->
# React 中 Zustand vs Jotai vs Recoil 的对比

## Zustand vs Jotai vs Recoil

这三个都处理客户端状态，但模型不同。服务端缓存、分页、重试和失效仍应优先用 TanStack Query/RTK Query，而不是放进这些本地 store。

### Zustand：store + selector
```tsx
const useStore = create<{ count: number; increment: () => void }>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}))

const count = useStore((state) => state.count)
```

适合中小型应用、全局 UI 状态、简单业务状态。优点是 API 少、学习成本低；缺点是约束少，大团队需要自己建立 store 拆分、action 命名和持久化规范。

### Jotai：原子化状态
```tsx
const countAtom = atom(0)
const doubleAtom = atom((get) => get(countAtom) * 2)

function Counter() {
  const [count, setCount] = useAtom(countAtom)
  const double = useAtomValue(doubleAtom)
  return <button onClick={() => setCount((value) => value + 1)}>{count}/{double}</button>
}
```

Jotai 适合细粒度依赖、派生状态多、局部组合复杂的场景。原子之间自然形成依赖图，组件只订阅用到的 atom。

### Recoil
Recoil 也是 atom/selector 模型，但官方 GitHub 仓库已在 2025-01-01 归档，新项目不建议再选。已有项目应评估迁移到 Jotai、Zustand、Redux Toolkit 或框架内置方案。

### 对比
| 维度 | Zustand | Jotai | Recoil |
|--|--|--|--|
| 模型 | 集中 store + selector | atom 依赖图 | atom/selector |
| 心智 | 简单直接 | 更函数式、细粒度 | 类似 Jotai 但生态停滞 |
| 适合 | 全局 UI/业务状态 | 复杂派生和局部组合 | 旧项目维护 |
| DevTools/中间件 | 成熟，需按需接入 | 有生态支持 | 不建议新选 |

选择建议：需要一个简单全局 store 选 Zustand；需要原子级组合和派生状态选 Jotai；需要强流程治理和团队规范选 Redux Toolkit。

<!-- id: react-052; difficulty: 3; tags: 竞态条件, 异步, AbortController, useEffect; source: 高频 -->
# React 中如何处理竞态条件（Race Condition）？

## React 竞态条件处理

竞态常见于异步请求、搜索输入、路由切换和重复提交：旧请求比新请求更晚返回，覆盖了最新状态。

### 问题示例
```tsx
useEffect(() => {
  fetchUser(userId).then(setUser)
}, [userId])
```

如果用户从 A 快速切到 B，A 的请求最后返回，就可能把 B 的页面覆盖成 A。

### AbortController
```tsx
useEffect(() => {
  const controller = new AbortController()

  fetch(`/api/users/${userId}`, { signal: controller.signal })
    .then((res) => res.json())
    .then(setUser)
    .catch((error) => {
      if (error.name !== 'AbortError') setError(error)
    })

  return () => controller.abort()
}, [userId])
```

取消旧请求可以节省网络和服务端资源，但前提是底层 API 支持 signal。

### 请求序号兜底
```tsx
const requestIdRef = useRef(0)

useEffect(() => {
  const requestId = ++requestIdRef.current

  fetchUser(userId).then((user) => {
    if (requestId === requestIdRef.current) setUser(user)
  })
}, [userId])
```

适合无法真正 abort 的 Promise。

### 使用数据框架
```tsx
const userQuery = useQuery({
  queryKey: ['user', userId],
  queryFn: ({ signal }) => fetchUser(userId, { signal }),
  enabled: Boolean(userId),
})
```

TanStack Query 会按 queryKey 管理缓存和过期请求，但 queryFn 仍应接收 `signal`，并且 mutation 并发、乐观更新冲突仍需业务设计。

### 其他场景
- 搜索输入：debounce + abort + 只接受最后一次结果
- 提交按钮：提交中禁用，或用 idempotency key 防重复提交
- 顺序依赖请求：上一步失败/取消后不要继续下一步
- WebSocket/流式数据：消息带 seq，按版本或时间戳丢弃旧消息

<!-- id: react-053; difficulty: 2; tags: 可访问性, Dialog, ARIA, Portal; source: 高频 -->
# React 中的 Portals 和 Dialog 可访问性实现

## Portals 和 Dialog 可访问性

Portal 只改变 DOM 挂载位置，不自动提供可访问性。Dialog 必须让键盘用户和屏幕阅读器用户都能正确进入、操作和退出。

### 基本结构
```tsx
return createPortal(
  <div className='overlay' onMouseDown={handleOverlayMouseDown}>
    <div
      ref={dialogRef}
      role='dialog'
      aria-modal='true'
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <h2 id={titleId}>{title}</h2>
      <div id={descriptionId}>{children}</div>
      <button type='button' onClick={onClose} aria-label='Close dialog'>Close</button>
    </div>
  </div>,
  document.body,
)
```

### 必做清单
- 打开前保存当前焦点，打开后聚焦 dialog 或第一个可聚焦元素
- 关闭后恢复焦点到触发元素
- Tab/Shift+Tab 焦点陷阱，不让焦点跑到背景
- Escape 关闭，但要允许业务禁用或确认
- 背景内容 inert 或 aria-hidden，避免屏幕阅读器读到背景
- body 滚动锁，且处理滚动条宽度和嵌套弹窗
- 标题和描述用 aria 正确关联
- 点击遮罩关闭不是必需，且不能误关重要确认弹窗

### 常见错误
不要给 `document.body` 整体设置 `aria-hidden='true'` 后再把 dialog portal 到 body 里，否则可能把 dialog 本身也隐藏给辅助技术。应该隐藏应用根节点，或使用 `inert`/成熟库处理。

生产中建议优先使用经过 a11y 验证的 Dialog 实现，手写要用键盘和屏幕阅读器实际测试。

<!-- id: react-054; difficulty: 3; tags: 微前端, Module Federation, qiankun; source: 字节 -->
# micro-frontend 微前端中 React 应用如何集成？

## React 微前端集成

React 微前端常见两条路线：Module Federation 做运行时模块/组件组合，qiankun/single-spa 做应用级生命周期接入。选择取决于组合粒度和团队独立性。

### Module Federation
```js
new ModuleFederationPlugin({
  name: 'host',
  remotes: {
    cart: 'cart@https://cdn.example.com/cart/remoteEntry.js',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^19.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
  },
})
```

```tsx
const CartApp = lazy(() => import('cart/CartApp'))

<ErrorBoundary fallback={<RemoteError />}>
  <Suspense fallback={<Skeleton />}>
    <CartApp user={user} />
  </Suspense>
</ErrorBoundary>
```

远程模块加载失败很常见，必须有超时、降级、错误边界和监控。`remoteEntry.js` 不要长期 immutable，内部 chunk 可 hash 长缓存。

### qiankun 子应用
```tsx
let root: Root | null = null

export async function bootstrap() {}

export async function mount(props: { container?: HTMLElement }) {
  const container = props.container?.querySelector('#root') ?? document.getElementById('root')
  if (!container) throw new Error('root container not found')
  root = createRoot(container)
  root.render(<App {...props} />)
}

export async function unmount() {
  root?.unmount()
  root = null
}
```

### 注意事项
- React/ReactDOM 版本要治理，避免多实例导致 Context、Hooks 和 DevTools 问题
- 样式隔离用 CSS Modules、命名空间、Shadow DOM 或 qiankun 样式隔离能力
- 路由要处理 basename、history 模式和主子应用跳转
- 状态共享优先 props、事件、URL、后端状态；慎用跨应用全局 store
- 子应用卸载要清理 root、定时器、订阅、全局事件和样式副作用
- 权限、埋点、错误监控、发布版本和依赖版本需要统一治理

微前端解决组织和部署问题，但会增加运行时复杂度；单团队单应用不要为了技术新鲜感引入。

<!-- id: react-055; difficulty: 2; tags: 主题, Dark Mode, CSS变量, Context; source: 高频 -->
# React 中如何实现主题切换（Dark Mode）？

## React Dark Mode 主题切换

推荐用 CSS 变量表达设计 token，用 React 管理用户选择。这样主题切换不会要求大量组件重渲染，样式也能覆盖普通 CSS、组件库和伪元素。

### CSS 变量
```css
:root {
  color-scheme: light;
  --bg: #ffffff;
  --text: #111827;
  --primary: #2563eb;
}

[data-theme='dark'] {
  color-scheme: dark;
  --bg: #111827;
  --text: #f9fafb;
  --primary: #60a5fa;
}
```

```css
body {
  background: var(--bg);
  color: var(--text);
}
```

### 避免首屏闪烁
主题应在 React hydration 前就写到 `<html>` 上。可以在 HTML 里放一小段内联脚本，优先读取 localStorage，再回退到系统偏好。

```html
<script>
try {
  const stored = localStorage.getItem('theme')
  const systemDark = matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.dataset.theme = stored || (systemDark ? 'dark' : 'light')
} catch {}
</script>
```

### Provider
```tsx
type Theme = 'light' | 'dark' | 'system'

function applyTheme(theme: Theme) {
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme
  document.documentElement.dataset.theme = resolved
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'system')

  useEffect(() => {
    localStorage.setItem('theme', theme)
    applyTheme(theme)
  }, [theme])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
```

### 系统主题变化
如果用户选择 `system`，需要监听 `prefers-color-scheme` 变化；如果用户明确选择 light/dark，则不要被系统变化覆盖。

### 注意事项
- 使用 `color-scheme` 让浏览器表单控件、滚动条等跟随主题
- 图片、图表、代码高亮也要有暗色资源或配色
- 主题状态不宜造成全应用频繁重渲染，尽量让 CSS 变量承担视觉变化
- Tailwind 可用 `darkMode: 'class'` 或数据属性策略，本质也是切根节点 class/attribute

<!-- id: react-056; difficulty: 1; tags: 单向数据流, 状态提升, Props, React基础; source: 高频 -->
# React 的单向数据流是什么意思？

## 单向数据流

React 的单向数据流指：渲染所需的数据由拥有状态的组件向下传递，子组件通过 props、Context 或外部 store 的订阅读取数据，但不能直接修改父组件的 state 或 props。子组件如果要触发变化，只能通过事件回调、dispatch、mutation 等方式“通知”状态拥有者。

```
状态拥有者
  ↓ props / context
展示组件
  ↑ event callback / dispatch
状态拥有者更新 state 后重新向下渲染
```

### 典型写法
```tsx
function Parent() {
  const [count, setCount] = useState(0)

  return (
    <>
      <CounterValue count={count} />
      <IncrementButton onIncrement={() => setCount((c) => c + 1)} />
    </>
  )
}

function CounterValue({ count }: { count: number }) {
  return <span>{count}</span>
}

function IncrementButton({ onIncrement }: { onIncrement: () => void }) {
  return <button onClick={onIncrement}>+</button>
}
```

### 不能做什么
```tsx
function Child({ user }: { user: { name: string } }) {
  user.name = 'new name' // 不应修改 props 对象
  return null
}
```

props 应被视为只读。对象和数组也不要原地改，否则容易破坏 React 的更新判断和数据可追踪性。

### 状态提升
如果多个子组件需要共享同一份状态，应把状态提升到最近的共同父组件，而不是在每个子组件里复制一份。

```tsx
function TemperaturePanel() {
  const [celsius, setCelsius] = useState(0)
  const fahrenheit = celsius * 9 / 5 + 32

  return (
    <>
      <Input value={celsius} onChange={setCelsius} />
      <Input value={fahrenheit} onChange={(f) => setCelsius((f - 32) * 5 / 9)} />
    </>
  )
}
```

### 面试要点
- “数据向下，事件向上”是最常见的表达。
- 单向数据流解决的是可预测性、调试和状态归属问题，不是说子组件永远不能有本地 state。
- 不要把可从 props/state 推导出的数据重复存一份 state，优先在渲染或 `useMemo` 中派生。
- Context、Redux、Zustand、TanStack Query 也应有明确的数据拥有者；组件仍然通过声明式订阅读取数据。

<!-- id: react-057; difficulty: 2; tags: useInsertionEffect, CSS-in-JS, React 19; source: 高频 -->
# React 中的 useInsertionEffect 有什么用途？

## useInsertionEffect

`useInsertionEffect` 是给 CSS-in-JS 库作者使用的低层 Hook，核心价值是在 layout effects 执行布局读取之前插入动态样式，避免组件已经开始测量布局时样式还没有进入页面。

### 执行时机和限制
- 它发生在 commit 流程中，并早于 `useLayoutEffect`。
- React 不保证此时 DOM 一定已经更新，所以不要读取布局、不要操作 ref。
- refs 在这个阶段还不可靠，不能当成 `useLayoutEffect` 的替代品。
- 不能在其中调度 state 更新。
- 只在客户端执行；SSR 要靠框架或 CSS-in-JS 库提前收集并输出样式。

### 典型用途
```tsx
import { useInsertionEffect } from 'react'

const inserted = new Map<string, HTMLStyleElement>()

function useDynamicStyle(id: string, cssText: string) {
  useInsertionEffect(() => {
    if (inserted.has(id)) return

    const style = document.createElement('style')
    style.dataset.styleId = id
    style.textContent = cssText
    document.head.appendChild(style)
    inserted.set(id, style)

    return () => {
      style.remove()
      inserted.delete(id)
    }
  }, [id, cssText])
}
```

### 和其他 Effect 的区别
- `useEffect`：异步于绘制，适合网络、订阅、日志等普通副作用。
- `useLayoutEffect`：DOM 更新后、浏览器绘制前执行，适合读取布局或同步调整 DOM。
- `useInsertionEffect`：更早，只适合注入样式，通常不应该出现在业务组件里。

### 面试要点
- 它不是“更快的 useLayoutEffect”。
- 它解决的是样式注入顺序问题，不解决数据请求、订阅或布局测量问题。
- 真实 CSS-in-JS 库还要处理去重、样式优先级、SSR 抽取、缓存和卸载时机。

<!-- id: react-058; difficulty: 3; tags: 表格, 排序, 分页, 组件设计; source: 高频 -->
# 如何实现一个通用的 React 表格组件（支持排序、分页、筛选）？

## 通用 React 表格组件

真实项目里优先评估 TanStack Table、AG Grid 这类成熟方案；面试手写时，重点不是堆 JSX，而是把列定义、状态、数据处理管线和可访问性交代清楚。

### 类型设计
```tsx
type SortDirection = 'asc' | 'desc'

type SortState<T> = {
  key: keyof T
  direction: SortDirection
} | null

type Column<T> = {
  key: keyof T
  header: React.ReactNode
  accessor?: (row: T) => unknown
  cell?: (value: unknown, row: T) => React.ReactNode
  sortable?: boolean
  filter?: (row: T, value: string) => boolean
  width?: number | string
}

type TableState<T> = {
  pageIndex: number
  pageSize: number
  sort: SortState<T>
  filters: Partial<Record<keyof T, string>>
}

type DataTableProps<T> = {
  data: T[]
  columns: Column<T>[]
  getRowId: (row: T) => string
  loading?: boolean
  total?: number
  state?: TableState<T>
  onStateChange?: (state: TableState<T>) => void
  manual?: boolean // true 时排序/筛选/分页交给服务端
}
```

### 核心实现
```tsx
function DataTable<T>({ data, columns, getRowId, loading, total, manual = false }: DataTableProps<T>) {
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [sort, setSort] = useState<SortState<T>>(null)
  const [filters, setFilters] = useState<Partial<Record<keyof T, string>>>({})

  const rows = useMemo(() => {
    if (manual) return data

    const filtered = data.filter((row) =>
      columns.every((column) => {
        const value = filters[column.key]
        if (!value) return true
        if (column.filter) return column.filter(row, value)
        const raw = column.accessor ? column.accessor(row) : row[column.key]
        return String(raw ?? '').toLowerCase().includes(value.toLowerCase())
      }),
    )

    const sorted = sort
      ? [...filtered].sort((a, b) => {
          const aValue = columns.find((c) => c.key === sort.key)?.accessor?.(a) ?? a[sort.key]
          const bValue = columns.find((c) => c.key === sort.key)?.accessor?.(b) ?? b[sort.key]
          const result = String(aValue ?? '').localeCompare(String(bValue ?? ''), 'zh-CN', {
            numeric: true,
          })
          return sort.direction === 'asc' ? result : -result
        })
      : filtered

    return sorted.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
  }, [columns, data, filters, manual, pageIndex, pageSize, sort])

  const toggleSort = (key: keyof T) => {
    setPageIndex(0)
    setSort((prev) => {
      if (prev?.key !== key) return { key, direction: 'asc' }
      if (prev.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  if (loading) return <TableSkeleton columns={columns.length} rows={pageSize} />

  return (
    <>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} aria-sort={sort?.key === column.key ? sort.direction : 'none'}>
                {column.sortable ? (
                  <button type="button" onClick={() => toggleSort(column.key)}>
                    {column.header}
                  </button>
                ) : column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowId(row)}>
              {columns.map((column) => {
                const value = column.accessor ? column.accessor(row) : row[column.key]
                return <td key={String(column.key)}>{column.cell ? column.cell(value, row) : String(value ?? '')}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination
        pageIndex={pageIndex}
        pageSize={pageSize}
        total={total ?? data.length}
        onPageChange={setPageIndex}
        onPageSizeChange={(next) => {
          setPageSize(next)
          setPageIndex(0)
        }}
      />
    </>
  )
}
```

### 工程要点
- 列配置要稳定，最好在调用方 `useMemo`，否则大表容易重复计算。
- 排序、筛选、分页的顺序通常是 filter -> sort -> paginate。
- 数据量大或来自后端时使用 `manual` 模式，把表格状态同步到 URL 或请求参数。
- 行 key 必须来自业务 id，不要用数组 index。
- 排序按钮要可键盘操作，并用 `aria-sort` 表达当前排序状态。
- 要有 loading、empty、error、列宽、固定表头、虚拟滚动、行选择等可扩展点；大数据滚动优先接 `@tanstack/react-virtual`。

<!-- id: react-059; difficulty: 2; tags: Context, 性能优化, 重渲染; source: 高频 -->
# React 中如何优化 Context 导致的性能问题？

## Context 性能优化

Context 的性能问题通常来自两点：Provider 的 `value` 每次渲染都创建新引用，以及一个大 Context 混合了多个更新频率完全不同的字段。只要某个 Consumer 读取了这个 Context，Provider value 变化时它就会重新渲染；`React.memo` 不能阻止 context 更新触发的渲染。

### 1. 稳定 Provider value
```tsx
const AuthContext = createContext<AuthContextValue | null>(null)

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const value = useMemo(() => ({ user, setUser }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

`useMemo` 只能避免“父组件无关重渲染导致 value 新建”。如果 `user` 真的变了，所有读取 `AuthContext` 的组件仍会更新。

### 2. 按职责和更新频率拆分 Context
```tsx
const ThemeContext = createContext<'light' | 'dark'>('light')
const CurrentUserContext = createContext<User | null>(null)
const NotificationCountContext = createContext(0)
```

主题、用户信息、未读数不要塞进同一个对象。低频配置适合 Context，高频变化的数据更适合外部 store 或局部 state。

### 3. 拆分读写 Context
```tsx
const CountStateContext = createContext(0)
const CountDispatchContext = createContext<React.Dispatch<React.SetStateAction<number>>>(() => {})

function CountProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0)

  return (
    <CountDispatchContext.Provider value={setCount}>
      <CountStateContext.Provider value={count}>{children}</CountStateContext.Provider>
    </CountDispatchContext.Provider>
  )
}

function AddButton() {
  const setCount = useContext(CountDispatchContext)
  return <button onClick={() => setCount((count) => count + 1)}>Add</button>
}
```

只需要 dispatch 的组件不会因为 `count` 变化而更新。

### 4. Selector 或外部 Store
React 内置 `useContext` 没有 selector 能力。需要只订阅对象的一小部分时，可以使用 `use-context-selector`、Zustand、Redux，或基于 `useSyncExternalStore` 的 store。

```tsx
const count = useStore((state) => state.count)
```

这样只有 selector 的结果变化时才重新渲染。

### 5. 降低 Provider 覆盖面
不要把频繁变化的 Provider 包住整个应用。把 Provider 下沉到真正需要的子树，或把高频交互状态放回离使用处最近的位置。

### 判断标准
- 全局、低频、配置类数据：Context 合适。
- 高频、细粒度订阅、复杂派生状态：优先外部 store。
- 远程数据：优先 TanStack Query / SWR，不要手写一个巨大的 ServerDataContext。

<!-- id: react-060; difficulty: 2; tags: useOptimistic, 乐观更新, React 19, Action; source: 高频 -->
# React 中的 useOptimistic 有什么用途？

## useOptimistic

`useOptimistic` 用来在异步 Action 还没完成时，先把“预期成功”的结果展示给用户。它适合评论发送、点赞、关注、收藏这类失败成本较低、用户期望即时反馈的交互。

### API 模型
```tsx
const [optimisticState, addOptimistic] = useOptimistic(state, updateFn)
```

- `state` 是权威状态，通常来自父组件、服务端响应或查询缓存。
- `updateFn(currentState, optimisticValue)` 必须是纯函数，用来计算临时状态。
- `addOptimistic(value)` 会叠加一个乐观更新；Action 完成后 UI 会回到权威状态对应的结果。
- `addOptimistic` 应在 Action 或 Transition 中触发，否则容易出现乐观更新上下文不稳定的问题。

### 表单示例
```tsx
function MessageThread({ messages, sendMessage }: Props) {
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (current, text: string) => [
      ...current,
      { id: `temp-${crypto.randomUUID()}`, text, status: 'sending' },
    ],
  )

  async function formAction(formData: FormData) {
    const text = String(formData.get('message') ?? '').trim()
    if (!text) return

    addOptimisticMessage(text)
    await sendMessage(text)
  }

  return (
    <>
      <form action={formAction}>
        <input name="message" />
        <button type="submit">Send</button>
      </form>
      {optimisticMessages.map((message) => (
        <p key={message.id}>{message.text}</p>
      ))}
    </>
  )
}
```

### 和手写 loading state 的区别
手写 `isSubmitting` 只能告诉用户“正在提交”；`useOptimistic` 可以先把提交后的 UI 状态渲染出来，并在权威数据回来后自动以真实数据为准。

### 工程注意点
- 乐观 UI 不是数据落库，最终结果必须以服务端或权威缓存为准。
- 失败时要展示错误、回滚到权威状态，并提供重试入口。
- 新增列表项要用临时 id，成功后再用真实 id 替换，避免 key 抖动。
- 高风险操作如支付、转账、审批、不可恢复删除，不应只靠乐观 UI 表达成功。
- 使用 TanStack Query、SWR、RTK Query 时，也可以在 mutation 层做乐观更新；`useOptimistic` 更偏向组件局部的 Action 体验。

<!-- id: react-061; difficulty: 3; tags: 渲染流程, Fiber, Commit, 底层原理; source: 高频 -->
# React 渲染流程完整梳理（从 JSX 到屏幕）

## React 渲染流程：从 JSX 到屏幕

### 1. 编译 JSX
JSX 不是浏览器语法，会被构建工具编译成 React Element 创建调用。React 17+ 的新 JSX transform 通常会编译成 `jsx/jsxs` runtime 调用，而不一定是 `React.createElement`。

```tsx
const element = <button className="primary">Save</button>
```

React Element 是普通不可变对象，描述“想要的 UI”，还不是 DOM。

### 2. 触发更新
常见触发源包括：
- 初次 `createRoot(container).render(<App />)`
- `setState` / `dispatch`
- Context value 变化
- 外部 store 通过 `useSyncExternalStore` 通知
- Suspense 数据就绪、transition 更新继续执行

React 会给更新分配优先级或 lane，然后调度 work。

### 3. Render / Reconciliation 阶段
Render 阶段负责计算下一棵 Fiber 树，通常可中断、可恢复、可丢弃。

```text
current fiber tree
        ↓
workInProgress fiber tree
        ↓
beginWork -> completeWork
```

- 函数组件：调用组件函数，按顺序执行 Hooks。
- 类组件：执行生命周期和 `render`。
- Host 组件：处理 DOM 节点类型、props 和 children。
- Diff：同层比较 type 和 key，决定复用、插入、移动、删除。
- Bailout：props、state、context 和 lanes 都不需要更新时可跳过子树。

这一阶段不能做真实 DOM 修改，也不应该有副作用；组件渲染函数应保持纯净。

### 4. Commit 阶段
Commit 阶段把 render 阶段算出的变更提交到宿主环境，不可中断。

```text
before mutation -> mutation -> layout -> passive effects
```

- Before mutation：读取 DOM 变更前快照，如类组件 `getSnapshotBeforeUpdate`。
- Mutation：插入、删除、更新真实 DOM，处理 ref detach。
- Layout：DOM 已更新、浏览器绘制前，执行 `useLayoutEffect` cleanup/setup 和 ref attach。
- Passive effects：提交后调度 `useEffect` cleanup/setup，通常在绘制后执行；交互触发的更新可能有更早的 flush 行为，不应依赖精确事件循环时机。

### 5. 浏览器渲染
浏览器根据最终 DOM 和 CSS 进行 style、layout、paint、composite。React 负责把 UI 变更提交给 DOM，真正像素绘制由浏览器完成。

### 示例
```tsx
function Counter() {
  const [count, setCount] = useState(0)

  useLayoutEffect(() => {
    // DOM 已经更新，适合读取尺寸或同步调整布局
  }, [count])

  useEffect(() => {
    document.title = String(count)
  }, [count])

  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>
}
```

### 面试总结
一句话：更新先进入调度系统，Render 阶段生成新的 Fiber 和副作用标记，Commit 阶段把变更同步提交到 DOM，随后浏览器绘制并执行 passive effects。

<!-- id: react-062; difficulty: 1; tags: 合成事件, 事件委托, 事件系统; source: 高频 -->
# React 中的事件系统和合成事件

## React 事件系统和合成事件

React 给浏览器事件包了一层 `SyntheticEvent`，对外提供一致的事件对象、事件命名和冒泡/捕获行为，同时在内部接入更新优先级系统。

### 事件委托
React 17 以后，事件主要委托到 React root 容器，而不是 `document`。这样多个 React root 或渐进升级场景更容易隔离。

```text
DOM event -> root listener -> React 找到对应 Fiber -> capture/bubble 调用组件 handler
```

好处是减少监听器数量、统一浏览器差异，并让 React 能根据事件类型安排更新优先级，例如 click、keydown 这类离散事件通常优先级更高。

### SyntheticEvent
```tsx
function Button() {
  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    console.log(event.type)
    console.log(event.target)        // 真实触发事件的元素
    console.log(event.currentTarget) // 当前绑定 handler 的元素
    console.log(event.nativeEvent)   // 原生事件

    event.preventDefault()
    event.stopPropagation()
  }

  return <button onClick={handleClick}>Click</button>
}
```

React 17+ 不再池化事件对象，异步读取事件字段不再需要 `event.persist()`。

### 命名和阶段
```tsx
<button onClick={handleClick} />
<button onClickCapture={handleCapture} />
<input onChange={handleChange} />
<form onSubmit={handleSubmit} />
```

- React 事件名使用驼峰。
- `onXxxCapture` 走捕获阶段，`onXxx` 走冒泡阶段。
- `return false` 不会阻止默认行为或冒泡，需要显式调用 `preventDefault` / `stopPropagation`。
- `onScroll` 在 React 17+ 中不再像多数事件那样冒泡。

### 与原生事件混用
```tsx
useEffect(() => {
  const handler = (event: MouseEvent) => {}
  document.addEventListener('click', handler)
  return () => document.removeEventListener('click', handler)
}, [])
```

混用时要注意执行顺序和传播边界：如果原生监听器在事件到达 React root 之前调用了 `stopPropagation`，React 的合成事件可能收不到；Portal 中的事件会按 React 组件树冒泡，而不完全等同于 DOM 树。

<!-- id: react-063; difficulty: 2; tags: useTransition, Suspense, 并发, React 18; source: 高频 -->
# React 中的 Transition 和 Suspense 如何配合使用？

## Transition 和 Suspense 配合

Suspense 负责在子树“还没准备好”时显示 fallback；Transition 负责把某些更新标记为非紧急更新。二者配合后，React 可以在新内容挂起时继续保留旧 UI，而不是立刻用 loading 替换已经显示的内容。

### 典型场景：Tab 切换
```tsx
function App() {
  const [tab, setTab] = useState<'home' | 'posts'>('home')
  const [isPending, startTransition] = useTransition()

  function selectTab(nextTab: 'home' | 'posts') {
    startTransition(() => {
      setTab(nextTab)
    })
  }

  return (
    <>
      <nav>
        <button onClick={() => selectTab('home')}>Home</button>
        <button onClick={() => selectTab('posts')}>Posts</button>
      </nav>

      {isPending ? <span>Updating...</span> : null}

      <Suspense fallback={<PageSkeleton />}>
        <div style={{ opacity: isPending ? 0.6 : 1 }}>
          <TabContent tab={tab} />
        </div>
      </Suspense>
    </>
  )
}
```

如果 `TabContent` 在渲染 posts 时挂起，且这个更新来自 Transition，React 会尽量继续展示旧 tab，并用 `isPending` 给用户轻量反馈。等数据或代码准备好后，再提交新 UI。

### 数据加载示例
```tsx
function PostsTab() {
  const { data } = useSuspenseQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  })

  return <PostList posts={data} />
}
```

Suspense 数据源通常来自框架、React Query 的 suspense API、Relay，或支持 Suspense 的资源封装；普通 `useEffect` 请求不会自动让组件 Suspense。

### 工作机制
1. `startTransition` 标记 tab 更新为 Transition。
2. React 开始渲染新 tab，期间可被更紧急的输入打断。
3. 新子树遇到 Suspense 挂起。
4. 如果已有旧内容可显示，React 避免立刻展示 fallback，继续保留旧 UI。
5. `isPending` 为 `true`，可以展示轻量 pending 状态。
6. 数据就绪后提交新 UI。

### 注意事项
- 初次加载没有旧 UI 可保留时，仍会显示 Suspense fallback。
- 受控输入的值更新不能放进 Transition，否则输入会滞后。
- `startTransition(async () => { await ...; setState(...) })` 中，`await` 之后的更新需要再次包一层 `startTransition` 才能保持 Transition 标记。
- 粗粒度 fallback 会造成整块 UI 闪烁，真实项目应拆分 Suspense 边界。

<!-- id: react-064; difficulty: 1; tags: 性能优化, 重渲染, React.memo, useCallback; source: 高频 -->
# React 中如何避免子组件的不必要重渲染？

## 避免子组件不必要重渲染

先用 React DevTools Profiler 确认瓶颈，再优化。很多重渲染成本很低，盲目加 `memo/useCallback/useMemo` 反而会增加复杂度。

### 常见原因
- 父组件重渲染，默认会重新调用子组件。
- 子组件自己的 state 更新。
- props 引用变化，例如新的对象、数组、函数。
- 子组件读取的 Context value 变化。
- 外部 store selector 返回了新引用。

### 1. 缩小 state 影响范围
把状态放在真正需要它的最小子树里。

```tsx
function Page() {
  return (
    <>
      <HeavyChart />
      <SearchBox />
    </>
  )
}

function SearchBox() {
  const [keyword, setKeyword] = useState('')
  return <input value={keyword} onChange={(event) => setKeyword(event.target.value)} />
}
```

输入状态不放在 `Page`，`HeavyChart` 就不会因为每次输入而重新渲染。

### 2. React.memo
```tsx
const UserRow = memo(function UserRow({ user, onSelect }: Props) {
  return <button onClick={() => onSelect(user.id)}>{user.name}</button>
})
```

`React.memo` 对 props 做浅比较。它不能阻止组件自身 state、读取的 Context、外部 store 变化导致的渲染。

### 3. 稳定函数和对象引用
```tsx
function UserList({ users }: { users: User[] }) {
  const handleSelect = useCallback((id: string) => {
    console.log(id)
  }, [])

  const rowStyle = useMemo(() => ({ minHeight: 40 }), [])

  return users.map((user) => (
    <UserRow key={user.id} user={user} style={rowStyle} onSelect={handleSelect} />
  ))
}
```

只有当子组件被 `memo` 包裹，且引用变化确实导致了重渲染时，`useCallback/useMemo` 才有明显价值。

### 4. 拆分 Context 或使用 selector
一个大 Context 的 value 变化会让所有 Consumer 更新。可以拆 Context、拆读写 Provider，或使用 Zustand/Redux/use-context-selector 这类 selector 订阅。

```tsx
const count = useCounterStore((state) => state.count)
```

### 5. 组合而不是层层透传状态
把不受局部状态影响的内容作为 `children` 传入，让内部状态变化局限在容器组件内。

```tsx
function Panel({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return <section>{open ? children : null}</section>
}
```

如果 `Panel` 自己更新，而父组件没有重新渲染，传入的 `children` React Element 引用可以保持不变。

### 6. 列表专项优化
- key 使用稳定业务 id。
- 大列表使用虚拟滚动。
- 行组件拆出来并 `memo`。
- 避免在 map 中创建昂贵派生数据，提前 memo 或放到 selector 中。

### React Compiler
React Compiler 可以自动做一部分缓存优化，但不能替代正确的状态归属、Context 拆分和列表虚拟化。

<!-- id: react-065; difficulty: 3; tags: Hooks原理, 链表, Fiber, 底层实现; source: 字节 -->
# 详解 React Hooks 的实现原理（链表结构）

## React Hooks 链表实现原理

Hooks 不是按变量名保存的，而是按调用顺序挂在当前函数组件对应的 Fiber 上。函数组件的 Fiber 有 `memoizedState` 字段，指向 Hook 单向链表的头节点。

### Hook 节点结构
简化后可以理解为：

```ts
type Hook = {
  memoizedState: unknown
  baseState: unknown
  baseQueue: Update | null
  queue: UpdateQueue | null
  next: Hook | null
}

fiber.memoizedState = firstHook
```

不同 Hook 的 `memoizedState` 含义不同：
- `useState/useReducer`：当前 state。
- `useMemo/useCallback`：缓存值和依赖数组。
- `useRef`：稳定的 ref 对象。
- `useEffect/useLayoutEffect`：effect 描述对象；effect 链通常也会挂到 Fiber 的 updateQueue 上，供 commit 阶段执行。

### Mount 和 Update 两套 dispatcher
首次渲染时，React 使用 mount dispatcher：每调用一个 Hook，就创建一个 Hook 节点并追加到链表。

更新渲染时，React 使用 update dispatcher：每调用一个 Hook，就从旧 Fiber 的 Hook 链表中按顺序取出对应节点，克隆到 workInProgress Fiber，并处理更新队列。

```text
第一次渲染：useState -> useEffect -> useMemo
第二次渲染：必须仍然是 useState -> useEffect -> useMemo
```

这就是 Hooks 不能放在条件、循环、提前 return 之后的根本原因：React 用“第几个 Hook”匹配状态，而不是用变量名匹配。

### useState 简化流程
```ts
let currentlyRenderingFiber: Fiber
let workInProgressHook: Hook | null = null
let currentHook: Hook | null = null

function mountState<S>(initialState: S | (() => S)) {
  const hook = mountWorkInProgressHook()
  hook.memoizedState = typeof initialState === 'function' ? initialState() : initialState
  hook.queue = { pending: null }

  const dispatch = (action: S | ((prev: S) => S)) => {
    enqueueUpdate(hook.queue, { action, lane: requestUpdateLane() })
    scheduleUpdateOnFiber(currentlyRenderingFiber)
  }

  return [hook.memoizedState, dispatch]
}

function updateState<S>() {
  const hook = updateWorkInProgressHook()
  const queue = hook.queue
  let state = hook.baseState

  for (const update of collectUpdates(queue)) {
    state = typeof update.action === 'function' ? update.action(state) : update.action
  }

  hook.memoizedState = state
  hook.baseState = state
  return [state, queue.dispatch]
}
```

真实实现更复杂：更新队列是循环链表，会结合 lanes 跳过低优先级更新，并保留 `baseQueue/baseState` 供后续 render 继续处理。

### useEffect 的执行
`useEffect` 在 render 阶段只是登记 effect 和依赖；真正 cleanup/setup 在 commit 后的 passive effects 阶段执行。依赖数组比较使用 `Object.is`，依赖未变时可以跳过 effect 重建。

### 闭包问题
每次渲染都是一次新的函数调用，事件处理器会捕获当次渲染里的变量。

```tsx
function Counter() {
  const [count, setCount] = useState(0)

  function delayLog() {
    setTimeout(() => console.log(count), 1000)
  }

  return <button onClick={() => setCount((count) => count + 1)}>Add</button>
}
```

异步回调里读到的是创建回调时那次 render 的 `count`。解决方式包括函数式更新、把最新值写入 ref，或使用能避免陈旧闭包的事件 API/封装。

### 面试总结
Hooks 的核心是 Fiber 上的有序链表、更新队列和 dispatcher。规则“只能在组件顶层调用 Hook”不是风格要求，而是保证链表顺序稳定的必要条件。
