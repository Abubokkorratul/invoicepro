// js/products.js - UPDATED WITH TRASH SYSTEM INTEGRATION

$(document).ready(function() {
    console.log('📦 Products page loaded');
    
    // Check authentication
    if (!Auth || !Auth.isLoggedIn()) {
        console.log('⚠️ User not logged in, redirecting...');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        return;
    }
    
    // Get current user
    const currentUser = Auth.getCurrentUser();
    console.log('👤 Current user:', currentUser.email);
    
    // Update user info
    updateUserInfo(currentUser);
    
    // Initialize products manager
    initializeProductsManager(currentUser);
});

function updateUserInfo(user) {
    $('#userName').text(user.name || 'User');
    $('#userEmail').text(user.email);
}

function initializeProductsManager(currentUser) {
    console.log('🚀 Initializing products manager...');
    
    // Load products immediately
    loadAndDisplayProducts(currentUser);
    
    // Load draft count
    loadDraftProducts(currentUser);
    
    // Setup all event listeners
    setupEventListeners(currentUser);
}

// --- FIX 1: Updated to filter out deleted items ---
function loadAndDisplayProducts(currentUser) {
    console.log('📋 Loading products...');
    
    try {
        // Use the new DB method if available, or manual filter
        let products = [];
        
        if (DB.getUserProducts) {
            // This method in database.js already filters out deleted items
            products = DB.getUserProducts(currentUser.id);
        } else {
            // Fallback manual filter
            const db = DB.load();
            products = (db.products || []).filter(p => 
                p.userId === currentUser.id && 
                !p.isDeleted && // HIDE DELETED
                p.status !== 'draft'
            );
        }
        
        // Exclude drafts from main list (if getUserProducts included them)
        products = products.filter(p => p.status !== 'draft');

        console.log('📦 Active products found:', products.length);
        
        updateCategoryFilterDropdown(products, currentUser.id);
        
        if (products.length === 0) {
            showEmptyState();
            updateStats([]);
            return;
        }
        
        displayProductsInTable(products);
        updateStats(products);
        updateProductBadge(products.length);
        
    } catch (error) {
        console.error('❌ Error loading products:', error);
        showEmptyState();
    }
}

function updateCategoryFilterDropdown(products, userId) {
    const categoryFilter = $('#categoryFilter');
    if (categoryFilter.length === 0) return;
    
    const currentSelection = categoryFilter.val();
    categoryFilter.find('option:not(:first)').remove();
    
    const categories = new Set();
    
    try {
        const db = DB.load();
        const defaultCategories = ['Service', 'Product', 'Software', 'Consulting', 'Hardware', 'Other'];
        defaultCategories.forEach(cat => categories.add(cat));
        
        // Get categories from active products
        products.forEach(p => {
            if (p.category && p.category.trim()) categories.add(p.category.trim());
        });
        
    } catch (error) {
        console.error('Category error', error);
    }
    
    const sortedCategories = Array.from(categories).sort();
    
    sortedCategories.forEach(category => {
        categoryFilter.append(new Option(category, category));
    });
    
    if (currentSelection && sortedCategories.includes(currentSelection)) {
        categoryFilter.val(currentSelection);
    }
}

