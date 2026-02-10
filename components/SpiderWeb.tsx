'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

// ── Configuration ──────────────────────────────────────────────
const GRID_SPACING = 40;
const LEG_COUNT = 8;
const LEG_REACH = 120;
const BODY_RADIUS = 10;
const HEAD_RADIUS = 6;
const ABDOMEN_RX = 14;
const ABDOMEN_RY = 11;
const EYE_RADIUS = 1.8;

// ── Magnetic behaviour ─────────────────────────────────────────
const MAG_DOT_PULL_RADIUS = 50;
const MAG_DOT_PULL_RADIUS_SQ = MAG_DOT_PULL_RADIUS * MAG_DOT_PULL_RADIUS;
const MAG_DOT_PULL_STRENGTH = 8;
const MAG_ARC_RADIUS = 35;
const MAG_ARC_RADIUS_SQ = MAG_ARC_RADIUS * MAG_ARC_RADIUS;

// ── Realistic gait ─────────────────────────────────────────────
const STEP_THRESHOLD = LEG_REACH * 1.15;
const STEP_THRESHOLD_SQ = STEP_THRESHOLD * STEP_THRESHOLD;
const STEP_TOO_CLOSE = BODY_RADIUS * 1.2;
const STEP_TOO_CLOSE_SQ = STEP_TOO_CLOSE * STEP_TOO_CLOSE;
const STEP_LIFT_HEIGHT = 18;
const STEP_SPEED = 0.18;
const GAIT_GROUP_A = new Set([0, 2, 5, 7]);
const GAIT_GROUP_B = new Set([1, 3, 4, 6]);

// ── Precomputed ────────────────────────────────────────────────
const BODY_RADIUS_PLUS_5_SQ = (BODY_RADIUS + 5) ** 2;
const BODY_RADIUS_PLUS_8_SQ = (BODY_RADIUS + 8) ** 2;
const BODY_RADIUS_PLUS_2_SQ = (BODY_RADIUS + 2) ** 2;
const LEG_REACH_SQ = LEG_REACH * LEG_REACH;
const TWO_PI = Math.PI * 2;
const HALF_PI_OVER_2_5 = Math.PI / 2.5;

// ── Neumorphic palette ─────────────────────────────────────────
const NEU_BG = '#2a2a32';
const NEU_LIGHT = '#35353f';
const NEU_SHADOW = '#1e1e24';

// ── Black widow colours ────────────────────────────────────────
const BW_BLACK = '#0d0d0d';
const BW_GLOSS = '#1a1a1a';
const BW_SHEEN = '#2c2c2c';
const BW_RED = '#c0392b';
const BW_RED_BRIGHT = '#e74c3c';
const BW_LEG = '#111111';
const BW_LEG_HIGHLIGHT = '#292929';

// Leg angle offsets RELATIVE to heading (radians)
const LEG_ANGLE_OFFSETS = [
    Math.PI * 0.35, Math.PI * 0.58, Math.PI * 0.76, Math.PI * 0.92,
    -Math.PI * 0.35, -Math.PI * 0.58, -Math.PI * 0.76, -Math.PI * 0.92,
];

interface Point { x: number; y: number; }

interface LegState {
    target: Point | null;
    current: Point;
    previous: Point;
    stepping: boolean;
    stepProgress: number;
    planted: boolean;
}

// ── Inlined helpers (avoid sqrt when possible) ─────────────────
function distSq(ax: number, ay: number, bx: number, by: number) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
}

