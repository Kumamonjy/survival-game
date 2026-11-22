/* V171 广播站招募：候选名单随存档持久化，不随天数自动刷新；刷新唯一途径 = 20💰 播报 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
let g = Game.g;

(async () => {
  // ===== T1 新档首次进入：免费生成 3 名候选 =====
  assert(!g.recruitCandidates, 'T1a 新档尚无候选名单');
  UI.openRecruit();
  assert(g.recruitCandidates && g.recruitCandidates.length === 3, 'T1b 首次打开免费生成 3 名候选');
  const batch1 = g.recruitCandidates.map(c=>c.name).join(',');

  // ===== T2 跨天不刷新：过夜后名单原样保留 =====
  const day0 = g.day;
  Game.advanceDay();
  assert(g.day === day0+1, 'T2a 已过一夜');
  assert(g.recruitCandidates.map(c=>c.name).join(',') === batch1, 'T2b 招募候选不随天数自动刷新');

  // ===== T3 存档持久化：保存→重载（applySave）后名单保留，不给免费新批次 =====
  Game.saveToSlot(1, true);
  const saved = JSON.parse(store['doomcity_save_1'] || '{}');
  const g2keys = saved && saved.state ? Object.keys(saved.state) : [];
  assert(g2keys.includes('recruitCandidates'), 'T3a recruitCandidates 已写入存档');
  Game.applySave(saved, 1);
  g = Game.g;                             // applySave 已替换 g，刷新引用
  assert(Recruit.list().length === 3 && Recruit.list().map(c=>c.name).join(',') === batch1,
    'T3b 重载后名单与退出前一致（重开游戏不再白嫖新批次）');

  // ===== T4 招募全部候选后列表为空且不自动补充 =====
  g.res.gold = 5000;
  const n0 = g.chars.length;
  while (Recruit.list().length) Recruit.hire(0);
  assert(g.chars.length === n0+3, 'T4a 三名候选全部入队');
  assert(g.recruitCandidates.length === 0, 'T4b 招完列表为空');
  UI.openRecruit();                       // 重新打开页面也不自动补充
  assert(g.recruitCandidates.length === 0, 'T4c 空列表不自动补充（openRecruit 幂等）');
  const rl = elems['recruit-list'] ? elems['recruit-list'].innerHTML : '';
  assert(rl.includes('暂无候选者'), 'T4d 空列表提示去播报');

  // ===== T5 播报免费（V213）：金币不变，名单换新 =====
  g.res.gold = 10;
  Recruit.refreshCandidates();
  assert(g.res.gold === 10 && g.recruitCandidates.length === 3, 'T5 免费播报出新 3 名（金币不变）');

  // ===== T6 唯一刷新途径：免费播报换新 3 名 =====
  g.res.gold = 100;
  Recruit.refreshCandidates();
  assert(g.res.gold === 100 && g.recruitCandidates.length === 3, 'T6a 免费播报出新 3 名');
  assert(g.recruitCandidates.map(c=>c.name).join(',') !== '', 'T6b 新名单已生成');

  // ===== T7 源码断言：两处免费自动补充已移除 =====
  assert(!/if \(!Recruit\.candidates\.length\) Recruit\.rollCandidates/.test(html), 'T7a 无「空列表自动补充」');
  assert(html.includes('g.recruitCandidates'), 'T7b 候选名单持久化到 g');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.stack||e.message); process.exit(1); });
