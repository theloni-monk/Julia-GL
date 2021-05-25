"use strict";
/*========= wait for shit to load ===========*/
const urlPrefix = "Julia-GL";
class StateContainer {
    constructor(initalState) {
        this.state = initalState;
        this.publishedWriteableGUIState = {};
        this._buildInitialPublishedState();
    }
    _buildInitialPublishedState() {
        /*
            In order for publishedWritableGUIState to detect
            changes, object properties will be created
            dynamically, that is, using setters and getters.

            This method initializes the publishedState object
            with said setters and getters for all the properties
            in this.state
        */
        for (let key of Object.keys(this.state)) {
            Object.defineProperty(this.publishedWriteableGUIState, key, {
                get: () => {
                    // reflect internal "object" state
                    let value = this.state[key];
                    // turn the state value into a string
                    let stateValueAsString = value.toString();
                    // check if state value isn't representable as a string
                    if (stateValueAsString === "[object Object]" && typeof value === "object") {
                        throw new Error(`State value "${key}" cannot be represented as a string value.`);
                    }
                    return stateValueAsString;
                },
                set: (to) => {
                    // If the published state is modified, i.e. via datGUI, reflect
                    // the internal state in this object, trying to convert the public
                    // (string) object to its original type.
                    let stateObjectType = typeof this.state[key];
                    if (stateObjectType === "number") {
                        this.state[key] = Number.parseFloat(to);
                    }
                    else if (stateObjectType === "boolean") {
                        this.state[key] = to === "true" ? true : false;
                    }
                    else {
                        this.state[key] = to;
                    }
                },
            });
        }
    }
}
//wait for dom
$(() => {
    var fragCode;
    var vertCode;
    //wait for shaders
    $.when($.get("shaders/fractal.frag", (data) => {
        fragCode = data;
    }), $.get("shaders/quad.vert", (data) => {
        vertCode = data;
    })).done(() => {
        /*========= init everything ===========*/
        const canvas = document.getElementById("webgl_canvas");
        const gl = canvas.getContext("webgl2");
        const shaderProgram = gl.createProgram();
        const vertex_buffer = gl.createBuffer();
        const Index_Buffer = gl.createBuffer();
        //quad the size of the screen to render onto
        var vertices_pixelspace = [];
        const indices = [3, 2, 1, 3, 1, 0];
        //TODO: supersample for MSAA antialiasing
        //init canvas frame buffer
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        var aspect = canvas.clientWidth / canvas.clientHeight;
        //TODO: on mouse hover display exit tragectory
        let initTex = "assets/grad.jpg";
        let appState = new StateContainer({
            centerX: 0,
            centerY: 0,
            julR: 0,
            julI: 0,
            xRange: 4,
            maxIter: 100,
            texLoc: "assets/grad.jpg",
            texture: loadTexture(gl, initTex),
            fps: "60",
        });
        window.state = appState;
        // INIT GUI
        const gui = new dat.GUI();
        gui.useLocalStorage = true;
        gui.addFolder("Spacebar to zoom in or B key to zoom out");
        gui.add(appState.publishedWriteableGUIState, "fps").name("fps (readonly)").listen();
        var viewport = gui.addFolder("viewport");
        viewport.add(appState.publishedWriteableGUIState, "xRange").name("zoom").listen();
        viewport.add(appState.publishedWriteableGUIState, "centerX").name("real component").listen();
        viewport.add(appState.publishedWriteableGUIState, "centerY").name("imaginary component").listen();
        viewport.open();
        var algorithm = gui.addFolder("algorithm");
        algorithm.add(appState.publishedWriteableGUIState, "maxIter", 0, 2000, 1).name("iterations");
        algorithm.open();
        var tex = gui.addFolder("palette");
        //TODO: give more options for preset palettes
        tex.add(appState.publishedWriteableGUIState, "texLoc")
            .name("image url")
            .onFinishChange((url) => {
            appState.state.texture = loadTexture(gl, url);
            initLink();
        });
        tex.open();
        var julia = gui.addFolder("julia set point (leave blank for mandelbrot set)");
        julia.add(appState.publishedWriteableGUIState, "julR").name("real component");
        julia.add(appState.publishedWriteableGUIState, "julI").name("imaginary component");
        /*====================== Shaders =======================*/
        //compile glsl
        function compileShaders() {
            // Create a vertex shader object
            const vertShader = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vertShader, vertCode);
            gl.compileShader(vertShader);
            // Create fragment shader object
            const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fragShader, fragCode);
            gl.compileShader(fragShader);
            // store the combined shader program
            gl.attachShader(shaderProgram, vertShader);
            gl.attachShader(shaderProgram, fragShader);
            gl.linkProgram(shaderProgram);
            gl.useProgram(shaderProgram);
        }
        //make quad
        const initGeo = () => {
            vertices_pixelspace = [
                0,
                canvas.clientHeight,
                0,
                0,
                canvas.clientWidth,
                0,
                canvas.clientWidth,
                canvas.clientHeight,
            ];
            // Create an empty buffer object to store vertex buffer
            // Bind appropriate array buffer to it
            gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
            // Pass the vertex data to the buffer
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices_pixelspace), gl.STATIC_DRAW);
            // Unbind the buffer
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            // Bind appropriate array buffer to it
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Index_Buffer);
            // Pass the vertex data to the buffer
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
            // Unbind the buffer
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        };
        //get mathspace values from screenspace
        const getRange = () => {
            let x_len = appState.state.xRange;
            let y_len = x_len / aspect; //clamp to aspect ratio
            let x_max = appState.state.centerX + x_len / 2, x_min = appState.state.centerX - x_len / 2;
            let y_max = appState.state.centerY + y_len / 2, y_min = appState.state.centerY - y_len / 2;
            return [x_min, y_min, x_max, y_max];
        };
        //initial stuff like passing a texture
        const initLink = () => {
            // Bind mesh data to appropriate hardcoded buffers
            gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Index_Buffer);
            // Get the attribute location pointer and link it to js
            const coord = gl.getAttribLocation(shaderProgram, "pixel_coordinates_a");
            gl.vertexAttribPointer(coord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(coord);
            const uSamplerLocation = gl.getUniformLocation(shaderProgram, "sampler_u");
            gl.activeTexture(gl.TEXTURE0);
            // Bind the texture to texture unit 0
            gl.bindTexture(gl.TEXTURE_2D, appState.state.texture);
            // Tell the shader we bound the texture to texture unit 0
            gl.uniform1i(uSamplerLocation, 0);
        };
        //stuff that is changing in js every frame that needs to update in glsl
        const linkShaders = () => {
            //TODO: optize by not re-instanciating the pointer loactions
            var resolutionUniformLocation = gl.getUniformLocation(shaderProgram, "resolution_u");
            gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
            var mathSpaceRangeLocation = gl.getUniformLocation(shaderProgram, "mathSpaceRange_u");
            gl.uniform4fv(mathSpaceRangeLocation, getRange());
            var maxIterLocation = gl.getUniformLocation(shaderProgram, "maxIterations_u");
            gl.uniform1i(maxIterLocation, appState.state.maxIter);
            var julLocation = gl.getUniformLocation(shaderProgram, "julPoint_u");
            gl.uniform2fv(julLocation, [appState.state.julR, appState.state.julI]);
        };
        //draw
        const drawScene = () => {
            // Clear the canvas
            gl.clearColor(1, 0.5, 1, 0.9); // clear pink
            gl.enable(gl.DEPTH_TEST);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.viewport(0, 0, canvas.width, canvas.height);
            // Draw the triangles
            gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        };
        //relink and draw
        const update = () => {
            linkShaders();
            drawScene();
        };
        /*===== event handlers ======*/
        $(window).on("resize", (e) => {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            aspect = canvas.clientWidth / canvas.clientHeight;
            initGeo();
            initLink();
        });
        var dragging = false;
        var prevX, prevY;
        var delX = 0, delY = 0; // % change
        const moveDecay = 0.925;
        $(window).on("mousedown", (e) => {
            dragging = true;
            prevX = e.clientX;
            prevY = e.clientY;
        });
        $(window).on("mousemove", (e) => {
            if (dragging) {
                delX = (e.clientX - prevX) / canvas.clientWidth;
                delY = (e.clientY - prevY) / canvas.clientHeight;
                prevX = e.clientX;
                prevY = e.clientY;
                let x_len = appState.state.xRange;
                let y_len = x_len / aspect;
                appState.state.centerX = appState.state.centerX - delX * x_len;
                appState.state.centerY = appState.state.centerY + delY * y_len;
            }
        });
        $(window).on("mouseup", (e) => (dragging = false));
        $(window).on("mouseout", (e) => (dragging = false));
        console.log("Press space to zoom in, b to zoom out");
        $(window).on("keydown", (e) => {
            if (!(e.code === "Space" || e.code === "KeyB"))
                return;
            //zoom in or out 5%
            zoomWindow(e.code === "Space" ? 0.95 : 1.05);
        });
        function zoomWindow(factor) {
            appState.state.xRange = appState.state.xRange * factor;
        }
        // init scroll zoom
        document.addEventListener("wheel", (e) => {
            zoomWindow(e.deltaY > 0 ? 0.955 : 1.055);
        });
        var prevTime = 0;
        const animate = (time) => {
            let dt = time - prevTime;
            appState.state.fps = (1000 / dt).toFixed(0);
            prevTime = time;
            //makes dragging smooth
            if (!dragging && (delX > 0.005 || delY > 0.005)) {
                delX *= moveDecay;
                delY *= moveDecay;
                let x_len = appState.state.xRange;
                let y_len = x_len / aspect;
                let newX = appState.state.centerX - delX * x_len;
                let newY = appState.state.centerY + delY * y_len;
                appState.state.centerX = newX;
                appState.state.centerY = newY;
            }
            update();
            window.requestAnimationFrame(animate);
        };
        compileShaders();
        initGeo();
        initLink();
        animate(0);
    });
});
// Initialize a texture and load an image.
// When the image finished loading copy it into the texture
function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Because images have to be download over the internet
    // they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can
    // use it immediately. When the image has finished downloading
    // we'll update the texture with the contents of the image.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);
    const image = new Image();
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);
        function isPowerOf2(value) {
            return (value & (value - 1)) == 0;
        }
        // WebGL1 has different requirements for power of 2 images
        // vs non power of 2 images so check if the image is a
        // power of 2 in both dimensions.
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            // Yes, it's a power of 2. Generate mips.
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        else {
            // No, it's not a power of 2. Turn of mips and set
            // wrapping to clamp to edge
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
        const textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
        const textureCoordinates = [0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
    };
    image.src = url;
    return texture;
}