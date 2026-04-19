const APP_VERSION = "2026.04.13-32"
const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024
const IMAGE_UPLOAD_CHUNK_BYTES = 192 * 1024
const IMAGE_UPLOAD_RPC_TIMEOUT_MS = 2 * 60 * 1000
const CHAT_STREAM_RPC_TIMEOUT_MS = 2 * 60 * 60 * 1000
const LANGUAGE_ORDER = ["en", "zh", "ja"]
const LANGUAGE_BUTTON_LABELS = {
  en: "EN",
  zh: "中",
  ja: "日"
}

const STORAGE_KEYS = {
  clientInstallationId: "codex-connect-edge.client-installation-id",
  devices: "codex-connect-edge.devices",
  sessionsByDevice: "codex-connect-edge.sessions",
  activeDeviceKey: "codex-connect-edge.active-device-key",
  activeSessionIds: "codex-connect-edge.active-session-ids",
  language: "codex-connect-edge.language",
  chatDisplayMode: "codex-connect-edge.chat-display-mode"
}

const storage = createSafeStorage()
const MESSAGES = {
  en: {
    "app.title": "Codex Connect Edge",
    "brand.copy": "Cloud PWA for your desktop session.",
    "nav.chats": "Chats",
    "nav.devices": "Devices",
    "status.title": "Status",
    "broker.title": "Broker",
    "actions.reconnect": "Reconnect",
    "labels.relay": "Relay",
    "labels.client": "Client",
    "threads.eyebrow": "Chats",
    "threads.title": "Threads",
    "actions.newChat": "New chat",
    "hero.eyebrow": "Cloudflare",
    "hero.noDevice": "No device selected",
    "hero.pairToBegin": "Pair a desktop session to begin.",
    "actions.install": "Install",
    "actions.switchLanguage": "Switch language",
    "actions.enterFocus": "Enter focus mode",
    "actions.exitFocus": "Exit focus mode",
    "actions.openMenu": "Open menu",
    "actions.closeMenu": "Close menu",
    "hero.devices": "Devices",
    "hero.connectedDevice": "Connected Device",
    "hero.devicesMetaConnected": "Pair another browser or reconnect a saved device.",
    "hero.devicesMetaDefault": "Pair a desktop session or connect a saved device.",
    "hero.sessionSettings": "Session Settings",
    "hero.adjustSession": "Adjust {title}",
    "hero.chooseFolderForChat": "Choose the folder this chat should use.",
    "hero.connectDesktopFirst": "Connect a desktop first, then choose a folder.",
    "hero.chooseFolderBeforeSending": "Choose a folder in Settings before sending.",
    "hero.openDevicesToPair": "Open Devices to pair or connect a desktop session.",
    "empty.connectDesktopFirst": "Connect a desktop first",
    "empty.connectDesktopMeta": "Use Devices to pair this browser or reconnect a saved machine.",
    "empty.ready": "Ready",
    "actions.openDevices": "Open Devices",
    "session.new": "New Session",
    "thread.fresh": "Fresh thread",
    "thread.label": "Thread {id}",
    "device.connected": "Connected",
    "chat.chooseFolderFirst": "Choose a folder first",
    "chat.chooseFolderMeta": "Open Settings and select the workspace this thread should use.",
    "actions.openSettings": "Open settings",
    "chat.startThread": "Start a thread",
    "chat.startThreadMeta": "Ask for repo analysis, edits, or implementation help.",
    "prompt.summarizeRepo": "Summarize repo",
    "prompt.explainApp": "Explain app",
    "prompt.findPairing": "Find pairing",
    "prompt.summarizeRepoText": "Summarize this repo.",
    "prompt.explainAppText": "Explain the current app structure.",
    "prompt.findPairingText": "Find where pairing is implemented.",
    "message.you": "You",
    "message.codex": "Codex",
    "time.now": "now",
    "chat.thinking": "Thinking...",
    "actions.toggleChatDisplay": "Switch chat density",
    "display.modeStandard": "Standard",
    "display.modeCompact": "Compact",
    "activity.thinking": "Thinking",
    "activity.inspect": "Inspecting workspace",
    "activity.git": "Checking git state",
    "activity.test": "Running tests",
    "activity.edit": "Updating files",
    "activity.command": "Running command",
    "activity.work": "Working",
    "activity.detailNone": "No details available.",
    "activity.detailEncrypted": "Detailed reasoning is not available here.",
    "activity.detailCommand": "Command",
    "activity.detailCwd": "Working directory",
    "activity.detailOutput": "Output",
    "activity.detailExitCode": "Exit code",
    "activity.detailDuration": "Duration",
    "activity.detailFiles": "Files",
    "activity.detailQuery": "Query",
    "composer.placeholderReady": "Message Codex...",
    "composer.placeholderNoWorkspace": "Select a folder in Settings first",
    "settings.chat": "Chat Settings",
    "actions.back": "Back",
    "settings.mode": "Mode",
    "settings.modeYolo": "YOLO",
    "settings.modeGuarded": "Guarded",
    "settings.modeYoloMeta": "Lower confirmation friction.",
    "settings.modeGuardedMeta": "Safer command flow.",
    "actions.useGuarded": "Use Guarded",
    "actions.useYolo": "Use YOLO",
    "settings.selected": "Selected",
    "settings.selectedEmpty": "Not selected",
    "settings.chatReadyForFolder": "Chat is ready for this folder.",
    "settings.chooseFolderToUnlock": "Choose a folder below to unlock chat.",
    "actions.clear": "Clear",
    "actions.open": "Open",
    "actions.up": "Go up",
    "actions.home": "Go home",
    "actions.refresh": "Refresh",
    "settings.currentFolder": "Current Folder",
    "settings.root": "Root",
    "settings.browsing": "Browsing · {parent}",
    "settings.openDesktopFolderSource": "Open a desktop folder source.",
    "actions.use": "Use",
    "settings.noSubfolders": "No subfolders here.",
    "settings.folderBrowserNotReady": "Folder browser not ready yet.",
    "devices.add": "Add",
    "devices.pairDevice": "Pair Device",
    "form.pairCode": "Pair Code",
    "form.pairCodePlaceholder": "ABC123",
    "form.deviceLabel": "Device Label",
    "form.deviceLabelPlaceholder": "My Phone",
    "actions.pairBrowser": "Pair This Browser",
    "devices.saved": "Saved",
    "devices.trusted": "Trusted Devices",
    "devices.none": "No devices saved yet.",
    "devices.pairedDevice": "Paired Device",
    "devices.unknownHost": "Unknown host",
    "devices.installation": "installation {id}",
    "devices.lastSeen": "last seen {time}",
    "actions.connect": "Connect",
    "actions.forget": "Forget",
    "actions.send": "Send",
    "actions.uploadImage": "Upload image",
    "actions.expandComposer": "Expand composer",
    "actions.collapseComposer": "Collapse composer",
    "actions.removeAttachment": "Remove attachment",
    "actions.cancelUpload": "Cancel upload",
    "sessions.none": "Create a chat to start.",
    "status.connecting": "Connecting...",
    "status.connectionTimeout": "Connection timeout",
    "status.connected": "Connected",
    "status.disconnected": "Disconnected",
    "status.connectionFailed": "Connection failed",
    "status.deviceReady": "Device ready",
    "toast.pairCodeRequired": "Pair code is required.",
    "toast.pairingFailed": "Pairing failed.",
    "toast.chooseWorkspaceFirst": "Choose a workspace first.",
    "toast.onlyImageUploads": "Only image uploads are supported here.",
    "toast.imageTooLarge": "Image is too large. Max 10 MB per upload.",
    "toast.uploaded": "Uploaded {name}",
    "toast.imageUploadFailed": "Image upload failed.",
    "toast.imageUploadCanceled": "Upload canceled.",
    "toast.waitForUploads": "Wait for uploads to finish or remove them first.",
    "toast.chooseWorkspaceInSettings": "Choose a workspace in Settings first.",
    "toast.connectedTo": "Connected to {name}",
    "toast.workspaceSet": "Workspace set to {path}",
    "toast.workspaceCleared": "Workspace cleared.",
    "toast.selectDeviceFirst": "Select a device first.",
    "toast.deviceOffline": "Device offline: {id}",
    "toast.homeUnavailable": "Home folder is not available.",
    "sync.loading": "Loading",
    "sync.fetching": "Fetching workspace state.",
    "sync.syncing": "Syncing",
    "error.prefix": "Error",
    "attachment.uploading": "Uploading",
    "attachment.failed": "Upload failed",
    "attachment.ready": "Ready"
  },
  zh: {
    "app.title": "Codex Connect Edge",
    "brand.copy": "桌面会话的云端 PWA。",
    "nav.chats": "会话",
    "nav.devices": "设备",
    "status.title": "状态",
    "broker.title": "Broker",
    "actions.reconnect": "重连",
    "labels.relay": "中继",
    "labels.client": "客户端",
    "threads.eyebrow": "会话",
    "threads.title": "线程",
    "actions.newChat": "新建会话",
    "hero.eyebrow": "Cloudflare",
    "hero.noDevice": "未选择设备",
    "hero.pairToBegin": "先配对一个桌面会话再开始。",
    "actions.install": "安装",
    "actions.switchLanguage": "切换语言",
    "actions.enterFocus": "进入专注模式",
    "actions.exitFocus": "退出专注模式",
    "actions.openMenu": "打开菜单",
    "actions.closeMenu": "关闭菜单",
    "hero.devices": "设备",
    "hero.connectedDevice": "已连接设备",
    "hero.devicesMetaConnected": "可继续配对其他浏览器，或重连已保存设备。",
    "hero.devicesMetaDefault": "配对一个桌面会话，或连接已保存设备。",
    "hero.sessionSettings": "会话设置",
    "hero.adjustSession": "调整 {title}",
    "hero.chooseFolderForChat": "选择这个会话要使用的文件夹。",
    "hero.connectDesktopFirst": "先连接桌面端，再选择文件夹。",
    "hero.chooseFolderBeforeSending": "发送前先在设置中选择文件夹。",
    "hero.openDevicesToPair": "打开设备页进行配对或连接桌面会话。",
    "empty.connectDesktopFirst": "先连接桌面端",
    "empty.connectDesktopMeta": "去设备页配对当前浏览器，或重连已保存机器。",
    "empty.ready": "准备就绪",
    "actions.openDevices": "打开设备页",
    "session.new": "新会话",
    "thread.fresh": "新线程",
    "thread.label": "线程 {id}",
    "device.connected": "已连接",
    "chat.chooseFolderFirst": "先选择文件夹",
    "chat.chooseFolderMeta": "打开设置，为当前线程选择工作目录。",
    "actions.openSettings": "打开设置",
    "chat.startThread": "开始会话",
    "chat.startThreadMeta": "可以让 Codex 做仓库分析、改代码或实现功能。",
    "prompt.summarizeRepo": "总结仓库",
    "prompt.explainApp": "解释结构",
    "prompt.findPairing": "查找配对",
    "prompt.summarizeRepoText": "总结这个仓库。",
    "prompt.explainAppText": "解释当前应用结构。",
    "prompt.findPairingText": "找到配对功能的位置。",
    "message.you": "你",
    "message.codex": "Codex",
    "time.now": "刚刚",
    "chat.thinking": "思考中...",
    "actions.toggleChatDisplay": "切换聊天展示",
    "display.modeStandard": "标准",
    "display.modeCompact": "简洁",
    "activity.thinking": "思考中",
    "activity.inspect": "正在检查工作区",
    "activity.git": "正在检查 Git 状态",
    "activity.test": "正在运行测试",
    "activity.edit": "正在更新文件",
    "activity.command": "正在运行命令",
    "activity.work": "正在处理",
    "activity.detailNone": "暂无可展示的细节。",
    "activity.detailEncrypted": "这里无法展示详细思考内容。",
    "activity.detailCommand": "命令",
    "activity.detailCwd": "工作目录",
    "activity.detailOutput": "输出",
    "activity.detailExitCode": "退出码",
    "activity.detailDuration": "耗时",
    "activity.detailFiles": "文件",
    "activity.detailQuery": "查询",
    "composer.placeholderReady": "给 Codex 发消息...",
    "composer.placeholderNoWorkspace": "先在设置里选择文件夹",
    "settings.chat": "会话设置",
    "actions.back": "返回",
    "settings.mode": "模式",
    "settings.modeYolo": "YOLO",
    "settings.modeGuarded": "Guarded",
    "settings.modeYoloMeta": "减少确认步骤。",
    "settings.modeGuardedMeta": "更稳妥的命令流程。",
    "actions.useGuarded": "切到 Guarded",
    "actions.useYolo": "切到 YOLO",
    "settings.selected": "已选目录",
    "settings.selectedEmpty": "未选择",
    "settings.chatReadyForFolder": "当前文件夹已可用于聊天。",
    "settings.chooseFolderToUnlock": "在下面选择文件夹后才能聊天。",
    "actions.clear": "清除",
    "actions.open": "打开",
    "actions.up": "返回上一级",
    "actions.home": "回到主目录",
    "actions.refresh": "刷新",
    "settings.currentFolder": "当前目录",
    "settings.root": "根目录",
    "settings.browsing": "正在浏览 · {parent}",
    "settings.openDesktopFolderSource": "打开一个桌面文件夹来源。",
    "actions.use": "使用",
    "settings.noSubfolders": "这里没有子文件夹。",
    "settings.folderBrowserNotReady": "文件夹浏览器还没准备好。",
    "devices.add": "新增",
    "devices.pairDevice": "配对设备",
    "form.pairCode": "配对码",
    "form.pairCodePlaceholder": "ABC123",
    "form.deviceLabel": "设备名称",
    "form.deviceLabelPlaceholder": "我的手机",
    "actions.pairBrowser": "配对当前浏览器",
    "devices.saved": "已保存",
    "devices.trusted": "可信设备",
    "devices.none": "还没有保存的设备。",
    "devices.pairedDevice": "已配对设备",
    "devices.unknownHost": "未知主机",
    "devices.installation": "安装 {id}",
    "devices.lastSeen": "最近在线 {time}",
    "actions.connect": "连接",
    "actions.forget": "忘记",
    "actions.send": "发送",
    "actions.uploadImage": "上传图片",
    "actions.expandComposer": "展开输入框",
    "actions.collapseComposer": "收起输入框",
    "actions.removeAttachment": "移除附件",
    "actions.cancelUpload": "取消上传",
    "sessions.none": "先创建一个会话。",
    "status.connecting": "连接中...",
    "status.connectionTimeout": "连接超时",
    "status.connected": "已连接",
    "status.disconnected": "已断开",
    "status.connectionFailed": "连接失败",
    "status.deviceReady": "设备已就绪",
    "toast.pairCodeRequired": "必须填写配对码。",
    "toast.pairingFailed": "配对失败。",
    "toast.chooseWorkspaceFirst": "请先选择工作目录。",
    "toast.onlyImageUploads": "这里只支持上传图片。",
    "toast.imageTooLarge": "图片过大，单次最多 10 MB。",
    "toast.uploaded": "已上传 {name}",
    "toast.imageUploadFailed": "图片上传失败。",
    "toast.imageUploadCanceled": "已取消上传。",
    "toast.waitForUploads": "请等待上传完成，或先移除上传中的附件。",
    "toast.chooseWorkspaceInSettings": "请先在设置里选择工作目录。",
    "toast.connectedTo": "已连接到 {name}",
    "toast.workspaceSet": "已将工作目录设为 {path}",
    "toast.workspaceCleared": "已清空工作目录。",
    "toast.selectDeviceFirst": "请先选择设备。",
    "toast.deviceOffline": "设备离线：{id}",
    "toast.homeUnavailable": "主目录当前不可用。",
    "sync.loading": "加载中",
    "sync.fetching": "正在获取工作区状态。",
    "sync.syncing": "同步中",
    "error.prefix": "错误",
    "attachment.uploading": "上传中",
    "attachment.failed": "上传失败",
    "attachment.ready": "已就绪"
  },
  ja: {
    "app.title": "Codex Connect Edge",
    "brand.copy": "デスクトップセッション用のクラウド PWA。",
    "nav.chats": "チャット",
    "nav.devices": "デバイス",
    "status.title": "状態",
    "broker.title": "Broker",
    "actions.reconnect": "再接続",
    "labels.relay": "Relay",
    "labels.client": "クライアント",
    "threads.eyebrow": "チャット",
    "threads.title": "スレッド",
    "actions.newChat": "新しい会話",
    "hero.eyebrow": "Cloudflare",
    "hero.noDevice": "デバイス未選択",
    "hero.pairToBegin": "まずデスクトップセッションをペアリングしてください。",
    "actions.install": "インストール",
    "actions.switchLanguage": "言語を切り替え",
    "actions.enterFocus": "集中モードに入る",
    "actions.exitFocus": "集中モードを終了",
    "actions.openMenu": "メニューを開く",
    "actions.closeMenu": "メニューを閉じる",
    "hero.devices": "デバイス",
    "hero.connectedDevice": "接続済みデバイス",
    "hero.devicesMetaConnected": "別のブラウザをペアリングするか、保存済みデバイスを再接続できます。",
    "hero.devicesMetaDefault": "デスクトップセッションをペアリングするか、保存済みデバイスに接続します。",
    "hero.sessionSettings": "会話設定",
    "hero.adjustSession": "{title} を調整",
    "hero.chooseFolderForChat": "この会話で使うフォルダを選択してください。",
    "hero.connectDesktopFirst": "先にデスクトップへ接続してからフォルダを選択してください。",
    "hero.chooseFolderBeforeSending": "送信前に設定でフォルダを選択してください。",
    "hero.openDevicesToPair": "デバイス画面を開いてデスクトップをペアリングまたは接続してください。",
    "empty.connectDesktopFirst": "先にデスクトップへ接続",
    "empty.connectDesktopMeta": "デバイス画面でこのブラウザをペアリングするか、保存済みマシンへ再接続してください。",
    "empty.ready": "準備完了",
    "actions.openDevices": "デバイスを開く",
    "session.new": "新しい会話",
    "thread.fresh": "新規スレッド",
    "thread.label": "スレッド {id}",
    "device.connected": "接続済み",
    "chat.chooseFolderFirst": "先にフォルダを選択",
    "chat.chooseFolderMeta": "設定を開き、このスレッドで使うワークスペースを選択してください。",
    "actions.openSettings": "設定を開く",
    "chat.startThread": "会話を開始",
    "chat.startThreadMeta": "リポジトリ解析、編集、実装依頼を送れます。",
    "prompt.summarizeRepo": "リポジトリ要約",
    "prompt.explainApp": "構成を説明",
    "prompt.findPairing": "ペアリング箇所",
    "prompt.summarizeRepoText": "このリポジトリを要約して。",
    "prompt.explainAppText": "現在のアプリ構成を説明して。",
    "prompt.findPairingText": "ペアリング実装の場所を見つけて。",
    "message.you": "あなた",
    "message.codex": "Codex",
    "time.now": "今",
    "chat.thinking": "考え中...",
    "actions.toggleChatDisplay": "表示密度を切り替え",
    "display.modeStandard": "標準",
    "display.modeCompact": "簡潔",
    "activity.thinking": "考え中",
    "activity.inspect": "ワークスペースを確認中",
    "activity.git": "Git 状態を確認中",
    "activity.test": "テストを実行中",
    "activity.edit": "ファイルを更新中",
    "activity.command": "コマンドを実行中",
    "activity.work": "処理中",
    "activity.detailNone": "表示できる詳細はありません。",
    "activity.detailEncrypted": "詳細な思考内容はここでは表示できません。",
    "activity.detailCommand": "コマンド",
    "activity.detailCwd": "作業ディレクトリ",
    "activity.detailOutput": "出力",
    "activity.detailExitCode": "終了コード",
    "activity.detailDuration": "所要時間",
    "activity.detailFiles": "ファイル",
    "activity.detailQuery": "検索",
    "composer.placeholderReady": "Codex にメッセージ...",
    "composer.placeholderNoWorkspace": "先に設定でフォルダを選択",
    "settings.chat": "会話設定",
    "actions.back": "戻る",
    "settings.mode": "モード",
    "settings.modeYolo": "YOLO",
    "settings.modeGuarded": "Guarded",
    "settings.modeYoloMeta": "確認の手間を減らします。",
    "settings.modeGuardedMeta": "より安全なコマンドフローです。",
    "actions.useGuarded": "Guarded にする",
    "actions.useYolo": "YOLO にする",
    "settings.selected": "選択済み",
    "settings.selectedEmpty": "未選択",
    "settings.chatReadyForFolder": "このフォルダでチャットできます。",
    "settings.chooseFolderToUnlock": "下のフォルダを選ぶとチャットが有効になります。",
    "actions.clear": "クリア",
    "actions.open": "開く",
    "actions.up": "上へ",
    "actions.home": "ホームへ",
    "actions.refresh": "更新",
    "settings.currentFolder": "現在のフォルダ",
    "settings.root": "ルート",
    "settings.browsing": "閲覧中 · {parent}",
    "settings.openDesktopFolderSource": "デスクトップのフォルダを開いてください。",
    "actions.use": "使う",
    "settings.noSubfolders": "サブフォルダはありません。",
    "settings.folderBrowserNotReady": "フォルダブラウザはまだ準備中です。",
    "devices.add": "追加",
    "devices.pairDevice": "デバイスをペアリング",
    "form.pairCode": "ペアコード",
    "form.pairCodePlaceholder": "ABC123",
    "form.deviceLabel": "デバイス名",
    "form.deviceLabelPlaceholder": "私のスマホ",
    "actions.pairBrowser": "このブラウザをペアリング",
    "devices.saved": "保存済み",
    "devices.trusted": "信頼済みデバイス",
    "devices.none": "保存済みデバイスはありません。",
    "devices.pairedDevice": "ペア済みデバイス",
    "devices.unknownHost": "不明なホスト",
    "devices.installation": "installation {id}",
    "devices.lastSeen": "最終確認 {time}",
    "actions.connect": "接続",
    "actions.forget": "削除",
    "actions.send": "送信",
    "actions.uploadImage": "画像をアップロード",
    "actions.expandComposer": "入力欄を広げる",
    "actions.collapseComposer": "入力欄を閉じる",
    "actions.removeAttachment": "添付を削除",
    "actions.cancelUpload": "アップロードをキャンセル",
    "sessions.none": "まず会話を作成してください。",
    "status.connecting": "接続中...",
    "status.connectionTimeout": "接続タイムアウト",
    "status.connected": "接続済み",
    "status.disconnected": "切断済み",
    "status.connectionFailed": "接続失敗",
    "status.deviceReady": "デバイス準備完了",
    "toast.pairCodeRequired": "ペアコードは必須です。",
    "toast.pairingFailed": "ペアリングに失敗しました。",
    "toast.chooseWorkspaceFirst": "先にワークスペースを選択してください。",
    "toast.onlyImageUploads": "ここでは画像のみアップロードできます。",
    "toast.imageTooLarge": "画像が大きすぎます。1 回 10 MB までです。",
    "toast.uploaded": "{name} をアップロードしました",
    "toast.imageUploadFailed": "画像アップロードに失敗しました。",
    "toast.imageUploadCanceled": "アップロードをキャンセルしました。",
    "toast.waitForUploads": "アップロード完了を待つか、先に添付を削除してください。",
    "toast.chooseWorkspaceInSettings": "先に設定でワークスペースを選択してください。",
    "toast.connectedTo": "{name} に接続しました",
    "toast.workspaceSet": "ワークスペースを {path} に設定しました",
    "toast.workspaceCleared": "ワークスペースをクリアしました。",
    "toast.selectDeviceFirst": "先にデバイスを選択してください。",
    "toast.deviceOffline": "デバイスはオフラインです: {id}",
    "toast.homeUnavailable": "ホームフォルダは利用できません。",
    "sync.loading": "読み込み中",
    "sync.fetching": "ワークスペース状態を取得しています。",
    "sync.syncing": "同期中",
    "error.prefix": "エラー",
    "attachment.uploading": "アップロード中",
    "attachment.failed": "アップロード失敗",
    "attachment.ready": "準備完了"
  }
}
const UNTITLED_TITLES = new Set(
  LANGUAGE_ORDER.flatMap((language) => [MESSAGES[language]["session.new"]]).filter(Boolean)
)

