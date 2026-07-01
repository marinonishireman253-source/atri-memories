import { useEffect } from 'react';
import { loadGsap } from '../lib/gsapLoader.js';

export function usePageRevealMotion(path) {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const compactViewport = window.matchMedia('(max-width: 900px)').matches;
    if (reduceMotion || compactViewport) return undefined;

    let cancelled = false;
    let ctx;

    async function mountPageReveal() {
      const { gsap, ScrollTrigger } = await loadGsap();
      if (cancelled) return;

      ctx = gsap.context(() => {
        const groups = [
          '.page-intro .eyebrow, .page-intro h1, .page-intro > p',
          '.featured-panel .section-head, .featured-card',
          '.daily-atri-head, .daily-atri-body > *, .daily-atri-question',
          '.home-status-stack > *',
        ];

        groups.forEach((selector) => {
          const elements = gsap.utils.toArray(selector);
          if (!elements.length) return;
          gsap.fromTo(
            elements,
            { autoAlpha: 0, y: 18 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.62,
              ease: 'power3.out',
              stagger: 0.075,
              scrollTrigger: {
                trigger: elements[0],
                start: 'top 84%',
                once: true,
              },
            },
          );
        });
      });
    }

    const idleId = 'requestIdleCallback' in window
      ? window.requestIdleCallback(mountPageReveal, { timeout: 1800 })
      : window.setTimeout(mountPageReveal, 600);

    return () => {
      cancelled = true;
      if ('cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      } else {
        window.clearTimeout(idleId);
      }
      ctx?.revert();
    };
  }, [path]);
}
