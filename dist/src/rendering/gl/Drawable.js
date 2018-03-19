import { mat4 } from 'gl-matrix';
import { gl } from '../../globals';
class Drawable {
    constructor() {
        this.count = 0;
        this.instances = 0;
        this.instanced = false;
        this.lines = false;
        this.modelMatrix = mat4.create();
        this.idxBound = false;
        this.vertBound = false;
        this.norBound = false;
        this.colBound = false;
        this.uvBound = false;
        this.instPosBound = false;
        this.instScaBound = false;
        this.instRotBound = false;
    }
    destory() {
        gl.deleteBuffer(this.bufIdx);
        gl.deleteBuffer(this.bufVert);
        gl.deleteBuffer(this.bufNor);
        gl.deleteBuffer(this.bufCol);
        gl.deleteBuffer(this.bufInstancePosition);
        gl.deleteBuffer(this.bufInstanceRotation);
        gl.deleteBuffer(this.bufInstanceScale);
    }
    generateIdx() {
        this.idxBound = true;
        this.bufIdx = gl.createBuffer();
    }
    generateVert() {
        this.vertBound = true;
        this.bufVert = gl.createBuffer();
    }
    generateInstancePos() {
        this.instPosBound = true;
        this.bufInstancePosition = gl.createBuffer();
    }
    generateInstanceScale() {
        this.instScaBound = true;
        this.bufInstanceScale = gl.createBuffer();
    }
    generateInstanceRotation() {
        this.instRotBound = true;
        this.bufInstanceRotation = gl.createBuffer();
    }
    generateNor() {
        this.norBound = true;
        this.bufNor = gl.createBuffer();
    }
    generateUv() {
        this.uvBound = true;
        this.bufUv = gl.createBuffer();
    }
    generateColor() {
        this.colBound = true;
        this.bufCol = gl.createBuffer();
    }
    bindIdx() {
        if (this.idxBound) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
        }
        return this.idxBound;
    }
    bindVert() {
        if (this.vertBound) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.bufVert);
        }
        return this.vertBound;
    }
    bindCol() {
        if (this.colBound) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.bufCol);
        }
        return this.colBound;
    }
    bindInstancePos() {
        if (this.instPosBound) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.bufInstancePosition);
        }
        return this.instPosBound;
    }
    bindInstanceRotation() {
        if (this.instRotBound) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.bufInstanceRotation);
        }
        return this.instRotBound;
    }
    bindInstanceScale() {
        if (this.instScaBound) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.bufInstanceScale);
        }
        return this.instScaBound;
    }
    bindNor() {
        if (this.norBound) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNor);
        }
        return this.norBound;
    }
    bindUv() {
        if (this.uvBound) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.bufUv);
        }
        return this.uvBound;
    }
    elemCount() {
        return this.count;
    }
    instanceCount() {
        return this.instances;
    }
    drawMode() {
        if (this.lines) {
            return gl.LINES;
        }
        return gl.TRIANGLES;
    }
    isInstanced() {
        return this.instanced;
    }
}
;
export default Drawable;
//# sourceMappingURL=Drawable.js.map