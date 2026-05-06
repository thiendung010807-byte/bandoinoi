import React, { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import { mockProducts } from '../utils/mockData';
import { HeartHandshake } from 'lucide-react';
// Nếu bạn lấy từ Firebase sau này, dùng: import { collection, getDocs } from 'firebase/firestore'; import { db } from '../config/firebase';

export default function Home() {
  const [products, setProducts] = useState(mockProducts); // Tạm thời dùng mock data

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Banner Thiện Nguyện */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 sm:p-10 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-white/20 backdrop-blur-sm text-sm font-semibold mb-4">
            <HeartHandshake className="w-4 h-4" /> 100% Gây quỹ tình nguyện
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">Chuyến đi tuổi trẻ - Gửi gắm yêu thương</h1>
          <p className="text-green-50 text-lg opacity-90">
            Mỗi sản phẩm bạn mua đóng góp trực tiếp vào quỹ xây dựng tủ sách và mua áo ấm cho trẻ em vùng cao trong chiến dịch Mùa Hè Xanh 2026.
          </p>
        </div>
        {/* Abstract decoration */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      </div>

      {/* Grid Sản phẩm */}
      <div>
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Danh mục sản phẩm</h2>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}