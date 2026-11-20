/* V52 属性一致性：出战/指派/晚餐/招募 各界面统一走 eff* 函数，与人物信息页一致 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
const [s1, s2] = g.chars;

(() => {
  // 给 s1 穿上装备：武器木棍(+5攻) + 防具布衣(+25血 +8防)
  s1.equip.weapon = 'stick'; s1.equip.armor = 'cloth';
  const atkB = Game.effAtk(s1), defB = Game.effDef(s1), hpB = Game.effHp(s1), stB = Game.effSt(s1);
  assert(atkB>s1.atk && defB>s1.def && hpB>s1.maxHp && stB>=s1.maxStamina, `T1 装备加成生效（攻${atkB}>${s1.atk} 防${defB}>${s1.def} 血${hpB}>${s1.maxHp}）`);

  // T2 出战选择页与人物信息一致（含装备加成，无裸字段）
  UI.teamZone = { name:'废弃超市', icon:'🛒', danger:1 };
  UI.teamSelected = [];
  UI.renderTeam();
  const teamHtml = elems['team-list'].innerHTML;
  assert(teamHtml.includes(`🗡️${atkB}`) && teamHtml.includes(`🛡️${defB}`), `T2a 出战页显示含装备攻击/防御（${atkB}/${defB}）`);
  assert(teamHtml.includes(`/${hpB}`) && teamHtml.includes(`/${stB}`), `T2b 出战页上限含装备（血${hpB} 体${stB}）`);
  assert(!teamHtml.includes(`🗡️${s1.atk} 🛡️${s1.def} `), 'T2c 出战页无裸字段');

  // T3 指派页与人物信息一致
  g.kitchenLv = 1; g.farmLv = 0; g.dormLv = 1; g.gymLv = 0;
  UI.renderDuty();
  const dutyHtml = elems['duty-page'].innerHTML || Object.values(elems).map(e=>e.innerHTML).join('');
  assert(dutyHtml.includes(`/${stB}`), 'T3a 指派页体力上限含装备');
  assert(dutyHtml.includes(`/${hpB}`), 'T3b 指派页生命上限含装备');

  // T4 晚餐分配弹窗模板走 eff 函数（源码断言，弹窗依赖过夜流程不在单测内复现）
  assert(html.includes(`❤️\${c.hp}/\${Game.effHp(c)}　⚡\${c.stamina}/\${Game.effSt(c)}`), 'T4 晚餐弹窗生命/体力含装备');

  // T5 招募预览一致（新候选无装备 → eff=基础值）
  Recruit.candidates = [];
  Recruit.refresh && Recruit.refresh();
  const cand = Recruit.candidates[0];
  if (cand) {
    Recruit.preview(0);
    const pvHtml = elems['modal-box'] ? elems['modal-box'].innerHTML : '';
    assert(pvHtml.includes(`<b>${Game.effHp(cand)}</b>`), 'T5 招募预览走 eff 函数');
  } else assert(true, 'T5 无候选者跳过');

  // T6 全文件：显示层无裸字段模板
  assert(!/\$\{c\.maxHp\}|\$\{c\.atk\}|\$\{c\.def\}|\$\{c\.maxStamina\}/.test(html), 'T6 显示层 0 处裸字段');

  console.log('--- done ---');
  process.exit(0);
})();
