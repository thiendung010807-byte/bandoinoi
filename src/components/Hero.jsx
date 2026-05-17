import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, MapPin, BookOpen, Shirt, Users, CalendarDays, ChevronRight } from 'lucide-react';

export default function Hero({ totalRaised = 0, totalOrders = 0, onScrollDown }) {
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // Lock body scroll khi modal mở
  useEffect(() => {
    if (isInfoOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isInfoOpen]);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.2 } }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const infoSections = [
    {
      icon: <CalendarDays className="w-5 h-5 text-green-600" />,
      bg: "bg-green-50",
      title: "Chiến dịch Mùa Hè Xanh là gì?",
      content: "Thực hiện theo Kế hoạch của BCH Đoàn Thành phố Hà Nội và chỉ đạo của Hội Sinh viên Việt Nam Đại học Kinh tế Quốc dân, Đội SVTN Đồng hương Bắc Ninh tổ chức chiến dịch Mùa Hè Xanh 2026 nhằm phát huy tinh thần tương thân tương ái, khơi dậy và phát huy truyền thống "Uống nước nhớ nguồn, hướng về quê hương. "
    },
    {
      icon: <MapPin className="w-5 h-5 text-teal-600" />,
      bg: "bg-teal-50",
      title: "Địa điểm tổ chức",
      content: "Địa bàn Xã Kiên Lao, tỉnh Bắc Ninh (Bắc Giang cũ) "
    },
    {
      icon: <BookOpen className="w-5 h-5 text-blue-600" />,
      bg: "bg-blue-50",
      title: "Quỹ dùng để làm gì?",
      content: "100 % lợi nhuận từ quỹ sẽ được dùng để thực hiện các công trình Thanh niên tại Xã Kiên Lao; hỗ trợ bà con có hoàn cảnh khó khăn, trẻ em nghèo vượt khó; tổ chức sinh hoạt hè cho các em thiếu nhi; tôn vinh nét đẹp của Văn hóa quê hương Kinh Bắc"
    },
    {
      icon: <Shirt className="w-5 h-5 text-orange-600" />,
      bg: "bg-orange-50",
      title: "Sản phẩm gây quỹ",
      content: "Gồm Đặc sản Bắc Ninh (Bánh đa ngọt, Nem Bùi), đồ ăn vặt và đồ lưu niệm (Móc khóa NEU, cờ Tổ quốc)."
    },
    {
      icon: <Users className="w-5 h-5 text-purple-600" />,
      bg: "bg-purple-50",
      title: "Đơn vị tổ chức",
      content: "Chiến dịch Mùa Hè Xanh 2026 tại xã Kiên Lao được thực hiện bởi: Đội Sinh viên Tình nguyện Đồng hương Bắc Ninh - trực thuộc Hội Sinh viên Đại học Kinh tế Quốc dân (NEU)."
    }
  ];

  return (
    <>
      <div className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-slate-50 rounded-3xl mx-4 mt-4 shadow-soft">
        {/* Animated Background Blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none" aria-hidden="true">
          <motion.div style={{ willChange: 'transform' }} animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.1, 1] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute -top-32 -left-32 w-96 h-96 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
          <motion.div style={{ willChange: 'transform' }} animate={{ x: [0, -100, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }} className="absolute top-1/2 -right-32 w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
          <motion.div style={{ willChange: 'transform' }} animate={{ x: [0, 50, 0], y: [0, 100, 0], scale: [1, 0.9, 1] }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }} className="absolute -bottom-32 left-1/3 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
        </div>

        {/* Content */}
        <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 max-w-5xl mx-auto px-6 text-center">

          {/* Badge có chấm xanh */}
          <motion.div variants={item} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 shadow-sm border border-white/60">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-600"></span>
            </span>
            <span className="text-sm font-semibold text-slate-700 tracking-wide uppercase">Chiến dịch sắp diễn ra</span>
          </motion.div>

          {/* Tiêu đề */}
          <motion.h1 variants={item} className="text-5xl md:text-7xl font-heading font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
            Cùng BNC <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">
              Gửi gắm yêu thương
            </span>
          </motion.h1>

          <motion.p variants={item} className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Đồng hành cùng Chiến dịch Mùa Hè Xanh 2026 của Đội Sinh viên Tình nguyện Đồng hương Bắc Ninh (BNC). Mỗi sản phẩm bạn ủng hộ không chỉ là một món đồ nhỏ, mà còn là một phần yêu thương được gửi trao cho bà con có hoàn cảnh khó khăn!!
          </motion.p>

          {/* Các Nút */}
          <motion.div variants={item} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button onClick={onScrollDown} className="w-full sm:w-auto px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-lg transition-all shadow-glow hover:shadow-none hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
              <Heart className="w-5 h-5 fill-current" />
              Ủng hộ ngay
            </button>
            <button
              onClick={() => setIsInfoOpen(true)}
              className="w-full sm:w-auto px-8 py-4 glass hover:bg-white/80 text-slate-800 rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 border border-slate-200 flex items-center justify-center gap-2"
            >
              Tìm hiểu thêm
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>

        </motion.div>
      </div>

      {/* ===== MODAL TÌM HIỂU THÊM ===== */}
      <AnimatePresence>
        {isInfoOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-6 bg-slate-900/60 backdrop-blur-sm">
            {/* Overlay đóng modal */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsInfoOpen(false)}
              className="absolute inset-0 z-0"
            />

            {/* Panel nội dung */}
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="relative z-10 bg-white rounded-t-[2rem] md:rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] md:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
                <div>
                  <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-0.5">Mùa Hè Xanh 2026</p>
                  <h2 className="text-xl md:text-2xl font-heading font-extrabold text-slate-900">Về chiến dịch</h2>
                </div>
                <button
                  onClick={() => setIsInfoOpen(false)}
                  className="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Nội dung cuộn */}
              <div className="overflow-y-auto custom-scrollbar px-6 py-5 space-y-4 flex-1">
                {infoSections.map((sec, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="flex gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors"
                  >
                    <div className={`${sec.bg} w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5`}>
                      {sec.icon}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm mb-1">{sec.title}</p>
                      <p className="text-slate-500 text-sm leading-relaxed">{sec.content}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* CTA cố định ở đáy modal */}
              <div className="shrink-0 px-6 pt-4 pb-8 border-t border-slate-100 bg-gradient-to-br from-green-50 to-emerald-50" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}>
                <p className="text-sm text-slate-600 mb-3 leading-relaxed text-center">
                  Mỗi sản phẩm bạn ủng hộ không chỉ là một món đồ nhỏ, mà còn là một phần yêu thương được gửi trao cho bà con nhân dân Xã Kiên Lao. Cùng BNC làm nên một mùa hè thật rực rỡ và ý nghĩa nhé! 💚
                </p>
                <button
                  onClick={() => { setIsInfoOpen(false); onScrollDown?.(); }}
                  className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-glow hover:shadow-none"
                >
                  <Heart className="w-4 h-4 fill-current" />
                  Ủng hộ ngay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
