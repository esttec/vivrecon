# Builds the "potatoes vs pasta" reel page for one language: python3 build_food.py et|ru
import sys, re
lang = sys.argv[1]
src = open('reel_ru.html', encoding='utf-8').read()
head = src[:src.index('</head>')]
import os
if os.environ.get('ACCENT') == 'navy':          # navy instead of yellow: tiles, highlighter (white text), arrow circle
    head = (head.replace('#tiles div{background:#ffd84d', '#tiles div{background:#1e2f6b')
                .replace('h1 .hl{background:linear-gradient(#ffd84d,#ffd84d)', 'h1 .hl{color:#fff;background:linear-gradient(#1e2f6b,#1e2f6b)')
                .replace('background:#ffd84d;color:#1f2433', 'background:#4f6fe0;color:#fff'))
    assert head.count('#ffd84d') == 0, head.count('#ffd84d')

T = {
 'et': dict(
  intro='Elatusmiinimum Eestis<br><span class="hl">220 € kuus</span>', introS='toimetulekupiir 2026',
  h1='Miks riik ütleb,<br><span class="hl">et sellest piisab?</span>', c1t='Meie plaan: 220 € kuus', inc=['💰 Säästud','🛒 Toit','🌐 Internet','📱 Telefon','🧾 Oma kulud'],
  h2='Mis selle eest<br><span class="hl">saab osta?</span>', food='toit', day='päevas toidule', own='oma kulud', ownd='päevas oma kuludeks', per='30 päeva',
  h3='Ja ikkagi<br><span class="hl">säästame 22 €</span>', savL='Säästud novembris', pct='10% sissetulekust – iga kuu',
  h4='Test: terve<br><span class="hl">november 220 €</span>', bud='November · eelarve', left='Jääk', spentL='Kulutatud', daysL='päeva jäänud',
  h5='Kas õnnestub?<br><span class="hl">Jälgi meid!</span>', sub='Telli', share='Jaga', more='Iga nädal näitame, kuhu raha läks 💙',
  tag='Sinu raha. Selge pilt.', cta='Alusta tasuta', loc='et-EE'),
 'ru': dict(
  intro='Прожиточный минимум<br>в Эстонии <span class="hl">220 €</span>', introS='toimetulekupiir 2026',
  h1='Почему государство<br><span class="hl">считает, что хватит?</span>', c1t='Наш план: 220 € в месяц', inc=['💰 Сбережения','🛒 Еда','🌐 Интернет','📱 Телефон','🧾 Свои расходы'],
  h2='Что на это<br><span class="hl">можно купить?</span>', food='еда', day='в день на еду', own='свои расходы', ownd='в день на свои расходы', per='30 дней',
  h3='И всё равно<br><span class="hl">откладываем 22 €</span>', savL='Сбережения в ноябре', pct='10% от дохода – каждый месяц',
  h4='Тест: весь<br><span class="hl">ноябрь на 220 €</span>', bud='Ноябрь · бюджет', left='Остаток', spentL='Потрачено', daysL='дней осталось',
  h5='Получится?<br><span class="hl">Следи за нами!</span>', sub='Подпишись', share='Поделись', more='Каждую неделю покажем, куда ушли деньги 💙',
  tag='Твои деньги. Ясная картина.', cta='Начни бесплатно', loc='ru-RU'),
}[lang]
AMT = [22, 140, 22, 5, 31]
inc = ''.join(f'<div class="shop" id="in{i}" style="padding:18px 0"><div class="ico" style="background:#e8eefc">{x.split()[0]}</div><div>{" ".join(x.split()[1:])}</div><div class="amt" style="color:{"#1e8a4c" if i==0 else "#1f2433"}">{a} €</div></div>' for i, (x, a) in enumerate(zip(T['inc'], AMT)))
assert sum(AMT) == 220
body = f'''
<div class="scene" id="s0"><div style="position:absolute;left:90px;top:200px" class="logo">viv<b>recon</b></div>
  <h1 style="top:700px;font-size:{104 if lang=='et' else 92}px">{T['intro']}</h1>
  <div id="introS" style="position:absolute;left:90px;top:1060px;font-size:40px;font-weight:600;color:#6b7390">{T['introS']}</div></div>

<div class="scene" id="s1"><h1 style="top:260px;font-size:{92 if lang=='et' else 80}px">{T['h1']}</h1>
  <div class="card" style="top:640px;padding:30px 44px"><div class="lbl" style="font-size:30px">{T['c1t']}</div>{inc}</div></div>

<div class="scene" id="s2"><h1 style="top:300px;font-size:100px">{T['h2']}</h1>
  <div class="card" style="top:740px;text-align:center"><div class="lbl" style="font-size:34px">140 € {T['food']} ÷ {T['per']}</div>
    <div class="big" id="perday" style="font-size:150px;margin-top:10px">0 €</div><div class="lbl" style="font-size:36px">{T['day']}</div>
    <div id="permeal" style="margin-top:40px;padding-top:30px;border-top:2px solid #eef0f4;opacity:0"><div class="lbl" style="font-size:30px">31 € {T['own']} ÷ {T['per']}</div><div class="big" style="font-size:90px;color:#c0392b">1,03 €</div><div class="lbl" style="font-size:30px">{T['ownd']}</div></div></div></div>

<div class="scene" id="s3"><h1 style="top:300px;font-size:{100 if lang=='et' else 84}px">{T['h3']}</h1>
  <div class="card" style="top:740px"><div class="lbl" style="font-size:32px">💰 {T['savL']}</div>
    <div class="big" id="sav" style="font-size:150px;color:#1e8a4c;margin-top:10px">0 €</div>
    <div style="height:36px;border-radius:18px;background:#eef0f4;margin-top:30px;overflow:hidden"><div id="savbar" style="height:100%;width:0;background:#1e8a4c;border-radius:18px"></div></div>
    <div class="lbl" id="tip3" style="margin-top:24px;font-size:32px;opacity:0">{T['pct']}</div></div></div>

<div class="scene" id="s4"><h1 style="top:260px;font-size:{100 if lang=='et' else 92}px">{T['h4']}</h1>
  <div class="card" style="top:700px"><div class="lbl">{T['bud']}</div>
    <div class="kpi"><div><div class="lbl">{T['left']}</div><div class="big" id="left" style="color:#1e8a4c">220 €</div></div><div><div class="lbl">{T['spentL']}</div><div class="big" id="spent4">0 €</div></div></div>
    <div id="cal" style="display:grid;grid-template-columns:repeat(7,1fr);gap:10px;margin-top:30px"></div>
    <div class="lbl" style="margin-top:20px;font-size:30px"><span id="dleft">30</span> {T['daysL']}</div></div></div>

<div class="scene" id="s5"><h1 style="top:360px;font-size:{110 if lang=='et' else 96}px">{T['h5']}</h1>
  <div style="position:absolute;left:0;right:0;top:860px;text-align:center">
    <div class="btn" id="bsub" style="background:#e5534b;font-size:52px;padding:34px 70px">🔔 {T['sub']}</div><br>
    <div class="btn" id="bsh" style="margin-top:40px;font-size:52px;padding:34px 70px;background:#fff;color:#1f2433;box-shadow:0 10px 30px rgba(0,0,0,.12)">↗ {T['share']}</div>
    <div style="font-size:40px;font-weight:600;color:#6b7390;margin:60px 90px 0;line-height:1.3">{T['more']}</div></div></div>

<div class="scene" id="s6"><div style="position:absolute;left:0;right:0;top:760px;text-align:center"><div class="logo" style="font-size:150px">viv<b>recon</b></div>
  <div style="font-size:42px;color:#6b7390;margin-top:20px;font-weight:600">{T['tag']}</div>
  <div class="btn" id="b6" style="margin-top:70px">{T['cta']} <i>→</i></div>
  <div style="font-size:40px;font-weight:700;margin-top:60px;color:#4f6fe0">vivrecon.com</div></div></div>

<div id="tiles"></div>
<svg id="cursor" viewBox="0 0 24 24"><path d="M9 2v11.5l-2.2-2.1a1.6 1.6 0 0 0-2.3 2.3L9.5 19c1 1 2.2 1.5 3.6 1.5H15a5 5 0 0 0 5-5v-4.5a1.5 1.5 0 0 0-3 0V10a1.5 1.5 0 0 0-3 0v-.5a1.5 1.5 0 0 0-3 0V2a1.5 1.5 0 0 0-2 0z" fill="#fff" stroke="#111" stroke-width="1.3"/></svg>

<script>
const $=id=>document.getElementById(id)
const cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x))
const ease=x=>{{x=cl(x);return 1-Math.pow(1-x,3)}}
const back=x=>{{x=cl(x);const c=1.7;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)}}
const seg=(t,a,b)=>cl((t-a)/(b-a))
const END=38.25
const S={{s0:[0,2.25],s1:[2.25,8.25],s2:[8.25,14.25],s3:[14.25,20.25],s4:[20.25,26.25],s5:[26.25,32.25],s6:[32.25,END]}}
const K=1.6 // slower: stretch in-scene animation
const euro=v=>Math.round(v).toLocaleString('{T['loc']}')+' €'
function vis(id,t){{const [a,b]=S[id];const i=a===0?1:seg(t,a,a+.01),o=b===END?1:1-seg(t,b-.01,b);$(id).style.opacity=Math.min(i,o);return (t-a)/K}}
function slide(el,p,dy=80){{el.style.opacity=ease(p);el.style.transform=`translateY(${{(1-ease(p))*dy}}px)`}}
function pop(el,p){{el.style.transform=`scale(${{p>0?back(p):0}})`}}
let cur=null
function cursor(x,y,show,press){{cur=[x,y,show,press]}}
const TILES=[...Array(12*21)].map((_,i)=>{{const d=document.createElement('div');$('tiles').appendChild(d);return {{el:d,r:((i*7919)%997)/997}}}})
function tiles(t){{const cuts=Object.values(S).map(w=>w[0]).filter(x=>x>0);const b=cuts.reduce((p,c)=>Math.abs(c-t)<Math.abs(p-t)?c:p,99)
  TILES.forEach(({{el,r}})=>{{const on=b-.38+r*.28,off=b+.04+r*.3;const v=t>=on&&t<off?1:0;el.style.opacity=v;el.style.transform=`scale(${{v?1:.3}})`}})}}
function marker(t){{document.querySelectorAll('.scene').forEach(sc=>{{const w=S[sc.id];const p=ease(seg(t,w[0]+.3,w[0]+.7));sc.querySelectorAll('.hl').forEach(h=>h.style.backgroundSize=(p*100)+'% 100%')}})}}
window.render=function(t){{
  tiles(t); marker(t); cur=[0,0,0,false]; let l
  l=vis('s0',t); slide($('introS'),seg(l,.6,1),20)
  l=vis('s1',t); [0,1,2,3,4].forEach(i=>slide($('in'+i),seg(l,.3+i*.22,.6+i*.22),50))
  l=vis('s2',t); $('perday').textContent=(4.67*ease(seg(l,.3,1.3))).toFixed(2).replace('.',',')+' €'; slide($('permeal'),seg(l,1.6,2),40)
  l=vis('s3',t); const sv=ease(seg(l,.4,1.6)); $('sav').textContent=Math.round(22*sv)+' €'; $('savbar').style.width=(sv*100)+'%'; slide($('tip3'),seg(l,1.6,2),40)
  l=vis('s4',t); const d=Math.min(30,Math.floor(seg(l,.4,3.2)*30.99)); const sp=d*198/30
  $('left').textContent=euro(220-sp); $('spent4').textContent=euro(sp); $('dleft').textContent=30-d
  if(!$('cal').children.length) for(let i=1;i<=30;i++){{const c=document.createElement('div');c.textContent=i;c.style.cssText='height:62px;border-radius:14px;display:grid;place-items:center;font-size:28px;font-weight:700;background:#f3f4f8;color:#9aa1b5';$('cal').appendChild(c)}}
  ;[...$('cal').children].forEach((c,i)=>{{const on=i<d;c.style.background=on?'#1e2f6b':'#f3f4f8';c.style.color=on?'#fff':'#9aa1b5'}})
  l=vis('s5',t); pop($('bsub'),seg(l,.3,.7)); pop($('bsh'),seg(l,.6,1)); const c5=l>1.9&&l<2.1
  if(t>=S.s5[0]&&t<S.s5[1]) {{ cursor(640,920,l>1.3&&l<3.2?1:0,c5); if(l>2) $('bsub').innerHTML='✓ '+`{T['sub']}` }}
  l=vis('s6',t); pop($('b6'),seg(l,.4,.9))
  if(t>=S.s6[0]) cursor(700,1180,l>1.2?1:0,l>1.9&&l<2.1)
  const c=$('cursor'); c.style.opacity=cur[2]; c.style.left=cur[0]+'px'; c.style.top=cur[1]+'px'; c.style.transform=`scale(${{cur[3]?.85:1}})`
}}
render(0)
</script></body></html>'''
open(f'min220_{lang}' + ('_navy' if os.environ.get('ACCENT') == 'navy' else '') + '.html', 'w', encoding='utf-8').write(head + '</head><body>' + body)
print('ok', lang)
