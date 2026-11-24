# 手写题

<!-- id: code-001; difficulty: 1; tags: 防抖, 性能优化; source: 高频 -->
# 手写防抖函数（debounce）

## 核心思路

防抖 debounce：事件连续触发时不立刻执行，等最后一次触发结束 `delay` 毫秒后再执行。常用于搜索输入、窗口 resize、表单校验等场景。

## 基础实现

```js
function debounce(fn, delay = 300) {
  let timer = null;

  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}
```

这里返回普通函数而不是箭头函数，是为了保留调用时的 `this`。

## 支持立即执行、取消和 flush

```js
function debounce(fn, delay = 300, options = {}) {
  const { immediate = false } = options;
  let timer = null;
  let lastThis;
  let lastArgs;
  let result;

  function invoke() {
    result = fn.apply(lastThis, lastArgs);
    lastThis = undefined;
    lastArgs = undefined;
    return result;
  }

  function debounced(...args) {
    lastThis = this;
    lastArgs = args;

    const shouldCallNow = immediate && timer === null;
    clearTimeout(timer);

    timer = setTimeout(() => {
      timer = null;
      if (!immediate && lastArgs) invoke();
    }, delay);

    if (shouldCallNow) return invoke();
    return result;
  }

  debounced.cancel = function () {
    clearTimeout(timer);
    timer = null;
    lastThis = undefined;
    lastArgs = undefined;
  };

  debounced.flush = function () {
    if (timer === null || !lastArgs) return result;
    clearTimeout(timer);
    timer = null;
    return invoke();
  };

  return debounced;
}
```

## 关键点

1. 每次触发都清除旧定时器并重新计时。
2. 用 `apply` 保留 `this` 和参数。
3. `immediate` 表示第一次触发立刻执行，等待期内后续触发只重置定时器。
4. `cancel` 用于组件卸载或取消未执行任务，`flush` 用于立即执行最后一次待执行任务。

<!-- id: code-002; difficulty: 1; tags: 节流, 性能优化; source: 高频 -->
# 手写节流函数（throttle）

## 核心思路

节流 throttle：事件持续触发时，在固定时间窗口内最多执行一次。常用于 scroll、mousemove、resize、按钮连点等场景。

## 时间戳版：首次立即执行

```js
function throttle(fn, interval = 300) {
  let lastTime = 0;

  return function throttled(...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}
```

## 定时器版：尾部执行

```js
function throttle(fn, interval = 300) {
  let timer = null;

  return function throttled(...args) {
    if (timer) return;

    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, interval);
  };
}
```

## 支持 leading / trailing 的版本

```js
function throttle(fn, interval = 300, options = {}) {
  const { leading = true, trailing = true } = options;
  let lastTime = 0;
  let timer = null;
  let lastThis;
  let lastArgs;
  let result;

  function invoke(time) {
    lastTime = time;
    result = fn.apply(lastThis, lastArgs);
    lastThis = undefined;
    lastArgs = undefined;
    return result;
  }

  function startTimer(remaining) {
    timer = setTimeout(() => {
      timer = null;
      if (trailing && lastArgs) invoke(Date.now());
    }, remaining);
  }

  function throttled(...args) {
    const now = Date.now();
    if (!lastTime && !leading) lastTime = now;

    const remaining = interval - (now - lastTime);
    lastThis = this;
    lastArgs = args;

    if (remaining <= 0 || remaining > interval) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      return invoke(now);
    }

    if (!timer && trailing) startTimer(remaining);
    return result;
  }

  throttled.cancel = function () {
    clearTimeout(timer);
    timer = null;
    lastTime = 0;
    lastThis = undefined;
    lastArgs = undefined;
  };

  return throttled;
}
```

## 关键点

1. 时间戳版适合立即响应，但可能没有最后一次 trailing 调用。
2. 定时器版适合尾部执行，但首次响应会延迟。
3. 生产实现通常需要 `leading`、`trailing`、`cancel`，并保留最新一次调用的 `this` 和参数。

<!-- id: code-003; difficulty: 2; tags: 深拷贝, 对象; source: 高频 -->
# 手写深拷贝（deepClone），需要处理循环引用、Date、RegExp、Map、Set 等特殊类型

## 核心思路

深拷贝要处理三件事：基本类型直接返回，对象类型递归复制，循环引用用 `WeakMap` 记录“原对象 -> 克隆对象”的映射。特殊对象如 `Date`、`RegExp`、`Map`、`Set` 需要单独处理。

```js
function deepClone(value, cache = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;

  if (cache.has(value)) return cache.get(value);

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (value instanceof RegExp) {
    const clonedRegExp = new RegExp(value.source, value.flags);
    clonedRegExp.lastIndex = value.lastIndex;
    return clonedRegExp;
  }

  if (value instanceof Map) {
    const clonedMap = new Map();
    cache.set(value, clonedMap);

    value.forEach((mapValue, mapKey) => {
      clonedMap.set(deepClone(mapKey, cache), deepClone(mapValue, cache));
    });

    return clonedMap;
  }

  if (value instanceof Set) {
    const clonedSet = new Set();
    cache.set(value, clonedSet);

    value.forEach((setValue) => {
      clonedSet.add(deepClone(setValue, cache));
    });

    return clonedSet;
  }

  const cloned = Array.isArray(value)
    ? []
    : Object.create(Object.getPrototypeOf(value));
  cache.set(value, cloned);

  const descriptors = Object.getOwnPropertyDescriptors(value);

  Reflect.ownKeys(descriptors).forEach((key) => {
    const descriptor = descriptors[key];
    if ('value' in descriptor) {
      descriptor.value = deepClone(descriptor.value, cache);
    }
    Object.defineProperty(cloned, key, descriptor);
  });

  return cloned;
}
```

## 测试

```js
const obj = { a: 1, b: { c: 2 }, d: [1, 2, 3] };
obj.self = obj;
obj.map = new Map([[{ id: 1 }, new Set([obj.b])]]);

const cloned = deepClone(obj);

console.log(cloned !== obj); // true
console.log(cloned.b !== obj.b); // true
console.log(cloned.self === cloned); // true
console.log([...cloned.map.values()][0].has(cloned.b)); // true
```

## 注意点

1. `WeakMap` 防止循环引用导致无限递归。
2. `Reflect.ownKeys` 能覆盖字符串 key 和 symbol key。
3. `Object.getOwnPropertyDescriptors` 可以尽量保留不可枚举属性、getter/setter 和属性描述符。
4. 函数通常直接复用，不做克隆；DOM、Promise、WeakMap、WeakSet、文件句柄等对象需要按业务单独定义策略。
5. 原生 `structuredClone` 可处理很多场景，但不能克隆函数，也不适合所有对象类型。

<!-- id: code-004; difficulty: 2; tags: Promise, 异步; source: 高频 -->
# 手写 Promise.all

## 核心思路

`Promise.all(iterable)` 接收一个可迭代对象，按输入顺序收集每一项的 fulfilled 值；只要有任意一项 rejected，整体立即 rejected。

```js
function promiseAll(iterable) {
  return new Promise((resolve, reject) => {
    if (iterable == null || typeof iterable[Symbol.iterator] !== 'function') {
      reject(new TypeError('argument is not iterable'));
      return;
    }

    const results = [];
    let fulfilledCount = 0;
    let index = 0;

    try {
      for (const item of iterable) {
        const currentIndex = index;
        index += 1;

        Promise.resolve(item).then(
          (value) => {
            results[currentIndex] = value;
            fulfilledCount += 1;

            if (fulfilledCount === index) {
              resolve(results);
            }
          },
          reject,
        );
      }
    } catch (error) {
      reject(error);
      return;
    }

    if (index === 0) resolve([]);
  });
}
```

## 测试

```js
promiseAll([
  Promise.resolve(1),
  2,
  new Promise((resolve) => setTimeout(() => resolve(3), 100)),
]).then(console.log); // [1, 2, 3]

promiseAll(new Set([Promise.resolve('a'), Promise.resolve('b')]))
  .then(console.log); // ['a', 'b']

promiseAll([Promise.resolve(1), Promise.reject('err')])
  .catch(console.error); // 'err'
```

## 关键点

1. 结果顺序按输入顺序，而不是完成顺序。
2. 用 `Promise.resolve` 兼容普通值和 thenable。
3. 任意一个 reject，整体 reject，属于 fail-fast 行为。
4. 空 iterable resolve 为 `[]`。
5. 遍历 iterable 过程中如果抛错，也要 reject 整体。

<!-- id: code-005; difficulty: 2; tags: Promise, 异步; source: 高频 -->
# 手写 Promise.allSettled

## 核心思路

`Promise.allSettled(iterable)` 会等待所有输入项都 settled，不会因为某一项 rejected 就提前结束。返回值按输入顺序排列，每一项是 `{ status: 'fulfilled', value }` 或 `{ status: 'rejected', reason }`。

```js
function promiseAllSettled(iterable) {
  return new Promise((resolve, reject) => {
    if (iterable == null || typeof iterable[Symbol.iterator] !== 'function') {
      reject(new TypeError('argument is not iterable'));
      return;
    }

    const results = [];
    let settledCount = 0;
    let index = 0;

    try {
      for (const item of iterable) {
        const currentIndex = index;
        index += 1;

        Promise.resolve(item).then(
          (value) => {
            results[currentIndex] = { status: 'fulfilled', value };
          },
          (reason) => {
            results[currentIndex] = { status: 'rejected', reason };
          },
        ).then(() => {
          settledCount += 1;
          if (settledCount === index) resolve(results);
        });
      }
    } catch (error) {
      reject(error);
      return;
    }

    if (index === 0) resolve([]);
  });
}
```

## 测试

```js
promiseAllSettled([
  Promise.resolve(1),
  Promise.reject('error'),
  3,
]).then(console.log);
// [
//   { status: 'fulfilled', value: 1 },
//   { status: 'rejected', reason: 'error' },
//   { status: 'fulfilled', value: 3 }
// ]
```

## 关键点

1. 与 `Promise.all` 不同，单个 reject 不会让整体 reject。
2. 结果顺序按输入顺序，不按完成顺序。
3. 普通值也要当作 fulfilled 结果处理。
4. 非 iterable 输入应让返回的 Promise reject。

<!-- id: code-006; difficulty: 2; tags: Promise, 异步; source: 高频 -->
# 手写 Promise.race 和 Promise.any

## Promise.race

`Promise.race(iterable)` 返回第一个 settled 的结果：第一个 fulfilled 就 resolve，第一个 rejected 就 reject。空 iterable 会一直 pending。

```js
function promiseRace(iterable) {
  return new Promise((resolve, reject) => {
    if (iterable == null || typeof iterable[Symbol.iterator] !== 'function') {
      reject(new TypeError('argument is not iterable'));
      return;
    }

    try {
      for (const item of iterable) {
        Promise.resolve(item).then(resolve, reject);
      }
    } catch (error) {
      reject(error);
    }
  });
}
```

## Promise.any

`Promise.any(iterable)` 返回第一个 fulfilled 的结果；只有当所有输入都 rejected 时，整体才 reject，并携带所有失败原因。

```js
function promiseAny(iterable) {
  return new Promise((resolve, reject) => {
    if (iterable == null || typeof iterable[Symbol.iterator] !== 'function') {
      reject(new TypeError('argument is not iterable'));
      return;
    }

    const errors = [];
    let rejectedCount = 0;
    let index = 0;

    try {
      for (const item of iterable) {
        const currentIndex = index;
        index += 1;

        Promise.resolve(item).then(
          resolve,
          (reason) => {
            errors[currentIndex] = reason;
            rejectedCount += 1;

            if (rejectedCount === index) {
              reject(new AggregateError(errors, 'All promises were rejected'));
            }
          },
        );
      }
    } catch (error) {
      reject(error);
      return;
    }

    if (index === 0) {
      reject(new AggregateError([], 'All promises were rejected'));
    }
  });
}
```

## 关键点

1. `race` 比的是第一个 settled，不区分成功失败。
2. `any` 比的是第一个 fulfilled，忽略之前的失败。
3. `any` 全部失败时 reject `AggregateError`，错误顺序按输入顺序保存。
4. 二者都应兼容普通值、thenable 和任意 iterable。

<!-- id: code-007; difficulty: 2; tags: Promise, 异步; source: 高频 -->
# 手写一个完整的 Promise（符合 Promises/A+ 规范）

## 核心思路

Promises/A+ 的关键不是只实现 `then`，而是实现 Promise Resolution Procedure：`then` 回调返回的值 `x` 可能是普通值、同一个 promise、另一个 promise、thenable，甚至读取 `then` 时抛错，都要按规则处理。

```js
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

const asyncRun =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (fn) => setTimeout(fn, 0);

function resolvePromise(promise, x, resolve, reject) {
  if (promise === x) {
    reject(new TypeError('Cannot resolve promise with itself'));
    return;
  }

  if (x instanceof MyPromise) {
    x.then(
      (value) => resolvePromise(promise, value, resolve, reject),
      reject,
    );
    return;
  }

  if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    let called = false;

    try {
      const then = x.then;

      if (typeof then === 'function') {
        then.call(
          x,
          (value) => {
            if (called) return;
            called = true;
            resolvePromise(promise, value, resolve, reject);
          },
          (reason) => {
            if (called) return;
            called = true;
            reject(reason);
          },
        );
      } else {
        resolve(x);
      }
    } catch (error) {
      if (!called) reject(error);
    }

    return;
  }

  resolve(x);
}

class MyPromise {
  #state = PENDING;
  #value = undefined;
  #handlers = [];

  constructor(executor) {
    if (typeof executor !== 'function') {
      throw new TypeError('Promise resolver is not a function');
    }

    const fulfill = (value) => {
      if (this.#state !== PENDING) return;
      this.#state = FULFILLED;
      this.#value = value;
      this.#flushHandlers();
    };

    const reject = (reason) => {
      if (this.#state !== PENDING) return;
      this.#state = REJECTED;
      this.#value = reason;
      this.#flushHandlers();
    };

    const resolve = (value) => {
      resolvePromise(this, value, fulfill, reject);
    };

    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }

  #flushHandlers() {
    this.#handlers.forEach((handler) => handler());
    this.#handlers = [];
  }

  then(onFulfilled, onRejected) {
    const realOnFulfilled =
      typeof onFulfilled === 'function' ? onFulfilled : (value) => value;
    const realOnRejected =
      typeof onRejected === 'function'
        ? onRejected
        : (reason) => {
            throw reason;
          };

    const promise2 = new MyPromise((resolve, reject) => {
      const run = () => {
        asyncRun(() => {
          try {
            const callback =
              this.#state === FULFILLED ? realOnFulfilled : realOnRejected;
            const x = callback(this.#value);
            resolvePromise(promise2, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
      };

      if (this.#state === PENDING) {
        this.#handlers.push(run);
      } else {
        run();
      }
    });

    return promise2;
  }

  catch(onRejected) {
    return this.then(undefined, onRejected);
  }

  finally(onFinally) {
    const callback = typeof onFinally === 'function' ? onFinally : () => {};

    return this.then(
      (value) => MyPromise.resolve(callback()).then(() => value),
      (reason) => MyPromise.resolve(callback()).then(() => {
        throw reason;
      }),
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

## 关键点

1. `then` 必须返回一个新的 promise，才能链式调用。
2. fulfilled/rejected 回调必须异步执行。
3. `onFulfilled` 默认透传值，`onRejected` 默认继续抛错。
4. `resolvePromise` 要处理 thenable，并防止返回自身造成循环。
5. Promise 状态只能从 pending 变成 fulfilled 或 rejected，且只能变化一次。

<!-- id: code-008; difficulty: 1; tags: Function, call, apply, bind; source: 高频 -->
# 手写 Function.prototype.call、apply、bind

## call

```js
Function.prototype.myCall = function (context, ...args) {
  if (typeof this !== 'function') {
    throw new TypeError('myCall must be called on a function');
  }

  const target = context == null ? globalThis : Object(context);
  const key = Symbol('fn');

  try {
    target[key] = this;
    return target[key](...args);
  } finally {
    delete target[key];
  }
};
```

## apply

```js
Function.prototype.myApply = function (context, args) {
  if (typeof this !== 'function') {
    throw new TypeError('myApply must be called on a function');
  }

  const target = context == null ? globalThis : Object(context);
  const key = Symbol('fn');
  const finalArgs = args == null ? [] : Array.from(args);

  try {
    target[key] = this;
    return target[key](...finalArgs);
  } finally {
    delete target[key];
  }
};
```

## bind

```js
Function.prototype.myBind = function (context, ...presetArgs) {
  if (typeof this !== 'function') {
    throw new TypeError('myBind must be called on a function');
  }

  const fn = this;

  function BoundFn(...laterArgs) {
    const isNewCall = this instanceof BoundFn;
    const finalThis = isNewCall ? this : context;
    return fn.apply(finalThis, presetArgs.concat(laterArgs));
  }

  if (fn.prototype) {
    BoundFn.prototype = Object.create(fn.prototype);
    Object.defineProperty(BoundFn.prototype, 'constructor', {
      value: BoundFn,
      configurable: true,
      writable: true,
    });
  }

  return BoundFn;
};
```

## 测试

```js
function greet(greeting, name) {
  return `${greeting}, ${name}! I am ${this.role}`;
}

