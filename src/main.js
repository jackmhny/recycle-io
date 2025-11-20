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
  let audioContext;

  const BIN_LABELS = {
    trash: 'trash',
    paper: 'paper recycling',
    bottles: 'bottles and cans',
    compost: 'compost',
  };

  function ensureAudioContext() {
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      if (!audioContext) {
        audioContext = new Ctor();
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
    } catch (error) {
      console.error('Audio context failed:', error);
    }
  }

  function speak(text) {
    if (!audioCuesEnabled || !('speechSynthesis' in window)) return false;
    try {
      // Prime voices list; some browsers need a getVoices call first
      window.speechSynthesis.getVoices();
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (error) {
      console.error('Speech synthesis failed:', error);
      return false;
    }
  }

  function playDing() {
    if (!audioCuesEnabled) return;
    try {
      ensureAudioContext();
      if (!audioContext) return;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.15;
      osc.connect(gain);
      gain.connect(audioContext.destination);
      const now = audioContext.currentTime;
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch (error) {
      console.error('Audio ding failed:', error);
    }
  }

  function announceBin(key) {
    const name = BIN_LABELS[key] || key;
    const spoken = speak(`Switched to ${name} bin`);
    if (!spoken) {
      playDing();
    }
  }

  function announceGameEnd(score) {
    speak(`Game over. Final score ${score}.`);
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
      ensureAudioContext();
      speak('Audio cues on');
    }

    ttsToggle.addEventListener('change', (e) => {
      audioCuesEnabled = e.target.checked;
      localStorage.setItem('audioCuesEnabled', audioCuesEnabled.toString());
      if (!audioCuesEnabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audioCuesEnabled) {
        ensureAudioContext();
        speak('Audio cues on');
      }
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
