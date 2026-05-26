---
id: vue-001
module: Vue
difficulty: 1
tags: [Vue, 入门, createApp]
source: 高频
---
## 题目
Vue 3 应用是如何创建和挂载的？`createApp` 做了什么？

## 答案
## Vue 3 应用创建流程

Vue 3 通过 `createApp` 创建一个应用实例，再通过 `mount` 挂载到 DOM 容器。应用实例是配置全局能力的入口，例如注册插件、全局组件、指令、错误处理和全局属性。

```ts
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './stores'

const app = createApp(App)

app.use(router)
app.use(pinia)
app.mount('#app')
```

### `createApp` 的作用

1. 接收根组件，创建独立的 app context。
2. 管理 `app.use`、`app.component`、`app.directive`、`app.provide` 等全局配置。
3. 在 `mount` 时创建根组件实例、生成响应式渲染 effect，并把虚拟 DOM patch 到真实 DOM。

Vue 2 常见的 `new Vue({ render }).$mount()` 是全局构造器思路；Vue 3 的 app 实例更利于多个应用共存，也减少全局配置互相污染。

### 面试总结

可以概括为：`createApp` 创建应用上下文，`use/component/directive/provide` 配置应用级能力，`mount` 才真正启动根组件渲染并接管容器。

---
id: vue-002
module: Vue
difficulty: 1
tags: [模板语法, 指令, 数据绑定]
source: 高频
---
## 题目
Vue 模板语法和常用指令有哪些？`v-bind`、`v-on`、`v-if`、`v-for` 分别解决什么问题？

## 答案
## Vue 模板语法

Vue 模板是声明式 UI 描述。模板会被编译成 render 函数，render 函数读取响应式状态并返回虚拟 DOM。常用语法包括插值、属性绑定、事件绑定、条件渲染和列表渲染。

```vue
<template>
  <button
    :class="{ active: selected }"
    :disabled="loading"
    @click="submit"
  >
    {{ loading ? '提交中' : title }}
  </button>
</template>
```

### 常用指令

- `v-bind`：绑定属性，简写为 `:`，例如 `:id="userId"`。
- `v-on`：绑定事件，简写为 `@`，例如 `@click="save"`。
- `v-if` / `v-else-if` / `v-else`：按条件创建或销毁节点。
- `v-show`：按条件切换 `display`，节点仍保留。
- `v-for`：遍历数组或对象，列表必须提供稳定 `key`。
- `v-model`：表单双向绑定，组件上会展开为 prop 和 update 事件。

### 注意点

模板表达式只能写单个 JavaScript 表达式，不适合写复杂业务逻辑；复杂逻辑应放到 `computed`、方法或 composable 中。模板里也不应该调用有副作用的函数，否则每次渲染都可能重复执行。

两个容易被追问的细节：

1. Vue 3.4+ 支持 `v-bind` 同名简写，例如 `:id` 等价于 `:id="id"`。
2. 不推荐在同一个元素上同时写 `v-if` 和 `v-for`。Vue 3 中 `v-if` 优先级更高，通常应先用 `computed` 过滤列表，或把 `v-if` 放到外层 `<template>` 上。

---
id: vue-003
module: Vue
difficulty: 1
tags: [响应式, ref, reactive]
source: 高频
---
## 题目
`ref` 和 `reactive` 有什么区别？什么时候用哪个？

## 答案
## `ref` vs `reactive`

`ref` 用一个带 `.value` 的对象包装值，适合原始类型、可能整体替换的值，以及需要解构或跨函数传递的状态。`reactive` 返回对象的 Proxy，适合描述一组稳定引用的对象状态。

```ts
import { reactive, ref } from 'vue'

const count = ref(0)
count.value++

const form = reactive({
  name: '',
  age: 18,
})
form.name = 'Alice'
```

### 关键区别

1. `ref` 在脚本中读写要用 `.value`，模板中会自动解包。
2. `reactive` 只能代理对象、数组、Map、Set 等引用类型。
3. `reactive` 不适合整体替换，否则旧引用上的依赖不会跟着新对象走。
4. 解构 `reactive` 对象会丢失响应式连接，除非使用 `toRefs` / `toRef`。

### 选择建议

简单值、异步数据、组件间返回值优先用 `ref`；表单对象、复杂配置对象可以用 `reactive`。团队项目里常见实践是“默认 `ref`，需要对象聚合时再用 `reactive`”，这样更利于类型推断和拆分逻辑。

---
id: vue-004
module: Vue
difficulty: 1
tags: [computed, watch, watchEffect]
source: 高频
---
## 题目
`computed`、`watch` 和 `watchEffect` 的区别是什么？

## 答案
## 三者定位

`computed` 用来声明可缓存的派生状态；`watch` 用来监听明确的数据源并执行副作用；`watchEffect` 会自动收集同步执行期间读到的响应式依赖，适合依赖较简单的副作用。

```ts
const keyword = ref('')
const list = ref<Item[]>([])

const filtered = computed(() =>
  list.value.filter((item) => item.name.includes(keyword.value)),
)

watch(keyword, async (next, prev) => {
  console.log('keyword changed', prev, next)
})

watchEffect(() => {
  document.title = `${filtered.value.length} results`
})
```

### 核心区别

- `computed` 有返回值、惰性求值、依赖不变时复用缓存。
- `watch` 默认懒执行，能拿到新旧值，可控制 `immediate`、`deep`、`flush` 等选项。
- `watchEffect` 默认立即执行，不需要显式声明依赖，但依赖来源不如 `watch` 清晰；异步 effect 中只有 `await` 之前同步读到的依赖会被自动追踪。

### 面试表达

如果目标是“算出一个值”，用 `computed`；如果目标是“数据变了以后做某件事”，用 `watch`；如果副作用依赖很直观，并且希望 Vue 自动追踪依赖，可以用 `watchEffect`。

---
id: vue-005
module: Vue
difficulty: 1
tags: [条件渲染, v-if, v-show]
source: 高频
---
## 题目
`v-if` 和 `v-show` 有什么区别？如何选择？

## 答案
## `v-if` 和 `v-show`

`v-if` 是真正的条件渲染，条件为假时对应节点和组件实例不会存在；`v-show` 总会渲染节点，只是通过 CSS `display` 控制显示隐藏。

```vue
<UserPanel v-if="isLogin" />
<UserPanel v-show="isLogin" />
```

### 差异

1. 初始渲染：`v-if` 为假时不创建节点，初始成本低；`v-show` 会先创建节点。
2. 切换成本：`v-if` 切换会创建/销毁组件和事件监听；`v-show` 只改样式，切换成本低。
3. 生命周期：`v-if` 会触发组件挂载和卸载；`v-show` 不会反复触发子组件生命周期。
4. 适用对象：`v-show` 不能用于 `<template>`，也不能和 `v-else` 配合。

### 选择建议

条件很少变化、权限控制、登录后才展示的模块用 `v-if`；频繁切换的 tab、下拉面板、折叠区域可用 `v-show`。如果隐藏时需要释放资源，例如停止定时器或销毁重型图表，优先考虑 `v-if`。

---
id: vue-006
module: Vue
difficulty: 1
tags: [列表渲染, key, diff]
source: 高频
---
## 题目
`v-for` 中 `key` 的作用是什么？为什么不推荐用数组下标作为 key？

## 答案
## `key` 的作用

`key` 用来告诉 Vue 列表中每个节点的稳定身份。更新列表时，Vue 会根据 `key` 判断节点是复用、移动、插入还是删除，从而保持组件状态和 DOM 状态正确。

```vue
<li v-for="todo in todos" :key="todo.id">
  <TodoItem :todo="todo" />
</li>
```

### 为什么不推荐 index

数组下标不是业务身份。列表插入、删除、排序后，同一个 index 可能对应不同数据，Vue 可能复用错组件实例，导致输入框值、焦点、动画状态或子组件本地状态错位。

```vue
<!-- 不推荐：排序或插入后身份会漂移 -->
<li v-for="(todo, index) in todos" :key="index" />
```

### 合理 key

优先使用后端 id、唯一编码、稳定 slug 等业务唯一值。只有列表完全静态、不排序、不插入、不删除，且子项没有本地状态时，index 才勉强可接受。

两个细节也容易被问到：`key` 应使用字符串、数字或 symbol 这类原始值，不要用对象；如果使用 `<template v-for>` 包裹多个节点，Vue 3 中 `key` 应放在 `<template>` 上。

---
id: vue-007
module: Vue
difficulty: 1
tags: [class, style, 绑定]
source: 高频
---
## 题目
Vue 中如何绑定 class 和 style？对象写法和数组写法有什么使用场景？

## 答案
## class 和 style 绑定

Vue 使用 `v-bind` 动态绑定属性，`class` 和 `style` 有增强语法，支持字符串、对象和数组，方便根据状态组合样式。

```vue
<button
  :class="[
    'btn',
    sizeClass,
    { active: selected, disabled: loading },
  ]"
  :style="{ color: textColor, fontSize: `${fontSize}px` }"
>
  Save
</button>
```

### 对象写法

对象适合表达“某个 class 是否启用”。

```vue
<div :class="{ error: hasError, pending: loading }" />
```

### 数组写法

数组适合组合多个来源，例如基础 class、计算后的 class、条件对象。

```vue
<div :class="['card', variantClass, { selected }]" />
```

### 最佳实践

复杂样式逻辑可以放到 `computed` 中，避免模板过长。对于组件库，常把尺寸、变体、状态映射成 class，而不是大量内联 style；内联 style 更适合动态数值，例如拖拽位置、图表尺寸或主题变量。

---
id: vue-008
module: Vue
difficulty: 1
tags: [v-model, 表单, 双向绑定]
source: 高频
---
## 题目
Vue 表单中的 `v-model` 是如何工作的？在不同表单控件上有什么差异？

## 答案
## `v-model` 的本质

`v-model` 是表单值绑定和事件监听的语法糖。它会根据控件类型绑定不同属性并监听不同事件，帮你把用户输入同步到响应式状态。

```vue
<input v-model="name" />
<textarea v-model="bio" />
<input type="checkbox" v-model="checked" />
<select v-model="city">
  <option value="sh">Shanghai</option>
</select>
```

### 常见控件差异

- 文本框、文本域：绑定 `value`，监听 `input`。
- checkbox 单个布尔值：绑定 `checked`。
- checkbox 多选数组：根据 `value` 加入或移出数组。
- radio：用 `value` 和当前模型值比较。
- select：使用选中 option 的 value。

### 值来源和值绑定

`v-model` 会把 JavaScript 状态当作真实数据源，忽略表单元素上初始写死的 `value`、`checked`、`selected`。如果需要非字符串值，可以用 `v-bind` 绑定：

```vue
<input type="radio" v-model="picked" :value="user.id" />
<option :value="{ id: 1, name: 'Vue' }">Vue</option>
<input type="checkbox" v-model="toggle" true-value="yes" false-value="no" />
```

`true-value` / `false-value` 是 Vue 针对 checkbox 的扩展，只影响模型值，不等同于原生表单提交里的 `value`。

### 修饰符

```vue
<input v-model.trim="name" />
<input v-model.number="age" />
<input v-model.lazy="keyword" />
```

`trim` 去除首尾空白，`number` 尝试转数字，`lazy` 从 `input` 改为 `change` 时同步。真实项目中，复杂校验不要只依赖修饰符，应该配合表单校验层处理。

---
id: vue-009
module: Vue
difficulty: 1
tags: [事件处理, 修饰符, 模板]
source: 高频
---
## 题目
Vue 事件绑定有哪些常用修饰符？为什么推荐使用修饰符而不是在方法里写 DOM 细节？

## 答案
## 事件绑定

Vue 用 `v-on` 绑定事件，简写为 `@`。事件处理器可以是方法名，也可以是简单内联表达式。

```vue
<button @click="save">Save</button>
<button @click="count++">Add</button>
```

### 常用修饰符

```vue
<form @submit.prevent="submit" />
<button @click.stop="select" />
<div @click.self="close" />
<input @keyup.enter="submit" />
<button @click.once="init" />
<div @scroll.passive="onScroll" />
```

- `.prevent`：调用 `event.preventDefault()`。
- `.stop`：阻止冒泡。
- `.self`：只在事件目标是当前元素时触发。
- `.once`：只触发一次。
- `.capture`：捕获阶段监听。
- `.passive`：声明不会调用 `preventDefault`，常用于滚动优化。

### 注意事项

修饰符可以链式组合，但顺序会影响生成代码，例如 `@click.prevent.self` 和 `@click.self.prevent` 的作用范围不同。不要把 `.passive` 和 `.prevent` 一起使用，因为 `.passive` 已经告诉浏览器监听器不会阻止默认行为。

### 设计价值

修饰符把 DOM 事件细节留在模板里，业务方法只关心业务动作，例如 `submit`、`select`、`close`。这样方法更容易复用和测试，也减少事件对象在业务逻辑中到处传递。

---
id: vue-010
module: Vue
difficulty: 1
tags: [生命周期, Composition API, Hooks]
source: 高频
---
## 题目
Vue 3 常用生命周期有哪些？Composition API 中如何使用？

## 答案
## Vue 3 生命周期

组件从创建、挂载、更新到卸载会经历生命周期。Composition API 中通过 `onMounted`、`onUpdated`、`onUnmounted` 等函数注册回调。

```ts
import { onMounted, onUnmounted, onUpdated } from 'vue'

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUpdated(() => {
  console.log('DOM updated')
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
```

### 常用钩子

- `onBeforeMount` / `onMounted`：挂载前后。
- `onBeforeUpdate` / `onUpdated`：响应式更新导致 DOM patch 前后。
- `onBeforeUnmount` / `onUnmounted`：卸载前后。
- `onActivated` / `onDeactivated`：配合 `KeepAlive`。
- `onErrorCaptured`：捕获子组件错误。

### 注意点

`setup` 执行时组件实例还没挂载，不能直接依赖真实 DOM；访问 DOM 应放到 `onMounted` 或 `nextTick` 后。生命周期注册函数必须在 `setup` 同步执行期间调用，不要放到异步回调或 `await` 之后再注册。

不要在 `onUpdated` 中修改会触发渲染的状态，否则容易形成更新循环；如果只想等某个状态变化后的 DOM，可优先在修改状态后 `await nextTick()`。定时器、订阅、原生事件、第三方实例应在卸载时清理，避免内存泄漏。多数客户端生命周期不会在 SSR 阶段调用，服务端预取数据看 `onServerPrefetch`。

---
id: vue-011
module: Vue
difficulty: 1
tags: [props, emits, 组件通信]
source: 高频
---
## 题目
Vue 组件中 `props` 和 `emit` 的用法和注意事项是什么？

## 答案
## 单向数据流

`props` 用于父组件向子组件传值，`emit` 用于子组件向父组件发送事件。Vue 推荐单向数据流：子组件不要直接修改 props，而是通过事件通知父组件更新。

```vue
<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  change: [value: string]
  'update:modelValue': [value: string]
}>()

function onInput(value: string) {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>
```

### 注意事项

1. props 是只读入口，直接改会破坏数据来源清晰度。
2. 对象或数组 props 的内部属性仍可能被改，团队规范上应避免子组件偷偷修改。
3. `emits` 应显式声明，便于类型推断、文档化和避免事件透传混乱。
4. 本地编辑场景可复制一份内部状态，保存时再 emit。

组件自定义事件不会像 DOM 事件一样冒泡，父组件只能监听直接子组件 emit 出来的事件。兄弟组件或深层组件通信不要靠“事件一路传”，应根据场景选择 provide/inject、Pinia 或路由状态。

面试回答时可以强调：props 管输入，emit 管输出，复杂跨层共享再考虑 provide/inject 或状态管理。

---
id: vue-012
module: Vue
difficulty: 1
tags: [slot, 插槽, 组件封装]
source: 高频
---
## 题目
Vue 插槽有哪些类型？默认插槽、具名插槽和作用域插槽分别解决什么问题？

## 答案
## 插槽的作用

插槽让父组件把一段模板内容传给子组件，子组件决定布局结构，父组件决定局部内容。它是组件组合的重要机制。

```vue
<!-- 子组件 Card.vue -->
<template>
  <section class="card">
    <header><slot name="title" /></header>
    <main><slot /></main>
  </section>
</template>
```

```vue
<Card>
  <template #title>用户信息</template>
  <UserProfile />
</Card>
```

### 类型

- 默认插槽：没有名字，适合主体内容。
- 具名插槽：用 `name` 区分多个区域，例如 header、footer、actions。
- 作用域插槽：子组件把数据传给父组件的插槽模板。

插槽可以提供 fallback 内容，父组件没有传内容时才会显示：

```vue
<button>
  <slot>提交</slot>
</button>
```

```vue
<!-- 子组件 -->
<slot name="row" :item="item" :index="index" />

<!-- 父组件 -->
<template #row="{ item, index }">
  {{ index + 1 }}. {{ item.name }}
</template>
```

作用域插槽常用于表格列、自定义列表项、表单字段渲染等场景。插槽内容在父组件作用域中编译，默认拿不到子组件内部状态；只有子组件通过 slot props 暴露的数据，父组件插槽模板才能使用。

---
id: vue-013
module: Vue
difficulty: 1
tags: [provide, inject, 依赖注入]
source: 高频
---
## 题目
`provide` / `inject` 的作用是什么？适合哪些场景？

## 答案
## `provide` / `inject`

`provide` / `inject` 是 Vue 的依赖注入机制，允许祖先组件向任意后代提供数据或能力，避免多层 props 透传。

```ts
// provider
const theme = ref<'light' | 'dark'>('light')
provide('theme', theme)

// child
const theme = inject<Ref<'light' | 'dark'>>('theme')
```

