package com.appradar.ui.viewmodel

import android.content.Context
import android.location.Location
import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import com.appradar.data.local.entity.TrailEntity
import com.appradar.data.local.entity.WaypointEntity
import com.appradar.data.repository.RadarRepository
import com.appradar.util.LocationHelper
import com.appradar.util.UserPreferences
import io.mockk.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

// Sin Robolectric: Context y Location se mockean con MockK.
// Esto evita cargar el SDK de Android entero y elimina el OOM.
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class ActiveTrailViewModelTest {

    @get:Rule
    val instantTaskRule = InstantTaskExecutorRule()

    private val testDispatcher = UnconfinedTestDispatcher()

    private val mockContext: Context = mockk(relaxed = true)
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

        viewModel = ActiveTrailViewModel(mockContext, mockRepository, mockPrefs)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        unmockkObject(LocationHelper)
    }

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
    fun `reachedWaypoints esta vacio al iniciar`() {
        assertTrue(viewModel.reachedWaypoints.value.isEmpty())
    }

    @Test
    fun `teammatePositions esta vacio al iniciar`() {
        assertTrue(viewModel.teammatePositions.value.isEmpty())
    }

    @Test
    fun `togglePause sin carrera iniciada no activa pausa`() {
        viewModel.togglePause()
        assertFalse(viewModel.isPaused.value)
    }

    @Test
    fun `loadTrail con repositorio mockeado carga el trail`() = runTest {
        val trail = TrailEntity(trailUuid = "trail-1", name = "Sendero del Norte", maxSkip = 1)
        coEvery { mockRepository.getTrailById("trail-1") } returns trail

        viewModel.loadTrail("trail-1")

        assertEquals("trail-1", viewModel.trail.value?.trailUuid)
        assertEquals("Sendero del Norte", viewModel.trail.value?.name)
    }

    @Test
    fun `onLocationUpdate ignora actualizacion si la carrera no esta iniciada`() {
        val mockLocation = mockk<Location>(relaxed = true)
        viewModel.onLocationUpdate(mockLocation)
        assertTrue(viewModel.reachedWaypoints.value.isEmpty())
    }
}
