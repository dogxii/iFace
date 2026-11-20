# 网络 测试一下

## net-001

### Q1 single | HTTPS 提供什么

HTTPS 相比 HTTP，核心多了哪一层能力？

- [ ] A. 自动让接口变成 RESTful。
- [x] B. 基于 TLS 的加密、身份认证和完整性保护。
- [ ] C. 自动消除所有网络延迟。
- [ ] D. 强制所有请求变成 POST。

**解释**：HTTPS 是 HTTP over TLS。TLS 负责加密传输、验证服务器身份并发现篡改。

### Q2 multiple | HTTP 与 HTTPS

哪些说法正确？

- [x] A. HTTP 明文传输，链路中可能被窃听或篡改。
- [x] B. HTTPS 默认端口通常是 443，HTTP 默认端口通常是 80。
- [x] C. HTTPS 依赖证书链验证服务器身份。
- [x] D. 现代实际使用的是 TLS，SSL 是历史名称。
- [ ] E. HTTPS 会让请求体永远无法被服务端读取。

**解释**：HTTPS 加密的是传输链路，服务端解密后仍能正常处理 HTTP 请求。

### Q3 multiple | TLS 性能与部署

关于 HTTPS 性能和部署，哪些判断正确？

- [x] A. TLS 会话恢复可以降低后续连接握手成本。
- [x] B. TLS 1.3 首次连接通常比旧版本握手更简化。
- [x] C. 0-RTT 有重放风险，更适合幂等请求。
- [x] D. 生产站点通常应配合 HSTS。
- [ ] E. HTTPS 一定是现代网站最大性能瓶颈。

**解释**：现代 HTTPS 成本通常可控，但部署时仍要关注证书、HSTS、会话恢复和 0-RTT 风险。

## net-002

### Q1 single | 状态码分类

HTTP 4xx 状态码主要表示什么？

- [ ] A. 信息响应。
- [ ] B. 成功响应。
- [ ] C. 重定向。
- [x] D. 客户端请求有问题。

**解释**：1xx 信息，2xx 成功，3xx 重定向，4xx 客户端错误，5xx 服务端错误。

### Q2 multiple | 常见状态码

哪些状态码含义匹配正确？

- [x] A. `200 OK`：请求成功。
- [x] B. `201 Created`：资源创建成功。
- [x] C. `304 Not Modified`：协商缓存命中，可复用缓存。
- [x] D. `401 Unauthorized`：需要认证或认证失败。
- [ ] E. `500 Not Found`：资源不存在。

**解释**：资源不存在是 404。500 表示服务端内部错误。

### Q3 multiple | 业务排查

前端看到这些状态码时，哪些排查方向合理？

- [x] A. `403` 关注权限、角色、CSRF 或安全策略。
- [x] B. `409` 常见于资源冲突或版本冲突。
- [x] C. `429` 表示请求过多，关注限流和重试退避。
- [x] D. `502/503/504` 关注网关、上游服务和超时。
- [ ] E. 所有 4xx 都应该自动无限重试。

**解释**：状态码是定位方向。4xx 多半要修请求或权限，5xx 才更偏服务端或链路问题。

## net-003

### Q1 single | GET 语义

GET 的标准语义更接近哪一个？

- [x] A. 获取资源，应当是安全且幂等的。
- [ ] B. 创建资源，一定修改服务端状态。
- [ ] C. 上传文件的唯一方法。
- [ ] D. 只能用于没有参数的请求。

**解释**：GET 可以有查询参数，但语义应是读取资源，不应产生业务副作用。

### Q2 multiple | GET 与 POST

哪些说法正确？

- [x] A. GET 参数通常放在 URL 查询串中，容易出现在日志、历史记录和 Referer 中。
- [x] B. POST 请求体更适合提交复杂数据或创建资源。
- [x] C. GET 更容易被浏览器、代理和 CDN 缓存。
- [x] D. POST 不天然幂等，是否可重试取决于业务设计。
- [ ] E. POST 一定比 GET 更安全，因为请求体会自动加密。

**解释**：安全性来自 HTTPS、鉴权和服务端校验，不是来自方法名。POST body 在 HTTPS 外也可能被明文传输。

### Q3 multiple | 方法误区

哪些判断更准确？

- [x] A. HTTP 规范没有简单规定 GET 绝对不能有 body，但兼容性和语义上不推荐依赖它。
- [x] B. 敏感信息不应放在 URL 中。
- [x] C. 幂等不等于无副作用，而是重复执行最终效果一致。
- [ ] D. GET 请求一定不能携带任何 header。
- [ ] E. POST 请求一定不会被缓存。

**解释**：HTTP 方法要看语义、缓存、幂等和兼容性。不要把“常见实践”误当绝对规则。

## net-004

### Q1 single | 同源判断

浏览器同源策略中的“源”由哪三部分组成？

- [x] A. 协议、域名、端口。
- [ ] B. 路径、查询参数、hash。
- [ ] C. Cookie、Token、Session。
- [ ] D. IP、DNS、CDN。

**解释**：协议、主机和端口三者都相同才是同源。路径不同仍然同源。

### Q2 multiple | 跨域解决方案

哪些方案可用于不同场景的跨域通信或访问？

- [x] A. CORS。
- [x] B. 开发或服务端反向代理。
- [x] C. JSONP 只适合 GET 且有安全限制。
- [x] D. `postMessage` 用于窗口、iframe 等跨源消息通信。
- [ ] E. 在前端关闭浏览器同源策略作为线上方案。

**解释**：跨域要按场景选方案。线上不能要求用户关闭浏览器安全策略。

### Q3 multiple | 为什么会跨域

哪些请求可能被浏览器按跨域处理？

- [x] A. `https://a.com` 请求 `https://api.a.com`。
- [x] B. `https://a.com` 请求 `http://a.com`。
- [x] C. `https://a.com:443` 请求 `https://a.com:8443`。
- [ ] D. `https://a.com/path1` 请求 `https://a.com/path2`。
- [ ] E. 同一页面内跳转不同 hash。

**解释**：子域、协议和端口变化都会改变源；路径和 hash 不参与源的判断。

## net-005

### Q1 single | 三次握手目的

TCP 三次握手的主要目的是什么？

- [ ] A. 传输完整 HTTP 响应体。
- [x] B. 确认双方收发能力并同步初始序列号。
- [ ] C. 删除 DNS 缓存。
- [ ] D. 升级为 WebSocket。

**解释**：三次握手建立可靠连接基础，双方确认对方可达并协商序列号。

### Q2 multiple | 握手过程

哪些步骤属于 TCP 三次握手？

- [x] A. 客户端发送 SYN。
- [x] B. 服务端返回 SYN + ACK。
- [x] C. 客户端再发送 ACK。
- [ ] D. 客户端发送 FIN 后立即进入 TIME_WAIT。
- [ ] E. 服务端发送 HTTP 304。

**解释**：FIN 属于连接关闭过程，不属于建立连接的三次握手。

### Q3 multiple | 四次挥手

关于 TCP 四次挥手，哪些说法正确？

- [x] A. TCP 是全双工连接，双方方向需要分别关闭。
- [x] B. 主动关闭方通常会进入 TIME_WAIT。
- [x] C. TIME_WAIT 有助于处理迟到报文和保证对端收到最后 ACK。
- [ ] D. 四次挥手用于 DNS 解析。
- [ ] E. 收到 FIN 后必须立即丢弃所有未发送数据。

**解释**：关闭连接时，一方不再发送并不代表另一方也没有剩余数据要发送。

## net-006

### Q1 single | DNS 作用

DNS 最核心的作用是什么？

- [ ] A. 加密 HTTP 请求体。
- [x] B. 把域名解析为 IP 地址或相关记录。
- [ ] C. 保证接口幂等。
- [ ] D. 渲染 HTML。

**解释**：DNS 是域名系统，浏览器需要通过解析结果找到目标服务器地址。

### Q2 multiple | DNS 解析链路

一次典型 DNS 查询可能涉及哪些环节？

- [x] A. 浏览器、系统、路由器或本地 DNS 缓存。
- [x] B. 递归解析器。
- [x] C. 根域名服务器、顶级域服务器、权威 DNS。
- [x] D. CNAME 记录继续指向另一个域名。
- [ ] E. React 组件树 diff。

**解释**：DNS 查询会被多层缓存加速，未命中时递归解析器逐级查询权威信息。

### Q3 multiple | DNS 与性能

哪些做法或现象和 DNS 性能相关？

- [x] A. DNS 缓存可减少重复解析。
- [x] B. `dns-prefetch` 可提前解析后续要访问的域名。
- [x] C. CDN 常通过 DNS 或 Anycast 把用户调度到较近节点。
- [ ] D. DNS 解析完成后就不需要 TCP/TLS 握手。
- [ ] E. TTL 越大，流量调度就一定越实时。

**解释**：DNS 缓存提升性能，但 TTL 太大也会降低变更和调度的实时性。

## net-007

### Q1 single | Session 的典型机制

传统 Session 登录中，浏览器通常保存什么？

- [x] A. 一个 session id，服务端保存会话数据。
- [ ] B. 完整数据库连接。
- [ ] C. 服务端私钥。
- [ ] D. 所有用户权限源码。

**解释**：Session 通常是服务端保存状态，客户端 Cookie 只保存会话标识。

### Q2 multiple | Cookie/Token/JWT

哪些说法正确？

- [x] A. Cookie 会按域、路径、SameSite 等规则自动随请求发送。
- [x] B. Token 常放在 Authorization header 中，由前端显式携带。
- [x] C. JWT 是一种自包含 token，包含 header、payload、signature。
- [x] D. JWT 签名用于防篡改，不等于内容加密。
- [ ] E. Token 一旦发出就永远不能失效。

**解释**：JWT payload 默认只是编码，不是加密。失效可通过短有效期、刷新令牌、黑名单或版本号处理。

### Q3 multiple | 存储安全

哪些安全做法合理？

- [x] A. Cookie 中的会话标识使用 `HttpOnly` 降低 XSS 读取风险。
- [x] B. 生产 HTTPS 下使用 `Secure` Cookie。
- [x] C. 根据跨站需求设置合适的 `SameSite`。
- [x] D. Token 存储位置要权衡 XSS 和 CSRF 风险。
- [ ] E. 把长期有效 token 放进任意第三方脚本可读的全局变量。

**解释**：身份凭证的安全是 XSS、CSRF、过期、刷新和撤销策略的组合题。

## net-008

### Q1 single | DOM 型 XSS

DOM 型 XSS 的主要特点是什么？

- [ ] A. 恶意脚本一定存入服务端数据库。
- [x] B. 漏洞主要发生在前端 DOM 操作中，恶意输入在浏览器端被执行。
- [ ] C. 只发生在 HTTPS 站点。
- [ ] D. 只通过 Cookie 触发。

