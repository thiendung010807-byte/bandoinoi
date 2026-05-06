import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';

export const useCart = create(
  persist(
    (set, get) => ({
      items: [],
      isCartOpen: false,

      // UI Actions
      toggleCart: () => set({ isCartOpen: !get().isCartOpen }),
      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),

      // Cart Actions
      addItem: (product, variant = null) => {
        set((state) => {
          // Tạo ID duy nhất cho item dựa trên ID sản phẩm + Tên variant
          const cartItemId = variant ? `${product.id}-${variant}` : product.id;
          const existingItem = state.items.find(item => item.cartItemId === cartItemId);

          if (existingItem) {
            return {
              items: state.items.map(item =>
                item.cartItemId === cartItemId
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              )
            };
          }

          return {
            items: [...state.items, { ...product, variant, quantity: 1, cartItemId }]
          };
        });
        toast.success(`Đã thêm ${product.name} vào giỏ!`, { icon: '🛒' });
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

      // Tính tổng tiền
      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },
      
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      }
    }),
    {
      name: 'mhx-cart-storage', // Tên key trong localStorage
    }
  )
);