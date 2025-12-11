// js/app.js - Main Application File (COMPLETE UPDATED VERSION)

// ==================== AUTHENTICATION ====================
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Check for existing session
        const sessionData = localStorage.getItem('invoiceProSession');
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                this.currentUser = session.user;
                
                // Verify session is still valid (not expired)
                if (session.expiry && new Date(session.expiry) > new Date()) {
                    console.log('✅ Session restored for:', this.currentUser.email);
                } else {
                    console.log('⚠️ Session expired');
                    this.logout();
                }
            } catch (error) {
                console.error('❌ Session parse error:', error);
                this.logout();
            }
        }
    }

    login(email, password) {
        console.log('🔑 Login attempt for:', email);
        
        // Basic validation
        if (!email || !password) {
            return { success: false, message: 'Please enter email and password' };
        }
        
        // Find user in database
        const user = DB.findUserByEmail(email);
        
        if (!user) {
            console.log('❌ User not found:', email);
            return { 
                success: false, 
                message: 'User not found. Please register first.' 
            };
        }

        // Check password
        if (user.password !== password) {
            console.log('❌ Invalid password for:', email);
            return { 
                success: false, 
                message: 'Invalid password. Please try again.' 
            };
        }

        // Create session (without password)
        const { password: _, ...userWithoutPassword } = user;
        this.currentUser = userWithoutPassword;
        
        // Create session data
        const session = {
            user: userWithoutPassword,
            loginTime: new Date().toISOString(),
            expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        };
        
        // Save session to localStorage
        localStorage.setItem('invoiceProSession', JSON.stringify(session));
        
        // Update last login in database
        DB.updateUser(user.id, { 
            lastLogin: new Date().toISOString() 
        });
        
        // Add login activity
        DB.addActivity({
            userId: user.id,
            type: 'user_login',
            title: 'User Login',
            description: `${user.name} logged in successfully`,
            timestamp: new Date().toISOString(),
            metadata: { loginMethod: 'email' }
        });
        
        console.log('✅ Login successful for:', email);
        return { 
            success: true, 
            message: 'Login successful!',
            user: userWithoutPassword 
        };
    }

    register(userData) {
        console.log('📝 Registration attempt for:', userData.email);
        
        // Validate required fields
        if (!userData.name || !userData.email || !userData.password) {
            return { 
                success: false, 
                message: 'Please fill all required fields' 
            };
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            return { 
                success: false, 
                message: 'Please enter a valid email address' 
            };
        }
        
        // Password validation
        if (userData.password.length < 6) {
            return { 
                success: false, 
                message: 'Password must be at least 6 characters' 
            };
        }
        
        // Create user in database
        const result = DB.createUser(userData);
        
        if (result.success) {
            console.log('✅ Registration successful for:', userData.email);
            
            // Auto-login after successful registration
            const loginResult = this.login(userData.email, userData.password);
            
            if (loginResult.success) {
                return {
                    success: true,
                    message: 'Registration successful! Logging you in...',
                    user: loginResult.user
                };
            } else {
                return {
                    success: true,
                    message: 'Registration successful! Please login manually.',
                    user: null
                };
            }
        } else {
            console.log('❌ Registration failed:', result.message);
            return result;
        }
    }

    logout() {
        console.log('🚪 Logging out user:', this.currentUser?.email);
        
        // Add logout activity
        if (this.currentUser) {
            DB.addActivity({
                userId: this.currentUser.id,
                type: 'user_logout',
                title: 'User Logout',
                description: `${this.currentUser.name} logged out`,
                timestamp: new Date().toISOString(),
                metadata: {}
            });
        }
        
        // Clear session data
        this.currentUser = null;
        localStorage.removeItem('invoiceProSession');
        
        console.log('✅ Logout successful');
        
        // Redirect to login page
        setTimeout(() => {
            if (!window.location.pathname.includes('index.html')) {
                window.location.href = 'index.html';
            }
        }, 500);
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    updateUserProfile(updates) {
        if (!this.currentUser) return false;
        
        const updated = DB.updateUser(this.currentUser.id, updates);
        if (updated) {
            // Update current session
            this.currentUser = { ...this.currentUser, ...updates };
            const session = JSON.parse(localStorage.getItem('invoiceProSession'));
            session.user = this.currentUser;
            localStorage.setItem('invoiceProSession', JSON.stringify(session));
        }
        return updated;
    }

    // Check if session is valid
    validateSession() {
        if (!this.currentUser) return false;
        
        const sessionData = localStorage.getItem('invoiceProSession');
        if (!sessionData) return false;
        
        try {
            const session = JSON.parse(sessionData);
            return new Date(session.expiry) > new Date();
        } catch {
            return false;
        }
    }
}

