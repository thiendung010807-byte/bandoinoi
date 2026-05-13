import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Lấy thông tin cấu hình từ file .env
// Tất cả các biến này đều an toàn khi để public trên Front-end
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Khởi tạo Firebase App
const app = initializeApp(firebaseConfig);

// ====================================================================
// TÍNH NĂNG BẢO MẬT: FIREBASE APP CHECK (RECAPTCHA V3 TÀNG HÌNH)
// ====================================================================
// LƯU Ý QUAN TRỌNG: 
// Dùng import.meta.env.PROD để chỉ bật khi build lên Vercel (Production).
// Nếu bật lúc code local (npm run dev), Google sẽ chặn và báo lỗi 401/400.
if (typeof window !== "undefined" && import.meta.env.PROD) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
      // isTokenAutoRefreshEnabled giúp tự động xin lại token mới trước khi token cũ hết hạn
      isTokenAutoRefreshEnabled: true 
    });
    console.log("Firebase App Check đã được kích hoạt thành công!");
  } catch (error) {
    console.error("Lỗi khi khởi tạo Firebase App Check:", error);
  }
}

// Khởi tạo và xuất các công cụ để các Component khác sử dụng
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();