**解释**：DOM 型 XSS 常见于把 URL、hash、postMessage 等不可信输入直接写入 HTML。

### Q2 multiple | XSS 类型

哪些说法正确？

- [x] A. 存储型 XSS 的恶意内容被保存到服务端或持久化存储。
- [x] B. 反射型 XSS 通常由请求参数反射到响应页面。
- [x] C. DOM 型 XSS 可能不经过服务端模板渲染。
- [ ] D. XSS 只能通过 `<script>` 标签触发。
- [ ] E. 只要用了 HTTPS 就不会有 XSS。

**解释**：XSS 的本质是让不可信内容以可执行方式进入页面，触发方式远不止 script 标签。

### Q3 multiple | CSP 与 HttpOnly

CSP 和 HttpOnly 分别能防什么？

- [x] A. CSP 可限制脚本来源、内联脚本、对象加载等，降低 XSS 执行面。
- [x] B. HttpOnly 可阻止 JavaScript 读取 Cookie。
- [x] C. HttpOnly 不能阻止浏览器自动携带 Cookie 发请求。
- [x] D. CSP 不是输出转义和输入校验的替代品。
- [ ] E. HttpOnly 可以阻止所有 XSS 代码执行。

**解释**：CSP 降低执行风险，HttpOnly 降低 Cookie 被窃取风险。二者防护面不同。

## net-009

### Q1 single | CSRF 本质

CSRF 攻击利用的核心是什么？

- [ ] A. 浏览器无法发送 Cookie。
- [x] B. 浏览器会自动携带目标站点 Cookie，攻击者诱导用户发起跨站请求。
- [ ] C. DNS 一定会被污染。
- [ ] D. 服务端无法返回 JSON。

**解释**：CSRF 借用用户已登录身份发请求，重点是“请求来自用户浏览器但不是用户真实意愿”。

### Q2 multiple | CSRF 防御组合

哪些防御手段可以组合使用？

- [x] A. `SameSite=Lax` 或 `Strict` 降低跨站自动携带 Cookie。
- [x] B. CSRF Token，服务端校验请求中的随机令牌。
- [x] C. 校验 `Origin` 或必要时校验 `Referer`。
- [x] D. 关键操作要求重新认证或二次确认。
- [ ] E. 只把接口改成 POST 就完全免疫 CSRF。

**解释**：POST 也会被跨站表单提交触发。CSRF 防御要用 SameSite、Token、Origin 等组合。

### Q3 multiple | Token 设计

CSRF Token 设计中哪些做法合理？

- [x] A. Token 应不可预测，并与用户会话绑定。
- [x] B. 服务端应校验 Token 是否匹配。
- [x] C. Token 不应只依赖固定公开字符串。
- [ ] D. Token 放在 Cookie 自动携带即可，无需请求参数或 header 校验。
- [ ] E. 所有 GET 读取接口都必须修改数据以验证 Token。

**解释**：CSRF Token 的价值在于攻击站点无法读取并构造正确令牌，通常通过表单字段或自定义 header 提交。

## net-010

### Q1 single | 强缓存命中

浏览器强缓存命中时，通常会发生什么？

- [x] A. 不向服务器发请求，直接使用本地缓存。
- [ ] B. 一定发送 `If-None-Match` 到服务器。
- [ ] C. 一定返回 500。
- [ ] D. 清空所有 Cookie。

**解释**：强缓存由 `Cache-Control`、`Expires` 等判断，命中时无需网络请求。

### Q2 multiple | 协商缓存

哪些字段参与协商缓存？

- [x] A. `ETag`。
- [x] B. `If-None-Match`。
- [x] C. `Last-Modified`。
- [x] D. `If-Modified-Since`。
- [ ] E. `Content-Security-Policy`。

**解释**：协商缓存会向服务器确认资源是否变化，未变化返回 304。

### Q3 multiple | 缓存策略

哪些缓存策略更合理？

- [x] A. 带 hash 的静态资源可使用长缓存。
- [x] B. HTML 入口通常不应长时间强缓存。
- [x] C. `no-cache` 表示可存储但使用前需重新验证。
- [x] D. `no-store` 表示不存储响应。
- [ ] E. `no-cache` 等于完全不缓存。

**解释**：缓存策略要按资源类型设计。入口 HTML 和带指纹静态资源通常策略不同。

## net-011

### Q1 single | HTTP/2 关键能力

HTTP/2 相比 HTTP/1.1 的关键改进之一是什么？

- [ ] A. 只能发送纯文本。
- [x] B. 在一个连接上通过二进制帧多路复用多个请求响应。
- [ ] C. 不再需要 TCP。
- [ ] D. 取消所有 header。

**解释**：HTTP/2 把消息拆成帧，在同一 TCP 连接上交错传输多个 stream。

### Q2 multiple | HTTP 版本差异

哪些说法正确？

- [x] A. HTTP/1.1 支持持久连接，但并发常受连接数和队头阻塞影响。
- [x] B. HTTP/2 有头部压缩和多路复用。
- [x] C. HTTP/3 基于 QUIC，运行在 UDP 之上。
- [x] D. HTTP/3 试图缓解 TCP 层队头阻塞。
- [ ] E. HTTP/2 让所有前端资源合并成一个文件永远更优。

**解释**：HTTP/2 改变了资源合并策略。过度合并可能损失缓存粒度和优先级调度。

### Q3 multiple | 前端实践影响

HTTP/2/3 对前端优化有哪些影响？

- [x] A. 小文件过度合并的收益下降。
- [x] B. 仍需要控制关键资源优先级和体积。
- [x] C. 仍要关注服务器、CDN 和浏览器是否真正启用对应协议。
- [ ] D. 启用 HTTP/2 后图片体积就不重要了。
- [ ] E. HTTP/3 会让所有丢包都没有任何代价。

**解释**：协议优化减少连接层开销，但资源大小、缓存、优先级和服务端配置依然关键。

## net-012

### Q1 single | CORS 决策方

CORS 是否允许跨域响应被前端读取，最终由谁执行限制？

- [ ] A. Nginx 日志系统。
- [x] B. 浏览器。
- [ ] C. React 编译器。
- [ ] D. DNS 服务器。

**解释**：服务端返回 CORS 头，浏览器根据这些头决定是否把响应暴露给前端脚本。

### Q2 multiple | 预检请求

哪些情况可能触发 CORS 预检请求？

- [x] A. 使用非简单方法，例如 PUT、DELETE。
- [x] B. 携带非简单请求头，例如 `Authorization`。
- [x] C. `Content-Type` 不是简单类型之一。
- [ ] D. 所有 GET 请求都会预检。
- [ ] E. 同源请求一定预检。

**解释**：预检是浏览器用 OPTIONS 询问服务端是否允许实际跨域请求。

### Q3 multiple | 带凭证 CORS

跨域请求携带 Cookie 时，哪些设置必要？

- [x] A. 前端设置 `credentials: 'include'` 或 XHR `withCredentials = true`。
- [x] B. 服务端返回 `Access-Control-Allow-Credentials: true`。
- [x] C. `Access-Control-Allow-Origin` 不能是 `*`，应是明确 Origin。
- [ ] D. 只要设置 `mode: 'no-cors'` 就能读取响应。
- [ ] E. Cookie 的 SameSite 策略完全不影响跨站携带。

**解释**：带凭证 CORS 要同时满足前端、服务端和 Cookie SameSite/Secure 等策略。

## net-013

### Q1 single | WebSocket 特点

WebSocket 连接建立后最核心的特点是什么？

- [ ] A. 只能服务端向客户端发消息。
- [x] B. 基于一个持久连接进行全双工通信。
- [ ] C. 每条消息都必须重新三次握手。
- [ ] D. 只能传输图片。

**解释**：WebSocket 适合实时双向通信，例如 IM、协作、行情和游戏状态同步。

### Q2 multiple | WebSocket 握手

哪些说法正确？

- [x] A. WebSocket 初始握手基于 HTTP Upgrade。
- [x] B. 成功后协议切换到 WebSocket。
- [x] C. `ws://` 对应明文，`wss://` 对应 TLS 加密。
- [ ] D. WebSocket 不需要任何鉴权设计。
- [ ] E. WebSocket 消息一定按 JSON 格式传输。

**解释**：WebSocket 只定义通信通道和帧，消息格式和鉴权仍由业务设计。

### Q3 multiple | WebSocket 工程问题

使用 WebSocket 时通常要考虑哪些问题？

- [x] A. 心跳和断线重连。
- [x] B. 鉴权过期和重新认证。
- [x] C. 消息顺序、去重和重放。
- [x] D. 服务端连接数和扩容。
- [ ] E. 浏览器会自动保证业务消息不丢不重。

**解释**：WebSocket 提供连接能力，不自动解决业务可靠性和状态一致性。

## net-014

### Q1 single | SSE 通信方向

SSE 更适合哪种通信模式？

- [x] A. 服务端持续向客户端推送文本事件。
- [ ] B. 客户端和服务端高频双向二进制通信。
- [ ] C. 客户端上传大文件。
- [ ] D. DNS 递归查询。

**解释**：SSE 是 Server-Sent Events，天然是服务端到客户端的单向事件流。

### Q2 multiple | SSE 与 WebSocket

哪些说法正确？

- [x] A. SSE 基于 HTTP，使用 `text/event-stream`。
- [x] B. SSE 浏览器 EventSource 通常支持自动重连。
- [x] C. WebSocket 更适合双向实时通信。
- [x] D. SSE 适合通知、进度、日志、低频实时流。
- [ ] E. SSE 原生支持客户端向服务端在同一连接上发送任意消息。

**解释**：SSE 是单向推送，客户端发消息仍需普通 HTTP 请求或其他通道。

### Q3 multiple | SSE 注意事项

使用 SSE 时要注意什么？

- [x] A. 代理或网关可能缓冲响应，需要关闭或调整缓冲。
- [x] B. 连接要定期发送心跳避免超时断开。
- [x] C. 可用 `Last-Event-ID` 做断线续传语义。
- [ ] D. SSE 比 WebSocket 更适合实时多人游戏输入。
- [ ] E. SSE 不受浏览器连接数限制影响。

**解释**：SSE 简单可靠，但仍受 HTTP 连接、代理缓冲和网络断开影响。

## net-015

### Q1 single | TLS 握手目标

TLS 握手最主要完成什么？

- [ ] A. 压缩所有图片。
- [x] B. 协商加密参数、验证身份并推导会话密钥。
- [ ] C. 生成 React 组件。
- [ ] D. 清理浏览器缓存。

**解释**：握手完成后，应用数据才使用协商出的对称密钥加密传输。

