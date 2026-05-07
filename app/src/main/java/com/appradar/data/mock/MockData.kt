package com.appradar.data.mock

import com.appradar.data.local.entity.TrailEntity
import com.appradar.data.local.entity.UserEntity
import com.appradar.data.local.entity.WaypointEntity

object MockData {
    val mockUser = UserEntity(
        uuid = "mock_user_1",
        user = "usuario",
        passw = "1234",
        nombre = "Usuario Mock",
        team = "ProLife",
        uuid_team = "team_1"
    )

    val mockTrail = TrailEntity(
        trailUuid = "mock_trail_sierras_1",
        carreraId = "carrera_sierras_001",
        name = "Desafío Sierras de Córdoba",
        timestamp = System.currentTimeMillis()
    )

    // Coordenadas aproximadas en las Sierras de Córdoba (ej. Cerro Uritorco / Capilla del Monte)
    val mockWaypoints = listOf(
        WaypointEntity(
            waypointUuid = "wp_1",
            trailUuid = mockTrail.trailUuid,
            latitude = -30.8447,
            longitude = -64.4984 // Base
        ),
        WaypointEntity(
            waypointUuid = "wp_2",
            trailUuid = mockTrail.trailUuid,
            latitude = -30.8480,
            longitude = -64.4950 // Medio camino
        ),
        WaypointEntity(
            waypointUuid = "wp_3",
            trailUuid = mockTrail.trailUuid,
            latitude = -30.8520,
            longitude = -64.4910 // Cima
        )
    )

    data class LeaderboardEntry(
        val position: Int,
        val username: String,
        val team: String,
        val timeDiffSeconds: Int // Diferencia respecto al líder
    )

    // Ranking simulado
    val mockLeaderboard = listOf(
        LeaderboardEntry(1, "corredor_elite", "Salomon", 0),
        LeaderboardEntry(2, "montañista99", "NorthFace", 120), // 2 mins atras
        LeaderboardEntry(3, "usuario", "ProLife", 300), // Nosotros, 5 mins atras
        LeaderboardEntry(4, "trail_runner", "ProLife", 450)
    )
}
