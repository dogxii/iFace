# Web开发

<!-- id: go-web-001; difficulty: 1; tags: net/http, Web开发; source: 高频 -->
# Go 标准库 `net/http` 中 `Handler` 接口的定义是什么？如何实现一个最简单的 HTTP 服务器？

`net/http` 的核心抽象是 `http.Handler`：

```go
type Handler interface {
    ServeHTTP(ResponseWriter, *Request)
}
```
任何实现 `ServeHTTP(http.ResponseWriter, *http.Request)` 的类型都可以处理 HTTP 请求；普通函数可通过 `http.HandlerFunc` 适配为 Handler。

```go
package main

import (
    "errors"
    "fmt"
    "log"
    "net/http"
    "time"
)

func hello(w http.ResponseWriter, r *http.Request) {
    if r.URL.Path != "/hello" {
        http.NotFound(w, r)
        return
    }
    fmt.Fprintln(w, "hello")
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("GET /hello", hello)

    srv := &http.Server{
        Addr:              ":8080",
        Handler:           mux,
        ReadHeaderTimeout: 3 * time.Second,
        ReadTimeout:       10 * time.Second,
        WriteTimeout:      15 * time.Second,
        IdleTimeout:       60 * time.Second,
    }

    if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
        log.Fatal(err)
    }
}
```

生产代码优先显式创建 `ServeMux` 和 `http.Server`，不要依赖全局 `DefaultServeMux`；同时要处理 `ListenAndServe` 返回值并配置超时，否则容易被慢连接耗尽资源。

<!-- id: go-web-002; difficulty: 1; tags: net/http, Web开发; source: 高频 -->
# `http.ServeMux` 的路由匹配规则是什么？它有哪些局限性？

**`ServeMux` 的两种匹配模式：**

```go
mux := http.NewServeMux()

// 1. 精确匹配（不以 / 结尾）：只匹配 /about 本身
mux.HandleFunc("/about", aboutHandler)

// 2. 前缀匹配（以 / 结尾）：匹配所有以 /api/ 开头的路径
mux.HandleFunc("/api/", apiHandler)

// 特殊：根路径 "/" 是兜底路由，匹配所有未命中的请求
mux.HandleFunc("/", catchAllHandler)
```

**匹配优先级规则：**

```go
// 最长匹配原则（Longest Prefix Match）
// 对于请求 GET /api/users/1：
// "/api/users/" 比 "/api/" 更长，优先匹配
mux.HandleFunc("/api/", handler1)         // 次优先
mux.HandleFunc("/api/users/", handler2)   // 优先匹配
```

**Go 1.22+ 新增特性（方法+路径匹配）：**

```go
// Go 1.22 起 ServeMux 支持 HTTP 方法和路径参数
mux.HandleFunc("GET /users/{id}", func(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id") // 提取路径参数
    fmt.Fprintf(w, "user id: %s", id)
})

mux.HandleFunc("POST /users", createUserHandler)
mux.HandleFunc("DELETE /users/{id}", deleteUserHandler)
```

**局限性（Go 1.22 之前）：**

| 局限           | 说明                                         |
| -------------- | -------------------------------------------- |
| 不支持方法区分 | 同一路径的 GET/POST/PUT 都路由到同一 Handler |
| 不支持路径参数 | 无法提取 `/users/{id}` 中的 `id`             |
| 不支持正则     | 无法用正则限制路径格式                       |
| 不支持中间件链 | 需手动包装                                   |

**实际开发建议：** 简单服务用 Go 1.22+ 内置 ServeMux；复杂路由需求用 Gin、Chi、Echo 等框架。

<!-- id: go-web-003; difficulty: 1; tags: net/http, Web开发; source: 高频 -->
# 如何正确配置 `http.Server` 的超时参数？不配置超时会有什么风险？

**正确配置示例：**

```go
package main

import (
    "context"
    "net/http"
    "time"
)

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/", handler)

    server := &http.Server{
        Addr:    ":8080",
        Handler: mux,

        // 从连接 Accept 到请求 Header 读取完成的最大时间
        ReadHeaderTimeout: 5 * time.Second,

        // 从连接 Accept 到请求 Body 读取完成的最大时间
        // 包含 ReadHeaderTimeout
        ReadTimeout: 10 * time.Second,

        // 从请求处理开始到响应写完的最大时间
        WriteTimeout: 15 * time.Second,

        // Keep-Alive 连接的空闲超时（等待下一个请求）
        IdleTimeout: 60 * time.Second,
    }

    if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
        panic(err)
    }
}
```

**各超时参数的时间线：**

```
Accept → [ReadHeaderTimeout] → Headers Read
Accept → [          ReadTimeout           ] → Body Read Complete
         [                WriteTimeout                          ] → Response Sent
         [                         IdleTimeout                         ] → Next Request / Close
```

**不配置超时的风险：**

| 风险           | 场景                                     |
| -------------- | ---------------------------------------- |
| Slowloris 攻击 | 攻击者缓慢发送请求头，占用连接不释放     |
| goroutine 泄漏 | 慢客户端长时间占用 Handler goroutine     |
| 文件描述符耗尽 | 大量僵尸连接导致 fd 耗尽，新连接无法建立 |
| 内存增长       | 每个挂起的连接和 goroutine 都占用内存    |

**超时配置建议（生产环境）：**

```go
// 对外 API 服务
ReadHeaderTimeout: 3 * time.Second
ReadTimeout:       10 * time.Second
WriteTimeout:      30 * time.Second  // 根据最慢接口调整
IdleTimeout:       120 * time.Second

// 内部微服务（低延迟）
ReadHeaderTimeout: 1 * time.Second
ReadTimeout:       5 * time.Second
WriteTimeout:      10 * time.Second
IdleTimeout:       60 * time.Second
```

<!-- id: go-web-004; difficulty: 1; tags: Gin, Web开发; source: 高频 -->
# Gin 框架中如何进行路由分组（Group）？分组有什么作用？

Gin 的 `Group` 用来给一组路由添加共同前缀和共同中间件，常用于 API 版本、认证区域、后台管理和多租户路由。

```go
package main

import (
    "errors"
    "log"
    "net/http"

    "github.com/gin-gonic/gin"
)

func main() {
    r := gin.New()
    r.Use(gin.Logger(), gin.Recovery())

    v1 := r.Group("/api/v1")
    {
        v1.GET("/users", listUsers)
        v1.POST("/users", createUser)
        v1.GET("/users/:id", getUser)
    }

    api := r.Group("/api")
    api.Use(JWTAuthMiddleware())
    {
        api.GET("/profile", getProfile)

        admin := api.Group("/admin")
        admin.Use(AdminOnlyMiddleware())
        admin.DELETE("/users/:id", deleteUser)
    }

    srv := &http.Server{Addr: ":8080", Handler: r}
    if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
        log.Fatal(err)
    }
}
```

分组只影响注册在该分组下的路由；中间件按注册顺序执行。`gin.Default()` 会自动带 Logger 和 Recovery，生产项目通常用 `gin.New()` 显式组合中间件，便于控制日志、恢复、认证、限流等顺序。

<!-- id: go-web-005; difficulty: 1; tags: Gin, JSON; source: 高频 -->
# Gin 中 `ShouldBind`、`ShouldBindJSON`、`Bind` 的区别是什么？如何正确处理参数绑定错误？

`Bind`、`ShouldBind` 和 `ShouldBindJSON` 的关键差异在于绑定来源和错误处理方式。

| 方法 | 来源 | 出错行为 | 建议 |
| --- | --- | --- | --- |
| `Bind` / `MustBindWith` | 按 `Content-Type` 推断 | 自动写 400 并 `Abort` | 少用，容易和自定义错误响应冲突 |
| `ShouldBind` | 按 `Content-Type` 推断 | 只返回 error | 表单/Query/JSON 混合场景使用 |
| `ShouldBindJSON` | JSON body | 只返回 error | 明确 JSON API 时使用 |

```go
type CreateUserRequest struct {
    Name  string `json:"name" binding:"required,min=2,max=50"`
    Email string `json:"email" binding:"required,email"`
    Age   int    `json:"age" binding:"gte=1,lte=150"`
}

func createUser(c *gin.Context) {
    var req CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "code": "INVALID_ARGUMENT",
            "message": "invalid request body",
            "detail": err.Error(),
        })
        return
    }
    c.JSON(http.StatusCreated, gin.H{"ok": true})
}
```