### Q2 multiple | 证书验证

客户端验证服务器证书时，通常会检查什么？

- [x] A. 证书链是否可信。
- [x] B. 域名是否匹配。
- [x] C. 证书是否在有效期内。
- [x] D. 是否被吊销或不再可信。
- [ ] E. 服务器 HTML 是否语义化。

**解释**：证书验证失败时，浏览器应阻止或警告连接，避免连接到伪造服务器。

### Q3 multiple | TLS 1.3 与密钥

哪些说法正确？

- [x] A. TLS 握手中会协商加密套件和密钥交换参数。
- [x] B. 非对称加密主要用于身份验证和密钥交换，数据传输主要用对称加密。
- [x] C. 前向安全性可降低长期私钥泄露对历史会话的影响。
- [x] D. ALPN 可协商 HTTP/2 等应用层协议。
- [ ] E. TLS 握手后所有应用层安全问题都会自动消失。

**解释**：TLS 保护传输链路，但不能替代鉴权、权限、XSS/CSRF 防护和业务校验。

## net-016

### Q1 single | 长轮询

长轮询和普通轮询的关键区别是什么？

- [ ] A. 长轮询只能用 WebSocket。
- [x] B. 长轮询请求到达服务端后可挂起，直到有数据或超时才返回。
- [ ] C. 长轮询不需要 HTTP。
- [ ] D. 普通轮询一定是双向全双工。

**解释**：长轮询减少空响应次数，但本质仍是 HTTP 请求响应模型。

### Q2 multiple | 实时方案对比

哪些说法正确？

- [x] A. 普通轮询实现简单，但延迟和空请求较多。
- [x] B. 长轮询比普通轮询更接近实时，但服务端要管理挂起连接。
- [x] C. WebSocket 更适合高频双向通信。
- [x] D. SSE 更适合服务端单向事件推送。
- [ ] E. 长轮询建立一次连接后永远不需要重新请求。

**解释**：长轮询返回后，客户端通常要立即发起下一次请求继续等待新数据。

### Q3 multiple | 长轮询工程细节

实现长轮询时，哪些点需要考虑？

- [x] A. 请求超时和客户端重连策略。
- [x] B. 服务端连接占用和并发容量。
- [x] C. 断线、重复消息和消息游标。
- [ ] D. 不需要鉴权，因为只是等待。
- [ ] E. 服务端永远不返回空结果。

**解释**：长轮询看似简单，但连接管理、超时、消息确认和容量规划都要设计。

## net-017

### Q1 single | CSP 作用

Content Security Policy 主要用于什么？

- [ ] A. 压缩 HTTP 响应体。
- [x] B. 限制页面可加载和执行的资源来源，降低 XSS 等风险。
- [ ] C. 自动修复 SQL 注入。
- [ ] D. 强制所有接口返回 XML。

**解释**：CSP 是浏览器执行的安全策略，可限制脚本、样式、图片、连接等来源。

### Q2 multiple | CSP 指令

哪些 CSP 指令含义匹配？

- [x] A. `default-src`：默认资源来源兜底。
- [x] B. `script-src`：脚本来源和执行策略。
- [x] C. `connect-src`：fetch、XHR、WebSocket 等连接来源。
- [x] D. `frame-ancestors`：限制页面被哪些来源嵌入。
- [ ] E. `Cache-Control`：限制脚本来源。

**解释**：CSP 是安全策略，Cache-Control 是缓存策略，二者不是一类 header。

### Q3 multiple | CSP 配置实践

哪些做法更安全？

- [x] A. 避免随意使用 `unsafe-inline`。
- [x] B. 对内联脚本使用 nonce 或 hash。
- [x] C. 先用 Report-Only 观察违规，再逐步收紧。
- [x] D. 配置 `object-src 'none'` 降低旧插件风险。
- [ ] E. 设置 CSP 后就不需要输出转义。

**解释**：CSP 是纵深防御，不是替代编码、转义、依赖治理和审计的银弹。

## net-018

### Q1 single | TCP 与 UDP

TCP 相比 UDP 最大的特点是什么？

- [x] A. 面向连接，提供可靠、有序、拥塞控制等机制。
- [ ] B. 无连接且不保证顺序。
- [ ] C. 不需要 IP。
- [ ] D. 只能用于 DNS。

**解释**：TCP 提供可靠字节流；UDP 更轻量，不保证可靠性和顺序。

### Q2 multiple | UDP 适用场景

哪些场景可能适合 UDP 或基于 UDP 的协议？

- [x] A. 实时音视频。
- [x] B. 在线游戏状态同步。
- [x] C. DNS 查询。
- [x] D. QUIC/HTTP/3。
- [ ] E. 强一致数据库事务默认都用裸 UDP。

**解释**：UDP 适合低延迟、可容忍部分丢包或在应用层自定义可靠性的场景。

### Q3 multiple | 选择依据

选择 TCP 或 UDP 时应关注什么？

- [x] A. 是否需要可靠有序传输。
- [x] B. 是否能容忍丢包和乱序。
- [x] C. 延迟、拥塞控制和连接迁移需求。
- [x] D. 应用层是否能处理重传、去重和纠错。
- [ ] E. UDP 永远比 TCP 安全。

**解释**：TCP/UDP 没有绝对优劣，取决于业务对可靠性、延迟和控制能力的取舍。

## net-019

### Q1 single | JWT 结构

JWT 通常由哪三部分组成？

- [x] A. Header、Payload、Signature。
- [ ] B. HTML、CSS、JS。
- [ ] C. DNS、TCP、TLS。
- [ ] D. Cookie、Session、LocalStorage。

**解释**：JWT 用 `.` 分隔三段。签名用于验证 header 和 payload 未被篡改。

### Q2 multiple | JWT 安全注意

哪些说法正确？

- [x] A. JWT payload 默认只是 Base64URL 编码，不是加密。
- [x] B. 不应把敏感明文信息放进 payload。
- [x] C. 服务端必须验证签名、过期时间、issuer、audience 等声明。
- [x] D. 应避免接受 `alg: none` 或算法混淆。
- [ ] E. 前端能解码 JWT 就说明它一定可信。

**解释**：解码不等于验证。可信性来自服务端用正确密钥和算法验证签名及声明。

### Q3 multiple | JWT 失效策略

JWT 的失效和续期可以怎么设计？

- [x] A. Access token 短有效期。
- [x] B. Refresh token 单独存储和轮换。
- [x] C. 服务端黑名单、版本号或撤销列表处理强制下线。
- [ ] D. 永久有效 JWT 更安全。
- [ ] E. 删除前端本地 token 就能让所有已签发 token 在服务端失效。

**解释**：JWT 自包含带来无状态验证优势，也带来撤销难题，需要结合短期令牌和服务端撤销机制。

## net-020

### Q1 single | Authorization 头

`Authorization: Bearer <token>` 通常用于什么？

- [ ] A. 指定浏览器缓存时间。
- [x] B. 携带访问令牌进行身份认证。
- [ ] C. 声明响应内容类型。
- [ ] D. 开启 gzip。

**解释**：Authorization 是请求头，常用于 Basic、Bearer 等认证方案。

### Q2 multiple | 常见请求头

哪些属于常见请求头？

- [x] A. `Accept`。
- [x] B. `Content-Type`。
- [x] C. `Authorization`。
- [x] D. `If-None-Match`。
- [ ] E. `Set-Cookie`。

**解释**：`Set-Cookie` 是响应头，由服务端要求浏览器保存 Cookie。

### Q3 multiple | 常见响应头

哪些属于常见响应头？

- [x] A. `Content-Type`。
- [x] B. `Cache-Control`。
- [x] C. `ETag`。
- [x] D. `Access-Control-Allow-Origin`。
- [x] E. `Strict-Transport-Security`。

**解释**：响应头描述响应内容、缓存、安全策略和跨域暴露规则。

## net-021

### Q1 single | RESTful 资源

RESTful API 设计中，URL 更推荐表达什么？

- [ ] A. 动词操作名。
- [x] B. 资源。
- [ ] C. 数据库连接字符串。
- [ ] D. 前端组件名。

**解释**：REST 强调以资源为中心，操作语义由 HTTP 方法表达。

### Q2 multiple | REST 原则

哪些设计更符合 RESTful 风格？

- [x] A. `GET /users/1` 获取用户。
- [x] B. `POST /users` 创建用户。
- [x] C. `PUT/PATCH /users/1` 更新用户。
- [x] D. `DELETE /users/1` 删除用户。
- [ ] E. `GET /deleteUser?id=1` 删除用户。

**解释**：方法表达动作，路径表达资源。GET 不应承担删除等副作用操作。

### Q3 multiple | API 设计细节

RESTful API 还应关注哪些点？

- [x] A. 正确使用状态码。
- [x] B. 分页、排序、过滤参数设计。
- [x] C. 版本管理和兼容性。
- [x] D. 错误响应结构一致。
- [ ] E. 所有接口都必须返回 200，即使失败。

**解释**：REST 不只是 URL 命名，还包括方法、状态码、错误语义和可演进性。

## net-022

### Q1 single | 表单文件上传

浏览器上传文件最常见的数据结构是什么？

- [ ] A. `URLSearchParams`。
- [x] B. `FormData`。
- [ ] C. `localStorage`。
- [ ] D. `Map`。

**解释**：`FormData` 可携带文件和普通字段，浏览器会生成 multipart/form-data 请求体。

### Q2 multiple | 文件上传注意事项

哪些做法正确？

- [x] A. 使用 `input[type=file]` 或拖拽获取 File 对象。
- [x] B. 上传大文件时可考虑分片上传。
- [x] C. 校验文件大小、类型和数量，服务端也必须校验。
- [x] D. 展示上传进度时 XHR 仍有优势。
- [ ] E. 前端校验通过后，服务端就不需要校验。

**解释**：前端校验只改善体验，安全和真实性必须由服务端校验。

### Q3 multiple | 分片和断点

大文件上传常见设计包括哪些？

- [x] A. 按 chunk 切片上传。
- [x] B. 计算文件 hash 或分片 hash 用于秒传、校验和断点续传。
- [x] C. 服务端记录已上传分片并最终合并。
- [x] D. 失败分片重试。
- [ ] E. 所有分片都必须顺序同步上传，不能并发。

**解释**：分片上传要平衡并发、重试、校验和服务端合并成本。

## net-023

### Q1 single | Fetch 默认行为

`fetch` 遇到 HTTP 404 时，返回的 Promise 默认会怎样？

- [ ] A. 自动 reject。
- [x] B. resolve 为 Response，需要检查 `response.ok`。
- [ ] C. 永远 pending。
- [ ] D. 自动重试。

**解释**：fetch 只在网络错误等情况下 reject；HTTP 错误状态仍会 resolve。

