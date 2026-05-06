import React, { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import { HeartHandshake, Loader } from 'lucide-react';
import { db } from '../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lắng nghe dữ liệu realtime từ collection 'products'
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsData);
      setLoading(false);
    }, (error) => {
      console.error("Lỗi lấy sản phẩm:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
      </div>

      {/* Grid Sản phẩm */}
      <div>
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Danh mục sản phẩm</h2>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-20 text-green-500">
            <Loader className="w-8 h-8 animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-gray-500 bg-white rounded-2xl border border-gray-100">
            <p>Hiện chưa có sản phẩm nào. Xin vui lòng quay lại sau!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}