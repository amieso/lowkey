'use client'

import { useEffect, useRef } from 'react'

/**
 * Sunrise light-strip intro backdrop, rendered on the GPU.
 *
 * A single fullscreen fragment shader paints a Porsche-style horizontal light
 * strip: born as a point at the centre, it expands laterally to full width with
 * a leading-edge bloom, lit by a warm sunrise gradient (hot core → amber → rose
 * toward the tips). The parent owns the timeline and feeds a 0→1 value through
 * `progressRef`; this component just runs a cheap requestAnimationFrame loop
 * that reads `.current` each frame. Driving progress through a ref (not a prop)
 * keeps React out of the 60fps path.
 *
 * If WebGL is unavailable the canvas is left transparent and the parent's CSS
 * fallback shows through — the intro never traps the visitor.
 */

interface SunriseShaderProps {
  /** Mutable 0→1 sunrise progress, read every animation frame. */
  progressRef: React.MutableRefObject<number>
  className?: string
}

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

// All tunables live as named consts in the shader so retuning to the real
// reference frames is a one-line edit each.
const FRAG = `
precision highp float;

uniform vec2 uRes;
uniform float uProgress;
uniform float uTime;

const vec3  BG          = vec3(0.039, 0.039, 0.039); // #0a0a0a background
const float STRIP_Y     = 0.5;    // vertical centre of the strip
const float MAX_HALF_LEN= 0.58;   // half-length at full expand (× aspect)
const float END_FEATHER = 0.05;   // softness of the expanding tips
const float CORE_FALLOFF= 320.0;  // tighter = thinner hot core
const float GLOW_FALLOFF= 38.0;   // smaller = taller bloom band
const float SKY_FALLOFF  = 4.5;   // upward sunrise wash above the strip

// sunrise gradient sampled across the strip: hot core → amber → rose tips
const vec3 CORE_COL  = vec3(1.000, 0.965, 0.880);
const vec3 INNER_COL = vec3(1.000, 0.780, 0.450);
const vec3 OUTER_COL = vec3(0.960, 0.350, 0.450);

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes.xy;     // origin bottom-left
  float aspect = uRes.x / uRes.y;
  float p = uProgress;

  float x = (uv.x - 0.5) * aspect;         // aspect-corrected, 0 at centre
  float y = uv.y - STRIP_Y;

  // lateral growth from the centre outward
  float halfLen = p * MAX_HALF_LEN * aspect;
  float along = 1.0 - smoothstep(halfLen - END_FEATHER, halfLen + END_FEATHER, abs(x));

  // vertical profile: a tight hot core inside a softer bloom band
  float core = exp(-abs(y) * CORE_FALLOFF);
  float glow = exp(-abs(y) * GLOW_FALLOFF);
  float intensity = (core * 1.4 + glow * 0.8) * along;

  // leading-edge bloom riding the expanding tips — sells the lateral sweep
  float lead = exp(-pow((abs(x) - halfLen) / 0.045, 2.0)) * exp(-abs(y) * 70.0);
  intensity += lead * 1.1 * smoothstep(0.02, 0.12, p) * (1.0 - p * 0.35);

  // colour across the strip
  float t = clamp(abs(x) / max(halfLen, 1e-4), 0.0, 1.0);
  vec3 stripCol = mix(INNER_COL, OUTER_COL, smoothstep(0.30, 1.0, t));
  stripCol = mix(CORE_COL, stripCol, smoothstep(0.0, 0.25, t));

  vec3 col = BG + stripCol * intensity;

  // faint sunrise wash rising above the strip
  float sky = exp(-max(y, 0.0) * SKY_FALLOFF) * 0.16 * along;
  col += INNER_COL * sky;

  // bloom the point on at the very start
  col = mix(BG, col, smoothstep(0.0, 0.06, p));

  // dither to kill banding on the dark background
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) / 255.0;

  gl_FragColor = vec4(col, 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[sunrise] shader compile failed:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export function SunriseShader({ progressRef, className }: SunriseShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl =
      (canvas.getContext('webgl', { antialias: false, alpha: false }) as WebGLRenderingContext | null) ??
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    if (!gl) return // CSS fallback shows through

    const vert = compile(gl, gl.VERTEX_SHADER, VERT)
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vert || !frag) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[sunrise] program link failed:', gl.getProgramInfoLog(program))
      return
    }
    gl.useProgram(program)

    // Fullscreen triangle — cheaper than a quad, no index buffer needed.
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(program, 'uRes')
    const uProgress = gl.getUniformLocation(program, 'uProgress')
    const uTime = gl.getUniformLocation(program, 'uTime')

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      const w = Math.floor(canvas.clientWidth * dpr)
      const h = Math.floor(canvas.clientHeight * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
    }
    resize()
    window.addEventListener('resize', resize)

    let raf = 0
    const start = performance.now()
    const render = (now: number) => {
      resize()
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uProgress, progressRef.current)
      gl.uniform1f(uTime, (now - start) / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      gl.deleteProgram(program)
      gl.deleteShader(vert)
      gl.deleteShader(frag)
      gl.deleteBuffer(buffer)
    }
  }, [progressRef])

  return <canvas ref={canvasRef} className={className} />
}
