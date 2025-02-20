//Vertex shader
const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;
    attribute vec3 aNormal;
    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat4 uNormalMatrix;
    
    varying lowp vec4 vColor;
    varying highp vec3 vNormal;
    varying highp vec3 vPosition;
    
    void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        
        // Transform normal and position for lighting calculations
        vNormal = (uNormalMatrix * vec4(aNormal, 0.0)).xyz;
        vPosition = (uModelViewMatrix * aVertexPosition).xyz;
        vColor = aVertexColor;
    }
`;

// Fragment shader 
const fsSource = `
    precision mediump float;
    
    varying lowp vec4 vColor;
    varying highp vec3 vNormal;
    varying highp vec3 vPosition;
    
    uniform vec3 uLightDirection;
    
    void main() {
        // Normalize vectors for lighting
        vec3 normal = normalize(vNormal);
        vec3 lightDir = normalize(uLightDirection);
        
        // Ambient light
        float ambientStrength = 0.7;
        vec3 ambient = ambientStrength * vec3(1.0, 1.0, 1.0);
        
        // Diffuse light
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = diff * vec3(1.0, 1.0, 1.0);
        
        // Combine lighting
        vec3 result = (ambient + diffuse) * vColor.rgb;
        gl_FragColor = vec4(result, vColor.a);
    }
