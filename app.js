const can = document.querySelector('canvas');
const gl = can.getContext('webgl');

var teapot, stPlane, uvPlane,
  planes, otherTeapot, teapotPivot,
  holo, holoPlane;

can.width = gl.canvas.clientWidth;
can.height = gl.canvas.clientHeight;

const sceneA = new Scene(); // Imaging scene
const sceneB = new Scene(); // STUV planes
const sceneC = new Scene(); // Final scene

var sceneAfb = makeFramebuffer(gl); // buffer for storing sceneA
const depthBufferA = makeDepthBuffer(gl);
var sceneBfb = makeFramebuffer(gl); // buffer for sceneB
const depthBufferB = makeDepthBuffer(gl);

const viewMatrix = mat4.create();
const modelViewMatrix = mat4.create();
const projectionMatrix = mat4.create();
const normalMatrix = mat3.create();
var matrixStack = [];

var viewCode = 'a';

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

const holoPlaneShaderProgram = initShaderProgram(gl, holoPlaneVert, holoPlaneFrag);
const holoPlaneShaderLocations = {
  attribLocations: {
    vertexPosition: gl.getAttribLocation(holoPlaneShaderProgram, 'aVertexPosition'),
    textureCoord: gl.getAttribLocation(holoPlaneShaderProgram, 'aTextureCoord')
  },
  uniformLocations: {
    projectionMatrix: gl.getUniformLocation(holoPlaneShaderProgram, 'uProjectionMatrix'),
    modelViewMatrix: gl.getUniformLocation(holoPlaneShaderProgram, 'uModelViewMatrix'),
    screenSize: gl.getUniformLocation(holoPlaneShaderProgram, 'uScreenSize'),
    mapScale: gl.getUniformLocation(holoPlaneShaderProgram, 'uMapScale'),
    texture0: gl.getUniformLocation(holoPlaneShaderProgram, 'uTexture0'),
    texture1: gl.getUniformLocation(holoPlaneShaderProgram, 'uTexture1')
  },
};

var noiseTexture;

const lfCam = new LightFieldCamera(gl,
  'light field cam',
  Math.PI / 4,
  1/1,
  1.0, 100.0,
  17,
  0.15,
  vec3.fromValues(0,0,-2)
);
vec3.set(lfCam.translation, 0, 0, 0);

// camera for scenes B and C
const vCam = new Camera(gl,
  'view cam',
  Math.PI / 4,
  gl.canvas.width / gl.canvas.height,
  1.0, 100.0,
  { x: 0, y: 0, w: gl.canvas.width, h: gl.canvas.height }
);
vec3.set(vCam.translation, 0, 0, 0);

const objRequest = new Request('./teapot-scaled.obj');
const plnRequest = new Request('./plane.obj');

Promise.all([
  fetch(objRequest),
  fetch(plnRequest)
])
.then((bundle) => {
  return Promise.all([
    bundle[0].text(),
    bundle[1].text(),
    promiseTexture(gl, './rednoise.png'),
    // promiseTexture(gl, './ball.jpg'),
    // promiseTexture(gl, './dragon-uv.jpg'),
    // promiseTexture(gl, './book.jpg'),
    // promiseTexture(gl, './lego-giant.jpg'),
    promiseTexture(gl, './bignoise.png')
  ]);
})
.then((secondBundle) => {

  // set up teapots in scene to be imaged
  const teapotMesh = new OBJ.Mesh(secondBundle[0]);
  OBJ.initMeshBuffers(gl, teapotMesh);

  teapot = new Model(gl, 'teapot', teapotMesh, sceneA, teapotShaderProgram, teapotShaderLocations);
  teapot.textures.push(secondBundle[2]);
  vec3.set(teapot.translation, 0, 0, -2);

  teapotPivot = new Model(gl, 'pivot', null, teapot);

  otherTeapot = new Model(gl, 'other teapot', teapotMesh, teapotPivot, teapotShaderProgram, teapotShaderLocations);
  otherTeapot.textures.push(secondBundle[2]);
  vec3.set(otherTeapot.translation, 0, 0.5, 0);
  vec3.set(otherTeapot.scale, 0.5, 0.5, 0.5);

  // UV and ST planes in framebuffer for determining ray angle
  const planeMesh = new OBJ.Mesh(secondBundle[1]);
  OBJ.initMeshBuffers(gl, planeMesh);
  planes = new Model(gl, 'Planes', null, sceneB);
  uvPlane = new Model(gl, 'UV Plane', planeMesh, planes, uvPlaneShaderProgram, uvPlaneShaderLocations);
  stPlane = new Model(gl, 'ST Plane', planeMesh, planes, stPlaneShaderProgram, stPlaneShaderLocations);
  vec3.set(uvPlane.translation, 0, 0, 2);
  vec3.set(stPlane.translation, 0, 0, 0);
  vec3.set(planes.translation, 0, 0, -5);

  // Final scene
  holo = new Model(gl, 'Planes', null, sceneC);
  holoPlane = new Model(gl, 'Holo Plane', planeMesh, holo, holoPlaneShaderProgram, holoPlaneShaderLocations);
  const screenSize = new Float32Array([gl.canvas.width, gl.canvas.height]);
  const mapScale = new Float32Array([lfCam.side, lfCam.side]);
  gl.useProgram(holoPlaneShaderProgram);
  gl.uniform2fv(holoPlaneShaderLocations.uniformLocations.screenSize, screenSize);
  gl.uniform2fv(holoPlaneShaderLocations.uniformLocations.mapScale, mapScale);
  holoPlane.textures.push(sceneAfb.texture);
  holoPlane.textures.push(sceneBfb.texture);
  vec3.set(holoPlane.translation, 0, 0, 2);
  vec3.set(holo.translation, 0, 0, -5);
  gl.enable(gl.CULL_FACE);

  drawMap();
  enableControls();
  animate();

  function animate () {
    requestAnimationFrame(animate);
    drawScene();
  }
});

