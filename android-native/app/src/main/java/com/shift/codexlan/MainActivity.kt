package com.shift.codexlan

import android.Manifest
import android.app.DownloadManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.IBinder
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.Folder
import androidx.compose.material.icons.rounded.Link
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.encodeToJsonElement
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.io.IOException
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArraySet
import java.util.concurrent.atomic.AtomicInteger

private const val FIXED_BROKER_URL = BuildConfig.BROKER_URL
private const val DEFAULT_SESSION_TITLE = "新会话"
private const val BROKER_NOTIFICATION_CHANNEL_ID = "codex_broker"
private const val BROKER_NOTIFICATION_ID = 43170
private const val TASK_NOTIFICATION_CHANNEL_ID = "codex_task_alerts"

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val vm: MainViewModel = viewModel(factory = MainViewModel.factory(applicationContext))
            MaterialTheme { CodexLanScreen(vm) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CodexLanScreen(vm: MainViewModel) {
    val ui by vm.state.collectAsState()
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    var drawerPage by remember { mutableStateOf("sessions") }
    var showTitleEditor by remember { mutableStateOf(false) }
    var editingTitle by remember { mutableStateOf("") }
    var pendingDownload by remember { mutableStateOf<DeviceFilePayload?>(null) }
    val notificationPermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (!granted) vm.reportStatus("未授予通知权限，任务完成提醒可能不可见")
    }

    val uploadLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            scope.launch {
                runCatching {
                    val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                        ?: throw IllegalStateException("无法读取文件")
                    val name = queryDisplayName(context, uri) ?: "upload.bin"
                    vm.uploadDeviceFile(name, bytes)
                }
            }
        }
    }

    val downloadLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("*/*")) { uri ->
        val file = pendingDownload
        if (uri != null && file != null) {
            vm.markFileOpSaving(file.path)
            scope.launch {
                runCatching {
                    val bytes = android.util.Base64.decode(file.dataBase64, android.util.Base64.DEFAULT)
                    context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
                        ?: throw IllegalStateException("无法写入文件")
                    vm.reportFileAction("已保存文件: ${file.name}")
                }.onFailure {
                    vm.reportFileAction("保存文件失败: ${it.message}")
                }
                vm.clearFileOp()
                pendingDownload = null
            }
        } else {
            vm.clearFileOp()
            pendingDownload = null
        }
    }

    LaunchedEffect(Unit) { vm.bootstrap() }
    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= 33) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
    androidx.compose.runtime.DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_START) {
                vm.onAppForeground()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(drawerContainerColor = Color(0xFFF8F3E9)) {
                DrawerPanel(
                    ui = ui,
                    page = drawerPage,
                    onPageChange = { drawerPage = it },
                    onNewSession = vm::createSession,
                    onSelectSession = {
                        vm.selectSession(it)
                        scope.launch { drawerState.close() }
                    },
                    onDeleteSession = vm::deleteSession,
                    onJoinCode = vm::updateJoinCode,
                    onPair = vm::pairWithCode,
                    onReconnect = vm::resumeTrustedConnection,
                    onDisconnect = vm::disconnectRelay,
                    onHome = vm::browseHome,
                    onUp = vm::browseParent,
                    onBrowse = vm::browseDirectory,
                    onLoadRoots = vm::loadDeviceRoots,
                    onDownload = { path ->
                        vm.downloadDeviceFile(path) { payload ->
                            pendingDownload = payload
                            downloadLauncher.launch(payload.name)
                        }
                    },
                    onTransferDownload = { path ->
                        vm.prepareTransferDownload(path) { payload ->
                            runCatching {
                                enqueueTransferDownload(context, payload)
                            }.onSuccess {
                                vm.reportStatus("已加入系统下载队列: ${payload.name}")
                                vm.clearFileOp()
                            }.onFailure {
                                vm.reportStatus("中转下载启动失败: ${it.message}")
                                vm.clearFileOp()
                            }
                        }
                    },
                    onUploadPick = {
                        uploadLauncher.launch(arrayOf("*/*"))
                    },
                    onSelectWorkspace = vm::selectWorkspace,
                    onYolo = vm::setYolo,
                    onTaskAlerts = vm::setTaskAlertsEnabled
                )
            }
        }
    ) {
        Scaffold(
            containerColor = Color.Transparent,
            topBar = {
                CenterAlignedTopAppBar(
                    title = {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                ui.activeSession?.title ?: DEFAULT_SESSION_TITLE,
                                modifier = Modifier.clickable {
                                    editingTitle = ui.activeSession?.title ?: DEFAULT_SESSION_TITLE
                                    showTitleEditor = true
                                }
                            )
                            Text(
                                ui.connectionSummary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFF6C6759)
                            )
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = { scope.launch { drawerState.open() } }) {
                            Icon(Icons.Rounded.Folder, contentDescription = "打开侧边栏")
                        }
                    },
                    actions = {
                        TextButton(onClick = {
                            drawerPage = "files"
                            scope.launch { drawerState.open() }
                        }) { Text("文件") }
                    }
                )
            }
        ) { padding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Brush.linearGradient(listOf(Color(0xFFF4EFE4), Color(0xFFDDE9E0))))
                    .padding(padding)
                    .padding(14.dp)
            ) {
                ConversationPanel(
                    ui = ui,
                    onComposerChange = vm::updateActiveDraft,
                    onSend = vm::sendMessage,
                    onCopy = vm::reportStatus
                )
            }
        }
    }

    if (showTitleEditor) {
        AlertDialog(
            onDismissRequest = { showTitleEditor = false },
            title = { Text("修改会话标题") },
            text = {
                OutlinedTextField(
                    value = editingTitle,
                    onValueChange = { editingTitle = it },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    vm.renameActiveSessionTitle(editingTitle)
                    showTitleEditor = false
                }) {
                    Text("确定")
                }
            },
            dismissButton = {
                TextButton(onClick = { showTitleEditor = false }) {
                    Text("取消")
                }
            }
        )
    }
}

@Composable
private fun DrawerPanel(
    ui: UiState,
    page: String,
    onPageChange: (String) -> Unit,
    onNewSession: () -> Unit,
    onSelectSession: (String) -> Unit,
    onDeleteSession: (String) -> Unit,
    onJoinCode: (String) -> Unit,
    onPair: () -> Unit,
    onReconnect: () -> Unit,
    onDisconnect: () -> Unit,
    onHome: () -> Unit,
    onUp: () -> Unit,
    onBrowse: (String) -> Unit,
    onLoadRoots: () -> Unit,
    onDownload: (String) -> Unit,
    onTransferDownload: (String) -> Unit,
    onUploadPick: () -> Unit,
    onSelectWorkspace: (String) -> Unit,
    onYolo: (Boolean) -> Unit,
    onTaskAlerts: (Boolean) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxHeight()
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text("Codex 会话中心", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text("侧边栏管理会话、工作区和配对", color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            DrawerTab("会话", page == "sessions") { onPageChange("sessions") }
            DrawerTab("文件", page == "files") { onPageChange("files") }
            DrawerTab("设置", page == "workspace") { onPageChange("workspace") }
            DrawerTab("配对", page == "pair") { onPageChange("pair") }
        }

        when (page) {
            "files" -> FilePanel(ui, onLoadRoots, onHome, onUp, onBrowse, onDownload, onTransferDownload, onUploadPick)
            "workspace" -> WorkspacePanel(ui, onHome, onUp, onBrowse, onSelectWorkspace, onYolo, onTaskAlerts)
            "pair" -> PairPanel(ui, onJoinCode, onPair, onReconnect, onDisconnect)
            else -> SessionPanel(ui, onNewSession, onSelectSession, onDeleteSession)
        }
    }
}

