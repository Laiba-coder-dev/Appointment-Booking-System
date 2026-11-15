import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#FFF9F0',
                color: '#2A2A2A',
                border: '1px solid #E9DDD7',
                borderRadius: '16px',
                boxShadow: '0 10px 30px -12px rgba(72,20,33,0.25)',
                fontFamily: 'Manrope, sans-serif',
                fontSize: '14px',
                padding: '14px 18px'
              },
              success: {
                iconTheme: { primary: '#641E32', secondary: '#FFF9F0' }
              },
              error: {
                iconTheme: { primary: '#8B3D51', secondary: '#FFF9F0' }
              }
            }}
          />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
