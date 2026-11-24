# TypeScript

<!-- id: ts-001; difficulty: 1; tags: TypeScript, 类型, 基础; source: 高频 -->
# TypeScript 中有哪些基础类型？

## TypeScript 基础类型

### 原始类型
```ts
const name: string = 'Alice'
const age: number = 18
const ok: boolean = true
const id: bigint = 9007199254740991n
const key: symbol = Symbol('key')
const n: null = null
const u: undefined = undefined
```

`null` 和 `undefined` 在 `strictNullChecks` 开启时不会随意赋给其他类型，这是生产项目推荐开启 strict 的原因之一。`bigint` 需要运行环境和编译目标支持。

### 数组、元组和只读数组
```ts
const nums: number[] = [1, 2, 3]
const names: Array<string> = ['a', 'b']

const point: [number, number] = [10, 20]
const record: readonly [id: string, score: number] = ['u1', 100]
const tupleWithRest: [string, ...number[]] = ['total', 1, 2, 3]
```

元组适合表达固定位置、固定长度的数据；普通数组适合表达同质集合。

### 对象相关类型
```ts
type User = {
  id: string
  name: string
  age?: number
}

const user: User = { id: '1', name: 'Alice' }
const map: Record<string, number> = { a: 1 }
```

`object` 表示非原始值，通常不适合描述业务对象；业务对象优先写明确字段或使用 `Record<K, V>`。

### 特殊类型
```ts
let a: any = 1          // 放弃类型检查，尽量少用
let x: unknown = input  // 使用前必须收窄

if (typeof x === 'string') {
  x.toUpperCase()
}

function log(message: string): void {
  console.log(message)
}

function fail(message: string): never {
  throw new Error(message)
}
```

- `unknown` 是安全版 `any`，适合接收外部输入。
- `never` 表示不可能出现的值，常用于穷尽检查。
- `void` 常用于函数没有有意义返回值。

### 字面量和联合类型
```ts
type Direction = 'left' | 'right' | 'up' | 'down'
type HttpStatus = 200 | 400 | 404 | 500

type Result =
  | { ok: true; data: string }
  | { ok: false; error: Error }
```

字面量类型配合联合类型，是 TypeScript 表达业务枚举和状态机的常用方式。

<!-- id: ts-002; difficulty: 1; tags: TypeScript, interface, type, 区别; source: 高频 -->
# interface 和 type 有什么区别？

## interface vs type

两者都能描述对象形状，也都能被类 `implements`。区别主要在表达能力、声明合并和扩展语义。

### 都能描述对象
```ts
interface InterfaceUser {
  id: string
  name: string
}

type TypeUser = {
  id: string
  name: string
}
```

### 扩展方式不同
```ts
interface Animal {
  name: string
}

interface Dog extends Animal {
  breed: string
}

type AnimalType = { name: string }
type DogType = AnimalType & { breed: string }
```

`interface extends` 遇到冲突属性时通常会直接报错；交叉类型 `&` 可能把冲突字段合成 `never`，错误出现得更晚。

### interface 支持声明合并
```ts
interface Window {
  __APP_VERSION__: string
}

interface Window {
  __FEATURE_FLAGS__: Record<string, boolean>
}
```

这适合扩展全局对象或第三方库声明，但业务代码里滥用同名合并会降低可读性。`type` 不能重复声明同名别名。

### type 表达能力更强
```ts
type ID = string | number
type Point = [number, number]
type Nullable<T> = T | null
type ReadonlyKeys<T> = { readonly [K in keyof T]: T[K] }
type UnwrapPromise<T> = T extends Promise<infer R> ? R : T
```

联合类型、元组、条件类型、映射类型、模板字面量类型都需要 `type`。

### 使用建议
- 公开对象 API、可被外部扩展的库声明：优先 `interface`。
- 联合、元组、函数别名、工具类型、复杂类型计算：使用 `type`。
- React Props 用 `type` 或 `interface` 都可以，团队统一即可。
- 不要为了风格争论牺牲一致性；真正重要的是类型边界清晰。

<!-- id: ts-003; difficulty: 1; tags: TypeScript, 泛型, Generic; source: 高频 -->
# 什么是泛型（Generics）？为什么需要泛型？

## 泛型（Generics）

泛型是在类型层面定义参数，让函数、类型、类在保持类型关系的同时复用。它解决的是“输入类型和输出类型有关联，但具体类型要到使用时才知道”的问题。

### 为什么不用 any
```ts
function identityAny(value: any): any {
  return value
}

const a = identityAny(123)
a.toUpperCase() // 编译期不报错，运行时可能炸
```

`any` 会丢失类型信息，泛型可以保留关系。

```ts
function identity<T>(value: T): T {
  return value
}

const n = identity(123)      // number
const s = identity('hello')  // string
```

### 泛型类型和接口
```ts
type ApiResponse<TData> = {
  data: TData
  traceId: string
}

interface Page<TItem> {
  list: TItem[]
  total: number
}

const users: Page<User> = { list: [], total: 0 }
```

### 泛型约束
```ts
function getLength<T extends { length: number }>(value: T): number {
  return value.length
}

function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

const user = { id: '1', name: 'Alice' }
getProperty(user, 'name') // string
getProperty(user, 'age')  // 报错
```

`extends` 在泛型里表示约束，不一定是类继承。

### 默认类型参数
```ts
type Result<TData = unknown, TError = Error> =
  | { ok: true; data: TData }
  | { ok: false; error: TError }
```

默认值适合公共 API，让简单场景少写类型参数，复杂场景还能覆盖。

### 实战原则
- 类型参数应该表达真实关系，例如输入和输出、key 和 value、数据和错误。
- 如果类型参数只出现一次，通常没有必要写泛型。
- 优先让 TypeScript 推断类型参数，只有推断不出或需要约束时再显式传入。
- 需要保留字面量信息时，可以结合 `as const`、`satisfies` 或 const type parameters。

<!-- id: ts-004; difficulty: 1; tags: TypeScript, 枚举, enum; source: 高频 -->
# TypeScript 中 enum（枚举）有哪些使用方式？有什么注意事项？

## TypeScript enum

`enum` 是 TypeScript 少数会生成运行时代码的类型特性。它既是类型，也是运行时对象。

### 数字枚举
```ts
enum Direction {
  Up,
  Down,
  Left,
  Right,
}

Direction.Up // 0
Direction[0] // 'Up'，数字枚举有反向映射
```

数字枚举默认从 0 递增，也可以手动赋值。缺点是运行时代码更多，且数字值可读性差。

### 字符串枚举
```ts
enum RoleEnum {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest',
}
```

字符串枚举没有反向映射，日志和接口数据更可读。它仍然会生成一个运行时对象。

### const enum
```ts
const enum StatusCode {
  Ok = 200,
  NotFound = 404,
}

const code = StatusCode.Ok
```

`const enum` 会在编译时内联，减少运行时代码。但它对构建链要求更高：在 `isolatedModules`、Babel/SWC/esbuild 单文件转译、库发布和跨包引用场景中容易出问题。业务项目内部可谨慎使用，公共库通常避免导出 `const enum`。

### const 对象替代 enum
```ts
const Role = {
  Admin: 'admin',
  User: 'user',
  Guest: 'guest',
} as const

type Role = (typeof Role)[keyof typeof Role]
```

这种写法无特殊 TS 运行时语义，Tree-shaking 和 JS 互操作更直接，也更适合前端应用。

### 注意事项
- 数字枚举有反向映射，字符串枚举没有。
- 异构枚举不要用。
- 如果只是表达 API 字符串取值，优先联合字面量或 `as const` 对象。
- 如果需要运行时枚举对象、和旧代码互操作、或必须 `switch (Enum.X)`，普通 enum 仍可使用。

<!-- id: ts-005; difficulty: 1; tags: TypeScript, 类型断言, as, 非空断言; source: 高频 -->
# TypeScript 中类型断言（Type Assertion）有哪些方式？

## 类型断言

类型断言是告诉 TypeScript：“我比你更了解这个值的类型”。它只影响编译期，不会做运行时转换或校验。

### as 断言
```ts
const el = document.getElementById('name') as HTMLInputElement | null

if (el) {
  el.value = 'hello'
}
```

尖括号写法也存在，但 JSX/TSX 中会和标签语法冲突，所以前端项目通常统一使用 `as`。

```ts
const el = <HTMLInputElement>document.getElementById('name') // TSX 中不要这么写
```

### 非空断言
```ts
const root = document.getElementById('root')!
```

`!` 会移除 `null | undefined`，但如果运行时真的为空仍会报错。优先用显式判断；只在初始化顺序或框架保证非空时使用。

### 双重断言
```ts
const value = raw as unknown as TargetType
```

当两个类型几乎没有重叠时，TS 会阻止直接断言。先断言为 `unknown` 再断言到目标类型可以绕过检查，但风险很高，应该尽量用运行时校验替代。

### as const
```ts
const routes = ['home', 'settings'] as const
type Route = (typeof routes)[number] // 'home' | 'settings'
```

`as const` 会把对象和数组尽量收窄为只读字面量类型，常用于配置表、路由表、枚举值对象。

### satisfies 不是断言
```ts
const palette = {
  red: [255, 0, 0],
  green: '#00ff00',
} satisfies Record<string, string | number[]>
```

`satisfies` 会检查表达式符合目标类型，同时尽量保留原表达式的推断结果。它不会像 `as` 一样强行把类型改成目标类型，因此更适合配置对象校验。

### 类型断言不是类型转换
```ts
const n = '123' as unknown as number
console.log(typeof n) // 'string'

const realNumber = Number('123')
```

如果数据来自接口、localStorage、URL、用户输入，应使用 Zod、Valibot、io-ts 或手写类型守卫做运行时验证，而不是只写断言。

<!-- id: ts-006; difficulty: 2; tags: TypeScript, 工具类型, Partial, Required, Readonly, Pick, Omit; source: 高频 -->
# TypeScript 内置工具类型有哪些？分别有什么作用？

## TypeScript 内置工具类型

工具类型本质上是 TypeScript 标准库里预定义的泛型类型，常用于对象变换、联合类型过滤、函数类型提取和字符串字面量处理。

### 对象属性变换
```ts
type User = {
  id: string
  name: string
  age?: number
  readonly createdAt: Date
}

type UserPatch = Partial<User>        // 所有属性可选
type CompleteUser = Required<User>    // 所有属性必填
type ReadonlyUser = Readonly<User>    // 所有属性只读
type Mutable<T> = { -readonly [K in keyof T]: T[K] }
type StrictUser = Required<Mutable<User>>
```

### 选择和排除属性
```ts
type UserPreview = Pick<User, 'id' | 'name'>
type UserForm = Omit<User, 'id' | 'createdAt'>
type UserMap = Record<string, User>
type RoleMap = Record<'admin' | 'user', string[]>
```

`Record<K, V>` 要求 `K` 是可作为对象 key 的类型，通常是 `string | number | symbol` 的子集。

### 联合类型操作
```ts
type Primitive = string | number | boolean | null

type WithoutNull = NonNullable<Primitive> // string | number | boolean
type OnlyString = Extract<Primitive, string> // string
type NotBoolean = Exclude<Primitive, boolean> // string | number | null
```

### 函数和构造函数提取
```ts
function createUser(id: string, active: boolean) {
  return { id, active }
}

type Args = Parameters<typeof createUser> // [id: string, active: boolean]
type Result = ReturnType<typeof createUser> // { id: string; active: boolean }

class Service {
  constructor(readonly url: string) {}
}

type CtorArgs = ConstructorParameters<typeof Service> // [url: string]
type ServiceInstance = InstanceType<typeof Service> // Service
```

### Promise 和 this 相关
```ts
type Data = Awaited<Promise<Promise<User>>> // User

type Handler = (this: HTMLElement, event: MouseEvent) => void
type HandlerThis = ThisParameterType<Handler> // HTMLElement
type HandlerWithoutThis = OmitThisParameter<Handler>
```

### 字符串工具类型
```ts
type A = Uppercase<'admin'> // 'ADMIN'
type B = Lowercase<'ADMIN'> // 'admin'
type C = Capitalize<'user'> // 'User'
type D = Uncapitalize<'User'> // 'user'
```

### 控制推断
```ts
function createStreetLight<C extends string>(colors: C[], defaultColor?: NoInfer<C>) {}

createStreetLight(['red', 'yellow', 'green'], 'red')
createStreetLight(['red', 'yellow', 'green'], 'blue') // 报错
```

### 常见实现思路
```ts
type MyPartial<T> = { [K in keyof T]?: T[K] }
type MyPick<T, K extends keyof T> = { [P in K]: T[P] }
type MyOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
```

面试时要能说出用途，也要知道它们大多由映射类型、条件类型、`keyof`、`infer` 组合而来。

<!-- id: ts-007; difficulty: 2; tags: TypeScript, 类型守卫, narrowing; source: 高频 -->
# 什么是类型守卫（Type Guard）？有哪些实现方式？

## 类型守卫（Type Guard）

类型守卫是在运行时做检查，让 TypeScript 在某个控制流分支里缩窄类型。它是处理 `unknown`、联合类型和外部输入的核心工具。

### typeof
```ts
function format(value: string | number) {
  if (typeof value === 'string') {
    return value.toUpperCase()
  }
  return value.toFixed(2)
}
```

`typeof` 适合原始类型，但要注意 `typeof null === 'object'`。

### instanceof
```ts
class HttpError extends Error {
  status = 500
}

function handle(error: unknown) {
  if (error instanceof HttpError) {
    console.log(error.status)
  }
}
```

`instanceof` 依赖原型链，跨 iframe、反序列化对象、纯 JSON 数据不一定可靠。

### in 操作符
```ts
type Fish = { swim: () => void }
type Bird = { fly: () => void }

function move(animal: Fish | Bird) {
  if ('swim' in animal) {
    animal.swim()
  } else {
    animal.fly()
  }
}
```

`in` 只能说明属性存在，不代表属性类型正确，复杂数据仍要继续校验。

### 自定义类型谓词
```ts
type User = { id: string; age: number }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isUser(value: unknown): value is User {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.age === 'number'
  )
}

const input: unknown = JSON.parse(text)
if (isUser(input)) {
  input.id
}
```

类型谓词的返回类型是 `value is T`。它必须和运行时逻辑一致，否则就是给类型系统撒谎。

### 可辨识联合
```ts
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rect'; width: number; height: number }

function area(shape: Shape) {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2
    case 'rect':
      return shape.width * shape.height
    default: {
      const exhaustive: never = shape
      return exhaustive
    }
  }
}
```

稳定的判别字段比到处写 `in` 更清晰，也更适合状态机和接口响应。

### 断言函数
```ts
function assertUser(value: unknown): asserts value is User {
  if (!isUser(value)) {
    throw new Error('Invalid user')
  }
}

assertUser(input)
input.id
```

断言函数适合初始化入口、测试、请求边界。业务里大量复杂校验可以直接使用 Zod、Valibot 等 schema 库。

<!-- id: ts-008; difficulty: 2; tags: TypeScript, 条件类型, infer; source: 高频 -->
# 什么是条件类型（Conditional Types）？infer 关键字有什么用？

## 条件类型和 infer

条件类型是在类型层面写三元表达式：`T extends U ? X : Y`。这里的 `extends` 表示可赋值关系，而不只是类继承。

### 基本语法
```ts
type IsString<T> = T extends string ? true : false

type A = IsString<'a'> // true
type B = IsString<123> // false
```

### 分布式条件类型
当条件左侧是裸类型参数，并且传入联合类型时，条件类型会对联合成员逐个分发。

```ts
type ToArray<T> = T extends unknown ? T[] : never

type A = ToArray<string | number> // string[] | number[]
```

