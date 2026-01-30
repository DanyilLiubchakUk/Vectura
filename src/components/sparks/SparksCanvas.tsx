"use client";

import { usePathname } from "next/navigation";
import { useRef, useEffect } from "react";


interface SparkParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  baseOpacity: number;
  lifeStart: number;
  color: string;
  driftMag: number;
  driftPhase: number;
  rotation: number;
  fadeDuration: number;
}

const PADDING_FACTOR = 1;
const FADE_DURATION_MIN = 2000;
const FADE_DURATION_MAX = 5000;
const MIN_ACTIVE_SPARKS = 2;
const MAX_ACTIVE_SPARKS = 5;
const MIN_SPARK_PERCENT_SIZE = 20
const MAX_SPARK_PERCENT_SIZE = 30
const ANGLE_DELTA = 5;
const MIN_SPEED = 50;
const MAX_SPEED = 20
const OPACITY_MIN_PERCENT = 20
const OPACITY_MAX_PERCENT = 30
const MIN_DRIFT_MAGNITUDE = 0.3;
const MAX_DRIFT_MAGNITUDE = 1.2;
const PULSE_AMPLITUDE_SCALE = 0.6;
const PULSE_PERIOD_SCALE = 1.5;
const DEFAULT_SPARK = { r: 217, g: 119, b: 87 };
const MIN_SECONDS = 3;
const MAX_SECONDS = 8;

const PAGES_WITHOUT_SPARKS = ["/backtest"];

function shouldHideSparks(pathname: string | null): boolean {
  if (!pathname) return false;
  return PAGES_WITHOUT_SPARKS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getSparkColor(): string {
  if (typeof document === "undefined") return `rgb(${DEFAULT_SPARK.r},${DEFAULT_SPARK.g},${DEFAULT_SPARK.b})`;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--spark").trim();
  if (raw.startsWith("#")) {
    const hex = raw.match(/^#([0-9a-fA-F]{6})$/);
    if (hex) {
      const r = parseInt(hex[1].slice(0, 2), 16);
      const g = parseInt(hex[1].slice(2, 4), 16);
      const b = parseInt(hex[1].slice(4, 6), 16);
      return `rgb(${r},${g},${b})`;
    }
  }
  return raw || `rgb(${DEFAULT_SPARK.r},${DEFAULT_SPARK.g},${DEFAULT_SPARK.b})`;
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

export function SparksCanvas() {
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<SparkParticle[]>([]);
  const spawnTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (shouldHideSparks(pathname)) return;
    const prefersReducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const ctx2d = canvasEl.getContext("2d");
    if (!ctx2d) return;

    const c: HTMLCanvasElement = canvasEl;
    const context: CanvasRenderingContext2D = ctx2d;

    let width = 0;
    let height = 0;
    let dpr = 1;

    function resize() {
      dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      c.width = width * dpr;
      c.height = height * dpr;
      c.style.width = `${width}px`;
      c.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawnOne(): SparkParticle {
      const minDim = Math.min(width || window.innerWidth, height || window.innerHeight);
      const baseSize = randomBetween(minDim * MIN_SPARK_PERCENT_SIZE / 100, minDim * MAX_SPARK_PERCENT_SIZE / 100);

      const angle = Math.PI / 2 + randomBetween(-ANGLE_DELTA, ANGLE_DELTA);
      const speed = randomBetween(MIN_SPEED, MAX_SPEED);

      return {
        id: uid(),
        x: randomBetween(0, width || window.innerWidth),
        y: randomBetween(0, height || window.innerHeight),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: baseSize,
        baseSize,
        baseOpacity: randomBetween(OPACITY_MIN_PERCENT / 100, OPACITY_MAX_PERCENT / 100),
        lifeStart: performance.now(),
        color: "",
        driftMag: randomBetween(MIN_DRIFT_MAGNITUDE, MAX_DRIFT_MAGNITUDE),
        driftPhase: randomBetween(0, Math.PI * 2),
        rotation: 0,
        fadeDuration: randomBetween(FADE_DURATION_MIN, FADE_DURATION_MAX),
      };
    }

    function scheduleNextSpawn() {
      const list = particlesRef.current;
      const count = list.length;

      if (count < MIN_ACTIVE_SPARKS) {
        const toAdd = randomInt(MIN_ACTIVE_SPARKS - count, Math.min(MAX_ACTIVE_SPARKS - count, 2));
        for (let i = 0; i < toAdd; i++) list.push(spawnOne());
      } else if (count < MAX_ACTIVE_SPARKS && Math.random() < 0.5) {
        list.push(spawnOne());
      }

      const delay = randomBetween(MIN_SECONDS, MAX_SECONDS) * 1000;
      spawnTimerRef.current = window.setTimeout(scheduleNextSpawn, delay)
    }

    function drawParticle(p: SparkParticle, now: number, dt: number) {
      const life = (now - p.lifeStart) * 0.001;
      const fadeProgress = Math.min(1, life / (p.fadeDuration / 1000));
      const ease = 1 - Math.pow(1 - fadeProgress, 1.5);

      const pulseAmplitude = 0.15 * PULSE_AMPLITUDE_SCALE;
      const sizeOscillation = 1 + pulseAmplitude * Math.sin((life * 2) / PULSE_PERIOD_SCALE + p.driftPhase);
      const scale = ease * sizeOscillation;
      const size = Math.max(0.75, p.baseSize * scale);
      p.size = size;

      const driftX = Math.sin(life * 0.5 + p.driftPhase) * p.driftMag * dt * 0.008;
      const driftY = Math.cos(life * 0.4 + p.driftPhase * 0.8) * p.driftMag * dt * 0.008;
      p.x += p.vx * dt * 0.001 + driftX;
      p.y += p.vy * dt * 0.001 + driftY;

      const sparkRgb = getSparkColor();
      const relative = size / p.baseSize;

      const baseAlpha = p.baseOpacity * ease;
      const alpha = Math.max(0.02, Math.min(1, baseAlpha * (1 + (1 - relative) * 0.3)));

      const fillColor = sparkRgb.replace('rgb', 'rgba').replace(')', `,${alpha})`);

      context.save();
      context.translate(p.x, p.y);
      context.globalAlpha = 1;
      context.shadowBlur = Math.max(400, size * 200);
      context.shadowColor = fillColor;
      context.fillStyle = fillColor;
      context.beginPath();
      context.arc(0, 0, size, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    function tick(now: number) {
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      context.clearRect(0, 0, width + 1, height + 1);

      const list = particlesRef.current;
      if (list.length < MIN_ACTIVE_SPARKS) scheduleNextSpawn();

      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        drawParticle(p, now, dt);
        const margin = p.size * PADDING_FACTOR;
        if (
          p.x < -margin ||
          p.x > width + margin ||
          p.y < -margin ||
          p.y > height + margin
        ) {
          list.splice(i, 1);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener("resize", resize);
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    scheduleNextSpawn();

    const visHandler = () => {
      if (document.hidden) {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        if (spawnTimerRef.current != null) clearTimeout(spawnTimerRef.current);
        spawnTimerRef.current = null;
      } else if (!prefersReducedMotion) {
        lastTimeRef.current = performance.now();
        rafRef.current = requestAnimationFrame(tick);
        scheduleNextSpawn();
      }
    };
    document.addEventListener("visibilitychange", visHandler);

    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visHandler);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (spawnTimerRef.current != null) clearTimeout(spawnTimerRef.current);
    };
  }, [pathname]);

  if (shouldHideSparks(pathname)) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none -z-1 blur-xl"
      aria-hidden
    />
  );
}
