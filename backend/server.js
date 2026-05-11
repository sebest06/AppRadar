require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { createServer } = require('http')
const { Server } = require('socket.io')
const { v4: uuidv4 } = require('uuid')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const app = express()
const httpServer = createServer(app)

const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || 'appradar-dev-secret-change-in-production'
const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:4173']

// ─── Database ────────────────────────────────────────────────────────────────

const dataDir = path.join(__dirname, 'data')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir)

const db = new Database(path.join(dataDir, 'appradar.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    uuid TEXT PRIMARY KEY,
    user TEXT UNIQUE NOT NULL,
    passw TEXT NOT NULL,
    nombre TEXT NOT NULL,
    team TEXT NOT NULL DEFAULT '',
    uuid_team TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'runner'
  );

  CREATE TABLE IF NOT EXISTS trails (
    trailUuid TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    distanceKm REAL DEFAULT 0,
    elevationM REAL DEFAULT 0,
    maxSkip INTEGER DEFAULT 1,
    createdBy TEXT NOT NULL,
    isActive INTEGER DEFAULT 0,
    startDate TEXT
  );

  CREATE TABLE IF NOT EXISTS waypoints (
    waypointUuid TEXT PRIMARY KEY,
    trailUuid TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    name TEXT DEFAULT '',
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    radius REAL DEFAULT 50,
    FOREIGN KEY (trailUuid) REFERENCES trails(trailUuid) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS race_runs (
    runUuid TEXT PRIMARY KEY,
    trailUuid TEXT NOT NULL,
    userUuid TEXT NOT NULL,
    startTime INTEGER,
    endTime INTEGER,
    totalTime INTEGER DEFAULT 0,
    isCompleted INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS tracks (
    trackUuid TEXT PRIMARY KEY,
    runUuid TEXT NOT NULL,
    waypointUuid TEXT NOT NULL,
    trailUuid TEXT NOT NULL,
    userUuid TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS gps_positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userUuid TEXT NOT NULL,
    trailUuid TEXT NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    accuracy REAL,
    timestamp INTEGER NOT NULL
  );
`)

// Seed admin user if not exists
const adminExists = db.prepare('SELECT 1 FROM users WHERE user = ?').get('admin')
if (!adminExists) {
  const hash = bcrypt.hashSync('1234', 10)
  db.prepare(`
    INSERT INTO users (uuid, user, passw, nombre, team, uuid_team, role)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), 'admin', hash, 'Admin User', 'Team Alpha', uuidv4(), 'organizer')
  console.log('Admin seed: usuario=admin, contraseña=1234')
}

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({ origin: CORS_ORIGINS, credentials: true }))
app.use(express.json())

