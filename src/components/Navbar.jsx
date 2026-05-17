import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../store/useCart';
import { ShoppingBag, LogIn, LogOut, ShieldCheck, Heart, ClipboardList } from 'lucide-react';

export default function Navbar() {
  const { currentUser, isAdmin, loginWithGoogle, logout } = useAuth();
  const { toggleCart, getTotalItems } = useCart();

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center gap-2">
          {/* Logo & Brand */}
        
{/* Logo & Brand */}
<Link to="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
  <img 
    src="/logo.png" 
    alt="Logo BNC" 
    className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 object-contain"
  />
  <span className="font-bold text-lg sm:text-xl text-gray-900 tracking-tight truncate max-w-[140px] sm:max-w-none">
    Mùa Hè Xanh <span className="text-green-600 hidden xs:inline">2026</span>
  </span>
</Link>

          {/* Right Actions */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {isAdmin && (
              <Link 
                to="/admin" 
                className="hidden sm:flex items-center gap-1 text-orange-600 hover:text-orange-700 bg-orange-50 p-2 sm:px-3 sm:py-1.5 rounded-full transition-colors"
                title="Quản trị viên"
              >
                <ShieldCheck className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="hidden md:block text-sm font-medium">Admin</span>
              </Link>
            )}

            {/* ĐÃ CẬP NHẬT: GẮN ID ĐỂ LÀM ĐIỂM ĐẾN CỦA BÓNG BAY */}
            {currentUser && (
              <button 
                id="global-cart-icon" 
                onClick={toggleCart}
                className="relative p-2 text-gray-600 hover:text-green-600 transition-colors rounded-full active:bg-gray-100"
              >
                <ShoppingBag className="w-6 h-6" />
                {getTotalItems() > 0 && (
                  <span className="absolute top-1 right-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full">
                    {getTotalItems()}
                  </span>
                )}
              </button>
            )}

            <div className="w-px h-6 bg-gray-200 mx-0.5 sm:mx-1"></div>

            {/* Auth Buttons */}
            {currentUser ? (
              <div className="flex items-center gap-1 sm:gap-3">
                <Link to="/my-orders" className="text-gray-500 hover:text-green-600 transition-colors p-2 flex items-center gap-1 rounded-full active:bg-gray-100" title="Đơn hàng của tôi">
                  <ClipboardList className="w-5 h-5 sm:w-6 h-6" />
                  <span className="hidden lg:block text-sm font-medium">Đơn hàng</span>
                </Link>

                <img src={currentUser.photoURL} alt="avatar" className="w-8 h-8 rounded-full border border-gray-200 shrink-0 hidden xs:block" title={currentUser.displayName} />

                <button onClick={logout} className="p-2 text-gray-500 hover:text-red-600 rounded-full active:bg-red-50 transition-colors" title="Đăng xuất">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button onClick={loginWithGoogle} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm">
                <LogIn className="w-4 h-4 shrink-0" />
                <span className="hidden xs:block">Đăng nhập</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
