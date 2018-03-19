import { vec4, mat4, vec2, vec3 } from 'gl-matrix';
import Drawable from './Drawable';
import { gl } from '../../globals';
import { ShaderControls, WaterControls } from './ShaderControls';
import PointLight from '../../core/lights/PointLight';

var activeProgram: WebGLProgram = null;

function concatFloat32Array(first: Float32Array, second: Float32Array) {
  var firstLength = first.length;
  var secondLength = second.length
  var result = new Float32Array(firstLength + secondLength);

  result.set(first);
  result.set(second, firstLength);

  return result;
}


export class Shader {
  shader: WebGLShader;

  constructor(type: number, source: string) {
    this.shader = gl.createShader(type);
    gl.shaderSource(this.shader, source);
    gl.compileShader(this.shader);

    if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS)) {
      throw gl.getShaderInfoLog(this.shader);
    }
  }
};

const MAX_POINT_LIGHTS: number = 50;

class ShaderProgram {
  prog: WebGLProgram;

  attrVertPos: number;
  attrNor: number;
  attrUv: number;
  attrCol: number;
  attrInstancePos: number;
  attrInstanceScale: number;
  attrInstanceRotation: number;
  attrInstanceColor: number;

  unifModel: WebGLUniformLocation;
  unifModelInvTr: WebGLUniformLocation;
  unifViewProj: WebGLUniformLocation;
  unifColor: WebGLUniformLocation;
  unifEye: WebGLUniformLocation;
  unifTime: WebGLUniformLocation;
  unifTexture: WebGLUniformLocation;
  unifTexture1: WebGLUniformLocation;
  unifTexture2: WebGLUniformLocation;
  unifTexture3: WebGLUniformLocation;
  unifDimensions: WebGLUniformLocation;
  unifInvViewProj: WebGLUniformLocation;
  unifInstanceModel: WebGLUniformLocation;
  unifInstanceModelInvTranspose: WebGLUniformLocation;
  unifSMLightSpace: WebGLUniformLocation;
  unifSMLightViewport: WebGLUniformLocation;
  unifShadowTexture: WebGLUniformLocation;
  unifLightPos: WebGLUniformLocation;
  unifNumPointLights: WebGLUniformLocation;

  unifControlsWaterOpacity: WebGLUniformLocation;
  unifControlsWaterColor: WebGLUniformLocation;
  unifControlsWaterLevel: WebGLUniformLocation;

  unifControlsWaterBedrock1Color: WebGLUniformLocation;
  unifControlsWaterBedrock2Color: WebGLUniformLocation;
  unifControlsShoreLevel: WebGLUniformLocation;
  unifControlsSandColor: WebGLUniformLocation;
  unifControlsElevation: WebGLUniformLocation;
  unifControlsNoiseScale: WebGLUniformLocation;
  unifGlobalTransform: WebGLUniformLocation;

  unifPointLights: Array<any>;

  constructor(shaders: Array<Shader>) {
    this.prog = gl.createProgram();

    for (let shader of shaders) {
      gl.attachShader(this.prog, shader.shader);
    }
    gl.linkProgram(this.prog);
    if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
      throw gl.getProgramInfoLog(this.prog);
    }

    this.attrVertPos = gl.getAttribLocation(this.prog, "vs_Pos");
    this.attrNor = gl.getAttribLocation(this.prog, "vs_Nor");
    this.attrCol = gl.getAttribLocation(this.prog, "vs_Col");
    this.attrUv = gl.getAttribLocation(this.prog, "vs_UV");
    this.attrInstancePos = gl.getAttribLocation(this.prog, "vs_InstPos");
    this.attrInstanceScale = gl.getAttribLocation(this.prog, "vs_InstScale");
    this.attrInstanceRotation = gl.getAttribLocation(this.prog, "vs_InstRotation");
    this.attrInstanceColor = gl.getAttribLocation(this.prog, "vs_InstColor");
    this.unifModel = gl.getUniformLocation(this.prog, "u_Model");
    this.unifModelInvTr = gl.getUniformLocation(this.prog, "u_ModelInvTr");
    this.unifViewProj = gl.getUniformLocation(this.prog, "u_ViewProj");
    this.unifInvViewProj = gl.getUniformLocation(this.prog, "u_InvViewProj");
    this.unifColor = gl.getUniformLocation(this.prog, "u_Color");
    this.unifEye = gl.getUniformLocation(this.prog, "u_Eye");
    this.unifTime = gl.getUniformLocation(this.prog, "u_Time");
    this.unifTexture = gl.getUniformLocation(this.prog, "u_Texture");
    this.unifTexture1 = gl.getUniformLocation(this.prog, "u_Texture1");
    this.unifTexture2 = gl.getUniformLocation(this.prog, "u_Texture2");
    this.unifTexture3 = gl.getUniformLocation(this.prog, "u_Texture3");
    this.unifDimensions = gl.getUniformLocation(this.prog, "u_Dimensions");
    this.unifInstanceModel = gl.getUniformLocation(this.prog, "u_InstanceModel");
    this.unifInstanceModelInvTranspose = gl.getUniformLocation(this.prog, "u_InstanceModelInvTranspose");
    this.unifLightPos = gl.getUniformLocation(this.prog, "u_LightPos");
    

