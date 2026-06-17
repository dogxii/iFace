# TypeScript 测试一下

## ts-001

### Q1 single | unknown 与 any

从接口或 `JSON.parse` 得到一个外部输入，想在使用前强制做类型收窄，更适合先标成什么？

- [ ] A. `any`，这样可以直接调用任何属性和方法。
- [x] B. `unknown`，使用前必须通过类型守卫或断言函数收窄。
- [ ] C. `never`，因为外部输入不可能存在。
- [ ] D. `void`，因为接口没有返回值。

**解释**：`unknown` 是安全版 `any`。它能接收任意值，但不允许直接使用，逼迫你在边界做校验。

### Q2 multiple | 元组与数组

关于数组和元组，哪些说法正确？

- [x] A. `number[]` 表示同质数字集合。
- [x] B. `[number, number]` 更适合表达固定位置和固定长度的数据，例如二维坐标。
- [x] C. `readonly [id: string, score: number]` 可以表达只读且带标签的元组。
- [ ] D. 元组和普通数组完全一样，不能限制长度或位置类型。
- [ ] E. `[string, ...number[]]` 是非法类型，元组不能带 rest。

**解释**：元组用于位置有语义的数据，普通数组用于同质集合。TS 也支持只读元组、标签元组和 rest 元组。

### Q3 multiple | 特殊类型语义

关于 TypeScript 基础类型，哪些说法正确？

- [x] A. `void` 常用于函数没有有意义返回值。
- [x] B. `never` 表示不可能出现的值，常用于抛错函数和穷尽检查。
- [x] C. `object` 表示非原始值，通常不适合精确描述业务对象。
- [ ] D. `strictNullChecks` 开启后，`null` 可以随意赋给 `string`。
- [ ] E. `bigint` 不需要运行环境或编译目标支持。

**解释**：生产项目推荐开启 strict。业务对象优先写明确字段或 `Record<K, V>`，不要用宽泛 `object` 糊住结构。

## ts-002

### Q1 single | interface 声明合并

下面哪种场景更适合使用 `interface` 的声明合并能力？

- [x] A. 扩展全局 `Window` 或第三方库声明。
- [ ] B. 表达 `'success' | 'error'` 这类联合类型。
- [ ] C. 表达 `[number, number]` 元组。
- [ ] D. 实现条件类型工具。

**解释**：`interface` 支持同名声明合并，适合库声明扩展。联合、元组、条件类型、映射类型需要 `type`。

### Q2 single | 冲突扩展差异

为什么 `interface extends` 和 `type A & B` 遇到冲突字段时体验不同？

- [ ] A. `interface extends` 会静默把冲突字段变成 `any`。
- [x] B. `interface extends` 通常更早报错，交叉类型可能把冲突字段合成 `never`。
- [ ] C. 交叉类型不允许组合对象。
- [ ] D. 两者在所有冲突场景下完全一致。

**解释**：交叉类型是类型层面的合并运算，冲突字段可能变成不可用的 `never`，错误出现得更晚。

### Q3 multiple | type 与 interface 选择

哪些判断合理？

- [x] A. 公开对象 API、可扩展库声明可优先 `interface`。
- [x] B. 联合类型、元组、复杂工具类型应使用 `type`。
- [x] C. React Props 用 `type` 或 `interface` 都可以，团队统一更重要。
- [ ] D. `type` 可以重复声明同名别名并自动合并。
- [ ] E. 类只能 `implements interface`，不能 `implements type` 描述的对象形状。

**解释**：类可以 implements 对象形状的 type 或 interface。真正关键是表达能力和团队一致性。

## ts-003

### Q1 single | 泛型保留关系

为什么下面泛型版本比 `any` 版本更安全？

```ts
function identity<T>(value: T): T {
  return value
}
```

- [ ] A. 泛型会在运行时自动校验类型。
- [x] B. 泛型保留输入和输出的类型关系，调用后仍能得到具体类型。
- [ ] C. 泛型会把所有输入都转成字符串。
- [ ] D. 泛型只适用于 class，不能用于函数。

**解释**：泛型是类型层面的参数化，不做运行时校验。它保留类型关系，而 `any` 会丢失检查。

### Q2 multiple | 泛型约束

关于下面函数，哪些说法正确？

```ts
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}
```

- [x] A. `K extends keyof T` 约束 key 必须是对象已有 key。
- [x] B. 返回值类型 `T[K]` 会跟随具体 key 变化。
- [x] C. `getProperty(user, 'missing')` 会在编译期报错。
- [ ] D. `extends` 在这里表示运行时类继承。
- [ ] E. 返回值一定是 `unknown`。

**解释**：泛型里的 `extends` 是类型约束。`keyof` 和索引访问类型能保留 key 与 value 的对应关系。

### Q3 multiple | 泛型设计

哪些泛型设计判断合理？

- [x] A. 类型参数应表达真实关系，例如输入输出、key/value、data/error。
- [x] B. 类型参数只出现一次时，通常没有必要写泛型。
- [x] C. 默认类型参数可以让公共 API 简单场景少写类型。
- [ ] D. 所有函数都应该显式写泛型参数。
- [ ] E. 泛型会让运行时代码自动变快。

**解释**：泛型是类型建模工具，不是性能工具。优先让 TS 推断，只有表达关系和约束时再写。

## ts-004

### Q1 single | enum 运行时代码

关于 TypeScript `enum`，哪项说法正确？

- [ ] A. `enum` 只存在于类型层面，永远不会生成 JS。
- [x] B. 普通 `enum` 会生成运行时代码，既是类型也是运行时对象。
- [ ] C. 字符串 enum 一定有反向映射。
- [ ] D. 数字 enum 不能自动递增。

**解释**：`enum` 是 TS 少数会影响运行时代码的类型特性。数字 enum 有反向映射，字符串 enum 没有。

### Q2 multiple | const enum 风险

为什么公共库通常避免导出 `const enum`？

- [x] A. 它会在编译时内联，对消费方构建链有要求。
- [x] B. 在 `isolatedModules`、Babel/SWC/esbuild 单文件转译等场景容易出问题。
- [x] C. 跨包引用时可能出现编译产物和类型声明不一致的风险。
- [ ] D. `const enum` 一定比普通 enum 生成更多运行时代码。
- [ ] E. `const enum` 不能包含数字成员。

**解释**：`const enum` 的优势是内联减少运行时代码，但代价是构建链约束。库导出要尤其谨慎。

### Q3 multiple | enum 替代方案

哪些场景更适合用联合字面量或 `as const` 对象替代 enum？

- [x] A. API 字符串取值，例如 `'admin' | 'user' | 'guest'`。
- [x] B. 前端配置表，希望 JS 互操作和 tree-shaking 更直接。
- [x] C. 只需要类型约束，不需要特殊 TS enum 运行时语义。
- [ ] D. 必须依赖数字 enum 的反向映射。
- [ ] E. 需要和旧代码里的 enum 对象互操作。

**解释**：如果只表达一组字符串取值，联合字面量或 `as const` 对象通常更轻、更直接。

## ts-005

### Q1 single | as 不做转换

下面代码运行时 `typeof n` 是什么？

```ts
const n = '123' as unknown as number
console.log(typeof n)
```

- [ ] A. `'number'`
- [x] B. `'string'`
- [ ] C. `'bigint'`
- [ ] D. 代码会自动调用 `Number('123')`

**解释**：类型断言只影响编译期，不做运行时转换。真正转换要用 `Number()` 等运行时代码。

### Q2 multiple | 非空断言

关于非空断言 `!`，哪些说法正确？

- [x] A. 它会从类型中移除 `null | undefined`。
- [x] B. 如果运行时值真的为空，仍可能报错。
- [x] C. 优先用显式判断，只在框架或初始化顺序能保证非空时谨慎使用。
- [ ] D. 它会在运行时自动创建缺失元素。
- [ ] E. 它等价于可选链 `?.`。

**解释**：`!` 是告诉编译器“相信我”，不会改变运行时值。滥用会隐藏真实空值风险。

### Q3 multiple | as const 与 satisfies

哪些说法正确？

- [x] A. `as const` 会尽量把数组和对象收窄为只读字面量类型。
- [x] B. `satisfies` 会检查表达式符合目标类型，同时保留更精确的推断。
- [x] C. `satisfies` 不像 `as` 那样强行把表达式改成目标类型。
- [ ] D. `as const` 会深冻结运行时对象。
- [ ] E. `satisfies` 会执行运行时校验。

**解释**：两者都是类型层工具。运行时验证外部数据仍应使用类型守卫或 schema 库。

## ts-006

### Q1 single | Partial 的语义

`Partial<User>` 做了什么？

- [x] A. 把 `User` 的所有属性变成可选。
- [ ] B. 把 `User` 的所有属性变成只读。
- [ ] C. 只保留 `User` 中的 string 属性。
- [ ] D. 删除 `User` 的所有可选属性。

**解释**：`Partial<T>` 的核心实现是映射类型 `{ [K in keyof T]?: T[K] }`。

### Q2 multiple | 工具类型选择

哪些工具类型和用途匹配？

- [x] A. `Pick<User, 'id' | 'name'>` 只选择部分属性。
- [x] B. `Omit<User, 'password'>` 排除指定属性。
- [x] C. `Record<'admin' | 'user', string[]>` 创建固定 key 的映射。
- [x] D. `NonNullable<T>` 去掉 `null | undefined`。
- [ ] E. `Readonly<T>` 会让运行时对象无法被修改。

**解释**：工具类型只影响类型系统，不会自动冻结运行时对象。运行时不可变需要 `Object.freeze` 等机制。

### Q3 multiple | 函数与 Promise 工具类型

关于函数和 Promise 相关工具类型，哪些说法正确？

- [x] A. `Parameters<typeof fn>` 提取函数参数元组。
- [x] B. `ReturnType<typeof fn>` 提取函数返回值类型。
- [x] C. `ConstructorParameters<typeof C>` 提取构造函数参数。
- [x] D. `Awaited<Promise<Promise<User>>>` 可得到 `User`。
- [ ] E. `ReturnType` 会在运行时调用函数。

**解释**：这些都是类型层提取工具，不执行运行时代码。`Awaited` 比简单 `Promise<infer T>` 更贴近 thenable 行为。

## ts-007

### Q1 single | 类型谓词

下面返回类型 `value is User` 的作用是什么？

```ts
function isUser(value: unknown): value is User {
  return isRecord(value) && typeof value.id === 'string'
}
```

- [ ] A. 把 `value` 在运行时转换成 `User`。
- [x] B. 告诉 TypeScript：当函数返回 true 时，`value` 可以缩窄为 `User`。
- [ ] C. 让函数只能返回 `User`。
- [ ] D. 跳过函数体执行。

**解释**：类型谓词连接运行时检查和类型缩窄。它必须和真实检查逻辑一致，否则就是骗类型系统。

### Q2 multiple | 类型守卫边界

关于常见类型守卫，哪些说法正确？

- [x] A. `typeof` 适合判断原始类型，但 `typeof null === 'object'`。
- [x] B. `instanceof` 依赖原型链，跨 iframe 或反序列化数据不一定可靠。
- [x] C. `in` 只能说明属性存在，不代表属性类型正确。
- [ ] D. `in` 可以完整校验接口返回数据的所有字段类型。
- [ ] E. 类型守卫不需要任何运行时逻辑。

**解释**：类型守卫本质是运行时检查。外部输入复杂时，应逐字段校验或使用 schema 库。

### Q3 multiple | 可辨识联合

为什么可辨识联合适合表达状态机或接口响应？

- [x] A. 稳定的判别字段能让 TS 在分支中准确缩窄类型。
- [x] B. `never` 可用于 default 分支做穷尽检查。
- [x] C. 它能把状态和对应字段绑定在一起，减少非法组合。
- [ ] D. 它会自动做接口运行时校验。
- [ ] E. 它要求所有成员拥有完全相同字段。

**解释**：可辨识联合是类型层建模。运行时接口数据仍要校验，但在代码内部能显著提升分支安全性。

## ts-008

### Q1 single | 条件类型 extends

条件类型 `T extends U ? X : Y` 里的 `extends` 表示什么？

- [ ] A. 只能表示 class 继承关系。
- [x] B. 表示类型可赋值关系。
- [ ] C. 表示运行时原型链判断。
- [ ] D. 表示模块导入关系。