### 适合场景

1. 表单组件向字段组件提供表单上下文。
2. Tabs、Menu、Tree 等复合组件共享注册和状态。
3. 主题、权限、国际化、埋点等横切能力。
4. 插件向应用提供服务实例。

### 注意事项

`inject` 会让依赖来源不如 props 明显，不适合普通父子数据传递。大型项目中建议使用 `Symbol` 作为 key，并封装 `useXxxContext`，在缺少 provider 时给出明确错误。

```ts
export const formKey = Symbol('form') as InjectionKey<FormContext>
```

如果 key 不一定存在，可以给 `inject` 提供默认值；默认值创建成本高或需要新实例时，使用工厂函数并把第三个参数设为 `true`。

```ts
const config = inject('config', () => createDefaultConfig(), true)
```

如果提供的是响应式对象，后代读取到的是同一个响应式引用，修改权限需要谨慎设计。更推荐在 provider 中同时提供修改函数，或用 `readonly()` 包住状态，只暴露明确的更新入口。

---
id: vue-014
module: Vue
difficulty: 1
tags: [组件通信, 状态管理, 设计]
source: 高频
---
## 题目
Vue 组件通信方式有哪些？如何按场景选择？

## 答案
## 常见通信方式

Vue 组件通信没有一种万能方案，核心是看组件关系、状态作用域和可维护性。

1. 父传子：`props`。
2. 子传父：`emit`。
3. 双向绑定：组件 `v-model`。
4. 父调用子能力：`template ref` + `defineExpose`。
5. 跨多层：`provide` / `inject`。
6. 逻辑复用或局部共享：composable。
7. 全局共享：Pinia 或其他状态管理。
8. 路由状态：URL params、query、hash。

### 选择原则

父子组件优先 `props/emit`，这最直观；复合组件内部跨层共享用 provide/inject；多个组件复用同一段请求、表单或交互逻辑时可以抽成 composable；多个页面或远距离组件共享用户、权限、购物车、缓存状态时用 Pinia；可以被 URL 表达的筛选条件、分页、详情 id，优先放进路由，便于刷新、分享和回退。

### 反模式

不要为了省事把所有状态都放全局 store；也不要用事件总线承载复杂业务流程。事件总线会让数据流变隐式，后期排查“谁改了状态”非常痛苦。

---
id: vue-015
module: Vue
difficulty: 1
tags: [动态组件, 异步组件, 组件]
source: 高频
---
## 题目
Vue 动态组件和异步组件如何使用？分别适合什么场景？

## 答案
## 动态组件

动态组件通过 `<component :is="xxx">` 在多个组件之间切换，适合 tab、步骤表单、配置化页面等场景。

```vue
<component :is="currentPanel" />
```

如果希望切换时保留组件状态，可以配合 `KeepAlive`。

```vue
<KeepAlive>
  <component :is="currentPanel" />
</KeepAlive>
```

## 异步组件

异步组件把组件代码拆成独立 chunk，在需要时再加载，适合重型弹窗、低频页面、图表编辑器等。

```ts
import { defineAsyncComponent } from 'vue'

const ChartPanel = defineAsyncComponent(() => import('./ChartPanel.vue'))
```

也可以配置 loading、error、timeout 等状态。

### 选择建议

动态组件解决“运行时切哪个组件”；异步组件解决“组件代码什么时候加载”。实际项目经常组合使用：根据配置选择组件，并把低频组件做成异步加载。

注意区分组件异步加载和路由懒加载：Vue Router 的 route component 直接写 `() => import('./Page.vue')`，不要再包一层 `defineAsyncComponent`。异步组件更适合在普通组件树中按需渲染某个低频组件。

---
id: vue-016
module: Vue
difficulty: 1
tags: [Teleport, 弹窗, DOM]
source: 高频
---
## 题目
Vue 的 `Teleport` 是什么？常见应用场景有哪些？

## 答案
## `Teleport`

`Teleport` 允许组件逻辑仍写在当前组件树里，但把一段 DOM 渲染到指定容器。它常用于弹窗、抽屉、Toast、下拉浮层等需要脱离父级 `overflow`、`z-index` 或定位上下文的 UI。

```vue
<Teleport to="body">
  <div v-if="open" class="modal">
    <slot />
  </div>
</Teleport>
```

### 为什么需要

弹窗如果渲染在当前组件内部，可能被父容器裁剪，或受到 stacking context 影响。Teleport 把 DOM 放到 `body` 或指定节点，视觉层级更可控。

### 注意事项

1. 组件逻辑关系不变，props、emit、provide/inject 仍按组件树工作。
2. 目标容器需要存在，SSR 场景要注意客户端和服务端结构一致。
3. 弹窗不能只解决“显示”，还要处理焦点管理、ESC 关闭、滚动锁定和可访问性。

补充能力：`Teleport` 支持 `disabled`，可以在移动端等场景临时退回原位置渲染；多个 Teleport 可以挂到同一个目标容器，按挂载顺序追加。Vue 3.5+ 还支持 `defer`，允许目标容器在同一轮挂载/更新稍后出现，但不能延迟到异步的下一轮才出现。

---
id: vue-017
module: Vue
difficulty: 1
tags: [Transition, 动画, 交互]
source: 高频
---
## 题目
Vue 中 `Transition` 和 `TransitionGroup` 有什么用途？如何实现进入和离开动画？

## 答案
## Vue 过渡组件

`Transition` 用于单个元素或组件的进入、离开动画；`TransitionGroup` 用于列表元素的进入、离开和移动动画。

```vue
<Transition name="fade">
  <div v-if="open" class="panel">Content</div>
</Transition>
```

```css
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
```

### 工作方式

Vue 会在进入和离开阶段自动添加 class，例如 `*-enter-from`、`*-enter-active`、`*-enter-to`、`*-leave-from`、`*-leave-active`、`*-leave-to`。你只需要定义对应 CSS，或通过 JS hooks 控制动画。

### 注意点

`Transition` 只能包一个元素或组件作为默认插槽内容；如果包的是组件，这个组件也应该只有一个根元素。`TransitionGroup` 默认不渲染包裹元素，需要容器时用 `tag` 指定，并且列表子项必须有唯一 `key`，CSS 过渡 class 会应用到每个列表项上，而不是 group 容器上。

复杂动画应尽量使用 `transform` 和 `opacity`，避免频繁触发布局。弹窗动画还要和 Teleport、焦点管理、滚动锁定配合，不能只做视觉效果。

---
id: vue-018
module: Vue
difficulty: 2
tags: [Composition API, Options API, 代码组织]
source: 高频
---
## 题目
Composition API 和 Options API 有什么区别？真实项目中如何选择？

## 答案
## 两种 API 风格

Options API 按选项组织代码，例如 `data`、`computed`、`methods`、`watch`；Composition API 按逻辑主题组织代码，把状态、派生值、副作用和方法放在同一段逻辑里。

```ts
const keyword = ref('')
const users = ref<User[]>([])
const filteredUsers = computed(() =>
  users.value.filter((user) => user.name.includes(keyword.value)),
)
```

### Composition API 优势

1. 逻辑复用更自然，可以封装 composable。
2. TypeScript 推断更好，尤其是复杂 props、emit、泛型逻辑。
3. 大组件中同一业务逻辑不再分散到多个 options。
4. 和 `<script setup>` 配合后模板暴露更简洁。

### Options API 优势

上手简单、结构固定，对小组件和旧项目维护友好。团队中如果有大量 Vue 2 代码，Options API 仍然可读。

### 选择建议

新 Vue 3 + TypeScript 项目通常优先 Composition API 和 `<script setup>`；旧项目迁移可以渐进混用，但同一个组件里不要无节制混杂两种风格。Options API 不会被废弃，在中低复杂度场景仍然是可靠选择；Composition API 也可以通过 `setup()` 用在 Options 组件中，但更适合旧代码接入新 composable，而不是长期混写。

面试中重点不是“谁替代谁”，而是能说明逻辑复用、类型推断、代码组织和团队迁移成本的差异。

---
id: vue-019
module: Vue
difficulty: 2
tags: [script setup, 宏, TypeScript]
source: 高频
---
## 题目
`<script setup>` 有什么特点？`defineProps`、`defineEmits`、`defineExpose`、`defineModel` 分别做什么？

## 答案
## `<script setup>`

`<script setup>` 是 Vue SFC 的编译时语法糖。顶层变量、函数和导入会自动暴露给模板，不需要手动 `return`。

```vue
<script setup lang="ts">
const props = defineProps<{ title: string }>()
const emit = defineEmits<{ submit: [id: string] }>()

function submit() {
  emit('submit', props.title)
}
</script>
```

### 常用宏

- `defineProps`：声明 props，支持运行时声明和 TS 类型声明。
- `defineEmits`：声明事件，给 `emit` 提供类型约束。
- `defineExpose`：显式暴露给父组件 template ref 的实例能力。
- `defineModel`：声明组件 `v-model`，底层对应 model prop 和 update 事件。
- `withDefaults`：给类型声明的 props 设置默认值，主要用于 Vue 3.4 及以下，或不使用响应式 props 解构的写法。

### 注意事项

这些宏是编译器宏，不需要 import，也不能当普通运行时函数使用。`defineProps` / `defineEmits` 的参数会被提升到模块作用域，因此不能引用 setup 内局部变量。公共组件建议显式声明 props、emits 和 expose，避免组件 API 隐式扩散。

Vue 3.5+ 中，从 `defineProps` 解构出来的变量在同一个 `<script setup>` 块内是响应式的，编译器会自动转成 `props.xxx` 访问；3.4 及以下不要直接依赖这种解构响应式。使用类型声明 props 时，Vue 3.5+ 可以用原生默认值：

```ts
const { msg = 'hello' } = defineProps<{ msg?: string }>()
```

`defineModel` 会返回一个 ref，修改它会触发对应的 `update:*` 事件；但如果给 model prop 设置 `default`，而父组件没有传值，可能造成父子状态初始不同步，公共组件要谨慎设计默认值。

---
id: vue-020
module: Vue
difficulty: 2
tags: [响应式, reactive, toRefs]
source: 高频
---
## 题目
Vue 3 响应式有哪些常见限制？为什么解构 `reactive` 对象会丢失响应式？

## 答案
## 响应式限制

Vue 3 使用 Proxy 代理对象属性访问和修改。依赖收集发生在读取代理属性时，如果你把属性值单独解构成普通变量，后续读写就绕过了代理，自然无法继续追踪。

```ts
const state = reactive({ count: 0 })

const { count } = state
console.log(count) // 普通 number，后续不会响应式更新
```

### 正确做法

```ts
const state = reactive({ count: 0, name: 'Vue' })
const { count, name } = toRefs(state)

count.value++
```

`toRefs` 会把每个属性转成 ref，读写 ref 时仍然代理回原对象属性。

`toRefs` 只会为调用时已经存在的可枚举属性生成 ref；如果属性可能之后才出现，用 `toRef(state, 'key')` 更合适。

### 其他限制

1. `reactive` 对象不适合整体替换，应保持同一个引用。
2. `reactive` 只能代理对象，原始值要用 `ref`。
3. 模板中的 ref 解包有边界，数组和集合里的 ref 通常不会自动深层解包。
4. 第三方类实例、大型不可变数据可考虑 `markRaw`、`shallowRef`、`shallowReactive`。

注意不要和 Vue 3.5+ 的 `defineProps` 解构混淆：props 解构响应式是 `<script setup>` 编译器的特殊转换，不代表普通 `reactive` 对象解构也会保持响应式。

面试表达：响应式不是魔法，必须通过 Vue 创建的代理或 ref 访问路径，Vue 才能收集依赖并触发更新。

---
id: vue-021
module: Vue
difficulty: 2
tags: [computed, 缓存, 派生状态]
source: 高频
---
## 题目
`computed` 和 methods 的区别是什么？`computed` 为什么有缓存？

## 答案
## `computed` vs methods

`computed` 表示派生状态，有依赖追踪和缓存；methods 是普通函数，每次调用都会重新执行。

```ts
const users = ref<User[]>([])
const keyword = ref('')

const filteredUsers = computed(() =>
  users.value.filter((user) => user.name.includes(keyword.value)),
)

function getFilteredUsers() {
  return users.value.filter((user) => user.name.includes(keyword.value))
}
```

模板多次使用 `filteredUsers`，只要 `users` 和 `keyword` 没变，就复用缓存；调用 `getFilteredUsers()` 则每次渲染都会执行。

### 缓存原理

`computed` 内部是带 dirty 标记的响应式 effect。依赖变化时只把 computed 标记为脏；真正读取 `.value` 时才重新计算，并收集当前读取者对 computed 的依赖。

只有响应式依赖变化才会让 computed 重新计算。比如 `computed(() => Date.now())` 不会自动更新，因为 `Date.now()` 不是响应式依赖；这种场景应使用 method、定时器或显式状态驱动更新。

### 可写 computed

```ts
const fullName = computed({
  get: () => `${firstName.value} ${lastName.value}`,
  set: (value) => {
    ;[firstName.value, lastName.value] = value.split(' ')
  },
})
```

可写 computed 适合对外暴露一个派生字段，但内部拆成多个状态。不要在 computed getter 中发请求、改状态或写 DOM；computed 应保持纯净。

Vue 3.4+ 中 computed getter 可以读取上一次返回值，适合“超过阈值时沿用上一次有效值”等少数场景；常规派生状态不需要用这个能力。

---
id: vue-022
module: Vue
difficulty: 2
tags: [watch, 副作用, flush]
source: 高频
---
## 题目
`watch` 的 `immediate`、`deep`、`flush` 和清理函数分别有什么用？

## 答案
## `watch` 选项

`watch` 用来在响应式数据变化时执行副作用，例如请求、同步 URL、写缓存、操作第三方实例。

```ts
watch(
  () => route.query.keyword,
  async (keyword, oldKeyword, onCleanup) => {
    const controller = new AbortController()
    onCleanup(() => controller.abort())

    result.value = await search(keyword, { signal: controller.signal })
  },
  { immediate: true, flush: 'post' },
)
```

### 常见选项

- `immediate: true`：创建 watcher 后立即执行一次。
- `deep: true`：深度监听对象内部变化，成本较高。
- `deep: number`：Vue 3.5+ 支持限制最大遍历深度，比无脑 `deep: true` 更可控。
- `once: true`：Vue 3.4+ 支持源变化后只触发一次，然后自动停止 watcher。
- `flush: 'pre'`：默认值，组件更新前执行。
- `flush: 'post'`：DOM 更新后执行，适合读取更新后的 DOM。
- `flush: 'sync'`：同步执行，谨慎使用，可能导致频繁触发。

### 清理函数

清理函数用于取消过期副作用。典型场景是搜索框快速输入时取消上一次请求，避免旧请求晚返回覆盖新结果。

Vue 3.5+ 还提供 `onWatcherCleanup()`，可以在 watcher 失效前注册清理逻辑：

```ts
watch(id, (newId) => {
  const controller = new AbortController()
  fetch(`/api/${newId}`, { signal: controller.signal })

  onWatcherCleanup(() => {
    controller.abort()
  })
})
```

`onWatcherCleanup()` 必须在 watch 回调同步执行期间调用，不能放在 `await` 之后；回调参数里的 `onCleanup` 没有这个同步限制，并且兼容 3.5 之前版本。

### 建议

优先监听明确数据源，不要对大型对象滥用 deep watch。能用 computed 表达的派生值不要用 watch；watch 是为了副作用，不是为了再维护一份同步状态。

---
id: vue-023
module: Vue
difficulty: 2
tags: [nextTick, DOM更新, 调度]
source: 高频
---
## 题目
Vue 中 `nextTick` 的作用是什么？为什么修改状态后不能立刻拿到最新 DOM？

## 答案
## DOM 更新时机

Vue 修改响应式状态后，不会立刻同步 patch DOM，而是把组件更新放进队列，在同一轮事件循环中合并多次变化，等到下一个 tick 批量更新。这样可以避免一次事件里多次状态修改导致组件重复渲染。

```ts
count.value++
console.log(el.value?.textContent) // 可能还是旧 DOM

await nextTick()
console.log(el.value?.textContent) // DOM 已更新
```

### 典型场景

1. 打开弹窗后等待 DOM 出现再聚焦输入框。
2. 列表追加数据后滚动到底部。
3. 表单错误信息渲染后测量高度。
4. 图表容器显示后再初始化第三方图表。

### 注意事项

`nextTick` 只保证等待 Vue 已排队的 DOM 更新完成，不代表图片加载完成、CSS 动画结束或第三方异步任务完成。如果你依赖这些外部时机，还需要监听 `load`、`transitionend` 或库自身回调。

面试总结：`nextTick` 是等待 Vue 异步更新队列 flush 的工具。

---
id: vue-024
module: Vue
difficulty: 2
tags: [渲染流程, 虚拟DOM, 调度]
source: 高频
---
## 题目
Vue 从模板到页面渲染经历了哪些阶段？

## 答案
## Vue 渲染流程

Vue 的核心链路可以概括为 Compile、Mount、Patch：模板编译成 render 函数，render 函数执行生成虚拟 DOM，patch 算法把虚拟 DOM 变更应用到真实 DOM，响应式系统在状态变化时触发组件重新渲染。

```text
SFC/template -> compile -> render function -> vnode -> mount/patch -> DOM
```

模板编译通常在构建阶段提前完成，也可以在包含 runtime compiler 的构建中运行时编译；生产项目通常使用预编译，体积和性能更好。

### 初次渲染

1. 创建应用和根组件实例。
2. 执行 `setup`，建立响应式状态和生命周期注册。
3. 执行 render 函数，读取响应式数据并收集依赖。
4. 生成 vnode 树。
5. patch 到真实 DOM。
6. 调用 mounted 相关钩子。