    this.unifSMLightSpace = gl.getUniformLocation(this.prog, "u_LightSpaceMatrix");
    this.unifSMLightViewport = gl.getUniformLocation(this.prog, "u_LightViewportMatrix");
    this.unifShadowTexture = gl.getUniformLocation(this.prog, "u_ShadowTexture");
    this.unifGlobalTransform = gl.getUniformLocation(this.prog, "u_GlobalTransform");


    this.unifNumPointLights = gl.getUniformLocation(this.prog, "u_NumPointLights");
    this.unifPointLights = new Array<any>();

    PointLight.markLocations(this.prog, this.unifPointLights, MAX_POINT_LIGHTS, "u_PointLights");
  }

  use() {
    if (activeProgram !== this.prog) {
      gl.useProgram(this.prog);
      activeProgram = this.prog;
    }
  }

  /**
   * @brief      Sets the model matrix.
   *
   * @memberof   ShaderProgram
   *
   * @param      model  The model matrix
   *
   */
  setModelMatrix(model: mat4) {
    this.use();
    if (this.unifModel !== -1) {
      gl.uniformMatrix4fv(this.unifModel, false, model);
    }

    if (this.unifModelInvTr !== -1) {
      let modelinvtr: mat4 = mat4.create();
      mat4.transpose(modelinvtr, model);
      mat4.invert(modelinvtr, modelinvtr);
      gl.uniformMatrix4fv(this.unifModelInvTr, false, modelinvtr);
    }
  }

  /**
   * @brief      Sets the view projection matrix.
   *
   * @memberof   ShaderProgram
   *
   * @param      vp    view projection matrix
   *
   */
  setViewProjMatrix(vp: mat4) {
    this.use();
    if (this.unifViewProj !== -1) {
      gl.uniformMatrix4fv(this.unifViewProj, false, vp);
    }
  }

  /**
   * @brief      Sets the inverse view projection matrix.
   *
   * @memberof   ShaderProgram
   *
   * @param      ivp    view projection matrix
   *
   */
  setInvViewProjMatrix(ivp: mat4) {
    this.use();
    if (this.unifInvViewProj !== -1) {
      gl.uniformMatrix4fv(this.unifInvViewProj, false, ivp);
    }
  }


  setInstanceModelMatrices(mats: Array<mat4>) {
    if (!mats || mats.length == 0) {
      return;
    }

    this.use();

    let data = new Float32Array([]);
    let invertData = new Float32Array([]);

    for (var idx = 0; idx < mats.length; ++idx) {
      data = concatFloat32Array(data, mats[idx]);
    }

    if (this.unifInstanceModel !== -1) {
      gl.uniformMatrix4fv(this.unifInstanceModel, false, data);
    }


    // if (this.unifInstanceModelInvTranspose !== -1) {
    //   for (var idx = 0; idx < mats.length; ++idx) {
    //     let modelinvtr: mat4 = mat4.create();
    //     mat4.transpose(modelinvtr, mats[idx]);
    //     mat4.invert(modelinvtr, modelinvtr);

    //     invertData = concatFloat32Array(invertData, modelinvtr);
    //   }

    //   gl.uniformMatrix4fv(this.unifInstanceModelInvTranspose, false, invertData);
    // }
  }

  setPointLights(lights: Array<PointLight>) {
    this.use();

    if (this.unifNumPointLights !== -1) {
      gl.uniform1ui(this.unifNumPointLights, lights.length);

      for (var itr = 0; itr < lights.length; ++itr) {
        let light = lights[itr];
        light.setPointLightData(this.unifPointLights[itr]);
      }
    }
  }

  /**
   * @brief      Sets the inverse view projection matrix.
   *
   * @memberof   ShaderProgram
   *
   * @param      ivp    view projection matrix
   *
   */
  setScreenDimensions(dimensions: vec2) {
    this.use();
    if (this.unifDimensions !== -1) {
      gl.uniform2i(this.unifDimensions, dimensions[0], dimensions[1]);
    }
  }

  /**
   * @brief      Sets the uniform geometry color.
   *
   * @memberof   ShaderProgram
   *
   * @param      color  The color
   *
   */
  setGeometryColor(color: vec4) {
    this.use();
    if (this.unifColor !== -1) {
      gl.uniform4fv(this.unifColor, color);
    }
  }

  /**
   * @brief      Sets the camera eye position.
   *
   * @memberof   ShaderProgram
   *
   * @param      pos   The position
   *
   */
  setEyePosition(pos: vec4) {
    this.use();
    if (this.unifEye !== -1) {
      gl.uniform4fv(this.unifEye, pos);
    }
  }

  /**
   * @brief      Sets the time (actually frame counter).
   *
   * @memberof   ShaderProgram
   *
   * @param      time  The time
   *
   */
  setTime(time: number) {
    this.use();
    if (this.unifTime !== -1) {
      gl.uniform1i(this.unifTime, time);
    }
  }

  setLightPosition(light: vec3) {
    this.use();
    if (this.unifLightPos !== -1) {
      gl.uniform3fv(this.unifLightPos, light);
    }
  }

  /**
   * @brief      Sets the texture slot 0 to the uniform variable.
   *
   * @memberof   ShaderProgram
   *
   */
  setTexture(slot: number) {
    this.use();
    if (this.unifTexture !== -1 && slot == 0) {
      gl.uniform1i(this.unifTexture, 0);
    } else if (this.unifTexture1 !== -1 && slot == 1) {
      gl.uniform1i(this.unifTexture1, 1);
    }  else if (this.unifTexture2 !== -1 && slot == 2) {
      gl.uniform1i(this.unifTexture2, 2);
    }  else if (this.unifTexture3 !== -1 && slot == 3) {
      gl.uniform1i(this.unifTexture3, 3);
    }
  }

  setShadowMapMatrices(lightSpace: mat4, lightViewport: mat4) {
    this.use();
    if (this.unifSMLightSpace !== -1) {
      gl.uniformMatrix4fv(this.unifSMLightSpace, false, lightSpace);
    }

    if (this.unifSMLightViewport !== -1) {
      gl.uniformMatrix4fv(this.unifSMLightViewport, false, lightViewport);
    }
  }

  setGlobalTransfrom(value: mat4) {
    this.use();
    if (this.unifGlobalTransform !== -1) {
      gl.uniformMatrix4fv(this.unifGlobalTransform, false, value);
    }
  }

  setShadowTexture(num: number) {
    this.use();

    if (this.unifShadowTexture != -1) {
      gl.uniform1i(this.unifShadowTexture, num);
    }
  }

  setControlValues(controls: ShaderControls) {
    this.use();

    if (this.unifControlsWaterOpacity !== -1) {
      gl.uniform1f(this.unifControlsWaterOpacity, controls.waterControls.opacity);
    }

    if (this.unifControlsWaterLevel !== -1) {
      gl.uniform1f(this.unifControlsWaterLevel, controls.waterControls.level);
    }

    if (this.unifControlsShoreLevel !== -1) {
      gl.uniform1f(this.unifControlsShoreLevel, controls.shoreLevel);
    }

    if (this.unifControlsElevation !== -1) {
      gl.uniform1f(this.unifControlsElevation, controls.elevation);
    }

    if (this.unifControlsNoiseScale !== -1) {
      gl.uniform1f(this.unifControlsNoiseScale, controls.noiseScale);
    }

    if (this.unifControlsWaterColor !== -1) {
      let color = vec3.fromValues(controls.waterControls.color[0], controls.waterControls.color[1], controls.waterControls.color[2]);
      vec3.scale(color, color, 1 / 255.0);
      gl.uniform3fv(this.unifControlsWaterColor, color);
    }

    if (this.unifControlsWaterBedrock1Color !== -1) {
      let color = vec3.fromValues(controls.bedrock1Color[0], controls.bedrock1Color[1], controls.bedrock1Color[2]);
      vec3.scale(color, color, 1 / 255.0);
      gl.uniform3fv(this.unifControlsWaterBedrock1Color, color);
    }

    if (this.unifControlsWaterBedrock2Color !== -1) {
      let color = vec3.fromValues(controls.bedrock2Color[0], controls.bedrock2Color[1], controls.bedrock2Color[2]);
      vec3.scale(color, color, 1 / 255.0);
      gl.uniform3fv(this.unifControlsWaterBedrock2Color, color);
    }

    if (this.unifControlsSandColor !== -1) {
      let color = vec3.fromValues(controls.sandColor[0], controls.sandColor[1], controls.sandColor[2]);
      vec3.scale(color, color, 1 / 255.0);
      gl.uniform3fv(this.unifControlsSandColor, color);
    }
  }

  /**
   * @brief      Draw the sent drawable
   *
   * @memberof   ShaderProgram
   *
   * @param      d     Drawable
   *
   */
  draw(d: Drawable) {
    this.use();

    if (this.attrVertPos != -1 && d.bindVert()) {
      gl.enableVertexAttribArray(this.attrVertPos);
      gl.vertexAttribPointer(this.attrVertPos, 4, gl.FLOAT, false, 0, 0);

      if (d.isInstanced()) {
        gl.vertexAttribDivisor(this.attrVertPos, 0);
      }
    }

    if (this.attrInstancePos != -1 && d.bindInstancePos()) {
      gl.enableVertexAttribArray(this.attrInstancePos);
      gl.vertexAttribPointer(this.attrInstancePos, 4, gl.FLOAT, false, 0, 0);

      if (d.isInstanced()) {
        gl.vertexAttribDivisor(this.attrInstancePos, 1);
      }
    }

    if (this.attrInstanceRotation != -1 && d.bindInstanceRotation()) {
      gl.enableVertexAttribArray(this.attrInstanceRotation);
      gl.vertexAttribPointer(this.attrInstanceRotation, 4, gl.FLOAT, false, 0, 0);

      if (d.isInstanced()) {
        gl.vertexAttribDivisor(this.attrInstanceRotation, 1);
      }
    }

    if (this.attrInstanceScale != -1 && d.bindInstanceScale()) {
      gl.enableVertexAttribArray(this.attrInstanceScale);
      gl.vertexAttribPointer(this.attrInstanceScale, 4, gl.FLOAT, false, 0, 0);

      if (d.isInstanced()) {
        gl.vertexAttribDivisor(this.attrInstanceScale, 1);
      }
    }

    if (this.attrInstanceColor != -1 && d.bindInstanceColor()) {
      gl.enableVertexAttribArray(this.attrInstanceColor);
      gl.vertexAttribPointer(this.attrInstanceColor, 4, gl.FLOAT, false, 0, 0);

      if (d.isInstanced()) {
        gl.vertexAttribDivisor(this.attrInstanceColor, 1);
      }
    }

    if (this.attrNor != -1 && d.bindNor()) {
      gl.enableVertexAttribArray(this.attrNor);
      gl.vertexAttribPointer(this.attrNor, 4, gl.FLOAT, false, 0, 0);

      if (d.isInstanced()) {
        gl.vertexAttribDivisor(this.attrNor, 0);
      }
    }

    if (this.attrCol != -1 && d.bindCol()) {
      gl.enableVertexAttribArray(this.attrCol);
      gl.vertexAttribPointer(this.attrCol, 4, gl.FLOAT, false, 0, 0);

      if (d.isInstanced()) {
        gl.vertexAttribDivisor(this.attrCol, 0);
      }
    }

    if (this.attrUv != -1 && d.bindUv()) {
      gl.enableVertexAttribArray(this.attrUv);
      gl.vertexAttribPointer(this.attrUv, 2, gl.FLOAT, false, 0, 0);

      if (d.isInstanced()) {
        gl.vertexAttribDivisor(this.attrUv, 0);
      }
    }

    d.bindIdx();

    if (d.isInstanced()) {
      gl.drawElementsInstanced(d.drawMode(), d.elemCount(), gl.UNSIGNED_INT, 0, d.instanceCount());
    } else {
      gl.drawElements(d.drawMode(), d.elemCount(), gl.UNSIGNED_INT, 0);
    }

    if (this.attrVertPos != -1) gl.disableVertexAttribArray(this.attrVertPos);
    if (this.attrNor != -1) gl.disableVertexAttribArray(this.attrNor);
    if (this.attrInstancePos != -1) gl.disableVertexAttribArray(this.attrInstancePos);
    if (this.attrInstanceRotation != -1) gl.disableVertexAttribArray(this.attrInstanceRotation);
    if (this.attrInstanceScale != -1) gl.disableVertexAttribArray(this.attrInstanceScale);
    if (this.attrNor != -1) gl.disableVertexAttribArray(this.attrNor);
    if (this.attrCol != -1) gl.disableVertexAttribArray(this.attrCol);
    if (this.attrUv != -1) gl.disableVertexAttribArray(this.attrUv);
  }
};

export default ShaderProgram;
