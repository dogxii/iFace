# Go基础

<!-- id: go-basics-001; difficulty: 1; tags: 变量, Go基础; source: 高频 -->
# Go 中 `var` 声明和 `:=` 短变量声明有什么区别？

### var 声明
`var` 是完整变量声明语法，函数内和包级作用域都能用。

```go
var x int          // 零值初始化，x == 0
var y int = 10     // 显式类型 + 初始化
var z = 10         // 类型推断，z 是 int
var a, b int       // 多变量声明
```

包级变量只能用 `var`，不能用 `:=`。

### := 短变量声明
`:=` 只能在函数内部使用，并且左侧至少要有一个新变量。

```go
x := 10
name, age := "Alice", 18
```

同一作用域内允许“部分重声明”：

```go
n, err := strconv.Atoi("42")
value, err := readValue() // value 是新变量，err 是重新赋值
```

如果左侧没有任何新变量，会编译失败。

### 核心区别
| 特性 | var | := |
|---|---|---|
| 作用域 | 函数内、包级 | 只能函数内 |
| 零值声明 | 可以 | 不可以，必须初始化 |
| 类型标注 | 可以显式写 | 只能由右侧推断 |
| 部分重声明 | 不适用 | 同一作用域至少一个新变量 |

### 常见坑
```go
err := doSomething()
if err := doAnotherThing(); err != nil {
    return err // 这里的 err 是 if 语句内的新变量
}
_ = err // 外层 err 没变
```

`:=` 在 `if/for/switch` 的短语句或内部块中容易遮蔽外部变量。工程中遇到错误处理和状态变量时要特别注意。

<!-- id: go-basics-002; difficulty: 1; tags: 变量, Go基础; source: 高频 -->
# Go 中空白标识符 `_` 有哪些使用场景？

空白标识符 `_` 表示“这里需要一个标识符位置，但我不需要这个值”。它不会引入可使用的变量，也能避免未使用变量的编译错误。

### 忽略多返回值
```go
n, err := strconv.Atoi("42")
_ = n
_ = err

_, ok := m["key"] // 只关心 key 是否存在
```

忽略 error 要谨慎，通常只有在错误确实无意义或已经通过其他方式保证不会发生时才这么做。

### range 中忽略索引或值
```go
for _, v := range values {
    fmt.Println(v)
}

for i := range values { // 比 for i, _ := range values 更简洁
    fmt.Println(i)
}
```

### 副作用导入
```go
import _ "net/http/pprof"
import _ "image/png"
```

这种导入只执行目标包的 `init`，常用于注册驱动、解码器或调试端点。

### 编译期接口实现检查
```go
var _ io.Writer = (*MyWriter)(nil)
```

如果 `*MyWriter` 没有实现 `io.Writer`，这一行会编译失败。

### 明确丢弃结果
```go
_ = os.Remove(path)
```

这比留下未使用返回值更明确，但团队应约定哪些错误允许忽略，避免隐藏生产问题。

<!-- id: go-basics-003; difficulty: 2; tags: 变量, iota; source: 高频 -->
# 请说明 `iota` 的用法，以及它在 `const` 块中的行为规则。

`iota` 是 Go 的预声明标识符，只能在常量声明中使用。它表示当前 `const` 声明中第几个常量规格，默认从 0 开始。

### 基本用法
```go
const (
    A = iota // 0
    B        // 1，省略表达式时重复上一行表达式
    C        // 2
)
```

### 位移常量
```go
const (
    _  = iota
    KB = 1 << (10 * iota) // 1 << 10
    MB                    // 1 << 20
    GB                    // 1 << 30
)
```

省略表达式时，Go 会复用上一条常量规格的表达式，但 `iota` 会按当前行重新取值。

### 同一行共享 iota
```go
const (
    A, B = iota, iota * 2 // 0, 0
    C, D                  // 1, 2
    E, F                  // 2, 4
)
```

### 中断不会重置
```go
const (
    P = iota // 0
    Q = 100  // iota 仍然是 1，只是没使用
    R = iota // 2
)
```

新的 `const` 声明会重新从 0 开始：

```go
const X = iota // 0
const Y = iota // 0
```

### 规则总结
1. 每个 `const` 声明内从 0 开始。
2. 每个 ConstSpec 行递增一次。
3. 同一行多个常量共享同一个 `iota`。
4. 省略表达式会复用上一行表达式，但 `iota` 用当前行的值。

<!-- id: go-basics-004; difficulty: 1; tags: 类型, Go基础; source: 高频 -->
# Go 中 `byte`、`rune`、`string` 的区别是什么？

### byte
`byte` 是 `uint8` 的别名，表示一个字节，适合处理二进制数据、ASCII、网络协议缓冲区。

```go
var b byte = 65
fmt.Printf("%c\n", b) // A
```

### rune
`rune` 是 `int32` 的别名，表示一个 Unicode code point。一个用户感知的字符不一定等于一个 rune，例如带组合符号的字符和部分 emoji 可能由多个 code point 组成。

```go
var r rune = '中'
fmt.Println(r) // 20013
```

### string
Go 的 `string` 是不可变的字节序列，不是 `[]byte`。可以把 string 转成 `[]byte` 或 `[]rune`，但转换通常会产生拷贝。

```go
s := "Hello, 世界"

fmt.Println(len(s))         // 13，字节数
fmt.Println(len([]rune(s))) // 9，rune 数
```

### 遍历差异
```go
for i := 0; i < len(s); i++ {
    fmt.Printf("%x ", s[i]) // 按字节遍历，s[i] 是 byte
}

for i, r := range s {
    fmt.Printf("%d: %c\n", i, r) // 按 UTF-8 解码后的 rune 遍历，i 是字节下标
}
```

### 转换
```go
bs := []byte(s) // 文本的 UTF-8 字节
rs := []rune(s) // Unicode code points

s1 := string(byte('A'))
s2 := string(rune('中'))
```

### 总结
| 类型 | 本质 | 常见用途 |
|---|---|---|
| `byte` | `uint8` | 二进制、ASCII、单字节处理 |
| `rune` | `int32` | Unicode code point |
| `string` | 不可变字节序列 | UTF-8 文本、只读数据 |

<!-- id: go-basics-005; difficulty: 2; tags: 类型, Go基础; source: 高频 -->
# Go 中整数类型有哪些？`int` 和 `int32` 有什么区别？类型转换需要注意什么？

### 整数类型
```text
有符号：int8, int16, int32, int64, int
无符号：uint8, uint16, uint32, uint64, uint, uintptr
别名：byte = uint8, rune = int32
```

`uintptr` 主要用于 unsafe 场景，不应当成普通整数保存指针生命周期。

### int 和 int32
- `int` 宽度依赖目标平台，通常在 32 位平台是 32 位，在 64 位平台是 64 位。
- `int32` 固定 32 位，跨平台一致。
- Go 不做隐式数值类型转换，即使底层宽度相同也不能直接赋值。

```go
var a int = 10
var b int32
b = int32(a)
```

### 转换注意事项
#### 1. 整数窄化会截断
```go
var x int64 = 300
fmt.Println(int8(x)) // 44
```

Go 对非常量整数转换不会报溢出错误，结果按目标类型宽度截断。

#### 2. 有符号和无符号转换只改变解释方式
```go
var u uint8 = 255
fmt.Println(int8(u)) // -1
```

#### 3. 浮点转整数会截断小数
```go
fmt.Println(int(3.9))  // 3
fmt.Println(int(-3.9)) // -3
```

如果浮点值超出目标整数范围，结果依赖实现，不要依赖这种转换。

#### 4. 常量转换更严格
```go
const n = 300
var x int8 = n // 编译错误：constant 300 overflows int8
```

#### 5. 字符串和数字转换用 strconv
```go
s := strconv.Itoa(42)
n, err := strconv.Atoi("42")
_ = err

fmt.Println(string(65)) // "A"，这是 code point 转 string，不是数字格式化
```

<!-- id: go-basics-006; difficulty: 1; tags: 切片, Go基础; source: 高频 -->
# Go 中 array（数组）和 slice（切片）有什么区别？

### 数组（array）
数组长度固定，长度是类型的一部分：`[3]int` 和 `[4]int` 是不同类型。数组是值，赋值和传参会复制整个数组。

```go
a := [3]int{1, 2, 3}
b := a
b[0] = 100
fmt.Println(a[0]) // 1
```

数组元素类型可比较时，数组也可以用 `==` 比较。

### 切片（slice）
切片是一个描述符，包含指向底层数组的指针、长度和容量。切片本身按值传递，但复制切片描述符后通常仍共享同一个底层数组。

```go
s := []int{1, 2, 3}
t := s
t[0] = 100
fmt.Println(s[0]) // 100
```

简化理解：

```go
type slice struct {
    ptr unsafe.Pointer
    len int
    cap int
}
```

### nil slice 和空 slice
```go
var a []int          // nil slice, len=0, cap=0
b := []int{}         // non-nil empty slice
c := make([]int, 0)  // non-nil empty slice
```

