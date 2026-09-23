/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Shop, User, Branch, Product, Supplier, Customer, Sale, PurchaseOrder, AuditLog, Quotation, Expense, StockMovement, Return, UserRole, EmailNotification 
} from './types.ts';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_DIR = path.join(process.cwd(), '.data');
const DB_FILE_PATH = path.join(DB_DIR, 'db_sim_store.json');
const LEGACY_DB_FILE_PATH = path.join(process.cwd(), 'db_sim_store.json');

// Helper to hash passwords synchronously for the static seed data
function hashPasswordSync(password: string): string {
  return bcrypt.hashSync(password, 10);
}

// Initial Mock Data
export const initialShops: Shop[] = [
  {
    id: 'shop_default',
    shopName: 'Cobult Retail Harare',
    ownerName: 'Owner User',
    email: 'owner@cobult.com',
    phone: '+263771111111',
    subscriptionPlan: 'Yearly',
    subscriptionStatus: 'Active',
    expiryDate: '2028-12-31',
    status: 'Active',
    createdAt: new Date().toISOString()
  }
];

export const initialBranches: Branch[] = [
  { id: 'b1', shopId: 'shop_default', name: 'Harare CBD Branch', address: '123 Samora Machel Ave, Harare', phone: '+263771111222', createdAt: new Date().toISOString() },
  { id: 'b2', shopId: 'shop_default', name: 'Bulawayo City Branch', address: '45 Fife St, Bulawayo', phone: '+263772222333', createdAt: new Date().toISOString() },
  { id: 'b3', shopId: 'shop_default', name: 'Masvingo City Branch', address: '10 Hughes St, Masvingo', phone: '+263773333444', createdAt: new Date().toISOString() },
];

export const initialUsers: User[] = [
  // Super Admin
  { 
    id: 'u_admin', 
    shopId: 'super_admin_shop', // Special shopId or empty
    branchId: '', 
    username: 'superadmin', 
    fullname: 'Super Admin', 
    email: 'admin@cobult.com', 
    role: UserRole.SUPER_ADMIN, 
    passwordHash: hashPasswordSync('superadmin'), 
    status: 'Active', 
    createdAt: new Date().toISOString(),
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'
  },
  // Shop Owner
  { 
    id: 'u1', 
    shopId: 'shop_default', 
    branchId: 'b1', 
    username: 'owner', 
    fullname: 'Shop Owner', 
    email: 'owner@cobult.com', 
    role: UserRole.OWNER, 
    passwordHash: hashPasswordSync('owner123'), 
    status: 'Active', 
    createdAt: new Date().toISOString(),
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop' 
  },
  // Manager
  { 
    id: 'u2', 
    shopId: 'shop_default', 
    branchId: 'b1', 
    username: 'manager_harare', 
    fullname: 'Harare Manager', 
    email: 'manager.h@cobult.com', 
    role: UserRole.MANAGER, 
    passwordHash: hashPasswordSync('manager123'), 
    status: 'Active', 
    createdAt: new Date().toISOString(),
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop' 
  },
  // Cashiers
  { 
    id: 'u3', 
    shopId: 'shop_default', 
    branchId: 'b1', 
    username: 'cashier_harare', 
    fullname: 'Harare Cashier', 
    email: 'cashier.h@cobult.com', 
    role: UserRole.CASHIER, 
    passwordHash: hashPasswordSync('cashier123'), 
    status: 'Active', 
    createdAt: new Date().toISOString(),
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop' 
  },
  { 
    id: 'u4', 
    shopId: 'shop_default', 
    branchId: 'b2', 
    username: 'cashier_byo', 
    fullname: 'Bulawayo Cashier', 
    email: 'cashier.b@cobult.com', 
    role: UserRole.CASHIER, 
    passwordHash: hashPasswordSync('cashier123'), 
    status: 'Active', 
    createdAt: new Date().toISOString(),
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' 
  },
];

