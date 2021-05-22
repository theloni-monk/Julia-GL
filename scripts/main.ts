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
  ).then(() => {
    //actual script starts here
    //TODO: resize canvas onresize dom event
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
    //WRITEME: zoom handler
    //WRITEME: dat.gui ui
    var centerX = 0, centerY = 0;
    var zoom = 1;
    var aspect = canvas.clientWidth / canvas.clientHeight;
    var x_min = -2, x_max = 2;
    var y_min = x_min / aspect, y_max = x_max / aspect;

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
      let x_len = x_max - x_min;
      x_len /= zoom;
      let y_len = x_len / aspect; //clamp to aspect ratio

      x_max = centerX + x_len / 2, x_min = centerX - x_len / 2;
      y_max = centerY + y_len / 2, y_min = centerY - y_len / 2;
      return [x_min, y_min, x_max, y_max];
    };

    const linkShaders = () => {
      /* ======= Associating shaders to buffer objects =======*/
      // Bind mesh data to appropriate hardcoded buffers
      gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Index_Buffer);
      // Get the attribute location pointer and link it to js
      var coord = gl.getAttribLocation(shaderProgram, "pixel_coordinates_a");
      gl.vertexAttribPointer(coord, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(coord);

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
      //update();
    });

    var dragging = false;
    var prevX: number;
    var prevY: number;
    // % change
    var delX = 0, delY = 0;
    const moveDecay = 0.95;
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

    var fps;
    var prevTime = 0;
    const animate = (time:number) => {
      let dt = time - prevTime;
      fps = 1/dt;
      if(!dragging){
        delX *= moveDecay;
        delY *= moveDecay;
        let x_len = x_max - x_min, y_len = y_max - y_min;
        centerX -= delX * x_len;
        centerY += delY * y_len;
      }
      update();
      window.requestAnimationFrame(animate);
    }

    compileShaders();
    initGeo();
    animate(0);
  });
});
