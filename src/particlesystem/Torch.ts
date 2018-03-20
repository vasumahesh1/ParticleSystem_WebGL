import { vec2, vec3, vec4, mat4 } from 'gl-matrix';
import { gl } from '../globals';
import PointLight from '../core/lights/PointLight';
import Material from '../core/material/Material';
import { ParticleSystem, ParticleSource, ParticleAttractor, ParticleRepulsor } from './ParticleSystem'

const DEFAULT_ORIENT:vec4 = vec4.fromValues(0, 0, 0, 1);
const DEFAULT_SCALE:vec3 = vec3.fromValues(1, 1, 1);

function arrayToVec4(arr: any) {
  return vec4.fromValues(arr[0], arr[1], arr[2], arr[3]);
}

function arrayToVec3(arr: any) {
  return vec3.fromValues(arr[0], arr[1], arr[2]);
}

class Torch {
  position: vec4;
  orient: vec4;
  lights: Array<PointLight>;
  activeSystems: any;

  constructor(position:vec4, orient:vec4, activeSystems:any, options: any = {}) {
    this.position = position;
    this.orient = orient;
    this.lights = new Array<PointLight>();
    this.activeSystems = activeSystems;
  }

  update(deltaTime: number, updateOpts:any = {}) {
  }

  render(renderOpts:any = {}) {
    this.activeSystems['BasicFlame'].render({
      offset: this.position
    });
  }

  setLighting(config:any = {}) {
    let light = new PointLight();
    light.ambient =  vec4.fromValues(0.2, 0.2, 0.2, 1);
    light.diffuse = config.diffuse ? arrayToVec4(config.diffuse) : vec4.fromValues(15, 15, 15, 1);
    light.specular = config.specular ? arrayToVec4(config.specular) : vec4.fromValues(5.0, 5.0, 5.0, 1);
    light.position = vec3.fromValues(this.position[0], this.position[1] + 0.4, this.position[2]);
    light.range = config.range || 5;
    light.attn = config.attn ? arrayToVec3(config.attn) : vec3.fromValues(1, 1, 10);

    this.lights.push(light);
  }
}

class BasicTorch extends Torch {

  constructor(position:vec4, orient:vec4, activeSystems:any, options:any = {}) {
    super(position, orient, activeSystems, options);

    this.setLighting(options.lighting);
  }
}

class Torch2 extends Torch {
  constructor(position:vec4, orient:vec4, activeSystems:any, options:any = {}) {
    super(position, orient, activeSystems, options);

    let sourceOpts = options.source || {};
    let subSourceOpts = options.subSource || {};

    this.setLighting(options.lighting);
  }

  // update(deltaTime: number, updateOpts:any = {}) {
  //   for (var itr = 0; itr < this.systems.length; ++itr) {
  //     this.systems[itr].update(deltaTime, updateOpts);
  //   }
  // }

  render(renderOpts:any = {}) {
    this.activeSystems['BasicFlame'].render({
      offset: this.position
    });

    let offset1 = vec4.fromValues(0.085, -0.06, 0, 0);
    vec4.add(offset1, this.position, offset1);

    this.activeSystems['BasicFlame'].render({
      offset: offset1,
      scale: 0.5
    });

    let offset2 = vec4.fromValues(-0.085, -0.06, 0, 0);
    vec4.add(offset2, this.position, offset2);

    this.activeSystems['BasicFlame'].render({
      offset: offset2,
      scale: 0.5
    });

    let offset3 = vec4.fromValues(0, -0.06, 0.085, 0);
    vec4.add(offset3, this.position, offset3);

    this.activeSystems['BasicFlame'].render({
      offset: offset3,
      scale: 0.5
    });

    let offset4 = vec4.fromValues(0, -0.06, -0.085, 0);
    vec4.add(offset4, this.position, offset4);

    this.activeSystems['BasicFlame'].render({
      offset: offset4,
      scale: 0.5
    });
  }
}

class BasicOrbTorch extends Torch {

  constructor(position:vec4, orient:vec4, activeSystems:any, options:any = {}) {
    super(position, orient, activeSystems, options);

    let orb = options.orb || {};
    let sourceOpts = options.source || {};

    this.setLighting(options.lighting);

    let orbDisplacement = 0.6;

    options.meshInstances.Orb1.addInstance(vec4.fromValues(this.position[0], this.position[1] + orbDisplacement, this.position[2], 1), DEFAULT_ORIENT, DEFAULT_SCALE);

    let mat = new Material();
    mat.diffuse = options.material ? arrayToVec4(options.material.diffuse) : mat.diffuse;
    mat.specular = options.material ? arrayToVec4(options.material.specular) : mat.specular;
    mat.reflectivity = options.material ? options.material.reflectivity : mat.reflectivity;
    mat.matId = options.material ? options.material.matId : mat.matId;

    options.meshInstances.Orb1.material = mat;
  }


  render(renderOpts:any = {}) {
    this.activeSystems['OrbFlame'].render({
      offset: this.position
    });
  }
}

class Torch3 extends Torch {
  constructor(position:vec4, orient:vec4, activeSystems:any, options:any = {}) {
    super(position, orient, activeSystems, options);

    let sourceOpts = options.source || {};
    let subSourceOpts = options.subSource || {};

    this.setLighting(options.lighting);
  }

  // update(deltaTime: number, updateOpts:any = {}) {
  //   for (var itr = 0; itr < this.systems.length; ++itr) {
  //     this.systems[itr].update(deltaTime, updateOpts);
  //   }
  // }

  render(renderOpts:any = {}) {
    this.activeSystems['BasicFlame'].render({
      offset: this.position
    });

    let offset3 = vec4.fromValues(0, -0.06, 0.085, 0);
    vec4.add(offset3, this.position, offset3);

    this.activeSystems['BasicFlame'].render({
      offset: offset3,
      scale: 0.5
    });

    let offset4 = vec4.fromValues(0, -0.06, -0.085, 0);
    vec4.add(offset4, this.position, offset4);

    this.activeSystems['BasicFlame'].render({
      offset: offset4,
      scale: 0.5
    });
  }
}

export default Torch;

export { Torch, BasicTorch, BasicOrbTorch, Torch2, Torch3 };