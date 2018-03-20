import { mat4, vec4, vec2, vec3, mat3 } from 'gl-matrix';
import { gl } from '../../globals';
// In this file, `gl` is accessible because it is imported above
class OpenGLRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.geometryColor = vec4.fromValues(1, 0, 0, 1);
    }
    setClearColor(r, g, b, a) {
        gl.clearColor(r, g, b, a);
    }
    setSize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }
    setGeometryColor(color) {
        this.geometryColor = color;
    }
    clear() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
    render(camera, prog, drawables) {
        let model = mat4.create();
        let rotDelta = mat4.create();
        let viewProj = mat4.create();
        let invViewProj = mat4.create();
        let invProj = mat4.create();
        let invView = mat4.create();
        let globalTransform = mat4.create();
        mat4.fromScaling(globalTransform, vec3.fromValues(3, 3, 3));
        let axes = mat3.fromValues(camera.right[0], camera.right[1], camera.right[2], camera.up[0], camera.up[1], camera.up[2], camera.forward[0], camera.forward[1], camera.forward[2]);
        let color = this.geometryColor;
        mat4.identity(model);
        mat4.multiply(viewProj, camera.projectionMatrix, camera.viewMatrix);
        mat4.invert(invProj, camera.projectionMatrix);
        mat4.invert(invView, camera.viewMatrix);
        mat4.multiply(invViewProj, invView, invProj);
        prog.setModelMatrix(model);
        prog.setViewProjMatrix(viewProj);
        prog.setGeometryColor(color);
        prog.setCameraAxes(axes);
        prog.setInvViewProjMatrix(invViewProj);
        prog.setScreenDimensions(vec2.fromValues(this.canvas.width, this.canvas.height));
        prog.setGlobalTransfrom(globalTransform);
        for (let drawable of drawables) {
            prog.setModelMatrix(drawable.modelMatrix);
            prog.draw(drawable);
        }
    }
}
;
export default OpenGLRenderer;
//# sourceMappingURL=OpenGLRenderer.js.map