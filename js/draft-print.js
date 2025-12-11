


// Replace the filterProducts function with this:

function filterProducts(currentUser) {
    try {
        // Get ALL products first (not filtered yet)
        let allProducts = [];
        
        if (DB && DB.getUserProducts) {
            allProducts = DB.getUserProducts(currentUser.id);
        } else {
            const db = DB.load();
            if (db && db.products) {
                allProducts = db.products.filter(p => p.userId === currentUser.id && p.status !== 'draft');
            }
        }
        
        // Get filter values
        const category = $('#categoryFilter').val();
        const status = $('#statusFilter').val();
        
        // Apply filters to ALL products
        let filtered = allProducts;
        
        if (category) {
            filtered = filtered.filter(p => p.category === category);
        }
        
        if (status) {
            if (status === 'low-stock') {
                filtered = filtered.filter(p => 
                    p.stock !== undefined && 
                    p.lowStockAlert && 
                    p.stock <= p.lowStockAlert
                );
            } else {
                filtered = filtered.filter(p => p.status === status);
            }
        }
        
        // Display filtered products
        displayProductsInTable(filtered);
        updateStats(filtered);
        
    } catch (error) {
        console.error('❌ Error filtering products:', error);
    }
}

function refreshProducts(currentUser, refreshBtn) {
    if (refreshBtn) {
        const originalHtml = refreshBtn.html();
        refreshBtn.html('<i class="fas fa-spinner fa-spin"></i>');
        refreshBtn.prop('disabled', true);
        
        setTimeout(() => {
            loadAndDisplayProducts(currentUser);
            refreshBtn.html(originalHtml);
            refreshBtn.prop('disabled', false);
            Utils.showToast('Products refreshed', 'success');
        }, 500);
    } else {
        loadAndDisplayProducts(currentUser);
    }
}

