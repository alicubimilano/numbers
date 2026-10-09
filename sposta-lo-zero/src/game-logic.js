export const PLACE_NAMES = [
  'unità',
  'decine',
  'centinaia',
  'unità di migliaia',
  'decine di migliaia',
  'centinaia di migliaia',
  'unità di milioni',
  'decine di milioni'
];

export function shuffle(array, random = Math.random) {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pickDistinctDigits(count, random = Math.random) {
  const countSafe = Math.max(2, Math.min(5, Number(count) || 3));
  return shuffle([1,2,3,4,5,6,7,8,9], random).slice(0, countSafe);
}

export function formatDigits(digits) {
  if (!digits?.length) return '—';
  return digits.join('').replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

export function sortDigits(digits, goal) {
  return digits.slice().sort((a, b) => goal === 'max' ? b - a : a - b);
}

export function directSolution(digits, zeroCount, goal) {
  const zeros = Array(Math.max(0, zeroCount)).fill(0);
  if (goal === 'max') return sortDigits(digits, 'max').concat(zeros);

  const sorted = sortDigits(digits, 'min');
  return [sorted[0], ...zeros, ...sorted.slice(1)];
}

export function fixedZeroSolution(digits, zeroPositionsFromRight, goal) {
  const fixed = [...new Set(zeroPositionsFromRight)].sort((a,b) => a-b);
  const length = digits.length + fixed.length;
  const result = Array(length).fill(null);

  for (const pos of fixed) {
    const index = length - 1 - pos;
    if (index < 0 || index >= length || index === 0) {
      throw new Error('Posizione dello zero non valida');
    }
    result[index] = 0;
  }

  const ordered = sortDigits(digits, goal);
  let cursor = 0;
  for (let i = 0; i < result.length; i += 1) {
    if (result[i] === null) result[i] = ordered[cursor++];
  }
  return result;
}

function numericValue(digits) {
  return BigInt(digits.join(''));
}

function chooseBest(candidates, goal) {
  const valid = candidates.filter(d => d[0] !== 0);
  if (!valid.length) throw new Error('Nessuna soluzione valida');
  return valid.reduce((best, candidate) => {
    if (!best) return candidate;
    const c = numericValue(candidate);
    const b = numericValue(best);
    return goal === 'max' ? (c > b ? candidate : best) : (c < b ? candidate : best);
  }, null);
}

export function insertZeroSolution(baseDigits, goal) {
  const candidates = [];
  // lo zero non viene inserito davanti alla prima cifra
  for (let index = 1; index <= baseDigits.length; index += 1) {
    const copy = baseDigits.slice();
    copy.splice(index, 0, 0);
    candidates.push(copy);
  }
  return chooseBest(candidates, goal);
}

export function replaceWithZeroSolution(baseDigits, goal) {
  const candidates = [];
  // sostituire la prima cifra con zero produrrebbe una scrittura con zero iniziale
  for (let index = 1; index < baseDigits.length; index += 1) {
    const copy = baseDigits.slice();
    copy[index] = 0;
    candidates.push(copy);
  }
  return chooseBest(candidates, goal);
}

export function arraysEqual(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function makeChallenge({ digitCount = 3, difficulty = 'medio', random = Math.random } = {}) {
  const digits = pickDistinctDigits(digitCount, random);
  const finalGoal = random() < .5 ? 'max' : 'min';
  const baseGoal = random() < .5 ? 'max' : 'min';

  const pools = {
    base: ['plain', 'zero1', 'zero1', 'zero2'],
    medio: ['plain', 'zero1', 'zero2', 'fixed1', 'insert'],
    avanzato: ['zero2', 'fixed1', 'fixed2', 'insert', 'replace']
  };
  const pool = pools[difficulty] || pools.medio;
  const type = pool[Math.floor(random() * pool.length)];
  const challenge = {
    type,
    digits,
    zeroCount: 0,
    finalGoal,
    baseGoal,
    fixedPositionsFromRight: [],
    solution: null,
    baseSolution: null,
    text: '',
    transformText: ''
  };

  const goalWords = goal => goal === 'max' ? 'più grande' : 'più piccolo';

  if (type === 'plain') {
    challenge.solution = directSolution(digits, 0, finalGoal);
    challenge.text = `Con le cifre delle carte grigie crea il numero ${goalWords(finalGoal)} possibile.`;
  }

  if (type === 'zero1' || type === 'zero2') {
    challenge.zeroCount = type === 'zero1' ? 1 : 2;
    challenge.solution = directSolution(digits, challenge.zeroCount, finalGoal);
    challenge.text = `Con le cifre delle carte grigie e ${challenge.zeroCount === 1 ? 'una carta dello 0' : 'due carte dello 0'} crea il numero ${goalWords(finalGoal)} possibile.`;
  }

  if (type === 'fixed1' || type === 'fixed2') {
    challenge.zeroCount = type === 'fixed1' ? 1 : 2;
    const length = digits.length + challenge.zeroCount;
    // esclude la posizione più a sinistra, così il numero non inizia con 0
    const possible = shuffle(Array.from({ length: length - 1 }, (_, index) => index), random);
    challenge.fixedPositionsFromRight = possible.slice(0, challenge.zeroCount).sort((a,b) => a-b);
    challenge.solution = fixedZeroSolution(digits, challenge.fixedPositionsFromRight, finalGoal);
    const placeText = challenge.fixedPositionsFromRight.map(p => PLACE_NAMES[p]).join(' e delle ');
    challenge.text = `Con le cifre delle carte grigie e ${challenge.zeroCount === 1 ? 'una carta dello 0' : 'due carte dello 0'} crea il numero ${goalWords(finalGoal)} possibile con ${challenge.zeroCount === 1 ? 'lo 0 nella posizione delle' : 'gli 0 nelle posizioni delle'} ${placeText}.`;
  }

  if (type === 'insert') {
    challenge.zeroCount = 1;
    challenge.baseSolution = directSolution(digits, 0, baseGoal);
    challenge.solution = insertZeroSolution(challenge.baseSolution, finalGoal);
    challenge.text = `Con le cifre delle carte grigie crea il numero ${goalWords(baseGoal)} possibile.`;
    challenge.transformText = `Ora inserisci una carta dello 0 nella posizione che ritieni opportuna per ottenere il numero ${goalWords(finalGoal)} possibile.`;
  }

  if (type === 'replace') {
    challenge.zeroCount = 1;
    challenge.baseSolution = directSolution(digits, 0, baseGoal);
    challenge.solution = replaceWithZeroSolution(challenge.baseSolution, finalGoal);
    challenge.text = `Con le cifre delle carte grigie crea il numero ${goalWords(baseGoal)} possibile.`;
    challenge.transformText = `Ora sostituisci una delle carte grigie con una carta dello 0 per ottenere il numero ${goalWords(finalGoal)} possibile.`;
  }

  return challenge;
}
