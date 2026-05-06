import React, { useState } from 'react';
import { useCart } from '../store/useCart';
import { useAuth } from '../contexts/AuthContext'; // 1. Import useAuth
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProductCard({ product }) {
  const [selectedVariant, setSelectedVariant] = useState('');
  const { addItem, openCart } = useCart();
  const { currentUser } = useAuth(); // 2. Lấy thông tin user hiện tại

  const handleAddToCart = () => {
    // 3. Chặn nếu chưa đăng nhập
    if (!currentUser) {
      toast.error('Vui lòng đăng nhập để mua hàng!', { icon: '🔒' });
      return; 
    }

    if (product.variants && product.variants.length > 0 && !selectedVariant) {
      toast.error('Vui lòng chọn phân loại/vị!', { position: 'bottom-center' });
      return;
    }
    addItem(product, selectedVariant);
    openCart(); // Tự động mở sidebar giỏ hàng
  };

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border border-gray-100 flex flex-col">
      {/* Image Placeholder */}
      <div className="aspect-square bg-green-50 relative group">
        <img 
          src={product.image || `https://ui-avatars.com/api/?name=${product.name}&background=Edf2f7&color=4A5568&size=400`} 
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.isCombo && (
          <span className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-md">
            COMBO
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-semibold text-gray-800 text-lg leading-tight line-clamp-2">{product.name}</h3>
        <p className="text-green-600 font-bold mt-1 text-lg">
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
        </p>

        <div className="mt-auto pt-4 space-y-3">
          {/* Variant Selector */}
          {product.variants && product.variants.length > 0 && (
            <select 
              className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-2.5"
              value={selectedVariant}
              onChange={(e) => setSelectedVariant(e.target.value)}
            >
              <option value="" disabled>-- Chọn vị / tùy chọn --</option>
              {product.variants.map((v, idx) => (
                <option key={idx} value={v}>{v}</option>
              ))}
            </select>
          )}

          {/* Add Button */}
          <button 
            onClick={handleAddToCart}
            className="w-full bg-green-50 text-green-700 hover:bg-green-600 hover:text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Thêm vào giỏ
          </button>
        </div>
      </div>
    </div>
  );
}