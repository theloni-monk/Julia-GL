//TODO: convert to vec2 and pass loc data to frag via varying
attribute vec3 coordinates;
void main(void) {
   gl_Position = vec4(coordinates, 1.0);
}
