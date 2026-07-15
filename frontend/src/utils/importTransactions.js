// Parse a bank statement (CSV or PDF) into [{ date, description, amount }].
// amount is signed: negative = expense (money out), positive = income (money in).
// CSV is reliable; PDF is best-effort because statement layouts vary a lot.

// ── Number parsing (handles "1 234,56", "1,234.56", "-12,34", "(12.34)") ──────
export function parseAmount(raw) {
  if (raw == null) return null
  let s = String(raw).trim()
  if (!s) return null
  let sign = 1
  if (/^\(.*\)$/.test(s)) { sign = -1; s = s.slice(1, -1) }
  if (/[-−]/.test(s)) sign = -1
  if (/^\+/.test(s)) sign = 1
  s = s.replace(/[^0-9.,]/g, '')
  if (!s) return null
  const lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.')
  if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.') // comma decimal
  else s = s.replace(/,/g, '')                                        // dot decimal
  const n = parseFloat(s)
  return isNaN(n) ? null : sign * Math.abs(n)
}

const DATE_RE = /(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4})/
const isDate = s => DATE_RE.test(String(s || '').trim())

// ── CSV ───────────────────────────────────────────────────────────────────────
function splitCsvLine(line, delim) {
  const out = []; let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++ } else inQ = !inQ }
    else if (c === delim && !inQ) { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out.map(x => x.trim())
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (!lines.length) return []
  const delim = (text.match(/;/g) || []).length > (text.match(/,/g) || []).length ? ';'
    : (text.match(/\t/g) || []).length > (text.match(/,/g) || []).length ? '\t' : ','
  const rows = lines.map(l => splitCsvLine(l, delim))

  const header = rows[0].map(h => h.toLowerCase())
  const looksHeader = header.some(h =>
    /date|kuupäev|aeg|amount|summa|sum|selgitus|description|saaja|payee|details|narrative|deebet|kreedit|debit|credit/.test(h))

  let dateIdx = -1, descIdx = -1, amtIdx = -1, debIdx = -1, creIdx = -1
  if (looksHeader) {
    header.forEach((h, i) => {
      if (dateIdx < 0 && /date|kuupäev|aeg|data/.test(h)) dateIdx = i
      if (descIdx < 0 && /selgitus|description|saaja|payee|details|narrative|merchant|nimi|reference|beneficiary/.test(h)) descIdx = i
      if (debIdx < 0 && /deebet|debit|väljaminek/.test(h)) debIdx = i
      if (creIdx < 0 && /kreedit|credit|laekumine/.test(h)) creIdx = i
      if (amtIdx < 0 && /amount|summa|sum|makse|turnover|tehingu summa/.test(h) && !/deebet|kreedit|debit|credit/.test(h)) amtIdx = i
    })
  }

  const dataRows = looksHeader ? rows.slice(1) : rows
  const out = []
  for (const cols of dataRows) {
    if (cols.length < 2) continue

    const dateVal = dateIdx >= 0 ? cols[dateIdx] : cols.find(isDate)
    if (!dateVal) continue

    let amount = null
    if (amtIdx >= 0) {
      amount = parseAmount(cols[amtIdx])
    } else if (debIdx >= 0 || creIdx >= 0) {
      const deb = debIdx >= 0 ? parseAmount(cols[debIdx]) : null
      const cre = creIdx >= 0 ? parseAmount(cols[creIdx]) : null
      if (cre) amount = Math.abs(cre)
      else if (deb) amount = -Math.abs(deb)
    } else {
      // Infer: last cell that looks like a decimal money value (not the date).
      for (let i = cols.length - 1; i >= 0; i--) {
        if (isDate(cols[i])) continue
        if (!/[.,]\d{1,2}\s*$/.test(cols[i]) && !/^[-−+]?\d+$/.test(cols[i])) continue
        const v = parseAmount(cols[i])
        if (v !== null) { amount = v; break }
      }
    }
    if (amount === null || amount === 0) continue

    let desc = descIdx >= 0 ? cols[descIdx] : ''
    if (!desc) {
      desc = cols.filter(c => c && !isDate(c) && parseAmount(c) === null)
        .sort((a, b) => b.length - a.length)[0] || ''
    }
    if (!desc || desc.length < 2) continue

    out.push({ date: String(dateVal).trim(), description: desc.trim().slice(0, 255), amount })
  }
  return out
}

// ── PDF (best-effort) ─────────────────────────────────────────────────────────
async function pdfToText(file) {
  const pdfjs = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.min.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs'
  const data = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
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

function parsePdfLines(text) {
  const out = []
  const amtRe = /[-−+]?\d[\d  .]*[.,]\d{2}/g
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line.length < 6 || line.length > 200) continue
    const dm = line.match(DATE_RE)
    if (!dm) continue
    const amts = line.match(amtRe)
    if (!amts || !amts.length) continue
    const amtStr = amts[amts.length - 1]
    let amount = parseAmount(amtStr)
    if (amount === null || amount === 0) continue
    if (!/[-−(+]/.test(amtStr)) amount = -Math.abs(amount) // unsigned statement line → treat as expense
    let desc = line.replace(dm[0], '').replace(amtStr, '').replace(/\s+/g, ' ').trim()
    if (desc.length < 2) continue
    out.push({ date: dm[0], description: desc.slice(0, 255), amount })
  }
  return out
}

export async function parseStatement(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (ext === 'csv') return parseCsv(await file.text())
  if (ext === 'pdf') return parsePdfLines(await pdfToText(file))
  throw new Error('Unsupported file — use a CSV or PDF bank statement.')
}