阻止分发可以用元组包一层：

```ts
type ToArrayNonDistributive<T> = [T] extends [unknown] ? T[] : never

type B = ToArrayNonDistributive<string | number> // (string | number)[]
```

### infer 的作用
`infer` 只能在条件类型中使用，用来从匹配到的结构里声明一个待推断的类型变量。

```ts
type MyReturnType<T> = T extends (...args: never[]) => infer R ? R : never

type R = MyReturnType<() => Promise<string>> // Promise<string>
```

### 常见提取场景
```ts
type FirstParameter<T> = T extends (first: infer P, ...args: never[]) => unknown ? P : never

type ArrayItem<T> = T extends readonly (infer Item)[] ? Item : never

type PromiseValue<T> = T extends PromiseLike<infer Value> ? Awaited<Value> : T

type PropsOf<T> = T extends React.ComponentType<infer Props> ? Props : never
```

### 实战示例
```ts
type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: Error }

type SuccessData<T> = T extends { ok: true; data: infer Data } ? Data : never

type UserData = SuccessData<ApiResult<User>> // User
```

### 注意事项
- 条件类型很强，但过度递归会拖慢类型检查。
- 对联合类型要明确是否想要分发。
- 处理 Promise 时优先用内置 `Awaited<T>`，它比手写 `Promise<infer T>` 更贴近 thenable 行为。

<!-- id: ts-009; difficulty: 2; tags: TypeScript, 映射类型, keyof, typeof; source: 高频 -->
# 什么是映射类型（Mapped Types）？keyof 和 typeof 有什么用？

## 映射类型、keyof 和 typeof

### keyof
`keyof T` 会得到对象类型 `T` 的 key 联合。

```ts
type User = {
  id: string
  name: string
  age: number
}

type UserKey = keyof User // 'id' | 'name' | 'age'

function get<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}
```

`keyof any` 等价于 `string | number | symbol`，因为 JS 对象 key 允许这些类型。

### typeof 类型查询
`typeof` 在类型位置可以从运行时值提取静态类型。

```ts
const config = {
  theme: 'dark',
  pageSize: 20,
} as const

type Config = typeof config
type ConfigKey = keyof typeof config // 'theme' | 'pageSize'
type Theme = typeof config.theme // 'dark'
```

这常用于从配置对象、路由表、action map 中生成类型。

### 映射类型
映射类型遍历 key 并生成新对象类型。

```ts
type MyReadonly<T> = {
  readonly [K in keyof T]: T[K]
}

type Nullable<T> = {
  [K in keyof T]: T[K] | null
}

type PartialByKey<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
```

### 修饰符
```ts
type Mutable<T> = {
  -readonly [K in keyof T]: T[K]
}

type RequiredFields<T> = {
  [K in keyof T]-?: T[K]
}
```

`+readonly`、`-readonly`、`+?`、`-?` 可以添加或移除修饰符。

### 键名重映射
```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
}

type UserGetters = Getters<User>
// { getId: () => string; getName: () => string; getAge: () => number }
```

映射到 `never` 可以过滤字段：

```ts
type StringProps<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K]
}

type UserStringProps = StringProps<User> // { id: string; name: string }
```

### 面试总结
- `keyof` 从类型取 key。
- `typeof` 从值取类型。
- 映射类型用 `[K in keyof T]` 批量生成新对象类型。
- `as const + typeof + keyof` 是把运行时配置变成类型系统约束的常用组合。

<!-- id: ts-010; difficulty: 2; tags: TypeScript, 装饰器, Decorator; source: 高频 -->
# TypeScript 装饰器（Decorator）是什么？有哪些类型？

## TypeScript Decorator

装饰器是在类和类成员声明上附加元编程逻辑的语法。TypeScript 现在同时需要区分两套语义：标准 ECMAScript 装饰器和旧版 experimental decorators。

### 标准装饰器
TypeScript 5.0 起支持新的标准装饰器语义。装饰器函数通常接收“被装饰的值”和一个 context 对象。

```ts
function loggedMethod<This, Args extends unknown[], Return>(
  original: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>,
) {
  const name = String(context.name)

  return function (this: This, ...args: Args): Return {
    console.log(`enter ${name}`)
    const result = original.call(this, ...args)
    console.log(`exit ${name}`)
    return result
  }
}

class Calculator {
  @loggedMethod
  add(a: number, b: number) {
    return a + b
  }
}
```

### 装饰器工厂
```ts
function minLength(length: number) {
  return function (_value: undefined, context: ClassFieldDecoratorContext) {
    return function (initialValue: string) {
      if (initialValue.length < length) {
        throw new Error(`${String(context.name)} is too short`)
      }
      return initialValue
    }
  }
}

class User {
  @minLength(2)
  name = 'Alice'
}
```

工厂函数返回真正的装饰器，适合传配置。

### 可装饰对象
标准装饰器主要覆盖：
- class
- method
- field
- getter / setter
- accessor / auto-accessor

不同位置的 `value` 和 `context` 类型不同，例如 `ClassDecoratorContext`、`ClassMethodDecoratorContext`、`ClassFieldDecoratorContext`。

### Legacy decorators
很多框架仍使用旧版装饰器，例如 NestJS、Angular 生态中的依赖注入和元数据反射。旧版需要配置：

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

旧版方法装饰器签名是 `target, propertyKey, descriptor`，参数装饰器和 `reflect-metadata` 也属于这一套常见用法。

```ts
function legacyLog(_target: unknown, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value
  descriptor.value = function (...args: unknown[]) {
    console.log(key, args)
    return original.apply(this, args)
  }
}
```

### 注意事项
- 标准装饰器和 legacy decorators 的签名、执行模型、元数据支持不同，不能混着背。
- 新标准装饰器不支持旧版参数装饰器和 `emitDecoratorMetadata` 那套自动类型元数据。
- 装饰器会增加隐式行为，业务代码中要控制使用范围，避免把普通逻辑藏进装饰器。

<!-- id: ts-011; difficulty: 2; tags: TypeScript, tsconfig, 配置; source: 高频 -->
# tsconfig.json 中有哪些重要配置项？

## tsconfig.json 重要配置

`tsconfig.json` 决定 TypeScript 如何解析模块、检查类型和输出文件。不同项目类型配置不同：前端应用通常只做类型检查，由 Vite/esbuild 输出；库项目还需要生成声明文件。

### 现代前端应用常用配置
```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "noEmit": true,

    "strict": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,

    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "vite.config.ts"]
}
```

- `target`：决定输出语法和部分类型库假设。
- `lib`：声明可用的标准 API，例如 DOM、ES2022。
- `module`：输出模块格式；Vite 应用通常保留 ES module。
- `moduleResolution: "bundler"`：更贴近 Vite/Webpack/Rollup 的解析方式。
- `jsx: "react-jsx"`：React 17+ 新 JSX transform。
- `noEmit: true`：应用项目由打包器输出，TS 只负责检查。

### 严格检查
```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true
  }
}
```

`strict` 是底线。`noUncheckedIndexedAccess` 会让 `arr[i]`、`obj[key]` 带上 `undefined`，更贴近运行时。`exactOptionalPropertyTypes` 会区分“属性缺失”和“属性值是 undefined”。

### 库项目配置
```jsonc
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "emitDeclarationOnly": false,
    "outDir": "dist",
    "rootDir": "src",
    "sourceMap": true,
    "composite": true
  }
}
```

库要关注 `.d.ts` 输出、source map、包入口和 `exports` 字段是否一致。

### 模块互操作
```jsonc
{
  "compilerOptions": {
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true
  }
}
```

`esModuleInterop` 主要影响 CommonJS 默认导入兼容。纯 ESM 项目还要配合 `package.json` 的 `type`、Node 版本和打包器规则。

### include / exclude / types
```jsonc
{
  "include": ["src", "scripts"],
  "exclude": ["dist", "coverage"],
  "compilerOptions": {
    "types": ["vite/client", "node"]
  }
}
```

`types` 会限制自动注入的全局类型包；配置后没列进去的 `@types/*` 不会自动进入全局环境。

### 项目引用
Monorepo 或大型项目可用 `references` + `composite` 拆分类型检查边界，加速增量构建。

<!-- id: ts-012; difficulty: 2; tags: TypeScript, React, 组件类型; source: 高频 -->
# TypeScript 与 React 结合时，如何正确定义组件 Props 和常用类型？

## TypeScript + React 常用类型

### Props
```tsx
type ButtonProps = {
  label: string
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
  children?: React.ReactNode
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}

function Button({ label, disabled = false, variant = 'primary', onClick }: ButtonProps) {
  return (
    <button type="button" disabled={disabled} className={variant} onClick={onClick}>
      {label}
    </button>
  )
}
```

不必强制使用 `React.FC`。普通函数组件返回类型通常让 TS 推断即可；需要显式声明时可用 `React.ReactNode` 或 `React.ReactElement`，看组件允许返回什么。

### children
```tsx
type LayoutProps = {
  children: React.ReactNode
}

type OneElementProps = {
  children: React.ReactElement
}
```

`React.ReactNode` 包含 string、number、React element、fragment、数组、null 等，是 children 最常用类型。`React.ReactElement` 更窄，只表示一个 React 元素对象。

### 事件类型
```tsx
function Form() {
  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
  }

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    console.log(event.currentTarget.value)
  }

  return <form onSubmit={handleSubmit} />
}
```

事件里优先读 `currentTarget`，它和泛型参数绑定更准确；`target` 可能是内部子元素。

### DOM Props 透传
```tsx
type IconButtonProps = React.ComponentPropsWithoutRef<'button'> & {
  icon: React.ReactNode
}

function IconButton({ icon, children, ...buttonProps }: IconButtonProps) {
  return <button {...buttonProps}>{icon}{children}</button>
}
```

`ComponentPropsWithoutRef<'button'>` 能复用原生 button 的完整属性类型。需要 ref 时使用 `ComponentPropsWithRef`。

### Ref
```tsx
const inputRef = useRef<HTMLInputElement>(null)
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

inputRef.current?.focus()
```

React 19 中函数组件可以把 `ref` 当作 prop 传递；兼容 React 18 或库代码时仍常见 `forwardRef`。

### 泛型组件
```tsx
type ListProps<T> = {
  items: readonly T[]
  getKey: (item: T) => React.Key
  renderItem: (item: T) => React.ReactNode
}

function List<T>({ items, getKey, renderItem }: ListProps<T>) {
  return <ul>{items.map((item) => <li key={getKey(item)}>{renderItem(item)}</li>)}</ul>
}
```

### Hook 类型
```tsx
const [user, setUser] = useState<User | null>(null)

type Action =
  | { type: 'increment' }
  | { type: 'reset'; payload: number }

function reducer(state: number, action: Action) {
  switch (action.type) {
    case 'increment':
      return state + 1
    case 'reset':
      return action.payload
    default: {
      const exhaustive: never = action
      return exhaustive
    }
  }
}
```

`useState(null)` 这类初始值太窄时要显式写泛型。`useReducer` 用可辨识联合表达 action，方便穷尽检查。

<!-- id: ts-013; difficulty: 2; tags: TypeScript, 函数重载, overload; source: 高频 -->
# TypeScript 函数重载（Overload）是什么？如何使用？

## TypeScript 函数重载

函数重载让同一个函数对外暴露多组调用签名，并根据不同参数返回不同类型。它适合“参数组合不同，返回类型也不同”的 API。

### 基本语法
```ts
function parse(value: string): string[]
function parse(value: URLSearchParams): Record<string, string>
function parse(value: string | URLSearchParams): string[] | Record<string, string> {
  if (typeof value === 'string') {
    return value.split(',')
  }

  return Object.fromEntries(value.entries())
}

const a = parse('a,b') // string[]
const b = parse(new URLSearchParams('a=1')) // Record<string, string>
```

前面的是重载签名，对调用者可见；最后一个是实现签名，只负责兼容所有重载，对调用者不可见。

### 类方法重载
```ts
type EventMap = {
  click: MouseEvent
  keydown: KeyboardEvent
}

class Emitter {
  on(type: 'click', handler: (event: MouseEvent) => void): this
  on(type: 'keydown', handler: (event: KeyboardEvent) => void): this
  on(type: keyof EventMap, handler: (event: EventMap[keyof EventMap]) => void) {
    document.addEventListener(type, handler as EventListener)
    return this
  }
}
```

### 箭头函数重载
箭头函数不能直接写多个实现签名，但可以先声明一个带多个 call signature 的类型。

```ts
type Formatter = {
  (value: string): string
  (value: number, digits?: number): string
}

const format: Formatter = (value: string | number, digits = 2) => {
  return typeof value === 'number' ? value.toFixed(digits) : value.trim()
}
```

### 何时不用重载
如果返回类型不随参数组合变化，用联合类型更简单。

```ts
function print(value: string | number) {
  console.log(value)
}
```

如果能用泛型表达映射关系，泛型通常比大量重载更可维护。

```ts
function first<T>(items: readonly T[]): T | undefined {
  return items[0]
}
```

### 注意事项
- 更具体的重载签名放前面，更宽泛的放后面。
- 实现签名必须能覆盖所有重载。
- 重载不要和实现逻辑脱节，否则类型安全只是表面安全。

<!-- id: ts-014; difficulty: 2; tags: TypeScript, 命名空间, 模块, namespace; source: 高频 -->
# TypeScript 中 namespace 和 module 有什么区别？

## namespace vs module

现代 TypeScript 项目里的 module 通常指 ES Module：一个文件只要有顶层 `import` 或 `export`，就是模块。namespace 是 TypeScript 早期在没有模块系统时组织全局代码的方式。

### ES Module：现代首选
```ts
// math.ts
export function add(a: number, b: number) {
  return a + b
}

export const PI = 3.14159

// main.ts
import { add, PI } from './math'
import * as MathUtils from './math'
```

优势：
- 符合 JavaScript 标准。
- 支持 Vite、Webpack、Rollup、Node ESM 等工具链。
- 更利于静态分析和 tree-shaking。
- 文件天然有作用域，不污染全局。

### namespace
```ts
namespace Validation {
  export interface Validator {
    isAcceptable(input: string): boolean
  }

  export class LettersOnly implements Validator {
    isAcceptable(input: string) {
      return /^[A-Za-z]+$/.test(input)
    }
  }
}
```

非 `declare` 的 namespace 会生成运行时代码，通常是 IIFE/对象挂载。现代应用业务代码不推荐用它组织模块。

### declare namespace
声明文件里仍常见 namespace，用来描述全局变量或 UMD 库的形状，不生成运行时代码。

```ts
declare namespace jQuery {
  function ajax(url: string): void
}
```

### 声明合并
namespace 还能和函数、类、interface 做声明合并，用来描述“函数对象上挂静态成员”的旧 JS 库。

```ts
declare function dayjs(input?: string): Dayjs

declare namespace dayjs {
  function isDayjs(value: unknown): value is Dayjs
}
```

### 使用建议
- 应用源码：使用 ES Module。
- 新库：使用 ES Module，并通过 `exports` 和 `.d.ts` 暴露类型。
- `.d.ts`、全局脚本、老 UMD 库声明：可以使用 `declare namespace`。
- 不要把 namespace 当成现代模块系统的替代品。

<!-- id: ts-015; difficulty: 2; tags: TypeScript, 声明文件, d.ts, 类型声明; source: 高频 -->
# 什么是 .d.ts 声明文件？如何为第三方 JS 库编写类型声明？

## .d.ts 声明文件

`.d.ts` 只描述类型，不包含运行时代码。它让 TypeScript 理解 JS 模块、全局变量、资源文件和第三方库的类型形状。

### 全局声明
```ts
// global.d.ts
export {}

declare global {
  const __APP_VERSION__: string

  interface Window {
    analytics?: {
      track(event: string, payload?: Record<string, unknown>): void
    }
  }
}
```

