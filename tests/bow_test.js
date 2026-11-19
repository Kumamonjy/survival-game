/* V79 远程武器：弹弓(攻5/射程2)/木弓(攻10/射程3)，战斗射程 = max(自身, 武器) */
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

// T1 装备定义与配方
const SL = DATA.EQUIPS.slingshot, BOW = DATA.EQUIPS.bow, ST = DATA.EQUIPS.stick;
assert(SL && SL.slot==='weapon' && SL.stats.atk===5 && SL.range===2, 'T1a 弹弓：攻+5 / 射程 2');
assert(BOW && BOW.slot==='weapon' && BOW.stats.atk===10 && BOW.range===3, 'T1b 木弓：攻+10 / 射程 3');
assert(ST.range===1, 'T1c 木棍补 range:1（近战统一）');
const rSl = DATA.RECIPES.find(r=>r.id==='slingshot'), rBow = DATA.RECIPES.find(r=>r.id==='bow');
assert(rSl && rSl.cost.gold===25 && rSl.cost.metal===3, 'T1d 弹弓配方 25💰+3⚙️');
assert(rBow && rBow.cost.gold===50 && rBow.cost.metal===5 && rBow.cost.fabric===3, 'T1e 木弓配方 50💰+5⚙️+3🧵');

// T2 effRange：max(自身, 武器)
const soldier = Game.createChar('soldier', '老兵', false);    // 自身射程 1
const scout = Game.createChar('scout', '斥候', false);        // 自身射程 2
const hunter = Game.createChar('hunter', '猎手', false);      // 自身射程 3
g.chars.push(soldier, scout, hunter);
assert(Game.effRange(soldier)===1 && Game.effRange(scout)===2 && Game.effRange(hunter)===3, 'T2a 无武器 = 自身射程（1/2/3）');
g.workshopLv = 1; g.res.gold = 500; g.res.metal = 50; g.res.fabric = 50;
Game.craft('slingshot'); const sl1 = g.bagInst.find(e=>e.id==='slingshot');
Game.equipChar(soldier.id, 'weapon', sl1.uid);
assert(Game.effRange(soldier)===2 && Game.effAtk(soldier)===soldier.atk+5, 'T2b 军人(射程1)穿弹弓：射程 2 / 攻 +5');
Game.craft('bow'); const bow1 = g.bagInst.find(e=>e.id==='bow');
Game.equipChar(soldier.id, 'weapon', bow1.uid);
assert(Game.effRange(soldier)===3, 'T2c 换木弓：射程 3');
Game.equipChar(hunter.id, 'weapon', sl1.uid);
assert(Game.effRange(hunter)===3, 'T2d max 语义：猎人(射程3)穿弹弓不降为 2');

// T3 升级只涨攻不涨射程
g.res.gold = 500; g.res.metal = 50;
const worn = soldier.equip.weapon;              // 穿戴槽实例（与 bagInst 同 uid 不同对象）
Game.upgradeEquip(bow1.uid);                    // 木弓 +1：攻 10→12，射程仍 3
assert(worn.lv===1 && Game.effRange(soldier)===3, 'T3a 弓 +1 级射程不变');
const stAtk = Game.equipStats({ equip:{ weapon:{ uid:'x', id:'bow', lv:1 } }, maxHp:0, maxStamina:0, atk:0, def:0 });
assert(stAtk.atk===12, `T3b 弓 +1 攻 = round(10×1.2)=12（${stAtk.atk}）`);

// T4 战斗落地：mkAlly 用武器射程，3 格外敌人可攻击
Game.equipChar(soldier.id, 'weapon', bow1.uid);   // soldier 穿木弓（lv1）
const u = Battle.mkAlly(soldier, 5, 5);
Battle.b = { units:[u], selected:u, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
  mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
assert(u.range===3, 'T4a mkAlly 射程 3（武器加成生效）');
const foe = Battle.mkZombie('walker', 5, 8, 1);  // 距离 3
Battle.b.units.push(foe);
const atkSet = Battle.attackCells(u, u.range);
assert(atkSet.some(([r,c])=>r===5&&c===8), 'T4b 3 格外敌人进入攻击目标集');

// T5 工坊弹窗列出两把新武器
g.res.gold = 300; g.res.metal = 20; g.res.fabric = 10;
UI.openCraftModal();
const cm = elems['modal-body'] ? elems['modal-body'].innerHTML : '';
assert(cm.includes('弹弓') && cm.includes('木弓'), 'T5 打造弹窗含弹弓/木弓');

// T6 卸下恢复自身射程
Game.equipChar(soldier.id, 'weapon', null);
assert(Game.effRange(soldier)===1, 'T6 卸弓恢复射程 1');

console.log('--- done ---');
process.exit(0);
