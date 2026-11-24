# 并发编程

<!-- id: go-concurrency-001; difficulty: 1; tags: goroutine, 并发编程; source: 高频 -->
# goroutine 和线程有什么区别？

### 核心区别
goroutine 是 Go 运行时调度的轻量级执行单元；线程是操作系统内核调度的执行单元。Go 运行时会把大量 goroutine 多路复用到较少的 OS thread 上执行。

### 栈和创建成本
- OS 线程通常有较大的栈，具体默认值由系统和配置决定
- goroutine 初始栈很小，当前 Go 通常从 2KB 级别开始，并按需增长
- 创建 goroutine 不需要为每个任务创建内核线程，所以成本远低于线程

这就是 Go 可以承载大量并发任务的原因，但不是“无限创建”。每个 goroutine 仍然有栈、调度元数据和业务持有的资源，百万级 goroutine 需要看内存、阻塞点和调度压力。

### 调度模型
线程由 OS 调度；goroutine 由 Go runtime 的 GMP 调度器调度：

```text
G: goroutine
M: OS thread
P: processor，持有本地运行队列，数量受 GOMAXPROCS 影响
```

同一时刻真正并行执行 Go 代码的 goroutine 数量受 P 的数量限制；阻塞在 IO、channel、mutex、syscall 上的 goroutine 可以远多于 P。

### 通信和同步
Go 鼓励“通过通信共享内存”，常用 channel 表达消息传递和同步；也可以直接使用 `sync.Mutex`、`sync.RWMutex`、`atomic` 等共享内存同步工具。选择取决于所有权模型：

- channel：任务分发、结果汇总、生命周期信号
- mutex/atomic：保护共享状态、计数器、缓存

### 总结
| 维度 | OS thread | goroutine |
|------|-----------|-----------|
| 调度者 | 操作系统 | Go runtime |
| 栈 | 较大，系统相关 | 小栈起步，按需增长 |
| 创建成本 | 高 | 低 |
| 并发规模 | 通常较小 | 可以非常大，但受资源限制 |
| 并行执行 | 取决于 CPU/线程 | 取决于 `GOMAXPROCS` 和调度器 |

<!-- id: go-concurrency-002; difficulty: 1; tags: goroutine, GMP; source: 高频 -->
# 简单解释 Go 的 GMP 调度模型是什么？

GMP 是 Go runtime 的调度模型，用来把大量 goroutine 调度到 OS thread 上运行。

### G：Goroutine
G 表示一个 goroutine，保存栈、状态、待执行函数、调度信息等。G 是 Go 并发的基本单位。

### M：Machine
M 表示一个 OS thread，真正执行机器指令。M 要执行普通 Go 代码，通常必须持有一个 P。

### P：Processor
P 是调度资源，持有本地 run queue、缓存等。`GOMAXPROCS` 决定 P 的数量，也大体决定同一时刻最多有多少个 goroutine 并行执行 Go 代码。

```text
global run queue
        ^
        |
P0 local queue -> M0 -> running G
P1 local queue -> M1 -> running G
```

### 调度过程
- 新 goroutine 优先进入当前 P 的本地队列，本地队列满了才会放入全局队列
- P 没有可运行 G 时，会从全局队列、netpoller 或其他 P 的队列偷取任务
- G 发起阻塞 syscall 时，M 可能阻塞，P 会被交给其他 M 继续执行别的 G
- 网络 IO 通常由 runtime netpoller 集成，避免每个 IO 都占住一个线程

### GOMAXPROCS
```go
runtime.GOMAXPROCS(4)       // 设置 P 数量
n := runtime.GOMAXPROCS(0)  // 查询当前值
```

默认值由运行环境决定，通常基于可用 CPU，并会考虑容器 CPU 限制。调大它不一定更快；CPU 密集任务通常接近可用核心数即可，IO 密集任务的 goroutine 数量可以远大于它。

<!-- id: go-concurrency-003; difficulty: 2; tags: goroutine, GMP; source: 高频 -->
# goroutine 的栈是如何动态增长的？什么是栈分裂（stack split）？

### 当前机制：连续栈按需增长
goroutine 的初始栈很小，当前 Go 通常是 2KB 级别。函数调用的序言会检查剩余栈空间；如果不够，runtime 会分配更大的连续栈，把旧栈内容复制过去，并修正栈上的指针。

这套机制也叫 copying stack。Go 早期使用过 segmented stack，后来改为连续栈，避免分段栈在热路径上频繁增长/收缩带来的开销。

```go
func deep(n int) {
    var buf [1024]byte
    _ = buf
    if n > 0 {
        deep(n - 1)
    }
}
```

递归加深时栈会自动增长，但不是无限增长。

### 什么是 stack split
stack split 指函数进入时发现当前栈空间不足，转入 runtime 的栈增长逻辑。现代 Go 不再把栈拆成很多段，而是扩容并复制到更大的连续栈；这个名字更多是历史和实现层面的说法。

### 栈上限和溢出
每个 goroutine 栈有上限，64 位平台默认量级通常是 1GB，可用 `debug.SetMaxStack` 调整。超过上限一般是 runtime fatal error，不应当当作普通可 recover 的 panic 处理。

### 与逃逸分析的关系
Go 允许写 `return &local` 这类代码；如果指针需要在函数外继续使用，编译器会让变量逃逸到堆上，而不是把无效栈地址交给外部。栈复制时 runtime 主要修正栈内保存的指针。

### cgo 注意
cgo 和系统调用会涉及 OS 线程栈，不完全受 goroutine 栈增长机制管理。深递归、超大局部数组和 cgo 边界都要谨慎。

<!-- id: go-concurrency-004; difficulty: 1; tags: channel, 并发编程; source: 高频 -->
# Go 中有缓冲 channel 和无缓冲 channel 的区别是什么？

### 无缓冲 channel
```go
ch := make(chan int) // cap == 0
```

无缓冲 channel 的发送和接收必须配对完成：

```go
go func() {
    ch <- 42 // 阻塞，直到有接收者
}()

v := <-ch // 接收后发送方才能继续
fmt.Println(v)
```

它既传值，也做同步。一次成功的发送和对应接收之间建立 happens-before 关系，适合握手、交接所有权、等待信号。

### 有缓冲 channel
```go
ch := make(chan int, 3)
```

缓冲区未满时发送不阻塞，缓冲区非空时接收不阻塞：

```go
ch <- 1
ch <- 2
ch <- 3
// ch <- 4 // 阻塞，缓冲区满

fmt.Println(<-ch) // 1，channel 保持发送顺序
```

缓冲 channel 可以让生产者和消费者在缓冲容量内解耦，也常用作信号量：

```go
sem := make(chan struct{}, 10)
sem <- struct{}{} // acquire
go func() {
    defer func() { <-sem }() // release
    work()
}()
```

### 对比
| 维度 | 无缓冲 | 有缓冲 |
|------|--------|--------|
| 容量 | 0 | 指定容量 |
| 发送阻塞 | 直到接收者就绪 | 缓冲满才阻塞 |
| 接收阻塞 | 直到发送者就绪 | 缓冲空才阻塞 |
| 典型用途 | 同步、交接、等待 | 队列、削峰、限流 |

缓冲大小不是越大越好；过大的缓冲会增加内存占用、延迟暴露背压问题，也可能让关闭和取消逻辑更复杂。

<!-- id: go-concurrency-005; difficulty: 2; tags: channel, 并发编程; source: 高频 -->
# 如何正确关闭 channel？关闭 channel 后读写会发生什么？

### 关闭 channel 表示不再发送
```go
ch := make(chan int, 2)
ch <- 10
ch <- 20
close(ch)
```

关闭后，接收方会先读完缓冲区已有值；缓冲区读空后，再接收会得到元素零值和 `ok=false`：

```go
v, ok := <-ch // 10, true
v, ok = <-ch  // 20, true
v, ok = <-ch  // 0, false
```

`for range` 会一直接收，直到 channel 关闭且缓冲区被读空：

```go
ch := make(chan int, 2)
ch <- 10
ch <- 20
close(ch)

for v := range ch {
    fmt.Println(v) // 10, 20
}
```

### 关闭后的写和重复关闭
```go
close(ch)
ch <- 1   // panic: send on closed channel
close(ch) // panic: close of closed channel
```

关闭 nil channel 也会 panic；从 nil channel 读写会永久阻塞。

### 关闭原则
通常由**唯一发送方**关闭 channel。接收方不应为了“我不想收了”去关闭数据 channel，因为发送方可能还在发送。

```go
func producer(ch chan<- int) {
    defer close(ch)
    for i := 0; i < 5; i++ {
        ch <- i
    }
}

func consumer(ch <-chan int) {
    for v := range ch {
        fmt.Println(v)
    }
}
```

### 多发送方关闭
多个发送方时，要用额外协调保证所有发送完成后只关闭一次：

```go
var wg sync.WaitGroup
ch := make(chan int, 10)

for i := 0; i < 3; i++ {
    wg.Add(1)
    go func(id int) {
        defer wg.Done()
        ch <- id
    }(i)
}

go func() {
    wg.Wait()
    close(ch)
}()

for v := range ch {
    fmt.Println(v)
}
```

如果接收方需要提前停止，应通过 `context.Context` 或单独的 done channel 通知发送方退出，而不是直接关闭数据 channel。

<!-- id: go-concurrency-006; difficulty: 2; tags: channel, 并发编程; source: 高频 -->
# nil channel 有什么行为？有什么实际应用场景？

### 基本行为
```go
var ch chan int // nil channel

<-ch      // 永久阻塞
ch <- 1   // 永久阻塞
close(ch) // panic: close of nil channel
```

