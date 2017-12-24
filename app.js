const can = document.querySelector('canvas');
const gl = can.getContext('webgl');
var teapot, stPlane, uvPlane, planes, otherTeapot;
const sceneA = new Scene();
const sceneB = new Scene();
const viewMatrix = mat4.create();
const modelViewMatrix = mat4.create();
const projectionMatrix = mat4.create();
const normalMatrix = mat3.create();

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
    texture0: gl.getUniformLocation(teapotShaderProgram, 'uTexture0')
  },
};

const uvPlaneShaderProgram = initShaderProgram(gl, planeVert, uvplaneFrag);
const stPlaneShaderProgram = initShaderProgram(gl, planeVert, stplaneFrag);
const uvPlaneShaderLocations = {
  attribLocations: {
    vertexPosition: gl.getAttribLocation(uvPlaneShaderProgram, 'aVertexPosition'),
    textureCoord: gl.getAttribLocation(uvPlaneShaderProgram, 'aTextureCoord')
  },
  uniformLocations: {
    projectionMatrix: gl.getUniformLocation(uvPlaneShaderProgram, 'uProjectionMatrix'),
    modelViewMatrix: gl.getUniformLocation(uvPlaneShaderProgram, 'uModelViewMatrix')
  },
};
const stPlaneShaderLocations = {
  attribLocations: {
    vertexPosition: gl.getAttribLocation(stPlaneShaderProgram, 'aVertexPosition'),
    textureCoord: gl.getAttribLocation(stPlaneShaderProgram, 'aTextureCoord')
  },
  uniformLocations: {
    projectionMatrix: gl.getUniformLocation(stPlaneShaderProgram, 'uProjectionMatrix'),
    modelViewMatrix: gl.getUniformLocation(stPlaneShaderProgram, 'uModelViewMatrix')
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
  Math.PI / 4,
  1.0, 100.0,
  5,
  0.1,
  helperShaderProgram,
  helperShaderLocations,
  sceneA
);

const vCamZ = 4;
const vCam = new Camera(gl,
  Math.PI / 4,
  1.0, 100.0,
  { x: 0, y: 0, w: gl.canvas.width, h: gl.canvas.height },
  sceneA
);

const objRequest = new Request('./teapot-scaled.obj');
const plnRequest = new Request('./plane.obj');

const sceneAfb = makeFramebuffer(gl);
const depthBuffer = makeDepthBuffer(gl);

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

  const teapotMesh = new OBJ.Mesh(secondBundle[0]);
  OBJ.initMeshBuffers(gl, teapotMesh);
  teapot = new Model(gl, 'teapot', teapotMesh, sceneA, teapotShaderProgram, teapotShaderLocations);
  teapot.textures.push(secondBundle[2]);
  sceneA.children.push(teapot);
  vec3.set(teapot.translation, 0, 0, -4);
  vec3.set(teapot.rotation, 0, 0, 22.5);

  otherTeapot = new Model(gl, 'other teapot', teapotMesh, teapot, teapotShaderProgram, teapotShaderLocations);
  otherTeapot.textures.push(secondBundle[2]);
  teapot.children.push(otherTeapot);

  vec3.set(otherTeapot.translation, 1, 0.5, 0);
  vec3.set(otherTeapot.scale, 0.5, 0.5, 0.5);

  const planeMesh = new OBJ.Mesh(secondBundle[1]);
  OBJ.initMeshBuffers(gl, planeMesh);
  planes = new Model(gl, 'Planes', null, sceneB);
  uvPlane = new Model(gl, 'UV Plane', planeMesh, planes, uvPlaneShaderProgram, uvPlaneShaderLocations);
  stPlane = new Model(gl, 'ST Plane', planeMesh, planes, stPlaneShaderProgram, stPlaneShaderLocations);

  vec3.set(uvPlane.translation, 0, 0, 1);
  vec3.set(stPlane.translation, 0, 0, -1);
  vec3.set(planes.translation, 0, 0, -8);

  // const screenSize = new Float32Array([gl.canvas.width, gl.canvas.height]);
  // const mapScale = new Float32Array([lfCam.side, lfCam.side]);
  // gl.useProgram(planeShaderProgram);
  // gl.uniform2fv(planeShaderLocations.uniformLocations.screenSize, screenSize);
  // gl.uniform2fv(planeShaderLocations.uniformLocations.mapScale, mapScale);
  // gl.uniform3fv(planeShaderLocations.uniformLocations.camPosition, vCam.pos);

  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  drawMap();
  enableControls();
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.enable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  gl.blendEquation( gl.FUNC_ADD );
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  animate();

  function animate () {
    requestAnimationFrame(animate);
    drawScene();
  }
});

function drawMap () {
  gl.bindFramebuffer(gl.FRAMEBUFFER, sceneAfb.buffer);
  //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.clearColor(0.1, 0, 0.2, 1.0);
  gl.clearDepth(1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  lfCam.render(sceneA);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function drawScene() {
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clearDepth(1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  vCam.render(sceneB);
}

function enableControls () {
  gl.canvas.onmousemove = function(e) {
    let nDx = -2 * (e.offsetX / gl.canvas.offsetWidth) + 1;
    let nDy = 2 * (e.offsetY / gl.canvas.offsetHeight) - 1;

    //vec3.set(planes.translation, -nDx * 4, 0, 0);

    vec3.set(planes.rotation, 0, -nDy * 180, 0);

    // vec3.set(teapot.rotation, 0, nDx * 180, 22.5);
    // vec3.set(otherTeapot.rotation, nDx * 720, 0, 0);
  };
}
