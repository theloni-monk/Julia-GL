#version 300 es
precision highp float; //TODO: implement log-domain operations, current maxzoom:0.00003

in vec2 clipLoc;
uniform vec4 mathSpaceRange_u;
uniform vec2 julPoint_u; //render julia set if point provided
uniform sampler2D sampler_u;
uniform uint maxIterations_u;

out vec4 outColor; //TODO: implement smooth coloring algoritim

float logaddexp(float a, float b){
    return log(exp(a)+exp(b));
}

//WRITEME: cpx log
//vec2 cpx_log(){}

//WRITEME: complex logarithm
vec2 cpx_logaddexp(vec2 a, vec2 b){ // log domain addition
    return vec2(
        logaddexp(a.x, b.x), 
        logaddexp(a.y, b.y)
        );
}

//WRITEME: cpx multiplication in log domain
vec2 cpx_mult_log(vec2 log_a, vec2 log_b){
    //a.x*b.x - a.y*b.y
    float real = logaddexp(log_a.x+log_b.x, -(log_a.y+log_b.y));
    //a.y*b.x + a.x*b.y
    float imag = logaddexp((log_a.y+log_b.x),(log_a.x+log_b.y));
    return vec2(real, imag);
}

//see how long it takes to escape
//WRITEME: convert to log domain
uint log_iterate(vec2 initPoint) {
    uint count = uint(0);
    vec2 log_iterator = vec2(log(initPoint)); // deep copy
    bool doMandelbrot = length(julPoint_u) < 0.001;
    while(length(exp(log_iterator)) < 2.0 && count < maxIterations_u) {
        if(doMandelbrot) {
            log_iterator = cpx_logaddexp(2.0 * log_iterator, initPoint); //WRITEME: convert to func calls
        }
        else {
            log_iterator = cpx_logaddexp(cpx_mult_log(log_iterator, log_iterator), julPoint_u);
        }
        count++;
    }
    return count;
}

const float iterations_per_tex = 200.0; //could export to dat.gui maybe

//note: clip space is -1 to +1
void main(void) {
    vec2 strechedClipLoc = vec2((clipLoc.x + 1.0) / 2.0, (clipLoc.y + 1.0) / 2.0); // change to range 0-1
    float log_y_len = log(mathSpaceRange_u.w - mathSpaceRange_u.y);
    float log_x_len = log(mathSpaceRange_u.z - mathSpaceRange_u.x);
    
    
    vec2 log_pos = vec2(
    logaddexp(log(mathSpaceRange_u.x) , log(strechedClipLoc.x) + log_x_len),
    logaddexp(log(mathSpaceRange_u.y), log(strechedClipLoc.y) + log_y_len)
    );
    

    //if len over 2 just return base of tex and dont compute
    if(pow(exp(log_pos.x), 2.0) + pow(exp(log_pos.y), 4.0) > 4.0){
        outColor = vec4(length(exp(log_pos)),0,0,1);//texture(sampler_u, vec2(0, 0));
        return;
    }
    else{
        outColor = vec4(2.0-length(exp(log_pos)),0,0,1);//texture(sampler_u, vec2(0, 0));
        return;
    }

    uint iterations = log_iterate(log_pos);
    if(iterations == maxIterations_u) { //hit maxiter
        outColor = vec4(0, 0, 0, 1);
        return;
    }

    float escapeVel = mod(float(iterations), iterations_per_tex) / iterations_per_tex;
    outColor = texture(sampler_u, vec2(escapeVel, 0));
    
}
