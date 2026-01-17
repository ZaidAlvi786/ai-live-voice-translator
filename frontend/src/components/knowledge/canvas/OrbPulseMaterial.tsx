import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

const OrbPulseMaterial = shaderMaterial(
    {
        uTime: 0,
        uColor: new THREE.Color(0.03, 0.95, 1.0), // #00F2FF
        uPulseStrength: 1.0,
        uNoiseScale: 2.0
    },
    // Vertex Shader
    `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float uTime;
    uniform float uPulseStrength;

    // Simplex Noise (simplified for perf)
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        // First corner
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        // Other corners
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
        vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y
        // Permutations
        i = mod289(i);
        vec4 p = permute( permute( permute(
                 i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
               + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 0.142857142857; // 1.0/7.0
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        
        // Biological Pulse Distortion
        float noise = snoise(position * 2.0 + uTime * 0.5);
        float pulse = sin(uTime * 3.0) * 0.5 + 0.5; // Heartbeat sine
        
        vec3 newPos = position + normal * (noise * 0.1 * uPulseStrength * pulse);
        
        vPosition = newPos;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
    }
    `,
    // Fragment Shader
    `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform vec3 uColor;
    uniform float uTime;
    
    void main() {
        // Fresnel Effect for glowing edges
        vec3 viewDir = normalize(cameraPosition - vPosition);
        float fresnel = pow(1.0 - dot(viewDir, vNormal), 3.0);
        
        // Internal glow core
        float core = smoothstep(0.0, 1.0, 1.0 - length(vPosition) * 0.5);
        
        // Pulse wave
        float wave = sin(length(vPosition) * 10.0 - uTime * 5.0) * 0.5 + 0.5;
        
        vec3 finalColor = uColor * (fresnel + core * 0.5 + wave * 0.2);
        
        gl_FragColor = vec4(finalColor, 0.8 * fresnel + 0.4); // Additive transparency
    }
    `
);

extend({ OrbPulseMaterial });

export { OrbPulseMaterial };
