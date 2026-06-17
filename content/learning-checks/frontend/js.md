# JavaScript 测试一下

## js-001

### Q1 single | var 与块级作用域

下面代码在普通脚本环境中运行，输出最符合哪一项？

```js
if (true) {
  var a = 1
  let b = 2
}

console.log(a)
console.log(b)
```

- [ ] A. 依次输出 `1` 和 `2`。
- [x] B. 先输出 `1`，然后访问 `b` 抛出 `ReferenceError`。
- [ ] C. 访问 `a` 时抛出 `ReferenceError`，不会继续执行。
- [ ] D. `a` 和 `b` 都会变成 `window` 属性。

**解释**：`var` 是函数作用域，不受 `if` 块限制；`let` 是块级作用域，块外访问会报错。顶层 `let/const` 也不会挂到 `window`。

### Q2 single | TDZ 和提升

关于下面代码，哪种说法更准确？

```js
console.log(x)
var x = 1

console.log(y)
let y = 2
```

- [ ] A. 两次都输出 `undefined`，因为变量都会提升。
- [x] B. 第一处输出 `undefined`，第二处因为 TDZ 抛出 `ReferenceError`。
- [ ] C. 第一处抛出 `ReferenceError`，第二处输出 `undefined`。
- [ ] D. `let` 完全不会被提升，所以引擎不会创建 `y` 绑定。

**解释**：`let/const` 也会创建词法绑定，但声明执行前处于暂时性死区，不能访问；`var` 会提升并初始化为 `undefined`。

### Q3 multiple | const 的含义

关于 `const`，哪些说法正确？

- [x] A. `const` 声明必须初始化。
- [x] B. `const` 绑定不能重新赋值。
- [x] C. `const obj = { count: 1 }` 后，`obj.count = 2` 是允许的。
- [ ] D. `const` 会让对象深度不可变。
- [ ] E. 默认应该用 `var`，只有循环里才用 `const`。

**解释**：`const` 保证绑定不重新指向，不保证引用值不可变。现代代码默认用 `const`，需要重新赋值时用 `let`。

## js-002

### Q1 single | 闭包计数器

下面代码输出什么？

```js
function createCounter() {
  let count = 0
  return function increase() {
    count += 1
    return count
  }
}

const counter = createCounter()
console.log(counter())
console.log(counter())
```

- [ ] A. `1`、`1`，因为外层函数每次都重新执行。
- [x] B. `1`、`2`，因为返回的函数持续引用同一个 `count`。
- [ ] C. `undefined`、`undefined`，因为 `count` 是局部变量。
- [ ] D. 抛出 `ReferenceError`，因为外层函数已经结束。

**解释**：闭包是函数和声明时词法环境的组合。只要返回函数仍可达，被引用的词法变量就不会立刻消失。

### Q2 single | 循环变量

下面代码通常输出什么？

```js
for (var i = 0; i < 3; i += 1) {
  setTimeout(() => console.log(i), 0)
}
```

- [ ] A. `0 1 2`，因为每次循环都有新的 `i`。
- [x] B. `3 3 3`，因为三个回调闭包共享同一个 `var i`。
- [ ] C. `undefined undefined undefined`。
- [ ] D. 一定按随机顺序输出 `0 1 2`。

**解释**：`var` 没有块级作用域，循环结束时同一个 `i` 已变成 3。改成 `let i` 会为每次迭代创建新的词法绑定。

### Q3 multiple | 闭包与内存

关于闭包和内存，哪些说法正确？

- [x] A. 闭包本身不是内存泄漏。
- [x] B. 长期可达的闭包如果引用大对象、DOM 节点或缓存，可能造成泄漏。
- [x] C. 不再需要的事件监听、定时器和缓存引用应及时清理。
- [ ] D. 只要使用闭包，外层函数里的所有变量都会永久不可回收。
- [ ] E. 闭包只能用于计数器，不能用于防抖、节流或私有化数据。

**解释**：泄漏的关键是“不再需要但仍然可达”。闭包常用于私有变量、函数工厂、once、防抖、节流和缓存。

## js-003

### Q1 single | 属性查找

下面代码中，哪个判断是正确的？

```js
function Person(name) {
  this.name = name
}

Person.prototype.sayHello = function () {
  return `Hello, ${this.name}`
}

const alice = new Person('Alice')
```

- [ ] A. `sayHello` 是 `alice` 的自身属性。
- [x] B. 访问 `alice.sayHello` 时，会先查自身，再沿原型链找到 `Person.prototype.sayHello`。
- [ ] C. `Person.prototype` 的原型一定是 `null`。
- [ ] D. `new Person()` 不会影响对象的原型。

**解释**：属性查找先查对象自身，找不到再沿 `[[Prototype]]` 查找。`new` 创建的实例原型通常指向构造函数的 `prototype`。

### Q2 multiple | hasOwn 与 in

关于下面对象，哪些判断正确？

```js
const parent = { greet() { return 'hi' } }
const child = Object.create(parent)
child.name = 'child'
```

- [x] A. `Object.hasOwn(child, 'name')` 为 `true`。
- [x] B. `Object.hasOwn(child, 'greet')` 为 `false`。
- [x] C. `'greet' in child` 为 `true`，因为会查原型链。
- [ ] D. `child.greet()` 会报错，因为 `greet` 不是自身属性。
- [ ] E. `Object.create(parent)` 会复制 parent 的所有属性到 child 自身。

**解释**：`hasOwn` 只看自身属性，`in` 会查原型链。`Object.create` 建立原型关系，不是属性复制。

### Q3 multiple | 原型实践

关于原型链实践，哪些说法合理？

- [x] A. 工程代码优先用 `Object.getPrototypeOf()`，不要依赖历史访问器 `__proto__`。
- [x] B. 手动整体替换构造函数的 `prototype` 时，可能需要修复 `constructor`。
- [x] C. 字典对象可以用 `Object.create(null)` 避免继承 `Object.prototype` 属性。
- [ ] D. 随意修改 `Array.prototype` 是低风险最佳实践。
- [ ] E. ES6 `class` 完全脱离了原型机制。

**解释**：`class` 仍基于原型机制。修改内置原型会污染全局行为，通常应避免。

## js-004

### Q1 single | 方法丢失 this

下面代码在严格模式或 ES Module 语义下，更可能发生什么？

```js
const user = {
  name: 'Alice',
  say() {
    return this.name
  },
}

const fn = user.say
console.log(fn())
```

- [ ] A. 输出 `Alice`，因为函数定义在 `user` 里。
- [x] B. `this` 丢失，独立调用时 `this` 通常是 `undefined`，可能报错。
- [ ] C. 输出 `user`，因为 `this` 总是指向函数所在对象。
- [ ] D. 输出 `window.name`，严格模式下也一样。

**解释**：普通函数的 `this` 由调用方式决定，不由定义位置决定。`user.say()` 是隐式绑定，赋值后 `fn()` 是独立调用。

### Q2 multiple | 箭头函数 this

关于箭头函数的 `this`，哪些说法正确？

- [x] A. 箭头函数没有自己的 `this`，会捕获外层词法作用域的 `this`。
- [x] B. `call/apply/bind` 不能改变箭头函数的 `this`。
- [x] C. 对象方法和原型方法一般不适合写成箭头函数。
- [ ] D. 箭头函数最适合作为构造函数配合 `new` 使用。
- [ ] E. 箭头函数的 `this` 总是指向调用点左侧对象。

**解释**：箭头函数适合回调里保留外层 `this`，但不适合作为需要动态接收者的方法，也不能作为构造函数。

### Q3 multiple | this 绑定优先级

关于 `this` 绑定优先级和显式绑定，哪些说法正确？

- [x] A. `call`/`apply` 会立即调用函数，`bind` 返回新函数。
- [x] B. 一般优先级可理解为 `new` 绑定 > 显式绑定 > 隐式绑定 > 默认绑定。
- [x] C. `new` 调用 bound function 时，`bind` 的 `thisArg` 会被忽略，但预置参数仍有效。
- [ ] D. 隐式绑定永远不会丢失。
- [ ] E. 默认绑定是现代代码推荐依赖的稳定行为。

**解释**：`this` 要看调用点。现代代码应避免依赖默认绑定；需要固定接收者时使用显式绑定或箭头闭包。

## js-005

### Q1 single | Object.is 边界

下面哪个表达式的结果与 `===` 不同？

- [ ] A. `Object.is(1, 1)`
- [ ] B. `Object.is('1', '1')`
- [x] C. `Object.is(+0, -0)`
- [ ] D. `Object.is(true, true)`

**解释**：`+0 === -0` 为 `true`，但 `Object.is(+0, -0)` 为 `false`。另外 `Object.is(NaN, NaN)` 为 `true`。

### Q2 multiple | 抽象相等

关于 `==` 的隐式转换，哪些结果为 `true`？

- [x] A. `null == undefined`
- [x] B. `'1' == 1`
- [x] C. `0 == false`
- [ ] D. `null == 0`
- [ ] E. `NaN == NaN`

**解释**：`null` 只与 `undefined` 抽象相等；`NaN` 不等于自身。字符串/数字/布尔比较会触发复杂转换。

### Q3 single | `[] == ![]`

为什么 `[] == ![]` 是 `true`？

- [ ] A. 因为数组和布尔值本来就是同一种类型。
- [x] B. `![]` 先变成 `false`，随后 `[] == false` 经过对象转原始值和数字转换后成立。
- [ ] C. 因为空数组是假值。
- [ ] D. 因为 `==` 会直接比较引用地址。

**解释**：对象都是真值，所以 `![]` 是 `false`；`[]` 转原始值为空字符串，再转数字为 0，`false` 也转为 0。

## js-006

### Q1 single | 事件循环输出

下面代码输出顺序是什么？

```js
console.log('1')

setTimeout(() => console.log('2'), 0)

Promise.resolve().then(() => {
  console.log('3')
  queueMicrotask(() => console.log('4'))
})

console.log('5')
```

- [ ] A. `1 2 3 4 5`
- [x] B. `1 5 3 4 2`
- [ ] C. `1 5 2 3 4`
- [ ] D. `1 3 4 5 2`

**解释**：同步先执行 `1 5`；当前 task 结束后清空微任务，输出 `3`，并继续执行新加入的微任务 `4`；最后执行定时器 task `2`。

### Q2 multiple | task 与 microtask

哪些属于常见 microtask？

- [x] A. `Promise.then/catch/finally`
- [x] B. `queueMicrotask`
- [x] C. `MutationObserver`
- [ ] D. `setTimeout`
- [ ] E. 用户点击事件回调本身

**解释**：定时器和用户事件通常是 task。microtask 会在当前 task 结束后、下一个 task 前被清空。

### Q3 multiple | 事件循环陷阱

关于浏览器事件循环，哪些说法正确？

- [x] A. 微任务会在下一个 task 之前被清空。
- [x] B. 递归创建大量微任务可能饿死渲染和用户事件。
- [x] C. 浏览器渲染发生在事件循环的渲染更新阶段，不是普通宏任务。
- [ ] D. `setTimeout(fn, 0)` 一定会在所有 Promise 微任务之前执行。
- [ ] E. Node.js 事件循环与浏览器完全相同，所有顺序都一致。

**解释**：面试里的“宏任务/微任务”是简化说法。浏览器渲染、Node 的 nextTick/setImmediate 等都有自己的细节。

## js-007

### Q1 single | Promise 状态

下面关于 Promise 状态的说法哪项正确？

- [ ] A. Promise 可以从 fulfilled 再变回 pending。
- [x] B. Promise 一旦从 pending 变为 fulfilled 或 rejected，状态就不可再改变。
- [ ] C. `resolved` 永远等于 `fulfilled`。
- [ ] D. Promise rejected 后，后续 `catch` 不能处理它。

**解释**：Promise 状态 settled 后不可再变。`resolved` 可能表示跟随另一个 Promise 的状态，此时外层不一定已经 fulfilled。

### Q2 single | then 返回值

下面代码最终打印什么？

```js
Promise.resolve(1)
  .then((value) => value + 1)
  .then((value) => {
    throw new Error(String(value))
  })
  .catch((error) => error.message)
  .then(console.log)
```

- [ ] A. `1`
- [ ] B. `2` 后程序崩溃，后续不会继续。
- [x] C. `'2'`
- [ ] D. `undefined`

**解释**：`then` 返回新 Promise。抛错会让链变成 rejected，`catch` 返回普通值后链恢复 fulfilled，最后打印错误 message。

### Q3 multiple | 聚合方法

关于 Promise 静态方法，哪些说法正确？

- [x] A. `Promise.all` 全部 fulfilled 才成功，任意 rejected 就短路失败。
- [x] B. `Promise.allSettled` 等所有 Promise settled，并返回每个结果状态。
- [x] C. `Promise.race` 由第一个 settled 的结果决定。
- [x] D. `Promise.any` 由第一个 fulfilled 决定，全部 rejected 时抛 `AggregateError`。
- [ ] E. `Promise.all` 会吞掉所有错误并返回成功数组。

**解释**：不同聚合方法对应不同失败策略。并行任务要按业务需求选择短路、收集全部结果或取最快成功。

## js-008

### Q1 single | async 返回值

下面函数调用后的结果是什么？

```js
async function foo() {
  return 1
}

const result = foo()
```

- [ ] A. `result` 是数字 `1`。
- [x] B. `result` 是 fulfilled 为 `1` 的 Promise。
- [ ] C. `async` 函数不允许返回普通值。
- [ ] D. `foo()` 会阻塞主线程直到返回。

**解释**：`async` 函数总是返回 Promise。返回普通值会被包装成 fulfilled Promise，抛错会变成 rejected Promise。