请求 body 默认只能读一次；如果多个中间件或 handler 都需要绑定同一份 body，使用 `ShouldBindBodyWith`，同时注意 body 大小限制。错误信息不要原样暴露内部字段名时，可把 validator 的 `ValidationErrors` 转成统一错误码。

<!-- id: go-web-006; difficulty: 1; tags: JSON, Web开发; source: 高频 -->
# Go 的 `encoding/json` 中常用的 struct tag 选项有哪些？

`encoding/json` 常用 tag 包括字段重命名、忽略字段、零值省略和数字字符串化。

```go
type User struct {
    ID        int64     `json:"id,string"`
    Name      string    `json:"name"`
    Email     string    `json:"email,omitempty"`
    Password  string    `json:"-"`
    CreatedAt time.Time `json:"created_at"`
    DeletedAt NullTime  `json:"deleted_at,omitzero"`
    Dash      string    `json:"-,"`
}
```

常见选项：

- `json:"name"`：指定 JSON 字段名。
- `omitempty`：字段为空值时省略，空值包括 `false`、`0`、空字符串、nil 指针、nil slice/map/interface 等；普通 struct 通常不会因为字段全零而被省略。
- `omitzero`：Go 1.24+ 支持，字段为零值或类型实现 `IsZero() bool` 且返回 true 时省略，适合自定义时间、金额、可空类型。
- `string`：把数字或 bool 编码为 JSON 字符串，常用于前端不能安全表示的 int64。
- `-`：序列化和反序列化都忽略该字段；`-,` 表示字段名就是 `"-"`。

tag 只影响导出字段；未导出字段不会被 `encoding/json` 访问。需要严格输入校验时，用 `json.Decoder.DisallowUnknownFields()`，不要只依赖 tag。

<!-- id: go-web-007; difficulty: 1; tags: 数据库, Web开发; source: 高频 -->
# `database/sql` 中如何配置连接池？各参数的含义是什么？

**连接池核心参数：**

```go
package main

import (
    "database/sql"
    "time"
    _ "github.com/lib/pq" // PostgreSQL 驱动
)

func newDB(dsn string) (*sql.DB, error) {
    db, err := sql.Open("postgres", dsn)
    if err != nil {
        return nil, err
    }

    // 最大打开连接数（包含空闲+使用中）
    // 0 = 无限制（危险！）
    // 建议：根据数据库最大连接数设置，预留给其他客户端
    db.SetMaxOpenConns(100)

    // 最大空闲连接数（连接池中保持的空闲连接数）
    // 应 <= MaxOpenConns
    // 设置太小：频繁建立/关闭连接；太大：空闲连接浪费资源
    db.SetMaxIdleConns(10)

    // 连接的最大生存时间（从创建起计时）
    // 防止使用长期空闲的连接（数据库服务端可能已关闭）
    // 建议：小于数据库服务端的连接超时（如 MySQL wait_timeout）
    db.SetConnMaxLifetime(30 * time.Minute)

    // 连接的最大空闲时间（连接在池中空闲的最长时间）
    // Go 1.15+ 新增
    // 比 ConnMaxLifetime 更细粒度地控制空闲连接
    db.SetConnMaxIdleTime(10 * time.Minute)

    // 验证连接是否正常
    if err := db.Ping(); err != nil {
        return nil, err
    }

    return db, nil
}
```

**参数关系图：**

```
MaxOpenConns = MaxIdleConns + 使用中的连接数
                    ↑
           空闲连接池（最多 MaxIdleConns 个）

连接生命周期：
  创建 ──[ConnMaxLifetime 超时]──→ 关闭
  空闲 ──[ConnMaxIdleTime 超时]──→ 关闭（即使未达 Lifetime）
```

**监控连接池状态：**

```go
func printDBStats(db *sql.DB) {
    stats := db.Stats()
    fmt.Printf("OpenConnections: %d\n", stats.OpenConnections)
    fmt.Printf("InUse:           %d\n", stats.InUse)
    fmt.Printf("Idle:            %d\n", stats.Idle)
    fmt.Printf("WaitCount:       %d\n", stats.WaitCount)    // 等待连接的次数
    fmt.Printf("WaitDuration:    %v\n", stats.WaitDuration) // 等待总时长
    fmt.Printf("MaxIdleClosed:   %d\n", stats.MaxIdleClosed)   // 因超过 MaxIdle 关闭的连接数
    fmt.Printf("MaxLifetimeClosed: %d\n", stats.MaxLifetimeClosed) // 因 Lifetime 关闭的连接数
}
```

<!-- id: go-web-008; difficulty: 1; tags: Redis, Web开发; source: 高频 -->
# go-redis 客户端如何初始化和基本使用？如何处理连接错误和超时？

**初始化客户端：**

```go
package main

import (
    "context"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
)

var rdb *redis.Client

func initRedis() {
    rdb = redis.NewClient(&redis.Options{
        Addr:     "localhost:6379",
        Password: "", // 无密码留空
        DB:       0,  // 默认 DB

        // 连接池配置
        PoolSize:     10,              // 连接池大小
        MinIdleConns: 3,               // 最小空闲连接
        MaxIdleConns: 5,               // 最大空闲连接
        ConnMaxIdleTime: 5 * time.Minute,
        ConnMaxLifetime: 30 * time.Minute,

        // 超时配置
        DialTimeout:  5 * time.Second,  // 建立连接超时
        ReadTimeout:  3 * time.Second,  // 读超时（-1 = 禁用）
        WriteTimeout: 3 * time.Second,  // 写超时
    })
}

func main() {
    initRedis()
    ctx := context.Background()

    // Ping 测试连接
    if err := rdb.Ping(ctx).Err(); err != nil {
        panic(fmt.Sprintf("redis connect failed: %v", err))
    }

    // 基本操作
    err := rdb.Set(ctx, "key", "value", 10*time.Minute).Err()
    if err != nil {
        fmt.Printf("set error: %v\n", err)
        return
    }

    val, err := rdb.Get(ctx, "key").Result()
    if err == redis.Nil {
        fmt.Println("key not found")
    } else if err != nil {
        fmt.Printf("get error: %v\n", err)
    } else {
        fmt.Printf("key = %s\n", val)
    }

    // Hash 操作
    rdb.HSet(ctx, "user:1", "name", "Alice", "age", 30)
    name, _ := rdb.HGet(ctx, "user:1", "name").Result()
    fmt.Println(name)

    // 带超时的 context
    ctx2, cancel := context.WithTimeout(ctx, 2*time.Second)
    defer cancel()
    rdb.Set(ctx2, "temp", "data", time.Minute)
}
```

**Cluster 模式：**

```go
rdb := redis.NewClusterClient(&redis.ClusterOptions{
    Addrs: []string{
        "localhost:7000",
        "localhost:7001",
        "localhost:7002",
    },
})
```

<!-- id: go-web-009; difficulty: 1; tags: gRPC, Web开发; source: 高频 -->
# gRPC 与 REST API 相比有哪些优缺点？分别适用于什么场景？

**对比总览：**

| 维度       | gRPC                    | REST                   |
| ---------- | ----------------------- | ---------------------- |
| 协议       | HTTP/2                  | HTTP/1.1（通常）       |
| 序列化     | Protobuf（二进制）      | JSON（文本）           |
| 性能       | 更高（二进制+多路复用） | 较低（文本+请求竞争）  |
| 流式       | 原生支持双向流          | 需 WebSocket/SSE       |
| 类型安全   | 强类型（IDL 生成代码）  | 弱（需手写校验）       |
| 浏览器支持 | 差（需 grpc-web 转换）  | ✅ 原生支持            |
| 调试便利性 | 差（二进制协议）        | ✅ curl/Postman 直接用 |
| 生态成熟度 | 较新                    | 极成熟                 |
| 学习曲线   | 较陡（需学 Protobuf）   | 平缓                   |

**gRPC 优势场景：**

```
1. 内部微服务间通信：
   - 高频调用，性能敏感
   - 需要流式数据传输（实时日志、视频流）
   - 多语言服务（Protobuf 支持 20+ 语言代码生成）

2. 特定功能：
   - 双向流：实时聊天、游戏状态同步
   - 服务端流：大文件下载、实时推送
   - 客户端流：大文件上传、批量数据采集
```