function displayProductsInTable(products) {
    const tableBody = $('#productsTableBody');
    tableBody.empty();
    
    products.forEach((product, index) => {
        const statusBadge = getStatusBadge(product);
        const category = product.category || 'Uncategorized';
        const stockInfo = getStockInfo(product);
        
        const row = `
            <tr data-product-id="${product.id}">
                <td class="serial-number">${index + 1}</td>
                <td class="product-image-cell">
                    <div class="product-image">
                        ${getProductIcon(product.type)}
                    </div>
                </td>
                <td class="product-details-cell">
                    <div class="product-name">
                        <strong>${product.name || 'Unnamed Product'}</strong>
                        ${product.SKU ? `<span class="product-sku">${product.SKU}</span>` : ''}
                    </div>
                    <div class="product-description">
                        ${product.description ? 
                            `${product.description.substring(0, 60)}${product.description.length > 60 ? '...' : ''}` : 
                            '<span class="text-muted">No description</span>'}
                    </div>
                </td>
                <td><code>${product.SKU || '—'}</code></td>
                <td><span class="category-badge">${category}</span></td>
                <td class="price-cell">
                    <div class="price-amount">${Utils.formatCurrency(product.price || 0)}</div>
                    ${product.cost ? `<div class="cost-price"><small>Cost: ${Utils.formatCurrency(product.cost)}</small></div>` : ''}
                </td>
                <td class="stock-cell">${stockInfo}</td>
                <td>${statusBadge}</td>
                <td class="actions-cell">
                    <div class="action-buttons">
                        <a href="product-view.html?id=${product.id}" class="btn-action view" title="View Details"><i class="fas fa-eye"></i></a>
                        <a href="product-edit.html?id=${product.id}" class="btn-action edit" title="Edit Product"><i class="fas fa-edit"></i></a>
                        <button class="btn-action delete" title="Move to Trash" 
                                data-id="${product.id}" data-name="${product.name}">
                            <i class="fas fa-trash"></i>
                        </button>
                        <a href="invoices.html?addProduct=${product.id}" class="btn-action invoice" title="Add to Invoice"><i class="fas fa-file-invoice"></i></a>
                    </div>
                </td>
            </tr>
        `;
        tableBody.append(row);
    });
    
    addDeleteListeners();
}

function getStatusBadge(product) {
    let statusClass = 'status-active';
    let statusText = 'Active';
    
    if (product.status === 'inactive') {
        statusClass = 'status-inactive';
        statusText = 'Inactive';
    } else if (product.status === 'draft') {
        statusClass = 'status-draft';
        statusText = 'Draft';
    } else if (product.stock !== undefined && product.stock === 0) {
        statusClass = 'status-out-of-stock';
        statusText = 'Out of Stock';
    } else if (product.lowStockAlert && product.stock <= product.lowStockAlert) {
        statusClass = 'status-warning';
        statusText = 'Low Stock';
    }
    
    return `<span class="status-badge ${statusClass}">${statusText}</span>`;
}

function getStockInfo(product) {
    if (product.stock === undefined || product.stock === null) return 'N/A';
    
    const stock = product.stock;
    const unit = product.unit || 'units';
    let stockInfo = `${stock} ${unit}`;
    
    if (stock === 0) {
        stockInfo = `<span class="text-danger">${stockInfo}</span>`;
    } else if (product.lowStockAlert && stock <= product.lowStockAlert) {
        stockInfo = `<span class="text-warning">${stockInfo}</span>`;
    }
    
    return stockInfo;
}

function getProductIcon(type) {
    if (!type) return '<i class="fas fa-box"></i>';
    switch(type) {
        case 'service': return '<i class="fas fa-concierge-bell"></i>';
        case 'digital': return '<i class="fas fa-file-download"></i>';
        default: return '<i class="fas fa-box"></i>';
    }
}

function showEmptyState() {
    $('#productsTableBody').html(`
        <tr>
            <td colspan="9" class="text-center">
                <div class="empty-state">
                    <i class="fas fa-box-open fa-3x"></i>
                    <h4>No products found</h4>
                    <p>Add your first product to get started</p>
                    <a href="product-add.html" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Add Your First Product
                    </a>
                </div>
            </td>
        </tr>
    `);
    updateStats([]);
    updateProductBadge(0);
}

function updateStats(products) {
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.status === 'active').length;
    
    const totalPrice = products.reduce((sum, p) => sum + (p.price || 0), 0);
    const avgPrice = totalProducts > 0 ? totalPrice / totalProducts : 0;
    
    const totalValue = products.reduce((sum, p) => {
        const stock = p.stock || 0;
        const price = p.price || 0;
        return sum + (stock * price);
    }, 0);
    
    $('#totalProducts').text(totalProducts);
    $('#activeProducts').text(activeProducts);
    $('#avgPrice').text(Utils.formatCurrency(avgPrice));
    $('#totalValue').text(Utils.formatCurrency(totalValue));
    $('#showingCount').text(totalProducts);
    $('#totalCount').text(totalProducts);
}

