# JS基础

<!-- id: js-001; difficulty: 1; tags: 变量声明, 作用域, ES6; source: 高频 -->
# var、let、const 的区别是什么？

## `var`、`let`、`const` 的区别

### 1. 作用域
- `var`：函数作用域，没有块级作用域。
- `let`/`const`：块级作用域，适合 `if`、`for`、`try` 等代码块内声明。

```js
if (true) {
  var a = 1;
  let b = 2;
}

console.log(a); // 1
console.log(b); // ReferenceError
```

### 2. 提升和暂时性死区
`var` 会提升并初始化为 `undefined`；`let`/`const` 也会创建绑定，但在声明执行前处于 TDZ（Temporal Dead Zone），访问会抛 `ReferenceError`，不能简单说它们完全不提升。

```js
console.log(x); // undefined
var x = 1;

console.log(y); // ReferenceError
let y = 2;
```

### 3. 重复声明
```js
var n = 1;
var n = 2; // 允许

let m = 1;
let m = 2; // SyntaxError
```

同一作用域内 `let`、`const` 不允许重复声明，也不能和已有 `var` 声明冲突。

### 4. `const` 的含义
`const` 声明时必须初始化，之后不能重新赋值。它保证的是绑定不可重新指向，不保证引用值深度不可变。

```js
const obj = { count: 1 };
obj.count = 2; // 可以，修改的是对象内容
obj = {};      // TypeError，重新赋值不允许
```

如果需要对象也不可变，要用 `Object.freeze()` 或不可变数据方案。

### 5. 全局声明
在浏览器脚本中，顶层 `var` 会成为 `window` 的属性；顶层 `let`/`const` 会进入全局词法环境，但不会挂到 `window`。在 ES Module 中，顶层声明是模块作用域，不会变成全局属性。

### 最佳实践
默认用 `const`；确实需要重新赋值时用 `let`；避免 `var`，除非维护旧代码或有明确兼容原因。

<!-- id: js-002; difficulty: 1; tags: 闭包, 作用域, 内存; source: 高频 -->
# 什么是闭包？闭包的应用场景有哪些？

## 闭包（Closure）

### 定义
闭包是函数和它声明时的词法环境的组合。一个函数即使在外层函数执行结束后，仍然可以访问声明时作用域中的变量。

```js
function createCounter() {
  let count = 0;

  return function increase() {
    count += 1;
    return count;
  };
}

const counter = createCounter();
console.log(counter()); // 1
console.log(counter()); // 2
```

`createCounter()` 执行完后，`count` 没有立刻消失，因为返回的 `increase` 仍然引用着它。

### 形成条件
1. 函数在某个词法作用域中创建。
2. 函数引用了该作用域中的变量。
3. 这个函数在作用域外仍然可达，例如被返回、作为回调保存、放入对象中。

### 常见应用
#### 1. 数据私有化
```js
function createStore(initialValue) {
  let value = initialValue;

  return {
    get() {
      return value;
    },
    set(next) {
      value = next;
    },
  };
}
```

外部不能直接访问 `value`，只能通过暴露的方法读写。

#### 2. 函数工厂和参数预置
```js
const multiply = (factor) => (value) => factor * value;
const double = multiply(2);

console.log(double(5)); // 10
```

#### 3. 防抖、节流、缓存
```js
function once(fn) {
  let called = false;
  let result;

  return (...args) => {
    if (!called) {
      called = true;
      result = fn(...args);
    }
    return result;
  };
}
```

#### 4. 保存循环变量
```js
for (let i = 0; i < 3; i += 1) {
  setTimeout(() => console.log(i), 0); // 0 1 2
}
```

`let` 在每次循环迭代中创建新的词法绑定，所以回调能拿到各自的 `i`。

### 注意事项
闭包本身不是内存泄漏。只有当闭包长期可达，并且引用了本不再需要的大对象、DOM 节点或缓存时，才可能造成泄漏。不再需要的监听器、定时器、缓存引用要及时清理。

<!-- id: js-003; difficulty: 1; tags: 原型链, 继承, OOP; source: 高频 -->
# 解释 JavaScript 中的原型链

## JavaScript 原型链

### 基本概念
对象有一个内部槽 `[[Prototype]]`，指向另一个对象或 `null`。访问属性时，JavaScript 会先查找对象自身属性；如果没有，就沿着 `[[Prototype]]` 一层层向上查找，这条链就是原型链。

```js
function Person(name) {
  this.name = name;
}

Person.prototype.sayHello = function sayHello() {
  return `Hello, ${this.name}`;
};

const alice = new Person('Alice');

console.log(alice.sayHello()); // Hello, Alice
console.log(Object.getPrototypeOf(alice) === Person.prototype); // true
console.log(Object.getPrototypeOf(Person.prototype) === Object.prototype); // true
console.log(Object.getPrototypeOf(Object.prototype)); // null
```

`__proto__` 是历史访问器，面试中可以认识它，但工程代码优先用 `Object.getPrototypeOf()` 和 `Object.setPrototypeOf()`。

### 构造函数和 prototype
```js
console.log(Person.prototype.constructor === Person); // true
console.log(alice instanceof Person); // true
```

构造函数的 `prototype` 属性会成为 `new Person()` 创建对象的原型。`prototype.constructor` 默认指回构造函数，但如果手动整体替换 `prototype`，需要注意修复 `constructor`。

### 属性查找顺序
1. 对象自身属性。
2. 对象的原型。
3. 原型的原型，持续向上。
4. 到 `null` 停止，找不到则返回 `undefined`。

```js
console.log(Object.hasOwn(alice, 'name')); // true
console.log(Object.hasOwn(alice, 'sayHello')); // false
console.log('sayHello' in alice); // true，会查原型链
```

### 原型继承
```js
const parent = {
  greet() {
    return 'hi';
  },
};

const child = Object.create(parent);
child.name = 'child';

console.log(child.greet()); // hi
```

ES6 `class` 本质上仍然建立在原型机制上，只是语法更清晰。

### 注意点
1. 原型链过长会增加属性查找成本，但普通业务中通常不是瓶颈。
2. 修改内置原型例如 `Array.prototype` 风险很高，容易影响全局行为。
3. 字典对象可用 `Object.create(null)` 避免继承 `Object.prototype` 上的属性。

<!-- id: js-004; difficulty: 1; tags: this, 绑定, 箭头函数; source: 高频 -->
# JavaScript 中 this 的指向规则是什么？

## `this` 的指向规则

`this` 不是函数定义时固定的值，普通函数的 `this` 由调用方式决定；箭头函数没有自己的 `this`，从外层词法作用域捕获。

### 1. 默认绑定
```js
function showThis() {
  return this;
}

showThis();
```

普通 script 非严格模式下，默认绑定通常是全局对象；严格模式和 ES Module 顶层语义下，独立调用的 `this` 是 `undefined`。因此现代代码不要依赖默认绑定。

### 2. 隐式绑定
```js
const user = {
  name: 'Alice',
  say() {
    return this.name;
  },
};

console.log(user.say()); // Alice

const fn = user.say;
console.log(fn()); // this 丢失，严格模式下通常报错或得到 undefined
```

谁在调用点左侧，`this` 就指向谁。把方法赋值给变量后再调用，会丢失隐式绑定。

### 3. 显式绑定
```js
function greet(prefix) {
  return `${prefix}, ${this.name}`;
}

console.log(greet.call({ name: 'A' }, 'Hi'));
console.log(greet.apply({ name: 'B' }, ['Hi']));

const bound = greet.bind({ name: 'C' }, 'Hello');
console.log(bound());
```

`call`/`apply` 立即调用，`bind` 返回绑定后的新函数。

### 4. `new` 绑定
```js
function Person(name) {
  this.name = name;
}

const p = new Person('Dave');
console.log(p.name); // Dave
```

`new` 会创建新对象，把新对象的原型指向构造函数的 `prototype`，并让构造函数内部的 `this` 指向这个新对象。如果构造函数显式返回对象，则返回该对象；返回原始值会被忽略。

### 5. 箭头函数
```js
const obj = {
  name: 'obj',
  bad: () => this.name,
  good() {
    const inner = () => this.name;
    return inner();
  },
};
```

箭头函数的 `this` 来自定义时外层作用域，不能被 `call`、`apply`、`bind` 改变，也不能作为构造函数使用。对象方法、原型方法一般不要写成箭头函数；回调里需要保留外层 `this` 时箭头函数很合适。

### 优先级
`new` 绑定 > 显式绑定 > 隐式绑定 > 默认绑定。特殊情况：`new` 调用绑定函数时，`bind` 的 `thisArg` 会被忽略，但预置参数仍然有效。

<!-- id: js-005; difficulty: 1; tags: 类型转换, 相等性, 陷阱; source: 高频 -->
# == 和 === 的区别，以及隐式类型转换规则

## `==` 和 `===` 的区别

### `===`：严格相等
`===` 不做普通类型转换，通常要求类型和值都相同。

```js
1 === '1'; // false
true === 1; // false
null === undefined; // false
NaN === NaN; // false
```

特殊点：`NaN` 不等于自身，`+0 === -0` 为 `true`。如果要区分这些情况，用 `Object.is()`。

```js
Object.is(NaN, NaN); // true
Object.is(+0, -0); // false
```

### `==`：抽象相等
`==` 会按规范做隐式转换，规则复杂，容易出现反直觉结果。

常见规则：
1. `null == undefined` 为 `true`，它们和其他值比较一般为 `false`。
2. 字符串和数字比较时，字符串转数字。
3. 布尔值先转数字，`true -> 1`，`false -> 0`。
4. 对象和原始值比较时，对象先转原始值，通常走 `valueOf()`、`toString()` 或 `Symbol.toPrimitive`。

```js
0 == false; // true
'' == false; // true
'1' == 1; // true
null == undefined; // true
null == 0; // false
[] == false; // true
[1] == 1; // true
{} == '[object Object]'; // true
```

### `[] == ![]` 为什么是 true
```js
![]; // false，因为对象是真值
[] == false;
[] == 0; // false 转成 0
'' == 0; // [] 转原始值为空字符串
0 == 0; // true
```

### 最佳实践
1. 默认使用 `===` 和 `!==`。
2. 判断 `NaN` 用 `Number.isNaN()` 或 `Object.is()`。
3. 需要同时判断 `null` 和 `undefined` 时，可以有意识地写 `value == null`。
4. 不要依赖复杂对象的 `==` 转换，可读性和维护性都差。

<!-- id: js-006; difficulty: 1; tags: 事件循环, 异步, 微任务, 宏任务; source: 高频 -->
# 什么是事件循环（Event Loop）？

## 事件循环（Event Loop）

### 基本概念
JavaScript 执行线程一次只能跑一段 JS。事件循环负责从任务队列中取任务执行，并在合适时机清空微任务、更新渲染，从而让定时器、网络回调、用户事件和 Promise 回调按规则执行。

### 浏览器执行模型
1. 执行一个 task，例如 script、setTimeout 回调、用户事件回调。
2. 当前调用栈清空后，执行 microtask checkpoint，清空所有微任务。
3. 浏览器在合适时机执行样式计算、布局、绘制和渲染更新。
4. 取下一个 task，重复上述流程。

常见 task：`setTimeout`、`setInterval`、DOM 事件、网络回调等。常见 microtask：`Promise.then/catch/finally`、`queueMicrotask`、`MutationObserver`。

### 示例
```js
console.log('1');

setTimeout(() => console.log('2'), 0);

Promise.resolve().then(() => {
  console.log('3');
  queueMicrotask(() => console.log('4'));
});

console.log('5');

// 1 5 3 4 2
```

分析：同步代码先执行，所以输出 `1`、`5`；随后清空微任务队列，输出 `3`，`3` 中追加的微任务 `4` 也会在同一次 checkpoint 中执行；最后才执行定时器 task，输出 `2`。

### 注意点
1. 面试里常说宏任务/微任务，但浏览器规范中更准确的说法是 task queues 和 microtask queue。
2. 渲染不是一个普通宏任务，它发生在事件循环的渲染更新阶段，且浏览器可以按帧率和页面状态决定是否渲染。
3. 微任务会在下一个 task 前被清空，如果递归创建大量微任务，可能饿死渲染和用户事件。
4. Node.js 事件循环分阶段执行，`process.nextTick` 优先级通常高于 Promise microtask，`setImmediate` 和 `setTimeout` 的先后还和调用位置有关。

<!-- id: js-007; difficulty: 1; tags: Promise, 异步, ES6; source: 高频 -->
# Promise 的三种状态及常用方法

## Promise 的状态和常用方法

### 三种状态
- `pending`：初始状态，尚未完成。
- `fulfilled`：已成功完成，并有 fulfillment value。
- `rejected`：已失败，并有 rejection reason。

Promise 一旦从 `pending` 变为 `fulfilled` 或 `rejected`，状态就不可再改变。

注意：`resolved` 不完全等于 `fulfilled`。一个 Promise 可以 resolve 到另一个 Promise，此时它会跟随后者状态，可能仍然 pending。

```js
const inner = new Promise((resolve) => setTimeout(() => resolve('ok'), 100));
const outer = Promise.resolve(inner); // outer 已 resolved，但会等待 inner fulfilled
```

### 实例方法
```js
Promise.resolve(1)
  .then((value) => value + 1)
  .catch((error) => {
    console.error(error);
  })
  .finally(() => {
    console.log('done');
  });
```

`then` 返回一个新的 Promise。回调返回普通值时，新 Promise fulfilled 为该值；回调抛错或返回 rejected Promise 时，新 Promise rejected。

### 静态方法
```js
Promise.resolve('value');
Promise.reject(new Error('failed'));

Promise.all([p1, p2, p3]);
// 全部 fulfilled 才 fulfilled；任意一个 rejected 就立刻 rejected。

Promise.allSettled([p1, p2, p3]);
// 等全部 settled，返回 { status, value/reason } 数组。

Promise.race([p1, p2, p3]);
// 第一个 settled 的结果决定最终状态。

Promise.any([p1, p2, p3]);
// 第一个 fulfilled 即成功；全部 rejected 时抛 AggregateError。
```

### 错误传播
```js
fetch('/api/user')
  .then((res) => {
    if (!res.ok) throw new Error('HTTP error');
    return res.json();
  })
  .then((user) => user.name)
  .catch((error) => {
    console.error(error);
  });
```

链上的错误会沿后续 Promise 传播，直到被 `catch` 或第二个 `then` 参数处理。`finally` 不接收结果，通常用于释放资源或关闭 loading。

<!-- id: js-008; difficulty: 1; tags: async/await, Promise, 异步; source: 高频 -->
# async/await 的原理和使用

## `async` / `await`

### 本质
`async`/`await` 是基于 Promise 的异步语法。它让异步流程写起来像同步代码；历史上 Babel 等工具可以把它转换为 Generator + runner，但原生 `async` 函数不是简单等同于 Generator。

### 基本用法
```js
async function fetchUser(id) {
  const res = await fetch(`/api/users/${id}`);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

fetchUser(1).then((user) => console.log(user));
```

`async` 函数总是返回 Promise：返回普通值会包装成 fulfilled Promise；抛出错误会变成 rejected Promise。

### `await` 做了什么
```js
async function demo() {
  console.log('a');
  const value = await Promise.resolve('b');
  console.log(value);
}

demo();
console.log('c');

// a c b
```

`await` 会暂停当前 async 函数后续执行，把后续逻辑放到微任务中继续；它不会阻塞主线程，也不会阻塞其他任务执行。

### 串行和并行
```js
// 串行：fetchB 依赖 fetchA 时才这样写
const a = await fetchA();
const b = await fetchB(a.id);

// 并行：互不依赖时更快
const [user, orders] = await Promise.all([fetchUser(), fetchOrders()]);
```

不要在循环中无意串行化异步任务。

```js
// 串行
for (const id of ids) {
  await fetchItem(id);
}

// 并行
await Promise.all(ids.map((id) => fetchItem(id)));
```

### 错误处理
```js
async function load() {
  try {
    const data = await fetchUser(1);
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    hideLoading();
  }
}
```

也可以用 `Promise.allSettled()` 收集多个任务的成功和失败，避免一个失败导致全部短路。

### 注意点
1. `await` 只能在 `async` 函数或 ES Module 顶层使用。
2. `return await promise` 通常多余，但在 `try/catch` 中为了捕获错误或保留异步栈有时有意义。
3. `async` 回调传给 `forEach` 不会被外层等待，异步循环优先用 `for...of` 或 `Promise.all`。

<!-- id: js-009; difficulty: 1; tags: 类型系统, typeof, instanceof; source: 高频 -->
# JavaScript 数据类型有哪些？如何判断类型？

## JavaScript 数据类型和类型判断

### 数据类型
原始类型有 7 种：`string`、`number`、`bigint`、`boolean`、`undefined`、`null`、`symbol`。

对象类型统称为 `object`，包括普通对象、数组、函数、日期、正则、Map、Set、WeakMap、WeakSet、Promise 等。函数在 `typeof` 中会返回 `function`，但本质上也是可调用对象。

### `typeof`
```js
typeof 'str'; // string
typeof 42; // number
typeof 42n; // bigint
typeof true; // boolean
typeof undefined; // undefined
typeof Symbol(); // symbol
typeof function fn() {}; // function

typeof {}; // object
typeof []; // object
typeof null; // object，历史遗留问题
```

`typeof` 适合判断原始类型和函数，但不能区分数组、日期、正则等具体对象。

### `instanceof`
```js
[] instanceof Array; // true
[] instanceof Object; // true
new Date() instanceof Date; // true
```

`instanceof` 判断构造函数的 `prototype` 是否出现在对象原型链上。它可能受跨 iframe、手动修改原型、`Symbol.hasInstance` 影响。

### `Object.prototype.toString.call`
```js
const toString = Object.prototype.toString;

toString.call([]); // [object Array]
toString.call(null); // [object Null]
toString.call(undefined); // [object Undefined]
toString.call(/re/); // [object RegExp]
toString.call(new Map()); // [object Map]
```

这是通用性较好的判断方式，但对象可以通过 `Symbol.toStringTag` 改变结果，所以也不是绝对不可伪造。

### 专用 API
```js
Array.isArray([]); // true
Number.isNaN(NaN); // true
Number.isFinite(1); // true
Object.hasOwn({ a: 1 }, 'a'); // true
```

能用专用 API 时优先用专用 API，例如数组判断用 `Array.isArray()`。

### 值传递说明
JavaScript 参数传递都是按值传递。原始值传的是值本身；对象传的是引用值的副本，所以函数内部可以通过这个引用修改对象内容，但不能改变外部变量绑定到另一个对象。不要简单背成“原始类型在栈、引用类型在堆”，这是引擎实现细节，不适合作为语言语义答案。

<!-- id: js-010; difficulty: 1; tags: 垃圾回收, 内存管理, V8; source: 高频 -->
# 说说 JavaScript 的垃圾回收机制

## JavaScript 垃圾回收机制

### 基本原理
JS 引擎自动管理内存。一个对象如果从根集合不可达，就可以被回收。根集合通常包括全局对象、当前调用栈中的局部变量、闭包仍引用的变量、DOM/宿主环境持有的引用等。

### 标记清除
现代 JS 引擎主要基于可达性分析：
1. 从根对象出发标记所有可达对象。
2. 没被标记的对象视为不可达，可以回收。
3. 循环引用只要整体不可达，也能被回收。

```js
function demo() {
  const a = {};
  const b = {};
  a.ref = b;
  b.ref = a;
}

// demo 执行结束后，如果没有外部引用 a/b，这组循环引用仍可被标记清除回收。
```

