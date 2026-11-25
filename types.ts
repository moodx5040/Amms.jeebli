export type Role = "customer" | "founder" | "admin" | "support" | "courier";
export type SectionKind = "products" | "ride" | "restaurant";
export type OrderState = "pending" | "accepted" | "preparing" | "ready" | "picked_up" | "on_the_way" | "delivered" | "rejected" | "cancelled";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: Role;
  permissions: Record<string, boolean>;
  is_active: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  kind: SectionKind;
  sort_order: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  spicy_option: boolean;
  is_available: boolean;
}

export interface Order {
  id: string;
  order_number: number;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  order_type: SectionKind;
  status: OrderState;
  restaurant_name: string | null;
  restaurant_phone: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  request_text: string | null;
  customer_note: string | null;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  courier_id: string | null;
  created_at: string;
}

export interface CartLine {
  product: Product;
  quantity: number;
  variant: "normal" | "spicy" | null;
}
