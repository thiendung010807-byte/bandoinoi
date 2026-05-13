import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider } from '../config/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'; 

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true); // Trạng thái tải ban đầu
  
  // State khóa luồng đăng nhập chống khách hàng click đúp
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // Lắng nghe sự thay đổi trạng thái đăng nhập từ Firebase
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // ==================================================
        // TỰ ĐỘNG TẠO HỒ SƠ NGƯỜI DÙNG MỚI VÀO FIRESTORE
        // ==================================================
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          // Nếu user chưa tồn tại trong db, tiến hành tạo mới
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              role: 'buyer', // Mặc định là người mua hàng
              createdAt: serverTimestamp()
            });
          }
        } catch (error) {
          console.error("Lỗi khi lưu thông tin user:", error);
        }

        // ==================================================
        // KIỂM TRA QUYỀN QUẢN TRỊ VIÊN (ADMIN)
        // ==================================================
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.email));
          setIsAdmin(adminDoc.exists());
        } catch (error) {
          console.error("Lỗi khi kiểm tra Admin:", error);
          setIsAdmin(false);
        }
      } else {
        // Nếu đăng xuất
        setCurrentUser(null);
        setIsAdmin(false);
      }
      
      // Hoàn tất kiểm tra, tắt màn hình loading hệ thống
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // ==================================================
  // HÀM ĐĂNG NHẬP (CÓ CHỐNG CLICK ĐÚP VÀ BỌC LỖI UX)
  // ==================================================
  const loginWithGoogle = async () => {
    // Nếu đang mở popup rồi thì chặn luôn không làm gì cả
    if (isLoggingIn) return; 
    
    setIsLoggingIn(true); // Khóa luồng
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      // Bắt riêng lỗi hủy popup để bỏ qua trong im lặng, không làm phiền khách
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        console.log('Khách hàng tự đóng cửa sổ đăng nhập hoặc thao tác quá nhanh.');
      } else {
        console.error("Lỗi đăng nhập:", error);
      }
    } finally {
      setIsLoggingIn(false); // Mở khóa luồng
    }
  };

  // ==================================================
  // HÀM ĐĂNG XUẤT
  // ==================================================
  const logout = () => {
    return signOut(auth);
  };

  // Xuất các giá trị để mọi Component khác đều dùng được
  const value = {
    currentUser,
    isAdmin,
    loginWithGoogle,
    logout,
    isLoggingIn 
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Chỉ hiển thị App khi đã check xong trạng thái đăng nhập */}
      {!loading && children}
    </AuthContext.Provider>
  );
};