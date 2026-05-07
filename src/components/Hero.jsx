import React from 'react';
import { motion } from 'framer-motion';
import { Heart, TrendingUp, Users, Target } from 'lucide-react';

export default function Hero({ totalRaised = 0, totalOrders = 0, onScrollDown }) {
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.2 } }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-slate-50 rounded-3xl mx-4 mt-4 shadow-soft">
      {/* Animated Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <motion.div animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.1, 1] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute -top-32 -left-32 w-96 h-96 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
        <motion.div animate={{ x: [0, -100, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }} className="absolute top-1/2 -right-32 w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
        <motion.div animate={{ x: [0, 50, 0], y: [0, 100, 0], scale: [1, 0.9, 1] }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }} className="absolute -bottom-32 left-1/3 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
      </div>

      {/* Content */}
      <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        
        {/* Badge có chấm xanh */}
        <motion.div variants={item} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 shadow-sm border border-white/60">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-600"></span>
          </span>
          <span className="text-sm font-semibold text-slate-700 tracking-wide uppercase">Chiến dịch đang diễn ra</span>
        </motion.div>

        {/* Tiêu đề */}
        <motion.h1 variants={item} className="text-5xl md:text-7xl font-heading font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
          Chuyến đi tuổi trẻ <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">
            Gửi gắm yêu thương
          </span>
        </motion.h1>

        <motion.p variants={item} className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          Đồng hành cùng Mùa Hè Xanh 2026. Mỗi sản phẩm bạn ủng hộ là một viên gạch xây dựng tủ sách và áo ấm cho trẻ em vùng cao.
        </motion.p>

        {/* Các Nút */}
        <motion.div variants={item} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button onClick={onScrollDown} className="w-full sm:w-auto px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-lg transition-all shadow-glow hover:shadow-none hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
            <Heart className="w-5 h-5 fill-current" />
            Ủng hộ ngay
          </button>
          <button className="w-full sm:w-auto px-8 py-4 glass hover:bg-white/80 text-slate-800 rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 border border-slate-200">
            Tìm hiểu thêm
          </button>
        </motion.div>

        {/* Realtime Stats */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div className="glass p-6 rounded-3xl text-left border border-white/60 shadow-soft hover:-translate-y-1 transition-transform">
            <div className="bg-green-100 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-slate-500 text-sm font-medium mb-1">Mục tiêu</p>
            <h4 className="text-2xl font-bold text-slate-900">50Tr</h4>
          </div>
          <div className="glass p-6 rounded-3xl text-left border border-white/60 shadow-soft hover:-translate-y-1 transition-transform">
            <div className="bg-teal-100 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-teal-600" />
            </div>
            <p className="text-slate-500 text-sm font-medium mb-1">Đã gây quỹ</p>
            <h4 className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(totalRaised)}
            </h4>
          </div>
          <div className="glass p-6 rounded-3xl text-left border border-white/60 shadow-soft hover:-translate-y-1 transition-transform">
            <div className="bg-orange-100 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
              <Heart className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-slate-500 text-sm font-medium mb-1">Lượt ủng hộ</p>
            <h4 className="text-2xl font-bold text-slate-900">{totalOrders}</h4>
          </div>
          <div className="glass p-6 rounded-3xl text-left border border-white/60 shadow-soft hover:-translate-y-1 transition-transform">
            <div className="bg-blue-100 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-slate-500 text-sm font-medium mb-1">Tình nguyện viên</p>
            <h4 className="text-2xl font-bold text-slate-900">120+</h4>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}