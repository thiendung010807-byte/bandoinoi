import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../store/useCart';
import { ShoppingBag, LogIn, LogOut, ShieldCheck, Heart } from 'lucide-react';

export default function Navbar() {
  const { currentUser, isAdmin, loginWithGoogle, logout } = useAuth();
  const { toggleCart, getTotalItems } = useCart();

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2">
            <Heart className="text-green-600 w-8 h-8 fill-current" />
            <span className="font-bold text-xl text-gray-900 tracking-tight">
              Mùa Hè Xanh <span className="text-green-600">2026</span>
            </span>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link to="/admin" className="hidden sm:flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-1.5 rounded-full">
                <ShieldCheck className="w-4 h-4" />
                Admin
              </Link>
            )}

            {/* Cart Toggle */}
            <button 
              onClick={toggleCart}
              className="relative p-2 text-gray-600 hover:text-green-600 transition-colors"
            >
              <ShoppingBag className="w-6 h-6" />
              {getTotalItems() > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full">
                  {getTotalItems()}
                </span>
              )}
            </button>

            {/* Auth Buttons */}
            {currentUser ? (
              <div className="flex items-center gap-3 ml-2 border-l pl-4">
                <img src={currentUser.photoURL} alt="avatar" className="w-8 h-8 rounded-full border border-gray-200" />
                <button onClick={logout} className="text-gray-500 hover:text-red-600">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={loginWithGoogle}
                className="ml-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}