在模块文件里写 `declare global` 时，需要 `export {}` 让该文件成为模块。

### 声明一个无类型模块
```ts
// legacy-lib.d.ts
declare module 'legacy-lib' {
  export type RequestOptions = {
    url: string
    timeout?: number
  }

  export function request<T = unknown>(options: RequestOptions): Promise<T>

  export default class Client {
    constructor(options: RequestOptions)
    get<T = unknown>(path: string): Promise<T>
    post<T = unknown>(path: string, body: unknown): Promise<T>
  }
}
```

不要为了省事到处返回 `any`；第三方输入输出不确定时优先用 `unknown` 或泛型。

### 为本地 JS 文件补类型
```ts
// legacy.d.ts
export function parse(input: string): { id: string }
export const version: string
```

如果 JS 源码在项目内，也可以开启 `allowJs` + `checkJs`，通过 JSDoc 逐步补类型。

### 资源模块声明
```ts
declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}

declare module '*.svg' {
  const src: string
  export default src
}
```

具体 SVG 是否导出 React 组件取决于构建插件，声明必须和真实构建行为一致。

### 扩展第三方类型
```ts
// express.d.ts
import 'express'

export {}

declare global {
  namespace Express {
    interface Request {
      requestId: string
      user?: { id: string; role: string }
    }
  }
}
```

模块扩展或全局扩展要确保声明文件被 `include` 或 `types` 覆盖到。

### 发布和校验
- 库项目可以用 `declaration: true` 生成 `.d.ts`。
- `package.json` 用 `types` 或 `exports.types` 指向入口声明。
- 写完后运行 `tsc --noEmit` 或类型测试，确认声明和运行时 API 一致。

<!-- id: ts-016; difficulty: 3; tags: TypeScript, 高级类型, 模板字面量类型; source: 字节跳动 -->
# TypeScript 模板字面量类型（Template Literal Types）是什么？有什么实用场景？

## 模板字面量类型

模板字面量类型把字符串字面量、联合类型和类型插值组合起来，在类型层面生成新的字符串模式。

### 基础语法
```ts
type Greeting = `Hello, ${string}`

const a: Greeting = 'Hello, TypeScript'
const b: Greeting = 'Hi, TypeScript' // 报错

type Direction = 'top' | 'bottom' | 'left' | 'right'
type SpacingProp = `margin-${Direction}` | `padding-${Direction}`
// 'margin-top' | 'margin-bottom' | ...
```

联合类型会做笛卡尔积组合，成员太多时会明显拖慢类型检查。

### 字符串工具类型
```ts
type A = Uppercase<'hello'> // 'HELLO'
type B = Lowercase<'HELLO'> // 'hello'
type C = Capitalize<'user'> // 'User'
type D = Uncapitalize<'User'> // 'user'
```

### 事件名推导
```ts
type ChangeEvents<T> = {
  [K in keyof T as `${string & K}Changed`]: (value: T[K]) => void
}

type UserEvents = ChangeEvents<{
  name: string
  age: number
}>
// { nameChanged: (value: string) => void; ageChanged: (value: number) => void }
```

### 路由参数解析
```ts
type ParamNames<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ParamNames<Rest>
    : Path extends `${string}:${infer Param}`
      ? Param
      : never

type Params = ParamNames<'/users/:userId/posts/:postId'>
// 'userId' | 'postId'
```

### 对象路径类型
```ts
type DotPath<T> = {
  [K in keyof T & string]: T[K] extends Record<string, unknown>
    ? K | `${K}.${DotPath<T[K]>}`
    : K
}[keyof T & string]

type Paths = DotPath<{
  user: { profile: { name: string } }
  token: string
}>
// 'user' | 'user.profile' | 'user.profile.name' | 'token'
```

### CSS / 配置约束
```ts
type Unit = 'px' | 'rem' | 'em' | '%'
type Length = `${number}${Unit}` | 0

const width: Length = '12px'
const bad: Length = '12' // 报错
```

### 使用建议
模板字面量类型适合路由、事件名、i18n key、CSS token、配置 key 推导。不要用它解析无限复杂字符串；类型系统没有运行时校验能力，外部输入仍要在运行时验证。

<!-- id: ts-017; difficulty: 3; tags: TypeScript, 协变, 逆变, 双变; source: 字节跳动 -->
# 什么是 TypeScript 中的协变（Covariance）和逆变（Contravariance）？

## 协变、逆变和双变

型变描述的是：当 `Dog extends Animal` 时，`Box<Dog>` 和 `Box<Animal>` 之间是否也存在可赋值关系。

### 协变：输出位置
如果 `T` 只作为返回值或只读数据出现，通常是协变的。

```ts
class Animal { name = '' }
class Dog extends Animal { bark() {} }

type Producer<T> = () => T

const produceDog: Producer<Dog> = () => new Dog()
const produceAnimal: Producer<Animal> = produceDog // 可以
```

能产出 Dog 的函数，也一定能当作“产出 Animal”的函数使用。

### 逆变：输入位置
函数参数在 `strictFunctionTypes` 下按逆变检查。

```ts
type Consumer<T> = (value: T) => void

const consumeAnimal: Consumer<Animal> = (animal) => console.log(animal.name)
const consumeDog: Consumer<Dog> = consumeAnimal // 可以
```

接收 Animal 的函数能处理 Dog；反过来，接收 Dog 的函数不能保证处理所有 Animal。

```ts
const onlyDog: Consumer<Dog> = (dog) => dog.bark()
const unsafe: Consumer<Animal> = onlyDog // 报错
```

### 双变：历史兼容
为了兼容大量 DOM 和类方法场景，TypeScript 中方法参数仍有双变特性；函数属性在 `strictFunctionTypes` 下更严格。

```ts
interface MethodStyle {
  handle(value: Dog): void // 方法，可能双变
}

interface PropertyStyle {
  handle: (value: Dog) => void // 函数属性，更严格
}
```

设计回调类型时，优先用函数属性写法，类型安全更好。

### 不变：同时输入和输出
```ts
type Box<T> = {
  get(): T
  set(value: T): void
}
```

`T` 既出现在输出位置又出现在输入位置，整体往往接近不变；随意把 `Box<Dog>` 当 `Box<Animal>` 会让 `set` 写入非 Dog 的 Animal。

### 数组的实际风险
```ts
const dogs: Dog[] = [new Dog()]
const animals: Animal[] = dogs // TypeScript 允许
animals.push(new Animal())

dogs[1].bark() // 运行时可能出错
```

问题不在 `push` 当下，而是同一个数组引用被写入了不符合原始期望的元素。只读数组更安全：

```ts
const readonlyAnimals: readonly Animal[] = dogs
// readonlyAnimals.push(...) // 不允许
```

### 显式型变标注
TypeScript 支持在部分类型参数上写 `in` / `out` 辅助表达意图，例如 `Producer<out T>`、`Consumer<in T>`。日常代码更多依赖 TS 根据使用位置推断型变。

<!-- id: ts-018; difficulty: 3; tags: TypeScript, 递归类型, DeepPartial, DeepReadonly; source: 高频 -->
# 如何实现 TypeScript 中的递归类型？写出 DeepPartial 和 DeepReadonly。

## TypeScript 递归类型

递归类型是在类型定义里再次引用自身，常用于深层对象变换、路径解析、JSON 类型和类型体操。关键是要设置递归终止条件，避免把函数、Date 等内建对象递归坏。

### 基础版本
```ts
type Primitive = string | number | boolean | bigint | symbol | null | undefined

type Builtin = Primitive | Function | Date | RegExp

type DeepPartial<T> =
  T extends Builtin
    ? T
    : T extends readonly (infer Item)[]
      ? readonly DeepPartial<Item>[]
      : T extends object
        ? { [K in keyof T]?: DeepPartial<T[K]> }
        : T
```

使用：

```ts
type Config = {
  server: { host: string; port: number }
  features: string[]
  createdAt: Date
}

const patch: DeepPartial<Config> = {
  server: { host: 'localhost' },
}
```

`Date` 不会被展开成一堆方法，数组元素会递归处理。

### DeepReadonly
```ts
type DeepReadonly<T> =
  T extends Builtin
    ? T
    : T extends readonly (infer Item)[]
      ? ReadonlyArray<DeepReadonly<Item>>
      : T extends object
        ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
        : T

const config: DeepReadonly<Config> = {
  server: { host: 'localhost', port: 3000 },
  features: ['a'],
  createdAt: new Date(),
}

config.server.port = 4000 // 报错
config.features.push('b') // 报错
```

### 保留元组形状
如果要精确保留元组，可以对 readonly array 使用映射：

```ts
type DeepReadonlyTuple<T> =
  T extends Builtin
    ? T
    : T extends readonly unknown[]
      ? { readonly [K in keyof T]: DeepReadonlyTuple<T[K]> }
      : T extends object
        ? { readonly [K in keyof T]: DeepReadonlyTuple<T[K]> }
        : T
```

### JSONValue 示例
```ts
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue }
```

### 注意事项
- 递归类型有实例化深度限制，复杂类型会报 `Type instantiation is excessively deep`。
- 类型递归越深，编辑器和 `tsc` 越慢。
- 对 Map、Set、Promise、函数、类实例是否递归，要按业务语义显式处理。
- 深层工具类型适合边界建模，不要把所有业务类型都套成深递归。

<!-- id: ts-019; difficulty: 2; tags: TypeScript, 类, 访问修饰符, 抽象类; source: 高频 -->
# TypeScript 类中有哪些访问修饰符？abstract 抽象类有什么用？

## TypeScript 类修饰符和抽象类

### 访问修饰符
```ts
class BankAccount {
  public owner: string          // 默认 public
  protected accountType = 'basic'
  private balance = 0           // TS 编译期私有
  readonly id: string

  constructor(owner: string, private readonly secret: string) {
    this.owner = owner
    this.id = crypto.randomUUID()
  }

  deposit(amount: number) {
    this.balance += amount
  }

  protected canWithdraw(amount: number) {
    return this.balance >= amount
  }
}
```

- `public`：任何地方可访问，默认就是 public。
- `protected`：类内部和子类可访问。
- `private`：TypeScript 编译期限制，只在类内部可访问。
- `readonly`：初始化后不可再赋值，常用于 id、配置。
- 构造函数参数属性如 `private readonly secret: string` 会自动声明并赋值属性。

### JS 私有字段
```ts
class Session {
  #token = ''

  setToken(token: string) {
    this.#token = token
  }
}
```

`#token` 是 JavaScript 运行时私有，外部真的不能访问；TS 的 `private` 主要是类型检查层面的限制。

### override
```ts
class Base {
  save() {}
}

class Child extends Base {
  override save() {}
}
```

配合 `noImplicitOverride`，可以防止子类误以为自己覆写了父类方法。

### abstract 抽象类
```ts
abstract class Shape {
  abstract area(): number

  describe() {
    return `area=${this.area()}`
  }
}

class Circle extends Shape {
  constructor(private readonly radius: number) {
    super()
  }

  area() {
    return Math.PI * this.radius ** 2
  }
}
```

抽象类不能直接实例化，可以包含抽象成员和已实现成员。它适合“需要共享实现 + 强制子类补齐协议”的场景。

### abstract class vs interface
- `interface` 只存在于类型系统，运行时完全擦除。
- `abstract class` 会生成运行时代码，可以放公共方法、字段、构造逻辑。
- 一个类只能继承一个抽象类，但可以实现多个接口。

### implements
```ts
interface Drawable {
  draw(): void
}

class CanvasWidget implements Drawable {
  draw() {}
}
```

`implements` 只检查实例侧结构，不会自动生成方法，也不检查静态成员。

<!-- id: ts-020; difficulty: 2; tags: TypeScript, 索引签名, 索引访问; source: 高频 -->
# TypeScript 中索引签名（Index Signature）和索引访问类型是什么？

## 索引签名和索引访问类型

### 索引签名
索引签名描述“这个对象允许用某类 key 动态访问，并且 value 是某类类型”。

```ts
type StringMap = {
  [key: string]: string
}

const messages: StringMap = {
  ok: 'OK',
  cancel: 'Cancel',
}

messages.save = 'Save'
messages.count = 1 // 报错
```

如果对象有字符串索引签名，所有显式属性的值类型也必须兼容它。

```ts
type Bad = {
  [key: string]: string
  count: number // 报错，number 不兼容 string
}
```

### 数字索引签名
```ts
type StringArrayLike = {
  [index: number]: string
  length: number
}
```

JS 运行时对象 key 最终多会变成字符串，因此同时声明 string 和 number 索引时，number 索引的 value 类型必须是 string 索引 value 类型的子类型。

```ts
type Mixed = {
  [key: string]: string | number
  [index: number]: string
  length: number
}
```

### Record vs 索引签名
```ts
type AnyLocaleMap = Record<string, string>
type FixedLocaleMap = Record<'zh' | 'en', string>
```

key 集合固定时用 `Record<'a' | 'b', V>` 更精确；开放字典用索引签名或 `Record<string, V>`。

### 索引访问类型
`T[K]` 在类型层面读取属性类型。

```ts
type User = {
  id: string
  profile: {
    name: string
    age: number
  }
}

type Id = User['id']
type Profile = User['profile']
type Name = User['profile']['name']
type Value = User[keyof User]
```

联合 key 会得到 value 的联合：

```ts
type NameOrAge = User['profile']['name' | 'age'] // string | number
```

### 数组和 const 对象
```ts
const colors = ['red', 'green', 'blue'] as const
type Color = (typeof colors)[number]

const Status = {
  Pending: 'pending',
  Active: 'active',
} as const

type Status = (typeof Status)[keyof typeof Status]
```

### 配置影响
开启 `noUncheckedIndexedAccess` 后，动态索引读取会包含 `undefined`：

```ts
const value = messages['missing'] // string | undefined
```

这更符合运行时事实，能减少字典读取导致的空值 bug。

<!-- id: ts-021; difficulty: 2; tags: TypeScript, 联合类型, 交叉类型; source: 高频 -->
# TypeScript 联合类型（Union）和交叉类型（Intersection）的区别？

## 联合类型和交叉类型

### 联合类型：A | B
联合类型表示一个值可以是多个类型中的一种。使用前通常需要类型收窄。

```ts
type Result<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; message: string }
  | { status: 'loading' }

function render(result: Result<User>) {
  switch (result.status) {
    case 'success':
      return result.data.name
    case 'error':
      return result.message
    case 'loading':
      return 'loading'
  }
}
```

对象联合只能直接访问共有属性。要访问特有字段，需要通过判别字段、`in`、`typeof`、`instanceof` 等方式收窄。

### 交叉类型：A & B
交叉类型表示一个值同时满足多个类型。

```ts
type Identifiable = { id: string }
type Timestamped = { createdAt: Date; updatedAt: Date }

type Entity = Identifiable & Timestamped

const entity: Entity = {
  id: '1',
  createdAt: new Date(),
  updatedAt: new Date(),
}
```

它常用于混入字段、组合 props、扩展对象结构。

### 冲突字段
```ts
type Conflict = { value: string } & { value: number }
// value: never
```

交叉不是“后者覆盖前者”。两个字段冲突时会求交集，可能得到 `never`。

### 联合分发
条件类型遇到裸类型参数上的联合类型会分发。

```ts
type Flatten<T> = T extends readonly (infer Item)[] ? Item : T

type A = Flatten<string[] | number | boolean[]>
// string | number | boolean
```

### 使用建议
- 状态、接口响应、错误处理：优先可辨识联合。
- “对象同时拥有多组能力”：使用交叉类型。
- 不要用交叉类型模拟继承覆盖；字段覆盖应使用 `Omit<T, K> & { ... }` 明确表达。

