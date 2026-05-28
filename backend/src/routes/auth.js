const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const { z } = require('zod')
const { JWT_SECRET } = require('../middleware/auth')
const { validate } = require('../middleware/validate')

const REFRESH_SECRET = JWT_SECRET + '_refresh'

function makeTokens(payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' })
  const refreshToken = jwt.sign({ uuid: payload.uuid, type: 'refresh' }, REFRESH_SECRET, { expiresIn: '30d' })
  return { token, refreshToken }
}

const registerSchema = z.object({
  user: z.string().min(3, 'El usuario debe tener al menos 3 caracteres').max(50),
  passw: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre: z.string().min(1, 'El nombre es requerido').max(100),
  team: z.string().max(100).optional(),
  role: z.enum(['runner', 'organizer', 'spectator']).optional(),
  activityType: z.enum(['runner', 'bike', 'car']).optional(),
  uuid_team: z.string().uuid('uuid_team inválido').optional(),
})

const loginSchema = z.object({
  user: z.string().min(1, 'Usuario requerido'),
  passw: z.string().min(1, 'Contraseña requerida'),
})

function createAuthRouter(db) {
  const router = express.Router()

  router.post('/register', validate(registerSchema), (req, res) => {
    const { user, passw, nombre, team, role, activityType, uuid_team: inputTeamUuid } = req.body

    const existing = db.prepare('SELECT 1 FROM users WHERE user = ?').get(user)
    if (existing) return res.status(409).json({ error: 'El usuario ya existe' })

    const uuid = uuidv4()
    const hash = bcrypt.hashSync(passw, 10)
    const userRole = ['runner', 'organizer', 'spectator'].includes(role) ? role : 'runner'
    const finalActivityType = ['runner', 'bike', 'car'].includes(activityType) ? activityType : 'runner'

    const { finalTeamUuid, finalTeamName, teamStatus } = resolveTeam(db, userRole, inputTeamUuid, team)
    if (finalTeamUuid === null) {
      return res.status(400).json({ error: 'Debes seleccionar un equipo' })
    }
    if (finalTeamUuid === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Equipo no encontrado' })
    }

    db.prepare(`
      INSERT INTO users (uuid, user, passw, nombre, team, uuid_team, role, activityType, teamStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuid, user, hash, nombre, finalTeamName, finalTeamUuid, userRole, finalActivityType, teamStatus)

    const newUser = { uuid, user, nombre, team: finalTeamName, uuid_team: finalTeamUuid, role: userRole, activityType: finalActivityType, teamStatus }
    const { token, refreshToken } = makeTokens({ uuid, user, role: userRole, uuid_team: finalTeamUuid, teamStatus })
    res.status(201).json({ token, refreshToken, user: newUser })
  })

  router.post('/login', validate(loginSchema), (req, res) => {
    const { user, passw } = req.body
    const found = db.prepare('SELECT * FROM users WHERE user = ?').get(user)
    if (!found || !bcrypt.compareSync(passw, found.passw)) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }
    const { passw: _p, ...safeUser } = found
    const { token, refreshToken } = makeTokens({ uuid: found.uuid, user: found.user, role: found.role, uuid_team: found.uuid_team, teamStatus: found.teamStatus })
    res.json({ token, refreshToken, user: safeUser })
  })

  router.post('/auth/refresh', (req, res) => {
    const { refreshToken } = req.body
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken requerido' })
    try {
      const payload = jwt.verify(refreshToken, REFRESH_SECRET)
      if (payload.type !== 'refresh') return res.status(401).json({ error: 'Token inválido' })
      const found = db.prepare('SELECT * FROM users WHERE uuid = ?').get(payload.uuid)
      if (!found) return res.status(401).json({ error: 'Usuario no encontrado' })
      const { token, refreshToken: newRefreshToken } = makeTokens({
        uuid: found.uuid, user: found.user, role: found.role, uuid_team: found.uuid_team, teamStatus: found.teamStatus
      })
      res.json({ token, refreshToken: newRefreshToken })
    } catch {
      res.status(401).json({ error: 'Token inválido o expirado' })
    }
  })

  return router
}

function resolveTeam(db, userRole, inputTeamUuid, teamName) {
  if (userRole !== 'runner') {
    return { finalTeamUuid: uuidv4(), finalTeamName: teamName || '', teamStatus: 'accepted' }
  }
  if (!inputTeamUuid) {
    return { finalTeamUuid: null, finalTeamName: '', teamStatus: '' }
  }
  const org = db.prepare(`SELECT team FROM users WHERE uuid_team = ? AND role = 'organizer' LIMIT 1`).get(inputTeamUuid)
  if (!org) {
    return { finalTeamUuid: 'NOT_FOUND', finalTeamName: '', teamStatus: '' }
  }
  return { finalTeamUuid: inputTeamUuid, finalTeamName: org.team, teamStatus: 'pending' }
}

module.exports = createAuthRouter
