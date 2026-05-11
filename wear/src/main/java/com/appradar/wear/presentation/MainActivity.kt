package com.appradar.wear.presentation

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController
import com.appradar.wear.presentation.screens.ActiveRaceScreen
import com.appradar.wear.presentation.screens.TrailListScreen
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                WearApp()
            }
        }
    }
}

@Composable
fun WearApp() {
    val navController = rememberSwipeDismissableNavController()
    SwipeDismissableNavHost(
        navController = navController,
        startDestination = "trail_list"
    ) {
        composable("trail_list") {
            TrailListScreen(
                onNavigateToRace = { trailUuid ->
                    navController.navigate("active_race/$trailUuid")
                }
            )
        }
        composable("active_race/{trailUuid}") { backStackEntry ->
            val trailUuid = backStackEntry.arguments?.getString("trailUuid") ?: ""
            ActiveRaceScreen(
                trailUuid = trailUuid,
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
