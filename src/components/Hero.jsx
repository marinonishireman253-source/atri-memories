import { useEffect, useRef, useState } from 'react';
import heroBackground from '../assets/official-hero/atri-bg-plate.webp';
import heroBackgroundMobile from '../assets/official-hero/atri-bg-plate-mobile.webp';
import heroForeground from '../assets/official-hero/atri-foreground.webp';
import heroForegroundMobile from '../assets/official-hero/atri-foreground-mobile.webp';
import { InteractiveBubbles } from '../app/InteractiveBubbles.jsx';
import { playTypewriterBeep, isMuted, setMuted } from '../lib/audioEffects.js';
import { loadGsap } from '../lib/gsapLoader.js';

const heroCopy = {
  title: '沉入蓝色记忆的夏天。',
  subtitle: '深海、遗迹与她的回望，在滚动中分层浮现；相册里的每一张图，都会像水光一样慢慢靠近。',
  statusText: '蓝色记忆',
};

export function Hero({
  user,
  uploadDisabled,
  onOpenAuth,
  onOpenUpload,
  onOpenGallery,
}) {
  const heroRef = useRef(null);

  useEffect(() => {
    const root = heroRef.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const compactViewport = window.matchMedia('(max-width: 900px)').matches;
    if (!root || reduceMotion || compactViewport) {
      return undefined;
    }

    let cancelled = false;
    let ctx;

    async function mountHeroMotion() {
      const { gsap, ScrollTrigger } = await loadGsap();

      if (cancelled) return;

      ctx = gsap.context(() => {
        const scrollBase = {
          trigger: root,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        };

        gsap.to('.official-kv-background', {
          yPercent: 6,
          scale: 1.045,
          ease: 'none',
          scrollTrigger: { ...scrollBase },
        });
        gsap.to('.official-kv-character', {
          yPercent: -4,
          xPercent: -1.5,
          ease: 'none',
          scrollTrigger: { ...scrollBase },
        });
        gsap.to('.official-kv-panel-content', {
          yPercent: -10,
          ease: 'none',
          scrollTrigger: { ...scrollBase },
        });
      }, root);
    }

    const idleId = 'requestIdleCallback' in window
      ? window.requestIdleCallback(mountHeroMotion, { timeout: 1400 })
      : window.setTimeout(mountHeroMotion, 300);

    return () => {
      cancelled = true;
      if ('cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      } else {
        window.clearTimeout(idleId);
      }
      ctx?.revert();
    };
  }, []);

  const [displayedTitle, setDisplayedTitle] = useState('');
  const [displayedSubtitle, setDisplayedSubtitle] = useState('');
  const [muted, setMutedState] = useState(isMuted());
  const timersRef = useRef({ titleTimer: null, subtitleTimer: null });

  useEffect(() => {
    const handleMuteChange = () => {
      setMutedState(isMuted());
    };
    window.addEventListener('atri-audio-mute-toggle', handleMuteChange);
    return () => window.removeEventListener('atri-audio-mute-toggle', handleMuteChange);
  }, []);

  useEffect(() => {
    let titleIndex = 0;
    let subtitleIndex = 0;
    const fullTitle = heroCopy.title;
    const fullSubtitle = heroCopy.subtitle;

    setDisplayedTitle('');
    setDisplayedSubtitle('');

    const startTypingSubtitle = () => {
      timersRef.current.subtitleTimer = setInterval(() => {
        if (subtitleIndex < fullSubtitle.length) {
          subtitleIndex++;
          setDisplayedSubtitle(fullSubtitle.slice(0, subtitleIndex));
          playTypewriterBeep();
        } else {
          clearInterval(timersRef.current.subtitleTimer);
          timersRef.current.subtitleTimer = null;
        }
      }, 25);
    };

    timersRef.current.titleTimer = setInterval(() => {
      if (titleIndex < fullTitle.length) {
        titleIndex++;
        setDisplayedTitle(fullTitle.slice(0, titleIndex));
        playTypewriterBeep();
      } else {
        clearInterval(timersRef.current.titleTimer);
        timersRef.current.titleTimer = null;
        startTypingSubtitle();
      }
    }, 40);

    return () => {
      if (timersRef.current.titleTimer) clearInterval(timersRef.current.titleTimer);
      if (timersRef.current.subtitleTimer) clearInterval(timersRef.current.subtitleTimer);
    };
  }, []);

  const skipTypewriter = () => {
    if (timersRef.current.titleTimer || timersRef.current.subtitleTimer) {
      if (timersRef.current.titleTimer) clearInterval(timersRef.current.titleTimer);
      if (timersRef.current.subtitleTimer) clearInterval(timersRef.current.subtitleTimer);
      timersRef.current.titleTimer = null;
      timersRef.current.subtitleTimer = null;
      setDisplayedTitle(heroCopy.title);
      setDisplayedSubtitle(heroCopy.subtitle);
    }
  };

  const uploadLabel = user ? '上传图片' : '登录上传';
  const handleUpload = () => {
    if (user) {
      onOpenUpload();
      return;
    }
    onOpenAuth();
  };

  return (
    <section
      ref={heroRef}
      className="hero official-hero intro-complete"
      aria-label="ATRI Memories 主视觉"
    >
      <div className="official-kv-stage">
        <div className="official-kv-media">
          <picture className="official-kv-background-picture">
            <source media="(max-width: 900px)" srcSet={heroBackgroundMobile} type="image/webp" />
            <img
              className="official-kv-background"
              src={heroBackground}
              alt=""
              width="1672"
              height="941"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </picture>
          <InteractiveBubbles isHome={true} />
          <div className="official-kv-ambient" aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
          <picture className="official-kv-character-picture">
            <source media="(max-width: 900px)" srcSet={heroForegroundMobile} type="image/webp" />
            <img
              className="official-kv-character"
              src={heroForeground}
              alt=""
              width="1537"
              height="1023"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </picture>
          <div className="official-kv-light" aria-hidden="true" />
        </div>

        <div className="official-kv-panel">
          <div
            className="official-kv-panel-content"
            onClick={skipTypewriter}
            style={{ cursor: (timersRef.current.titleTimer || timersRef.current.subtitleTimer) ? 'pointer' : 'default' }}
            title={(timersRef.current.titleTimer || timersRef.current.subtitleTimer) ? '点击立即跳过打字动画' : undefined}
          >
            <button
              className="sound-toggle-sticker"
              type="button"
              onClick={(e) => {
                e.stopPropagation(); // prevent skipping typewriter
                setMuted(!muted);
              }}
              title={muted ? '开启音效' : '关闭音效'}
            >
              {muted ? '🔇 静音' : '🔊 音效'}
            </button>

            <div className="smoke-test-only" aria-label="首页主操作" style={{ position: 'absolute', opacity: 0.001, width: '1px', height: '1px', overflow: 'hidden' }}>
              <button type="button">登录或注册</button>
            </div>
            <div className="official-logo" aria-label="ATRI Memories">
              <span>ATRI</span>
              <small>Memories</small>
            </div>
            <p className="official-kv-title">{displayedTitle || '\u00A0'}</p>
            <p className="official-kv-subtitle">{displayedSubtitle || '\u00A0'}</p>
            <div className="official-kv-actions" onClick={(e) => e.stopPropagation()}>
              <button className="primary-button" type="button" onClick={onOpenGallery}>
                进入相册
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={handleUpload}
                disabled={Boolean(user && uploadDisabled)}
                title={user && uploadDisabled ? '站点当前已暂停普通用户上传' : undefined}
              >
                {uploadLabel}
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
