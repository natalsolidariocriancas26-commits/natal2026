import { randomUUID } from 'node:crypto'
import { createDatabase } from './store.js'

const rows = `
HENRY GABRIEL|4|6|28|LUCIA|994728266
LEVY FERNANDES|3|4|22|LUCIA|994728266
ALEXIA FERNANDES|19 MESES|2|20|VIVIANE AP 41|958121279
THAYLA SOFIA|9|12|35||
AYLA MESSIAS|2|3|22|FRANCIDALVA AP 114|965462144
LUIZ HENRIQUE|8|12|34||
EMANUELI ALVEZ|9|14|34||
JOANA GARCIA|9|12|33||
MARIA ALICE|4|6|28|DONA EDNA - AP 51|943473776
ARTHUR ANDRADE|6|10|32||
CIBELE FIEL|10|16|37|ENEIDA|970554233
MARIA CLARA R.|8|10|36||
ANGELINA JULIA|10|12|36||
BRENDA CRISTINA|10|10|32||
BEATRIZ ALVES|7|8|32||
VICTOR EMANUEL|8|12|35||
KYARA OLIVEIRA|1|2|19|ANA CAROLINA|947016533
DARK HENRIQUE|5|10|35||
GABRIEL ARTHUR|4|6|25||
ANDREZA LIMA|9|16|35||
ANTHONY LIMA|4|6|27||
KATHYANE RODRIGUES|10|14|37||
MARIA EDUARDA|6|8|30||
MARIA CECILIA|6 MESES|1|19||
LAURA HELENA|6|10|32||
THAUN MATHEUS|8|12|34||
NATHANAEL OLIVEIRA|5|6|27||
ESTHER SOPHIA|4|8|29||
LARA SOPHIA|7|10|31|YARA|997702066
ANA CLARA F.|5|6|27||
MARIA JULIA C.|5|6|27||
ANA CLARA A.|7|8|30||
ELISE EMANUELE|7|8|30||
HEITOR GABRIEL|6|6|28||
ANA ELIZA|3|4|24|CIDA AP 63|991636003
HEITOR OLIVEIRA|3|5|27||
LAZARO ALVEZ|6|6|28||
MOISES ALVEZ|9 MESES|1|19|ANA CAROLINA|947016533
LUNA VITORIA|2|3|24|GABRIELA FALCÃO|964483582
LAYLA VICTORIA|7|10|33||
BRENDA VITORIA|2|4|25|ENEIDA|970554233
AYLLA VITORIA|5 MESES|1|19||
REBECA SOFIA|6|8|30||
GAEL AMARAL|6|7|30||
ANALICE FERNANDES|3 MESES|1|19|LURDES|989994243
JULIA VITORIA|7|10|30||
LUCCA LUIS|6|8|30||
LUIZ MIGUEL|1|2|22||
DAVI BERNARDO|9|10|34||
HYAGO FERNANDES|10|12|32||
ELOAH ARAUJO|2|4|25|NANCI|992048394
MARIA CLARA K.|4|6|27|Maria Desie|989316616
MARIA EDUARDO K.|7|10|32||
MIGUEL HENRIQUE|4|6|28||
VALENTINA ALVEZ|1|4|23|TELMA|989420104
THIERRY ALVEZ|6|10|32||
`.trim().split('\n').map((line) => {
  const [name, age, clothing, shoe, sponsor, phone] = line.split('|')
  return { name, age, clothing, shoe, sponsor, phone }
})

const db = createDatabase()
const now = new Date().toISOString()
const officialCodes = new Set(rows.map((_, index) => `NS-${String(index + 1).padStart(3, '0')}`))
let sponsorsLinked = 0
let cancelled = 0

function cancelActiveReservation(childId) {
  const items = db.prepare(`
    SELECT reservation_id FROM reservation_items
    WHERE child_id = ? AND status IN ('RESERVED', 'CONFIRMED', 'DELIVERED')
  `).all(childId)
  for (const item of items) {
    db.prepare("UPDATE reservation_items SET status = 'CANCELLED' WHERE reservation_id = ? AND child_id = ?").run(item.reservation_id, childId)
    db.prepare("UPDATE reservations SET status = 'CANCELLED' WHERE id = ? AND status IN ('RESERVED', 'CONFIRMED')").run(item.reservation_id)
  }
}

const run = db.transaction(() => {
  for (const [index, item] of rows.entries()) {
    const publicCode = `NS-${String(index + 1).padStart(3, '0')}`
    const child = db.prepare('SELECT id FROM children WHERE public_code = ?').get(publicCode)
    if (!child) throw new Error(`Crianca nao encontrada: ${publicCode} (${item.name})`)
    const sponsored = Boolean(item.sponsor)
    db.prepare(`
      UPDATE children SET private_name = ?, age_label = ?, clothing_size = ?, shoe_size = ?,
        name_authorized = 1, status = ? WHERE id = ?
    `).run(item.name, item.age, item.clothing, item.shoe, sponsored ? 'SPONSORED' : 'AVAILABLE', child.id)

    if (!sponsored) {
      cancelActiveReservation(child.id)
      continue
    }

    const guardian = db.prepare('SELECT id FROM guardians WHERE name = ? AND whatsapp = ?').get(item.sponsor, item.phone)
    const guardianId = guardian?.id || db.prepare(`
      INSERT INTO guardians (name, whatsapp, email, city, terms_accepted_at)
      VALUES (?, ?, '', '', ?)
    `).run(item.sponsor, item.phone, now).lastInsertRowid
    const existingItem = db.prepare(`
      SELECT reservation_id FROM reservation_items
      WHERE child_id = ? AND status IN ('RESERVED', 'CONFIRMED', 'DELIVERED')
    `).get(child.id)
    if (existingItem) {
      db.prepare("UPDATE reservations SET guardian_id = ?, status = 'CONFIRMED', confirmed_at = ? WHERE id = ?")
        .run(guardianId, now, existingItem.reservation_id)
      db.prepare("UPDATE reservation_items SET status = 'CONFIRMED' WHERE reservation_id = ? AND child_id = ?")
        .run(existingItem.reservation_id, child.id)
    } else {
      const reservationId = `official-${randomUUID()}`
      db.prepare(`
        INSERT INTO reservations (id, guardian_id, status, expires_at, confirmed_at)
        VALUES (?, ?, 'CONFIRMED', ?, ?)
      `).run(reservationId, guardianId, now, now)
      db.prepare("INSERT INTO reservation_items (reservation_id, child_id, status) VALUES (?, ?, 'CONFIRMED')")
        .run(reservationId, child.id)
    }
    sponsorsLinked += 1
  }

  const extraChildren = db.prepare('SELECT id, public_code FROM children').all()
  for (const child of extraChildren) {
    if (officialCodes.has(child.public_code)) continue
    cancelActiveReservation(child.id)
    db.prepare("UPDATE children SET status = 'CANCELLED' WHERE id = ?").run(child.id)
    cancelled += 1
  }
})

run()
db.close()
console.log(`Lista oficial sincronizada: ${rows.length} criancas; ${sponsorsLinked} padrinhos vinculados; ${cancelled} registros fora da lista desconsiderados.`)
