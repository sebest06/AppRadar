const request = require('supertest')
const { createTestDb, createTestApp } = require('./helpers')

describe('Autenticación de usuarios', () => {
  let app
  let db
  let organizerTeamUuid

  beforeAll(() => {
    db = createTestDb()
    app = createTestApp(db)
    const org = db.prepare("SELECT uuid_team FROM users WHERE role = 'organizer' LIMIT 1").get()
    organizerTeamUuid = org?.uuid_team
  })

  afterAll(() => db.close())

  describe('POST /auth/login', () => {
    it('autentica al administrador con credenciales correctas', async () => {
      const res = await request(app).post('/auth/login').send({ user: 'admin', passw: '1234' })
      expect(res.status).toBe(200)
      expect(res.body.token).toBeDefined()
    })

    it('devuelve los datos del usuario junto con el token JWT', async () => {
      const res = await request(app).post('/auth/login').send({ user: 'admin', passw: '1234' })
      expect(res.body.user).toMatchObject({ user: 'admin', role: 'superuser' })
      expect(res.body.user.passw).toBeUndefined()
    })

    it('devuelve 401 con contraseña incorrecta', async () => {
      const res = await request(app).post('/auth/login').send({ user: 'admin', passw: 'incorrecta' })
      expect(res.status).toBe(401)
      expect(res.body.error).toBeDefined()
    })

    it('devuelve 401 cuando el usuario no existe', async () => {
      const res = await request(app).post('/auth/login').send({ user: 'noexiste', passw: '1234' })
      expect(res.status).toBe(401)
    })
  })

  describe('POST /auth/register', () => {
    it('registra un organizador con su propio equipo', async () => {
      const res = await request(app).post('/auth/register').send({
        user: 'org_test',
        passw: 'password123',
        nombre: 'Organizador Test',
        team: 'Equipo Montaña',
        role: 'organizer'
      })
      expect(res.status).toBe(201)
      expect(res.body.token).toBeDefined()
      expect(res.body.user.role).toBe('organizer')
      expect(res.body.user.teamStatus).toBe('accepted')
    })

    it('registra un corredor asociado a un equipo existente', async () => {
      const orgRes = await request(app).post('/auth/register').send({
        user: 'org_for_runner',
        passw: 'password123',
        nombre: 'Org Para Runner',
        team: 'Equipo Trail',
        role: 'organizer'
      })
      const teamUuid = orgRes.body.user.uuid_team

      const res = await request(app).post('/auth/register').send({
        user: 'runner_test',
        passw: 'password123',
        nombre: 'Corredor Test',
        uuid_team: teamUuid,
        role: 'runner'
      })
      expect(res.status).toBe(201)
      expect(res.body.user.role).toBe('runner')
      expect(res.body.user.team).toBe('Equipo Trail')
    })

    it('crea la cuenta del corredor con estado "pendiente" hasta aprobación del organizador', async () => {
      const orgRes = await request(app).post('/auth/register').send({
        user: 'org_pending',
        passw: 'password123',
        nombre: 'Org Pending',
        team: 'Equipo Pendiente',
        role: 'organizer'
      })
      const teamUuid = orgRes.body.user.uuid_team

      const res = await request(app).post('/auth/register').send({
        user: 'runner_pending',
        passw: 'password123',
        nombre: 'Runner Pendiente',
        uuid_team: teamUuid,
        role: 'runner'
      })
      expect(res.body.user.teamStatus).toBe('pending')
    })

    it('devuelve 400 si el corredor no selecciona un equipo', async () => {
      const res = await request(app).post('/auth/register').send({
        user: 'runner_sin_equipo',
        passw: 'password123',
        nombre: 'Sin Equipo',
        role: 'runner'
      })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/equipo/i)
    })

    it('devuelve 400 con contraseña menor a 6 caracteres', async () => {
      const res = await request(app).post('/auth/register').send({
        user: 'user_short_pass',
        passw: '123',
        nombre: 'Test',
        role: 'organizer'
      })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/contraseña/i)
    })

    it('devuelve 400 cuando faltan campos obligatorios', async () => {
      const res = await request(app).post('/auth/register').send({ user: 'incompleto' })
      expect(res.status).toBe(400)
    })

    it('devuelve 409 si el nombre de usuario ya está registrado', async () => {
      const res = await request(app).post('/auth/register').send({
        user: 'admin',
        passw: 'password123',
        nombre: 'Duplicado',
        role: 'organizer'
      })
      expect(res.status).toBe(409)
    })

    it('devuelve 404 si el uuid_team del equipo no existe', async () => {
      const res = await request(app).post('/auth/register').send({
        user: 'runner_bad_team',
        passw: 'password123',
        nombre: 'Bad Team',
        uuid_team: '00000000-0000-0000-0000-000000000000',
        role: 'runner'
      })
      expect(res.status).toBe(404)
    })
  })
})