function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token requerido' })
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido' })
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Sin permiso' })
    }
    next()
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post('/auth/register', (req, res) => {
  const { user, passw, nombre, team, role } = req.body
  if (!user || !passw || !nombre) return res.status(400).json({ error: 'Faltan campos requeridos' })
  if (passw.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })

  const existing = db.prepare('SELECT 1 FROM users WHERE user = ?').get(user)
  if (existing) return res.status(409).json({ error: 'El usuario ya existe' })

  const uuid = uuidv4()
  const uuid_team = uuidv4()
  const hash = bcrypt.hashSync(passw, 10)
  const userRole = ['runner', 'organizer', 'spectator'].includes(role) ? role : 'runner'

  db.prepare(`
    INSERT INTO users (uuid, user, passw, nombre, team, uuid_team, role)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuid, user, hash, nombre, team || '', uuid_team, userRole)

  const newUser = { uuid, user, nombre, team: team || '', uuid_team, role: userRole }
  const token = jwt.sign({ uuid, user, role: userRole }, JWT_SECRET, { expiresIn: '7d' })
  res.status(201).json({ token, user: newUser })
})

app.post('/auth/login', (req, res) => {
  const { user, passw } = req.body
  const found = db.prepare('SELECT * FROM users WHERE user = ?').get(user)
  if (!found || !bcrypt.compareSync(passw, found.passw)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' })
  }
  const { passw: _p, ...safeUser } = found
  const token = jwt.sign({ uuid: found.uuid, user: found.user, role: found.role }, JWT_SECRET, {
    expiresIn: '7d',
  })
  res.json({ token, user: safeUser })
})

// ─── Trails ───────────────────────────────────────────────────────────────────

app.get('/trails', (req, res) => {
  const trails = db.prepare('SELECT * FROM trails ORDER BY rowid DESC').all()
  res.json(trails.map(t => ({ ...t, isActive: !!t.isActive })))
})

app.get('/trails/:trailId/details', (req, res) => {
  const trail = db.prepare('SELECT * FROM trails WHERE trailUuid = ?').get(req.params.trailId)
  if (!trail) return res.status(404).json({ error: 'Carrera no encontrada' })
  const waypoints = db
    .prepare('SELECT * FROM waypoints WHERE trailUuid = ? ORDER BY "order"')
    .all(req.params.trailId)
  res.json({ ...trail, isActive: !!trail.isActive, waypoints })
})

app.post('/trails', authMiddleware, requireRole('organizer'), (req, res) => {
  const { name, description, distanceKm, elevationM, maxSkip, waypoints } = req.body
  if (!name) return res.status(400).json({ error: 'El nombre es requerido' })
  if (!waypoints?.length) return res.status(400).json({ error: 'Se requieren waypoints' })

  const trailUuid = uuidv4()
  db.prepare(`
    INSERT INTO trails (trailUuid, name, description, distanceKm, elevationM, maxSkip, createdBy)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(trailUuid, name, description || '', distanceKm || 0, elevationM || 0, maxSkip ?? 1, req.user.uuid)

  const insertWp = db.prepare(`
    INSERT INTO waypoints (waypointUuid, trailUuid, "order", name, lat, lon, radius)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  for (const wp of waypoints) {
    insertWp.run(uuidv4(), trailUuid, wp.order, wp.name || '', wp.lat, wp.lon, wp.radius || 50)
  }

  const trail = db.prepare('SELECT * FROM trails WHERE trailUuid = ?').get(trailUuid)
  res.status(201).json({ ...trail, isActive: false })
})

app.put('/trails/:trailId', authMiddleware, requireRole('organizer'), (req, res) => {
  const trail = db.prepare('SELECT * FROM trails WHERE trailUuid = ?').get(req.params.trailId)
  if (!trail) return res.status(404).json({ error: 'Carrera no encontrada' })
  if (trail.createdBy !== req.user.uuid) return res.status(403).json({ error: 'Sin permiso' })

  const { name, description, distanceKm, elevationM, maxSkip } = req.body
  db.prepare(`
    UPDATE trails SET name=?, description=?, distanceKm=?, elevationM=?, maxSkip=?
    WHERE trailUuid=?
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

app.delete('/trails/:trailId', authMiddleware, requireRole('organizer'), (req, res) => {
  const trail = db.prepare('SELECT * FROM trails WHERE trailUuid = ?').get(req.params.trailId)
  if (!trail) return res.status(404).json({ error: 'Carrera no encontrada' })
  if (trail.createdBy !== req.user.uuid) return res.status(403).json({ error: 'Sin permiso' })
  db.prepare('DELETE FROM trails WHERE trailUuid = ?').run(req.params.trailId)
  res.status(204).end()
})

app.post('/trails/:trailId/activate', authMiddleware, requireRole('organizer'), (req, res) => {
  db.prepare('UPDATE trails SET isActive = 1 WHERE trailUuid = ?').run(req.params.trailId)
  res.json({ ok: true })
})

// ─── Race Runs & Tracks ───────────────────────────────────────────────────────

app.post('/runs/upload', authMiddleware, (req, res) => {
  const run = req.body
  const existing = db.prepare('SELECT 1 FROM race_runs WHERE runUuid = ?').get(run.runUuid)
  if (!existing) {
    db.prepare(`
      INSERT INTO race_runs (runUuid, trailUuid, userUuid, startTime, endTime, totalTime, isCompleted)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(run.runUuid, run.trailUuid, run.userUuid, run.startTime, run.endTime, run.totalTime, run.isCompleted ? 1 : 0)
  }
  res.status(200).json({ ok: true })
})

app.post('/tracks/upload', authMiddleware, (req, res) => {
  const tracks = Array.isArray(req.body) ? req.body : [req.body]
  const insert = db.prepare(`
    INSERT OR IGNORE INTO tracks (trackUuid, runUuid, waypointUuid, trailUuid, userUuid, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const insertMany = db.transaction((items) => {
    for (const t of items) {
      insert.run(t.trackUuid, t.runUuid, t.waypointUuid, t.trailUuid, t.userUuid || req.user.uuid, t.timestamp)
    }
  })
  insertMany(tracks)
  res.status(200).json({ ok: true })
})

// ─── Rankings ─────────────────────────────────────────────────────────────────

app.get('/rankings', (req, res) => {
  const { trailUuid } = req.query
  if (!trailUuid) return res.status(400).json({ error: 'trailUuid requerido' })

  const totalWaypoints = db
    .prepare('SELECT COUNT(*) as c FROM waypoints WHERE trailUuid = ?')
    .get(trailUuid).c

  const runs = db.prepare('SELECT * FROM race_runs WHERE trailUuid = ?').all(trailUuid)

  const rankings = runs.map((run) => {
    const user = db.prepare('SELECT nombre, team FROM users WHERE uuid = ?').get(run.userUuid)
    const reached = db
      .prepare('SELECT COUNT(*) as c FROM tracks WHERE runUuid = ? AND trailUuid = ?')
      .get(run.runUuid, trailUuid).c
    const lastTrack = db
      .prepare('SELECT MAX(timestamp) as t FROM tracks WHERE runUuid = ? AND trailUuid = ?')
      .get(run.runUuid, trailUuid)

    return {
      userUuid: run.userUuid,
      userName: user?.nombre ?? 'Desconocido',
      teamName: user?.team ?? '',
      waypointsReached: reached,
      totalWaypoints,
      lastWaypointTime: lastTrack?.t ?? 0,
      totalTime: run.totalTime,
      isCompleted: !!run.isCompleted,
    }
  })

  rankings.sort((a, b) => {
    if (b.waypointsReached !== a.waypointsReached) return b.waypointsReached - a.waypointsReached
    return a.lastWaypointTime - b.lastWaypointTime
  })

  res.json(rankings)
})

// ─── Socket.IO ────────────────────────────────────────────────────────────────

const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGINS, credentials: true },
})

io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error('Token requerido'))
  try {
    socket.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    next(new Error('Token inválido'))
  }
})

