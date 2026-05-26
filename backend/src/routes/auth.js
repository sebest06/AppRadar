const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const { JWT_SECRET } = require('../middleware/auth')

function createAuthRouter(db) {
  const router = express.Router()

  router.post('/register', (req, res) => {
    const { user, passw, nombre, team, role, activityType, uuid_team: inputTeamUuid } = req.body

    if (!user || !passw || !nombre) return res.status(400).json({ error: 'Faltan campos requeridos' })
    if (passw.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })

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
    const token = jwt.sign({ uuid, user, role: userRole, uuid_team: finalTeamUuid, teamStatus }, JWT_SECRET, { expiresIn: '7d' })
    res.status(201).json({ token, user: newUser })
  })

  router.post('/login', (req, res) => {
    const { user, passw } = req.body
    const found = db.prepare('SELECT * FROM users WHERE user = ?').get(user)
    if (!found || !bcrypt.compareSync(passw, found.passw)) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }
    const { passw: _p, ...safeUser } = found
    const token = jwt.sign(
      { uuid: found.uuid, user: found.user, role: found.role, uuid_team: found.uuid_team, teamStatus: found.teamStatus },
      JWT_SECRET,
      { expiresIn: '7d' }
    )
    res.json({ token, user: safeUser })
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
