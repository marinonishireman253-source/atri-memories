import { useEffect, useRef, useState } from 'react';
import { memoryIdFromLocation } from '../lib/routes.js';

export const pages = [
  { path: '/', label: '首页', title: 'Top' },
  { path: '/gallery', label: '相册', title: 'Gallery' },
  { path: '/daily', label: '每日', title: 'Daily' },
  { path: '/blog', label: '博客', title: 'Blog' },
  { path: '/case-study', label: '项目', title: 'Case Study' },
];

export function normalizePagePath(pathname = '/') {
  const pathOnly = String(pathname).split(/[?#]/)[0] || '/';
  const cleanPath = pathOnly.replace(/\/+$/, '') || '/';
  if (cleanPath === '/about') return '/daily';
  if (cleanPath === '/admin') return '/admin';
  if (memoryIdFromLocation({ pathname: pathOnly })) return '/gallery';
  return pages.some((page) => page.path === cleanPath) ? cleanPath : '/';
}

function navigationUrlFor(nextPath, normalizedPath) {
  const rawPath = String(nextPath ?? normalizedPath);
  const suffixStart = rawPath.search(/[?#]/);
  const suffix = suffixStart >= 0 ? rawPath.slice(suffixStart) : '';
  return `${normalizedPath}${suffix}`;
}

export function usePageRoute() {
  const [path, setPath] = useState(() => normalizePagePath(window.location.pathname));
  const pathRef = useRef(path);
  const navigationBlockerRef = useRef(null);

  const allowNavigation = (nextPath, source) =>
    navigationBlockerRef.current?.(nextPath, {
      source,
      currentPath: pathRef.current,
    }) !== false;

  const setNavigationBlocker = (blocker) => {
    navigationBlockerRef.current = blocker;
  };

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
    const normalized = normalizePagePath(window.location.pathname);
    if (window.location.pathname !== normalized) {
      window.history.replaceState({}, '', normalized);
      pathRef.current = normalized;
      setPath(normalized);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const normalized = normalizePagePath(window.location.pathname);
      if (!allowNavigation(normalized, 'popstate')) {
        window.history.replaceState({}, '', pathRef.current);
        return;
      }
      pathRef.current = normalized;
      setPath(normalized);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (nextPath) => {
    const normalized = normalizePagePath(nextPath);
    if (!allowNavigation(normalized, 'navigate')) {
      return false;
    }
    const nextUrl = navigationUrlFor(nextPath, normalized);
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentUrl !== nextUrl) {
      window.history.pushState({}, '', nextUrl);
    }
    pathRef.current = normalized;
    setPath(normalized);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  };

  return { path, navigate, setNavigationBlocker };
}
