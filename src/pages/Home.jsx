import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useCart } from '../store/useCart'; // Dùng Zustand store của bạn
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, Utensils, Coffee, Gift, Tag, Plus, Loader2 
} from 'lucide-react';

// Danh sách các danh mục phân loại
const CATEGORIES = [
  { id: 'all', label: 'Tất cả', icon: ShoppingBag },
  { id: 'food', label: 'Đồ ăn', icon: Utensils },
  { id: 'drink', label: 'Đồ uống', icon: Coffee },
  { id: 'combo', label: 'Combo Mùa Hè', icon: Gift },
  { id: 'accessory', label: 'Phụ kiện', icon: Tag },
];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Gọi hàm thêm đồ vào giỏ từ Store
  const { addItem } = useCart();

  useEffect(() => {
    // Lấy danh sách sản phẩm từ Firestore, sắp xếp theo thời gian cập nhật mới nhất
    const q = query(collection(db, 'products'), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Lọc sản phẩm theo Tab đã chọn
  // (Có xử lý backward compatibility: Nếu món cũ chưa có category nhưng có isCombo = true thì vẫn hiển thị ở tab Combo)
  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category === selectedCategory || (selectedCategory === 'combo' && p.isCombo));

  // Xử lý thêm vào giỏ hàng
  const handleAddToCart = (product) => {
    if (!product.inStock) {
      return toast.error("Món này tạm hết hàng rồi bạn nhé!");
    }
    
    // Nếu món có nhiều phân loại (Variants), mặc định sẽ chọn vị đầu tiên
    const variantToAdd = (product.variants && product.variants.length > 0) ? product.variants[0] : null;
    const priceToAdd = variantToAdd ? (product.variantPrices[0] || product.price) : product.price;

    addItem({
      id: product.id,
      name: product.name,
      price: priceToAdd,
      image: product.image,
      variant: variantToAdd
    });
    
    toast.success(`Đã thêm ${product.name} vào giỏ!`, {
      style: { borderRadius: '12px', background: '#333', color: '#fff' }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-green-500">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="font-bold text-slate-600 animate-pulse">Đang tải Menu món ngon...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pb-24 animate-fade-in">
      
      {/* ==========================================
          THANH ĐIỀU HƯỚNG PHÂN LOẠI (CATEGORY BAR)
          ========================================== */}
      <div className="flex gap-3 overflow-x-auto pb-4 pt-2 mb-6 custom-scrollbar sticky top-16 z-30 bg-[#f8fafc]/90 backdrop-blur-md">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold transition-all duration-300 whitespace-nowrap border-2 ${
              selectedCategory === cat.id 
              ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/30 scale-105' 
              : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50'
            }`}
          >
            <cat.icon className="w-5 h-5" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* ==========================================
          LƯỚI HIỂN THỊ SẢN PHẨM
          ========================================== */}
      <AnimatePresence mode="wait">
        {filteredProducts.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-300 mx-auto max-w-lg mt-10"
          >
            <Utensils className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-700">Mục này đang trống</h2>
            <p className="text-slate-500 mt-2">Chưa có món nào trong danh mục này, bạn xem thử mục khác nhé!</p>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          >
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-white rounded-[1.5rem] p-3 sm:p-4 shadow-sm border border-slate-100 flex flex-col group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                
                {/* KHUNG ẢNH */}
                <div className="w-full aspect-square rounded-[1rem] overflow-hidden bg-slate-50 relative mb-4">
                  <img 
                    src={product.image || `https://ui-avatars.com/api/?name=${product.name}&background=f1f5f9&color=64748b`} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                  />
                  
                  {/* HUY HIỆU TRẠNG THÁI / DANH MỤC */}
                  {!product.inStock ? (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-20">
                      <span className="bg-slate-800 text-white font-extrabold px-4 py-1.5 rounded-full text-[10px] sm:text-xs uppercase tracking-widest shadow-lg">Hết hàng</span>
                    </div>
                  ) : (
                    <span className={`absolute top-2 left-2 text-[9px] font-black px-2 py-1 rounded-lg shadow-sm z-10 text-white uppercase tracking-wider ${
                      product.category === 'drink' ? 'bg-blue-500' : product.category === 'combo' || product.isCombo ? 'bg-purple-500' : product.category === 'accessory' ? 'bg-pink-500' : 'bg-orange-500'
                    }`}>
                      {product.category === 'drink' ? 'Đồ uống' : (product.category === 'combo' || product.isCombo) ? 'Combo' : product.category === 'accessory' ? 'Phụ kiện' : 'Đồ ăn'}
                    </span>
                  )}
                </div>

                {/* THÔNG TIN SẢN PHẨM */}
                <div className="flex-1 flex flex-col">
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-snug line-clamp-2 mb-1">{product.name}</h3>
                  
                  <div className="mt-auto pt-3">
                    <p className="text-green-600 font-extrabold text-base sm:text-lg mb-1">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium mb-3">Đã bán: {product.sold || 0}</p>
                    
                    <button 
                      onClick={() => handleAddToCart(product)}
                      disabled={!product.inStock}
                      className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                        product.inStock 
                          ? 'bg-slate-900 text-white hover:bg-green-500 shadow-md active:scale-95' 
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-4 h-4" /> 
                      <span className="text-sm">{product.inStock ? 'Thêm vào giỏ' : 'Hết hàng'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}