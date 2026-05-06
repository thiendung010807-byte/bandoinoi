import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../store/useCart';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { MapPin, Clock, CreditCard, CheckCircle } from 'lucide-react';

export default function Checkout() {
  const { items, getTotalPrice, clearCart } = useCart();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: currentUser?.displayName || '',
    phone: '',
    addressType: 'NEU', // 'NEU' hoặc 'OTHER'
    customAddress: '',
    deliveryTime: '',
    paymentMethod: 'COD',
    notes: ''
  });

  // Chuyển hướng nếu giỏ hàng trống
  if (items.length === 0 && !loading) {
    return (
      <div className="text-center mt-20">
        <h2 className="text-2xl font-bold text-gray-800">Giỏ hàng của bạn đang trống</h2>
        <button onClick={() => navigate('/')} className="mt-4 text-brand-500 hover:underline">Quay lại mua sắm</button>
      </div>
    );
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.phone || formData.phone.length < 9) {
      return toast.error("Vui lòng nhập số điện thoại hợp lệ!");
    }
    if (formData.addressType === 'OTHER' && !formData.customAddress) {
      return toast.error("Vui lòng nhập địa chỉ giao hàng!");
    }
    if (!formData.deliveryTime) {
      return toast.error("Vui lòng chọn thời gian nhận hàng!");
    }

    setLoading(true);
    
    // Chuẩn bị dữ liệu Đơn hàng
    const orderData = {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      customerName: formData.fullName,
      phone: formData.phone,
      address: formData.addressType === 'NEU' ? 'Bàn truyền thống (NEU - 185 Trần Đại Nghĩa)' : formData.customAddress,
      deliveryTime: formData.deliveryTime,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes,
      items: items.map(item => ({
        productId: item.id,
        name: item.name,
        variant: item.variant || null,
        price: item.price,
        quantity: item.quantity
      })),
      total: getTotalPrice(),
      status: 'pending', // Các trạng thái: pending, confirmed, shipping, done
      createdAt: serverTimestamp()
    };

    try {
      // Lưu vào Firestore collection 'orders'
      await addDoc(collection(db, 'orders'), orderData);
      
      toast.success('Đặt hàng thành công! Cảm ơn bạn đã ủng hộ chương trình.', { duration: 4000 });
      clearCart();
      navigate('/'); 
    } catch (error) {
      console.error("Lỗi khi tạo đơn hàng:", error);
      toast.error('Có lỗi xảy ra, vui lòng thử lại sau!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 mb-8 border-b pb-4">Xác nhận thanh toán</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Form Nhập liệu */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-800 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-brand-500" /> Thông tin liên hệ
            </h3>
            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Họ và tên" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all" required />
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Số điện thoại liên hệ" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all" required />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-800 flex items-center gap-2 mt-6">
              <MapPin className="w-5 h-5 text-brand-500" /> Địa chỉ nhận hàng
            </h3>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="addressType" value="NEU" checked={formData.addressType === 'NEU'} onChange={handleChange} className="text-brand-500 focus:ring-brand-500" />
                <span className="text-gray-700">Bàn truyền thống (NEU)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="addressType" value="OTHER" checked={formData.addressType === 'OTHER'} onChange={handleChange} className="text-brand-500 focus:ring-brand-500" />
                <span className="text-gray-700">Địa chỉ khác</span>
              </label>
            </div>
            {formData.addressType === 'OTHER' && (
              <input type="text" name="customAddress" value={formData.customAddress} onChange={handleChange} placeholder="Nhập địa chỉ cụ thể..." className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none animate-fade-in" required />
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-800 flex items-center gap-2 mt-6">
              <Clock className="w-5 h-5 text-brand-500" /> Thời gian giao hàng (Dự kiến)
            </h3>
            <input type="datetime-local" name="deliveryTime" value={formData.deliveryTime} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" required />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-800 flex items-center gap-2 mt-6">
              <CreditCard className="w-5 h-5 text-brand-500" /> Phương thức thanh toán
            </h3>
            <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white">
              <option value="COD">Thanh toán khi nhận hàng (COD)</option>
              <option value="TRANSFER">Chuyển khoản ngân hàng</option>
            </select>
            {formData.paymentMethod === 'TRANSFER' && (
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-sm text-orange-800 animate-fade-in">
                Vui lòng chuyển khoản tới STK: <strong>123456789 (Vietcombank)</strong> - Chủ TK: Đội TN Mùa Hè Xanh. Nội dung: <strong>MHX {formData.phone}</strong>. Đơn hàng sẽ được xác nhận sau khi nhận được tiền.
              </div>
            )}
          </div>

          <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Ghi chú thêm (không bắt buộc)" rows="3" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none mt-4"></textarea>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 rounded-xl transition-colors shadow-lg shadow-brand-500/30 mt-8 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang xử lý...' : `ĐẶT HÀNG - ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(getTotalPrice())}`}
          </button>
        </form>

        {/* Tóm tắt Đơn hàng */}
        <div className="bg-gray-50 p-6 rounded-2xl h-fit border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 pb-4 border-b border-gray-200">Đơn hàng của bạn ({items.length} món)</h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {items.map(item => (
              <div key={item.cartItemId} className="flex justify-between items-center">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-white rounded border flex-shrink-0">
                    <img src={item.image || `https://ui-avatars.com/api/?name=${item.name}&background=Edf2f7&color=4A5568`} alt={item.name} className="w-full h-full object-cover rounded" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.variant ? `Vị: ${item.variant} ` : ''}x {item.quantity}
                    </p>
                  </div>
                </div>
                <span className="font-semibold text-sm">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
            <span className="text-lg font-bold text-gray-800">Tổng cộng</span>
            <span className="text-xl font-bold text-brand-600">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(getTotalPrice())}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}