/* V85 长枪（武器自带技能「穿刺」）+ 毛衣（衣服 hp35/def10） */
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
  // T1 定义与配方
  const SP = DATA.EQUIPS.spear, SW = DATA.EQUIPS.sweater;
  assert(SP && SP.slot==='weapon' && SP.stats.atk===15 && SP.range===2, 'T1a 长枪：攻+15 / 射程 2');
  assert(SP.skill && SP.skill.shape==='line' && SP.skill.lineLen===2 && SP.skill.mult===1.0 && SP.skill.cost===20 && SP.skill.cd===2 && !SP.skill.equipSkill, 'T1b 穿刺：直线2格 100% / 20⚡ / CD2 / 非消耗型');
  assert(SW && SW.slot==='armor' && SW.stats.hp===35 && SW.stats.def===10, 'T1c 毛衣：生命+35 / 防御+10');
  const rSp = DATA.RECIPES.find(r=>r.id==='spear'), rSw = DATA.RECIPES.find(r=>r.id==='sweater');
  assert(rSp && rSp.cost.gold===60 && rSp.cost.wood===4 && rSp.cost.metal===3, 'T1d 长枪配方 60💰+4🪵+3⚙️');
  assert(rSw && rSw.cost.gold===75 && rSw.cost.fabric===8, 'T1e 毛衣配方 75💰+8🧵');

  // T2 属性与射程落地
  const s1 = Game.createChar('soldier', '老兵', false);
  g.chars.push(s1);
  g.workshopLv = 1; g.res.gold = 500; g.res.wood = 50; g.res.metal = 50; g.res.fabric = 50;
  Game.craft('spear'); const sp1 = g.bagInst.find(e=>e.id==='spear');
  Game.craft('sweater'); const sw1 = g.bagInst.find(e=>e.id==='sweater');
  assert(sp1 && sw1, 'T2a 打造入包');
  Game.equipChar(s1.id, 'weapon', sp1.uid);
  Game.equipChar(s1.id, 'armor', sw1.uid);
  assert(Game.effAtk(s1)===s1.atk+15 && Game.effRange(s1)===2, 'T2b 穿枪：攻 +15 / 射程 1→2');
  assert(Game.effHp(s1)===s1.maxHp+35 && Game.effDef(s1)===s1.def+10, 'T2c 穿毛衣：生命 +35 / 防御 +10');

  // T3 mkAlly 聚合武器技能（不消耗装备）
  Battle.b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  const u = Battle.mkAlly(s1, 5, 5);
  Battle.b.units.push(u);
  u.critRate = 0;   // 排除暴击随机性
  assert(u.skills.some(s=>s.name==='穿刺'), 'T3a 战斗技能表含「穿刺」');
  assert(u.atk===Game.effAtk(s1) && u.range===2, 'T3b 单位属性含武器加成');

  // T4 穿刺执行：直线 2 格双敌各 100% 伤害、耗 20⚡、进 CD、不耗装备
  const f1 = Battle.mkZombie('walker', 5, 6, 1); f1.hp = f1.maxHp;
  const f2 = Battle.mkZombie('walker', 5, 7, 1); f2.hp = f2.maxHp;
  Battle.b.units.push(f1, f2);
  Battle.b.selected = u;
  u.stamina = 100;
  const hp1 = f1.hp, hp2 = f2.hp;
  await Battle.execSkill(u, { sk: DATA.EQUIPS.spear.skill, dir:[5,6] });   // dir = 选中格（右方）
  const dmg = Math.max(1, u.atk - f1.def);
  assert(f1.hp===hp1-dmg && f2.hp===hp2-dmg, `T4a 直线双敌各受 100% 攻（-${dmg}）`);
  assert(u.stamina===80 && u.cds['穿刺']===2, 'T4b 消耗 20⚡ / 进 CD 2 回合');
  assert(s1.equip.weapon && s1.equip.weapon.id==='spear', 'T4c 长枪不被消耗');

  // T5 line 形状不越界（3 格处敌人不受影响）
  const f3 = Battle.mkZombie('walker', 5, 8, 1); f3.hp = f3.maxHp;
  Battle.b.units.push(f3);
  const hp3 = f3.hp;
  u.cds = {};
  u.stamina = 100;
  await Battle.execSkill(u, { sk: DATA.EQUIPS.spear.skill, dir:[5,6] });
  assert(f3.hp===hp3, 'T5 直线 2 格外敌人不受影响');

  // T6 毛衣升级（+20%/级）——用身上槽引用（equipChar 会复制新对象入槽）
  g.res.gold = 500; g.res.fabric = 60;
  const wornSw = s1.equip.armor;
  Game.upgradeEquip(wornSw.uid);   // 毛衣 +1：75💰+8🧵
  assert(wornSw.lv===1, 'T6a 毛衣可升级');
  const probe = { equip:{ armor:{ uid:'x', id:'sweater', lv:1 } }, maxHp:0, maxStamina:0, atk:0, def:0 };
  const st1 = Game.equipStats(probe);
  assert(st1.hp===42 && st1.def===12, `T6b +1 毛衣 = round(35×1.2)=42❤️ / round(10×1.2)=12🛡️（${st1.hp}/${st1.def}）`);

  // T7 打造弹窗 + 百科自动入表
  g.res.gold = 300; g.res.metal = 20; g.res.fabric = 20;
  UI.openCraftModal();
  assert((elems['modal-body'] ? elems['modal-body'].innerHTML : '').includes('长枪') && (elems['modal-body'] ? elems['modal-body'].innerHTML : '').includes('毛衣'), 'T7a 打造弹窗含长枪/毛衣');
  UI.wikiTab = 'equip';
  UI.openWiki();
  const wh = elems['wiki-content'].innerHTML;
  assert(wh.includes('长枪') && wh.includes('毛衣') && wh.includes('穿刺'), 'T7b 百科装备图鉴自动收录');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
