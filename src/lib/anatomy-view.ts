import { ANATOMY_B64, ANATOMY_PARTS, ANATOMY_SCALE, ANATOMY_VERTEX_BYTES, type AnatomyPart } from "@/lib/anatomy-data";

/**
 * Minimal WebGL viewer for the anatomy model: no dependency, drag to turn, pinch or wheel to zoom,
 * tap to pick an organ. Pure TypeScript, no React.
 * Model: BodyParts3D (CC BY-SA 2.1 Japan), see anatomy-data.ts.
 */

export type ViewState = {
  /** Areas marked by the person (editable mode). */
  selected: string[];
  /** Read-only heat: days each area was marked. */
  counts?: Record<string, number> | undefined;
  showOrgans: boolean;
  showBones: boolean;
};

export type Picked = { area: string; label: string };

export type AnatomyView = {
  setState: (s: ViewState) => void;
  resetView: () => void;
  destroy: () => void;
};

const VS = `
attribute vec3 aPos;
attribute vec3 aNor;
uniform mat4 uMvp;
uniform mat3 uRot;
uniform float uScale;
varying vec3 vN;
void main() {
  vN = uRot * aNor;
  gl_Position = uMvp * vec4(aPos / uScale, 1.0);
}`;

const FS = `
precision mediump float;
varying vec3 vN;
uniform vec3 uColor;
uniform vec3 uTint;
uniform float uTintAmt;
uniform float uAlpha;
uniform float uSkin;
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  float d1 = max(dot(n, normalize(vec3(0.35, 0.55, 0.75))), 0.0);
  float d2 = max(dot(n, normalize(vec3(-0.6, -0.2, 0.4))), 0.0);
  float light = 0.38 + 0.62 * d1 + 0.22 * d2;
  vec3 base = mix(uColor, uTint, uTintAmt);
  vec3 col = base * light;
  float spec = pow(max(dot(n, normalize(vec3(0.3, 0.5, 0.9))), 0.0), 24.0) * 0.18;
  col += vec3(spec) * (1.0 - uSkin);
  float a = uAlpha;
  if (uSkin > 0.5) {
    float rim = pow(1.0 - abs(n.z), 2.2);
    a = uAlpha + 0.3 * rim;
    col = mix(vec3(0.78, 0.86, 0.88), vec3(0.45, 0.72, 0.7), rim);
  }
  gl_FragColor = vec4(col * a, a);
}`;

const HEAT: [number, number, number] = [0.95, 0.35, 0.2];