### 更新渲染

响应式数据变化会触发相关组件的渲染 effect 重新执行。Vue 将更新任务放入调度队列，合并同一轮中的重复更新，再执行 render 生成新 vnode，与旧 vnode diff 后更新 DOM。

### 优化点

Vue 编译器会生成 PatchFlag、Block Tree 等信息，让运行时跳过大量静态节点，对动态绑定做定向更新。这是 Vue 相比纯运行时虚拟 DOM 的重要优势。

---
id: vue-025
module: Vue
difficulty: 2
tags: [diff, 虚拟DOM, key]
source: 高频
---
## 题目
Vue 3 的 Diff 大致如何工作？列表更新为什么需要稳定 key？

## 答案
## Vue Diff 思路

Vue 更新时会比较新旧 vnode。如果节点类型不同，直接卸载旧节点并挂载新节点；如果类型相同，则复用 DOM，更新 props，并递归处理 children。

### 列表 diff

对 keyed children，Vue 会尽量复用和移动已有节点。简化流程可以理解为：

1. 从头部同步比较相同节点。
2. 从尾部同步比较相同节点。
3. 新增或删除明显剩余区间。
4. 对乱序区间建立 key 到新索引的映射。
5. 标记需要移动的节点，并用最长递增子序列减少 DOM 移动次数。

### 为什么 key 重要

稳定 key 表示业务身份，能帮助 Vue 判断“同一个数据项对应同一个组件实例”。没有 key 或使用 index 时，列表插入、删除、排序可能导致组件状态错位。

没有 `key` 时，Vue 默认会就地 patch：尽量按当前位置复用 DOM 并更新内容，而不是移动 DOM 去匹配数据顺序。这个模式效率高，但只适合列表渲染结果不依赖子组件状态、输入框值、焦点、动画等临时 DOM 状态的场景。

### 面试重点

不要把 Vue diff 说成简单“双端比较”就结束。Vue 3 对稳定片段、动态节点和 PatchFlag 有编译期优化，很多场景不会完整遍历整棵树；列表乱序移动时还会利用最长递增子序列减少真实 DOM 操作。

---
id: vue-026
module: Vue
difficulty: 2
tags: [v-model, defineModel, 组件设计]
source: 高频
---
## 题目
组件上的 `v-model` 是如何实现的？多 `v-model` 和 `defineModel` 怎么用？

## 答案
## 组件 `v-model`

在组件上，`v-model` 本质是一个 prop 加一个 update 事件。默认是 `modelValue` 和 `update:modelValue`。

```vue
<!-- 父组件 -->
<BaseInput v-model="name" />
```

```vue
<!-- 子组件传统写法 -->
<script setup lang="ts">
defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <input :value="modelValue" @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
</template>
```

### 多个 v-model

```vue
<DateRange v-model:start="start" v-model:end="end" />
```

对应 `start` / `update:start` 和 `end` / `update:end`。

### `defineModel`

Vue 3.4 起推荐使用 `defineModel` 简化声明。

```ts
const value = defineModel<string>()
const start = defineModel<Date>('start')
```

它会生成对应 prop 和 update 事件。公共组件仍要注意默认值、受控/非受控边界、输入法组合事件、类型和校验。

### 组件 v-model 修饰符

组件也可以支持自定义修饰符，例如：

```vue
<BaseInput v-model.capitalize="name" />
```

使用 `defineModel()` 时，可以通过解构拿到修饰符，并用 `get` / `set` 转换读写值：

```ts
const [model, modifiers] = defineModel<string>({
  set(value) {
    if (modifiers.capitalize) {
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
    return value
  },
})
```

多 `v-model` 场景下，每个 model 参数都有自己的修饰符集合，例如 `v-model:first-name.capitalize` 和 `v-model:last-name.uppercase` 应分别处理。

---
id: vue-027
module: Vue
difficulty: 2
tags: [emits, attrs, 组件封装]
source: 高频
---
## 题目
Vue 中 fallthrough attributes 是什么？`inheritAttrs` 和 `$attrs` 有什么用？

## 答案
## Fallthrough attributes

父组件传给子组件、但子组件没有声明为 props 或 emits 的属性，会成为 fallthrough attributes。单根组件默认会把它们透传到根元素。

```vue
<BaseButton id="save" class="primary" @click="save" />
```

如果 `BaseButton` 没声明 `id`，它会落到根元素上；`class` 和 `style` 会和子组件根元素已有值合并。

### `$attrs`

多根组件或需要精确控制透传位置时，可以关闭默认继承并手动绑定。

```vue
<script setup>
defineOptions({ inheritAttrs: false })
</script>

<template>
  <label class="field">
    <span>名称</span>
    <input v-bind="$attrs" />
  </label>
</template>
```

### 注意点

`emits` 声明也会影响事件是否进入 `$attrs`。公共组件应明确声明 props 和 emits，避免父组件事件被错误地绑定到内部 DOM 上。对于 input、button 这类封装组件，合理透传 aria、data、id、name 等属性很重要。

多根组件不会自动继承 fallthrough attributes，如果没有显式 `v-bind="$attrs"`，Vue 会发出运行时警告，因为它无法判断应该把属性放到哪个根节点上。Vue 3 中 `$listeners` 已被移除，事件监听器会以 `onClick` 这类形式进入 `$attrs`；同时 `$attrs` 在 JavaScript 中不是响应式对象，不能通过 watch 观察它的变化。

---
id: vue-028
module: Vue
difficulty: 2
tags: [作用域插槽, 性能, 组件设计]
source: 高频
---
## 题目
作用域插槽在表格组件中如何使用？有哪些性能注意点？

## 答案
## 表格中的作用域插槽

作用域插槽让表格组件负责数据遍历、布局和状态，业务侧负责每个单元格怎么渲染。

```vue
<!-- DataTable.vue -->
<tr v-for="row in rows" :key="row.id">
  <td v-for="col in columns" :key="col.key">
    <slot :name="col.key" :row="row" :value="row[col.key]">
      {{ row[col.key] }}
    </slot>
  </td>
</tr>
```

```vue
<DataTable :rows="users" :columns="columns">
  <template #avatar="{ row }">
    <img :src="row.avatar" alt="" />
  </template>
  <template #actions="{ row }">
    <button @click="edit(row)">编辑</button>
  </template>
</DataTable>
```

### 性能注意点

1. 行数据和列配置要有稳定 key。
2. 不要在插槽模板里做昂贵计算，复杂逻辑放 computed 或预处理。
3. 大数据表格要虚拟滚动，不要只依赖 slot 优化。
4. 表格组件内部应避免每次渲染创建大量新对象作为 slot props。

动态 slot 名适合配置化列，例如 `#price`、`#actions` 这种按列 key 覆盖默认渲染。组件内部要明确优先级：业务 slot 优先，其次 formatter，最后默认文本渲染。

作用域插槽的价值是扩展性强，但它仍然是渲染函数调用，数据量大时要控制渲染规模。传给 slot 的 props 应尽量稳定，例如直接传 `row`、`value`、`index`，不要每个单元格都临时拼复杂对象或执行昂贵格式化。

---
id: vue-029
module: Vue
difficulty: 2
tags: [自定义指令, DOM, 插件]
source: 高频
---
## 题目
Vue 自定义指令适合解决什么问题？如何实现一个点击外部关闭指令？

## 答案
## 自定义指令定位

自定义指令适合封装可复用的底层 DOM 行为，例如点击外部关闭、自动聚焦、权限控制、拖拽、埋点曝光。它不适合承载复杂业务状态，业务逻辑优先放组件或 composable。

```ts
import type { Directive } from 'vue'

type ClickOutsideCallback = (event: PointerEvent) => void

type ClickOutsideEl = HTMLElement & {
  __clickOutsideHandler__?: (event: PointerEvent) => void
  __clickOutsideCallback__?: ClickOutsideCallback
}

export const clickOutside: Directive<ClickOutsideEl, ClickOutsideCallback> = {
  mounted(el, binding) {
    el.__clickOutsideCallback__ = binding.value
    el.__clickOutsideHandler__ = (event) => {
      const target = event.target
      if (target instanceof Node && !el.contains(target)) {
        el.__clickOutsideCallback__?.(event)
      }
    }
    document.addEventListener('pointerdown', el.__clickOutsideHandler__, true)
  },
  updated(el, binding) {
    el.__clickOutsideCallback__ = binding.value
  },
  unmounted(el) {
    if (el.__clickOutsideHandler__) {
      document.removeEventListener('pointerdown', el.__clickOutsideHandler__, true)
    }
    delete el.__clickOutsideHandler__
    delete el.__clickOutsideCallback__
  },
}
```

### 注意事项

1. 必须在卸载时清理原生事件。
2. 指令值变化时，必要时在 `updated` 中同步最新回调。
3. 移动端可能需要处理 `pointerdown` 或 `touchstart`。
4. Teleport 弹层要重新思考“外部”的边界。
5. 自定义指令主要面向普通 DOM 元素，不推荐直接挂在组件上；多根组件上会被忽略并产生警告。

---
id: vue-030
module: Vue
difficulty: 2
tags: [composable, 逻辑复用, Composition API]
source: 高频
---
## 题目
如何设计一个好的 Vue composable？以 `useRequest` 为例说明。

## 答案
## Composable 设计原则

Composable 是基于 Composition API 的逻辑复用函数，通常以 `use` 开头。好的 composable 应该边界清晰、返回稳定、能自动清理副作用，并且不强依赖具体组件结构。

```ts
import { onScopeDispose, ref } from 'vue'

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function useRequest<T>(request: (signal: AbortSignal) => Promise<T>) {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)
  let controller: AbortController | null = null
  let currentRequest = 0

  async function run() {
    controller?.abort()
    const requestId = ++currentRequest
    const activeController = new AbortController()
    controller = activeController
    loading.value = true
    error.value = null

    try {
      const result = await request(activeController.signal)
      if (requestId === currentRequest) {
        data.value = result
      }
    } catch (err) {
      if (requestId === currentRequest && !isAbortError(err)) {
        error.value = err
      }
    } finally {
      if (requestId === currentRequest) {
        loading.value = false
        controller = null
      }
    }
  }

  function cancel() {
    currentRequest++
    controller?.abort()
    controller = null
    loading.value = false
  }

  onScopeDispose(cancel)

  return { data, loading, error, run, cancel }
}
```

### 关键点

1. 输入参数尽量明确，避免直接读全局隐式状态。
2. 返回 ref、computed 和方法，不要返回普通快照值。
3. 如果内部注册事件、定时器、订阅，要用 `onScopeDispose` 清理。
4. 请求类 composable 要处理竞态、取消、缓存和错误状态。
5. 如果参数支持 ref 或 getter，要用 `toValue` 配合 `watch` / `watchEffect` 正确追踪依赖。
6. Composable 应同步调用在 `setup` 或 `<script setup>` 中，DOM 副作用要放到 `onMounted` 后处理，避免 SSR 问题。

Composable 不是“把代码挪到函数里”这么简单，它应该形成稳定的小 API。

---
id: vue-031
module: Vue
difficulty: 2
tags: [Pinia, 状态管理, Store]
source: 高频
---
## 题目
Pinia 的核心概念是什么？如何定义和使用一个 store？

## 答案
## Pinia 核心概念

Pinia 是 Vue 官方推荐的状态管理方案之一，用于跨组件、跨页面共享状态。一个 store 通常包含 state、getters 和 actions。

```ts
// main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

createApp(App).use(createPinia()).mount('#app')
```

```ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    profile: null as User | null,
  }),
  getters: {
    isLogin: (state) => Boolean(state.token),
  },
  actions: {
    async fetchProfile() {
      this.profile = await api.getProfile()
    },
  },
})
```

```vue
<template>
  <UserCard v-if="isLogin" :profile="profile" />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const { profile, isLogin } = storeToRefs(userStore)
const { fetchProfile } = userStore

void fetchProfile()
</script>
```

### Setup Store

Pinia 也支持 setup store。

```ts
export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const double = computed(() => count.value * 2)
  function inc() {
    count.value++
  }
  return { count, double, inc }
})
```

### 注意事项

1. `defineStore` 的第一个参数是全局唯一 id，会用于 devtools 和插件识别。
2. Option Store 中 `state` 要写成函数；getters 类似 computed，actions 类似 methods，可以异步并通过 `this` 访问 store。
3. store 本身是 reactive 包装对象，读取 state/getters 不需要 `.value`。
4. 不要直接解构 store 导致响应式丢失；读取 state/getters 可用 `storeToRefs(store)`，actions 可以直接解构。
5. Setup Store 必须 return 所有需要成为 state 的属性，否则会影响 SSR、devtools 和插件。
6. 不要把纯页面局部状态都塞进 Pinia；跨页面共享、需要持久化或多处协作的状态才更适合进 store。

---
id: vue-032
module: Vue
difficulty: 2
tags: [Pinia, Vuex, 状态管理]
source: 高频
---
## 题目
Pinia 和 Vuex 有什么区别？为什么 Vue 3 项目通常更推荐 Pinia？

## 答案
## Pinia vs Vuex

Vuex 是经典集中式状态管理方案，Vuex 4 仍可用于 Vue 3；Pinia 则是现在官方默认推荐的 Vue 状态管理库，更贴近 Vue 3 Composition API。新项目通常优先 Pinia，因为 API 更简洁、类型推断更好、模块化更自然。

### 主要区别

1. Pinia 没有 mutations，actions 可以同步也可以异步，减少样板代码。
2. Pinia 每个 store 天然模块化，不需要 Vuex module 的命名空间复杂度。
3. Pinia 对 TypeScript 推断更友好，尤其是 setup store。
4. Pinia 支持插件、devtools、SSR，但使用方式更轻。
5. Pinia 不依赖字符串形式的 mutation/action type，直接导入并调用 store，自动补全更友好。
6. Pinia 的 store 默认按需创建，不需要像 Vuex module 那样手动动态注册。
7. Vuex 3/4 仍会维护，但新功能预期较少，更适合维护已有 Vuex 项目，迁移成本需要评估。

### 使用建议

用户信息、权限、主题、跨页面缓存适合放 Pinia；局部弹窗开关、表单输入、组件内部 loading 不应都放全局。状态管理的重点不是“能全局访问”，而是让状态归属、更新路径和调试链路清晰。

### 面试总结

Pinia 可以理解为更轻、更类型友好、更符合 Vue 3 组合式思路的状态管理方案；不是 Vuex 不能用，而是新 Vue 3 项目默认优先选 Pinia，历史 Vuex 项目则按收益和风险渐进迁移。

---
id: vue-033
module: Vue
difficulty: 2
tags: [Vue Router, 路由守卫, 权限]
source: 高频
---
## 题目
Vue Router 路由守卫有哪些？如何实现登录鉴权？

## 答案
## 路由守卫类型

Vue Router 提供全局守卫、路由独享守卫和组件内守卫。常见全局守卫包括 `beforeEach`、`beforeResolve`、`afterEach`；路由独享守卫是 `beforeEnter`；组件内守卫包括 `beforeRouteEnter`、`beforeRouteUpdate`、`beforeRouteLeave`，Composition API 中常用 `onBeforeRouteUpdate`、`onBeforeRouteLeave`。

```ts
const routes = [
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/pages/Admin.vue'),
    meta: { requiresAuth: true, roles: ['admin'] },
  },
]

router.beforeEach(async (to) => {
  const userStore = useUserStore()

  if (userStore.hasToken && !userStore.profileLoaded) {
    try {
      await userStore.fetchProfile()
    } catch {
      userStore.logout()
    }
  }

  if (to.meta.requiresAuth && !userStore.isLogin && to.name !== 'Login') {
    return {
      name: 'Login',
      query: { redirect: to.fullPath },
      replace: true,
    }
  }

  const roles = to.meta.roles as string[] | undefined
  if (roles?.length && !roles.some((role) => userStore.roles.includes(role))) {
    return { name: 'Forbidden', replace: true }
  }
})
```

### 鉴权流程

1. 路由配置中用 `meta.requiresAuth` 标记需要登录的页面。
2. 全局前置守卫读取登录态。
3. 未登录则跳转登录页，并记录 `redirect`。
4. 已登录但缺少角色权限时跳转 403 或首页。
5. 登录成功后回跳原目标页面。
6. 对需要用户资料的页面，先基于 token 拉取用户信息，再判断角色和权限。

### 注意事项

Vue Router 4 中守卫可以直接返回路由位置、`false` 或抛出错误，通常不再依赖老式 `next` 写法。异步守卫要处理 token 刷新、用户信息拉取失败和重定向循环，尤其要避免登录页本身也被重复拦截。

`afterEach` 只能做埋点、标题、日志等副作用，不能阻止导航；`beforeResolve` 发生在异步组件和组件内守卫解析之后，适合做进入页面前的最终权限或资源检查。TypeScript 项目可以扩展 `RouteMeta`，把 `requiresAuth`、`roles` 等字段类型化。

---
id: vue-034
module: Vue
difficulty: 2
tags: [Vue Router, params, query]
source: 高频
---
## 题目
路由 params、query 和 hash 有什么区别？同一路由参数变化时组件为什么可能不会重新创建？

## 答案
## 路由参数区别

- `params`：路径参数，通常来自 `/users/:id`，表达资源身份。
- `query`：查询参数，来自 `?page=1&keyword=vue`，适合筛选、分页、排序。
- `hash`：片段标识，来自 `#section`，常用于锚点。

```ts
router.push({ name: 'user', params: { id: '1' } })
router.push({ path: '/users', query: { page: '1' } })
router.push({ path: '/about', hash: '#team' })
```