const obj = { role: 'admin' };
console.log(greet.myCall(obj, 'Hello', 'Alice'));
console.log(greet.myApply(obj, ['Hi', 'Bob']));

const bound = greet.myBind(obj, 'Hey');
console.log(bound('Charlie'));

function Person(name) {
  this.name = name;
}
const BoundPerson = Person.myBind({ ignored: true });
console.log(new BoundPerson('Alice') instanceof Person); // true
```

## 关键点

1. `call` 和 `apply` 的区别只在参数传递方式。
2. 临时挂载函数要用 `Symbol` 避免覆盖已有属性，并用 `finally` 清理。
3. `bind` 要支持参数预置；作为构造函数使用时，应忽略绑定的 `this`。
4. 这种实现接近常见面试写法，但严格模式下 `null` / `undefined` 的 `this` 行为无法完全模拟原生细节。

<!-- id: code-009; difficulty: 1; tags: new, 原型链; source: 高频 -->
# 手写 new 操作符

## new 做了什么

1. 创建一个新对象。
2. 将新对象的原型指向构造函数的 `prototype`。
3. 以新对象作为 `this` 执行构造函数。
4. 如果构造函数显式返回对象或函数，则返回该值；否则返回新对象。

```js
function myNew(Constructor, ...args) {
  if (typeof Constructor !== 'function') {
    throw new TypeError('Constructor must be a function');
  }

  const prototype =
    Constructor.prototype !== null &&
    (typeof Constructor.prototype === 'object' || typeof Constructor.prototype === 'function')
      ? Constructor.prototype
      : Object.prototype;

  const instance = Object.create(prototype);
  const result = Constructor.apply(instance, args);

  const isObjectResult =
    result !== null && (typeof result === 'object' || typeof result === 'function');

  return isObjectResult ? result : instance;
}
```

## 测试

```js
function Person(name, age) {
  this.name = name;
  this.age = age;
}

Person.prototype.greet = function () {
  return `Hi, I'm ${this.name}`;
};

const p = myNew(Person, 'Alice', 25);
console.log(p instanceof Person); // true
console.log(p.greet()); // Hi, I'm Alice

function Factory() {
  this.a = 1;
  return { b: 2 };
}
console.log(myNew(Factory)); // { b: 2 }
```

## 注意点

1. 构造函数返回基本类型时要忽略，仍返回新对象。
2. 构造函数返回函数也属于返回对象，要使用该返回值。
3. 手写版无法完全模拟 `new.target`、class 构造器和箭头函数不可 `new` 等原生细节。

<!-- id: code-010; difficulty: 1; tags: instanceof, 原型链; source: 高频 -->
# 手写 instanceof

## 核心思路

`instanceof` 判断右侧构造函数的 `prototype` 是否出现在左侧值的原型链上。

```js
function myInstanceof(left, right) {
  if (left === null || (typeof left !== 'object' && typeof left !== 'function')) {
    return false;
  }

  if (right === null || (typeof right !== 'object' && typeof right !== 'function')) {
    throw new TypeError('Right-hand side of instanceof is not an object');
  }

  if (typeof right[Symbol.hasInstance] === 'function') {
    return Boolean(right[Symbol.hasInstance](left));
  }

  if (typeof right !== 'function') {
    throw new TypeError('Right-hand side of instanceof is not callable');
  }

  const prototype = right.prototype;
  if (prototype === null || (typeof prototype !== 'object' && typeof prototype !== 'function')) {
    throw new TypeError('Function has non-object prototype in instanceof check');
  }

  let proto = Object.getPrototypeOf(left);

  while (proto !== null) {
    if (proto === prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }

  return false;
}
```

## 测试

```js
console.log(myInstanceof([], Array)); // true
console.log(myInstanceof([], Object)); // true
console.log(myInstanceof({}, Array)); // false
console.log(myInstanceof('str', String)); // false
console.log(myInstanceof(function () {}, Function)); // true

function Animal() {}
function Dog() {}
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;

const d = new Dog();
console.log(myInstanceof(d, Dog)); // true
console.log(myInstanceof(d, Animal)); // true
```

## 注意点

1. 左侧基本类型直接返回 `false`。
2. 左侧函数也可以参与判断，因为函数本身也是对象。
3. 原生 `instanceof` 会优先使用右侧的 `Symbol.hasInstance`。
4. 修改构造函数的 `prototype` 会影响之后的判断。

<!-- id: code-011; difficulty: 2; tags: 数组, flat; source: 高频 -->
# 手写 Array.prototype.flat（数组扁平化）

## 递归实现

`Array.prototype.flat(depth = 1)` 按指定深度展开数组，默认只展开一层。原生 `flat` 会跳过稀疏数组中的空槽。

```js
function myFlat(array, depth = 1) {
  const result = [];
  const maxDepth = depth === Infinity ? Infinity : Math.max(0, Math.floor(depth));

  function flatten(items, currentDepth) {
    for (let i = 0; i < items.length; i += 1) {
      if (!(i in items)) continue; // 跳过 sparse array 的 hole

      const item = items[i];
      if (Array.isArray(item) && currentDepth < maxDepth) {
        flatten(item, currentDepth + 1);
      } else {
        result.push(item);
      }
    }
  }

  flatten(array, 0);
  return result;
}
```

## 迭代实现

递归层级很深时可能栈溢出，可以用显式栈模拟。

```js
function flatIterative(array, depth = 1) {
  const maxDepth = depth === Infinity ? Infinity : Math.max(0, Math.floor(depth));
  const result = [];
  const stack = [];

  for (let i = array.length - 1; i >= 0; i -= 1) {
    if (i in array) stack.push([array[i], 0]);
  }

  while (stack.length) {
    const [item, currentDepth] = stack.pop();

    if (Array.isArray(item) && currentDepth < maxDepth) {
      for (let i = item.length - 1; i >= 0; i -= 1) {
        if (i in item) stack.push([item[i], currentDepth + 1]);
      }
    } else {
      result.push(item);
    }
  }

  return result;
}
```

## 测试

```js
const arr = [1, [2, [3, [4]], 5]];
console.log(myFlat(arr, 1)); // [1, 2, [3, [4]], 5]
console.log(myFlat(arr, 2)); // [1, 2, 3, [4], 5]
console.log(myFlat(arr, Infinity)); // [1, 2, 3, 4, 5]
console.log(myFlat([1, , [2, , 3]], Infinity)); // [1, 2, 3]
```

## 关键点

1. `depth = 0` 等价于浅拷贝一层非 hole 元素。
2. `Infinity` 可以展开所有层级。
3. 用 `concat` 或 `unshift` 的写法更短，但大数组下可能有额外性能成本。

<!-- id: code-012; difficulty: 2; tags: 数组, reduce; source: 高频 -->
# 手写 Array.prototype.reduce

## 核心思路

`reduce` 从左到右遍历数组或类数组，把每次回调的返回值作为下一次的累加器。没有传 `initialValue` 时，要从第一个存在的元素开始；稀疏数组中的空槽会被跳过。

```js
Array.prototype.myReduce = function (callback, initialValue) {
  if (this == null) {
    throw new TypeError('Array.prototype.reduce called on null or undefined');
  }

  if (typeof callback !== 'function') {
    throw new TypeError(`${callback} is not a function`);
  }

  const array = Object(this);
  const length = Math.max(0, Math.min(Number(array.length) || 0, Number.MAX_SAFE_INTEGER));
  let index = 0;
  let accumulator;

  if (arguments.length >= 2) {
    accumulator = initialValue;
  } else {
    while (index < length && !(index in array)) {
      index += 1;
    }

    if (index >= length) {
      throw new TypeError('Reduce of empty array with no initial value');
    }

    accumulator = array[index];
    index += 1;
  }

  while (index < length) {
    if (index in array) {
      accumulator = callback(accumulator, array[index], index, array);
    }
    index += 1;
  }

  return accumulator;
};
```

## 测试

```js
console.log([1, 2, 3, 4].myReduce((acc, cur) => acc + cur, 0)); // 10
console.log([1, 2, 3].myReduce((acc, cur) => acc * cur)); // 6
console.log([, 1, , 2].myReduce((acc, cur) => acc + cur)); // 3

const arrayLike = { 0: 'a', 1: 'b', length: 2 };
console.log(Array.prototype.myReduce.call(arrayLike, (acc, cur) => acc + cur, '')); // ab
```

## 关键点

1. 不传初始值且没有任何可遍历元素时要抛错。
2. 回调参数是 `(accumulator, currentValue, currentIndex, array)`。
3. 稀疏数组跳过不存在的索引，但不会跳过值为 `undefined` 的元素。

<!-- id: code-013; difficulty: 1; tags: 数组, map; source: 高频 -->
# 手写 Array.prototype.map、filter、find

## map

`map` 返回等长新数组，只对存在的索引调用回调；稀疏数组的 hole 会保留下来。

```js
Array.prototype.myMap = function (callback, thisArg) {
  if (this == null) throw new TypeError('myMap called on null or undefined');
  if (typeof callback !== 'function') throw new TypeError('callback must be a function');

  const array = Object(this);
  const length = array.length >>> 0;
  const result = new Array(length);

  for (let i = 0; i < length; i += 1) {
    if (i in array) {
      result[i] = callback.call(thisArg, array[i], i, array);
    }
  }

  return result;
};
```

## filter

`filter` 只把回调返回 truthy 的元素放入新数组；hole 不会进入结果。

```js
Array.prototype.myFilter = function (callback, thisArg) {
  if (this == null) throw new TypeError('myFilter called on null or undefined');
  if (typeof callback !== 'function') throw new TypeError('callback must be a function');

  const array = Object(this);
  const length = array.length >>> 0;
  const result = [];

  for (let i = 0; i < length; i += 1) {
    if (i in array && callback.call(thisArg, array[i], i, array)) {
      result.push(array[i]);
    }
  }

  return result;
};
```

## find

`find` 返回第一个让回调返回 truthy 的元素；找不到返回 `undefined`。原生 `find` 会访问稀疏数组的空槽，值表现为 `undefined`。

```js
Array.prototype.myFind = function (callback, thisArg) {
  if (this == null) throw new TypeError('myFind called on null or undefined');
  if (typeof callback !== 'function') throw new TypeError('callback must be a function');

  const array = Object(this);
  const length = array.length >>> 0;

  for (let i = 0; i < length; i += 1) {
    const value = array[i];
    if (callback.call(thisArg, value, i, array)) {
      return value;
    }
  }

  return undefined;
};
```

## 测试

```js
console.log([1, 2, 3].myMap((x) => x * 2)); // [2, 4, 6]
console.log([1, 2, 3, 4].myFilter((x) => x % 2 === 0)); // [2, 4]
console.log([1, 2, 3].myFind((x) => x > 1)); // 2
console.log([, 1].myMap((x) => x)); // [empty, 1]
```

<!-- id: code-014; difficulty: 2; tags: 发布订阅, 设计模式; source: 高频 -->
# 手写发布订阅模式（EventEmitter）

## 核心思路

EventEmitter 维护一个“事件名 -> 监听器列表”的映射，`emit` 时按注册顺序调用监听器。实现时要注意 `once`、取消订阅、回调中修改监听器列表等边界。

```js
class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  on(eventName, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('listener must be a function');
    }

    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }

    this.events.get(eventName).push(listener);
    return this;
  }

  once(eventName, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('listener must be a function');
    }

    const wrapper = (...args) => {
      this.off(eventName, wrapper);
      listener.apply(this, args);
    };

    wrapper._original = listener;
    return this.on(eventName, wrapper);
  }

  off(eventName, listener) {
    const listeners = this.events.get(eventName);
    if (!listeners) return this;

    const nextListeners = listeners.filter(
      (fn) => fn !== listener && fn._original !== listener,
    );

    if (nextListeners.length === 0) {
      this.events.delete(eventName);
    } else {
      this.events.set(eventName, nextListeners);
    }

    return this;
  }

  emit(eventName, ...args) {
    const listeners = this.events.get(eventName);
    if (!listeners || listeners.length === 0) return false;

    [...listeners].forEach((listener) => {
      listener.apply(this, args);
    });

    return true;
  }

  removeAllListeners(eventName) {
    if (eventName === undefined) {
      this.events.clear();
    } else {
      this.events.delete(eventName);
    }
    return this;
  }

  listenerCount(eventName) {
    return this.events.get(eventName)?.length ?? 0;
  }
}
```

## 测试

```js
const emitter = new EventEmitter();

function logA(msg) {
  console.log('A:', msg);
}

emitter.on('data', logA);
emitter.once('data', (msg) => console.log('B:', msg));

