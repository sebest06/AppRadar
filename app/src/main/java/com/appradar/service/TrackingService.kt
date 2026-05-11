package com.appradar.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.appradar.MainActivity
import com.appradar.data.local.entity.TrackEntity
import com.appradar.data.local.entity.WaypointEntity
import com.appradar.data.remote.RankingEntry
import com.appradar.data.repository.RadarRepository
import com.appradar.util.LocationHelper
import com.google.android.gms.location.*
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

@AndroidEntryPoint
class TrackingService : Service() {

    @Inject
    lateinit var repository: RadarRepository

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private var trailUuid = ""
    private var teamUuid = ""
    private var userUuid = ""
    private var runUuid = ""
    private var waypoints: List<WaypointEntity> = emptyList()
    private val reachedWaypoints = mutableSetOf<String>()
    private var maxSkip = 1

    companion object {
        const val EXTRA_TRAIL_UUID = "trailUuid"
        const val EXTRA_TEAM_UUID = "teamUuid"
        const val EXTRA_USER_UUID = "userUuid"
        const val EXTRA_RUN_UUID = "runUuid"
        const val EXTRA_MAX_SKIP = "maxSkip"

        private const val TRACKING_CHANNEL_ID = "TrackingChannel"
        private const val RANKING_CHANNEL_ID = "RankingChannel"
        private const val TRACKING_NOTIFICATION_ID = 1
        private const val RANKING_NOTIFICATION_ID = 2
        private const val RANKING_POLL_MS = 30_000L
    }

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { processLocation(it) }
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        trailUuid = intent?.getStringExtra(EXTRA_TRAIL_UUID) ?: ""
        teamUuid  = intent?.getStringExtra(EXTRA_TEAM_UUID)  ?: ""
        userUuid  = intent?.getStringExtra(EXTRA_USER_UUID)  ?: ""
        runUuid   = intent?.getStringExtra(EXTRA_RUN_UUID)   ?: ""
        maxSkip   = intent?.getIntExtra(EXTRA_MAX_SKIP, 1)   ?: 1

        createNotificationChannels()
        startForeground(TRACKING_NOTIFICATION_ID, buildTrackingNotification())
        requestLocationUpdates()

        serviceScope.launch {
            waypoints = repository.getWaypointsForTrailList(trailUuid)
        }
        startRankingPolling()