<!-- id: ts-022; difficulty: 3; tags: TypeScript, 类型体操, 高级; source: 字节跳动 -->
# 实现 TypeScript 工具类型：Flatten、UnionToIntersection、TupleToUnion。

## 实现 Flatten、UnionToIntersection、TupleToUnion

### Flatten
展开数组或元组的元素类型。是否递归取决于题目要求。

```ts
type FlattenOnce<T> = T extends readonly (infer Item)[] ? Item : T

type A = FlattenOnce<string[]> // string
type B = FlattenOnce<readonly [1, 2]> // 1 | 2
```

递归版本：

```ts
type Flatten<T> = T extends readonly (infer Item)[] ? Flatten<Item> : T

type C = Flatten<number[][][]> // number
type D = Flatten<readonly [1, [2, [3]]]> // 1 | 2 | 3
```

### TupleToUnion
```ts
type TupleToUnion<T extends readonly unknown[]> = T[number]

type A = TupleToUnion<['a', 'b', 1]>
// 'a' | 'b' | 1
```

元组也是数组类型，`T[number]` 表示用数字索引访问所有元素类型。

### UnionToIntersection
```ts
type UnionToIntersection<U> = (
  U extends unknown ? (value: U) => void : never
) extends (value: infer I) => void
  ? I
  : never

type A = UnionToIntersection<{ a: string } | { b: number }>
// { a: string } & { b: number }
```

原理：
1. `U extends unknown ? ... : never` 触发分布式条件类型，把联合拆成多个函数类型。
2. 多个函数参数位置合并推断时，因为参数是逆变位置，会推断成交叉类型。

### 补充：Last 和 Length
```ts
type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer L] ? L : never

type TupleLength<T extends readonly unknown[]> = T['length']

type L = Last<[1, 2, 3]> // 3
type N = TupleLength<[1, 2, 3]> // 3
```

### 注意事项
- 类型体操要优先处理 `readonly` 元组，否则 `as const` 场景会失效。
- 不要在业务类型中滥用复杂递归；可读性和类型检查性能都要考虑。
- `UnionToIntersection` 依赖条件类型分发和函数参数逆变，是面试常考但生产代码要谨慎封装的技巧。

<!-- id: ts-023; difficulty: 2; tags: TypeScript, 函数类型, 高阶函数; source: 高频 -->
# TypeScript 中如何正确定义函数类型？什么是函数类型兼容性？

## 函数类型和兼容性

### 基本定义
```ts
type MathFn = (a: number, b: number) => number

const add: MathFn = (a, b) => a + b
```

有函数属性或重载时，可以用 call signature：

```ts
type Formatter = {
  (value: string): string
  (value: number, digits?: number): string
  cache?: Map<string, string>
}
```

### 可选参数、默认值、剩余参数
```ts
function greet(name: string, title?: string) {
  return title ? `${title} ${name}` : name
}

function sum(...numbers: number[]) {
  return numbers.reduce((total, n) => total + n, 0)
}
```

在函数类型里，`param?: T` 表示调用者可以不传；实现内部要处理 `undefined`。

### 泛型函数
```ts
function map<T, U>(items: readonly T[], project: (item: T) => U): U[] {
  return items.map(project)
}

const lengths = map(['a', 'bb'], (item) => item.length)
```

泛型适合表达参数和返回值之间的类型关系。

### 函数兼容性
TypeScript 是结构类型系统，函数兼容性主要看参数和返回值。

```ts
type Handler = (event: Event, index: number) => void

const simple: Handler = (event) => {
  console.log(event.type)
}
```

参数更少的函数可以赋给参数更多的函数类型，因为调用方多传的参数可以被忽略。数组 `forEach` 回调就是典型场景。

### 返回值协变
```ts
type GetAnimal = () => Animal
const getDog: GetAnimal = () => new Dog()
```

返回更具体的类型可以赋给返回更宽类型的位置。

### 参数逆变
```ts
type HandleAnimal = (value: Animal) => void
const handleDog = (value: Dog) => value.bark()

const unsafe: HandleAnimal = handleDog // strictFunctionTypes 下报错
```

需要能处理 Animal 的地方，不能只给一个只能处理 Dog 的函数。

### void 返回值
```ts
type ClickHandler = () => void

const handler: ClickHandler = () => {
  return 123
}
```

`() => void` 表示调用方会忽略返回值，不代表实现不能返回值。不要把它等同于“函数体必须没有 return”。

### this 参数
```ts
function onClick(this: HTMLButtonElement, event: MouseEvent) {
  console.log(this.disabled, event.clientX)
}
```

`this` 参数只存在于类型层面，必须写在第一个参数位置，适合给老式 callback 或原型方法补类型。

<!-- id: ts-024; difficulty: 1; tags: TypeScript, 类型推断, 自动推断; source: 高频 -->
# TypeScript 的类型推断（Type Inference）是如何工作的？

## TypeScript 类型推断

类型推断是 TS 根据初始化表达式、控制流和上下文自动计算类型，减少显式标注。

### 初始化推断和字面量拓宽
```ts
let count = 1        // number，let 会拓宽
const status = 'ok'  // 'ok'，const 原始值保留字面量

const user = { name: 'Alice' }
// { name: string }，对象属性默认仍会拓宽，因为属性可变
```

如果要保留对象和数组的字面量类型，用 `as const`：

```ts
const routes = ['home', 'settings'] as const
type Route = (typeof routes)[number] // 'home' | 'settings'
```

### 最佳公共类型
```ts
const values = [1, 'a', true]
// (string | number | boolean)[]
```

TS 会为数组成员寻找一个共同类型；找不到单一父类型时通常形成联合类型。

### 上下文推断
```ts
window.addEventListener('click', (event) => {
  event.clientX // MouseEvent
})

const nums = [1, 2, 3]
nums.map((n) => n.toFixed(2)) // n: number
```

回调参数可由调用位置的函数签名反向推断。

### 返回值推断
```ts
function parse(input: string) {
  if (input === '') return null
  return Number(input)
}
// number | null
```

公共 API、递归函数和复杂分支建议显式标注返回类型，避免意外推断泄漏到外部。

### 泛型推断
```ts
function first<T>(items: readonly T[]): T | undefined {
  return items[0]
}

const value = first(['a', 'b']) // string | undefined
```

类型参数通常从实参推断，不需要手写 `first<string>(...)`。

### satisfies
```ts
const config = {
  port: 3000,
  host: 'localhost',
} satisfies { port: number; host: string }

// config.port 通常仍是 number，因为对象属性是可变的
```

`satisfies` 的价值是校验结构，同时避免把整个表达式强制改成目标类型。若要保留字面量，配合 `as const`：

```ts
const strictConfig = {
  port: 3000,
  host: 'localhost',
} as const satisfies { port: number; host: string }

// strictConfig.port: 3000
```

### 推断失效场景
- 空数组 `[]` 可能推成 `never[]` 或上下文类型，需要标注。
- `JSON.parse` 返回 `any`，应转为 `unknown` 后验证。
- 复杂泛型 API 可能需要显式类型参数或 `NoInfer` 控制推断。

<!-- id: ts-025; difficulty: 2; tags: TypeScript, namespace, 模块扩展, augmentation; source: 高频 -->
# TypeScript 中如何扩展第三方模块的类型（模块扩展 Module Augmentation）？

## 模块扩展（Module Augmentation）

模块扩展是在不修改第三方源码的情况下，把额外类型合并到已有模块声明里。常见于 Express Request、MUI Theme、测试框架 matcher、插件系统。

### 扩展已有模块
```ts
// types/express.d.ts
import type { User } from '../src/models/user'
import 'express-serve-static-core'

export {}

declare module 'express-serve-static-core' {
  interface Request {
    user?: User
    requestId: string
  }
}
```

使用时：

```ts
app.use((req, _res, next) => {
  req.requestId = crypto.randomUUID()
  next()
})
```

模块名必须写第三方库实际声明所在的模块名；Express 常见是 `express-serve-static-core`，不是随便写 `express`。

### 扩展全局类型
```ts
// global.d.ts
export {}

declare global {
  interface Window {
    analytics?: {
      track(event: string, properties?: Record<string, unknown>): void
    }
  }
}
```

`declare global` 所在文件要成为模块，通常加 `export {}`。

### 扩展组件库主题
```ts
import '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Theme {
    app: {
      drawerWidth: number
    }
  }

  interface ThemeOptions {
    app?: {
      drawerWidth?: number
    }
  }
}
```

扩展后，`theme.app.drawerWidth` 才会在组件中有类型。

### 扩展原型要同时实现运行时代码
```ts
declare global {
  interface Array<T> {
    first(): T | undefined
  }
}

Array.prototype.first = function () {
  return this[0]
}
```

只写类型声明不会真的给运行时对象添加方法。修改内建原型通常不推荐，除非是受控环境。

### 限制和注意事项
- 声明文件必须被 `tsconfig.include` 或 `types/typeRoots` 覆盖到。
- 模块扩展只能补充已有导出，不能随意给 default export 做 augmentation。
- 扩展类型要和运行时行为一致，否则会制造假的类型安全。
- 第三方库升级后要重新验证扩展点是否还存在。

<!-- id: ts-026; difficulty: 2; tags: TypeScript, 泛型约束, 条件类型, 实战; source: 高频 -->
# 如何用 TypeScript 实现一个类型安全的 EventEmitter？

## 类型安全的 EventEmitter

核心思路是用一个事件名到 payload 的映射表约束 `on/off/emit`。

```ts
type EventMap = Record<PropertyKey, unknown>
type Listener<T> = (payload: T) => void

type EmitArgs<T> = T extends void ? [] : [payload: T]

class TypedEventEmitter<Events extends EventMap> {
  private listeners: Partial<{
    [K in keyof Events]: Set<Listener<Events[K]>>
  }> = {}

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    const set = this.listeners[event] ?? new Set<Listener<Events[K]>>()
    set.add(listener)
    this.listeners[event] = set

    return () => this.off(event, listener)
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>) {
    this.listeners[event]?.delete(listener)
  }

  once<K extends keyof Events>(event: K, listener: Listener<Events[K]>) {
    const unsubscribe = this.on(event, (payload) => {
      unsubscribe()
      listener(payload)
    })
    return unsubscribe
  }

  emit<K extends keyof Events>(event: K, ...args: EmitArgs<Events[K]>) {
    const set = this.listeners[event]
    if (!set?.size) return false

    for (const listener of set) {
      listener(args[0] as Events[K])
    }
    return true
  }
}
```

### 使用
```ts
type AppEvents = {
  login: { userId: string; timestamp: number }
  logout: { userId: string }
  error: Error
  ready: void
}

const emitter = new TypedEventEmitter<AppEvents>()

emitter.on('login', (payload) => {
  payload.userId
  payload.timestamp
})

emitter.emit('login', { userId: 'u1', timestamp: Date.now() })
emitter.emit('ready')

emitter.emit('login', { userId: 1 }) // 报错
emitter.on('missing', () => {}) // 报错
```

### 工程注意点
- 内部存储异构 listener 时少量断言很难完全避免，应把断言封装在类内部，不暴露给调用者。
- `on` 返回 unsubscribe 比链式 `this` 更实用，能减少忘记解绑。
- 生产实现还要考虑错误隔离、监听器执行顺序、最大监听数、异步 listener 和 once 的异常处理。

<!-- id: ts-027; difficulty: 3; tags: TypeScript, 高级类型, Builder模式; source: 高频 -->
# 如何用 TypeScript 泛型实现链式调用（Builder 模式）并保持类型安全？

## 泛型 Builder 模式

Builder 的类型安全重点有两个：链式调用后累积类型信息，以及缺少必填字段时不能 `build`。

### 累积字段类型
```ts
type Expand<T> = { [K in keyof T]: T[K] }

class ObjectBuilder<T extends object = {}> {
  private data: Record<string, unknown> = {}

  set<K extends string, V>(key: K, value: V): ObjectBuilder<Expand<T & Record<K, V>>> {
    this.data[key] = value
    return this as unknown as ObjectBuilder<Expand<T & Record<K, V>>>
  }

  build(): T {
    return this.data as T
  }
}

const value = new ObjectBuilder()
  .set('name', 'Alice')
  .set('age', 30)
  .build()

value.name // string
value.age // number
```

`as unknown as` 是内部实现的类型桥接，调用者仍然得到安全的链式类型。

### 限制 build 的调用时机
```ts
type UserConfig = {
  name: string
  email: string
  age?: number
}

type HasRequired = Pick<UserConfig, 'name' | 'email'>

class UserBuilder<T extends Partial<UserConfig> = {}> {
  private data: Partial<UserConfig> = {}

  name(name: string): UserBuilder<T & Pick<UserConfig, 'name'>> {
    this.data.name = name
    return this as unknown as UserBuilder<T & Pick<UserConfig, 'name'>>
  }

  email(email: string): UserBuilder<T & Pick<UserConfig, 'email'>> {
    this.data.email = email
    return this as unknown as UserBuilder<T & Pick<UserConfig, 'email'>>
  }

  age(age: number): UserBuilder<T & Pick<UserConfig, 'age'>> {
    this.data.age = age
    return this as unknown as UserBuilder<T & Pick<UserConfig, 'age'>>
  }

  build(this: UserBuilder<HasRequired>): UserConfig {
    return this.data as UserConfig
  }
}

new UserBuilder().name('Alice').build() // 报错，缺 email
new UserBuilder().name('Alice').email('a@example.com').build() // 可以
```

### QueryBuilder 示例
```ts
class QueryBuilder<TSelected extends string = never> {
  select<K extends string>(...fields: K[]): QueryBuilder<TSelected | K> {
    return this as unknown as QueryBuilder<TSelected | K>
  }

  execute(): Promise<Array<Record<TSelected, unknown>>> {
    return Promise.resolve([] as Array<Record<TSelected, unknown>>)
  }
}

const rows = await new QueryBuilder().select('id', 'name').execute()
// rows: Array<{ id: unknown; name: unknown }>
```

### 注意事项
Builder 类型越精细，内部断言越多、维护成本越高。对业务代码来说，类型约束应覆盖必填字段、合法状态迁移和返回类型，不必追求所有运行时细节都在类型层模拟。

<!-- id: ts-028; difficulty: 2; tags: TypeScript, 错误处理, Result类型; source: 高频 -->
# 如何用 TypeScript 实现类型安全的错误处理（Result/Either 类型）？

## Result / Either 错误处理

`Result` 把“成功值”和“失败原因”都放进返回类型里，调用者必须处理失败分支，适合不想用异常控制普通业务流程的场景。

### 基础类型
```ts
type Ok<T> = { ok: true; value: T }
type Err<E> = { ok: false; error: E }
type Result<T, E = Error> = Ok<T> | Err<E>

const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })
const err = <E>(error: E): Result<never, E> => ({ ok: false, error })
```

### 使用示例
```ts
type ApiError =
  | { type: 'http'; status: number }
  | { type: 'network'; message: string }
  | { type: 'decode'; message: string }

async function fetchUser(id: string): Promise<Result<User, ApiError>> {
  try {
    const response = await fetch(`/api/users/${id}`)
    if (!response.ok) return err({ type: 'http', status: response.status })

    const raw: unknown = await response.json()
    const parsed = UserSchema.safeParse(raw)
    if (!parsed.success) return err({ type: 'decode', message: parsed.error.message })

    return ok(parsed.data)
  } catch (error) {
    return err({ type: 'network', message: error instanceof Error ? error.message : 'Unknown error' })
  }
}
```

