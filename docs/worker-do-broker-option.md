# Worker + Durable Objects 无服务 Broker 方案

## 1. 目标

这份方案的前提是：

- 保留现有 `service-a-broker.mjs`，不删除，不替代
- 新增一个 Cloudflare 版本 broker，作为并行可选项
- 后续电脑端允许双开两份 `server.mjs`
- 不要求现在就改掉你正在运行的本地服务
- PWA 未来部署在 Cloudflare 上，也直接连接这个 Cloudflare broker

这不是“把现有 Node broker 搬过去”，而是：

- 保持现有协议兼容
- 用 `Worker + Durable Objects` 重做一个无服务 broker 选项

## 2. 当前代码的兼容点

现在本地主服务接入 broker 的关键点很简单：

- `PAIR_BROKER_URL` 决定连接哪个 broker  
  见 [server.mjs](/Users/waht/Code/codex-connect/server.mjs:34)
- `PairServerAgent` 启动后会主动通过 WebSocket 连 broker  
  见 [server.mjs](/Users/waht/Code/codex-connect/server.mjs:2799)
- 它发送和接收的消息协议已经固定：
  - `register_server`
  - `create_code`
  - `pair_request`
  - `pair_accept`
  - `auth_request`
  - `auth_result`
  - `rpc`
  - `rpc_result`
  - `rpc_stream`
  - `rpc_end`  
  见 [server.mjs](/Users/waht/Code/codex-connect/server.mjs:2837) 和 [server.mjs](/Users/waht/Code/codex-connect/server.mjs:3214)

现有 Node broker 也是围绕这套消息协议工作的：

- WebSocket 消息分发  
  见 [service-a-broker.mjs](/Users/waht/Code/codex-connect/service-a-broker.mjs:127)
- 客户端 RPC 转发到服务端  
  见 [service-a-broker.mjs](/Users/waht/Code/codex-connect/service-a-broker.mjs:373)
- OpenAI 兼容 HTTP 路由也是基于 RPC 封装  
  见 [service-a-broker.mjs](/Users/waht/Code/codex-connect/service-a-broker.mjs:636)

所以 Cloudflare 方案最重要的设计原则只有一个：

- **尽量保留现有消息协议不变**

这样后续本地 `server.mjs` 可以不改协议，只改 `PAIR_BROKER_URL`。

## 3. 为什么要用 Durable Objects

你这个 broker 不是简单的请求转发器，而是有明显“会话态”的：

- 有注册中的 server
- 有 installation 维度的设备
- 有配对码 TTL
- 有客户端与服务端的 link
- 有 pending rpc
- 有 OpenAI HTTP 请求与 WebSocket RPC 的桥接

这类状态不适合只用普通 Worker 内存做，因为 Worker 是无状态入口。

更适合的做法是：

- Worker：做 HTTP/WS 入口、鉴权、路由
- Durable Object：做安装实例级状态和全局目录状态

Cloudflare 的官方能力也正好支持这类实时协调场景：

- Durable Objects 适合带状态的协调服务
- Durable Objects 支持 WebSocket
- Durable Objects 支持 WebSocket hibernation

参考：

- https://developers.cloudflare.com/durable-objects/
- https://developers.cloudflare.com/durable-objects/best-practices/websockets/

## 4. 推荐架构

推荐拆成三层：

### 4.1 Edge Worker

职责：

- 暴露固定公网入口
- 处理 `GET /health`
- 处理 `GET /ws` 的 WebSocket Upgrade
- 处理 `GET /v1/models`
- 处理 `POST /v1/chat/completions`
- 处理 `POST /v1/responses`
- 校验可选鉴权
- 将请求路由到对应 Durable Object

它不保存业务态，只做入口和路由。

### 4.2 Directory DO

一个全局目录对象，负责：

- `installation_id -> Installation DO`
- 配对码 `code -> installation_id`
- 配对码 TTL
- 活跃 installation 元数据
- 可能的客户端选择逻辑

建议它使用 Durable Object 自带存储保存：

- code
- expires_at
- installation_id
- created_at

这样即使 DO 被休眠，配对码索引也不会丢。

### 4.3 Installation DO

每个 `installation_id` 对应一个对象，负责：

- 当前服务端 WebSocket
- 已认证客户端列表
- client -> device link
- client -> pending rpc
- 服务端重连时替换旧连接
- 转发 `rpc` / `rpc_result` / `rpc_stream` / `rpc_end`
- 可选承接 HTTP OpenAI 请求桥接