// Create global auth instance
const Auth = new AuthSystem();

// ==================== UTILITIES ====================
class Utils {
    static formatCurrency(amount, currency = '৳') {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount) + ' ' + currency;
    }

    static formatDate(dateString, format = 'relative') {
        if (!dateString) return 'Unknown';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (format === 'relative') {
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
            return date.toLocaleDateString();
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    static showToast(message, type = 'info', duration = 3000) {
        // Remove existing toasts
        document.querySelectorAll('.toast').forEach(toast => toast.remove());
        
        // Create new toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 
                                 type === 'error' ? 'exclamation-circle' : 
                                 type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close">&times;</button>
        `;

        document.body.appendChild(toast);

        // Show with animation
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);

        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static generateId(prefix = '') {
        return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
}

// ==================== LOGIN PAGE ====================
if (document.querySelector('.auth-container')) {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📍 Login page loaded');
        
        // Check if already logged in
        if (Auth.isLoggedIn() && Auth.validateSession()) {
            console.log('⚠️ Already logged in, redirecting...');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 500);
            return;
        }

        // Tab switching
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (loginTab && registerTab) {
            loginTab.addEventListener('click', () => {
                loginTab.classList.add('active');
                registerTab.classList.remove('active');
                loginForm.classList.add('active');
                registerForm.classList.remove('active');
            });

            registerTab.addEventListener('click', () => {
                registerTab.classList.add('active');
                loginTab.classList.remove('active');
                registerForm.classList.add('active');
                loginForm.classList.remove('active');
            });
        }

        // Login form submission
        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const email = document.getElementById('loginEmail').value.trim();
                const password = document.getElementById('loginPassword').value;
                
                // Validation
                if (!email || !password) {
                    Utils.showToast('Please fill in all fields', 'error');
                    return;
                }
                
                if (!Utils.validateEmail(email)) {
                    Utils.showToast('Please enter a valid email address', 'error');
                    return;
                }

                // Show loading state
                const submitBtn = this.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
                submitBtn.disabled = true;

                // Process login
                setTimeout(() => {
                    const result = Auth.login(email, password);
                    
                    if (result.success) {
                        Utils.showToast(result.message, 'success');
                        setTimeout(() => {
                            window.location.href = 'dashboard.html';
                        }, 1000);
                    } else {
                        Utils.showToast(result.message, 'error');
                        submitBtn.innerHTML = originalText;
                        submitBtn.disabled = false;
                    }
                }, 800);
            });
        }

        // Register form submission
        if (registerForm) {
            registerForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const name = document.getElementById('regName').value.trim();
                const email = document.getElementById('regEmail').value.trim();
                const password = document.getElementById('regPassword').value;
                const confirmPassword = document.getElementById('regConfirmPassword').value;
                const company = document.getElementById('regCompany').value.trim();
                
                // Validation
                if (!name || !email || !password || !confirmPassword) {
                    Utils.showToast('Please fill all required fields', 'error');
                    return;
                }
                
                if (!Utils.validateEmail(email)) {
                    Utils.showToast('Please enter a valid email address', 'error');
                    return;
                }
                
                if (password.length < 6) {
                    Utils.showToast('Password must be at least 6 characters', 'error');
                    return;
                }
                
                if (password !== confirmPassword) {
                    Utils.showToast('Passwords do not match', 'error');
                    return;
                }

                // Show loading state
                const submitBtn = this.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
                submitBtn.disabled = true;

                // Prepare user data
                const userData = {
                    name,
                    email,
                    password,
                    company: company || '',
                    role: 'user'
                };

                // Process registration
                setTimeout(() => {
                    const result = Auth.register(userData);
                    
                    if (result.success) {
                        if (result.user) {
                            // Auto-login was successful
                            Utils.showToast(result.message, 'success');
                            setTimeout(() => {
                                window.location.href = 'dashboard.html';
                            }, 1000);
                        } else {
                            // Registration successful but need to login
                            Utils.showToast(result.message, 'success');
                            // Switch to login tab
                            if (loginTab) loginTab.click();
                            // Pre-fill email
                            document.getElementById('loginEmail').value = email;
                            submitBtn.innerHTML = originalText;
                            submitBtn.disabled = false;
                        }
                    } else {
                        Utils.showToast(result.message, 'error');
                        submitBtn.innerHTML = originalText;
                        submitBtn.disabled = false;
                    }
                }, 1000);
            });
        }

        // Demo account auto-fill
        const demoFillBtn = document.createElement('button');
        demoFillBtn.type = 'button';
        demoFillBtn.className = 'btn btn-outline btn-sm';
        demoFillBtn.innerHTML = '<i class="fas fa-magic"></i> Fill Demo';
        demoFillBtn.style.marginTop = '10px';
        demoFillBtn.style.width = '100%';
        
        demoFillBtn.addEventListener('click', () => {
            document.getElementById('loginEmail').value = 'demo@invoice.com';
            document.getElementById('loginPassword').value = 'demo123';
            Utils.showToast('Demo credentials filled. Click Login!', 'info');
        });
        
        const loginButton = loginForm?.querySelector('button[type="submit"]');
        if (loginButton) {
            loginButton.parentNode.appendChild(demoFillBtn);
        }
    });
}

// ==================== GENERAL PAGE INITIALIZATION ====================
function initPage() {
    // This runs on every page except index.html
    if (document.querySelector('.app-container')) {
        console.log('📍 Page initialized:', window.location.pathname);
        
        // Check authentication
        if (!Auth.isLoggedIn() || !Auth.validateSession()) {
            console.log('❌ Not authenticated, redirecting to login');
            Utils.showToast('Please login to continue', 'warning');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
            return false;
        }
        
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) {
            window.location.href = 'index.html';
            return false;
        }
        
        // Update user info in sidebar (common to all pages)
        updateUserInfo(currentUser);
        
        // Setup common event listeners
        setupCommonEvents();
        
        return true;
    }
    return false;
}

function updateUserInfo(user) {
    const userNameEl = document.getElementById('userName');
    const userEmailEl = document.getElementById('userEmail');
    
    if (userNameEl) userNameEl.textContent = user.name || 'User';
    if (userEmailEl) userEmailEl.textContent = user.email || 'user@example.com';
    
    // Update page title with user info if not already set
    if (!document.title.includes(user.name || 'InvoicePro')) {
        document.title = `${document.title} - ${user.name || 'InvoicePro'}`;
    }
    
    // Load company avatar (ADD THIS)
    loadCompanyAvatar();
}

// Add this new function after updateUserInfo function
function loadCompanyAvatar() {
    const logoData = localStorage.getItem('company_avatar');
    const avatarElements = document.querySelectorAll('.user-avatar');
    
    if (logoData && avatarElements.length > 0) {
        avatarElements.forEach(avatar => {
            // Check if already has logo
            if (!avatar.querySelector('img')) {
                const img = document.createElement('img');
                img.src = logoData;
                img.alt = 'Company Logo';
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '50%';
                
                avatar.innerHTML = '';
                avatar.appendChild(img);
                avatar.classList.add('company-avatar');
            }
        });
    }
}

function initPage() {
    // This runs on every page except index.html
    if (document.querySelector('.app-container')) {
        console.log('📍 Page initialized:', window.location.pathname);
        
        // Check authentication
        if (!Auth.isLoggedIn() || !Auth.validateSession()) {
            console.log('❌ Not authenticated, redirecting to login');
            Utils.showToast('Please login to continue', 'warning');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
            return false;
        }
        
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) {
            window.location.href = 'index.html';
            return false;
        }
        
        // Update user info in sidebar (common to all pages)
        updateUserInfo(currentUser);
        
        // Setup common event listeners
        setupCommonEvents();
        
        // Load avatar (ADD THIS)
        setTimeout(() => loadCompanyAvatar(), 100);
        
        return true;
    }
    return false;
}

function setupCommonEvents() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
                logoutBtn.disabled = true;
                setTimeout(() => {
                    Auth.logout();
                }, 500);
            }
        });
    }
    
    // Menu toggle for mobile
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            document.body.classList.toggle('sidebar-active');
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                !e.target.closest('.sidebar') && 
                !e.target.closest('.menu-toggle')) {
                sidebar.classList.remove('active');
                document.body.classList.remove('sidebar-active');
            }
        });
    }
    
    // Handle navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        
        // Handle empty hrefs (coming soon pages)
if (href === '#') {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const section = this.querySelector('span').textContent;
        
        // Check if this is Products or Clients
        if (section === 'Products') {
            window.location.href = 'products.html';
            return;
        }
        if (section === 'Clients') {
            window.location.href = 'clients.html';
            return;
        }
        
        // For other sections, show coming soon
        Utils.showToast(`${section} module coming soon!`, 'info');
        
        // Update active state
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        
        // Update parent nav-item
        const parentItem = this.closest('.nav-item');
        if (parentItem) {
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            parentItem.classList.add('active');
        }
    });
}
        // Handle actual page links (products, clients, etc.)
        else if (href && href !== 'dashboard.html') {
            link.addEventListener('click', function(e) {
                // Log navigation activity
                const currentUser = Auth.getCurrentUser();
                if (currentUser && this.getAttribute('href') !== window.location.pathname.split('/').pop()) {
                    DB.addActivity({
                        userId: currentUser.id,
                        type: 'navigation',
                        title: 'Page Navigation',
                        description: `Navigated to ${this.querySelector('span').textContent}`,
                        timestamp: new Date().toISOString(),
                        metadata: { page: href }
                    });
                }
            });
        }
    });
    
    // Update active navigation based on current page
    updateActiveNavigation();
}

function updateActiveNavigation() {
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        link.classList.remove('active');
        
        // Check if current page matches the link
        if (href === currentPage) {
            link.classList.add('active');
            // Also activate parent nav-item
            const parentItem = link.closest('.nav-item');
            if (parentItem) {
                parentItem.classList.add('active');
            }
        }
        
        // Remove active from dashboard if we're on another page
        if (currentPage !== 'dashboard.html' && href === 'dashboard.html') {
            const parentItem = link.closest('.nav-item');
            if (parentItem) {
                parentItem.classList.remove('active');
            }
        }
    });
}

// ==================== DASHBOARD PAGE ====================
if (document.querySelector('.app-container') && window.location.pathname.includes('dashboard.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📍 Dashboard page loaded');
        
        // Initialize common page functionality
        if (!initPage()) return;
        
        // Initialize dashboard-specific functionality
        initDashboard();
        setupDashboardEvents();
        
        // Check and show session expiry warning
        const sessionData = JSON.parse(localStorage.getItem('invoiceProSession') || '{}');
        if (sessionData.expiry) {
            const expiryDate = new Date(sessionData.expiry);
            const hoursLeft = Math.floor((expiryDate - new Date()) / 3600000);
            
            if (hoursLeft < 24) {
                Utils.showToast(`Session expires in ${hoursLeft} hours`, 'warning', 5000);
            }
        }
    });

    function initDashboard() {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) {
            console.error('❌ No user found in session');
            return;
        }

        console.log('👤 Dashboard user:', currentUser.email);
        
        // Load dashboard data
        loadDashboardData(currentUser.id);
    }

    function loadDashboardData(userId) {
        // Load recent activities
        const activities = DB.getRecentActivities(userId, 5);
        const activityList = document.getElementById('recentActivity');
        
        if (activityList) {
            if (activities.length > 0) {
                activityList.innerHTML = activities.map(activity => `
                    <div class="activity-item">
                        <div class="activity-header">
                            <span class="activity-title">${activity.title}</span>
                            <span class="activity-time">${Utils.formatDate(activity.timestamp)}</span>
                        </div>
                        <div class="activity-description">
                            ${activity.description}
                        </div>
                    </div>
                `).join('');
            } else {
                activityList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-history"></i>
                        <p>No recent activity</p>
                        <small>Activities will appear here as you use the app</small>
                    </div>
                `;
            }
        }

        // Load statistics
        const stats = DB.getDashboardStats(userId);
        
        // Update glance stats
        const elements = {
            'totalOutstanding': stats.totalOutstanding,
            'totalOverdue': stats.totalOverdue,
            'totalCollected': stats.totalCollected,
            'totalClients': stats.totalClients,
            'totalInvoices': stats.totalInvoices,
            'totalProducts': stats.totalProducts,
            'paidInvoices': stats.paidInvoices,
            'pendingInvoices': stats.pendingInvoices
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (id.includes('Outstanding') || id.includes('Overdue') || id.includes('Collected')) {
                    element.textContent = Utils.formatCurrency(value);
                } else {
                    element.textContent = value;
                }
            }
        });
    }

    function setupDashboardEvents() {
        // New Invoice button
        const newInvoiceBtn = document.getElementById('newInvoiceBtn');
        if (newInvoiceBtn) {
            newInvoiceBtn.addEventListener('click', () => {
                const currentUser = Auth.getCurrentUser();
                if (currentUser) {
                    // Create a sample invoice
                    const invoice = DB.addInvoice(currentUser.id, {
                        invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
                        clientName: 'Test Client',
                        clientEmail: 'test@client.com',
                        clientPhone: '+880 1234 567890',
                        date: new Date().toISOString().split('T')[0],
                        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        items: [
                            {
                                id: Utils.generateId('ITEM'),
                                name: 'Test Service',
                                description: 'Sample invoice item',
                                quantity: 1,
                                price: 10000,
                                tax: 500,
                                total: 10500
                            }
                        ],
                        subtotal: 10000,
                        tax: 500,
                        total: 10500,
                        status: 'pending',
                        notes: 'Sample invoice created from dashboard'
                    });
                    
                    if (invoice) {
                        Utils.showToast(`Invoice ${invoice.invoiceNumber} created!`, 'success');
                        // Refresh dashboard data
                        loadDashboardData(currentUser.id);
                    }
                }
            });
        }

        // View Activity Log
        const viewActivityLink = document.querySelector('a[href="#"]');
        if (viewActivityLink && viewActivityLink.textContent.includes('View Activity Log')) {
            viewActivityLink.addEventListener('click', (e) => {
                e.preventDefault();
                const currentUser = Auth.getCurrentUser();
                if (currentUser) {
                    const activities = DB.getRecentActivities(currentUser.id, 20);
                    alert(`Showing ${activities.length} activities\n\n` + 
                          activities.map(a => `• ${a.title} - ${Utils.formatDate(a.timestamp, 'full')}`).join('\n'));
                }
            });
        }
        
        // Add refresh button
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'btn btn-outline btn-sm';
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        refreshBtn.style.marginLeft = 'auto';
        refreshBtn.style.marginRight = '10px';
        
        refreshBtn.addEventListener('click', () => {
            const currentUser = Auth.getCurrentUser();
            if (currentUser) {
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
                setTimeout(() => {
                    loadDashboardData(currentUser.id);
                    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
                    Utils.showToast('Dashboard refreshed!', 'success');
                }, 500);
            }
        });
        
        // Add refresh button to card header
        const cardHeader = document.querySelector('.card-header h3');
        if (cardHeader && cardHeader.textContent === 'Recent Activity') {
            cardHeader.parentNode.insertBefore(refreshBtn, cardHeader.nextSibling);
        }
    }
}