### 消费方处理
```ts
const result = await fetchUser('1')

if (result.ok) {
  result.value.name
} else {
  switch (result.error.type) {
    case 'http':
      console.error(result.error.status)
      break
    case 'network':
    case 'decode':
      console.error(result.error.message)
      break
  }
}
```

### 组合函数
```ts
function map<T, E, U>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result
}

function andThen<T, E, U>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> {
  return result.ok ? fn(result.value) : result
}

function match<T, E, U>(result: Result<T, E>, handlers: { ok: (value: T) => U; err: (error: E) => U }) {
  return result.ok ? handlers.ok(result.value) : handlers.err(result.error)
}
```

### 实战取舍
- Result 适合可预期的业务失败：表单校验、接口状态、解析失败。
- 异常适合不可恢复或跨层中断：程序 bug、资源不可用、框架错误边界。
- `catch (error)` 中的 error 应视为 `unknown`，先收窄再使用。
- API 响应仍需要运行时 schema 校验；泛型不能证明服务端真的返回了 `User`。

<!-- id: ts-029; difficulty: 3; tags: TypeScript, 性能, 类型检查优化; source: 高频 -->
# TypeScript 项目中有哪些常见的类型检查性能问题？如何优化？

## TypeScript 类型检查性能优化

先测量再优化。常用命令：

```bash
tsc --noEmit --extendedDiagnostics
tsc --noEmit --generateTrace trace-dir
```

`extendedDiagnostics` 能看到总耗时、类型实例化数量、内存；trace 用于定位特别慢的类型。

### 常见性能问题
- 巨大的联合类型和模板字面量笛卡尔积。
- 深层递归条件类型、DeepReadonly/DeepPartial 滥用。
- 大量交叉类型叠加，尤其是 `A & B & C & ...`。
- 自动生成的超大 `.d.ts` 或 schema 类型。
- Monorepo 没拆 project references，导致每次全量检查。
- 编辑器同时加载多个 tsconfig，重复分析同一批文件。

### 类型设计优化
```ts
// 不推荐：大量交叉叠加，不易缓存和展示
type User = Base & Profile & Permissions & Settings

// 更推荐：对象形状稳定时用 interface extends
interface User extends Base, Profile, Permissions, Settings {}
```

不是所有 `type` 都慢。真正要避免的是复杂条件类型、递归类型和大规模交叉组合。对象模型可优先用 `interface`，工具类型仍然用 `type`。

### 限制递归和分发
```ts
type NoDistribute<T> = [T] extends [unknown] ? T : never
```

对联合类型不需要分发时，用元组包裹阻止分布式条件类型。深层工具类型要设置递归深度，或只在边界层使用。

### tsconfig 优化
```jsonc
{
  "compilerOptions": {
    "skipLibCheck": true,
    "incremental": true,
    "tsBuildInfoFile": "node_modules/.cache/tsbuildinfo",
    "isolatedModules": true
  }
}
```

`skipLibCheck` 能明显提速，但会跳过依赖声明文件内部检查；应用项目通常可以开，库项目要更谨慎。

### Monorepo 和项目引用
```jsonc
{
  "files": [],
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/ui" },
    { "path": "./apps/web" }
  ]
}
```

每个子包开启 `composite`，让 `tsc -b` 复用缓存并按依赖图增量检查。

### 代码组织
- 使用 `import type` 避免不必要的值依赖。
- 避免把大型 generated types 暴露成全局类型。
- 对复杂泛型库做类型测试和性能回归。
- 编辑器慢时检查 `include` 是否误包含 `dist`、`coverage`、生成目录。

<!-- id: ts-030; difficulty: 2; tags: TypeScript, 泛型, API设计; source: 高频 -->
# 如何用 TypeScript 泛型设计一个类型安全的 API 请求封装？

## 类型安全的 API 请求封装

核心是建立“路由 -> params/body/query/response”的类型映射，再用条件类型决定 options 是否必填。

```ts
type ApiRoutes = {
  'GET /users': {
    query?: { page?: number }
    response: User[]
  }
  'GET /users/:id': {
    params: { id: string }
    response: User
  }
  'POST /users': {
    body: CreateUserDto
    response: User
  }
  'DELETE /users/:id': {
    params: { id: string }
    response: void
  }
}

type RouteDef<R extends keyof ApiRoutes> = ApiRoutes[R]
type ResponseOf<R extends keyof ApiRoutes> = RouteDef<R>['response']

type OptionsOf<R extends keyof ApiRoutes> =
  (RouteDef<R> extends { params: infer P } ? { params: P } : {}) &
  (RouteDef<R> extends { query?: infer Q } ? { query?: Q } : {}) &
  (RouteDef<R> extends { body: infer B } ? { body: B } : {}) &
  { signal?: AbortSignal }

type RequiredOptionKeys<R extends keyof ApiRoutes> =
  RouteDef<R> extends { params: unknown } | { body: unknown } ? true : false

type RequestArgs<R extends keyof ApiRoutes> =
  RequiredOptionKeys<R> extends true
    ? [route: R, options: OptionsOf<R>]
    : [route: R, options?: OptionsOf<R>]
```

### 请求函数
```ts
async function request<R extends keyof ApiRoutes>(
  ...[route, options]: RequestArgs<R>
): Promise<ResponseOf<R>> {
  const [method, rawPath] = String(route).split(' ')
  let url = rawPath

  if ('params' in (options ?? {})) {
    for (const [key, value] of Object.entries(options.params as Record<string, string>)) {
      url = url.replace(`:${key}`, encodeURIComponent(value))
    }
  }

  const response = await fetch(url, {
    method,
    signal: options?.signal,
    headers: 'body' in (options ?? {}) ? { 'Content-Type': 'application/json' } : undefined,
    body: 'body' in (options ?? {}) ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  if (response.status === 204) return undefined as ResponseOf<R>
  return response.json() as Promise<ResponseOf<R>>
}
```

### 使用效果
```ts
const users = await request('GET /users', { query: { page: 1 } })
const user = await request('GET /users/:id', { params: { id: 'u1' } })
const created = await request('POST /users', { body: { name: 'Alice' } })

await request('GET /users/:id') // 报错：缺 params
await request('POST /users', { params: { id: '1' } }) // 报错：不允许 params
```

### 工程注意点
- 泛型只能约束调用方，不会验证服务端响应。响应体要用 Zod/Valibot 等 schema 校验。
- 路径参数替换、query 拼接、204/空响应、错误体解析都要在运行时处理。
- 更大型项目可以从 OpenAPI 生成 `ApiRoutes`，避免手写类型和后端接口漂移。

<!-- id: ts-031; difficulty: 2; tags: TypeScript, 泛型, 工厂函数; source: 高频 -->
# TypeScript 中如何实现一个类型安全的依赖注入容器？

## 类型安全的依赖注入容器

依赖注入的关键是 token 必须携带类型信息。不要只用裸 `string` 或 `symbol`，否则 `resolve<T>()` 的 `T` 很容易由调用者随便写，失去类型安全。

### Typed Token
```ts
type Token<T> = symbol & { readonly __type?: T }

function createToken<T>(description: string): Token<T> {
  return Symbol(description) as Token<T>
}
```

### Container
```ts
class Container {
  private bindings = new Map<Token<unknown>, (container: Container) => unknown>()
  private instances = new Map<Token<unknown>, unknown>()

  bind<T>(token: Token<T>, factory: (container: Container) => T) {
    this.bindings.set(token, factory as (container: Container) => unknown)
    return this
  }

  singleton<T>(token: Token<T>, factory: (container: Container) => T) {
    return this.bind(token, (container) => {
      if (!this.instances.has(token)) {
        this.instances.set(token, factory(container))
      }
      return this.instances.get(token) as T
    })
  }

  resolve<T>(token: Token<T>): T {
    const factory = this.bindings.get(token)
    if (!factory) throw new Error(`No binding for ${String(token.description)}`)
    return factory(this) as T
  }
}
```

内部 `unknown -> T` 的断言集中在容器边界，外部调用由 token 保证类型。

### 使用
```ts
type Logger = { log(message: string): void }
type Database = { query<T = unknown>(sql: string): Promise<T[]> }

const LOGGER = createToken<Logger>('Logger')
const DATABASE = createToken<Database>('Database')
const USER_SERVICE = createToken<UserService>('UserService')

const container = new Container()
  .singleton(LOGGER, () => ({ log: console.log }))
  .singleton(DATABASE, () => createDatabase())
  .bind(USER_SERVICE, (c) => new UserService(c.resolve(LOGGER), c.resolve(DATABASE)))

const service = container.resolve(USER_SERVICE)
```

### 装饰器方案注意点
NestJS 这类框架常用 `reflect-metadata` + legacy decorators 自动读取构造参数类型，但运行时元数据不能表达接口、泛型和联合类型，复杂依赖仍需要显式 `@Inject(Token)`。标准装饰器和 legacy decorators 的元数据机制也不同，不能混用理解。

### 工程建议
- token 应集中定义，避免 `Symbol('Logger')` 到处创建导致取不到同一个依赖。
- 对作用域要建模：transient、singleton、request scoped。
- 容器只能保证解析类型，不能替代运行时生命周期管理和循环依赖检测。

<!-- id: ts-032; difficulty: 2; tags: TypeScript, Zod, 运行时类型验证; source: 高频 -->
# TypeScript 类型只在编译时有效，如何在运行时验证数据类型？

## 运行时类型验证

TypeScript 类型在编译后会被擦除。API 响应、localStorage、URL 参数、用户输入、postMessage 等外部数据都应该先当作 `unknown`，验证后再进入业务类型。

