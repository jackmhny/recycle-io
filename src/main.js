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

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

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
    const game = await startGame({ canvas, scoreEl, timeEl, joystickDirection });

    if (binSwitchButton && isTouchDevice) {
      binSwitchButton.style.display = 'flex';
      binSwitchButton.addEventListener('click', () => game.cycleBin());
    }

    game.run();
    restartBtn.addEventListener('click', () => game.restart());
    gameOverRestartBtn.addEventListener('click', () => game.restart());
  });
})();
