import { useEffect, useState, useRef } from 'react';

function resolveCanShowChibi() {
  if (typeof window === 'undefined') return false;
  return !window.matchMedia('(max-width: 600px)').matches
    && !window.matchMedia('(pointer: coarse)').matches;
}

export function ChibiWidget({ path }) {
  const [canShowChibi, setCanShowChibi] = useState(resolveCanShowChibi);
  const [wobble, setWobble] = useState(false);
  const [expression, setExpression] = useState('在线');
  const [isHovered, setIsHovered] = useState(false);
  const [tempEmotion, setTempEmotion] = useState(null); // 'proud' | 'panicked' | null

  const lastScrollY = useRef(0);
  const timeoutRef = useRef(null);
  const tempEmotionTimeoutRef = useRef(null);

  useEffect(() => {
    const compactQuery = window.matchMedia('(max-width: 600px)');
    const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
    const updateVisibility = () => {
      setCanShowChibi(!compactQuery.matches && !coarsePointerQuery.matches);
    };

    updateVisibility();
    compactQuery.addEventListener('change', updateVisibility);
    coarsePointerQuery.addEventListener('change', updateVisibility);

    return () => {
      compactQuery.removeEventListener('change', updateVisibility);
      coarsePointerQuery.removeEventListener('change', updateVisibility);
    };
  }, []);

  // 1. Listen for custom events to trigger temporary expressive states
  useEffect(() => {
    if (!canShowChibi) return undefined;

    const handleBlogSuccess = () => {
      setTempEmotion('proud');
      if (tempEmotionTimeoutRef.current) clearTimeout(tempEmotionTimeoutRef.current);
      tempEmotionTimeoutRef.current = setTimeout(() => {
        setTempEmotion(null);
      }, 6000);
    };

    const handleAuthFailure = () => {
      setTempEmotion('panicked');
      if (tempEmotionTimeoutRef.current) clearTimeout(tempEmotionTimeoutRef.current);
      tempEmotionTimeoutRef.current = setTimeout(() => {
        setTempEmotion(null);
      }, 6000);
    };

    window.addEventListener('atri-blog-publish-success', handleBlogSuccess);
    window.addEventListener('atri-auth-failure', handleAuthFailure);

    return () => {
      window.removeEventListener('atri-blog-publish-success', handleBlogSuccess);
      window.removeEventListener('atri-auth-failure', handleAuthFailure);
      if (tempEmotionTimeoutRef.current) clearTimeout(tempEmotionTimeoutRef.current);
    };
  }, [canShowChibi]);

  // 2. Update expression sticker based on route path
  useEffect(() => {
    if (!canShowChibi) return;

    if (path === '/') {
      setExpression('Hello! // 在线');
    } else if (path === '/daily') {
      setExpression('⭐ 今日记录');
    } else if (path === '/gallery') {
      setExpression('❤️ 收集碎片');
    } else if (path === '/blog') {
      setExpression('📖 日常日记');
    } else {
      setExpression('在线');
    }
  }, [canShowChibi, path]);

  // 3. Scroll wobble animation trigger with requestAnimationFrame throttling
  useEffect(() => {
    if (!canShowChibi) return undefined;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const diff = Math.abs(currentScrollY - lastScrollY.current);
          if (diff > 12) {
            setWobble(true);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
              setWobble(false);
            }, 800);
          }
          lastScrollY.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [canShowChibi]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    setWobble(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setWobble(false);
    }, 1200);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // 4. Resolve current avatar image and sticker label depending on state priorities
  const isLateNight = () => {
    const hours = new Date().getHours();
    return hours >= 23 || hours < 5;
  };

  if (!canShowChibi) return null;

  let activeEmotion = 'normal';
  let stickerText = expression;

  if (tempEmotion === 'proud') {
    activeEmotion = 'proud';
    stickerText = '✨ 高性能！';
  } else if (tempEmotion === 'panicked') {
    activeEmotion = 'panicked';
    stickerText = '💦 哇哇哇！';
  } else if (isHovered) {
    activeEmotion = 'thinking';
    stickerText = '💬 思考中...';
  } else if (isLateNight()) {
    activeEmotion = 'sleepy';
    stickerText = '💤 困了...';
  } else {
    activeEmotion = 'normal';
    stickerText = expression;
  }

  const avatarUrl = `/atri-chibi-${activeEmotion}.png`;

  return (
    <div
      className={`chibi-widget-container ${wobble ? 'is-wobbling' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-hidden="true"
    >
      <div className="chibi-chain" />
      <div className="chibi-body">
        <div className="chibi-mood-sticker">{stickerText}</div>
        <div
          className="chibi-character-img"
          style={{ backgroundImage: `url('${avatarUrl}')` }}
        />
      </div>
    </div>
  );
}
