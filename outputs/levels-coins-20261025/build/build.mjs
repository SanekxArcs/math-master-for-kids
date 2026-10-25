import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';
import { goalForLevel } from '../../../src/engine/level.ts';
import { coinsForLevel, STARTING_COINS, DAILY_BONUS, POINTS_PER_COIN, LEVEL_COINS } from '../../../src/engine/pet.ts';

const out = path.resolve('outputs/levels-coins-20261025');
const wb = Workbook.create();
const s = wb.worksheets.add('Рівні та монети');
s.showGridLines = false;
s.tabColor = '#6D28D9';
s.getRange('A1:J32').format.font = { name: 'Arial', size: 11, color: '#27223A' };
s.getRange('A1:J32').format.rowHeight = 23;
s.getRange('A1:J32').format.verticalAlignment = 'center';
const widths = { A: 18, B: 18, C: 16, D: 16, E: 19, F: 25, G: 25, H: 3, I: 49, J: 12 };
for (const [col, width] of Object.entries(widths)) s.getRange(`${col}1:${col}32`).format.columnWidth = width;
s.getRange('A2').values = [['Math Master: рівні та монети']];
s.getRange('A2').format.font = { name: 'Arial', size: 17, bold: true, color: '#5B21B6' };
s.getRange('A3:G3').format.borders = { bottom: { style: 'thin', color: '#DDD6FE' } };
s.getRange('A5').values = [['Ціль рівня 1']];
s.getRange('B5').values = [[100]];
s.getRange('B5').format.fill = '#FEF3C7';
s.getRange('B5').format.font = { bold: true, color: '#92400E' };
s.getRange('C5').values = [['балів']];
s.getRange('A6').values = [['Змініть жовту клітинку B5, якщо ціль у грі інша.']];
s.getRange('A6').format.font = { italic: true, color: '#6B647A' };
s.getRange('E5').values = [['Кількість рівнів']];
s.getRange('F5').formulas = [['=COUNT(A9:A25)']];
s.getRange('E6').values = [['Монет за всі рівні']];
s.getRange('F6').formulas = [['=SUM(E9:E25)']];
s.getRange('F5:F6').format.font = { bold: true, color: '#5B21B6' };
s.getRange('I2').values = [['Правила нарахування']];
s.getRange('I2').format.font = { name: 'Arial', size: 14, bold: true, color: '#5B21B6' };
s.getRange('I4:J9').values = [
  ['Стартові монети', STARTING_COINS], ['Бонус першої винагороди дня', DAILY_BONUS],
  ['Балів за 1 монету', POINTS_PER_COIN], ['Бонус за кожен рівень вище першого', LEVEL_COINS],
  ['Множник цілі наступного рівня', 1.5], ['Максимальна ціль, балів', 10000],
];
s.getRange('J4:J9').format.fill = '#F3F0FA';
s.getRange('J4:J9').setNumberFormat('#,##0');
s.getRange('J8').setNumberFormat('0.0');
s.getRange('A8:G8').values = [['Рівень', 'Ціль, балів', 'За бали, монет', 'За рівень, монет', 'За перемогу, монет', 'Перша винагорода дня, монет', 'Разом без бонусів, монет']];
s.getRange('A8:G8').format = {
  fill: '#5B21B6', font: { name: 'Arial', size: 11, color: '#FFFFFF', bold: true },
  horizontalAlignment: 'center', verticalAlignment: 'center', wrapText: true, rowHeight: 42,
};
const rows = [];
for (let row = 9; row <= 25; row++) {
  rows.push([
    row === 9 ? '=1' : `=IF(A${row - 1}="","",IF(B${row - 1}>=$J$9,"",A${row - 1}+1))`,
    `=IF(A${row}="","",IF(A${row}=1,MIN($J$9,$B$5),MIN($J$9,ROUND($B$5*$J$8^(A${row}-1)/10,0)*10)))`,
    `=IF(A${row}="","",MAX(1,ROUND(B${row}/$J$6,0)))`,
    `=IF(A${row}="","",$J$7*(A${row}-1))`,
    `=IF(A${row}="","",SUM(C${row}:D${row}))`,
    `=IF(A${row}="","",E${row}+$J$5)`,
    `=IF(A${row}="","",SUM($E$9:E${row}))`,
  ]);
}
s.getRange('A9:G25').formulas = rows;
s.getRange('A9:G25').setNumberFormat('#,##0');
s.getRange('A9:G25').format.horizontalAlignment = 'right';
s.getRange('E9:E25').format.font = { bold: true, color: '#5B21B6' };
s.getRange('A9:G25').conditionalFormats.addCustom('AND(ISNUMBER($A9),MOD($A9,2)=1)', { fill: '#F5F2FC' });
s.getRange('A9:G25').conditionalFormats.addCustom('$B9=$J$9', { fill: '#EDE9FE', font: { bold: true } });
s.dataValidations.add({ range: 'B5', rule: { type: 'whole', operator: 'between', formula1: 20, formula2: 10000 } });
s.getRange('I12').values = [['Коли дають монети']];
s.getRange('I12').format.font = { bold: true, color: '#5B21B6' };
const notes = [
  'Бонус дня — один раз за календарний день.',
  'Повторна перемога знову дає монети.',
  'Дострокове завершення з увімкненою ціллю: 0.',
  'Без цілі: 1 монета за повні 20 балів.',
  'Бонус дня діє й у режимі без цілі.',
  'Мінігра з тваринкою не дає монет.',
  'Програш повертає до рівня 1.',
  'Витрати на тваринок тут не віднято.',
  'Стартові 10 монет не входять у суми.',
];
s.getRange('I13:I21').values = notes.map((x) => [x]);
s.getRange('I24').values = [['Джерело: поточний код Math Master.']];
s.getRange('I25').values = [['goalForLevel, coinsForLevel, sessionReward.']];
s.getRange('I26').values = [['Правила перевірено 25.10.2026.']];
s.getRange('I24:I26').format.font = { italic: true, color: '#6B647A' };
s.getRange('A28').values = [['За бали: ціль / 20, округлена до цілого. За рівень: 5 × (рівень − 1).']];
s.getRange('A29').values = [['«Перша винагорода дня» — приклад для кожного рівня. Бонус не додається до кожної перемоги.']];
s.getRange('A30').values = [['«Разом без бонусів» — по одній перемозі на кожному рівні. Без стартових монет та щоденних бонусів.']];
s.getRange('A31').values = [['Порожні рядки після останнього рівня недоступні у грі: ціль уже досягла 10 000 балів.']];
s.getRange('A28:A31').format.font = { color: '#6B647A', size: 11 };
s.freezePanes.freezeRows(8);

