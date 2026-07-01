import { useEffect, useRef } from 'react';

export function InteractiveBubbles({ isHome = false } = {}) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, lastX: 0, lastY: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId;
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Set pixel ratio for retina screens
    const dpr = window.devicePixelRatio || 1;

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Pop effect particles
    class PopEffect {
      constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.maxRadius = radius * 1.5;
        this.opacity = 0.8;
        this.color = color;
      }
      update() {
        this.radius += (this.maxRadius - this.radius) * 0.22;
        this.opacity -= 0.08;
      }
      draw(c) {
        if (this.opacity <= 0) return;
        c.save();
        c.globalAlpha = this.opacity;
        c.strokeStyle = this.color;
        c.lineWidth = 1.2;
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.stroke();
        
        // Draw tiny spark particles shooting out
        c.fillStyle = this.color;
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2 + this.radius * 0.04;
          const sx = this.x + Math.cos(angle) * (this.radius + 3);
          const sy = this.y + Math.sin(angle) * (this.radius + 3);
          c.beginPath();
          c.arc(sx, sy, 1, 0, Math.PI * 2);
          c.fill();
        }
        c.restore();
      }
    }

    // Bubble definitions
    class Bubble {
      constructor(isAmbient = false) {
        this.isAmbient = isAmbient;
        this.reset();
        if (isAmbient) {
          // Spread initially across the screen height for ambient bubbles
          this.y = Math.random() * height;
        }
      }

      reset() {
        this.radius = this.isAmbient 
          ? Math.random() * 12 + 6 
          : Math.random() * 8 + 3;
        this.x = Math.random() * width;
        this.y = height + this.radius + 10;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = -(Math.random() * 0.8 + 0.3); // Rise speed
        this.opacity = this.isAmbient ? Math.random() * 0.25 + 0.15 : 0.6;
        this.baseOpacity = this.opacity;
        this.swaySpeed = Math.random() * 0.02 + 0.005;
        this.swayOffset = Math.random() * Math.PI * 2;
        this.swayAmplitude = Math.random() * 1.2 + 0.4;
        
        // Wobble physics (squash & stretch)
        this.wobbleTime = Math.random() * Math.PI * 2;
        this.wobbleSpeed = Math.random() * 0.08 + 0.04;
        this.wobbleAmplitude = Math.random() * 0.05 + 0.025; // 2.5% to 7.5% wobble range
        
        // Repulsion offset velocities
        this.rx = 0;
        this.ry = 0;
      }

      update(mouseX, mouseY, mouseActive) {
        this.swayOffset += this.swaySpeed;
        this.wobbleTime += this.wobbleSpeed;
        
        // Basic movement
        let targetX = this.vx + Math.sin(this.swayOffset) * this.swayAmplitude;
        let targetY = this.vy;

        // Mouse interaction for ambient bubbles
        if (this.isAmbient && mouseActive) {
          const dx = this.x - mouseX;
          const dy = this.y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 140; // repulsion radius

          if (dist < maxDist) {
            const force = (maxDist - dist) / maxDist;
            const angle = Math.atan2(dy, dx);
            // Smoothly add repulsion velocities
            this.rx += Math.cos(angle) * force * 1.5;
            this.ry += Math.sin(angle) * force * 1.5;
          }

          // Pop if mouse moves extremely fast right through the bubble center
          const mouseSpeed = Math.sqrt(
            (mouseX - mouseRef.current.lastX) * (mouseX - mouseRef.current.lastX) +
            (mouseY - mouseRef.current.lastY) * (mouseY - mouseRef.current.lastY)
          );
          if (dist < this.radius + 14 && mouseSpeed > 16) {
            popEffects.push(new PopEffect(this.x, this.y, this.radius, 'rgba(134, 222, 255, 0.7)'));
            this.reset();
            return;
          }
        }

        // Apply drag/decay to the repulsion offset
        this.rx *= 0.92;
        this.ry *= 0.92;

        this.x += targetX + this.rx;
        this.y += targetY + this.ry;

        // Border wrapping/recycling for ambient bubbles
        if (this.isAmbient) {
          if (this.y < -this.radius || this.x < -this.radius || this.x > width + this.radius) {
            this.reset();
          }
        } else {
          // Trail bubbles decay faster, fade and shrink
          this.opacity -= 0.006;
          this.radius -= 0.02;
        }
      }

      draw(c) {
        if (this.opacity <= 0 || this.radius <= 0) return;

        c.save();
        c.globalAlpha = this.opacity;

        // Calculate dynamic squash and stretch (wobble)
        const currentWobble = Math.sin(this.wobbleTime) * this.wobbleAmplitude;
        const totalVelX = this.vx + this.rx;
        const totalVelY = this.vy + this.ry;
        const speed = Math.sqrt(totalVelX * totalVelX + totalVelY * totalVelY);
        // Stretch proportional to movement speed, capped at 20%
        const speedStretch = Math.min(0.2, speed * 0.05); 
        
        const rx = this.radius * (1 + currentWobble + speedStretch);
        const ry = this.radius * (1 - currentWobble - speedStretch);
        // Rotation aligned with movement vector
        const rot = Math.atan2(totalVelY, totalVelX) + Math.PI / 2;

        // Calculate shimmering iridescent colors
        const shimmer = this.swayOffset;
        const hueCyan = Math.floor((188 + Math.sin(shimmer) * 22) % 360);
        const huePink = Math.floor((328 + Math.cos(shimmer) * 28) % 360);

        // Draw bubble shadow/body
        c.translate(this.x, this.y);
        c.rotate(rot);

        const grad = c.createRadialGradient(
          -rx * 0.3,
          -ry * 0.3,
          this.radius * 0.05,
          0,
          0,
          this.radius
        );
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
        grad.addColorStop(0.4, `hsla(${hueCyan}, 92%, 82%, 0.12)`);
        grad.addColorStop(0.85, `hsla(${huePink}, 92%, 84%, 0.15)`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.08)');

        c.fillStyle = grad;
        c.beginPath();
        c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        c.fill();

        // Highlight outer stroke
        c.strokeStyle = 'rgba(255, 255, 255, 0.32)';
        c.lineWidth = 1;
        c.beginPath();
        c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        c.stroke();

        // Inner glowing border reflection
        c.strokeStyle = `hsla(${hueCyan}, 90%, 80%, 0.22)`;
        c.lineWidth = 1.5;
        c.beginPath();
        c.ellipse(0, 0, Math.max(0.1, rx - 1), Math.max(0.1, ry - 1), 0, 0, Math.PI * 2);
        c.stroke();

        // 3D Highlight spot (primary light reflection)
        c.fillStyle = 'rgba(255, 255, 255, 0.65)';
        c.beginPath();
        c.ellipse(-rx * 0.35, -ry * 0.35, Math.max(0.1, rx * 0.18), Math.max(0.1, ry * 0.18), 0, 0, Math.PI * 2);
        c.fill();

        // Secondary bottom-right crescent reflection (refraction bounce)
        c.strokeStyle = 'rgba(255, 255, 255, 0.26)';
        c.lineWidth = Math.max(0.6, this.radius * 0.07);
        c.beginPath();
        c.ellipse(0, 0, rx * 0.8, ry * 0.8, 0, 0.15 * Math.PI, 0.45 * Math.PI);
        c.stroke();

        c.restore();
      }
    }

    // Initialize ambient background bubbles
    const ambientCount = 18;
    const ambientBubbles = Array.from({ length: ambientCount }, () => new Bubble(true));
    
    // Dynamic mouse trail bubbles array
    let trailBubbles = [];

    // Pop effects array
    let popEffects = [];

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      const m = mouseRef.current;

      // Update & Draw Ambient bubbles
      for (let i = 0; i < ambientBubbles.length; i++) {
        const b = ambientBubbles[i];
        b.update(m.x, m.y, m.active);
        b.draw(ctx);
      }

      // Update & Draw Trail bubbles
      for (let i = trailBubbles.length - 1; i >= 0; i--) {
        const b = trailBubbles[i];
        b.update(m.x, m.y, m.active);
        if (b.opacity <= 0 || b.radius <= 0) {
          // Trigger a tiny pop ring when trail bubbles vanish
          if (b.radius > 2.5) {
            popEffects.push(new PopEffect(b.x, b.y, b.radius, 'rgba(255, 255, 255, 0.35)'));
          }
          trailBubbles.splice(i, 1);
        } else {
          b.draw(ctx);
        }
      }

      // Update & Draw Pop effects
      for (let i = popEffects.length - 1; i >= 0; i--) {
        const p = popEffects[i];
        p.update();
        if (p.opacity <= 0) {
          popEffects.splice(i, 1);
        } else {
          p.draw(ctx);
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    // Event listeners
    const handleMouseMove = (e) => {
      const m = mouseRef.current;
      m.x = e.clientX;
      m.y = e.clientY;
      m.active = true;

      // Check travel distance to limit trail bubble density
      const dx = m.x - m.lastX;
      const dy = m.y - m.lastY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 8) {
        // Spawn 1-2 trail bubbles
        const count = dist > 25 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          const tb = new Bubble(false);
          // Spawn exactly at the cursor with slight random offset
          tb.x = m.x + (Math.random() - 0.5) * 6;
          tb.y = m.y + (Math.random() - 0.5) * 6;
          // Drifts upward with initial cursor inertia influence
          tb.vx = (Math.random() - 0.5) * 1.2 + (dx * 0.05);
          tb.vy = -Math.random() * 1.5 - 0.6 + (dy * 0.05);
          trailBubbles.push(tb);
        }

        m.lastX = m.x;
        m.lastY = m.y;
      }
    };

    const handlePointerDown = (e) => {
      // Don't trigger if it's not a primary click/touch
      if (e.button !== undefined && e.button !== 0) return;
      const m = mouseRef.current;
      m.x = e.clientX;
      m.y = e.clientY;
      m.active = true;

      // 1. Create a physical shockwave pushing ambient bubbles
      for (let i = 0; i < ambientBubbles.length; i++) {
        const b = ambientBubbles[i];
        const dx = b.x - m.x;
        const dy = b.y - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 260) {
          const force = (260 - dist) / 260;
          const angle = Math.atan2(dy, dx);
          // Give a strong sudden impulse outward
          b.rx += Math.cos(angle) * force * 10;
          b.ry += Math.sin(angle) * force * 10;
        }
      }

      // 2. Spawn a beautiful ring burst of trail bubbles
      const burstCount = 12;
      for (let i = 0; i < burstCount; i++) {
        const angle = (i / burstCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const speed = Math.random() * 2.8 + 1.2;
        const tb = new Bubble(false);
        tb.x = m.x;
        tb.y = m.y;
        tb.vx = Math.cos(angle) * speed;
        tb.vy = Math.sin(angle) * speed - 0.3; // slight rise bias
        tb.radius = Math.random() * 6 + 3;
        tb.opacity = 0.8;
        trailBubbles.push(tb);
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="global-bubbles"
      style={{
        position: isHome ? 'absolute' : 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: isHome ? 2 : -1,
        display: 'block',
      }}
      aria-hidden="true"
    />
  );
}
