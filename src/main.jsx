import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

/**
 * FILE KHỞI TẠO HỆ THỐNG
 * * Lưu ý: Chúng ta không cần bọc <GoogleReCaptchaProvider> ở đây 
 * vì tính năng reCAPTCHA dành cho Firebase đã được xử lý tự động 
 * và tàng hình thông qua App Check trong file 'src/config/firebase.js'.
 */

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Toàn bộ các Provider như AuthProvider (Quản lý đăng nhập) 
        và CartProvider (Quản lý giỏ hàng) nên được đặt bên trong 
        file App.jsx để giữ cho cấu trúc code rõ ràng và dễ bảo trì.
    */}
    <App />
  </React.StrictMode>
);