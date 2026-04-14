# CodexAPI

中文 / English

## 中文说明

### 新用户入口

如果你的目标是：

- 让一个 `Coding Agent` 在电脑上把项目启动起来
- 让用户看到桌面启动配对页
- 让用户用手机扫码进入 PWA 并完成配对

先直接看这份文档：

- [Cloudflare PWA 快速开始](docs/cloudflare-pwa-quickstart.md)

推荐 `Coding Agent` 直接执行：

```bash
bash scripts/start-cf-onboarding.sh
```

### 项目简介

`CodexAPI` 提供一个本地 OpenAI 兼容 HTTP 服务，底层复用官方 `codex` CLI 已登录会话。它适合已经在本机使用 `codex login`，但还需要一个标准 HTTP 接口给其他工具、脚本或客户端调用的场景。

当前仓库包含三部分：

- `server.mjs`：主服务，提供 OpenAI 兼容接口、文件传输接口、配对接口
- `service-a-broker.mjs`：WebSocket broker，可把主服务暴露给远端客户端
- `android-native/`：Android 客户端，用于连接 broker、收发消息、处理文件

### 主要能力

- OpenAI 兼容接口：
  - `GET /health`
  - `GET /v1/models`
  - `POST /v1/chat/completions`
  - `POST /v1/responses`
- 本地文件浏览、上传、下载、中转下载
- 连接码配对与 broker 中继
- 可选的上游 OpenAI 透传模式

### 环境要求

- Node.js 18+
- `codex` 可执行文件已在 `PATH`
- 已完成 `codex login`

### 快速开始

1. 复制环境变量模板：

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

2. 编辑 `.env`，至少按需填写：

- `OPENAI_API_TOKEN`：给本地兼容接口加 Bearer 鉴权时使用
- `OPENAI_UPSTREAM_API_KEY`：开启上游 OpenAI 透传时使用
- `PAIR_BROKER_URL`：主服务连接 broker 的地址
- `BROKER_OPENAI_API_TOKEN`：broker 的 Bearer 鉴权

3. 启动主服务：

```bash
npm start
```

默认地址：

```text
http://localhost:4317
```

### 其他启动方式

启动 broker：

```bash
npm run start:broker
```

启动示例 Service A：

```bash
npm run start:service-a
```

### Android 配置

Android 客户端不再在源码中写死外网 broker 地址。默认构建值是：

```text
ws://localhost:8000/ws
```

如需覆盖，可在构建前设置环境变量：

```powershell
$env:BROKER_URL="ws://your-host:8000/ws"
```

然后再执行 Gradle 或 Android Studio 构建。

### 多设备与 Mac 接入

- 一个远程 broker 可以同时承载多台已连接的主服务；手机客户端现在可保存多台已配对设备，并在设备之间切换
- 如需让手机端更易识别 Mac，请在 Mac 的 `.env` 中设置 `PAIR_SERVER_NAME=My MacBook`
- 手机端切换设备时，会按设备分别保存会话、工作区和受信凭证
- `service-a-broker.mjs` 已补充重连时返回 `server_name`；旧 broker 也能工作，但建议同步部署最新版本

### 凭据中心与 Git Worktree

- 主服务现在支持设备级“凭据中心”，可把一个目录设为统一的凭据 / skills 根目录
- 默认凭据中心目录是 `CODEX_HOME/credential-center`
- 默认 worktree 根目录是 `CODEX_HOME/worktrees`
- Android 客户端支持：
  - 设备级凭据中心
  - 项目绑定凭据 / skills
  - `@` 上下文选择并注入当前会话
  - 项目级 Git 工作台、worktree 会话、临时合并 / rebase 会话

### 安全说明

- 实际密钥应只放在本地 `.env`
- `.env` 已被 `.gitignore` 忽略，不进入版本控制
- 仓库已提供 `.env.example` 作为安全模板
- 仓库中的硬编码外网 broker 地址已移除，避免环境信息继续落入版本控制

### 关键环境变量

- `PORT`：主服务端口，默认 `4317`
- `HOST`：主服务监听地址，默认监听全部网卡
- `CODEX_BIN`：Codex 可执行文件路径
- `CODEX_MODEL`：默认模型
- `CODEX_WORKDIR`：传给 Codex 的工作目录
- `CODEX_SANDBOX`：Codex sandbox 模式
- `CODEX_APPROVAL_POLICY`：Codex approval 策略
- `CODEX_HOME`：Codex home 目录
- `OPENAI_API_TOKEN`：本地兼容接口 Bearer 鉴权
- `OPENAI_UPSTREAM_API_KEY`：上游 OpenAI API Key
- `OPENAI_UPSTREAM_BASE_URL`：上游 OpenAI 基础地址
- `OPENAI_FULL_COMPAT`：是否优先走上游兼容透传
- `PAIR_BROKER_URL`：主服务连接 broker 的 WebSocket 地址
- `BROKER_OPENAI_API_TOKEN`：broker Bearer 鉴权
- `BROKER_RPC_TIMEOUT_MS`：broker RPC 超时
- `DEVICE_FILE_ROOTS`：允许暴露给客户端的设备文件根目录
- `DEVICE_CREDENTIALS_ROOT`：设备级凭据中心根目录
- `DEVICE_WORKTREE_ROOT`：设备级 Git worktree 根目录

