package com.appradar.data.local.entity

import org.junit.Assert.*
import org.junit.Test

class RaceRunEntityTest {

    private fun makeRun(
        runUuid: String = "run-1",
        trailUuid: String = "trail-1",
        userUuid: String = "user-1",
        isCompleted: Boolean = false,
        isAbandoned: Boolean = false,
        sos: Boolean = false
    ) = RaceRunEntity(
        runUuid = runUuid,
        trailUuid = trailUuid,
        userUuid = userUuid,
        trailName = "Test Trail",
        startTime = 1_000_000L,
        totalTime = 3_600_000L,
        isCompleted = isCompleted,
        isAbandoned = isAbandoned,
        sos = sos
    )

    @Test
    fun `run en progreso no es completado ni abandonado`() {
        val run = makeRun()
        assertFalse(run.isCompleted)
        assertFalse(run.isAbandoned)
        assertFalse(run.sos)
    }

    @Test
    fun `run completado tiene isCompleted en true`() {
        val run = makeRun(isCompleted = true)
        assertTrue(run.isCompleted)
        assertFalse(run.isAbandoned)
    }

    @Test
    fun `run abandonado tiene isAbandoned en true`() {
        val run = makeRun(isAbandoned = true)
        assertFalse(run.isCompleted)
        assertTrue(run.isAbandoned)
    }

    @Test
    fun `run con SOS tiene sos en true`() {
        val run = makeRun(sos = true)
        assertTrue(run.sos)
    }

    @Test
    fun `run nuevo no está sincronizado`() {
        val run = makeRun()
        assertFalse(run.isSynced)
    }

    @Test
    fun `copy permite actualizar estado de sincronización`() {
        val run = makeRun()
        val synced = run.copy(isSynced = true, sessionUuid = "session-abc")
        assertTrue(synced.isSynced)
        assertEquals("session-abc", synced.sessionUuid)
        assertEquals(run.runUuid, synced.runUuid)
    }

    @Test
    fun `dos runs con mismo uuid son iguales`() {
        val a = makeRun(runUuid = "same-uuid")
        val b = makeRun(runUuid = "same-uuid")
        assertEquals(a, b)
    }

    @Test
    fun `dos runs con distinto uuid son distintos`() {
        val a = makeRun(runUuid = "uuid-a")
        val b = makeRun(runUuid = "uuid-b")
        assertNotEquals(a, b)
    }
}
