function renderNoCam (gl, scene) {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(0, 0, gl.canvas.width, gl.canvas.height);

  for (let mesh of scene) {
    drawMesh(gl, mesh);
  }
  gl.disable(gl.SCISSOR_TEST);
}

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

function Camera (gl, pos, tgt, fov, near, far, viewport) {
  const cam = {
    fov,
    pos,
    tgt,
    near,
    far,
    viewport,
    render (scene, dontLookAt) {
      dontLookAt = dontLookAt || false;
      gl.viewport(cam.viewport.x, cam.viewport.y, cam.viewport.w, cam.viewport.h);
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(cam.viewport.x, cam.viewport.y, cam.viewport.w, cam.viewport.h);

      if(!dontLookAt) {
        mat4.lookAt(modelViewMatrix, cam.pos, cam.tgt, vec3.fromValues(0, 1.0, 0));
      }
      mat4.perspective(projectionMatrix, cam.fov, cam.viewport.w/cam.viewport.h, cam.near, cam.far);
      mat3.normalFromMat4(normalMatrix, modelViewMatrix);

      for (let mesh of scene) {
        drawMesh(gl, mesh);
      }
      gl.disable(gl.SCISSOR_TEST);
    }
  };
  return cam;
}

function LightFieldCamera (gl, pos, tgt, fov, near, far, side, spread, helperProgram, helperLocations) {
  let cam = {
    pos,
    tgt,
    side,
    spread,
    cameras: [],
    camPosArray: [],
    camPosBuffer: gl.createBuffer(),
    shaderProgram: helperProgram,
    shaderLocations: helperLocations,
    render: function (scene) {
      for (let camera of cam.cameras) {
        camera.render(scene);
      }
    },
    updateCamPosArray: function () {
      cam.camPosArray = [];
      for (let camera of cam.cameras) {
        cam.camPosArray.push(camera.pos[0]);
        cam.camPosArray.push(camera.pos[1]);
        cam.camPosArray.push(camera.pos[2]);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, cam.camPosBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cam.camPosArray), gl.STATIC_DRAW);
    },
    drawHelper: function () {
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
      let camPos = vec3.create();
      vec3.add(camPos, pos, vec3.fromValues((i - halfSide) * spread, (j - halfSide) * spread, 0));
      let camView = {
        x: i * gl.canvas.width / side,
        y: j * gl.canvas.height / side,
        w: gl.canvas.width / side,
        h: gl.canvas.height / side
      };
      let camTgt = vec3.fromValues(camPos[0], camPos[1], 1000.0);
      let newCam = new Camera(gl, camPos, tgt, fov, near, far, camView);
      cam.cameras.push(newCam);
    }
  }
  cam.updateCamPosArray();
  return cam;
}

function drawMesh (gl, mesh) {
  const programInfo = mesh.shaderLocations;
  gl.useProgram(mesh.shaderProgram);

  gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
  gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

  if (typeof programInfo.uniformLocations.normalMatrix !== 'undefined') {
    gl.uniformMatrix3fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);
  }

  if (typeof programInfo.attribLocations.textureCoord !== 'undefined') {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.textureBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, mesh.textureBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
  }

  if (typeof mesh.texture0 !== 'undefined') {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, mesh.texture0);
    gl.uniform1i(programInfo.uniformLocations.texture0, 0);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
  gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

  if (typeof programInfo.attribLocations.vertexNormal !== 'undefined') {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, mesh.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);
  }

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
  gl.drawElements(gl.TRIANGLES, mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

function loadTexture (gl, url) {
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
  };
  image.src = url;

  return texture;
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
