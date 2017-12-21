const can = document.querySelector('canvas');
const gl = can.getContext('webgl');
var teapot;
const sceneA = [];
const sceneB = [];
const modelViewMatrix = mat4.create();
const projectionMatrix = mat4.create();
const normalMatrix = mat3.create();

const upVec = vec3.fromValues(0,1,0)
const rightVec = vec3.fromValues(1,0,0);
const forwardVec = vec3.cross(vec3.create(), upVec, rightVec);

const teapotShaderProgram = initShaderProgram(gl, teapotVert, teapotFrag);
const teapotShaderLocations = {
  attribLocations: {
    vertexPosition: gl.getAttribLocation(teapotShaderProgram, 'aVertexPosition'),
    textureCoord: gl.getAttribLocation(teapotShaderProgram, 'aTextureCoord'),
    vertexNormal: gl.getAttribLocation(teapotShaderProgram, 'aVertexNormal'),
  },
  uniformLocations: {
    projectionMatrix: gl.getUniformLocation(teapotShaderProgram, 'uProjectionMatrix'),
    modelViewMatrix: gl.getUniformLocation(teapotShaderProgram, 'uModelViewMatrix'),
    normalMatrix: gl.getUniformLocation(teapotShaderProgram, 'uNormalMatrix'),
    uSampler: gl.getUniformLocation(teapotShaderProgram, 'uSampler')
  },
};

const planeShaderProgram = initShaderProgram(gl, planeVert, planeFrag);
const planeShaderLocations = {
  attribLocations: {
    vertexPosition: gl.getAttribLocation(planeShaderProgram, 'aVertexPosition'),
    textureCoord: gl.getAttribLocation(planeShaderProgram, 'aTextureCoord'),
    vertexNormal: gl.getAttribLocation(planeShaderProgram, 'aVertexNormal'),
  },
  uniformLocations: {
    projectionMatrix: gl.getUniformLocation(planeShaderProgram, 'uProjectionMatrix'),
    modelViewMatrix: gl.getUniformLocation(planeShaderProgram, 'uModelViewMatrix'),
    normalMatrix: gl.getUniformLocation(planeShaderProgram, 'uNormalMatrix'),
    uSampler: gl.getUniformLocation(planeShaderProgram, 'uSampler'),
    lfTex: gl.getUniformLocation(planeShaderProgram, 'uLFTex'),
    screenSize: gl.getUniformLocation(planeShaderProgram, 'screenSize'),
    mapScale: gl.getUniformLocation(planeShaderProgram, 'mapScale')
  },
};

const planeUVShaderProgram = initShaderProgram(gl, planeUVVert, planeUVFrag);
const planeUVShaderLocations = {
  attribLocations: {
    vertexPosition: gl.getAttribLocation(planeUVShaderProgram, 'aVertexPosition'),
    textureCoord: gl.getAttribLocation(planeUVShaderProgram, 'aTextureCoord'),
  },
  uniformLocations: {
    projectionMatrix: gl.getUniformLocation(planeUVShaderProgram, 'uProjectionMatrix'),
    modelViewMatrix: gl.getUniformLocation(planeUVShaderProgram, 'uModelViewMatrix')
  },
};

const helperShaderProgram = initShaderProgram(gl, helperVert, helperFrag);
const helperShaderLocations = {
  attribLocations: {
    vertexPosition: gl.getAttribLocation(helperShaderProgram, 'aVertexPosition')
  },
  uniformLocations: {
    projectionMatrix: gl.getUniformLocation(helperShaderProgram, 'uProjectionMatrix'),
    modelViewMatrix: gl.getUniformLocation(helperShaderProgram, 'uModelViewMatrix')
  },
};

var noiseTexture;

const lfCam = new LightFieldCamera(gl,
  vec3.fromValues(0, 0, 2),
  vec3.create(),
  Math.PI / 4,
  1.0, 100.0,
  5,
  0.2,
  helperShaderProgram,
  helperShaderLocations
);

const vCamZ = 8;
const vCam = new Camera(gl,
  vec3.fromValues(0, 0, vCamZ),
  vec3.fromValues(0,0,0),
  Math.PI / 4,
  1.0, 100.0,
  { x: 0, y: 0, w: gl.canvas.width, h: gl.canvas.height }
);

const objRequest = new Request('./teapot-scaled.obj');
const plnRequest = new Request('./plane.obj');

const sceneAfb = makeFramebuffer(gl);
const depthBuffer = makeDepthBuffer(gl);
const sceneBUVfb = makeFramebuffer(gl);
const otherDepthBuffer = makeDepthBuffer(gl);

Promise.all([
  fetch(objRequest),
  fetch(plnRequest)
])
.then((bundle) => {
  return Promise.all([
    bundle[0].text(),
    bundle[1].text(),
    promiseTexture(gl, './rednoise.png')
  ]);
})
.then((secondBundle) => {
  teapot = new OBJ.Mesh(secondBundle[0]);
  OBJ.initMeshBuffers(gl, teapot);
  teapot.shaderProgram = teapotShaderProgram;
  teapot.shaderLocations = teapotShaderLocations;
  teapot.texture = secondBundle[2];

  plane = new OBJ.Mesh(secondBundle[1]);
  OBJ.initMeshBuffers(gl, plane);
  plane.texture = sceneBUVfb.texture; // sceneAfb.texture;
  plane.texture2 = sceneAfb.texture;
  const screenSize = new Float32Array([gl.canvas.width, gl.canvas.height]);
  const mapScale = new Float32Array([lfCam.side, lfCam.side]);
  gl.useProgram(planeShaderProgram);
  gl.uniform2fv(planeShaderLocations.uniformLocations.screenSize, screenSize);
  gl.uniform2fv(planeShaderLocations.uniformLocations.mapScale, mapScale);

  sceneA.push(teapot);
  sceneB.push(plane);

  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  drawMap();
  enableControls();
  animate();

  function animate () {
    requestAnimationFrame(animate);
    drawScene();
  }
});

function drawMap () {
  gl.bindFramebuffer(gl.FRAMEBUFFER, sceneAfb.buffer);
  gl.clearColor(0.1, 0, 0.2, 1.0);
  gl.clearDepth(1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  lfCam.render(sceneA);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // update texture on other shader
  gl.useProgram(planeShaderProgram);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, sceneAfb.texture);
  gl.uniform1i(planeShaderLocations.uniformLocations.lfTex, 1);
}

function drawScene() {
  plane.shaderProgram = planeUVShaderProgram;
  plane.shaderLocations = planeUVShaderLocations;
  gl.bindFramebuffer(gl.FRAMEBUFFER, sceneBUVfb.buffer);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  vCam.render(sceneB);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.clearColor(0.0, 0.0, 1.0, 1.0);
  gl.clearDepth(1.0);
  mat4.identity(modelViewMatrix);
  mat4.lookAt(modelViewMatrix, vec3.fromValues(0,0,5.5), lfCam.tgt, vec3.fromValues(0, 1.0, 0));
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  plane.shaderProgram = planeShaderProgram;
  plane.shaderLocations = planeShaderLocations;

  vCam.render(sceneB, true);
  //lfCam.drawHelper();
}

function enableControls () {
  gl.canvas.onmousemove = function(e) {
    vCam.pos[0] = (-2 * (e.offsetX / gl.canvas.offsetWidth) + 1) * vCamZ;
    vCam.pos[1] = (2 * (e.offsetY / gl.canvas.offsetHeight) - 1) * vCamZ;
    vec3.normalize(vCam.pos, vCam.pos);
    vec3.scale(vCam.pos, vCam.pos, vCamZ);
  };
}
