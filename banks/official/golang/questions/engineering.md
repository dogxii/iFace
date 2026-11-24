# 工程化

<!-- id: go-engineering-001; difficulty: 1; tags: modules, 工程化; source: 高频 -->
# `go.mod` 文件的结构是什么？其中 `require`、`replace`、`exclude` 指令分别有什么作用？

`go.mod` 是模块根目录下的模块定义文件，描述模块路径、Go 语言版本、依赖和本模块生效的替换规则。

```go
module github.com/example/myapp

go 1.24

toolchain go1.24.3

require (
    github.com/gin-gonic/gin v1.10.0
    golang.org/x/sync v0.10.0
)

require github.com/some/transitive/pkg v1.2.3 // indirect

replace github.com/old/pkg => github.com/new/pkg v1.2.0
replace github.com/local/pkg => ../local/pkg

exclude github.com/bad/pkg v1.0.0
```

### 关键指令
| 指令 | 作用 |
|------|------|
| `module` | 当前模块路径，也是其他模块 import 它时使用的路径前缀 |
| `go` | 当前模块的 Go 语言版本；Go 1.21+ 中也作为最低工具链版本参与校验 |
| `toolchain` | 建议使用的 Go 工具链版本，Go 1.21+ 支持自动工具链选择 |
| `require` | 声明依赖模块和最小版本，`// indirect` 表示非当前包直接 import 的依赖 |
| `replace` | 只在主模块生效，把某模块替换到另一个版本、fork 或本地路径 |
| `exclude` | 只在主模块生效，排除某个特定版本参与版本选择 |

### go.sum
`go.sum` 记录模块内容和 `go.mod` 文件的校验和，用于校验下载内容没有被篡改。它不是锁文件，版本选择仍由 Minimal Version Selection、`go.mod` 和构建导入图决定；通常由 Go 命令自动维护。

<!-- id: go-engineering-002; difficulty: 1; tags: modules, 工程化; source: 高频 -->
# `go mod tidy`、`go mod vendor`、`go mod download` 三个命令分别做什么？

### go mod tidy
根据当前模块的包、测试和依赖图整理 `go.mod`、`go.sum`：添加缺失依赖，移除不再需要的依赖，补齐校验和。

```bash
go mod tidy
go mod tidy -go=1.24
```

提交代码前通常应运行它，避免依赖文件漂移。

### go mod vendor
把构建所需依赖复制到 `vendor/`，并生成 `vendor/modules.txt`：

```bash
go mod vendor
go build -mod=vendor ./...
```

从 Go 1.14 开始，如果主模块 `go` 版本为 1.14+ 且存在一致的 `vendor/`，Go 命令会默认使用 vendor 模式。适合离线构建、审计依赖源码或某些企业构建环境。

### go mod download
把模块下载到本地模块缓存，常用于 CI 预热缓存或提前验证依赖可下载：

```bash
go mod download
go mod download -json
go mod download golang.org/x/sync@v0.10.0
```

它通常不改 `go.mod`，但可能补齐缺失的 `go.sum` 校验信息。

### 对比
| 命令 | 主要作用 | 常见用途 |
|------|----------|----------|
| `tidy` | 同步 `go.mod`/`go.sum` 与源码导入图 | 开发后清理依赖 |
| `vendor` | 生成 vendor 依赖副本 | 离线/可审计构建 |
| `download` | 预下载到模块缓存 | CI 缓存、依赖预热 |

<!-- id: go-engineering-003; difficulty: 1; tags: testing, 工程化; source: 高频 -->
# 什么是 Table-Driven Test？请用示例说明其优势和写法。

Table-Driven Test 是把输入、期望输出和用例名放进一张表，循环执行同一套断言，适合覆盖大量边界条件。

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name string
        a, b int
        want int
    }{
        {"positive", 1, 2, 3},
        {"negative", -1, -2, -3},
        {"mixed", 5, -3, 2},
    }

    for _, tt := range tests {
        tt := tt // 兼容 Go 1.21 及以前；Go 1.22+ 循环变量已是逐迭代变量
        t.Run(tt.name, func(t *testing.T) {
            got := Add(tt.a, tt.b)
            if got != tt.want {
                t.Fatalf("Add(%d, %d) = %d, want %d", tt.a, tt.b, got, tt.want)
            }
        })
    }
}
```

如果子测试互不共享可变状态，可以在 `t.Run` 内调用 `t.Parallel()`；并行子测试会在父测试循环结束后再并发运行，所以旧版本里更需要 `tt := tt`。

运行示例：

```bash
go test ./...
go test -v -run '^TestAdd$'
go test -v -run '^TestAdd/positive$'
```

优势：用例集中、边界清晰、失败定位准确、添加用例成本低。复杂断言可配合 `cmp.Diff`，避免只打印难读的大对象。

<!-- id: go-engineering-004; difficulty: 1; tags: testing, benchmark; source: 高频 -->
# `go test` 常用标志有哪些？`-race` 标志的作用是什么？

### 常用标志
```bash
go test ./...                         # 运行所有包测试
go test -v ./...                      # 详细输出
go test -run '^TestFoo$' ./...        # 只运行匹配的测试/子测试
go test -count=1 ./...                # 绕过测试缓存
go test -timeout=30s ./...            # 设置单个测试二进制超时
go test -failfast ./...               # 首个包失败后尽快停止
go test -shuffle=on ./...             # 打乱测试顺序，暴露顺序依赖
go test -json ./...                   # JSON 输出，适合 CI 解析
```

覆盖率：

```bash
go test -cover ./...
go test -coverprofile=cov.out ./...
go tool cover -html=cov.out
```

基准测试：

```bash
go test -bench=. -benchmem ./...
go test -bench='BenchmarkFoo' -count=5 ./...
```

### -race 的作用
`-race` 启用数据竞争检测器，可以发现运行过程中实际发生的并发读写冲突：

```bash
go test -race ./...
go run -race ./cmd/app
```

示例：

```go
counter := 0
var wg sync.WaitGroup
for i := 0; i < 1000; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
        counter++
    }()
}
wg.Wait()
```

`-race` 只能检查被执行到的路径；没有报警不代表没有竞争。它会显著增加 CPU、内存和运行时间开销，通常用于开发、CI 和压测环境，不直接用于生产性能基准。

<!-- id: go-engineering-005; difficulty: 1; tags: 错误处理, 工程化; source: 高频 -->
# Go 中 `errors.Is` 和 `errors.As` 的区别是什么？分别适用于什么场景？

`errors.Is` 和 `errors.As` 都会沿错误链查找，包括 `fmt.Errorf("%w", err)`、`errors.Join` 和自定义 `Unwrap` 形成的链。

### errors.Is：判断是否包含某个错误值
```go
var ErrNotFound = errors.New("not found")

func findUser(id int) error {
    return fmt.Errorf("find user %d: %w", id, ErrNotFound)
}

if errors.Is(findUser(1), ErrNotFound) {
    // 按“未找到”类别处理
}
```

`errors.Is` 适合 sentinel error 或错误类别判断。它会使用 `==`，也支持错误类型自定义 `Is(error) bool`。

### errors.As：提取某种错误类型
```go
type ValidationError struct {
    Field string
    Msg   string
}
func (e *ValidationError) Error() string { return e.Field + ": " + e.Msg }

