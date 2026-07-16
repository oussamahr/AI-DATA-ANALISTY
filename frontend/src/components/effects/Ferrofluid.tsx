import { useEffect, useRef, useState } from "react";
import { Renderer, Camera, Plane, Mesh, Program, Flowmap, RenderTarget } from "ogl";
import "./Ferrofluid.css";

const VERT = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uScale;
  uniform float uTurbulence;
  uniform float uFluidity;
  uniform float uRimWidth;
  uniform float uSharpness;
  uniform float uShimmer;
  uniform float uGlow;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform vec3 uBackgroundColor;
  uniform float uOpacity;
  uniform sampler2D uFboTexture;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    vec4 flowState = texture2D(uFboTexture, uv);
    vec2 flowVelocity = flowState.rg * 2.0 - 1.0;

    float turbulence = uTurbulence * 0.5;
    float distortion = length(flowVelocity) * turbulence;

    vec2 distortedUv = uv + flowVelocity * uFluidity;

    float t = uTime * uSpeed * 0.1;
    float pattern = sin(distortedUv.x * uScale + t) * cos(distortedUv.y * uScale - t * 0.7);
    pattern += sin(distortedUv.x * uScale * 1.5 - t * 0.5) * 0.5;
    pattern = pattern * 0.5 + 0.5;

    float rim = smoothstep(0.0, uRimWidth, pattern) - smoothstep(uRimWidth, uRimWidth * 2.0, pattern);
    rim = pow(rim, uSharpness);

    vec3 color = mix(uBackgroundColor, uColor1, pattern * 0.3);
    color = mix(color, uColor2, rim * 0.6);
    color = mix(color, uColor3, distortion * 0.4);

    float shimmerVal = sin(uv.x * 20.0 + uTime * 2.0) * sin(uv.y * 20.0 - uTime * 1.5);
    shimmerVal = pow(max(shimmerVal, 0.0), 3.0) * uShimmer * 0.15;
    color += shimmerVal;

    float glowVal = pow(distortion, 2.0) * uGlow * 0.2;
    color += uColor1 * glowVal;

    gl_FragColor = vec4(color, uOpacity);
  }
`;

interface FerrofluidProps {
  colors?: [string, string, string];
  backgroundColor?: string;
  speed?: number;
  scale?: number;
  turbulence?: number;
  fluidity?: number;
  rimWidth?: number;
  sharpness?: number;
  shimmer?: number;
  glow?: number;
  flowDirection?: "up" | "down" | "left" | "right";
  opacity?: number;
  mouseInteraction?: boolean;
  paused?: boolean;
  className?: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export function Ferrofluid({
  colors = ["#2DD4BF", "#8B7FF5", "#0D1526"],
  backgroundColor = "#090E1A",
  speed = 0.35,
  scale = 1.4,
  turbulence = 0.8,
  fluidity = 0.15,
  rimWidth = 0.18,
  sharpness = 2.5,
  shimmer = 1.2,
  glow = 1.6,
  opacity = 0.9,
  mouseInteraction = false,
  paused = false,
  className,
}: FerrofluidProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || paused || !isWebGLAvailable()) return;

    const canvas = canvasRef.current;
    let destroyed = false;

    try {
      const renderer = new Renderer({ canvas, alpha: true, antialias: false });
      const gl = renderer.gl;
      if (!gl || destroyed) return;

      const width = canvas.parentElement?.clientWidth || 800;
      const height = canvas.parentElement?.clientHeight || 600;
      renderer.setSize(width, height);

      const camera = new Camera(gl);

      const flowmap = new Flowmap(gl, {
        size: 128,
        falloff: 0.92,
        dissipation: 0.97,
        alpha: 0.5,
      });

      const fb = new RenderTarget(gl, {
        width: 128,
        height: 128,
        type: gl.UNSIGNED_BYTE,
        depth: false,
      });

      const geometry = new Plane(gl, { width: 2, height: 1 });

      const [c1, c2, c3] = colors.map(hexToRgb);
      const bgRgb = hexToRgb(backgroundColor);

      const program = new Program(gl, {
        vertex: VERT,
        fragment: FRAG,
        uniforms: {
          uTime: { value: 0 },
          uSpeed: { value: speed },
          uScale: { value: scale },
          uTurbulence: { value: turbulence },
          uFluidity: { value: fluidity },
          uRimWidth: { value: rimWidth },
          uSharpness: { value: sharpness },
          uShimmer: { value: shimmer },
          uGlow: { value: glow },
          uColor1: { value: c1 },
          uColor2: { value: c2 },
          uColor3: { value: c3 },
          uBackgroundColor: { value: bgRgb },
          uOpacity: { value: opacity },
          uFboTexture: { value: fb.texture },
        },
      });

      const mesh = new Mesh(gl, { geometry, program });

      let flowX = 0;
      let flowY = 0;

      const onPointerMove = (e: PointerEvent) => {
        if (!mouseInteraction || destroyed) return;
        const rect = canvas.getBoundingClientRect();
        const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const my = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        flowX += mx * 0.02;
        flowY += my * 0.02;
      };

      if (mouseInteraction) {
        window.addEventListener("pointermove", onPointerMove, { passive: true });
      }

      let raf: number;
      const startTime = performance.now();

      const render = () => {
        if (destroyed) return;
        raf = requestAnimationFrame(render);

        const elapsed = (performance.now() - startTime) * 0.001;
        program.uniforms.uTime.value = elapsed;

        if (mouseInteraction) {
          flowmap.mouse.set(flowX, flowY);
          flowmap.velocity.set(flowX, flowY);
          flowmap.aspect = width / height;
          flowmap.update();
          flowX *= 0.95;
          flowY *= 0.95;
        }

        renderer.render({ scene: mesh, camera, target: fb });
        program.uniforms.uFboTexture.value = fb.texture;
        renderer.render({ scene: mesh, camera });
      };

      render();

      return () => {
        destroyed = true;
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onPointerMove);
      };
    } catch {
      setWebglFailed(true);
    }
  }, [
    paused, colors, backgroundColor, speed, scale, turbulence,
    fluidity, rimWidth, sharpness, shimmer, glow, opacity, mouseInteraction,
  ]);

  if (webglFailed || paused) return null;

  return (
    <div className={`ferrofluid-container ${className ?? ""}`}>
      <canvas
        ref={canvasRef}
        className="ferrofluid-canvas"
        aria-hidden="true"
      />
    </div>
  );
}