多数场景下它们都能 `append`，但 JSON 编码、nil 判断等行为可能不同。

### 对比
| 维度 | array | slice |
|---|---|---|
| 长度 | 固定，属于类型 | 可变 |
| 赋值/传参 | 复制所有元素 | 复制 slice 头，底层数组共享 |
| 比较 | 元素可比较时可比较 | 只能和 nil 比较 |
| 零值 | 元素零值数组 | nil |
| 常用场景 | 固定长度数据、值语义 | 动态序列、函数参数 |

<!-- id: go-basics-007; difficulty: 2; tags: 切片, Go基础; source: 高频 -->
# 请详细解释 Go 切片的扩容机制，`append` 时发生了什么？

### append 的基本行为
`append` 会返回新的 slice 头，调用方必须接住返回值。

```go
s = append(s, x)
```

如果容量足够，`append` 直接写入原底层数组；如果容量不足，会分配更大的底层数组，把旧元素复制过去，再返回指向新数组的 slice。

```go
s := make([]int, 3, 3)
s2 := append(s, 4) // 扩容
s[0] = 100
fmt.Println(s2[0]) // 0，s2 已经指向新数组
```

### 扩容策略
当前 Go 运行时的大致策略是：小切片容量通常翻倍；容量较大后增长比例逐步降低，趋近约 1.25 倍。实际容量还会受元素大小、内存规格和对齐影响，所以不要依赖精确 cap 数值写业务逻辑。

```go
s := make([]int, 0)
for i := 0; i < 10; i++ {
    s = append(s, i)
    fmt.Println(len(s), cap(s))
}
```

### 共享底层数组陷阱
```go
a := []int{1, 2, 3, 4, 5}
b := a[:3]         // len=3, cap=5
b = append(b, 100) // 未超过 cap，写入 a[3]
fmt.Println(a)     // [1 2 3 100 5]
```

### 隔离方式
三索引切片限制容量：

```go
b := a[:3:3]
b = append(b, 100) // 必然分配新底层数组
```

或者显式复制：

```go
b := append([]int(nil), a[:3]...)
// 或
b := make([]int, 3)
copy(b, a[:3])
```

### 实战建议
已知最终长度时，用 `make([]T, 0, n)` 预分配容量，减少扩容和复制。函数内部 `append` 后要返回新切片，因为底层数组可能已经变化。

<!-- id: go-basics-008; difficulty: 2; tags: 切片, Go基础; source: 高频 -->
# `copy` 函数的行为是什么？有哪些注意事项？

### copy 语法
```go
n := copy(dst, src)
```

`copy` 返回实际复制的元素个数，数量是 `min(len(dst), len(src))`。

```go
src := []int{1, 2, 3, 4, 5}
dst := make([]int, 3)
n := copy(dst, src)
fmt.Println(dst, n) // [1 2 3] 3
```

### dst 必须有长度
```go
var dst []int
n := copy(dst, src)
fmt.Println(n) // 0

clone := make([]int, len(src))
copy(clone, src)
```

`copy` 写入的是 `dst[:len(dst)]`，只设置容量不够：

```go
dst := make([]int, 0, len(src))
copy(dst, src) // 0，因为 len(dst)==0
```

### 支持重叠复制
```go
s := []int{1, 2, 3, 4, 5}
copy(s[1:], s[:3])
fmt.Println(s) // [1 1 2 3 5]
```

`copy` 能正确处理源和目标重叠。它只是复制元素，不保证复制后两个切片不共享底层数组；是否共享取决于 `dst` 怎么来的。

### string 到 []byte
```go
buf := []byte("hello")
n := copy(buf, "world")
fmt.Println(string(buf), n) // world 5
```

特殊规则是源可以是 string、目标是 `[]byte`。

### 删除元素
```go
s := []int{1, 2, 3, 4, 5}
i := 2
copy(s[i:], s[i+1:])
s = s[:len(s)-1]
```

如果元素持有指针且切片长期存在，删除后可把最后一个元素置零，帮助 GC 回收。

<!-- id: go-basics-009; difficulty: 1; tags: map, Go基础; source: 高频 -->
# Go 中 map 如何初始化？直接声明和 make 有什么区别？

### nil map
```go
var m map[string]int

fmt.Println(m == nil) // true
fmt.Println(len(m))   // 0
fmt.Println(m["x"])   // 0，读 nil map 安全

m["x"] = 1 // panic: assignment to entry in nil map
```

nil map 可以读、查、删，但不能写。

### 字面量初始化
```go
m := map[string]int{
    "apple":  5,
    "banana": 3,
}
```

### make 初始化
```go
m := make(map[string]int)
m2 := make(map[string]int, 100) // 容量 hint，不是固定容量
```

map 的容量 hint 用于减少扩容成本，不能用 `cap(m)` 查询，也不是上限。

### 常用操作
```go
v := m["key"]
v, ok := m["key"] // 区分不存在和零值

delete(m, "key") // key 不存在也安全
clear(m)         // 清空整个 map
```

### 注意事项
- map 的 key 类型必须可比较，slice、map、function 不能做 key。
- map value 不是可寻址值，不能写 `&m[k]`，也不能直接修改 `m[k].Field`。
- 需要修改结构体字段时，取出副本、修改、再放回，或把 value 存成指针。
- map 不是并发安全容器，并发写入要加锁或使用 `sync.Map`。

<!-- id: go-basics-010; difficulty: 2; tags: map, Go基础; source: 高频 -->
# 为什么 Go 的 map 并发不安全？如何安全地并发使用 map？

### 哪些并发访问不安全
多个 goroutine 只读同一个 map 是安全的；只要存在并发写，或读写并发，就不安全。

```go
m := map[int]int{}

go func() {
    for { m[1] = 1 }
}()
go func() {
    for { _ = m[1] }
}()
```

运行时可能报 `fatal error: concurrent map read and map write` 或 `concurrent map writes`。这不是普通 panic，不能指望 recover。即使没触发 fatal，也已经是数据竞争，`go test -race` 能帮助发现。

### 原因
map 底层是哈希表，会有桶、溢出桶、扩容和渐进搬迁。并发写或读写会破坏内部状态，也违反 Go 内存模型。

### 方案一：map + sync.RWMutex
```go
type SafeMap[K comparable, V any] struct {
    mu sync.RWMutex
    m  map[K]V
}

func NewSafeMap[K comparable, V any]() *SafeMap[K, V] {
    return &SafeMap[K, V]{m: make(map[K]V)}
}

func (s *SafeMap[K, V]) Get(key K) (V, bool) {
    s.mu.RLock()
    defer s.mu.RUnlock()
    v, ok := s.m[key]
    return v, ok
}

func (s *SafeMap[K, V]) Set(key K, value V) {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.m[key] = value
}
```

这是最通用、类型安全、可维护的方案。

### 方案二：sync.Map
```go
var sm sync.Map
sm.Store("key", 42)
value, ok := sm.Load("key")
sm.Delete("key")
```

`sync.Map` 适合两类场景：写一次读多次的缓存，或多个 goroutine 操作互不相交的 key 集合。普通业务 map 不要默认上 `sync.Map`，因为它牺牲了静态类型，也有额外复杂度。

### 方案三：单 goroutine 拥有 map
通过 channel 把所有操作发送给一个 goroutine，让它独占 map。这适合需要串行化状态变更的 actor 风格设计。

<!-- id: go-basics-011; difficulty: 1; tags: map, Go基础; source: 高频 -->
# Go map 的遍历顺序是什么？为什么？

### 结论
Go 规范只保证：map 的 `range` 遍历顺序**未指定**，不能依赖稳定顺序。实际运行时为了暴露错误依赖，会使用随机哈希种子、随机起始位置等策略，所以同一个 map 在不同进程、不同迭代之间都可能顺序不同。

```go
m := map[string]int{"a": 1, "b": 2, "c": 3}
for k, v := range m {
    fmt.Printf("%s: %d\n", k, v)
}
// 输出顺序不可作为业务逻辑依据
```

### 为什么这样设计
- map 是哈希表，桶布局会受哈希种子、扩容、删除和插入影响
- 规范不承诺顺序，运行时可以自由优化实现
- 如果程序依赖遍历顺序，换 Go 版本、换机器或数据规模变化都可能出 bug

### 遍历期间修改 map
- 删除尚未遍历到的 key：该元素不会再被产出
- 新增 key：可能被遍历到，也可能不会
- nil map：遍历 0 次

### 需要稳定顺序时
先取出 key，再排序，然后按 key 访问：

```go
import "sort"

m := map[string]int{"banana": 2, "apple": 5, "cherry": 1}
keys := make([]string, 0, len(m))
for k := range m {
    keys = append(keys, k)
}
sort.Strings(keys)

for _, k := range keys {
    fmt.Printf("%s: %d\n", k, m[k])
}
```

