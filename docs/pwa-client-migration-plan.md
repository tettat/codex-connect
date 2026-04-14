# Codex Connect PWA 客户端迁移方案

## 1. 范围约束

这份文档按下面的前提来分析：

- PWA 的目标不是替代整个项目，只替代当前 `android-native/` 客户端
- 用户会使用 GitHub，能自己 clone 仓库
- 用户不需要部署 broker，统一复用你的远程 broker
- 用户本地只需要启动主服务 `server.mjs`
- PWA 是“远程客户端”，主服务和 broker 继续保留现有角色

这个约束非常关键。它意味着我们不需要把当前本地网页聊天页改造成全平台总入口，也不需要先重写主服务。

## 2. 当前架构快照

当前项目已经天然分成三层：

1. 主服务：`server.mjs`
   - 跑在用户自己的电脑上
   - 负责调用本地 `codex`
   - 负责文件、工作区、Git、上下文、聊天流式 RPC
   - 主动连接远程 broker

2. 远程 broker：`service-a-broker.mjs`
   - 负责配对、设备恢复、RPC 转发、OpenAI 兼容入口
   - 现在已经支持客户端通过 WebSocket 走 `pair_client` / `resume_client` / `rpc`

3. Android 客户端：`android-native/app/src/main/java/com/shift/codexlan/MainActivity.kt`
   - 通过 WebSocket 直连 broker
   - 保存设备凭证
   - 调用 broker RPC 间接控制远程主服务

所以从技术上看，PWA 最合理的定位是：

- 复刻 Android 客户端的 broker WebSocket 客户端能力
- 不直接依赖本地 HTTP 页面
- 也不要求用户自己部署 broker

## 3. 直接结论

### 3.1 能不能做

能做，而且方向是对的。

原因很直接：

- broker 已经支持通用 WebSocket RPC 转发
- Android 客户端已经证明这套协议可用
- 大部分能力都不是 Android 独占，而是 broker 协议能力
- PWA 只要复刻 Android 客户端的网络层和状态层，就能接上现有系统

### 3.2 是不是大改

是中到大型改动，但不是“整个项目推倒重来”。

真正需要迁移的是客户端层：

- 配对和设备恢复
- 会话与项目状态管理
- 文件浏览、下载、上传、中转
- 工作区和 YOLO 设置
- 上下文目录、技能、凭据
- Git 与 worktree 的远程操作
- 聊天流式渲染

不需要大改的部分：

- `server.mjs` 的主体业务能力
- broker 的 RPC 中转模型
- 现有远程主服务部署方式

### 3.3 安卓端要不要一起重构

不需要一开始就重构安卓端。

更合理的策略是：

- 先做 PWA 客户端
- 安卓端继续可用，作为已上线参考实现
- 等 PWA 跑通后，再决定安卓端是继续保留原生能力，还是转成更薄的壳

## 4. 当前可复用能力

PWA 迁移并不是从零开始，下面这些能力已经在后端存在：

### 4.1 Broker 侧

`service-a-broker.mjs` 已支持：

- 连接码配对
- 受信设备恢复
- 客户端到主服务的通用 `rpc`
- 服务端回传 `rpc_result` / `rpc_stream` / `rpc_end`

这意味着浏览器客户端不需要自己发明新协议，可以复用 Android 现在的消息模型。

### 4.2 主服务侧

`server.mjs` 已支持这些 RPC 能力：

- `config.get`
- `context.catalog`
- `context.root.set`
- `context.bundle.create`
- `fs.list`
- `fs.roots`
- `fs.download`
- `fs.upload`
- `fs.mkdir`
- `fs.transfer`
- `chat.stream`
- `chat.sync`
- `git.inspect`
- `git.branches`
- `git.log`
- `git.repo.init`
- `git.github.status`
- `git.github.create`
- `git.github.bind`
- `git.worktree.create`
- `git.worktree.remove`
- `git.push`
- `git.pr.create`
- `git.pr.merge`
- `git.operation.prepare_merge`
- `git.operation.prepare_rebase`
- `git.operation.finalize_merge`

换句话说，PWA 需要做的主要是客户端编排，不是后端能力补齐。

## 5. 当前 Android 客户端的功能边界

从 `MainActivity.kt` 看，当前 Android 客户端已经包含这些模块：

### 5.1 配对与设备中心

- 输入 6 位连接码配对
- 保存多台设备凭证
- 重连当前设备
- 切换设备
- 删除已保存设备

### 5.2 会话中心

- 查看项目内会话列表
- 新建会话
- 切换会话
- 删除会话

### 5.3 对话与上下文

- 发送流式聊天
- 保存 thread
- 绑定上下文引用
- 展示消息历史

### 5.4 文件管理

- 浏览目录
- 下载文件
- 上传文件
- 中转下载链接
- 创建设备目录

### 5.5 工作区配置

- 选择工作目录
- 切换 YOLO
- 任务提醒开关

