import { vec2, vec3, vec4, mat4, glMatrix } from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Icosphere from './geometry/Icosphere';
import Square from './geometry/Square';
import DynamicRoof from './geometry/DynamicRoof';
import Cube from './geometry/Cube';
import Line from './geometry/Line';
import NoisePlane from './geometry/NoisePlane';
import MeshInstanced from './geometry/MeshInstanced';
import Sky from './geometry/Sky';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Texture from './rendering/gl/Texture';
import Camera from './Camera';
import { setGL } from './globals';
import { ShaderControls, WaterControls } from './rendering/gl/ShaderControls';
import ShaderProgram, { Shader } from './rendering/gl/ShaderProgram';
import AssetLibrary from './core/utils/AssetLibrary';
import PointLight from './core/lights/PointLight';
import { Torch, BasicTorch, BasicOrbTorch, Torch2, Torch3 } from './particlesystem/Torch';
import { ParticleSystem, ParticleSource, ParticleAttractor, ParticleRepulsor, MeshParticleSystem } from './particlesystem/ParticleSystem';

const DEFAULT_ORIENT:vec4 = vec4.fromValues(0, 0, 0, 1);
const DEFAULT_SCALE:vec3 = vec3.fromValues(1, 1, 1);

var sceneComponents = require('./config/scene_comps.json');
var particleComponents = require('./config/particle_comps.json');
var sceneTorches = require('./config/torches.json');

localStorage.debug = 'mainApp:*:info*,mainApp:*:error*'; // ,mainApp:*:trace*';

var Logger = require('debug');
var logTrace = Logger("mainApp:main:info");
var logError = Logger("mainApp:main:error");

let meshInstances: { [symbol: string]: MeshInstanced; } = { };
let particleInstances: { [symbol: string]: MeshInstanced; } = { };
let activeSystems: { [symbol: string]: ParticleSystem; } = { };

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
let controls = {
  saveImage: saveImage,
  lightDirection: [15, 15, 15]
};

let torchImpl: any = {
  BasicTorch: BasicTorch,
  BasicOrbTorch: BasicOrbTorch,
  Torch2: Torch2,
  Torch3: Torch3
};

let meshSystem:MeshParticleSystem;

function createFlames() {
  let system = new ParticleSystem();
  system.sources.push(new ParticleSource(vec4.fromValues(0, 0 + 0.4, 0, 1)));
  system.attractors.push(new ParticleAttractor(vec4.fromValues(0, 0 + 1.1, 0, 1)));
  system.particleInstances = particleInstances;
  activeSystems['BasicFlame'] = system;

  system = new ParticleSystem();
  system.particleInstances = particleInstances;
  system.sources.push(new ParticleSource(vec4.fromValues(0, 0.4, 0, 1), {spawnDuration: 500, ttl: 400}));
  system.attractors.push(new ParticleAttractor(vec4.fromValues(0, 0 + 1.1, 0, 1)));
  system.repulsors.push(new ParticleRepulsor(vec4.fromValues(0, 0.6, 0, 1)));
  activeSystems['OrbFlame'] = system;
}

const SM_VIEWPORT_TRANSFORM:mat4 = mat4.fromValues(
  0.5, 0.0, 0.0, 0.0,
  0.0, 0.5, 0.0, 0.0,
  0.0, 0.0, 0.5, 0.0,
  0.5, 0.5, 0.5, 1.0);

let prevTime: number;

let FlagIsRenderable: boolean = false;

let boundingLines: Line;
let sky: Sky;
let plane: NoisePlane;

let shaderControls: ShaderControls;

let mainAtlas: Texture;
let envMap: Texture;

let assetLibrary: AssetLibrary;

let mainShader: ShaderProgram; // Instanced
let particleShader: ShaderProgram; // Instanced
let regularShader: ShaderProgram; // Not Instanced

let skyShader: ShaderProgram;
let visualShader: ShaderProgram;
let shadowMapShader: ShaderProgram;