var ve *ValidationError
if errors.As(err, &ve) {
    fmt.Println(ve.Field, ve.Msg)
}
```

`errors.As` 的第二个参数必须是非 nil 指针，用于接收匹配到的错误值。它适合需要读取结构化字段的场景。

### 对比
| 维度 | errors.Is | errors.As |
|------|-----------|-----------|
| 关注点 | 是否是某个错误值/类别 | 是否包含某种错误类型 |
| 常见对象 | sentinel error | 自定义 error 类型 |
| 结果 | bool | bool，并填充目标变量 |

不要用字符串匹配错误文案做业务分支；文案是给人看的，`Is/As` 和结构化字段才适合程序判断。

<!-- id: go-engineering-006; difficulty: 1; tags: 项目结构, 工程化; source: 高频 -->
# Go 项目的标准目录结构是什么？`cmd`、`internal`、`pkg` 目录各有什么含义？

Go 没有官方强制的“标准项目布局”。目录结构应随项目规模演进，先保持简单，复杂后再拆分。

常见服务端布局：

```text
myapp/
├── cmd/
│   ├── server/main.go      # 一个子目录通常对应一个二进制
│   └── worker/main.go
├── internal/               # 编译器强制的私有包边界
│   ├── handler/
│   ├── service/
│   └── repository/
├── api/                    # OpenAPI、proto 等接口定义
├── configs/                # 配置样例或模板
├── scripts/                # 构建/发布脚本
├── go.mod
└── go.sum
```

### cmd
`cmd/<name>/main.go` 放可执行程序入口。`main` 应尽量薄，负责解析配置、组装依赖、启动服务；业务逻辑放到内部包。

### internal
`internal` 是 Go 工具链支持的可见性机制。导入限制由 `internal` 所在父目录决定：例如 `example.com/myapp/internal/db` 只能被 `example.com/myapp` 及其子树中的包导入。

这不是单纯“同一个模块可导入”，而是基于 import path 的父目录规则。

### pkg
`pkg/` 没有编译器特殊语义，只是社区约定，通常表示希望外部模块导入的公共库。不要为了“看起来标准”把所有代码塞进 `pkg`；只有明确要提供稳定 API 时再放。

### 简单项目
小工具可以只有：

```text
mytool/
├── main.go
├── go.mod
└── go.sum
```

过早套复杂目录会增加跳转和维护成本。

<!-- id: go-engineering-007; difficulty: 1; tags: lint, 编译; source: 高频 -->
# `go vet` 能检查哪些问题？它与 `golangci-lint` 有什么区别？

### go vet
`go vet` 是 Go 官方静态分析工具，目标是发现高置信度 bug，而不是统一代码风格。

```bash
go vet ./...
```

常见检查包括：

| 检查 | 例子 |
|------|------|
| `printf` | `fmt.Printf("%d", "x")` |
| `copylocks` | 复制包含 `sync.Mutex` 的值 |
| `structtag` | struct tag 格式不合法 |
| `lostcancel` | `context.WithCancel` 返回的 cancel 未调用 |
| `unreachable` | 不可达代码 |
| `loopclosure` | Go 1.21 及以前循环变量被闭包捕获的风险 |
| `testinggoroutine`/测试相关 | 在 goroutine 中错误调用 `t.Fatal` 等 |

`go test` 默认也会运行一部分 vet 检查；显式 `go vet ./...` 更适合作为 CI 基础门禁。

### golangci-lint
`golangci-lint` 是第三方 linter 聚合器，可以并行运行 govet、staticcheck、errcheck、gosec、revive、misspell 等工具：

```bash
golangci-lint run ./...
golangci-lint linters
```

示例配置：

```yaml
linters:
  enable:
    - govet
    - staticcheck
    - errcheck
    - gosec
    - revive
```

### 区别
| 维度 | go vet | golangci-lint |
|------|--------|---------------|
| 来源 | Go 官方内置 | 第三方聚合器 |
| 目标 | 高置信度 bug | bug、风格、安全、复杂度等 |
| 配置 | 较少 | 很强，适合团队规则 |
| 稳定性 | 随 Go 工具链发布 | 随 linter 生态变化，需固定版本 |

实践上：`go vet` 做底线检查，`golangci-lint` 做团队级质量门禁，并在 CI 中固定版本。

<!-- id: go-engineering-008; difficulty: 1; tags: 错误处理, 工程化; source: 高频 -->
# Go 中 `panic` 和 `recover` 的使用边界是什么？什么场景下应该使用 `panic`？

### panic 的边界
`panic` 表示当前控制流无法继续，常见来源包括运行时错误和主动触发：

```go
_ = s[0]       // 越界
_ = *p         // nil 指针
_ = v.(int)    // 类型断言失败
panic("bad internal state")
```

正常业务失败应返回 `error`：用户输入错误、文件不存在、网络超时、数据库无记录等，都属于调用方可处理的失败。

### 适合 panic 的场景
- 内部不变量被破坏，继续运行会隐藏更严重的 bug
- `MustXxx` 风格函数，例如 `regexp.MustCompile`，通常用于初始化和测试
- 不可能到达的分支，表示程序员错误

应用程序入口可以在初始化失败时选择 `log.Fatal` 或 panic；库的公开 API 通常应返回 error，而不是把可预期失败变成 panic。

### recover 的边界
`recover` 只有在同一 goroutine 的 deferred function 中直接调用，才能截获正在传播的 panic：

```go
func safe(fn func()) (err error) {
    defer func() {
        if v := recover(); v != nil {
            err = fmt.Errorf("panic: %v", v)
        }
    }()
    fn()
    return nil
}
```

recover 常放在边界层：HTTP middleware、RPC handler、任务调度器、worker goroutine 顶层。不要用 panic/recover 做普通控制流。

<!-- id: go-engineering-009; difficulty: 2; tags: modules, 工程化; source: 高频 -->
# `go work`（工作区模式）解决了什么问题？如何配置多模块工作区？

`go work` 是 Go 1.18 引入的工作区模式，用来同时开发多个本地模块，避免在各模块 `go.mod` 中反复写临时 `replace`。

```text
workspace/
├── myapp/   # module github.com/example/myapp
├── mylib/   # module github.com/example/mylib
└── go.work
```

### 初始化
```bash
cd workspace
go work init ./myapp ./mylib

# 或逐步添加
go work init
go work use ./myapp
go work use ./mylib
```

`go.work` 示例：

```go
go 1.24

use (
    ./myapp
    ./mylib
)

replace github.com/some/dep => ../some/dep
```

工作区启用后，Go 命令会优先使用 `use` 中列出的本地模块版本。`myapp` import `github.com/example/mylib` 时，会解析到本地 `./mylib`。

### 常用命令
```bash
go work use [-r] ./dir   # 添加模块，-r 递归查找
go work sync             # 将工作区 build list 同步回各模块
go work edit             # 脚本化编辑 go.work
GOWORK=off go test ./...  # 临时禁用工作区
```

### 是否提交 go.work
不能一概而论。个人本地联调的 `go.work` 通常不提交；如果仓库本身就是多模块 monorepo，团队希望 CI 和开发者共享同一工作区，可以提交。关键是团队约定清楚，并在 CI 中显式验证 `GOWORK` 行为。

<!-- id: go-engineering-010; difficulty: 2; tags: testing, benchmark; source: 高频 -->
# 如何编写 Go Benchmark 基准测试？`b.N`、`b.ResetTimer`、`b.ReportAllocs` 各有什么作用？

**基准测试基本写法：**

```go
package stringutil_test

import (
    "strings"
    "testing"
)

// Benchmark 函数必须以 Benchmark 开头，接收 *testing.B
func BenchmarkStringConcat(b *testing.B) {
    // b.N 由框架自动调整，保证基准测试运行足够长时间以获得稳定结果
    for i := 0; i < b.N; i++ {
        var s string
        for j := 0; j < 100; j++ {
            s += "x" // 低效的字符串拼接
        }
        _ = s
    }
}

func BenchmarkStringBuilder(b *testing.B) {
    for i := 0; i < b.N; i++ {
        var sb strings.Builder
        for j := 0; j < 100; j++ {
            sb.WriteByte('x')
        }
        _ = sb.String()
    }
}
```

**运行基准测试：**

```bash
go test -bench=. -benchmem ./...
# 输出示例：
# BenchmarkStringConcat-8     500000   3012 ns/op   5424 B/op   99 allocs/op
# BenchmarkStringBuilder-8   3000000    421 ns/op    232 B/op    5 allocs/op
#                ^^^CPU核数  ^^^迭代次  ^^^每次耗时  ^^^每次分配  ^^^分配次数
```

**`b.ResetTimer`：排除初始化耗时**

```go
func BenchmarkWithSetup(b *testing.B) {
    // 耗时的初始化（不应计入基准）
    data := prepareTestData(10000)
    
    b.ResetTimer() // 重置计时器，之前的耗时不计入统计
    
    for i := 0; i < b.N; i++ {
        process(data)
    }
}
```

**`b.StopTimer` / `b.StartTimer`：精细控制计时**

```go
func BenchmarkWithCleanup(b *testing.B) {
    for i := 0; i < b.N; i++ {
        b.StopTimer()  // 暂停计时
        obj := createExpensiveObject() // 每次迭代的初始化，不计时
        b.StartTimer() // 恢复计时
        
        process(obj)   // 只测量这部分
    }
}
```

**`b.ReportAllocs`：强制报告内存分配（无需 -benchmem）**

```go
func BenchmarkAllocs(b *testing.B) {
    b.ReportAllocs() // 等效于 -benchmem，在代码中强制启用内存统计
    for i := 0; i < b.N; i++ {
        _ = fmt.Sprintf("hello %d", i)
    }
}
```

**`b.RunParallel`：并发基准测试**

```go
func BenchmarkParallel(b *testing.B) {
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() { // pb.Next() 替代 i < b.N
            doWork()
        }
    })
}
// 运行：go test -bench=BenchmarkParallel -cpu=1,2,4,8
```

<!-- id: go-engineering-011; difficulty: 2; tags: testing, 工程化; source: 高频 -->
# `TestMain` 的作用是什么？何时需要使用它？

`TestMain` 是某个测试包的自定义测试入口，可在该包所有测试、基准测试和示例运行前后做统一初始化与清理。

```go
func TestMain(m *testing.M)
```

典型写法：

```go
var testDB *sql.DB