@Composable
private fun DrawerTab(label: String, active: Boolean, onClick: () -> Unit) {
    val bg = if (active) Color(0xFF1E6A56) else Color.White
    val fg = if (active) Color.White else Color(0xFF1D1C19)
    Surface(shape = RoundedCornerShape(999.dp), color = bg, modifier = Modifier.clickable(onClick = onClick)) {
        Text(label, color = fg, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp))
    }
}

@Composable
private fun SessionPanel(
    ui: UiState,
    onNewSession: () -> Unit,
    onSelect: (String) -> Unit,
    onDelete: (String) -> Unit
) {
    SectionCard("会话列表") {
        Button(onClick = onNewSession, shape = RoundedCornerShape(999.dp)) {
            Icon(Icons.Rounded.Add, contentDescription = null)
            Spacer(Modifier.width(6.dp))
            Text("新建会话")
        }
        Spacer(Modifier.height(10.dp))
        LazyColumn(modifier = Modifier.fillMaxWidth().height(420.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(ui.sessions, key = { it.id }) { session ->
                val active = session.id == ui.activeSessionId
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = if (active) Color(0xFFE6F2EC) else Color.White),
                    shape = RoundedCornerShape(22.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { onSelect(session.id) }.padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.fillMaxWidth(0.78f)) {
                            Text(session.title, fontWeight = FontWeight.SemiBold)
                            Spacer(Modifier.height(4.dp))
                            Text("${shortPath(session.cwd)} | ${if (session.yolo) "YOLO" else "受限"} | ${session.messages.size} 条消息", color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
                            if (active) {
                                Spacer(Modifier.height(4.dp))
                                Text("当前会话", color = Color(0xFF1E6A56), style = MaterialTheme.typography.labelSmall)
                            }
                        }
                        IconButton(onClick = { onDelete(session.id) }) {
                            Icon(Icons.Rounded.DeleteOutline, contentDescription = "删除会话", tint = Color(0xFF7D3C36))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PairPanel(
    ui: UiState,
    onJoinCode: (String) -> Unit,
    onPair: () -> Unit,
    onReconnect: () -> Unit,
    onDisconnect: () -> Unit
) {
    SectionCard("连接设备") {
        Text(FIXED_BROKER_URL, color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = ui.joinCode,
            onValueChange = onJoinCode,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("输入 6 位连接码") },
            singleLine = true,
            shape = RoundedCornerShape(20.dp)
        )
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = onPair, shape = RoundedCornerShape(999.dp)) { Text("立即配对") }
            OutlinedButton(onClick = onReconnect, enabled = ui.savedCredentials, shape = RoundedCornerShape(999.dp)) { Text("重新连接") }
            OutlinedButton(onClick = onDisconnect, enabled = ui.relayConnected, shape = RoundedCornerShape(999.dp)) { Text("断开") }
        }
        Spacer(Modifier.height(12.dp))
        Text(if (ui.savedCredentials) "已保存受信设备凭证" else "还没有已保存的设备凭证", color = Color(0xFF6C6759))
        Spacer(Modifier.height(8.dp))
        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF102019)), shape = RoundedCornerShape(20.dp)) {
            Text(ui.relayLog.ifBlank { "暂无日志" }, modifier = Modifier.padding(12.dp), color = Color(0xFFD9F7EA), style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun FilePanel(
    ui: UiState,
    onLoadRoots: () -> Unit,
    onHome: () -> Unit,
    onUp: () -> Unit,
    onBrowse: (String) -> Unit,
    onDownload: (String) -> Unit,
    onTransferDownload: (String) -> Unit,
    onUploadPick: () -> Unit
) {
    LaunchedEffect(Unit) {
        if (ui.fileRoots.isEmpty()) onLoadRoots()
    }
    val currentFileOp = ui.fileOp
    val fileActionsBusy = currentFileOp != null
    SectionCard("设备文件") {
        if (ui.fileRoots.isNotEmpty()) {
            LazyColumn(modifier = Modifier.fillMaxWidth().height(110.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(ui.fileRoots, key = { it.path }) { root ->
                    FolderRow(
                        label = "根目录: ${root.name}",
                        current = ui.directoryPath == root.path,
                        onOpen = { onBrowse(root.path) },
                        onSelect = { onBrowse(root.path) }
                    )
                }
            }
            Spacer(Modifier.height(12.dp))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = onHome, enabled = ui.directoryRoot.isNotBlank(), shape = RoundedCornerShape(999.dp)) { Text("主目录") }
            OutlinedButton(onClick = onUp, enabled = ui.directoryParent != null, shape = RoundedCornerShape(999.dp)) {
                Text("上级")
            }
            Button(onClick = onUploadPick, enabled = ui.directoryPath.isNotBlank() && !fileActionsBusy, shape = RoundedCornerShape(999.dp)) { Text("上传文件") }
        }
        Spacer(Modifier.height(12.dp))
        Text(shortPath(ui.directoryPath), color = Color(0xFF6C6759), fontSize = 12.sp)
        if (currentFileOp != null) {
            Spacer(Modifier.height(6.dp))
            Text("${currentFileOp.label} ${shortPath(currentFileOp.path)}", color = Color(0xFF1E6A56), fontSize = 12.sp)
        }
        Spacer(Modifier.height(10.dp))
        if (ui.isDirectoryLoading) {
            CircularProgressIndicator()
        } else {
            LazyColumn(modifier = Modifier.fillMaxWidth().height(360.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(ui.directories, key = { it.path }) { dir ->
                    FolderRow(label = dir.name, current = false, onOpen = { onBrowse(dir.path) }, onSelect = { onBrowse(dir.path) })
                }
                items(ui.files, key = { it.path }) { file ->
                    FileRow(
                        file = file,
                        fileOp = ui.fileOp,
                        onDownload = { onDownload(file.path) },
                        onTransferDownload = { onTransferDownload(file.path) }
                    )
                }
            }
        }
    }
}

@Composable
private fun WorkspacePanel(
    ui: UiState,
    onHome: () -> Unit,
    onUp: () -> Unit,
    onBrowse: (String) -> Unit,
    onSelect: (String) -> Unit,
    onYolo: (Boolean) -> Unit,
    onTaskAlerts: (Boolean) -> Unit
) {
    val session = ui.activeSession
    SectionCard("工作区设置") {
        Text(shortPath(session?.cwd), color = Color(0xFF6C6759))
        Spacer(Modifier.height(12.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text("YOLO 模式", fontWeight = FontWeight.SemiBold)
                Text("danger-full-access，无需审批", color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
            }
            Switch(checked = session?.yolo == true, onCheckedChange = onYolo)
        }
        Spacer(Modifier.height(12.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text("任务完成提醒", fontWeight = FontWeight.SemiBold)
                Text("完成或失败时发送系统通知和提示音", color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
            }
            Switch(checked = ui.taskAlertsEnabled, onCheckedChange = onTaskAlerts)
        }
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = onHome, enabled = ui.directoryRoot.isNotBlank(), shape = RoundedCornerShape(999.dp)) { Text("主目录") }
            OutlinedButton(onClick = onUp, enabled = ui.directoryParent != null, shape = RoundedCornerShape(999.dp)) {
                Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("上级")
            }
            OutlinedButton(onClick = { onBrowse(ui.directoryPath) }, enabled = ui.directoryPath.isNotBlank(), shape = RoundedCornerShape(999.dp)) {
                Icon(Icons.Rounded.Refresh, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("刷新")
            }
        }
        Spacer(Modifier.height(12.dp))
        if (ui.isDirectoryLoading) {
            CircularProgressIndicator()
        } else {
            if (ui.directoryPath.isNotBlank()) {
                FolderRow("使用当前目录: ${shortPath(ui.directoryPath)}", current = true, onOpen = {}, onSelect = { onSelect(ui.directoryPath) })
                Spacer(Modifier.height(8.dp))
            }
            LazyColumn(modifier = Modifier.fillMaxWidth().height(320.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(ui.directories, key = { it.path }) { dir ->
                    FolderRow(dir.name, current = false, onOpen = { onBrowse(dir.path) }, onSelect = { onSelect(dir.path) })
                }
            }
        }
    }
}

@Composable
private fun FolderRow(label: String, current: Boolean, onOpen: () -> Unit, onSelect: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = if (current) Color(0xFFE7F1EC) else Color.White), shape = RoundedCornerShape(20.dp)) {
        Column(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(label)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (!current) {
                    OutlinedButton(onClick = onOpen, shape = RoundedCornerShape(999.dp)) { Text("打开") }
                }
                Button(onClick = onSelect, shape = RoundedCornerShape(999.dp)) { Text(if (current) "使用" else "选择") }
            }
        }
    }
}

@Composable
private fun FileRow(file: RemoteFile, fileOp: FileOperationState?, onDownload: () -> Unit, onTransferDownload: () -> Unit) {
    val isBusy = fileOp != null
    val isCurrentFile = fileOp?.path == file.path
    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(20.dp)) {
        Column(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(file.name, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            Text("${formatBytes(file.size)} | ${file.modifiedAt}", color = Color(0xFF6C6759), fontSize = 11.sp)
            if (isCurrentFile) {
                Text(fileOp?.label.orEmpty(), color = Color(0xFF1E6A56), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onDownload, enabled = !isBusy, shape = RoundedCornerShape(999.dp)) {
                    Icon(Icons.Rounded.Download, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text(if (isCurrentFile && fileOp?.type == "download") "下载中" else if (isCurrentFile && fileOp?.type == "saving") "保存中" else "下载")
                }
                OutlinedButton(onClick = onTransferDownload, enabled = !isBusy, shape = RoundedCornerShape(999.dp)) {
                    Icon(Icons.Rounded.Link, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text(if (isCurrentFile && fileOp?.type == "transfer") "上传中" else "中转下载")
                }
            }
        }
    }
}

@Composable
private fun ConversationPanel(
    ui: UiState,
    onComposerChange: (String) -> Unit,
    onSend: () -> Unit,
    onCopy: (String) -> Unit
) {
    val session = ui.activeSession
    val clipboard = LocalClipboardManager.current
    val listState = rememberLazyListState()

    LaunchedEffect(session?.id, session?.messages?.size) {
        val lastIndex = (session?.messages?.size ?: 0) - 1
        if (lastIndex >= 0) {
            listState.animateScrollToItem(lastIndex)
        }
    }

    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Card(modifier = Modifier.fillMaxWidth().weight(1f), shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = Color(0xF7FFFDF8))) {
            if (session?.messages?.isEmpty() != false) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("当前会话还没有消息", color = Color(0xFF7A7466), fontSize = 13.sp)
                        Spacer(Modifier.height(8.dp))
                        Text("从下方输入框开始对话", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    }
                }
            } else {
                LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize().padding(horizontal = 10.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(session.messages, key = { it.id }) { msg ->
                        MessageBubble(
                            message = msg,
                            onCopy = {
                                clipboard.setText(AnnotatedString(it))
                                onCopy("消息已复制")
                            }
                        )
                    }
                }
            }
        }

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Bottom) {
            OutlinedTextField(
                value = session?.draft.orEmpty(),
                onValueChange = onComposerChange,
                modifier = Modifier.weight(1f),
                placeholder = { Text("在当前会话里输入消息…", fontSize = 13.sp) },
                maxLines = 5,
                shape = RoundedCornerShape(18.dp),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(onSend = {
                    if (!session?.draft.isNullOrBlank() && session?.isSending != true) onSend()
                })
            )
            Button(
                onClick = onSend,
                enabled = !session?.draft.isNullOrBlank() && session?.isSending != true,
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier.height(54.dp)
            ) {
                if (session?.isSending == true) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = Color.White)
                } else {
                    Text("发送")
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun MessageBubble(message: ChatMessage, onCopy: (String) -> Unit) {
    val isUser = message.role == "user"
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start) {
        Surface(modifier = Modifier.fillMaxWidth(0.94f), shape = RoundedCornerShape(20.dp), color = if (isUser) Color(0xFFE6F3EE) else Color.White) {
            Column(
                Modifier
                    .padding(horizontal = 12.dp, vertical = 10.dp)
                    .combinedClickable(
                        onClick = {},
                        onLongClick = { onCopy(message.content) }
                    )
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = { onCopy(message.content) }) {
                        Icon(Icons.Rounded.ContentCopy, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("复制", fontSize = 11.sp)
                    }
                }
                SelectionContainer {
                    Text(
                        message.content.ifBlank { " " },
                        fontSize = 13.sp,
                        lineHeight = 18.sp
                    )
                }
            }
        }
    }
}

@Composable
private fun SectionCard(title: String, content: @Composable ColumnScope.() -> Unit) {
    Card(shape = RoundedCornerShape(28.dp), colors = CardDefaults.cardColors(containerColor = Color(0xF7FFF9F2))) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(4.dp))
            content()
        }
    }
}