emitter.emit('data', 'hello'); // A: hello B: hello
emitter.emit('data', 'world'); // A: world
emitter.off('data', logA);
console.log(emitter.listenerCount('data')); // 0
```

## 关键点

1. `emit` 前复制监听器列表，避免回调中 `on/off` 影响本轮遍历。
2. `once` 应先解绑再执行监听器，避免监听器内部递归触发时重复调用。
3. `off` 要能移除原函数，也要能移除 `once` 包装函数。
4. 使用 `Map` 可以自然支持字符串、symbol 等事件名。

<!-- id: code-015; difficulty: 2; tags: 观察者模式, 设计模式; source: 高频 -->
# 手写观察者模式，并说明与发布订阅模式的区别

## 观察者模式实现

观察者模式包含两个角色：`Subject` 保存观察者列表，状态变化时直接通知观察者；`Observer` 暴露 `update` 方法接收通知。

```js
class Subject {
  constructor(initialState) {
    this.state = initialState;
    this.observers = new Set();
  }

  attach(observer) {
    if (!observer || typeof observer.update !== 'function') {
      throw new TypeError('observer must implement update(subject)');
    }

    this.observers.add(observer);
    return this;
  }

  detach(observer) {
    this.observers.delete(observer);
    return this;
  }

  setState(nextState) {
    if (Object.is(this.state, nextState)) return;
    this.state = nextState;
    this.notify();
  }

  notify() {
    [...this.observers].forEach((observer) => {
      observer.update(this);
    });
  }
}

class Observer {
  constructor(name) {
    this.name = name;
  }

  update(subject) {
    console.log(`${this.name} 收到更新: ${subject.state}`);
  }
}
```

## 测试

```js
const subject = new Subject('idle');
const obsA = new Observer('观察者A');
const obsB = new Observer('观察者B');

subject.attach(obsA).attach(obsB);
subject.setState('loading');
subject.detach(obsA);
subject.setState('done');
```

## 与发布订阅模式的区别

| 对比项 | 观察者模式 | 发布订阅模式 |
|--------|-----------|-------------|
| 关系 | Subject 直接持有 Observer | 发布者和订阅者通过事件中心通信 |
| 耦合度 | 双方知道彼此的接口 | 发布者通常不知道订阅者是谁 |
| 通知方式 | Subject 状态变化后直接调用 `observer.update` | 发布者发布事件，事件中心分发给订阅者 |
| 适用场景 | 一对多状态依赖，如响应式数据、模型状态更新 | 跨模块、跨组件、业务事件广播 |

## 关键点

1. 观察者模式强调“对象状态变化 -> 依赖对象更新”。
2. 发布订阅模式多了一个事件通道或事件中心，解耦更强。
3. `notify` 时复制观察者集合，可以避免观察者在 `update` 中增删订阅影响本轮通知。

<!-- id: code-016; difficulty: 2; tags: LRU, 缓存, 数据结构; source: 高频 -->
# 手写 LRU 缓存（最近最少使用）

## Map 实现

JS 的 `Map` 保持插入顺序，可以用“删除再插入”把 key 刷新为最近使用，从而用很少代码实现 LRU。

```js
class LRUCache {
  constructor(capacity) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new TypeError('capacity must be a positive integer');
    }

    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return -1;

    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, value);

    if (this.cache.size > this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  has(key) {
    return this.cache.has(key);
  }

  size() {
    return this.cache.size;
  }
}
```

## 测试

```js
const lru = new LRUCache(2);

lru.put(1, 1);
lru.put(2, 2);
console.log(lru.get(1)); // 1，key=1 刷新为最近使用

lru.put(3, 3); // 淘汰 key=2
console.log(lru.get(2)); // -1

lru.put(4, 4); // 淘汰 key=1
console.log(lru.get(1)); // -1
console.log(lru.get(3)); // 3
console.log(lru.get(4)); // 4
```

## 关键点

1. `Map` 的第一个 key 是最久未使用的 key。
2. `get` 命中时要刷新访问顺序。
3. `put` 已存在 key 时也要刷新顺序。
4. 面试如果要求语言无关或严格 O(1) 数据结构，可回答“哈希表 + 双向链表”：哈希表负责定位节点，双向链表负责移动到头部和删除尾部。

<!-- id: code-017; difficulty: 3; tags: 虚拟DOM, diff; source: 高频 -->
# 手写简单的虚拟 DOM 和 diff 算法

## 核心思路

一个最小虚拟 DOM 包含三部分：

1. `h`：创建 vnode。
2. `render`：把 vnode 渲染成真实 DOM。
3. `patch`：比较 old vnode 和 new vnode，尽量复用真实 DOM。

下面实现的是“同层、无 key”的简化 diff，足够说明核心原理。

```js
function isTextVnode(vnode) {
  return typeof vnode === 'string' || typeof vnode === 'number';
}

function normalizeChild(child) {
  if (Array.isArray(child)) return child.flat(Infinity).map(normalizeChild);
  if (child === false || child === true || child == null) return '';
  return child;
}

function h(type, props, ...children) {
  return {
    type,
    props: props || {},
    children: children.flat(Infinity).map(normalizeChild),
  };
}
```

## 渲染

```js
function render(vnode) {
  if (isTextVnode(vnode)) {
    return document.createTextNode(String(vnode));
  }

  const el = document.createElement(vnode.type);
  updateProps(el, {}, vnode.props);

  vnode.children.forEach((child) => {
    el.appendChild(render(child));
  });

  return el;
}
```

## 属性更新

```js
function isEventProp(key) {
  return /^on[A-Z]/.test(key);
}

function getEventName(key) {
  return key.slice(2).toLowerCase();
}

function setProp(el, key, value) {
  if (isEventProp(key)) {
    el.addEventListener(getEventName(key), value);
  } else if (key === 'style' && value && typeof value === 'object') {
    Object.assign(el.style, value);
  } else if (key in el) {
    el[key] = value;
  } else {
    el.setAttribute(key, value);
  }
}

function removeProp(el, key, value) {
  if (isEventProp(key)) {
    el.removeEventListener(getEventName(key), value);
  } else if (key === 'style' && value && typeof value === 'object') {
    Object.keys(value).forEach((name) => {
      el.style[name] = '';
    });
  } else {
    el.removeAttribute(key);
  }
}

function updateProps(el, oldProps = {}, newProps = {}) {
  for (const [key, oldValue] of Object.entries(oldProps)) {
    if (!(key in newProps)) {
      removeProp(el, key, oldValue);
    }
  }

  for (const [key, newValue] of Object.entries(newProps)) {
    const oldValue = oldProps[key];
    if (Object.is(oldValue, newValue)) continue;

    if (isEventProp(key) && oldValue) {
      removeProp(el, key, oldValue);
    }

    setProp(el, key, newValue);
  }
}
```

## Diff / Patch

```js
function patch(parent, oldVnode, newVnode, index = 0) {
  const dom = parent.childNodes[index];

  if (oldVnode == null) {
    parent.appendChild(render(newVnode));
    return;
  }

  if (newVnode == null) {
    if (dom) parent.removeChild(dom);
    return;
  }

  if (isTextVnode(oldVnode) || isTextVnode(newVnode)) {
    if (!isTextVnode(oldVnode) || !isTextVnode(newVnode)) {
      parent.replaceChild(render(newVnode), dom);
    } else if (String(oldVnode) !== String(newVnode)) {
      dom.nodeValue = String(newVnode);
    }
    return;
  }

  if (oldVnode.type !== newVnode.type) {
    parent.replaceChild(render(newVnode), dom);
    return;
  }

  updateProps(dom, oldVnode.props, newVnode.props);

  const maxLength = Math.max(oldVnode.children.length, newVnode.children.length);
  for (let i = 0; i < maxLength; i += 1) {
    patch(dom, oldVnode.children[i], newVnode.children[i], i);
  }
}
```

## 使用

```js
const oldTree = h('div', { className: 'box' }, h('p', null, 'Hello'), 1);
const newTree = h('div', { className: 'box active' }, h('p', null, 'Hi'), 2);

const container = document.getElementById('app');
container.appendChild(render(oldTree));
patch(container, oldTree, newTree);
```

## 关键点

1. 文本节点必须单独处理，字符串和数字都属于文本 vnode。
2. 同类型节点复用 DOM，只更新 props 和 children。
3. 不同类型节点直接替换。
4. 真实框架会做 keyed diff、组件 diff、批处理、调度和 hydration，这里只是最小模型。

<!-- id: code-018; difficulty: 3; tags: curry, 函数式编程; source: 高频 -->
# 手写函数柯里化（curry）

## 基础 curry

柯里化把多参数函数转换成可以分批接收参数的函数。当收集到足够参数后，再执行原函数。

```js
function curry(fn, arity = fn.length) {
  if (typeof fn !== 'function') {
    throw new TypeError('fn must be a function');
  }

  function curried(...args) {
    if (args.length >= arity) {
      return fn.apply(this, args);
    }

    return function next(...nextArgs) {
      return curried.apply(this, args.concat(nextArgs));
    };
  }

  return curried;
}
```

## 测试

```js
function add(a, b, c) {
  return a + b + c;
}

const curriedAdd = curry(add);
console.log(curriedAdd(1)(2)(3)); // 6
console.log(curriedAdd(1, 2)(3)); // 6
console.log(curriedAdd(1)(2, 3)); // 6
console.log(curriedAdd(1, 2, 3)); // 6
```

## 支持占位符

```js
const PLACEHOLDER = Symbol('placeholder');

function curryWithPlaceholder(fn, arity = fn.length) {
  function mergeArgs(oldArgs, newArgs) {
    const merged = [];
    let newIndex = 0;

    for (let i = 0; i < oldArgs.length; i += 1) {
      if (oldArgs[i] === PLACEHOLDER && newIndex < newArgs.length) {
        merged.push(newArgs[newIndex]);
        newIndex += 1;
      } else {
        merged.push(oldArgs[i]);
      }
    }

    return merged.concat(newArgs.slice(newIndex));
  }

  function isReady(args) {
    const requiredArgs = args.slice(0, arity);
    return requiredArgs.length >= arity && !requiredArgs.includes(PLACEHOLDER);
  }

  function curried(...args) {
    if (isReady(args)) {
      return fn.apply(this, args.slice(0, arity));
    }

    return function next(...nextArgs) {
      return curried.apply(this, mergeArgs(args, nextArgs));
    };
  }

  return curried;
}
```

## 占位符测试

```js
function list(a, b, c) {
  return [a, b, c];
}

const curriedList = curryWithPlaceholder(list);
console.log(curriedList(1, PLACEHOLDER, 3)(2)); // [1, 2, 3]
console.log(curriedList(PLACEHOLDER, 2)(1)(3)); // [1, 2, 3]
```

## 关键点

1. `fn.length` 只统计第一个默认参数之前的形参数量，复杂函数最好显式传 `arity`。
2. 柯里化和偏函数不同：偏函数固定一部分参数，柯里化强调分批收集直到满足 arity。
3. 如果函数依赖 `this`，要用 `apply` 保留调用时上下文。

<!-- id: code-019; difficulty: 2; tags: compose, pipe, 函数式编程; source: 高频 -->
# 手写函数组合（compose 和 pipe）

## 核心区别

`compose` 从右到左执行，`pipe` 从左到右执行。

```js
compose(f, g, h)(x); // f(g(h(x)))
pipe(h, g, f)(x); // f(g(h(x)))
```

## 同步实现

```js
function validateFns(fns) {
  fns.forEach((fn) => {
    if (typeof fn !== 'function') {
      throw new TypeError('compose/pipe arguments must be functions');
    }
  });
}

function compose(...fns) {
  validateFns(fns);
  if (fns.length === 0) return (value) => value;

  return function composed(...args) {
    let index = fns.length - 1;
    let result = fns[index].apply(this, args);

    while (--index >= 0) {
      result = fns[index].call(this, result);
    }

    return result;
  };
}

function pipe(...fns) {
  validateFns(fns);
  if (fns.length === 0) return (value) => value;

  return function piped(...args) {
    let index = 0;
    let result = fns[index].apply(this, args);

    while (++index < fns.length) {
      result = fns[index].call(this, result);
    }

    return result;
  };
}
```

## 测试

```js
const double = (x) => x * 2;
const addOne = (x) => x + 1;
const square = (x) => x * x;

console.log(compose(square, addOne, double)(3)); // 49
console.log(pipe(double, addOne, square)(3)); // 49
```

## 异步版本

```js
function asyncPipe(...fns) {
  validateFns(fns);
  return function pipedAsync(...args) {
    if (fns.length === 0) return Promise.resolve(args[0]);

    const [first, ...rest] = fns;
    return rest.reduce(
      (promise, fn) => promise.then((value) => fn.call(this, value)),
      Promise.resolve(first.apply(this, args)),
    );
  };
}

function asyncCompose(...fns) {
  return asyncPipe(...fns.reverse());
}
```

## 关键点

1. 多参数只传给第一步：`compose` 的最右侧函数，`pipe` 的最左侧函数。
2. 后续函数通常只接收上一步的单个返回值。
3. 空函数列表返回 identity 函数。
4. Redux 的 `compose` 本质就是从右到左组合中间件增强函数。

<!-- id: code-020; difficulty: 2; tags: 继承, 原型链, ES5; source: 高频 -->
# 手写 ES5 寄生组合式继承

## 核心思路

寄生组合式继承结合了两点：

1. 在子构造函数中调用父构造函数，继承实例属性。
2. 让子类原型指向一个以父类原型为原型的新对象，继承原型方法，并避免执行第二次父构造函数。

```js
function inheritPrototype(Child, Parent) {
  if (typeof Parent !== 'function' || typeof Child !== 'function') {
    throw new TypeError('Child and Parent must be functions');
  }

  Child.prototype = Object.create(Parent.prototype);

  Object.defineProperty(Child.prototype, 'constructor', {
    value: Child,
    enumerable: false,
    configurable: true,
    writable: true,
  });
}
```

## 示例

```js
function Animal(name) {
  this.name = name;
  this.colors = ['black', 'white'];
}

Animal.prototype.speak = function () {
  return `${this.name} makes a sound`;
};

function Dog(name, breed) {
  Animal.call(this, name); // 继承实例属性
  this.breed = breed;
}

inheritPrototype(Dog, Animal); // 继承原型方法

Dog.prototype.bark = function () {
  return `${this.name} barks`;
};
```

## 测试

```js
const d1 = new Dog('Rex', 'Husky');
const d2 = new Dog('Max', 'Lab');

d1.colors.push('brown');
console.log(d1.colors); // ['black', 'white', 'brown']
console.log(d2.colors); // ['black', 'white']，实例属性不共享

