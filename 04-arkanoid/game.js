const canvas = document.getElementById( 'game' );
const ctx = canvas.getContext( '2d' );

const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 16;
const BALL_SIZE = 16;
const PADDLE_SPEED = 7;
const BALL_SPEED = 3.2;

const BLOCK_WIDTH = 70;
const BLOCK_HEIGHT = 20;
const BLOCK_GAP = 6;
const BLOCK_OFFSET_TOP = 50;

const POWERUP_DROP_CHANCE = 0.2;
const POWERUP_SIZE = 16;
const POWERUP_FALL_SPEED = 2;
const POWERUP_WIDEN_FACTOR = 1.5;
const POWERUP_WIDEN_DURATION = 10000;

const HIGH_SCORE_KEY = 'arkanoid:highscore';

const SHAKE_DURATION = 250;
const SHAKE_MAGNITUDE = 8;
const PARTICLE_DURATION = 300;
const PARTICLE_COUNT = 6;

const soundBounce = new Audio( 'assets/sounds/ball-bounce.mp3' );
const soundBreak = new Audio( 'assets/sounds/break-sound.mp3' );

function playSound( audio ) {
  audio.currentTime = 0;
  audio.play();
}

const LEVELS = [
  [
    [ 'red', 'red', 'red', 'red', 'red', 'red', 'red', 'red', 'red', 'red' ],
    [ 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow' ],
    [ 'cyan', 'cyan', 'cyan', 'cyan', 'cyan', 'cyan', 'cyan', 'cyan', 'cyan', 'cyan' ],
    [ 'magenta', 'magenta', 'magenta', 'magenta', 'magenta', 'magenta', 'magenta', 'magenta', 'magenta', 'magenta' ],
    [ 'green', 'green', 'green', 'green', 'green', 'green', 'green', 'green', 'green', 'green' ],
  ],
  [
    [ 'gray', null, 'gray', null, 'gray', 'gray', null, 'gray', null, 'gray' ],
    [ 'hotpink', 'hotpink', 'hotpink', 'hotpink', 'hotpink', 'hotpink', 'hotpink', 'hotpink', 'hotpink', 'hotpink' ],
    [ null, 'cyan', 'cyan', null, 'cyan', 'cyan', null, 'cyan', 'cyan', null ],
    [ 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow' ],
    [ 'red', null, 'red', null, 'red', 'red', null, 'red', null, 'red' ],
  ],
  [
    [ 'magenta', 'magenta', 'magenta', 'magenta', 'magenta', 'magenta', 'magenta', 'magenta', 'magenta', 'magenta' ],
    [ 'green', 'green', null, 'green', 'green', 'green', 'green', null, 'green', 'green' ],
    [ 'hotpink', 'hotpink', 'hotpink', null, null, null, null, 'hotpink', 'hotpink', 'hotpink' ],
    [ 'red', 'red', 'red', 'red', null, null, 'red', 'red', 'red', 'red' ],
    [ 'gray', 'gray', 'gray', 'gray', 'gray', 'gray', 'gray', 'gray', 'gray', 'gray' ],
  ],
];

const state = {
  level: 1,
  score: 0,
  lives: 3,
  screen: 'playing',
  ballSpeedMultiplier: 1,
  highScore: Number( localStorage.getItem( HIGH_SCORE_KEY ) ) || 0,
  explosions: [],
  particles: [],
  shake: {
    start: 0,
    magnitude: 0,
  },
  powerUps: [],
  paddle: {
    x: canvas.width / 2 - PADDLE_WIDTH / 2,
    y: canvas.height - 40,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    widened: false,
    widenedUntil: 0,
  },
  ball: {
    x: canvas.width / 2 - BALL_SIZE / 2,
    y: canvas.height - 40 - BALL_SIZE,
    dx: BALL_SPEED * 0.7,
    dy: -BALL_SPEED * 0.7,
  },
};

function resetBall() {
  const speed = BALL_SPEED * state.ballSpeedMultiplier;
  state.ball.x = state.paddle.x + state.paddle.width / 2 - BALL_SIZE / 2;
  state.ball.y = state.paddle.y - BALL_SIZE;
  state.ball.dx = speed * 0.7;
  state.ball.dy = -speed * 0.7;
}

function resetPaddle() {
  state.paddle.x = canvas.width / 2 - state.paddle.width / 2;
}

function buildBlocks( grid ) {
  const cols = grid[ 0 ].length;
  const gridWidth = cols * BLOCK_WIDTH + ( cols - 1 ) * BLOCK_GAP;
  const offsetLeft = ( canvas.width - gridWidth ) / 2;

  const blocks = [];
  grid.forEach( ( row, rowIndex ) => {
    row.forEach( ( color, colIndex ) => {
      if ( !color ) return;
      blocks.push( {
        x: offsetLeft + colIndex * ( BLOCK_WIDTH + BLOCK_GAP ),
        y: BLOCK_OFFSET_TOP + rowIndex * ( BLOCK_HEIGHT + BLOCK_GAP ),
        color,
        alive: true,
      } );
    } );
  } );
  return blocks;
}

state.blocks = buildBlocks( LEVELS[ state.level - 1 ] );

const keys = {};
document.addEventListener( 'keydown', ( e ) => { keys[ e.key ] = true; } );
document.addEventListener( 'keyup', ( e ) => { keys[ e.key ] = false; } );

function update() {
  if ( state.screen !== 'playing' ) return;

  if ( keys[ 'ArrowLeft' ] || keys[ 'a' ] || keys[ 'A' ] ) {
    state.paddle.x -= PADDLE_SPEED;
  }
  if ( keys[ 'ArrowRight' ] || keys[ 'd' ] || keys[ 'D' ] ) {
    state.paddle.x += PADDLE_SPEED;
  }
  state.paddle.x = Math.max( 0, Math.min( canvas.width - state.paddle.width, state.paddle.x ) );

  updatePaddleWiden();
  moveBall();
  updatePowerUps();
}

function updatePaddleWiden() {
  const paddle = state.paddle;
  if ( paddle.widened && performance.now() > paddle.widenedUntil ) {
    paddle.width = PADDLE_WIDTH;
    paddle.widened = false;
  }
}

function updatePowerUps() {
  const paddle = state.paddle;
  state.powerUps = state.powerUps.filter( ( powerUp ) => {
    powerUp.y += POWERUP_FALL_SPEED;

    const caught = powerUp.y + POWERUP_SIZE >= paddle.y
      && powerUp.y <= paddle.y + paddle.height
      && powerUp.x + POWERUP_SIZE >= paddle.x
      && powerUp.x <= paddle.x + paddle.width;

    if ( caught ) {
      paddle.width = PADDLE_WIDTH * POWERUP_WIDEN_FACTOR;
      paddle.widened = true;
      paddle.widenedUntil = performance.now() + POWERUP_WIDEN_DURATION;
      return false;
    }

    return powerUp.y < canvas.height;
  } );
}

function moveBall() {
  const ball = state.ball;
  ball.x += ball.dx;
  ball.y += ball.dy;

  if ( ball.x <= 0 ) {
    ball.x = 0;
    ball.dx *= -1;
    playSound( soundBounce );
  } else if ( ball.x + BALL_SIZE >= canvas.width ) {
    ball.x = canvas.width - BALL_SIZE;
    ball.dx *= -1;
    playSound( soundBounce );
  }

  if ( ball.y <= 0 ) {
    ball.y = 0;
    ball.dy *= -1;
    playSound( soundBounce );
  }

  const paddle = state.paddle;
  const hitsPaddle = ball.dy > 0
    && ball.y + BALL_SIZE >= paddle.y
    && ball.y + BALL_SIZE <= paddle.y + paddle.height
    && ball.x + BALL_SIZE >= paddle.x
    && ball.x <= paddle.x + paddle.width;

  if ( hitsPaddle ) {
    ball.y = paddle.y - BALL_SIZE;
    const ballCenter = ball.x + BALL_SIZE / 2;
    const paddleCenter = paddle.x + paddle.width / 2;
    const hitPos = ( ballCenter - paddleCenter ) / ( paddle.width / 2 ); // -1..1
    const speed = Math.hypot( ball.dx, ball.dy );
    const angle = hitPos * ( Math.PI / 3 ); // max 60deg from vertical
    ball.dx = speed * Math.sin( angle );
    ball.dy = -speed * Math.cos( angle );
    playSound( soundBounce );
  }

  checkBlockCollision();
  checkLevelComplete();

  if ( ball.y > canvas.height ) {
    loseLife();
  }
}

function checkLevelComplete() {
  const hasAliveBlocks = state.blocks.some( ( block ) => block.alive );
  if ( hasAliveBlocks ) return;

  if ( state.level >= LEVELS.length ) {
    endGame( 'victory' );
    return;
  }

  state.level += 1;
  state.ballSpeedMultiplier *= 1.15;
  state.blocks = buildBlocks( LEVELS[ state.level - 1 ] );
  resetPaddle();
  resetBall();
}

function loseLife() {
  state.lives -= 1;
  if ( state.lives <= 0 ) {
    endGame( 'gameover' );
    return;
  }
  resetBall();
}

function endGame( screen ) {
  state.screen = screen;
  if ( state.score > state.highScore ) {
    state.highScore = state.score;
    localStorage.setItem( HIGH_SCORE_KEY, String( state.highScore ) );
  }
}

function restartGame() {
  state.level = 1;
  state.score = 0;
  state.lives = 3;
  state.ballSpeedMultiplier = 1;
  state.explosions = [];
  state.powerUps = [];
  state.paddle.width = PADDLE_WIDTH;
  state.paddle.widened = false;
  state.blocks = buildBlocks( LEVELS[ 0 ] );
  resetPaddle();
  resetBall();
  state.screen = 'playing';
}

document.addEventListener( 'keydown', ( e ) => {
  if ( e.key === ' ' && state.screen !== 'playing' ) {
    restartGame();
  }
} );

function checkBlockCollision() {
  const ball = state.ball;
  for ( const block of state.blocks ) {
    if ( !block.alive ) continue;
    const hits = ball.x < block.x + BLOCK_WIDTH
      && ball.x + BALL_SIZE > block.x
      && ball.y < block.y + BLOCK_HEIGHT
      && ball.y + BALL_SIZE > block.y;
    if ( !hits ) continue;

    block.alive = false;
    state.score += 10;
    ball.dy *= -1;
    state.explosions.push( { x: block.x, y: block.y, color: block.color, start: performance.now() } );
    playSound( soundBreak );

    state.shake.start = performance.now();
    state.shake.magnitude = SHAKE_MAGNITUDE;

    const particleOrigin = {
      x: block.x + BLOCK_WIDTH / 2,
      y: block.y + BLOCK_HEIGHT / 2,
    };
    for ( let i = 0; i < PARTICLE_COUNT; i++ ) {
      const angle = ( Math.PI * 2 * i ) / PARTICLE_COUNT + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 1.5;
      state.particles.push( {
        x: particleOrigin.x,
        y: particleOrigin.y,
        dx: Math.cos( angle ) * speed,
        dy: Math.sin( angle ) * speed,
        color: block.color,
        start: performance.now(),
      } );
    }

    if ( Math.random() < POWERUP_DROP_CHANCE ) {
      state.powerUps.push( {
        x: block.x + BLOCK_WIDTH / 2 - POWERUP_SIZE / 2,
        y: block.y,
      } );
    }

    break;
  }
}

function getShakeOffset() {
  const elapsed = performance.now() - state.shake.start;
  if ( elapsed >= SHAKE_DURATION ) return { x: 0, y: 0 };
  const magnitude = SHAKE_MAGNITUDE * ( 1 - elapsed / SHAKE_DURATION );
  return {
    x: ( Math.random() * 2 - 1 ) * magnitude,
    y: ( Math.random() * 2 - 1 ) * magnitude,
  };
}

function draw() {
  ctx.clearRect( 0, 0, canvas.width, canvas.height );

  const shakeOffset = getShakeOffset();
  ctx.save();
  ctx.translate( shakeOffset.x, shakeOffset.y );

  drawSprite( ctx, 'paddle', state.paddle.x, state.paddle.y, state.paddle.width, state.paddle.height );
  drawSprite( ctx, 'ball', state.ball.x, state.ball.y, BALL_SIZE, BALL_SIZE );
  drawBlocks();
  drawExplosions();
  drawParticles();
  drawPowerUps();
  drawHud();

  if ( state.screen === 'gameover' ) {
    drawEndScreen( 'GAME OVER' );
  } else if ( state.screen === 'victory' ) {
    drawEndScreen( 'GANASTE' );
  }

  ctx.restore();
}

function drawPowerUps() {
  ctx.fillStyle = '#ffdd00';
  state.powerUps.forEach( ( powerUp ) => {
    ctx.fillRect( powerUp.x, powerUp.y, POWERUP_SIZE, POWERUP_SIZE );
  } );
}

const HEART_PIXEL_SIZE = 3;
const HEART_GAP = 6;
const HEART_COLOR_ALIVE = '#e02424';
const HEART_COLOR_LOST = '#555';

const HEART_PATTERN = [
  '.XX.XX.',
  'XXXXXXX',
  'XXXXXXX',
  'XXXXXXX',
  '.XXXXX.',
  '..XXX..',
  '...X...',
];

function drawHeart( x, y, color ) {
  ctx.fillStyle = color;
  HEART_PATTERN.forEach( ( row, rowIndex ) => {
    for ( let col = 0; col < row.length; col++ ) {
      if ( row[ col ] !== 'X' ) continue;
      ctx.fillRect(
        x + col * HEART_PIXEL_SIZE,
        y + rowIndex * HEART_PIXEL_SIZE,
        HEART_PIXEL_SIZE,
        HEART_PIXEL_SIZE
      );
    }
  } );
}

function drawHud() {
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText( 'Puntaje: ' + state.score, 10, 24 );
  ctx.textAlign = 'right';
  ctx.fillText( 'Mejor: ' + state.highScore, canvas.width - 10, 24 );
  drawLives();
}

function drawLives() {
  const maxLives = 3;
  const heartWidth = HEART_PATTERN[ 0 ].length * HEART_PIXEL_SIZE;
  const totalWidth = maxLives * heartWidth + ( maxLives - 1 ) * HEART_GAP;
  const startX = canvas.width / 2 - totalWidth / 2;
  const y = 10;

  for ( let i = 0; i < maxLives; i++ ) {
    const x = startX + i * ( heartWidth + HEART_GAP );
    drawHeart( x, y, i < state.lives ? HEART_COLOR_ALIVE : HEART_COLOR_LOST );
  }
}

function drawEndScreen( title ) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect( 0, 0, canvas.width, canvas.height );

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = '32px sans-serif';
  ctx.fillText( title, canvas.width / 2, canvas.height / 2 - 20 );
  ctx.font = '20px sans-serif';
  ctx.fillText( 'Puntaje: ' + state.score, canvas.width / 2, canvas.height / 2 + 16 );
  ctx.font = '16px sans-serif';
  ctx.fillText( 'Presiona espacio para reiniciar', canvas.width / 2, canvas.height / 2 + 48 );
}

function drawBlocks() {
  state.blocks.forEach( ( block ) => {
    if ( !block.alive ) return;
    drawSprite( ctx, 'block_' + block.color, block.x, block.y, BLOCK_WIDTH, BLOCK_HEIGHT );
  } );
}

function drawExplosions() {
  const now = performance.now();
  state.explosions = state.explosions.filter( ( explosion ) => {
    const elapsed = now - explosion.start;
    const frameIndex = Math.floor( elapsed / EXPLOSION_DURATION );
    if ( frameIndex >= 4 ) return false;
    const frame = EXPLOSION_FRAMES[ explosion.color ][ frameIndex ];
    drawFrame( ctx, frame, explosion.x, explosion.y, BLOCK_WIDTH, BLOCK_HEIGHT );
    return true;
  } );
}

function drawParticles() {
  const now = performance.now();
  state.particles = state.particles.filter( ( particle ) => {
    const elapsed = now - particle.start;
    if ( elapsed >= PARTICLE_DURATION ) return false;

    particle.x += particle.dx;
    particle.y += particle.dy;

    const alpha = 1 - elapsed / PARTICLE_DURATION;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc( particle.x, particle.y, 3, 0, Math.PI * 2 );
    ctx.fill();
    ctx.globalAlpha = 1;
    return true;
  } );
}

function loop() {
  update();
  draw();
  requestAnimationFrame( loop );
}

loadSpritesheet( () => {
  document.fonts.ready.then( () => requestAnimationFrame( loop ) );
} );