private class MainViewModel(private val storage: AppStorage) : ViewModel(), BrokerRepository.Listener {
    private val appContext = storage.context
    private val repository = BrokerRepository.getInstance()
    private val notifier = TaskAlertNotifier(appContext)
    private val _state = MutableStateFlow(storage.load())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        repository.addListener(this)
    }

    fun bootstrap() {
        if (_state.value.clientInstallationId.isBlank()) {
            _state.update { it.copy(clientInstallationId = "cliinst_${UUID.randomUUID()}") }
            persist()
        }
        if (_state.value.sessions.isEmpty()) createSession()
        val credentials = _state.value.credentials
        if (credentials != null) {
            BrokerForegroundService.start(appContext)
            repository.enablePersistentConnection(credentials, _state.value.clientInstallationId)
            resumeTrustedConnection()
        }
    }

    fun onAppForeground() {
        val state = _state.value
        if (state.credentials != null && !state.relayAuthenticated) {
            resumeTrustedConnection()
        } else if (state.relayAuthenticated) {
            syncPendingTasks()
        }
    }

    fun createSession() {
        val session = ChatSession(id = UUID.randomUUID().toString(), title = DEFAULT_SESSION_TITLE, cwd = "")
        _state.update { it.copy(sessions = listOf(session) + it.sessions, activeSessionId = session.id) }
        persist()
        _state.value.directoryRoot.takeIf { it.isNotBlank() }?.let(::browseDirectory)
    }

    fun selectSession(id: String) {
        _state.update { it.copy(activeSessionId = id) }
        persist()
        val session = currentSession()
        when {
            session?.cwd?.isNotBlank() == true -> browseDirectory(session.cwd)
            _state.value.directoryRoot.isNotBlank() -> browseDirectory(_state.value.directoryRoot)
        }
    }

    fun deleteSession(id: String) {
        val remaining = _state.value.sessions.filterNot { it.id == id }
        val nextActive = when {
            remaining.isEmpty() -> null
            _state.value.activeSessionId == id -> remaining.first().id
            else -> _state.value.activeSessionId
        }
        _state.update { it.copy(sessions = remaining, activeSessionId = nextActive) }
        if (remaining.isEmpty()) createSession() else persist()
    }

    fun updateJoinCode(value: String) {
        _state.update { it.copy(joinCode = value.uppercase().take(6)) }
    }

    fun pairWithCode() {
        val code = _state.value.joinCode.trim().uppercase()
        if (code.length != 6) {
            appendLog("连接码必须是 6 位")
            return
        }
        val clientInstallationId = _state.value.clientInstallationId.ifBlank { "cliinst_${UUID.randomUUID()}" }
        if (_state.value.clientInstallationId != clientInstallationId) {
            _state.update { it.copy(clientInstallationId = clientInstallationId) }
            persist()
        }
        viewModelScope.launch(Dispatchers.IO) {
            runCatching { repository.pair(code, Build.MODEL ?: "Android", clientInstallationId) }
                .onSuccess { }
                .onFailure { error ->
                    appendLog("配对失败: ${error.message}")
                    _state.update { it.copy(relayConnected = false, relayAuthenticated = false, status = "配对失败") }
                }
        }
    }

    fun resumeTrustedConnection() {
        val credentials = _state.value.credentials ?: return
        viewModelScope.launch(Dispatchers.IO) {
            runCatching { repository.resume(credentials) }
                .onSuccess { }
                .onFailure { error ->
                    appendLog("重连失败: ${error.message}")
                    _state.update { it.copy(relayConnected = false, relayAuthenticated = false, status = "受信设备重连失败") }
                }
        }
    }

    fun disconnectRelay() {
        repository.disablePersistentConnection()
        repository.disconnect()
        BrokerForegroundService.stop(appContext)
        _state.update {
            it.copy(
                relayConnected = false,
                relayAuthenticated = false,
                status = "连接已断开",
                connectionSummary = "Broker 已断开"
            )
        }
    }

    fun browseHome() {
        if (_state.value.directoryRoot.isNotBlank()) browseDirectory(_state.value.directoryRoot)
    }

    fun browseParent() {
        _state.value.directoryParent?.let(::browseDirectory)
    }

    fun loadDeviceRoots() {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching { repository.getFileRoots() }
                .onSuccess { payload ->
                    _state.update { it.copy(fileRoots = payload.roots) }
                    val current = _state.value.directoryPath
                    if (current.isBlank()) {
                        payload.roots.firstOrNull()?.path?.let(::browseDirectory)
                    }
                }
                .onFailure { error ->
                    _state.update { it.copy(status = "加载设备根目录失败: ${error.message}") }
                }
        }
    }

    fun browseDirectory(path: String) {
        viewModelScope.launch(Dispatchers.IO) {
            _state.update { it.copy(isDirectoryLoading = true) }
            runCatching { repository.listDirectories(path) }
                .onSuccess { listing ->
                    _state.update {
                        it.copy(
                            directories = listing.directories,
                            files = listing.files,
                            directoryPath = listing.current,
                            directoryRoot = listing.root,
                            directoryParent = listing.parent,
                            isDirectoryLoading = false,
                            status = "工作区已就绪 | ${listing.current}"
                        )
                    }
                }
                .onFailure { error ->
                    _state.update { it.copy(isDirectoryLoading = false, status = "目录请求失败: ${error.message}") }
                }
        }
    }

    fun selectWorkspace(path: String) {
        currentSession()?.let { session ->
            mutateSession(session.id) { it.copy(cwd = path) }
            persist()
        }
        browseDirectory(path)
    }

    fun setYolo(enabled: Boolean) {
        currentSession()?.let { session ->
            mutateSession(session.id) { it.copy(yolo = enabled) }
            persist()
        }
    }

    fun setTaskAlertsEnabled(enabled: Boolean) {
        _state.update { it.copy(taskAlertsEnabled = enabled) }
        persist()
    }

    fun renameActiveSessionTitle(value: String) {
        val session = currentSession() ?: return
        val nextTitle = value.ifBlank { DEFAULT_SESSION_TITLE }
        mutateSession(session.id) { it.copy(title = nextTitle) }
        persist()
    }

    fun reportFileAction(message: String) {
        _state.update { it.copy(status = message) }
    }

    fun reportStatus(message: String) {
        _state.update { it.copy(status = message) }
    }

    fun markFileOpSaving(path: String) {
        _state.update { it.copy(fileOp = FileOperationState(path, "saving", "保存中…")) }
    }

    fun clearFileOp() {
        _state.update { it.copy(fileOp = null) }
    }

    fun downloadDeviceFile(path: String, onReady: (DeviceFilePayload) -> Unit) {
        _state.update { it.copy(fileOp = FileOperationState(path, "download", "下载中…")) }
        viewModelScope.launch(Dispatchers.IO) {
            runCatching { repository.downloadFile(path) }
                .onSuccess {
                    _state.update { state -> state.copy(status = "文件已准备下载: ${it.name}") }
                    onReady(it)
                }
                .onFailure {
                    _state.update { state -> state.copy(status = "下载文件失败: ${it.message}", fileOp = null) }
                }
        }
    }

    fun prepareTransferDownload(path: String, onReady: (TransferDownloadPayload) -> Unit) {
        _state.update { it.copy(fileOp = FileOperationState(path, "transfer", "中转上传中…")) }
        viewModelScope.launch(Dispatchers.IO) {
            runCatching { repository.createTransfer(path) }
                .onSuccess {
                    _state.update { state -> state.copy(status = "已生成一次性中转链接: ${it.name}") }
                    onReady(TransferDownloadPayload(it.name, it.link))
                }
                .onFailure {
                    _state.update { state -> state.copy(status = "创建中转下载失败: ${it.message}", fileOp = null) }
                }
        }
    }

    fun uploadDeviceFile(name: String, bytes: ByteArray) {
        val directory = _state.value.directoryPath.ifBlank { _state.value.directoryRoot }
        if (directory.isBlank()) {
            _state.update { it.copy(status = "请先打开一个设备目录") }
            return
        }
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                repository.uploadFile(DeviceFileUploadRequest(directory, name, android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)))
            }.onSuccess {
                _state.update { state -> state.copy(status = "上传完成: ${it.name}") }
                browseDirectory(directory)
            }.onFailure {
                _state.update { state -> state.copy(status = "上传失败: ${it.message}") }
            }
        }
    }

    fun updateActiveDraft(value: String) {
        currentSession()?.let { session ->
            mutateSession(session.id) { it.copy(draft = value) }
            persist()
        }
    }

    fun sendMessage() {
        val session = currentSession() ?: return
        val text = session.draft.trim()
        if (text.isBlank() || !_state.value.relayAuthenticated) return
        val requestId = "reqmsg_${UUID.randomUUID()}"

        val userMsg = ChatMessage(UUID.randomUUID().toString(), "user", text)
        val assistantMsg = ChatMessage(UUID.randomUUID().toString(), "assistant", "")
        mutateSession(session.id) {
            it.copy(
                title = if (it.messages.isEmpty() && it.title == DEFAULT_SESSION_TITLE) deriveSessionTitle(text) else it.title,
                draft = "",
                isSending = true,
                pendingRequestId = requestId,
                messages = it.messages + listOf(userMsg, assistantMsg)
            )
        }
        _state.update { it.copy(status = "正在通过 Broker 传输") }
        persist()

        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                repository.streamChat(
                    StreamRequest(text, session.threadId, session.cwd, session.yolo, session.id, requestId),
                    onThread = { threadId -> mutateSession(session.id) { current -> current.copy(threadId = threadId) } },
                    onDelta = { delta -> mutateMessage(session.id, assistantMsg.id) { it + delta } },
                    onDone = { result, threadId ->
                        mutateSession(session.id) { current -> current.copy(threadId = threadId ?: current.threadId, isSending = false, pendingRequestId = null) }
                        mutateMessage(session.id, assistantMsg.id) { if (result.isBlank()) it else result }
                        _state.update { it.copy(status = "Broker 中继已就绪") }
                        maybeNotifyTaskResult(session.title, null)
                        persist()
                    },
                    onError = { message ->
                        mutateSession(session.id) { current -> current.copy(isSending = false, pendingRequestId = null) }
                        mutateMessage(session.id, assistantMsg.id) { "错误: $message" }
                        _state.update { it.copy(status = "请求失败") }
                        maybeNotifyTaskResult(session.title, message)
                    }
                )
            }.onFailure { error ->
                mutateSession(session.id) { current -> current.copy(isSending = false, pendingRequestId = null) }
                mutateMessage(session.id, assistantMsg.id) { "错误: ${error.message}" }
                _state.update { it.copy(status = "请求失败") }
                maybeNotifyTaskResult(session.title, error.message)
            }
        }
    }

    private suspend fun afterAuth(credentials: BrokerCredentials, paired: Boolean) {
        repository.enablePersistentConnection(credentials, _state.value.clientInstallationId)
        BrokerForegroundService.start(appContext)
        _state.update {
            it.copy(
                credentials = credentials,
                relayConnected = true,
                relayAuthenticated = true,
                joinCode = "",
                status = if (paired) "设备已配对" else "受信设备重连完成",
                connectionSummary = "Broker 已认证 | ${credentials.deviceId.take(12)}"
            )
        }
        appendLog(if (paired) "已完成设备配对" else "受信设备重连成功")
        persist()

        val config = repository.getConfig()
        val roots = runCatching { repository.getFileRoots() }.getOrNull()
        _state.update {
            it.copy(
                directoryRoot = config.codexHome,
                fileRoots = roots?.roots ?: it.fileRoots,
                connectionSummary = "Broker 已认证 | ${config.codexModel}",
                status = "Broker 中继已就绪"
            )
        }
        val session = currentSession()
        if (session != null && session.cwd.isBlank()) {
            mutateSession(session.id) { it.copy(cwd = config.codexHome) }
            persist()
        }
        syncPendingTasks()
        browseDirectory(currentSession()?.cwd?.ifBlank { config.codexHome } ?: config.codexHome)
    }

    private fun syncPendingTasks() {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching { repository.syncChatTasks() }
                .onSuccess { payload ->
                    payload.tasks.forEach { task ->
                        val session = _state.value.sessions.find { it.pendingRequestId == task.requestId || it.id == task.sessionId } ?: return@forEach
                        if (task.status == "running") return@forEach
                        val shouldNotify = session.pendingRequestId != null
                        mutateSession(session.id) { current ->
                            current.copy(
                                threadId = task.threadId ?: current.threadId,
                                isSending = false,
                                pendingRequestId = null,
                                messages = recoverSessionMessages(current.messages, task)
                            )
                        }
                        if (shouldNotify) {
                            maybeNotifyTaskResult(session.title, task.error)
                        }
                    }
                    persist()
                }
        }
    }

    private fun currentSession(): ChatSession? {
        val state = _state.value
        return state.sessions.find { it.id == state.activeSessionId } ?: state.sessions.firstOrNull()
    }

    private fun mutateSession(id: String, transform: (ChatSession) -> ChatSession) {
        _state.update { ui -> ui.copy(sessions = ui.sessions.map { if (it.id == id) transform(it) else it }) }
    }

    private fun mutateMessage(sessionId: String, messageId: String, transform: (String) -> String) {
        mutateSession(sessionId) { session ->
            session.copy(messages = session.messages.map { if (it.id == messageId) it.copy(content = transform(it.content)) else it })
        }
    }

    private fun appendLog(line: String) {
        val entry = "[${System.currentTimeMillis()}] $line"
        _state.update {
            val next = if (it.relayLog.isBlank()) entry else "${it.relayLog}\n$entry"
            it.copy(relayLog = next.takeLast(8000))
        }
    }

    private fun persist() {
        storage.save(_state.value)
    }

    override fun onSocketOpen() {
        _state.update { it.copy(relayConnected = true, status = "Broker 已连接", connectionSummary = "Broker 已连接，等待认证") }
        appendLog("broker socket 已连接")
    }

    override fun onSocketClosed(message: String) {
        _state.update { it.copy(relayConnected = false, relayAuthenticated = false, status = "Broker 已断开", connectionSummary = "Broker 已断开") }
        appendLog(message)
    }

    override fun onRelayAuthenticated(credentials: BrokerCredentials, resumed: Boolean) {
        viewModelScope.launch(Dispatchers.IO) {
            afterAuth(credentials, !resumed)
        }
    }

    override fun onLog(message: String) {
        appendLog(message)
    }

    override fun onCleared() {
        repository.removeListener(this)
        super.onCleared()
    }

    private fun maybeNotifyTaskResult(sessionTitle: String, error: String?) {
        if (!_state.value.taskAlertsEnabled) return
        notifier.notifyTaskResult(sessionTitle, error)
    }

    companion object {
        fun factory(context: Context): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return MainViewModel(AppStorage(context.applicationContext)) as T
            }
        }
    }
}

