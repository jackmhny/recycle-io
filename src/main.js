import { startGame } from './modules/game.js';

(async () => {
  const canvas = document.getElementById('game');
  const scoreEl = document.getElementById('score');
  const timeEl = document.getElementById('time');
  const restartBtn = document.getElementById('restart');
  const tooltip = document.getElementById('tooltip');
  const startScreen = document.getElementById('start-screen');
  const startButton = document.getElementById('start-button');

  startButton.addEventListener('click', async () => {
    startScreen.style.display = 'none';
    const game = await startGame({ canvas, scoreEl, timeEl, tooltip });
    game.run();
    restartBtn.addEventListener('click', () => game.restart());
  });
})();