const state = {
  brokerUrl: deriveWebSocketUrl(),
  clientInstallationId: loadOrCreateClientInstallationId(),
  devices: loadJson(STORAGE_KEYS.devices, []),
  sessionsByDevice: loadJson(STORAGE_KEYS.sessionsByDevice, {}),
  activeDeviceKey: storageGet(STORAGE_KEYS.activeDeviceKey) || null,
  activeSessionIds: loadJson(STORAGE_KEYS.activeSessionIds, {}),
  language: loadLanguage(),
  chatDisplayMode: loadChatDisplayMode(),
  activeTab: "chats",
  drawerOpen: false,
  immersiveChat: false,
  status: {
    kind: "offline",
    key: "status.connecting"
  },
  runtime: {
    ready: false,
    loading: false,
    authReady: false,
    uploadingImage: false,
    config: null,
    roots: [],
    fileBrowser: null,
    gitInspect: null,
    gitBranches: null,
    gitLog: null,
    contextCatalog: null,
    chatScroll: {
      sessionId: null,
      stickToBottom: true,
      scrollTop: 0
    }
  },
  installingEvent: null
}

const BROKER_CONNECT_TIMEOUT_MS = 8000

const refs = {
  shell: document.querySelector(".shell"),
  rail: document.querySelector(".rail"),
  drawerBackdrop: document.querySelector("#drawerBackdrop"),
  menuBtn: document.querySelector("#menuBtn"),
  closeDrawerBtn: document.querySelector("#closeDrawerBtn"),
  statusPill: document.querySelector("#statusPill"),
  brokerUrlValue: document.querySelector("#brokerUrlValue"),
  clientInstallationValue: document.querySelector("#clientInstallationValue"),
  sideNav: document.querySelector(".side-nav"),
  drawerSessionsPanel: document.querySelector("#drawerSessionsPanel"),
  sessionList: document.querySelector("#sessionList"),
  heroTitle: document.querySelector("#heroTitle"),
  heroMeta: document.querySelector("#heroMeta"),
  tabContent: document.querySelector("#tabContent"),
  reconnectBtn: document.querySelector("#reconnectBtn"),
  languageBtn: document.querySelector("#languageBtn"),
  fullscreenBtn: document.querySelector("#fullscreenBtn"),
  installBtn: document.querySelector("#installBtn"),
  newSessionBtn: document.querySelector("#newSessionBtn"),
  toastStack: document.querySelector("#toastStack")
}

let client = null
let activityElapsedTicker = null

function loadLanguage() {
  const saved = storageGet(STORAGE_KEYS.language)
  return LANGUAGE_ORDER.includes(saved) ? saved : "en"
}

function loadChatDisplayMode() {
  const saved = storageGet(STORAGE_KEYS.chatDisplayMode)
  return saved === "compact" ? "compact" : "standard"
}

function t(key, vars = {}) {
  const catalog = MESSAGES[state.language] || MESSAGES.en
  const fallback = MESSAGES.en[key] || key
  const template = catalog[key] || fallback
  return String(template).replace(/\{(\w+)\}/g, (_, name) => {
    const value = vars[name]
    return value == null ? "" : String(value)
  })
}

function cycleLanguage() {
  const currentIndex = LANGUAGE_ORDER.indexOf(state.language)
  const next = LANGUAGE_ORDER[(currentIndex + 1) % LANGUAGE_ORDER.length]
  state.language = next
  storageSet(STORAGE_KEYS.language, next)
  applyStaticCopy()
  renderAll()
}