nil channel 的读写不会 panic，但会永远阻塞。空 `select{}` 和只包含 nil channel case 的 `select` 也会永久阻塞。

### 在 select 中禁用 case
nil channel 在 `select` 中永远不会就绪，所以可以通过把 channel 置为 nil 动态禁用分支：

```go
func merge(a, b <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for a != nil || b != nil {
            select {
            case v, ok := <-a:
                if !ok {
                    a = nil
                    continue
                }
                out <- v
            case v, ok := <-b:
                if !ok {
                    b = nil
                    continue
                }
                out <- v
            }
        }
    }()
    return out
}
```

如果不把已关闭的 channel 置 nil，接收分支会一直立即就绪并返回零值，容易形成死循环。

### 延迟激活和状态机
```go
var ready <-chan struct{} // nil，case 初始禁用

select {
case <-ready:
    start()
default:
}

ch := make(chan struct{})
ready = ch
close(ch) // 之后 ready 分支会立即就绪，起到广播信号作用
```

### 对比
| 操作 | nil channel | closed channel |
|------|-------------|----------------|
| 读 | 永久阻塞 | 零值，ok=false |
| 写 | 永久阻塞 | panic |
| close | panic | panic |
| select | case 不会就绪 | 接收 case 立即就绪 |

<!-- id: go-concurrency-007; difficulty: 1; tags: select, 并发编程; source: 高频 -->
# `select` 语句的基本用法是什么？有哪些特性？

### 基本语法
`select` 用来等待多个 channel 操作中的一个就绪：

```go
select {
case v := <-ch1:
    fmt.Println("recv", v)
case ch2 <- 42:
    fmt.Println("sent")
case <-time.After(time.Second):
    fmt.Println("timeout")
default:
    fmt.Println("no channel ready")
}
```

### 核心特性
- 没有 `default` 时，阻塞直到某个 case 可执行
- 有 `default` 时，没有 case 就绪会立即执行 default，可做非阻塞读写
- 多个 case 同时就绪时，运行时会伪随机选择一个，不保证业务优先级
- nil channel 的 case 永远不会就绪
- `select {}` 会永久阻塞当前 goroutine

```go
select {
case v := <-ch:
    handle(v)
default:
    // 非阻塞：当前没有数据
}
```

### 求值顺序的陷阱
进入 `select` 时，所有 case 的 channel 表达式都会求值；send case 的右侧表达式也会求值，即使该 case 最后没有被选中。

```go
select {
case ch <- expensive(): // expensive 会先执行
case <-ctx.Done():
}
```

如果右侧有副作用或成本很高，要提前控制。

### 超时和取消
单次等待可以用 `time.After`：

```go
select {
case result := <-workCh:
    fmt.Println(result)
case <-time.After(5 * time.Second):
    return errors.New("timeout")
}
```

循环里反复做超时，通常用 `time.NewTimer` 并正确 stop/drain，或优先使用 `context.WithTimeout`，避免无意制造大量 timer。

<!-- id: go-concurrency-008; difficulty: 3; tags: select, 并发编程; source: 腾讯 -->
# 如何用 `select` 实现优先级调度？即优先处理高优先级 channel 的消息。

### 问题：select 没有优先级
```go
select {
case v := <-high:
    handleHigh(v)
case v := <-low:
    handleLow(v)
}
```

如果两个 case 同时就绪，`select` 会伪随机选择，不能保证先处理 high。

### 常见方案：先非阻塞检查高优先级
```go
func process(ctx context.Context, high, low <-chan int) {
    for high != nil || low != nil {
        select {
        case <-ctx.Done():
            return
        case v, ok := <-high:
            if !ok {
                high = nil
                continue
            }
            handleHigh(v)
            continue
        default:
        }

        select {
        case <-ctx.Done():
            return
        case v, ok := <-high:
            if !ok {
                high = nil
                continue
            }
            handleHigh(v)
        case v, ok := <-low:
            if !ok {
                low = nil
                continue
            }
            handleLow(v)
        }
    }
}
```

第一层 `select` 先尝试读取 high，能读就处理并进入下一轮；只有 high 当前不可读时，才进入第二层等待 high 或 low。

### 局限
这个模式提供“高优先级优先尝试”，不是实时系统里的严格优先级保证。如果 low 被第二层 select 选中后 high 才到达，当前 low 仍会被处理。高优先级持续不断时，low 也可能长期饥饿。

### 更严格的方案
如果需要严格优先级、权重、公平性或防饥饿，通常不要只靠多个 channel 加 `select`，而是让一个调度 goroutine 统一接收消息，放入优先队列，再按策略处理：

```go
type Job struct {
    Priority int
    Payload  any
}
```

用 heap/priority queue 可以实现明确的优先级和老化策略，行为比嵌套 select 更可控。

<!-- id: go-concurrency-009; difficulty: 1; tags: sync, mutex; source: 高频 -->
# `sync.Mutex` 和 `sync.RWMutex` 有什么区别？分别适用于什么场景？

### Mutex
`sync.Mutex` 是互斥锁，同一时刻只能有一个 goroutine 进入临界区，读写都互斥：

```go
var mu sync.Mutex

mu.Lock()
defer mu.Unlock()
// protected state
```

### RWMutex
`sync.RWMutex` 区分读锁和写锁：

```go
var rw sync.RWMutex

rw.RLock()   // 多个读者可同时持有
rw.RUnlock()

rw.Lock()    // 写锁独占
rw.Unlock()
```

当有写锁等待时，新的读锁会被阻塞，避免写者长期饥饿。`RWMutex` 不支持从读锁升级为写锁，也不支持可重入加锁。

### 示例
```go
type SafeCache struct {
    rw   sync.RWMutex
    data map[string]string
}

func (c *SafeCache) Get(key string) (string, bool) {
    c.rw.RLock()
    defer c.rw.RUnlock()
    v, ok := c.data[key]
    return v, ok
}

func (c *SafeCache) Set(key, val string) {
    c.rw.Lock()
    defer c.rw.Unlock()
    c.data[key] = val
}
```

### 如何选择
- 临界区很短、读写比例接近、逻辑简单：优先 `Mutex`
- 读很多、写很少，且读临界区有足够成本：考虑 `RWMutex`
- 是否值得用 `RWMutex` 要靠压测或 profile，固定比例规则不可靠

两者零值都可用，但第一次使用后不能复制。结构体里包含锁时，通常用指针接收者，避免复制锁。

<!-- id: go-concurrency-010; difficulty: 2; tags: sync, mutex; source: 高频 -->
# Go 中死锁（deadlock）是如何产生的？给出常见的死锁场景和解决方案。

### 死锁条件
经典四条件：互斥、持有并等待、不可剥夺、循环等待。Go 里常见死锁来自锁顺序、channel 配对错误、WaitGroup 计数错误和 goroutine 泄漏。

### Mutex 不可重入
```go
var mu sync.Mutex

func bad() {
    mu.Lock()
    defer mu.Unlock()

    mu.Lock() // 死锁：同一个 goroutine 也不能重复 Lock
    defer mu.Unlock()
}
```

解决：拆分已加锁版本和未加锁版本，避免函数在持锁状态下再次进入同一把锁。

### 锁顺序不一致
```go
var a, b sync.Mutex

go func() {
    a.Lock(); defer a.Unlock()
    b.Lock(); defer b.Unlock()
}()

go func() {
    b.Lock(); defer b.Unlock()
    a.Lock(); defer a.Unlock()
}()
```

解决：全局规定加锁顺序；减少同时持有多把锁；不要在持锁时执行可能阻塞的 IO、channel send/receive 或外部回调。

### channel 无配对
```go
ch := make(chan int)
ch <- 1 // main goroutine 阻塞，没有接收方，最终 fatal deadlock
```

或两边都在等接收：

```go
ch := make(chan int)
go func() { <-ch }()
<-ch // 没有发送方，两个 goroutine 都阻塞
```

解决：明确 channel 所有权，保证发送和接收配对；需要退出时用 `close`、`context` 或 done channel 协调。

### WaitGroup 计数错误
```go
var wg sync.WaitGroup
wg.Add(1)
go func() {
    wg.Wait() // 等待自己 Done，永远不返回
    wg.Done()
}()
wg.Wait()
```

解决：`Add` 在启动 goroutine 前完成；goroutine 入口 `defer wg.Done()`；不要在 worker 内等待同一个 worker 组完成。

### 检测和排查
- runtime 只能在所有 goroutine 都阻塞时报告 `fatal error: all goroutines are asleep - deadlock!`
- 局部死锁或 goroutine 泄漏不会一定被 runtime 报告
- `go test -race` 查数据竞争，不是死锁检测器
- 可用 goroutine dump、block profile、mutex profile、超时测试定位阻塞点

<!-- id: go-concurrency-011; difficulty: 2; tags: sync, WaitGroup; source: 高频 -->
# `sync.WaitGroup` 的正确使用方式是什么？有哪些常见错误？

### 基本用法
传统写法是启动 goroutine 前 `Add(1)`，goroutine 退出时 `Done()`：

```go
var wg sync.WaitGroup

for i := 0; i < 5; i++ {
    wg.Add(1)
    go func(id int) {
        defer wg.Done()
        fmt.Println("worker", id)
    }(i)
}

wg.Wait()
```

Go 1.25 起推荐用 `WaitGroup.Go`，由它负责 Add/Done：

```go
var wg sync.WaitGroup
for i := 0; i < 5; i++ {
    id := i
    wg.Go(func() {
        fmt.Println("worker", id)
    })
}
wg.Wait()
```

`WaitGroup.Go` 要求传入的函数不要 panic；需要处理 panic 时应在函数内部 recover 或在更外层统一处理。

