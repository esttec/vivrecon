// Shared on-device receipt OCR used by the Eating, House and Clothing pages.
// Loads Tesseract.js from a CDN on first use and returns the receipt total.

function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract)
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
    s.onload = () => resolve(window.Tesseract)
    s.onerror = reject
    document.head.appendChild(s)
  })
}

// Sum the priced lines on a receipt into a single total, skipping
// total/tax/card summary lines.
function receiptTotal(text) {
  const priceRe = /(\d{1,3}[.,]\d{2})\s*[€A-Za-z]?\s*$/
  const skip = /summa|kokku|total|sum|kaart|sularaha|tagasi|käibemaks|\bkm\b|vat|balance|change/i
  let total = 0
  for (const raw of (text || '').split('\n')) {
    const line = raw.trim()
    const m = line.match(priceRe)
    if (!m) continue
    const price = parseFloat(m[1].replace(',', '.'))
    const name = line.slice(0, m.index).trim()
    if (!price || price > 500 || name.length < 2 || skip.test(name)) continue
    total += price
  }
  return total
}

// Recognise a receipt image and return the summed total (0 if nothing found).
export async function scanReceiptTotal(file) {
  const Tesseract = await loadTesseract()
  const { data } = await Tesseract.recognize(file, 'eng+est')
  return receiptTotal(data.text || '')
}