// ==================== PRODUCTS PAGE ====================
if (document.querySelector('.app-container') && window.location.pathname.includes('products.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📍 Products page loaded');
        
        // Initialize common page functionality
        if (!initPage()) return;
        
        // Update page title
        document.title = 'Products Management - InvoicePro';
        
        console.log('✅ Products page ready for products.js initialization');
    });
}

// ==================== CLIENTS PAGE ====================
if (document.querySelector('.app-container') && window.location.pathname.includes('clients.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📍 Clients page loaded');
        
        // Initialize common page functionality
        if (!initPage()) return;
        
        // Update page title
        document.title = 'Clients Management - InvoicePro';
        
        console.log('✅ Clients page ready for clients.js initialization');
    });
}

// ==================== OTHER PAGES ====================
if (document.querySelector('.app-container') && 
    !window.location.pathname.includes('dashboard.html') &&
    !window.location.pathname.includes('products.html') &&
    !window.location.pathname.includes('clients.html') &&
    !window.location.pathname.includes('index.html')) {
    
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📍 Other page loaded:', window.location.pathname);
        
        // Initialize common page functionality
        if (initPage()) {
            console.log('✅ Page initialized successfully');
        }
    });
}

// ==================== DEBUG & TEST FUNCTIONS ====================
// These functions are available in browser console
window.debug = {
    // Show current session
    showSession: function() {
        console.log('🔍 Current Session:', JSON.parse(localStorage.getItem('invoiceProSession') || '{}'));
        console.log('👤 Current User:', Auth.getCurrentUser());
    },
    
    // Show database
    showDB: function() {
        console.log('📊 Database:', DB.load());
    },
    
    // Reset everything
    resetAll: function() {
        if (confirm('Reset everything including database?')) {
            localStorage.clear();
            console.log('✅ Everything reset. Reloading...');
            location.reload();
        }
    },
    
    // Test registration
    testRegister: function() {
        const testUser = {
            name: 'Test User',
            email: 'test@example.com',
            password: 'test123',
            company: 'Test Company'
        };
        const result = Auth.register(testUser);
        console.log('Test Registration:', result);
    },
    
    // List all users
    listUsers: function() {
        const db = DB.load();
        console.log('👥 All Users:', db.users);
    },
    
    // List user products
    listUserProducts: function() {
        const currentUser = Auth.getCurrentUser();
        if (currentUser) {
            const products = DB.getUserProducts(currentUser.id);
            console.log('📦 User Products:', products);
            return products;
        } else {
            console.log('❌ No user logged in');
            return [];
        }
    },
    
    // List user clients
    listUserClients: function() {
        const currentUser = Auth.getCurrentUser();
        if (currentUser) {
            const clients = DB.getUserClients(currentUser.id);
            console.log('👥 User Clients:', clients);
            return clients;
        } else {
            console.log('❌ No user logged in');
            return [];
        }
    },
    
    // Add test product
    addTestProduct: function() {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) {
            console.log('❌ Please login first');
            return;
        }
        
        const testProduct = {
            userId: currentUser.id,
            name: 'Test Product ' + Date.now(),
            description: 'This is a test product',
            price: 999.99,
            category: 'Test',
            stock: 100,
            status: 'active',
            createdAt: new Date().toISOString()
        };
        
        // Note: You'll need to implement DB.addProduct() in database.js
        console.log('Test Product Data:', testProduct);
        return testProduct;
    }
};