export const initialSuppliers: Supplier[] = [
  { id: 's1', shopId: 'shop_default', company: 'Delta Beverages', contactPerson: 'Charles Chiri', phone: '+263771111222', email: 'sales@deltabev.co.zw', address: 'Sable House, Northridge Park, Harare', balance: 450.00, purchaseHistoryCount: 15 },
  { id: 's2', shopId: 'shop_default', company: 'National Foods', contactPerson: 'Tendai Mutasa', phone: '+263772222333', email: 'orders@natfoods.co.zw', address: '10 Stirling Rd, Harare', balance: 1200.00, purchaseHistoryCount: 22 },
  { id: 's3', shopId: 'shop_default', company: 'African Distillers (Afdis)', contactPerson: 'Sipho Ndlovu', phone: '+263773333444', email: 'support@afdis.co.zw', address: 'Stapleford, Harare', balance: 0.00, purchaseHistoryCount: 8 },
  { id: 's4', shopId: 'shop_default', company: 'Dairibord Zimbabwe', contactPerson: 'Grace Moyo', phone: '+263774444555', email: 'info@dairibord.co.zw', address: '1226 Rekayi Tangwena Ave, Harare', balance: 150.00, purchaseHistoryCount: 19 },
];

export const initialCustomers: Customer[] = [
  { id: 'c1', shopId: 'shop_default', customerNumber: 'CUST-001', name: 'Tinashe Moyo', phone: '+263775555666', email: 'tinashe@gmail.com', address: 'Block 4, Avondale Flats, Harare', loyaltyPoints: 120, discountLevel: 5, purchaseHistoryCount: 12 },
  { id: 'c2', shopId: 'shop_default', customerNumber: 'CUST-002', name: 'Sarah Jenkins', phone: '+263776666777', email: 'sarah.j@outlook.com', address: '14 Burnside Rd, Bulawayo', loyaltyPoints: 340, discountLevel: 10, purchaseHistoryCount: 28 },
  { id: 'c3', shopId: 'shop_default', customerNumber: 'CUST-003', name: 'John Doe', phone: '+263777777888', email: 'john.doe@gmail.com', address: '55 Enterprise Rd, Harare', loyaltyPoints: 45, discountLevel: 0, purchaseHistoryCount: 5 },
];

export const initialProducts: Product[] = [
  // Branch 1 - Harare Products
  {
    id: 'p1_b1',
    shopId: 'shop_default',
    barcode: '6001108000011',
    sku: 'ALC-CSL-375',
    name: 'Castle Lager 375ml',
    description: 'Delta Beverages premium golden lager beer bottle.',
    category: 'Alcohol & Beverages',
    brand: 'Castle Lager',
    supplierId: 's1',
    purchasePrice: 0.85,
    sellingPrice: 1.20,
    wholesalePrice: 1.05,
    retailPrice: 1.20,
    vatPercentage: 15,
    quantity: 144,
    minQuantity: 48,
    maxQuantity: 500,
    imageUrl: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=300&h=300&fit=crop',
    weight: '0.65kg',
    volume: '375ml',
    alcoholPercentage: 5.0,
    expiryDate: '2027-02-15',
    batchNumber: 'B-CSL-1029',
    location: 'Aisle 1, Shelf B',
    status: 'In Stock',
    branchId: 'b1',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p2_b1',
    shopId: 'shop_default',
    barcode: '6001108011234',
    sku: 'ALC-HEI-330',
    name: 'Heineken Lager Can 330ml',
    description: 'Imported European premium pilsner beer can.',
    category: 'Alcohol & Beverages',
    brand: 'Heineken',
    supplierId: 's1',
    purchasePrice: 1.10,
    sellingPrice: 1.80,
    wholesalePrice: 1.50,
    retailPrice: 1.80,
    vatPercentage: 15,
    quantity: 12,
    minQuantity: 30,
    maxQuantity: 200,
    imageUrl: 'https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=300&h=300&fit=crop',
    weight: '0.35kg',
    volume: '330ml',
    alcoholPercentage: 5.0,
    expiryDate: '2026-12-01',
    batchNumber: 'HNK-Y819',
    location: 'Fridge 1, Shelf A',
    status: 'Low Stock',
    branchId: 'b1',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p3_b1',
    shopId: 'shop_default',
    barcode: '5449000000996',
    sku: 'GRC-COKE-500',
    name: 'Coca-Cola 500ml',
    description: 'Refreshing carbonated soft drink pet bottle.',
    category: 'Groceries & Soft Drinks',
    brand: 'Coca-Cola',
    supplierId: 's1',
    purchasePrice: 0.45,
    sellingPrice: 0.75,
    wholesalePrice: 0.60,
    retailPrice: 0.75,
    vatPercentage: 15,
    quantity: 240,
    minQuantity: 50,
    maxQuantity: 1000,
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&h=300&fit=crop',
    weight: '0.52kg',
    volume: '500ml',
    alcoholPercentage: 0,
    expiryDate: '2027-04-10',
    batchNumber: 'CC-491-X',
    location: 'Fridge 2, Shelf B',
    status: 'In Stock',
    branchId: 'b1',
    updatedAt: new Date().toISOString(),
  }
];