### 引用计数
引用计数记录对象被引用次数，计数为 0 时回收。它思路简单，但无法处理不可达的循环引用，因此不是现代 JS 主流 GC 的核心方案。

### V8 常见优化思路
1. 分代收集：新生代对象多数生命周期短，频繁快速回收；存活较久的对象晋升到老生代。
2. 增量标记：把长时间标记过程拆成多个小片段，减少一次性暂停。
3. 并行/并发回收：部分 GC 工作放到辅助线程执行，降低主线程停顿。
4. 标记整理/压缩：减少内存碎片，提高后续分配效率。

### 常见内存泄漏
```js
// 1. 意外全局变量，严格模式下会直接报错
function fn() {
  leak = 'global';
}

// 2. 定时器或回调长期持有大对象
const big = new Array(100000).fill({});
const timer = setInterval(() => {
  console.log(big.length);
}, 1000);
clearInterval(timer);

// 3. 事件监听未移除
element.addEventListener('click', handler);
element.removeEventListener('click', handler);

// 4. 缓存无限增长
const cache = new Map();
```

浏览器里还要注意 detached DOM：DOM 节点已经从页面移除，但仍被 JS 变量、闭包、事件监听或缓存引用，导致不能回收。

### 排查方式
用 Chrome DevTools Memory 面板查看 Heap Snapshot、Allocation instrumentation 和 Retainers，重点找持续增长的对象、Detached DOM tree、未清理的监听器、计时器和缓存。

<!-- id: js-011; difficulty: 1; tags: 变量提升, Hoisting, 作用域; source: 高频 -->
# 什么是变量提升（Hoisting）？

## 变量提升（Hoisting）

### 定义
提升是指执行上下文创建阶段会先处理声明，建立变量、函数和词法绑定。它不是源码真的被移动到顶部，而是声明在代码执行前已进入对应作用域的环境记录。

### `var` 提升
```js
console.log(a); // undefined
var a = 5;
console.log(a); // 5
```

可以理解为：`var a` 在函数或全局作用域创建时已存在，并初始化为 `undefined`；赋值语句仍在原位置执行。

### 函数声明提升
```js
hello(); // Hello

function hello() {
  console.log('Hello');
}
```

函数声明会连同函数体一起初始化，所以可以在声明前调用。

### 函数表达式
```js
greet(); // TypeError: greet is not a function

var greet = function () {
  console.log('Hi');
};
```

这里提升的是 `var greet`，初始值是 `undefined`；函数表达式的赋值仍在原位置执行。因此不是“函数表达式完全不提升”，而是变量声明提升、函数值不提升。

### `let` / `const` 和 TDZ
```js
console.log(b); // ReferenceError
let b = 10;
```

`let`/`const` 的绑定也会在作用域创建时建立，但在声明语句执行前处于暂时性死区（TDZ），访问会抛 `ReferenceError`。

### 同名声明
```js
console.log(typeof foo); // function
var foo = 1;
function foo() {}
console.log(foo); // 1
```

同一作用域中，函数声明在创建阶段会初始化为函数；后续执行到 `var foo = 1` 时才把值改成 `1`。实际项目应避免同名 `var` 和函数声明，规则虽可解释但可读性差。

<!-- id: js-012; difficulty: 1; tags: 作用域链, 词法作用域, 执行上下文; source: 高频 -->
# 什么是作用域链？

## 作用域链

### 定义
作用域链是由当前执行上下文及其所有父级执行上下文的变量对象组成的链表，用于变量查找。

### 词法作用域
JavaScript 使用词法作用域（静态作用域），函数的作用域在定义时就确定了，而不是调用时。

```js
let x = 'global';

function outer() {
  let x = 'outer';

  function inner() {
    let x = 'inner';
    console.log(x); // 'inner'（优先当前作用域）
  }

  function middle() {
    console.log(x); // 'outer'（找到外层）
  }

  inner();
  middle();
}

outer();
```

### 变量查找过程
1. 当前作用域 → 找到返回
2. 父作用域 → 找到返回
3. ... 一直到全局作用域
4. 全局作用域也没有 → `ReferenceError`

### 与动态作用域的区别
```js
let value = 'global';
function foo() {
  console.log(value); // JS 中：'global'（词法作用域）
}
function bar() {
  let value = 'bar';
  foo(); // 动态作用域中会打印 'bar'，JS 打印 'global'
}
bar();
```

<!-- id: js-013; difficulty: 1; tags: ES6, 新特性; source: 高频 -->
# ES6 有哪些新特性？

## ES6（ES2015）主要新特性

### 语法增强
```js
const add = (a, b) => a + b;
const message = `Hello, ${name}`;
const { id, title = 'Untitled' } = article;
const [first, ...rest] = list;

function greet(name = 'World') {
  return `Hello, ${name}`;
}
```

包括 `let`/`const`、块级作用域、箭头函数、模板字符串、解构、默认参数、剩余参数、展开语法、增强对象字面量、计算属性名等。

### 类和模块
```js
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    return `${this.name} makes a sound`;
  }
}

export const version = '1.0.0';
export default Animal;
```

`class` 是基于原型继承的语法糖；ES Module 提供静态 `import`/`export`，便于构建工具做依赖分析和 tree-shaking。

### 异步和集合
```js
const p = Promise.resolve(1);
const ids = new Set([1, 2, 2]);
const cache = new Map();
```

ES6 引入 `Promise`、`Map`、`Set`、`WeakMap`、`WeakSet`。`Map` 的 key 可以是任意值，`Set` 用于去重和集合语义。

### Symbol、迭代器和生成器
```js
const id = Symbol('id');

const iterable = {
  *[Symbol.iterator]() {
    yield 1;
    yield 2;
  },
};

for (const value of iterable) {
  console.log(value);
}
```

`Symbol` 常用于创建唯一属性键，也支撑很多内置协议。Iterator/Iterable 协议让 `for...of`、展开语法、解构等可以处理可迭代对象。

### Proxy 和 Reflect
```js
const state = new Proxy({ count: 0 }, {
  get(target, key, receiver) {
    return Reflect.get(target, key, receiver);
  },
  set(target, key, value, receiver) {
    console.log('set', key, value);
    return Reflect.set(target, key, value, receiver);
  },
});
```

`Proxy` 可以拦截对象基本操作，常用于响应式、校验、代理访问等；`Reflect` 提供与这些内部操作对应的函数式 API。

### 面试总结
ES6 的核心价值是：更安全的变量声明、更简洁的函数和对象语法、原生模块、Promise、集合类型、迭代协议以及元编程能力。

<!-- id: js-014; difficulty: 1; tags: call, apply, bind, this; source: 高频 -->
# call、apply、bind 的区别？

## `call`、`apply`、`bind` 的区别

### 共同点
它们都是 `Function.prototype` 上的方法，用于控制普通函数调用时的 `this`，也都可以传参。箭头函数没有自己的 `this`，所以用它们无法改变箭头函数的 `this`。

### `call`：立即调用，参数逐个传
```js
function greet(greeting, punctuation) {
  return `${greeting}, ${this.name}${punctuation}`;
}

const user = { name: 'Alice' };

console.log(greet.call(user, 'Hello', '!')); // Hello, Alice!
```

### `apply`：立即调用，参数用数组或类数组
```js
console.log(greet.apply(user, ['Hi', '.'])); // Hi, Alice.

const nums = [1, 4, 2];
console.log(Math.max.apply(null, nums)); // 4
console.log(Math.max(...nums)); // 现代写法更常用
```

`apply` 适合已有参数数组的场景，不过现代代码多数可以用展开语法替代。

### `bind`：不立即调用，返回新函数
```js
const boundGreet = greet.bind(user, 'Hey');
console.log(boundGreet('?')); // Hey, Alice?
```

`bind` 会固定 `this`，也可以预置部分参数，常用于回调、事件处理和函数柯里化。

```js
class Button {
  constructor(el) {
    this.el = el;
    this.handleClick = this.handleClick.bind(this);
    el.addEventListener('click', this.handleClick);
  }

  handleClick() {
    console.log(this.el);
  }
}
```

### 重要边界
1. `bind` 返回的新函数再次 `call`/`apply`，不能改掉已绑定的 `this`。
2. 绑定函数被 `new` 调用时，`bind` 的 `thisArg` 会被忽略，但预置参数仍生效。
3. 非严格模式下 `call(null)`、`call(undefined)` 会被替换为全局对象；严格模式下会保留 `null`/`undefined`。

| 方法 | 是否立即执行 | 参数形式 | 返回值 |
| --- | --- | --- | --- |
| `call` | 是 | 逐个参数 | 函数执行结果 |
| `apply` | 是 | 数组或类数组 | 函数执行结果 |
| `bind` | 否 | 逐个参数，可预置 | 绑定后的新函数 |

<!-- id: js-015; difficulty: 1; tags: 深拷贝, 浅拷贝, 引用类型; source: 高频 -->
# 什么是深拷贝和浅拷贝？

## 深拷贝和浅拷贝

### 浅拷贝
浅拷贝只复制第一层属性。第一层如果是原始值，会复制值；如果是对象，复制的是引用。

```js
const source = { a: 1, nested: { count: 1 } };
const copy = { ...source };

copy.a = 2;
copy.nested.count = 99;

console.log(source.a); // 1
console.log(source.nested.count); // 99
```

常见浅拷贝：
```js
const objCopy = { ...obj };
const objCopy2 = Object.assign({}, obj);
const arrCopy = arr.slice();
const arrCopy2 = Array.from(arr);
```

注意：对象展开和 `Object.assign` 主要复制自有可枚举属性，不会完整保留原型、属性描述符、getter/setter 语义。

### 深拷贝
深拷贝会复制整个对象图，让嵌套对象也不再共享引用。严格来说，深拷贝还要考虑循环引用、特殊内置类型、原型、属性描述符等问题。

### JSON 方案
```js
const cloned = JSON.parse(JSON.stringify(obj));
```

优点是简单；缺点很多：不能处理循环引用，`undefined`、函数、Symbol 会丢失，`Date` 变字符串，`Map`、`Set`、`RegExp` 等会失真。

### structuredClone
```js
const cloned = structuredClone(value);
```

`structuredClone` 是现代首选方案之一，支持循环引用，也支持 `Date`、`RegExp`、`Map`、`Set`、`ArrayBuffer` 等结构化克隆类型。它不能克隆函数、DOM 节点、WeakMap、WeakSet 等不可结构化克隆的值，遇到不支持的值会抛 `DataCloneError`。

### 手写简化版
```js
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);

  if (value instanceof Date) return new Date(value);
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);

  if (value instanceof Map) {
    const result = new Map();
    seen.set(value, result);
    for (const [key, item] of value) {
      result.set(deepClone(key, seen), deepClone(item, seen));
    }
    return result;
  }

  if (value instanceof Set) {
    const result = new Set();
    seen.set(value, result);
    for (const item of value) {
      result.add(deepClone(item, seen));
    }
    return result;
  }

  const result = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
  seen.set(value, result);

  for (const key of Reflect.ownKeys(value)) {
    result[key] = deepClone(value[key], seen);
  }

  return result;
}
```

这是工程可读的简化版，仍未完整复制属性描述符、不可枚举属性行为、私有字段、DOM 节点等。真实项目优先用 `structuredClone` 或成熟库，根据数据类型选择方案。

<!-- id: js-016; difficulty: 1; tags: new, 构造函数, 原型; source: 高频 -->
# new 操作符做了什么？

## `new` 操作符做了什么

### 执行步骤
1. 创建一个新对象。
2. 将新对象的 `[[Prototype]]` 指向构造函数的 `prototype`；如果 `prototype` 不是对象，则使用 `Object.prototype`。
3. 以新对象作为 `this` 执行构造函数。
4. 如果构造函数返回对象或函数，则返回该值；否则返回新创建的对象。

```js
function Person(name, age) {
  this.name = name;
  this.age = age;
}

const p = new Person('Alice', 25);
console.log(Object.getPrototypeOf(p) === Person.prototype); // true
```

### 返回值规则
```js
function Foo() {
  this.name = 'foo';
  return { name: 'bar' };
}

console.log(new Foo().name); // bar

function Bar() {
  this.name = 'bar';
  return 42;
}

console.log(new Bar().name); // bar
```

返回对象会覆盖默认返回的新实例；返回原始值会被忽略。

### 手写 `new`
```js
function isObjectLike(value) {
  return value !== null && (typeof value === 'object' || typeof value === 'function');
}

function myNew(Constructor, ...args) {
  if (typeof Constructor !== 'function') {
    throw new TypeError('Constructor must be a function');
  }

  const prototype = isObjectLike(Constructor.prototype)
    ? Constructor.prototype
    : Object.prototype;
  const instance = Object.create(prototype);
  const result = Constructor.apply(instance, args);

  return isObjectLike(result) ? result : instance;
}
```

这个手写版适合理解机制，但不能完整模拟原生 `new` 对 class、new.target、内置构造器等所有细节。

<!-- id: js-017; difficulty: 1; tags: 继承, 原型链, ES6, Class; source: 高频 -->
# JavaScript 继承的方式有哪些？

## JavaScript 继承方式

### 1. 原型链继承
```js
function Animal() {
  this.tags = ['animal'];
}

Animal.prototype.speak = function speak() {
  return 'sound';
};

function Dog() {}
Dog.prototype = new Animal();
Dog.prototype.constructor = Dog;
```

问题：父构造函数里的引用类型属性会被所有实例共享，也不方便给父构造函数传参。

### 2. 借用构造函数继承
```js
function Animal(name) {
  this.name = name;
}

function Dog(name) {
  Animal.call(this, name);
}
```

优点是实例属性独立、可传参；缺点是无法继承父类原型方法，每个方法如果写在构造函数里都会重复创建。

### 3. 组合继承
```js
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function speak() {
  return this.name;
};

function Dog(name) {
  Animal.call(this, name);
}
Dog.prototype = new Animal();
Dog.prototype.constructor = Dog;
```

组合继承同时继承实例属性和原型方法，但父构造函数会执行两次。

### 4. 寄生组合继承
```js
function Dog(name) {
  Animal.call(this, name);
}

Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;
```

这是传统构造函数继承里更合理的方式：只调用一次父构造函数，同时让子类原型委托到父类原型。

### 5. `class extends`
```js
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    return `${this.name} makes a sound`;
  }
}

class Dog extends Animal {
  speak() {
    return `${this.name} barks`;
  }
}

const dog = new Dog('Rex');
console.log(dog instanceof Dog); // true
console.log(dog instanceof Animal); // true
```

`class` 是更推荐的语法，本质仍然基于原型链。子类如果写 constructor，必须先调用 `super()` 才能使用 `this`。

### 6. 对象委托
```js
const animal = {
  speak() {
    return this.name;
  },
};

const dog = Object.create(animal);
dog.name = 'Rex';
```

不一定非要构造函数；简单对象复用可以直接用 `Object.create()` 建立原型委托。

<!-- id: js-018; difficulty: 1; tags: Array, 方法, 高阶函数; source: 高频 -->
# 说说 Array 常用方法及区别

## Array 常用方法及区别

### 会修改原数组的方法
```js
const arr = [3, 1, 2];

arr.push(4);              // 末尾添加，返回新长度
arr.pop();                // 末尾删除，返回删除元素
arr.unshift(0);           // 头部添加，返回新长度
arr.shift();              // 头部删除，返回删除元素
arr.splice(1, 1, 'x');    // 增删改，返回被删除元素
arr.sort((a, b) => a - b); // 原地排序
arr.reverse();            // 原地反转
arr.fill(0);              // 原地填充
arr.copyWithin(0, 1, 2);  // 原地复制片段
```

`sort()` 默认按字符串字典序排序，数字排序要传比较函数。

### 不修改原数组的方法
```js
arr.slice(1, 3);              // 截取
arr.concat([4, 5]);           // 合并
arr.map((x) => x * 2);        // 映射，返回等长新数组
arr.filter((x) => x > 1);     // 过滤，返回满足条件的新数组
arr.reduce((sum, x) => sum + x, 0); // 归并
arr.find((x) => x > 1);       // 第一个满足条件的元素
arr.findIndex((x) => x > 1);  // 第一个满足条件的索引
arr.some((x) => x > 2);       // 是否存在满足条件的元素
arr.every((x) => x > 0);      // 是否全部满足条件
arr.includes(2);              // 是否包含，能判断 NaN
arr.flat(2);                  // 按深度扁平化
arr.flatMap((x) => [x, x * 2]);
arr.join('-');                // 拼接为字符串
```

### 新的非变异替代
```js
arr.toSorted((a, b) => a - b); // 非变异 sort
arr.toReversed();              // 非变异 reverse
arr.toSpliced(1, 1, 'x');      // 非变异 splice
arr.with(0, 100);              // 替换指定索引，返回新数组
```

这些方法适合 React、Redux 等需要不可变更新的场景。

### `forEach` vs `map`
```js
arr.forEach((x) => console.log(x)); // 遍历副作用，返回 undefined
const doubled = arr.map((x) => x * 2); // 转换数据，返回新数组
```

需要生成新数组用 `map`，只执行副作用用 `forEach`。`forEach` 不能用 `break` 提前退出，需提前退出可用 `some`、`every`、`find` 或普通循环。

### 查找方法对比
| 方法 | 返回值 | 找不到 | 比较方式 |
| --- | --- | --- | --- |
| `indexOf` | 索引 | `-1` | `===`，找不到 `NaN` |
| `includes` | boolean | `false` | SameValueZero，可找到 `NaN` |
| `find` | 元素 | `undefined` | 谓词函数 |
| `findIndex` | 索引 | `-1` | 谓词函数 |

### 稀疏数组注意
数组方法对空槽处理不完全一致。实际业务中尽量避免稀疏数组，使用真实元素或显式 `undefined` 更可控。

<!-- id: js-019; difficulty: 2; tags: Promise, 并发, 异步; source: 高频 -->
# 详解 Promise.all、Promise.race、Promise.allSettled、Promise.any 的区别

## `Promise.all`、`race`、`allSettled`、`any`

这些方法都接收可迭代对象，元素可以是 Promise，也可以是普通值；普通值会按 fulfilled 处理。返回结果数组的顺序通常按输入顺序，不按完成顺序。

### `Promise.all`
```js
const values = await Promise.all([fetchUser(), fetchOrders(), 1]);
```

全部 fulfilled 才 fulfilled，结果数组顺序与输入一致；任意一个 rejected 会立即让整体 rejected。适合多个任务都必须成功的场景。

```js
await Promise.all([]); // fulfilled 为 []
```

### `Promise.race`
```js
const timeout = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Timeout')), 3000);
});

await Promise.race([fetchData(), timeout]);
```

第一个 settled 的 Promise 决定整体状态，无论成功还是失败。常用于超时控制。注意：`race` 不会自动取消输掉的任务，取消 fetch 需要配合 `AbortController`。

```js
Promise.race([]); // 永远 pending
```

### `Promise.allSettled`
```js
const results = await Promise.allSettled([fetchUser(), fetchOrders()]);

for (const result of results) {
  if (result.status === 'fulfilled') {
    console.log(result.value);
  } else {
    console.error(result.reason);
  }
}
```

等全部任务 settled 后才 fulfilled，不会因为某个任务失败而 rejected。适合批量请求、报表、部分成功也要展示的场景。

```js
await Promise.allSettled([]); // fulfilled 为 []
```

### `Promise.any`
```js
const fastestSuccess = await Promise.any([
  fetchFromCDN1(),
  fetchFromCDN2(),
  fetchFromOrigin(),
]);
```

