package com.appradar.util

import android.location.Location

object LocationHelper {

    /**
     * Comprueba si la ubicación actual está dentro del radio de tolerancia de un waypoint.
     * @param currentLocation Ubicación del corredor
     * @param waypointLat Latitud del waypoint
     * @param waypointLon Longitud del waypoint
     * @param radiusInMeters Radio de tolerancia en metros (ej. 50 metros)
     * @return true si está dentro del radio
     */
    fun isWithinWaypointRadius(
        currentLocation: Location,
        waypointLat: Double,
        waypointLon: Double,
        radiusInMeters: Float = 50f
    ): Boolean {
        val waypointLocation = Location("").apply {
            latitude = waypointLat
            longitude = waypointLon
        }
        val distance = currentLocation.distanceTo(waypointLocation)
        return distance <= radiusInMeters
    }
}
