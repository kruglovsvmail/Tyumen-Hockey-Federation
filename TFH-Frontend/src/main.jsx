import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.jsx';
import './assets/global.css';
import './assets/pages.css';
import './scrollbarAutoHide.js';
// Кадрирование фото 3:4 в квадратных рамках — глобально, см. utils/photoCrop.js
import './utils/photoCrop.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
