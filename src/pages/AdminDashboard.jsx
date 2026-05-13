import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { 
  collection, query, orderBy, onSnapshot, doc, 
  updateDoc, addDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  Package, DollarSign, Clock, ShoppingBag, Plus, Edit, Trash2, X, 
  Search, LayoutDashboard, Filter, TrendingUp, Image as ImageIcon, 
  ExternalLink, Users, Award, Check, Loader2
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview'); 
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [ctvs, setCtvs] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [productForm, setProductForm] = useState({ 
    name: '', price: '', description: '', image: '', inStock: true, isCombo: false, 
    variantsList: [] 
  });

  const [newCtvEmail, setNewCtvEmail] = useState('');
  const [newCtvName, setNewCtvName] = useState(''); 
  const [editingCtvId, setEditingCtvId] = useState(null);
  const [editCtvName, setEditCtvName] = useState('');

  // Link xem Google Sheet (Link View công khai hoặc nội bộ)
  const GOOGLE_SHEET_VIEW_URL = import.meta.env.VITE_GOOGLE_SHEET_VIEW_URL || "#";

  useEffect(() => {
    // Lắng nghe đơn hàng thời gian thực
    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Lắng nghe sản phẩm
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // Lắng nghe CTV
    const unsubCtvs = onSnapshot(collection(db, 'ctvs'), (snapshot) => {
      setCtvs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubOrders(); unsubProducts(); unsubCtvs(); };
  }, []);

  // ==========================================
  // XỬ LÝ CẬP NHẬT TRẠNG THÁI QUA BACKEND (api/update-order.js)
  // ==========================================
  const handleUpdateStatus = async (order, newStatus) => {
    let reason = order.cancelReason || '';
    
    if (newStatus === 'cancelled' && order.status !== 'cancelled') {
      const input = window.prompt("Vui lòng nhập lý do hủy đơn (VD: Hết món, khách bom...):", "");
      if (input === null) return; 
      reason = input.trim() || 'Admin hủy đơn';
    }

    setIsSyncing(true);
    try {
      const response = await fetch('/api/update-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId || order.id,
          documentId: order.id, 
          newStatus: newStatus,
          cancelReason: reason,
          isAdmin: true 
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Cập nhật trạng thái thành công!');
      } else {
        toast.error(result.message || 'Lỗi cập nhật đơn hàng!');
      }
    } catch (error) {
      console.error(error);
      toast.error('Mất kết nối với máy chủ Backend!');
    } finally {
      setIsSyncing(false); 
    }
  };

  // ==========================================
  // QUẢN LÝ CỘNG TÁC VIÊN
  // ==========================================
  const handleAddCTV = async (e) => {
    e.preventDefault();
    if (!newCtvEmail.trim() || !newCtvName.trim()) return;
    try {
      await addDoc(collection(db, 'ctvs'), { 
        email: newCtvEmail.trim().toLowerCase(),
        name: newCtvName.trim(), 
        createdAt: serverTimestamp() 
      });
      setNewCtvEmail(''); setNewCtvName('');
      toast.success('Đã thêm CTV mới!');
    } catch (error) { toast.error('Lỗi khi thêm CTV!'); }
  };

  const handleSaveEditCTV = async (ctvId) => {
    if (!editCtvName.trim()) return;
    try {
      await updateDoc(doc(db, 'ctvs', ctvId), { name: editCtvName.trim() });
      setEditingCtvId(null);
      toast.success('Cập nhật tên CTV thành công!');
    } catch (error) { toast.error('Lỗi cập nhật!'); }
  };

  // ==========================================
  // QUẢN LÝ SẢN PHẨM & BIẾN THỂ
  // ==========================================
  const handleAddVariantRow = () => setProductForm(prev => ({...prev, variantsList: [...prev.variantsList, { name: '', image: '', price: '' }]}));
  const handleRemoveVariantRow = (index) => setProductForm(prev => ({...prev, variantsList: prev.variantsList.filter((_, i) => i !== index)}));
  
  const handleVariantChange = (index, field, value) => {
    const newList = [...productForm.variantsList]; 
    newList[index][field] = value;
    setProductForm(prev => ({ ...prev, variantsList: newList }));
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price) return toast.error('Vui lòng nhập tên và giá gốc!');

    const validVariants = productForm.variantsList.filter(v => v.name.trim() !== '');
    
    const productData = {
      name: productForm.name, 
      price: Number(productForm.price), 
      description: productForm.description, 
      image: productForm.image, 
      inStock: productForm.inStock, 
      isCombo: productForm.isCombo, // Truyền biến isCombo vào Database
      variants: validVariants.map(v => v.name.trim()), 
      variantImages: validVariants.map(v => v.image.trim()), 
      variantPrices: validVariants.map(v => Number(v.price) || Number(productForm.price)), 
      updatedAt: serverTimestamp()
    };

    try {
      if (isEditing) { 
        await updateDoc(doc(db, 'products', editingId), productData); 
        toast.success('Cập nhật sản phẩm thành công!'); 
      } else { 
        await addDoc(collection(db, 'products'), { ...productData, sold: 0 }); 
        toast.success('Đã thêm món mới vào Menu!'); 
      }
      resetForm();
    } catch (error) { toast.error('Lỗi khi lưu sản phẩm!'); }
  };

  const resetForm = () => {
    setProductForm({ name: '', price: '', description: '', image: '', inStock: true, isCombo: false, variantsList: [] }); 
    setIsEditing(false); setEditingId(null);
  };

  // Bộ lọc tìm kiếm đơn hàng
  const filteredOrders = orders.filter(o => {
    const matchesFilter = filter === 'all' || o.status === filter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      o.customerName?.toLowerCase().includes(searchLower) || 
      o.phone?.includes(searchLower) || 
      (o.orderId && o.orderId.toLowerCase().includes(searchLower)) ||
      (o.referrer && o.referrer.toLowerCase().includes(searchLower));
    return matchesFilter && matchesSearch;
  });

  if (loading) return <div className="text-center py-20 text-green-600 font-bold animate-pulse">Đang tải dữ liệu quản trị...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20 relative">
      
      {/* Overlay khóa màn hình khi đang đồng bộ */}
      <AnimatePresence>
        {isSyncing && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] z-[9999] flex flex-col items-center justify-center text-white"
          >
            <div className="bg-white p-8 rounded-3xl flex flex-col items-center shadow-2xl text-center">
              <Loader2 className="w-12 h-12 text-green-500 animate-spin mb-4" />
              <p className="text-slate-800 font-bold text-lg">Đang xử lý Backend...</p>
              <p className="text-slate-500 text-sm mt-1">Vui lòng giữ kết nối internet</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6 px-4 sm:px-0">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-slate-500 font-medium mt-1">Hệ thống quản trị chiến dịch Mùa Hè Xanh</p>
        </div>
      </div>

      {/* Thanh điều hướng Tab */}
      <div className="flex gap-2 p-1 bg-slate-200/50 rounded-2xl w-fit mx-4 sm:mx-0 overflow-x-auto max-w-full custom-scrollbar">
        {[
          { id: 'overview', icon: LayoutDashboard, label: 'Tổng quan' },
          { id: 'orders', icon: Package, label: 'Đơn hàng' },
          { id: 'products', icon: ShoppingBag, label: 'Sản phẩm' },
          { id: 'ctv', icon: Users, label: 'CTV' }
        ].map(tab => (
          <button 
            key={tab.id} onClick={() => setActiveTab(tab.id)} 
            className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-green-600 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}
          >
            <tab.icon className="w-5 h-5" /> {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        
        {/* --- TAB TỔNG QUAN --- */}
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 px-4 sm:px-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
                <div className="p-4 bg-green-50 text-green-600 rounded-2xl"><DollarSign className="w-8 h-8" /></div>
                <div><p className="text-slate-500 text-sm font-semibold mb-1">Doanh thu thực</p><h3 className="text-xl font-extrabold text-slate-900">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(orders.filter(o => o.status === 'done').reduce((a, b) => a + (b.total || 0), 0))}</h3></div>
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

        {/* --- TAB CTV --- */}
        {activeTab === 'ctv' && (
          <motion.div key="ctv" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 px-4 sm:px-0">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Award className="w-6 h-6 text-orange-500" /> Quản lý Cộng Tác Viên</h2>
                <p className="text-sm text-slate-500 mt-1">Gán Email Google của CTV để hệ thống tự nhận diện.</p>
              </div>
              <form onSubmit={handleAddCTV} className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
                <input type="email" value={newCtvEmail} onChange={(e) => setNewCtvEmail(e.target.value)} placeholder="Email Google của CTV..." className="w-full sm:w-56 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm" required />
                <input type="text" value={newCtvName} onChange={(e) => setNewCtvName(e.target.value)} placeholder="Họ và Tên CTV..." className="w-full sm:w-56 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm" required />
                <button type="submit" className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all">Thêm</button>
              </form>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase font-bold">
                      <th className="p-5">Thông tin CTV</th><th className="p-5 text-center">Đơn chờ/giao</th><th className="p-5 text-center">Đơn thành công</th><th className="p-5 text-right">Doanh thu</th><th className="p-5 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {ctvs.map(ctv => {
                      const ctvOrders = orders.filter(o => o.referrer && o.referrer.toLowerCase() === ctv.name.toLowerCase());
                      const doneOrders = ctvOrders.filter(o => o.status === 'done');
                      const revenue = doneOrders.reduce((sum, o) => sum + (o.total || 0), 0);
                      return (
                        <tr key={ctv.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-5">
                            <p className="font-bold text-slate-900 text-sm">{ctv.email}</p>
                            {editingCtvId === ctv.id ? (
                              <div className="flex items-center gap-2 mt-2">
                                <input type="text" value={editCtvName} onChange={(e) => setEditCtvName(e.target.value)} className="p-1.5 border rounded-lg text-sm w-40" />
                                <button onClick={() => handleSaveEditCTV(ctv.id)} className="p-1.5 bg-green-100 text-green-700 rounded-lg"><Check className="w-4 h-4"/></button>
                                <button onClick={() => setEditingCtvId(null)} className="p-1.5 bg-slate-100 text-slate-600 rounded-lg"><X className="w-4 h-4"/></button>
                              </div>
                            ) : (
                              <p className="text-orange-600 font-bold text-sm">Họ Tên: {ctv.name}</p>
                            )}
                          </td>
                          <td className="p-5 text-center">{ctvOrders.length - doneOrders.length}</td>
                          <td className="p-5 text-center font-bold text-green-600">{doneOrders.length}</td>
                          <td className="p-5 text-right font-extrabold">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(revenue)}</td>
                          <td className="p-5 text-center">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => { setEditingCtvId(ctv.id); setEditCtvName(ctv.name); }} className="p-2 text-blue-600 bg-blue-50 rounded-lg"><Edit className="w-4 h-4"/></button>
                              <button onClick={() => { if(window.confirm('Xóa CTV này?')) deleteDoc(doc(db, 'ctvs', ctv.id)) }} className="p-2 text-red-600 bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* --- TAB ĐƠN HÀNG --- */}
        {activeTab === 'orders' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mx-4 sm:mx-0">
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row gap-4 justify-between items-center">
              <div className="relative w-full lg:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" placeholder="Tìm tên, SĐT, mã đơn, CTV..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-sm" />
              </div>
              <div className="flex gap-3 w-full lg:w-auto">
                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="flex-1 lg:w-48 p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 font-medium text-sm">
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Chờ xác nhận</option>
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="shipping">Đang giao</option>
                  <option value="done">Hoàn thành</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
                <a href={GOOGLE_SHEET_VIEW_URL} target="_blank" rel="noreferrer" className="p-3 bg-green-600 text-white rounded-xl flex items-center gap-2 hover:bg-green-700 transition-all">
                  <ExternalLink className="w-5 h-5" /> <span className="hidden sm:inline">Mở Sheet</span>
                </a>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead><tr className="bg-white border-b text-xs text-slate-400 uppercase font-bold"><th className="p-5">Khách hàng</th><th className="p-5">Chi tiết đơn</th><th className="p-5">Thanh toán</th><th className="p-5">Trạng thái</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-5 align-top">
                        <p className="font-bold text-slate-900">{order.customerName}</p>
                        <p className="text-[11px] font-bold text-blue-600 bg-blue-50 w-fit px-2 py-0.5 rounded mt-1">{order.orderId || order.id}</p>
                        <p className="text-slate-500 text-sm mt-1">{order.phone}</p>
                        <p className="text-slate-400 text-xs mt-2 max-w-[200px]">{order.address}</p>
                      </td>
                      <td className="p-5 align-top">
                        <ul className="space-y-1 text-sm">
                          {order.items?.map((item, idx) => (
                            <li key={idx}><span className="font-bold">{item.quantity}x</span> {item.name} {item.variant && `(${item.variant})`}</li>
                          ))}
                        </ul>
                        {order.notes && <p className="mt-2 text-xs text-orange-700 bg-orange-50 p-2 rounded-lg">Lưu ý: {order.notes}</p>}
                        {order.referrer && <p className="mt-2 text-xs text-blue-600 font-semibold italic">Giới thiệu: {order.referrer}</p>}
                      </td>
                      <td className="p-5 align-top">
                        <p className="font-bold text-green-600 text-lg">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total)}</p>
                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 uppercase">{order.paymentMethod}</span>
                        {order.proofLink && <a href={order.proofLink} target="_blank" rel="noreferrer" className="block mt-2 text-xs text-blue-600 underline">Xem Bill CK</a>}
                      </td>
                      <td className="p-5 align-top">
                        <select 
                          value={order.status} 
                          onChange={(e) => handleUpdateStatus(order, e.target.value)} 
                          className={`text-sm rounded-xl px-4 py-2 font-bold outline-none border-2 transition-all ${
                            order.status === 'pending' ? 'border-orange-200 bg-orange-50 text-orange-700' :
                            order.status === 'done' ? 'border-green-200 bg-green-50 text-green-700' :
                            order.status === 'shipping' ? 'border-purple-200 bg-purple-50 text-purple-700' :
                            order.status === 'confirmed' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                            'border-red-200 bg-red-50 text-red-700'
                          }`}
                        >
                          <option value="pending">Chờ xác nhận</option>
                          <option value="confirmed">Đã xác nhận</option>
                          <option value="shipping">Đang giao</option>
                          <option value="done">Hoàn thành</option>
                          <option value="cancelled">Hủy đơn</option>
                        </select>
                        {order.status === 'cancelled' && order.cancelReason && (
                          <p className="text-[11px] text-red-500 mt-2 italic">Lý do: {order.cancelReason}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* --- TAB SẢN PHẨM --- */}
        {activeTab === 'products' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 sm:px-0">
            
            <div className="lg:col-span-1 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 h-fit sticky top-24">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                {isEditing ? <Edit className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-green-500" />}
                {isEditing ? 'Chỉnh sửa món' : 'Thêm món mới'}
              </h2>
              <form onSubmit={handleSaveProduct} className="space-y-4">
                <input type="text" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-2xl outline-none" placeholder="Tên sản phẩm..." required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-2xl outline-none" placeholder="Giá gốc (đ)..." required />
                  <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border cursor-pointer">
                    <input type="checkbox" checked={productForm.inStock} onChange={e => setProductForm({...productForm, inStock: e.target.checked})} />
                    <span className="text-sm font-bold">Còn hàng</span>
                  </label>
                </div>

                {/* --- FIX 1: NÚT ĐÁNH DẤU COMBO ĐƯỢC BỔ SUNG VÀO ĐÂY --- */}
                <label className="flex items-center gap-3 p-3 bg-orange-50 rounded-2xl border border-orange-100 cursor-pointer hover:bg-orange-100 transition-colors">
                  <input type="checkbox" checked={productForm.isCombo || false} onChange={e => setProductForm({...productForm, isCombo: e.target.checked})} className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500" />
                  <span className="text-sm font-bold text-orange-800">Đánh dấu đây là Combo 🎁</span>
                </label>

                <textarea value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-2xl outline-none min-h-[80px]" placeholder="Mô tả..." />
                <input type="url" value={productForm.image} onChange={e => setProductForm({...productForm, image: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-2xl outline-none" placeholder="Link ảnh..." />
                
                {/* Khu vực Nhập Phân loại */}
                <div className="p-4 bg-green-50/50 rounded-2xl border border-green-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-extrabold text-green-700 uppercase">Phân loại / Vị</p>
                    <button type="button" onClick={handleAddVariantRow} className="text-xs font-bold text-green-600 bg-green-100 px-3 py-1.5 rounded-lg">+ Thêm loại</button>
                  </div>
                  {productForm.variantsList.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start bg-white p-3 rounded-xl border border-green-200/60 shadow-sm">
                      <div className="flex-1 space-y-2">
                        <input type="text" value={item.name} onChange={e => handleVariantChange(index, 'name', e.target.value)} className="w-full p-2 bg-slate-50 rounded-lg outline-none text-sm font-semibold" placeholder="Tên vị..." />
                        <input type="number" value={item.price} onChange={e => handleVariantChange(index, 'price', e.target.value)} className="w-full p-2 bg-slate-50 rounded-lg outline-none text-sm" placeholder="Giá riêng (nếu có)..." />
                      </div>
                      <button type="button" onClick={() => handleRemoveVariantRow(index)} className="p-2 text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2 pt-2">
                  {isEditing && <button type="button" onClick={resetForm} className="flex-1 py-4 bg-slate-100 rounded-2xl font-bold">Hủy</button>}
                  <button type="submit" className={`flex-[2] py-4 rounded-2xl font-bold text-white shadow-lg ${isEditing ? 'bg-blue-500' : 'bg-green-500'}`}>
                    {isEditing ? 'CẬP NHẬT' : 'THÊM MÓN'}
                  </button>
                </div>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h2 className="font-bold text-slate-800 text-lg">Menu hiện tại ({products.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.map(product => (
                  <div key={product.id} className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex gap-4 group">
                    
                    {/* --- FIX 2: KHUNG ẢNH ĐƯỢC ÉP HÌNH VUÔNG CHUẨN XÁC --- */}
                    <div className="w-24 h-24 shrink-0 relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 aspect-square">
                      <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
                      {product.isCombo && (
                        <span className="absolute top-1 left-1 bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm z-10">
                          COMBO
                        </span>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col">
                      <h3 className="font-bold text-slate-800 line-clamp-1">{product.name}</h3>
                      <p className="text-green-600 font-extrabold text-lg">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}</p>
                      <p className="text-xs">
                        <span className={`font-bold ${product.inStock ? 'text-green-600' : 'text-red-500'}`}>{product.inStock ? '• Còn hàng' : '• Hết hàng'}</span> 
                        <span className="text-slate-400 ml-2">| Đã bán: {product.sold || 0}</span>
                      </p>
                      <div className="flex gap-2 mt-auto pt-2">
                        <button onClick={() => {
                            const loadedVariantsList = (product.variants || []).map((v, idx) => ({ 
                              name: v, 
                              image: (product.variantImages && product.variantImages[idx]) || '',
                              price: (product.variantPrices && product.variantPrices[idx]) || product.price
                            }));
                            setProductForm({ ...product, isCombo: product.isCombo || false, variantsList: loadedVariantsList });
                            setIsEditing(true); setEditingId(product.id);
                          }} className="flex-1 bg-blue-50 text-blue-600 text-xs font-bold py-2 rounded-xl">Sửa</button>
                        <button onClick={() => { if(window.confirm('Xóa món này?')) deleteDoc(doc(db, 'products', product.id)) }} className="px-3 bg-red-50 text-red-400 rounded-xl"><Trash2 className="w-4 h-4"/></button>
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