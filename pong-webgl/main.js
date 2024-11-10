const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl');

if (!gl) {
    alert('WebGL não é suportado pelo seu navegador.');
}

// Configurações do campo
const fieldWidth = canvas.width - 40;
const fieldHeight = canvas.height - 90;
const fieldX = 20;
const fieldY = 70;

// Estado do jogo
let player1Score = 0;
let player2Score = 0;
let isPaused = false;
let gameActive = false;

// Configuração dos objetos do jogo
const player1 = {
    x: fieldX + 10,
    y: fieldY + (fieldHeight / 2) - 50,
    width: 10,
    height: 100,
    score: 0,
    color: [1, 1, 1, 1]  // Branco
};

const player2 = {
    x: fieldX + fieldWidth - 20,
    y: fieldY + (fieldHeight / 2) - 50,
    width: 10,
    height: 100,
    score: 0,
    color: [1, 1, 1, 1]  // Branco
};

const ball = {
    x: fieldX + fieldWidth / 2,
    y: fieldY + fieldHeight / 2,
    radius: 5,
    velocityX: 5,
    velocityY: 5,
    color: [1, 1, 1, 1]  // Branco
};

// Funções de shader e inicialização WebGL
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Erro ao compilar shader:', gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

const vertexShaderSource = `
    attribute vec2 a_position;
    uniform vec2 u_resolution;
    
    void main() {
        // Converte pixels para clipspace
        vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    uniform vec4 u_color;
    
    void main() {
        gl_FragColor = u_color;
    }
`;

// Inicialização do programa WebGL
const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Erro ao linkar programa:', gl.getProgramInfoLog(program));
}

gl.useProgram(program);

// Obtém localização dos atributos e uniformes
const positionLocation = gl.getAttribLocation(program, 'a_position');
const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
const colorLocation = gl.getUniformLocation(program, 'u_color');

// Buffer para posições
const positionBuffer = gl.createBuffer();

// Configura viewport e resolução
gl.viewport(0, 0, canvas.width, canvas.height);
gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

// Função para desenhar retângulos
function drawRectangle(x, y, width, height, color) {
    const x1 = x;
    const x2 = x + width;
    const y1 = y;
    const y2 = y + height;

    const positions = [
        x1, y1,
        x2, y1,
        x1, y2,
        x1, y2,
        x2, y1,
        x2, y2,
    ];

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform4fv(colorLocation, color);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function drawDottedLine(x, yStart, yEnd, segmentHeight, gap, color) {
    let currentY = yStart;
    while (currentY < yEnd) {
        drawRectangle(x, currentY, 2, segmentHeight, color);
        currentY += segmentHeight + gap;
    }
}

// Função para desenhar círculo (bola)
function drawCircle(cx, cy, radius, color) {
    const segments = 30;
    const positions = [];
    
    // Centro do círculo
    positions.push(cx, cy);
    
    // Gera pontos ao redor do círculo
    for (let i = 0; i <= segments; i++) {
        const angle = i * Math.PI * 2 / segments;
        positions.push(
            cx + Math.cos(angle) * radius,
            cy + Math.sin(angle) * radius
        );
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform4fv(colorLocation, color);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, segments + 2);
}

function updateScore() {
    document.getElementById('player1Score').textContent = player1.score;
    document.getElementById('player2Score').textContent = player2.score;
}

function update() {
    if (isPaused || !gameActive) return;

    // Atualiza a posição da bola
    ball.x += ball.velocityX;
    ball.y += ball.velocityY;

    // Colisão com as paredes superior e inferior
    if (ball.y - ball.radius < fieldY || ball.y + ball.radius > fieldY + fieldHeight) {
        ball.velocityY *= -1;
    }

    // Colisão com as raquetes dos jogadores
    if (ball.x - ball.radius < player1.x + player1.width &&
        ball.y > player1.y && 
        ball.y < player1.y + player1.height) {
        ball.velocityX *= -1;
        ball.x = player1.x + player1.width + ball.radius;
    }

    if (ball.x + ball.radius > player2.x &&
        ball.y > player2.y && 
        ball.y < player2.y + player2.height) {
        ball.velocityX *= -1;
        ball.x = player2.x - ball.radius; 
    }

    // Incrementar a pontuação do jogador se a bola sair do campo
    if (ball.x < fieldX) {
        player2.score++;
        updateScore();
        resetBall();
    } else if (ball.x > fieldX + fieldWidth) {
        player1.score++;
        updateScore();
        resetBall();
    }

    // Verificar se algum jogador venceu
    if (player1.score >= 5) {
        endGame('Jogador 1 venceu!');
    } else if (player2.score >= 5) {
        endGame('Jogador 2 venceu!');
    }
}

// Função de renderização
function render() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Desenha o campo
    drawRectangle(fieldX, fieldY, fieldWidth, fieldHeight, [0.1, 0.1, 0.1, 1]);

    const lineX = fieldX + fieldWidth / 2 - 1; // Posição x centralizada
    drawDottedLine(lineX, fieldY, fieldY + fieldHeight, 10, 5, [1, 1, 1, 1]); // Altura de 10px com espaçamento de 5px
    
    // Desenha as raquetes
    drawRectangle(player1.x, player1.y, player1.width, player1.height, player1.color);
    drawRectangle(player2.x, player2.y, player2.width, player2.height, player2.color);
    
    // Desenha a bola
    drawCircle(ball.x, ball.y, ball.radius, ball.color);
}

