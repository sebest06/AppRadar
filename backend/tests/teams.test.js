const request = require('supertest')
const { createTestDb, createTestApp, loginAs } = require('./helpers')

describe('Gestión de equipos', () => {
  let app
  let db
  let adminToken
  let organizerToken
  let organizerTeamUuid
  let runnerUuid

  beforeAll(async () => {
    db = createTestDb()
    app = createTestApp(db)
    adminToken = await loginAs(app, 'admin', '1234')

    const orgRes = await request(app).post('/auth/register').send({
      user: 'organizer_teams',
      passw: 'password123',
      nombre: 'Organizador Equipos',
      team: 'Equipo Tests',
      role: 'organizer'
    })
    organizerToken = orgRes.body.token
    organizerTeamUuid = orgRes.body.user.uuid_team

    const runnerRes = await request(app).post('/auth/register').send({
      user: 'runner_para_aprobar',
      passw: 'password123',
      nombre: 'Runner Para Aprobar',
      uuid_team: organizerTeamUuid,
      role: 'runner'
    })
    runnerUuid = runnerRes.body.user.uuid
  })

  afterAll(() => db.close())

  describe('GET /teams', () => {
    it('lista todos los equipos de organizadores disponibles', async () => {
      const res = await request(app).get('/teams')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      const equipoTest = res.body.find(t => t.team === 'Equipo Tests')
      expect(equipoTest).toBeDefined()
    })

    it('cada equipo incluye uuid_team y nombre del equipo', async () => {
      const res = await request(app).get('/teams')
      res.body.forEach(team => {
        expect(team.uuid_team).toBeDefined()
        expect(team.team).toBeDefined()
      })
    })
  })

  describe('GET /team/requests', () => {
    it('devuelve las solicitudes pendientes del equipo del organizador', async () => {
      const res = await request(app)
        .get('/team/requests')
        .set('Authorization', `Bearer ${organizerToken}`)
      expect(res.status).toBe(200)
      const pendingRunner = res.body.find(r => r.uuid === runnerUuid)
      expect(pendingRunner).toBeDefined()
      expect(pendingRunner.teamStatus).toBe('pending')
    })

    it('devuelve 401 sin token de autenticación', async () => {
      const res = await request(app).get('/team/requests')
      expect(res.status).toBe(401)
    })

    it('devuelve 403 si el usuario no es organizador', async () => {
      const runnerRes = await request(app).post('/auth/register').send({
        user: 'runner_no_org',
        passw: 'password123',
        nombre: 'Runner No Org',
        uuid_team: organizerTeamUuid,
        role: 'runner'
      })
      const res = await request(app)
        .get('/team/requests')
        .set('Authorization', `Bearer ${runnerRes.body.token}`)
      expect(res.status).toBe(403)
    })
  })

  describe('POST /team/requests/:userUuid/accept', () => {
    it('aprueba la solicitud de un corredor y cambia su estado a "accepted"', async () => {
      const res = await request(app)
        .post(`/team/requests/${runnerUuid}/accept`)
        .set('Authorization', `Bearer ${organizerToken}`)
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)

      const updated = db.prepare('SELECT teamStatus FROM users WHERE uuid = ?').get(runnerUuid)
      expect(updated.teamStatus).toBe('accepted')
    })

    it('devuelve 401 sin token', async () => {
      const res = await request(app).post(`/team/requests/${runnerUuid}/accept`)
      expect(res.status).toBe(401)
    })
  })

  describe('POST /team/requests/:userUuid/reject', () => {
    it('rechaza la solicitud de un corredor y cambia su estado a "rejected"', async () => {
      const rejRunnerRes = await request(app).post('/auth/register').send({
        user: 'runner_a_rechazar',
        passw: 'password123',
        nombre: 'Runner A Rechazar',
        uuid_team: organizerTeamUuid,
        role: 'runner'
      })
      const rejRunnerUuid = rejRunnerRes.body.user.uuid

      const res = await request(app)
        .post(`/team/requests/${rejRunnerUuid}/reject`)
        .set('Authorization', `Bearer ${organizerToken}`)
      expect(res.status).toBe(200)

      const updated = db.prepare('SELECT teamStatus FROM users WHERE uuid = ?').get(rejRunnerUuid)
      expect(updated.teamStatus).toBe('rejected')
    })
  })
})
