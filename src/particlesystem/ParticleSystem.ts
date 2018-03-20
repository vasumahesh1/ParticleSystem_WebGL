import { vec2, vec3, vec4, mat4, mat3 } from 'gl-matrix';
import { gl } from '../globals';
import WeightedRNG from '../core/rng/WeightedRNG';
import RNG from '../core/rng/RNG';

const DEFAULT_ORIENT:vec4 = vec4.fromValues(0, 0, 0, 1);
const DEFAULT_SCALE:vec3 = vec3.fromValues(1, 1, 1);

var Logger = require('debug');
var logTrace = Logger("mainApp:particleSystem:info");
var logError = Logger("mainApp:particleSystem:error");

const transform = mat3.fromValues(
          1, 0, 0,
          0, 0, -1,
          0, 1, 0,
        );

function degreeToRad(deg: number) {
  return deg * 0.0174533;
}

function lerp(val1: number, val2: number, alpha: number) {
  return ((1.0 - alpha) * val1) + (alpha * val2);
}

class ParticleState {
  position: vec4;
  orient: vec4;
  color: vec4;
  scale: vec3;
  destination: vec4;

  velocity: vec4;
  ttl: number;
  lifetime: number;
  mesh: string;

  sourcePosition: vec4;
  colorGradient: any;

  constructor(position:vec4, orient:vec4, scale:vec3, ttl: number) {
    this.position = position;
    this.orient = orient;
    this.scale = scale;
    this.ttl = ttl;
    this.lifetime = ttl;
    this.mesh = 'Particle1';
  }

  updateColor() {
    let value = 1.0 - (this.ttl / this.lifetime);

    let idx = -1;

    for (var itr = 0; itr < this.colorGradient.length; ++itr) {
      let set = this.colorGradient[itr];
      if(value <= set[0]) {
        idx = itr;
        break;
      }
    }

    if (idx > 0) {
      let min = this.colorGradient[idx - 1][0];
      let max = this.colorGradient[idx][0];

      let minValue = this.colorGradient[idx - 1][1];
      let maxValue = this.colorGradient[idx][1];

      let lerpAmount = (value - min) / (max - min);

      this.color = vec4.fromValues(
        lerp(minValue[0] / 255, maxValue[0] / 255, lerpAmount),
        lerp(minValue[1] / 255, maxValue[1] / 255, lerpAmount),
        lerp(minValue[2] / 255, maxValue[2] / 255, lerpAmount),
        1.0
      );
    }

    this.scale = vec3.fromValues(1 - value, 1 - value, 1 - value);
  }
}

class ParticleSource {
  position: vec4;
  lastSpawn: number;
  spawnDuration: number
  ttl: number;
  particleRNG: WeightedRNG;
  startColor: vec4;
  endColor: vec4;

  colorGradient: any;

  coneAngle: number;

  velocityRNG: RNG;

  countRNG: RNG;
  ttlRNG: RNG;

  constructor(position:vec4, options:any = {}) {
    this.position = position;
    this.lastSpawn = 0;
    this.coneAngle = options.coneAngle ? degreeToRad(options.coneAngle / 2) : degreeToRad(60 / 2);

    this.spawnDuration = options.spawnDuration || 200;
    this.ttl = options.ttl || 175;
    this.startColor = options.startColor ?
      vec4.fromValues(options.startColor[0], options.startColor[1], options.startColor[2], options.startColor[3]) : vec4.fromValues(1, 1, 1, 1);

    this.endColor = options.endColor ?
      vec4.fromValues(options.endColor[0], options.endColor[1], options.endColor[2], options.endColor[3]) : vec4.fromValues(1, 1, 1, 1);

    if (options.mesh) {
      let config = options.mesh;
      this.particleRNG = new WeightedRNG(config.seed);
      for (var key in config.val) {
        this.particleRNG.add(key, config.val[key]);
      }
    }
    else {
      this.particleRNG = new WeightedRNG(3412);
      this.particleRNG.add('Particle1', 10);
    }

    if (options.velocity) {
      let config = options.velocity;
      this.velocityRNG = new RNG(config.rng.seed, config.rng.min, config.rng.max);
    }
    else {
      this.velocityRNG = new RNG(3412, 200, 700);
    }

    if (options.count) {
      let config = options.count;
      this.countRNG = new RNG(config.rng.seed, config.rng.min, config.rng.max);
    }
    else {
      this.countRNG = new RNG(3412, 200, 500);
    }

    this.ttlRNG = new RNG(97, -100, 0);
    this.colorGradient = options.colorGradient || [[0.0, [255, 255, 255]], [0.2, [252, 176, 33]], [1, [199.0, 78.0, 34.0]]];
  }

