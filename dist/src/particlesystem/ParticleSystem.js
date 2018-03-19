import { vec3, vec4 } from 'gl-matrix';
import WeightedRNG from '../core/rng/WeightedRNG';
const DEFAULT_ORIENT = vec4.fromValues(0, 0, 0, 1);
const DEFAULT_SCALE = vec3.fromValues(1, 1, 1);
var Logger = require('debug');
var logTrace = Logger("mainApp:particleSystem:trace");
var logError = Logger("mainApp:particleSystem:error");
class ParticleState {
    constructor(position, orient, scale, ttl) {
        this.position = position;
        this.orient = orient;
        this.scale = scale;
        this.ttl = ttl;
        this.mesh = 'Particle1';
    }
}
class ParticleSource {
    constructor(position, options = {}) {
        this.position = position;
        this.spawnDuration = options.spawnDuration || 500;
        this.ttl = options.ttl || 500;
        this.startColor = options.startColor ? vec4.fromValues(options.startColor) || 500 : ;
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
    addParticle(container) {
        let mesh = this.particleRNG.rollNative();
        let state = new ParticleState(this.position, DEFAULT_ORIENT, DEFAULT_SCALE, this.ttl);
        state.mesh = mesh;
        state.color = this.startColor;
        container.push(state);
    }
}
class ParticleSystem {
    constructor(options = {}) {
        this.states = new Array();
        this.sources = new Array();
    }
    update(deltaTime, updateOpts = {}) {
        let currTime = new Date().getTime();
        for (var key in this.sources) {
            let source = this.sources[key];
            if (currTime - source.lastSpawn > source.spawnDuration) {
                source.addParticle(this.states);
            }
        }
        for (var i = this.states.length - 1; i >= 0; i--) {
            let state = this.states[i];
            state.position[1] += 0.1;
        }
        for (var i = this.states.length - 1; i >= 0; i--) {
            let state = this.states[i];
            state.ttl -= deltaTime;
            if (state.ttl <= 0) {
                this.states.splice(i, 1);
            }
        }
    }
    render(renderOpts = {}) {
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
//# sourceMappingURL=ParticleSystem.js.map