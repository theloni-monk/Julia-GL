interface IAppState extends Record<string, any> {
    centerX: number;
    centerY: number;
    julR: number;
    julI: number;
    xRange: number;
    maxIter: number;
    texLoc: string;
    texture: WebGLTexture | null;
}

interface gl_pointers{
  aVertCoordsLoc: number, //attribute pointer
  //uniform pointers
  uSamplerLoc: WebGLUniformLocation | null,
  uResLoc: WebGLUniformLocation | null,
  uMathSpaceLoc: WebGLUniformLocation | null,
  uMaxIterLoc: WebGLUniformLocation | null,
  uJulLoc: WebGLUniformLocation | null
}

class StateContainer {
    state: IAppState;
    // This object will be passed to datGUI
    // It mirrors the internal state of this StateContainer,
    // and any changes made to it will be reflected bidirectionallly
    guiState: { [name: string]: string | number };

    constructor(initalState: IAppState) {
        this.state = initalState;
        this.guiState = {};
        this._buildInitialPublishedState();
    }

    //init state
    _buildInitialPublishedState() {
        /*
            In order for publishedWritableGUIState to detect
            changes, object properties will be created
            dynamically, that is, using setters and getters.
        */
        for (let key of Object.keys(this.state)) {
            Object.defineProperty(this.guiState, key, {
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
                set: (to: any) => {
                    // If the published state is modified, i.e. via datGUI, reflect
                    // the internal state in this object, trying to convert the public
                    // (string) object to its original type.
                    let stateObjectType = typeof this.state[key];

                    if (stateObjectType === "number") {
                        this.state[key] = Number.parseFloat(to);
                    } else if (stateObjectType === "boolean") {
                        this.state[key] = to === "true" ? true : false;
                    } else {
                        this.state[key] = to;
                    }
                },
            });
        }
    }
}
// Initialize a texture and load an image.
// When the image finished loading copy it into the texture
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
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);

    const image = new Image();
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);
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
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
    };

    image.src = url;

    return texture;
}