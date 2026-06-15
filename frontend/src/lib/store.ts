import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BranchOption, CartItem, Customer, LoginResponse } from "@/types";
import { calculateDiscountAmount, type DiscountType } from "./discount";
import { api } from "./api";
import { performLogout } from "./auth";

interface AuthState {
  user: LoginResponse | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, branchId?: string) => Promise<LoginResponse>;
  register: (data: {
    businessName: string;
    businessType: number;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    branchName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  switchBranch: (branchId: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: async (email, password, branchId) => {
        const data = await api.post<LoginResponse>("/auth/login", { email, password, branchId });
        api.setToken(data.token);
        set({ user: data, isAuthenticated: true });
        return data;
      },

      register: async (data) => {
        const result = await api.post<LoginResponse>("/auth/register", data);
        api.setToken(result.token);
        set({ user: result, isAuthenticated: true });
      },

      logout: async () => {
        await performLogout();
      },

      switchBranch: (branchId) => {
        const user = get().user;
        if (!user) return;
        const branch = user.branches.find((b) => b.id === branchId);
        if (branch) {
          set({ user: { ...user, branchId: branch.id, branchName: branch.name } });
        }
      },
    }),
    { name: "auth-storage" }
  )
);

interface PosState {
  cart: CartItem[];
  selectedCustomer: Customer | null;
  discountType: DiscountType;
  discountValue: number;
  addToCart: (item: Omit<CartItem, "id" | "quantity" | "discountValue"> & { quantity?: number }) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  setCustomer: (customer: Customer | null) => void;
  setDiscountType: (discountType: DiscountType) => void;
  setDiscountValue: (discountValue: number) => void;
  clearCart: () => void;
  subtotal: () => number;
  discountAmount: () => number;
  total: () => number;
}

export const usePosStore = create<PosState>((set, get) => ({
  cart: [],
  selectedCustomer: null,
  discountType: "PERCENTAGE",
  discountValue: 0,

  addToCart: (item) => {
    const id = crypto.randomUUID();
    set((state) => ({
      cart: [...state.cart, { ...item, id, quantity: item.quantity || 1, discountValue: 0 }],
    }));
  },

  removeFromCart: (id) => set((state) => ({ cart: state.cart.filter((i) => i.id !== id) })),

  updateQuantity: (id, quantity) =>
    set((state) => ({
      cart: state.cart.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i)),
    })),

  setCustomer: (customer) => set({ selectedCustomer: customer }),
  setDiscountType: (discountType) => set({ discountType }),
  setDiscountValue: (discountValue) => set({ discountValue }),
  clearCart: () => set({ cart: [], selectedCustomer: null, discountValue: 0 }),

  subtotal: () =>
    get().cart.reduce((sum, i) => {
      const lineSubtotal = i.unitPrice * i.quantity;
      const lineDiscount = calculateDiscountAmount(get().discountType, lineSubtotal, i.discountValue);
      return sum + lineSubtotal - lineDiscount;
    }, 0),

  discountAmount: () => {
    const sub = get().subtotal();
    return calculateDiscountAmount(get().discountType, sub, get().discountValue);
  },

  total: () => Math.max(0, get().subtotal() - get().discountAmount()),
}));
