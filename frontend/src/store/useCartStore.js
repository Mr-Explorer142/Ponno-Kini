import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useCartStore = create(
    persist(
        (set) => ({
            items: [],
            addItem: (product) =>
                set((state) => {
                    const existing = state.items.find(
                        (item) => item.product.id === product.id,
                    );

                    return {
                        items: existing
                            ? state.items.map((item) =>
                                  item.product.id === product.id
                                      ? { ...item, quantity: item.quantity + 1 }
                                      : item,
                              )
                            : [...state.items, { product, quantity: 1, selected: true }],
                    };
                }),
            setItemSelected: (productId, selected) =>
                set((state) => ({
                    items: state.items.map((item) =>
                        item.product.id === productId
                            ? { ...item, selected }
                            : item,
                    ),
                })),
            setAllItemsSelected: (selected) =>
                set((state) => ({
                    items: state.items.map((item) => ({ ...item, selected })),
                })),
            updateProduct: (product) =>
                set((state) => ({
                    items: state.items.map((item) =>
                        item.product.id === product.id
                            ? { ...item, product }
                            : item,
                    ),
                })),
            updateQuantity: (productId, quantity) =>
                set((state) => ({
                    items:
                        quantity > 0
                            ? state.items.map((item) =>
                                  item.product.id === productId
                                      ? { ...item, quantity }
                                      : item,
                              )
                            : state.items.filter(
                                  (item) => item.product.id !== productId,
                              ),
                })),
            removeItem: (productId) =>
                set((state) => ({
                    items: state.items.filter(
                        (item) => item.product.id !== productId,
                    ),
                })),
            removeItems: (productIds) =>
                set((state) => ({
                    items: state.items.filter(
                        (item) => !productIds.includes(item.product.id),
                    ),
                })),
            clearCart: () => set({ items: [] }),
        }),
        { name: "ponno-kini-cart" },
    ),
);