第一个 fulfilled 就 fulfilled；只有全部 rejected 才 rejected，错误是 `AggregateError`，其中包含所有失败原因。适合多源兜底、镜像请求等场景。

```js
Promise.any([]); // rejected，AggregateError
```

### 对比表
| 方法 | fulfilled 条件 | rejected 条件 | 常见场景 |
| --- | --- | --- | --- |
| `all` | 全部成功 | 任一失败 | 并行依赖全部结果 |
| `race` | 第一个成功 | 第一个失败 | 超时、抢先响应 |
| `allSettled` | 全部结束后总是成功 | 基本不会因输入失败而失败 | 收集批量结果 |
| `any` | 任一成功 | 全部失败 | 多源兜底 |

<!-- id: js-020; difficulty: 2; tags: 执行上下文, 调用栈, 作用域; source: 高频 -->
# 说说 JavaScript 的执行上下文和调用栈

## 执行上下文和调用栈

### 执行上下文是什么
执行上下文是 JS 代码执行时的运行环境，记录当前代码能访问哪些变量、`this` 是什么、外层词法环境是谁。

常见类型：
1. 全局执行上下文：脚本或模块开始执行时创建。
2. 函数执行上下文：每次函数调用都会创建新的上下文。
3. `eval` 执行上下文：不推荐使用。

### 执行上下文包含什么
- Lexical Environment：保存 `let`、`const`、class、块级绑定等。
- Variable Environment：主要保存 `var` 和函数声明相关绑定。
- ThisBinding：当前上下文中的 `this`。
- Outer 引用：指向外层词法环境，形成作用域链。

不同规范版本和讲法会有细节差异，面试中把“变量环境、词法环境、this、外部环境引用”说清楚即可。

### 创建阶段和执行阶段
```js
function foo() {
  console.log(a); // undefined
  var a = 10;

  // console.log(b); // ReferenceError
  let b = 20;
}
```

创建阶段会建立环境记录：`var a` 初始化为 `undefined`，函数声明完成初始化，`let b` 建立绑定但处于 TDZ。执行阶段才按源码顺序赋值和执行语句。

### 调用栈
调用栈是一种后进先出的结构，用来管理函数调用对应的执行上下文。

```js
function first() {
  second();
}

function second() {
  third();
}

function third() {
  console.log('third');
}

first();
```

调用过程：
```txt
[global]
[global, first]
[global, first, second]
[global, first, second, third]
[global, first, second]
[global, first]
[global]
```

同步代码在调用栈中执行；异步回调不会凭空插队，必须等当前调用栈清空后，事件循环再把对应回调放入栈中执行。

### 栈溢出
```js
function infinite() {
  return infinite();
}

infinite(); // RangeError: Maximum call stack size exceeded
```

递归没有退出条件或递归层级过深，会导致调用栈空间耗尽。可改成循环、显式栈、分片执行或尾递归优化可用时再考虑尾递归。

<!-- id: js-021; difficulty: 2; tags: Promise, 手写, 原理; source: 高频 -->
# 实现一个简版 Promise，理解其内部原理

## 手写简版 Promise

面试版重点不是覆盖规范所有细节，而是讲清楚状态机、异步回调、链式调用和 Promise Resolution Procedure。

```js
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';
const runAsync = typeof queueMicrotask === 'function'
  ? queueMicrotask
  : (fn) => setTimeout(fn, 0);

const isObjectOrFunction = (value) =>
  value !== null && (typeof value === 'object' || typeof value === 'function');

function resolvePromise(promise, x, resolve, reject) {
  if (promise === x) {
    reject(new TypeError('Cannot resolve promise with itself'));
    return;
  }

  if (x instanceof MyPromise) {
    x.then(resolve, reject);
    return;
  }

  if (isObjectOrFunction(x)) {
    let called = false;

    try {
      const then = x.then;
      if (typeof then === 'function') {
        then.call(
          x,
          (y) => {
            if (called) return;
            called = true;
            resolvePromise(promise, y, resolve, reject);
          },
          (reason) => {
            if (called) return;
            called = true;
            reject(reason);
          },
        );
        return;
      }
    } catch (error) {
      if (!called) reject(error);
      return;
    }
  }

  resolve(x);
}

class MyPromise {
  constructor(executor) {
    this.state = PENDING;
    this.value = undefined;
    this.reason = undefined;
    this.fulfilledQueue = [];
    this.rejectedQueue = [];

    const settle = (state, result) => {
      if (this.state !== PENDING) return;

      this.state = state;
      if (state === FULFILLED) this.value = result;
      if (state === REJECTED) this.reason = result;

      const queue = state === FULFILLED ? this.fulfilledQueue : this.rejectedQueue;
      queue.forEach((task) => task());
      this.fulfilledQueue = [];
      this.rejectedQueue = [];
    };

    const resolve = (value) => {
      if (value === this) {
        reject(new TypeError('Cannot resolve promise with itself'));
        return;
      }
      if (value instanceof MyPromise) {
        value.then(resolve, reject);
        return;
      }
      settle(FULFILLED, value);
    };

    const reject = (reason) => settle(REJECTED, reason);

    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }

  then(onFulfilled, onRejected) {
    const fulfilled = typeof onFulfilled === 'function' ? onFulfilled : (value) => value;
    const rejected = typeof onRejected === 'function'
      ? onRejected
      : (reason) => { throw reason; };

    const nextPromise = new MyPromise((resolve, reject) => {
      const runFulfilled = () => {
        runAsync(() => {
          try {
            const x = fulfilled(this.value);
            resolvePromise(nextPromise, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
      };

      const runRejected = () => {
        runAsync(() => {
          try {
            const x = rejected(this.reason);
            resolvePromise(nextPromise, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
      };

      if (this.state === FULFILLED) runFulfilled();
      else if (this.state === REJECTED) runRejected();
      else {
        this.fulfilledQueue.push(runFulfilled);
        this.rejectedQueue.push(runRejected);
      }
    });

    return nextPromise;
  }

  catch(onRejected) {
    return this.then(undefined, onRejected);
  }

  finally(onFinally) {
    const callback = typeof onFinally === 'function' ? onFinally : () => onFinally;

    return this.then(
      (value) => MyPromise.resolve(callback()).then(() => value),
      (reason) => MyPromise.resolve(callback()).then(() => { throw reason; }),
    );
  }

  static resolve(value) {
    if (value instanceof MyPromise) return value;
    return new MyPromise((resolve) => resolve(value));
  }

  static reject(reason) {
    return new MyPromise((_, reject) => reject(reason));
  }
}
```

### 关键点
1. 状态只能从 `pending` 变为 `fulfilled` 或 `rejected`，之后不可逆。
2. `then` 必须返回新的 Promise，才能链式调用。
3. `then` 回调异步执行，真实 Promise 使用微任务；这里用 `queueMicrotask` 模拟。
4. `then` 回调返回普通值、Promise、thenable、抛错时，都要按规则解析。
5. 这仍是简化版，完整规范还涉及更多边界和宿主环境行为。

<!-- id: js-022; difficulty: 2; tags: Generator, 迭代器, 异步, ES6; source: 高频 -->
# Generator 生成器的原理和应用

## Generator 生成器

### 基本概念
Generator 是可以暂停和恢复执行的函数。调用生成器函数不会立即执行函数体，而是返回一个迭代器对象；调用 `.next()` 才会执行到下一个 `yield`。

```js
function* generator() {
  console.log('start');
  const x = yield 1;
  console.log('x =', x);
  const y = yield 2;
  return x + y;
}

const gen = generator();
console.log(gen.next()); // start, { value: 1, done: false }
console.log(gen.next(10)); // x = 10, { value: 2, done: false }
console.log(gen.next(20)); // { value: 30, done: true }
```

第一次 `next()` 传参没有对应的 `yield` 接收；后续 `next(value)` 的参数会作为上一个 `yield` 表达式的结果。

### 迭代器和惰性序列
```js
function* range(start = 0, step = 1) {
  let current = start;

  while (true) {
    yield current;
    current += step;
  }
}

const nums = range(0, 2);
console.log(nums.next().value); // 0
console.log(nums.next().value); // 2
console.log(nums.next().value); // 4
```

Generator 天然实现 Iterable/Iterator 协议，可以用于 `for...of`、展开语法和惰性数据流。

### 异步控制流执行器
```js
function run(generatorFn) {
  const gen = generatorFn();

  return new Promise((resolve, reject) => {
    function step(method, arg) {
      let result;

      try {
        result = gen[method](arg);
      } catch (error) {
        reject(error);
        return;
      }

      const { value, done } = result;
      if (done) {
        resolve(value);
        return;
      }

      Promise.resolve(value).then(
        (data) => step('next', data),
        (error) => step('throw', error),
      );
    }

    step('next');
  });
}

run(function* () {
  const user = yield fetch('/api/user').then((r) => r.json());
  const posts = yield fetch(`/api/posts/${user.id}`).then((r) => r.json());
  return posts;
});
```

这个执行器可以把 `yield Promise` 串起来，并把异步错误通过 `gen.throw()` 抛回生成器内部。

### 常用方法
- `next(value)`：恢复执行，并把 value 传给上一个 `yield`。
- `throw(error)`：在暂停点抛出错误。
- `return(value)`：提前结束生成器。
- `yield* iterable`：委托给另一个可迭代对象。

### 和 async/await 的关系
可以用 Generator + Promise 执行器模拟 async/await，这也是早期转译工具常见实现思路。但原生 async/await 是语言内建的 Promise 异步函数机制，不应简单说“底层就是 Generator”。

<!-- id: js-023; difficulty: 2; tags: Proxy, Reflect, ES6, 响应式; source: 高频 -->
# 详解 Proxy 和 Reflect

## Proxy 和 Reflect

### Proxy 是什么
`Proxy` 用来创建对象代理，拦截对象的基本操作，例如读、写、删除、枚举、函数调用和构造调用。

```js
const target = { count: 1 };

const proxy = new Proxy(target, {
  get(target, key, receiver) {
    console.log('get', key);
    return Reflect.get(target, key, receiver);
  },
  set(target, key, value, receiver) {
    if (key === 'count' && typeof value !== 'number') {
      throw new TypeError('count must be a number');
    }
    return Reflect.set(target, key, value, receiver);
  },
  deleteProperty(target, key) {
    console.log('delete', key);
    return Reflect.deleteProperty(target, key);
  },
});

proxy.count; // get count
proxy.count = 2;
```

常见 trap：`get`、`set`、`has`、`deleteProperty`、`ownKeys`、`getOwnPropertyDescriptor`、`defineProperty`、`apply`、`construct`。

### Reflect 的作用
`Reflect` 提供和对象内部操作对应的函数式 API，很多方法正好与 Proxy trap 对应。

```js
Reflect.get(target, key, receiver);
Reflect.set(target, key, value, receiver);
Reflect.has(target, key);
Reflect.ownKeys(target);
```

使用 `Reflect` 的好处：
1. 保持默认语义，不容易漏掉原型链、getter/setter、receiver 等细节。
2. 返回值更规范，例如 `Reflect.set` 返回 boolean，便于 trap 按规范返回。
3. 在 Proxy trap 里可以先做增强逻辑，再委托默认行为。

### 响应式简化示例
```js
const proxyCache = new WeakMap();

function reactive(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (proxyCache.has(obj)) return proxyCache.get(obj);

  const proxy = new Proxy(obj, {
    get(target, key, receiver) {
      track(target, key);
      const value = Reflect.get(target, key, receiver);
      return reactive(value);
    },
    set(target, key, value, receiver) {
      const oldValue = target[key];
      const result = Reflect.set(target, key, value, receiver);

      if (oldValue !== value) {
        trigger(target, key);
      }

      return result;
    },
  });

  proxyCache.set(obj, proxy);
  return proxy;
}
```

这只是响应式的核心思路：读时依赖收集，写时触发更新。真实框架还要处理数组、Map/Set、原型链、只读代理、effect 调度等。

### 注意事项
1. Proxy 有一些不变量，trap 不能违反目标对象的不可配置、不可写等约束，否则会抛 TypeError。
2. 代理和原对象不是同一个引用，`proxy !== target`。
3. Proxy 不能直接 polyfill 到旧环境，因为它拦截的是语言底层操作。
4. 对性能敏感的热点对象，滥用 Proxy 可能增加开销。

<!-- id: js-024; difficulty: 2; tags: WeakMap, Map, 内存, GC; source: 高频 -->
# WeakMap 和 Map 的区别及应用场景

## `Map` 和 `WeakMap` 的区别

### Map
```js
const map = new Map();
const key = { id: 1 };

map.set(key, 'value');
console.log(map.get(key)); // value
console.log(map.size); // 1
```

`Map` 的 key 可以是任意类型，按插入顺序迭代，有 `size`，支持 `keys()`、`values()`、`entries()`。它对 key 是强引用：只要 key 还在 Map 里，key 对象就不会因为外部引用消失而被回收。

### WeakMap
```js
let node = document.querySelector('#app');
const meta = new WeakMap();

meta.set(node, { mountedAt: Date.now() });
console.log(meta.get(node));

node = null;
```

`WeakMap` 的 key 必须是可被垃圾回收的引用值，实际面试中通常说必须是对象。它不可迭代、没有 `size`，只提供 `get`、`set`、`has`、`delete`。

弱引用含义：WeakMap 不会因为保存了 key 就阻止 key 被 GC。当 key 在其他地方不可达后，对应条目可以被引擎回收。但 GC 时机不可预测，也不能通过遍历或 size 观察回收是否发生，所以 WeakMap 才故意不提供枚举能力。

### 对比
| 特性 | Map | WeakMap |
| --- | --- | --- |
| key 类型 | 任意类型 | 通常为对象 |
| 是否可迭代 | 是 | 否 |
| 是否有 size | 是 | 否 |
| 对 key 的引用 | 强引用 | 弱引用 |
| 典型用途 | 普通字典、需要遍历的缓存 | 对象元数据、不影响 GC 的缓存 |

### 应用场景
#### 1. 给对象关联私有元数据
```js
const privateData = new WeakMap();

class Person {
  constructor(name) {
    privateData.set(this, { name });
  }

  getName() {
    return privateData.get(this).name;
  }
}
```

现代 class 私有字段 `#name` 更直接，但 WeakMap 仍适合跨对象、跨模块关联元数据。

#### 2. 缓存对象计算结果
```js
const cache = new WeakMap();

function normalize(config) {
  if (cache.has(config)) return cache.get(config);

  const result = expensiveNormalize(config);
  cache.set(config, result);
  return result;
}
```

当 `config` 不再被业务代码引用时，缓存不会单独把它留住。

#### 3. DOM 节点关联数据
```js
const nodeState = new WeakMap();

function mount(node) {
  nodeState.set(node, { clicks: 0 });
}
```

DOM 节点移除后，如果没有其他强引用，关联状态也可以随 key 一起回收。

<!-- id: js-025; difficulty: 2; tags: Symbol, ES6, 唯一性; source: 高频 -->
# 说说 Symbol 的用途

## Symbol 的用途

### 基本特性
`Symbol` 是 ES6 引入的原始类型，用来创建唯一标识。描述字符串只用于调试，不参与相等判断。

```js
const a = Symbol('id');
const b = Symbol('id');

console.log(a === b); // false
console.log(typeof a); // symbol
```

`Symbol` 不能用 `new` 调用。

### 1. 唯一属性键
```js
const ID = Symbol('id');
const user = {
  name: 'Alice',
  [ID]: 123,
};

console.log(user[ID]); // 123
console.log(Object.keys(user)); // ['name']
console.log(Object.getOwnPropertySymbols(user)); // [Symbol(id)]
console.log(Reflect.ownKeys(user)); // ['name', Symbol(id)]
```

Symbol 属性可以降低命名冲突风险，但不是安全私有属性；知道 Symbol 引用或通过反射 API 仍然可以访问。

### 2. 内置协议（Well-known Symbols）
```js
const range = {
  start: 1,
  end: 3,
  *[Symbol.iterator]() {
    for (let i = this.start; i <= this.end; i += 1) {
      yield i;
    }
  },
};

console.log([...range]); // [1, 2, 3]
```

常见 well-known symbols：
- `Symbol.iterator`：定义可迭代协议。
- `Symbol.asyncIterator`：定义异步迭代协议。
- `Symbol.toPrimitive`：自定义对象转原始值。
- `Symbol.toStringTag`：自定义 `Object.prototype.toString` 标签。
- `Symbol.hasInstance`：自定义 `instanceof` 行为。

```js
const money = {
  value: 10,
  [Symbol.toPrimitive](hint) {
    return hint === 'string' ? '$10' : 10;
  },
};

console.log(+money); // 10
console.log(`${money}`); // $10
```

### 3. 全局 Symbol 注册表
```js
const s1 = Symbol.for('shared');
const s2 = Symbol.for('shared');

console.log(s1 === s2); // true
console.log(Symbol.keyFor(s1)); // shared
console.log(Symbol.keyFor(Symbol('local'))); // undefined
```

`Symbol.for()` 会在全局注册表中复用同名 Symbol，适合跨模块约定；普通 `Symbol()` 每次都会创建新值。

### 注意点
1. `for...in`、`Object.keys()`、`JSON.stringify()` 会忽略 Symbol 键。
2. `Object.assign()` 和对象展开会复制可枚举的 Symbol 自有属性。
3. Symbol 适合协议和避免冲突，不适合存放真正敏感数据。

<!-- id: js-026; difficulty: 2; tags: 迭代器, Symbol.iterator, ES6; source: 高频 -->
# 描述 JavaScript 中的迭代器协议和可迭代协议

## 迭代器协议和可迭代协议

### 迭代器协议
迭代器是实现了 `next()` 方法的对象。每次调用 `next()` 返回一个 iterator result：`{ value, done }`。

```js
const iterator = {
  data: [1, 2, 3],
  index: 0,
  next() {
    if (this.index < this.data.length) {
      return { value: this.data[this.index++], done: false };
    }

    return { value: undefined, done: true };
  },
};

iterator.next(); // { value: 1, done: false }
iterator.next(); // { value: 2, done: false }
iterator.next(); // { value: 3, done: false }
iterator.next(); // { value: undefined, done: true }
```

可选地，迭代器还可以实现 `return()` 和 `throw()`，用于提前关闭或错误处理。`for...of` 中途 `break` 时会尝试调用迭代器的 `return()`。

### 可迭代协议
可迭代对象必须实现 `[Symbol.iterator]()`，并返回一个迭代器。

```js
const range = {
  from: 1,
  to: 5,
  [Symbol.iterator]() {
    let current = this.from;
    const last = this.to;

    return {
      next() {
        return current <= last
          ? { value: current++, done: false }
          : { value: undefined, done: true };
      },
    };
  },
};

console.log([...range]); // [1, 2, 3, 4, 5]
for (const n of range) console.log(n);
```

Generator 函数可以更简洁地创建可迭代对象。

```js
function* range(from, to) {
  for (let i = from; i <= to; i += 1) {
    yield i;
  }
}
```

### 内置可迭代对象
常见可迭代对象：Array、String、Map、Set、TypedArray、Generator、很多 DOM 集合（如现代浏览器里的 NodeList）等。

### 使用场景
`for...of`、数组展开、函数参数展开、数组解构、`Promise.all()`、`new Map(iterable)` 等都会消费可迭代对象。普通对象默认不可迭代，需要用 `Object.keys()`、`Object.entries()` 或自己实现 `[Symbol.iterator]()`。

<!-- id: js-027; difficulty: 2; tags: 箭头函数, this, ES6; source: 高频 -->
# 箭头函数和普通函数的区别

## 箭头函数和普通函数的区别

