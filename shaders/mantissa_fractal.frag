#version 300 es
precision highp float; //TODO: implement vec3 operations, with 3rd element being exponent current maxzoom:0.00003

in vec2 clipLoc;
uniform vec4 mathSpaceRange_u;
uniform vec2 julPoint_u; //render julia set if point provided
uniform sampler2D sampler_u;
uniform uint maxIterations_u;

out vec4 outColor; //TODO: implement smooth coloring algoritim

float logaddexp(float a, float b){
    return log(exp(a)+exp(b));
}

//use matrix representation of a complex number
mat2 getComplex(vec2 v) {
    return mat2(v.x, v.y, -v.y, v.x);
}
float getComplexLen(mat2 complex) {
    return length(vec2(complex[0][0], complex[0, 1]));
}


//see how long it takes to escape
uint iterate(mat2 initPoint) {
    uint count = uint(0);
    mat2 iterator = mat2(initPoint); // deep copy
    bool doMandelbrot = length(julPoint_u) < 0.0001;
    mat2 jul = getComplex(julPoint_u);
    while(getComplexLen(iterator) < 2.0 && count < maxIterations_u) {
        if(doMandelbrot) iterator = iterator * iterator + initPoint; //leverage optimized native matrix mult
        else iterator = iterator * iterator + jul;
        count++;
    }
    return count;
}


const float iterations_per_tex = 200.0; //could export to dat.gui maybe

//note: clip space is -1 to +1
void main(void) {
    vec2 strechedClipLoc = vec2((clipLoc.x + 1.0) / 2.0, (clipLoc.y + 1.0) / 2.0); // change to range 0-1
    
    float y_len = mathSpaceRange_u.w - mathSpaceRange_u.y;
    float x_len = mathSpaceRange_u.z - mathSpaceRange_u.x;
    vec2 pos = vec2(mathSpaceRange_u.x + (strechedClipLoc.x * x_len), mathSpaceRange_u.y + (strechedClipLoc.y * y_len));
    //log_pos = log(pos);


    //if len over 2 just return base of tex and dont compute
    if(pow(exp(pos.x), 2.0) + pow(exp(pos.y), 2.0) > 4.0){
        outColor = vec4(pow(exp(pos.x), 2.0) + pow(exp(pos.y), 2.0),0,0,1);//texture(sampler_u, vec2(0, 0));
        return;
    }
    else{
        outColor = vec4(4.0-(pow(exp(pos.x), 2.0) + pow(exp(pos.y), 2.0)),0,0,1);
        return;
    }

    uint iterations = iterate(getComplex(pos));
    if(iterations == maxIterations_u) { //hit maxiter
        outColor = vec4(0, 0, 0, 1);
        return;
    }

    float escapeVel = mod(float(iterations), iterations_per_tex) / iterations_per_tex;
    outColor = texture(sampler_u, vec2(escapeVel, 0));
    
}