### Q2 multiple | Fetch 与 XHR

哪些说法正确？

- [x] A. fetch 基于 Promise，写法更现代。
- [x] B. XHR 原生支持上传进度事件。
- [x] C. fetch 可结合 AbortController 实现取消。
- [x] D. XHR 可设置 `responseType` 处理 blob 等响应。
- [ ] E. fetch 默认会携带跨域 Cookie。

**解释**：fetch 默认 credentials 是 `same-origin`，跨域携带 Cookie 需要显式配置。

### Q3 multiple | Fetch 使用注意

使用 fetch 时，哪些处理常见且必要？

- [x] A. 检查 `response.ok` 或状态码。
- [x] B. 根据 `Content-Type` 选择 json/text/blob 解析。
- [x] C. 处理 AbortError 和网络错误。
- [x] D. 需要时设置 credentials、headers 和 mode。
- [ ] E. 对同一个响应体可以无限次调用 `response.json()`。

**解释**：Response body 是流，通常只能消费一次。错误状态和解析策略都要显式处理。

## net-024

### Q1 single | CDN 价值

CDN 的主要价值是什么？

- [ ] A. 替代浏览器渲染引擎。
- [x] B. 把内容分发到离用户更近的边缘节点，降低延迟和源站压力。
- [ ] C. 自动修复所有代码 bug。
- [ ] D. 强制所有接口变成 WebSocket。

**解释**：CDN 通过边缘缓存、调度和传输优化提升静态资源和部分动态内容访问速度。

### Q2 multiple | CDN 工作机制

哪些说法正确？

- [x] A. 用户请求可通过 DNS 或 Anycast 调度到合适节点。
- [x] B. 边缘节点命中缓存时无需回源。
- [x] C. 未命中或过期时会回源获取资源。
- [x] D. 缓存 key、Vary、Query String 策略会影响命中率。
- [ ] E. CDN 永远不会缓存旧内容。

**解释**：CDN 缓存很依赖配置。缓存刷新、版本化 URL 和回源策略都影响一致性。

### Q3 multiple | CDN 实践

使用 CDN 时，哪些做法合理？

- [x] A. 静态资源文件名加 hash 后使用长缓存。
- [x] B. HTML 入口谨慎长缓存。
- [x] C. 配置 HTTPS 证书和安全响应头。
- [x] D. 监控命中率、回源量和边缘错误。
- [ ] E. 所有用户私有数据都无条件公共缓存。

**解释**：CDN 提速的同时要避免缓存污染、隐私泄漏和旧版本资源问题。

## net-025

### Q1 single | URL 到页面第一步

浏览器输入 URL 后，若没有可用缓存，网络链路通常首先需要做什么？

- [x] A. DNS 解析域名。
- [ ] B. 执行 React useEffect。
- [ ] C. 下载所有图片。
- [ ] D. 运行 Service Worker 安装事件。

**解释**：找到服务器地址之前，浏览器需要解析域名；如果已有缓存或预连接，路径会有所不同。

### Q2 multiple | 页面加载链路

从输入 URL 到页面显示，可能发生哪些步骤？

- [x] A. DNS 解析。
- [x] B. TCP 连接和 TLS 握手。
- [x] C. 发送 HTTP 请求并接收响应。
- [x] D. 解析 HTML，构建 DOM，加载 CSS/JS 等子资源。
- [x] E. 布局、绘制和合成。

**解释**：页面显示是网络、解析、渲染和执行共同作用的结果。

### Q3 multiple | 慢页面定位

如果页面首屏很慢，哪些分阶段定位合理？

- [x] A. 看 DNS、连接、TLS、TTFB 等网络瀑布。
- [x] B. 看资源体积、缓存命中和 CDN 命中。
- [x] C. 看 JS 执行、主线程阻塞和渲染指标。
- [x] D. 看 LCP 元素和关键资源优先级。
- [ ] E. 只看接口业务日志，不看浏览器性能数据。

**解释**：首屏慢可能来自网络、服务端、资源、JS、渲染或优先级，需要分层排查。

## net-026

### Q1 single | OSI 网络层

IP 协议主要位于 OSI 模型的哪一层？

- [ ] A. 应用层。
- [x] B. 网络层。
- [ ] C. 表示层。
- [ ] D. 会话层。

**解释**：IP 负责跨网络寻址和路由，属于网络层。

### Q2 multiple | 模型对应

哪些对应关系大体正确？

- [x] A. HTTP 属于应用层。
- [x] B. TCP/UDP 属于传输层。
- [x] C. IP 属于网络层。
- [x] D. 以太网、Wi-Fi 更接近数据链路/物理层。
- [ ] E. CSS 属于传输层协议。

**解释**：分层模型帮助理解职责边界，不必死记每个协议细节。

### Q3 multiple | TCP/IP 四层

TCP/IP 四层模型通常包括哪些层？

- [x] A. 应用层。
- [x] B. 传输层。
- [x] C. 网络层或网际层。
- [x] D. 网络接口层。
- [ ] E. 组件层。

**解释**：TCP/IP 模型比 OSI 更贴近实际协议栈，常把 OSI 的部分层合并理解。

## net-027

### Q1 single | 证书绑定

HTTPS 证书最核心绑定的是什么？

- [ ] A. 前端框架版本。
- [x] B. 域名和公钥等身份信息。
- [ ] C. 用户密码明文。
- [ ] D. CSS 文件 hash。

**解释**：证书把域名身份和公钥绑定起来，并由受信任 CA 链路背书。

### Q2 multiple | 证书有效性

浏览器验证证书有效性时会关注什么？

- [x] A. 证书链是否能追溯到受信任根 CA。
- [x] B. 证书域名是否匹配访问域名。
- [x] C. 证书是否过期或尚未生效。
- [x] D. 证书用途和扩展是否合适。
- [ ] E. 网站 UI 是否美观。

**解释**：证书验证是身份认证基础。任一关键检查失败都可能导致连接不可信。

### Q3 multiple | 证书部署

证书部署中哪些做法正确？

- [x] A. 使用完整证书链。
- [x] B. 私钥必须妥善保护。
- [x] C. 证书到期前自动续期和监控。
- [x] D. 多域名或子域名使用 SAN 或合适的通配符证书。
- [ ] E. 把私钥提交到前端仓库方便排查。

**解释**：证书问题常导致线上不可访问。私钥泄露是严重安全事故。

## net-028

### Q1 single | Keep-Alive

HTTP Keep-Alive 的核心作用是什么？

- [ ] A. 让响应体永远不结束。
- [x] B. 复用 TCP 连接，减少重复建连开销。
- [ ] C. 自动开启 WebSocket。
- [ ] D. 禁止浏览器缓存。

**解释**：持久连接减少 TCP/TLS 握手成本，HTTP/1.1 默认倾向使用 keep-alive。

### Q2 multiple | Keep-Alive 注意

哪些说法正确？

- [x] A. 连接复用可降低延迟和服务器建连成本。
- [x] B. 空闲连接需要超时关闭，避免资源占用。
- [x] C. HTTP/1.1 中同一连接上的请求仍可能受队头阻塞影响。
- [x] D. 代理、负载均衡和服务端都有各自 keep-alive 超时配置。
- [ ] E. Keep-Alive 等于浏览器缓存。

**解释**：Keep-Alive 是连接复用，不是资源缓存。它优化的是连接层开销。

### Q3 multiple | HTTP/2 连接复用

HTTP/2 的连接复用和 HTTP/1.1 Keep-Alive 有什么不同？

- [x] A. HTTP/2 在单连接上通过多个 stream 多路复用。
- [x] B. HTTP/1.1 持久连接通常仍按请求响应顺序处理或受并发限制。
- [x] C. HTTP/2 连接复用减少同域多连接需求。
- [ ] D. HTTP/2 不需要任何 TCP 连接。
- [ ] E. HTTP/2 完全没有任何队头阻塞问题。

**解释**：HTTP/2 解决应用层队头阻塞，但基于 TCP 时仍可能受 TCP 层丢包影响。

## net-029

### Q1 single | 拥塞控制目标

TCP 拥塞控制主要解决什么问题？

- [ ] A. HTML 语义化。
- [x] B. 根据网络拥塞情况调整发送速率，避免把网络压垮。
- [ ] C. 验证 HTTPS 证书。
- [ ] D. 生成 JWT。

**解释**：拥塞控制关注网络整体承载能力，和接收方流量控制不是同一件事。

### Q2 multiple | 常见算法阶段

TCP 拥塞控制常见机制包括哪些？

- [x] A. 慢启动。
- [x] B. 拥塞避免。
- [x] C. 快速重传。
- [x] D. 快速恢复。
- [ ] E. DOM diff。

**解释**：经典 TCP 拥塞控制通过 cwnd、ssthresh、ACK 和丢包信号调整发送窗口。

### Q3 multiple | cwnd 与 ssthresh

哪些说法正确？

- [x] A. 慢启动阶段 cwnd 增长较快。
- [x] B. 达到 ssthresh 后进入拥塞避免，增长更平缓。
- [x] C. 丢包或超时会触发窗口下降和阈值调整。
- [ ] D. cwnd 越大永远越好。
- [ ] E. 拥塞控制只发生在 UDP 中。

**解释**：cwnd 要根据网络反馈调整。过大的发送窗口会造成排队、丢包和更差吞吐。

## net-030

### Q1 single | SQL 注入本质

SQL 注入的本质是什么？

- [ ] A. CSS 加载失败。
- [x] B. 不可信输入被拼接进 SQL 语句，改变了原本查询语义。
- [ ] C. DNS 解析失败。
- [ ] D. 图片跨域。

**解释**：SQL 注入是服务端数据访问层问题，根本防御在服务端参数化查询和权限控制。

### Q2 multiple | 防御 SQL 注入

哪些做法正确？

- [x] A. 服务端使用参数化查询或预编译语句。
- [x] B. 服务端按业务做白名单校验。
- [x] C. 数据库账号最小权限。
- [x] D. 对错误信息做控制，避免泄露 SQL 结构。
- [ ] E. 只做前端正则校验即可彻底防御。

**解释**：前端校验可以提升体验，但攻击者可绕过前端直接请求接口。

### Q3 multiple | 前端能做什么

面对 SQL 注入，前端合理职责是什么？

- [x] A. 做输入格式约束和长度限制，减少无效请求。
- [x] B. 避免把敏感错误详情直接展示给用户。
- [x] C. 与后端约定参数类型和错误语义。
- [ ] D. 直接在浏览器里拼接 SQL 给数据库执行。
- [ ] E. 只要输入框禁止输入单引号就万无一失。

**解释**：前端不是 SQL 注入的最终防线。服务端参数化和权限隔离才是关键。

