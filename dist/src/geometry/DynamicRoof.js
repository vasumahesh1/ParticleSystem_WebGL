import Drawable from '../rendering/gl/Drawable';
import { gl } from '../globals';
var Logger = require('debug');
var logTrace = Logger("mainApp:MeshDynamicRoof:info");
var logError = Logger("mainApp:MeshDynamicRoof:error");
function concatFloat32Array(first, second) {
    var firstLength = first.length;
    var secondLength = second.length;
    var result = new Float32Array(firstLength + secondLength);
    result.set(first);
    result.set(second, firstLength);
    return result;
}
function concatUint32Array(first, second) {
    var firstLength = first.length;
    var secondLength = second.length;
    var result = new Uint32Array(firstLength + secondLength);
    result.set(first);
    result.set(second, firstLength);
    return result;
}
class DynamicRoof extends Drawable {
    constructor() {
        super();
        this.instanced = false;
        this.points = new Array();
        this.index = new Array();
        this.cols = new Array();
        this.nors = new Array();
        this.indexCounter = 0;
    }
    addTriangle(p1, p2, p3) {
        this.points.push(p1[0], p1[1], p1[2], p1[3]);
        this.points.push(p2[0], p2[1], p2[2], p2[3]);
        this.points.push(p3[0], p3[1], p3[2], p3[3]);
        this.nors.push(0, 1, 0, 0);
        this.nors.push(0, 1, 0, 0);
        this.nors.push(0, 1, 0, 0);
        this.cols.push(0.752, 0.752, 0.764, 1);
        this.cols.push(0.752, 0.752, 0.764, 1);
        this.cols.push(0.752, 0.752, 0.764, 1);
        this.cols.push(0.752, 0.752, 0.764, 1);
        this.index.push(this.indexCounter);
        this.index.push(this.indexCounter + 1);
        this.index.push(this.indexCounter + 2);
        this.indexCounter += 3;
    }
    create() {
        this.vertices = new Float32Array(this.points);
        this.indices = new Uint32Array(this.index);
        this.normals = new Float32Array(this.nors);
        this.colors = new Float32Array(this.cols);
        this.generateIdx();
        this.generateVert();
        this.generateNor();
        this.generateColor();
        this.count = this.indices.length;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNor);
        gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufVert);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufCol);
        gl.bufferData(gl.ARRAY_BUFFER, this.colors, gl.STATIC_DRAW);
        logTrace(`Loaded DynamicRoof with ${this.indices.length} Indices`);
    }
}
;
export default DynamicRoof;
//# sourceMappingURL=DynamicRoof.js.map