非字符串 key 可用 `sort.Slice` 或 Go 1.21+ 的 `slices.SortFunc` 定义排序规则。

<!-- id: go-basics-012; difficulty: 1; tags: 结构体, Go基础; source: 高频 -->
# Go struct 如何定义？什么是嵌入（embedding）？有什么特点？

### 基本定义
```go
type Person struct {
    Name string `json:"name"`
    Age  int
    addr string // 小写，包内可见
}

p1 := Person{Name: "Alice", Age: 30} // 推荐：按字段名初始化
p2 := Person{"Bob", 25, "北京"}       // 按字段顺序，字段变化时更脆弱
var p3 Person                        // 各字段零值：{"", 0, ""}
p4 := &Person{Name: "Carol"}        // 取结构体指针
```

### 嵌入（Embedding）
嵌入是结构体的**匿名字段**：字段声明只写类型，不显式写字段名。被嵌入类型的字段和方法会被提升到外层，方便选择器访问，但数据仍然存放在内层字段里。

```go
type Animal struct {
    Name string
}

func (a Animal) Speak() string { return a.Name + " speaks" }

type Dog struct {
    Animal // 字段名默认为 Animal
    Breed  string
}

d := Dog{Animal: Animal{Name: "Rex"}, Breed: "Labrador"}
fmt.Println(d.Name)    // 等价于 d.Animal.Name
fmt.Println(d.Speak()) // 等价于 d.Animal.Speak()
```

### 关键特点
- Go 没有类继承，嵌入是组合；外层类型不会变成内层类型
- 外层同名字段或方法会遮蔽内层；同一深度出现重名会产生歧义，必须显式写路径
- 可以嵌入 `T` 或 `*T`；嵌入指针能避免复制，但要处理 nil
- 可以嵌入接口，用于把一组方法提升到外层类型
- 方法提升会影响外层类型的方法集，从而影响它是否实现某个接口

```go
type MyWriter struct {
    io.Writer // 嵌入接口，MyWriter 提升 Write 方法
}
```

<!-- id: go-basics-013; difficulty: 2; tags: 结构体, 指针; source: 高频 -->
# Go 中值接收者和指针接收者有什么区别？如何选择？

### 基本区别
```go
type Counter struct{ count int }

func (c Counter) Value() int { // 值接收者：接收者被复制
    return c.count
}

func (c *Counter) Increment() { // 指针接收者：可修改原对象
    c.count++
}
```

```go
c := Counter{}
c.Increment()        // c 可寻址，编译器自动改写为 (&c).Increment()
fmt.Println(c.Value()) // 1
```

值接收者拿到的是副本；指针接收者拿到的是地址。注意自动取地址只对**可寻址**的值成立，`m["x"].Increment()` 这类 map 元素不行，因为 map 元素不可寻址。

### 方法集规则（影响接口实现）
| 类型 | 方法集 |
|------|--------|
| `T` | 只有接收者为 `T` 的方法 |
| `*T` | 接收者为 `T` 和 `*T` 的方法 |

```go
type Stringer interface{ String() string }
func (c *Counter) String() string { return fmt.Sprintf("%d", c.count) }

var _ Stringer = &Counter{} // OK
var _ Stringer = Counter{}  // 编译错误：Counter 的方法集没有 String
```

接口赋值看的是方法集，不会因为普通调用时可以自动取地址，就让 `T` 自动实现需要 `*T` 方法的接口。

### 如何选择
优先选指针接收者：
- 方法需要修改接收者状态
- 接收者较大，复制成本明显
- 类型包含 `sync.Mutex`、`sync.Once` 等不能复制的字段
- 同一类型已经有指针接收者，保持一致通常更清晰

适合值接收者：
- 小型、不可变、复制语义明确的类型，例如 `time.Time` 风格的值对象
- 方法只读且复制成本低
- 希望调用者拿到的是快照语义

map、slice、channel 作为字段或别名类型时要谨慎：值接收者只复制描述符，仍可能修改底层数据；但重新赋值、`append` 后的新 slice 头不会自动写回调用方。

<!-- id: go-basics-014; difficulty: 2; tags: 接口, Go基础; source: 高频 -->
# Go 接口是如何实现的？什么是隐式实现？

### 接口定义
```go
type Animal interface {
    Sound() string
    Move() string
}
```

### 隐式实现
Go 的接口实现是**隐式的**：只要一个类型的方法集包含接口要求的全部方法，它就实现了该接口，不需要 `implements` 声明。

```go
type Dog struct{ Name string }

func (d Dog) Sound() string { return "汪汪" }
func (d Dog) Move() string  { return "跑" }

var a Animal = Dog{Name: "旺财"} // Dog 自动实现 Animal
fmt.Println(a.Sound())
```

如果方法都是值接收者，`Dog` 和 `*Dog` 都实现接口；如果方法是指针接收者，通常只有 `*Dog` 实现接口。

### 接口值的组成
概念上，接口值由**动态类型**和**动态值**组成：

```go
var a Animal       // (nil, nil)，接口零值
a = Dog{"Rex"}     // (Dog, Dog{Name: "Rex"})，有类型有值

var d *Dog = nil
a = d              // (*Dog, nil)，接口本身不是 nil
fmt.Println(a == nil) // false
```

这就是常见的 nil 接口陷阱：只有动态类型和动态值都为 nil 时，接口值才等于 nil。

### 编译时接口检查
```go
var _ Animal = Dog{}       // 检查 Dog 是否实现 Animal
var _ Animal = (*Dog)(nil) // 检查 *Dog 是否实现 Animal
```

这种写法不生成运行时代码，但能让接口兼容性问题提前在编译期暴露。

### 额外注意
- 接口比较要求动态值可比较；如果动态值是 slice、map、func，直接比较接口值会 panic
- 接口应尽量小，调用方按行为定义接口，比在生产方提前定义大接口更灵活

<!-- id: go-basics-015; difficulty: 2; tags: 接口, Go基础; source: 高频 -->
# Go 中类型断言和类型 switch 的使用方式是什么？

### 类型断言（Type Assertion）
类型断言只能用于接口类型表达式，用来取出接口中的动态值。

```go
var x any = "hello"

s := x.(string)      // 成功，s 是 string
n := x.(int)         // 失败会 panic
s, ok := x.(string)  // comma-ok 写法，失败时 ok=false，不 panic
```

断言目标既可以是具体类型，也可以是接口类型：

```go
var v any = bytes.NewBuffer(nil)
r, ok := v.(io.Reader) // 判断动态类型是否实现 io.Reader
```

### 类型 switch（Type Switch）
适合对多个可能的动态类型分支处理：

```go
func describe(x any) {
    switch v := x.(type) {
    case nil:
        fmt.Println("nil")
    case int:
        fmt.Printf("int: %d\n", v)       // v 是 int
    case string:
        fmt.Printf("string: %q\n", v)   // v 是 string
    case []int:
        fmt.Printf("[]int len=%d\n", len(v))
    case io.Reader:
        fmt.Println("reader")
    default:
        fmt.Printf("unknown: %T\n", v)
    }
}
```

### 注意事项
- `any` 是 `interface{}` 的别名，Go 1.18+ 引入，语义完全相同
- 直接断言用于确定类型的场景；外部输入、反序列化结果通常用 comma-ok
- 多类型合并 case 时，变量的静态类型仍是 switch 表达式的接口类型：`case int, string:` 中的 `v` 是 `any`
- 类型 switch 匹配的是接口的动态类型；nil 接口会进入 `case nil`

<!-- id: go-basics-016; difficulty: 1; tags: 函数, Go基础; source: 高频 -->
# Go 函数支持多返回值，如何使用具名返回值？有什么优缺点？

### 多返回值
Go 函数可以返回多个值，最常见的是 `(value, error)`：

```go
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}

result, err := divide(10, 2)
if err != nil {
    return err
}
_ = result
```

### 具名返回值
在签名中给返回值命名后，它们会在函数进入时初始化为零值，并在函数体内作为普通局部变量使用：

```go
func minMax(nums []int) (min int, max int, ok bool) {
    if len(nums) == 0 {
        return 0, 0, false
    }
    min, max = nums[0], nums[0]
    for _, v := range nums[1:] {
        if v < min { min = v }
        if v > max { max = v }
    }
    return min, max, true // 显式返回更清晰
}
```

裸 `return` 会返回当前具名返回值，但只建议在很短的函数里使用。

### 典型用途：defer 修改返回错误
```go
func readFile(path string) (data []byte, err error) {
    f, err := os.Open(path)
    if err != nil {
        return nil, err
    }
    defer func() {
        if cerr := f.Close(); cerr != nil && err == nil {
            err = cerr
        }
    }()

    data, err = io.ReadAll(f)
    return data, err
}
```

### 优缺点
优点：
- 返回值名称有文档作用，尤其是多个同类型返回值
- defer 可以读取或修改最终返回值，常用于补充 close/rollback 错误