**解释**：条件类型发生在类型层面。这里的 `extends` 不是运行时继承，而是“能否赋值给”。

### Q2 multiple | 分布式条件类型

关于分布式条件类型，哪些说法正确？

- [x] A. 当条件左侧是裸类型参数时，传入联合类型会逐成员分发。
- [x] B. `T extends unknown ? T[] : never` 传入 `string | number` 得到 `string[] | number[]`。
- [x] C. 用 `[T] extends [unknown]` 可以阻止分发。
- [ ] D. 所有条件类型都会对联合类型分发。
- [ ] E. 分布式条件类型只对 class 有效。

**解释**：是否分发取决于左侧是否为裸类型参数。元组包裹是常见的非分发技巧。

### Q3 multiple | infer 使用

关于 `infer`，哪些说法正确？

- [x] A. `infer` 只能在条件类型中使用。
- [x] B. 它可以从函数返回值、数组元素、Promise 值等结构中提取类型。
- [x] C. `T extends (...args: never[]) => infer R ? R : never` 可提取返回值。
- [ ] D. `infer` 会在运行时读取变量值。
- [ ] E. `infer` 可以写在普通函数参数列表里。

**解释**：`infer` 是类型模式匹配中的“声明待推断变量”。它完全发生在编译期。

## ts-009

### Q1 single | keyof

`keyof User` 对下面类型得到什么？

```ts
type User = {
  id: string
  name: string
  age: number
}
```

- [x] A. `'id' | 'name' | 'age'`
- [ ] B. `string`
- [ ] C. `User[]`
- [ ] D. `id | name | age` 三个运行时变量

**解释**：`keyof` 从对象类型中提取 key 的联合。它是类型操作，不产生运行时变量。

### Q2 multiple | typeof 类型查询

关于类型位置的 `typeof`，哪些说法正确？

- [x] A. 可以从运行时值提取静态类型。
- [x] B. 常和 `as const`、`keyof` 结合，从配置对象生成类型。
- [x] C. `typeof config.theme` 在 `as const` 后可能得到字面量类型。
- [ ] D. 类型位置的 `typeof` 会在运行时执行表达式。
- [ ] E. 它和 JS 运行时 `typeof value` 完全是一回事。

**解释**：TS 中的类型查询 `typeof` 只在类型层使用，不执行代码；JS 的 `typeof` 是运行时操作。

### Q3 multiple | 映射类型

关于映射类型，哪些说法正确？

- [x] A. `[K in keyof T]` 可以遍历对象 key 生成新对象类型。
- [x] B. `-readonly`、`-?` 可以移除只读和可选修饰符。
- [x] C. `as` 键名重映射可生成 `getName` 这类新 key。
- [x] D. 把 key 映射到 `never` 可以过滤字段。
- [ ] E. 映射类型会遍历运行时对象并修改它。

**解释**：映射类型是类型层转换工具，常与 `keyof`、模板字面量类型和条件类型组合。

## ts-010

### Q1 single | 标准装饰器签名

TypeScript 5+ 标准装饰器中，方法装饰器通常接收什么？

- [ ] A. `target, propertyKey, descriptor`。
- [x] B. 被装饰的原始方法和一个 context 对象。
- [ ] C. 只有方法名字符串。
- [ ] D. 只有类实例。

**解释**：标准装饰器和 legacy decorators 签名不同。旧版方法装饰器才是 `target, propertyKey, descriptor`。

### Q2 multiple | 标准与旧版装饰器

关于标准装饰器和 legacy decorators，哪些说法正确？

- [x] A. 两套语义的签名、执行模型和元数据支持不同。
- [x] B. 旧版常见于 NestJS、Angular 等生态。
- [x] C. 旧版常配合 `experimentalDecorators` 和 `emitDecoratorMetadata`。
- [ ] D. 新标准装饰器完全兼容旧版参数装饰器。
- [ ] E. `emitDecoratorMetadata` 是新标准装饰器的自动类型元数据机制。

**解释**：装饰器最容易混背。新标准不等于旧版加语法糖，特别是参数装饰器和 metadata 行为差异很大。

### Q3 multiple | 装饰器使用边界

使用装饰器时，哪些判断合理？

- [x] A. 装饰器适合横切逻辑或框架元编程，但会增加隐式行为。
- [x] B. 装饰器工厂可以接收配置并返回真正的装饰器。
- [x] C. 不同装饰位置对应不同 context 类型。
- [ ] D. 所有业务逻辑都应该藏进装饰器，越隐式越好。
- [ ] E. 装饰器只影响类型系统，不可能影响运行时行为。

**解释**：装饰器会改造类或成员的运行时行为。使用范围要克制，避免普通业务逻辑难以追踪。

## ts-011

### Q1 single | 前端应用 noEmit

Vite 前端应用里常见 `tsconfig` 配置 `noEmit: true` 的主要原因是什么？

- [ ] A. 禁止 TypeScript 做类型检查。
- [x] B. 应用由 Vite/esbuild/Rollup 负责输出，TypeScript 只做类型检查。
- [ ] C. 让所有 `.ts` 文件在浏览器中直接运行。
- [ ] D. 自动生成 `.d.ts` 声明文件。

**解释**：应用项目通常不让 `tsc` 产物参与打包。库项目才更关注 declaration、outDir、rootDir 等输出配置。

### Q2 multiple | 严格检查配置

哪些 `tsconfig` 配置能提升类型检查严格度？

- [x] A. `strict`
- [x] B. `noUncheckedIndexedAccess`
- [x] C. `exactOptionalPropertyTypes`
- [x] D. `noImplicitOverride`
- [ ] E. `skipLibCheck`

**解释**：`skipLibCheck` 是跳过声明文件检查以换取速度，不是严格性增强。`strict` 是底线，其他选项能进一步贴近运行时风险。

### Q3 multiple | 配置语义

关于常见 `tsconfig` 配置，哪些说法正确？

- [x] A. `lib` 决定可用标准 API 声明，例如 DOM、ES2022。
- [x] B. `moduleResolution: 'bundler'` 更贴近 Vite/Webpack/Rollup 的解析方式。
- [x] C. `types` 配置后会限制自动注入的全局 `@types/*` 包。
- [ ] D. `target` 只影响类型检查，不影响输出语法假设。
- [ ] E. `jsx: 'react-jsx'` 表示必须手写 `React.createElement`。

**解释**：`target/lib/moduleResolution/jsx/types` 分别影响输出、标准库声明、模块解析、JSX transform 和全局类型注入。

## ts-012

### Q1 single | React children 类型

普通布局组件允许 children 是文本、数字、元素、fragment、数组或 null，最常用的 children 类型是什么？

- [x] A. `React.ReactNode`
- [ ] B. `React.ReactElement`
- [ ] C. `HTMLDivElement`
- [ ] D. `MouseEvent`

**解释**：`ReactNode` 覆盖 children 常见可渲染值。`ReactElement` 更窄，只表示一个 React 元素对象。

### Q2 multiple | React 事件类型

关于 React + TS 事件类型，哪些说法正确？

- [x] A. `React.MouseEventHandler<HTMLButtonElement>` 可描述 button 点击处理器。
- [x] B. 表单提交可用 `React.FormEventHandler<HTMLFormElement>`。
- [x] C. 输入变化可用 `React.ChangeEventHandler<HTMLInputElement>`。
- [x] D. 事件中优先读 `currentTarget`，它和泛型参数绑定更准确。
- [ ] E. `event.target` 一定就是绑定 handler 的元素。

**解释**：`target` 是真实触发事件的元素，可能是内部子元素；`currentTarget` 是当前绑定 handler 的元素。

### Q3 multiple | React 类型实践

哪些 React 类型实践合理？

- [x] A. 透传原生 button props 可用 `React.ComponentPropsWithoutRef<'button'>`。
- [x] B. `useState(null)` 但后续存 User 时，应写 `useState<User | null>(null)`。
- [x] C. `useReducer` action 适合用可辨识联合并做 `never` 穷尽检查。
- [ ] D. 所有函数组件都必须使用 `React.FC`。
- [ ] E. `useRef<HTMLInputElement>(null)` 后可以无条件访问 `inputRef.current.focus()`。

**解释**：`ref.current` 初始可能是 null，应使用可选链或判断。`React.FC` 不是必须，团队统一即可。

## ts-013

### Q1 single | 重载实现签名

TypeScript 函数重载中，哪项说法正确？

- [ ] A. 实现签名对调用者可见，调用者可以按实现签名任意传参。
- [x] B. 前面的重载签名对调用者可见，最后的实现签名只负责兼容所有重载。
- [ ] C. 每个重载签名都会生成一个 JS 函数。
- [ ] D. 重载只能用于 class 方法，不能用于普通函数。

**解释**：TS 重载是类型层能力。运行时只有一个实现函数，因此实现逻辑必须覆盖所有重载分支。

### Q2 multiple | 何时使用重载

哪些场景适合使用函数重载？

- [x] A. 不同参数组合对应不同返回类型。
- [x] B. 需要对外暴露更精确的调用签名。
- [ ] C. 返回类型不随参数变化，只是接受 `string | number` 并打印。
- [ ] D. 为了避免写任何运行时分支。
- [ ] E. 所有联合类型都应该改成重载。

**解释**：返回类型不随参数组合变化时，联合类型通常更简单。重载不能替代运行时判断。

### Q3 multiple | 重载设计细节

关于重载设计，哪些说法正确？

- [x] A. 更具体的重载签名应放在更宽泛签名前面。
- [x] B. 实现签名必须能覆盖所有重载。
- [x] C. 箭头函数要重载，可先声明带多个 call signature 的类型。
- [ ] D. 重载签名可以和实现逻辑完全脱节，类型系统会自动修复运行时。
- [ ] E. 重载越多越好，越能表达清晰 API。

**解释**：重载过多会难维护。能用泛型映射关系表达时，泛型通常更可扩展。

## ts-014

### Q1 single | 现代模块首选

现代 TypeScript 应用源码组织模块时，通常首选什么？

- [x] A. ES Module 的 `import/export`。
- [ ] B. 非 `declare` 的 `namespace`。
- [ ] C. 把所有内容挂到 `window`。
- [ ] D. 三斜线引用所有文件。

**解释**：ES Module 符合 JS 标准，配合现代构建工具、tree-shaking 和文件作用域。namespace 主要是早期组织全局代码的方式。

### Q2 multiple | namespace 仍适用的地方

哪些场景中仍可能合理使用 namespace？

- [x] A. `.d.ts` 中描述全局变量或 UMD 库形状。
- [x] B. 用 `declare namespace` 描述函数对象上挂静态成员的老库。
- [x] C. 第三方库声明扩展中的全局命名空间。
- [ ] D. 新业务源码中替代所有 ES Module。
- [ ] E. 提升 tree-shaking 效果。

**解释**：`declare namespace` 只描述类型，不生成运行时代码；非 declare namespace 在源码中会生成运行时代码，现代业务通常避免。

### Q3 multiple | module 与 namespace 对比

关于 ES Module 和 namespace，哪些说法正确？

- [x] A. 有顶层 `import/export` 的文件就是模块，有自己的文件作用域。
- [x] B. ES Module 更利于静态分析和构建优化。
- [x] C. 非 `declare` namespace 通常会生成运行时代码。
- [ ] D. namespace 是 ECMAScript 标准模块系统。
- [ ] E. ES Module 会污染全局作用域。

**解释**：namespace 是 TS 早期组织代码的机制；ES Module 是现代标准模块系统。

## ts-015

### Q1 single | .d.ts 本质

`.d.ts` 文件的主要作用是什么？

- [ ] A. 编写会直接运行的业务逻辑。
- [x] B. 描述类型形状，让 TS 理解 JS 模块、全局变量、资源文件或库 API。
- [ ] C. 替代所有单元测试。
- [ ] D. 让浏览器识别 TypeScript 语法。

**解释**：声明文件只描述类型，不包含运行时代码。声明必须和真实运行时 API 保持一致。

### Q2 multiple | 全局声明

在模块文件中写 `declare global` 时，哪些做法正确？

- [x] A. 加上 `export {}` 让该 `.d.ts` 成为模块。
- [x] B. 可以扩展 `Window` 接口。
- [x] C. 可以声明全局常量类型，例如 `__APP_VERSION__`。
- [ ] D. `declare global` 会自动创建运行时全局变量。
- [ ] E. 声明文件无需被 `include` 或 `types` 覆盖也一定生效。