### Schema 库：Zod / Valibot
```ts
import { z } from 'zod'

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  age: z.number().int().nonnegative(),
  role: z.enum(['admin', 'user', 'guest']),
  createdAt: z.string().datetime(),
})

type User = z.infer<typeof UserSchema>

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`)
  const raw: unknown = await response.json()

  const result = UserSchema.safeParse(raw)
  if (!result.success) {
    console.error(result.error.issues)
    throw new Error('Invalid user payload')
  }

  return result.data
}
```

`parse` 失败会抛异常，`safeParse` 返回可辨识联合，更适合显式错误处理。

### 自定义类型守卫
```ts
type User = { id: string; name: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isUser(value: unknown): value is User {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string'
}
```

类型守卫适合简单结构；复杂嵌套、错误消息、转换和复用更适合 schema 库。

### 断言函数
```ts
function assertUser(value: unknown): asserts value is User {
  if (!isUser(value)) {
    throw new Error('Expected User')
  }
}
```

断言函数适合在程序入口处强制校验，成功后后续代码直接获得收窄类型。

### class-validator
NestJS 等后端生态常用 `class-validator` + `class-transformer`：

```ts
class CreateUserDto {
  @IsString()
  name!: string

  @IsEmail()
  email!: string
}
```

这依赖 legacy decorators 和运行时元数据，适合框架场景；前端和函数式代码通常 schema-first 更轻。

### 原则
- 外部输入先是 `unknown`，不要直接 `as User`。
- 泛型请求函数只能约束调用方，不能证明响应体正确。
- schema 应放在边界层：API client、表单提交、配置读取、消息通信。

<!-- id: ts-033; difficulty: 1; tags: TypeScript, 可选链, 空值合并; source: 高频 -->
# TypeScript 中可选链（?.）和空值合并（??）操作符有什么用？

## 可选链和空值合并

### 可选链 `?.`
`?.` 只在左侧是 `null` 或 `undefined` 时短路，结果为 `undefined`。

```ts
const city = user?.address?.city
const first = list?.[0]
const result = callback?.('hello')
```

它不会因为 `0`、`''`、`false` 短路，这一点和很多 `&&` 写法不同。

### 空值合并 `??`
`??` 只在左侧是 `null` 或 `undefined` 时使用右侧默认值。

```ts
const count = input.count ?? 0
const title = input.title ?? 'Untitled'
```

对比 `||`：

```ts
const a = 0 || 10 // 10
const b = 0 ?? 10 // 0

const c = '' || 'default' // 'default'
const d = '' ?? 'default' // ''
```

### 组合使用
```ts
type Config = {
  server?: {
    host?: string
    port?: number
    ssl?: boolean
  }
}

function normalize(config: Config) {
  return {
    host: config.server?.host ?? 'localhost',
    port: config.server?.port ?? 3000,
    ssl: config.server?.ssl ?? false,
  }
}
```

### 注意事项
- `obj?.prop` 的类型通常是 `T | undefined`。
- `?.` 只短路当前链，不会阻止外层表达式继续计算。

```ts
const ratio = user?.score / 100 // user 为空时是 undefined / 100
```

应写成：

```ts
const ratio = (user?.score ?? 0) / 100
```

- `??` 不能不加括号直接和 `||` / `&&` 混用。
- 不能给可选链赋值：`user?.name = 'x'` 是非法的。
- `??=` 只在当前值为 `null | undefined` 时赋值。

<!-- id: ts-034; difficulty: 2; tags: TypeScript, 抽象类, 多态, 设计模式; source: 高频 -->
# TypeScript 中如何用接口和抽象类实现多态？

## 用接口和抽象类实现多态

多态的目标是：调用方依赖稳定协议，而不是依赖具体实现。TypeScript 是结构类型系统，只要结构满足接口，就能作为该接口使用。

### 接口多态
```ts
interface Serializer<T> {
  serialize(value: T): string
}

class JsonSerializer<T> implements Serializer<T> {
  serialize(value: T) {
    return JSON.stringify(value)
  }
}

class CsvUserSerializer implements Serializer<User[]> {
  serialize(users: User[]) {
    return users.map((user) => `${user.id},${user.name}`).join('\n')
  }
}

function save<T>(value: T, serializer: Serializer<T>) {
  const text = serializer.serialize(value)
  return text
}
```

调用方只关心 `Serializer<T>`，不同实现可以替换。

### 抽象类多态
抽象类适合共享流程和公共实现，同时要求子类补齐关键步骤。

```ts
abstract class Exporter<TInput, TOutput> {
  async export(input: TInput): Promise<TOutput> {
    const normalized = await this.normalize(input)
    const output = this.serialize(normalized)
    await this.afterExport(output)
    return output
  }

  protected async normalize(input: TInput): Promise<TInput> {
    return input
  }

  protected abstract serialize(input: TInput): TOutput

  protected async afterExport(_output: TOutput) {}
}

class UserCsvExporter extends Exporter<User[], string> {
  protected serialize(users: User[]) {
    return users.map((user) => `${user.id},${user.name}`).join('\n')
  }
}
```

### interface vs abstract class
- `interface` 只定义结构，运行时不存在，适合插件协议、端口适配、纯能力抽象。
- `abstract class` 有运行时代码，适合模板方法、共享状态、复用部分实现。
- 一个类只能继承一个抽象类，但可以实现多个接口。

### 实战建议
优先用接口表达边界，用组合注入不同实现。只有当确实需要共享流程或状态时，再引入抽象类。

<!-- id: ts-035; difficulty: 2; tags: TypeScript, 类型收窄, discriminated union; source: 高频 -->
# TypeScript 可辨识联合（Discriminated Union）的最佳实践是什么？

## 可辨识联合最佳实践

可辨识联合是用一个共同的字面量字段标识不同分支，让 TypeScript 能在 `switch` 或 `if` 中精确收窄。

### 稳定判别字段
```ts
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rect'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number }
```

`kind`、`type`、`status` 都常见。判别字段应必填、稳定、值为字面量，不要用 boolean 组合代替状态。

### 穷尽检查
```ts
function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`)
}

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2
    case 'rect':
      return shape.width * shape.height
    case 'triangle':
      return shape.base * shape.height / 2
    default:
      return assertNever(shape)
  }
}
```

新增分支后，漏处理的位置会编译报错。

### Action 设计
```ts
type Action =
  | { type: 'increment'; amount: number }
  | { type: 'decrement'; amount: number }
  | { type: 'reset' }

function reducer(state: number, action: Action) {
  switch (action.type) {
    case 'increment':
      return state + action.amount
    case 'decrement':
      return state - action.amount
    case 'reset':
      return 0
    default:
      return assertNever(action)
  }
}
```

不要把所有 action 都写成 `{ type: string; payload?: unknown }`，否则收窄价值会消失。

### UI 状态建模
```ts
type RemoteData<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }
```

这比 `isLoading + data? + error?` 更安全，能避免“loading 和 error 同时为 true”这类非法状态。

### 结合 action creator
```ts
const actions = {
  increment: (amount: number) => ({ type: 'increment', amount }) as const,
  reset: () => ({ type: 'reset' }) as const,
}

type ActionFromCreators = ReturnType<(typeof actions)[keyof typeof actions]>
```

### 原则
- 一个状态分支只放该分支真正存在的数据。
- 判别字段不要可选，不要用宽泛 `string`。
- 在边界解析外部数据时，先运行时校验，再转成可辨识联合。

<!-- id: ts-036; difficulty: 3; tags: TypeScript, 类型编程, Permutation; source: 字节跳动 -->
# 实现 TypeScript 工具类型 Permutation（排列组合），将联合类型转为所有排列的元组。

## Permutation 工具类型

目标：把联合类型转成所有排列元组的联合。

```ts
type Permutation<T, K = T> =
  [T] extends [never]
    ? []
    : K extends K
      ? [K, ...Permutation<Exclude<T, K>>]
      : never

type P = Permutation<'a' | 'b' | 'c'>
// ['a', 'b', 'c'] | ['a', 'c', 'b'] |
// ['b', 'a', 'c'] | ['b', 'c', 'a'] |
// ['c', 'a', 'b'] | ['c', 'b', 'a']
```

### 原理拆解
- `[T] extends [never]`：判断递归终止。用元组包住是为了避免 `never` 分发。
- `K extends K`：触发联合类型分发，让每个联合成员都有机会作为当前第一个元素。
- `Exclude<T, K>`：从剩余候选中移除已经选择的成员。
- `[K, ...Permutation<...>]`：把当前选择拼到后续排列前面。

### 为什么需要 K = T
`T` 会在递归中不断变小；`K` 保存当前层要分发的联合。没有这个辅助参数时，分发和递归剩余集合容易互相干扰。

### 空联合
```ts
type Empty = Permutation<never> // []
```

这也是递归终止条件。

### 相关工具：UnionToTuple
```ts
type UnionToIntersection<U> = (
  U extends unknown ? (value: U) => void : never
) extends (value: infer I) => void
  ? I
  : never

type LastOf<U> = UnionToIntersection<
  U extends unknown ? () => U : never
> extends () => infer R
  ? R
  : never

type UnionToTuple<U, Last = LastOf<U>> =
  [U] extends [never]
    ? []
    : [...UnionToTuple<Exclude<U, Last>>, Last]
```

联合类型本身没有稳定顺序，`UnionToTuple` 的顺序不应作为业务语义依赖。

### 注意事项
排列数量是阶乘级增长，`Permutation<'a' | ...>` 成员稍多就会显著拖慢类型检查。它适合面试和类型挑战，生产代码应谨慎使用。

<!-- id: ts-037; difficulty: 2; tags: TypeScript, 泛型, 柯里化; source: 高频 -->
# TypeScript 如何为柯里化（Currying）函数提供类型支持？

## TypeScript 柯里化类型

柯里化把多参数函数转成一连串单参数函数。类型上要把参数元组递归拆开。

### 两参数版本
```ts
function curry2<A, B, R>(fn: (a: A, b: B) => R): (a: A) => (b: B) => R {
  return (a) => (b) => fn(a, b)
}

const add = curry2((a: number, b: number) => a + b)
add(1)(2) // number
```

### 任意参数的一参柯里化
```ts
type Curry<Args extends readonly unknown[], Return> =
  Args extends readonly [infer First, ...infer Rest]
    ? (arg: First) => Curry<Rest, Return>
    : Return

type Curried<F> = F extends (...args: infer Args) => infer Return
  ? Curry<Args, Return>
  : never

function curry<F extends (...args: never[]) => unknown>(fn: F): Curried<F> {
  function curried(args: unknown[]): unknown {
    if (args.length >= fn.length) {
      return fn(...(args as Parameters<F>))
    }
    return (next: unknown) => curried([...args, next])
  }

  return ((arg: unknown) => curried([arg])) as Curried<F>
}

const sum = curry((a: number, b: number, c: number) => a + b + c)
sum(1)(2)(3) // number
```

这个类型只支持一参一参调用。若要支持 `sum(1, 2)(3)` 这类分组调用，需要更复杂的 partial application 类型。

### Partial Application
```ts
type AnyFn = (...args: never[]) => unknown

type PartialApply<F extends AnyFn, Prefix extends readonly unknown[]> =
  F extends (...args: [...Prefix, ...infer Rest]) => infer Return
    ? (...args: Rest) => Return
    : never

function partial<F extends (...args: unknown[]) => unknown, Prefix extends readonly unknown[]>(
  fn: F,
  ...prefix: Prefix
): PartialApply<F, Prefix> {
  return ((...rest: unknown[]) => fn(...prefix, ...rest)) as PartialApply<F, Prefix>
}

const add3 = (a: number, b: number, c: number) => a + b + c
const add1And2 = partial(add3, 1, 2)
add1And2(3) // number
```

### 注意事项
- 可选参数、默认参数、重载函数会让 curry 类型复杂很多。
- 运行时靠 `fn.length` 判断参数数量时，默认参数和 rest 参数会影响结果。
- 生产项目如果依赖复杂函数式工具，优先使用成熟库的类型定义。

<!-- id: ts-038; difficulty: 2; tags: TypeScript, 工具类型, 实战; source: 高频 -->
# TypeScript 中 Awaited、NoInfer 等较新的工具类型是什么？

## Awaited、NoInfer 等工具类型

### Awaited<T>
`Awaited` 模拟 `await` 的类型行为，会递归展开 Promise/thenable，并对联合类型分发。

```ts
type A = Awaited<Promise<string>> // string
type B = Awaited<Promise<Promise<number>>> // number
type C = Awaited<string | Promise<number>> // string | number

async function fetchUsers() {
  return [] as User[]
}

type Users = Awaited<ReturnType<typeof fetchUsers>> // User[]
```

### NoInfer<T>
`NoInfer` 用来阻止某个位置参与泛型推断，让类型参数从其他位置确定。

```ts
function createStreetLight<C extends string>(colors: C[], defaultColor?: NoInfer<C>) {
  return { colors, defaultColor }
}

createStreetLight(['red', 'yellow', 'green'], 'red')
createStreetLight(['red', 'yellow', 'green'], 'blue') // 报错
```

没有 `NoInfer` 时，`blue` 可能参与推断，让 `C` 变宽。

### ThisParameterType / OmitThisParameter
```ts
function handleClick(this: HTMLButtonElement, event: MouseEvent) {
  console.log(this.disabled, event.clientX)
}

type This = ThisParameterType<typeof handleClick> // HTMLButtonElement
type WithoutThis = OmitThisParameter<typeof handleClick> // (event: MouseEvent) => void
```

### ConstructorParameters / InstanceType
```ts
class Point {
  constructor(public x: number, public y: number) {}
}

type Args = ConstructorParameters<typeof Point> // [x: number, y: number]
type Instance = InstanceType<typeof Point> // Point
```

### ReturnType / Parameters
```ts
function parse(input: string, strict?: boolean) {
  return { input, strict: Boolean(strict) }
}

type ParseArgs = Parameters<typeof parse>
type ParseResult = ReturnType<typeof parse>
```

### ThisType<T>
`ThisType<T>` 是一个标记接口，用于对象字面量中给方法提供上下文 `this` 类型，通常需要 `noImplicitThis`。

```ts
type Descriptor<D, M> = {
  data: D
  methods: M & ThisType<D & M>
}

const descriptor: Descriptor<{ x: number }, { move(dx: number): void }> = {
  data: { x: 0 },
  methods: {
    move(dx) {
      this.x += dx
    },
  },
}
```

<!-- id: ts-039; difficulty: 1; tags: TypeScript, 类型兼容, 结构类型; source: 高频 -->
# TypeScript 的类型系统是结构类型（Structural Typing）还是名义类型（Nominal Typing）？

## TypeScript 是结构类型系统

TypeScript 主要采用结构类型：两个类型只要成员结构兼容，就可以互相赋值，不要求声明名相同。

```ts
interface Point2D {
  x: number
  y: number
}

interface Coordinate {
  x: number
  y: number
}

const point: Point2D = { x: 1, y: 2 }
const coordinate: Coordinate = point // 可以
```

### 鸭子类型
```ts
interface Printable {
  print(): void
}

class Report {
  print() {}
  exportPdf() {}
}

function print(value: Printable) {
  value.print()
}

print(new Report()) // Report 没写 implements Printable 也可以
```

### 额外属性检查
对象字面量直接赋给目标类型时，会触发额外属性检查。

```ts
type Config = { host: string; port: number }

const a: Config = { host: 'localhost', port: 3000, debug: true } // 报错

const raw = { host: 'localhost', port: 3000, debug: true }
const b: Config = raw // 可以
```

这不是名义类型，而是对象字面量的一层实用校验。

### 类的 private/protected 例外
带有 `private` 或 `protected` 成员的类会出现类似名义类型的兼容限制：只有来自同一声明源的私有/受保护成员才兼容。

```ts
class A {
  private id = 1
}

class B {
  private id = 1
}

let a: A = new B() // 报错
```

### Branded Type 模拟名义类型
```ts
declare const brand: unique symbol

type Brand<T, Name extends string> = T & { readonly [brand]: Name }

type UserId = Brand<string, 'UserId'>
type OrderId = Brand<string, 'OrderId'>

function asUserId(value: string): UserId {
  return value as UserId
}

function getUser(id: UserId) {}

const userId = asUserId('u1')
const orderId = 'o1' as OrderId

getUser(userId)
getUser(orderId) // 报错
```

结构类型让 JS 互操作更自然；品牌类型适合给 id、金额、单位等原始值增加领域约束。

<!-- id: ts-040; difficulty: 2; tags: TypeScript, 模块, ESM, CommonJS; source: 高频 -->
# TypeScript 中如何处理 ESM 和 CommonJS 模块互操作？

## ESM 和 CommonJS 互操作

先区分运行环境：前端 bundler 项目和 Node 运行时项目配置不同。

### Vite / Webpack / Rollup 项目
```jsonc
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "verbatimModuleSyntax": true,
    "esModuleInterop": true
  }
}
```

bundler 会处理很多 CJS/ESM 互操作细节，TS 主要负责类型检查。

### Node 项目
```jsonc
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "verbatimModuleSyntax": true,
    "esModuleInterop": true
  }
}
```

NodeNext 会结合 `package.json` 的 `type` 字段、文件扩展名 `.ts/.mts/.cts` 判断每个文件按 ESM 还是 CJS 处理。

### esModuleInterop
很多 CommonJS 包写法是：

```js
module.exports = function createApp() {}
```

开启 `esModuleInterop` 后，TS 会更符合 Babel/打包器习惯，允许：

```ts
import createApp from 'some-cjs-package'
```

但这不代表所有 CJS 包都可靠支持具名导入。具名导入是否可用取决于运行时和工具链的 CJS 静态分析能力。

### export = 声明
老式 CJS 类型声明常见：

```ts
declare function createApp(): App
export = createApp
```

使用方式：

```ts
import createApp = require('create-app')
```

开启互操作后也可能写 default import，但库作者的声明和运行时输出必须一致。

### Node ESM 相对路径扩展名
```ts
import { foo } from './foo.js'
```

在 Node ESM 下，源码是 `foo.ts` 时也通常写编译后的 `.js` 扩展名，因为运行时加载的是 JS 文件。Bundler 模式通常不强制这一点。

### package exports 和 types
```jsonc
{
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

库发布时要保证 ESM、CJS 和 `.d.ts` 指向一致。双包发布还要避免同一个包被同时以 ESM/CJS 两份实例加载。

### import type
```ts
import type { User } from './types'
import { createUser } from './createUser'
```

配合 `verbatimModuleSyntax`，类型导入会被擦除，值导入会保留，能减少“类型和值混用”导致的运行时错误。

<!-- id: ts-041; difficulty: 2; tags: TypeScript, 泛型, 类型推断, 实战; source: 高频 -->
# TypeScript 中如何实现一个类型安全的状态机（State Machine）？

## 类型安全状态机

状态机的类型安全重点是：状态名只能来自配置，事件名只能来自配置，transition 的目标状态必须存在。

### 配置类型
```ts
type StateNode<State extends string, Event extends string> = {
  on?: Partial<Record<Event, State>>
  entry?: () => void
  exit?: () => void
}

type MachineConfig<State extends string, Event extends string> = {
  initial: State
  states: Record<State, StateNode<State, Event>>
}
```

### 实现
```ts
class StateMachine<State extends string, Event extends string> {
  private current: State

  constructor(private readonly config: MachineConfig<State, Event>) {
    this.current = config.initial
    this.config.states[this.current].entry?.()
  }

  send(event: Event) {
    const currentNode = this.config.states[this.current]
    const next = currentNode.on?.[event]
    if (!next) return this

    currentNode.exit?.()
    this.current = next
    this.config.states[this.current].entry?.()
    return this
  }

  getState() {
    return this.current
  }

  matches(state: State) {
    return this.current === state
  }
}
```

### 使用
```ts
type TrafficState = 'red' | 'green' | 'yellow'
type TrafficEvent = 'next' | 'reset'

const config = {
  initial: 'red',
  states: {
    red: { on: { next: 'green' } },
    green: { on: { next: 'yellow', reset: 'red' } },
    yellow: { on: { next: 'red', reset: 'red' } },
  },
} satisfies MachineConfig<TrafficState, TrafficEvent>

const machine = new StateMachine(config)
machine.send('next')
machine.send('missing') // 报错
```

### 更强的 typestate
上面的 `send` 能限制事件全集，但不能在编译期知道“当前 red 只能发 next”。因为当前状态是运行时变量。若要做到 state-specific event，需要让 `transition` 返回新的泛型状态，或使用 XState 这类成熟状态机库。

### 实战建议
- 用可辨识联合建模复杂状态数据。
- transition 表用 `satisfies` 校验，不要让字面量被拓宽成 `string`。
- 业务状态复杂时，不要只堆 `isLoading/isError` 布尔值，改成明确状态机或 `RemoteData` 联合。

<!-- id: ts-042; difficulty: 1; tags: TypeScript, 枚举替代, const对象; source: 高频 -->
# 为什么有人推荐用 const 对象替代 TypeScript enum？

## const 对象替代 enum

很多前端项目推荐 `as const` 对象，是因为它更接近普通 JavaScript，构建行为更可预测。

### enum 的成本和坑
```ts
enum Status {
  Active,
  Inactive,
}
```

数字 enum 会生成运行时对象和反向映射：

```ts
Status.Active // 0
Status[0] // 'Active'
```

这会增加 emit 代码，也可能让 API 字符串场景不直观。`const enum` 会内联，但在 `isolatedModules`、Babel/SWC/esbuild 单文件转译、跨包发布时容易踩坑，公共库尤其不建议导出 `const enum`。

### const 对象写法
```ts
const Status = {
  Active: 'active',
  Inactive: 'inactive',
  Deleted: 'deleted',
} as const

type Status = (typeof Status)[keyof typeof Status]
```

使用：

```ts
function setStatus(status: Status) {}

setStatus(Status.Active)
setStatus('active')
setStatus('unknown') // 报错
```

### 优点
- 没有 TypeScript 专属运行时语义，就是普通对象。
- 与 JSON/API 字符串值天然兼容。
- 可用 `Object.values(Status)` 做运行时枚举。
- 和各种转译器、打包器互操作更稳定。
- 类型和值从同一个对象推导，不容易漂移。

### 注意
const 对象不是“零运行时开销”：只要你在运行时使用它，就会有一个普通对象。若只需要类型，不需要值对象，可以直接写联合字面量类型。

```ts
type Status = 'active' | 'inactive' | 'deleted'
```

### 何时仍可用 enum
- 维护已有 enum API。
- 需要和后端/老代码保持相同枚举对象。
- 位运算 flag 场景可以用数字 enum 或 const number 对象，但要考虑构建链。

<!-- id: ts-043; difficulty: 2; tags: TypeScript, 泛型, 条件类型, 实战; source: 高频 -->
# 实现 TypeScript 中的 DeepPick 工具类型，支持点路径访问。

## DeepPick 点路径工具类型

难点是多条路径可能共享父级，例如 `address.city | address.country.code`，需要把每条路径 pick 出来后合并。

### 生成可选路径
```ts
type DotPaths<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? K | `${K}.${DotPaths<T[K]>}`
        : K
    }[keyof T & string]
  : never