使用 `params` 时优先配合命名路由，让 Vue Router 负责 URL 编码；如果传了 `path`，`params` 会被忽略。`params` 的值通常应是 string、number，或它们的数组；可选参数可以用空字符串或 `null` 移除。

### 组件复用

从 `/users/1` 切到 `/users/2` 时，如果匹配的是同一个路由记录和同一个组件，Vue Router 会复用组件实例，而不是销毁再创建。这样性能更好，但 `onMounted` 不会重新执行。

### 如何响应变化

```ts
const route = useRoute()

watch(
  () => route.params.id,
  (id) => {
    fetchUser(String(id))
  },
  { immediate: true },
)
```

也可以使用组件内路由更新守卫，在需要取消导航、确认离开或串行加载数据时更合适。

```ts
onBeforeRouteUpdate(async (to) => {
  await fetchUser(String(to.params.id))
})
```

对于需要强制重建的场景，可以给 `<RouterView>` 加基于 `route.fullPath` 或业务 id 的 key，但不要滥用。筛选、分页这类状态通常用 query 更利于刷新和分享；资源身份更适合 params；hash 更适合页面内定位。

---
id: vue-035
module: Vue
difficulty: 2
tags: [KeepAlive, 缓存, 生命周期]
source: 高频
---
## 题目
`KeepAlive` 的作用是什么？`include`、`exclude`、`max` 和生命周期如何使用？

## 答案
## `KeepAlive`

`KeepAlive` 是内置组件，用来缓存动态组件实例，避免组件在切换时被销毁和重新创建。常见于 tab、后台管理列表页和详情页返回场景。

```vue
<KeepAlive :include="['UserList']" :max="10">
  <component :is="currentComponent" />
</KeepAlive>
```

在路由页面里通常配合 `RouterView` 插槽使用，缓存的是路由组件本身：

```vue
<RouterView v-slot="{ Component }">
  <KeepAlive :include="cachedRouteNames">
    <component :is="Component" />
  </KeepAlive>
</RouterView>
```

### 配置项

- `include`：只缓存匹配名称的组件，支持逗号分隔字符串、正则或数组。
- `exclude`：排除匹配名称的组件，支持逗号分隔字符串、正则或数组。
- `max`：最多缓存多少个实例，超出后按 LRU 策略销毁最久未访问的缓存。

`include` / `exclude` 匹配的是组件的 `name`。使用 `<script setup>` 的单文件组件在 Vue 3.2.34 之后会自动根据文件名推断 `name`，但复杂场景仍建议明确组件名，避免缓存规则失效。

### 生命周期

被缓存组件不会反复 mounted/unmounted，而是在激活和停用时触发：

```ts
onActivated(() => {
  refreshIfNeeded()
})

onDeactivated(() => {
  pausePolling()
})
```

`onActivated` 会在首次挂载和每次从缓存重新插入 DOM 时触发；`onDeactivated` 会在进入缓存和最终卸载时触发。它们不仅作用于被 `KeepAlive` 包裹的根组件，也会作用于缓存树中的后代组件。

### 注意事项

缓存能改善返回体验，但也会保留内存、订阅、滚动状态和表单状态。需要明确哪些页面值得缓存，并在停用时暂停轮询、视频播放或图表动画；在重新激活时按需刷新过期数据，而不是默认每次重新请求。

---
id: vue-036
module: Vue
difficulty: 2
tags: [异步组件, Suspense, 加载状态]
source: 高频
---
## 题目
Vue 异步组件和 `Suspense` 如何配合？适合哪些加载场景？

## 答案
## 异步组件

异步组件把组件代码延迟到需要时加载，减少首屏 bundle。

```ts
import { defineAsyncComponent } from 'vue'

const Editor = defineAsyncComponent({
  loader: () => import('./Editor.vue'),
  loadingComponent: Loading,
  errorComponent: LoadError,
  delay: 200,
  timeout: 10000,
})
```

`defineAsyncComponent` 返回的是一个包装组件，只有真正渲染时才加载内部组件，并且会透传 props 和 slots。`delay` 可以避免快速网络下 loading 一闪而过；`timeout` 或 loader reject 时会展示错误组件。

## `Suspense`

`Suspense` 可以等待组件树里的异步依赖完成，并在等待期间展示 fallback。它常用于异步组件、`async setup()` 或 `<script setup>` 顶层 `await`。

```vue
<Suspense>
  <template #default>
    <Editor />
  </template>
  <template #fallback>
    <PageSkeleton />
  </template>
</Suspense>
```

异步组件默认是 `suspensible` 的：如果父链上有 `Suspense`，加载状态会由 `Suspense` 接管，异步组件自己的 `loadingComponent`、`errorComponent`、`delay`、`timeout` 不再生效。需要让组件自己管理加载态时，可以设置 `suspensible: false`。

```ts
const Editor = defineAsyncComponent({
  loader: () => import('./Editor.vue'),
  loadingComponent: Loading,
  errorComponent: LoadError,
  suspensible: false,
})
```

### 使用建议

低频重型组件适合异步加载，例如 Markdown 编辑器、图表库、地图、代码编辑器。页面级路由懒加载通常交给 Vue Router 的动态 import，而不是把路由组件再包一层 `defineAsyncComponent`。`Suspense` 要注意边界粒度，fallback 过大容易造成整块页面闪烁；过小又会出现多个加载状态。

`Suspense` 的 `default` 和 `fallback` 插槽都只能有一个直接子节点。它可以统一 loading，但不等于错误边界；错误降级通常还需要 `onErrorCaptured` 或全局错误处理。官方仍把 `Suspense` 标记为实验特性，公共组件库或长期稳定 API 要谨慎依赖。

---
id: vue-037
module: Vue
difficulty: 2
tags: [错误处理, ErrorCaptured, 稳定性]
source: 高频
---
## 题目
Vue 项目如何做错误处理？`onErrorCaptured` 和 `app.config.errorHandler` 分别适合什么？

## 答案
## 错误处理层次

Vue 错误处理通常分组件局部、应用全局和网络请求层三类。

```ts
app.config.errorHandler = (err, instance, info) => {
  reportError(err, {
    component: instance?.type?.name,
    info,
  })
}
```

全局 `errorHandler` 适合统一上报 Vue 应用内未被局部吞掉的错误，例如渲染、事件处理、生命周期、`setup`、watcher、自定义指令和 transition hook 中抛出的错误。生产环境里 `info` 可能是压缩后的错误码，需要结合 Vue 的生产错误码表还原。

```ts
const localError = ref<unknown>(null)

onErrorCaptured((err, instance, info) => {
  localError.value = err
  reportPanelError(err, { component: instance?.type?.name, info })
  return false
})
```

`onErrorCaptured` 适合组件边界内降级，例如某个复杂面板失败时只展示局部错误态。默认情况下，捕获到的错误仍会继续向上传播，最终进入 `app.config.errorHandler`；返回 `false` 表示这个错误已经被当前边界处理，会阻止继续触发更上层的 `onErrorCaptured` 和全局 `errorHandler`。

错误边界里可以修改本地状态展示降级 UI，但降级状态不能继续渲染原本出错的子树，否则可能进入无限渲染错误循环。

### 其他错误来源

1. API 错误：在请求封装层统一处理状态码、业务码、重试和登出。
2. Promise 未捕获：监听 `window.unhandledrejection`，并在业务 async 流程中主动 `try/catch`。
3. 静态资源错误：监听全局 `error`，注意捕获阶段。
4. 路由加载失败：处理动态 import chunk 失败。
5. 异步组件：配置 `errorComponent` 或结合局部错误态处理加载失败。

稳定项目要把错误展示、日志上报、用户恢复动作和告警链路一起设计。

---
id: vue-038
module: Vue
difficulty: 2
tags: [性能优化, Vue, 渲染]
source: 高频
---
## 题目
Vue 项目常见性能优化手段有哪些？

## 答案
## Vue 性能优化

Vue 性能优化要先定位瓶颈，再选择手段。通常分两类：页面加载性能，例如 LCP、首屏 JS 体积和可交互时间；更新性能，例如输入、筛选、路由切换或大列表滚动时是否卡顿。

### 常用手段

1. 架构层：对 SEO、首屏敏感页面考虑 SSR / SSG；后台系统和强交互页面可继续用 SPA。
2. 加载层：路由懒加载、重型组件异步加载、依赖按需引入、开启 tree-shaking，避免无意识引入大型库。
3. 静态资源：图片、字体、第三方脚本按需加载，必要时压缩、预加载或走 CDN。
4. 更新层：保持传给子组件的 props 稳定，例如父组件直接传 `active`，不要让所有子项都依赖同一个 `activeId`。
5. 渲染层：稳定 `key`，避免错误复用或无意义重建；永不变化内容用 `v-once`，大子树或大列表可用 `v-memo` 跳过更新。
6. 计算层：合理使用 `computed` 缓存派生值，避免模板里调用重函数；computed 不要每次返回新对象，否则会破坏稳定性。
7. 大列表：使用虚拟滚动，避免一次渲染几千上万行；列表项组件要轻，避免过深组件抽象。
8. 响应式层：大型不可变数据使用 `shallowRef`、`shallowReactive` 或 `markRaw` 降低深层响应式转换成本，并通过替换根对象触发更新。
9. 监控层：用 Chrome Performance、Vue DevTools、Web Vitals 和生产数据验证优化效果；开发时可开启 `app.config.performance` 辅助定位。

### 注意事项

不要盲目优化。很多页面慢在 API、图片、图表库、首屏 JS 或过多 DOM 节点，而不是 Vue 本身。优化前先确定是加载慢、渲染慢、更新慢还是交互卡顿；优化后要用指标证明收益，避免为了“看起来高级”引入更复杂的代码。

---
id: vue-039
module: Vue
difficulty: 2
tags: [虚拟列表, 大数据, 性能]
source: 高频
---
## 题目
在 Vue 中如何实现一个高性能虚拟列表？核心思路是什么？

## 答案
## 虚拟列表核心

虚拟列表只渲染视口附近的数据项，用一个占位容器撑开总高度，通过 `transform` 或 padding 把可见项移动到正确位置。

```text
总列表高度 = itemCount * itemHeight
start = floor(scrollTop / itemHeight)
end = start + visibleCount + overscan
offset = start * itemHeight
```

实际实现时通常会把 `overscan` 同时向前、向后扩展，并把 `start`、`end` 限制在合法范围内，避免快速滚动时白屏。

### 固定高度实现要点

1. 外层容器固定高度并监听 scroll。
2. 内层占位元素设置总高度。
3. 根据 `scrollTop` 计算可见区间。
4. 只渲染 `items.slice(start, end)`。
5. 用 `transform: translateY(offset)` 移动可见列表。
6. scroll 监听使用 `passive`，计算更新可用 `requestAnimationFrame` 合并，避免滚动过程中频繁同步计算。

### 动态高度难点

动态高度需要维护每项高度和前缀和，通过二分查找根据 scrollTop 找 start。还要在元素实际渲染后用 `ResizeObserver` 或测量逻辑更新高度缓存，并修正占位高度和 offset，避免滚动跳动。未测量的项通常用预估高度兜底，等真实高度回来后再渐进修正。

### Vue 注意点

大列表里每行组件要轻，props 要稳定；不要在行模板里创建大量闭包或复杂计算。`key` 要使用业务唯一 id，不能简单用可见区下标，否则滚动复用时容易造成输入框、焦点、动画或内部状态错乱。

如果列表数据很大且基本不可变，可以配合 `shallowRef` 保存数据源，避免 Vue 对深层对象做大量响应式转换。成熟项目优先考虑现成虚拟滚动库，除非需求很简单或需要深度定制；手写版本还要额外处理反向列表、滚动到指定项、容器 resize、焦点和可访问性。

---
id: vue-040
module: Vue
difficulty: 2
tags: [表单, 校验, 架构]
source: 高频
---
## 题目
Vue 中如何设计一个可维护的表单校验方案？

## 答案
## 表单校验设计

可维护表单要把字段状态、校验规则、错误展示、提交流程和异步校验分层，而不是在每个 input 的事件里散写 if。

### 基本结构

1. 表单模型：保存字段值。
2. 字段元数据：label、required、触发时机、组件类型。
3. 校验规则：同步规则和异步规则。
4. 字段状态：`touched`、`dirty`、`validating`、`disabled`。
5. 错误状态：按字段保存错误信息，区分前端校验错误和服务端返回错误。
6. 提交流程：先校验，再调用 API，提交中禁用重复点击，失败时映射服务端错误。

```ts
type LoginForm = {
  email: string
  password: string
}

type Rule<K extends keyof LoginForm> = (
  value: LoginForm[K],
  form: LoginForm,
) => string | void | Promise<string | void>

const form = reactive<LoginForm>({ email: '', password: '' })
const errors = reactive<Partial<Record<keyof LoginForm, string>>>({})
const meta = reactive({
  email: { touched: false, dirty: false, validating: false },
  password: { touched: false, dirty: false, validating: false },
})

const rules: { [K in keyof LoginForm]: Rule<K>[] } = {
  email: [
    (value) => (value ? undefined : '请输入邮箱'),
    (value) => (value.includes('@') ? undefined : '请输入正确邮箱'),
  ],
  password: [(value) => (value.length >= 8 ? undefined : '密码至少 8 位')],
}

const validateVersions: Partial<Record<keyof LoginForm, number>> = {}

async function validateField<K extends keyof LoginForm>(name: K) {
  const version = (validateVersions[name] ?? 0) + 1
  validateVersions[name] = version
  meta[name].validating = true

  try {
    for (const rule of rules[name]) {
      const message = await rule(form[name], form)
      if (version !== validateVersions[name]) return false
      if (message) {
        errors[name] = message
        return false
      }
    }
    delete errors[name]
    return true
  } finally {
    if (version === validateVersions[name]) {
      meta[name].validating = false
    }
  }
}

async function validateForm() {
  const results = await Promise.all(
    (Object.keys(rules) as Array<keyof LoginForm>).map(validateField),
  )
  return results.every(Boolean)
}
```

### 工程建议

简单表单可以手写 composable；复杂业务表单可使用 vee-validate、FormKit 或基于 zod/yup 的 schema。异步校验要防抖并处理竞态，避免旧请求覆盖新结果；提交接口返回的字段错误要能回填到对应字段，非字段错误放到表单级错误区。

组件库表单还要提供字段注册、重置、清除校验、滚动到错误项和可访问性提示。错误文案应通过 `aria-invalid`、`aria-describedby` 关联到输入框；校验触发时机要区分 `input`、`blur`、`change` 和提交，不要一输入就打扰用户。Vue 中 `v-model` 只解决值同步，校验状态、错误展示和提交流程需要单独建模。

---
id: vue-041
module: Vue
difficulty: 2
tags: [SSR, Hydration, Nuxt]
source: 高频
---
## 题目
Vue 中 CSR、SSR、SSG 和 Hydration 分别是什么？如何选择？

## 答案
## 渲染模式

CSR 是浏览器下载 JS 后在客户端渲染页面；SSR 是服务端先把 HTML 渲染出来再发送给浏览器；SSG 是构建时预生成静态 HTML；Hydration 是客户端用同一份 Vue 应用接管服务端或静态 HTML，绑定事件并恢复交互能力。Vue SSR 客户端入口要用 `createSSRApp()` 挂载，这样才会执行 hydration，而不是重新创建 DOM。

### 对比

- CSR：架构简单，适合后台系统、强交互应用。
- SSR：首屏内容和 SEO 更好，适合内容需要异步获取且对首屏时间敏感的页面；代价是服务端负载、缓存、部署、同构代码和调试复杂度更高。
- SSG：适合构建时就能确定内容的文档、博客、营销页，运行时成本低；如果数据变了通常需要重新构建或重新生成。
- ISR 或增量生成：适合内容更新频率适中的站点，常见于 Nuxt 等元框架，不是 Vue 核心本身提供的渲染模式。

### Hydration 注意点

服务端生成的 DOM 必须和客户端首次渲染结果一致，否则会出现 hydration mismatch。常见原因包括使用 `Date.now()`、随机数、浏览器专属 API、用户时区差异、服务端无法获得的 localStorage 状态。

还要避免非法 HTML 嵌套，例如在 `<p>` 里放 `<div>`，浏览器会自动修正 DOM 结构，导致客户端 vnode 和真实 DOM 对不上。确实只能在客户端确定的内容，可以用 `v-if` + `onMounted`、框架的 `<ClientOnly>`，或 Vue 3.5+ 的 `data-allow-mismatch` 对不可避免的局部差异做显式处理。

SSR 代码要避免跨请求状态污染：应用实例、router、Pinia store 等应按请求创建，不能把用户相关状态放在模块顶层单例里。`onMounted`、`onUpdated` 不会在服务端执行，访问 `window`、`document`、localStorage、ResizeObserver、图表库等浏览器能力要放到客户端生命周期或条件分支中。

### 选择建议

管理后台通常 CSR 足够；内容稳定的官网、文档、博客优先考虑 SSG；商品详情、资讯详情、落地页这类需要 SEO 且数据经常变化的页面考虑 SSR。复杂 Vue SSR 项目优先考虑 Nuxt，避免手写双端构建、路由、数据预取、状态序列化、缓存和部署细节。

---
id: vue-042
module: Vue
difficulty: 2
tags: [Nuxt, 服务端渲染, 元框架]
source: 高频
---
## 题目
Nuxt 解决了 Vue 项目中的哪些问题？它和纯 Vue SPA 的区别是什么？

## 答案
## Nuxt 的定位

Nuxt 是基于 Vue 的元框架，提供文件路由、服务端渲染、静态生成、混合渲染、数据获取、自动导入、SEO meta、布局、中间件、模块生态、Nitro server API 和部署适配等能力。它解决的是“应用框架”问题，而不仅是组件渲染问题。

