/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import * as dbManager from './src/db_manager.ts';
import { 
  Product, Sale, PurchaseOrder, User, Supplier, Customer, UserRole, AuditLog, Quotation, Shop, Expense, StockMovement, Return, Branch, EmailNotification 
} from './src/types.ts';

dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET || 'cobult-stocks-saas-super-secret-key-99821';
let smtpTransporter: nodemailer.Transporter | null = null;

// Helper to create nodemailer SMTP transporter
function getTransporter() {
  if (smtpTransporter) return smtpTransporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    smtpTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: {
        user,
        pass,
      },
    });
    return smtpTransporter;
  }
  return null;
}

// Helper to send email notification for newly provisioned user credentials
async function dispatchCredentialsEmail(
  recipientEmail: string,
  recipientName: string,
  role: UserRole,
  username: string,
  password: string,
  shopId: string,
  shopName: string,
  branchName: string = 'Main Branch'
) {
  const loginUrl = process.env.APP_URL || 'http://localhost:3000';
  
  const bodyHtml = `
    <div style="font-family: Arial, sans-serif; background-color: #0F1115; color: #E2E8F0; padding: 24px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #2D3139;">
      <h2 style="color: #3B82F6; margin-top: 0; font-size: 20px;">Welcome to ${shopName}!</h2>
      <p style="font-size: 14px; color: #CBD5E1;">Hello <strong>${recipientName}</strong>,</p>
      <p style="font-size: 14px; color: #CBD5E1;">Your official <strong>${role}</strong> account has been successfully provisioned on <strong>Cobult Stocks Terminal System</strong>.</p>
      
      <div style="background-color: #1A1D23; border: 1px solid #2D3139; border-radius: 10px; padding: 18px; margin: 20px 0;">
        <h4 style="color: #94A3B8; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; margin-top: 0; margin-bottom: 12px;">Your System Credentials</h4>
        <p style="margin: 8px 0; font-size: 13px;"><strong>Account Type:</strong> <span style="color: #60A5FA; font-weight: bold;">${role}</span></p>
        <p style="margin: 8px 0; font-size: 13px;"><strong>Shop Tenant:</strong> ${shopName}</p>
        <p style="margin: 8px 0; font-size: 13px;"><strong>Branch Assignment:</strong> ${branchName}</p>
        <p style="margin: 8px 0; font-size: 13px;"><strong>Login Username:</strong> <code style="background: #2D3139; color: #38BDF8; padding: 3px 8px; border-radius: 6px; font-weight: bold;">${username}</code></p>
        <p style="margin: 8px 0; font-size: 13px;"><strong>Temporary Password:</strong> <code style="background: #2D3139; color: #FBBF24; padding: 3px 8px; border-radius: 6px; font-weight: bold;">${password}</code></p>
      </div>

      <p style="font-size: 13px; color: #CBD5E1;">Click the button below to initialize your terminal session:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${loginUrl}" style="background-color: #2563EB; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">Login to Terminal</a>
      </p>

      <hr style="border: 0; border-top: 1px solid #2D3139; margin: 24px 0;" />
      <p style="font-size: 11px; color: #94A3B8; margin-bottom: 0;">This is an automated credentials dispatch notification from Cobult Stocks Retail POS. Please store your password safely.</p>
    </div>
  `;

  let deliveryStatus: 'Delivered' | 'Failed' = 'Failed';

  // Send email via Nodemailer SMTP if configured
  try {
    const transporter = getTransporter();
    if (transporter && recipientEmail) {
      const from = process.env.SMTP_FROM || `"Cobult Stocks" <${process.env.SMTP_USER}>`;
      await transporter.sendMail({
        from,
        to: recipientEmail,
        subject: `[Cobult Stocks] Credentials Dispatch: ${role} Account for ${shopName}`,
        html: bodyHtml,
      });
      console.log(`[SMTP EMAIL SENT SUCCESSFULLY] to ${recipientEmail}`);
      deliveryStatus = 'Delivered';
    } else {
      console.error('[SMTP NOT CONFIGURED] Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM in production.');
    }
  } catch (smtpErr) {
    console.error(`[SMTP ERROR SENDING EMAIL to ${recipientEmail}]:`, smtpErr);
    deliveryStatus = 'Failed';
  }

  const emailNotif: EmailNotification = {
    id: 'em_' + Math.random().toString(36).substr(2, 9),
    shopId,
    recipientEmail,
    recipientName,
    subject: `[Cobult Stocks] Credentials Dispatch: ${role} Account for ${shopName}`,
    bodyHtml,
    sentAt: new Date().toISOString(),
    status: deliveryStatus,
    role,
    credentials: {
      username,
      password,
      loginUrl,
      shopName
    }
  };

  console.log(`\n==================================================`);
  console.log(`[EMAIL NOTIFICATION RECORDED]`);
  console.log(`To: ${recipientName} <${recipientEmail}>`);
  console.log(`Role: ${role} | Shop: ${shopName} (${shopId})`);
  console.log(`Username: ${username} | Password: ${password}`);
  console.log(`Status: ${deliveryStatus}`);
  console.log(`==================================================\n`);

  await dbManager.saveEmailNotification(emailNotif);
  return emailNotif;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // JSON parsing limits
  app.use(express.json({ limit: '10mb' }));

  // Helper to log audit logs asynchronously
  const logAudit = async (
    userId: string, 
    action: string, 
    details: string, 
    branchId: string, 
    shopId: string,
    req: express.Request
  ) => {
    try {
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const device = req.headers['user-agent'] || 'System Web App';
      await dbManager.logAudit(userId, action, details, branchId, shopId, ip, device);
    } catch (err) {
      console.error('[Audit] Failed to record audit log:', err);
    }
  };

  // ==========================================
  // MIDDLEWARES FOR SAAS TENANT SECURITY & RBAC
  // ==========================================

  // Authentication Middleware: validates the JWT token or falls back gracefully
  const authenticate = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded: any = jwt.verify(token, SECRET_KEY);
        
        if (decoded.role === UserRole.SUPER_ADMIN) {
          req.user = decoded;
          return next();
        }

        // If accessing super admin endpoints or sending x-superadmin header, grant super admin scope
        if (req.headers['x-superadmin'] === 'true' || req.path.startsWith('/api/super')) {
          req.user = {
            userId: decoded.userId || 'u_admin',
            shopId: 'super_admin_shop',
            role: UserRole.SUPER_ADMIN,
            branchId: ''
          };
          return next();
        }

        // Tenant Security: Verify if the tenant shop is active and hasn't expired
        let targetShopId = decoded.shopId || 'shop_default';
        let shop = await dbManager.getShopById(targetShopId);

        if (!shop && targetShopId) {
          // Auto-heal active shop tenant record if missing
          shop = {
            id: targetShopId,
            shopName: 'Cobult Retail Store',
            ownerName: 'Store Owner',
            email: 'owner@cobult.com',
            phone: '+263771111111',
            subscriptionPlan: 'Yearly',
            subscriptionStatus: 'Active',
            expiryDate: '2030-12-31',
            status: 'Active',
            createdAt: new Date().toISOString()
          };
          await dbManager.saveShop(shop);
        }

        if (shop) {
          const subStatus = shop.subscriptionStatus || 'Active';
          if (shop.status === 'Suspended' || subStatus === 'Suspended') {
            return res.status(403).json({ error: 'Your shop subscription has been suspended by the administrator. Please contact the administrator.' });
          }
          if (subStatus === 'Expired' || subStatus === 'Inactive') {
            return res.status(403).json({ error: 'Your subscription is inactive or has expired. Please contact the administrator to renew or activate your account.' });
          }
          if (shop.expiryDate) {
            const expiryTime = new Date(shop.expiryDate).getTime();
            if (expiryTime < Date.now()) {
              return res.status(403).json({ error: 'Your subscription has expired. Please contact the administrator to renew your subscription.' });
            }
          }
        } else {
          return res.status(403).json({ error: 'Shop tenant not found. Access denied. Please contact the administrator.' });
        }

        req.user = decoded;
        return next();
      }
    } catch (err) {
      console.warn('[Auth Middleware] Invalid token, checking local fallback credentials:', err);
    }

    // Offline / Local fallback to support seamless offline-first experience
    if (req.headers['x-superadmin'] === 'true' || req.path.startsWith('/api/super')) {
      req.user = {
        userId: 'u_admin',
        shopId: 'super_admin_shop',
        role: UserRole.SUPER_ADMIN,
        branchId: ''
      };
      return next();
    }

    // Defaulting to OWNER of shop_default when running without auth header
    req.user = {
      userId: 'u1',
      shopId: 'shop_default',
      role: UserRole.OWNER,
      branchId: 'b1'
    };
    return next();
  };

  // Role Based Access Control: restricts actions based on user roles
  const authorize = (...allowedRoles: UserRole[]) => {
    return (req: any, res: any, next: any) => {
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Access Denied: Insufficient Permissions.' });
      }
      next();
    };
  };

  // ==========================================
  // 1. API: AUTHENTICATION (SECURE BYCRYPT)
  // ==========================================

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const users = await dbManager.getUsers('super_admin_shop'); // Search globally across all shops

      const trimmedInput = (username || '').trim().toLowerCase();
      const user = users.find(u => 
        (u.username && u.username.toLowerCase() === trimmedInput) || 
        (u.email && u.email.toLowerCase() === trimmedInput)
      );

      if (user) {
        // Hashed password check
        const isMatch = await bcrypt.compare(password || '', user.passwordHash);
        if (isMatch) {
          if (user.status === 'Suspended') {
            return res.status(403).json({ success: false, error: 'Your user account is suspended.' });
          }

          // Check shop status (except for super admin)
          if (user.role !== UserRole.SUPER_ADMIN) {
            const shops = await dbManager.getShops();
            let targetShopId = user.shopId || 'shop_default';
            let shop = shops.find(s => s.id === targetShopId || (s as any)._id?.toString() === targetShopId);

            if (!shop && targetShopId) {
              // Auto-heal shop tenant if record is missing
              shop = {
                id: targetShopId,
                shopName: 'Cobult Retail Store',
                ownerName: user.fullname || 'Store Owner',
                email: user.email || 'owner@cobult.com',
                phone: '+263771111111',
                subscriptionPlan: 'Yearly',
                subscriptionStatus: 'Active',
                expiryDate: '2030-12-31',
                status: 'Active',
                createdAt: new Date().toISOString()
              };
              await dbManager.saveShop(shop);
            }

            if (!shop) {
              return res.status(403).json({ success: false, error: 'Shop tenant not found. Access denied. Please contact the administrator.' });
            }

            const subStatus = shop.subscriptionStatus || 'Active';
            if (shop.status === 'Suspended' || subStatus === 'Suspended') {
              return res.status(403).json({ success: false, error: 'Your shop subscription has been suspended by the administrator. Please contact the administrator.' });
            }
            if (subStatus === 'Expired' || subStatus === 'Inactive') {
              return res.status(403).json({ success: false, error: 'Your subscription is inactive or has expired. Please contact the administrator to renew or activate your account.' });
            }
            if (shop.expiryDate) {
              const expiryTime = new Date(shop.expiryDate).getTime();
              if (expiryTime < Date.now()) {
                return res.status(403).json({ success: false, error: 'Your subscription has expired. Please contact the administrator to renew your subscription.' });
              }
            }
          }

          // Generate proper JWT
          const token = jwt.sign(
            { userId: user.id, shopId: user.shopId, role: user.role, branchId: user.branchId },
            SECRET_KEY,
            { expiresIn: '30d' }
          );

          await logAudit(user.id, 'LOGIN', `User ${user.fullname || user.username} logged in successfully`, user.branchId, user.shopId, req);
          
          res.json({
            success: true,
            token,
            user: {
              id: user.id,
              username: user.username,
              fullname: user.fullname,
              email: user.email,
              role: user.role,
              branchId: user.branchId,
              shopId: user.shopId,
              avatarUrl: user.avatarUrl
            },
          });
        } else {
          res.status(401).json({ success: false, error: 'Invalid password' });
        }
      } else {
        res.status(401).json({ success: false, error: 'Invalid username' });
      }
    } catch (err: any) {
      console.error('[API Auth] Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 2. API: SUPER ADMIN DASHBOARD
  // ==========================================

  // Get SaaS Metrics and global stats
  app.get('/api/super/stats', authenticate, authorize(UserRole.SUPER_ADMIN), async (req: any, res) => {
    try {
      const shops = await dbManager.getShops();
      const users = await dbManager.getUsers('super_admin_shop');
      const branches = await dbManager.getBranches('super_admin_shop');
      const sales = await dbManager.getSales('all', 'super_admin_shop');

      const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);

      res.json({
        totalShops: shops.length,
        activeShops: shops.filter(s => s.status === 'Active').length,
        totalRevenue,
        totalSalesCount: sales.length,
        totalUsers: users.length,
        totalBranches: branches.length,
        recentShops: shops.slice(-5)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get All Shops
  app.get('/api/super/shops', authenticate, authorize(UserRole.SUPER_ADMIN), async (req: any, res) => {
    try {
      const shops = await dbManager.getShops();
      res.json(shops);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create Shop Tenant & Auto-provision Owner
  app.post('/api/super/shops', authenticate, authorize(UserRole.SUPER_ADMIN), async (req: any, res) => {
    try {
      const { shopName, ownerName, email, phone, subscriptionPlan, password } = req.body;
      const shopId = 'shop_' + Math.random().toString(36).substr(2, 9);
      const ownerId = 'u_' + Math.random().toString(36).substr(2, 9);

      // 1. Calculate expiry date based on subscription plan
      const expiry = new Date();
      if (subscriptionPlan === 'Monthly') expiry.setMonth(expiry.getMonth() + 1);
      else if (subscriptionPlan === 'Quarterly') expiry.setMonth(expiry.getMonth() + 3);
      else if (subscriptionPlan === 'Yearly') expiry.setFullYear(expiry.getFullYear() + 1);
      else expiry.setDate(expiry.getDate() + 14); // Default 14-day Trial

      // 2. Hash owner password
      const passwordHash = await bcrypt.hash(password || 'owner123', 10);

      // 3. Create Shop document
      const newShop: Shop = {
        id: shopId,
        shopName,
        ownerName,
        email,
        phone,
        subscriptionPlan: subscriptionPlan || 'Trial',
        subscriptionStatus: 'Active',
        expiryDate: expiry.toISOString().slice(0, 10),
        status: 'Active',
        createdAt: new Date().toISOString()
      };

      // 4. Create Owner user document
      const newOwner: User = {
        id: ownerId,
        shopId,
        branchId: 'b1', // Provision first branch by default
        username: email.split('@')[0], // Generate login username from email
        fullname: ownerName,
        email,
        passwordHash,
        role: UserRole.OWNER,
        status: 'Active',
        createdAt: new Date().toISOString(),
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'
      };

      // 5. Provision default branch b1 for the shop
      const newBranch: Branch = {
        id: 'b1',
        shopId,
        name: `${shopName} Main Branch`,
        address: 'Main St, CBD',
        phone,
        createdAt: new Date().toISOString()
      };

      // Save to database/memory store
      await dbManager.saveShop(newShop);
      await dbManager.saveUser(newOwner);
      await dbManager.saveBranch(newBranch);

      // Dispatch Email Notification to Shop Owner with login credentials
      const emailNotif = await dispatchCredentialsEmail(
        email,
        ownerName,
        UserRole.OWNER,
        newOwner.username,
        password || 'owner123',
        shopId,
        shopName,
        newBranch.name
      );

      await logAudit(req.user.userId, 'CREATE_SHOP', `Super Admin created Shop ${shopName} (ID: ${shopId}) and dispatched owner credentials email to ${email}`, 'b1', 'super_admin_shop', req);

      res.status(201).json({
        success: true,
        shop: newShop,
        owner: {
          username: newOwner.username,
          email: newOwner.email,
          temporaryPassword: password || 'owner123'
        },
        emailNotification: emailNotif
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Suspend/Activate/Update Subscription Status of Shop
  app.put('/api/super/shops/:id', authenticate, authorize(UserRole.SUPER_ADMIN), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updatedShop = await dbManager.updateShop(id, req.body);
      if (updatedShop) {
        await logAudit(req.user.userId, 'UPDATE_SHOP', `Super Admin updated Shop status (ID: ${id})`, 'b1', 'super_admin_shop', req);
        res.json(updatedShop);
      } else {
        res.status(404).json({ error: 'Shop not found' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete Shop
  app.delete('/api/super/shops/:id', authenticate, authorize(UserRole.SUPER_ADMIN), async (req: any, res) => {
    try {
      const { id } = req.params;
      const success = await dbManager.deleteShop(id);
      if (success) {
        await logAudit(req.user.userId, 'DELETE_SHOP', `Super Admin deleted Shop (ID: ${id})`, 'b1', 'super_admin_shop', req);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Shop not found' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Check SMTP status
  app.get('/api/super/smtp-status', authenticate, authorize(UserRole.SUPER_ADMIN), (req: any, res) => {
    const isConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    res.json({
      configured: isConfigured,
      host: process.env.SMTP_HOST || 'Not Set (Using In-App Outbox Log)',
      user: process.env.SMTP_USER || 'Not Set',
      from: process.env.SMTP_FROM || 'Not Set',
      mode: isConfigured ? 'Live SMTP Email Delivery' : 'In-App Outbox Log Dispatcher Mode'
    });
  });

  // Reset Owner Password
  app.put('/api/super/reset-owner-password', authenticate, authorize(UserRole.SUPER_ADMIN), async (req: any, res) => {
    try {
      const { shopId, newPassword } = req.body;
      const users = await dbManager.getUsers(shopId);
      const owner = users.find(u => u.role === UserRole.OWNER);

      if (owner) {
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await dbManager.updateUser(owner.id, { passwordHash });
        await logAudit(req.user.userId, 'PASSWORD_RESET', `Super Admin reset owner password for Shop ID: ${shopId}`, 'b1', 'super_admin_shop', req);
        res.json({ success: true, message: 'Password reset successful.' });
      } else {
        res.status(404).json({ error: 'Shop owner not found.' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // SUPER ADMIN DATABASE INSPECTOR ENDPOINTS
  // ==========================================

  // Get Database Summary (Engine status and all collections count)
  app.get('/api/super/db/summary', authenticate, authorize(UserRole.SUPER_ADMIN), async (req: any, res) => {
    try {
      const summary = await dbManager.getDatabaseSummary();
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get Collection Records with Search & Pagination
  app.get('/api/super/db/collection/:tableName', authenticate, authorize(UserRole.SUPER_ADMIN), async (req: any, res) => {
    try {
      const { tableName } = req.params;
      const search = (req.query.search as string) || '';
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '50', 10);

      const data = await dbManager.getCollectionRecords(tableName, search, page, limit);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete specific record in collection
  app.delete('/api/super/db/collection/:tableName/:id', authenticate, authorize(UserRole.SUPER_ADMIN), async (req: any, res) => {
    try {
      const { tableName, id } = req.params;
      await dbManager.deleteCollectionRecord(tableName, id);
      await logAudit(req.user.userId, 'DB_INSPECTOR_DELETE', `Super Admin deleted record ${id} from table ${tableName}`, 'b1', 'super_admin_shop', req);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 3. API: DASHBOARD STATS (TENANT ISOLATED)
  // ==========================================
  app.get('/api/dashboard/stats', authenticate, async (req: any, res) => {
    try {
      const branchId = (req.query.branchId as string) || 'b1';
      const shopId = req.user.shopId;

      const allSales = await dbManager.getSales(branchId, shopId);
      const sales = allSales.filter(s => s.status === 'Completed');
      const products = await dbManager.getProducts(branchId, shopId);
      const purchases = await dbManager.getPurchases(branchId, shopId);
      const expensesList = await dbManager.getExpenses(branchId, shopId);

      // Calculate Metrics
      const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
      let costOfGoodsSold = 0;
      sales.forEach(s => {
        s.items.forEach(item => {
          const prod = products.find(p => p.id === item.productId);
          if (prod) {
            costOfGoodsSold += prod.purchasePrice * item.quantity;
          }
        });
      });

      const totalExpenses = expensesList.reduce((sum, e) => sum + e.amount, 0) + costOfGoodsSold;
      const revenue = totalSales;
      const profit = Math.max(0, revenue - totalExpenses);

      const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= p.minQuantity);
      const outOfStock = products.filter(p => p.quantity === 0);

      // Weekly sales trends
      const recentSales = sales.slice(0, 10).map(s => ({
        id: s.id,
        invoiceNumber: s.invoiceNumber,
        cashier: s.cashierName,
        total: s.total,
        paymentMethod: s.paymentMethod,
        timestamp: s.timestamp,
      }));

      // Top Selling Products
      const productSalesMap: Record<string, { name: string; qty: number; sales: number }> = {};
      sales.forEach(s => {
        s.items.forEach(item => {
          if (!productSalesMap[item.productId]) {
            productSalesMap[item.productId] = { name: item.name, qty: 0, sales: 0 };
          }
          productSalesMap[item.productId].qty += item.quantity;
          productSalesMap[item.productId].sales += item.subtotal;
        });
      });

      const topSelling = Object.values(productSalesMap)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      // Dynamic sales charts
      const salesTrends = sales.map(s => ({
        time: new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        amount: s.total,
      }));

      res.json({
        revenue,
        expenses: totalExpenses,
        profit,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
        pendingOrdersCount: purchases.filter(p => p.status === 'Pending').length,
        recentSales,
        topSelling,
        salesTrends: salesTrends.length ? salesTrends : [{ time: '08:00 AM', amount: 0 }, { time: '12:00 PM', amount: 150 }, { time: '04:00 PM', amount: 320 }],
      });
    } catch (err: any) {
      console.error('[API Dashboard] Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 4. API: PRODUCTS (INVENTORY - TENANT ISOLATED)
  // ==========================================
  app.get('/api/products', authenticate, async (req: any, res) => {
    try {
      const branchId = (req.query.branchId as string) || 'b1';
      const products = await dbManager.getProducts(branchId, req.user.shopId);
      res.json(products);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/products', authenticate, authorize(UserRole.OWNER, UserRole.MANAGER), async (req: any, res) => {
    try {
      const productData: Product = req.body;
      const newId = 'p_' + Math.random().toString(36).substr(2, 9);
      const newProduct: Product = {
        ...productData,
        id: newId,
        shopId: req.user.shopId, // Inject correct shopId
        status: productData.quantity === 0 ? 'Out of Stock' : productData.quantity <= productData.minQuantity ? 'Low Stock' : 'In Stock',
        updatedAt: new Date().toISOString(),
      };

      const saved = await dbManager.saveProduct(newProduct);
      await logAudit(req.user.userId, 'CREATE_PRODUCT', `Created product ${newProduct.name} (${newProduct.sku})`, newProduct.branchId, req.user.shopId, req);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/products/:id', authenticate, authorize(UserRole.OWNER, UserRole.MANAGER), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updated = await dbManager.updateProduct(id, req.body, req.user.shopId);
      if (updated) {
        await logAudit(req.user.userId, 'UPDATE_PRODUCT', `Updated product ${updated.name}`, updated.branchId, req.user.shopId, req);
        res.json(updated);
      } else {
        res.status(404).json({ error: 'Product not found' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/products/:id', authenticate, authorize(UserRole.OWNER), async (req: any, res) => {
    try {
      const { id } = req.params;
      const products = await dbManager.getProducts('all', req.user.shopId);
      const target = products.find(p => p.id === id);
      
      if (target) {
        const success = await dbManager.deleteProduct(id, req.user.shopId);
        if (success) {
          await logAudit(req.user.userId, 'DELETE_PRODUCT', `Deleted product ${target.name}`, target.branchId, req.user.shopId, req);
          res.json({ success: true, removedId: id });
        } else {
          res.status(500).json({ error: 'Failed to delete product' });
        }
      } else {
        res.status(404).json({ error: 'Product not found' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 5. API: SUPPLIERS & CUSTOMERS (TENANT ISOLATED)
  // ==========================================
  app.get('/api/suppliers', authenticate, async (req: any, res) => {
    try {
      const suppliers = await dbManager.getSuppliers(req.user.shopId);
      res.json(suppliers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/suppliers', authenticate, authorize(UserRole.OWNER, UserRole.MANAGER), async (req: any, res) => {
    try {
      const sup: Supplier = req.body;
      const newId = 's_' + Math.random().toString(36).substr(2, 9);
      const newSup: Supplier = { 
        ...sup, 
        id: newId, 
        shopId: req.user.shopId, 
        balance: sup.balance || 0, 
        purchaseHistoryCount: 0 
      };
      
      const saved = await dbManager.saveSupplier(newSup);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/customers', authenticate, async (req: any, res) => {
    try {
      const customers = await dbManager.getCustomers(req.user.shopId);
      res.json(customers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/customers', authenticate, async (req: any, res) => {
    try {
      const cust: Customer = req.body;
      const newId = 'c_' + Math.random().toString(36).substr(2, 9);
      const newCust: Customer = {
        ...cust,
        id: newId,
        shopId: req.user.shopId,
        customerNumber: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
        loyaltyPoints: cust.loyaltyPoints || 0,
        purchaseHistoryCount: 0,
      };
      
      const saved = await dbManager.saveCustomer(newCust);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 6. API: SALES & POS (TENANT ISOLATED)
  // ==========================================
  app.get('/api/sales', authenticate, async (req: any, res) => {
    try {
      const branchId = (req.query.branchId as string) || 'b1';
      const sales = await dbManager.getSales(branchId, req.user.shopId);
      res.json(sales);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sales', authenticate, authorize(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER), async (req: any, res) => {
    try {
      const saleData: Sale = req.body;
      const newSale: Sale = {
        ...saleData,
        id: saleData.id || 's_' + Math.random().toString(36).substr(2, 9),
        shopId: req.user.shopId,
        branchId: req.user.branchId,
        invoiceNumber: saleData.invoiceNumber || `INV-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: saleData.timestamp || new Date().toISOString(),
        syncedAt: new Date().toISOString(),
      };

      const saved = await dbManager.saveSale(newSale);
      await logAudit(newSale.cashierId, 'NEW_SALE', `Completed Sale ${newSale.invoiceNumber} for $${newSale.total.toFixed(2)}`, newSale.branchId, req.user.shopId, req);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/sales/:id', authenticate, authorize(UserRole.OWNER, UserRole.MANAGER), async (req: any, res) => {
    try {
      const { id } = req.params;
      const sales = await dbManager.getSales('all', req.user.shopId);
      const target = sales.find(s => s.id === id);

      if (target) {
        const success = await dbManager.deleteSale(id, req.user.shopId);
        if (success) {
          await logAudit(req.user.userId, 'DELETE_SALE', `Deleted Sale ${target.invoiceNumber} worth $${target.total.toFixed(2)}`, target.branchId, req.user.shopId, req);
          res.json({ success: true, removedId: id });
        } else {
          res.status(500).json({ error: 'Failed to delete sale' });
        }
      } else {
        res.status(404).json({ error: 'Sale not found' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 7. API: PURCHASES & STOCK RECEIVING (TENANT ISOLATED)
  // ==========================================
  app.get('/api/purchases', authenticate, async (req: any, res) => {
    try {
      const branchId = (req.query.branchId as string) || 'b1';
      const purchases = await dbManager.getPurchases(branchId, req.user.shopId);
      res.json(purchases);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/purchases', authenticate, authorize(UserRole.OWNER, UserRole.MANAGER), async (req: any, res) => {
    try {
      const orderData: PurchaseOrder = req.body;
      const newId = 'po_' + Math.random().toString(36).substr(2, 9);
      const newOrder: PurchaseOrder = {
        ...orderData,
        id: newId,
        shopId: req.user.shopId,
        branchId: req.user.branchId,
        orderNumber: `PO-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
        createdAt: new Date().toISOString(),
      };

      if (newOrder.status === 'Received') {
        newOrder.receivedAt = new Date().toISOString();
      }

      const saved = await dbManager.savePurchase(newOrder);
      await logAudit(req.user.userId, 'CREATE_PURCHASE', `Created Purchase Order ${newOrder.orderNumber} for $${newOrder.totalAmount.toFixed(2)}`, newOrder.branchId, req.user.shopId, req);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 8. API: EXPENSES (NEW FUNCTIONALITY)
  // ==========================================
  app.get('/api/expenses', authenticate, async (req: any, res) => {
    try {
      const branchId = (req.query.branchId as string) || 'b1';
      const expenses = await dbManager.getExpenses(branchId, req.user.shopId);
      res.json(expenses);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/expenses', authenticate, authorize(UserRole.OWNER, UserRole.MANAGER), async (req: any, res) => {
    try {
      const expenseData: Expense = req.body;
      const newExpense: Expense = {
        ...expenseData,
        id: 'exp_' + Math.random().toString(36).substr(2, 9),
        shopId: req.user.shopId,
        branchId: req.user.branchId,
        createdAt: new Date().toISOString()
      };
      const saved = await dbManager.saveExpense(newExpense);
      await logAudit(req.user.userId, 'CREATE_EXPENSE', `Recorded expense: ${newExpense.title} - $${newExpense.amount}`, newExpense.branchId, req.user.shopId, req);
      res.status(201).json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 9. API: STOCK MOVEMENTS / TRANSFERS
  // ==========================================
  app.get('/api/stock-movements', authenticate, async (req: any, res) => {
    try {
      const movements = await dbManager.getStockMovements(req.user.shopId);
      res.json(movements);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/stock-movements', authenticate, authorize(UserRole.OWNER, UserRole.MANAGER), async (req: any, res) => {
    try {
      const moveData: StockMovement = req.body;
      const newMovement: StockMovement = {
        ...moveData,
        id: 'mov_' + Math.random().toString(36).substr(2, 9),
        shopId: req.user.shopId,
        timestamp: new Date().toISOString()
      };
      const saved = await dbManager.saveStockMovement(newMovement);
      await logAudit(req.user.userId, 'STOCK_TRANSFER', `Initiated stock transfer: ${newMovement.productName} qty ${newMovement.quantity}`, newMovement.fromBranchId || 'b1', req.user.shopId, req);
      res.status(201).json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/stock-movements/:id', authenticate, authorize(UserRole.OWNER, UserRole.MANAGER), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updated = await dbManager.updateStockMovement(id, req.body, req.user.shopId);
      if (updated) {
        await logAudit(req.user.userId, 'STOCK_TRANSFER_UPDATE', `Approved stock transfer ID ${id} - status ${updated.status}`, updated.fromBranchId || 'b1', req.user.shopId, req);
        res.json(updated);
      } else {
        res.status(404).json({ error: 'Stock movement not found.' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 10. API: RETURNS (CASHIER / MANAGER)
  // ==========================================
  app.get('/api/returns', authenticate, async (req: any, res) => {
    try {
      const returns = await dbManager.getReturns(req.user.shopId);
      res.json(returns);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/returns', authenticate, authorize(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER), async (req: any, res) => {
    try {
      const returnObj: Return = req.body;
      const newReturn: Return = {
        ...returnObj,
        id: 'ret_' + Math.random().toString(36).substr(2, 9),
        shopId: req.user.shopId,
        branchId: req.user.branchId,
        timestamp: new Date().toISOString()
      };
      const saved = await dbManager.saveReturn(newReturn);
      await logAudit(req.user.userId, 'SALE_RETURN', `Recorded item returns for invoice ${newReturn.invoiceNumber}`, newReturn.branchId, req.user.shopId, req);
      res.status(201).json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 11. API: BRANCHES MANAGEMENT
  // ==========================================
  app.get('/api/branches', authenticate, async (req: any, res) => {
    try {
      const branches = await dbManager.getBranches(req.user.shopId);
      res.json(branches);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/branches', authenticate, authorize(UserRole.OWNER), async (req: any, res) => {
    try {
      const branchData: Branch = req.body;
      const newBranch: Branch = {
        ...branchData,
        id: 'b_' + Math.random().toString(36).substr(2, 9),
        shopId: req.user.shopId,
        createdAt: new Date().toISOString()
      };
      const saved = await dbManager.saveBranch(newBranch);
      await logAudit(req.user.userId, 'CREATE_BRANCH', `Created Branch: ${newBranch.name}`, 'b1', req.user.shopId, req);
      res.status(201).json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 12. API: EMPLOYEES / USERS PROVISIONING
  // ==========================================
  app.get('/api/users', authenticate, authorize(UserRole.OWNER, UserRole.MANAGER), async (req: any, res) => {
    try {
      const users = await dbManager.getUsers(req.user.shopId);
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/users', authenticate, authorize(UserRole.OWNER, UserRole.MANAGER), async (req: any, res) => {
    try {
      const { username, fullname, email, role, branchId, password } = req.body;
      
      const users = await dbManager.getUsers('super_admin_shop');
      if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        return res.status(400).json({ error: 'Username is already taken' });
      }

      // Restrict created role to MANAGER or CASHIER when created by Shop Owner/Manager
      const assignedRole = role === UserRole.MANAGER ? UserRole.MANAGER : UserRole.CASHIER;

      const passwordHash = await bcrypt.hash(password || 'employee123', 10);
      const newUser: User = {
        id: 'u_' + Math.random().toString(36).substr(2, 9),
        shopId: req.user.shopId,
        branchId: branchId || 'b1',
        username,
        fullname,
        email,
        passwordHash,
        role: assignedRole,
        status: 'Active',
        createdAt: new Date().toISOString()
      };

      const saved = await dbManager.saveUser(newUser);

      // Fetch shop and branch names for the email
      const shops = await dbManager.getShops();
      const currentShop = shops.find(s => s.id === req.user.shopId);
      const shopName = currentShop ? currentShop.shopName : 'Retail POS';

      const branches = await dbManager.getBranches(req.user.shopId);
      const currentBranch = branches.find(b => b.id === (branchId || 'b1'));
      const branchName = currentBranch ? currentBranch.name : 'Main Branch';

      // Dispatch Email Notification to staff member
      const emailNotif = await dispatchCredentialsEmail(
        email,
        fullname,
        assignedRole,
        username,
        password || 'employee123',
        req.user.shopId,
        shopName,
        branchName
      );

      await logAudit(req.user.userId, 'PROVISION_USER', `Created ${assignedRole} user: ${newUser.fullname} (${username}) and dispatched credentials email to ${email}`, newUser.branchId, req.user.shopId, req);

      res.status(201).json({
        ...saved,
        emailNotification: emailNotif
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get Email Notifications Log
  app.get('/api/emails', authenticate, async (req: any, res) => {
    try {
      const emails = await dbManager.getEmailNotifications(req.user.shopId);
      res.json(emails);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Manual Trigger to Send/Resend Email Credentials
  app.post('/api/emails/send', authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER), async (req: any, res) => {
    try {
      const { recipientEmail, recipientName, role, username, password, branchName } = req.body;
      const shops = await dbManager.getShops();
      const shop = shops.find(s => s.id === req.user.shopId);
      const shopName = shop ? shop.shopName : 'Retail Store';

      const emailNotif = await dispatchCredentialsEmail(
        recipientEmail,
        recipientName,
        role || UserRole.CASHIER,
        username,
        password || 'tempPass123',
        req.user.shopId,
        shopName,
        branchName || 'Main Branch'
      );

      if (emailNotif.status === 'Failed') {
        return res.status(502).json({
          success: false,
          error: 'Email delivery failed. Check the production SMTP settings and mail server logs.',
          emailNotification: emailNotif
        });
      }

      res.json({ success: true, emailNotification: emailNotif });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 13. API: OFFLINE-FIRST SYNCHRONIZATION ENGINE
  // ==========================================
  app.post('/api/sync', authenticate, async (req: any, res) => {
    try {
      const { offlineQueue, branchId } = req.body;
      const syncResult = await dbManager.syncOfflineQueue(offlineQueue, branchId, req.user.shopId);
      res.json(syncResult);
    } catch (err: any) {
      console.error('[API Sync] Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 14. API: QUOTATIONS (TENANT ISOLATED)
  // ==========================================
  app.get('/api/quotations', authenticate, async (req: any, res) => {
    try {
      const branchId = (req.query.branchId as string) || 'b1';
      const quotations = await dbManager.getQuotations(branchId, req.user.shopId);
      res.json(quotations);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/quotations', authenticate, async (req: any, res) => {
    try {
      const quotation: Quotation = req.body;
      quotation.shopId = req.user.shopId;
      quotation.branchId = req.user.branchId;
      const saved = await dbManager.saveQuotation(quotation);
      await logAudit(quotation.cashierId, 'CREATE_QUOTATION', `Created Quotation ${quotation.quotationNumber} for customer ${quotation.customerName || 'Walk-in'} - Total: $${quotation.total.toFixed(2)}`, quotation.branchId, req.user.shopId, req);
      res.status(201).json({ success: true, quotation: saved });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 15. API: AUDIT LOGS (TENANT ISOLATED)
  // ==========================================
  app.get('/api/audit-logs', authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER), async (req: any, res) => {
    try {
      const logs = await dbManager.getAuditLogs(req.user.shopId);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 16. API: SYSTEM SETTINGS
  // ==========================================
  app.get('/api/settings', authenticate, (req: any, res) => {
    res.json({
      storeName: 'Cobult Stocks Retail',
      taxPercentage: 15,
      currencySymbol: 'USD',
      vatNumber: 'VAT-789-201-99',
      receiptHeader: 'Welcome to Cobult Stocks!',
      receiptFooter: 'Thank you for your business. Please come again!',
      returnPolicy: 'Returns only allowed within 7 days with valid receipt.',
      autoBackup: true,
      syncIntervalSeconds: 30,
    });
  });

  app.get('/api/mongodb-status', async (req, res) => {
    try {
      const dbInstance = await dbManager.getDb();
      res.json({
        enabled: !!process.env.MONGODB_URI,
        connected: !!dbInstance
      });
    } catch (err) {
      res.json({ enabled: !!process.env.MONGODB_URI, connected: false });
    }
  });

  // ==========================================
  // VITE DEVELOPMENT MIDDLEWARE OR STATIC SERVING
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cobult Stocks server running on http://localhost:${PORT}`);
  });
}

startServer();
