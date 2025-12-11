// data/database.js - Updated with Trash System

class InvoiceProDB {
    constructor() {
        this.dbName = 'InvoiceProDB';
        this.initDatabase();
    }

    initDatabase() {
        if (!localStorage.getItem(this.dbName)) {
            const initialData = {
                version: '3.1.0', // Updated version
                lastUpdated: new Date().toISOString(),
                users: [
                    {
                        id: 'USR-1001',
                        name: 'Demo User',
                        email: 'demo@invoice.com',
                        password: 'demo123',
                        company: 'Demo Company',
                        role: 'admin',
                        createdAt: new Date().toISOString(),
                        lastLogin: new Date().toISOString(),
                        isActive: true,
                        settings: {
                            currency: '৳',
                            taxRate: 5,
                            language: 'en',
                            timezone: 'Asia/Dhaka'
                        }
                    }
                ],
                invoices: [],
                clients: [],
                products: [],
                categories: [], // Added categories array if you need it later
                activities: [],
                settings: {
                    appName: 'InvoicePro',
                    defaultCurrency: '৳',
                    defaultTaxRate: 5,
                    dateFormat: 'DD/MM/YYYY'
                }
            };
            this.save(initialData);
            console.log('✅ Database initialized with Trash System support');
        }
    }

    // Core operations
    save(data) {
        try {
            if (!data) return false;
            data.lastUpdated = new Date().toISOString();
            localStorage.setItem(this.dbName, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('❌ Database save error:', error);
            return false;
        }
    }

    load() {
        try {
            const data = localStorage.getItem(this.dbName);
            if (!data) {
                this.initDatabase();
                return this.load();
            }
            return JSON.parse(data);
        } catch (error) {
            console.error('❌ Database load error:', error);
            return null;
        }
    }

    // ==========================================
    // 🗑️ TRASH SYSTEM METHODS
    // ==========================================

    /**
     * Move an item to trash (Soft Delete)
     * @param {string} collectionName - 'clients', 'invoices', 'products', 'categories'
     * @param {string} id - The ID of the item to delete
     */
    moveToTrash(collectionName, id) {
        const db = this.load();
        const list = db[collectionName];
        
        if (!list) {
            console.error(`Collection ${collectionName} not found`);
            return false;
        }

        const itemIndex = list.findIndex(i => i.id === id);
        if (itemIndex > -1) {
            // Mark as deleted instead of removing
            list[itemIndex].isDeleted = true;
            list[itemIndex].deletedAt = new Date().toISOString();
            
            const saved = this.save(db);
            if (saved) {
                // Log activity
                // Note: You might need to fetch userId from the item if available, or pass it in
                console.log(`🗑️ Moved ${id} to trash in ${collectionName}`);
            }
            return saved;
        }
        return false;
    }

    /**
     * Restore an item from trash
     */
    restoreFromTrash(collectionName, id) {
        const db = this.load();
        const list = db[collectionName];
        const item = list.find(i => i.id === id);

        if (item) {
            delete item.isDeleted;
            delete item.deletedAt;
            return this.save(db);
        }
        return false;
    }

    /**
     * Permanently delete an item
     */
    permanentDelete(collectionName, id) {
        const db = this.load();
        const list = db[collectionName];
        const index = list.findIndex(i => i.id === id);

        if (index > -1) {
            list.splice(index, 1); // Actually remove it from array
            return this.save(db);
        }
        return false;
    }

    /**
     * Get deleted items for a specific user
     */
    getTrashItems(userId, collectionName) {
        const db = this.load();
        const list = db[collectionName] || [];
        // Return items that BELONG to user AND are marked deleted
        return list.filter(item => item.userId === userId && item.isDeleted === true);
    }

    // ==========================================
    // 🔍 UPDATED GETTERS (Filtering out trash)
    // ==========================================

    getUserClients(userId) {
        const db = this.load();
        // Only return clients that are NOT deleted
        return db.clients.filter(client => client.userId === userId && !client.isDeleted);
    }

    getUserInvoices(userId) {
        const db = this.load();
        return db.invoices.filter(inv => inv.userId === userId && !inv.isDeleted);
    }

    getUserProducts(userId) {
        const db = this.load();
        return db.products.filter(prod => prod.userId === userId && !prod.isDeleted);
    }

    // ==========================================
    // 👤 STANDARD OPERATIONS
    // ==========================================

    createUser(userData) {
        const db = this.load();
        if (db.users.find(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
            return { success: false, message: 'Email exists' };
        }
        const newUser = {
            ...userData,
            id: 'USR-' + Date.now(),
            createdAt: new Date().toISOString(),
            isActive: true,
            settings: { currency: '৳', taxRate: 0, language: 'en', timezone: 'Asia/Dhaka' }
        };
        db.users.push(newUser);
        this.save(db);
        return { success: true, user: newUser };
    }

    findUserById(id) {
        const db = this.load();
        return db.users.find(u => u.id === id && u.isActive);
    }

    findUserByEmail(email) {
        const db = this.load();
        return db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.isActive);
    }

    addActivity(activityData) {
        const db = this.load();
        const activity = {
            ...activityData,
            id: 'ACT-' + Date.now(),
            timestamp: new Date().toISOString()
        };
        db.activities.unshift(activity);
        if (db.activities.length > 100) db.activities = db.activities.slice(0, 100);
        this.save(db);
    }

    // Dashboard Stats (Updated to ignore trash)
    getDashboardStats(userId) {
        const invoices = this.getUserInvoices(userId); // Uses filtered getter
        const clients = this.getUserClients(userId);   // Uses filtered getter
        const products = this.getUserProducts(userId); // Uses filtered getter

        const totalOutstanding = invoices
            .filter(inv => inv.status === 'pending')
            .reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);

        return {
            totalClients: clients.length,
            totalInvoices: invoices.length,
            totalProducts: products.length,
            totalOutstanding,
            paidInvoices: invoices.filter(inv => inv.status === 'paid').length,
            pendingInvoices: invoices.filter(inv => inv.status === 'pending').length
        };
    }
}

// Global Instance
const DB = new InvoiceProDB();
window.DB = DB;