### 和纯 Vue SPA 的区别

纯 Vue SPA 通常由 Vite、Vue Router、Pinia 组合搭建，页面主要在浏览器渲染，路由、数据请求、SEO、权限中间件、API 代理和部署需要自己组合。Nuxt 则用约定式目录把这些能力整合起来，例如 `pages/` 生成路由，`layouts/` 组织页面外壳，`middleware/` 处理路由中间件，`server/api` 提供后端接口。

Nuxt 可以通过 `routeRules` 按路由选择 SSR、CSR、预渲染、缓存、重定向等策略。`useFetch`、`useAsyncData` 会把服务端拿到的数据序列化到 payload 中，客户端 hydration 时复用，避免首屏重复请求。纯 SPA 通常首次进入页面后才由浏览器请求数据，SEO 和首屏 HTML 内容要额外处理。

### 适合场景

1. 内容站、官网、文档、博客。
2. 需要 SEO 的商品详情、活动页。
3. 首屏速度和社交分享预览很重要的业务。
4. 希望前后端轻量一体化的项目。
5. 需要按页面混合 SSR、SSG、CSR 或边缘部署的项目。

### 注意事项

Nuxt 带来约定和服务端运行时，需要理解服务端/客户端边界。访问 `window`、`document`、localStorage 的代码要放到客户端生命周期或条件判断中；共享状态要避免跨请求污染。数据获取函数要尽量保持可序列化、可缓存、无副作用，避免同一数据在服务端和客户端重复请求。

如果是纯后台系统、强客户端交互、对 SEO 和首屏 HTML 不敏感，Vite + Vue Router + Pinia 的 SPA 往往更简单。Nuxt 的价值在于把渲染模式、路由约定、服务端能力和部署适配统一起来，但也会增加框架约定、构建链路和运行时心智成本。

---
id: vue-043
module: Vue
difficulty: 2
tags: [TypeScript, props, emits]
source: 高频
---
## 题目
Vue 3 与 TypeScript 结合时，如何给 props、emits、ref 和模板引用写类型？

## 答案
## Props 和 Emits

`<script setup lang="ts">` 下可以直接用类型声明 props 和 emits。

```vue
<script setup lang="ts">
interface Props {
  title: string
  count?: number
  labels?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
  labels: () => [],
})

const emit = defineEmits<{
  submit: [id: string]
  cancel: []
}>()
</script>
```

`defineProps` 可以用运行时声明或类型声明，但不要两种混用。Vue 3.5+ 支持响应式 props 解构和默认值：

```ts
const { count = 0, labels = [] } = defineProps<Props>()
```

Vue 3.4 及以下或不使用解构时常用 `withDefaults`；数组、对象这类可变默认值要写成函数返回，避免多个组件实例共享同一份引用。

### ref 类型

```ts
const count = ref<number>(0)
const user = ref<User | null>(null)
const list = ref<User[]>([])
const maybeCount = ref<number>()
```

很多时候 TS 可以从初始值推断类型；初始值为 `null`、空数组，或调用 `ref<T>()` 但不传初始值时要显式声明。`ref<T>()` 的结果会包含 `undefined`，访问时要处理空值。`reactive()` 通常让 TS 从对象推断，官方不推荐给 `reactive<T>()` 直接传泛型，因为返回类型包含嵌套 ref 解包，和泛型本身不完全一致。

### 模板引用

Vue 3.5+ 推荐使用 `useTemplateRef()`，配合 `@vue/language-tools` 2.1+，静态 DOM ref 和组件 ref 通常可以自动推断类型。

```vue
<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'

const inputRef = useTemplateRef<HTMLInputElement>('input')

onMounted(() => {
  inputRef.value?.focus()
})
</script>

<template>
  <input ref="input" />
</template>
```

Vue 3.5 之前可以手写 `ref<HTMLInputElement | null>(null)`：

```ts
const inputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
  inputRef.value?.focus()
})
```

子组件实例引用应配合 `defineExpose` 暴露稳定 API，不要让父组件依赖子组件内部实现。普通组件可以用 `InstanceType<typeof Child>` 获取实例类型，动态组件或不关心具体 API 时可以退到 `ComponentPublicInstance`。

```ts
import { useTemplateRef } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import UserDialog from './UserDialog.vue'

type UserDialogInstance = InstanceType<typeof UserDialog>

const dialogRef = useTemplateRef<UserDialogInstance>('dialog')
const dynamicRef = useTemplateRef<ComponentPublicInstance>('dynamic')
```

如果子组件使用 `<script setup>`，默认是私有的，父组件只能访问 `defineExpose` 暴露的内容；`defineExpose` 必须在 `await` 之前调用。

### 建议

公共组件的 props、emits、slots 和 expose 都要类型化；业务组件避免到处写 `any`。TypeScript 只负责编译期，外部 API、localStorage、URL 参数等运行时数据仍要配合 zod、valibot 或手写校验。

---
id: vue-044
module: Vue
difficulty: 2
tags: [template ref, defineExpose, DOM]
source: 高频
---
## 题目
Vue 中 template ref 如何使用？父组件如何调用子组件方法？

## 答案
## Template ref

Template ref 用来访问 DOM 元素或子组件实例。访问时机通常在 `onMounted` 之后。

```vue
<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'

const inputRef = useTemplateRef<HTMLInputElement>('input')

onMounted(() => {
  inputRef.value?.focus()
})
</script>

<template>
  <input ref="input" />
</template>
```

Vue 3.5+ 推荐 `useTemplateRef()`，静态 DOM ref 通常可以由 IDE 自动推断类型；Vue 3.5 之前可以使用 `ref<HTMLInputElement | null>(null)`，变量名要和模板里的 `ref` 值一致。`ref` 只能在挂载后访问，遇到 `v-if` 卸载时还可能重新变成 `null`，因此访问时要做空值判断。

### 调用子组件方法

子组件使用 `<script setup>` 时，默认不会把内部变量暴露给父组件，需要显式 `defineExpose`。

```vue
<!-- Child.vue -->
<script setup lang="ts">
function reset() {
  // ...
}

defineExpose({ reset })
</script>
```

```ts
import { useTemplateRef } from 'vue'
import Child from './Child.vue'

type ChildInstance = InstanceType<typeof Child>

const childRef = useTemplateRef<ChildInstance>('child')
childRef.value?.reset()
```

```vue
<Child ref="child" />
```

### 注意事项

1. 不要滥用 ref 做父子通信。能用 props/emit 表达的数据流优先用 props/emit；ref 更适合命令式能力，例如聚焦、滚动、重置、打开文件选择器。
2. `<script setup>` 组件默认私有，父组件只能访问 `defineExpose` 暴露的 API；`defineExpose` 必须在任何 `await` 之前调用，否则 await 之后暴露的属性不会被父组件拿到。
3. Options API 或非 `<script setup>` 子组件默认会暴露完整组件实例，容易造成父子强耦合，可以用 `expose` 选项限制公开 API。
4. `ref` 用在 `v-for` 中时得到的是数组；Vue 3.5+ 可用 `useTemplateRef('items')` 获取，但这个数组顺序不保证和源数组完全一致。
5. 需要自己管理引用映射或处理复杂列表时，可以使用函数 ref；元素卸载时函数会收到 `null`。

---
id: vue-045
module: Vue
difficulty: 2
tags: [provide, inject, TypeScript]
source: 高频
---
## 题目
如何用 TypeScript 类型化 `provide` / `inject`？为什么推荐使用 `InjectionKey`？

## 答案
## 类型化依赖注入

字符串 key 容易冲突，也无法给 `inject` 提供精确类型。Vue 提供 `InjectionKey<T>`，本质是带泛型的 Symbol key。

```ts
import { inject, provide, readonly, ref } from 'vue'
import type { InjectionKey, Ref } from 'vue'

interface FormContext {
  model: Ref<Record<string, unknown>>
  validateField: (name: string) => Promise<boolean>
  reset: () => void
}

export const formKey: InjectionKey<FormContext> = Symbol('form')
```

Provider:

```ts
const model = ref<Record<string, unknown>>({})

provide(formKey, {
  model,
  validateField,
  reset,
})
```

Consumer:

```ts
export function useFormContext() {
  const form = inject(formKey)
  if (!form) {
    throw new Error('Form context is missing')
  }
  return form
}
```

如果注入是可选能力，可以提供默认值；默认值创建成本高或需要每个组件独立实例时，用第三个参数 `true` 表示第二个参数是工厂函数。

```ts
const form = inject(formKey, () => createEmptyFormContext(), true)
```

字符串 key 也可以手动写泛型，但类型不会在 provider 和 consumer 之间自动联动：

```ts
const theme = inject<'light' | 'dark'>('theme', 'light')
```

插件或全局能力可以用 app-level provide：

```ts
app.provide(formKey, formContext)
```

响应式状态会保持响应式连接；如果提供的是 `ref`，注入方拿到的仍是这个 ref，不会自动解包。为了降低耦合，通常把修改逻辑留在 provider 内部，对外提供只读状态和显式方法。

```ts
provide(formKey, {
  model: readonly(model) as FormContext['model'],
  validateField,
  reset,
})
```

如果不想用类型断言，可以在 `FormContext` 中把 `model` 明确建模为只读 ref。

```ts
interface FormContext {
  model: Readonly<Ref<Record<string, unknown>>>
  validateField: (name: string) => Promise<boolean>
  reset: () => void
}
```

### 好处

1. key 唯一，避免不同库或组件冲突。
2. provider 和 consumer 类型一致。
3. 封装 `useFormContext` 后可以集中处理缺失 provider 的错误。
4. key 可以放到单独文件导出，跨 provider 和 consumer 复用，避免散落的字符串常量。

### 设计建议

对外只暴露必要能力，不要把整个组件内部状态都 provide 出去。需要只读的状态可以提供 `readonly(state)`，修改通过明确方法完成。`provide()` / `inject()` 应同步调用在 `setup` 或 `<script setup>` 中；多个祖先提供同一个 key 时，注入会解析到最近的 provider。

---
id: vue-046
module: Vue
difficulty: 2
tags: [安全, XSS, 模板]
source: 高频
---
## 题目
Vue 项目如何防御 XSS？`v-html` 有什么风险？

## 答案
## Vue 的默认保护

Vue 模板插值默认会转义 HTML，所以普通 `{{ content }}` 不会把字符串当 HTML 执行；动态属性绑定也会通过浏览器原生 API 转义，避免用户输入闭合属性后插入新 HTML。

```vue
<p>{{ userInput }}</p>
<button :title="userInput">hover</button>
```

如果用户输入是 `<img onerror=alert(1)>`，会按文本展示。

最重要的规则是：永远不要把不可信内容当作 Vue template 编译。Vue 模板会被编译成 JavaScript，模板表达式会在渲染过程中执行；如果把用户输入拼进 `template`，本质上等于允许执行任意代码，SSR 场景还可能扩大到服务端风险。

```ts
// 危险：不要这样做
createApp({
  template: `<div>${userProvidedTemplate}</div>`,
})
```

## `v-html` 风险

`v-html` 会把字符串作为 HTML 插入 DOM，如果内容来自用户或不可信来源，可能带来 HTML 注入、事件属性、危险链接或样式注入风险。render function / JSX 中的 `innerHTML` 和 `v-html` 是同类风险。

```vue
<!-- 危险：不要直接渲染不可信内容 -->
<div v-html="comment.html" />
```

### 防御措施

1. 尽量避免 `v-html`，优先使用结构化数据渲染。
2. 必须渲染富文本时，用 DOMPurify 等白名单清洗，最好在服务端入库前清洗，并在前端渲染前再次按需防御。
3. 链接要校验协议，避免 `javascript:`；URL 清洗如果只发生在前端，说明脏数据已经进入系统，后端仍要处理。
4. 不要把用户提供的整段 CSS 或 `<style>` 渲染进页面；允许样式定制时只开放安全的白名单属性和值，避免遮罩诱导点击等攻击。
5. 不要把用户输入绑定到 `onclick`、`onfocus` 这类字符串事件属性；Vue 事件绑定应指向自己代码里的函数。
6. 不要把 Vue 挂载到包含服务端渲染用户内容的整页节点上，攻击者可能提供“普通 HTML 安全但作为 Vue template 不安全”的内容。
7. 配置 CSP，降低脚本注入后的破坏面。
8. token 不要放容易被脚本读取的地方，结合 HttpOnly Cookie、SameSite 和 CSRF 防护评估。

安全回答要强调：Vue 只能保护模板插值，主动绕过转义的 API 必须自己负责清洗。

---
id: vue-047
module: Vue
difficulty: 2
tags: [组件库, 设计, 可访问性]
source: 高频
---
## 题目
如何设计一个 Vue 组件库中的 Button 或 Modal？需要考虑哪些 API 和工程细节？

## 答案
## 组件库设计思路

组件库不是把样式封装一下，而是提供稳定 API、可访问性、主题能力、类型提示和可维护实现。

### Button API

常见 props 包括 `variant`、`size`、`disabled`、`loading`、`icon`、`nativeType`。事件包括 `click`。底层优先使用原生 `<button>`，默认 `type="button"`，避免放在表单里意外触发 submit；`disabled` 和 `loading` 时要阻止重复点击，loading 状态可以配合 `aria-busy` 或禁用状态表达。

```vue
<BaseButton variant="primary" size="small" :loading="saving">
  保存
</BaseButton>
```

组件需要支持 attrs 透传，让 `aria-*`、`data-*`、`id` 等落到底层 button。若外层有包装元素，要用 `inheritAttrs: false` 或 `defineOptions({ inheritAttrs: false })`，手动把 `$attrs` 绑定到真正可交互元素，避免无障碍属性落错节点。

### Modal API

Modal 通常需要 `v-model:open`、title、default/footer slot、confirm/cancel/close 事件、ESC 关闭、遮罩关闭、焦点陷阱、滚动锁定和 Teleport。

```vue
<BaseModal v-model:open="open" title="确认删除">
  删除后不可恢复
</BaseModal>
```

```vue
<Teleport to="body">
  <div v-if="open" class="modal-mask" @click.self="requestClose('mask')">
    <section
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="descriptionId"
    >
      <h2 :id="titleId">{{ title }}</h2>
      <div :id="descriptionId">
        <slot />
      </div>
      <slot name="footer" />
    </section>
  </div>
</Teleport>
```

Modal 的核心不是“显示一个浮层”，而是管理交互上下文：打开时把焦点移动到合适元素，Tab/Shift+Tab 限制在对话框内，关闭后恢复到触发按钮；背景内容不能被键盘或读屏软件误操作；ESC、遮罩点击、右上角关闭、确认取消都要走统一关闭流程，并支持业务拦截，例如 `beforeClose` 或异步确认。

### 工程细节

1. Props 和 emits 完整类型化。
2. 明确受控 API：`open` 由父组件控制，内部通过 `emit('update:open', false)` 请求关闭，不要直接修改 prop。
3. 支持主题变量、尺寸、状态、暗色模式和按需引入。
4. 样式隔离但允许必要定制，例如 CSS 变量、class 前缀、插槽或 headless 变体。
5. 单元测试覆盖 props、slots、emits、attrs 透传、键盘交互、焦点恢复、滚动锁和 Teleport。
6. 文档展示 API、示例、可访问性说明、设计 token 和迁移说明。
7. Modal 要处理多实例层级、z-index、嵌套弹窗和 body 滚动锁计数，避免一个弹窗关闭就提前解锁页面滚动。

公共组件的目标是稳定、可组合、可预测，而不是一次性满足当前页面。

---
id: vue-048
module: Vue
difficulty: 2
tags: [测试, Vitest, Vue Test Utils]
source: 高频
---
## 题目
Vue 组件和 composable 如何测试？常用测试策略是什么？

## 答案
## 测试层次

Vue 项目常用 Vitest + Vue Test Utils 做单元和组件测试，用 Playwright 做端到端测试。测试重点是行为和契约，而不是实现细节。

### 组件测试

```ts
import { mount } from '@vue/test-utils'
import Counter from './Counter.vue'

it('increments count', async () => {
  const wrapper = mount(Counter)
  await wrapper.get('button').trigger('click')
  expect(wrapper.text()).toContain('1')
})
```

组件测试可以断言 props 渲染、emit 事件、条件展示、用户交互、异步状态和错误状态。Vue DOM 更新是异步的，`trigger()`、`setValue()` 这类会触发更新的方法要 `await`；组件内部 Promise、接口 mock 或异步 setup 通常还要配合 `flushPromises()`。

```ts
import { flushPromises, mount } from '@vue/test-utils'
import SaveButton from './SaveButton.vue'

it('emits save after click', async () => {
  const wrapper = mount(SaveButton, {
    props: { disabled: false },
  })

  await wrapper.get('[data-test="save"]').trigger('click')

  expect(wrapper.emitted('save')).toHaveLength(1)
})

it('renders async result', async () => {
  vi.spyOn(api, 'loadUser').mockResolvedValue({ name: 'Ada' })
  const wrapper = mount(UserCard)

  await flushPromises()

  expect(wrapper.text()).toContain('Ada')
})
```

依赖 Router、Pinia、provide/inject 或全局组件时，不要在每个测试里偷偷依赖真实应用入口。用 `global.plugins` 注入测试 router/store，用 `global.provide` 提供上下文，用 `global.stubs` 隔离重型子组件。选择器优先用 `data-test`，少依赖样式类名和 DOM 结构。

### Composable 测试

普通 composable 可以直接调用；依赖生命周期的 composable 需要挂到临时组件里测试。

```ts
const { count, inc } = useCounter()
inc()
expect(count.value).toBe(1)
```