### 1. `this` 绑定
普通函数的 `this` 由调用方式决定；箭头函数没有自己的 `this`，会捕获定义位置外层作用域的 `this`。

```js
const obj = {
  name: 'obj',
  regular() {
    return this.name;
  },
  arrow: () => this?.name,
};

console.log(obj.regular()); // obj
console.log(obj.arrow()); // 取决于外层 this，通常不是 obj
```

不要把对象方法写成箭头函数，除非明确需要外层 `this`。

```js
function Timer() {
  this.count = 0;
  setInterval(() => {
    this.count += 1;
  }, 1000);
}
```

### 2. `arguments`
```js
function regular() {
  console.log(arguments);
}

const arrow = (...args) => {
  console.log(args);
};
```

箭头函数没有自己的 `arguments`，需要使用剩余参数。

### 3. 不能作为构造函数
```js
const Foo = () => {};
new Foo(); // TypeError: Foo is not a constructor
```

箭头函数没有 `[[Construct]]`，也没有自己的 `prototype`。

```js
const fn = () => {};
console.log(fn.prototype); // undefined
```

### 4. 不能被 call/apply/bind 改变 this
```js
const fn = () => this;
console.log(fn.call({ name: 'x' }) === fn()); // true
```

`call`、`apply`、`bind` 仍然可以传参，但不能改变箭头函数捕获的 `this`。

### 5. 不能用作 Generator
箭头函数不能写成 `function*` 那样的生成器形式，也不能使用 `yield` 作为生成器暂停点。

### 适用场景
1. 需要保留外层 `this` 的回调：定时器、Promise、数组方法、类组件回调等。
2. 简短纯函数：`arr.map((x) => x * 2)`。
3. 不适合作为对象原型方法、构造函数、需要动态 `this` 的事件处理函数。

<!-- id: js-028; difficulty: 2; tags: Proxy, Vue, 响应式, Object.defineProperty; source: 高频 -->
# Object.defineProperty 和 Proxy 的区别（Vue2 vs Vue3 响应式原理）

## `Object.defineProperty` 和 `Proxy` 的区别

### `Object.defineProperty`：Vue2 的核心思路
```js
function defineReactive(obj, key, value) {
  observe(value);

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get() {
      track(obj, key);
      return value;
    },
    set(next) {
      if (Object.is(next, value)) return;
      value = next;
      observe(next);
      trigger(obj, key);
    },
  });
}
```

它通过给已有属性定义 getter/setter 实现依赖收集和派发更新。

主要限制：
1. 只能拦截已经被定义过的属性读写，新增和删除属性需要额外 API 辅助。
2. 对数组下标和 `length` 的变化不好统一拦截，Vue2 需要重写部分数组变异方法。
3. 深层对象通常要初始化时递归遍历，数据大时初始化成本高。

```js
// Vue2 典型限制
this.obj.newProp = 1; // 需要 Vue.set / this.$set
this.arr[0] = 'x';    // 直接下标赋值不触发视图更新
```

### `Proxy`：Vue3 的核心思路
```js
const proxyCache = new WeakMap();

function reactive(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (proxyCache.has(obj)) return proxyCache.get(obj);

  const proxy = new Proxy(obj, {
    get(target, key, receiver) {
      track(target, key);
      const value = Reflect.get(target, key, receiver);
      return reactive(value);
    },
    set(target, key, value, receiver) {
      const hadKey = Object.hasOwn(target, key);
      const oldValue = target[key];
      const result = Reflect.set(target, key, value, receiver);

      if (!hadKey) trigger(target, key, 'add');
      else if (!Object.is(oldValue, value)) trigger(target, key, 'set');

      return result;
    },
    deleteProperty(target, key) {
      const hadKey = Object.hasOwn(target, key);
      const result = Reflect.deleteProperty(target, key);

      if (hadKey && result) trigger(target, key, 'delete');
      return result;
    },
  });

  proxyCache.set(obj, proxy);
  return proxy;
}
```

`Proxy` 拦截的是对象层面的基本操作，而不是单个属性，因此可以感知新增、删除、数组下标、`in`、`ownKeys` 等更多行为。嵌套对象也可以按需懒代理。

### 对比
| 特性 | `defineProperty` | `Proxy` |
| --- | --- | --- |
| 拦截粒度 | 单个属性 | 整个对象操作 |
| 新增属性 | 需要额外处理 | 可拦截 |
| 删除属性 | 需要额外处理 | 可拦截 |
| 数组下标/length | 处理困难 | 可拦截更多操作 |
| 初始化 | 深层递归成本较高 | 可懒代理 |
| Map/Set | 需要额外封装 | 可通过代理和方法包装支持 |
| 兼容性 | 可支持旧浏览器 | 无法完整 polyfill，不支持 IE |

### 面试总结
Vue2 是“把每个属性改造成 getter/setter”；Vue3 是“给整个对象套代理，按操作追踪”。Proxy 能覆盖更多语言层面的变化，响应式能力更完整，但兼容性要求更高。

<!-- id: js-029; difficulty: 2; tags: 防抖, 节流, 性能; source: 高频 -->
# 说说防抖和节流的原理与区别

## 防抖和节流

### 防抖（debounce）
事件连续触发时不立即执行，等停止触发一段时间后只执行最后一次。适合搜索联想、表单校验、窗口 resize 后重新布局。

```js
function debounce(fn, wait, options = {}) {
  let timer = null;
  const { leading = false, trailing = true } = options;

  return function debounced(...args) {
    const context = this;
    const shouldCallNow = leading && timer === null;

    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (trailing && !shouldCallNow) {
        fn.apply(context, args);
      }
    }, wait);

    if (shouldCallNow) {
      fn.apply(context, args);
    }
  };
}

const handleSearch = debounce((query) => {
  fetch(`/api/search?q=${encodeURIComponent(query)}`);
}, 300);
```

### 节流（throttle）
事件持续触发时，固定时间窗口内最多执行一次。适合滚动位置上报、拖拽、mousemove、频繁点击保护。

```js
function throttle(fn, wait) {
  let lastTime = 0;
  let timer = null;

  return function throttled(...args) {
    const context = this;
    const now = Date.now();
    const remaining = wait - (now - lastTime);

    if (remaining <= 0) {
      clearTimeout(timer);
      timer = null;
      lastTime = now;
      fn.apply(context, args);
      return;
    }

    if (!timer) {
      timer = setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        fn.apply(context, args);
      }, remaining);
    }
  };
}
```

这个版本同时支持 leading 和 trailing：第一次能尽快执行，最后一次也不会丢。

### 区别
| 维度 | 防抖 | 节流 |
| --- | --- | --- |
| 核心 | 等用户停下来 | 控制固定频率 |
| 高频期间 | 不执行或只执行开头 | 间隔执行 |
| 结束后 | 通常执行最后一次 | trailing 开启时执行最后一次 |
| 场景 | 搜索、校验、resize 结束 | scroll、drag、mousemove、上报 |

### 事件监听注意
```js
window.addEventListener('scroll', throttle(handleScroll, 200), { passive: true });
```

滚动类监听建议配合 `passive: true`。如果是视觉更新，很多场景用 `requestAnimationFrame` 节流比固定毫秒更贴合浏览器帧率。

<!-- id: js-030; difficulty: 2; tags: for...in, for...of, 迭代; source: 高频 -->
# 说说 for...in 和 for...of 的区别

## `for...in` 和 `for...of` 的区别

### `for...in`
`for...in` 遍历对象的可枚举字符串属性键，包括原型链上的可枚举属性，不遍历 Symbol 键。

```js
const obj = { a: 1, b: 2 };

for (const key in obj) {
  console.log(key, obj[key]);
}
```

如果只想遍历自身属性，要过滤原型链属性。

```js
function Foo() {
  this.x = 1;
}
Foo.prototype.y = 2;

const foo = new Foo();

for (const key in foo) {
  if (Object.hasOwn(foo, key)) {
    console.log(key); // x
  }
}
```

不推荐用 `for...in` 遍历数组，因为拿到的是字符串索引，还可能遍历到额外可枚举属性。

```js
const arr = [10, 20, 30];
arr.extra = 'oops';

for (const key in arr) {
  console.log(key); // 0 1 2 extra
}
```

### `for...of`
`for...of` 遍历可迭代对象产出的值。它会读取对象的 `[Symbol.iterator]()`，然后不断调用迭代器 `next()`。

```js
for (const value of [1, 2, 3]) console.log(value);
for (const char of 'hello') console.log(char);

const map = new Map([['a', 1], ['b', 2]]);
for (const [key, value] of map) console.log(key, value);

const set = new Set([1, 2, 3]);
for (const value of set) console.log(value);
```

普通对象默认不可迭代，遍历键值对通常用 `Object.entries()`。

```js
for (const [key, value] of Object.entries(obj)) {
  console.log(key, value);
}
```

### 对比
| 维度 | `for...in` | `for...of` |
| --- | --- | --- |
| 遍历内容 | 可枚举属性键 | 迭代器产出的值 |
| 主要对象 | 普通对象 | Iterable，如数组、字符串、Map、Set |
| 原型链 | 会包含可枚举原型属性 | 不按属性查找 |
| Symbol 键 | 不遍历 | 取决于迭代器实现 |
| 中途退出 | 普通退出 | 会触发迭代器 `return()` 清理 |

简单记：对象属性用 `Object.keys/values/entries`，可迭代数据用 `for...of`，少用 `for...in` 遍历数组。

<!-- id: js-031; difficulty: 2; tags: 模块化, CommonJS, ESM, Tree Shaking; source: 高频 -->
# 详解 JavaScript 模块化：CommonJS vs ES Module

## CommonJS vs ES Module

### CommonJS（CJS）
```js
// counter.cjs
let count = 0;

function increment() {
  count += 1;
}

module.exports = {
  count,
  increment,
  getCount: () => count,
};

// main.cjs
const counter = require('./counter.cjs');
```

CJS 的特点：
1. `require()` 运行时同步加载，常见于 Node.js。
2. 模块执行后会缓存，同一模块通常只执行一次。
3. 导出的是 `module.exports` 对象；导入方拿到这个对象引用。
4. 可以动态 require，例如放在条件语句里。

“CJS 导出是值拷贝”这句话要谨慎：`module.exports` 对象本身是引用；但如果导入方解构某个属性，拿到的是当时该属性值的本地变量。

```js
const { count, increment, getCount } = require('./counter.cjs');

increment();
console.log(count); // 0，解构得到的是当时的属性值
console.log(getCount()); // 1，通过函数读到内部最新值
```

### ES Module（ESM）
```js
// counter.mjs
export let count = 0;

export function increment() {
  count += 1;
}

// main.mjs
import { count, increment } from './counter.mjs';

increment();
console.log(count); // 1
```

ESM 的特点：
1. 静态 `import`/`export`，依赖关系在解析阶段就能确定。
2. 导出是 live binding，导入方读取到的是导出绑定的最新值。
3. 导入绑定是只读视图，不能在导入模块里重新赋值。
4. 默认严格模式，支持顶层 `await`。
5. 静态结构有利于 tree shaking 和构建优化。

### 动态导入
```js
const mod = await import('./feature.mjs');
mod.run();
```

`import()` 是动态加载 ESM 的方式，返回 Promise，适合代码分割、按需加载和条件加载。

### 主要区别
| 特性 | CommonJS | ES Module |
| --- | --- | --- |
| 加载方式 | 运行时同步 `require` | 静态 `import`，动态用 `import()` |
| 导出模型 | `module.exports` 对象 | live binding |
| 缓存 | 有模块缓存 | 有模块实例缓存 |
| Tree shaking | 较难 | 更友好 |
| 循环依赖 | 返回未完成的 exports 对象 | 绑定可先建立，TDZ 仍需注意 |
| 使用场景 | Node 旧生态、配置文件 | 浏览器、现代 Node、构建产物 |

### 面试总结
CJS 更动态、更偏运行时；ESM 更静态、更利于浏览器和构建优化。CJS 拿到的是导出对象，ESM 拿到的是导出绑定。

<!-- id: js-032; difficulty: 2; tags: 柯里化, 函数式编程, 高阶函数; source: 高频 -->
# 什么是柯里化（Currying）？有什么用途？

## 柯里化（Currying）

### 定义
柯里化是把接收多个参数的函数，转换成一系列接收较少参数的函数。每次调用先收集一部分参数，参数足够后再执行原函数。

```js
const add = (a, b, c) => a + b + c;

const curriedAdd = (a) => (b) => (c) => a + b + c;

add(1, 2, 3); // 6
curriedAdd(1)(2)(3); // 6
```

柯里化常和“部分应用”一起使用：先固定一部分参数，得到更专用的函数。

```js
const add1 = curriedAdd(1);
console.log(add1(2)(3)); // 6
```

### 通用实现
```js
function curry(fn, arity = fn.length) {
  function curried(...args) {
    if (args.length >= arity) {
      return fn.apply(this, args);
    }

    return function collect(...nextArgs) {
      return curried.apply(this, args.concat(nextArgs));
    };
  }

  return curried;
}

const sum = curry((a, b, c) => a + b + c);

sum(1)(2)(3); // 6
sum(1, 2)(3); // 6
sum(1, 2, 3); // 6
```

`fn.length` 只统计第一个默认参数之前的形参数量，不包含剩余参数；复杂函数最好显式传 `arity`。

### 应用场景
#### 1. 参数复用
```js
const isType = curry((type, value) => typeof value === type);
const isString = isType('string');

console.log(['a', 1, 'b'].filter(isString)); // ['a', 'b']
```

#### 2. 生成专用函数
```js
const format = curry((locale, options, value) =>
  new Intl.NumberFormat(locale, options).format(value),
);

const formatCNY = format('zh-CN', { style: 'currency', currency: 'CNY' });
console.log(formatCNY(12.5));
```

#### 3. 函数组合
```js
const compose = (...fns) => (value) =>
  fns.reduceRight((current, fn) => fn(current), value);

const transform = compose(
  (x) => x * 2,
  (x) => x + 1,
  (x) => x * 3,
);

console.log(transform(2)); // 14
```

### 注意
柯里化能提升复用和组合能力，但过度使用会增加调用层级和阅读成本。业务代码里要以可读性为先。

<!-- id: js-033; difficulty: 2; tags: Object, 原型, 不可变; source: 高频 -->
# 说说 Object.create()、Object.assign()、Object.freeze() 的用途

## `Object.create`、`Object.assign`、`Object.freeze`

### `Object.create(proto, descriptors?)`
以指定对象作为原型创建新对象，也可以同时定义属性描述符。

```js
const dict = Object.create(null);
dict.name = 'plain dictionary';

const animal = {
  speak() {
    return `${this.name} makes a sound`;
  },
};

const dog = Object.create(animal);
dog.name = 'Rex';
console.log(dog.speak()); // Rex makes a sound
```

常见用途：创建无原型字典对象、建立原型委托、实现寄生组合继承。

```js
Child.prototype = Object.create(Parent.prototype);
Child.prototype.constructor = Child;
```

### `Object.assign(target, ...sources)`
把源对象的自有可枚举属性复制到目标对象，返回目标对象。后面的源会覆盖前面的同名属性。

```js
const result = Object.assign({}, { a: 1 }, { b: 2 }, { a: 3 });
console.log(result); // { a: 3, b: 2 }

const target = { a: 1 };
Object.assign(target, { b: 2 });
console.log(target); // { a: 1, b: 2 }
```

注意点：
1. 它会修改并返回 `target`。
2. 是浅拷贝，嵌套对象仍共享引用。
3. 会复制可枚举的 string key 和 Symbol key。
4. 读取源属性时会触发 getter，写目标属性时会触发 setter。
5. 不会复制原型和完整属性描述符。

### `Object.freeze(obj)`
冻结对象：不能新增属性、不能删除属性、已有数据属性不能改值，属性也会变成不可配置。它是浅冻结。

```js
'use strict';

const config = Object.freeze({ timeout: 5000 });
config.timeout = 10000; // TypeError
```

```js
const obj = Object.freeze({ nested: { count: 1 } });
obj.nested.count = 2;
console.log(obj.nested.count); // 2，嵌套对象没被冻结
```

### 简化版 deepFreeze
```js
function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) {
    return value;
  }

  seen.add(value);

  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(value[key], seen);
  }

  return Object.freeze(value);
}
```

这仍是普通对象场景的简化版，遇到 DOM、Map、Set、类实例等要谨慎。

### 相关方法
```js
Object.keys(obj);        // 自有可枚举 string key
Object.values(obj);      // 自有可枚举属性值
Object.entries(obj);     // 自有可枚举 [key, value]
Object.fromEntries(list); // entries -> object
Object.seal(obj);        // 不可增删属性，但可改已有可写属性
Object.preventExtensions(obj); // 禁止新增属性
Object.hasOwn(obj, key); // 判断自有属性
Reflect.ownKeys(obj);    // 自有 string key + Symbol key
```

<!-- id: js-034; difficulty: 2; tags: 私有属性, ES2022, 封装; source: 高频 -->
# JavaScript 中如何实现私有属性/方法？

## JavaScript 私有属性和私有方法

### 1. 命名约定
```js
class Person {
  constructor(name) {
    this._name = name;
  }
}
```

`_name` 只是团队约定，不是真正私有，外部仍可读写。

### 2. 闭包
```js
function createCounter() {
  let count = 0;

  return {
    inc() {
      count += 1;
    },
    get() {
      return count;
    },
  };
}
```

闭包可以实现真正的外部不可直接访问，适合工厂函数和模块模式。缺点是每个实例通常都会创建一组新函数，原型复用不方便。

### 3. WeakMap
```js
const privateState = new WeakMap();

class Person {
  constructor(name, age) {
    privateState.set(this, { name, age });
  }

  getName() {
    return privateState.get(this).name;
  }
}
```

WeakMap 适合在 class 私有字段普及前存储实例私有数据。以实例作为 key，不会因为私有数据表阻止实例被 GC。

### 4. `#` 私有字段和方法
```js
class Person {
  static #count = 0;

  #name;
  #age;

  constructor(name, age) {
    this.#name = name;
    this.#age = age;
    Person.#count += 1;
  }

  #isValidAge(age) {
    return age > 0 && age < 150;
  }

  setAge(age) {
    if (!this.#isValidAge(age)) throw new RangeError('invalid age');
    this.#age = age;
  }

  getInfo() {
    return `${this.#name}, ${this.#age}`;
  }

  static getCount() {
    return Person.#count;
  }
}
```

`#name` 是语言级私有字段，只能在声明它的类体内部访问。类外写 `p.#name` 是语法错误；`p['#name']` 只是访问字符串属性，不是访问私有字段。

### 私有字段的品牌检查
```js
class Box {
  #value = 1;

  static isBox(value) {
    return #value in value;
  }
}
```

`#value in value` 可以检查对象是否拥有该类声明的私有品牌。

### 推荐选择
现代项目优先用 `#` 私有字段和私有方法；需要兼容旧环境时，用 WeakMap 或闭包；`_` 前缀只适合表达约定，不提供封装保证。

<!-- id: js-035; difficulty: 2; tags: Set, Map, 数据结构, ES6; source: 高频 -->
# 说说 Set 和 Map 数据结构的用法

## Set 和 Map 的用法

### Set
`Set` 是唯一值集合，按插入顺序迭代。值是否重复使用 SameValueZero 判断，所以 `NaN` 等于 `NaN`，`+0` 和 `-0` 视为相同。

```js
const set = new Set([1, 2, 2, NaN, NaN]);
console.log(set.size); // 3

set.add(3);
set.has(2); // true
set.delete(1);
set.clear();
```

常见用途：数组去重、成员检测、集合运算。

