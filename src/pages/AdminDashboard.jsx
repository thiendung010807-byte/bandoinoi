import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { 
  collection, query, orderBy, onSnapshot, doc, 
  updateDoc, addDoc, deleteDoc, getDocs, where, serverTimestamp, limit 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  Package, DollarSign, Clock, ShoppingBag, Plus, Edit, Trash2, X, 
  Search, LayoutDashboard, Filter, TrendingUp, Image as ImageIcon, 
  ExternalLink, Users, Award, Check, Loader2, UploadCloud
} from 'lucide-react';
import imageCompression from 'browser-image-compression'; 
import { useAuth } from '../contexts/AuthContext'; // Thêm import này để lấy email admin đang thao tác

// Danh sách các danh mục có thể chọn
const AVAILABLE_CATEGORIES = [
  { id: 'thbn', label: 'Tự hào Bắc Ninh' },
  { id: 'combo', label: 'Combo tiết kiệm' },
  { id: 'monle', label: 'Món lẻ' },
  { id: 'quanho', label: 'Mâm lễ Quan họ' }
];

// ==================================================
// HÀM BỔ TRỢ ĐỊNH DẠNG THỜI GIAN (MỚI THÊM)
// ==================================================
// Định dạng Timestamp từ Firestore thành chuỗi HH:mm DD/MM/YYYY
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '---';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return '---';
  }
};

// Định dạng chuỗi datetime-local (YYYY-MM-DDTHH:mm) thành HH:mm DD/MM/YYYY
const formatDeliveryTime = (timeStr) => {
  if (!timeStr) return '---';
  try {
    const [datePart, timePart] = timeStr.split('T');
    if (!datePart) return timeStr;
    const [year, month, day] = datePart.split('-');
    return `${timePart || '00:00'} ${day}/${month}/${year}`;
  } catch (e) {
    return timeStr.replace('T', ' ');
  }
};

