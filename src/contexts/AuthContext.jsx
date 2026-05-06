// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider } from '../config/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
// Import thêm setDoc và serverTimestamp
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'; 

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // --- ĐOẠN CODE THÊM MỚI: LƯU USER VÀO FIRESTORE ---
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
              role: 'buyer',
              createdAt: serverTimestamp()
            });
          }
        } catch (error) {
          console.error("Lỗi khi lưu thông tin user:", error);
        }
        // ----------------------------------------------------

        // Kiểm tra whitelist admin
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.email));
          setIsAdmin(adminDoc.exists());
        } catch (error) {
          setIsAdmin(false);
        }
      } else {
        setCurrentUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
    }
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ currentUser, isAdmin, loginWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};