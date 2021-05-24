/*========= wait for shit to load ===========*/

//wait for dom
$(() => {
  var fragCode: string;
  var vertCode: string;
  //wait for shaders
  $.when(
    $.get("shaders/julia.frag", (data: string) => {
      fragCode = data;
    }),
    $.get("shaders/quad.vert", (data: string) => {
      vertCode = data;
    })
    //TODO: fetch color pallet to sample from
  ).done(() => {
    const canvas: HTMLCanvasElement = document.getElementById(
      "webgl_canvas"
    ) as HTMLCanvasElement;
    const gl = canvas.getContext("webgl2") as WebGL2RenderingContext;

    /*========= init everything ===========*/
    var vertShader: WebGLShader;
    var fragShader: WebGLShader;
    var shaderProgram: WebGLProgram;
    var vertex_buffer = gl.createBuffer();
    var Index_Buffer = gl.createBuffer();
    //quad the size of the screen to render onto
    var vertices_pixelspace = [];
    const indices = [3, 2, 1, 3, 1, 0];
    //TODO: supersample for MSAA antialiasing
    //init canvas frame buffer
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

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
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(vertices_pixelspace),
        gl.STATIC_DRAW
      );
      // Unbind the buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
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
    };

    //TODO: on mouse hover display exit tragectory
    //WRITEME: dat.gui ui
    var centerX = 0,
      centerY = 0;
    var xRange = 4;
    var aspect = canvas.clientWidth / canvas.clientHeight;
    var x_min = -2,
      x_max = 2;
    var y_min = x_min / aspect,
      y_max = x_max / aspect;
    var texLoc = "assets/rainbowgrad.png";
    var texture = loadTexture(gl, texLoc);

    /*====================== Shaders =======================*/

    const compileShaders = () => {
      // Create a vertex shader object
      vertShader = gl.createShader(gl.VERTEX_SHADER) as WebGLShader;
      gl.shaderSource(vertShader, vertCode);
      gl.compileShader(vertShader);
      // Create fragment shader object
      fragShader = gl.createShader(gl.FRAGMENT_SHADER) as WebGLShader;
      gl.shaderSource(fragShader, fragCode);
      gl.compileShader(fragShader);
      // Create a shader program object to
      // store the combined shader program
      shaderProgram = gl.createProgram() as WebGLProgram;
      gl.attachShader(shaderProgram, vertShader);
      gl.attachShader(shaderProgram, fragShader);
      gl.linkProgram(shaderProgram);
      gl.useProgram(shaderProgram);
    };

    const getRange = (): number[] => {
      let x_len = xRange;
      let y_len = x_len / aspect; //clamp to aspect ratio

      (x_max = centerX + x_len / 2), (x_min = centerX - x_len / 2);
      (y_max = centerY + y_len / 2), (y_min = centerY - y_len / 2);
      return [x_min, y_min, x_max, y_max];
    };

    const initLink = () => {
      // Bind mesh data to appropriate hardcoded buffers
      gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Index_Buffer);

      // Get the attribute location pointer and link it to js
      const coord = gl.getAttribLocation(shaderProgram, "pixel_coordinates_a");
      gl.vertexAttribPointer(coord, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(coord);

      const uSamplerLocation = gl.getUniformLocation(shaderProgram, "uSampler");
      gl.activeTexture(gl.TEXTURE0);
      // Bind the texture to texture unit 0
      gl.bindTexture(gl.TEXTURE_2D, texture);
      // Tell the shader we bound the texture to texture unit 0
      gl.uniform1i(uSamplerLocation, 0);
    };

    const linkShaders = () => {
      /* ======= Associating shaders to buffer objects =======*/

      // could optize by not re-instanciating the pointer loactions
      var resolutionUniformLocation = gl.getUniformLocation(
        shaderProgram,
        "resolution_u"
      );
      gl.uniform2f(
        resolutionUniformLocation,
        gl.canvas.width,
        gl.canvas.height
      );

      var mathSpaceRangeLocation = gl.getUniformLocation(
        shaderProgram,
        "mathSpaceRange_u"
      );
      gl.uniform4fv(mathSpaceRangeLocation, getRange());
    };

    const drawScene = () => {
      // Clear the canvas
      gl.clearColor(1, 0.5, 1, 0.9); // clear pink
      gl.enable(gl.DEPTH_TEST);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.viewport(0, 0, canvas.width, canvas.height);
      // Draw the triangles
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    };

    const update = () => {
      linkShaders();
      drawScene();
      //console.log('update')
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
    var prevX: number;
    var prevY: number;
    // % change
    var delX = 0,
      delY = 0;
    const moveDecay = 0.9;
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

        let x_len = x_max - x_min;
        let y_len = y_max - y_min;
        centerX -= delX * x_len;
        centerY += delY * y_len;
      }
    });
    $(window).on("mouseup", (e) => (dragging = false));
    $(window).on("mouseout", (e) => (dragging = false));

    console.log("Press space to zoom in, b to zoom out");
    $(window).on("keydown", (e) => {
      e.preventDefault();
      if (!(e.code === "Space" || e.code === "KeyB")) return;
      xRange *= e.code === "Space" ? 0.95 : 1.05;
    });

    var fps;
    var prevTime = 0;
    const animate = (time: number) => {
      let dt = time - prevTime;
      fps = 1 / dt;
      //makes dragging smooth
      if (!dragging && (delX > 0.01 || delY > 0.01)) {
        delX *= moveDecay;
        delY *= moveDecay;
        let x_len = x_max - x_min,
          y_len = y_max - y_min;
        centerX -= delX * x_len;
        centerY += delY * y_len;
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
// When the image finished loading copy it into the texture.
//
function loadTexture(gl: WebGL2RenderingContext, url: string) {
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
  gl.texImage2D(
    gl.TEXTURE_2D,
    level,
    internalFormat,
    width,
    height,
    border,
    srcFormat,
    srcType,
    pixel
  );

  const image = new Image();
  image.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      srcFormat,
      srcType,
      image
    );
    function isPowerOf2(value: number) {
      return (value & (value - 1)) == 0;
    }
    // WebGL1 has different requirements for power of 2 images
    // vs non power of 2 images so check if the image is a
    // power of 2 in both dimensions.
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
      // Yes, it's a power of 2. Generate mips.
      gl.generateMipmap(gl.TEXTURE_2D);
    } else {
      // No, it's not a power of 2. Turn of mips and set
      // wrapping to clamp to edge
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }

    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

    const textureCoordinates = [0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0];
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(textureCoordinates),
      gl.STATIC_DRAW
    );
  };

  image.src = url;

  return texture;
}
