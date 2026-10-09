import {
  PLACE_NAMES,
  arraysEqual,
  formatDigits,
  makeChallenge,
  shuffle
} from './game-logic.js';

const $ = selector => document.querySelector(selector);
const elements = {
  difficulty: $('#difficulty'),
  digitCount: $('#digitCount'),
  modeButtons: [...document.querySelectorAll('.mode-button')],
  score: $('#score'),
  streak: $('#streak'),
  timer: $('#timer'),
  phaseLabel: $('#phaseLabel'),
  challengeText: $('#challengeText'),
  newChallenge: $('#newChallenge'),
  hand: $('#hand'),
  answerSlots: $('#answerSlots'),
  placeLabels: $('#placeLabels'),
  numberReadout: $('#numberReadout'),
  transformZone: $('#transformZone'),
  togglePlaces: $('#togglePlaces'),
  undoButton: $('#undoButton'),
  resetButton: $('#resetButton'),
  checkButton: $('#checkButton'),
  hintButton: $('#hintButton'),
  feedback: $('#feedback')
};

const state = {
  mode: 'training',
  score: 0,
  streak: 0,
  secondsLeft: 60,
  timerId: null,
  challenge: null,
  hand: [],
  chosenIds: [],
  phase: 1,
  baseBuilt: [],
  locked: false,
  showPlaces: false,
  challengeStartedAt: 0
};

function setStats() {
  elements.score.textContent = String(state.score);
  elements.streak.textContent = String(state.streak);
  elements.timer.textContent = state.mode === 'training' ? '∞' : String(Math.max(0, state.secondsLeft));
}

function hideFeedback() {
  elements.feedback.className = 'feedback is-hidden';
  elements.feedback.textContent = '';
}

function showFeedback(message, type = 'warning') {
  elements.feedback.className = `feedback ${type}`;
  elements.feedback.textContent = message;
}

function createHand(values) {
  state.hand = shuffle(values).map((value, index) => ({
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    value,
    used: false
  }));
  state.chosenIds = [];
}

function startChallenge() {
  if (state.mode === 'sprint' && state.secondsLeft <= 0) return;

  state.challenge = makeChallenge({
    digitCount: Number(elements.digitCount.value),
    difficulty: elements.difficulty.value
  });
  state.phase = 1;
  state.baseBuilt = [];
  state.locked = false;
  state.challengeStartedAt = Date.now();

  const c = state.challenge;
  const handValues = (c.type === 'zero1' || c.type === 'zero2')
    ? c.digits.concat(Array(c.zeroCount).fill(0))
    : c.digits;

  createHand(handValues);
  elements.phaseLabel.textContent = (c.type === 'insert' || c.type === 'replace') ? 'Fase 1 di 2' : 'Sfida';
  elements.challengeText.textContent = c.text;
  hideFeedback();
  render();
}

function chosenValues() {
  return state.chosenIds.map(id => state.hand.find(card => card.id === id).value);
}

function assembledValues() {
  const c = state.challenge;
  const selected = chosenValues();

  if (!c.type.startsWith('fixed')) return selected;

  const length = c.digits.length + c.zeroCount;
  const fixedIndexes = new Set(c.fixedPositionsFromRight.map(pos => length - 1 - pos));
  const result = Array(length);
  let cursor = 0;
  for (let index = 0; index < length; index += 1) {
    if (fixedIndexes.has(index)) result[index] = 0;
    else result[index] = selected[cursor++];
  }
  return result;
}

function renderHand() {
  elements.hand.innerHTML = '';
  state.hand.forEach(card => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `digit-card${card.value === 0 ? ' zero' : ''}`;
    button.textContent = String(card.value);
    button.disabled = card.used || state.locked;
    button.setAttribute('aria-label', `Carta ${card.value}${card.used ? ', già usata' : ''}`);
    button.addEventListener('click', () => {
      if (card.used || state.locked) return;
      card.used = true;
      state.chosenIds.push(card.id);
      render();
    });
    elements.hand.appendChild(button);
  });
}

function renderSlots() {
  elements.answerSlots.innerHTML = '';
  const c = state.challenge;
  const values = assembledValues();
  const total = c.type.startsWith('fixed') ? c.digits.length + c.zeroCount : state.hand.length;
  const fixedIndexes = c.type.startsWith('fixed')
    ? new Set(c.fixedPositionsFromRight.map(pos => total - 1 - pos))
    : new Set();
  let selectedCursor = 0;

  for (let index = 0; index < total; index += 1) {
    const slot = document.createElement('div');
    slot.className = 'digit-slot';
    if (fixedIndexes.has(index)) {
      slot.textContent = '0';
      slot.classList.add('filled', 'zero');
    } else if (selectedCursor < state.chosenIds.length) {
      slot.textContent = String(chosenValues()[selectedCursor++]);
      slot.classList.add('filled');
    } else {
      slot.textContent = '·';
    }
    elements.answerSlots.appendChild(slot);
  }

  elements.numberReadout.textContent = values.length === total ? formatDigits(values) : '—';
  renderPlaces(total);
}

