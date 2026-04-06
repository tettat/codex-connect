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
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.layout.heightIn
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
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.ChatBubbleOutline
import androidx.compose.material.icons.rounded.Computer
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.Folder
import androidx.compose.material.icons.rounded.Link
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Settings
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
import androidx.compose.runtime.saveable.rememberSaveable
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

private enum class AppScreen {
    Devices,
    DeviceHome,
    DeviceProjects,
    DeviceCredentials,
    DeviceFiles,
    DeviceSettings,
    ProjectHome,
    ProjectSessions,
    ProjectGit,
    ProjectSettings,
    SessionChat,
    SessionSettings
}

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
    val scope = rememberCoroutineScope()
    var currentScreenName by rememberSaveable { mutableStateOf(AppScreen.Devices.name) }
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

    val currentScreen = runCatching { AppScreen.valueOf(currentScreenName) }.getOrElse { AppScreen.Devices }
    val goBack = {
        currentScreenName = when (currentScreen) {
            AppScreen.Devices -> AppScreen.Devices.name
            AppScreen.DeviceHome -> AppScreen.Devices.name
            AppScreen.DeviceProjects, AppScreen.DeviceCredentials, AppScreen.DeviceFiles, AppScreen.DeviceSettings -> AppScreen.DeviceHome.name
            AppScreen.ProjectHome -> AppScreen.DeviceProjects.name
            AppScreen.ProjectSessions, AppScreen.ProjectGit, AppScreen.ProjectSettings -> AppScreen.ProjectHome.name
            AppScreen.SessionChat -> AppScreen.ProjectSessions.name
            AppScreen.SessionSettings -> AppScreen.SessionChat.name
        }
    }

    LaunchedEffect(ui.devices.size, ui.activeDeviceId, ui.activeProject?.id, ui.activeSession?.id, currentScreenName) {
        val resolved = when {
            currentScreen != AppScreen.Devices && ui.activeDevice == null -> AppScreen.Devices
            currentScreen in listOf(AppScreen.ProjectHome, AppScreen.ProjectSessions, AppScreen.ProjectSettings, AppScreen.SessionChat, AppScreen.SessionSettings) &&
                ui.activeProject == null -> if (ui.activeDevice != null) AppScreen.DeviceProjects else AppScreen.Devices
            currentScreen in listOf(AppScreen.SessionChat, AppScreen.SessionSettings) && ui.activeSession == null ->
                if (ui.activeProject != null) AppScreen.ProjectSessions else AppScreen.DeviceProjects
            else -> currentScreen
        }
        if (resolved.name != currentScreenName) currentScreenName = resolved.name
    }

    LaunchedEffect(currentScreenName, ui.activeDeviceId, ui.activeProject?.id, ui.activeSession?.id, ui.relayAuthenticated) {
        if (!ui.relayAuthenticated) return@LaunchedEffect
        when (currentScreen) {
            AppScreen.DeviceFiles -> {
                if (ui.fileRoots.isEmpty()) vm.loadDeviceRoots()
                val target = ui.activeDevice?.codexHome.orEmpty()
                if (target.isNotBlank()) vm.browseDirectory(target)
            }
            AppScreen.DeviceCredentials -> {
                if (ui.fileRoots.isEmpty()) vm.loadDeviceRoots()
                vm.refreshContextCatalog()
                val target = ui.activeDevice?.credentialsRoot?.ifBlank { ui.activeDevice?.codexHome } ?: ui.activeDevice?.codexHome.orEmpty()
                if (target.isNotBlank()) vm.browseDirectory(target)
            }
            AppScreen.ProjectGit -> {
                vm.refreshProjectGit()
            }
            AppScreen.ProjectSettings -> {
                if (ui.fileRoots.isEmpty()) vm.loadDeviceRoots()
                val target = ui.activeProject?.rootPath?.ifBlank { ui.activeDevice?.codexHome } ?: ui.activeDevice?.codexHome.orEmpty()
                if (target.isNotBlank()) vm.browseDirectory(target)
            }
            AppScreen.SessionSettings -> {
                if (ui.fileRoots.isEmpty()) vm.loadDeviceRoots()
                val target = ui.activeSession?.cwd?.ifBlank { ui.activeProject?.rootPath?.ifBlank { ui.activeDevice?.codexHome } }
                    ?: ui.activeProject?.rootPath?.ifBlank { ui.activeDevice?.codexHome }
                    ?: ui.activeDevice?.codexHome.orEmpty()
                if (target.isNotBlank()) vm.browseDirectory(target)
            }
            else -> Unit
        }
    }

    val title = when (currentScreen) {
        AppScreen.Devices -> "设备"
        AppScreen.DeviceHome -> ui.activeDevice?.displayName ?: "设备"
        AppScreen.DeviceProjects -> "项目"
        AppScreen.DeviceCredentials -> "凭据中心"
        AppScreen.DeviceFiles -> "文件管理"
        AppScreen.DeviceSettings -> "设备设置"
        AppScreen.ProjectHome -> ui.activeProject?.name ?: "项目"
        AppScreen.ProjectSessions -> "会话"
        AppScreen.ProjectGit -> "Git"
        AppScreen.ProjectSettings -> "项目设置"
        AppScreen.SessionChat -> ui.activeSession?.title ?: DEFAULT_SESSION_TITLE
        AppScreen.SessionSettings -> "会话设置"
    }
    val subtitle = when (currentScreen) {
        AppScreen.Devices -> ui.connectionSummary
        AppScreen.DeviceHome, AppScreen.DeviceCredentials, AppScreen.DeviceFiles, AppScreen.DeviceSettings, AppScreen.DeviceProjects ->
            ui.activeDevice?.displayName ?: ui.connectionSummary
        AppScreen.ProjectHome, AppScreen.ProjectSessions, AppScreen.ProjectGit, AppScreen.ProjectSettings ->
            "${ui.activeDevice?.displayName ?: "设备"} · ${ui.activeProject?.name ?: "项目"}"
        AppScreen.SessionChat, AppScreen.SessionSettings ->
            "${ui.activeDevice?.displayName ?: "设备"} · ${ui.activeProject?.name ?: "项目"}"
    }

    Scaffold(
        containerColor = Color.Transparent,
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(title, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(
                            subtitle,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF6C6759)
                        )
                    }
                },
                navigationIcon = {
                    if (currentScreen != AppScreen.Devices) {
                        IconButton(onClick = goBack) {
                            Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "返回")
                        }
                    }
                },
                actions = {
                    if (currentScreen == AppScreen.SessionChat && ui.activeSession != null) {
                        TextButton(onClick = { currentScreenName = AppScreen.SessionSettings.name }) { Text("设置") }
                    }
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
            when (currentScreen) {
                AppScreen.Devices -> DeviceListScreen(
                    ui = ui,
                    onJoinCode = vm::updateJoinCode,
                    onPair = vm::pairWithCode,
                    onOpenDevice = { installationId ->
                        vm.connectDevice(installationId)
                        currentScreenName = AppScreen.DeviceHome.name
                    }
                )
                AppScreen.DeviceHome -> DeviceHomeScreen(
                    ui = ui,
                    onProjects = { currentScreenName = AppScreen.DeviceProjects.name },
                    onCredentials = { currentScreenName = AppScreen.DeviceCredentials.name },
                    onFiles = { currentScreenName = AppScreen.DeviceFiles.name },
                    onSettings = { currentScreenName = AppScreen.DeviceSettings.name }
                )
                AppScreen.DeviceProjects -> ProjectListScreen(
                    ui = ui,
                    onCreateProject = {
                        vm.createProject()
                        currentScreenName = AppScreen.ProjectSettings.name
                    },
                    onOpenProject = {
                        vm.selectProject(it)
                        currentScreenName = AppScreen.ProjectHome.name
                    }
                )
                AppScreen.DeviceCredentials -> DeviceCredentialsScreen(
                    ui = ui,
                    onConnect = { vm.resumeTrustedConnection() },
                    onOpenCredentialProject = {
                        vm.openCredentialCenterProject()
                        currentScreenName = AppScreen.ProjectSessions.name
                    },
                    onRefreshCatalog = vm::refreshContextCatalog,
                    onLoadRoots = vm::loadDeviceRoots,
                    onHome = vm::browseHome,
                    onUp = vm::browseParent,
                    onBrowse = vm::browseDirectory,
                    onCreateFolder = vm::createDirectory,
                    onSetRoot = { path, initialize -> vm.setCredentialsRoot(path, initialize) },
                    onCreateBundle = vm::createCredentialBundle,
                    onToggleProjectContext = vm::toggleProjectContext
                )
                AppScreen.DeviceFiles -> DeviceFileManagerScreen(
                    ui = ui,
                    onConnect = { vm.resumeTrustedConnection() },
                    onLoadRoots = vm::loadDeviceRoots,
                    onHome = vm::browseHome,
                    onUp = vm::browseParent,
                    onBrowse = vm::browseDirectory,
                    onCreateFolder = vm::createDirectory,
                    onDownload = { path ->
                        vm.downloadDeviceFile(path) { payload ->
                            pendingDownload = payload
                            downloadLauncher.launch(payload.name)
                        }
                    },
                    onTransferDownload = { path ->
                        vm.prepareTransferDownload(path) { payload ->
                            runCatching { enqueueTransferDownload(context, payload) }
                                .onSuccess {
                                    vm.reportStatus("已加入系统下载队列: ${payload.name}")
                                    vm.clearFileOp()
                                }
                                .onFailure {
                                    vm.reportStatus("中转下载启动失败: ${it.message}")
                                    vm.clearFileOp()
                                }
                        }
                    },
                    onUploadPick = { uploadLauncher.launch(arrayOf("*/*")) }
                )
                AppScreen.DeviceSettings -> DeviceSettingsScreen(
                    ui = ui,
                    onReconnect = { vm.resumeTrustedConnection() },
                    onDisconnect = vm::disconnectRelay,
                    onRemoveDevice = { id ->
                        vm.removeDevice(id)
                        currentScreenName = AppScreen.Devices.name
                    }
                )
                AppScreen.ProjectHome -> ProjectHomeScreen(
                    ui = ui,
                    onSessions = { currentScreenName = AppScreen.ProjectSessions.name },
                    onGit = { currentScreenName = AppScreen.ProjectGit.name },
                    onSettings = { currentScreenName = AppScreen.ProjectSettings.name }
                )
                AppScreen.ProjectSessions -> ProjectSessionsScreen(
                    ui = ui,
                    onCreateSession = {
                        vm.createSession()
                        currentScreenName = AppScreen.SessionChat.name
                    },
                    onCreateFromSession = { sessionId, continueThread ->
                        vm.createSessionFromSource(sessionId, continueThread)
                        currentScreenName = AppScreen.SessionChat.name
                    },
                    onOpenSession = {
                        vm.selectSession(it)
                        currentScreenName = AppScreen.SessionChat.name
                    },
                    onDeleteSession = vm::deleteSession
                )
                AppScreen.ProjectGit -> ProjectGitScreen(
                    ui = ui,
                    onRefresh = vm::refreshProjectGit,
                    onBindRepo = vm::bindProjectRepositoryFromRoot,
                    onInitRepo = vm::initializeProjectRepository,
                    onCreateGithubRepo = vm::createProjectGithubRepository,
                    onBindGithubRepo = vm::bindProjectGithubRepository,
                    onCreateWorktreeSession = { branch, base ->
                        vm.createWorktreeSession(branch, base)
                        currentScreenName = AppScreen.ProjectSessions.name
                    },
                    onPrepareMergeSession = { source, target ->
                        vm.createMergeOperationSession(source, target)
                        currentScreenName = AppScreen.ProjectSessions.name
                    },
                    onPrepareRebaseSession = { source, target ->
                        vm.createRebaseOperationSession(source, target)
                        currentScreenName = AppScreen.ProjectSessions.name
                    },
                    onPushBranch = vm::pushActiveSessionBranch,
                    onCreatePullRequest = vm::createPullRequestForActiveSession,
                    onMergePullRequest = vm::mergePullRequest,
                    onFinalizeMergeSession = vm::finalizeActiveMergeSession
                )
                AppScreen.ProjectSettings -> ProjectSettingsScreen(
                    ui = ui,
                    onConnect = { vm.resumeTrustedConnection() },
                    onProjectName = vm::renameActiveProject,
                    onModelChange = vm::updateActiveProjectModel,
                    onYoloChange = vm::updateActiveProjectYolo,
                    onInstructionsChange = vm::updateActiveProjectInstructions,
                    onUpdateContextRefs = vm::replaceProjectContextRefs,
                    onSelectFolder = vm::updateActiveProjectRoot,
                    onLoadRoots = vm::loadDeviceRoots,
                    onHome = vm::browseHome,
                    onUp = vm::browseParent,
                    onBrowse = vm::browseDirectory,
                    onCreateFolder = vm::createDirectory,
                    onDeleteProject = {
                        ui.activeProject?.id?.let(vm::deleteProject)
                        currentScreenName = AppScreen.DeviceProjects.name
                    }
                )
                AppScreen.SessionChat -> ConversationPanel(
                    ui = ui,
                    onComposerChange = vm::updateActiveDraft,
                    onAttachContext = vm::attachContextToActiveSession,
                    onDetachContext = vm::detachContextFromActiveSession,
                    onForceStop = vm::forceStopActiveSession,
                    onSend = vm::sendMessage,
                    onCopy = vm::reportStatus
                )
                AppScreen.SessionSettings -> SessionSettingsScreen(
                    ui = ui,
                    onConnect = { vm.resumeTrustedConnection() },
                    onSessionTitle = vm::renameActiveSessionTitle,
                    onModelChange = vm::updateActiveSessionModel,
                    onYoloChange = vm::updateActiveSessionYolo,
                    onInstructionsChange = vm::updateActiveSessionInstructions,
                    onUpdateContextRefs = vm::replaceSessionContextRefs,
                    onSelectFolder = vm::updateActiveSessionWorkspace,
                    onLoadRoots = vm::loadDeviceRoots,
                    onHome = vm::browseHome,
                    onUp = vm::browseParent,
                    onBrowse = vm::browseDirectory,
                    onCreateFolder = vm::createDirectory,
                    onContinueAsNewSession = {
                        vm.currentSessionId()?.let { sessionId ->
                            vm.createSessionFromSource(sessionId, continueThread = true)
                            currentScreenName = AppScreen.SessionChat.name
                        }
                    },
                    onForkAsNewSession = {
                        vm.currentSessionId()?.let { sessionId ->
                            vm.createSessionFromSource(sessionId, continueThread = false)
                            currentScreenName = AppScreen.SessionChat.name
                        }
                    }
                )
            }
        }
    }
}

