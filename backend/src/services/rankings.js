function latestSession(db, trailUuid) {
  const row = db.prepare(`
    SELECT sessionUuid FROM race_runs
    WHERE trailUuid = ? AND sessionUuid IS NOT NULL
    GROUP BY sessionUuid ORDER BY MAX(startTime) DESC LIMIT 1
  `).get(trailUuid)
  return row?.sessionUuid ?? null
}

function computeRankings(db, trailUuid, teamUuid, sessionUuid = null) {
  const runs = queryRuns(db, trailUuid, teamUuid, sessionUuid)
  const totalWaypoints = db.prepare('SELECT COUNT(*) as c FROM waypoints WHERE trailUuid = ?').get(trailUuid)?.c ?? 0

  const rankings = runs.map(run => buildRankEntry(db, run, trailUuid, totalWaypoints))

  rankings.sort((a, b) => {
    if (b.waypointsReached !== a.waypointsReached) return b.waypointsReached - a.waypointsReached
    return a.lastWaypointTime - b.lastWaypointTime
  })

  return rankings
}

function queryRuns(db, trailUuid, teamUuid, sessionUuid) {
  if (sessionUuid && teamUuid) {
    return db.prepare(`
      SELECT rr.* FROM race_runs rr JOIN users u ON rr.userUuid = u.uuid
      WHERE rr.trailUuid = ? AND rr.sessionUuid = ? AND u.uuid_team = ?
    `).all(trailUuid, sessionUuid, teamUuid)
  }
  if (sessionUuid) {
    return db.prepare('SELECT * FROM race_runs WHERE trailUuid = ? AND sessionUuid = ?').all(trailUuid, sessionUuid)
  }
  if (teamUuid) {
    return db.prepare(`
      SELECT rr.* FROM race_runs rr JOIN users u ON rr.userUuid = u.uuid
      WHERE rr.trailUuid = ? AND u.uuid_team = ?
    `).all(trailUuid, teamUuid)
  }
  return db.prepare('SELECT * FROM race_runs WHERE trailUuid = ?').all(trailUuid)
}

function buildRankEntry(db, run, trailUuid, totalWaypoints) {
  const user = db.prepare('SELECT nombre, team, activityType FROM users WHERE uuid = ?').get(run.userUuid)
  const reached = db.prepare('SELECT COUNT(DISTINCT waypointUuid) as c FROM tracks WHERE runUuid = ? AND trailUuid = ?').get(run.runUuid, trailUuid).c
  const lastTrack = db.prepare('SELECT MAX(timestamp) as t FROM tracks WHERE runUuid = ? AND trailUuid = ?').get(run.runUuid, trailUuid)
  const nextWaypoint = db.prepare(`
    SELECT name, "order" FROM waypoints
    WHERE trailUuid = ? AND "order" > (
      SELECT COALESCE(MAX(w."order"), -1)
      FROM tracks t JOIN waypoints w ON t.waypointUuid = w.waypointUuid
      WHERE t.runUuid = ?
    )
    ORDER BY "order" ASC LIMIT 1
  `).get(trailUuid, run.runUuid)

  const waypointTracks = db.prepare(
    'SELECT waypointUuid, MIN(timestamp) as timestamp FROM tracks WHERE runUuid = ? AND trailUuid = ? GROUP BY waypointUuid ORDER BY timestamp ASC'
  ).all(run.runUuid, trailUuid)

  const waypointTimes = waypointTracks.map(t => ({
    waypointUuid: t.waypointUuid,
    timestamp: t.timestamp,
    timeFromStart: t.timestamp - run.startTime
  }))

  return {
    userUuid: run.userUuid,
    userName: user?.nombre ?? 'Desconocido',
    teamName: user?.team ?? '',
    waypointsReached: reached,
    totalWaypoints,
    lastWaypointTime: lastTrack?.t ?? 0,
    totalTime: run.totalTime,
    isCompleted: run.isCompleted === 1,
    isAbandoned: run.isAbandoned === 1,
    sos: run.sos === 1,
    activityType: user?.activityType || 'runner',
    waypointTimes,
    nextWaypoint: nextWaypoint
      ? (nextWaypoint.name || `WP ${nextWaypoint.order}`)
      : (run.isCompleted ? 'Finalizado' : '---')
  }
}

module.exports = { computeRankings, latestSession }