**REST 优势场景：**

```
1. 对外公开 API（开发者生态）
2. 浏览器直接调用
3. 简单的 CRUD 服务
4. 需要 HTTP 缓存（CDN）
5. 团队不熟悉 Protobuf
```

**Protobuf 示例：**

```protobuf
syntax = "proto3";
package user.v1;
option go_package = "myapp/gen/user/v1";

service UserService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
  rpc ListUsers(ListUsersRequest) returns (stream User); // 服务端流
  rpc BatchCreateUsers(stream CreateUserRequest) returns (BatchResult); // 客户端流
}

message GetUserRequest {
  int64 id = 1;
}

message User {
  int64  id    = 1;
  string name  = 2;
  string email = 3;
}
```

**实际建议：** 对外 API 用 REST，内部服务间通信用 gRPC，可通过 grpc-gateway 同时暴露两种接口。

<!-- id: go-web-010; difficulty: 1; tags: 部署, Web开发; source: 高频 -->
# 如何实现 Go HTTP 服务的优雅关闭（Graceful Shutdown）？

HTTP 服务优雅关闭的目标是：收到退出信号后停止接收新连接，同时给已有请求一段时间完成。

```go
func run() error {
    mux := http.NewServeMux()
    mux.HandleFunc("/healthz", healthz)

    srv := &http.Server{
        Addr:              ":8080",
        Handler:           mux,
        ReadHeaderTimeout: 3 * time.Second,
        ReadTimeout:       10 * time.Second,
        WriteTimeout:      30 * time.Second,
        IdleTimeout:       60 * time.Second,
    }

    errCh := make(chan error, 1)
    go func() {
        err := srv.ListenAndServe()
        if err != nil && !errors.Is(err, http.ErrServerClosed) {
            errCh <- err
            return
        }
        errCh <- nil
    }()

    ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
    defer stop()

    select {
    case <-ctx.Done():
    case err := <-errCh:
        return err
    }

    shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    return errors.Join(srv.Shutdown(shutdownCtx), <-errCh)
}
```

不要在启动 goroutine 里 `log.Fatal`，否则会跳过 defer 和统一清理。Kubernetes 中应先把 readiness 置为 false，等待负载均衡摘流，再调用 `Shutdown`；超时时可用 `Close` 兜底。

<!-- id: go-web-011; difficulty: 2; tags: 中间件, Gin; source: 高频 -->
# 如何在 Gin 中实现日志记录中间件？请包含请求 ID 注入、耗时统计和结构化日志输出。

```go
package middleware

import (
    "log/slog"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
)

const RequestIDKey = "request_id"

// RequestID 中间件：为每个请求注入唯一 ID
func RequestID() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 优先使用客户端传来的 X-Request-ID（便于链路追踪）
        requestID := c.GetHeader("X-Request-ID")
        if requestID == "" {
            requestID = uuid.New().String()
        }
        c.Set(RequestIDKey, requestID)
        c.Header("X-Request-ID", requestID) // 回写到响应头
        c.Next()
    }
}

// Logger 中间件：结构化日志记录
func Logger(logger *slog.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        path := c.Request.URL.Path
        query := c.Request.URL.RawQuery

        // 处理请求
        c.Next()

        // 请求结束后记录日志
        latency := time.Since(start)
        statusCode := c.Writer.Status()
        requestID, _ := c.Get(RequestIDKey)

        // 构建结构化日志字段
        attrs := []slog.Attr{
            slog.String("request_id", requestID.(string)),
            slog.String("method", c.Request.Method),
            slog.String("path", path),
            slog.String("query", query),
            slog.Int("status", statusCode),
            slog.Duration("latency", latency),
            slog.String("ip", c.ClientIP()),
            slog.String("user_agent", c.Request.UserAgent()),
            slog.Int("body_size", c.Writer.Size()),
        }

        // 记录 Handler 返回的错误
        if len(c.Errors) > 0 {
            attrs = append(attrs, slog.String("errors", c.Errors.String()))
        }

        // 根据状态码选择日志级别
        level := slog.LevelInfo
        if statusCode >= 500 {
            level = slog.LevelError
        } else if statusCode >= 400 {
            level = slog.LevelWarn
        }

        logger.LogAttrs(c.Request.Context(), level, "HTTP Request", attrs...)
    }
}

// Recovery 中间件：捕获 panic，返回 500 并记录堆栈
func Recovery(logger *slog.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        defer func() {
            if err := recover(); err != nil {
                requestID, _ := c.Get(RequestIDKey)
                logger.Error("panic recovered",
                    "request_id", requestID,
                    "error", err,
                    "path", c.Request.URL.Path,
                )
                c.AbortWithStatusJSON(500, gin.H{
                    "code":       500,
                    "message":    "internal server error",
                    "request_id": requestID,
                })
            }
        }()
        c.Next()
    }
}

// 注册中间件
func SetupRouter(logger *slog.Logger) *gin.Engine {
    r := gin.New() // 不使用 gin.Default()（它自带 Logger 和 Recovery）
    r.Use(
        RequestID(),
        Logger(logger),
        Recovery(logger),
    )
    return r
}
```

<!-- id: go-web-012; difficulty: 2; tags: 中间件, JWT; source: 高频 -->
# 如何用 Gin 中间件实现 JWT 认证？请包含 Token 生成、验证和刷新机制。

JWT 认证通常使用短期 Access Token 加服务端可撤销的 Refresh Token。Access Token 可用 JWT，Refresh Token 更推荐随机 opaque token，哈希后存 DB/Redis，以便轮换、吊销和设备级退出。

```go
type Claims struct {
    UserID int64  `json:"uid"`
    Role   string `json:"role"`
    jwt.RegisteredClaims
}

func signAccess(userID int64, role string, key []byte) (string, error) {
    now := time.Now()
    claims := Claims{
        UserID: userID,
        Role: role,
        RegisteredClaims: jwt.RegisteredClaims{
            Issuer: "iface-api",
            IssuedAt: jwt.NewNumericDate(now),
            ExpiresAt: jwt.NewNumericDate(now.Add(15 * time.Minute)),
        },
    }
    return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(key)
}

func parseAccess(tokenString string, key []byte) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (any, error) {
        if t.Method != jwt.SigningMethodHS256 {
            return nil, fmt.Errorf("unexpected alg %s", t.Header["alg"])
        }
        return key, nil
    }, jwt.WithIssuer("iface-api"))
    if err != nil { return nil, err }
    claims, ok := token.Claims.(*Claims)
    if !ok || !token.Valid { return nil, errors.New("invalid token") }
    return claims, nil
}
```

Gin 中间件应严格解析 `Authorization: Bearer <token>`，校验签名算法、issuer/audience/exp，并把用户 ID 放入 context：

```go
func JWTAuth(key []byte) gin.HandlerFunc {
    return func(c *gin.Context) {
        raw := c.GetHeader("Authorization")
        tokenString, ok := strings.CutPrefix(raw, "Bearer ")
        if !ok || tokenString == "" {
            c.AbortWithStatus(http.StatusUnauthorized)
            return
        }
        claims, err := parseAccess(tokenString, key)
        if err != nil {
            c.AbortWithStatus(http.StatusUnauthorized)
            return
        }
        c.Set("user_id", claims.UserID)
        c.Next()
    }
}
```

Refresh 流程：服务端生成高熵随机 refresh token，只保存哈希、用户、设备、过期时间和撤销状态；刷新时校验后立即轮换新 refresh token。密钥来自环境或 KMS，支持 `kid` 轮换，日志中绝不能打印 token。

<!-- id: go-web-013; difficulty: 2; tags: 中间件, Web开发; source: 高频 -->
# 如何实现一个基于令牌桶算法的 HTTP 限流中间件？

令牌桶适合限制平均速率并允许一定突发。单机 Go 服务可用 `golang.org/x/time/rate`；多实例部署需要把状态放到 Redis、Envoy、API Gateway 或专用限流服务中。