func TestMain(m *testing.M) {
    var err error
    testDB, err = setupTestDatabase()
    if err != nil {
        fmt.Fprintf(os.Stderr, "setup db: %v\n", err)
        os.Exit(1)
    }

    code := m.Run()

    if err := testDB.Close(); err != nil {
        fmt.Fprintf(os.Stderr, "close db: %v\n", err)
        if code == 0 { code = 1 }
    }
    teardownTestDatabase()

    os.Exit(code)
}
```

注意：`os.Exit` 不会运行 defer，所以不要写成 `defer cleanup(); os.Exit(m.Run())`。应先保存 `code := m.Run()`，手动清理，再 `os.Exit(code)`。

### 适用场景
- 启动/停止测试数据库、mock server、测试容器
- 解析自定义测试 flag
- 设置全局日志输出、时区、环境变量
- 做包级一次性昂贵初始化

如果资源只属于单个测试，优先用 `t.Cleanup()`、`t.TempDir()`、`httptest.Server` 等局部工具，避免测试之间共享状态。

<!-- id: go-engineering-012; difficulty: 2; tags: 反射, 工程化; source: 高频 -->
# `reflect.TypeOf` 和 `reflect.ValueOf` 有什么区别？`Kind` 和 `Type` 分别表示什么？

### TypeOf vs ValueOf
`reflect.TypeOf(x)` 返回动态具体类型的描述；`reflect.ValueOf(x)` 返回可操作的反射值，里面也带有类型信息。

```go
type MyInt int
var x MyInt = 42

fmt.Println(reflect.TypeOf(x))  // main.MyInt
fmt.Println(reflect.ValueOf(x)) // 42
```

如果传入的是 nil interface，`reflect.TypeOf(nil)` 返回 nil，`reflect.ValueOf(nil)` 返回 zero Value，Kind 是 `Invalid`。

### Type vs Kind
`Type` 是完整类型；`Kind` 是底层类别枚举：

```go
t := reflect.TypeOf(x)
fmt.Println(t.Name())    // MyInt
fmt.Println(t.String())  // main.MyInt
fmt.Println(t.Kind())    // int

fmt.Println(reflect.TypeOf([]int{}).Kind())          // slice
fmt.Println(reflect.TypeOf(map[string]int{}).Kind()) // map
fmt.Println(reflect.TypeOf((*User)(nil)).Kind())     // ptr
```

`MyInt` 的 Type 是 `main.MyInt`，Kind 是 `reflect.Int`。常见 Kind 包括 `Struct`、`Slice`、`Map`、`Ptr`、`Interface`、`Func`、`String` 等。

### 反射应用示例
```go
func StructToMap(obj any) map[string]any {
    out := map[string]any{}
    v := reflect.ValueOf(obj)
    if !v.IsValid() { return out }

    if v.Kind() == reflect.Ptr {
        if v.IsNil() { return out }
        v = v.Elem()
    }
    if v.Kind() != reflect.Struct { return out }

    t := v.Type()
    for i := 0; i < t.NumField(); i++ {
        f := t.Field(i)
        if !f.IsExported() { continue }
        name := strings.Split(f.Tag.Get("json"), ",")[0]
        if name == "-" { continue }
        if name == "" { name = f.Name }
        out[name] = v.Field(i).Interface()
    }
    return out
}
```

反射牺牲类型安全和性能，应避免在热路径反复做字段解析；常见做法是缓存元数据或用代码生成。

<!-- id: go-engineering-013; difficulty: 2; tags: 反射, 工程化; source: 高频 -->
# 如何用反射动态调用方法？如何修改结构体字段的值？

### 动态调用方法
```go
type Calculator struct{}
func (c *Calculator) Add(a, b int) int { return a + b }

func callMethod(obj any, name string, args ...any) ([]any, error) {
    m := reflect.ValueOf(obj).MethodByName(name)
    if !m.IsValid() {
        return nil, fmt.Errorf("method %s not found", name)
    }
    mt := m.Type()
    if len(args) != mt.NumIn() {
        return nil, fmt.Errorf("want %d args, got %d", mt.NumIn(), len(args))
    }

    in := make([]reflect.Value, len(args))
    for i, arg := range args {
        v := reflect.ValueOf(arg)
        want := mt.In(i)
        if !v.IsValid() || !v.Type().AssignableTo(want) {
            if v.IsValid() && v.Type().ConvertibleTo(want) {
                v = v.Convert(want)
            } else {
                return nil, fmt.Errorf("arg %d: want %v, got %v", i, want, v.Type())
            }
        }
        in[i] = v
    }

    values := m.Call(in)
    out := make([]any, len(values))
    for i, v := range values { out[i] = v.Interface() }
    return out, nil
}
```

`MethodByName` 只能找到导出方法；错误的参数个数或类型会 panic，所以生产代码要先检查。

### 修改结构体字段
```go
func setField(obj any, fieldName string, value any) error {
    v := reflect.ValueOf(obj)
    if v.Kind() != reflect.Ptr || v.IsNil() {
        return fmt.Errorf("obj must be non-nil pointer")
    }
    v = v.Elem()
    if v.Kind() != reflect.Struct {
        return fmt.Errorf("obj must point to struct")
    }

    f := v.FieldByName(fieldName)
    if !f.IsValid() { return fmt.Errorf("field not found") }
    if !f.CanSet() { return fmt.Errorf("field cannot be set") }

    nv := reflect.ValueOf(value)
    if !nv.IsValid() {
        f.Set(reflect.Zero(f.Type()))
        return nil
    }
    if nv.Type().AssignableTo(f.Type()) {
        f.Set(nv)
        return nil
    }
    if nv.Type().ConvertibleTo(f.Type()) {
        f.Set(nv.Convert(f.Type()))
        return nil
    }
    return fmt.Errorf("type mismatch: field=%v value=%v", f.Type(), nv.Type())
}
```

关键点：必须传可寻址的结构体指针；未导出字段不能安全 Set；反射绕过类型系统，错误应尽量在边界处返回而不是 panic。

<!-- id: go-engineering-014; difficulty: 2; tags: 泛型, 工程化; source: 高频 -->
# Go 泛型的类型参数语法是什么？如何定义类型约束？请写一个泛型工具函数示例。

### 基本语法
类型参数写在函数名或类型名后面的方括号里：

```go
func Map[T, U any](s []T, f func(T) U) []U {
    out := make([]U, len(s))
    for i, v := range s {
        out[i] = f(v)
    }
    return out
}

type Stack[T any] struct { items []T }
func (s *Stack[T]) Push(v T) { s.items = append(s.items, v) }
func (s *Stack[T]) Pop() (T, bool) {
    var zero T
    if len(s.items) == 0 { return zero, false }
    v := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return v, true
}
```

`any` 是 `interface{}` 的别名，表示不限制类型。

### 类型约束
约束本质上是接口。`comparable` 表示可以用 `==`/`!=`：

```go
func Contains[T comparable](s []T, x T) bool {
    for _, v := range s {
        if v == x { return true }
    }
    return false
}
```

需要排序比较时，标准库可用 `cmp.Ordered`：

```go
func Min[T cmp.Ordered](a, b T) T {
    if a < b { return a }
    return b
}
```

自定义类型集合：

```go
type Number interface {
    ~int | ~int64 | ~float32 | ~float64
}