### 示例请求

```bash
curl http://localhost:4317/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_LOCAL_TOKEN" \
  -d '{
    "model": "gpt-5.4",
    "messages": [
      { "role": "user", "content": "Reply in one sentence: who are you?" }
    ]
  }'
```

## English

### New User Entry

If you want the ready-to-use flow:

- start the desktop service
- connect it to the current Cloudflare broker
- open the PWA on a phone
- pair with a code and start using it

Start here:

- [Cloudflare PWA Quick Start](docs/cloudflare-pwa-quickstart.md)

### Overview

`CodexAPI` exposes a local OpenAI-compatible HTTP service backed by an authenticated official `codex` CLI session. It is intended for local tooling, scripts, or clients that need a standard HTTP interface without replacing the existing Codex login flow.

This repository currently includes:

- `server.mjs`: main service with OpenAI-compatible routes, file APIs, and pairing APIs
- `service-a-broker.mjs`: WebSocket broker for remote relay and broker-side OpenAI-compatible routing
- `android-native/`: Android client for broker connectivity, chat, and file operations

### Features

- OpenAI-compatible routes:
  - `GET /health`
  - `GET /v1/models`
  - `POST /v1/chat/completions`
  - `POST /v1/responses`
- Local file listing, upload, download, and transfer download
- Pair-code flow and broker relay
- Optional upstream OpenAI passthrough mode

### Requirements

- Node.js 18+
- `codex` available on `PATH`
- `codex login` completed locally

### Quick start

1. Copy the environment template:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

2. Edit `.env` and fill the values you actually use, especially:

- `OPENAI_API_TOKEN`
- `OPENAI_UPSTREAM_API_KEY`
- `PAIR_BROKER_URL`
- `BROKER_OPENAI_API_TOKEN`

3. Start the main service:

```bash
npm start
```

Default address:

```text
http://localhost:4317
```

### Other entry points

Start the broker:

```bash
npm run start:broker
```

Start the demo Service A:

```bash
npm run start:service-a
```

### Android configuration

The Android app no longer hardcodes a public broker URL in source control. The default build value is:

```text
ws://localhost:8000/ws
```

Override it before building if needed:

```powershell
$env:BROKER_URL="ws://your-host:8000/ws"
```

### Multi-device, credentials, and Git

- A single remote broker can host multiple connected main services, and the Android client can now save and switch between multiple paired devices
- Set `PAIR_SERVER_NAME=My MacBook` in the Mac `.env` to make device names clearer in the app
- The Android client now stores sessions, workspaces, and trusted credentials per device
- The main service now supports a device-level credential center and a managed Git worktree root
- Android now supports:
  - device-level credential bundles and local skills
  - per-project bindings for credentials / skills
  - `@`-triggered context attachment inside a chat session
  - project Git status, worktree sessions, and temporary merge / rebase sessions

### Security

- Keep real secrets only in the local `.env`
- `.env` is ignored by Git and stays out of version control
- `.env.example` is committed as the safe template
- Hardcoded public broker endpoint values were removed from tracked source files

### Key environment variables

- `PORT`: main service port, default `4317`
- `HOST`: main service bind host, defaults to all interfaces
- `CODEX_BIN`: Codex executable path
- `CODEX_MODEL`: default model
- `CODEX_WORKDIR`: working directory passed to Codex
- `CODEX_SANDBOX`: Codex sandbox mode
- `CODEX_APPROVAL_POLICY`: Codex approval policy
- `CODEX_HOME`: Codex home directory
- `OPENAI_API_TOKEN`: bearer auth for local compatible endpoints
- `OPENAI_UPSTREAM_API_KEY`: upstream OpenAI API key
- `OPENAI_UPSTREAM_BASE_URL`: upstream OpenAI base URL
- `OPENAI_FULL_COMPAT`: prefer upstream passthrough for compatibility
- `PAIR_BROKER_URL`: broker WebSocket URL used by the main service
- `BROKER_OPENAI_API_TOKEN`: bearer auth for broker endpoints
- `BROKER_RPC_TIMEOUT_MS`: broker RPC timeout
- `DEVICE_FILE_ROOTS`: device roots exposed to the client
- `DEVICE_CREDENTIALS_ROOT`: device credential-center root
- `DEVICE_WORKTREE_ROOT`: managed Git worktree root

### Example request

```bash
curl http://localhost:4317/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_LOCAL_TOKEN" \
  -d '{
    "model": "gpt-5.4",
    "messages": [
      { "role": "user", "content": "Reply in one sentence: who are you?" }
    ]
  }'
```
