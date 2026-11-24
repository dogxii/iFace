# 内存与GC

<!-- id: go-memory-001; difficulty: 1; tags: 栈堆, 内存; source: 高频 -->
# Go 中栈（stack）和堆（heap）的主要区别是什么？各自适合存储什么数据？

Go 的栈和堆不是由 `var`、`new` 或是否取地址直接决定，而是由编译器的逃逸分析、对象大小和调用关系共同决定。

**栈（stack）**

- 每个 goroutine 都有自己的栈，初始很小，常见为约 2KB，可按需增长和收缩。
- 由编译器和 runtime 自动管理，函数调用进入时创建栈帧，返回后栈帧失效。
- 适合存放生命周期明确、不会逃出当前调用链的局部变量、临时值和部分返回值。
- 分配成本很低，通常只是移动栈指针，也不会增加 GC 扫描堆对象的压力。

**堆（heap）**

- 由 runtime 分配器管理，生命周期不再和某个函数栈帧绑定。
- 对象由 GC 判断是否仍可达并回收，分配和扫描成本通常高于栈上对象。
- 适合跨函数、跨 goroutine、被闭包捕获、存入接口或容器后生命周期不易静态证明的数据。

```go
func stackAlloc() int {
    x := 42
    return x // x 可以留在栈上，甚至被放进寄存器
}

func heapAlloc() *int {
    x := 42
    return &x // 调用方继续持有 x 的地址，x 必须逃逸
}
```

要点：返回指针通常会让对象逃逸，但“取地址”本身不必然逃逸；指针对象也可能完全在栈上。用 `go build -gcflags=all=-m=2` 看编译器实际决策，再结合 benchmark 和 pprof 判断是否值得优化。

<!-- id: go-memory-002; difficulty: 1; tags: 逃逸分析, 栈堆; source: 高频 -->
# 如何查看 Go 程序的逃逸分析结果？相关命令是什么？

逃逸分析结果由编译器输出，常用 `-gcflags` 查看。项目级排查建议加 `all=`，这样依赖包和当前包都会使用同一组编译器标志。

```bash
# 常用：输出逃逸和内联决策
go build -gcflags=all=-m ./...

# 更详细：通常会包含为什么逃逸、是否内联等信息
go build -gcflags=all=-m=2 ./...

# 针对测试或基准场景
go test -run=^$ -bench=. -gcflags=all=-m=2 ./pkg/foo

# 单文件实验也可以用 go run
go run -gcflags=all=-m=2 main.go
```

典型输出：

```text
./main.go:8:6: moved to heap: x
./main.go:14:12: &y escapes to heap
./main.go:20:13: b does not escape
./main.go:24:9: inlining call to bytes.(*Buffer).WriteString
```

| 输出 | 含义 |
|------|------|
| `moved to heap` | 变量被放到堆上 |
| `escapes to heap` | 表达式的结果逃逸到堆 |
| `does not escape` | 参数或临时对象没有逃逸 |
| `inlining call` | 编译器做了内联，可能影响逃逸结果 |

注意：逃逸分析输出是诊断信息，不是稳定 API。不同 Go 版本、内联结果和泛型实例化都可能改变结论。真正的优化依据应是 benchmark、`pprof` 和线上指标，而不是单看一行 `escapes to heap`。

<!-- id: go-memory-003; difficulty: 1; tags: GC, 三色标记; source: 高频 -->
# 简述 Go GC 的三色标记算法，白、灰、黑三种颜色分别代表什么？

Go GC 使用并发三色标记清扫思路：先从根对象出发标记所有可达对象，再清扫不可达对象。当前 Go GC 是非分代、非压缩的并发 GC，目标是把 STW 暂停控制得很短。

| 颜色 | 含义 |
|------|------|
| 白色 | 尚未被发现；标记结束后仍为白色的对象会被视为垃圾 |
| 灰色 | 已发现但还没有扫描完其指针字段 |
| 黑色 | 已扫描完成，指向的对象也已经被发现或处理 |

基本流程：

1. 短暂 STW 做标记准备，打开写屏障。
2. 从 GC roots 开始标记，包括全局变量、各 goroutine 栈、寄存器、runtime 结构等。
3. 并发扫描灰色对象，把它们引用的白色对象变成灰色，扫描完成后对象变黑。
4. 用户 goroutine 分配过快时可能触发 mark assist，帮助 GC 完成一部分标记工作。
5. 标记终止阶段再次短暂 STW，关闭写屏障，然后并发或按需清扫未标记对象。

并发标记期间，用户代码可能新增或修改指针引用，因此必须依赖写屏障维护三色不变式，避免出现“黑色对象新指向白色对象但 GC 没看到”的漏标问题。

<!-- id: go-memory-004; difficulty: 1; tags: GOGC, GC; source: 高频 -->
# GOGC 环境变量的作用是什么？默认值是多少？如何调整它影响 GC 行为？

`GOGC` 控制 GC 目标堆大小的增长比例，默认值是 `100`。直观理解是：上轮 GC 后的存活数据越多，下一轮允许堆增长的空间也越多；`GOGC` 越大，GC 越少但内存越高。

简化公式：

```text
下一轮目标 ≈ 上轮存活堆 + (上轮存活堆 + GC roots) * GOGC / 100
```

所以 `GOGC=100` 大致表示允许堆相对存活数据增长一倍；`GOGC=50` 更早触发 GC；`GOGC=200` 更晚触发 GC。

```bash
GOGC=50  ./server   # 降低峰值堆，但 GC 更频繁、CPU 成本更高
GOGC=200 ./server   # 降低 GC 频率，但峰值堆和扫描量可能更高
GOGC=off ./server   # 关闭自动 GC，只适合极受控的实验或短生命周期任务
```

运行时也可以调整：

```go
import "runtime/debug"

old := debug.SetGCPercent(200)
_ = old
```

Go 1.19+ 还提供 `GOMEMLIMIT` / `debug.SetMemoryLimit`。在容器里通常要显式把内存上限设在 cgroup limit 以下，留出 runtime、cgo、mmap、page cache 等余量。调优时不要只问“降低还是升高 GOGC”：

- 内存紧张：降低 `GOGC` 或设置 `GOMEMLIMIT`，接受更多 GC CPU。
- CPU 紧张且内存充足：提高 `GOGC`，减少 GC 频率。
- 延迟敏感：关注尾延迟、mark assist 和分配速率；降低 `GOGC` 不一定总是更快，必须用压测和 pprof 验证。

