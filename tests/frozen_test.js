/* V189 新状态「冰冻」（❄️ 无法行动，与眩晕一致）+ 油桶图标红色化 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // ===== T1 状态注册 =====
  const F = DATA.STATUSES.frozen;
  assert(F && F.name==='冰冻' && F.icon==='❄️' && F.bad, 'T1a 冰冻状态注册（❄️ 负面状态）');
  assert(F.desc.includes('无法行动'), 'T1b 描述：无法行动');

  // ===== T2 玩家冰冻：回合开始被跳过 =====
  const mkA = (name,uid,r,c) => Battle.mkAlly({ uid, name, cls:'civilian', level:1, exp:0, av:'🧍',
    hp:250, maxHp:250, stamina:100, maxStamina:100, atk:20, def:5, range:1, move:3, critRate:0, critDmg:150 }, r, c);
  Battle.b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false, fire:{} };
  const p1 = mkA('幸存者','p1',5,5);
  Battle.b.units.push(p1);
  Battle.applyStatus(p1, 'frozen', 1, 'x1');
  Battle.newRoundReset(p1);
  assert(p1.hasMoved===true && p1.hasAttacked===true, 'T2 冰冻角色回合开始即视为已行动（无法行动）');
  assert(p1.sts.frozen && p1.sts.frozen.t===1, 'T2b 冰冻剩余回合存在');

  // ===== T3 敌方冰冻：AI 行动被拦截 =====
  const z = Battle.mkZombie('walker', 5, 6, 1);
  z.hp = z.maxHp; Battle.b.units.push(z);
  const p2 = mkA('诱饵','p2',5,5);
  Battle.b.units.push(p2);
  const hp0 = p2.hp;
  Battle.applyStatus(z, 'frozen', 2, 'x1');
  await Battle.zombieAct(z);
  assert(p2.hp===hp0, 'T3 冰冻的敌人本回合不攻击');

  // ===== T4 油桶图标红色化（数据驱动：filter 字段 + terrainIcon 统一渲染） =====
  const barrel = DATA.TERRAIN.barrel;
  assert(barrel && barrel.icon==='🛢️' && barrel.filter && barrel.filter.includes('hue-rotate'), 'T4 油桶带红色滤镜字段（燃烧油桶=红，未来蓝色桶不加 filter 即可）');
  assert(html.includes('function terrainIcon(T)') && html.includes("terrainIcon(t)||'⬜'"), 'T4b terrainIcon 统一渲染函数存在且用于地图/百科');
  assert(barrel.filter.includes('155') && html.includes('T.filter ? `<span style="filter:${T.filter}">${T.icon}</span>`'), 'T4c 油桶红化滤镜数据驱动，其他地形原色输出');

  // ===== T5 wiki 状态表收录 =====
  UI.wikiTab='status'; UI.openWiki();
  const sh = elems['wiki-content'].innerHTML;
  assert(sh.includes('冰冻') && sh.includes('❄️'), 'T5 百科战斗状态表含冰冻');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