### Q2 single | await 顺序

下面代码输出顺序是什么？

```js
async function demo() {
  console.log('a')
  const value = await Promise.resolve('b')
  console.log(value)
}

demo()
console.log('c')
```

- [ ] A. `a b c`
- [x] B. `a c b`
- [ ] C. `c a b`
- [ ] D. `b a c`

**解释**：`await` 暂停当前 async 函数后续执行，把后续逻辑安排到微任务中。它不会阻塞同步代码继续执行。

### Q3 multiple | 串行与并行

关于 `async/await` 并发控制，哪些说法正确？

- [x] A. 两个互不依赖的请求应优先用 `Promise.all` 并行。
- [x] B. `for...of` 里 `await` 会按顺序串行执行。
- [x] C. `async` 回调传给 `forEach`，外层不会等待这些异步任务完成。
- [ ] D. 所有 `await` 都会阻塞主线程。
- [ ] E. `return await promise` 永远有害，任何场景都不应出现。

**解释**：`await` 只暂停当前 async 函数，不阻塞主线程。`return await` 通常多余，但在 `try/catch` 捕获或保留异步栈时可能有意义。

## js-009

### Q1 multiple | typeof 结果

哪些 `typeof` 结果是正确的？

- [x] A. `typeof null === 'object'`
- [x] B. `typeof [] === 'object'`
- [x] C. `typeof function () {} === 'function'`
- [x] D. `typeof 1n === 'bigint'`
- [ ] E. `typeof NaN === 'nan'`

**解释**：`typeof null` 是历史遗留的 `'object'`。`NaN` 仍是 number，`typeof NaN === 'number'`。

### Q2 multiple | 类型判断 API

关于类型判断，哪些说法合理？

- [x] A. 判断数组优先使用 `Array.isArray()`。
- [x] B. `instanceof` 依赖原型链，可能受跨 iframe 或手动改原型影响。
- [x] C. `Object.prototype.toString.call(value)` 通用性较好，但可能受 `Symbol.toStringTag` 影响。
- [ ] D. `typeof` 能准确区分数组、日期、正则和 Map。
- [ ] E. `instanceof` 判断的是对象是否有同名属性。

**解释**：能用专用 API 时优先用专用 API。`instanceof` 看的是构造函数 prototype 是否在对象原型链上。

### Q3 single | 参数传递

下面关于 JavaScript 参数传递哪项正确？

- [ ] A. 原始类型按值传递，对象按引用传递，所以函数可以改掉外部变量绑定。
- [x] B. 参数都是按值传递；对象传的是引用值的副本，可改对象内容但不能改外部变量绑定。
- [ ] C. 对象传参时会深拷贝。
- [ ] D. 函数内部无法修改对象的属性。

**解释**：对象变量里保存的是引用值。函数得到的是这个引用值的副本，所以能通过它改对象内容，但重新赋值参数不会改变外部变量指向。

## js-010

### Q1 single | 可达性与循环引用

下面代码执行结束后，如果没有其他外部引用，`a` 和 `b` 是否一定因为循环引用而无法回收？

```js
function demo() {
  const a = {}
  const b = {}
  a.ref = b
  b.ref = a
}
```

- [ ] A. 一定无法回收，因为任何循环引用都会泄漏。
- [x] B. 可以被现代标记清除类 GC 回收，因为这组对象整体从根不可达。
- [ ] C. 只有把 `ref` 手动设为 `null` 才可能回收。
- [ ] D. JavaScript 没有垃圾回收。

**解释**：现代 JS GC 主要基于可达性分析。循环引用本身不是泄漏，整体不可达时仍可回收。

### Q2 multiple | 常见内存泄漏

哪些情况可能导致浏览器端内存泄漏？

- [x] A. 事件监听器未移除，回调闭包长期持有 DOM 或大对象。
- [x] B. 定时器未清理，持续引用不再需要的数据。
- [x] C. `Map` 缓存无限增长，没有淘汰策略。
- [x] D. Detached DOM 仍被 JS 变量或闭包引用。
- [ ] E. 函数里创建的所有局部对象都会永久泄漏。

**解释**：泄漏来自“无用但可达”。局部对象在函数结束后如果不可达，就可以被回收。

### Q3 multiple | V8 GC 思路

哪些属于现代 V8 常见的 GC 优化思路？

- [x] A. 分代收集，新生代频繁快速回收，存活久的对象晋升到老生代。
- [x] B. 增量标记，把长标记过程拆成多个小片段。
- [x] C. 并行/并发回收，把部分工作放到辅助线程降低主线程停顿。
- [x] D. 标记整理/压缩，减少内存碎片。
- [ ] E. 只使用引用计数，完全无法处理循环引用。

**解释**：引用计数有循环引用问题，不是现代 JS 引擎 GC 的核心。V8 会组合多种策略降低停顿和碎片。

## js-011

### Q1 single | 函数表达式提升

下面代码运行时会发生什么？

```js
greet()

var greet = function () {
  console.log('Hi')
}
```

- [ ] A. 输出 `Hi`，因为函数表达式会和函数声明一样完整提升。
- [x] B. 抛出 `TypeError`，因为 `greet` 此时是 `undefined`，不是函数。
- [ ] C. 抛出 `ReferenceError`，因为 `var greet` 完全不会提升。
- [ ] D. 输出 `undefined`，不会报错。

**解释**：提升的是 `var greet` 声明并初始化为 `undefined`，函数表达式赋值仍在原位置执行。

### Q2 single | 函数声明与 var 同名

下面代码输出什么？

```js
console.log(typeof foo)
var foo = 1
function foo() {}
console.log(foo)
```

- [ ] A. `undefined`、`function`
- [x] B. `function`、`1`
- [ ] C. `number`、`1`
- [ ] D. 第一行就抛出 `ReferenceError`

**解释**：创建阶段函数声明会初始化为函数，后续执行到 `var foo = 1` 时才把值改成 1。实际代码应避免这种同名声明。

### Q3 multiple | 提升理解

关于变量提升，哪些说法正确？

- [x] A. 提升不是源码真的被移动，而是声明在创建阶段进入环境记录。
- [x] B. `var` 声明会创建绑定并初始化为 `undefined`。
- [x] C. 函数声明通常可以在声明前调用。
- [x] D. `let/const` 也会创建绑定，但声明执行前处于 TDZ。
- [ ] E. 只要是函数相关写法，都能在声明前安全调用。

**解释**：函数声明和函数表达式的提升行为不同。`let/const` 的 TDZ 也说明“完全不提升”是错误说法。

## js-012

### Q1 single | 词法作用域

下面代码输出什么？

```js
let value = 'global'

function foo() {
  console.log(value)
}

function bar() {
  let value = 'bar'
  foo()
}

bar()
```

- [x] A. `global`
- [ ] B. `bar`
- [ ] C. `undefined`
- [ ] D. 抛出 `ReferenceError`

**解释**：JavaScript 使用词法作用域，函数作用域在定义时确定。`foo` 定义在全局作用域，所以查到全局 `value`。

### Q2 single | 变量查找顺序

变量查找的基本顺序是什么？

- [ ] A. 全局作用域 -> 父作用域 -> 当前作用域。
- [x] B. 当前作用域 -> 父级词法作用域 -> 一直到全局作用域。
- [ ] C. 调用者作用域 -> 被调用函数作用域。
- [ ] D. 只查当前作用域，找不到就返回 `undefined`。

**解释**：作用域链按词法嵌套关系向外查找。未声明变量被读取时最终会抛 `ReferenceError`。

### Q3 multiple | 作用域链判断

关于作用域链，哪些说法正确？

- [x] A. 函数的外层词法环境由定义位置决定。
- [x] B. 内层变量会遮蔽外层同名变量。
- [x] C. 闭包能让函数在外层函数返回后仍访问其词法环境。
- [ ] D. JavaScript 普通函数使用动态作用域，查找调用者中的变量。
- [ ] E. 作用域链和原型链是同一套查找机制。

**解释**：作用域链用于变量查找，原型链用于对象属性查找。两者方向和对象都不同。

## js-013

### Q1 multiple | ES6 语法增强

哪些属于 ES6 引入或标准化的常见语法能力？

- [x] A. `let` / `const` 和块级作用域。
- [x] B. 箭头函数、模板字符串、解构和默认参数。
- [x] C. 展开语法、剩余参数和增强对象字面量。
- [ ] D. TypeScript 类型注解。
- [ ] E. JSX 语法。

**解释**：TypeScript 和 JSX 都不是 ECMAScript 语言标准的一部分。ES6 的重点是更安全的声明、更简洁的函数和对象语法等。

### Q2 single | ES Module 特点

ES Module 相比传统脚本的一个关键特点是什么？

- [ ] A. `import/export` 只能在运行时字符串拼接决定。
- [x] B. 静态 `import/export` 便于构建工具做依赖分析和 tree-shaking。
- [ ] C. 顶层声明都会自动挂到 `window`。
- [ ] D. ES Module 不支持严格模式语义。

**解释**：ESM 的静态结构是它的重要价值。模块顶层是模块作用域，不会像普通脚本顶层 `var` 那样挂全局。

### Q3 multiple | ES6 集合和协议

关于 ES6 的集合、Symbol 和迭代协议，哪些说法正确？

- [x] A. `Map` 的 key 可以是任意值。
- [x] B. `Set` 表达唯一集合语义，可用于去重但要注意对象按引用比较。
- [x] C. `Symbol.iterator` 支撑 `for...of`、展开和解构等可迭代协议。
- [x] D. `Proxy` 可拦截对象基本操作，常用于响应式或代理访问。
- [ ] E. `Symbol` 创建的值会自动转成同名字符串键。

**解释**：Symbol 常用于唯一属性键和内置协议。Map/Set/Proxy/Iterator 是 ES6 带来的重要基础能力。

## js-014

### Q1 single | call/apply/bind 区别

下面哪项说法正确？

- [ ] A. `call` 和 `apply` 都不会立即调用函数。
- [ ] B. `bind` 会立即调用函数并返回执行结果。
- [x] C. `call` 参数逐个传，`apply` 参数用数组或类数组，二者都会立即调用。
- [ ] D. 三者都能改变箭头函数的 `this`。

**解释**：`bind` 返回新函数，不立即执行；箭头函数没有自己的 `this`，三者都不能改变它的词法 `this`。

### Q2 single | bind 后再 call

下面代码输出什么？

```js
function show() {
  return this.name
}

const bound = show.bind({ name: 'A' })
console.log(bound.call({ name: 'B' }))
```

- [x] A. `A`
- [ ] B. `B`
- [ ] C. `undefined`
- [ ] D. 抛出 `TypeError`

**解释**：绑定函数的 `this` 已被固定，再用 `call/apply` 不能改掉绑定的 `thisArg`。

### Q3 multiple | 边界规则

关于 `call/apply/bind`，哪些说法正确？

- [x] A. `apply` 适合已有参数数组的场景，但现代代码常可用展开语法替代。
- [x] B. `bind` 可以预置部分参数。
- [x] C. 绑定函数被 `new` 调用时，`thisArg` 会被忽略，但预置参数仍生效。
- [ ] D. 严格模式下 `call(null)` 一定会把 `this` 替换成全局对象。
- [ ] E. 这三个方法只能用于构造函数，普通函数不能用。

**解释**：非严格模式下 `null/undefined` 可能被替换为全局对象；严格模式会保留。三者属于普通函数调用控制工具。

## js-015

### Q1 single | 浅拷贝共享嵌套引用

下面代码输出什么？

```js
const source = { a: 1, nested: { count: 1 } }
const copy = { ...source }

copy.a = 2
copy.nested.count = 99

console.log(source.a, source.nested.count)
```

- [ ] A. `2 99`
- [x] B. `1 99`
- [ ] C. `1 1`
- [ ] D. `2 1`

**解释**：对象展开是浅拷贝。第一层原始值独立，嵌套对象仍共享引用。

### Q2 multiple | JSON 深拷贝缺陷

`JSON.parse(JSON.stringify(obj))` 有哪些常见缺陷？

- [x] A. 不能处理循环引用。
- [x] B. `undefined`、函数、Symbol 等会丢失或失真。
- [x] C. `Date` 会变成字符串。
- [x] D. `Map`、`Set`、`RegExp` 等特殊对象会失真。
- [ ] E. 能完整保留原型、属性描述符和 getter/setter。

**解释**：JSON 方案只适合简单可序列化数据。复杂对象图应考虑 `structuredClone` 或成熟库。

### Q3 multiple | structuredClone 与手写深拷贝

关于深拷贝方案，哪些说法正确？

- [x] A. `structuredClone` 支持循环引用和多种结构化克隆类型。
- [x] B. `structuredClone` 不能克隆函数、DOM 节点、WeakMap、WeakSet 等值。
- [x] C. 手写深拷贝需要用 `WeakMap` 处理循环引用。
- [ ] D. 手写递归只要遍历 `Object.keys` 就能完整复制所有对象语义。
- [ ] E. 深拷贝越多越好，任何状态更新都应该先深拷贝整棵树。

**解释**：深拷贝要按数据类型和业务需求选择。完整复制原型、描述符、不可枚举属性等并不简单。

## js-016

### Q1 single | new 的返回值规则

下面代码输出什么？

```js
function Foo() {
  this.name = 'foo'
  return { name: 'bar' }
}

function Bar() {
  this.name = 'bar'
  return 42
}

console.log(new Foo().name, new Bar().name)
```

- [x] A. `bar bar`
- [ ] B. `foo bar`
- [ ] C. `bar 42`
- [ ] D. `foo 42`

**解释**：构造函数返回对象会覆盖默认实例；返回原始值会被忽略，仍返回新创建的实例。