function exportProducts(currentUser) {
    try {
        // Get all products (excluding drafts by default)
        let products = [];
        
        if (DB && DB.getUserProducts) {
            products = DB.getUserProducts(currentUser.id);
        } else {
            const db = DB.load();
            if (db && db.products) {
                products = db.products.filter(p => p.userId === currentUser.id);
            }
        }
        
        if (products.length === 0) {
            Utils.showToast('No products to export', 'warning');
            return;
        }
        
        // Create CSV content
        const headers = ['Name', 'SKU', 'Category', 'Type', 'Price', 'Cost', 'Stock', 'Unit', 'Status', 'Description', 'Created Date'];
        
        const csvRows = [];
        
        // Add headers
        csvRows.push(headers.join(','));
        
        // Add data rows
        products.forEach(product => {
            const row = [
                `"${product.name || ''}"`,
                `"${product.SKU || ''}"`,
                `"${product.category || ''}"`,
                `"${product.type || 'physical'}"`,
                product.price || 0,
                product.cost || 0,
                product.stock || 0,
                `"${product.unit || 'pcs'}"`,
                `"${product.status || 'active'}"`,
                `"${(product.description || '').replace(/"/g, '""')}"`,
                `"${product.createdAt || ''}"`
            ];
            csvRows.push(row.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        // Create download link
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `products_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            Utils.showToast(`Exported ${products.length} products successfully`, 'success');
        } else {
            // Fallback for older browsers
            Utils.showToast('Export feature requires a modern browser', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error exporting products:', error);
        Utils.showToast('Error exporting products', 'error');
    }
}

// Add debug function
window.debugProducts = function() {
    console.log('=== DEBUG INFO ===');
    
    const currentUser = Auth.getCurrentUser();
    console.log('Current User:', currentUser);
    
    const db = DB.load();
    console.log('Database:', db);
    console.log('Products in database:', db.products ? db.products.length : 0);
    console.log('Saved categories:', db.savedCategories);
    
    if (db.products && currentUser) {
        const userProducts = db.products.filter(p => p.userId === currentUser.id);
        console.log('User products:', userProducts.length);
        
        // Get all categories from user products
        const categories = new Set();
        userProducts.forEach(p => {
            if (p.category) categories.add(p.category);
        });
        console.log('Categories from products:', Array.from(categories));
    }
    
    console.log('=================');
};

// Add test function
window.testAddProduct = function() {
    const currentUser = Auth.getCurrentUser();
    if (!currentUser) {
        alert('Please login first');
        return;
    }
    
    const testProduct = {
        id: 'PROD-TEST-' + Date.now(),
        userId: currentUser.id,
        name: 'Test Product ' + Date.now().toString().slice(-4),
        category: 'Test',
        price: 99.99,
        stock: 10,
        unit: 'pcs',
        status: 'active',
        createdAt: new Date().toISOString(),
        SKU: 'TEST-' + Date.now().toString().slice(-6)
    };
    
    const db = DB.load();
    if (!db.products) {
        db.products = [];
    }
    
    db.products.push(testProduct);
    DB.save(db);
    
    console.log('✅ Test product added:', testProduct);
    
    // Also save the category if it's new
    if (db.savedCategories && db.savedCategories[currentUser.id]) {
        if (!db.savedCategories[currentUser.id].includes('Test')) {
            db.savedCategories[currentUser.id].push('Test');
            db.savedCategories[currentUser.id].sort();
            DB.save(db);
            console.log('✅ Test category saved');
        }
    }
    
    alert('Test product added! Click Refresh to see it.');
    
    // Refresh the page
    window.location.reload();
};

// Function to manually refresh categories
window.refreshCategories = function() {
    const currentUser = Auth.getCurrentUser();
    if (!currentUser) {
        alert('Please login first');
        return;
    }
    
    let products = [];
    if (DB && DB.getUserProducts) {
        products = DB.getUserProducts(currentUser.id);
    } else {
        const db = DB.load();
        if (db && db.products) {
            products = db.products.filter(p => p.userId === currentUser.id && p.status !== 'draft');
        }
    }
    
    updateCategoryFilterDropdown(products, currentUser.id);
    alert('Category filter refreshed!');
};

// ==================== DRAFT PRODUCTS FUNCTIONALITY ====================

// Function to load draft products
function loadDraftProducts(currentUser) {
    try {
        let allProducts = [];
        
        // Get all user products
        if (DB && DB.getUserProducts) {
            allProducts = DB.getUserProducts(currentUser.id);
        } else {
            const db = DB.load();
            if (db && db.products) {
                allProducts = db.products.filter(p => p.userId === currentUser.id);
            }
        }
        
        // Filter for draft products
        const draftProducts = allProducts.filter(product => product.status === 'draft');
        
        console.log('📋 Found', draftProducts.length, 'draft products');
        
        // Update draft count badge
        updateDraftBadge(draftProducts.length);
        
        return draftProducts;
        
    } catch (error) {
        console.error('❌ Error loading draft products:', error);
        return [];
    }
}

// Function to update draft count badge
function updateDraftBadge(count) {
    const badge = $('#draftCountBadge');
    badge.text(count);
    badge.css('display', count > 0 ? 'inline-flex' : 'none');
}

// Function to display drafts in modal
function displayDraftsInModal(drafts) {
    const draftTableBody = $('#draftTableBody');
    const draftEmptyState = $('#draftEmptyState');
    
    // Clear existing content
    draftTableBody.empty();
    
    if (drafts.length === 0) {
        // Show empty state
        draftTableBody.closest('.table-responsive').hide();
        draftEmptyState.show();
        $('#draftTotal').text('0');
        $('#draftCreatedToday').text('0');
        $('#createFromDraft').hide();
        return;
    }
    
    // Show table and hide empty state
    draftTableBody.closest('.table-responsive').show();
    draftEmptyState.hide();
    
    // Calculate stats
    const totalDrafts = drafts.length;
    const today = new Date().toISOString().split('T')[0];
    const createdToday = drafts.filter(draft => {
        const createdDate = draft.createdAt ? draft.createdAt.split('T')[0] : null;
        return createdDate === today;
    }).length;
    
    // Update stats
    $('#draftTotal').text(totalDrafts);
    $('#draftCreatedToday').text(createdToday);
    
    // Display each draft
    drafts.forEach((draft, index) => {
        const createdAt = draft.createdAt ? 
            new Date(draft.createdAt).toLocaleDateString() : 
            'N/A';
        
        const row = `
            <tr class="draft-row" data-draft-id="${draft.id}">
                <td>${index + 1}</td>
                <td>
                    <strong>${draft.name || 'Unnamed Draft'}</strong>
                    ${draft.description ? 
                        `<div class="text-muted" style="font-size: 12px; margin-top: 2px;">
                            ${draft.description.substring(0, 50)}${draft.description.length > 50 ? '...' : ''}
                        </div>` : 
                        ''}
                </td>
                <td><code>${draft.SKU || '—'}</code></td>
                <td><span class="category-badge">${draft.category || 'Uncategorized'}</span></td>
                <td>${Utils.formatCurrency(draft.price || 0)}</td>
                <td>${createdAt}</td>
                <td class="text-center">
                    <div class="draft-actions">
                        <a href="product-edit.html?id=${draft.id}" class="btn-draft-action edit" title="Edit Draft">
                            <i class="fas fa-edit"></i> Edit
                        </a>
                        <button class="btn-draft-action delete" title="Delete Draft" 
                                data-id="${draft.id}" data-name="${draft.name || 'Draft'}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
        
        draftTableBody.append(row);
    });
    
    // Show create from draft button if there are drafts
    $('#createFromDraft').show();
    
    // Add delete event listeners for draft items
    $('#draftTableBody .btn-draft-action.delete').off('click').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const draftId = $(this).data('id');
        const draftName = $(this).data('name');
        
        if (confirm(`Are you sure you want to delete the draft "${draftName}"?`)) {
            deleteDraftProduct(draftId);
        }
    });
}