## net-031

### Q1 single | HSTS 作用

HSTS 主要用于防御什么？

- [ ] A. XSS 中的脚本执行。
- [x] B. 用户访问 HTTP 时被降级或劫持，强制浏览器后续使用 HTTPS。
- [ ] C. SQL 注入。
- [ ] D. 图片懒加载失败。

**解释**：HSTS 通过 `Strict-Transport-Security` 告诉浏览器，在有效期内该域名只能用 HTTPS 访问。

### Q2 multiple | HSTS 配置

哪些 HSTS 配置项或实践正确？

- [x] A. `max-age` 控制策略有效时间。
- [x] B. `includeSubDomains` 会覆盖子域名，启用前要确认所有子域都支持 HTTPS。
- [x] C. `preload` 可申请加入浏览器预加载列表，防止首次访问降级。
- [ ] D. HSTS 可以通过 HTTP 响应安全下发并生效。
- [ ] E. HSTS 会自动更新过期证书。

**解释**：HSTS 必须通过 HTTPS 响应下发才可信。includeSubDomains 和 preload 都需要谨慎上线。

### Q3 multiple | 降级攻击

哪些措施有助于防止协议降级？

- [x] A. 全站 HTTPS。
- [x] B. HSTS。
- [x] C. HSTS preload。
- [x] D. HTTP 入口只做 301/308 跳转到 HTTPS。
- [ ] E. 在页面里用 JavaScript 判断协议再跳转即可完全防御。

**解释**：如果首次 HTTP 请求已被劫持，页面 JavaScript 可能根本不会安全加载。HSTS/preload 更关键。

## net-032

### Q1 single | fetch 取消

前端取消 fetch 请求最常用的标准能力是什么？

- [x] A. `AbortController`。
- [ ] B. `Promise.cancel()`。
- [ ] C. `JSONP`。
- [ ] D. `document.cookie`。

**解释**：标准 Promise 没有 cancel 方法。fetch 支持通过 AbortSignal 取消。

### Q2 multiple | 超时控制

实现请求超时时，哪些处理合理？

- [x] A. 用 `setTimeout` 在超时后调用 `controller.abort()`。
- [x] B. 请求完成后清理 timeout。
- [x] C. 区分超时、用户主动取消和网络错误，便于 UI 提示。
- [ ] D. 超时后仍继续解析响应体。
- [ ] E. 所有请求都设置 1ms 超时更安全。

**解释**：超时时间是体验和稳定性的权衡。超时后要释放资源并给出可理解的错误语义。

### Q3 multiple | 并发取消

哪些场景常需要请求取消？

- [x] A. 搜索框输入变化，取消旧关键词请求。
- [x] B. 组件卸载，取消仍在进行的请求。
- [x] C. 路由切换后旧页面请求不再需要。
- [x] D. 上传或下载用户主动点击取消。
- [ ] E. 所有请求发出后都不能取消。

**解释**：取消请求能减少竞态、无效更新和资源浪费，但服务端是否已处理仍要按接口语义考虑。

## net-033

### Q1 single | HTTP/2 帧

HTTP/2 中 Frame 的作用是什么？

- [x] A. HTTP/2 通信的最小传输单位，用于承载不同类型数据。
- [ ] B. 浏览器渲染的一帧动画。
- [ ] C. TLS 证书的一部分。
- [ ] D. Cookie 的加密格式。

**解释**：HTTP/2 把请求响应拆成二进制帧，帧归属于不同 stream。

### Q2 multiple | 多路复用

HTTP/2 多路复用相关说法哪些正确？

- [x] A. 多个 stream 可在同一 TCP 连接上交错传输帧。
- [x] B. 每个 stream 有自己的标识和状态。
- [x] C. 帧可以重新组装成对应 stream 的完整消息。
- [x] D. 头部压缩可减少重复 header 开销。
- [ ] E. 多路复用表示每个请求都必须新建一个 TCP 连接。

**解释**：多路复用减少连接数和应用层排队，但不是每个请求一个连接。

### Q3 multiple | HTTP/2 队头阻塞

关于 HTTP/2 队头阻塞，哪些判断正确？

- [x] A. HTTP/2 解决了 HTTP/1.1 应用层请求排队问题。
- [x] B. HTTP/2 基于 TCP 时，TCP 丢包仍可能阻塞同连接上的所有 stream。
- [x] C. HTTP/3 基于 QUIC，能缓解 TCP 层队头阻塞。
- [ ] D. HTTP/2 完全不存在任何形式的队头阻塞。
- [ ] E. HTTP/2 多路复用会让丢包完全没有影响。

**解释**：多路复用不等于无阻塞。HTTP/3 的一个重要动机就是改善传输层队头阻塞。

## net-034

### Q1 single | MITM 本质

中间人攻击的本质是什么？

- [ ] A. 用户主动打开开发者工具。
- [x] B. 攻击者位于通信双方之间，窃听、篡改或伪造通信。
- [ ] C. CSS 选择器冲突。
- [ ] D. CDN 缓存命中。

**解释**：MITM 关注链路中的窃听和篡改，HTTPS/TLS 的目标之一就是防御它。

### Q2 multiple | MITM 防御

哪些措施有助于防御 MITM？

- [x] A. 使用 HTTPS 并正确验证证书。
- [x] B. HSTS 和 preload 防止降级到 HTTP。
- [x] C. 不忽略证书错误。
- [x] D. 关键客户端可考虑证书固定或公钥固定策略，但要谨慎运维。
- [ ] E. 在 URL 后加随机 query 就能防 MITM。

**解释**：MITM 防御核心是加密、身份认证和防降级。随机 query 不能阻止链路篡改。

### Q3 multiple | 证书错误

遇到证书错误时，哪些判断正确？

- [x] A. 可能是证书过期、域名不匹配或证书链不可信。
- [x] B. 可能是网络被代理或劫持。
- [x] C. 用户忽略警告继续访问会增加 MITM 风险。
- [ ] D. 证书错误只影响页面样式，不影响安全。
- [ ] E. 前端脚本可以安全地绕过浏览器证书校验。

**解释**：浏览器证书校验是 HTTPS 安全基础，前端不能也不应绕过。

## net-035

### Q1 single | 可重试错误

以下哪类错误通常更适合自动重试？

- [ ] A. 用户密码错误。
- [x] B. 网络抖动或临时 503。
- [ ] C. 权限不足 403。
- [ ] D. 参数校验失败 400。

**解释**：重试适合临时性错误，不适合确定性业务错误。

### Q2 multiple | 重试机制设计

哪些做法正确？

- [x] A. 设置最大重试次数。
- [x] B. 使用指数退避避免立刻打爆服务。
- [x] C. 对 429 可结合 `Retry-After`。
- [x] D. 只重试幂等或可安全重放的请求。
- [ ] E. 所有失败都立即无间隔无限重试。

**解释**：重试本身会放大流量。退避、次数限制和幂等性是关键。

### Q3 multiple | 前端重试体验

前端重试还应考虑什么？

- [x] A. 给用户明确的加载、失败和重试状态。
- [x] B. 用户取消后停止后续重试。
- [x] C. 避免多个组件对同一请求各自重试造成风暴。
- [ ] D. 隐藏所有错误，让用户永远等待。
- [ ] E. 重试次数越多用户体验一定越好。

**解释**：重试要可控、可取消、可观察。无限等待会让问题更难定位。

## net-036

### Q1 single | HTTPS 降级攻击

HTTPS 降级攻击通常试图让用户发生什么？

- [ ] A. 从 HTTP 自动升级到 HTTPS。
- [x] B. 从本应使用 HTTPS 的连接退回 HTTP 或弱安全路径。
- [ ] C. 从 IPv4 切换到 IPv6。
- [ ] D. 从 GET 切换到 POST。

**解释**：降级攻击削弱传输安全，让攻击者更容易窃听或篡改。

### Q2 multiple | 防降级措施

哪些措施有效？

- [x] A. HSTS。
- [x] B. HSTS preload。
- [x] C. 全站 HTTPS，避免混合内容。
- [x] D. 自动把 HTTP 301/308 到 HTTPS。
- [ ] E. 在 HTTP 页面里再加载一个 HTTPS 图片即可。

**解释**：混合内容会破坏安全边界。防降级要从入口、资源和浏览器策略一起处理。

### Q3 multiple | 混合内容

关于 HTTPS 页面加载 HTTP 资源，哪些说法正确？

- [x] A. 主动混合内容如脚本可能被浏览器阻止。
- [x] B. 被动混合内容如图片也会降低安全性和可信度。
- [x] C. 应把页面内资源都升级为 HTTPS。
- [ ] D. HTTP 脚本在 HTTPS 页面中执行完全没有风险。
- [ ] E. 混合内容和降级攻击没有任何关系。

**解释**：HTTP 子资源可能被篡改，尤其是脚本，会直接破坏 HTTPS 页面安全。

## net-037

### Q1 single | 点击劫持

点击劫持通常利用什么方式诱导用户误点？

- [ ] A. SQL 拼接。
- [x] B. 把目标页面嵌入透明或伪装 iframe。
- [ ] C. DNS 递归解析。
- [ ] D. TCP 慢启动。

**解释**：攻击者让用户以为点击的是某个按钮，实际点击的是嵌入页面里的敏感操作。

### Q2 multiple | 点击劫持防御

哪些方式可防御点击劫持？

- [x] A. `Content-Security-Policy: frame-ancestors ...`。
- [x] B. `X-Frame-Options: DENY`。
- [x] C. `X-Frame-Options: SAMEORIGIN`。
- [x] D. 关键操作二次确认。
- [ ] E. 设置 `Cache-Control: no-cache` 即可防御。

**解释**：frame-ancestors 是现代首选，X-Frame-Options 是老方案。缓存头不是点击劫持防线。

### Q3 multiple | frame-ancestors

关于 `frame-ancestors`，哪些说法正确？

- [x] A. 它限制谁可以把当前页面放进 frame/iframe。
- [x] B. 它属于 CSP 指令。
- [x] C. 可以比 X-Frame-Options 表达更细的来源控制。
- [ ] D. 它用于限制当前页面可以加载哪些图片。
- [ ] E. 它只能写在 meta 标签里。

**解释**：`frame-ancestors` 应通过 HTTP 响应头下发，控制页面被嵌入的权限。

## net-038

### Q1 single | no-store

`Cache-Control: no-store` 的含义是什么？

- [ ] A. 可以缓存，但每次使用前都要验证。
- [x] B. 不存储响应。
- [ ] C. 缓存一年。
- [ ] D. 只允许 CDN 缓存。

**解释**：`no-store` 是最严格的不存储语义，适合敏感响应。

### Q2 multiple | Cache-Control 指令