  addParticles(container: any, attractors?: any) {
    const DEFAULT_ORIENT:vec4 = vec4.fromValues(0, 0, 0, 1);
    const DEFAULT_SCALE:vec3 = vec3.fromValues(1, 1, 1);

    const transform = mat3.fromValues(
      1, 0, 0,
      0, 0, -1,
      0, 1, 0,
    );

    let toAdd = Math.floor(this.countRNG.rollNative());

    for (var itr = 0; itr < toAdd; ++itr) {
      let mesh = this.particleRNG.rollNative();

      let particlePos = vec4.create();
      let particlePosCopy = vec4.create();
      vec4.copy(particlePos, this.position);
      vec4.copy(particlePosCopy, this.position);

      let ttl = this.ttl + this.ttlRNG.rollNative();

      let state = new ParticleState(particlePos, DEFAULT_ORIENT, DEFAULT_SCALE, ttl);
      state.mesh = mesh;
      state.sourcePosition = particlePosCopy;
      state.color = this.startColor;
      state.colorGradient = this.colorGradient;
      let speed = this.velocityRNG.rollNative() / 1000;

      let z = Math.random() * (1 - Math.cos(this.coneAngle)) + Math.cos(this.coneAngle);
      let phi = Math.random() * 2.0 * Math.PI;
      let x = Math.sqrt(1 - (z * z)) * Math.cos(phi);
      let y = Math.sqrt(1 - (z * z)) * Math.sin(phi);

      let direction = vec3.fromValues(x, y, z);

      vec3.transformMat3(direction, direction, transform);

      vec3.scale(direction, direction, speed);

      state.velocity = vec4.fromValues(direction[0], direction[1], direction[2], 0);

      if (attractors) {
        let selected = Math.floor(Math.random() * attractors.length);
        let attr = attractors[selected];
        let destination = vec4.create();
        vec4.copy(destination, attr.position);
        state.destination = destination;
      }

      container.push(state);
    }
  }
}

class ParticleAttractor {
  position: vec4;
  positionVec3: vec3;
  magnitude: number;

  constructor(position: vec4, options:any = {}) {
    this.magnitude = options.magnitude || 0.5;
    this.position =  position;
    this.positionVec3 = vec3.fromValues(position[0], position[1], position[2]);
  }

  compute(state: ParticleState, deltaTime: number) {
    // let attrDirection = vec4.create();
    // let attrDirectionVec3 = vec3.create();
    // vec4.sub(attrDirection, this.position, state.sourcePosition);
    // vec3.normalize(attrDirectionVec3, vec3.fromValues(attrDirection[0], attrDirection[1], attrDirection[2]));
    // vec3.scale(attrDirectionVec3, attrDirectionVec3, this.magnitude);
    // vec4.add(state.velocity, state.velocity, vec4.fromValues(attrDirectionVec3[0], attrDirectionVec3[1], attrDirectionVec3[2], 0));

    let statePos = vec3.fromValues(state.velocity[0], state.velocity[1], state.velocity[2]);
    let diff = vec4.create();
    vec4.sub(diff, this.position, state.position);
    let diffVec3 = vec3.create();
    vec3.normalize(diffVec3, vec3.fromValues(diff[0], diff[1], diff[2]));

    let normal = vec3.create();
    vec3.cross(normal, statePos, diffVec3);
    vec3.normalize(normal, normal);

    let transform = mat4.create();
    mat4.fromRotation(transform, degreeToRad(5) * this.magnitude, normal);
    vec4.transformMat4(state.velocity, state.velocity, transform);
  }
}


class ParticleRepulsor {
  position: vec4;
  positionVec3: vec3;
  radius: number;

  constructor(position: vec4, options:any = {}) {
    this.radius = options.radius || 0.1;
    this.position =  position;
    this.positionVec3 = vec3.fromValues(position[0], position[1], position[2]);
  }

  compute(state: ParticleState, deltaTime: number) {
    let diff = vec4.create();
    vec4.sub(diff, state.position, this.position);

    let diffRadius = vec4.length(diff) - this.radius;
    if (diffRadius < 0) {
      let dir = vec3.create();
      vec3.normalize(dir, vec3.fromValues(diff[0], diff[1], diff[2]));
      diffRadius = -diffRadius;
      vec3.scale(dir, dir, diffRadius);

      let dirVec4 = vec4.fromValues(dir[0], 0, dir[2], 0);
      vec4.add(state.position, state.position, dirVec4);
    }
  }
}

class ParticleSystem {
  states: Array<ParticleState>;
  sources: Array<ParticleSource>;
  attractors: Array<ParticleAttractor>;
  repulsors: Array<ParticleRepulsor>;
  particleInstances: any;

  constructor(options:any = {}) {
    this.states = new Array<ParticleState>();
    this.sources = new Array<ParticleSource>();
    this.attractors = new Array<ParticleAttractor>();
    this.repulsors = new Array<ParticleRepulsor>();
  }

