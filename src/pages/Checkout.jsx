import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../store/useCart';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { 
  User, MapPin, Clock, CreditCard, ChevronRight, ChevronLeft, 
  ShieldCheck, CheckCircle2, Loader2 
} from 'lucide-react'; // ĐÃ THÊM LOADER2 Ở ĐÂY

const schema = yup.object().shape({
  fullName: yup.string().required('Vui lòng nhập họ tên'),
  phone: yup.string().matches(/(84|0[3|5|7|8|9])+([0-9]{8})\b/, 'Số điện thoại không hợp lệ').required('Vui lòng nhập số điện thoại'),
  addressType: yup.string().required(),
  customAddress: yup.string().when('addressType', { is: 'OTHER', then: () => yup.string().required('Vui lòng nhập địa chỉ cụ thể') }),
  deliveryTime: yup.string().required('Vui lòng chọn thời gian nhận hàng'),
  notes: yup.string(),
  referrer: yup.string(),
  paymentMethod: yup.string().required(),
  proofLink: yup.string()
});

export default function Checkout() {
  const { items, getTotalPrice, clearCart } = useCart();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false); // STATE QUẢN LÝ LOADING
  const [ctvList, setCtvList] = useState([]); 

  // ==========================================
  // DÁN LINK GOOGLE SHEET API CỦA BẠN VÀO ĐÂY
  // ==========================================
  const GOOGLE_SHEET_API_URL = "https://script.google.com/macros/s/AKfycbxQ9tjJ2odLUzyhWYNC2cMT-i-pppEwYfbHa-F16o4o7EAhRGA51B_JH4X5ZYXvyK-9/exec";

  const { register, handleSubmit, trigger, watch, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      fullName: currentUser?.displayName || '', phone: '', addressType: 'NEU', customAddress: '',
      deliveryTime: '', notes: '', referrer: '', paymentMethod: 'COD', proofLink: ''
    },
    mode: 'onChange'
  });

  const watchAddressType = watch('addressType');
  const watchPaymentMethod = watch('paymentMethod');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'ctvs'), (snapshot) => {
      setCtvList(snapshot.docs.map(doc => doc.data().name));
    });
    return () => unsub();
  }, []);

  if (items.length === 0 && !loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center animate-fade-in">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6"><ShieldCheck className="w-12 h-12 text-slate-300" /></div>
        <h2 className="text-2xl font-bold text-slate-800">Giỏ hàng trống</h2>
        <p className="text-slate-500 mt-2 mb-6">Bạn chưa có sản phẩm nào để thanh toán.</p>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors">Quay lại cửa hàng</button>
      </div>
    );
  }

  const handleNextStep = async () => {
    let fieldsToValidate = [];
    if (step === 1) fieldsToValidate = ['fullName', 'phone', 'addressType', 'customAddress'];
    if (step === 2) fieldsToValidate = ['deliveryTime'];

    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) setStep(prev => prev + 1);
  };

  const onSubmit = async (data) => {
    setLoading(true); // BẬT MÀN HÌNH LOADING
    
    const shortOrderId = "MHX-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    const shipFeeNote = data.addressType === 'NEU' ? 'Miễn phí' : '3k/1km';
    const deliveryAddress = data.addressType === 'NEU' ? 'Bàn truyền thống (NEU - 185 Trần Đại Nghĩa)' : data.customAddress;

    const orderData = {
      orderId: shortOrderId, 
      userId: currentUser.uid, 
      userEmail: currentUser.email, 
      customerName: data.fullName, 
      phone: data.phone,
      address: deliveryAddress,
      shippingFee: shipFeeNote, 
      deliveryTime: data.deliveryTime, 
      paymentMethod: data.paymentMethod, 
      notes: data.notes, 
      referrer: data.referrer, 
      proofLink: data.proofLink,
      items: items.map(item => ({ productId: item.id, name: item.name, variant: item.variant || null, price: item.price, quantity: item.quantity })),
      total: getTotalPrice(), 
      status: 'pending', 
      createdAt: serverTimestamp()
    };

    const sheetData = {
      action: "NEW_ORDER",
      orderId: shortOrderId,
      customerName: data.fullName,
      phone: `'${data.phone}`,
      address: deliveryAddress,
      shipFee: shipFeeNote,
      itemsDetail: items.map(i => `• ${i.name}${i.variant ? ` (${i.variant})`:''} x${i.quantity}`).join('\n'),
      totalPrice: getTotalPrice(),
      payment: data.paymentMethod,
      deliveryTime: data.deliveryTime ? data.deliveryTime.replace('T', ' ') : '', 
      referrer: data.referrer || "Không có",
      notes: data.notes || "Không"
    };

    try {
      await addDoc(collection(db, 'orders'), orderData);
      
      for (const item of items) {
        const fakeBonus = Math.floor(Math.random() * 4) + 2; 
        const totalIncrease = item.quantity + fakeBonus;
        const productRef = doc(db, 'products', item.id);
        await updateDoc(productRef, { sold: increment(totalIncrease) });
      }

      if (GOOGLE_SHEET_API_URL && GOOGLE_SHEET_API_URL.startsWith("http")) {
        const url = `${GOOGLE_SHEET_API_URL}?t=${Date.now()}`;
        try {
          await fetch(url, {
            method: "POST",
            mode: "no-cors",
            cache: "no-store", 
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(sheetData)
          });
        } catch (err) {
          console.error("Lỗi kết nối Sheet:", err);
        }
      }

      toast.success('🎉 Đặt hàng thành công!', { duration: 5000 });
      clearCart();
      navigate('/my-orders'); 
    } catch (error) {
      toast.error('Lỗi khi đặt hàng, vui lòng thử lại!');
      setLoading(false); // NẾU LỖI THÌ TẮT LOADING TRƯỚC ĐỂ KHÁCH BẤM LẠI
    } 
    // KHÔNG dùng finally { setLoading(false) } ở đây vì hàm navigate() đang chuyển trang. 
    // Giữ nguyên loading=true cho đến khi trang mới được render sẽ tạo cảm giác mượt hơn.
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6"><User className="w-6 h-6 text-green-500" /> Thông tin người nhận</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Họ và Tên *</label>
                <input {...register('fullName')} className={`w-full p-3.5 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-green-500 transition-all ${errors.fullName ? 'border-red-500' : 'border-slate-200'}`} placeholder="Nhập họ tên của bạn" />
                {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Số điện thoại *</label>
                <input {...register('phone')} type="tel" className={`w-full p-3.5 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-green-500 transition-all ${errors.phone ? 'border-red-500' : 'border-slate-200'}`} placeholder="09xx xxx xxx" />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
              </div>
            </div>

            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mt-8 mb-6"><MapPin className="w-6 h-6 text-green-500" /> Địa chỉ giao hàng</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <label className={`cursor-pointer border-2 rounded-xl p-4 flex items-center gap-3 transition-all ${watchAddressType === 'NEU' ? 'border-green-500 bg-green-50/50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                <input type="radio" value="NEU" {...register('addressType')} className="w-4 h-4 text-green-600 focus:ring-green-500" />
                <div><p className="font-bold text-slate-800">Lấy tại bàn</p><p className="text-xs text-green-600 font-medium">Miễn phí ship</p></div>
              </label>
              <label className={`cursor-pointer border-2 rounded-xl p-4 flex items-center gap-3 transition-all ${watchAddressType === 'OTHER' ? 'border-green-500 bg-green-50/50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                <input type="radio" value="OTHER" {...register('addressType')} className="w-4 h-4 text-green-600 focus:ring-green-500" />
                <div><p className="font-bold text-slate-800">Giao tận nơi</p><p className="text-xs text-orange-600 font-medium">Phí ship: 3k/1km</p></div>
              </label>
            </div>
            {watchAddressType === 'OTHER' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <input {...register('customAddress')} className={`w-full p-3.5 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-green-500 ${errors.customAddress ? 'border-red-500' : 'border-slate-200'}`} placeholder="Số nhà, tên đường, phường/xã, quận/huyện..." />
                {errors.customAddress && <p className="text-red-500 text-xs mt-1">{errors.customAddress.message}</p>}
              </motion.div>
            )}
          </motion.div>
        );
      case 2:
        return (
          <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6"><Clock className="w-6 h-6 text-green-500" /> Thời gian & Tùy chọn</h3>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Thời gian nhận hàng mong muốn *</label>
              <input type="datetime-local" {...register('deliveryTime')} className={`w-full p-3.5 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-green-500 ${errors.deliveryTime ? 'border-red-500' : 'border-slate-200'}`} />
              {errors.deliveryTime && <p className="text-red-500 text-xs mt-1">{errors.deliveryTime.message}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 mt-4">Người giới thiệu (Nếu có)</label>
              <input list="ctv-suggestions" {...register('referrer')} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500" placeholder="Gõ tên để tìm CTV..." autoComplete="off" />
              <datalist id="ctv-suggestions">
                {ctvList.map((name, idx) => (
                  <option key={idx} value={name} />
                ))}
              </datalist>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 mt-4">Ghi chú thêm</label>
              <textarea {...register('notes')} rows="3" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500" placeholder="Lưu ý về món ăn, địa chỉ..."></textarea>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6"><CreditCard className="w-6 h-6 text-green-500" /> Thanh toán</h3>
            <div className="space-y-4">
              <label className={`cursor-pointer border-2 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${watchPaymentMethod === 'COD' ? 'border-green-500 bg-green-50/30' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" value="COD" {...register('paymentMethod')} className="w-5 h-5 text-green-600 focus:ring-green-500" />
                  <div><p className="font-bold text-slate-800 text-lg">Tiền mặt (COD)</p><p className="text-sm text-slate-500">Thanh toán khi nhận hàng</p></div>
                </div>
              </label>
              <label className={`cursor-pointer border-2 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${watchPaymentMethod === 'TRANSFER' ? 'border-green-500 bg-green-50/30' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" value="TRANSFER" {...register('paymentMethod')} className="w-5 h-5 text-green-600 focus:ring-green-500" />
                  <div><p className="font-bold text-slate-800 text-lg">Chuyển khoản</p><p className="text-sm text-slate-500">Quét mã QR hoặc chuyển khoản thủ công</p></div>
                </div>
              </label>
            </div>
            {watchPaymentMethod === 'TRANSFER' && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 mt-4">
                <div className="text-center mb-6">
                  <img src={`https://img.vietqr.io/image/TCB-9899170810-compact.png?accountName=TRUONG%20THANH%20HANG&amount=${getTotalPrice()}&addInfo=MHX%20${watch('phone')}`} alt="QR Code" className="w-48 h-48 mx-auto rounded-xl shadow-sm border border-slate-200" />
                  <p className="text-xs text-slate-500 mt-2">Quét mã bằng app Ngân hàng / Momo</p>
                </div>
                <div className="space-y-2 text-sm text-slate-700 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <p className="flex justify-between"><span>Ngân hàng:</span> <span className="font-bold text-slate-900">Techcombank</span></p>
                  <p className="flex justify-between"><span>Số tài khoản:</span> <span className="font-bold text-slate-900">9899170810</span></p>
                  <p className="flex justify-between"><span>Chủ tài khoản:</span> <span className="font-bold text-slate-900">TRUONG THANH HANG</span></p>
                  <p className="flex justify-between text-orange-600 font-medium pt-2 border-t mt-2"><span>Nội dung CK:</span> <span>MHX {watch('phone') || '[SĐT của bạn]'}</span></p>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Link ảnh minh chứng (Không bắt buộc)</label>
                  <input {...register('proofLink')} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm" placeholder="Dán link ảnh cap màn hình CK (Drive, Imgur...)" />
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      default: return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-20 relative">
      
      {/* ==========================================
          MÀN HÌNH LOADING KHÓA TƯƠNG TÁC (OVERLAY)
          ========================================== */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] z-[9999] flex flex-col items-center justify-center text-white"
          >
            <div className="bg-white p-8 rounded-3xl flex flex-col items-center shadow-2xl text-center">
              <Loader2 className="w-12 h-12 text-green-500 animate-spin mb-4" />
              <p className="text-slate-800 font-bold text-lg">Đang xử lý đơn hàng...</p>
              <p className="text-slate-500 text-sm mt-1">Vui lòng không tắt trình duyệt</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-8 sm:mb-12 relative px-4">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-10 rounded-full"></div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-green-500 -z-10 rounded-full transition-all duration-500" style={{ width: `${((step - 1) / 2) * 100}%` }}></div>
        {[1, 2, 3].map(i => (
          <div key={i} className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold border-4 transition-all duration-300 ${step >= i ? 'bg-green-500 border-green-100 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400'}`}>
            {step > i ? <CheckCircle2 className="w-6 h-6" /> : i}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-100 min-h-[500px] flex flex-col">
            <div className="flex-grow">
              <AnimatePresence mode="wait">
                {renderStepContent()}
              </AnimatePresence>
            </div>

            <div className="flex justify-between mt-10 pt-6 border-t border-slate-100">
              {step > 1 ? (
                <button type="button" onClick={() => setStep(prev => prev - 1)} disabled={loading} className="px-6 py-3 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2">
                  <ChevronLeft className="w-5 h-5" /> Quay lại
                </button>
              ) : <div></div>}

              {step < 3 ? (
                <button type="button" onClick={handleNextStep} disabled={loading} className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-colors flex items-center gap-2">
                  Tiếp tục <ChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={handleSubmit(onSubmit)} 
                  disabled={loading}
                  className="px-8 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
                >
                  XÁC NHẬN ĐẶT HÀNG
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white sticky top-24 shadow-xl">
            <h3 className="text-xl font-bold mb-6 pb-6 border-b border-slate-700/50">Tóm tắt đơn hàng</h3>
            <div className="space-y-5 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {items.map(item => (
                <div key={item.cartItemId} className="flex gap-4">
                  <div className="w-16 h-16 bg-white/10 rounded-xl flex-shrink-0 p-1">
                    <img src={item.image || `https://ui-avatars.com/api/?name=${item.name}&background=ffffff&color=0f172a`} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm leading-snug text-slate-100">{item.name}</p>
                    {item.variant && <p className="text-xs text-slate-400 mt-0.5">Vị: {item.variant}</p>}
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs font-medium text-slate-300">SL: {item.quantity}</span>
                      <span className="font-bold text-green-400">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-slate-700/50">
              <div className="flex justify-between items-center mb-2 text-slate-300">
                <span>Tạm tính</span><span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(getTotalPrice())}</span>
              </div>
              
              <div className="flex justify-between items-center mb-4 text-slate-300">
                <span>Phí giao hàng</span>
                <span className={`font-medium ${watchAddressType === 'NEU' ? 'text-green-400' : 'text-orange-400'}`}>
                  {watchAddressType === 'NEU' ? 'Miễn phí' : '3k/1km'}
                </span>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t border-slate-700/50">
                <span className="text-lg font-bold">Tổng cộng</span>
                <span className="text-2xl font-extrabold text-white">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(getTotalPrice())}</span>
              </div>
              
              {watchAddressType === 'OTHER' && (
                <p className="text-[10px] text-slate-400 text-center mt-3 italic">* Phí ship sẽ được báo chính xác khi nhân viên liên hệ xác nhận.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}