哪些说法正确？

- [x] A. `max-age` 表示浏览器缓存新鲜时间。
- [x] B. `s-maxage` 主要作用于共享缓存，如 CDN。
- [x] C. `public` 表示响应可被共享缓存存储。
- [x] D. `private` 表示响应只适合用户私有缓存。
- [ ] E. `immutable` 表示资源每次都必须重新验证。

**解释**：`immutable` 表示新鲜期内资源不会变化，浏览器可减少重新验证。

### Q3 multiple | 浏览器缓存与 CDN 缓存

哪些实践更合理？

- [x] A. 用户私有 API 响应通常避免被 CDN 公共缓存。
- [x] B. 静态 hash 资源可设置长 `max-age` 和 `immutable`。
- [x] C. CDN 缓存 key 要考虑 query、Vary 和鉴权相关 header。
- [ ] D. CDN 缓存和浏览器缓存完全是同一个东西。
- [ ] E. `no-cache` 表示任何地方都不能保存响应。

**解释**：浏览器缓存是私有客户端缓存，CDN 是共享缓存。`no-cache` 是存储后再验证。

## net-039

### Q1 single | 304

HTTP `304 Not Modified` 通常表示什么？

- [x] A. 资源未修改，客户端可继续使用缓存副本。
- [ ] B. 请求体太大。
- [ ] C. 服务器内部错误。
- [ ] D. 用户未登录。

**解释**：304 是协商缓存响应，不包含新的完整资源体。

### Q2 multiple | 认证与权限状态码

哪些状态码含义更准确？

- [x] A. `401`：未认证或认证无效。
- [x] B. `403`：已理解请求，但没有权限执行。
- [x] C. `407`：需要代理认证。
- [ ] D. `401` 表示资源一定不存在。
- [ ] E. `403` 表示必须重试三次。

**解释**：401 和 403 经常混淆。401 偏认证，403 偏授权。

### Q3 multiple | 重定向状态码

哪些说法正确？

- [x] A. `301` 表示永久重定向。
- [x] B. `302` 常见为临时重定向。
- [x] C. `307/308` 会更明确地保留原请求方法。
- [x] D. 重定向过多会增加首屏延迟。
- [ ] E. 3xx 都表示服务端崩溃。

**解释**：重定向是正常机制，但链路过长会带来额外 RTT 和缓存复杂度。

## net-040

### Q1 single | HTTPS 数据传输

HTTPS 握手完成后，实际应用数据主要使用什么加密？

- [ ] A. 永远使用明文。
- [x] B. 对称加密。
- [ ] C. 只使用 Base64。
- [ ] D. CSS hash。

**解释**：非对称加密用于身份认证和密钥交换更合适，数据传输主要用高效的对称加密。

### Q2 multiple | TLS 握手细节

TLS 握手中可能出现哪些内容？

- [x] A. ClientHello 发送支持的版本、随机数、加密套件、SNI、ALPN。
- [x] B. ServerHello 选择协议参数。
- [x] C. 服务端发送证书链。
- [x] D. 双方通过密钥交换材料推导会话密钥。
- [ ] E. 浏览器把用户密码发给 CA 验证。

**解释**：CA 参与证书信任链，不接收用户登录密码。

### Q3 multiple | HTTPS 仍需的安全措施

使用 HTTPS 后，仍然需要哪些安全措施？

- [x] A. 鉴权和授权。
- [x] B. XSS/CSRF 防护。
- [x] C. 输入校验和服务端参数化查询。
- [x] D. 安全 Cookie 策略。
- [ ] E. 不再需要任何业务权限判断。

**解释**：HTTPS 保护传输链路，不保护应用内部权限和输入处理。

## net-041

### Q1 single | 同源策略限制

同源策略主要限制什么？

- [ ] A. 用户不能打开多个标签页。
- [x] B. 一个源的脚本读取或操作另一个源的敏感资源。
- [ ] C. CSS 不能设置颜色。
- [ ] D. 服务器不能返回 JSON。

**解释**：同源策略是浏览器隔离不同站点数据的基础安全机制。

### Q2 multiple | CORS 完整机制

哪些说法正确？

- [x] A. 简单跨域请求可能直接发送实际请求。
- [x] B. 非简单请求先发送 OPTIONS 预检。
- [x] C. 服务端通过 `Access-Control-Allow-*` 头表达允许策略。
- [x] D. 浏览器根据 CORS 响应头决定是否暴露响应给前端 JS。
- [ ] E. CORS 是前端单方面设置 header 就能完成的。

**解释**：CORS 需要服务端授权，浏览器执行。前端不能伪造服务端允许策略。

### Q3 multiple | CORS 常见坑

哪些是 CORS 常见问题？

- [x] A. 带 credentials 时 `Access-Control-Allow-Origin` 不能为 `*`。
- [x] B. 预检响应缺少允许方法或允许 header。
- [x] C. Cookie SameSite 导致跨站请求未携带 Cookie。
- [x] D. 服务器业务报错但未返回 CORS 头，前端只能看到 CORS 错误。
- [ ] E. 只要浏览器报 CORS，一定是前端代码 bug。

**解释**：CORS 错误常来自服务端头、预检、Cookie 策略和异常响应路径。

## net-042

### Q1 single | 为什么三次握手

TCP 建立连接为什么需要三次握手而不是两次？

- [x] A. 第三次让服务端确认客户端收到了自己的 SYN+ACK，双方收发能力和序列号都被确认。
- [ ] B. 因为 HTTP 规定必须三次。
- [ ] C. 为了传输 Cookie。
- [ ] D. 因为 DNS 至少返回三个 IP。

**解释**：两次握手无法让服务端确认客户端的接收能力和最终确认状态。

### Q2 multiple | 握手与序列号

哪些说法正确？

- [x] A. SYN 会消耗一个序列号。
- [x] B. 双方会交换初始序列号。
- [x] C. ACK 用来确认已收到的数据或控制报文。
- [ ] D. 三次握手完成前就可以安全传输任意应用数据。
- [ ] E. 三次握手只发生在 UDP 中。

**解释**：TCP 的可靠传输依赖序列号和确认机制。UDP 无连接，不进行 TCP 三次握手。

### Q3 multiple | 四次挥手细节

哪些说法正确？

- [x] A. 主动关闭方发送 FIN 表示自己不再发送数据。
- [x] B. 对端 ACK 后仍可能继续发送剩余数据。
- [x] C. 对端也发送 FIN 后，主动关闭方再 ACK。
- [x] D. TIME_WAIT 有助于避免旧连接迟到报文影响新连接。
- [ ] E. 收到第一个 FIN 后双方连接立刻完全消失。

**解释**：TCP 是双向通道，每个方向都要单独关闭。

## net-043

### Q1 single | HTTP/2 误区

启用 HTTP/2 后，下面哪个说法是误区？

- [ ] A. 小资源过度合并的收益下降。
- [x] B. 所有性能问题都会自动消失。
- [ ] C. 仍要优化资源体积。
- [ ] D. 仍要关注缓存策略。

**解释**：HTTP/2 优化连接层和传输方式，但不能替代资源治理、缓存和渲染优化。

### Q2 multiple | HTTP/3 前端实践

哪些判断正确？

- [x] A. HTTP/3 基于 QUIC 和 UDP。
- [x] B. HTTP/3 可以改善移动网络切换时的连接迁移体验。
- [x] C. 是否生效取决于浏览器、CDN、服务端和网络环境。
- [ ] D. HTTP/3 后就不需要 HTTPS。
- [ ] E. HTTP/3 会让首包时间永远为 0。

**解释**：HTTP/3 通常与 TLS 1.3 集成，部署链路复杂，不能假定所有用户都命中。

### Q3 multiple | 资源优化策略

在 HTTP/2/3 下，哪些前端优化仍然重要？

- [x] A. 关键 CSS 和关键 JS 体积控制。
- [x] B. 图片格式、尺寸和懒加载。
- [x] C. CDN 缓存和版本化资源。
- [x] D. 合理使用 preload/preconnect。
- [ ] E. 把所有代码都放进首屏 bundle。

**解释**：协议越现代，越要关注关键路径和资源优先级，而不是粗暴合并所有资源。

## net-044

### Q1 single | XSS 防御核心

防御 XSS 最基础的原则是什么？

- [ ] A. 信任所有用户输入。
- [x] B. 不可信内容进入 HTML、属性、URL、JS 等上下文前要按上下文转义或净化。
- [ ] C. 只使用 GET 请求。
- [ ] D. 禁用所有缓存。

**解释**：XSS 防御要按输出上下文处理，不同位置的转义规则不同。

### Q2 multiple | XSS 防御手段

哪些手段有助于降低 XSS 风险？

- [x] A. 模板默认转义。
- [x] B. 富文本使用可信白名单净化库。
- [x] C. CSP 限制脚本来源和内联执行。
- [x] D. Cookie 使用 HttpOnly 降低凭证被脚本读取风险。
- [ ] E. 把所有用户输入直接赋给 `innerHTML`。

**解释**：富文本不能简单全量转义，但必须使用白名单净化。`innerHTML` 是高风险入口。

### Q3 multiple | 危险 API

哪些前端 API 或场景需要特别警惕 XSS？

- [x] A. `innerHTML`。
- [x] B. `dangerouslySetInnerHTML`。
- [x] C. URL 中的 `javascript:` 协议。
- [x] D. 未校验的 `postMessage` 来源和内容。
- [ ] E. `textContent` 写入纯文本。

**解释**：纯文本写入相对安全；把不可信内容作为 HTML、脚本或 URL 执行才危险。

## net-045

### Q1 single | CSRF 与 XSS 区别

CSRF 和 XSS 的核心区别是什么？

- [x] A. CSRF 借用户身份发请求，XSS 在页面中执行攻击脚本。
- [ ] B. CSRF 只发生在服务端，XSS 只发生在数据库。
- [ ] C. 二者完全相同。
- [ ] D. XSS 只能通过 POST 触发。

**解释**：XSS 是脚本执行问题，CSRF 是跨站请求伪造问题；二者可组合放大风险。

### Q2 multiple | CSRF 高风险条件

哪些条件会增加 CSRF 风险？

- [x] A. 依赖 Cookie 自动认证。
- [x] B. 敏感操作缺少 CSRF Token 或 Origin 校验。
- [x] C. SameSite 设置过宽或需要跨站携带 Cookie。
- [ ] D. 所有接口都使用 HTTPS。
- [ ] E. 响应使用 JSON 就完全没有 CSRF 风险。

**解释**：HTTPS 保护传输，不验证请求意图。JSON 接口也可能被跨站请求触发，具体取决于请求方式和 CORS/Token 策略。

### Q3 multiple | CSRF 防御落地

哪些落地做法合理？