console.log(d1 instanceof Dog); // true
console.log(d1 instanceof Animal); // true
console.log(d1.constructor === Dog); // true
console.log(d1.speak()); // Rex makes a sound
console.log(d1.bark()); // Rex barks
```

## 为什么优于组合继承

组合继承通常会写 `Dog.prototype = new Animal()`，这会额外调用一次 `Animal`，导致父类实例属性出现在子类原型上。寄生组合式继承用 `Object.create(Animal.prototype)` 只建立原型链，不执行父构造函数。

## 注意点

1. 原型方法应在 `inheritPrototype` 之后挂载到子类原型上。
2. 上面只继承实例属性和原型方法，不会自动继承父构造函数的静态属性；需要的话可手动复制或用 `Object.setPrototypeOf(Child, Parent)`。

<!-- id: code-021; difficulty: 2; tags: 路由, 前端路由; source: 高频 -->
# 手写前端路由（Hash 路由和 History 路由）

## Hash 路由

Hash 路由通过 `location.hash` 表示路径，路径变化会触发 `hashchange`，不需要服务端额外配置。

```js
class HashRouter {
  constructor() {
    this.routes = new Map();
    this.handleChange = this.handleChange.bind(this);

    window.addEventListener('hashchange', this.handleChange);
    window.addEventListener('load', this.handleChange);
  }

  route(path, handler) {
    this.routes.set(path, handler);
    return this;
  }

  getCurrentPath() {
    return window.location.hash.slice(1) || '/';
  }

  navigate(path) {
    window.location.hash = path.startsWith('/') ? path : `/${path}`;
  }

  handleChange() {
    const path = this.getCurrentPath();
    const handler = this.routes.get(path) || this.routes.get('*');
    handler?.({ path });
  }

  destroy() {
    window.removeEventListener('hashchange', this.handleChange);
    window.removeEventListener('load', this.handleChange);
  }
}
```

## History 路由

History 路由使用 `pushState` / `replaceState` 修改 URL，不带 `#`，URL 更自然；但刷新页面时服务端必须把前端路由 fallback 到 `index.html`。

```js
class HistoryRouter {
  constructor() {
    this.routes = new Map();
    this.handlePopState = this.handlePopState.bind(this);

    window.addEventListener('popstate', this.handlePopState);
  }

  route(path, handler) {
    this.routes.set(path, handler);
    return this;
  }

  getCurrentPath() {
    return window.location.pathname || '/';
  }

  push(path, state = {}) {
    window.history.pushState(state, '', path);
    this.render(path, state);
  }

  replace(path, state = {}) {
    window.history.replaceState(state, '', path);
    this.render(path, state);
  }

  handlePopState(event) {
    this.render(this.getCurrentPath(), event.state);
  }

  render(path = this.getCurrentPath(), state = window.history.state) {
    const handler = this.routes.get(path) || this.routes.get('*');
    handler?.({ path, state });
  }

  destroy() {
    window.removeEventListener('popstate', this.handlePopState);
  }
}
```

## 使用

```js
const router = new HistoryRouter();

router
  .route('/', () => console.log('home'))
  .route('/about', () => console.log('about'))
  .route('*', () => console.log('404'));

router.render();
router.push('/about');
```

## 关键点

1. `pushState` / `replaceState` 不会触发 `popstate`，所以调用后要手动渲染。
2. 浏览器前进后退会触发 `popstate`。
3. Hash 路由兼容部署简单；History 路由需要服务端 fallback，否则刷新深层路径会 404。
4. 真实路由还需要动态参数、嵌套路由、导航守卫、懒加载和滚动恢复。

<!-- id: code-022; difficulty: 3; tags: 状态管理, Proxy; source: 高频 -->
# 手写简版响应式状态管理（类似 Vuex / Zustand）

## Zustand 风格简版 store

核心 API 是 `getState`、`setState`、`subscribe`。状态变化后通知订阅者，订阅者可以自己触发 UI 更新。

```js
function createStore(createState) {
  let state;
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(partial, replace = false) {
    const nextState = typeof partial === 'function' ? partial(state) : partial;
    const previousState = state;

    state = replace ? nextState : { ...state, ...nextState };

    if (!Object.is(previousState, state)) {
      [...listeners].forEach((listener) => listener(state, previousState));
    }
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('listener must be a function');
    }

    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  state = createState(setState, getState);

  return { getState, setState, subscribe };
}
```

## 支持 selector 的订阅

```js
function subscribeWithSelector(store, selector, listener, equalityFn = Object.is) {
  let currentSlice = selector(store.getState());

  return store.subscribe((nextState, previousState) => {
    const nextSlice = selector(nextState);

    if (!equalityFn(currentSlice, nextSlice)) {
      const previousSlice = currentSlice;
      currentSlice = nextSlice;
      listener(nextSlice, previousSlice, nextState, previousState);
    }
  });
}
```

## 使用

```js
const counterStore = createStore((set, get) => ({
  count: 0,
  user: null,
  inc: (step = 1) => set({ count: get().count + step }),
  setUser: (user) => set({ user }),
}));

const unsubscribe = subscribeWithSelector(
  counterStore,
  (state) => state.count,
  (count) => console.log('count changed:', count),
);

counterStore.getState().inc();
counterStore.getState().inc(5);
unsubscribe();
```

## Proxy 响应式简版

如果想更像 Vue 的响应式，可以用 `Proxy` 拦截写操作并通知依赖。

```js
function reactive(target) {
  const listeners = new Set();

  const proxy = new Proxy(target, {
    set(obj, key, value, receiver) {
      const oldValue = obj[key];
      const result = Reflect.set(obj, key, value, receiver);

      if (!Object.is(oldValue, value)) {
        [...listeners].forEach((listener) => listener(key, value, oldValue));
      }

      return result;
    },
  });

  proxy.subscribe = function (listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return proxy;
}
```

## 关键点

1. 状态管理的核心是“状态读取、状态更新、订阅通知”。
2. Zustand 偏手动 `setState` + selector 订阅，简单可控。
3. Vue 响应式偏 `Proxy` 依赖收集和触发更新，真正实现还需要 `track/trigger/effect`。
4. 订阅回调中可能再次更新状态，所以通知前复制 listener 集合更稳。

<!-- id: code-023; difficulty: 2; tags: 并发控制, Promise, 异步; source: 高频 -->
# 手写并发请求控制（限制同时执行的 Promise 数量）

## Promise 池实现

输入一组任务函数，每个任务函数返回 Promise 或普通值；同时最多运行 `limit` 个，结果按输入顺序返回。

```js
async function promisePool(tasks, limit) {
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new TypeError('limit must be a positive integer');
  }

  const results = [];
  const executing = new Set();

  for (const [index, task] of tasks.entries()) {
    const promise = Promise.resolve()
      .then(() => task())
      .then((value) => {
        results[index] = value;
      })
      .finally(() => {
        executing.delete(promise);
      });

    executing.add(promise);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}
```

这个版本是 fail-fast：任一任务 reject，整个 `promisePool` reject。如果希望失败不影响其他任务，可以把每个任务结果包装成 `{ status, value/reason }`。

## 队列封装

```js
class RequestQueue {
  constructor(limit = 3) {
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new TypeError('limit must be a positive integer');
    }

    this.limit = limit;
    this.running = 0;
    this.queue = [];
  }

  add(task) {
    if (typeof task !== 'function') {
      return Promise.reject(new TypeError('task must be a function'));
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.runNext();
    });
  }

  runNext() {
    while (this.running < this.limit && this.queue.length > 0) {
      const { task, resolve, reject } = this.queue.shift();
      this.running += 1;

      Promise.resolve()
        .then(task)
        .then(resolve, reject)
        .finally(() => {
          this.running -= 1;
          this.runNext();
        });
    }
  }
}
```

## 测试

```js
const queue = new RequestQueue(2);
const delay = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

queue.add(() => delay(1000, 'A')).then(console.log);
queue.add(() => delay(500, 'B')).then(console.log);
queue.add(() => delay(300, 'C')).then(console.log);
```

## 关键点

1. 队列里放任务函数，不要提前创建 Promise；提前创建会立刻开始执行，无法控制并发。
2. 每个任务结束后都要释放 running/executing，不管成功还是失败。
3. 结果如果要按输入顺序返回，需要记录原始 index。
4. 业务中还可以扩展优先级、取消、重试、超时和暂停恢复。

<!-- id: code-024; difficulty: 2; tags: 异步, 串行, 队列; source: 高频 -->
# 手写异步任务串行调度器（实现 add 方法和 start 方法）

## 基础实现

串行调度的关键是：队列里存任务函数，`start` 时一个任务 `await` 完成后再执行下一个。

```js
class AsyncScheduler {
  constructor() {
    this.tasks = [];
    this.running = false;
  }

  add(task) {
    if (typeof task !== 'function') {
      throw new TypeError('task must be a function');
    }

    if (this.running) {
      throw new Error('Cannot add task while scheduler is running');
    }

    this.tasks.push(task);
    return this;
  }

  async start() {
    if (this.running) {
      throw new Error('Scheduler is already running');
    }

    this.running = true;
    const results = [];

    try {
      for (const task of this.tasks) {
        results.push(await task());
      }
      return results;
    } finally {
      this.running = false;
    }
  }

  clear() {
    if (this.running) {
      throw new Error('Cannot clear while scheduler is running');
    }

    this.tasks = [];
    return this;
  }
}
```

## 测试

```js
const scheduler = new AsyncScheduler();
const delay = (ms, value) => () => new Promise((resolve) => {
  setTimeout(() => resolve(value), ms);
});

scheduler
  .add(delay(300, 'first'))
  .add(delay(100, 'second'))
  .add(delay(200, 'third'));

scheduler.start().then(console.log); // ['first', 'second', 'third']
```

## 继续执行失败任务的版本

如果希望某个任务失败后仍继续后续任务，可以返回 allSettled 风格结果。

```js
class SettledScheduler extends AsyncScheduler {
  async startSettled() {
    const results = [];

    for (const task of this.tasks) {
      try {
        results.push({ status: 'fulfilled', value: await task() });
      } catch (reason) {
        results.push({ status: 'rejected', reason });
      }
    }

    return results;
  }
}
```

## 关键点

1. `add` 接收任务函数，而不是已经创建的 Promise，否则任务会提前执行。
2. 默认实现遇到 reject 会停止并让 `start` reject。
3. 串行总耗时约等于所有任务耗时之和。
4. 生产调度器还可以扩展暂停、恢复、取消、重试和超时。

<!-- id: code-025; difficulty: 2; tags: 对象, Object; source: 高频 -->
# 手写 Object.create、Object.assign

## Object.create

`Object.create(proto, propertiesObject)` 创建一个新对象，并把新对象的原型设置为 `proto`。`proto` 可以是对象、函数或 `null`。

```js
function myObjectCreate(proto, propertiesObject) {
  if (proto !== null && typeof proto !== 'object' && typeof proto !== 'function') {
    throw new TypeError('Object prototype may only be an Object or null');
  }

  const obj = {};
  Object.setPrototypeOf(obj, proto);

  if (propertiesObject !== undefined) {
    Object.defineProperties(obj, propertiesObject);
  }

  return obj;
}
```

如果不用 `Object.setPrototypeOf`，常见的构造函数中转写法不能正确实现 `Object.create(null)`。

## Object.assign

`Object.assign(target, ...sources)` 把 source 的自身可枚举属性复制到 target，包括可枚举 symbol 属性。它是浅拷贝，会触发 getter，并通过赋值触发 target 的 setter。

```js
function myObjectAssign(target, ...sources) {
  if (target == null) {
    throw new TypeError('Cannot convert undefined or null to object');
  }

  const to = Object(target);

  for (const source of sources) {
    if (source == null) continue;

    const from = Object(source);

    for (const key of Reflect.ownKeys(from)) {
      const descriptor = Object.getOwnPropertyDescriptor(from, key);
      if (descriptor?.enumerable) {
        to[key] = from[key];
      }
    }
  }

  return to;
}
```

## 测试

```js
const proto = { greet() { return 'hi'; } };
const obj = myObjectCreate(proto, {
  name: { value: 'Alice', enumerable: true },
});

console.log(obj.greet()); // hi
console.log(Object.getPrototypeOf(myObjectCreate(null))); // null

const sym = Symbol('x');
const result = myObjectAssign({}, { a: 1 }, { a: 2, [sym]: 3 });
console.log(result.a); // 2
console.log(result[sym]); // 3
```

## 关键点

1. `Object.create` 只设置原型，不会执行构造函数。
2. `Object.assign` 只拷贝自身可枚举属性，不拷贝继承属性和不可枚举属性。
3. `Object.assign` 是浅拷贝，嵌套对象仍然共享引用。

<!-- id: code-026; difficulty: 2; tags: 字符串, 模板引擎; source: 高频 -->
# 手写简单模板引擎（支持 {{ variable }} 和 {{#if}} {{/if}} 等逻辑）

## 核心思路

简单模板引擎可以按顺序处理块语法和变量语法：先处理 `{{#each}}`、`{{#if}}`，再替换变量。变量默认应该做 HTML 转义，避免把用户输入直接拼成 HTML。

```js
function getValue(data, path) {
  if (path === 'this') return data.this;
  return path.split('.').reduce((obj, key) => obj?.[key], data);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderTemplate(template, data = {}) {
  let result = template;

  result = result.replace(
    /\{\{#each\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_, path, inner) => {
      const list = getValue(data, path);
      if (!Array.isArray(list)) return '';

      return list
        .map((item, index) => renderTemplate(inner, {
          ...data,
          ...(item && typeof item === 'object' ? item : {}),
          this: item,
          index,
        }))
        .join('');
    },
  );

  result = result.replace(
    /\{\{#if\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, path, inner) => (getValue(data, path) ? renderTemplate(inner, data) : ''),
  );

  result = result.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, path) => {
    const value = getValue(data, path);
    return value == null ? '' : String(value);
  });

  result = result.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const value = getValue(data, path);
    return value == null ? '' : escapeHtml(value);
  });

  return result;
}
```

## 测试