@Composable
private fun DeviceListScreen(
    ui: UiState,
    onJoinCode: (String) -> Unit,
    onPair: () -> Unit,
    onOpenDevice: (String) -> Unit
) {
    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard("新增设备") {
            Text(FIXED_BROKER_URL, color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = ui.joinCode,
                onValueChange = onJoinCode,
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("输入 6 位连接码") },
                singleLine = true,
                shape = RoundedCornerShape(18.dp)
            )
            Spacer(Modifier.height(10.dp))
            Button(onClick = onPair, shape = RoundedCornerShape(999.dp)) {
                Icon(Icons.Rounded.Add, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("新增设备")
            }
        }

        SectionCard("设备列表") {
            if (ui.devices.isEmpty()) {
                Text("还没有已保存设备，先用连接码配对一台。", color = Color(0xFF6C6759))
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth().height(460.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(ui.devices, key = { it.installationId }) { device ->
                        NavigationListItem(
                            title = device.displayName,
                            subtitle = "${device.codexModel.ifBlank { "模型未知" }} · ${device.sessions.size} 个会话",
                            active = device.installationId == ui.activeDeviceId,
                            icon = { Icon(Icons.Rounded.Computer, contentDescription = null, tint = Color(0xFF1E6A56)) },
                            onClick = { onOpenDevice(device.installationId) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun DeviceHomeScreen(
    ui: UiState,
    onProjects: () -> Unit,
    onCredentials: () -> Unit,
    onFiles: () -> Unit,
    onSettings: () -> Unit
) {
    val device = ui.activeDevice
    if (device == null) {
        EmptyStateCard("请先选择一台设备", "从设备列表进入，或新增一台设备。")
        return
    }
    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard("设备概览") {
            Text(device.displayName, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            Text(
                if (ui.relayAuthenticated) "已连接，可直接进入项目和文件管理" else "当前设备未连接，可在设备设置里重连",
                color = Color(0xFF6C6759)
            )
        }
        NavigationCard("项目", "管理项目、项目设置和会话", onProjects)
        NavigationCard("凭据中心", "统一管理 .env / json / skills，并可绑定到项目", onCredentials)
        NavigationCard("文件管理", "设备级浏览、上传、下载与中转下载", onFiles)
        NavigationCard("设备设置", "连接状态、重连、取消配对", onSettings)
    }
}

@Composable
private fun ProjectListScreen(
    ui: UiState,
    onCreateProject: () -> Unit,
    onOpenProject: (String) -> Unit
) {
    val device = ui.activeDevice
    if (device == null) {
        EmptyStateCard("请先选择设备", "设备下才有项目。")
        return
    }
    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard("项目列表") {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Button(onClick = onCreateProject, shape = RoundedCornerShape(999.dp)) {
                    Icon(Icons.Rounded.Add, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text("新建项目")
                }
                Text("${ui.visibleProjects.size} 个项目", color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
            }
            Spacer(Modifier.height(10.dp))
            if (ui.visibleProjects.isEmpty()) {
                Text("当前设备还没有项目。", color = Color(0xFF6C6759))
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth().height(460.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(ui.visibleProjects, key = { it.id }) { project ->
                        NavigationListItem(
                            title = project.name,
                            subtitle = "${shortPath(project.rootPath)} · 默认模型 ${project.defaultModel.ifBlank { device.codexModel.ifBlank { "未设置" } }} · ${project.sessions.size} 个会话",
                            active = project.id == device.activeProjectId,
                            icon = { Icon(Icons.Rounded.Folder, contentDescription = null, tint = Color(0xFF1E6A56)) },
                            onClick = { onOpenProject(project.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ProjectHomeScreen(
    ui: UiState,
    onSessions: () -> Unit,
    onGit: () -> Unit,
    onSettings: () -> Unit
) {
    val project = ui.activeProject
    if (project == null) {
        EmptyStateCard("请先选择项目", "项目里可以继续管理会话和设置。")
        return
    }
    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard("项目概览") {
            Text(project.name, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            Text("默认目录：${shortPath(project.rootPath)}", color = Color(0xFF6C6759))
            Text("仓库：${shortPath(project.repoRoot.ifBlank { project.rootPath })}", color = Color(0xFF6C6759))
            Text("默认模型：${project.defaultModel.ifBlank { ui.activeDevice?.codexModel ?: "未设置" }}", color = Color(0xFF6C6759))
            Text("默认模式：${if (project.defaultYolo) "YOLO" else "受限"}", color = Color(0xFF6C6759))
        }
        NavigationCard("会话", "查看和管理项目下的会话", onSessions)
        NavigationCard("Git", "仓库状态、分支、worktree、PR 与合并", onGit)
        NavigationCard("设置", "项目名、项目目录、默认模型与 YOLO", onSettings)
    }
}

@Composable
private fun ProjectSessionsScreen(
    ui: UiState,
    onCreateSession: () -> Unit,
    onCreateFromSession: (String, Boolean) -> Unit,
    onOpenSession: (String) -> Unit,
    onDeleteSession: (String) -> Unit
) {
    val project = ui.activeProject
    if (project == null) {
        EmptyStateCard("请先选择项目", "项目下才能创建会话。")
        return
    }
    var showStartDialog by rememberSaveable(project.id) { mutableStateOf(false) }
    SectionCard("会话列表") {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(onClick = onCreateSession, shape = RoundedCornerShape(999.dp)) {
                Icon(Icons.Rounded.Add, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("新建空会话")
            }
            OutlinedButton(
                onClick = { showStartDialog = true },
                enabled = project.sessions.isNotEmpty(),
                shape = RoundedCornerShape(999.dp)
            ) {
                Icon(Icons.Rounded.ChatBubbleOutline, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("从已有会话启动")
            }
        }
        Spacer(Modifier.height(10.dp))
        if (project.sessions.isEmpty()) {
            Text("当前项目还没有会话。", color = Color(0xFF6C6759))
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxWidth().height(460.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(project.sessions, key = { it.id }) { session ->
                    val active = session.id == project.activeSessionId
                    Card(
                        colors = CardDefaults.cardColors(containerColor = if (active) Color(0xFFE6F2EC) else Color.White),
                        shape = RoundedCornerShape(18.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().clickable { onOpenSession(session.id) }.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(session.title, fontWeight = FontWeight.SemiBold)
                                Text(
                                    "${shortPath(session.cwd)} · ${session.model.ifBlank { ui.activeDevice?.codexModel ?: "默认模型" }} · ${if (session.yolo) "YOLO" else "受限"}",
                                    color = Color(0xFF6C6759),
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                            IconButton(onClick = { onDeleteSession(session.id) }) {
                                Icon(Icons.Rounded.DeleteOutline, contentDescription = "删除会话", tint = Color(0xFF7D3C36))
                            }
                            Icon(Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = null, tint = Color(0xFF6C6759))
                        }
                    }
                }
            }
        }
    }
    if (showStartDialog) {
        StartFromSessionDialog(
            sessions = project.sessions,
            onDismiss = { showStartDialog = false },
            onContinue = { sessionId ->
                showStartDialog = false
                onCreateFromSession(sessionId, true)
            },
            onFork = { sessionId ->
                showStartDialog = false
                onCreateFromSession(sessionId, false)
            }
        )
    }
}

@Composable
private fun StartFromSessionDialog(
    sessions: List<ChatSession>,
    onDismiss: () -> Unit,
    onContinue: (String) -> Unit,
    onFork: (String) -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("从已有会话启动") },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 420.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text("继续：复用原来的 thread；分叉：复制上下文，但开启独立新线程。", color = Color(0xFF6C6759))
                sessions.forEach { session ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFF8F4EA)),
                        shape = RoundedCornerShape(18.dp)
                    ) {
                        Column(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(session.title, fontWeight = FontWeight.SemiBold)
                            Text(
                                "${shortPath(session.cwd)} · ${if (session.threadId.isNullOrBlank()) "未建立 thread" else "可继续"}",
                                color = Color(0xFF6C6759),
                                style = MaterialTheme.typography.bodySmall
                            )
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(
                                    onClick = { onContinue(session.id) },
                                    enabled = !session.threadId.isNullOrBlank(),
                                    shape = RoundedCornerShape(999.dp)
                                ) {
                                    Text("继续")
                                }
                                OutlinedButton(
                                    onClick = { onFork(session.id) },
                                    shape = RoundedCornerShape(999.dp)
                                ) {
                                    Text("分叉")
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("关闭") }
        }
    )
}

@Composable
private fun DeviceSettingsScreen(
    ui: UiState,
    onReconnect: () -> Unit,
    onDisconnect: () -> Unit,
    onRemoveDevice: (String) -> Unit
) {
    val device = ui.activeDevice
    if (device == null) {
        EmptyStateCard("请先选择设备", "设备设置里可重连或取消配对。")
        return
    }
    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard("连接状态") {
            Text(if (ui.relayAuthenticated) "当前已连接" else "当前未连接", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(6.dp))
            Text("设备名：${device.displayName}", color = Color(0xFF6C6759))
            Text("installation_id：${device.installationId}", color = Color(0xFF6C6759), fontSize = 12.sp)
            Text("device_id：${device.credentials.deviceId}", color = Color(0xFF6C6759), fontSize = 12.sp)
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onReconnect, shape = RoundedCornerShape(999.dp)) { Text("重新连接") }
                OutlinedButton(onClick = onDisconnect, enabled = ui.relayConnected, shape = RoundedCornerShape(999.dp)) { Text("断开") }
                OutlinedButton(onClick = { onRemoveDevice(device.installationId) }, shape = RoundedCornerShape(999.dp)) { Text("取消配对") }
            }
        }
        SectionCard("日志") {
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF102019)), shape = RoundedCornerShape(20.dp)) {
                Text(
                    ui.relayLog.ifBlank { "暂无日志" },
                    modifier = Modifier.padding(12.dp),
                    color = Color(0xFFD9F7EA),
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

@Composable
private fun ProjectSettingsScreen(
    ui: UiState,
    onConnect: () -> Unit,
    onProjectName: (String) -> Unit,
    onModelChange: (String) -> Unit,
    onYoloChange: (Boolean) -> Unit,
    onInstructionsChange: (String) -> Unit,
    onUpdateContextRefs: (List<ContextRef>) -> Unit,
    onSelectFolder: (String) -> Unit,
    onLoadRoots: () -> Unit,
    onHome: () -> Unit,
    onUp: () -> Unit,
    onBrowse: (String) -> Unit,
    onCreateFolder: (String, String) -> Unit,
    onDeleteProject: () -> Unit
) {
    val project = ui.activeProject
    if (project == null) {
        EmptyStateCard("请先选择项目", "项目设置包含目录和默认参数。")
        return
    }
    var showBindingDialog by rememberSaveable(project.id) { mutableStateOf(false) }
    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard("项目设置") {
            OutlinedTextField(
                value = project.name,
                onValueChange = onProjectName,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("项目名") },
                singleLine = true,
                shape = RoundedCornerShape(18.dp)
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = project.defaultInstructions,
                onValueChange = onInstructionsChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("项目提示词 / 技能说明") },
                minLines = 3,
                maxLines = 5,
                shape = RoundedCornerShape(18.dp)
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = project.defaultModel,
                onValueChange = onModelChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("默认模型") },
                singleLine = true,
                shape = RoundedCornerShape(18.dp)
            )
            Spacer(Modifier.height(10.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("默认 YOLO", fontWeight = FontWeight.SemiBold)
                    Text("新建会话时默认继承", color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
                }
                Switch(checked = project.defaultYolo, onCheckedChange = onYoloChange)
            }
            Spacer(Modifier.height(10.dp))
            Button(onClick = { showBindingDialog = true }, shape = RoundedCornerShape(999.dp)) {
                Text("绑定凭据 / Skills")
            }
            if (project.contextRefs.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                project.contextRefs.forEach { ref ->
                    ContextRefRow(
                        label = resolveContextLabel(ui, ref),
                        subtitle = ref.kind,
                        onRemove = {
                            onUpdateContextRefs(project.contextRefs.filterNot { item -> item.kind == ref.kind && item.id == ref.id })
                        }
                    )
                }
            }
            Spacer(Modifier.height(10.dp))
            OutlinedButton(onClick = onDeleteProject, shape = RoundedCornerShape(999.dp)) { Text("删除项目") }
        }
        FolderSelectionScreen(
            ui = ui,
            title = "项目文件夹",
            selectedPath = project.rootPath.ifBlank { ui.activeDevice?.codexHome.orEmpty() },
            onConnect = onConnect,
            onLoadRoots = onLoadRoots,
            onHome = onHome,
            onUp = onUp,
            onBrowse = onBrowse,
            onCreateFolder = onCreateFolder,
            onSelectFolder = onSelectFolder
        )
    }
    if (showBindingDialog) {
        ContextBindingDialog(
            title = "绑定到项目",
            entries = ui.availableContextEntries,
            selected = project.contextRefs,
            onDismiss = { showBindingDialog = false },
            onConfirm = {
                onUpdateContextRefs(it)
                showBindingDialog = false
            }
        )
    }
}

@Composable
private fun SessionSettingsScreen(
    ui: UiState,
    onConnect: () -> Unit,
    onSessionTitle: (String) -> Unit,
    onModelChange: (String) -> Unit,
    onYoloChange: (Boolean) -> Unit,
    onInstructionsChange: (String) -> Unit,
    onUpdateContextRefs: (List<ContextRef>) -> Unit,
    onSelectFolder: (String) -> Unit,
    onLoadRoots: () -> Unit,
    onHome: () -> Unit,
    onUp: () -> Unit,
    onBrowse: (String) -> Unit,
    onCreateFolder: (String, String) -> Unit,
    onContinueAsNewSession: () -> Unit,
    onForkAsNewSession: () -> Unit
) {
    val session = ui.activeSession
    if (session == null) {
        EmptyStateCard("请先选择会话", "会话设置可覆盖项目默认配置。")
        return
    }
    var showBindingDialog by rememberSaveable(session.id) { mutableStateOf(false) }
    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard("会话设置") {
            OutlinedTextField(
                value = session.title,
                onValueChange = onSessionTitle,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("会话标题") },
                singleLine = true,
                shape = RoundedCornerShape(18.dp)
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = session.instructions,
                onValueChange = onInstructionsChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("会话补充提示") },
                minLines = 3,
                maxLines = 5,
                shape = RoundedCornerShape(18.dp)
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = session.model,
                onValueChange = onModelChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("会话模型") },
                singleLine = true,
                shape = RoundedCornerShape(18.dp)
            )
            Spacer(Modifier.height(10.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("YOLO 模式", fontWeight = FontWeight.SemiBold)
                    Text("仅覆盖当前会话", color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
                }
                Switch(checked = session.yolo, onCheckedChange = onYoloChange)
            }
            Spacer(Modifier.height(10.dp))
            Button(onClick = { showBindingDialog = true }, shape = RoundedCornerShape(999.dp)) {
                Text("附加上下文")
            }
            if (session.contextRefs.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                session.contextRefs.forEach { ref ->
                    ContextRefRow(
                        label = resolveContextLabel(ui, ref),
                        subtitle = ref.kind,
                        onRemove = {
                            onUpdateContextRefs(session.contextRefs.filterNot { item -> item.kind == ref.kind && item.id == ref.id })
                        }
                    )
                }
            }
            if (!session.branchName.isNullOrBlank()) {
                Spacer(Modifier.height(10.dp))
                Text("当前分支：${session.branchName}", color = Color(0xFF6C6759))
                Text("worktree：${shortPath(session.worktreePath)}", color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
            }
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(
                    onClick = onContinueAsNewSession,
                    enabled = !session.threadId.isNullOrBlank(),
                    shape = RoundedCornerShape(999.dp)
                ) {
                    Text("继续为新会话")
                }
                OutlinedButton(onClick = onForkAsNewSession, shape = RoundedCornerShape(999.dp)) {
                    Text("分叉为新会话")
                }
            }
        }
        FolderSelectionScreen(
            ui = ui,
            title = "会话工作目录",
            selectedPath = session.cwd.ifBlank { ui.activeProject?.rootPath.orEmpty() },
            onConnect = onConnect,
            onLoadRoots = onLoadRoots,
            onHome = onHome,
            onUp = onUp,
            onBrowse = onBrowse,
            onCreateFolder = onCreateFolder,
            onSelectFolder = onSelectFolder
        )
    }
    if (showBindingDialog) {
        ContextBindingDialog(
            title = "附加到会话",
            entries = ui.availableContextEntries,
            selected = session.contextRefs,
            onDismiss = { showBindingDialog = false },
            onConfirm = {
                onUpdateContextRefs(it)
                showBindingDialog = false
            }
        )
    }
}

@Composable
private fun DeviceFileManagerScreen(
    ui: UiState,
    onConnect: () -> Unit,
    onLoadRoots: () -> Unit,
    onHome: () -> Unit,
    onUp: () -> Unit,
    onBrowse: (String) -> Unit,
    onCreateFolder: (String, String) -> Unit,
    onDownload: (String) -> Unit,
    onTransferDownload: (String) -> Unit,
    onUploadPick: () -> Unit
) {
    val device = ui.activeDevice
    if (device == null) {
        EmptyStateCard("请先选择设备", "设备级文件管理用于上传、下载与浏览。")
        return
    }
    if (!ui.relayAuthenticated) {
        OfflineHint("连接设备后即可使用文件管理。", onConnect)
        return
    }
    LaunchedEffect(ui.activeDevice?.installationId) {
        if (ui.fileRoots.isEmpty()) onLoadRoots()
    }
    val basePath = ui.directoryPath.ifBlank { device.codexHome.ifBlank { ui.directoryRoot } }
    var showCreateFolderDialog by rememberSaveable(ui.activeDevice?.installationId, basePath) { mutableStateOf(false) }
    SectionCard("文件管理") {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedButton(onClick = onHome, enabled = ui.directoryRoot.isNotBlank(), shape = RoundedCornerShape(999.dp)) { Text("主目录") }
            OutlinedButton(onClick = onUp, enabled = ui.directoryParent != null, shape = RoundedCornerShape(999.dp)) { Text("上级") }
            OutlinedButton(onClick = { showCreateFolderDialog = true }, enabled = basePath.isNotBlank(), shape = RoundedCornerShape(999.dp)) { Text("新建") }
            Button(onClick = onUploadPick, enabled = ui.directoryPath.isNotBlank(), shape = RoundedCornerShape(999.dp)) { Text("上传") }
        }
        Spacer(Modifier.height(10.dp))
        Text("当前目录：${shortPath(ui.directoryPath.ifBlank { device.codexHome })}", color = Color(0xFF6C6759), fontSize = 12.sp)
        Spacer(Modifier.height(10.dp))
        if (ui.isDirectoryLoading) {
            CircularProgressIndicator()
        } else {
            LazyColumn(modifier = Modifier.fillMaxWidth().height(470.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(ui.fileRoots, key = { "root-${it.path}" }) { root ->
                    CompactFolderRow(
                        label = root.name,
                        subtitle = shortPath(root.path),
                        selected = ui.directoryPath == root.path,
                        onSelect = { onBrowse(root.path) },
                        onOpen = { onBrowse(root.path) }
                    )
                }
                items(ui.directories, key = { it.path }) { dir ->
                    CompactFolderRow(
                        label = dir.name,
                        subtitle = shortPath(dir.path),
                        selected = false,
                        onSelect = { onBrowse(dir.path) },
                        onOpen = { onBrowse(dir.path) }
                    )
                }
                items(ui.files, key = { it.path }) { file ->
                    CompactFileRow(file, onDownload = { onDownload(file.path) }, onTransferDownload = { onTransferDownload(file.path) })
                }
            }
        }
    }
    if (showCreateFolderDialog) {
        CreateFolderDialog(
            basePath = basePath,
            onDismiss = { showCreateFolderDialog = false },
            onConfirm = { name ->
                onCreateFolder(basePath, name)
                showCreateFolderDialog = false
            }
        )
    }
}

@Composable
private fun FolderSelectionScreen(
    ui: UiState,
    title: String,
    selectedPath: String,
    onConnect: () -> Unit,
    onLoadRoots: () -> Unit,
    onHome: () -> Unit,
    onUp: () -> Unit,
    onBrowse: (String) -> Unit,
    onCreateFolder: (String, String) -> Unit,
    onSelectFolder: (String) -> Unit
) {
    if (!ui.relayAuthenticated) {
        OfflineHint("连接设备后才能选择目录。", onConnect)
        return
    }
    LaunchedEffect(ui.activeDevice?.installationId) {
        if (ui.fileRoots.isEmpty()) onLoadRoots()
    }
    val basePath = ui.directoryPath.ifBlank { selectedPath.ifBlank { ui.directoryRoot } }
    var showCreateFolderDialog by rememberSaveable(title, ui.activeDevice?.installationId, basePath) { mutableStateOf(false) }
    SectionCard(title) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedButton(onClick = onHome, enabled = ui.directoryRoot.isNotBlank(), shape = RoundedCornerShape(999.dp)) { Text("主目录") }
            OutlinedButton(onClick = onUp, enabled = ui.directoryParent != null, shape = RoundedCornerShape(999.dp)) { Text("上级") }
            OutlinedButton(onClick = { showCreateFolderDialog = true }, enabled = basePath.isNotBlank(), shape = RoundedCornerShape(999.dp)) { Text("新建") }
        }
        Spacer(Modifier.height(10.dp))
        CompactFolderRow(
            label = "使用当前目录",
            subtitle = shortPath(ui.directoryPath.ifBlank { selectedPath }),
            selected = true,
            onSelect = {
                val path = ui.directoryPath.ifBlank { selectedPath }
                if (path.isNotBlank()) onSelectFolder(path)
            },
            onOpen = null
        )
        Spacer(Modifier.height(8.dp))
        if (ui.isDirectoryLoading) {
            CircularProgressIndicator()
        } else {
            LazyColumn(modifier = Modifier.fillMaxWidth().height(320.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(ui.fileRoots, key = { "pick-root-${it.path}" }) { root ->
                    CompactFolderRow(
                        label = root.name,
                        subtitle = shortPath(root.path),
                        selected = selectedPath == root.path,
                        onSelect = { onSelectFolder(root.path) },
                        onOpen = { onBrowse(root.path) }
                    )
                }
                items(ui.directories, key = { "pick-dir-${it.path}" }) { dir ->
                    CompactFolderRow(
                        label = dir.name,
                        subtitle = shortPath(dir.path),
                        selected = selectedPath == dir.path,
                        onSelect = { onSelectFolder(dir.path) },
                        onOpen = { onBrowse(dir.path) }
                    )
                }
            }
        }
    }
    if (showCreateFolderDialog) {
        CreateFolderDialog(
            basePath = basePath,
            onDismiss = { showCreateFolderDialog = false },
            onConfirm = { name ->
                onCreateFolder(basePath, name)
                showCreateFolderDialog = false
            }
        )
    }
}

@Composable
private fun DeviceCredentialsScreen(
    ui: UiState,
    onConnect: () -> Unit,
    onOpenCredentialProject: () -> Unit,
    onRefreshCatalog: () -> Unit,
    onLoadRoots: () -> Unit,
    onHome: () -> Unit,
    onUp: () -> Unit,
    onBrowse: (String) -> Unit,
    onCreateFolder: (String, String) -> Unit,
    onSetRoot: (String, Boolean) -> Unit,
    onCreateBundle: (CreateCredentialBundleRequest) -> Unit,
    onToggleProjectContext: (ContextRef) -> Unit
) {
    val device = ui.activeDevice
    if (device == null) {
        EmptyStateCard("请先选择设备", "设备连接后才能设置凭据中心。")
        return
    }
    var showBundleDialog by rememberSaveable(device.installationId) { mutableStateOf(false) }
    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard("凭据中心") {
            Text("当前目录：${shortPath(device.credentialsRoot.ifBlank { ui.directoryPath })}", color = Color(0xFF6C6759))
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Button(onClick = onRefreshCatalog, shape = RoundedCornerShape(999.dp)) { Text("刷新") }
                OutlinedButton(
                    onClick = {
                        val target = ui.directoryPath.ifBlank { device.credentialsRoot.ifBlank { device.codexHome } }
                        if (target.isNotBlank()) onSetRoot(target, true)
                    },
                    shape = RoundedCornerShape(999.dp)
                ) { Text("设为当前目录并初始化") }
            }
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Button(onClick = onOpenCredentialProject, shape = RoundedCornerShape(999.dp)) { Text("打开凭据会话") }
                OutlinedButton(onClick = { showBundleDialog = true }, shape = RoundedCornerShape(999.dp)) { Text("新建凭据包") }
            }
            if (ui.activeProject != null && ui.activeProject?.kind == PROJECT_KIND_STANDARD) {
                Spacer(Modifier.height(10.dp))
                Text("当前项目：${ui.activeProject?.name}", color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
            }
        }
        FolderSelectionScreen(
            ui = ui,
            title = "凭据中心目录",
            selectedPath = device.credentialsRoot.ifBlank { device.codexHome },
            onConnect = onConnect,
            onLoadRoots = onLoadRoots,
            onHome = onHome,
            onUp = onUp,
            onBrowse = onBrowse,
            onCreateFolder = onCreateFolder,
            onSelectFolder = { onSetRoot(it, false) }
        )
        SectionCard("凭据包") {
            if (device.credentialBundles.isEmpty()) {
                Text("还没有发现任何凭据包，可先初始化目录后手动放文件，或直接新建一个。", color = Color(0xFF6C6759))
            } else {
                device.credentialBundles.forEach { bundle ->
                    ContextCatalogRow(
                        title = bundle.name,
                        subtitle = listOfNotNull(bundle.description.takeIf { it.isNotBlank() }, shortPath(bundle.folderPath)).joinToString(" · "),
                        bound = ui.activeProject?.contextRefs?.any { it.kind == "credential" && it.id == bundle.id } == true,
                        onToggleBound = if (ui.activeProject?.kind == PROJECT_KIND_STANDARD) {
                            { onToggleProjectContext(ContextRef("credential", bundle.id)) }
                        } else null
                    )
                }
            }
        }
        SectionCard("Skills") {
            if (device.availableSkills.isEmpty()) {
                Text("当前未发现本地 skills。可以把 skill 目录放到凭据中心的 `skills/` 里。", color = Color(0xFF6C6759))
            } else {
                device.availableSkills.forEach { skill ->
                    ContextCatalogRow(
                        title = skill.name,
                        subtitle = listOfNotNull(skill.description.takeIf { it.isNotBlank() }, shortPath(skill.folderPath)).joinToString(" · "),
                        bound = ui.activeProject?.contextRefs?.any { it.kind == "skill" && it.id == skill.id } == true,
                        onToggleBound = if (ui.activeProject?.kind == PROJECT_KIND_STANDARD) {
                            { onToggleProjectContext(ContextRef("skill", skill.id)) }
                        } else null
                    )
                }
            }
        }
    }
    if (showBundleDialog) {
        CreateCredentialBundleDialog(
            currentProjectName = ui.activeProject?.name,
            onDismiss = { showBundleDialog = false },
            onConfirm = {
                onCreateBundle(it)
                showBundleDialog = false
            }
        )
    }
}

@Composable
private fun ProjectGitScreen(
    ui: UiState,
    onRefresh: () -> Unit,
    onBindRepo: () -> Unit,
    onInitRepo: (String) -> Unit,
    onCreateGithubRepo: (String, String) -> Unit,
    onBindGithubRepo: (String, String, String) -> Unit,
    onCreateWorktreeSession: (String, String) -> Unit,
    onPrepareMergeSession: (String, String) -> Unit,
    onPrepareRebaseSession: (String, String) -> Unit,
    onPushBranch: (Boolean) -> Unit,
    onCreatePullRequest: (String, String, String) -> Unit,
    onMergePullRequest: (String, String) -> Unit,
    onFinalizeMergeSession: () -> Unit
) {
    val project = ui.activeProject
    if (project == null) {
        EmptyStateCard("请先选择项目", "项目绑定仓库后，才能使用 Git 工作台。")
        return
    }
    var showInitDialog by rememberSaveable(project.id) { mutableStateOf(false) }
    var showGithubDialog by rememberSaveable(project.id) { mutableStateOf(false) }
    var showGithubBindDialog by rememberSaveable(project.id) { mutableStateOf(false) }
    var showWorktreeDialog by rememberSaveable(project.id) { mutableStateOf(false) }
    var showPrDialog by rememberSaveable(project.id) { mutableStateOf(false) }
    var showMergePrDialog by rememberSaveable(project.id) { mutableStateOf(false) }
    var showMergeSessionDialog by rememberSaveable(project.id) { mutableStateOf(false) }
    var showRebaseSessionDialog by rememberSaveable(project.id) { mutableStateOf(false) }
    val repo = ui.gitRepo
    val branches = ui.gitBranches
    val activeSession = ui.activeSession
    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard("仓库概览") {
            if (ui.isGitLoading) {
                CircularProgressIndicator()
            } else if (repo?.isRepo == true) {
                Text("仓库根目录：${shortPath(repo.repoRoot)}", color = Color(0xFF6C6759))
                Text("项目相对路径：${shortPath(repo.relativePath)}", color = Color(0xFF6C6759))
                Text("当前分支：${repo.currentBranch}", color = Color(0xFF6C6759))
                Text("默认分支：${repo.defaultBranch}", color = Color(0xFF6C6759))
                Text(
                    "状态：${if (repo.status.isDirty) "有改动" else "干净"} · staged ${repo.status.staged} · modified ${repo.status.modified} · untracked ${repo.status.untracked}",
                    color = Color(0xFF6C6759),
                    style = MaterialTheme.typography.bodySmall
                )
            } else {
                Text("当前项目还没有绑定仓库。", color = Color(0xFF6C6759))
            }
            Spacer(Modifier.height(10.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Button(onClick = onRefresh, shape = RoundedCornerShape(999.dp)) { Text("刷新") }
                OutlinedButton(onClick = onBindRepo, shape = RoundedCornerShape(999.dp)) { Text("绑定项目目录内仓库") }
                OutlinedButton(onClick = { showInitDialog = true }, shape = RoundedCornerShape(999.dp)) { Text("初始化仓库") }
            }
            Spacer(Modifier.height(10.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Button(onClick = { showWorktreeDialog = true }, enabled = repo?.isRepo == true, shape = RoundedCornerShape(999.dp)) { Text("新建分支会话") }
                OutlinedButton(onClick = { showGithubDialog = true }, enabled = repo?.isRepo == true, shape = RoundedCornerShape(999.dp)) { Text("创建 GitHub 仓库") }
                OutlinedButton(onClick = { showGithubBindDialog = true }, enabled = repo?.isRepo == true, shape = RoundedCornerShape(999.dp)) { Text("绑定现有 GitHub 仓库") }
            }
        }
        SectionCard("GitHub") {
            Text(
                when {
                    ui.githubStatus == null -> "GitHub 状态：未获取"
                    ui.githubStatus.ok -> "GitHub 状态：gh 已登录"
                    else -> "GitHub 状态：gh 未登录或认证失效"
                },
                fontWeight = FontWeight.SemiBold
            )
            ui.githubStatus?.output?.takeIf { it.isNotBlank() }?.let { output ->
                Spacer(Modifier.height(6.dp))
                Text(output, color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
            }
            if (repo?.isRepo == true) {
                Spacer(Modifier.height(10.dp))
                if (repo.remoteDetails.isEmpty()) {
                    Text("当前还没有配置远端。", color = Color(0xFF6C6759))
                } else {
                    repo.remoteDetails.forEach { remote ->
                        Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(16.dp)) {
                            Column(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(remote.name, fontWeight = FontWeight.SemiBold)
                                Text("fetch: ${remote.fetchUrl.ifBlank { "未设置" }}", color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
                                Text("push: ${remote.pushUrl.ifBlank { "未设置" }}", color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
                            }
                        }
                        Spacer(Modifier.height(8.dp))
                    }
                }
            }
            if (ui.isGitActionRunning) {
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                    Text(ui.status, color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
                }
            }
        }
        if (activeSession?.branchName != null) {
            SectionCard("当前会话分支") {
                Text("分支：${activeSession.branchName}", fontWeight = FontWeight.SemiBold)
                Text("工作目录：${shortPath(activeSession.cwd)}", color = Color(0xFF6C6759))
                if (!activeSession.targetBranch.isNullOrBlank()) {
                    Text("目标分支：${activeSession.targetBranch}", color = Color(0xFF6C6759))
                }
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Button(onClick = { onPushBranch(false) }, shape = RoundedCornerShape(999.dp)) { Text("Push") }
                    OutlinedButton(onClick = { onPushBranch(true) }, shape = RoundedCornerShape(999.dp)) { Text("强推") }
                    OutlinedButton(onClick = { showPrDialog = true }, shape = RoundedCornerShape(999.dp)) { Text("创建 PR") }
                }
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedButton(onClick = { showMergeSessionDialog = true }, enabled = activeSession.kind == SESSION_KIND_WORKTREE, shape = RoundedCornerShape(999.dp)) { Text("发起合并会话") }
                    OutlinedButton(onClick = { showRebaseSessionDialog = true }, enabled = activeSession.kind == SESSION_KIND_WORKTREE, shape = RoundedCornerShape(999.dp)) { Text("发起 Rebase 会话") }
                }
                if (activeSession.kind == SESSION_KIND_MERGE) {
                    Spacer(Modifier.height(10.dp))
                    Button(onClick = onFinalizeMergeSession, shape = RoundedCornerShape(999.dp)) { Text("完成合入并清理") }
                }
            }
        }
        SectionCard("分支") {
            if (branches == null) {
                Text("刷新后即可查看本地 / 远端分支。", color = Color(0xFF6C6759))
            } else {
                branches.local.take(12).forEach { branch ->
                    ContextCatalogRow(
                        title = branch.name,
                        subtitle = listOfNotNull(branch.upstream, branch.sha.takeIf { it.isNotBlank() }).joinToString(" · "),
                        bound = branch.current,
                        onToggleBound = null,
                        trailingText = when {
                            branch.current -> "当前"
                            branch.isDefault -> "默认"
                            else -> null
                        }
                    )
                }
            }
        }
        SectionCard("历史") {
            if (ui.gitLog.isEmpty()) {
                Text("暂无历史，刷新后显示最近提交。", color = Color(0xFF6C6759))
            } else {
                ui.gitLog.forEach { commit ->
                    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(16.dp)) {
                        Column(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(commit.subject, fontWeight = FontWeight.SemiBold)
                            Text("${commit.shortSha} · ${commit.author} · ${commit.date}", color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
            Spacer(Modifier.height(10.dp))
            OutlinedButton(onClick = { showMergePrDialog = true }, shape = RoundedCornerShape(999.dp)) { Text("合并 PR") }
        }
        SectionCard("操作日志") {
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF102019)), shape = RoundedCornerShape(20.dp)) {
                SelectionContainer {
                    Text(
                        ui.relayLog.ifBlank { "暂无操作日志" },
                        modifier = Modifier.padding(12.dp),
                        color = Color(0xFFD9F7EA),
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
    }
    if (showInitDialog) {
        BranchNameDialog(
            title = "初始化仓库",
            label = "初始分支",
            initialValue = project.defaultBranch.ifBlank { "main" },
            onDismiss = { showInitDialog = false },
            onConfirm = {
                onInitRepo(it)
                showInitDialog = false
            }
        )
    }
    if (showGithubDialog) {
        GithubRepoDialog(
            initialName = project.name,
            onDismiss = { showGithubDialog = false },
            onConfirm = { name, visibility ->
                onCreateGithubRepo(name, visibility)
                showGithubDialog = false
            }
        )
    }
    if (showGithubBindDialog) {
        GithubBindDialog(
            initialRepository = "",
            initialRemote = repo?.remoteDetails?.firstOrNull()?.name ?: "origin",
            onDismiss = { showGithubBindDialog = false },
            onConfirm = { repository, remote, protocol ->
                onBindGithubRepo(repository, remote, protocol)
                showGithubBindDialog = false
            }
        )
    }
    if (showWorktreeDialog) {
        BranchOperationDialog(
            title = "新建分支会话",
            branchLabel = "分支名",
            defaultBranch = branches?.defaultBranch?.ifBlank { project.defaultBranch }.orEmpty(),
            onDismiss = { showWorktreeDialog = false },
            onConfirm = { branch, base ->
                onCreateWorktreeSession(branch, base)
                showWorktreeDialog = false
            }
        )
    }
    if (showMergeSessionDialog && activeSession?.branchName != null) {
        TargetBranchDialog(
            title = "发起合并会话",
            sourceBranch = activeSession.branchName,
            defaultBranch = branches?.defaultBranch?.ifBlank { project.defaultBranch }.orEmpty(),
            onDismiss = { showMergeSessionDialog = false },
            onConfirm = { target ->
                onPrepareMergeSession(activeSession.branchName, target)
                showMergeSessionDialog = false
            }
        )
    }
    if (showRebaseSessionDialog && activeSession?.branchName != null) {
        TargetBranchDialog(
            title = "发起 Rebase 会话",
            sourceBranch = activeSession.branchName,
            defaultBranch = branches?.defaultBranch?.ifBlank { project.defaultBranch }.orEmpty(),
            onDismiss = { showRebaseSessionDialog = false },
            onConfirm = { target ->
                onPrepareRebaseSession(activeSession.branchName, target)
                showRebaseSessionDialog = false
            }
        )
    }
    if (showPrDialog && activeSession?.branchName != null) {
        PullRequestDialog(
            defaultBase = branches?.defaultBranch?.ifBlank { project.defaultBranch }.orEmpty(),
            defaultHead = activeSession.branchName,
            onDismiss = { showPrDialog = false },
            onConfirm = { title, body, base ->
                onCreatePullRequest(title, body, base)
                showPrDialog = false
            }
        )
    }
    if (showMergePrDialog) {
        MergePullRequestDialog(
            onDismiss = { showMergePrDialog = false },
            onConfirm = { pr, method ->
                onMergePullRequest(pr, method)
                showMergePrDialog = false
            }
        )
    }
}

@Composable
private fun ContextCatalogRow(
    title: String,
    subtitle: String,
    bound: Boolean,
    onToggleBound: (() -> Unit)?,
    trailingText: String? = null
) {
    Card(colors = CardDefaults.cardColors(containerColor = if (bound) Color(0xFFE6F2EC) else Color.White), shape = RoundedCornerShape(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(title, fontWeight = FontWeight.SemiBold)
                Text(subtitle, color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
            }
            if (trailingText != null) {
                Text(trailingText, color = Color(0xFF1E6A56), style = MaterialTheme.typography.labelSmall)
            } else if (onToggleBound != null) {
                OutlinedButton(onClick = onToggleBound, shape = RoundedCornerShape(999.dp)) {
                    Text(if (bound) "解绑" else "绑定")
                }
            }
        }
    }
}

@Composable
private fun ContextRefRow(label: String, subtitle: String, onRemove: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(label, fontWeight = FontWeight.Medium)
                Text(subtitle, color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
            }
            TextButton(onClick = onRemove) { Text("移除") }
        }
    }
}

@Composable
private fun ContextBindingDialog(
    title: String,
    entries: List<ContextCatalogEntry>,
    selected: List<ContextRef>,
    onDismiss: () -> Unit,
    onConfirm: (List<ContextRef>) -> Unit
) {
    var selectedKeys by remember {
        mutableStateOf(selected.map { "${it.kind}:${it.id}" }.toSet())
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            LazyColumn(modifier = Modifier.fillMaxWidth().height(320.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(entries, key = { "${it.ref.kind}:${it.ref.id}" }) { entry ->
                    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(entry.title, fontWeight = FontWeight.SemiBold)
                                Text(entry.subtitle, color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
                            }
                            val key = "${entry.ref.kind}:${entry.ref.id}"
                            Switch(
                                checked = key in selectedKeys,
                                onCheckedChange = {
                                    selectedKeys = if (it) selectedKeys + key else selectedKeys - key
                                }
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                onConfirm(entries.filter { "${it.ref.kind}:${it.ref.id}" in selectedKeys }.map { it.ref })
            }) { Text("完成") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("取消") }
        }
    )
}

@Composable
private fun ContextPickerDialog(
    entries: List<ContextCatalogEntry>,
    query: String,
    onDismiss: () -> Unit,
    onSelect: (ContextCatalogEntry) -> Unit
) {
    val filtered = entries.filter {
        query.isBlank() ||
            it.title.contains(query, ignoreCase = true) ||
            it.subtitle.contains(query, ignoreCase = true)
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("选择上下文") },
        text = {
            if (filtered.isEmpty()) {
                Text("没有匹配的凭据或 skill。", color = Color(0xFF6C6759))
            } else {
                LazyColumn(modifier = Modifier.fillMaxWidth().height(320.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(filtered, key = { "${it.ref.kind}:${it.ref.id}" }) { entry ->
                        Card(
                            modifier = Modifier.fillMaxWidth().clickable { onSelect(entry) },
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Column(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(entry.title, fontWeight = FontWeight.SemiBold)
                                Text(entry.subtitle, color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("关闭") }
        }
    )
}

@Composable
private fun CreateCredentialBundleDialog(
    currentProjectName: String?,
    onDismiss: () -> Unit,
    onConfirm: (CreateCredentialBundleRequest) -> Unit
) {
    var name by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var scope by rememberSaveable { mutableStateOf("global") }
    var projectHint by rememberSaveable { mutableStateOf(currentProjectName.orEmpty()) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("新建凭据包") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("名称") }, singleLine = true, shape = RoundedCornerShape(18.dp))
                OutlinedTextField(value = description, onValueChange = { description = it }, label = { Text("说明") }, minLines = 2, maxLines = 4, shape = RoundedCornerShape(18.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedButton(onClick = { scope = "global" }, shape = RoundedCornerShape(999.dp)) { Text(if (scope == "global") "全局 ✓" else "全局") }
                    OutlinedButton(onClick = { scope = "project" }, shape = RoundedCornerShape(999.dp)) { Text(if (scope == "project") "项目 ✓" else "项目") }
                }
                if (scope == "project") {
                    OutlinedTextField(value = projectHint, onValueChange = { projectHint = it }, label = { Text("项目提示名") }, singleLine = true, shape = RoundedCornerShape(18.dp))
                }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                onConfirm(CreateCredentialBundleRequest(name.trim(), description.trim(), scope, projectHint.trim()))
            }, enabled = name.trim().isNotBlank()) { Text("创建") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("取消") }
        }
    )
}

@Composable
private fun BranchNameDialog(
    title: String,
    label: String,
    initialValue: String,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit
) {
    var value by rememberSaveable { mutableStateOf(initialValue) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            OutlinedTextField(value = value, onValueChange = { value = it }, label = { Text(label) }, singleLine = true, shape = RoundedCornerShape(18.dp))
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(value.trim()) }, enabled = value.trim().isNotBlank()) { Text("确定") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("取消") }
        }
    )
}

@Composable
private fun GithubRepoDialog(
    initialName: String,
    onDismiss: () -> Unit,
    onConfirm: (String, String) -> Unit
) {
    var name by rememberSaveable { mutableStateOf(initialName) }
    var visibility by rememberSaveable { mutableStateOf("private") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("创建 GitHub 仓库") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("仓库名") }, singleLine = true, shape = RoundedCornerShape(18.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedButton(onClick = { visibility = "private" }, shape = RoundedCornerShape(999.dp)) { Text(if (visibility == "private") "Private ✓" else "Private") }
                    OutlinedButton(onClick = { visibility = "public" }, shape = RoundedCornerShape(999.dp)) { Text(if (visibility == "public") "Public ✓" else "Public") }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(name.trim(), visibility) }, enabled = name.trim().isNotBlank()) { Text("创建") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("取消") }
        }
    )
}

@Composable
private fun GithubBindDialog(
    initialRepository: String,
    initialRemote: String,
    onDismiss: () -> Unit,
    onConfirm: (String, String, String) -> Unit
) {
    var repository by rememberSaveable { mutableStateOf(initialRepository) }
    var remote by rememberSaveable { mutableStateOf(initialRemote) }
    var protocol by rememberSaveable { mutableStateOf("ssh") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("绑定现有 GitHub 仓库") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = repository,
                    onValueChange = { repository = it },
                    label = { Text("仓库") },
                    placeholder = { Text("owner/name 或 GitHub URL") },
                    singleLine = true,
                    shape = RoundedCornerShape(18.dp)
                )
                OutlinedTextField(
                    value = remote,
                    onValueChange = { remote = it },
                    label = { Text("远端名") },
                    singleLine = true,
                    shape = RoundedCornerShape(18.dp)
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedButton(onClick = { protocol = "ssh" }, shape = RoundedCornerShape(999.dp)) { Text(if (protocol == "ssh") "SSH ✓" else "SSH") }
                    OutlinedButton(onClick = { protocol = "https" }, shape = RoundedCornerShape(999.dp)) { Text(if (protocol == "https") "HTTPS ✓" else "HTTPS") }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onConfirm(repository.trim(), remote.trim(), protocol) },
                enabled = repository.trim().isNotBlank() && remote.trim().isNotBlank()
            ) { Text("绑定") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("取消") }
        }
    )
}

@Composable
private fun BranchOperationDialog(
    title: String,
    branchLabel: String,
    defaultBranch: String,
    onDismiss: () -> Unit,
    onConfirm: (String, String) -> Unit
) {
    var branch by rememberSaveable { mutableStateOf("") }
    var base by rememberSaveable { mutableStateOf(defaultBranch) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(value = branch, onValueChange = { branch = it }, label = { Text(branchLabel) }, singleLine = true, shape = RoundedCornerShape(18.dp))
                OutlinedTextField(value = base, onValueChange = { base = it }, label = { Text("基线分支") }, singleLine = true, shape = RoundedCornerShape(18.dp))
            }
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(branch.trim(), base.trim()) }, enabled = branch.trim().isNotBlank() && base.trim().isNotBlank()) { Text("创建") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("取消") }
        }
    )
}

