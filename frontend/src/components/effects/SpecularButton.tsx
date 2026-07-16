import { useEffect, useRef, useState, forwardRef } from "react";
import { Renderer, Camera, Plane, Mesh, Program } from "ogl";
import "./SpecularButton.css";

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
  uniform vec2 uMouse;
  uniform vec2 uResolution;
  uniform float uIntensity;
  uniform float uShineSize;
  uniform float uShineFade;
  uniform float uThickness;
  uniform float uSpeed;
  uniform vec3 uLineColor;
  uniform vec3 uBaseColor;
  uniform float uProximity;
  uniform float uAutoAnimate;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);

    vec2 mouseNorm = uMouse * 0.5 + 0.5;
    mouseNorm.y = 1.0 - mouseNorm.y;

    float distToMouse = length((uv - mouseNorm) * aspect);
    float mouseInfluence = 1.0 - smoothstep(0.0, uProximity / uResolution.y, distToMouse);

    float shine = mouseInfluence * uIntensity;
    float edgeX = abs(uv.x - 0.5) * 2.0;
    float edgeY = abs(uv.y - 0.5) * 2.0;
    float edge = max(edgeX, edgeY);

    float shinePattern = exp(-edge * uShineFade) * shine * uShineSize * 0.1;

    vec3 baseCol = uBaseColor * (1.0 - shinePattern * 0.3);

    float rim = pow(edge, 3.0) * uThickness * 0.5;
    vec3 rimColor = uLineColor * rim;

    float specular = pow(max(0.0, 1.0 - distToMouse * 4.0), 4.0) * uIntensity * 0.4;
    vec3 specColor = vec3(1.0) * specular;

    vec3 finalColor = baseCol + rimColor + specColor + uLineColor * shinePattern;

    float alpha = smoothstep(1.0, 0.95, edge) + rim * 0.3;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

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

interface SpecularButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "default" | "sm" | "lg";
  radius?: number;
  lineColor?: string;
  baseColor?: string;
  textColor?: string;
  intensity?: number;
  shineSize?: number;
  shineFade?: number;
  thickness?: number;
  speed?: number;
  followMouse?: boolean;
  proximity?: number;
  autoAnimate?: boolean;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

const SIZE_CLASSES = {
  sm: "h-9 px-4 text-sm rounded-lg",
  default: "h-11 px-5 text-sm rounded-md",
  lg: "h-12 px-8 text-base rounded-lg",
};

export const SpecularButton = forwardRef<HTMLButtonElement, SpecularButtonProps>(
  function SpecularButton(
    {
      size = "lg",
      radius = 14,
      lineColor = "#2DD4BF",
      baseColor = "#0D1526",
      textColor = "#E9ECF5",
      intensity = 1,
      shineSize = 12,
      shineFade = 35,
      thickness = 1,
      speed = 0.3,
      followMouse = true,
      proximity = 220,
      autoAnimate = false,
      disabled,
      className,
      children,
      ...rest
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [webglFailed, setWebglFailed] = useState(false);
    const mouseRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
      if (!canvasRef.current || disabled || !isWebGLAvailable()) return;

      const canvas = canvasRef.current;
      let destroyed = false;

      try {
        const parent = canvas.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        const w = rect.width || 200;
        const h = rect.height || 48;

        canvas.width = w * window.devicePixelRatio;
        canvas.height = h * window.devicePixelRatio;

        const renderer = new Renderer({ canvas, alpha: true, antialias: false });
        const gl = renderer.gl;
        if (!gl || destroyed) return;

        renderer.setSize(w, h);

        const camera = new Camera(gl);
        const geometry = new Plane(gl, { width: 2, height: 1 });

        const lc = hexToRgb(lineColor);
        const bc = hexToRgb(baseColor);

        const program = new Program(gl, {
          vertex: VERT,
          fragment: FRAG,
          uniforms: {
            uTime: { value: 0 },
            uMouse: { value: [0.5, 0.5] },
            uResolution: { value: [w, h] },
            uIntensity: { value: intensity },
            uShineSize: { value: shineSize },
            uShineFade: { value: shineFade },
            uThickness: { value: thickness },
            uSpeed: { value: speed },
            uLineColor: { value: lc },
            uBaseColor: { value: bc },
            uProximity: { value: proximity },
            uAutoAnimate: { value: autoAnimate ? 1 : 0 },
          },
        });

        const mesh = new Mesh(gl, { geometry, program });

        const onPointerMove = (e: PointerEvent) => {
          if (destroyed || !followMouse) return;
          const r = canvas.getBoundingClientRect();
          mouseRef.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
          mouseRef.current.y = ((e.clientY - r.top) / r.height) * 2 - 1;
        };

        if (followMouse) {
          window.addEventListener("pointermove", onPointerMove, { passive: true });
        }

        let raf: number;
        const startTime = performance.now();

        const render = () => {
          if (destroyed) return;
          raf = requestAnimationFrame(render);

          const elapsed = (performance.now() - startTime) * 0.001;
          program.uniforms.uTime.value = elapsed;
          program.uniforms.uMouse.value = [mouseRef.current.x, mouseRef.current.y];

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
      disabled, followMouse, lineColor, baseColor, intensity,
      shineSize, shineFade, thickness, speed, proximity, autoAnimate,
    ]);

    if (webglFailed) {
      return (
        <button
          ref={ref}
          disabled={disabled}
          className={`inline-flex items-center justify-center gap-2.5 font-medium transition-all duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] cursor-pointer disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1526] h-12 px-8 text-base rounded-lg ${className ?? ""}`}
          style={{ background: baseColor, color: textColor, border: `1px solid ${lineColor}33` }}
          {...rest}
        >
          {children}
        </button>
      );
    }

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`specular-btn ${SIZE_CLASSES[size]} ${className ?? ""}`}
        style={{
          color: textColor,
          borderRadius: radius,
          background: "transparent",
        }}
        {...rest}
      >
        <canvas ref={canvasRef} aria-hidden="true" />
        <span className="specular-btn-label">{children}</span>
      </button>
    );
  }
);
