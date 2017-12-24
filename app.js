const can = document.querySelector('canvas');
const gl = can.getContext('webgl');

var teapot, stPlane, uvPlane, planes, otherTeapot, holo, holoPlane;

const sceneA = new Scene(); // Imaging scene
const sceneB = new Scene(); // STUV planes
const sceneC = new Scene(); // Final scene

const sceneAfb = makeFramebuffer(gl); // buffer for storing sceneA
const depthBufferA = makeDepthBuffer(gl);
const sceneBfb = makeFramebuffer(gl); // buffer for sceneB
const depthBufferB = makeDepthBuffer(gl);

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
    texture0: gl.getUniformLocation(holoPlaneShaderProgram, 'uTexture0')
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

// camera for scenes B and C
const vCam = new Camera(gl,
  Math.PI / 4,
  1.0, 100.0,
  { x: 0, y: 0, w: gl.canvas.width, h: gl.canvas.height },
  sceneA
);

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
    promiseTexture(gl, './rednoise.png')
  ]);
})
.then((secondBundle) => {

  // set up teapots in scene to be imaged
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

  // UV and ST planes in framebuffer for determining ray angle
  const planeMesh = new OBJ.Mesh(secondBundle[1]);
  OBJ.initMeshBuffers(gl, planeMesh);
  planes = new Model(gl, 'Planes', null, sceneB);
  uvPlane = new Model(gl, 'UV Plane', planeMesh, planes, uvPlaneShaderProgram, uvPlaneShaderLocations);
  stPlane = new Model(gl, 'ST Plane', planeMesh, planes, stPlaneShaderProgram, stPlaneShaderLocations);
  vec3.set(uvPlane.translation, 0, 0, 1);
  vec3.set(stPlane.translation, 0, 0, -1);
  vec3.set(planes.translation, 0, 0, -8);

  // Final scene
  holo = new Model(gl, 'Planes', null, sceneC);
  holoPlane = new Model(gl, 'Holo Plane', planeMesh, holo, holoPlaneShaderProgram, holoPlaneShaderLocations);
  const screenSize = new Float32Array([gl.canvas.width, gl.canvas.height]);
  const mapScale = new Float32Array([lfCam.side, lfCam.side]);
  gl.useProgram(holoPlaneShaderProgram);
  gl.uniform2fv(holoPlaneShaderLocations.uniformLocations.screenSize, screenSize);
  gl.uniform2fv(holoPlaneShaderLocations.uniformLocations.mapScale, mapScale);
  holoPlane.textures.push(sceneBfb.texture);
  vec3.set(holoPlane.translation, 0, 0, 1);
  vec3.set(holo.translation, 0, 0, -8);

  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  drawMap();
  enableControls();
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

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

  // light field view
  // gl.disable(gl.BLEND);
  // gl.enable(gl.DEPTH_TEST);
  // lfCam.render(sceneA);

  // stuv planes view
  gl.bindFramebuffer(gl.FRAMEBUFFER, sceneBfb.buffer);
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clearDepth(1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  gl.blendEquation( gl.FUNC_ADD );
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  vCam.render(sceneB);

  // holo view
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clearDepth(1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.BLEND);
  gl.enable(gl.DEPTH_TEST);
  vCam.render(sceneC);
}

function enableControls () {
  gl.canvas.onmousemove = function(e) {
    let nDx = -2 * (e.offsetX / gl.canvas.offsetWidth) + 1;
    let nDy = 2 * (e.offsetY / gl.canvas.offsetHeight) - 1;

    vec3.set(planes.rotation, 0, -nDx * 180, 0);
    vec3.set(holo.rotation, 0, -nDx * 180, 0);

    vec3.set(teapot.rotation, 0, nDx * 180, 22.5);
    vec3.set(otherTeapot.rotation, nDx * 720, 0, 0);
  };

  gl.canvas.addEventListener('wheel', function (e) {
    let scroll = Math.abs(e.deltaY)/e.deltaY;
    vec3.add(planes.translation, planes.translation, vec3.fromValues(0, 0, scroll));
    vec3.add(holo.translation, holo.translation, vec3.fromValues(0, 0, scroll));
  });
}
