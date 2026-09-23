/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  SUPER_ADMIN = 'SuperAdmin',
  OWNER = 'Owner',
  MANAGER = 'Manager',
  CASHIER = 'Cashier',
}

export interface Shop {
  id: string; // matches _id in DB
  shopName: string;
  ownerName: string;
  email: string;
  phone: string;
  subscriptionPlan: 'Trial' | 'Monthly' | 'Quarterly' | 'Yearly';
  subscriptionStatus: 'Active' | 'Suspended' | 'Expired' | 'Inactive';
  expiryDate: string; // YYYY-MM-DD
  status: 'Active' | 'Suspended';
  createdAt: string;
}

export interface User {
  id: string;
  shopId?: string;
  branchId: string;
  username: string; // For backward compatibility with login username input
  fullname: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: 'Active' | 'Suspended' | 'Inactive';
  createdAt: string;
  avatarUrl?: string;
}

export interface Branch {
  id: string;
  shopId?: string;
  name: string; // backward compatibility with branchName
  branchName?: string; // mapping
  address: string;
  phone: string;
  createdAt: string;
}

export interface Product {
  id: string;
  shopId?: string;
  branchId: string;
  barcode: string;
  sku: string;
  name: string; // backward compatibility with productName
  productName?: string; // mapping
  description: string;
  category: string;
  brand: string;
  supplierId: string;
  purchasePrice: number; // backward compatibility with buyingPrice
  buyingPrice?: number; // mapping
  sellingPrice: number;
  wholesalePrice: number;
  retailPrice: number;
  vatPercentage: number; // e.g. 15
  quantity: number;
  minQuantity: number; // backward compatibility with reorderLevel
  reorderLevel?: number; // mapping
  maxQuantity: number;
  imageUrl?: string;
  weight?: string;
  volume?: string;
  alcoholPercentage?: number;
  expiryDate?: string; // YYYY-MM-DD
  batchNumber?: string;
  location: string; // Shelf, Aisle, etc.
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  updatedAt: string;
  createdAt?: string;
}

export interface Supplier {
  id: string;
  shopId?: string;
  company: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  balance: number;
  purchaseHistoryCount: number;
  createdAt?: string;
}

export interface Customer {
  id: string;
  shopId?: string;
  customerNumber: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  loyaltyPoints: number;
  discountLevel: number; // Percentage discount
  purchaseHistoryCount: number;
  createdAt?: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  name: string;
  barcode: string;
  quantity: number;
  price: number; // Selling price
  discount: number; // Absolute discount per item
  tax: number; // Calculated tax
  subtotal: number; // (Price - Discount) * Quantity
}

export type PaymentMethod = 'Cash' | 'Card' | 'EcoCash' | 'OneMoney' | 'Bank Transfer' | 'Mixed';

export interface Sale {
  id: string;
  shopId?: string;
  branchId: string;
  cashierId: string;
  cashierName: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  paymentMethod: PaymentMethod;
  payments: {
    cash?: number;
    card?: number;
    ecoCash?: number;
    oneMoney?: number;
    bankTransfer?: number;
  };
  changeDue: number;
  status: 'Completed' | 'Suspended' | 'Returned' | 'Refunded';
  timestamp: string;
  isOffline?: boolean;
  syncedAt?: string;
  createdAt?: string;
  tax?: number; // mapping/compat
  discount?: number; // mapping/compat
}

export interface PurchaseOrder {
  id: string;
  shopId?: string;
  branchId: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  items: {
    productId: string;
    name: string;
    quantityOrdered: number;
    quantityReceived: number;
    purchasePrice: number;
  }[];
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: 'Pending' | 'Partial' | 'Received' | 'Cancelled';
  invoiceNumber?: string;
  createdAt: string;
  receivedAt?: string;
}

export interface AuditLog {
  id: string;
  shopId?: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  timestamp: string;
  branchId: string;
  ipAddress?: string;
  device?: string;
}

export interface Expense {
  id: string;
  shopId?: string;
  branchId: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  shopId?: string;
  fromBranchId?: string;
  toBranchId?: string;
  productId: string;
  productName: string;
  quantity: number;
  type: 'Transfer' | 'Adjustment' | 'Received' | 'Sale';
  status: 'Pending' | 'Approved' | 'Completed' | 'Cancelled';
  initiatedBy: string;
  approvedBy?: string;
  timestamp: string;
}

export interface Return {
  id: string;
  shopId?: string;
  branchId: string;
  saleId: string;
  invoiceNumber: string;
  items: {
    productId: string;
    name: string;
    quantity: number;
    refundAmount: number;
    reason: string;
  }[];
  totalRefund: number;
  timestamp: string;
}

export interface SyncQueueItem {
  id: string; // UUID
  table: 'products' | 'sales' | 'suppliers' | 'customers' | 'purchases' | 'stock_adjustments';
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface Quotation {
  id: string;
  shopId?: string;
  branchId: string;
  quotationNumber: string;
  cashierId: string;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  status: 'Pending' | 'Accepted' | 'Declined' | 'Expired';
  validUntil: string;
  timestamp: string;
  notes?: string;
  isOffline?: boolean;
}

export interface EmailNotification {
  id: string;
  shopId?: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  bodyHtml: string;
  sentAt: string;
  status: 'Delivered' | 'Pending' | 'Failed';
  role: UserRole;
  credentials: {
    username: string;
    password?: string;
    loginUrl: string;
    shopName?: string;
  };
}