@Composable
private fun TargetBranchDialog(
    title: String,
    sourceBranch: String,
    defaultBranch: String,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit
) {
    var target by rememberSaveable { mutableStateOf(defaultBranch) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("源分支：$sourceBranch", color = Color(0xFF6C6759))
                OutlinedTextField(value = target, onValueChange = { target = it }, label = { Text("目标分支") }, singleLine = true, shape = RoundedCornerShape(18.dp))
            }
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(target.trim()) }, enabled = target.trim().isNotBlank()) { Text("开始") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("取消") }
        }
    )
}

@Composable
private fun PullRequestDialog(
    defaultBase: String,
    defaultHead: String,
    onDismiss: () -> Unit,
    onConfirm: (String, String, String) -> Unit
) {
    var title by rememberSaveable { mutableStateOf("") }
    var body by rememberSaveable { mutableStateOf("") }
    var base by rememberSaveable { mutableStateOf(defaultBase) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("创建 Pull Request") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Head：$defaultHead", color = Color(0xFF6C6759))
                OutlinedTextField(value = base, onValueChange = { base = it }, label = { Text("Base 分支") }, singleLine = true, shape = RoundedCornerShape(18.dp))
                OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("标题") }, singleLine = true, shape = RoundedCornerShape(18.dp))
                OutlinedTextField(value = body, onValueChange = { body = it }, label = { Text("说明") }, minLines = 3, maxLines = 5, shape = RoundedCornerShape(18.dp))
            }
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(title.trim(), body.trim(), base.trim()) }, enabled = title.trim().isNotBlank() && base.trim().isNotBlank()) { Text("创建") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("取消") }
        }
    )
}

