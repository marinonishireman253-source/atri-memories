import { Suspense, lazy, useState, useEffect } from 'react';
import { AppOverlays } from './app/AppOverlays.jsx';
import { pages, usePageRoute } from './app/pageRouting.js';
import { usePageRevealMotion } from './app/usePageRevealMotion.js';
import { useHomePageModel } from './app/useHomePageModel.js';
import { Header } from './components/Header.jsx';
import { Hero } from './components/Hero.jsx';
import { InteractiveBubbles } from './app/InteractiveBubbles.jsx';
import { CustomCursor } from './app/CustomCursor.jsx';
import { ChibiWidget } from './app/ChibiWidget.jsx';
import { backgroundPresets } from './data/backgrounds.js';

const GalleryPageRoute = lazy(() => import('./app/GalleryPageRoute.jsx').then((module) => ({ default: module.GalleryPageRoute })));
const DailyPageRoute = lazy(() => import('./app/DailyPageRoute.jsx').then((module) => ({ default: module.DailyPageRoute })));
const BlogPageRoute = lazy(() => import('./app/BlogPageRoute.jsx').then((module) => ({ default: module.BlogPageRoute })));
const CaseStudyPageRoute = lazy(() => import('./app/CaseStudyPageRoute.jsx').then((module) => ({ default: module.CaseStudyPageRoute })));
const AdminPageRoute = lazy(() => import('./app/AdminPageRoute.jsx').then((module) => ({ default: module.AdminPageRoute })));

export default function App() {
  const { path, navigate, setNavigationBlocker } = usePageRoute();
  const currentPage = pages.find((page) => page.path === path)
    ?? (path === '/admin' ? { path: '/admin', label: '管理', title: 'Admin' } : pages[0]);
  const { background, footerYear, heroProps, headerProps, overlayProps, galleryRouteProps } =
    useHomePageModel({ navigateToPage: navigate, currentPath: path, setNavigationBlocker });
  const onNavigate = (nextPath) => navigate(nextPath);
  const routeHeaderProps = {
    ...headerProps,
    currentPath: currentPage.path,
    navItems: pages,
    onNavigate,
  };
  usePageRevealMotion(path);

  const [shakeRings, setShakeRings] = useState(false);
  useEffect(() => {
    setShakeRings(true);
    const timer = setTimeout(() => setShakeRings(false), 520);
    return () => clearTimeout(timer);
  }, [path]);

  const [bgLoaded, setBgLoaded] = useState(false);
  useEffect(() => {
    if (!background) return;
    setBgLoaded(false);
    const img = new Image();
    img.src = background;
    img.onload = () => {
      setBgLoaded(true);
    };
  }, [background]);

  const currentPreset = backgroundPresets.find((p) => p.url === background);
  const placeholder = currentPreset?.placeholder || '';

  return (
    <div className="site-shell">
      {placeholder && (
        <div
          className="background-placeholder-layer"
          style={{ '--placeholder-image': `url("${placeholder}")` }}
          aria-hidden="true"
        />
      )}
      <div
        className={`background-layer ${bgLoaded ? 'is-loaded' : ''}`}
        style={{ '--background-image': `url("${background}")` }}
        aria-hidden="true"
      />
      <div className="atmosphere" />
      {path !== '/' && <InteractiveBubbles />}
      <Header {...routeHeaderProps} />
      {path !== '/' && (
        <div className={`notebook-wire-rings-global ${shakeRings ? 'is-shaking' : ''}`} aria-hidden="true">
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i} className="ring-item" />
          ))}
        </div>
      )}
      <main className={`main-content page-${currentPage.title.toLowerCase().replaceAll(' ', '-')}`}>
        <section className="page-transition-panel" key={currentPage.path}>
          <Suspense fallback={null}>
            {path === '/' && <Hero {...heroProps} />}

            {path === '/gallery' && (
              <GalleryPageRoute {...galleryRouteProps} />
            )}

            {path === '/daily' && (
              <DailyPageRoute />
            )}

            {path === '/blog' && (
              <BlogPageRoute {...galleryRouteProps} />
            )}

            {path === '/case-study' && (
              <CaseStudyPageRoute />
            )}

            {path === '/admin' && (
              <AdminPageRoute {...galleryRouteProps} />
            )}
          </Suspense>
        </section>
      </main>
      {path !== '/' && (
        <footer className="site-footer">
          <span>ATRI GALLERY</span>
          <span className="footer-divider" aria-hidden="true" />
          <span>萝卜子是高性能的！</span>
          <span>© {footerYear}</span>
        </footer>
      )}
      <AppOverlays {...overlayProps} />
      <ChibiWidget path={path} />
      <CustomCursor />
    </div>
  );
}