### Q2 multiple | new 步骤

`new Constructor(...args)` 大致做了哪些事？

- [x] A. 创建一个新对象。
- [x] B. 将新对象的 `[[Prototype]]` 指向 `Constructor.prototype`，若它不是对象则回退到 `Object.prototype`。
- [x] C. 以新对象作为 `this` 执行构造函数。
- [x] D. 根据构造函数返回值决定返回显式对象或新实例。
- [ ] E. 永远忽略构造函数显式返回的对象。

**解释**：`new` 同时涉及对象创建、原型连接、this 绑定和返回值规则。

### Q3 single | 手写 new 的局限

为什么手写 `myNew` 只能用于理解机制，不能说完整等价原生 `new`？

- [ ] A. 手写版本无法创建任何对象。
- [x] B. 原生 `new` 对 class、`new.target`、内置构造器等还有很多细节。
- [ ] C. 手写版本不能使用 `Object.create`。
- [ ] D. 原生 `new` 不会设置原型。

**解释**：面试手写版可覆盖主流程，但语言运行时的边界远比简化代码复杂。

## js-017

### Q1 single | 原型链继承问题

传统原型链继承 `Dog.prototype = new Animal()` 的一个典型问题是什么？

- [ ] A. 子类完全无法访问父类原型方法。
- [x] B. 父构造函数中的引用类型属性可能被所有实例共享，也不方便传参。
- [ ] C. `instanceof Animal` 一定为 false。
- [ ] D. 它不会建立任何原型关系。

**解释**：直接把父类实例作为子类原型，会把父构造函数里的实例属性放到原型上，引用类型容易共享。

### Q2 single | 寄生组合继承

下面哪段更接近寄生组合继承的核心写法？

- [ ] A. `Dog.prototype = Animal.prototype`
- [x] B. `Animal.call(this, name)` 配合 `Dog.prototype = Object.create(Animal.prototype)`
- [ ] C. `Dog.prototype = new Animal()` 且不在构造函数中调用父构造函数
- [ ] D. `Dog.__proto__ = new Animal()`

**解释**：寄生组合继承只调用一次父构造函数来初始化实例属性，同时让子类原型委托到父类原型。

### Q3 multiple | class extends

关于 `class extends`，哪些说法正确？

- [x] A. 它是更清晰的语法，本质仍基于原型链。
- [x] B. 子类如果写 constructor，必须先调用 `super()` 才能使用 `this`。
- [x] C. `instanceof` 可以同时判断出子类实例属于子类和父类。
- [ ] D. `class` 方法会复制到每个实例自身上。
- [ ] E. `class` 继承完全不需要理解原型。

**解释**：`class` 改善语法，不改变底层原型模型。方法通常在原型上共享，而不是每个实例一份。

## js-018

### Q1 single | sort 默认行为

下面代码输出什么？

```js
const arr = [1, 10, 2]
arr.sort()
console.log(arr)
```

- [ ] A. `[1, 2, 10]`
- [x] B. `[1, 10, 2]`
- [ ] C. `[10, 2, 1]`
- [ ] D. 抛出错误，数字数组不能 sort。

**解释**：`sort()` 默认按字符串字典序排序。数字升序应写 `arr.sort((a, b) => a - b)`。

### Q2 multiple | 会修改原数组的方法

哪些数组方法会修改原数组？

- [x] A. `push`
- [x] B. `splice`
- [x] C. `sort`
- [x] D. `reverse`
- [ ] E. `map`

**解释**：`map/filter/slice/concat` 等返回新结果，不修改原数组。现代还有 `toSorted/toReversed/toSpliced/with` 这类非变异替代。

### Q3 multiple | 方法选择

关于数组方法选择，哪些判断合理？

- [x] A. 需要生成等长转换数组时用 `map`。
- [x] B. 只做副作用遍历时可用 `forEach`，但它不能 `break` 提前退出。
- [x] C. 需要判断是否包含 `NaN` 时，`includes` 比 `indexOf` 更合适。
- [x] D. 需要提前找到第一个匹配元素时可用 `find`。
- [ ] E. `forEach` 会返回映射后的新数组。

**解释**：数组方法要按返回值、是否可提前退出、是否变异和比较语义选择。

## js-019

### Q1 single | Promise.race 超时

用 `Promise.race([fetchData(), timeout])` 做超时时，哪个说法正确？

- [ ] A. `race` 会自动取消输掉的 `fetchData()`。
- [x] B. `race` 只决定外层 Promise 状态，不会自动取消其他任务；取消 fetch 需配合 `AbortController`。
- [ ] C. `race` 只会接受 fulfilled，不会被 rejected 决定。
- [ ] D. `race([])` 会立即 fulfilled 为 `[]`。

**解释**：`race` 由第一个 settled 决定。输掉的任务仍可能继续运行，资源取消要额外设计。

### Q2 multiple | 空数组边界

关于 Promise 聚合方法传入空数组，哪些说法正确？

- [x] A. `Promise.all([])` fulfilled 为 `[]`。
- [x] B. `Promise.allSettled([])` fulfilled 为 `[]`。
- [x] C. `Promise.race([])` 会一直 pending。
- [x] D. `Promise.any([])` 会 rejected 为 `AggregateError`。
- [ ] E. 四者都会 fulfilled 为 `[]`。

**解释**：空输入边界很适合检验对方法语义的理解。`race` 没有任何参赛者，无法 settle。

### Q3 multiple | 业务场景选择

哪些 Promise 聚合方法选择是合理的？

- [x] A. 多个请求都必须成功才能继续，用 `Promise.all`。
- [x] B. 批量任务部分失败也要展示全部结果，用 `Promise.allSettled`。
- [x] C. 多源兜底，只要有一个成功即可，用 `Promise.any`。
- [x] D. 超时控制或抢先响应，用 `Promise.race`。
- [ ] E. 所有并发场景都应该用 `Promise.all`，失败策略不重要。

**解释**：并发不是只看速度，还要看失败策略、结果顺序和取消机制。

## js-020

### Q1 single | 创建阶段与执行阶段

下面函数中，`console.log(a)` 和访问 `b` 的差异来自哪里？

```js
function foo() {
  console.log(a)
  var a = 10

  console.log(b)
  let b = 20
}
```

- [ ] A. `var` 和 `let` 都不会在创建阶段处理。
- [x] B. 创建阶段 `var a` 初始化为 `undefined`，`let b` 建立绑定但处于 TDZ。
- [ ] C. `let b` 会初始化为 `undefined`，所以也能正常输出。
- [ ] D. 差异来自原型链查找。

**解释**：执行上下文创建阶段会建立环境记录。`var` 与 `let/const` 的初始化时机不同。

### Q2 multiple | 执行上下文包含的信息

函数执行上下文通常需要记录哪些信息？

- [x] A. 词法环境和变量环境。
- [x] B. 当前上下文的 `this` 绑定。
- [x] C. 指向外层词法环境的引用，用于形成作用域链。
- [ ] D. 当前函数所有未来异步回调的执行结果。
- [ ] E. 当前对象的原型链完整副本。

**解释**：执行上下文描述代码运行环境，核心是变量绑定、this 和外部环境引用。异步结果和对象原型不是上下文本身的组成。

### Q3 multiple | 调用栈与异步

关于调用栈，哪些说法正确？

- [x] A. 每次函数调用都会创建新的函数执行上下文并压入调用栈。
- [x] B. 调用栈是后进先出结构。
- [x] C. 异步回调要等当前调用栈清空后，才可能由事件循环取出执行。
- [x] D. 无限递归可能导致 `Maximum call stack size exceeded`。
- [ ] E. `setTimeout` 回调会在当前同步调用栈中立即执行。

**解释**：同步代码先在调用栈中跑完；事件循环负责后续把任务回调放入调用栈执行。

## js-021

### Q1 single | then 返回新 Promise

手写 Promise 时，为什么 `then` 必须返回一个新的 Promise？

- [ ] A. 为了让原 Promise 状态重新回到 pending。
- [x] B. 为了支持链式调用，并让回调返回值、thenable 或抛错决定下一环状态。
- [ ] C. 为了让 `then` 回调同步执行。
- [ ] D. 为了跳过 Promise Resolution Procedure。

**解释**：链式调用依赖每次 `then` 产生新的 Promise。新 Promise 的命运由当前回调返回值或错误按解析规则决定。

### Q2 multiple | Promise 解析规则

实现 `resolvePromise(nextPromise, x, resolve, reject)` 时，哪些边界需要处理？

- [x] A. 如果 `nextPromise === x`，要拒绝，避免自引用循环。
- [x] B. 如果 `x` 是 Promise，要跟随它的最终状态。
- [x] C. 如果 `x` 是 thenable，要读取并调用它的 `then`。
- [x] D. thenable 的 resolve/reject 只能第一次调用生效。
- [ ] E. 回调返回对象时应直接当普通值 fulfilled，不能读取 `then`。

**解释**：Promise Resolution Procedure 的核心是安全展开 Promise/thenable，同时防止自解析和多次 settle。

### Q3 multiple | 简版 Promise 关键点

哪些是手写简版 Promise 也应该讲清楚的关键点？

- [x] A. 状态只能从 pending 变为 fulfilled 或 rejected，且不可逆。
- [x] B. pending 时收集 fulfilled/rejected 队列，settle 后依次调度。
- [x] C. `then` 回调应异步执行，真实 Promise 使用微任务。
- [ ] D. 状态 settled 后再次调用 resolve/reject 应覆盖之前结果。
- [ ] E. `catch` 是完全独立机制，不能由 `then(undefined, onRejected)` 表达。

**解释**：面试简版不用覆盖所有规范细节，但状态机、异步队列、链式调用和解析规则必须说到。

## js-022

### Q1 single | next 参数

下面代码第二次 `next(10)` 中的 `10` 会赋给谁？

```js
function* gen() {
  const x = yield 1
  return x
}

const iterator = gen()
iterator.next()
console.log(iterator.next(10))
```

- [ ] A. 传给第一个 `yield 1` 的返回对象的 `value`。
- [x] B. 作为上一个 `yield` 表达式的结果赋给 `x`。
- [ ] C. 传给生成器函数的第一个形参。
- [ ] D. 被忽略，因为 `next` 不能传参。

**解释**：第一次 `next()` 启动执行，没有上一个 `yield` 接收参数；后续 `next(value)` 的参数会成为上一个 `yield` 的结果。

### Q2 multiple | Generator 能力

关于 Generator，哪些说法正确？

- [x] A. 调用生成器函数不会立即执行函数体，而是返回迭代器对象。
- [x] B. Generator 天然实现 Iterator/Iterable 协议，可用于 `for...of`。
- [x] C. `yield* iterable` 可以把控制委托给另一个可迭代对象。
- [ ] D. Generator 一旦暂停，就不能再恢复执行。
- [ ] E. Generator 的第一次 `next(arg)` 参数会被函数体第一个 `yield` 接收。

**解释**：Generator 的价值是可暂停和可恢复。它的 `next/throw/return` 是控制执行流的接口。

### Q3 multiple | Generator 异步执行器

用 Generator + Promise 写异步执行器时，哪些处理是合理的？

- [x] A. `yield` 出 Promise 后，用 `Promise.resolve(value)` 统一包装。
- [x] B. Promise fulfilled 后调用 `gen.next(data)`，把结果送回暂停点。
- [x] C. Promise rejected 后调用 `gen.throw(error)`，让生成器内部可以 `try/catch`。
- [ ] D. 不需要处理生成器函数内部同步抛错。
- [ ] E. 这说明原生 async/await 就是完全等价的 Generator。

**解释**：Generator 执行器是 async/await 的历史转译思路之一，但原生 async/await 是语言内建机制，不能简单等同。

## js-023

### Q1 single | Reflect 的价值

在 Proxy trap 中常写 `return Reflect.get(target, key, receiver)`，主要价值是什么？

- [ ] A. 让代理和原对象变成同一个引用。
- [x] B. 委托默认语义，正确处理原型链、getter/setter 和 receiver 等细节。
- [ ] C. 让所有属性都变成不可写。
- [ ] D. 绕过 Proxy 的所有不变量检查。

**解释**：Reflect API 与很多内部操作和 trap 对应。先增强再委托默认行为，能减少手写语义错误。

### Q2 multiple | Proxy 响应式

一个基于 Proxy 的响应式系统，哪些处理是核心思路？

- [x] A. `get` 中进行依赖收集。
- [x] B. `set` 中比较新旧值，变化时触发更新。
- [x] C. 嵌套对象可按需懒代理，并用 WeakMap 缓存代理。
- [ ] D. 只要代理根对象，所有嵌套对象的读写都会自动被拦截，无需返回代理。
- [ ] E. Proxy 可以完整 polyfill 到所有旧浏览器。

**解释**：Proxy 拦截的是被代理对象的操作。嵌套对象要在读取时继续转成代理，且 Proxy 无法被完整 polyfill。

### Q3 multiple | Proxy 边界

关于 Proxy，哪些说法正确？

- [x] A. `proxy !== target`。
- [x] B. trap 不能违反不可配置、不可写等对象不变量，否则会抛 TypeError。
- [x] C. Proxy 可以拦截 `get`、`set`、`deleteProperty`、`ownKeys`、`apply`、`construct` 等操作。
- [ ] D. Proxy 只能代理普通对象，不能代理函数。
- [ ] E. 使用 Proxy 没有任何性能成本，适合所有热点路径。

**解释**：Proxy 很强，但不是透明零成本。函数也可以代理，并可通过 `apply/construct` 拦截调用和构造。

## js-024

### Q1 single | WeakMap key

关于 WeakMap 的 key，哪项说法最准确？