private class AppStorage(val context: Context) {
    private val prefs = context.getSharedPreferences("codex_lan_prefs", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true }

    fun load(): UiState {
        val raw = prefs.getString("ui_state", null) ?: return UiState()
        return runCatching { json.decodeFromString<PersistedState>(raw).toUiState() }.getOrElse { UiState() }
    }

    fun save(state: UiState) {
        val payload = PersistedState(
            state.clientInstallationId,
            state.sessions,
            state.activeSessionId,
            state.credentials,
            state.taskAlertsEnabled
        )
        prefs.edit().putString("ui_state", json.encodeToString(payload)).apply()
    }
}

private class BrokerRepository private constructor() {
    interface Listener {
        fun onSocketOpen()
        fun onSocketClosed(message: String)
        fun onRelayAuthenticated(credentials: BrokerCredentials, resumed: Boolean)
        fun onLog(message: String)
    }

    private val client = OkHttpClient.Builder()
        .pingInterval(20, java.util.concurrent.TimeUnit.SECONDS)
        .build()
    private val json = Json { ignoreUnknownKeys = true }
    private val seq = AtomicInteger(1)
    private val authWaiters = ConcurrentHashMap<String, PendingAuth>()
    private val rpcWaiters = ConcurrentHashMap<String, PendingRpc>()
    private val listeners = CopyOnWriteArraySet<Listener>()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var openWaiter: CompletableDeferred<Unit>? = null
    private var socket: WebSocket? = null
    @Volatile private var persistentCredentials: BrokerCredentials? = null
    @Volatile private var shouldStayConnected = false
    @Volatile private var reconnectJob: Job? = null