function applyStaticCopy() {
  document.documentElement.lang = state.language === "zh" ? "zh-CN" : state.language
  document.title = t("app.title")
  for (const node of document.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.dataset.i18n)
  }
  for (const node of document.querySelectorAll("[data-i18n-title]")) {
    node.title = t(node.dataset.i18nTitle)
  }
  for (const node of document.querySelectorAll("[data-i18n-aria-label]")) {
    node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel))
  }
  refs.languageBtn.textContent = LANGUAGE_BUTTON_LABELS[state.language]
  refs.languageBtn.title = t("actions.switchLanguage")
  refs.languageBtn.setAttribute("aria-label", t("actions.switchLanguage"))
  refs.fullscreenBtn.title = state.immersiveChat ? t("actions.exitFocus") : t("actions.enterFocus")
  refs.fullscreenBtn.setAttribute("aria-label", state.immersiveChat ? t("actions.exitFocus") : t("actions.enterFocus"))
  refs.menuBtn.title = t("actions.openMenu")
  refs.menuBtn.setAttribute("aria-label", t("actions.openMenu"))
  refs.closeDrawerBtn.title = t("actions.closeMenu")
  refs.closeDrawerBtn.setAttribute("aria-label", t("actions.closeMenu"))
  refs.newSessionBtn.title = t("actions.newChat")
  refs.newSessionBtn.setAttribute("aria-label", t("actions.newChat"))
}

function sessionDisplayTitle(session) {
  if (!session) return t("session.new")
  if (session.untitled || !session.title || UNTITLED_TITLES.has(session.title)) {
    return t("session.new")
  }
  return session.title
}

async function bootstrap() {
  refs.brokerUrlValue.textContent = state.brokerUrl
  refs.clientInstallationValue.textContent = state.clientInstallationId

  applyStaticCopy()
  wireGlobalEvents()
  startActivityElapsedTicker()
  ensureSessionForActiveDevice()
  renderAll()
  reportClientEvent("info", "app-booted", {
    broker_url: state.brokerUrl,
    saved_devices: state.devices.length
  })

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(`/sw.js?v=${APP_VERSION}`).catch((error) => {
      reportClientEvent("warn", "service-worker-register-failed", errorPayload(error))
    })
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault()
    state.installingEvent = event
    refs.installBtn.classList.remove("hidden")
  })

  await client.connect()
  const active = getActiveDevice()
  if (active) {
    await resumeDevice(active, { quiet: true })
  }
}

function wireGlobalEvents() {
  refs.menuBtn.addEventListener("click", () => {
    state.drawerOpen = true
    renderDrawer()
  })
  refs.closeDrawerBtn.addEventListener("click", () => {
    state.drawerOpen = false
    renderDrawer()
  })
  refs.drawerBackdrop.addEventListener("click", () => {
    state.drawerOpen = false
    renderDrawer()
  })
  refs.reconnectBtn.addEventListener("click", () => {
    client.reconnect()
  })
  refs.languageBtn.addEventListener("click", () => {
    cycleLanguage()
  })
  refs.fullscreenBtn.addEventListener("click", () => {
    if (state.activeTab !== "chats") return
    state.immersiveChat = !state.immersiveChat
    state.drawerOpen = false
    renderAll()
  })
  refs.installBtn.addEventListener("click", async () => {
    if (!state.installingEvent) return
    await state.installingEvent.prompt()
    state.installingEvent = null
    refs.installBtn.classList.add("hidden")
  })
  refs.sideNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab]")
    if (!button) return
    state.activeTab = button.dataset.tab
    if (state.activeTab !== "chats") {
      state.immersiveChat = false
    }
    state.drawerOpen = false
    renderAll()
  })
  refs.newSessionBtn.addEventListener("click", () => {
    const next = createSession()
    if (!next?.id) return
    setActiveSessionId(next.id)
    persistSessions()
    state.drawerOpen = false
    renderAll()
  })
  refs.sessionList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-session-id]")
    if (!card) return
    setActiveSessionId(card.dataset.sessionId)
    state.drawerOpen = false
    renderAll()
  })

  refs.tabContent.addEventListener("click", onTabContentClick)
  refs.tabContent.addEventListener("submit", onTabContentSubmit)
  refs.tabContent.addEventListener("change", onTabContentChange)
  refs.tabContent.addEventListener("input", onTabContentInput)
  refs.tabContent.addEventListener("toggle", onTabContentToggle, true)
  refs.tabContent.addEventListener("scroll", onTabContentScroll, { capture: true, passive: true })
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (state.drawerOpen) {
        state.drawerOpen = false
        renderDrawer()
        return
      }
      if (state.immersiveChat) {
        state.immersiveChat = false
        renderAll()
      }
    }
  })
}

async function onPairSubmit(event) {
  event.preventDefault()
  const form = event.target.closest("form")
  if (!form) return
  const codeInput = form.querySelector("#pairCodeInput")
  const nameInput = form.querySelector("#pairNameInput")
  const code = codeInput?.value?.trim()?.toUpperCase() || ""
  const deviceName = nameInput?.value?.trim() || defaultDeviceName()
  if (!code) {
    showToast(t("toast.pairCodeRequired"), true)
    return
  }

  try {
    await client.connect()
    const payload = await client.request("pair_client", {
      code,
      device_name: deviceName,
      client_installation_id: state.clientInstallationId
    })
    const device = upsertDevice({
      installation_id: payload.installation_id,
      device_id: payload.device_id,
      device_token: payload.device_token,
      server_name: payload.server_name || deviceName,
      label: deviceName,
      paired_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString()
    })
    setActiveDevice(device)
    state.activeTab = "chats"
    state.drawerOpen = false
    if (codeInput) codeInput.value = ""
    await refreshDeviceData()
    showToast(t("toast.connectedTo", { name: device.server_name || device.label || t("device.connected") }))
  } catch (error) {
    reportClientEvent("warn", "pair-submit-failed", {
      code,
      message: error?.message || String(error)
    })
    showToast(error?.message || t("toast.pairingFailed"), true)
  }
}

async function onTabContentClick(event) {
  const actionNode = event.target.closest("[data-action]")
  const sessionCard = event.target.closest("[data-session-id]")
  if (sessionCard) {
    setActiveSessionId(sessionCard.dataset.sessionId)
    state.drawerOpen = false
    renderAll()
    return
  }

  const deviceActionNode = event.target.closest("[data-device-action]")
  if (deviceActionNode) {
    const device = findDeviceByKey(deviceActionNode.dataset.deviceKey)
    if (!device) return

    if (deviceActionNode.dataset.deviceAction === "activate") {
      await resumeDevice(device).catch((error) => showToast(error.message, true))
      state.drawerOpen = false
      renderDrawer()
      return
    }

    if (deviceActionNode.dataset.deviceAction === "forget") {
      state.devices = state.devices.filter((entry) => deviceKey(entry) !== deviceKey(device))
      delete state.sessionsByDevice[deviceKey(device)]
      delete state.activeSessionIds[deviceKey(device)]
      if (state.activeDeviceKey === deviceKey(device)) {
        state.activeDeviceKey = null
        state.runtime = emptyRuntime()
        storageRemove(STORAGE_KEYS.activeDeviceKey)
      }
      persistDevices()
      persistSessions()
      state.drawerOpen = false
      renderAll()
      return
    }
  }

  if (!actionNode) return

  const action = actionNode.dataset.action
  const path = actionNode.dataset.path || ""
  const session = currentSession()

  if (action === "new-session") {
    const next = createSession()
    if (!next?.id) return
    setActiveSessionId(next.id)
    persistSessions()
    renderAll()
    return
  }

  if (action === "send-message") {
    const input = refs.tabContent.querySelector("#messageInput")
    if (input) {
      await sendChatMessage(input.value)
      input.value = ""
    }
    return
  }

  if (action === "use-prompt") {
    const input = refs.tabContent.querySelector("#messageInput")
    if (session) {
      session.draftText = actionNode.dataset.prompt || ""
      session.composerExpanded = true
      persistSessions()
    }
    if (input) {
      input.value = actionNode.dataset.prompt || ""
      input.focus()
    }
    return
  }

  if (action === "open-settings") {
    state.activeTab = "settings"
    state.immersiveChat = false
    state.drawerOpen = false
    renderAll()
    return
  }

  if (action === "toggle-chat-display") {
    state.chatDisplayMode = state.chatDisplayMode === "standard" ? "compact" : "standard"
    storageSet(STORAGE_KEYS.chatDisplayMode, state.chatDisplayMode)
    renderAll()
    return
  }

  if (action === "back-to-chat") {
    state.activeTab = "chats"
    renderAll()
    return
  }

  if (action === "open-devices") {
    state.activeTab = "devices"
    state.immersiveChat = false
    state.drawerOpen = false
    renderAll()
    return
  }

  if (action === "toggle-mode") {
    if (!session) return
    session.yolo = !session.yolo
    persistSessions()
    renderAll()
    return
  }

  if (action === "pick-image") {
    if (!session?.cwd) {
      state.activeTab = "settings"
      renderAll()
      showToast(t("toast.chooseWorkspaceFirst"), true)
      return
    }
    refs.tabContent.querySelector("#imageUploadInput")?.click()
    return
  }

  if (action === "toggle-immersive-chat") {
    state.immersiveChat = !state.immersiveChat
    renderAll()
    return
  }

  if (action === "toggle-composer") {
    if (!session) return
    session.composerExpanded = !session.composerExpanded
    persistSessions()
    renderAll()
    const input = refs.tabContent.querySelector("#messageInput")
    input?.focus()
    return
  }

  if (action === "file-home") {
    const nextRoot = state.runtime.config?.codex_home || state.runtime.roots[0]?.path
    if (!nextRoot) {
      showToast(t("toast.homeUnavailable"), true)
      return
    }
    await loadFileBrowser(nextRoot)
    return
  }

  if (action === "file-open") {
    await loadFileBrowser(path)
    return
  }

  if (action === "file-up") {
    if (state.runtime.fileBrowser?.parent) {
      await loadFileBrowser(state.runtime.fileBrowser.parent)
    }
    return
  }

  if (action === "file-refresh") {
    await loadFileBrowser(state.runtime.fileBrowser?.current || session?.cwd || state.runtime.config?.codex_home || state.runtime.roots[0]?.path || path)
    return
  }

  if (action === "file-select-workspace") {
    await setWorkspace(path)
    return
  }

  if (action === "workspace-clear") {
    const current = currentSession()
    if (!current) return
    current.cwd = ""
    clearDraftAttachments(current)
    persistSessions()
    renderAll()
    showToast(t("toast.workspaceCleared"))
    return
  }

  if (action === "remove-attachment") {
    if (!session) return
    await removeDraftAttachment(session.id, actionNode.dataset.attachmentId)
    return
  }
}

async function onTabContentSubmit(event) {
  const form = event.target.closest("form")
  if (!form) return
  event.preventDefault()

  if (form.id === "chatComposer") {
    const input = form.querySelector("#messageInput")
    if (!input) return
    await sendChatMessage(input.value)
    input.value = ""
    return
  }

  if (form.id === "pairForm") {
    await onPairSubmit(event)
    return
  }
}

async function onTabContentChange(event) {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return
  if (input.id !== "imageUploadInput") return
  const file = input.files?.[0]
  input.value = ""
  if (!file) return
  await uploadWorkspaceImage(file)
}

function onTabContentInput(event) {
  const target = event.target
  if (!(target instanceof HTMLTextAreaElement) || target.id !== "messageInput") return
  const session = currentSession()
  if (!session) return
  session.draftText = target.value
  persistSessions()
}

function onTabContentScroll(event) {
  const target = event.target
  if (!(target instanceof HTMLElement) || !target.classList.contains("chat-window")) return
  state.runtime.chatScroll = {
    sessionId: currentSession()?.id || null,
    stickToBottom: isNearBottom(target),
    scrollTop: target.scrollTop
  }
}

function onTabContentToggle(event) {
  const details = event.target
  if (!(details instanceof HTMLDetailsElement) || !details.dataset.activityId) return
  const messageNode = details.closest("[data-message-id]")
  const session = currentSession()
  if (!(messageNode instanceof HTMLElement) || !session) return
  const message = session.messages?.find((entry) => entry?.id === messageNode.dataset.messageId)
  if (!message) return
  const segments = ensureMessageSegments(message)
  const segment = segments.find((entry) => entry.type === "activity" && entry.id === details.dataset.activityId)
  if (!segment) return
  segment.expanded = details.open
  persistSessions()
}

async function resumeDevice(device, { quiet = false } = {}) {
  await client.connect()
  const payload = await client.request("resume_client", {
    installation_id: device.installation_id,
    device_id: device.device_id,
    device_token: device.device_token
  })
  const next = upsertDevice({
    ...device,
    installation_id: payload.installation_id || device.installation_id,
    device_id: payload.device_id || device.device_id,
    server_name: payload.server_name || device.server_name,
    last_seen_at: new Date().toISOString()
  })
  setActiveDevice(next)
  await refreshDeviceData()
  if (!quiet) showToast(t("toast.connectedTo", { name: next.server_name || next.label || t("device.connected") }))
}

async function refreshDeviceData() {
  const device = getActiveDevice()
  if (!device) {
    state.runtime = emptyRuntime()
    renderAll()
    return
  }

  ensureSessionForActiveDevice()
  state.runtime.loading = true
  renderAll()

  try {
    const [config, rootsPayload] = await Promise.all([
      rpc("config.get", {}),
      rpc("fs.roots", {})
    ])
    state.runtime.ready = true
    state.runtime.loading = false
    state.runtime.authReady = true
    state.runtime.config = config
    state.runtime.roots = Array.isArray(rootsPayload?.roots) ? rootsPayload.roots : []
    state.runtime.contextCatalog = null
    state.runtime.gitInspect = null
    state.runtime.gitBranches = null
    state.runtime.gitLog = null

    const session = currentSession()
    const browseStart = session?.cwd || state.runtime.fileBrowser?.current || config?.codex_home || state.runtime.roots[0]?.path || ""
    if (browseStart) {
      await loadFileBrowser(browseStart)
    } else {
      state.runtime.fileBrowser = null
    }
  } catch (error) {
    state.runtime.loading = false
    state.runtime.authReady = false
    renderAll()
    throw error
  }

  renderAll()
}

async function loadFileBrowser(path) {
  if (!path) return
  state.runtime.fileBrowser = await rpc("fs.list", { path })
  renderAll()
}

async function setWorkspace(path) {
  const session = currentSession()
  if (!session) return
  if (session.cwd !== path) {
    clearDraftAttachments(session)
  }
  session.cwd = path
  persistSessions()
  await loadFileBrowser(path)
  renderAll()
  showToast(t("toast.workspaceSet", { path: shortPath(path) }))
}

