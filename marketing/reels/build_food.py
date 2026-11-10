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
  intro='Jäi vähe raha<br><span class="hl">toiduks?</span>',
  h1='Ära kiirusta<br><span class="hl">tervist rikkuma</span>', pasta='🍝 Pasta', after='Täiskõhutunne', hours=['söömise järel','1 h','2 h','3 h'], hungry='Jälle näljane 😩',
  h2='Kokkuhoidlikum<br>ja <span class="hl">tervislikum</span>', h2s='Osta juurvilju makaronide asemel 🥔🥕', idx='Täiskõhutunde indeks', items=[('🥔 Keedukartul',323),('🍝 Valge pasta',119),('🍞 Valge sai',100)], src='Allikas: Holt jt, 1995 (valge sai = 100%)',
  h3='Täidab kõhu ja<br><span class="hl">vitamiinide normi</span>', plate='Juurviljad annavad', veg=[('🥔 Kartul','C-vitamiin, kaalium'),('🥕 Porgand','A-vitamiin'),('🥬 Kapsas','C- ja K-vitamiin'),('🟣 Peet','foolhape')], tip='Kõht täis ja vitamiinid käes',
  h4='Toidueelarve<br><span class="hl">jääb alles</span>', bud='Toit · oktoober', plan='Plaan (15%)', spent='Kulutatud', saved='Säästud', btn='🛒 Koosta nädala ostunimekiri',
  h5='Kas see nipp<br><span class="hl">aitas?</span>', sub='Telli', share='Jaga', more='Uued säästunipid iga nädal 💛',
  tag='Sinu raha. Selge pilt.', cta='Alusta tasuta', loc='et-EE'),
 'ru': dict(
  intro='Осталось мало<br>денег <span class="hl">на еду?</span>',
  h1='Не спеши<br><span class="hl">портить здоровье</span>', pasta='🍝 Макароны', after='Сытость', hours=['после еды','1 ч','2 ч','3 ч'], hungry='Снова голоден 😩',
  h2='Экономнее<br>и <span class="hl">полезнее</span>', h2s='Покупай овощи вместо макарон 🥔🥕', idx='Индекс сытости', items=[('🥔 Варёный картофель',323),('🍝 Белые макароны',119),('🍞 Белый хлеб',100)], src='Источник: Holt и др., 1995 (белый хлеб = 100%)',
  h3='Сытно и с<br><span class="hl">нормой витаминов</span>', plate='Овощи дают', veg=[('🥔 Картофель','витамин C, калий'),('🥕 Морковь','витамин A'),('🥬 Капуста','витамины C и K'),('🟣 Свёкла','фолиевая кислота')], tip='Сытно и с витаминами',
  h4='Бюджет на еду<br><span class="hl">остаётся</span>', bud='Еда · октябрь', plan='План (15%)', spent='Потрачено', saved='Сэкономлено', btn='🛒 Составить список покупок',
  h5='Совет<br><span class="hl">помог?</span>', sub='Подпишись', share='Поделись', more='Новые советы по экономии каждую неделю 💛',
  tag='Твои деньги. Ясная картина.', cta='Начни бесплатно', loc='ru-RU'),
}[lang]
bars = ''.join(f'<div class="cat"><div class="top"><span>{n}</span><span id="iv{i}">0%</span></div><div class="track" style="height:30px;border-radius:15px"><div class="fill" id="if{i}" style="background:{c};border-radius:15px"></div></div></div>'
               for i, ((n, v), c) in enumerate(zip(T['items'], ['#e0a03a', '#c9b38a', '#cfcfcf'])))
veg = ''.join(f'<div class="shop" id="vg{i}"><div class="ico" style="background:{bg}">{n.split()[0]}</div><div>{" ".join(n.split()[1:])}</div><div class="amt" style="font-size:30px;color:#1e8a4c">{p}</div></div>'
              for i, ((n, p), bg) in enumerate(zip(T['veg'], ['#fbf1e2', '#fff0e3', '#e6f6ea', '#f6e6f3'])))
