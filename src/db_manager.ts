/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MongoClient, Db, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import { getStore, saveStore, DBStore, initialShops } from './db_sim.ts';

dotenv.config();
import { 
  Shop, User, Branch, Product, Supplier, Customer, Sale, PurchaseOrder, AuditLog, Quotation, Expense, StockMovement, Return, UserRole, EmailNotification 
} from './types.ts';

let mongoClient: MongoClient | null = null;
let db: Db | null = null;
let mongoConnectionPromise: Promise<Db | null> | null = null;
let mongoLastFailureAt = 0;
const MONGO_RETRY_DELAY_MS = 30_000;

/**
 * Clean MongoDB internal properties (_id) from the document
 * to prevent any serialization or type issues.
 */
function cleanDoc<T>(doc: any): T {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  if (!rest.id && _id) {
    rest.id = typeof _id === 'string' ? _id : _id.toString();
  }
  return rest as T;
}

function cleanDocs<T>(docs: any[]): T[] {
  return docs.map(doc => cleanDoc<T>(doc));
}

/**
 * Connect to MongoDB Atlas. Falls back gracefully to null on error.
 */
export async function getDb(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri || (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://'))) {
    return null;
  }

  if (db) {
    return db;
  }

  if (mongoConnectionPromise) {
    return mongoConnectionPromise;
  }

  if (Date.now() - mongoLastFailureAt < MONGO_RETRY_DELAY_MS) {
    return null;
  }

  mongoConnectionPromise = (async () => {
    console.log('[MongoDB] Attempting to connect to Atlas...');
    const client = new MongoClient(uri, {
      connectTimeoutMS: 3000,
      socketTimeoutMS: 3000,
      serverSelectionTimeoutMS: 3000,
    });
    try {
      await client.connect();
      const activeDb = client.db();
      await activeDb.command({ ping: 1 });
      console.log('[MongoDB] Connection to Atlas established and verified successfully.');

      mongoClient = client;
      db = activeDb;

      await seedDatabaseIfNeeded(activeDb);

      console.log('[MongoDB] Optimizing database indexes...');
      await activeDb.collection('shops').createIndex({ id: 1 }, { unique: true });
      await activeDb.collection('users').createIndex({ shopId: 1, username: 1 }, { unique: true });
      await activeDb.collection('users').createIndex({ email: 1 });
      await activeDb.collection('branches').createIndex({ shopId: 1, id: 1 });
      await activeDb.collection('products').createIndex({ shopId: 1, barcode: 1 });
      await activeDb.collection('products').createIndex({ shopId: 1, branchId: 1 });
      await activeDb.collection('sales').createIndex({ shopId: 1, invoiceNumber: 1 });
      await activeDb.collection('sales').createIndex({ shopId: 1, branchId: 1 });
      await activeDb.collection('suppliers').createIndex({ shopId: 1, id: 1 });
      await activeDb.collection('customers').createIndex({ shopId: 1, id: 1 });
      await activeDb.collection('expenses').createIndex({ shopId: 1, branchId: 1 });
      await activeDb.collection('purchases').createIndex({ shopId: 1, branchId: 1 });
      await activeDb.collection('stockMovements').createIndex({ shopId: 1 });
      await activeDb.collection('returns').createIndex({ shopId: 1 });
      await activeDb.collection('auditLogs').createIndex({ shopId: 1, timestamp: -1 });

      return activeDb;
    } catch (error) {
      mongoLastFailureAt = Date.now();
      await client.close().catch(() => undefined);
      console.error('[MongoDB] Connection failed. Fallback to local simulated storage:', error);
      return null;
    } finally {
      mongoConnectionPromise = null;
    }
  })();

  return mongoConnectionPromise;
}

/**
 * Seed MongoDB collections with the initial SaaS baseline datasets on connection and sync missing records.
 */
async function seedDatabaseIfNeeded(database: Db) {
  const store = getStore();
  const collectionsToSeed = [
    { name: 'shops', data: store.shops },
    { name: 'branches', data: store.branches },
    { name: 'users', data: store.users },
    { name: 'suppliers', data: store.suppliers },
    { name: 'customers', data: store.customers },
    { name: 'products', data: store.products },
    { name: 'sales', data: store.sales },
    { name: 'purchases', data: store.purchases },
    { name: 'auditLogs', data: store.auditLogs },
    { name: 'quotations', data: store.quotations },
    { name: 'expenses', data: store.expenses || [] },
    { name: 'stockMovements', data: store.stockMovements || [] },
    { name: 'returns', data: store.returns || [] },
    { name: 'emails', data: store.emails || [] }
  ];

  for (const col of collectionsToSeed) {
    try {
      const count = await database.collection(col.name).countDocuments();
      if (count === 0 && col.data.length > 0) {
        console.log(`[MongoDB] Seeding collection "${col.name}" with ${col.data.length} baseline records...`);
        await database.collection(col.name).insertMany(col.data);
      } else if (col.data.length > 0) {
        // Repair only missing fields in existing records; never overwrite passwords or user edits.
        for (const item of col.data) {
          if (item && item.id) {
            await database.collection(col.name).updateOne({ id: item.id }, { $setOnInsert: { ...item } }, { upsert: true });
            if (col.name === 'users') {
              const userItem = item as User;
              await database.collection(col.name).updateOne(
                { id: item.id },
                { $set: { shopId: userItem.shopId, branchId: userItem.branchId, status: userItem.status } }
              );
              await database.collection(col.name).updateOne(
                { id: item.id, $or: [{ passwordHash: { $exists: false } }, { passwordHash: null }, { passwordHash: '' }] },
                { $set: { passwordHash: userItem.passwordHash } }
              );
            }
          }
        }
      }
    } catch (err) {
      console.error(`[MongoDB] Failed to seed collection "${col.name}":`, err);
    }
  }
}

// ==========================================
// 1. SHOPS (TENANTS) OPERATIONS
// ==========================================

