import { useRef, useState, useEffect } from 'react';
import { playCassetteClick } from '../lib/audioEffects.js';

export function Header({
  connected,
  totalCount,
  user,
  isAdmin,
  uploadDisabled,
  onOpenTheme,
  onOpenUpload,
  onOpenUser,
  onOpenAdmin,
  onOpenAuth,
  onSignOut,
  onShowMyImages,
  onShowFavorites,
  favoritesAvailable,
  currentPath,
  navItems = [],
  onNavigate,
  onOpenBlogEditor,
}) {
  const userMenuRef = useRef(null);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.35;
    }

    // Automatically pause BGM when any other audio elements (like daily voice) begin playing
    const handleGlobalPlay = (e) => {
      if (e.target !== audioRef.current && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    };
    document.addEventListener('play', handleGlobalPlay, true);

    return () => {
      document.removeEventListener('play', handleGlobalPlay, true);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const togglePlay = () => {
    playCassetteClick();
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch((err) => {
        console.error('BGM Playback failed:', err);
      });
    } else {
      audio.pause();
    }
  };

  const closeUserMenu = () => {
    if (userMenuRef.current) userMenuRef.current.open = false;
  };
  const handleNav = (event, path) => {
    playCassetteClick();
    if (!onNavigate) return;
    event.preventDefault();
    closeUserMenu();
    onNavigate(path);
  };
  const runMenuAction = (action) => {
    closeUserMenu();
    action?.();
  };
  const totalLabel = totalCount > 0 ? `${totalCount} 张记忆` : '记忆空间';

  return (
    <header className="site-header">
      {/* Top Branding Section */}
      <a href="/" onClick={(e) => handleNav(e, '/')} className="sidebar-brand" aria-label="返回首页">
        <div className="sidebar-logo">
          <span className="logo-main">ATRI</span>
          <span className="logo-sub">Memories</span>
        </div>
      </a>

      {/* Middle Navigation Links */}
      <nav className="site-nav" aria-label="站点页面">
        {navItems.map((item) => (
          <a
            className={currentPath === item.path ? 'active' : ''}
            href={item.path}
            key={item.path}
            onClick={(event) => handleNav(event, item.path)}
            aria-current={currentPath === item.path ? 'page' : undefined}
          >
            <span className="nav-accent-dash" />
            <span className="nav-label-en">{item.title || item.label}</span>
            <span className="nav-label-zh">{item.label}</span>
          </a>
        ))}
      </nav>

      {/* Bottom Status & Decorative Music Bar */}
      <div className="sidebar-footer">
        <div className="sidebar-decorations">
          <button
            className={`decor-audio-cassette ${isPlaying ? 'is-playing' : ''}`}
            onClick={togglePlay}
            aria-label="背景音乐播放器"
            type="button"
            title={isPlaying ? '点击暂停 BGM' : '点击播放 BGM'}
          >
            <div className="cassette-casing">
              <div className="cassette-label">
                <span className="cassette-label-text">BGM: SEA BREEZE</span>
                <div className="cassette-label-stripes" />
              </div>
              <div className="cassette-window">
                <div className="cassette-spindle left-spindle">
                  <svg viewBox="0 0 24 24" className="spindle-gear-svg">
                    <circle cx="12" cy="12" r="7" fill="none" stroke="var(--ink)" strokeWidth="2" />
                    <path d="M12,2 L12,5 M12,19 L12,22 M2,12 L5,12 M19,12 L22,12 M5,5 L7,7 M17,17 L19,19 M5,19 L7,17 M17,7 L19,5" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="12" cy="12" r="3.5" fill="var(--ink)" />
                  </svg>
                </div>
                <div className="cassette-spindle right-spindle">
                  <svg viewBox="0 0 24 24" className="spindle-gear-svg">
                    <circle cx="12" cy="12" r="7" fill="none" stroke="var(--ink)" strokeWidth="2" />
                    <path d="M12,2 L12,5 M12,19 L12,22 M2,12 L5,12 M19,12 L22,12 M5,5 L7,7 M17,17 L19,19 M5,19 L7,17 M17,7 L19,5" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="12" cy="12" r="3.5" fill="var(--ink)" />
                  </svg>
                </div>
                <div className="tape-roll left-roll" />
                <div className="tape-roll right-roll" />
              </div>
              <div className="cassette-bottom-shield" />
            </div>
            <audio
              ref={audioRef}
              src="/audio/daily-atri/tomorrow-promise.mp3"
              preload="none"
              loop
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </button>
        </div>

        <div className="nav-status" aria-label="站点状态">
          <span className={`nav-state ${connected ? 'online' : ''}`}>
            {connected ? '已同步' : '预览'}
            <span style={{ position: 'absolute', opacity: 0.001, width: '1px', height: '1px', overflow: 'hidden', pointerEvents: 'none' }}>
              {connected ? 'Cloud linked' : 'Preview mode'}
            </span>
          </span>
          <span className="nav-divider" />
          <span className="nav-total">{totalLabel}</span>
        </div>

        <div className="header-actions">
          <button className="site-icon-action" type="button" onClick={onOpenTheme} title="更换背景色">
            <span aria-hidden="true" className="site-action-mark" />
            <span>背景</span>
          </button>
          {user ? (
            <>
              {isAdmin && (
                <button className="site-action primary admin-entry" type="button" onClick={() => runMenuAction(onOpenAdmin)}>
                  管理后台
                </button>
              )}
              <details className="site-user-menu" ref={userMenuRef}>
                <summary>
                  <span>{isAdmin ? '管理员' : '我的'}</span>
                </summary>
                <div className="site-user-popover">
                  <button type="button" onClick={() => runMenuAction(onShowMyImages)}>
                    我的图片
                  </button>
                  {favoritesAvailable && (
                    <button type="button" onClick={() => runMenuAction(onShowFavorites)}>
                      我的收藏
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => runMenuAction(onOpenUpload)}
                    disabled={uploadDisabled}
                    title={uploadDisabled ? '站点当前已暂停普通用户上传' : undefined}
                  >
                    批量上传
                  </button>
                  <button type="button" onClick={() => runMenuAction(onOpenUser)}>
                    我的空间
                  </button>
                  {isAdmin && (
                    <>
                      <button type="button" onClick={() => runMenuAction(onOpenAdmin)}>
                        管理后台
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          closeUserMenu();
                          if (currentPath !== '/blog') {
                            onNavigate?.('/blog?write=true');
                          } else {
                            onOpenBlogEditor?.();
                          }
                        }}
                      >
                        撰写博客
                      </button>
                    </>
                  )}
                  <button type="button" onClick={() => runMenuAction(onSignOut)}>
                    退出
                  </button>
                </div>
              </details>
            </>
          ) : (
            <button className="site-action primary" type="button" onClick={onOpenAuth}>
              登录
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
