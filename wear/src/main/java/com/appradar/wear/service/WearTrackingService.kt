package com.appradar.wear.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.content.pm.ServiceInfo
import androidx.core.app.NotificationCompat
import com.appradar.wear.data.repository.WearRepository
import com.google.android.gms.location.*
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.launch

@AndroidEntryPoint
class WearTrackingService : Service() {

    @Inject
    lateinit var repository: WearRepository

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback

    private var trailUuid = ""
    private var userUuid = ""
    private var sessionUuid = ""
    private var lastRankPosition = -1

    override fun onCreate() {
        super.onCreate()
        isServiceRunning = true
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { location ->
                    serviceScope.launch { _locationFlow.emit(location) }
                }
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val newTrailUuid = intent?.getStringExtra(EXTRA_TRAIL_UUID) ?: ""
        if (newTrailUuid.isNotEmpty()) {
            trailUuid = newTrailUuid
            userUuid = intent?.getStringExtra(EXTRA_USER_UUID) ?: ""
            sessionUuid = intent?.getStringExtra(EXTRA_SESSION_UUID) ?: ""
            WearTrackingService.startTimeMillis = intent?.getLongExtra(EXTRA_START_TIME, System.currentTimeMillis()) ?: System.currentTimeMillis()
            WearTrackingService.activeTrailUuid = trailUuid
        }

        createNotificationChannel()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                createNotification(),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            )
        } else {
            startForeground(NOTIFICATION_ID, createNotification())
        }
        requestLocationUpdates()

        if (trailUuid.isNotEmpty() && userUuid.isNotEmpty()) {
            startRankingPolling()
        }

        return START_STICKY
    }

    private fun requestLocationUpdates() {
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 5000)
            .setMinUpdateIntervalMillis(2000)
            .build()
        try {
            fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
        } catch (e: SecurityException) { /* sin permiso GPS */ }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "GPS Carrera", NotificationManager.IMPORTANCE_LOW)
            )
            val rankChannel = NotificationChannel(RANKING_CHANNEL_ID, "Ranking en Vivo", NotificationManager.IMPORTANCE_DEFAULT)
            rankChannel.enableVibration(true)
            nm.createNotificationChannel(rankChannel)
        }
    }

    private fun createNotification(): Notification =
        NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("AppRadar")
            .setContentText("Rastreo GPS activo")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .build()

    private fun startRankingPolling() {
        serviceScope.launch {
            while (isActive) {
                delay(30_000L) // Poll every 30 seconds
                fetchAndNotifyRanking()
            }
        }
    }

    private suspend fun fetchAndNotifyRanking() {
        try {
            val rankings = repository.getRankings(trailUuid, null, sessionUuid.ifEmpty { null })
            if (rankings.size < 2) return

            val userIndex = rankings.indexOfFirst { it.userUuid == userUuid }
            if (userIndex < 0) return

            val position = userIndex + 1
            if (lastRankPosition != position) {
                lastRankPosition = position
                val title = if (position == 1) "¡Vas Primero!" else "Posición: #$position"
                val text = "De ${rankings.size} corredores"

                val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                val notif = NotificationCompat.Builder(this, RANKING_CHANNEL_ID)
                    .setContentTitle(title)
                    .setContentText(text)
                    .setSmallIcon(android.R.drawable.ic_menu_sort_by_size)
                    .setVibrate(longArrayOf(0, 300, 150, 300))
                    .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                    .build()

                nm.notify(RANKING_NOTIFICATION_ID, notif)
            }
        } catch (_: Exception) {}
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        isServiceRunning = false
        activeTrailUuid = null
        fusedLocationClient.removeLocationUpdates(locationCallback)
        serviceScope.cancel()
    }

    companion object {
        const val EXTRA_TRAIL_UUID = "trailUuid"
        const val EXTRA_USER_UUID = "userUuid"
        const val EXTRA_SESSION_UUID = "sessionUuid"
        const val EXTRA_START_TIME = "startTime"

        var isServiceRunning = false
            internal set

        var activeTrailUuid: String? = null
            internal set

        var startTimeMillis: Long = 0L
            internal set

        private const val CHANNEL_ID = "WearTrackingChannel"
        private const val RANKING_CHANNEL_ID = "WearRankingChannel"
        private const val NOTIFICATION_ID = 1
        private const val RANKING_NOTIFICATION_ID = 2

        private val _locationFlow = MutableSharedFlow<Location>(
            replay = 1,
            extraBufferCapacity = 64,
            onBufferOverflow = BufferOverflow.DROP_OLDEST
        )
        val locationFlow: SharedFlow<Location> = _locationFlow
    }
}