    fun addListener(listener: Listener) {
        listeners += listener
    }

    fun removeListener(listener: Listener) {
        listeners -= listener
    }

    fun enablePersistentConnection(credentials: BrokerCredentials, clientInstallationId: String) {
        persistentCredentials = credentials
        shouldStayConnected = true
    }

    fun disablePersistentConnection() {
        shouldStayConnected = false
        reconnectJob?.cancel()
        reconnectJob = null
    }

    suspend fun pair(code: String, deviceName: String, clientInstallationId: String): BrokerCredentials {
        ensureSocket()
        val reqId = nextReqId()
        val deferred = CompletableDeferred<BrokerCredentials>()
        authWaiters[reqId] = PendingAuth(deferred, null)
        send(buildJsonObject {
            put("type", "pair_client")
            put("req_id", reqId)
            put("code", code)
            put("device_name", deviceName)
            put("client_installation_id", clientInstallationId)
        })
        return withTimeout(10_000) { deferred.await() }.also {
            enablePersistentConnection(it, clientInstallationId)
        }
    }

    suspend fun resume(credentials: BrokerCredentials): BrokerCredentials {
        ensureSocket()
        val reqId = nextReqId()
        val deferred = CompletableDeferred<BrokerCredentials>()
        authWaiters[reqId] = PendingAuth(deferred, credentials.deviceToken)
        send(buildJsonObject {
            put("type", "resume_client")
            put("req_id", reqId)
            put("installation_id", credentials.installationId)
            put("device_id", credentials.deviceId)
            put("device_token", credentials.deviceToken)
        })
        return withTimeout(10_000) { deferred.await() }.also {
            persistentCredentials = it
            shouldStayConnected = true
        }
    }

