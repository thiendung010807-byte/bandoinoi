import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { 
  collection, query, where, orderBy, onSnapshot, 
  doc, getDoc, updateDoc, serverTimestamp 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion'; 
import { Package, Clock, CheckCircle, Truck, ShoppingBag, XCircle, AlertCircle, Award, Loader2 } from 'lucide-react'; 
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const STATUS_TABS = [
  { id: 'all', label: 'Tất cả', icon: Package },
  { id: 'pending', label: 'Chờ xác nhận', icon: Clock },
  { id: 'confirmed', label: 'Đã xác nhận', icon: CheckCircle },
  { id: 'shipping', label: 'Đang giao', icon: Truck },
  { id: 'done', label: 'Hoàn thành', icon: ShoppingBag },
  { id: 'cancelled', label: 'Đã hủy', icon: XCircle }
];

const STATUS_COLORS = { 
  pending: 'bg-orange-100 text-orange-700 border-orange-200', 
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200', 
  shipping: 'bg-purple-100 text-purple-700 border-purple-200', 
  done: 'bg-green-100 text-green-700 border-green-200', 
  cancelled: 'bg-red-100 text-red-700 border-red-200' 
};
const STATUS_LABELS = { 
  pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đang giao', done: 'Hoàn thành', cancelled: 'Đã hủy' 
};

export default function MyOrders() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  
  // Ref dùng để điều khiển Scroll thanh Tab trên Mobile
  const scrollRef = useRef(null);
  
  const [isCTV, setIsCTV] = useState(false);
  const [ctvOrders, setCtvOrders] = useState([]);
  const [ctvDisplayName, setCtvDisplayName] = useState(''); 

  const [cancellingId, setCancellingId] = useState(null);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    
    // Lấy danh sách đơn hàng của User
    const q = query(collection(db, 'orders'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // Lấy thông tin CTV nếu user hiện tại có trong danh sách CTV
    const unsubscribeIsCTV = onSnapshot(collection(db, 'ctvs'), (snapshot) => {
      const matchedCtvDoc = snapshot.docs.find(doc => doc.data().email === currentUser.email);
      if (matchedCtvDoc) {
        setIsCTV(true);
        const mappedName = matchedCtvDoc.data().name; 
        setCtvDisplayName(mappedName);

        const qCTV = query(collection(db, 'orders'), where('referrer', '==', mappedName));
        onSnapshot(qCTV, (snap) => {
          setCtvOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
      } else {
        setIsCTV(false);
        setCtvOrders([]);
      }
    });

    return () => { unsubscribeOrders(); unsubscribeIsCTV(); };
  }, [currentUser]);

  // Kiểm tra điều kiện trước khi cho phép mở Modal Hủy Đơn
  const handleInitiateCancel = async (order) => {
    if (order.status !== 'pending') return toast.error("Chỉ có thể hủy đơn đang chờ xác nhận!");
    const orderTime = order.createdAt?.toDate().getTime();
    if (!orderTime) return toast.error("Đang đồng bộ thời gian, thử lại sau!");
    if ((Date.now() - orderTime) / (1000 * 60 * 60) > 24) return toast.error("Đã quá 24h, không thể hủy đơn!");

    try {
      const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
      // Chống spam hủy đơn liên tục (Giới hạn 1 tiếng / 1 lần hủy)
      if (userSnap.exists() && userSnap.data().lastCancelledAt) {
        const hoursSinceLastCancel = (Date.now() - userSnap.data().lastCancelledAt.toDate().getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastCancel < 1) return toast.error(`Vui lòng thử lại sau ${Math.ceil((1 - hoursSinceLastCancel) * 60)} phút nữa!`, { icon: '⏳' });
      }
      setOrderToCancel(order); setCancelReason('');
    } catch (error) { toast.error("Lỗi kiểm tra hệ thống!"); }
  };

  // ==========================================
  // BẢO MẬT: HỦY ĐƠN QUA BACKEND (API VERCEL)
  // ==========================================
  const submitCancelOrder = async () => {
    if (!cancelReason.trim()) return;
    setCancellingId(orderToCancel.id); 

    try {
      // GỌI SANG VERCEL ĐỂ MÁY CHỦ TỰ XỬ LÝ
      const response = await fetch('/api/update-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderToCancel.orderId || orderToCancel.id,
          documentId: orderToCancel.id,
          newStatus: 'cancelled',
          cancelReason: cancelReason.trim(),
          userId: currentUser.uid, // Gửi UID để Backend đối chiếu xem có đúng chủ đơn không
          isAdmin: false
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Ghi nhận thời gian hủy để tính cooldown chống spam
        await updateDoc(doc(db, 'users', currentUser.uid), { lastCancelledAt: serverTimestamp() });
        toast.success("Đã hủy đơn hàng thành công!"); 
        setOrderToCancel(null); 
      } else {
        toast.error(result.message || "Lỗi hệ thống khi hủy đơn!"); 
      }
    } catch (error) { 
      toast.error("Lỗi mất kết nối với máy chủ!"); 
    } finally { 
      setCancellingId(null); 
    }
  };

  // ==========================================
  // UX: CUỘN THANH TAB RA GIỮA KHI ĐƯỢC CHỌN
  // ==========================================
  const handleTabClick = (tabId, event) => {
    setActiveTab(tabId);
    
    const container = scrollRef.current;
    const button = event.currentTarget;

    if (container && button) {
      const scrollLeft = button.offsetLeft - (container.clientWidth / 2) + (button.clientWidth / 2);
      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth' 
      });
    }
  };

  const filteredOrders = activeTab === 'all' ? orders : orders.filter(o => o.status === activeTab);

  if (loading) {
    return (
      <div className="text-center py-20 text-green-600 font-medium flex flex-col items-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500 mb-3"/> Đang tải đơn hàng của bạn...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-10 relative">

      {/* Overlay Loading lúc hủy đơn */}
      <AnimatePresence>
        {cancellingId && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] z-[9999] flex flex-col items-center justify-center text-white"
          >
            <div className="bg-white p-8 rounded-3xl flex flex-col items-center shadow-2xl text-center">
              <Loader2 className="w-12 h-12 text-red-500 animate-spin mb-4" />
              <p className="text-slate-800 font-bold text-lg">Đang hủy đơn hàng...</p>
              <p className="text-slate-500 text-sm mt-1">Hệ thống đang đồng bộ dữ liệu, vui lòng đợi</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- DASHBOARD THỐNG KÊ CHO CTV --- */}
      {(isCTV || ctvOrders.length > 0) && (
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-3xl border border-orange-200 shadow-sm mb-8 mx-2 sm:mx-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
               <Award className="w-7 h-7 text-orange-600" />
               <h2 className="text-2xl font-bold text-orange-900 tracking-tight">Thống kê Cộng Tác Viên</h2>
            </div>
            <div className="bg-orange-200 text-orange-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-orange-300">
               Mã giới thiệu của bạn: {ctvDisplayName}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/80 backdrop-blur p-4 rounded-2xl border border-orange-100 flex flex-col justify-center">
              <p className="text-sm font-semibold text-slate-500 mb-1">Đơn đang chờ</p>
              <p className="text-2xl font-bold text-slate-800">{ctvOrders.filter(o => o.status !== 'done' && o.status !== 'cancelled').length}</p>
            </div>
            <div className="bg-white/80 backdrop-blur p-4 rounded-2xl border border-orange-100 flex flex-col justify-center">
              <p className="text-sm font-semibold text-slate-500 mb-1">Đơn thành công</p>
              <p className="text-2xl font-bold text-green-600 flex items-center gap-1">
                {ctvOrders.filter(o => o.status === 'done').length} <CheckCircle className="w-4 h-4"/>
              </p>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-2xl shadow-md text-white flex flex-col justify-center">
              <p className="text-sm font-medium text-orange-100 mb-1">Doanh thu mang lại</p>
              <p className="text-2xl font-extrabold tracking-tight">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(ctvOrders.filter(o => o.status === 'done').reduce((a, b) => a + (b.total || 0), 0))}
              </p>
            </div>
          </div>
          <p className="text-xs text-orange-700 mt-4 italic font-medium">* Doanh thu chỉ được tính cho những đơn hàng có trạng thái "Hoàn thành".</p>
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-900 px-2 sm:px-0">Đơn hàng bạn đã đặt</h1>

      {/* --- THANH TAB CÓ SCROLL CENTER --- */}
      <div 
        ref={scrollRef} 
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mx-2 sm:mx-0 overflow-x-auto relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <div className="flex w-max gap-2">
          {STATUS_TABS.map((tab) => (
            <button 
              key={tab.id} 
              onClick={(e) => handleTabClick(tab.id, e)} 
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${activeTab === tab.id ? 'bg-green-500 text-white shadow-md shadow-green-500/20' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {tab.id === 'all' ? orders.length : orders.filter(o => o.status === tab.id).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* --- DANH SÁCH ĐƠN HÀNG --- */}
      <div className="space-y-4 mt-6 px-2 sm:px-0">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Không có đơn hàng nào.</p>
            <Link to="/" className="mt-4 inline-block text-green-600 font-medium hover:underline">Quay lại mua sắm</Link>
          </div>
        ) : (
          filteredOrders.map(order => {
            const isCancelable = order.status === 'pending' && order.createdAt && (Date.now() - order.createdAt.toDate().getTime()) / (1000 * 60 * 60) <= 24;

            return (
              <div key={order.id} className={`bg-white p-5 sm:p-6 rounded-2xl shadow-sm border ${order.status === 'cancelled' ? 'border-red-100 bg-red-50/30' : 'border-gray-100'}`}>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4 pb-4 border-b border-gray-100">
                  <div>
                    <p className="text-sm text-gray-500">Mã đơn: <span className="font-bold text-slate-800">{order.orderId || order.id}</span></p>
                    <p className="text-xs text-gray-400 mt-1">Đặt lúc: {order.createdAt?.toDate().toLocaleString('vi-VN')}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {isCancelable && (
                      <button onClick={() => handleInitiateCancel(order)} className="text-sm font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                        <AlertCircle className="w-4 h-4"/> Hủy đơn
                      </button>
                    )}
                    <div className={`px-3 py-1.5 rounded-lg border text-sm font-bold whitespace-nowrap ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm sm:text-base">
                      <div className="flex gap-3 items-center">
                        <span className="font-semibold text-gray-700">{item.quantity}x</span>
                        <div>
                          <p className={`text-gray-800 ${order.status === 'cancelled' && 'line-through text-gray-400'}`}>{item.name}</p>
                          {item.variant && <p className="text-xs text-gray-500">Vị/Loại: {item.variant}</p>}
                        </div>
                      </div>
                      <span className="text-gray-600 font-medium whitespace-nowrap">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                {order.status === 'cancelled' && order.cancelReason && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                    <span className="font-bold">Lý do hủy:</span> {order.cancelReason}
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="text-sm">
                    <p className="text-gray-600">Giao đến: <span className="font-medium text-gray-900">{order.address}</span></p>
                    <p className="text-gray-600 mt-1">SĐT: <span className="font-medium text-gray-900">{order.phone}</span></p>
                  </div>
                  <div className="text-right w-full sm:w-auto">
                    <p className={`text-xl font-bold ${order.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-green-600'}`}>
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* --- MODAL HỦY ĐƠN HÀNG --- */}
      {orderToCancel && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9990] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Hủy đơn hàng</h3>
            <p className="text-sm text-gray-600 mb-4">Bạn vui lòng cho chúng mình biết lý do hủy đơn nhé (bắt buộc):</p>
            <textarea 
              value={cancelReason} 
              onChange={(e) => setCancelReason(e.target.value)} 
              placeholder="VD: Mình muốn đặt lại món khác, Thời gian giao lâu quá..." 
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none mb-6 min-h-[100px] text-sm" 
            />
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setOrderToCancel(null)} 
                disabled={cancellingId} 
                className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 disabled:opacity-50 rounded-xl font-semibold transition-colors"
              >
                Giữ lại đơn
              </button>
              <button 
                onClick={submitCancelOrder} 
                disabled={!cancelReason.trim() || cancellingId} 
                className="px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-500/30 flex items-center gap-2"
              >
                Xác nhận Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}