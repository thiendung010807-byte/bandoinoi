import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Package, Clock, CheckCircle, Truck, ShoppingBag, XCircle, AlertCircle } from 'lucide-react';
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
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_LABELS = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đang giao', done: 'Hoàn thành', cancelled: 'Đã hủy' };

export default function MyOrders() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  
  // State cho Modal hủy đơn
  const [cancellingId, setCancellingId] = useState(null);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // ==========================================
  // DÁN LINK GOOGLE SHEET API CỦA BẠN VÀO ĐÂY
  // ==========================================
  const GOOGLE_SHEET_API_URL = "https://script.google.com/macros/s/AKfycbxQ9tjJ2odLUzyhWYNC2cMT-i-pppEwYfbHa-F16o4o7EAhRGA51B_JH4X5ZYXvyK-9/exec";

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'orders'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Bước 1: Nhấn nút hủy -> Kiểm tra điều kiện thời gian -> Mở Modal
  const handleInitiateCancel = async (order) => {
    if (order.status !== 'pending') return toast.error("Chỉ có thể hủy đơn đang chờ xác nhận!");

    const orderTime = order.createdAt?.toDate().getTime();
    if (!orderTime) return toast.error("Đang đồng bộ thời gian, thử lại sau!");
    if ((Date.now() - orderTime) / (1000 * 60 * 60) > 24) return toast.error("Đã quá 24h, không thể hủy đơn!");

    try {
      const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
      if (userSnap.exists() && userSnap.data().lastCancelledAt) {
        const lastCancelTime = userSnap.data().lastCancelledAt.toDate().getTime();
        const hoursSinceLastCancel = (Date.now() - lastCancelTime) / (1000 * 60 * 60);
        if (hoursSinceLastCancel < 1) {
          const waitMinutes = Math.ceil((1 - hoursSinceLastCancel) * 60);
          return toast.error(`Vui lòng thử lại sau ${waitMinutes} phút nữa!`, { icon: '⏳' });
        }
      }
      
      // Pass mọi bài test -> Mở Modal
      setOrderToCancel(order);
      setCancelReason('');
    } catch (error) {
      toast.error("Lỗi kiểm tra hệ thống!");
    }
  };

  // Bước 2: Gửi yêu cầu hủy kèm lý do lên Firebase VÀ GOOGLE SHEET
  const submitCancelOrder = async () => {
    if (!cancelReason.trim()) return;
    setCancellingId(orderToCancel.id);

    try {
      // 1. Cập nhật Firebase thành 'cancelled'
      await updateDoc(doc(db, 'orders', orderToCancel.id), { 
        status: 'cancelled',
        cancelReason: cancelReason.trim(),
        updatedAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'users', currentUser.uid), { lastCancelledAt: serverTimestamp() });

      // 2. Bắn tín hiệu sang Google Sheet (Giống hệt cách Admin làm)
      if (GOOGLE_SHEET_API_URL && GOOGLE_SHEET_API_URL.startsWith("http")) {
        const url = `${GOOGLE_SHEET_API_URL}?t=${Date.now()}`; // Chống bộ nhớ đệm
        
        await fetch(url, {
          method: "POST",
          mode: "no-cors",
          cache: "no-store",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ 
            action: "UPDATE_STATUS", 
            orderId: String(orderToCancel.orderId || orderToCancel.id).trim(), // Truyền mã MHX sang để Sheet tìm
            status: "cancelled" 
          })
        }).catch(e => console.log("Lỗi sync sheet âm thầm", e));
      }

      toast.success("Đã hủy đơn hàng thành công!");
      setOrderToCancel(null); // Đóng Modal
    } catch (error) {
      console.error(error);
      toast.error("Lỗi hệ thống khi hủy đơn!");
    } finally {
      setCancellingId(null);
    }
  };

  const filteredOrders = activeTab === 'all' ? orders : orders.filter(o => o.status === activeTab);

  if (loading) return <div className="text-center py-20 text-gray-500">Đang tải đơn hàng của bạn...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-10">
      <h1 className="text-2xl font-bold text-gray-900">Đơn hàng của tôi</h1>

      {/* TABS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 overflow-x-auto">
        <div className="flex min-w-max gap-2">
          {STATUS_TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${activeTab === tab.id ? 'bg-green-500 text-white shadow-md shadow-green-500/20' : 'text-gray-600 hover:bg-gray-50'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {tab.id === 'all' ? orders.length : orders.filter(o => o.status === tab.id).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* DANH SÁCH ĐƠN HÀNG */}
      <div className="space-y-4">
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
                  <div className="flex items-center gap-3">
                    {/* NÚT HỦY ĐƠN */}
                    {isCancelable && (
                      <button onClick={() => handleInitiateCancel(order)} className="text-sm font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                        <AlertCircle className="w-4 h-4"/> Hủy đơn
                      </button>
                    )}
                    <div className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm sm:text-base">
                      <div className="flex gap-3 items-center">
                        <span className="font-semibold text-gray-700">{item.quantity}x</span>
                        <div>
                          <p className={`text-gray-800 ${order.status === 'cancelled' && 'line-through text-gray-400'}`}>{item.name}</p>
                          {item.variant && <p className="text-xs text-gray-500">Vị/Loại: {item.variant}</p>}
                        </div>
                      </div>
                      <span className="text-gray-600 font-medium">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price * item.quantity)}
                      </span>
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

      {/* POPUP (MODAL) NHẬP LÝ DO HỦY ĐƠN */}
      {orderToCancel && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Hủy đơn hàng</h3>
            <p className="text-sm text-gray-600 mb-4">Bạn vui lòng cho chúng mình biết lý do hủy đơn nhé (bắt buộc):</p>
            
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="VD: Mình muốn đặt lại món khác, Thời gian giao không phù hợp..."
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none mb-6 min-h-[100px] text-sm"
            />
            
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setOrderToCancel(null)} 
                className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold transition-colors"
              >
                Giữ lại đơn
              </button>
              <button
                onClick={submitCancelOrder}
                disabled={!cancelReason.trim() || cancellingId}
                className="px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-500/30 flex items-center gap-2"
              >
                {cancellingId ? 'Đang xử lý...' : 'Xác nhận Hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}