export const initialSales: Sale[] = [
  {
    id: 's_1001',
    shopId: 'shop_default',
    invoiceNumber: 'INV-20260713-101',
    cashierId: 'u3',
    cashierName: 'Harare Cashier',
    customerId: 'c1',
    customerName: 'Tinashe Moyo',
    items: [
      {
        id: 'si_1',
        productId: 'p1_b1',
        name: 'Castle Lager 375ml',
        barcode: '6001108000011',
        quantity: 6,
        price: 1.20,
        discount: 0,
        tax: 0.94,
        subtotal: 7.20,
      }
    ],
    subtotal: 7.20,
    discountTotal: 0,
    taxTotal: 0.94,
    total: 8.14,
    paymentMethod: 'Cash',
    payments: { cash: 10.00 },
    changeDue: 1.86,
    status: 'Completed',
    timestamp: new Date().toISOString(),
    branchId: 'b1',
  }
];

export const initialPurchases: PurchaseOrder[] = [
  {
    id: 'po_1001',
    shopId: 'shop_default',
    branchId: 'b1',
    orderNumber: 'PO-20260701-101',
    supplierId: 's1',
    supplierName: 'Delta Beverages',
    items: [
      { productId: 'p1_b1', name: 'Castle Lager 375ml', quantityOrdered: 240, quantityReceived: 240, purchasePrice: 0.85 }
    ],
    totalAmount: 204.00,
    paidAmount: 204.00,
    balance: 0.00,
    status: 'Received',
    invoiceNumber: 'DEL-99120',
    createdAt: new Date().toISOString(),
  }
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'a1',
    shopId: 'shop_default',
    userId: 'u1',
    userName: 'Shop Owner',
    userRole: UserRole.OWNER,
    action: 'LOGIN',
    details: 'User Shop Owner logged in successfully from POS Terminal 1',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    branchId: 'b1',
    ipAddress: '192.168.1.50',
    device: 'Desktop Chrome / Windows'
  },
  {
    id: 'a2',
    shopId: 'shop_default',
    userId: 'u3',
    userName: 'Harare Cashier',
    userRole: UserRole.CASHIER,
    action: 'NEW_SALE',
    details: 'Completed Sale INV-20260713-101 for $8.14 (Payment: Cash)',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    branchId: 'b1',
    ipAddress: '192.168.1.52',
    device: 'POS Touch Terminal'
  },
  {
    id: 'a3',
    shopId: 'shop_default',
    userId: 'u2',
    userName: 'Harare Manager',
    userRole: UserRole.MANAGER,
    action: 'UPDATE_PRODUCT',
    details: 'Updated price of product Castle Lager 375ml from $1.10 to $1.20',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    branchId: 'b1',
    ipAddress: '192.168.1.51',
    device: 'Mobile Tablet App'
  },
  {
    id: 'a4',
    shopId: 'shop_default',
    userId: 'u2',
    userName: 'Harare Manager',
    userRole: UserRole.MANAGER,
    action: 'DELETE_SALE',
    details: 'Deleted Sale INV-20260712-089 worth $42.50 (Reason: Duplicate customer charge refund)',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    branchId: 'b1',
    ipAddress: '192.168.1.51',
    device: 'Desktop Firefox / Linux'
  },
  {
    id: 'a5',
    shopId: 'shop_default',
    userId: 'u4',
    userName: 'Bulawayo Cashier',
    userRole: UserRole.CASHIER,
    action: 'LOGIN',
    details: 'User Bulawayo Cashier logged in successfully from Terminal 2',
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    branchId: 'b2',
    ipAddress: '192.168.2.10',
    device: 'POS Touch Terminal'
  },
  {
    id: 'a6',
    shopId: 'shop_default',
    userId: 'u1',
    userName: 'Shop Owner',
    userRole: UserRole.OWNER,
    action: 'STOCK_TRANSFER',
    details: 'Initiated stock transfer: Heineken Lager Can 330ml (qty: 24) from Harare CBD to Bulawayo',
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    branchId: 'b1',
    ipAddress: '192.168.1.50',
    device: 'Desktop Chrome / macOS'
  },
  {
    id: 'a7',
    shopId: 'shop_default',
    userId: 'u1',
    userName: 'Shop Owner',
    userRole: UserRole.OWNER,
    action: 'PROVISION_USER',
    details: 'Created Cashier user: Bulawayo Cashier (cashier_byo) and sent email credentials',
    timestamp: new Date(Date.now() - 1000 * 60 * 1440).toISOString(),
    branchId: 'b1',
    ipAddress: '192.168.1.50',
    device: 'Desktop Chrome / macOS'
  }
];

