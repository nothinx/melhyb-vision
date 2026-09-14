import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export default function TrailParticles({
  active = true,
  count = 40,
  color = "#be7a10",
  cacatColor = "#ec835a",
  onActivate,
}: {
  active?: boolean;
  count?: number;
  color?: string;
  cacatColor?: string;
  onActivate?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const emitRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    resize();
    window.addEventListener("resize", resize);

    let lastTime = 0;
    const animate = (time: number) => {
      animRef.current = requestAnimationFrame(animate);
      const dt = Math.min((time - lastTime) / 16.67, 3);
      lastTime = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (emitRef.current) {
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.3 + Math.random() * 0.8;
          const isCacat = Math.random() < 0.12;
          particlesRef.current.push({
            x: mouseRef.current.x * canvas.width,
            y: mouseRef.current.y * canvas.height,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.5,
            life: 0,
            maxLife: 40 + Math.random() * 60,
            size: 1.5 + Math.random() * 3,
            color: isCacat ? cacatColor : color,
          });
        }
        if (particlesRef.current.length > 300) {
          particlesRef.current.splice(0, particlesRef.current.length - 200);
        }
        emitRef.current = false;
      }

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life++;
        p.vy += 0.02 * dt;

        const alpha = 1 - p.life / p.maxLife;
        if (alpha <= 0 || p.y > canvas.height + 10) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(alpha * 200).toString(16).padStart(2, "0");
        ctx.fill();
      }

      if (particlesRef.current.length > 0) {
        ctx.fillStyle = color + "20";
        ctx.beginPath();
        ctx.arc(mouseRef.current.x * canvas.width, mouseRef.current.y * canvas.height, 20, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    animRef.current = requestAnimationFrame(animate);

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / rect.width;
      mouseRef.current.y = (e.clientY - rect.top) / rect.height;
      emitRef.current = true;
    };

    if (active) {
      canvas.addEventListener("mousemove", handleMouse);
      onActivate?.();
    }

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouse);
      cancelAnimationFrame(animRef.current);
    };
  }, [active, count, color, cacatColor, onActivate]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: active ? "auto" : "none",
        borderRadius: "inherit",
      }}
      aria-hidden
    />
  );
}
