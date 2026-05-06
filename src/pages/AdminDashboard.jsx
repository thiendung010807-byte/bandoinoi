import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Package, DollarSign, Clock, CheckCircle, Truck } from 'lucide-react';

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, confirmed, shipping, done

  useEffect(() => {
    // Query lấy đơn hàng sắp xếp theo thời gian mới nhất
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    
    // Lắng nghe realtime
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error("Lỗi fetch đơn hàng:", error);
      toast.error("Không thể tải danh sách đơn hàng.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status: newStatus });
      toast.success('Đã cập nhật trạng thái đơn hàng!');
    } catch (error) {
      console.error("Lỗi update:", error);
      toast.error('Lỗi khi cập nhật trạng thái.');
    }
  };

  // Tính toán thống kê
  const totalRevenue = orders.filter(o => o.status === 'done').reduce((acc, curr) => acc + curr.total, 0);
  const pendingOrders = orders.filter(o => o.status === 'pending').length;

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  if (loading) return <div className="text-center py-20 animate-pulse text-gray-500">Đang tải dữ liệu quản trị...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900">Bảng điều khiển Quản trị viên</h1>

      {/* Thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-xl"><Package className="w-8 h-8" /></div>
          <div>
            <p className="text-gray-500 text-sm">Tổng số đơn hàng</p>
            <h3 className="text-2xl font-bold text-gray-900">{orders.length}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-orange-50 text-orange-600 rounded-xl"><Clock className="w-8 h-8" /></div>
          <div>
            <p className="text-gray-500 text-sm">Đơn chờ xác nhận</p>
            <h3 className="text-2xl font-bold text-gray-900">{pendingOrders}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-green-50 text-green-600 rounded-xl"><DollarSign className="w-8 h-8" /></div>
          <div>
            <p className="text-gray-500 text-sm">Doanh thu thực tế (Done)</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalRevenue)}
            </h3>
          </div>
        </div>
      </div>

      {/* Bảng đơn hàng */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="font-bold text-gray-800">Danh sách đơn hàng</h2>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">Tất cả</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="shipping">Đang giao</option>
            <option value="done">Hoàn thành</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-medium">Khách hàng</th>
                <th className="p-4 font-medium">Chi tiết món</th>
                <th className="p-4 font-medium">Tổng tiền</th>
                <th className="p-4 font-medium">Thời gian giao</th>
                <th className="p-4 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-50">
              {filteredOrders.length === 0 ? (
                <tr><td colSpan="5" className="p-6 text-center text-gray-400">Không có đơn hàng nào.</td></tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-gray-800">{order.customerName}</p>
                      <p className="text-gray-500 text-xs">{order.phone}</p>
                      <p className="text-gray-500 text-xs mt-1 truncate max-w-[200px]" title={order.address}>{order.address}</p>
                    </td>
                    <td className="p-4">
                      <ul className="space-y-1">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="text-gray-700">
                            <span className="font-medium">{item.quantity}x</span> {item.name} 
                            {item.variant && <span className="text-gray-400 text-xs"> ({item.variant})</span>}
                          </li>
                        ))}
                      </ul>
                      {order.notes && <p className="mt-2 text-xs text-orange-600 bg-orange-50 p-1 rounded inline-block">Ghi chú: {order.notes}</p>}
                    </td>
                    <td className="p-4 font-bold text-brand-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total)}
                      <p className="text-xs text-gray-400 font-normal mt-1">{order.paymentMethod}</p>
                    </td>
                    <td className="p-4 text-gray-600">
                      {new Date(order.deliveryTime).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-4">
                      <select 
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                        className={`text-sm rounded-full px-3 py-1 font-semibold border-0 outline-none cursor-pointer
                          ${order.status === 'pending' ? 'bg-orange-100 text-orange-700' : ''}
                          ${order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : ''}
                          ${order.status === 'shipping' ? 'bg-purple-100 text-purple-700' : ''}
                          ${order.status === 'done' ? 'bg-green-100 text-green-700' : ''}
                        `}
                      >
                        <option value="pending">Chờ xác nhận</option>
                        <option value="confirmed">Đã xác nhận</option>
                        <option value="shipping">Đang giao</option>
                        <option value="done">Hoàn thành</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}