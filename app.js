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
    screenSize: gl.getUniformLocation(planeShaderProgram, 'screenSize'),
    mapScale: gl.getUniformLocation(planeShaderProgram, 'mapScale')
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
  Math.PI / 2,
  1.0, 100.0,
  5,
  0.2,
  helperShaderProgram,
  helperShaderLocations
);

const vCam = new Camera(gl,
  vec3.fromValues(0, 0, 3),
  vec3.fromValues(0,0,1),
  Math.PI / 2,
  1.0, 100.0,
  { x: 0, y: 0, w: gl.canvas.width, h: gl.canvas.height }
);

const objRequest = new Request('./teapot-scaled.obj');
const plnRequest = new Request('./plane.obj');

const sceneAfb = makeFramebuffer(gl);
const depthBuffer = makeDepthBuffer();

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
  plane.shaderProgram = planeShaderProgram;
  plane.shaderLocations = planeShaderLocations;
  plane.texture = sceneAfb.texture;

  const screenSize = new Float32Array([gl.canvas.width, gl.canvas.height]);
  const mapScale = new Float32Array([lfCam.side, lfCam.side]);
  gl.useProgram(plane.shaderProgram);
  gl.uniform2fv(plane.shaderLocations.uniformLocations.screenSize, screenSize);
  gl.uniform2fv(plane.shaderLocations.uniformLocations.mapScale, mapScale);

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
}

function drawScene() {
  gl.clearColor(0.0, 0.0, 1.0, 1.0);
  gl.clearDepth(1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  vCam.render(sceneB);
  lfCam.drawHelper();
}

function enableControls () {
  gl.canvas.onmousemove = function(e) {
    vCam.pos[0] = (-2 * (e.offsetX / window.innerWidth) + 1) * 2;
    vCam.pos[1] = (2 * (e.offsetY / window.innerHeight) - 1) * 2;
  };
}