```

### 单路径 Pick
```ts
type DeepPickOne<T, P extends string> =
  P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? { [Key in K]: DeepPickOne<T[K], Rest> }
      : never
    : P extends keyof T
      ? { [Key in P]: T[P] }
      : never
```

### 联合转交叉并展开
```ts
type UnionToIntersection<U> = (
  U extends unknown ? (value: U) => void : never
) extends (value: infer I) => void
  ? I
  : never

type Expand<T> = T extends object ? { [K in keyof T]: Expand<T[K]> } : T

type DeepPick<T, P extends DotPaths<T>> = Expand<
  UnionToIntersection<P extends unknown ? DeepPickOne<T, P> : never>
>
```

### 使用
```ts
type User = {
  id: string
  name: string
  address: {
    city: string
    zip: string
    country: { code: string; name: string }
  }
}

type Picked = DeepPick<User, 'id' | 'address.city' | 'address.country.code'>
// {
//   id: string
//   address: {
//     city: string
//     country: { code: string }
//   }
// }
```

### PathValue
如果只需要读取路径对应的值类型：

```ts
type PathValue<T, P extends string> =
  P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? PathValue<T[K], Rest>
      : never
    : P extends keyof T
      ? T[P]
      : never

type City = PathValue<User, 'address.city'> // string
```

### 注意事项
这个实现会把所有 object 都继续展开，数组、函数、Date 等需要按业务语义特殊处理。路径类型过深也会影响类型检查性能。

<!-- id: ts-044; difficulty: 3; tags: TypeScript, 类型安全, 表单验证; source: 高频 -->
# 如何用 TypeScript 实现一个类型安全的表单（Form）系统？

## 类型安全表单系统

生产项目通常优先选择 React Hook Form + Zod/Valibot：表单状态、校验、错误展示和性能都更成熟。手写表单系统时，核心是让字段名、字段值、错误和提交值来自同一个类型源。

### Schema-first 示例
```ts
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  rememberMe: z.boolean(),
})

type LoginForm = z.infer<typeof LoginSchema>
```

schema 同时负责运行时校验和 TS 类型推断，避免类型和校验规则分离。

### 手写字段配置
```ts
type FieldConfig<TValue, TForm> = {
  initialValue: TValue
  validate?: (value: TValue, values: TForm) => string | undefined
  parse?: (raw: string) => TValue
}

type FormConfig<TForm extends Record<string, unknown>> = {
  [K in keyof TForm]: FieldConfig<TForm[K], TForm>
}

type FormErrors<TForm> = Partial<Record<keyof TForm, string>>
type FormTouched<TForm> = Partial<Record<keyof TForm, boolean>>
```

### Hook API 设计
```tsx
function useForm<TForm extends Record<string, unknown>>(config: FormConfig<TForm>) {
  type Key = keyof TForm

  const initialValues = Object.fromEntries(
    Object.entries(config).map(([key, field]) => [key, field.initialValue]),
  ) as TForm

  const [values, setValues] = useState<TForm>(initialValues)
  const [errors, setErrors] = useState<FormErrors<TForm>>({})
  const [touched, setTouched] = useState<FormTouched<TForm>>({})

  function setField<K extends Key>(key: K, value: TForm[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setTouched((prev) => ({ ...prev, [key]: true }))
  }

  function validateAll(current: TForm) {
    const nextErrors: FormErrors<TForm> = {}
    for (const key of Object.keys(config) as Key[]) {
      const error = config[key].validate?.(current[key], current)
      if (error) nextErrors[key] = error
    }
    return nextErrors
  }

  function handleSubmit(onSubmit: (values: TForm) => void | Promise<void>) {
    return async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const nextErrors = validateAll(values)
      setErrors(nextErrors)
      if (Object.keys(nextErrors).length === 0) await onSubmit(values)
    }
  }

  return { values, errors, touched, setField, handleSubmit }
}
```

### 使用
```tsx
const form = useForm<LoginForm>({
  email: { initialValue: '', validate: (value) => value.includes('@') ? undefined : 'Invalid email' },
  password: { initialValue: '', validate: (value) => value.length >= 8 ? undefined : 'Too short' },
  rememberMe: { initialValue: false },
})

form.setField('email', 'user@example.com')
form.setField('rememberMe', true)
form.setField('rememberMe', 'yes') // 报错
```

### 工程要点
- DOM 输入值默认是 string，number/boolean/date 需要 parse 层。
- 表单值类型和提交 DTO 可能不同，要显式 transform。
- 服务端错误要能映射到字段错误和表单级错误。
- 大表单要避免每次输入导致整页重渲染，实际项目优先用成熟表单库。

<!-- id: ts-045; difficulty: 2; tags: TypeScript, 工程化, 配置, monorepo; source: 高频 -->
# TypeScript monorepo 项目中如何配置类型共享和项目引用（Project References）？

## TypeScript Monorepo 和 Project References

Monorepo 类型共享不能只靠 `paths`。`paths` 只影响 TypeScript 解析，不会自动改变运行时打包和包发布。大型项目应使用 workspace 包 + project references + package exports。

### 目录结构
```text
repo/
  tsconfig.json
  tsconfig.base.json
  packages/
    shared/
      package.json
      tsconfig.json
      src/index.ts
    ui/
      package.json
      tsconfig.json
      src/index.ts
    web/
      package.json
      tsconfig.json
      src/main.tsx
```

### 根 tsconfig
```jsonc
{
  "files": [],
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/ui" },
    { "path": "./packages/web" }
  ]
}
```

根配置作为 solution config，用于 `tsc -b` 按依赖图构建。

### 基础配置
```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true
  }
}
```

### 库包配置
```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

`composite: true` 是被引用项目的关键要求，会生成构建信息并约束文件边界。

### 依赖包引用
```jsonc
{
  "extends": "../../tsconfig.base.json",
  "references": [
    { "path": "../shared" },
    { "path": "../ui" }
  ],
  "include": ["src"]
}
```

### package.json
```jsonc
{
  "name": "@repo/shared",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

应用包通过 workspace 依赖引用：

```jsonc
{
  "dependencies": {
    "@repo/shared": "workspace:*",
    "@repo/ui": "workspace:*"
  }
}
```

### 命令
```bash
tsc -b
tsc -b --watch
tsc -b --clean
```

### 实战建议
- `paths` 可用于开发别名，但发布包必须配置 `exports` 和 `types`。
- 生成目录不要被其他包直接 import 源码绕过边界。
- CI 可以先 `tsc -b --pretty false`，再跑各包测试和构建。
- Vite/Next 应用可能仍由框架打包，TypeScript references 主要负责类型边界和增量检查。

<!-- id: ts-046; difficulty: 2; tags: TypeScript, 类型测试, expect-type; source: 高频 -->
# 如何对 TypeScript 类型进行单元测试？

## TypeScript 类型测试

类型测试验证的是编译期行为：某个表达式应该是什么类型，某些错误用法应该无法通过编译。它应进入 CI，防止公共 API 的类型回归。

### tsd
适合测试发布包的 `.d.ts` 或公共 API。

```ts
// index.test-d.ts
import { expectAssignable, expectError, expectType } from 'tsd'
import { createUser, parseId } from './index'

expectType<User>(createUser({ name: 'Alice' }))
expectType<UserId>(parseId('u1'))
expectAssignable<string>(parseId('u1'))

expectError(createUser({}))
expectError(parseId(123))
```

### expect-type / vitest expectTypeOf
如果项目已有 Vitest，可以把类型断言和运行时测试放在同一套工具里。

```ts
import { expectTypeOf } from 'vitest'

expectTypeOf(createUser).parameter(0).toEqualTypeOf<{ name: string }>()
expectTypeOf(createUser).returns.toEqualTypeOf<User>()
```

这类断言主要在类型检查阶段生效，不是运行时业务断言。

### 手写类型断言
```ts
type Expect<T extends true> = T

type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends
  (<T>() => T extends Y ? 1 : 2)
    ? true
    : false

type Cases = [
  Expect<Equal<ReturnType<typeof createUser>, User>>,
  Expect<Equal<Parameters<typeof parseId>, [value: string]>>,
]
```

适合测试工具类型：

```ts
type Case = Expect<Equal<DeepPick<User, 'profile.name'>, { profile: { name: string } }>>
```

### 负向测试
```ts
// @ts-expect-error id 必须是 string
parseId(123)
```

`@ts-expect-error` 比 `@ts-ignore` 更安全：如果下一行不再报错，它自己会报错，能发现类型约束意外变松。

### CI 建议
- 应用项目：`tsc --noEmit` + 关键工具类型断言。
- 库项目：`tsd` 或 `expect-type` 覆盖公开 API。
- 对 bug 修复添加负向测试，确保错误用法继续报错。

<!-- id: ts-047; difficulty: 3; tags: TypeScript, 类型安全路由, 实战; source: 高频 -->
# 如何用 TypeScript 实现类型安全的路由系统（类似 TanStack Router）？

## 类型安全路由系统

核心是从路径字符串提取参数名，并让 `Link/navigate/buildPath` 的参数类型跟路由表绑定。

### 路径参数提取
```ts
type ParamNames<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ParamNames<`/${Rest}`>
    : Path extends `${string}:${infer Param}`
      ? Param
      : never

type ParamsOf<Path extends string> =
  [ParamNames<Path>] extends [never]
    ? {}
    : { [K in ParamNames<Path>]: string }
```

### 路由定义
```tsx
type RouteDef = {
  component: React.ComponentType<unknown>
  search?: Record<string, string | number | boolean | undefined>
}

type Routes = Record<string, RouteDef>
```

### 根据 path 决定 props
```ts
type LinkProps<Path extends string, Def extends RouteDef> = {
  to: Path
  children?: React.ReactNode
} & ([ParamNames<Path>] extends [never] ? { params?: never } : { params: ParamsOf<Path> }) &
  (Def extends { search: infer Search } ? { search?: Search } : { search?: never })
```

### 用 factory 捕获路由表
```tsx
function createRouter<const R extends Routes>(routes: R) {
  function buildPath<Path extends keyof R & string>(path: Path, params?: ParamsOf<Path>) {
    return path.replace(/:(\w+)/g, (_, key: string) => {
      const value = params?.[key as keyof ParamsOf<Path>]
      if (value == null) throw new Error(`Missing route param: ${key}`)
      return encodeURIComponent(String(value))
    })
  }

  function Link<Path extends keyof R & string>(props: LinkProps<Path, R[Path]>) {
    const href = buildPath(props.to, 'params' in props ? props.params : undefined)
    return <a href={href}>{props.children}</a>
  }

  return { routes, buildPath, Link }
}
```

### 使用
```tsx
const router = createRouter({
  '/': { component: Home },
  '/users/:id': { component: UserPage, search: { tab: undefined as 'posts' | 'likes' | undefined } },
  '/users/:id/posts/:postId': { component: PostPage },
} satisfies Routes)

<router.Link to="/" />
<router.Link to="/users/:id" params={{ id: 'u1' }} search={{ tab: 'posts' }} />
<router.Link to="/users/:id" params={{ userId: 'u1' }} /> // 报错
<router.Link to="/users/:id/posts/:postId" params={{ id: 'u1' }} /> // 报错
```

### 工程注意点
- 路径参数类型是编译期约束，运行时仍要检查参数缺失和 URL 编码。
- search 参数最好配合 schema 做 parse/stringify。
- 真正的嵌套路由、loader、权限、预加载和 code splitting 很复杂，生产项目优先使用 TanStack Router、React Router 等成熟方案。

<!-- id: ts-048; difficulty: 2; tags: TypeScript, 类型, any vs unknown vs never; source: 高频 -->
# TypeScript 中 any、unknown、never 三者的区别是什么？

## any、unknown、never

### any：关闭类型检查
```ts
let value: any = JSON.parse(text)

value.foo.bar()
const name: string = value
```

`any` 可以赋给任何类型，也可以接收任何类型；对它做属性访问、调用、赋值几乎都不检查。它会污染后续类型推断，是类型系统的逃生口。

### unknown：安全的外部输入
```ts
let value: unknown = JSON.parse(text)

value.foo // 报错

if (typeof value === 'object' && value !== null && 'id' in value) {
  // 收窄后才能继续用
}
```

`unknown` 可以接收任意值，但不能直接当成具体类型使用。API 响应、catch error、用户输入、localStorage 读取都应该优先用 `unknown`。

```ts
function isString(value: unknown): value is string {
  return typeof value === 'string'
}
```

### never：不可能的值
```ts
function fail(message: string): never {
  throw new Error(message)
}

function assertNever(value: never): never {
  throw new Error(`Unhandled: ${JSON.stringify(value)}`)
}
```

`never` 是所有类型的子类型，但没有普通值能赋给 `never`。常见场景：
- 永不返回的函数。
- 穷尽检查。
- 条件类型中过滤联合成员。

```ts
type WithoutNull<T> = T extends null | undefined ? never : T
type A = WithoutNull<string | null> // string
```

### 类型代数
```ts
type A = string | never // string
type B = string & never // never
type C = unknown | string // unknown
type D = unknown & string // string
type E = any | string // any
type F = any & string // any
```

### 总结
```text
any      能进能出，最不安全，少用
unknown  能接收任意值，使用前必须收窄，适合边界
never    表示不可能，适合穷尽检查和类型过滤
```

<!-- id: ts-049; difficulty: 2; tags: TypeScript, 泛型, 高阶组件; source: 高频 -->
# 如何为 React 高阶组件（HOC）编写正确的 TypeScript 类型？

## React HOC 的 TypeScript 类型

HOC 接收一个组件并返回一个新组件。类型重点是保留原 props、隐藏注入 props、处理 ref，并设置 displayName。新代码能用 Hook 解决时优先用 Hook，HOC 更常见于横切能力和旧代码。

### 不改变 props 的 HOC
```tsx
function withLogger<P extends object>(Component: React.ComponentType<P>) {
  function Logged(props: P) {
    useEffect(() => {
      console.log(Component.displayName ?? Component.name)
    })

    return <Component {...props} />
  }

  Logged.displayName = `withLogger(${Component.displayName ?? Component.name ?? 'Component'})`
  return Logged
}
```

### 注入 props
```tsx
type InjectedAuthProps = {
  user: User
  isAuthenticated: true
}

type WithoutInjected<P, Injected> = Omit<P, keyof Injected>

