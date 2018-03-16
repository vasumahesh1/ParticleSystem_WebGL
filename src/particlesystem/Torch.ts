import { vec2, vec3, vec4, mat4 } from 'gl-matrix';
import { gl } from '../globals';
import PointLight from '../core/lights/PointLight';

class Torch {
  position: vec4;
  orient: vec4;
  lights: Array<PointLight>;

  constructor(position:vec4, orient:vec4) {
    this.position = position;
    this.orient = orient;
    this.lights = new Array<PointLight>();

    
  }
}

class BasicTorch extends Torch {

  constructor(position:vec4, orient:vec4) {
    super(position, orient);

    let light = new PointLight();
    light.ambient = vec4.fromValues(0.2, 0.2, 0.2, 1);
    light.diffuse = vec4.fromValues(15, 15, 15, 1);
    light.specular = vec4.fromValues(5.0, 5.0, 5.0, 1);
    light.position = vec3.fromValues(position[0], position[1] + 0.75, position[2]);
    light.range = 5;
    light.attn = vec3.fromValues(1, 1, 10);

    this.lights.push(light);
  }
}

export default Torch;

export { Torch, BasicTorch };