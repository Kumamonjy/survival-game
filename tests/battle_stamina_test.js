/* V156 参战体力链路：探险/尸潮出征费 15⚡ + 技能消耗 + 战后回写 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;

const SK = { name:'测试突刺', desc:'', cost:25, cd:3, type:'attack', shape:'target', mult:1, range:99 };
const HIT = { name:'测试重击', desc:'', cost:30, cd:3, type:'attack', shape:'target', mult:1, range:99 };

(async () => {
  // ===== T1 探险：出战扣 15 / 技能扣费 / 战后回写 =====
  {
    const g = Game.g;
    const a = g.chars[0], b = g.chars[1];
    a.injured = b.injured = false;
    a.stamina = 100; b.stamina = 100;
    UI.teamSelected = [a.id, b.id];
    await Battle.start(DATA.ZONES[0]);
    assert(a.stamina === 85 && b.stamina === 85, `T1a 探险出战每人扣 15⚡（${a.stamina}/${b.stamina}）`);
    const ua = Battle.b.units.find(u => u.ref === a);
    assert(ua.stamina === 85 && ua.maxStamina === Game.effSt(a), 'T1b 战斗单位体力快照 = 扣除后的角色体力');
    const foe = Battle.b.units.find(u => u.side === 'enemy');
    foe.hp = foe.maxHp = 99999;          // 不让敌人死亡，避免提前结算
    ua.skills = [SK]; ua.hasAttacked = false;
    await Battle.execSkill(ua, { sk: SK, target: foe });
    assert(ua.stamina === 60, `T1c 战斗中使用技能消耗 25⚡（余 ${ua.stamina}）`);
    const bg = Battle.b.units.find(u => u.ref === b);
    assert(bg.stamina === 85, 'T1d 未用技能的角色体力不变');
    Battle.b.turn = 5;                   // 模拟历时 5 回合
    Battle.finish('flee');
    assert(a.stamina === 50 && b.stamina === 75, `T1e 战后回写：技能消耗 + 回合×2（${a.stamina}/${b.stamina}）`);
    const resHtml = elems['modal-body'] ? elems['modal-body'].innerHTML : '';
    assert(resHtml.includes('战后续航（5 回合 ×2）') && resHtml.includes('-10 体力'), 'T1f 结算界面显示回合体力消耗');
  }

  // ===== T2 尸潮：全员守城同样扣 15⚡ / 技能扣费 / 战后回写 =====
  {
    const g2 = Game.newGame(); Game.g = g2;
    const x = g2.chars[0], y = g2.chars[1], z = g2.chars[2];
    [x, y, z].forEach(c => { c.injured = false; c.hp = Game.effHp(c); });
    x.stamina = 100; y.stamina = 100; z.stamina = 10;   // z 体力不足 15：仍强制参战，扣至 0
    g2.day = 10; g2.hordeDone = 0; g2.weather = 'sunny';
    g2.towerArrowLv = 0; g2.towerBallistaLv = 0;
    Battle.startHorde();
    assert(x.stamina === 85 && y.stamina === 85, `T2a 尸潮守城每人扣 15⚡（${x.stamina}/${y.stamina}）`);
    assert(z.stamina === 0, 'T2b 体力不足 15 的成员仍参战，扣至 0');
    assert(Battle.b.units.some(u => u.ref === z), 'T2c 低体力成员仍在守城队列中');
    const ux = Battle.b.units.find(u => u.ref === x);
    assert(ux.stamina === 85, 'T2d 守城单位体力快照 = 扣除后的角色体力');
    const foe = Battle.b.units.find(u => u.side === 'enemy');
    foe.hp = foe.maxHp = 99999;
    ux.skills = [HIT]; ux.hasAttacked = false;
    await Battle.execSkill(ux, { sk: HIT, target: foe });
    assert(ux.stamina === 55, `T2e 守城中技能消耗 30⚡（余 ${ux.stamina}）`);
    // 只保留一只残血敌人击破，避免多只经验触发升级回体力
    const b = Battle.b;
    b.units = b.units.filter(u => u.side !== 'enemy' || u === foe);
    foe.hp = 0;
    Battle.b.turn = 8;                  // 守城战不按回合扣体力（仍只有 15⚡ 出征费）
    Battle.finish('win');
    assert(x.stamina === 55 && y.stamina === 85, `T2f 守城战后回写角色体力，不额外扣回合消耗（${x.stamina}/${y.stamina}）`);
  }

  // ===== T3 体力下限：回合消耗不会扣成负数 =====
  {
    const g3 = Game.newGame(); Game.g = g3;
    const c = g3.chars[0];
    c.injured = false; c.stamina = 20;
    UI.teamSelected = [c.id];
    await Battle.start(DATA.ZONES[0]);
    assert(c.stamina === 5, 'T3a 出战后只剩 5⚡');
    Battle.b.turn = 10;                 // 10 回合 ×2 = 20⚡
    Battle.finish('flee');
    assert(c.stamina === 0, `T3b 体力最低为 0，不会为负（${c.stamina}）`);
  }

  console.log('--- done ---');
  process.exit(0);
})().catch(e => { console.log('TEST ERROR', e); process.exit(1); });