```js
const unique = [...new Set([1, 2, 2, 3])];

const a = new Set([1, 2, 3]);
const b = new Set([2, 3, 4]);

const union = new Set([...a, ...b]);
const intersection = new Set([...a].filter((x) => b.has(x)));
const difference = new Set([...a].filter((x) => !b.has(x)));
```

对象值按引用判断，不按结构判断。

```js
new Set([{ id: 1 }, { id: 1 }]).size; // 2
```

### Map
`Map` 是键值对集合，key 可以是任意类型，也按插入顺序迭代。

```js
const objKey = { id: 1 };
const map = new Map();

map.set('name', 'Alice');
map.set(42, 'number key');
map.set(objKey, 'object key');

console.log(map.get(objKey)); // object key
console.log(map.has('name')); // true
console.log(map.size); // 3

for (const [key, value] of map) {
  console.log(key, value);
}
```

可以从 entries 创建，也可以转回数组或对象。

```js
const m = new Map([['a', 1], ['b', 2]]);
const entries = [...m];
const obj = Object.fromEntries(m);
```

注意：转成对象时，非 string/Symbol key 会被转换或丢失语义，不适合保留对象 key。

### Map vs Object
| 维度 | Map | Object |
| --- | --- | --- |
| key 类型 | 任意值 | string / Symbol |
| size | 原生 `.size` | 需要 `Object.keys().length` |
| 迭代 | 默认可迭代 | 需 `Object.entries()` 等转换 |
| 原型键冲突 | 无默认原型键 | 普通对象继承原型属性 |
| 适合场景 | 动态增删、任意 key、频繁查找 | 固定结构数据、JSON、记录模型 |

如果只是表示一条业务记录，Object 更自然；如果需要字典、缓存、任意类型 key 或频繁增删，Map 更合适。

<!-- id: js-036; difficulty: 2; tags: 可选链, 空值合并, ES2020; source: 高频 -->
# 解释可选链（?.）和空值合并（??）运算符

## 可选链 `?.` 和空值合并 `??`

### 可选链
可选链用于安全访问可能是 `null` 或 `undefined` 的值。如果左侧是 nullish，表达式短路并返回 `undefined`，不会继续访问属性或调用函数。

```js
const user = null;

const city = user?.address?.city; // undefined
const first = user?.friends?.[0]; // undefined
const result = user?.getName?.(); // undefined
```

可选链只对它左侧紧邻的访问链短路。

```js
const value = obj?.a.b;
// 如果 obj 是 null/undefined，返回 undefined；
// 如果 obj.a 是 null/undefined，仍会在访问 .b 时报错。

const safe = obj?.a?.b;
```

可选链不能出现在赋值左侧。

```js
// user?.name = 'Alice'; // SyntaxError
```

### 空值合并
`??` 只在左侧是 `null` 或 `undefined` 时返回右侧值，不会把 `0`、空字符串、`false` 当成缺失。

```js
0 ?? 100; // 0
'' ?? 'default'; // ''
false ?? true; // false
null ?? 'default'; // default
undefined ?? 'default'; // default
```

和 `||` 的区别：
```js
const config = { timeout: 0, title: '' };

const timeout1 = config.timeout || 5000; // 5000，可能错
const timeout2 = config.timeout ?? 5000; // 0

const title1 = config.title || 'Untitled'; // Untitled，可能错
const title2 = config.title ?? 'Untitled'; // ''
```

### 不能无括号混用
`??` 不能和 `||`、`&&` 在同一表达式里无括号混用。

```js
// const value = a ?? b || c; // SyntaxError
const value = (a ?? b) || c;
```

### 逻辑赋值
```js
options.timeout ??= 5000; // 只有 null/undefined 才赋值
flag ||= true;            // 假值才赋值
ready &&= compute();      // 真值才赋值
```

面试总结：`?.` 解决安全访问，`??` 解决默认值不误伤有效假值。

<!-- id: js-037; difficulty: 2; tags: 错误处理, Error, try/catch; source: 高频 -->
# JavaScript 中的错误类型和错误处理最佳实践

## JavaScript 错误类型和处理实践

### 常见内置错误
```js
SyntaxError;    // 语法错误，通常解析阶段抛出
ReferenceError; // 访问不存在的绑定
TypeError;      // 值类型不支持当前操作
RangeError;     // 数值范围不合法
URIError;       // encodeURI/decodeURI 参数不合法
AggregateError; // 多个错误聚合，例如 Promise.any 全部失败
EvalError;      // 历史遗留，极少直接使用
```

`Error` 对象常见字段有 `name`、`message`、`stack`，现代代码还可以用 `cause` 关联底层错误。

```js
try {
  throw new Error('database failed');
} catch (cause) {
  throw new Error('load user failed', { cause });
}
```

### try/catch/finally
```js
function divide(a, b) {
  if (b === 0) throw new RangeError('division by zero');
  return a / b;
}

try {
  divide(10, 0);
} catch (error) {
  if (error instanceof RangeError) {
    console.error(error.message);
  } else {
    throw error;
  }
} finally {
  cleanup();
}
```

`catch` 只处理自己能恢复或能补充上下文的错误。未知错误不要吞掉，应重新抛出或上报。

### 自定义错误
```js
class AppError extends Error {
  constructor(message, options = {}) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.code = options.code;
    this.statusCode = options.statusCode;
  }
}

class NetworkError extends AppError {}

throw new NetworkError('service unavailable', {
  code: 'NETWORK_ERROR',
  statusCode: 503,
});
```

自定义错误适合给业务错误增加 `code`、`statusCode`、`cause` 等结构化信息。

### 异步错误
```js
async function loadUser() {
  try {
    const res = await fetch('/api/user');

    if (!res.ok) {
      throw new NetworkError('request failed', { statusCode: res.status });
    }

    return res.json();
  } catch (error) {
    reportError(error);
    throw error;
  }
}
```

注意：`fetch` 只会在网络失败等情况下 reject，HTTP 4xx/5xx 不会自动进入 `catch`，需要检查 `res.ok`。

### 全局兜底
```js
window.addEventListener('error', (event) => {
  reportError(event.error ?? event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  reportError(event.reason);
});
```

全局错误监听只适合兜底上报，不应替代局部错误处理。

### 最佳实践
1. 不要 `catch (e) {}` 静默吞错。
2. 抛出 `Error` 或其子类，不要直接抛字符串。
3. 在边界层把错误转换成用户可理解的提示，在日志里保留技术细节。
4. 用 `finally` 做资源清理、loading 收尾、锁释放。
5. Promise 链要返回或 await，避免漏掉 rejected Promise。

<!-- id: js-038; difficulty: 2; tags: requestAnimationFrame, 动画, 性能; source: 高频 -->
# 说说 requestAnimationFrame 和 setTimeout 的区别

## `requestAnimationFrame` 和 `setTimeout` 的区别

### `setTimeout` / `setInterval`
```js
setInterval(() => updateAnimation(), 16);
```

定时器按时间排队执行，不和浏览器绘制帧严格同步。主线程繁忙、页面后台、嵌套定时器、浏览器节流都会让它延迟。用固定 16ms 做动画容易和真实刷新率错位，也可能在不需要绘制时继续运行。

### `requestAnimationFrame`（rAF）
`requestAnimationFrame` 会在浏览器下一次重绘前调用回调，适合动画、Canvas/WebGL 绘制和需要和渲染同步的 DOM 写入。

```js
let start = null;
let rafId = 0;

function animate(timestamp) {
  if (start === null) start = timestamp;

  const elapsed = timestamp - start;
  const x = Math.min(elapsed / 10, 200);

  element.style.transform = `translateX(${x}px)`;

  if (elapsed < 2000) {
    rafId = requestAnimationFrame(animate);
  }
}

rafId = requestAnimationFrame(animate);

// 取消
cancelAnimationFrame(rafId);
```

rAF 回调会收到高精度时间戳。动画应基于时间差计算进度，而不是假设每帧固定 16.67ms，因为设备可能是 60Hz、120Hz，也可能掉帧。

### 对比
| 维度 | `requestAnimationFrame` | `setTimeout` |
| --- | --- | --- |
| 时机 | 下一帧绘制前 | 指定延迟后进入任务队列 |
| 动画适配 | 跟随刷新率 | 不跟随刷新率 |
| 后台页面 | 通常暂停或明显降频 | 通常也会被节流 |
| 时间精度 | 回调参数给高精度时间戳 | 实际执行可能晚于设定时间 |
| 场景 | 动画、绘制、滚动视觉更新 | 延时任务、超时控制、轮询 |

### 动画循环模板
```js
function createAnimation(callback) {
  let rafId = 0;
  let running = false;

  const step = (timestamp) => {
    if (!running) return;
    callback(timestamp);
    rafId = requestAnimationFrame(step);
  };

  return {
    start() {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(step);
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    },
  };
}
```

### 实践建议
1. 动画优先改 `transform`、`opacity`，少改 `left/top/width/height`。
2. 在 rAF 中集中 DOM 写入，避免同一帧反复读写布局属性导致 forced reflow。
3. 非视觉延时逻辑用 `setTimeout`，不要滥用 rAF。

<!-- id: js-039; difficulty: 2; tags: ES2022, ES2023, ES2024, 新特性; source: 高频 -->
# ES2022+ 有哪些新特性？

## ES2022+ 常见新特性

### ES2022
#### class fields、私有字段、静态块
```js
class Counter {
  static instances = 0;
  static {
    console.log('class initialized');
  }

  #count = 0;

  click() {
    this.#count += 1;
    return this.#count;
  }
}
```

#### 顶层 await
```js
// 只能在 ES Module 中使用
const config = await fetch('/config.json').then((r) => r.json());
export { config };
```

#### `Array.prototype.at` / `Object.hasOwn` / `Error.cause`
```js
[1, 2, 3].at(-1); // 3
Object.hasOwn({ a: 1 }, 'a'); // true

throw new Error('load failed', { cause: originalError });
```

### ES2023
#### 非变异数组方法
```js
const arr = [3, 1, 2];

arr.toSorted((a, b) => a - b); // [1, 2, 3]
arr.toReversed();              // [2, 1, 3]
arr.toSpliced(1, 1, 4);        // [3, 4, 2]
arr.with(0, 99);               // [99, 1, 2]
```

#### 从后查找
```js
[1, 2, 3, 2].findLast((x) => x < 3); // 2
[1, 2, 3, 2].findLastIndex((x) => x < 3); // 3
```

### ES2024
#### `Promise.withResolvers`
```js
const { promise, resolve, reject } = Promise.withResolvers();

setTimeout(() => resolve('done'), 1000);
await promise;
```

适合把 Promise 和外部 resolve/reject 分离，替代手写 deferred 模式。

#### `Object.groupBy` / `Map.groupBy`
```js
const items = [
  { type: 'fruit', name: 'apple' },
  { type: 'fruit', name: 'banana' },
  { type: 'tool', name: 'hammer' },
];

const byType = Object.groupBy(items, (item) => item.type);
const groupKeys = { fruit: { label: 'fruit' }, tool: { label: 'tool' } };
const byObjectKey = Map.groupBy(items, (item) => groupKeys[item.type]);
```

`Object.groupBy` 的分组 key 会变成属性键；需要对象 key 时用 `Map.groupBy`，并确保相同分组复用同一个 key 对象。

### ES2025 常见特性
#### Iterator helpers
```js
const result = Iterator.from([1, 2, 3, 4])
  .filter((x) => x % 2 === 0)
  .map((x) => x * 10)
  .toArray();

console.log(result); // [20, 40]
```

#### Set methods
```js
const a = new Set([1, 2, 3]);
const b = new Set([3, 4]);

a.union(b);        // Set {1, 2, 3, 4}
a.intersection(b); // Set {3}
a.difference(b);   // Set {1, 2}
a.isSubsetOf(new Set([1, 2, 3, 4])); // true
```

#### `RegExp.escape` / `Promise.try`
```js
const keyword = 'a+b?';
const re = new RegExp(RegExp.escape(keyword));

const value = await Promise.try(() => maybeSyncOrAsync());
```

#### JSON modules 和 import attributes
```js
import config from './config.json' with { type: 'json' };
```

### 面试建议
回答 ES2022+ 不必死背年份，重点说出：class 私有字段、顶层 await、不可变数组方法、groupBy、Promise.withResolvers、Iterator helpers、Set methods 等，并说明这些特性解决的实际问题。

<!-- id: js-040; difficulty: 2; tags: 类型转换, ToPrimitive, 隐式转换; source: 高频 -->
# 说说 JavaScript 中的隐式类型转换（ToPrimitive）

## JavaScript 隐式类型转换和 ToPrimitive

### ToPrimitive
对象参与加法、比较、字符串模板等运算时，会先转成原始值。大致顺序：
1. 如果对象实现了 `[Symbol.toPrimitive](hint)`，优先调用。
2. hint 为 `number` 时，普通对象通常先 `valueOf()`，再 `toString()`。
3. hint 为 `string` 时，通常先 `toString()`，再 `valueOf()`。
4. 如果两个方法都没有返回原始值，抛 `TypeError`。

```js
const obj = {
  [Symbol.toPrimitive](hint) {
    if (hint === 'number') return 10;
    if (hint === 'string') return 'ten';
    return 20;
  },
};

+obj; // 10
`${obj}`; // ten
obj + 1; // 21
```

没有 `Symbol.toPrimitive` 时：
```js
const obj = {
  valueOf() { return 42; },
  toString() { return 'hello'; },
};

+obj; // 42
`${obj}`; // hello
obj + ''; // '42'
```

### `+` 运算符
`+` 比较特殊：先把两侧转原始值；如果任一侧是字符串，就做字符串拼接；否则做数字或 BigInt 加法。

```js
1 + '2'; // '12'
1 + true; // 2
1 + null; // 1
1 + undefined; // NaN
'5' - 1; // 4，减法只做数值运算
```

### 宽松相等和比较
```js
0 == false; // true
'' == false; // true
null == undefined; // true
null == 0; // false

'5' > 3; // true
null > 0; // false
null >= 0; // true
```

`null >= 0` 为 true 是因为关系比较会把 `null` 转为 `0`；但 `null == 0` 有单独的抽象相等规则，不会这么转。

### ToBoolean
假值只有这些：`false`、`0`、`-0`、`0n`、空字符串、`null`、`undefined`、`NaN`。

```js
Boolean([]); // true
Boolean({}); // true
Boolean('0'); // true
Boolean(new Boolean(false)); // true，对象都是真值
```

### 经典题
```js
[] == 0; // true，[] -> '' -> 0
[1] == 1; // true，[1] -> '1' -> 1
[] == ![]; // true，![] -> false，[] -> '' -> 0，false -> 0
```

### 实践建议
默认使用 `===`，避免依赖隐式转换。需要显式转换时，用 `Number()`、`String()`、`Boolean()` 或业务解析函数表达意图。

<!-- id: js-041; difficulty: 2; tags: 展开运算符, 剩余参数, ES6; source: 高频 -->
# 展开运算符和剩余参数的用法与区别

## 展开语法和剩余语法

### 展开语法（spread）
展开语法出现在调用、数组字面量或对象字面量中，把一个值展开成多个元素或属性。

```js
const a = [1, 2];
const b = [3, 4];

const merged = [...a, ...b]; // [1, 2, 3, 4]
const copy = [...a]; // 浅拷贝

Math.max(...merged); // 4

[...'hello']; // ['h', 'e', 'l', 'l', 'o']
[...new Set([1, 1, 2])]; // [1, 2]
```

数组和函数参数中的 spread 要求右侧是 iterable。对象展开不是迭代协议，而是复制对象的自有可枚举属性。

```js
const obj1 = { a: 1, b: 2 };
const obj2 = { b: 3, c: 4 };

const obj = { ...obj1, ...obj2 }; // { a: 1, b: 3, c: 4 }
```

对象展开是浅拷贝，后面的属性覆盖前面的同名属性，会触发 getter，不复制原型和完整属性描述符。

### 剩余语法（rest）
剩余语法出现在函数参数或解构赋值中，把剩下的参数或属性收集起来。

```js
function sum(first, ...rest) {
  return first + rest.reduce((total, n) => total + n, 0);
}

sum(1, 2, 3, 4); // 10
```

剩余参数必须放在形参最后，并且得到的是真数组。

```js
const [head, ...tail] = [1, 2, 3];
console.log(head); // 1
console.log(tail); // [2, 3]

const { a, ...others } = { a: 1, b: 2, c: 3 };
console.log(others); // { b: 2, c: 3 }
```

解构里的 rest 也必须是最后一个位置。对象 rest 会排除已解构的属性，并收集剩余自有可枚举属性。

### 和 arguments 的区别
```js
function oldStyle() {
  const args = Array.from(arguments);
  return args.reduce((sum, n) => sum + n, 0);
}

function modern(...args) {
  return args.reduce((sum, n) => sum + n, 0);
}
```

`arguments` 是类数组，箭头函数没有自己的 `arguments`；剩余参数是普通数组，类型和意图更清晰。

### 总结
同样是 `...`：放在“使用值”的位置是展开，放在“接收值”的位置是剩余。

<!-- id: js-042; difficulty: 2; tags: 尾调用, 递归, 优化; source: 高频 -->
# 什么是尾调用优化？

## 尾调用优化（TCO）

### 什么是尾调用
尾调用指函数返回前的最后一步就是调用另一个函数，并且直接返回它的结果。

```js
function foo(x) {
  return bar(x); // 尾调用
}

function baz(x) {
  return bar(x) + 1; // 不是尾调用，调用后还要做 +1
}

function qux(x) {
  const y = bar(x);
  return y; // 通常不按尾调用理解，因为还有当前栈帧的临时状态
}
```

尾调用不一定是递归；尾递归是尾调用的一种特殊情况。

### 尾递归
```js
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1); // 不是尾调用
}

function factorialTail(n, acc = 1) {
  if (n <= 1) return acc;
  return factorialTail(n - 1, acc * n); // 尾调用
}
```

普通递归每次调用都会保留栈帧，空间复杂度是 O(n)，递归太深会栈溢出。TCO/Proper Tail Calls 可以复用当前栈帧，把尾递归空间降到 O(1)。

### JavaScript 现实情况
ES 规范曾定义严格模式下的 Proper Tail Calls，但主流引擎支持很有限，Chrome、Node.js 等不能依赖它来避免栈溢出。面试里可以讲原理，但工程代码不要假设尾递归会被优化。

### 蹦床函数（Trampoline）
```js
function trampoline(fn) {
  return function run(...args) {
    let result = fn(...args);

    while (typeof result === 'function') {
      result = result();
    }

    return result;
  };
}

const factorial = trampoline(function fact(n, acc = 1) {
  if (n <= 1) return acc;
  return () => fact(n - 1, acc * n);
});

factorial(100000);
```

蹦床的思路是把递归调用改成返回下一个步骤的函数，再用循环反复执行，从而避免调用栈增长。

### 实践建议
深递归场景优先考虑循环、显式栈、分治分片或蹦床。TCO 是语言和引擎优化概念，不是当前 Web/Node 工程里的稳定依赖。

<!-- id: js-043; difficulty: 3; tags: V8, JIT, 隐藏类, 内联缓存, 性能; source: 高频 -->
# V8 引擎的 JIT 编译原理（隐藏类、内联缓存）

## V8 JIT、隐藏类和内联缓存

### 分层执行流水线
V8 的具体管线会随版本演进，但核心思路是“先快启动，再根据运行时反馈逐步优化”。

