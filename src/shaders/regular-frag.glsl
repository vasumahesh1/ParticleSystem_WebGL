#version 300 es

precision highp float;

#define MAX_POINT_LIGHTS 50

struct PointLight {
    vec4 ambient;
    vec4 diffuse;
    vec4 specular;

    vec3 position;
    float range;

    vec3 attn;
};

uniform PointLight u_PointLights[MAX_POINT_LIGHTS];
uniform uint u_NumPointLights; 

uniform vec4 u_Eye;
uniform vec4 u_Color;
uniform sampler2D u_Texture;

in vec4 fs_Nor;
in vec4 fs_LightVec;
in vec4 fs_Col;
in vec4 fs_Pos;
in vec2 fs_UV;

out vec4 out_Col;

const vec4 FOG_NIGHT_COLOR = vec4(0.0f, 0.0f, 0.1f, 1.0f);


vec4 calculatePointLightContribution(vec4 inputColor, vec3 normal) {
  if (u_NumPointLights <= uint(0)) {
    return inputColor;
  }

  float alpha = inputColor.a;

  vec4 ambient, diffuse, spec;

  vec4 totalLightContrib = vec4(0, 0, 0, 0);

  for (uint i = uint(0); i < u_NumPointLights; i++) {
    PointLight light = u_PointLights[i];

    // Initialize outputs.
    ambient = vec4(0.0f, 0.0f, 0.0f, 0.0f);
    diffuse = vec4(0.0f, 0.0f, 0.0f, 0.0f);
    spec    = vec4(0.0f, 0.0f, 0.0f, 0.0f);

    // The vector from the surface to the light.
    vec3 lightVec = light.position - vec3(fs_Pos);
    
    // The distance from surface to light.
    float d = length(lightVec);
  
    // Range test.
    if( d > light.range ) {
      totalLightContrib += ambient;
      continue;
    }
    
    // Normalize the light vector.
    lightVec /= d; 
  
    // Ambient term.
    ambient = light.ambient;  // TODO: Material

    // Add diffuse and specular term, provided the surface is in 
    // the line of site of the light.

    float diffuseTerm = dot(lightVec, normal);

    // Flatten to avoid dynamic branching.
    if( diffuseTerm > 0.0f )
    {
      vec3 v         = reflect(-lightVec, normal);
      float specFactor = pow(max(dot(v, normalize(vec3(u_Eye))), 0.0f), 128.0); // TODO: Material
            
      diffuse = diffuseTerm * light.diffuse;
      spec    = specFactor * light.specular;
    }

    // Attenuate
    float att = 1.0f / dot(light.attn, vec3(1.0f, d, d * d));

    diffuse *= att;
    spec    *= att;

    totalLightContrib += (diffuse + spec + ambient);
  }

  inputColor = inputColor * totalLightContrib;

  inputColor.a = alpha;

  // TODO: Material alhpa

  return inputColor;
}

void main() {
  vec4 finalColor = vec4(0,0,0,1);

  // Material base color (before shading)
  vec4 diffuseColor = fs_Col;

  float alpha = diffuseColor.a;

  finalColor = calculatePointLightContribution(diffuseColor, normalize(vec3(fs_Nor)));


  // /*----------  Ambient  ----------*/
  // float ambientTerm = 0.5;

  // /*----------  Lambertian  ----------*/
  // float diffuseTerm = dot(normalize(fs_Nor), normalize(fs_LightVec));
  // diffuseTerm = clamp(diffuseTerm, 0.0, 1.0);

  // float specularTerm = 0.0;

  // // if (diffuseTerm > 0.0 && fs_Spec > 0.0) {
  // //   /*----------  Blinn Phong  ----------*/
  // //   vec4 viewVec = u_Eye - fs_Pos;
  // //   vec4 lightVec = fs_LightVec - fs_Pos;

  // //   vec4 H = normalize((viewVec + lightVec) / 2.0f);
  // //   specularTerm = max(pow(dot(H, normalize(fs_Nor)), fs_Spec), 0.0);
  // // }

  // float lightIntensity =
  //     ambientTerm + (diffuseTerm + specularTerm);

  // vec4 finalColor = vec4(diffuseColor.rgb * lightIntensity, alpha);
  // finalColor.x = clamp(finalColor.x, 0.0, 1.0);
  // finalColor.y = clamp(finalColor.y, 0.0, 1.0);
  // finalColor.z = clamp(finalColor.z, 0.0, 1.0);

  out_Col = finalColor;

  /*----------  Distance Fog  ----------*/
  float distance = length(fs_Pos - vec4(100, 0, 100, 1));

  vec4 currentFog = FOG_NIGHT_COLOR;

  if (distance > 200.0f) {
    distance = distance - 200.0f;
    float power = distance * 0.1f;

    // Exponential Fog but start only some units ahead of the player
    // 1 - exp(-length(wpos - cpos) * c)
    float fogFactor = 1.0 - exp(-power);
    fogFactor = clamp(fogFactor, 0.0, 1.0);

    out_Col = mix(out_Col, currentFog, fogFactor);
  }
}