```ts
function mountComposable<T>(useComposable: () => T) {
  let result!: T
  const wrapper = mount({
    setup() {
      result = useComposable()
      return () => null
    },
  })
  return { result, unmount: () => wrapper.unmount() }
}

it('cleans up timer on unmount', () => {
  vi.useFakeTimers()
  const clearSpy = vi.spyOn(window, 'clearInterval')
  const { unmount } = mountComposable(() => usePolling())

  unmount()

  expect(clearSpy).toHaveBeenCalled()
  vi.useRealTimers()
})
```

### 策略

业务组件少测快照，多测关键路径；公共组件要测边界、可访问性和事件契约；composable 要测输入输出、清理副作用、取消和竞态；路由、权限、登录、支付等跨页面流程用 E2E 覆盖。

单元测试适合快速验证纯逻辑和组件契约，组件测试适合验证用户可观察行为，E2E 适合验证真实浏览器中的集成路径。不要测试实现细节，例如直接断言私有 ref 或内部方法；更应该像用户一样交互，再断言 DOM、emit、请求调用、路由跳转和可访问状态。异步测试要等待 Promise、`flushPromises` 或 `nextTick`，定时器逻辑用 Vitest fake timers 控制时间。

---
id: vue-049
module: Vue
difficulty: 2
tags: [API封装, 请求, 状态管理]
source: 高频
---
## 题目
Vue 项目中如何封装 API 请求层？如何处理 loading、错误、取消和竞态？

## 答案
## 请求层分层

成熟项目通常把请求分为 HTTP client、业务 API、server state 管理和页面 UI 状态几层。HTTP client 处理 baseURL、headers、超时、取消、错误归一和登录态；业务 API 暴露明确函数；页面、store 或 TanStack Query for Vue 处理 loading、缓存、刷新和 UI 展示。

```ts
class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message)
  }
}

async function request<T>(url: string, options: RequestInit = {}) {
  const response = await fetch(`${baseURL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(body?.message ?? 'Request failed', response.status, body?.code)
  }

  return response.json() as Promise<T>
}
```

```ts
export function getUser(id: string, signal?: AbortSignal) {
  return request<User>(`/users/${id}`, { signal })
}
```

### loading 和错误

简单页面可以在组件内维护 `idle/loading/success/error` 状态；跨页面共享、需要缓存、重试、失效刷新、分页或乐观更新的数据，不建议全部塞进 Pinia，可考虑 TanStack Query for Vue 这类 server state 工具。Pinia 更适合登录态、权限、主题、购物车这类客户端状态或业务全局状态。

错误处理要分层：HTTP client 归一化错误结构；业务层决定哪些错误可重试；页面层决定提示 toast、表单字段错误、空状态还是静默失败。取消请求产生的 `AbortError` 通常不应展示成用户错误。

### 取消和竞态

搜索、联想、路由切换时容易出现旧请求晚返回覆盖新数据。可以使用 `AbortController` 或请求序号。

```ts
import { onScopeDispose, ref } from 'vue'

const result = ref<User[]>([])
const loading = ref(false)
const requestError = ref<unknown>(null)

let requestId = 0
let controller: AbortController | null = null

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

async function search(keyword: string) {
  controller?.abort()
  controller = new AbortController()
  const currentId = ++requestId

  loading.value = true
  requestError.value = null

  try {
    const data = await api.search(keyword, { signal: controller.signal })
    if (currentId === requestId) {
      result.value = data
    }
  } catch (error) {
    if (currentId === requestId && !isAbortError(error)) {
      requestError.value = error
    }
  } finally {
    if (currentId === requestId) {
      loading.value = false
    }
  }
}

onScopeDispose(() => {
  controller?.abort()
})
```

如果请求由 `watch` 触发，Vue 3.5+ 可以用 `onWatcherCleanup()` 取消过期请求；兼容写法是使用 `watch` 回调第三个参数 `onCleanup`。注意 `onWatcherCleanup()` 必须同步调用，不能放在 `await` 之后。

### 注意事项

token 刷新要避免并发刷新风暴，常见做法是维护一个 refresh promise 队列，让 401 请求等待同一次刷新完成后重放；刷新失败则统一登出并清理缓存。错误提示要区分静默错误和用户可处理错误；列表接口要统一分页、排序、筛选参数。不要把所有请求状态都做成全局状态，页面局部请求就近管理，跨页面 server state 再抽缓存和失效策略。

---
id: vue-050
module: Vue
difficulty: 2
tags: [权限, RBAC, 路由]
source: 高频
---
## 题目
Vue 后台系统如何实现权限控制？路由权限和按钮权限分别怎么做？

## 答案
## 权限控制层次

后台权限通常分为路由级、菜单级、按钮级和数据级。前端负责体验和入口控制，后端必须负责真正的数据和接口鉴权。

### 路由权限

路由配置中写 `meta.permission`、`meta.roles` 或 `meta.requiresAuth`，登录后先加载用户信息和权限，再在全局守卫中判断。Vue Router 4 守卫可以直接返回路由位置或 `false`，通常不再写老式 `next`。

```ts
router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (auth.hasToken && !auth.permissionsLoaded) {
    await auth.loadPermissions()
  }

  if (to.meta.requiresAuth && !auth.isLogin && to.name !== 'Login') {
    return {
      name: 'Login',
      query: { redirect: to.fullPath },
      replace: true,
    }
  }

  const required = to.meta.permission as string | string[] | undefined
  if (required && !auth.hasEveryPermission(required)) {
    return { name: 'Forbidden', replace: true }
  }
})
```

动态路由可以在权限加载后用 `router.addRoute()` 注入，登出或切换账号时用返回的 remove callback 或 `router.removeRoute()` 清理。若菜单和路由由后端下发，前端只能把后端返回的路由 key 映射到本地白名单组件，不能直接信任后端返回的任意 import 路径或组件字符串。

### 菜单权限

菜单可以由后端返回，或前端根据路由 meta 和权限表过滤。关键是保持菜单和路由来源一致，避免菜单能隐藏但 URL 直接访问仍然成功。

### 按钮权限

常见做法是封装指令或组件。

```vue
<button v-if="can('user:delete')">删除</button>
```

公共项目里可以封装 `v-permission` 指令或 `<Can permission="user:delete">` 组件，统一处理单权限、多权限、任一满足和全部满足。按钮权限有两种产品语义：隐藏表示用户不需要知道这个能力；禁用并展示原因适合流程上可见但当前不可操作的动作。

```vue
<Can :permission="['user:delete', 'user:admin']" mode="some">
  <button>删除</button>
</Can>
```

权限判断建议基于稳定的 permission code，例如 `user:create`、`order:refund`，而不是直接绑中文菜单名或按钮文案。

### 注意事项

前端权限不能替代服务端鉴权；按钮隐藏也不能阻止用户直接调用接口。数据级权限，例如“只能看本部门订单”或“只能操作自己创建的数据”，必须由后端在查询和写入接口里校验，前端最多做筛选条件和提示。

权限变更后要处理缓存刷新、动态路由重置、菜单重算、标签页关闭、KeepAlive 缓存清理和多标签页同步。常见做法是把权限版本号或用户信息更新时间放到 store / localStorage / BroadcastChannel 中，检测到变化后重新拉取权限并刷新可访问页面。权限系统要区分 RBAC、ABAC 和数据权限，不要把所有复杂规则都硬编码到前端。

---
id: vue-051
module: Vue
difficulty: 2
tags: [国际化, 主题, 工程实践]
source: 高频
---
## 题目
Vue 项目如何实现国际化和主题切换？

## 答案
## 国际化

国际化通常使用 vue-i18n。核心是把文案从组件中抽离成 key，根据当前 locale 选择语言包。

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <button>{{ t('common.save') }}</button>
</template>
```

切换语言时要同步 i18n 实例、持久化用户选择，并更新文档语言属性：

```ts
async function setLocale(locale: string) {
  if (!i18n.global.availableLocales.includes(locale)) {
    const messages = await import(`./locales/${locale}.json`)
    i18n.global.setLocaleMessage(locale, messages.default)
  }

  i18n.global.locale.value = locale
  document.documentElement.lang = locale
  localStorage.setItem('locale', locale)
}
```

### i18n 注意点

1. 语言包按路由或模块拆分，避免首屏加载所有语言。
2. 日期、数字、货币使用 Intl 或 i18n 工具格式化。
3. 不要拼接句子，语序在不同语言中可能不同；使用插值、复数规则和完整句子翻译。
4. 配置 fallback locale，避免缺失 key 直接暴露给用户。
5. 后端错误码映射为前端可翻译 key，而不是直接展示后端中文文案。
6. SSR 或 Nuxt 场景要让服务端和客户端初始 locale 一致，避免 hydration mismatch。
7. 阿拉伯语、希伯来语等 RTL 语言要同步 `dir="rtl"`，并优先使用逻辑属性如 `margin-inline-start`。

## 主题切换

主题可以用 CSS 变量实现，切换时改变根节点属性。

```css
:root {
  --color-bg: #fff;
  --color-text: #111;
  color-scheme: light;
}

[data-theme='dark'] {
  --color-bg: #111;
  --color-text: #fff;
  color-scheme: dark;
}

body {
  background: var(--color-bg);
  color: var(--color-text);
}
```

```ts
type Theme = 'light' | 'dark' | 'system'

function resolveTheme(theme: Theme) {
  if (theme !== 'system') return theme
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = resolveTheme(theme)
  localStorage.setItem('theme', theme)
}
```

### 工程建议

主题状态可存在 Pinia 和 localStorage；首次渲染要尽早应用主题，避免闪烁。常见做法是在 HTML head 里内联一小段脚本，先读取 localStorage 或 `prefers-color-scheme` 设置 `data-theme`，再加载主 CSS 和应用。

组件库中应以 token 设计颜色、间距和圆角，而不是散落硬编码颜色。token 可以分层：基础色、语义色、组件变量；业务组件只用语义变量，如 `--color-danger`、`--button-bg`。主题切换还要覆盖图标、图表、代码高亮、阴影、边框和第三方组件，并保证对比度达标。

---
id: vue-052
module: Vue
difficulty: 3
tags: [微前端, Vue, 架构]
source: 高频
---
## 题目
微前端中 Vue 应用如何接入？需要处理哪些生命周期、路由和样式问题？

## 答案
## Vue 微前端接入

Vue 子应用接入微前端时，通常要把应用创建、挂载、更新、卸载封装成生命周期，让主应用控制何时加载和销毁。不同框架命名不同，但核心都是 `bootstrap` / `mount` / `unmount`，有些还支持 `update`。

```ts
import type { App as VueApp } from 'vue'

let app: VueApp<Element> | null = null
let removeRouterGuard: (() => void) | null = null

export async function mount(container: Element, props: Props) {
  const base = props.basePath ?? '/sub-app/'
  const router = createRouter({
    history: createWebHistory(base),
    routes,
  })

  app = createApp(App, props)
  app.use(router)
  app.provide(hostServicesKey, props.hostServices)
  removeRouterGuard = router.beforeEach(syncTitleToHost)
  app.mount(container.querySelector('#app')!)
}

export async function update(props: Props) {
  props.hostServices?.emit('sub-app:update', props)
}

export async function unmount() {
  removeRouterGuard?.()
  removeRouterGuard = null
  app?.unmount()
  app = null
}
```

子应用还要支持独立运行，方便本地开发和回归测试。常见做法是根据是否处于微前端环境决定自动 `mount`，独立模式使用自己的容器、路由 base 和 mock host services。

### 关键问题

1. 路由 base：子应用路由要和主应用挂载路径匹配，router 应在 `mount` 时按 props 创建，避免多个实例共享同一个 router。
2. 样式隔离：可用命名空间、CSS Modules、Shadow DOM 或微前端框架能力。
3. 全局变量：避免污染 window，第三方库实例、事件监听、定时器和全局 store 要卸载清理。
4. 状态通信：通过 props、事件、主应用服务或明确的共享协议，不要随意互相 import 业务模块。
5. 资源路径：部署到子路径或 CDN 时注意 Vite `base`、动态 import chunk、图片和字体路径。
6. 共享依赖：Vue、Vue Router、组件库等大依赖可以共享，但要管理版本兼容；共享同一 Vue 实例能减少体积，也会增加升级协同成本。
7. 错误隔离：子应用加载失败、运行时异常和卸载异常要上报给主应用，并提供降级 UI。

### Vue 特别注意

卸载时必须调用 `app.unmount()`，清理定时器、订阅、全局事件、router guard、Pinia 订阅、WebSocket、ResizeObserver 和第三方库实例。KeepAlive、Teleport、弹窗容器如果挂到 body，也要在子应用卸载时清理。

如果使用 single-spa，Vue 3 + Vue Router 需要注意 root config 的 `urlRerouteOnly` 设置；single-spa-vue 可以生成 `bootstrap`、`mount`、`unmount` 生命周期，并通过 props 把主应用能力传给根组件。无论使用 qiankun、single-spa、module federation 还是 iframe，核心原则都是：生命周期可重复、资源可定位、状态可隔离、通信有边界、卸载无残留。

---
id: vue-053
module: Vue
difficulty: 3
tags: [响应式原理, Proxy, effect]
source: 深入
---
## 题目
Vue 3 响应式系统底层原理是什么？`track` 和 `trigger` 如何工作？

## 答案
## 响应式核心

Vue 3 响应式基于 Proxy 和 ReactiveEffect。读取响应式属性时收集依赖，修改属性时触发依赖重新执行。每个组件渲染、`computed`、`watchEffect` 都可以理解为一个 effect。

```text
targetMap: WeakMap<object, Map<key, Set<ReactiveEffect>>>
```

### 简化流程

```ts
let activeEffect: ReactiveEffect | undefined
const effectStack: ReactiveEffect[] = []

function effect(fn, options = {}) {
  const reactiveEffect = () => {
    cleanup(reactiveEffect)
    try {
      effectStack.push(reactiveEffect)
      activeEffect = reactiveEffect
      return fn()
    } finally {
      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1]
    }
  }
  reactiveEffect.deps = []
  reactiveEffect.scheduler = options.scheduler
  reactiveEffect()
  return reactiveEffect
}

function track(target, key) {
  if (!activeEffect) return
  let depsMap = targetMap.get(target)
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))
  let dep = depsMap.get(key)
  if (!dep) depsMap.set(key, (dep = new Set()))
  if (dep.has(activeEffect)) return
  dep.add(activeEffect)
  activeEffect.deps.push(dep)
}

function trigger(target, key) {
  const depsMap = targetMap.get(target)
  const effects = depsMap?.get(key)
  const effectsToRun = new Set(effects)
  effectsToRun.forEach((effect) => {
    effect.scheduler ? effect.scheduler(effect) : effect()
  })
}
```

### Proxy 拦截

`reactive` 返回 Proxy，在 `get` 中 `track`，在 `set/delete` 中 `trigger`。`has` 会影响 `in` 判断，`ownKeys` 会影响 `for...in` / `Object.keys` 这类迭代依赖；集合类型还要处理 `Map` / `Set` 的 `add`、`delete`、`clear`、`size` 和迭代。`ref` 则在 `.value` 的 getter/setter 中做依赖收集和触发。

```ts
const state = reactive({ count: 0 })

effect(() => {
  console.log(state.count)
})

state.count++
```

第一次执行 effect 时读取 `state.count`，`get` 拦截触发 `track(state, 'count')`，把当前 effect 放进对应 dep。之后修改 `state.count`，`set` 拦截触发 `trigger(state, 'count')`，找到 dep 里的 effect，再交给 scheduler 或直接执行。

### 难点

真实实现还要处理 effect 栈、分支切换的依赖清理、数组 length、Map/Set、嵌套响应式、只读、浅响应式、调度器、停止监听和避免 effect 自己触发自己。依赖清理很重要：如果 effect 中有 `if/else`，下一次执行走了另一个分支，旧分支依赖应该被移除，否则会出现无关字段也触发更新。

Vue 响应式是运行时系统，不能追踪普通局部变量读写，只能拦截对象属性访问。因此把 reactive 对象属性解构到普通变量后会丢失这层 get/set 追踪；另外 `reactive()` 返回的是 Proxy，和原始对象不是同一个引用。调试渲染依赖时可以用开发模式下的 `onRenderTracked`、`onRenderTriggered`，`computed` 和 watcher 也支持 `onTrack` / `onTrigger`。

面试中能讲清 WeakMap 依赖结构、activeEffect、读写触发链路、scheduler 和依赖清理，就是核心。

---
id: vue-054
module: Vue
difficulty: 3
tags: [调度器, 更新队列, nextTick]
source: 深入
---
## 题目
Vue 的更新调度器如何避免重复渲染？`queueJob` 和 `nextTick` 的关系是什么？

## 答案
## 调度器目标

响应式状态可能在同一个事件处理中被多次修改。Vue 不希望每改一次就立刻渲染一次，而是把组件更新 job 放入队列，去重后在微任务中批量 flush。

```ts
count.value++
count.value++
count.value++
// 组件通常只更新一次
```

### 简化模型

```text
trigger -> scheduler -> queueJob(updateJob)
queueJob 去重并安排 flush
Promise.resolve().then(flushJobs)
flushJobs 执行 pre callbacks、组件更新 job、post flush callbacks
```

```ts
const queue: SchedulerJob[] = []
let isFlushing = false
let currentFlushPromise: Promise<void> | null = null
const resolvedPromise = Promise.resolve()

function queueJob(job: SchedulerJob) {
  if (!queue.includes(job)) {
    queue.push(job)
    queueFlush()
  }
}

function queueFlush() {
  if (!currentFlushPromise) {
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}

function flushJobs() {
  isFlushing = true
  try {
    queue.sort((a, b) => getId(a) - getId(b))
    for (const job of queue) {
      job()
    }
  } finally {
    queue.length = 0
    currentFlushPromise = null
    isFlushing = false
  }
}
```