<!-- id: go-memory-005; difficulty: 1; tags: 内存泄漏, GC; source: 高频 -->
# Go 中常见的内存泄漏场景有哪些？请列举至少 4 种。

Go 有 GC，但“仍然可达却已经没有业务价值”的对象不会被回收；此外，goroutine、fd、连接、ticker 等资源也需要明确生命周期管理。

**1. Goroutine 泄漏**

```go
func leak() {
    ch := make(chan int)
    go func() {
        <-ch // 没有人发送或关闭，goroutine 永久阻塞
    }()
}
```

修复方向是用 `context.Context`、关闭 channel、超时或 worker 生命周期管理。

**2. Timer/Ticker 生命周期错误**

```go
func run(ctx context.Context) {
    ticker := time.NewTicker(time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            doWork()
        case <-ctx.Done():
            return
        }
    }
}
```

Go 1.23 起，未被引用的 timer/ticker 可以被 GC 回收；但只要 goroutine 还在读 `ticker.C`，它就仍然可达。`Stop` 的主要价值是停止事件源并表达生命周期，不应依赖 GC 管理业务循环。

**3. 小 slice 持有大底层数组**

```go
func firstKB(data []byte) []byte {
    out := make([]byte, min(len(data), 1024))
    copy(out, data[:len(out)])
    return out
}
```

直接返回 `data[:1024]` 会让整个大数组继续存活。

**4. map 删除后桶不主动缩小**

大量插入后再 `delete`，map 的桶通常不会立刻还给系统。需要长期瘦身时，重建 map 或把旧 map 置为 `nil`。

**5. 无界缓存或全局变量持有引用**

缓存要有容量、TTL、淘汰策略和指标；全局 registry、metrics label、闭包捕获的大对象也常见。

**6. 未关闭资源**

`http.Response.Body`、`sql.Rows`、文件、连接和订阅句柄都要关闭。它们不只是内存问题，还会造成连接池耗尽和 fd 泄漏。

<!-- id: go-memory-006; difficulty: 1; tags: sync.Pool, 内存; source: 高频 -->
# `sync.Pool` 的作用是什么？它能彻底防止 GC 回收对象吗？

`sync.Pool` 是 Go 标准库提供的**临时对象池**，用于缓存可复用的对象，减少频繁分配和 GC 压力。

**核心作用：**
- 缓存分配代价较高的临时对象（如 `bytes.Buffer`、大切片等）。
- 通过复用对象减少堆分配次数，降低 GC 负担。
- 线程安全，内部通过 per-P 缓存减少竞争。

```go
var bufPool = sync.Pool{
    New: func() interface{} {
        return new(bytes.Buffer)
    },
}

func process(data string) string {
    buf := bufPool.Get().(*bytes.Buffer)
    defer func() {
        buf.Reset()
        bufPool.Put(buf) // 用完归还
    }()
    buf.WriteString(data)
    return buf.String()
}
```

**不能彻底防止 GC 回收：**

> `sync.Pool` **不能**保证对象永久存活。每次 GC 时，Pool 中所有未被取走的对象都会被清除（Go 1.13+ 改进为两阶段清除，增加了一次 GC 的缓存期）。

**适用场景：** 临时、高频、生命周期短的对象复用（如序列化 Buffer）。
**不适合：** 需要长期持有的连接池、需要精确控制生命周期的资源。

<!-- id: go-memory-007; difficulty: 1; tags: 内存对齐, 内存; source: 高频 -->
# 什么是内存对齐？为什么 CPU 需要内存对齐访问？

**内存对齐（Memory Alignment）** 是指数据在内存中存储的起始地址必须是其自身大小（或某个固定值）的整数倍。

**CPU 需要对齐的原因：**
1. **硬件限制**：大多数 CPU 对非对齐地址的访问会触发额外的内存读取操作，甚至在某些平台（如 ARM 早期版本）直接引发硬件异常。
2. **性能优化**：对齐的数据可以在一次内存总线事务中完成读写；非对齐数据可能需要两次读取后再拼接，性能下降。
3. **原子操作要求**：原子操作（如 `sync/atomic`）通常要求操作数是对齐的。

**Go 中各类型对齐要求（amd64）：**

| 类型 | 大小 | 对齐值 |
|------|------|--------|
| `bool`, `int8`, `uint8` | 1 | 1 |
| `int16`, `uint16` | 2 | 2 |
| `int32`, `float32` | 4 | 4 |
| `int64`, `float64`, `pointer` | 8 | 8 |

**查看方式：**
```go
import "unsafe"

type T struct {
    a bool    // 1 byte
    b int64   // 8 bytes
}

fmt.Println(unsafe.Sizeof(T{}))    // 16（含 padding）
fmt.Println(unsafe.Alignof(T{}))   // 8
```

<!-- id: go-memory-008; difficulty: 1; tags: pprof, 内存; source: 高频 -->
# Go 中如何使用 `pprof` 分析堆内存占用？有哪些基本步骤？

`pprof` 是 Go 内置的性能分析工具，可分析 CPU、内存、Goroutine 等。

**步骤一：引入 pprof 端点（HTTP 服务）**
```go
import (
    "net/http"
    _ "net/http/pprof" // 副作用导入，自动注册路由
)

func main() {
    go http.ListenAndServe(":6060", nil) // 暴露 pprof 端点
    // ... 你的业务代码
}
```

**步骤二：采集 heap profile**
```bash
# 采集当前堆内存快照（inuse_space：当前存活对象）
go tool pprof http://localhost:6060/debug/pprof/heap

# 下载后本地分析
curl -o mem.prof http://localhost:6060/debug/pprof/heap
go tool pprof mem.prof
```

**步骤三：常用交互命令**
```bash
(pprof) top10          # 按内存占用排序前10
(pprof) top10 -cum     # 按累计分配排序
(pprof) list funcName  # 查看某函数的行级内存分配
(pprof) web            # 在浏览器中打开火焰图（需安装 graphviz）
```

**步骤四：使用 `-alloc_space` 查看历史分配（而非当前存活）**
```bash
go tool pprof -alloc_space http://localhost:6060/debug/pprof/heap
```

<!-- id: go-memory-009; difficulty: 2; tags: 逃逸分析, 内存; source: 高频 -->
# 以下哪些情况会导致变量逃逸到堆？请分别解释原因。

**1. 函数返回局部变量的指针**
```go
func newInt() *int {
    x := 10
    return &x // x 逃逸：调用方持有 x 的引用，x 生命周期超过函数
}
```