let frameCount: number = 0;

let shouldCapture: boolean = false;

let torches: Array<any>;
let sceneLights: Array<PointLight>;

function createStaticScene() {
  let roomWidth = 10;
  let roomLength = 50;
  let roomHeight = 5;
  let middleWidth = 5; // odd

  for (var i = 0; i < roomLength; i+=0.5) {
    for (var j = 0; j < roomHeight; j+=0.5) {
      meshInstances.StoneWall.addInstance(vec4.fromValues(-roomWidth / 2.0, j + 0.25, -i - 0.5, 1), vec4.fromValues(0, 0.7071068, 0, 0.7071068), vec3.fromValues(0.5, 0.5, 0.5));
      meshInstances.StoneWall.addInstance(vec4.fromValues(roomWidth / 2.0, j + 0.25, -i - 0.5, 1), vec4.fromValues(0, -0.7071068, 0, 0.7071068), vec3.fromValues(0.5, 0.5, 0.5));
    }

    for (var j = -roomWidth / 2.0; j < roomWidth / 2.0; j+= 0.5) {
      if (j < middleWidth / 2 && j > -middleWidth / 2) {
        meshInstances.Floor2.addInstance(vec4.fromValues(j + 0.5, 0, -i - 0.5, 1), vec4.fromValues(-0.7071068, 0, 0, 0.7071068), vec3.fromValues(0.5, 0.5, 0.5));
        continue;
      }
      // -90 X
      meshInstances.Floor1.addInstance(vec4.fromValues(j + 0.5, 0, -i - 0.5, 1), vec4.fromValues(-0.7071068, 0, 0, 0.7071068), vec3.fromValues(0.5, 0.5, 0.5));
    }

    for (var j = -roomWidth / 2.0; j < roomWidth / 2.0; j+=0.5) {
      meshInstances.Roof1.addInstance(vec4.fromValues(j + 0.5, roomHeight, -i - 0.5, 1), vec4.fromValues(0.7071068, 0, 0, 0.7071068), vec3.fromValues(0.5, 0.5, 0.5));
    }
   }

   torches = [];
   sceneLights = new Array<PointLight>();

   for (var itr = 0; itr < sceneTorches.data.length; ++itr) {
     let torchData = sceneTorches.data[itr];
     let constructor = torchImpl[torchData["impl"]];
     let opts = torchData["options"] || {};

     opts.meshInstances = meshInstances;

     let pos = vec4.fromValues(torchData.position[0], torchData.position[1], torchData.position[2], 1);
     let orient = vec4.fromValues(torchData.orient[0], torchData.orient[1], torchData.orient[2], torchData.orient[3]);
     let torch = new constructor(pos, orient, activeSystems, opts);

     meshInstances[torchData.instance].addInstance(pos, orient, vec3.fromValues(1,1,1));

     for (var j = 0; j < torch.lights.length; ++j) {
       sceneLights.push(torch.lights[j]);
     }

     torches.push(torch);
   }
}

let meshSourceOpts:any = {
    ttl: 3000,
    spawnDuration: 4000
  };

