# Cloudflare PWA 启动与连接

这份文档不是写给“第一次接触 Git 的普通用户”的。

它是写给两类人一起配合用的：

- `Coding Agent`：负责在电脑上把项目启动起来
- `用户`：负责拿手机扫码、安装 PWA、完成配对

核心思路只有一条：

1. `Coding Agent` 在电脑上启动项目
2. 电脑自动打开“启动配对页”
3. 用户用手机扫二维码进入 PWA
4. 用户安装到桌面并输入连接码
5. 进入 `Chats` 开始使用

## 公开可分享的地址

这些地址不包含任何 token，可以直接发给协作方：

- 手机 PWA：`https://codex-connect-edge.wahtmelon.workers.dev`
- Cloudflare Broker WebSocket：`wss://codex-connect-edge.wahtmelon.workers.dev/ws`
- 电脑启动配对页：`http://127.0.0.1:4417/assets/connect.html`

## 电脑只需要什么

- Node.js `18+`

如果 `codex` 还没登录，`Coding Agent` 需要先补一遍：

```bash
codex login
```

## 给 Coding Agent：启动项目

在仓库根目录执行：

```bash
npm install
bash scripts/start-cf-onboarding.sh
```

这个入口脚本会：

- 启动 Cloudflare 分支
- 自动打开电脑上的“启动配对页”

启动配对页地址是：

```text
http://127.0.0.1:4417/assets/connect.html
```

如果系统没有自动弹出浏览器，就手动打开这个地址。

## 给用户：连接手机

电脑上会看到一个“启动配对页”。  
这个页面会直接展示：

- 当前连接码
- 手机入口链接
- 二维码
- 安装到桌面的提示

用户只需要按这个顺序做：

1. 用手机扫描页面上的二维码
2. 在手机浏览器里打开 PWA
3. 如果想更像 App，就安装到桌面
4. 进入 `Devices`
5. 输入电脑页面上的 `6` 位连接码
6. 配对成功后进入 `Chats`

手机上的 PWA 地址是：

```text
https://codex-connect-edge.wahtmelon.workers.dev
```

## 安装到桌面

- iPhone：`Share -> Add to Home Screen`
- Android：`Menu -> Install app` 或 `Add to home screen`

## 进入聊天前

第一次进入 `Chats` 后，先打开当前会话右上角的设置按钮，选择这次聊天要使用的文件夹。  
选完工作目录以后，再开始聊天。

## 如果你是维护者

常用命令：

启动并打开启动配对页：

```bash
bash scripts/start-cf-onboarding.sh
```

仅后台启动：

```bash
bash scripts/start-cf-server-bg.sh
```

停止：

```bash
bash scripts/stop-cf-server.sh
```

打印当前入口：

```bash
bash scripts/print-cf-stack.sh
```

## 给别的 Agent 的一句话引导

```text
参考 /Users/waht/Code/codex-connect/docs/cloudflare-pwa-quickstart.md 里的“公开可分享的地址”“给 Coding Agent：启动项目”和“给用户：连接手机”三部分，在仓库根目录执行 `bash scripts/start-cf-onboarding.sh`，把本地启动配对页 `http://127.0.0.1:4417/assets/connect.html` 拉起来，并按文档引导用户用手机打开 `https://codex-connect-edge.wahtmelon.workers.dev`、安装到桌面、在 Devices 输入连接码完成配对；Cloudflare broker 地址是 `wss://codex-connect-edge.wahtmelon.workers.dev/ws`。
```
