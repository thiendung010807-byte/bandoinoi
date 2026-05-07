import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, LayoutDashboard, User, Package, LogIn } from 'lucide-react';
import { useCart } from '../store/useCart';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

export default function Navbar() {
  const { items, getTotalPrice } = useCart();
  const { currentUser, logout, isAdmin } = useAuth();
  const location = useLocation();

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const ShowAdminButton = isAdmin; 
  const ShowOrdersButton = !!currentUser; 

  const isTabActive = (path) => location.pathname === path;

  return (
    <header className="bg-white sticky top-0 z-40 border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 sm:h-18 flex items-center justify-between gap-4">
        
        {/* ================= LOGO ================= */}
        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 10 }} 
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-lg shadow-green-500/20 group-hover:bg-green-600 transition-colors"
          >
            MHX
          </motion.div>
          <div className="flex flex-col">
            <span className="text-lg sm:text-xl font-heading font-extrabold text-slate-900 leading-none group-hover:text-green-600 transition-colors">Gây Quỹ</span>
            <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 mt-0.5 tracking-wider group-hover:text-slate-500 transition-colors">ĐỘI TN MHX 2026</span>
          </div>
        </Link>

        {/* ================= NAV CONTROL ================= */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          
          {/* NÚT TÀI KHOẢN */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="flex-col items-end hidden md:flex">
                <span className="text-xs font-bold text-slate-900">{currentUser.displayName || 'Tài khoản'}</span>
                <span className="text-[10px] text-slate-500">{currentUser.email}</span>
              </div>
              <button 
                onClick={logout} 
                className="p-2 sm:p-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-all shadow-sm active:scale-95" 
                title="Đăng xuất"
              >
                <User className="w-5 h-5 sm:w-5 sm:h-5" />
              </button>
            </div>
          ) : (
            <Link 
              to="/auth" 
              className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl font-bold transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm hidden xs:inline">Đăng nhập</span>
            </Link>
          )}

          {/* DẢI NÚT CHỨC NĂNG */}
          <div className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-slate-100 rounded-2xl border border-slate-200/50 shadow-inner">
            
            {/* ĐƠN HÀNG */}
            {ShowOrdersButton && (
              <Link 
                to="/my-orders" 
                className={`p-2 sm:px-3 sm:py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95 ${isTabActive('/my-orders') ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
              >
                <Package className="w-5 h-5 sm:w-5 sm:h-5 shrink-0" />
                <span className="text-sm font-bold hidden md:block">Đơn hàng</span>
              </Link>
            )}
            
            {/* ADMIN */}
            {ShowAdminButton && (
              <Link 
                to="/admin" 
                className={`p-2 sm:px-3 sm:py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95 ${isTabActive('/admin') ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
              >
                <LayoutDashboard className="w-5 h-5 sm:w-5 sm:h-5 shrink-0" />
                <span className="text-sm font-bold hidden md:block">Admin</span>
              </Link>
            )}

            {/* GIỎ HÀNG */}
            <Link 
              to="/cart" 
              className={`p-2 sm:px-3 sm:py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95 ${isTabActive('/cart') ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
            >
              <div className="relative shrink-0">
                <ShoppingCart className="w-5 h-5 sm:w-5 sm:h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                    {totalItems}
                  </span>
                )}
              </div>
              <span className="text-sm font-bold hidden md:block">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(getTotalPrice())}
              </span>
            </Link>

          </div>
        </div>
      </div>
    </header>
  );
}