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

const planeUVVert = `
  attribute vec4 aVertexPosition;
  attribute vec2 aTextureCoord;

  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;

  varying vec2 vTextureCoord;

  void main() {
    vTextureCoord = aTextureCoord;
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
  }
`;

const planeUVFrag = `
  precision highp float;

  varying vec2 vTextureCoord;

  void main() {
    gl_FragColor = vec4(vTextureCoord, 0.0, 1.0);
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
  uniform sampler2D uLFTex;
  uniform vec2 screenSize;
  uniform vec2 mapScale;

  varying vec2 vTextureCoord;

  void main() {
    vec2 targetUV  = texture2D(uSampler, gl_FragCoord.xy/screenSize).rg;

    if (targetUV.x<=0.0 || targetUV.y<=0.0 || targetUV.x>=1.0 || targetUV.y>=1.0) {
        discard;
    }

    vec2 sampleUV = targetUV;
    vec2 dirVec = (sampleUV - vTextureCoord)*(-1.0, 1.0) + (0.5,0.5);

    vec2 uvOffset = sampleUV/mapScale;
    vec2 dirScale = dirVec * mapScale;

    vec2 minDir = floor(dirScale) / mapScale;
    vec2 maxDir = ceil(dirScale) / mapScale;
    vec2 weight = fract(dirScale);

    vec3 colour1 = texture2D(uLFTex, minDir + uvOffset).rgb;
    vec3 colour2 = texture2D(uLFTex, vec2(minDir.x, maxDir.y) + uvOffset).rgb;
    vec3 colour3 = texture2D(uLFTex, vec2(maxDir.x, minDir.y) + uvOffset).rgb;
    vec3 colour4 = texture2D(uLFTex, maxDir + uvOffset).rgb;

    vec3 colour = mix(
      mix(colour1, colour3, weight.x),
      mix(colour2, colour4, weight.x),
      weight.y
    );
    colour = vec3(vTextureCoord, 0.0);
    gl_FragColor = vec4(colour, 1.0);
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
