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

  loadEnvironmentalTips();

  startButton.addEventListener('click', async () => {
    startScreen.style.display = 'none';
    const game = await startGame({ canvas, scoreEl, timeEl });
    game.run();
    restartBtn.addEventListener('click', () => game.restart());
    gameOverRestartBtn.addEventListener('click', () => game.restart());
  });
})();