真实实现不会简单 `includes` 全队列，而是用 job 标记位和插入位置控制去重、递归和顺序；这里的代码只是说明模型。

### 为什么能去重

每个组件的渲染 effect 对应稳定的 update job。多次触发同一个组件时，队列中已存在该 job 就不重复加入。flush 时还会按组件 id 等顺序执行，通常父组件先于子组件更新；如果子组件在父组件更新过程中被卸载，子组件的 job 可以被跳过。

调度器不只处理组件更新，还处理 watcher 和生命周期相关回调。`flush: 'pre'` 的 watcher 默认在组件 DOM 更新前执行，适合根据新状态做派生副作用；`flush: 'post'` 会进 post flush 队列，适合读取更新后的 DOM；`flush: 'sync'` 绕过批处理同步执行，要谨慎使用。

### `nextTick`

`nextTick` 返回当前 flush Promise；如果当前没有待 flush 的更新，则返回一个已 resolved 的 Promise。它等待的是已经排队的 DOM 更新执行完成，因此不是“创建一个更新”，而是“等待这一轮更新队列结束”。

```ts
count.value++
await nextTick()
// 这里再读取 DOM，才能看到 count 对应的更新结果
```

如果在 flush 过程中又产生新 job，调度器会在当前轮末尾继续 flush，直到主队列和 post flush 队列都清空。`nextTick` 等待的是这条 flush 链路，而不是浏览器下一帧；需要等布局和绘制时才考虑 `requestAnimationFrame`。

### 注意点

调度器需要处理递归更新。组件更新和 watcher 回调在特定情况下允许递归触发自己，但开发模式会做递归次数保护，避免无限更新。`flush: 'sync'` 的 watcher 会绕过普通批处理同步执行，如果源数据在一个循环中被频繁修改，可能带来性能问题。

调度器回答的重点是：响应式负责发现谁变了，scheduler 负责决定什么时候批量更新；`queueJob` 负责去重和排序，`flushJobs` 负责执行队列，`nextTick` 只是等待当前更新队列完成。

---
id: vue-055
module: Vue
difficulty: 3
tags: [编译器, SFC, AST]
source: 深入
---
## 题目
Vue SFC 从 `.vue` 文件到可执行代码大致经历了哪些编译步骤？

## 答案
## SFC 编译流程

`.vue` 文件不是浏览器直接执行的格式，需要由 `@vue/compiler-sfc` 和构建工具处理。整体上会先解析成 SFC descriptor，再生成一个 facade module，由构建工具用不同 query 分别处理 template、script、style，最后组合成普通 JavaScript 模块。

### 主要步骤

1. Parse SFC：把 `.vue` 解析成 descriptor，包含 template、script、script setup、style、custom blocks。
2. 生成 facade module：主模块 import `?vue&type=script`、`?vue&type=template`、`?vue&type=style` 等虚拟模块，再把 render、scope id 和 HMR 元信息挂回组件。
3. 编译 script：`compileScript` 处理 `<script setup>` 宏、props/emits 提升、顶层绑定分析、`defineExpose`、`defineModel`、CSS vars 注入等，生成 setup 相关代码。
4. 编译 template：`compileTemplate` 走 template -> AST -> transform -> codegen，生成 render 函数，并结合 script 绑定信息判断哪些标识符来自 setup。
5. 编译 style：`compileStyle` 处理 scoped、CSS modules、`v-bind()` CSS vars、预处理器和 sourcemap。
6. 组合模块：把 render 挂到组件对象上，注入 scope id、`__file`、HMR 代码等。

一个简化的 facade module 类似：

```ts
import script from './Foo.vue?vue&type=script'
import { render } from './Foo.vue?vue&type=template&id=abc123'
import './Foo.vue?vue&type=style&index=0&scoped&id=abc123'

script.render = render
script.__scopeId = 'data-v-abc123'
script.__file = 'Foo.vue'

export default script
```

### 为什么编译重要

Vue 编译器不仅把模板转成 render 函数，还会标记静态节点、动态绑定和 PatchFlag，让运行时更新更精准。`<script setup>` 的宏也是编译期能力，运行时不存在 `defineProps`、`defineEmits`、`defineExpose` 这些函数。

SFC 拆 block 编译还有工程收益：template 热更新可以尽量保留组件状态，style 热更新可以不触发组件重新渲染；style 预处理交给构建工具生态处理；source map 能把编译后的错误映射回 `.vue` 源文件。`<style scoped>` 本质是编译器给模板节点和 CSS 选择器加同一个 scope id；`v-bind()` CSS 变量会被编译成注入到组件根上的 CSS 自定义属性。

### 面试总结

Vue 的性能和开发体验很大一部分来自编译期：模板可静态分析，SFC 可拆分处理，运行时代码因此更少做猜测。面试时能讲清 descriptor、facade module、`compileScript` / `compileTemplate` / `compileStyle` 和 scope id，就说明理解到位。

---
id: vue-056
module: Vue
difficulty: 3
tags: [PatchFlag, Block Tree, 编译优化]
source: 深入
---
## 题目
Vue 3 的 PatchFlag 和 Block Tree 是什么？它们如何提升更新性能？

## 答案
## 编译期优化

Vue 模板可被编译器静态分析。编译器知道哪些节点是静态的，哪些绑定是动态的，于是可以在生成 render 函数时附带优化信息。

### PatchFlag

PatchFlag 是动态节点上的标记，用来告诉运行时这个节点哪些部分可能变化，例如 class、style、props、文本内容。

```vue
<div :class="cls">{{ title }}</div>
```

会被编译成近似代码：

```ts
return (_openBlock(), _createElementBlock('div', { class: _ctx.cls }, [
  _createTextVNode(_toDisplayString(_ctx.title), 1 /* TEXT */),
], 2 /* CLASS */))
```

运行时不需要完整比较所有 props，而是根据标记只更新 class 和 text。常见标记包括 `TEXT`、`CLASS`、`STYLE`、`PROPS`、`FULL_PROPS`、`HYDRATE_EVENTS`、`STABLE_FRAGMENT`、`KEYED_FRAGMENT`、`UNKEYED_FRAGMENT`、`NEED_PATCH`、`DYNAMIC_SLOTS`。如果是 `PROPS`，编译器还会生成 `dynamicProps` 数组，只比较可能变化的 prop key。

### Block Tree

Block Tree 会把动态节点收集到 block 的 `dynamicChildren` 中。更新时，Vue 可以跳过大量稳定结构，只遍历动态子节点。

```text
稳定 DOM 结构
  dynamicChildren: [绑定了 title 的节点, 绑定了 class 的节点]
```

`openBlock()` 会开启动态节点收集，`createElementBlock()` 会创建 block root，并把当前收集到的动态子孙节点挂到 `dynamicChildren`。注意 `dynamicChildren` 收集的是有 PatchFlag 的动态后代，不只是直接子节点。

### 优势

传统虚拟 DOM diff 偏运行时，需要递归比较；Vue 通过编译期信息缩小比较范围。静态提升、事件缓存、PatchFlag、Block Tree 组合起来，让模板场景下更新更接近“定向 patch”。

```vue
<div>
  <h1>静态标题</h1>
  <p>{{ message }}</p>
  <button @click="save">保存</button>
</div>
```

静态标题可以被提升，事件处理函数可以被缓存，真正更新时主要关注 `message` 对应的动态文本节点。这样 Vue 仍保留 VDOM 的跨平台、组件抽象和动态表达能力，但在模板可分析的场景下通过编译提示减少无意义遍历。

### 注意点

PatchFlag 是编译器给运行时的提示，不是用户日常 API。手写 render 函数或高度动态的 slot / `v-if` / `v-for` 结构可能让编译器失去部分静态信息，进入更保守的完整 diff 或 bail out 路径。动态 slot、动态组件、`FULL_PROPS`、手动 clone vnode 等场景都可能降低优化效果。

这也是为什么 Vue 推荐多数场景使用模板而不是总手写 render 函数：模板能给编译器更多优化空间。回答时不要把 PatchFlag 说成“跳过所有 diff”，更准确是：在结构稳定且有编译提示时，运行时可以跳过稳定子树，只 patch 编译器标记出的动态部分。

---
id: vue-057
module: Vue
difficulty: 3
tags: [Scoped CSS, 样式隔离, SFC]
source: 深入
---
## 题目
Vue SFC 的 scoped CSS 原理是什么？`:deep`、`:slotted`、`:global` 分别解决什么问题？

## 答案
## Scoped CSS 原理

`<style scoped>` 并不是真正 Shadow DOM，而是编译器给当前组件模板节点加一个唯一属性，再把 CSS 选择器也改写为带该属性的选择器。

```vue
<style scoped>
.title {
  color: red;
}
</style>
```

会近似编译为：

```css
.title[data-v-xxxx] {
  color: red;
}
```

模板中的元素也会带上 `data-v-xxxx`。如果组件有子组件，子组件的根节点会同时带父组件和子组件的 scope 属性，因此父组件可以给子组件根节点做布局样式，但不会影响子组件内部普通节点。

```vue
<!-- Parent.vue -->
<Child class="card" />

<style scoped>
.card {
  margin-block: 16px;
}
</style>
```

### 特殊选择器

- `:deep(.child)`：穿透到子组件内部，常用于覆盖第三方组件样式，编译时会把外层 scope 放在 deep 前面的选择器上。
- `:slotted(div)`：选择插槽传入内容。默认情况下，插槽内容由父组件拥有，不会被子组件 scoped 样式影响。
- `:global(.reset)`：声明全局样式，不加 scope 属性，适合少量全局工具类或第三方覆盖。

```vue
<style scoped>
.wrapper :deep(.third-party-button) {
  border-radius: 4px;
}

:slotted(a) {
  color: var(--link-color);
}

:global(.visually-hidden) {
  position: absolute;
}
</style>
```

### 注意事项

Scoped CSS 只能降低样式互相影响，不是强隔离。它仍然是普通 CSS 选择器，子组件根节点、全局样式、CSS 变量继承、Teleport 到 body 的内容和第三方样式都可能影响最终结果。

深度选择器会增加耦合，公共组件应优先暴露 class、CSS 变量或主题 token。递归组件中使用后代选择器要小心，例如 `.tree .label` 可能影响递归子树中所有 `.label`。`v-html` 生成的 DOM 不会带 scope 属性，因此普通 scoped 选择器选不到；确实需要样式化时可以用 `:deep()`，但要先处理 XSS 风险。

性能上，scoped 会把选择器改写成属性选择器，浏览器仍能处理，但标签选择器如 `p[data-v-xxxx]` 通常比类选择器 `.text[data-v-xxxx]` 更慢。复杂组件里优先使用 class 选择器，并避免过深后代选择器。

---
id: vue-058
module: Vue
difficulty: 3
tags: [SSR, Hydration, 排错]
source: 深入
---
## 题目
Vue SSR 中 hydration mismatch 常见原因有哪些？如何排查和修复？

## 答案
## Hydration mismatch

Hydration 要求服务端输出的 HTML 与客户端首次渲染结果一致。如果不一致，Vue 需要修正 DOM，轻则控制台警告，重则交互异常或局部重新渲染。

### 常见原因

1. 服务端和客户端使用了不同数据，或客户端没有复用服务端序列化的初始状态。
2. 模板里直接调用 `Date.now()`、`Math.random()`。
3. 依赖浏览器 API：window、document、localStorage、viewport。
4. 用户时区、语言、AB 实验分组不同。
5. 第三方组件在服务端和客户端渲染结构不同。
6. HTML 嵌套不合法，被浏览器自动修正。
7. Teleport 没有把服务端生成的 teleports 内容注入到正确容器。
8. 自定义指令只在客户端改 DOM，没有提供 SSR 侧的 `getSSRProps`。

### 修复思路

把首次渲染所需数据放到服务端 payload 并在客户端复用；浏览器专属内容延迟到 mounted 后再渲染；随机值在服务端生成并序列化，或使用支持 seed 的随机数生成器并把 seed 一起序列化；时区、本地偏好、viewport 相关内容可以先渲染占位，再在客户端替换；对不可 SSR 的组件使用客户端 only 包裹；检查最终 HTML 是否符合规范。

```vue
<script setup lang="ts">
const mounted = ref(false)

onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <ClientOnlyChart v-if="mounted" />
  <ChartSkeleton v-else />
</template>
```

Vue 3.5+ 可以用 `data-allow-mismatch` 对确实不可避免的局部差异做显式抑制，但它应该是最后手段，不能用来掩盖真实数据不一致。Teleport 在 SSR 中要使用专门容器，例如 `#teleported`，不要直接 target `body`；自定义指令如果需要影响 SSR 输出，应实现 `getSSRProps`。

### 排查方法

先看 mismatch 是 DOM 结构问题还是文本/属性值问题。结构问题优先检查非法 HTML 嵌套、条件分支、第三方组件和 Teleport；值问题优先检查随机数、时间、locale、store 初始状态、接口 payload 和 localStorage 依赖。

排查时可以临时注释二分组件树，或在 SSR HTML 中标记模块边界；对比 view-source / 服务端 render 输出和浏览器 Elements 中 hydration 前后的结构；检查客户端入口是否用 `createSSRApp()` 而不是 `createApp()`。不要只消除警告，要确认用户看到的内容、事件绑定和状态接管都正确。

---
id: vue-059
module: Vue
difficulty: 3
tags: [Pinia, 插件, 持久化]
source: 深入
---
## 题目
Pinia 插件如何工作？如何设计一个状态持久化插件？

## 答案
## Pinia 插件机制

Pinia 插件通过 `pinia.use` 注册。每个 store 创建时，插件会收到上下文，可以读取 store、options、pinia 和 app，并向 store 添加属性、订阅变化或包装 action。

插件只会应用到插件注册之后创建的 store，并且通常要在 `app.use(pinia)` 之后才会真正生效。插件可以返回对象来给 store 增加属性，返回的属性会被 devtools 自动追踪；如果直接写到 store 上，开发环境下需要手动加入 `store._customProperties` 才方便调试。给 store 添加 router、modal manager 这类外部对象时，应使用 `markRaw()`，避免被响应式包装。

```ts
type PersistOptions = {
  key?: string
  paths?: string[]
  version?: number
  migrate?: (state: unknown) => unknown
}

pinia.use(({ store, options }) => {
  const persist = options.persist as PersistOptions | boolean | undefined
  if (!persist || typeof window === 'undefined') return

  const config = persist === true ? {} : persist
  const key = config.key ?? `pinia:${store.$id}`

  try {
    const cached = localStorage.getItem(key)
    if (cached) {
      const parsed = JSON.parse(cached)
      const cachedState = parsed.state ?? parsed
      const nextState = config.migrate ? config.migrate(cachedState) : cachedState
      store.$patch(nextState as Record<string, unknown>)
    }
  } catch (error) {
    console.warn(`[pinia-persist] restore failed: ${store.$id}`, error)
  }

  store.$subscribe((_mutation, state) => {
    const payload = pickState(state, config.paths)
    localStorage.setItem(
      key,
      JSON.stringify({
        version: config.version ?? 1,
        state: payload,
      }),
    )
  }, { detached: true })
})
```

`store.$subscribe()` 适合监听 state 变化；`store.$onAction()` 适合统计 action、记录耗时、处理 action 成功/失败后的副作用。如果要给 store 新增状态并参与 SSR 序列化，要同时写到 `store` 和 `store.$state`，否则只挂在 store 上的属性不一定能正确 hydration。

### 设计要点

1. 允许按 store 配置是否持久化和持久化字段。
2. 处理序列化失败、版本迁移和敏感字段过滤。
3. SSR 下不能直接访问 localStorage，需要判断运行环境。
4. 多标签页可以监听 storage 事件同步。
5. 大对象要避免每次小变更都完整写入，可节流。
6. 不要持久化 access token、refresh token、权限敏感字段或临时 UI 状态。
7. 初始化 `$patch` 发生在 store 激活前，不会触发订阅，这是恢复缓存时的正常行为。
8. setup store 的自定义 options 通过 `defineStore(id, setup, options)` 第三个参数传入。

### 类型扩展

如果插件新增 store 属性、自定义 state 或自定义 options，应通过 TypeScript module augmentation 扩展 Pinia 类型，避免业务代码里出现 `any`。

```ts
import 'pinia'

declare module 'pinia' {
  export interface DefineStoreOptionsBase<S, Store> {
    persist?: boolean | PersistOptions
  }

  export interface PiniaCustomProperties {
    $persist: () => void
  }
}
```

Nuxt 项目里要在 Nuxt plugin 中拿到 `$pinia` 后再注册插件，避免直接在模块顶层访问浏览器 API。

---
id: vue-060
module: Vue
difficulty: 3
tags: [Vue Router, History, Matcher]
source: 深入
---
## 题目
Vue Router 的 history 模式和 matcher 大致如何工作？`createWebHistory` 和 `createWebHashHistory` 如何选择？

## 答案
## History 模式

Vue Router 把 URL 变化抽象成 history 实现。常见模式有 HTML5 history、hash history 和 memory history。

- `createWebHistory`：URL 更正常，例如 `/users/1`，需要服务端把未知路径回退到 `index.html`。
- `createWebHashHistory`：URL 带 `#`，hash 不会发送给服务端，部署简单但 SEO 和观感较差。
- `createMemoryHistory`：不依赖浏览器 URL，常用于 SSR 或测试。

