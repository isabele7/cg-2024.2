function main() {
    const canvas = document.querySelector("#c");
    const gl = canvas.getContext('webgl');

    if (!gl) {
        throw new Error('WebGL not supported');
    }

    const vertexShaderSource = document.querySelector("#vertex-shader-2d").text;
    const fragmentShaderSource = document.querySelector("#fragment-shader-2d").text;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vertexShader, fragmentShader);

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    const colorBuffer = gl.createBuffer();

    const positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const colorLocation = gl.getAttribLocation(program, "color");
    gl.enableVertexAttribArray(colorLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

    gl.clearColor(1.0, 1.0, 1.0, 1.0); 
    gl.clear(gl.COLOR_BUFFER_BIT);

    drawCircle(gl, positionBuffer, colorBuffer, 0.0, 0.0, 0.5, [1.0, 0.8, 0.6]);

    drawCircle(gl, positionBuffer, colorBuffer, 0.0, -0.1, 0.1, [1.0, 0.0, 0.0]); 

    drawCircle(gl, positionBuffer, colorBuffer, -0.2, 0.2, 0.1, [1.0, 1.0, 1.0]); 
    drawCircle(gl, positionBuffer, colorBuffer, 0.2, 0.2, 0.1, [1.0, 1.0, 1.0]);  
    drawCircle(gl, positionBuffer, colorBuffer, -0.2, 0.2, 0.05, [0.0, 0.0, 0.0]); 
    drawCircle(gl, positionBuffer, colorBuffer, 0.2, 0.2, 0.05, [0.0, 0.0, 0.0]);  

    drawMouth(gl, positionBuffer, colorBuffer, 0.0, -0.3, 0.3, 0.1, [1.0, 0.0, 0.0]); 

    drawHair(gl, positionBuffer, colorBuffer, 0.0, 0.0, 0.5, [1.0, 0.0, 0.0]); 
}

function drawHair(gl, positionBuffer, colorBuffer, centerX, centerY, headRadius, color) {
    const hairRadius = 0.12; 
    const upperLayerHairRadius = 0.15; 
    const numberOfCurls = 10; 
    const upperLayerCurls = 8; 
    const radiusVariance = 0.02;
    const yOffset = 0.05; 

    for (let i = 0; i < numberOfCurls; i++) {
        const angle = (i * Math.PI) / (numberOfCurls - 1);  
        const x = centerX + (headRadius + hairRadius / 2) * Math.cos(angle) + (Math.random() - 0.5) * 0.05;
        const y = centerY + (headRadius + hairRadius / 2) * Math.sin(angle) + (Math.random() - 0.5) * 0.05 - yOffset;
        const curlRadius = hairRadius + (Math.random() - 0.5) * radiusVariance;
        drawCircle(gl, positionBuffer, colorBuffer, x, y, curlRadius, color);
    }

    for (let i = 0; i < upperLayerCurls; i++) {
        const angle = (i * Math.PI) / (upperLayerCurls - 1);  
        const x = centerX + (headRadius + upperLayerHairRadius / 2) * Math.cos(angle) + (Math.random() - 0.5) * 0.05;
        const y = centerY + (headRadius + upperLayerHairRadius / 2) * Math.sin(angle) + (Math.random() - 0.5) * 0.05;
        const curlRadius = upperLayerHairRadius + (Math.random() - 0.5) * radiusVariance;
        drawCircle(gl, positionBuffer, colorBuffer, x, y, curlRadius, color);
    }
}

function drawCircle(gl, positionBuffer, colorBuffer, centerX, centerY, radius, color) {
    const segments = 100;
    let vertices = [];

    for (let i = 0; i < segments; i++) {
        const theta1 = (i * 2 * Math.PI) / segments;
        const theta2 = ((i + 1) * 2 * Math.PI) / segments;

        const x1 = radius * Math.cos(theta1);
        const y1 = radius * Math.sin(theta1);
        const x2 = radius * Math.cos(theta2);
        const y2 = radius * Math.sin(theta2);

        vertices.push(centerX, centerY, centerX + x1, centerY + y1, centerX + x2, centerY + y2);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    let colors = [];
    for (let i = 0; i < segments * 3; i++) {
        colors.push(...color);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, segments * 3);
}

function drawMouth(gl, positionBuffer, colorBuffer, centerX, centerY, width, height, color) {
    const segments = 50;
    let vertices = [];

    for (let i = 0; i < segments; i++) {
        const theta1 = Math.PI + (i * Math.PI) / segments;
        const theta2 = Math.PI + ((i + 1) * Math.PI) / segments;
        const x1 = width * Math.cos(theta1);
        const y1 = height * Math.sin(theta1);
        const x2 = width * Math.cos(theta2);
        const y2 = height * Math.sin(theta2);

        vertices.push(centerX, centerY, centerX + x1, centerY + y1, centerX + x2, centerY + y2);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    let colors = [];
    for (let i = 0; i < segments * 3; i++) {
        colors.push(...color);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, segments * 3);
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
    }
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
    }
    return program;
}

main();