function drawMap () {
  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  gl.bindFramebuffer(gl.FRAMEBUFFER, sceneAfb.buffer);
  gl.clearColor(0.0, 0, 0.1, 1.0);
  gl.clearDepth(1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  lfCam.focusCameras();
  lfCam.render(sceneA);
}

function drawScene() {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clearDepth(1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (viewCode === 'a') {
    // light field view
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.0, 0, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    lfCam.render(sceneA);
  }
  else if (viewCode === 'b') {
    // stuv planes view
    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.SRC_ALPHA);
    vCam.render(sceneB);
  }
  else if (viewCode === 'c') {
    vec3.add(otherTeapot.rotation, otherTeapot.rotation, vec3.fromValues(0, 1, 0));
    drawMap();
    gl.bindFramebuffer(gl.FRAMEBUFFER, sceneBfb.buffer);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.SRC_ALPHA);
    vCam.render(sceneB);
    // holo view
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    vCam.render(sceneC);
  }
}

function enableControls () {
  gl.canvas.onmousemove = function(e) {
    let nDx = -2 * (e.offsetX / gl.canvas.offsetWidth) + 1;
    let nDy = 2 * (e.offsetY / gl.canvas.offsetHeight) - 1;

    if (e.buttons) {
      vec3.set(planes.rotation, nDy * 90, -nDx * 90, 0);
      vec3.set(holo.rotation, nDy * 90, -nDx * 90, 0);
    }
  };

  gl.canvas.addEventListener('wheel', function (e) {
    let scroll = 0.1 * Math.abs(e.deltaY)/e.deltaY;
    vec3.add(lfCam.target, lfCam.target, vec3.fromValues(0, 0, scroll));
    lfCam.focusCameras();
    drawMap();
  });

  document.addEventListener('keyup', function (e) {
    if (e.keyCode == 65) {
      // a
      viewCode = 'a';
    }
    else if (e.keyCode == 66) {
      // b
      viewCode = 'b';
    }
    else if (e.keyCode == 67) {
      // c
      viewCode = 'c';
    }
  });

  window.addEventListener('resize', function () {
    gl.canvas.width = gl.canvas.clientWidth;
    gl.canvas.height = gl.canvas.clientHeight;
    vCam.viewport.w = gl.canvas.clientWidth;
    vCam.viewport.h = gl.canvas.clientHeight;
    vCam.aspect = vCam.viewport.w / vCam.viewport.h;
    gl.useProgram(holoPlaneShaderProgram);
    const screenSize = new Float32Array([gl.canvas.clientWidth, gl.canvas.clientHeight]);
    gl.uniform2fv(holoPlaneShaderLocations.uniformLocations.screenSize, screenSize);
    lfCam.updateViewports();
    sceneAfb = makeFramebuffer(gl);
    sceneBfb = makeFramebuffer(gl);
    holoPlane.textures[0] = sceneAfb.texture;
    holoPlane.textures[1] = sceneBfb.texture;
  });
}