func Sum[T Number](xs []T) T {
    var total T
    for _, x := range xs { total += x }
    return total
}
```

`~int` 表示底层类型是 int 的定义类型也满足约束，例如 `type UserID int`。

### 使用建议
泛型适合容器、算法、类型安全工具函数；约束越小越好。不要为了“高级”而把简单业务接口泛型化。

<!-- id: go-engineering-015; difficulty: 2; tags: 泛型, 工程化; source: 高频 -->
# 泛型和接口在 Go 中各有什么适用场景？如何选型？

### 核心区别
泛型抽象的是“同一段算法适用于多种类型”；接口抽象的是“不同类型具有同一组行为”。

| 维度 | 泛型 | 接口 |
|------|------|------|
| 关注点 | 类型参数和类型约束 | 方法集和行为 |
| 检查时机 | 编译期类型检查 | 接口赋值/调用的动态分发 |
| 典型用途 | 容器、算法、工具函数 | 多态、依赖注入、插件扩展 |
| 扩展方式 | 调用处选择类型实参 | 新类型实现方法即可 |

不要简单承诺泛型一定更快；具体实现、是否内联、是否逃逸都要看编译器和代码形态。

### 适合泛型
```go
type Set[T comparable] struct { m map[T]struct{} }

func Keys[K comparable, V any](m map[K]V) []K {
    keys := make([]K, 0, len(m))
    for k := range m { keys = append(keys, k) }
    return keys
}
```

当逻辑和元素行为无关，只是类型不同，泛型能保留类型安全。

### 适合接口
```go
type UserRepo interface {
    GetUser(ctx context.Context, id int64) (*User, error)
}

type Service struct { repo UserRepo }
```

当你关心的是对象能做什么，而不是它是什么类型，用接口更自然。`io.Reader`、`http.Handler` 是典型例子。

### 决策
- 容器/集合/算法：优先泛型
- 行为多态/依赖注入：优先接口
- 需要 `+`、`<`、`==` 这类运算约束：泛型
- 只为 `fmt.Println` 这种任意值透传：用 `any` 即可
- 约束写得很复杂时，先重新审视抽象是否过度

<!-- id: go-engineering-016; difficulty: 2; tags: 编译, 工程化; source: 高频 -->
# 如何使用 `//go:build` build tags 控制条件编译？如何用 `ldflags` 在编译时注入版本信息？

### build tags
构建约束必须位于文件顶部附近，在 package 声明之前，并和 package 之间留空行：

```go
//go:build linux && amd64

package main

func platformInfo() string { return "linux/amd64" }
```

Go 1.17+ 使用 `//go:build`。如果还要兼容 Go 1.16 及更早版本，需要同时写旧的 `// +build` 形式。

常见表达式：

```go
//go:build linux || darwin
//go:build !windows
//go:build (linux || darwin) && cgo
//go:build integration
```

编译或测试时指定自定义 tag：

```bash
go test -tags=integration ./...
go build -tags='prod feature_x' ./cmd/server
```

### ldflags 注入版本信息
`-X importpath.name=value` 只能设置包级 string 变量，不能设置 const，也不能设置非字符串变量。

```go
package main

var (
    Version   = "dev"
    BuildTime = "unknown"
    GitCommit = "unknown"
)
```

```bash
go build \
  -ldflags "-X 'main.Version=v1.2.3' -X 'main.GitCommit=$(git rev-parse --short HEAD)'" \
  -o bin/server ./cmd/server
```

如果变量不在 `main` 包，`importpath` 要写完整包路径，例如 `github.com/acme/app/internal/version.Version`。

### 常见构建参数
```bash
go build -trimpath -ldflags "-s -w" ./cmd/server
```

`-trimpath` 去掉本机路径，利于可复现构建；`-s -w` 减小体积，但会削弱调试信息，生产是否使用要结合排障需求决定。

<!-- id: go-engineering-017; difficulty: 2; tags: 编译, 工程化; source: 高频 -->
# 如何进行 Go 的交叉编译？在 Docker 和 CI 中如何优化构建？

### 交叉编译
设置 `GOOS` 和 `GOARCH`：

```bash
GOOS=linux GOARCH=amd64 go build -o dist/server-linux-amd64 ./cmd/server
GOOS=linux GOARCH=arm64 go build -o dist/server-linux-arm64 ./cmd/server
GOOS=darwin GOARCH=arm64 go build -o dist/server-darwin-arm64 ./cmd/server
GOOS=windows GOARCH=amd64 go build -o dist/server-windows-amd64.exe ./cmd/server

go tool dist list
```

纯 Go 项目交叉编译很直接。涉及 cgo 时，需要目标平台 C 交叉工具链：

```bash
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build ./cmd/server

CC=aarch64-linux-gnu-gcc CGO_ENABLED=1 GOOS=linux GOARCH=arm64 go build ./cmd/server
```

### Docker 多阶段构建
```dockerfile
FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .
RUN --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags "-s -w" -o /out/server ./cmd/server

FROM gcr.io/distroless/static-debian12
COPY --from=build /out/server /server
USER nonroot:nonroot
ENTRYPOINT ["/server"]
```

`scratch` 镜像最小，但要自己处理 CA 证书、时区、用户等；distroless 往往是更稳的默认选择。

### CI 优化
- 缓存 Go module cache：`GOMODCACHE`
- 缓存 build cache：`GOCACHE`
- 先 `go mod download` 提前暴露依赖问题
- 使用 `-trimpath` 和固定版本信息提高可复现性
- 发布多平台产物时固定 Go 版本、`GOOS/GOARCH`、`CGO_ENABLED` 和 ldflags

```makefile
VERSION := $(shell git describe --tags --always --dirty)
LDFLAGS := -ldflags "-X main.Version=$(VERSION)"

build:
	CGO_ENABLED=0 go build -trimpath $(LDFLAGS) -o bin/server ./cmd/server

test:
	go test -race ./...
```

<!-- id: go-engineering-018; difficulty: 2; tags: 错误处理, 工程化; source: 高频 -->
# 什么是哨兵错误（Sentinel Error）？与自定义错误类型相比有什么优缺点？

**哨兵错误（Sentinel Error）：**

预先定义的不可变错误值，用于标识特定的错误状态，调用方通过 `errors.Is` 比较来判断错误类型。

```go
// 定义哨兵错误（通常在包级别，以 Err 开头命名）
var (
    ErrNotFound      = errors.New("not found")
    ErrUnauthorized  = errors.New("unauthorized")
    ErrInvalidInput  = errors.New("invalid input")
)

// 使用哨兵错误
func GetUser(id int) (*User, error) {
    if id <= 0 {
        return nil, fmt.Errorf("GetUser: %w", ErrInvalidInput)
    }
    user, ok := db[id]
    if !ok {
        return nil, fmt.Errorf("GetUser(%d): %w", id, ErrNotFound)
    }
    return user, nil
}

// 调用方
user, err := GetUser(42)
if errors.Is(err, ErrNotFound) {
    // HTTP 返回 404
}
```

**自定义错误类型：**

```go
// 携带上下文信息的错误类型
type NotFoundError struct {
    Resource string
    ID       int
}

func (e *NotFoundError) Error() string {
    return fmt.Sprintf("%s with id=%d not found", e.Resource, e.ID)
}

func GetUser(id int) (*User, error) {
    if _, ok := db[id]; !ok {
        return nil, &NotFoundError{Resource: "user", ID: id}
    }
    return db[id], nil
}

// 调用方可提取详细信息
user, err := GetUser(42)
var nfe *NotFoundError
if errors.As(err, &nfe) {
    fmt.Printf("找不到 %s #%d\n", nfe.Resource, nfe.ID)
}
```

**对比：**

| 维度 | 哨兵错误 | 自定义错误类型 |
|------|---------|-------------|
| 简洁性 | ✅ 简单，一行定义 | ❌ 需要定义结构体和 Error() 方法 |
| 上下文信息 | ❌ 无（只有静态字符串）| ✅ 可携带任意字段 |
| 包耦合 | ⚠️ 调用方 import 你的包才能比较 | ✅ `errors.As` 仍可通过接口解耦 |
| 适用场景 | 简单状态标识 | 需要错误详情的场景 |

**最佳实践：**

```go
// 推荐：结合使用
// 1. 简单状态用哨兵错误
var ErrNotFound = errors.New("not found")

// 2. 需要详情时用自定义类型，但实现 Is 方法与哨兵对应
type DetailedNotFoundError struct {
    Resource string
    ID       int
}

func (e *DetailedNotFoundError) Error() string {
    return fmt.Sprintf("%s %d: not found", e.Resource, e.ID)
}

// Is 使 errors.Is(err, ErrNotFound) 也能匹配
func (e *DetailedNotFoundError) Is(target error) bool {
    return target == ErrNotFound
}
```

<!-- id: go-engineering-019; difficulty: 2; tags: 项目结构, 工程化; source: 高频 -->
# Go 项目中依赖注入（DI）有哪些常见方式？请对比构造函数注入和 Wire 框架。

