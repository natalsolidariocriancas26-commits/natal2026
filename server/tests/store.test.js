import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  addChild,
  confirmReservation,
  createDatabase,
  getAdminChildren,
  getDashboard,
  getPublicData,
  recordDelivery,
  recordEventDelivery,
  reserveChildren,
} from '../store.js'

function setup() {
  const db = createDatabase(':memory:')
  const child = addChild(db, {
    privateName: 'Nome confidencial',
    ageLabel: '4 anos',
    genderLabel: 'Menina',
    clothingSize: '6',
    pantsSize: '4',
    shoeSize: '28',
    toySuggestion: 'Boneca',
  })
  return { db, child }
}

const guardian = { name: 'Pessoa Teste', whatsapp: '11999999999', termsAccepted: true }

test('reserva uma criança uma única vez e oculta nome no catálogo público', () => {
  const { db, child } = setup()
  const reservation = reserveChildren(db, guardian, [child.id])
  assert.equal(reservation.children[0].publicCode, 'NS-001')
  assert.throws(() => reserveChildren(db, guardian, [child.id]), /já não estão disponíveis/)
  const publicChild = getPublicData(db).children[0]
  assert.equal(publicChild.status, 'RESERVED')
  assert.equal('privateName' in publicChild, false)
})

test('confirma a reserva e mostra dados completos apenas na área administrativa', () => {
  const { db, child } = setup()
  const reservation = reserveChildren(db, guardian, [child.id])
  confirmReservation(db, reservation.id)
  assert.equal(getPublicData(db).children[0].status, 'SPONSORED')
  assert.equal(getAdminChildren(db)[0].privateName, 'Nome confidencial')
})

test('rejeita termos ausentes e reserva não confirmada fora da validade', () => {
  const { db, child } = setup()
  assert.throws(() => reserveChildren(db, { ...guardian, termsAccepted: false }, [child.id]), /aceite os termos/)
  const start = new Date('2026-10-01T10:00:00.000Z')
  const reservation = reserveChildren(db, guardian, [child.id], start)
  assert.throws(() => confirmReservation(db, reservation.id, new Date(start.getTime() + 21 * 60_000)), /não está mais ativa/)
  assert.equal(getPublicData(db).children[0].status, 'AVAILABLE')
})

test('nunca exibe nomes no catálogo público, mesmo autorizados ou configurados', () => {
  const { db, child } = setup()
  const initialPublicChild = getPublicData(db).children[0]
  assert.equal(getPublicData(db).campaign.introduction, 'Escolha um cartão, prepare um presente e faça uma criança sorrir.')
  assert.equal('name' in initialPublicChild, false)
  assert.equal('genderLabel' in initialPublicChild, false)
  assert.equal(initialPublicChild.clothingSize, '6')
  assert.equal(initialPublicChild.pantsSize, '4')
  assert.equal(initialPublicChild.shoeSize, '28')
  assert.equal(initialPublicChild.toySuggestion, 'Boneca')
  assert.equal(initialPublicChild.ageLabel, '4 anos')

  const authorizedChild = addChild(db, { privateName: 'Nome autorizado completo', nameAuthorized: true })
  db.prepare('UPDATE campaign_settings SET public_fields = ? WHERE id = 1')
    .run(JSON.stringify(['name', 'gender', 'age', 'clothingSize', 'pantsSize', 'shoeSize', 'toySuggestion']))
  const publicChildren = getPublicData(db).children
  assert.equal('name' in publicChildren.find((item) => item.id === child.id), false)
  assert.equal('name' in publicChildren.find((item) => item.id === authorizedChild.id), false)
  assert.equal(getAdminChildren(db).find((item) => item.id === authorizedChild.id).nameAuthorized, 1)
})

test('não autoriza nomes automaticamente ao reabrir o banco', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'natal-solidario-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const filename = join(directory, 'campaign.sqlite')
  const firstDb = createDatabase(filename)
  addChild(firstDb, { privateName: 'Nome confidencial' })
  firstDb.close()

  const reopenedDb = createDatabase(filename)
  assert.equal(getAdminChildren(reopenedDb)[0].nameAuthorized, 0)
  assert.equal('name' in getPublicData(reopenedDb).children[0], false)
  reopenedDb.close()
})

test('remove nomes e fotos de configurações públicas legadas', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'natal-solidario-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const filename = join(directory, 'campaign.sqlite')
  const firstDb = createDatabase(filename)
  const child = addChild(firstDb, {
    privateName: 'Nome confidencial',
    nameAuthorized: true,
    photoUrl: 'https://example.org/foto.jpg',
    photoAuthorized: true,
  })
  firstDb.prepare('UPDATE campaign_settings SET public_fields = ? WHERE id = 1')
    .run(JSON.stringify(['name', 'photo', 'gender', 'age', 'clothingSize', 'shoeSize']))
  firstDb.close()

  const reopenedDb = createDatabase(filename)
  const publicChild = getPublicData(reopenedDb).children.find((item) => item.id === child.id)
  assert.equal('name' in publicChild, false)
  assert.equal('photoUrl' in publicChild, false)
  assert.equal(getAdminChildren(reopenedDb)[0].privateName, 'Nome confidencial')
  assert.equal(getAdminChildren(reopenedDb)[0].photoUrl, 'https://example.org/foto.jpg')
  reopenedDb.close()
})

test('migra configurações antigas para manter nomes privados por padrão', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'natal-solidario-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const filename = join(directory, 'campaign.sqlite')
  const firstDb = createDatabase(filename)
  addChild(firstDb, { privateName: 'Nome confidencial', nameAuthorized: true })
  firstDb.prepare('UPDATE campaign_settings SET public_fields = ? WHERE id = 1')
    .run(JSON.stringify(['name', 'gender', 'age', 'clothingSize', 'pantsSize', 'shoeSize', 'toySuggestion']))
  firstDb.prepare('DELETE FROM app_migrations WHERE id = ?').run('2026-09-public-catalog-privacy')
  firstDb.close()

  const reopenedDb = createDatabase(filename)
  const publicChild = getPublicData(reopenedDb).children[0]
  assert.equal(getAdminChildren(reopenedDb)[0].nameAuthorized, 0)
  assert.equal('name' in publicChild, false)
  assert.equal('genderLabel' in publicChild, false)
  assert.equal(publicChild.clothingSize, '')
  reopenedDb.close()
})

test('separa presente recebido pela organização de entrega à criança', () => {
  const { db, child } = setup()
  const reservation = reserveChildren(db, guardian, [child.id])
  confirmReservation(db, reservation.id)
  assert.throws(() => recordEventDelivery(db, child.id, { deliveredAt: '2026-12-19' }), /recebimento do presente/)

  recordDelivery(db, child.id, { deliveredAt: '2026-12-01', receivedBy: 'Equipe' })
  const received = getPublicData(db)
  assert.equal(received.children[0].status, 'RECEIVED')
  assert.equal(received.counts.RECEIVED, 1)
  assert.equal(getDashboard(db).counts.RECEIVED, 1)

  recordEventDelivery(db, child.id, { deliveredAt: '2026-12-19' })
  const delivered = getPublicData(db)
  assert.equal(delivered.children[0].status, 'DELIVERED')
  assert.equal(delivered.counts.DELIVERED, 1)
  assert.equal(getDashboard(db).counts.DELIVERED, 1)
  assert.throws(() => recordEventDelivery(db, child.id, { deliveredAt: '2026-12-19' }), /já foi registrada/)
})