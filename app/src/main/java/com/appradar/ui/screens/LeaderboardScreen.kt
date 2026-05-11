package com.appradar.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.appradar.ui.viewmodel.LeaderboardViewModel
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LeaderboardScreen(
    navController: NavController,
    trailUuid: String,
    teamUuid: String,
    viewModel: LeaderboardViewModel = hiltViewModel()
) {
    val rankings by viewModel.rankings.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    LaunchedEffect(Unit) {
        while(true) {
            viewModel.refreshRankings(trailUuid, teamUuid)
            delay(30_000)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Ranking en Vivo") },
                actions = {
                    IconButton(onClick = { viewModel.refreshRankings(trailUuid, teamUuid) }) {
                        Text("Refresh", style = MaterialTheme.typography.labelSmall)
                    }
                }
            )
        }
    ) { padding ->
        if (isLoading && rankings.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            Column(modifier = Modifier.padding(padding).fillMaxSize()) {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    itemsIndexed(rankings) { index, entry ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = "#${index + 1}",
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.width(40.dp)
                                    )
                                    Spacer(modifier = Modifier.width(16.dp))
                                    Column {
                                        Text(text = entry.userName, style = MaterialTheme.typography.titleMedium)
                                        Text(
                                            text = "Waypoints: ${entry.waypointsReached}/${entry.totalWaypoints}",
                                            style = MaterialTheme.typography.bodySmall
                                        )
                                    }
                                }
                                if (entry.isCompleted) {
                                    Text(
                                        text = "FIN",
                                        style = MaterialTheme.typography.labelLarge,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