**2. 赋值给 interface{} / any**
```go
func escape() {
    x := 42
    var i interface{} = x // x 逃逸：interface 内部用指针存储值
    fmt.Println(i)        // fmt.Println 参数为 interface{}，也会导致逃逸
}
```

**3. 闭包捕获外部变量**
```go
func closure() func() int {
    x := 0
    return func() int {
        x++ // x 被闭包捕获，生命周期超过外层函数，逃逸到堆
        return x
    }
}
```

**4. 编译期无法确定大小的切片**
```go
func dynSlice(n int) []int {
    s := make([]int, n) // n 运行时才知道，且可能较大，逃逸到堆
    return s
}
// 注意：make([]int, 8) 这类小的固定大小可能不逃逸
```

**5. 发送到 channel 的指针**
```go
func sendPtr(ch chan<- *int) {
    x := 1
    ch <- &x // x 逃逸：其他 goroutine 可能访问
}
```

**6. 大对象（超过栈空间限制）**：编译器会将超过一定大小（通常 64KB）的对象直接分配到堆。

<!-- id: go-memory-010; difficulty: 2; tags: 逃逸分析, 内存; source: 高频 -->
# 为什么向 `fmt.Println` 传参会导致逃逸？如何验证？

**原因：`fmt.Println` 的签名接收 `interface{}`**

```go
// fmt 包签名
func Println(a ...interface{}) (n int, err error)
// Go 1.18+ any 是 interface{} 的别名
func Println(a ...any) (n int, err error)
```

当一个具体类型（如 `int`、`struct`）赋值给 `interface{}` 时：
1. 编译器需要创建一个包含**类型指针 + 数据指针**的 `iface` 结构。
2. 数据指针指向实际值，该值必须在堆上（因为 interface 的使用者不知道它的具体生命周期）。
3. 因此，传给 `interface{}` 的值会逃逸到堆。

**验证：**
```go
// main.go
package main

import "fmt"

func main() {
    x := 42
    fmt.Println(x) // x 会逃逸吗？
}
```

```bash
$ go build -gcflags="-m" main.go
./main.go:7:14: x escapes to heap
./main.go:7:14: main ... argument does not escape
```

**优化方案：**
```go
// 避免逃逸的写法：使用 strconv 或直接格式化
s := strconv.Itoa(x)
fmt.Println(s) // s (string) 仍逃逸，但避免了 int boxing

// 性能敏感场景：使用 zap、zerolog 等零分配日志库
logger.Info("value", zap.Int("x", x)) // 不逃逸
```

<!-- id: go-memory-011; difficulty: 2; tags: 逃逸分析, 内存; source: 高频 -->
# 闭包捕获变量时，捕获的是值还是引用？请结合逃逸分析说明。

**闭包捕获的是变量的引用（地址），而不是值的拷贝。**

```go
func main() {
    x := 10
    add := func() {
        x++ // 捕获 x 的引用
    }
    add()
    fmt.Println(x) // 输出 11，而非 10
}
```

**逃逸分析视角：**

由于闭包持有外层变量的引用，且闭包本身可能逃逸（被返回、传给 goroutine 等），外层变量的生命周期就无法局限于当前函数栈帧，因此**被捕获的变量会逃逸到堆**。

```go
func makeCounter() func() int {
    count := 0           // count 逃逸到堆
    return func() int {
        count++
        return count
    }
}
```

```bash
$ go build -gcflags="-m" .
./main.go:4:2: moved to heap: count
```

**经典陷阱：循环变量捕获**

```go
// ❌ 错误：所有闭包共享同一个 i
funcs := make([]func(), 3)
for i := 0; i < 3; i++ {
    funcs[i] = func() { fmt.Println(i) }
}
// 全部输出 3（循环结束后 i=3）

// ✅ 正确：为每次迭代创建独立变量
for i := 0; i < 3; i++ {
    i := i // 创建新变量，每个闭包捕获不同的 i
    funcs[i] = func() { fmt.Println(i) }
}
// 输出 0 1 2（Go 1.22+ 已默认修复此问题）
```

<!-- id: go-memory-012; difficulty: 2; tags: GC, 写屏障; source: 高频 -->
# 什么是 GC 写屏障（Write Barrier）？为什么三色标记算法需要它？

写屏障是在并发 GC 标记期间由编译器插入的指针写入辅助逻辑，用来防止用户程序和 GC 并发执行时漏标仍可达对象。

三色标记中最危险的情况是：黑色对象已经扫描完，却新增对白色对象的引用；同时原本从灰色对象到该白色对象的路径被删除。这样白色对象仍被程序使用，但 GC 可能误回收。

Go 1.8 起使用混合写屏障，结合删除屏障和有条件的插入屏障：

```go
// 伪代码：*slot = ptr
shade(*slot)              // 删除屏障：保护被覆盖的旧指针
if currentStackIsGrey() {
    shade(ptr)            // 插入屏障：当前栈未扫描完成时保护新指针
}
*slot = ptr
```

核心目标是让栈只在标记开始附近扫描一次，而不需要在标记结束前再次 STW 重扫所有 goroutine 栈。屏障只在 GC 标记阶段启用，并且主要作用于堆指针写入；它会带来写指针开销，所以 Go 尽量把 STW 时间和屏障成本折中到可接受范围。

<!-- id: go-memory-013; difficulty: 2; tags: GC, GOGC; source: 高频 -->
# Go GC 有哪几种触发方式？分别在什么场景下发生？

Go GC 有三种触发方式：

**1. 堆内存触发（最常见）**

当堆大小达到上次 GC 后存活对象大小的 `(1 + GOGC/100)` 倍时自动触发。

```go
// GOGC=100（默认），上次GC后存活 50MB
// 当堆增长到 100MB 时触发下一次 GC
```

**2. 定时触发**

若超过 **2 分钟**没有触发 GC，Go runtime 会强制触发一次，防止堆内存长时间不被清理。

**3. 手动触发**

```go
import "runtime"

runtime.GC() // 强制触发一次完整 GC，会 STW
```

**适用场景：**
- 在已知大量对象即将变为垃圾之前（如清空缓存后），主动触发 GC 归还内存。
- 压测前清理历史分配，获得干净的基准。

**4. 内存压力触发（Go 1.19+，`SetMemoryLimit`）**

```go
import "runtime/debug"

// 设置内存上限为 500MB，接近上限时会更频繁 GC
debug.SetMemoryLimit(500 * 1024 * 1024)
```

**GC 阶段 STW 时间：**
- Go 1.14+ 混合写屏障后，STW 通常 < 1ms（仅在 GC 开始和结束各有一次短暂 STW）。

