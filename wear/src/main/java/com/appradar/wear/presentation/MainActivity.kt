package com.appradar.wear.presentation

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController
import com.appradar.wear.presentation.screens.ActiveRaceScreen
import com.appradar.wear.presentation.screens.LoginScreen
import com.appradar.wear.presentation.screens.TrailListScreen
import com.appradar.wear.util.WearUserPreferences
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var userPreferences: WearUserPreferences

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                val authToken by userPreferences.authToken.collectAsState(initial = null)
                WearApp(isLoggedIn = authToken != null)
            }
        }
    }
}

@Composable
fun WearApp(isLoggedIn: Boolean) {
    val navController = rememberSwipeDismissableNavController()
    SwipeDismissableNavHost(
        navController = navController,
        startDestination = if (isLoggedIn) "trail_list" else "login"
    ) {
        composable("login") {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate("trail_list") {
                        popUpTo("login") { inclusive = true }
                    }
                }
            )
        }
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
