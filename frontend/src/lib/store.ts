import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BranchOption, CartItem, Customer, LoginResponse } from "@/types";
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
  discount: number;
  addToCart: (item: Omit<CartItem, "id" | "quantity" | "discountAmount"> & { quantity?: number }) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  setCustomer: (customer: Customer | null) => void;
  setDiscount: (discount: number) => void;
  clearCart: () => void;
  subtotal: () => number;
  total: () => number;
}

export const usePosStore = create<PosState>((set, get) => ({
  cart: [],
  selectedCustomer: null,
  discount: 0,

  addToCart: (item) => {
    const id = crypto.randomUUID();
    set((state) => ({
      cart: [...state.cart, { ...item, id, quantity: item.quantity || 1, discountAmount: 0 }],
    }));
  },

  removeFromCart: (id) => set((state) => ({ cart: state.cart.filter((i) => i.id !== id) })),

  updateQuantity: (id, quantity) =>
    set((state) => ({
      cart: state.cart.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i)),
    })),

  setCustomer: (customer) => set({ selectedCustomer: customer }),
  setDiscount: (discount) => set({ discount }),
  clearCart: () => set({ cart: [], selectedCustomer: null, discount: 0 }),

  subtotal: () => get().cart.reduce((sum, i) => sum + i.unitPrice * i.quantity - i.discountAmount, 0),
  total: () => Math.max(0, get().subtotal() - get().discount),
}));
