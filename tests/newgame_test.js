/* V71 新游戏初始 3 角色：数量、职业随机去重、名字去重 */
const fs = require('fs');
const html = fs.readFileSync('/workspace/index.html', 'utf8');
const scripts = html.match(/<script>([\s\S]*?)<\/script>/g);
let code = scripts[scripts.length - 1].replace(/^<script>/, '').replace(/<\/script>\s*$/, '');
const bootIdx = code.lastIndexOf("Game.renderHome();\n  window.addEventListener('resize'");
code = code.slice(0, bootIdx) + "window.__T = { Game, UI, DATA };\n})();";
const elems = {};
function mkEl(){ return { innerHTML:'', textContent:'', style:{ setProperty(){} }, disabled:false, scrollTop:0, value:'', dataset:{}, children:[], className:'', classList:{toggle(){},add(){},remove(){},contains:()=>false}, setAttribute(){}, removeAttribute(){}, appendChild(c){this.children.push(c);return c;}, remove(){}, addEventListener(){}, focus(){}, blur(){}, querySelector(){return null;}, querySelectorAll(){return [];}, getBoundingClientRect(){return{width:400,height:700,top:0,left:0};} }; }
global.document = { getElementById:id=>elems[id]||(elems[id]=mkEl()), querySelector:()=>mkEl(), querySelectorAll:()=>[], addEventListener(){}, createElement:()=>mkEl(), body:mkEl() };
global.window = { addEventListener(){}, location:{search:''}, scrollTo(){}, innerWidth:400, innerHeight:700 };
global.localStorage = { getItem:()=>null, setItem(){}, removeItem(){} };
global.navigator = { userAgent:'node' };
eval(code);
const assert=(c,n)=>console.log(c?'PASS '+n:'FAIL '+n);
const { Game, UI, DATA } = window.__T;

let allOk = true;
const seenCombos = new Set();
for (let i=0; i<100; i++) {
  const g = Game.newGame();
  const cs = g.chars;
  // 1) 数量
  if (cs.length!==3) { allOk=false; console.log(`FAIL T1 第${i}轮人数=${cs.length}`); break; }
  // 2) 职业合法且互不重复
  const clss = cs.map(c=>c.cls);
  if (clss.some(k=>!DATA.CLASSES[k]) || new Set(clss).size!==3) { allOk=false; console.log(`FAIL T2 第${i}轮职业异常=${clss.join(',')}`); break; }
  seenCombos.add(clss.slice().sort().join('+'));
  // 3) 名字互不重复且来自名字池
  const names = cs.map(c=>c.name);
  if (new Set(names).size!==3 || names.some(n=>!DATA.NAMES.includes(n))) { allOk=false; console.log(`FAIL T3 第${i}轮名字异常=${names.join(',')}`); break; }
  // 4) 属性按职业初始化、状态健康
  if (cs.some(c=>c.hp<=0 || c.stamina<=0 || c.injured || c.dead)) { allOk=false; console.log(`FAIL T4 第${i}轮角色状态异常`); break; }
}
assert(allOk, 'T1-T4 100 轮：3 人 / 职业随机去重 / 名字去重 / 状态健康');
assert(seenCombos.size>=10, `T5 职业组合有多样性（100 轮出现 ${seenCombos.size} 种组合）`);

// T6 开局文案（源码检查）
assert(html.includes('你带着三名幸存者在城中落脚了'), 'T6 开局 toast 文案为三名幸存者');

console.log('--- done ---');
process.exit(allOk ? 0 : 1);
