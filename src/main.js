import { startGame } from './modules/game.js';

(async () => {
  const canvas = document.getElementById('game');
  const scoreEl = document.getElementById('score');
  const timeEl = document.getElementById('time');
  const restartBtn = document.getElementById('restart');
  const tooltip = document.getElementById('tooltip');

  const game = await startGame({ canvas, scoreEl, timeEl, tooltip });

  restartBtn.addEventListener('click', () => game.restart());
})();