// Function to delete a draft product
function deleteDraftProduct(draftId) {
    console.log('🗑️ Deleting draft product:', draftId);
    
    try {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) {
            Utils.showToast('Session expired. Please login again.', 'error');
            return;
        }
        
        const db = DB.load();
        if (!db || !db.products) {
            Utils.showToast('Database error', 'error');
            return;
        }
        
        // Find draft index
        const draftIndex = db.products.findIndex(p => p.id === draftId);
        if (draftIndex === -1) {
            Utils.showToast('Draft not found', 'error');
            return;
        }
        
        // Remove draft
        db.products.splice(draftIndex, 1);
        
        // Save database
        if (DB.save(db)) {
            Utils.showToast('Draft deleted successfully', 'success');
            
            // Reload drafts
            const drafts = loadDraftProducts(currentUser);
            displayDraftsInModal(drafts);
            
            // Also reload main products to update counts
            loadAndDisplayProducts(currentUser);
        } else {
            Utils.showToast('Error deleting draft', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error deleting draft:', error);
        Utils.showToast('Error deleting draft', 'error');
    }
}

// Function to show draft modal
function showDraftModal(currentUser) {
    // Load drafts
    const drafts = loadDraftProducts(currentUser);
    
    // Display drafts in modal
    displayDraftsInModal(drafts);
    
    // Show modal
    $('#draftModal').addClass('active');
}

// Update the initializeProductsManager function to load draft count
function initializeProductsManager(currentUser) {
    console.log('🚀 Initializing products manager...');
    
    // Load products immediately
    loadAndDisplayProducts(currentUser);
    
    // Load draft count
    loadDraftProducts(currentUser);
    
    // Setup all event listeners
    setupEventListeners(currentUser);
}

// Update the setupEventListeners function
function setupEventListeners(currentUser) {
    console.log('🔧 Setting up event listeners...');
    
    // Search input
    $('#searchInput').on('input', function() {
        searchProducts($(this).val(), currentUser);
    });
    
    // Category filter
    $('#categoryFilter').on('change', function() {
        filterProducts(currentUser);
    });
    
    // Status filter
    $('#statusFilter').on('change', function() {
        filterProducts(currentUser);
    });
    
    // Refresh button
    $('#refreshBtn').on('click', function() {
        refreshProducts(currentUser, $(this));
    });
    
    // Export button - Updated to show options
    $('#exportBtn').off('click').on('click', function() {
        showExportOptionsModal(currentUser);
    });
    
    // Print button - Enhanced print functionality
    $('#printBtn').off('click').on('click', function() {
        generatePrintReport(currentUser);
    });
    
    // Logout button
    $('#logoutBtn').on('click', function(e) {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            Auth.logout();
        }
    });
    
    // Menu toggle
    $('.menu-toggle').on('click', function() {
        $('.sidebar').toggleClass('active');
    });
    
    // View drafts button
    $('#viewDraftsBtn').on('click', function() {
        showDraftModal(currentUser);
    });
    
    // Draft modal close button
    $('#closeDraftModal, #draftModal .modal-close').on('click', function() {
        $('#draftModal').removeClass('active');
    });
    
    // Create from draft button
    $('#createFromDraft').on('click', function() {
        window.location.href = 'product-add.html';
    });
    
    // Close draft modal when clicking outside
    $('#draftModal').on('click', function(e) {
        if ($(e.target).hasClass('modal')) {
            $(this).removeClass('active');
        }
    });
}




