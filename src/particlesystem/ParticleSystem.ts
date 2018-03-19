import { vec2, vec3, vec4, mat4 } from 'gl-matrix';
import { gl } from '../globals';
import WeightedRNG from '../core/rng/WeightedRNG';

const DEFAULT_ORIENT:vec4 = vec4.fromValues(0, 0, 0, 1);
const DEFAULT_SCALE:vec3 = vec3.fromValues(1, 1, 1);

var Logger = require('debug');
var logTrace = Logger("mainApp:particleSystem:info");
var logError = Logger("mainApp:particleSystem:error");

class ParticleState {
  position: vec4;
  orient: vec4;
  color: vec4;
  scale: vec3;
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

  constructor(position:vec4, options:any = {}) {
    this.position = position;
    this.lastSpawn = 0;

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
  }

  addParticle(container: any) {
    let mesh = this.particleRNG.rollNative();
    
    let particlePos = vec4.create();
    vec4.copy(particlePos, this.position);

    let state = new ParticleState(particlePos, DEFAULT_ORIENT, DEFAULT_SCALE, this.ttl);
    state.mesh = mesh;
    state.color = this.startColor;

    container.push(state);
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
        source.addParticle(this.states);
        source.lastSpawn = currTime;
      }
    }

    for (var i = this.states.length - 1; i >= 0; i--) {
      let state = this.states[i];
      state.position[1] += 0.05;
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