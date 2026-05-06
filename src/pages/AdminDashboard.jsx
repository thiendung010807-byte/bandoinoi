import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
// Bổ sung các hàm để thêm, sửa, xóa sản phẩm
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Package, DollarSign, Clock, CheckCircle, ShoppingBag, Plus, Edit, Trash2, X } from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' hoặc 'products'
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // State cho Form Sản phẩm
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '', price: '', image: '', variants: '', isCombo: false
  });

  useEffect(() => {
    // 1. Lắng nghe Đơn hàng
    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Lắng nghe Sản phẩm
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => { unsubOrders(); unsubProducts(); };
  }, []);

  // ====== LOGIC ĐƠN HÀNG ======
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      toast.success('Cập nhật trạng thái thành công!');
    } catch (error) {
      toast.error('Lỗi cập nhật trạng thái.');
    }
  };

  // ====== LOGIC SẢN PHẨM ======
  const resetForm = () => {
    setProductForm({ name: '', price: '', image: '', variants: '', isCombo: false });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleEditProduct = (product) => {
    setProductForm({
      name: product.name,
      price: product.price,
      image: product.image || '',
      variants: product.variants ? product.variants.join(', ') : '',
      isCombo: product.isCombo || false
    });
    setEditingId(product.id);
    setIsEditing(true);
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
        toast.success('Đã xóa sản phẩm!');
      } catch (error) {
        toast.error('Lỗi khi xóa!');
      }
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price) return toast.error('Vui lòng nhập tên và giá!');

    // Xử lý chuỗi variants (tách bằng dấu phẩy)
    const variantsArray = productForm.variants
      ? productForm.variants.split(',').map(v => v.trim()).filter(v => v !== '')
      : [];

    const productData = {
      name: productForm.name,
      price: Number(productForm.price),
      image: productForm.image,
      variants: variantsArray,
      isCombo: productForm.isCombo
    };

    try {
      if (isEditing) {
        await updateDoc(doc(db, 'products', editingId), productData);
        toast.success('Cập nhật sản phẩm thành công!');
      } else {
        await addDoc(collection(db, 'products'), productData);
        toast.success('Thêm sản phẩm mới thành công!');
      }
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi lưu!');
    }
  };

  // Tính toán thống kê
  const totalRevenue = orders.filter(o => o.status === 'done').reduce((acc, curr) => acc + curr.total, 0);
  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  if (loading) return <div className="text-center py-20 text-gray-500">Đang tải dữ liệu...</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-end">
        <h1 className="text-2xl font-bold text-gray-900">Bảng điều khiển Quản trị viên</h1>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex gap-4 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-4 font-semibold text-lg flex items-center gap-2 transition-colors ${activeTab === 'orders' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500 hover:text-gray-800'}`}
        >
          <Package className="w-5 h-5" /> Quản lý Đơn hàng
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          className={`pb-3 px-4 font-semibold text-lg flex items-center gap-2 transition-colors ${activeTab === 'products' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500 hover:text-gray-800'}`}
        >
          <ShoppingBag className="w-5 h-5" /> Quản lý Sản phẩm
        </button>
      </div>

      {/* ===================== TAB ĐƠN HÀNG ===================== */}
      {activeTab === 'orders' && (
        <div className="space-y-6 animate-fade-in">
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
                <p className="text-gray-500 text-sm">Chờ xác nhận</p>
                <h3 className="text-2xl font-bold text-gray-900">{orders.filter(o => o.status === 'pending').length}</h3>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-4 bg-green-50 text-green-600 rounded-xl"><DollarSign className="w-8 h-8" /></div>
              <div>
                <p className="text-gray-500 text-sm">Doanh thu (Đã xong)</p>
                <h3 className="text-2xl font-bold text-gray-900">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalRevenue)}
                </h3>
              </div>
            </div>
          </div>

          {/* Danh sách đơn hàng */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-gray-800">Danh sách đơn hàng</h2>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none">
                <option value="all">Tất cả</option>
                <option value="pending">Chờ xác nhận</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="shipping">Đang giao</option>
                <option value="done">Hoàn thành</option>
		<option value="cancelled">Đã hủy</option>
              </select>
            </div>
            {/* Table Header & Body */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
                    <th className="p-4 font-medium">Khách hàng</th>
                    <th className="p-4 font-medium">Chi tiết món</th>
                    <th className="p-4 font-medium">Tổng tiền</th>
                    <th className="p-4 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-50">
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan="4" className="p-6 text-center text-gray-400">Không có đơn hàng.</td></tr>
                  ) : (
                    filteredOrders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50/50">
                        <td className="p-4">
                          <p className="font-bold text-gray-800">{order.customerName}</p>
                          <p className="text-gray-500 text-xs">{order.phone}</p>
                          <p className="text-gray-500 text-xs mt-1 max-w-[200px]">{order.address}</p>
                        </td>
                        {/* CỘT CHI TIẾT MÓN TRONG BẢNG */}
<td className="p-4 max-w-xs sm:max-w-sm">
  <ul className="space-y-1">
    {order.items.map((item, idx) => (
      <li key={idx} className="text-gray-700">
        <span className="font-medium">{item.quantity}x</span> {item.name} {item.variant && `(${item.variant})`}
      </li>
    ))}
  </ul>
  
  {/* GHI CHÚ: Ép xuống dòng bằng break-words và whitespace-pre-wrap */}
  {order.notes && (
    <p className="mt-2 text-xs text-orange-600 break-words whitespace-pre-wrap">
      <span className="font-semibold">Ghi chú:</span> {order.notes}
    </p>
  )}

  {/* NGƯỜI GIỚI THIỆU (Sẽ lấy từ Checkout) */}
  {order.referrer && (
    <p className="mt-1 text-xs text-blue-600 break-words">
      <span className="font-semibold">Người giới thiệu:</span> {order.referrer}
    </p>
  )}
</td>
                        <td className="p-4 font-bold text-green-600">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total)}
                          <p className="text-xs text-gray-400 font-normal">{order.paymentMethod}</p>
                        </td>
                        <td className="p-4">
  {order.status === 'cancelled' ? (
    // Nếu đơn đã hủy -> Khóa trạng thái, chỉ hiện text
    <div className="space-y-2">
      <span className="inline-block bg-red-100 text-red-700 text-sm rounded-full px-3 py-1 font-semibold">
        Đã hủy
      </span>
      {order.cancelReason && (
        <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100 leading-snug">
          <span className="font-bold">Lý do:</span> {order.cancelReason}
        </p>
      )}
    </div>
  ) : (
    // Nếu đơn bình thường -> Vẫn hiện ô Select cho Admin chọn
    <select 
      value={order.status} 
      onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
      className={`text-sm rounded-full px-3 py-1 font-semibold outline-none cursor-pointer border-0
        ${order.status === 'pending' ? 'bg-orange-100 text-orange-700' : ''} 
        ${order.status === 'done' ? 'bg-green-100 text-green-700' : ''} 
        ${order.status === 'shipping' ? 'bg-purple-100 text-purple-700' : ''}
        ${order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : ''}
      `}
    >
      <option value="pending">Chờ xác nhận</option>
      <option value="confirmed">Đã xác nhận</option>
      <option value="shipping">Đang giao</option>
      <option value="done">Hoàn thành</option>
    </select>
  )}
</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB SẢN PHẨM ===================== */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          
          {/* FORM THÊM / SỬA SẢN PHẨM */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit sticky top-24">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                {isEditing ? <Edit className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-green-500" />}
                {isEditing ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
              </h2>
              {isEditing && (
                <button onClick={resetForm} className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1">
                  <X className="w-4 h-4"/> Hủy
                </button>
              )}
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên món / Combo <span className="text-red-500">*</span></label>
                <input type="text" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" required placeholder="VD: Bánh tráng nướng" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giá bán (VNĐ) <span className="text-red-500">*</span></label>
                <input type="number" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" required placeholder="VD: 15000" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Các Vị / Tùy chọn (Tùy chọn)</label>
                <input type="text" value={productForm.variants} onChange={e => setProductForm({...productForm, variants: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" placeholder="Ngăn cách bằng dấu phẩy (VD: Cay, Không cay, Phô mai)" />
                <p className="text-xs text-gray-500 mt-1">Bỏ trống nếu sản phẩm không có tùy chọn vị.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link Ảnh (Tùy chọn)</label>
                <input type="url" value={productForm.image} onChange={e => setProductForm({...productForm, image: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" placeholder="https://..." />
              </div>

              <label className="flex items-center gap-2 cursor-pointer mt-2 bg-orange-50 p-3 rounded-lg border border-orange-100">
                <input type="checkbox" checked={productForm.isCombo} onChange={e => setProductForm({...productForm, isCombo: e.target.checked})} className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500" />
                <span className="text-sm font-medium text-orange-800">Đánh dấu là COMBO 🎁</span>
              </label>

              <button type="submit" className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-colors mt-4 ${isEditing ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/30' : 'bg-green-500 hover:bg-green-600 shadow-green-500/30'}`}>
                {isEditing ? 'LƯU THAY ĐỔI' : 'THÊM VÀO MENU'}
              </button>
            </form>
          </div>

          {/* DANH SÁCH SẢN PHẨM ĐANG BÁN */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-bold text-gray-800 text-lg mb-4">Các món đang bán trên Web ({products.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.length === 0 ? (
                <div className="sm:col-span-2 text-center py-10 bg-white rounded-xl border border-dashed border-gray-300 text-gray-500">
                  Chưa có sản phẩm nào. Hãy thêm ở form bên cạnh nhé!
                </div>
              ) : (
                products.map(product => (
                  <div key={product.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
                    <img src={product.image || `https://ui-avatars.com/api/?name=${product.name}&background=Edf2f7&color=4A5568`} alt={product.name} className="w-20 h-20 rounded-lg object-cover bg-gray-50" />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-gray-800 line-clamp-1">{product.name}</h3>
                        {product.isCombo && <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-1.5 py-0.5 rounded">COMBO</span>}
                      </div>
                      <p className="text-green-600 font-bold text-sm mt-0.5">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                        {product.variants && product.variants.length > 0 ? `Vị: ${product.variants.join(', ')}` : 'Không có tùy chọn'}
                      </p>
                      
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => handleEditProduct(product)} className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold py-1.5 rounded flex justify-center items-center gap-1 transition-colors">
                          <Edit className="w-3 h-3"/> Sửa
                        </button>
                        <button onClick={() => handleDeleteProduct(product.id)} className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold py-1.5 rounded flex justify-center items-center gap-1 transition-colors">
                          <Trash2 className="w-3 h-3"/> Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}