**解释**：`.d.ts` 只告诉 TS 类型，不创建运行时值。声明文件也必须进入 tsconfig 的编译上下文。

### Q3 multiple | 声明质量

编写第三方模块或资源声明时，哪些做法合理？

- [x] A. 不确定外部输入输出时优先用 `unknown` 或泛型，而不是到处 `any`。
- [x] B. SVG/CSS 模块声明要和真实构建插件行为一致。
- [x] C. 库项目可用 `declaration: true` 生成 `.d.ts`。
- [x] D. `package.json` 的 `types` 或 `exports.types` 应指向正确声明入口。
- [ ] E. `.d.ts` 写错也不会影响使用者类型安全。

**解释**：声明文件是库 API 的类型契约。错声明会让类型系统给出错误保证。

## ts-016

### Q1 single | 模板字面量笛卡尔积

下面类型会生成什么？

```ts
type Direction = 'top' | 'bottom'
type Prop = `margin-${Direction}` | `padding-${Direction}`
```

- [x] A. `'margin-top' | 'margin-bottom' | 'padding-top' | 'padding-bottom'`
- [ ] B. `string`
- [ ] C. `Direction[]`
- [ ] D. 运行时数组 `['margin-top', ...]`

**解释**：模板字面量类型在类型层组合字符串字面量联合。它不会生成运行时代码。

### Q2 multiple | 模板字面量类型用途

哪些适合用模板字面量类型建模？

- [x] A. 事件名推导，例如 `nameChanged`。
- [x] B. 路由参数名解析，例如 `'/users/:id'`。
- [x] C. CSS token 或长度格式，例如 `${number}px`。
- [x] D. 配置 key / i18n key 约束。
- [ ] E. 任意复杂字符串的运行时解析和校验。

**解释**：模板字面量类型是编译期约束，不是运行时 parser。外部字符串仍要运行时验证。

### Q3 multiple | 性能与限制

关于模板字面量类型，哪些说法正确？

- [x] A. 联合成员组合过多会拖慢类型检查。
- [x] B. 可结合 `Capitalize`、`Uppercase` 等字符串工具类型。
- [x] C. 可结合键名重映射生成新对象 key。
- [ ] D. 它适合解析无限复杂的语法语言。
- [ ] E. 它会让运行时代码自动更安全，无需任何校验。

**解释**：模板字面量类型适合有限模式的类型约束。复杂语言解析交给运行时代码和专用解析器。

## ts-017

### Q1 single | 逆变判断

已知 `Dog extends Animal`，为什么 `(animal: Animal) => void` 可以赋给 `(dog: Dog) => void`？

- [ ] A. 因为函数参数是协变的。
- [x] B. 因为能处理所有 Animal 的函数也一定能处理 Dog，这是参数逆变。
- [ ] C. 因为 TypeScript 完全不检查函数参数。
- [ ] D. 因为 Dog 和 Animal 运行时完全相同。

**解释**：在 `strictFunctionTypes` 下，函数参数按逆变检查。接收更宽类型的函数可以放到需要接收更窄类型的位置。

### Q2 multiple | 型变位置

关于型变，哪些说法正确？

- [x] A. 只作为返回值出现的类型参数通常是协变的。
- [x] B. 只作为函数参数出现的类型参数在严格函数类型下通常是逆变的。
- [x] C. 同时出现在输入和输出位置时，整体往往接近不变。
- [ ] D. 所有泛型类型在 TS 中都完全协变。
- [ ] E. 型变描述运行时对象属性枚举顺序。

**解释**：型变描述泛型类型之间的可赋值关系，与运行时枚举无关。

### Q3 multiple | TS 中的安全边界

关于 TypeScript 中的型变边界，哪些说法正确？

- [x] A. 方法参数为了历史兼容可能有双变特性。
- [x] B. 回调类型设计优先使用函数属性写法，通常更严格。
- [x] C. `readonly Animal[]` 比可写 `Animal[]` 更安全。
- [ ] D. 把 `Dog[]` 赋给 `Animal[]` 后随便 push Animal 不会带来风险。
- [ ] E. `strictFunctionTypes` 会让所有方法参数都严格逆变。

**解释**：数组可写会有经典不安全写入问题；只读数组消除了写入风险，更接近安全协变。

## ts-018

### Q1 single | 递归类型终止

写 `DeepPartial<T>` 时为什么要把 `Date`、`Function`、`RegExp` 等作为 Builtin 终止？

- [ ] A. 因为这些类型不能出现在对象中。
- [x] B. 避免把内建对象展开成一堆内部方法，破坏语义并拖慢类型检查。
- [ ] C. 因为递归类型不能处理数组。
- [ ] D. 因为 `Date` 在 TS 中是原始类型。

**解释**：递归类型要有终止条件，并按业务语义决定哪些类型不再深入。

### Q2 multiple | DeepReadonly

关于 `DeepReadonly<T>`，哪些说法正确？

- [x] A. 可以递归把对象属性变成 readonly。
- [x] B. 数组应变成只读数组或只读元组。
- [x] C. 它只影响类型系统，不会冻结运行时对象。
- [ ] D. 它会自动调用 `Object.freeze`。
- [ ] E. 它永远不会影响 `tsc` 或编辑器性能。

**解释**：深层递归类型可能拖慢类型检查。运行时不可变需要额外代码。

### Q3 multiple | 递归类型风险

使用递归类型时，哪些风险或边界需要考虑？

- [x] A. 可能触发 `Type instantiation is excessively deep`。
- [x] B. 对 Map、Set、Promise、类实例是否递归要按语义处理。
- [x] C. 过深类型会影响编辑器和 `tsc` 性能。
- [ ] D. 递归类型可以替代所有运行时数据校验。
- [ ] E. 递归类型不能表达 JSONValue 这类结构。

**解释**：递归类型适合边界建模，但不是运行时验证工具。复杂对象要控制递归深度和范围。

## ts-019

### Q1 single | private 与 #private

TypeScript 的 `private` 和 JavaScript 的 `#private` 最大区别是什么？

- [ ] A. `private` 是运行时强私有，`#private` 只是命名约定。
- [x] B. `private` 主要是 TS 编译期限制，`#private` 是 JavaScript 运行时私有。
- [ ] C. 两者都会被 `Object.keys` 枚举。
- [ ] D. 两者都只能用于 interface。

**解释**：TS `private` 可被编译擦除，主要靠类型检查；`#field` 是 JS 语言级私有字段。

### Q2 multiple | 类修饰符

关于类修饰符，哪些说法正确？

- [x] A. `protected` 可在类内部和子类中访问。
- [x] B. `readonly` 属性初始化后不能再次赋值。
- [x] C. 构造函数参数属性如 `private readonly secret: string` 会声明并赋值属性。
- [x] D. `override` 配合 `noImplicitOverride` 可防止误覆写。
- [ ] E. `public` 只能在类内部访问。

**解释**：`public` 是默认公开访问。参数属性是 TS class 中常见的简写能力。

### Q3 multiple | abstract class vs interface

关于抽象类和接口，哪些说法正确？

- [x] A. 抽象类会生成运行时代码，可以包含已实现方法和构造逻辑。
- [x] B. interface 只存在于类型系统，运行时擦除。
- [x] C. 类只能继承一个抽象类，但可以实现多个接口。
- [x] D. 抽象类适合“共享实现 + 强制子类补齐协议”。
- [ ] E. `implements` 会自动生成缺失方法。

**解释**：`implements` 只做结构检查，不生成运行时代码。抽象类和接口解决的问题不同。

## ts-020

### Q1 single | 字符串索引签名

为什么下面类型会报错？

```ts
type Bad = {
  [key: string]: string
  count: number
}
```

- [ ] A. TypeScript 不支持索引签名。
- [x] B. 有字符串索引签名时，显式属性的值类型也必须兼容索引签名的 value 类型。
- [ ] C. `count` 不能作为属性名。
- [ ] D. `number` 不能出现在对象类型中。

**解释**：`obj['count']` 也是 string key 访问，因此 `count` 的类型必须能赋给索引签名的 value 类型。

### Q2 multiple | Record 与索引签名

哪些说法正确？

- [x] A. key 集合固定时，`Record<'zh' | 'en', string>` 比开放索引签名更精确。
- [x] B. 开放字典可用索引签名或 `Record<string, V>`。
- [x] C. 同时声明 string 和 number 索引时，number 索引 value 类型必须是 string 索引 value 类型的子类型。
- [ ] D. `Record<string, V>` 会限制对象只能有一个 key。
- [ ] E. 索引签名会在运行时自动校验 value 类型。

**解释**：索引签名和 Record 都是类型约束，不做运行时校验。固定 key 用 Record 联合更清楚。

### Q3 multiple | 索引访问类型

关于 `T[K]` 索引访问类型，哪些说法正确？

- [x] A. `User['profile']['name']` 可提取嵌套属性类型。
- [x] B. `User[keyof User]` 会得到所有属性值类型的联合。
- [x] C. `(typeof colors)[number]` 可从 `as const` 数组中提取元素联合。
- [x] D. 开启 `noUncheckedIndexedAccess` 后，动态索引读取会包含 `undefined`。
- [ ] E. `T[K]` 会在运行时读取对象属性。

**解释**：索引访问类型是类型层操作。`noUncheckedIndexedAccess` 让类型更贴近运行时“可能取不到”的事实。

## ts-021

### Q1 single | 对象联合访问

对于下面联合类型，在未收窄前能直接安全访问哪个字段？

```ts
type Result<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; message: string }
  | { status: 'loading' }
```

- [x] A. `status`
- [ ] B. `data`
- [ ] C. `message`
- [ ] D. `data.name`

**解释**：对象联合未收窄前只能访问共有属性。特有字段要通过判别字段、`in`、`typeof` 等方式收窄后访问。

### Q2 single | 交叉冲突

下面类型中 `value` 的类型是什么？

```ts
type Conflict = { value: string } & { value: number }
```

- [ ] A. `string`
- [ ] B. `number`
- [x] C. `never`
- [ ] D. `string | number`

**解释**：交叉类型不是“后者覆盖前者”。字段冲突会取交集，`string & number` 得到 `never`。

### Q3 multiple | 联合与交叉选择

哪些使用建议合理？

- [x] A. 状态、接口响应和错误处理优先使用可辨识联合。
- [x] B. 对象同时拥有多组能力时可使用交叉类型。
- [x] C. 想覆盖字段类型时，用 `Omit<T, K> & { ... }` 明确表达。
- [ ] D. 交叉类型适合模拟“后面字段覆盖前面字段”。
- [ ] E. 联合类型使用前永远不需要收窄。

**解释**：联合表达“其中一种”，交叉表达“同时满足”。字段覆盖要显式移除再添加，避免冲突成 never。

## ts-022

### Q1 single | TupleToUnion

`type TupleToUnion<T extends readonly unknown[]> = T[number]` 对 `['a', 'b', 1]` 得到什么？

- [x] A. `'a' | 'b' | 1`
- [ ] B. `['a', 'b', 1]`
- [ ] C. `string | number[]`
- [ ] D. `never`

**解释**：元组也是数组类型，`T[number]` 表示用数字索引访问所有元素类型，结果是元素类型联合。

### Q2 multiple | Flatten 实现

关于 `Flatten<T>`，哪些说法正确？

- [x] A. `T extends readonly (infer Item)[] ? Item : T` 可以展开一层数组或元组元素类型。
- [x] B. 递归版本可以处理 `number[][][]` 得到 `number`。
- [x] C. 支持 `readonly` 元组能兼容 `as const` 场景。
- [ ] D. `infer` 可以在运行时解构数组。
- [ ] E. Flatten 会改变运行时数组结构。

**解释**：Flatten 是类型层工具。是否递归、是否支持 readonly，要看题目要求和实际输入。

### Q3 multiple | UnionToIntersection

`UnionToIntersection` 的常见实现依赖哪些机制？

- [x] A. 裸类型参数触发分布式条件类型。
- [x] B. 把联合成员转换成多个函数参数类型。
- [x] C. 函数参数位置的逆变推断。
- [ ] D. 运行时遍历联合类型。
- [ ] E. 对象展开语法。