function initMeshParticleSystem(meshInstance: MeshInstanced) {

  meshSystem = new MeshParticleSystem();

  let instancePos = vec4.fromValues(0.5, 2, -7, 1);

  // meshInstance.addInstance(instancePos, DEFAULT_ORIENT, DEFAULT_SCALE);

  let position = vec4.fromValues(0, 0, -7, 0);

  meshSystem.particleInstances = particleInstances;

  meshSystem.sources.push(new ParticleSource(vec4.fromValues(position[0] + 2, position[1], position[2], 1), meshSourceOpts));
  meshSystem.sources.push(new ParticleSource(vec4.fromValues(position[0] - 2, position[1], position[2], 1), meshSourceOpts));
  meshSystem.sources.push(new ParticleSource(vec4.fromValues(position[0], position[1], position[2] + 2, 1), meshSourceOpts));
  meshSystem.sources.push(new ParticleSource(vec4.fromValues(position[0], position[1], position[2] - 2, 1), meshSourceOpts));

  let vertices = meshInstance.rawMesh.vertices;
  let vertexCount = vertices.length;

  for (var itr = 0; itr < vertexCount; itr+= 3) {
    let vertPos = vec4.fromValues(vertices[itr] * meshInstance.baseScale[0],
        vertices[itr + 1] * meshInstance.baseScale[1],
        vertices[itr + 2] * meshInstance.baseScale[2],
        0.0);

    vec4.add(vertPos, instancePos, vertPos);

    meshSystem.attractors.push(new ParticleAttractor(vertPos));
  }

  // meshSystem.create();
}

/**
 * @brief      Loads the geometry assets
 */
function loadAssets(callback?: any) {
  FlagIsRenderable = false;
  if (boundingLines) {
    boundingLines.destory();
  }

  if (plane) {
    plane.destory();
  }

  if (sky) {
    sky.destory();
  }

  // plane = new NoisePlane(2000, 2000, 2, 2, 8123);
  // plane.create();

  boundingLines = new Line();
  mainAtlas = new Texture('./psd/texture_atlas.png');
  envMap = new Texture('./psd/env.png');

  // Enable for Debug
  boundingLines.linesArray.push(vec4.fromValues(0, 0, 0, 1.0));
  boundingLines.linesArray.push(vec4.fromValues(30, 0, 0, 1.0));
  boundingLines.linesArray.push(vec4.fromValues(0, 0, 0, 1.0));
  boundingLines.linesArray.push(vec4.fromValues(0, 0, 30, 1.0));
  boundingLines.linesArray.push(vec4.fromValues(0, 0, 0, 1.0));
  boundingLines.linesArray.push(vec4.fromValues(0, 30, 0, 1.0));

  sky = new Sky(vec3.fromValues(0, 0, 0));
  sky.create();

  assetLibrary  = new AssetLibrary();
  (<any>window).AssetLibrary = assetLibrary;

  let assets: any = {};
  let particleAssets: any = {};

  for (let itr = 0; itr < sceneComponents.components.length; ++itr) {
    let comp = sceneComponents.components[itr];
    assets[comp.name] = comp.url;
  }

  for (let itr = 0; itr < particleComponents.components.length; ++itr) {
    let comp = particleComponents.components[itr];
    particleAssets[comp.name] = comp.url;
  }

  assetLibrary.load(assets)
    .then(function() {
      return assetLibrary.load(particleAssets);
    })
    .then(function() {
      logTrace('Loaded Asssets', assetLibrary);

      let uvScale = sceneComponents.uvScale;

      for (let itr = 0; itr < sceneComponents.components.length; ++itr) {
        let comp = sceneComponents.components[itr];
        meshInstances[comp.name] = new MeshInstanced(comp.name);
        meshInstances[comp.name].rawMesh = assetLibrary.meshes[comp.name];

        if (comp.uvOffset) {
          meshInstances[comp.name].uvOffset = vec2.fromValues(comp.uvOffset[0] * uvScale, comp.uvOffset[1] * uvScale);
        }

        if (comp.baseScale) {
          meshInstances[comp.name].baseScale = vec3.fromValues(comp.baseScale[0], comp.baseScale[1], comp.baseScale[2]);
        }

        meshInstances[comp.name].uvScale = uvScale;
      }

      for (let itr = 0; itr < particleComponents.components.length; ++itr) {
        let comp = particleComponents.components[itr];
        particleInstances[comp.name] = new MeshInstanced(comp.name);
        particleInstances[comp.name].rawMesh = assetLibrary.meshes[comp.name];
        particleInstances[comp.name].baseScale = vec3.fromValues(comp.baseScale[0], comp.baseScale[1], comp.baseScale[2]);
      }

      createFlames();
      initMeshParticleSystem(meshInstances.TargetMesh1);
      createStaticScene();
      // meshInstances["Wahoo"].addInstance(vec4.fromValues(0,5.0,0,1), vec4.fromValues(0,0,0,1), vec3.fromValues(1,1,1));

      logTrace('Loaded MeshInstances are:', meshInstances);

      for(let key in meshInstances) {
        meshInstances[key].create();
      }

      for(let key in particleInstances) {
        particleInstances[key].create();
      }

      boundingLines.create();

      FlagIsRenderable = true;

      if (callback) {
        callback();
      }
    })
    .catch(function(err) {
      logError('Asset Library Loading Error', err);
    });
}

