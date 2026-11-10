const { chromium } = require('playwright'); const { spawn } = require('child_process')
;(async () => {
  const FPS = 30, DUR = 24, out = process.argv[2]
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } })
  await p.goto('file://' + __dirname + '/food_et.html'); await p.evaluate(() => document.fonts.ready)
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'inherit'] })
  for (let i = 0; i < FPS * DUR; i++) {
    await p.evaluate(t => render(t), i / FPS)
    ff.stdin.write(await p.screenshot({ type: 'jpeg', quality: 92 }))
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close()
})()
