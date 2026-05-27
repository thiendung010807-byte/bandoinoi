import React, { useState, useEffect, useRef } from 'react';
import { db } from '../config/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Grid, Flame, Utensils, CakeSlice, Gift, Tag, Heart } from 'lucide-react';

import Hero from '../components/Hero';
import ProductCardPro from '../components/ProductCardPro';
import SkeletonCard from '../components/SkeletonCard';

// ĐÃ CẬP NHẬT: Thêm nút "Tất cả" lên đầu và giữ các danh mục tùy chỉnh của bạn
const CATEGORIES = [
  { id: 'thbn', label: 'Tự hào Bắc Ninh', icon: Flame },
  { id: 'quanho', label: 'Mâm lễ Quan họ', icon: Heart },
  { id: 'combo', label: 'Combo tiết kiệm', icon: Gift },
  { id: 'monle', label: 'Món lẻ', icon: CakeSlice },
];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('thbn'); 
  
  const productsRef = useRef(null);
  const [stats, setStats] = useState({ totalOrders: 256, totalRaised: 12500000 });

  useEffect(() => {
    const q = query(collection(db, 'products'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsData);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // ==========================================
  // HÀM XỬ LÝ CLICK TAB & CUỘN RA GIỮA (UX MOBILE)
  // ==========================================
  const handleTabClick = (categoryId, event) => {
    setFilter(categoryId);
    // Tự động cuộn phần tử vừa click ra giữa vùng chứa một cách mượt mà
    event.currentTarget.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest'
    });
  };

  // ==========================================
  // LOGIC LỌC ĐA DANH MỤC (Hỗ trợ cả sản phẩm cũ & mới)
  // ==========================================
  let displayedProducts = products.filter(p => {
    // Gom dữ liệu: Nếu là mảng (form mới) thì dùng luôn, nếu là chuỗi (sản phẩm cũ) thì bọc vào mảng
    const productCategories = p.categories || (p.category ? [p.category] : []);
    
    // Lọc theo mảng danh mục
    return productCategories.includes(filter);
  });

  // Sắp xếp: Hết hàng đẩy xuống cuối, sau đó sắp xếp theo số lượng bán
  displayedProducts.sort((a, b) => {
    const aOutOfStock = a.inStock === false;
    const bOutOfStock = b.inStock === false;

    if (aOutOfStock && !bOutOfStock) return 1;
    if (!aOutOfStock && bOutOfStock) return -1;

    const aSold = a.sold || 0;
    const bSold = b.sold || 0;
    return bSold - aSold;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 pb-20">
      
      {/* KHU VỰC HERO BANNER */}
      <Hero 
        totalRaised={stats.totalRaised} 
        totalOrders={stats.totalOrders} 
        onScrollDown={() => productsRef.current?.scrollIntoView({ behavior: 'smooth' })}
      />

      <div ref={productsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 scroll-mt-24">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 overflow-hidden">
          <div>
            <h2 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight">Menu Gây Quỹ</h2>
            <p className="text-slate-500 mt-2 font-medium">100% lợi nhuận sẽ được đóng góp vào quỹ thiện nguyện</p>
          </div>
          
          {/* THANH LỌC PHÂN LOẠI (CATEGORY BAR) */}
          <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto w-full md:w-auto custom-scrollbar scroll-smooth snap-x">
            {CATEGORIES.map(cat => (
              <button 
                key={cat.id}
                onClick={(e) => handleTabClick(cat.id, e)} 
                className={`snap-center shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl transition-all duration-300 ${
                  filter === cat.id 
                    ? 'bg-green-500 text-white shadow-md shadow-green-500/20' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <cat.icon className={`w-4 h-4 ${filter === cat.id ? 'text-white' : ''}`} />
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* KHU VỰC HIỂN THỊ SẢN PHẨM */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(item => <SkeletonCard key={item} />)}
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300">
            <Utensils className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 text-lg font-bold">Chưa có sản phẩm nào ở mục này.</p>
            <p className="text-slate-400 text-sm mt-1">Bạn vui lòng chọn danh mục khác nhé!</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {displayedProducts.map(product => (
              <ProductCardPro key={product.id} product={product} />
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