```go
type ipLimiter struct {
    limiter *rate.Limiter
    lastSeen time.Time
}

type LimiterStore struct {
    mu sync.Mutex
    items map[string]*ipLimiter
    limit rate.Limit
    burst int
    ttl time.Duration
}

func (s *LimiterStore) get(key string) *rate.Limiter {
    s.mu.Lock()
    defer s.mu.Unlock()
    if it := s.items[key]; it != nil {
        it.lastSeen = time.Now()
        return it.limiter
    }
    it := &ipLimiter{limiter: rate.NewLimiter(s.limit, s.burst), lastSeen: time.Now()}
    s.items[key] = it
    return it.limiter
}

func (s *LimiterStore) cleanup(ctx context.Context) {
    ticker := time.NewTicker(time.Minute)
    defer ticker.Stop()
    for {
        select {
        case <-ticker.C:
            cutoff := time.Now().Add(-s.ttl)
            s.mu.Lock()
            for key, it := range s.items {
                if it.lastSeen.Before(cutoff) { delete(s.items, key) }
            }
            s.mu.Unlock()
        case <-ctx.Done():
            return
        }
    }
}
```

Gin 中使用时根据可信来源选 key：公网直连可用 `ClientIP()`；在反向代理后必须正确配置 trusted proxies，否则 `X-Forwarded-For` 可被伪造。限流响应应返回 429 和可选 `Retry-After`。清理 goroutine 要受 context 控制，避免服务重载后泄漏。

<!-- id: go-web-014; difficulty: 2; tags: JSON, Web开发; source: 高频 -->
# 如何实现 `json.Marshaler` 接口自定义 JSON 序列化？请给出 `time.Time` 格式化和枚举字符串化的示例。

**自定义 `time.Time` 序列化格式：**

```go
package model

import (
    "encoding/json"
    "time"
)

// CustomTime 自定义时间类型，序列化为 "2006-01-02 15:04:05" 格式
type CustomTime struct {
    time.Time
}

const customTimeLayout = "2006-01-02 15:04:05"

// MarshalJSON 实现 json.Marshaler 接口
func (ct CustomTime) MarshalJSON() ([]byte, error) {
    if ct.IsZero() {
        return []byte("null"), nil
    }
    return []byte(`"` + ct.Format(customTimeLayout) + `"`), nil
}

// UnmarshalJSON 实现 json.Unmarshaler 接口
func (ct *CustomTime) UnmarshalJSON(data []byte) error {
    if string(data) == "null" {
        ct.Time = time.Time{}
        return nil
    }
    // 去除引号
    s := string(data)
    if len(s) >= 2 && s[0] == '"' && s[len(s)-1] == '"' {
        s = s[1 : len(s)-1]
    }
    t, err := time.ParseInLocation(customTimeLayout, s, time.Local)
    if err != nil {
        return err
    }
    ct.Time = t
    return nil
}

// 用法
type Article struct {
    ID        int64      `json:"id"`
    Title     string     `json:"title"`
    CreatedAt CustomTime `json:"created_at"` // 自动使用自定义格式
    UpdatedAt CustomTime `json:"updated_at"`
}
```

**枚举类型序列化为字符串：**

```go
type OrderStatus int

const (
    OrderStatusPending   OrderStatus = 1
    OrderStatusPaid      OrderStatus = 2
    OrderStatusShipped   OrderStatus = 3
    OrderStatusCompleted OrderStatus = 4
    OrderStatusCancelled OrderStatus = 5
)

var orderStatusNames = map[OrderStatus]string{
    OrderStatusPending:   "pending",
    OrderStatusPaid:      "paid",
    OrderStatusShipped:   "shipped",
    OrderStatusCompleted: "completed",
    OrderStatusCancelled: "cancelled",
}

var orderStatusValues = map[string]OrderStatus{
    "pending":   OrderStatusPending,
    "paid":      OrderStatusPaid,
    // ...
}

func (s OrderStatus) MarshalJSON() ([]byte, error) {
    name, ok := orderStatusNames[s]
    if !ok {
        return nil, fmt.Errorf("unknown order status: %d", s)
    }
    return json.Marshal(name) // 正确处理特殊字符转义
}

func (s *OrderStatus) UnmarshalJSON(data []byte) error {
    var name string
    if err := json.Unmarshal(data, &name); err != nil {
        return err
    }
    val, ok := orderStatusValues[name]
    if !ok {
        return fmt.Errorf("unknown order status: %s", name)
    }
    *s = val
    return nil
}

// 效果
type Order struct {
    ID     int64       `json:"id"`
    Status OrderStatus `json:"status"` // 输出 "status": "pending"
}
```

**使用 sonic 替代标准 json（高性能场景）：**

```go
import "github.com/bytedance/sonic"

// 直接替换（API 兼容）
data, err := sonic.Marshal(obj)
err = sonic.Unmarshal(data, &obj)

// 性能对比（Benchmark 数据）：
// encoding/json Marshal:   ~350 ns/op, ~200 B/op
// sonic         Marshal:   ~120 ns/op, ~100 B/op（约快 3x）
// gjson         (只读取):  ~  5 ns/op（约快 70x，不需要全量解析）
```

<!-- id: go-web-015; difficulty: 2; tags: 数据库, GORM; source: 高频 -->
# GORM 中什么是 N+1 问题？如何通过 Preload 和 Joins 解决？

N+1 是指先查 1 次主表，再为 N 条主记录分别查询关联表，总 SQL 数量随结果集线性增长。

```go
// 错误示例：range 变量是副本，给 user.Orders 赋值不会写回 users[i]
for _, user := range users {
    db.Where("user_id = ?", user.ID).Find(&user.Orders)
}
```

GORM 通常用 `Preload` 解决一对多 N+1：

```go
var users []User
err := db.WithContext(ctx).
    Preload("Orders", "status = ?", "paid").
    Preload("Orders.Items").
    Find(&users).Error
```

`Preload` 会先查 users，再用 `WHERE user_id IN (...)` 批量查 orders；多级预加载会再多查一级。需要自定义排序可以用闭包：

```go
db.Preload("Orders", func(tx *gorm.DB) *gorm.DB {
    return tx.Order("created_at DESC")
}).Find(&users)
```

注意：在 Preload 闭包里直接 `Limit(5)` 通常是对整批关联结果限 5，不是每个用户 5 条。每个父对象 Top N 需要窗口函数、单独查询或专门的数据模型。`Joins` 更适合 belongs-to/has-one；对 has-many join 会产生重复主行，需要去重和聚合。

<!-- id: go-web-016; difficulty: 2; tags: 数据库, GORM; source: 高频 -->
# GORM 中如何正确使用事务？如何处理事务中的错误回滚？

GORM 事务优先使用 `db.Transaction`，回调返回 error 自动回滚，返回 nil 自动提交，panic 会被回滚后继续抛出。

```go
func (s *OrderService) CreateOrder(ctx context.Context, order *Order) error {
    return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        res := tx.Model(&Product{}).
            Where("id = ? AND stock >= ?", order.ProductID, order.Quantity).
            UpdateColumn("stock", gorm.Expr("stock - ?", order.Quantity))
        if res.Error != nil { return res.Error }
        if res.RowsAffected != 1 { return ErrInsufficientStock }

        if err := tx.Create(order).Error; err != nil { return err }
        if order.ID == 0 { return errors.New("order id not generated") }

        log := StockLog{ProductID: order.ProductID, OrderID: order.ID, Delta: -order.Quantity}
        if err := tx.Create(&log).Error; err != nil { return err }
        return nil
    })
}
```

手动事务必须保证所有 DB 操作都使用同一个 `tx`，并正确处理 rollback/commit 错误：

```go
tx := db.WithContext(ctx).Begin()
if tx.Error != nil { return tx.Error }
defer func() {
    if p := recover(); p != nil {
        _ = tx.Rollback().Error
        panic(p)
    }
}()

if err := doWork(tx); err != nil {
    _ = tx.Rollback().Error
    return err
}
return tx.Commit().Error
```

涉及扣库存、转账等场景时，必须检查 `RowsAffected`，并用唯一约束、乐观锁或 `SELECT ... FOR UPDATE` 防止并发下重复处理。

<!-- id: go-web-017; difficulty: 2; tags: Redis, Web开发; source: 高频 -->
# Redis 中缓存穿透、缓存击穿、缓存雪崩分别是什么？如何在 Go 中应对？