export interface DBStore {
  shops: Shop[];
  branches: Branch[];
  users: User[];
  suppliers: Supplier[];
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  purchases: PurchaseOrder[];
  auditLogs: AuditLog[];
  quotations: Quotation[];
  expenses: Expense[];
  stockMovements: StockMovement[];
  returns: Return[];
  emails: EmailNotification[];
}

export const getStore = (): DBStore => {
  try {
    const filePathToRead = fs.existsSync(DB_FILE_PATH) ? DB_FILE_PATH : (fs.existsSync(LEGACY_DB_FILE_PATH) ? LEGACY_DB_FILE_PATH : null);
    if (filePathToRead) {
      const content = fs.readFileSync(filePathToRead, 'utf-8');
      const store = JSON.parse(content);
      // Ensure all SaaS-level lists exist in the saved file
      let modified = false;
      if (!store.shops) { store.shops = initialShops; modified = true; }
      if (!store.expenses) { store.expenses = []; modified = true; }
      if (!store.stockMovements) { store.stockMovements = []; modified = true; }
      if (!store.returns) { store.returns = []; modified = true; }
      if (!store.quotations) { store.quotations = []; modified = true; }
      if (!store.emails) { store.emails = []; modified = true; }
      
      // Repair legacy users while preserving passwords that were already set.
      if (store.users && Array.isArray(store.users)) {
        const seedUsersById = new Map(initialUsers.map(user => [user.id, user]));
        store.users = store.users.map((user: User) => {
          const seedUser = seedUsersById.get(user.id);
          if (!seedUser) return user;

          const repairedUser = {
            ...seedUser,
            ...user,
            shopId: user.shopId || seedUser.shopId,
            branchId: user.branchId || seedUser.branchId,
            passwordHash: user.passwordHash || seedUser.passwordHash,
            status: user.status || seedUser.status,
          };

          if (JSON.stringify(repairedUser) !== JSON.stringify(user)) modified = true;
          return repairedUser;
        });
      }

      if (modified || filePathToRead === LEGACY_DB_FILE_PATH) {
        saveStore(store);
      }
      return store;
    }
  } catch (error) {
    console.error('Failed to read db_sim_store.json, creating a new one...', error);
  }

  // Generate initial file if not exists
  const store: DBStore = {
    shops: initialShops,
    branches: initialBranches,
    users: initialUsers,
    suppliers: initialSuppliers,
    customers: initialCustomers,
    products: initialProducts,
    sales: initialSales,
    purchases: initialPurchases,
    auditLogs: initialAuditLogs,
    quotations: [],
    expenses: [],
    stockMovements: [],
    returns: [],
    emails: []
  };
  saveStore(store);
  return store;
};

export const saveStore = (store: DBStore) => {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save db_sim_store.json', error);
  }
};