body = f'''
<div class="scene" id="s0"><div style="position:absolute;left:90px;top:200px" class="logo">viv<b>recon</b></div>
  <h1 style="top:760px;font-size:120px">{T['intro']}</h1><div id="emo" style="position:absolute;left:0;right:0;top:1150px;text-align:center;font-size:160px">🥔🥕🥦</div></div>

<div class="scene" id="s1"><h1 style="top:300px;font-size:96px">{T['h1']}</h1>
  <div class="card" style="top:720px"><div class="lbl" style="font-size:34px">{T['pasta']} · {T['after']}</div>
    <div class="track" style="height:56px;border-radius:28px;margin-top:30px"><div class="fill" id="full" style="border-radius:28px"></div></div>
    <div style="display:flex;justify-content:space-between;margin-top:18px" class="lbl">{''.join(f'<span>{h}</span>' for h in T['hours'])}</div>
    <div id="hungry" style="margin-top:36px;font-size:46px;font-weight:700;color:#c0392b;opacity:0">{T['hungry']}</div></div></div>

<div class="scene" id="s2"><h1 style="top:260px;font-size:100px">{T['h2']}</h1><div id="h2s" style="position:absolute;left:90px;right:90px;top:520px;font-size:46px;font-weight:700;color:#1e8a4c">{T['h2s']}</div>
  <div class="card" style="top:760px"><div class="lbl" style="font-size:32px">{T['idx']}</div>{bars}
    <div class="lbl" style="margin-top:30px;font-size:22px">{T['src']}</div></div></div>

<div class="scene" id="s3"><h1 style="top:280px;font-size:{100 if lang=='et' else 92}px">{T['h3']}</h1>
  <div class="card" style="top:740px;padding:20px 44px"><div class="lbl" style="margin-top:20px;font-size:30px">{T['plate']}</div>{veg}
    <div id="tip" style="margin:26px -44px -20px;padding:28px 44px;background:#e9f8ef;color:#1e8a4c;font-size:36px;font-weight:700;border-radius:0 0 36px 36px;opacity:0">✓ {T['tip']}</div></div></div>

<div class="scene" id="s4"><h1 style="top:260px;font-size:100px">{T['h4']}</h1>
  <div class="card" style="top:700px"><div class="lbl">{T['bud']}</div>
    <div class="kpi"><div><div class="lbl">{T['plan']}</div><div class="big">130 €</div></div><div><div class="lbl">{T['spent']}</div><div class="big" id="fs">0 €</div></div></div>
    <div class="track" style="height:30px;border-radius:15px;margin-top:30px"><div class="fill" id="fb" style="background:#ff9f5a;border-radius:15px"></div></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:30px"><div class="lbl" style="font-size:34px">{T['saved']}</div><div class="big" id="fsv" style="color:#1e8a4c;font-size:72px">0 €</div></div>
    <div style="text-align:center;margin-top:34px"><div class="btn" id="b4" style="font-size:36px;padding:26px 44px">{T['btn']}</div></div></div></div>

<div class="scene" id="s5"><h1 style="top:360px;font-size:110px">{T['h5']}</h1>
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
const END=24
const S={{s0:[0,1.5],s1:[1.5,5.25],s2:[5.25,9],s3:[9,12.75],s4:[12.75,16.5],s5:[16.5,20.25],s6:[20.25,END]}}
const euro=v=>Math.round(v).toLocaleString('{T['loc']}')+' €'
function vis(id,t){{const [a,b]=S[id];const i=a===0?1:seg(t,a,a+.01),o=b===END?1:1-seg(t,b-.01,b);$(id).style.opacity=Math.min(i,o);return t-a}}
function slide(el,p,dy=80){{el.style.opacity=ease(p);el.style.transform=`translateY(${{(1-ease(p))*dy}}px)`}}
function pop(el,p){{el.style.transform=`scale(${{p>0?back(p):0}})`}}
let cur=null
function cursor(x,y,show,press){{cur=[x,y,show,press]}}
const TILES=[...Array(12*21)].map((_,i)=>{{const d=document.createElement('div');$('tiles').appendChild(d);return {{el:d,r:((i*7919)%997)/997}}}})
function tiles(t){{const cuts=Object.values(S).map(w=>w[0]).filter(x=>x>0);const b=cuts.reduce((p,c)=>Math.abs(c-t)<Math.abs(p-t)?c:p,99)
  TILES.forEach(({{el,r}})=>{{const on=b-.38+r*.28,off=b+.04+r*.3;const v=t>=on&&t<off?1:0;el.style.opacity=v;el.style.transform=`scale(${{v?1:.3}})`}})}}
function marker(t){{document.querySelectorAll('.scene').forEach(sc=>{{const w=S[sc.id];const p=ease(seg(t,w[0]+.3,w[0]+.7));sc.querySelectorAll('.hl').forEach(h=>h.style.backgroundSize=(p*100)+'% 100%')}})}}
const ITEMS={[v for _, v in T['items']]}
window.render=function(t){{
  tiles(t); marker(t); cur=[0,0,0,false]; let l
  l=vis('s0',t); pop($('emo'),seg(l,.5,1))
  l=vis('s1',t); const f=1-.85*ease(seg(l,.6,2.6)); $('full').style.width=(f*100)+'%'
  $('full').style.background=f>.5?'#79dba0':f>.3?'#ffbe7a':'#e5534b'; $('hungry').style.opacity=ease(seg(l,2.6,3))
  l=vis('s2',t); slide($('h2s'),seg(l,.5,.9),30); ITEMS.forEach((v,i)=>{{const p=ease(seg(l,.3+i*.25,1.3+i*.25));$('if'+i).style.width=(v/323*100*p)+'%';$('iv'+i).textContent=Math.round(v*p)+'%'}})
  l=vis('s3',t); [0,1,2,3].forEach(i=>slide($('vg'+i),seg(l,.2+i*.25,.5+i*.25),60)); slide($('tip'),seg(l,1.5,1.9),40)
  l=vis('s4',t); const sp=84*ease(seg(l,.3,1.4)); $('fs').textContent=euro(sp); $('fb').style.width=(sp/130*100)+'%'; $('fsv').textContent=euro(l>1.4?46*ease(seg(l,1.4,2)):0)
  const c4=l>2.4&&l<2.6; $('b4').style.transform=`scale(${{c4?.94:1}})`; if(t>=S.s4[0]&&t<S.s4[1]) cursor(600,1250,l>1.9&&l<3.4?1:0,c4)
  l=vis('s5',t); pop($('bsub'),seg(l,.3,.7)); pop($('bsh'),seg(l,.6,1)); const c5=l>1.9&&l<2.1
  if(t>=S.s5[0]&&t<S.s5[1]) {{ cursor(640,920,l>1.3&&l<3.2?1:0,c5); if(l>2) $('bsub').innerHTML='✓ '+`{T['sub']}` }}
  l=vis('s6',t); pop($('b6'),seg(l,.4,.9))
  if(t>=S.s6[0]) cursor(700,1180,l>1.2?1:0,l>1.9&&l<2.1)
  const c=$('cursor'); c.style.opacity=cur[2]; c.style.left=cur[0]+'px'; c.style.top=cur[1]+'px'; c.style.transform=`scale(${{cur[3]?.85:1}})`
}}
render(0)
</script></body></html>'''
open(f'food_{lang}' + ('_navy' if os.environ.get('ACCENT') == 'navy' else '') + '.html', 'w', encoding='utf-8').write(head + '</head><body>' + body)
print('ok', lang)
