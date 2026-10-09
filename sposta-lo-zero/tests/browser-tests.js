import { directSolution, fixedZeroSolution, insertZeroSolution, replaceWithZeroSolution, arraysEqual } from '../src/game-logic.js';

const cases = [
  ['62', directSolution([2,6],0,'max'), [6,2]],
  ['620', directSolution([2,6],1,'max'), [6,2,0]],
  ["6'200", directSolution([2,6],2,'max'), [6,2,0,0]],
  ['206', directSolution([2,6],1,'min'), [2,0,6]],
  ["7'501", fixedZeroSolution([1,5,7],[1],'max'), [7,5,0,1]],
  ["96'403", fixedZeroSolution([3,4,6,9],[1],'max'), [9,6,4,0,3]],
  ["7'051", insertZeroSolution([7,5,1],'min'), [7,0,5,1]],
  ['701', replaceWithZeroSolution([7,5,1],'min'), [7,0,1]]
];

const list = document.querySelector('#results');
let passed = 0;
for (const [label, actual, expected] of cases) {
  const ok = arraysEqual(actual, expected);
  if (ok) passed += 1;
  const li = document.createElement('li');
  li.className = ok ? 'ok' : 'bad';
  li.textContent = `${ok ? '✓' : '✗'} ${label}: ${actual.join('')} ${ok ? '' : `(atteso ${expected.join('')})`}`;
  list.appendChild(li);
}
document.querySelector('#summary').textContent = `${passed}/${cases.length} test superati.`;
