package com.appradar

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
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
import com.appradar.ui.viewmodel.MainViewModel
import dagger.hilt.android.AndroidEntryPoint
import androidx.lifecycle.viewmodel.compose.viewModel

import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val appColorScheme = lightColorScheme(
            primary = Color(0xFF6750A4),
            onPrimary = Color.White,
            primaryContainer = Color(0xFFEADDFF),
            onPrimaryContainer = Color(0xFF21005D),
            surface = Color(0xFFFEF7FF),
            onSurface = Color(0xFF1C1B1F),
        )

        setContent {
            MaterialTheme(colorScheme = appColorScheme) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val mainViewModel: MainViewModel = viewModel()
                    val isLoggedIn by mainViewModel.isLoggedIn.collectAsState()

                    if (isLoggedIn == null) {
                        // Esperando a que DataStore cargue el estado
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator()
                        }
                    } else {
                        AppNavGraph(startDestination = if (isLoggedIn == true) Screen.Home.route else Screen.Login.route)
                    }
                }
            }
        }
    }
}

@Composable
fun AppNavGraph(startDestination: String) {
    val navController = rememberNavController()
    
    val mainViewModel: MainViewModel = viewModel()
    val isLoggedIn by mainViewModel.isLoggedIn.collectAsState()

    // Redirigir al login si se cierra sesión desde cualquier pantalla
    LaunchedEffect(isLoggedIn) {
        if (isLoggedIn == false) {
            navController.navigate(Screen.Login.route) {
                popUpTo(0)
            }
        }
    }

    NavHost(navController = navController, startDestination = startDestination) {
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
        composable(
            route = Screen.Leaderboard.route,
            arguments = listOf(
                navArgument("trailUuid") { type = NavType.StringType },
                navArgument("teamUuid") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val trailUuid = backStackEntry.arguments?.getString("trailUuid") ?: ""
            val teamUuid = backStackEntry.arguments?.getString("teamUuid") ?: ""
            LeaderboardScreen(navController, trailUuid, teamUuid)
        }
        composable(Screen.RaceHistory.route) { RaceHistoryScreen(navController) }
        composable(Screen.Settings.route) { SettingsScreen(navController) }
    }
}
