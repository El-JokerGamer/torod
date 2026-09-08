import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

// تسجيل Service Worker للتثبيت كـ PWA والعمل دون اتصال
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('[Taroud] Service Worker مسجل بنجاح:', registration.scope);
      })
      .catch(error => {
        console.log('[Taroud] فشل تسجيل Service Worker:', error);
      });
  });
}