### 常见错误
在 goroutine 里 Add 太晚：

```go
for i := 0; i < 5; i++ {
    go func() {
        wg.Add(1) // 可能和 Wait 竞态，Wait 先看到 0 就返回
        defer wg.Done()
    }()
}
wg.Wait()
```

复制 WaitGroup：

```go
func startWorker(wg sync.WaitGroup) { // 错误：复制了锁和计数状态
    defer wg.Done()
}
```

Done 次数超过 Add 次数会 panic：

```go
wg.Add(1)
wg.Done()
wg.Done() // panic: sync: negative WaitGroup counter
```

### 复用规则
WaitGroup 可以复用，但必须等上一轮 `Wait` 返回后，再为下一轮任务调用新的 `Add` 或 `Go`。WaitGroup 第一次使用后不能复制。

### 边界
WaitGroup 只等待完成，不收集返回值、不传播 error、不自动取消其他 goroutine。需要错误聚合和取消时，优先考虑 `errgroup.Group` 配合 `context`。

<!-- id: go-concurrency-012; difficulty: 2; tags: sync, 并发编程; source: 高频 -->
# `sync.Once` 的作用是什么？如何实现线程安全的单例？

### sync.Once 的作用
`sync.Once` 保证某个函数在并发环境下最多执行一次，且执行完成会同步到所有返回的调用者。

```go
var once sync.Once

func initialize() {
    fmt.Println("initializing")
}

once.Do(initialize)
once.Do(initialize) // 不再执行
```

### 单例示例
```go
type DB struct{ conn *sql.DB }

var (
    instance *DB
    initErr  error
    once     sync.Once
)

func GetDB() (*DB, error) {
    once.Do(func() {
        db, err := sql.Open("postgres", dsn)
        if err != nil {
            initErr = err
            return
        }
        if err := db.Ping(); err != nil {
            initErr = err
            return
        }
        instance = &DB{conn: db}
    })
    return instance, initErr
}
```

`sql.Open` 通常只创建句柄，不一定建立连接；需要确认可用性时要 `Ping`。

### 重要特性
- 如果 `Do(f)` 中的 `f` panic，这次也算执行过，后续 `Do` 不会重试
- 如果 `f` 内部再次调用同一个 `Once.Do`，会死锁
- `Once` 第一次使用后不能复制
- 如果初始化失败需要重试，`sync.Once` 不适合直接用，需要自己设计状态机

### Go 1.21+ 辅助函数
```go
init := sync.OnceFunc(func() { fmt.Println("once") })
init()
init()
```

还有 `sync.OnceValue` 和 `sync.OnceValues` 用于缓存一次计算的返回值。注意 `OnceFunc` 包装的函数如果第一次执行 panic，之后每次调用也会用同一个 panic 值继续 panic。

<!-- id: go-concurrency-013; difficulty: 2; tags: atomic, 并发编程; source: 高频 -->
# `sync/atomic` 包提供哪些操作？什么时候用原子操作，什么时候用互斥锁？

### atomic 提供什么
`sync/atomic` 提供对单个变量的原子读、写、加减、交换和 CAS。现代 Go 更推荐类型化 atomic：

```go
var hits atomic.Int64
hits.Add(1)
n := hits.Load()
hits.Store(0)

var enabled atomic.Bool
enabled.Store(true)

var p atomic.Pointer[Config]
p.Store(&Config{})
```

也可以使用函数式 API：

```go
var counter int64
atomic.AddInt64(&counter, 1)
old := atomic.SwapInt64(&counter, 0)
_ = old
```

Go 的原子操作提供顺序一致性；不要把普通读写和 atomic 读写混用访问同一个变量。

### atomic.Value
```go
var v atomic.Value
v.Store(&Config{Timeout: 3 * time.Second})
cfg := v.Load().(*Config)
```

`atomic.Value` 适合读多写少的整体替换。第一次 Store 后，后续 Store 的具体类型必须一致；Store nil 会 panic。被存进去的对象应视为不可变，更新时使用 copy-on-write。

### 什么时候用 atomic
适合：
- 简单计数器、开关标志
- 原子替换指针或配置快照
- 性能敏感且状态关系非常简单的路径

不适合：
- 多个字段必须保持一致
- 临界区包含复杂逻辑
- 需要条件等待、队列、公平性或可读性更重要

### 什么时候用 mutex
```go
mu.Lock()
count++
total += amount // count 和 total 必须一起更新
mu.Unlock()
```

mutex 可以保护任意代码块和多个变量，表达意图清晰。未竞争时 mutex 也有快速路径，不要默认认为 atomic 一定更快；需要靠 benchmark/profile 决策。

<!-- id: go-concurrency-014; difficulty: 1; tags: context, 并发编程; source: 高频 -->
# `context` 包的作用是什么？有哪四种构造方式？

### context 的作用
`context.Context` 用来在调用链中传递取消信号、deadline/timeout 和请求范围数据。它本身是不可变的；`WithXxx` 会基于父 context 派生子 context。父 context 取消时，子 context 也会取消。

### 常见构造方式
根 context：

```go
ctx := context.Background() // main、初始化、测试根节点
ctx = context.TODO()        // 暂时不知道该传什么时的占位
```

取消：

```go
ctx, cancel := context.WithCancel(parent)
defer cancel()
```

超时或截止时间：

```go
ctx, cancel := context.WithTimeout(parent, 5*time.Second)
defer cancel()

ctx, cancel = context.WithDeadline(parent, time.Now().Add(5*time.Second))
defer cancel()
```

值传递：

```go
type traceIDKey struct{}
ctx = context.WithValue(parent, traceIDKey{}, "trace-123")
```

Go 1.20+ 还提供 `WithCancelCause`，Go 1.21+ 有 `WithDeadlineCause`、`WithTimeoutCause` 和 `WithoutCancel`，用于更精细地表达取消原因或切断取消传播。

### 使用示例
```go
func fetchData(ctx context.Context, url string) ([]byte, error) {
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return nil, err
    }
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    return io.ReadAll(resp.Body)
}
```

### 实践规则
- context 通常作为函数第一个参数传递，不存进结构体
- 创建带 cancel/deadline 的 context 后，要调用 cancel 释放 timer 和子节点引用
- 不要用 context 传可选参数或大对象
- 业务取消后通过 `ctx.Err()` 判断是 `context.Canceled` 还是 `context.DeadlineExceeded`

<!-- id: go-concurrency-015; difficulty: 2; tags: context, 并发编程; source: 字节 -->
# `context.WithValue` 的最佳实践是什么？为什么要用自定义类型作为 key？

### 字符串 key 的问题
`context.WithValue` 的 key 必须可比较。使用字符串或其他内置类型容易和其他包冲突：

```go
ctx := context.WithValue(ctx, "userID", 42)
ctx = context.WithValue(ctx, "userID", 99)
fmt.Println(ctx.Value("userID")) // 99，后写入的值在查找时遮蔽前一个
```

如果两个包都用 `"userID"`，它们会命中同一个 key，造成隐蔽 bug。

### 正确做法：私有 key 类型 + 访问函数
```go
type userIDKey struct{}

func WithUserID(ctx context.Context, id int64) context.Context {
    return context.WithValue(ctx, userIDKey{}, id)
}

func UserIDFromContext(ctx context.Context) (int64, bool) {
    id, ok := ctx.Value(userIDKey{}).(int64)
    return id, ok
}
```

不同包即使都定义 `type userIDKey struct{}`，也属于不同类型，不会冲突。对外暴露函数，而不是暴露 key，能保持类型安全和封装。

### 适合放什么
适合：请求 ID、trace ID、认证主体、租户 ID等“请求范围、跨 API 边界传播”的数据。

不适合：函数可选参数、数据库连接、logger 大对象、可变业务状态、必需依赖。它们应该作为显式参数或结构体字段传递。

### 实例
```go
type traceIDKey struct{}

func TraceMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        traceID := r.Header.Get("X-Trace-ID")
        if traceID == "" {
            traceID = uuid.NewString()
        }
        ctx := context.WithValue(r.Context(), traceIDKey{}, traceID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

func TraceID(ctx context.Context) (string, bool) {
    v, ok := ctx.Value(traceIDKey{}).(string)
    return v, ok
}
```

<!-- id: go-concurrency-016; difficulty: 2; tags: context, goroutine; source: 高频 -->
# 如何用 context 实现 goroutine 的优雅退出？

### 基本模式
context 只是传递取消信号，不会强制杀死 goroutine。worker 必须在可能阻塞或耗时的位置主动检查 `ctx.Done()`。

```go
func worker(ctx context.Context, id int, jobs <-chan Job) error {
    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case job, ok := <-jobs:
            if !ok {
                return nil
            }
            if err := processJob(ctx, job); err != nil {
                return err
            }
        }
    }
}
```

### 结合系统信号
Go 1.16+ 可以用 `signal.NotifyContext` 简化退出信号处理：

```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()

var wg sync.WaitGroup
for i := 0; i < 3; i++ {
    id := i
    wg.Add(1)
    go func() {
        defer wg.Done()
        _ = worker(ctx, id, jobs)
    }()
}

<-ctx.Done() // 收到信号或父 context 取消
close(jobs)  // 若当前 goroutine 拥有发送端，可关闭任务队列
wg.Wait()
```

### 带超时的处理
```go
func processWithTimeout(ctx context.Context, data []string) error {
    ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
    defer cancel()

    for i, item := range data {
        select {
        case <-ctx.Done():
            return fmt.Errorf("processing cancelled after %d items: %w", i, ctx.Err())
        default:
        }
        if err := processItem(ctx, item); err != nil {
            return err
        }
    }
    return nil
}
```