async function uploadWorkspaceImage(file) {
  const session = currentSession()
  if (!session?.cwd) {
    state.activeTab = "settings"
    renderAll()
    showToast(t("toast.chooseWorkspaceFirst"), true)
    return
  }
  if (!file?.type?.startsWith("image/")) {
    showToast(t("toast.onlyImageUploads"), true)
    return
  }
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    showToast(t("toast.imageTooLarge"), true)
    return
  }

  const deviceKeyForUpload = state.activeDeviceKey
  const sessionId = session.id
  const attachmentId = enqueueDraftAttachment(deviceKeyForUpload, sessionId, file)
  updateUploadRuntimeState()
  renderAll()
  let uploadId = null
  const targetDirectory = session.cwd
  try {
    reportClientEvent("info", "image-upload-start", {
      attachment_id: attachmentId,
      name: file.name || null,
      type: file.type || null,
      size: file.size,
      chunk_bytes: IMAGE_UPLOAD_CHUNK_BYTES
    })
    const begin = await rpc("fs.upload.begin", {
      directory: targetDirectory,
      name: file.name || `image-${Date.now()}.png`,
      total_bytes: file.size
    }, {
      timeout: IMAGE_UPLOAD_RPC_TIMEOUT_MS
    })
    uploadId = begin?.upload_id || null
    if (!uploadId) {
      throw new Error("upload session was not created")
    }
    if (!setDraftAttachmentUploadId(sessionId, attachmentId, uploadId)) {
      await rpc("fs.upload.abort", { upload_id: uploadId }, { timeout: 30000 }).catch(() => {})
      return
    }

    for (let offset = 0; offset < file.size; offset += IMAGE_UPLOAD_CHUNK_BYTES) {
      if (!isDraftAttachmentPresent(sessionId, attachmentId)) {
        await rpc("fs.upload.abort", { upload_id: uploadId }, { timeout: 30000 }).catch(() => {})
        return
      }
      const chunk = file.slice(offset, offset + IMAGE_UPLOAD_CHUNK_BYTES)
      const dataBase64 = await blobToBase64(chunk)
      const chunkResult = await rpc("fs.upload.chunk", {
        upload_id: uploadId,
        data_base64: dataBase64
      }, {
        timeout: IMAGE_UPLOAD_RPC_TIMEOUT_MS
      })
      const bytesUploaded = Number(chunkResult?.bytes_written) || Math.min(file.size, offset + chunk.size)
      const progress = file.size > 0 ? Math.min(1, bytesUploaded / file.size) : 1
      if (!updateDraftAttachment(sessionId, attachmentId, {
        bytesUploaded,
        progress,
        status: "uploading"
      })) {
        await rpc("fs.upload.abort", { upload_id: uploadId }, { timeout: 30000 }).catch(() => {})
        return
      }
      renderAll()
    }

    const result = await rpc("fs.upload.commit", {
      upload_id: uploadId
    }, {
      timeout: IMAGE_UPLOAD_RPC_TIMEOUT_MS
    })
    uploadId = null
    markDraftAttachmentReady(sessionId, attachmentId, {
      name: result?.name || file.name || `image-${Date.now()}.png`,
      path: result?.path || pathJoin(targetDirectory, result?.name || file.name || ""),
      size: result?.size || file.size,
      mimeType: file.type || "image/*"
    })
    if (state.runtime.fileBrowser?.current === targetDirectory) {
      await loadFileBrowser(targetDirectory)
    }
    reportClientEvent("info", "image-upload-complete", {
      attachment_id: attachmentId,
      name: result?.name || file.name || null,
      size: result?.size || file.size,
      directory: targetDirectory
    })
    persistSessions()
    showToast(t("toast.uploaded", { name: result?.name || file.name || "image" }))
  } catch (error) {
    if (uploadId) {
      await rpc("fs.upload.abort", { upload_id: uploadId }, { timeout: 30000 }).catch(() => {})
    }
    const removed = !isDraftAttachmentPresent(sessionId, attachmentId)
    const canceled = removed || /canceled/i.test(error?.message || "") || /aborted/i.test(error?.message || "")
    reportClientEvent("error", "image-upload-failed", {
      attachment_id: attachmentId,
      name: file.name || null,
      type: file.type || null,
      size: file.size,
      message: error?.message || String(error)
    })
    if (!removed) {
      markDraftAttachmentFailed(sessionId, attachmentId, error?.message || t("toast.imageUploadFailed"))
      persistSessions()
    }
    if (canceled && !removed) {
      showToast(t("toast.imageUploadCanceled"))
    } else {
      showToast(error?.message || t("toast.imageUploadFailed"), true)
    }
  } finally {
    updateUploadRuntimeState()
    renderAll()
  }
}

async function sendChatMessage(rawText) {
  const text = String(rawText || "").trim()
  const session = currentSession()
  if (!session) return
  if (!session.cwd) {
    state.activeTab = "settings"
    renderAll()
    showToast(t("toast.chooseWorkspaceInSettings"), true)
    return
  }
  if (hasBlockingDraftAttachments(session)) {
    showToast(t("toast.waitForUploads"), true)
    return
  }
  const attachments = [...collectReadyDraftAttachments(session)]
  if (!text && !attachments.length) return
  const messageText = buildChatRequest(text, attachments)

  const userMessage = createMessage("user", text, { attachments })
  const assistantMessage = createMessage("assistant", "")
  session.messages.push(userMessage, assistantMessage)
  session.updatedAt = Date.now()
  session.draftText = ""
  session.composerExpanded = false
  session.draftAttachments = []
  if (session.untitled || UNTITLED_TITLES.has(session.title)) {
    const titleSeed = text || attachments[0]?.name || t("session.new")
    session.title = titleSeed.slice(0, 30)
    session.untitled = false
  }
  persistSessions()
  renderAll()

  try {
    await rpc("chat.stream", {
      thread_id: session.threadId,
      message: messageText,
      cwd: session.cwd,
      yolo: session.yolo
    }, {
      timeout: CHAT_STREAM_RPC_TIMEOUT_MS,
      onStream(event, data) {
        if (event === "thread" && data?.thread_id) {
          session.threadId = data.thread_id
          persistSessions()
          updateChatThreadSubtitle(session)
          renderSessions()
        }
        if (event === "activity" && data) {
          upsertAssistantActivity(assistantMessage, data)
          patchStreamingAssistantMessage(session, assistantMessage)
        }
        if (event === "delta" && data?.delta) {
          appendAssistantDelta(assistantMessage, data.delta)
          patchStreamingAssistantMessage(session, assistantMessage)
        }
      }
    })
    session.updatedAt = Date.now()
    persistSessions()
    renderSessions()
    renderHero()
  } catch (error) {
    appendAssistantDelta(assistantMessage, `${assistantMessage.content ? "\n\n" : ""}${t("error.prefix")}: ${error.message}`)
    persistSessions()
    patchStreamingAssistantMessage(session, assistantMessage)
    showToast(error.message, true)
  }
}

function upsertAssistantActivity(message, activity) {
  if (!message) return
  const next = normalizeActivity(activity)
  if (!next) return
  const hasStartTimestamp = Boolean(activity?.startedAt || activity?.createdAt || activity?.timestamp)
  if (!Array.isArray(message.activities)) {
    message.activities = []
  }
  const index = message.activities.findIndex((entry) => entry.id === next.id)
  if (index >= 0) {
    message.activities[index] = {
      ...message.activities[index],
      ...next,
      createdAt: hasStartTimestamp ? next.createdAt : message.activities[index].createdAt || next.createdAt,
      startedAt: hasStartTimestamp ? next.startedAt : message.activities[index].startedAt || next.startedAt,
      detail: next.detail || message.activities[index].detail || null
    }
  } else {
    message.activities.push(next)
  }
  const segments = ensureMessageSegments(message)
  const segmentIndex = segments.findIndex((segment) => segment.type === "activity" && segment.id === next.id)
  if (segmentIndex >= 0) {
    segments[segmentIndex] = {
      ...segments[segmentIndex],
      ...next,
      createdAt: hasStartTimestamp ? next.createdAt : segments[segmentIndex].createdAt || next.createdAt,
      startedAt: hasStartTimestamp ? next.startedAt : segments[segmentIndex].startedAt || next.startedAt,
      detail: next.detail || segments[segmentIndex].detail || null,
      expanded: Boolean(segments[segmentIndex].expanded)
    }
  } else {
    segments.push({
      type: "activity",
      ...next,
      expanded: false
    })
  }
}

function appendAssistantDelta(message, delta) {
  if (!message || !delta) return
  message.content += delta
  const segments = ensureMessageSegments(message)
  const last = segments[segments.length - 1]
  if (last?.type === "text") {
    last.text += delta
    return
  }
  segments.push({
    type: "text",
    id: randomUuid(),
    text: delta
  })
}

function patchStreamingAssistantMessage(session, message) {
  const activeSession = currentSession()
  if (state.activeTab !== "chats" || !session || !activeSession || activeSession.id !== session.id) return
  const chatWindow = refs.tabContent.querySelector(".chat-window")
  if (!(chatWindow instanceof HTMLElement)) {
    renderAll()
    return
  }
  const shouldStick = isNearBottom(chatWindow)
  const previousScrollTop = chatWindow.scrollTop
  const existing = chatWindow.querySelector(`[data-message-id=\"${message.id}\"]`)
  if (!(existing instanceof HTMLElement)) {
    renderAll()
    return
  }
  existing.outerHTML = renderChatMessageMarkup(message, session)
  const nextChatWindow = refs.tabContent.querySelector(".chat-window")
  if (!(nextChatWindow instanceof HTMLElement)) return
  if (shouldStick) {
    nextChatWindow.scrollTop = nextChatWindow.scrollHeight
  } else {
    nextChatWindow.scrollTop = previousScrollTop
  }
  state.runtime.chatScroll = {
    sessionId: session.id,
    stickToBottom: isNearBottom(nextChatWindow),
    scrollTop: nextChatWindow.scrollTop
  }
}

function updateChatThreadSubtitle(session) {
  const activeSession = currentSession()
  if (state.activeTab !== "chats" || !session || !activeSession || activeSession.id !== session.id) return
  const subtitle = refs.tabContent.querySelector(".chat-shell-subtitle")
  if (subtitle) {
    subtitle.textContent = renderThreadLabel(session)
  }
}

async function rpc(method, body, { onStream, timeout } = {}) {
  if (!state.runtime.authReady && method !== "config.get" && method !== "fs.roots" && method !== "context.catalog") {
    const active = getActiveDevice()
    if (active) {
      await resumeDevice(active, { quiet: true })
    }
  }
  return client.rpc(method, body, { onStream, timeout })
}

function renderAll() {
  ensureSessionForActiveDevice()
  const previousChatWindow = captureChatWindowState()
  renderStatus()
  renderSessions()
  renderHero()
  renderTabs()
  renderDrawer()
  renderTabContent()
  syncChatWindowState(previousChatWindow)
}

function renderStatus() {
  refs.statusPill.className = `status-pill ${state.status.kind}`
  refs.statusPill.textContent = t(state.status.key)
}

function renderHero() {
  const device = getActiveDevice()
  const session = currentSession()
  if (state.activeTab === "devices") {
    refs.heroTitle.textContent = device ? (device.server_name || device.label || t("hero.connectedDevice")) : t("hero.devices")
    refs.heroMeta.textContent = device
      ? t("hero.devicesMetaConnected")
      : t("hero.devicesMetaDefault")
  } else if (state.activeTab === "settings") {
    refs.heroTitle.textContent = t("hero.sessionSettings")
    refs.heroMeta.textContent = device
      ? session?.cwd
        ? t("hero.adjustSession", { title: sessionDisplayTitle(session) })
        : t("hero.chooseFolderForChat")
      : t("hero.connectDesktopFirst")
  } else {
    refs.heroTitle.textContent = sessionDisplayTitle(session)
    refs.heroMeta.textContent = device
      ? session?.cwd
        ? `${device.server_name || device.label || t("device.connected")}`
        : t("hero.chooseFolderBeforeSending")
      : t("hero.openDevicesToPair")
  }
}

function renderTabs() {
  for (const button of document.querySelectorAll(".side-nav [data-tab]")) {
    button.classList.toggle("active", button.dataset.tab === state.activeTab)
  }
}

function renderDrawer() {
  refs.shell.classList.toggle("drawer-open", state.drawerOpen)
  refs.shell.classList.toggle("immersive-chat", state.immersiveChat && state.activeTab === "chats")
  refs.drawerSessionsPanel.classList.toggle("hidden", state.activeTab !== "chats")
  refs.fullscreenBtn.classList.toggle("hidden", state.activeTab !== "chats")
  refs.fullscreenBtn.innerHTML = state.immersiveChat && state.activeTab === "chats" ? iconSvg("fullscreen-exit") : iconSvg("fullscreen")
  refs.fullscreenBtn.title = state.immersiveChat && state.activeTab === "chats" ? t("actions.exitFocus") : t("actions.enterFocus")
  refs.fullscreenBtn.setAttribute("aria-label", state.immersiveChat && state.activeTab === "chats" ? t("actions.exitFocus") : t("actions.enterFocus"))
}

function renderSessions() {
  if (state.activeTab !== "chats") {
    refs.sessionList.innerHTML = ""
    return
  }
  refs.sessionList.innerHTML = renderSessionMenuHtml()
}

function renderTabContent() {
  refs.tabContent.dataset.tabView = state.activeTab
  const device = getActiveDevice()
  if (state.activeTab === "devices") {
    refs.tabContent.innerHTML = renderDevicesTab()
    return
  }

  if (!device) {
    refs.tabContent.innerHTML = `
      <section class="empty-state">
        <p class="eyebrow">${escapeHtml(t("empty.ready"))}</p>
        <h3>${escapeHtml(t("empty.connectDesktopFirst"))}</h3>
        <p class="muted">${escapeHtml(t("empty.connectDesktopMeta"))}</p>
        <div class="row">
          <button class="primary-btn" data-action="open-devices" type="button">${escapeHtml(t("actions.openDevices"))}</button>
        </div>
      </section>
    `
    return
  }

  if (state.runtime.loading && state.activeTab !== "devices") {
    refs.tabContent.innerHTML = `<section class="empty-state"><p class="eyebrow">${escapeHtml(t("sync.syncing"))}</p><h3>${escapeHtml(t("sync.loading"))}</h3><p class="muted">${escapeHtml(t("sync.fetching"))}</p></section>`
    return
  }

  if (state.activeTab === "chats") {
    refs.tabContent.innerHTML = renderChatTab()
    return
  }

  if (state.activeTab === "settings") {
    refs.tabContent.innerHTML = renderSettingsTab()
    return
  }
  refs.tabContent.innerHTML = renderChatTab()
}

