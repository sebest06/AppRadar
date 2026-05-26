const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { authMiddleware } = require('../middleware/auth')
const { computeRankings, latestSession } = require('../services/rankings')
const { broadcast } = require('../services/realtime')
const { COOLDOWN_MS, SESSION_WINDOW_MS, ONLINE_WINDOW_MS } = require('../constants')

function createRacesRouter(db) {
  const router = express.Router()

  router.post('/runs/upload', authMiddleware, (req, res) => {
    const run = req.body
    const existing = db.prepare('SELECT sessionUuid, startTime, isCompleted, isAbandoned, sos FROM race_runs WHERE runUuid = ?').get(run.runUuid)
    const sessionUuid = existing?.sessionUuid || findOrCreateSession(db, run.trailUuid, run.startTime)

    if (!existing) {
      const cooldownError = checkCooldown(db, run)
      if (cooldownError) return res.status(403).json(cooldownError)
      insertRun(db, run, sessionUuid)
    } else {
      updateRun(db, run, sessionUuid, existing)
    }

    res.status(200).json({ ok: true, sessionUuid })

    const rankings = computeRankings(db, run.trailUuid, null, sessionUuid)
    broadcast(`race:${run.trailUuid}`, 'race_update', rankings)
    emitRaceEventIfChanged(db, run, existing)
  })

  router.post('/tracks/upload', authMiddleware, (req, res) => {
    const tracks = Array.isArray(req.body) ? req.body : [req.body]
    insertTracks(db, tracks, req.user.uuid)
    res.status(200).json({ ok: true })
    broadcastTrackUpdates(db, tracks)
  })

  router.get('/rankings', (req, res) => {
    const { trailUuid, teamUuid, sessionUuid: reqSession, categoryUuid } = req.query
    if (!trailUuid) return res.status(400).json({ error: 'trailUuid requerido' })

    const sessionUuid = reqSession || latestSession(db, trailUuid)
    let rankings = computeRankings(db, trailUuid, teamUuid || null, sessionUuid)

    if (categoryUuid) {
      const usersInCategory = db.prepare('SELECT userUuid FROM users_categories WHERE categoryUuid = ?')
        .all(categoryUuid).map(u => u.userUuid)
      rankings = rankings.filter(r => usersInCategory.includes(r.userUuid))
    }

    res.json(rankings)
  })

  router.get('/races/sessions', (req, res) => {
    const { trailUuid } = req.query
    if (!trailUuid) return res.status(400).json({ error: 'trailUuid requerido' })
    const sessions = db.prepare(`
      SELECT sessionUuid, MIN(startTime) as startTime, COUNT(*) as runnerCount
      FROM race_runs WHERE trailUuid = ? AND sessionUuid IS NOT NULL
      GROUP BY sessionUuid ORDER BY startTime DESC
    `).all(trailUuid)
    res.json(sessions)
  })

  router.get('/races/live', (req, res) => {
    const { trailUuid, sessionUuid: reqSession } = req.query
    if (!trailUuid) return res.status(400).json({ error: 'trailUuid requerido' })

    const sessionUuid = reqSession || latestSession(db, trailUuid)
    if (!sessionUuid) return res.json([])

    const runs = db.prepare('SELECT * FROM race_runs WHERE trailUuid = ? AND sessionUuid = ?').all(trailUuid, sessionUuid)
    const positions = runs.map(run => resolvePosition(db, run, trailUuid)).filter(Boolean)
    res.json(positions)
  })

  router.get('/races/:trailId/events', (req, res) => {
    const { sessionUuid } = req.query
    const base = `
      SELECT r.runUuid, r.userUuid, r.endTime, r.startTime, r.isCompleted, r.isAbandoned, r.sos,
             u.nombre as userName, u.team as teamName
      FROM race_runs r JOIN users u ON u.uuid = r.userUuid
      WHERE r.trailUuid = ? AND (r.isCompleted = 1 OR r.isAbandoned = 1 OR r.sos = 1)
    `
    const rows = sessionUuid
      ? db.prepare(base + ' AND r.sessionUuid = ? ORDER BY COALESCE(r.endTime, r.startTime, 0) DESC').all(req.params.trailId, sessionUuid)
      : db.prepare(base + ' ORDER BY COALESCE(r.endTime, r.startTime, 0) DESC').all(req.params.trailId)

    res.json(rows.map(e => ({
      ...e,
      type: e.sos ? 'sos' : e.isCompleted ? 'completed' : 'abandoned',
    })))
  })

  router.delete('/races/sessions/:sessionUuid', authMiddleware, (req, res) => {
    const { sessionUuid } = req.params
    const session = db.prepare('SELECT trailUuid FROM race_runs WHERE sessionUuid = ? LIMIT 1').get(sessionUuid)
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada' })

    const runUuids = db.prepare('SELECT runUuid FROM race_runs WHERE sessionUuid = ?').all(sessionUuid).map(r => r.runUuid)

    db.transaction(() => {
      for (const runUuid of runUuids) {
        db.prepare('DELETE FROM tracks WHERE runUuid = ?').run(runUuid)
      }
      db.prepare('DELETE FROM race_runs WHERE sessionUuid = ?').run(sessionUuid)
    })()

    res.json({ ok: true })
  })

  router.get('/races/:trailId/route-history/:userUuid', (req, res) => {
    const { trailId, userUuid } = req.params
    const history = db.prepare(`
      SELECT lat, lon, timestamp FROM gps_positions
      WHERE trailUuid = ? AND userUuid = ? ORDER BY timestamp ASC
    `).all(trailId, userUuid)
    res.json(history)
  })

  return router
}

