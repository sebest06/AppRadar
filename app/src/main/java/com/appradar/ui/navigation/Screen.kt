package com.appradar.ui.navigation

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Home : Screen("home")
    object Settings : Screen("settings")
    object ActiveTrail : Screen("active_trail")
    object Leaderboard : Screen("leaderboard")
}
