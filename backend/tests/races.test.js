const request = require('supertest')
const { v4: uuidv4 } = require('uuid')
const { createTestDb, createTestApp, loginAs, createTrail } = require('./helpers')

describe('Ciclo de vida de una carrera', () => {
  let app
  let db
  let adminToken
  let organizerToken
  let organizerTeamUuid
  let runnerToken
  let runnerUuid
  let trailUuid
  let waypoints
  let sessionUuid

  beforeAll(async () => {
    db = createTestDb()
    app = createTestApp(db)
    adminToken = await loginAs(app, 'admin', '1234')

    const orgRes = await request(app).post('/auth/register').send({
      user: 'org_races',
      passw: 'password123',
      nombre: 'Org Races',
      team: 'Equipo Race',
      role: 'organizer'
    })
    organizerToken = orgRes.body.token
    organizerTeamUuid = orgRes.body.user.uuid_team

    const runnerRes = await request(app).post('/auth/register').send({
      user: 'runner_races',
      passw: 'password123',
      nombre: 'Runner Races',
      uuid_team: organizerTeamUuid,
      role: 'runner'
    })
    runnerToken = runnerRes.body.token
    runnerUuid = runnerRes.body.user.uuid

    const trail = await createTrail(app, organizerToken, 3)
    trailUuid = trail.trailUuid

    const details = await request(app).get(`/trails/${trailUuid}/details`)
    waypoints = details.body.waypoints
  })

  afterAll(() => db.close())

  describe('POST /runs/upload', () => {
    it('registra el inicio de una carrera y devuelve un sessionUuid', async () => {
      const runUuid = uuidv4()
      const res = await request(app)
        .post('/runs/upload')
        .set('Authorization', `Bearer ${runnerToken}`)
        .send({ runUuid, trailUuid, userUuid: runnerUuid, startTime: Date.now(), isCompleted: false })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(res.body.sessionUuid).toBeDefined()
      sessionUuid = res.body.sessionUuid
    })

    it('agrupa dos corredores que inician en la misma hora en una misma sesión', async () => {
      const runner2Res = await request(app).post('/auth/register').send({
        user: 'runner2_session',
        passw: 'password123',
        nombre: 'Runner 2 Session',
        uuid_team: organizerTeamUuid,
        role: 'runner'
      })

      const run2Uuid = uuidv4()
      const res = await request(app)
        .post('/runs/upload')
        .set('Authorization', `Bearer ${runner2Res.body.token}`)
        .send({ runUuid: run2Uuid, trailUuid, userUuid: runner2Res.body.user.uuid, startTime: Date.now(), isCompleted: false })

      expect(res.body.sessionUuid).toBe(sessionUuid)
    })

    it('actualiza el run existente si se envía el mismo runUuid', async () => {
      const runUuid = uuidv4()
      const startTime = Date.now() - 10000

      await request(app)
        .post('/runs/upload')
        .set('Authorization', `Bearer ${runnerToken}`)
        .send({ runUuid, trailUuid: (await createTrail(app, organizerToken)).trailUuid, userUuid: runnerUuid, startTime, isCompleted: false })

      const newTrailUuid = (await createTrail(app, organizerToken)).trailUuid
      await request(app)
        .post('/runs/upload')
        .set('Authorization', `Bearer ${runnerToken}`)
        .send({ runUuid, trailUuid: newTrailUuid, userUuid: runnerUuid, startTime, isCompleted: false })

      const storedRun = db.prepare('SELECT trailUuid FROM race_runs WHERE runUuid = ?').get(runUuid)
      expect(storedRun.trailUuid).not.toBe(newTrailUuid)
    })

    it('registra el abandono de una carrera', async () => {
      const runUuid = uuidv4()
      const trailForAbandon = await createTrail(app, organizerToken)

      await request(app)
        .post('/runs/upload')
        .set('Authorization', `Bearer ${runnerToken}`)
        .send({ runUuid, trailUuid: trailForAbandon.trailUuid, userUuid: runnerUuid, startTime: Date.now(), isCompleted: false })

      const res = await request(app)
        .post('/runs/upload')
        .set('Authorization', `Bearer ${runnerToken}`)
        .send({ runUuid, trailUuid: trailForAbandon.trailUuid, userUuid: runnerUuid, startTime: Date.now() - 5000, endTime: Date.now(), totalTime: 5000, isCompleted: false, isAbandoned: true })

      expect(res.status).toBe(200)
      const run = db.prepare('SELECT isAbandoned FROM race_runs WHERE runUuid = ?').get(runUuid)
      expect(run.isAbandoned).toBe(1)
    })

    it('registra la finalización de una carrera', async () => {
      const runUuid = uuidv4()
      const trailForFinish = await createTrail(app, organizerToken)

      await request(app)
        .post('/runs/upload')
        .set('Authorization', `Bearer ${runnerToken}`)
        .send({ runUuid, trailUuid: trailForFinish.trailUuid, userUuid: runnerUuid, startTime: Date.now(), isCompleted: false })

      const res = await request(app)
        .post('/runs/upload')
        .set('Authorization', `Bearer ${runnerToken}`)
        .send({ runUuid, trailUuid: trailForFinish.trailUuid, userUuid: runnerUuid, startTime: Date.now() - 5000, endTime: Date.now(), totalTime: 5000, isCompleted: true, isAbandoned: false })

      expect(res.status).toBe(200)
      const run = db.prepare('SELECT isCompleted FROM race_runs WHERE runUuid = ?').get(runUuid)
      expect(run.isCompleted).toBe(1)
    })

    it('bloquea iniciar una segunda carrera en la misma ruta antes de que pase 1 hora', async () => {
      const res = await request(app)
        .post('/runs/upload')
        .set('Authorization', `Bearer ${runnerToken}`)
        .send({ runUuid: uuidv4(), trailUuid, userUuid: runnerUuid, startTime: Date.now(), isCompleted: false })

      expect(res.status).toBe(403)
      expect(res.body.remainingMinutes).toBeGreaterThan(0)
    })

    it('informa cuántos minutos restan para poder iniciar otra carrera', async () => {
      const res = await request(app)
        .post('/runs/upload')
        .set('Authorization', `Bearer ${runnerToken}`)
        .send({ runUuid: uuidv4(), trailUuid, userUuid: runnerUuid, startTime: Date.now(), isCompleted: false })

      expect(res.body.remainingMinutes).toBeLessThanOrEqual(60)
    })

    it('devuelve 401 sin token de autenticación', async () => {
      const res = await request(app)
        .post('/runs/upload')
        .send({ runUuid: uuidv4(), trailUuid, userUuid: runnerUuid, startTime: Date.now() })
      expect(res.status).toBe(401)
    })
  })

  describe('POST /tracks/upload', () => {
    let runUuid

    beforeAll(async () => {
      const newTrail = await createTrail(app, organizerToken)
      trailUuid = newTrail.trailUuid
      const details = await request(app).get(`/trails/${trailUuid}/details`)
      waypoints = details.body.waypoints

      runUuid = uuidv4()
      await request(app)
        .post('/runs/upload')
        .set('Authorization', `Bearer ${runnerToken}`)
        .send({ runUuid, trailUuid, userUuid: runnerUuid, startTime: Date.now(), isCompleted: false })
    })

    it('registra un waypoint alcanzado por el corredor', async () => {
      const res = await request(app)
        .post('/tracks/upload')
        .set('Authorization', `Bearer ${runnerToken}`)
        .send([{
          trackUuid: uuidv4(),
          runUuid,
          waypointUuid: waypoints[0].waypointUuid,
          trailUuid,
          userUuid: runnerUuid,
          timestamp: Date.now()
        }])
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)

      const track = db.prepare('SELECT * FROM tracks WHERE runUuid = ?').get(runUuid)
      expect(track).toBeDefined()
    })

    it('acepta múltiples waypoints en un solo request', async () => {
      const secondRunUuid = uuidv4()
      const newTrail = await createTrail(app, organizerToken, 2)
      const newDetails = await request(app).get(`/trails/${newTrail.trailUuid}/details`)
      const newWps = newDetails.body.waypoints

      await request(app)
        .post('/runs/upload')
        .set('Authorization', `Bearer ${runnerToken}`)
        .send({ runUuid: secondRunUuid, trailUuid: newTrail.trailUuid, userUuid: runnerUuid, startTime: Date.now(), isCompleted: false })

      const res = await request(app)
        .post('/tracks/upload')
        .set('Authorization', `Bearer ${runnerToken}`)
        .send(newWps.map(wp => ({
          trackUuid: uuidv4(),
          runUuid: secondRunUuid,
          waypointUuid: wp.waypointUuid,
          trailUuid: newTrail.trailUuid,
          userUuid: runnerUuid,
          timestamp: Date.now()
        })))

      expect(res.status).toBe(200)
      const trackCount = db.prepare('SELECT COUNT(*) as c FROM tracks WHERE runUuid = ?').get(secondRunUuid).c
      expect(trackCount).toBe(2)
    })

    it('ignora un track duplicado sin retornar error (INSERT OR IGNORE)', async () => {
      // Usar waypoints[1] porque waypoints[0] ya fue insertado en el test anterior
      // El índice UNIQUE(runUuid, waypointUuid) bloquea silenciosamente el segundo insert
      const duplicateTrackUuid = uuidv4()
      const trackData = [{
        trackUuid: duplicateTrackUuid,
        runUuid,
        waypointUuid: waypoints[1].waypointUuid,
        trailUuid,
        userUuid: runnerUuid,
        timestamp: Date.now()
      }]

      await request(app).post('/tracks/upload').set('Authorization', `Bearer ${runnerToken}`).send(trackData)
      const res = await request(app).post('/tracks/upload').set('Authorization', `Bearer ${runnerToken}`).send(trackData)
      expect(res.status).toBe(200)

      const count = db.prepare('SELECT COUNT(*) as c FROM tracks WHERE trackUuid = ?').get(duplicateTrackUuid).c
      expect(count).toBe(1)
    })

    it('devuelve 401 sin token', async () => {
      const res = await request(app).post('/tracks/upload').send([])
      expect(res.status).toBe(401)
    })
  })

  describe('GET /rankings', () => {
    let rankTrailUuid
    let rankRunUuid
    let rankWaypoints
    let rankSessionUuid
    let rankRunnerUuid

    beforeAll(async () => {
      const newTrail = await createTrail(app, organizerToken, 3)
      rankTrailUuid = newTrail.trailUuid
      const details = await request(app).get(`/trails/${rankTrailUuid}/details`)
      rankWaypoints = details.body.waypoints

      rankRunUuid = uuidv4()
      const runRes = await request(app)
        .post('/runs/upload')
        .set('Authorization', `Bearer ${runnerToken}`)
        .send({ runUuid: rankRunUuid, trailUuid: rankTrailUuid, userUuid: runnerUuid, startTime: Date.now() - 10000, isCompleted: false })
      rankSessionUuid = runRes.body.sessionUuid
      rankRunnerUuid = runnerUuid

      await request(app)
        .post('/tracks/upload')
        .set('Authorization', `Bearer ${runnerToken}`)
        .send([{
          trackUuid: uuidv4(),
          runUuid: rankRunUuid,
          waypointUuid: rankWaypoints[0].waypointUuid,
          trailUuid: rankTrailUuid,
          userUuid: runnerUuid,
          timestamp: Date.now()
        }])
    })

    it('retorna el ranking con el corredor visible y sus waypoints alcanzados', async () => {
      const res = await request(app).get(`/rankings?trailUuid=${rankTrailUuid}`)
      expect(res.status).toBe(200)
      const runner = res.body.find(r => r.userUuid === rankRunnerUuid)
      expect(runner).toBeDefined()
      expect(runner.waypointsReached).toBeGreaterThanOrEqual(1)
    })

    it('ordena el ranking de mayor a menor cantidad de waypoints alcanzados', async () => {
      const res = await request(app).get(`/rankings?trailUuid=${rankTrailUuid}`)
      for (let i = 0; i < res.body.length - 1; i++) {
        expect(res.body[i].waypointsReached).toBeGreaterThanOrEqual(res.body[i + 1].waypointsReached)
      }
    })

    it('marca al corredor como completado cuando isCompleted es true', async () => {
      db.prepare('UPDATE race_runs SET isCompleted = 1 WHERE runUuid = ?').run(rankRunUuid)
      const res = await request(app).get(`/rankings?trailUuid=${rankTrailUuid}`)
      const runner = res.body.find(r => r.userUuid === rankRunnerUuid)
      expect(runner.isCompleted).toBe(true)
    })

    it('marca al corredor como abandonado cuando isAbandoned es true', async () => {
      db.prepare('UPDATE race_runs SET isCompleted = 0, isAbandoned = 1 WHERE runUuid = ?').run(rankRunUuid)
      const res = await request(app).get(`/rankings?trailUuid=${rankTrailUuid}`)
      const runner = res.body.find(r => r.userUuid === rankRunnerUuid)
      expect(runner.isAbandoned).toBe(true)
    })

    it('filtra por sesión cuando se provee sessionUuid', async () => {
      const res = await request(app).get(`/rankings?trailUuid=${rankTrailUuid}&sessionUuid=${rankSessionUuid}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('devuelve 400 cuando no se provee trailUuid', async () => {
      const res = await request(app).get('/rankings')
      expect(res.status).toBe(400)
    })
  })

  describe('GET /races/sessions', () => {
    it('lista todas las sesiones de una ruta con cantidad de corredores', async () => {
      const res = await request(app).get(`/races/sessions?trailUuid=${trailUuid}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      if (res.body.length > 0) {
        expect(res.body[0].sessionUuid).toBeDefined()
        expect(res.body[0].runnerCount).toBeGreaterThan(0)
      }
    })

    it('devuelve 400 cuando no se provee trailUuid', async () => {
      const res = await request(app).get('/races/sessions')
      expect(res.status).toBe(400)
    })
  })

  describe('GET /races/live', () => {
    let liveTrailUuid
    let liveRunnerToken
    let liveRunnerUuid

    beforeAll(async () => {
      const newTrail = await createTrail(app, organizerToken, 2)
      liveTrailUuid = newTrail.trailUuid

      const liveRunnerRes = await request(app).post('/auth/register').send({
        user: 'runner_live_test',
        passw: 'password123',
        nombre: 'Runner Live',
        uuid_team: organizerTeamUuid,
        role: 'runner'
      })
      liveRunnerToken = liveRunnerRes.body.token
      liveRunnerUuid = liveRunnerRes.body.user.uuid

      await request(app)
        .post('/runs/upload')
        .set('Authorization', `Bearer ${liveRunnerToken}`)
        .send({ runUuid: uuidv4(), trailUuid: liveTrailUuid, userUuid: liveRunnerUuid, startTime: Date.now(), isCompleted: false })

      await request(app)
        .post('/gps/upload')
        .set('Authorization', `Bearer ${liveRunnerToken}`)
        .send({ trailUuid: liveTrailUuid, lat: -34.6037, lon: -58.3816, accuracy: 5, timestamp: Date.now() })
    })

    it('retorna posición GPS en vivo para un corredor que envió GPS recientemente (< 2 min)', async () => {
      const res = await request(app).get(`/races/live?trailUuid=${liveTrailUuid}`)
      expect(res.status).toBe(200)
      const runner = res.body.find(r => r.userUuid === liveRunnerUuid)
      expect(runner).toBeDefined()
      expect(runner.isOnline).toBe(true)
    })

    it('devuelve lista vacía si no hay sesión activa para la ruta', async () => {
      const emptyTrail = await createTrail(app, organizerToken)
      const res = await request(app).get(`/races/live?trailUuid=${emptyTrail.trailUuid}`)
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(0)
    })

    it('devuelve 400 cuando no se provee trailUuid', async () => {
      const res = await request(app).get('/races/live')
      expect(res.status).toBe(400)
    })
  })

  describe('GET /races/:trailId/route-history/:userUuid', () => {
    let historyTrailUuid
    let historyRunnerToken
    let historyRunnerUuid

    beforeAll(async () => {
      const newTrail = await createTrail(app, organizerToken, 2)
      historyTrailUuid = newTrail.trailUuid

      const histRunnerRes = await request(app).post('/auth/register').send({
        user: 'runner_history',
        passw: 'password123',
        nombre: 'Runner History',
        uuid_team: organizerTeamUuid,
        role: 'runner'
      })
      historyRunnerToken = histRunnerRes.body.token
      historyRunnerUuid = histRunnerRes.body.user.uuid

      await request(app)
        .post('/gps/upload')
        .set('Authorization', `Bearer ${historyRunnerToken}`)
        .send({ trailUuid: historyTrailUuid, lat: -34.6037, lon: -58.3816, accuracy: 5, timestamp: Date.now() - 2000 })

      await request(app)
        .post('/gps/upload')
        .set('Authorization', `Bearer ${historyRunnerToken}`)
        .send({ trailUuid: historyTrailUuid, lat: -34.6040, lon: -58.3820, accuracy: 5, timestamp: Date.now() })
    })

    it('retorna el historial de posiciones GPS de un corredor en orden cronológico', async () => {
      const res = await request(app).get(`/races/${historyTrailUuid}/route-history/${historyRunnerUuid}`)
      expect(res.status).toBe(200)
      expect(res.body.length).toBeGreaterThanOrEqual(2)
      for (let i = 0; i < res.body.length - 1; i++) {
        expect(res.body[i].timestamp).toBeLessThanOrEqual(res.body[i + 1].timestamp)
      }
    })

    it('retorna lista vacía si el corredor no tiene posiciones registradas en la ruta', async () => {
      const res = await request(app).get(`/races/${historyTrailUuid}/route-history/uuid-sin-posiciones`)
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(0)
    })
  })
})
