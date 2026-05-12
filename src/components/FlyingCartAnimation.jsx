import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../store/useCart';

export default function FlyingCartAnimation() {
  const { flyingItems, removeFlyingItem } = useCart();

  return (
    <div className="fixed inset-0 pointer-events-none z-[999999]">
      <AnimatePresence>
        {flyingItems.map((item) => (
          <motion.img
            key={item.id}
            src={item.image || 'https://ui-avatars.com/api/?name=MHX'}
            alt="flying-item"
            className="fixed w-16 h-16 rounded-full object-cover shadow-2xl border-2 border-green-500 z-[999999]"
            initial={{ 
              top: item.startY, 
              left: item.startX, 
              scale: 1, 
              opacity: 1 
            }}
            animate={{ 
              top: item.endY, 
              left: item.endX, 
              scale: 0.15, // Thu nhỏ lại khi bay đến giỏ hàng
              opacity: 0.3 
            }}
            transition={{ 
              duration: 0.7, // Tốc độ bay
              ease: "circInOut" // Gia tốc mượt
            }}
            onAnimationComplete={() => removeFlyingItem(item.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}