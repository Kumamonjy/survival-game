/* V150 尸潮来袭：每10天守城战（全员出战 / 工事中间行 / 人数+3 / 难度2星 / 失守损失30%） */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, DATA } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  const H = DATA.HORDE;
  assert(H && H.interval===10 && H.extra===3 && H.midRow===6, 'T1a 配置：每10天、额外3只、工事在中间行');
  assert(H.lossPct===0.3 && H.gold[0]===20, 'T1b 失守扣30%、守城额外金币');

  // ===== T2 触发判定 =====
  g.day = 1; g.hordeDone = 0;
  assert(!Game.hordePending(), 'T2a 第1天不触发');
  g.day = 10;
  assert(Game.hordePending(), 'T2b 第10天待守');
  g.hordeDone = 10;
  assert(!Game.hordePending(), 'T2c 当天已守过不再触发');
  g.day = 11; g.hordeDone = 0;
  assert(!Game.hordePending(), 'T2d 第11天不触发');
  g.day = 20;
  assert(Game.hordePending(), 'T2e 第20天再次来袭');

  // ===== T3 开战：全员出战 / 人数 / 工事位置 / 等级 =====
  g.day = 10; g.hordeDone = 0; g.chars = [];
  const cs = [0,1,2,3].map(i=>Game.createChar('civilian','守'+i));
  cs.forEach(c=>g.chars.push(c));
  cs.forEach(c=>{ c.stamina=100; c.hp=c.maxHp; });
  cs[1].injured = true;                       // 重伤不上场
  g.towerArrowLv = 1; g.towerArrowOp = cs[3].id;   // cs3 操控工事，不占出战位
  g.weather = 'sunny';
  Battle.startHorde();
  const b = Battle.b;
  assert(b && b.horde && b.zone.id==='horde', 'T3a 进入守城战');
  const foes = b.units.filter(u=>u.side==='enemy');
  assert(foes.length === g.chars.length + 3, `T3b 丧尸数 = 总人数+3（${foes.length}）`);
  assert(foes.every(u=>!u.boss), 'T3c 不刷霸主');
  const fighters = b.units.filter(u=>u.side==='ally' && !u.isTower);
  assert(fighters.length===2 && fighters.every(u=>u.ref===cs[0]||u.ref===cs[2]), 'T3d 存活未重伤者全员出战，操作员与重伤者不上场');
  const towers = b.units.filter(u=>u.isTower);
  assert(towers.length===1 && towers[0].row===H.midRow, 'T3e 工事部署在中间一行');
  assert(cs[3].stamina===85, 'T3f 操作员工事参战消耗15⚡');
  const avg = (cs[0].level + cs[2].level) / 2;
  assert(b.zLevel === Math.max(1, Math.floor(avg)-1), 'T3g 丧尸等级 = 出战平均等级向下取整 -1');

  // ===== T4 守城胜利：金币 + 物资 + 经验，不占探索次数 =====
  g.res.gold = 100;
  const exp0 = cs[0].exp;
  foes.forEach(u=>{ u.hp = 0; });   // 模拟击溃全部丧尸
  Battle.finish('win');
  await new Promise(r=>setTimeout(r, 10));
  assert(g.res.gold >= 120, 'T4a 胜利额外金币 ≥20');
  const matGain = ['food','med','metal','wood','fabric'].reduce((s,k)=>s+(g.res[k]||0),0);
  assert(matGain > 0, 'T4b 胜利发放随机物资');
  assert(cs[0].exp > exp0, 'T4c 全员获得经验');
  assert(g.todayExplored === 0, 'T4d 守城不消耗当日探索次数');

  // ===== T5 失守：金币与全部资源 -30%、全员重伤不死 =====
  g.res = { gold:500, food:20, med:10, metal:10, fabric:10, wood:10 };
  const loss = Game.applyHordeLoss(g);
  assert(loss.gold===150 && g.res.gold===350, 'T5a 金币损失 30%');
  assert(g.res.food===14 && g.res.med===7, 'T5b 其余资源同样 -30%');
  assert(g.chars.filter(c=>!c.dead).every(c=>c.injured), 'T5c 存活角色全员重伤');
  assert(g.chars.every(c=>!c.dead), 'T5d 不会死亡');

  // ===== T6 守城结束：继续过夜进入次日 + 切回主界面（V225 修复） =====
  g.day = 10; g.hordeDone = 0;
  const shown = [];
  const origShow = UI.showScreen;
  UI.showScreen = s => { shown.push(s); origShow(s); };
  Battle.b = { horde:true, units:[], terrain:[], loot:{}, log:[], stats:{}, over:true, zone:{id:'horde'} };
  Battle.endHorde();
  UI.showScreen = origShow;
  assert(g.day === 11, 'T6a 过夜后进入第11天');
  assert(g.hordeDone === 10, 'T6b 记录第10天尸潮已守');
  assert(shown.includes('scr-home'), 'T6c 尸潮结算后切回主界面（V225：弹窗关闭不再停留在战斗界面）');

  console.log('--- done ---');
  process.exit(0);
})();