- [ ] A. key 可以是任意原始值和对象。
- [x] B. key 通常必须是对象这类可被 GC 的引用值。
- [ ] C. key 必须是字符串。
- [ ] D. key 必须是 Symbol。

**解释**：WeakMap 的弱引用意义建立在对象可被垃圾回收上。普通原始值不能作为 WeakMap key。

### Q2 multiple | Map vs WeakMap

哪些是 WeakMap 相比 Map 的特点？

- [x] A. 不可迭代。
- [x] B. 没有 `size`。
- [x] C. 不会因为保存 key 就阻止 key 被 GC。
- [ ] D. 按插入顺序遍历 entries。
- [ ] E. key 可以是任意类型。

**解释**：WeakMap 不提供枚举和 size，是为了不暴露不可预测的 GC 行为。Map 则是强引用、可遍历字典。

### Q3 multiple | WeakMap 适用场景

哪些场景适合使用 WeakMap？

- [x] A. 给对象实例关联私有元数据。
- [x] B. 缓存以对象为 key 的计算结果，同时不希望缓存单独阻止对象回收。
- [x] C. 给 DOM 节点关联状态，节点不可达后状态可随之回收。
- [ ] D. 需要按插入顺序遍历所有 key/value 的业务列表。
- [ ] E. 需要统计缓存当前有多少条目。

**解释**：WeakMap 适合“不影响对象生命周期”的关联数据；需要遍历或计数时用 Map。

## js-025

### Q1 single | Symbol 唯一性

下面代码输出什么？

```js
const a = Symbol('id')
const b = Symbol('id')
console.log(a === b)
```

- [ ] A. `true`，因为描述字符串相同。
- [x] B. `false`，因为每次 `Symbol()` 都创建唯一值。
- [ ] C. 抛出错误，Symbol 不能带描述。
- [ ] D. `undefined`

**解释**：Symbol 的描述只用于调试，不参与相等判断。普通 `Symbol()` 每次都不同。

### Q2 multiple | Symbol 属性枚举

关于对象上的 Symbol 键，哪些说法正确？

- [x] A. `Object.keys()` 不会返回 Symbol 键。
- [x] B. `Object.getOwnPropertySymbols()` 可以获取对象自有 Symbol 键。
- [x] C. `Reflect.ownKeys()` 会返回字符串键和 Symbol 键。
- [ ] D. Symbol 属性是真正安全私有，任何反射 API 都无法看到。
- [ ] E. `JSON.stringify()` 会正常序列化 Symbol 键。

**解释**：Symbol 降低命名冲突，不等于安全私有。反射 API 仍能发现对象上的 Symbol 自有属性。

### Q3 multiple | well-known symbols

哪些属于 well-known Symbol 的用途？

- [x] A. `Symbol.iterator` 定义可迭代协议。
- [x] B. `Symbol.toPrimitive` 自定义对象转原始值。
- [x] C. `Symbol.toStringTag` 自定义 `Object.prototype.toString` 标签。
- [x] D. `Symbol.hasInstance` 自定义 `instanceof` 行为。
- [ ] E. `Symbol.for` 每次都创建全新的本地 Symbol。

**解释**：`Symbol.for` 使用全局注册表，同 key 会复用。well-known symbols 是语言内置协议入口。

## js-026

### Q1 single | 迭代器结果

一个合法迭代器的 `next()` 方法应该返回什么？

- [ ] A. 只返回下一个值本身，例如 `1`。
- [x] B. 返回形如 `{ value, done }` 的 iterator result。
- [ ] C. 返回数组 `[value, done]`。
- [ ] D. 永远返回 Promise。

**解释**：迭代器协议要求 `next()` 返回对象，至少表达 `value` 和 `done`。异步迭代器才涉及 Promise 包装。

### Q2 multiple | 可迭代对象

哪些对象默认通常是可迭代的？

- [x] A. Array
- [x] B. String
- [x] C. Map
- [x] D. Set
- [ ] E. 普通对象字面量 `{ a: 1 }`

**解释**：普通对象默认没有 `[Symbol.iterator]`。遍历普通对象常用 `Object.keys/values/entries`。

### Q3 multiple | 消费可迭代对象

哪些语法或 API 会消费 iterable？

- [x] A. `for...of`
- [x] B. 数组展开 `[...iterable]`
- [x] C. 解构赋值 `const [a, b] = iterable`
- [x] D. `Promise.all(iterable)`
- [ ] E. `for...in`

**解释**：`for...in` 遍历可枚举字符串属性键，不走 iterable 协议。`for...of` 等会调用 `[Symbol.iterator]()`。

## js-027

### Q1 single | 对象方法中的箭头函数

下面代码中 `obj.arrow()` 为什么通常不会返回 `'obj'`？

```js
const obj = {
  name: 'obj',
  arrow: () => this?.name,
}
```

- [ ] A. 箭头函数没有返回值。
- [x] B. 箭头函数没有自己的 `this`，这里捕获的是定义位置外层的 `this`，不是调用点的 `obj`。
- [ ] C. 对象字面量里不能定义箭头函数。
- [ ] D. `this` 在 JavaScript 中只能用于 class。

**解释**：普通对象方法通常不要写成箭头函数，除非你明确需要外层词法 `this`。

### Q2 multiple | 箭头函数限制

哪些是箭头函数与普通函数的区别？

- [x] A. 箭头函数没有自己的 `arguments`。
- [x] B. 箭头函数不能作为构造函数使用。
- [x] C. 箭头函数没有自己的 `prototype` 属性。
- [x] D. 箭头函数的 `this` 不能被 `call/apply/bind` 改变。
- [ ] E. 箭头函数可以写成生成器函数。

**解释**：箭头函数适合短函数和保留外层 `this` 的回调，不适合动态 `this`、构造函数或 Generator。

### Q3 multiple | 适用场景

哪些场景适合使用箭头函数？

- [x] A. `arr.map((x) => x * 2)` 这类短小纯回调。
- [x] B. 定时器或 Promise 回调中需要保留外层 `this`。
- [x] C. 类组件中作为字段回调，避免手动 bind。
- [ ] D. 构造函数。
- [ ] E. 原型方法，需要让 `this` 指向调用对象。

**解释**：箭头函数的优点和限制都来自词法 `this`。需要动态接收者时选普通函数。

## js-028

### Q1 single | defineProperty 限制

为什么 Vue2 基于 `Object.defineProperty` 的响应式对新增属性和数组下标处理不自然？

- [ ] A. `Object.defineProperty` 不能定义 getter/setter。
- [x] B. 它拦截的是已定义属性的读写，新增/删除属性和数组下标等需要额外处理。
- [ ] C. 它只能用于 Map 和 Set。
- [ ] D. 它会自动代理整个对象所有未来操作。

**解释**：`defineProperty` 是属性级 getter/setter。新增属性、删除属性、数组 length/下标等不是同一类拦截模型。

### Q2 multiple | Proxy 响应式优势

相比 `defineProperty`，Proxy 响应式有哪些优势？

- [x] A. 可以拦截对象层面的新增、删除、`in`、`ownKeys` 等更多操作。
- [x] B. 可以对嵌套对象按需懒代理，降低初始化递归成本。
- [x] C. 对数组下标和 length 相关操作有更统一的拦截能力。
- [ ] D. 可以完整 polyfill 到 IE。
- [ ] E. 代理后原对象和代理对象引用完全相等。

**解释**：Proxy 覆盖面更广，但兼容性要求更高，且 `proxy !== target`。

### Q3 multiple | Vue 响应式理解

关于 Vue2/Vue3 响应式对比，哪些说法合理？

- [x] A. Vue2 可概括为把每个属性改造成 getter/setter。
- [x] B. Vue3 可概括为给对象套代理，按操作追踪和触发。
- [x] C. Vue2 对新增属性常需要 `Vue.set` / `$set` 这类辅助。
- [ ] D. Vue3 使用 Proxy 后不需要依赖收集和触发更新。
- [ ] E. `Object.defineProperty` 可以拦截对象所有基本操作，包括 `delete` 和 `ownKeys`。

**解释**：Proxy 改变的是拦截层级，不是取消响应式系统。依赖收集、调度和触发仍然是核心。

## js-029

### Q1 single | 防抖场景

搜索框输入联想，希望用户停止输入 300ms 后只请求最后一次关键词。应优先用什么？

- [x] A. 防抖 debounce。
- [ ] B. 节流 throttle。
- [ ] C. `for...in`。
- [ ] D. `Promise.race([])`。

**解释**：防抖的核心是“等停止后执行最后一次”，很适合输入搜索、校验、resize 结束处理。

### Q2 single | 节流场景

滚动过程中每 200ms 最多上报一次位置，更适合什么？

- [ ] A. 防抖，因为滚动期间完全不需要执行。
- [x] B. 节流，因为它控制固定频率持续执行。
- [ ] C. 深拷贝。
- [ ] D. `Object.freeze`。

**解释**：节流适合高频持续事件中的周期性执行，例如 scroll、drag、mousemove、上报。

### Q3 multiple | 实现细节

手写防抖/节流时，哪些细节值得注意？

- [x] A. 用闭包保存 timer、lastTime 等状态。
- [x] B. 调用原函数时保留 `this` 和参数。
- [x] C. 根据业务决定 leading/trailing 是否执行。
- [x] D. 滚动监听可配合 `{ passive: true }`，视觉更新可考虑 `requestAnimationFrame`。
- [ ] E. 防抖和节流完全一样，只是名字不同。

**解释**：防抖等停下，节流控频率。实现质量常体现在 this/参数、头尾调用和事件监听策略上。

## js-030

### Q1 single | 数组上的 for...in

下面代码可能输出哪些 key？

```js
const arr = [10, 20, 30]
arr.extra = 'oops'

for (const key in arr) {
  console.log(key)
}
```

- [ ] A. 只输出 `10 20 30`。
- [x] B. 可能输出 `0 1 2 extra`。
- [ ] C. 抛出错误，数组不能用 `for...in`。
- [ ] D. 只输出 `extra`。

**解释**：`for...in` 遍历可枚举字符串属性键，不是值。数组额外可枚举属性也可能被遍历到。

### Q2 multiple | for...of

关于 `for...of`，哪些说法正确？

- [x] A. 它消费 iterable 的 `[Symbol.iterator]()`。
- [x] B. 遍历数组时拿到的是值，不是字符串索引。
- [x] C. 遍历 Map 时常用 `for (const [key, value] of map)`。
- [ ] D. 普通对象默认可以直接 `for...of`。
- [ ] E. 它会遍历对象原型链上的可枚举属性。

**解释**：`for...of` 走迭代协议；普通对象默认不可迭代，原型链枚举是 `for...in` 的行为。

### Q3 multiple | 遍历选择

哪些遍历选择更合理？

- [x] A. 普通对象自身键值对用 `Object.entries(obj)`。
- [x] B. 可迭代数据如数组、字符串、Map、Set 用 `for...of`。
- [x] C. 用 `for...in` 遍历对象时，如只要自身属性应配合 `Object.hasOwn`。
- [ ] D. 数组业务遍历优先用 `for...in`。
- [ ] E. Symbol 键会被 `for...in` 自动遍历出来。

**解释**：对象属性和可迭代值是两套机制。`for...in` 不遍历 Symbol 键，也不适合普通数组值遍历。

## js-031

### Q1 single | CJS 解构导出值

`counter.cjs` 中 `module.exports = { count, increment, getCount }`，导入方写：

```js
const { count, increment, getCount } = require('./counter.cjs')

increment()
console.log(count)
console.log(getCount())
```

如果 `increment` 修改的是模块内部 `count`，输出更可能是什么？

- [ ] A. `1`、`1`
- [x] B. `0`、`1`
- [ ] C. `undefined`、`undefined`
- [ ] D. 抛出错误，CommonJS 不能解构。

**解释**：CJS 导出对象本身是引用，但解构属性得到的是当时属性值的本地变量。通过函数读取内部变量才能拿到最新值。

### Q2 multiple | ESM 特点

ES Module 有哪些特点？

- [x] A. 静态 `import/export` 让依赖关系在解析阶段更清楚。
- [x] B. 导出是 live binding，导入方读取到导出绑定的最新值。
- [x] C. 导入绑定在导入模块中是只读视图，不能重新赋值。
- [x] D. 静态结构更利于 tree shaking。
- [ ] E. ESM 默认不是严格模式。

**解释**：ESM 更静态、更利于构建优化。导入绑定不是普通拷贝，也不能在导入方改写。

### Q3 multiple | CJS 与 ESM 对比

关于 CJS 和 ESM，哪些说法正确？

- [x] A. CJS 的 `require()` 是运行时同步加载，常见于 Node 旧生态。
- [x] B. CJS 可以动态 require，例如放在条件分支里。
- [x] C. ESM 动态加载应使用 `import()`，它返回 Promise。
- [ ] D. CJS 和 ESM 都完全不缓存模块实例。
- [ ] E. ESM 循环依赖完全没有 TDZ 风险。

**解释**：两者都有模块缓存。ESM 循环依赖会先建立绑定，但访问时仍可能遇到 TDZ。

## js-032

### Q1 single | curry 调用方式

对 `sum = curry((a, b, c) => a + b + c)`，下面哪种调用通常不应该得到 `6`？

- [ ] A. `sum(1)(2)(3)`
- [ ] B. `sum(1, 2)(3)`
- [ ] C. `sum(1, 2, 3)`
- [x] D. `sum(1)(2)`

**解释**：柯里化会先收集参数，参数数量达到 arity 后才执行原函数。只传两个参数时还应返回继续收集的函数。

### Q2 multiple | curry 实现细节