```js
const tpl = `
  <h1>{{title}}</h1>
  {{#if user.isAdmin}}<p>管理员</p>{{/if}}
  <ul>
    {{#each users}}
      <li>{{index}} - {{name}} - {{age}}</li>
    {{/each}}
  </ul>
`;

const html = renderTemplate(tpl, {
  title: '<Hello>',
  user: { isAdmin: true },
  users: [
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 },
  ],
});
```

## 关键点

1. 普通 `{{ name }}` 默认转义，三花括号 `{{{ html }}}` 可以作为非转义输出。
2. `getValue` 支持 `a.b.c` 这种路径访问。
3. 正则写法适合面试简版，但不适合完整模板引擎；真正支持同类块深度嵌套、`else`、表达式和错误提示时，应写 tokenizer + parser + AST render。
4. 如果模板来自用户输入，要特别注意 XSS 和沙箱执行问题。

<!-- id: code-027; difficulty: 2; tags: JSONP, 网络; source: 高频 -->
# 手写 JSONP 实现

## 核心原理

JSONP 利用 `script` 标签可以跨域加载脚本的特性。前端把一个全局回调名传给服务端，服务端返回 `callbackName(data)` 形式的 JavaScript，浏览器加载后执行回调。

```js
function jsonp(url, options = {}) {
  const {
    params = {},
    callbackParam = 'callback',
    timeout = 10000,
  } = options;

  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const requestUrl = new URL(url, window.location.href);
    let timer = null;

    Object.entries(params).forEach(([key, value]) => {
      requestUrl.searchParams.set(key, value);
    });
    requestUrl.searchParams.set(callbackParam, callbackName);

    function cleanup() {
      if (timer) clearTimeout(timer);
      delete window[callbackName];
      script.onerror = null;
      script.onload = null;
      script.parentNode?.removeChild(script);
    }

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error(`JSONP request failed: ${requestUrl.toString()}`));
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error(`JSONP request timeout: ${requestUrl.toString()}`));
    }, timeout);

    script.src = requestUrl.toString();
    document.head.appendChild(script);
  });
}
```

## 使用

```js
jsonp('https://api.example.com/data', {
  params: { id: 123 },
  callbackParam: 'callback',
  timeout: 5000,
}).then(console.log).catch(console.error);
```

## 关键点

1. JSONP 只能发 GET 请求，本质是加载并执行脚本。
2. 服务端必须配合返回 `callbackName({...})`。
3. `script.onerror` 不能可靠拿到 HTTP 状态码和响应体，只能知道脚本加载失败。
4. 必须清理全局回调、script 标签和超时定时器。
5. JSONP 会执行远程代码，存在 XSS 风险，只应信任受控来源；现代项目优先使用 CORS。

<!-- id: code-028; difficulty: 2; tags: ajax, XMLHttpRequest, 网络; source: 高频 -->
# 手写 Ajax 封装（基于 XMLHttpRequest）

## 实现

```js
function ajax(options) {
  const {
    url,
    method = 'GET',
    data = null,
    headers = {},
    timeout = 0,
    withCredentials = false,
    responseType = 'json',
    signal,
  } = options;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const upperMethod = method.toUpperCase();
    const requestUrl = new URL(url, window.location.href);
    let body = null;

    if (data && upperMethod === 'GET') {
      Object.entries(data).forEach(([key, value]) => {
        requestUrl.searchParams.set(key, value);
      });
    } else if (data instanceof FormData || data instanceof Blob || typeof data === 'string') {
      body = data;
    } else if (data != null) {
      body = JSON.stringify(data);
    }

    xhr.open(upperMethod, requestUrl.toString(), true);
    xhr.timeout = timeout;
    xhr.withCredentials = withCredentials;

    const hasContentType = Object.keys(headers).some(
      (key) => key.toLowerCase() === 'content-type',
    );

    if (body != null && !(body instanceof FormData) && !hasContentType) {
      xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    }

    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    function parseResponse() {
      if (responseType === 'text') return xhr.responseText;
      if (responseType === 'blob') return xhr.response;

      const text = xhr.responseText;
      if (!text) return null;

      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }

    xhr.onload = () => {
      const ok = (xhr.status >= 200 && xhr.status < 300) || xhr.status === 304;

      if (ok) {
        resolve({
          data: parseResponse(),
          status: xhr.status,
          statusText: xhr.statusText,
          xhr,
        });
      } else {
        reject(new Error(`Request failed: ${xhr.status} ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.ontimeout = () => reject(new Error('Request timeout'));
    xhr.onabort = () => reject(new Error('Request aborted'));

    if (responseType === 'blob') {
      xhr.responseType = 'blob';
    }

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.send(upperMethod === 'GET' ? null : body);
  });
}
```

## 使用

```js
const controller = new AbortController();

ajax({
  url: '/api/user',
  method: 'POST',
  data: { name: 'Alice' },
  timeout: 5000,
  signal: controller.signal,
}).then(({ data }) => console.log(data));
```

## 关键点

1. GET 参数要合并到 URL 查询串，不能简单拼 `?`。
2. `FormData` 不要手动设置 `Content-Type`，浏览器会自动带 boundary。
3. 成功条件通常是 2xx，也可按业务接受 304。
4. 需要处理 `error`、`timeout`、`abort`。
5. 现代项目一般优先用 `fetch`，但 XHR 仍适合进度事件、老项目和兼容场景。

<!-- id: code-029; difficulty: 2; tags: 图片懒加载, IntersectionObserver; source: 高频 -->
# 手写图片懒加载（使用 IntersectionObserver 和传统方式两种实现）

## IntersectionObserver 版

```js
function loadImage(img) {
  if (img.dataset.srcset) {
    img.srcset = img.dataset.srcset;
    img.removeAttribute('data-srcset');
  }

  if (img.dataset.src) {
    img.src = img.dataset.src;
    img.removeAttribute('data-src');
  }
}

function lazyLoadImages(selector = 'img[data-src], img[data-srcset]', options = {}) {
  const images = Array.from(document.querySelectorAll(selector));

  if (!('IntersectionObserver' in window)) {
    return lazyLoadImagesByScroll(selector, options.offset ?? 100);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const img = entry.target;
        loadImage(img);
        observer.unobserve(img);
      });
    },
    {
      root: options.root ?? null,
      rootMargin: options.rootMargin ?? '100px 0px',
      threshold: options.threshold ?? 0.01,
    },
  );

  images.forEach((img) => observer.observe(img));

  return () => observer.disconnect();
}
```

## 传统滚动监听版

```js
function throttle(fn, delay = 200) {
  let timer = null;
  let lastTime = 0;

  return function throttled(...args) {
    const now = Date.now();
    const remaining = delay - (now - lastTime);

    if (remaining <= 0) {
      clearTimeout(timer);
      timer = null;
      lastTime = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

function lazyLoadImagesByScroll(selector = 'img[data-src], img[data-srcset]', offset = 100) {
  let images = Array.from(document.querySelectorAll(selector));

  function isVisible(img) {
    const rect = img.getBoundingClientRect();
    const viewHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewWidth = window.innerWidth || document.documentElement.clientWidth;

    return (
      rect.bottom >= -offset &&
      rect.right >= -offset &&
      rect.top <= viewHeight + offset &&
      rect.left <= viewWidth + offset
    );
  }

  function check() {
    images = images.filter((img) => {
      if (!isVisible(img)) return true;
      loadImage(img);
      return false;
    });

    if (images.length === 0) {
      window.removeEventListener('scroll', throttledCheck);
      window.removeEventListener('resize', throttledCheck);
    }
  }

  const throttledCheck = throttle(check, 200);

  window.addEventListener('scroll', throttledCheck, { passive: true });
  window.addEventListener('resize', throttledCheck);
  check();

  return () => {
    window.removeEventListener('scroll', throttledCheck);
    window.removeEventListener('resize', throttledCheck);
  };
}
```

## 关键点

1. `IntersectionObserver` 性能更好，不需要每次滚动都计算所有图片位置。
2. `rootMargin` 或 `offset` 可以提前加载，减少用户看到空白的概率。
3. 加载后要 `unobserve` 或从数组中移除，避免重复检查。
4. 滚动监听要节流，并使用 `{ passive: true }` 减少滚动阻塞。
5. 现代浏览器还支持原生 `<img loading="lazy">`，但自定义懒加载仍适合占位、渐进加载和兼容需求。

<!-- id: code-030; difficulty: 2; tags: 虚拟滚动, 性能; source: 高频 -->
# 手写虚拟滚动列表（Virtual Scroll）

## 核心思路

固定高度虚拟滚动只渲染可视区域附近的 DOM：用一个 spacer 撑开总滚动高度，用一个 content 容器渲染当前窗口元素，并通过 `transform` 移动到正确位置。

```js
class VirtualScroll {
  constructor({ container, total, itemHeight, renderItem, overscan = 5 }) {
    this.container = container;
    this.total = total;
    this.itemHeight = itemHeight;
    this.renderItem = renderItem;
    this.overscan = overscan;
    this.rafId = null;

    this.handleScroll = this.handleScroll.bind(this);
    this.handleResize = this.handleResize.bind(this);

    this.init();
  }

  init() {
    this.container.style.position = 'relative';
    this.container.style.overflow = 'auto';

    this.spacer = document.createElement('div');
    this.spacer.style.height = `${this.total * this.itemHeight}px`;

    this.content = document.createElement('div');
    this.content.style.position = 'absolute';
    this.content.style.left = '0';
    this.content.style.top = '0';
    this.content.style.width = '100%';

    this.container.appendChild(this.spacer);
    this.container.appendChild(this.content);
    this.container.addEventListener('scroll', this.handleScroll, { passive: true });
    window.addEventListener('resize', this.handleResize);

    this.render();
  }

  getRange() {
    const scrollTop = this.container.scrollTop;
    const viewHeight = this.container.clientHeight;
    const visibleCount = Math.ceil(viewHeight / this.itemHeight);

    const start = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.overscan);
    const end = Math.min(this.total, start + visibleCount + this.overscan * 2);

    return { start, end, offsetY: start * this.itemHeight };
  }

  handleScroll() {
    if (this.rafId) return;

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.render();
    });
  }

  handleResize() {
    this.render();
  }

  render() {
    const { start, end, offsetY } = this.getRange();
    const fragment = document.createDocumentFragment();

    for (let index = start; index < end; index += 1) {
      const item = this.renderItem(index);
      item.style.height = `${this.itemHeight}px`;
      item.style.boxSizing = 'border-box';
      fragment.appendChild(item);
    }

    this.content.style.transform = `translateY(${offsetY}px)`;
    this.content.replaceChildren(fragment);
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.container.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleResize);
    this.spacer.remove();
    this.content.remove();
  }
}
```

## 使用

```js
new VirtualScroll({
  container: document.getElementById('list'),
  total: 10000,
  itemHeight: 50,
  overscan: 5,
  renderItem(index) {
    const div = document.createElement('div');
    div.textContent = `Item ${index}`;
    return div;
  },
});
```

## 关键点

1. `spacer` 负责制造完整滚动条高度。
2. 实际 DOM 数量约等于可视条数 + overscan，而不是总数据量。
3. `overscan` 可以减少快速滚动时的白屏。
4. 滚动时用 `requestAnimationFrame` 合并渲染，避免高频同步重排。
5. 上面是固定高度版本；动态高度需要高度缓存、前缀和/二分查找或测量回填。

<!-- id: code-031; difficulty: 2; tags: 字符串, 算法; source: 高频 -->
# 手写字符串相关常见题：驼峰转短横线、千分位格式化、URL 解析

## 驼峰和短横线互转

```js
function toKebab(str) {
  return String(str)
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

function toCamel(str) {
  return String(str).replace(/[-_\s]+([a-zA-Z\d])/g, (_, char) => char.toUpperCase());
}

console.log(toKebab('backgroundColor')); // background-color
console.log(toKebab('XMLHttpRequest')); // xml-http-request
console.log(toCamel('background-color')); // backgroundColor
```

## 千分位格式化

```js
function formatThousands(value) {
  const str = String(value);
  const sign = str.startsWith('-') ? '-' : '';
  const unsigned = sign ? str.slice(1) : str;
  const [integer, decimal] = unsigned.split('.');

  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${formattedInteger}${decimal === undefined ? '' : `.${decimal}`}`;
}

console.log(formatThousands(1234567.89)); // 1,234,567.89
console.log(formatThousands(-1234567)); // -1,234,567
```

如果只要展示格式，优先用标准 API：

```js
new Intl.NumberFormat('zh-CN').format(1234567.89); // 1,234,567.89
```

## URL 参数解析

```js
function parseQuery(input) {
  const queryString = input.includes('?')
    ? input.slice(input.indexOf('?') + 1).split('#')[0]
    : input.split('#')[0];

  const result = {};
  const searchParams = new URLSearchParams(queryString);

  searchParams.forEach((value, key) => {
    if (Object.hasOwn(result, key)) {
      result[key] = Array.isArray(result[key])
        ? result[key].concat(value)
        : [result[key], value];
    } else {
      result[key] = value;
    }
  });

  return result;
}

console.log(parseQuery('https://a.com?id=1&tag=js&tag=css#title'));
// { id: '1', tag: ['js', 'css'] }
```

## 关键点

1. URL 参数值天然是字符串，是否转数字或布尔值应由业务决定。
2. `URLSearchParams` 会自动处理百分号编码和 `+` 的空格语义。
3. 千分位手写题要注意负数、小数和字符串输入。
4. 驼峰转换遇到连续大写缩写时，要避免把 `XML` 拆成 `x-m-l`。

<!-- id: code-032; difficulty: 2; tags: 排序, 算法; source: 高频 -->
# 手写快速排序和归并排序

## 快速排序

快速排序选择一个基准值，把数组分成小于、等于、大于基准的三部分，再递归排序。下面是非原地版本，代码清晰但会额外分配数组。

```js
function quickSort(array, compare = (a, b) => a - b) {
  if (array.length <= 1) return array.slice();

  const pivot = array[Math.floor(array.length / 2)];
  const left = [];
  const equal = [];
  const right = [];

  for (const item of array) {
    const order = compare(item, pivot);
    if (order < 0) left.push(item);
    else if (order > 0) right.push(item);
    else equal.push(item);
  }

  return quickSort(left, compare).concat(equal, quickSort(right, compare));
}
```

## 原地快速排序

```js
function quickSortInPlace(array, compare = (a, b) => a - b, left = 0, right = array.length - 1) {
  if (left >= right) return array;

  const pivotIndex = partition(array, compare, left, right);
  quickSortInPlace(array, compare, left, pivotIndex - 1);
  quickSortInPlace(array, compare, pivotIndex + 1, right);
  return array;
}

function partition(array, compare, left, right) {
  const randomIndex = left + Math.floor(Math.random() * (right - left + 1));
  [array[randomIndex], array[right]] = [array[right], array[randomIndex]];

  const pivot = array[right];
  let storeIndex = left;

  for (let i = left; i < right; i += 1) {
    if (compare(array[i], pivot) <= 0) {
      [array[storeIndex], array[i]] = [array[i], array[storeIndex]];
      storeIndex += 1;
    }
  }

  [array[storeIndex], array[right]] = [array[right], array[storeIndex]];
  return storeIndex;
}
```

## 归并排序

归并排序先分治，再合并两个有序数组。它天然稳定，但需要额外空间。

```js
function mergeSort(array, compare = (a, b) => a - b) {
  if (array.length <= 1) return array.slice();

  const mid = Math.floor(array.length / 2);
  const left = mergeSort(array.slice(0, mid), compare);
  const right = mergeSort(array.slice(mid), compare);

  return merge(left, right, compare);
}

function merge(left, right, compare) {
  const result = [];
  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    if (compare(left[i], right[j]) <= 0) {
      result.push(left[i]);
      i += 1;
    } else {
      result.push(right[j]);
      j += 1;
    }
  }

  return result.concat(left.slice(i), right.slice(j));
}
```

## 测试

```js
const nums = [3, 1, 4, 1, 5, 9, 2, 6];
console.log(quickSort(nums)); // [1, 1, 2, 3, 4, 5, 6, 9]
console.log(mergeSort(nums)); // [1, 1, 2, 3, 4, 5, 6, 9]
```

## 对比

1. 快排平均时间复杂度 `O(n log n)`，最坏 `O(n^2)`；随机 pivot 可以降低退化概率。
2. 原地快排空间复杂度主要是递归栈，平均 `O(log n)`，但通常不稳定。
3. 归并排序时间复杂度稳定 `O(n log n)`，空间复杂度 `O(n)`，并且是稳定排序。

<!-- id: code-033; difficulty: 2; tags: 二分查找, 算法; source: 高频 -->
# 手写二分查找（包括查找左边界和右边界）

## 基础二分

数组必须已经按升序排列。基础版返回任意一个命中的索引，找不到返回 `-1`。

```js
function binarySearch(array, target) {
  let left = 0;
  let right = array.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);

    if (array[mid] === target) return mid;
    if (array[mid] < target) left = mid + 1;
    else right = mid - 1;
  }

  return -1;
}
```

## 左边界：第一个 >= target 的位置

```js
function lowerBound(array, target) {
  let left = 0;
  let right = array.length;

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);

    if (array[mid] < target) left = mid + 1;
    else right = mid;
  }

  return left;
}
```

## 右边界：第一个 > target 的位置

```js
function upperBound(array, target) {
  let left = 0;
  let right = array.length;

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);

    if (array[mid] <= target) left = mid + 1;
    else right = mid;
  }

  return left;
}
```

## 第一个和最后一个目标值索引

```js
function firstIndexOf(array, target) {
  const index = lowerBound(array, target);
  return array[index] === target ? index : -1;
}

function lastIndexOf(array, target) {
  const index = upperBound(array, target) - 1;
  return array[index] === target ? index : -1;
}
```

## 测试

```js
const arr = [1, 2, 2, 3, 3, 3, 4, 5];
console.log(binarySearch(arr, 3)); // 3、4 或 5
console.log(lowerBound(arr, 3)); // 3
console.log(upperBound(arr, 3)); // 6
console.log(firstIndexOf(arr, 3)); // 3
console.log(lastIndexOf(arr, 3)); // 5
console.log(firstIndexOf(arr, 6)); // -1
```

## 关键点

1. 用 `[left, right)` 写边界版本更不容易死循环。
2. `lowerBound === upperBound` 只能说明插入区间为空；还要检查数组值是否等于 target。
3. JS 中 `(left + right) >> 1` 会转成 32 位整数，大数组下不如 `left + Math.floor((right - left) / 2)` 稳。

<!-- id: code-034; difficulty: 2; tags: 树, DFS, BFS, 算法; source: 高频 -->
# 手写树的深度优先遍历（DFS）和广度优先遍历（BFS）

## 数据结构

```js
class TreeNode {
  constructor(value, children = []) {
    this.value = value;
    this.children = children;
  }
}
```

## DFS 递归

```js
function dfsRecursive(root, visit = (node) => node.value, result = []) {
  if (!root) return result;

  result.push(visit(root));

  for (const child of root.children ?? []) {
    dfsRecursive(child, visit, result);
  }

  return result;
}
```

## DFS 迭代

```js
function dfsIterative(root, visit = (node) => node.value) {
  if (!root) return [];

  const result = [];
  const stack = [root];

  while (stack.length > 0) {
    const node = stack.pop();
    result.push(visit(node));

    const children = node.children ?? [];
    for (let i = children.length - 1; i >= 0; i -= 1) {
      stack.push(children[i]);
    }
  }

  return result;
}
```

## BFS 层序遍历

```js
function bfs(root, visit = (node) => node.value) {
  if (!root) return [];

  const result = [];
  const queue = [root];
  let head = 0;

  while (head < queue.length) {
    const node = queue[head];
    head += 1;

    result.push(visit(node));
    queue.push(...(node.children ?? []));
  }

  return result;
}
```

## 按层输出

```js
function bfsLevels(root) {
  if (!root) return [];

  const levels = [];
  const queue = [root];
  let head = 0;

  while (head < queue.length) {
    const levelSize = queue.length - head;
    const level = [];

    for (let i = 0; i < levelSize; i += 1) {
      const node = queue[head];
      head += 1;
      level.push(node.value);
      queue.push(...(node.children ?? []));
    }

    levels.push(level);
  }

  return levels;
}
```

## 测试

```js
const tree = new TreeNode(1, [
  new TreeNode(2, [new TreeNode(4), new TreeNode(5)]),
  new TreeNode(3, [new TreeNode(6)]),
]);

console.log(dfsRecursive(tree)); // [1, 2, 4, 5, 3, 6]
console.log(dfsIterative(tree)); // [1, 2, 4, 5, 3, 6]
console.log(bfs(tree)); // [1, 2, 3, 4, 5, 6]
console.log(bfsLevels(tree)); // [[1], [2, 3], [4, 5, 6]]
```

## 关键点

1. DFS 用栈或递归，适合查路径、查子树。
2. BFS 用队列，适合最短层级、层序遍历。
3. JS 数组 `shift()` 是 O(n)，大数据下建议用 `head` 指针模拟队列。

<!-- id: code-035; difficulty: 2; tags: 链表, 算法; source: 高频 -->
# 手写链表常见操作：反转链表、检测环、合并两个有序链表

## 节点定义

```js
class ListNode {
  constructor(value, next = null) {
    this.value = value;
    this.next = next;
  }
}
```

## 反转链表

```js
function reverseList(head) {
  let previous = null;
  let current = head;

  while (current) {
    const next = current.next;
    current.next = previous;
    previous = current;
    current = next;
  }

  return previous;
}
```

递归版本：

```js
function reverseListRecursive(head) {
  if (!head || !head.next) return head;

  const newHead = reverseListRecursive(head.next);
  head.next.next = head;
  head.next = null;
  return newHead;
}
```

## 检测环和找入口

```js
function hasCycle(head) {
  let slow = head;
  let fast = head;

  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }

  return false;
}

function detectCycle(head) {
  let slow = head;
  let fast = head;

  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;

    if (slow === fast) {
      slow = head;
      while (slow !== fast) {
        slow = slow.next;
        fast = fast.next;
      }
      return slow;
    }
  }

  return null;
}
```

## 合并两个有序链表

```js
function mergeTwoLists(listA, listB) {
  const dummy = new ListNode(null);
  let tail = dummy;
  let a = listA;
  let b = listB;

  while (a && b) {
    if (a.value <= b.value) {
      tail.next = a;
      a = a.next;
    } else {
      tail.next = b;
      b = b.next;
    }
    tail = tail.next;
  }

  tail.next = a || b;
  return dummy.next;
}
```

## 工具测试

```js
function fromArray(values) {
  const dummy = new ListNode(null);
  let tail = dummy;

  values.forEach((value) => {
    tail.next = new ListNode(value);
    tail = tail.next;
  });

  return dummy.next;
}

function toArray(head) {
  const result = [];
  while (head) {
    result.push(head.value);
    head = head.next;
  }
  return result;
}

console.log(toArray(reverseList(fromArray([1, 2, 3])))); // [3, 2, 1]
console.log(toArray(mergeTwoLists(fromArray([1, 3]), fromArray([2, 4])))); // [1, 2, 3, 4]
```

## 关键点

1. 反转链表要先保存 `next`，否则会断链。
2. 快慢指针检测环：快指针每次走两步，慢指针走一步。
3. 找环入口时，一个指针回到 head，两个指针同速前进，再次相遇处就是入口。
4. 合并有序链表的写法会复用原节点并修改原链表指针；如果不能修改输入，需要创建新节点。

<!-- id: code-036; difficulty: 3; tags: 设计模式, 单例; source: 高频 -->
# 手写单例模式（包括普通版和基于 Proxy 的版本）

## 闭包版

```js
function createSingleton(Constructor) {
  let instance = null;

  return function getInstance(...args) {
    if (!instance) {
      instance = new Constructor(...args);
    }
    return instance;
  };
}
```

## 类静态属性版

```js
class Database {
  static #instance = null;

  constructor(config) {
    if (Database.#instance) return Database.#instance;

    this.config = config;
    this.connection = null;
    Database.#instance = this;
  }

  connect() {
    this.connection = `Connected to ${this.config.host}`;
    return this;
  }

  static getInstance(config) {
    if (!Database.#instance) {
      Database.#instance = new Database(config);
    }
    return Database.#instance;
  }

  static resetForTest() {
    Database.#instance = null;
  }
}
```

## Proxy 版

`Proxy` 可以拦截 `new` 调用，让普通类透明变成单例类。

```js
function createSingletonProxy(Constructor) {
  let instance = null;

  return new Proxy(Constructor, {
    construct(target, args, newTarget) {
      if (!instance) {
        instance = Reflect.construct(target, args, newTarget);
      }
      return instance;
    },
  });
}
```

## 测试

```js
const SingletonDB = createSingletonProxy(class DB {
  constructor(name) {
    this.name = name;
  }
});

const db1 = new SingletonDB('primary');
const db2 = new SingletonDB('secondary');

console.log(db1 === db2); // true
console.log(db1.name); // primary，第二次构造参数被忽略
```

## 关键点

1. 单例保证某个构造器在进程或模块范围内只有一个实例。
2. 第一次创建之后，后续传入的构造参数通常不会生效，这一点要在 API 设计中明确。
3. 前端常见场景包括全局事件总线、日志器、缓存管理器、SDK 实例。
4. 单例会引入全局状态，测试时通常需要 reset 或依赖注入来隔离状态。

<!-- id: code-037; difficulty: 2; tags: 设计模式, 策略模式; source: 高频 -->
# 手写策略模式（以表单校验为例）

## 核心思路

策略模式把不同校验算法封装成独立策略，调用方只根据策略名选择规则，避免把所有判断写成一长串 `if/else`。

## 策略集合

```js
const strategies = {
  required(value, message = '此项必填') {
    return value === undefined || value === null || value === '' ? message : null;
  },

  minLength(value, length, message = `最少 ${length} 个字符`) {
    return String(value ?? '').length < length ? message : null;
  },

  maxLength(value, length, message = `最多 ${length} 个字符`) {
    return String(value ?? '').length > length ? message : null;
  },

  email(value, message = '请输入有效邮箱') {
    if (value == null || value === '') return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : message;
  },

  pattern(value, regex, message = '格式不正确') {
    if (value == null || value === '') return null;
    return regex.test(value) ? null : message;
  },
};
```

## 校验器

```js
class FormValidator {
  constructor(strategyMap = strategies) {
    this.strategyMap = strategyMap;
    this.rules = new Map();
  }

  addRule(field, strategy, ...args) {
    const validator = typeof strategy === 'function'
      ? strategy
      : this.strategyMap[strategy];

    if (typeof validator !== 'function') {
      throw new Error(`Unknown validator: ${strategy}`);
    }

    if (!this.rules.has(field)) {
      this.rules.set(field, []);
    }

    this.rules.get(field).push({ validator, args });
    return this;
  }

  validate(data) {
    const errors = {};

    for (const [field, rules] of this.rules) {
      for (const { validator, args } of rules) {
        const error = validator(data[field], ...args, data);

        if (error) {
          errors[field] = error;
          break;
        }
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }
}
```

## 使用

```js
const validator = new FormValidator();

validator
  .addRule('username', 'required', '请输入用户名')
  .addRule('username', 'minLength', 3)
  .addRule('email', 'required', '请输入邮箱')
  .addRule('email', 'email')
  .addRule('password', (value, _, data) => (
    value === data.username ? '密码不能和用户名相同' : null
  ));

console.log(validator.validate({ username: 'Al', email: 'invalid', password: 'Al' }));
// { valid: false, errors: { username: '最少 3 个字符', email: '请输入有效邮箱', password: '密码不能和用户名相同' } }
```

## 关键点

1. 策略对象负责具体算法，校验器负责组织和调用策略。
2. `addRule` 保存策略和参数，`validate` 时统一执行。
3. 每个字段可以只返回第一个错误，也可以扩展为收集全部错误。
4. 新增规则只需要增加策略函数，不需要修改主校验流程。

<!-- id: code-038; difficulty: 3; tags: Proxy, 响应式; source: 高频 -->
# 手写基于 Proxy 的响应式系统（类似 Vue3 reactivity）

## 核心结构

响应式系统的核心是：读取时 `track` 收集依赖，写入时 `trigger` 触发依赖。依赖结构通常是 `WeakMap<target, Map<key, Set<effect>>>`。

```js
const targetMap = new WeakMap();
const proxyMap = new WeakMap();
let activeEffect = null;
const effectStack = [];

function cleanup(effectFn) {
  effectFn.deps.forEach((dep) => dep.delete(effectFn));
  effectFn.deps.length = 0;
}

function effect(fn, options = {}) {
  const effectFn = () => {
    cleanup(effectFn);

    try {
      activeEffect = effectFn;
      effectStack.push(effectFn);
      return fn();
    } finally {
      effectStack.pop();
      activeEffect = effectStack[effectStack.length - 1] || null;
    }
  };

  effectFn.deps = [];
  effectFn.scheduler = options.scheduler;

  if (!options.lazy) effectFn();
  return effectFn;
}
```

## track / trigger

```js
function track(target, key) {
  if (!activeEffect) return;

  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }

  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }

  if (!dep.has(activeEffect)) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
  }
}

function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  const effects = depsMap.get(key);
  if (!effects) return;

  const effectsToRun = new Set(effects);
  effectsToRun.forEach((effectFn) => {
    if (effectFn === activeEffect) return;

    if (effectFn.scheduler) {
      effectFn.scheduler(effectFn);
    } else {
      effectFn();
    }
  });
}
```

## reactive

```js
function isObject(value) {
  return value !== null && typeof value === 'object';
}

function reactive(target) {
  if (!isObject(target)) return target;

  const existingProxy = proxyMap.get(target);
  if (existingProxy) return existingProxy;

  const proxy = new Proxy(target, {
    get(obj, key, receiver) {
      const result = Reflect.get(obj, key, receiver);
      track(obj, key);
      return isObject(result) ? reactive(result) : result;
    },

    set(obj, key, value, receiver) {
      const oldValue = obj[key];
      const result = Reflect.set(obj, key, value, receiver);

      if (!Object.is(oldValue, value)) {
        trigger(obj, key);
      }

      return result;
    },

    deleteProperty(obj, key) {
      const hadKey = Object.prototype.hasOwnProperty.call(obj, key);
      const result = Reflect.deleteProperty(obj, key);

      if (hadKey && result) {
        trigger(obj, key);
      }

      return result;
    },
  });

  proxyMap.set(target, proxy);
  return proxy;
}
```

## ref

```js
function ref(rawValue) {
  const wrapper = {
    get value() {
      track(wrapper, 'value');
      return rawValue;
    },
    set value(nextValue) {
      if (!Object.is(rawValue, nextValue)) {
        rawValue = nextValue;
        trigger(wrapper, 'value');
      }
    },
  };

  return wrapper;
}
```

## 测试

```js
const state = reactive({ count: 0, user: { name: 'Alice' } });
const doubled = ref(0);

effect(() => {
  doubled.value = state.count * 2;
});

effect(() => {
  console.log(state.user.name, doubled.value);
});

state.count += 1; // Alice 2
state.user.name = 'Bob'; // Bob 2
```

## 关键点

1. `WeakMap` 避免 target 无法被垃圾回收。
2. `cleanup` 解决条件分支变化导致的过期依赖问题。
3. `effectStack` 支持嵌套 effect。
4. 写入相同值不应重复触发。
5. 完整 Vue3 还要处理数组 length、Map/Set、computed、watch、批量调度和 readonly。

<!-- id: code-039; difficulty: 2; tags: 函数, memoize, 缓存; source: 高频 -->
# 手写函数记忆化（memoize）

## 基础实现

memoize 用缓存保存相同入参的计算结果，适合纯函数和高成本计算。

```js
function memoize(fn, resolver = (...args) => JSON.stringify(args)) {
  if (typeof fn !== 'function') {
    throw new TypeError('fn must be a function');
  }

  const cache = new Map();

  function memoized(...args) {
    const key = resolver.apply(this, args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  }

  memoized.cache = cache;
  memoized.clear = () => cache.clear();

  return memoized;
}
```

## TTL 版本

```js
function memoizeWithTTL(fn, ttl = 5000, resolver = (...args) => JSON.stringify(args)) {
  const cache = new Map();

  return function memoized(...args) {
    const key = resolver.apply(this, args);
    const now = Date.now();
    const cached = cache.get(key);

    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const value = fn.apply(this, args);
    cache.set(key, { value, expiresAt: now + ttl });
    return value;
  };
}
```

## 异步版本

```js
function memoizePromise(fn, resolver = (...args) => JSON.stringify(args)) {
  const cache = new Map();

  return function memoized(...args) {
    const key = resolver.apply(this, args);

    if (!cache.has(key)) {
      const promise = Promise.resolve()
        .then(() => fn.apply(this, args))
        .catch((error) => {
          cache.delete(key); // 失败不缓存，允许重试
          throw error;
        });

      cache.set(key, promise);
    }

    return cache.get(key);
  };
}
```

## 测试

```js
const fib = memoize((n) => {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
});

console.log(fib(40));
```

递归场景要让递归调用走 memoized 函数本身，而不是调用未缓存的原函数。

## 关键点

1. memoize 适合纯函数；如果函数依赖时间、随机数、外部状态或副作用，缓存可能返回错误结果。
2. `JSON.stringify(args)` 简单但有局限：对象 key 顺序、循环引用、函数、symbol 都可能出问题。
3. 对对象参数可以用自定义 resolver，或用嵌套 `WeakMap` 做按引用缓存。
4. 长期运行的缓存要考虑 TTL、LRU 或手动清理，避免内存增长。

<!-- id: code-040; difficulty: 3; tags: Promise, async, 调度; source: 高频 -->
# 手写带优先级的任务调度器

## 实现

下面实现支持并发数限制、优先级、同优先级 FIFO。数字越小优先级越高。

```js
class PriorityScheduler {
  constructor(concurrency = 2) {
    if (!Number.isInteger(concurrency) || concurrency <= 0) {
      throw new TypeError('concurrency must be a positive integer');
    }

    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
    this.sequence = 0;
  }

  add(task, priority = 0) {
    if (typeof task !== 'function') {
      return Promise.reject(new TypeError('task must be a function'));
    }

    return new Promise((resolve, reject) => {
      this.queue.push({
        task,
        priority,
        sequence: this.sequence,
        resolve,
        reject,
      });
      this.sequence += 1;
      this.schedule();
    });
  }

  nextTask() {
    if (this.queue.length === 0) return null;

    let bestIndex = 0;

    for (let i = 1; i < this.queue.length; i += 1) {
      const current = this.queue[i];
      const best = this.queue[bestIndex];

      if (
        current.priority < best.priority ||
        (current.priority === best.priority && current.sequence < best.sequence)
      ) {
        bestIndex = i;
      }
    }

    return this.queue.splice(bestIndex, 1)[0];
  }

  schedule() {
    while (this.running < this.concurrency) {
      const item = this.nextTask();
      if (!item) return;

      this.running += 1;

      Promise.resolve()
        .then(item.task)
        .then(item.resolve, item.reject)
        .finally(() => {
          this.running -= 1;
          this.schedule();
        });
    }
  }

  get pendingCount() {
    return this.queue.length;
  }
}
```

## 测试

```js
const scheduler = new PriorityScheduler(1);
const delay = (ms, label) => () => new Promise((resolve) => {
  setTimeout(() => {
    console.log(label);
    resolve(label);
  }, ms);
});

scheduler.add(delay(100, 'low-1'), 10);
scheduler.add(delay(100, 'normal-1'), 5);
scheduler.add(delay(100, 'high-1'), 1);
scheduler.add(delay(100, 'high-2'), 1);

// 输出：low-1 -> high-1 -> high-2 -> normal-1
```

`low-1` 先输出是因为它添加后已经开始执行；这个简版调度器不会抢占正在运行的任务。

## 关键点

1. 优先级只影响还没开始的任务，不会中断正在运行的任务。
2. 同优先级使用 `sequence` 保证 FIFO，避免排序不稳定。
3. `Promise.resolve().then(task)` 可以捕获同步 throw 和异步 reject。
4. 如果任务量很大，应把线性查找替换成二叉堆优先队列。
5. 生产系统还要考虑取消、暂停、饥饿防护、动态调整优先级和超时。

<!-- id: code-041; difficulty: 2; tags: 数组去重, 算法; source: 高频 -->
# 手写数组去重的多种方式，说明各自的时间复杂度和适用场景

## 常见实现

```js
const arr = [1, 2, 2, '2', null, null, NaN, NaN, { a: 1 }, { a: 1 }];

// 1. Set：最常用，SameValueZero 比较，能去重 NaN
const uniqueBySet = [...new Set(arr)];

// 2. filter + indexOf：老写法，O(n²)，会把 NaN 全部过滤掉
const uniqueByIndexOf = arr.filter((item, index) => arr.indexOf(item) === index);

// 3. reduce + includes：O(n²)，includes 能识别 NaN
const uniqueByReduce = arr.reduce((result, item) => {
  if (!result.includes(item)) result.push(item);
  return result;
}, []);
```

## 按 key 去重

适合对象数组，例如按 `id` 去重。

```js
function uniqueBy(array, keyFn) {
  const seen = new Set();
  const result = [];

  for (const item of array) {
    const key = keyFn(item);
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(item);
  }

  return result;
}

const users = [
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
  { id: 1, name: 'C' },
];

console.log(uniqueBy(users, (user) => user.id));
// [{ id: 1, name: 'A' }, { id: 2, name: 'B' }]
```

## 简单深度去重

```js
function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`;
}

function deepUnique(array) {
  const seen = new Set();

  return array.filter((item) => {
    const key = stableStringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
```

## 复杂度和适用场景

| 方式 | 时间复杂度 | 适用场景 | 注意点 |
|------|------------|----------|--------|
| `Set` | `O(n)` | 基本类型、按引用去重 | 对象内容相同但引用不同不会合并 |
| `filter + indexOf` | `O(n²)` | 兼容老环境的小数组 | 不能正确处理 `NaN` |
| `reduce + includes` | `O(n²)` | 小数组、可读性尚可 | 大数组性能差 |
| `uniqueBy` | `O(n)` | 对象数组按字段去重 | key 冲突要由业务定义 |
| `deepUnique` | 取决于序列化成本 | 简单对象内容去重 | 不适合循环引用、函数、Date、Map、Set 等复杂对象 |

## 关键点

1. `Set` 和 `Map` 使用 SameValueZero，`NaN` 等于 `NaN`，`0` 和 `-0` 视为相同。
2. 对象默认按引用比较，不会按内容比较。
3. 深度去重要先定义“相等”的业务语义，否则很容易误判。

<!-- id: code-042; difficulty: 2; tags: Promise, 超时重试; source: 高频 -->
# 手写带超时和重试机制的请求函数

## 通用 retry

```js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function retry(task, options = {}) {
  const {
    retries = 3,
    delay = 500,
    backoff = 2,
    jitter = 0,
    shouldRetry = () => true,
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await task(attempt);
    } catch (error) {
      lastError = error;

      if (attempt >= retries || !shouldRetry(error, attempt)) {
        break;
      }

      const baseDelay = delay * backoff ** attempt;
      const randomDelay = jitter ? Math.random() * jitter : 0;
      await sleep(baseDelay + randomDelay);
    }
  }

  throw lastError;
}
```

## 带超时的 fetch

`Promise.race` 只能让外层 Promise 超时，不能取消真实网络请求。`fetch` 应使用 `AbortController` 取消请求。

```js
async function fetchWithTimeout(url, options = {}) {
  const { timeout = 5000, signal, ...fetchOptions } = options;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);

  function abortFromOuterSignal() {
    controller.abort();
  }

  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', abortFromOuterSignal, { once: true });
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      error.response = response;
      throw error;
    }

    const contentType = response.headers.get('content-type') || '';
    return contentType.includes('application/json')
      ? response.json()
      : response.text();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(timedOut ? `Timeout after ${timeout}ms` : 'Request aborted');
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener?.('abort', abortFromOuterSignal);
  }
}
```

## 组合使用

```js
function fetchWithRetry(url, options = {}) {
  const {
    retries = 3,
    retryDelay = 500,
    timeout = 5000,
    shouldRetry = (error) =>
      error.message.startsWith('Timeout') ||
      error.status === 408 ||
      error.status === 429 ||
      (error.status >= 500 && error.status < 600),
    ...fetchOptions
  } = options;

  return retry(
    () => fetchWithTimeout(url, { ...fetchOptions, timeout }),
    { retries, delay: retryDelay, shouldRetry },
  );
}
```

## 关键点

1. 超时要取消底层请求，否则请求仍会占用连接和资源。
2. 不应无脑重试所有错误，通常只重试超时、网络错误、429、5xx。
3. 对非幂等请求如支付、下单、创建资源，重试必须配合幂等 key。
4. 指数退避和 jitter 可以降低瞬时重试风暴。

<!-- id: code-043; difficulty: 3; tags: 迭代器, 生成器, ES6; source: 高频 -->
# 手写自定义迭代器和生成器，实现 range、无限序列等

## 自定义 range 迭代器

迭代器对象需要实现 `[Symbol.iterator]`，并返回带 `next()` 方法的对象。

```js
function range(start, end, step = 1) {
  if (step === 0) {
    throw new RangeError('step cannot be 0');
  }

  return {
    [Symbol.iterator]() {
      let current = start;

      return {
        next() {
          const done = step > 0 ? current >= end : current <= end;

          if (done) {
            return { value: undefined, done: true };
          }

          const value = current;
          current += step;
          return { value, done: false };
        },
      };
    },
  };
}