**三种问题定义：**

| 问题         | 触发场景                                         | 后果                     |
| ------------ | ------------------------------------------------ | ------------------------ |
| **缓存穿透** | 查询**不存在**的数据（既没有缓存也没有 DB 数据） | 每次都打到 DB，DB 压力大 |
| **缓存击穿** | **热点 key 过期**的瞬间，大量请求同时涌入        | 瞬间 DB 压力爆炸         |
| **缓存雪崩** | 大量 key **同时过期**或 Redis 宕机               | DB 被大量请求压垮        |

**缓存穿透 → 布隆过滤器 + 缓存空值：**

```go
// 方案1：缓存空值（简单有效）
func (s *UserService) GetUser(ctx context.Context, id int64) (*User, error) {
    cacheKey := fmt.Sprintf("user:%d", id)

    // 查 Redis
    val, err := s.rdb.Get(ctx, cacheKey).Bytes()
    if err == nil {
        if string(val) == "null" {
            return nil, ErrNotFound // 缓存了空值，直接返回 404
        }
        var user User
        json.Unmarshal(val, &user)
        return &user, nil
    }

    // Redis miss，查 DB
    user, err := s.repo.GetUser(ctx, id)
    if err != nil {
        if errors.Is(err, ErrNotFound) {
            // 缓存空值，防止穿透（短 TTL 防止合法数据恢复后延迟过长）
            s.rdb.Set(ctx, cacheKey, "null", 5*time.Minute)
        }
        return nil, err
    }

    data, _ := json.Marshal(user)
    s.rdb.Set(ctx, cacheKey, data, 30*time.Minute)
    return user, nil
}
```

**缓存击穿 → singleflight 防并发重建：**

```go
import "golang.org/x/sync/singleflight"

type UserService struct {
    rdb *redis.Client
    sf  singleflight.Group // 关键：相同 key 只执行一次 DB 查询
}

func (s *UserService) GetHotUser(ctx context.Context, id int64) (*User, error) {
    cacheKey := fmt.Sprintf("user:%d", id)

    // 先查缓存
    if val, err := s.rdb.Get(ctx, cacheKey).Bytes(); err == nil {
        var user User
        json.Unmarshal(val, &user)
        return &user, nil
    }

    // singleflight：同一 key 的并发请求只执行一次
    v, err, _ := s.sf.Do(cacheKey, func() (interface{}, error) {
        // 再查一次缓存（可能上一个请求已经写入）
        if val, err := s.rdb.Get(ctx, cacheKey).Bytes(); err == nil {
            var user User
            json.Unmarshal(val, &user)
            return &user, nil
        }
        // 查 DB
        user, err := s.repo.GetUser(ctx, id)
        if err != nil { return nil, err }
        data, _ := json.Marshal(user)
        s.rdb.Set(ctx, cacheKey, data, 30*time.Minute)
        return user, nil
    })
    if err != nil { return nil, err }
    return v.(*User), nil
}
```

**缓存雪崩 → 随机 TTL + 多级缓存 + 熔断：**

```go
import (
    "math/rand"
)

// 随机化 TTL，防止同时过期
func randomTTL(base time.Duration) time.Duration {
    // 在 base ±20% 范围内随机
    jitter := time.Duration(rand.Int63n(int64(base) / 5))
    return base + jitter
}

// 使用：
s.rdb.Set(ctx, key, data, randomTTL(30*time.Minute))

// 其他手段：
// 1. 永不过期 + 异步更新（后台 goroutine 定期刷新）
// 2. 双重缓存（本地 LRU + Redis）
// 3. Redis 集群 + 哨兵，防单点故障
// 4. 熔断降级（hystrix-go、go-sentinel）
```

<!-- id: go-web-018; difficulty: 2; tags: Redis, Web开发; source: 高频 -->
# 如何用 Redis 实现分布式锁？使用 `SET NX` 和 Lua 脚本有什么区别？

Redis 分布式锁的基础获取方式是 `SET key value NX PX ttl`：只有 key 不存在时写入随机 value，并设置过期时间防止持锁方崩溃后死锁。

```go
func TryLock(ctx context.Context, rdb *redis.Client, key string, ttl time.Duration) (*Lock, error) {
    value := uuid.NewString()
    ok, err := rdb.SetNX(ctx, key, value, ttl).Result()
    if err != nil { return nil, err }
    if !ok { return nil, ErrLockNotAcquired }
    return &Lock{rdb: rdb, key: key, value: value, ttl: ttl}, nil
}
```

释放锁必须比较 value 后再删除，且比较和删除要原子执行，所以用 Lua：

```go
const unlockScript = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`

func (l *Lock) Unlock(ctx context.Context) error {
    unlockCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), time.Second)
    defer cancel()
    return l.rdb.Eval(unlockCtx, unlockScript, []string{l.key}, l.value).Err()
}
```

`SET NX PX` 解决获取锁和自动过期；Lua 解决安全释放。它仍不是强一致锁：业务执行超过 ttl、Redis 主从切换、网络分区都可能导致并发持锁。关键业务要使用 fencing token、数据库唯一约束/乐观锁，或选择 etcd/ZooKeeper 这类有租约和一致性语义的系统。

<!-- id: go-web-019; difficulty: 2; tags: gRPC, Web开发; source: 高频 -->
# 如何实现 gRPC 服务端和客户端拦截器（Interceptor）？请实现日志记录和认证两个拦截器。

gRPC interceptor 是 RPC 调用链上的中间件，可用于日志、认证、限流、trace、metrics 和错误统一处理。

```go
func UnaryLog(logger *slog.Logger) grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
        start := time.Now()
        resp, err := handler(ctx, req)
        logger.InfoContext(ctx, "grpc request",
            "method", info.FullMethod,
            "duration", time.Since(start),
            "code", status.Code(err).String(),
        )
        return resp, err
    }
}

func UnaryAuth(verify func(context.Context, string) (*Principal, error)) grpc.UnaryServerInterceptor {
    whitelist := map[string]bool{"/user.v1.UserService/Login": true}
    return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
        if whitelist[info.FullMethod] { return handler(ctx, req) }
        md, ok := metadata.FromIncomingContext(ctx)
        if !ok { return nil, status.Error(codes.Unauthenticated, "missing metadata") }
        vals := md.Get("authorization")
        if len(vals) != 1 { return nil, status.Error(codes.Unauthenticated, "missing token") }
        token, ok := strings.CutPrefix(vals[0], "Bearer ")
        if !ok || token == "" { return nil, status.Error(codes.Unauthenticated, "bad token") }
        p, err := verify(ctx, token)
        if err != nil { return nil, status.Error(codes.Unauthenticated, "invalid token") }
        return handler(context.WithValue(ctx, principalKey{}, p), req)
    }
}
```

注册时使用链式拦截器：

```go
srv := grpc.NewServer(
    grpc.ChainUnaryInterceptor(UnaryLog(logger), UnaryAuth(verifyToken)),
)
```

客户端同样可用 unary/stream interceptor 添加 deadline、trace 和 token。生产连接应使用 TLS/mTLS credentials，认证失败返回 `codes.Unauthenticated`，权限不足返回 `codes.PermissionDenied`。

<!-- id: go-web-020; difficulty: 2; tags: 性能, Web开发; source: 高频 -->
# 如何在 Go Web 服务中嵌入 pprof 端点，并在不影响业务流量的情况下使用？

pprof 端点包含堆、CPU、goroutine、mutex、block 等敏感运行时信息，生产环境应放在独立监听地址并加访问控制。

```go
func startPprof(ctx context.Context, addr string, allow func(*http.Request) bool) *http.Server {
    mux := http.NewServeMux()
    mux.HandleFunc("/debug/pprof/", pprof.Index)
    mux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
    mux.HandleFunc("/debug/pprof/profile", pprof.Profile)
    mux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
    mux.HandleFunc("/debug/pprof/trace", pprof.Trace)

    srv := &http.Server{
        Addr:              addr,
        Handler:           authMiddleware(allow, mux),
        ReadHeaderTimeout: 3 * time.Second,
    }
    go func() {
        if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
            slog.Error("pprof server failed", "err", err)
        }
    }()
    go func() {
        <-ctx.Done()
        shutdownCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
        defer cancel()
        _ = srv.Shutdown(shutdownCtx)
    }()
    return srv
}
```

避免把 `_ "net/http/pprof"` 注册到业务的 `DefaultServeMux` 后直接公网暴露。CPU profile 和 trace 会带来额外开销，应短时间采集；heap profile 区分 `inuse_space` 和 `alloc_space`，前者看当前占用，后者看累计分配热点。

<!-- id: go-web-021; difficulty: 2; tags: 微服务, Web开发; source: 高频 -->
# 什么是服务注册与发现？在 Go 微服务中如何结合 Consul 或 etcd 实现？

**概念：**

- **服务注册**：服务启动时将自身地址（IP:Port）、元数据、健康检查规则写入注册中心。
- **服务发现**：调用方从注册中心查询目标服务的地址列表，动态路由请求。

**Consul 实现示例：**

```go
package discovery

