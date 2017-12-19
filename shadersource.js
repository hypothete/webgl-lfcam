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

  uniform sampler2D uSampler;

  varying vec2 vTextureCoord;
  varying vec3 vLighting;

  void main() {
    vec4 texelColor = texture2D(uSampler, vTextureCoord);
    gl_FragColor = vec4(texelColor.rgb * vLighting, texelColor.a);
  }
`;

const planeVert = `
  attribute vec2 aTextureCoord;
  attribute vec4 aVertexPosition;
  attribute vec3 aVertexNormal;

  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;
  uniform mat3 uNormalMatrix;

  varying vec2 vTextureCoord;

  void main() {
    vTextureCoord = aTextureCoord;
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    vec3 transformedNormal = uNormalMatrix * aVertexNormal;
  }
`;

const planeFrag = `
  precision highp float;

  uniform sampler2D uSampler;
  uniform vec2 screenSize;
  uniform vec2 mapScale;

  varying vec2 vTextureCoord;

  void main() {
    vec2 tiny = gl_FragCoord.xy/(screenSize * mapScale);

    if (tiny.x < 0.0 || tiny.x > 1.0 || tiny.y < 0.0 || tiny.y > 1.0) {
      discard;
    }
    tiny = vTextureCoord;
    vec4 texelColor = texture2D(uSampler, tiny);
    vec2 mapOffset = vec2(floor(mapScale.x/2.0), floor(mapScale.y/2.0)); //centered
    mapOffset = mapOffset + vec2(-2.0, 0.0);
    mapOffset = mapOffset / mapScale;
    vec2 mapCoord = vTextureCoord/mapScale + mapOffset;
    texelColor = texture2D(uSampler, mapCoord);
    gl_FragColor = vec4(texelColor.rgb, 1.0);
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