console.log([...range(0, 10, 2)]); // [0, 2, 4, 6, 8]
console.log([...range(5, 0, -2)]); // [5, 3, 1]
```

## 生成器版 range

```js
function* rangeGen(start, end, step = 1) {
  if (step === 0) {
    throw new RangeError('step cannot be 0');
  }

  if (step > 0) {
    for (let i = start; i < end; i += step) yield i;
  } else {
    for (let i = start; i > end; i += step) yield i;
  }
}
```

## 无限序列和惰性处理

```js
function* naturals(start = 0) {
  let current = start;
  while (true) {
    yield current;
    current += 1;
  }
}

function* take(count, iterable) {
  if (count <= 0) return;

  let index = 0;
  for (const item of iterable) {
    yield item;
    index += 1;
    if (index >= count) break;
  }
}

function* lazyMap(iterable, mapper) {
  for (const item of iterable) {
    yield mapper(item);
  }
}

function* lazyFilter(iterable, predicate) {
  for (const item of iterable) {
    if (predicate(item)) yield item;
  }
}
```

## 使用

```js
console.log([...take(5, naturals(1))]); // [1, 2, 3, 4, 5]

const result = [
  ...take(
    10,
    lazyMap(
      lazyFilter(naturals(1), (n) => n % 2 === 0),
      (n) => n * n,
    ),
  ),
];