**解释**：`UnionToIntersection` 是类型体操经典题，核心是分发 + 函数参数逆变推断。生产代码要封装并谨慎使用。

## ts-023

### Q1 single | 参数更少的函数

为什么下面赋值通常是允许的？

```ts
type Handler = (event: Event, index: number) => void

const simple: Handler = (event) => {
  console.log(event.type)
}
```

- [ ] A. TS 不检查函数参数。
- [x] B. 参数更少的函数可以忽略调用方传入的额外参数。
- [ ] C. `index` 会自动变成全局变量。
- [ ] D. `event` 会被推断成 `any`。

**解释**：JS 允许多传参数，回调可以忽略不用的参数。数组回调等场景常依赖这一兼容性。

### Q2 multiple | 函数兼容性

关于函数类型兼容性，哪些说法正确？

- [x] A. 返回值通常是协变的，返回 Dog 可用于需要返回 Animal 的位置。
- [x] B. `strictFunctionTypes` 下，函数参数更接近逆变检查。
- [x] C. 需要处理 Animal 的地方，不能安全传入只处理 Dog 的函数。
- [ ] D. 返回值更宽的函数一定能赋给返回值更窄的位置。
- [ ] E. 函数兼容性只看函数名是否相同。

**解释**：TS 是结构类型系统，函数兼容性看参数和返回值。返回值可以更具体，参数要能安全接收调用方会传的值。

### Q3 multiple | void 与 this 参数

哪些说法正确？

- [x] A. `() => void` 表示调用方忽略返回值，不代表实现不能返回值。
- [x] B. `this` 参数只存在于类型层面，必须写在第一个参数位置。
- [x] C. call signature 可以表达带属性或重载的函数对象。
- [ ] D. `void` 返回类型意味着函数运行时一定返回 `undefined`。
- [ ] E. `this` 参数会成为函数实际第一个运行时参数。

**解释**：`void` 在回调类型里更多表达“返回值不被使用”。TS 的 `this` 参数不会出现在运行时参数列表。

## ts-024

### Q1 single | 字面量拓宽

下面两个变量分别会被推断为什么？

```ts
let count = 1
const status = 'ok'
```

- [x] A. `count: number`，`status: 'ok'`
- [ ] B. `count: 1`，`status: string`
- [ ] C. 二者都是字面量类型。
- [ ] D. 二者都是 `any`。

**解释**：`let` 可重新赋值，所以字面量会拓宽；`const` 原始值不可重新赋值，会保留字面量类型。

### Q2 multiple | 类型推断来源

TypeScript 类型推断来自哪些信息？

- [x] A. 初始化表达式。
- [x] B. 上下文类型，例如事件回调或 `map` 回调。
- [x] C. 控制流分支和返回语句。
- [x] D. 泛型函数实参。
- [ ] E. 运行时接口实际返回内容。

**解释**：TS 静态分析源码和类型声明，不会知道真实接口数据。外部数据要运行时校验。

### Q3 multiple | 推断失效与控制

哪些判断合理？

- [x] A. 空数组可能需要显式标注，避免推断过窄或依赖上下文。
- [x] B. `JSON.parse` 返回 `any`，更安全做法是转为 `unknown` 后验证。
- [x] C. `satisfies` 可检查结构，同时保留表达式自身推断。
- [x] D. `as const satisfies ...` 可同时保留字面量并检查结构。
- [ ] E. 公共 API 永远不应该显式标注返回类型。

**解释**：复杂公共 API、递归函数和对外导出函数常建议显式返回类型，避免意外推断泄漏。

## ts-025

### Q1 single | 模块扩展模块名

扩展 Express Request 类型时，为什么常扩展 `'express-serve-static-core'` 而不是随便写 `'express'`？

- [ ] A. 因为 TS 不支持扩展 `'express'` 字符串。
- [x] B. 模块扩展必须命中第三方库实际声明所在的模块名。
- [ ] C. 因为 `express` 没有运行时代码。
- [ ] D. 因为 Request 只能放在 global 里。

**解释**：模块扩展是合并已有模块声明。模块名写错，扩展不会落到真正的类型上。

### Q2 multiple | 模块扩展规则

关于 module augmentation，哪些说法正确？

- [x] A. 可以在不改第三方源码的情况下补充已有模块类型。
- [x] B. 声明文件必须被 tsconfig 覆盖到。
- [x] C. 扩展类型要和运行时行为一致。
- [ ] D. 只写类型声明会自动给运行时对象添加属性或方法。
- [ ] E. 可以随意给 default export 做 augmentation。

**解释**：模块扩展只补类型，不改运行时。default export augmentation 有限制，不能随便扩。

### Q3 multiple | 全局扩展与原型扩展

哪些说法正确？

- [x] A. `declare global` 所在模块文件通常需要 `export {}`。
- [x] B. 扩展 `Window` 后，运行时仍需确保对应属性真的存在。
- [x] C. 给 `Array<T>` 声明 `first()` 后，还必须实现 `Array.prototype.first` 才能运行。
- [ ] D. 修改内建原型是所有项目推荐的通用实践。
- [ ] E. 类型扩展可以替代所有运行时初始化。

**解释**：类型扩展不能创造运行时行为。修改内建原型风险高，除非在受控环境中明确约定。

## ts-026

### Q1 single | EventMap 约束

类型安全 EventEmitter 的核心类型设计是什么？

- [ ] A. 所有事件 payload 都使用 `any`。
- [x] B. 用事件名到 payload 的映射表约束 `on/off/emit`。
- [ ] C. 只允许一个固定事件名。
- [ ] D. 完全依赖运行时字符串拼接。

**解释**：`Events[K]` 把事件名和 payload 关联起来，调用方传错事件名或 payload 会在编译期报错。

### Q2 multiple | TypedEventEmitter 设计

哪些设计是合理的？

- [x] A. `on<K extends keyof Events>(event: K, listener: Listener<Events[K]>)` 保留事件名和 payload 对应关系。
- [x] B. `on` 返回 unsubscribe，减少忘记解绑。
- [x] C. `ready: void` 这类事件可以通过条件类型让 `emit('ready')` 不需要 payload。
- [ ] D. 内部异构 listener 存储永远不需要任何断言。
- [ ] E. 只要类型安全，就不需要处理 listener 抛错或执行顺序。

**解释**：公共 API 可以强类型，内部实现可能需要封装少量断言。生产版本仍要考虑错误隔离、once、顺序和异步 listener。

### Q3 multiple | 调用效果

对于：

```ts
type AppEvents = {
  login: { userId: string }
  ready: void
}
```

哪些调用应当被类型系统接受？

- [x] A. `emitter.emit('login', { userId: 'u1' })`
- [x] B. `emitter.emit('ready')`
- [ ] C. `emitter.emit('login', { userId: 1 })`
- [ ] D. `emitter.emit('missing')`
- [ ] E. `emitter.on('login', (payload: Error) => {})`

**解释**：事件名和 payload 是绑定关系。不存在的事件名、错误 payload、错误 listener 参数都应被拒绝。

## ts-027

### Q1 single | Builder 累积类型

下面 Builder 链式调用后，类型系统为什么能知道 `value.name` 和 `value.age`？

```ts
new ObjectBuilder().set('name', 'Alice').set('age', 30).build()
```

- [ ] A. TypeScript 会运行代码并检查 data 对象。
- [x] B. 每次 `set` 返回携带 `T & Record<K, V>` 的新 Builder 类型。
- [ ] C. 因为所有字段都被推成 `any`。
- [ ] D. 因为 `build` 总是返回 `Record<string, string>`。

**解释**：Builder 类型安全依赖链式调用累积泛型信息，运行时仍是普通对象赋值。

### Q2 multiple | 限制 build 调用

哪些方式可以让缺少必填字段时不能调用 `build`？

- [x] A. 用泛型状态记录已设置字段。
- [x] B. 给 `build` 添加 `this: UserBuilder<HasRequired>` 约束。
- [x] C. 每个 setter 返回更新后的 Builder 泛型状态。
- [ ] D. 在 `build` 内部返回 `any` 就能保证安全。
- [ ] E. 只靠类私有字段就能让 TS 推断必填字段都存在。

**解释**：`this` 参数约束能让方法只在特定泛型状态下可调用。运行时仍应做必要校验。

### Q3 multiple | Builder 取舍

关于泛型 Builder，哪些判断合理？

- [x] A. 类型越精细，内部断言和维护成本可能越高。
- [x] B. 应优先覆盖必填字段、合法状态迁移和返回类型。
- [x] C. 不必追求把所有运行时细节都模拟到类型层。
- [ ] D. 泛型 Builder 可以替代所有运行时校验。
- [ ] E. Builder 类型越复杂，`tsc` 一定越快。

**解释**：类型安全 Builder 是 API 体验优化，但复杂泛型会带来实现和性能成本。

## ts-028

### Q1 single | Result 的价值

`Result<T, E>` 最适合解决什么问题？

- [ ] A. 让所有错误都在运行时自动消失。
- [x] B. 把成功值和失败原因放进返回类型，要求调用方处理失败分支。
- [ ] C. 替代 JSON schema 校验。
- [ ] D. 让异步请求变成同步请求。

**解释**：Result 适合可预期业务失败，不适合掩盖错误，也不能证明服务端响应真实类型。

### Q2 multiple | Result 消费

