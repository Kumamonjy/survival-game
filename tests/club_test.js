/* V111 棍棒（atk+15 近战）+ 木棍/棍棒共用技能「棍棒打击」（1格 140%，15⚡ CD3） */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
{ const sm = Game.createChar('civilian','工匠甲'); sm.stamina = 9999; sm.injured = false;
  g.chars.push(sm); g.workshopLv = 1; Game.assignWorkshop(sm.id); }
g.res.gold = 500; g.res.wood = 30; g.res.metal = 30; g.res.fabric = 30;

(async () => {
  // T1 定义：棍棒 atk+15 射程1 / 自带棍棒打击
  const club = DATA.EQUIPS.club;
  assert(club && club.slot==='weapon' && club.stats.atk===15 && club.range===1, 'T1a 棍棒：攻+15 射程1');
  assert(club.skill && club.skill.name==='棍棒打击' && club.skill.mult===1.4 && club.skill.cost===15 && club.skill.cd===3, 'T1b 棍棒自带技能 140%/15⚡/CD3');
  assert(DATA.EQUIPS.stick.skill && DATA.EQUIPS.stick.skill.name==='棍棒打击' && DATA.EQUIPS.stick.skill.mult===1.4, 'T1c 木棍也带同款技能');

  // T2 配方与工坊：45💰+4🪵+1⚙️ / 20⚡
  const rc = DATA.RECIPES.find(r=>r.id==='club');
  assert(rc && rc.cost.gold===45 && rc.cost.wood===4 && rc.cost.metal===1 && rc.stamina===20, 'T2 配方 45💰+4🪵+1⚙️ / 20⚡');
  Game.craft('club');
  const inst = (g.bagInst||[]).find(e=>e.id==='club');
  assert(inst && inst.lv===0, 'T2b 棍棒打造入包');

  // T3 属性链：effAtk +15，射程 1（固定近战角色，避免随机职业全远程导致兜底失败）
  const s1 = Game.createChar('civilian','持棒者'); s1.stamina = 9999; s1.talents = []; Game.applyTalents(s1); Game.recalc(s1); g.chars.push(s1);
  Game.equipChar(s1.id, 'weapon', inst.uid);
  assert(Game.effAtk(s1)===s1.atk+15, 'T3a 装备棍棒 effAtk +15');
  assert(Game.effRange(s1)===1, 'T3b 射程 1');

  // T4 mkAlly 聚合：战斗单位带「棍棒打击」
  Battle.b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  const u = Battle.mkAlly(s1, 5, 5);
  Battle.b.units.push(u);
  u.critRate = 0; u.cds = {};
  assert(u.skills.some(s=>s.name==='棍棒打击'), 'T4a 战斗技能表含棍棒打击');
  assert(u.atk===Game.effAtk(s1) && u.range===1, 'T4b 单位属性含武器加成');

  // T5 技能执行：1 格内敌人 140% 伤害（无暴击随机性）
  const foe = Battle.mkZombie('walker', 5, 6, 1); foe.hp = foe.maxHp;
  Battle.b.units.push(foe);
  u.stamina = 100;
  const hp0 = foe.hp;
  await Battle.execSkill(u, { sk: DATA.EQUIPS.club.skill, dir:[5,6] });
  const dmg = Math.max(1, Math.round(u.atk*1.4) - foe.def);
  assert(foe.hp===hp0-dmg, `T5a 伤害 = round(atk×1.4)-防（-${dmg}）`);
  assert(u.stamina===85 && u.cds['棍棒打击']===3, 'T5b 消耗 15⚡ / 进 CD 3 回合');
  assert(u.skills.some(s=>s.name==='棍棒打击') && !u.skills.some(s=>s.name==='穿刺'), 'T5c 无误带其他武器技能');

  // T6 射程外不可用：2 格外目标不受影响
  const far = Battle.mkZombie('walker', 5, 8, 1); far.hp = far.maxHp;
  Battle.b.units.push(far);
  const hpFar = far.hp;
  u.cds = {}; u.stamina = 100;
  await Battle.execSkill(u, { sk: DATA.EQUIPS.club.skill, dir:[5,8] });
  assert(far.hp===hpFar || far.hp<hpFar-Math.round(u.atk*1.4), 'T6 execSkill 不处理超程目标（选择层已限制 1 格）');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.log('TEST ERROR', e); process.exit(1); });
