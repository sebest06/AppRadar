const request = require('supertest')
const { createTestDb, createTestApp, loginAs, createTrail } = require('./helpers')

describe('Gestión de rutas (trails)', () => {
  let app
  let db
  let adminToken
  let organizerToken
  let organizerUuid
  let organizerTeamUuid
  let runnerToken

  beforeAll(async () => {
    db = createTestDb()
    app = createTestApp(db)
    adminToken = await loginAs(app, 'admin', '1234')

    const orgRes = await request(app).post('/auth/register').send({
      user: 'org_trails',
      passw: 'password123',
      nombre: 'Organizador Trails',
      team: 'Equipo Trails',
      role: 'organizer'
    })
    organizerToken = orgRes.body.token
    organizerUuid = orgRes.body.user.uuid
    organizerTeamUuid = orgRes.body.user.uuid_team

    const runnerRes = await request(app).post('/auth/register').send({
      user: 'runner_trails',
      passw: 'password123',
      nombre: 'Runner Trails',
      uuid_team: organizerTeamUuid,
      role: 'runner'
    })
    runnerToken = runnerRes.body.token
  })

  afterAll(() => db.close())

  describe('POST /trails', () => {
    it('crea una nueva ruta con sus waypoints', async () => {
      const res = await createTrail(app, organizerToken, 3)
      expect(res.trailUuid).toBeDefined()
      expect(res.name).toBe('Trail de prueba')
      expect(res.isActive).toBe(false)
    })

    it('devuelve 400 si no se provee nombre', async () => {
      const res = await request(app)
        .post('/trails')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ waypoints: [{ order: 0, lat: -34.6, lon: -58.3 }] })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/nombre/i)
    })

    it('devuelve 400 si no se proveen waypoints', async () => {
      const res = await request(app)
        .post('/trails')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ name: 'Sin waypoints' })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/waypoints/i)
    })

    it('devuelve 401 sin token de autenticación', async () => {
      const res = await request(app).post('/trails').send({ name: 'Trail sin auth' })
      expect(res.status).toBe(401)
    })

    it('devuelve 403 si el usuario es un corredor sin permisos de creación', async () => {
      const res = await request(app)
        .post('/trails')
        .set('Authorization', `Bearer ${runnerToken}`)
        .send({ name: 'Trail Runner', waypoints: [{ order: 0, lat: -34.6, lon: -58.3 }] })
      expect(res.status).toBe(403)
    })

    it('asigna el trail al equipo del organizador (no es público)', async () => {
      const res = await createTrail(app, organizerToken)
      expect(res.teamUuid).toBe(organizerTeamUuid)
    })

    it('el superusuario crea trails públicos (sin equipo)', async () => {
      const res = await createTrail(app, adminToken)
      expect(res.teamUuid).toBeNull()
    })
  })

  describe('GET /trails', () => {
    let publicTrailUuid
    let teamTrailUuid

    beforeAll(async () => {
      const pub = await createTrail(app, adminToken)
      publicTrailUuid = pub.trailUuid
      const priv = await createTrail(app, organizerToken)
      teamTrailUuid = priv.trailUuid
    })

    it('lista rutas públicas para usuarios no autenticados', async () => {
      const res = await request(app).get('/trails')
      expect(res.status).toBe(200)
      const uuids = res.body.map(t => t.trailUuid)
      expect(uuids).toContain(publicTrailUuid)
      expect(uuids).not.toContain(teamTrailUuid)
    })

    it('incluye rutas del equipo para corredores con membresía aceptada', async () => {
      // El organizador acepta la solicitud y el corredor debe re-loguearse para obtener un token actualizado
      db.prepare("UPDATE users SET teamStatus = 'accepted' WHERE user = 'runner_trails'").run()
      const acceptedToken = await loginAs(app, 'runner_trails', 'password123')
      const res = await request(app)
        .get('/trails')
        .set('Authorization', `Bearer ${acceptedToken}`)
      const uuids = res.body.map(t => t.trailUuid)
      expect(uuids).toContain(teamTrailUuid)
    })

    it('muestra todas las rutas para el superusuario', async () => {
      const res = await request(app)
        .get('/trails')
        .set('Authorization', `Bearer ${adminToken}`)
      const uuids = res.body.map(t => t.trailUuid)
      expect(uuids).toContain(publicTrailUuid)
      expect(uuids).toContain(teamTrailUuid)
    })
  })

  describe('GET /trails/:trailId/details', () => {
    let trailUuid
    let waypointCount

    beforeAll(async () => {
      const trail = await createTrail(app, organizerToken, 3)
      trailUuid = trail.trailUuid
      waypointCount = 3
    })

    it('retorna la ruta con su lista de waypoints', async () => {
      const res = await request(app).get(`/trails/${trailUuid}/details`)
      expect(res.status).toBe(200)
      expect(res.body.trailUuid).toBe(trailUuid)
      expect(res.body.waypoints).toHaveLength(waypointCount)
    })

    it('los waypoints incluyen coordenadas y radio', async () => {
      const res = await request(app).get(`/trails/${trailUuid}/details`)
      res.body.waypoints.forEach(wp => {
        expect(wp.lat).toBeDefined()
        expect(wp.lon).toBeDefined()
        expect(wp.radius).toBeDefined()
      })
    })

    it('devuelve 404 si la ruta no existe', async () => {
      const res = await request(app).get('/trails/uuid-inexistente/details')
      expect(res.status).toBe(404)
    })
  })

  describe('PUT /trails/:trailId', () => {
    let trailUuid

    beforeAll(async () => {
      const trail = await createTrail(app, organizerToken)
      trailUuid = trail.trailUuid
    })

    it('actualiza el nombre y distancia de una ruta', async () => {
      const res = await request(app)
        .put(`/trails/${trailUuid}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ name: 'Trail Actualizado', distanceKm: 10 })
      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Trail Actualizado')
      expect(res.body.distanceKm).toBe(10)
    })

    it('devuelve 403 si un organizador distinto intenta modificar la ruta', async () => {
      const otherOrgRes = await request(app).post('/auth/register').send({
        user: 'otro_org',
        passw: 'password123',
        nombre: 'Otro Org',
        team: 'Otro Equipo',
        role: 'organizer'
      })
      const res = await request(app)
        .put(`/trails/${trailUuid}`)
        .set('Authorization', `Bearer ${otherOrgRes.body.token}`)
        .send({ name: 'Intento no autorizado' })
      expect(res.status).toBe(403)
    })

    it('devuelve 404 si la ruta no existe', async () => {
      const res = await request(app)
        .put('/trails/uuid-inexistente')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ name: 'Actualización imposible' })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /trails/:trailId', () => {
    it('elimina una ruta y sus waypoints en cascada', async () => {
      const trail = await createTrail(app, organizerToken)
      const res = await request(app)
        .delete(`/trails/${trail.trailUuid}`)
        .set('Authorization', `Bearer ${organizerToken}`)
      expect(res.status).toBe(204)

      const detailsRes = await request(app).get(`/trails/${trail.trailUuid}/details`)
      expect(detailsRes.status).toBe(404)

      const wps = db.prepare('SELECT * FROM waypoints WHERE trailUuid = ?').all(trail.trailUuid)
      expect(wps).toHaveLength(0)
    })

    it('devuelve 404 al intentar eliminar una ruta inexistente', async () => {
      const res = await request(app)
        .delete('/trails/uuid-inexistente')
        .set('Authorization', `Bearer ${organizerToken}`)
      expect(res.status).toBe(404)
    })
  })

  describe('POST /trails/:trailId/activate', () => {
    it('activa una ruta para que los corredores puedan competir', async () => {
      const trail = await createTrail(app, organizerToken)
      const res = await request(app)
        .post(`/trails/${trail.trailUuid}/activate`)
        .set('Authorization', `Bearer ${organizerToken}`)
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)

      const details = await request(app).get(`/trails/${trail.trailUuid}/details`)
      expect(details.body.isActive).toBe(true)
    })

    it('devuelve 403 si un organizador distinto intenta activar la ruta', async () => {
      const trail = await createTrail(app, organizerToken)
      const otherOrgRes = await request(app).post('/auth/register').send({
        user: 'org_no_activate',
        passw: 'password123',
        nombre: 'Org No Activate',
        team: 'Otro Equipo 2',
        role: 'organizer'
      })
      const res = await request(app)
        .post(`/trails/${trail.trailUuid}/activate`)
        .set('Authorization', `Bearer ${otherOrgRes.body.token}`)
      expect(res.status).toBe(403)
    })
  })
})
