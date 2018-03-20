import { vec2, vec3, vec4, mat4 } from 'gl-matrix';
import { gl } from '../../globals';

class Material {
  diffuse: vec4 = vec4.fromValues(1,1,1,1);
  specular: vec4 = vec4.fromValues(1,1,1,1);
  reflectivity: number = 0;
  matId: number = 0;

  constructor() {
  }

  static markLocations(program:any, container: any, variableName: string) {
    let attrLocations = [
      "diffuse",
      "specular",
      "reflectivity",
      "matId"
    ];

    for (var locItr = 0; locItr < attrLocations.length; ++locItr) {
      var name = attrLocations[locItr];
      container[name] = gl.getUniformLocation(program, variableName + "." + name);
    }
  }

  setMaterialData(uniformMap:any) {
    if (uniformMap.diffuse == -1) {
      return;
    }

    gl.uniform4fv(uniformMap.diffuse, this.diffuse);
    gl.uniform4fv(uniformMap.specular, this.specular);
    gl.uniform1f(uniformMap.reflectivity, this.reflectivity);
    gl.uniform1i(uniformMap.matId, this.matId);
  }
}

export default Material;