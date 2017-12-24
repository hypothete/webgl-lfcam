const teapotVert = `
  attribute vec2 aTextureCoord;
  attribute vec4 aVertexPosition;
  attribute vec3 aVertexNormal;

  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;
  uniform mat3 uNormalMatrix;

  varying vec2 vTextureCoord;
  varying vec3 vLighting;

  void main() {
    vTextureCoord = aTextureCoord;
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;

    vec3 ambientLight = vec3(0.3, 0.3, 0.3);
    vec3 directionalLightColor = vec3(1, 1, 1);
    vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));

    vec3 transformedNormal = uNormalMatrix * aVertexNormal;

    float directional = max(dot(transformedNormal, directionalVector), 0.0);
    vLighting = ambientLight + (directionalLightColor * directional);
  }
`;

const teapotFrag = `
  precision highp float;

  uniform sampler2D uTexture0;

  varying vec2 vTextureCoord;
  varying vec3 vLighting;

  void main() {
    vec4 texelColor = texture2D(uTexture0, vTextureCoord);
    gl_FragColor = vec4(texelColor.rgb * vLighting, texelColor.a);
  }
`;

// const planeVert = `
//   attribute vec2 aTextureCoord;
//   attribute vec4 aVertexPosition;
//
//   uniform mat4 uModelViewMatrix;
//   uniform mat4 uProjectionMatrix;
//
//   varying vec2 vTextureCoord;
//   varying vec3 vGLPosition;
//
//   void main() {
//     vTextureCoord = aTextureCoord;
//     gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
//     vGLPosition = aVertexPosition.xyz;
//   }
// `;
//
// const planeFrag = `
//   precision highp float;
//   uniform sampler2D uTexture0;
//   uniform vec2 screenSize;
//   uniform vec2 mapScale;
//   uniform vec3 camPosition;
//
//   varying vec2 vTextureCoord;
//   varying vec3 vGLPosition;
//
//   void main() {
//     vec2 stPos = vTextureCoord;
//
//     vec3 imgTex = texture2D(uTexture0, vTextureCoord).rgb;
//
//     gl_FragColor = vec4(0.0, 0.0, vTextureCoord.x, vTextureCoord.y);
//   }
// `;

const planeVert = `
  attribute vec2 aTextureCoord;
  attribute vec4 aVertexPosition;

  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;

  varying vec2 vTextureCoord;

  void main() {
    vTextureCoord = aTextureCoord;
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
  }
`;

const uvplaneFrag = `
  precision highp float;

  varying vec2 vTextureCoord;

  void main() {
    gl_FragColor = vec4(vTextureCoord, 0.0, 1.0);
  }
`;

const stplaneFrag = `
  precision highp float;

  varying vec2 vTextureCoord;

  void main() {
    gl_FragColor = vec4(0.0, 0.0, vTextureCoord);
  }
`;


const helperVert = `
  attribute vec4 aVertexPosition;

  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;

  void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    gl_PointSize = 4.0;
  }
`;

const helperFrag = `
  precision highp float;

  void main() {
    gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
  }
`;
