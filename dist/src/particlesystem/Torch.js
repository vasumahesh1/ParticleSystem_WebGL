import { vec3, vec4 } from 'gl-matrix';
import PointLight from '../core/lights/PointLight';
import ParticleSystem from './ParticleSystem';
class Torch {
    constructor(position, orient) {
        this.position = position;
        this.orient = orient;
        this.lights = new Array();
        system = new ParticleSystem;
    }
}
class BasicTorch extends Torch {
    constructor(position, orient) {
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
//# sourceMappingURL=Torch.js.map