import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

export const childStatuses = ['AVAILABLE', 'RESERVED', 'SPONSORED', 'DELIVERED', 'CANCELLED']
export const publicFieldNames = ['gender', 'age', 'clothingSize', 'pantsSize', 'shoeSize', 'toySuggestion', 'photo']

const defaultSettings = {
  campaignName: 'Natal Solidário',
  year: 2026,
  eventDate: '2026-12-19',
  eventTime: '12:00',
  deliveryDeadline: '2026-11-30',
  deliveryLocation: 'ADEBANKE Espaço Cultural, Rua Durand, 175 - Artur Alvim',
  deliveryContact: '5511945963712',
  donationInfo: 'Faça uma doação. Informe-se pelo WhatsApp da campanha.',
  introduction: 'Neste Natal, você pode fazer a diferença na vida de uma criança.',
  reservationMinutes: 20,
  publicFields: ['age', 'clothingSize', 'pantsSize', 'shoeSize', 'toySuggestion'],
}

export function createDatabase(filename = process.env.DATABASE_PATH || '.local-data/natal-solidario.sqlite') {
  const absolutePath = filename === ':memory:' ? filename : resolve(filename)
  if (absolutePath !== ':memory:') mkdirSync(dirname(absolutePath), { recursive: true })

  const db = new Database(absolutePath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaign_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      campaign_name TEXT NOT NULL,
      year INTEGER NOT NULL,
      event_date TEXT NOT NULL DEFAULT '',
      event_time TEXT NOT NULL DEFAULT '',
      delivery_deadline TEXT NOT NULL DEFAULT '',
      delivery_location TEXT NOT NULL DEFAULT '',
      delivery_contact TEXT NOT NULL DEFAULT '',
      donation_info TEXT NOT NULL DEFAULT '',
      introduction TEXT NOT NULL DEFAULT '',
      reservation_minutes INTEGER NOT NULL DEFAULT 20 CHECK (reservation_minutes BETWEEN 5 AND 120),
      public_fields TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS children (
      id INTEGER PRIMARY KEY,
      public_code TEXT NOT NULL UNIQUE,
      private_name TEXT NOT NULL,
      age_label TEXT NOT NULL DEFAULT '',
      gender_label TEXT NOT NULL DEFAULT '',
      clothing_size TEXT NOT NULL DEFAULT '',
      pants_size TEXT NOT NULL DEFAULT '',
      shoe_size TEXT NOT NULL DEFAULT '',
      toy_suggestion TEXT NOT NULL DEFAULT '',
      observations TEXT NOT NULL DEFAULT '',
      photo_url TEXT NOT NULL DEFAULT '',
      name_authorized INTEGER NOT NULL DEFAULT 0 CHECK (name_authorized IN (0, 1)),
      photo_authorized INTEGER NOT NULL DEFAULT 0 CHECK (photo_authorized IN (0, 1)),
      status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'RESERVED', 'SPONSORED', 'DELIVERED', 'CANCELLED')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS guardians (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      terms_accepted_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      guardian_id INTEGER REFERENCES guardians(id),
      status TEXT NOT NULL CHECK (status IN ('RESERVED', 'CONFIRMED', 'EXPIRED', 'CANCELLED')),
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      confirmed_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS reservation_items (
      id INTEGER PRIMARY KEY,
      reservation_id TEXT NOT NULL REFERENCES reservations(id),
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
      status TEXT NOT NULL CHECK (status IN ('RESERVED', 'CONFIRMED', 'DELIVERED', 'EXPIRED', 'CANCELLED')),
      UNIQUE (reservation_id, child_id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_reservation_per_child
      ON reservation_items(child_id)
      WHERE status IN ('RESERVED', 'CONFIRMED', 'DELIVERED');
    CREATE TABLE IF NOT EXISTS delivery_records (
      id INTEGER PRIMARY KEY,
      child_id INTEGER NOT NULL REFERENCES children(id),
      delivered_at TEXT NOT NULL,
      received_by TEXT NOT NULL,
      observation TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash TEXT PRIMARY KEY,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  const childColumns = db.prepare('PRAGMA table_info(children)').all()
  if (!childColumns.some((column) => column.name === 'name_authorized')) {
    db.exec('ALTER TABLE children ADD COLUMN name_authorized INTEGER NOT NULL DEFAULT 0 CHECK (name_authorized IN (0, 1))')
  }
  if (!childColumns.some((column) => column.name === 'pants_size')) {
    db.exec("ALTER TABLE children ADD COLUMN pants_size TEXT NOT NULL DEFAULT ''")
    db.prepare('UPDATE campaign_settings SET public_fields = ? WHERE id = 1')
      .run(JSON.stringify(defaultSettings.publicFields))
  }

  db.prepare(`
    INSERT OR IGNORE INTO campaign_settings
      (id, campaign_name, year, event_date, event_time, delivery_deadline,
       delivery_location, delivery_contact, donation_info, introduction,
       reservation_minutes, public_fields)
    VALUES (1, @campaignName, @year, @eventDate, @eventTime, @deliveryDeadline,
       @deliveryLocation, @deliveryContact, @donationInfo, @introduction,
       @reservationMinutes, @publicFields)
  `).run({ ...defaultSettings, publicFields: JSON.stringify(defaultSettings.publicFields) })

  const privacyMigration = '2026-09-public-catalog-privacy'
  if (!db.prepare('SELECT 1 FROM app_migrations WHERE id = ?').get(privacyMigration)) {
    const migratePrivacyDefaults = db.transaction(() => {
      db.prepare('UPDATE campaign_settings SET public_fields = ? WHERE id = 1')
        .run(JSON.stringify(defaultSettings.publicFields))
      db.prepare('UPDATE children SET name_authorized = 0').run()
      db.prepare('INSERT INTO app_migrations (id) VALUES (?)').run(privacyMigration)
    })
    migratePrivacyDefaults()
  }

  const storedSettings = getSettingsRow(db)
  const storedPublicFields = JSON.parse(storedSettings.public_fields)
  if (!storedPublicFields.includes('age')) {
    db.prepare('UPDATE campaign_settings SET public_fields = ? WHERE id = 1')
      .run(JSON.stringify([...storedPublicFields, 'age']))
  }
  return db
}

function getSettingsRow(db) {
  return db.prepare('SELECT * FROM campaign_settings WHERE id = 1').get()
}

export function getSettings(db) {
  const row = getSettingsRow(db)
  return {
    campaignName: row.campaign_name,
    year: row.year,
    eventDate: row.event_date,
    eventTime: row.event_time,
    deliveryDeadline: row.delivery_deadline,
    deliveryLocation: row.delivery_location,
    deliveryContact: row.delivery_contact,
    donationInfo: row.donation_info,
    introduction: row.introduction,
    reservationMinutes: row.reservation_minutes,
    publicFields: JSON.parse(row.public_fields),
  }
}

export function updateSettings(db, input) {
  const current = getSettings(db)
  const next = { ...current, ...input }
  if (!Number.isInteger(Number(next.reservationMinutes)) || Number(next.reservationMinutes) < 5 || Number(next.reservationMinutes) > 120) {
    throw new Error('O tempo de reserva deve ficar entre 5 e 120 minutos.')
  }
  if (!Array.isArray(next.publicFields) || next.publicFields.some((field) => !publicFieldNames.includes(field))) {
    throw new Error('A lista de informações públicas contém um campo inválido.')
  }

  db.prepare(`
    UPDATE campaign_settings SET campaign_name = ?, year = ?, event_date = ?, event_time = ?,
      delivery_deadline = ?, delivery_location = ?, delivery_contact = ?, donation_info = ?,
      introduction = ?, reservation_minutes = ?, public_fields = ? WHERE id = 1
  `).run(
    String(next.campaignName).slice(0, 100), Number(next.year), String(next.eventDate).slice(0, 20),
    String(next.eventTime).slice(0, 20), String(next.deliveryDeadline).slice(0, 20),
    String(next.deliveryLocation).slice(0, 300), String(next.deliveryContact).replace(/\D/g, '').slice(0, 20),
    String(next.donationInfo).slice(0, 500), String(next.introduction).slice(0, 500),
    Number(next.reservationMinutes), JSON.stringify([...new Set(next.publicFields)]),
  )
  return getSettings(db)
}

export function addChild(db, input) {
  const privateName = String(input.privateName || '').trim().slice(0, 120)
  if (!privateName) throw new Error('Informe o nome da criança para uso administrativo.')
  const insert = db.prepare(`
    INSERT INTO children (public_code, private_name, age_label, gender_label, clothing_size, pants_size, shoe_size,
      toy_suggestion, observations, photo_url, name_authorized, photo_authorized, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const result = insert.run(
    `TEMP-${randomUUID()}`, privateName, String(input.ageLabel || '').slice(0, 40), String(input.genderLabel || '').slice(0, 40),
    String(input.clothingSize || '').slice(0, 40), String(input.pantsSize || '').slice(0, 40), String(input.shoeSize || '').slice(0, 40),
    String(input.toySuggestion || '').slice(0, 160), String(input.observations || '').slice(0, 1000),
    String(input.photoUrl || '').slice(0, 500), input.nameAuthorized ? 1 : 0, input.photoAuthorized ? 1 : 0,
    input.status === 'SPONSORED' ? 'SPONSORED' : 'AVAILABLE',
  )
  const publicCode = `NS-${String(result.lastInsertRowid).padStart(3, '0')}`
  db.prepare('UPDATE children SET public_code = ? WHERE id = ?').run(publicCode, result.lastInsertRowid)
  return db.prepare('SELECT * FROM children WHERE id = ?').get(result.lastInsertRowid)
}

export function updateChild(db, id, input) {
  const child = db.prepare('SELECT * FROM children WHERE id = ?').get(id)
  if (!child) return null
  const hasActiveReservation = db.prepare(`
    SELECT 1 FROM reservation_items WHERE child_id = ? AND status IN ('RESERVED', 'CONFIRMED', 'DELIVERED')
  `).get(id)
  if (hasActiveReservation && input.status && input.status !== child.status) {
    throw new Error('Não é possível alterar o status enquanto há um apadrinhamento ativo.')
  }
  const status = input.status && childStatuses.includes(input.status) ? input.status : child.status
  db.prepare(`
    UPDATE children SET private_name = ?, age_label = ?, gender_label = ?, clothing_size = ?, pants_size = ?, shoe_size = ?,
      toy_suggestion = ?, observations = ?, photo_url = ?, name_authorized = ?, photo_authorized = ?, status = ?
    WHERE id = ?
  `).run(
    String(input.privateName ?? child.private_name).trim().slice(0, 120),
    String(input.ageLabel ?? child.age_label).slice(0, 40),
    String(input.genderLabel ?? child.gender_label).slice(0, 40),
    String(input.clothingSize ?? child.clothing_size).slice(0, 40),
    String(input.pantsSize ?? child.pants_size).slice(0, 40),
    String(input.shoeSize ?? child.shoe_size).slice(0, 40),
    String(input.toySuggestion ?? child.toy_suggestion).slice(0, 160),
    String(input.observations ?? child.observations).slice(0, 1000),
    String(input.photoUrl ?? child.photo_url).slice(0, 500),
    input.nameAuthorized === undefined ? child.name_authorized : input.nameAuthorized ? 1 : 0,
    input.photoAuthorized === undefined ? child.photo_authorized : input.photoAuthorized ? 1 : 0,
    status, id,
  )
  return db.prepare('SELECT * FROM children WHERE id = ?').get(id)
}

export function importChildren(db, records) {
  const run = db.transaction((items) => {
    for (const item of items) addChild(db, { ...item, status: item.sponsored ? 'SPONSORED' : 'AVAILABLE' })
  })
  run(records)
}

export function expireReservations(db, now = new Date()) {
  const nowIso = now.toISOString()
  const expired = db.prepare(`SELECT id FROM reservations WHERE status = 'RESERVED' AND expires_at <= ?`).all(nowIso)
  if (!expired.length) return 0
  const expire = db.transaction((rows) => {
    for (const { id } of rows) {
      db.prepare(`UPDATE reservations SET status = 'EXPIRED' WHERE id = ? AND status = 'RESERVED'`).run(id)
      db.prepare(`UPDATE reservation_items SET status = 'EXPIRED' WHERE reservation_id = ? AND status = 'RESERVED'`).run(id)
      db.prepare(`UPDATE children SET status = 'AVAILABLE' WHERE id IN
        (SELECT child_id FROM reservation_items WHERE reservation_id = ? AND status = 'EXPIRED') AND status = 'RESERVED'`).run(id)
    }
  })
  expire(expired)
  return expired.length
}

export function reserveChildren(db, guardian, childIds, now = new Date()) {
  expireReservations(db, now)
  if (!Array.isArray(childIds)) throw new Error('Selecione ao menos uma criança disponível.')
  const ids = [...new Set(childIds.map(Number))]
  if (!ids.length || ids.length > 56 || ids.some((id) => !Number.isInteger(id) || id < 1)) {
    throw new Error('Selecione ao menos uma criança disponível.')
  }
  if (!String(guardian.name || '').trim() || !String(guardian.whatsapp || '').replace(/\D/g, '') || guardian.termsAccepted !== true) {
    throw new Error('Informe seu nome, WhatsApp e aceite os termos da campanha.')
  }
  const settings = getSettings(db)
  const reserve = db.transaction(() => {
    const placeholders = ids.map(() => '?').join(',')
    const available = db.prepare(`SELECT id FROM children WHERE status = 'AVAILABLE' AND id IN (${placeholders})`).all(...ids)
    if (available.length !== ids.length) throw new Error('Uma ou mais crianças já não estão disponíveis. Atualize a lista.')

    const guardianResult = db.prepare(`
      INSERT INTO guardians (name, whatsapp, email, city, terms_accepted_at) VALUES (?, ?, ?, ?, ?)
    `).run(
      String(guardian.name).trim().slice(0, 120), String(guardian.whatsapp).replace(/\D/g, '').slice(0, 20),
      String(guardian.email || '').trim().slice(0, 160), String(guardian.city || '').trim().slice(0, 100), now.toISOString(),
    )
    const reservationId = randomUUID()
    const expiresAt = new Date(now.getTime() + settings.reservationMinutes * 60_000).toISOString()
    db.prepare(`INSERT INTO reservations (id, guardian_id, status, expires_at) VALUES (?, ?, 'RESERVED', ?)`)
      .run(reservationId, guardianResult.lastInsertRowid, expiresAt)

    const addItem = db.prepare(`INSERT INTO reservation_items (reservation_id, child_id, status) VALUES (?, ?, 'RESERVED')`)
    const reserveChild = db.prepare(`UPDATE children SET status = 'RESERVED' WHERE id = ? AND status = 'AVAILABLE'`)
    for (const id of ids) {
      if (reserveChild.run(id).changes !== 1) throw new Error('Uma ou mais crianças já não estão disponíveis. Atualize a lista.')
      addItem.run(reservationId, id)
    }
    return { id: reservationId, expiresAt, children: getReservedChildren(db, reservationId) }
  })
  return reserve()
}

function getReservedChildren(db, reservationId) {
  return db.prepare(`
    SELECT c.id, c.public_code AS publicCode, c.gender_label AS genderLabel,
      c.clothing_size AS clothingSize, c.pants_size AS pantsSize,
      c.shoe_size AS shoeSize, c.toy_suggestion AS toySuggestion
    FROM reservation_items i JOIN children c ON c.id = i.child_id
    WHERE i.reservation_id = ? ORDER BY c.id
  `).all(reservationId)
}

export function confirmReservation(db, reservationId, now = new Date()) {
  expireReservations(db, now)
  const confirm = db.transaction(() => {
    const reservation = db.prepare(`SELECT * FROM reservations WHERE id = ?`).get(reservationId)
    if (!reservation || reservation.status !== 'RESERVED') throw new Error('Esta reserva não está mais ativa. Escolha novamente.')
    const children = getReservedChildren(db, reservationId)
    const changes = db.prepare(`UPDATE children SET status = 'SPONSORED' WHERE id IN
      (SELECT child_id FROM reservation_items WHERE reservation_id = ? AND status = 'RESERVED') AND status = 'RESERVED'`).run(reservationId)
    if (changes.changes !== children.length) throw new Error('Não foi possível confirmar todos os itens da reserva.')
    db.prepare(`UPDATE reservation_items SET status = 'CONFIRMED' WHERE reservation_id = ? AND status = 'RESERVED'`).run(reservationId)
    db.prepare(`UPDATE reservations SET status = 'CONFIRMED', confirmed_at = ? WHERE id = ?`).run(now.toISOString(), reservationId)
    return { ...reservation, status: 'CONFIRMED', children }
  })
  return confirm()
}

export function cancelReservation(db, reservationId) {
  const cancel = db.transaction(() => {
    const reservation = db.prepare(`SELECT status FROM reservations WHERE id = ?`).get(reservationId)
    if (!reservation || reservation.status !== 'RESERVED') return false
    db.prepare(`UPDATE reservations SET status = 'CANCELLED' WHERE id = ?`).run(reservationId)
    db.prepare(`UPDATE reservation_items SET status = 'CANCELLED' WHERE reservation_id = ? AND status = 'RESERVED'`).run(reservationId)
    db.prepare(`UPDATE children SET status = 'AVAILABLE' WHERE id IN
      (SELECT child_id FROM reservation_items WHERE reservation_id = ? AND status = 'CANCELLED') AND status = 'RESERVED'`).run(reservationId)
    return true
  })
  return cancel()
}

export function getPublicData(db) {
  expireReservations(db)
  const settings = getSettings(db)
  const rows = db.prepare(`SELECT * FROM children WHERE status != 'CANCELLED' ORDER BY id`).all()
  const children = rows.map((row) => {
    const child = { id: row.id, publicCode: row.public_code, status: row.status }
    if (row.status !== 'RESERVED') {
      if (settings.publicFields.includes('gender')) child.genderLabel = row.gender_label
      if (settings.publicFields.includes('age')) child.ageLabel = row.age_label
    }
    if (row.status === 'AVAILABLE') {
      if (settings.publicFields.includes('clothingSize')) child.clothingSize = row.clothing_size
      if (settings.publicFields.includes('pantsSize')) child.pantsSize = row.pants_size
      if (settings.publicFields.includes('shoeSize')) child.shoeSize = row.shoe_size
      if (settings.publicFields.includes('toySuggestion')) child.toySuggestion = row.toy_suggestion
      if (settings.publicFields.includes('photo') && row.photo_authorized && row.photo_url) child.photoUrl = row.photo_url
    }
    return child
  })
  const counts = db.prepare(`SELECT status, COUNT(*) AS count FROM children GROUP BY status`).all()
    .reduce((result, row) => ({ ...result, [row.status]: row.count }), {})
  return { campaign: settings, children, counts }
}

export function getAdminChildren(db, filters = {}) {
  expireReservations(db)
  const clauses = []
  const values = []
  if (filters.status && childStatuses.includes(filters.status)) {
    clauses.push('c.status = ?')
    values.push(filters.status)
  }
  if (filters.gender) {
    clauses.push('c.gender_label = ?')
    values.push(String(filters.gender).slice(0, 40))
  }
  if (filters.age) {
    clauses.push('c.age_label LIKE ?')
    values.push(`%${String(filters.age).slice(0, 40)}%`)
  }
  if (filters.clothingSize) {
    clauses.push('c.clothing_size LIKE ?')
    values.push(`%${String(filters.clothingSize).slice(0, 40)}%`)
  }
  if (filters.shoeSize) {
    clauses.push('c.shoe_size LIKE ?')
    values.push(`%${String(filters.shoeSize).slice(0, 40)}%`)
  }
  if (filters.search) {
    clauses.push('(c.private_name LIKE ? OR c.public_code LIKE ?)')
    const query = `%${String(filters.search).slice(0, 80)}%`
    values.push(query, query)
  }
  return db.prepare(`
    SELECT c.id, c.public_code AS publicCode, c.private_name AS privateName, c.age_label AS ageLabel,
      c.gender_label AS genderLabel,
      c.clothing_size AS clothingSize, c.shoe_size AS shoeSize, c.toy_suggestion AS toySuggestion,
      c.observations, c.photo_url AS photoUrl, c.name_authorized AS nameAuthorized,
      c.photo_authorized AS photoAuthorized, c.status,
      g.name AS guardianName, g.whatsapp AS guardianWhatsapp,
      d.delivered_at AS deliveredAt, d.received_by AS receivedBy, d.observation AS deliveryObservation
    FROM children c
    LEFT JOIN reservation_items i ON i.child_id = c.id AND i.status IN ('CONFIRMED', 'DELIVERED')
    LEFT JOIN reservations r ON r.id = i.reservation_id
    LEFT JOIN guardians g ON g.id = r.guardian_id
    LEFT JOIN delivery_records d ON d.id = (SELECT MAX(id) FROM delivery_records WHERE child_id = c.id)
    ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
    ORDER BY c.id
  `).all(...values)
}

export function deleteChild(db, id) {
  const child = db.prepare('SELECT status FROM children WHERE id = ?').get(id)
  if (!child) return false
  if (!['AVAILABLE', 'CANCELLED'].includes(child.status)) throw new Error('Somente registros disponíveis ou cancelados podem ser excluídos.')
  db.prepare('DELETE FROM children WHERE id = ?').run(id)
  return true
}

export function recordDelivery(db, childId, input, now = new Date()) {
  const child = db.prepare(`SELECT status FROM children WHERE id = ?`).get(childId)
  if (!child || !['SPONSORED', 'DELIVERED'].includes(child.status)) throw new Error('A criança precisa estar apadrinhada para registrar a entrega.')
  const deliveredAt = String(input.deliveredAt || now.toISOString().slice(0, 10)).slice(0, 20)
  const receivedBy = String(input.receivedBy || '').trim().slice(0, 120)
  if (!receivedBy) throw new Error('Informe quem recebeu o presente.')
  const save = db.transaction(() => {
    db.prepare('INSERT INTO delivery_records (child_id, delivered_at, received_by, observation) VALUES (?, ?, ?, ?)')
      .run(childId, deliveredAt, receivedBy, String(input.observation || '').slice(0, 1000))
    db.prepare(`UPDATE children SET status = 'DELIVERED' WHERE id = ?`).run(childId)
    db.prepare(`UPDATE reservation_items SET status = 'DELIVERED' WHERE child_id = ? AND status = 'CONFIRMED'`).run(childId)
  })
  save()
}

export function getDashboard(db) {
  expireReservations(db)
  const counts = db.prepare(`SELECT status, COUNT(*) AS count FROM children GROUP BY status`).all()
    .reduce((result, row) => ({ ...result, [row.status]: row.count }), {})
  const sponsors = db.prepare(`
    SELECT g.id, g.name, g.whatsapp, g.email, g.city, r.confirmed_at AS confirmedAt,
      GROUP_CONCAT(c.public_code, ', ') AS children
    FROM guardians g JOIN reservations r ON r.guardian_id = g.id
    JOIN reservation_items i ON i.reservation_id = r.id
    JOIN children c ON c.id = i.child_id WHERE r.status = 'CONFIRMED'
    GROUP BY g.id ORDER BY r.confirmed_at DESC
  `).all()
  return { counts, sponsors }
}

export function getSession(db, tokenHash, now = new Date()) {
  if (!tokenHash) return false
  const session = db.prepare('SELECT expires_at FROM admin_sessions WHERE token_hash = ?').get(tokenHash)
  if (!session || session.expires_at <= now.toISOString()) {
    db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(tokenHash)
    return false
  }
  return true
}