- [x] A. 对状态变更接口校验 CSRF Token。
- [x] B. 校验 Origin，必要时降级校验 Referer。
- [x] C. Cookie 设置合适 SameSite。
- [x] D. 高风险操作二次确认。
- [ ] E. 用 localStorage 保存所有密钥就能防 CSRF 且无 XSS 风险。

**解释**：防 CSRF 与凭证存储、XSS 防御要一起考虑。localStorage 可降低自动携带风险，但暴露于 XSS。

## net-046

### Q1 single | DNS 与 CDN 关系

CDN 常如何把用户调度到合适的边缘节点？

- [ ] A. 让浏览器随机选择 HTML 标签。
- [x] B. 通过 DNS 调度、Anycast 或全局负载均衡。
- [ ] C. 修改用户显示器刷新率。
- [ ] D. 禁止缓存。

**解释**：CDN 的入口调度会考虑用户网络、地理位置、节点健康和负载。

### Q2 multiple | DNS 解析与 CDN

哪些说法正确？

- [x] A. 域名可能先解析到 CNAME，再解析到 CDN 节点域名。
- [x] B. CDN 边缘命中缓存可减少回源。
- [x] C. DNS TTL 会影响节点切换和缓存时效。
- [x] D. CDN 节点故障时可通过调度切换流量。
- [ ] E. CDN 命中后浏览器不需要下载资源。

**解释**：CDN 命中减少的是源站访问，不代表资源不需要传输到浏览器。

### Q3 multiple | DNS/CDN 排查

页面资源加载慢时，哪些 CDN/DNS 指标值得看？

- [x] A. DNS 查询耗时。
- [x] B. CDN 命中率。
- [x] C. 回源耗时和回源错误。
- [x] D. 边缘节点地区和运营商匹配情况。
- [ ] E. React 组件 props 数量。

**解释**：资源慢不一定是代码问题，也可能是解析、调度、边缘缓存或回源链路问题。

## net-047

### Q1 single | 双向实时通信

需要浏览器和服务端高频双向通信，通常优先考虑什么？

- [ ] A. SSE。
- [x] B. WebSocket。
- [ ] C. 普通轮询。
- [ ] D. DNS。

**解释**：WebSocket 是全双工持久连接，更适合 IM、协作、游戏、行情等双向场景。

### Q2 multiple | 三种实时方案

哪些匹配合理？

- [x] A. WebSocket：双向、实时、连接管理复杂。
- [x] B. SSE：服务端到客户端单向事件流，适合通知和日志。
- [x] C. 长轮询：兼容性好，本质仍是请求响应。
- [x] D. 普通轮询：简单但延迟和空请求较多。
- [ ] E. SSE 原生支持浏览器向服务端在同一连接里发送消息。

**解释**：实时方案要按方向、频率、兼容性、代理支持和服务端容量选择。

### Q3 multiple | 场景选择

哪些场景选择更合适？

- [x] A. 在线客服聊天：WebSocket 常见。
- [x] B. 构建日志持续输出：SSE 合适。
- [x] C. 老系统轻量状态查询：长轮询可接受。
- [ ] D. 高频多人游戏：优先普通轮询每 10 秒一次。
- [ ] E. 单向系统通知必须使用 WebSocket。

**解释**：WebSocket 能做很多事，但单向低频推送用 SSE 可能更简单。

## net-048

### Q1 single | JWT 与普通 Token

JWT 相比普通不透明 token 的典型区别是什么？

- [x] A. JWT 自包含声明并带签名，不透明 token 通常需要服务端查存储。
- [ ] B. JWT 默认加密所有内容。
- [ ] C. 不透明 token 无法撤销。
- [ ] D. JWT 不能设置过期时间。

**解释**：JWT 可无状态验证，但撤销和敏感信息处理更要谨慎。

### Q2 multiple | Cookie/Session/Token 场景

哪些说法正确？

- [x] A. Session 适合服务端集中管理会话状态。
- [x] B. Cookie 自动携带，方便 Web 会话，但要处理 CSRF。
- [x] C. Bearer Token 适合 API 调用，但泄露后持有者即可使用。
- [x] D. JWT 适合跨服务传递可验证声明，但应短有效期。
- [ ] E. Cookie、Session、Token、JWT 是完全互斥，不能组合。

**解释**：实际系统常组合使用，例如 HttpOnly Cookie 保存 session 或 refresh token。

### Q3 multiple | 凭证安全

哪些做法更安全？

- [x] A. 短期 access token 搭配刷新机制。
- [x] B. HttpOnly + Secure + SameSite Cookie。
- [x] C. 服务端支持撤销、轮换或版本控制。
- [x] D. 权限变更后考虑让旧凭证失效。
- [ ] E. 永久 token 放在 localStorage 且不做过期。

**解释**：凭证安全要考虑泄露后的影响范围和失效能力。

## net-049

### Q1 single | UDP 场景

下列哪个场景更可能选择 UDP 或基于 UDP 的协议？

- [ ] A. 必须严格可靠有序的文件传输且不做应用层校验。
- [x] B. 实时音视频通话。
- [ ] C. 传统 HTTP/1.1 请求。
- [ ] D. 本地数组排序。

**解释**：实时音视频通常更关注低延迟，能容忍少量丢包或用应用层算法补偿。

### Q2 multiple | TCP/UDP 对比

哪些说法正确？

- [x] A. TCP 面向连接，提供可靠字节流。
- [x] B. UDP 无连接，头部更轻，不保证可靠和顺序。
- [x] C. QUIC 在 UDP 之上实现了连接、加密和可靠传输等能力。
- [ ] D. UDP 天然比 TCP 更可靠。
- [ ] E. TCP 不需要拥塞控制。

**解释**：UDP 简单不代表功能更强。QUIC 是在 UDP 上构建更完整传输能力。

### Q3 multiple | 前端相关影响

TCP/UDP 差异会如何影响前端体验？

- [x] A. TCP 丢包可能影响同连接上的 HTTP/2 stream。
- [x] B. HTTP/3/QUIC 可改善弱网和连接迁移体验。
- [x] C. WebRTC 常基于 UDP 相关能力实现实时媒体。
- [ ] D. 前端完全不需要理解传输层。
- [ ] E. UDP 一定能穿透所有网络环境。

**解释**：传输层会影响延迟、丢包、连接复用和弱网表现，前端性能排查也会遇到。

## net-050

### Q1 single | TTFB 定位

页面慢且 TTFB 很高，优先怀疑哪一段？

- [ ] A. CSS 动画太多。
- [x] B. DNS/连接/服务端处理/回源等首字节前链路。
- [ ] C. 图片懒加载太早。
- [ ] D. 客户端路由跳转动画。

**解释**：TTFB 覆盖请求开始到收到第一个字节，常和网络链路、服务器处理、CDN 回源有关。

### Q2 multiple | 分阶段定位

首屏慢时，哪些阶段要分别看？

- [x] A. DNS、TCP、TLS、TTFB。
- [x] B. HTML 下载和解析。
- [x] C. CSS/JS 阻塞资源加载。
- [x] D. JS 执行和主线程长任务。
- [x] E. LCP 资源加载和渲染。

**解释**：首屏是链路问题，不应只凭感觉优化某一个点。

### Q3 multiple | 工具和指标

哪些工具或指标有助于定位首屏慢？

- [x] A. DevTools Network 瀑布图。
- [x] B. Performance 面板。
- [x] C. Lighthouse/Web Vitals。
- [x] D. 服务端日志和 CDN 日志。
- [ ] E. 只看 bundle 文件名是否好看。

**解释**：前端、服务端和 CDN 数据结合，才能判断瓶颈到底在哪一段。

## net-051

### Q1 single | 幂等方法

下列哪个 HTTP 方法通常被设计为幂等？

- [x] A. PUT。
- [ ] B. POST。
- [ ] C. CONNECT。
- [ ] D. PATCH 永远幂等。

**解释**：PUT 通常表示用完整表示替换资源，多次执行最终效果一致。POST/PATCH 是否幂等取决于业务设计。

### Q2 multiple | HTTP 方法

哪些说法正确？

- [x] A. GET 获取资源。
- [x] B. POST 常用于创建资源或提交处理。
- [x] C. PUT 常用于整体替换资源。
- [x] D. PATCH 常用于部分更新资源。
- [x] E. DELETE 删除资源，通常应设计为幂等。

**解释**：方法语义能帮助缓存、重试、权限和接口设计保持一致。

### Q3 multiple | GET/POST 再辨析

哪些判断准确？

- [x] A. GET 安全、幂等，适合缓存。
- [x] B. POST 不应被默认当作安全或幂等。
- [x] C. 敏感参数不应放 URL。
- [ ] D. GET 绝对不能带查询参数。
- [ ] E. POST 自动防 CSRF。

**解释**：GET/POST 区别主要是语义、缓存、幂等和参数位置，而不是“谁更安全”。

## net-052

### Q1 single | frame-ancestors 防什么

`frame-ancestors` 主要防御哪类攻击？

- [ ] A. SQL 注入。
- [x] B. 点击劫持。
- [ ] C. DNS 污染。
- [ ] D. TCP 重传。

**解释**：`frame-ancestors` 限制页面能被哪些来源嵌入 iframe。

### Q2 multiple | 安全响应头

哪些响应头和安全相关？

- [x] A. `Content-Security-Policy`。
- [x] B. `Strict-Transport-Security`。
- [x] C. `X-Frame-Options`。
- [x] D. `Referrer-Policy`。
- [ ] E. `Content-Length`。

**解释**：Content-Length 描述响应体长度，不是主要安全策略头。

### Q3 multiple | 综合安全防护

哪些组合更完整？

- [x] A. CSP 降低 XSS 执行面。
- [x] B. HSTS 防降级。
- [x] C. frame-ancestors/X-Frame-Options 防点击劫持。
- [x] D. HttpOnly/SameSite/Secure 加强 Cookie。
- [ ] E. 只设置一个安全头即可覆盖所有攻击。

**解释**：前端安全是纵深防御。不同 header 对应不同威胁模型。

## net-053

### Q1 single | HTTP/1.1 Keep-Alive

HTTP/1.1 Keep-Alive 主要复用什么？

- [ ] A. React Fiber。
- [x] B. TCP 连接。
- [ ] C. DNS 根服务器。
- [ ] D. Service Worker Cache。

**解释**：Keep-Alive 减少重复建连，降低连接建立和 TLS 握手开销。

### Q2 multiple | HTTP/1.1 与 HTTP/2 复用

哪些说法正确？

