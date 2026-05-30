const request = require('supertest')
const { v4: uuidv4 } = require('uuid')
const { createTestDb, createTestApp, registerOrganizer, registerRunner, createTrail } = require('./helpers')

describe('Mensajes del organizador', () => {
  let app, db
  let organizerToken, organizerUuid, teamUuid
  let runner1Token, runner1Uuid
  let runner2Token, runner2Uuid
  let otherOrgToken, otherRunnerToken  // segundo equipo independiente
  let trailUuid

  beforeAll(async () => {
    db = createTestDb()
    app = createTestApp(db)

    // Organizador con equipo
    const org = await registerOrganizer(app, { user: 'org_msg', nombre: 'Org Mensajes', team: 'Equipo Msg' })
    organizerToken = org.token
    organizerUuid  = org.user.uuid
    teamUuid       = org.user.uuid_team

    // Dos corredores del mismo equipo
    const r1 = await registerRunner(app, { user: 'runner_msg1', nombre: 'Ana Msg', uuid_team: teamUuid })
    runner1Token = r1.token
    runner1Uuid  = r1.user.uuid

    const r2 = await registerRunner(app, { user: 'runner_msg2', nombre: 'Bruno Msg', uuid_team: teamUuid })
    runner2Token = r2.token
    runner2Uuid  = r2.user.uuid

    // Aceptar corredores
    await request(app).post(`/team/requests/${runner1Uuid}/accept`).set('Authorization', `Bearer ${organizerToken}`)
    await request(app).post(`/team/requests/${runner2Uuid}/accept`).set('Authorization', `Bearer ${organizerToken}`)

    // Segundo equipo independiente
    const org2 = await registerOrganizer(app, { user: 'org_msg2', nombre: 'Org Otro', team: 'Equipo Otro' })
    otherOrgToken = org2.token
    const rOther = await registerRunner(app, { user: 'runner_other', nombre: 'Corredor Otro', uuid_team: org2.user.uuid_team })
    otherRunnerToken = rOther.token
    await request(app).post(`/team/requests/${rOther.user.uuid}/accept`).set('Authorization', `Bearer ${org2.token}`)

    // Trail
    const trail = await createTrail(app, organizerToken, 3)
    trailUuid = trail.trailUuid
  })

  afterAll(() => db.close())

  // ── POST /messages ────────────────────────────────────────────────────────

  describe('POST /messages', () => {
    it('el organizador puede enviar un mensaje a un corredor específico', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ trailUuid, recipientUuid: runner1Uuid, content: 'Vas muy bien, Ana!' })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })

    it('el organizador puede enviar un mensaje broadcast (recipientUuid null)', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ trailUuid, recipientUuid: null, content: 'Buen ritmo a todos!' })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })

    it('el organizador puede enviar sin incluir recipientUuid (broadcast implícito)', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ trailUuid, content: 'Ánimo equipo!' })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })

    it('un corredor recibe 403 al intentar enviar un mensaje', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${runner1Token}`)
        .send({ trailUuid, content: 'No debería poder enviar' })

      expect(res.status).toBe(403)
      expect(res.body.error).toMatch(/organizador/)
    })

    it('devuelve 401 sin token de autenticación', async () => {
      const res = await request(app)
        .post('/messages')
        .send({ trailUuid, content: 'Sin auth' })

      expect(res.status).toBe(401)
    })

    it('devuelve 400 si falta trailUuid', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ content: 'Sin trail' })

      expect(res.status).toBe(400)
    })

    it('devuelve 400 si el contenido está vacío', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ trailUuid, content: '' })

      expect(res.status).toBe(400)
    })

    it('devuelve 400 si el contenido supera 500 caracteres', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ trailUuid, content: 'a'.repeat(501) })

      expect(res.status).toBe(400)
    })

    it('devuelve 400 si recipientUuid no es un UUID válido', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ trailUuid, recipientUuid: 'no-es-un-uuid', content: 'Hola' })

      expect(res.status).toBe(400)
    })
  })

  // ── GET /messages ─────────────────────────────────────────────────────────

  describe('GET /messages', () => {
    let broadcastTs, directTs

    beforeAll(async () => {
      // Mensaje broadcast → visible para todos
      const b = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ trailUuid, content: 'Broadcast GET test' })
      broadcastTs = Date.now()

      // Mensaje directo a runner1
      await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ trailUuid, recipientUuid: runner1Uuid, content: 'Solo para Ana' })
      directTs = Date.now()

      // Mensaje directo a runner2 — NO debe verse por runner1
      await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ trailUuid, recipientUuid: runner2Uuid, content: 'Solo para Bruno' })
    })

    it('un corredor ve los mensajes broadcast dirigidos a su trail', async () => {
      const res = await request(app)
        .get('/messages')
        .set('Authorization', `Bearer ${runner1Token}`)
        .query({ trailUuid, since: 0 })

      expect(res.status).toBe(200)
      const contents = res.body.map(m => m.content)
      expect(contents).toContain('Broadcast GET test')
    })

    it('un corredor ve los mensajes dirigidos directamente a él', async () => {
      const res = await request(app)
        .get('/messages')
        .set('Authorization', `Bearer ${runner1Token}`)
        .query({ trailUuid, since: 0 })

      expect(res.status).toBe(200)
      const contents = res.body.map(m => m.content)
      expect(contents).toContain('Solo para Ana')
    })

    it('un corredor NO ve los mensajes dirigidos a otro corredor', async () => {
      const res = await request(app)
        .get('/messages')
        .set('Authorization', `Bearer ${runner1Token}`)
        .query({ trailUuid, since: 0 })

      expect(res.status).toBe(200)
      const contents = res.body.map(m => m.content)
      expect(contents).not.toContain('Solo para Bruno')
    })

    it('el filtro since excluye mensajes anteriores al timestamp', async () => {
      // Enviamos un mensaje nuevo después del timestamp de referencia
      await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ trailUuid, content: 'Mensaje nuevo' })

      const res = await request(app)
        .get('/messages')
        .set('Authorization', `Bearer ${runner1Token}`)
        .query({ trailUuid, since: directTs })

      expect(res.status).toBe(200)
      const contents = res.body.map(m => m.content)
      // Los mensajes anteriores a directTs NO deben aparecer
      expect(contents).not.toContain('Broadcast GET test')
      expect(contents).not.toContain('Solo para Ana')
      // El mensaje nuevo SÍ debe aparecer
      expect(contents).toContain('Mensaje nuevo')
    })

    it('devuelve array vacío si no hay mensajes nuevos', async () => {
      const res = await request(app)
        .get('/messages')
        .set('Authorization', `Bearer ${runner1Token}`)
        .query({ trailUuid, since: Date.now() + 100_000 })

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(0)
    })

    it('los mensajes incluyen senderName del organizador', async () => {
      const res = await request(app)
        .get('/messages')
        .set('Authorization', `Bearer ${runner1Token}`)
        .query({ trailUuid, since: 0 })

      expect(res.status).toBe(200)
      const msg = res.body.find(m => m.content === 'Broadcast GET test')
      expect(msg).toBeDefined()
      expect(msg.senderName).toBe('Org Mensajes')
    })

    it('el organizador NO ve sus propios mensajes broadcast', async () => {
      const res = await request(app)
        .get('/messages')
        .set('Authorization', `Bearer ${organizerToken}`)
        .query({ trailUuid, since: 0 })

      expect(res.status).toBe(200)
      const contents = res.body.map(m => m.content)
      // El organizador envió todos estos mensajes → no debe verlos
      expect(contents).not.toContain('Broadcast GET test')
      expect(contents).not.toContain('Mensaje nuevo')
    })

    it('un corredor de otro equipo NO ve mensajes broadcast de este equipo', async () => {
      const res = await request(app)
        .get('/messages')
        .set('Authorization', `Bearer ${otherRunnerToken}`)
        .query({ trailUuid, since: 0 })

      expect(res.status).toBe(200)
      const contents = res.body.map(m => m.content)
      expect(contents).not.toContain('Broadcast GET test')
      expect(contents).not.toContain('Solo para Ana')
    })

    it('un organizador de otro equipo NO ve mensajes broadcast de este equipo', async () => {
      const res = await request(app)
        .get('/messages')
        .set('Authorization', `Bearer ${otherOrgToken}`)
        .query({ trailUuid, since: 0 })

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(0)
    })

    it('devuelve 400 si falta trailUuid', async () => {
      const res = await request(app)
        .get('/messages')
        .set('Authorization', `Bearer ${runner1Token}`)
        .query({ since: 0 })

      expect(res.status).toBe(400)
    })

    it('devuelve 401 sin token de autenticación', async () => {
      const res = await request(app)
        .get('/messages')
        .query({ trailUuid, since: 0 })

      expect(res.status).toBe(401)
    })
  })
})