缺点：
- 裸返回会降低可读性，大函数里容易误读当前返回值
- 变量遮蔽会制造陷阱，例如内层 `err := ...` 可能遮住具名 `err`
- 不要为了省几行代码滥用具名返回值；公共 API 更应看重清晰性

<!-- id: go-basics-017; difficulty: 1; tags: 函数, Go基础; source: 高频 -->
# Go 中可变参数函数（variadic）如何定义和调用？

### 定义和调用
可变参数必须放在参数列表最后，函数内部看到的是一个切片：

```go
func sum(nums ...int) int {
    total := 0
    for _, n := range nums {
        total += n
    }
    return total
}

fmt.Println(sum())          // 0
fmt.Println(sum(1, 2, 3))   // 6

nums := []int{1, 2, 3, 4}
fmt.Println(sum(nums...))   // 展开切片
```

```go
func f(prefix string, args ...int) {} // OK
func g(args ...int, suffix string) {} // 编译错误：可变参数必须最后
```

### 切片展开的语义
用 `s...` 展开时，传入的 variadic 参数和原切片共享同一个底层数组：

```go
func modify(nums ...int) {
    nums[0] = 999
}

s := []int{1, 2, 3}
modify(s...)
fmt.Println(s[0]) // 999
```

如果函数会修改元素，要在文档或命名上明确，或者在函数内部先 `append([]T(nil), nums...)` 复制。

### 与 any 的常见坑
```go
func Println(a ...any) (n int, err error)
```

`[]string` 不能直接作为 `...any` 展开，因为 `[]string` 不是 `[]any`。需要逐个转换：

```go
ss := []string{"a", "b"}
args := make([]any, len(ss))
for i, s := range ss {
    args[i] = s
}
fmt.Println(args...)
```

### 实用模式：函数式选项
```go
type Option func(*Server)

func WithPort(port int) Option {
    return func(s *Server) { s.port = port }
}

func NewServer(opts ...Option) *Server {
    s := &Server{port: 8080}
    for _, opt := range opts {
        opt(s)
    }
    return s
}
```

<!-- id: go-basics-018; difficulty: 2; tags: defer, Go基础; source: 高频 -->
# 请详细说明 `defer` 的执行顺序和核心特性。

### 执行顺序：LIFO
`defer` 注册的调用会在**当前函数返回前**执行，顺序是后进先出：

```go
func main() {
    defer fmt.Println("first")
    defer fmt.Println("second")
    defer fmt.Println("third")
}
// third
// second
// first
```

它不是块级作用域，放在 `for` 或 `if` 里也要等外层函数返回才执行。

### 参数和接收者立即求值
`defer` 语句执行时，函数值、接收者和参数都会立即求值；真正的函数调用延迟到返回前：

```go
x := 10
defer fmt.Println(x) // 保存 10
x = 20               // 最后仍输出 10
```

闭包则不同，闭包体里的变量读取发生在闭包执行时：

```go
x := 10
defer func() { fmt.Println(x) }()
x = 20 // 最后输出 20
```

### 与具名返回值交互
```go
func double(x int) (result int) {
    defer func() { result *= 2 }()
    return x // 先把 x 赋给 result，再执行 defer，最终返回 2*x
}
```

### 常见用途
```go
f, err := os.Open("file.txt")
if err != nil { return err }
defer f.Close()

mu.Lock()
defer mu.Unlock()

start := time.Now()
defer func() { log.Println(time.Since(start)) }()
```

### 注意事项
- 循环中 `defer` 会积累到函数结束，长循环里应提取小函数或手动释放
- `defer` 中若要覆盖返回错误，需要使用具名返回值或显式变量
- Go 1.14 起简单 defer 有 open-coded 优化，普通资源释放场景不必为了微小开销牺牲可读性

<!-- id: go-basics-019; difficulty: 3; tags: defer, panic; source: 高频 -->
# `defer`、`panic`、`recover` 三者如何配合工作？请给出完整示例并说明执行流程。

### 基本概念
- `panic`：让当前 goroutine 进入 panicking 状态，停止当前控制流，开始展开调用栈
- `defer`：栈展开时，每一层已注册的 defer 都会按 LIFO 执行
- `recover`：只能在同一 goroutine 的 deferred function 中直接调用，才能截获正在传播的 panic

### 示例
```go
func safeDiv(a, b int) (result int, err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("panic while dividing: %v", r)
        }
    }()

    result = a / b // b == 0 时 panic
    return result, nil
}

func main() {
    n, err := safeDiv(10, 0)
    fmt.Println(n, err) // 0 panic while dividing: runtime error: integer divide by zero
}
```

执行流程：`a / b` panic → 执行 `safeDiv` 的 defer → `recover` 拿到 panic 值并给 `err` 赋值 → `safeDiv` 正常返回。recover 后不会回到 panic 发生的那一行继续执行。

### recover 的限制
```go
func bad() {
    recover()      // 不在 defer 中，返回 nil
    panic("boom")
}

func alsoBad() {
    defer func() {
        func() { recover() }() // 不是 deferred function 直接调用，不能恢复
    }()
    panic("boom")
}

go func() {
    panic("boom") // 只能由这个 goroutine 自己的 defer recover
}()
```

### 使用边界
- 普通业务失败应返回 `error`，不要用 panic 做正常控制流
- panic 适合不可继续的程序错误，例如越界、nil 指针、违反内部不变量
- recover 适合放在框架边界，例如 HTTP middleware、任务调度器、goroutine worker 顶层
- 一些运行时 fatal error（如 concurrent map writes）不能当作普通 panic 可靠 recover

<!-- id: go-basics-020; difficulty: 1; tags: error, Go基础; source: 高频 -->
# Go 中 `error` 是什么？如何创建和处理 error？

### error 是什么
`error` 是内置接口类型，错误是普通值，不是异常：

```go
type error interface {
    Error() string
}
```

任何实现 `Error() string` 的类型都可以作为 error。

### 创建 error
```go
var ErrNotFound = errors.New("not found")

err := fmt.Errorf("user %d not found", userID)

type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation error: %s: %s", e.Field, e.Message)
}
```

### 处理 error
标准模式是立即检查，并在向上传递时补充上下文：

```go
user, err := repo.FindUser(id)
if err != nil {
    return nil, fmt.Errorf("find user %d: %w", id, err)
}
return user, nil
```

用 `%w` 包裹后，调用方仍可用 `errors.Is` 或 `errors.As` 判断根因：

```go
if errors.Is(err, ErrNotFound) {
    return http.StatusNotFound
}

var ve *ValidationError
if errors.As(err, &ve) {
    log.Println(ve.Field)
}
```

### 实践要点
- 不要忽略 error，除非明确说明为什么可以忽略
- 不要靠字符串比较判断错误类型，用 sentinel error、类型化 error、`errors.Is/As`
- 库函数通常返回 error；应用边界决定记录日志、重试、降级或返回给用户
- 返回接口类型 error 时注意 nil 陷阱：不要返回一个值为 nil 的具体错误指针

<!-- id: go-basics-021; difficulty: 2; tags: error, Go基础; source: 高频 -->
# `errors.Is`、`errors.As` 和 `fmt.Errorf %w` 分别是什么？如何配合使用？

### fmt.Errorf %w：包裹 error
`%w` 用于把一个 error 放进新的 error 中，保留错误链：

```go
var ErrNotFound = errors.New("not found")

func findUser(id int) error {
    return fmt.Errorf("find user %d: %w", id, ErrNotFound)
}
```

包裹后的错误字符串有上下文，但根因仍可被识别。

### errors.Is：判断错误链里是否包含目标错误
```go
err := findUser(42)
fmt.Println(err)                         // find user 42: not found
fmt.Println(err == ErrNotFound)          // false
fmt.Println(errors.Is(err, ErrNotFound)) // true
```

`errors.Is` 会沿着 `Unwrap()` 链查找，并支持自定义 `Is(target error) bool`。

### errors.As：提取错误链里的特定类型
```go
type NotFoundError struct {
    Resource string
    ID       int
}
func (e *NotFoundError) Error() string {
    return fmt.Sprintf("%s %d not found", e.Resource, e.ID)
}

func getUser(id int) error {
    return fmt.Errorf("get user: %w", &NotFoundError{Resource: "user", ID: id})
}

var nfe *NotFoundError
if errors.As(getUser(42), &nfe) {
    fmt.Println(nfe.Resource, nfe.ID)
}
```

`errors.As` 的第二个参数必须是非 nil 指针，通常写成 `&target`。

### 多错误
Go 1.20 起，`errors.Join` 和 `fmt.Errorf` 中多个 `%w` 可以形成多错误树，`errors.Is/As` 会遍历它：

```go
err := errors.Join(ErrNotFound, context.DeadlineExceeded)
fmt.Println(errors.Is(err, ErrNotFound)) // true
```

### 选择建议
- 补上下文：`fmt.Errorf("operation: %w", err)`
- 判断某个 sentinel：`errors.Is`
- 需要读取结构化字段：`errors.As`
- 不要用字符串匹配 error 文案做业务判断

