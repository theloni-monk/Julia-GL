import {vertCode, fragCode} from './shaders'
console.log(vertCode);
console.log(fragCode);
const canvas: HTMLCanvasElement = document.getElementById("webgl_canvas") as HTMLCanvasElement;
const gl = canvas.getContext("webgl2") as WebGL2RenderingContext;

/*========== Defining and storing a quad mesh =========*/

const vertices = [-1, 1, 0, -1, -1, 0, 1, -1, 0, 1, 1, 0];

const indices = [3, 2, 1, 3, 1, 0];

// Create an empty buffer object to store vertex buffer
var vertex_buffer = gl.createBuffer();

// Bind appropriate array buffer to it
gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

// Pass the vertex data to the buffer
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

// Unbind the buffer
gl.bindBuffer(gl.ARRAY_BUFFER, null);

// Create an empty buffer object to store Index buffer
var Index_Buffer = gl.createBuffer();

// Bind appropriate array buffer to it
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Index_Buffer);

// Pass the vertex data to the buffer
gl.bufferData(
  gl.ELEMENT_ARRAY_BUFFER,
  new Uint16Array(indices),
  gl.STATIC_DRAW
);

// Unbind the buffer
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

/*====================== Shaders =======================*/

// Create a vertex shader object
const vertShader = gl.createShader(gl.VERTEX_SHADER) as WebGLShader;
gl.shaderSource(vertShader, vertCode );
gl.compileShader(vertShader);

// Create fragment shader object
const fragShader = gl.createShader(gl.FRAGMENT_SHADER) as WebGLShader;
gl.shaderSource(fragShader, fragCode);
gl.compileShader(fragShader);

// Create a shader program object to
// store the combined shader program
const shaderProgram = gl.createProgram() as WebGLProgram;
gl.attachShader(shaderProgram, vertShader);
gl.attachShader(shaderProgram, fragShader);
gl.linkProgram(shaderProgram);
gl.useProgram(shaderProgram);

/* ======= Associating shaders to buffer objects =======*/

// Bind mesh data to appropriate hardcoded buffers
gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Index_Buffer);

// Get the attribute location pointer and link it to js
var coord = gl.getAttribLocation(shaderProgram, "coordinates");
gl.vertexAttribPointer(coord, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(coord);

/*============= Drawing the Quad ================*/
// Clear the canvas
gl.clearColor(1, 1, 1, 0.9);
gl.enable(gl.DEPTH_TEST);
gl.clear(gl.COLOR_BUFFER_BIT);
gl.viewport(0, 0, canvas.width, canvas.height);
// Draw the triangles
gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

