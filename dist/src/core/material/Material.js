import { vec4 } from 'gl-matrix';
import { gl } from '../../globals';
class Material {
    constructor() {
        this.diffuse = vec4.fromValues(1, 1, 1, 1);
        this.specular = vec4.fromValues(1, 1, 1, 1);
        this.reflectivity = 0;
        this.matId = 0;
    }
    static markLocations(program, container, variableName) {
        let attrLocations = [
            "diffuse",
            "specular",
            "reflectivity",
            "matId"
        ];
        for (var locItr = 0; locItr < attrLocations.length; ++locItr) {
            var name = attrLocations[locItr];
            container[name] = gl.getUniformLocation(program, variableName + "." + name);
        }
    }
    setMaterialData(uniformMap) {
        if (uniformMap.diffuse == -1) {
            return;
        }
        gl.uniform4fv(uniformMap.diffuse, this.diffuse);
        gl.uniform4fv(uniformMap.specular, this.specular);
        gl.uniform1f(uniformMap.reflectivity, this.reflectivity);
        gl.uniform1i(uniformMap.matId, this.matId);
    }
}
export default Material;
//# sourceMappingURL=Material.js.map