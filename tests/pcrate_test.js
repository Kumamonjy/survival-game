/* V107 精品物资箱：每局 1 个且在最上方三行 / 90% 双倍物资 / 10% 特殊饰品（熊熊/兔兔）/ 渲染与百科 */
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

(async () => {
  // T1 每局恰好 1 个精品物资箱，且都落在最上方三行（0-2）
  UI.teamZone = DATA.ZONES[0]; UI.teamSelected = [g.chars[0].id];
  let okAll = true, lastRows = [];
  for (let i=0;i<30;i++) {
    g.chars[0].stamina = 100;
    Battle.start(DATA.ZONES[0]);
    const cells = [];
    for (let r=0;r<Battle.ROWS;r++) for (let c=0;c<Battle.COLS;c++) if (Battle.b.terrain[r][c]==='pcrate') cells.push([r,c]);
    if (cells.length!==1 || cells.some(([r])=>r>2)) { okAll=false; }
    lastRows.push(cells[0] ? cells[0][0] : -1);
  }
  assert(okAll, `T1 30 局均为 1 个精品箱且都在第 0-2 行（行号样本 ${[...new Set(lastRows)].sort().join(',')}）`);

  // T2 90% 分支：双倍物资（必为偶数、单一种类）
  const b = Battle.b;
  const me = b.units.find(u=>u.side==='ally');
  b.terrain[1][5]='pcrate'; me.row=2; me.col=5; me.hasMoved=false; me.hasAttacked=true;
  const realRandom = Math.random;
  Math.random = () => 0.5;   // ≥0.1 → 物资分支
  const l0 = JSON.parse(JSON.stringify(b.loot));
  await Battle.doMove(me, 1, 5);
  Math.random = realRandom;
  const gainK = Object.keys(b.loot).filter(k=>b.loot[k]>l0[k]);
  const gainV = b.loot[gainK[0]] - l0[gainK[0]];
  assert(b.terrain[1][5]==='plain' && gainK.length===1, `T2a 开箱后变平地、恰好 1 种物资（${gainK.join(',')}）`);
  assert(gainV%2===0 && gainV>=2 && gainV<=14, `T2b 双倍量：偶数且 2-14（实际 ${gainV}）`);

  // T3 10% 分支：特殊饰品入背包，物资不入账
  const bagBefore = (g.bag.bear||0) + (g.bag.bunny||0);
  b.terrain[1][5]='pcrate'; me.row=2; me.col=5; me.hasMoved=false;
  Math.random = () => 0.05;   // <0.1 → 特殊饰品
  const l1 = JSON.parse(JSON.stringify(b.loot));
  await Battle.doMove(me, 1, 5);
  Math.random = realRandom;
  const bagDelta = (g.bag.bear||0) + (g.bag.bunny||0) - bagBefore;
  const lootDelta = Object.keys(b.loot).reduce((s,k)=>s+(b.loot[k]-l1[k]),0);
  assert(bagDelta===1 && lootDelta===0, `T3a 特殊饰品入背包 +${bagDelta}，物资 +${lootDelta}`);
  assert(['bear','bunny'].includes(g.bagInst[g.bagInst.length-1].id), 'T3b 入包实例为熊熊或兔兔');

  // T4 地形注册 + 可通行
  assert(DATA.TERRAIN.pcrate && DATA.TERRAIN.pcrate.walk===true && DATA.TERRAIN.pcrate.icon==='🎁', 'T4 pcrate 地形注册且可通行');

  // T5 百科含精品物资箱说明
  UI.wikiTab='fight'; UI.openWiki();
  const wh = elems['wiki-content'] ? elems['wiki-content'].innerHTML : '';
  assert(wh.includes('精品物资箱') && wh.includes('🎁'), 'T5 百科含精品物资箱说明');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.log('TEST ERROR', e); process.exit(1); });
