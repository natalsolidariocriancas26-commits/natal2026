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
  getPublicData,
  reserveChildren,
  updateSettings,
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