@Composable
private fun MergePullRequestDialog(
    onDismiss: () -> Unit,
    onConfirm: (String, String) -> Unit
) {
    var pr by rememberSaveable { mutableStateOf("") }
    var method by rememberSaveable { mutableStateOf("merge") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("合并 PR") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(value = pr, onValueChange = { pr = it }, label = { Text("PR 编号或 URL") }, singleLine = true, shape = RoundedCornerShape(18.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    listOf("merge" to "Merge", "squash" to "Squash", "rebase" to "Rebase").forEach { (value, label) ->
                        OutlinedButton(onClick = { method = value }, shape = RoundedCornerShape(999.dp)) { Text(if (method == value) "$label ✓" else label) }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(pr.trim(), method) }, enabled = pr.trim().isNotBlank()) { Text("合并") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("取消") }
        }
    )
}

@Composable
private fun CreateFolderDialog(
    basePath: String,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit
) {
    var name by rememberSaveable(basePath) { mutableStateOf("") }
    val trimmedName = name.trim()
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("新建文件夹") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("在 ${shortPath(basePath)} 中创建", color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("文件夹名") },
                    singleLine = true,
                    shape = RoundedCornerShape(18.dp),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = {
                        if (trimmedName.isNotBlank()) {
                            onConfirm(trimmedName)
                        }
                    })
                )
            }
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(trimmedName) }, enabled = trimmedName.isNotBlank()) {
                Text("创建")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("取消") }
        }
    )
}

@Composable
private fun NavigationCard(title: String, subtitle: String, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(22.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(title, fontWeight = FontWeight.SemiBold)
                Text(subtitle, color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
            }
            Icon(Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = null, tint = Color(0xFF6C6759))
        }
    }
}

@Composable
private fun NavigationListItem(
    title: String,
    subtitle: String,
    active: Boolean,
    icon: @Composable () -> Unit,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = if (active) Color(0xFFE6F2EC) else Color.White),
        shape = RoundedCornerShape(18.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            icon()
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(title, fontWeight = FontWeight.SemiBold)
                Text(subtitle, color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
            }
            if (active) {
                Text("当前", color = Color(0xFF1E6A56), style = MaterialTheme.typography.labelSmall)
                Spacer(Modifier.width(6.dp))
            }
            Icon(Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = null, tint = Color(0xFF6C6759))
        }
    }
}

@Composable
private fun CompactFolderRow(
    label: String,
    subtitle: String,
    selected: Boolean,
    onSelect: () -> Unit,
    onOpen: (() -> Unit)?
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = if (selected) Color(0xFFE7F1EC) else Color.White),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().clickable(onClick = onSelect).padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(label, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(subtitle, color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            if (selected) {
                Text("已选", color = Color(0xFF1E6A56), style = MaterialTheme.typography.labelSmall)
                Spacer(Modifier.width(6.dp))
            }
            if (onOpen != null) {
                IconButton(onClick = onOpen) {
                    Icon(Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = "进入文件夹")
                }
            }
        }
    }
}

@Composable
private fun CompactFileRow(file: RemoteFile, onDownload: () -> Unit, onTransferDownload: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(file.name, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("${formatBytes(file.size)} · ${file.modifiedAt}", color = Color(0xFF6C6759), style = MaterialTheme.typography.bodySmall)
            }
            IconButton(onClick = onDownload) {
                Icon(Icons.Rounded.Download, contentDescription = "下载")
            }
            IconButton(onClick = onTransferDownload) {
                Icon(Icons.Rounded.Link, contentDescription = "中转下载")
            }
        }
    }
}

@Composable
private fun OfflineHint(message: String, onConnect: () -> Unit) {
    SectionCard("需要连接") {
        Text(message, color = Color(0xFF6C6759))
        Spacer(Modifier.height(10.dp))
        Button(onClick = onConnect, shape = RoundedCornerShape(999.dp)) { Text("重新连接") }
    }
}

