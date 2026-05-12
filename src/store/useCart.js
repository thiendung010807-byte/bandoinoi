import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCart = create(
  persist(
    (set, get) => ({
      items: [],
      isCartOpen: false,

      // ==========================================
      // STATE CHO HIỆU ỨNG VẬT THỂ BAY
      // ==========================================
      flyingItems: [],
      addFlyingItem: (item) => set((state) => ({ flyingItems: [...state.flyingItems, item] })),
      removeFlyingItem: (id) => set((state) => ({ flyingItems: state.flyingItems.filter(i => i.id !== id) })),

      // UI Actions
      toggleCart: () => set({ isCartOpen: !get().isCartOpen }),
      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),

      // Cart Actions (Đã sửa lại để nhận số lượng và không tự mở giỏ)
      addItem: (product, quantity = 1, variant = null) => {
        set((state) => {
          const cartItemId = variant ? `${product.id}-${variant}` : product.id;
          const existingItem = state.items.find(item => item.cartItemId === cartItemId);

          if (existingItem) {
            return {
              items: state.items.map(item =>
                item.cartItemId === cartItemId
                  ? { ...item, quantity: item.quantity + quantity } // Cộng dồn số lượng
                  : item
              )
            };
          }

          return {
            items: [...state.items, { ...product, variant, quantity, cartItemId }]
          };
        });
      },

      removeItem: (cartItemId) => {
        set((state) => ({
          items: state.items.filter(item => item.cartItemId !== cartItemId)
        }));
      },

      updateQuantity: (cartItemId, amount) => {
        set((state) => ({
          items: state.items.map(item => {
            if (item.cartItemId === cartItemId) {
              const newQuantity = item.quantity + amount;
              return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
            }
            return item;
          })
        }));
      },

      clearCart: () => set({ items: [] }),

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },
      
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      }
    }),
    {
      name: 'mhx-cart-storage',
      // CHỈ LƯU ITEMS VÀO LOCALSTORAGE, BỎ QUA FLYING ITEMS VÀ TRẠNG THÁI MỞ GIỎ
      partialize: (state) => ({ items: state.items }), 
    }
  )
);