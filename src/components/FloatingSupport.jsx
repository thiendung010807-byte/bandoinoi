import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Phone, X } from 'lucide-react';

export default function FloatingSupport() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen(!isOpen);

  // Mảng các kênh hỗ trợ
  const supportChannels = [
    { 
      id: 'zalo', 
      name: 'Zalo', 
      imgSrc: '/zalo.png', 
      color: 'bg-white', 
      link: 'https://zalo.me/0989917081' 
    },
    { 
      id: 'messenger', 
      name: 'Messenger', 
      icon: MessageCircle, 
      color: 'bg-indigo-500', 
      link: 'https://m.me/doisinhvientinhnguyendonghuongbacninh' 
    },
    { 
      id: 'hotline', 
      name: 'Hotline', 
      icon: Phone, 
      color: 'bg-green-500', 
      link: 'tel:0989917081' 
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className="flex flex-col gap-3"
          >
            {supportChannels.map((channel, index) => (
              <motion.a
                key={channel.id}
                href={channel.link}
                target="_blank"
                rel="noreferrer"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0, transition: { delay: index * 0.1 } }}
                whileHover={{ scale: 1.05, x: -5 }}
                className="flex items-center gap-3 group"
              >
                {/* Nhãn tên kênh hiển thị khi hover */}
                <span className="px-3 py-1.5 bg-white text-slate-700 text-sm font-bold rounded-xl shadow-soft opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 whitespace-nowrap">
                  {channel.name}
                </span>

                {/* Khung chứa Icon/Hình ảnh tròn */}
                <div className={`w-12 h-12 ${channel.color} text-white rounded-full flex items-center justify-center shadow-lg overflow-hidden`}>
                  {channel.imgSrc ? (
                    <img 
                      src={channel.imgSrc} 
                      alt={channel.name} 
                      className="w-full h-full object-contain p-[6px]" 
                    />
                  ) : (
                    channel.icon && <channel.icon className="w-5 h-5 fill-current" />
                  )}
                </div>
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nút Toggle chính (Bật/Tắt menu) */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleOpen}
        className="w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl z-50 border-2 border-white/20 relative"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle className="w-6 h-6 fill-current" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Chấm đỏ thông báo */}
        {!isOpen && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full"></span>
        )}
      </motion.button>
    </div>
  );
}
