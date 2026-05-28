package com.appradar.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class RankingNotificationUtilsTest {

    // ── Diferencia en waypoints ───────────────────────────────────────────────

    @Test
    fun `usuario adelante por waypoints muestra WP adelante`() {
        val result = formatGapLine("↓", "Juan", 2, 3, 1, 0L, 0L, userIsFaster = true)
        assertEquals("↓ 2 WP adelante de Juan (#2)", result)
    }

    @Test
    fun `usuario atrás por waypoints muestra WP detrás`() {
        val result = formatGapLine("↑", "María", 1, 3, 5, 0L, 0L, userIsFaster = false)
        assertEquals("↑ 2 WP detrás de María (#1)", result)
    }

    @Test
    fun `un waypoint de diferencia muestra 1 WP`() {
        val result = formatGapLine("↓", "Pedro", 3, 2, 1, 0L, 0L, userIsFaster = true)
        assertEquals("↓ 1 WP adelante de Pedro (#3)", result)
    }

    // ── Diferencia en tiempo (mismo número de waypoints) ─────────────────────

    @Test
    fun `mismo número de waypoints muestra gap en segundos`() {
        val t1 = 1_000_000L
        val t2 = t1 + 45_000L   // 45 segundos de diferencia
        val result = formatGapLine("↓", "Ana", 2, 3, 3, t1, t2, userIsFaster = true)
        assertEquals("↓ 45s sobre Ana (#2)", result)
    }

    @Test
    fun `gap mayor a un minuto muestra minutos y segundos`() {
        val t1 = 1_000_000L
        val t2 = t1 + 125_000L  // 2m 5s
        val result = formatGapLine("↑", "Luis", 1, 3, 3, t2, t1, userIsFaster = false)
        assertEquals("↑ 2m 5s detrás de Luis (#1)", result)
    }

    @Test
    fun `exactamente un minuto muestra 1m 0s`() {
        val t1 = 1_000_000L
        val t2 = t1 + 60_000L
        val result = formatGapLine("↓", "Sara", 2, 5, 5, t1, t2, userIsFaster = true)
        assertEquals("↓ 1m 0s sobre Sara (#2)", result)
    }

    // ── Timestamps cero fuerzan comparación por waypoints ────────────────────

    @Test
    fun `timestamps cero con mismo número de waypoints usa WP diff (cero)`() {
        // refTime y cmpTime son 0 → cae al caso "diferente WP" aunque sean iguales
        val result = formatGapLine("↓", "Carlos", 2, 3, 3, 0L, 0L, userIsFaster = true)
        // wpDiff == 0, refTime == 0 → usa else branch
        assertTrue(result.contains("0 WP"))
    }
}
