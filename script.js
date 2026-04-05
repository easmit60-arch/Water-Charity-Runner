const canvas = document.getElementById('game');
const context = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const timerEl = document.querySelector('#timer');
const bankedCashDisplay = document.getElementById('bankedCashDisplay');
const statusEl = document.getElementById('status');
const milestoneEl = document.getElementById('milestone');
const startBtn = document.getElementById('startBtn');
const investButton = document.getElementById('investButton');
const bankButton = document.getElementById('bankButton');
const playAgainBtn = document.getElementById('playAgainBtn');
const difficultySelect = document.getElementById('difficultySelect');
const impactFeedEl = document.getElementById('impactFeed');
const dropsContainer = document.getElementById('dropsContainer');
const bankSlots = [
  document.getElementById('slot-1'),
  document.getElementById('slot-2'),
  document.getElementById('slot-3')
];

const AGE_VERIFICATION = {
  minAge: 13,
  storageKey: 'cashRunnerAgeVerified'
};

const COPY = {
  missionReady: 'Mission ready: collect cash and fund The Club.',
  startHint: 'Click Start to launch the run.',
  startRun: function(level) {
    return 'Run started on ' + level + ' mode.';
  },
  routeWaterHint: 'Move with arrows, collect cash drops, and invest to power up The Club.',
  buildGoalHint: function(floodScore, storageMax) {
    return 'Bank cash, invest, keep score under ' + floodScore + ', and reach ' + storageMax + ' banked cash.';
  },
  flourishHint: function(remainingSeconds, storageGoal, floodScore) {
    return 'Flourish ' + remainingSeconds + 's left | ' + storageGoal + ' | keep score under ' + floodScore + '.';
  },
  agePrompt: function(minAge) {
    return 'Enter your age to play Rouge Support Network Runner. You must be at least ' + minAge + '.';
  },
  ageInvalid: 'Please enter a valid whole-number age to continue.',
  ageDenied: function(minAge) {
    return 'You must be at least ' + minAge + ' to play this game.';
  },
  ageAccepted: 'Age check complete. You can now play.'
};

const game = {
  state: 'start',
  frame: 0,
  score: 0,
  rainIntensity: 0.52,
  postDamRainIntensity: 0.093,
  tinsRequired: 3,
  damPromptScore: 25,
  waterStorageMax: 100,
  floodScore: 135,
  flourishWinSeconds: 30,
  clearPromptScore: 30,
  drainIntervalMs: 1000,
  drainAmountPerTick: 2,
  storedWater: 0,
  tinsFilled: 0,
  damBuilt: false,
  damBuiltTimeMs: 0,
  reachedMaxStorage: false,
  damPromptShown: false,
  lastPenaltyTickMs: 0,
  flourishStartMs: 0,
  confetti: [],
  milestoneIndexSeen: {},
  keys: { left: false, right: false, up: false, down: false },
  river: {
    x: canvas.width / 2,
    y: canvas.height - 26,
    speed: 1.7,
    direction: 1,
    segments: [],
    maxSegments: 12
  },
  drops: []
};

const SCORE_MILESTONES = [
  { score: 10, message: 'Milestone: 10 dollar signs collected. The Club starts filling up.' },
  { score: 25, message: 'Milestone: 25 dollar signs. Investment unlock is active.' },
  { score: 50, message: 'Milestone: 50 dollar signs. Community support is expanding.' },
  { score: 80, message: 'Milestone: 80 dollar signs. RSN impact is thriving.' }
];

// Load custom asset images
const gameImages = {
  village: null
};

function loadGameImages() {
  // Load village static image
  const villageImg = new Image();
  villageImg.src = 'RSN.img/stock-neon-silhouette.jpg';
  villageImg.onload = function() {
    gameImages.village = villageImg;
  };
  villageImg.onerror = function() {
    console.warn('Failed to load village image');
  };
}

let audioContext = null;

function ensureAudioContext() {
  try {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return null;
      }
      audioContext = new AudioContextClass();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    return audioContext;
  } catch (error) {
    return null;
  }
}

function playTone(frequency, durationSeconds, waveType, volume) {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = waveType;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSeconds);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationSeconds);
  } catch (error) {
    // Audio failures should never break gameplay.
  }
}

