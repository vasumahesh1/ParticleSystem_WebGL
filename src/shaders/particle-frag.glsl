#version 300 es

precision highp float;

uniform vec4 u_Eye;
uniform vec4 u_Color;
uniform sampler2D u_Texture;

in vec4 fs_Nor;
in vec4 fs_LightVec;
in vec4 fs_Col;
in vec4 fs_Pos;
in vec2 fs_UV;

out vec4 out_Col;

void main() {
  out_Col = fs_Col;
}
