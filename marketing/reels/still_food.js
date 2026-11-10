const { chromium } = require('playwright')
;(async () => {
  const lang = process.argv[2]
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } })
  await p.goto('file://' + __dirname + `/food_${lang}.html`); await p.evaluate(() => document.fonts.ready)
  const ts = [0.8, 4.8, 8.6, 12.3, 15.4, 19.2, 23]
  for (const t of ts) { await p.evaluate(t => render(t), t); await p.screenshot({ path: `fd_${lang}_${t}.png` }) }
  const r = await p.evaluate(() => [...['b4','bsub','b6']].map(id => { const e = document.getElementById(id).getBoundingClientRect(); return [id, Math.round(e.x+e.width/2), Math.round(e.y+e.height/2)] }))
  console.log(JSON.stringify(r)); await b.close()
})()