<!-- id: go-basics-022; difficulty: 2; tags: error, Go基础; source: 字节 -->
# 如何自定义一个携带更多上下文信息的 error 类型？

### 定义结构化错误类型
自定义 error 通常包含机器可读字段、给人看的消息，以及可选的底层原因：

```go
type AppError struct {
    Code    int
    Op      string
    Message string
    Cause   error
}

func (e *AppError) Error() string {
    if e.Cause != nil {
        return fmt.Sprintf("%s: [%d] %s: %v", e.Op, e.Code, e.Message, e.Cause)
    }
    return fmt.Sprintf("%s: [%d] %s", e.Op, e.Code, e.Message)
}

func (e *AppError) Unwrap() error { return e.Cause }
```

`Error()` 面向日志和人类阅读；程序判断应优先看字段，或用 `errors.Is/As`。

### 构造函数和错误码
```go
const (
    ErrCodeNotFound = 404
    ErrCodeInternal = 500
)

func NewNotFound(op, resource string, cause error) error {
    return &AppError{
        Code:    ErrCodeNotFound,
        Op:      op,
        Message: resource + " not found",
        Cause:   cause,
    }
}
```

### 使用示例
```go
func GetUser(id int) (*User, error) {
    user, err := db.Find(id)
    if errors.Is(err, sql.ErrNoRows) {
        return nil, NewNotFound("GetUser", fmt.Sprintf("user(%d)", id), err)
    }
    if err != nil {
        return nil, &AppError{Code: ErrCodeInternal, Op: "GetUser", Message: "db error", Cause: err}
    }
    return user, nil
}

user, err := GetUser(42)
if err != nil {
    var appErr *AppError
    if errors.As(err, &appErr) && appErr.Code == ErrCodeNotFound {
        // 返回 404 或执行降级逻辑
    }
    return nil, err
}
_ = user
```

### 设计要点
- 需要保留根因时实现 `Unwrap()`，让 `errors.Is/As` 能穿透
- 不要让调用方解析 `Error()` 字符串
- 如果错误有固定类别，可定义 sentinel error 并实现 `Is` 做类别匹配
- 返回 `error` 接口时避免返回 nil 的具体指针，防止 nil 接口陷阱

<!-- id: go-basics-023; difficulty: 1; tags: 包管理, Go基础; source: 高频 -->
# Go 中标识符大小写与可见性有什么关系？

### 规则
Go 用标识符首字母是否为大写来决定是否导出：

- 大写字母开头：exported，包外可访问
- 小写字母开头：unexported，仅声明它的包内可访问

```go
package account

type User struct {
    Name  string // 导出字段
    Email string // 导出字段
    age   int    // 未导出字段，包外不能直接访问或设置
}

func NewUser(name, email string) *User { return &User{Name: name, Email: email} }
func validateEmail(email string) bool { return true }

var ErrNotFound = errors.New("not found")
const DefaultLimit = 20
```

### struct、method、interface 的影响
- 结构体类型导出，不代表字段都导出；包外只能访问导出字段和方法
- 接口方法如果是未导出的，包外类型基本无法实现该接口，因为未导出方法带有包身份
- 导出 API 通常需要配套文档注释，供 `go doc` 和 lint 使用

```go
type Reader interface {
    Read(p []byte) (n int, err error) // 包外类型可以实现
}

type sealed interface {
    isAccountToken() // 未导出方法，用于限制实现者在本包内
}
```

### 序列化与反射
`encoding/json` 只能访问导出字段；未导出字段即使写了 tag 也不会被序列化：

```go
type Person struct {
    Name string `json:"name"`
    age  int `json:"age"` // 不会输出
}
```

这也是 Go 常用的封装方式：导出类型和构造函数，隐藏不变量字段。

<!-- id: go-basics-024; difficulty: 2; tags: 包管理, Go基础; source: 高频 -->
# Go 中 `init()` 函数的执行顺序是什么？有什么特点？

### init 的特点
- `init` 没有参数和返回值
- 不能手动调用，也不能被引用
- 一个包、一个文件里都可以有多个 `init`
- 每个被导入的包只初始化一次，即使被多个包导入

### 初始化顺序
整体顺序是：

```text
先初始化导入的包 → 当前包的包级变量 → 当前包的 init → main.main
```

更具体地说：
- 按 import 依赖图自底向上初始化，循环导入在编译期禁止
- 同一个包内，包级变量按依赖顺序初始化
- 变量初始化完成后，再按源文件顺序和声明顺序执行 `init`
- go tool 通常按文件名词法顺序把文件交给编译器，但业务代码不要依赖跨文件 init 顺序

```go
// db/db.go
var Driver = registerDriver()

func init() {
    fmt.Println("db init")
}

// main.go
import _ "example.com/app/db"

func init() { fmt.Println("main init") }
func main() { fmt.Println("main") }
```

输出一定满足：`db` 包完成初始化后，才会执行 `main` 包的 `init` 和 `main`。

### 常见用途
- 注册数据库驱动、图片解码器、pprof handler 等副作用
- 初始化不可变查找表或全局注册表
- 测试包中的一次性准备

### 注意事项
- 不要在 `init` 中做复杂、耗时或可能失败的业务初始化，因为无法返回 error
- 需要显式错误处理的资源，例如数据库连接，通常放到 `main` 或构造函数里
- 过度依赖 init 会让依赖关系隐蔽，降低测试和复用性

<!-- id: go-basics-025; difficulty: 1; tags: 包管理, Go基础; source: 高频 -->
# `import _ "pkg"` 和 `import . "pkg"` 分别是什么意思？

### `import _ "pkg"`：空白导入 / 副作用导入
空白导入会导入并初始化这个包，但不把包名绑定到当前文件作用域。初始化包括包级变量初始化和 `init()`。

```go
import (
    "database/sql"
    _ "github.com/lib/pq" // 注册 postgres driver
)

func main() {
    db, err := sql.Open("postgres", "...") // driver 已注册
    _, _ = db, err
}
```

常见场景：数据库驱动、图片格式解码器、`net/http/pprof` handler 注册等。使用时最好在注释里说明副作用，否则读代码的人很难知道为什么需要这个导入。

### `import . "pkg"`：点导入
点导入会把被导入包的所有导出标识符放进当前文件作用域，调用时不需要包名前缀：

```go
import . "fmt"

func main() {
    Println("hello") // 等价于 fmt.Println
}
```

它通常不推荐，因为会污染命名空间、降低可读性，并且更容易产生标识符冲突。少数可接受场景包括测试中有意写成外部包视角，或某些 DSL/生成代码。

### 对比
| 导入方式 | 示例 | 效果 |
|----------|------|------|
| 普通导入 | `import "fmt"` | 用 `fmt.Println` 访问 |
| 别名导入 | `import f "fmt"` | 用 `f.Println` 访问 |
| 空白导入 | `import _ "image/png"` | 只为包初始化副作用 |
| 点导入 | `import . "fmt"` | 直接用 `Println` |

空白导入和点导入都应少用；前者要求副作用合理，后者要求可读性收益大于命名污染成本。

<!-- id: go-basics-026; difficulty: 3; tags: 切片, Go基础; source: 字节 -->
# 以下代码输出什么？请解释原因。

```go
func main() {
    s := []int{1, 2, 3}
    modify(s)
    fmt.Println(s)

    grow(s)
    fmt.Println(s)
}

func modify(s []int) {
    s[0] = 100
}

func grow(s []int) {
    s = append(s, 4)
    s[0] = 999
}
```

<!-- answer -->

### 输出
```go
[100 2 3]
[100 2 3]
```

### `modify` 为什么会影响外部
slice 传参传的是 slice header 的副本，概念上包含指针、长度和容量。两个 header 不同，但指向同一个底层数组：

```text
main.s   -> array [1, 2, 3], len=3, cap=3
modify.s -> array [1, 2, 3], len=3, cap=3
```

所以 `s[0] = 100` 修改的是共享底层数组，外部能看到 `[100 2 3]`。

### `grow` 为什么没有影响外部
这里 `[]int{1, 2, 3}` 的长度和容量都是 3。调用 `grow` 时已经是 `[100 2 3]`，`append(s, 4)` 容量不够，会分配新底层数组：

```go
func grow(s []int) {
    s = append(s, 4) // 新数组 [100, 2, 3, 4]
    s[0] = 999       // 改的是新数组
}
```

外部的 slice header 仍指向旧数组，长度也仍是 3，所以第二次打印还是 `[100 2 3]`。

### 追问点
如果外部 slice 还有剩余容量，`append` 可能复用同一个底层数组，此时 `grow` 里的 `s[0] = 999` 会影响外部已有元素，但外部长度不会自动变长。

```go
s := make([]int, 3, 6)
copy(s, []int{1, 2, 3})
grow(s)
fmt.Println(s) // 可能看到 [999 2 3]
```

如果函数需要改变调用方看到的长度，最常见做法是返回新 slice：

