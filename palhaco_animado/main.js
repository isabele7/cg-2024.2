function main() {
    const canvas = document.querySelector("#canvas");
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  
    if (!gl) {
        throw new Error('WebGL not supported');
    }

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const positionBuffer = gl.createBuffer();
    const colorBuffer = gl.createBuffer();

    let mouthHappy = true; 
    let lastSwitchTime = 0; 

    function animate(currentTime) {
        gl.clear(gl.COLOR_BUFFER_BIT);

        drawCircle(gl, positionBuffer, colorBuffer, 0.0, 0.0, 0.5, [1.0, 0.8, 0.6]);
        drawCircle(gl, positionBuffer, colorBuffer, 0.0, 0.08, 0.09, [1.0, 0.0, 0.0]); 

        drawCircle(gl, positionBuffer, colorBuffer, -0.2, 0.2, 0.1, [1.0, 1.0, 1.0]); 
        drawCircle(gl, positionBuffer, colorBuffer, 0.2, 0.2, 0.1, [1.0, 1.0, 1.0]);  
        drawCircle(gl, positionBuffer, colorBuffer, -0.2, 0.2, 0.05, [0.0, 0.0, 0.0]); 
        drawCircle(gl, positionBuffer, colorBuffer, 0.2, 0.2, 0.05, [0.0, 0.0, 0.0]); 

        drawMouth(gl, positionBuffer, colorBuffer, mouthHappy);

        drawHair(gl, positionBuffer, colorBuffer, 0.0, 0.0, 0.5, [1.0, 0.1, 0.1]);

        if (currentTime - lastSwitchTime >= 2000) {
            mouthHappy = !mouthHappy;
            lastSwitchTime = currentTime;
        }

        requestAnimationFrame(animate);
    }

    animate(0);
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

    const vertexShaderSource = `
        attribute vec2 a_position;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;

    const fragmentShaderSource = `
        precision mediump float;
        uniform vec4 u_color;
        void main() {
            gl_FragColor = u_color;
        }
    `;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vertexShader, fragmentShader);

    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const colorLocation = gl.getUniformLocation(program, "u_color");
    gl.uniform4f(colorLocation, color[0], color[1], color[2], 1.0);

    gl.drawArrays(gl.TRIANGLES, 0, segments * 3);
}

function drawHair(gl, positionBuffer, colorBuffer, centerX, centerY, headRadius, color) {
    const hairRadius = 0.15;
    const upperLayerHairRadius = 0.18; 
    const numberOfCurls = 12;
    const upperLayerCurls = 10;
    const radiusVariance = 0.03;
    const yOffset = 0.05;

    for (let i = 0; i < numberOfCurls; i++) {
        const angle = (i * Math.PI) / (numberOfCurls - 1);
        const x = centerX + (headRadius + hairRadius / 2) * Math.cos(angle) + (Math.random() - 0.5) * 0.08;
        const y = centerY + (headRadius + hairRadius / 2) * Math.sin(angle) + (Math.random() - 0.5) * 0.08 - yOffset;
        const curlRadius = hairRadius + (Math.random() - 0.5) * radiusVariance;
        drawCircle(gl, positionBuffer, colorBuffer, x, y, curlRadius, color);
    }

    for (let i = 0; i < upperLayerCurls; i++) {
        const angle = (i * Math.PI) / (upperLayerCurls - 1);
        const x = centerX + (headRadius + upperLayerHairRadius / 2) * Math.cos(angle) + (Math.random() - 0.5) * 0.08;
        const y = centerY + (headRadius + upperLayerHairRadius / 2) * Math.sin(angle) + (Math.random() - 0.5) * 0.08;
        const curlRadius = upperLayerHairRadius + (Math.random() - 0.5) * radiusVariance;
        drawCircle(gl, positionBuffer, colorBuffer, x, y, curlRadius, color);
    }
}

function drawMouth(gl, positionBuffer, colorBuffer, mouthHappy) {
    const vertices = [];
    const segments = 40;
    const radius = 0.25;
    const centerX = 0.0;
    const centerY = -0.25;
    const offset = mouthHappy ? 1 : -1; 

    for (let i = 0; i <= segments; i++) {
        const theta = (Math.PI * i) / segments;
        const x = centerX + radius * Math.cos(theta);
        const y = centerY + offset * 0.1 * Math.sin(theta);
        vertices.push(x, y);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const color = [0.0, 0.0, 0.0, 1.0]; // Cor preta para a boca
    const colors = [];
    for (let i = 0; i <= segments; i++) {
        colors.push(...color);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    const vertexShaderSource = `
        attribute vec2 a_position;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;

    const fragmentShaderSource = `
        precision mediump float;
        uniform vec4 u_color;
        void main() {
            gl_FragColor = u_color;
        }
    `;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vertexShader, fragmentShader);

    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const colorLocation = gl.getUniformLocation(program, "u_color");
    gl.uniform4f(colorLocation, color[0], color[1], color[2], color[3]);

    gl.drawArrays(gl.LINE_STRIP, 0, segments + 1);
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
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
        return null;
    }
    return program;
}

main();