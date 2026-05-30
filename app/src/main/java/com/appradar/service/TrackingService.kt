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
import com.appradar.util.formatGapLine
import com.google.android.gms.location.*
import dagger.hilt.android.AndroidEntryPoint
import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.UUID
import javax.inject.Inject

@AndroidEntryPoint
class TrackingService : Service() {

    @Inject
    lateinit var repository: RadarRepository

    @Inject
    lateinit var userPreferences: com.appradar.util.UserPreferences

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private var trailUuid = ""
    private var teamUuid = ""
    private var userUuid = ""
    private var runUuid = ""
    private var startTimeMillis = 0L
    private var waypoints: List<WaypointEntity> = emptyList()
    private val reachedWaypoints = mutableSetOf<String>()
    private var maxSkip = 1
    private var lastGpsUploadMs = 0L
    private var consecutiveUploadFailures = 0
    private var dataJob: kotlinx.coroutines.Job? = null
    private var socket: Socket? = null

    private data class TeammateSnapshot(
        val waypointsReached: Int,
        val isCompleted: Boolean,
        val isAbandoned: Boolean,
        val sos: Boolean
    )
    private val previousTeammateState = mutableMapOf<String, TeammateSnapshot>()

    companion object {
        const val EXTRA_TRAIL_UUID = "trailUuid"
        const val EXTRA_TEAM_UUID = "teamUuid"
        const val EXTRA_USER_UUID = "userUuid"
        const val EXTRA_RUN_UUID = "runUuid"
        const val EXTRA_MAX_SKIP = "maxSkip"
        const val EXTRA_START_TIME = "startTime"

        private const val TRACKING_CHANNEL_ID = "TrackingChannel"
        private const val RANKING_CHANNEL_ID = "RankingChannel"
        private const val TEAMMATE_CHANNEL_ID = "TeammateChannel"
        private const val MESSAGES_CHANNEL_ID = "MessagesChannel"
        private const val TRACKING_NOTIFICATION_ID = 1
        private const val RANKING_NOTIFICATION_ID = 2
        private const val TEAMMATE_NOTIFICATION_BASE = 1000
        private const val MESSAGE_NOTIFICATION_BASE = 2000
        private const val RANKING_POLL_MS = 30_000L
        private const val MESSAGES_POLL_MS = 30_000L

        var isServiceRunning = false
            private set
    }

    override fun onCreate() {
        super.onCreate()
        isServiceRunning = true
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { processLocation(it) }
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val newRunUuid = intent?.getStringExtra(EXTRA_RUN_UUID) ?: ""
        
        if (newRunUuid.isNotEmpty() && newRunUuid != runUuid) {
            trailUuid = intent?.getStringExtra(EXTRA_TRAIL_UUID) ?: ""
            teamUuid  = intent?.getStringExtra(EXTRA_TEAM_UUID)  ?: ""
            userUuid  = intent?.getStringExtra(EXTRA_USER_UUID)  ?: ""
            runUuid   = newRunUuid
            maxSkip   = intent?.getIntExtra(EXTRA_MAX_SKIP, 1)   ?: 1
            startTimeMillis = intent?.getLongExtra(EXTRA_START_TIME, System.currentTimeMillis()) ?: System.currentTimeMillis()

            createNotificationChannels()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    TRACKING_NOTIFICATION_ID,
                    buildTrackingNotification(),
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
                )
            } else {
                startForeground(TRACKING_NOTIFICATION_ID, buildTrackingNotification())
            }
            requestLocationUpdates()

