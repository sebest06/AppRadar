package com.appradar.util

import android.location.Location
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class LocationHelperTest {

    private fun makeLocation(lat: Double, lon: Double): Location =
        Location("gps").apply { latitude = lat; longitude = lon; accuracy = 5f }

    // Coordenadas base del test: -34.6037, -58.3816 (Buenos Aires)
    private val BASE_LAT = -34.6037
    private val BASE_LON = -58.3816

    @Test
    fun `mismas coordenadas están dentro del radio`() {
        val current = makeLocation(BASE_LAT, BASE_LON)
        assertTrue(LocationHelper.isWithinWaypointRadius(current, BASE_LAT, BASE_LON))
    }

    @Test
    fun `ubicación dentro del radio por defecto (50m) es detectada`() {
        // ~30m al norte: 0.0003 grados ≈ 33m
        val current = makeLocation(BASE_LAT + 0.0003, BASE_LON)
        assertTrue(LocationHelper.isWithinWaypointRadius(current, BASE_LAT, BASE_LON, 50f))
    }

    @Test
    fun `ubicación fuera del radio por defecto (50m) no es detectada`() {
        // ~120m al norte: 0.001 grados ≈ 111m
        val current = makeLocation(BASE_LAT + 0.001, BASE_LON)
        assertFalse(LocationHelper.isWithinWaypointRadius(current, BASE_LAT, BASE_LON, 50f))
    }

    @Test
    fun `radio personalizado pequeño (10m) detecta ubicación cercana`() {
        // ~5m al norte
        val current = makeLocation(BASE_LAT + 0.000045, BASE_LON)
        assertTrue(LocationHelper.isWithinWaypointRadius(current, BASE_LAT, BASE_LON, 10f))
    }

    @Test
    fun `radio personalizado pequeño (10m) rechaza ubicación lejana`() {
        // ~30m al norte
        val current = makeLocation(BASE_LAT + 0.0003, BASE_LON)
        assertFalse(LocationHelper.isWithinWaypointRadius(current, BASE_LAT, BASE_LON, 10f))
    }

    @Test
    fun `radio grande (200m) acepta ubicación alejada`() {
        // ~111m al norte
        val current = makeLocation(BASE_LAT + 0.001, BASE_LON)
        assertTrue(LocationHelper.isWithinWaypointRadius(current, BASE_LAT, BASE_LON, 200f))
    }

    @Test
    fun `desplazamiento en longitud también es detectado`() {
        // ~25m al este
        val current = makeLocation(BASE_LAT, BASE_LON + 0.0003)
        assertTrue(LocationHelper.isWithinWaypointRadius(current, BASE_LAT, BASE_LON, 50f))
    }

    @Test
    fun `diagonal lejana queda fuera del radio`() {
        // ~78m en diagonal
        val current = makeLocation(BASE_LAT + 0.0005, BASE_LON + 0.0005)
        assertFalse(LocationHelper.isWithinWaypointRadius(current, BASE_LAT, BASE_LON, 50f))
    }
}