import (
    "fmt"
    "log"

    consulapi "github.com/hashicorp/consul/api"
)

// ServiceRegistry 服务注册
func RegisterService(name, host string, port int, tags []string) error {
    client, err := consulapi.NewClient(consulapi.DefaultConfig())
    if err != nil {
        return err
    }

    registration := &consulapi.AgentServiceRegistration{
        ID:      fmt.Sprintf("%s-%s-%d", name, host, port),
        Name:    name,
        Address: host,
        Port:    port,
        Tags:    tags,
        Check: &consulapi.AgentServiceCheck{
            // HTTP 健康检查（每 10 秒一次）
            HTTP:                           fmt.Sprintf("http://%s:%d/health", host, port),
            Interval:                       "10s",
            Timeout:                        "3s",
            DeregisterCriticalServiceAfter: "30s", // 持续不健康 30s 后自动注销
        },
    }

    return client.Agent().ServiceRegister(registration)
}

// ServiceDiscovery 服务发现（获取健康实例列表）
func DiscoverService(name string) ([]*consulapi.ServiceEntry, error) {
    client, err := consulapi.NewClient(consulapi.DefaultConfig())
    if err != nil {
        return nil, err
    }

    // 只返回健康实例
    entries, _, err := client.Health().Service(name, "", true, nil)
    if err != nil {
        return nil, err
    }
    return entries, nil
}

// 集成到 gRPC 客户端（带负载均衡）
func NewGRPCClientWithDiscovery(serviceName string) (*grpc.ClientConn, error) {
    // 使用 consul resolver
    // grpc://consul/service-name 格式
    return grpc.Dial(
        fmt.Sprintf("consul:///%s", serviceName),
        grpc.WithDefaultServiceConfig(`{"loadBalancingPolicy":"round_robin"}`),
        grpc.WithInsecure(),
    )
}
```

**健康检查 Endpoint（被 Consul 调用）：**

```go
// 健康检查接口（标准格式）
func healthHandler(w http.ResponseWriter, r *http.Request) {
    // 检查关键依赖
    if err := db.PingContext(r.Context()); err != nil {
        w.WriteHeader(http.StatusServiceUnavailable)
        json.NewEncoder(w).Encode(map[string]string{
            "status": "unhealthy",
            "reason": "database unavailable",
        })
        return
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{
        "status":  "healthy",
        "version": Version,
    })
}
```

<!-- id: go-web-022; difficulty: 2; tags: 部署, Web开发; source: 高频 -->
# 如何编写 Go 服务的多阶段 Dockerfile？如何使用健康检查和非 root 用户提升安全性？

Go 服务常用多阶段构建：builder 阶段下载依赖并编译，runtime 阶段只保留二进制、CA 证书和必要时区数据，并使用非 root 用户。

```dockerfile
FROM golang:1.24-alpine AS builder
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
ARG VERSION=dev
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -trimpath \
    -ldflags "-s -w -X main.version=${VERSION}" \
    -o /out/server ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /out/server /server
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/server"]
```

distroless 镜像没有 shell/curl，所以 Dockerfile 里的 `HEALTHCHECK CMD curl ...` 通常不可用。更推荐在 Kubernetes 里配置 HTTP probes：

```yaml
readinessProbe:
  httpGet: { path: /readyz, port: 8080 }
  periodSeconds: 5
livenessProbe:
  httpGet: { path: /healthz, port: 8080 }
  periodSeconds: 10
securityContext:
  runAsNonRoot: true
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
```

如果必须使用 Docker `HEALTHCHECK`，让二进制自身支持 `healthcheck` 子命令，或使用包含探测工具的 runtime 镜像。镜像 tag 要固定版本，避免 `latest`。

<!-- id: go-web-023; difficulty: 3; tags: net/http, 性能; source: 高频 -->
# 如何实现一个支持连接复用、超时控制和重试的 HTTP 客户端？

生产级 HTTP client 要同时控制连接池、每次请求 deadline、响应体关闭和有边界的重试。

```go
func NewHTTPClient() *http.Client {
    return &http.Client{
        Timeout: 15 * time.Second,
        Transport: &http.Transport{
            MaxIdleConns:        200,
            MaxIdleConnsPerHost: 50,
            MaxConnsPerHost:     100,
            IdleConnTimeout:     90 * time.Second,
            TLSHandshakeTimeout: 5 * time.Second,
            ResponseHeaderTimeout: 5 * time.Second,
            ExpectContinueTimeout: time.Second,
            DialContext: (&net.Dialer{Timeout: 3 * time.Second, KeepAlive: 30 * time.Second}).DialContext,
        },
    }
}
```

重试只应默认用于幂等请求或带 idempotency key 的请求；每次重试都必须重新构造 body：

```go
func doWithRetry(ctx context.Context, c *http.Client, method, url string, body []byte) (*http.Response, error) {
    var last error
    for attempt := 0; attempt < 3; attempt++ {
        req, err := http.NewRequestWithContext(ctx, method, url, bytes.NewReader(body))
        if err != nil { return nil, err }
        resp, err := c.Do(req)
        if err == nil && resp.StatusCode < 500 && resp.StatusCode != http.StatusTooManyRequests {
            return resp, nil
        }
        if !isRetryable(method, resp, err) {
            return resp, err
        }
        if resp != nil {
            last = fmt.Errorf("retryable status: %s", resp.Status)
            io.Copy(io.Discard, resp.Body)
            resp.Body.Close()
        } else {
            last = err
        }
        timer := time.NewTimer(backoff(attempt))
        select {
        case <-timer.C:
        case <-ctx.Done():
            timer.Stop()
            return nil, ctx.Err()
        }
    }
    return nil, last
}
```

调用方拿到成功响应后仍负责读取并关闭 `resp.Body`。不要无限重试；要设置总 deadline、指数退避和 jitter，并把 4xx、业务错误、不可重放 body 排除在重试之外。

<!-- id: go-web-024; difficulty: 3; tags: gRPC, 微服务; source: 高频 -->
# 如何实现 gRPC 服务端流式 RPC？请以"订阅实时消息推送"为例给出完整实现。

服务端流式 RPC 适合订阅消息、日志推送和进度通知：客户端发起一次请求，服务端持续 `Send` 多个响应，直到 context 取消、服务端结束或出错。

```protobuf
service NotificationService {
  rpc Subscribe(SubscribeRequest) returns (stream Notification);
}
```

```go
func (s *Server) Subscribe(req *pb.SubscribeRequest, stream pb.NotificationService_SubscribeServer) error {
    if req.UserId == "" {
        return status.Error(codes.InvalidArgument, "user_id required")
    }

    ctx := stream.Context()
    ch, unsubscribe, err := s.broker.Subscribe(ctx, req.UserId, req.Topics)
    if err != nil { return status.Errorf(codes.Internal, "subscribe: %v", err) }
    defer unsubscribe()

    heartbeat := time.NewTicker(30 * time.Second)
    defer heartbeat.Stop()

    for {
        select {
        case <-ctx.Done():
            return status.FromContextError(ctx.Err()).Err()
        case msg, ok := <-ch:
            if !ok { return nil }
            if err := stream.Send(toPB(msg)); err != nil { return err }
        case <-heartbeat.C:
            if err := stream.Send(&pb.Notification{Type: "heartbeat"}); err != nil { return err }
        }
    }
}
```

要点：使用 `stream.Context()` 控制生命周期；订阅 channel 要有缓冲或背压策略；慢客户端不能无限堆积消息；`Send` 失败后立即清理订阅。keepalive 不要设置得过于激进，通常由网关、移动网络和负载均衡的 idle timeout 共同决定。

<!-- id: go-web-025; difficulty: 3; tags: 微服务, Web开发; source: 高频 -->
# 如何在 Go 微服务中实现熔断器（Circuit Breaker）模式？请用 `go-breaker` 或手写实现说明状态机。

熔断器通过状态机保护下游：Closed 正常放行；Open 快速失败；Half-Open 只放少量探测请求，根据结果决定恢复或继续熔断。

使用 `sony/gobreaker` 时重点配置失败判定和状态切换：

```go
settings := gobreaker.Settings{
    Name: "user-service",
    MaxRequests: 3,
    Interval: 30 * time.Second,
    Timeout: 10 * time.Second,
    ReadyToTrip: func(c gobreaker.Counts) bool {
        total := c.Requests
        return total >= 20 && float64(c.TotalFailures)/float64(total) >= 0.5
    },
    IsSuccessful: func(err error) bool {
        if err == nil { return true }
        return errors.Is(err, ErrNotFound) || errors.Is(err, ErrBadRequest)
    },
    OnStateChange: func(name string, from, to gobreaker.State) {
        slog.Warn("breaker state changed", "name", name, "from", from, "to", to)
    },
}
breaker := gobreaker.NewCircuitBreaker(settings)

