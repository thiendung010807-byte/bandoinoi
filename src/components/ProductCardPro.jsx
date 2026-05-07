import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Flame, X, Minus, Plus, Check } from 'lucide-react';
import { useCart } from '../store/useCart';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function ProductCardPro({ product }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addItem, openCart } = useCart();
  const { currentUser } = useAuth();

  const [selectedVariant, setSelectedVariant] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [currentImage, setCurrentImage] = useState(product.image);

  useEffect(() => {
    if (isModalOpen) {
      setSelectedVariant('');
      setCurrentImage(product.image);
      setQuantity(1);
    }
  }, [product, isModalOpen]);

  const soldCount = product.sold || 0;
  const isOutOfStock = product.inStock === false;
  const isHot = soldCount >= 30 && !isOutOfStock;

  const validVariantImages = product.variantImages ? product.variantImages.filter(img => img && img.trim() !== '') : [];
  const allImages = [product.image, ...validVariantImages].filter(Boolean);

  const progressPercent = Math.min((soldCount / (soldCount + 20)) * 100, 95);

  const handleAdd = () => {
    if (!currentUser) {
      toast.error('Vui lòng đăng nhập để mua hàng!');
      return;
    }
    const hasNamedVariants = product.variants && product.variants.filter(v => v.trim() !== '').length > 0;
    if (hasNamedVariants && !selectedVariant) {
      return toast.error('Vui lòng chọn phân loại hàng!');
    }
    for (let i = 0; i < quantity; i++) {
      addItem(product, selectedVariant);
    }
    setIsModalOpen(false);
    openCart();
    toast.success(`Đã thêm ${quantity} sản phẩm vào giỏ!`);
  };

  return (
    <>
      {/* ================= CARD SẢN PHẨM BÊN NGOÀI ================= */}
      <motion.div 
        whileHover={{ y: isOutOfStock ? 0 : -5 }} 
        className={`bg-white rounded-3xl p-3 md:p-4 shadow-sm hover:shadow-soft transition-all duration-300 border border-slate-100 flex flex-col group relative ${isOutOfStock ? 'grayscale opacity-75' : ''}`}
      >
        {product.isCombo && !isOutOfStock && (
          <div className="absolute top-4 left-4 z-10 bg-orange-500 text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
            Combo Hot
          </div>
        )}
        
        <div className="aspect-square rounded-2xl bg-slate-50 overflow-hidden relative mb-3 cursor-pointer" onClick={() => setIsModalOpen(true)}>
          <img 
            src={product.image} 
            alt={product.name} 
            className={`w-full h-full object-cover transition-transform duration-700 ease-out ${isOutOfStock ? '' : 'group-hover:scale-105'}`} 
          />
          {isOutOfStock ? (
            <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center z-10">
              <span className="bg-slate-900 text-white px-3.5 py-1.5 rounded-lg font-bold text-xs tracking-wider shadow-lg border border-slate-700">HẾT HÀNG</span>
            </div>
          ) : (
            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
              <button className="bg-white text-slate-900 rounded-full px-5 py-2 font-bold text-xs shadow-xl hover:bg-green-500 hover:text-white transition-all">
                Chi tiết
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col flex-grow cursor-pointer" onClick={() => setIsModalOpen(true)}>
          <h3 className="font-heading font-bold text-slate-800 text-base leading-snug mb-1 line-clamp-2">{product.name}</h3>
          
          <div className="mt-2 mb-3">
            <div className="flex justify-between text-xs mb-1">
              {isHot ? (
                <span className="text-orange-500 font-medium flex items-center gap-1">Đang hot</span>
              ) : (
                <span className="text-slate-500">Lượt mua</span>
              )}
              <span className="text-slate-500">Đã bán {soldCount}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }} 
                whileInView={{ width: `${progressPercent}%` }} 
                className={`h-1.5 rounded-full ${isHot ? 'bg-gradient-to-r from-orange-400 to-orange-500' : 'bg-slate-300'}`} 
              />
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between">
          <p className="text-xl font-extrabold text-green-600 tracking-tight">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
          </p>
          <motion.button 
            whileTap={isOutOfStock ? {} : { scale: 0.9 }} 
            onClick={() => setIsModalOpen(true)} 
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors z-10 shadow-sm ${isOutOfStock ? 'bg-slate-100 text-slate-400' : 'bg-green-50 hover:bg-green-500 text-green-600 hover:text-white'}`}
          >
            <ShoppingCart className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.div>

      {/* ================= MODAL QUICK VIEW (SCALED DOWN) ================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => setIsModalOpen(false)} 
              className="absolute inset-0 z-0"
            />
            <motion.div 
              initial={{ opacity: 0, y: "100%" }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl relative flex flex-col md:flex-row z-10"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-3 right-3 z-20 bg-white/80 p-1.5 rounded-full text-slate-400 hover:text-red-500 shadow-sm"><X className="w-5 h-5" /></button>
              
              <div className="md:w-5/12 bg-slate-50 p-4 flex flex-col items-center md:border-r border-slate-100">
                <div className="w-full aspect-video md:aspect-square rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-200 mb-3 relative">
                  <img src={currentImage} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
                </div>
                {allImages.length > 1 && (
                  <div className="flex gap-2 w-full overflow-x-auto pb-1.5 custom-scrollbar">
                    {allImages.map((img, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => setCurrentImage(img)} 
                        className={`w-14 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 ${currentImage === img ? 'border-green-500 ring-1 ring-green-100' : 'border-transparent opacity-60'}`}
                      >
                        <img src={img} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* SCALED DOWN: Giảm padding, giảm font size */}
              <div className="p-4 md:p-6 md:w-7/12 flex flex-col overflow-y-auto custom-scrollbar pb-6">
                {product.isCombo && <span className="w-fit bg-orange-100 text-orange-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracker-wider mb-2">Combo</span>}
                <h2 className="text-xl md:text-2xl font-heading font-extrabold text-slate-900 mb-1 leading-snug">{product.name}</h2>
                <p className="text-2xl font-extrabold text-green-600 mb-4">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}</p>
                
                {isHot && (
                  <div className="flex items-center gap-2 mb-4 text-xs text-orange-800 bg-orange-50/80 p-3 rounded-lg border border-orange-100">
                    <Flame className="w-4 h-4 text-orange-500 shrink-0" />
                    <p>Đang hot! Đã có <b className="text-slate-900 font-bold">{soldCount}</b> lượt mua.</p>
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-xs font-bold text-slate-700 mb-1.5">Mô tả:</p>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg whitespace-pre-wrap">
                    {product.description || 'Món ngon tuyệt đỉnh!'}
                  </p>
                </div>

                {product.variants && product.variants.filter(v => v.trim() !== '').length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-slate-700 mb-2">Chọn phân loại:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {product.variants.map((v, idx) => {
                        if (v.trim() === '') return null;
                        return (
                          <button 
                            key={idx} 
                            onClick={() => {
                              setSelectedVariant(v);
                              if (product.variantImages && product.variantImages[idx]) setCurrentImage(product.variantImages[idx]);
                              else setCurrentImage(product.image);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${selectedVariant === v ? 'border-green-500 bg-green-50 text-green-700 shadow-inner' : 'border-slate-200 text-slate-600 bg-white hover:border-green-200'}`}
                          >
                            {v}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-row flex-wrap items-center gap-x-4 gap-y-2 mb-5 mt-auto">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-700">Số lượng:</p>
                    <div className={`flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden ${isOutOfStock ? 'opacity-50 pointer-events-none' : ''}`}>
                      <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100"><Minus className="w-3 h-3" /></button>
                      <input type="number" value={quantity} readOnly className="w-8 h-8 text-center text-xs font-bold text-slate-800 border-x border-slate-200 outline-none" />
                      <button onClick={() => setQuantity(q => q + 1)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                  <span className={`text-xs font-bold ${isOutOfStock ? 'text-red-500' : 'text-green-600'}`}>
                    {isOutOfStock ? 'HẾT HÀNG' : 'CÒN HÀNG'}
                  </span>
                </div>

                <button 
                  onClick={handleAdd} 
                  disabled={isOutOfStock}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/10 active:scale-95
                    ${isOutOfStock ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                >
                  <ShoppingCart className="w-4 h-4" /> 
                  {isOutOfStock ? 'SẢN PHẨM ĐÃ HẾT' : `THÊM GIỎ • ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price * quantity)}`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}