### 常见 DI 方式
Go 最常见的是显式构造函数注入：依赖作为参数传入，main 或 app 包负责组装对象图。

```go
type UserRepo interface {
    GetUser(ctx context.Context, id int64) (*User, error)
    SaveUser(ctx context.Context, u *User) error
}

type UserService struct { repo UserRepo }

func NewUserService(repo UserRepo) *UserService {
    return &UserService{repo: repo}
}
```

入口处手动组装：

```go
db := database.NewPostgres(config.DSN)
repo := repository.NewUserRepo(db)
svc := service.NewUserService(repo)
h := handler.NewUserHandler(svc)
```

优点是简单、可读、调试直接；缺点是依赖图大时样板代码多。

### Wire
Wire 是编译期 DI 代码生成工具，通过 provider set 生成手写风格的初始化代码，不使用运行时反射：

```go
//go:build wireinject

func InitializeApp(cfg Config) (*App, error) {
    wire.Build(
        database.NewPostgres,
        repository.NewUserRepo,
        service.NewUserService,
        handler.NewUserHandler,
        NewApp,
    )
    return nil, nil
}
```

生成结果本质上是普通 Go 初始化代码，编译期可检查依赖缺失和类型不匹配。

### 当前维护状态
需要注意：`google/wire` 仓库已归档、只读，项目不再正常维护。新项目应谨慎引入，评估 fork、替代工具或继续手写组装；已有项目可以继续使用生成代码，但要把工具链兼容性风险纳入维护计划。

### 对比
| 维度 | 构造函数注入 | Wire |
|------|--------------|------|
| 复杂度 | 低 | 中等，需要生成步骤 |
| 调试 | 直接 | 需要理解生成代码 |
| 依赖图大时 | 样板多 | 自动生成减少样板 |
| 运行时开销 | 无 | 无 |
| 维护风险 | 最低 | 受生成工具维护状态影响 |

不推荐用全局变量做 DI，它隐藏依赖、破坏测试隔离，也容易引入初始化顺序问题。

<!-- id: go-engineering-020; difficulty: 2; tags: go generate, 工程化; source: 高频 -->
# `go generate` 的作用是什么？在哪些场景下会用到它？

`go generate` 会扫描源文件里的 `//go:generate` 指令，并在对应包目录下执行命令。它用于生成代码或资源，不会被 `go build`、`go test` 自动触发。

```go
//go:generate <command> <args>
```

### 常见场景
Mock：

```go
//go:generate mockgen -source=repository.go -destination=mock_repository_test.go -package=repository
```

Protobuf/gRPC：

```go
//go:generate protoc --go_out=. --go-grpc_out=. api/user.proto
```

枚举 String 方法：

```go
//go:generate stringer -type=Weekday
```

依赖注入生成：

```go
//go:generate wire
```

Go 1.16+ 静态资源优先使用标准库 `embed`；旧的 bindata 类工具只有在需要特殊打包行为时再考虑。

### 运行
```bash
go generate ./...
go generate -run mockgen ./...
go generate -v ./internal/...
```

### 实践建议
- 固定生成工具版本，例如用 `tools.go` 加 `//go:build tools` 管理工具依赖
- 在 CI 中检查生成结果是否已提交
- 生成文件头部应包含 `// Code generated ... DO NOT EDIT.`
- 是否提交生成文件取决于团队：库和需要开箱即构建的项目通常提交；内部项目也可选择 CI 生成，但要保证工具链可复现

<!-- id: go-engineering-021; difficulty: 3; tags: unsafe, 工程化; source: 高频 -->
# `unsafe.Pointer` 的合法使用规则是什么？`uintptr` 与 `unsafe.Pointer` 有什么陷阱？

`unsafe.Pointer` 只能在少数明确模式下使用，核心原则是：不要让 GC 丢失真实指针，不要假设不兼容类型的布局，不要把 `uintptr` 当指针保存。

### 指针类型转换
```go
func Float64bits(f float64) uint64 {
    return *(*uint64)(unsafe.Pointer(&f))
}
```

只有在目标类型布局、大小、对齐都符合预期时才合法；更常见时应优先用标准库函数，例如 `math.Float64bits`。

### 指针算术
现代 Go 优先使用 `unsafe.Add`：

```go
type T struct { X, Y int32 }
p := &T{X: 1, Y: 2}
yp := (*int32)(unsafe.Add(unsafe.Pointer(p), unsafe.Offsetof(p.Y)))
```

旧写法会经过 `uintptr`，必须在同一表达式中完成转换、运算、转回指针：

```go
yp := (*int32)(unsafe.Pointer(uintptr(unsafe.Pointer(p)) + unsafe.Offsetof(p.Y)))
```

不要这样做：

```go
u := uintptr(unsafe.Pointer(p))
runtime.GC()
ptr := (*T)(unsafe.Pointer(u)) // u 不是 GC root，p 可能已经不再存活
```

需要确保对象活到最后一次使用，可配合 `runtime.KeepAlive(p)`。

### string / []byte 零拷贝
```go
func BytesToString(b []byte) string {
    return unsafe.String(unsafe.SliceData(b), len(b))
}
```

`string` 到 `[]byte` 的零拷贝切片必须视为只读，修改会违反字符串不可变语义，可能崩溃或造成数据破坏。除非 profile 证明必要，否则用普通转换：`[]byte(s)`、`string(b)`。

### 使用原则
- 能不用就不用；先找标准库、`encoding/binary`、`math`、`slices` 等安全方案
- 每处 unsafe 都写清楚布局假设、生命周期假设和为什么安全
- 不把 `uintptr` 存字段、全局变量或跨函数传递来伪装指针
- unsafe 代码要有针对架构、Go 版本和 race/asan 的测试

<!-- id: go-engineering-022; difficulty: 3; tags: 反射, 泛型; source: 高频 -->
# 如何利用反射实现一个通用的深拷贝（Deep Copy）函数？请分析其性能瓶颈和替代方案。

反射可以实现通用 deep copy，但完整正确很难：循环引用、共享引用保持、未导出字段、接口动态类型、map key、func/channel、unsafe 指针都要定义语义。

简化版示例：

```go
func DeepCopy[T any](src T) T {
    v := reflect.ValueOf(src)
    if !v.IsValid() { return src }
    copied := deepCopy(v, map[uintptr]reflect.Value{})
    return copied.Interface().(T)
}

func deepCopy(v reflect.Value, seen map[uintptr]reflect.Value) reflect.Value {
    switch v.Kind() {
    case reflect.Ptr:
        if v.IsNil() { return reflect.Zero(v.Type()) }
        ptr := v.Pointer()
        if old, ok := seen[ptr]; ok { return old }
        out := reflect.New(v.Type().Elem())
        seen[ptr] = out
        out.Elem().Set(deepCopy(v.Elem(), seen))
        return out
    case reflect.Struct:
        out := reflect.New(v.Type()).Elem()
        for i := 0; i < v.NumField(); i++ {
            if v.Type().Field(i).IsExported() && out.Field(i).CanSet() {
                out.Field(i).Set(deepCopy(v.Field(i), seen))
            }
        }
        return out
    case reflect.Slice:
        if v.IsNil() { return reflect.Zero(v.Type()) }
        out := reflect.MakeSlice(v.Type(), v.Len(), v.Len())
        for i := 0; i < v.Len(); i++ { out.Index(i).Set(deepCopy(v.Index(i), seen)) }
        return out
    case reflect.Map:
        if v.IsNil() { return reflect.Zero(v.Type()) }
        out := reflect.MakeMapWithSize(v.Type(), v.Len())
        for _, k := range v.MapKeys() { out.SetMapIndex(k, deepCopy(v.MapIndex(k), seen)) }
        return out
    case reflect.Interface:
        if v.IsNil() { return reflect.Zero(v.Type()) }
        cv := deepCopy(v.Elem(), seen)
        return cv
    default:
        return v
    }
}
```

局限：未导出字段被跳过；map key 没有深拷贝，避免破坏可比较性；func/channel 只能浅拷贝；复杂对象图仍需更完整的 seen 逻辑。

### 性能瓶颈
反射会带来运行时类型分发、不可内联、额外分配、接口装箱和大量小对象遍历。热路径上通常不适合。

### 替代方案
- 手写 `Clone`：最快、语义最明确
- 代码生成：适合大量结构体，性能接近手写
- 序列化再反序列化：简单但慢，且会丢失未导出字段、函数、channel、共享引用等语义
- 重新设计所有权：尽量用不可变值或复制小片段，避免全量 deep copy

