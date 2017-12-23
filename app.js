const can = document.querySelector('canvas');
const gl = can.getContext('webgl');
var teapot, plane, otherTeapot;
const sceneA = [];
const sceneB = [];
const sceneC = new Scene();
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

// const planeShaderProgram = initShaderProgram(gl, planeVert, planeFrag);
// const planeShaderLocations = {
//   attribLocations: {
//     vertexPosition: gl.getAttribLocation(planeShaderProgram, 'aVertexPosition'),
//     textureCoord: gl.getAttribLocation(planeShaderProgram, 'aTextureCoord')
//   },
//   uniformLocations: {
//     projectionMatrix: gl.getUniformLocation(planeShaderProgram, 'uProjectionMatrix'),
//     modelViewMatrix: gl.getUniformLocation(planeShaderProgram, 'uModelViewMatrix'),
//     texture0: gl.getUniformLocation(planeShaderProgram, 'uTexture0'),
//     screenSize: gl.getUniformLocation(planeShaderProgram, 'screenSize'),
//     mapScale: gl.getUniformLocation(planeShaderProgram, 'mapScale'),
//     camPosition: gl.getUniformLocation(planeShaderProgram, 'camPosition'),
//   },
// };
//
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
  sceneC
);

const vCamZ = 4;
const vCam = new Camera(gl,
  Math.PI / 4,
  1.0, 100.0,
  { x: 0, y: 0, w: gl.canvas.width, h: gl.canvas.height },
  sceneC
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
  // teapot = new OBJ.Mesh(secondBundle[0]);
  // OBJ.initMeshBuffers(gl, teapot);
  // teapot.shaderProgram = teapotShaderProgram;
  // teapot.shaderLocations = teapotShaderLocations;
  // teapot.texture0 = secondBundle[2];

  const teapotMesh = new OBJ.Mesh(secondBundle[0]);
  OBJ.initMeshBuffers(gl, teapotMesh);
  teapot = new Model(gl, 'teapot', teapotMesh, sceneC, teapotShaderProgram, teapotShaderLocations);
  teapot.textures.push(secondBundle[2]);
  sceneC.children.push(teapot);
  vec3.set(teapot.translation, 0, 0, -4);
  vec3.set(teapot.rotation, 0, 0, 22.5);

  otherTeapot = new Model(gl, 'other teapot', teapotMesh, teapot, teapotShaderProgram, teapotShaderLocations);
  otherTeapot.textures.push(secondBundle[2]);
  teapot.children.push(otherTeapot);

  vec3.set(otherTeapot.translation, 1, 0.5, 0);
  vec3.set(otherTeapot.scale, 0.5, 0.5, 0.5);

  // plane = new OBJ.Mesh(secondBundle[1]);
  // OBJ.initMeshBuffers(gl, plane);
  // plane.texture0 = sceneAfb.texture;
  // plane.shaderProgram = planeShaderProgram;
  // plane.shaderLocations = planeShaderLocations;
  // const screenSize = new Float32Array([gl.canvas.width, gl.canvas.height]);
  // const mapScale = new Float32Array([lfCam.side, lfCam.side]);
  // gl.useProgram(planeShaderProgram);
  // gl.uniform2fv(planeShaderLocations.uniformLocations.screenSize, screenSize);
  // gl.uniform2fv(planeShaderLocations.uniformLocations.mapScale, mapScale);
  // gl.uniform3fv(planeShaderLocations.uniformLocations.camPosition, vCam.pos);

  //sceneA.push(teapot);
  // sceneB.push(plane);

  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  //drawMap();
  enableControls();
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  animate();
  //drawScene();

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
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  //vCam.render(sceneC);
  //vCam.render(sceneB);
  lfCam.render(sceneC);
  //lfCam.drawHelper();
}

function enableControls () {
  gl.canvas.onmousemove = function(e) {
    let nDx = -2 * (e.offsetX / gl.canvas.offsetWidth) + 1;
    let nDy = 2 * (e.offsetY / gl.canvas.offsetHeight) - 1;

    vec3.set(teapot.rotation, 0, nDx * 180, 22.5);
    vec3.set(otherTeapot.rotation, 0, nDx * 180, 0);
  };
}
