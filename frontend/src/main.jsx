import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { Toaster } from 'sonner';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Toaster position="top-center" text-center offset={10} expand={false} richColors={false} />
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