function renderThreadLabel(session) {
  return session?.threadId ? t("thread.label", { id: shortId(session.threadId) }) : t("thread.fresh")
}

function renderChatMessageMarkup(message, session) {
  return `
    <article class="chat-message ${message.role}" data-message-id="${escapeHtmlAttr(message.id || "")}">
      <div class="message-meta-row ${message.role}">
        <span class="message-author">${message.role === "user" ? escapeHtml(t("message.you")) : escapeHtml(t("message.codex"))}</span>
        <span class="message-time">${escapeHtml(formatTime(message.createdAt || session?.updatedAt || null) || t("time.now"))}</span>
      </div>
      <div class="message-bubble ${message.role}">
        ${
          message.attachments?.length
            ? `<div class="message-attachments">${message.attachments.map((attachment) => renderAttachmentChip(attachment)).join("")}</div>`
            : ""
        }
        ${renderMessageContentMarkup(message)}
      </div>
    </article>
  `
}

function renderMessageContentMarkup(message) {
  if (message.role === "assistant" && state.chatDisplayMode === "standard") {
    return renderAssistantTimelineMarkup(message)
  }
  if (!message.content && message.role !== "assistant") return ""
  return `<div class="message-body">${escapeHtml(message.content || t("chat.thinking"))}</div>`
}

function renderAssistantTimelineMarkup(message) {
  const segments = getRenderableMessageSegments(message)
  if (!segments.length) {
    return `<div class="message-body">${escapeHtml(message.content || t("chat.thinking"))}</div>`
  }
  return `
    <div class="message-timeline">
      ${segments.map((segment) => renderMessageSegmentMarkup(segment)).join("")}
    </div>
  `
}

function renderMessageSegmentMarkup(segment) {
  if (!segment || typeof segment !== "object") return ""
  if (segment.type === "text") {
    if (!segment.text) return ""
    return `<div class="message-body message-segment-text">${escapeHtml(segment.text)}</div>`
  }
  if (segment.type === "activity") {
    return renderActivitySegmentMarkup(segment)
  }
  return ""
}

function renderActivitySegmentMarkup(activity) {
  const normalized = normalizeActivity(activity)
  if (!normalized) return ""
  const label = t(`activity.${normalized.kind}`)
  const elapsed = formatActivityElapsed(normalized)
  const detailMarkup = renderActivityDetailMarkup(normalized)
  const summaryMarkup = `
    <summary class="message-activity-summary">
      <span class="message-activity-summary-main">
        <span class="message-activity-dot" aria-hidden="true"></span>
        <span class="message-activity-text">${escapeHtml(label)}</span>
      </span>
      <span class="message-activity-summary-side">
        <span
          class="message-activity-elapsed"
          data-activity-elapsed="true"
          data-started-at="${escapeHtmlAttr(normalized.startedAt || normalized.createdAt || "")}"
          data-completed-at="${escapeHtmlAttr(normalized.completedAt || "")}"
        >${escapeHtml(elapsed)}</span>
        <span class="message-activity-chevron" aria-hidden="true"></span>
      </span>
    </summary>
  `
  return `
    <details
      class="message-activity-card ${escapeHtmlAttr(normalized.status)}"
      data-activity-id="${escapeHtmlAttr(normalized.id)}"
      ${normalized.expanded ? "open" : ""}
    >
      ${summaryMarkup}
      <div class="message-activity-detail">
        ${detailMarkup}
      </div>
    </details>
  `
}

function renderActivityDetailMarkup(activity) {
  const detail = activity.detail || null
  if (!detail) {
    return `<p class="message-activity-detail-empty muted">${escapeHtml(activity.kind === "thinking" ? t("activity.detailEncrypted") : t("activity.detailNone"))}</p>`
  }
  const parts = []
  if (detail.summary) {
    parts.push(`<p class="message-activity-summary-text">${escapeHtml(detail.summary)}</p>`)
  }
  if (detail.command) {
    parts.push(renderActivityDetailSection(t("activity.detailCommand"), `<pre>${escapeHtml(detail.command)}</pre>`))
  }
  if (detail.cwd) {
    parts.push(renderActivityDetailSection(t("activity.detailCwd"), `<code>${escapeHtml(detail.cwd)}</code>`))
  }
  if (detail.query) {
    parts.push(renderActivityDetailSection(t("activity.detailQuery"), `<code>${escapeHtml(detail.query)}</code>`))
  }
  if (Array.isArray(detail.paths) && detail.paths.length) {
    parts.push(renderActivityDetailSection(t("activity.detailFiles"), detail.paths.map((path) => `<code>${escapeHtml(path)}</code>`).join("")))
  }
  const stats = []
  if (detail.exitCode != null) {
    stats.push(`<span class="message-activity-stat"><strong>${escapeHtml(t("activity.detailExitCode"))}</strong><span>${escapeHtml(String(detail.exitCode))}</span></span>`)
  }
  if (detail.durationMs != null) {
    stats.push(`<span class="message-activity-stat"><strong>${escapeHtml(t("activity.detailDuration"))}</strong><span>${escapeHtml(formatDuration(detail.durationMs))}</span></span>`)
  }
  if (stats.length) {
    parts.push(`<div class="message-activity-stats">${stats.join("")}</div>`)
  }
  if (detail.output) {
    parts.push(renderActivityDetailSection(t("activity.detailOutput"), `<pre>${escapeHtml(detail.output)}</pre>`))
  }
  if (!parts.length) {
    return `<p class="message-activity-detail-empty muted">${escapeHtml(t("activity.detailNone"))}</p>`
  }
  return parts.join("")
}

function renderActivityDetailSection(label, bodyMarkup) {
  return `
    <section class="message-activity-detail-section">
      <div class="message-activity-detail-label">${escapeHtml(label)}</div>
      <div class="message-activity-detail-value">${bodyMarkup}</div>
    </section>
  `
}

function renderChatTab() {
  const session = currentSession()
  const messages = session?.messages || []
  const device = getActiveDevice()
  const threadLabel = renderThreadLabel(session)
  const workspaceReady = Boolean(session?.cwd)
  const draftAttachments = session?.draftAttachments || []
  const draftText = session?.draftText || ""
  const hasUploadInFlight = hasUploadingDraftAttachments(session)
  const hasBlockingAttachments = hasBlockingDraftAttachments(session)
  const composerExpanded = Boolean(session?.composerExpanded || draftAttachments.length)
  const composerToggleLabel = composerExpanded ? t("actions.collapseComposer") : t("actions.expandComposer")
  const chatDisplayLabel = state.chatDisplayMode === "standard" ? t("display.modeStandard") : t("display.modeCompact")
  return `
    <section class="chat-layout chat-page single-pane">
      <div class="chat-shell">
        <div class="chat-shell-head">
          <div class="chat-shell-title">
            <h3>${escapeHtml(sessionDisplayTitle(session))}</h3>
            <div class="chat-shell-subtitle">${escapeHtml(threadLabel)}</div>
          </div>
          <div class="chat-shell-head-actions">
            <button class="ghost-btn chat-mode-btn" data-action="toggle-chat-display" type="button" aria-label="${escapeHtmlAttr(t("actions.toggleChatDisplay"))}" title="${escapeHtmlAttr(t("actions.toggleChatDisplay"))}">${escapeHtml(chatDisplayLabel)}</button>
            ${
              state.immersiveChat
                ? `<button class="ghost-btn icon-btn" data-action="toggle-immersive-chat" type="button" aria-label="${escapeHtmlAttr(t("actions.exitFocus"))}" title="${escapeHtmlAttr(t("actions.exitFocus"))}">${iconSvg("fullscreen-exit")}</button>`
                : ""
            }
            <button class="ghost-btn icon-btn chat-settings-btn" data-action="open-settings" type="button" aria-label="${escapeHtmlAttr(t("actions.openSettings"))}" title="${escapeHtmlAttr(t("actions.openSettings"))}">${iconSvg("settings")}</button>
          </div>
        </div>

        <div class="chat-window">
          <div class="chat-timeline-chip">${escapeHtml(device?.server_name || device?.label || t("device.connected"))}</div>
          ${
            !workspaceReady
              ? `
                <article class="chat-empty-state">
                  <strong>${escapeHtml(t("chat.chooseFolderFirst"))}</strong>
                  <p class="muted">${escapeHtml(t("chat.chooseFolderMeta"))}</p>
                  <div class="chat-suggestion-list">
                    <button class="suggestion-chip" type="button" data-action="open-settings">${escapeHtml(t("actions.openSettings"))}</button>
                  </div>
                </article>
              `
              : messages.length
              ? messages
                  .map((message) => renderChatMessageMarkup(message, session))
                  .join("")
              : `
                <article class="chat-empty-state">
                  <strong>${escapeHtml(t("chat.startThread"))}</strong>
                  <p class="muted">${escapeHtml(t("chat.startThreadMeta"))}</p>
                  <div class="chat-suggestion-list">
                    <button class="suggestion-chip" type="button" data-action="use-prompt" data-prompt="${escapeHtmlAttr(t("prompt.summarizeRepoText"))}">${escapeHtml(t("prompt.summarizeRepo"))}</button>
                    <button class="suggestion-chip" type="button" data-action="use-prompt" data-prompt="${escapeHtmlAttr(t("prompt.explainAppText"))}">${escapeHtml(t("prompt.explainApp"))}</button>
                    <button class="suggestion-chip" type="button" data-action="use-prompt" data-prompt="${escapeHtmlAttr(t("prompt.findPairingText"))}">${escapeHtml(t("prompt.findPairing"))}</button>
                  </div>
                </article>
              `
          }
        </div>

        <form id="chatComposer" class="chat-composer">
          <div class="chat-composer-shell${composerExpanded ? " expanded" : " compact"}">
            ${
              draftAttachments.length
                ? `
                  <div class="composer-attachments">
                    ${draftAttachments.map((attachment) => renderAttachmentChip(attachment, { removable: true, draft: true })).join("")}
                  </div>
                `
                : ""
            }
            <textarea id="messageInput" rows="${composerExpanded ? 4 : 1}" ${workspaceReady ? "" : "disabled"} placeholder="${escapeHtmlAttr(workspaceReady ? t("composer.placeholderReady") : t("composer.placeholderNoWorkspace"))}">${escapeHtml(draftText)}</textarea>
            <div class="chat-composer-bar">
              <div class="chat-composer-tools">
                <button class="ghost-btn icon-btn" data-action="pick-image" type="button" aria-label="${escapeHtmlAttr(t("actions.uploadImage"))}" title="${escapeHtmlAttr(t("actions.uploadImage"))}" ${workspaceReady && !hasUploadInFlight ? "" : "disabled"}>${iconSvg("image")}</button>
                <button class="ghost-btn icon-btn" data-action="toggle-composer" type="button" aria-label="${escapeHtmlAttr(composerToggleLabel)}" title="${escapeHtmlAttr(composerToggleLabel)}">${iconSvg(composerExpanded ? "collapse" : "expand")}</button>
                <input id="imageUploadInput" class="hidden" type="file" accept="image/*" />
              </div>
              <button class="primary-btn icon-btn chat-send-btn" data-action="send-message" type="button" aria-label="${escapeHtmlAttr(t("actions.send"))}" title="${escapeHtmlAttr(t("actions.send"))}" ${workspaceReady && !hasBlockingAttachments ? "" : "disabled"}>${iconSvg("send")}</button>
            </div>
          </div>
        </form>
      </div>
    </section>
  `
}

function renderSettingsTab() {
  const browser = state.runtime.fileBrowser
  const session = currentSession()
  const currentPath = browser?.current || state.runtime.config?.codex_home || state.runtime.roots[0]?.path || ""
  const parentLabel = browser?.parent ? shortPath(browser.parent) : t("settings.root")

  return `
    <section class="settings-page">
      <div class="content-block settings-main">
        <div class="section-head">
          <div>
            <p class="eyebrow">${escapeHtml(t("settings.chat"))}</p>
            <h3>${escapeHtml(sessionDisplayTitle(session))}</h3>
          </div>
          <div class="row">
            <button class="ghost-btn" type="button" data-action="back-to-chat">${escapeHtml(t("actions.back"))}</button>
          </div>
        </div>

        <div class="settings-stack">
          <article class="info-card workspace-status">
            <div class="current-folder-head">
              <div>
                <p class="eyebrow">${escapeHtml(t("settings.mode"))}</p>
                <strong>${escapeHtml(session?.yolo ? t("settings.modeYolo") : t("settings.modeGuarded"))}</strong>
                <div class="meta-copy">${escapeHtml(session?.yolo ? t("settings.modeYoloMeta") : t("settings.modeGuardedMeta"))}</div>
              </div>
              <div class="row current-folder-actions">
                <button class="ghost-btn" type="button" data-action="toggle-mode">${escapeHtml(session?.yolo ? t("actions.useGuarded") : t("actions.useYolo"))}</button>
              </div>
            </div>
          </article>

          <article class="info-card workspace-status">
            <div class="current-folder-head">
              <div>
                <p class="eyebrow">${escapeHtml(t("settings.selected"))}</p>
                <strong>${escapeHtml(shortPath(session?.cwd || t("settings.selectedEmpty")))}</strong>
                <div class="meta-copy">${escapeHtml(session?.cwd ? t("settings.chatReadyForFolder") : t("settings.chooseFolderToUnlock"))}</div>
              </div>
              <div class="row current-folder-actions">
                <button class="ghost-btn" type="button" data-action="workspace-clear" ${session?.cwd ? "" : "disabled"}>${escapeHtml(t("actions.clear"))}</button>
                <button class="ghost-btn" type="button" data-action="file-open" data-path="${escapeHtmlAttr(session?.cwd || "")}" ${session?.cwd ? "" : "disabled"}>${escapeHtml(t("actions.open"))}</button>
              </div>
            </div>
          </article>

          <section class="folder-browser-shell">
            <article class="file-row current-folder-card">
              <div class="current-folder-head">
                <div>
                  <p class="eyebrow">${escapeHtml(t("settings.currentFolder"))}</p>
                  <strong>${escapeHtml(shortPath(currentPath || t("settings.selectedEmpty")))}</strong>
                  <div class="file-meta">${browser ? escapeHtml(t("settings.browsing", { parent: parentLabel })) : escapeHtml(t("settings.openDesktopFolderSource"))}</div>
                </div>
                <div class="row current-folder-actions">
                  <button class="primary-btn" type="button" data-action="file-select-workspace" data-path="${escapeHtmlAttr(currentPath)}" ${currentPath ? "" : "disabled"}>${escapeHtml(t("actions.use"))}</button>
                  <button class="ghost-btn icon-btn" type="button" data-action="file-up" aria-label="${escapeHtmlAttr(t("actions.up"))}" title="${escapeHtmlAttr(t("actions.up"))}" ${browser?.parent ? "" : "disabled"}>${iconSvg("back")}</button>
                  <button class="ghost-btn icon-btn" type="button" data-action="file-home" aria-label="${escapeHtmlAttr(t("actions.home"))}" title="${escapeHtmlAttr(t("actions.home"))}">${iconSvg("home")}</button>
                  <button class="ghost-btn icon-btn" type="button" data-action="file-refresh" aria-label="${escapeHtmlAttr(t("actions.refresh"))}" title="${escapeHtmlAttr(t("actions.refresh"))}">${iconSvg("refresh")}</button>
                </div>
              </div>
            </article>

            <div class="file-browser">
              ${
                browser
                  ? browser.directories.length
                    ? browser.directories
                        .map(
                          (directory) => `
                            <button class="file-row folder-entry" type="button" data-action="file-open" data-path="${escapeHtmlAttr(directory.path)}">
                              <span class="file-link">${escapeHtml(directory.name)}</span>
                            </button>
                          `
                        )
                        .join("")
                    : `<div class="empty-inline muted">${escapeHtml(t("settings.noSubfolders"))}</div>`
                  : `<div class="empty-inline muted">${escapeHtml(t("settings.folderBrowserNotReady"))}</div>`
              }
            </div>
          </section>
        </div>
      </div>
    </section>
  `
}

