import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDatabase, getAdminChildren } from './store.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const inputPath = resolve(root, 'private-data/children.json')
const outputPath = resolve(root, process.env.PRIVATE_PDF_PATH || 'data/lista-criancas.pdf')
const children = JSON.parse(readFileSync(inputPath, 'utf8'))
const db = createDatabase()
const adminChildren = getAdminChildren(db)
const adminByCode = new Map(adminChildren.map((child) => [child.publicCode, child]))

function ascii(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
}

function pdfText(value) {
  return ascii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

const femaleNames = new Set(['ALEXIA', 'AYLA', 'THAYLA', 'EMANUELI', 'JOANA', 'MARIA', 'CIBELE', 'ANGELINA', 'BRENDA', 'BEATRIZ', 'KYARA', 'ANDREZA', 'KATHYANE', 'ESTHER', 'LARA', 'ANA', 'ELISE', 'LUNA', 'LAYLA', 'AYLLA', 'REBECA', 'ANALICE', 'JULIA', 'ELOAH', 'VALENTINA'])
const maleNames = new Set(['HENRY', 'LEVY', 'LUIZ', 'ARTHUR', 'VICTOR', 'DARK', 'GABRIEL', 'ANTHONY', 'THAUN', 'NATHANAEL', 'HEITOR', 'LAZARO', 'MOISES', 'LUCCA', 'MIGUEL', 'THIERRY', 'GAEL', 'DAVI', 'HYAGO'])

function inferredGender(name) {
  const firstName = ascii(name).trim().split(/\s+/)[0].toUpperCase()
  if (femaleNames.has(firstName)) return 'Menina'
  if (maleNames.has(firstName)) return 'Menino'
  return 'A confirmar'
}

function text(value, x, y, size = 9, bold = false) {
  return `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td (${pdfText(value)}) Tj ET\n`
}

function line(x1, y1, x2, y2) {
  return `${x1} ${y1} m ${x2} ${y2} l S\n`
}

const pageWidth = 595
const pageHeight = 842
const margin = 40
const rowHeight = 21
const rowsPerPage = 31
const pages = []

for (let start = 0; start < children.length; start += rowsPerPage) {
  const pageChildren = children.slice(start, start + rowsPerPage)
  let content = '0.18 0.27 0.20 rg\n'
  content += text('NATAL SOLIDARIO 2026 - LISTA DE CRIANCAS', margin, 800, 15, true)
  content += text(`Registros ${start + 1} a ${start + pageChildren.length}`, margin, 780, 9)
  content += '0.82 0.82 0.76 RG 0.6 w\n'
  content += line(margin, 758, pageWidth - margin, 758)
  content += text('N.', 44, 744, 9, true)
  content += text('Crianca', 82, 744, 9, true)
  content += text('Sexo', 250, 744, 9, true)
  content += text('Idade', 300, 744, 9, true)
  content += text('Roupa', 340, 744, 9, true)
  content += text('Calcado', 380, 744, 9, true)
  content += text('Padrinho(a)', 425, 744, 9, true)
  content += text('Telefone', 490, 744, 9, true)
  content += text('Status', 550, 744, 8, true)
  content += line(margin, 735, pageWidth - margin, 735)

  pageChildren.forEach((child, index) => {
    const y = 720 - index * rowHeight
    const number = String(start + index + 1).padStart(3, '0')
    const status = child.sponsored ? 'Apadrinhada' : 'Disponivel'
    const adminChild = adminByCode.get(`NS-${number}`)
    const sponsorName = adminChild?.guardianName || (child.sponsored ? 'Registro importado' : '-')
    const sponsorPhone = adminChild?.guardianWhatsapp || '-'
    content += text(`NS-${number}`, 42, y, 8)
    content += text(child.privateName, 78, y, 7)
    content += text(inferredGender(child.privateName), 205, y, 7)
    content += text(child.ageLabel, 300, y, 7)
    content += text(child.clothingSize, 340, y, 7)
    content += text(child.shoeSize, 385, y, 7)
    content += text(sponsorName, 425, y, 7)
    content += text(sponsorPhone, 490, y, 7)
    content += text(status, 550, y, 7)
    content += '0.88 0.88 0.84 RG 0.35 w\n'
    content += line(margin, y - 7, pageWidth - margin, y - 7)
  })

  content += '0.18 0.27 0.20 rg\n'
  content += text(`Pagina ${pages.length + 1}`, pageWidth - 90, 28, 8)
  pages.push(content)
}

const objects = []
objects.push('<< /Type /Catalog /Pages 2 0 R >>')
objects.push('<< /Type /Pages /Kids [PLACEHOLDER] /Count COUNT >>')
objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

const pageRefs = []
for (const content of pages) {
  const contentObject = objects.length + 1
  objects.push(`<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}endstream`)
  const pageObject = objects.length + 1
  objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObject} 0 R >>`)
  pageRefs.push(`${pageObject} 0 R`)
}
objects[1] = objects[1].replace('PLACEHOLDER', pageRefs.join(' ')).replace('COUNT', String(pages.length))

let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'
const offsets = [0]
objects.forEach((object, index) => {
  offsets.push(Buffer.byteLength(pdf, 'ascii'))
  pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
})
const xrefOffset = Buffer.byteLength(pdf, 'ascii')
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
for (let index = 1; index <= objects.length; index += 1) {
  pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
}
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, Buffer.from(pdf, 'binary'))
db.close()
console.log(`PDF criado: ${outputPath} (${children.length} criancas, ${pages.length} paginas)`)
