import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  Package, DollarSign, Clock, ShoppingBag, Plus, Edit, Trash2, X, 
  Search, LayoutDashboard, Filter, TrendingUp, Image as ImageIcon, ExternalLink
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview'); 
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [productForm, setProductForm] = useState({ 
    name: '', price: '', description: '', image: '', inStock: true, isCombo: false, 
    variantsList: [] 
  });

  // ==========================================
  // DÁN 2 LINK GOOGLE SHEET CỦA BẠN VÀO ĐÂY
  // ==========================================
  const GOOGLE_SHEET_API_URL = "https://script.google.com/macros/s/AKfycbxQ9tjJ2odLUzyhWYNC2cMT-i-pppEwYfbHa-F16o4o7EAhRGA51B_JH4X5ZYXvyK-9/exec";
  const GOOGLE_SHEET_VIEW_URL = "https://docs.google.com/spreadsheets/d/1-CGudmwK19r_0d6GXnldiDq9ft15RMA079GsHggP7mo/edit?usp=sharing";

  useEffect(() => {
    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => { unsubOrders(); unsubProducts(); };
  }, []);

  // ==========================================
  // CẬP NHẬT TRẠNG THÁI (PHIÊN BẢN CHỐNG CACHE 100%)
  // ==========================================
  const handleUpdateStatus = async (order, newStatus) => {
    try {
      // 1. Cập nhật Firebase ngay lập tức cho web mượt
      await updateDoc(doc(db, 'orders', order.id), { 
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      // 2. Bắn sang Sheet với tuyệt chiêu chống Cache
      if (GOOGLE_SHEET_API_URL && GOOGLE_SHEET_API_URL.startsWith("http")) {
        // Gắn thêm một dãy số ngẫu nhiên vào đuôi link để trình duyệt tưởng đây là link mới
        const url = `${GOOGLE_SHEET_API_URL}?t=${Date.now()}`;
        
        await fetch(url, {
          method: "POST",
          mode: "no-cors",
          cache: "no-store", // Lệnh cấm trình duyệt lưu bộ nhớ tạm
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ 
            action: "UPDATE_STATUS", 
            orderId: String(order.orderId || order.id), // Đảm bảo luôn là chuỗi
            status: newStatus 
          })
        }).catch(e => console.log("Lỗi sync sheet âm thầm", e));
      }

      toast.success('Đã cập nhật trạng thái!');
    } catch (error) { 
      toast.error('Lỗi cập nhật trạng thái.'); 
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesFilter = filter === 'all' || o.status === filter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = o.customerName.toLowerCase().includes(searchLower) || 
                          o.phone.includes(searchLower) || 
                          o.id.toLowerCase().includes(searchLower) ||
                          (o.orderId && o.orderId.toLowerCase().includes(searchLower));
    return matchesFilter && matchesSearch;
  });

  const handleAddVariantRow = () => setProductForm(prev => ({...prev, variantsList: [...prev.variantsList, { name: '', image: '' }]}));
  const handleRemoveVariantRow = (index) => setProductForm(prev => ({...prev, variantsList: prev.variantsList.filter((_, i) => i !== index)}));
  const handleVariantChange = (index, field, value) => {
    const newList = [...productForm.variantsList];
    newList[index][field] = value;
    setProductForm(prev => ({ ...prev, variantsList: newList }));
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price) return toast.error('Vui lòng nhập tên và giá!');

    const validVariants = productForm.variantsList.filter(v => v.name.trim() !== '' || v.image.trim() !== '');
    const variantsArray = validVariants.map(v => v.name.trim());
    const variantImagesArray = validVariants.map(v => v.image.trim());

    const productData = {
      name: productForm.name,
      price: Number(productForm.price),
      description: productForm.description,
      image: productForm.image,
      inStock: productForm.inStock,
      isCombo: productForm.isCombo,
      variants: variantsArray,
      variantImages: variantImagesArray,
      updatedAt: serverTimestamp()
    };

    try {
      if (isEditing) {
        await updateDoc(doc(db, 'products', editingId), productData);
        toast.success('Cập nhật thành công!');
      } else {
        await addDoc(collection(db, 'products'), { ...productData, sold: 0 });
        toast.success('Đã thêm món mới!');
      }
      resetForm();
    } catch (error) { toast.error('Lỗi khi lưu!'); }
  };

  const resetForm = () => {
    setProductForm({ name: '', price: '', description: '', image: '', inStock: true, isCombo: false, variantsList: [] });
    setIsEditing(false);
    setEditingId(null);
  };

  if (loading) return <div className="text-center py-20 text-green-600 font-bold animate-pulse">Đang tải trung tâm quản trị...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6 px-4 sm:px-0">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-slate-500 font-medium mt-1">Quản lý tổng quan chiến dịch gây quỹ</p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-slate-200/50 rounded-2xl w-fit mx-4 sm:mx-0 overflow-x-auto max-w-full custom-scrollbar">
        {[
          { id: 'overview', icon: LayoutDashboard, label: 'Tổng quan' },
          { id: 'orders', icon: Package, label: 'Đơn hàng' },
          { id: 'products', icon: ShoppingBag, label: 'Sản phẩm' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-green-600 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}>
            <tab.icon className="w-5 h-5" /> {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ==================== TAB TỔNG QUAN ==================== */}
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 px-4 sm:px-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
                <div className="p-4 bg-green-50 text-green-600 rounded-2xl"><DollarSign className="w-8 h-8" /></div>
                <div>
                  <p className="text-slate-500 text-sm font-semibold mb-1">Doanh thu thực</p>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(orders.filter(o => o.status === 'done').reduce((a, b) => a + b.total, 0))}
                  </h3>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Package className="w-8 h-8" /></div>
                <div><p className="text-slate-500 text-sm font-semibold mb-1">Tổng đơn</p><h3 className="text-2xl font-extrabold text-slate-900">{orders.length}</h3></div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
                <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl"><Clock className="w-8 h-8" /></div>
                <div><p className="text-slate-500 text-sm font-semibold mb-1">Chờ xác nhận</p><h3 className="text-2xl font-extrabold text-slate-900">{orders.filter(o => o.status === 'pending').length}</h3></div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl"><TrendingUp className="w-8 h-8" /></div>
                <div><p className="text-slate-500 text-sm font-semibold mb-1">Đơn hủy</p><h3 className="text-2xl font-extrabold text-slate-900">{orders.filter(o => o.status === 'cancelled').length}</h3></div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==================== TAB ĐƠN HÀNG ==================== */}
        {activeTab === 'orders' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mx-4 sm:mx-0">
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row gap-4 justify-between items-center">
              <div className="relative w-full lg:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" placeholder="Tìm tên khách, SĐT, mã MHX..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 transition-all shadow-sm text-sm" />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full pl-10 pr-8 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 appearance-none font-medium text-slate-700 shadow-sm text-sm">
                    <option value="all">Tất cả trạng thái</option><option value="pending">Chờ xác nhận</option><option value="confirmed">Đã xác nhận</option><option value="shipping">Đang giao</option><option value="done">Hoàn thành</option><option value="cancelled">Đã hủy</option>
                  </select>
                </div>
                
                {/* ĐÃ SỬA: CHỈ HIỂN THỊ NÚT XEM FILE LIVE SHEET */}
                <a href={GOOGLE_SHEET_VIEW_URL} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-md">
                  <ExternalLink className="w-5 h-5" /> <span className="text-sm">Mở File Live</span>
                </a>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead><tr className="bg-white border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider font-bold"><th className="p-5">Khách hàng</th><th className="p-5">Chi tiết đơn</th><th className="p-5">Thanh toán</th><th className="p-5">Trạng thái</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredOrders.length === 0 ? (<tr><td colSpan="4" className="p-10 text-center text-slate-400 font-medium">Không tìm thấy đơn hàng nào phù hợp.</td></tr>) : (
                    filteredOrders.map(order => (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-5 align-top">
                          <p className="font-bold text-slate-900 text-base">{order.customerName}</p>
                          <p className="text-[11px] font-bold text-blue-600 bg-blue-50 w-fit px-2 py-0.5 rounded-md mt-1 border border-blue-100">
                            {order.orderId || order.id}
                          </p>
                          <p className="text-slate-500 font-medium text-sm mt-1">{order.phone}</p>
                          <p className="text-slate-400 text-xs mt-2 max-w-[200px] leading-relaxed">{order.address}</p>
                        </td>
                        <td className="p-5 align-top max-w-xs">
                          <ul className="space-y-1.5 text-sm">{order.items.map((item, idx) => (<li key={idx} className="text-slate-700"><span className="font-bold text-slate-900">{item.quantity}x</span> {item.name} {item.variant && <span className="text-slate-400">({item.variant})</span>}</li>))}</ul>
                          {order.notes && <p className="mt-3 text-xs text-orange-700 bg-orange-50 p-2 rounded-lg border border-orange-100"><span className="font-bold">Ghi chú:</span> {order.notes}</p>}
                          {order.referrer && <p className="mt-2 text-xs text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-100"><span className="font-bold">Mã GT:</span> {order.referrer}</p>}
                        </td>
                        <td className="p-5 align-top">
                          <p className="font-bold text-green-600 text-lg">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total)}</p>
                          <div className="mt-2 flex flex-col gap-1.5 items-start">
                             <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${order.paymentMethod === 'COD' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-600'}`}>{order.paymentMethod}</span>
                             <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-md ${order.shippingFee === 'Miễn phí' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>Ship: {order.shippingFee || 'Chưa rõ'}</span>
                          </div>
                          {order.proofLink && <a href={order.proofLink} target="_blank" rel="noreferrer" className="block mt-2 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3"/> Xem bill CK</a>}
                        </td>
                        <td className="p-5 align-top">
                          {order.status === 'cancelled' ? (
                            <div><span className="inline-block bg-red-100 text-red-700 text-xs rounded-full px-3 py-1 font-bold">Đã hủy</span>{order.cancelReason && <p className="text-xs text-red-600 mt-2 leading-relaxed max-w-[150px]"><span className="font-bold">Lý do:</span> {order.cancelReason}</p>}</div>
                          ) : (
                            <select value={order.status} onChange={(e) => handleUpdateStatus(order, e.target.value)} className={`text-sm rounded-xl px-4 py-2 font-bold outline-none cursor-pointer border-2 transition-all appearance-none pr-8 ${order.status === 'pending' ? 'border-orange-200 bg-orange-50 text-orange-700' : ''} ${order.status === 'done' ? 'border-green-200 bg-green-50 text-green-700' : ''} ${order.status === 'shipping' ? 'border-purple-200 bg-purple-50 text-purple-700' : ''} ${order.status === 'confirmed' ? 'border-blue-200 bg-blue-50 text-blue-700' : ''}`}>
                              <option value="pending">Chờ xác nhận</option><option value="confirmed">Đã xác nhận</option><option value="shipping">Đang giao</option><option value="done">Hoàn thành</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ==================== TAB SẢN PHẨM ==================== */}
        {activeTab === 'products' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 sm:px-0">
            <div className="lg:col-span-1 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 h-fit sticky top-24">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                {isEditing ? <Edit className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-green-500" />}
                {isEditing ? 'Chỉnh sửa món' : 'Thêm món mới'}
              </h2>
              <form onSubmit={handleSaveProduct} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Tên sản phẩm</label>
                  <input type="text" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all" placeholder="VD: Bánh tráng nướng" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Giá bán (đ)</label>
                    <input type="number" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none" placeholder="20000" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Trạng thái</label>
                    <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer transition-colors hover:border-green-300">
                      <input type="checkbox" checked={productForm.inStock} onChange={e => setProductForm({...productForm, inStock: e.target.checked})} className="w-5 h-5 text-green-500 rounded focus:ring-green-500 border-slate-300" />
                      <span className={`text-sm font-bold ${productForm.inStock ? 'text-green-600' : 'text-red-500'}`}>{productForm.inStock ? 'Đang bán' : 'Hết hàng'}</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Mô tả chi tiết</label>
                  <textarea value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none min-h-[100px]" placeholder="Nguyên liệu, hương vị..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Link Ảnh chính</label>
                  <div className="flex gap-2">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden">
                      {productForm.image ? <img src={productForm.image} className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-slate-400" />}
                    </div>
                    <input type="url" value={productForm.image} onChange={e => setProductForm({...productForm, image: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none text-sm" placeholder="https://..." />
                  </div>
                </div>
                <div className="p-4 bg-green-50/50 rounded-2xl border border-green-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-extrabold text-green-700 uppercase tracking-widest">Phân loại / Vị / Màu sắc</p>
                    <button type="button" onClick={handleAddVariantRow} className="text-xs font-bold text-green-600 hover:text-green-800 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"><Plus className="w-3 h-3" /> Thêm loại</button>
                  </div>
                  {productForm.variantsList.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-2 italic">Chưa có phân loại nào.</p>
                  ) : (
                    <div className="space-y-3">
                      {productForm.variantsList.map((item, index) => (
                        <div key={index} className="flex gap-2 items-start bg-white p-2 rounded-xl border border-green-200/60 shadow-sm relative group">
                          <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden">
                            {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 text-slate-300" />}
                          </div>
                          <div className="flex-1 space-y-2">
                            <input type="text" value={item.name} onChange={e => handleVariantChange(index, 'name', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-green-400 text-sm font-semibold text-slate-700" placeholder="Tên vị..." />
                            <input type="url" value={item.image} onChange={e => handleVariantChange(index, 'image', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-green-400 text-xs text-slate-600" placeholder="Link ảnh..." />
                          </div>
                          <button type="button" onClick={() => handleRemoveVariantRow(index)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-3 p-3 bg-orange-50 rounded-2xl border border-orange-100 cursor-pointer group mt-2">
                  <input type="checkbox" checked={productForm.isCombo} onChange={e => setProductForm({...productForm, isCombo: e.target.checked})} className="w-5 h-5 text-orange-500 rounded-lg focus:ring-orange-500 border-orange-300" />
                  <span className="text-sm font-bold text-orange-800 group-hover:text-orange-600">Đánh dấu là COMBO 🎁</span>
                </label>
                <div className="flex gap-2 pt-2">
                  {isEditing && <button type="button" onClick={resetForm} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">Hủy</button>}
                  <button type="submit" className={`flex-[2] py-4 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2 ${isEditing ? 'bg-blue-500 shadow-blue-500/30' : 'bg-green-500 shadow-green-500/30'}`}>
                    {isEditing ? 'CẬP NHẬT' : <><Plus className="w-5 h-5"/> THÊM MÓN</>}
                  </button>
                </div>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center mb-2"><h2 className="font-bold text-slate-800 text-lg">Menu hiện tại ({products.length})</h2></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.map(product => (
                  <div key={product.id} className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex gap-4 group hover:shadow-soft transition-all">
                    <div className="relative">
                      <img src={product.image} className="w-24 h-24 rounded-2xl object-cover bg-slate-50" />
                      {product.isCombo && <span className="absolute -top-2 -left-2 bg-orange-500 text-white text-[8px] font-bold px-2 py-1 rounded-full shadow-md">COMBO</span>}
                    </div>
                    <div className="flex-1 flex flex-col">
                      <h3 className="font-bold text-slate-800 line-clamp-1">{product.name}</h3>
                      <p className="text-green-600 font-extrabold text-lg">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}</p>
                      <p className="text-xs mt-1">
                        <span className={`font-bold ${product.inStock !== false ? 'text-green-600' : 'text-red-500'}`}>{product.inStock !== false ? '• Còn hàng' : '• Hết hàng'}</span> 
                        <span className="text-slate-400 font-medium ml-2">| Đã bán: {product.sold || 0}</span>
                      </p>
                      <div className="flex gap-2 mt-auto pt-2">
                        <button onClick={() => {
                            const loadedVariantsList = (product.variants || []).map((v, idx) => ({ name: v, image: (product.variantImages && product.variantImages[idx]) ? product.variantImages[idx] : '' }));
                            setProductForm({ ...product, variantsList: loadedVariantsList });
                            setIsEditing(true); setEditingId(product.id);
                          }} className="flex-1 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600 text-xs font-bold py-2 rounded-xl transition-all">Sửa</button>
                        <button onClick={() => { if(window.confirm('Xóa món này?')) deleteDoc(doc(db, 'products', product.id)) }} className="px-3 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}