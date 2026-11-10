# vivrecon Reels — how the videos are made

Everything here rebuilds the reels from scratch, so any new chat can change a text or colour and render again.
Needs: Node + `playwright` (Chromium), Python 3 + numpy/scipy, ffmpeg, fonts Lora and Inter.

| File | What it is |
|---|---|
| `reel_ru.html` | Base page: styles (cream background, Lora headlines, cards, yellow tiles, highlighter) used by the other reels |
| `build_food.py` | Food reel ("Jäi vähe raha toiduks?"). `python3 build_food.py et` / `ru` → `food_et.html`; `ACCENT=navy python3 build_food.py et` → navy version |
| `render_food_et.js` | Renders a page frame by frame (30 fps, 24 s) to MP4 via ffmpeg. Change the html name inside for other pages |
| `still_food.js` | Saves still frames for a quick check |
| `music_food.py` | Original 160 BPM electro-pop track (`music_food.wav`), whooshes on the scene cuts, clicks on cursor presses |
| `cards.py` | Still 1080×1920 cards for the 50/30/20 reel |

Render steps (food reel, Estonian, navy):
```
ACCENT=navy python3 build_food.py et
sed 's#/food_et.html#/food_et_navy.html#' render_food_et.js > r.js && node r.js video.mp4
python3 music_food.py
ffmpeg -i video.mp4 -i music_food.wav -c:v copy -c:a aac -shortest final.mp4
```
Colours: yellow `#ffd84d`, navy `#1e2f6b`, brand blue `#4f6fe0`, cream background `#f2f0e9`.
Scene timeline is the `S={...}` object in the page script; scene cuts are on the 160 BPM beat (multiples of 0.375 s).

## Elatusmiinimum 220 (Oct 2026)
`ACCENT=navy python3 build_220.py et|ru` -> min220_<lang>_navy.html, then render like render_food_et.js (swap the html name) + music_food.wav (same 24 s timing).

## Plaan "üks number" (Oct 2026)
`ACCENT=navy python3 build_plan.py et|ru` -> plan_<lang>_navy.html; render like render_food_et.js with DUR = 39 + music_plan.wav (39 s).