function renderPlaces(total) {
  if (!state.showPlaces || state.phase !== 1) {
    elements.placeLabels.classList.add('is-hidden');
    return;
  }
  elements.placeLabels.classList.remove('is-hidden');
  elements.placeLabels.style.gridTemplateColumns = `repeat(${total}, 62px)`;
  elements.placeLabels.innerHTML = '';
  for (let index = 0; index < total; index += 1) {
    const label = document.createElement('div');
    label.className = 'place-label';
    label.textContent = PLACE_NAMES[total - 1 - index] || `10^${total - 1 - index}`;
    elements.placeLabels.appendChild(label);
  }
}

function renderTransform() {
  const c = state.challenge;
  elements.transformZone.innerHTML = '';
  elements.transformZone.classList.remove('is-hidden');

  const title = document.createElement('p');
  title.className = 'transform-title';
  title.textContent = c.transformText;
  elements.transformZone.appendChild(title);

  const row = document.createElement('div');
  row.className = 'transform-row';

  if (c.type === 'insert') {
    for (let pos = 0; pos <= state.baseBuilt.length; pos += 1) {
      if (pos > 0) {
        const insert = document.createElement('button');
        insert.type = 'button';
        insert.className = 'insert-button';
        insert.textContent = '0';
        insert.disabled = state.locked;
        insert.setAttribute('aria-label', `Inserisci zero in posizione ${pos + 1}`);
        insert.addEventListener('click', () => checkInsert(pos));
        row.appendChild(insert);
      }
      if (pos < state.baseBuilt.length) {
        const digit = document.createElement('div');
        digit.className = 'transform-digit';
        digit.textContent = String(state.baseBuilt[pos]);
        row.appendChild(digit);
      }
    }
  }

  if (c.type === 'replace') {
    state.baseBuilt.forEach((value, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'replace-button';
      button.textContent = String(value);
      button.disabled = state.locked || index === 0;
      button.setAttribute('aria-label', index === 0 ? `Cifra ${value}, non sostituibile perché è la prima` : `Sostituisci ${value} con zero`);
      button.addEventListener('click', () => checkReplace(index));
      row.appendChild(button);
    });
  }

  elements.transformZone.appendChild(row);
}

function render() {
  const phaseTwo = state.phase === 2;
  elements.hand.classList.toggle('is-hidden', phaseTwo);
  elements.answerSlots.classList.toggle('is-hidden', phaseTwo);
  elements.numberReadout.classList.toggle('is-hidden', phaseTwo);
  elements.checkButton.classList.toggle('is-hidden', phaseTwo);
  elements.undoButton.classList.toggle('is-hidden', phaseTwo);
  elements.resetButton.classList.toggle('is-hidden', phaseTwo);
  elements.transformZone.classList.toggle('is-hidden', !phaseTwo);

  if (phaseTwo) {
    elements.placeLabels.classList.add('is-hidden');
    renderTransform();
  } else {
    renderHand();
    renderSlots();
  }
}

function completeChallenge(result) {
  state.locked = true;
  const elapsed = Math.max(1, Math.round((Date.now() - state.challengeStartedAt) / 1000));
  const earned = 100 + Math.max(0, 25 - elapsed) + state.streak * 10;
  state.score += earned;
  state.streak += 1;
  setStats();

  const zeroPlaces = result
    .map((value, index) => value === 0 ? PLACE_NAMES[result.length - 1 - index] : null)
    .filter(Boolean);
  const note = zeroPlaces.length ? ` Lo zero si trova nelle ${zeroPlaces.join(' e nelle ')}.` : '';
  showFeedback(`Corretto: ${formatDigits(result)}. +${earned} punti.${note}`, 'success');

  window.setTimeout(() => {
    if (!(state.mode === 'sprint' && state.secondsLeft <= 0)) startChallenge();
  }, 1100);
}

function fail(message) {
  state.streak = 0;
  setStats();
  showFeedback(message, 'error');
}