```go
func grow(s []int) []int {
    s = append(s, 4)
    return s
}
```

<!-- id: go-basics-027; difficulty: 3; tags: 接口, Go基础; source: 阿里 -->
# 解释"接口的 nil 陷阱"，以下代码为什么 `err != nil` 为 true？

```go
func getError() error {
    var p *PathError = nil
    return p
}

func main() {
    err := getError()
    fmt.Println(err == nil)  // false，为什么？
}
```

<!-- answer -->

### 接口值的结构
接口值只有在“动态类型”和“动态值”都为 nil 时才等于 nil。概念上可以理解为：

```text
interface value = (dynamic type, dynamic value)
```

### 代码分析
```go
func getError() error {
    var p *PathError = nil
    return p
}
```

`p` 是一个具体类型为 `*PathError`、值为 nil 的指针。把它返回给 `error` 接口后，接口值变成：

```text
(type: *PathError, value: nil)
```

动态类型不是 nil，所以：

```go
err := getError()
fmt.Println(err == nil)              // false
fmt.Println(err.(*PathError) == nil) // true
```

如果之后调用 `err.Error()`，还可能因为 nil 指针接收者而 panic，取决于 `Error` 方法是否处理 nil。

### 正确写法
不要把“可能为 nil 的具体错误指针”直接作为 `error` 返回：

```go
func getError() error {
    if failed {
        return &PathError{Op: "open", Path: path}
    }
    return nil // 真正的 nil interface：(nil, nil)
}
```

如果内部函数返回的是具体指针，要先判断：

```go
p := makePathError()
if p != nil {
    return p
}
return nil
```

### 常见场景
这个问题不限于 `error`，任何接口都一样：

```go
var r *bytes.Buffer = nil
var x io.Reader = r
fmt.Println(x == nil) // false
```

总结：接口 nil 判断看的是接口本身，不是只看内部指针值。

<!-- id: go-basics-028; difficulty: 3; tags: defer, Go基础; source: 腾讯 -->
# 以下代码输出什么？解释 `defer` 与循环、闭包的交互。

```go
func main() {
    for i := 0; i < 3; i++ {
        defer fmt.Println(i)
    }
}

func main2() {
    for i := 0; i < 3; i++ {
        defer func() {
            fmt.Println(i)
        }()
    }
}
```

<!-- answer -->

### `main` 输出
```text
2
1
0
```

`defer fmt.Println(i)` 在注册 defer 时会立即求值参数 `i`，分别保存 0、1、2；函数返回时按 LIFO 执行，所以输出 2、1、0。

### `main2` 输出要看 Go 语言版本
在 `go.mod` 声明 `go 1.22` 及以上的包里，循环变量按每次迭代创建，闭包分别捕获每次迭代自己的 `i`，所以输出也是：

```text
2
1
0
```

在 Go 1.21 及以前语义下，或等价地把 `i` 声明在循环外时，三个闭包捕获同一个变量，循环结束后 `i == 3`，所以输出：

```text
3
3
3
```

```go
i := 0
for ; i < 3; i++ {
    defer func() { fmt.Println(i) }()
}
// 仍会输出 3 3 3，因为 i 不是循环声明创建的 per-iteration 变量
```

### 跨版本最稳的写法
把当前值作为 deferred function 的参数传入，参数会在注册 defer 时求值：

```go
for i := 0; i < 3; i++ {
    defer func(n int) {
        fmt.Println(n)
    }(i)
}
// 2 1 0
```

结论：`defer` 的实参立即求值，闭包读取变量发生在执行时；Go 1.22 修复的是循环语句自己声明的循环变量捕获问题，不代表所有闭包捕获都变成值拷贝。

<!-- id: go-basics-029; difficulty: 3; tags: map, 结构体; source: 高频 -->
# 为什么不能对 map 中的 struct 字段直接赋值？如何绕过这个限制？

### 问题复现
```go
type Point struct{ X, Y int }

m := map[string]Point{
    "origin": {0, 0},
}

m["origin"].X = 10 // 编译错误：cannot assign to struct field in map
```

### 原因
map 索引表达式得到的 value 不可寻址。可以把 `m["origin"]` 理解为取出一份值副本，而不是拿到 map 桶里元素的稳定地址。

Go 这样设计是因为 map 会扩容、搬迁 bucket，元素地址不稳定；如果允许对 map value 的字段取地址或直接改字段，会破坏实现和语义。

slice 元素不同，它们在底层数组中有稳定地址：

```go
s := []Point{{0, 0}}
s[0].X = 10 // OK
```

### 方案一：取出、修改、整体写回
```go
p := m["origin"]
p.X = 10
m["origin"] = p
```

这是值语义，适合小结构体，也避免共享可变对象。

### 方案二：map value 存指针
```go
m := map[string]*Point{
    "origin": {0, 0},
}

if p := m["origin"]; p != nil {
    p.X = 10
}
```

注意：map 返回的指针值本身仍是副本，但这个指针指向的对象可修改。缺点是需要处理 nil、生命周期和 GC 压力，也可能引入共享可变状态。

### 类似限制
```go
m["origin"].Move() // 如果 Move 是 *Point 接收者，也会失败，因为需要对 map 元素取地址
```

这类场景同样要先取出再写回，或改成指针 map。

<!-- id: go-basics-030; difficulty: 3; tags: 函数, 变量; source: 字节 -->
# Go 中函数是一等公民，请解释闭包的原理，并给出一个实际应用场景中的陷阱案例。

### 闭包的原理
闭包是函数值和它引用的外部变量一起形成的运行时对象。闭包捕获的是变量本身，而不是简单地把当前值复制进函数体。

```go
func makeCounter() func() int {
    count := 0
    return func() int {
        count++
        return count
    }
}

c1 := makeCounter()
c2 := makeCounter()
fmt.Println(c1()) // 1
fmt.Println(c1()) // 2，同一个 count
fmt.Println(c2()) // 1，另一个 count
```

被闭包捕获的变量可能逃逸到堆上，由编译器逃逸分析决定；语义上不需要开发者手动管理生命周期。

### 现代 Go 里的循环变量陷阱
Go 1.22 起，包语言版本为 `go 1.22` 及以上时，`for`/`range` 语句自己声明的循环变量是每次迭代独立的，经典的 `for i := ...` 闭包打印全是 5 的问题已经被修复。

但陷阱仍然存在：如果变量声明在循环外，闭包还是捕获同一个变量。

```go
funcs := make([]func(), 0, 5)

i := 0
for ; i < 5; i++ {
    funcs = append(funcs, func() {
        fmt.Println(i)
    })
}

for _, f := range funcs { f() }
// 输出 5 5 5 5 5
```

### 修复方式
显式把当前值复制到本轮作用域，或通过参数传递：

```go
for i := 0; i < 5; i++ {
    n := i
    funcs = append(funcs, func() { fmt.Println(n) })
}

for i := 0; i < 5; i++ {
    funcs = append(funcs, func(n int) func() {
        return func() { fmt.Println(n) }
    }(i))
}
```

### 工程注意
- 闭包捕获共享可变变量时，要考虑数据竞争；goroutine 中读写同一变量需要同步
- Go 1.22 解决的是循环声明变量的捕获问题，不改变闭包“捕获变量”的基本模型
- 面试回答要主动说明版本差异，否则旧答案在新 Go 项目里会错误

<!-- id: go-basics-031; difficulty: 2; tags: 类型, Go基础; source: 高频 -->
# Go 中字符串是不可变的，这意味着什么？字符串拼接的最佳实践是什么？

### 字符串不可变意味着什么
```go
s := "hello"
// s[0] = 'H' // 编译错误：cannot assign to s[0]

s = "Hello" // 可以让变量指向另一个字符串，但不是修改原字符串
```

字符串可以理解为 `(data, len)`，但语言层面保证字符串内容不可变。底层数据可能来自只读段，也可能来自堆；不要依赖具体布局。

字符串按字节索引，`s[i]` 得到 `byte`；如果要按 Unicode 字符处理，应使用 `range` 得到 rune。

### 拼接方式
少量、单个表达式里的拼接直接用 `+`，编译器通常能做常量折叠或合并优化：

```go
s := "Hello" + ", " + name
```

循环里反复 `s += part` 才是常见性能问题，因为每次都可能生成新字符串并复制已有内容：

```go
var b strings.Builder
b.Grow(estimatedSize)
for _, part := range parts {
    b.WriteString(part)
}
result := b.String()
```

已有字符串切片时优先用 `strings.Join`：

```go
s := strings.Join([]string{"a", "b", "c"}, ",")
```

需要格式化时用 `fmt.Sprintf` 或 `fmt.Fprintf(&b, ...)`，但要知道 `fmt` 有解析和反射开销；性能敏感路径可用 `strconv` 和 `Builder.WriteString`。

`bytes.Buffer` 更适合同时处理字节和 `io.Writer` 场景：

```go
var buf bytes.Buffer
io.Copy(&buf, r)
s := buf.String()
```