它是现有 Node broker 里这些内存结构的 DO 版本：

- `serversByInstallationId`
- `linksByClientId`
- `pendingHttpRpc`

## 5. 路由设计

推荐先做一份与现有 Node broker 尽量一致的外部接口：

### 5.1 WebSocket

- `GET /ws`

同一个入口既接服务端，也接客户端。

接入后仍然由第一条业务消息区分角色：

- 服务端发 `register_server`
- 客户端发 `pair_client` 或 `resume_client`

这样你本地 `server.mjs` 的 `PAIR_BROKER_URL` 可以直接指向：

```text
wss://your-relay.your-account.workers.dev/ws
```

### 5.2 HTTP

- `GET /health`
- `GET /v1/models`
- `POST /v1/chat/completions`
- `POST /v1/responses`

这部分不是 PWA 的硬前置条件，但为了兼容你现有 broker 用法，建议保留。

## 6. 数据模型建议

### 6.1 Directory DO 存储

建议存：

- `installation:{id}`
  - `installation_id`
  - `server_name`
  - `last_seen_at`
  - `status`
- `code:{code}`
  - `installation_id`
  - `expires_at`
  - `created_at`

### 6.2 Installation DO 内存态

建议存：

- 当前 server WebSocket
- `server_id`
- `installation_id`
- `server_name`
- `clients`
- `linksByClientId`
- `pendingHttpRpc`

其中：

- 短生命周期的连接态放内存
- 需要跨休眠恢复的轻量索引放 DO storage

## 7. 协议兼容策略

为了后续实现快，Cloudflare 版本 broker 最好兼容现有消息协议。

### 服务端消息

- `register_server`
- `create_code`
- `pair_accept`
- `auth_result`
- `rpc_result`
- `rpc_stream`
- `rpc_end`

### 客户端消息

- `pair_client`
- `resume_client`
- `rpc`

### broker 回包

- `hello`
- `server_registered`
- `code_created`
- `pair_request`
- `authenticated`
- `paired`
- `auth_request`
- `server_unavailable`
- `error`

这样有两个直接好处：

1. 现有 `server.mjs` 可以直接指向新 broker
2. 未来 PWA 可以复用 Android 的消息模型

## 8. Cloudflare 域名怎么用

你说“用 CF 给的域名即可”，这个方向是成立的。

推荐两个域名：

- broker：`<worker-subdomain>.workers.dev`
- PWA：`<project>.pages.dev`

它们都是稳定的，不是 `trycloudflare.com` 那种临时地址。

因此后续可以是：

- Cloudflare broker：`wss://relay-example.your-subdomain.workers.dev/ws`
- Cloudflare PWA：`https://codex-connect-pwa.pages.dev`

这条链路能长期用。

注意：

- `workers.dev` / `pages.dev` 作为技术选项没问题
- 真到正式面向外部用户时，还是建议后续换自定义域名

参考：

- https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
- https://developers.cloudflare.com/pages/configuration/custom-domains/

## 9. 为什么不把它做成“假 tunnel”

你提的“转发一下假装 tunnel”，从架构上能做，但不建议作为目标定义。

原因是：

- tunnel 是通用网络通路
- 你的 broker 是应用协议中枢
- 你需要的是配对、身份恢复、RPC、多客户端协调
- 这些正是 broker 该做的，不是 tunnel 该做的

如果强行按 tunnel 设计，最后还是会重新做出一套应用层 broker。

所以正确定位应该是：

- **Cloudflare 版本的应用专用 broker**

不是：

- “假装 tunnel 的 Worker”

## 10. 与现有 Node broker 并行的方式

你要求“原来的不要删”，这个完全可行。

### 模式 A：现有 Node broker

- 继续运行在你的服务器上
- 现有电脑端继续连它
- 现有 Android 或本地网页也继续用它

### 模式 B：Cloudflare Worker broker

- 独立部署
- 单独给未来 PWA 使用
- 也可以让第二份本地 `server.mjs` 连接它

这两条链路可以长期并行。

## 11. 电脑端如何双开

当前一份 `server.mjs` 只能连一个 `PAIR_BROKER_URL`，因为它只创建一个 `PairServerAgent`。

所以如果你后续想双开，正确方式是：