  update(deltaTime: number, updateOpts = {}) {
    let currTime = Date.now();

    if (this.states.length < 300) {
      for(var key in this.sources) {
        let source = this.sources[key];

        // if (currTime - source.lastSpawn > source.spawnDuration) {
          source.addParticles(this.states);
          source.lastSpawn = currTime;
        // }
      }
    }

    for (var i = this.states.length - 1; i >= 0; i--) {
      let state = this.states[i];

      let vel = vec4.create();
      vec4.copy(vel, state.velocity);
      vec4.scale(vel, vel, deltaTime * 0.001);

      let pos = vec4.create();
      vec4.copy(pos, state.position);

      vec4.add(pos, pos, vel);

      state.position = pos;

      state.updateColor();

      for (var j = 0; j < this.attractors.length; ++j) {
        let attr = this.attractors[j];
        attr.compute(state, deltaTime);
      }

      for (var j = 0; j < this.repulsors.length; ++j) {
        let rep = this.repulsors[j];
        rep.compute(state, deltaTime);
      }
    }

    for (var i = this.states.length - 1; i >= 0; i--) {
      let state = this.states[i];
      state.ttl -= deltaTime;

      // logError(`TTL: ${state.ttl} with ${deltaTime}`);

      if (state.ttl <= 0) {
        this.states.splice(i, 1);
        // console.log('Deleting');
      }
    }

    // logError(`States: ${this.states.length} in System: Deleted = ${test}`);
  }

  render(renderOpts:any = {}) {
    let meshes = this.particleInstances;

    let offset = renderOpts.offset || vec4.fromValues(0,0,0,0);
    let scale = renderOpts.scale || 1;

    let scaleVec = vec3.fromValues(scale, scale, scale);

    for (var i = this.states.length - 1; i >= 0; i--) {
      let state = this.states[i];
      let instance = meshes[state.mesh];

      if (!instance) {
        logError(`Cannot Find Mesh: ${state.mesh} in Meshes`);
        return;
      }

      let pos = vec4.create();
      vec4.copy(pos, state.position);
      vec4.add(pos, pos, offset);
      pos[3] = 1;

      let stateScale = vec3.create();
      vec3.multiply(stateScale, scaleVec, state.scale);

      instance.addInstance(pos, state.orient, stateScale, state.color);
    }
  }
}

class MeshParticleSystem {
  states: Array<ParticleState>;
  sources: Array<ParticleSource>;
  attractors: Array<ParticleAttractor>;
  repulsors: Array<ParticleRepulsor>;
  particleInstances: any;

  constructor(options:any = {}) {
    this.states = new Array<ParticleState>();
    this.sources = new Array<ParticleSource>();
    this.attractors = new Array<ParticleAttractor>();
    this.repulsors = new Array<ParticleRepulsor>();
  }

  create() {
    for(var key in this.sources) {
      let source = this.sources[key];
      source.addParticles(this.states, this.attractors);
    }
  }

  update(deltaTime: number, updateOpts = {}) {
    let currTime = new Date().getTime();

    for(var key in this.sources) {
      let source = this.sources[key];

      if (currTime - source.lastSpawn > source.spawnDuration) {
        source.addParticles(this.states, this.attractors);
        source.lastSpawn = currTime;
      }
    }

    for (var i = this.states.length - 1; i >= 0; i--) {
      let state = this.states[i];

      let vel = vec4.create();
      vec4.copy(vel, state.velocity);
      vec4.scale(vel, vel, deltaTime * 0.001);

      let pos = vec4.create();
      vec4.copy(pos, state.position);

      vec4.add(pos, pos, vel);

      state.position = pos;

      state.updateColor();

      // let direction = vec4.create();
      // vec4.sub(direction, state.destination, state.position);
      // vec4.scale(direction, direction, 0.5);
      // state.velocity = direction;

      let direction = vec4.create();
      vec4.sub(direction, state.destination, state.position);
      if (vec4.length(direction) < 0.1) {
        state.velocity = vec4.create();
      }
      else {
        let dirVec3 = vec3.fromValues(direction[0], direction[1], direction[2]);
        vec3.normalize(dirVec3, dirVec3);
        vec3.scale(dirVec3, dirVec3, 0.05);

        direction = vec4.fromValues(dirVec3[0], dirVec3[1], dirVec3[2], 0);
        vec4.add(state.velocity, state.velocity, direction);
      }
    }

    for (var i = this.states.length - 1; i >= 0; i--) {
      let state = this.states[i];
      state.ttl -= deltaTime;

      if (state.ttl <= 0) {
        this.states.splice(i, 1);
      }
    }
  }

  render(renderOpts:any = {}) {
    let meshes = this.particleInstances;
    for (var i = this.states.length - 1; i >= 0; i--) {
      let state = this.states[i];
      let instance = meshes[state.mesh];

      if (!instance) {
        logError(`Cannot Find Mesh: ${state.mesh} in Meshes`);
        return;
      }

      instance.addInstance(state.position, state.orient, state.scale, state.color);
    }
  }
}

export default ParticleSystem;

export { ParticleSystem, ParticleSource, ParticleState, ParticleAttractor, ParticleRepulsor, MeshParticleSystem };