export async function getShops(): Promise<Shop[]> {
  const store = getStore();
  let dbShops: Shop[] = [];
  try {
    const database = await getDb();
    if (database) {
      const docs = await database.collection('shops').find().toArray();
      dbShops = cleanDocs<Shop>(docs);
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to fetch shops:', error);
  }

  const shopMap = new Map<string, Shop>();

  // 1. Initial baseline shops (like shop_default)
  for (const s of initialShops) {
    if (s && s.id) shopMap.set(s.id, s);
  }

  // 2. Local memory / json store shops
  if (store.shops && Array.isArray(store.shops)) {
    for (const s of store.shops) {
      if (s) {
        const id = s.id || (s as any)._id?.toString();
        if (id) shopMap.set(id, { ...s, id });
      }
    }
  }

  // 3. Database shops
  for (const s of dbShops) {
    if (s) {
      const id = s.id || (s as any)._id?.toString();
      if (id) shopMap.set(id, { ...s, id });
    }
  }

  const mergedShops = Array.from(shopMap.values());
  store.shops = mergedShops;
  saveStore(store);
  return mergedShops;
}

export async function getShopById(id: string): Promise<Shop | null> {
  try {
    const database = await getDb();
    if (database) {
      const doc = await database.collection('shops').findOne({ id });
      if (doc) return cleanDoc<Shop>(doc);
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to fetch shop:', error);
  }

  const store = getStore();
  return store.shops.find(shop => shop.id === id) || initialShops.find(shop => shop.id === id) || null;
}

export async function saveShop(shop: Shop): Promise<Shop> {
  // Always update local memory & file store for offline availability
  const store = getStore();
  const existingIdx = store.shops.findIndex(s => s.id === shop.id);
  if (existingIdx !== -1) {
    store.shops[existingIdx] = shop;
  } else {
    store.shops.push(shop);
  }
  saveStore(store);

  try {
    const database = await getDb();
    if (database) {
      await database.collection('shops').replaceOne({ id: shop.id }, { ...shop }, { upsert: true });
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to save shop:', error);
  }
  return shop;
}

export async function updateShop(id: string, shopData: Partial<Shop>): Promise<Shop | null> {
  const store = getStore();
  const idx = store.shops.findIndex(s => s.id === id);
  let updated: Shop | null = null;
  if (idx !== -1) {
    store.shops[idx] = { ...store.shops[idx], ...shopData };
    saveStore(store);
    updated = store.shops[idx];
  }

  try {
    const database = await getDb();
    if (database) {
      const res = await database.collection('shops').findOneAndUpdate(
        { id },
        { $set: shopData },
        { returnDocument: 'after' }
      );
      if (res) updated = cleanDoc<Shop>(res);
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to update shop:', error);
  }
  return updated;
}

export async function deleteShop(id: string): Promise<boolean> {
  const store = getStore();
  const initialShopCount = store.shops.length;
  
  // Clean from local file / memory store
  store.shops = store.shops.filter(s => s.id !== id);
  store.users = store.users.filter(u => u.shopId !== id);
  store.branches = store.branches.filter(b => b.shopId !== id);
  store.products = store.products.filter(p => p.shopId !== id);
  store.sales = store.sales.filter(s => s.shopId !== id);
  store.purchases = store.purchases.filter(p => p.shopId !== id);
  store.expenses = store.expenses.filter(e => e.shopId !== id);
  store.quotations = store.quotations.filter(q => q.shopId !== id);
  store.returns = store.returns.filter(r => r.shopId !== id);
  store.stockMovements = store.stockMovements.filter(sm => sm.shopId !== id);
  if (store.emails) store.emails = store.emails.filter(e => e.shopId !== id);
  saveStore(store);

  const localDeleted = store.shops.length < initialShopCount;
  let dbDeleted = false;

  try {
    const database = await getDb();
    if (database) {
      const orConditions: any[] = [{ id }, { shopId: id }];
      if (ObjectId.isValid(id)) {
        orConditions.push({ _id: new ObjectId(id) });
      }
      
      const shopDelRes = await database.collection('shops').deleteMany({ $or: orConditions });
      await database.collection('users').deleteMany({ shopId: id });
      await database.collection('branches').deleteMany({ shopId: id });
      await database.collection('products').deleteMany({ shopId: id });
      await database.collection('sales').deleteMany({ shopId: id });
      await database.collection('purchases').deleteMany({ shopId: id });
      await database.collection('expenses').deleteMany({ shopId: id });
      await database.collection('quotations').deleteMany({ shopId: id });
      await database.collection('returns').deleteMany({ shopId: id });
      await database.collection('stockMovements').deleteMany({ shopId: id });
      await database.collection('emails').deleteMany({ shopId: id });
      
      dbDeleted = shopDelRes.deletedCount > 0;
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to delete shop:', error);
  }

  return dbDeleted || localDeleted || true;
}

// ==========================================
// 2. BRANCHES OPERATIONS
// ==========================================

export async function getBranches(shopId: string = 'shop_default'): Promise<Branch[]> {
  try {
    const database = await getDb();
    if (database) {
      const filter = shopId === 'super_admin_shop' ? {} : { shopId };
      const docs = await database.collection('branches').find(filter).toArray();
      return cleanDocs<Branch>(docs);
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to fetch branches:', error);
  }
  const branches = getStore().branches;
  if (shopId === 'super_admin_shop') return branches;
  return branches.filter(b => b.shopId === shopId);
}

export async function saveBranch(branch: Branch): Promise<Branch> {
  const store = getStore();
  const existingIdx = store.branches.findIndex(b => b.id === branch.id);
  if (existingIdx !== -1) {
    store.branches[existingIdx] = branch;
  } else {
    store.branches.push(branch);
  }
  saveStore(store);

  try {
    const database = await getDb();
    if (database) {
      await database.collection('branches').replaceOne({ id: branch.id }, { ...branch }, { upsert: true });
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to save branch:', error);
  }
  return branch;
}

// ==========================================
// 3. USERS OPERATIONS
// ==========================================

export async function getUsers(shopId: string = 'shop_default'): Promise<User[]> {
  const store = getStore();
  let dbUsers: User[] = [];
  try {
    const database = await getDb();
    if (database) {
      const filter = shopId === 'super_admin_shop' ? {} : { shopId };
      const docs = await database.collection('users').find(filter).toArray();
      dbUsers = cleanDocs<User>(docs);
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to fetch users:', error);
  }

  const userMap = new Map<string, User>();

  // 1. Local store users
  if (store.users && Array.isArray(store.users)) {
    for (const u of store.users) {
      if (u) {
        const id = u.id || (u as any)._id?.toString();
        if (id) userMap.set(id, { ...u, id });
      }
    }
  }

  // 2. DB users
  for (const u of dbUsers) {
    if (u) {
      const id = u.id || (u as any)._id?.toString();
      if (id) userMap.set(id, { ...u, id });
    }
  }

  const allUsers = Array.from(userMap.values());
  if (shopId === 'super_admin_shop') return allUsers;
  return allUsers.filter(u => u.shopId === shopId);
}

export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    const database = await getDb();
    if (database) {
      const doc = await database.collection('users').findOne({
        username: { $regex: new RegExp(`^${username.replace(/[-[\]{}()*+?.:=\\^$|#\s]/g, '\\$&')}$`, 'i') }
      });
      if (doc) return cleanDoc<User>(doc);
    }
  } catch (err) {
    console.error('[MongoDB Error] getUserByUsername failed:', err);
  }
  const store = getStore();
  const user = store.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  return user || null;
}

export async function saveUser(user: User): Promise<User> {
  const store = getStore();
  const existingIdx = store.users.findIndex(u => u.id === user.id);
  if (existingIdx !== -1) {
    store.users[existingIdx] = user;
  } else {
    store.users.push(user);
  }
  saveStore(store);

  try {
    const database = await getDb();
    if (database) {
      await database.collection('users').replaceOne({ id: user.id }, { ...user }, { upsert: true });
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to save user:', error);
  }
  return user;
}

export async function updateUser(id: string, userData: Partial<User>): Promise<User | null> {
  const store = getStore();
  const idx = store.users.findIndex(u => u.id === id);
  let updated: User | null = null;
  if (idx !== -1) {
    store.users[idx] = { ...store.users[idx], ...userData };
    saveStore(store);
    updated = store.users[idx];
  }

  try {
    const database = await getDb();
    if (database) {
      const res = await database.collection('users').findOneAndUpdate(
        { id },
        { $set: userData },
        { returnDocument: 'after' }
      );
      if (res) updated = cleanDoc<User>(res);
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to update user:', error);
  }
  return updated;
}

// ==========================================
// 4. SUPPLIERS OPERATIONS
// ==========================================

export async function getSuppliers(shopId: string = 'shop_default'): Promise<Supplier[]> {
  try {
    const database = await getDb();
    if (database) {
      const filter = shopId === 'super_admin_shop' ? {} : { shopId };
      const docs = await database.collection('suppliers').find(filter).toArray();
      return cleanDocs<Supplier>(docs);
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to fetch suppliers:', error);
  }
  const suppliers = getStore().suppliers;
  if (shopId === 'super_admin_shop') return suppliers;
  return suppliers.filter(s => s.shopId === shopId);
}

export async function saveSupplier(supplier: Supplier): Promise<Supplier> {
  const store = getStore();
  const existingIdx = store.suppliers.findIndex(s => s.id === supplier.id);
  if (existingIdx !== -1) {
    store.suppliers[existingIdx] = supplier;
  } else {
    store.suppliers.push(supplier);
  }
  saveStore(store);

  try {
    const database = await getDb();
    if (database) {
      await database.collection('suppliers').replaceOne({ id: supplier.id }, { ...supplier }, { upsert: true });
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to save supplier:', error);
  }
  return supplier;
}

// ==========================================
// 5. CUSTOMERS OPERATIONS
// ==========================================

export async function getCustomers(shopId: string = 'shop_default'): Promise<Customer[]> {
  try {
    const database = await getDb();
    if (database) {
      const filter = shopId === 'super_admin_shop' ? {} : { shopId };
      const docs = await database.collection('customers').find(filter).toArray();
      return cleanDocs<Customer>(docs);
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to fetch customers:', error);
  }
  const customers = getStore().customers;
  if (shopId === 'super_admin_shop') return customers;
  return customers.filter(c => c.shopId === shopId);
}

export async function saveCustomer(customer: Customer): Promise<Customer> {
  const store = getStore();
  const existingIdx = store.customers.findIndex(c => c.id === customer.id);
  if (existingIdx !== -1) {
    store.customers[existingIdx] = customer;
  } else {
    store.customers.push(customer);
  }
  saveStore(store);

  try {
    const database = await getDb();
    if (database) {
      await database.collection('customers').replaceOne({ id: customer.id }, { ...customer }, { upsert: true });
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to save customer:', error);
  }
  return customer;
}

// ==========================================
// 6. PRODUCTS OPERATIONS
// ==========================================

export async function getProducts(branchId: string, shopId: string = 'shop_default'): Promise<Product[]> {
  try {
    const database = await getDb();
    if (database) {
      const filter: any = {};
      if (shopId !== 'super_admin_shop') {
        filter.shopId = shopId;
      }
      if (branchId !== 'all') {
        filter.branchId = branchId;
      }
      const docs = await database.collection('products').find(filter).toArray();
      return cleanDocs<Product>(docs);
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to fetch products:', error);
  }
  const products = getStore().products;
  let list = shopId === 'super_admin_shop' ? products : products.filter(p => p.shopId === shopId);
  if (branchId !== 'all') {
    list = list.filter(p => p.branchId === branchId);
  }
  return list;
}

export async function saveProduct(product: Product): Promise<Product> {
  const store = getStore();
  const existingIdx = store.products.findIndex(p => p.id === product.id && p.shopId === product.shopId);
  if (existingIdx !== -1) {
    store.products[existingIdx] = product;
  } else {
    store.products.push(product);
  }
  saveStore(store);

  try {
    const database = await getDb();
    if (database) {
      await database.collection('products').replaceOne({ id: product.id }, { ...product }, { upsert: true });
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to save product:', error);
  }
  return product;
}

export async function updateProduct(id: string, productData: Partial<Product>, shopId: string = 'shop_default'): Promise<Product | null> {
  const store = getStore();
  const idx = store.products.findIndex(p => p.id === id && (shopId === 'super_admin_shop' || p.shopId === shopId));
  let updatedProduct: Product | null = null;
  if (idx !== -1) {
    const existing = store.products[idx];
    const quantity = productData.quantity !== undefined ? productData.quantity : existing.quantity;
    const minQuantity = productData.minQuantity !== undefined ? productData.minQuantity : existing.minQuantity;
    const updatedStatus = quantity === 0 ? 'Out of Stock' : quantity <= minQuantity ? 'Low Stock' : 'In Stock';

    updatedProduct = {
      ...existing,
      ...productData,
      status: updatedStatus,
      updatedAt: new Date().toISOString(),
    };
    store.products[idx] = updatedProduct;
    saveStore(store);
  }

  try {
    const database = await getDb();
    if (database) {
      const filter: any = { id };
      if (shopId !== 'super_admin_shop') {
        filter.shopId = shopId;
      }
      const res = await database.collection('products').findOneAndUpdate(
        filter,
        { $set: { ...productData, updatedAt: new Date().toISOString() } },
        { returnDocument: 'after' }
      );
      if (res) updatedProduct = cleanDoc<Product>(res);
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to update product:', error);
  }

  return updatedProduct;
}

export async function deleteProduct(id: string, shopId: string = 'shop_default'): Promise<boolean> {
  const store = getStore();
  const idx = store.products.findIndex(p => p.id === id && (shopId === 'super_admin_shop' || p.shopId === shopId));
  if (idx !== -1) {
    store.products.splice(idx, 1);
    saveStore(store);
  }

  try {
    const database = await getDb();
    if (database) {
      const filter: any = { id };
      if (shopId !== 'super_admin_shop') {
        filter.shopId = shopId;
      }
      const res = await database.collection('products').deleteOne(filter);
      return res.deletedCount > 0 || idx !== -1;
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to delete product:', error);
  }

  return idx !== -1;
}

// ==========================================
// 7. SALES TRANSACTIONS (POS)
// ==========================================

export async function getSales(branchId: string, shopId: string = 'shop_default'): Promise<Sale[]> {
  try {
    const database = await getDb();
    if (database) {
      const filter: any = {};
      if (shopId !== 'super_admin_shop') {
        filter.shopId = shopId;
      }
      if (branchId !== 'all') {
        filter.branchId = branchId;
      }
      const docs = await database.collection('sales').find(filter).sort({ timestamp: -1 }).toArray();
      return cleanDocs<Sale>(docs);
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to fetch sales:', error);
  }
  const sales = getStore().sales;
  let list = shopId === 'super_admin_shop' ? sales : sales.filter(s => s.shopId === shopId);
  if (branchId !== 'all') {
    list = list.filter(s => s.branchId === branchId);
  }
  return list;
}

export async function saveSale(sale: Sale): Promise<Sale> {
  // Always update local memory/file store first
  const store = getStore();
  for (const item of sale.items) {
    const prod = store.products.find(p => p.id === item.productId && p.shopId === sale.shopId);
    if (prod) {
      prod.quantity = Math.max(0, prod.quantity - item.quantity);
      prod.status = prod.quantity === 0 ? 'Out of Stock' : prod.quantity <= prod.minQuantity ? 'Low Stock' : 'In Stock';
      prod.updatedAt = new Date().toISOString();
    }
  }

  if (sale.customerId) {
    const cust = store.customers.find(c => c.id === sale.customerId && c.shopId === sale.shopId);
    if (cust) {
      cust.loyaltyPoints = (cust.loyaltyPoints || 0) + Math.floor(sale.total / 10);
      cust.purchaseHistoryCount = (cust.purchaseHistoryCount || 0) + 1;
    }
  }

  const existingSaleIdx = store.sales.findIndex(s => s.id === sale.id);
  if (existingSaleIdx !== -1) {
    store.sales[existingSaleIdx] = sale;
  } else {
    store.sales.unshift(sale);
  }
  saveStore(store);

  try {
    const database = await getDb();
    if (database) {
      // Deduct quantities in MongoDB
      for (const item of sale.items) {
        const prod = await database.collection('products').findOne({ id: item.productId, shopId: sale.shopId });
        if (prod) {
          const newQty = Math.max(0, (prod.quantity || 0) - item.quantity);
          const newStatus = newQty === 0 ? 'Out of Stock' : newQty <= (prod.minQuantity || 0) ? 'Low Stock' : 'In Stock';
          await database.collection('products').updateOne(
            { id: item.productId, shopId: sale.shopId },
            { $set: { quantity: newQty, status: newStatus, updatedAt: new Date().toISOString() } }
          );
        }
      }

      // Add loyalty points in MongoDB
      if (sale.customerId) {
        const cust = await database.collection('customers').findOne({ id: sale.customerId, shopId: sale.shopId });
        if (cust) {
          const currentPoints = cust.loyaltyPoints || 0;
          const pointsEarned = Math.floor(sale.total / 10);
          await database.collection('customers').updateOne(
            { id: sale.customerId, shopId: sale.shopId },
            { $set: { loyaltyPoints: currentPoints + pointsEarned, purchaseHistoryCount: (cust.purchaseHistoryCount || 0) + 1 } }
          );
        }
      }

      await database.collection('sales').replaceOne({ id: sale.id }, { ...sale }, { upsert: true });
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to save sale:', error);
  }

  return sale;
}

export async function deleteSale(id: string, shopId: string = 'shop_default'): Promise<boolean> {
  const store = getStore();
  const idx = store.sales.findIndex(s => s.id === id && (shopId === 'super_admin_shop' || s.shopId === shopId));
  if (idx !== -1) {
    store.sales.splice(idx, 1);
    saveStore(store);
  }

  try {
    const database = await getDb();
    if (database) {
      const filter: any = { id };
      if (shopId !== 'super_admin_shop') {
        filter.shopId = shopId;
      }
      const res = await database.collection('sales').deleteOne(filter);
      return res.deletedCount > 0 || idx !== -1;
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to delete sale:', error);
  }

  return idx !== -1;
}

// ==========================================
// 8. PURCHASES & STOCK RECEIVING
// ==========================================

export async function getPurchases(branchId: string, shopId: string = 'shop_default'): Promise<PurchaseOrder[]> {
  try {
    const database = await getDb();
    if (database) {
      const filter: any = {};
      if (shopId !== 'super_admin_shop') {
        filter.shopId = shopId;
      }
      if (branchId !== 'all') {
        filter.branchId = branchId;
      }
      const docs = await database.collection('purchases').find(filter).sort({ createdAt: -1 }).toArray();
      return cleanDocs<PurchaseOrder>(docs);
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to fetch purchases:', error);
  }
  const purchases = getStore().purchases;
  let list = shopId === 'super_admin_shop' ? purchases : purchases.filter(p => p.shopId === shopId);
  if (branchId !== 'all') {
    list = list.filter(p => p.branchId === branchId);
  }
  return list;
}

export async function savePurchase(purchase: PurchaseOrder): Promise<PurchaseOrder> {
  const store = getStore();
  if (purchase.status === 'Received') {
    purchase.items.forEach(item => {
      const prod = store.products.find(p => p.id === item.productId && p.shopId === purchase.shopId);
      if (prod) {
        prod.quantity += item.quantityReceived;
        prod.status = prod.quantity === 0 ? 'Out of Stock' : prod.quantity <= prod.minQuantity ? 'Low Stock' : 'In Stock';
        prod.updatedAt = new Date().toISOString();
      }
    });
  }
  const existingPurIdx = store.purchases.findIndex(p => p.id === purchase.id);
  if (existingPurIdx !== -1) {
    store.purchases[existingPurIdx] = purchase;
  } else {
    store.purchases.unshift(purchase);
  }
  saveStore(store);

  try {
    const database = await getDb();
    if (database) {
      if (purchase.status === 'Received') {
        for (const item of purchase.items) {
          const prod = await database.collection('products').findOne({ id: item.productId, shopId: purchase.shopId });
          if (prod) {
            const newQty = (prod.quantity || 0) + item.quantityReceived;
            const newStatus = newQty === 0 ? 'Out of Stock' : newQty <= (prod.minQuantity || 0) ? 'Low Stock' : 'In Stock';
            await database.collection('products').updateOne(
              { id: item.productId, shopId: purchase.shopId },
              { $set: { quantity: newQty, status: newStatus, updatedAt: new Date().toISOString() } }
            );
          }
        }
      }
      await database.collection('purchases').replaceOne({ id: purchase.id }, { ...purchase }, { upsert: true });
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to save purchase:', error);
  }

  return purchase;
}

// ==========================================
// 9. QUOTATIONS
// ==========================================

export async function getQuotations(branchId: string, shopId: string = 'shop_default'): Promise<Quotation[]> {
  try {
    const database = await getDb();
    if (database) {
      const filter: any = {};
      if (shopId !== 'super_admin_shop') {
        filter.shopId = shopId;
      }
      if (branchId !== 'all') {
        filter.branchId = branchId;
      }
      const docs = await database.collection('quotations').find(filter).sort({ timestamp: -1 }).toArray();
      return cleanDocs<Quotation>(docs);
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to fetch quotations:', error);
  }
  const quotations = getStore().quotations;
  let list = shopId === 'super_admin_shop' ? quotations : quotations.filter(q => q.shopId === shopId);
  if (branchId !== 'all') {
    list = list.filter(q => q.branchId === branchId);
  }
  return list;
}

export async function saveQuotation(quotation: Quotation): Promise<Quotation> {
  const store = getStore();
  const existingQuoteIdx = store.quotations.findIndex(q => q.id === quotation.id);
  if (existingQuoteIdx !== -1) {
    store.quotations[existingQuoteIdx] = quotation;
  } else {
    store.quotations.unshift(quotation);
  }
  saveStore(store);

  try {
    const database = await getDb();
    if (database) {
      await database.collection('quotations').replaceOne({ id: quotation.id }, { ...quotation }, { upsert: true });
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to save quotation:', error);
  }
  return quotation;
}

// ==========================================
// 10. EXPENSES
// ==========================================

export async function getExpenses(branchId: string, shopId: string = 'shop_default'): Promise<Expense[]> {
  try {
    const database = await getDb();
    if (database) {
      const filter: any = {};
      if (shopId !== 'super_admin_shop') {
        filter.shopId = shopId;
      }
      if (branchId !== 'all') {
        filter.branchId = branchId;
      }
      const docs = await database.collection('expenses').find(filter).sort({ date: -1 }).toArray();
      return cleanDocs<Expense>(docs);
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to fetch expenses:', error);
  }
  const store = getStore();
  let list = shopId === 'super_admin_shop' ? store.expenses : store.expenses.filter(e => e.shopId === shopId);
  if (branchId !== 'all') {
    list = list.filter(e => e.branchId === branchId);
  }
  return list;
}

export async function saveExpense(expense: Expense): Promise<Expense> {
  const store = getStore();
  const existingExpIdx = store.expenses.findIndex(e => e.id === expense.id);
  if (existingExpIdx !== -1) {
    store.expenses[existingExpIdx] = expense;
  } else {
    store.expenses.unshift(expense);
  }
  saveStore(store);

  try {
    const database = await getDb();
    if (database) {
      await database.collection('expenses').replaceOne({ id: expense.id }, { ...expense }, { upsert: true });
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to save expense:', error);
  }
  return expense;
}

// ==========================================
// 11. STOCK MOVEMENTS (BRANCH TRANSFERS)
// ==========================================

export async function getStockMovements(shopId: string = 'shop_default'): Promise<StockMovement[]> {
  try {
    const database = await getDb();
    if (database) {
      const filter = shopId === 'super_admin_shop' ? {} : { shopId };
      const docs = await database.collection('stockMovements').find(filter).sort({ timestamp: -1 }).toArray();
      return cleanDocs<StockMovement>(docs);
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to fetch stock movements:', error);
  }
  const movements = getStore().stockMovements || [];
  if (shopId === 'super_admin_shop') return movements;
  return movements.filter(m => m.shopId === shopId);
}

export async function saveStockMovement(movement: StockMovement): Promise<StockMovement> {
  const store = getStore();
  if (movement.status === 'Completed') {
    executeLocalStockMovementTransfer(store, movement);
  }
  const existingMovIdx = store.stockMovements.findIndex(m => m.id === movement.id);
  if (existingMovIdx !== -1) {
    store.stockMovements[existingMovIdx] = movement;
  } else {
    store.stockMovements.unshift(movement);
  }
  saveStore(store);

  try {
    const database = await getDb();
    if (database) {
      await database.collection('stockMovements').replaceOne({ id: movement.id }, { ...movement }, { upsert: true });

      // If status is Completed, perform inventory transfer in MongoDB
      if (movement.status === 'Completed') {
        await executeStockMovementTransfer(database, movement);
      }
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to save stock movement:', error);
  }

  return movement;
}

export async function updateStockMovement(id: string, movementData: Partial<StockMovement>, shopId: string = 'shop_default'): Promise<StockMovement | null> {
  const store = getStore();
  const idx = store.stockMovements.findIndex(m => m.id === id && m.shopId === shopId);
  let updatedMovement: StockMovement | null = null;
  if (idx !== -1) {
    store.stockMovements[idx] = { ...store.stockMovements[idx], ...movementData };
    if (movementData.status === 'Completed') {
      executeLocalStockMovementTransfer(store, store.stockMovements[idx]);
    }
    saveStore(store);
    updatedMovement = store.stockMovements[idx];
  }

  try {
    const database = await getDb();
    if (database) {
      const res = await database.collection('stockMovements').findOneAndUpdate(
        { id, shopId },
        { $set: movementData },
        { returnDocument: 'after' }
      );
      if (res) {
        updatedMovement = cleanDoc<StockMovement>(res);
        if (movementData.status === 'Completed') {
          await executeStockMovementTransfer(database, updatedMovement);
        }
      }
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to update stock movement:', error);
  }

  return updatedMovement;
}

async function executeStockMovementTransfer(database: Db, m: StockMovement) {
  if (m.fromBranchId) {
    // Deduct
    const prodSource = await database.collection('products').findOne({ id: m.productId, shopId: m.shopId, branchId: m.fromBranchId });
    if (prodSource) {
      const sourceQty = Math.max(0, (prodSource.quantity || 0) - m.quantity);
      const sourceStatus = sourceQty === 0 ? 'Out of Stock' : sourceQty <= (prodSource.minQuantity || 0) ? 'Low Stock' : 'In Stock';
      await database.collection('products').updateOne(
        { id: m.productId, shopId: m.shopId, branchId: m.fromBranchId },
        { $set: { quantity: sourceQty, status: sourceStatus, updatedAt: new Date().toISOString() } }
      );
    }
  }
  if (m.toBranchId) {
    // Add or Create target branch product
    const prodTarget = await database.collection('products').findOne({ id: m.productId, shopId: m.shopId, branchId: m.toBranchId });
    if (prodTarget) {
      const targetQty = (prodTarget.quantity || 0) + m.quantity;
      const targetStatus = targetQty === 0 ? 'Out of Stock' : targetQty <= (prodTarget.minQuantity || 0) ? 'Low Stock' : 'In Stock';
      await database.collection('products').updateOne(
        { id: m.productId, shopId: m.shopId, branchId: m.toBranchId },
        { $set: { quantity: targetQty, status: targetStatus, updatedAt: new Date().toISOString() } }
      );
    } else {
      // Find source to copy product description details
      const sourceDetails = await database.collection('products').findOne({ id: m.productId, shopId: m.shopId });
      if (sourceDetails) {
        const { _id, ...copied } = sourceDetails;
        const newBranchProd: Product = {
          ...copied as Product,
          id: m.productId + '_' + m.toBranchId,
          branchId: m.toBranchId,
          quantity: m.quantity,
          status: m.quantity === 0 ? 'Out of Stock' : m.quantity <= (copied.minQuantity || 10) ? 'Low Stock' : 'In Stock',
          updatedAt: new Date().toISOString()
        };
        await database.collection('products').replaceOne({ id: newBranchProd.id }, newBranchProd, { upsert: true });
      }
    }
  }
}

function executeLocalStockMovementTransfer(store: DBStore, m: StockMovement) {
  if (m.fromBranchId) {
    const prodSource = store.products.find(p => p.id === m.productId && p.shopId === m.shopId && p.branchId === m.fromBranchId);
    if (prodSource) {
      prodSource.quantity = Math.max(0, prodSource.quantity - m.quantity);
      prodSource.status = prodSource.quantity === 0 ? 'Out of Stock' : prodSource.quantity <= prodSource.minQuantity ? 'Low Stock' : 'In Stock';
      prodSource.updatedAt = new Date().toISOString();
    }
  }
  if (m.toBranchId) {
    const prodTarget = store.products.find(p => p.id === m.productId && p.shopId === m.shopId && p.branchId === m.toBranchId);
    if (prodTarget) {
      prodTarget.quantity += m.quantity;
      prodTarget.status = prodTarget.quantity === 0 ? 'Out of Stock' : prodTarget.quantity <= prodTarget.minQuantity ? 'Low Stock' : 'In Stock';
      prodTarget.updatedAt = new Date().toISOString();
    } else {
      const source = store.products.find(p => p.id === m.productId && p.shopId === m.shopId);
      if (source) {
        const newBranchProd: Product = {
          ...source,
          id: m.productId + '_' + m.toBranchId,
          branchId: m.toBranchId,
          quantity: m.quantity,
          status: m.quantity === 0 ? 'Out of Stock' : m.quantity <= source.minQuantity ? 'Low Stock' : 'In Stock',
          updatedAt: new Date().toISOString()
        };
        store.products.push(newBranchProd);
      }
    }
  }
}

// ==========================================
// 12. RETURNS
// ==========================================

export async function getReturns(shopId: string = 'shop_default'): Promise<Return[]> {
  try {
    const database = await getDb();
    if (database) {
      const filter = shopId === 'super_admin_shop' ? {} : { shopId };
      const docs = await database.collection('returns').find(filter).sort({ timestamp: -1 }).toArray();
      return cleanDocs<Return>(docs);
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to fetch returns:', error);
  }
  const returns = getStore().returns || [];
  if (shopId === 'super_admin_shop') return returns;
  return returns.filter(r => r.shopId === shopId);
}

export async function saveReturn(returnObj: Return): Promise<Return> {
  // Update local memory / file store
  const store = getStore();
  for (const item of returnObj.items) {
    const prod = store.products.find(p => p.id === item.productId && p.shopId === returnObj.shopId && p.branchId === returnObj.branchId);
    if (prod) {
      prod.quantity += item.quantity;
      prod.status = prod.quantity === 0 ? 'Out of Stock' : prod.quantity <= prod.minQuantity ? 'Low Stock' : 'In Stock';
      prod.updatedAt = new Date().toISOString();
    }
  }
  const sale = store.sales.find(s => s.id === returnObj.saleId && s.shopId === returnObj.shopId);
  if (sale) {
    sale.status = 'Returned';
  }
  const existingRetIdx = store.returns.findIndex(r => r.id === returnObj.id);
  if (existingRetIdx !== -1) {
    store.returns[existingRetIdx] = returnObj;
  } else {
    store.returns.unshift(returnObj);
  }
  saveStore(store);

  try {
    const database = await getDb();
    if (database) {
      await database.collection('returns').replaceOne({ id: returnObj.id }, { ...returnObj }, { upsert: true });

      // Add back inventory items to products in MongoDB
      for (const item of returnObj.items) {
        const prod = await database.collection('products').findOne({ id: item.productId, shopId: returnObj.shopId, branchId: returnObj.branchId });
        if (prod) {
          const newQty = (prod.quantity || 0) + item.quantity;
          const newStatus = newQty === 0 ? 'Out of Stock' : newQty <= (prod.minQuantity || 0) ? 'Low Stock' : 'In Stock';
          await database.collection('products').updateOne(
            { id: item.productId, shopId: returnObj.shopId, branchId: returnObj.branchId },
            { $set: { quantity: newQty, status: newStatus, updatedAt: new Date().toISOString() } }
          );
        }
      }

      // Set status of sale to Returned or Refunded
      await database.collection('sales').updateOne(
        { id: returnObj.saleId, shopId: returnObj.shopId },
        { $set: { status: 'Returned' } }
      );
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to save return:', error);
  }

  return returnObj;
}

// ==========================================
// 13. AUDIT LOGS
// ==========================================

export async function getAuditLogs(shopId: string = 'shop_default'): Promise<AuditLog[]> {
  try {
    const database = await getDb();
    if (database) {
      const filter = shopId === 'super_admin_shop' ? {} : { shopId };
      const docs = await database.collection('auditLogs').find(filter).sort({ timestamp: -1 }).toArray();
      return cleanDocs<AuditLog>(docs);
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to fetch audit logs:', error);
  }
  const auditLogs = getStore().auditLogs;
  if (shopId === 'super_admin_shop') return auditLogs;
  return auditLogs.filter(a => a.shopId === shopId);
}

export async function logAudit(
  userId: string, 
  action: string, 
  details: string, 
  branchId: string, 
  shopId: string = 'shop_default',
  ipAddress: string = '127.0.0.1',
  device: string = 'System Web App'
): Promise<void> {
  try {
    const database = await getDb();
    let userName = 'Unknown';
    let userRole = UserRole.CASHIER;

    if (database) {
      const userDoc = await database.collection('users').findOne({ id: userId });
      if (userDoc) {
        userName = userDoc.fullname || userDoc.username || 'Unknown';
        userRole = userDoc.role || UserRole.CASHIER;
      }
      const newLog: AuditLog = {
        id: 'log_' + Math.random().toString(36).substr(2, 9),
        shopId,
        userId,
        userName,
        userRole,
        action,
        details,
        timestamp: new Date().toISOString(),
        branchId,
        ipAddress,
        device
      };
      await database.collection('auditLogs').insertOne(newLog);
      return;
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to log audit:', error);
  }

  // Fallback state
  const store = getStore();
  const user = store.users.find(u => u.id === userId);
  const newLog: AuditLog = {
    id: 'log_' + Math.random().toString(36).substr(2, 9),
    shopId,
    userId,
    userName: user ? user.fullname || user.username : 'Unknown',
    userRole: user ? user.role : UserRole.CASHIER,
    action,
    details,
    timestamp: new Date().toISOString(),
    branchId,
    ipAddress,
    device
  };
  store.auditLogs.unshift(newLog);
  saveStore(store);
}

// ==========================================
// 14. SYNC ENGINE (OFFLINE SUPPORT)
// ==========================================

export async function syncOfflineQueue(offlineQueue: any[], branchId: string, shopId: string = 'shop_default') {
  try {
    const database = await getDb();
    let syncCount = 0;
    let conflictCount = 0;

    if (offlineQueue && Array.isArray(offlineQueue)) {
      for (const item of offlineQueue) {
        // Sync sales
        if (item.table === 'sales' && item.action === 'INSERT') {
          const sale: Sale = item.payload;
          sale.shopId = shopId; // Force correct tenant isolation
          
          if (database) {
            const exists = await database.collection('sales').findOne({
              shopId,
              $or: [{ id: sale.id }, { invoiceNumber: sale.invoiceNumber }]
            });
            if (!exists) {
              await saveSale(sale);
              syncCount++;
            }
          } else {
            const store = getStore();
            const exists = store.sales.some(s => s.shopId === shopId && (s.id === sale.id || s.invoiceNumber === sale.invoiceNumber));
            if (!exists) {
              const syncedSale = { ...sale, isOffline: false, syncedAt: new Date().toISOString() };
              store.sales.unshift(syncedSale);
              syncCount++;
            }
          }
        }

        // Sync product level adjustments
        if (item.table === 'products' && item.action === 'UPDATE') {
          const clientProd: Product = item.payload;
          clientProd.shopId = shopId;

          if (database) {
            const serverProd = await database.collection('products').findOne({ id: clientProd.id, shopId });
            if (serverProd) {
              const clientTime = new Date(clientProd.updatedAt).getTime();
              const serverTime = new Date(serverProd.updatedAt).getTime();

              if (clientTime > serverTime) {
                await updateProduct(clientProd.id, clientProd, shopId);
                syncCount++;
              } else {
                conflictCount++;
              }
            }
          } else {
            const store = getStore();
            const serverProdIdx = store.products.findIndex(p => p.id === clientProd.id && p.shopId === shopId);
            if (serverProdIdx !== -1) {
              const serverProd = store.products[serverProdIdx];
              const clientTime = new Date(clientProd.updatedAt).getTime();
              const serverTime = new Date(serverProd.updatedAt).getTime();

              if (clientTime > serverTime) {
                store.products[serverProdIdx] = { ...clientProd, updatedAt: new Date().toISOString() };
                syncCount++;
              } else {
                conflictCount++;
              }
            }
          }
        }
      }
    }

    if (syncCount > 0) {
      await logAudit('u1', 'SYNC_ENGINE', `Synced ${syncCount} offline records from branch ${branchId}. Conflicts: ${conflictCount}`, branchId, shopId);
    }

    const latestProducts = await getProducts(branchId, shopId);
    const latestSales = await getSales(branchId, shopId);
    const latestQuotations = await getQuotations(branchId, shopId);
    const latestSuppliers = await getSuppliers(shopId);
    const latestCustomers = await getCustomers(shopId);

    return {
      success: true,
      syncedRecords: syncCount,
      conflictsResolved: conflictCount,
      latestProducts,
      latestSuppliers,
      latestCustomers,
      latestSales,
      latestQuotations,
    };
  } catch (error) {
    console.error('[MongoDB Sync Error] Fallback default return:', error);
    const latestProducts = await getProducts(branchId, shopId);
    const latestSales = await getSales(branchId, shopId);
    const latestQuotations = await getQuotations(branchId, shopId);
    const latestSuppliers = await getSuppliers(shopId);
    const latestCustomers = await getCustomers(shopId);

    return {
      success: true,
      syncedRecords: 0,
      conflictsResolved: 0,
      latestProducts,
      latestSuppliers,
      latestCustomers,
      latestSales,
      latestQuotations,
    };
  }
}

// ==========================================
// 15. EMAIL NOTIFICATIONS DISPATCH LOGS
// ==========================================

export async function getEmailNotifications(shopId: string = 'shop_default'): Promise<EmailNotification[]> {
  try {
    const database = await getDb();
    if (database) {
      const filter = shopId === 'super_admin_shop' ? {} : { shopId };
      const docs = await database.collection('emails').find(filter).sort({ sentAt: -1 }).toArray();
      return cleanDocs<EmailNotification>(docs);
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to fetch email notifications:', error);
  }
  const emails = getStore().emails || [];
  if (shopId === 'super_admin_shop') return emails;
  return emails.filter(e => e.shopId === shopId);
}

export async function saveEmailNotification(emailNotif: EmailNotification): Promise<EmailNotification> {
  const store = getStore();
  if (!store.emails) store.emails = [];
  const existingIdx = store.emails.findIndex(e => e.id === emailNotif.id);
  if (existingIdx !== -1) {
    store.emails[existingIdx] = emailNotif;
  } else {
    store.emails.unshift(emailNotif);
  }
  saveStore(store);

  try {
    const database = await getDb();
    if (database) {
      await database.collection('emails').replaceOne({ id: emailNotif.id }, { ...emailNotif }, { upsert: true });
    }
  } catch (error) {
    console.error('[MongoDB Error] Failed to save email notification:', error);
  }

  return emailNotif;
}

// ==========================================
// 16. SUPER ADMIN DATABASE INSPECTOR ENGINE
// ==========================================

export async function getDatabaseSummary() {
  const store = getStore();
  const knownTables = [
    { name: 'shops', label: 'Shops (Tenants)', desc: 'Store tenant accounts and subscription plans' },
    { name: 'users', label: 'Users', desc: 'System user accounts, credentials, and roles' },
    { name: 'branches', label: 'Branches', desc: 'Store physical locations and outlets' },
    { name: 'products', label: 'Products', desc: 'Catalog items, barcodes, prices, and stock levels' },
    { name: 'suppliers', label: 'Suppliers', desc: 'Vendor records and purchase contacts' },
    { name: 'customers', label: 'Customers', desc: 'Customer directory and loyalty history' },
    { name: 'sales', label: 'Sales (Invoices)', desc: 'POS checkout transactions and line items' },
    { name: 'purchases', label: 'Purchase Orders', desc: 'Stock replenishment orders and costs' },
    { name: 'quotations', label: 'Quotations', desc: 'Issued price quotes and validity dates' },
    { name: 'expenses', label: 'Expenses', desc: 'Store operational costs and receipts' },
    { name: 'stockMovements', label: 'Stock Movements', desc: 'Stock adjustments, transfers, and audit logs' },
    { name: 'returns', label: 'Returns', desc: 'Product returns and refund logs' },
    { name: 'auditLogs', label: 'Audit Logs', desc: 'Security, login, and system action telemetry' },
    { name: 'emails', label: 'Email Logs', desc: 'Dispatched credential and notification emails' }
  ];

  let isMongo = false;
  let summary = [];

  try {
    const database = await getDb();
    if (database) {
      isMongo = true;
      for (const t of knownTables) {
        const count = await database.collection(t.name).countDocuments();
        summary.push({ ...t, count });
      }
      return { engine: 'MongoDB Atlas', isConnected: true, collections: summary };
    }
  } catch (err) {
    console.error('[DB Manager] Summary query error:', err);
  }

  // Fallback store
  summary = knownTables.map(t => {
    const arr = (store as any)[t.name] || [];
    return { ...t, count: arr.length };
  });

  return { engine: 'Simulated Local Store', isConnected: false, collections: summary };
}

export async function getCollectionRecords(tableName: string, search: string = '', page: number = 1, limit: number = 50) {
  let records: any[] = [];
  let total = 0;

  try {
    const database = await getDb();
    if (database) {
      const col = database.collection(tableName);
      let query: any = {};
      if (search) {
        const regex = new RegExp(search, 'i');
        query = {
          $or: [
            { id: { $regex: regex } },
            { shopId: { $regex: regex } },
            { name: { $regex: regex } },
            { username: { $regex: regex } },
            { email: { $regex: regex } },
            { invoiceNumber: { $regex: regex } },
            { title: { $regex: regex } },
            { description: { $regex: regex } },
            { role: { $regex: regex } },
            { barcode: { $regex: regex } }
          ]
        };
      }

      total = await col.countDocuments(query);
      const docs = await col.find(query).sort({ _id: -1 }).skip((page - 1) * limit).limit(limit).toArray();
      records = cleanDocs(docs);
      return { records, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
    }
  } catch (err) {
    console.error(`[DB Manager] Failed to query collection ${tableName}:`, err);
  }

  // Fallback store
  const store = getStore();
  const rawList: any[] = (store as any)[tableName] || [];
  let filtered = rawList;
  if (search) {
    const term = search.toLowerCase();
    filtered = rawList.filter((item: any) => {
      const jsonStr = JSON.stringify(item).toLowerCase();
      return jsonStr.includes(term);
    });
  }
  total = filtered.length;
  records = filtered.slice((page - 1) * limit, page * limit);

  return { records, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
}

export async function deleteCollectionRecord(tableName: string, recordId: string) {
  try {
    const database = await getDb();
    if (database) {
      const orConditions: any[] = [{ id: recordId }];
      if (ObjectId.isValid(recordId)) {
        orConditions.push({ _id: new ObjectId(recordId) });
      }
      await database.collection(tableName).deleteMany({ $or: orConditions });
    }
  } catch (err) {
    console.error(`[DB Manager] Failed to delete from ${tableName}:`, err);
  }

  const store = getStore();
  if ((store as any)[tableName] && Array.isArray((store as any)[tableName])) {
    (store as any)[tableName] = (store as any)[tableName].filter((item: any) => item.id !== recordId && item._id !== recordId);
    saveStore(store);
  }
  return true;
}