function renderAttachmentChip(attachment, { removable = false, draft = false } = {}) {
  if (!attachment) return ""
  const status = attachment.status || "ready"
  const removableLabel = status === "uploading" || status === "canceling" ? t("actions.cancelUpload") : t("actions.removeAttachment")
  const progressValue = Math.max(0, Math.min(100, Math.round((Number(attachment.progress) || 0) * 100)))
  const meta = attachmentMetaLabel(attachment)
  const preview = attachmentPreviewMarkup(attachment)
  return `
    <div class="attachment-chip${removable ? " removable" : ""}${draft ? " draft" : ""}${status !== "ready" ? ` is-${status}` : ""}">
      <div class="attachment-chip-media">
        ${preview}
        ${
          status === "uploading" || status === "canceling"
            ? `
              <div class="attachment-chip-overlay">
                <div class="attachment-progress-ring" style="--progress:${progressValue / 100}">
                  <span>${progressValue}%</span>
                </div>
              </div>
            `
            : status === "failed"
            ? `<div class="attachment-chip-overlay error"><span>!</span></div>`
            : ""
        }
      </div>
      <div class="attachment-chip-copy">
        <span class="attachment-chip-name">${escapeHtml(attachment.name || "image")}</span>
        <span class="attachment-chip-meta">${escapeHtml(meta)}</span>
      </div>
      ${
        removable
          ? `<button class="attachment-remove-btn" type="button" data-action="remove-attachment" data-attachment-id="${escapeHtmlAttr(attachment.id || "")}" aria-label="${escapeHtmlAttr(removableLabel)}" title="${escapeHtmlAttr(removableLabel)}">×</button>`
          : ""
      }
    </div>
  `
}

function renderDevicesTab() {
  return `
    <section class="device-page">
      <div class="content-block">
        <div class="section-head">
          <div>
            <p class="eyebrow">${escapeHtml(t("devices.add"))}</p>
            <h3>${escapeHtml(t("devices.pairDevice"))}</h3>
          </div>
        </div>
        <form id="pairForm" class="stack-form">
          <label class="field">
            <span>${escapeHtml(t("form.pairCode"))}</span>
            <input id="pairCodeInput" name="pairCode" type="text" maxlength="6" autocomplete="one-time-code" placeholder="${escapeHtmlAttr(t("form.pairCodePlaceholder"))}" />
          </label>
          <label class="field">
            <span>${escapeHtml(t("form.deviceLabel"))}</span>
            <input id="pairNameInput" name="pairName" type="text" maxlength="64" value="${escapeHtmlAttr(defaultDeviceName())}" placeholder="${escapeHtmlAttr(t("form.deviceLabelPlaceholder"))}" />
          </label>
          <button class="primary-btn" type="submit">${escapeHtml(t("actions.pairBrowser"))}</button>
        </form>
      </div>

      <div class="content-block">
        <div class="section-head">
          <div>
            <p class="eyebrow">${escapeHtml(t("devices.saved"))}</p>
            <h3>${escapeHtml(t("devices.trusted"))}</h3>
          </div>
        </div>
        <div class="device-list device-list-page">${renderDeviceCardsHtml()}</div>
      </div>
    </section>
  `
}

function renderDeviceCardsHtml() {
  if (state.devices.length === 0) {
    return `<div class="empty-inline muted">${escapeHtml(t("devices.none"))}</div>`
  }

  return state.devices
    .map((device) => {
      const key = deviceKey(device)
      const isActive = key === state.activeDeviceKey
      return `
        <article class="device-card${isActive ? " active" : ""}">
          <div class="card-title">
            <div>
              <strong>${escapeHtml(device.label || device.server_name || t("devices.pairedDevice"))}</strong>
              <div class="meta-copy">${escapeHtml(device.server_name || t("devices.unknownHost"))}</div>
            </div>
            <span class="mini-code">${escapeHtml(shortId(device.device_id || ""))}</span>
          </div>
          <div class="meta-copy">${escapeHtml(t("devices.installation", { id: shortId(device.installation_id || "") }))} · ${escapeHtml(t("devices.lastSeen", { time: formatDate(device.last_seen_at) }))}</div>
          <div class="card-actions">
            <button class="ghost-btn" type="button" data-device-action="activate" data-device-key="${key}">${escapeHtml(t("actions.connect"))}</button>
            <button class="ghost-btn danger-btn" type="button" data-device-action="forget" data-device-key="${key}">${escapeHtml(t("actions.forget"))}</button>
          </div>
        </article>
      `
    })
    .join("")
}

function renderSessionMenuHtml() {
  const sessions = [...currentSessions()].sort((a, b) => b.updatedAt - a.updatedAt)
  if (!sessions.length) {
    return `<div class="empty-inline muted">${escapeHtml(t("sessions.none"))}</div>`
  }
  const activeSessionId = getActiveSessionId()
  return sessions
    .map((session) => `
      <button class="session-card${session.id === activeSessionId ? " active" : ""}" type="button" data-session-id="${session.id}">
        <div class="card-title">
          <strong>${escapeHtml(sessionDisplayTitle(session))}</strong>
          <span class="mini-code">${escapeHtml(session.yolo ? t("settings.modeYolo") : t("settings.modeGuarded"))}</span>
        </div>
        <div class="meta-copy">${escapeHtml(formatTime(session.updatedAt) || t("time.now"))}</div>
      </button>
    `)
    .join("")
}

function ensureSessionForActiveDevice() {
  const key = state.activeDeviceKey
  if (!key) return
  let changed = false
  if (!Array.isArray(state.sessionsByDevice[key]) || state.sessionsByDevice[key].length === 0) {
    state.sessionsByDevice[key] = [buildSession()]
    state.activeSessionIds[key] = state.sessionsByDevice[key][0].id
    changed = true
  }
  for (const session of state.sessionsByDevice[key]) {
    changed = ensureSessionShape(session) || changed
  }
  if (!state.activeSessionIds[key]) {
    state.activeSessionIds[key] = state.sessionsByDevice[key][0].id
    changed = true
  }
  if (changed) {
    persistSessions()
  }
}

function createSession() {
  const key = state.activeDeviceKey
  if (!key) {
    showToast(t("toast.selectDeviceFirst"), true)
    return null
  }
  const session = buildSession()
  state.sessionsByDevice[key] = [session, ...(state.sessionsByDevice[key] || [])]
  return session
}

function buildSession() {
  return {
    id: randomUuid(),
    title: t("session.new"),
    untitled: true,
    threadId: null,
    cwd: "",
    yolo: false,
    draftText: "",
    composerExpanded: false,
    draftAttachments: [],
    messages: [],
    updatedAt: Date.now()
  }
}

function currentSessions() {
  return state.activeDeviceKey ? state.sessionsByDevice[state.activeDeviceKey] || [] : []
}

function currentSession() {
  const sessions = currentSessions()
  const activeId = getActiveSessionId()
  return sessions.find((session) => session.id === activeId) || sessions[0] || null
}

function getActiveSessionId() {
  return state.activeDeviceKey ? state.activeSessionIds[state.activeDeviceKey] || null : null
}

function setActiveSessionId(sessionId) {
  if (!state.activeDeviceKey) return
  state.activeSessionIds[state.activeDeviceKey] = sessionId
  storageSet(STORAGE_KEYS.activeSessionIds, JSON.stringify(state.activeSessionIds))
}

function getActiveDevice() {
  return findDeviceByKey(state.activeDeviceKey)
}

function setActiveDevice(device) {
  state.activeDeviceKey = deviceKey(device)
  storageSet(STORAGE_KEYS.activeDeviceKey, state.activeDeviceKey)
  ensureSessionForActiveDevice()
}

function upsertDevice(nextDevice) {
  const key = deviceKey(nextDevice)
  const existingIndex = state.devices.findIndex((device) => deviceKey(device) === key)
  if (existingIndex >= 0) {
    state.devices[existingIndex] = { ...state.devices[existingIndex], ...nextDevice }
  } else {
    state.devices.unshift(nextDevice)
  }
  persistDevices()
  return state.devices.find((device) => deviceKey(device) === key)
}

function findDeviceByKey(key) {
  return state.devices.find((device) => deviceKey(device) === key) || null
}

function persistDevices() {
  storageSet(STORAGE_KEYS.devices, JSON.stringify(state.devices))
}

function persistSessions() {
  storageSet(STORAGE_KEYS.sessionsByDevice, JSON.stringify(serializeSessionsByDevice()))
  storageSet(STORAGE_KEYS.activeSessionIds, JSON.stringify(state.activeSessionIds))
}

function emptyRuntime() {
  return {
    ready: false,
    loading: false,
    authReady: false,
    uploadingImage: false,
    config: null,
    roots: [],
    fileBrowser: null,
    gitInspect: null,
    gitBranches: null,
    gitLog: null,
    contextCatalog: null,
    chatScroll: {
      sessionId: null,
      stickToBottom: true,
      scrollTop: 0
    }
  }
}

function createMessage(role, content, extras = {}) {
  return {
    id: randomUuid(),
    role,
    content,
    activities: Array.isArray(extras.activities) ? extras.activities.map((activity) => normalizeActivity(activity)).filter(Boolean) : [],
    segments: Array.isArray(extras.segments) ? extras.segments.map((segment) => normalizeMessageSegment(segment)).filter(Boolean) : buildMessageSegments({ role, content, activities: extras.activities || [] }),
    attachments: Array.isArray(extras.attachments) ? extras.attachments.map((attachment) => ({ ...attachment, status: "ready" })) : [],
    createdAt: new Date().toISOString()
  }
}

function buildChatRequest(text, attachments) {
  if (!attachments.length) return text
  const lead = text || "Please inspect the attached image files and respond."
  const attachmentLines = attachments
    .map((attachment) => `- ${attachment.name} (${attachment.path})`)
    .join("\n")
  return `${lead}\n\nAttached image files in the current workspace:\n${attachmentLines}\nUse these files as context for this request.`
}

function ensureSessionShape(session) {
  if (!session || typeof session !== "object") return false
  let changed = false
  if (!Array.isArray(session.messages)) {
    session.messages = []
    changed = true
  } else {
    const normalizedMessages = session.messages.map((message) => normalizeMessage(message))
    if (JSON.stringify(normalizedMessages) !== JSON.stringify(session.messages)) {
      session.messages = normalizedMessages
      changed = true
    }
  }
  if (!Array.isArray(session.draftAttachments)) {
    session.draftAttachments = []
    changed = true
  } else {
    const normalizedDraftAttachments = session.draftAttachments
      .map((attachment) => normalizeAttachment(attachment, { draft: true }))
      .filter(Boolean)
    if (JSON.stringify(normalizedDraftAttachments) !== JSON.stringify(session.draftAttachments)) {
      session.draftAttachments = normalizedDraftAttachments
      changed = true
    }
  }
  if (typeof session.draftText !== "string") {
    session.draftText = ""
    changed = true
  }
  if (typeof session.composerExpanded !== "boolean") {
    session.composerExpanded = false
    changed = true
  }
  if (typeof session.untitled !== "boolean") {
    session.untitled = UNTITLED_TITLES.has(session.title || "")
    changed = true
  }
  return changed
}

function serializeSessionsByDevice() {
  const next = {}
  for (const [key, sessions] of Object.entries(state.sessionsByDevice || {})) {
    next[key] = Array.isArray(sessions)
      ? sessions.map((session) => ({
          ...session,
          draftAttachments: (session.draftAttachments || [])
            .map((attachment) => normalizeAttachment(attachment, { draft: true }))
            .filter((attachment) => attachment && attachment.status !== "uploading" && attachment.status !== "canceling")
            .map((attachment) => serializeAttachment(attachment)),
          messages: (session.messages || []).map((message) => ({
            ...message,
            attachments: (message.attachments || []).map((attachment) => serializeAttachment(normalizeAttachment(attachment)))
          }))
        }))
      : []
  }
  return next
}

