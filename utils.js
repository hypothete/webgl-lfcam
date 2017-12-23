function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function Scene () {
  const scene = {
    matrix: mat4.identity(mat4.create()),
    children: []
  };
  return scene;
}

function Model (gl, name, mesh, parent, shaderProgram, shaderLocations) {
  const model = {
    name,
    mesh,
    shaderProgram,
    shaderLocations,
    textures: [],
    parent,
    children: [],
    matrix: mat4.create(),
    translation: vec3.create(),
    rotation: vec3.create(),
    scale: vec3.fromValues(1,1,1),
    updateMatrix: function () {
      const rotQuat = quat.fromEuler(quat.create(), model.rotation[0], model.rotation[1], model.rotation[2]);
      const rotMat = mat4.fromQuat(mat4.create(), rotQuat);
      const transMat = mat4.fromTranslation(mat4.create(), model.translation);
      const scaleMat = mat4.fromScaling(mat4.create(), model.scale);
      mat4.copy(model.matrix, mat4.create());
      mat4.multiply(model.matrix, model.matrix, model.parent.matrix);

      mat4.multiply(model.matrix, model.matrix, transMat);
      mat4.multiply(model.matrix, model.matrix, rotMat);
      mat4.multiply(model.matrix, model.matrix, scaleMat);

      // now multiply in the parent matrix

    },
    draw: function () {
      model.updateMatrix();

      mat4.multiply(modelViewMatrix, model.matrix, viewMatrix);
      mat3.normalFromMat4(normalMatrix, modelViewMatrix);

      gl.useProgram(model.shaderProgram);

      gl.uniformMatrix4fv(model.shaderLocations.uniformLocations.projectionMatrix, false, projectionMatrix);
      gl.uniformMatrix4fv(model.shaderLocations.uniformLocations.modelViewMatrix, false, modelViewMatrix);

      if (typeof model.shaderLocations.uniformLocations.normalMatrix !== 'undefined') {
        gl.uniformMatrix3fv(model.shaderLocations.uniformLocations.normalMatrix, false, normalMatrix);
      }

      if (typeof model.shaderLocations.attribLocations.textureCoord !== 'undefined') {
        gl.bindBuffer(gl.ARRAY_BUFFER, model.mesh.textureBuffer);
        gl.vertexAttribPointer(model.shaderLocations.attribLocations.textureCoord, model.mesh.textureBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(model.shaderLocations.attribLocations.textureCoord);
      }

      if (typeof mesh.texture0 !== 'undefined') {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, mesh.texture0);
        gl.uniform1i(model.shaderLocations.uniformLocations.texture0, 0);
      }

      for (let texInd = 0; texInd < model.textures.length; texInd++) {
        let glSlot = 'TEXTURE' + texInd;
        let uniformLoc = glSlot.toLowerCase();
        gl.activeTexture(gl[glSlot]);
        gl.bindTexture(gl.TEXTURE_2D, model.textures[texInd]);
        gl.uniform1i(model.shaderLocations.uniformLocations[uniformLoc], texInd);
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, model.mesh.vertexBuffer);
      gl.vertexAttribPointer(model.shaderLocations.attribLocations.vertexPosition, model.mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(model.shaderLocations.attribLocations.vertexPosition);

      if (typeof model.shaderLocations.attribLocations.vertexNormal !== 'undefined') {
        gl.bindBuffer(gl.ARRAY_BUFFER, model.mesh.normalBuffer);
        gl.vertexAttribPointer(model.shaderLocations.attribLocations.vertexNormal, model.mesh.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(model.shaderLocations.attribLocations.vertexNormal);
      }

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.mesh.indexBuffer);
      gl.drawElements(gl.TRIANGLES, model.mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

      for (let child of model.children) {
        child.draw();
      }
    }
  };
  return model;
}

function Camera (gl, fov, near, far, viewport, parent) {
  const cam = {
    fov,
    near,
    far,
    viewport,
    parent: parent || { matrix: mat4.create() },
    matrix: mat4.create(),
    translation: vec3.create(),
    rotation: vec3.create(),
    updateMatrix () {
      const rotQuat = quat.fromEuler(quat.create(), cam.rotation[0], cam.rotation[1], cam.rotation[2]);
      const rotMat = mat4.fromQuat(mat4.create(), rotQuat);
      const transMat = mat4.fromTranslation(mat4.create(), cam.translation);
      mat4.copy(cam.matrix, mat4.create());
      mat4.multiply(cam.matrix, cam.matrix, cam.parent.matrix);
      mat4.multiply(cam.matrix, cam.matrix, transMat);
      mat4.multiply(cam.matrix, cam.matrix, rotMat);
    },
    render (scene) {
      cam.updateMatrix();
      gl.viewport(cam.viewport.x, cam.viewport.y, cam.viewport.w, cam.viewport.h);
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(cam.viewport.x, cam.viewport.y, cam.viewport.w, cam.viewport.h);
      mat4.invert(viewMatrix, cam.matrix);
      mat4.perspective(projectionMatrix, cam.fov, cam.viewport.w/cam.viewport.h, cam.near, cam.far);
      for (let child of scene.children) {
        child.draw();
      }
      gl.disable(gl.SCISSOR_TEST);
    }
  };
  return cam;
}

function LightFieldCamera (gl, fov, near, far, side, spread, helperProgram, helperLocations, parent) {
  let cam = {
    translation: vec3.create(),
    rotation: vec3.create(),
    side,
    spread,
    cameras: [],
    camPosArray: [],
    camPosBuffer: gl.createBuffer(),
    shaderProgram: helperProgram,
    shaderLocations: helperLocations,
    parent: parent || { matrix: mat4.create() },
    updateMatrix () {
      const rotQuat = quat.fromEuler(quat.create(), cam.rotation[0], cam.rotation[1], cam.rotation[2]);
      const rotMat = mat4.fromQuat(mat4.create(), rotQuat);
      const transMat = mat4.fromTranslation(mat4.create(), cam.translation);
      mat4.copy(cam.matrix, mat4.create());
      mat4.multiply(cam.matrix, cam.matrix, cam.parent.matrix);
      mat4.multiply(cam.matrix, cam.matrix, transMat);
      mat4.multiply(cam.matrix, cam.matrix, rotMat);
    },
    render: function (scene) {
      for (let camera of cam.cameras) {
        camera.render(scene);
      }
    },
    updateCamPosArray: function () {
      cam.camPosArray = [];
      for (let camera of cam.cameras) {
        cam.camPosArray.push(camera.translation[0]);
        cam.camPosArray.push(camera.translation[1]);
        cam.camPosArray.push(camera.translation[2]);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, cam.camPosBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cam.camPosArray), gl.STATIC_DRAW);
    },
    drawHelper: function () {
      cam.updateMatrix();

      gl.useProgram(cam.shaderProgram);

      gl.uniformMatrix4fv(cam.shaderLocations.uniformLocations.projectionMatrix, false, projectionMatrix);
      gl.uniformMatrix4fv(cam.shaderLocations.uniformLocations.modelViewMatrix, false, modelViewMatrix);

      gl.bindBuffer(gl.ARRAY_BUFFER, cam.camPosBuffer);
      gl.vertexAttribPointer(cam.shaderLocations.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(cam.shaderLocations.attribLocations.vertexPosition);

      gl.drawArrays(gl.POINTS, 0, cam.camPosArray.length/3);
    }
  };
  // set up array of cameras
  let halfSide = Math.floor(side / 2);
  for (let i=0; i<side; i++) {
    for (let j=0; j<side; j++) {
      let camView = {
        x: i * gl.canvas.width / side,
        y: j * gl.canvas.height / side,
        w: gl.canvas.width / side,
        h: gl.canvas.height / side
      };
      let newCam = new Camera(gl, fov, near, far, camView);
      vec3.set(newCam.translation, vec3.fromValues((i - halfSide) * spread, (j - halfSide) * spread, 0));
      cam.cameras.push(newCam);
    }
  }
  cam.updateCamPosArray();
  return cam;
}

function renderNoCam (gl, scene) {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(0, 0, gl.canvas.width, gl.canvas.height);

  for (let mesh of scene) {
    drawMesh(gl, mesh);
  }
  gl.disable(gl.SCISSOR_TEST);
}

function promiseTexture (gl, url) {
  return new Promise(function (resolve) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                  1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                  new Uint8Array([0, 0, 255, 255]));

    const image = new Image();
    image.onload = function() {
      texture.image = image;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                    gl.RGBA, gl.UNSIGNED_BYTE, image);

      if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
         gl.generateMipmap(gl.TEXTURE_2D);
      }
      else {
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      resolve(texture);
    };
    image.src = url;
  });
}

function makeGenericTexture (gl) {
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return texture;
}

function makeFramebuffer (gl) {
  // prep texture for drawing
  const texture = makeGenericTexture(gl);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                gl.canvas.width, gl.canvas.height, 0,
                gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // prep actual frameBuffer
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  return { buffer: fbo, texture };
}

function makeDepthBuffer (gl) {
  const depthBuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, gl.canvas.width, gl.canvas.height);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
  return depthBuffer;
}


function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}