### 5.6 上下文与凭据

- 获取上下文目录
- 设置凭据根目录
- 创建凭据 bundle
- 绑定技能 / credential 到项目

### 5.7 Git / GitHub / Worktree

- Git inspect / branches / log
- init repo
- gh auth status
- create / bind GitHub repo
- 创建 / 删除 worktree
- push / PR / merge
- prepare merge / rebase / finalize merge

所以如果 PWA 要“复刻 Android 客户端”，真实工作量不小，但边界是清楚的。

## 6. 推荐架构

最稳的做法不是把 PWA 挂在本地 `server.mjs` 上，而是拆成两部分：

### 6.1 本地启动器

作用：

- 用户 clone 仓库后，在本机启动 `server.mjs`
- 注入你的 broker 地址
- 指定本地工作目录
- 启动完成后给出“去手机打开 PWA”的明确引导

这部分是 Host 端工具，不是 PWA。

### 6.2 独立 PWA 客户端

作用：

- 运行在手机浏览器或安装后的 PWA 中
- 通过 WebSocket 直接连接你的 broker
- 完整复刻 Android 客户端体验

这部分才是 Android 客户端的 Web 版替身。

## 7. 为什么 PWA 最好独立部署

这是这次分析里最关键的一个结论。

如果 PWA 要真正在安卓手机上稳定安装和使用，最好不要依赖用户本机的 `http://局域网IP:4317` 页面。

原因有三个：

1. PWA 对安全上下文有要求
   - 真正稳定的安装、缓存、Service Worker，最好跑在 HTTPS

2. 你的 broker 是统一远程服务
   - PWA 直接连接你的 broker 更自然
   - 用户不需要让手机直接访问电脑上的本地网页

3. 客户端和主服务职责分离更清楚
   - 本地机器负责运行 Codex
   - 远程 PWA 负责控制和显示

推荐形态：

- PWA 静态资源部署在 GitHub Pages / Vercel / 你的服务器 HTTPS 域名
- PWA 通过 `wss://` 连接你的 broker
- 用户电脑只负责跑本地主服务并接入 broker

## 8. 现阶段必须补的基础条件

虽然 broker 协议已经够用了，但要支撑 PWA，还需要补几项基础设施。

### 8.1 `wss://` 和 `https://`

如果 PWA 是 HTTPS 页面，而 broker 仍然只有 `ws://`，浏览器会卡在 mixed content。

所以至少要有：

- broker 的 HTTPS 入口
- broker 的 WSS 入口

这通常意味着：

- 给 `101.42.41.204` 挂域名
- 用 Nginx / Caddy 做 TLS 终止
- WebSocket 反代到 `service-a-broker.mjs`

### 8.2 broker 鉴权

现在 broker 公开接口没开鉴权，不适合作为长期公网 PWA 后端。

PWA 上线前建议至少补：

- `BROKER_OPENAI_API_TOKEN`
- broker WebSocket 客户端鉴权策略
- Origin / rate limit / abuse 控制

### 8.3 浏览器端持久化

Android 现在是本地保存设备凭证。PWA 也需要等价能力：

- 保存 `installation_id`
- 保存 `device_id`
- 保存 `device_token`
- 保存当前设备 / 项目 / 会话状态

建议：

- 凭证和设备状态放 `IndexedDB`
- 轻量 UI 状态可放 `localStorage`

## 9. PWA 的分阶段迁移路线

### Phase 1：做最小可用 Web 客户端

目标：

- 先能替代 Android 的“配对 + 会话 + 基础聊天”

范围：

- Broker WebSocket 连接
- `pair_client`
- `resume_client`
- 设备凭证持久化
- 会话列表
- `chat.stream`
- 基础消息流渲染
- 工作区选择
- YOLO 切换

这是第一阶段最值的切入点。

原因：

- 直接覆盖最核心场景
- 后端几乎不用改协议
- 可以很快验证 PWA 交互是否成立

### Phase 2：补文件与设备管理

目标：

- 让 PWA 在手机上具备安卓客户端的基础运维能力

范围：

- `fs.roots`
- `fs.list`
- `fs.download`
- `fs.upload`
- `fs.mkdir`
- `fs.transfer`
- 设备列表切换
- 连接状态和日志

说明：

- 这一步会自然带上图片文件上传、图片下载、图片预览
- 但它仍然只是“文件能力”
- 不等于“聊天中发送图片给 Codex”

### Phase 3：补上下文与项目能力

范围：

- `context.catalog`
- `context.root.set`
- `context.bundle.create`
- 项目级上下文绑定
- 默认模型 / 默认工作区 / 默认指令

这一步完成后，PWA 才接近 Android 的“项目化管理”体验。

### Phase 4：补 Git 基础能力

范围：

- `git.inspect`
- `git.branches`
- `git.log`
- `git.repo.init`
- `git.github.status`
- `git.github.bind`