function checkAnswer() {
  if (state.locked) return;
  const c = state.challenge;
  const requiredCards = c.type.startsWith('fixed') ? c.digits.length : state.hand.length;
  if (state.chosenIds.length !== requiredCards) {
    showFeedback('Usa tutte le carte disponibili prima di controllare.', 'warning');
    return;
  }

  const actual = assembledValues();

  if (c.type === 'insert' || c.type === 'replace') {
    if (!arraysEqual(actual, c.baseSolution)) {
      fail(`Prima devi costruire correttamente il numero ${c.baseGoal === 'max' ? 'più grande' : 'più piccolo'} possibile.`);
      return;
    }
    state.baseBuilt = actual.slice();
    state.phase = 2;
    elements.phaseLabel.textContent = 'Fase 2 di 2';
    elements.challengeText.textContent = c.transformText;
    hideFeedback();
    render();
    return;
  }

  if (arraysEqual(actual, c.solution)) completeChallenge(actual);
  else fail('Non ancora. Confronta le cifre partendo da sinistra: le posizioni a sinistra hanno un peso maggiore.');
}

function checkInsert(position) {
  if (position === 0) {
    showFeedback('Lo zero non può essere messo davanti alla prima cifra.', 'warning');
    return;
  }
  const candidate = state.baseBuilt.slice();
  candidate.splice(position, 0, 0);
  if (arraysEqual(candidate, state.challenge.solution)) completeChallenge(candidate);
  else fail('Quella posizione non produce ancora il valore richiesto. Prova a vedere quali cifre vengono spostate di posto.');
}

function checkReplace(index) {
  if (index === 0) {
    showFeedback('Non sostituire la prima cifra: il numero non può iniziare con zero.', 'warning');
    return;
  }
  const candidate = state.baseBuilt.slice();
  candidate[index] = 0;
  if (arraysEqual(candidate, state.challenge.solution)) completeChallenge(candidate);
  else fail('Non è la cifra migliore da sostituire. Guarda quale posizione cambia di più il valore complessivo.');
}

function undo() {
  if (state.locked || !state.chosenIds.length || state.phase !== 1) return;
  const id = state.chosenIds.pop();
  const card = state.hand.find(item => item.id === id);
  if (card) card.used = false;
  render();
}

function resetSelection() {
  if (state.locked || state.phase !== 1) return;
  state.chosenIds = [];
  state.hand.forEach(card => { card.used = false; });
  hideFeedback();
  render();
}

function showHint() {
  const c = state.challenge;
  let hint = c.finalGoal === 'max'
    ? 'Per ottenere un numero grande, le cifre più alte devono occupare le posizioni di maggior valore.'
    : 'Per ottenere un numero piccolo, parti dalla cifra non zero più bassa e osserva dove lo zero abbassa maggiormente il valore.';

  if (c.type.startsWith('fixed')) hint += ' In questa sfida la posizione dello zero è già fissata: devi organizzare bene le altre cifre.';
  if (c.type === 'insert') hint = 'Le cifre grigie restano nello stesso ordine: devi solo capire in quale punto inserire lo zero.';
  if (c.type === 'replace') hint = 'Le cifre restano nella stessa posizione: devi scegliere quale cifra sostituire con zero.';
  showFeedback(hint, 'warning');
}

function setMode(mode) {
  if (state.timerId) window.clearInterval(state.timerId);
  state.timerId = null;
  state.mode = mode;
  state.score = 0;
  state.streak = 0;
  state.secondsLeft = 60;
  state.locked = false;

  elements.modeButtons.forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  setStats();
  startChallenge();

  if (mode === 'sprint') {
    state.timerId = window.setInterval(() => {
      state.secondsLeft -= 1;
      setStats();
      if (state.secondsLeft <= 0) {
        window.clearInterval(state.timerId);
        state.timerId = null;
        state.locked = true;
        render();
        showFeedback(`Tempo! Hai totalizzato ${state.score} punti. Premi “Sprint 60s” per ripartire.`, 'success');
      }
    }, 1000);
  }
}

elements.newChallenge.addEventListener('click', startChallenge);
elements.checkButton.addEventListener('click', checkAnswer);
elements.undoButton.addEventListener('click', undo);
elements.resetButton.addEventListener('click', resetSelection);
elements.hintButton.addEventListener('click', showHint);
elements.difficulty.addEventListener('change', startChallenge);
elements.digitCount.addEventListener('change', startChallenge);
elements.togglePlaces.addEventListener('click', () => {
  state.showPlaces = !state.showPlaces;
  elements.togglePlaces.textContent = state.showPlaces ? 'Nascondi valore posizionale' : 'Mostra valore posizionale';
  render();
});
elements.modeButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));

setMode('training');
