import { startGame } from './modules/game.js';

(async () => {
  const canvas = document.getElementById('game');
  const scoreEl = document.getElementById('score');
  const timeEl = document.getElementById('time');
  const restartBtn = document.getElementById('restart');
  const startScreen = document.getElementById('start-screen');
  const startButton = document.getElementById('start-button');
  const gameOverRestartBtn = document.getElementById('game-over-restart');

  startButton.addEventListener('click', async () => {
    startScreen.style.display = 'none';
    const game = await startGame({ canvas, scoreEl, timeEl });
    game.run();
    restartBtn.addEventListener('click', () => game.restart());
    gameOverRestartBtn.addEventListener('click', () => game.restart());
  });
})();

