import React, { useState, useEffect, useRef } from 'react';
import { db } from '../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { motion } from 'framer-motion';

import Hero from '../components/Hero';
import ProductCardPro from '../components/ProductCardPro';
import SkeletonCard from '../components/SkeletonCard';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'combo', 'single', 'hot'
  
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

  // 1. LOGIC LỌC SẢN PHẨM (FILTER)
  let displayedProducts = products.filter(p => {
    const sold = p.sold || 15;
    if (filter === 'combo') return p.isCombo;
    if (filter === 'single') return !p.isCombo;
    if (filter === 'hot') return sold >= 30; // Ngưỡng bán chạy là từ 30 đơn trở lên
    return true; // 'all'
  });

  // 2. LOGIC SẮP XẾP SẢN PHẨM (SORTING)
  displayedProducts.sort((a, b) => {
    const aOutOfStock = a.inStock === false;
    const bOutOfStock = b.inStock === false;

    // Ưu tiên 1: Đẩy hàng "Hết hàng" xuống cuối cùng
    if (aOutOfStock && !bOutOfStock) return 1;
    if (!aOutOfStock && bOutOfStock) return -1;

    // Ưu tiên 2: Cùng trạng thái thì ưu tiên xếp theo Số lượng đã bán (Giảm dần)
    const aSold = a.sold || 15;
    const bSold = b.sold || 15;
    return bSold - aSold;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 pb-20">
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
          
          {/* THANH LỌC (ĐÃ THÊM TAB HOT) */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm overflow-x-auto w-full md:w-auto custom-scrollbar">
            <button onClick={() => setFilter('all')} className={`shrink-0 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${filter === 'all' ? 'bg-green-50 text-green-700' : 'text-slate-600 hover:bg-slate-50'}`}>Tất cả</button>
            <button onClick={() => setFilter('hot')} className={`shrink-0 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${filter === 'hot' ? 'bg-orange-50 text-orange-600' : 'text-slate-600 hover:bg-slate-50'}`}>🔥 Bán chạy</button>
            <button onClick={() => setFilter('combo')} className={`shrink-0 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${filter === 'combo' ? 'bg-green-50 text-green-700' : 'text-slate-600 hover:bg-slate-50'}`}>Combo</button>
            <button onClick={() => setFilter('single')} className={`shrink-0 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${filter === 'single' ? 'bg-green-50 text-green-700' : 'text-slate-600 hover:bg-slate-50'}`}>Đồ lẻ</button>
          </div>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(item => <SkeletonCard key={item} />)}
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="text-center py-20 glass rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-lg font-medium">Chưa có sản phẩm nào ở mục này.</p>
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