// Kategori modeli
export interface Category {
  id: string;
  name: string;
  parentId: string | null; // Alt kategori ise üst kategorinin ID'si, ana kategori ise null
  createdAt: string;
  updatedAt: string;
}

// Ürün modeli
export interface Product {
  id: string;
  name: string;
  price: number;
  categoryId: string | null;
  isWeighted: boolean;
  createdAt: string;
  updatedAt: string;
}

// Ürün varyantı modeli
export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  price: number;
  createdAt: string;
  updatedAt: string;
}

// Masa modeli
export interface Table {
  id: string;
  name: string;
  status: "available" | "occupied";
  createdAt: string;
  updatedAt: string;
}

// Sipariş modeli
export interface Order {
  id: string;
  tableId: string;
  status: "active" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

// Sipariş öğesi modeli
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  price: number;
  assignedTo: string | null;
  status: "active" | "cancelled" | "completed";
  method?: "cash" | "credit_card" | "debit_card" | "other"; // Ödeme yöntemi
  createdAt: string;
  updatedAt: string;
}

// Ödeme modeli
export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: "cash" | "credit_card" | "debit_card" | "other";
  createdAt: string;
  updatedAt: string;
}

// Yeni ürün formu için model
export interface ProductFormData {
  name: string;
  price: number;
  categoryId: string | null;
  isWeighted: boolean;
  variants: Omit<
    ProductVariant,
    "id" | "productId" | "createdAt" | "updatedAt"
  >[];
}

// Kategori form modeli
export interface CategoryFormData {
  name: string;
  parentId: string | null;
}

// Kategori hiyerarşisi için yardımcı tip
export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
}

// Ödeme yöntemleri için sabitler
export const PAYMENT_METHODS = [
  { value: "cash", label: "Nakit" },
  { value: "credit_card", label: "Kredi Kartı" },
  { value: "debit_card", label: "Banka Kartı" },
  { value: "other", label: "Diğer" },
];

// JSON dosyaları için tiplemeler
export interface JsonCategory {
  id: string;
  name: string;
  parentId: string | null;
}

export interface JsonProduct {
  id: string;
  name: string;
  price: number;
  categoryId: string | null;
  isWeighted: boolean;
}

export interface JsonTable {
  id: string;
  name: string;
  status: "available" | "occupied";
}
