import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../config/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { 
  Package, DollarSign, Clock, ShoppingBag, Plus, Edit, Trash2, X, 
  Download, Search, LayoutDashboard, Filter, TrendingUp, Image as ImageIcon
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
  
  // 1. STATE FORM: Đã thay variants string bằng mảng variantsList [{name: '', image: ''}]
  const [productForm, setProductForm] = useState({ 
    name: '', price: '', description: '', image: '', inStock: true, isCombo: false, 
    variantsList: [] 
  });

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

  // 1. THÊM STATE CHO BỘ LỌC BIỂU ĐỒ
  const [chartView, setChartView] = useState('7days'); // '7days' hoặc 'daily'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // ====== LOGIC XỬ LÝ DỮ LIỆU BIỂU ĐỒ ======
  const chartData = useMemo(() => {
    const doneOrders = orders.filter(o => o.status === 'done');

    if (chartView === '7days') {
      const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      }).reverse();

      const dataMap = last7Days.reduce((acc, date) => ({ ...acc, [date]: { name: date, doanhThu: 0, donHang: 0 } }), {});

      doneOrders.forEach(order => {
        // Lấy thời gian hoàn thành (ưu tiên updatedAt, nếu lỗi fallback về createdAt)
        const timeStampToUse = order.updatedAt || order.createdAt;
        if (!timeStampToUse) return;

        const dateStr = timeStampToUse.toDate().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        if (dataMap[dateStr]) {
          dataMap[dateStr].doanhThu += order.total;
          dataMap[dateStr].donHang += 1;
        }
      });
      return Object.values(dataMap);

    } else {
      const hours = [...Array(24)].map((_, i) => `${i.toString().padStart(2, '0')}:00`);
      const dataMap = hours.reduce((acc, h) => ({ ...acc, [h]: { name: h, doanhThu: 0, donHang: 0 } }), {});

      doneOrders.forEach(order => {
        const timeStampToUse = order.updatedAt || order.createdAt;
        if (!timeStampToUse) return;

        const orderDate = timeStampToUse.toDate();
        const orderDateStr = orderDate.toISOString().split('T')[0];
        
        if (orderDateStr === selectedDate) {
          const hourStr = `${orderDate.getHours().toString().padStart(2, '0')}:00`;
          if (dataMap[hourStr]) {
            dataMap[hourStr].doanhThu += order.total;
            dataMap[hourStr].donHang += 1;
          }
        }
      });
      return Object.values(dataMap);
    }
  }, [orders, chartView, selectedDate]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { 
        status: newStatus,
        updatedAt: serverTimestamp() // ĐÃ THÊM: Lưu thời gian cập nhật trạng thái
      });
      toast.success('Đã cập nhật trạng thái đơn hàng!');
    } catch (error) { toast.error('Lỗi cập nhật trạng thái.'); }
  };

  const exportToExcel = () => {
    const dataToExport = filteredOrders.map(o => ({
      "Mã Đơn": o.id, "Tên Khách": o.customerName, "SĐT": o.phone, "Địa Chỉ": o.address,
      "Chi Tiết Món": o.items.map(i => `${i.quantity}x ${i.name} ${i.variant ? `(${i.variant})` : ''}`).join(', '),
      "Tổng Tiền": o.total, "Phương Thức": o.paymentMethod, "Trạng Thái": o.status,
      "Ghi Chú": o.notes || '', "Người Giới Thiệu": o.referrer || '', "Lý Do Hủy": o.cancelReason || '',
      "Thời Gian Đặt": o.createdAt ? o.createdAt.toDate().toLocaleString('vi-VN') : ''
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Don_Hang");
    XLSX.writeFile(wb, `Thong_Ke_Mua_He_Xanh_${new Date().getTime()}.xlsx`);
    toast.success('Đã xuất file Excel!');
  };

  const filteredOrders = orders.filter(o => {
    const matchesFilter = filter === 'all' || o.status === filter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = o.customerName.toLowerCase().includes(searchLower) || o.phone.includes(searchLower) || o.id.toLowerCase().includes(searchLower);
    return matchesFilter && matchesSearch;
  });

  // ====== LOGIC PHÂN LOẠI HÀNG (VARIANTS) ======
  const handleAddVariantRow = () => {
    setProductForm(prev => ({
      ...prev,
      variantsList: [...prev.variantsList, { name: '', image: '' }]
    }));
  };

  const handleRemoveVariantRow = (index) => {
    setProductForm(prev => ({
      ...prev,
      variantsList: prev.variantsList.filter((_, i) => i !== index)
    }));
  };

  const handleVariantChange = (index, field, value) => {
    const newList = [...productForm.variantsList];
    newList[index][field] = value;
    setProductForm(prev => ({ ...prev, variantsList: newList }));
  };

  // ====== LOGIC LƯU SẢN PHẨM ======
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price) return toast.error('Vui lòng nhập tên và giá!');

    // Lọc bỏ những dòng phân loại chưa nhập tên, sau đó tách thành 2 mảng riêng biệt để lưu Firebase
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

  if (loading) return <div className="text-center py-20 text-brand-500 animate-pulse">Đang tải trung tâm quản trị...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-slate-500 font-medium mt-1">Quản lý tổng quan chiến dịch gây quỹ</p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-slate-200/50 rounded-2xl w-fit">
        {[
          { id: 'overview', icon: LayoutDashboard, label: 'Tổng quan' },
          { id: 'orders', icon: Package, label: 'Đơn hàng' },
          { id: 'products', icon: ShoppingBag, label: 'Sản phẩm' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === tab.id ? 'bg-white text-green-600 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}>
            <tab.icon className="w-5 h-5" /> {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* TAB TỔNG QUAN VÀ ĐƠN HÀNG (Giữ nguyên, thu gọn để tránh dài code) */}
        {/* ==================== TAB TỔNG QUAN (OVERVIEW) ==================== */}
{activeTab === 'overview' && (
  <motion.div 
    key="overview" 
    initial={{ opacity: 0, y: 20 }} 
    animate={{ opacity: 1, y: 0 }} 
    exit={{ opacity: 0, y: -20 }} 
    className="space-y-6"
  >
    {/* THỐNG KÊ NHANH (Chỉ tính đơn done) */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
    <div className="p-4 bg-green-50 text-green-600 rounded-2xl"><DollarSign className="w-8 h-8" /></div>
    <div>
      <p className="text-slate-500 text-sm font-semibold mb-1">Doanh thu thực</p>
      <h3 className="text-xl font-extrabold text-slate-900">
        {/* ĐÃ SỬA: Hiển thị đầy đủ số tiền */}
        {new Intl.NumberFormat('vi-VN', { 
          style: 'currency', 
          currency: 'VND',
          maximumFractionDigits: 0 
        }).format(orders.filter(o => o.status === 'done').reduce((a, b) => a + b.total, 0))}
      </h3>
    </div>
  </div>
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
        <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Package className="w-8 h-8" /></div>
        <div>
          <p className="text-slate-500 text-sm font-semibold mb-1">Tổng đơn</p>
          <h3 className="text-2xl font-extrabold text-slate-900">{orders.length}</h3>
        </div>
      </div>
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
        <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl"><Clock className="w-8 h-8" /></div>
        <div>
          <p className="text-slate-500 text-sm font-semibold mb-1">Chờ xác nhận</p>
          <h3 className="text-2xl font-extrabold text-slate-900">{orders.filter(o => o.status === 'pending').length}</h3>
        </div>
      </div>
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl"><TrendingUp className="w-8 h-8" /></div>
        <div>
          <p className="text-slate-500 text-sm font-semibold mb-1">Đơn hủy</p>
          <h3 className="text-2xl font-extrabold text-slate-900">{orders.filter(o => o.status === 'cancelled').length}</h3>
        </div>
      </div>
    </div>

    {/* BIỂU ĐỒ RECHARTS (Đã sửa lỗi thẻ đóng) */}
    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-green-500" /> 
          Thống kê doanh thu thực tế
        </h3>
        
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button 
            type="button"
            onClick={() => setChartView('7days')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${chartView === '7days' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            7 ngày qua
          </button>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => setChartView('daily')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${chartView === 'daily' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Theo ngày
            </button>
            {chartView === 'daily' && (
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white border-none outline-none text-xs font-bold text-green-700 p-1.5 rounded-lg shadow-inner"
              />
            )}
          </div>
        </div>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 12 }} 
              dy={10} 
              interval={chartView === 'daily' ? 2 : 0} 
            />
            <YAxis 
              yAxisId="left" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 12 }} 
              tickFormatter={(value) => `${value / 1000}k`} 
            />
            <Tooltip 
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)', padding: '12px' }}
              formatter={(value) => [new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value), 'Doanh thu']}
            />
            <Line 
              yAxisId="left" 
              type="monotone" 
              dataKey="doanhThu" 
              stroke="#22c55e" 
              strokeWidth={4} 
              dot={{ r: 6, fill: '#22c55e', strokeWidth: 2, stroke: '#fff' }} 
              activeDot={{ r: 8 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  </motion.div>
)}

        {activeTab === 'orders' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" placeholder="Tìm tên khách, SĐT, mã đơn..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 transition-all shadow-sm" />
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full pl-10 pr-8 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 appearance-none font-medium text-slate-700 shadow-sm">
                    <option value="all">Tất cả trạng thái</option><option value="pending">Chờ xác nhận</option><option value="confirmed">Đã xác nhận</option><option value="shipping">Đang giao</option><option value="done">Hoàn thành</option><option value="cancelled">Đã hủy</option>
                  </select>
                </div>
                <button onClick={exportToExcel} className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-md">
                  <Download className="w-5 h-5" /> <span className="hidden sm:inline">Xuất Excel</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-white border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider font-bold"><th className="p-5">Khách hàng</th><th className="p-5">Chi tiết đơn</th><th className="p-5">Thanh toán</th><th className="p-5">Trạng thái</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredOrders.length === 0 ? (<tr><td colSpan="4" className="p-10 text-center text-slate-400 font-medium">Không tìm thấy đơn hàng nào phù hợp.</td></tr>) : (
                    filteredOrders.map(order => (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-5 align-top"><p className="font-bold text-slate-900 text-base">{order.customerName}</p><p className="text-slate-500 font-medium text-sm mt-0.5">{order.phone}</p><p className="text-slate-400 text-xs mt-2 max-w-[200px] leading-relaxed">{order.address}</p></td>
                        <td className="p-5 align-top max-w-xs">
                          <ul className="space-y-1.5 text-sm">{order.items.map((item, idx) => (<li key={idx} className="text-slate-700"><span className="font-bold text-slate-900">{item.quantity}x</span> {item.name} {item.variant && <span className="text-slate-400">({item.variant})</span>}</li>))}</ul>
                          {order.notes && <p className="mt-3 text-xs text-orange-700 bg-orange-50 p-2 rounded-lg border border-orange-100"><span className="font-bold">Ghi chú:</span> {order.notes}</p>}
                          {order.referrer && <p className="mt-2 text-xs text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-100"><span className="font-bold">Mã GT:</span> {order.referrer}</p>}
                        </td>
                        <td className="p-5 align-top">
                          <p className="font-bold text-green-600 text-lg">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total)}</p>
                          <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${order.paymentMethod === 'COD' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-600'}`}>{order.paymentMethod}</span>
                          {order.proofLink && <a href={order.proofLink} target="_blank" rel="noreferrer" className="block mt-2 text-xs font-semibold text-green-600 hover:underline">Xem bill CK &rarr;</a>}
                        </td>
                        <td className="p-5 align-top">
                          {order.status === 'cancelled' ? (
                            <div><span className="inline-block bg-red-100 text-red-700 text-xs rounded-full px-3 py-1 font-bold">Đã hủy</span>{order.cancelReason && <p className="text-xs text-red-600 mt-2 leading-relaxed max-w-[150px]"><span className="font-bold">Lý do:</span> {order.cancelReason}</p>}</div>
                          ) : (
                            <select value={order.status} onChange={(e) => handleUpdateStatus(order.id, e.target.value)} className={`text-sm rounded-xl px-4 py-2 font-bold outline-none cursor-pointer border-2 transition-all appearance-none pr-8 ${order.status === 'pending' ? 'border-orange-200 bg-orange-50 text-orange-700' : ''} ${order.status === 'done' ? 'border-green-200 bg-green-50 text-green-700' : ''} ${order.status === 'shipping' ? 'border-purple-200 bg-purple-50 text-purple-700' : ''} ${order.status === 'confirmed' ? 'border-blue-200 bg-blue-50 text-blue-700' : ''}`}>
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

        {/* ==================== TAB SẢN PHẨM (PRODUCTS) ==================== */}
        {activeTab === 'products' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* FORM THÊM / SỬA (Nâng cấp) */}
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
                      <input 
                        type="checkbox" 
                        checked={productForm.inStock} 
                        onChange={e => setProductForm({...productForm, inStock: e.target.checked})} 
                        className="w-5 h-5 text-green-500 rounded focus:ring-green-500 border-slate-300" 
                      />
                      <span className={`text-sm font-bold ${productForm.inStock ? 'text-green-600' : 'text-red-500'}`}>
                        {productForm.inStock ? 'Đang bán (Còn hàng)' : 'Tạm hết hàng'}
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Mô tả chi tiết</label>
                  <textarea value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none min-h-[100px]" placeholder="Nguyên liệu, hương vị, ý nghĩa..." />
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

                {/* ===== KHU VỰC PHÂN LOẠI HÀNG ĐỘNG ===== */}
                <div className="p-4 bg-green-50/50 rounded-2xl border border-green-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-extrabold text-green-700 uppercase tracking-widest">Phân loại / Vị / Màu sắc</p>
                    <button type="button" onClick={handleAddVariantRow} className="text-xs font-bold text-green-600 hover:text-green-800 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                      <Plus className="w-3 h-3" /> Thêm loại
                    </button>
                  </div>
                  
                  {productForm.variantsList.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-2 italic">Chưa có phân loại nào.</p>
                  ) : (
                    <div className="space-y-3">
                      {productForm.variantsList.map((item, index) => (
                        <div key={index} className="flex gap-2 items-start bg-white p-2 rounded-xl border border-green-200/60 shadow-sm relative group">
                          {/* Khung ảnh preview nhỏ */}
                          <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden">
                            {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 text-slate-300" />}
                          </div>
                          
                          <div className="flex-1 space-y-2">
                            <input type="text" value={item.name} onChange={e => handleVariantChange(index, 'name', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-green-400 text-sm font-semibold text-slate-700" placeholder="Tên vị (VD: Cay, Đỏ...)" />
                            <input type="url" value={item.image} onChange={e => handleVariantChange(index, 'image', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-green-400 text-xs text-slate-600" placeholder="Link ảnh riêng (Tùy chọn)" />
                          </div>

                          <button type="button" onClick={() => handleRemoveVariantRow(index)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
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
                  {isEditing && (
                    <button type="button" onClick={resetForm} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">Hủy</button>
                  )}
                  <button type="submit" className={`flex-[2] py-4 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2 ${isEditing ? 'bg-blue-500 shadow-blue-500/30' : 'bg-green-500 shadow-green-500/30'}`}>
                    {isEditing ? 'CẬP NHẬT' : <><Plus className="w-5 h-5"/> THÊM MÓN</>}
                  </button>
                </div>
              </form>
            </div>

            {/* DANH SÁCH SẢN PHẨM (Bên phải) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-bold text-slate-800 text-lg">Menu hiện tại ({products.length})</h2>
              </div>
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
  <span className={`font-bold ${product.inStock !== false ? 'text-green-600' : 'text-red-500'}`}>
    {product.inStock !== false ? '• Còn hàng' : '• Hết hàng'}
  </span> 
  <span className="text-slate-400 font-medium ml-2">| Đã bán: {product.sold || 0}</span>
</p>
                      
                      <div className="flex gap-2 mt-auto pt-2">
                        <button 
                          onClick={() => {
                            // Phục hồi lại mảng variantsList khi bấm Sửa
                            const loadedVariantsList = (product.variants || []).map((v, idx) => ({
                              name: v,
                              image: (product.variantImages && product.variantImages[idx]) ? product.variantImages[idx] : ''
                            }));

                            setProductForm({
                              ...product,
                              variantsList: loadedVariantsList
                            });
                            setIsEditing(true);
                            setEditingId(product.id);
                          }} 
                          className="flex-1 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600 text-xs font-bold py-2 rounded-xl transition-all"
                        >
                          Sửa
                        </button>
                        <button 
                          onClick={() => { if(window.confirm('Xóa món này?')) deleteDoc(doc(db, 'products', product.id)) }} 
                          className="px-3 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4"/>
                        </button>
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