export default function AdminDashboard() {
  const { currentUser } = useAuth(); // Lấy thông tin user hiện tại
  
  const [activeTab, setActiveTab] = useState('overview'); 
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [ctvs, setCtvs] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingCtv, setIsSyncingCtv] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false); 

  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderLimit, setOrderLimit] = useState(50); // 30 chỉnh lên 50
  const [sortBy, setSortBy] = useState('createdAt'); // Thêm state quản lý sắp xếp
  const [hasMoreOrders, setHasMoreOrders] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // State quản lý Form sản phẩm (Sử dụng mảng categories)
  const [productForm, setProductForm] = useState({ 
    name: '', price: '', description: '', image: '', inStock: true, 
    categories: ['monle'], 
    customTag: '',
    variantsList: [] 
  });

  const [newCtvEmail, setNewCtvEmail] = useState('');
  const [newCtvName, setNewCtvName] = useState(''); 
  const [editingCtvId, setEditingCtvId] = useState(null);
  const [editCtvName, setEditCtvName] = useState('');

  const GOOGLE_SHEET_VIEW_URL = import.meta.env.VITE_GOOGLE_SHEET_VIEW_URL || "#";

  // ==================================================
  // HÀM GHI LOG ÂM THẦM 
  // ==================================================
  const logAction = async (actionName, detailsObj) => {
    try {
      await addDoc(collection(db, 'admin_logs'), {
        adminEmail: currentUser?.email || 'unknown_admin',
        action: actionName,
        details: detailsObj,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Lỗi ghi log âm thầm:", error);
    }
  };

useEffect(() => {
    let qOrders;
    if (sortBy === 'createdAt') {
      qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(orderLimit));
    } else {
      qOrders = query(collection(db, 'orders'), orderBy('deliveryTime', 'desc'), limit(orderLimit));
    }
    
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      if (snapshot.docs.length < orderLimit) setHasMoreOrders(false);
      else setHasMoreOrders(true);
    });
    return () => unsubOrders();
  }, [orderLimit, sortBy]);

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    const unsubCtvs = onSnapshot(collection(db, 'ctvs'), (snapshot) => {
      setCtvs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubProducts(); unsubCtvs(); };
  }, []);
  
  const handleLoadMore = () => {
    setOrderLimit(prevLimit => prevLimit + 50);
    logAction('[TÌM KIẾM] Tải thêm đơn hàng cũ', { newLimit: orderLimit + 50 }); 
  }; 
  
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
          isAdmin: true,
          adminEmail: currentUser?.email // Truyền email admin lên serverless function để ghi log bên Backend
        })
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Cập nhật trạng thái thành công!');
        // Đã chuyển phần log xử lý đơn sang Backend (api/update-order.js) cho chuẩn quy trình
      } else {
        toast.error(result.message || 'Lỗi cập nhật đơn hàng!');
      }
    } catch (error) { toast.error('Mất kết nối với máy chủ!'); } 
    finally { setIsSyncing(false); }
  };

  const handleAddCTV = async (e) => {
    e.preventDefault();
    if (!newCtvEmail.trim() || !newCtvName.trim()) return;
    try {
      await addDoc(collection(db, 'ctvs'), { email: newCtvEmail.trim().toLowerCase(), name: newCtvName.trim(), createdAt: serverTimestamp() });
      
      // Ghi log Thêm CTV
      logAction('[CTV] Thêm mới', { email: newCtvEmail.trim(), name: newCtvName.trim() });
      
      setNewCtvEmail(''); setNewCtvName(''); toast.success('Đã thêm CTV!');
    } catch (error) { toast.error('Lỗi thêm CTV!'); }
  };

  const handleSaveEditCTV = async (ctvId) => {
    if (!editCtvName.trim()) return;
    try {
      await updateDoc(doc(db, 'ctvs', ctvId), { name: editCtvName.trim() });
      
      // Ghi log Đổi tên CTV
      logAction('[CTV] Đổi tên', { ctvId: ctvId, newName: editCtvName.trim() });
      
      setEditingCtvId(null); toast.success('Đã cập nhật tên CTV!');
    } catch (error) { toast.error('Lỗi cập nhật!'); }
  };

  const handleSyncCtvRevenue = async () => {
    setIsSyncingCtv(true);
    const toastId = toast.loading('Đang quét toàn bộ dữ liệu để tính toán...');
    try {
      const q = query(collection(db, 'orders'), where('status', '==', 'done'));
      const snapshot = await getDocs(q);
      const stats = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const refName = (data.referrer || '').trim().toLowerCase();
        if (refName) {
          if (!stats[refName]) stats[refName] = { count: 0, revenue: 0 };
          stats[refName].count += 1;
          stats[refName].revenue += (data.total || 0);
        }
      });
      const updatePromises = ctvs.map(ctv => {
        const ctvName = (ctv.name || '').trim().toLowerCase();
        const ctvStats = stats[ctvName] || { count: 0, revenue: 0 };
        return updateDoc(doc(db, 'ctvs', ctv.id), { successOrders: ctvStats.count, totalRevenue: ctvStats.revenue, lastSynced: serverTimestamp() });
      });
      await Promise.all(updatePromises);
            // logAction('[HỆ THỐNG] Tính lại doanh thu CTV', { totalCtvsUpdated: ctvs.length });
      
      toast.success('Đã cập nhật doanh thu mới nhất cho tất cả CTV!', { id: toastId });
    } catch (error) { toast.error('Lỗi khi tính toán doanh thu!', { id: toastId }); } 
    finally { setIsSyncingCtv(false); }
  };
   
  const handleImageUpload = async (file, isVariant = false, variantIndex = null) => {
    if (!file) return;
    setIsUploadingImage(true);
    const toastId = toast.loading('Đang nén và tải ảnh lên...');
    try {
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('upload_preset', uploadPreset);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Không thể tải ảnh lên Cloudinary");
      const cloudData = await res.json();
      const optimizedUrl = cloudData.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');

      if (isVariant && variantIndex !== null) handleVariantChange(variantIndex, 'image', optimizedUrl);
      else setProductForm(prev => ({ ...prev, image: optimizedUrl }));
      logAction('[ẢNH] Tải lên Cloudinary thành công', { url: optimizedUrl, isVariant });
      
      toast.success('Tải ảnh thành công!', { id: toastId });
    } catch (error) { toast.error('Lỗi khi tải ảnh lên. Hãy thử lại!', { id: toastId }); } 
    finally { setIsUploadingImage(false); }
  };

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
    if (!productForm.image) return toast.error('Vui lòng tải lên ảnh sản phẩm!');
    // Yêu cầu chọn ít nhất 1 danh mục
    if (!productForm.categories || productForm.categories.length === 0) return toast.error('Vui lòng chọn ít nhất 1 danh mục!');

    const validVariants = productForm.variantsList.filter(v => v.name.trim() !== '');
    const productData = {
      name: productForm.name, 
      price: Number(productForm.price), 
      description: productForm.description, 
      image: productForm.image, 
      inStock: productForm.inStock, 
      categories: productForm.categories, 
      customTag: productForm.customTag?.trim() || '', 
      variants: validVariants.map(v => v.name.trim()), 
      variantImages: validVariants.map(v => v.image.trim()), 
      variantPrices: validVariants.map(v => Number(v.price) || Number(productForm.price)), 
      updatedAt: serverTimestamp()
    };

    try {
      if (isEditing) { 
        await updateDoc(doc(db, 'products', editingId), productData); 
        
        // Ghi log Sửa sản phẩm
        logAction('[SẢN PHẨM] Cập nhật', { productId: editingId, name: productData.name, price: productData.price, inStock: productData.inStock });
        
        toast.success('Cập nhật thành công!'); 
      } else { 
        await addDoc(collection(db, 'products'), { ...productData, sold: 0 }); 
        
        // Ghi log Thêm sản phẩm
        logAction('[SẢN PHẨM] Thêm mới', { name: productData.name, price: productData.price });
        
        toast.success('Đã thêm món mới!'); 
      }
      resetForm();
    } catch (error) { toast.error('Lỗi khi lưu!'); }
  };

  const resetForm = () => {
    setProductForm({ name: '', price: '', description: '', image: '', inStock: true, categories: ['monle'], customTag: '', variantsList: [] }); 
    setIsEditing(false); setEditingId(null);
  };

  const filteredOrders = orders.filter(o => {
    const matchesFilter = filter === 'all' || o.status === filter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = o.customerName?.toLowerCase().includes(searchLower) || o.phone?.includes(searchLower) || (o.orderId && o.orderId.toLowerCase().includes(searchLower)) || (o.referrer && o.referrer.toLowerCase().includes(searchLower));
    return matchesFilter && matchesSearch;
  });

  if (loading) return <div className="text-center py-20 text-green-600 font-bold animate-pulse">Đang tải dữ liệu quản trị...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20 relative">
      <AnimatePresence>
        {isSyncing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] z-[9999] flex flex-col items-center justify-center text-white">
            <div className="bg-white p-8 rounded-3xl flex flex-col items-center shadow-2xl text-center">
              <Loader2 className="w-12 h-12 text-green-500 animate-spin mb-4" />
              <p className="text-slate-800 font-bold text-lg">Đang xử lý Backend...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6 px-4 sm:px-0">
        <div><h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1></div>
      </div>

      <div className="flex gap-2 p-1 bg-slate-200/50 rounded-2xl w-fit mx-4 sm:mx-0 overflow-x-auto max-w-full custom-scrollbar">
        {[{ id: 'overview', icon: LayoutDashboard, label: 'Tổng quan' }, { id: 'orders', icon: Package, label: 'Đơn hàng' }, { id: 'products', icon: ShoppingBag, label: 'Sản phẩm' }, { id: 'ctv', icon: Users, label: 'CTV' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-green-600 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}>
            <tab.icon className="w-5 h-5" /> {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        
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

        {activeTab === 'ctv' && (
          <motion.div key="ctv" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 px-4 sm:px-0">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
             <div className="flex flex-col gap-2">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Award className="w-6 h-6 text-orange-500" /> Quản lý Cộng Tác Viên</h2>
                  <button onClick={handleSyncCtvRevenue} disabled={isSyncingCtv} className="px-4 py-2 text-xs font-bold bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50">
                    {isSyncingCtv ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Tính doanh thu mới nhất
                  </button>
                </div>
                <p className="text-sm text-slate-500 mt-1">Gán Email Google của CTV để hệ thống tự nhận diện. Dữ liệu doanh thu chỉ thay đổi khi bấm nút tính.</p>
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
                  <thead><tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase font-bold"><th className="p-5">Thông tin CTV</th><th className="p-5 text-center">Đơn thành công</th><th className="p-5 text-right">Doanh thu</th><th className="p-5 text-center">Hành động</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                      {ctvs.map(ctv => {
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
                          <td className="p-5 text-center font-bold text-green-600">{ctv.successOrders || 0}</td>
                          <td className="p-5 text-right font-extrabold">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(ctv.totalRevenue || 0)}</td>
                          <td className="p-5 text-center">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => { setEditingCtvId(ctv.id); setEditCtvName(ctv.name); }} className="p-2 text-blue-600 bg-blue-50 rounded-lg"><Edit className="w-4 h-4"/></button>
                              <button onClick={async () => { 
                                if(window.confirm('Xóa CTV này?')) {
                                  await deleteDoc(doc(db, 'ctvs', ctv.id));
                                  // Ghi log Xóa CTV
                                  logAction('[CTV] Xóa', { ctvId: ctv.id, name: ctv.name, email: ctv.email });
                                }
                              }} className="p-2 text-red-600 bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
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

        {/* TAB ĐƠN HÀNG */}
        {activeTab === 'orders' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mx-4 sm:mx-0">
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row gap-4 justify-between items-center">
              <div className="relative w-full lg:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" placeholder="Tìm tên, SĐT, mã đơn, CTV..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-sm" />
              </div>
<div className="flex gap-3 w-full lg:w-auto">
                {/* BỘ LỌC SẮP XẾP */}
                <select 
                  value={sortBy} 
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setOrderLimit(100); 
                  }} 
                  className="flex-1 lg:w-48 p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 font-medium text-sm"
                >
                  <option value="createdAt">Mới đặt nhất (Mặc định)</option>
                  <option value="deliveryTime">Giờ giao muộn nhất</option>
                </select>

                {/* BỘ LỌC TRẠNG THÁI */}
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
                <thead>
                  <tr className="bg-white border-b text-xs text-slate-400 uppercase font-bold">
                    <th className="p-5">Khách hàng</th>
                    <th className="p-5">Chi tiết đơn</th>
                    <th className="p-5">Thời gian</th>
                    <th className="p-5">Thanh toán</th>
                    <th className="p-5">Trạng thái</th>
                  </tr>
                </thead>
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
                      
                      <td className="p-5 align-top text-sm space-y-3">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Thời gian đặt</span>
                          <p className="font-medium text-slate-700">{formatTimestamp(order.createdAt)}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-orange-400 uppercase block mb-0.5">Thời gian nhận</span>
                          <p className="font-bold text-orange-600">{formatDeliveryTime(order.deliveryTime)}</p>
                        </div>
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
            {hasMoreOrders && filter === 'all' && searchQuery === '' && (
              <div className="flex justify-center p-6 bg-slate-50/50 border-t border-slate-100">
                <button onClick={handleLoadMore} className="px-6 py-3 bg-white border border-slate-200 hover:border-green-500 text-slate-700 hover:text-green-600 font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm">
                  Tải thêm 50 đơn cũ hơn
                </button>
              </div>
            )}
            {!hasMoreOrders && orders.length > 0 && filter === 'all' && searchQuery === '' && (
              <div className="text-center p-6 text-sm font-semibold text-slate-400 bg-slate-50/50 border-t border-slate-100">Đã hiển thị toàn bộ lịch sử đơn hàng.</div>
            )} 
          </motion.div>
        )}

        {/* TAB SẢN PHẨM */}
        {activeTab === 'products' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 sm:px-0">
            
            {/* FORM THÊM/SỬA SẢN PHẨM */}
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

                {/* KHU VỰC CHỌN NHIỀU DANH MỤC (CHECKBOX) */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Chọn danh mục (Có thể chọn nhiều) *</label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_CATEGORIES.map(cat => (
                      <label key={cat.id} className={`flex items-center gap-2 p-2 border-2 rounded-xl cursor-pointer transition-all ${productForm.categories?.includes(cat.id) ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-slate-50 hover:border-green-200'}`}>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={productForm.categories?.includes(cat.id)}
                          onChange={(e) => {
                            const newCats = e.target.checked 
                              ? [...(productForm.categories || []), cat.id] 
                              : (productForm.categories || []).filter(c => c !== cat.id);
                            setProductForm({ ...productForm, categories: newCats });
                          }}
                        />
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center border ${productForm.categories?.includes(cat.id) ? 'bg-green-500 border-green-500' : 'bg-white border-slate-300'}`}>
                          {productForm.categories?.includes(cat.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`text-xs font-bold ${productForm.categories?.includes(cat.id) ? 'text-green-700' : 'text-slate-600'}`}>{cat.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nhãn sản phẩm (VD: Combo Hot, Mới, v.v..)</label>
                  <input type="text" value={productForm.customTag} onChange={e => setProductForm({...productForm, customTag: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="Để trống nếu không cần tag..." />
                </div>

                <textarea value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-2xl outline-none min-h-[80px]" placeholder="Mô tả..." />
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Ảnh sản phẩm chính *</label>
                  <div className="flex items-center gap-3">
                    {productForm.image && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-green-500 shrink-0"><img src={productForm.image} alt="Preview" className="w-full h-full object-cover" /></div>
                    )}
                    <label className="flex-1 flex flex-col items-center justify-center h-16 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex flex-col items-center justify-center">
                        <UploadCloud className={`w-5 h-5 mb-1 ${isUploadingImage ? 'text-slate-400' : 'text-green-500'}`} />
                        <p className="text-xs text-slate-500 font-semibold">{isUploadingImage ? 'Đang tải lên...' : 'Bấm để tải ảnh lên'}</p>
                      </div>
                      <input type="file" accept="image/*" className="hidden" disabled={isUploadingImage} onChange={(e) => handleImageUpload(e.target.files[0])} />
                    </label>
                  </div>
                </div>
                
                <div className="p-4 bg-green-50/50 rounded-2xl border border-green-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-extrabold text-green-700 uppercase">Phân loại / Vị</p>
                    <button type="button" onClick={handleAddVariantRow} className="text-xs font-bold text-green-600 bg-green-100 px-3 py-1.5 rounded-lg">+ Thêm loại</button>
                  </div>
                  {productForm.variantsList.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start bg-white p-3 rounded-xl border border-green-200/60 shadow-sm">
                      <div className="flex-1 space-y-2">
                        <input type="text" value={item.name} onChange={e => handleVariantChange(index, 'name', e.target.value)} className="w-full p-2 bg-slate-50 rounded-lg outline-none text-sm font-semibold" placeholder="Tên vị..." />
                        
                        <div className="flex gap-2">
                          <input type="number" value={item.price} onChange={e => handleVariantChange(index, 'price', e.target.value)} className="w-full p-2 bg-slate-50 rounded-lg outline-none text-sm" placeholder="Giá riêng (nếu có)..." />
                          <label className={`shrink-0 flex items-center justify-center px-3 rounded-lg cursor-pointer transition-colors ${item.image ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`} title="Tải ảnh riêng cho loại này">
                            {item.image ? <ImageIcon className="w-4 h-4" /> : <UploadCloud className="w-4 h-4" />}
                            <input type="file" accept="image/*" className="hidden" disabled={isUploadingImage} onChange={(e) => handleImageUpload(e.target.files[0], true, index)} />
                          </label>
                        </div>
                        {item.image && <div className="mt-1"><img src={item.image} alt="Variant preview" className="h-10 w-10 object-cover rounded-lg border border-slate-200" /></div>}
                      </div>
                      <button type="button" onClick={() => handleRemoveVariantRow(index)} className="p-2 text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2 pt-2">
                  {isEditing && <button type="button" onClick={resetForm} disabled={isUploadingImage} className="flex-1 py-4 bg-slate-100 rounded-2xl font-bold">Hủy</button>}
                  <button type="submit" disabled={isUploadingImage} className={`flex-[2] py-4 rounded-2xl font-bold text-white shadow-lg transition-all ${isUploadingImage ? 'bg-slate-400 cursor-not-allowed' : isEditing ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'}`}>
                    {isUploadingImage ? 'ĐANG TẢI ẢNH...' : isEditing ? 'CẬP NHẬT' : 'THÊM MÓN'}
                  </button>
                </div>
              </form>
            </div>

            {/* DANH SÁCH SẢN PHẨM HIỆN CÓ */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="font-bold text-slate-800 text-lg">Menu hiện tại ({products.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.map(product => {
                  const productCategories = product.categories || (product.category ? [product.category] : []);

                  return (
                    <div key={product.id} className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex gap-4 group">
                      <div className="w-24 h-24 shrink-0 relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 aspect-square">
                        <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
                        
                        {/* Hiển thị nhiều nhãn danh mục xếp chồng lên nhau */}
                        <div className="absolute top-1 left-1 flex flex-col gap-1 z-10">
                          {productCategories.map(cat => (
                            <span key={cat} className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-sm text-white uppercase tracking-wider ${
                              cat === 'thbn' ? 'bg-blue-500' :
                              cat === 'combo' ? 'bg-purple-500' : 
                              cat === 'quanho' ? 'bg-pink-500' : 
                              'bg-orange-500'
                            }`}>
                              {cat === 'thbn' ? 'Bắc Ninh' : cat === 'combo' ? 'Combo' : cat === 'quanho' ? 'Quan họ' : 'Món lẻ'}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col">
                        <h3 className="font-bold text-slate-800 line-clamp-1">{product.name}</h3>
                        {product.customTag && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 w-fit rounded mt-0.5 uppercase">{product.customTag}</span>}
                        <p className="text-green-600 font-extrabold text-lg mt-1">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}</p>
                        <p className="text-xs">
                          <span className={`font-bold ${product.inStock ? 'text-green-600' : 'text-red-500'}`}>{product.inStock ? '• Còn hàng' : '• Hết hàng'}</span> 
                          <span className="text-slate-400 ml-2">| Đã bán: {product.sold || 0}</span>
                        </p>
                        <div className="flex gap-2 mt-auto pt-2">
                          <button onClick={() => {
                              const loadedVariantsList = (product.variants || []).map((v, idx) => ({ 
                                name: v, image: (product.variantImages && product.variantImages[idx]) || '', price: (product.variantPrices && product.variantPrices[idx]) || product.price
                              }));
                              setProductForm({ 
                                ...product, 
                                categories: productCategories, 
                                customTag: product.customTag || '',
                                variantsList: loadedVariantsList 
                              });
                              setIsEditing(true); setEditingId(product.id);
                            }} className="flex-1 bg-blue-50 text-blue-600 text-xs font-bold py-2 rounded-xl">Sửa</button>
                          <button onClick={async () => { 
                            if(window.confirm('Xóa món này?')) {
                              await deleteDoc(doc(db, 'products', product.id));
                              // Ghi log Xóa Sản phẩm
                              logAction('[SẢN PHẨM] Xóa', { productId: product.id, productName: product.name });
                            }
                          }} className="px-3 bg-red-50 text-red-400 rounded-xl"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
