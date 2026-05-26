require('dotenv').config()

const express = require('express')
const cors = require('cors')

const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:4173']

function createApp(db) {
  const app = express()

  app.use(cors({ origin: CORS_ORIGINS, credentials: true }))
  app.use(express.json())

  app.use('/auth', require('./src/routes/auth')(db))
  app.use(require('./src/routes/teams')(db))
  app.use(require('./src/routes/trails')(db))
  app.use(require('./src/routes/races')(db))
  app.use(require('./src/routes/gps')(db))

  return app
}

module.exports = { createApp, CORS_ORIGINS }
