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

  varying vec2 vTextureCoord;

  void main() {
    vTextureCoord = aTextureCoord;
    gl_Position = aVertexPosition;
  }
`;

const planeFrag = `
  precision highp float;
  uniform sampler2D uTexture0;
  uniform vec2 screenSize;
  uniform vec2 mapScale;
  uniform vec2 camPosition; // range 0,0 -> 1,1

  varying vec2 vTextureCoord;

  void main() {

    vec2 minCell = floor(vec2(1.0 - camPosition.x, camPosition.y) * mapScale) / mapScale;
    vec2 maxCell = ceil(vec2(1.0 - camPosition.x, camPosition.y) * mapScale) / mapScale;

    clamp(minCell, vec2(0.0), vec2(1.0));
    clamp(maxCell, vec2(0.0), vec2(1.0));

    vec2 scaledCoord = (gl_FragCoord.xy / screenSize) / mapScale;

    vec3 colA = texture2D(uTexture0, scaledCoord + vec2(minCell)).rgb;
    vec3 colB = texture2D(uTexture0, scaledCoord + vec2(maxCell.x, minCell.y)).rgb;
    vec3 colC = texture2D(uTexture0, scaledCoord + vec2(minCell.x, maxCell.y)).rgb;
    vec3 colD = texture2D(uTexture0, scaledCoord + vec2(maxCell)).rgb;

    vec2 blend = vec2(1.0 - camPosition.x, camPosition.y) - minCell;

    vec3 interp = mix(mix(colA, colC, blend.x), mix(colB, colD, blend.x), blend.y);

    gl_FragColor = vec4(interp, 1.0);
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