io.on('connection', (socket) => {
  console.log(`WS connect: ${socket.user?.user}`)

  socket.on('join_race', ({ trailUuid }) => {
    socket.join(`race:${trailUuid}`)
  })

  socket.on('leave_race', ({ trailUuid }) => {
    socket.leave(`race:${trailUuid}`)
  })

  socket.on('position_update', ({ trailUuid, lat, lon, accuracy }) => {
    if (!trailUuid || lat == null || lon == null) return

    const user = db.prepare('SELECT nombre, team FROM users WHERE uuid = ?').get(socket.user.uuid)
    const timestamp = Date.now()

    db.prepare(`
      INSERT INTO gps_positions (userUuid, trailUuid, lat, lon, accuracy, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(socket.user.uuid, trailUuid, lat, lon, accuracy ?? null, timestamp)

    io.to(`race:${trailUuid}`).emit('position_broadcast', {
      userUuid: socket.user.uuid,
      userName: user?.nombre ?? socket.user.user,
      teamName: user?.team ?? '',
      lat,
      lon,
      accuracy,
      timestamp,
    })
  })

  socket.on('disconnect', () => {
    console.log(`WS disconnect: ${socket.user?.user}`)
  })
})

// ─── Start ────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`AppRadar backend en http://localhost:${PORT}`)
})
