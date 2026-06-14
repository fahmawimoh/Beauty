import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BranchOption, CartItem, Customer, DiscountType, LoginResponse, TenantSettings } from "@/types";
import { api } from "./api";
import { performLogout } from "./auth";
import { calculateDiscountAmount, DEFAULT_DISCOUNT_TYPE, normalizeDiscountType } from "./discount";

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

interface SettingsState {
  discountType: DiscountType;
  loaded: boolean;
  loadSettings: () => Promise<void>;
  updateDiscountType: (discountType: DiscountType) => Promise<void>;
  setDiscountType: (discountType: DiscountType) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  discountType: DEFAULT_DISCOUNT_TYPE,
  loaded: false,

  loadSettings: async () => {
    const data = await api.get<TenantSettings>("/settings");
    set({ discountType: normalizeDiscountType(data.discountType), loaded: true });
  },

  updateDiscountType: async (discountType) => {
    const data = await api.put<TenantSettings>("/settings/discount-type", { discountType });
    set({ discountType: normalizeDiscountType(data.discountType), loaded: true });
  },

  setDiscountType: (discountType) => set({ discountType: normalizeDiscountType(discountType), loaded: true }),
}));

interface PosState {
  cart: CartItem[];
  selectedCustomer: Customer | null;
  discountValue: number;
  addToCart: (item: Omit<CartItem, "id" | "quantity" | "discountValue"> & { quantity?: number }) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  setCustomer: (customer: Customer | null) => void;
  setDiscountValue: (discountValue: number) => void;
  clearCart: () => void;
  subtotal: () => number;
  discountAmount: () => number;
  total: () => number;
}

export const usePosStore = create<PosState>((set, get) => ({
  cart: [],
  selectedCustomer: null,
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
  setDiscountValue: (discountValue) => set({ discountValue }),
  clearCart: () => set({ cart: [], selectedCustomer: null, discountValue: 0 }),

  subtotal: () =>
    get().cart.reduce((sum, i) => {
      const lineSubtotal = i.unitPrice * i.quantity;
      const lineDiscount = calculateDiscountAmount(
        useSettingsStore.getState().discountType,
        lineSubtotal,
        i.discountValue
      );
      return sum + lineSubtotal - lineDiscount;
    }, 0),

  discountAmount: () => {
    const sub = get().subtotal();
    return calculateDiscountAmount(useSettingsStore.getState().discountType, sub, get().discountValue);
  },

  total: () => Math.max(0, get().subtotal() - get().discountAmount()),
}));