<!-- id: go-memory-014; difficulty: 2; tags: 内存对齐, 内存; source: 高频 -->
# 如何通过调整 struct 字段顺序来减少内存占用？请举例说明。

由于内存对齐规则，struct 字段之间可能存在**填充字节（padding）**。合理排列字段可消除填充，减少 struct 大小。

**原则：按字段大小从大到小排列（或相同大小的字段放在一起）。**

**反例：字段排列不佳**
```go
type Bad struct {
    a bool    // 1 byte  [0]
    // 7 bytes padding
    b int64   // 8 bytes [8-15]
    c bool    // 1 byte  [16]
    // 7 bytes padding
    d int64   // 8 bytes [24-31]
}
// unsafe.Sizeof(Bad{}) = 32 bytes
```

**优化后：字段按大小降序排列**
```go
type Good struct {
    b int64   // 8 bytes [0-7]
    d int64   // 8 bytes [8-15]
    a bool    // 1 byte  [16]
    c bool    // 1 byte  [17]
    // 6 bytes padding（末尾对齐到8字节）
}
// unsafe.Sizeof(Good{}) = 24 bytes（节省 8 bytes，25%）
```

**验证工具：**
```go
import (
    "fmt"
    "unsafe"
)

fmt.Printf("Bad:  size=%d, align=%d\n",
    unsafe.Sizeof(Bad{}), unsafe.Alignof(Bad{}))
fmt.Printf("Good: size=%d, align=%d\n",
    unsafe.Sizeof(Good{}), unsafe.Alignof(Good{}))

// 推荐使用 fieldalignment 工具自动检测
// go install golang.org/x/tools/go/analysis/passes/fieldalignment/cmd/fieldalignment@latest
// fieldalignment ./...
```

**实际影响：** 对于高频分配的小 struct（如链表节点、消息结构），优化字段顺序可显著降低内存占用和 GC 压力。

<!-- id: go-memory-015; difficulty: 2; tags: 内存泄漏, slice, 内存; source: 高频 -->
# slice 截取操作为什么可能造成内存泄漏？如何安全地从大 slice 中截取小片段？

**原因：slice 截取共享底层数组**

Go 中 slice 由三部分组成：`{指针, 长度, 容量}`。截取操作创建新 slice，但**共享同一底层数组**：

```go
big := make([]byte, 1<<20) // 1MB 大数组
// ... 填充数据

small := big[:10] // small 仅需 10 字节
                  // 但 big 底层 1MB 数组无法被 GC
                  // 因为 small 持有其指针
```

只要 `small` 存活，整个 1MB 的底层数组就无法被 GC 回收，造成事实上的内存泄漏。

**安全截取方式：使用 copy 创建独立副本**

```go
// ✅ 方式1：append 到空 slice（最常用）
small := append([]byte(nil), big[:10]...)

// ✅ 方式2：显式 copy
small := make([]byte, 10)
copy(small, big[:10])

// 此后 big 可以被 GC 回收（如果没有其他引用）
big = nil
```

**类似问题：string 截取**
```go
bigStr := strings.Repeat("x", 1<<20)
// ❌ 底层字节数组共享
smallStr := bigStr[:10]

// ✅ 强制拷贝
smallStr := string([]byte(bigStr[:10]))
// 或 Go 1.20+：
smallStr := strings.Clone(bigStr[:10])
```

<!-- id: go-memory-016; difficulty: 2; tags: 内存泄漏, GC; source: 高频 -->
# 为什么 Go 的 map 在大量删除元素后内存不会归还给 OS？如何解决？

大量删除 map 元素后，`len(m)` 会下降，但 map 的内部存储通常不会按删除比例自动缩小，因此进程内存不一定马上下降。

原因是 map 为了避免频繁扩缩容和重新哈希，会保留已经分配的表结构以便后续复用。Go 1.24 对 map 内部实现做过调整，但使用层面的结论仍然成立：删除元素不等于归还 map 的底层存储。

```go
m := make(map[int][]byte)
for i := 0; i < 1_000_000; i++ {
    m[i] = make([]byte, 128)
}
for k := range m {
    delete(m, k)
}
// len(m) == 0，但 map 自身的内部存储仍可能保留
```

解决方式：

- 不再使用时设为 `nil`，让 GC 回收整个 map。
- 仍要继续使用时重建：`m = make(map[K]V, expectedSize)`。
- 缓存类结构定期按当前存活数据复制到新 map。
- 大 value 尽量避免长期被 map 或小切片间接持有。

`sync.Map` 不是通用的缩容方案，它适合读多写少且 key 集合相对稳定的并发场景；普通 map 加锁往往更可控。

<!-- id: go-memory-017; difficulty: 2; tags: sync.Pool, GC, 内存; source: 高频 -->
# 使用 `sync.Pool` 时有哪些常见的使用错误？如何正确使用？

`sync.Pool` 适合缓存临时对象，降低短生命周期对象的分配压力；它不是生命周期管理工具，池中对象随时可能在 GC 后被丢弃。

常见错误：

- 归还前不重置状态，导致下次请求读到脏数据。
- 把连接、文件句柄、锁、事务、带外部状态的对象放进 Pool。
- 归还后继续持有或异步使用对象，造成数据竞争。
- 缓存超大 buffer 且不按容量丢弃，导致内存峰值被长期保留。
- `New` 为 nil 时直接类型断言；`Get` 可能返回 nil，这是允许的。

```go
var bufPool = sync.Pool{New: func() any {
    return bytes.NewBuffer(make([]byte, 0, 4096))
}}

func withBuffer(fn func(*bytes.Buffer) error) error {
    buf := bufPool.Get().(*bytes.Buffer)
    buf.Reset()
    defer func() {
        if buf.Cap() <= 64<<10 {
            bufPool.Put(buf)
        }
    }()
    return fn(buf)
}
```

使用原则：对象只在一次同步调用内借用；归还前清理；容量过大直接丢弃；用 benchmark 和 heap profile 证明 Pool 确实降低了分配和 GC 压力。

<!-- id: go-memory-018; difficulty: 2; tags: pprof, 内存泄漏; source: 高频 -->
# 如何使用 `pprof` 的 goroutine profile 定位 goroutine 泄漏？

**Goroutine 泄漏的特征：** 随着程序运行，goroutine 数量持续增长，不会回落。

**步骤一：暴露 pprof 端点**
```go
import _ "net/http/pprof"
go http.ListenAndServe(":6060", nil)
```

