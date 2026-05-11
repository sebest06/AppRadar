package com.appradar.service

import com.google.android.gms.wearable.Node
import com.google.android.gms.wearable.WearableListenerService
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Se activa automáticamente cuando un reloj WearOS se conecta.
 * Envía la URL del backend, token y lista de carreras al reloj via Data Layer.
 */
@AndroidEntryPoint
class PhoneWearSyncService : WearableListenerService() {

    @Inject
    lateinit var wearSyncHelper: WearSyncHelper

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onPeerConnected(peer: Node) {
        super.onPeerConnected(peer)
        serviceScope.launch {
            try { wearSyncHelper.syncToWatch() } catch (_: Exception) {}
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
    }
}