### 总结
- 少量拼接：`+`
- 循环拼接：`strings.Builder`，最好预估容量后 `Grow`
- 已有切片：`strings.Join`
- 字节流或 `io.Writer`：`bytes.Buffer`

<!-- id: go-basics-032; difficulty: 2; tags: 结构体, Go基础; source: 高频 -->
# Go struct 的零值初始化是什么？有哪些实际应用？

### 零值规则
Go 中每种类型都有零值，变量声明后会自动初始化：

| 类型 | 零值 |
|------|------|
| 数值类型 | `0` |
| bool | `false` |
| string | `""` |
| pointer/slice/map/channel/function/interface | `nil` |
| struct | 每个字段各自的零值 |

```go
type Server struct {
    Host    string
    Port    int
    Timeout time.Duration
    TLS     bool
}

var s Server
fmt.Println(s.Host == "") // true
fmt.Println(s.Port == 0)  // true
```

### 零值可用
Go 鼓励类型设计成零值就处于可用状态：

```go
var mu sync.Mutex
mu.Lock()
mu.Unlock()

var buf bytes.Buffer
buf.WriteString("hello")

var once sync.Once
once.Do(initSomething)
```

这能减少构造函数依赖，让字段嵌入和局部变量更自然。注意 `sync.Mutex`、`sync.Once` 等零值可用，但**使用后不能复制**。

### 需要显式初始化的字段
有些 nil 零值可以读或判断，但不能完整工作：

```go
var s []int
s = append(s, 1) // nil slice 可 append

var m map[string]int
fmt.Println(m["x"]) // 读 OK，得到零值
// m["x"] = 1       // panic：nil map 不能写

var ch chan int
// <-ch 或 ch <- 1 会永久阻塞
```

因此包含 map/channel 的结构体通常需要构造函数：

```go
type Cache struct {
    data map[string]string
}

func NewCache() *Cache {
    return &Cache{data: make(map[string]string)}
}
```

设计时要明确：零值是否可用；如果不可用，就用构造函数、文档或私有字段保证初始化。

<!-- id: go-basics-033; difficulty: 3; tags: 接口, 结构体; source: 高频 -->
# Go 中如何用接口实现多态？与面向对象语言的继承有什么本质区别？

### 接口实现多态
Go 的多态来自接口的动态分发：函数依赖一组行为，而不是依赖具体类型。

```go
type Shape interface {
    Area() float64
    Perimeter() float64
}

type Circle struct{ Radius float64 }
func (c Circle) Area() float64      { return math.Pi * c.Radius * c.Radius }
func (c Circle) Perimeter() float64 { return 2 * math.Pi * c.Radius }

type Rectangle struct{ Width, Height float64 }
func (r Rectangle) Area() float64      { return r.Width * r.Height }
func (r Rectangle) Perimeter() float64 { return 2 * (r.Width + r.Height) }

func printShape(s Shape) {
    fmt.Printf("area=%.2f perimeter=%.2f\n", s.Area(), s.Perimeter())
}
```

`Circle` 和 `Rectangle` 不需要声明 `implements Shape`；只要方法集满足接口即可。

### 与继承的区别
| 维度 | 继承 | Go 接口 |
|------|------|---------|
| 关系 | 子类显式继承父类 | 结构化类型，隐式满足方法集 |
| 代码复用 | 继承父类实现 | 组合、嵌入、普通字段委托 |
| 多态 | 基于类层级 | 基于行为接口 |
| 耦合 | 子类依赖父类设计 | 调用方只依赖所需方法 |
| 扩展 | 改类层级或适配器 | 给类型增加方法即可满足更多接口 |

嵌入不是继承：外层类型不会自动成为内层类型，只是获得字段和方法提升。

### 设计建议
接口通常由消费方定义，并保持小而聚焦：

```go
func Save(w io.Writer, data []byte) error {
    _, err := w.Write(data)
    return err
}
```

“接受接口，返回具体类型”是常见经验法则，不是硬规则。返回具体类型能保留调用方能力；只有确实需要隐藏实现或替换实现时才返回接口。

```go
type Logger interface { Log(msg string) }
type Saver interface { Save([]byte) error }

type Service interface {
    Logger
    Saver
}
```

这种接口组合表达的是行为集合，而不是继承层级。

<!-- id: go-basics-034; difficulty: 2; tags: 指针, Go基础; source: 高频 -->
# Go 中指针的基本用法是什么？什么时候应该使用指针？

### 基本操作
```go
x := 42
p := &x           // 取地址，p 的类型是 *int
fmt.Println(*p)   // 解引用，42
*p = 100          // 通过指针修改 x
fmt.Println(x)    // 100

var q *int        // 指针零值是 nil
fmt.Println(q == nil)
// *q = 1         // panic: nil pointer dereference
```

`new(T)` 分配一个 T 的零值并返回 `*T`：

```go
p := new(int)
*p = 42
```

语义上类似：

```go
var x int
p := &x
```

具体放栈上还是堆上由编译器逃逸分析决定。

### 什么时候使用指针
需要修改调用方对象：

```go
func increment(n *int) { (*n)++ }
```

避免复制大对象，或避免复制包含锁的对象：

```go
func process(data *BigStruct) error { return nil }
```

表达可选值，区分“没传”和“传了零值”：

```go
type Config struct {
    Timeout *time.Duration // nil=未设置，0=明确设置为不超时
}
```

实现需要修改接收者的指针方法：

```go
func (s *Stack) Push(v int) { s.data = append(s.data, v) }
```

### 什么时候避免指针
- 小型值对象、基础类型、不可变语义，直接传值更清晰
- slice/map/channel 本身的 descriptor 会被复制，但仍指向共享底层数据；只有需要替换 slice header、map 或 channel 本身时才考虑指针
- 很少需要 `*interface{}`；接口值可以持有指针或值，传接口通常已经足够
- Go 没有普通指针算术，除非使用 `unsafe`，业务代码应避免

<!-- id: go-basics-035; difficulty: 2; tags: 函数, 接口; source: 高频 -->
# 什么是函数类型？Go 中函数类型如何实现策略模式？

### 函数类型
函数可以作为值传递、赋值、返回，也可以定义成具名类型：

```go
type Handler func(string) error
type Predicate func(int) bool

var h Handler = func(s string) error {
    fmt.Println(s)
    return nil
}

_ = h("hello")
```

函数值的零值是 nil，调用 nil 函数会 panic；函数值只能和 nil 比较，不能互相比较。

### 函数类型实现接口
具名函数类型可以定义方法，所以能适配接口。`http.HandlerFunc` 就是典型例子：

```go
type HandlerFunc func(http.ResponseWriter, *http.Request)

func (f HandlerFunc) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    f(w, r)
}
```

这让普通函数可以被包装成 `http.Handler`。

### 策略模式
把可变算法抽象成函数字段，比定义一堆小 struct 更轻：

```go
type SortStrategy func([]int) []int

type Sorter struct {
    strategy SortStrategy
}

func NewSorter(strategy SortStrategy) *Sorter {
    if strategy == nil {
        strategy = func(data []int) []int { return data }
    }
    return &Sorter{strategy: strategy}
}

func (s *Sorter) Sort(data []int) []int {
    return s.strategy(data)
}
```

使用：

```go
sorter := NewSorter(func(data []int) []int {
    out := append([]int(nil), data...)
    sort.Ints(out)
    return out
})
result := sorter.Sort([]int{3, 1, 4})
```

### 实际应用：中间件链
```go
type Middleware func(http.Handler) http.Handler

func Logger(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        log.Printf("%s %s", r.Method, r.URL.Path)
        next.ServeHTTP(w, r)
    })
}

handler := Logger(Auth(RateLimit(myHandler)))
```

函数类型适合无状态或少量闭包状态的策略；状态复杂、生命周期复杂时，用结构体实现接口会更清晰。

<!-- id: go-basics-036; difficulty: 3; tags: 切片, 变量; source: 腾讯 -->
# 以下代码输出什么？解释 `make` 创建切片时 len 和 cap 的关系。

```go
func main() {
    s1 := make([]int, 5)
    s2 := make([]int, 0, 5)

    s1 = append(s1, 1)
    s2 = append(s2, 1)

    fmt.Println(s1, len(s1), cap(s1))
    fmt.Println(s2, len(s2), cap(s2))
}
```

<!-- answer -->

### 输出
`s1` 一定包含 5 个零值再追加 1，`s2` 只包含追加的 1：

```text
[0 0 0 0 0 1] 6 <new-cap>
[1] 1 5
```

在当前常见 Go 实现中，第一行的 `<new-cap>` 通常是 `10`，但规范只保证 append 后容量至少能容纳 6 个元素，不保证具体扩容策略。

### 解析
`make([]int, 5)` 表示长度为 5、容量为 5，已有 5 个可访问的零值元素：

```go
s1 := make([]int, 5) // [0 0 0 0 0], len=5, cap=5
s1 = append(s1, 1)  // 追加到第 6 个位置
```

