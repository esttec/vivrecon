# Builds the "one number = your whole plan" reel page for one language: python3 build_plan.py et|ru
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
  hook='Üks number =<br><span class="hl">kogu sinu plaan</span>', payL='Sinu kuupalk', mo='/kuus',
  calc=[('Rahaline<br><span class="hl">vabadus</span>','× 150',300000,'summa, mida investeerida',0),
        ('<span class="hl">Säästud</span>','× 0,2',400,'sinu kapital investeerimiseks',1),
        ('Kõik sinu<br><span class="hl">kulud</span>','÷ 2',1000,'kodu, toit, arved',1),
        ('<span class="hl">Turvapadi</span>','× 6',12000,'6 kuu palk varuks',0),
        ('Reisid<br><span class="hl">või auto</span>','× 0,2',400,'unistuste jaoks',1),
        ('<span class="hl">Endale</span>','× 0,1',200,'hobid, riided, rõõm',1)],
  sum='Kõik ühest<br><span class="hl">numbrist.</span>', parts=['Säästud','Kulud','Reisid / auto','Endale'], tot='Kokku',
  h5='Proovi oma<br><span class="hl">palgaga!</span>', sub='Telli', share='Jaga', more='vivrecon arvutab plaani sinu eest 💙',
  tag='Sinu raha. Selge pilt.', cta='Alusta tasuta', loc='et-EE'),
 'ru': dict(
  hook='Одно число =<br><span class="hl">весь твой план</span>', payL='Твоя зарплата', mo='/мес',
  calc=[('Финансовая<br><span class="hl">свобода</span>','× 150',300000,'сумма, которую нужно инвестировать',0),
        ('<span class="hl">Сбережения</span>','× 0,2',400,'твой капитал для инвестиций',1),
        ('Все твои<br><span class="hl">расходы</span>','÷ 2',1000,'жильё, еда, счета',1),
        ('Подушка<br><span class="hl">безопасности</span>','× 6',12000,'6 зарплат в запасе',0),
        ('Путешествия<br><span class="hl">или машина</span>','× 0,2',400,'на мечту',1),
        ('<span class="hl">На себя</span>','× 0,1',200,'хобби, одежда, радость',1)],
  sum='Всё из<br><span class="hl">одного числа.</span>', parts=['Сбережения','Расходы','Путешествия / машина','На себя'], tot='Итого',
  h5='Попробуй со<br><span class="hl">своей зарплатой!</span>', sub='Подпишись', share='Поделись', more='vivrecon посчитает план за тебя 💙',
  tag='Твои деньги. Ясная картина.', cta='Начни бесплатно', loc='ru-RU'),
}[lang]
PAY = 2000
PARTS = [400, 1000, 400, 200]
assert sum(PARTS) == PAY
COL = ['#1e8a4c', '#1e2f6b', '#4f6fe0', '#e5a03a']
fmt = lambda v: f'{v:,}'.replace(',', '\u00a0') + '\u00a0€'
paycard = lambda i: f'<div class="card" style="top:150px;padding:26px 44px;text-align:center" id="pc{i}"><div class="lbl" style="font-size:30px">{T["payL"]}</div><div class="big" style="font-size:84px">{fmt(PAY)} <span class="lbl" style="font-size:34px">{T["mo"]}</span></div></div>'
calc = ''.join(f'''<div class="scene" id="s{i+1}">{paycard(i+1)}<h1 style="top:560px;font-size:{90 if len(h) < 50 else 80}px">{h}</h1>
  <div class="card" style="top:1000px;text-align:center"><div class="chip" id="ch{i+1}">{op}</div>
    <div class="big" id="v{i+1}" style="font-size:{150 if v < 100000 else 130}px;margin-top:20px;color:{"#1f2433" if m else "#1e8a4c"}">0 €</div>
    <div class="lbl" id="d{i+1}" style="font-size:34px;margin-top:8px">{(T["mo"] + " · ") if m else ""}{d}</div></div></div>
''' for i, (h, op, v, d, m) in enumerate(T['calc']))
bar = ''.join(f'<div id="bp{i}" style="height:100%;width:0;background:{c}"></div>' for i, c in enumerate(COL))
rows = ''.join(f'<div class="shop" id="sr{i}" style="padding:16px 0"><div class="ico" style="background:{c};width:28px;height:28px;border-radius:8px;min-width:28px"></div><div>{n}</div><div class="amt">{fmt(a)}</div></div>' for i, (n, a, c) in enumerate(zip(T['parts'], PARTS, COL)))
body = f'''
<style>.chip{{display:inline-block;background:#1e2f6b;color:#fff;font-size:56px;font-weight:800;padding:14px 40px;border-radius:18px;font-family:ui-monospace,Menlo,monospace}}</style>
<div class="scene" id="s0"><div style="position:absolute;left:90px;top:200px" class="logo">viv<b>recon</b></div>
  <h1 style="top:620px;font-size:{104 if lang=='et' else 96}px">{T['hook']}</h1>
  <div class="card" id="hookpay" style="top:1060px;text-align:center"><div class="lbl" style="font-size:32px">{T['payL']}</div><div class="big" id="hp" style="font-size:120px">0 €</div></div></div>
{calc}
<div class="scene" id="s7"><h1 style="top:260px;font-size:{104 if lang=='et' else 92}px">{T['sum']}</h1>
  <div class="card" style="top:700px;padding:36px 44px"><div style="display:flex;height:70px;border-radius:20px;overflow:hidden;background:#eef0f4">{bar}</div>
    <div style="margin-top:20px">{rows}</div>
    <div class="shop" id="sr4" style="padding:20px 0 4px;border-top:3px solid #1f2433;font-weight:800"><div></div><div>{T['tot']}</div><div class="amt">{fmt(PAY)} {T['mo']}</div></div></div></div>

<div class="scene" id="s8"><h1 style="top:360px;font-size:{108 if lang=='et' else 88}px">{T['h5']}</h1>
  <div style="position:absolute;left:0;right:0;top:860px;text-align:center">
    <div class="btn" id="bsub" style="background:#e5534b;font-size:52px;padding:34px 70px">🔔 {T['sub']}</div><br>
    <div class="btn" id="bsh" style="margin-top:40px;font-size:52px;padding:34px 70px;background:#fff;color:#1f2433;box-shadow:0 10px 30px rgba(0,0,0,.12)">↗ {T['share']}</div>
    <div style="font-size:40px;font-weight:600;color:#6b7390;margin:60px 90px 0;line-height:1.3">{T['more']}</div></div></div>

<div class="scene" id="s9"><div style="position:absolute;left:0;right:0;top:760px;text-align:center"><div class="logo" style="font-size:150px">viv<b>recon</b></div>
  <div style="font-size:42px;color:#6b7390;margin-top:20px;font-weight:600">{T['tag']}</div>
  <div class="btn" id="b9" style="margin-top:70px">{T['cta']} <i>→</i></div>
  <div style="font-size:40px;font-weight:700;margin-top:60px;color:#4f6fe0">vivrecon.com</div></div></div>

<div id="tiles"></div>
<svg id="cursor" viewBox="0 0 24 24"><path d="M9 2v11.5l-2.2-2.1a1.6 1.6 0 0 0-2.3 2.3L9.5 19c1 1 2.2 1.5 3.6 1.5H15a5 5 0 0 0 5-5v-4.5a1.5 1.5 0 0 0-3 0V10a1.5 1.5 0 0 0-3 0v-.5a1.5 1.5 0 0 0-3 0V2a1.5 1.5 0 0 0-2 0z" fill="#fff" stroke="#111" stroke-width="1.3"/></svg>
<script>
const $=id=>document.getElementById(id)
const cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x))
const ease=x=>{{x=cl(x);return 1-Math.pow(1-x,3)}}
const back=x=>{{x=cl(x);const c=1.7;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)}}
const seg=(t,a,b)=>cl((t-a)/(b-a))
const END=39
const S={{s0:[0,3],s1:[3,6.75],s2:[6.75,10.5],s3:[10.5,14.25],s4:[14.25,18],s5:[18,21.75],s6:[21.75,25.5],s7:[25.5,30],s8:[30,34.5],s9:[34.5,END]}}
const K=1.25 // slower in-scene animation
const euro=v=>String(Math.round(v)).replace(/\\B(?=(\\d{{3}})+(?!\\d))/g,'\\u00a0')+'\\u00a0€'
function vis(id,t){{const [a,b]=S[id];const i=a===0?1:seg(t,a,a+.01),o=b===END?1:1-seg(t,b-.01,b);$(id).style.opacity=Math.min(i,o);return (t-a)/K}}
function slide(el,p,dy=80){{el.style.opacity=ease(p);el.style.transform=`translateY(${{(1-ease(p))*dy}}px)`}}
function pop(el,p){{el.style.transform=`scale(${{p>0?back(p):0}})`}}
let cur=null
function cursor(x,y,show,press){{cur=[x,y,show,press]}}
const TILES=[...Array(12*21)].map((_,i)=>{{const d=document.createElement('div');$('tiles').appendChild(d);return {{el:d,r:((i*7919)%997)/997}}}})
function tiles(t){{const cuts=Object.values(S).map(w=>w[0]).filter(x=>x>0);const b=cuts.reduce((p,c)=>Math.abs(c-t)<Math.abs(p-t)?c:p,99)
  TILES.forEach(({{el,r}})=>{{const on=b-.38+r*.28,off=b+.04+r*.3;const v=t>=on&&t<off?1:0;el.style.opacity=v;el.style.transform=`scale(${{v?1:.3}})`}})}}
function marker(t){{document.querySelectorAll('.scene').forEach(sc=>{{const w=S[sc.id];const p=ease(seg(t,w[0]+.3,w[0]+.7));sc.querySelectorAll('.hl').forEach(h=>h.style.backgroundSize=(p*100)+'% 100%')}})}}
const VALS={[v for _, _, v, _, _ in T['calc']]}, PARTS={PARTS}
window.render=function(t){{
  tiles(t); marker(t); cur=[0,0,0,false]; let l
  l=vis('s0',t); slide($('hookpay'),seg(l,.5,.9),60); $('hp').textContent=euro({PAY}*ease(seg(l,.8,1.8)))
  for(let i=1;i<=6;i++){{ l=vis('s'+i,t); pop($('ch'+i),seg(l,.5,.9)); $('v'+i).textContent=euro(VALS[i-1]*ease(seg(l,.9,1.9))); slide($('d'+i),seg(l,1.7,2.1),30) }}
  l=vis('s7',t); PARTS.forEach((a,i)=>{{const p=ease(seg(l,.5+i*.35,.85+i*.35)); $('bp'+i).style.width=(p*a/{PAY}*100)+'%'; slide($('sr'+i),seg(l,.5+i*.35,.85+i*.35),40)}}); slide($('sr4'),seg(l,2,2.4),30)
  l=vis('s8',t); pop($('bsub'),seg(l,.3,.7)); pop($('bsh'),seg(l,.6,1)); const c8=l>1.9&&l<2.1
  if(t>=S.s8[0]&&t<S.s8[1]) {{ cursor(640,920,l>1.3&&l<3.2?1:0,c8); if(l>2) $('bsub').innerHTML='✓ '+`{T['sub']}` }}
  l=vis('s9',t); pop($('b9'),seg(l,.4,.9))
  if(t>=S.s9[0]) cursor(700,1180,l>1.2?1:0,l>1.9&&l<2.1)
  const c=$('cursor'); c.style.opacity=cur[2]; c.style.left=cur[0]+'px'; c.style.top=cur[1]+'px'; c.style.transform=`scale(${{cur[3]?.85:1}})`
}}
render(0)
</script></body></html>'''
open(f'plan_{lang}' + ('_navy' if os.environ.get('ACCENT') == 'navy' else '') + '.html', 'w', encoding='utf-8').write(head + '</head><body>' + body)
print('ok', lang)