`;
let gl;
let programInfo;
let cannon;
let targets = [];
let score = 0;
let time = 30;
let gameStarted = false;
let pressedKeys = {};
let shots = 0;

let skyBuffer;
let skyColorBuffer;
let skyIndicesBuffer;
let grassBuffer;
let grassColorBuffer;
let grassIndicesBuffer;

let lightSources = [];

let sphereGeometry; 

//Inicializa a geometria da esfera que será usada como bala
function initSphereGeometry() {
    sphereGeometry = createSphere(0.2, 16); // raio 0.2, 16 segmentos
}

// Compila o shader
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

//Inicializa o programa de shader com os shaders de vértice e fragmento fornecidos.
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    
    const shaderProgram = gl.createProgram();
    
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
    }
    return shaderProgram;
}

// Inicializa as fontes de luz e define duas fontes de luz com posições, cores e intensidades específicas.
function initLights() {
lightSources = [
    {
        position: [5, 10, -5],
        color: [1.0, 1.0, 1.0],
        intensity: 1.0
    },
    {
        position: [-5, 8, -5],
        color: [0.8, 0.8, 1.0],
        intensity: 0.7
    }
];
}

// Cria os vértices, cores e índices para um cilindro.
function createCylinderVertices(radius, height, segments) {
    const vertices = [];
    const colors = [];
    const indices = [];

    // Criar cilindro (base do canhão)
    for (let i = 0; i <= segments; i++) {
        const theta = (i * 2 * Math.PI) / segments;
        const x = radius * Math.cos(theta);
        const z = radius * Math.sin(theta);
        
        // Top vertex
        vertices.push(x, height/2, z);
        colors.push(0.2, 0.2, 0.8, 1.0); 
        
        // Bottom vertex
        vertices.push(x, -height/2, z);
        colors.push(0.2, 0.2, 0.8, 1.0);
    }

    for (let i = 0; i < segments; i++) {
        const i2 = i * 2;
        indices.push(
            i2, i2 + 1, i2 + 2,
            i2 + 1, i2 + 3, i2 + 2
        );
    }

    const centerTopIndex = vertices.length / 3;
    vertices.push(0, height/2, 0); 
    colors.push(0.2, 0.2, 0.8, 1.0);

    const centerBottomIndex = centerTopIndex + 1;
    vertices.push(0, -height/2, 0);  // Bottom center
    colors.push(0.2, 0.2, 0.8, 1.0);

    for (let i = 0; i < segments; i++) {
        indices.push(
            centerTopIndex,
            i * 2,
            ((i + 1) % segments) * 2
        );
        
        indices.push(
            centerBottomIndex,
            i * 2 + 1,
            ((i + 1) % segments) * 2 + 1
        );
    }

    // Criar o cone (topo do canhão)
    const coneHeight = height/1.2;
    const coneBase = height/2;
    const coneRadius = radius;

    const coneBaseIndex = vertices.length / 3;
    vertices.push(0, coneBase + coneHeight, 0);
    colors.push(0.8, 0.2, 0.2, 1.0); 
    for (let i = 0; i <= segments; i++) {
        const theta = (i * 2 * Math.PI) / segments;
        const x = coneRadius * Math.cos(theta);
        const z = coneRadius * Math.sin(theta);
        
        vertices.push(x, coneBase, z);
        colors.push(0.8, 0.2, 0.2, 1.0);
    }

    for (let i = 0; i < segments; i++) {
        indices.push(
            coneBaseIndex,
            coneBaseIndex + i + 1,
            coneBaseIndex + i + 2
        );
    }

    return {
        vertices: new Float32Array(vertices),
        colors: new Float32Array(colors),
        indices: new Uint16Array(indices)
    };
}


// Criar filas de alvos alternando anéis brancos e vermelhos
function createTargetGeometry(radius, depth) {
const segments = 32;
const vertices = [];
const colors = [];
const indices = [];
const rings = 5;

const faces = [-depth/2, depth/2];
faces.forEach((z) => {
    for (let ring = 0; ring < rings; ring++) {
        const ringRadius = radius * (1 - ring/rings);
        const red = ring === 0 ? 1.0 : (ring % 2 === 0 ? 1.0 : 1.0);
        const white = ring === 0 ? 0.0 : (ring % 2 === 0 ? 0.0 : 1.0);
        
        const centerIndex = vertices.length / 3;
        vertices.push(0, 0, z);
        colors.push(red, white, white, 1.0);
        
        for (let i = 0; i <= segments; i++) {
            const theta = (i * 2 * Math.PI) / segments;
            const x = ringRadius * Math.cos(theta);
            const y = ringRadius * Math.sin(theta);
            
            vertices.push(x, y, z);
            colors.push(red, white, white, 1.0);
            
            if (i < segments) {
                indices.push(
                    centerIndex,
                    centerIndex + i + 1,
                    centerIndex + i + 2
                );
            }
        }
    }
});

// Adiciona paredes para dar profundidade aos alvos
for (let i = 0; i < segments; i++) {
    const theta = (i * 2 * Math.PI) / segments;
    const nextTheta = ((i + 1) * 2 * Math.PI) / segments;
    
    const x1 = radius * Math.cos(theta);
    const y1 = radius * Math.sin(theta);
    const x2 = radius * Math.cos(nextTheta);
    const y2 = radius * Math.sin(nextTheta);
    
    vertices.push(x1, y1, -depth/2);
    vertices.push(x1, y1, depth/2);
    vertices.push(x2, y2, depth/2);
    vertices.push(x2, y2, -depth/2);
    
    const baseIndex = vertices.length / 3 - 4;
    indices.push(
        baseIndex, baseIndex + 1, baseIndex + 2,
        baseIndex, baseIndex + 2, baseIndex + 3
    );
    
    for (let j = 0; j < 4; j++) {
        colors.push(0.8, 0.0, 0.0, 1.0);
    }
}

return {
    vertices: new Float32Array(vertices),
    colors: new Float32Array(colors),
    indices: new Uint16Array(indices)
};
}

// Inicializa o canhão, com formato cilíndrico na base e cônico no topo
function initCannon() {
    const geometry = createCylinderVertices(0.3, 1.0, 20);
    
    cannon = {
        position: {
            x: 0.0,
            y: 0.0,  
            z: -3.0   
        },
        rotation: {
            x: -Math.PI / 4,
            y: 0,
            z: 0
        },
        vertices: geometry.vertices,
        indices: geometry.indices,
        colors: geometry.colors,
        vertexBuffer: gl.createBuffer(),
        indexBuffer: gl.createBuffer(),
        colorBuffer: gl.createBuffer()
    };
    
    gl.bindBuffer(gl.ARRAY_BUFFER, cannon.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cannon.vertices, gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cannon.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cannon.indices, gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, cannon.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cannon.colors, gl.STATIC_DRAW);
}

// Inicializa os alvos, definindo a posição, rotação, buffers e velocidade dos alvos.
function initTargets() {
    const targetGeometry = createTargetGeometry(0.8, 0.2);
    const postGeometry = createPostGeometry(3.0, 0.1);
    
    targets = [];
    
    const rows = 3;
    const cols = 4;
    const colSpacing = 6;
    const baseDepth = -7;
    const depthIncrement = 4;
    const targetDiameter = 3; // Diâmetro dos alvos (2 * raio)
    const minSpacing = targetDiameter + 2; // Espaçamento mínimo entre os alvos
    
    for (let row = 0; row < rows; row++) {
        const rowHeight = 1 + row * 2.0;
        const rowDepth = baseDepth - (row * depthIncrement);
        
        let xPos = -((cols - 1) * colSpacing / 2); // Posição inicial do primeiro alvo na linha
        
        for (let col = 0; col < cols; col++) {
            const target = {
                position: {
                    x: xPos,
                    y: rowHeight,
                    z: rowDepth
                },
                initialPosition: {  // Adicionando posição inicial
                    x: xPos,
                    y: rowHeight,
                    z: rowDepth
                },
                rotation: { x: 0, y: 0, z: 0 },
                vertices: targetGeometry.vertices,
                indices: targetGeometry.indices,
                colors: targetGeometry.colors,
                vertexBuffer: gl.createBuffer(),
                indexBuffer: gl.createBuffer(),
                colorBuffer: gl.createBuffer(),
                active: true,
                speed: 0.02 + (row * 0.01),
                points: 10,
                post: {
                    position: { x: xPos, y: -0.2, z: rowDepth },
                    initialPosition: {  // Adicionando posição inicial do poste
                        x: xPos,
                        y: -0.2,
                        z: rowDepth
                    },
                    vertices: postGeometry.vertices,
                    indices: postGeometry.indices,
                    colors: postGeometry.colors,
                    normals: postGeometry.normals,
                    vertexBuffer: gl.createBuffer(),
                    indexBuffer: gl.createBuffer(),
                    colorBuffer: gl.createBuffer(),
                    normalBuffer: gl.createBuffer()
                }
            };
            
            // Initialize target buffers
            gl.bindBuffer(gl.ARRAY_BUFFER, target.vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, target.vertices, gl.STATIC_DRAW);
            
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, target.indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, target.indices, gl.STATIC_DRAW);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, target.colorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, target.colors, gl.STATIC_DRAW);
            
            // Initialize post buffers
            gl.bindBuffer(gl.ARRAY_BUFFER, target.post.vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, target.post.vertices, gl.STATIC_DRAW);
            
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, target.post.indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, target.post.indices, gl.STATIC_DRAW);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, target.post.colorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, target.post.colors, gl.STATIC_DRAW);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, target.post.normalBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, target.post.normals, gl.STATIC_DRAW);
            
            targets.push(target);
            
            // Atualiza a posição x para o próximo alvo
            xPos += minSpacing;
        }
    }
}


/**
 * Desenha um objeto na cena.
 * @param {Object} object - O objeto a ser desenhado.
 * @param {mat4} projectionMatrix - A matriz de projeção.
 */
function drawObject(object, projectionMatrix) {
    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [object.position.x, object.position.y, object.position.z]);
    if (object.rotation) {
        mat4.rotateX(modelViewMatrix, modelViewMatrix, object.rotation.x);
        mat4.rotateY(modelViewMatrix, modelViewMatrix, object.rotation.y);
        mat4.rotateZ(modelViewMatrix, modelViewMatrix, object.rotation.z);
    }
    gl.useProgram(programInfo.program);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, object.vertexBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, object.colorBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.indexBuffer);
    
    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
    gl.drawElements(gl.TRIANGLES, object.indices.length, gl.UNSIGNED_SHORT, 0);
}

// Desenha as balas na cena.

function drawBullets(projectionMatrix) {
    bullets.forEach(bullet => {
        const modelViewMatrix = mat4.create();
        mat4.translate(modelViewMatrix, modelViewMatrix, 
            [bullet.position.x, bullet.position.y, bullet.position.z]);

        gl.useProgram(programInfo.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, bullet.vertexBuffer);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, bullet.colorBuffer);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bullet.indexBuffer);

        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

        gl.drawElements(gl.TRIANGLES, bullet.indices.length, gl.UNSIGNED_SHORT, 0);
    });
}

// Inicializa as balas com a geometria de uma esfera, definindo posição, rotação, buffers e velocidade dos alvos.
function initBullets() {
    const bulletGeometry = createSphere(0.1, 32);
    const latestBullet = bullets[bullets.length - 1];

    latestBullet.vertices = bulletGeometry.vertices;
    latestBullet.indices = bulletGeometry.indices;
    latestBullet.colors = bulletGeometry.colors;

    latestBullet.vertexBuffer = gl.createBuffer();
    latestBullet.indexBuffer = gl.createBuffer();
    latestBullet.colorBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, latestBullet.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, latestBullet.vertices, gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, latestBullet.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, latestBullet.indices, gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, latestBullet.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, latestBullet.colors, gl.STATIC_DRAW);
}
// Adicione uma variável para contar acertos
let hits = 0;

function handleKeyDown(event) {
    pressedKeys[event.key] = true;
    if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault(); // Prevenir scroll da página
        fireCannon();
    }
}

function handleKeyUp(event) {
pressedKeys[event.key] = false;
event.preventDefault();
}

let bullets = [];

// Dispara o canhão, criando uma nova bala. A bala é lançada na direção do canhão.
function fireCannon() {
    if (!gameStarted) return;
    
    shots++; // Incrementa o número de tiros
    
    // Calcula a posição inicial da bala na ponta do canhão
    const coneHeight = 0.5;
    const cannonTipPosition = {
        x: cannon.position.x + coneHeight * Math.sin(cannon.rotation.x) * Math.cos(cannon.rotation.y),
        y: cannon.position.y + coneHeight * Math.cos(cannon.rotation.x),
        z: cannon.position.z + coneHeight * Math.sin(cannon.rotation.x) * Math.sin(cannon.rotation.y)
    };
    
    // Ajusta a direção para ser mais horizontal
    const direction = {
        x: Math.sin(cannon.rotation.y) * Math.cos(cannon.rotation.x),
        y: -Math.sin(cannon.rotation.x) * 0.3,
        z: -Math.cos(cannon.rotation.y) * Math.cos(cannon.rotation.x)
    };

    // Normaliza o vetor de direção
    const magnitude = Math.sqrt(
        direction.x * direction.x + 
        direction.y * direction.y + 
        direction.z * direction.z
    );

    const speed = 0.8;
    
    const newBullet = {
        position: cannonTipPosition,
        velocity: {
            x: (direction.x / magnitude) * speed,
            y: (direction.y / magnitude) * speed,
            z: (direction.z / magnitude) * speed
        }
    };

    bullets.push(newBullet);
    initBullets();
    
    // Atualiza o display de precisão mesmo quando erra
    const accuracy = Math.round((score / (shots * 10)) * 100);
    document.getElementById('accuracy').textContent = accuracy + '%';
}
function updateBullets() {
    const gravity = 0.005;

    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        bullet.position.x += bullet.velocity.x;
        bullet.position.y += bullet.velocity.y;
        bullet.position.z += bullet.velocity.z;
        
        bullet.velocity.y -= gravity;
        
        let bulletHit = false;
        
        if (bullet.position.y > -5 && bullet.position.y < 10) {
            for (let j = 0; j < targets.length && !bulletHit; j++) {
                const target = targets[j];
                if (target.active) {
                    const dx = target.position.x - bullet.position.x;
                    const dy = target.position.y - bullet.position.y;
                    const dz = target.position.z - bullet.position.z;
                    
                    const distanceSquared = dx * dx + dy * dy + dz * dz;
                    const collisionRadiusSquared = 1.0;
                    
                    if (distanceSquared < collisionRadiusSquared) {
                        gl.deleteBuffer(bullet.vertexBuffer);
                        gl.deleteBuffer(bullet.indexBuffer);
                        gl.deleteBuffer(bullet.colorBuffer);
                        
                        bullets.splice(i, 1);
                        bulletHit = true;
                        
                        target.active = false;
                        score += target.points;
                        hits++; // Incrementa o contador de acertos
                        document.getElementById('score').textContent = score;
                        
                        // Calcula precisão baseada em acertos/tiros
                        const accuracy = Math.round((hits / shots) * 100);
                        document.getElementById('accuracy').textContent = accuracy + '%';
                        
                        setTimeout(() => {
                            if (gameStarted) {
                                target.active = true;
                                target.position.x = -10;
                            }
                        }, 2000);
                    }
                }
            }
        }
        
        if (!bulletHit) {
            if (
                bullet.position.y < -10 || 
                bullet.position.z < -20 || 
                bullet.position.z > 20 ||
                bullet.position.x < -15 ||
                bullet.position.x > 15
            ) {
                gl.deleteBuffer(bullet.vertexBuffer);
                gl.deleteBuffer(bullet.indexBuffer);
                gl.deleteBuffer(bullet.colorBuffer);
                bullets.splice(i, 1);
            }
        }
    }
}

function createSphere(radius, segments) {
const vertices = [];
const indices = [];
const colors = [];

for (let lat = 0; lat <= segments; lat++) {
    const theta = (lat * Math.PI) / segments;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let long = 0; long <= segments; long++) {
        const phi = (long * 2 * Math.PI) / segments;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const x = cosPhi * sinTheta;
        const y = cosTheta;
        const z = sinPhi * sinTheta;

        vertices.push(radius * x, radius * y, radius * z);
        colors.push(1.0, 1.0, 0.0, 1.0); // Cor amarela
    }
}

for (let lat = 0; lat < segments; lat++) {
    for (let long = 0; long < segments; long++) {
        const first = lat * (segments + 1) + long;
        const second = first + segments + 1;

        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
    }
}

return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
    colors: new Float32Array(colors)
};
}
function initBackground() {
    // Sky vertices (mantido como está)
    const skyVertices = new Float32Array([
        -100.0,  100.0, -100.0,
         100.0,  100.0, -100.0,
        -100.0, -100.0, -100.0,
         100.0, -100.0, -100.0
    ]);

    // Gradiente de cor para o céu
    const skyColors = new Float32Array([
        0.68, 0.85, 0.9, 1.0, 
        0.68, 0.85, 0.9, 1.0, 
        1.0,  1.0,  1.0,  1.0,  
        1.0,  1.0,  0.8,  1.0 
    ]);

    const skyIndices = new Uint16Array([
        0, 1, 2,
        1, 2, 3
    ]);

    // Criar e preencher buffers do céu
    skyBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, skyBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, skyVertices, gl.STATIC_DRAW);

    skyColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, skyColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, skyColors, gl.STATIC_DRAW);

    skyIndicesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyIndicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, skyIndices, gl.STATIC_DRAW);

    const groundVertices = new Float32Array([
        -100.0, -2.0,   20.0, 
         100.0, -2.0,   20.0, 
        -100.0,  5.0, -100.0,  
         100.0,  5.0, -100.0   
    ]);
    
    const groundColors = new Float32Array([
        0.35, 0.75, 0.20, 1.0,  
        0.35, 0.75, 0.20, 1.0,
        0.45, 0.85, 0.25, 1.0,  
        0.45, 0.85, 0.25, 1.0
    ]);
    
    const groundIndices = new Uint16Array([
        0, 1, 2,
        1, 2, 3
    ]);
    
    grassBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, grassBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, groundVertices, gl.STATIC_DRAW);
    
    grassColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, grassColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, groundColors, gl.STATIC_DRAW);
    
    grassIndicesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, grassIndicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, groundIndices, gl.STATIC_DRAW);
}

// Desenha o fundo com céu e grama
function drawBackground(projectionMatrix) {
    // Matriz de visualização para o fundo
    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -20.0]);

    gl.useProgram(programInfo.program);

    // Desenhar céu
    gl.bindBuffer(gl.ARRAY_BUFFER, skyBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, skyColorBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyIndicesBuffer);

    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    // Desenhar chão
    gl.bindBuffer(gl.ARRAY_BUFFER, grassBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, grassColorBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, grassIndicesBuffer);

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

function startGame() {
    if (!gl) {
        console.error('WebGL não está inicializado');
        return;
    }

    // Reseta o estado do jogo
    gameStarted = true;
    score = 0;
    time = 30;
    shots = 0;
    hits = 0;

    document.getElementById('score').textContent = '0';
    document.getElementById('time').textContent = '30';
    document.getElementById('accuracy').textContent = '0%';

    // Esconde a tela inicial e mostra o jogo
    const startScreen = document.getElementById('start-screen');
    const gameContainer = document.getElementById('game-container');
    
    if (startScreen) startScreen.style.display = 'none';
    if (gameContainer) gameContainer.style.display = 'block';

    // Ativa todos os alvos
    if (targets) {
        targets.forEach(target => {
            target.active = true;
        });
    }

    // Inicia o loop do jogo
    requestAnimationFrame(gameLoop);

    // Configura o timer
    const timer = setInterval(() => {
        if (!gameStarted) {
            clearInterval(timer);
            return;
        }
        
        time--;
        document.getElementById('time').textContent = time;
        
        if (time <= 0) {
            endGame();
            clearInterval(timer);
        }
    }, 1000);
}

// Inicializa o contexto WebGL e configura o canvas.
// Inicializa shaders, luzes, canhão, alvos e geometria da esfera
function initGL() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('Canvas não encontrado');
        return;
    }

    gl = canvas.getContext('webgl');
    if (!gl) {
        alert('Não foi possível inicializar o WebGL. Seu navegador pode não suportar.');
        return;
    }

    // Configura o tamanho do canvas
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Resto da inicialização do WebGL...
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    if (!shaderProgram) {
        console.error('Falha ao inicializar os shaders');
        return;
    }

    // Configura o programInfo e continua a inicialização...
    programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
            normal: gl.getAttribLocation(shaderProgram, 'aNormal'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
            lightDirection: gl.getUniformLocation(shaderProgram, 'uLightDirection')
        },
    };

    // Inicializa os componentes do jogo
    initBackground();
    initLights();
    initCannon();
    initTargets();
    initSphereGeometry();

    // Configura os event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    console.log('WebGL inicializado com sucesso');
}

// Cria a geometria dos postes que vão servir de base para os alvos
function createPostGeometry(height, radius) {
    const segments = 16;
    const vertices = [];
    const colors = [];
    const indices = [];
    const normals = [];
    
    // Cria vértices do cilindro para o poste
    for (let i = 0; i <= segments; i++) {
        const theta = (i * 2 * Math.PI) / segments;
        const x = radius * Math.cos(theta);
        const z = radius * Math.sin(theta);
        
        // Vértice superior
        vertices.push(x, height, z);
        colors.push(0.4, 0.4, 0.4, 1.0);
        normals.push(Math.cos(theta), 0, Math.sin(theta));
        
        // Vértice inferior
        vertices.push(x, -0.2, z);
        colors.push(0.3, 0.3, 0.3, 1.0);
        normals.push(Math.cos(theta), 0, Math.sin(theta));
    }

    // Cria índices para as paredes do cilindro
    for (let i = 0; i < segments; i++) {
        const i2 = i * 2;
        indices.push(
            i2, i2 + 1, i2 + 2,
            i2 + 1, i2 + 3, i2 + 2
        );
    }

    const centerTopIndex = vertices.length / 3;
    vertices.push(0, height, 0);
    colors.push(0.4, 0.4, 0.4, 1.0);
    normals.push(0, 1, 0);

    const centerBottomIndex = centerTopIndex + 1;
    vertices.push(0, 0, 0);
    colors.push(0.3, 0.3, 0.3, 1.0);
    normals.push(0, -1, 0);

    for (let i = 0; i < segments; i++) {
        indices.push(
            centerTopIndex,
            i * 2,
            ((i + 1) % segments) * 2
        );

        indices.push(
            centerBottomIndex,
            i * 2 + 1,
            ((i + 1) % segments) * 2 + 1
        );
    }

    return {
        vertices: new Float32Array(vertices),
        colors: new Float32Array(colors),
        indices: new Uint16Array(indices),
        normals: new Float32Array(normals)
    };
}

//Desenha a cena do jogo, incluindo o fundo, o canhão, os alvos e as balas.
function drawScene() {
    gl.clearColor(0.7, 0.8, 1.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fieldOfView = 60 * Math.PI / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    drawBackground(projectionMatrix);

    const modelViewMatrix = mat4.create();
    
    mat4.translate(modelViewMatrix, modelViewMatrix, [0, -1.5, -2.0]);
    
    mat4.translate(modelViewMatrix, modelViewMatrix, [
        cannon.position.x,
        cannon.position.y,
        cannon.position.z
    ]);
    
    mat4.rotateY(modelViewMatrix, modelViewMatrix, cannon.rotation.y);
    mat4.rotateX(modelViewMatrix, modelViewMatrix, cannon.rotation.x);
    mat4.rotateZ(modelViewMatrix, modelViewMatrix, cannon.rotation.z);

    gl.useProgram(programInfo.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, cannon.vertexBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, cannon.colorBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cannon.indexBuffer);

    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

    gl.drawElements(gl.TRIANGLES, cannon.indices.length, gl.UNSIGNED_SHORT, 0);

    targets.forEach(target => {
        if (target.active) {
            drawObject(target, projectionMatrix);
        }
    });

    drawBullets(projectionMatrix);
}


// Atualiza o estado do jogo dependendo das teclas pressionadas
function updateGame() {
    if (!gameStarted) return;

    const movementSpeed = 0.2;
    const rotationSpeed = 0.03;

    if (pressedKeys['ArrowLeft'] || pressedKeys['a']) {
        cannon.position.x -= movementSpeed;
        if (cannon.position.x < -10) cannon.position.x = -10;
    }
    if (pressedKeys['ArrowRight'] || pressedKeys['d']) {
        cannon.position.x += movementSpeed;
        if (cannon.position.x > 10) cannon.position.x = 10;
    }

    // Ajuste na rotação vertical do canhão
    if (pressedKeys['ArrowUp']) {
        cannon.rotation.x = Math.min(cannon.rotation.x + rotationSpeed, Math.PI / 3);
    }
    if (pressedKeys['ArrowDown']) {
        cannon.rotation.x = Math.max(cannon.rotation.x - rotationSpeed, -Math.PI / 3);
    }

    // Atualiza alvos
    targets.forEach(target => {
        if (target.active) {
            target.position.x += target.speed;
            // Atualiza a posição do poste para acompanhar o alvo
            target.post.position.x = target.position.x;
            
            if (target.position.x > 10) {
                target.position.x = -10;
                target.post.position.x = -10;  // Reseta também a posição do poste
            }
        }
    });
}

// Loop principal do jogo
function gameLoop() {
    updateGame();
    updateBullets();
    drawScene();
    if (gameStarted) {
        requestAnimationFrame(gameLoop);
    }
}

function cleanupGame() {
    // Limpa todos os buffers das balas
    bullets.forEach(bullet => {
        if (bullet.vertexBuffer) gl.deleteBuffer(bullet.vertexBuffer);
        if (bullet.indexBuffer) gl.deleteBuffer(bullet.indexBuffer);
        if (bullet.colorBuffer) gl.deleteBuffer(bullet.colorBuffer);
    });

    // Limpa o array de balas
    bullets = [];

    // Reseta os alvos
    targets.forEach(target => {
        target.active = false;
    });
}

// Quando o jogo termina, exibe a tela mostrando do desempenho do jogador
function endGame() {
    gameStarted = false;
    cleanupGame();

    const finalScore = score;
    const finalAccuracy = Math.round((hits / shots) * 100);

    const endScreen = document.createElement('div');
    endScreen.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        padding: 20px;
        border-radius: 10px;
        color: white;
        text-align: center;
        z-index: 1000;
    `;

    endScreen.innerHTML = `
        <h2>Game Over!</h2>
        <p>Pontuação Final: ${finalScore}</p>
        <p>Precisão: ${finalAccuracy}%</p>
        <p>Tiros Disparados: ${shots}</p>
        <p>Acertos: ${hits}</p>
        <button onclick="location.reload()" style="
            padding: 10px 20px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 10px;
        ">Jogar Novamente</button>
    `;

    document.body.appendChild(endScreen);
}

function resetGame() {
    score = 0;
    shots = 0;
    bullets = [];
    document.getElementById('score').textContent = '0';
    document.getElementById('accuracy').textContent = '0%';

    // Reseta posição dos alvos
    targets.forEach((target, index) => {
        target.active = true;
        target.position.x = -10 + (index * 5);
        target.position.y = 1.0;
        target.position.z = -15.0;
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Inicializa o contexto WebGL e configura o canvas
    initGL();

    // Configura o botão de início do jogo
    const startButton = document.getElementById('start-button');
    if (startButton) {
        startButton.onclick = function() {
            startGame();
        };
    }
    
    // Esconde o container do jogo até que o jogo comece
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        gameContainer.style.display = 'none';
    }
});
