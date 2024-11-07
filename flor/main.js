function main() {
    const canvas = document.querySelector("#c");
    const gl = canvas.getContext('webgl');

    if (!gl) {
        throw new Error('WebGL not supported');
    }

    var vertexShaderSource = document.querySelector("#vertex-shader-2d").text;
    var fragmentShaderSource = document.querySelector("#fragment-shader-2d").text;
    
    var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    var program = createProgram(gl, vertexShader, fragmentShader);

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    const colorBuffer = gl.createBuffer();
    
    const positionLocation = gl.getAttribLocation(program, `position`);
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const colorLocation = gl.getAttribLocation(program, `color`);
    gl.enableVertexAttribArray(colorLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

    gl.clearColor(1.0, 1.0, 1.0 , 1.0); 
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawStem(gl, positionBuffer, colorBuffer);
    drawLeaves(gl, positionBuffer, colorBuffer);
    drawFlowerHead(gl, positionBuffer, colorBuffer);
}

function drawStem(gl, positionBuffer, colorBuffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    setRectangleVertices(gl, -0.05, -0.8, 0.1, 0.9);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    setRectangleColor(gl, [0.0, 0.5, 0.0]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function drawLeaves(gl, positionBuffer, colorBuffer) {
    drawLeaf(gl, positionBuffer, colorBuffer, -0.2, -0.4, Math.PI / 6);
    drawLeaf(gl, positionBuffer, colorBuffer, 0.2, -0.2, -Math.PI / 6);
}

function drawLeaf(gl, positionBuffer, colorBuffer, x, y, rotation) {
    const points = 30;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    setLeafVertices(gl, points, 0.2, x, y, rotation);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    setCircleColor(gl, points, [0.0, 0.8, 0.0]);
    gl.drawArrays(gl.TRIANGLES, 0, points * 3);
}

function drawFlowerHead(gl, positionBuffer, colorBuffer) {
    const petalCount = 25;
    for (let i = 0; i < petalCount; i++) {
        const angle = (i * 2 * Math.PI) / petalCount;
        drawPetal(gl, positionBuffer, colorBuffer, angle);
    }
    const spiralPoints = 400;
    drawSpiralCenter(gl, positionBuffer, colorBuffer, spiralPoints);
}

function drawPetal(gl, positionBuffer, colorBuffer, angle) {
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    setPetalVertices(gl, angle);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    setPetalColor(gl, [1.0, 0.9, 0.0]); 
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function drawSpiralCenter(gl, positionBuffer, colorBuffer, points) {
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); 
    const maxRadius = 0.22;

    for (let i = 0; i < points; i++) {
        const radius = maxRadius * Math.sqrt(i / points);
        const theta = i * goldenAngle;
        const x = radius * Math.cos(theta);
        const y = radius * Math.sin(theta);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        setCircleVertices(gl, 6, 0.015, x, y);
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        setCircleColor(gl, 6, [0.4, 0.2, 0.0]); 
        gl.drawArrays(gl.TRIANGLES, 0, 18);
    }
}

function setLeafVertices(gl, n, size, centerX, centerY, rotation) {
    let vertices = [];
    for (let i = 0; i < n; i++) {
        const angle1 = (i * Math.PI) / n;
        const angle2 = ((i + 1) * Math.PI) / n;
        
        const r1 = size * Math.sin(angle1);
        const r2 = size * Math.sin(angle2);
        
        const x1 = r1 * Math.cos(angle1 + rotation);
        const y1 = r1 * Math.sin(angle1 + rotation);
        
        const x2 = r2 * Math.cos(angle2 + rotation);
        const y2 = r2 * Math.sin(angle2 + rotation);
        
        vertices.push(
            centerX, centerY,
            centerX + x1 * 2, centerY + y1,
            centerX + x2 * 2, centerY + y2
        );
    }
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
}

function setPetalVertices(gl, angle) {
    const baseLength = 0.4; 
    const width = 0.12; 

    const centerX = 0;
    const centerY = 0;
    
    const tipX = baseLength * Math.cos(angle);
    const tipY = baseLength * Math.sin(angle);
    
    const perpAngle = angle + Math.PI / 2;
    const perpX = width * Math.cos(perpAngle);
    const perpY = width * Math.sin(perpAngle);
    
    const vertices = [
        centerX + perpX, centerY + perpY,
        centerX - perpX, centerY - perpY,
        centerX + tipX * 1.2, centerY + tipY  
    ];
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
}


function setCircleVertices(gl, n, radius, centerX = 0, centerY = 0) {
    let vertices = [];
    for (let i = 0; i < n; i++) {
        const angle1 = (i * 2 * Math.PI) / n;
        const angle2 = ((i + 1) * 2 * Math.PI) / n;
        
        vertices.push(
            centerX, centerY,
            centerX + radius * Math.cos(angle1), centerY + radius * Math.sin(angle1),
            centerX + radius * Math.cos(angle2), centerY + radius * Math.sin(angle2)
        );
    }
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
}

function setPetalColor(gl, color) {
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        ...color, ...color, ...color
    ]), gl.STATIC_DRAW);
}

function setCircleColor(gl, n, color) {
    let colors = [];
    for (let i = 0; i < n * 3; i++) {
        colors.push(...color);
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
}

function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }
    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

function setRectangleVertices(gl, x, y, width, height) {
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        x, y,
        x + width, y,
        x, y + height,
        x, y + height,
        x + width, y,
        x + width, y + height
    ]), gl.STATIC_DRAW);
}

function setRectangleColor(gl, color) {
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        ...color, ...color, ...color,
        ...color, ...color, ...color
    ]), gl.STATIC_DRAW);
}

main();