**步骤二：采集 goroutine profile**
```bash
# 在浏览器中查看所有 goroutine 的堆栈（可读性好）
http://localhost:6060/debug/pprof/goroutine?debug=2

# 使用命令行工具分析
go tool pprof http://localhost:6060/debug/pprof/goroutine
```

**步骤三：对比两个时间点的 goroutine 数量**
```bash
# 采集基准快照
curl -o goroutine1.prof http://localhost:6060/debug/pprof/goroutine
# 等待一段时间（模拟流量）
sleep 60
# 采集第二个快照
curl -o goroutine2.prof http://localhost:6060/debug/pprof/goroutine

# 对比差异
go tool pprof -base goroutine1.prof goroutine2.prof
(pprof) top   # 增量最大的调用栈即为泄漏点
```

**步骤四：代码中直接获取 goroutine 数量**
```go
import "runtime"

func printGoroutineCount() {
    fmt.Println("goroutines:", runtime.NumGoroutine())
}
```

**常见泄漏模式（从堆栈中识别）：**
```go
// 泄漏特征堆栈示例：
// goroutine 1234 [chan receive, 5 minutes]:  ← 阻塞在 channel 读
// goroutine 5678 [select, 10 minutes]:       ← select 永久阻塞
// goroutine 9012 [IO wait]:                  ← 网络 IO 无超时
```

<!-- id: go-memory-019; difficulty: 2; tags: 内存, GC; source: 高频 -->
# `runtime.ReadMemStats` 中常用字段的含义是什么？如何通过它监控内存状况？

`runtime.ReadMemStats` 填充一个 `runtime.MemStats` 结构，包含详细的内存统计信息。

**注意：调用 `ReadMemStats` 会触发一次短暂的 STW！生产环境谨慎使用。**

```go
import (
    "fmt"
    "runtime"
)

func printMemStats() {
    var m runtime.MemStats
    runtime.ReadMemStats(&m)

    fmt.Printf("Alloc      = %v MiB\n", m.Alloc/1024/1024)       // 当前堆上存活对象占用
    fmt.Printf("TotalAlloc = %v MiB\n", m.TotalAlloc/1024/1024)  // 历史累计分配（单调递增）
    fmt.Printf("Sys        = %v MiB\n", m.Sys/1024/1024)         // 从 OS 申请的总内存
    fmt.Printf("HeapInuse  = %v MiB\n", m.HeapInuse/1024/1024)   // 正在使用的堆 span
    fmt.Printf("HeapIdle   = %v MiB\n", m.HeapIdle/1024/1024)    // 空闲但未归还 OS 的堆
    fmt.Printf("HeapReleased=%v MiB\n", m.HeapReleased/1024/1024)// 已归还 OS 的内存
    fmt.Printf("NumGC      = %v\n", m.NumGC)                      // GC 次数
    fmt.Printf("PauseTotalNs=%v ms\n", m.PauseTotalNs/1e6)       // 总 STW 暂停时间
    fmt.Printf("LastGC     = %v\n", m.LastGC)                     // 上次 GC 的 Unix 时间（纳秒）
}
```

**关键字段速查：**

| 字段 | 说明 |
|------|------|
| `Alloc` | 当前堆上存活对象字节数 |
| `HeapInuse` | span 中被对象使用的字节数（>=Alloc）|
| `HeapIdle` | span 中空闲可归还的字节数 |
| `GCSys` | GC 元数据占用的内存 |
| `StackInuse` | goroutine 栈使用量 |
| `NumGC` | 完成的 GC 次数 |

**生产监控建议：** 通过 Prometheus + `go_memstats_*` 指标（client_golang 自动采集）替代直接调用 `ReadMemStats`，避免 STW。

<!-- id: go-memory-020; difficulty: 2; tags: 内存, 栈堆; source: 高频 -->
# Go 的栈是如何动态扩容和收缩的？`goroutine` 初始栈大小是多少？

goroutine 初始栈很小，现代 Go 通常从 2KB 左右开始，随后按需增长。这样可以支持大量 goroutine，而不必为每个 goroutine 预留线程级大栈。

Go 使用连续栈。每次函数调用前，编译器插入栈空间检查；空间不足时 runtime 会分配更大的新栈，把旧栈内容复制过去，并修正栈内指针。

```go
func recursive(n int) {
    var buf [1024]byte
    _ = buf
    if n > 0 { recursive(n - 1) }
}
```

收缩通常发生在 GC 期间：如果 goroutine 的栈实际使用远小于已分配空间，runtime 可以把栈复制到更小的区域。栈扩缩容对业务代码透明；程序可以持有局部变量地址，编译器和 runtime 会通过逃逸分析、栈复制指针修正等机制保证安全。

需要关注的是无限递归、超大栈帧和大量阻塞 goroutine。排查时结合 goroutine profile、heap profile 和 `debug.SetMaxStack`；不要把大对象放在深递归路径上，也不要用 goroutine 泄漏换取异步处理。

<!-- id: go-memory-021; difficulty: 3; tags: GC, 写屏障, 三色标记; source: 高频 -->
# 详解 Go 混合写屏障（Hybrid Write Barrier）的工作原理，它解决了什么问题？与 Dijkstra 写屏障有何区别？

Go 的混合写屏障从 Go 1.8 起用于并发 GC，它解决的核心问题是：在保持并发标记正确性的同时，避免标记结束前再次 STW 重扫所有 goroutine 栈。

Dijkstra 插入屏障在写入新指针时把新对象染灰，可以防止黑对象指向白对象。但 Go 1.5 的做法不在栈写入上加屏障，因此标记结束前需要 STW 重扫栈，goroutine 数量越多暂停越不可控。

Go 混合写屏障的思路：

```go
// *slot = ptr
shade(*slot)              // Yuasa 删除屏障：保护被删除的旧引用
if currentStackIsGrey() {
    shade(ptr)            // Dijkstra 插入屏障：当前栈尚未扫描时保护新引用
}
*slot = ptr
```

GC 开始后，goroutine 栈会被扫描并逐步从灰色变为黑色。当前栈仍是灰色时，新写入的指针也要染灰；当前栈已经黑色后，删除屏障足以保证不会漏掉通过堆可达的对象。这样 Go 不需要在并发标记结束时为所有栈做第二次 STW 扫描。

它与纯 Dijkstra 屏障的区别是：混合屏障同时保护被覆盖的旧引用，并且插入屏障是和栈颜色相关的条件逻辑，而不是无条件 shade 新值。