function playSfx(name) {
  if (name === 'collect') {
    playTone(660, 0.06, 'triangle', 0.03);
    return;
  }
  if (name === 'milestone') {
    playTone(523, 0.08, 'triangle', 0.045);
    playTone(659, 0.08, 'triangle', 0.04);
    return;
  }
  if (name === 'build') {
    playTone(280, 0.12, 'sawtooth', 0.03);
    return;
  }
  if (name === 'win') {
    playTone(523, 0.12, 'sine', 0.05);
    playTone(659, 0.12, 'sine', 0.045);
    playTone(784, 0.16, 'sine', 0.045);
    return;
  }
  if (name === 'lose') {
    playTone(180, 0.16, 'sine', 0.05);
  }
}

function checkScoreMilestones() {
  for (let i = 0; i < SCORE_MILESTONES.length; i++) {
    const milestone = SCORE_MILESTONES[i];
    const seen = game.milestoneIndexSeen[i] === true;
    if (!seen && game.score >= milestone.score) {
      game.milestoneIndexSeen[i] = true;
      setSuggestion(milestone.message);
      addImpactEvent(milestone.message);
      playSfx('milestone');
    }
  }
}

const DIFFICULTIES = {
  easy: {
    floodScore: 150,
    flourishWinSeconds: 35,
    rainIntensity: 0.44,
    postDamRainIntensity: 0.075,
    waterStorageMax: 90,
    damPromptScore: 20,
    drainAmountPerTick: 1
  },
  normal: {
    floodScore: 135,
    flourishWinSeconds: 30,
    rainIntensity: 0.52,
    postDamRainIntensity: 0.093,
    waterStorageMax: 100,
    damPromptScore: 25,
    drainAmountPerTick: 2
  },
  hard: {
    floodScore: 120,
    flourishWinSeconds: 24,
    rainIntensity: 0.61,
    postDamRainIntensity: 0.125,
    waterStorageMax: 110,
    damPromptScore: 30,
    drainAmountPerTick: 3
  }
};

function getDifficultyName() {
  return (difficultySelect && difficultySelect.value) ? difficultySelect.value : 'normal';
}

function applyDifficulty() {
  const level = getDifficultyName();
  const config = DIFFICULTIES[level] || DIFFICULTIES.normal;
  game.floodScore = config.floodScore;
  game.flourishWinSeconds = config.flourishWinSeconds;
  game.rainIntensity = config.rainIntensity;
  game.postDamRainIntensity = config.postDamRainIntensity;
  game.waterStorageMax = config.waterStorageMax;
  game.damPromptScore = config.damPromptScore;
  game.drainAmountPerTick = config.drainAmountPerTick;
}

function clearImpactFeed() {
  impactFeedEl.innerHTML = '';
}

