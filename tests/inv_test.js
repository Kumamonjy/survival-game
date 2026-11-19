/* V73 物资仓库 · 每日食物消耗预估 */
const fs = require('fs');
const html = fs.readFileSync('/workspace/index.html', 'utf8');
const scripts = html.match(/<script>([\s\S]*?)<\/script>/g);
let code = scripts[scripts.length - 1].replace(/^<script>/, '').replace(/<\/script>\s*$/, '');
const bootIdx = code.lastIndexOf("Game.renderHome();\n  window.addEventListener('resize'");
code = code.slice(0, bootIdx) + "window.__T = { Game, UI, DATA };\n})();";
const elems = {};
function mkEl(){ return { innerHTML:'', textContent:'', style:{ setProperty(){} }, disabled:false, scrollTop:0, value:'', dataset:{}, children:[], className:'', classList:{toggle(){},add(){},remove(){},contains:()=>false}, setAttribute(){}, removeAttribute(){}, appendChild(c){this.children.push(c);return c;}, remove(){}, addEventListener(){}, focus(){}, blur(){}, querySelector(){return null;}, querySelectorAll(){return [];}, getBoundingClientRect(){return{width:400,height:700,top:0,left:0};} }; }
global.document = { getElementById:id=>elems[id]||(elems[id]=mkEl()), querySelector:()=>mkEl(), querySelectorAll:()=>[], addEventListener(){}, createElement:()=>mkEl(), body:mkEl() };
global.window = { addEventListener(){}, location:{search:''}, scrollTo(){}, innerWidth:400, innerHeight:700 };
global.localStorage = { getItem:()=>null, setItem(){}, removeItem(){} };
global.navigator = { userAgent:'node' };
eval(code);
const assert=(c,n)=>console.log(c?'PASS '+n:'FAIL '+n);
const { Game, UI, DATA } = window.__T;
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
g.chars = [];   // 清初始随机阵容，构造可控队伍

(() => {
  // ===== T1 预估行渲染（2 平民 + 1 军人 = 1+1+3 = 5 份/天） =====
  const c1 = Game.createChar('civilian', '甲'), c2 = Game.createChar('civilian', '乙'), s1 = Game.createChar('soldier', '丙');
  [c1,c2,s1].forEach(c=>{ c.talents=[]; c.gluttonTalent=false; c.frugalTalent=false; Game.applyTalents(c); Game.recalc(c); g.chars.push(c); });
  g.res.food = 12;
  UI.renderInv();
  let inv = elems['inv-list'].innerHTML;
  assert(inv.includes('每日消耗预估') && inv.includes('5 份食物'), 'T1 预估行渲染（demand 5 = 1+1+3）');
  assert(!inv.includes('×平民') && !inv.includes('×军人'), 'T2 预估行不含职业分项（只显示每日总消耗）');
  assert(inv.includes('可支撑约 <b style="color:var(--yellow)">2</b> 天'), 'T3 存粮 12 可支撑 floor(12/5)=2 天');

  // ===== T4 存粮不足一天警示 =====
  g.res.food = 3;
  UI.renderInv();
  inv = elems['inv-list'].innerHTML;
  assert(inv.includes('存粮不足一天'), 'T4 存粮 3 < 需求 5 触发警示');

  // ===== T5 天赋修正标注 =====
  g.res.food = 12;
  c1.gluttonTalent = true;
  UI.renderInv();
  inv = elems['inv-list'].innerHTML;
  assert(inv.includes('6 份食物') && inv.includes('已含贪吃/节俭修正'), 'T5 贪吃 +1 后 demand 6 且标注修正');
  c1.gluttonTalent = false;

  // ===== T6 死亡成员不计入 =====
  s1.dead = true;
  UI.renderInv();
  inv = elems['inv-list'].innerHTML;
  assert(inv.includes('2 份食物') && inv.includes('2 人'), 'T6 死亡军人不计入（demand 5→2，队伍 3→2 人）');
  s1.dead = false;

  // ===== T7 职业食量清单已删除（指引到职业图鉴），保留实际消耗预估 =====
  assert(!inv.includes('音乐家 2') && !inv.includes('军人 3'), 'T7 物资页不再列出职业食量清单');

  console.log('--- done ---');
  process.exit(0);
})();