v, err := breaker.Execute(func() (any, error) {
    return client.GetUser(ctx, id)
})
```

失败分类很重要：下游 5xx、超时、连接错误通常计为失败；参数错误、404、业务拒绝通常不应触发熔断。回调里不要做阻塞 IO，避免反过来拖慢请求。熔断器应与 timeout、retry、限流配合：先有 deadline，再少量重试，最后熔断快速失败。

<!-- id: go-web-026; difficulty: 3; tags: 性能, net/http; source: 高频 -->
# Go HTTP 服务在高并发下有哪些常见性能瓶颈？如何通过 `sync.Pool`、zero-copy 和连接池优化？

高并发 Go HTTP 服务的瓶颈通常来自分配率、GC、下游连接池、慢客户端、锁竞争和不受控 goroutine。优化必须先看 pprof、trace、benchmem 和线上指标。

**减少响应构造分配**
```go
var bufPool = sync.Pool{New: func() any {
    return bytes.NewBuffer(make([]byte, 0, 4096))
}}

func writeJSON(w http.ResponseWriter, v any) error {
    buf := bufPool.Get().(*bytes.Buffer)
    buf.Reset()
    defer func() {
        if buf.Cap() <= 64<<10 { bufPool.Put(buf) }
    }()
    if err := json.NewEncoder(buf).Encode(v); err != nil { return err }
    w.Header().Set("Content-Type", "application/json")
    _, err := w.Write(buf.Bytes())
    return err
}
```
`sync.Pool` 可减少 buffer 分配，但 `encoding/json` 仍可能分配；`io.Copy(w, buf)` 到 `ResponseWriter` 不是内核级 zero-copy。

**请求体与连接池**
```go
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) error {
    r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
    defer r.Body.Close()
    dec := json.NewDecoder(r.Body)
    dec.DisallowUnknownFields()
    return dec.Decode(dst)
}
```
不要把池里的 `[]byte` defer 放回后再返回给调用方。HTTP client 必须读取或丢弃并关闭响应体，连接才能复用。

**常见优化**：预分配 slice/map；用 `strconv.Append*`/`io.WriteString` 替代热点 `fmt`; 调整 `http.Transport`、DB、Redis 连接池；限制 fan-out；用限流、熔断和背压保护下游。unsafe string/[]byte 转换不应作为常规优化。

<!-- id: go-web-027; difficulty: 3; tags: Gin, 中间件; source: 高频 -->
# 如何实现 Gin 的请求超时中间件？如何防止超时后继续写入响应导致 panic？

Gin 请求超时不要简单把 `c.Next()` 放进 goroutine，然后由外层 goroutine 写 504。`gin.Context` 和底层 `ResponseWriter` 不是为并发写设计的，容易 race、重复写 header，或超时后 handler 继续写响应。

**安全方案一：只注入 context deadline**
```go
func TimeoutContext(d time.Duration) gin.HandlerFunc {
    return func(c *gin.Context) {
        ctx, cancel := context.WithTimeout(c.Request.Context(), d)
        defer cancel()
        c.Request = c.Request.WithContext(ctx)
        c.Next()
    }
}
```
所有 DB、Redis、HTTP、gRPC 调用都必须使用 `c.Request.Context()`；发现 `context.Canceled` 或 `DeadlineExceeded` 后直接 return，不再写响应。

**硬超时响应放在 net/http 层**
```go
r := gin.New()
r.Use(TimeoutContext(10 * time.Second))
srv := &http.Server{
    Addr: ":8080",
    Handler: http.TimeoutHandler(r, 10*time.Second, `{"code":"TIMEOUT"}`),
}
```
`http.TimeoutHandler` 会缓冲响应，超时后后续写入返回 `http.ErrHandlerTimeout`。它不适合 WebSocket、SSE、streaming、Flusher/Hijacker 场景。

<!-- id: go-web-028; difficulty: 3; tags: 数据库, 连接池; source: 高频 -->
# 如何设计一个支持读写分离的 GORM 数据库连接管理器？

读写分离优先使用 GORM 官方 `dbresolver`；手动管理只适合特殊路由、权重、多租户或灰度需求。

```go
func NewDB(masterDSN string, replicaDSNs []string) (*gorm.DB, error) {
    db, err := gorm.Open(mysql.Open(masterDSN), &gorm.Config{})
    if err != nil { return nil, err }

    replicas := make([]gorm.Dialector, 0, len(replicaDSNs))
    for _, dsn := range replicaDSNs { replicas = append(replicas, mysql.Open(dsn)) }

    err = db.Use(dbresolver.Register(dbresolver.Config{
        Sources:  []gorm.Dialector{mysql.Open(masterDSN)},
        Replicas: replicas,
        Policy:   dbresolver.RandomPolicy{},
    }).SetMaxOpenConns(50).SetMaxIdleConns(10).SetConnMaxLifetime(30 * time.Minute))
    return db, err
}
```
普通读可走 replica；写操作、事务、读己之写、强一致读取必须走主库：
```go
db.Clauses(dbresolver.Write).First(&user, id)
```
手动 manager 要检查 `db.DB()` 错误，轮询计数避免 off-by-one；事务内所有操作必须使用同一个 `tx`，不能中途切到读库。从库延迟、连接池耗尽和读库健康状态都要监控。

<!-- id: go-web-029; difficulty: 3; tags: 微服务, 部署; source: 高频 -->
# 如何实现基于 `signal.NotifyContext` 的完整微服务优雅关闭，包括停止接收流量、排空请求、关闭依赖？

完整优雅关闭顺序：收到信号 -> readiness 置 false -> 等待负载均衡摘流 -> 停止接收新连接 -> 排空请求/RPC -> 停后台任务 -> 关闭 DB/Redis/日志/trace。

```go
func (s *Server) Run() error {
    s.ready.Store(true)
    ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
    defer stop()

    errCh := make(chan error, 2)
    go func() {
        err := s.httpServer.ListenAndServe()
        if err != nil && !errors.Is(err, http.ErrServerClosed) { errCh <- err; return }
        errCh <- nil
    }()
    go func() { errCh <- s.grpcServer.Serve(s.grpcLis) }()

    var runErr error
    select {
    case <-ctx.Done(): stop()
    case runErr = <-errCh:
    }
    return errors.Join(runErr, s.Shutdown(context.Background()))
}
```
Shutdown 内先 `ready=false` 并等待摘流，再 `http.Server.Shutdown`、`grpc.Server.GracefulStop`；超时后 `grpc.Stop`。最后 flush 异步任务并关闭 DB/Redis。Kubernetes 的 `terminationGracePeriodSeconds` 要覆盖摘流等待、shutdown 和 flush。

<!-- id: go-web-030; difficulty: 3; tags: Redis, 性能; source: 高频 -->
# 如何用 Redis Pipeline 和 Lua 脚本优化高频批量操作？请对比单条命令、Pipeline 和事务的性能差异。

Redis 高频批量操作的主要成本是网络 RTT。Pipeline 批量发送命令；Lua 把读改写逻辑放到 Redis 端原子执行；`MULTI/EXEC` 保证事务序列不被插队，但没有关系型数据库那种自动 rollback。

```go
_, err := rdb.Pipelined(ctx, func(pipe redis.Pipeliner) error {
    for id, score := range scores {
        pipe.Set(ctx, fmt.Sprintf("score:%d", id), score, time.Hour)
    }
    return nil
})
```
Pipeline 适合大量独立命令，不保证整体原子性。

```go
_, err := rdb.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
    pipe.IncrBy(ctx, key, 1)
    pipe.Expire(ctx, key, 24*time.Hour)
    return nil
})
```
TxPipeline 使用 `MULTI/EXEC`，但 EXEC 中某条命令运行时出错时其他命令仍可能执行。

Lua 适合锁释放、限流、库存扣减等原子读改写。Redis Cluster 中脚本访问的 key 必须在同一 hash slot；脚本不能运行太久；大 pipeline 要分批，避免阻塞 Redis 和占用过多内存。

<!-- id: go-web-031; difficulty: 3; tags: net/http, 中间件; source: 高频 -->
# 如何实现一个 HTTP 反向代理中间件，支持路径重写和请求头转发？

反向代理可用 `net/http/httputil.ReverseProxy`。现代 Go 优先使用 `Rewrite` API，它比旧 `Director` 更清晰地区分入站和出站请求。

```go
func NewReverseProxy(target *url.URL, strip string, logger *slog.Logger) http.Handler {
    return &httputil.ReverseProxy{
        Transport: &http.Transport{MaxIdleConns: 200, MaxIdleConnsPerHost: 50, ResponseHeaderTimeout: 30 * time.Second},
        Rewrite: func(pr *httputil.ProxyRequest) {
            pr.SetURL(target)
            pr.SetXForwarded()
            if strip != "" {
                p := strings.TrimPrefix(pr.In.URL.Path, strip)
                if p == "" { p = "/" }
                pr.Out.URL.Path, pr.Out.URL.RawPath = p, ""
            }
            pr.Out.Header.Set("X-Forwarded-Host", pr.In.Host)
        },
        ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
            logger.ErrorContext(r.Context(), "proxy error", "err", err)
            http.Error(w, "bad gateway", http.StatusBadGateway)
        },
    }
}
```
`SetXForwarded` 会正确处理 `X-Forwarded-*`；不要把 `RemoteAddr` 原样塞进 `X-Forwarded-For`。代理层还要配置下游超时、连接池、限流、熔断、body 大小限制和敏感头清理。

<!-- id: go-web-032; difficulty: 3; tags: 性能, JSON; source: 高频 -->
# 如何用 `go tool trace` 分析 Go Web 服务的调度延迟和 GC 停顿？请给出完整的分析流程。

`go tool trace` 用来观察 goroutine 调度、阻塞、syscall、GC、网络和用户标注事件，适合分析 P99 抖动、调度延迟和 GC/mark assist 影响。

```bash
curl -o trace.out "http://127.0.0.1:6060/debug/pprof/trace?seconds=5"
go tool trace trace.out
go test -run=^$ -bench=BenchmarkHandler -trace trace.out ./...
```
采集端点必须受保护，采样窗口要短。

分析流程：先看 Scheduler latency，再看 Goroutine analysis、Network blocking、Sync blocking 和 GC 事件；把慢请求时间段与 STW、mark assist、锁等待、网络等待对齐。可用 `trace.NewTask` 和 `trace.WithRegion` 标注 handler、DB query 等阶段。

优化要谨慎：Go 已有异步抢占，通常不靠在循环里撒 `runtime.Gosched()` 解决问题；应减少 CPU 热点、拆分长任务、控制并发、调好连接池和 GOMAXPROCS。Go 1.25+ 默认会根据容器 CPU quota 调整 GOMAXPROCS，手动设置前要确认部署环境。

<!-- id: go-web-033; difficulty: 3; tags: 微服务, 连接池; source: 高频 -->
# 如何实现微服务间的负载均衡？请对比客户端负载均衡和服务端负载均衡，并给出 gRPC 客户端负载均衡的实现。

负载均衡分客户端和服务端/代理两类。客户端 LB 少一跳、感知实例快，但每种语言都要接入发现和治理；服务端 LB 集中治理，但多一跳且代理要高可用。

gRPC 推荐 resolver + balancer，而不是自己维护多个 `ClientConn` 轮询。一个 `ClientConn` 已经管理连接状态、HTTP/2 多路复用、重连和负载均衡。

```go
conn, err := grpc.NewClient(
    "consul:///user-service",
    grpc.WithTransportCredentials(insecure.NewCredentials()), // 生产用 TLS/mTLS
    grpc.WithDefaultServiceConfig(`{"loadBalancingConfig":[{"round_robin":{}}]}`),
)
```
该 target 能工作需要注册 Consul resolver。resolver 负责 watch 健康实例，并通过 `cc.UpdateState(resolver.State{Addresses: addrs})` 更新地址列表；出错用 `cc.ReportError(err)`。生产还要配合 deadline、retry policy、熔断、outlier detection、权重/地域和空实例快速失败。

<!-- id: go-web-034; difficulty: 3; tags: Gin, 数据库; source: 高频 -->
# 如何在 Gin 中实现完整的文件上传接口，支持大文件分片上传和进度追踪？

文件上传接口的核心是限制大小、校验类型、隔离路径、支持断点/分片状态、避免并发合并竞态。

普通上传：使用 `http.MaxBytesReader` 限制 body；用 magic bytes 检测类型；原始文件名只用于展示，保存路径由服务端生成；用 `sha256` 做可信校验；先写临时文件，再原子 `os.Rename` 到最终路径。

分片上传流程：
1. `POST /uploads/init` 生成 `upload_id`，记录 owner、总大小、分片大小、总分片数、sha256、过期时间。
2. `PUT /uploads/:id/chunks/:index` 上传单片，校验 upload_id、index 和单片大小，保存为固定 `.part` 文件。
3. `GET /uploads/:id` 返回已上传分片 bitmap/列表，用于进度追踪和断点续传。
4. `POST /uploads/:id/complete` 加锁后校验所有分片、顺序合并、校验 sha256、原子 rename、清理临时文件。

`upload_id` 必须用白名单正则校验，不能直接信任用户输入拼路径。分片状态应放数据库或 Redis；合并要用 DB 锁、Redis 锁或单进程 mutex。上传目录不可执行，并定期清理过期分片；不要信任 `Content-Type` 和原始文件名。

<!-- id: go-web-035; difficulty: 3; tags: 微服务, 部署; source: 高频 -->
# 如何设计一个 Go 微服务的全链路追踪方案？请结合 OpenTelemetry 说明 Trace、Span 和 Context 传播。

OpenTelemetry 中 Trace 表示一次完整请求链路，Span 表示链路中的一个操作，Context 在进程内传递当前 Span，进程间通过 W3C `traceparent`/`baggage` 或 gRPC metadata 传播。

初始化时创建 OTLP exporter、resource、TracerProvider 和 propagator：使用 batch exporter，设置 `service.name`、`service.version`，采样通常用 `ParentBased(TraceIDRatioBased(...))`，进程退出时调用 `Shutdown` flush。

Gin 接入使用 `otelgin.Middleware("service-name")`；handler 内用 `tracer.Start(c.Request.Context(), "operation")` 创建子 span，并通过 ctx 传给 service、DB、Redis、HTTP、gRPC。不要把姓名、邮箱、token、完整 SQL 参数等 PII 写入 Span 属性。

HTTP 客户端优先用：
```go
client := &http.Client{Transport: otelhttp.NewTransport(http.DefaultTransport)}
```
gRPC 使用 `otelgrpc.NewServerHandler()` 和 `otelgrpc.NewClientHandler()`，现代客户端用 `grpc.NewClient` 并配置 TLS credentials。

生产要点：TraceID 写入结构化日志；高基数字段谨慎使用；采样在入口控制并尊重上游；Collector/Jaeger/Tempo 镜像固定版本，不用 `latest`；所有下游调用必须传 `context.Context`。