    suspend fun getConfig(): BrokerConfig {
        return json.decodeFromJsonElement(rpcOnce("config.get", buildJsonObject {}))
    }

    suspend fun listDirectories(path: String): DirectoryListing {
        return json.decodeFromJsonElement(rpcOnce("fs.list", buildJsonObject { put("path", path) }))
    }

    suspend fun getFileRoots(): DeviceRootsPayload {
        return json.decodeFromJsonElement(rpcOnce("fs.roots", buildJsonObject {}))
    }

    suspend fun downloadFile(path: String): DeviceFilePayload {
        return json.decodeFromJsonElement(rpcOnce("fs.download", buildJsonObject { put("path", path) }))
    }

    suspend fun uploadFile(request: DeviceFileUploadRequest): DeviceFileUploadResult {
        return json.decodeFromJsonElement(
            rpcOnce(
                "fs.upload",
                buildJsonObject {
                    put("directory", request.directory)
                    put("name", request.name)
                    put("data_base64", request.dataBase64)
                }
            )
        )
    }

    suspend fun createTransfer(path: String): TransferLinkPayload {
        return json.decodeFromJsonElement(
            rpcOnce(
                "fs.transfer",
                buildJsonObject {
                    put("path", path)
                    put("expires", "2d")
                }
            )
        )
    }

    suspend fun syncChatTasks(): ChatSyncPayload {
        return json.decodeFromJsonElement(rpcOnce("chat.sync", buildJsonObject {}))
    }

    suspend fun streamChat(
        request: StreamRequest,
        onThread: (String) -> Unit,
        onDelta: (String) -> Unit,
        onDone: (String, String?) -> Unit,
        onError: (String) -> Unit
    ) {
        ensureSocket()
        val reqId = nextReqId()
        val completion = CompletableDeferred<Unit>()
        rpcWaiters[reqId] = PendingRpc.Stream(onThread, onDelta, onDone, onError, completion)
        send(buildJsonObject {
            put("type", "rpc")
            put("req_id", reqId)
            put("method", "chat.stream")
            put("body", json.encodeToJsonElement(StreamRequest.serializer(), request))
        })
        completion.await()
    }

    fun disconnect() {
        socket?.close(1000, "manual close")
        socket = null
        failAll("socket closed")
    }

    private suspend fun rpcOnce(method: String, body: JsonObject): JsonElement {
        ensureSocket()
        val reqId = nextReqId()
        val deferred = CompletableDeferred<JsonElement>()
        rpcWaiters[reqId] = PendingRpc.Once(deferred)
        send(buildJsonObject {
            put("type", "rpc")
            put("req_id", reqId)
            put("method", method)
            put("body", body)
        })
        return withTimeout(10_000) { deferred.await() }
    }

