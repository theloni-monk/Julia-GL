#version 300 es
precision highp float;

in vec2 clipLoc;
uniform vec4 mathSpaceRange_u;
uniform vec2 julPoint_u; //render julia set if point provided
uniform sampler2D sampler_u;
uniform int maxIterations_u;

out vec4 outColor; //TODO: implement smooth coloring algoritim

//use matrix representation of a complex number
mat2 getComplex(vec2 v) {
    return mat2(v.x, v.y, -v.y, v.x);
}
float getComplexLen(mat2 complex) {
    return length(vec2(complex[0][0], complex[0, 1]));
}

//see how long it takes to escape
int iterate(mat2 initPoint) {
    int count = 0;
    mat2 iterator = mat2(initPoint); // deep copy
    bool doMandelbrot = length(julPoint_u) < 0.001;
    mat2 jul = getComplex(julPoint_u);
    while(getComplexLen(iterator) < 2.0 && count < maxIterations_u) {
        if(doMandelbrot) iterator = iterator * iterator + initPoint; //leverage optimized native matrix mult
        else iterator = iterator * iterator + jul;
        count++;
    }
    return count;
}

//note: clip space is -1 to +1
void main(void) {
    vec2 strechedClipLoc = vec2((clipLoc.x + 1.0) / 2.0, (clipLoc.y + 1.0) / 2.0);
    float y_len = mathSpaceRange_u.w - mathSpaceRange_u.y;
    float x_len = mathSpaceRange_u.z - mathSpaceRange_u.x;
    //TODO: increase float precision by emulating double when nec maybe?
    vec2 realPos = vec2(mathSpaceRange_u.x + (strechedClipLoc.x * x_len), mathSpaceRange_u.y + (strechedClipLoc.y * y_len));
    float escapeVel = float(iterate(getComplex(realPos))) / float(maxIterations_u);
    if(escapeVel > 0.99) { //if goes to maxiter make it black
        outColor = vec4(0, 0, 0, 1);
    } else {
        outColor = texture(sampler_u, vec2(escapeVel, 0.0));
    }
}