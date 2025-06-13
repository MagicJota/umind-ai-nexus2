
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('main.tsx: Starting application');

const container = document.getElementById("root");
if (!container) {
  console.error('main.tsx: Failed to find the root element');
  throw new Error('Failed to find the root element');
}

console.log('main.tsx: Root element found, creating React root');

const root = createRoot(container);
root.render(<App />);

console.log('main.tsx: Application rendered');
