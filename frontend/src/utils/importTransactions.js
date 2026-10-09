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
  const lines = text.split(/\r\n|\r|\n/).filter(l => l.trim())
  if (!lines.length) return []
  const delim = (text.match(/;/g) || []).length > (text.match(/,/g) || []).length ? ';'
    : (text.match(/\t/g) || []).length > (text.match(/,/g) || []).length ? '\t' : ','
  const rows = lines.map(l => splitCsvLine(l, delim))

  const header = rows[0].map(h => h.toLowerCase())
  const looksHeader = header.some(h =>
    /date|päev|aeg|amount|summa|sum|selgitus|description|saaja|payee|details|narrative|deebet|kreedit|debit|credit/.test(h))

  let detIdx = -1, dateIdx = -1, descIdx = -1, amtIdx = -1, debIdx = -1, creIdx = -1, dcIdx = -1
  if (looksHeader) {
    header.forEach((h, i) => {
      if (dateIdx < 0 && /date|päev|aeg|data/.test(h)) dateIdx = i
      // skip IBAN/bank-code columns like "Saaja/maksja konto" (LHV, SEB)
      if (descIdx < 0 && !/konto|account|kood|code/.test(h) && /selgitus|description|saaja|payee|details|narrative|merchant|nimi|reference|beneficiary/.test(h)) descIdx = i
      // Swedbank/SEB/LHV: unsigned Summa + a "Deebet/Kreedit (D/C)" column holding D or K/C
      if (dcIdx < 0 && /(deebet|debit)\s*\/\s*(kreedit|krediit|credit)/.test(h)) { dcIdx = i; return }
      if (detIdx < 0 && /makse andmed|selgitus|details|description|narrative/.test(h)) detIdx = i
      if (debIdx < 0 && /deebet|debit|väljaminek/.test(h)) debIdx = i
      if (creIdx < 0 && /kreedit|credit|laekumine/.test(h)) creIdx = i
      if (amtIdx < 0 && /amount|summa|sum|makse|turnover|tehingu summa/.test(h) && !/deebet|kreedit|debit|credit/.test(h)) amtIdx = i
    })
  }

  const dataRows = looksHeader ? rows.slice(1) : rows
  const out = []
  for (const cols of dataRows) {
    if (cols.length < 2) continue
    // Swedbank adds opening/turnover/closing balance rows — not transactions
    if (cols.some(c => /^(algsaldo|lõppsaldo|käive|opening balance|closing balance|turnover)$/i.test(c))) continue

    const dateVal = dateIdx >= 0 ? cols[dateIdx] : cols.find(isDate)
    if (!dateVal) continue

    let amount = null
    if (amtIdx >= 0) {
      amount = parseAmount(cols[amtIdx])
      const dc = dcIdx >= 0 ? String(cols[dcIdx]).trim().toUpperCase() : ''
      if (amount !== null && dc === 'D') amount = -Math.abs(amount)
      else if (amount !== null && (dc === 'K' || dc === 'C')) amount = Math.abs(amount)
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
    if (!desc && detIdx >= 0) desc = cols[detIdx] // e.g. cash deposits have no payee name
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
  // The amount must END the line ("167,99-", "+25,55", "-12.34"); headers such as
  // "Aruande kuupäev : 09.10.2026 15:08:59 EEST" don't, so they are skipped.
  const endAmt = /\s([-−+]?\d{1,3}(?:[ \u00a0.]?\d{3})*[.,]\d{2})\s*([-−+])?$/
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line.length < 6 || line.length > 200) continue
    const dm = line.match(/^(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4})\s/) // row starts with its date
    if (!dm) continue
    const am = line.match(endAmt)
    if (!am) continue
    let amount = parseAmount(am[1])
    if (amount === null || amount === 0) continue
    const sign = am[2] || (/^[-−+]/.test(am[1]) ? am[1][0] : '')
    // Trailing/leading "-" = money out, "+" = money in (Luminor, Swedbank PDFs); unsigned → expense.
    amount = sign === '+' ? Math.abs(amount) : -Math.abs(amount)
    const desc = line.slice(dm[0].length, line.length - am[0].length)
      .replace(/^[A-Z0-9]{8,}\s+/, '') // bank archive code such as "B0621JHN"
      .replace(/\s+/g, ' ').trim()
    if (desc.length < 2 || /saldo|käive|balance|kokkuvõte/i.test(desc)) continue // balance/summary rows
    out.push({ date: dm[1], description: desc.slice(0, 255), amount })
  }
  return out
}

export async function parseStatement(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (ext === 'csv') return parseCsv(await file.text())
  if (ext === 'pdf') return parsePdfLines(await pdfToText(file))
  throw new Error('Unsupported file — use a CSV or PDF bank statement.')
}