### 关键点
- 所有阻塞操作都要支持取消：channel 收发、网络请求、数据库调用、sleep/timer
- 派生出带 cancel/deadline 的 context 后要调用 cancel，释放 timer 和引用
- `ctx.Err()` 常见值是 `context.Canceled` 和 `context.DeadlineExceeded`
- 父 context 取消会传播到子 context；子 context 取消不会反向取消父 context

<!-- id: go-concurrency-017; difficulty: 2; tags: 并发模式, channel; source: 高频 -->
# 什么是 Pipeline 模式？请用 Go 实现一个简单的 pipeline。

### Pipeline 概念
Pipeline 把处理拆成多个串联阶段，每个阶段从输入 channel 读数据，处理后写到输出 channel。上一阶段的输出是下一阶段的输入。

### 带取消的实现
每个阶段只关闭自己创建的输出 channel；同时在接收和发送两个阻塞点都监听 context，避免下游提前退出导致上游 goroutine 泄漏。

```go
func generate(ctx context.Context, nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            select {
            case out <- n:
            case <-ctx.Done():
                return
            }
        }
    }()
    return out
}

func square(ctx context.Context, in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for {
            select {
            case <-ctx.Done():
                return
            case n, ok := <-in:
                if !ok {
                    return
                }
                select {
                case out <- n * n:
                case <-ctx.Done():
                    return
                }
            }
        }
    }()
    return out
}

func filter(ctx context.Context, in <-chan int, min int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            if n <= min {
                continue
            }
            select {
            case out <- n:
            case <-ctx.Done():
                return
            }
        }
    }()
    return out
}
```

使用：

```go
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

for v := range filter(ctx, square(ctx, generate(ctx, 1, 2, 3, 4, 5)), 5) {
    fmt.Println(v) // 9, 16, 25
}
```

### 优点和注意
- 阶段职责清晰，容易组合和测试
- 各阶段可以并发工作，天然形成背压
- 下游如果只消费部分结果，必须取消 context 或 drain 输入，否则可能泄漏 goroutine

<!-- id: go-concurrency-018; difficulty: 3; tags: 并发模式, channel; source: 字节 -->
# 什么是 Fan-out / Fan-in 模式？请实现一个带 context 取消的版本。

### 概念
- Fan-out：多个 worker 从同一个输入 channel 竞争读取，实现并行处理
- Fan-in：把多个 worker 的输出合并到一个输出 channel

```text
input -> worker1 --\
      -> worker2 ----> merged
      -> worker3 --/
```

结果顺序通常不保证，因为 worker 并行完成。

### Fan-out
```go
func fanOut(ctx context.Context, in <-chan int, n int) []<-chan int {
    outs := make([]<-chan int, n)
    for i := 0; i < n; i++ {
        outs[i] = worker(ctx, in)
    }
    return outs
}

func worker(ctx context.Context, in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for {
            select {
            case <-ctx.Done():
                return
            case v, ok := <-in:
                if !ok {
                    return
                }
                result := v * v
                select {
                case out <- result:
                case <-ctx.Done():
                    return
                }
            }
        }
    }()
    return out
}
```

### Fan-in
```go
func fanIn(ctx context.Context, inputs ...<-chan int) <-chan int {
    out := make(chan int)
    var wg sync.WaitGroup

    for _, input := range inputs {
        input := input
        wg.Add(1)
        go func() {
            defer wg.Done()
            for {
                select {
                case <-ctx.Done():
                    return
                case v, ok := <-input:
                    if !ok {
                        return
                    }
                    select {
                    case out <- v:
                    case <-ctx.Done():
                        return
                    }
                }
            }
        }()
    }

    go func() {
        wg.Wait()
        close(out)
    }()
    return out
}
```

### 使用
```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

in := generate(ctx, 1, 2, 3, 4, 5)
workers := fanOut(ctx, in, 3)
for v := range fanIn(ctx, workers...) {
    fmt.Println(v)
}
```

注意：如果消费者提前停止，应调用 cancel，让 fan-in 和 worker 都能退出。

<!-- id: go-concurrency-019; difficulty: 3; tags: 并发模式, goroutine; source: 高频 -->
# 如何实现一个 Worker Pool（工作池）？为什么需要限制并发数量？

### 为什么需要 Worker Pool
无限制创建 goroutine 会带来内存占用、调度压力和下游过载。Worker Pool 用固定数量 worker 消费任务队列，形成并发上限和背压。

### 基本实现
```go
type WorkerPool struct {
    jobs chan func(context.Context) error
    wg   sync.WaitGroup
    once sync.Once
}

func NewWorkerPool(n, queueSize int) *WorkerPool {
    p := &WorkerPool{jobs: make(chan func(context.Context) error, queueSize)}
    for i := 0; i < n; i++ {
        p.wg.Add(1)
        go func() {
            defer p.wg.Done()
            for job := range p.jobs {
                _ = job(context.Background())
            }
        }()
    }
    return p
}

func (p *WorkerPool) Submit(ctx context.Context, job func(context.Context) error) error {
    select {
    case p.jobs <- job:
        return nil
    case <-ctx.Done():
        return ctx.Err()
    }
}

func (p *WorkerPool) Shutdown() {
    p.once.Do(func() { close(p.jobs) })
    p.wg.Wait()
}
```

真实项目还会处理 job 返回值、panic recover、关闭后提交的错误返回，以及 worker 使用的父 context。

### 信号量限流
如果只是限制一段逻辑的并发数，不一定需要完整工作池：

```go
sem := make(chan struct{}, 10)
var wg sync.WaitGroup

for _, url := range urls {
    url := url
    sem <- struct{}{}
    wg.Add(1)
    go func() {
        defer wg.Done()
        defer func() { <-sem }()
        fetch(url)
    }()
}
wg.Wait()
```

### 选择依据
- 固定任务流、要复用 worker、要队列背压：Worker Pool
- 只是限制同时执行数量：信号量或 `errgroup.SetLimit`
- IO/数据库/外部 API：并发数通常按下游容量调，不按 CPU 核数盲设

<!-- id: go-concurrency-020; difficulty: 3; tags: errgroup, 并发模式; source: 高频 -->
# `errgroup` 是什么？相比 `WaitGroup` 有什么优势？

### errgroup 是什么
`golang.org/x/sync/errgroup` 是对 `sync.WaitGroup` 的常用增强：等待一组 goroutine，同时返回第一个非 nil error；`WithContext` 版本会在首次出错时取消 context。

它不自动 recover panic。goroutine 中 panic 仍会按普通 panic 行为传播；需要处理 panic 时要自己在函数内 recover 并转成 error。

### 基本用法
```go
var g errgroup.Group

for _, url := range urls {
    url := url
    g.Go(func() error {
        return fetch(url)
    })
}

if err := g.Wait(); err != nil {
    return err
}
```

### WithContext
```go
g, ctx := errgroup.WithContext(context.Background())

for _, url := range urls {
    url := url
    g.Go(func() error {
        req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
        if err != nil {
            return err
        }
        resp, err := http.DefaultClient.Do(req)
        if err != nil {
            return err // 第一个错误会取消 ctx
        }
        defer resp.Body.Close()
        return process(resp.Body)
    })
}

return g.Wait()
```

注意：ctx 被取消后，其他 goroutine 也要真正检查或使用这个 ctx，才能及时退出。

### 限制并发
```go
g, ctx := errgroup.WithContext(context.Background())
g.SetLimit(5)

for _, item := range items {
    item := item
    g.Go(func() error {
        return process(ctx, item)
    })
}

if err := g.Wait(); err != nil {
    return err
}
```

`SetLimit` 应在启动任务前设置；达到限制时，`Go` 会阻塞直到有任务完成。新版本还提供 `TryGo` 用于无法启动时立即返回 false。

### 相比 WaitGroup 的优势
- 不需要自己维护 error channel
- 首个错误可触发取消，减少无意义工作
- 支持限制并发数
- API 更适合“一组任务共同完成或失败”的场景

<!-- id: go-concurrency-021; difficulty: 2; tags: 竞态, 并发编程; source: 高频 -->
# 什么是数据竞争（data race）？如何检测和避免？

### 什么是数据竞争
两个或多个 goroutine 并发访问同一内存位置，至少一个是写，并且这些访问之间没有 happens-before 同步关系，就是数据竞争。

```go
var counter int

for i := 0; i < 1000; i++ {
    go func() {
        counter++ // 读-改-写不是原子操作
    }()
}
```

数据竞争下程序行为不可靠，结果小于 1000 只是表象，不能把它当成“偶尔丢更新”这么简单。

### 检测
```bash
go test -race ./...
go run -race main.go
go build -race ./cmd/app
```

race detector 只能发现测试或运行过程中实际覆盖到的竞争；没有报警不等于证明没有竞争。CI 里应尽量跑覆盖关键并发路径的 `go test -race`。

### 避免方式
用 mutex 保护临界区：

```go
var mu sync.Mutex
mu.Lock()
counter++
mu.Unlock()
```

用 atomic 处理单变量简单状态：

```go
var counter atomic.Int64
counter.Add(1)
```

用 channel 传递所有权或串行化状态：

```go
type incReq struct{ done chan int }
reqs := make(chan incReq)
go func() {
    counter := 0
    for req := range reqs {
        counter++
        req.done <- counter
    }
}()
```

避免共享：

```go
results := make([]int, n)
for i := range results {
    i := i
    wg.Go(func() { results[i] = doCount(i) }) // 不同元素、固定索引
}
```

不要多个 goroutine 并发 append 同一个 slice，也不要未同步读写 map。