手写通用 `curry(fn, arity = fn.length)` 时，哪些细节需要注意？

- [x] A. 参数不足时返回新的收集函数。
- [x] B. 参数足够时用收集到的参数调用原函数。
- [x] C. 需要保留调用时的 `this`，可用 `apply`。
- [ ] D. `fn.length` 永远能准确表示所有函数需要的参数数量。
- [ ] E. 柯里化后函数必须一次只接收一个参数，不能支持 `sum(1, 2)(3)`。

**解释**：`fn.length` 不包含剩余参数，并会受默认参数影响；复杂函数最好显式传 arity。

### Q3 multiple | 使用边界

关于柯里化，哪些判断合理？

- [x] A. 可以用于参数复用，例如先固定类型得到 `isString`。
- [x] B. 可以配合函数组合生成更专用的函数。
- [x] C. 过度使用会增加调用层级和阅读成本。
- [ ] D. 柯里化能自动提升所有函数性能。
- [ ] E. 柯里化只能用于数学函数，不能用于业务格式化函数。

**解释**：柯里化强调复用和组合，不是性能优化银弹。业务里要以可读性为先。

## js-033

### Q1 single | Object.create

`Object.create(proto)` 的核心作用是什么？

- [ ] A. 深拷贝 `proto` 的所有属性。
- [x] B. 创建一个新对象，并把它的原型设为 `proto`。
- [ ] C. 冻结 `proto`。
- [ ] D. 把 `proto` 的属性全部变成不可枚举。

**解释**：`Object.create` 建立原型委托关系，不复制整棵对象。常用于无原型字典、原型委托和寄生组合继承。

### Q2 multiple | Object.assign

关于 `Object.assign(target, ...sources)`，哪些说法正确？

- [x] A. 它会修改并返回 `target`。
- [x] B. 它是浅拷贝，嵌套对象仍共享引用。
- [x] C. 它复制自有可枚举的 string key 和 Symbol key。
- [x] D. 读取源属性时可能触发 getter，写目标属性时可能触发 setter。
- [ ] E. 它会完整复制原型和属性描述符。

**解释**：`Object.assign` 是常用浅复制/合并工具，不是完整克隆工具。需要描述符时要用其他 API。

### Q3 multiple | freeze/seal/preventExtensions

关于对象不可变相关 API，哪些说法正确？

- [x] A. `Object.freeze` 是浅冻结，嵌套对象不会自动冻结。
- [x] B. frozen 对象不能新增、删除属性，也不能修改已有数据属性值。
- [x] C. `Object.seal` 禁止增删属性，但已有可写属性仍可改值。
- [x] D. `Object.preventExtensions` 禁止新增属性。
- [ ] E. `Object.freeze` 会深度冻结 Map、Set、DOM 等所有结构。

**解释**：这些 API 只控制对象自身层级。深冻结需要递归，而且遇到特殊对象要谨慎。

## js-034

### Q1 single | # 私有字段

关于 class 的 `#name` 私有字段，哪项正确？

- [ ] A. 它只是 `_name` 的语法糖，外部可以正常 `p.#name` 访问。
- [x] B. 它是语言级私有，只能在声明它的类体内部访问。
- [ ] C. 可以通过 `p['#name']` 访问同一个私有字段。
- [ ] D. 它会被 `Object.keys(p)` 枚举出来。

**解释**：`#name` 是私有品牌字段，类外访问是语法错误。`p['#name']` 只是普通字符串属性访问。

### Q2 multiple | 私有方案对比

关于 JavaScript 私有属性方案，哪些说法正确？

- [x] A. `_name` 只是命名约定，不是真正私有。
- [x] B. 闭包可以隐藏变量，但每个实例通常会创建自己的函数。
- [x] C. WeakMap 可以用实例作为 key 存私有数据，且不阻止实例 GC。
- [x] D. 现代项目优先考虑 `#` 私有字段/方法。
- [ ] E. WeakMap 的私有数据可以通过 `Object.keys(instance)` 枚举出来。

**解释**：不同私有方案在封装强度、性能、兼容性和可读性上取舍不同。

### Q3 single | 私有品牌检查

`#value in obj` 的用途是什么？

- [ ] A. 判断对象是否有字符串属性 `'#value'`。
- [x] B. 检查对象是否拥有当前类声明的私有品牌。
- [ ] C. 把私有字段转换成公开字段。
- [ ] D. 枚举所有私有字段。

**解释**：私有字段有语言级品牌。`#value in obj` 只能在声明该私有名的类体内使用，用于安全检查。

## js-035

### Q1 single | Set 对象去重

下面代码结果是什么？

```js
new Set([{ id: 1 }, { id: 1 }]).size
```

- [ ] A. `1`，因为两个对象结构相同。
- [x] B. `2`，因为对象按引用判断，不按结构判断。
- [ ] C. `0`
- [ ] D. 抛出错误，Set 不能存对象。

**解释**：Set 用 SameValueZero 判断值是否相同。对象值按引用比较，两个字面量是不同引用。

### Q2 multiple | Set 特性

关于 Set，哪些说法正确？

- [x] A. 值唯一，按插入顺序迭代。
- [x] B. `NaN` 与 `NaN` 被视为相同。
- [x] C. `+0` 和 `-0` 被视为相同。
- [x] D. 可用于数组去重和集合运算。
- [ ] E. Set 会按对象结构自动去重。

**解释**：Set 适合唯一集合语义，但复杂对象结构去重需要按业务 key 自己处理。

### Q3 multiple | Map vs Object

哪些场景更适合 Map？

- [x] A. key 可能是对象、函数等任意值。
- [x] B. 需要频繁动态增删键值对。
- [x] C. 需要原生 `.size` 和默认可迭代能力。
- [ ] D. 表示一条固定结构、需要 JSON 序列化的业务记录。
- [ ] E. 需要所有 key 自动转成字符串。

**解释**：Object 适合固定记录模型和 JSON 数据；Map 适合字典、缓存、任意 key 和频繁增删。

## js-036

### Q1 single | ?? 与 ||

下面代码中哪个值更适合用 `??` 而不是 `||` 设置默认值？

```js
const config = { timeout: 0 }
```

- [ ] A. `config.timeout || 5000`，因为 0 表示缺失。
- [x] B. `config.timeout ?? 5000`，因为 0 是有效值，不应被默认值覆盖。
- [ ] C. `config.timeout && 5000`
- [ ] D. `Boolean(config.timeout) ? 5000 : 0`

**解释**：`??` 只在 `null/undefined` 时使用默认值，不会误伤 `0`、空字符串和 `false`。

### Q2 multiple | 可选链边界

关于可选链 `?.`，哪些说法正确？

- [x] A. 左侧是 `null` 或 `undefined` 时短路并返回 `undefined`。
- [x] B. `obj?.a.b` 只保护 `obj`，不保护 `obj.a`。
- [x] C. 安全访问深层链应写成 `obj?.a?.b`。
- [ ] D. 可选链可以直接作为赋值左侧，例如 `user?.name = 'A'`。
- [ ] E. 可选链会捕获所有运行时错误并返回 `undefined`。

**解释**：可选链只处理 nullish 访问短路，不是通用 try/catch，也不能作为赋值目标。

### Q3 multiple | 混用与逻辑赋值

关于 `??` 和逻辑赋值，哪些说法正确？

- [x] A. `??` 不能和 `||`、`&&` 无括号混用。
- [x] B. `options.timeout ??= 5000` 只在左侧为 `null/undefined` 时赋值。
- [x] C. `flag ||= true` 会在左侧是假值时赋值。
- [ ] D. `'' ?? 'default'` 的结果是 `'default'`。
- [ ] E. `false ?? true` 的结果是 `true`。

**解释**：空字符串和 false 都不是 nullish。`??` 适合保留有效假值。

## js-037

### Q1 single | fetch 与 HTTP 错误

`fetch('/api')` 收到 HTTP 500 响应时，通常会发生什么？

- [ ] A. fetch Promise 一定 rejected。
- [x] B. fetch Promise 通常 fulfilled，需要检查 `res.ok` 或 `res.status` 并主动抛错。
- [ ] C. 浏览器会自动重试直到成功。
- [ ] D. `finally` 会拿到 HTTP body。

**解释**：fetch 只在网络失败、CORS 等情况下 reject。HTTP 4xx/5xx 是成功收到响应，需要业务层判断。

### Q2 multiple | 错误处理实践

哪些错误处理实践是合理的？

- [x] A. 不要空 `catch` 静默吞错。
- [x] B. 抛出 `Error` 或其子类，而不是直接抛字符串。
- [x] C. 未知错误不要吞掉，应重新抛出或上报。
- [x] D. 用 `finally` 做资源清理、loading 收尾或锁释放。
- [ ] E. 全局 `error/unhandledrejection` 可以替代所有局部错误处理。

**解释**：全局监听是兜底上报，不是恢复策略。局部代码应处理自己能理解和恢复的错误。

### Q3 multiple | 错误类型

哪些错误类型和含义匹配？

- [x] A. `ReferenceError`：访问不存在的绑定。
- [x] B. `TypeError`：值类型不支持当前操作。
- [x] C. `RangeError`：数值范围不合法。
- [x] D. `AggregateError`：多个错误聚合，例如 `Promise.any` 全部失败。
- [ ] E. `SyntaxError`：运行时除零错误。

**解释**：不同错误类型帮助快速定位错误来源。自定义错误可携带 code、statusCode、cause 等结构化信息。

## js-038

### Q1 single | rAF 动画

为什么动画通常优先使用 `requestAnimationFrame` 而不是固定 `setInterval(..., 16)`？

- [ ] A. rAF 会让 JavaScript 运行在独立线程，不占主线程。
- [x] B. rAF 在下一次重绘前调用，更贴合浏览器刷新节奏。
- [ ] C. rAF 在后台页面一定保持 60fps。
- [ ] D. rAF 只能用于网络请求超时。

**解释**：rAF 适合视觉更新。它跟随刷新率和页面状态，后台通常会暂停或降频。

### Q2 multiple | rAF 实践

使用 rAF 做动画时，哪些做法正确？

- [x] A. 用回调传入的 timestamp 计算进度，而不是假设每帧固定 16.67ms。
- [x] B. 停止动画时调用 `cancelAnimationFrame(rafId)`。
- [x] C. 优先修改 `transform`、`opacity` 等更适合动画的属性。
- [ ] D. 在同一帧反复读写布局属性，强制浏览器多次 reflow。
- [ ] E. 所有非视觉延时逻辑都应该用 rAF 替代 `setTimeout`。

**解释**：rAF 用于视觉更新。非视觉延时、超时控制、轮询等仍更适合定时器。

### Q3 multiple | rAF vs 定时器

哪些说法正确？

- [x] A. `setTimeout` 到时间后只是进入任务队列，实际执行可能延后。
- [x] B. rAF 回调通常在浏览器绘制前执行。
- [x] C. 主线程繁忙会影响定时器和 rAF 回调执行。
- [ ] D. `setInterval(16)` 能精确保证每秒 60 帧。
- [ ] E. rAF 回调不受页面刷新率影响。

**解释**：浏览器调度受主线程、刷新率、后台节流等影响。动画要基于时间差而非帧数假设。

## js-039

### Q1 multiple | ES2022 常见特性

哪些属于 ES2022 常见特性？

- [x] A. class fields 和 `#` 私有字段。
- [x] B. 顶层 await。
- [x] C. `Array.prototype.at`。
- [x] D. `Object.hasOwn` 和 `Error.cause`。
- [ ] E. JSX。

**解释**：JSX 不是 ECMAScript 标准特性。ES2022 的这些能力都已经常见于现代项目。

### Q2 multiple | 非变异数组方法

哪些数组方法返回新数组而不修改原数组？

- [x] A. `toSorted`
- [x] B. `toReversed`
- [x] C. `toSpliced`
- [x] D. `with`
- [ ] E. `sort`

**解释**：ES2023 的非变异数组方法很适合 React/Redux 等不可变更新场景；`sort` 会原地修改。

### Q3 multiple | groupBy 与新 API

关于 ES2024+ 常见新 API，哪些说法正确？

- [x] A. `Promise.withResolvers()` 可创建 `{ promise, resolve, reject }`，替代手写 deferred。
- [x] B. `Object.groupBy` 的分组 key 会变成对象属性键。
- [x] C. 需要对象作为分组 key 时可用 `Map.groupBy`，并复用同一个 key 对象。
- [x] D. Iterator helpers 可以链式 `filter/map/toArray` 处理迭代器。
- [ ] E. `RegExp.escape` 的用途是执行正则匹配并返回结果数组。

**解释**：这些新 API 解决 deferred、分组、迭代器处理和正则转义等实际问题。回答年份不如说清用途重要。

## js-040

### Q1 single | ToPrimitive 顺序

对象参与 `+obj` 这类数值倾向转换时，如果没有 `[Symbol.toPrimitive]`，普通对象通常优先调用什么？

- [ ] A. `toString()`，然后 `valueOf()`。
- [x] B. `valueOf()`，然后 `toString()`。
- [ ] C. `JSON.stringify()`。
- [ ] D. `Object.keys()`。

**解释**：普通对象在 number/default hint 下通常先 `valueOf`，string hint 下通常先 `toString`。`Symbol.toPrimitive` 优先级最高。

### Q2 multiple | 隐式转换结果

哪些表达式结果为 `true`？

- [x] A. `[] == 0`
- [x] B. `[1] == 1`
- [x] C. `[] == ![]`
- [x] D. `null >= 0`
- [ ] E. `null == 0`

**解释**：关系比较和抽象相等规则不同。`null >= 0` 会走数值比较，`null == 0` 有单独规则，为 false。

### Q3 multiple | ToBoolean 假值

