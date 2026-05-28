const request = require('supertest')
const { v4: uuidv4 } = require('uuid')
const { createTestDb, createTestApp, loginAs } = require('./helpers')

describe('Perfil de usuario (/auth/me)', () => {
  let app
  let db
  let token
  let userUuid

  beforeAll(async () => {
    db = createTestDb()
    app = createTestApp(db)
    token = await loginAs(app, 'admin', '1234')
    userUuid = db.prepare("SELECT uuid FROM users WHERE user = 'admin'").get().uuid
  })

  describe('GET /auth/me', () => {
    it('devuelve los datos del usuario autenticado', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.user).toBe('admin')
      expect(res.body.uuid).toBeDefined()
      expect(res.body.passw).toBeUndefined()
    })

    it('devuelve 401 sin token', async () => {
      const res = await request(app).get('/auth/me')
      expect(res.status).toBe(401)
    })
  })

  describe('PUT /auth/me', () => {
    it('actualiza el nombre del usuario', async () => {
      const res = await request(app)
        .put('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Admin Actualizado' })
      expect(res.status).toBe(200)
      expect(res.body.nombre).toBe('Admin Actualizado')
    })

    it('actualiza el activityType', async () => {
      const res = await request(app)
        .put('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ activityType: 'bike' })
      expect(res.status).toBe(200)
      expect(res.body.activityType).toBe('bike')
    })

    it('rechaza activityType inválido', async () => {
      const res = await request(app)
        .put('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ activityType: 'invalido' })
      expect(res.status).toBe(400)
    })
  })

  describe('PUT /auth/me/password', () => {
    // Usamos un usuario dedicado para no afectar al admin en el resto de los tests
    let pwToken

    beforeAll(async () => {
      const res = await request(app).post('/auth/register').send({
        user: 'user_pw_test',
        passw: 'password123',
        nombre: 'PW Test',
        role: 'organizer',
        team: 'PW Team',
      })
      pwToken = res.body.token
    })

    it('cambia la contraseña con la contraseña actual correcta', async () => {
      const res = await request(app)
        .put('/auth/me/password')
        .set('Authorization', `Bearer ${pwToken}`)
        .send({ currentPassword: 'password123', newPassword: 'nuevaPass456' })
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })

    it('rechaza si la contraseña actual es incorrecta', async () => {
      const res = await request(app)
        .put('/auth/me/password')
        .set('Authorization', `Bearer ${pwToken}`)
        .send({ currentPassword: 'incorrecta', newPassword: 'nueva123' })
      expect(res.status).toBe(401)
      expect(res.body.error).toMatch(/incorrecta/i)
    })

    it('rechaza nueva contraseña menor a 6 caracteres', async () => {
      const res = await request(app)
        .put('/auth/me/password')
        .set('Authorization', `Bearer ${pwToken}`)
        .send({ currentPassword: 'nuevaPass456', newPassword: 'abc' })
      expect(res.status).toBe(400)
    })
  })

  describe('GET /auth/me/history', () => {
    it('devuelve lista vacía cuando el usuario no tiene carreras', async () => {
      // Registro un usuario nuevo sin carreras
      const freshRes = await request(app).post('/auth/register').send({
        user: 'runner_history_test',
        passw: 'password123',
        nombre: 'Runner History',
        role: 'organizer',
        team: 'Team History',
      })
      const freshToken = freshRes.body.token

      const res = await request(app)
        .get('/auth/me/history')
        .set('Authorization', `Bearer ${freshToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
      expect(res.body.total).toBe(0)
    })

    it('devuelve las carreras del usuario con los campos correctos', async () => {
      // Crear trail y run para el admin
      const orgRes = await request(app).post('/auth/register').send({
        user: 'org_history',
        passw: 'password123',
        nombre: 'Org History',
        role: 'organizer',
        team: 'Team H',
      })
      const orgToken = orgRes.body.token

      const trailRes = await request(app)
        .post('/trails')
        .set('Authorization', `Bearer ${orgToken}`)
        .send({
          name: 'Trail Historial',
          description: '',
          distanceKm: 10,
          elevationM: 300,
          maxSkip: 1,
          waypoints: [
            { order: 0, name: 'Inicio', lat: -34.6, lon: -58.3, radius: 50 },
            { order: 1, name: 'Meta',   lat: -34.7, lon: -58.4, radius: 50 },
          ],
        })
      const trailUuid = trailRes.body.trailUuid

      // Subir un run para el admin
      const runUuid = uuidv4()
      await request(app)
        .post('/runs/upload')
        .set('Authorization', `Bearer ${token}`)
        .send({
          runUuid,
          trailUuid,
          userUuid,
          startTime: Date.now() - 3_600_000,
          endTime: Date.now(),
          totalTime: 3_600_000,
          isCompleted: true,
          isAbandoned: false,
          sos: false,
        })

      const res = await request(app)
        .get('/auth/me/history')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.total).toBeGreaterThanOrEqual(1)
      expect(Array.isArray(res.body.data)).toBe(true)

      const run = res.body.data.find(r => r.runUuid === runUuid)
      expect(run).toBeDefined()
      expect(run.trailName).toBe('Trail Historial')
      expect(run.isCompleted).toBe(1)
      expect(run.distanceKm).toBe(10)
      expect(typeof run.waypointsReached).toBe('number')
      expect(typeof run.totalWaypoints).toBe('number')
    })

    it('respeta los parámetros limit y offset', async () => {
      const res = await request(app)
        .get('/auth/me/history?limit=1&offset=0')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.data.length).toBeLessThanOrEqual(1)
      expect(res.body.limit).toBe(1)
      expect(res.body.offset).toBe(0)
    })

    it('devuelve 401 sin token', async () => {
      const res = await request(app).get('/auth/me/history')
      expect(res.status).toBe(401)
    })
  })

  describe('POST /auth/refresh', () => {
    it('genera un nuevo token con un refresh token válido', async () => {
      const loginRes = await request(app)
        .post('/auth/login')
        .send({ user: 'admin', passw: '1234' })
      const { refreshToken } = loginRes.body

      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken })
      expect(res.status).toBe(200)
      expect(res.body.token).toBeDefined()
      expect(res.body.refreshToken).toBeDefined()
    })

    it('devuelve 401 con un refresh token inválido', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'token.invalido.firma' })
      expect(res.status).toBe(401)
    })

    it('devuelve 400 sin refreshToken en el body', async () => {
      const res = await request(app).post('/auth/refresh').send({})
      expect(res.status).toBe(400)
    })
  })
})
