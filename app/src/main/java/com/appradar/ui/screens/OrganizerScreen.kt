package com.appradar.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.appradar.data.remote.RankingEntry
import com.appradar.ui.viewmodel.OrganizerViewModel
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrganizerScreen(
    navController: NavController,
    trailUuid: String,
    viewModel: OrganizerViewModel = hiltViewModel()
) {
    val rankings by viewModel.rankings.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val messageSent by viewModel.messageSent.collectAsState()

    // Corredor seleccionado para mensaje individual (null = a todos)
    var messageTarget by remember { mutableStateOf<RankingEntry?>(null) }
    var showMessageDialog by remember { mutableStateOf(false) }
    var broadcastDialog by remember { mutableStateOf(false) }

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        while (true) {
            viewModel.refreshRankings(trailUuid)
            delay(10_000)
        }
    }

    LaunchedEffect(messageSent) {
        if (messageSent == true) {
            snackbarHostState.showSnackbar("Mensaje enviado ✓")
            viewModel.clearMessageSentState()
        } else if (messageSent == false) {
            snackbarHostState.showSnackbar("Error al enviar el mensaje")
            viewModel.clearMessageSentState()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Panel del Organizador") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Volver")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.refreshRankings(trailUuid) }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Actualizar")
                    }
                }
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { broadcastDialog = true },
                icon = { Icon(Icons.Default.Send, contentDescription = null) },
                text = { Text("Mensaje a todos") }
            )
        }
    ) { padding ->
        if (isLoading && rankings.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (rankings.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Sin corredores en carrera", style = MaterialTheme.typography.bodyLarge)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(vertical = 12.dp)
            ) {
                itemsIndexed(rankings) { index, runner ->
                    RunnerCard(
                        rank = index + 1,
                        runner = runner,
                        onSendMessage = {
                            messageTarget = runner
                            showMessageDialog = true
                        }
                    )
                }
            }
        }
    }

    if (showMessageDialog) {
        MessageDialog(
            title = "Mensaje a ${messageTarget?.userName ?: "corredor"}",
            onDismiss = { showMessageDialog = false },
            onSend = { content ->
                viewModel.sendMessage(trailUuid, messageTarget?.userUuid, content)
                showMessageDialog = false
            }
        )
    }

    if (broadcastDialog) {
        MessageDialog(
            title = "Mensaje a todos los corredores",
            onDismiss = { broadcastDialog = false },
            onSend = { content ->
                viewModel.sendMessage(trailUuid, null, content)
                broadcastDialog = false
            }
        )
    }
}

@Composable
private fun RunnerCard(rank: Int, runner: RankingEntry, onSendMessage: () -> Unit) {
    val (statusEmoji, statusLabel, statusColor) = when {
        runner.sos        -> Triple("🆘", "SOS activado", Color(0xFFD32F2F))
        runner.isCompleted -> Triple("🏁", "Completó", Color(0xFF1565C0))
        runner.isAbandoned -> Triple("🛑", "Abandonó", Color(0xFF757575))
        else               -> Triple("🏃", "En carrera", Color(0xFF2E7D32))
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "#$rank",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.width(36.dp)
            )

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(statusEmoji)
                    Spacer(Modifier.width(4.dp))
                    Text(
                        text = runner.userName,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                Text(
                    text = statusLabel,
                    style = MaterialTheme.typography.labelSmall,
                    color = statusColor
                )
                Text(
                    text = "${runner.waypointsReached}/${runner.totalWaypoints} checkpoints",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            IconButton(onClick = onSendMessage) {
                Icon(
                    Icons.Default.Send,
                    contentDescription = "Enviar mensaje",
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
private fun MessageDialog(title: String, onDismiss: () -> Unit, onSend: (String) -> Unit) {
    var text by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title, style = MaterialTheme.typography.titleMedium) },
        text = {
            OutlinedTextField(
                value = text,
                onValueChange = { if (it.length <= 500) text = it },
                label = { Text("Mensaje") },
                placeholder = { Text("Escribe un mensaje…") },
                minLines = 3,
                maxLines = 5,
                supportingText = { Text("${text.length}/500") },
                modifier = Modifier.fillMaxWidth()
            )
        },
        confirmButton = {
            TextButton(
                onClick = { if (text.isNotBlank()) onSend(text.trim()) },
                enabled = text.isNotBlank()
            ) { Text("Enviar") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        }
    )
}