@Composable
private fun EmptyStateCard(title: String, message: String) {
    SectionCard(title) {
        Text(message, color = Color(0xFF6C6759))
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
    onConnectDevice: (String) -> Unit,
    onForgetDevice: (String) -> Unit,
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
            "pair" -> PairPanel(ui, onJoinCode, onPair, onReconnect, onDisconnect, onConnectDevice, onForgetDevice)
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
        Text(
            ui.activeDevice?.let { "当前设备：${it.displayName}" } ?: "请先在配对页添加设备",
            color = Color(0xFF6C6759),
            style = MaterialTheme.typography.bodySmall
        )
        Spacer(Modifier.height(10.dp))
        Button(onClick = onNewSession, enabled = ui.activeDevice != null, shape = RoundedCornerShape(999.dp)) {
            Icon(Icons.Rounded.Add, contentDescription = null)
            Spacer(Modifier.width(6.dp))
            Text("新建会话")
        }
        Spacer(Modifier.height(10.dp))
        if (ui.sessions.isEmpty()) {
            Text("当前设备还没有会话，先新建一个吧。", color = Color(0xFF6C6759))
            return@SectionCard
        }
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
    onDisconnect: () -> Unit,
    onConnectDevice: (String) -> Unit,
    onForgetDevice: (String) -> Unit
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
            OutlinedButton(onClick = onReconnect, enabled = ui.activeDevice != null, shape = RoundedCornerShape(999.dp)) { Text("连接当前") }
            OutlinedButton(onClick = onDisconnect, enabled = ui.relayConnected, shape = RoundedCornerShape(999.dp)) { Text("断开") }
        }
        Spacer(Modifier.height(12.dp))
        Text(
            if (ui.savedCredentials) "已保存 ${ui.devices.size} 台设备，可在下方切换" else "还没有已保存的设备凭证",
            color = Color(0xFF6C6759)
        )
        if (ui.devices.isNotEmpty()) {
            Spacer(Modifier.height(10.dp))
            LazyColumn(
                modifier = Modifier.fillMaxWidth().height(240.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(ui.devices, key = { it.installationId }) { device ->
                    val active = device.installationId == ui.activeDeviceId
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = if (active) Color(0xFFE6F2EC) else Color.White
                        ),
                        shape = RoundedCornerShape(20.dp)
                    ) {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(device.displayName, fontWeight = FontWeight.SemiBold)
                            Text(
                                "${device.codexModel.ifBlank { "模型未知" }} | ${device.installationId.takeLast(8)} | ${device.sessions.size} 个会话",
                                color = Color(0xFF6C6759),
                                style = MaterialTheme.typography.bodySmall
                            )
                            if (active) {
                                Text(
                                    if (ui.relayAuthenticated) "当前已连接" else "当前已选中",
                                    color = Color(0xFF1E6A56),
                                    style = MaterialTheme.typography.labelSmall
                                )
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(
                                    onClick = { onConnectDevice(device.installationId) },
                                    shape = RoundedCornerShape(999.dp)
                                ) {
                                    Text(if (active) "连接此设备" else "切换到此设备")
                                }
                                OutlinedButton(
                                    onClick = { onForgetDevice(device.installationId) },
                                    shape = RoundedCornerShape(999.dp)
                                ) {
                                    Text("移除")
                                }
                            }
                        }
                    }
                }
            }
        }
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
    LaunchedEffect(ui.activeDevice?.installationId, ui.relayAuthenticated, ui.fileRoots.size) {
        if (ui.activeDevice != null && ui.relayAuthenticated && ui.fileRoots.isEmpty()) onLoadRoots()
    }
    val currentFileOp = ui.fileOp
    val fileActionsBusy = currentFileOp != null
    SectionCard("设备文件") {
        if (ui.activeDevice == null) {
            Text("请先在配对页添加设备。", color = Color(0xFF6C6759))
            return@SectionCard
        }
        if (!ui.relayAuthenticated) {
            Text("连接当前设备后即可浏览远程文件。", color = Color(0xFF6C6759))
            return@SectionCard
        }
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
        if (ui.activeDevice == null) {
            Text("请先在配对页添加设备。", color = Color(0xFF6C6759))
            return@SectionCard
        }
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
    onAttachContext: (ContextRef) -> Unit,
    onDetachContext: (ContextRef) -> Unit,
    onForceStop: () -> Unit,
    onSend: () -> Unit,
    onCopy: (String) -> Unit
) {
    val session = ui.activeSession
    val clipboard = LocalClipboardManager.current
    val listState = rememberLazyListState()
    var showContextPicker by rememberSaveable(session?.id) { mutableStateOf(false) }
    var contextQuery by rememberSaveable(session?.id) { mutableStateOf("") }

    LaunchedEffect(session?.id, session?.messages?.size) {
        val lastIndex = (session?.messages?.size ?: 0) - 1
        if (lastIndex >= 0) {
            listState.animateScrollToItem(lastIndex)
        }
    }

    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Card(modifier = Modifier.fillMaxWidth().weight(1f), shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = Color(0xF7FFFDF8))) {
            if (ui.activeDevice == null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("先到配对页添加一台设备", color = Color(0xFF7A7466), fontSize = 13.sp)
                        Spacer(Modifier.height(8.dp))
                        Text("添加后即可为不同设备分别保存会话", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    }
                }
            } else if (session?.messages?.isEmpty() != false) {
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

        if (!session?.contextRefs.isNullOrEmpty()) {
            SectionCard("已附加上下文") {
                session?.contextRefs?.forEach { ref ->
                    ContextRefRow(
                        label = resolveContextLabel(ui, ref),
                        subtitle = ref.kind,
                        onRemove = { onDetachContext(ref) }
                    )
                }
            }
        }

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Bottom) {
            IconButton(onClick = {
                contextQuery = ""
                showContextPicker = true
            }) {
                Text("@")
            }
            OutlinedTextField(
                value = session?.draft.orEmpty(),
                onValueChange = {
                    onComposerChange(it)
                    val mentionQuery = extractMentionQuery(it)
                    if (mentionQuery != null) {
                        contextQuery = mentionQuery
                        showContextPicker = true
                    }
                },
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
                onClick = { if (session?.isSending == true) onForceStop() else onSend() },
                enabled = session?.isSending == true || !session?.draft.isNullOrBlank(),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier.height(54.dp)
            ) {
                if (session?.isSending == true) {
                    Text("停止")
                } else {
                    Text("发送")
                }
            }
        }
        if (showContextPicker) {
            ContextPickerDialog(
                entries = ui.availableContextEntries,
                query = contextQuery,
                onDismiss = { showContextPicker = false },
                onSelect = { entry ->
                    onAttachContext(entry.ref)
                    onComposerChange(replaceTrailingMention(session?.draft.orEmpty(), entry.title))
                    showContextPicker = false
                }
            )
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
        ensureActiveDeviceSelected()
        val device = currentDevice()
        if (device != null) {
            BrokerForegroundService.start(appContext)
            repository.enablePersistentConnection(device.credentials)
            resumeTrustedConnection(device.installationId)
        }
    }

    fun onAppForeground() {
        val device = currentDevice() ?: return
        if (!_state.value.relayAuthenticated) {
            resumeTrustedConnection(device.installationId)
        } else {
            refreshContextCatalog()
            syncPendingTasks()
        }
    }

    fun refreshContextCatalog() {
        val device = currentDevice() ?: return
        if (!_state.value.relayAuthenticated) return
        viewModelScope.launch(Dispatchers.IO) {
            runCatching { repository.getContextCatalog() }
                .onSuccess { payload ->
                    applyContextCatalog(device.installationId, payload)
                    persist()
                }
                .onFailure { error ->
                    _state.update { it.copy(status = "加载凭据中心失败: ${error.message}") }
                }
        }
    }

    fun setCredentialsRoot(path: String, initialize: Boolean) {
        val device = currentDevice() ?: return
        if (!_state.value.relayAuthenticated) {
            _state.update { it.copy(status = "请先连接设备后再设置凭据中心") }
            return
        }
        viewModelScope.launch(Dispatchers.IO) {
            runCatching { repository.setCredentialsRoot(path, initialize) }
                .onSuccess { payload ->
                    applyContextCatalog(device.installationId, payload)
                    _state.update { it.copy(status = if (initialize) "凭据中心已初始化" else "凭据中心目录已更新") }
                    persist()
                    payload.credentialsRoot.takeIf { root -> root.isNotBlank() }?.let(::browseDirectory)
                }
                .onFailure { error ->
                    _state.update { it.copy(status = "设置凭据中心失败: ${error.message}") }
                }
        }
    }

    fun createCredentialBundle(request: CreateCredentialBundleRequest) {
        currentDevice() ?: return
        if (!_state.value.relayAuthenticated) {
            _state.update { it.copy(status = "请先连接设备后再创建凭据包") }
            return
        }
        viewModelScope.launch(Dispatchers.IO) {
            runCatching { repository.createCredentialBundle(request) }
                .onSuccess {
                    _state.update { state -> state.copy(status = "已创建凭据包: ${it.name}") }
                    refreshContextCatalog()
                }
                .onFailure { error ->
                    _state.update { it.copy(status = "创建凭据包失败: ${error.message}") }
                }
        }
    }

    fun openCredentialCenterProject() {
        val device = currentDevice() ?: return
        if (device.credentialsRoot.isBlank()) {
            _state.update { it.copy(status = "请先在凭据中心设置目录") }
            return
        }
        val projectId = credentialCenterProject(device)?.id ?: return
        mutateDevice(device.installationId) { it.copy(activeProjectId = projectId) }
        persist()
        browseDirectory(device.credentialsRoot)
    }

    fun createProject() {
        val device = currentDevice() ?: run {
            _state.update { it.copy(status = "请先在设备页新增设备") }
            return
        }
        val currentNames = device.projects.map { it.name }.toSet()
        var index = 1
        var projectName = "新项目"
        while (projectName in currentNames) {
            index += 1
            projectName = "新项目 $index"
        }
        val rootPath = _state.value.directoryPath.ifBlank { device.codexHome }
        val project = createProject(
            name = projectName,
            rootPath = rootPath,
            defaultModel = device.codexModel,
            defaultYolo = false
        )
        mutateDevice(device.installationId) { profile ->
            profile.copy(
                projects = listOf(project) + profile.projects,
                activeProjectId = project.id
            )
        }
        persist()
    }

    fun selectProject(id: String) {
        val device = currentDevice() ?: return
        mutateDevice(device.installationId) { it.copy(activeProjectId = id) }
        persist()
        val target = currentProject()?.rootPath?.ifBlank { device.codexHome } ?: device.codexHome
        target.takeIf { it.isNotBlank() }?.let(::browseDirectory)
    }

    fun deleteProject(id: String) {
        val device = currentDevice() ?: return
        val remaining = device.projects.filterNot { it.id == id }
        mutateDevice(device.installationId) {
            it.copy(
                projects = remaining,
                activeProjectId = when {
                    remaining.isEmpty() -> null
                    device.activeProjectId == id -> remaining.first().id
                    remaining.any { project -> project.id == device.activeProjectId } -> device.activeProjectId
                    else -> remaining.first().id
                }
            )
        }
        persist()
    }

    fun renameActiveProject(value: String) {
        val project = currentProject() ?: return
        val nextName = value.ifBlank { "未命名项目" }
        mutateProject(project.id) { it.copy(name = nextName) }
        persist()
    }

    fun updateActiveProjectRoot(path: String) {
        val project = currentProject() ?: return
        mutateProject(project.id) { it.copy(rootPath = path) }
        _state.update { it.copy(status = "项目文件夹已更新") }
        persist()
        browseDirectory(path)
    }

    fun updateActiveProjectModel(value: String) {
        val project = currentProject() ?: return
        mutateProject(project.id) { it.copy(defaultModel = value.trim()) }
        persist()
    }

    fun updateActiveProjectInstructions(value: String) {
        val project = currentProject() ?: return
        mutateProject(project.id) { it.copy(defaultInstructions = value) }
        persist()
    }

    fun updateActiveProjectYolo(enabled: Boolean) {
        val project = currentProject() ?: return
        mutateProject(project.id) { it.copy(defaultYolo = enabled) }
        persist()
    }

    fun toggleProjectContext(ref: ContextRef) {
        val project = currentProject() ?: return
        val exists = project.contextRefs.any { it.kind == ref.kind && it.id == ref.id }
        replaceProjectContextRefs(
            if (exists) {
                project.contextRefs.filterNot { it.kind == ref.kind && it.id == ref.id }
            } else {
                dedupeContextRefs(project.contextRefs + ref)
            }
        )
    }

    fun replaceProjectContextRefs(refs: List<ContextRef>) {
        val project = currentProject() ?: return
        mutateProject(project.id) { it.copy(contextRefs = dedupeContextRefs(refs)) }
        persist()
    }

    fun createSession() {
        val device = currentDevice() ?: run {
            _state.update { it.copy(status = "请先在设备页新增设备") }
            return
        }
        val project = currentProject() ?: run {
            _state.update { it.copy(status = "请先创建一个项目") }
            return
        }
        val session = ChatSession(
            id = UUID.randomUUID().toString(),
            title = DEFAULT_SESSION_TITLE,
            model = project.defaultModel.ifBlank { device.codexModel },
            cwd = project.rootPath.ifBlank { device.codexHome },
            yolo = project.defaultYolo
        )
        mutateProject(project.id) {
            it.copy(
                sessions = listOf(session) + it.sessions,
                activeSessionId = session.id
            )
        }
        persist()
        session.cwd.takeIf { it.isNotBlank() }?.let(::browseDirectory)
    }

    fun createSessionFromSource(sourceSessionId: String, continueThread: Boolean) {
        val device = currentDevice() ?: run {
            _state.update { it.copy(status = "请先在设备页新增设备") }
            return
        }
        val project = currentProject() ?: run {
            _state.update { it.copy(status = "请先选择项目") }
            return
        }
        val source = project.sessions.find { it.id == sourceSessionId } ?: run {
            _state.update { it.copy(status = "未找到源会话") }
            return
        }
        if (continueThread && source.threadId.isNullOrBlank()) {
            _state.update { it.copy(status = "这个会话还没有 thread，暂时不能继续，只能分叉") }
            return
        }
        if (source.isSending || source.pendingRequestId != null) {
            forceStopSession(source.id, "已从该会话启动新会话，旧会话生成已停止")
        }
        val nextSession = cloneSessionFromSource(project, source, device, continueThread)
        mutateProject(project.id) {
            it.copy(
                sessions = listOf(nextSession) + it.sessions,
                activeSessionId = nextSession.id
            )
        }
        _state.update {
            it.copy(
                status = if (continueThread) "已继续到新会话" else "已分叉出新会话"
            )
        }
        persist()
        nextSession.cwd.takeIf { it.isNotBlank() }?.let(::browseDirectory)
    }

    fun currentSessionId(): String? = currentSession()?.id

    fun selectSession(id: String) {
        val project = currentProject() ?: return
        mutateProject(project.id) { it.copy(activeSessionId = id) }
        persist()
        val session = currentSession()
        when {
            session?.cwd?.isNotBlank() == true -> browseDirectory(session.cwd)
            _state.value.directoryRoot.isNotBlank() -> browseDirectory(_state.value.directoryRoot)
        }
    }

    fun deleteSession(id: String) {
        val project = currentProject() ?: return
        val session = project.sessions.find { it.id == id }
        val isLastWorktreeRef = session != null && project.sessions.none { other ->
            other.id != id && other.worktreePath.isNotBlank() && other.worktreePath == session.worktreePath
        }
        if (session != null && session.worktreePath.isNotBlank() && project.repoRoot.isNotBlank() && isLastWorktreeRef) {
            viewModelScope.launch(Dispatchers.IO) {
                runCatching {
                    repository.removeWorktree(project.repoRoot, session.worktreePath, session.branchName, session.autoCleanupBranch)
                }.onFailure {
                    _state.update { state -> state.copy(status = "清理 worktree 失败: ${it.message}") }
                }
            }
        }
        val remaining = project.sessions.filterNot { it.id == id }
        mutateProject(project.id) {
            it.copy(
                sessions = remaining,
                activeSessionId = when {
                    remaining.isEmpty() -> null
                    project.activeSessionId == id -> remaining.first().id
                    remaining.any { session -> session.id == project.activeSessionId } -> project.activeSessionId
                    else -> remaining.first().id
                }
            )
        }
        persist()
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
        _state.update { it.copy(status = "正在请求配对…") }
        viewModelScope.launch(Dispatchers.IO) {
            runCatching { repository.pair(code, Build.MODEL ?: "Android", clientInstallationId) }
                .onSuccess { }
                .onFailure { error ->
                    appendLog("配对失败: ${error.message}")
                    _state.update { it.copy(relayConnected = false, relayAuthenticated = false, status = "配对失败") }
                }
        }
    }

    fun connectDevice(installationId: String) {
        val device = resolveDevice(installationId) ?: return
        _state.update {
            it.copy(
                activeDeviceId = device.installationId,
                relayAuthenticated = false,
                status = "正在切换到 ${device.displayName}",
                connectionSummary = buildConnectionSummary(device, authenticated = false)
            )
        }
        clearRemoteContext()
        persist()
        resumeTrustedConnection(installationId)
    }

    fun resumeTrustedConnection(installationId: String? = null) {
        val device = resolveDevice(installationId) ?: return
        repository.enablePersistentConnection(device.credentials)
        BrokerForegroundService.start(appContext)
        viewModelScope.launch(Dispatchers.IO) {
            runCatching { repository.resume(device.credentials) }
                .onSuccess { }
                .onFailure { error ->
                    appendLog("重连失败: ${error.message}")
                    _state.update {
                        it.copy(
                            activeDeviceId = device.installationId,
                            relayConnected = false,
                            relayAuthenticated = false,
                            status = "受信设备重连失败",
                            connectionSummary = buildConnectionSummary(device, authenticated = false)
                        )
                    }
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
                connectionSummary = buildConnectionSummary(it.activeDevice, authenticated = false)
            )
        }
    }

    fun removeDevice(installationId: String) {
        val wasActive = _state.value.activeDeviceId == installationId
        val remaining = _state.value.devices.filterNot { it.installationId == installationId }
        if (wasActive) {
            repository.disablePersistentConnection()
            repository.disconnect()
            BrokerForegroundService.stop(appContext)
            clearRemoteContext()
        }
        _state.update {
            val nextActiveId = when {
                !wasActive -> it.activeDeviceId
                remaining.any { device -> device.installationId == it.activeDeviceId } -> it.activeDeviceId
                else -> remaining.firstOrNull()?.installationId
            }
            val nextDevice = remaining.find { device -> device.installationId == nextActiveId } ?: remaining.firstOrNull()
            it.copy(
                devices = remaining,
                activeDeviceId = nextActiveId,
                relayConnected = if (wasActive) false else it.relayConnected,
                relayAuthenticated = if (wasActive) false else it.relayAuthenticated,
                status = if (remaining.isEmpty()) "已移除所有设备" else "已移除设备",
                connectionSummary = if (remaining.isEmpty()) {
                    "Broker 已就绪，设备未认证"
                } else {
                    buildConnectionSummary(nextDevice, authenticated = false)
                }
            )
        }
        persist()
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
        updateActiveSessionWorkspace(path)
    }

    fun setYolo(enabled: Boolean) {
        updateActiveSessionYolo(enabled)
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

    fun updateActiveSessionModel(value: String) {
        val session = currentSession() ?: return
        mutateSession(session.id) { it.copy(model = value.trim()) }
        persist()
    }

    fun updateActiveSessionInstructions(value: String) {
        val session = currentSession() ?: return
        mutateSession(session.id) { it.copy(instructions = value) }
        persist()
    }

    fun updateActiveSessionWorkspace(path: String) {
        val session = currentSession() ?: return
        mutateSession(session.id) { it.copy(cwd = path) }
        _state.update { it.copy(status = "会话工作目录已更新") }
        persist()
        browseDirectory(path)
    }

    fun updateActiveSessionYolo(enabled: Boolean) {
        val session = currentSession() ?: return
        mutateSession(session.id) { it.copy(yolo = enabled) }
        persist()
    }

    fun attachContextToActiveSession(ref: ContextRef) {
        val session = currentSession() ?: return
        mutateSession(session.id) { it.copy(contextRefs = dedupeContextRefs(it.contextRefs + ref)) }
        persist()
    }

    fun detachContextFromActiveSession(ref: ContextRef) {
        val session = currentSession() ?: return
        mutateSession(session.id) { it.copy(contextRefs = it.contextRefs.filterNot { item -> item.kind == ref.kind && item.id == ref.id }) }
        persist()
    }

    fun replaceSessionContextRefs(refs: List<ContextRef>) {
        val session = currentSession() ?: return
        mutateSession(session.id) { it.copy(contextRefs = dedupeContextRefs(refs)) }
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

    fun createDirectory(directory: String, name: String) {
        if (directory.isBlank()) {
            _state.update { it.copy(status = "请先打开一个设备目录") }
            return
        }
        val trimmedName = name.trim()
        if (trimmedName.isBlank()) {
            _state.update { it.copy(status = "文件夹名不能为空") }
            return
        }
        viewModelScope.launch(Dispatchers.IO) {
            runCatching { repository.createDirectory(directory, trimmedName) }
                .onSuccess {
                    _state.update { state -> state.copy(status = "已创建文件夹: ${it.name}") }
                    browseDirectory(it.path)
                }
                .onFailure {
                    _state.update { state -> state.copy(status = "新建文件夹失败: ${it.message}") }
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
        sendSessionMessage(session.id, text, clearDraft = true)
    }

    fun forceStopActiveSession() {
        val session = currentSession() ?: return
        forceStopSession(session.id, "已手动停止当前生成")
    }

    fun bindProjectRepositoryFromRoot() {
        val project = currentProject() ?: return
        val target = project.rootPath.ifBlank { currentDevice()?.codexHome.orEmpty() }
        if (target.isBlank()) {
            _state.update { it.copy(status = "请先为项目设置文件夹") }
            return
        }
        viewModelScope.launch(Dispatchers.IO) {
            _state.update { it.copy(isGitLoading = true) }
            runCatching { repository.inspectGit(target) }
                .onSuccess { payload ->
                    if (!payload.isRepo) {
                        _state.update { it.copy(status = "当前项目目录还不是 Git 仓库", gitRepo = payload, gitBranches = null, gitLog = emptyList(), isGitLoading = false) }
                        return@onSuccess
                    }
                    mutateProject(project.id) {
                        it.copy(
                            repoRoot = payload.repoRoot,
                            repoRelativePath = payload.relativePath,
                            defaultBranch = payload.defaultBranch.ifBlank { it.defaultBranch }
                        )
                    }
                    _state.update { it.copy(gitRepo = payload, isGitLoading = false) }
                    persist()
                    refreshProjectGit()
                }
                .onFailure { error ->
                    _state.update { it.copy(status = "绑定仓库失败: ${error.message}", isGitLoading = false) }
                }
        }
    }

    fun initializeProjectRepository(initialBranch: String) {
        val project = currentProject() ?: return
        val target = project.rootPath.ifBlank { currentDevice()?.codexHome.orEmpty() }
        if (target.isBlank()) {
            _state.update { it.copy(status = "请先为项目设置文件夹") }
            return
        }
        viewModelScope.launch(Dispatchers.IO) {
            _state.update { it.copy(isGitLoading = true) }
            runCatching { repository.initGitRepository(target, initialBranch.ifBlank { "main" }) }
                .onSuccess { payload ->
                    mutateProject(project.id) {
                        it.copy(
                            repoRoot = payload.repoRoot,
                            repoRelativePath = payload.relativePath,
                            defaultBranch = payload.defaultBranch.ifBlank { initialBranch.ifBlank { "main" } }
                        )
                    }
                    _state.update { it.copy(gitRepo = payload, isGitLoading = false, status = "Git 仓库已初始化") }
                    persist()
                    refreshProjectGit()
                }
                .onFailure { error ->
                    _state.update { it.copy(status = "初始化 Git 仓库失败: ${error.message}", isGitLoading = false) }
                }
        }
    }

    fun createProjectGithubRepository(name: String, visibility: String) {
        val project = currentProject() ?: return
        val repoRoot = project.repoRoot.ifBlank { _state.value.gitRepo?.repoRoot ?: "" }.ifBlank { return }
        viewModelScope.launch(Dispatchers.IO) {
            _state.update { state ->
                state.copy(
                    status = "正在创建 GitHub 仓库…",
                    isGitActionRunning = true,
                    relayLog = appendStatusLog(state.relayLog, "开始创建 GitHub 仓库: $name ($visibility)")
                )
            }
            runCatching { repository.createGithubRepository(repoRoot, name, visibility) }
                .onSuccess { payload ->
                    _state.update { state ->
                        state.copy(
                            status = "GitHub 仓库已创建",
                            isGitActionRunning = false,
                            relayLog = appendStatusLog(state.relayLog, payload.output.ifBlank { "GitHub 仓库创建成功" })
                        )
                    }
                    refreshProjectGit()
                }
                .onFailure { error ->
                    _state.update { state ->
                        state.copy(
                            status = "创建 GitHub 仓库失败: ${error.message}",
                            isGitActionRunning = false,
                            relayLog = appendStatusLog(state.relayLog, "创建 GitHub 仓库失败: ${error.message}")
                        )
                    }
                }
        }
    }

    fun bindProjectGithubRepository(repositoryName: String, remote: String, protocol: String) {
        val project = currentProject() ?: return
        val repoRoot = project.repoRoot.ifBlank { _state.value.gitRepo?.repoRoot ?: "" }.ifBlank { return }
        viewModelScope.launch(Dispatchers.IO) {
            _state.update { state ->
                state.copy(
                    status = "正在绑定 GitHub 仓库…",
                    isGitActionRunning = true,
                    relayLog = appendStatusLog(state.relayLog, "开始绑定 GitHub 仓库: $repositoryName -> ${remote.ifBlank { "origin" }} ($protocol)")
                )
            }
            runCatching { repository.bindGithubRepository(repoRoot, repositoryName, remote.ifBlank { "origin" }, protocol) }
                .onSuccess { payload ->
                    _state.update { state ->
                        state.copy(
                            status = "GitHub 仓库已绑定",
                            isGitActionRunning = false,
                            relayLog = appendStatusLog(state.relayLog, payload.output.ifBlank { "GitHub 远端绑定成功" })
                        )
                    }
                    refreshProjectGit()
                }
                .onFailure { error ->
                    _state.update { state ->
                        state.copy(
                            status = "绑定 GitHub 仓库失败: ${error.message}",
                            isGitActionRunning = false,
                            relayLog = appendStatusLog(state.relayLog, "绑定 GitHub 仓库失败: ${error.message}")
                        )
                    }
                }
        }
    }

    fun refreshProjectGit() {
        val project = currentProject() ?: return
        val target = project.repoRoot.ifBlank { project.rootPath }
        if (!_state.value.relayAuthenticated) return
        viewModelScope.launch(Dispatchers.IO) {
            _state.update { it.copy(isGitLoading = true) }
            val githubStatus = runCatching { repository.getGithubStatus() }.getOrNull()
            if (target.isBlank()) {
                _state.update { it.copy(isGitLoading = false, githubStatus = githubStatus) }
                return@launch
            }
            runCatching { repository.inspectGit(target) }
                .onSuccess { repo ->
                    if (!repo.isRepo) {
                        _state.update {
                            it.copy(
                                gitRepo = repo,
                                gitBranches = null,
                                gitLog = emptyList(),
                                githubStatus = githubStatus,
                                isGitLoading = false
                            )
                        }
                        return@onSuccess
                    }
                    val branches = runCatching { repository.listGitBranches(repo.repoRoot) }.getOrNull()
                    val log = runCatching { repository.getGitLog(repo.repoRoot, 30) }.getOrNull()
                    mutateProject(project.id) {
                        it.copy(
                            repoRoot = repo.repoRoot,
                            repoRelativePath = repo.relativePath,
                            defaultBranch = repo.defaultBranch.ifBlank { it.defaultBranch }
                        )
                    }
                    _state.update {
                        it.copy(
                            gitRepo = repo,
                            gitBranches = branches,
                            gitLog = log?.commits ?: emptyList(),
                            githubStatus = githubStatus,
                            isGitLoading = false
                        )
                    }
                    persist()
                }
                .onFailure { error ->
                    _state.update {
                        it.copy(
                            status = "刷新 Git 状态失败: ${error.message}",
                            githubStatus = githubStatus,
                            isGitLoading = false
                        )
                    }
                }
        }
    }

    fun createWorktreeSession(branch: String, baseBranch: String) {
        val device = currentDevice() ?: return
        val project = currentProject() ?: return
        val repoRoot = project.repoRoot.ifBlank { _state.value.gitRepo?.repoRoot ?: "" }
        if (repoRoot.isBlank()) {
            _state.update { it.copy(status = "请先绑定 Git 仓库") }
            return
        }
        val sessionId = UUID.randomUUID().toString()
        viewModelScope.launch(Dispatchers.IO) {
            runCatching { repository.createGitWorktree(repoRoot, branch, baseBranch.ifBlank { project.defaultBranch.ifBlank { "main" } }, sessionId, project.repoRelativePath) }
                .onSuccess { payload ->
                    val session = ChatSession(
                        id = sessionId,
                        title = "分支 ${payload.branch}",
                        model = project.defaultModel.ifBlank { device.codexModel },
                        cwd = payload.execPath,
                        yolo = project.defaultYolo,
                        kind = SESSION_KIND_WORKTREE,
                        branchName = payload.branch,
                        baseBranch = payload.baseBranch,
                        worktreePath = payload.worktreePath,
                        autoCleanupBranch = true
                    )
                    mutateProject(project.id) {
                        it.copy(
                            sessions = listOf(session) + it.sessions,
                            activeSessionId = session.id
                        )
                    }
                    _state.update { it.copy(status = "已创建 worktree 会话: ${payload.branch}") }
                    persist()
                    browseDirectory(session.cwd)
                    refreshProjectGit()
                }
                .onFailure { error ->
                    _state.update { it.copy(status = "创建 worktree 会话失败: ${error.message}") }
                }
        }
    }

    fun createMergeOperationSession(sourceBranch: String, targetBranch: String) {
        createGitOperationSession("merge", sourceBranch, targetBranch)
    }

    fun createRebaseOperationSession(sourceBranch: String, targetBranch: String) {
        createGitOperationSession("rebase", sourceBranch, targetBranch)
    }

    fun pushActiveSessionBranch(force: Boolean) {
        val session = currentSession() ?: return
        val branch = session.branchName ?: run {
            _state.update { it.copy(status = "当前会话没有绑定分支") }
            return
        }
        viewModelScope.launch(Dispatchers.IO) {
            runCatching { repository.pushBranch(session.cwd.ifBlank { currentProject()?.repoRoot.orEmpty() }, branch, force) }
                .onSuccess { payload ->
                    _state.update { state ->
                        state.copy(
                            status = if (force) "已强推分支" else "已推送分支",
                            relayLog = appendStatusLog(state.relayLog, payload.output)
                        )
                    }
                }
                .onFailure { error ->
                    _state.update { it.copy(status = "推送分支失败: ${error.message}") }
                }
        }
    }

    fun createPullRequestForActiveSession(title: String, body: String, baseBranch: String) {
        val session = currentSession() ?: return
        val branch = session.branchName ?: run {
            _state.update { it.copy(status = "当前会话没有绑定分支") }
            return
        }
        viewModelScope.launch(Dispatchers.IO) {
            runCatching { repository.createPullRequest(session.cwd.ifBlank { currentProject()?.repoRoot.orEmpty() }, baseBranch, branch, title, body) }
                .onSuccess { payload ->
                    _state.update { it.copy(status = "PR 已创建: ${payload.url.ifBlank { "成功" }}") }
                }
                .onFailure { error ->
                    _state.update { it.copy(status = "创建 PR 失败: ${error.message}") }
                }
        }
    }

    fun mergePullRequest(pullRequest: String, method: String) {
        val cwd = currentSession()?.cwd?.ifBlank { currentProject()?.repoRoot.orEmpty() } ?: currentProject()?.repoRoot.orEmpty()
        if (cwd.isBlank()) {
            _state.update { it.copy(status = "请先绑定仓库") }
            return
        }
        viewModelScope.launch(Dispatchers.IO) {
            runCatching { repository.mergePullRequest(cwd, pullRequest, method) }
                .onSuccess {
                    _state.update { it.copy(status = "PR 已合并") }
                    refreshProjectGit()
                }
                .onFailure { error ->
                    _state.update { it.copy(status = "合并 PR 失败: ${error.message}") }
                }
        }
    }

    fun finalizeActiveMergeSession() {
        val project = currentProject() ?: return
        val session = currentSession() ?: return
        if (session.kind != SESSION_KIND_MERGE || session.branchName.isNullOrBlank() || session.targetBranch.isNullOrBlank()) {
            _state.update { it.copy(status = "当前会话不是可完成的合并会话") }
            return
        }
        if (project.repoRoot.isBlank()) {
            _state.update { it.copy(status = "请先绑定仓库") }
            return
        }
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                repository.finalizeMergeOperation(project.repoRoot, session.targetBranch, session.branchName)
            }
                .onSuccess {
                    runCatching {
                        repository.removeWorktree(project.repoRoot, session.worktreePath, session.branchName, true)
                    }
                    val relatedSessionIds = project.sessions
                        .filter { candidate ->
                            candidate.id == session.id ||
                                (session.worktreePath.isNotBlank() && candidate.worktreePath == session.worktreePath)
                        }
                        .map { it.id }
                        .toSet()
                    val remaining = project.sessions.filterNot { it.id in relatedSessionIds }
                    mutateProject(project.id) {
                        it.copy(
                            sessions = remaining,
                            activeSessionId = remaining.firstOrNull()?.id
                        )
                    }
                    persist()
                    _state.update { state -> state.copy(status = "已完成合入并清理临时会话") }
                    refreshProjectGit()
                }
                .onFailure { error ->
                    _state.update { it.copy(status = "完成合入失败: ${error.message}") }
                }
        }
    }

    private fun createGitOperationSession(operation: String, sourceBranch: String, targetBranch: String) {
        val device = currentDevice() ?: return
        val project = currentProject() ?: return
        val repoRoot = project.repoRoot.ifBlank { _state.value.gitRepo?.repoRoot ?: "" }
        if (repoRoot.isBlank()) {
            _state.update { it.copy(status = "请先绑定 Git 仓库") }
            return
        }
        val sessionId = UUID.randomUUID().toString()
        viewModelScope.launch(Dispatchers.IO) {
            val payload = runCatching {
                if (operation == "merge") {
                    repository.prepareMergeOperation(repoRoot, sourceBranch, targetBranch, sessionId, project.repoRelativePath)
                } else {
                    repository.prepareRebaseOperation(repoRoot, sourceBranch, targetBranch, sessionId, project.repoRelativePath)
                }
            }.getOrElse { error ->
                _state.update { it.copy(status = "创建 ${if (operation == "merge") "合并" else "rebase"} 会话失败: ${error.message}") }
                return@launch
            }
            val session = ChatSession(
                id = sessionId,
                title = if (operation == "merge") "合并 ${payload.sourceBranch} → ${payload.targetBranch}" else "Rebase ${payload.sourceBranch} → ${payload.targetBranch}",
                model = project.defaultModel.ifBlank { device.codexModel },
                cwd = payload.execPath,
                yolo = project.defaultYolo,
                kind = if (operation == "merge") SESSION_KIND_MERGE else SESSION_KIND_REBASE,
                branchName = payload.branch,
                baseBranch = payload.baseBranch,
                targetBranch = payload.targetBranch,
                sourceBranch = payload.sourceBranch,
                worktreePath = payload.worktreePath,
                autoCleanupBranch = true
            )
            mutateProject(project.id) {
                it.copy(
                    sessions = listOf(session) + it.sessions,
                    activeSessionId = session.id
                )
            }
            _state.update { it.copy(status = "已创建${if (operation == "merge") "合并" else "rebase"}会话") }
            persist()
            browseDirectory(session.cwd)
            refreshProjectGit()
            sendSessionMessage(session.id, payload.prompt, clearDraft = false)
        }
    }

    private fun sendSessionMessage(sessionId: String, text: String, clearDraft: Boolean) {
        currentDevice() ?: return
        val project = findProjectBySessionId(sessionId) ?: return
        val session = project.sessions.find { it.id == sessionId } ?: return
        if (!_state.value.relayAuthenticated) return
        val requestId = "reqmsg_${UUID.randomUUID()}"
        val userMsg = ChatMessage(UUID.randomUUID().toString(), "user", text)
        val assistantMsg = ChatMessage(UUID.randomUUID().toString(), "assistant", "")
        mutateSession(session.id) {
            it.copy(
                title = if (it.messages.isEmpty() && it.title == DEFAULT_SESSION_TITLE) deriveSessionTitle(text) else it.title,
                draft = if (clearDraft) "" else it.draft,
                isSending = true,
                pendingRequestId = requestId,
                messages = it.messages + listOf(userMsg, assistantMsg)
            )
        }
        _state.update { it.copy(status = "正在通过 Broker 传输") }
        persist()
        val instructions = listOf(project.defaultInstructions.trim(), session.instructions.trim())
            .filter { it.isNotBlank() }
            .joinToString("\n\n")
        val contextRefs = dedupeContextRefs(project.contextRefs + session.contextRefs)
        val gitContext = if (project.repoRoot.isNotBlank() || !session.branchName.isNullOrBlank()) {
            GitChatContext(
                repoRoot = project.repoRoot,
                projectRoot = project.rootPath,
                sessionKind = session.kind,
                branchName = session.branchName,
                baseBranch = session.baseBranch,
                targetBranch = session.targetBranch,
                sourceBranch = session.sourceBranch,
                worktreePath = session.worktreePath
            )
        } else {
            null
        }
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                repository.streamChat(
                    StreamRequest(
                        message = text,
                        threadId = session.threadId,
                        model = session.model,
                        cwd = session.cwd,
                        yolo = session.yolo,
                        instructions = instructions,
                        contextRefs = contextRefs,
                        gitContext = gitContext,
                        sessionId = session.id,
                        requestId = requestId
                    ),
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

    private fun forceStopSession(sessionId: String, message: String? = null) {
        val project = findProjectBySessionId(sessionId) ?: return
        val session = project.sessions.find { it.id == sessionId } ?: return
        val pendingRequestId = session.pendingRequestId
        if (pendingRequestId != null) {
            repository.cancelPendingRequest(pendingRequestId)
        }
        mutateSession(session.id) { current ->
            val lastAssistant = current.messages.lastOrNull { it.role == "assistant" }
            val updatedMessages = if (message != null && lastAssistant != null && lastAssistant.content.isBlank()) {
                current.messages.map { entry ->
                    if (entry.id == lastAssistant.id) entry.copy(content = message) else entry
                }
            } else {
                current.messages
            }
            current.copy(
                isSending = false,
                pendingRequestId = null,
                messages = updatedMessages
            )
        }
        _state.update { it.copy(status = message ?: "当前生成已停止") }
        persist()
    }

    private fun forceStopAllPendingSessions(message: String? = null) {
        val device = currentDevice() ?: return
        val pendingIds = device.projects
            .flatMap { it.sessions }
            .filter { it.isSending || it.pendingRequestId != null }
            .map { it.id }
        if (pendingIds.isEmpty()) return
        pendingIds.forEach { sessionId -> forceStopSession(sessionId, message) }
    }

    private suspend fun afterAuth(credentials: BrokerCredentials, paired: Boolean) {
        val config = runCatching { repository.getConfig() }
            .getOrElse { BrokerConfig(serverName = credentials.serverName, codexModel = "", codexHome = "", credentialsRoot = "", worktreeRoot = "") }
        val roots = runCatching { repository.getFileRoots() }.getOrNull()
        val catalog = runCatching { repository.getContextCatalog() }.getOrNull()
        val mergedCredentials = credentials.copy(
            serverName = config.serverName?.takeIf { it.isNotBlank() } ?: credentials.serverName
        )
        val updatedDevice = buildUpdatedDevice(mergedCredentials, config, catalog)
        BrokerForegroundService.start(appContext)
        _state.update {
            it.copy(
                devices = listOf(updatedDevice) + it.devices.filterNot { device -> device.installationId == updatedDevice.installationId },
                activeDeviceId = updatedDevice.installationId,
                fileRoots = roots?.roots ?: it.fileRoots,
                directoryRoot = if (config.codexHome.isNotBlank()) config.codexHome else it.directoryRoot,
                relayConnected = true,
                relayAuthenticated = true,
                joinCode = "",
                status = if (paired) "设备已配对" else "受信设备重连完成",
                connectionSummary = buildConnectionSummary(updatedDevice, authenticated = true)
            )
        }
        appendLog(if (paired) "已完成设备配对" else "受信设备重连成功")
        persist()
        syncPendingTasks()
        val targetDirectory = currentSession()?.cwd
            ?.ifBlank { currentProject()?.rootPath?.ifBlank { updatedDevice.codexHome } ?: updatedDevice.codexHome }
            ?: currentProject()?.rootPath?.ifBlank { updatedDevice.codexHome }
            ?: updatedDevice.codexHome
        if (targetDirectory.isNotBlank()) {
            browseDirectory(targetDirectory)
        }
    }

    private fun syncPendingTasks() {
        val device = currentDevice() ?: return
        viewModelScope.launch(Dispatchers.IO) {
            runCatching { repository.syncChatTasks() }
                .onSuccess { payload ->
                    payload.tasks.forEach { task ->
                        val session = device.projects
                            .flatMap { it.sessions }
                            .find { it.pendingRequestId == task.requestId || it.id == task.sessionId }
                            ?: return@forEach
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
        return _state.value.activeSession
    }

    private fun currentProject(): ProjectConfig? {
        return _state.value.activeProject
    }

    private fun findProjectBySessionId(sessionId: String): ProjectConfig? {
        return currentDevice()?.projects?.find { project -> project.sessions.any { it.id == sessionId } }
    }

    private fun mutateProject(id: String, transform: (ProjectConfig) -> ProjectConfig) {
        val device = currentDevice() ?: return
        mutateDevice(device.installationId) { profile ->
            profile.copy(
                projects = profile.projects.map { project ->
                    if (project.id == id) ensureProjectSessions(transform(project), profile) else project
                }
            )
        }
    }

    private fun mutateSession(id: String, transform: (ChatSession) -> ChatSession) {
        val device = currentDevice() ?: return
        mutateDevice(device.installationId) { profile ->
            profile.copy(
                projects = profile.projects.map { project ->
                    if (project.sessions.none { it.id == id }) {
                        project
                    } else {
                        project.copy(
                            sessions = project.sessions.map { session -> if (session.id == id) transform(session) else session }
                        )
                    }
                }
            )
        }
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
        val active = currentDevice()
        _state.update {
            it.copy(
                relayConnected = true,
                status = "Broker 已连接",
                connectionSummary = if (active != null) "Broker 已连接 | ${active.displayName}" else "Broker 已连接，等待认证"
            )
        }
        appendLog("broker socket 已连接")
    }

    override fun onSocketClosed(message: String) {
        _state.update {
            it.copy(
                relayConnected = false,
                relayAuthenticated = false,
                status = "Broker 已断开",
                connectionSummary = buildConnectionSummary(it.activeDevice, authenticated = false)
            )
        }
        appendLog(message)
    }

    override fun onServerUnavailable(message: String) {
        forceStopAllPendingSessions(message)
        _state.update {
            it.copy(
                relayAuthenticated = false,
                status = message,
                connectionSummary = buildConnectionSummary(it.activeDevice, authenticated = false)
            )
        }
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

    private fun ensureActiveDeviceSelected() {
        val state = _state.value
        if (state.devices.isEmpty()) return
        if (state.activeDeviceId != null && state.devices.any { it.installationId == state.activeDeviceId }) return
        _state.update { it.copy(activeDeviceId = it.devices.firstOrNull()?.installationId) }
        persist()
    }

    private fun currentDevice(): RelayDeviceProfile? {
        return _state.value.activeDevice
    }

    private fun resolveDevice(installationId: String?): RelayDeviceProfile? {
        val state = _state.value
        val resolved = installationId?.let { id -> state.devices.find { it.installationId == id } } ?: state.activeDevice
        if (resolved != null && state.activeDeviceId != resolved.installationId) {
            _state.update { it.copy(activeDeviceId = resolved.installationId) }
            persist()
        }
        return resolved
    }

    private fun replaceDevice(profile: RelayDeviceProfile) {
        val normalized = ensureDeviceProjects(profile)
        _state.update { ui ->
            ui.copy(
                devices = ui.devices.map { if (it.installationId == normalized.installationId) normalized else it }
            )
        }
    }

    private fun mutateDevice(installationId: String, transform: (RelayDeviceProfile) -> RelayDeviceProfile) {
        _state.update { ui ->
            ui.copy(
                devices = ui.devices.map { device ->
                    if (device.installationId == installationId) ensureDeviceProjects(transform(device)) else device
                }
            )
        }
    }

    private fun buildUpdatedDevice(credentials: BrokerCredentials, config: BrokerConfig, catalog: ContextCatalogPayload? = null): RelayDeviceProfile {
        val existing = _state.value.devices.find { it.installationId == credentials.installationId }
        return ensureDeviceProjects(
            RelayDeviceProfile(
                installationId = credentials.installationId,
                credentials = credentials,
                customName = existing?.customName,
                codexModel = config.codexModel.ifBlank { existing?.codexModel ?: "" },
                codexHome = config.codexHome.ifBlank { existing?.codexHome ?: "" },
                credentialsRoot = catalog?.credentialsRoot?.ifBlank { null } ?: config.credentialsRoot.ifBlank { existing?.credentialsRoot ?: "" },
                worktreeRoot = catalog?.worktreeRoot?.ifBlank { null } ?: config.worktreeRoot.ifBlank { existing?.worktreeRoot ?: "" },
                credentialBundles = catalog?.bundles ?: existing?.credentialBundles ?: emptyList(),
                availableSkills = catalog?.skills ?: existing?.availableSkills ?: emptyList(),
                projects = existing?.projects ?: emptyList(),
                activeProjectId = existing?.activeProjectId,
                lastConnectedAt = System.currentTimeMillis()
            )
        )
    }

    private fun applyContextCatalog(installationId: String, payload: ContextCatalogPayload) {
        mutateDevice(installationId) { profile ->
            profile.copy(
                credentialsRoot = payload.credentialsRoot,
                worktreeRoot = payload.worktreeRoot,
                credentialBundles = payload.bundles,
                availableSkills = payload.skills
            )
        }
    }

    private fun clearRemoteContext() {
        _state.update {
            it.copy(
                fileRoots = emptyList(),
                directories = emptyList(),
                files = emptyList(),
                directoryPath = "",
                directoryRoot = "",
                directoryParent = null,
                isDirectoryLoading = false,
                fileOp = null,
                gitRepo = null,
                gitBranches = null,
                gitLog = emptyList(),
                isGitLoading = false
            )
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
            clientInstallationId = state.clientInstallationId,
            devices = state.devices,
            activeDeviceId = state.activeDeviceId,
            taskAlertsEnabled = state.taskAlertsEnabled
        )
        prefs.edit().putString("ui_state", json.encodeToString(payload)).apply()
    }
}

private class BrokerRepository private constructor() {
    interface Listener {
        fun onSocketOpen()
        fun onSocketClosed(message: String)
        fun onServerUnavailable(message: String)
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

    fun enablePersistentConnection(credentials: BrokerCredentials) {
        persistentCredentials = credentials
        shouldStayConnected = true
    }

    fun disablePersistentConnection() {
        shouldStayConnected = false
        reconnectJob?.cancel()
        reconnectJob = null
    }

    fun cancelPendingRequest(requestId: String) {
        when (val pending = rpcWaiters.remove(requestId)) {
            is PendingRpc.Once -> pending.deferred.completeExceptionally(IllegalStateException("request cancelled"))
            is PendingRpc.Stream -> pending.completion.complete(Unit)
            null -> Unit
        }
    }

    suspend fun pair(code: String, deviceName: String, clientInstallationId: String): BrokerCredentials {
        ensureSocket()
        val reqId = nextReqId()
        val deferred = CompletableDeferred<BrokerCredentials>()
        authWaiters[reqId] = PendingAuth(deferred, null, null)
        send(buildJsonObject {
            put("type", "pair_client")
            put("req_id", reqId)
            put("code", code)
            put("device_name", deviceName)
            put("client_installation_id", clientInstallationId)
        })
        return withTimeout(10_000) { deferred.await() }.also {
            enablePersistentConnection(it)
        }
    }

    suspend fun resume(credentials: BrokerCredentials): BrokerCredentials {
        ensureSocket()
        val reqId = nextReqId()
        val deferred = CompletableDeferred<BrokerCredentials>()
        authWaiters[reqId] = PendingAuth(deferred, credentials.deviceToken, credentials.serverName)
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

    suspend fun getContextCatalog(): ContextCatalogPayload {
        return json.decodeFromJsonElement(rpcOnce("context.catalog", buildJsonObject {}))
    }

    suspend fun setCredentialsRoot(path: String, initialize: Boolean): ContextCatalogPayload {
        return json.decodeFromJsonElement(
            rpcOnce(
                "context.root.set",
                buildJsonObject {
                    put("path", path)
                    put("initialize", initialize)
                }
            )
        )
    }

    suspend fun createCredentialBundle(request: CreateCredentialBundleRequest): CredentialBundleSummary {
        return json.decodeFromJsonElement(
            rpcOnce(
                "context.bundle.create",
                buildJsonObject {
                    put("name", request.name)
                    put("description", request.description)
                    put("scope", request.scope)
                    put("project_hint", request.projectHint)
                }
            )
        )
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

    suspend fun createDirectory(directory: String, name: String): DeviceDirectoryCreateResult {
        return json.decodeFromJsonElement(
            rpcOnce(
                "fs.mkdir",
                buildJsonObject {
                    put("directory", directory)
                    put("name", name)
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

    suspend fun inspectGit(path: String): GitRepoInspectPayload {
        return json.decodeFromJsonElement(
            rpcOnce("git.inspect", buildJsonObject { put("path", path) })
        )
    }

    suspend fun listGitBranches(repoRoot: String): GitBranchesPayload {
        return json.decodeFromJsonElement(
            rpcOnce("git.branches", buildJsonObject { put("repo_root", repoRoot) })
        )
    }

    suspend fun getGitLog(repoRoot: String, limit: Int = 30): GitLogPayload {
        return json.decodeFromJsonElement(
            rpcOnce(
                "git.log",
                buildJsonObject {
                    put("repo_root", repoRoot)
                    put("limit", limit)
                }
            )
        )
    }

    suspend fun initGitRepository(path: String, initialBranch: String): GitRepoInspectPayload {
        return json.decodeFromJsonElement(
            rpcOnce(
                "git.repo.init",
                buildJsonObject {
                    put("path", path)
                    put("initial_branch", initialBranch)
                }
            )
        )
    }

    suspend fun getGithubStatus(): GithubStatusPayload {
        return json.decodeFromJsonElement(rpcOnce("git.github.status", buildJsonObject {}))
    }

    suspend fun createGithubRepository(repoRoot: String, name: String, visibility: String): GitMergeResultPayload {
        return json.decodeFromJsonElement(
            rpcOnce(
                "git.github.create",
                buildJsonObject {
                    put("repo_root", repoRoot)
                    put("name", name)
                    put("visibility", visibility)
                }
            )
        )
    }

    suspend fun bindGithubRepository(repoRoot: String, repository: String, remote: String, protocol: String): GitMergeResultPayload {
        return json.decodeFromJsonElement(
            rpcOnce(
                "git.github.bind",
                buildJsonObject {
                    put("repo_root", repoRoot)
                    put("repository", repository)
                    put("remote", remote)
                    put("protocol", protocol)
                }
            )
        )
    }

    suspend fun createGitWorktree(repoRoot: String, branch: String, baseBranch: String, sessionId: String, relativePath: String): GitWorktreeCreatePayload {
        return json.decodeFromJsonElement(
            rpcOnce(
                "git.worktree.create",
                buildJsonObject {
                    put("repo_root", repoRoot)
                    put("branch", branch)
                    put("base_branch", baseBranch)
                    put("session_id", sessionId)
                    put("relative_path", relativePath)
                }
            )
        )
    }

    suspend fun removeWorktree(repoRoot: String, worktreePath: String, branch: String?, deleteBranch: Boolean): GitMergeResultPayload {
        return json.decodeFromJsonElement(
            rpcOnce(
                "git.worktree.remove",
                buildJsonObject {
                    put("repo_root", repoRoot)
                    put("worktree_path", worktreePath)
                    branch?.let { put("branch", it) }
                    put("delete_branch", deleteBranch)
                }
            )
        )
    }

    suspend fun pushBranch(cwd: String, branch: String, force: Boolean): GitMergeResultPayload {
        return json.decodeFromJsonElement(
            rpcOnce(
                "git.push",
                buildJsonObject {
                    put("cwd", cwd)
                    put("branch", branch)
                    put("force", force)
                }
            )
        )
    }

    suspend fun createPullRequest(cwd: String, base: String, head: String, title: String, body: String): GitPullRequestPayload {
        return json.decodeFromJsonElement(
            rpcOnce(
                "git.pr.create",
                buildJsonObject {
                    put("cwd", cwd)
                    put("base", base)
                    put("head", head)
                    put("title", title)
                    put("body", body)
                }
            )
        )
    }

    suspend fun mergePullRequest(cwd: String, pullRequest: String, method: String): GitMergeResultPayload {
        return json.decodeFromJsonElement(
            rpcOnce(
                "git.pr.merge",
                buildJsonObject {
                    put("cwd", cwd)
                    put("pull_request", pullRequest)
                    put("method", method)
                }
            )
        )
    }

    suspend fun prepareMergeOperation(repoRoot: String, sourceBranch: String, targetBranch: String, sessionId: String, relativePath: String): GitOperationPayload {
        return json.decodeFromJsonElement(
            rpcOnce(
                "git.operation.prepare_merge",
                buildJsonObject {
                    put("repo_root", repoRoot)
                    put("source_branch", sourceBranch)
                    put("target_branch", targetBranch)
                    put("session_id", sessionId)
                    put("relative_path", relativePath)
                }
            )
        )
    }

    suspend fun prepareRebaseOperation(repoRoot: String, sourceBranch: String, targetBranch: String, sessionId: String, relativePath: String): GitOperationPayload {
        return json.decodeFromJsonElement(
            rpcOnce(
                "git.operation.prepare_rebase",
                buildJsonObject {
                    put("repo_root", repoRoot)
                    put("source_branch", sourceBranch)
                    put("target_branch", targetBranch)
                    put("session_id", sessionId)
                    put("relative_path", relativePath)
                }
            )
        )
    }

    suspend fun finalizeMergeOperation(repoRoot: String, targetBranch: String, operationBranch: String): GitRepoInspectPayload {
        return json.decodeFromJsonElement(
            rpcOnce(
                "git.operation.finalize_merge",
                buildJsonObject {
                    put("repo_root", repoRoot)
                    put("target_branch", targetBranch)
                    put("operation_branch", operationBranch)
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
                val serverName = obj["server_name"]?.jsonPrimitive?.contentOrNull ?: pending.fallbackServerName
                val credentials = BrokerCredentials(installationId, deviceId, token, serverName)
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
            "server_unavailable" -> {
                failAll("server unavailable")
                listeners.forEach { it.onServerUnavailable("目标设备已离线，当前生成已中止") }
            }
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

    private data class PendingAuth(
        val deferred: CompletableDeferred<BrokerCredentials>,
        val fallbackToken: String?,
        val fallbackServerName: String?
    )

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

    override fun onServerUnavailable(message: String) {
        updateNotification("目标设备离线")
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
    val devices: List<RelayDeviceProfile> = emptyList(),
    @SerialName("active_device_id") val activeDeviceId: String? = null,
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
    val taskAlertsEnabled: Boolean = true,
    val fileOp: FileOperationState? = null,
    val gitRepo: GitRepoInspectPayload? = null,
    val gitBranches: GitBranchesPayload? = null,
    val gitLog: List<GitCommit> = emptyList(),
    val isGitLoading: Boolean = false,
    val githubStatus: GithubStatusPayload? = null,
    val isGitActionRunning: Boolean = false
) {
    val activeDevice: RelayDeviceProfile?
        get() = devices.find { it.installationId == activeDeviceId } ?: devices.firstOrNull()

    val projects: List<ProjectConfig>
        get() = activeDevice?.projects ?: emptyList()

    val activeProject: ProjectConfig?
        get() = activeDevice?.activeProject

    val visibleProjects: List<ProjectConfig>
        get() = activeDevice?.projects?.filter { it.kind == PROJECT_KIND_STANDARD } ?: emptyList()

    val sessions: List<ChatSession>
        get() = activeProject?.sessions ?: emptyList()

    val activeSessionId: String?
        get() = activeProject?.activeSessionId

    val activeSession: ChatSession?
        get() = activeProject?.activeSession

    val savedCredentials: Boolean
        get() = devices.isNotEmpty()

    val availableContextEntries: List<ContextCatalogEntry>
        get() {
            val device = activeDevice ?: return emptyList()
            val projectRefs = activeProject?.contextRefs?.map { "${it.kind}:${it.id}" }?.toSet().orEmpty()
            val credentialEntries = device.credentialBundles.map {
                ContextCatalogEntry(
                    ref = ContextRef("credential", it.id),
                    title = it.name,
                    subtitle = listOfNotNull(it.description.takeIf { desc -> desc.isNotBlank() }, shortPath(it.folderPath)).joinToString(" · "),
                    boundToProject = "credential:${it.id}" in projectRefs
                )
            }
            val skillEntries = device.availableSkills.map {
                ContextCatalogEntry(
                    ref = ContextRef("skill", it.id),
                    title = it.name,
                    subtitle = listOfNotNull(it.description.takeIf { desc -> desc.isNotBlank() }, shortPath(it.folderPath)).joinToString(" · "),
                    boundToProject = "skill:${it.id}" in projectRefs
                )
            }
            return (credentialEntries + skillEntries).sortedWith(
                compareByDescending<ContextCatalogEntry> { it.boundToProject }.thenBy { it.title.lowercase() }
            )
        }
}

@Serializable
data class BrokerCredentials(
    @SerialName("installation_id") val installationId: String,
    @SerialName("device_id") val deviceId: String,
    @SerialName("device_token") val deviceToken: String,
    @SerialName("server_name") val serverName: String? = null
)

@Serializable
data class ChatSession(
    val id: String,
    val title: String,
    @SerialName("thread_id") val threadId: String? = null,
    val model: String = "",
    val cwd: String = "",
    val yolo: Boolean = false,
    val instructions: String = "",
    @SerialName("context_refs") val contextRefs: List<ContextRef> = emptyList(),
    val kind: String = SESSION_KIND_STANDARD,
    @SerialName("branch_name") val branchName: String? = null,
    @SerialName("base_branch") val baseBranch: String? = null,
    @SerialName("target_branch") val targetBranch: String? = null,
    @SerialName("source_branch") val sourceBranch: String? = null,
    @SerialName("worktree_path") val worktreePath: String = "",
    @SerialName("auto_cleanup_branch") val autoCleanupBranch: Boolean = false,
    val draft: String = "",
    @SerialName("is_sending") val isSending: Boolean = false,
    @SerialName("pending_request_id") val pendingRequestId: String? = null,
    val messages: List<ChatMessage> = emptyList()
)

@Serializable
data class ProjectConfig(
    val id: String,
    val name: String,
    val kind: String = PROJECT_KIND_STANDARD,
    @SerialName("root_path") val rootPath: String = "",
    @SerialName("repo_root") val repoRoot: String = "",
    @SerialName("repo_relative_path") val repoRelativePath: String = "",
    @SerialName("default_branch") val defaultBranch: String = "",
    @SerialName("default_model") val defaultModel: String = "",
    @SerialName("default_yolo") val defaultYolo: Boolean = false,
    @SerialName("default_instructions") val defaultInstructions: String = "",
    @SerialName("context_refs") val contextRefs: List<ContextRef> = emptyList(),
    val sessions: List<ChatSession> = emptyList(),
    @SerialName("active_session_id") val activeSessionId: String? = null
) {
    val activeSession: ChatSession?
        get() = sessions.find { it.id == activeSessionId } ?: sessions.firstOrNull()
}

@Serializable
data class RelayDeviceProfile(
    @SerialName("installation_id") val installationId: String,
    val credentials: BrokerCredentials,
    @SerialName("custom_name") val customName: String? = null,
    @SerialName("codex_model") val codexModel: String = "",
    @SerialName("codex_home") val codexHome: String = "",
    @SerialName("credentials_root") val credentialsRoot: String = "",
    @SerialName("worktree_root") val worktreeRoot: String = "",
    @SerialName("credential_bundles") val credentialBundles: List<CredentialBundleSummary> = emptyList(),
    @SerialName("available_skills") val availableSkills: List<SkillSummary> = emptyList(),
    val projects: List<ProjectConfig> = emptyList(),
    @SerialName("active_project_id") val activeProjectId: String? = null,
    @SerialName("sessions") val legacySessions: List<ChatSession> = emptyList(),
    @SerialName("active_session_id") val legacyActiveSessionId: String? = null,
    @SerialName("last_connected_at") val lastConnectedAt: Long? = null
) {
    val displayName: String
        get() = customName?.takeIf { it.isNotBlank() }
            ?: credentials.serverName?.takeIf { it.isNotBlank() }
            ?: "设备 ${installationId.takeLast(6)}"

    val sessions: List<ChatSession>
        get() = projects.flatMap { it.sessions }

    val activeSessionId: String?
        get() = activeProject?.activeSessionId

    val activeSession: ChatSession?
        get() = activeProject?.activeSession

    val activeProject: ProjectConfig?
        get() = projects.find { it.id == activeProjectId } ?: projects.firstOrNull()
}

@Serializable
data class ChatMessage(val id: String, val role: String, val content: String)

@Serializable
data class PersistedState(
    @SerialName("client_installation_id") val clientInstallationId: String = "",
    val devices: List<RelayDeviceProfile> = emptyList(),
    @SerialName("active_device_id") val activeDeviceId: String? = null,
    val sessions: List<ChatSession> = emptyList(),
    val activeSessionId: String? = null,
    val credentials: BrokerCredentials? = null,
    @SerialName("task_alerts_enabled") val taskAlertsEnabled: Boolean = true
) {
    fun toUiState(): UiState {
        val migratedDevices = normalizeRelayDevices(
            if (devices.isNotEmpty()) {
                devices
            } else if (credentials != null) {
                listOf(
                    RelayDeviceProfile(
                        installationId = credentials.installationId,
                        credentials = credentials,
                        legacySessions = sessions,
                        legacyActiveSessionId = activeSessionId
                    )
                )
            } else {
                emptyList()
            }
        )
        val resolvedActiveDeviceId = activeDeviceId
            ?.takeIf { id -> migratedDevices.any { it.installationId == id } }
            ?: migratedDevices.firstOrNull()?.installationId
        val activeDevice = migratedDevices.find { it.installationId == resolvedActiveDeviceId } ?: migratedDevices.firstOrNull()
        return UiState(
            clientInstallationId = clientInstallationId,
            devices = migratedDevices,
            activeDeviceId = resolvedActiveDeviceId,
            taskAlertsEnabled = taskAlertsEnabled,
            connectionSummary = if (activeDevice != null) {
                "Broker 已就绪，可重连 ${activeDevice.displayName}"
            } else {
                "Broker 已就绪，设备未认证"
            }
        )
    }
}

@Serializable
data class StreamRequest(
    val message: String,
    @SerialName("thread_id") val threadId: String? = null,
    val model: String = "",
    val cwd: String,
    val yolo: Boolean,
    val instructions: String = "",
    @SerialName("context_refs") val contextRefs: List<ContextRef> = emptyList(),
    @SerialName("git_context") val gitContext: GitChatContext? = null,
    @SerialName("session_id") val sessionId: String,
    @SerialName("request_id") val requestId: String
)

@Serializable
data class BrokerConfig(
    @SerialName("server_name") val serverName: String? = null,
    @SerialName("codex_model") val codexModel: String,
    @SerialName("codex_home") val codexHome: String,
    @SerialName("credentials_root") val credentialsRoot: String = "",
    @SerialName("worktree_root") val worktreeRoot: String = ""
)

private fun createChatSession(defaultCwd: String = ""): ChatSession =
    ChatSession(id = UUID.randomUUID().toString(), title = DEFAULT_SESSION_TITLE, model = "", cwd = defaultCwd)

private fun cloneSessionFromSource(
    project: ProjectConfig,
    source: ChatSession,
    device: RelayDeviceProfile,
    continueThread: Boolean
): ChatSession =
    ChatSession(
        id = UUID.randomUUID().toString(),
        title = deriveDerivedSessionTitle(project, source, continueThread),
        threadId = if (continueThread) source.threadId else null,
        model = source.model.ifBlank { project.defaultModel.ifBlank { device.codexModel } },
        cwd = source.cwd.ifBlank { project.rootPath.ifBlank { device.codexHome } },
        yolo = source.yolo,
        instructions = source.instructions,
        contextRefs = source.contextRefs,
        kind = source.kind,
        branchName = source.branchName,
        baseBranch = source.baseBranch,
        targetBranch = source.targetBranch,
        sourceBranch = source.sourceBranch,
        worktreePath = source.worktreePath,
        autoCleanupBranch = source.autoCleanupBranch,
        draft = "",
        isSending = false,
        pendingRequestId = null,
        messages = copyMessagesForDerivedSession(source)
    )

private fun copyMessagesForDerivedSession(source: ChatSession): List<ChatMessage> {
    if (source.messages.isEmpty()) return emptyList()
    val trailingInterrupted = source.isSending || source.pendingRequestId != null
    val lastAssistantIndex = source.messages.indexOfLast { it.role == "assistant" }
    return source.messages.mapIndexed { index, message ->
        val nextContent = if (trailingInterrupted && index == lastAssistantIndex && message.content.isBlank()) {
            "（上一次生成未完成，可在这个新会话继续）"
        } else {
            message.content
        }
        ChatMessage(id = UUID.randomUUID().toString(), role = message.role, content = nextContent)
    }
}

private fun deriveDerivedSessionTitle(project: ProjectConfig, source: ChatSession, continueThread: Boolean): String {
    val suffix = if (continueThread) "继续" else "分叉"
    val base = "${source.title.ifBlank { DEFAULT_SESSION_TITLE }} · $suffix"
    val existing = project.sessions.map { it.title }.toSet()
    if (base !in existing) return base
    var index = 2
    var candidate = "$base $index"
    while (candidate in existing) {
        index += 1
        candidate = "$base $index"
    }
    return candidate
}

private fun createProject(
    name: String,
    rootPath: String = "",
    defaultModel: String = "",
    defaultYolo: Boolean = false,
    kind: String = PROJECT_KIND_STANDARD
): ProjectConfig =
    ProjectConfig(
        id = UUID.randomUUID().toString(),
        name = name,
        kind = kind,
        rootPath = rootPath,
        defaultModel = defaultModel,
        defaultYolo = defaultYolo
    )

private fun ensureProjectSessions(project: ProjectConfig, device: RelayDeviceProfile): ProjectConfig {
    val sessions = project.sessions.map { session ->
        session.copy(
            model = session.model.ifBlank { project.defaultModel.ifBlank { device.codexModel } },
            cwd = session.cwd.ifBlank { project.rootPath.ifBlank { device.codexHome } }
        )
    }
    val activeSessionId = project.activeSessionId
        ?.takeIf { id -> sessions.any { it.id == id } }
        ?: sessions.firstOrNull()?.id
    return project.copy(sessions = sessions, activeSessionId = activeSessionId)
}

private fun deriveProjectName(path: String): String {
    val normalized = path.replace('\\', '/').trimEnd('/')
    return normalized.substringAfterLast('/', "").ifBlank { "未分类" }
}

private fun migrateLegacyProjects(profile: RelayDeviceProfile): List<ProjectConfig> {
    if (profile.legacySessions.isEmpty()) return profile.projects
    val grouped = LinkedHashMap<String, MutableList<ChatSession>>()
    profile.legacySessions.forEach { session ->
        val projectName = session.cwd.takeIf { it.isNotBlank() }?.let(::deriveProjectName) ?: "未分类"
        grouped.getOrPut(projectName) { mutableListOf() }.add(
            session.copy(model = session.model.ifBlank { profile.codexModel })
        )
    }
    return grouped.entries.map { (name, sessions) ->
        val firstPath = sessions.firstOrNull { it.cwd.isNotBlank() }?.cwd.orEmpty()
        val defaultModel = sessions.firstOrNull { it.model.isNotBlank() }?.model ?: profile.codexModel
        val defaultYolo = sessions.firstOrNull()?.yolo ?: false
        val activeSessionId = profile.legacyActiveSessionId
            ?.takeIf { id -> sessions.any { it.id == id } }
            ?: sessions.firstOrNull()?.id
        ProjectConfig(
            id = UUID.nameUUIDFromBytes("${profile.installationId}:$name".toByteArray()).toString(),
            name = name,
            rootPath = firstPath,
            defaultModel = defaultModel,
            defaultYolo = defaultYolo,
            sessions = sessions,
            activeSessionId = activeSessionId
        )
    }
}

private fun ensureDeviceProjects(profile: RelayDeviceProfile): RelayDeviceProfile {
    val sourceProjects = if (profile.projects.isNotEmpty()) profile.projects else migrateLegacyProjects(profile)
    val normalizedProjects = ensureCredentialCenterProject(profile, sourceProjects.map { ensureProjectSessions(it, profile) })
    val activeProjectId = profile.activeProjectId
        ?.takeIf { id -> normalizedProjects.any { it.id == id } }
        ?: normalizedProjects.firstOrNull()?.id
    return profile.copy(
        projects = normalizedProjects,
        activeProjectId = activeProjectId,
        legacySessions = emptyList(),
        legacyActiveSessionId = null
    )
}

private fun ensureCredentialCenterProject(profile: RelayDeviceProfile, projects: List<ProjectConfig>): List<ProjectConfig> {
    if (profile.credentialsRoot.isBlank()) return projects
    val credentialProject = projects.find { it.kind == PROJECT_KIND_CREDENTIAL_CENTER }?.let { existing ->
        existing.copy(
            rootPath = profile.credentialsRoot,
            defaultModel = existing.defaultModel.ifBlank { profile.codexModel }
        )
    } ?: createProject(
        name = "凭据中心",
        rootPath = profile.credentialsRoot,
        defaultModel = profile.codexModel,
        defaultYolo = false,
        kind = PROJECT_KIND_CREDENTIAL_CENTER
    ).copy(
        id = UUID.nameUUIDFromBytes("${profile.installationId}:$CREDENTIAL_CENTER_PROJECT_ID_SUFFIX".toByteArray()).toString(),
        defaultInstructions = "这个项目专门用于管理设备级凭据、skills 和说明文件。"
    )
    val others = projects.filter { it.kind != PROJECT_KIND_CREDENTIAL_CENTER }
    return others + ensureProjectSessions(credentialProject, profile)
}

private fun credentialCenterProject(profile: RelayDeviceProfile): ProjectConfig? {
    return profile.projects.find { it.kind == PROJECT_KIND_CREDENTIAL_CENTER }
}

private fun normalizeRelayDevices(devices: List<RelayDeviceProfile>): List<RelayDeviceProfile> {
    val ordered = LinkedHashMap<String, RelayDeviceProfile>()
    devices.forEach { profile ->
        ordered[profile.installationId] = ensureDeviceProjects(profile)
    }
    return ordered.values.toList()
}

private fun buildConnectionSummary(device: RelayDeviceProfile?, authenticated: Boolean): String {
    if (device == null) {
        return if (authenticated) "Broker 已认证" else "Broker 已就绪，设备未认证"
    }
    val suffix = device.codexModel.takeIf { it.isNotBlank() } ?: device.credentials.deviceId.take(12)
    return if (authenticated) {
        "${device.displayName} | $suffix"
    } else {
        "已选择 ${device.displayName}"
    }
}

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
data class DeviceDirectoryCreateResult(
    val ok: Boolean,
    val name: String,
    val path: String
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

@Serializable
data class ContextRef(
    val kind: String,
    val id: String
)

data class ContextCatalogEntry(
    val ref: ContextRef,
    val title: String,
    val subtitle: String,
    val boundToProject: Boolean = false
)

@Serializable
data class CredentialBundleSummary(
    val id: String,
    val name: String,
    val description: String = "",
    val scope: String = "global",
    @SerialName("project_hint") val projectHint: String? = null,
    @SerialName("folder_path") val folderPath: String,
    @SerialName("readme_path") val readmePath: String? = null,
    val files: List<String> = emptyList()
)

@Serializable
data class SkillSummary(
    val id: String,
    val name: String,
    val description: String = "",
    val source: String = "",
    @SerialName("skill_path") val skillPath: String,
    @SerialName("folder_path") val folderPath: String
)

@Serializable
data class ContextCatalogPayload(
    @SerialName("credentials_root") val credentialsRoot: String,
    @SerialName("worktree_root") val worktreeRoot: String,
    val bundles: List<CredentialBundleSummary> = emptyList(),
    val skills: List<SkillSummary> = emptyList()
)

@Serializable
data class CreateCredentialBundleRequest(
    val name: String,
    val description: String = "",
    val scope: String = "global",
    @SerialName("project_hint") val projectHint: String = ""
)

@Serializable
data class GitStatusSummary(
    @SerialName("branch_line") val branchLine: String = "",
    val ahead: Int = 0,
    val behind: Int = 0,
    val staged: Int = 0,
    val modified: Int = 0,
    val deleted: Int = 0,
    val renamed: Int = 0,
    val untracked: Int = 0,
    val conflicts: Int = 0,
    @SerialName("is_dirty") val isDirty: Boolean = false
)

@Serializable
data class GitWorktreeEntry(
    val path: String,
    val branch: String? = null,
    val head: String? = null,
    val detached: Boolean = false
)

@Serializable
data class GitRepoInspectPayload(
    val ok: Boolean = true,
    @SerialName("is_repo") val isRepo: Boolean = false,
    @SerialName("inspected_path") val inspectedPath: String = "",
    @SerialName("repo_root") val repoRoot: String = "",
    @SerialName("relative_path") val relativePath: String = "",
    @SerialName("current_branch") val currentBranch: String = "",
    @SerialName("default_branch") val defaultBranch: String = "",
    @SerialName("head_sha") val headSha: String = "",
    val status: GitStatusSummary = GitStatusSummary(),
    val remotes: List<String> = emptyList(),
    @SerialName("remote_details") val remoteDetails: List<GitRemoteDetail> = emptyList(),
    val worktrees: List<GitWorktreeEntry> = emptyList()
)

@Serializable
data class GitRemoteDetail(
    val name: String,
    @SerialName("fetch_url") val fetchUrl: String = "",
    @SerialName("push_url") val pushUrl: String = ""
)

@Serializable
data class GitBranchEntry(
    val name: String,
    val sha: String = "",
    val upstream: String? = null,
    val current: Boolean = false,
    @SerialName("is_default") val isDefault: Boolean = false
)

@Serializable
data class GitRemoteBranchEntry(
    val name: String,
    val sha: String = ""
)

@Serializable
data class GitBranchesPayload(
    @SerialName("repo_root") val repoRoot: String,
    @SerialName("current_branch") val currentBranch: String = "",
    @SerialName("default_branch") val defaultBranch: String = "",
    val local: List<GitBranchEntry> = emptyList(),
    val remote: List<GitRemoteBranchEntry> = emptyList()
)

@Serializable
data class GitCommit(
    val sha: String,
    @SerialName("short_sha") val shortSha: String,
    val date: String,
    val author: String,
    val subject: String
)

@Serializable
data class GitLogPayload(
    @SerialName("repo_root") val repoRoot: String,
    val commits: List<GitCommit> = emptyList()
)

@Serializable
data class GithubStatusPayload(
    val ok: Boolean,
    val output: String
)

@Serializable
data class GitWorktreeCreatePayload(
    val ok: Boolean,
    @SerialName("repo_root") val repoRoot: String,
    val branch: String,
    @SerialName("base_branch") val baseBranch: String,
    @SerialName("worktree_path") val worktreePath: String,
    @SerialName("exec_path") val execPath: String
)

@Serializable
data class GitPullRequestPayload(
    val ok: Boolean,
    val url: String = "",
    val output: String = ""
)

@Serializable
data class GitMergeResultPayload(
    val ok: Boolean,
    val output: String = ""
)

@Serializable
data class GitOperationPayload(
    val ok: Boolean,
    @SerialName("repo_root") val repoRoot: String,
    val branch: String,
    @SerialName("base_branch") val baseBranch: String,
    @SerialName("worktree_path") val worktreePath: String,
    @SerialName("exec_path") val execPath: String,
    val operation: String,
    @SerialName("source_branch") val sourceBranch: String,
    @SerialName("target_branch") val targetBranch: String,
    val prompt: String
)

@Serializable
data class GitChatContext(
    @SerialName("repo_root") val repoRoot: String = "",
    @SerialName("project_root") val projectRoot: String = "",
    @SerialName("session_kind") val sessionKind: String = "",
    @SerialName("branch_name") val branchName: String? = null,
    @SerialName("base_branch") val baseBranch: String? = null,
    @SerialName("target_branch") val targetBranch: String? = null,
    @SerialName("source_branch") val sourceBranch: String? = null,
    @SerialName("worktree_path") val worktreePath: String = ""
)

private const val PROJECT_KIND_STANDARD = "standard"
private const val PROJECT_KIND_CREDENTIAL_CENTER = "credential_center"
private const val SESSION_KIND_STANDARD = "standard"
private const val SESSION_KIND_WORKTREE = "worktree"
private const val SESSION_KIND_MERGE = "merge"
private const val SESSION_KIND_REBASE = "rebase"
private const val CREDENTIAL_CENTER_PROJECT_ID_SUFFIX = "credential-center"

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

private fun dedupeContextRefs(refs: List<ContextRef>): List<ContextRef> {
    val ordered = LinkedHashMap<String, ContextRef>()
    refs.forEach { ref ->
        ordered["${ref.kind}:${ref.id}"] = ref
    }
    return ordered.values.toList()
}

private fun resolveContextLabel(ui: UiState, ref: ContextRef): String {
    val device = ui.activeDevice
    if (device != null) {
        if (ref.kind == "credential") {
            device.credentialBundles.find { it.id == ref.id }?.let { return it.name }
        }
        if (ref.kind == "skill") {
            device.availableSkills.find { it.id == ref.id }?.let { return it.name }
        }
    }
    return ref.id
}

private fun extractMentionQuery(text: String): String? {
    val token = text.takeLastWhile { !it.isWhitespace() }
    if (!token.startsWith("@")) return null
    return token.removePrefix("@")
}

private fun replaceTrailingMention(text: String, label: String): String {
    val token = text.takeLastWhile { !it.isWhitespace() }
    return if (token.startsWith("@")) {
        text.dropLast(token.length) + "@$label "
    } else {
        "$text @$label "
    }
}

private fun appendStatusLog(current: String, entry: String): String {
    val next = if (entry.isBlank()) current else if (current.isBlank()) entry else "$current\n$entry"
    return next.takeLast(8000)
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