对于：

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }
```

哪些说法正确？

- [x] A. `if (result.ok)` 分支里可以访问 `result.value`。
- [x] B. `else` 分支里可以访问 `result.error`。
- [x] C. error 也可以设计成可辨识联合，便于 switch 处理。
- [ ] D. 未判断 `ok` 前可以同时安全访问 `value` 和 `error`。
- [ ] E. Result 会自动捕获所有异常。

**解释**：Result 是可辨识联合。异常需要手动 catch 后转换成 Err，或者让异常继续抛出。

### Q3 multiple | Result 取舍

哪些判断合理？

- [x] A. 表单校验、接口状态、解析失败等可预期失败适合 Result。
- [x] B. 程序 bug、不可恢复资源错误可能仍适合异常。
- [x] C. `catch (error)` 中的 error 应视为 `unknown` 并先收窄。
- [x] D. API 响应仍需要 Zod/Valibot 等运行时 schema 校验。
- [ ] E. 泛型 `Result<User, Error>` 能证明服务器一定返回 User。

**解释**：泛型约束调用方代码，不验证外部世界。外部数据进入系统时仍要运行时校验。

## ts-029

### Q1 single | 性能诊断

想先量化 TypeScript 类型检查耗时和类型实例化情况，哪个命令更合适？

- [x] A. `tsc --noEmit --extendedDiagnostics`
- [ ] B. `node --inspect index.js`
- [ ] C. `npm view typescript`
- [ ] D. `curl tsconfig.json`

**解释**：`extendedDiagnostics` 会显示类型检查耗时、实例化数量和内存等信息。复杂问题可进一步 `--generateTrace`。

### Q2 multiple | 常见慢类型来源

哪些可能导致 TS 类型检查变慢？

- [x] A. 巨大联合类型和模板字面量笛卡尔积。
- [x] B. 深层递归条件类型。
- [x] C. 大量交叉类型叠加。
- [x] D. 自动生成的超大 `.d.ts`。
- [ ] E. 删除所有类型标注一定会让项目更安全更快。

**解释**：慢通常来自复杂类型计算和项目组织。优化前要测量，不要盲目删除类型。

### Q3 multiple | 优化策略

哪些是合理的类型检查性能优化？

- [x] A. 不需要分发时用 `[T] extends [unknown]` 阻止分布式条件类型。
- [x] B. Monorepo 用 project references + `composite` 拆分检查边界。
- [x] C. 检查 `include` 是否误包含 `dist`、`coverage`、生成目录。
- [x] D. 应用项目通常可以开启 `skipLibCheck`，库项目更谨慎。
- [ ] E. 把所有类型都改成 `any` 是最佳长期方案。

**解释**：性能优化应保留类型价值，减少不必要的复杂计算和重复分析。

## ts-030

### Q1 single | API 路由映射

类型安全 API 封装中，`ApiRoutes` 映射表的核心价值是什么？

- [ ] A. 自动让后端接口存在。
- [x] B. 建立路由与 params/body/query/response 的类型关系。
- [ ] C. 替代 fetch 运行时错误处理。
- [ ] D. 让所有响应无需 JSON 解析。

**解释**：`ApiRoutes` 是调用方的类型契约。真实 URL 拼接、请求发送和响应校验仍在运行时完成。

### Q2 multiple | RequestArgs 条件类型

下面哪些调用规则应该被类型系统约束？

- [x] A. `'GET /users/:id'` 必须传 `params: { id: string }`。
- [x] B. `'POST /users'` 必须传 `body: CreateUserDto`。
- [x] C. `'GET /users'` 的 `query` 可以是可选的。
- [ ] D. `'POST /users'` 可以随意传 `params`。
- [ ] E. 缺少必填 options 时仍应通过类型检查。

**解释**：条件类型和元组 rest 参数可以让 options 是否必填随路由定义变化。

### Q3 multiple | API 封装工程边界

哪些工程注意点正确？

- [x] A. 泛型只能约束调用方，不会验证服务端响应。
- [x] B. 响应体应使用 Zod/Valibot 等 schema 做运行时校验。
- [x] C. 路径参数替换、query 拼接、204 空响应、错误体解析都要运行时处理。
- [x] D. 大型项目可从 OpenAPI 生成路由类型，减少前后端漂移。
- [ ] E. `return response.json() as Promise<ResponseOf<R>>` 就能保证服务端数据正确。

**解释**：类型断言只是相信响应类型，不是验证。类型安全 API 封装要和运行时校验配合。

## ts-031

### Q1 single | typed token

在类型安全的依赖注入容器里，为什么不建议把 token 设计成普通 `string`，再让调用方写 `resolve<T>('logger')`？

- [ ] A. 因为 `string` 不能作为 `Map` 的 key。
- [x] B. 因为 `T` 完全由调用方声明，可能把同一个 key 解析成错误类型。
- [ ] C. 因为 TypeScript 不能给字符串字面量做类型推断。
- [ ] D. 因为 `resolve<T>()` 会在运行时自动校验 `T`。

**解释**：裸字符串 token 和调用方泛型没有绑定关系。`Token<T>` 把“这个 token 对应什么类型”固化到 token 本身，外部解析时才有类型依据。

### Q2 multiple | 容器边界

下面哪些设计能让依赖注入容器的类型边界更可靠？

- [x] A. 用 `createToken<T>()` 创建携带类型信息的 token。
- [x] B. 把 `unknown -> T` 的断言集中在容器内部边界。
- [x] C. `bind<T>(token: Token<T>, factory: (...) => T)` 让工厂返回值和 token 类型一致。
- [ ] D. 每次解析时都重新写 `Symbol('Logger')`，避免 token 被复用。
- [ ] E. 使用 `any` 存储所有实例后，就不需要 token 类型了。

**解释**：容器内部通常需要集中断言，但外部 API 要由 token 和 factory 的泛型关系约束。到处创建同名 Symbol 会得到不同 key，反而解析不到依赖。

### Q3 multiple | 装饰器与工程约束

关于 TypeScript DI 里的装饰器和运行时元数据，哪些说法正确？

- [x] A. `reflect-metadata` 读取到的是运行时构造函数信息，不等于完整 TS 类型系统。
- [x] B. 接口、泛型、联合类型这类信息编译后通常无法靠元数据表达。
- [x] C. 复杂依赖经常仍需要显式 `@Inject(Token)` 或类似机制。
- [x] D. 容器还需要处理 singleton、transient、request scoped 等生命周期问题。
- [ ] E. 使用装饰器后，循环依赖和作用域问题会被 TypeScript 自动解决。

**解释**：装饰器能减少样板代码，但不能把接口和泛型变成运行时事实。类型安全 DI 仍要显式 token、作用域建模和运行时错误处理。

## ts-032

### Q1 single | 边界数据

从 `fetch('/api/user')` 拿到 JSON 后，最符合类型安全实践的处理方式是什么？

- [ ] A. `return await response.json() as User`，因为 API 文档已经说明了结构。
- [x] B. 把响应先当作 `unknown`，用 schema 或类型守卫验证后再返回 `User`。
- [ ] C. 写成 `fetch<User>()`，这样浏览器会校验响应字段。
- [ ] D. 在接口类型里把所有字段写成可选，避免运行时报错。

**解释**：TypeScript 类型在运行时被擦除，外部数据必须在边界校验。`as User` 只是断言，不会检查真实 payload。

### Q2 multiple | schema 与类型守卫

哪些场景更适合使用 Zod、Valibot 这类 schema-first 校验库，而不是只写简单类型守卫？

- [x] A. API 响应有多层嵌套、枚举、数组和字段格式约束。
- [x] B. 需要把校验错误展示给用户或记录详细错误路径。
- [x] C. 同一份 schema 需要同时导出运行时校验和静态类型。
- [ ] D. 只需要判断 `value !== null && typeof value === 'object'` 的极小对象。
- [ ] E. 想让 TypeScript 在编译后保留所有接口定义。

**解释**：复杂数据边界需要可复用、可组合、可报告错误的 schema。简单守卫适合很小的结构，但接口本身不会在运行时存在。

### Q3 multiple | safeParse 与错误处理

关于 `parse`、`safeParse` 和断言函数，哪些判断正确？

- [x] A. `safeParse` 返回成功/失败的可辨识联合，适合显式分支处理。
- [x] B. `parse` 校验失败会抛异常，适合希望直接中断流程的入口。
- [x] C. `asserts value is User` 成功返回后，后续代码能获得收窄类型。
- [ ] D. `safeParse` 成功后仍然只能得到 `unknown`。
- [ ] E. 泛型请求函数的 `Promise<User>` 能替代运行时校验。

**解释**：`safeParse` 和断言函数都能把 `unknown` 安全收窄。泛型只约束调用方代码，不能证明服务端返回值正确。

## ts-033

### Q1 single | `?.` 短路边界

下面代码中，如果 `user` 是 `undefined`，`ratio` 最可能是什么结果？

```ts
const ratio = user?.score / 100
```

- [ ] A. 表达式整体短路为 `undefined`，不会继续计算。
- [ ] B. 自动得到 `0`。
- [x] C. 等价于 `undefined / 100`，运行结果是 `NaN`。
- [ ] D. TypeScript 会把这段代码改写成 `(user?.score ?? 0) / 100`。

**解释**：可选链只短路当前链，外层除法仍会执行。需要默认值时应写 `(user?.score ?? 0) / 100`。

### Q2 multiple | `??` 与 `||`

哪些表达式结果判断正确？

- [x] A. `0 ?? 10` 的结果是 `0`。
- [x] B. `0 || 10` 的结果是 `10`。
- [x] C. `'' ?? 'default'` 的结果是 `''`。
- [x] D. `false ?? true` 的结果是 `false`。
- [ ] E. `NaN ?? 1` 的结果是 `1`。

**解释**：`??` 只处理 `null` 和 `undefined`，不会把 `0`、空字符串、`false`、`NaN` 当作缺失值。`||` 会按 falsy 规则处理。

### Q3 multiple | 语法与赋值限制

关于可选链和空值合并，哪些说法正确？

- [x] A. `callback?.('hi')` 在 `callback` 为空时返回 `undefined`。
- [x] B. `list?.[0]` 可以安全访问可能为空的数组引用。
- [x] C. `??` 不能不加括号直接和 `||`、`&&` 混用。
- [x] D. `value ??= fallback` 只会在当前值是 `null | undefined` 时赋值。
- [ ] E. `user?.name = 'Ada'` 是给可选对象赋值的推荐写法。

**解释**：可选链能读属性、索引和调用，但不能作为赋值目标。`??` 与逻辑运算符混用时要显式括号避免语义歧义。

## ts-034

### Q1 single | 接口多态

在 `save<T>(value: T, serializer: Serializer<T>)` 这种设计里，多态主要体现在哪里？

- [ ] A. `save` 必须知道每个 serializer 的具体 class 名称。
- [x] B. 调用方依赖 `Serializer<T>` 协议，不依赖具体实现。
- [ ] C. TypeScript 会强制所有实现类写 `extends Serializer`。
- [ ] D. 接口会在运行时检查 `serialize` 方法存在。

**解释**：接口表达稳定结构，具体实现只要满足结构即可替换。TypeScript 是结构类型系统，接口本身不会出现在运行时。

### Q2 multiple | interface vs abstract class

什么时候更适合选择抽象类而不是纯接口？

- [x] A. 需要复用模板方法流程，比如 `export -> normalize -> serialize -> afterExport`。
- [x] B. 需要共享部分运行时代码或状态。
- [x] C. 希望父类提供默认实现，子类只补齐关键步骤。
- [ ] D. 只想描述一个插件必须实现哪些方法，且不需要运行时代码。
- [ ] E. 希望一个类同时继承多个父类实现。

**解释**：抽象类有运行时代码，适合共享流程和状态；接口更适合边界协议。类只能继承一个父类，但可以实现多个接口。

### Q3 multiple | 多态设计风险

关于 TypeScript 多态设计，哪些判断正确？

- [x] A. 优先让调用方依赖稳定协议，可以降低替换实现的成本。
- [x] B. 接口适合端口适配、插件协议、策略对象等边界抽象。
- [x] C. 只有确实需要共享流程或状态时，再引入抽象类更稳妥。
- [ ] D. 抽象类总是比接口更类型安全，因为它有运行时代码。
- [ ] E. 只要用了接口，就能避免所有运行时方法缺失问题。

**解释**：接口和抽象类解决的问题不同。接口不做运行时验证；抽象类能复用实现，但也会带来继承耦合。

## ts-035

### Q1 single | 判别字段

下面哪种状态建模最符合可辨识联合的最佳实践？

- [ ] A. `{ isLoading: boolean; data?: User; error?: Error }`
- [x] B. `{ status: 'idle' } | { status: 'loading' } | { status: 'success'; data: User } | { status: 'error'; error: Error }`
- [ ] C. `{ status?: string; payload?: unknown }`
- [ ] D. `{ loading?: true; success?: true; error?: true; data?: User }`

**解释**：稳定、必填、字面量的判别字段能让每个分支只携带自己合法的数据，避免多个 boolean 组合出非法状态。

### Q2 multiple | 穷尽检查

在 `switch (action.type)` 后使用 `assertNever(action)` 的价值是什么？

- [x] A. 新增 action 分支但忘记处理时，编译期能暴露问题。
- [x] B. default 分支里参数如果不是 `never`，说明还有未覆盖分支。
- [x] C. 让重构 action union 时更容易找到遗漏位置。
- [ ] D. 让所有运行时异常自动变成类型错误。
- [ ] E. 可以替代外部数据的运行时校验。

**解释**：`never` 穷尽检查针对已知联合类型的分支覆盖，不负责验证外部输入，也不能消除所有运行时异常。

### Q3 multiple | action 与外部输入

关于可辨识联合在 reducer 或消息处理里的应用，哪些做法正确？

- [x] A. action creator 返回对象时用 `as const` 保留字面量 `type`。
- [x] B. 避免把所有 action 写成 `{ type: string; payload?: unknown }`。
- [x] C. 从网络、localStorage 或 postMessage 来的数据应先校验，再转为联合类型。
- [x] D. 每个分支只放该分支真实存在的数据。
- [ ] E. 判别字段设成可选更灵活，也更利于类型收窄。

**解释**：判别字段越稳定，收窄越可靠。外部数据要先经过运行时校验，否则只是把未知数据“宣称”为联合类型。

## ts-036

### Q1 single | 递归终止

`Permutation<T>` 中为什么常写 `[T] extends [never] ? [] : ...`，而不是 `T extends never ? [] : ...`？

- [ ] A. 因为元组写法能把 `never` 自动转成 `unknown`。
- [x] B. 因为要阻止条件类型分发，正确判断当前联合是否已经为空。
- [ ] C. 因为 `T extends never` 在 TypeScript 中语法非法。
- [ ] D. 因为元组写法会让排列结果按字母顺序稳定输出。

**解释**：裸类型参数会触发分布式条件类型，`never` 分发后得不到期望分支。用元组包住可以把它当整体判断。

### Q2 multiple | 分发与剩余集合

下面哪些说法能解释 `Permutation<T, K = T>` 的核心机制？

- [x] A. `K extends K` 用来让当前联合成员逐个作为本轮首元素。
- [x] B. `Exclude<T, K>` 表示递归时移除已经选择的成员。
- [x] C. `[K, ...Permutation<Exclude<T, K>>]` 把当前选择拼到剩余排列前面。
- [x] D. 辅助参数 `K = T` 保留当前层要分发的候选集合。
- [ ] E. `Exclude<T, K>` 会修改原始联合类型 `T` 的声明。

**解释**：Permutation 利用分布式条件类型枚举当前选择，再递归处理剩余成员。类型运算不会修改原始类型声明。

### Q3 multiple | 生产使用风险

关于排列类型和 `UnionToTuple`，哪些判断正确？

- [x] A. 排列数量按阶乘增长，联合成员稍多就可能拖慢类型检查。
- [x] B. `UnionToTuple` 生成的顺序不应作为业务语义依赖。
- [x] C. 这类类型适合面试、类型挑战或很小范围的类型约束。
- [ ] D. `Permutation` 可以安全用于任何大型 union，性能不会受影响。
- [ ] E. 联合类型在 TypeScript 中天然有稳定声明顺序。

**解释**：复杂类型编程要考虑编译性能和可维护性。联合类型本身没有可依赖的业务顺序，排列类型也容易指数级膨胀。

## ts-037

### Q1 single | 参数元组递归

一参一参柯里化的类型 `Curry<Args, Return>` 中，`Args extends [infer First, ...infer Rest]` 的作用是什么？

- [ ] A. 把返回值拆成多个函数。
- [x] B. 取出当前第一个参数类型，并递归处理剩余参数。
- [ ] C. 把所有参数都变成可选参数。
- [ ] D. 保证运行时 `fn.length` 一定准确。

**解释**：柯里化类型的核心是递归拆参数元组：有参数就返回接收首参的函数，没有参数就返回最终结果类型。

### Q2 multiple | 运行时与类型边界

关于示例中的通用 `curry` 实现，哪些注意点正确？

- [x] A. 类型只描述一参一参调用，不自动支持 `sum(1, 2)(3)`。
- [x] B. 运行时用 `fn.length` 判断参数数量时，会受默认参数影响。
- [x] C. rest 参数函数的 `length` 可能不能表达真实需要的参数个数。
- [ ] D. TypeScript 的类型递归会自动实现运行时柯里化逻辑。
- [ ] E. 对重载函数柯里化时，类型会天然保留所有重载签名。

**解释**：类型和运行时实现要分别处理。默认参数、rest 参数、重载都会让柯里化的类型和运行时边界更复杂。

### Q3 multiple | partial application

`PartialApply<F, Prefix>` 这种类型主要想约束什么？

- [x] A. 已经传入的 `Prefix` 必须匹配原函数参数元组的前缀。
- [x] B. 返回函数只接收剩余参数。
- [x] C. 返回值类型仍然来自原函数返回值。
- [ ] D. 可以从中间任意跳过参数，剩余参数会自动重排。
- [ ] E. 会在运行时检查每个参数的类型。

**解释**：partial application 是前缀绑定，不是任意占位重排。TypeScript 只做静态约束，运行时仍是普通函数调用。

## ts-038

### Q1 single | Awaited

`type R = Awaited<Promise<Promise<number>> | string>` 的结果更接近哪一个？

- [ ] A. `Promise<number> | string`
- [x] B. `number | string`
- [ ] C. `Promise<Promise<number | string>>`
- [ ] D. `never`

**解释**：`Awaited` 会模拟 `await` 行为，递归展开 Promise/thenable，并对联合类型分发。

### Q2 multiple | NoInfer

关于 `NoInfer<T>`，哪些说法正确？

- [x] A. 它能阻止某个参数位置参与泛型推断。
- [x] B. 它常用于让泛型先从主参数确定，再检查默认值或候选值是否合法。
- [x] C. 在 `createStreetLight(colors, defaultColor)` 中可防止 `'blue'` 把颜色联合推宽。
- [ ] D. 它会在运行时冻结传入对象。
- [ ] E. 它能让任意字符串自动收窄成数组里的字面量成员。

**解释**：`NoInfer` 是类型层工具，不影响运行时。它限制推断来源，让第二个参数按已经推断出的 `C` 被检查。

### Q3 multiple | this 与构造工具类型

哪些工具类型用途匹配正确？

- [x] A. `ThisParameterType<typeof fn>` 提取函数显式 `this` 参数类型。
- [x] B. `OmitThisParameter<typeof fn>` 得到去掉 `this` 参数后的函数类型。
- [x] C. `ConstructorParameters<typeof Class>` 提取构造函数参数元组。
- [x] D. `InstanceType<typeof Class>` 得到构造函数创建出的实例类型。
- [ ] E. `ReturnType<typeof Class>` 是提取 class 实例类型的推荐方式。

**解释**：class 的实例类型应使用 `InstanceType` 或类名本身；`ReturnType` 面向普通函数返回值，不用于构造函数实例提取。

## ts-039

### Q1 single | 结构兼容

为什么下面赋值在 TypeScript 中通常可以通过？

```ts
interface Point2D { x: number; y: number }
interface Coordinate { x: number; y: number }
const point: Point2D = { x: 1, y: 2 }
const coordinate: Coordinate = point
```

- [ ] A. 因为 `Point2D` 自动继承了 `Coordinate`。
- [x] B. 因为 TypeScript 主要按成员结构判断兼容性。
- [ ] C. 因为 interface 名称会在运行时合并。
- [ ] D. 因为所有 interface 都等价于 `any`。

**解释**：TypeScript 是结构类型系统，只要成员结构兼容，不要求两个类型来自同一个声明名。

### Q2 multiple | 额外属性检查

关于下面代码，哪些判断正确？

```ts
type Config = { host: string; port: number }
const a: Config = { host: 'localhost', port: 3000, debug: true }
const raw = { host: 'localhost', port: 3000, debug: true }
const b: Config = raw
```

- [x] A. `a` 会触发对象字面量的额外属性检查。
- [x] B. `b` 通常可以通过，因为 `raw` 结构上至少满足 `Config`。
- [x] C. 额外属性检查不是名义类型，而是一层实用校验。
- [ ] D. `raw` 一旦有额外字段，就永远不能赋给 `Config`。
- [ ] E. 额外属性检查会在运行时删除 `debug` 字段。

**解释**：对象字面量直接赋值会更严格，避免拼写错误。赋值给变量后再传递，兼容性回到结构检查，不会删除运行时字段。

### Q3 multiple | nominal-like 边界与品牌类型

哪些场景或做法能在 TypeScript 中形成类似名义类型的约束？

- [x] A. 带有 `private` 或 `protected` 成员的类兼容性受声明来源限制。
- [x] B. 用 `unique symbol` 作为品牌字段构造 `UserId`、`OrderId`。
- [x] C. 对 id、金额、单位等原始值使用 branded type 降低误传风险。
- [ ] D. 两个 interface 名称不同就天然互不兼容。
- [ ] E. `type UserId = string` 就能阻止传入普通字符串。

**解释**：TS 默认结构兼容，想表达领域身份需要品牌类型或 class 私有成员这类技巧。类型别名本身不会创造新身份。

## ts-040

### Q1 single | NodeNext 配置

Node 运行时项目想让 TypeScript 按 Node 的 ESM/CJS 规则理解文件和 `package.json`，更合理的配置是哪组？

- [ ] A. `"module": "ESNext", "moduleResolution": "classic"`
- [x] B. `"module": "NodeNext", "moduleResolution": "NodeNext"`
- [ ] C. `"module": "CommonJS", "moduleResolution": "bundler"`
- [ ] D. `"module": "AMD", "moduleResolution": "node"`

**解释**：NodeNext 会结合 `package.json` 的 `type` 字段和 `.ts/.mts/.cts` 等扩展名判断模块系统。Bundler 项目则常用 ESNext + bundler。

### Q2 multiple | CJS 互操作

关于 `esModuleInterop` 和 CommonJS 包互操作，哪些说法正确？

- [x] A. 它让 default import 更符合 Babel/打包器处理 CJS default 的习惯。
- [x] B. 它不保证所有 CJS 包都能可靠使用具名导入。
- [x] C. 老式 `export =` 声明常可用 `import foo = require('foo')` 匹配。
- [ ] D. 开启后 TypeScript 会把任意 CJS 包转换成真正的 ESM 源码。
- [ ] E. 开启后库作者的 `.d.ts` 和运行时输出不一致也不会出问题。

**解释**：互操作选项改善类型和 emit 行为，但不改变包本身的真实导出形态。具名导入仍依赖运行时和工具链分析能力。

### Q3 multiple | 发布与 import type

处理 ESM/CJS 互操作时，哪些工程实践正确？

- [x] A. Node ESM 相对导入通常写编译后的 `.js` 扩展名。
- [x] B. 库发布时 `exports` 中的 `types`、`import`、`require` 指向要保持一致。
- [x] C. 双包发布要注意同一包被 ESM/CJS 两份实例加载的问题。
- [x] D. 配合 `verbatimModuleSyntax` 使用 `import type` 区分类型导入和值导入。
- [ ] E. 在 Node ESM 下，源码是 `.ts` 就必须写 `import './foo.ts'`。

**解释**：Node 运行时加载编译后的 JS，路径和扩展名要面向输出结果。类型导入和值导入分清楚可以减少运行时导入错误。

## ts-041

### Q1 single | 状态与事件来源

类型安全状态机最基础的约束目标是什么？

- [ ] A. 让所有事件都能在任意状态下发送成功。
- [x] B. 状态名、事件名和 transition 目标都来自同一份配置约束。
- [ ] C. 让状态机只在编译期存在，运行时不需要 transition 表。
- [ ] D. 用 boolean 字段替代所有状态名。

**解释**：状态机的类型安全来自“配置即来源”：initial、states、on 里的事件和目标状态必须互相对齐。

### Q2 multiple | `satisfies` 与字面量

为什么状态机配置里常用 `satisfies MachineConfig<State, Event>`？

- [x] A. 校验配置是否满足状态机结构。
- [x] B. 避免对象字面量被粗暴拓宽后丢失具体状态名信息。
- [x] C. 检查 transition 的目标状态是否存在于状态集合中。
- [ ] D. 在运行时自动阻止非法事件。
- [ ] E. 自动推导当前运行时状态下唯一允许的事件。

**解释**：`satisfies` 是编译期结构校验和字面量保留工具。运行时仍要由 `send` 逻辑处理事件；state-specific event 需要更复杂的 typestate 设计。

### Q3 multiple | typestate 边界

关于示例状态机的能力边界，哪些判断正确？

- [x] A. `send(event: Event)` 能限制事件必须来自事件全集。
- [x] B. 它不能静态证明“当前 red 状态只能发 next”，因为当前状态是运行时值。
- [x] C. 要做 state-specific event，可让 transition 返回携带新状态泛型的对象。
- [x] D. 复杂生产场景可考虑 XState 等成熟库。
- [ ] E. 只要用泛型参数 `State`，TypeScript 就能知道任意时刻的当前状态。

**解释**：泛型能描述配置关系，但无法自动追踪运行时变量随事件变化后的精确状态。typestate 要把状态变化编码进类型返回值。

## ts-042

### Q1 single | enum 成本

为什么很多前端项目会用 `as const` 对象替代普通数字 `enum`？

- [ ] A. 因为 `enum` 在 TypeScript 中完全没有运行时代码。
- [x] B. 因为 const 对象是普通 JS，构建行为更直观，且适合 API 字符串值。
- [ ] C. 因为 const 对象会在运行时自动冻结。
- [ ] D. 因为联合字面量不能表达字符串取值集合。

**解释**：普通 enum 会生成运行时对象，数字 enum 还有反向映射。const 对象更贴近 JS，值和类型可从同一份对象推导。

### Q2 multiple | const enum 风险

哪些是公共库导出 `const enum` 时需要谨慎的原因？

- [x] A. `const enum` 依赖编译期内联，跨包消费可能和构建链不匹配。
- [x] B. Babel/SWC/esbuild 这类单文件转译场景可能无法按预期处理。
- [x] C. `isolatedModules` 等配置下容易踩坑。
- [ ] D. `const enum` 一定比普通对象更适合 JSON API。
- [ ] E. `const enum` 会在运行时自动校验所有枚举值。

**解释**：`const enum` 的优势是内联，但代价是构建链耦合。公共库要优先考虑消费者的编译环境。

### Q3 multiple | 替代方案选择

关于 enum、const 对象和联合字面量，哪些选择合理？

- [x] A. 只需要类型集合时，可直接写 `'active' | 'inactive'`。
- [x] B. 需要运行时枚举值和类型同步时，可用 `as const` 对象。
- [x] C. 维护已有 enum API 或位运算 flag 时，仍可考虑 enum 或 number 对象。
- [x] D. `Object.values(Status)` 可用于 const 对象的运行时枚举。
- [ ] E. `as const` 对象没有任何运行时对象成本。

**解释**：const 对象只要被运行时引用，就会存在对象成本。是否使用取决于是否需要运行时值。

## ts-043

### Q1 single | 单路径递归

`DeepPickOne<T, 'address.country.code'>` 的核心递归思路是什么？

- [ ] A. 先把对象完整深拷贝，再删除不需要的字段。
- [x] B. 用模板字面量拆出当前 key 和剩余路径，逐层构造嵌套对象。
- [ ] C. 把点路径转换成数组后在运行时遍历。
- [ ] D. 直接用 `Pick<T, P>`，因为 `Pick` 支持点路径。

**解释**：类型层实现靠 `P extends \`${infer K}.${infer Rest}\`` 拆路径，再用 `{ [Key in K]: ... }` 递归构造。

