import assert from 'node:assert/strict';
import {
  directSolution,
  fixedZeroSolution,
  insertZeroSolution,
  replaceWithZeroSolution
} from '../src/game-logic.js';

const tests = [
  ['2,6 max', () => assert.deepEqual(directSolution([2,6], 0, 'max'), [6,2])],
  ['2,6 + zero max', () => assert.deepEqual(directSolution([2,6], 1, 'max'), [6,2,0])],
  ['2,6 + due zero max', () => assert.deepEqual(directSolution([2,6], 2, 'max'), [6,2,0,0])],
  ['2,6 min', () => assert.deepEqual(directSolution([2,6], 0, 'min'), [2,6])],
  ['2,6 + zero min', () => assert.deepEqual(directSolution([2,6], 1, 'min'), [2,0,6])],
  ['2,6 + due zero min', () => assert.deepEqual(directSolution([2,6], 2, 'min'), [2,0,0,6])],
  ['1,5,7 max', () => assert.deepEqual(directSolution([1,5,7], 0, 'max'), [7,5,1])],
  ['1,5,7 + zero max', () => assert.deepEqual(directSolution([1,5,7], 1, 'max'), [7,5,1,0])],
  ['1,5,7 + due zero min', () => assert.deepEqual(directSolution([1,5,7], 2, 'min'), [1,0,0,5,7])],
  ['1,5,7 zero alle decine max', () => assert.deepEqual(fixedZeroSolution([1,5,7], [1], 'max'), [7,5,0,1])],
  ['3,4,6,9 zero alle decine max', () => assert.deepEqual(fixedZeroSolution([3,4,6,9], [1], 'max'), [9,6,4,0,3])],
  ['inserimento zero: 751 -> minimo', () => assert.deepEqual(insertZeroSolution([7,5,1], 'min'), [7,0,5,1])],
  ['sostituzione zero: 751 -> minimo', () => assert.deepEqual(replaceWithZeroSolution([7,5,1], 'min'), [7,0,1])]
];

let passed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}
console.log(`\n${passed}/${tests.length} test superati.`);
