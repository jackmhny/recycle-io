import { startGame } from './modules/game.js';

(async () => {
  const canvas = document.getElementById('game');
  const scoreEl = document.getElementById('score');
  const timeEl = document.getElementById('time');
  const restartBtn = document.getElementById('restart');
  const startScreen = document.getElementById('start-screen');
  const startButton = document.getElementById('start-button');
  const gameOverRestartBtn = document.getElementById('game-over-restart');
  const speechBubble = document.getElementById('speech-bubble');
  const binSwitchButton = document.getElementById('mobile-bin-switch');
  const mascotCallout = document.getElementById('mascot-callout');
  const accessibilityButton = document.getElementById('accessibility-button');
  const accessibilityPanel = document.getElementById('accessibility-panel');
  const ttsToggle = document.getElementById('tts-toggle');

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  let audioCuesEnabled = false;

  const BIN_LABELS = {
    trash: 'trash',
    paper: 'paper recycling',
    bottles: 'bottles and cans',
    compost: 'compost',
  };

  const AUDIO_PATHS = {
    bins: {
      trash: 'assets/audio/bin_trash.wav',
      paper: 'assets/audio/bin_paper.wav',
      bottles: 'assets/audio/bin_bottles.wav',
      compost: 'assets/audio/bin_compost.wav',
    },
    pickup: 'assets/audio/pickup.wav',
    gameOver: 'assets/audio/game_over.wav',
    finalScore: 'assets/audio/final_score.wav',
    words: {
      zero: 'assets/audio/words/zero.wav',
      one: 'assets/audio/words/one.wav',
      two: 'assets/audio/words/two.wav',
      three: 'assets/audio/words/three.wav',
      four: 'assets/audio/words/four.wav',
      five: 'assets/audio/words/five.wav',
      six: 'assets/audio/words/six.wav',
      seven: 'assets/audio/words/seven.wav',
      eight: 'assets/audio/words/eight.wav',
      nine: 'assets/audio/words/nine.wav',
      ten: 'assets/audio/words/ten.wav',
      eleven: 'assets/audio/words/eleven.wav',
      twelve: 'assets/audio/words/twelve.wav',
      thirteen: 'assets/audio/words/thirteen.wav',
      fourteen: 'assets/audio/words/fourteen.wav',
      fifteen: 'assets/audio/words/fifteen.wav',
      sixteen: 'assets/audio/words/sixteen.wav',
      seventeen: 'assets/audio/words/seventeen.wav',
      eighteen: 'assets/audio/words/eighteen.wav',
      nineteen: 'assets/audio/words/nineteen.wav',
      twenty: 'assets/audio/words/twenty.wav',
      thirty: 'assets/audio/words/thirty.wav',
      forty: 'assets/audio/words/forty.wav',
      fifty: 'assets/audio/words/fifty.wav',
      sixty: 'assets/audio/words/sixty.wav',
      seventy: 'assets/audio/words/seventy.wav',
      eighty: 'assets/audio/words/eighty.wav',
      ninety: 'assets/audio/words/ninety.wav',
      hundred: 'assets/audio/words/hundred.wav',
      thousand: 'assets/audio/words/thousand.wav',
    },
  };

  function playUrl(url) {
    if (!audioCuesEnabled || !url) return Promise.resolve();
    return new Promise((resolve) => {
      try {
        const audio = new Audio(url);
        audio.addEventListener('ended', resolve, { once: true });
        audio.addEventListener('error', resolve, { once: true });
        audio.play().catch(() => resolve());
      } catch (err) {
        console.error('Audio play failed:', err);
        resolve();
      }
    });
  }

  function playSequence(urls = []) {
    return urls.reduce((p, url) => p.then(() => playUrl(url)), Promise.resolve());
  }

  function numberToWords(num) {
    if (num === 0) return ['zero'];
    const words = [];
    const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    const appendUnder100 = (n) => {
      if (n < 10) { words.push(ones[n]); return; }
      if (n < 20) { words.push(teens[n - 10]); return; }
      const t = Math.floor(n / 10);
      const o = n % 10;
      words.push(tens[t]);
      if (o) words.push(ones[o]);
    };

    const appendUnder1000 = (n) => {
      const h = Math.floor(n / 100);
      const rem = n % 100;
      if (h) {
        words.push(ones[h]);
        words.push('hundred');
      }
      if (rem) appendUnder100(rem);
    };

    if (num >= 1000) {
      const thousands = Math.floor(num / 1000);
      appendUnder1000(thousands);
      words.push('thousand');
      const rem = num % 1000;
      if (rem) appendUnder1000(rem);
    } else {
      appendUnder1000(num);
    }

    return words;
  }

  function playNumber(num) {
    const tokens = numberToWords(Math.max(0, Math.floor(num)));
    const urls = tokens.map((t) => AUDIO_PATHS.words[t]).filter(Boolean);
    return playSequence(urls);
  }

  function playDing() {
    playUrl(AUDIO_PATHS.pickup);
  }

  function announceBin(key) {
    const url = AUDIO_PATHS.bins[key];
    if (url) playUrl(url);
  }

  function announceGameEnd(score) {
    playSequence([AUDIO_PATHS.gameOver, AUDIO_PATHS.finalScore]).then(() => playNumber(score));
  }

  let environmentalTips = [];
  let currentTipIndex = 0;

  async function loadEnvironmentalTips() {
    try {
      const response = await fetch('environmental_tips.txt');
      const text = await response.text();
      environmentalTips = text.split('\n').filter(tip => tip.trim() !== '');
      if (environmentalTips.length > 0) {
        displayTip();
        setInterval(displayTip, 10000); // Change tip every 10 seconds
      }
    } catch (error) {
      console.error('Error loading environmental tips:', error);
    }
  }

  function displayTip() {
    if (environmentalTips.length > 0) {
      speechBubble.textContent = environmentalTips[currentTipIndex];
      currentTipIndex = (currentTipIndex + 1) % environmentalTips.length;
    }
  }

  if (isTouchDevice && speechBubble) {
    speechBubble.style.display = 'none';
    if (mascotCallout) mascotCallout.style.display = 'none';
  } else {
    loadEnvironmentalTips();
  }

  let accessibilityPanelOpen = false;

  function setAccessibilityPanel(open) {
    if (!accessibilityPanel || !accessibilityButton) return;
    accessibilityPanelOpen = open;
    accessibilityPanel.classList.toggle('open', open);
    accessibilityButton.setAttribute('aria-expanded', open.toString());
  }

  if (accessibilityButton && accessibilityPanel) {
    accessibilityButton.addEventListener('click', (e) => {
      e.stopPropagation();
      setAccessibilityPanel(!accessibilityPanelOpen);
    });

    accessibilityPanel.addEventListener('click', (e) => e.stopPropagation());

    document.addEventListener('click', (e) => {
      if (!accessibilityPanelOpen) return;
      if (accessibilityPanel.contains(e.target) || accessibilityButton.contains(e.target)) return;
      setAccessibilityPanel(false);
    });
  }

  if (ttsToggle) {
    const storedPref = localStorage.getItem('audioCuesEnabled');
    if (storedPref === 'true') {
      audioCuesEnabled = true;
      ttsToggle.checked = true;
    }

    ttsToggle.addEventListener('change', (e) => {
      audioCuesEnabled = e.target.checked;
      localStorage.setItem('audioCuesEnabled', audioCuesEnabled.toString());
    });
  }

  const joystickDirection = { x: 0, y: 0 };
  const joystickZone = document.getElementById('joystick-zone');

  if (joystickZone && isTouchDevice) {
    const joystick = nipplejs.create({
      zone: joystickZone,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: 'white',
    });

    joystick.on('move', (evt, data) => {
      joystickDirection.x = data.vector.x;
      joystickDirection.y = data.vector.y;
    });

    joystick.on('end', () => {
      joystickDirection.x = 0;
      joystickDirection.y = 0;
    });
  } else if (joystickZone) {
    joystickZone.style.display = 'none';
  }


  startButton.addEventListener('click', async () => {
    startScreen.style.display = 'none';
    const game = await startGame({
      canvas,
      scoreEl,
      timeEl,
      joystickDirection,
      onBinSwitch: announceBin,
      onCollect: playDing,
      onGameEnd: announceGameEnd,
    });

    if (binSwitchButton && isTouchDevice) {
      binSwitchButton.style.display = 'flex';
      binSwitchButton.addEventListener('click', () => game.cycleBin());
    }

    game.run();
    restartBtn.addEventListener('click', () => game.restart());
    gameOverRestartBtn.addEventListener('click', () => game.restart());
  });
})();
