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

const holoPlaneVert = `
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

const holoPlaneFrag = `
  precision highp float;
  uniform sampler2D uTexture0; // sceneA framebuffer
  uniform sampler2D uTexture1; // sceneB framebuffer
  uniform vec2 uScreenSize;
  uniform vec2 uMapScale;

  varying vec2 vTextureCoord;

  void main() {
    vec4 lookupTex = texture2D(uTexture1, gl_FragCoord.xy / uScreenSize);

    if (lookupTex.r <= 0.0 || lookupTex.g <= 0.0 || lookupTex.b <= 0.0) {
      discard;
    }

    vec2 st = lookupTex.ba;
    vec2 uv = lookupTex.rg;

    vec2 uvOffset = floor(uv * uMapScale) / uMapScale;
    vec2 stOffset = st;
    vec3 mapLookup = texture2D(uTexture0, uvOffset/uMapScale.x).rgb;

    gl_FragColor = vec4(lookupTex.rgb, 1.0);
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
