package com.appradar.worker

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.appradar.data.repository.RadarRepository
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val repository: RadarRepository
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            repository.uploadUnsyncedTracks()
            // Podríamos disparar la descarga de rankings aquí también
            // o en un worker separado. 
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