function verify(base) {
  s.getRange('B5').values = [[base]];
  wb.recalculate();
  const data = s.getRange('A9:G25').values;
  let cumulative = 0;
  let count = 0;
  for (let i = 0; i < 17; i++) {
    const level = i + 1;
    if (i > 0 && goalForLevel(base, level - 1) >= 10000) {
      assert.equal(data[i][0], '');
      continue;
    }
    const goal = goalForLevel(base, level);
    const coins = coinsForLevel(goal, level);
    cumulative += coins;
    assert.deepEqual(data[i], [level, goal, Math.max(1, Math.round(goal / POINTS_PER_COIN)), LEVEL_COINS * i, coins, coins + DAILY_BONUS, cumulative]);
    count++;
  }
  assert.equal(s.getRange('F5').values[0][0], count);
  assert.equal(s.getRange('F6').values[0][0], cumulative);
  return { base, levels: count, total: cumulative };
}
for (const base of [20, 200, 10000, 100]) console.log('Verified against game engine:', verify(base));
const errorScan = await wb.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#N/A', options: { useRegex: true, maxResults: 10 }, maxChars: 1000 });
console.log(errorScan.ndjson);
console.log(JSON.stringify(s.getRange('A9:G21').values));
const preview = await wb.render({ sheetName: s.name, range: 'A1:J32', scale: 1.4, format: 'png' });
await fs.writeFile(path.join(out, 'preview.png'), new Uint8Array(await preview.arrayBuffer()));
const xlsx = await SpreadsheetFile.exportXlsx(wb);
await xlsx.save(path.join(out, 'Рівні-та-монети.xlsx'));
console.log('Saved workbook.');