// ==================== FIXED EXPORT FUNCTIONALITY ====================

function exportProducts(currentUser) {
    try {
        // Get all products (excluding drafts by default)
        let products = [];
        
        if (DB && DB.getUserProducts) {
            products = DB.getUserProducts(currentUser.id);
        } else {
            const db = DB.load();
            if (db && db.products) {
                products = db.products.filter(p => p.userId === currentUser.id);
            }
        }
        
        if (products.length === 0) {
            Utils.showToast('No products to export', 'warning');
            return;
        }
        
        // Create CSV content
        const headers = ['Name', 'SKU', 'Category', 'Type', 'Price', 'Cost', 'Stock', 'Unit', 'Status', 'Description', 'Created Date'];
        
        const csvRows = [];
        
        // Add headers
        csvRows.push(headers.join(','));
        
        // Add data rows
        products.forEach(product => {
            const row = [
                `"${product.name || ''}"`,
                `"${product.SKU || ''}"`,
                `"${product.category || ''}"`,
                `"${product.type || 'physical'}"`,
                product.price || 0,
                product.cost || 0,
                product.stock || 0,
                `"${product.unit || 'pcs'}"`,
                `"${product.status || 'active'}"`,
                `"${(product.description || '').replace(/"/g, '""')}"`,
                `"${product.createdAt || ''}"`
            ];
            csvRows.push(row.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        // Create download link
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `products_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            Utils.showToast(`Exported ${products.length} products successfully`, 'success');
        } else {
            // Fallback for older browsers
            Utils.showToast('Export feature requires a modern browser', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error exporting products:', error);
        Utils.showToast('Error exporting products', 'error');
    }
}

// ==================== ENHANCED PRINT FUNCTIONALITY ====================

function generatePrintReport(currentUser) {
    try {
        // Get all products
        let allProducts = [];
        
        if (DB && DB.getUserProducts) {
            allProducts = DB.getUserProducts(currentUser.id);
        } else {
            const db = DB.load();
            if (db && db.products) {
                allProducts = db.products.filter(p => p.userId === currentUser.id);
            }
        }
        
        // Filter out drafts for the main report
        const products = allProducts.filter(p => p.status !== 'draft');
        
        if (products.length === 0) {
            Utils.showToast('No products to print', 'warning');
            return;
        }
        
        // Calculate statistics
        const stats = calculateProductStatistics(products);
        
        // Generate the print HTML
        const printHTML = createPrintHTML(products, stats, currentUser);
        
        // Open print window
        openPrintWindow(printHTML);
        
    } catch (error) {
        console.error('❌ Error generating print report:', error);
        Utils.showToast('Error generating print report', 'error');
    }
}

function calculateProductStatistics(products) {
    const stats = {
        totalProducts: products.length,
        activeProducts: products.filter(p => p.status === 'active').length,
        inactiveProducts: products.filter(p => p.status === 'inactive').length,
        
        // Stock statistics
        inStock: products.filter(p => (p.stock || 0) > 0).length,
        outOfStock: products.filter(p => (p.stock || 0) <= 0).length,
        lowStock: products.filter(p => 
            p.lowStockAlert && 
            (p.stock || 0) > 0 && 
            (p.stock || 0) <= p.lowStockAlert
        ).length,
        
        // Price statistics
        totalValue: products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0),
        avgPrice: products.length > 0 ? 
            products.reduce((sum, p) => sum + (p.price || 0), 0) / products.length : 0,
        
        // Category statistics
        categories: {},
        
        // Type statistics
        physicalProducts: products.filter(p => p.type !== 'service' && p.type !== 'digital').length,
        serviceProducts: products.filter(p => p.type === 'service').length,
        digitalProducts: products.filter(p => p.type === 'digital').length
    };
    
    // Calculate category statistics
    products.forEach(product => {
        const category = product.category || 'Uncategorized';
        if (!stats.categories[category]) {
            stats.categories[category] = {
                count: 0,
                active: 0,
                inStock: 0,
                totalValue: 0
            };
        }
        
        stats.categories[category].count++;
        if (product.status === 'active') stats.categories[category].active++;
        if ((product.stock || 0) > 0) stats.categories[category].inStock++;
        stats.categories[category].totalValue += (product.price || 0) * (product.stock || 0);
    });
    
    return stats;
}

function createPrintHTML(products, stats, currentUser) {
    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    let categorySummaryHTML = '';
    Object.entries(stats.categories).forEach(([category, catStats]) => {
        categorySummaryHTML += `
            <div class="category-stat-item">
                <strong>${category}</strong><br>
                <span>Total: ${catStats.count}</span><br>
                <span>Active: ${catStats.active}</span><br>
                <span>In Stock: ${catStats.inStock}</span><br>
                <span>Value: ${Utils.formatCurrency(catStats.totalValue)}</span>
            </div>
        `;
    });
    
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Products Report - InvoicePro</title>
            <style>
                ${getPrintStyles()}
            </style>
        </head>
        <body>
            <div class="print-container">
                <div class="print-header">
                    <h1><i class="fas fa-box"></i> Products Inventory Report</h1>
                    <div class="company-info">
                        <strong>InvoicePro</strong> | Generated on: ${currentDate}
                    </div>
                    <div class="company-info">
                        User: ${currentUser.name || currentUser.email}
                    </div>
                </div>
                
                <div class="print-stats-grid">
                    <div class="print-stat-card">
                        <div class="print-stat-value">${stats.totalProducts}</div>
                        <div class="print-stat-label">Total Products</div>
                    </div>
                    <div class="print-stat-card">
                        <div class="print-stat-value">${stats.activeProducts}</div>
                        <div class="print-stat-label">Active Products</div>
                    </div>
                    <div class="print-stat-card">
                        <div class="print-stat-value">${stats.inStock}</div>
                        <div class="print-stat-label">In Stock</div>
                    </div>
                    <div class="print-stat-card">
                        <div class="print-stat-value">${stats.outOfStock}</div>
                        <div class="print-stat-label">Out of Stock</div>
                    </div>
                    <div class="print-stat-card">
                        <div class="print-stat-value">${stats.lowStock}</div>
                        <div class="print-stat-label">Low Stock</div>
                    </div>
                    <div class="print-stat-card">
                        <div class="print-stat-value">${Utils.formatCurrency(stats.totalValue)}</div>
                        <div class="print-stat-label">Total Value</div>
                    </div>
                </div>
                
                <div class="print-category-summary">
                    <h4><i class="fas fa-tags"></i> Category Summary</h4>
                    <div class="category-stats-grid">
                        ${categorySummaryHTML}
                    </div>
                </div>
                
                <div class="print-category-summary">
                    <h4><i class="fas fa-chart-pie"></i> Product Types</h4>
                    <div class="category-stats-grid">
                        <div class="category-stat-item">
                            <strong>Physical Products</strong><br>
                            <span>${stats.physicalProducts} items</span>
                        </div>
                        <div class="category-stat-item">
                            <strong>Services</strong><br>
                            <span>${stats.serviceProducts} items</span>
                        </div>
                        <div class="category-stat-item">
                            <strong>Digital Products</strong><br>
                            <span>${stats.digitalProducts} items</span>
                        </div>
                    </div>
                </div>
                
                <h3 style="margin-top: 30px; margin-bottom: 15px;">
                    <i class="fas fa-list"></i> Product Details (${products.length} items)
                </h3>
                
                <table class="print-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Product Name</th>
                            <th>SKU</th>
                            <th>Category</th>
                            <th>Type</th>
                            <th>Price</th>
                            <th>Cost</th>
                            <th>Stock</th>
                            <th>Status</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map((product, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td><strong>${product.name || 'Unnamed'}</strong></td>
                                <td><code>${product.SKU || '—'}</code></td>
                                <td>${product.category || 'Uncategorized'}</td>
                                <td>${product.type || 'physical'}</td>
                                <td>${Utils.formatCurrency(product.price || 0)}</td>
                                <td>${Utils.formatCurrency(product.cost || 0)}</td>
                                <td>
                                    ${(product.stock || 0)} ${product.unit || 'pcs'}
                                    ${product.lowStockAlert && (product.stock || 0) <= product.lowStockAlert ? 
                                        '<span class="badge badge-warning">Low</span>' : ''}
                                    ${(product.stock || 0) <= 0 ? 
                                        '<span class="badge badge-danger">Out</span>' : ''}
                                </td>
                                <td>
                                    ${product.status === 'active' ? 
                                        '<span class="badge badge-success">Active</span>' : 
                                        '<span class="badge badge-danger">Inactive</span>'}
                                </td>
                                <td>${Utils.formatCurrency((product.price || 0) * (product.stock || 0))}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="print-footer">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>Summary:</strong>
                            <div style="margin-top: 5px; font-size: 10px;">
                                Active: ${stats.activeProducts} | 
                                In Stock: ${stats.inStock} | 
                                Out of Stock: ${stats.outOfStock} | 
                                Low Stock: ${stats.lowStock}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: bold; color: #2c3e50;">
                                Total Inventory Value: ${Utils.formatCurrency(stats.totalValue)}
                            </div>
                            <div style="font-size: 10px; color: #666;">
                                Average Price: ${Utils.formatCurrency(stats.avgPrice)}
                            </div>
                        </div>
                    </div>
                    <div style="margin-top: 20px; text-align: center; color: #999;">
                        <hr style="border: none; border-top: 1px solid #ddd; margin: 10px 0;">
                        <div>Generated by InvoicePro • ${currentDate} • Page 1 of 1</div>
                    </div>
                </div>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        window.close();
                    }, 1000);
                };
            </script>
        </body>
        </html>
    `;
}

function getPrintStyles() {
    return `
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
            color: #333;
        }
        
        .print-container {
            max-width: 100%;
        }
        
        .print-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        
        .print-header h1 {
            color: #2c3e50;
            margin: 0 0 10px 0;
            font-size: 24px;
        }
        
        .company-info {
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
        }
        
        .print-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        
        .print-stat-card {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        
        .print-stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .print-stat-label {
            font-size: 12px;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .print-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 12px;
        }
        
        .print-table th {
            background: #2c3e50;
            color: white;
            padding: 10px;
            text-align: left;
            border: 1px solid #dee2e6;
            font-weight: 600;
        }
        
        .print-table td {
            padding: 8px 10px;
            border: 1px solid #dee2e6;
            vertical-align: top;
        }
        
        .print-table tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        .print-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            font-size: 11px;
            color: #666;
        }
        
        .print-category-summary {
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
        }
        
        .print-category-summary h4 {
            margin: 0 0 10px 0;
            color: #2c3e50;
            font-size: 16px;
        }
        
        .category-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            margin-top: 10px;
        }
        
        .category-stat-item {
            padding: 10px;
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            text-align: center;
            font-size: 12px;
        }
        
        .category-stat-item strong {
            display: block;
            margin-bottom: 5px;
            color: #2c3e50;
        }
        
        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: bold;
            margin-left: 5px;
        }
        
        .badge-success {
            background: #28a745;
            color: white;
        }
        
        .badge-danger {
            background: #dc3545;
            color: white;
        }
        
        .badge-warning {
            background: #ffc107;
            color: #212529;
        }
        
        .badge-info {
            background: #17a2b8;
            color: white;
        }
        
        code {
            background: #f1f1f1;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: monospace;
            font-size: 11px;
        }
        
        @media print {
            @page {
                margin: 0.5cm;
                size: A4 portrait;
            }
            
            body {
                padding: 0;
            }
            
            .print-header {
                padding-bottom: 15px;
                margin-bottom: 20px;
            }
            
            .print-table {
                font-size: 11px;
            }
            
            .print-stats-grid {
                grid-template-columns: repeat(3, 1fr);
            }
        }
    `;
}

function openPrintWindow(printHTML) {
    const printWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes');
    
    if (!printWindow) {
        Utils.showToast('Please allow popups to generate print report', 'warning');
        return;
    }
    
    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    // Focus the window
    printWindow.focus();
}


