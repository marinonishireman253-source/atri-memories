import { lazy } from 'react';

export const AdminPanel = lazy(() =>
  import('../features/admin/AdminPanel.jsx').then((module) => ({ default: module.AdminPanel })),
);

export const AuthModal = lazy(() =>
  import('../features/auth/AuthModal.jsx').then((module) => ({ default: module.AuthModal })),
);


export const ImageViewer = lazy(() =>
  import('../features/viewer/ImageViewer.jsx').then((module) => ({ default: module.ImageViewer })),
);

export const ThemeModal = lazy(() =>
  import('../components/ThemeModal.jsx').then((module) => ({ default: module.ThemeModal })),
);

export const UploadModal = lazy(() =>
  import('../features/upload/UploadModal.jsx').then((module) => ({ default: module.UploadModal })),
);

export const UserPanel = lazy(() =>
  import('../features/user/UserPanel.jsx').then((module) => ({ default: module.UserPanel })),
);

export const BlogEditorModal = lazy(() =>
  import('../features/blog/BlogEditorModal.jsx').then((module) => ({ default: module.BlogEditorModal })),
);