<!-- id: go-concurrency-022; difficulty: 2; tags: 竞态, goroutine; source: 高频 -->
# 什么是 goroutine 泄漏？有哪些常见原因和检测方法？

### 什么是 goroutine 泄漏
goroutine 启动后没有退出路径，长期阻塞或空转，占用栈、调度元数据、引用的对象和外部资源，数量随请求增长而增长，就是 goroutine 泄漏。

### 常见原因：发送无人接收
```go
func leak() <-chan int {
    ch := make(chan int)
    go func() {
        ch <- doWork() // 调用方如果不接收，永远阻塞
    }()
    return ch
}
```

修复方式：明确消费、加取消，或在只返回一个结果时用容量 1 的 channel 避免发送方卡死：

```go
func work(ctx context.Context) <-chan int {
    ch := make(chan int, 1)
    go func() {
        select {
        case ch <- doWork():
        case <-ctx.Done():
        }
    }()
    return ch
}
```

### 常见原因：不响应取消
```go
func startWorker(ctx context.Context, jobs <-chan Job) {
    go func() {
        for {
            select {
            case <-ctx.Done():
                return
            case job, ok := <-jobs:
                if !ok { return }
                process(ctx, job)
            }
        }
    }()
}
```

避免 `for { default: doWork() }` 这类忙等；耗时操作本身也要接收 context。

### 资源泄漏会诱发 goroutine 堆积
HTTP body 不关闭、数据库 rows 不关闭、timer/ticker 使用不当，可能导致连接、后台 goroutine 或等待者堆积：

```go
resp, err := http.Get(url)
if err != nil { return err }
defer resp.Body.Close()
_, _ = io.Copy(io.Discard, resp.Body)
```

### 检测方法
- `runtime.NumGoroutine()` 观察数量趋势
- `pprof` 的 `/debug/pprof/goroutine?debug=2` 看阻塞栈
- block profile、mutex profile 定位阻塞点
- 测试中用 `go.uber.org/goleak`
- 压测后对比 goroutine dump，确认请求结束后数量能回落

<!-- id: go-concurrency-023; difficulty: 3; tags: 竞态, goroutine; source: 字节 -->
# 以下代码有什么问题？输出什么？如何修复？

```go
func main() {
    var wg sync.WaitGroup
    for i := 0; i < 5; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            fmt.Println(i)
        }()
    }
    wg.Wait()
}
```

<!-- answer -->

### Go 1.22+ 的答案
如果包的语言版本是 `go 1.22` 或更高，`for i := 0; ...` 中的循环变量是每次迭代独立的。原代码不再有经典循环变量捕获 bug，会打印 0 到 4 各一次，但顺序不确定：

```text
3
0
4
1
2
```

顺序不确定是 goroutine 调度导致的，不是数据竞争。

### Go 1.21 及以前的答案
旧语义下，所有 goroutine 捕获同一个 `i`，循环结束时 `i == 5`，所以常见输出是多个 5，也可能夹杂部分 0-4；同时这通常会被 race detector 报告为对 `i` 的并发读写。

```bash
go run -race main.go
```

### 跨版本稳定写法
显式把当前值传给 goroutine：

```go
for i := 0; i < 5; i++ {
    wg.Add(1)
    go func(n int) {
        defer wg.Done()
        fmt.Println(n)
    }(i)
}
```

或创建本轮局部变量：

```go
for i := 0; i < 5; i++ {
    i := i
    wg.Add(1)
    go func() {
        defer wg.Done()
        fmt.Println(i)
    }()
}
```

### 仍会踩坑的写法
Go 1.22 修复的是循环语句自己声明的变量。如果变量声明在循环外，闭包仍捕获同一个变量：

```go
i := 0
for ; i < 5; i++ {
    go func() { fmt.Println(i) }()
}
```

<!-- id: go-concurrency-024; difficulty: 2; tags: GMP, 并发编程; source: 高频 -->
# 什么是 work stealing？Go 的调度器如何通过它提高效率？

### 背景：P 的本地运行队列
Go 调度器里每个 P 都有本地 run queue。M 持有 P 后，从本地队列取 G 执行。

```text
P0: [G1, G2, G3, G4]
P1: []
```

如果 P1 没有可运行 G，而 P0 很忙，就会出现负载不均。

### Work stealing
空闲的 P 会尝试从其他 P 的本地队列偷取一部分可运行 goroutine，让多个 P 都有活干：

```text
P0: [G1, G2, G3, G4]
P1: []  -> steal
P0: [G1, G2]
P1: [G3, G4]
```

调度器还会从全局队列、netpoller 等地方寻找可运行 G；严格说 work stealing 特指从其他 P 偷本地队列任务。

### 为什么有效
- 减少全局队列竞争，本地队列优先提高缓存局部性
- 空闲 P 能主动拿任务，提高 CPU 利用率
- 不需要开发者手动分配 goroutine 到线程

### 与抢占和阻塞的关系
- goroutine 阻塞在 channel、mutex、网络 IO 等位置时，调度器会运行其他 G
- 阻塞 syscall 可能让 M 与 P 分离，P 交给其他 M 继续执行 Go 代码
- Go 1.14 起支持异步抢占，长时间运行的 CPU 循环也更容易被抢占
- `runtime.Gosched()` 可以主动让出，但业务代码很少需要手动调用

### 开发者应关注什么
通常不需要手动干预 work stealing。更重要的是设置合理的 `GOMAXPROCS`、避免长期占用 P 的忙等循环、用阻塞原语表达等待，并通过 trace/pprof 查看调度瓶颈。

<!-- id: go-concurrency-025; difficulty: 2; tags: GMP, 并发编程; source: 高频 -->
# `GOMAXPROCS` 设置为 1 和 CPU 核心数时有什么区别？

### GOMAXPROCS 的含义
`GOMAXPROCS` 决定 P 的数量，也就是同一时刻最多有多少个线程在执行普通 Go 代码。

```go
current := runtime.GOMAXPROCS(0) // 查询，不修改
old := runtime.GOMAXPROCS(4)     // 设置并返回旧值
_, _ = current, old
```

### 设置为 1
```go
runtime.GOMAXPROCS(1)
```

只有一个 P，同一时刻只有一个 goroutine 执行 Go 代码。goroutine 仍然并发调度，但 CPU-bound Go 代码不会在多个核心上并行。

影响：
- 更容易复现某些调度相关测试，但不能依赖具体顺序
- CPU 密集型任务无法利用多核
- IO、sleep、channel 等阻塞仍会触发 goroutine 切换
- runtime 仍可能创建多个 OS thread 处理 syscall、cgo、网络轮询等，但执行 Go 代码的 P 只有一个

### 设置为可用 CPU 数
多个 P 可以让 CPU-bound goroutine 并行执行，更容易利用多核。收益取决于任务是否可并行、共享数据竞争、锁争用、GC 和内存带宽，不保证线性加速。

### 默认值和容器
现代 Go 默认会基于运行环境选择 `GOMAXPROCS`。Go 1.25 起，默认值会考虑 Linux cgroup CPU limit，并会周期性更新；裸机上通常接近可用逻辑 CPU 数。旧版本在容器里可能需要 `go.uber.org/automaxprocs` 这类库辅助。

### 实践建议
- 大多数程序不要手动设置，先用默认值
- CPU 密集服务可通过 benchmark/profile 比较不同值
- 容器里确认 Go 版本和 CPU limit 行为
- 调大 `GOMAXPROCS` 解决不了阻塞、锁竞争、下游限流等问题

<!-- id: go-concurrency-026; difficulty: 3; tags: GMP, goroutine; source: 高频 -->
# Go 1.14 引入的基于信号的异步抢占是什么？解决了什么问题？

### Go 1.14 之前的问题
早期 Go 主要依赖协作式抢占：函数调用序言中的栈检查点会发现 goroutine 被标记为需要抢占，然后让出执行权。

问题是没有函数调用的 CPU 紧密循环可能长期不经过抢占点：

```go
for {
    for i := 0; i < 1e9; i++ {
        sum += i
    }
}
```

在 `GOMAXPROCS=1` 时，这类代码可能让其他 goroutine 和 GC 等待很久。

### Go 1.14 的异步抢占
Go 1.14 引入基于信号的异步抢占。运行时的 sysmon 发现某个 goroutine 运行过久后，可以向运行它的线程发送信号；信号处理会让当前 goroutine 在可安全抢占的位置让出。

在 Unix 平台上常见实现会用到 `SIGURG`。它不是在任意机器指令上随意中断 Go 语义，而是在 runtime 认为安全的点完成抢占。

### 解决的问题
- 长时间 CPU 循环更难饿死其他 goroutine
- GC STW 和栈扫描不再过度依赖 goroutine 自愿进入函数调用
- 调度延迟更稳定，服务尾延迟更好

### 仍需注意
- cgo、系统调用、`//go:nosplit`、某些 runtime/unsafe 区域仍有特殊限制
- 异步抢占改善公平性，不等于实时调度保证
- 可以用 `GODEBUG=asyncpreemptoff=1` 做诊断，但生产中通常不应关闭

<!-- id: go-concurrency-027; difficulty: 2; tags: channel, 并发模式; source: 高频 -->
# 如何用 channel 实现一个超时重试机制？

### 首选：用 context 取消实际工作
只在外层 `select time.After` 超时返回，不能取消正在进行的 HTTP 请求，容易留下后台 goroutine 继续跑。更好的做法是把超时放进 context：

```go
func fetchOnce(ctx context.Context, url string) ([]byte, error) {
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil { return nil, err }
    resp, err := http.DefaultClient.Do(req)
    if err != nil { return nil, err }
    defer resp.Body.Close()
    return io.ReadAll(resp.Body)
}
```

