import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('🎯 main.tsx: Starting application initialization...');
console.log('🎯 main.tsx: Root element:', document.getElementById('root'));

try {
  const root = ReactDOM.createRoot(document.getElementById('root')!);
  console.log('🎯 main.tsx: React root created successfully');
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('🎯 main.tsx: App component rendered successfully');
} catch (error) {
  console.error('🎯 main.tsx: Error during app initialization:', error);
}