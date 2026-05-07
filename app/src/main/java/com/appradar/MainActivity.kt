package com.appradar

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.appradar.ui.navigation.Screen
import com.appradar.ui.screens.ActiveTrailScreen
import com.appradar.ui.screens.CreateRaceScreen
import com.appradar.ui.screens.HomeScreen
import com.appradar.ui.screens.LeaderboardScreen
import com.appradar.ui.screens.LoginScreen
import com.appradar.ui.screens.RaceHistoryScreen
import com.appradar.ui.screens.SettingsScreen
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavGraph()
                }
            }
        }
    }
}

@Composable
fun AppNavGraph() {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = Screen.Login.route) {
        composable(Screen.Login.route) { LoginScreen(navController) }
        composable(Screen.Home.route) { HomeScreen(navController) }
        composable(Screen.CreateRace.route) { CreateRaceScreen(navController) }
        composable(
            route = Screen.ActiveTrail.route,
            arguments = listOf(navArgument("trailUuid") { type = NavType.StringType })
        ) { backStackEntry ->
            val trailUuid = backStackEntry.arguments?.getString("trailUuid") ?: ""
            ActiveTrailScreen(navController, trailUuid)
        }
        composable(Screen.Leaderboard.route) { LeaderboardScreen(navController) }
        composable(Screen.RaceHistory.route) { RaceHistoryScreen(navController) }
        composable(Screen.Settings.route) { SettingsScreen(navController) }
    }
}
