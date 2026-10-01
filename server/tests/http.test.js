import assert from 'node:assert/strict'
import test from 'node:test'
import { addChild, createDatabase } from '../store.js'
import { createApp } from '../index.js'

test('API publica dados anonimizados e protege rotas administrativas', async (context) => {
  const db = createDatabase(':memory:')
  addChild(db, { privateName: 'Nome reservado', ageLabel: '5 anos' })
  const server = createApp(db, { ADMIN_PASSWORD: 'senha-local-de-teste-para-painel', NODE_ENV: 'test' }).listen(0, '127.0.0.1')
  context.after(() => server.close())
  await new Promise((resolve) => server.once('listening', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`

  const publicResponse = await fetch(`${origin}/api/public/campaign`)
  const publicData = await publicResponse.json()
  assert.equal(publicData.children[0].publicCode, 'NS-001')
  assert.equal(JSON.stringify(publicData).includes('Nome reservado'), false)
  assert.match(publicResponse.headers.get('content-security-policy'), /fonts\.googleapis\.com/)
  assert.match(publicResponse.headers.get('content-security-policy'), /images\.unsplash\.com/)

  const privateResponse = await fetch(`${origin}/api/admin/children`)
  assert.equal(privateResponse.status, 401)

  const reservationResponse = await fetch(`${origin}/api/reservations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Padrinho de teste', whatsapp: '11999999999', termsAccepted: true, childIds: [1] }),
  })
  assert.equal(reservationResponse.status, 201)
  const reservation = await reservationResponse.json()
  const duplicateResponse = await fetch(`${origin}/api/reservations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Outra pessoa', whatsapp: '11999999998', termsAccepted: true, childIds: [1] }),
  })
  assert.equal(duplicateResponse.status, 409)

  const confirmationResponse = await fetch(`${origin}/api/reservations/${reservation.id}/confirm`, { method: 'POST' })
  assert.equal(confirmationResponse.status, 200)
  assert.equal((await (await fetch(`${origin}/api/public/campaign`)).json()).counts.SPONSORED, 1)

  const loginResponse = await fetch(`${origin}/api/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password: 'senha-local-de-teste-para-painel' }),
  })
  assert.equal(loginResponse.status, 200)
  const cookie = loginResponse.headers.getSetCookie()[0].split(';')[0]
  assert.match(loginResponse.headers.getSetCookie()[0], /HttpOnly/i)

  const adminResponse = await fetch(`${origin}/api/admin/children`, { headers: { cookie } })
  assert.equal(adminResponse.status, 200)
  assert.equal((await adminResponse.json())[0].privateName, 'Nome reservado')
})