### Q2 multiple | 多路径合并

为什么 `DeepPick<T, 'id' | 'address.city' | 'address.country.code'>` 需要“联合转交叉”？

- [x] A. 每条路径先生成一个局部对象结果。
- [x] B. 多条路径共享父级时，需要合并到同一个嵌套对象上。
- [x] C. `UnionToIntersection` 可把 `{ id: string } | { address: ... }` 合并成同时拥有这些字段的类型。
- [ ] D. 联合转交叉会按运行时顺序遍历对象属性。
- [ ] E. 不合并也能自然得到完整对象结构。

**解释**：单路径 pick 得到的是多个对象类型的联合。要让结果同时包含所有路径，就要把这些片段合并成交叉并展开。

### Q3 multiple | 实现限制

关于 `DotPaths`、`PathValue` 和 `DeepPick`，哪些注意点正确？

- [x] A. 数组、函数、Date 等也属于广义 object，通常要按业务语义特殊处理。
- [x] B. 路径过深或对象过大会增加类型检查成本。
- [x] C. `PathValue<User, 'address.city'>` 适合只取路径对应的值类型。
- [ ] D. 类型层点路径能自动验证运行时用户输入的字符串。
- [ ] E. `DeepPick` 会改变原始对象的运行时结构。

**解释**：这些工具都是静态类型计算，不处理运行时数据。复杂对象类型还要考虑特殊对象和性能。