哪些值在 ToBoolean 中是假值？

- [x] A. `false`
- [x] B. `0n`
- [x] C. `''`
- [x] D. `NaN`
- [ ] E. `[]`

**解释**：对象都是真值，包括空数组、空对象和 `new Boolean(false)`。假值集合很少，应直接记清楚。

## js-041

### Q1 single | spread 与 rest 位置

同样是 `...`，如何区分展开语法和剩余语法？

- [ ] A. 在数组中一定是 rest，在函数中一定是 spread。
- [x] B. 放在“使用值”的位置是 spread，放在“接收值”的位置是 rest。
- [ ] C. spread 只能用于对象，rest 只能用于数组。
- [ ] D. 两者完全等价，没有区别。

**解释**：`fn(...args)` 是展开；`function fn(...args)` 是收集。数组/对象字面量中也可能出现 spread，解构中可能出现 rest。

### Q2 multiple | spread 边界

关于展开语法，哪些说法正确？

- [x] A. 函数参数和数组字面量中的 spread 要求右侧是 iterable。
- [x] B. 对象展开复制自有可枚举属性，不走迭代协议。
- [x] C. 对象展开是浅拷贝，嵌套对象仍共享引用。
- [x] D. 后展开的同名属性会覆盖前面的属性。
- [ ] E. 对象展开会复制原型和完整属性描述符。

**解释**：对象展开更像浅层属性复制，不是完整克隆。它会触发 getter，但不保留原型和完整描述符。

### Q3 multiple | rest 参数

关于剩余参数和解构 rest，哪些说法正确？

- [x] A. 剩余参数必须放在形参最后。
- [x] B. 剩余参数得到的是真数组，不是类数组。
- [x] C. 箭头函数没有自己的 `arguments`，需要可变参数时应使用 rest。
- [x] D. 解构中的 rest 也必须放在最后。
- [ ] E. 剩余参数和 `arguments` 完全相同。

**解释**：rest 比 `arguments` 更清晰、更现代。`arguments` 是类数组，并且箭头函数没有自己的 `arguments`。

## js-042

### Q1 single | 尾调用判断

下面哪个是尾调用？

- [x] A. `function foo(x) { return bar(x) }`
- [ ] B. `function foo(x) { return bar(x) + 1 }`
- [ ] C. `function foo(x) { const y = bar(x); return y }`
- [ ] D. `function foo(x) { return 1 + bar(x) }`

**解释**：尾调用要求最后一步就是直接返回另一个函数调用结果。调用后还要加法或保留临时状态，通常不算尾调用。

### Q2 multiple | JavaScript 中的 TCO

关于尾调用优化，哪些说法正确？

- [x] A. 尾递归是尾调用的一种特殊情况。
- [x] B. TCO 可以理论上把尾递归空间从 O(n) 降到 O(1)。
- [x] C. 主流 Chrome、Node.js 不能依赖 TCO 避免栈溢出。
- [ ] D. 只要写成尾递归，所有 JavaScript 引擎都会优化。
- [ ] E. 尾调用只能发生在递归函数里。

**解释**：TCO 是语言/引擎优化概念。工程上深递归不能假设浏览器或 Node 会优化。

### Q3 single | 蹦床函数

Trampoline 的核心思路是什么？

- [ ] A. 让递归调用在浏览器渲染线程中执行。
- [x] B. 递归步骤返回下一个函数，再用循环反复执行，避免调用栈增长。
- [ ] C. 用 `setTimeout` 把所有计算丢到宏任务。
- [ ] D. 把所有递归函数改成 Generator 就一定不会栈溢出。

**解释**：蹦床把“调用下一层”变成“返回下一步”，由外层循环驱动，从而避免堆叠调用栈。

## js-043

### Q1 single | 隐藏类稳定性

为什么构造函数或 class constructor 中一次性按固定顺序初始化字段更利于 V8 优化？

- [ ] A. 因为这样对象会自动变成不可变。
- [x] B. 因为相同属性集合和添加顺序的对象更容易共享隐藏类/shape。
- [ ] C. 因为这样可以跳过垃圾回收。
- [ ] D. 因为 V8 不允许运行时添加属性。

**解释**：隐藏类稳定能让属性访问更容易走固定偏移和内联缓存。随意增删属性会增加优化难度。

### Q2 multiple | 破坏优化的写法

哪些写法可能破坏对象 shape 或让 IC 变复杂？

- [x] A. 不同实例用不同顺序添加属性。
- [x] B. 热路径中频繁 `delete` 属性。
- [x] C. 同一个函数调用点传入很多不同形状的对象。
- [x] D. 数组中混入多种元素类型或制造稀疏数组。
- [ ] E. 构造阶段统一初始化所有字段。

**解释**：JIT 优化依赖运行时反馈的稳定性。形状、参数类型、数组元素类型越稳定，越容易优化。

### Q3 multiple | JIT 与反优化

关于 V8 JIT，哪些说法正确？

- [x] A. 解释执行会收集类型反馈，热点代码可能进入优化编译。
- [x] B. 优化代码基于运行时假设，假设失效可能 deopt。
- [x] C. 微优化应以 Performance/Profiler 实测为准，不要牺牲清晰结构。
- [ ] D. JIT 优化后代码永远不会退回低层执行。
- [ ] E. 不同 V8 版本优化策略完全不变。

**解释**：JIT 是投机优化。版本、数据形状和调用模式都会影响结果，真实性能要测。

## js-044

### Q1 single | 内存泄漏定义

什么更准确地描述了 JavaScript 内存泄漏？

- [ ] A. 任意占用内存大的对象都是泄漏。
- [x] B. 对象已经不再被业务需要，但仍能从 GC Roots 通过引用链访问到。
- [ ] C. 只要有闭包就是泄漏。
- [ ] D. 循环引用一定是泄漏。

**解释**：泄漏的关键是“无用但可达”。现代标记清除能回收整体不可达的循环引用。

### Q2 multiple | 常见泄漏源

哪些属于常见前端内存泄漏来源？

- [x] A. 全局对象上的事件监听未移除，闭包持有组件实例。
- [x] B. 定时器、WebSocket、Observer、订阅没有在销毁时清理。
- [x] C. Detached DOM 仍被 JS 变量或缓存引用。
- [x] D. Map 缓存无限增长，没有容量或过期策略。
- [ ] E. 函数执行结束后的所有局部变量都一定可达。

**解释**：事件、订阅、缓存、DOM 引用都是长期引用链的常见来源。局部变量是否可回收取决于是否仍可达。

### Q3 multiple | 排查内存泄漏

使用 Chrome DevTools 排查内存泄漏时，哪些做法合理？

- [x] A. 反复执行同一用户流程，观察 JS Heap 是否持续抬升且不回落。
- [x] B. 操作前后拍 Heap Snapshot，并对比增量对象。
- [x] C. 查看 Retainers，找到是谁还在引用目标对象。
- [x] D. 重点关注 Detached DOM tree、listener、timer、closure、Map cache。
- [ ] E. 只看网络面板就能定位所有内存泄漏。

**解释**：内存泄漏要看对象分配、保留路径和可达性。Network 面板不是主要工具。

## js-045

### Q1 single | Worker 适用场景

哪个任务最适合放到 Web Worker 中？

- [ ] A. 直接修改 DOM 样式。
- [x] B. 大数据解析、压缩、图片处理等 CPU 密集计算。
- [ ] C. 读取按钮当前 hover 状态。
- [ ] D. 调用 `document.querySelector` 批量操作页面。

**解释**：Worker 运行在独立线程，不能直接访问 DOM。它适合把 CPU 密集任务移出主线程。

### Q2 multiple | Worker 通信

关于 Worker 通信和数据传递，哪些说法正确？

- [x] A. `postMessage` 默认使用结构化克隆。
- [x] B. 大二进制数据可用 Transferable 转移所有权，避免拷贝。
- [x] C. 转移 ArrayBuffer 后，发送方的 buffer 会被 detached。
- [ ] D. Worker 和主线程共享同一个 JS 调用栈。
- [ ] E. Worker 可以直接同步读取主线程 DOM。

**解释**：Worker 与主线程通过消息通信。要共享内存则需要 SharedArrayBuffer/Atomics，而不是直接共享调用栈或 DOM。

### Q3 multiple | SharedArrayBuffer 与限制

关于 `SharedArrayBuffer`、`Atomics` 和 Worker 限制，哪些说法正确？

- [x] A. `SharedArrayBuffer` 允许多线程共享同一块内存。
- [x] B. `Atomics` 提供原子读写和同步能力。
- [x] C. 浏览器使用 SharedArrayBuffer 通常需要跨源隔离。
- [x] D. Worker 启动和通信都有成本，短小任务不一定值得拆。
- [ ] E. Service Worker 主要用于 UI 线程计算加速。

**解释**：Service Worker 主要是网络代理、缓存和离线能力。UI 计算任务通常用 Dedicated Worker。

## js-046

### Q1 single | 事件委托核心

事件委托的核心原理是什么？

- [ ] A. 所有事件都必须绑定到 `document.body`。
- [x] B. 利用事件冒泡，在共同祖先统一监听，再根据事件目标判断子元素。
- [ ] C. 让事件不再传播。
- [ ] D. 把所有事件都转成自定义事件。

**解释**：事件委托减少监听器数量，并让动态新增子元素也能被统一处理。

### Q2 multiple | 委托实现细节

实现事件委托时，哪些细节合理？

- [x] A. 用 `event.target.closest(selector)` 找到匹配子元素。
- [x] B. 用 `root.contains(target)` 防止误命中容器外节点。
- [x] C. 返回 cleanup，卸载时移除监听器。
- [ ] D. 不管什么事件都能冒泡到父级。
- [ ] E. 子元素调用 `stopPropagation()` 不会影响父级委托。

**解释**：不是所有事件都冒泡；传播被阻止后父级监听器可能收不到。委托也要清理监听器。

### Q3 multiple | 边界事件

关于事件委托边界，哪些说法正确？

- [x] A. `focus/blur` 不冒泡，可考虑 `focusin/focusout` 或捕获阶段。
- [x] B. `mouseenter/mouseleave` 不冒泡，常用 `mouseover/mouseout` 加 relatedTarget 判断。
- [x] C. Shadow DOM 中事件目标可能 retarget，可结合 `composedPath()`。
- [ ] D. 高频事件委托后就不需要节流、防抖或 passive。
- [ ] E. `preventDefault()` 和 `stopPropagation()` 是同一件事。

**解释**：`preventDefault` 阻止默认行为，`stopPropagation` 阻止继续传播。高频事件仍要考虑性能。

## js-047

### Q1 single | AbortController 复用

一个 `AbortController` 调用 `abort()` 后，能否 reset 后继续用于下一轮请求？

- [ ] A. 可以，设置 `signal.aborted = false` 即可。
- [x] B. 不可以；同一个 signal 已经处于 aborted，新一轮操作应创建新的 controller。
- [ ] C. 只有 fetch 可以 reset，其他 API 不行。
- [ ] D. 只有 Node.js 中不能 reset。

**解释**：`abort()` 是一次性的取消信号。后续复用已 abort 的 signal 会让支持 signal 的操作立即处于取消状态。

### Q2 multiple | 超时和取消

关于取消请求，哪些说法正确？

- [x] A. `fetch(url, { signal })` 支持 AbortController 取消。
- [x] B. `Promise.race` 做超时不会自动取消输掉的 fetch。
- [x] C. `AbortSignal.timeout(3000)` 可表达超时取消。
- [x] D. `AbortSignal.any([...])` 可组合用户取消、超时等多个信号。
- [ ] E. 客户端 abort 一定会让服务端停止处理请求。

**解释**：取消是协作式的。客户端不再等待结果，不保证服务端业务已经停止。

### Q3 multiple | React 中的 abort

React effect 中使用 AbortController，哪些处理是合理的？

- [x] A. 每次 effect 创建新的 controller。
- [x] B. cleanup 中调用 `controller.abort()`。
- [x] C. catch 中区分 `AbortError`，避免把主动取消当异常提示。
- [ ] D. 所有依赖变化时都复用同一个已 abort 的 signal。
- [ ] E. 不需要 cleanup，因为 React 会自动取消 fetch。

**解释**：依赖变化和组件卸载时取消旧请求，可以减少过期响应和无意义网络成本。

## js-048

### Q1 single | 并发控制任务形态

手写并发控制器时，为什么任务通常要传函数 `() => fetch(...)`，而不是直接传已经创建的 Promise？

- [ ] A. Promise 不能被数组保存。
- [x] B. Promise 一创建就可能已经开始执行，控制器无法限制启动时机。
- [ ] C. 函数一定比 Promise 更快。
- [ ] D. 只有函数才能被 `await`。

**解释**：并发限制控制的是“何时启动任务”。已经开始的 Promise 只能等待，不能被调度器延后启动。

### Q2 multiple | 调度器核心

一个可靠的 Promise 并发调度器需要考虑哪些点？

- [x] A. `running` 记录当前并发数。
- [x] B. 任务完成后从队列补充新任务。
- [x] C. 返回的 Promise 要透传每个任务的成功或失败。
- [x] D. 用 `Promise.resolve().then(task)` 捕获同步抛错。
- [ ] E. 同时启动所有任务，然后只等待前 N 个结果。

**解释**：并发控制是队列调度，不是结果筛选。任务要按 limit 启动，并在完成时补位。

### Q3 multiple | pMap 结果顺序

实现 `pMap(items, mapper, limit)` 时，哪些说法正确？

