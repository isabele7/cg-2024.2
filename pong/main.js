const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const resumeButton = document.getElementById('resumeButton');
const quitButton = document.getElementById('quitButton');
const restartButton = document.getElementById('restartButton');
const mainMenu = document.getElementById('mainMenu');
const pauseMenu = document.getElementById('pauseMenu');
const gameOverMenu = document.getElementById('gameOverMenu');
const winnerDisplay = document.getElementById('winner');

// dimensões do campo
const fieldWidth = canvas.width - 40; 
const fieldHeight = canvas.height - 90; 
const fieldX = 20; 
const fieldY = 70;

let player1Score = 0;
let player2Score = 0;
let isPaused = false;
let gameActive = false;

function drawRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

function drawCircle(x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
}

function drawText(text, x, y, color) {
    ctx.fillStyle = color;
    ctx.font = '45px Arial';
    ctx.fillText(text, x, y);
}

function drawDottedLine() {
    ctx.beginPath();
    ctx.strokeStyle = 'WHITE';
    ctx.setLineDash([10, 10]);
    ctx.moveTo(fieldX + fieldWidth/2, fieldY);
    ctx.lineTo(fieldX + fieldWidth/2, fieldY + fieldHeight);
    ctx.stroke();
    ctx.setLineDash([]);
}

const ball = {
    x: fieldX + fieldWidth / 2,
    y: fieldY + fieldHeight / 2,
    radius: 10,
    speed: 5,
    velocityX: 5,
    velocityY: 5,
    color: 'WHITE'
};

const player1 = {
    x: fieldX + 10,
    y: fieldY + (fieldHeight / 2) - 50,
    width: 10,
    height: 100,
    color: 'WHITE',
    score: 0
};

const player2 = {
    x: fieldX + fieldWidth - 20,
    y: fieldY + (fieldHeight / 2) - 50,
    width: 10,
    height: 100,
    color: 'WHITE',
    score: 0
};

// movimento das raquetes
function movePaddle(event) {
    const paddleSpeed = 30;
    const key = event.key;

    if (key === 'w') {
        player1.y = Math.max(fieldY, player1.y - paddleSpeed);
    }
    if (key === 's') {
        player1.y = Math.min(fieldY + fieldHeight - player1.height, player1.y + paddleSpeed);
    }
    if (key === 'ArrowUp') {
        player2.y = Math.max(fieldY, player2.y - paddleSpeed);
    }
    if (key === 'ArrowDown') {
        player2.y = Math.min(fieldY + fieldHeight - player2.height, player2.y + paddleSpeed);
    }
}

function resetBall() {
    ball.x = fieldX + fieldWidth / 2;
    ball.y = fieldY + fieldHeight / 2;
    ball.velocityX *= -1;
}

function update() {
    if (isPaused || !gameActive) return;

    let nextX = ball.x + ball.velocityX;
    let nextY = ball.y + ball.velocityY;

    if (nextY - ball.radius < fieldY) {
        ball.velocityY *= -1;
        nextY = fieldY + ball.radius;
    } else if (nextY + ball.radius > fieldY + fieldHeight) {
        ball.velocityY *= -1;
        nextY = fieldY + fieldHeight - ball.radius;
    }

    const ballInPlayer1Range = nextY >= player1.y && nextY <= player1.y + player1.height;
    const ballInPlayer2Range = nextY >= player2.y && nextY <= player2.y + player2.height;

    if (nextX - ball.radius < player1.x + player1.width && ballInPlayer1Range) {
        ball.velocityX *= -1;
        nextX = player1.x + player1.width + ball.radius;
    } else if (nextX + ball.radius > player2.x && ballInPlayer2Range) {
        ball.velocityX *= -1;
        nextX = player2.x - ball.radius;
    }

    ball.x = nextX;
    ball.y = nextY;

    if (ball.x + ball.radius < fieldX) {
        player2.score++;
        resetBall();
    } else if (ball.x - ball.radius > fieldX + fieldWidth) {
        player1.score++;
        resetBall();
    }

    // verifica se algum jogador venceu
    if (player1.score >= 5) {
        endGame('Jogador 1 venceu!');
    } else if (player2.score >= 5) {
        endGame('Jogador 2 venceu!');
    }
}

function render() {
    ctx.fillStyle = '#282c34';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawRect(fieldX, fieldY, fieldWidth, fieldHeight, 'black');

    drawDottedLine();
    drawText(player1.score, fieldX + fieldWidth/4, fieldY - 20, 'WHITE');
    drawText(player2.score, fieldX + 3*fieldWidth/4, fieldY - 20, 'WHITE');
    drawCircle(ball.x, ball.y, ball.radius, ball.color);
    drawRect(player1.x, player1.y, player1.width, player1.height, player1.color);
    drawRect(player2.x, player2.y, player2.width, player2.height, player2.color);
}

function togglePause() {
    isPaused = !isPaused;
    pauseMenu.classList.toggle('hidden', !isPaused);
}

function endGame(message) {
    gameActive = false;
    gameOverMenu.classList.remove('hidden');
    winnerDisplay.textContent = message;
}

function resetGame() {
    player1.score = 0;
    player2.score = 0;
    resetBall();
    player1.y = fieldY + (fieldHeight / 2) - 50;
    player2.y = fieldY + (fieldHeight / 2) - 50;
    isPaused = false;
    gameActive = true;
    gameOverMenu.classList.add('hidden');
    pauseMenu.classList.add('hidden');
    mainMenu.classList.add('hidden');
    requestAnimationFrame(gameLoop); 
}

function gameLoop() {
    update();
    render();
    if (gameActive) requestAnimationFrame(gameLoop);
}

startButton.addEventListener('click', () => {
    mainMenu.classList.add('hidden');
    gameActive = true;
    gameLoop();
});

resumeButton.addEventListener('click', togglePause);

quitButton.addEventListener('click', () => {
    gameActive = false;
    mainMenu.classList.remove('hidden');
    pauseMenu.classList.add('hidden');
});

restartButton.addEventListener('click', () => {
    resetGame();
});

document.addEventListener('keydown', event => {
    if (event.key === 'p') togglePause();
    movePaddle(event);
});

main();