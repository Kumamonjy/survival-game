/* V93 区域特色地形：5 区域配方 + start 按配方散布 + 区域卡展示 */
const fs = require('fs');
const html = fs.readFileSync('/workspace/index.html', 'utf8');
const scripts = html.match(/<script>([\s\S]*?)<\/script>/g);
let code = scripts[scripts.length - 1].replace(/^<script>/, '').replace(/<\/script>\s*$/, '');
const bootIdx = code.lastIndexOf("Game.renderHome();\n  window.addEventListener('resize'");
code = code.slice(0, bootIdx) + "window.__T = { Game, Battle, UI, DATA };\n})();";
const elems = {};
function mkEl(){ return { innerHTML:'', textContent:'', style:{ setProperty(){} }, disabled:false, scrollTop:0, value:'', dataset:{}, children:[], offsetWidth:36, className:'', classList:{ s:new Set(), add(c){this.s.add(c);}, remove(c){this.s.delete(c);}, contains(c){return this.s.has(c);} }, setAttribute(){}, removeAttribute(){}, appendChild(c){this.children.push(c);return c;}, remove(){}, addEventListener(){}, focus(){}, blur(){}, querySelector(){return null;}, querySelectorAll(){return [];}, getBoundingClientRect(){return{width:400,height:700,top:0,left:0,bottom:700};} }; }
global.document = { getElementById:id=>elems[id]||(elems[id]=mkEl()), querySelector:()=>mkEl(), querySelectorAll:()=>[], addEventListener(){}, createElement:()=>mkEl(), body:mkEl() };
global.window = { addEventListener(){}, location:{search:''}, scrollTo(){}, innerWidth:400, innerHeight:700 };
global.localStorage = { getItem:()=>null, setItem(){}, removeItem(){} };
global.navigator = { userAgent:'node' };
global.getComputedStyle = () => ({ getPropertyValue:()=>'' });
eval(code);
const assert=(c,n)=>console.log(c?'PASS '+n:'FAIL '+n);
const { Game, Battle, UI, DATA } = window.__T;
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // T1 配方数据
  const EXP = { market:{water:10,rubble:8,ruin:6,crate:8,barrel:1}, hospital:{water:12,rubble:8,ruin:7,crate:7,barrel:2},
    factory:{water:4,rubble:15,ruin:8,crate:4,barrel:10}, street:{water:6,rubble:10,ruin:14,crate:6,barrel:3},
    base:{water:6,rubble:14,ruin:12,crate:5,barrel:6} };
  assert(DATA.ZONES.length===5 && DATA.ZONES.every(z=>JSON.stringify(z.terrain)===JSON.stringify(EXP[z.id])), 'T1 五区域地形配方正确');

  // T2 start 按配方散布：工厂应出现 10 桶
  const c = Game.createChar('soldier','兵',false); g.chars.push(c);
  UI.teamSelected = [c.id];
  await Battle.start(DATA.ZONES.find(z=>z.id==='factory'));
  const cnt = t => Battle.b.terrain.flat().filter(x=>x===t).length;
  assert(cnt('barrel')===10, `T2a 工厂 10 桶（实际 ${cnt('barrel')}）`);
  assert(cnt('rubble')===15 && cnt('water')===4 && cnt('crate')===4, `T2b 工厂 rubble15/water4/crate4（${cnt('rubble')}/${cnt('water')}/${cnt('crate')}）`);
  const ruined = Battle.b.ruins && Object.keys(Battle.b.ruins).length;
  assert(ruined===8, `T2c 废墟翻找点 8（${ruined}）`);

  // T3 换区域：医院积水 12、超市物资箱 8
  UI.teamSelected = [c.id];
  await Battle.start(DATA.ZONES.find(z=>z.id==='hospital'));
  assert(cnt('water')===12 && cnt('barrel')===2, `T3a 医院 water12/barrel2（${cnt('water')}/${cnt('barrel')}）`);
  UI.teamSelected = [c.id];
  await Battle.start(DATA.ZONES.find(z=>z.id==='market'));
  assert(cnt('crate')===8 && cnt('barrel')===1, `T3b 超市 crate8/barrel1（${cnt('crate')}/${cnt('barrel')}）`);

  // T4 老存档兼容：zone 快照无 terrain 字段 → 按 id 回查 DATA.ZONES（真实老存档是完整快照，只缺新增的 terrain）
  const full = DATA.ZONES.find(z=>z.id==='base');
  const stale = { ...full }; delete stale.terrain;
  UI.teamSelected = [c.id];
  await Battle.start(stale);
  assert(cnt('barrel')===6 && cnt('ruin')===12, `T4 老存档快照回查配方 barrel6/ruin12（${cnt('barrel')}/${cnt('ruin')}）`);

  // T5 区域卡展示战场地形行
  elems['zone-list'] = mkEl();
  UI.openZones();
  assert(elems['zone-list'].innerHTML.includes('战场地形') && elems['zone-list'].innerHTML.includes('🛢️10'), 'T5 区域卡展示地形配方');

  Battle.exit ? null : null;
  console.log('--- done ---');
  process.exit(0);
})();
