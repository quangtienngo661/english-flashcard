import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <p>Wordmet Admin</p>
  </StrictMode>,
);
