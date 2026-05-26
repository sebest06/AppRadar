const request = require('supertest')
const { v4: uuidv4 } = require('uuid')
const { createTestDb, createTestApp, loginAs, createTrail } = require('./helpers')

describe('Posiciones GPS', () => {
  let app
  let db
  let runnerToken
  let runnerUuid
  let trailUuid

  beforeAll(async () => {
    db = createTestDb()
    app = createTestApp(db)
    const adminToken = await loginAs(app, 'admin', '1234')

    const orgRes = await request(app).post('/auth/register').send({
      user: 'org_gps',
      passw: 'password123',
      nombre: 'Org GPS',
      team: 'Equipo GPS',
      role: 'organizer'
    })
    const organizerToken = orgRes.body.token
    const organizerTeamUuid = orgRes.body.user.uuid_team

    const runnerRes = await request(app).post('/auth/register').send({
      user: 'runner_gps',
      passw: 'password123',
      nombre: 'Runner GPS',
      uuid_team: organizerTeamUuid,
      role: 'runner'
    })
    runnerToken = runnerRes.body.token
    runnerUuid = runnerRes.body.user.uuid

    const trail = await createTrail(app, organizerToken, 2)
    trailUuid = trail.trailUuid
  })

  afterAll(() => db.close())

  describe('POST /gps/upload', () => {
    it('registra una posición GPS del corredor en la base de datos', async () => {
      const timestamp = Date.now()
      const res = await request(app)
        .post('/gps/upload')
        .set('Authorization', `Bearer ${runnerToken}`)
        .send({ trailUuid, lat: -34.6037, lon: -58.3816, accuracy: 5.0, timestamp })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)

      const saved = db.prepare('SELECT * FROM gps_positions WHERE userUuid = ? AND trailUuid = ?').get(runnerUuid, trailUuid)
      expect(saved).toBeDefined()
      expect(saved.lat).toBeCloseTo(-34.6037)
      expect(saved.lon).toBeCloseTo(-58.3816)
    })

    it('actualiza el activityType del usuario cuando se incluye en el payload', async () => {
      const res = await request(app)
        .post('/gps/upload')
        .set('Authorization', `Bearer ${runnerToken}`)
        .send({ trailUuid, lat: -34.6037, lon: -58.3816, accuracy: 3.0, activityType: 'bike' })

      expect(res.status).toBe(200)

      const user = db.prepare('SELECT activityType FROM users WHERE uuid = ?').get(runnerUuid)
      expect(user.activityType).toBe('bike')
    })

    it('usa el timestamp del servidor si no se provee en el payload', async () => {
      const before = Date.now()
      await request(app)
        .post('/gps/upload')
        .set('Authorization', `Bearer ${runnerToken}`)
        .send({ trailUuid, lat: -34.6037, lon: -58.3816 })
      const after = Date.now()

      const saved = db.prepare(
        'SELECT timestamp FROM gps_positions WHERE userUuid = ? ORDER BY id DESC LIMIT 1'
      ).get(runnerUuid)
      expect(saved.timestamp).toBeGreaterThanOrEqual(before)
      expect(saved.timestamp).toBeLessThanOrEqual(after)
    })

    it('devuelve 400 cuando no se provee trailUuid', async () => {
      const res = await request(app)
        .post('/gps/upload')
        .set('Authorization', `Bearer ${runnerToken}`)
        .send({ lat: -34.6037, lon: -58.3816 })
      expect(res.status).toBe(400)
      expect(res.body.error).toBeDefined()
    })

    it('devuelve 400 cuando no se proveen coordenadas lat/lon', async () => {
      const res = await request(app)
        .post('/gps/upload')
        .set('Authorization', `Bearer ${runnerToken}`)
        .send({ trailUuid })
      expect(res.status).toBe(400)
    })

    it('devuelve 401 sin token de autenticación', async () => {
      const res = await request(app)
        .post('/gps/upload')
        .send({ trailUuid, lat: -34.6037, lon: -58.3816 })
      expect(res.status).toBe(401)
    })
  })
})