<!-- id: go-memory-022; difficulty: 3; tags: 逃逸分析, 内存, 栈堆; source: 高频 -->
# 如何通过逃逸分析优化一个高频调用函数的性能？请给出一个完整的优化案例。

**场景：高频调用的日志格式化函数**

```go
// ❌ 优化前：大量逃逸，每次调用分配堆内存
type LogEntry struct {
    Level   string
    Message string
    Fields  map[string]interface{}
}

func buildLog(level, msg string, fields map[string]interface{}) *LogEntry {
    return &LogEntry{ // *LogEntry 逃逸
        Level:   level,
        Message: msg,
        Fields:  fields, // map 本身已在堆上
    }
}

func logRequest(url string, status int) {
    entry := buildLog("INFO", url, map[string]interface{}{ // map literal 逃逸
        "status": status,   // int 装箱到 interface{} 逃逸
    })
    writeLog(entry)
}
```

**逃逸分析结果：**
```bash
$ go build -gcflags="-m" .
./main.go:12:9: &LogEntry{...} escapes to heap
./main.go:18:31: map[string]interface{}{...} escapes to heap
./main.go:19:13: status escapes to heap
```

**优化策略：**

```go
// ✅ 优化1：避免 interface{} 装箱，使用具体类型字段
type LogEntry struct {
    Level   string
    Message string
    // 用具体类型替代 map[string]interface{}
    StatusCode int
    URL        string
}

// ✅ 优化2：使用 sync.Pool 复用 LogEntry
var entryPool = sync.Pool{
    New: func() interface{} { return new(LogEntry) },
}

func logRequest(url string, status int) {
    entry := entryPool.Get().(*LogEntry)
    entry.Level = "INFO"
    entry.Message = url
    entry.StatusCode = status
    entry.URL = url
    writeLog(entry)
    // 重置并归还
    *entry = LogEntry{}
    entryPool.Put(entry)
}

// ✅ 优化3：对小 struct 直接传值而非指针（让其留在栈上）
func logRequestV2(url string, status int) {
    entry := LogEntry{ // 不逃逸，分配在栈上
        Level:      "INFO",
        Message:    url,
        StatusCode: status,
    }
    writeLogValue(entry) // 传值
}
```

**基准测试对比：**
```go
// 使用 -benchmem 验证优化效果
// go test -bench=. -benchmem -count=5

// Before: BenchmarkLog-8  500000  2341 ns/op  320 B/op  5 allocs/op
// After:  BenchmarkLog-8  5000000  210 ns/op  0 B/op    0 allocs/op
```

<!-- id: go-memory-023; difficulty: 3; tags: GC, 内存, GOGC; source: 高频 -->
# Go 1.19 引入的 `SetMemoryLimit` 是什么？它与 `GOGC` 如何配合使用？

`debug.SetMemoryLimit` 和 `GOMEMLIMIT` 从 Go 1.19 起提供 runtime 软内存上限。它限制的是 Go runtime 管理的内存目标，不是操作系统层面的硬限制，也不完整覆盖 cgo、mmap、其他进程或内核缓存。

```go
old := debug.SetMemoryLimit(512 << 20)
_ = old
```

`GOGC` 控制堆相对增长目标，例如默认 100 表示下一轮 GC 目标大致与上轮存活堆相关；`GOMEMLIMIT` 是绝对上限压力信号。两者同时存在时，runtime 会在吞吐、GC CPU 和内存上限之间计算更保守的 GC 目标，而不是简单地“任一条件触发”。

推荐做法：

- 容器中把 `GOMEMLIMIT` 设为低于容器 memory limit 的值，例如预留 10% 到 20% 给非 Go 内存和突发。
- 保留合理 `GOGC`，再用压测观察 GC CPU、延迟和 RSS。
- `GOGC=off` 加内存上限只适合明确想用内存换 CPU，且已经充分评估峰值和延迟的特殊场景，不应作为默认建议。
- 如果长期接近 limit，GC 会变得非常频繁，吞吐可能明显下降；此时要减少存活集或提高内存配额。

<!-- id: go-memory-024; difficulty: 3; tags: 内存, GC, 内存泄漏; source: 高频 -->
# 详述 `time.Ticker` 和 `time.Timer` 不 Stop 导致泄漏的底层原因，以及正确的使用模式。

`time.Timer` 和 `time.Ticker` 的泄漏讨论要区分 Go 版本和具体生命周期。

Go 1.23 起，未被引用且尚未 Stop 的 timer/ticker 可以被 GC 回收，timer channel 也改为同步语义，`Stop`/`Reset` 后不会再收到旧的过期值。旧版本中，未触发的 `time.After` 或未 Stop 的 ticker 更容易造成对象长期存活。

即便如此，只要有 goroutine 在 `for range ticker.C` 或 select 中等待，仍然必须通过 context 或关闭信号让 goroutine 退出，并调用 `Stop` 表达生命周期结束：

```go
func run(ctx context.Context) {
    ticker := time.NewTicker(time.Second)
    defer ticker.Stop()
    for {
        select {
        case <-ticker.C:
            doWork()
        case <-ctx.Done():
            return
        }
    }
}
```

循环超时不要每轮无脑创建长期 `time.After`；高频路径可复用 timer：

```go
timer := time.NewTimer(timeout)
defer timer.Stop()
for {
    select {
    case <-timer.C:
        return ErrTimeout
    case v := <-ch:
        handle(v)
        if !timer.Stop() {
            select {
            case <-timer.C:
            default:
            }
        }
        timer.Reset(timeout)
    }
}
```

如果项目模块仍是 Go 1.22 或通过 `GODEBUG=asynctimerchan=1` 使用旧语义，`Reset` 前仍需遵守 Stop-and-drain 模式。

<!-- id: go-memory-025; difficulty: 3; tags: 内存对齐, 内存; source: 高频 -->
# `unsafe.Sizeof`、`unsafe.Alignof`、`unsafe.Offsetof` 的区别是什么？如何用它们分析 struct 内存布局？

**三个函数的含义：**

| 函数 | 返回值 | 说明 |
|------|--------|------|
| `unsafe.Sizeof(x)` | `uintptr` | x 类型在内存中占用的**字节数**（含 padding）|
| `unsafe.Alignof(x)` | `uintptr` | x 类型的**对齐要求**（地址必须是此值的倍数）|
| `unsafe.Offsetof(x.f)` | `uintptr` | 字段 f 在 struct x 中的**字节偏移量** |

