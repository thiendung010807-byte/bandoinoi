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

  // Lock body scroll khi modal mở
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen]);

  const soldCount = product.sold || 0;
  const isOutOfStock = product.inStock === false;
  const isHot = soldCount >= 30 && !isOutOfStock;

  const validVariantImages = product.variantImages ? product.variantImages.filter(img => img && img.trim() !== '') : [];
  const allImages = [product.image, ...validVariantImages].filter(Boolean);

  const progressPercent = Math.min((soldCount / (soldCount + 20)) * 100, 95);

  const handleAdd = () => {
    if (!currentUser) {
      toast.error('Vui lòng đăng nhập để mua hàng!');
      setIsModalOpen(false); 
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
      {/* ================= CARD SẢN PHẨM ================= */}
      <motion.div 
        whileHover={{ y: isOutOfStock ? 0 : -5 }} 
        className={`bg-white rounded-[1.5rem] md:rounded-[2rem] p-3 md:p-4 shadow-sm hover:shadow-soft transition-all duration-300 border border-slate-100 flex flex-col group relative ${isOutOfStock ? 'grayscale opacity-75' : ''}`}
      >
        {product.isCombo && !isOutOfStock && (
          <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10 bg-orange-500 text-white text-[9px] md:text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
            Combo Hot
          </div>
        )}
        
        <div className="aspect-square rounded-xl md:rounded-2xl bg-slate-50 overflow-hidden relative mb-3 md:mb-4 cursor-pointer" onClick={() => setIsModalOpen(true)}>
          <img 
            src={product.image || `https://ui-avatars.com/api/?name=${product.name}`} 
            alt={product.name} 
            className={`w-full h-full object-cover transition-transform duration-700 ease-out ${isOutOfStock ? '' : 'group-hover:scale-105 md:group-hover:scale-110'}`} 
          />
          
          {isOutOfStock ? (
            <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center z-10">
              <span className="bg-slate-900 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl font-bold text-xs md:text-sm tracking-wider shadow-lg border border-slate-700">HẾT HÀNG</span>
            </div>
          ) : (
            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
              <button className="bg-white text-slate-900 rounded-full px-4 py-2 md:px-6 md:py-2.5 font-bold text-xs md:text-sm shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:bg-green-500 hover:text-white">
                Chi tiết
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col flex-grow cursor-pointer" onClick={() => setIsModalOpen(true)}>
          <h3 className="font-heading font-bold text-slate-800 text-sm md:text-lg leading-snug mb-1 line-clamp-2">{product.name}</h3>
          
          <div className="mt-2 mb-3 md:mt-3 md:mb-4">
            <div className="flex justify-between text-[10px] md:text-xs mb-1 md:mb-1.5">
              {isHot ? (
                <span className="text-orange-500 font-bold flex items-center gap-1"><Flame className="w-3 h-3" /> <span className="hidden xs:inline">Đang bán chạy</span><span className="xs:hidden">Hot</span></span>
              ) : (
                <span className="text-slate-500 font-medium">Lượt mua</span>
              )}
              <span className="text-slate-500 font-medium">Đã bán {soldCount}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1 md:h-1.5 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }} 
                whileInView={{ width: `${progressPercent}%` }} 
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={`h-1 md:h-1.5 rounded-full ${isHot ? 'bg-gradient-to-r from-orange-400 to-orange-500' : 'bg-slate-300'}`} 
              />
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between">
          <p className="text-lg md:text-2xl font-extrabold text-green-600 tracking-tight">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
          </p>
          <motion.button 
            whileTap={isOutOfStock ? {} : { scale: 0.9 }} 
            onClick={() => setIsModalOpen(true)} 
            className={`w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-colors z-10 shadow-sm ${isOutOfStock ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-green-50 hover:bg-green-500 text-green-600 hover:text-white'}`}
          >
            <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
          </motion.button>
        </div>
      </motion.div>

      {/* ================= MODAL QUICK VIEW (TỐI ƯU BOTTOM SHEET CHO MOBILE) ================= */}
      <AnimatePresence>
        {isModalOpen && (
          // items-end ép sát modal xuống đáy trên Mobile, items-center căn giữa trên Desktop
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-6 bg-slate-900/60 backdrop-blur-sm">
            
            {/* Lớp nền đen mờ click để đóng */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => setIsModalOpen(false)} 
              className="absolute inset-0 z-0"
            />

            <motion.div 
              // Animation trượt mượt mà từ dưới lên
              initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              // Bo góc tròn phần trên cho Mobile, bo tròn đều cho Desktop
              className="bg-white rounded-t-[2rem] md:rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col md:flex-row z-10"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-3 right-3 md:top-4 md:right-4 z-20 bg-white/80 backdrop-blur-md p-2 rounded-full text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm">
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
              
              <div className="md:w-5/12 bg-slate-50 p-4 md:p-6 flex flex-col items-center border-b md:border-b-0 md:border-r border-slate-100">
                <div className="w-full aspect-video md:aspect-square rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-200 mb-3 md:mb-4 relative">
                  <AnimatePresence mode="wait">
                    <motion.img 
                      key={currentImage} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} exit={{ opacity: 0.5 }} transition={{ duration: 0.2 }}
                      src={currentImage} alt={product.name} className="absolute inset-0 w-full h-full object-cover" 
                    />
                  </AnimatePresence>
                </div>
                {allImages.length > 1 && (
                  <div className="flex gap-2 md:gap-3 w-full overflow-x-auto pb-2 custom-scrollbar">
                    {allImages.map((img, idx) => (
                      <button key={idx} onClick={() => setCurrentImage(img)} className={`w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${currentImage === img ? 'border-green-500 ring-2 ring-green-100' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                        <img src={img} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-5 md:p-8 md:w-7/12 flex flex-col overflow-y-auto custom-scrollbar pb-safe">
                {product.isCombo && <span className="w-fit bg-orange-100 text-orange-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 md:mb-3">Combo Hot</span>}
                <h2 className="text-xl md:text-3xl font-heading font-extrabold text-slate-900 mb-1 md:mb-2 leading-tight">{product.name}</h2>
                <p className="text-2xl md:text-3xl font-extrabold text-green-600 mb-4 md:mb-6">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}</p>
                
                {isHot && (
                  <div className="flex items-start gap-2 md:gap-3 mb-4 md:mb-6 text-xs md:text-sm text-orange-800 bg-orange-50/80 p-3 md:p-4 rounded-xl border border-orange-100">
                    <Flame className="w-4 h-4 md:w-5 md:h-5 text-orange-500 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">Đang được săn đón! Đã có <b className="text-slate-900 font-extrabold">{soldCount}</b> lượt ủng hộ.</p>
                  </div>
                )}

                <div className="mb-4 md:mb-6">
                  <p className="text-sm font-bold text-slate-800 mb-2">Mô tả sản phẩm:</p>
                  <p className="text-xs md:text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 md:p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">
                    {product.description || 'Món ngon tuyệt đỉnh, 100% lợi nhuận ủng hộ chiến dịch Mùa Hè Xanh.'}
                  </p>
                </div>

                {product.variants && product.variants.filter(v => v.trim() !== '').length > 0 && (
                  <div className="mb-4 md:mb-6">
                    <p className="text-sm font-bold text-slate-800 mb-2 md:mb-3">Chọn phân loại:</p>
                    <div className="flex flex-wrap gap-2">
                      {product.variants.map((v, idx) => {
                        if (v.trim() === '') return null;
                        return (
                          <button key={idx} onClick={() => { setSelectedVariant(v); if (product.variantImages && product.variantImages[idx]) setCurrentImage(product.variantImages[idx]); else setCurrentImage(product.image); }} className={`px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all border-2 relative overflow-hidden ${selectedVariant === v ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-green-300 bg-white'}`}>
                            {v}
                            {selectedVariant === v && <div className="absolute top-0 right-0 w-4 h-4 bg-green-500 rounded-bl-lg flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 mb-5 md:mb-8 mt-auto">
                  <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-4">
                    <p className="text-sm font-bold text-slate-800">Số lượng:</p>
                    <div className={`flex items-center border-2 border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm ${isOutOfStock ? 'opacity-50 pointer-events-none' : ''}`}>
                      <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-12 h-10 md:w-10 flex items-center justify-center text-slate-500 hover:bg-slate-100 active:bg-slate-200"><Minus className="w-4 h-4" /></button>
                      <input type="number" value={quantity} readOnly className="w-12 h-10 text-center font-bold text-slate-800 border-x-2 border-slate-200 outline-none bg-transparent" />
                      <button onClick={() => setQuantity(q => q + 1)} className="w-12 h-10 md:w-10 flex items-center justify-center text-slate-500 hover:bg-slate-100 active:bg-slate-200"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <span className={`text-sm font-extrabold text-right w-full sm:w-auto ${isOutOfStock ? 'text-red-500' : 'text-green-600 hidden sm:block'}`}>
                    {isOutOfStock ? 'TẠM HẾT HÀNG' : 'CÒN HÀNG'}
                  </span>
                </div>

                <button onClick={handleAdd} disabled={isOutOfStock} className={`w-full py-3.5 md:py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${isOutOfStock ? 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/20'}`}>
                  <ShoppingCart className="w-5 h-5" /> 
                  {isOutOfStock ? 'SẢN PHẨM ĐÃ HẾT' : `THÊM VÀO GIỎ • ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price * quantity)}`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}