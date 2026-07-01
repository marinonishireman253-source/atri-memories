import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

const BOOT_INTRO_HIDE_DELAY_MS = 800;
const BOOT_INTRO_REMOVE_DELAY_MS = 1200;

window.setTimeout(() => {
  document.getElementById('boot-intro')?.classList.add('is-hiding');
}, BOOT_INTRO_HIDE_DELAY_MS);

window.setTimeout(() => {
  document.getElementById('boot-intro')?.remove();
}, BOOT_INTRO_REMOVE_DELAY_MS);
