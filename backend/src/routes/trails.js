const express = require('express')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const { authMiddleware, requireRole, JWT_SECRET } = require('../middleware/auth')
const { DEFAULT_RADIUS } = require('../constants')

function createTrailsRouter(db) {
  const router = express.Router()

  router.get('/trails', (req, res) => {
    const user = tryDecodeToken(req)
    const trails = queryTrailsForUser(db, user)
    res.json(trails.map(t => ({ ...t, isActive: !!t.isActive })))
  })

  router.get('/trails/:trailId/details', (req, res) => {
    const trail = db.prepare('SELECT * FROM trails WHERE trailUuid = ?').get(req.params.trailId)
    if (!trail) return res.status(404).json({ error: 'Carrera no encontrada' })
    const waypoints = db.prepare('SELECT * FROM waypoints WHERE trailUuid = ? ORDER BY "order"').all(req.params.trailId)
    res.json({ ...trail, isActive: !!trail.isActive, waypoints })
  })

  router.post('/trails', authMiddleware, requireRole('organizer', 'superuser'), (req, res) => {
    const { name, description, distanceKm, elevationM, maxSkip, waypoints } = req.body
    if (!name) return res.status(400).json({ error: 'El nombre es requerido' })
    if (!waypoints?.length) return res.status(400).json({ error: 'Se requieren waypoints' })

    const trailUuid = uuidv4()
    const teamUuid = req.user.role === 'superuser' ? null : req.user.uuid_team

    db.prepare(`
      INSERT INTO trails (trailUuid, name, description, distanceKm, elevationM, maxSkip, createdBy, teamUuid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(trailUuid, name, description || '', distanceKm || 0, elevationM || 0, maxSkip ?? 1, req.user.uuid, teamUuid)

    insertWaypoints(db, trailUuid, waypoints)

    const trail = db.prepare('SELECT * FROM trails WHERE trailUuid = ?').get(trailUuid)
    res.status(201).json({ ...trail, isActive: false })
  })

  router.put('/trails/:trailId', authMiddleware, requireRole('organizer', 'superuser'), (req, res) => {
    const trail = db.prepare('SELECT * FROM trails WHERE trailUuid = ?').get(req.params.trailId)
    if (!trail) return res.status(404).json({ error: 'Carrera no encontrada' })
    if (!canModifyTrail(req.user, trail)) return res.status(403).json({ error: 'Sin permiso' })

    const { name, description, distanceKm, elevationM, maxSkip } = req.body
    db.prepare(`
      UPDATE trails SET name=?, description=?, distanceKm=?, elevationM=?, maxSkip=? WHERE trailUuid=?
    `).run(
      name ?? trail.name,
      description ?? trail.description,
      distanceKm ?? trail.distanceKm,
      elevationM ?? trail.elevationM,
      maxSkip ?? trail.maxSkip,
      req.params.trailId
    )
    const updated = db.prepare('SELECT * FROM trails WHERE trailUuid = ?').get(req.params.trailId)
    res.json({ ...updated, isActive: !!updated.isActive })
  })

  router.delete('/trails/:trailId', authMiddleware, requireRole('organizer', 'superuser'), (req, res) => {
    const trail = db.prepare('SELECT * FROM trails WHERE trailUuid = ?').get(req.params.trailId)
    if (!trail) return res.status(404).json({ error: 'Carrera no encontrada' })
    if (!canModifyTrail(req.user, trail)) return res.status(403).json({ error: 'Sin permiso' })
    db.prepare('DELETE FROM trails WHERE trailUuid = ?').run(req.params.trailId)
    res.status(204).end()
  })

  router.post('/trails/:trailId/activate', authMiddleware, requireRole('organizer', 'superuser'), (req, res) => {
    const trail = db.prepare('SELECT * FROM trails WHERE trailUuid = ?').get(req.params.trailId)
    if (!trail) return res.status(404).json({ error: 'Carrera no encontrada' })
    if (!canModifyTrail(req.user, trail)) return res.status(403).json({ error: 'Sin permiso' })
    db.prepare('UPDATE trails SET isActive = 1 WHERE trailUuid = ?').run(req.params.trailId)
    res.json({ ok: true })
  })

  return router
}

function tryDecodeToken(req) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  try { return jwt.verify(header.slice(7), JWT_SECRET) } catch { return null }
}

function queryTrailsForUser(db, user) {
  if (!user) return db.prepare('SELECT * FROM trails WHERE teamUuid IS NULL ORDER BY rowid DESC').all()
  if (user.role === 'superuser') return db.prepare('SELECT * FROM trails ORDER BY rowid DESC').all()
  if (user.role === 'organizer' || user.teamStatus === 'accepted') {
    return db.prepare('SELECT * FROM trails WHERE teamUuid IS NULL OR teamUuid = ? ORDER BY rowid DESC').all(user.uuid_team)
  }
  return db.prepare('SELECT * FROM trails WHERE teamUuid IS NULL ORDER BY rowid DESC').all()
}

function insertWaypoints(db, trailUuid, waypoints) {
  const insert = db.prepare(`
    INSERT INTO waypoints (waypointUuid, trailUuid, "order", name, lat, lon, radius)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  for (const wp of waypoints) {
    insert.run(uuidv4(), trailUuid, wp.order, wp.name || '', wp.lat, wp.lon, wp.radius || DEFAULT_RADIUS)
  }
}

function canModifyTrail(user, trail) {
  return user.role === 'superuser' || trail.createdBy === user.uuid
}

module.exports = createTrailsRouter
