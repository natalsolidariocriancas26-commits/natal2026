import { randomUUID } from 'node:crypto'
import { createDatabase } from './store.js'

const sponsors = [
  ['NS-003', 'VIVIANE AP 41', '9598121279'],
  ['NS-005', 'FRANCIDALVA AP 114', '9654621444'],
  ['NS-009', 'DONA EDNA - AP 51', '943473776'],
  ['NS-011', 'ENEIDA', '970554233'],
  ['NS-017', 'ANA CAROLINA', '947016533'],
  ['NS-029', 'YARA', '997702066'],
  ['NS-035', 'CIDA AP 63', '991636003'],
  ['NS-038', 'ANA CAROLINA', '947016533'],
  ['NS-041', 'ENEIDA', '970554233'],
  ['NS-045', 'LURDES', '989994243'],
  ['NS-053', 'NANCI', '992048394'],
  ['NS-055', 'TELMA', '989420104'],
]

const db = createDatabase()
const now = new Date().toISOString()
let imported = 0
let skipped = 0

const run = db.transaction(() => {
  for (const [publicCode, name, whatsapp] of sponsors) {
    const child = db.prepare('SELECT id FROM children WHERE public_code = ?').get(publicCode)
    if (!child) throw new Error(`Crianca nao encontrada: ${publicCode}`)
    const linked = db.prepare(`
      SELECT i.id FROM reservation_items i
      WHERE i.child_id = ? AND i.status IN ('CONFIRMED', 'DELIVERED')
    `).get(child.id)
    if (linked) {
      skipped += 1
      continue
    }

    const existingGuardian = db.prepare('SELECT id FROM guardians WHERE whatsapp = ? AND name = ?').get(whatsapp, name)
    const guardianId = existingGuardian?.id || db.prepare(`
      INSERT INTO guardians (name, whatsapp, email, city, terms_accepted_at)
      VALUES (?, ?, '', '', ?)
    `).run(name, whatsapp, now).lastInsertRowid
    const reservationId = `import-${randomUUID()}`
    db.prepare(`
      INSERT INTO reservations (id, guardian_id, status, expires_at, confirmed_at)
      VALUES (?, ?, 'CONFIRMED', ?, ?)
    `).run(reservationId, guardianId, now, now)
    db.prepare(`
      INSERT INTO reservation_items (reservation_id, child_id, status)
      VALUES (?, ?, 'CONFIRMED')
    `).run(reservationId, child.id)
    imported += 1
  }
})

run()
db.close()
console.log(`Padrinhos importados: ${imported}; ja existentes: ${skipped}`)
