const express = require('express')
const { authMiddleware } = require('../middleware/auth')
const { broadcast } = require('../services/realtime')

function createGpsRouter(db) {
  const router = express.Router()

  router.post('/gps/upload', authMiddleware, (req, res) => {
    const { trailUuid, lat, lon, accuracy, timestamp, activityType } = req.body
    if (!trailUuid || lat == null || lon == null) return res.status(400).json({ error: 'Faltan datos' })

    const ts = timestamp || Date.now()

    if (activityType) {
      db.prepare('UPDATE users SET activityType = ? WHERE uuid = ?').run(activityType, req.user.uuid)
    }

    db.prepare(`
      INSERT INTO gps_positions (userUuid, trailUuid, lat, lon, accuracy, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.uuid, trailUuid, lat, lon, accuracy ?? null, ts)

    const user = db.prepare('SELECT nombre, team, activityType FROM users WHERE uuid = ?').get(req.user.uuid)
    const run = db.prepare(
      'SELECT sos FROM race_runs WHERE userUuid = ? AND trailUuid = ? AND isCompleted = 0 AND isAbandoned = 0'
    ).get(req.user.uuid, trailUuid)

    broadcast(`race:${trailUuid}`, 'position_broadcast', {
      userUuid: req.user.uuid,
      userName: user?.nombre ?? req.user.user,
      teamName: user?.team ?? '',
      activityType: user?.activityType || 'runner',
      sos: run?.sos === 1,
      lat, lon, accuracy, timestamp: ts,
      isOnline: true,
    })

    res.status(200).json({ ok: true })
  })

  return router
}

module.exports = createGpsRouter
