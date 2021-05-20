#version 300 es
//TODO: convert to vec2 and pass loc data to frag via varying
in vec2 pixel_coordinates_a;
// Used to pass in the resolution of the canvas
uniform vec2 resolution_u;
out vec2 clipLoc;
void main(void) {
   //float aspect_ratio = pixel_coordinates[0] / pixel_coordinates[1];
   
   // convert the position from pixels(y+ up) to clipspace (-1 to +1)
   vec2 zeroToOne = pixel_coordinates_a / resolution_u;
   vec2 zeroToTwo = zeroToOne * 2.0;
   vec2 clipSpace = zeroToTwo - 1.0;
   clipLoc = clipSpace;
   gl_Position = vec4(clipSpace, 0, 1.0);
}