```txt
源码 -> Parser -> AST
     -> Ignition 解释器生成并执行字节码
     -> Sparkplug 基线编译器快速生成机器码
     -> Maglev 中层优化编译器处理热函数
     -> TurboFan 优化编译器生成更激进的优化代码
```

新版本 V8 还在推进 Turboshaft 等编译器基础设施。面试不必死背每一层版本细节，重点是：解释执行收集类型反馈，热点代码进入 JIT，优化代码基于假设运行，假设失效会反优化。

### 隐藏类（Hidden Class / Shape）
V8 会给对象结构建立隐藏类。相同属性集合、相同添加顺序的对象可以共享隐藏类，属性访问就能从“查字典”优化成“按偏移读写”。

```js
function Point(x, y) {
  this.x = x;
  this.y = y;
}

const p1 = new Point(1, 2);
const p2 = new Point(3, 4); // 和 p1 形状一致，更利于优化
```

容易破坏隐藏类稳定性的写法：
```js
const a = {};
a.x = 1;
a.y = 2;

const b = {};
b.y = 2;
b.x = 1; // 添加顺序不同，形状可能不同

delete a.x; // 可能让对象退化到字典模式
```

实践建议：构造函数或 class constructor 里一次性初始化字段；不同实例尽量保持字段顺序一致；少用 `delete`，需要表示空值时可以设为 `undefined` 或 `null`。

### 内联缓存（Inline Cache, IC）
```js
function getX(obj) {
  return obj.x;
}
```

第一次执行 `getX` 时，V8 会记录“这个调用点见过什么隐藏类、属性 x 在哪个偏移”。如果后续总是同一种形状，这个调用点是 monomorphic，最快；如果少量形状，是 polymorphic；如果形状太多，会变成 megamorphic，优化空间下降。

```js
getX(new Point(1, 2));
getX(new Point(3, 4)); // 同形状，IC 稳定
getX({ x: 1, z: 9 });  // 新形状，IC 变复杂
```

### 投机优化和反优化
```js
function add(a, b) {
  return a + b;
}

add(1, 2);
add(3, 4); // 类型反馈显示常用 number，优化器可能生成数值快路径
add('x', 'y'); // 假设失效，可能 deopt 回较低层执行
```

JIT 会根据历史类型反馈做投机优化。参数类型、对象形状、数组元素类型稳定时更容易优化；突然换类型、稀疏数组、频繁改变对象结构会增加反优化概率。

### 性能建议
1. 热路径中保持对象 shape 和函数参数类型稳定。
2. 构造阶段初始化所有字段，避免后续随意增删属性。
3. 数值密集数据用 TypedArray，避免混入不同类型。
4. 不要为了“迎合 JIT”牺牲清晰结构；先用 Performance/Profiler 找到真实热点，再做针对性优化。
5. 不同 V8 版本优化策略会变，微优化要以实测为准。

<!-- id: js-044; difficulty: 3; tags: 内存泄漏, GC, 性能, 调试; source: 高频 -->
# 详解 JavaScript 内存泄漏的场景和排查方法

## JavaScript 内存泄漏场景和排查

### 什么是内存泄漏
对象已经不再被业务需要，但仍然被某条引用链从 GC Roots 访问到，导致垃圾回收器不能回收它。关键不是“占用内存大”，而是“无用对象持续可达”。

### 常见场景
#### 1. 意外全局变量
```js
function createLeak() {
  leak = new Array(1000000); // 非严格模式下变成全局变量
}
```

使用严格模式、ES Module、lint 规则可以避免这类问题。

#### 2. 未清除的事件监听
```js
class Component {
  mount() {
    this.onResize = () => this.render();
    window.addEventListener('resize', this.onResize);
  }

  unmount() {
    window.removeEventListener('resize', this.onResize);
  }
}
```

全局对象持有监听器，监听器闭包又持有组件实例，就会形成长期引用链。

#### 3. 定时器、订阅和异步任务未清理
```js
const timer = setInterval(() => poll(), 1000);
clearInterval(timer);

const controller = new AbortController();
fetch('/api', { signal: controller.signal });
controller.abort();
```

WebSocket、RxJS subscription、MutationObserver、IntersectionObserver 等也要在组件销毁时断开。

#### 4. Detached DOM
```js
let button = document.querySelector('#btn');
button.remove();

// 如果 JS 变量、缓存、闭包仍引用 button，它就不会被回收。
button = null;
```

DOM 已从页面移除，但 JS 仍持有引用，是前端很常见的泄漏。

#### 5. 闭包持有大对象
```js
function createHandler() {
  const largeData = new Array(1000000).fill('data');

  return function handler() {
    return largeData[0];
  };
}
```

闭包不是泄漏，只有当它长期可达且持有无用大对象时才是问题。

#### 6. 缓存无限增长
```js
const cache = new Map();

function process(key, data) {
  cache.set(key, heavyProcess(data));
}
```

需要设置容量、过期时间、LRU 淘汰，或者在 key 是对象且不需要枚举时使用 WeakMap。

### DevTools 排查流程
1. Performance 面板录制操作流程，观察 JS Heap 是否反复操作后持续抬升且不回落。
2. Memory 面板拍 Heap Snapshot，操作前后各拍一次，对比增量对象。
3. 查看对象 Retainers，找到是谁还在引用它。
4. 对 Detached DOM tree、listener、timer、closure、Map cache 等重点排查。
5. 用 Allocation instrumentation on timeline 找出持续分配但未释放的代码路径。

### 预防实践
- 组件卸载时清理事件、定时器、观察者、订阅、Worker、WebSocket。
- 缓存必须有上限或淘汰策略。
- DOM 元数据优先用 WeakMap；WeakRef 和 FinalizationRegistry 只适合少数高级场景，不要作为常规资源释放机制。
- 避免长生命周期闭包捕获大对象，用完后断开引用。
- 建立内存回归场景，反复执行同一用户流程看堆是否稳定。

<!-- id: js-045; difficulty: 3; tags: Web Workers, 多线程, 并发, SharedArrayBuffer; source: 高频 -->
# JavaScript 并发模型与 Web Workers

## JavaScript 并发模型与 Web Workers

### 主线程并发模型
浏览器主线程负责执行 JS、处理用户事件、样式布局和绘制。异步 I/O、定时器、事件循环可以让任务并发排队，但同一时刻主线程只能执行一段 JS。CPU 密集任务会阻塞 UI。

```js
function heavyCompute() {
  let sum = 0;
  for (let i = 0; i < 1e9; i += 1) sum += i;
  return sum;
}

heavyCompute(); // 主线程长时间不可响应
```

### Web Worker
Worker 在独立线程运行 JS，适合把 CPU 密集任务移出主线程。

```js
// main.js
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

worker.postMessage({ numbers: largeArray });

worker.onmessage = (event) => {
  console.log(event.data.result);
};

worker.onerror = (event) => {
  console.error(event.message);
};

// 不再使用时释放线程资源
worker.terminate();
```

```js
// worker.js
self.onmessage = (event) => {
  const { numbers } = event.data;
  const result = numbers.reduce((sum, n) => sum + n, 0);

  self.postMessage({ result });
};
```

### 通信和数据传递
`postMessage` 默认使用结构化克隆，复制大对象有成本。大二进制数据可以用 Transferable 转移所有权，避免拷贝。

```js
const buffer = new ArrayBuffer(1024 * 1024);
worker.postMessage({ buffer }, [buffer]);
// 发送后主线程里的 buffer 会被 detached，所有权转给 worker。
```

### SharedArrayBuffer + Atomics
`SharedArrayBuffer` 允许多个线程共享同一块内存，`Atomics` 提供原子读写和同步。

```js
const buffer = new SharedArrayBuffer(4);
const view = new Int32Array(buffer);

Atomics.store(view, 0, 1);
Atomics.add(view, 0, 1);
Atomics.load(view, 0);
```

浏览器中使用 `SharedArrayBuffer` 通常需要跨源隔离（COOP/COEP）。`Atomics.wait` 会阻塞线程，在浏览器主线程不可用，通常放在 Worker 中使用。

### Worker 限制
1. 不能直接访问 DOM，也没有 `window`，全局对象通常是 `self`。
2. 与主线程通信是消息模型，存在序列化、复制或转移成本。
3. 可以使用很多 Web API，例如 `fetch`、WebSocket、IndexedDB、WebAssembly，但不是所有 DOM 相关 API 都可用。
4. Worker 启动和通信都有成本，短小任务不一定值得拆出去。

### Worker 类型和场景
- Dedicated Worker：单页面或单脚本独占，最常用。
- Shared Worker：多个同源上下文共享。
- Service Worker：网络代理、缓存、离线能力，不用于直接计算 UI 任务。
- Worklet：如 AudioWorklet、PaintWorklet，面向特定渲染或音频管线。

适合场景：图片/视频处理、压缩解压、加密、复杂排序和搜索、WASM 计算、大数据解析、后台预处理。UI 更新和 DOM 操作仍要回到主线程。

<!-- id: js-046; difficulty: 3; tags: 事件委托, 事件冒泡, 性能, DOM; source: 高频 -->
# 详解 JavaScript 的事件委托机制及其实现

## 事件委托（Event Delegation）

### 原理
事件委托利用事件冒泡：不在每个子元素上绑定监听器，而是在共同祖先上统一监听，再根据事件目标判断真正命中的子元素。

```html
<ul id='list'>
  <li data-id='1'>Item 1</li>
  <li data-id='2'>Item 2</li>
  <li data-id='3'>Item 3</li>
</ul>
```

```js
const list = document.querySelector('#list');

list.addEventListener('click', (event) => {
  const item = event.target.closest('li[data-id]');

  if (!item || !list.contains(item)) return;

  console.log(item.dataset.id);
});
```

`contains` 很重要：`closest` 可能沿着 DOM 找到委托容器外的匹配元素，尤其是复杂嵌套时要防止误命中。

### 通用封装
```js
function delegate(root, type, selector, handler, options) {
  const listener = (event) => {
    const target = event.target.closest?.(selector);

    if (!target || !root.contains(target)) return;

    handler.call(target, event, target);
  };

  root.addEventListener(type, listener, options);

  return () => root.removeEventListener(type, listener, options);
}

const cleanup = delegate(list, 'click', 'li[data-id]', (event, item) => {
  console.log(item.dataset.id);
});
```

返回 cleanup 方便组件卸载时移除监听器。

### 优点
1. 减少监听器数量，降低内存和绑定成本。
2. 动态新增的子元素自动生效。
3. 把同类交互集中处理，更适合列表、表格、菜单等结构。

### 边界和注意事项
1. 不是所有事件都会冒泡，例如 `focus`、`blur` 不冒泡，可用 `focusin`、`focusout` 或捕获阶段。
2. `mouseenter`、`mouseleave` 不冒泡，委托时常用 `mouseover`、`mouseout` 并判断 relatedTarget。
3. 子元素调用 `stopPropagation()` 会阻止父级委托监听器收到事件。
4. Shadow DOM 中事件目标可能被 retarget，需要结合 `event.composedPath()` 判断。
5. 高频事件如 scroll、mousemove 委托后仍需节流、防抖或 passive 优化。

### 事件传播
事件传播通常分为捕获阶段、目标阶段、冒泡阶段。

```js
element.addEventListener('click', handler, { capture: true });

event.stopPropagation();
event.stopImmediatePropagation();
event.preventDefault();
```

<!-- id: js-047; difficulty: 3; tags: AbortController, fetch, 异步取消; source: 高频 -->
# 描述 JavaScript 中的 AbortController 和取消异步操作

## AbortController 和取消异步操作

### 基本用法
`AbortController` 是 Web API，用来发出取消信号。`fetch`、流、部分 DOM API 和很多第三方库都可以接收 `signal`。

```js
const controller = new AbortController();
const { signal } = controller;

fetch('/api/data', { signal })
  .then((res) => res.json())
  .catch((error) => {
    if (error.name === 'AbortError') return;
    throw error;
  });

controller.abort();
```

`abort()` 只能触发一次。触发后 `signal.aborted` 变为 `true`，后续复用同一个 signal 的操作会立即处于取消状态。

### abort reason 和状态检查
```js
const controller = new AbortController();

controller.signal.addEventListener('abort', () => {
  console.log(controller.signal.reason);
});

controller.abort(new Error('user cancelled'));
controller.signal.throwIfAborted();
```

现代环境支持 `abort(reason)`、`signal.reason` 和 `throwIfAborted()`。兼容旧环境时仍要处理 `AbortError`。

### 超时控制
```js
const response = await fetch('/api/data', {
  signal: AbortSignal.timeout(3000),
});
```

手写兼容版本：
```js
function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new DOMException('Timeout', 'TimeoutError'));
  }, timeout);

  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}
```

### 组合多个取消条件
```js
const userController = new AbortController();
const signal = AbortSignal.any([
  userController.signal,
  AbortSignal.timeout(3000),
]);

await fetch('/api/data', { signal });
```

`AbortSignal.any()` 可以把用户取消、超时、页面卸载等多个信号合并。

### React 中使用
```js
useEffect(() => {
  const controller = new AbortController();

  fetch('/api/user', { signal: controller.signal })
    .then((res) => res.json())
    .then(setUser)
    .catch((error) => {
      if (error.name !== 'AbortError') setError(error);
    });

  return () => controller.abort();
}, []);
```

组件卸载或依赖变化时取消未完成请求，可以避免无意义请求和过期响应写入状态。

### 注意事项
1. 取消是协作式的：API 必须支持 `signal` 才能被真正取消。
2. `Promise.race` 做超时不会自动取消输掉的 fetch，仍要配合 AbortController。
3. 一个 controller 可以取消多个请求，但不能 reset；需要新一轮操作时创建新的 controller。
4. fetch 被取消不代表服务端一定停止处理请求，只是客户端不再等待结果。

<!-- id: js-048; difficulty: 3; tags: 并发控制, Promise, 调度, 手写; source: 字节 -->
# 手写一个并发控制器（限制并发请求数量）

## 手写并发控制器

### 场景
有很多异步任务，但同一时间最多只允许 N 个执行。例如 100 个请求，每次最多并发 3 个。

### 队列调度器
```js
class ConcurrencyScheduler {
  constructor(limit) {
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new RangeError('limit must be a positive integer');
    }

    this.limit = limit;
    this.running = 0;
    this.queue = [];
  }

  add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.#run();
    });
  }

  #run() {
    while (this.running < this.limit && this.queue.length > 0) {
      const item = this.queue.shift();
      this.running += 1;

      Promise.resolve()
        .then(item.task)
        .then(item.resolve, item.reject)
        .finally(() => {
          this.running -= 1;
          this.#run();
        });
    }
  }
}
```

`Promise.resolve().then(item.task)` 可以捕获 task 同步抛出的错误，保证它会走 reject。

```js
const scheduler = new ConcurrencyScheduler(3);
const urls = Array.from({ length: 10 }, (_, i) => `/api/${i}`);

const results = await Promise.all(
  urls.map((url) => scheduler.add(() => fetch(url).then((r) => r.json()))),
);
```

### 保持结果顺序的 pMap
```js
function pMap(items, mapper, limit) {
  const results = new Array(items.length);
  let nextIndex = 0;
  let running = 0;
  let rejected = false;

  return new Promise((resolve, reject) => {
    const launch = () => {
      if (rejected) return;

      if (nextIndex >= items.length && running === 0) {
        resolve(results);
        return;
      }

      while (running < limit && nextIndex < items.length) {
        const current = nextIndex;
        nextIndex += 1;
        running += 1;

        Promise.resolve()
          .then(() => mapper(items[current], current))
          .then((value) => {
            results[current] = value;
          })
          .catch((error) => {
            rejected = true;
            reject(error);
          })
          .finally(() => {
            running -= 1;
            launch();
          });
      }
    };

    launch();
  });
}

const data = await pMap(
  urls,
  (url) => fetch(url).then((r) => r.json()),
  3,
);
```

### 关键点
1. 任务要用函数包起来，不能提前开始执行。
2. `running` 记录当前并发数，队列完成一个就补一个。
3. 返回的 Promise 要透传每个任务的成功或失败。
4. 结果顺序通常应按输入顺序保存，而不是完成顺序。
5. 请求取消、重试、优先级、公平性可以在这个基础上扩展。

<!-- id: js-049; difficulty: 3; tags: BigInt, 数字精度, ES2020; source: 高频 -->
# 说说 JavaScript 中 BigInt 的使用场景和注意事项

## BigInt 的使用场景和注意事项

### 为什么需要 BigInt
`Number` 使用 IEEE 754 双精度浮点数，整数安全范围是 `-(2^53 - 1)` 到 `2^53 - 1`。

```js
Number.MAX_SAFE_INTEGER; // 9007199254740991
9007199254740991 + 1; // 9007199254740992
9007199254740991 + 2; // 9007199254740992，精度丢失
```

`BigInt` 可以表示任意精度整数。

```js
const a = 9007199254740991n;
const b = BigInt('9007199254740993');

console.log(a + 2n); // 9007199254740993n
console.log(typeof b); // bigint
```

### 运算规则
```js
42n + 1n; // 43n
42n + 1; // TypeError，不能和 Number 混合算术运算

5n / 2n; // 2n，整数除法会截断小数部分
42n == 42; // true
42n === 42; // false
```

可以和 Number 做关系比较，但算术运算不能混用，必须显式转换。

```js
Number(42n); // 42，过大时可能丢精度
BigInt(42); // 42n
```

### 不支持的能力
```js
+42n; // TypeError，不支持一元加
Math.sqrt(4n); // TypeError，Math 方法不接收 BigInt
1n >>> 0n; // TypeError，不支持无符号右移
```

BigInt 只能表示整数，不适合金额小数计算；金额通常用“最小货币单位整数”或 decimal 库。

### JSON 序列化
```js
JSON.stringify({ id: 42n }); // TypeError

const json = JSON.stringify(
  { id: 42n },
  (key, value) => (typeof value === 'bigint' ? value.toString() : value),
);
```

不建议随意修改 `BigInt.prototype.toJSON`，全局影响太大。通常用 replacer 或在接口层明确转字符串。

### 应用场景
1. 后端返回的超大 ID，例如雪花 ID、数据库 bigint 主键。
2. 位运算和整数算法需要超过安全整数范围。
3. Node.js 高精度时间：`process.hrtime.bigint()`。
4. WebAssembly i64 互操作。

### 注意
BigInt 运算不保证恒定时间，不应直接作为高安全要求的密码学实现基础。前端展示大整数 ID 时，接口最好用字符串传输，避免 JSON 解析阶段丢精度。

<!-- id: js-050; difficulty: 3; tags: WeakRef, FinalizationRegistry, GC, ES2021; source: 高频 -->
# 解释 JavaScript 中的 WeakRef 和 FinalizationRegistry

## WeakRef 和 FinalizationRegistry

### WeakRef
`WeakRef` 创建对对象的弱引用，不会阻止目标对象被垃圾回收。

```js
let obj = { name: 'Alice', data: new Array(1000000) };
const ref = new WeakRef(obj);

console.log(ref.deref()?.name); // Alice

obj = null;
// 未来某次 GC 后：
console.log(ref.deref()); // 可能是 undefined
```

`deref()` 返回目标对象或 `undefined`。调用 `deref()` 后如果拿到了对象，在当前同步执行片段内要把它放进局部变量再使用，避免多次读取结果不一致。

```js
const value = ref.deref();
if (value) {
  console.log(value.name);
}
```

### FinalizationRegistry
`FinalizationRegistry` 可以注册一个对象，当对象被 GC 后，未来某个时机调用清理回调。

```js
const registry = new FinalizationRegistry((key) => {
  cache.delete(key);
});

let value = { id: 1 };
registry.register(value, 'item-1');

value = null;
```

