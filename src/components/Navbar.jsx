import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, LayoutDashboard, User, Package, LogIn, Menu, X, Flame } from 'lucide-react';
import { useCart } from '../store/useCart';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const { items, getTotalPrice } = useCart();
  const { currentUser, logout, isAdmin } = useAuth();
  const location = useLocation();

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // LOGIC HIỂN THỊ NÚT ADMIN VÀ TRẠNG THÁI ĐƠN
  const ShowAdminButton = isAdmin; // Chỉ hiện nút Admin nếu là Admin
  const ShowOrdersButton = !!currentUser; // Chỉ hiện nút Đơn hàng nếu đã đăng nhập

  const isTabActive = (path) => location.pathname === path;

  return (
    <header className="bg-white sticky top-0 z-40 border-b border-slate-100 animate-fade-in shadow-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 sm:h-18 flex items-center justify-between gap-2">
        {/* LOGO */}
        <Link to="/" className="flex items-center gap-1.5 shrink-0 group">
          <motion.div whileHover={{ scale: 1.1, rotate: 10 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-green-500/20 group-hover:bg-green-600 transition-colors">MHX</motion.div>
          <div className="flex flex-col">
            <span className="text-xl font-heading font-extrabold text-slate-900 leading-none group-hover:text-green-600 transition-colors">Gây Quỹ</span>
            <span className="text-[9px] font-bold text-slate-400 mt-0.5 tracking-wide group-hover:text-slate-500 transition-colors">ĐỘI TN MHX 2026</span>
          </div>
        </Link>

        {/* ======================= NAV CONTROL (CẢ MOBILE VÀ DESKTOP ĐỀU HIỆN) ======================= */}
        <div className="flex items-center gap-1.5 md:gap-3 shrink-0 ml-auto">
          
          {/* NÚT TÀI KHOẢN */}
          {currentUser ? (
            <div className="flex items-center gap-1.5">
              <div className="flex-col items-end hidden sm:flex">
                <span className="text-xs font-bold text-slate-900">{currentUser.displayName || 'Tài khoản'}</span>
                <span className="text-[10px] text-slate-500">{currentUser.email}</span>
              </div>
              <motion.button whileTap={{ scale: 0.95 }} onClick={logout} className="p-2.5 sm:p-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-all shadow-inner" title="Đăng xuất"><User className="w-5 h-5" /></motion.button>
            </div>
          ) : (
            <Link to="/auth" className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl font-bold text-sm transition-all shadow-md shadow-green-500/10">
              <LogIn className="w-4 h-4" /><span className="hidden xs:inline">Đăng nhập</span>
            </Link>
          )}

          {/* DẢI NÚT CHỨC NĂNG (Scroll ngang trên mobile) */}
          <div className="flex items-center gap-1.5 md:gap-3 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/50 shadow-inner overflow-x-auto custom-scrollbar-hide max-w-[200px] xs:max-w-none">
            
            {/* NÚT TRẠNG THÁI ĐƠN HÀNG */}
            {ShowOrdersButton && (
              <motion.div whileTap={{ scale: 0.9 }}>
                <Link to="/my-orders" className={`p-2.5 rounded-xl flex items-center gap-2 group transition-all ${isTabActive('/my-orders') ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}>
                  <Package className="w-5 h-5 shrink-0" />
                  <span className={`text-sm font-bold xs:block ${isTabActive('/my-orders') ? '' : 'hidden sm:block'}`}>Đơn hàng</span>
                </Link>
              </motion.div>
            )}
            
            {/* NÚT ADMIN DASHBOARD */}
            {ShowAdminButton && (
              <motion.div whileTap={{ scale: 0.9 }}>
                <Link to="/admin" className={`p-2.5 rounded-xl flex items-center gap-2 group transition-all ${isTabActive('/admin') ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}>
                  <LayoutDashboard className="w-5 h-5 shrink-0" />
                  <span className={`text-sm font-bold xs:block ${isTabActive('/admin') ? '' : 'hidden sm:block'}`}>Admin</span>
                </Link>
              </motion.div>
            )}

            {/* NÚT GIỎ HÀNG */}
            <motion.div whileTap={{ scale: 0.9 }}>
              <Link to="/cart" className={`p-2.5 rounded-xl flex items-center gap-2 group transition-all ${isTabActive('/cart') ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}>
                <div className="relative shrink-0"><ShoppingCart className="w-5 h-5" />{totalItems > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg">{totalItems}</span>}</div>
                <span className={`text-sm font-bold xs:block ${isTabActive('/cart') ? '' : 'hidden sm:block'}`}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(getTotalPrice())}</span>
              </Link>
            </motion.div>
          </div>

        </div>

      </div>
    </header>
  );
}