<!-- id: go-engineering-023; difficulty: 3; tags: 泛型, 错误处理; source: 高频 -->
# 请用 Go 泛型实现一个类型安全的 `Result[T]` 类型（类似 Rust 的 Result），并说明其适用场景。

```go
type Result[T any] struct {
    value T
    err   error
}

func Ok[T any](v T) Result[T] { return Result[T]{value: v} }

func Err[T any](err error) Result[T] {
    if err == nil { panic("nil error") }
    return Result[T]{err: err}
}

func (r Result[T]) IsOk() bool  { return r.err == nil }
func (r Result[T]) IsErr() bool { return r.err != nil }

func (r Result[T]) Unwrap() T {
    if r.err != nil { panic(r.err) }
    return r.value
}

func (r Result[T]) UnwrapOr(def T) T {
    if r.err != nil { return def }
    return r.value
}

func (r Result[T]) Unpack() (T, error) { return r.value, r.err }

func Map[T, U any](r Result[T], f func(T) U) Result[U] {
    if r.err != nil { return Err[U](r.err) }
    return Ok(f(r.value))
}

func AndThen[T, U any](r Result[T], f func(T) Result[U]) Result[U] {
    if r.err != nil { return Err[U](r.err) }
    return f(r.value)
}
```

适用场景：函数式 pipeline、DSL、批处理结果集合、需要把成功值和错误值放进同一种容器时。

不适用场景：普通 Go API。Go 生态惯例仍是 `(T, error)`，它和 `defer`、早返回、`errors.Is/As`、标准库风格配合最好。`Result[T]` 不能像 Rust 的 `?` 一样由语言强制传播，也不能阻止调用方直接忽略返回值；引入前要评估团队可读性和生态摩擦。

<!-- id: go-engineering-024; difficulty: 3; tags: testing, 工程化; source: 高频 -->
# 如何在 Go 中实现集成测试和 E2E 测试的隔离？如何使用 `httptest` 包测试 HTTP Handler？

**使用 `net/http/httptest` 测试 HTTP Handler（无需启动真实服务器）：**

```go
package handler_test

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

// 被测 Handler
func CreateUserHandler(svc UserService) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var req CreateUserRequest
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
            http.Error(w, "invalid request", http.StatusBadRequest)
            return
        }
        user, err := svc.CreateUser(r.Context(), req)
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusCreated)
        json.NewEncoder(w).Encode(user)
    }
}

// 测试
func TestCreateUserHandler(t *testing.T) {
    tests := []struct {
        name       string
        body       interface{}
        mockSetup  func(*MockUserService)
        wantStatus int
        wantBody   string
    }{
        {
            name: "成功创建用户",
            body: CreateUserRequest{Name: "Alice", Email: "alice@example.com"},
            mockSetup: func(m *MockUserService) {
                m.On("CreateUser", mock.Anything, mock.Anything).
                    Return(&User{ID: 1, Name: "Alice"}, nil)
            },
            wantStatus: http.StatusCreated,
        },
        {
            name:       "请求体无效",
            body:       "invalid json",
            mockSetup:  func(m *MockUserService) {},
            wantStatus: http.StatusBadRequest,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // 构建 mock service
            mockSvc := &MockUserService{}
            tt.mockSetup(mockSvc)

            // 序列化请求体
            body, _ := json.Marshal(tt.body)
            req := httptest.NewRequest(http.MethodPost, "/users", bytes.NewReader(body))
            req.Header.Set("Content-Type", "application/json")

            // 创建 ResponseRecorder（模拟 http.ResponseWriter）
            rec := httptest.NewRecorder()

            // 执行 Handler
            CreateUserHandler(mockSvc).ServeHTTP(rec, req)

            // 断言
            assert.Equal(t, tt.wantStatus, rec.Code)
            mockSvc.AssertExpectations(t)
        })
    }
}
```

**使用 `httptest.NewServer` 测试真实 HTTP 客户端：**

```go
func TestHTTPClient(t *testing.T) {
    // 启动本地测试服务器（端口随机分配）
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if r.URL.Path == "/users/1" {
            w.Header().Set("Content-Type", "application/json")
            json.NewEncoder(w).Encode(User{ID: 1, Name: "Alice"})
            return
        }
        w.WriteHeader(http.StatusNotFound)
    }))
    defer server.Close() // 测试结束后关闭

    // 使用测试服务器 URL
    client := NewUserClient(server.URL)
    user, err := client.GetUser(context.Background(), 1)

    require.NoError(t, err)
    assert.Equal(t, "Alice", user.Name)
}
```

**集成测试隔离（使用 Build Tags）：**

```go
//go:build integration

package integration_test

import (
    "testing"
    "os"
)

// 只在明确指定 integration tag 时运行
// go test -tags integration ./test/integration/...

func TestUserServiceIntegration(t *testing.T) {
    dsn := os.Getenv("TEST_DB_DSN")
    if dsn == "" {
        t.Skip("TEST_DB_DSN not set, skipping integration test")
    }
    // ... 连接真实数据库测试
}
```

**TestContainers（真实依赖的集成测试）：**

```go
//go:build integration

func TestWithRealPostgres(t *testing.T) {
    ctx := context.Background()

    // 启动临时 PostgreSQL 容器
    container, err := postgres.RunContainer(ctx,
        testcontainers.WithImage("postgres:16"),
        postgres.WithDatabase("testdb"),
        postgres.WithUsername("test"),
        postgres.WithPassword("test"),
    )
    require.NoError(t, err)
    defer container.Terminate(ctx)

    dsn, _ := container.ConnectionString(ctx)
    db, _ := sql.Open("postgres", dsn)
    defer db.Close()

    // 运行真实数据库测试
    repo := repository.NewUserRepo(db)
    // ...
}
```

<!-- id: go-engineering-025; difficulty: 3; tags: 编译, modules; source: 高频 -->
# 如何分析和优化 Go 二进制文件的体积？有哪些常用手段？

### 分析体积
```bash
ls -lh bin/myapp

go tool nm -size bin/myapp | sort -k2 -nr | head -30

go version -m bin/myapp

go tool objdump -s 'main\.' bin/myapp
```

第三方工具如 `goweight`、`bloaty` 可按包或段分析体积。先定位体积来源，再决定优化，不要盲目压缩。

### 常用优化
去掉路径和调试信息：

```bash
go build -trimpath -ldflags='-s -w' -o bin/myapp ./cmd/server
```

`-s -w` 能明显减小体积，但会影响调试和符号化。对需要线上剖析、core dump 或精细排障的服务，要权衡是否保留符号。

减少依赖：

```bash
go mod why github.com/heavy/pkg
go mod graph
```

优先移除大而间接的依赖，或用标准库替代，例如简单日志用 `log/slog`，简单 CLI 用 `flag`。

CGO 和静态链接：

```bash
CGO_ENABLED=0 go build -trimpath ./cmd/server
```

禁用 cgo 常让部署更简单，但体积不一定更小；DNS、用户查询、系统库行为也可能变化，需要测试。

UPX：可以进一步压缩磁盘体积，但会增加启动解压成本，影响安全扫描、调试和某些运行环境兼容性。适合分发小工具，不一定适合服务端容器。

### 代码层面
- 避免为了少量功能引入大型框架
- 不要滥用反射注册和全量导入
- 泛型可能增加实例化代码，也可能共享实现，不能简单断言“一种类型一份完整代码”；以实际二进制分析为准
- 用构建 tag 拆分可选功能，例如 `sqlite`、`debug`、`enterprise`

优化目标要明确：磁盘体积、镜像体积、冷启动、内存占用和可调试性经常相互冲突。

<!-- id: go-engineering-026; difficulty: 3; tags: 错误处理, 工程化; source: 高频 -->
# 如何设计一个生产级别的错误处理体系？请涵盖错误分类、上下文包装、日志记录和 HTTP 映射。

生产级错误体系要分清三件事：底层错误链用于排障，业务错误码用于稳定判断，公开消息用于返回给用户。数据库 SQL、上游响应体、token、内部路径和调用栈不要直接写进 HTTP 响应。

