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

class ParticleState {
  position: vec4;
  orient: vec4;
  color: vec4;
  scale: vec3;

  velocity: vec4;
  ttl: number;
  mesh: string;

  constructor(position:vec4, orient:vec4, scale:vec3, ttl: number) {
    this.position = position;
    this.orient = orient;
    this.scale = scale;
    this.ttl = ttl;
    this.mesh = 'Particle1';
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

  coneAngle: number;

  velocityRNG: RNG;
  velocityJitterStr: number;

  countRNG: RNG;

  constructor(position:vec4, options:any = {}) {
    this.position = position;
    this.lastSpawn = 0;
    this.coneAngle = options.coneAngle ? degreeToRad(options.coneAngle / 2) : degreeToRad(60 / 2);

    this.spawnDuration = options.spawnDuration || 300;
    this.ttl = options.ttl || 750;
    this.startColor = options.startColor ?
      vec4.fromValues(options.startColor[0], options.startColor[1], options.startColor[2], options.startColor[3]) : vec4.fromValues(1, 0, 0, 1);

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
      this.velocityJitterStr = config.jitter;
      this.velocityRNG = new RNG(config.rng.seed, config.rng.min, config.rng.max);
    }
    else {
      this.velocityRNG = new RNG(3412, 400, 1500);
      this.velocityJitterStr = 0.05;
    }

    if (options.count) {
      let config = options.count;
      this.countRNG = new RNG(config.rng.seed, config.rng.min, config.rng.max);
    }
    else {
      this.countRNG = new RNG(3412, 5, 10);
    }
  }

  addParticles(container: any) {
    let toAdd = this.countRNG.rollNative();

    for (var itr = 0; itr < toAdd; ++itr) {
      let mesh = this.particleRNG.rollNative();
      
      let particlePos = vec4.create();
      vec4.copy(particlePos, this.position);

      let state = new ParticleState(particlePos, DEFAULT_ORIENT, DEFAULT_SCALE, this.ttl);
      state.mesh = mesh;
      state.color = this.startColor;
      let speed = this.velocityRNG.rollNative() / 1000;

      let z = Math.random() * (1 - Math.cos(this.coneAngle)) + Math.cos(this.coneAngle);
      let phi = Math.random() * 2.0 * Math.PI;
      let x = Math.sqrt(1 - (z * z)) * Math.cos(phi);
      let y = Math.sqrt(1 - (z * z)) * Math.sin(phi);

      

      let direction = vec3.fromValues(x, y, z);

      vec3.transformMat3(direction, direction, transform);

      vec3.scale(direction, direction, speed);

      state.velocity = vec4.fromValues(direction[0], direction[1], direction[2], 0);

      container.push(state);
    }
  }
}

class ParticleSystem {
  states: Array<ParticleState>;
  sources: Array<ParticleSource>;
  particleInstances: any;

  constructor(options:any = {}) {
    this.states = new Array<ParticleState>();
    this.sources = new Array<ParticleSource>();
  }

  update(deltaTime: number, updateOpts = {}) {
    let currTime = new Date().getTime();

    for(var key in this.sources) {
      let source = this.sources[key];

      if (currTime - source.lastSpawn > source.spawnDuration) {
        source.addParticles(this.states);
        source.lastSpawn = currTime;
      }
    }

    for (var i = this.states.length - 1; i >= 0; i--) {
      let state = this.states[i];
      // state.position[1] +=   0.05;

      let vel = vec4.create();
      vec4.copy(vel, state.velocity);
      vec4.scale(vel, vel, deltaTime * 0.001);

      let pos = vec4.create();
      vec4.copy(pos, state.position);

      vec4.add(pos, pos, vel);

      state.position = pos;
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

export { ParticleSystem, ParticleSource, ParticleState };