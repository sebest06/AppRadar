package com.appradar.util

/**
 * Genera la línea de texto de gap para la notificación de ranking.
 *
 * Si ambos tienen el mismo número de waypoints y timestamps válidos, calcula
 * la diferencia de tiempo. De lo contrario muestra diferencia en waypoints.
 */
fun formatGapLine(
    arrow: String,
    name: String,
    rankNo: Int,
    refWps: Int,
    cmpWps: Int,
    refTime: Long,
    cmpTime: Long,
    userIsFaster: Boolean
): String {
    val wpDiff = Math.abs(refWps - cmpWps)
    return if (wpDiff == 0 && refTime > 0 && cmpTime > 0) {
        val gapSec = Math.abs(refTime - cmpTime) / 1000
        val mins = gapSec / 60
        val secs = gapSec % 60
        val gapStr = if (mins > 0) "${mins}m ${secs}s" else "${secs}s"
        if (userIsFaster) "$arrow ${gapStr} sobre $name (#$rankNo)"
        else "$arrow ${gapStr} detrás de $name (#$rankNo)"
    } else {
        if (userIsFaster) "$arrow $wpDiff WP adelante de $name (#$rankNo)"
        else "$arrow $wpDiff WP detrás de $name (#$rankNo)"
    }
}
