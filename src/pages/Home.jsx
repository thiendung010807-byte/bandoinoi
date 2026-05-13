import React, { useState, useEffect, useRef } from 'react';
import { db } from '../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Grid, Flame, Utensils, Coffee, Gift, Tag } from 'lucide-react';

import Hero from '../components/Hero';
import ProductCardPro from '../components/ProductCardPro';
import SkeletonCard from '../components/SkeletonCard';

// Danh sách các tab phân loại sản phẩm
const CATEGORIES = [
  { id: 'all', label: 'Tất cả', icon: Grid },
  { id: 'hot', label: 'Bán chạy', icon: Flame },
  { id: 'food', label: 'Đồ ăn', icon: Utensils },
  { id: 'drink', label: 'Đồ uống', icon: Coffee },
  { id: 'combo', label: 'Combo', icon: Gift },
  { id: 'accessory', label: 'Phụ kiện', icon: Tag },
];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); 
  
  const productsRef = useRef(null);
  const [stats, setStats] = useState({ totalOrders: 256, totalRaised: 12500000 });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ==========================================
  // 1. LOGIC LỌC SẢN PHẨM (FILTER)
  // ==========================================
  let displayedProducts = products.filter(p => {
    const sold = p.sold || 0;
    
    if (filter === 'all') return true;
    if (filter === 'hot') return sold >= 30; // Ngưỡng bán chạy
    
    // Tương thích ngược: Nếu món cũ dùng isCombo thì vẫn hiện trong tab Combo
    if (filter === 'combo') return p.category === 'combo' || p.isCombo; 
    
    return p.category === filter;
  });

  // ==========================================
  // 2. LOGIC SẮP XẾP SẢN PHẨM (SORTING)
  // ==========================================
  displayedProducts.sort((a, b) => {
    const aOutOfStock = a.inStock === false;
    const bOutOfStock = b.inStock === false;

    // Ưu tiên 1: Đẩy hàng "Hết hàng" xuống cuối cùng
    if (aOutOfStock && !bOutOfStock) return 1;
    if (!aOutOfStock && bOutOfStock) return -1;

    // Ưu tiên 2: Cùng trạng thái thì ưu tiên xếp theo Số lượng đã bán (Giảm dần)
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight">Menu Gây Quỹ</h2>
            <p className="text-slate-500 mt-2 font-medium">100% lợi nhuận sẽ được đóng góp vào quỹ thiện nguyện</p>
          </div>
          
          {/* THANH LỌC PHÂN LOẠI (CATEGORY BAR) */}
          <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto w-full md:w-auto custom-scrollbar">
            {CATEGORIES.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setFilter(cat.id)} 
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl transition-all duration-300 ${
                  filter === cat.id 
                    ? cat.id === 'hot' 
                      ? 'bg-orange-50 text-orange-600 shadow-sm' 
                      : 'bg-green-500 text-white shadow-md shadow-green-500/20' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <cat.icon className={`w-4 h-4 ${filter === cat.id && cat.id !== 'hot' ? 'text-white' : ''} ${cat.id === 'hot' && filter !== 'hot' ? 'text-orange-500' : ''}`} />
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