### 带重试和退避
```go
func fetchWithRetry(ctx context.Context, url string, maxRetries int) ([]byte, error) {
    var lastErr error

    for attempt := 0; attempt <= maxRetries; attempt++ {
        if attempt > 0 {
            backoff := time.Duration(1<<uint(attempt-1)) * 100 * time.Millisecond
            timer := time.NewTimer(backoff)
            select {
            case <-timer.C:
            case <-ctx.Done():
                timer.Stop()
                return nil, ctx.Err()
            }
        }

        reqCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
        data, err := fetchOnce(reqCtx, url)
        cancel()
        if err == nil { return data, nil }
        if errors.Is(err, context.Canceled) { return nil, err }

        lastErr = err
    }
    return nil, fmt.Errorf("all attempts failed: %w", lastErr)
}
```

生产中通常还要加 jitter、只重试幂等请求、区分 4xx/5xx 和网络错误。

### time.After 与 Timer
`time.After` 适合一次性超时。循环热路径里反复使用会持续分配 timer，影响性能。Go 1.23 起，未引用且未触发的 timer/ticker 可以被 GC 回收，旧版本“必须 Stop 否则 GC 不掉”的说法已经过时；但复用 timer 仍能减少分配。

复用 timer 时要小心 Stop/Reset 语义，确保不会读到上一轮的过期信号；简单场景可优先用 context timeout。

<!-- id: go-concurrency-028; difficulty: 2; tags: sync, 并发编程; source: 高频 -->
# `sync.Cond` 是什么？在什么场景下需要使用它？

### sync.Cond 的作用
`sync.Cond` 是条件变量，用来让 goroutine 在某个共享状态条件不满足时等待，条件变化后被唤醒重新检查。它总是配合一个 `Locker` 使用，通常是 `*sync.Mutex`。

```go
cond := sync.NewCond(&sync.Mutex{})
```

- `Wait`：调用前必须持有锁；它会原子地解锁并挂起，醒来后重新加锁再返回
- `Signal`：唤醒一个等待者
- `Broadcast`：唤醒所有等待者

### Wait 必须放在循环里
Go 的 `Cond.Wait` 不会无原因返回；但醒来后条件也不一定仍然成立，因为其他 goroutine 可能已经先修改了状态。因此必须循环检查条件：

```go
cond.L.Lock()
for !condition() {
    cond.Wait()
}
// 使用受保护状态
cond.L.Unlock()
```

### 有界队列示例
为了区分“非空”和“未满”两个条件，可以使用两个 Cond：

```go
type Queue struct {
    mu       sync.Mutex
    notEmpty *sync.Cond
    notFull  *sync.Cond
    items    []int
    max      int
}

func NewQueue(max int) *Queue {
    q := &Queue{max: max}
    q.notEmpty = sync.NewCond(&q.mu)
    q.notFull = sync.NewCond(&q.mu)
    return q
}

func (q *Queue) Push(v int) {
    q.mu.Lock()
    defer q.mu.Unlock()
    for len(q.items) == q.max {
        q.notFull.Wait()
    }
    q.items = append(q.items, v)
    q.notEmpty.Signal()
}

func (q *Queue) Pop() int {
    q.mu.Lock()
    defer q.mu.Unlock()
    for len(q.items) == 0 {
        q.notEmpty.Wait()
    }
    v := q.items[0]
    q.items = q.items[1:]
    q.notFull.Signal()
    return v
}
```

### 什么时候用
大多数 Go 代码用 channel 更直接；`sync.Cond` 适合复杂共享状态、需要重复广播、多个等待条件或不适合把状态建模成消息流的场景。关闭 channel 只能广播一次，而 `Cond.Broadcast` 可以反复使用。

<!-- id: go-concurrency-029; difficulty: 3; tags: channel, 并发模式; source: 高频 -->
# 如何实现一个线程安全的、支持过期淘汰的本地缓存？

```go
type entry struct {
    value     any
    expiresAt time.Time
}

type Cache struct {
    mu    sync.RWMutex
    items map[string]entry
    done  chan struct{}
    once  sync.Once
}

func NewCache(cleanupInterval time.Duration) *Cache {
    c := &Cache{items: make(map[string]entry), done: make(chan struct{})}
    if cleanupInterval > 0 {
        go c.cleanup(cleanupInterval)
    }
    return c
}

func (c *Cache) Set(key string, val any, ttl time.Duration) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.items[key] = entry{value: val, expiresAt: time.Now().Add(ttl)}
}

func (c *Cache) Get(key string) (any, bool) {
    now := time.Now()
    c.mu.RLock()
    e, ok := c.items[key]
    if !ok || now.After(e.expiresAt) {
        c.mu.RUnlock()
        if ok {
            c.mu.Lock()
            if cur, exists := c.items[key]; exists && now.After(cur.expiresAt) {
                delete(c.items, key)
            }
            c.mu.Unlock()
        }
        return nil, false
    }
    c.mu.RUnlock()
    return e.value, true
}

func (c *Cache) cleanup(interval time.Duration) {
    ticker := time.NewTicker(interval)
    defer ticker.Stop()
    for {
        select {
        case <-ticker.C:
            now := time.Now()
            c.mu.Lock()
            for k, e := range c.items {
                if now.After(e.expiresAt) {
                    delete(c.items, k)
                }
            }
            c.mu.Unlock()
        case <-c.done:
            return
        }
    }
}

func (c *Cache) Close() {
    c.once.Do(func() { close(c.done) })
}
```

### 关键设计点
- `RWMutex` 保护 map；map 不能并发读写
- Get 时检查过期，后台清理只负责减少内存占用，不负责正确性
- `Close` 用 `sync.Once` 防止重复 close panic
- `cleanupInterval <= 0` 时不启动后台 goroutine，避免 `time.NewTicker` panic
- 如果 value 是指针、map、slice 等可变对象，调用方继续修改仍可能造成数据竞争；需要复制或约定不可变
- 生产级缓存还要考虑容量上限、LRU/LFU、单飞加载、指标和分片锁降低竞争

<!-- id: go-concurrency-030; difficulty: 3; tags: channel, mutex; source: 高频 -->
# channel 和 mutex 该如何选择？分别适合什么场景？

### 选择原则
channel 适合表达消息、所有权转移、任务流和取消信号；mutex 适合保护共享内存中的状态。Go 鼓励用通信建模并发，但不表示 channel 总是更好。

### 适合 channel
任务分发和结果汇总：

```go
jobs := make(chan Job)
results := make(chan Result)
```

生命周期信号和一次性广播：

```go
done := make(chan struct{})
close(done)
```

限流和背压：

```go
sem := make(chan struct{}, 10)
sem <- struct{}{}
// work
<-sem
```

pipeline、fan-in/fan-out、worker pool 这类数据流模型，也更适合 channel。

### 适合 mutex
共享状态需要一致更新：

```go
type Counter struct {
    mu    sync.Mutex
    count int
    total int
}

func (c *Counter) Add(v int) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count++
    c.total += v
}
```

缓存、连接状态、多个字段不变量、map 保护，通常用 mutex/RWMutex 更直接。

### 不要把 channel 当万能锁
用 `chan struct{}` 可以做信号量，但用 channel 保护一个普通变量往往比 mutex 难读，也更容易出现发送/接收配对错误。性能数字依赖平台和场景；不要用固定 ns/op 背答案，应该 benchmark 真实路径。

### 决策表
| 需求 | 工具 |
|------|------|
| 传递数据或所有权 | channel |
| 等待取消/完成信号 | context / done channel |
| 保护共享结构体或 map | mutex / RWMutex |
| 单变量计数或标志 | atomic |
| 复杂条件等待、可重复广播 | sync.Cond |

核心问题是所有权：谁拥有状态？如果能让一个 goroutine 独占状态并通过 channel 接收命令，就用 channel；如果状态天然被多个调用方同步访问，用 mutex 更清楚。

<!-- id: go-concurrency-031; difficulty: 2; tags: sync, mutex; source: 高频 -->
# `sync.Map` 和带锁的普通 map 有什么区别？什么时候用 `sync.Map`？

### 基本区别
`sync.Map` 是标准库提供的并发安全 map，方法内部完成同步；普通 map 必须用 `Mutex/RWMutex` 等外部同步保护。

`sync.Map` 的实现针对特定场景优化，例如读多写少、key 写入后长期读取，或多个 goroutine 操作相对独立的 key。它不是普通 map 的默认替代品。

### 基本 API
```go
var sm sync.Map

sm.Store("key", "value")

if v, ok := sm.Load("key"); ok {
    fmt.Println(v.(string))
}

actual, loaded := sm.LoadOrStore("key", "default")
// loaded=false 表示本次存入 default；actual 是最终存在 map 里的值
_, _ = actual, loaded

v, loaded := sm.LoadAndDelete("key")
_, _ = v, loaded

sm.Delete("key")
```

新版本还提供 `Swap`、`CompareAndSwap`、`CompareAndDelete` 等原子条件更新方法。

### Range 注意
```go
sm.Range(func(k, v any) bool {
    fmt.Println(k, v)
    return true
})
```

`Range` 并不提供一致性快照；并发写入时，遍历看到的是某个时刻的混合视图，顺序也不确定。

### 与 RWMutex + map 对比
| 维度 | sync.Map | map + RWMutex |
|------|----------|---------------|
| 类型安全 | `any`，需要断言 | 可用具体类型或泛型封装 |
| 多字段不变量 | 不适合 | 适合在锁内维护 |
| 读多写少/key 稳定 | 适合 | 也可用，需压测 |
| 写多、频繁删除 | 通常不优 | 通常更可控 |
| 遍历一致性 | 无一致快照 | 可持锁做一致快照 |