            dataJob?.cancel()
            dataJob = serviceScope.launch {
                waypoints = repository.getWaypointsForTrailList(trailUuid)
                // Cargar waypoints ya alcanzados si es una re-conexión
                repository.getTracksForRun(runUuid).collect { tracks ->
                    reachedWaypoints.clear()
                    reachedWaypoints.addAll(tracks.map { it.waypointUuid })
                }
            }
            startRankingPolling()
            startMessagePolling()
            connectSocket()
        }

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
        if (runUuid.isEmpty()) return

        // Upload GPS position to backend every 15 seconds for live map.
        // This does NOT require waypoints to be loaded — runs independently of waypoint detection.
        val now = System.currentTimeMillis()
        if (now - lastGpsUploadMs >= 15_000L) {
            lastGpsUploadMs = now
            serviceScope.launch {
                val ok = repository.uploadGpsPosition(trailUuid, location.latitude, location.longitude, location.accuracy)
                if (ok) {
                    consecutiveUploadFailures = 0
                    updateTrackingNotification(connected = true)
                } else {
                    consecutiveUploadFailures++
                    if (consecutiveUploadFailures >= 3) updateTrackingNotification(connected = false)
                }
            }
        }

        // Waypoint detection requires the waypoints list to be loaded from local DB first.
        val wps = waypoints
        if (wps.isEmpty()) return

        serviceScope.launch {
            val startIndex = reachedWaypoints.size
            if (startIndex >= wps.size) return@launch

            val limitIndex = (startIndex + maxSkip).coerceAtMost(wps.size - 1)

            for (i in startIndex..limitIndex) {
                val wp = wps[i]
                if (LocationHelper.isWithinWaypointRadius(location, wp.latitude, wp.longitude, wp.radiusInMeters)) {
                    val wpTime = System.currentTimeMillis()
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
                                    timestamp = wpTime,
                                    timeFromStart = wpTime - startTimeMillis
                                )
                            )
                        }
                    }
                    break
                }
            }
        }
    }

    // ── Socket.IO — real-time message delivery ────────────────────────────────

    private fun connectSocket() {
        serviceScope.launch {
            try {
                val url   = userPreferences.apiUrl.firstOrNull()?.trimEnd('/') ?: return@launch
                val token = userPreferences.authToken.firstOrNull()            ?: return@launch

                val opts = IO.Options.builder()
                    .setAuth(mapOf("token" to token))
                    .setReconnection(true)
                    .build()

                socket = IO.socket(url, opts).also { s ->
                    s.on("new_message", Emitter.Listener { args ->
                        val data = args.getOrNull(0) as? JSONObject ?: return@Listener
                        val senderUuid    = data.optString("senderUuid")
                        val recipientUuid = data.optString("recipientUuid").takeIf { it.isNotEmpty() }
                        if (senderUuid == userUuid) return@Listener
                        if (recipientUuid != null && recipientUuid != userUuid) return@Listener

                        val senderName = data.optString("senderName", "Organizador")
                        val content    = data.optString("content", "")
                        val timestamp  = data.optLong("timestamp", System.currentTimeMillis())

                        showMessageNotification(senderName, content)
                        if (timestamp > lastMessageTs) lastMessageTs = timestamp
                    })
                    s.connect()
                    s.emit("join_race", JSONObject().put("trailUuid", trailUuid))
                }
            } catch (_: Exception) {
                // Socket.IO unavailable — fallback polling still active
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

    // ── Message polling ───────────────────────────────────────────────────────

    private var lastMessageTs = System.currentTimeMillis()
    private var messageNotifId = MESSAGE_NOTIFICATION_BASE

    private fun showMessageNotification(senderName: String, content: String) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notif = NotificationCompat.Builder(this, MESSAGES_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentTitle("Mensaje de $senderName")
            .setContentText(content)
            .setStyle(NotificationCompat.BigTextStyle().bigText(content))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()
        nm.notify(messageNotifId++, notif)
    }

    private fun startMessagePolling() {
        serviceScope.launch {
            while (isActive) {
                delay(MESSAGES_POLL_MS)
                if (trailUuid.isNotEmpty()) {
                    val messages = repository.getMessages(trailUuid, lastMessageTs)
                    messages.forEach { showMessageNotification(it.senderName, it.content) }
                    if (messages.isNotEmpty()) lastMessageTs = messages.maxOf { it.timestamp }
                }
            }
        }
    }

    private suspend fun fetchAndNotifyRanking() {
        if (trailUuid.isEmpty() || userUuid.isEmpty() || runUuid.isEmpty()) return
        try {
            val run = repository.getRaceRunById(runUuid)
            val sessionUuid = run?.sessionUuid
            val rankings = repository.getRankings(trailUuid, teamUuid.ifEmpty { null }, sessionUuid)

            val oldState = previousTeammateState.toMap()
            for (entry in rankings) {
                if (entry.userUuid == userUuid) continue
                previousTeammateState[entry.userUuid] = TeammateSnapshot(
                    waypointsReached = entry.waypointsReached,
                    isCompleted = entry.isCompleted,
                    isAbandoned = entry.isAbandoned,
                    sos = entry.sos
                )
            }
            if (oldState.isNotEmpty()) checkTeammateEvents(oldState, rankings)

            if (rankings.size < 2) return
            val userIndex = rankings.indexOfFirst { it.userUuid == userUuid }
            if (userIndex < 0) return

            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.notify(RANKING_NOTIFICATION_ID, buildRankingNotification(rankings, userIndex))
        } catch (_: Exception) {}
    }

    private fun checkTeammateEvents(old: Map<String, TeammateSnapshot>, rankings: List<RankingEntry>) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        for (entry in rankings) {
            if (entry.userUuid == userUuid) continue
            val prev = old[entry.userUuid] ?: continue
            val position = rankings.indexOfFirst { it.userUuid == entry.userUuid } + 1
            val notifId = TEAMMATE_NOTIFICATION_BASE + Math.abs(entry.userUuid.hashCode()) % 9000
            val message = when {
                !prev.sos && entry.sos ->
                    "🆘 EMERGENCIA: ${entry.userName} activó el S.O.S"
                !prev.isCompleted && entry.isCompleted ->
                    "🏆 ${entry.userName} finalizó la carrera! · #$position"
                !prev.isAbandoned && entry.isAbandoned ->
                    "🛑 ${entry.userName} abandonó la carrera"
                entry.waypointsReached > prev.waypointsReached -> {
                    val wpIndex = entry.waypointsReached - 1
                    val wpName = waypoints.getOrNull(wpIndex)?.name?.takeIf { it.isNotBlank() }
                        ?: "WP ${entry.waypointsReached}"
                    "📍 ${entry.userName} pasó $wpName · #$position en ranking"
                }
                else -> null
            }
            message?.let { nm.notify(notifId, buildTeammateNotification(it, entry.sos || entry.isCompleted)) }
        }
    }

    private fun buildTeammateNotification(message: String, highPriority: Boolean): Notification {
        val openIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java).apply { flags = Intent.FLAG_ACTIVITY_SINGLE_TOP },
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return NotificationCompat.Builder(this, TEAMMATE_CHANNEL_ID)
            .setContentTitle("Equipo")
            .setContentText(message)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(if (highPriority) NotificationCompat.PRIORITY_HIGH else NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(openIntent)
            .build()
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
        arrow: String, name: String, rankNo: Int,
        refWps: Int, cmpWps: Int, refTime: Long, cmpTime: Long, userIsFaster: Boolean
    ): String = formatGapLine(arrow, name, rankNo, refWps, cmpWps, refTime, cmpTime, userIsFaster)

    // ── Notifications ─────────────────────────────────────────────────────────

    private fun buildTrackingNotification(connected: Boolean = true): Notification =
        NotificationCompat.Builder(this, TRACKING_CHANNEL_ID)
            .setContentTitle("AppRadar en Carrera")
            .setContentText(if (connected) "Rastreo GPS activo · enviando al servidor" else "⚠️ Sin conexión al servidor — verificá la URL en Ajustes")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .build()

    private fun updateTrackingNotification(connected: Boolean) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(TRACKING_NOTIFICATION_ID, buildTrackingNotification(connected))
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(
                NotificationChannel(TRACKING_CHANNEL_ID, "Rastreo de Carrera", NotificationManager.IMPORTANCE_LOW)
            )
            nm.createNotificationChannel(
                NotificationChannel(RANKING_CHANNEL_ID, "Ranking en Vivo", NotificationManager.IMPORTANCE_DEFAULT)
            )
            nm.createNotificationChannel(
                NotificationChannel(TEAMMATE_CHANNEL_ID, "Progreso del equipo", NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "Avisos cuando un compañero pasa un waypoint, finaliza o activa SOS"
                }
            )
            nm.createNotificationChannel(
                NotificationChannel(MESSAGES_CHANNEL_ID, "Mensajes del organizador", NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "Mensajes enviados por el organizador durante la carrera"
                }
            )
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        isServiceRunning = false
        fusedLocationClient.removeLocationUpdates(locationCallback)
        serviceScope.cancel()
        socket?.disconnect()
        socket = null
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .cancel(RANKING_NOTIFICATION_ID)
    }
}