建议先做“看状态”和“轻操作”，不要一上来就把所有 Git 弹窗搬过来。

### Phase 5：补高级 Git / Worktree / PR

范围：

- `git.github.create`
- `git.worktree.create`
- `git.worktree.remove`
- `git.push`
- `git.pr.create`
- `git.pr.merge`
- `git.operation.prepare_merge`
- `git.operation.prepare_rebase`
- `git.operation.finalize_merge`

这一层是明显的 power-user 能力，复杂度最高，应该最后做。

## 10. 图片支持应该怎么理解

如果这次 PWA 只复刻 Android 客户端，那么图片能力建议拆成两件事：

### 10.1 第一优先级：文件层面的图片支持

这部分属于 Android 已有能力，应该进入 PWA：

- 从手机选图片上传到远程设备
- 下载远程图片到手机
- 打开图片预览
- 生成中转链接分享图片

这本质上是 `fs.upload` / `fs.download` / `fs.transfer` 的 UI 问题。

### 10.2 第二优先级：聊天里的图片输入

这不是当前 Android 客户端的标准能力，不应该混在第一轮 PWA 迁移里。

因为它需要新增一整条聊天附件链路：

- 浏览器选图
- 客户端编码与上传策略
- `chat.stream` 请求结构扩展，或改走 `responses` 风格
- 聊天消息附件展示

所以建议：

- 第一轮 PWA 不做聊天图片输入
- 先把“文件图片支持”做好
- 后续单独立项做“多模态聊天”

## 11. UI / UX 方向

既然 PWA 是安卓客户端的 Web 复刻，UI 目标不该是“桌面网页翻版”，而应该是：

- 更像一套移动端控制台
- 信息密度高，但组织紧
- 把“设备 / 项目 / 会话 / 文件”分层清楚

推荐视觉方向：

- 风格关键词：field console / relay deck / calm ops
- 主色：深松绿、石灰白、沙色底、少量琥珀强调
- 字体策略：标题偏有辨识度，正文偏高可读、窄而稳
- 动效：只做状态切换、连接反馈、流式消息增量，不做花哨动画

推荐信息架构：

1. 设备
   - 配对、重连、设备切换、连接日志

2. 会话
   - 项目、会话列表、聊天流

3. 文件
   - 文件根目录、上传下载、中转分享

4. 工作区
   - 目录、YOLO、提醒、上下文

5. 高级
   - Git、worktree、PR、凭据中心

这个结构和现在 Android 的四个 tab 是一致的，但需要更紧凑的移动端导航。

## 12. 建议的实现顺序

按收益和风险排序，我建议这样做：

1. 先做“本地启动器”
   - 目标：让用户 clone 后能快速把主服务接到你的 broker

2. 再做“最小可用 PWA”
   - 目标：替代 Android 的配对、重连、会话、聊天

3. 然后补“文件与工作区”
   - 目标：形成真实可用的移动客户端

4. 再做“上下文与项目”
   - 目标：接近现在 Android 的项目化体验

5. 最后再上“高级 Git / worktree / PR”
   - 目标：覆盖 power-user 场景

这个顺序的核心是：

- 先打通真实使用链路
- 不先掉进高级 Git UI 泥潭
- 不把“图片聊天”混进第一阶段

## 13. 对代码结构的建议

如果真的做 PWA，建议不要继续把 Web 客户端堆成当前这种单文件形态。

当前现状：

- `public/app.js` 很轻，适合本地 demo
- `public/connect.js` 很轻，适合工具页
- Android 客户端集中在一个 5000+ 行的 `MainActivity.kt`

PWA 如果继续单文件扩展，后期会很快难以维护。

建议新建独立 Web 客户端结构，至少拆成：

- `broker-client`
- `device-store`
- `session-store`
- `file-store`
- `git-store`
- `views`
- `design-tokens`

即便不立刻上大型前端框架，也应该做模块化。

## 14. 最终建议

接下来不要直接“做 PWA 全量复刻”，而要先定一个更稳的北极星：

### 北极星版本

- 用户 clone 仓库
- 本地执行一个启动脚本
- 启动脚本把主服务接入你的 broker
- 手机打开一个独立 HTTPS PWA
- 输入连接码配对
- 在手机上完成会话、聊天、文件和工作区操作

这条链路一旦跑通，项目就已经从“实验性 Android 客户端”升级成“可分享的远程 Codex 客户端系统”。

## 15. 下一步建议

建议下一步直接进入设计和拆任务，而不是继续空谈：

1. 先定义 PWA Phase 1 的页面和状态模型
2. 再定义本地启动脚本的参数协议
3. 最后再决定 PWA 是用当前静态页面体系扩展，还是单独建一个 Web 客户端目录

如果继续，我建议下一个动作是：

- 我来把 Phase 1 的 PWA 信息架构、页面清单、状态流和 API/RPC 对照表继续落成第二份文档

