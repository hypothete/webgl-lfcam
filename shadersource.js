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
  uniform sampler2D uTexture0;
  varying vec2 vTextureCoord;

  void main() {
    float noise = texture2D(uTexture0, vTextureCoord).r;
    float jitter = 0.0; // mix(-0.5/255.0, 0.5/255.0, noise);
    vec2 outColor = vTextureCoord + vec2(jitter);
    gl_FragColor = vec4(outColor, 0.0, 0.0);
  }
`;

const stplaneFrag = `
  precision highp float;
  uniform sampler2D uTexture0;
  varying vec2 vTextureCoord;

  void main() {
    float noise = texture2D(uTexture0, vTextureCoord).r;
    float jitter = 0.0; // mix(-0.5/255.0, 0.5/255.0, noise);
    vec2 outColor = vTextureCoord + vec2(jitter);
    gl_FragColor = vec4(0.0, 0.0, outColor);
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

    if (lookupTex.b <= 0.0) {
      discard;
    }

    vec2 uv = lookupTex.rg;
    vec2 st = lookupTex.ba;
    vec2 uvScale = uv * uMapScale;
    vec2 weight = fract(uvScale);
    vec2 uvMinOff = floor(uvScale) / uMapScale;
    vec2 uvMaxOff = ceil(uvScale) / uMapScale;
    vec2 stOff = st / uMapScale;

    vec2 sampleA = uvMinOff + stOff;
    vec2 sampleB = vec2(uvMaxOff.x, uvMinOff.y) + stOff;
    vec2 sampleC = vec2(uvMinOff.x, uvMaxOff.y) + stOff;
    vec2 sampleD = uvMaxOff + stOff;

    vec4 colorSampleA = texture2D(uTexture0, sampleA);
    vec4 colorSampleB = texture2D(uTexture0, sampleB);
    vec4 colorSampleC = texture2D(uTexture0, sampleC);
    vec4 colorSampleD = texture2D(uTexture0, sampleD);

    vec4 quadInterp = mix(
      mix(colorSampleA, colorSampleB, weight.x),
      mix(colorSampleC, colorSampleD, weight.x),
      weight.y
    );

    gl_FragColor = vec4(quadInterp.rgb, 1.0);
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