// Funções de controle do jogo
function resetBall() {
    ball.x = fieldX + fieldWidth / 2;
    ball.y = fieldY + fieldHeight / 2;
    ball.velocityX *= -1;
}

function movePaddle(event) {
    const paddleSpeed = 30;

    // Movimentos para a raquete do Jogador 1
    if (event.key === 'w' && player1.y > fieldY) {
        player1.y = Math.max(player1.y - paddleSpeed, fieldY);
    }
    if (event.key === 's' && player1.y + player1.height < fieldY + fieldHeight) {
        player1.y = Math.min(player1.y + paddleSpeed, fieldY + fieldHeight - player1.height);
    }

    // Movimentos para a raquete do Jogador 2
    if (event.key === 'ArrowUp' && player2.y > fieldY) {
        player2.y = Math.max(player2.y - paddleSpeed, fieldY);
    }
    if (event.key === 'ArrowDown' && player2.y + player2.height < fieldY + fieldHeight) {
        player2.y = Math.min(player2.y + paddleSpeed, fieldY + fieldHeight - player2.height);
    }
}


function togglePause() {
    isPaused = !isPaused;
    document.getElementById('pauseMenu').classList.toggle('hidden', !isPaused);
}

function endGame(message) {
    gameActive = false;
    document.getElementById('gameOverMenu').classList.remove('hidden');
    document.getElementById('winner').textContent = message;
}

function resetGame() {
    player1.score = 0;
    player2.score = 0;
    updateScore(); // Atualiza a tabela de score na interface
    resetBall();
    player1.y = fieldY + (fieldHeight / 2) - 50;
    player2.y = fieldY + (fieldHeight / 2) - 50;
    isPaused = false;
    gameActive = true;
    document.getElementById('gameOverMenu').classList.add('hidden');
    document.getElementById('pauseMenu').classList.add('hidden');
    document.getElementById('mainMenu').classList.add('hidden');
    requestAnimationFrame(gameLoop);
}

// Loop principal do jogo
function gameLoop() {
    update();
    render();
    if (gameActive) {
        requestAnimationFrame(gameLoop);
    }
}

// Event Listeners
document.getElementById('startButton').addEventListener('click', () => {
    document.getElementById('mainMenu').classList.add('hidden');
    gameActive = true;
    gameLoop();
});

document.getElementById('resumeButton').addEventListener('click', togglePause);

document.getElementById('quitButton').addEventListener('click', () => {
    gameActive = false;
    document.getElementById('mainMenu').classList.remove('hidden');
    document.getElementById('pauseMenu').classList.add('hidden');
});

document.getElementById('restartButton').addEventListener('click', resetGame);

document.addEventListener('keydown', event => {
    if (event.key === 'p') togglePause();
    movePaddle(event);
});

mainMenu(); 