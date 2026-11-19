/* 一键最佳分配：厨师/实验室（V68 补）/农场/床位/健身房 + 实验室总览标签 */
const fs = require('fs');
const html = fs.readFileSync('/workspace/index.html', 'utf8');
const scripts = html.match(/<script>([\s\S]*?)<\/script>/g);
let code = scripts[scripts.length - 1].replace(/^<script>/, '').replace(/<\/script>\s*$/, '');
const bootIdx = code.lastIndexOf("Game.renderHome();\n  window.addEventListener('resize'");
code = code.slice(0, bootIdx) + "window.__T = { Game, Battle, UI, DATA };\n})();";
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
g.chars = g.chars.filter(c=>c.cls!=='chef' && c.cls!=='scientist');   // 初始职业已随机化：移除随机厨师/科学家，保证用例只受显式创建者影响

(async () => {
  // ===== T1 准备：建造 + 招募 =====
  g.res.gold = 2000; g.res.food = 20;
  Game.buildKitchen();
  Game.buildLab();
  assert(g.kitchenLv===1 && g.labLv===1, 'T1a 厨房+实验室已建造');
  const chef = Game.createChar('chef', '面点师');
  const sci  = Game.createChar('scientist', '研究员');
  g.chars.push(chef, sci);
  chef.stamina = chef.maxStamina = 100;
  sci.stamina = sci.maxStamina = 100;
  assert(g.kitchenChef===null && g.labChef===null, 'T1b 初始职务为空');

  // ===== T2 一键分配：厨师→厨房、科学家→实验员 =====
  const acts = Game.recommendDuty();
  assert(g.kitchenChef===chef.id && acts.some(a=>a===`${chef.name}→厨师`), `T2a 厨师自动上岗（${acts.join('，')}）`);
  assert(g.labChef===sci.id && acts.some(a=>a===`${sci.name}→实验员`), 'T2b 科学家自动成为实验员（V68 补）');
  assert(Game.dutyOf(sci.id)==='实验室当值', 'T2c dutyOf 返回实验室当值');

  // ===== T3 职务总览标签 =====
  UI.renderDuty();
  const dutyHtml = elems['duty-page'] ? elems['duty-page'].innerHTML : '';
  assert(dutyHtml.includes('🧪 实验室：'), 'T3a 总览含实验室标签（已建造态）');
  assert(dutyHtml.includes(sci.name), 'T3b 标签显示实验员名字');

  // ===== T4 重复调用：不重复指派 =====
  const acts2 = Game.recommendDuty();
  assert(!acts2.some(a=>a.includes('实验员')) && g.labChef===sci.id, 'T4 已有实验员不再重复指派');

  // ===== T5 重伤科学家不被一键指派 =====
  Game.unassignLab();
  sci.injured = true;
  const acts3 = Game.recommendDuty();
  assert(g.labChef===null && !acts3.some(a=>a.includes('实验员')), 'T5 重伤科学家排除');

  // ===== T6 职务冲突：科学家已任农场时不再指派实验室 =====
  sci.injured = false;
  g.farmLv = 1;
  Game.assignFarm(sci.id);
  const acts4 = Game.recommendDuty();
  assert(g.labChef===null && !acts4.some(a=>a.includes('实验员')), 'T6 职务冲突排除（已任农场）');
  Game.unassignFarm();

  // ===== T7 无科学家可指派：总览显示空缺 =====
  sci.injured = true;
  UI.renderDuty();
  const dutyHtml2 = elems['duty-page'] ? elems['duty-page'].innerHTML : '';
  assert(dutyHtml2.includes('🧪 实验室：空缺'), 'T7a 总览显示空缺');
  assert(!dutyHtml2.includes('onclick="Game.assignLab'), 'T7b 无可指派科学家时不渲染指派按钮');

  // ===== T8 实验室未建造：显示未建造标签 =====
  g.labLv = 0;
  UI.renderDuty();
  const dutyHtml3 = elems['duty-page'] ? elems['duty-page'].innerHTML : '';
  assert(dutyHtml3.includes('🧪 实验室未建造'), 'T8 未建造态标签');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
