import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../store/useCart';
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';

export default function CartSidebar() {
  const { isCartOpen, closeCart, items, updateQuantity, removeItem, getTotalPrice } = useCart();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const formatPrice = (price) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  return (
    <>
      {/* Overlay Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={closeCart}
      />

      {/* Sidebar Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[400px] bg-white shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-green-500" />
            Giỏ hàng của bạn
          </h2>
          <button onClick={closeCart} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">
              <ShoppingBag className="w-16 h-16 mx-auto text-gray-200 mb-4" />
              <p>Giỏ hàng đang trống.</p>
              <p className="text-sm mt-1">Hãy thêm vài món đồ ngon nhé!</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.cartItemId} className="flex gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-16 h-16 bg-white rounded-lg p-1 border border-gray-200 flex-shrink-0">
                  <img src={item.image || `https://ui-avatars.com/api/?name=${item.name}&background=Edf2f7&color=4A5568`} alt={item.name} className="w-full h-full object-cover rounded-md" />
                </div>
                
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm">{item.name}</h4>
                    {item.variant && <p className="text-xs text-gray-500 mt-0.5">Vị/Loại: <span className="font-medium text-gray-700">{item.variant}</span></p>}
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-green-600 text-sm">{formatPrice(item.price)}</span>
                    
                    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-2 py-1">
                      <button onClick={() => updateQuantity(item.cartItemId, -1)} className="text-gray-500 hover:text-green-500 disabled:opacity-50" disabled={item.quantity <= 1}>
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-semibold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.cartItemId, 1)} className="text-gray-500 hover:text-green-500">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <button onClick={() => removeItem(item.cartItemId)} className="text-gray-300 hover:text-red-500 transition-colors self-start p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer / Checkout Button */}
        {items.length > 0 && (
          <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-600">Tổng cộng:</span>
              <span className="text-xl font-bold text-green-600">{formatPrice(getTotalPrice())}</span>
            </div>
            <button 
              onClick={() => {
                closeCart();
                navigate('/checkout');
              }}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-xl transition-colors flex justify-center items-center gap-2"
            >
              Tiến hành Thanh toán
            </button>
          </div>
        )}
      </div>
    </>
  );
}