function normalizeMessage(message) {
  if (!message || typeof message !== "object") {
    return createMessage("assistant", "")
  }
  const activities = Array.isArray(message.activities) ? message.activities.map((activity) => normalizeActivity(activity)).filter(Boolean) : []
  return {
    ...message,
    activities,
    segments: buildMessageSegments({
      ...message,
      activities
    }),
    attachments: Array.isArray(message.attachments) ? message.attachments.map((attachment) => normalizeAttachment(attachment)).filter(Boolean) : []
  }
}

function normalizeActivity(activity) {
  if (!activity || typeof activity !== "object") return null
  const kind = typeof activity.kind === "string" && activity.kind ? activity.kind : "work"
  const status = activity.status === "completed" ? "completed" : "running"
  return {
    id: activity.id || randomUuid(),
    kind,
    status,
    createdAt: normalizeTimestampValue(activity.createdAt) || new Date().toISOString(),
    startedAt: normalizeTimestampValue(activity.startedAt || activity.createdAt) || new Date().toISOString(),
    completedAt: status === "completed" ? normalizeTimestampValue(activity.completedAt) || normalizeTimestampValue(activity.createdAt) || new Date().toISOString() : "",
    detail: normalizeActivityDetail(activity.detail),
    expanded: Boolean(activity.expanded)
  }
}

function buildMessageSegments(message) {
  if (Array.isArray(message?.segments) && message.segments.length) {
    return message.segments.map((segment) => normalizeMessageSegment(segment)).filter(Boolean)
  }
  const segments = []
  if (Array.isArray(message?.activities)) {
    for (const activity of message.activities) {
      const normalized = normalizeActivity(activity)
      if (!normalized) continue
      segments.push({
        type: "activity",
        ...normalized
      })
    }
  }
  if (typeof message?.content === "string" && message.content) {
    segments.push({
      type: "text",
      id: randomUuid(),
      text: message.content
    })
  }
  return segments
}

function ensureMessageSegments(message) {
  if (!message) return []
  if (!Array.isArray(message.segments)) {
    message.segments = buildMessageSegments(message)
  }
  return message.segments
}

function getRenderableMessageSegments(message) {
  return ensureMessageSegments(message)
    .map((segment) => normalizeMessageSegment(segment))
    .filter(Boolean)
}

function normalizeMessageSegment(segment) {
  if (!segment || typeof segment !== "object") return null
  if (segment.type === "text") {
    const text = typeof segment.text === "string" ? segment.text : ""
    if (!text) return null
    return {
      type: "text",
      id: segment.id || randomUuid(),
      text
    }
  }
  if (segment.type === "activity" || segment.kind) {
    const normalized = normalizeActivity(segment)
    if (!normalized) return null
    return {
      type: "activity",
      ...normalized
    }
  }
  return null
}

function normalizeActivityDetail(detail) {
  if (!detail || typeof detail !== "object") return null
  const next = {}
  if (typeof detail.summary === "string" && detail.summary.trim()) next.summary = detail.summary.trim()
  if (typeof detail.command === "string" && detail.command.trim()) next.command = detail.command.trim()
  if (typeof detail.cwd === "string" && detail.cwd.trim()) next.cwd = detail.cwd.trim()
  if (typeof detail.query === "string" && detail.query.trim()) next.query = detail.query.trim()
  if (typeof detail.output === "string" && detail.output.trim()) next.output = detail.output.trim()
  if (Array.isArray(detail.paths)) {
    const paths = detail.paths.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean)
    if (paths.length) next.paths = paths
  }
  if (detail.exitCode != null && Number.isFinite(Number(detail.exitCode))) next.exitCode = Number(detail.exitCode)
  if (detail.durationMs != null && Number.isFinite(Number(detail.durationMs))) next.durationMs = Math.max(0, Math.round(Number(detail.durationMs)))
  if (detail.encrypted === true) next.encrypted = true
  return Object.keys(next).length ? next : null
}

function normalizeTimestampValue(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString()
}

function normalizeAttachment(attachment, { draft = false } = {}) {
  if (!attachment || typeof attachment !== "object") return null
  const status = draft ? normalizeAttachmentStatus(attachment.status) : "ready"
  return {
    id: attachment.id || randomUuid(),
    name: attachment.name || "image",
    path: attachment.path || "",
    size: Number(attachment.size) || 0,
    mimeType: attachment.mimeType || "image/*",
    status,
    progress: Number.isFinite(Number(attachment.progress)) ? clamp01(Number(attachment.progress)) : status === "ready" ? 1 : 0,
    bytesUploaded: Number(attachment.bytesUploaded) || 0,
    error: typeof attachment.error === "string" ? attachment.error : "",
    previewUrl: typeof attachment.previewUrl === "string" ? attachment.previewUrl : "",
    uploadId: typeof attachment.uploadId === "string" ? attachment.uploadId : "",
    createdAt: attachment.createdAt || Date.now()
  }
}

function normalizeAttachmentStatus(status) {
  if (status === "uploading" || status === "canceling" || status === "failed" || status === "ready") {
    return status
  }
  return "ready"
}

function serializeAttachment(attachment) {
  if (!attachment) return null
  return {
    id: attachment.id,
    name: attachment.name,
    path: attachment.path || "",
    size: Number(attachment.size) || 0,
    mimeType: attachment.mimeType || "image/*",
    status: attachment.status === "failed" ? "failed" : "ready",
    error: attachment.status === "failed" ? attachment.error || "" : ""
  }
}

function clearDraftAttachments(session) {
  if (!session) return
  for (const attachment of session.draftAttachments || []) {
    revokeAttachmentPreview(attachment)
  }
  session.draftAttachments = []
  updateUploadRuntimeState()
}

function revokeAttachmentPreview(attachment) {
  if (!attachment?.previewUrl) return
  if (!attachment.previewUrl.startsWith("blob:")) return
  try {
    URL.revokeObjectURL(attachment.previewUrl)
  } catch {}
}

function enqueueDraftAttachment(deviceKey, sessionId, file) {
  const record = findSessionRecord(deviceKey, sessionId)
  if (!record?.session) {
    throw new Error("session not found for upload")
  }
  const attachment = normalizeAttachment({
    id: randomUuid(),
    name: file.name || `image-${Date.now()}.png`,
    size: file.size,
    mimeType: file.type || "image/*",
    status: "uploading",
    progress: 0,
    bytesUploaded: 0,
    previewUrl: createAttachmentPreviewUrl(file),
    createdAt: Date.now()
  }, { draft: true })
  record.session.draftAttachments = [...(record.session.draftAttachments || []), attachment]
  persistSessions()
  return attachment.id
}

function createAttachmentPreviewUrl(file) {
  try {
    return URL.createObjectURL(file)
  } catch {
    return ""
  }
}

function updateDraftAttachment(sessionId, attachmentId, patch) {
  const attachment = findDraftAttachment(sessionId, attachmentId)
  if (!attachment) return false
  Object.assign(attachment, patch)
  persistSessions()
  return true
}

function setDraftAttachmentUploadId(sessionId, attachmentId, uploadId) {
  return updateDraftAttachment(sessionId, attachmentId, { uploadId })
}

function markDraftAttachmentReady(sessionId, attachmentId, patch) {
  return updateDraftAttachment(sessionId, attachmentId, {
    ...patch,
    status: "ready",
    progress: 1,
    bytesUploaded: Number(patch?.size) || 0,
    error: "",
    uploadId: ""
  })
}

function markDraftAttachmentFailed(sessionId, attachmentId, errorMessage) {
  return updateDraftAttachment(sessionId, attachmentId, {
    status: "failed",
    error: errorMessage || "",
    uploadId: ""
  })
}

async function removeDraftAttachment(sessionId, attachmentId) {
  if (!sessionId || !attachmentId) return
  const record = findSessionRecordBySessionId(sessionId)
  const session = record?.session
  if (!session) return
  const attachment = findDraftAttachment(sessionId, attachmentId)
  if (!attachment) return
  const uploadId = attachment.uploadId
  const shouldCancel = attachment.status === "uploading" || attachment.status === "canceling"
  revokeAttachmentPreview(attachment)
  session.draftAttachments = (session.draftAttachments || []).filter((item) => item.id !== attachmentId)
  updateUploadRuntimeState()
  persistSessions()
  renderAll()
  if (shouldCancel && uploadId) {
    await rpc("fs.upload.abort", { upload_id: uploadId }, { timeout: 30000 }).catch(() => {})
    showToast(t("toast.imageUploadCanceled"))
  }
}

function findSessionRecord(deviceKey, sessionId) {
  if (!deviceKey || !sessionId) return null
  const sessions = state.sessionsByDevice[deviceKey] || []
  const session = sessions.find((candidate) => candidate.id === sessionId) || null
  return session ? { deviceKey, session } : null
}

function findSessionRecordBySessionId(sessionId) {
  for (const [deviceKey, sessions] of Object.entries(state.sessionsByDevice || {})) {
    const session = (sessions || []).find((candidate) => candidate.id === sessionId)
    if (session) {
      return { deviceKey, session }
    }
  }
  return null
}

function findDraftAttachment(sessionId, attachmentId) {
  const session = findSessionRecordBySessionId(sessionId)?.session
  return session?.draftAttachments?.find((attachment) => attachment.id === attachmentId) || null
}

function isDraftAttachmentPresent(sessionId, attachmentId) {
  return Boolean(findDraftAttachment(sessionId, attachmentId))
}

function collectReadyDraftAttachments(session) {
  return (session?.draftAttachments || []).filter((attachment) => (attachment.status || "ready") === "ready")
}

function hasUploadingDraftAttachments(session) {
  return (session?.draftAttachments || []).some((attachment) => {
    const status = attachment.status || "ready"
    return status === "uploading" || status === "canceling"
  })
}

function hasBlockingDraftAttachments(session) {
  return (session?.draftAttachments || []).some((attachment) => (attachment.status || "ready") !== "ready")
}

function updateUploadRuntimeState() {
  state.runtime.uploadingImage = Object.values(state.sessionsByDevice || {}).some((sessions) =>
    (sessions || []).some((session) => hasUploadingDraftAttachments(session))
  )
}

function attachmentMetaLabel(attachment) {
  const status = attachment.status || "ready"
  if (status === "uploading" || status === "canceling") {
    const progressValue = Math.max(0, Math.min(100, Math.round((Number(attachment.progress) || 0) * 100)))
    return `${t("attachment.uploading")} · ${progressValue}%`
  }
  if (status === "failed") {
    return attachment.error || t("attachment.failed")
  }
  const sizeLabel = formatBytes(attachment.size || 0)
  return attachment.path ? `${t("attachment.ready")} · ${sizeLabel}` : sizeLabel
}

function attachmentPreviewMarkup(attachment) {
  if (attachment.previewUrl && String(attachment.mimeType || "").startsWith("image/")) {
    return `<img class="attachment-chip-thumb" src="${escapeHtmlAttr(attachment.previewUrl)}" alt="${escapeHtmlAttr(attachment.name || "image")}" loading="lazy" decoding="async" />`
  }
  return `<div class="attachment-chip-placeholder" aria-hidden="true">${iconSvg("image")}</div>`
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value))
}

function captureChatWindowState() {
  const chatWindow = refs.tabContent.querySelector(".chat-window")
  if (!(chatWindow instanceof HTMLElement)) return null
  return {
    sessionId: currentSession()?.id || null,
    stickToBottom: isNearBottom(chatWindow),
    scrollTop: chatWindow.scrollTop
  }
}

function syncChatWindowState(previousState) {
  const chatWindow = refs.tabContent.querySelector(".chat-window")
  if (!(chatWindow instanceof HTMLElement)) return
  const sessionId = currentSession()?.id || null
  const shouldStick = !previousState || previousState.sessionId !== sessionId || previousState.stickToBottom
  requestAnimationFrame(() => {
    if (!chatWindow.isConnected) return
    if (shouldStick) {
      chatWindow.scrollTop = chatWindow.scrollHeight
    } else {
      chatWindow.scrollTop = previousState.scrollTop
    }
    state.runtime.chatScroll = {
      sessionId,
      stickToBottom: isNearBottom(chatWindow),
      scrollTop: chatWindow.scrollTop
    }
  })
}

function isNearBottom(element) {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= 24
}

function pathJoin(directory, name) {
  const base = String(directory || "").replace(/\/+$/, "")
  const leaf = String(name || "").replace(/^\/+/, "")
  return base && leaf ? `${base}/${leaf}` : base || leaf
}