## ts-044

### Q1 single | schema-first 表单

为什么生产项目里常推荐 React Hook Form + Zod/Valibot 这类 schema-first 方案？

- [ ] A. 因为 TypeScript 接口会在浏览器里自动校验输入值。
- [x] B. 因为 schema 同时提供运行时校验和静态类型推断，表单状态/错误/性能也更成熟。
- [ ] C. 因为所有 DOM input 的值都会自动按字段类型转换。
- [ ] D. 因为不再需要处理服务端错误。

**解释**：表单是运行时输入边界，schema 能避免“TS 类型和校验规则分离”。成熟表单库还能处理状态、性能和错误展示。

### Q2 multiple | 字段配置类型

在手写 `useForm<TForm>` 时，哪些类型关系值得保留？

- [x] A. `setField<K extends keyof TForm>(key: K, value: TForm[K])` 保证字段和值匹配。
- [x] B. `validate?: (value: TForm[K], values: TForm) => string | undefined` 让校验器拿到精确字段类型。
- [x] C. `FormErrors<TForm>` 的 key 应来自表单字段名。
- [ ] D. 所有字段值都可以统一建模成 `string`，提交时再相信后端。
- [ ] E. 字段名应该用普通 `string`，这样更灵活也更安全。

**解释**：表单系统的关键是字段名、字段值、错误和提交值都来自同一个类型源。字段和值一旦脱钩，类型安全很快失效。

### Q3 multiple | 工程边界

关于类型安全表单的工程边界，哪些说法正确？

- [x] A. DOM input 原始值通常是 string，number/boolean/date 需要 parse。
- [x] B. 表单内部值和提交 DTO 可能不同，需要显式 transform。
- [x] C. 服务端错误既可能映射到字段，也可能是表单级错误。
- [x] D. 大表单要考虑渲染性能，避免每次输入牵动整页。
- [ ] E. 只要泛型写对，就不需要运行时校验。

**解释**：泛型只能保证代码内部 API 的类型关系；用户输入、服务端错误和 DOM 转换都必须在运行时处理。

## ts-045

### Q1 single | paths 的边界

为什么 TypeScript monorepo 不能只靠 `compilerOptions.paths` 做类型共享？

- [ ] A. `paths` 会自动生成每个包的 `.d.ts`。
- [x] B. `paths` 只影响 TS 解析，不会自动解决运行时打包、包边界和发布入口。
- [ ] C. `paths` 只能用于 JavaScript，不能用于 TypeScript。
- [ ] D. `paths` 会禁止 IDE 跳转定义。

**解释**：`paths` 是编译器解析别名，不是包发布契约。Monorepo 还需要 workspace 依赖、project references 和 package exports。

### Q2 multiple | Project References

关于 Project References，哪些配置或行为正确？

- [x] A. 根 `tsconfig.json` 可作为 solution config，使用 `files: []` 和 `references`。
- [x] B. 被引用的库包通常需要 `composite: true`。
- [x] C. `tsc -b` 会按 references 依赖图进行构建。
- [x] D. 库包常开启 `declaration` 和 `declarationMap` 输出类型声明。
- [ ] E. 开启 references 后，所有包都必须从别的包的 `src` 目录直接 import。

**解释**：Project References 的价值是建立清晰类型构建边界。跨包应该走包入口和 exports，避免绕过边界直接引用源码。

### Q3 multiple | 发布与 CI

哪些 monorepo 实践更稳妥？

- [x] A. 包的 `package.json` 配置 `exports.types` 和 `exports.import`。
- [x] B. 应用包通过 `workspace:*` 依赖引用内部包。
- [x] C. CI 中可先跑 `tsc -b --pretty false` 检查类型边界。
- [x] D. 生成目录和 dist 不应被其他包随意直接引用。
- [ ] E. 配置 `paths` 后，发布到 npm 时消费者会自动知道这些别名。

**解释**：发布和消费依赖 package.json 契约，不依赖你本地 tsconfig paths。CI 要验证类型构建图和包边界。

## ts-046

### Q1 single | 类型测试对象

TypeScript 类型测试主要验证什么？

- [ ] A. 浏览器点击流程是否正确。
- [x] B. 编译期 API 类型行为是否符合预期，错误用法是否会报错。
- [ ] C. 生产 bundle 的 gzip 体积。
- [ ] D. Node 运行时是否能连接数据库。

**解释**：类型测试是编译期测试，适合保护库的公开 API、工具类型和负向约束。

### Q2 multiple | 工具选择

关于 `tsd`、`expect-type`、`expectTypeOf`，哪些判断正确？

- [x] A. `tsd` 适合测试发布包的 `.d.ts` 或公共 API。
- [x] B. `expectTypeOf` 可和 Vitest 项目放在同一测试生态里。
- [x] C. 手写 `Expect<Equal<A, B>>` 很适合测试工具类型。
- [ ] D. 类型断言会在运行时比较两个对象是否相等。
- [ ] E. 只要运行时测试通过，就不需要测试公共 API 的类型约束。

**解释**：类型测试和运行时测试覆盖面不同。类型断言在类型检查阶段生效，不能替代业务运行时断言。

### Q3 multiple | 负向测试

为什么负向类型测试里更推荐 `@ts-expect-error` 而不是 `@ts-ignore`？

- [x] A. 如果下一行不再报错，`@ts-expect-error` 自己会报错。
- [x] B. 它能防止类型约束意外变松却没人发现。
- [x] C. 它适合为 bug 修复补“错误用法必须继续报错”的测试。
- [ ] D. 它会把运行时异常转换为编译错误。
- [ ] E. 它会让下一行永远跳过 emit。

**解释**：`@ts-expect-error` 是带期望的抑制。错误消失时测试失败，比无条件忽略更适合守住类型约束。

## ts-047

### Q1 single | 路径参数提取

`ParamNames<'/users/:id/posts/:postId'>` 应该提取出什么类型？

- [ ] A. `string`
- [x] B. `'id' | 'postId'`
- [ ] C. `{ id: string; postId: string }`
- [ ] D. `['id', 'postId']`

**解释**：`ParamNames` 只提取参数名联合；再由 `ParamsOf<Path>` 映射成 `{ id: string; postId: string }`。

### Q2 multiple | Link props 约束

类型安全路由的 `Link` 组件应约束哪些事情？

- [x] A. `to` 必须是路由表中存在的路径。
- [x] B. 含 `:id` 的路径必须传入对应 `params`。
- [x] C. 多个路径参数都要在 `params` 中提供。
- [x] D. search 参数类型应跟该路由定义绑定。
- [ ] E. 任意字符串路径都应允许，避免影响灵活性。

**解释**：路由类型系统的价值就是把路径、params、search 绑定到同一张路由表，减少拼错和漏传。

### Q3 multiple | 运行时边界

关于类型安全路由的运行时边界，哪些说法正确？

- [x] A. `buildPath` 仍要检查缺失参数并做 `encodeURIComponent`。
- [x] B. search 的 parse/stringify 最好配合 schema。
- [x] C. 嵌套路由、loader、权限、预加载和 code splitting 会让系统复杂很多。
- [ ] D. 模板字面量类型能自动编码 URL。
- [ ] E. 编译期 params 类型能保证服务端一定存在对应页面。

**解释**：类型约束能防止调用方漏参数，但 URL 拼接、编码、查询解析和路由实际存在都要由运行时和框架处理。

## ts-048

### Q1 single | unknown 的使用

为什么解析外部 JSON 时更推荐先返回 `unknown` 而不是 `any`？

- [ ] A. `unknown` 会自动推断 JSON 的真实字段。
- [x] B. `unknown` 能接收任意值，但使用前必须收窄，能逼迫边界校验。
- [ ] C. `unknown` 可以直接调用任意方法。
- [ ] D. `unknown` 在运行时比 `any` 更快。

**解释**：`unknown` 是安全的“我还不知道”。它不允许直接属性访问或调用，必须先通过守卫或 schema 收窄。

### Q2 multiple | 类型代数

哪些类型代数结果判断正确？

- [x] A. `string | never` 等价于 `string`。
- [x] B. `string & never` 等价于 `never`。
- [x] C. `unknown | string` 等价于 `unknown`。
- [x] D. `unknown & string` 等价于 `string`。
- [ ] E. `any & string` 会安全收窄成 `string`。

**解释**：`never` 是空集合，`unknown` 是安全顶层类型；`any` 会污染运算，`any & string` 仍表现为 `any`。

### Q3 multiple | never 场景

哪些是 `never` 的典型用途？

- [x] A. 表示永不正常返回的函数返回值。
- [x] B. 在 `assertNever` 中做可辨识联合穷尽检查。
- [x] C. 在条件类型中把联合成员过滤掉。
- [ ] D. 表示任意外部输入。
- [ ] E. 跳过所有类型检查。

**解释**：`never` 表示不可能存在的值。外部输入用 `unknown`，跳过检查的是 `any`。

## ts-049

### Q1 single | 注入 props

`withAuth<P extends InjectedAuthProps>` 返回组件时，为什么外部 props 通常写成 `Omit<P, keyof InjectedAuthProps>`？

- [ ] A. 因为 HOC 不会给子组件传任何 props。
- [x] B. 因为 `user`、`isAuthenticated` 由 HOC 注入，调用方不应再传。
- [ ] C. 因为 `Omit` 会在运行时删除 DOM 属性。
- [ ] D. 因为 React 组件不能接收布尔类型 prop。

**解释**：注入型 HOC 要隐藏被注入的 props，只让外部传剩余 props。内部组合 props 时可能需要一次受控断言。

### Q2 multiple | HOC 类型实践

哪些是 React HOC 的 TypeScript 实践要点？

