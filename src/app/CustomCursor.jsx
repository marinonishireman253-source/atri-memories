import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function CustomCursor() {
  const cursorRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only enable custom cursor on devices that support hover / pointers (non-touch)
    const isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;

    if (isTouchDevice) return;

    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;
    let isMoving = false;
    let rafId = null;
    let hasPointerPosition = false;

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!hasPointerPosition) {
        hasPointerPosition = true;
        currentX = mouseX;
        currentY = mouseY;
        setVisible(true);
        document.documentElement.classList.add('custom-cursor-active');
        requestAnimationFrame(() => {
          if (cursorRef.current) {
            cursorRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
          }
        });
        return;
      }

      if (!isMoving) {
        isMoving = true;
        updatePosition();
      }
    };

    const updatePosition = () => {
      const ease = 0.45; // Smoothing lerp factor. Increased to 0.45 to resolve input lag while maintaining micro-smoothing.
      const dx = mouseX - currentX;
      const dy = mouseY - currentY;

      currentX += dx * ease;
      currentY += dy * ease;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      }

      // Stop requesting frames once the cursor gets close enough to mouse position to save CPU cycles
      if (Math.abs(dx) < 0.08 && Math.abs(dy) < 0.08) {
        currentX = mouseX;
        currentY = mouseY;
        if (cursorRef.current) {
          cursorRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        }
        isMoving = false;
        rafId = null;
      } else {
        rafId = requestAnimationFrame(updatePosition);
      }
    };

    const pointerCache = new WeakMap();

    const handleMouseOver = (e) => {
      const target = e.target;
      if (!target) return;

      const tag = target.tagName;
      if (
        tag === 'A' ||
        tag === 'BUTTON' ||
        tag === 'INPUT' ||
        tag === 'SELECT' ||
        tag === 'TEXTAREA'
      ) {
        setHovered(true);
        return;
      }

      if (
        target.closest('a') ||
        target.closest('button') ||
        target.closest('[role="button"]') ||
        target.closest('.refresh-button') ||
        target.closest('.theme-dot') ||
        target.closest('.action-dot') ||
        target.closest('.viewer-nav') ||
        target.closest('.viewer-close') ||
        target.closest('.chibi-body') ||
        target.closest('.sound-toggle-sticker') ||
        target.closest('.blog-card')
      ) {
        setHovered(true);
        return;
      }

      let isPointer = pointerCache.get(target);
      if (isPointer === undefined) {
        isPointer = window.getComputedStyle(target).cursor === 'pointer';
        pointerCache.set(target, isPointer);
      }

      setHovered(isPointer);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseover', handleMouseOver, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
      if (rafId) cancelAnimationFrame(rafId);
      document.documentElement.classList.remove('custom-cursor-active');
    };
  }, []);

  if (!visible) return null;

  const cursorContent = (
    <div
      ref={cursorRef}
      className={`custom-cursor-wrap ${hovered ? 'is-hovered' : ''}`}
      aria-hidden="true"
    >
      <div className="custom-cursor-card">
        {/* Hotspot anchor arrow tip */}
        <div className="custom-cursor-pointer-tip" />

        {/* Unique Chibi sticker icon for cursor */}
        <img
          src="/atri-cursor-icon.png"
          alt=""
          className="custom-cursor-avatar"
          onError={(e) => {
            // Fallback to a placeholder character/symbol if the icon fails to load
            e.target.style.display = 'none';
          }}
        />

        {/* Pop-up "高性能!" speech bubble sticker */}
        <div className="custom-cursor-bubble">
          <span>高性能!</span>
        </div>

        {hovered && <span className="custom-cursor-heart">❤️</span>}
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(cursorContent, document.body);
  }

  return cursorContent;
}
