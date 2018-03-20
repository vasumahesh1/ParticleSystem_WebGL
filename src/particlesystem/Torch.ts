import { vec2, vec3, vec4, mat4 } from 'gl-matrix';
import { gl } from '../globals';
import PointLight from '../core/lights/PointLight';
import { ParticleSystem, ParticleSource, ParticleAttractor, ParticleRepulsor } from './ParticleSystem'

const DEFAULT_ORIENT:vec4 = vec4.fromValues(0, 0, 0, 1);
const DEFAULT_SCALE:vec3 = vec3.fromValues(1, 1, 1);

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

  constructor(position:vec4, orient:vec4, meshInstances:any, particleInstances:any, options:any = {}) {
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

class Torch2 extends Torch {
  systems: Array<ParticleSystem>;

  constructor(position:vec4, orient:vec4, meshInstances:any, particleInstances:any, options:any = {}) {
    super(position, orient, options);

    let sourceOpts = options.source || {};
    let subSourceOpts = options.subSource || {};

    let light = new PointLight();
    light.ambient = vec4.fromValues(0.2, 0.2, 0.2, 1);
    light.diffuse = vec4.fromValues(15, 15, 15, 1);
    light.specular = vec4.fromValues(5.0, 5.0, 5.0, 1);
    light.position = vec3.fromValues(position[0], position[1] + 0.4, position[2]);
    light.range = 5;
    light.attn = vec3.fromValues(1, 1, 10);
    this.lights.push(light);


    this.systems = new Array<ParticleSystem>();

    // Main
    let system = new ParticleSystem();
    system.sources.push(new ParticleSource(vec4.fromValues(position[0], position[1] + 0.4, position[2], 1), sourceOpts));
    system.attractors.push(new ParticleAttractor(vec4.fromValues(position[0], position[1] + 1.1, position[2], 1)));
    system.particleInstances = particleInstances;

    this.systems.push(system);

    // Sub
    system = new ParticleSystem();
    system.sources.push(new ParticleSource(vec4.fromValues(position[0] + 0.09, position[1] + 0.35, position[2], 1), subSourceOpts));
    system.attractors.push(new ParticleAttractor(vec4.fromValues(position[0] + 0.09, position[1] + 0.8, position[2], 1)));
    system.particleInstances = particleInstances;
    this.systems.push(system);

    system = new ParticleSystem();
    system.sources.push(new ParticleSource(vec4.fromValues(position[0] - 0.09, position[1] + 0.35, position[2], 1), subSourceOpts));
    system.attractors.push(new ParticleAttractor(vec4.fromValues(position[0] - 0.09, position[1] + 0.8, position[2], 1)));
    system.particleInstances = particleInstances;
    this.systems.push(system);

    system = new ParticleSystem();
    system.sources.push(new ParticleSource(vec4.fromValues(position[0], position[1] + 0.35, position[2] + 0.09, 1), subSourceOpts));
    system.attractors.push(new ParticleAttractor(vec4.fromValues(position[0], position[1] + 0.8, position[2] + 0.09, 1)));
    system.particleInstances = particleInstances;
    this.systems.push(system);

    system = new ParticleSystem();
    system.sources.push(new ParticleSource(vec4.fromValues(position[0], position[1] + 0.35, position[2] - 0.09, 1), subSourceOpts));
    system.attractors.push(new ParticleAttractor(vec4.fromValues(position[0], position[1] + 0.8, position[2] - 0.09, 1)));
    system.particleInstances = particleInstances;
    this.systems.push(system);
  }

  update(deltaTime: number, updateOpts:any = {}) {
    for (var itr = 0; itr < this.systems.length; ++itr) {
      this.systems[itr].update(deltaTime, updateOpts);
    }
  }

  render(renderOpts:any = {}) {
    for (var itr = 0; itr < this.systems.length; ++itr) {
      this.systems[itr].render(renderOpts);
    }
  }
}

class BasicOrbTorch extends Torch {

  constructor(position:vec4, orient:vec4, meshInstances:any, particleInstances:any, options:any = {}) {
    super(position, orient, options);

    let orb = options.orb || {};
    let sourceOpts = options.source || {};
    let orbDisplacement = orb.displacement || 0.6;

    let light = new PointLight();
    light.ambient = vec4.fromValues(0.2, 0.2, 0.2, 1);
    light.diffuse = vec4.fromValues(15, 15, 15, 1);
    light.specular = vec4.fromValues(5.0, 5.0, 5.0, 1);
    light.position = vec3.fromValues(position[0], position[1] + 0.4, position[2]);
    light.range = 5;
    light.attn = vec3.fromValues(1, 1, 10);

    this.lights.push(light);

    meshInstances.Orb1.addInstance(vec4.fromValues(position[0], position[1] + orbDisplacement, position[2], 1), DEFAULT_ORIENT, DEFAULT_SCALE);

    this.system.sources.push(new ParticleSource(vec4.fromValues(position[0], position[1] + 0.4, position[2], 1), sourceOpts));
    this.system.attractors.push(new ParticleAttractor(vec4.fromValues(position[0], position[1] + 1.1, position[2], 1)));
    this.system.repulsors.push(new ParticleRepulsor(vec4.fromValues(position[0], position[1] + orbDisplacement, position[2], 1)));
  }
}

export default Torch;

export { Torch, BasicTorch, BasicOrbTorch, Torch2 };