### 选择建议
默认用普通 map + 锁，只有在 key 稳定、读多写少、或多 goroutine 操作不同 key 且 profile 显示锁竞争明显时，再考虑 `sync.Map`。

<!-- id: go-concurrency-032; difficulty: 3; tags: goroutine, 并发模式; source: 高频 -->
# 如何实现一个支持并发安全的发布-订阅（Pub/Sub）系统？

```go
type EventBus struct {
    mu   sync.RWMutex
    subs map[string][]chan any
}

func NewEventBus() *EventBus {
    return &EventBus{subs: make(map[string][]chan any)}
}

func (b *EventBus) Subscribe(topic string, buf int) (<-chan any, func()) {
    ch := make(chan any, buf)
    var once sync.Once

    b.mu.Lock()
    b.subs[topic] = append(b.subs[topic], ch)
    b.mu.Unlock()

    cancel := func() {
        once.Do(func() {
            b.mu.Lock()
            defer b.mu.Unlock()

            list := b.subs[topic]
            for i, sub := range list {
                if sub == ch {
                    b.subs[topic] = append(list[:i], list[i+1:]...)
                    close(ch)
                    return
                }
            }
        })
    }
    return ch, cancel
}

func (b *EventBus) Publish(topic string, msg any) {
    b.mu.RLock()
    defer b.mu.RUnlock()

    for _, ch := range b.subs[topic] {
        select {
        case ch <- msg:
        default:
            // 慢订阅者缓冲满：丢弃、计数或记录日志
        }
    }
}
```

这里 `Publish` 持有读锁期间发送，`cancel` 需要写锁才能移除并关闭 channel，因此不会出现“发布端向刚关闭的 channel 发送”导致 panic。因为发送是非阻塞的，持读锁时间可控。

### 设计取舍
- 非阻塞发布：慢订阅者会丢消息，发布者不被拖慢
- 阻塞发布：消息不丢，但一个慢订阅者可能拖住全部发布
- 每个订阅者独立队列：更复杂，但能隔离慢消费者
- close 订阅 channel 表示该订阅结束；发布者必须和关闭动作同步

生产级 Pub/Sub 还要考虑主题清理、订阅者缓冲策略、消息顺序、panic recover、指标和上下文取消。

<!-- id: go-concurrency-033; difficulty: 3; tags: atomic, 并发模式; source: 腾讯 -->
# 如何实现一个无锁的、并发安全的栈（lock-free stack）？

### 基于 CAS 的栈
现代 Go 可以用 `atomic.Pointer[T]` 避免 `unsafe.Pointer` 手写转换：

```go
type node[T any] struct {
    val  T
    next *node[T]
}

type Stack[T any] struct {
    head atomic.Pointer[node[T]]
}

func (s *Stack[T]) Push(v T) {
    n := &node[T]{val: v}
    for {
        old := s.head.Load()
        n.next = old
        if s.head.CompareAndSwap(old, n) {
            return
        }
    }
}

func (s *Stack[T]) Pop() (T, bool) {
    var zero T
    for {
        old := s.head.Load()
        if old == nil {
            return zero, false
        }
        next := old.next
        if s.head.CompareAndSwap(old, next) {
            return old.val, true
        }
    }
}
```

### 关键点
- `Push` 读取当前 head，把新节点 next 指向旧 head，再 CAS 替换
- `Pop` 读取 head 和 next，再 CAS 把 head 推进到 next
- CAS 失败说明并发修改发生，重试即可

### 风险和局限
- lock-free 不等于 wait-free；高竞争下某些 goroutine 可能长期重试
- 不保证一定比 mutex 快，cache line 抖动和 CAS 重试可能很贵
- ABA 和内存回收是 lock-free 结构的核心难点；Go 的 GC 降低了手动释放导致的风险，但如果节点复用、对象池或外部暴露节点，仍要严肃处理
- 实际工程优先用 `sync.Mutex` 或成熟并发结构，除非 profile 明确证明锁是瓶颈

<!-- id: go-concurrency-034; difficulty: 2; tags: goroutine, 竞态; source: 高频 -->
# 以下代码有什么 bug？如何修复？

```go
type SafeCounter struct {
    mu sync.Mutex
    v  map[string]int
}

func (c *SafeCounter) Inc(key string) {
    c.mu.Lock()
    c.v[key]++
    c.mu.Unlock()
}

func (c *SafeCounter) Value(key string) int {
    return c.v[key]  // 直接读取，没有加锁
}
```

<!-- answer -->

### Bug 分析
`Value` 没有加锁读取 map，而 `Inc` 会加锁写 map。锁只保护持锁的代码；未持锁的读仍然和写并发，形成数据竞争，甚至可能触发运行时错误：`fatal error: concurrent map read and map write`。

另外，`v` 如果没有初始化，`Inc` 会因为写 nil map panic。应该提供构造函数或懒初始化。

### 修复一：所有访问都用同一把锁
```go
func NewSafeCounter() *SafeCounter {
    return &SafeCounter{v: make(map[string]int)}
}

func (c *SafeCounter) Inc(key string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.v[key]++
}

func (c *SafeCounter) Value(key string) int {
    c.mu.Lock()
    defer c.mu.Unlock()
    return c.v[key]
}
```

### 修复二：读多写少用 RWMutex
```go
type SafeCounter struct {
    mu sync.RWMutex
    v  map[string]int
}

func (c *SafeCounter) Inc(key string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.v[key]++
}

func (c *SafeCounter) Value(key string) int {
    c.mu.RLock()
    defer c.mu.RUnlock()
    return c.v[key]
}
```

### 修复三：sync.Map + atomic
适合 key 稳定、计数器独立的场景：

```go
type CounterMap struct{ v sync.Map }

func (c *CounterMap) Inc(key string) {
    actual, _ := c.v.LoadOrStore(key, new(atomic.Int64))
    actual.(*atomic.Int64).Add(1)
}

func (c *CounterMap) Value(key string) int64 {
    actual, ok := c.v.Load(key)
    if !ok { return 0 }
    return actual.(*atomic.Int64).Load()
}
```

不要把 `sync.Map` 当作默认选择；普通 map + 锁通常更类型安全、语义更清晰。

<!-- id: go-concurrency-035; difficulty: 2; tags: channel, select; source: 高频 -->
# 如何实现一个可以被取消的 ticker（定时任务）？

### 基本实现
```go
func startTicker(ctx context.Context, interval time.Duration, fn func(context.Context) error) <-chan error {
    errCh := make(chan error, 1)
    go func() {
        defer close(errCh)
        ticker := time.NewTicker(interval)
        defer ticker.Stop()

        for {
            select {
            case <-ctx.Done():
                errCh <- ctx.Err()
                return
            case <-ticker.C:
                if err := fn(ctx); err != nil {
                    errCh <- err
                    return
                }
            }
        }
    }()
    return errCh
}
```

`fn` 接收 context，才能在任务执行中响应取消。这个实现保证同一任务不会重叠执行；如果 `fn` 比 interval 慢，ticker 可能丢 tick，下一轮会在 `fn` 返回后继续。

### 立即执行一次再定时
```go
func runNowThenTick(ctx context.Context, interval time.Duration, fn func(context.Context) error) error {
    if err := fn(ctx); err != nil {
        return err
    }

    ticker := time.NewTicker(interval)
    defer ticker.Stop()
    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-ticker.C:
            if err := fn(ctx); err != nil {
                return err
            }
        }
    }
}
```

### Stop 的版本边界
Go 1.23 起，不再被引用的 ticker 可以被 GC 回收；旧版本如果不 Stop，ticker 更容易长期占用资源。即便如此，主动 `Stop` 仍是好习惯：它明确表达生命周期，及时停止底层计时器，也兼容旧版本。

### 工程注意
- `time.NewTicker` 的 interval 必须大于 0，否则 panic
- 任务是否失败后退出、继续、退避重试，要在策略里明确
- 如果希望任务重叠执行，不要直接在 ticker loop 里同步调用 `fn`，要额外限制并发和处理取消

<!-- id: go-concurrency-036; difficulty: 3; tags: goroutine, 并发模式, context; source: 高频 -->
# 如何实现一个支持并发限制和超时的批量处理函数？

```go
func ProcessBatch[T, R any](
    ctx context.Context,
    items []T,
    concurrency int,
    totalTimeout time.Duration,
    perTaskTimeout time.Duration,
    fn func(context.Context, T) (R, error),
) ([]R, []error) {
    if concurrency <= 0 || concurrency > len(items) {
        concurrency = len(items)
    }

    if totalTimeout > 0 {
        var cancel context.CancelFunc
        ctx, cancel = context.WithTimeout(ctx, totalTimeout)
        defer cancel()
    }

    results := make([]R, len(items))
    errs := make([]error, len(items))

    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(concurrency)

    for i, item := range items {
        i, item := i, item
        g.Go(func() error {
            taskCtx := ctx
            cancel := func() {}
            if perTaskTimeout > 0 {
                taskCtx, cancel = context.WithTimeout(ctx, perTaskTimeout)
            }
            defer cancel()

            results[i], errs[i] = fn(taskCtx, item)
            return nil // 每个任务的错误按下标收集，不触发 errgroup 取消
        })
    }

    if err := g.Wait(); err != nil {
        // 当前实现的 goroutine 不返回非 nil error；这里保留给父 ctx 取消等扩展场景
        _ = err
    }
    return results, errs
}
```

写不同下标的 `results[i]` 和 `errs[i]` 是安全的，因为每个下标只由一个 goroutine 写，`Wait` 返回后再统一读取。

