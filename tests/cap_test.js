/* V118 取消 8 人招募上限：广播/流浪者/里程碑投奔均可超员，招募页显示当前人数 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
while (g.chars.filter(c=>!c.dead).length < 8) g.chars.push(Game.createChar('civilian'));

(async () => {
  // T1 满 8 人后广播招募仍成功
  g.recruitCandidates = [Game.createChar('soldier')];
  g.res.gold = 999;
  Recruit.hire(0);
  assert(g.chars.filter(c=>!c.dead).length === 9, 'T1 满编后广播招募成功（9 人）');

  // T2 里程碑投奔不再留 50 金离去，直接加入
  const gold0 = g.res.gold;
  Game.addRecruitJoin();
  assert(g.chars.filter(c=>!c.dead).length === 10 && g.res.gold === gold0, 'T2 里程碑投奔直接加入（10 人，不发钱）');

  // T3 流浪者满编可招募
  Game.rollVisitors(g);
  const alive0 = g.chars.filter(c=>!c.dead).length;
  if (g.visitors) { g.res.gold = 999; g.res.food = 99; Game.recruitWanderer(); }
  assert(g.chars.filter(c=>!c.dead).length === alive0+1, 'T3 满编后流浪者招募成功');

  // T4 满编刷新广播正常扣 20 金
  const gold1 = g.res.gold;
  Recruit.refreshCandidates();
  assert(g.res.gold === gold1-20 && g.recruitCandidates.length === 3, 'T4 满编可刷广播（扣 20 金换 3 候选）');

  // T5 招募页：显示当前人数行，不再出现「队伍已满」面板
  UI.renderRecruit();
  const rl = elems['recruit-list'] ? elems['recruit-list'].innerHTML : '';
  assert(rl.includes('招募无人数上限') || rl.includes('当前队伍'), 'T5a 招募页显示人数与无上限说明');
  assert(!rl.includes('队伍已满'), 'T5b 满员拦截面板已移除');

  // T6 家园访客弹窗不再有「队伍已满」警告，百科不含旧上限文案
  UI.openVisitors();
  const mh = Object.values(elems).map(e=>e.innerHTML).join('');
  assert(!mh.includes('队伍已满'), 'T6a 访客弹窗无满员警告');
  assert(!html.includes('队伍上限 8 人') && !html.includes('上限 8 人'), 'T6b 百科/源码清除旧上限文案');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.log('TEST ERROR', e); process.exit(1); });