function formatBytes(value) {
  const bytes = Number(value) || 0
  if (bytes <= 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function deriveWebSocketUrl() {
  const url = new URL(window.location.href)
  url.protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  url.pathname = "/ws"
  url.search = ""
  url.hash = ""
  return url.toString()
}

function loadOrCreateClientInstallationId() {
  const existing = storageGet(STORAGE_KEYS.clientInstallationId)
  if (existing) return existing
  const created = `browser_${randomHex(32)}`
  storageSet(STORAGE_KEYS.clientInstallationId, created)
  return created
}

function loadJson(key, fallback) {
  try {
    const raw = storageGet(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function deviceKey(device) {
  return `${device.installation_id}:${device.device_id}`
}

function defaultDeviceName() {
  const platform = navigator.platform || navigator.userAgent || "Browser"
  return `Edge ${platform}`.slice(0, 64)
}

function shortId(value) {
  return value ? `${value.slice(0, 10)}...` : "-"
}

function shortPath(value) {
  if (!value) return "~"
  const text = String(value)
  if (text.length <= 52) return text
  return `${text.slice(0, 22)}...${text.slice(-24)}`
}

function iconSvg(name) {
  if (name === "plus") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14"></path>
        <path d="M5 12h14"></path>
      </svg>
    `
  }
  if (name === "home") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5"></path>
        <path d="M5.5 9.5V20h13V9.5"></path>
        <path d="M9.5 20v-6h5v6"></path>
      </svg>
    `
  }
  if (name === "back") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 6 9 12l6 6"></path>
      </svg>
    `
  }
  if (name === "refresh") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 11a8 8 0 0 0-13.66-5.66"></path>
        <path d="M4 4v5h5"></path>
        <path d="M4 13a8 8 0 0 0 13.66 5.66"></path>
        <path d="M20 20v-5h-5"></path>
      </svg>
    `
  }
  if (name === "send") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20 20 12 4 4l2.8 6.4L14 12l-7.2 1.6z"></path>
      </svg>
    `
  }
  if (name === "image") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2"></rect>
        <path d="m8 15 2.5-2.5L13 15l2-2 3 3"></path>
        <circle cx="9" cy="10" r="1.2"></circle>
      </svg>
    `
  }
  if (name === "shield") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 6 5.5V11c0 4.1 2.5 7.8 6 9 3.5-1.2 6-4.9 6-9V5.5z"></path>
      </svg>
    `
  }
  if (name === "spark") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13 3 6 13h5l-1 8 8-11h-5z"></path>
      </svg>
    `
  }
  if (name === "settings") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 8.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5z"></path>
        <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.2 1.2 0 0 1 0 1.7l-1.2 1.2a1.2 1.2 0 0 1-1.7 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1.2 1.2 0 0 1-1.2 1.2h-1.7A1.2 1.2 0 0 1 10.9 20v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.2 1.2 0 0 1-1.7 0l-1.2-1.2a1.2 1.2 0 0 1 0-1.7l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1.2 1.2 0 0 1-1.2-1.2v-1.7A1.2 1.2 0 0 1 4 10.9h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.2 1.2 0 0 1 0-1.7l1.2-1.2a1.2 1.2 0 0 1 1.7 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4A1.2 1.2 0 0 1 10.9 2.8h1.7A1.2 1.2 0 0 1 13.8 4v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.2 1.2 0 0 1 1.7 0l1.2 1.2a1.2 1.2 0 0 1 0 1.7l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2A1.2 1.2 0 0 1 21.2 10.9v1.7A1.2 1.2 0 0 1 20 13.8h-.2a1 1 0 0 0-.4 1.2z"></path>
      </svg>
    `
  }
  if (name === "fullscreen") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 4H4v4"></path>
        <path d="M16 4h4v4"></path>
        <path d="M20 16v4h-4"></path>
        <path d="M4 16v4h4"></path>
      </svg>
    `
  }
  if (name === "fullscreen-exit") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 4H4v5"></path>
        <path d="M15 4h5v5"></path>
        <path d="M20 15v5h-5"></path>
        <path d="M4 15v5h5"></path>
        <path d="M9 9 4 4"></path>
        <path d="M15 9 20 4"></path>
        <path d="M9 15 4 20"></path>
        <path d="M15 15 20 20"></path>
      </svg>
    `
  }
  if (name === "expand") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14"></path>
        <path d="M8.5 8.5 12 5l3.5 3.5"></path>
        <path d="M8.5 15.5 12 19l3.5-3.5"></path>
      </svg>
    `
  }
  if (name === "collapse") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 9 12 12 15 9"></path>
        <path d="M9 15 12 12 15 15"></path>
        <path d="M6 5h12"></path>
        <path d="M6 19h12"></path>
      </svg>
    `
  }
  return ""
}

function formatDate(value) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(state.language === "zh" ? "zh-CN" : state.language)
}

function formatTime(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString(state.language === "zh" ? "zh-CN" : state.language, { hour: "numeric", minute: "2-digit" })
}

function startActivityElapsedTicker() {
  if (activityElapsedTicker) return
  activityElapsedTicker = window.setInterval(() => {
    refreshVisibleActivityElapsed()
  }, 1000)
}

function refreshVisibleActivityElapsed() {
  for (const node of refs.tabContent.querySelectorAll("[data-activity-elapsed]")) {
    if (!(node instanceof HTMLElement)) continue
    const startedAt = node.dataset.startedAt || ""
    const completedAt = node.dataset.completedAt || ""
    const elapsed = formatElapsedRange(startedAt, completedAt)
    if (node.textContent !== elapsed) {
      node.textContent = elapsed
    }
  }
}

function formatActivityElapsed(activity) {
  return formatElapsedRange(activity.startedAt || activity.createdAt || "", activity.completedAt || "")
}

function formatElapsedRange(startedAt, completedAt) {
  const started = Date.parse(startedAt || "")
  if (Number.isNaN(started)) return "0s"
  const ended = completedAt ? Date.parse(completedAt) : Date.now()
  const safeEnded = Number.isNaN(ended) ? Date.now() : ended
  return formatDuration(Math.max(0, safeEnded - started))
}

function formatDuration(value) {
  const totalSeconds = Math.max(0, Math.round((Number(value) || 0) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function escapeHtmlAttr(value) {
  return escapeHtml(value)
}

async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const parts = []
  for (let index = 0; index < bytes.length; index += 0x8000) {
    parts.push(String.fromCharCode(...bytes.subarray(index, index + 0x8000)))
  }
  return btoa(parts.join(""))
}

function showToast(message, isError = false) {
  const node = document.createElement("div")
  node.className = `toast${isError ? " error" : ""}`
  node.textContent = message
  refs.toastStack.appendChild(node)
  setTimeout(() => node.remove(), 4200)
}

class BrokerClient {
  constructor(url, callbacks = {}) {
    this.url = url
    this.callbacks = callbacks
    this.ws = null
    this.seq = 1
    this.pending = new Map()
    this.connecting = null
    this.reconnectTimer = null
    this.explicitClose = false
  }

  async connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return
    if (this.connecting) return this.connecting

    this.explicitClose = false
    reportClientEvent("info", "broker-connect-start", { url: this.url })
    this.callbacks.onStatus?.("offline", "status.connecting")

    this.connecting = new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url)
      this.ws = ws
      let settled = false
      const timeout = setTimeout(() => {
        if (settled || this.ws !== ws) return
        reportClientEvent("error", "broker-timeout", { url: this.url, ready_state: ws.readyState })
        this.callbacks.onStatus?.("offline", "status.connectionTimeout")
        try {
          ws.close()
        } catch {}
        reject(new Error("broker connection timeout"))
      }, BROKER_CONNECT_TIMEOUT_MS)

      ws.addEventListener("open", () => {
        clearTimeout(timeout)
        reportClientEvent("info", "broker-open", { url: this.url })
        this.callbacks.onStatus?.("online", "status.connected")
        this.callbacks.onOpen?.()
        settled = true
        resolve()
      })

      ws.addEventListener("message", (event) => {
        this.onMessage(event.data)
      })

      ws.addEventListener("close", () => {
        clearTimeout(timeout)
        this.ws = null
        this.failAllPending("broker connection closed")
        reportClientEvent("warn", "broker-close", { url: this.url, ready_state: ws.readyState })
        this.callbacks.onStatus?.("offline", "status.disconnected")
        if (!settled) {
          reject(new Error("broker connection closed"))
        }
        if (!this.explicitClose) {
          this.scheduleReconnect()
        }
      })

      ws.addEventListener("error", () => {
        clearTimeout(timeout)
        reportClientEvent("error", "broker-error", { url: this.url, ready_state: ws.readyState })
        this.callbacks.onStatus?.("offline", "status.connectionFailed")
        if (!settled) {
          reject(new Error("broker connection failed"))
        }
      })
    }).finally(() => {
      this.connecting = null
    })

    return this.connecting
  }

  reconnect() {
    this.explicitClose = false
    reportClientEvent("info", "broker-reconnect", { url: this.url })
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    try {
      this.ws?.close()
    } catch {}
    return this.connect().catch(() => {})
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect().catch(() => {})
    }, 2000)
  }

  send(payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("broker socket is not connected")
    }
    this.ws.send(JSON.stringify(payload))
  }

  request(type, payload = {}, timeout = 15000) {
    const reqId = `req_${this.seq++}`
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(reqId)
        reject(new Error(`${type} timeout`))
      }, timeout)
      this.pending.set(reqId, { kind: "request", resolve, reject, timer })
      try {
        this.send({ type, req_id: reqId, ...payload })
      } catch (error) {
        clearTimeout(timer)
        this.pending.delete(reqId)
        reject(error)
      }
    })
  }

  rpc(method, body, { onStream, timeout = 10 * 60 * 1000 } = {}) {
    const reqId = `req_${this.seq++}`
    return new Promise((resolve, reject) => {
      const pending = {
        kind: "rpc",
        method,
        resolve,
        reject,
        timer: null,
        timeoutMs: Number.isFinite(timeout) ? Number(timeout) : 10 * 60 * 1000,
        onStream
      }
      pending.timer = this.createRpcTimer(reqId, pending)
      this.pending.set(reqId, pending)
      try {
        this.send({ type: "rpc", req_id: reqId, method, body: body ?? null })
      } catch (error) {
        clearTimeout(pending.timer)
        this.pending.delete(reqId)
        reject(error)
      }
    })
  }

  createRpcTimer(reqId, pending) {
    if (!pending || !Number.isFinite(pending.timeoutMs) || pending.timeoutMs <= 0) {
      return null
    }
    return setTimeout(() => {
      this.pending.delete(reqId)
      pending.reject(new Error(`${pending.method} timeout`))
    }, pending.timeoutMs)
  }

  refreshRpcTimer(reqId, pending) {
    if (!pending || pending.kind !== "rpc") return
    if (!Number.isFinite(pending.timeoutMs) || pending.timeoutMs <= 0) return
    clearTimeout(pending.timer)
    pending.timer = this.createRpcTimer(reqId, pending)
  }

  onMessage(raw) {
    let msg = null
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }
    if (!msg || typeof msg !== "object") return

    if (msg.type === "server_unavailable") {
      this.callbacks.onServerUnavailable?.(msg)
      return
    }

    const pending = msg.req_id ? this.pending.get(msg.req_id) : null
    if (msg.type === "hello") {
      this.callbacks.onStatus?.("online", "status.connected")
      return
    }
    if (!pending) return

    if (msg.type === "error") {
      clearTimeout(pending.timer)
      this.pending.delete(msg.req_id)
      pending.reject(new Error(msg.message || "broker error"))
      return
    }

    if (pending.kind === "request") {
      clearTimeout(pending.timer)
      this.pending.delete(msg.req_id)
      if (msg.type === "paired" || msg.type === "authenticated" || msg.type === "server_registered" || msg.type === "code_created") {
        this.callbacks.onStatus?.("auth", msg.type === "paired" || msg.type === "authenticated" ? "status.deviceReady" : "status.connected")
      }
      pending.resolve(msg)
      return
    }

    if (msg.type === "rpc_stream") {
      this.refreshRpcTimer(msg.req_id, pending)
      pending.onStream?.(msg.event, msg.data)
      return
    }

    clearTimeout(pending.timer)
    this.pending.delete(msg.req_id)
    if (msg.type === "rpc_result") {
      pending.resolve(msg.data)
      return
    }

    if (msg.type === "rpc_end") {
      const error = msg.data?.error
      if (error) {
        pending.reject(new Error(error))
      } else {
        pending.resolve(msg.data ?? null)
      }
    }
  }

  failAllPending(message) {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer)
      pending.reject(new Error(message))
      this.pending.delete(id)
    }
  }
}

function createBrokerClient() {
  return new BrokerClient(state.brokerUrl, {
    onStatus(kind, key) {
      if (state.status.kind !== kind || state.status.key !== key) {
        reportClientEvent("info", "broker-status", { kind, key, text: t(key) })
      }
      state.status = { kind, key }
      renderStatus()
    },
    onOpen() {
      const active = getActiveDevice()
      if (active) {
        resumeDevice(active, { quiet: true }).catch(() => {})
      }
    },
    onServerUnavailable(payload) {
      reportClientEvent("warn", "server-unavailable", payload)
      showToast(t("toast.deviceOffline", { id: payload?.installation_id || "unknown" }), true)
      state.runtime.authReady = false
      renderAll()
    }
  })
}

client = createBrokerClient()

installGlobalDiagnostics()

bootstrap().catch((error) => {
  reportClientEvent("error", "bootstrap-failed", errorPayload(error))
  showToast(error.message, true)
})

function installGlobalDiagnostics() {
  window.addEventListener("error", (event) => {
    reportClientEvent("error", "window-error", {
      message: event.message || "unknown error",
      source: event.filename || null,
      line: event.lineno || null,
      column: event.colno || null,
      error: errorPayload(event.error)
    })
  })

  window.addEventListener("unhandledrejection", (event) => {
    reportClientEvent("error", "unhandled-rejection", {
      reason: serializeValue(event.reason)
    })
  })
}

function reportClientEvent(level, type, detail = null) {
  const pairNameValue = document.querySelector("#pairNameInput")?.value?.trim?.() || defaultDeviceName()
  const payload = {
    level,
    type,
    app_version: APP_VERSION,
    page: window.location.pathname,
    href: safeHref(),
    user_agent: navigator.userAgent || "unknown",
    client_installation_id: state.clientInstallationId || null,
    device_label: pairNameValue,
    detail: serializeValue(detail)
  }

  try {
    const body = JSON.stringify(payload)
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" })
      navigator.sendBeacon("/api/client-events", blob)
      return
    }
    fetch("/api/client-events", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body,
      keepalive: true
    }).catch(() => {})
  } catch {}
}

function errorPayload(error) {
  if (!error) return null
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack || null
    }
  }
  return serializeValue(error)
}

function createSafeStorage() {
  try {
    const key = "__codex_connect_probe__"
    window.localStorage.setItem(key, "1")
    window.localStorage.removeItem(key)
    return window.localStorage
  } catch {
    return {
      getItem() {
        return null
      },
      setItem() {},
      removeItem() {}
    }
  }
}

function storageGet(key) {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function storageSet(key, value) {
  try {
    storage.setItem(key, value)
  } catch {}
}

function storageRemove(key) {
  try {
    storage.removeItem(key)
  } catch {}
}

function randomUuid() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }
  return `${randomHex(8)}-${randomHex(4)}-${randomHex(4)}-${randomHex(4)}-${randomHex(12)}`
}

function randomHex(length) {
  const bytes = new Uint8Array(Math.ceil(length / 2))
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, length)
}

function serializeValue(value) {
  try {
    return JSON.parse(
      JSON.stringify(value ?? null, (key, inner) => {
        if (typeof key === "string" && /token|authorization|secret|password/i.test(key)) {
          return "[redacted]"
        }
        if (inner instanceof Error) {
          return errorPayload(inner)
        }
        if (typeof inner === "string") {
          return inner.slice(0, 1000)
        }
        return inner
      })
    )
  } catch {
    return String(value)
  }
}

function safeHref() {
  try {
    return window.location.href
  } catch {
    return "/"
  }
}