history 实现主要负责读写当前位置、监听浏览器 `popstate` / hash 变化、维护回退前进状态，以及把 base path 和完整 URL 做转换。`createWebHistory('/admin/')` 会把路由基准路径设为 `/admin/`；如果部署在子路径但 base 配错，刷新、资源路径和跳转都容易出问题。

### Matcher

Matcher 负责把路由配置编译成可匹配记录。导航时，它根据当前 location 找到匹配的 route records，提取 params，并生成标准化的 route 对象。

它会把 path 编译成可匹配规则，并按优先级排序。静态片段通常比动态参数优先，动态参数又比通配符优先；自定义正则、可选参数、重复参数和 catch-all 都会影响匹配和 params 结果。

```ts
const routes = [
  { path: '/users/new', component: NewUser },
  { path: '/users/:id(\\d+)', component: UserDetail },
  { path: '/:pathMatch(.*)*', component: NotFound },
]
```

`router.resolve()` 会把字符串或对象形式的目标位置标准化，得到 `fullPath`、`href`、`params`、`query`、`hash` 和匹配到的 `matched` records。命名路由配合 `params` 更安全，因为 Router 会负责编码；如果同时传 `path` 和 `params`，`params` 会被忽略。

### 导航流程

`router.push` 会解析目标位置，和当前路由比较，执行失活组件的 leave 守卫、全局 beforeEach、复用组件 update 守卫、路由独享 beforeEnter、异步组件解析、组件 beforeRouteEnter、全局 beforeResolve。确认后更新 history，触发视图更新，最后执行 afterEach。导航失败会以 Navigation Failure 表达，例如取消、重复导航或守卫返回 `false`。

### 选择建议

现代 SPA 优先 `createWebHistory`，但必须配置服务器 fallback，把未知路径回退到 `index.html`，同时保留静态资源和 API 的真实 404；纯静态托管且无法配服务器时用 hash。hash 不会发给服务端，所以刷新不需要 fallback，但 URL 观感和 SEO 较差。

SSR 中使用 memory history，并且为每个请求创建独立 router。memory history 不会自动触发初始导航，需要服务端显式 `router.push(url)` 并等待 `router.isReady()`，避免跨请求状态污染。

---
id: vue-061
module: Vue
difficulty: 3
tags: [Modal, Teleport, 可访问性]
source: 高频
---
## 题目
如何在 Vue 中实现一个完整 Modal 组件？需要考虑哪些可访问性和边界问题？

## 答案
## Modal 不是一个 `v-if` 就结束

完整 Modal 需要处理渲染位置、受控状态、焦点、键盘、滚动锁定、动画、可访问性和卸载清理。

### 关键设计

```vue
<Teleport to="body">
  <Transition name="modal">
    <div
      v-if="open"
      class="modal-root"
      @keydown.esc="requestClose('escape')"
      @keydown.tab.prevent="trapFocus"
    >
      <div class="mask" @click.self="requestClose('mask')" />
      <section
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="descriptionId"
        tabindex="-1"
      >
        <h2 :id="titleId">{{ title }}</h2>
        <div :id="descriptionId">
          <slot name="description" />
        </div>
        <slot />
      </section>
    </div>
  </Transition>
</Teleport>
```

### 必要能力

1. `v-model:open` 控制显示状态。
2. Teleport 到 body，避免层级和裁剪问题。
3. 打开后聚焦弹窗或第一个可聚焦元素。
4. ESC 关闭，关闭后恢复到触发按钮焦点。
5. 背景滚动锁定，多弹窗时要计数。
6. `role="dialog"`、`aria-modal`、标题关联；复杂长内容时谨慎使用 `aria-describedby`。
7. 背景内容要变成不可交互状态，可用 `inert` 或兼容方案；仅设置 `aria-modal` 不代表键盘和鼠标真的被限制。
8. 卸载时清理事件、body 样式、滚动锁、焦点锁和可能遗留的 Teleport 内容。

受控组件里内部不直接修改 prop，而是通过统一关闭流程请求父组件更新：

```ts
async function requestClose(reason: 'mask' | 'escape' | 'close' | 'confirm') {
  if (props.beforeClose && !(await props.beforeClose(reason))) return
  emit('close', reason)
  emit('update:open', false)
}
```

焦点管理建议记录打开前的 `document.activeElement`。打开后如果内容很多，先聚焦标题或面板顶部静态元素，避免直接聚焦底部按钮导致内容滚动；关闭后如果触发元素还存在，恢复焦点，否则聚焦到工作流中的合理位置。Tab 和 Shift+Tab 要在弹窗内循环，嵌套弹窗时只允许最顶层弹窗响应 ESC 和焦点陷阱。

### 边界

嵌套弹窗、异步确认、防重复提交、路由切换关闭、移动端键盘和安全区域都要考虑。Transition 下关闭动画结束前 DOM 可能还存在，滚动锁和焦点恢复通常要和动画生命周期协调。公共组件应提供清晰 API，而不是让业务层复制这些细节。

---
id: vue-062
module: Vue
difficulty: 3
tags: [Vite, 构建优化, Vue]
source: 高频
---
## 题目
Vue + Vite 项目如何做构建优化和产物分析？

## 答案
## 优化方向

Vue + Vite 项目的构建优化重点是首屏体积、按需加载、依赖预构建、缓存策略和产物可观测。先分析再优化：看首屏路由加载了哪些 chunk、哪些依赖最大、缓存是否命中、gzip/brotli 后体积和真实网络耗时。

### 常见手段

1. 路由级动态 import，实现页面 chunk 拆分。
2. 重型库异步加载，例如图表、编辑器、地图。
3. 组件库使用按需导入，避免全量引入样式和组件。
4. 配置 `build.rollupOptions.output.manualChunks` 拆分稳定 vendor，减少业务发布时第三方 chunk 失效。
5. 使用 rollup-plugin-visualizer、source-map-explorer 或构建报告查看大依赖来源。
6. 图片压缩、现代格式、响应式图片、字体子集化。
7. 生产开启 gzip/br 压缩和长缓存文件名，HTML 使用 no-cache，带 hash 的静态资源使用 immutable 长缓存。
8. 配置合适的 `build.target`，面向现代浏览器时减少不必要的转译和 polyfill。
9. 检查重复依赖和 CommonJS 大包，优先选择 ESM、可 tree-shaking 的库。

```ts
export default defineConfig({
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('monaco-editor')) return 'monaco'
            if (id.includes('echarts')) return 'echarts'
            if (id.includes('vue')) return 'vue'
            return 'vendor'
          }
        },
      },
    },
  },
})
```

### 分析方法

```ts
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    vue(),
    visualizer({
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    sourcemap: true,
  },
})
```

分析时重点看：首屏入口 chunk、公共 vendor 是否过大、是否有重复版本、某个页面是否把编辑器/图表提前打进首屏、CSS 是否被全局引入、source map 是否只在需要的环境上传到监控平台。

### 注意事项

不要过度拆 chunk，太多小文件会增加请求和调度成本，也可能让浏览器主线程花更多时间解析和调度。`manualChunks` 要围绕缓存稳定性和业务路径设计，不要只按包名机械拆分。

Vite 开发快主要来自原生 ESM 和依赖预构建；现有项目使用 Vite 7，生产构建仍基于 Rollup 配置。使用更新的 Rolldown 线路时，思路相同，但要关注对应版本的构建选项。优化要结合真实网络、缓存命中、首屏路径、LCP/INP 和错误监控评估，不要只盯未压缩体积。

---
id: vue-063
module: Vue
difficulty: 3
tags: [内存泄漏, 性能, 生命周期]
source: 高频
---
## 题目
Vue 项目中常见内存泄漏场景有哪些？如何排查和避免？

## 答案
## 常见泄漏来源

Vue 组件卸载会清理自身响应式 effect 和模板事件，但不会自动清理你手动创建的外部资源。

### 高频场景

1. `window`、`document`、WebSocket、EventSource 监听未移除。
2. `setInterval`、`setTimeout` 未清理。
3. 第三方图表、地图、编辑器、播放器实例未 destroy。
4. 全局 store 或缓存持有组件实例、DOM 节点、大对象。
5. 弹窗 Teleport 到 body 后遗留 DOM。
6. KeepAlive 停用后轮询仍继续。
7. 异步请求、Promise 回调或订阅在组件卸载后仍写入状态或持有闭包。
8. 手动创建的 `effectScope`、异步创建的 watch、事件总线订阅没有停止。
9. `ResizeObserver`、`IntersectionObserver`、Worker、Object URL、媒体流等浏览器资源没有释放。

### 预防

```ts
let controller: AbortController | null = null

onMounted(() => {
  window.addEventListener('resize', resize)
  controller = new AbortController()
  fetch('/api/users', { signal: controller.signal })
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  controller?.abort()
})
```

Composable 中可以用 `onScopeDispose` 清理，使调用方组件卸载时自动释放。

```ts
export function usePolling(fn: () => void, interval = 3000) {
  const timer = window.setInterval(fn, interval)
  onScopeDispose(() => window.clearInterval(timer))
}
```

KeepAlive 场景下组件不会卸载，只会停用。轮询、视频播放、图表动画这类资源应在 `onDeactivated` 暂停，在 `onActivated` 恢复；真正销毁资源仍放在 `onUnmounted` 或 `onScopeDispose`。

```ts
onActivated(startPolling)
onDeactivated(stopPolling)
onUnmounted(disposeChart)
```

全局 store、缓存、事件总线和单例服务不要保存组件实例、`this`、DOM 节点或大响应式对象；需要缓存数据时保存普通数据和 id，并设置容量上限、过期时间或手动清理入口。第三方实例要封装统一 dispose，路由离开、弹窗关闭和组件卸载都能走同一套清理逻辑。

同步在 `setup()` 中创建的 watcher 会随组件作用域停止；如果 watcher 是在异步回调、外部单例或手动 `effectScope` 中创建的，就要保存 stop 函数或调用 `scope.stop()`。Blob URL 用完要 `URL.revokeObjectURL()`，Observer 要 `disconnect()`，Worker 要 `terminate()`，媒体流要停止 tracks。

### 排查

使用 Chrome Performance、Memory heap snapshot 和 Allocation instrumentation。反复进入离开页面，手动触发 GC，观察 DOM 节点、监听器、JS 对象数量是否持续增长。重点看 Detached DOM tree、大数组、第三方实例、闭包和 store 中的引用。

定位时先复现稳定路径：进入页面 -> 操作组件 -> 离开页面，重复多次；比较两次 heap snapshot 的 retained size，沿 retainers 找是谁还引用着对象，再回到代码找未清理的事件、缓存、定时器或全局变量。Vue DevTools 可以辅助观察组件是否真的卸载；Chrome 的 Event Listeners 面板可以检查全局监听是否残留。

---
id: vue-064
module: Vue
difficulty: 3
tags: [Vue2迁移, Vue3, 兼容]
source: 高频
---
## 题目
Vue 2 迁移到 Vue 3 需要重点关注哪些变化？

## 答案
## 迁移重点

Vue 3 带来了应用实例、Proxy 响应式、Composition API、Fragments、Teleport、Suspense 和更好的 TypeScript 支持，但也有一些破坏性变化。

### 常见变化

1. 创建应用从 `new Vue` 变为 `createApp`。
2. 全局 API 挂到 app 实例上，例如 `app.use`、`app.component`、`app.config.globalProperties`。
3. 响应式基于 Proxy，新增属性和数组索引不再需要 `Vue.set`，但不再支持 IE11。
4. 组件可以多根节点，`$listeners` 被并入 `$attrs`，`class`、`style`、`onXxx` 也会进入 `$attrs`，attrs 透传要重新检查。
5. 组件 `v-model` 默认 prop/event 变为 `modelValue` / `update:modelValue`，`.sync` 被替代为参数化 `v-model`。
6. `.native` 修饰符移除，需要组件通过 `emits` 明确声明事件，否则监听可能透传到根节点。
7. `v-if` 和 `v-for` 同元素优先级变化，`v-bind` 合并顺序、`key` 用法也要检查。
8. filters、事件实例 API（`$on`、`$off`、`$once`）、`$children`、`inline-template`、keyCode 修饰符等被移除。
9. 异步组件改用 `defineAsyncComponent`，函数式组件、渲染函数、插槽 API 有迁移成本。
10. `watch` 数组默认只在数组被替换时触发，依赖数组内部变更时要显式配置深度监听。
11. 生态依赖需要同步升级，例如 Vue Router 4、Vuex 4 或 Pinia、Vue Test Utils v2、UI 组件库、构建插件。

### 迁移策略

先做依赖盘点，确认 UI 库、路由、状态管理、测试工具、构建链是否支持 Vue 3。大型 Vue 2 项目可以先升级到 Vue 2.7，清理 filters、事件总线、`.sync`、`$listeners` 等高风险写法，再考虑使用 migration build（`@vue/compat`）收集运行时告警。

迁移时优先让现有业务在 Vue 3 下稳定运行，不要把迁移和 Composition API 重写、状态架构重构、UI 改版绑在一起。Options API 在 Vue 3 中仍然可用，Composition API 可以后续按模块渐进引入。

落地节奏通常是：先升级构建和核心依赖 -> 修复编译错误和迁移告警 -> 按路由或业务模块回归 -> 补齐关键路径测试 -> 灰度发布。重点验证表单、弹窗、attrs 透传、事件监听、路由守卫、KeepAlive、第三方组件和 SSR hydration 等容易出现行为差异的地方。

---
id: vue-065
module: Vue
difficulty: 3
tags: [手写响应式, 源码, effect]
source: 字节
---
## 题目
手写一个简化版 Vue 响应式系统，需要实现哪些核心能力？

## 答案
## 简化目标

一个简化版 Vue 响应式系统至少要实现 `reactive`、`effect`、依赖收集、触发更新和依赖清理。核心数据结构是：

```text
WeakMap<object, Map<PropertyKey, Set<ReactiveEffect>>>
```

也就是：目标对象 -> 属性 key -> 依赖这个属性的 effect 集合。

### 最小可讲版本

```ts
type Dep = Set<ReactiveEffect>
type ReactiveEffect = (() => unknown) & {
  deps: Dep[]
  scheduler?: (job: ReactiveEffect) => void
}

const targetMap = new WeakMap<object, Map<PropertyKey, Dep>>()
let activeEffect: ReactiveEffect | undefined
const effectStack: ReactiveEffect[] = []

function cleanup(runner: ReactiveEffect) {
  for (const dep of runner.deps) {
    dep.delete(runner)
  }
  runner.deps.length = 0
}

function effect(fn: () => unknown, options: { scheduler?: (job: ReactiveEffect) => void } = {}) {
  let runner: ReactiveEffect

  runner = (() => {
    if (effectStack.includes(runner)) return

    cleanup(runner)

    try {
      effectStack.push(runner)
      activeEffect = runner
      return fn()
    } finally {
      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1]
    }
  }) as ReactiveEffect

  runner.deps = []
  runner.scheduler = options.scheduler
  runner()
  return runner
}

function track(target: object, key: PropertyKey) {
  if (!activeEffect) return

  let depsMap = targetMap.get(target)
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))

  let dep = depsMap.get(key)
  if (!dep) depsMap.set(key, (dep = new Set()))

  if (dep.has(activeEffect)) return

  dep.add(activeEffect)
  activeEffect.deps.push(dep)
}

function trigger(target: object, key: PropertyKey) {
  const depsMap = targetMap.get(target)
  const dep = depsMap?.get(key)
  if (!dep) return

  const effectsToRun = new Set(dep)
  effectsToRun.forEach((runner) => {
    if (runner === activeEffect) return
    runner.scheduler ? runner.scheduler(runner) : runner()
  })
}

function reactive<T extends object>(target: T): T {
  return new Proxy(target, {
    get(obj, key, receiver) {
      const value = Reflect.get(obj, key, receiver)
      track(obj, key)
      return typeof value === 'object' && value !== null ? reactive(value) : value
    },
    set(obj, key, value, receiver) {
      const oldValue = Reflect.get(obj, key, receiver)
      const hadKey = Object.prototype.hasOwnProperty.call(obj, key)
      const ok = Reflect.set(obj, key, value, receiver)

      if (!hadKey || !Object.is(oldValue, value)) {
        trigger(obj, key)
      }

      return ok
    },
    deleteProperty(obj, key) {
      const hadKey = Object.prototype.hasOwnProperty.call(obj, key)
      const ok = Reflect.deleteProperty(obj, key)

      if (hadKey && ok) {
        trigger(obj, key)
      }

      return ok
    },
  })
}
```

`effect` 首次执行时会读取响应式属性，`get` 拦截器调用 `track`，把当前 `activeEffect` 放进对应依赖集合。之后 `set` 或 `deleteProperty` 修改属性时调用 `trigger`，找到这些 effect，并直接执行或交给 scheduler。

依赖清理是手写题的加分点。比如 effect 中有条件分支：

```ts
effect(() => {
  console.log(state.ok ? state.text : state.other)
})
```

当 `state.ok` 从 `true` 变成 `false` 后，下一轮 effect 不再读取 `state.text`，旧的 `text` 依赖就应该被清掉，否则之后改 `text` 也会错误触发。

### 真实实现还缺什么

这个版本仍然省略了很多真实 Vue 需要处理的内容：raw 到 proxy 的缓存、防止重复代理、`stop`、`computed`、`ref`、watch、数组 `length`、`Map` / `Set`、`has` / `ownKeys` 迭代依赖、只读/浅响应式、批量调度、开发态调试钩子等。

面试中重点不是把 Vue 源码复刻出来，而是讲清：Proxy 拦截读写，读时 `track`，写时 `trigger`；依赖结构为什么用 WeakMap；为什么需要 activeEffect 栈、依赖清理、scheduler 和触发去重。
