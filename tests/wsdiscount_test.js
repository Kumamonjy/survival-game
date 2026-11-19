/* V86 工坊升级：每级 -10% 材料消耗（向上取整），适用于打造与装备升级 */
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

(() => {
  // T1 工坊可升级配置
  assert(DATA.WORKSHOP.maxLv===5 && DATA.WORKSHOP.upgradeCost===250, 'T1a 工坊 maxLv5 / 升级 250💰');
  assert(DATA.WORKSHOP.desc.includes('10%'), 'T1b 描述含折扣说明');

  // T2 Lv1 无折扣
  g.workshopLv = 1;
  const c1 = Game.craftCost('stick');
  assert(c1.gold===30 && c1.metal===3, 'T2a Lv1 无折扣：木棍 30💰+3⚙️');
  const u1 = Game.craftCost('stick', 1);   // 升 +1：×2 无折扣
  assert(u1.gold===60 && u1.metal===6, 'T2b Lv1 装备升级 +1：60💰+6⚙️');

  // T3 Lv2 -10%：打造 ceil(30×0.9)=27💰 / ceil(3×0.9)=3⚙️
  g.res.gold = 1000; g.res.metal = 100; g.res.fabric = 100;
  Game.upgradeBuilding('workshop');
  assert(g.workshopLv===2, 'T3a 升工坊 Lv2');
  const c2 = Game.craftCost('stick');
  assert(c2.gold===27 && c2.metal===3, `T3b Lv2 打造：27💰+3⚙️（${c2.gold}+${c2.metal}）`);
  g.res.gold = 500; g.res.metal = 50;
  const gold0 = g.res.gold, metal0 = g.res.metal;
  Game.craft('stick');
  const inst = g.bagInst[g.bagInst.length-1];
  assert(g.res.gold===gold0-27 && g.res.metal===metal0-3 && inst.id==='stick', 'T3c 实扣 27💰+3⚙️');

  // T4 Lv2 装备升级折扣：+1（当前级0）= ceil(30×1×0.9)=27💰 / ceil(3×1×0.9)=3⚙️
  Game.upgradeEquip(inst.uid);
  assert(inst.lv===1 && g.res.gold===gold0-27-27 && g.res.metal===metal0-3-3, `T4 Lv2 升级 +1 实扣 27💰+3⚙️`);

  // T5 Lv3 -20%：打造 ceil(30×0.8)=24💰 / ceil(3×0.8)=3⚙️（2.4→3）
  g.res.gold = 1000;
  Game.upgradeBuilding('workshop');
  assert(g.workshopLv===3, 'T5a 升工坊 Lv3');
  const c3 = Game.craftCost('stick');
  assert(c3.gold===24 && c3.metal===3, `T5b Lv3 打造：24💰+3⚙️（${c3.gold}+${c3.metal}）`);
  const c3b = Game.craftCost('stick', 1);
  assert(c3b.gold===48 && c3b.metal===5, `T5c Lv3 升 +1→+2（级数×2）：ceil(60×0.8)=48💰 / ceil(6×0.8)=5⚙️（${c3b.gold}+${c3b.metal}）`);
  const c3c = Game.craftCost('stick', 0);
  assert(c3c.gold===24 && c3c.metal===3, 'T5d Lv3 装备升级 +1（当前级0）：24💰+3⚙️');

  // T6 UI 弹窗显示折扣
  g.res.gold = 500; g.res.metal = 50;
  UI.openCraftModal();
  const ch = elems['modal-body'] ? elems['modal-body'].innerHTML : '';
  assert(ch.includes('工坊 Lv.3') && ch.includes('-20%'), 'T6a 打造弹窗显示折扣');
  assert(ch.includes('×24'), 'T6b 打造弹窗显示折后成本');
  UI.openUpgradeModal();
  const uh = elems['modal-body'] ? elems['modal-body'].innerHTML : '';
  assert(uh.includes('已含工坊折扣 -20%'), 'T6c 升级弹窗显示折扣');

  // T7 工坊卡：Lv3 显示折扣标签且仍可升级
  UI.renderBuild();
  const bh = elems['build-page'].innerHTML;
  assert(bh.includes('材料 -20%') && bh.includes('升级到 Lv.4'), 'T7 工坊卡折扣标签 + 升级按钮');

  // T8 Lv4 -30% → Lv5 -40% → 满级拦截
  g.res.gold = 1000;
  Game.upgradeBuilding('workshop');
  assert(g.workshopLv===4, 'T8a 升工坊 Lv4');
  const c4 = Game.craftCost('stick');
  assert(c4.gold===21 && c4.metal===3, `T8b Lv4 打造 -30%：ceil(30×0.7)=21💰+3⚙️（${c4.gold}+${c4.metal}）`);
  Game.upgradeBuilding('workshop');
  assert(g.workshopLv===5, 'T8c 升工坊 Lv5');
  const c5 = Game.craftCost('stick');
  assert(c5.gold===18 && c5.metal===2, `T8d Lv5 打造 -40%：ceil(30×0.6)=18💰+ceil(3×0.6)=2⚙️（${c5.gold}+${c5.metal}）`);
  Game.upgradeBuilding('workshop');
  assert(g.workshopLv===5, 'T8e Lv5 为上限');
  UI.renderBuild();
  assert(elems['build-page'].innerHTML.includes('材料 -40%'), 'T8f Lv5 卡折扣标签');

  console.log('--- done ---');
  process.exit(0);
})();