function saveImage() {
  shouldCapture = true;
}

function downloadImage() {
  // Dump the canvas contents to a file.
  var canvas = <HTMLCanvasElement>document.getElementById("canvas");
  canvas.toBlob(function(blob) {
    var link = document.createElement("a");
    link.download = "image.png";

    link.href = URL.createObjectURL(blob);
    console.log(blob);

    link.click();

  }, 'image/png');
}

function constructGUI() {
  // Add controls to the gui
  const gui = new DAT.GUI();
  gui.add(controls, 'saveImage').name('Save Image');
}

function lookAtMat4(out: any, eye: any, center: any, up: any) {
  let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
  let eyex = eye[0];
  let eyey = eye[1];
  let eyez = eye[2];
  let upx = up[0];
  let upy = up[1];
  let upz = up[2];
  let centerx = center[0];
  let centery = center[1];
  let centerz = center[2];

  if (Math.abs(eyex - centerx) < glMatrix.EPSILON &&
      Math.abs(eyey - centery) < glMatrix.EPSILON &&
      Math.abs(eyez - centerz) < glMatrix.EPSILON) {
    return mat4.identity(out);
  }

  z0 = eyex - centerx;
  z1 = eyey - centery;
  z2 = eyez - centerz;

  len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
  z0 *= len;
  z1 *= len;
  z2 *= len;

  x0 = upy * z2 - upz * z1;
  x1 = upz * z0 - upx * z2;
  x2 = upx * z1 - upy * z0;
  len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
  if (!len) {
    x0 = 0;
    x1 = 0;
    x2 = 0;
  } else {
    len = 1 / len;
    x0 *= len;
    x1 *= len;
    x2 *= len;
  }

  y0 = z1 * x2 - z2 * x1;
  y1 = z2 * x0 - z0 * x2;
  y2 = z0 * x1 - z1 * x0;

  len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
  if (!len) {
    y0 = 0;
    y1 = 0;
    y2 = 0;
  } else {
    len = 1 / len;
    y0 *= len;
    y1 *= len;
    y2 *= len;
  }

  out[0] = x0;
  out[1] = y0;
  out[2] = z0;
  out[3] = 0;
  out[4] = x1;
  out[5] = y1;
  out[6] = z1;
  out[7] = 0;
  out[8] = x2;
  out[9] = y2;
  out[10] = z2;
  out[11] = 0;
  out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
  out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
  out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
  out[15] = 1;

  return out;
}

function setShadowMapData(shader: ShaderProgram) {
  let lightDir = controls.lightDirection;
  let lightDirection =  vec3.fromValues(lightDir[0], lightDir[1], lightDir[2]);

  let lightSpaceOrthoProj = mat4.create();
  mat4.ortho(lightSpaceOrthoProj, -8.0, 8.0, -8.0, 8.0, 0.0, 100.0);


  let lightSpaceView = mat4.create();
  lookAtMat4(lightSpaceView, lightDirection, vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));
  let lightSpaceModel = mat4.create();
  let lightSpaceViewProj = mat4.create();

  mat4.multiply(lightSpaceViewProj, lightSpaceView, lightSpaceModel);
  mat4.multiply(lightSpaceViewProj, lightSpaceOrthoProj, lightSpaceViewProj);

  // Convert Model Space -> Light Space Matrix (outputs NDC) to output texCoords between 0 & 1
  let lightSpaceToViewport = mat4.create();
  mat4.multiply(lightSpaceToViewport, SM_VIEWPORT_TRANSFORM, lightSpaceViewProj);

  shader.setShadowMapMatrices(lightSpaceViewProj, lightSpaceToViewport);
}