```go
package apperrors

import (
    "context"
    "errors"
    "fmt"
    "net/http"
)

type Code string

const (
    CodeUnknown      Code = "UNKNOWN"
    CodeInvalidInput Code = "INVALID_INPUT"
    CodeNotFound     Code = "NOT_FOUND"
    CodeConflict     Code = "CONFLICT"
    CodeUnauthorized Code = "UNAUTHORIZED"
    CodeForbidden    Code = "FORBIDDEN"
    CodeCanceled     Code = "CANCELED"
    CodeTimeout      Code = "TIMEOUT"
    CodeInternal     Code = "INTERNAL"
)

type AppError struct {
    Code   Code
    Op     string
    Public string
    Err    error
}

func (e *AppError) Error() string {
    if e == nil {
        return "<nil>"
    }
    if e.Err != nil {
        return fmt.Sprintf("%s: %s: %v", e.Op, e.Code, e.Err)
    }
    return fmt.Sprintf("%s: %s", e.Op, e.Code)
}

func (e *AppError) Unwrap() error { return e.Err }

func New(code Code, op, public string) error {
    return &AppError{Code: code, Op: op, Public: public}
}

func Wrap(err error, code Code, op, public string) error {
    if err == nil {
        return nil
    }
    return &AppError{Code: code, Op: op, Public: public, Err: err}
}

func CodeOf(err error) Code {
    switch {
    case err == nil:
        return CodeUnknown
    case errors.Is(err, context.Canceled):
        return CodeCanceled
    case errors.Is(err, context.DeadlineExceeded):
        return CodeTimeout
    }
    var ae *AppError
    if errors.As(err, &ae) && ae.Code != "" {
        return ae.Code
    }
    return CodeInternal
}

func PublicMessage(err error) string {
    var ae *AppError
    if errors.As(err, &ae) && ae.Public != "" {
        return ae.Public
    }
    if errors.Is(err, context.Canceled) {
        return "请求已取消"
    }
    if errors.Is(err, context.DeadlineExceeded) {
        return "请求超时"
    }
    return "服务器内部错误"
}

func HTTPStatus(code Code) int {
    switch code {
    case CodeInvalidInput:
        return http.StatusBadRequest
    case CodeUnauthorized:
        return http.StatusUnauthorized
    case CodeForbidden:
        return http.StatusForbidden
    case CodeNotFound:
        return http.StatusNotFound
    case CodeConflict:
        return http.StatusConflict
    case CodeCanceled:
        return 499
    case CodeTimeout:
        return http.StatusGatewayTimeout
    default:
        return http.StatusInternalServerError
    }
}
```

业务层只补上下文和错误码，保留 `%w` 错误链，交给边界统一处理：

```go
func (s *UserService) GetUser(ctx context.Context, id int64) (*User, error) {
    const op = "UserService.GetUser"

    if id <= 0 {
        return nil, apperrors.New(apperrors.CodeInvalidInput, op, "id 必须为正数")
    }

    user, err := s.repo.GetUser(ctx, id)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, apperrors.New(apperrors.CodeNotFound, op, "用户不存在")
        }
        return nil, apperrors.Wrap(err, apperrors.CodeInternal, op, "读取用户失败")
    }
    return user, nil
}
```

HTTP 层只在边界记录一次完整错误链，并把状态码和公开消息返回给客户端：

```go
type ErrorResponse struct {
    Code    string `json:"code"`
    Message string `json:"message"`
}

func respondError(w http.ResponseWriter, r *http.Request, err error, logger *slog.Logger) {
    code := apperrors.CodeOf(err)
    status := apperrors.HTTPStatus(code)

    attrs := []any{"method", r.Method, "path", r.URL.Path, "code", code, "err", err}
    if status >= 500 {
        logger.ErrorContext(r.Context(), "request failed", attrs...)
    } else {
        logger.InfoContext(r.Context(), "request rejected", attrs...)
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    _ = json.NewEncoder(w).Encode(ErrorResponse{
        Code:    string(code),
        Message: apperrors.PublicMessage(err),
    })
}
```

实践要点：错误码要稳定，不把日志职责分散到每一层；可重试、幂等、告警等级等策略最好绑定到错误码或错误分类，而不是靠字符串匹配。

<!-- id: go-engineering-027; difficulty: 3; tags: modules, 编译; source: 高频 -->
# 如何管理 Go 项目的多环境配置？请对比 `init()` 函数加载、`embed` 嵌入和环境变量三种方式。

多环境配置建议做成显式的 `Load` 流程：默认值 -> 配置文件或 embed 默认配置 -> 环境变量或命令行覆盖 -> 校验。不要在 `init()` 里读配置，也不要在返回 `error` 的加载函数里偷偷 `panic`。

**环境变量：适合容器和 12-Factor 部署。**

```go
package config

import (
    "fmt"
    "os"
    "strconv"
    "time"
)

type Config struct {
    Host        string
    Port        int
    ReadTimeout time.Duration
    DBDSN       string
    DBMaxConns  int
    Debug       bool
}

func Load() (*Config, error) {
    cfg := &Config{
        Host:        getenv("APP_HOST", "0.0.0.0"),
        Port:        8080,
        ReadTimeout: 5 * time.Second,
        DBMaxConns:  10,
    }

    if v, ok := os.LookupEnv("APP_PORT"); ok {
        port, err := strconv.Atoi(v)
        if err != nil {
            return nil, fmt.Errorf("APP_PORT: %w", err)
        }
        cfg.Port = port
    }

    dsn, ok := os.LookupEnv("DATABASE_DSN")
    if !ok || dsn == "" {
        return nil, fmt.Errorf("DATABASE_DSN is required")
    }
    cfg.DBDSN = dsn

    return cfg, cfg.Validate()
}

func getenv(key, fallback string) string {
    if v, ok := os.LookupEnv(key); ok {
        return v
    }
    return fallback
}

func (c *Config) Validate() error {
    if c.Port < 1 || c.Port > 65535 {
        return fmt.Errorf("invalid port %d", c.Port)
    }
    if c.DBMaxConns < 1 {
        return fmt.Errorf("DB_MAX_CONNS must be positive")
    }
    return nil
}
```

测试时用 `t.Setenv` 设置环境变量，避免全局状态污染。解析失败要返回错误，不能静默回落到默认值，否则线上会把错配伪装成正常配置。

**`embed`：适合把非敏感默认配置打进二进制。**

```go
import (
    "embed"
    "encoding/json"
)

//go:embed defaults.json
var defaultsJSON []byte

//go:embed configs
var configFS embed.FS

func LoadWithDefaults(env string) (*Config, error) {
    var cfg Config
    if err := json.Unmarshal(defaultsJSON, &cfg); err != nil {
        return nil, fmt.Errorf("parse defaults: %w", err)
    }

    if env != "" {
        data, err := configFS.ReadFile("configs/" + env + ".json")
        if err != nil {
            return nil, fmt.Errorf("read %s config: %w", env, err)
        }
        if err := json.Unmarshal(data, &cfg); err != nil {
            return nil, fmt.Errorf("parse %s config: %w", env, err)
        }
    }
    return &cfg, cfg.Validate()
}
```

`embed` 的配置修改需要重新构建，不适合放密码、token、证书私钥等秘密。常见做法是 embed 默认值，再用环境变量或部署平台 secret 覆盖。

**`init()`：不推荐加载业务配置。**

```go
var globalConfig *Config

func init() {
    cfg, err := loadFromFile("config.yaml")
    if err != nil {
        panic(err)
    }
    globalConfig = cfg
}
```

`init()` 会制造隐藏依赖和不可控的全局状态，测试替换困难，也让导入包产生 I/O 副作用。它更适合注册 codec、driver 这类无外部环境依赖的初始化。

如果使用 Viper，要显式说明键名映射。`SetEnvPrefix("APP")` 加 `SetEnvKeyReplacer(".", "_")` 会把 `server.port` 映射成 `APP_SERVER_PORT`；如果想用 `APP_PORT`，需要 `BindEnv("server.port", "APP_PORT")`。Viper 功能强，但依赖重、反射多，简单服务用标准库通常更清晰。

<!-- id: go-engineering-028; difficulty: 3; tags: lint, go generate; source: 高频 -->
# 如何用 `go/ast` 和 `analysis` 框架编写自定义静态分析 Pass？请给出一个检查"error 返回值未被处理"的简化示例。

`analysis` 框架的核心是定义一个 `*analysis.Analyzer`，在 `Run` 里读取 AST、类型信息和依赖 Pass 的结果。下面示例只检查“函数调用作为独立语句出现，且返回值中包含 error”的情况，真实的 `errcheck` 还要处理赋值给 `_`、`defer`、`go`、类型断言等更多场景。