function findOrCreateSession(db, trailUuid, startTime) {
  const ts = startTime || Date.now()
  // Use SESSION_WINDOW_MS (always 1h) so runners starting within the same race
  // are grouped together regardless of the per-user cooldown setting.
  const row = db.prepare(`
    SELECT sessionUuid, MIN(startTime) as sessionStart
    FROM race_runs
    WHERE trailUuid = ? AND sessionUuid IS NOT NULL
    GROUP BY sessionUuid
    HAVING sessionStart >= ? AND sessionStart <= ?
    ORDER BY sessionStart DESC LIMIT 1
  `).get(trailUuid, ts - SESSION_WINDOW_MS, ts + SESSION_WINDOW_MS)
  return row?.sessionUuid ?? uuidv4()
}

function checkCooldown(db, run) {
  const lastRun = db.prepare(`
    SELECT startTime FROM race_runs WHERE trailUuid = ? AND userUuid = ? ORDER BY startTime DESC LIMIT 1
  `).get(run.trailUuid, run.userUuid)

  if (!lastRun) return null

  const diff = (run.startTime || Date.now()) - lastRun.startTime
  if (diff >= COOLDOWN_MS) return null

  const remaining = Math.ceil((COOLDOWN_MS - diff) / 60000)
  return { error: `Debes esperar ${remaining} minutos para iniciar una nueva carrera en esta ruta.`, remainingMinutes: remaining }
}

