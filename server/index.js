import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import {
  addChild,
  cancelReservation,
  confirmReservation,
  createDatabase,
  deleteChild,
  expireReservations,
  getAdminChildren,
  getDashboard,
  getPublicData,
  getSession,
  importChildren,
  recordDelivery,
  recordEventDelivery,
  reserveChildren,
  updateChild,
  updateSettings,
} from './store.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function refreshChildrenPdf() {
  const pdfProcess = spawn(process.execPath, [resolve(root, 'server/create-children-pdf.js')], { cwd: root, stdio: 'ignore', detached: true })
  pdfProcess.unref()
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex')
}

function readCookie(request, name) {
  const prefix = `${name}=`
  const cookie = request.headers.cookie?.split(';').map((item) => item.trim()).find((item) => item.startsWith(prefix))
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : ''
}

function setAdminCookie(response, token, secure) {
  response.cookie('natal_admin', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure,
    path: '/api/admin',
    maxAge: 8 * 60 * 60 * 1000,
  })
}

function clearAdminCookie(response, secure) {
  response.clearCookie('natal_admin', { httpOnly: true, sameSite: 'strict', secure, path: '/api/admin' })
}

function validPassword(provided, expected) {
  if (!expected || typeof provided !== 'string') return false
  const actualHash = createHash('sha256').update(provided).digest()
  const expectedHash = createHash('sha256').update(expected).digest()
  return timingSafeEqual(actualHash, expectedHash)
}

export function createApp(db, environment = process.env) {
  const app = express()
  const secureCookies = environment.NODE_ENV === 'production'

  app.disable('x-powered-by')
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:', 'https://images.unsplash.com'],
      },
    },
  }))
  app.use(express.json({ limit: '32kb' }))

  const loginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 8, standardHeaders: 'draft-8', legacyHeaders: false })
  const reservationLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false })

  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))
  app.get('/api/public/campaign', (_request, response) => response.json(getPublicData(db)))

  app.post('/api/reservations', reservationLimiter, (request, response) => {
    try {
      const reservation = reserveChildren(db, request.body, request.body.childIds || [])
      response.status(201).json(reservation)
    } catch (error) {
      response.status(409).json({ error: error.message })
    }
  })

  app.post('/api/reservations/:id/confirm', reservationLimiter, (request, response) => {
    try {
      response.json(confirmReservation(db, request.params.id))
    } catch (error) {
      response.status(409).json({ error: error.message })
    }
  })

  app.post('/api/reservations/:id/cancel', (request, response) => {
    response.json({ cancelled: cancelReservation(db, request.params.id) })
  })

  const admin = express.Router()
  admin.get('/status', (_request, response) => response.json({ configured: Boolean(environment.ADMIN_PASSWORD && environment.ADMIN_PASSWORD.length >= 16) }))
  admin.post('/login', loginLimiter, (request, response) => {
    if (!environment.ADMIN_PASSWORD || environment.ADMIN_PASSWORD.length < 16) {
      return response.status(503).json({ error: 'Configure ADMIN_PASSWORD com pelo menos 16 caracteres no arquivo .env.' })
    }
    if (!validPassword(request.body.password, environment.ADMIN_PASSWORD)) {
      return response.status(401).json({ error: 'Senha incorreta.' })
    }
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 8 * 60 * 60_000).toISOString()
    db.prepare('INSERT INTO admin_sessions (token_hash, expires_at) VALUES (?, ?)').run(hash(token), expiresAt)
    setAdminCookie(response, token, secureCookies)
    response.json({ authenticated: true })
  })

  admin.use((request, response, next) => {
    const tokenHash = hash(readCookie(request, 'natal_admin'))
    if (!getSession(db, tokenHash)) return response.status(401).json({ error: 'Acesso restrito à equipe da campanha.' })
    next()
  })

  admin.post('/logout', (request, response) => {
    db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(hash(readCookie(request, 'natal_admin')))
    clearAdminCookie(response, secureCookies)
    response.json({ authenticated: false })
  })

  admin.get('/overview', (_request, response) => response.json({ ...getDashboard(db), campaign: getPublicData(db).campaign }))
  admin.get('/children', (request, response) => response.json(getAdminChildren(db, request.query)))
  admin.post('/children', (request, response) => {
    try {
      const child = addChild(db, request.body)
      refreshChildrenPdf()
      response.status(201).json(child)
    } catch (error) {
      response.status(400).json({ error: error.message })
    }
  })
  admin.put('/children/:id', (request, response) => {
    try {
      const child = updateChild(db, Number(request.params.id), request.body)
      if (!child) return response.status(404).json({ error: 'Cadastro não encontrado.' })
      refreshChildrenPdf()
      response.json(child)
    } catch (error) {
      response.status(400).json({ error: error.message })
    }
  })
  admin.delete('/children/:id', (request, response) => {
    try {
      if (!deleteChild(db, Number(request.params.id))) return response.status(404).json({ error: 'Cadastro não encontrado.' })
      response.status(204).end()
    } catch (error) {
      response.status(409).json({ error: error.message })
    }
  })
  admin.post('/children/:id/delivery', (request, response) => {
    try {
      recordDelivery(db, Number(request.params.id), request.body)
      response.json({ delivered: true })
    } catch (error) {
      response.status(400).json({ error: error.message })
    }
  })
  admin.post('/children/:id/event-delivery', (request, response) => {
    try {
      recordEventDelivery(db, Number(request.params.id), request.body)
      response.json({ delivered: true })
    } catch (error) {
      response.status(400).json({ error: error.message })
    }
  })
  admin.put('/campaign', (request, response) => {
    try {
      response.json(updateSettings(db, request.body))
    } catch (error) {
      response.status(400).json({ error: error.message })
    }
  })
  app.use('/api/admin', admin)

  app.use('/api', (_request, response) => response.status(404).json({ error: 'Rota não encontrada.' }))
  app.use((error, _request, response, _next) => {
    console.error('Falha inesperada na API.')
    response.status(500).json({ error: 'Não foi possível concluir a solicitação.' })
  })

  const builtIndex = resolve(root, 'dist/index.html')
  if (existsSync(builtIndex)) {
    app.use(express.static(resolve(root, 'dist')))
    app.use((request, response, next) => {
      if (request.method !== 'GET' || request.path.startsWith('/api/')) return next()
      response.sendFile(builtIndex)
    })
  }

  return app
}

export function startServer() {
  const db = createDatabase()
  const importPath = resolve(root, process.env.PRIVATE_IMPORT_FILE || 'private-data/children.json')
  const currentCount = db.prepare('SELECT COUNT(*) AS count FROM children').get().count
  if (currentCount === 0 && existsSync(importPath)) {
    const records = JSON.parse(readFileSync(importPath, 'utf8'))
    importChildren(db, records)
    console.info(`Importação privada concluída: ${records.length} cadastros.`)
  }

  const server = createApp(db).listen(Number(process.env.PORT) || 3001, '0.0.0.0', () => {
    console.info(`API do Natal Solidário disponível na porta ${server.address().port}.`)
  })
  const cleanup = setInterval(() => expireReservations(db), 60_000)
  cleanup.unref()
  return { server, db }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) startServer()