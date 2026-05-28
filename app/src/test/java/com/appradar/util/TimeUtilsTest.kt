package com.appradar.util

import org.junit.Assert.assertEquals
import org.junit.Test

class TimeUtilsTest {

    @Test
    fun `cero milisegundos da 00_00_00`() {
        assertEquals("00:00:00", formatElapsedTime(0L))
    }

    @Test
    fun `un segundo da 00_00_01`() {
        assertEquals("00:00:01", formatElapsedTime(1_000L))
    }

    @Test
    fun `un minuto da 00_01_00`() {
        assertEquals("00:01:00", formatElapsedTime(60_000L))
    }

    @Test
    fun `una hora da 01_00_00`() {
        assertEquals("01:00:00", formatElapsedTime(3_600_000L))
    }

    @Test
    fun `una hora un minuto y un segundo da 01_01_01`() {
        assertEquals("01:01:01", formatElapsedTime(3_661_000L))
    }

    @Test
    fun `cinco horas treinta minutos da 05_30_00`() {
        assertEquals("05:30:00", formatElapsedTime(19_800_000L))
    }

    @Test
    fun `59 segundos no muestra minutos`() {
        assertEquals("00:00:59", formatElapsedTime(59_000L))
    }
}
