package com.appradar.ui.navigation

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Home : Screen("home")
    object Settings : Screen("settings")
    object CreateRace : Screen("create_race")
    object ActiveTrail : Screen("active_trail/{trailUuid}") {
        fun createRoute(trailUuid: String) = "active_trail/$trailUuid"
    }
    object Leaderboard : Screen("leaderboard")
    object RaceHistory : Screen("race_history")
}
