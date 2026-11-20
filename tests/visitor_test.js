/* V134 家园访客：流动商人（回收×2 + 出售×1，三笔物资互不相同）+ 流浪者（120金+20食物招募）+ 每日过夜刷新、无付费重刷 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // T1 新档即有访客：回收×2 + 出售×1 + 流浪者 + day 匹配
  const v = g.visitors;
  assert(v && v.day === g.day, 'T1a 新档生成当日访客');
  assert(v.merchant && Array.isArray(v.merchant.buys) && v.merchant.buys.length===2 && v.merchant.sell && v.wanderer, 'T1b 商人双回收+单出售 + 流浪者齐备');
  const tres = [v.merchant.buys[0].res, v.merchant.buys[1].res, v.merchant.sell.res];
  assert(new Set(tres).size === 3, 'T1c 三笔报价物资互不相同');

  // T2 报价合理性：资源在池内、数量在区间、价格按统一单价（回收 2.5💰/份、出售 3💰/份）
  const V = DATA.VISITOR;
  const inPool = r => Object.keys(V.amt).includes(r);
  const inAmt = o => { const [a,b] = V.amt[o.res]; return o.amt>=a && o.amt<=b; };
  assert(tres.every(inPool), 'T2a 报价资源在池内');
  assert([...v.merchant.buys, v.merchant.sell].every(inAmt), 'T2b 数量在区间内');
  assert(v.merchant.buys.every(o=>o.gold===Math.round(o.amt*V.buyPrice)), 'T2c 回收价 = 数量×2.5');
  assert(v.merchant.sell.gold === v.merchant.sell.amt*V.sellPrice, 'T2d 出售价 = 数量×3');
  assert(V.recruitCost.gold===100 && V.recruitCost.food===20, 'T2e 流浪者招募价 100金+20食物');

  // T3 回收成交（两笔独立）：扣资源加金币 + done + 二次拦截
  const b0 = v.merchant.buys[0];
  g.res[b0.res] = b0.amt; g.res.gold = 100;
  const gold0 = g.res.gold, res0 = g.res[b0.res];
  Game.tradeMerchant('buys', 0);
  assert(g.res.gold === gold0 + b0.gold && g.res[b0.res] === res0 - b0.amt, 'T3a 回收成交：资源变金币');
  assert(b0.done === true && v.merchant.buys[1].done === false, 'T3b 该笔标记成交、另一笔不受影响');
  const g1 = g.res.gold;
  Game.tradeMerchant('buys', 0);
  assert(g.res.gold === g1, 'T3c 同一报价二次成交被拦截');
  const b1 = v.merchant.buys[1];
  g.res[b1.res] = b1.amt;
  const g2 = g.res.gold;
  Game.tradeMerchant('buys', 1);
  assert(g.res.gold === g2 + b1.gold && b1.done === true, 'T3d 第二笔回收可独立成交');

  // T4 出售成交：扣金币加资源 + done + 二次拦截
  const s0 = v.merchant.sell;
  g.res.gold = s0.gold + 50;
  const gold1 = g.res.gold, res1 = g.res[s0.res]||0;
  Game.tradeMerchant('sell');
  assert(g.res.gold === gold1 - s0.gold && (g.res[s0.res]||0) === res1 + s0.amt, 'T4a 出售成交：金币变资源');
  assert(s0.done === true, 'T4b 已成交');
  Game.tradeMerchant('sell');
  assert((g.res[s0.res]||0) === res1 + s0.amt, 'T4c 二次拦截');

  // T5 流浪者：职业天赋预生成 + 招募入队扣费
  const w = v.wanderer;
  assert(DATA.CLASSES[w.cls] && Array.isArray(w.talents), 'T5a 流浪者职业/天赋已预生成');
  const alive0 = g.chars.filter(c=>!c.dead).length;
  g.res.gold = 500; g.res.food = 100;
  Game.recruitWanderer();
  assert(w.recruited === true, 'T5b 招募标记');
  assert(g.chars.filter(c=>!c.dead).length === alive0+1 && g.chars.includes(w), 'T5c 流浪者入队');
  assert(g.res.gold === 500-100 && g.res.food === 100-20, 'T5d 扣 100金+20食物');
  Game.recruitWanderer();
  assert(g.chars.filter(c=>!c.dead).length === alive0+1, 'T5e 二次招募拦截');

  // T6 拦截：资源不足
  g.res.gold = 10; g.res.food = 10;
  w.recruited = false;
  const cnt0 = g.chars.length;
  Game.recruitWanderer();
  assert(g.chars.length === cnt0 && w.recruited === false, 'T6 资源不足招募被拦截');

  // T7 每日刷新：过夜生成新访客（day 更新、done 重置、物资换新）；无任何付费刷新入口
  g.res.gold = 500; g.res.food = 100;
  const oldDay = g.visitors.day;
  Game.nextDay();
  assert(g.visitors.day === g.day && g.day === oldDay+1, 'T7a 过夜刷新访客 day');
  assert(g.visitors.merchant.buys.every(o=>o.done===false) && g.visitors.merchant.sell.done === false, 'T7b 新的一天三笔报价全部重置');
  assert(!/onclick="Game\.rollVisitors/.test(html) && !/rollVisitors\(\)"/.test(html), 'T7c 无按钮入口触发 rollVisitors（不可付费重刷）');
  assert(html.includes('无法付费重刷'), 'T7d UI 明确标注无法付费重刷');

  // T8 旧档迁移：无访客旧档 applySave 补生成当日访客
  delete g.visitors;
  Game.applySave({ state: g, uid: 1000 }, 1);
  assert(g.visitors && g.visitors.day === g.day, 'T8 旧档迁移补访客');

  // T9 主界面入口与弹窗渲染（V121：按钮不再显示待处理徽标/计数）
  assert(html.includes('onclick="UI.openVisitors()"'), 'T9a 主界面家园访客按钮');
  assert(!html.includes('badge-visitor') && !html.includes('项待处理'), 'T9b 按钮无待处理徽标与计数');
  UI.openVisitors();
  const mh = Object.values(elems).map(e=>e.innerHTML).join('');
  assert(mh.includes('流动商人') && mh.includes('流浪者'), 'T9c 弹窗含双访客面板');
  assert((mh.match(/卖出<br>/g)||[]).length===2, 'T9d 弹窗渲染两条回收报价');
  assert(mh.includes('买入') && mh.includes('招募消耗'), 'T9e 按钮文案：买入/招募消耗');

  // T10 随机名字池扩容：90 个且无重复，新名字已加入
  assert(DATA.NAMES.length===90 && new Set(DATA.NAMES).size===90, `T10a 名字池 90 个且无重复（${DATA.NAMES.length}）`);
  assert(['老赵','阿娟','大壮','小舟','国庆','小文','大成'].every(n=>DATA.NAMES.includes(n)), 'T10b 新增名字已加入池');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.log('TEST ERROR', e); process.exit(1); });