function createFrameBuffer(gl: WebGL2RenderingContext, frameRefs: any) {

    // Creating a Framebuffer
    let frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

    // Creating a texture that is outputed to by the frame buffer
    let frameTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, frameTexture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, window.innerWidth, window.innerHeight, 0, gl.RGB, gl.UNSIGNED_BYTE, 0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, frameTexture, 0);

    // Creating a depth buffer
    let depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.FRAMEBUFFER, depthBuffer);

    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT, window.innerWidth, window.innerHeight);

    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer)


    let drawBuffers = [gl.COLOR_ATTACHMENT0];
    gl.drawBuffers(drawBuffers);

    // Adding a safe Check log
    let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if(status != gl.FRAMEBUFFER_COMPLETE) {
        console.error("Error while creating framebuffer");
    }

    frameRefs.frameBuffer = frameBuffer;
    frameRefs.depthBuffer = depthBuffer;
    frameRefs.frameTexture = frameTexture;
}

function createShadowMapFrameBuffer(gl: WebGL2RenderingContext, frameRefs: any) {

    // Creating a Framebuffer
    let frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

    // Creating a texture that is outputed to by the frame buffer
    let frameTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, frameTexture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, window.innerWidth, window.innerHeight, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, frameTexture, 0);

    // Creating a depth buffer
    let depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);

    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, window.innerWidth, window.innerHeight);

    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer)


    // Adding a safe Check log
    let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if(status != gl.FRAMEBUFFER_COMPLETE) {
        console.error("Error while creating framebuffer");
    }

    frameRefs.frameBuffer = frameBuffer;
    frameRefs.depthBuffer = depthBuffer;
    frameRefs.frameTexture = frameTexture;
}