function findBestDotForLeg(
    bx: number, by: number, preferredRad: number,
    nearbyDotsX: Float32Array, nearbyDotsY: Float32Array, dotCount: number,
    usedDots: Set<number>, reach: number
): number {
    const idealDist = reach * 0.65;
    const idealX = bx + Math.cos(preferredRad) * idealDist;
    const idealY = by + Math.sin(preferredRad) * idealDist;
    let bestIdx = -1;
    let bestScore = Infinity;
    for (let j = 0; j < dotCount; j++) {
        if (usedDots.has(j)) continue;
        const dx = nearbyDotsX[j] - bx;
        const dy = nearbyDotsY[j] - by;
        const dSq = dx * dx + dy * dy;
        if (dSq > LEG_REACH_SQ || dSq < BODY_RADIUS_PLUS_8_SQ) continue;
        const angleToDot = Math.atan2(dy, dx);
        let angleDiff = Math.abs(angleToDot - preferredRad);
        if (angleDiff > Math.PI) angleDiff = TWO_PI - angleDiff;
        if (angleDiff > HALF_PI_OVER_2_5) continue;
        const ddx = nearbyDotsX[j] - idealX;
        const ddy = nearbyDotsY[j] - idealY;
        const score = Math.sqrt(ddx * ddx + ddy * ddy) + angleDiff * 30;
        if (score < bestScore) { bestScore = score; bestIdx = j; }
    }
    return bestIdx;
}