function insertRun(db, run, sessionUuid) {
  db.prepare(`
    INSERT INTO race_runs (runUuid, trailUuid, userUuid, startTime, endTime, totalTime, isCompleted, isAbandoned, sessionUuid, sos)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    run.runUuid, run.trailUuid, run.userUuid, run.startTime, run.endTime,
    run.totalTime, run.isCompleted ? 1 : 0, run.isAbandoned ? 1 : 0, sessionUuid, run.sos ? 1 : 0
  )
}

function updateRun(db, run, sessionUuid, existing) {
  db.prepare(`
    UPDATE race_runs SET sessionUuid=?, isCompleted=?, isAbandoned=?, startTime=?, endTime=?, totalTime=?, sos=?
    WHERE runUuid=?
  `).run(
    sessionUuid, run.isCompleted ? 1 : 0, run.isAbandoned ? 1 : 0,
    run.startTime || existing.startTime, run.endTime, run.totalTime, run.sos ? 1 : 0, run.runUuid
  )
}

function emitRaceEventIfChanged(db, run, existing) {
  if (!run.isCompleted && !run.isAbandoned && !run.sos) return
  if (existing) {
    const unchanged =
      !!existing.isCompleted === !!run.isCompleted &&
      !!existing.isAbandoned === !!run.isAbandoned &&
      !!existing.sos === !!run.sos
    if (unchanged) return
  }
  const user = db.prepare('SELECT nombre FROM users WHERE uuid = ?').get(run.userUuid)
  broadcast(`race:${run.trailUuid}`, 'race_event', {
    type: run.sos ? 'sos' : (run.isCompleted ? 'completed' : 'abandoned'),
    userName: user?.nombre || 'Corredor',
    trailUuid: run.trailUuid,
  })
}

function insertTracks(db, tracks, defaultUserUuid) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO tracks (trackUuid, runUuid, waypointUuid, trailUuid, userUuid, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  db.transaction((items) => {
    for (const t of items) {
      insert.run(t.trackUuid, t.runUuid, t.waypointUuid, t.trailUuid, t.userUuid || defaultUserUuid, t.timestamp)
    }
  })(tracks)
}

function broadcastTrackUpdates(db, tracks) {
  const affectedTrails = [...new Set(tracks.map(t => t.trailUuid).filter(Boolean))]
  for (const trailUuid of affectedTrails) {
    const firstTrack = tracks.find(t => t.trailUuid === trailUuid)
    const sessionRow = firstTrack
      ? db.prepare('SELECT sessionUuid FROM race_runs WHERE runUuid = ?').get(firstTrack.runUuid)
      : null
    const rankings = computeRankings(db, trailUuid, null, sessionRow?.sessionUuid ?? null)
    broadcast(`race:${trailUuid}`, 'race_update', rankings)

    // Also broadcast an updated position for each runner who just hit a waypoint
    // so the map reflects the new position immediately (without waiting for the GPS poll)
    const affectedRunUuids = [...new Set(tracks.filter(t => t.trailUuid === trailUuid).map(t => t.runUuid))]
    for (const runUuid of affectedRunUuids) {
      const run = db.prepare('SELECT * FROM race_runs WHERE runUuid = ?').get(runUuid)
      if (!run) continue
      const pos = resolvePosition(db, run, trailUuid)
      if (!pos) continue
      broadcast(`race:${trailUuid}`, 'position_broadcast', pos)
    }
  }
}

function resolvePosition(db, run, trailUuid) {
  const user = db.prepare('SELECT nombre, team, activityType FROM users WHERE uuid = ?').get(run.userUuid)

  const gps = db.prepare(`
    SELECT lat, lon, timestamp FROM gps_positions
    WHERE userUuid = ? AND trailUuid = ? ORDER BY timestamp DESC LIMIT 1
  `).get(run.userUuid, trailUuid)

  const lastWp = db.prepare(`
    SELECT w.lat, w.lon, t.timestamp
    FROM tracks t JOIN waypoints w ON w.waypointUuid = t.waypointUuid
    WHERE t.runUuid = ? AND t.trailUuid = ? ORDER BY t.timestamp DESC LIMIT 1
  `).get(run.runUuid, trailUuid)

  const now = Date.now()
  const gpsTs = gps?.timestamp ?? 0
  const wpTs = lastWp?.timestamp ?? 0

  // Use whichever data is more recent: GPS position or last waypoint reached.
  // This ensures that when a runner passes a waypoint after their last GPS update,
  // the map shows them AT the waypoint rather than at the previous GPS position.
  if (wpTs > gpsTs) {
    const isOnline = (now - wpTs) <= ONLINE_WINDOW_MS
    return buildPosition(run, user, lastWp, isOnline)
  }

  if (gps) {
    const isOnline = (now - gpsTs) <= ONLINE_WINDOW_MS
    return buildPosition(run, user, gps, isOnline)
  }

  return null
}

function buildPosition(run, user, location, isOnline) {
  return {
    userUuid: run.userUuid,
    userName: user?.nombre ?? 'Desconocido',
    teamName: user?.team ?? '',
    activityType: user?.activityType || 'runner',
    sos: run.sos === 1,
    lat: location.lat,
    lon: location.lon,
    timestamp: location.timestamp,
    isOnline
  }
}

module.exports = createRacesRouter