// Auto-login for testing
window.quickLogin = function(email = 'demo@invoice.com', password = 'demo123') {
    const result = Auth.login(email, password);
    if (result.success) {
        console.log('✅ Quick login successful');
        window.location.href = 'dashboard.html';
    } else {
        console.log('❌ Quick login failed:', result.message);
    }
};

// Test navigation
window.testNavigation = function() {
    const currentUser = Auth.getCurrentUser();
    if (currentUser) {
        DB.addActivity({
            userId: currentUser.id,
            type: 'test_navigation',
            title: 'Test Navigation',
            description: 'Test navigation from console',
            timestamp: new Date().toISOString(),
            metadata: { test: true }
        });
        console.log('✅ Test navigation activity added');
    } else {
        console.log('❌ No user logged in');
    }
};
// Test function to check avatar functionality
window.testAvatar = function() {
    const logoData = localStorage.getItem('company_avatar');
    console.log('Avatar Data:', logoData ? 'Loaded' : 'Not loaded');
    
    const avatarElements = document.querySelectorAll('.user-avatar');
    console.log('Avatar elements found:', avatarElements.length);
    
    if (logoData) {
        // Show preview
        const img = document.createElement('img');
        img.src = logoData;
        img.style.maxWidth = '200px';
        img.style.maxHeight = '200px';
        img.style.border = '2px solid #3498db';
        img.style.borderRadius = '10px';
        img.style.padding = '10px';
        img.style.background = 'white';
        
        const preview = window.open();
        preview.document.write('<h2>Company Avatar Preview</h2>');
        preview.document.body.appendChild(img);
        preview.document.write('<p>This is your current company avatar</p>');
    } else {
        alert('No company avatar found. Upload a logo in Settings page.');
    }
};

console.log('🚀 InvoicePro App v3.1 Loaded');
console.log('💡 Use debug.showSession() to check current login');
console.log('💡 Use quickLogin() for instant access');
console.log('📍 Current page:', window.location.pathname);
console.log('👤 User status:', Auth.isLoggedIn() ? 'Logged in' : 'Not logged in');