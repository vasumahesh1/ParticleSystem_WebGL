import { gl } from '../../globals';
class PointLight {
    constructor() {
        this.contrib = 1;
    }
    static markLocations(program, container, numLights, variableName) {
        let attrLocations = [
            "ambient",
            "diffuse",
            "specular",
            "position",
            "range",
            "contrib",
            "attn"
        ];
        for (var lightItr = 0; lightItr < numLights; ++lightItr) {
            var uniformMap = {};
            for (var locItr = 0; locItr < attrLocations.length; ++locItr) {
                var name = attrLocations[locItr];
                uniformMap[name] = gl.getUniformLocation(program, variableName + "[" + lightItr + "]." + name);
            }
            container[lightItr] = uniformMap;
        }
    }
    setPointLightData(uniformMap) {
        if (uniformMap.ambient == -1) {
            return;
        }
        gl.uniform4fv(uniformMap.ambient, this.ambient);
        gl.uniform4fv(uniformMap.diffuse, this.diffuse);
        gl.uniform4fv(uniformMap.specular, this.specular);
        gl.uniform3fv(uniformMap.position, this.position);
        gl.uniform1f(uniformMap.range, this.range);
        gl.uniform1f(uniformMap.contrib, this.contrib);
        gl.uniform3fv(uniformMap.attn, this.attn);
    }
}
export default PointLight;
//# sourceMappingURL=PointLight.js.map