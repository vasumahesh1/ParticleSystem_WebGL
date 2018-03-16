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

const vec4 FOG_COLOR = vec4(0.05f, 0.05f, 0.05f, 1.0f);
const float FOG_CUTOFF = 30.0f;

void main() {

  // Material base color (before shading)
  // vec4 diffuseColor = fs_Col;
  vec4 diffuseColor = texture(u_Texture, fs_UV);

  float alpha = diffuseColor.a;

  /*----------  Ambient  ----------*/
  float ambientTerm = 0.5;

  /*----------  Lambertian  ----------*/
  float diffuseTerm = dot(normalize(fs_Nor), normalize(fs_LightVec));
  diffuseTerm = clamp(diffuseTerm, 0.0, 1.0);

  float specularTerm = 0.0;

  // if (diffuseTerm > 0.0 && fs_Spec > 0.0) {
  //   /*----------  Blinn Phong  ----------*/
  //   vec4 viewVec = u_Eye - fs_Pos;
  //   vec4 lightVec = fs_LightVec - fs_Pos;

  //   vec4 H = normalize((viewVec + lightVec) / 2.0f);
  //   specularTerm = max(pow(dot(H, normalize(fs_Nor)), fs_Spec), 0.0);
  // }

  float lightIntensity =
      ambientTerm + (diffuseTerm + specularTerm);

  vec4 finalColor = vec4(diffuseColor.rgb * lightIntensity, alpha);
  finalColor.x = clamp(finalColor.x, 0.0, 1.0);
  finalColor.y = clamp(finalColor.y, 0.0, 1.0);
  finalColor.z = clamp(finalColor.z, 0.0, 1.0);

  out_Col = finalColor;

  /*----------  Distance Fog  ----------*/
  float distance = length(fs_Pos - u_Eye);

  vec4 currentFog = FOG_COLOR;

  if (distance > FOG_CUTOFF) {
    distance = distance - FOG_CUTOFF;
    float power = distance * 0.5f;

    // Exponential Fog but start only some units ahead of the player
    // 1 - exp(-length(wpos - cpos) * c)
    float fogFactor = 1.0 - exp(-power);
    fogFactor = clamp(fogFactor, 0.0, 1.0);

    out_Col = mix(out_Col, currentFog, fogFactor);
  }
}