使用示例：

```go
results, errs := ProcessBatch(ctx, urls, 5, 10*time.Second, 3*time.Second,
    func(ctx context.Context, url string) ([]byte, error) {
        req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
        if err != nil { return nil, err }
        resp, err := http.DefaultClient.Do(req)
        if err != nil { return nil, err }
        defer resp.Body.Close()
        return io.ReadAll(resp.Body)
    })
```

如果业务希望“任一任务失败就取消整批”，则应让 goroutine 返回该 error，并用 `errgroup.WithContext` 的取消语义；如果希望收集所有结果，就像上面这样不要把单任务错误返回给 errgroup。

<!-- id: go-concurrency-037; difficulty: 2; tags: channel, goroutine; source: 高频 -->
# channel 的方向类型（单向 channel）有什么用？

### 双向与单向 channel
```go
ch := make(chan int)

var sendOnly chan<- int = ch // 只能发送，可 close
var recvOnly <-chan int = ch // 只能接收，不能 close
```

双向 channel 可以赋给单向 channel；单向 channel 不能隐式转回双向。方向是类型的一部分，用来把所有权约束写进函数签名。

### 类型安全
```go
func producer(out chan<- int) {
    defer close(out)
    for i := 0; i < 5; i++ {
        out <- i
    }
    // <-out // 编译错误
}

func consumer(in <-chan int) {
    for v := range in {
        fmt.Println(v)
    }
    // in <- 1   // 编译错误
    // close(in) // 编译错误
}
```

这能表达“生产者拥有发送端并负责关闭，消费者只有读取权限”。

### Pipeline 中的应用
```go
func generate(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums { out <- n }
    }()
    return out
}

func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in { out <- n * n }
    }()
    return out
}
```

### 接口设计
```go
type DataSource interface {
    Output() <-chan []byte
}
```

只暴露 receive-only channel 可以避免调用方写入或关闭内部 channel，减少并发协议被破坏的风险。

<!-- id: go-concurrency-038; difficulty: 3; tags: GMP, goroutine; source: 高频 -->
# 系统调用会对 GMP 调度产生什么影响？Go 如何处理阻塞的系统调用？

### 阻塞 syscall 的问题
如果 goroutine 执行阻塞系统调用，承载它的 OS thread 会被内核阻塞，不能继续执行其他 goroutine。Go runtime 需要避免一个阻塞 syscall 占住 P。

### 网络 IO：netpoller
标准库 `net` 包通常使用非阻塞 fd + runtime netpoller：

```text
G 调用 conn.Read -> fd 未就绪 -> G 挂起，fd 注册到 epoll/kqueue/iocp
IO 就绪 -> netpoller 把 G 放回可运行队列
```

等待网络 IO 时通常不占住 M/P，因此大量网络 goroutine 可以高效等待。

### 真正阻塞的 syscall
对不能交给 netpoller 的阻塞 syscall，runtime 在进入 syscall 前会把 P 从当前 M 上摘下来，让这个 P 去服务其他 M/G；syscall 返回后，原 goroutine 再尝试获取 P 继续运行，获取不到就进入可运行队列等待调度。

```text
M0 + G0 进入阻塞 syscall
P0 交给 M1 执行其他 G
G0 syscall 返回后重新竞争 P
```

### cgo 的影响
cgo 调用通常被当作可能阻塞的外部调用处理。大量或长时间 cgo 调用会增加 OS thread 数量，也会让调度、栈和信号处理更复杂。

### 实践影响
- 网络服务大多受益于 netpoller，不需要一个连接一个线程
- 大量文件 IO、阻塞 syscall、cgo 可能导致线程数上升
- 可用 `runtime/debug.SetMaxThreads` 作为保护，但根因仍要从 IO 模型和并发量控制入手
- 不要直接把所有 fd 操作都假设为 netpoller 友好；优先使用标准库 `net` 抽象

<!-- id: go-concurrency-039; difficulty: 3; tags: 并发模式, channel, context; source: 字节 -->
# 实现一个支持超时、并发限制、结果聚合的并发请求函数，类似"选最快的 N 个结果"。

```go
type raceResult struct {
    url  string
    body string
    err  error
}

func FastestN(ctx context.Context, urls []string, want int, limit int, timeout time.Duration) ([]string, error) {
    if want <= 0 { return nil, nil }
    if want > len(urls) { want = len(urls) }
    if limit <= 0 || limit > len(urls) { limit = len(urls) }

    ctx, cancel := context.WithTimeout(ctx, timeout)
    defer cancel()

    results := make(chan raceResult, len(urls))
    sem := make(chan struct{}, limit)
    var wg sync.WaitGroup

launch:
    for _, url := range urls {
        url := url
        select {
        case sem <- struct{}{}:
        case <-ctx.Done():
            break launch
        }

        wg.Add(1)
        go func() {
            defer wg.Done()
            defer func() { <-sem }()

            req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
            if err == nil {
                var resp *http.Response
                resp, err = http.DefaultClient.Do(req)
                if err == nil {
                    defer resp.Body.Close()
                    var body []byte
                    body, err = io.ReadAll(resp.Body)
                    if err == nil {
                        results <- raceResult{url: url, body: string(body)}
                        return
                    }
                }
            }
            results <- raceResult{url: url, err: err}
        }()
    }

    go func() {
        wg.Wait()
        close(results)
    }()

    var out []string
    var lastErr error
    for len(out) < want {
        select {
        case r, ok := <-results:
            if !ok {
                if len(out) == 0 {
                    return nil, fmt.Errorf("no successful result: %w", lastErr)
                }
                return out, nil
            }
            if r.err != nil {
                lastErr = r.err
                continue
            }
            out = append(out, r.body)
            if len(out) == want {
                cancel() // 取消剩余慢请求
                return out, nil
            }
        case <-ctx.Done():
            if len(out) > 0 { return out, nil }
            return nil, fmt.Errorf("timeout waiting for %d results: %w", want, ctx.Err())
        }
    }
    return out, nil
}
```

关键点：用 `sem` 限制并发；用 `context.WithTimeout` 控制总超时；拿到足够成功结果后主动 cancel，停止慢请求；结果 channel 有缓冲且最终关闭，避免发送方泄漏。

<!-- id: go-concurrency-040; difficulty: 3; tags: goroutine, 竞态, channel; source: 高频 -->
# 以下代码有几个并发问题？全部找出来并修复。

```go
type Server struct {
    connections map[string]net.Conn
    count       int
}

func (s *Server) Add(id string, conn net.Conn) {
    s.connections[id] = conn
    s.count++
}

func (s *Server) Remove(id string) {
    delete(s.connections, id)
    s.count--
}

func (s *Server) Get(id string) net.Conn {
    return s.connections[id]
}

func (s *Server) Count() int {
    return s.count
}

func (s *Server) Broadcast(msg []byte) {
    for _, conn := range s.connections {
        go func() {
            conn.Write(msg)
        }()
    }
}
```

<!-- answer -->

### 问题清单
1. `connections` 是普通 map，Add/Remove/Get/Broadcast 并发访问会数据竞争，甚至 `fatal error: concurrent map read and map write`
2. `count++`/`count--` 非原子，而且 Add 覆盖已有 id、Remove 删除不存在 id 都会让 count 和 map 长度不一致
3. `connections` 未初始化时 Add 会 panic
4. Broadcast 遍历 map 时可能和 Add/Remove 并发冲突
5. Broadcast 在锁内直接 IO 会阻塞其他操作；原代码虽然没加锁，但修复时要避免这个坑
6. Go 1.21 及以前还存在 range 变量闭包捕获问题；Go 1.22+ 已修复，但跨版本写法仍建议显式传参
7. `msg` 是切片，调用方如果复用或修改底层数组，写出内容可能被并发改变
8. `conn.Write` 的错误被忽略；生产代码还要考虑写超时和坏连接清理

### 修复示例
```go
type Server struct {
    mu          sync.RWMutex
    connections map[string]net.Conn
}

func NewServer() *Server {
    return &Server{connections: make(map[string]net.Conn)}
}

func (s *Server) Add(id string, conn net.Conn) {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.connections[id] = conn
}

func (s *Server) Remove(id string) {
    s.mu.Lock()
    defer s.mu.Unlock()
    delete(s.connections, id)
}

func (s *Server) Get(id string) (net.Conn, bool) {
    s.mu.RLock()
    defer s.mu.RUnlock()
    conn, ok := s.connections[id]
    return conn, ok
}

func (s *Server) Count() int {
    s.mu.RLock()
    defer s.mu.RUnlock()
    return len(s.connections)
}

func (s *Server) Broadcast(ctx context.Context, msg []byte) []error {
    msgCopy := append([]byte(nil), msg...)

    s.mu.RLock()
    conns := make([]net.Conn, 0, len(s.connections))
    for _, conn := range s.connections {
        conns = append(conns, conn)
    }
    s.mu.RUnlock()

    errCh := make(chan error, len(conns))
    var wg sync.WaitGroup
    for _, conn := range conns {
        conn := conn
        wg.Add(1)
        go func() {
            defer wg.Done()
            if deadline, ok := ctx.Deadline(); ok {
                _ = conn.SetWriteDeadline(deadline)
            }
            _, err := conn.Write(msgCopy)
            if err != nil {
                errCh <- err
            }
        }()
    }
    wg.Wait()
    close(errCh)

    var errs []error
    for err := range errCh {
        errs = append(errs, err)
    }
    return errs
}
```

这里用 `len(connections)` 作为 Count，避免单独维护 count 造成不一致；Broadcast 先在锁内复制连接快照，再在锁外做 IO。
