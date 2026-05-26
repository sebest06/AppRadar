const request = require('supertest')
const { createDb } = require('../src/db')
const { createApp } = require('../app')

function createTestDb() {
  return createDb(':memory:')
}

function createTestApp(db) {
  return createApp(db)
}

async function loginAs(app, user, passw) {
  const res = await request(app).post('/auth/login').send({ user, passw })
  return res.body.token
}

async function registerOrganizer(app, { user, passw = 'password123', nombre, team }) {
  const res = await request(app).post('/auth/register').send({ user, passw, nombre, team, role: 'organizer' })
  return res.body
}

async function registerRunner(app, { user, passw = 'password123', nombre, uuid_team }) {
  const res = await request(app).post('/auth/register').send({ user, passw, nombre, uuid_team, role: 'runner' })
  return res.body
}

async function createTrail(app, token, waypointCount = 3) {
  const waypoints = Array.from({ length: waypointCount }, (_, i) => ({
    order: i,
    name: i === 0 ? 'Salida' : i === waypointCount - 1 ? 'Meta' : `Punto ${i}`,
    lat: -34.6037 + i * 0.001,
    lon: -58.3816 + i * 0.001,
    radius: 50
  }))

  const res = await request(app)
    .post('/trails')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Trail de prueba',
      description: 'Ruta para tests automatizados',
      distanceKm: 5,
      elevationM: 200,
      maxSkip: 1,
      waypoints
    })
  return res.body
}

module.exports = { createTestDb, createTestApp, loginAs, registerOrganizer, registerRunner, createTrail }