```go
package errcheck

import (
    "go/ast"
    "go/types"

    "golang.org/x/tools/go/analysis"
    "golang.org/x/tools/go/analysis/passes/inspect"
    "golang.org/x/tools/go/ast/inspector"
)

var Analyzer = &analysis.Analyzer{
    Name:     "customerrcheck",
    Doc:      "reports calls whose error result is ignored",
    Requires: []*analysis.Analyzer{inspect.Analyzer},
    Run:      run,
}

func run(pass *analysis.Pass) (any, error) {
    insp := pass.ResultOf[inspect.Analyzer].(*inspector.Inspector)
    insp.Preorder([]ast.Node{(*ast.ExprStmt)(nil)}, func(n ast.Node) {
        stmt := n.(*ast.ExprStmt)
        call, ok := stmt.X.(*ast.CallExpr)
        if !ok {
            return
        }
        if returnsError(pass, call) {
            pass.Reportf(call.Pos(), "error return value is ignored")
        }
    })
    return nil, nil
}

func returnsError(pass *analysis.Pass, call *ast.CallExpr) bool {
    tv, ok := pass.TypesInfo.Types[call]
    if !ok || tv.Type == nil {
        return false
    }

    if tuple, ok := tv.Type.(*types.Tuple); ok {
        for i := 0; i < tuple.Len(); i++ {
            if isErrorType(tuple.At(i).Type()) {
                return true
            }
        }
        return false
    }
    return isErrorType(tv.Type)
}

func isErrorType(t types.Type) bool {
    if t == nil {
        return false
    }
    errType := types.Universe.Lookup("error").Type()
    errIface := errType.Underlying().(*types.Interface)
    return types.Identical(t, errType) || types.Implements(t, errIface)
}
```

独立运行工具通常用 `singlechecker`：

```go
package main

import (
    "example.com/project/analyzer/errcheck"
    "golang.org/x/tools/go/analysis/singlechecker"
)

func main() {
    singlechecker.Main(errcheck.Analyzer)
}
```

```bash
go run ./cmd/customerrcheck ./...
```

测试用 `analysistest`，在 `testdata/src/a/a.go` 里用 `// want` 标注预期诊断：

```go
func bad() {
    os.Remove("/tmp/x") // want "error return value is ignored"
}

func good() {
    if err := os.Remove("/tmp/x"); err != nil {
        _ = err
    }
}
```

集成到 CI 时，最稳定的是把它作为独立命令或 `multichecker` 运行。golangci-lint 的自定义 analyzer/plugin 机制随版本变化较大，应按当前版本官方文档接入，不要假设所有版本都支持同一种 `path: bin/tool` 配置。

<!-- id: go-engineering-029; difficulty: 3; tags: unsafe, 反射; source: 高频 -->
# 如何使用 `go:linkname` 访问标准库的私有符号？有哪些风险和合法使用场景？

`//go:linkname` 可以把当前包里的声明链接到另一个包的符号，包括未导出的符号。它绕过 Go 的包封装和类型边界，属于最后手段；访问标准库私有符号尤其脆弱。

基本形式如下，文件必须导入 `unsafe`，本地声明通常没有函数体，签名必须和目标符号完全一致：

```go
package internalhack

import _ "unsafe"

// 仅展示语法；真实标准库符号名、签名和可访问性随 Go 版本变化。
//go:linkname localName runtime.someUnexportedSymbol
func localName(arg uintptr) uintptr
```

风险很高：

- 私有符号没有兼容性承诺，名称、签名、语义和内存布局都可能在 Go 升级时变化。
- 签名写错时编译器无法像普通调用那样完整保护你，结果可能是崩溃、数据破坏或隐蔽竞态。
- 它会破坏模块封装，让依赖关系变成隐式 ABI 依赖，代码审查和升级都更困难。
- Go 1.23 起链接器加强了对标准库 linkname 的检查；很多旧式“链接到任意标准库私有符号”的写法会失败。`//go:build ignore` 不能绕过这个检查，`-ldflags=-checklinkname=0` 也只应作为临时迁移手段，不应进入常规生产构建。

更合适的替代方案通常是：

- 使用公开 API，例如 `runtime/metrics`、`debug.ReadBuildInfo`、`time`、`net/netip`、`slices`、`maps` 等标准库能力。
- 使用 `golang.org/x/sys`、`x/exp` 或项目内明确暴露的 internal 适配层，而不是直接碰 runtime 私有符号。
- 如果只是测试内部行为，把测试放在同一包或通过受控测试 hook 暴露。

相对合理的使用场景很少：Go 标准库自身、runtime/编译器相关工具、被 Go 团队显式保留兼容的历史 linkname 符号，或者强约束的内部工具。即便如此，也要把代码隔离到单独文件，写明依赖的 Go 版本、替代方案和升级验证清单，并在 CI 中覆盖目标 Go 版本。

<!-- id: go-engineering-030; difficulty: 3; tags: 项目结构, 测试, 编译; source: 高频 -->
# 如何设计一个支持插件化扩展的 Go 微服务框架骨架？请涵盖中间件链、依赖注入和优雅关闭。

插件化微服务骨架要把生命周期拆开：`Register` 只注册路由、依赖和中间件；`Start` 启动后台任务；`Stop` 释放资源。框架负责启动顺序、失败回滚、HTTP 入口关闭和插件逆序停止。

```go
package framework

import (
    "context"
    "errors"
    "fmt"
    "net/http"
    "os"
    "os/signal"
    "sync"
    "syscall"
    "time"
)

type Middleware func(http.Handler) http.Handler

func Chain(middlewares ...Middleware) Middleware {
    return func(next http.Handler) http.Handler {
        for i := len(middlewares) - 1; i >= 0; i-- {
            next = middlewares[i](next)
        }
        return next
    }
}

type Container struct {
    mu     sync.RWMutex
    values map[string]any
}

func NewContainer() *Container {
    return &Container{values: map[string]any{}}
}

func (c *Container) Set(name string, value any) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.values[name] = value
}

func (c *Container) Get(name string) (any, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    value, ok := c.values[name]
    return value, ok
}

type Plugin interface {
    Name() string
    Register(app *App) error
    Start(ctx context.Context) error
    Stop(ctx context.Context) error
}

type App struct {
    mux         *http.ServeMux
    container   *Container
    middlewares []Middleware
    plugins     []Plugin
    server      *http.Server
}

func New(addr string) *App {
    return &App{
        mux:       http.NewServeMux(),
        container: NewContainer(),
        server:    &http.Server{Addr: addr},
    }
}

func (a *App) Use(m Middleware) { a.middlewares = append(a.middlewares, m) }
func (a *App) Handle(pattern string, h http.Handler) { a.mux.Handle(pattern, h) }
func (a *App) Provide(name string, value any) { a.container.Set(name, value) }

func (a *App) UsePlugin(plugin Plugin) error {
    if err := plugin.Register(a); err != nil {
        return fmt.Errorf("register plugin %s: %w", plugin.Name(), err)
    }
    a.plugins = append(a.plugins, plugin)
    return nil
}

func (a *App) handler() http.Handler {
    return Chain(a.middlewares...)(a.mux)
}

func (a *App) Run(ctx context.Context) error {
    ctx, stopSignals := signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)
    defer stopSignals()

    started := make([]Plugin, 0, len(a.plugins))
    for _, plugin := range a.plugins {
        if err := plugin.Start(ctx); err != nil {
            stopErr := stopPlugins(context.Background(), started)
            return errors.Join(fmt.Errorf("start plugin %s: %w", plugin.Name(), err), stopErr)
        }
        started = append(started, plugin)
    }

    a.server.Handler = a.handler()
    errCh := make(chan error, 1)
    go func() { errCh <- a.server.ListenAndServe() }()

    var runErr error
    select {
    case <-ctx.Done():
    case err := <-errCh:
        if !errors.Is(err, http.ErrServerClosed) {
            runErr = err
        }
    }

    shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    if err := a.server.Shutdown(shutdownCtx); err != nil {
        runErr = errors.Join(runErr, err)
    }
    runErr = errors.Join(runErr, stopPlugins(shutdownCtx, started))
    return runErr
}

func stopPlugins(ctx context.Context, plugins []Plugin) error {
    var err error
    for i := len(plugins) - 1; i >= 0; i-- {
        if stopErr := plugins[i].Stop(ctx); stopErr != nil {
            err = errors.Join(err, fmt.Errorf("stop plugin %s: %w", plugins[i].Name(), stopErr))
        }
    }
    return err
}
```

关键点：中间件链在启动时组装一次，避免每个请求重复构建；DI 容器至少要并发安全，生产中可进一步做成类型安全 provider；启动失败要回滚已启动插件；HTTP 服务报错和关闭错误都不能跳过插件清理；插件停止顺序通常与启动顺序相反。
