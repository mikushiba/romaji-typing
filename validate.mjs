/* レッスン教材の検証：すべての問題が「おすすめ表記」で最後まで打てるか確認。
   GitHub Actions（push/PR）で自動実行。ローカルでは `node validate.mjs`。 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const win = {};
new Function('window', readFileSync(join(__dirname, 'shared/typing-core.js'), 'utf8'))(win);
new Function('window', readFileSync(join(__dirname, 'shared/lessons.js'), 'utf8'))(win);

const R = win.Romaji;
const LESSONS = win.LESSONS;

let errors = 0, count = 0;
for (const lv of LESSONS) {
  if (lv.kind === 'free' || !lv.items) continue;                  // 自由うちこみは検証対象外
  if (lv.kind === 'keys') { count += lv.items.length; continue; } // 英字直打ちは検証対象外
  for (const item of lv.items) {
    count++;
    const toks = R.tokenize(item);
    const canon = R.canonical(toks);
    for (let i = 1; i <= canon.length; i++) {
      if (!R.evaluate(toks, canon.slice(0, i)).valid) {
        console.error(`❌ [${lv.id}] "${item}" の途中入力が無効: "${canon.slice(0, i)}"`);
        errors++; break;
      }
    }
    if (!R.evaluate(toks, canon).complete) {
      console.error(`❌ [${lv.id}] "${item}" が打ち切れない (canon="${canon}")`);
      errors++;
    }
  }
}

if (errors) { console.error(`\n検証 失敗：${errors} 件 / ${count} 問`); process.exit(1); }
console.log(`✅ 検証 OK：${count} 問すべて打てます`);
