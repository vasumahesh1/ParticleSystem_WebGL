import { vec3, vec4, mat3 } from 'gl-matrix';
import WeightedRNG from '../core/rng/WeightedRNG';
import RNG from '../core/rng/RNG';
const DEFAULT_ORIENT = vec4.fromValues(0, 0, 0, 1);
const DEFAULT_SCALE = vec3.fromValues(1, 1, 1);
var Logger = require('debug');
var logTrace = Logger("mainApp:particleSystem:info");
var logError = Logger("mainApp:particleSystem:error");
const transform = mat3.fromValues(1, 0, 0, 0, 0, -1, 0, 1, 0);
function degreeToRad(deg) {
    return deg * 0.0174533;
}
function lerp(val1, val2, alpha) {
    return ((1.0 - alpha) * val1) + (alpha * val2);
}
class ParticleState {
    constructor(position, orient, scale, ttl) {
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
            if (value <= set[0]) {
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
            this.color = vec4.fromValues(lerp(minValue[0] / 255, maxValue[0] / 255, lerpAmount), lerp(minValue[1] / 255, maxValue[1] / 255, lerpAmount), lerp(minValue[2] / 255, maxValue[2] / 255, lerpAmount), 1.0);
        }
        this.scale = vec3.fromValues(1 - value, 1 - value, 1 - value);
    }
}
class ParticleSource {
    constructor(position, options = {}) {
        this.position = position;
        this.lastSpawn = 0;
        this.coneAngle = options.coneAngle ? degreeToRad(options.coneAngle / 2) : degreeToRad(60 / 2);
        this.spawnDuration = options.spawnDuration || 100;
        this.ttl = options.ttl || 750;
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
            this.velocityRNG = new RNG(3412, 400, 1500);
        }
        if (options.count) {
            let config = options.count;
            this.countRNG = new RNG(config.rng.seed, config.rng.min, config.rng.max);
        }
        else {
            this.countRNG = new RNG(3412, 200, 500);
        }
        this.ttlRNG = new RNG(97, -200, 200);
        this.colorGradient = options.colorGradient || [[0.0, [255, 255, 255]], [0.2, [252, 176, 33]], [1, [199.0, 78.0, 34.0]]];
    }
    addParticles(container) {
        let toAdd = this.countRNG.rollNative();
        for (var itr = 0; itr < toAdd; ++itr) {
            let mesh = this.particleRNG.rollNative();
            let particlePos = vec4.create();
            vec4.copy(particlePos, this.position);
            let ttl = this.ttlRNG.rollNative() + this.ttl;
            let state = new ParticleState(particlePos, DEFAULT_ORIENT, DEFAULT_SCALE, ttl);
            state.mesh = mesh;
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
            container.push(state);
        }
    }
}
class ParticleAttractor {
    constructor(position) {
        this.magnitude = 0.5;
        this.position = position;
        this.positionVec3 = vec3.fromValues(position[0], position[1], position[2]);
    }
    compute(state, deltaTime) {
        let particleDir = vec3.fromValues(state.velocity[0], state.velocity[1], state.velocity[2]);
        let normal = vec3.create();
        this.positionVec3;
    }
}
class ParticleSystem {
    constructor(options = {}) {
        this.states = new Array();
        this.sources = new Array();
        this.attractors = new Array();
    }
    update(deltaTime, updateOpts = {}) {
        let currTime = new Date().getTime();
        for (var key in this.sources) {
            let source = this.sources[key];
            if (currTime - source.lastSpawn > source.spawnDuration) {
                source.addParticles(this.states);
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
            for (var i = 0; i < this.attractors.length; ++i) {
                let attr = this.attractors[i];
                attr.compute(state, deltaTime);
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