/* V60 废墟翻找：攻击选中废墟消耗攻击次数，每处限 1 次，随机 1-2 种物资 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // T0 建一场真实战斗（验证地图生成阶段废墟赋次数）
  UI.teamZone = DATA.ZONES[0]; UI.teamSelected = [g.chars[0].id];
  g.chars[0].stamina = 100;
  Battle.start(DATA.ZONES[0]);
  const b0 = Battle.b;
  let ruinsTotal = 0, withCount = 0;
  for (let r=0;r<Battle.ROWS;r++) for (let c=0;c<Battle.COLS;c++) {
    if (b0.terrain[r][c]==='ruin') { ruinsTotal++; if (b0.ruins[r+','+c]===1) withCount++; }
  }
  assert(ruinsTotal>0 && ruinsTotal===withCount, `T1 地图 ${ruinsTotal} 处废墟全部可翻找`);
  const b = Battle.b;

  // T2 攻击模式含废墟 + 翻找结算
  const s1 = g.chars[0]; s1.talents=[]; Game.applyTalents(s1); Game.recalc(s1);
  const me = b.units.find(u=>u.side==='ally' && u.name===g.chars[0].name) || Battle.mkAlly(s1, 5, 5);
  if (!b.units.includes(me)) b.units.push(me);
  const foe = Battle.mkZombie('walker', 9, 9, 1);
  b.units.push(foe);
  b.selected = me; b.phase='player'; b.turn=1;
  b.terrain[4][5]='ruin'; b.ruins['4,5']=1;
  b.terrain[5][6]='plain'; b.terrain[4][6]='plain';
  me.hasMoved=false; me.hasAttacked=false; me.row=5; me.col=5;
  Battle.cmdAttack();
  assert(b.targetSet.some(([r,c])=>r===4&&c===5), 'T2a 攻击目标集含可翻找废墟');
  const loot0 = JSON.parse(JSON.stringify(b.loot));
  await Battle.searchRuin(me, 4, 5);
  const gain = {};
  ['gold','food','metal','fabric','med','wood'].forEach(k=>gain[k]=b.loot[k]-loot0[k]);
  const kinds = Object.values(gain).filter(v=>v>0).length;
  assert(kinds>=1 && kinds<=2, `T2b 获得 1-2 种物资（${kinds} 种）`);
  const totalGain = Object.values(gain).reduce((a,x)=>a+x,0);
  assert(totalGain>=1 && totalGain<=10, `T2c 物资量在池范围内（合计 ${totalGain}，上限 gold7+food3=10）`);
  assert(b.ruins['4,5']===0 && me.hasAttacked===true, 'T2d 次数清零、消耗攻击');
  const subT = elems['battle-subtitle'] ? elems['battle-subtitle'].innerHTML : '';
  assert(subT.includes('翻找废墟：') && (subT.includes('💰')||subT.includes('🍞')||subT.includes('⚙️')||subT.includes('🧵')||subT.includes('💊')||subT.includes('🪵')), `T2e 字幕显示获得物资（${subT}）`);

  // T3 已翻过的废墟不再出现在攻击目标
  me.hasAttacked=false;
  Battle.cmdAttack();
  assert(!b.targetSet.some(([r,c])=>r===4&&c===5), 'T3 已翻过的废墟不可再翻');
  await Battle.searchRuin(me, 4, 5);
  assert(me.hasAttacked===false, 'T3b 重复翻找被拦截（不消耗攻击）');

  // T4 20 轮翻找值域稳定
  for (let i=0;i<20;i++) {
    const uX = Battle.mkAlly(Game.createChar('civilian','工'+i), 1, 1);
    b.units.push(uX);
    b.terrain[0][1]='ruin'; b.ruins['0,1']=1;
    const l0 = JSON.parse(JSON.stringify(b.loot));
    await Battle.searchRuin(uX, 0, 1);
    const g1 = Object.keys(b.loot).filter(k=>b.loot[k]>l0[k]).length;
    const sum1 = Object.keys(b.loot).reduce((a,k)=>a+(b.loot[k]-l0[k]),0);
    if (!(g1>=1 && g1<=2 && sum1>=1 && sum1<=10)) { assert(false, `T4 越界 ${g1}/${sum1}`); break; }
    if (i===19) assert(true, 'T4 20 轮值域稳定（1-2 种、合计 1-10，金币 3-7 上调后）');
  }

  // T5 百科含翻找说明
  UI.wikiTab='fight'; UI.openWiki();
  const wh = elems['wiki-content'] ? elems['wiki-content'].innerHTML : '';
  assert(wh.includes('废墟翻找'), 'T5 百科含废墟翻找说明');

  console.log('--- done ---');
  process.exit(0);
})();