type M3 = number[]; // row-major 3x3
const mul3 = (a: M3, b: M3): M3 => {
  const o: M3 = new Array(9).fill(0);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += a[r * 3 + k]! * b[k * 3 + c]!;
      o[r * 3 + c] = s;
    }
  }
  return o;
};

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Area of a point on the skin. x,y,z in model units (height -1..1, +x is the person's left, +z is the front). */
export function skinArea(x: number, y: number, z: number): string {
  const mm = 1642 / 2;
  const h = (y + 1) * mm; // millimetres above the soles
  const ax = Math.abs(x) * mm;
  if (h > 1435) return "head";
  const side = x < 0 ? "right" : "left";
  if (h < 860) return `${side}_leg`;
  if (ax > 200 && h > 640) return `${side}_arm`;
  if (z < 0) return "back";
  return h > 1185 ? "chest" : "abdomen";
}

export function createAnatomyView(canvas: HTMLCanvasElement, onPick?: (p: Picked) => void): AnatomyView | null {
  const gl = (canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: true }) ||
    canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
  if (!gl) return null;

  // ---- decode the model
  const bin = atob(ANATOMY_B64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const vbytes = bytes.slice(0, ANATOMY_VERTEX_BYTES);
  const idx = new Uint16Array(bytes.slice(ANATOMY_VERTEX_BYTES).buffer);
  const nVerts = ANATOMY_VERTEX_BYTES / 10;
  const dv = new DataView(vbytes.buffer);
  const pos = new Float32Array(nVerts * 3);
  for (let i = 0; i < nVerts; i++) {
    for (let k = 0; k < 3; k++) pos[i * 3 + k] = dv.getInt16(i * 10 + k * 2, true) / ANATOMY_SCALE;
  }

  // ---- program
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
    return s;
  };
  let prog: WebGLProgram;
  try {
    prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
  } catch {
    return null;
  }
  gl.useProgram(prog);
  const loc = (n: string) => gl.getUniformLocation(prog, n);
  const uMvp = loc("uMvp"), uRot = loc("uRot"), uScale = loc("uScale"), uColor = loc("uColor");
  const uTint = loc("uTint"), uTintAmt = loc("uTintAmt"), uAlpha = loc("uAlpha"), uSkin = loc("uSkin");

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vbytes, gl.STATIC_DRAW);
  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos"), aNor = gl.getAttribLocation(prog, "aNor");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 3, gl.SHORT, false, 10, 0);
  gl.enableVertexAttribArray(aNor);
  gl.vertexAttribPointer(aNor, 3, gl.BYTE, true, 10, 6);
  gl.uniform1f(uScale, ANATOMY_SCALE);

  const colors = new Map<string, [number, number, number]>(ANATOMY_PARTS.map((p) => [p.id, hex(p.color)]));
  const skin = ANATOMY_PARTS.find((p) => p.group === "skin")!;

  // ---- camera
  const HOME = { yaw: 0, pitch: 0.06, dist: 4.5 };
  let yaw = HOME.yaw, pitch = HOME.pitch, dist = HOME.dist;
  let auto = true;
  let state: ViewState = { selected: [], showOrgans: true, showBones: false };
  let raf = 0;
  let dirty = true;
  const FOV = (32 * Math.PI) / 180;

  const rot = (): M3 => {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch);
    const ry: M3 = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
    const rx: M3 = [1, 0, 0, 0, cx, -sx, 0, sx, cx];
    return mul3(rx, ry);
  };

  const strength = (area: string) => {
    if (!area) return 0;
    if (state.counts) {
      const max = Math.max(1, ...Object.values(state.counts));
      return (state.counts[area] ?? 0) / max;
    }
    return state.selected.includes(area) ? 1 : 0;
  };

  const visible = (p: AnatomyPart) => {
    if (p.group === "skin") return true;
    if (strength(p.area) > 0) return true;
    return p.group === "organ" ? state.showOrgans : state.showBones;
  };

  const draw = () => {
    dirty = false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const R = rot();
    const aspect = w / h;
    const f = 1 / Math.tan(FOV / 2);
    const near = 0.1, far = 20;
    const P = [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0];
    // column-major view * projection: V = [R | (0,0,-dist)]
    const V = [R[0]!, R[3]!, R[6]!, 0, R[1]!, R[4]!, R[7]!, 0, R[2]!, R[5]!, R[8]!, 0, 0, 0, -dist, 1];
    const mvp = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += P[k * 4 + r]! * V[c * 4 + k]!;
      mvp[c * 4 + r] = s;
    }
    gl.uniformMatrix4fv(uMvp, false, mvp);
    // normal matrix for column-major mat3 upload (WebGL1 needs transpose=false): upload R transposed
    gl.uniformMatrix3fv(uRot, false, new Float32Array([R[0]!, R[3]!, R[6]!, R[1]!, R[4]!, R[7]!, R[2]!, R[5]!, R[8]!]));

    const drawPart = (p: AnatomyPart, alpha: number, isSkin: boolean) => {
      const s = strength(p.area);
      const c = colors.get(p.id)!;
      gl.uniform3f(uColor, c[0], c[1], c[2]);
      gl.uniform3f(uTint, HEAT[0], HEAT[1], HEAT[2]);
      gl.uniform1f(uTintAmt, state.counts ? 0.75 * s : s > 0 ? 0.7 : 0);
      gl.uniform1f(uAlpha, alpha);
      gl.uniform1f(uSkin, isSkin ? 1 : 0);
      gl.drawElements(gl.TRIANGLES, p.ic, gl.UNSIGNED_SHORT, p.i0 * 2);
    };

    gl.disable(gl.CULL_FACE);
    gl.depthMask(true);
    for (const p of ANATOMY_PARTS) if (p.group !== "skin" && visible(p)) drawPart(p, 1, false);
    // the skin is a faint glass shell, drawn last without writing depth
    gl.depthMask(false);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    drawPart(skin, 0.04, true);
    gl.depthMask(true);
  };

  const loop = () => {
    if (auto) {
      yaw += 0.006;
      dirty = true;
    }
    if (dirty) draw();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  // ---- picking (ray against the visible meshes)
  const pickAt = (clientX: number, clientY: number): Picked | null => {
    const rect = canvas.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
    const t = Math.tan(FOV / 2);
    const aspect = rect.width / rect.height;
    const dv0 = [nx * t * aspect, ny * t, -1];
    const len = Math.hypot(dv0[0]!, dv0[1]!, dv0[2]!);
    const R = rot();
    // world = R^T * view
    const dir = [0, 1, 2].map((i) => (R[i]! * dv0[0]! + R[3 + i]! * dv0[1]! + R[6 + i]! * dv0[2]!) / len);
    const org = [0, 1, 2].map((i) => R[6 + i]! * dist);
    let best = Infinity;
    let bestPart: AnatomyPart | null = null;
    let hit: number[] = [0, 0, 0];
    const test = (p: AnatomyPart) => {
      for (let t0 = p.i0; t0 < p.i0 + p.ic; t0 += 3) {
        const a = idx[t0]! * 3, b = idx[t0 + 1]! * 3, c = idx[t0 + 2]! * 3;
        const e1x = pos[b]! - pos[a]!, e1y = pos[b + 1]! - pos[a + 1]!, e1z = pos[b + 2]! - pos[a + 2]!;
        const e2x = pos[c]! - pos[a]!, e2y = pos[c + 1]! - pos[a + 1]!, e2z = pos[c + 2]! - pos[a + 2]!;
        const px = dir[1]! * e2z - dir[2]! * e2y, py = dir[2]! * e2x - dir[0]! * e2z, pz = dir[0]! * e2y - dir[1]! * e2x;
        const det = e1x * px + e1y * py + e1z * pz;
        if (Math.abs(det) < 1e-12) continue;
        const inv = 1 / det;
        const tx = org[0]! - pos[a]!, ty = org[1]! - pos[a + 1]!, tz = org[2]! - pos[a + 2]!;
        const u = (tx * px + ty * py + tz * pz) * inv;
        if (u < 0 || u > 1) continue;
        const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
        const v = (dir[0]! * qx + dir[1]! * qy + dir[2]! * qz) * inv;
        if (v < 0 || u + v > 1) continue;
        const d = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (d > 0 && d < best) {
          best = d;
          bestPart = p;
          hit = [org[0]! + dir[0]! * d, org[1]! + dir[1]! * d, org[2]! + dir[2]! * d];
        }
      }
    };
    for (const p of ANATOMY_PARTS) if (p.group !== "skin" && visible(p)) test(p);
    if (bestPart) {
      const bp = bestPart as AnatomyPart;
      return { area: bp.area, label: bp.label };
    }
    test(skin);
    if (bestPart) return { area: skinArea(hit[0]!, hit[1]!, hit[2]!), label: "Body" };
    return null;
  };

  // ---- input
  const pointers = new Map<number, { x: number; y: number }>();
  let downAt: { x: number; y: number } | null = null;
  let moved = 0;
  let pinch = 0;
  const onDown = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      downAt = { x: e.clientX, y: e.clientY };
      moved = 0;
    }
    auto = false;
  };
  const onMove = (e: PointerEvent) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    if (pointers.size === 1) {
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      yaw += dx * 0.01;
      pitch = Math.max(-1.2, Math.min(1.2, pitch + dy * 0.008));
      moved += Math.abs(dx) + Math.abs(dy);
      dirty = true;
    } else if (pointers.size === 2) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (pinch > 0) dist = Math.max(1.6, Math.min(6.5, dist * (pinch / d)));
      pinch = d;
      moved += 10;
      dirty = true;
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    pinch = 0;
    if (pointers.size === 0 && downAt && moved < 6 && onPick) {
      const r = pickAt(e.clientX, e.clientY);
      if (r) onPick(r);
    }
    if (pointers.size === 0) downAt = null;
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    dist = Math.max(1.6, Math.min(6.5, dist * (1 + Math.sign(e.deltaY) * 0.08)));
    auto = false;
    dirty = true;
  };
  canvas.style.touchAction = "none";
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  return {
    setState(s) {
      state = s;
      dirty = true;
    },
    resetView() {
      yaw = HOME.yaw;
      pitch = HOME.pitch;
      dist = HOME.dist;
      auto = true;
      dirty = true;
    },
    destroy() {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