        return START_STICKY
    }

    // ── GPS ──────────────────────────────────────────────────────────────────

    private fun requestLocationUpdates() {
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 5000)
            .setMinUpdateIntervalMillis(2000)
            .build()
        try {
            fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
        } catch (_: SecurityException) {}
    }

    private fun processLocation(location: Location) {
        val wps = waypoints
        if (wps.isEmpty() || runUuid.isEmpty()) return

        serviceScope.launch {
            val startIndex = reachedWaypoints.size
            if (startIndex >= wps.size) return@launch

            val limitIndex = (startIndex + maxSkip).coerceAtMost(wps.size - 1)

            for (i in startIndex..limitIndex) {
                val wp = wps[i]
                if (LocationHelper.isWithinWaypointRadius(location, wp.latitude, wp.longitude, wp.radiusInMeters)) {
                    val now = System.currentTimeMillis()
                    for (j in startIndex..i) {
                        val wpj = wps[j]
                        if (!reachedWaypoints.contains(wpj.waypointUuid)) {
                            reachedWaypoints.add(wpj.waypointUuid)
                            repository.saveTrack(
                                TrackEntity(
                                    trackUuid = UUID.randomUUID().toString(),
                                    trailUuid = trailUuid,
                                    runUuid = runUuid,
                                    userUuid = userUuid,
                                    waypointUuid = wpj.waypointUuid,
                                    timestamp = now,
                                    timeFromStart = 0L
                                )
                            )
                        }
                    }
                    try { repository.uploadUnsyncedTracks() } catch (_: Exception) {}
                    break
                }
            }
        }
    }

    // ── Ranking polling ───────────────────────────────────────────────────────

    private fun startRankingPolling() {
        serviceScope.launch {
            while (isActive) {
                delay(RANKING_POLL_MS)
                fetchAndNotifyRanking()
            }
        }
    }

    private suspend fun fetchAndNotifyRanking() {
        if (trailUuid.isEmpty() || userUuid.isEmpty()) return
        try {
            val rankings = repository.getRankings(trailUuid, teamUuid.ifEmpty { null })
            if (rankings.size < 2) return

            val userIndex = rankings.indexOfFirst { it.userUuid == userUuid }
            if (userIndex < 0) return

            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.notify(RANKING_NOTIFICATION_ID, buildRankingNotification(rankings, userIndex))
        } catch (_: Exception) {}
    }

    private fun buildRankingNotification(rankings: List<RankingEntry>, userIndex: Int): Notification {
        val position = userIndex + 1
        val total    = rankings.size
        val user     = rankings[userIndex]

        val title = if (position == 1) "¡Vas Primero! — $total en carrera"
                    else "#$position de $total"

        val lines = mutableListOf<String>()

        // ↑ persona justo adelante
        if (userIndex > 0) {
            val ahead = rankings[userIndex - 1]
            lines += gapLine(
                arrow     = "↑",
                name      = ahead.userName,
                rankNo    = userIndex,          // posición del que va adelante
                refWps    = ahead.waypointsReached,
                cmpWps    = user.waypointsReached,
                refTime   = ahead.lastWaypointTime,
                cmpTime   = user.lastWaypointTime,
                userIsFaster = false            // el otro va adelante → usuario va detrás
            )
        }

        // ↓ persona justo detrás
        if (userIndex + 1 < total) {
            val behind = rankings[userIndex + 1]
            lines += gapLine(
                arrow     = "↓",
                name      = behind.userName,
                rankNo    = userIndex + 2,
                refWps    = user.waypointsReached,
                cmpWps    = behind.waypointsReached,
                refTime   = user.lastWaypointTime,
                cmpTime   = behind.lastWaypointTime,
                userIsFaster = true             // usuario va adelante → otro va detrás
            )
        }

        val body = lines.joinToString("\n").ifEmpty { "Esperando datos de competidores…" }

        val openIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java).apply { flags = Intent.FLAG_ACTIVITY_SINGLE_TOP },
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, RANKING_CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(lines.firstOrNull() ?: body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setSmallIcon(android.R.drawable.ic_menu_sort_by_size)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setOnlyAlertOnce(true)     // sin sonido en actualizaciones
            .setContentIntent(openIntent)
            .build()
    }

    /**
     * Genera una línea de gap para la notificación.
     *
     * Si ambos tienen el mismo número de waypoints, calcula la diferencia en segundos
     * usando los timestamps de cuando cada uno llegó a su último waypoint.
     * Si los waypoints difieren, muestra la diferencia en waypoints.
     *
     * [refTime] y [cmpTime] son timestamps de epoch (ms). La diferencia positiva
     * (refTime - cmpTime) es el gap en ms: si [userIsFaster], el usuario lleva esa
     * ventaja; si no, el usuario lleva ese déficit.
     */
    private fun gapLine(
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
            val mins   = gapSec / 60
            val secs   = gapSec % 60
            val gapStr = if (mins > 0) "${mins}m ${secs}s" else "${secs}s"
            if (userIsFaster) "$arrow ${gapStr} sobre $name (#$rankNo)"
            else              "$arrow ${gapStr} detrás de $name (#$rankNo)"
        } else {
            if (userIsFaster) "$arrow $wpDiff WP adelante de $name (#$rankNo)"
            else              "$arrow $wpDiff WP detrás de $name (#$rankNo)"
        }
    }

    // ── Notifications ─────────────────────────────────────────────────────────

    private fun buildTrackingNotification(): Notification =
        NotificationCompat.Builder(this, TRACKING_CHANNEL_ID)
            .setContentTitle("AppRadar en Carrera")
            .setContentText("Rastreo GPS activo")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .build()

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(
                NotificationChannel(TRACKING_CHANNEL_ID, "Rastreo de Carrera", NotificationManager.IMPORTANCE_LOW)
            )
            nm.createNotificationChannel(
                NotificationChannel(RANKING_CHANNEL_ID, "Ranking en Vivo", NotificationManager.IMPORTANCE_DEFAULT)
            )
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        fusedLocationClient.removeLocationUpdates(locationCallback)
        serviceScope.cancel()
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .cancel(RANKING_NOTIFICATION_ID)
    }
}