- [x] A. 结果数组通常应按输入顺序保存，而不是完成顺序。
- [x] B. `nextIndex` 可用于分配下一个待启动任务。
- [x] C. 任何任务失败后，可按 fail-fast 策略 reject 外层 Promise。
- [ ] D. 并发限制只能用于请求，不能用于文件处理或计算任务。
- [ ] E. `limit` 可以是 0，这样表示无限并发。

**解释**：并发控制常用于请求、文件、计算等各种异步任务。limit 应为正整数。

## js-049

### Q1 single | BigInt 混合运算

下面代码会发生什么？

```js
42n + 1
```

- [ ] A. 得到 `43n`。
- [ ] B. 得到 `43`。
- [x] C. 抛出 `TypeError`，BigInt 和 Number 不能混合算术运算。
- [ ] D. 得到字符串 `'421'`。

**解释**：BigInt 和 Number 算术运算不能混用，要显式转换。过大 BigInt 转 Number 可能丢精度。

### Q2 multiple | BigInt 规则

关于 BigInt，哪些说法正确？

- [x] A. `typeof 42n === 'bigint'`。
- [x] B. `5n / 2n` 得到 `2n`，整数除法截断小数部分。
- [x] C. `42n == 42` 为 true，但 `42n === 42` 为 false。
- [ ] D. `Math.sqrt(4n)` 可以直接得到 `2n`。
- [ ] E. BigInt 适合直接表示小数金额。

**解释**：BigInt 只表示整数，不走 Math 的 Number API。金额小数通常用最小货币单位整数或 decimal 库。

### Q3 multiple | BigInt 工程边界

哪些 BigInt 工程实践合理？

- [x] A. 超大 ID 前后端传输时常用字符串，避免 JSON 解析丢精度。
- [x] B. `JSON.stringify({ id: 42n })` 会抛错，需要 replacer 或接口层转换。
- [x] C. BigInt 可用于超过安全整数范围的整数算法或 WASM i64 互操作。
- [ ] D. 随意修改 `BigInt.prototype.toJSON` 是最推荐做法。
- [ ] E. BigInt 运算天然恒定时间，适合直接写高安全密码学。

**解释**：BigInt 解决整数精度，不解决 JSON、decimal 和密码学常数时间等问题。

## js-050

### Q1 single | WeakRef.deref

`WeakRef.prototype.deref()` 返回什么？

- [ ] A. 永远返回原对象。
- [x] B. 返回目标对象或 `undefined`，取决于对象是否仍存活。
- [ ] C. 返回目标对象的深拷贝。
- [ ] D. 返回对象被回收的准确时间。

**解释**：弱引用不阻止 GC。读取到对象后应放入局部变量并在当前同步片段内使用。

### Q2 multiple | FinalizationRegistry 边界

关于 `FinalizationRegistry`，哪些说法正确？

- [x] A. 回调执行时机不可预测。
- [x] B. 回调不保证一定执行。
- [x] C. `heldValue` 不应引用 target 本身，否则可能让 target 继续可达。
- [ ] D. 它适合关闭文件、连接、锁等必须可靠释放的资源。
- [ ] E. 它可以替代所有显式 cleanup。

**解释**：FinalizationRegistry 只能做兜底辅助，不能承担核心业务流程或可靠资源释放。

### Q3 multiple | WeakRef 适用场景

哪些场景可能适合 WeakRef/FinalizationRegistry？

- [x] A. 内存敏感、可丢弃的缓存。
- [x] B. 框架或底层库做对象元数据的辅助清理。
- [x] C. 弱关联优化，配合显式生命周期作为兜底。
- [ ] D. 支付成功后的业务确认流程。
- [ ] E. 必须在固定时间点执行的资源释放。

**解释**：可靠释放应使用 `close/dispose/AbortController/cleanup` 等显式生命周期。弱引用只适合非关键辅助。

## js-051

### Q1 single | Date 的月份

下面代码表示哪一天？

```js
new Date(2024, 0, 1)
```

- [x] A. 2024 年 1 月 1 日。
- [ ] B. 2024 年 0 月 1 日，非法日期。
- [ ] C. 2024 年 12 月 1 日。
- [ ] D. 2024 年 2 月 1 日。

**解释**：`Date` 构造函数的月份从 0 开始，这是 Date API 的典型坑之一。

### Q2 multiple | Date 痛点

哪些是 JavaScript `Date` 的常见痛点？

- [x] A. 对象可变，`setMonth` 等方法会原地修改。
- [x] B. 字符串解析容易踩时区和兼容性坑。
- [x] C. 同一个类型混合表示时间点、本地日期、时区展示等语义。
- [x] D. 日期加减、DST 和时区转换不直观。
- [ ] E. `Date` 内部不存储时间戳。

**解释**：Date 本质存储 Unix epoch 毫秒，但许多 API 按本地时区解释，语义容易混乱。

### Q3 multiple | Temporal 类型选择

关于 Temporal，哪些选择合理？

- [x] A. 精确时间点使用 `Temporal.Instant`。
- [x] B. 生日、日程日期这类纯日期使用 `Temporal.PlainDate`。
- [x] C. 带 IANA 时区和 DST 规则的业务时间使用 `Temporal.ZonedDateTime`。
- [ ] D. 所有日期时间都应该只用 `PlainDateTime`，不需要区分时区。
- [ ] E. Temporal 对象和 Date 一样以原地修改为主要 API。

**解释**：Temporal 的核心价值是不可变和强语义。实际工程还要检查运行时支持或使用 polyfill。

## js-052

### Q1 single | 命名捕获组

下面正则中，如何读取年份？

```js
const re = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/
const match = re.exec('2024-01-15')
```

- [ ] A. `match.year`
- [x] B. `match.groups.year`
- [ ] C. `match[year]`
- [ ] D. `re.groups.year`

**解释**：命名捕获组结果在 `match.groups` 上；替换字符串里可用 `$<year>` 引用。

### Q2 multiple | 环视

关于正则环视，哪些说法正确？

- [x] A. `(?=...)` 是正向前瞻。
- [x] B. `(?!...)` 是负向前瞻。
- [x] C. `(?<=...)` 是正向后顾，旧环境兼容性要确认。
- [x] D. 环视只做条件判断，不消耗字符。
- [ ] E. 环视会把匹配到的内容从字符串中删除。

**解释**：Lookaround 是零宽断言，只判断当前位置前后是否满足条件，不消费字符。

### Q3 multiple | 正则安全与 API

哪些正则实践是合理的？

- [x] A. 动态拼接用户输入到正则前要转义，例如使用 `RegExp.escape` 或可靠 polyfill。
- [x] B. 全量遍历并保留捕获组信息时可以用 `matchAll`。
- [x] C. 避免嵌套贪婪量词导致灾难性回溯。
- [ ] D. URL、HTML、JSON 等复杂结构都应该优先用一个巨大正则解析。
- [ ] E. ReDoS 只会发生在服务端，前端不用关心输入长度。

**解释**：正则适合局部模式匹配。复杂格式优先专用解析器，对不可信输入要考虑长度和回溯风险。

## js-053

### Q1 single | 异步迭代器 next

异步迭代器的 `next()` 返回什么？

- [ ] A. 直接返回 `{ value, done }`。
- [x] B. 返回 Promise，fulfilled 后得到 `{ value, done }`。
- [ ] C. 永远返回数组。
- [ ] D. 只能返回字符串。

**解释**：异步迭代协议把每次取值变成异步过程，适合流、分页和消息队列。

### Q2 multiple | for await...of

关于 `for await...of`，哪些说法正确？

- [x] A. 它会依次等待每次 `next()` 返回的 Promise。
- [x] B. 循环中 `break` 或抛错时，会尝试调用迭代器的 `return()` 清理。
- [x] C. `async function*` 可以同时使用 `await` 和 `yield`。
- [ ] D. 它会把所有异步任务一次性并行执行。
- [ ] E. 它只适用于数组，不能用于流式数据。

**解释**：`for await...of` 是顺序消费异步数据流。并行等待一组已知任务更适合 `Promise.all`。

### Q3 multiple | 异步迭代场景

哪些场景适合异步迭代器？

- [x] A. 分页 API 一页页拉取和处理。
- [x] B. fetch stream 或日志流边读边处理。
- [x] C. 异步队列中生产者不断 push，消费者持续消费。
- [ ] D. 三个已知请求必须并行等待全部完成。
- [ ] E. 同步计算数组总和。

**解释**：异步迭代器适合数量未知、逐步到达、可边读边处理的数据。固定并行任务用 Promise 聚合更直接。

## js-054

### Q1 single | typeof null

`typeof null` 的结果是什么？

- [ ] A. `'null'`
- [x] B. `'object'`
- [ ] C. `'undefined'`
- [ ] D. `'function'`

**解释**：这是历史遗留行为。判断 null 要直接用 `value === null`，不要依赖 typeof。

### Q2 multiple | instanceof 局限

关于 `instanceof`，哪些说法正确？

- [x] A. 它通常沿对象原型链查找右侧构造函数的 `prototype`。
- [x] B. 右侧可通过 `Symbol.hasInstance` 自定义判断逻辑。
- [x] C. 跨 iframe/realm 时，数组的 `instanceof Array` 可能失败。
- [ ] D. 它可以准确判断所有原始类型。
- [ ] E. 它比较的是对象是否有同名字符串属性。

**解释**：`instanceof` 是原型链/品牌逻辑，受 realm 和 `Symbol.hasInstance` 影响。数组判断优先用 `Array.isArray`。

### Q3 multiple | 类型判断实践

哪些类型判断实践合理？

- [x] A. 原始类型多用 `typeof`，但 null 单独判断。
- [x] B. 数组用 `Array.isArray()`。
- [x] C. `Object.prototype.toString.call` 可判断许多内置对象，但会受 `Symbol.toStringTag` 影响。
- [x] D. 业务类型优先用显式字段、品牌标记或 TypeScript 类型系统。
- [ ] E. `typeof` 能区分数组、Date、Map 和普通对象。

**解释**：运行时类型判断没有一个万能 API。选择方式要看目标类型和跨 realm 等边界。

## js-055

### Q1 single | receiver

`Reflect.get(obj, 'name', receiver)` 中 `receiver` 主要影响什么？

- [ ] A. 决定属性是否可枚举。
- [x] B. 当属性是 getter 时，getter 内部的 `this`。
- [ ] C. 决定对象是否可扩展。
- [ ] D. 让读取操作变成异步。

**解释**：`receiver` 用于 getter/setter 的 this 绑定，也是在 Proxy 转发中保持语义的重要参数。

### Q2 multiple | Reflect 方法

哪些 Reflect API 与操作符或对象内部操作对应？

- [x] A. `Reflect.has(obj, key)` 对应 `key in obj`。
- [x] B. `Reflect.deleteProperty(obj, key)` 对应 `delete obj[key]`。
- [x] C. `Reflect.apply(fn, thisArg, args)` 对应函数调用。
- [x] D. `Reflect.construct(Constructor, args)` 对应构造调用。
- [ ] E. `Reflect.ownKeys(obj)` 只返回可枚举字符串 key。

**解释**：`Reflect.ownKeys` 返回所有自有 key，包括不可枚举 key 和 Symbol key。

### Q3 multiple | Proxy 中使用 Reflect

为什么 Proxy trap 中常用 Reflect 转发？

- [x] A. 可以保留默认语言语义，减少手写错误。
- [x] B. 能正确处理 getter/setter、原型链和 receiver。
- [x] C. `Reflect.set` 等返回 boolean，符合 trap 返回值约束。
- [ ] D. Reflect 会自动取消所有代理开销。
- [ ] E. Reflect 会把所有对象变成深冻结。

**解释**：Reflect 是元编程中的默认操作工具，不是性能或不可变魔法。

## js-056

### Q1 single | replaceAll 正则

`str.replaceAll(/o/, '0')` 会有什么问题？

- [ ] A. 正常替换全部 `o`。
- [x] B. 传正则给 `replaceAll` 时必须带 `g` flag，否则会抛错。
- [ ] C. `replaceAll` 只能接收数字。
- [ ] D. `replaceAll` 会修改原字符串。

**解释**：字符串是不可变值，替换返回新字符串。`replaceAll` 的正则参数必须是全局正则。

### Q2 multiple | 字符串 Unicode

关于字符串和 Unicode，哪些说法正确？

- [x] A. 很多索引和长度操作基于 UTF-16 code unit。
- [x] B. `'😀'.length` 为 2。
- [x] C. `[...'😀']` 能按 code point 展开成一个元素。
- [ ] D. `str[0]` 总能得到用户看到的完整字符。
- [ ] E. `split('')` 适合所有 emoji 和组合字符处理。

**解释**：复杂 emoji、组合音标和多语言分词要用更专业 API，如 `Intl.Segmenter`。

### Q3 multiple | 字符串方法选择

哪些说法合理？

- [x] A. `slice` 支持负数，通常比 `substring` 更直观。
- [x] B. `at(-1)` 可以取最后一个 code unit 位置的字符。
- [x] C. 本地化排序或比较可用 `localeCompare`。
- [x] D. 标签模板可用于 i18n、SQL builder、CSS-in-JS 或 HTML 转义。
- [ ] E. `indexOf` 返回 boolean。

**解释**：`indexOf` 返回索引或 -1，`includes` 返回 boolean。字符串 API 要注意返回值和 Unicode 边界。

## js-057

### Q1 single | IIFE 括号作用

为什么经典 IIFE 常写成 `(function () { ... })()`？

- [ ] A. 为了让函数变成箭头函数。
- [x] B. 外层括号把函数声明位置变成函数表达式，随后才能立即调用。
- [ ] C. 为了让函数异步执行。
- [ ] D. 为了让函数自动绑定 `this`。

**解释**：`function` 在语句开头会被解析为声明。IIFE 需要先成为表达式，再调用。