- 保持现有本地服务不动
- 再启动第二份 `server.mjs`
- 第二份用不同端口、不同状态文件、不同 broker URL

至少建议分开这些环境变量：

- `PORT`
- `PAIR_BROKER_URL`
- `PAIR_SERVER_NAME`
- `TRUST_STORE_PATH`
- `CHAT_TASK_STORE_PATH`
- `DEVICE_SETTINGS_PATH`

如果不分开，两个实例会争用本地状态文件。

### 示例

现有实例：

```env
PORT=4317
PAIR_BROKER_URL=ws://your-vps-broker:8000/ws
TRUST_STORE_PATH=~/.codex/codexapi-broker-state.json
CHAT_TASK_STORE_PATH=~/.codex/codexapi-chat-tasks.json
DEVICE_SETTINGS_PATH=~/.codex/codexapi-device-settings.json
```

Cloudflare 实例：

```env
PORT=4417
PAIR_BROKER_URL=wss://relay-example.your-subdomain.workers.dev/ws
PAIR_SERVER_NAME=MacBookAir-CF
TRUST_STORE_PATH=~/.codex/codexapi-broker-state-cf.json
CHAT_TASK_STORE_PATH=~/.codex/codexapi-chat-tasks-cf.json
DEVICE_SETTINGS_PATH=~/.codex/codexapi-device-settings-cf.json
```

这样不会碰掉你现在正在使用的链路。

## 12. OpenAI 兼容入口怎么做

Cloudflare 版本 broker 建议也保留 OpenAI 兼容入口，但放在第二阶段。

### 第一阶段先做

- `/health`
- `/ws`
- 配对
- 重连
- `rpc`
- `chat.stream`

### 第二阶段再做

- `/v1/models`
- `/v1/chat/completions`
- `/v1/responses`

原因：

- PWA 核心先靠 WebSocket broker 跑起来
- HTTP OpenAI 兼容入口不是 PWA 的第一阻塞点
- 先做它会拖慢落地

## 13. 实现分期

### Phase 0：保留现有系统

- 不动现在的 VPS broker
- 不动现在的本地服务
- 不重启现有链路

### Phase 1：实现 Cloudflare broker 最小闭环

范围：

- Worker 入口
- Directory DO
- Installation DO
- `/health`
- `/ws`
- `register_server`
- `create_code`
- `pair_client`
- `resume_client`
- `pair_accept`
- `auth_result`
- `rpc`
- `rpc_result`
- `rpc_stream`
- `rpc_end`

这个阶段完成后：

- 第二份 `server.mjs` 就能连 Cloudflare broker
- PWA 也能开始开发和联调

### Phase 2：实现 PWA 最小客户端

范围：

- 配对
- 恢复设备
- 会话
- `chat.stream`
- 工作区选择
- YOLO

### Phase 3：补文件、上下文、Git

范围：

- 文件
- 上下文
- 凭据
- Git 基础能力

### Phase 4：补 HTTP OpenAI 兼容层

范围：

- `/v1/models`
- `/v1/chat/completions`
- `/v1/responses`

## 14. 成本与风险

### 优点

- 不依赖自建常驻 broker 进程
- 天然 HTTPS / WSS
- PWA 部署方便
- 与 Cloudflare Pages 组合自然

### 风险

- 需要重写 broker，不是简单搬运
- 流式 `rpc_stream` 频率高时需要注意 Worker/DO 消息成本
- 需要认真设计 DO 的对象粒度
- 如果把所有 installation 都塞进一个 DO，会形成热点

因此推荐的对象粒度是：

- 一个全局 Directory DO
- 每个 installation 一个 Installation DO

## 15. 我对这个方案的判断

这个方案是成立的，而且很适合你想要的“无服务化作为另一个选项”。

我不建议现在就删掉原来的 Node broker。正确做法是：

- 先并行新增 Cloudflare broker
- 用第二份本地 `server.mjs` 去接它
- 用未来 PWA 去接它
- 跑稳定后，再决定要不要弱化旧链路

## 16. 下一步建议

如果后面你让我实现，这个顺序最稳：

1. 先搭 `Worker + Directory DO + Installation DO` 的最小兼容 broker
2. 先只实现 `/health` 和 `/ws`
3. 让第二份 `server.mjs` 能成功注册、拿连接码、完成配对
4. 再做 PWA
5. 最后再补 OpenAI HTTP 兼容入口

这条路线不会影响你当前正在使用的本地服务。

