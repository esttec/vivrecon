// Parse an accounts file (CSV, XML or PDF) into [{ name, type, balance }].
// CSV/XML are parsed directly; PDF text is extracted with pdf.js (loaded from a
// CDN on demand) and scanned line-by-line. Bank layouts vary, so PDF is best-effort.

function normType(s) {
  const u = (s || '').toUpperCase()
  if (/CASH|НАЛИЧ|SULARAHA|KÄTEIN|BARGELD|ESPÈCE/.test(u)) return 'CASH'
  if (/INVEST|BROKER|STOCK|SIJOIT|INVESTEER|ANLAGE|ИНВЕСТ/.test(u)) return 'INVESTMENT'
  return 'BANK'
}

function num(s) {
  if (s == null) return null
  const cleaned = String(s).replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  const delim = (text.match(/;/g) || []).length > (text.match(/,/g) || []).length ? ';' : ','
  const rows = []
  for (const line of lines) {
    const cols = line.split(delim).map(c => c.trim().replace(/^"|"$/g, ''))
    if (cols.length < 2) continue
    const balance = num(cols[cols.length - 1])
    if (balance === null) continue // header row or non-numeric
    const name = cols[0]
    const type = cols.length >= 3 ? normType(cols[1]) : 'BANK'
    if (name) rows.push({ name, type, balance })
  }
  return rows
}

function parseXml(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const rows = []
  const nodes = doc.querySelectorAll('account, Account, ACCOUNT')
  nodes.forEach(n => {
    const child = tag => n.querySelector(tag)?.textContent?.trim()
    const name = child('name') || n.getAttribute('name') || ''
    const balance = num(child('balance') ?? n.getAttribute('balance'))
    const type = normType(child('type') ?? n.getAttribute('type'))
    if (name && balance !== null) rows.push({ name, type, balance })
  })
  return rows
}

async function pdfToText(file) {
  const pdfjs = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.min.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs'
  const data = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    // Rebuild real lines from item Y positions (pdf.js gives loose fragments).
    let lastY = null, line = ''
    for (const it of content.items) {
      const y = it.transform?.[5]
      if (lastY !== null && Math.abs(y - lastY) > 2) { text += line.trim() + '\n'; line = '' }
      line += it.str + ' '
      lastY = y
    }
    text += line.trim() + '\n'
  }
  return text
}

function parsePdfText(text) {
  // A "name" then an amount, optionally followed by a currency word.
  const re = /^(.{2,60}?)\s+([\-−]?\d[\d.,\s]*\d)\s*(?:€|£|\$|EUR|USD|GBP)?\s*$/i
  const rows = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line.length > 80) continue // whole-blob / paragraph lines aren't accounts
    const m = line.match(re)
    if (!m) continue
    const balance = num(m[2])
    const name = m[1].trim().slice(0, 80)
    if (name.length >= 2 && balance !== null && Math.abs(balance) < 1e12) {
      rows.push({ name, type: normType(name), balance })
    }
  }
  return rows
}

export async function parseAccountsFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (ext === 'csv') return parseCsv(await file.text())
  if (ext === 'xml') return parseXml(await file.text())
  if (ext === 'pdf') return parsePdfText(await pdfToText(file))
  throw new Error('Unsupported file — use CSV, XML or PDF.')
}