// ── Component ──────────────────────────────────────────────────
export default function SpiderWeb() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dims, setDims] = useState({ w: 0, h: 0 });

    const bodyX = useMotionValue(0);
    const bodyY = useMotionValue(0);
    const springX = useSpring(bodyX, { stiffness: 120, damping: 25, mass: 0.8 });
    const springY = useSpring(bodyY, { stiffness: 120, damping: 25, mass: 0.8 });

    const legsRef = useRef<LegState[]>([]);
    const mouseRef = useRef<Point>({ x: 0, y: 0 });
    const animFrameRef = useRef<number>(0);
    const gaitPhaseRef = useRef<'A' | 'B'>('A');

    // Pre-allocate typed arrays for nearby dots (avoid GC)
    const nearbyXRef = useRef(new Float32Array(64));
    const nearbyYRef = useRef(new Float32Array(64));

    // Cache the off-screen dot pattern as an ImageBitmap
    const dotPatternRef = useRef<ImageBitmap | null>(null);
    const dotPatternDimsRef = useRef({ w: 0, h: 0 });

    // Resize
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                setDims({ w: entry.contentRect.width, h: entry.contentRect.height });
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Mouse + Touch tracking
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const updatePosition = (clientX: number, clientY: number) => {
            const rect = el.getBoundingClientRect();
            mouseRef.current.x = clientX - rect.left;
            mouseRef.current.y = clientY - rect.top;
            bodyX.set(mouseRef.current.x);
            bodyY.set(mouseRef.current.y);
        };

        const onMouseMove = (e: MouseEvent) => {
            updatePosition(e.clientX, e.clientY);
        };

        const onTouchStart = (e: TouchEvent) => {
            e.preventDefault(); // prevent scroll while swiping over spider
            const touch = e.touches[0];
            if (touch) updatePosition(touch.clientX, touch.clientY);
        };

        const onTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            const touch = e.touches[0];
            if (touch) updatePosition(touch.clientX, touch.clientY);
        };

        el.addEventListener('mousemove', onMouseMove);
        el.addEventListener('touchstart', onTouchStart, { passive: false });
        el.addEventListener('touchmove', onTouchMove, { passive: false });

        return () => {
            el.removeEventListener('mousemove', onMouseMove);
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
        };
    }, [bodyX, bodyY]);

    // ── Pre-render static dot grid to offscreen canvas ─────────
    const buildDotPattern = useCallback((w: number, h: number) => {
        if (dotPatternDimsRef.current.w === w && dotPatternDimsRef.current.h === h && dotPatternRef.current) return;
        const offscreen = document.createElement('canvas');
        offscreen.width = w;
        offscreen.height = h;
        const octx = offscreen.getContext('2d');
        if (!octx) return;

        const cols = Math.floor(w / GRID_SPACING) + 1;
        const rows = Math.floor(h / GRID_SPACING) + 1;
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                const x = c * GRID_SPACING;
                const y = r * GRID_SPACING;
                // shadow side
                octx.beginPath();
                octx.arc(x + 0.6, y + 0.6, 2, 0, TWO_PI);
                octx.fillStyle = 'rgba(15, 15, 20, 0.7)';
                octx.fill();
                // highlight side
                octx.beginPath();
                octx.arc(x - 0.3, y - 0.3, 1.8, 0, TWO_PI);
                octx.fillStyle = 'rgba(65, 65, 75, 0.5)';
                octx.fill();
                // core
                octx.beginPath();
                octx.arc(x, y, 1.5, 0, TWO_PI);
                octx.fillStyle = 'rgba(80, 80, 92, 0.7)';
                octx.fill();
            }
        }
        createImageBitmap(offscreen).then(bmp => {
            dotPatternRef.current = bmp;
            dotPatternDimsRef.current = { w, h };
        });
    }, []);

    // ── Main animation loop ────────────────────────────────────
    useEffect(() => {
        if (dims.w === 0 || dims.h === 0) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        buildDotPattern(dims.w, dims.h);

        const cx = dims.w / 2;
        const cy = dims.h / 2;
        bodyX.set(cx);
        bodyY.set(cy);
        mouseRef.current.x = cx;
        mouseRef.current.y = cy;

        if (legsRef.current.length !== LEG_COUNT) {
            legsRef.current = [];
            for (let i = 0; i < LEG_COUNT; i++) {
                legsRef.current.push({
                    target: null,
                    current: { x: cx, y: cy },
                    previous: { x: cx, y: cy },
                    stepping: false,
                    stepProgress: 0,
                    planted: false,
                });
            }
        }

        // Reusable typed arrays for feet positions (avoid allocations)
        const feetX = new Float32Array(LEG_COUNT);
        const feetY = new Float32Array(LEG_COUNT);

        const animate = () => {
            const bx = springX.get();
            const by = springY.get();

            const toMouse = Math.atan2(mouseRef.current.y - by, mouseRef.current.x - bx);

            // ── Collect nearby grid dots into typed arrays ──────
            let nearbyX = nearbyXRef.current;
            let nearbyY = nearbyYRef.current;
            let dotCount = 0;

            const minCol = Math.max(0, Math.floor((bx - LEG_REACH) / GRID_SPACING));
            const maxCol = Math.min(Math.floor(dims.w / GRID_SPACING), Math.ceil((bx + LEG_REACH) / GRID_SPACING));
            const minRow = Math.max(0, Math.floor((by - LEG_REACH) / GRID_SPACING));
            const maxRow = Math.min(Math.floor(dims.h / GRID_SPACING), Math.ceil((by + LEG_REACH) / GRID_SPACING));

            for (let c = minCol; c <= maxCol; c++) {
                for (let r = minRow; r <= maxRow; r++) {
                    const dx = c * GRID_SPACING - bx;
                    const dy = r * GRID_SPACING - by;
                    const dSq = dx * dx + dy * dy;
                    if (dSq <= LEG_REACH_SQ && dSq > BODY_RADIUS_PLUS_5_SQ) {
                        // Grow arrays if needed
                        if (dotCount >= nearbyX.length) {
                            const newX = new Float32Array(nearbyX.length * 2);
                            const newY = new Float32Array(nearbyY.length * 2);
                            newX.set(nearbyX);
                            newY.set(nearbyY);
                            nearbyX = newX;
                            nearbyY = newY;
                            nearbyXRef.current = newX;
                            nearbyYRef.current = newY;
                        }
                        nearbyX[dotCount] = c * GRID_SPACING;
                        nearbyY[dotCount] = r * GRID_SPACING;
                        dotCount++;
                    }
                }
            }

            const usedDots = new Set<number>(); // indices into nearby arrays
            const activeKeys = new Set<string>(); // for grid drawing (only active dots)
            const legs = legsRef.current;

            // ── Mark dots claimed by planted legs ──────────────
            for (let i = 0; i < LEG_COUNT; i++) {
                const leg = legs[i];
                if (leg.target && leg.planted && !leg.stepping) {
                    // Find index of this target in nearby dots
                    for (let j = 0; j < dotCount; j++) {
                        if (nearbyX[j] === leg.target.x && nearbyY[j] === leg.target.y) {
                            usedDots.add(j);
                            break;
                        }
                    }
                    activeKeys.add(leg.target.x + ',' + leg.target.y);
                }
            }

            // ── Determine which legs need to step ──────────────
            const needsStepA: number[] = [];
            const needsStepB: number[] = [];
            for (let i = 0; i < LEG_COUNT; i++) {
                const leg = legs[i];
                if (leg.stepping) continue;
                const t = leg.target;
                if (!t) {
                    (GAIT_GROUP_A.has(i) ? needsStepA : needsStepB).push(i);
                    continue;
                }
                const dSq = distSq(t.x, t.y, bx, by);
                if (dSq > STEP_THRESHOLD_SQ || dSq < STEP_TOO_CLOSE_SQ) {
                    (GAIT_GROUP_A.has(i) ? needsStepA : needsStepB).push(i);
                }
            }

            // ── Alternating gait ───────────────────────────────
            const primaryNeedsStep = gaitPhaseRef.current === 'A' ? needsStepA : needsStepB;
            const secondaryNeedsStep = gaitPhaseRef.current === 'A' ? needsStepB : needsStepA;

            const doSteps = (indices: number[]) => {
                for (const i of indices) {
                    const leg = legs[i];
                    const idx = findBestDotForLeg(bx, by, toMouse + LEG_ANGLE_OFFSETS[i], nearbyX, nearbyY, dotCount, usedDots, LEG_REACH);
                    if (idx >= 0) {
                        usedDots.add(idx);
                        const nx = nearbyX[idx];
                        const ny = nearbyY[idx];
                        activeKeys.add(nx + ',' + ny);
                        leg.previous.x = leg.current.x;
                        leg.previous.y = leg.current.y;
                        leg.target = { x: nx, y: ny };
                        leg.stepping = true;
                        leg.stepProgress = 0;
                        leg.planted = false;
                    }
                }
            };

            if (primaryNeedsStep.length > 0) {
                doSteps(primaryNeedsStep);
                gaitPhaseRef.current = gaitPhaseRef.current === 'A' ? 'B' : 'A';
            } else if (secondaryNeedsStep.length > 0) {
                doSteps(secondaryNeedsStep);
                gaitPhaseRef.current = gaitPhaseRef.current === 'A' ? 'B' : 'A';
            }

            // Mark stepping leg targets as active
            for (let i = 0; i < LEG_COUNT; i++) {
                const leg = legs[i];
                if (leg.target && leg.stepping) {
                    activeKeys.add(leg.target.x + ',' + leg.target.y);
                }
            }

            // ── Animate legs ───────────────────────────────────
            let feetCount = 0;
            for (let i = 0; i < LEG_COUNT; i++) {
                const leg = legs[i];
                if (leg.stepping && leg.target) {
                    leg.stepProgress = Math.min(1, leg.stepProgress + STEP_SPEED);
                    const t = leg.stepProgress;
                    const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
                    const ix = leg.previous.x + (leg.target.x - leg.previous.x) * ease;
                    const iy = leg.previous.y + (leg.target.y - leg.previous.y) * ease;
                    const lift = 4 * t * (1 - t) * STEP_LIFT_HEIGHT;
                    leg.current.x = ix;
                    leg.current.y = iy - lift;
                    if (t >= 1) {
                        leg.current.x = leg.target.x;
                        leg.current.y = leg.target.y;
                        leg.stepping = false;
                        leg.planted = true;
                    }
                } else if (!leg.target) {
                    leg.current.x += (bx - leg.current.x) * 0.1;
                    leg.current.y += (by - leg.current.y) * 0.1;
                }
                // Collect feet
                if (distSq(leg.current.x, leg.current.y, bx, by) > BODY_RADIUS_PLUS_2_SQ) {
                    feetX[feetCount] = leg.current.x;
                    feetY[feetCount] = leg.current.y;
                    feetCount++;
                }
            }

            // ── DRAW ───────────────────────────────────────────
            ctx.clearRect(0, 0, dims.w, dims.h);

            // 1) Blit pre-rendered dot pattern (single drawImage — very fast)
            if (dotPatternRef.current) {
                ctx.drawImage(dotPatternRef.current, 0, 0);
            }

            // 2) Only overdraw active/pulled dots (few, not hundreds)
            const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.005);
            const cols = Math.floor(dims.w / GRID_SPACING) + 1;
            const rows = Math.floor(dims.h / GRID_SPACING) + 1;

            // Only check dots near feet for magnetic pull (skip far dots)
            const pullCheckRange = MAG_DOT_PULL_RADIUS + GRID_SPACING;
            for (let fi = 0; fi < feetCount; fi++) {
                const fx = feetX[fi];
                const fy = feetY[fi];
                const cMin = Math.max(0, Math.floor((fx - pullCheckRange) / GRID_SPACING));
                const cMax = Math.min(cols - 1, Math.ceil((fx + pullCheckRange) / GRID_SPACING));
                const rMin = Math.max(0, Math.floor((fy - pullCheckRange) / GRID_SPACING));
                const rMax = Math.min(rows - 1, Math.ceil((fy + pullCheckRange) / GRID_SPACING));

                for (let c = cMin; c <= cMax; c++) {
                    for (let r = rMin; r <= rMax; r++) {
                        const ox = c * GRID_SPACING;
                        const oy = r * GRID_SPACING;
                        const key = ox + ',' + oy;
                        if (activeKeys.has(key)) continue; // drawn separately below

                        const fdSq = distSq(ox, oy, fx, fy);
                        if (fdSq < MAG_DOT_PULL_RADIUS_SQ && fdSq > 1) {
                            const fd = Math.sqrt(fdSq);
                            const t = 1 - fd / MAG_DOT_PULL_RADIUS;
                            const pull = t * t * MAG_DOT_PULL_STRENGTH;
                            const px = ox + ((fx - ox) / fd) * pull;
                            const py = oy + ((fy - oy) / fd) * pull;

                            // Clear original dot area and draw displaced
                            ctx.clearRect(ox - 3, oy - 3, 6, 6);
                            const sz = 2 + t * 2;
                            ctx.beginPath();
                            ctx.arc(px + 0.8, py + 0.8, sz, 0, TWO_PI);
                            ctx.fillStyle = NEU_SHADOW;
                            ctx.fill();
                            ctx.beginPath();
                            ctx.arc(px - 0.4, py - 0.4, sz - 0.5, 0, TWO_PI);
                            ctx.fillStyle = NEU_LIGHT;
                            ctx.fill();
                            ctx.beginPath();
                            ctx.arc(px, py, sz - 1, 0, TWO_PI);
                            ctx.fillStyle = `rgba(231,76,60,${(0.2 + t * 0.4).toFixed(2)})`;
                            ctx.fill();
                        }
                    }
                }
            }

            // Draw active (grabbed) dots
            for (const key of activeKeys) {
                const sep = key.indexOf(',');
                const ax = +key.slice(0, sep);
                const ay = +key.slice(sep + 1);
                // Clear underlying dot
                ctx.clearRect(ax - 3, ay - 3, 6, 6);
                // Neumorphic grabbed
                ctx.beginPath();
                ctx.arc(ax + 1, ay + 1, 6, 0, TWO_PI);
                ctx.fillStyle = NEU_SHADOW;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(ax - 0.5, ay - 0.5, 5, 0, TWO_PI);
                ctx.fillStyle = NEU_LIGHT;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(ax, ay, 3.5 + pulse, 0, TWO_PI);
                ctx.fillStyle = `rgba(192,57,43,${(0.25 + pulse * 0.15).toFixed(2)})`;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(ax, ay, 2.5, 0, TWO_PI);
                ctx.fillStyle = BW_RED_BRIGHT;
                ctx.fill();
            }

            // 3) Magnetic arcs — only draw a few per foot
            const now = Date.now() * 0.001;
            for (let fi = 0; fi < feetCount; fi++) {
                const fx = feetX[fi];
                const fy = feetY[fi];
                let arcCount = 0;
                for (let j = 0; j < dotCount && arcCount < 3; j++) {
                    const dx = nearbyX[j] - fx;
                    const dy = nearbyY[j] - fy;
                    const fdSq = dx * dx + dy * dy;
                    if (fdSq < MAG_ARC_RADIUS_SQ && fdSq > 16) {
                        const nk = nearbyX[j] + ',' + nearbyY[j];
                        if (activeKeys.has(nk)) continue;
                        const fd = Math.sqrt(fdSq);
                        const t = 1 - fd / MAG_ARC_RADIUS;
                        const flicker = 0.4 + 0.6 * Math.abs(Math.sin(now * 8 + fd));
                        ctx.beginPath();
                        ctx.moveTo(fx, fy);
                        const mx = (fx + nearbyX[j]) * 0.5 + Math.sin(now * 5 + fd) * 5 * t;
                        const my = (fy + nearbyY[j]) * 0.5 + Math.cos(now * 5 + fd) * 5 * t;
                        ctx.quadraticCurveTo(mx, my, nearbyX[j], nearbyY[j]);
                        ctx.strokeStyle = `rgba(192,57,43,${(t * 0.2 * flicker).toFixed(3)})`;
                        ctx.lineWidth = 0.5 + t * 0.5;
                        ctx.stroke();
                        arcCount++;
                    }
                }
            }

            // 4) Draw legs ──────────────────────────────────────
            for (let i = 0; i < LEG_COUNT; i++) {
                const leg = legs[i];
                const fx = leg.current.x;
                const fy = leg.current.y;
                const dSq = distSq(fx, fy, bx, by);
                if (dSq < BODY_RADIUS_PLUS_2_SQ) continue;

                const dx = fx - bx;
                const dy = fy - by;
                const len = Math.sqrt(dSq);
                if (len < 1) continue;

                const perpX = -dy / len;
                const perpY = dx / len;
                const side = i < 4 ? -1 : 1;

                const kneeLift = len * 0.45;
                const kx = bx + dx * 0.38 + perpX * kneeLift * side;
                const ky = by + dy * 0.38 + perpY * kneeLift * side;

                // Femur shadow + main + highlight (batched)
                ctx.beginPath();
                ctx.moveTo(bx + 1, by + 1);
                ctx.lineTo(kx + 1, ky + 1);
                ctx.strokeStyle = 'rgba(0,0,0,0.4)';
                ctx.lineWidth = 3;
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(kx, ky);
                ctx.strokeStyle = BW_LEG;
                ctx.lineWidth = 2.2;
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(bx - 0.4, by - 0.4);
                ctx.lineTo(kx - 0.4, ky - 0.4);
                ctx.strokeStyle = BW_LEG_HIGHLIGHT;
                ctx.lineWidth = 0.7;
                ctx.stroke();

                // Tibia shadow + main + highlight
                ctx.beginPath();
                ctx.moveTo(kx + 1, ky + 1);
                ctx.lineTo(fx + 1, fy + 1);
                ctx.strokeStyle = 'rgba(0,0,0,0.35)';
                ctx.lineWidth = 2.2;
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(kx, ky);
                ctx.lineTo(fx, fy);
                ctx.strokeStyle = BW_LEG;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(kx - 0.3, ky - 0.3);
                ctx.lineTo(fx - 0.3, fy - 0.3);
                ctx.strokeStyle = BW_LEG_HIGHLIGHT;
                ctx.lineWidth = 0.5;
                ctx.stroke();

                // Knee joint
                ctx.beginPath();
                ctx.arc(kx + 0.5, ky + 0.5, 2.8, 0, TWO_PI);
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(kx, ky, 2.2, 0, TWO_PI);
                ctx.fillStyle = BW_SHEEN;
                ctx.fill();

                // Foot tip
                ctx.beginPath();
                ctx.arc(fx, fy, 1.2, 0, TWO_PI);
                ctx.fillStyle = leg.planted ? BW_RED : BW_SHEEN;
                ctx.fill();
            }

            // 5) Spider body ────────────────────────────────────
            const cosM = Math.cos(toMouse);
            const sinM = Math.sin(toMouse);

            // Abdomen
            const abdomenX = bx - cosM * (BODY_RADIUS + ABDOMEN_RX - 4);
            const abdomenY = by - sinM * (BODY_RADIUS + ABDOMEN_RY - 4);

            ctx.beginPath();
            ctx.ellipse(abdomenX + 2, abdomenY + 2, ABDOMEN_RX + 2, ABDOMEN_RY + 1, toMouse + Math.PI, 0, TWO_PI);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fill();

            const abdGrad = ctx.createRadialGradient(abdomenX - 3, abdomenY - 3, 1, abdomenX, abdomenY, ABDOMEN_RX);
            abdGrad.addColorStop(0, BW_SHEEN);
            abdGrad.addColorStop(0.3, BW_GLOSS);
            abdGrad.addColorStop(1, BW_BLACK);
            ctx.beginPath();
            ctx.ellipse(abdomenX, abdomenY, ABDOMEN_RX, ABDOMEN_RY, toMouse + Math.PI, 0, TWO_PI);
            ctx.fillStyle = abdGrad;
            ctx.fill();

            // Hourglass
            const hgAngle = toMouse + Math.PI;
            const perpHgX = -Math.sin(hgAngle);
            const perpHgY = Math.cos(hgAngle);
            const dirHgX = Math.cos(hgAngle);
            const dirHgY = Math.sin(hgAngle);
            const hgSize = 5;

            const hgGlow = ctx.createRadialGradient(abdomenX, abdomenY, 0, abdomenX, abdomenY, hgSize + 3);
            hgGlow.addColorStop(0, 'rgba(231,76,60,0.3)');
            hgGlow.addColorStop(1, 'rgba(231,76,60,0)');
            ctx.beginPath();
            ctx.arc(abdomenX, abdomenY, hgSize + 3, 0, TWO_PI);
            ctx.fillStyle = hgGlow;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(abdomenX, abdomenY);
            ctx.lineTo(abdomenX + dirHgX * hgSize + perpHgX * hgSize * 0.6, abdomenY + dirHgY * hgSize + perpHgY * hgSize * 0.6);
            ctx.lineTo(abdomenX + dirHgX * hgSize - perpHgX * hgSize * 0.6, abdomenY + dirHgY * hgSize - perpHgY * hgSize * 0.6);
            ctx.closePath();
            ctx.fillStyle = BW_RED;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(abdomenX, abdomenY);
            ctx.lineTo(abdomenX - dirHgX * hgSize + perpHgX * hgSize * 0.6, abdomenY - dirHgY * hgSize + perpHgY * hgSize * 0.6);
            ctx.lineTo(abdomenX - dirHgX * hgSize - perpHgX * hgSize * 0.6, abdomenY - dirHgY * hgSize - perpHgY * hgSize * 0.6);
            ctx.closePath();
            ctx.fillStyle = BW_RED;
            ctx.fill();

            // Abdomen highlight
            ctx.beginPath();
            ctx.ellipse(
                abdomenX - Math.cos(hgAngle) * 3 - sinM * 3,
                abdomenY - Math.sin(hgAngle) * 3 + cosM * 3,
                ABDOMEN_RX * 0.45, ABDOMEN_RY * 0.3, hgAngle, 0, TWO_PI
            );
            ctx.fillStyle = 'rgba(60,60,60,0.35)';
            ctx.fill();

            // Cephalothorax
            ctx.beginPath();
            ctx.arc(bx + 1.5, by + 1.5, BODY_RADIUS + 1, 0, TWO_PI);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fill();

            const bodyGrad = ctx.createRadialGradient(bx - 2, by - 2, 1, bx, by, BODY_RADIUS);
            bodyGrad.addColorStop(0, BW_SHEEN);
            bodyGrad.addColorStop(0.4, BW_GLOSS);
            bodyGrad.addColorStop(1, BW_BLACK);
            ctx.beginPath();
            ctx.arc(bx, by, BODY_RADIUS, 0, TWO_PI);
            ctx.fillStyle = bodyGrad;
            ctx.fill();

            // Head
            const headX = bx + cosM * (BODY_RADIUS + HEAD_RADIUS - 3);
            const headY = by + sinM * (BODY_RADIUS + HEAD_RADIUS - 3);

            ctx.beginPath();
            ctx.arc(headX + 1, headY + 1, HEAD_RADIUS + 0.5, 0, TWO_PI);
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fill();

            const headGrad = ctx.createRadialGradient(headX - 1, headY - 1, 0, headX, headY, HEAD_RADIUS);
            headGrad.addColorStop(0, BW_SHEEN);
            headGrad.addColorStop(0.5, BW_GLOSS);
            headGrad.addColorStop(1, BW_BLACK);
            ctx.beginPath();
            ctx.arc(headX, headY, HEAD_RADIUS, 0, TWO_PI);
            ctx.fillStyle = headGrad;
            ctx.fill();

            // Eyes
            const eyeSpread = 2.5;
            const perpEyeX = -sinM * eyeSpread;
            const perpEyeY = cosM * eyeSpread;
            const eyeForward = HEAD_RADIUS * 0.25;

            for (let s = -1; s <= 1; s += 2) {
                const ex = headX + cosM * eyeForward + perpEyeX * s;
                const ey = headY + sinM * eyeForward + perpEyeY * s;
                ctx.beginPath();
                ctx.arc(ex, ey, EYE_RADIUS + 1.5, 0, TWO_PI);
                ctx.fillStyle = 'rgba(192,57,43,0.25)';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(ex, ey, EYE_RADIUS, 0, TWO_PI);
                ctx.fillStyle = BW_RED_BRIGHT;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(ex - 0.4, ey - 0.4, 0.6, 0, TWO_PI);
                ctx.fillStyle = '#fff';
                ctx.fill();
            }

            for (let s = -1; s <= 1; s += 2) {
                const ex = headX + cosM * (eyeForward + 1.5) + perpEyeX * s * 0.5;
                const ey = headY + sinM * (eyeForward + 1.5) + perpEyeY * s * 0.5;
                ctx.beginPath();
                ctx.arc(ex, ey, 1.2, 0, TWO_PI);
                ctx.fillStyle = BW_RED;
                ctx.fill();
            }

            // Fangs
            for (let s = -1; s <= 1; s += 2) {
                const fbx = headX + cosM * HEAD_RADIUS;
                const fby = headY + sinM * HEAD_RADIUS;
                const ftx = fbx + cosM * 4 + perpEyeX * s * 0.4;
                const fty = fby + sinM * 4 + perpEyeY * s * 0.4;
                ctx.beginPath();
                ctx.moveTo(fbx, fby);
                ctx.lineTo(ftx, fty);
                ctx.strokeStyle = BW_SHEEN;
                ctx.lineWidth = 1.2;
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(ftx, fty, 0.8, 0, TWO_PI);
                ctx.fillStyle = BW_RED;
                ctx.fill();
            }

            // Body glow
            const glowGrad = ctx.createRadialGradient(bx, by, 0, bx, by, 40);
            glowGrad.addColorStop(0, 'rgba(192,57,43,0.04)');
            glowGrad.addColorStop(1, 'rgba(192,57,43,0)');
            ctx.beginPath();
            ctx.arc(bx, by, 40, 0, TWO_PI);
            ctx.fillStyle = glowGrad;
            ctx.fill();

            animFrameRef.current = requestAnimationFrame(animate);
        };

        animFrameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [dims, springX, springY, buildDotPattern, bodyX, bodyY]);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full min-h-[400px] overflow-hidden cursor-none"
            style={{
                background: NEU_BG,
            }}
        >
            <canvas
                ref={canvasRef}
                width={dims.w}
                height={dims.h}
                className="absolute inset-0"
                style={{ width: '100%', height: '100%' }}
            />

            {/* Silk thread from top */}
            <motion.div
                className="absolute top-0 w-px"
                style={{
                    left: springX,
                    height: springY,
                    background: 'linear-gradient(to bottom, rgba(40,40,48,0.6), rgba(40,40,48,0.05))',
                }}
            />
        </div>
    );
}