### Q2 multiple | IIFE 用途

IIFE 常见用途有哪些？

- [x] A. ES5 时代创建独立作用域，避免全局污染。
- [x] B. 模块模式中用闭包保存私有状态。
- [x] C. 修复 `var` 循环闭包问题。
- [x] D. 用 async IIFE 在没有顶层 await 的脚本中使用 await。
- [ ] E. 让所有变量自动变成块级作用域。

**解释**：现代 ES Module 和 `let/const` 替代了许多历史用途，但 IIFE 在老代码和临时异步入口中仍常见。

### Q3 single | ES5 循环闭包

下面哪种现代写法最直接替代 IIFE 修复循环变量问题？

- [ ] A. 把 `var i` 改成全局变量。
- [x] B. 在循环中使用 `let i`。
- [ ] C. 把 `setTimeout` 改成 `setInterval`。
- [ ] D. 删除闭包。

**解释**：`let` 在每次循环迭代创建新的词法绑定，回调能捕获对应的 i。

## js-058

### Q1 single | 解构默认值

下面代码中 `a` 和 `b` 分别是什么？

```js
const { a = 1 } = { a: undefined }
const { b = 1 } = { b: null }
```

- [ ] A. `undefined`、`1`
- [x] B. `1`、`null`
- [ ] C. `1`、`1`
- [ ] D. `undefined`、`null`

**解释**：解构默认值只在属性值为 `undefined` 时生效，`null` 不会触发默认值。

### Q2 multiple | 解构边界

关于解构赋值，哪些说法正确？

- [x] A. 数组解构依赖可迭代协议，不只适用于数组。
- [x] B. 对象解构按属性名匹配，不受属性顺序影响。
- [x] C. 嵌套解构要防空，例如 `address: { city } = {}`。
- [x] D. 解构赋值给已声明变量时，对象解构要加括号：`({ a } = obj)`。
- [ ] E. 对象 rest 会收集原型链上的所有属性。

**解释**：对象 rest 只收集剩余自有可枚举属性。解构过深时应考虑可读性和空值保护。

### Q3 single | 交换变量

用解构交换两个变量的正确写法是？

- [x] A. `[a, b] = [b, a]`
- [ ] B. `{ a, b } = { b, a }`
- [ ] C. `a, b = b, a`
- [ ] D. `[a, b] == [b, a]`

**解释**：数组解构按迭代顺序赋值，适合简单交换。对象赋值给已声明变量时还要注意括号。

## js-059

### Q1 single | 数值转换

下面代码结果是什么？

```js
Number(null)
Number(undefined)
```

- [x] A. `0`、`NaN`
- [ ] B. `NaN`、`0`
- [ ] C. `0`、`0`
- [ ] D. `NaN`、`NaN`

**解释**：`null` 数值转换为 0，`undefined` 转为 NaN。这也是隐式转换题里常见差异。

### Q2 multiple | null 与 undefined

关于 `null` 和 `undefined`，哪些说法正确？

- [x] A. `undefined` 常表示未赋值或取不到值。
- [x] B. `null` 常表示开发者有意设置的空值。
- [x] C. `null == undefined` 为 true，但 `null === undefined` 为 false。
- [x] D. DOM 查询找不到节点常返回 `null`。
- [ ] E. `typeof null === 'null'`。

**解释**：`typeof null` 是 `'object'`。API 设计应统一空值策略，避免同一字段混用多种缺失表达。

### Q3 multiple | 默认值处理

哪些默认值判断正确？

- [x] A. `null ?? 'default'` 得到 `'default'`。
- [x] B. `undefined ?? 'default'` 得到 `'default'`。
- [x] C. 解构默认值只在值为 `undefined` 时触发。
- [ ] D. `{ x = 1 } = { x: null }` 会让 x 等于 1。
- [ ] E. 判断 null 和 undefined 永远不能用 `value == null`。

**解释**：`value == null` 是少数有意识使用 `==` 的场景，可同时匹配 `null` 和 `undefined`。

## js-060

### Q1 single | Mixin 适用语义

Mixin 更适合表达哪类关系？

- [ ] A. 严格的 `is-a` 父子继承关系。
- [x] B. 横向可复用的 “can-do” 能力，例如 serializable、logging。
- [ ] C. 所有业务实体都必须继承同一个基类。
- [ ] D. 数据库表之间的外键关系。

**解释**：Mixin 是组合能力，不是严格分类继承。复杂业务通常更适合显式组合和依赖注入。

### Q2 multiple | Object.assign Mixin

用 `Object.assign(User.prototype, Serializable, Validatable)` 混入能力时，哪些风险存在？

- [x] A. 只复制可枚举属性。
- [x] B. 不复制完整属性描述符。
- [x] C. 可能覆盖已有同名方法。
- [ ] D. 会自动解决所有命名冲突。
- [ ] E. 会复制私有字段。

**解释**：简单 Mixin 直接但粗糙。需要保留 getter/setter、Symbol 或不可枚举属性时，应复制属性描述符。

### Q3 multiple | Mixin 风险

Mixin 模式有哪些常见风险？

- [x] A. 多个 mixin 定义同名方法时覆盖顺序敏感。
- [x] B. mixin 方法可能隐式依赖实例上存在某些字段。
- [x] C. 函数式 mixin 可能让继承层级和调试栈变复杂。
- [x] D. TypeScript 中可能需要额外类型辅助。
- [ ] E. Mixin 能保证所有组合都没有菱形问题。

**解释**：Mixin 能复用横向能力，但容易引入隐式依赖和命名冲突。规模变大时优先显式组合。

## js-061

### Q1 single | Fibonacci 重复计算

朴素递归 `fib(n) = fib(n - 1) + fib(n - 2)` 的主要性能问题是什么？

- [ ] A. 它不能返回数字。
- [x] B. 大量重复计算子问题，时间复杂度呈指数级增长。
- [ ] C. 它不会产生调用栈。
- [ ] D. 它只能在浏览器中运行。

**解释**：朴素 Fibonacci 会反复计算相同子问题。记忆化或动态规划可以把时间复杂度降到 O(n)。

### Q2 multiple | 递归优化手段

哪些手段可以优化递归问题？

- [x] A. 记忆化缓存已计算子问题。
- [x] B. 改写为 bottom-up 动态规划。
- [x] C. 使用迭代或显式栈避免调用栈过深。
- [x] D. 用蹦床函数模拟尾调用。
- [ ] E. 依赖主流 JS 引擎一定会自动做尾调用优化。

**解释**：JS 工程中不要依赖自动 TCO。深递归要显式控制栈，重复子问题要缓存或改 DP。

### Q3 multiple | memoize 边界

手写 `memoize(fn, keyFn)` 时，哪些细节值得注意？

- [x] A. 缓存 key 的生成要符合参数类型和业务唯一性。
- [x] B. `JSON.stringify(args)` 简单但有成本，也不适合所有参数类型。
- [x] C. 需要保留调用时的 `this`，可用 `fn.apply(this, args)`。
- [ ] D. 使用 Map 缓存后永远不会有内存增长风险。
- [ ] E. 记忆化可以解决所有栈溢出问题。

**解释**：记忆化解决重复计算，不解决递归层级过深。缓存还要考虑 key、容量和生命周期。

## js-062

### Q1 single | 纯函数

下面哪个函数更符合纯函数？

- [x] A. `const add = (a, b) => a + b`
- [ ] B. `const now = () => Date.now()`
- [ ] C. `const inc = () => { count += 1; return count }`
- [ ] D. `const save = (x) => localStorage.setItem('x', x)`

**解释**：纯函数相同输入得到相同输出，且没有可观察副作用。时间、外部状态和 IO 都会破坏纯度。

### Q2 multiple | 函数式实践

哪些属于函数式编程常见思想？

- [x] A. 不可变更新，避免原地修改已有数据。
- [x] B. 高阶函数，接收函数或返回函数。
- [x] C. 函数组合，把多个小转换串起来。
- [x] D. 把网络、日志、DOM 等副作用隔离在边界。
- [ ] E. 禁止程序中出现任何副作用。

**解释**：函数式不是没有副作用，而是让核心逻辑尽量纯，把副作用集中在边界。

### Q3 multiple | 工程取舍

关于函数式风格，哪些判断合理？

- [x] A. 纯函数更容易测试、缓存、并行和组合。
- [x] B. 过度链式调用可能降低可读性。
- [x] C. 频繁复制大对象可能带来性能成本。
- [ ] D. 函数式代码一定比命令式代码快。
- [ ] E. 不可变性意味着永远不能创建新数据。

**解释**：不可变性是不修改已有数据，而是返回新数据。工程上要在可读性、性能和可测试性之间取舍。

## js-063

### Q1 single | 浮点精度

下面表达式为什么是 `false`？

```js
0.1 + 0.2 === 0.3
```

- [ ] A. JavaScript 不支持小数。
- [x] B. 很多十进制小数无法用二进制浮点有限表示，计算会产生误差。
- [ ] C. `===` 不能比较 number。
- [ ] D. `0.3` 会被解析成字符串。

**解释**：Number 使用 IEEE 754 双精度浮点数。小数运算需要误差比较或十进制库。

### Q2 multiple | Number 特殊值

哪些说法正确？

- [x] A. `NaN === NaN` 为 false。
- [x] B. `Number.isNaN(NaN)` 为 true。
- [x] C. `Number.MAX_SAFE_INTEGER` 是 `2^53 - 1`。
- [x] D. `Number.isSafeInteger(9007199254740992)` 为 false。
- [ ] E. `isNaN('hello')` 和 `Number.isNaN('hello')` 都为 true。

**解释**：全局 `isNaN` 会先做类型转换，`Number.isNaN` 不会。安全整数范围由双精度有效位决定。

### Q3 multiple | 金额与精度

哪些处理金额或高精度数值的方式更合理？

- [x] A. 金额存储和计算优先用最小货币单位整数。
- [x] B. 展示层可用 `toFixed`，但它返回字符串，不是底层精确计算方案。
- [x] C. 财务、计费等十进制精确场景使用 decimal.js、big.js 等库。
- [ ] D. 直接用浮点数做所有金额运算，不需要测试。
- [ ] E. BigInt 能直接解决小数精度问题。

**解释**：BigInt 只解决大整数，不解决小数。金额通常用整数单位或十进制库。

## js-064

### Q1 single | JS 原生重载

下面代码中，实际生效的是哪个 `fn`？

```js
function fn(x) {
  return x
}

function fn(x, y) {
  return x + y
}
```

- [ ] A. 两个都会根据参数数量自动分发。
- [x] B. 后面的函数声明覆盖前面的声明。
- [ ] C. 第一个永远生效。
- [ ] D. 运行前语法错误。

**解释**：JavaScript 运行时没有原生函数重载。要重载只能在一个实现函数里按参数数量、类型或结构分发。

### Q2 multiple | 模拟重载策略

哪些方式可以模拟函数重载？

- [x] A. 根据 `arguments.length` 或参数数量分支。
- [x] B. 根据 `typeof`、`Array.isArray` 等参数类型分支。
- [x] C. 使用选项对象，减少重载分支。
- [x] D. 用 Map 分发表按 kind 派发 handler。
- [ ] E. 在同一作用域写多个同名函数，运行时自动保留全部签名。

**解释**：模拟重载的本质是手动分发。参数越来越多时，选项对象通常更可维护。

### Q3 multiple | TypeScript 重载

关于 TypeScript 重载，哪些说法正确？

- [x] A. 重载签名主要存在于类型层面。
- [x] B. 运行时仍然只有一个实现函数。
- [x] C. 实现函数内部必须自己做类型判断。
- [ ] D. TypeScript 会为每个重载签名生成一个独立 JS 函数。
- [ ] E. 使用 TypeScript 重载后无需处理非法参数。

**解释**：TS 能帮助调用方类型检查，但运行时安全仍靠实现函数的分支和错误处理。

## js-065

### Q1 single | SharedArrayBuffer 传给 Worker

把 `SharedArrayBuffer` 传给 Worker 时，发生什么？

- [ ] A. 像 ArrayBuffer transfer 一样转移所有权，主线程无法再访问。
- [x] B. 主线程和 Worker 看到同一块共享内存。
- [ ] C. 自动深拷贝一份给 Worker。
- [ ] D. 浏览器会把它转换成 JSON。

**解释**：SharedArrayBuffer 是共享内存，不是复制也不是转移所有权。多线程读写要用 Atomics 协调。

### Q2 multiple | Atomics API

哪些属于 Atomics 提供的能力？

- [x] A. `Atomics.load/store` 原子读写。
- [x] B. `Atomics.add/sub` 原子读改写。
- [x] C. `Atomics.compareExchange` CAS。
- [x] D. `Atomics.wait/notify` 线程等待和唤醒。
- [ ] E. 自动把所有竞态变成无锁安全代码。

**解释**：Atomics 提供底层原子操作和同步原语，但锁、死锁、公平性和异常释放仍要自己设计。

### Q3 multiple | SharedArrayBuffer 边界

关于 SharedArrayBuffer/Atomics，哪些说法正确？

- [x] A. 浏览器中使用 SharedArrayBuffer 通常需要 COOP/COEP 等跨源隔离。
- [x] B. `Atomics.wait` 会阻塞当前线程，浏览器主线程不能使用。
- [x] C. 多数 Atomics 操作要求整数 TypedArray。
- [x] D. 普通前端任务优先用消息传递或 Transferable，避免过早共享内存。
- [ ] E. 共享内存编程比消息传递更简单，适合所有业务交互。

**解释**：共享内存复杂且风险高，适合高性能计算等少数场景。普通业务用消息模型更稳。