`make([]int, 0, 5)` 表示长度为 0、容量为 5，只预留空间，不产生可访问元素：

```go
s2 := make([]int, 0, 5) // [], len=0, cap=5
s2 = append(s2, 1)      // [1], len=1, cap=5
```

### make 的参数
```go
make([]T, length)           // cap == length
make([]T, length, capacity) // capacity >= length
```

### 实践建议
已知最终元素数、准备按下标赋值：

```go
s := make([]int, n)
for i := range s {
    s[i] = i
}
```

准备逐步 append，且有预估数量：

```go
s := make([]int, 0, estimated)
for _, item := range items {
    s = append(s, process(item))
}
```

最常见坑是 `make([]T, n)` 后又 append，导致前面出现 n 个零值。

<!-- id: go-basics-037; difficulty: 3; tags: 接口, 类型; source: 高频 -->
# Go 中 `interface{}` / `any` 有什么特性？为什么要谨慎使用？

### any 与 interface{}
`any` 是 Go 1.18 引入的预声明标识符，本质上是 `interface{}` 的别名：

```go
var x any = 42
var y interface{} = 42
```

空接口没有方法要求，所以所有类型都满足它。

```go
func printAny(v any) {
    fmt.Printf("%T %v\n", v, v)
}

printAny(42)
printAny("hello")
printAny([]int{1, 2, 3})
printAny(nil)
```

### 合理使用场景
- `fmt.Println(a ...any)` 这类确实接受任意值的 API
- JSON/YAML 等未知结构的中间表示，例如 `map[string]any`
- 日志字段、通用容器、测试辅助工具
- 泛型约束里表示“不限制类型参数”：`func Clone[S ~[]E, E any](s S) S`

### 为什么要谨慎
丢失静态类型检查：

```go
func add(a, b any) any {
    return a.(int) + b.(int) // 错误到运行时才暴露
}
```

使用时需要断言或 type switch：

```go
n, ok := v.(int)
if !ok { return errors.New("want int") }
```

可能带来装箱、逃逸和反射开销，但是否分配由具体类型、大小和逃逸分析决定，不能简单说一定堆分配。

还要注意接口 nil 陷阱和比较限制：如果接口动态值是 slice/map/function，比较接口值会 panic。

### 替代方案
- 类型已知：用具体类型
- 多个类型但逻辑相同：用泛型
- 依赖行为：定义小接口，例如 `io.Reader`
- JSON 延迟解析：用 `json.RawMessage`，避免过早变成 `map[string]any`

<!-- id: go-basics-038; difficulty: 3; tags: error, panic; source: 高频 -->
# 在 Go 中，什么时候应该使用 `panic`，什么时候应该返回 `error`？

### 核心原则
`error` 用于调用方可以预期并处理的失败；`panic` 用于程序员错误、违反内部不变量，或继续运行已经不可信的状态。

### 应返回 error
```go
func ReadConfig(path string) (*Config, error)      // 文件不存在、权限不足
func Fetch(ctx context.Context, url string) error  // 超时、网络失败
func ParseDate(s string) (time.Time, error)        // 输入格式错误
func GetUser(id int) (*User, error)                // 记录不存在
```

这些失败属于正常控制流的一部分，调用方可能重试、降级、返回 4xx/5xx 或提示用户。

### 可使用 panic
```go
var uuidRE = regexp.MustCompile(`^[a-f0-9-]+$`) // 硬编码正则错误就是程序错误

func mustPositive(n int) int {
    if n <= 0 {
        panic(fmt.Sprintf("internal invariant violated: %d", n))
    }
    return n
}

switch state {
case Ready, Running, Stopped:
    // ...
default:
    panic(fmt.Sprintf("unknown state: %v", state))
}
```

`MustXxx` 函数的惯例是：普通版本返回 `(T, error)`，`MustXxx` 在失败时 panic，通常用于初始化阶段或测试。

### recover 放在边界
库代码不应把可预期错误变成 panic；框架或应用边界可以 recover，记录堆栈并隔离失败：

```go
func Recover(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if v := recover(); v != nil {
                log.Printf("panic: %v\n%s", v, debug.Stack())
                http.Error(w, "internal error", http.StatusInternalServerError)
            }
        }()
        next.ServeHTTP(w, r)
    })
}
```

### 判断标准
- 调用方能合理处理：返回 error
- 调用方传错参数但 API 能表达错误：优先返回 error
- 不可能状态、内部 bug、初始化期硬编码错误：可以 panic
- goroutine 顶层、HTTP/RPC 边界、任务调度器：适合 recover 并隔离影响

<!-- id: go-basics-039; difficulty: 3; tags: 结构体, 接口; source: 高频 -->
# 请解释 Go 的"组合优于继承"理念，并给出一个实际的设计示例。

### 核心理念
Go 没有类继承。代码复用靠组合、字段委托和嵌入；多态靠接口。这样依赖的是行为和小组件，而不是深继承树。

继承常见问题包括：父类改动影响子类、层级过深难测试、多重继承或菱形继承复杂。Go 更倾向把能力拆成小接口和字段。

### 组合依赖的例子
```go
type Logger interface {
    Log(level, msg string)
}

type Metrics interface {
    Increment(key string)
}

type UserService struct {
    db      *DB
    logger  Logger
    metrics Metrics
}

func NewUserService(db *DB, logger Logger, metrics Metrics) *UserService {
    return &UserService{db: db, logger: logger, metrics: metrics}
}

func (s *UserService) CreateUser(name string) error {
    s.logger.Log("INFO", "creating user: "+name)
    if err := s.db.Insert(name); err != nil {
        s.logger.Log("ERROR", err.Error())
        return fmt.Errorf("insert user: %w", err)
    }
    s.metrics.Increment("user.created")
    return nil
}
```

测试时只需要替换小接口实现，不需要继承一个庞大基类。

### 嵌入复用
```go
type Base struct {
    ID        int
    CreatedAt time.Time
}

func (b Base) IsNew() bool {
    return time.Since(b.CreatedAt) < 24*time.Hour
}

type User struct {
    Base
    Name string
}

type Post struct {
    Base
    Title string
}
```

`User` 可以调用 `u.IsNew()`，但 `User` 不是 `Base` 的子类；只是选择器被提升了。

### 设计注意
- 嵌入会把字段和方法提升到外层 API，公共类型中要谨慎，避免意外暴露太多能力
- 只是为了持有依赖时，用命名字段通常比嵌入更清楚
- 接口应尽量小，并由消费方按需要定义
- 组合不是“不要抽象”，而是把抽象建立在行为边界上，而不是类层级上

<!-- id: go-basics-040; difficulty: 3; tags: 变量, 类型; source: 字节 -->
# Go 中类型别名（type alias）和类型定义（type definition）有什么区别？

### 类型定义：创建新类型
```go
type Celsius float64
type Fahrenheit float64
```

`Celsius` 和 `Fahrenheit` 是两个新的定义类型，底层类型都是 `float64`，但彼此不是同一个类型：

```go
var c Celsius = 100
var f Fahrenheit = 212

// c = f        // 编译错误
c = Celsius(f) // 显式转换

func (c Celsius) ToFahrenheit() Fahrenheit {
    return Fahrenheit(c*9/5 + 32)
}
```

类型定义适合领域建模、增加类型安全、给类型添加方法。

### 类型别名：同一个类型的另一个名字
```go
type MyInt = int
```

别名不创建新类型，`MyInt` 和 `int` 完全相同：

```go
type Rune = int32

type User = model.User // 跨包迁移时保持兼容
```

Go 1.24 起，类型别名也可以带类型参数：

```go
type Set[K comparable] = map[K]bool
```

### 方法差异
类型定义可以定义新方法，前提是接收者基类型定义在当前包中。

别名本身不是新类型，不能给“外包类型的别名”添加方法：

```go
type MyTime = time.Time
// func (t MyTime) IsZero2() bool { return t.IsZero() } // 非法：不能给非本包类型定义方法
```

如果别名指向本包已有定义类型，方法实际仍绑定到原定义类型；但泛型别名、或指向已实例化泛型类型的别名不能作为方法接收者基类型。

### 对比
| 维度 | 类型定义 `type T U` | 类型别名 `type T = U` |
|------|---------------------|------------------------|
| 是否新类型 | 是 | 否 |
| 与原类型赋值 | 通常需要显式转换 | 直接兼容 |
| 方法 | 可为本包新定义类型加方法 | 共享目标类型方法，新增方法受接收者规则限制 |
| 用途 | 类型安全、领域语义 | 渐进重构、兼容旧包路径、简化复杂类型名 |

### 应用示例
```go
type UserID int64
type OrderID int64

func GetUser(id UserID) (*User, error) { return nil, nil }

var oid OrderID = 42
// GetUser(oid) // 编译错误，防止 ID 混用
```

```go
// v1 包里兼容旧 API
type Config = v2.Config
```