// https://stackoverflow.com/questions/42309715/how-to-correctly-pass-mouse-coordinates-to-webgl
function getRelativeMousePosition(event: any, target: any) {
  target = target || event.target;
  var rect = target.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

// assumes target or event.target is canvas
function getNoPaddingNoBorderCanvasRelativeMousePosition(event: any, target: any) {
  target = target || event.target;
  var pos = getRelativeMousePosition(event, target);

  pos.x = pos.x * target.width  / target.clientWidth;
  pos.y = pos.y * target.height / target.clientHeight;

  return pos;  
}

let camera: Camera;

let clipSpaceCoord: any;

window.addEventListener('mousemove', e =>{
  const canvas = <HTMLCanvasElement>document.getElementById('canvas');
  const pos = getNoPaddingNoBorderCanvasRelativeMousePosition(e, canvas);

  // pos is in pixel coordinates for the canvas.
  // so convert to WebGL clip space coordinates
  const x = pos.x / canvas.width  *  2 - 1;
  const y = pos.y / canvas.height * -2 + 1;

  clipSpaceCoord = {};
  clipSpaceCoord.x = x;
  clipSpaceCoord.y = y;
});

window.addEventListener('keydown', e => {
  let isAttractor = e.key.toUpperCase() == 'A';
  let isRepulsor = e.key.toUpperCase() == 'S';
  let isSource = e.key.toUpperCase() == 'D';

  if (!isAttractor && !isRepulsor && !isSource) {
    return;
  }

  console.log(clipSpaceCoord);

  let ndcX = clipSpaceCoord.x;
  let ndcY = clipSpaceCoord.y;

  let ndc = vec4.fromValues(ndcX, ndcY, 1.0, 1.0);

  let invCamera = camera.getInvViewProj();

  vec4.scale(ndc, ndc, camera.far);

  let worldPoint = vec4.create();
  vec4.transformMat4(worldPoint, ndc, invCamera);

  let rayOrigin = camera.getPosition();
  let rayDir = vec4.create();
  vec4.sub(rayDir, worldPoint, vec4.fromValues(rayOrigin[0], rayOrigin[1], rayOrigin[2], 1));

  let rayDirection = vec3.fromValues(rayDir[0], rayDir[1], rayDir[2]);
  vec3.normalize(rayDirection, rayDirection);

  let t = 10;

  vec3.scale(rayDirection, rayDirection, t);
  let finalPosition = vec3.create();
  vec3.add(finalPosition, rayOrigin, rayDirection);

  console.log('World: ', finalPosition);

  if (isSource) {
    meshSystem.sources.push(new ParticleSource(vec4.fromValues(finalPosition[0], finalPosition[1], finalPosition[2], 1), meshSourceOpts));
  }
  else if (isAttractor) {
    let finalVec4 = vec4.fromValues(finalPosition[0], finalPosition[1], finalPosition[2], 1);
    for (var idx = 0; idx < meshSystem.states.length; ++idx) {
      let state = meshSystem.states[idx];

      let distVec = vec4.create();
      vec4.sub(distVec, finalVec4, state.position);

      if (vec4.length(distVec) < 2) {
        let speed = 10;
        let distVec3 = vec3.fromValues(distVec[0], distVec[1], distVec[2]);
        vec3.normalize(distVec3, distVec3);
        vec3.scale(distVec3, distVec3, speed);

        state.velocity = vec4.fromValues(distVec3[0], distVec3[1], distVec3[2], 0);
      }
    }
  }
  else if (isRepulsor) {
    let finalVec4 = vec4.fromValues(finalPosition[0], finalPosition[1], finalPosition[2], 1);
    for (var idx = 0; idx < meshSystem.states.length; ++idx) {
      let state = meshSystem.states[idx];

      let distVec = vec4.create();
      vec4.sub(distVec, state.position, finalVec4);

      if (vec4.length(distVec) < 2) {
        let speed = 10;
        let distVec3 = vec3.fromValues(distVec[0], distVec[1], distVec[2]);
        vec3.normalize(distVec3, distVec3);
        vec3.scale(distVec3, distVec3, speed);

        state.velocity = vec4.fromValues(distVec3[0], distVec3[1], distVec3[2], 0);
      }
    }
  }
});

/**
 * @brief      Main execution code
 *
 * @memberof   Main
 */
function main() {
  shaderControls = new ShaderControls();

  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  constructGUI();

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement>document.getElementById('canvas');
  const gl = <WebGL2RenderingContext>canvas.getContext('webgl2');
 
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene

  camera = new Camera(vec3.fromValues(0.5, 10, -25), vec3.fromValues(0.5, 3, -10));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.0, 0.0, 0.0, 1);
  gl.enable(gl.DEPTH_TEST);

  mainShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/custom-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/custom-frag.glsl')),
  ]);

  particleShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/particle-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/particle-frag.glsl')),
  ]);

  regularShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/regular-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/regular-frag.glsl')),
  ]);

  visualShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/visual-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/visual-frag.glsl')),
  ]);

  skyShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/sky-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/sky-frag.glsl')),
  ]);

  shadowMapShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/sm-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/sm-frag.glsl')),
  ]);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  let shadowMapBuffer:any = {};

  createShadowMapFrameBuffer(gl, shadowMapBuffer);

  function renderScene (instanceShader: ShaderProgram, particleShader: ShaderProgram, regularShader: ShaderProgram, deltaTime:number) {
    // renderer.render(camera, regularShader, [plane]);
    for (let key in meshInstances) {
      let mesh = meshInstances[key];
      renderer.render(camera, instanceShader, [mesh]);
    }

    for (var key in particleInstances) {
      let instance = particleInstances[key];
      instance.clearInstanceBuffers();
    }

    for(var key in activeSystems) {
      activeSystems[key].update(deltaTime, {});
    }

    for (var itr = 0; itr < torches.length; ++itr) {
      let torch = torches[itr];
      torch.render({});
    }

    meshSystem.update(deltaTime, {});
    meshSystem.render({});

    // particleInstances.Particle1.addInstance(vec4.fromValues(0,3,-7, 1), vec4.fromValues(0,0,0,1), vec3.fromValues(1,1,1), vec4.fromValues(1,0,0,1));

    for(let key in particleInstances) {
      particleInstances[key].createInstanceBuffers();
    }

    for (let key in particleInstances) {
      let mesh = particleInstances[key];
      renderer.render(camera, particleShader, [mesh]);
    }
  }

  // This function will be called every frame
  function tick() {
    if (!FlagIsRenderable) {
      requestAnimationFrame(tick);
      return;
    }

    let deltaTime = Date.now() - prevTime;

    let rotDelta = mat4.create();

    let lightDir = controls.lightDirection;
    let lightDirection =  vec3.fromValues(lightDir[0], lightDir[1], lightDir[2]);

    camera.update();
    let position = camera.getPosition();
    stats.begin();

    /*----------  Render Shadow Map into Buffer  ----------*/
    // gl.bindFramebuffer(gl.FRAMEBUFFER, shadowMapBuffer.frameBuffer);
    // gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    // renderer.clear();

    // shadowMapShader.setEyePosition(vec4.fromValues(position[0], position[1], position[2], 1));
    // setShadowMapData(shadowMapShader);
    // renderScene(shadowMapShader, shadowMapShader);

    /*----------  Render Scene  ----------*/
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();

    // gl.disable(gl.DEPTH_TEST);

    // skyShader.setTime(frameCount);
    // skyShader.setEyePosition(vec4.fromValues(position[0], position[1], position[2], 1));
    // renderer.render(camera, skyShader, [sky]);

    // gl.enable(gl.DEPTH_TEST);

    mainShader.setTime(frameCount);
    mainShader.setEyePosition(vec4.fromValues(position[0], position[1], position[2], 1));

    particleShader.setTime(frameCount);
    particleShader.setEyePosition(vec4.fromValues(position[0], position[1], position[2], 1));
    
    visualShader.setTime(frameCount);
    visualShader.setEyePosition(vec4.fromValues(position[0], position[1], position[2], 1));
    
    regularShader.setEyePosition(vec4.fromValues(position[0], position[1], position[2], 1));

    mainShader.setLightPosition(vec3.fromValues(lightDirection[0], lightDirection[1], lightDirection[2]));
    regularShader.setLightPosition(vec3.fromValues(lightDirection[0], lightDirection[1], lightDirection[2]));
    particleShader.setLightPosition(vec3.fromValues(lightDirection[0], lightDirection[1], lightDirection[2]));

    mainShader.setPointLights(sceneLights); 

    // mainShader.setShadowTexture(1);
    // regularShader.setShadowTexture(1);
    // gl.activeTexture(gl.TEXTURE1);
    // gl.bindTexture(gl.TEXTURE_2D, shadowMapBuffer.frameTexture);

    mainShader.setTexture(0);
    mainShader.setTexture(1);
    particleShader.setTexture(0);
    particleShader.setTexture(1);
    regularShader.setTexture(0);
    regularShader.setTexture(1);
    mainAtlas.bind(0);
    envMap.bind(1);

    renderScene(mainShader, particleShader, regularShader, deltaTime);

    frameCount++;

    stats.end();

    if (shouldCapture) {
      downloadImage();
      shouldCapture = false;
    }

    prevTime = Date.now();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  prevTime = (new Date()).getTime();

  loadAssets(tick);
}

main();
