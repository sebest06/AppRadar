package com.appradar.ui.viewmodel

import android.location.Location
import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import androidx.test.core.app.ApplicationProvider
import com.appradar.data.local.entity.TrailEntity
import com.appradar.data.local.entity.WaypointEntity
import com.appradar.data.repository.RadarRepository
import com.appradar.util.UserPreferences
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ActiveTrailViewModelTest {

    @get:Rule
    val instantTaskRule = InstantTaskExecutorRule()

    private val testDispatcher = StandardTestDispatcher()

    private val mockRepository: RadarRepository = mockk(relaxed = true)
    private val mockPrefs: UserPreferences = mockk(relaxed = true)

    private lateinit var viewModel: ActiveTrailViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)

        every { mockRepository.observeCurrentUser() } returns flowOf(null)
        every { mockRepository.getWaypointsForTrail(any()) } returns flowOf(emptyList())
        every { mockRepository.getPathPointsForTrail(any()) } returns flowOf(emptyList())
        every { mockRepository.getTracksForRun(any()) } returns flowOf(emptyList())
        every { mockPrefs.userIconResId } returns flowOf(0)
        every { mockPrefs.activeTrailUuid } returns flowOf(null)
        every { mockPrefs.activeRunUuid } returns flowOf(null)
        every { mockPrefs.activeStartTime } returns flowOf(0L)
        every { mockPrefs.activeSessionUuid } returns flowOf(null)
        coEvery { mockRepository.getLastRunForTrail(any()) } returns null
        coEvery { mockRepository.getLivePositions(any(), any()) } returns emptyList()

        val context = ApplicationProvider.getApplicationContext<android.content.Context>()
        viewModel = ActiveTrailViewModel(context, mockRepository, mockPrefs)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    // ── Estado inicial ────────────────────────────────────────────────────────

    @Test
    fun `isRaceStarted es false al iniciar`() {
        assertFalse(viewModel.isRaceStarted.value)
    }

    @Test
    fun `isPaused es false al iniciar`() {
        assertFalse(viewModel.isPaused.value)
    }

    @Test
    fun `isSos es false al iniciar`() {
        assertFalse(viewModel.isSos.value)
    }

    @Test
    fun `elapsedTimeMillis es cero al iniciar`() {
        assertEquals(0L, viewModel.elapsedTimeMillis.value)
    }

    @Test
    fun `reachedWaypoints está vacío al iniciar`() {
        assertTrue(viewModel.reachedWaypoints.value.isEmpty())
    }

    @Test
    fun `teammatePositions está vacío al iniciar`() {
        assertTrue(viewModel.teammatePositions.value.isEmpty())
    }

    // ── togglePause sin carrera activa no cambia el estado ───────────────────

    @Test
    fun `togglePause sin carrera iniciada no activa pausa`() {
        viewModel.togglePause()
        assertFalse(viewModel.isPaused.value)
    }

    // ── loadTrail setea el trail ──────────────────────────────────────────────

    @Test
    fun `loadTrail con repositorio mockeado carga el trail`() = runTest {
        val trail = TrailEntity(trailUuid = "trail-1", name = "Sendero del Norte", maxSkip = 1)
        coEvery { mockRepository.getTrailById("trail-1") } returns trail

        viewModel.loadTrail("trail-1")
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals("trail-1", viewModel.trail.value?.trailUuid)
        assertEquals("Sendero del Norte", viewModel.trail.value?.name)
    }

    // ── onLocationUpdate detecta waypoints ───────────────────────────────────

    @Test
    fun `onLocationUpdate ignora actualización si la carrera no está iniciada`() {
        val location = Location("gps").apply {
            latitude = -34.6037; longitude = -58.3816; accuracy = 5f
        }
        viewModel.onLocationUpdate(location)
        assertTrue(viewModel.reachedWaypoints.value.isEmpty())
    }

    @Test
    fun `onLocationUpdate detecta waypoint dentro del radio al correr`() = runTest {
        val trailUuid = "trail-wp"
        val waypoint = WaypointEntity(
            waypointUuid = "wp-start",
            trailUuid = trailUuid,
            order = 0,
            name = "Largada",
            latitude = -34.6037,
            longitude = -58.3816,
            radiusInMeters = 100f
        )

        val trail = TrailEntity(trailUuid = trailUuid, name = "Trail WP", maxSkip = 0)
        coEvery { mockRepository.getTrailById(trailUuid) } returns trail
        every { mockRepository.getWaypointsForTrail(trailUuid) } returns flowOf(listOf(waypoint))

        viewModel.loadTrail(trailUuid)
        testDispatcher.scheduler.advanceUntilIdle()

        // Iniciamos la carrera
        viewModel.startRace()
        testDispatcher.scheduler.advanceUntilIdle()

        // Ubicación exactamente en el waypoint
        val location = Location("gps").apply {
            latitude = -34.6037; longitude = -58.3816; accuracy = 5f
        }
        viewModel.onLocationUpdate(location)

        assertEquals(setOf("wp-start"), viewModel.reachedWaypoints.value)
    }
}
