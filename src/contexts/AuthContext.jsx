import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider } from '../config/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'; 

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true); 
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // ==================================================
        // TỰ ĐỘNG TẠO HỒ SƠ NGƯỜI DÙNG
        // ==================================================
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              role: 'buyer',
              createdAt: serverTimestamp()
            });
          }
        } catch (error) {
          console.error("Lỗi khi lưu thông tin user:", error);
        }

        // ==================================================
        // KIỂM TRA QUYỀN QUẢN TRỊ VIÊN & SUPER ADMIN
        // ==================================================
        // [CHỐT CHẶN]: Nếu user không có email (VD lỗi mạng hoặc đổi phương thức đăng nhập), dừng ngay để không gọi DB gây lỗi.
        if (!user.email) {
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setLoading(false);
          return; 
        }

        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.email));
          if (adminDoc.exists()) {
            setIsAdmin(true); 
            
            const adminData = adminDoc.data();
            // Khớp với Rule của bạn: có trường 'assmin' và là kiểu string
            if (typeof adminData.assmin === 'string') {
              setIsSuperAdmin(true);
            } else {
              setIsSuperAdmin(false);
            }
          } else {
            setIsAdmin(false);
            setIsSuperAdmin(false);
          }
        } catch (error) {
          console.error("Lỗi khi kiểm tra Admin:", error);
          setIsAdmin(false);
          setIsSuperAdmin(false);
        }
      } else {
        setCurrentUser(null);
        setIsAdmin(false);
        setIsSuperAdmin(false); 
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    if (isLoggingIn) return; 
    setIsLoggingIn(true); 
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        console.error("Lỗi đăng nhập:", error);
      }
    } finally {
      setIsLoggingIn(false); 
    }
  };

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    currentUser,
    isAdmin,
    isSuperAdmin,
    loginWithGoogle,
    logout,
    isLoggingIn 
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