回调何时执行、是否一定执行，都不能作为业务逻辑保证。页面关闭、进程退出、引擎策略等都可能让回调不执行。

### 可选缓存示例
```js
class OptionalCache {
  #map = new Map();
  #registry = new FinalizationRegistry((key) => {
    this.#map.delete(key);
  });

  set(key, value) {
    if (value === null || typeof value !== 'object') {
      throw new TypeError('WeakRef target must be an object');
    }

    this.#map.set(key, new WeakRef(value));
    this.#registry.register(value, key, value);
  }

  get(key) {
    const value = this.#map.get(key)?.deref();

    if (value === undefined) {
      this.#map.delete(key);
    }

    return value;
  }

  delete(key) {
    const value = this.#map.get(key)?.deref();
    if (value) this.#registry.unregister(value);
    this.#map.delete(key);
  }
}
```

注意：`heldValue` 不要引用 target 本身，否则会让 target 继续可达，破坏回收目的。

### 适用场景
1. 内存敏感的可丢弃缓存。
2. 对象元数据的辅助清理。
3. 框架或底层库做弱关联优化。

### 不适合的场景
1. 关闭文件、连接、锁等必须可靠释放的资源。
2. 核心业务流程控制。
3. 期待在固定时间点执行清理。

可靠资源释放应该用显式生命周期：`close()`、`dispose()`、`AbortController`、组件卸载 cleanup 等。WeakRef/FinalizationRegistry 只能作为兜底辅助。

<!-- id: js-051; difficulty: 3; tags: Date, Temporal, 日期处理; source: 高频 -->
# 解释 JavaScript 中的 Temporal 提案和日期处理痛点

## Temporal 和 JavaScript 日期处理痛点

### Date 的痛点
```js
// 1. 月份从 0 开始
new Date(2024, 0, 1); // 2024-01-01

// 2. Date 可变，方法会原地修改
const d = new Date();
d.setMonth(d.getMonth() + 1);

// 3. 字符串解析容易踩时区和兼容性坑
new Date('2024-01-01'); // 按 UTC 日期解析
new Date('2024/01/01'); // 非标准格式，不同环境可能不同

// 4. 同一个类型同时表示时间点、本地日期、时区展示，语义混乱
// 5. 日期加减、夏令时、时区转换都不直观
```

`Date` 本质存储的是 Unix epoch 毫秒时间戳，但很多 API 又按本地时区解释和展示，导致“时间点”和“日历日期”经常混在一起。

### 现有方案
```js
import { addDays, format, differenceInDays } from 'date-fns';

const tomorrow = addDays(new Date(), 1);
format(tomorrow, 'yyyy-MM-dd');
differenceInDays(new Date('2024-01-10'), new Date('2024-01-01'));
```

`date-fns` 偏函数式、tree-shaking 友好；`dayjs` API 类似 Moment 且更轻；`Intl.DateTimeFormat` 适合本地化格式展示。

```js
new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'long',
  timeZone: 'Asia/Shanghai',
}).format(new Date());
```

### Temporal
Temporal 是新的 ECMAScript 日期时间 API，提供不可变、强语义、时区感知的日期时间类型。按 TC39 2026-04-03 草案，Temporal 已进入 Stage 4 Draft；实际项目仍要检查目标运行时支持情况，必要时使用 polyfill。

```js
const today = Temporal.Now.plainDateISO();
const tomorrow = today.add({ days: 1 });

console.log(today.toString());
console.log(tomorrow.toString());
```

### 常用类型
```js
Temporal.Instant.from('2024-01-01T00:00:00Z');
// 精确时间点，不带日历和时区展示语义

Temporal.PlainDate.from('2024-01-01');
// 只有日期，没有时间和时区，适合生日、日程日期

Temporal.PlainDateTime.from('2024-01-01T12:30');
// 日期 + 本地墙上时间，没有时区

Temporal.ZonedDateTime.from({
  timeZone: 'America/New_York',
  year: 2024,
  month: 3,
  day: 10,
  hour: 1,
  minute: 30,
});
// 日期时间 + IANA 时区，能处理 DST 规则

Temporal.Duration.from({ days: 3, hours: 2 });
```

### 日期计算
```js
const start = Temporal.PlainDate.from('2024-01-01');
const end = Temporal.PlainDate.from('2024-02-15');

const duration = start.until(end, { largestUnit: 'month' });
console.log(duration.toString());

const nextWeek = start.add({ weeks: 1 });
```

### 面试总结
Temporal 解决 Date 的三个核心问题：类型语义不清、可变对象、时区和日历计算困难。实际工程中要区分“精确时间点”用 `Instant`，“纯日期”用 `PlainDate`，“带时区的业务时间”用 `ZonedDateTime`。

<!-- id: js-052; difficulty: 3; tags: 正则表达式, 命名捕获组, 环视; source: 高频 -->
# 说说 JavaScript 中的正则表达式高级用法

## JavaScript 正则表达式高级用法

### 命名捕获组
```js
const re = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;
const match = re.exec('2024-01-15');

console.log(match.groups.year); // 2024
console.log('2024-01-15'.replace(re, '$<day>/$<month>/$<year>'));
```

命名组让复杂正则更可读，替换时也能用 `$<name>` 引用。

### 环视
```js
/\d+(?= dollars)/.exec('100 dollars'); // 正向前瞻
/\d+(?! dollars)/.exec('100 euros');   // 负向前瞻
/(?<=\$)\d+/.exec('$100');            // 正向后顾
/(?<!\$)\d+/.exec('€100');            // 负向后顾
```

环视只做条件判断，不消耗字符。Lookbehind 在旧环境里兼容性要额外确认。

### 常用 flag
```js
/hello.world/s.test('hello\nworld'); // s: dotAll，. 匹配换行
/\p{Script=Han}+/u.test('中文');     // u: Unicode 模式，支持属性转义
/abc/y.exec('abcabc');               // y: sticky，从 lastIndex 精确匹配
```

`d` flag 可以拿到捕获组索引范围。

```js
const match = /(?<word>\w+)/d.exec('hello');
console.log(match.indices.groups.word); // [0, 5]
```

### `matchAll`
```js
const str = 'cat bat sat';
const re = /(?<word>[a-z]at)/g;

for (const match of str.matchAll(re)) {
  console.log(match.groups.word, match.index);
}
```

`matchAll` 返回迭代器，适合全量遍历并保留捕获组信息。正则通常需要带 `g`。

### 动态构造正则
```js
const keyword = 'a+b?';
const re = new RegExp(RegExp.escape(keyword), 'g');
```

动态拼用户输入时必须转义。没有 `RegExp.escape` 的环境要使用可靠 polyfill，避免把用户输入当成正则语法。

### 性能和安全
1. 避免灾难性回溯，例如嵌套贪婪量词：`/(a+)+$/`。
2. 对不可信输入做长度限制，服务端要警惕 ReDoS。
3. 复杂解析任务不要硬写一个巨大正则，URL、HTML、JSON 应优先用专门解析器。
4. 需要复用的正则放到外层，避免在热路径重复创建。

### 实用例子
```js
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$]).{8,}$/;

'13812345678'.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');

const url = new URL('https://example.com/path?q=1');
// URL 解析优先用 URL API，而不是正则。
```

<!-- id: js-053; difficulty: 3; tags: 异步迭代器, for await...of, Generator, 流; source: 高频 -->
# 解释 JavaScript 中的异步迭代器（Async Iterator）

## 异步迭代器（Async Iterator）

### 基本概念
普通迭代器的 `next()` 返回 `{ value, done }`；异步迭代器的 `next()` 返回 Promise，Promise fulfilled 后得到 `{ value, done }`。它适合分页数据、流式响应、消息队列等异步数据流。

```js
const asyncRange = {
  from: 1,
  to: 3,
  [Symbol.asyncIterator]() {
    let current = this.from;
    const last = this.to;

    return {
      async next() {
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (current <= last) {
          return { value: current++, done: false };
        }

        return { value: undefined, done: true };
      },
    };
  },
};

for await (const num of asyncRange) {
  console.log(num);
}
```

`for await...of` 会依次等待每次 `next()` 的 Promise。循环中 `break` 或抛错时，会尝试调用迭代器的 `return()` 做清理。

### 异步 Generator
```js
async function* fetchPages(url) {
  let page = 1;

  while (true) {
    const res = await fetch(`${url}?page=${page}`);
    const data = await res.json();

    if (data.items.length === 0) return;

    yield data.items;
    page += 1;
  }
}

for await (const items of fetchPages('/api/list')) {
  render(items);
}
```

`async function*` 是实现异步迭代器最常见的方式，可以在函数内同时使用 `await` 和 `yield`。

### 分页和取消
```js
async function* paginate(fetchPage, signal) {
  let cursor;

  while (!signal?.aborted) {
    const { items, nextCursor } = await fetchPage(cursor, { signal });

    yield items;

    if (!nextCursor) return;
    cursor = nextCursor;
  }
}
```

异步迭代本身不是取消机制，需要配合 `AbortController`、`return()` 或业务标记释放资源。

### ReadableStream
```js
const response = await fetch('/api/stream');

for await (const chunk of response.body) {
  processChunk(chunk);
}
```

很多现代运行时中，ReadableStream 可以被异步迭代。处理流时要关注背压：消费者处理慢时，生产者应该被自然限速或显式暂停。

### 使用场景
1. 分页 API：一页页拉取和处理。
2. 流式响应：日志、SSE、fetch stream、文件读取。
3. 异步队列：生产者不断 push，消费者 `for await` 消费。
4. 数据管道：按需处理，避免一次性加载全部数据。

### 和 Promise.all 的区别
`Promise.all` 适合一组已知任务并行等待；异步迭代器适合数据逐步到达、数量可能未知、需要边读边处理的场景。

<!-- id: js-054; difficulty: 3; tags: typeof, instanceof, 类型系统, 原理; source: 高频 -->
# 详解 JavaScript 的类型系统和 typeof / instanceof 的底层原理

## JavaScript 类型系统与 `typeof` / `instanceof`

### 类型系统
JavaScript 的语言类型可以分为原始类型和对象类型。

原始类型：`undefined`、`null`、`boolean`、`number`、`bigint`、`string`、`symbol`。

对象类型：普通对象、数组、函数、Date、RegExp、Map、Set、Promise 等。函数是可调用对象。

### `typeof`
`typeof` 按规范中的类型判断返回字符串，适合判断原始类型和函数。

```js
typeof undefined; // undefined
typeof null; // object，历史遗留行为
typeof true; // boolean
typeof 42; // number
typeof 42n; // bigint
typeof 'str'; // string
typeof Symbol(); // symbol
typeof {}; // object
typeof []; // object
typeof function fn() {}; // function
```

`typeof null === 'object'` 是早期设计遗留，现代规范保留了这个行为以兼容 Web，不建议用“内部 type tag 位模式”作为现代解释。

### `instanceof`
`obj instanceof Constructor` 大致逻辑：
1. 如果右侧定义了 `Symbol.hasInstance`，优先调用它。
2. 否则取 `Constructor.prototype`。
3. 沿着左侧对象的原型链查找，看是否能找到这个 prototype。

```js
function myInstanceof(value, Constructor) {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    return false;
  }

  const hasInstance = Constructor?.[Symbol.hasInstance];
  if (typeof hasInstance === 'function') {
    return Boolean(hasInstance.call(Constructor, value));
  }

  const prototype = Constructor.prototype;
  if (prototype === null || (typeof prototype !== 'object' && typeof prototype !== 'function')) {
    throw new TypeError('prototype must be an object');
  }

  let current = Object.getPrototypeOf(value);
  while (current !== null) {
    if (current === prototype) return true;
    current = Object.getPrototypeOf(current);
  }

  return false;
}
```

### `instanceof` 局限
```js
const iframe = document.createElement('iframe');
document.body.appendChild(iframe);
const iframeArr = new iframe.contentWindow.Array();

iframeArr instanceof Array; // false，不同 realm 的 Array.prototype 不同
Array.isArray(iframeArr); // true
```

`Symbol.hasInstance` 也可以改变 `instanceof` 语义。

```js
class Even {
  static [Symbol.hasInstance](value) {
    return typeof value === 'number' && value % 2 === 0;
  }
}

2 instanceof Even; // true
```

### `Object.prototype.toString.call`
```js
const toString = Object.prototype.toString;

toString.call(null); // [object Null]
toString.call([]); // [object Array]
toString.call(new Date()); // [object Date]
toString.call(new Map()); // [object Map]
```

它通用性较好，但可被 `Symbol.toStringTag` 影响。

```js
const fake = { [Symbol.toStringTag]: 'Array' };
Object.prototype.toString.call(fake); // [object Array]
```

### 实践建议
1. 原始类型用 `typeof`，但 `null` 要单独判断。
2. 数组用 `Array.isArray()`。
3. 判断 Map、Set、Date 等内置对象可用 `toString.call` 或专用逻辑。
4. 跨 iframe/realm 时少依赖 `instanceof`。
5. 业务类型优先用显式字段、品牌标记或 TypeScript 类型系统，而不是复杂运行时猜测。

<!-- id: js-055; difficulty: 3; tags: Reflect, Proxy, 对象操作; source: 高频 -->
# 说说 JavaScript 中的 Reflect API 有哪些方法及用途

## Reflect API 的方法和用途

### 概述
`Reflect` 提供一组函数式对象操作 API，很多方法与 Proxy trap 一一对应。它常用于在 Proxy 中“增强后转发默认行为”。

### 属性读写
```js
const obj = {
  _name: 'Alice',
  get name() {
    return this._name;
  },
};

Reflect.get(obj, 'name');
Reflect.set(obj, 'age', 18);
Reflect.has(obj, 'toString'); // 对应 in，会查原型链
Reflect.deleteProperty(obj, 'age');
```

`receiver` 用于指定 getter/setter 内部的 `this`。

```js
const receiver = { _name: 'Bob' };
Reflect.get(obj, 'name', receiver); // Bob
```

### 键和属性描述符
```js
const sym = Symbol('id');
const target = { a: 1, [sym]: 2 };

Reflect.ownKeys(target); // ['a', Symbol(id)]
Reflect.getOwnPropertyDescriptor(target, 'a');
Reflect.defineProperty(target, 'b', {
  value: 2,
  writable: true,
  configurable: true,
});
```

`Reflect.ownKeys` 返回所有自有 key，包括不可枚举 key 和 Symbol key。

### 原型和扩展性
```js
Reflect.getPrototypeOf([]) === Array.prototype;
Reflect.setPrototypeOf(obj, null);

Reflect.isExtensible(obj);
Reflect.preventExtensions(obj);
```

### 函数调用和构造
```js
Reflect.apply(Math.max, null, [1, 2, 3]); // 3

function Person(name) {
  this.name = name;
}

const p = Reflect.construct(Person, ['Alice']);
```

`Reflect.construct(target, args, newTarget)` 可以指定 `new.target` 语义，常用于继承、代理构造器等底层场景。

### 和 Object / 操作符的区别
1. `Reflect.get` / `Reflect.set` 是函数形式，更适合元编程和转发。
2. `Reflect.defineProperty`、`Reflect.setPrototypeOf` 等返回 boolean 表示成功与否；对应的 `Object.*` 方法很多会直接抛错或返回对象。
3. `Reflect.has(obj, key)` 对应 `key in obj`。
4. `Reflect.deleteProperty(obj, key)` 对应 `delete obj[key]`。

### Proxy 中的典型用法
```js
const proxy = new Proxy(obj, {
  get(target, key, receiver) {
    track(target, key);
    return Reflect.get(target, key, receiver);
  },
  set(target, key, value, receiver) {
    const result = Reflect.set(target, key, value, receiver);
    if (result) trigger(target, key);
    return result;
  },
});
```

用 Reflect 转发可以保留原本语言语义，特别是 getter/setter、原型链、receiver 和返回 boolean 的约束。

<!-- id: js-056; difficulty: 1; tags: String, 字符串方法; source: 高频 -->
# 说说 String 常用方法

## String 常用方法

### 查找和匹配
```js
const str = 'Hello World';

str.indexOf('o');        // 4
str.lastIndexOf('o');    // 7
str.includes('World');   // true
str.startsWith('Hello'); // true
str.endsWith('World');   // true
str.search(/[A-Z]/);     // 0
str.match(/o/g);         // ['o', 'o']
```

### 提取
```js
str.slice(0, 5);     // Hello，支持负数
str.substring(0, 5); // Hello，不支持负数，会交换 start/end
str.charAt(0);       // H
str[0];              // H
str.at(-1);          // d，支持负索引
```

`slice` 更推荐，语义更直观。注意字符串索引多数按 UTF-16 code unit 工作，不等于用户看到的完整字符。

```js
'😀'.length; // 2
'😀'[0]; // 半个代理项
[...'😀']; // ['😀']，按 code point 展开
```

复杂 emoji、组合音标和多语言分词要用 `Intl.Segmenter` 等更专业 API。

### 转换和填充
```js
str.toUpperCase();
str.toLowerCase();
str.trim();
str.trimStart();
str.trimEnd();
str.padStart(15, '*');
str.padEnd(15, '-');
str.repeat(2);
```

本地化大小写可用 `toLocaleUpperCase()`、`toLocaleLowerCase()`。

### 替换
```js
str.replace('o', '0'); // 只替换第一个
str.replace(/o/g, '0');
str.replaceAll('o', '0');

'13812345678'.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
```

`replaceAll` 传正则时必须带 `g` flag。

### 分割、拼接和比较
```js
str.split(' '); // ['Hello', 'World']
'Hello'.concat(' ', 'World');

'a'.localeCompare('b'); // -1，适合本地化排序
```

`split('')` 也是按 code unit 分割，不适合完整 Unicode 字符。

### 模板字符串和标签模板
```js
const name = 'World';
const message = `Hello, ${name}!`;

function html(strings, ...values) {
  return strings.reduce((result, part, index) => {
    return result + part + (values[index] ?? '');
  }, '');
}

html`<strong>${name}</strong>`;
```

标签模板常用于 i18n、SQL builder、CSS-in-JS、HTML 转义等场景。

<!-- id: js-057; difficulty: 1; tags: IIFE, 作用域, 模块模式; source: 高频 -->
# 什么是立即执行函数表达式（IIFE）？

## IIFE（立即执行函数表达式）

### 定义
IIFE 是定义后立刻调用的函数表达式，常用来创建独立作用域。

```js
(function () {
  var privateValue = 'only here';
  console.log(privateValue);
})();

(function () {
  console.log('also works');
}());

(() => {
  console.log('arrow IIFE');
})();
```

外层括号的作用是把 `function` 声明变成函数表达式，否则 `function foo() {}()` 这类写法会有语法问题。也可以用 `!function () {}()` 等一元运算符形式，但可读性不如括号。

### 用途
#### 1. 避免全局污染
```js
(function () {
  var counter = 0;
})();
```

ES5 时代没有块级作用域，IIFE 可以限制 `var` 的作用域。

#### 2. 模块模式
```js
const Counter = (function () {
  let count = 0;

  return {
    increment() {
      count += 1;
    },
    value() {
      return count;
    },
  };
})();
```

通过闭包保存私有状态，只暴露公共 API。

#### 3. 修复 ES5 循环闭包
```js
for (var i = 0; i < 3; i += 1) {
  (function (index) {
    setTimeout(() => console.log(index), 0);
  })(i);
}
```

现代代码直接用 `let` 更简单。

```js
for (let i = 0; i < 3; i += 1) {
  setTimeout(() => console.log(i), 0);
}
```