- [x] A. HTTP/1.1 持久连接可复用连接，但并发能力有限。
- [x] B. HTTP/1.1 管线化实践中支持和使用都受限。
- [x] C. HTTP/2 使用 stream 在一个连接上多路复用。
- [x] D. HTTP/2 可减少同域名多连接需求。
- [ ] E. HTTP/1.1 Keep-Alive 等同于 HTTP/2 多路复用。

**解释**：连接复用和多路复用不是一回事。HTTP/2 可以在同一连接里交错传输多个请求响应。

### Q3 multiple | 连接配置问题

哪些配置或现象会影响连接复用？

- [x] A. 服务端 keep-alive timeout。
- [x] B. 代理和负载均衡超时。
- [x] C. 域名分片和跨域资源数量。
- [x] D. TLS 会话恢复。
- [ ] E. CSS 变量命名。

**解释**：连接复用跨浏览器、代理、CDN、源站多层配置，不只由前端代码决定。

## net-054

### Q1 single | Service Worker 运行位置

Service Worker 运行在哪里？

- [ ] A. 页面主线程里的普通 React 组件中。
- [x] B. 浏览器后台线程/上下文中，作为页面和网络之间的代理。
- [ ] C. 数据库内部。
- [ ] D. DNS 服务器上。

**解释**：Service Worker 可拦截 fetch、管理缓存、支持离线和推送等能力。

### Q2 multiple | 离线缓存策略

哪些策略常用于 Service Worker 缓存？

- [x] A. Cache First。
- [x] B. Network First。
- [x] C. Stale While Revalidate。
- [x] D. 预缓存应用壳资源。
- [ ] E. 每次请求都删除所有缓存。

**解释**：缓存策略要按资源类型选择，例如静态资源和 API 数据适合不同策略。

### Q3 multiple | Service Worker 注意事项

使用 Service Worker 时要注意什么？

- [x] A. 只能在 HTTPS 或 localhost 等安全上下文中使用。
- [x] B. 更新有生命周期，可能需要 skipWaiting/clientsClaim 策略。
- [x] C. 缓存版本和清理策略要设计好。
- [x] D. 离线页面和失败兜底要明确。
- [ ] E. 安装 Service Worker 后线上资源永远不会更新。

**解释**：Service Worker 很强，但缓存失控会造成旧资源、白屏和更新困难。

## net-055

### Q1 single | preconnect

`preconnect` 主要提前做什么？

- [ ] A. 下载完整 JavaScript 文件。
- [x] B. 提前建立到目标源的连接，包括 DNS、TCP、TLS 等。
- [ ] C. 预执行接口返回结果。
- [ ] D. 清空浏览器缓存。

**解释**：preconnect 适合很快会访问的关键第三方源，但滥用会占用连接资源。

### Q2 multiple | preload/prefetch/preconnect

哪些说法正确？

- [x] A. `preload` 用于当前页面很快需要的关键资源。
- [x] B. `prefetch` 通常用于未来导航可能需要的低优先级资源。
- [x] C. `preconnect` 提前建立连接但不下载具体资源。
- [x] D. `dns-prefetch` 只提前做 DNS 解析。
- [ ] E. 所有资源都应该 preload。

**解释**：资源提示是优先级工具，滥用会抢占带宽和连接，反而拖慢关键资源。

### Q3 multiple | 使用风险

哪些是资源提示的常见风险？

- [x] A. preload 了最终没用的资源，浪费带宽。
- [x] B. as 类型写错导致重复下载或优先级错误。
- [x] C. 跨域字体 preload 缺少 crossorigin 可能重复请求。
- [x] D. preconnect 太多占用连接预算。
- [ ] E. prefetch 一定会阻塞当前页面渲染。

**解释**：资源提示要服务关键路径，必须结合真实瀑布图和命中率验证。

## net-056

### Q1 single | 断点续传

HTTP 断点续传主要依赖哪个请求头？

- [ ] A. `Origin`。
- [x] B. `Range`。
- [ ] C. `Content-Security-Policy`。
- [ ] D. `Set-Cookie`。

**解释**：客户端通过 Range 请求指定字节范围，服务端返回 206 Partial Content。

### Q2 multiple | 大文件下载

哪些说法正确？

- [x] A. `Accept-Ranges: bytes` 表示服务端支持按字节范围请求。
- [x] B. `206 Partial Content` 表示返回部分内容。
- [x] C. `Content-Range` 描述返回的字节范围和总大小。
- [ ] D. 断点续传必须使用 WebSocket。
- [ ] E. Range 请求一定不能被 CDN 支持。

**解释**：Range 是 HTTP 原生能力，CDN 和服务端是否支持取决于配置和资源类型。

### Q3 multiple | 大文件上传/下载注意

实现大文件传输时，哪些点重要？

- [x] A. 分片大小选择。
- [x] B. 校验 hash 或 ETag，避免拼接错误。
- [x] C. 失败重试和断点记录。
- [x] D. 并发数控制。
- [ ] E. 分片越小越好，没有任何额外开销。

**解释**：分片会带来请求数、元数据和合并成本。大小和并发要按网络和服务端能力平衡。

## net-057

### Q1 single | JSONP 限制

除了 CORS，JSONP 的最大限制之一是什么？

- [x] A. 只能 GET，且会执行远程脚本。
- [ ] B. 只能 POST。
- [ ] C. 只能同源使用。
- [ ] D. 自动支持所有自定义 header。

**解释**：JSONP 利用 script 跨域加载脚本，不适合现代通用 API。

### Q2 multiple | 非 CORS 跨域方案

哪些方案在特定场景下可用于跨域？

- [x] A. 反向代理。
- [x] B. JSONP。
- [x] C. `postMessage`。
- [x] D. WebSocket 服务端允许跨源并自行鉴权。
- [ ] E. 线上要求用户启动浏览器禁用安全策略。

**解释**：不同跨域问题有不同解法：数据 API、窗口通信、开发代理、实时连接都不一样。

### Q3 multiple | postMessage 安全

使用 `postMessage` 时，哪些做法正确？

- [x] A. 指定明确的 targetOrigin，避免使用 `*` 发送敏感数据。
- [x] B. 接收方校验 `event.origin`。
- [x] C. 校验消息结构和业务类型。
- [ ] D. 收到任何来源消息都直接执行其中的代码。
- [ ] E. postMessage 可以绕过所有鉴权。

**解释**：postMessage 是跨窗口通信能力，不是信任机制。来源和内容都要校验。

## net-058

### Q1 single | 队头阻塞

HTTP 队头阻塞指的是什么？

- [ ] A. CSS 文件排在 HTML 前面。
- [x] B. 前面的请求或数据包阻塞了后续请求或流的处理。
- [ ] C. 用户滚动太快。
- [ ] D. Cookie 数量太少。

**解释**：队头阻塞有应用层和传输层不同表现，HTTP/1.1、HTTP/2、HTTP/3 处理方式不同。

### Q2 multiple | 各版本 HOL

哪些说法正确？

- [x] A. HTTP/1.1 同连接请求响应顺序可能造成应用层队头阻塞。
- [x] B. HTTP/2 多路复用缓解了应用层队头阻塞。
- [x] C. HTTP/2 基于 TCP 时仍受 TCP 丢包造成的传输层队头阻塞影响。
- [x] D. HTTP/3/QUIC 在传输层用独立 stream 缓解丢包对其他流的阻塞。
- [ ] E. HTTP/3 完全不会遇到任何网络延迟。

**解释**：HTTP/3 改善的是传输层 stream 阻塞，不是消灭网络物理延迟和所有拥塞。

### Q3 multiple | 前端影响

理解队头阻塞对前端有什么帮助？

- [x] A. 判断资源合并与拆分策略。
- [x] B. 理解同域连接和协议版本对瀑布图的影响。
- [x] C. 分析弱网丢包下 HTTP/2 和 HTTP/3 表现差异。
- [ ] D. 证明所有图片都应该内联进 HTML。
- [ ] E. 让 JavaScript 不再需要加载。

**解释**：协议特性会影响资源组织和性能排查，但不能替代资源体积和关键路径优化。

## net-059

### Q1 single | Content-Type

`Content-Type` 头主要表示什么？

- [x] A. 请求体或响应体的媒体类型。
- [ ] B. 连接保持时间。
- [ ] C. DNS TTL。
- [ ] D. 是否允许被 iframe 嵌入。

**解释**：Content-Type 告诉接收方如何解析 body，例如 JSON、HTML、表单或图片。

### Q2 multiple | 请求头作用

哪些请求头作用匹配？

- [x] A. `Accept`：声明客户端可接受的响应类型。
- [x] B. `Accept-Encoding`：声明支持的压缩算法。
- [x] C. `Origin`：跨域和安全校验中表示请求来源。
- [x] D. `Referer`：表示来源页面 URL。
- [ ] E. `ETag`：客户端声明登录用户名。

**解释**：ETag 是资源版本标识，常用于缓存验证，不是用户身份字段。

### Q3 multiple | 响应头作用

哪些响应头作用匹配？

- [x] A. `Set-Cookie`：要求浏览器保存 Cookie。
- [x] B. `Location`：配合重定向或创建资源位置。
- [x] C. `Content-Encoding`：响应体压缩方式。
- [x] D. `Vary`：告诉缓存哪些请求头会影响响应选择。
- [ ] E. `Authorization`：服务端设置浏览器 Cookie。

**解释**：Authorization 通常是请求头；Set-Cookie 才是响应里设置 Cookie 的方式。

## net-060

### Q1 single | 首屏网络优化核心

前端网络性能优化的核心目标之一是什么？

- [ ] A. 增加所有资源体积。
- [x] B. 减少关键路径上的请求数、体积、等待和阻塞。
- [ ] C. 禁用所有缓存。
- [ ] D. 所有资源都放到一个同步脚本里。

**解释**：首屏优化要让关键资源更少、更小、更早、更快到达并被浏览器使用。

### Q2 multiple | 网络优化手段

哪些属于常见网络性能优化？

- [x] A. CDN 和合理缓存策略。
- [x] B. 压缩传输，例如 Brotli/Gzip。
- [x] C. 图片按需尺寸、现代格式和懒加载。
- [x] D. 代码分割和减少首屏 JS。
- [x] E. preload/preconnect 用于关键资源和关键源。

**解释**：网络优化涵盖传输、缓存、资源体积、关键路径和协议能力。

### Q3 multiple | 系统化优化

系统性优化首屏时，哪些做法正确？

- [x] A. 先用指标和瀑布图定位瓶颈。
- [x] B. 区分 HTML、CSS、JS、图片、字体、接口等资源类型。
- [x] C. 根据 LCP 元素优化关键资源优先级。
- [x] D. 监控真实用户数据，避免只看本地环境。
- [ ] E. 不做测量，直接随机删除资源。

**解释**：性能优化要以数据驱动。不同瓶颈需要不同方案，不能只靠单点技巧。