console.log(result); // [4, 16, 36, 64, 100, 144, 196, 256, 324, 400]
```

## 关键点

1. 迭代器是惰性的，只有调用 `next` 或被 `for...of` 消费时才计算下一个值。
2. 生成器函数 `function*` 可以更简洁地实现迭代器协议。
3. 处理无限序列时必须搭配 `take` 这类截断操作，否则展开会无限执行。
4. `range` 返回的是 iterable，每次重新遍历都会创建一个新的 iterator。

<!-- id: code-044; difficulty: 3; tags: async, 串行并行, 控制流; source: 高频 -->
# 用 Promise 实现 async/await（Generator + 自动执行器）

## 核心思路

`async/await` 可以理解为“Generator + 自动执行器”：每次 `yield` 一个 Promise，等它 fulfilled 后把结果传回 `gen.next(value)`；如果 Promise rejected，就调用 `gen.throw(error)`。

```js
function asyncToGenerator(generatorFn) {
  return function wrapped(...args) {
    const self = this;

    return new Promise((resolve, reject) => {
      let gen;

      try {
        gen = generatorFn.apply(self, args);
      } catch (error) {
        reject(error);
        return;
      }

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
          (nextValue) => step('next', nextValue),
          (error) => step('throw', error),
        );
      }

      step('next');
    });
  };
}
```

## 测试

```js
const fetchData = asyncToGenerator(function* () {
  const user = yield Promise.resolve({ id: 1, name: 'Alice' });
  const posts = yield Promise.resolve([{ title: 'Post 1' }, { title: 'Post 2' }]);
  return { user, posts };
});

fetchData().then(console.log);
```

## 错误处理

```js
const run = asyncToGenerator(function* () {
  try {
    yield Promise.reject(new Error('fail'));
  } catch (error) {
    return error.message;
  }
});

run().then(console.log); // fail
```

## 关键点

1. `yield` 的值可以是普通值或 Promise，要用 `Promise.resolve` 统一处理。
2. fulfilled 后走 `next`，rejected 后走 `throw`。
3. generator 内部未捕获的异常会让外层 Promise reject。
4. `done: true` 时，`value` 就是 async 函数最终 resolve 的值。
5. Babel 的 async 转换核心就是类似的自动执行器加上 runtime 辅助逻辑。

<!-- id: code-045; difficulty: 2; tags: 观察者, 双向绑定; source: 高频 -->
# 手写简单的双向数据绑定（模拟 Vue2 的 Object.defineProperty 方式）

## 依赖收集

```js
class Dep {
  constructor() {
    this.subscribers = new Set();
  }

  depend() {
    if (Dep.target) {
      this.subscribers.add(Dep.target);
    }
  }

  notify() {
    [...this.subscribers].forEach((watcher) => watcher.update());
  }
}

Dep.target = null;
```

## Watcher

```js
class Watcher {
  constructor(vm, key, callback) {
    this.vm = vm;
    this.key = key;
    this.callback = callback;

    Dep.target = this;
    this.value = vm[key]; // 触发 getter，完成依赖收集
    Dep.target = null;
  }

  update() {
    const oldValue = this.value;
    const newValue = this.vm[this.key];

    if (!Object.is(oldValue, newValue)) {
      this.value = newValue;
      this.callback(newValue, oldValue);
    }
  }
}
```

## 响应式处理

```js
function observe(value) {
  if (value === null || typeof value !== 'object') return;

  Object.keys(value).forEach((key) => {
    defineReactive(value, key, value[key]);
  });
}