    private suspend fun ensureSocket() {
        if (socket != null) return
        val waiter = CompletableDeferred<Unit>()
        openWaiter = waiter
        socket = client.newWebSocket(
            Request.Builder().url(FIXED_BROKER_URL).build(),
            object : WebSocketListener() {
                override fun onOpen(webSocket: WebSocket, response: Response) {
                    reconnectJob?.cancel()
                    reconnectJob = null
                    openWaiter?.complete(Unit)
                    openWaiter = null
                    listeners.forEach { it.onSocketOpen() }
                }

                override fun onMessage(webSocket: WebSocket, text: String) {
                    handleMessage(text)
                }

                override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                    socket = null
                    failAll("socket closed")
                    listeners.forEach { it.onSocketClosed("socket closed: $reason") }
                    scheduleReconnect()
                }

                override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                    socket = null
                    openWaiter?.completeExceptionally(t)
                    openWaiter = null
                    failAll(t.message ?: "unknown failure")
                    listeners.forEach { it.onSocketClosed("socket error: ${t.message ?: "unknown failure"}") }
                    scheduleReconnect()
                }
            }
        )
        withTimeout(8_000) { waiter.await() }
    }

    private fun handleMessage(text: String) {
        val obj = runCatching { json.parseToJsonElement(text).jsonObject }.getOrElse {
            listeners.forEach { it.onLog("parse failed") }
            return
        }
        val type = obj["type"]?.jsonPrimitive?.contentOrNull ?: return
        val reqId = obj["req_id"]?.jsonPrimitive?.contentOrNull
        when (type) {
            "hello" -> listeners.forEach { it.onLog("broker hello") }
            "paired", "authenticated" -> {
                val pending = reqId?.let { authWaiters.remove(it) } ?: return
                val installationId = obj["installation_id"]?.jsonPrimitive?.contentOrNull ?: return
                val deviceId = obj["device_id"]?.jsonPrimitive?.contentOrNull ?: return
                val token = obj["device_token"]?.jsonPrimitive?.contentOrNull ?: pending.fallbackToken ?: return
                val credentials = BrokerCredentials(installationId, deviceId, token)
                persistentCredentials = credentials
                listeners.forEach { it.onRelayAuthenticated(credentials, type == "authenticated") }
                pending.deferred.complete(credentials)
            }
            "rpc_result" -> {
                val pending = reqId?.let { rpcWaiters.remove(it) as? PendingRpc.Once } ?: return
                pending.deferred.complete(obj["data"] ?: JsonObject(emptyMap()))
            }
            "rpc_stream" -> {
                val pending = reqId?.let { rpcWaiters[it] as? PendingRpc.Stream } ?: return
                val data = obj["data"]?.jsonObject
                when (obj["event"]?.jsonPrimitive?.contentOrNull) {
                    "thread" -> data?.get("thread_id")?.jsonPrimitive?.contentOrNull?.let(pending.onThread)
                    "delta" -> pending.onDelta(data?.get("delta")?.jsonPrimitive?.contentOrNull.orEmpty())
                }
            }
            "rpc_end" -> {
                val pending = reqId?.let { rpcWaiters.remove(it) as? PendingRpc.Stream } ?: return
                val data = obj["data"]?.jsonObject
                val error = data?.get("error")?.jsonPrimitive?.contentOrNull
                if (error != null) {
                    pending.onError(error)
                } else {
                    pending.onDone(data?.get("text")?.jsonPrimitive?.contentOrNull.orEmpty(), data?.get("thread_id")?.jsonPrimitive?.contentOrNull)
                }
                pending.completion.complete(Unit)
            }
            "error" -> {
                val message = obj["message"]?.jsonPrimitive?.contentOrNull ?: "broker error"
                reqId?.let { authWaiters.remove(it) }?.deferred?.completeExceptionally(IllegalStateException(message))
                when (val pending = reqId?.let { rpcWaiters.remove(it) }) {
                    is PendingRpc.Once -> pending.deferred.completeExceptionally(IllegalStateException(message))
                    is PendingRpc.Stream -> {
                        pending.onError(message)
                        pending.completion.complete(Unit)
                    }
                    null -> listeners.forEach { it.onLog(message) }
                }
            }
            "server_unavailable" -> listeners.forEach { it.onLog("server unavailable") }
            else -> listeners.forEach { it.onLog(type) }
        }
    }

    private fun send(payload: JsonObject) {
        val ok = socket?.send(payload.toString()) ?: false
        if (!ok) throw IllegalStateException("send failed")
    }

    private fun nextReqId(): String = "req_${seq.getAndIncrement()}"

    private fun failAll(message: String) {
        authWaiters.values.forEach { it.deferred.completeExceptionally(IllegalStateException(message)) }
        authWaiters.clear()
        rpcWaiters.values.forEach {
            when (it) {
                is PendingRpc.Once -> it.deferred.completeExceptionally(IllegalStateException(message))
                is PendingRpc.Stream -> {
                    it.onError(message)
                    it.completion.complete(Unit)
                }
            }
        }
        rpcWaiters.clear()
    }

    private fun scheduleReconnect() {
        val credentials = persistentCredentials ?: return
        if (!shouldStayConnected) return
        if (reconnectJob?.isActive == true) return
        reconnectJob = scope.launch {
            delay(2_000)
            runCatching { resume(credentials) }
                .onFailure { error ->
                    listeners.forEach { it.onLog("broker 重连失败: ${error.message ?: "unknown"}") }
                    reconnectJob = null
                    scheduleReconnect()
                }
                .onSuccess {
                    reconnectJob = null
                }
        }
    }

    companion object {
        @Volatile
        private var instance: BrokerRepository? = null

        fun getInstance(): BrokerRepository {
            return instance ?: synchronized(this) {
                instance ?: BrokerRepository().also { instance = it }
            }
        }
    }

    private data class PendingAuth(val deferred: CompletableDeferred<BrokerCredentials>, val fallbackToken: String?)

    private sealed interface PendingRpc {
        data class Once(val deferred: CompletableDeferred<JsonElement>) : PendingRpc
        data class Stream(
            val onThread: (String) -> Unit,
            val onDelta: (String) -> Unit,
            val onDone: (String, String?) -> Unit,
            val onError: (String) -> Unit,
            val completion: CompletableDeferred<Unit>
        ) : PendingRpc
    }
}

class BrokerForegroundService : Service(), BrokerRepository.Listener {
    private val repository by lazy { BrokerRepository.getInstance() }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        repository.addListener(this)
        startForeground(BROKER_NOTIFICATION_ID, buildNotification("Broker 常驻连接运行中"))
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        updateNotification("Broker 常驻连接运行中")
        return START_STICKY
    }

    override fun onDestroy() {
        repository.removeListener(this)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onSocketOpen() {
        updateNotification("Broker 已连接")
    }

    override fun onSocketClosed(message: String) {
        updateNotification("Broker 重连中")
    }

    override fun onRelayAuthenticated(credentials: BrokerCredentials, resumed: Boolean) {
        updateNotification("Broker 已认证并常驻")
    }

    override fun onLog(message: String) = Unit

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(
                BROKER_NOTIFICATION_CHANNEL_ID,
                "Codex Broker",
                NotificationManager.IMPORTANCE_LOW
            )
        )
    }

    private fun updateNotification(text: String) {
        getSystemService(NotificationManager::class.java)
            .notify(BROKER_NOTIFICATION_ID, buildNotification(text))
    }

    private fun buildNotification(text: String): Notification {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return Notification.Builder(this, BROKER_NOTIFICATION_CHANNEL_ID)
            .setContentTitle("Codex Connect")
            .setContentText(text)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    companion object {
        fun start(context: Context) {
            val intent = Intent(context, BrokerForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, BrokerForegroundService::class.java))
        }
    }
}

private class TaskAlertNotifier(private val context: Context) {
    fun notifyTaskResult(sessionTitle: String, error: String?) {
        createChannel()
        val manager = context.getSystemService(NotificationManager::class.java)
        val title = if (error == null) "任务已完成" else "任务执行失败"
        val body = if (error == null) {
            sessionTitle.ifBlank { "当前会话已完成" }
        } else {
            "${sessionTitle.ifBlank { "当前会话" }}: ${error.take(120)}"
        }
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            (System.currentTimeMillis() % Int.MAX_VALUE).toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = Notification.Builder(context, TASK_NOTIFICATION_CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()
        manager.notify((System.currentTimeMillis() % Int.MAX_VALUE).toInt(), notification)
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(
                TASK_NOTIFICATION_CHANNEL_ID,
                "Codex 任务提醒",
                NotificationManager.IMPORTANCE_DEFAULT
            )
        )
    }
}

