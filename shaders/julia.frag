#version 300 es
precision highp float;

in vec2 clipLoc;
uniform vec4 mathSpaceRange_u;
uniform sampler2D uSampler;

out vec4 outColor; //TODO: implement smooth coloring algoritim

//use matrix representation of a complex number
mat2 getComplex(vec2 v) {
    return mat2(v.x, v.y, -v.y, v.x);
}
float getComplexLen(mat2 complex) {
    return length(vec2(complex[0][0], complex[0, 1]));
}

//TODO: implement arbitrary floating point precision by offloading exp to a uint
//see how long it takes to escape
const int maxIterations = 1000; //TODO: export to dat.gui as an attribute to be linked to shader
int iterate(mat2 complexIn) {
    int count = 0;
    mat2 complex = mat2(complexIn); // deep copy
    while(getComplexLen(complex) < 2.0 && count < maxIterations) {
        complex = complex * complex + complexIn; //leverage optimized native matrix mult
        count++;
    }
    return count;
}

//note: clip space is -1 to +1
void main(void) {
    vec2 strechedClipLoc = vec2((clipLoc.x + 1.0) / 2.0, (clipLoc.y + 1.0) / 2.0);
    float y_len = mathSpaceRange_u.w - mathSpaceRange_u.y;
    float x_len = mathSpaceRange_u.z - mathSpaceRange_u.x;
    vec2 realPos = vec2(mathSpaceRange_u.x + (strechedClipLoc.x * x_len), mathSpaceRange_u.y + (strechedClipLoc.y * y_len));
    float escapeVel = float(iterate(getComplex(realPos))) / float(maxIterations);
    if(escapeVel == 1.0) { //if goes to maxiter make it black
        outColor = vec4(0, 0, 0, 1);
    } else {
        outColor = texture(uSampler, vec2(escapeVel, 0.0));
    }
}