function addImpactEvent(text) {
  const item = document.createElement('li');
  item.textContent = text;
  impactFeedEl.prepend(item);

  while (impactFeedEl.children.length > 6) {
    impactFeedEl.removeChild(impactFeedEl.lastElementChild);
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

const KEY_LEFT = 'ArrowLeft';
const KEY_RIGHT = 'ArrowRight';
const KEY_UP = 'ArrowUp';
const KEY_DOWN = 'ArrowDown';

function setStatus(message) {
  statusEl.textContent = message;
}

function setSuggestion(message) {
  milestoneEl.textContent = message;
}

function isAgeVerified() {
  return localStorage.getItem(AGE_VERIFICATION.storageKey) === 'true';
}

function verifyAgeBeforePlay() {
  if (isAgeVerified()) {
    return true;
  }

  const input = window.prompt(COPY.agePrompt(AGE_VERIFICATION.minAge), '');
  if (input === null) {
    return false;
  }

  const age = Number.parseInt(input, 10);
  if (!Number.isFinite(age) || age < 0) {
    setStatus(COPY.ageInvalid);
    return false;
  }

  if (age < AGE_VERIFICATION.minAge) {
    setStatus(COPY.ageDenied(AGE_VERIFICATION.minAge));
    return false;
  }

  localStorage.setItem(AGE_VERIFICATION.storageKey, 'true');
  setStatus(COPY.ageAccepted);
  return true;
}

function beginGameFlow() {
  if (!verifyAgeBeforePlay()) {
    return;
  }

  startGame();
}

function resetRiver() {
  game.river.x = canvas.width / 2;
  game.river.y = canvas.height - 26;
  game.river.direction = 1;
  game.river.segments = [];
  game.river.maxSegments = 12;
  for (let i = 0; i < game.river.maxSegments; i++) {
    game.river.segments.push({ x: game.river.x, y: game.river.y });
  }
}

function resetGame() {
  applyDifficulty();
  game.score = 0;
  game.rainIntensity = DIFFICULTIES[getDifficultyName()].rainIntensity;
  game.storedWater = 0;
  game.tinsFilled = 0;
  game.frame = 0;
  game.drops = [];
  game.damBuilt = false;
  game.damBuiltTimeMs = 0;
  game.reachedMaxStorage = false;
  game.damPromptShown = false;
  game.lastPenaltyTickMs = 0;
  game.flourishStartMs = 0;
  game.confetti = [];
  game.milestoneIndexSeen = {};
  game.keys.left = false;
  game.keys.right = false;
  game.keys.up = false;
  game.keys.down = false;
  // Hide any visible GIF overlays
  const investGif = document.getElementById('investGifOverlay');
  const floodGif = document.getElementById('floodLossGifOverlay');
  if (investGif) investGif.classList.remove('visible');
  if (floodGif) floodGif.classList.remove('visible');
  startBtn.classList.remove('hidden');
  startBtn.disabled = false;
  investButton.disabled = true;
  bankButton.disabled = true;
  investButton.textContent = 'Invest (locked)';
  playAgainBtn.classList.add('hidden');
  clearImpactFeed();
  addImpactEvent(COPY.missionReady);
  setSuggestion('');
  resetRiver();
  updateHud();
  updateTimerHud(performance.now());
}

function startGame() {
  resetGame();
  game.state = 'playing';
  ensureAudioContext();
  startBtn.classList.add('hidden');
  startBtn.disabled = true;
  addImpactEvent(COPY.startRun(getDifficultyName()));
  setStatus(COPY.routeWaterHint);
}

function updateHud() {
  scoreEl.textContent = 'Score: ' + game.score + ' / ' + game.floodScore;
  bankButton.disabled = game.state !== 'playing' || game.score <= 0;

  const perTin = game.waterStorageMax / bankSlots.length;
  game.tinsFilled = Math.min(bankSlots.length, Math.floor(game.storedWater / perTin));
  bankedCashDisplay.textContent = 'Banked: ' + game.storedWater + '/' + game.waterStorageMax;

  for (let i = 0; i < bankSlots.length; i++) {
    const fillRatio = Math.max(0, Math.min(1, (game.storedWater - i * perTin) / perTin));
    const fillPercent = Math.round(fillRatio * 100);
    bankSlots[i].style.background = 'linear-gradient(to top, #39ff14 0 ' + fillPercent + '%, #170f24 ' + fillPercent + '% 100%)';
    bankSlots[i].style.boxShadow = fillPercent > 0 ? '0 0 8px rgba(57, 255, 20, 0.65)' : 'none';
  }

  if (game.damBuilt) {
    investButton.textContent = 'Investment Active ✓';
    investButton.disabled = true;
    return;
  }

  if (game.score >= game.damPromptScore) {
    if (game.storedWater >= game.damPromptScore && game.state === 'playing') {
      investButton.textContent = 'Invest (D)';
      investButton.disabled = false;
    } else {
      investButton.textContent = 'Bank ' + game.damPromptScore + ' cash first';
      investButton.disabled = true;
    }
  } else {
    investButton.textContent = 'Invest (locked)';
    investButton.disabled = true;
  }
}

function updateTimerHud(nowMs) {
  if (game.state === 'start') {
    timerEl.textContent = 'Flourishing: --';
    return;
  }

  if (game.state === 'playing' && !game.damBuilt) {
    timerEl.textContent = 'Flourishing: Invest';
    return;
  }

  if (game.state === 'playing' && game.damBuilt) {
    const elapsedSeconds = (nowMs - game.flourishStartMs) / 1000;
    const remainingSeconds = Math.max(0, Math.ceil(game.flourishWinSeconds - elapsedSeconds));
    timerEl.textContent = 'Flourishing: ' + remainingSeconds + 's';
    return;
  }

  if (game.state === 'won') {
    timerEl.textContent = 'Flourishing: Complete';
    return;
  }

  if (game.state === 'lost') {
    timerEl.textContent = 'Flourishing: Failed';
  }
}

function maybeShowDamSuggestion() {
  if (game.state !== 'playing' || game.damBuilt) {
    return;
  }

  if (game.score >= game.damPromptScore && game.score < game.clearPromptScore && !game.damPromptShown) {
    game.damPromptShown = true;
    setStatus('Invest now: push cash flow into The Club.');
    setSuggestion(COPY.buildGoalHint(game.floodScore, game.waterStorageMax));
  }

  if (game.score >= game.clearPromptScore && !game.damBuilt) {
    setSuggestion('');
  }
}

function checkFloodLoss() {
  // Loss rule: if score goes above floodScore while playing, the run crashes.
  if (game.state !== 'playing') {
    return;
  }

  if (game.score <= game.floodScore) {
    return;
  }

  if (!game.damBuilt) {
    loseGame('You lost: no investment was made before score ' + game.floodScore + '.');
  } else {
    loseGame('You lost: pressure spiked above ' + game.floodScore + '.');
  }
}

function loseGame(reason) {
  // Loss screen state: show crash messaging and Play Again button.
  game.state = 'lost';
  investButton.disabled = true;
  bankButton.disabled = true;
  investButton.textContent = 'Crashed';
  setStatus(reason);
  playSfx('lose');
  addImpactEvent('Market crash. Try a safer cash strategy.');
  setSuggestion('Neon crash took over. Press Play Again.');
  startBtn.disabled = true;
  playAgainBtn.classList.remove('hidden');
}

function winGame() {
  // Win screen state: show celebration messaging, Play Again, and confetti.
  game.state = 'won';
  investButton.disabled = true;
  bankButton.disabled = true;
  investButton.textContent = 'Club Flourishing ✓';
  setStatus('Congratulations! The Club flourished for ' + game.flourishWinSeconds + ' seconds under ' + game.floodScore + ' with full banked cash.');
  playSfx('win');
  addImpactEvent('The Club flourished. Community support stabilized.');
  setSuggestion('You win! Press Play Again.');
  startBtn.disabled = true;
  playAgainBtn.classList.remove('hidden');
  launchConfetti();
}

function launchConfetti() {
  game.confetti = [];
  const pieces = 140;
  const colors = ['#ffd35f', '#35c7ff', '#ffffff', '#7ef3a1', '#ff8db3'];

  for (let i = 0; i < pieces; i++) {
    game.confetti.push({
      x: Math.random() * canvas.width,
      y: -Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 3.8,
      vy: 1.6 + Math.random() * 3.2,
      size: 3 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
}

function updateConfetti() {
  for (let i = 0; i < game.confetti.length; i++) {
    const piece = game.confetti[i];
    piece.x += piece.vx;
    piece.y += piece.vy;

    if (piece.y > canvas.height + 12) {
      piece.y = -8;
      piece.x = Math.random() * canvas.width;
    }

    if (piece.x < -10) {
      piece.x = canvas.width + 10;
    } else if (piece.x > canvas.width + 10) {
      piece.x = -10;
    }
  }
}

function drawConfetti() {
  for (let i = 0; i < game.confetti.length; i++) {
    const piece = game.confetti[i];
    context.fillStyle = piece.color;
    context.fillRect(piece.x, piece.y, piece.size, piece.size);
  }
}

function updateStoredWaterDrain(nowMs) {
  // After dam is built, stored water is drained on a fixed timer.
  if (game.state !== 'playing' || !game.damBuilt) {
    return;
  }

  while (nowMs - game.lastPenaltyTickMs >= game.drainIntervalMs) {
    game.lastPenaltyTickMs += game.drainIntervalMs;
    game.storedWater = Math.max(0, game.storedWater - game.drainAmountPerTick);
    updateHud();
  }
}

function updateFlourishWin(nowMs) {
  // Win rule check:
  // 1) Dam is built,
  // 2) Flourish timer reaches the current difficulty target (flourishWinSeconds),
  // 3) Score stays under floodScore,
  // 4) Player reached max storage at least once.
  if (game.state !== 'playing' || !game.damBuilt) {
    return;
  }

  if (!game.flourishStartMs) {
    game.flourishStartMs = nowMs;
  }

  const elapsedSeconds = (nowMs - game.flourishStartMs) / 1000;
  const remainingSeconds = Math.max(0, Math.ceil(game.flourishWinSeconds - elapsedSeconds));

  if (game.score < game.floodScore) {
    const storageGoal = game.reachedMaxStorage ? 'bank goal met' : ('bank ' + (game.waterStorageMax - game.storedWater) + ' more cash');
    setSuggestion(COPY.flourishHint(remainingSeconds, storageGoal, game.floodScore));
  }

  if (elapsedSeconds >= game.flourishWinSeconds) {
    if (game.score < game.floodScore && game.reachedMaxStorage) {
      winGame();
      return;
    }

    if (game.score >= game.floodScore) {
      loseGame('You lost: pressure spiked above ' + game.floodScore + '.');
      return;
    }

    loseGame('You lost: flourish timer reached 0s before full bank was reached.');
  }
}

function buildDam() {
  // Building the dam starts the flourish phase and the storage drain timer.
  if (game.state !== 'playing' || game.damBuilt) {
    return;
  }
  if (game.score < game.damPromptScore) {
    setStatus('Investment unlocks at score ' + game.damPromptScore + '.');
    return;
  }

  if (game.storedWater < game.damPromptScore) {
    setStatus('Bank at least ' + game.damPromptScore + ' cash first.');
    return;
  }

  game.damBuilt = true;
  game.damBuiltTimeMs = performance.now();  // Track time for investment animation
  game.flourishStartMs = performance.now();
  game.lastPenaltyTickMs = game.flourishStartMs;
  game.rainIntensity = game.postDamRainIntensity;
  game.river.direction = -1;
  updateHud();
  playSfx('build');
  addImpactEvent('Investment made. Cash now routes to The Club.');
  setStatus('Investment active! The Club now uses ' + game.drainAmountPerTick + ' banked cash per second.');
  setSuggestion('Keep The Club flourishing for ' + game.flourishWinSeconds + ' seconds, stay under ' + game.floodScore + ', and reach ' + game.waterStorageMax + ' banked cash.');
}

function storeWater() {
  if (game.state !== 'playing') {
    return;
  }

  if (game.storedWater >= game.waterStorageMax) {
    setStatus('Bank is already full. Invest and protect The Club.');
    addImpactEvent('Bank already full. Keep The Club stable.');
    return;
  }

  if (game.score <= 0) {
    setStatus('No score to bank yet. Collect cash first.');
    return;
  }

  const availableStorage = game.waterStorageMax - game.storedWater;
  const pointsToStore = Math.min(game.score, availableStorage);

  game.storedWater = Math.min(game.waterStorageMax, game.storedWater + pointsToStore);
  game.score = Math.max(0, game.score - pointsToStore);
  if (game.storedWater >= game.waterStorageMax) {
    game.reachedMaxStorage = true;
  }

  updateHud();
  addImpactEvent('Banked ' + pointsToStore + ' cash for The Club.');
  setStatus('Banked ' + pointsToStore + ' cash from score.');
}

function spawnDrop() {
  game.drops.push({
    x: randomInt(8, canvas.width - 8),
    y: -12,
    size: randomInt(5, 13),
    vx: (Math.random() * 5.4) - 2.7,
    vy: 3.3 + Math.random() * 4.2,
    phase: Math.random() * Math.PI * 2
  });
}

function updateRiver() {
  if (game.damBuilt) {
    const villageTargetX = 108;
    const villageTargetY = 92;
    const guidePull = 0.45;

    if (game.keys.left && !game.keys.right) {
      game.river.direction = -1;
    } else if (game.keys.right && !game.keys.left) {
      game.river.direction = 1;
    }

    if (game.keys.up && !game.keys.down) {
      game.river.y -= game.river.speed;
    } else if (game.keys.down && !game.keys.up) {
      game.river.y += game.river.speed;
    }

    game.river.x += game.river.direction * game.river.speed;

    const driftX = (villageTargetX - game.river.x) * 0.04;
    const driftY = (villageTargetY - game.river.y) * 0.04;
    game.river.x += Math.max(-guidePull, Math.min(guidePull, driftX));
    game.river.y += Math.max(-guidePull, Math.min(guidePull, driftY));
  } else {
    if (game.keys.left && !game.keys.right) {
      game.river.direction = -1;
    } else if (game.keys.right && !game.keys.left) {
      game.river.direction = 1;
    }

    if (game.keys.up && !game.keys.down) {
      game.river.y -= game.river.speed;
    } else if (game.keys.down && !game.keys.up) {
      game.river.y += game.river.speed;
    }

    game.river.x += game.river.direction * game.river.speed;
  }

  if (game.river.x < 10) {
    game.river.x = 10;
    game.river.direction = 1;
  } else if (game.river.x > canvas.width - 10) {
    game.river.x = canvas.width - 10;
    game.river.direction = -1;
  }

  const minRiverY = game.damBuilt ? 24 : canvas.height * 0.62;
  const maxRiverY = canvas.height - 20;
  if (game.river.y < minRiverY) {
    game.river.y = minRiverY;
  } else if (game.river.y > maxRiverY) {
    game.river.y = maxRiverY;
  }

  game.river.segments.unshift({ x: game.river.x, y: game.river.y });
  if (game.river.segments.length > game.river.maxSegments) {
    game.river.segments.pop();
  }
}

function collectDrop(index) {
  // Collection rule: each drop gives +1 score and +1 stored water.
  // Once storage reaches max, reachedMaxStorage is locked in for win checking.
  game.drops.splice(index, 1);
  game.score += 1;
  playSfx('collect');
  game.storedWater = Math.min(game.waterStorageMax, game.storedWater + 1);
  if (game.storedWater >= game.waterStorageMax) {
    game.reachedMaxStorage = true;
  }
  game.river.maxSegments = Math.min(190, game.river.maxSegments + 1);
  checkScoreMilestones();
  if (game.score % 8 === 0) {
    addImpactEvent('Collected dollar signs: ' + game.score + '.');
  }
  updateHud();
  maybeShowDamSuggestion();
}

function updateDrops() {
  for (let i = game.drops.length - 1; i >= 0; i--) {
    const drop = game.drops[i];
    drop.phase += 0.34;
    drop.vx += (Math.random() - 0.5) * 0.22;
    drop.vx = Math.max(-3.2, Math.min(3.2, drop.vx));
    drop.x += drop.vx + Math.sin(drop.phase) * 1.15;
    drop.y += drop.vy;

    if (drop.y > canvas.height + 18 || drop.x < -24 || drop.x > canvas.width + 24) {
      game.drops.splice(i, 1);
      continue;
    }

    const nearHead = Math.abs(drop.x - game.river.x) < 22 && Math.abs(drop.y - game.river.y) < 16;
    if (nearHead) {
      collectDrop(i);
      continue;
    }

    const segmentLimit = Math.min(game.river.segments.length, 18);
    for (let j = 0; j < segmentLimit; j++) {
      const segment = game.river.segments[j];
      if (Math.abs(drop.x - segment.x) < 10 && Math.abs(drop.y - segment.y) < 10) {
        collectDrop(i);
        break;
      }
    }
  }
}

function drawVillage() {
  const clubX = 10;
  const clubY = 10;
  const clubW = 132;
  const clubH = 92;

  // Draw Club image if loaded.
  if (gameImages.village) {
    context.drawImage(gameImages.village, clubX, clubY, clubW, clubH);
  } else {
    // Fallback neon Club panel if image is unavailable.
    context.fillStyle = '#070f1f';
    context.fillRect(clubX, clubY, clubW, clubH);

    context.strokeStyle = game.damBuilt ? '#39ff14' : '#00d9ff';
    context.lineWidth = 2;
    context.strokeRect(clubX + 1, clubY + 1, clubW - 2, clubH - 2);
    context.lineWidth = 1;

    context.fillStyle = '#ff4b8f';
    context.font = '700 13px Montserrat, sans-serif';
    context.textAlign = 'left';
    context.fillText('THE CLUB', clubX + 10, clubY + 22);

    context.fillStyle = '#00d9ff';
    context.fillRect(clubX + 10, clubY + 30, clubW - 20, 8);
    context.fillStyle = '#39ff14';
    context.fillRect(clubX + 10, clubY + 48, Math.max(12, Math.min(clubW - 20, game.storedWater)), 7);

    context.fillStyle = '#b9d6ec';
    context.font = '600 10px Montserrat, sans-serif';
    context.fillText('BANKED: ' + game.storedWater + '/' + game.waterStorageMax, clubX + 10, clubY + 70);
  }

  // Draw neon flow toward The Club while investment is active.
  if (game.damBuilt) {
    context.beginPath();
    context.moveTo(112, 82);
    context.quadraticCurveTo(160, 168, game.river.x, game.river.y - 6);
    context.lineWidth = 6;
    context.strokeStyle = '#00d9ff';
    context.stroke();
    context.lineWidth = 1;
  }
}

function drawDrops() {
  // Clear existing drop elements
  dropsContainer.innerHTML = '';
  
  // Render each drop as an HTML img element
  for (let i = 0; i < game.drops.length; i++) {
    const drop = game.drops[i];
    const dropEl = document.createElement('img');
    dropEl.src = 'RSN.img/Cash.gif';
    dropEl.className = 'drop';
    dropEl.style.left = (drop.x - 20) + 'px';
    dropEl.style.top = (drop.y - 20) + 'px';
    dropsContainer.appendChild(dropEl);
  }
}

function drawRiver() {
  if (game.river.segments.length > 1) {
    context.beginPath();
    context.moveTo(game.river.segments[0].x, game.river.segments[0].y);
    for (let i = 1; i < game.river.segments.length; i++) {
      context.lineTo(game.river.segments[i].x, game.river.segments[i].y);
    }
    context.strokeStyle = '#00d9ff';
    context.lineWidth = 8;
    context.lineCap = 'round';
    context.stroke();
    context.lineWidth = 1;
  }

  for (let i = 0; i < game.river.segments.length; i += 4) {
    const seg = game.river.segments[i];
    context.fillStyle = i === 0 ? '#ff4b8f' : '#00d9ff';
    context.beginPath();
    context.arc(seg.x, seg.y, i === 0 ? 6 : 4, 0, Math.PI * 2);
    context.fill();
  }
}

function drawBoard() {
  context.fillStyle = '#030914';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = 'rgba(0,217,255,0.08)';
  for (let neonTick = 0; neonTick < 20; neonTick++) {
    const px = (neonTick * 24 + game.frame * 2) % (canvas.width + 24);
    context.fillRect(px, 0, 2, 18);
  }

  drawVillage();
  
  // Show investment GIF overlay for 2 seconds after dam is built, then hide it
  const investGifOverlay = document.getElementById('investGifOverlay');
  if (game.damBuilt && investGifOverlay) {
    const timeSinceDamBuilt = performance.now() - game.damBuiltTimeMs;
    if (timeSinceDamBuilt < 2000) {  // Show for 2 seconds
      investGifOverlay.classList.add('visible');
    } else {
      investGifOverlay.classList.remove('visible');
    }
  } else if (investGifOverlay) {
    investGifOverlay.classList.remove('visible');
  }
  
  drawDrops();
  drawRiver();

  if (!game.damBuilt && game.score >= game.damPromptScore) {
    context.fillStyle = '#ff006e';
    for (let block = 0; block < 4; block++) {
      context.fillRect(122 + block * 13, 82, 10, 8);
    }
  }
}

function drawOverlay(text) {
  context.fillStyle = 'rgba(3, 6, 14, 0.68)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#ffffff';
  context.font = 'bold 22px Arial';
  context.textAlign = 'center';
  context.fillText(text, canvas.width / 2, canvas.height / 2 - 8);
  context.font = '14px Arial';
  context.fillText('The Club zone is in the top-left. Click Start to Begin.', canvas.width / 2, canvas.height / 2 + 20);
}

function drawFloodLossOverlay() {
  context.fillStyle = 'rgba(10, 3, 18, 0.95)';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Show/hide flood loss GIF overlay
  const floodLossGifOverlay = document.getElementById('floodLossGifOverlay');
  if (floodLossGifOverlay) {
    floodLossGifOverlay.classList.add('visible');
  }

  // Fallback neon pulse animation (shown behind the GIF if loaded)
  context.strokeStyle = 'rgba(0, 217, 255, 0.85)';
  for (let i = 0; i < 20; i++) {
    const bubbleX = (i * 31 + game.frame * 1.5) % (canvas.width + 20);
    const bubbleY = canvas.height - ((game.frame * 1.1 + i * 29) % 260);
    const radius = 3 + (i % 4);
    context.beginPath();
    context.arc(bubbleX, bubbleY, radius, 0, Math.PI * 2);
    context.stroke();
  }

  context.fillStyle = '#ec2f2fdd';
  context.textAlign = 'center';
  context.font = 'bold 22px Arial';
  context.fillText('Club Crash - You Lost', canvas.width / 2, canvas.height / 2 - 10);
  context.font = '14px Arial';
  context.fillText('Risk crossed over ' + game.floodScore + ' points.', canvas.width / 2, canvas.height / 2 + 16);
  context.fillText('You Got Too Risky. Press Play Again.', canvas.width / 2, canvas.height / 2 + 36);
}

function drawWinOverlay() {
  context.fillStyle = 'rgba(66, 235, 184, 0.93)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.font = 'bold 24px Arial';
  context.fillText('Congratulations!', canvas.width / 2, canvas.height / 2 - 16);
  context.font = 'bold 18px Arial';
  context.fillText('Club Flourishing Achieved', canvas.width / 2, canvas.height / 2 + 10);
  context.font = '14px Arial';
  context.fillText('You protected The Club for ' + game.flourishWinSeconds + ' seconds with full cash reserves.', canvas.width / 2, canvas.height / 2 + 34);
}

function loop() {
  requestAnimationFrame(loop);
  game.frame++;
  const nowMs = performance.now();
  updateTimerHud(nowMs);

  if (game.state === 'start') {
    drawBoard();
    drawOverlay('Rouge Support Network Runner');
    return;
  }

  if (game.state === 'lost') {
    drawBoard();
    drawFloodLossOverlay();
    return;
  }

  if (game.state === 'won') {
    drawBoard();
    updateConfetti();
    drawConfetti();
    drawWinOverlay();
    return;
  }

  updateRiver();

  if (Math.random() < game.rainIntensity) {
    spawnDrop();
  }

  updateDrops();
  maybeShowDamSuggestion();
  updateStoredWaterDrain(nowMs);
  updateFlourishWin(nowMs);
  checkFloodLoss();
  drawBoard();
}

document.addEventListener('keydown', function(e) {
  if (game.state !== 'playing') {
    return;
  }

  if (e.key === KEY_LEFT) {
    e.preventDefault();
    game.keys.left = true;
  }

  if (e.key === KEY_RIGHT) {
    e.preventDefault();
    game.keys.right = true;
  }

  if (e.key === KEY_UP) {
    e.preventDefault();
    game.keys.up = true;
  }

  if (e.key === KEY_DOWN) {
    e.preventDefault();
    game.keys.down = true;
  }

  if (e.key === 'd' || e.key === 'D') {
    e.preventDefault();
    buildDam();
  }

  if (e.key === 's' || e.key === 'S') {
    e.preventDefault();
    storeWater();
  }
});

document.addEventListener('keyup', function(e) {
  if (e.key === KEY_LEFT) {
    game.keys.left = false;
  }
  if (e.key === KEY_RIGHT) {
    game.keys.right = false;
  }
  if (e.key === KEY_UP) {
    game.keys.up = false;
  }
  if (e.key === KEY_DOWN) {
    game.keys.down = false;
  }
});

startBtn.addEventListener('click', beginGameFlow);

investButton.addEventListener('click', function() {
  buildDam();
});

bankButton.addEventListener('click', function() {
  storeWater();
});

playAgainBtn.addEventListener('click', beginGameFlow);

if (difficultySelect) {
  difficultySelect.addEventListener('change', function() {
    applyDifficulty();
    updateHud();
    updateTimerHud(performance.now());
    if (game.state === 'start') {
      setStatus('Difficulty set to ' + getDifficultyName() + '. Press Start.');
    } else {
      setStatus('Difficulty changed to ' + getDifficultyName() + '. It fully applies on next run.');
    }
  });
}

loadGameImages();
resetGame();
updateHud();
setStatus(COPY.startHint);
requestAnimationFrame(loop);