function updateProductBadge(count) {
    const badge = $('#productCountBadge');
    badge.text(count);
    badge.css('display', count > 0 ? 'flex' : 'none');
}

function addDeleteListeners() {
    $('.btn-action.delete').off('click').on('click', function(e) {
        e.preventDefault();
        const productId = $(this).data('id');
        const productName = $(this).data('name');
        
        if (productId && productName) {
            showDeleteConfirmation(productId, productName);
        }
    });
}

function showDeleteConfirmation(productId, productName) {
    $('#deleteProductName').text(productName);
    $('#deleteModal').addClass('active');
    
    $('#confirmDelete').off('click').on('click', function() {
        deleteProduct(productId);
        $('#deleteModal').removeClass('active');
    });
    
    $('#cancelDelete, .modal-close').off('click').on('click', function() {
        $('#deleteModal').removeClass('active');
    });
}

// --- FIX 2: Updated Delete to use Trash System ---
function deleteProduct(productId) {
    console.log('🗑️ Moving product to trash:', productId);
    
    if (typeof DB.moveToTrash !== 'function') {
        console.error("Trash system missing. Check database.js");
        return;
    }

    const success = DB.moveToTrash('products', productId);
    
    if (success) {
        const currentUser = Auth.getCurrentUser();
        Utils.showToast('Product moved to trash', 'success');
        
        // Log Activity
        if(DB.addActivity) {
            DB.addActivity({
                userId: currentUser.id,
                type: 'product_trashed',
                title: 'Product Trashed',
                description: `Moved product to trash`,
                timestamp: new Date().toISOString()
            });
        }

        // Reload
        loadAndDisplayProducts(currentUser);
    } else {
        Utils.showToast('Error moving to trash', 'error');
    }
}

// ... (Keep existing setupEventListeners, filterProducts, refreshProducts, export functions as they were in your previous code) ...
// Ensure you include the setupEventListeners function block provided in previous responses.
// I am truncating here to focus on the fix, but in your file, keep the rest of the logic.

function setupEventListeners(currentUser) {
    $('#searchInput').on('input', function() {
        searchProducts($(this).val(), currentUser);
    });
    
    $('#categoryFilter').on('change', function() {
        filterProducts(currentUser);
    });
    
    $('#statusFilter').on('change', function() {
        filterProducts(currentUser);
    });
    
    $('#refreshBtn').on('click', function() {
        refreshProducts(currentUser, $(this));
    });
    
    $('#exportBtn').on('click', function() {
        showExportOptionsModal(currentUser);
    });
    
    $('#printBtn').on('click', function() {
        generatePrintReport(currentUser);
    });
    
    $('#logoutBtn').on('click', function(e) {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            Auth.logout();
        }
    });
    
    $('.menu-toggle').on('click', function() {
        $('.sidebar').toggleClass('active');
    });
    
    $('#viewDraftsBtn').on('click', function() {
        showDraftModal(currentUser);
    });
    
    $('#closeDraftModal, #draftModal .modal-close').on('click', function() {
        $('#draftModal').removeClass('active');
    });
    
    $('#createFromDraft').on('click', function() {
        window.location.href = 'product-add.html';
    });
    
    $('#draftModal').on('click', function(e) {
        if ($(e.target).hasClass('modal')) {
            $(this).removeClass('active');
        }
    });
}

function searchProducts(query, currentUser) {
    if (!query.trim()) {
        loadAndDisplayProducts(currentUser);
        return;
    }
    
    // Use filtered loading
    const db = DB.load();
    const allProducts = (db.products || []).filter(p => 
        p.userId === currentUser.id && 
        !p.isDeleted && 
        p.status !== 'draft'
    );
    
    const searchTerm = query.toLowerCase();
    const filtered = allProducts.filter(product => 
        (product.name && product.name.toLowerCase().includes(searchTerm)) ||
        (product.SKU && product.SKU.toLowerCase().includes(searchTerm)) ||
        (product.category && product.category.toLowerCase().includes(searchTerm))
    );
    
    displayProductsInTable(filtered);
    updateStats(filtered);
}

// ... (Include filterProducts, refreshProducts, export/print functions from previous code) ...