**完整分析示例：**
```go
package main

import (
    "fmt"
    "unsafe"
)

type Example struct {
    A bool    // 1 byte,  align=1
    B int32   // 4 bytes, align=4
    C bool    // 1 byte,  align=1
    D int64   // 8 bytes, align=8
    E bool    // 1 byte,  align=1
}

func main() {
    var e Example

    fmt.Printf("Sizeof(Example)   = %d\n", unsafe.Sizeof(e))   // 32
    fmt.Printf("Alignof(Example)  = %d\n", unsafe.Alignof(e))  // 8

    fmt.Printf("Offsetof(A) = %d\n", unsafe.Offsetof(e.A)) // 0
    fmt.Printf("Offsetof(B) = %d\n", unsafe.Offsetof(e.B)) // 4  (A=1 + 3 padding)
    fmt.Printf("Offsetof(C) = %d\n", unsafe.Offsetof(e.C)) // 8  (B=4)
    fmt.Printf("Offsetof(D) = %d\n", unsafe.Offsetof(e.D)) // 16 (C=1 + 7 padding)
    fmt.Printf("Offsetof(E) = %d\n", unsafe.Offsetof(e.E)) // 24
    // 末尾 7 bytes padding（对齐到 8）→ 总计 32 bytes
}
```

**内存布局图：**
```go
// offset: 0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
//         [A] [  padding 3B ] [    B  int32     ] [C] [   padding 7B      ]
// offset:16  17  18  19  20  21  22  23  24  25  26  27  28  29  30  31
//         [            D  int64             ] [E] [     padding 7B        ]
```

**优化后（字段重排）：**
```go
type Optimized struct {
    D int64  // 8 bytes [0-7]
    B int32  // 4 bytes [8-11]
    A bool   // 1 byte  [12]
    C bool   // 1 byte  [13]
    E bool   // 1 byte  [14]
    // 1 byte padding [15]
}
// unsafe.Sizeof(Optimized{}) = 16 bytes（节省 50%！）
```

**实用工具：**
```go
// 使用 go-structlayout 可视化 struct 布局
// go install honnef.co/go/tools/cmd/structlayout@latest
// go install honnef.co/go/tools/cmd/structlayout-pretty@latest
// structlayout -json mypackage MyStruct | structlayout-pretty
```

<!-- id: go-memory-026; difficulty: 3; tags: GC, 内存, 三色标记; source: 高频 -->
# Go GC 中的"标记辅助（Mark Assist）"机制是什么？它对应用延迟有何影响？

**Mark Assist（标记辅助）的背景：**

Go GC 是并发的，标记工作（扫描对象图）主要由后台 GC goroutine 完成。但若应用程序分配内存的速度超过 GC 标记的速度，堆会无限增长，直至 OOM。

**Mark Assist 机制：**

当某个 goroutine 进行内存分配时，如果 GC 的标记进度落后（分配速率 > 标记速率），该 goroutine 会被强制参与标记工作，完成一定量的扫描后才能继续自己的分配。

```go
// 伪代码：每次 mallocgc（内存分配）时检查
func mallocgc(size uintptr, ...) unsafe.Pointer {
    // ...
    if gcBlackenEnabled != 0 { // GC 正在标记阶段
        // 计算需要辅助标记的工作量（与本次分配大小成比例）
        assistWorkNeeded := size * gcAssistRatio
        if assistWorkNeeded > 0 {
            gcAssistAlloc(assistWorkNeeded) // 强制该 goroutine 做标记工作
        }
    }
    // 执行实际分配
}
```

**对应用延迟的影响：**

```go
// Mark Assist 会增加单次内存分配的延迟！
// 分配密集型的代码路径在 GC 标记阶段会变慢

// 使用 GODEBUG=gccheckmark=1 观察 mark assist 情况
// 使用 pprof 的 CPU profile 可以看到 runtime.gcAssistAlloc 调用

// 典型表现：
// - GC 期间 P99 延迟显著升高
// - CPU profile 中出现大量 gcAssistAlloc

// 优化方向：
// 1. 减少 GC 期间的内存分配（减少逃逸）
// 2. 使用 sync.Pool 复用对象
// 3. 调高 GOGC，减少 GC 频率
// 4. 使用 GOMEMLIMIT 配合低 GOGC
```

**可观测性：**
```go
// 在 trace 中可以看到 mark assist 事件
import "runtime/trace"

f, _ := os.Create("trace.out")
trace.Start(f)
defer trace.Stop()

// 分析：go tool trace trace.out
// 在浏览器中可以看到每个 goroutine 的 mark assist 时间段
```

<!-- id: go-memory-027; difficulty: 3; tags: pprof, 内存, 内存泄漏; source: 高频 -->
# 如何使用 `go tool pprof` 对比两个内存快照来定位内存增长的根因？请给出完整操作流程。

**场景：服务运行一段时间后内存持续增长，需要找出根因。**

**步骤一：确保服务暴露 pprof 端点**
```go
import _ "net/http/pprof"
go http.ListenAndServe(":6060", nil)
```

**步骤二：采集两个时间点的 heap profile**
```bash
# T1 时刻（基准）：采集 inuse_space（当前存活对象）
curl -s "http://localhost:6060/debug/pprof/heap" > heap_t1.prof

# 等待一段时间（让内存问题复现）
sleep 300

# T2 时刻（问题出现后）
curl -s "http://localhost:6060/debug/pprof/heap" > heap_t2.prof
```

**步骤三：差量分析（-base 参数）**
```bash
# 以 T1 为基准，分析 T2 中新增的内存分配
go tool pprof -base heap_t1.prof heap_t2.prof

(pprof) top10
# 输出：相比基准，内存增量最大的 10 个调用栈
# Flat    Flat%   Sum%    Cum     Cum%
# 45.2MB  68.3%  68.3%  45.2MB  68.3%  cache.(*LRUCache).Set

(pprof) list cache.Set
# 显示 cache.Set 函数每行的内存增量

(pprof) web
# 在浏览器中显示差量调用图（红色节点 = 内存增长来源）
```

**步骤四：区分 alloc_space 和 inuse_space**
```bash
# inuse_space：当前存活的对象（定位"持续持有"的内存 → 内存泄漏）
go tool pprof -inuse_space -base heap_t1.prof heap_t2.prof

# alloc_space：历史累计分配（定位"高频分配"→ GC 压力大）
go tool pprof -alloc_space -base heap_t1.prof heap_t2.prof
```

