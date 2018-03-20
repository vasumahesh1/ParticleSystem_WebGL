import { vec2, vec3, vec4, mat4 } from 'gl-matrix';
import { gl } from '../globals';
import PointLight from '../core/lights/PointLight';
import { ParticleSystem, ParticleSource, ParticleAttractor } from './ParticleSystem'

class Torch {
  position: vec4;
  orient: vec4;
  lights: Array<PointLight>;
  system: ParticleSystem;

  constructor(position:vec4, orient:vec4, options: any = {}) {
    this.position = position;
    this.orient = orient;
    this.lights = new Array<PointLight>();

    let sysOpts =  options.system ? options.system : {}; 
    this.system = new ParticleSystem(sysOpts);
  }

  update(deltaTime: number, updateOpts:any = {}) {
    this.system.update(deltaTime, updateOpts);
  }

  render(renderOpts:any = {}) {
    this.system.render(renderOpts);
  }
}

class BasicTorch extends Torch {

  constructor(position:vec4, orient:vec4, options = {}) {
    super(position, orient, options);

    let light = new PointLight();
    light.ambient = vec4.fromValues(0.2, 0.2, 0.2, 1);
    light.diffuse = vec4.fromValues(15, 15, 15, 1);
    light.specular = vec4.fromValues(5.0, 5.0, 5.0, 1);
    light.position = vec3.fromValues(position[0], position[1] + 0.4, position[2]);
    light.range = 5;
    light.attn = vec3.fromValues(1, 1, 10);

    this.lights.push(light);

    this.system.sources.push(new ParticleSource(vec4.fromValues(position[0], position[1] + 0.4, position[2], 1)));
    this.system.attractors.push(new ParticleAttractor(vec4.fromValues(position[0], position[1] + 1.1, position[2], 1)))
  }
}

export default Torch;

export { Torch, BasicTorch };