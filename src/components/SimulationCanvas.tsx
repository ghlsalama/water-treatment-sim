import { useRef, useEffect, useCallback } from 'react';
import { SimulationEngine, ZONES } from '../simulation/engine';

interface Props {
  engine: SimulationEngine;
}

interface Trail {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  color: string;
  size: number;
}

interface MouseState {
  x: number;
  y: number;
  active: boolean;
  vx: number;
  vy: number;
}

export function SimulationCanvas({ engine }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const trailsRef = useRef<Trail[]>([]);
  const mouseRef = useRef<MouseState>({ x: 0, y: 0, active: false, vx: 0, vy: 0 });
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = 1200 / rect.width;
      const scaleY = 360 / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      mouseRef.current.vx = x - prevMouseRef.current.x;
      mouseRef.current.vy = y - prevMouseRef.current.y;
      mouseRef.current.x = x;
      mouseRef.current.y = y;
      mouseRef.current.active = true;
      prevMouseRef.current = { x, y };
    };

    const handleMouseLeave = () => { mouseRef.current.active = false; };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = 1200 / rect.width;
      const scaleY = 360 / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      const gridX = Math.floor(x / (1200 / 200));
      const gridY = Math.floor(y / (360 / 60));
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          if (Math.sqrt(dx * dx + dy * dy) < 3) {
            engine.fluid.addVelocity(gridX + dx, gridY + dy, dx * 2, dy * 2);
          }
        }
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('click', handleClick);
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('click', handleClick);
    };
  }, [engine]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const scaleX = w / 200;
    const scaleY = h / 60;
    timeRef.current += 0.016;
    const t = timeRef.current;
    const mouse = mouseRef.current;

    // --- Background ---
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0a1628');
    bgGrad.addColorStop(0.5, '#060e1a');
    bgGrad.addColorStop(1, '#020810');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // --- God rays (reduced count) ---
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 6; i++) {
      const rayX = (i / 6) * w + Math.sin(t * 0.2 + i * 0.8) * 20;
      const rayWidth = 20 + Math.sin(t * 0.3 + i) * 10;
      const rayAlpha = 0.015 + Math.sin(t * 0.4 + i * 1.2) * 0.008;
      const rayGrad = ctx.createLinearGradient(rayX, 0, rayX + rayWidth, h);
      rayGrad.addColorStop(0, `rgba(100, 180, 255, ${rayAlpha})`);
      rayGrad.addColorStop(1, 'rgba(60, 100, 180, 0)');
      ctx.fillStyle = rayGrad;
      ctx.fillRect(rayX - rayWidth, 0, rayWidth * 2, h);
    }
    ctx.restore();

    // --- Zone backgrounds ---
    for (const zone of ZONES) {
      const zx = zone.xStart * scaleX;
      const zw = (zone.xEnd - zone.xStart) * scaleX;
      const zoneGrad = ctx.createLinearGradient(zx, 0, zx + zw, 0);
      zoneGrad.addColorStop(0, zone.color + '06');
      zoneGrad.addColorStop(0.5, zone.color + '12');
      zoneGrad.addColorStop(1, zone.color + '06');
      ctx.fillStyle = zoneGrad;
      ctx.fillRect(zx, 0, zw, h);

      // Zone separator
      const pulseAlpha = 0.2 + Math.sin(t * 2 + zone.xStart) * 0.1;
      ctx.strokeStyle = zone.color + Math.floor(pulseAlpha * 255).toString(16).padStart(2, '0');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(zx, 0);
      ctx.lineTo(zx, h);
      ctx.stroke();

      // Zone label
      ctx.font = '700 10px system-ui';
      const label = zone.label;
      const metrics = ctx.measureText(label);
      const pillW = metrics.width + 16;
      const pillH = 16;
      const pillX = zx + zw / 2 - pillW / 2;
      const pillY = 6;
      ctx.fillStyle = 'rgba(8, 18, 35, 0.85)';
      ctx.strokeStyle = zone.color + '50';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = zone.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, pillX + pillW / 2, pillY + pillH / 2 + 1);
    }

    // --- Water body ---
    const waterTop = 2 * scaleY;
    const waterBottom = 58 * scaleY;
    const waterGrad = ctx.createLinearGradient(0, waterTop, 0, waterBottom);
    waterGrad.addColorStop(0, 'rgba(40, 100, 170, 0.2)');
    waterGrad.addColorStop(0.3, 'rgba(30, 80, 140, 0.3)');
    waterGrad.addColorStop(0.7, 'rgba(15, 45, 90, 0.45)');
    waterGrad.addColorStop(1, 'rgba(10, 35, 70, 0.55)');
    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    for (let x = 1; x < 199; x++) {
      let topY = waterTop;
      for (let y = 1; y < 59; y++) {
        if (engine.fluid.solid[y * 200 + x] === 0) { topY = y * scaleY; break; }
      }
      if (x === 1) ctx.moveTo(x * scaleX, topY);
      else ctx.lineTo(x * scaleX, topY);
    }
    for (let x = 198; x >= 1; x--) {
      let botY = waterBottom;
      for (let y = 58; y >= 1; y--) {
        if (engine.fluid.solid[y * 200 + x] === 0) { botY = y * scaleY; break; }
      }
      ctx.lineTo(x * scaleX, botY);
    }
    ctx.closePath();
    ctx.fill();

    // --- Water surface line ---
    ctx.strokeStyle = 'rgba(120, 200, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 1; x < 199; x += 2) {
      let topY = waterTop;
      for (let y = 1; y < 59; y++) {
        if (engine.fluid.solid[y * 200 + x] === 0) { topY = y * scaleY; break; }
      }
      const wave = Math.sin(x * 0.12 + t * 2.5) * 2 + Math.sin(x * 0.07 + t * 1.5) * 1.5;
      if (x === 1) ctx.moveTo(x * scaleX, topY + wave);
      else ctx.lineTo(x * scaleX, topY + wave);
    }
    ctx.stroke();

    // --- Caustics (reduced) ---
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 6; i++) {
      const cx = (Math.sin(t * 0.25 + i * 1.3) * 0.5 + 0.5) * w;
      const cy = waterTop + 15 + Math.cos(t * 0.4 + i * 0.9) * 10;
      const causticSize = 25 + Math.sin(t * 0.5 + i * 2) * 12;
      const causticGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, causticSize);
      causticGrad.addColorStop(0, 'rgba(140, 210, 255, 0.5)');
      causticGrad.addColorStop(1, 'rgba(80, 140, 220, 0)');
      ctx.fillStyle = causticGrad;
      ctx.fillRect(cx - causticSize, cy - causticSize, causticSize * 2, causticSize * 2);
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // --- Solid geometry (optimized: batch rendering) ---
    // Pre-compute a single gradient for all solids
    const solidGrad = ctx.createLinearGradient(0, 0, 0, h);
    solidGrad.addColorStop(0, '#3a5070');
    solidGrad.addColorStop(0.5, '#2a4060');
    solidGrad.addColorStop(1, '#1a3050');
    ctx.fillStyle = solidGrad;
    for (let y = 0; y < 60; y++) {
      for (let x = 0; x < 200; x++) {
        if (engine.fluid.solid[y * 200 + x] === 0) {
          ctx.fillRect(x * scaleX, y * scaleY, scaleX + 0.5, scaleY + 0.5);
        }
      }
    }
    // Edge highlights (only top edges)
    ctx.fillStyle = 'rgba(100, 150, 220, 0.3)';
    for (let y = 1; y < 60; y++) {
      for (let x = 0; x < 200; x++) {
        if (engine.fluid.solid[y * 200 + x] === 0 && engine.fluid.solid[(y - 1) * 200 + x] === 1) {
          ctx.fillRect(x * scaleX, y * scaleY, scaleX + 0.5, 1.5);
        }
      }
    }

    // --- Velocity field (single layer, larger step) ---
    const u = engine.fluid.u;
    const v = engine.fluid.v;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';
    for (let y = 4; y < 57; y += 3) {
      for (let x = 4; x < 197; x += 3) {
        const i = y * 200 + x;
        const vel = Math.sqrt(u[i] * u[i] + v[i] * v[i]);
        if (vel > 0.04) {
          const speed = Math.min(1, vel * 4);
          const alpha = 0.04 + speed * 0.12;
          const angle = Math.atan2(v[i], u[i]);
          const len = 3 + speed * 10;
          ctx.strokeStyle = `rgba(80, 170, 255, ${alpha})`;
          ctx.lineWidth = 1 + speed * 1.5;
          ctx.beginPath();
          ctx.moveTo(x * scaleX, y * scaleY);
          ctx.lineTo(x * scaleX + Math.cos(angle) * len, y * scaleY + Math.sin(angle) * len);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
    ctx.lineCap = 'butt';

    // --- Particle trails (capped) ---
    const particles = engine.particles.particles;
    const trails = trailsRef.current;
    for (const p of particles) {
      if (p.type === 'bubble' || p.type === 'floc') {
        const color = p.type === 'bubble' ? '150, 210, 255' : '180, 150, 90';
        trails.push({ x: p.x * scaleX, y: p.y * scaleY, age: 0, maxAge: 12, color, size: p.size * scaleX * 0.3 });
      }
    }
    // Cap trails
    if (trails.length > 300) trails.splice(0, trails.length - 300);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = trails.length - 1; i >= 0; i--) {
      const trail = trails[i];
      trail.age++;
      if (trail.age > trail.maxAge) { trails.splice(i, 1); continue; }
      const alpha = (1 - trail.age / trail.maxAge) * 0.1;
      ctx.fillStyle = `rgba(${trail.color}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(trail.x, trail.y, trail.size * (1 - trail.age / trail.maxAge * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // --- Particles (simplified rendering) ---
    for (const p of particles) {
      const px = p.x * scaleX;
      const py = p.y * scaleY;
      const baseSize = p.size * scaleX * 0.5;

      switch (p.type) {
        case 'solid': {
          ctx.globalAlpha = p.opacity * 0.85;
          const solidGrad = ctx.createRadialGradient(px - baseSize * 0.3, py - baseSize * 0.3, 0, px, py, baseSize);
          solidGrad.addColorStop(0, '#d4b070');
          solidGrad.addColorStop(1, '#806830');
          ctx.fillStyle = solidGrad;
          ctx.beginPath();
          ctx.arc(px, py, baseSize, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'floc': {
          ctx.globalAlpha = p.opacity * 0.7;
          const flocGrad = ctx.createRadialGradient(px, py, 0, px, py, baseSize * 1.5);
          flocGrad.addColorStop(0, 'rgba(200, 170, 100, 0.6)');
          flocGrad.addColorStop(1, 'rgba(140, 110, 50, 0)');
          ctx.fillStyle = flocGrad;
          ctx.beginPath();
          ctx.arc(px, py, baseSize * 1.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'bubble': {
          ctx.globalAlpha = p.opacity;
          const bubbleGrad = ctx.createRadialGradient(px - baseSize * 0.2, py - baseSize * 0.2, 0, px, py, baseSize);
          bubbleGrad.addColorStop(0, 'rgba(220, 240, 255, 0.5)');
          bubbleGrad.addColorStop(0.5, 'rgba(120, 190, 250, 0.2)');
          bubbleGrad.addColorStop(1, 'rgba(60, 120, 200, 0.1)');
          ctx.fillStyle = bubbleGrad;
          ctx.beginPath();
          ctx.arc(px, py, baseSize, 0, Math.PI * 2);
          ctx.fill();
          // Rim
          ctx.strokeStyle = `rgba(180, 220, 255, ${p.opacity * 0.4})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.arc(px, py, baseSize, 0, Math.PI * 2);
          ctx.stroke();
          // Specular
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * 0.6})`;
          ctx.beginPath();
          ctx.arc(px - baseSize * 0.3, py - baseSize * 0.3, baseSize * 0.15, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'chemical': {
          ctx.globalAlpha = p.opacity * 0.5;
          const chemGrad = ctx.createRadialGradient(px, py, 0, px, py, baseSize * 2);
          chemGrad.addColorStop(0, 'rgba(255, 220, 100, 0.4)');
          chemGrad.addColorStop(1, 'rgba(255, 160, 20, 0)');
          ctx.fillStyle = chemGrad;
          ctx.beginPath();
          ctx.arc(px, py, baseSize * 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }
    }
    ctx.globalAlpha = 1;

    // --- Sludge bed ---
    const sludgeParticles = particles.filter(p => p.settled && p.x > 70 && p.x < 110);
    if (sludgeParticles.length > 0) {
      ctx.fillStyle = 'rgba(60, 45, 25, 0.35)';
      ctx.beginPath();
      ctx.moveTo(70 * scaleX, 58 * scaleY);
      for (const p of sludgeParticles) {
        ctx.lineTo(p.x * scaleX, (58 - p.size * 0.2) * scaleY);
      }
      ctx.lineTo(110 * scaleX, 58 * scaleY);
      ctx.closePath();
      ctx.fill();
    }

    // --- Mouse interaction ---
    if (mouse.active) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const mouseGlow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 30);
      mouseGlow.addColorStop(0, 'rgba(100, 180, 255, 0.12)');
      mouseGlow.addColorStop(1, 'rgba(60, 100, 180, 0)');
      ctx.fillStyle = mouseGlow;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // --- Flow chevrons ---
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const flowZones = [10, 25, 50, 90, 125, 160, 185];
    for (const fx of flowZones) {
      const offset = (t * 20) % 20;
      for (let i = 0; i < 3; i++) {
        const cx = (fx + i * 6 - 6 + offset * 0.3) * scaleX;
        const cy = h / 2 + Math.sin(t * 2 + fx * 0.5) * 3;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.03 + (i === 1 ? 0.02 : 0)})`;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 4);
        ctx.lineTo(cx + 5, cy);
        ctx.lineTo(cx, cy + 4);
        ctx.lineTo(cx + 2, cy);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();

    // --- Vignette ---
    const vignetteGrad = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.6);
    vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, w, h);

    // --- Scanline sweep ---
    const scanY = ((t * 25) % (h + 80)) - 40;
    const scanGrad = ctx.createLinearGradient(0, scanY - 15, 0, scanY + 15);
    scanGrad.addColorStop(0, 'rgba(100, 180, 255, 0)');
    scanGrad.addColorStop(0.5, 'rgba(100, 180, 255, 0.02)');
    scanGrad.addColorStop(1, 'rgba(100, 180, 255, 0)');
    ctx.fillStyle = scanGrad;
    ctx.fillRect(0, scanY - 15, w, 30);

    animFrameRef.current = requestAnimationFrame(draw);
  }, [engine]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  return (
    <div style={{
      position: 'relative',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 12px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(40, 100, 180, 0.3), 0 0 80px rgba(30, 80, 160, 0.1)',
    }}>
      <canvas
        ref={canvasRef}
        width={1200}
        height={360}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          cursor: 'crosshair',
        }}
      />
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 40%, rgba(255,255,255,0.01) 100%)',
        pointerEvents: 'none',
        borderRadius: 16,
      }} />
      <div style={{
        position: 'absolute',
        bottom: 8,
        right: 12,
        fontSize: 9,
        color: 'rgba(100, 160, 220, 0.4)',
        pointerEvents: 'none',
        fontFamily: 'monospace',
      }}>
        move to disturb · click to inject
      </div>
    </div>
  );
}