function withAuth<P extends InjectedAuthProps>(Component: React.ComponentType<P>) {
  type OuterProps = WithoutInjected<P, InjectedAuthProps>

  function Authenticated(props: OuterProps) {
    const user = useCurrentUser()
    if (!user) return <LoginRedirect />

    const injected: InjectedAuthProps = { user, isAuthenticated: true }
    return <Component {...(props as P)} {...injected} />
  }

  return Authenticated
}
```

调用方只传 `OuterProps`，`user/isAuthenticated` 由 HOC 注入。内部通常需要一次断言，因为 TS 很难证明 `Omit<P, K> & Injected` 一定等于 `P`。

### 保留 ref
React 18 和库代码通常用 `forwardRef`：

```tsx
function withBorder<T, P extends object>(Component: React.ComponentType<P & React.RefAttributes<T>>) {
  return React.forwardRef<T, P>((props, ref) => (
    <div className="bordered">
      <Component {...props} ref={ref} />
    </div>
  ))
}
```

React 19 支持把 `ref` 当作普通 prop 传给函数组件，但库如果要兼容 React 18，仍要保留 `forwardRef` 写法。

### 静态属性
HOC 默认不会自动复制静态属性。

```ts
// 实际项目可用 hoist-non-react-statics
hoistNonReactStatics(Authenticated, Component)
```

### 注意事项
- `React.FC` 不是必须，普通函数组件通常更直接。
- HOC 顺序会影响注入 props，组合时要让每一层的输入输出类型对齐。
- 不要把业务数据获取藏进过多 HOC；可读性和测试会变差。

<!-- id: ts-050; difficulty: 3; tags: TypeScript, 类型编程, StringParser; source: 字节跳动 -->
# TypeScript 中如何用类型系统解析字符串（如解析 URL 查询参数类型）？

## 用类型系统解析字符串

TypeScript 可以用模板字面量类型和 `infer` 做有限字符串解析，常用于路由参数、查询字符串、CSV header、事件名等静态字符串。

### 解析查询参数
```ts
type PairToObject<S extends string> =
  S extends `${infer Key}=${infer Value}`
    ? { [K in Key]: Value }
    : {}

type UnionToIntersection<U> = (
  U extends unknown ? (value: U) => void : never
) extends (value: infer I) => void
  ? I
  : never

type Expand<T> = { [K in keyof T]: T[K] }

type ParseQueryParts<S extends string> =
  S extends `${infer Head}&${infer Tail}`
    ? PairToObject<Head> | ParseQueryParts<Tail>
    : PairToObject<S>

type ParseQuery<S extends string> = Expand<UnionToIntersection<ParseQueryParts<S>>>

type Q = ParseQuery<'name=Alice&age=30'>
// { name: 'Alice'; age: '30' }
```

### 提取路由参数
```ts
type ParamNames<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ParamNames<`/${Rest}`>
    : Path extends `${string}:${infer Param}`
      ? Param
      : never

type RouteParams<Path extends string> =
  [ParamNames<Path>] extends [never]
    ? {}
    : { [K in ParamNames<Path>]: string }

type Params = RouteParams<'/users/:id/posts/:postId'>
// { id: string; postId: string }
```

### 解析 CSV Header
```ts
type Split<S extends string, Sep extends string> =
  S extends `${infer Head}${Sep}${infer Tail}`
    ? [Head, ...Split<Tail, Sep>]
    : S extends ''
      ? []
      : [S]

type CSVRow<Header extends string> = {
  [K in Split<Header, ','>[number]]: string
}

type Row = CSVRow<'id,name,email'>
// { id: string; name: string; email: string }
```

### 注意事项
- 类型层解析只对静态字面量字符串有效；运行时字符串仍是 `string`。
- URL 解码、重复 query key、数组参数、空值等复杂语义应交给运行时代码和 schema。
- 递归字符串解析容易拖慢类型检查，输入长度要控制。

<!-- id: ts-051; difficulty: 2; tags: TypeScript, 性能, 类型检查, 实战技巧; source: 高频 -->
# TypeScript 中有哪些常用的实战技巧和最佳实践？

## TypeScript 实战技巧和最佳实践

### 1. 开 strict，把边界收紧
```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true
  }
}
```

`strict` 是底线；外部输入用 `unknown`，验证后再进入业务类型。

### 2. 用 as const 和 satisfies 管配置
```ts
const routes = {
  home: '/',
  user: '/users/:id',
} as const satisfies Record<string, `/${string}`>

type RouteName = keyof typeof routes
type RoutePath = (typeof routes)[RouteName]
```

`as const` 保留字面量，`satisfies` 检查结构但不把变量强行改成目标类型。

### 3. 类型导入和值导入分清
```ts
import type { User } from './types'
import { createUser } from './createUser'
import { type Config, loadConfig } from './config'
```

配合 `verbatimModuleSyntax` 可以避免类型导入被误保留成运行时代码。

### 4. 用品牌类型表达领域 ID 和单位
```ts
declare const brand: unique symbol

type Brand<T, Name extends string> = T & { readonly [brand]: Name }

type UserId = Brand<string, 'UserId'>
type OrderId = Brand<string, 'OrderId'>

type Meters = Brand<number, 'Meters'>
type Kilograms = Brand<number, 'Kilograms'>
```

结构相同但语义不同的值，不要都裸用 `string` 或 `number`。

### 5. 优先可辨识联合
```ts
type RemoteData<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }
```

这比 `isLoading + data? + error?` 更能避免非法状态。

### 6. 少用 any，多用 unknown 和类型守卫
```ts
function parseJson(text: string): unknown {
  return JSON.parse(text)
}

function isUser(value: unknown): value is User {
  return typeof value === 'object' && value !== null && 'id' in value
}
```

### 7. 谨慎封装 Object.keys
```ts
function objectKeys<T extends object>(obj: T) {
  return Object.keys(obj) as Array<keyof T>
}
```

这类封装本质仍是断言。只在你确定对象不会有额外运行时 key 时使用；对外部对象遍历仍要做运行时校验。

### 8. 公共 API 显式标注返回类型
内部局部变量依赖推断即可；导出的函数、库 API、复杂 reducer 建议显式写返回类型，避免实现细节泄漏成公共类型。

<!-- id: ts-052; difficulty: 2; tags: TypeScript, 错误类型, unknown, catch; source: 高频 -->
# TypeScript 4.0 起 catch 中的 error 变为 unknown，如何正确处理？

## catch 中的 unknown error

严格说，TypeScript 4.0 允许把 catch 变量显式标注为 `unknown`；TypeScript 4.4 引入 `useUnknownInCatchVariables`，在 `strict` 下 catch 变量默认按 `unknown` 处理。原因是 JavaScript 可以 `throw` 任意值，不一定是 `Error`。

```ts
try {
  riskyOperation()
} catch (error) {
  error.message // 报错：error 是 unknown
}
```

### 基础处理
```ts
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }

  return String(error)
}
```

### 业务错误类型
```ts
class AppError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly statusCode = 500,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'AppError'
  }

  static is(value: unknown): value is AppError {
    return value instanceof AppError
  }
}
```

使用：

```ts
try {
  await fetchUser(id)
} catch (error) {
  if (AppError.is(error)) {
    showError(error.message)
    return
  }

  throw error
}
```

### Result 化
如果错误是业务流程的一部分，可以不要抛异常：

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }
```

### 注意事项
- `instanceof Error` 对跨 realm 或反序列化错误不总是可靠，所以可以补充结构化 message 检查。
- 不要在 catch 里直接 `error as Error`，这会绕过 unknown 的意义。
- 无法识别的错误通常应记录后重新抛出，避免吞掉真正的程序错误。

<!-- id: ts-053; difficulty: 3; tags: TypeScript, 类型体操, 高级; source: 字节跳动 -->
# 实现 TypeScript 工具类型：StringToUnion、ReplaceAll、CamelToSnake。

## StringToUnion、ReplaceAll、CamelToSnake

### StringToUnion
```ts
type StringToUnion<S extends string> =
  S extends `${infer First}${infer Rest}`
    ? First | StringToUnion<Rest>
    : never

type A = StringToUnion<'hello'>
// 'h' | 'e' | 'l' | 'o'
```

联合类型会去重，所以两个 `l` 只出现一次。

### ReplaceAll
```ts
type ReplaceAll<S extends string, From extends string, To extends string> =
  From extends ''
    ? S
    : S extends `${infer Head}${From}${infer Tail}`
      ? `${Head}${To}${ReplaceAll<Tail, From, To>}`
      : S

type A = ReplaceAll<'hello world hello', 'hello', 'hi'>
// 'hi world hi'
```

`From extends ''` 是必要保护，否则空字符串匹配会导致无限递归。

### CamelToSnake
```ts
type IsUpperLetter<C extends string> =
  C extends Uppercase<C>
    ? C extends Lowercase<C>
      ? false
      : true
    : false

type CamelToSnake<S extends string, IsFirst extends boolean = true> =
  S extends `${infer First}${infer Rest}`
    ? IsUpperLetter<First> extends true
      ? `${IsFirst extends true ? '' : '_'}${Lowercase<First>}${CamelToSnake<Rest, false>}`
      : `${First}${CamelToSnake<Rest, false>}`
    : S

type A = CamelToSnake<'helloWorld'> // 'hello_world'
type B = CamelToSnake<'getUserById'> // 'get_user_by_id'
type C = CamelToSnake<'UserId'> // 'user_id'
```

这个版本避免 PascalCase 开头生成前导下划线。连续大写缩写如 `URLParser` 是否要变成 `url_parser` 还是 `u_r_l_parser`，需要额外规则。

### SnakeToCamel
```ts
type SnakeToCamel<S extends string> =
  S extends `${infer Head}_${infer Tail}`
    ? `${Head}${Capitalize<SnakeToCamel<Tail>>}`
    : S

type D = SnakeToCamel<'hello_world_foo'> // 'helloWorldFoo'
```

### Join
```ts
type Join<T extends readonly string[], Sep extends string = ''> =
  T extends readonly []
    ? ''
    : T extends readonly [infer Only extends string]
      ? Only
      : T extends readonly [infer First extends string, ...infer Rest extends string[]]
        ? `${First}${Sep}${Join<Rest, Sep>}`
        : string

type E = Join<['a', 'b', 'c'], '-'> // 'a-b-c'
```

### 注意事项
字符串类型体操适合静态 key 转换、路由参数、事件名推导；不要用它处理任意长度字符串，递归会影响类型检查性能。

<!-- id: ts-054; difficulty: 2; tags: TypeScript, 泛型, 实战, Proxy; source: 高频 -->
# 如何用 TypeScript 为 JavaScript Proxy 提供类型安全的封装？

## TypeScript 封装 JavaScript Proxy

Proxy 是运行时能力，TypeScript 只能描述代理对象对外暴露的类型，不能自动证明 trap 行为一定正确。因此要把断言和 `PropertyKey` 处理封装在内部。

### 深只读代理
```ts
type Primitive = string | number | boolean | bigint | symbol | null | undefined

type DeepReadonly<T> =
  T extends Primitive | Function | Date | RegExp
    ? T
    : T extends readonly (infer Item)[]
      ? ReadonlyArray<DeepReadonly<Item>>
      : { readonly [K in keyof T]: DeepReadonly<T[K]> }

function readonlyProxy<T extends object>(target: T): DeepReadonly<T> {
  const proxy = new Proxy(target, {
    get(obj, key, receiver) {
      const value = Reflect.get(obj, key, receiver)
      return typeof value === 'object' && value !== null ? readonlyProxy(value) : value
    },
    set() {
      throw new TypeError('Cannot write to readonly proxy')
    },
    deleteProperty() {
      throw new TypeError('Cannot delete from readonly proxy')
    },
  })

  return proxy as DeepReadonly<T>
}
```

### 校验代理
```ts
type Validators<T extends object> = {
  [K in keyof T]?: (value: unknown) => value is T[K]
}

function validated<T extends object>(target: T, validators: Validators<T>): T {
  return new Proxy(target, {
    set(obj, key, value, receiver) {
      if (key in validators) {
        const validator = validators[key as keyof T]
        if (validator && !validator(value)) {
          throw new TypeError(`Invalid value for ${String(key)}`)
        }
      }

      return Reflect.set(obj, key, value, receiver)
    },
  })
}

const user = validated(
  { name: '', age: 0 },
  {
    name: (value): value is string => typeof value === 'string' && value.length > 0,
    age: (value): value is number => typeof value === 'number' && value >= 0,
  },
)

user.name = 'Alice'
user.age = -1 // 运行时抛错
```

### 响应式代理
```ts
function reactive<T extends object>(target: T): T {
  return new Proxy(target, {
    get(obj, key, receiver) {
      track(obj, key)
      return Reflect.get(obj, key, receiver)
    },
    set(obj, key, value, receiver) {
      const ok = Reflect.set(obj, key, value, receiver)
      trigger(obj, key)
      return ok
    },
  })
}
```

`reactive<T>` 返回 `T` 是 API 设计选择；真实框架还会处理 ref unwrap、readonly、shallow/deep、数组方法和缓存。

### 注意事项
- Proxy trap 的 key 是 `string | symbol`，不一定是 `keyof T`。
- TypeScript 类型不会阻止运行时通过反射写入非法值，所以验证必须在 trap 里做。
- 代理返回值类型可能和目标对象不完全一致，例如 readonly、nullable fallback、lazy loading，要用返回类型明确表达。

<!-- id: ts-055; difficulty: 3; tags: TypeScript, 类型系统, 图灵完备, 有趣; source: 字节跳动 -->
# TypeScript 类型系统是图灵完备的——用类型实现一个简单的四则运算（加法）。

## 类型级别加法

TypeScript 类型系统可以通过递归条件类型和元组长度做计算。常见做法是把数字字面量转成对应长度的元组。

### BuildTuple
```ts
type BuildTuple<N extends number, Acc extends unknown[] = []> =
  number extends N
    ? unknown[]
    : Acc['length'] extends N
      ? Acc
      : BuildTuple<N, [...Acc, unknown]>
```

`number extends N` 用来避免传入宽泛 `number` 时无限递归；这类工具只适合数字字面量。

### Add
```ts
type Add<A extends number, B extends number> =
  [...BuildTuple<A>, ...BuildTuple<B>]['length']

type A = Add<3, 4> // 7
type B = Add<10, 5> // 15
```

### Subtract
```ts
type Subtract<A extends number, B extends number> =
  BuildTuple<A> extends [...BuildTuple<B>, ...infer Rest]
    ? Rest['length']
    : never

type C = Subtract<10, 3> // 7
type D = Subtract<3, 10> // never
```

### Compare
```ts
type GreaterThan<A extends number, B extends number> =
  A extends B
    ? false
    : BuildTuple<A> extends [...BuildTuple<B>, ...infer Rest]
      ? Rest extends [] ? false : true
      : false

type E = GreaterThan<5, 3> // true
type F = GreaterThan<3, 5> // false
```

### Multiply
```ts
type Multiply<
  A extends number,
  B extends number,
  Acc extends unknown[] = [],
> = B extends 0
  ? Acc['length']
  : Multiply<A, Subtract<B, 1>, [...Acc, ...BuildTuple<A>]>

type G = Multiply<3, 4> // 12
```

### 实际用途：固定长度数组
```ts
type FixedArray<T, N extends number, Acc extends T[] = []> =
  Acc['length'] extends N ? Acc : FixedArray<T, N, [...Acc, T]>

type Vec3 = FixedArray<number, 3>

const ok: Vec3 = [1, 2, 3]
const bad: Vec3 = [1, 2] // 报错
```

### 限制
- 只能处理非负整数数字字面量。
- 大数和深递归会触发类型实例化深度限制或让编辑器变慢。
- 这证明类型系统表达能力强，但生产代码应优先追求可读性和编译性能。
