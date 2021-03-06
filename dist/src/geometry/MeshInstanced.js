import { vec2, vec3, vec4 } from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import Material from '../core/material/Material';
import { gl } from '../globals';
var Loader = require('webgl-obj-loader');
var Logger = require('debug');
var dCreate = Logger("mainApp:meshInstanced:trace");
var dCreateInfo = Logger("mainApp:meshInstanced:info");
let CHUNK_SIZE = 200;
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
function degreeToRad(deg) {
    return deg * 0.0174533;
}
class MeshInstanced extends Drawable {
    constructor(n = "Unknown Mesh") {
        super();
        this.instanced = true;
        this.name = n;
        this.uvScale = 1;
        this.material = new Material();
        this.instances = 0;
        this.baseColor = vec4.fromValues(1, 1, 1, 1);
        this.baseScale = vec3.fromValues(1, 1, 1);
        this.uvOffset = vec2.fromValues(-1, -1);
        this.instancePosition = new Array();
        this.instanceScale = new Array();
        this.instanceRotation = new Array();
        this.instanceColor = new Array();
        this.positions = new Float32Array([]);
        this.scales = new Float32Array([]);
        this.rotations = new Float32Array([]);
        this.normals = new Float32Array([]);
        this.vertices = new Float32Array([]);
        this.colors = new Float32Array([]);
        this.uvs = new Float32Array([]);
        this.indices = new Uint32Array([]);
    }
    clearInstanceBuffers() {
        this.instancePosition = new Array();
        this.instanceScale = new Array();
        this.instanceRotation = new Array();
        this.instanceColor = new Array();
        this.instances = 0;
        gl.deleteBuffer(this.bufInstancePosition);
        gl.deleteBuffer(this.bufInstanceRotation);
        gl.deleteBuffer(this.bufInstanceScale);
        gl.deleteBuffer(this.bufInstanceColor);
    }
    createInstanceBuffers() {
        this.positions = new Float32Array(this.instancePosition);
        this.rotations = new Float32Array(this.instanceRotation);
        this.scales = new Float32Array(this.instanceScale);
        this.colors = new Float32Array(this.instanceColor);
        this.generateInstancePos();
        this.generateInstanceRotation();
        this.generateInstanceScale();
        this.generateInstanceColor();
        this.count = this.indices.length;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufInstancePosition);
        gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufInstanceRotation);
        gl.bufferData(gl.ARRAY_BUFFER, this.rotations, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufInstanceScale);
        gl.bufferData(gl.ARRAY_BUFFER, this.scales, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufInstanceColor);
        gl.bufferData(gl.ARRAY_BUFFER, this.colors, gl.STATIC_DRAW);
    }
    load(url) {
        let ref = this;
        return new Promise(function (resolve, reject) {
            Loader.downloadMeshes({ mesh: url }, function (meshes) {
                ref.rawMesh = meshes.mesh;
                resolve();
            });
        });
    }
    setColor(color) {
        this.baseColor = color;
    }
    addInstance(position, orient, scale, color = vec4.fromValues(1, 1, 1, 1)) {
        this.instancePosition.push(position[0], position[1], position[2], position[3]);
        this.instanceScale.push(scale[0], scale[1], scale[2], 0.0);
        this.instanceRotation.push(orient[0], orient[1], orient[2], orient[3]);
        this.instanceColor.push(color[0], color[1], color[2], color[3]);
        this.instances++;
    }
    create() {
        this.vertices = new Float32Array([]);
        this.colors = new Float32Array([]);
        this.indices = new Uint32Array([]);
        this.normals = new Float32Array([]);
        let vertices = this.rawMesh.vertices;
        let indices = this.rawMesh.indices;
        let vertexNormals = this.rawMesh.vertexNormals;
        let vertexUvs = this.rawMesh.textures;
        let vertexCount = vertices.length;
        dCreate("Loading Vertices: " + vertexCount);
        dCreate("Loading Indices: " + indices.length);
        dCreate("Loading Normals: " + vertexNormals.length);
        dCreate("Loading This: ", this);
        let colorArr = new Float32Array([
            this.baseColor[0],
            this.baseColor[1],
            this.baseColor[2],
            1.0
        ]);
        let uvCounter = 0;
        for (var itr = 0; itr < vertexCount; itr += 3) {
            let arr = new Float32Array([
                vertices[itr] * this.baseScale[0],
                vertices[itr + 1] * this.baseScale[1],
                vertices[itr + 2] * this.baseScale[2],
                1.0
            ]);
            let arrN = new Float32Array([
                vertexNormals[itr],
                vertexNormals[itr + 1],
                vertexNormals[itr + 2],
                1.0
            ]);
            let arrUV = new Float32Array([
                this.uvOffset[0] + vertexUvs[uvCounter] * this.uvScale,
                this.uvOffset[1] + vertexUvs[uvCounter + 1] * this.uvScale
            ]);
            uvCounter += 2;
            this.vertices = concatFloat32Array(this.vertices, arr);
            this.normals = concatFloat32Array(this.normals, arrN);
            // this.colors = concatFloat32Array(this.colors, colorArr);
            this.uvs = concatFloat32Array(this.uvs, arrUV);
        }
        this.positions = new Float32Array(this.instancePosition);
        this.rotations = new Float32Array(this.instanceRotation);
        this.scales = new Float32Array(this.instanceScale);
        this.colors = new Float32Array(this.instanceColor);
        this.indices = new Uint32Array(indices);
        this.generateIdx();
        this.generateVert();
        this.generateNor();
        this.generateUv();
        // this.generateColor();
        this.generateInstancePos();
        this.generateInstanceRotation();
        this.generateInstanceScale();
        this.generateInstanceColor();
        this.count = this.indices.length;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNor);
        gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufInstancePosition);
        gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufInstanceRotation);
        gl.bufferData(gl.ARRAY_BUFFER, this.rotations, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufInstanceScale);
        gl.bufferData(gl.ARRAY_BUFFER, this.scales, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufInstanceColor);
        gl.bufferData(gl.ARRAY_BUFFER, this.colors, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufVert);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufUv);
        gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);
        dCreateInfo(`Created ${this.name} with ${this.instances} Instances`);
    }
}
;
export default MeshInstanced;
//# sourceMappingURL=MeshInstanced.js.map