function defineReactive(obj, key, value) {
  observe(value);

  const dep = new Dep();

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get() {
      dep.depend();
      return value;
    },
    set(nextValue) {
      if (Object.is(nextValue, value)) return;

      value = nextValue;
      observe(nextValue);
      dep.notify();
    },
  });
}
```

## 简版 Vue

```js
class SimpleVue {
  constructor({ el, data }) {
    this.$el = document.querySelector(el);
    this._data = typeof data === 'function' ? data() : data;

    observe(this._data);
    this.proxyData(this._data);
    this.compile(this.$el);
  }

  proxyData(data) {
    Object.keys(data).forEach((key) => {
      Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        get: () => this._data[key],
        set: (value) => {
          this._data[key] = value;
        },
      });
    });
  }

  compile(root) {
    root.querySelectorAll('[v-model]').forEach((node) => {
      const key = node.getAttribute('v-model');
      node.value = this[key] ?? '';

      new Watcher(this, key, (value) => {
        node.value = value ?? '';
      });

      node.addEventListener('input', (event) => {
        this[key] = event.target.value;
      });
    });

    root.querySelectorAll('[v-text]').forEach((node) => {
      const key = node.getAttribute('v-text');
      node.textContent = this[key] ?? '';

      new Watcher(this, key, (value) => {
        node.textContent = value ?? '';
      });
    });
  }
}
```

## 使用

```html
<div id="app">
  <input v-model="message" />
  <p v-text="message"></p>
</div>
```

```js
const vm = new SimpleVue({
  el: '#app',
  data: { message: 'hello' },
});

vm.message = 'world';
```

## 关键点

1. `Object.defineProperty` 在 getter 中收集依赖，在 setter 中触发更新。
2. `v-model` 的双向绑定是“数据变更更新视图 + input 事件更新数据”。
3. Vue2 对新增属性、删除属性、数组索引和 length 变化有天然限制，需要 `Vue.set`、`Vue.delete` 和数组方法劫持补齐。
4. 完整实现还要支持表达式路径、模板文本、computed、watch、异步批量更新和组件渲染。

<!-- id: code-046; difficulty: 2; tags: 类型判断, 工具函数; source: 高频 -->
# 手写完整的类型判断工具函数（is 系列）

## 基础工具

`Object.prototype.toString` 比 `instanceof` 更适合判断内置对象类型，因为它在 iframe / 多 realm 场景下更稳。

```js
const objectToString = Object.prototype.toString;

function rawType(value) {
  return objectToString.call(value).slice(8, -1).toLowerCase();
}

const is = {
  rawType,

  string: (value) => typeof value === 'string',
  number: (value) => typeof value === 'number' && !Number.isNaN(value),
  boolean: (value) => typeof value === 'boolean',
  symbol: (value) => typeof value === 'symbol',
  bigint: (value) => typeof value === 'bigint',
  function: (value) => typeof value === 'function',

  null: (value) => value === null,
  undefined: (value) => value === undefined,
  nullish: (value) => value == null,

  array: Array.isArray,
  object: (value) => value !== null && typeof value === 'object',
  objectLike: (value) => value !== null && typeof value === 'object',

  plainObject(value) {
    if (rawType(value) !== 'object') return false;

    const prototype = Object.getPrototypeOf(value);
    return prototype === null || prototype === Object.prototype;
  },

  date: (value) => rawType(value) === 'date' && !Number.isNaN(value.getTime()),
  regexp: (value) => rawType(value) === 'regexp',
  map: (value) => rawType(value) === 'map',
  set: (value) => rawType(value) === 'set',
  weakMap: (value) => rawType(value) === 'weakmap',
  weakSet: (value) => rawType(value) === 'weakset',
  error: (value) => rawType(value) === 'error',

  promiseLike(value) {
    return (
      value !== null &&
      (typeof value === 'object' || typeof value === 'function') &&
      typeof value.then === 'function'
    );
  },

  integer: Number.isInteger,
  finite: Number.isFinite,
  nan: Number.isNaN,

  empty(value) {
    if (is.nullish(value)) return true;
    if (is.string(value) || is.array(value)) return value.length === 0;
    if (is.map(value) || is.set(value)) return value.size === 0;
    if (is.plainObject(value)) return Object.keys(value).length === 0;
    return false;
  },
};
```

## 测试

```js
console.log(is.rawType(new Date())); // date
console.log(is.plainObject({})); // true
console.log(is.plainObject(Object.create(null))); // true
console.log(is.plainObject(new Date())); // false
console.log(is.promiseLike(Promise.resolve())); // true
console.log(is.empty(new Map())); // true
console.log(is.nan(NaN)); // true
console.log(is.number(NaN)); // false
```

## 关键点

1. `typeof null` 是 `'object'`，所以对象判断必须排除 `null`。
2. `is.number` 是否包含 `NaN` 要先定义语义；这里把 `NaN` 单独归到 `is.nan`。
3. `promiseLike` 判断 thenable，不等于一定是原生 Promise。
4. `plainObject` 判断的是普通对象，数组、Date、Map 都不算。

<!-- id: code-047; difficulty: 3; tags: Trie, 数据结构, 算法; source: 高频 -->
# 手写字典树（Trie）实现自动补全功能

## Trie 实现

Trie 适合前缀匹配：每个节点表示一个字符，根到某个终止节点的路径组成一个单词。

```js
class TrieNode {
  constructor() {
    this.children = new Map();
    this.endCount = 0;
    this.passCount = 0;
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  findNode(prefix) {
    let node = this.root;

    for (const char of prefix) {
      node = node.children.get(char);
      if (!node) return null;
    }

    return node;
  }

  insert(word) {
    let node = this.root;
    node.passCount += 1;

    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char);
      node.passCount += 1;
    }

    node.endCount += 1;
  }

  search(word) {
    const node = this.findNode(word);
    return Boolean(node && node.endCount > 0);
  }

  startsWith(prefix) {
    return Boolean(this.findNode(prefix));
  }

  countWord(word) {
    return this.findNode(word)?.endCount ?? 0;
  }

  autoComplete(prefix, limit = 10) {
    const node = this.findNode(prefix);
    if (!node) return [];

    const results = [];

    function dfs(currentNode, currentWord) {
      if (currentNode.endCount > 0) {
        results.push({ word: currentWord, count: currentNode.endCount });
      }

      for (const [char, child] of currentNode.children) {
        dfs(child, currentWord + char);
      }
    }

    dfs(node, prefix);

    return results
      .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
      .slice(0, limit)
      .map((item) => item.word);
  }

  delete(word) {
    if (!this.search(word)) return false;

    let node = this.root;
    node.passCount -= 1;

    for (const char of word) {
      const child = node.children.get(char);
      child.passCount -= 1;

      if (child.passCount === 0) {
        node.children.delete(char);
        return true;
      }

      node = child;
    }

    node.endCount -= 1;
    return true;
  }
}
```

## 测试

```js
const trie = new Trie();
['apple', 'app', 'application', 'apply', 'apt', 'banana', 'app'].forEach((word) => {
  trie.insert(word);
});

console.log(trie.search('app')); // true
console.log(trie.countWord('app')); // 2
console.log(trie.startsWith('apt')); // true
console.log(trie.autoComplete('app')); // ['app', 'apple', 'application', 'apply']

trie.delete('app');
console.log(trie.countWord('app')); // 1
```

## 关键点

1. `endCount` 表示某个单词出现次数，支持重复插入。
2. `passCount` 表示经过该节点的单词数量，删除时可用于剪枝。
3. 自动补全可以按字典序、插入顺序、词频、最近使用时间或业务权重排序。
4. 复杂度通常与字符串长度相关：插入、搜索、前缀查询都是 `O(m)`。

<!-- id: code-048; difficulty: 3; tags: 设计模式, 中间件; source: 高频 -->
# 手写 Koa/Express 风格的中间件（洋葱模型）

## Koa compose 核心

Koa 的洋葱模型依赖 `await next()`：进入时从外到内，退出时从内到外。

```js
function compose(middlewares) {
  if (!Array.isArray(middlewares)) {
    throw new TypeError('middlewares must be an array');
  }

  middlewares.forEach((middleware) => {
    if (typeof middleware !== 'function') {
      throw new TypeError('middleware must be a function');
    }
  });

  return function composed(ctx, next) {
    let index = -1;

    function dispatch(i) {
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times'));
      }

      index = i;
      let fn = middlewares[i];

      if (i === middlewares.length) {
        fn = next;
      }

      if (!fn) return Promise.resolve();

      try {
        return Promise.resolve(fn(ctx, () => dispatch(i + 1)));
      } catch (error) {
        return Promise.reject(error);
      }
    }

    return dispatch(0);
  };
}
```

## 简版 Koa App

```js
class MiniKoa {
  constructor() {
    this.middlewares = [];
  }

  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new TypeError('middleware must be a function');
    }

    this.middlewares.push(middleware);
    return this;
  }

  async handleRequest(ctx) {
    const fn = compose(this.middlewares);
    await fn(ctx);
    return ctx;
  }
}
```

## 测试

```js
const app = new MiniKoa();
const ctx = { path: '/', body: null, log: [] };

app.use(async (ctx, next) => {
  ctx.log.push('M1 before');
  await next();
  ctx.log.push('M1 after');
});

app.use(async (ctx, next) => {
  ctx.log.push('M2 before');
  await next();
  ctx.log.push('M2 after');
});

app.use(async (ctx) => {
  ctx.log.push('handler');
  ctx.body = 'Hello World';
});

app.handleRequest(ctx).then(() => {
  console.log(ctx.log);
  // ['M1 before', 'M2 before', 'handler', 'M2 after', 'M1 after']
});
```

## Express 风格对比

Express 中间件通常是 `(req, res, next)` callback 风格，`next()` 之后不天然形成 async 洋葱回溯；Koa 中间件返回 Promise，`await next()` 之后的代码会在下游完成后继续执行。

## 关键点

1. `dispatch(i)` 控制执行第 `i` 个中间件。
2. `i <= index` 防止同一个中间件多次调用 `next()`。
3. `Promise.resolve` 同时兼容同步和异步中间件。
4. 错误会沿 Promise 链向外抛，外层中间件可以 `try/catch await next()` 做统一错误处理。

<!-- id: code-049; difficulty: 2; tags: Object, 工具函数, 对象; source: 高频 -->
# 手写对象常见工具函数：omit、pick、merge、groupBy

## pick / omit

```js
function pick(obj, keys) {
  const result = {};
  if (obj == null) return result;

  keys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = obj[key];
    }
  });

  return result;
}

function omit(obj, keys) {
  if (obj == null) return {};

  const excluded = new Set(keys);
  const result = {};

  Reflect.ownKeys(obj).forEach((key) => {
    if (!excluded.has(key) && Object.prototype.propertyIsEnumerable.call(obj, key)) {
      result[key] = obj[key];
    }
  });

  return result;
}
```

## merge

下面实现会递归合并普通对象；数组默认直接覆盖。深合并时要防止 `__proto__` 等原型污染键。

```js
function isPlainObject(value) {
  if (Object.prototype.toString.call(value) !== '[object Object]') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

function isUnsafeKey(key) {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

function merge(target = {}, ...sources) {
  const output = isPlainObject(target) ? { ...target } : {};

  sources.forEach((source) => {
    if (!isPlainObject(source)) return;

    Reflect.ownKeys(source).forEach((key) => {
      if (isUnsafeKey(key) || !Object.prototype.propertyIsEnumerable.call(source, key)) {
        return;
      }

      const sourceValue = source[key];
      const targetValue = output[key];

      if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
        output[key] = merge(targetValue, sourceValue);
      } else if (isPlainObject(sourceValue)) {
        output[key] = merge({}, sourceValue);
      } else {
        output[key] = sourceValue;
      }
    });
  });

  return output;
}
```

## groupBy

```js
function groupBy(array, iteratee) {
  return array.reduce((result, item) => {
    const key = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];
    const groupKey = String(key);

    if (!result[groupKey]) {
      result[groupKey] = [];
    }

    result[groupKey].push(item);
    return result;
  }, {});
}

function groupByToMap(array, iteratee) {
  const result = new Map();

  array.forEach((item) => {
    const key = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(item);
  });

  return result;
}
```

## 测试

```js
const user = { id: 1, name: 'Alice', age: 25, password: 'xxx' };
console.log(pick(user, ['id', 'name']));
console.log(omit(user, ['password', 'age']));

console.log(merge({ a: { b: 1 } }, { a: { c: 2 }, list: [1, 2] }));
// { a: { b: 1, c: 2 }, list: [1, 2] }

const data = [
  { name: 'Alice', dept: 'eng' },
  { name: 'Bob', dept: 'eng' },
  { name: 'Carol', dept: 'design' },
];
console.log(groupBy(data, 'dept'));
```

## 关键点

1. `pick` 建议只取自身属性，避免把原型链属性带出来。
2. `omit` / `pick` 如果要支持 symbol key，使用 `Reflect.ownKeys`。
3. 深合并不是越深越好，数组、Date、Map、Set 等类型要按业务定义策略。
4. `groupBy` 返回对象时 key 会字符串化；如果 key 可能是对象，使用 `Map` 版本。

<!-- id: code-050; difficulty: 3; tags: Promise, 并发, 请求合并; source: 高频 -->
# 手写请求合并（同一时刻多个相同请求合并为一个，类似 SWR 的 deduplication）

## 请求合并（Request Deduplication）

在 SWR / React Query 这类数据请求库中，短时间内多次触发同一个 key 的请求时，应复用同一个进行中的 Promise，而不是重复打到服务端。

```js
class RequestDeduplicator {
  constructor() {
    this.pending = new Map();
  }

  fetch(key, fetcher) {
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    const promise = Promise.resolve()
      .then(fetcher)
      .finally(() => {
        this.pending.delete(key);
      });

    this.pending.set(key, promise);
    return promise;
  }
}

const dedup = new RequestDeduplicator();

Promise.all([
  dedup.fetch("user:1", () => fetch("/api/users/1").then((r) => r.json())),
  dedup.fetch("user:1", () => fetch("/api/users/1").then((r) => r.json())),
]);
```

### 带短期缓存的版本
```js
class SWRCache {
  constructor(ttl = 5000) {
    this.cache = new Map();
    this.pending = new Map();
    this.ttl = ttl;
  }

  get(key, fetcher) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return Promise.resolve(cached.data);
    }

    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    const promise = Promise.resolve()
      .then(fetcher)
      .then((data) => {
        this.cache.set(key, { data, timestamp: Date.now() });
        return data;
      })
      .finally(() => {
        this.pending.delete(key);
      });

    this.pending.set(key, promise);
    return promise;
  }

  invalidate(key) {
    this.cache.delete(key);
  }
}
```

### 工程注意点
- key 必须稳定，通常由 URL、query、body、用户身份和权限上下文共同决定。
- 失败的请求也要在 `finally` 中清理 pending，避免后续请求一直复用失败 Promise。
- GET/只读请求最适合合并；写请求不能随意合并，必须考虑幂等性。
- 缓存 TTL、手动失效、后台刷新和错误重试要分开设计。