**步骤五：结合 goroutine profile 综合分析**
```bash
# 若 inuse_space 增长但 goroutine 数量也增长，很可能是 goroutine 泄漏
curl -s "http://localhost:6060/debug/pprof/goroutine?debug=2" > goroutine.txt
grep -c "^goroutine" goroutine.txt # 统计 goroutine 总数

# 查看按 goroutine 数量排序的等待状态
go tool pprof http://localhost:6060/debug/pprof/goroutine
(pprof) top  # 哪个调用栈积累了最多的 goroutine
```

**常见根因映射：**

| pprof 现象 | 可能根因 |
|-----------|---------|
| `inuse_space` 持续增长 | 缓存无上限、slice/map 不释放 |
| `alloc_space` 极高但 `inuse` 正常 | 高频临时分配，GC 负担重 |
| goroutine 数量持续增加 | goroutine 泄漏 |
| `runtime.mallocgc` 占比高 | 大量小对象分配，需用 sync.Pool |

<!-- id: go-memory-028; difficulty: 3; tags: 内存, GC, 内存泄漏; source: 高频 -->
# 如何设计一个生产级别的无泄漏 goroutine 并发模式？请结合 context 和 WaitGroup 给出完整示例。

生产级 goroutine 模式的底线是：每个 goroutine 有退出条件，发送方不会永久阻塞，关闭流程不会和提交任务并发触发 send-on-closed-channel。

```go
type WorkerPool struct {
    ctx context.Context
    cancel context.CancelFunc
    jobs chan Job
    wg sync.WaitGroup
    once sync.Once
    closed atomic.Bool
    submitMu sync.RWMutex
    done chan struct{}
}

func NewWorkerPool(parent context.Context, n int) *WorkerPool {
    ctx, cancel := context.WithCancel(parent)
    p := &WorkerPool{ctx: ctx, cancel: cancel, jobs: make(chan Job, n*2), done: make(chan struct{})}
    for i := 0; i < n; i++ {
        p.wg.Add(1)
        go p.worker()
    }
    return p
}

func (p *WorkerPool) worker() {
    defer p.wg.Done()
    for {
        select {
        case <-p.ctx.Done():
            return
        case job, ok := <-p.jobs:
            if !ok { return }
            process(p.ctx, job)
        }
    }
}

func (p *WorkerPool) Submit(ctx context.Context, job Job) error {
    p.submitMu.RLock()
    defer p.submitMu.RUnlock()
    if p.closed.Load() { return ErrClosed }
    select {
    case p.jobs <- job:
        return nil
    case <-ctx.Done():
        return ctx.Err()
    case <-p.ctx.Done():
        return p.ctx.Err()
    }
}

func (p *WorkerPool) Shutdown(ctx context.Context) error {
    p.once.Do(func() {
        p.closed.Store(true)
        go func() {
            p.submitMu.Lock()
            close(p.jobs)
            p.submitMu.Unlock()
            p.wg.Wait()
            p.cancel()
            close(p.done)
        }()
    })
    select {
    case <-p.done:
        return nil
    case <-ctx.Done():
        p.cancel()
        return ctx.Err()
    }
}
```

实际项目还要限制队列长度、给单个 job 设置 deadline、捕获并上报 panic、暴露队列深度和处理耗时指标。若可以引入依赖，`errgroup.WithContext` 更适合一组同生共死的 goroutine。

<!-- id: go-memory-029; difficulty: 3; tags: 内存, GC, sync.Pool; source: 高频 -->
# 如何实现一个基于 `sync.Pool` 的高性能零分配序列化缓冲区？请分析其内存优化原理。

`sync.Pool` 可以减少临时 buffer 分配，但不能保证任意 JSON 序列化零分配：`encoding/json` 在反射、字符串转义、接口处理等路径仍可能分配。更准确的目标是降低热路径的 buffer 分配和 GC 压力。

```go
var jsonBufPool = sync.Pool{New: func() any {
    return bytes.NewBuffer(make([]byte, 0, 4096))
}}

func WriteJSON(w http.ResponseWriter, status int, v any) error {
    buf := jsonBufPool.Get().(*bytes.Buffer)
    buf.Reset()
    defer func() {
        if buf.Cap() <= 64<<10 {
            jsonBufPool.Put(buf)
        }
    }()

    enc := json.NewEncoder(buf)
    enc.SetEscapeHTML(false)
    if err := enc.Encode(v); err != nil { return err }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    _, err := w.Write(buf.Bytes())
    return err
}
```

不要把 `buf.Bytes()` 返回给调用方后又立刻 Put 回池；归还后底层数组可能被其他请求复用。大响应要按容量阈值丢弃，避免一次峰值污染整个 Pool。是否真的优化，要用 `go test -bench . -benchmem` 和 heap profile 比较 `B/op`、`allocs/op`、P99 延迟。

<!-- id: go-memory-030; difficulty: 3; tags: GC, 内存, pprof; source: 高频 -->
# 如何系统性地对一个 Go 服务进行内存优化？请给出完整的排查与优化方法论。

Go 服务内存优化要按“建立基线 -> 定位 -> 修改 -> 同条件验证”的闭环做，不能先凭经验改代码。

1. 建立基线：记录 RSS、HeapAlloc、HeapInuse、HeapIdle、HeapReleased、NumGC、GC CPU、goroutine 数、QPS、请求大小和 P95/P99 延迟。先判断是存活集增长、累计分配过高、RSS 不回落，还是 goroutine 泄漏。

2. 定位来源：

```bash
go tool pprof http://127.0.0.1:6060/debug/pprof/heap
go tool pprof -alloc_space http://127.0.0.1:6060/debug/pprof/heap
go tool pprof http://127.0.0.1:6060/debug/pprof/goroutine
go tool trace trace.out
```

`inuse_space` 看当前谁占着内存，`alloc_space` 看历史分配热点；goroutine profile 用来找阻塞泄漏；trace 用来看 GC、调度和阻塞对延迟的影响。

3. 常见优化：预分配 slice/map；避免小切片持有大数组；减少 `[]byte`/`string` 往返转换；复用临时 buffer；限制缓存容量；给 goroutine、channel、HTTP/DB/Redis 调用设置 context 和超时；重建大量删除后的 map。

4. 调整 runtime：用 `GOGC` 和 `GOMEMLIMIT` 在 CPU、延迟、内存之间取平衡。接近 memory limit 时 GC 会更频繁，不能把它当作修复泄漏的手段。

5. 验证回归：在同样流量和数据规模下比较 `allocs/op`、`B/op`、RSS、GC 次数、GC CPU 和 P99。只有业务指标没有退化且 profile 热点下降，优化才算成立。