- [x] A. 不改变 props 的 HOC 可用 `P extends object` 保留原 props。
- [x] B. 设置 `displayName` 有助于调试组件树。
- [x] C. HOC 默认不会自动复制静态属性，库场景可用 hoist 工具。
- [x] D. HOC 组合顺序会影响输入输出 props 类型。
- [ ] E. `React.FC` 是编写 HOC 泛型的唯一正确方式。

**解释**：HOC 的难点是 props 输入输出关系、调试名、静态属性和组合顺序。普通函数组件类型通常已经足够。

### Q3 multiple | ref 与 React 版本

关于 HOC 中的 ref，哪些说法正确？

- [x] A. React 18 兼容库通常仍使用 `forwardRef` 保留 ref。
- [x] B. React 19 支持把 `ref` 当普通 prop 传给函数组件，但生态兼容仍要考虑。
- [x] C. HOC 如果不转发 ref，外部拿到的可能是包装组件而不是内部组件实例或 DOM。
- [ ] D. ref 会像普通 props 一样自动穿透所有 HOC。
- [ ] E. TypeScript 类型能让未转发的 ref 在运行时自动生效。

**解释**：ref 不是普通 props 的简单自动传递。是否转发要在 HOC API 中明确设计并用类型表达。

## ts-050

### Q1 single | 静态字符串边界

类型系统解析 URL 查询字符串这类工具，最关键的限制是什么？

- [ ] A. 只能解析运行时从地址栏读到的任意字符串。
- [x] B. 主要对静态字面量字符串有效，运行时字符串通常只能得到宽泛 `string`。
- [ ] C. 只能解析数字，不能解析 key。
- [ ] D. 会自动进行 URL decode。

**解释**：模板字面量类型在编译期工作。真实用户输入、地址栏查询和 URL 解码都属于运行时问题。

### Q2 multiple | ParseQuery 机制

`ParseQuery<'name=Alice&age=30'>` 的实现通常会用到哪些类型技巧？

- [x] A. 用模板字面量类型按 `&` 拆分 Head 和 Tail。
- [x] B. 用 `PairToObject<'name=Alice'>` 生成 `{ name: 'Alice' }`。
- [x] C. 用联合转交叉把多个键值片段合并成对象。
- [x] D. 用 `Expand` 展开交叉结果，提升可读性。
- [ ] E. 用运行时 `URLSearchParams` 修改类型系统中的字符串。

**解释**：类型层解析靠字符串模式匹配和类型合并；`URLSearchParams` 是运行时工具，不能直接改变编译期字面量类型。

### Q3 multiple | 复杂语义

哪些场景不应该只依赖类型层字符串解析？

- [x] A. 重复 query key，例如 `tag=a&tag=b`。
- [x] B. URL 编码和解码。
- [x] C. 数组参数、空值、布尔值和数字转换。
- [x] D. 任意长度用户输入字符串。
- [ ] E. 静态路由参数名推导。

**解释**：复杂查询语义需要运行时代码和 schema 处理。静态路由参数名推导才是模板字面量类型的适合场景。

## ts-051

### Q1 single | `as const` + `satisfies`

为什么配置对象常写成 `as const satisfies Record<string, \`/${string}\`>`？

- [ ] A. `as const` 会跳过结构检查，`satisfies` 会把值拓宽为 `string`。
- [x] B. `as const` 保留字面量，`satisfies` 检查结构但不强行丢掉具体类型。
- [ ] C. 两者都会在运行时冻结对象。
- [ ] D. 这样可以自动生成路由文件。

**解释**：这是配置类型建模的常用组合：既保留具体值用于推导，又检查整体形状符合约束。

### Q2 multiple | strict 配置

哪些 TypeScript 配置或习惯能提升实战安全性？

- [x] A. 开启 `strict` 作为基本线。
- [x] B. 视项目情况启用 `noUncheckedIndexedAccess`。
- [x] C. 使用 `exactOptionalPropertyTypes` 更精确地区分缺失和 `undefined`。
- [x] D. 使用 `noImplicitOverride` 让 class override 更明确。
- [ ] E. 关闭所有严格选项，用更多单元测试弥补类型约束。

**解释**：严格配置能把很多边界问题提前暴露。测试很重要，但不应替代基础类型约束。

### Q3 multiple | 实战边界

关于 TypeScript 实战技巧，哪些判断正确？

- [x] A. 外部输入用 `unknown`，验证后进入业务类型。
- [x] B. 公共 API 和导出函数适合显式标注返回类型。
- [x] C. 品牌类型适合区分语义不同但结构相同的 ID、金额或单位。
- [x] D. 封装 `objectKeys<T>()` 本质仍是断言，要谨慎用于外部对象。
- [ ] E. 内部局部变量全部显式标注类型一定更好。

**解释**：TS 最好服务于边界和公共契约。内部局部变量通常让推断工作即可，过度标注反而增加噪音。

## ts-052

### Q1 single | catch unknown

为什么 `catch (error)` 在严格配置下应按 `unknown` 处理？

- [ ] A. 因为 JavaScript 只能 throw `Error` 对象。
- [x] B. 因为 JavaScript 可以 throw 任意值，不能假设一定有 `message`。
- [ ] C. 因为 `unknown` 会自动记录错误堆栈。
- [ ] D. 因为 TypeScript 会阻止所有 throw。

**解释**：`throw 'oops'`、`throw 123`、`throw { message: 'x' }` 都合法。使用前必须先收窄。

### Q2 multiple | 错误消息提取

一个健壮的 `getErrorMessage(error: unknown)` 可以包含哪些处理？

- [x] A. `error instanceof Error` 时返回 `error.message`。
- [x] B. `typeof error === 'string'` 时直接返回字符串。
- [x] C. 对带 `message` 字段的对象做结构检查，并确认 message 是 string。
- [x] D. 兜底使用 `String(error)`。
- [ ] E. 直接 `(error as Error).message`，如果没有就让它崩。

**解释**：unknown 的意义是先验证再使用。结构化 message 检查还能覆盖部分跨 realm 或反序列化错误。

### Q3 multiple | 业务错误处理

关于业务错误和 catch 策略，哪些做法合理？

- [x] A. 用 `AppError.is(error)` 这类守卫识别业务错误。
- [x] B. 无法识别的错误通常记录后重新抛出，避免吞掉程序错误。
- [x] C. 可预期业务失败也可以用 `Result<T, E>` 建模，而不是抛异常。
- [ ] D. 所有 catch 块都应该把错误转换成空字符串并继续。
- [ ] E. 只要继承 `Error`，跨 realm 判断就永远可靠。

**解释**：错误处理要区分业务失败和未知异常。`instanceof` 有边界，吞掉未知错误会让真正的问题隐藏起来。

## ts-053

### Q1 single | StringToUnion

`StringToUnion<'hello'>` 的结果里为什么只有一个 `'l'`？

- [ ] A. 因为递归会跳过重复字符。
- [x] B. 因为联合类型会天然去重。
- [ ] C. 因为 `infer` 不能识别连续字符。
- [ ] D. 因为 TypeScript 字符串类型只保留前三个字符。

**解释**：`'h' | 'e' | 'l' | 'l' | 'o'` 会归并成 `'h' | 'e' | 'l' | 'o'`，联合不表达重复次数。

### Q2 multiple | ReplaceAll

实现 `ReplaceAll<S, From, To>` 时，哪些细节正确？

- [x] A. 需要先处理 `From extends ''`，避免空字符串导致无限递归。
- [x] B. 可用 `S extends \`${infer Head}${From}${infer Tail}\`` 找到下一处匹配。
- [x] C. 替换后递归处理 `Tail`，直到没有匹配。
- [ ] D. 类型层 ReplaceAll 会修改运行时字符串值。
- [ ] E. `From` 为空时应该继续递归，这样能替换所有空位。

**解释**：空字符串能匹配任意位置，如果不保护会递归不止。类型工具只生成类型，不改变运行时值。

### Q3 multiple | CamelToSnake 边界

关于 `CamelToSnake`，哪些边界需要考虑？

- [x] A. PascalCase 开头不应生成前导下划线。
- [x] B. 连续大写缩写如 `URLParser` 需要额外规则定义期望结果。
- [x] C. `Uppercase`/`Lowercase` 可辅助判断字符是否为大写字母。
- [ ] D. 它能准确处理所有 Unicode 命名规则且没有性能成本。
- [ ] E. 字符串类型递归不会影响大型项目的类型检查速度。

**解释**：字符串类型体操适合有限静态 key 转换。缩写、Unicode 和递归深度都可能成为边界问题。

## ts-054

### Q1 single | Proxy 类型边界

为什么给 JavaScript `Proxy` 封装类型时，不能说 TypeScript 自动证明 trap 行为一定正确？

- [ ] A. 因为 Proxy 不能在 TypeScript 项目里使用。
- [x] B. 因为 Proxy 是运行时拦截机制，类型只能描述对外 API，trap 逻辑仍要自己保证。
- [ ] C. 因为 `Proxy` 的 key 一定只可能是 `keyof T`。
- [ ] D. 因为所有代理对象都会丢失原型。

**解释**：类型描述和运行时行为是两层。trap 里返回什么、是否校验、是否缓存，都需要实现保证。

### Q2 multiple | readonlyProxy

关于深只读代理示例，哪些说法正确？

- [x] A. 返回类型可声明为 `DeepReadonly<T>`，表达外部不可写。
- [x] B. `set` 和 `deleteProperty` trap 应在运行时阻止写入和删除。
- [x] C. `get` 中遇到对象可递归包一层 readonly proxy。
- [ ] D. 只写 `DeepReadonly<T>` 类型就能阻止所有运行时写入。
- [ ] E. `Function`、`Date`、`RegExp` 等一般应像普通对象一样继续深展开。

**解释**：只读类型是静态约束，真正阻止写入要靠 trap。特殊对象通常不应按普通 plain object 深展开。

### Q3 multiple | PropertyKey 与验证

封装校验代理时，哪些细节值得注意？

- [x] A. Proxy trap 的 key 是 `PropertyKey`，可能是 string、number 或 symbol。
- [x] B. 访问 validators 时通常需要把 key 收窄或断言为 `keyof T`。
- [x] C. TypeScript 类型不能阻止反射或外部 JS 在运行时写入非法值，所以 trap 里要校验。
- [x] D. 代理返回值如果改变语义，如 readonly 或 lazy loading，应在返回类型中表达。
- [ ] E. 使用 `value is T[K]` 后，运行时就不需要调用 validator。

**解释**：类型守卫函数本身是运行时代码，必须实际调用才有校验效果。Proxy 的 key 和返回语义都要显式处理。

## ts-055

### Q1 single | BuildTuple 保护

`BuildTuple<N>` 中为什么常写 `number extends N ? unknown[] : ...`？

- [ ] A. 为了让所有数字都变成 `never`。
- [x] B. 为了避免传入宽泛 `number` 时无限递归或过深实例化。
- [ ] C. 为了把负数转换成正数。
- [ ] D. 为了让元组长度在运行时同步更新。

**解释**：类型级加法只适合数字字面量。宽泛 `number` 没有固定终点，递归构造元组会失控。

### Q2 multiple | 元组长度运算

哪些说法正确描述了类型级四则运算的基本思路？

- [x] A. `Add<A, B>` 可用 `[...BuildTuple<A>, ...BuildTuple<B>]['length']`。
- [x] B. `Subtract<A, B>` 可通过匹配 `BuildTuple<A>` 的前缀 `BuildTuple<B>` 得到剩余长度。
- [x] C. `Multiply<A, B>` 可以重复把 `BuildTuple<A>` 拼到累积元组里。
- [ ] D. 这套方法天然支持负数、小数和任意大整数。
- [ ] E. 元组长度类型会在运行时创建同样大小的数组。

**解释**：这些都是编译期类型计算，不创建运行时数组。它适合小的非负整数数字字面量。

### Q3 multiple | 生产限制

关于类型级加法和图灵完备性，哪些判断正确？

- [x] A. 它展示了 TS 类型系统表达能力很强。
- [x] B. 大数和深递归会让编辑器变慢或触发类型实例化深度限制。
- [x] C. 固定长度数组是相对实际的应用场景之一。
- [x] D. 生产代码应优先考虑可读性和编译性能。
- [ ] E. 因为类型系统图灵完备，所以业务计算都应该搬到类型层完成。

**解释**：类型级计算是工具，不是目标。能表达不代表适合大量用于业务逻辑。生产代码要克制。 