@Serializable
data class UiState(
    val status: String = "等待配对或自动重连",
    val connectionSummary: String = "Broker 已就绪，设备未认证",
    val clientInstallationId: String = "",
    val sessions: List<ChatSession> = emptyList(),
    val activeSessionId: String? = null,
    val fileRoots: List<DeviceRoot> = emptyList(),
    val directories: List<RemoteDirectory> = emptyList(),
    val files: List<RemoteFile> = emptyList(),
    val directoryPath: String = "",
    val directoryRoot: String = "",
    val directoryParent: String? = null,
    val isDirectoryLoading: Boolean = false,
    val joinCode: String = "",
    val relayConnected: Boolean = false,
    val relayAuthenticated: Boolean = false,
    val relayLog: String = "",
    val credentials: BrokerCredentials? = null,
    val taskAlertsEnabled: Boolean = true,
    val fileOp: FileOperationState? = null
) {
    val activeSession: ChatSession?
        get() = sessions.find { it.id == activeSessionId } ?: sessions.firstOrNull()

    val savedCredentials: Boolean
        get() = credentials != null
}

@Serializable
data class BrokerCredentials(
    @SerialName("installation_id") val installationId: String,
    @SerialName("device_id") val deviceId: String,
    @SerialName("device_token") val deviceToken: String
)

@Serializable
data class ChatSession(
    val id: String,
    val title: String,
    @SerialName("thread_id") val threadId: String? = null,
    val cwd: String = "",
    val yolo: Boolean = false,
    val draft: String = "",
    @SerialName("is_sending") val isSending: Boolean = false,
    @SerialName("pending_request_id") val pendingRequestId: String? = null,
    val messages: List<ChatMessage> = emptyList()
)

@Serializable
data class ChatMessage(val id: String, val role: String, val content: String)

@Serializable
data class PersistedState(
    @SerialName("client_installation_id") val clientInstallationId: String = "",
    val sessions: List<ChatSession>,
    val activeSessionId: String?,
    val credentials: BrokerCredentials? = null,
    @SerialName("task_alerts_enabled") val taskAlertsEnabled: Boolean = true
) {
    fun toUiState(): UiState = UiState(
        clientInstallationId = clientInstallationId,
        sessions = sessions,
        activeSessionId = activeSessionId,
        credentials = credentials,
        taskAlertsEnabled = taskAlertsEnabled,
        connectionSummary = if (credentials != null) "Broker 已就绪，可使用受信设备重连" else "Broker 已就绪，设备未认证"
    )
}

@Serializable
data class StreamRequest(
    val message: String,
    @SerialName("thread_id") val threadId: String? = null,
    val cwd: String,
    val yolo: Boolean,
    @SerialName("session_id") val sessionId: String,
    @SerialName("request_id") val requestId: String
)

@Serializable
data class BrokerConfig(
    @SerialName("codex_model") val codexModel: String,
    @SerialName("codex_home") val codexHome: String
)

@Serializable
data class DirectoryListing(
    val root: String,
    val current: String,
    val parent: String? = null,
    val directories: List<RemoteDirectory>,
    val files: List<RemoteFile> = emptyList()
)

@Serializable
data class RemoteDirectory(val name: String, val path: String)

@Serializable
data class RemoteFile(
    val name: String,
    val path: String,
    val size: Long,
    @SerialName("modified_at") val modifiedAt: String
)

@Serializable
data class DeviceRoot(val name: String, val path: String)

@Serializable
data class DeviceRootsPayload(val roots: List<DeviceRoot>)

@Serializable
data class DeviceFilePayload(
    val name: String,
    val path: String,
    val size: Long,
    @SerialName("modified_at") val modifiedAt: String,
    @SerialName("mime_type") val mimeType: String,
    @SerialName("data_base64") val dataBase64: String
)

@Serializable
data class DeviceFileUploadRequest(
    val directory: String,
    val name: String,
    @SerialName("data_base64") val dataBase64: String
)

@Serializable
data class DeviceFileUploadResult(
    val ok: Boolean,
    val name: String,
    val path: String,
    val size: Long,
    @SerialName("modified_at") val modifiedAt: String
)

@Serializable
data class TransferLinkPayload(
    val ok: Boolean,
    val provider: String,
    val name: String,
    val path: String,
    val size: Long,
    @SerialName("modified_at") val modifiedAt: String,
    val link: String,
    val expiry: String,
    @SerialName("auto_delete") val autoDelete: Boolean
)

data class TransferDownloadPayload(
    val name: String,
    val url: String
)

@Serializable
data class FileOperationState(
    val path: String,
    val type: String,
    val label: String
)

private fun enqueueTransferDownload(context: Context, payload: TransferDownloadPayload): Long {
    val manager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
    val request = DownloadManager.Request(Uri.parse(payload.url))
        .setTitle(payload.name)
        .setDescription("Codex 中转下载中")
        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
        .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, payload.name)
        .setAllowedOverMetered(true)
        .setAllowedOverRoaming(true)
    return manager.enqueue(request)
}

@Serializable
data class ChatSyncTask(
    @SerialName("requestId") val requestId: String,
    @SerialName("sessionId") val sessionId: String? = null,
    @SerialName("threadId") val threadId: String? = null,
    val status: String,
    val text: String = "",
    val error: String? = null
)

@Serializable
data class ChatSyncPayload(val tasks: List<ChatSyncTask>)

private fun shortPath(path: String?): String {
    return path?.replace("\\", "/").takeUnless { it.isNullOrBlank() } ?: "~"
}

private fun deriveSessionTitle(text: String): String {
    return text
        .replace('\n', ' ')
        .trim()
        .take(14)
        .ifBlank { DEFAULT_SESSION_TITLE }
}

private fun formatBytes(size: Long): String {
    return when {
        size >= 1024 * 1024 -> String.format("%.1f MB", size / 1024f / 1024f)
        size >= 1024 -> String.format("%.1f KB", size / 1024f)
        else -> "$size B"
    }
}

private fun queryDisplayName(context: Context, uri: Uri): String? {
    return context.contentResolver.query(uri, arrayOf(android.provider.OpenableColumns.DISPLAY_NAME), null, null, null)
        ?.use { cursor ->
            val index = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
            if (index >= 0 && cursor.moveToFirst()) cursor.getString(index) else null
        }
}

private fun recoverSessionMessages(messages: List<ChatMessage>, task: ChatSyncTask): List<ChatMessage> {
    if (messages.isEmpty()) return messages
    val replacement = task.error?.let { "错误: $it" } ?: task.text
    if (replacement.isBlank()) return messages
    val lastAssistantIndex = messages.indexOfLast { it.role == "assistant" }
    if (lastAssistantIndex < 0) return messages
    return messages.mapIndexed { index, message ->
        if (index == lastAssistantIndex) message.copy(content = replacement) else message
    }
}
