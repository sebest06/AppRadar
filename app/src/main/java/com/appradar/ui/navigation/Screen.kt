package com.appradar.ui.navigation

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Home : Screen("home")
    object Settings : Screen("settings")
    object ActiveTrail : Screen("active_trail/{trailUuid}") {
        fun createRoute(trailUuid: String) = "active_trail/$trailUuid"
    }
    object Leaderboard : Screen("leaderboard/{trailUuid}/{teamUuid}") {
        fun createRoute(trailUuid: String, teamUuid: String) = "leaderboard/$trailUuid/$teamUuid"
    }
    object OrganizerDashboard : Screen("organizer/{trailUuid}") {
        fun createRoute(trailUuid: String) = "organizer/$trailUuid"
    }
}
