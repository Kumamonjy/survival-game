/* V110 工坊当值系统：指派工匠才能打造 / 打造耗工匠体力 / 梯度 5~25 / 冲突与迁移 */
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
const { Game, Battle, UI, DATA } = window.__T;
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
g.workshopLv = 1;
g.res.gold = 500; g.res.metal = 20; g.res.fabric = 20; g.res.wood = 20;

(async () => {
  // T1 未指派工匠：打造被拦截
  const before = { gold:g.res.gold, metal:g.res.metal, bag:(g.bagInst||[]).length };
  Game.craft('dart');
  assert(g.res.gold===before.gold && g.res.metal===before.metal && (g.bagInst||[]).length===before.bag, 'T1 未指派工匠时打造被拦截');

  // T2 指派工匠 → 打造飞镖：扣材料 + 扣工匠 5⚡ + 入包
  const smith = g.chars[0];
  smith.stamina = 100; smith.injured = false;
  Game.assignWorkshop(smith.id);
  assert(g.workshopChef===smith.id, 'T2a 工匠指派成功');
  Game.craft('dart');
  assert(g.res.gold===before.gold-8 && g.res.metal===before.metal-2, 'T2b 材料正常扣除');
  assert(smith.stamina===95, `T2c 工匠体力 -5（${smith.maxStamina - smith.stamina === 5 ? '确认为5' : smith.stamina}）`);
  assert((g.bagInst||[]).some(e=>e.id==='dart'), 'T2d 飞镖入包');

  // T3 工匠体力不足：拦截
  smith.stamina = 3;
  const m0 = g.res.metal;
  Game.craft('stone');   // 5⚡
  assert(g.res.metal===m0, 'T3 工匠体力不足拦截（石块需 5⚡）');
  smith.stamina = 100;

  // T4 工匠重伤：拦截
  smith.injured = true;
  Game.craft('stone');
  assert(g.res.metal===m0, 'T4 工匠重伤拦截');
  smith.injured = false;

  // T5 体力梯度：锚点 + 全表
  const R = id => DATA.RECIPES.find(r=>r.id===id);
  assert(R('dart').stamina===5 && R('stone').stamina===5, 'T5a 飞镖/石块 5⚡');
  assert(R('cloth').stamina===15, 'T5b 布衣 15⚡');
  assert(R('bow').stamina===20, 'T5c 木弓 20⚡');
  assert(R('spear').stamina===25 && R('stick').stamina===10 && R('thermos').stamina===12 && R('sweater').stamina===15, 'T5d 长枪 25 / 木棍 10 / 保温杯 12 / 毛衣 15');

  // T6 一人一岗冲突：先当厨师再指派工坊被拒（需真厨师，开局随机职业可能没有则造一个）
  let cook = g.chars.find(c=>c.cls==='chef' && !c.dead);
  if (!cook) { cook = Game.createChar('chef'); g.chars.push(cook); }
  g.kitchenLv = 1; cook.stamina = 100; cook.injured = false;
  Game.assignKitchen(cook.id);
  Game.assignWorkshop(cook.id);
  assert(g.workshopChef===smith.id && g.kitchenChef===cook.id, 'T6 已当值厨师不能同时当工匠');

  // T7 旧档迁移：applySave 源码含 workshopChef 迁移行
  assert(code.includes("if (Game.g.workshopChef === undefined) Game.g.workshopChef = null;"), 'T7 旧档迁移补 workshopChef=null（源码级）');

  // T8 打造弹窗：显示工匠与 ⚡ 成本
  Game.craft('dart'); Game.craft('dart'); Game.craft('dart'); Game.craft('dart'); Game.craft('dart');
  assert(smith.stamina===75, `T8a 连造 5 支飞镖共耗 25⚡（余 ${smith.stamina}）`);
  UI.openCraftModal();
  const mh = Object.values(elems).map(e=>e.innerHTML).join('');
  assert(mh.includes('⚡×5') && mh.includes('工匠'), 'T8b 打造弹窗含体力成本与工匠状态');

  // T9 撤职后无法打造
  Game.unassignWorkshop();
  const m1 = g.res.metal;
  Game.craft('stone');
  assert(g.res.metal===m1, 'T9 撤职后打造被拦截');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.log('TEST ERROR', e); process.exit(1); });