#### 4. async IIFE
```js
(async () => {
  const data = await fetch('/api').then((r) => r.json());
  console.log(data);
})();
```

在没有顶层 await 的非模块脚本里，async IIFE 很常见。

### 现代替代
ES Module、块级作用域、class 私有字段和构建工具已经覆盖了很多 IIFE 的历史用途；但在脚本隔离、临时异步入口和老代码中仍会遇到 IIFE。

<!-- id: js-058; difficulty: 1; tags: 解构, ES6, 数组, 对象; source: 高频 -->
# 解释 JavaScript 中的解构赋值

## 解构赋值

### 数组解构
```js
const [a, b, c] = [1, 2, 3];
const [x, , z] = [1, 2, 3]; // 跳过第二项

const [p = 0, q = 0] = [1]; // p=1, q=0

const [head, ...tail] = [1, 2, 3, 4];
// head=1, tail=[2, 3, 4]

let m = 1;
let n = 2;
[m, n] = [n, m];
```

数组解构依赖可迭代协议，不只适用于数组。

```js
const [first] = new Set(['a', 'b']);
const [char] = 'hello';
```

### 对象解构
```js
const user = { name: 'Alice', age: 25 };

const { name, age } = user;
const { name: userName } = user;
const { role = 'user' } = user;

const { age: _, ...profile } = user;
```

对象解构按属性名匹配，不受属性顺序影响。默认值只在属性值为 `undefined` 时生效，`null` 不会触发默认值。

```js
const { a = 1 } = { a: undefined }; // 1
const { b = 1 } = { b: null }; // null
```

### 嵌套解构要防空
```js
const { address: { city } = {} } = user;

function greet({ name, age = 18 } = {}) {
  return `${name ?? 'Anonymous'} is ${age}`;
}
```

如果 `address` 是 `undefined`，没有 `= {}` 会抛错。函数参数解构也常给整个参数一个默认对象。

### 混合解构
```js
const data = {
  name: 'Alice',
  scores: [90, 85],
  address: { city: 'Beijing' },
};

const {
  name: displayName,
  scores: [firstScore, secondScore],
  address: { city },
} = data;
```

### 常见应用
```js
function minMax(arr) {
  return [Math.min(...arr), Math.max(...arr)];
}

const [min, max] = minMax([3, 1, 4]);

import { useState, useEffect } from 'react';

const {
  data: { users = [] } = {},
  meta: { total = 0 } = {},
} = await fetchUsers();
```

### 注意点
1. 对象 rest 只收集剩余自有可枚举属性。
2. 解构过深会降低可读性，API 数据复杂时可以分步解构。
3. 解构赋值给已声明变量时，对象解构要加括号：`({ a } = obj);`。

<!-- id: js-059; difficulty: 1; tags: null, undefined, 类型; source: 高频 -->
# null 和 undefined 的区别

## `null` 和 `undefined` 的区别

### `undefined`
`undefined` 表示“没有被赋值”或“取不到这个值”。

```js
let a;
console.log(a); // undefined

function fn() {}
console.log(fn()); // undefined

const obj = {};
console.log(obj.missing); // undefined

function greet(name) {
  console.log(name);
}
greet(); // undefined
```

### `null`
`null` 表示开发者有意设置的空值，通常表达“这里应该有值，但当前没有”。

```js
let currentUser = null;

document.querySelector('.missing'); // null
```

很多 DOM API 在找不到节点时返回 `null`，因为“查询已完成，但结果为空”。

### 类型和比较
```js
typeof undefined; // undefined
typeof null; // object，历史遗留行为

null == undefined; // true
null === undefined; // false

Boolean(null); // false
Boolean(undefined); // false
```

### 数值转换
```js
Number(null); // 0
Number(undefined); // NaN

null + 1; // 1
undefined + 1; // NaN
```

### 默认值行为
```js
const a = null ?? 'default'; // default
const b = undefined ?? 'default'; // default

const { x = 1 } = { x: null }; // null，解构默认值只处理 undefined
const { y = 1 } = {}; // 1
```

### 最佳实践
1. 不要主动把变量赋值为 `undefined`，让未赋值自然是 undefined。
2. 需要表达“刻意为空”时用 `null`。
3. 需要同时判断 `null` 和 `undefined` 时，可以有意识地用 `value == null`。
4. API 设计要统一：同一字段不要有时返回 `null`、有时省略、有时返回空字符串。

<!-- id: js-060; difficulty: 2; tags: Mixin, 组合, 设计模式, 继承; source: 高频 -->
# 说说 JavaScript 中的 Mixin 模式

## JavaScript Mixin 模式

### 定义
Mixin 是把一组可复用能力混入对象或类中的模式，用组合弥补单继承限制。它表达的是“can-do”能力，而不是严格的“is-a”继承关系。

### 对象 Mixin
```js
const Serializable = {
  serialize() {
    return JSON.stringify(this);
  },
  deserialize(json) {
    return Object.assign(this, JSON.parse(json));
  },
};

const Validatable = {
  validate() {
    return Object.values(this).every((value) => value !== null && value !== undefined);
  },
};

class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }
}

Object.assign(User.prototype, Serializable, Validatable);

const user = new User('Alice', 'alice@example.com');
user.serialize();
user.validate();
```

`Object.assign` 简单直接，但只复制可枚举属性，不复制完整属性描述符，也可能覆盖已有同名方法。

### 保留属性描述符的混入
```js
function mixin(target, ...sources) {
  for (const source of sources) {
    for (const key of Reflect.ownKeys(source)) {
      if (key === 'constructor') continue;
      const descriptor = Object.getOwnPropertyDescriptor(source, key);
      Object.defineProperty(target, key, descriptor);
    }
  }

  return target;
}
```

这个版本能复制 getter、setter、不可枚举属性和 Symbol key。

### 函数式 Mixin
```js
const withLogging = (Base) => class extends Base {
  log(message) {
    console.log(`[${this.constructor.name}] ${message}`);
  }
};

const withTimestamp = (Base) => class extends Base {
  getTimestamp() {
    return new Date().toISOString();
  }
};

class BaseModel {}

class User extends withTimestamp(withLogging(BaseModel)) {
  constructor(name) {
    super();
    this.name = name;
  }
}
```

函数式 Mixin 通过返回子类组合能力，更适合 class 体系，但继承层级会变深，调试栈和类型关系也更复杂。

### 与继承、组合的关系
- 继承：适合明确的 `is-a`，如 `Dog extends Animal`。
- Mixin：适合横向能力复用，如 logging、serializable、event emitter。
- 组合：把能力作为成员对象注入，依赖更显式，通常更容易测试。

### 风险
1. 命名冲突：多个 mixin 定义同名方法时覆盖顺序敏感。
2. 隐式依赖：mixin 方法可能假设实例上存在某些字段。
3. 菱形问题：多个能力依赖同一基类或同一方法时行为不清晰。
4. 类型推断复杂：TypeScript 中需要额外类型辅助。

### 实践建议
少量横向能力可以用 Mixin；复杂业务优先组合和显式依赖注入，避免把对象变成“什么都会”的大杂烩。

<!-- id: js-061; difficulty: 2; tags: 递归, 记忆化, 动态规划, 优化; source: 高频 -->
# 说说 JavaScript 中的尾递归和递归优化

## 尾递归和递归优化

### 普通递归的问题
递归的问题通常有两个：重复计算导致时间复杂度高，调用层级太深导致调用栈溢出。

```js
function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2); // 指数级重复计算
}
```

### 记忆化递归
```js
function memoize(fn, keyFn = (...args) => args.join('|')) {
  const cache = new Map();

  return function memoized(...args) {
    const key = keyFn(...args);
    if (cache.has(key)) return cache.get(key);

    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

const fib = memoize(function inner(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
});

fib(40); // O(n)
```

`JSON.stringify(args)` 做缓存 key 简单但有成本，也不适合所有参数类型。斐波那契超过一定范围会超出 Number 安全整数，需要 BigInt 或大数库。

### 尾递归
```js
function factorialTail(n, acc = 1n) {
  if (n <= 1n) return acc;
  return factorialTail(n - 1n, acc * n);
}
```

尾递归的形式是最后一步直接返回递归调用结果。理论上 Proper Tail Calls 可以复用栈帧，但主流 JS 引擎不能稳定依赖尾调用优化，因此尾递归在工程上仍可能栈溢出。

### 迭代替代递归
```js
function fibIter(n) {
  let prev = 0n;
  let curr = 1n;

  for (let i = 0; i < n; i += 1) {
    [prev, curr] = [curr, prev + curr];
  }

  return prev;
}
```

树遍历也可以用显式栈替代递归。

```js
function dfs(root) {
  if (!root) return [];

  const stack = [root];
  const result = [];

  while (stack.length > 0) {
    const node = stack.pop();
    result.push(node.value);

    if (node.right) stack.push(node.right);
    if (node.left) stack.push(node.left);
  }

  return result;
}
```

### 动态规划
```js
function fibDP(n) {
  if (n <= 1) return n;

  const dp = [0, 1];
  for (let i = 2; i <= n; i += 1) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }

  return dp[n];
}
```

能从小问题推到大问题时，bottom-up 动态规划通常比递归更稳定，也更容易控制空间。

### 总结
递归优化常见手段：记忆化减少重复计算，迭代或显式栈避免栈溢出，动态规划改写状态转移，蹦床函数模拟尾调用。JS 里不要依赖引擎自动 TCO。

<!-- id: js-062; difficulty: 2; tags: 函数式编程, 纯函数, 不可变, 组合; source: 高频 -->
# 说说 JavaScript 中的函数式编程概念

## JavaScript 函数式编程概念

### 1. 纯函数
纯函数满足两个条件：相同输入得到相同输出；不产生可观察副作用。

```js
const add = (a, b) => a + b;
const double = (arr) => arr.map((x) => x * 2);

let count = 0;
const increment = () => {
  count += 1; // 修改外部状态，非纯
};
```

纯函数更容易测试、缓存、并行和组合。

### 2. 不可变性
```js
const addUser = (users, user) => [...users, user];

const updateUser = (users, id, patch) =>
  users.map((user) => (user.id === id ? { ...user, ...patch } : user));
```

不可变不是“永远不创建变化”，而是避免原地修改已有数据，改为返回新数据。前端状态管理、React 渲染优化都很依赖这个思想。

### 3. 高阶函数
高阶函数是接收函数或返回函数的函数。

```js
const map = (fn) => (arr) => arr.map(fn);
const filter = (fn) => (arr) => arr.filter(fn);

const getAdults = filter((user) => user.age >= 18);
```

### 4. 函数组合
```js
const pipe = (...fns) => (value) =>
  fns.reduce((current, fn) => fn(current), value);

const slugify = pipe(
  (x) => x.trim(),
  (x) => x.toLowerCase(),
  (x) => x.replace(/\s+/g, '-'),
);

slugify('  Hello World  '); // hello-world
```

`pipe` 从左到右，`compose` 通常从右到左。组合要求每一步输入输出契合，复杂异步场景要用 Promise-aware pipe。

### 5. 柯里化和部分应用
```js
const isType = (type) => (value) => typeof value === type;
const isString = isType('string');

['a', 1, 'b'].filter(isString); // ['a', 'b']
```

先固定一部分参数，得到更具体的函数，便于复用和组合。

### 6. 副作用边界
函数式编程不是没有副作用，而是把副作用隔离在边界：网络请求、日志、DOM 操作、localStorage 写入等尽量放在外层，核心数据转换保持纯函数。

```js
const toUserMap = (users) =>
  users.reduce((acc, user) => ({ ...acc, [user.id]: user }), {});

const users = await fetchUsers(); // 副作用在边界
const userMap = toUserMap(users); // 纯转换
```

### 注意
函数式风格能提升可测试性和可组合性，但过度链式调用、频繁复制大对象也会带来可读性和性能问题。工程中应结合场景取舍。

<!-- id: js-063; difficulty: 1; tags: Number, 浮点精度, IEEE 754; source: 高频 -->
# 说说 JavaScript 中的 Number 类型精度问题

## JavaScript Number 精度问题

### IEEE 754 双精度
`Number` 使用 64 位双精度浮点数。很多十进制小数无法用二进制有限表示，所以会出现精度误差。

```js
0.1 + 0.2; // 0.30000000000000004
0.1 + 0.2 === 0.3; // false
```

整数也只有安全范围。

```js
Number.MAX_SAFE_INTEGER; // 9007199254740991，2^53 - 1
Number.MIN_SAFE_INTEGER; // -9007199254740991

Number.isSafeInteger(9007199254740991); // true
Number.isSafeInteger(9007199254740992); // false
```

### 特殊值
```js
Infinity;
-Infinity;
NaN;

NaN === NaN; // false
Number.isNaN(NaN); // true
isNaN('hello'); // true，会先做类型转换，不推荐

Number.isFinite(1 / 0); // false
```

### 处理方式
#### 1. 展示层格式化
```js
(0.1 + 0.2).toFixed(2); // '0.30'
```

`toFixed` 返回字符串，适合展示，不适合当作底层精确计算方案。

#### 2. 整数化计算
```js
function addMoney(aCent, bCent) {
  return aCent + bCent;
}

addMoney(10, 20); // 30，表示 0.30 元
```

金额应优先用最小货币单位整数存储和计算，例如分、厘，再格式化展示。直接把任意小数乘固定倍数只适合小范围、已知位数场景。

#### 3. 误差比较
```js
function nearlyEqual(a, b, epsilon = Number.EPSILON) {
  return Math.abs(a - b) <= epsilon * Math.max(1, Math.abs(a), Math.abs(b));
}

nearlyEqual(0.1 + 0.2, 0.3); // true
```

相对误差通常比单纯 `Math.abs(a - b) < Number.EPSILON` 更稳。

#### 4. 使用十进制库
```js
import Decimal from 'decimal.js';

new Decimal('0.1').plus('0.2').toString(); // 0.3
```

财务、计费、科学计算等需要十进制精确性的场景，用 decimal.js、big.js 等库，不要依赖浮点技巧。

### BigInt
```js
9007199254740993n; // 精确大整数
```

BigInt 解决大整数精度，不解决小数精度。BigInt 不能和 Number 混合算术运算，也不能直接 JSON 序列化。

<!-- id: js-064; difficulty: 2; tags: 函数重载, 参数处理, 设计模式; source: 高频 -->
# 说说 JavaScript 中的函数重载如何实现

## JavaScript 函数重载如何实现

### JS 没有运行时原生重载
JavaScript 中同一作用域声明同名函数，后面的会覆盖前面的。

```js
function fn(x) {
  return x;
}

function fn(x, y) {
  return x + y;
}

fn(1); // NaN，因为实际只剩第二个 fn
```

要实现类似重载，需要在一个函数内部根据参数数量、类型或结构分发。

### 1. 根据参数数量
```js
function createElement(tag, options, children) {
  const el = document.createElement(tag);

  if (arguments.length === 2 && typeof options === 'string') {
    el.textContent = options;
    return el;
  }

  if (options) {
    Object.assign(el, options);
  }

  if (children) {
    el.append(...[].concat(children));
  }

  return el;
}
```

### 2. 根据参数类型
```js
function process(input) {
  if (typeof input === 'string') return input.toUpperCase();
  if (typeof input === 'number') return input * 2;
  if (Array.isArray(input)) return input.map((x) => x * 2);

  throw new TypeError('Unsupported input');
}
```

### 3. 选项对象
```js
function fetchData({ url, method = 'GET', body, timeout = 5000 } = {}) {
  if (!url) throw new TypeError('url is required');

  return fetch(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeout),
  });
}
```

参数越来越多时，选项对象通常比模拟重载更可维护，也更容易向后兼容。

### 4. 分发表
```js
const handlers = new Map([
  ['string', (value) => value.toUpperCase()],
  ['number', (value) => value * 2],
  ['array', (value) => value.flat()],
]);

function getKind(value) {
  return Array.isArray(value) ? 'array' : typeof value;
}

function process(value) {
  const handler = handlers.get(getKind(value));
  if (!handler) throw new TypeError('No handler');
  return handler(value);
}
```

### TypeScript 中的重载
```ts
function parse(value: string): string[];
function parse(value: number): number[];
function parse(value: string | number) {
  return typeof value === 'string' ? value.split(',') : [value];
}
```

TypeScript 重载只存在于类型层面，运行时仍然是一个实现函数，所以实现里必须自己做类型判断。

### 实践建议
能用清晰参数对象就不要堆很多重载；必须重载时，分支要少、错误要明确，避免让一个函数承担太多不相关职责。

<!-- id: js-065; difficulty: 3; tags: Atomics, SharedArrayBuffer, 多线程, 并发; source: 高频 -->
# 解释 JavaScript 中的 Atomics 和 SharedArrayBuffer

## Atomics 和 SharedArrayBuffer

### SharedArrayBuffer
`SharedArrayBuffer` 表示一块可被多个线程同时访问的共享内存。把它传给 Worker 时不是复制，也不是转移所有权，而是多方看到同一块内存。

```js
const sab = new SharedArrayBuffer(16);
const view = new Int32Array(sab);

worker.postMessage({ buffer: sab });
```

浏览器中使用 `SharedArrayBuffer` 通常需要跨源隔离：页面需要配置 COOP/COEP 等响应头，否则出于安全原因不可用。

### 为什么需要 Atomics
多个线程同时读写共享内存会有竞态条件。

```txt
A 读 value = 0
B 读 value = 0
A 写 value = 1
B 写 value = 1
结果是 1，但期望是 2
```

`Atomics` 提供原子操作和内存同步，保证某些读改写操作不可被其他线程打断。

### 常用 API
```js
const sab = new SharedArrayBuffer(4);
const view = new Int32Array(sab);

Atomics.store(view, 0, 42); // 原子写
Atomics.load(view, 0);      // 原子读

Atomics.add(view, 0, 1);    // 返回旧值，原子 +1
Atomics.sub(view, 0, 1);
Atomics.and(view, 0, 0xff);
Atomics.or(view, 0, 0x01);
Atomics.xor(view, 0, 0x01);

Atomics.exchange(view, 0, 7);
Atomics.compareExchange(view, 0, 7, 8); // CAS
```

多数 Atomics 操作要求整数 TypedArray，例如 Int32Array、Uint32Array、BigInt64Array 等。`Atomics.wait` 只能用于 Int32Array 或 BigInt64Array。

### wait / notify
```js
// Worker 中等待 index 0 的值不再是 0，最多等 1000ms
const result = Atomics.wait(view, 0, 0, 1000);
// result: 'ok' | 'not-equal' | 'timed-out'

Atomics.store(view, 0, 1);
Atomics.notify(view, 0, 1);
```

`Atomics.wait` 会阻塞当前线程，浏览器主线程不能使用；通常在 Worker 中使用。需要非阻塞等待时可关注 `Atomics.waitAsync` 的环境支持。

### 简单互斥锁
```js
const LOCK = 0;

function lock(view) {
  while (Atomics.compareExchange(view, LOCK, 0, 1) !== 0) {
    Atomics.wait(view, LOCK, 1);
  }
}

function unlock(view) {
  Atomics.store(view, LOCK, 0);
  Atomics.notify(view, LOCK, 1);
}
```

这只是教学示例。真实锁要考虑异常释放、超时、公平性、死锁和性能。

### 适用场景
1. WebAssembly 多线程。
2. Worker 池共享状态。
3. 图像、音频、科学计算等高性能数据处理。
4. 需要低拷贝成本的大型二进制数据协作。

### 注意
共享内存编程复杂度高，容易出现竞态、死锁和难复现 bug。普通前端任务优先使用消息传递、Transferable 或更高层的 Worker 封装。
