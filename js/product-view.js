// js/product-view.js - Product Details View Page

// Wait for DOM to be ready
$(document).ready(function() {
    console.log('📋 Product view page loaded');
    
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
    
    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (!productId) {
        console.error('❌ No product ID provided');
        Utils.showToast('Product ID not found. Redirecting to products page.', 'error');
        setTimeout(() => {
            window.location.href = 'products.html';
        }, 2000);
        return;
    }
    
    console.log('🔍 Loading product with ID:', productId);
    
    // Initialize product view manager
    initializeProductViewManager(currentUser, productId);
});

function updateUserInfo(user) {
    $('#userName').text(user.name || 'User');
    $('#userEmail').text(user.email);
}

function initializeProductViewManager(currentUser, productId) {
    console.log('🚀 Initializing product view manager...');
    
    // Load product details
    loadProductDetails(currentUser, productId);
    
    // Setup all event listeners
    setupEventListeners(currentUser, productId);
}

function loadProductDetails(currentUser, productId) {
    console.log('📦 Loading product details...');
    
    try {
        // Load the product from database
        const product = getProductById(productId, currentUser.id);
        
        if (!product) {
            console.error('❌ Product not found');
            Utils.showToast('Product not found. Redirecting...', 'error');
            setTimeout(() => {
                window.location.href = 'products.html';
            }, 2000);
            return;
        }
        
        console.log('✅ Product loaded:', product);
        
        // Update all UI elements with product data
        updateProductUI(product);
        
        // Calculate and display statistics
        calculateAndDisplayStats(product, currentUser);
        
        // Set up tab functionality
        setupTabs();
        
        // Update edit button URL
        updateEditButton(productId);
        
        // Set up create invoice button
        setupCreateInvoiceButton(product);
        
    } catch (error) {
        console.error('❌ Error loading product details:', error);
        Utils.showToast('Error loading product details', 'error');
    }
}

function getProductById(productId, userId) {
    const db = DB.load();
    
    if (!db || !db.products) {
        return null;
    }
    
    // Find the product by ID and user ID
    const product = db.products.find(p => 
        p.id === productId && 
        p.userId === userId
    );
    
    return product;
}

function updateProductUI(product) {
    console.log('🎨 Updating product UI...');
    
    // Update page title
    const productTitle = product.name || 'Unnamed Product';
    document.title = `${productTitle} - InvoicePro`;
    $('#productTitle').text(productTitle);
    
    // Update product header
    $('#viewProductName').text(productTitle);
    $('#viewProductPrice').text(Utils.formatCurrency(product.price || 0));
    
    // Update meta information
    $('#viewProductSKU').text(`SKU: ${product.SKU || 'N/A'}`);
    $('#viewProductCategory').text(`Category: ${product.category || 'Uncategorized'}`);
    
    // Update status badge
    updateStatusBadge(product);
    
    // Update overview tab
    updateOverviewTab(product);
    
    // Update pricing tab
    updatePricingTab(product);
    
    // Update inventory tab
    updateInventoryTab(product);
}

function updateStatusBadge(product) {
    const statusElement = $('#viewProductStatus');
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
    
    statusElement.text(statusText);
    statusElement.attr('class', `badge ${statusClass}`);
}

function updateOverviewTab(product) {
    // Update description
    $('#viewProductDescription').text(
        product.description || 'No description provided.'
    );
    
    // Update features
    updateFeatures(product);
    
    // Update basic information
    $('#viewProductType').text(product.type || 'Physical Product');
    $('#viewProductBrand').text(product.brand || 'Not specified');
    $('#viewProductModel').text(product.model || 'Not specified');
    $('#viewProductUnit').text(product.unit || 'pcs');
    
    // Update warranty information - ADD THIS SECTION
    updateWarrantyInfo(product);
    
    // Update internal notes
    $('#viewProductNotes').text(
        product.notes || 'No internal notes.'
    );
}

// Add this new function to handle warranty display
function updateWarrantyInfo(product) {
    const warrantyElement = $('#viewProductWarranty');
    
    if (!product.warranty && product.warranty !== 0) {
        warrantyElement.text('Not specified');
        warrantyElement.css('color', '#64748b'); // Muted color
        return;
    }
    
    if (product.warranty === 0) {
        warrantyElement.text('No warranty');
        warrantyElement.css('color', '#64748b'); // Muted color
        return;
    }
    
    // If warranty is a number (months)
    if (typeof product.warranty === 'number') {
        if (product.warranty === 1) {
            warrantyElement.html('<span style="color: #0ea5e9;">1 month</span>');
        } else if (product.warranty < 12) {
            warrantyElement.html(`<span style="color: #0ea5e9;">${product.warranty} months</span>`);
        } else if (product.warranty === 12) {
            warrantyElement.html('<span style="color: #3b82f6;">1 year</span>');
        } else if (product.warranty === 24) {
            warrantyElement.html('<span style="color: #3b82f6;">2 years</span>');
        } else if (product.warranty === 36) {
            warrantyElement.html('<span style="color: #3b82f6;">3 years</span>');
        } else if (product.warranty >= 60) {
            warrantyElement.html('<span style="color: #10b981;">5+ years</span>');
        } else {
            const years = Math.floor(product.warranty / 12);
            const months = product.warranty % 12;
            if (months === 0) {
                warrantyElement.html(`<span style="color: #3b82f6;">${years} years</span>`);
            } else {
                warrantyElement.html(`<span style="color: #3b82f6;">${years} years ${months} months</span>`);
            }
        }
        return;
    }
    
    // If warranty is a string
    if (typeof product.warranty === 'string') {
        if (product.warranty.toLowerCase() === 'lifetime') {
            warrantyElement.html('<span style="color: #10b981;">Lifetime warranty</span>');
        } else if (product.warranty.toLowerCase() === 'none') {
            warrantyElement.text('No warranty');
            warrantyElement.css('color', '#64748b');
        } else {
            warrantyElement.html(`<span style="color: #0ea5e9;">${product.warranty}</span>`);
        }
        return;
    }
    
    // Default fallback
    warrantyElement.text('Not specified');
}

function updateFeatures(product) {
    const featuresList = $('#viewProductFeatures');
    featuresList.empty();
    
    if (product.features && Array.isArray(product.features) && product.features.length > 0) {
        product.features.forEach(feature => {
            featuresList.append(`<li>${feature}</li>`);
        });
    } else {
        featuresList.append('<li>No features specified</li>');
    }
}

function updatePricingTab(product) {
    // Update price details
    $('#viewSellingPrice').text(Utils.formatCurrency(product.price || 0));
    $('#viewCostPrice').text(Utils.formatCurrency(product.cost || 0));
    
    // Calculate profit margin
    const profitMargin = calculateProfitMargin(product.price || 0, product.cost || 0);
    $('#viewProfitMargin').text(`${profitMargin}%`);
    
    // Update tax and discount
    $('#viewTaxRate').text(`${product.taxRate || 0}%`);
    $('#viewDiscount').text(`${product.discount || 0}%`);
    
    // Add warranty information to pricing tab
    const warrantyInfo = getWarrantyDisplayText(product);
    $('<tr><td>Warranty:</td><td>' + warrantyInfo + '</td></tr>').insertAfter($('#viewTaxRate').closest('tr'));
    
    // Calculate and display profit
    calculateProfit(product);
}

// Add this helper function
function getWarrantyDisplayText(product) {
    if (!product.warranty && product.warranty !== 0) {
        return '<span style="color: #64748b;">Not specified</span>';
    }
    
    if (product.warranty === 0) {
        return '<span style="color: #64748b;">No warranty</span>';
    }
    
    if (typeof product.warranty === 'number') {
        if (product.warranty === 1) {
            return '1 month';
        } else if (product.warranty < 12) {
            return `${product.warranty} months`;
        } else if (product.warranty === 12) {
            return '1 year';
        } else if (product.warranty === 24) {
            return '2 years';
        } else if (product.warranty === 36) {
            return '3 years';
        } else if (product.warranty >= 60) {
            return '5+ years';
        } else {
            const years = Math.floor(product.warranty / 12);
            const months = product.warranty % 12;
            if (months === 0) {
                return `${years} years`;
            } else {
                return `${years} years ${months} months`;
            }
        }
    }
    
    if (typeof product.warranty === 'string') {
        if (product.warranty.toLowerCase() === 'lifetime') {
            return '<span style="color: #10b981;">Lifetime</span>';
        }
        return product.warranty;
    }
    
    return 'Not specified';
}

function calculateProfitMargin(sellingPrice, costPrice) {
    if (!costPrice || costPrice === 0) return 0;
    
    const profit = sellingPrice - costPrice;
    const margin = (profit / costPrice) * 100;
    return margin.toFixed(2);
}

function calculateProfit(product) {
    const sellingPrice = product.price || 0;
    const costPrice = product.cost || 0;
    const taxRate = product.taxRate || 0;
    const quantity = 1; // For calculation per unit
    
    const profit = sellingPrice - costPrice;
    const taxAmount = sellingPrice * (taxRate / 100);
    const netProfit = profit - taxAmount;
    
    $('#calcCost').text(Utils.formatCurrency(costPrice));
    $('#calcTax').text(Utils.formatCurrency(taxAmount));
    $('#calcProfit').text(Utils.formatCurrency(netProfit));
}

function updateInventoryTab(product) {
    // Update stock level
    const stock = product.stock || 0;
    const unit = product.unit || 'units';
    $('#viewStockLevel').text(`${stock} ${unit}`);
    
    // Update stock alert
    updateStockAlert(product);
    
    // Update inventory settings
    $('#viewTrackInventory').text(product.trackInventory ? 'Yes' : 'No');
    $('#viewLowStockAlert').text(product.lowStockAlert || 'Not set');
    $('#viewAllowBackorders').text(product.allowBackorders ? 'Yes' : 'No');
    $('#viewLastUpdated').text(
        product.updatedAt ? 
        new Date(product.updatedAt).toLocaleString() : 
        'Never'
    );
    
    // Load stock history
    loadStockHistory(product);
}

function updateStockAlert(product) {
    const stockAlertElement = $('#stockAlert');
    const stock = product.stock || 0;
    const lowStockAlert = product.lowStockAlert;
    
    stockAlertElement.empty();
    
    if (stock === 0) {
        stockAlertElement.html(`
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i>
                This product is out of stock!
            </div>
        `);
    } else if (lowStockAlert && stock <= lowStockAlert) {
        stockAlertElement.html(`
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i>
                Low stock alert! Only ${stock} units remaining.
            </div>
        `);
    } else if (stock > 0) {
        stockAlertElement.html(`
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i>
                Product is in stock (${stock} units)
            </div>
        `);
    }
}

function loadStockHistory(product) {
    // This would typically come from a stock history table
    // For now, we'll simulate with some sample data
    const stockHistoryElement = $('#stockHistory');
    
    // In a real app, you would query stock changes for this product
    // For now, show a message
    stockHistoryElement.html(`
        <div class="text-muted">
            <i class="fas fa-info-circle"></i>
            Stock history tracking not yet implemented.
        </div>
    `);
}

function calculateAndDisplayStats(product, currentUser) {
    console.log('📊 Calculating product statistics...');
    
    try {
        // Get all invoices for the current user
        const db = DB.load();
        const userInvoices = db.invoices.filter(inv => inv.userId === currentUser.id);
        
        // Find invoices that contain this product
        const productInvoices = userInvoices.filter(invoice => {
            return invoice.items && invoice.items.some(item => item.productId === product.id);
        });
        
        // Calculate statistics
        let totalQuantity = 0;
        let totalRevenue = 0;
        let lastUsed = null;
        
        productInvoices.forEach(invoice => {
            invoice.items.forEach(item => {
                if (item.productId === product.id) {
                    totalQuantity += item.quantity || 0;
                    totalRevenue += item.total || 0;
                    
                    // Update last used date
                    const invoiceDate = invoice.createdAt || invoice.invoiceDate;
                    if (invoiceDate && (!lastUsed || new Date(invoiceDate) > new Date(lastUsed))) {
                        lastUsed = invoiceDate;
                    }
                }
            });
        });
        
        // Update usage tab
        $('#totalInvoices').text(productInvoices.length);
        $('#totalQuantity').text(`${totalQuantity} units`);
        $('#totalRevenue').text(Utils.formatCurrency(totalRevenue));
        $('#lastUsed').text(
            lastUsed ? 
            new Date(lastUsed).toLocaleDateString() : 
            'Never'
        );
        
        // Load recent invoices
        loadRecentInvoices(productInvoices, product.id);
        
    } catch (error) {
        console.error('❌ Error calculating statistics:', error);
    }
}

function loadRecentInvoices(productInvoices, productId) {
    const recentInvoicesElement = $('#recentInvoices');
    
    if (productInvoices.length === 0) {
        recentInvoicesElement.html(`
            <p class="text-muted">
                <i class="fas fa-info-circle"></i>
                This product has not been used in any invoices yet.
            </p>
        `);
        return;
    }
    
    // Sort invoices by date (newest first)
    const sortedInvoices = productInvoices.sort((a, b) => {
        const dateA = a.createdAt || a.invoiceDate;
        const dateB = b.createdAt || b.invoiceDate;
        return new Date(dateB) - new Date(dateA);
    });
    
    // Take only the last 5 invoices
    const recent = sortedInvoices.slice(0, 5);
    
    let html = '<div class="invoice-list">';
    
    recent.forEach(invoice => {
        // Find the specific item for this product
        const productItem = invoice.items.find(item => item.productId === productId);
        
        if (productItem) {
            const invoiceDate = invoice.createdAt || invoice.invoiceDate;
            const formattedDate = invoiceDate ? 
                new Date(invoiceDate).toLocaleDateString() : 
                'Unknown date';
            
            const statusBadge = getInvoiceStatusBadge(invoice.status);
            
            html += `
                <div class="invoice-item">
                    <div class="invoice-info">
                        <div class="invoice-header">
                            <strong>${invoice.invoiceNumber || 'Unknown Invoice'}</strong>
                            ${statusBadge}
                        </div>
                        <div class="invoice-details">
                            <span>Date: ${formattedDate}</span>
                            <span>Quantity: ${productItem.quantity || 0}</span>
                            <span>Amount: ${Utils.formatCurrency(productItem.total || 0)}</span>
                        </div>
                        <div class="invoice-client">
                            <small>Client: ${invoice.clientName || 'Unknown Client'}</small>
                        </div>
                    </div>
                    <div class="invoice-actions">
                        <a href="invoice-view.html?id=${invoice.id}" class="btn btn-sm btn-outline">
                            <i class="fas fa-eye"></i> View
                        </a>
                    </div>
                </div>
            `;
        }
    });
    
    html += '</div>';
    recentInvoicesElement.html(html);
}

function getInvoiceStatusBadge(status) {
    let badgeClass = 'status-pending';
    let badgeText = 'Pending';
    
    switch(status) {
        case 'paid':
            badgeClass = 'status-success';
            badgeText = 'Paid';
            break;
        case 'overdue':
            badgeClass = 'status-danger';
            badgeText = 'Overdue';
            break;
        case 'cancelled':
            badgeClass = 'status-inactive';
            badgeText = 'Cancelled';
            break;
    }
    
    return `<span class="badge ${badgeClass}">${badgeText}</span>`;
}

function setupTabs() {
    $('.tab-btn').on('click', function(e) {
        e.preventDefault();
        
        // Remove active class from all tabs
        $('.tab-btn').removeClass('active');
        $('.tab-pane').removeClass('active');
        
        // Add active class to clicked tab
        $(this).addClass('active');
        
        // Show corresponding tab pane
        const tabId = $(this).data('tab');
        $(`#${tabId}Tab`).addClass('active');
    });
}

function updateEditButton(productId) {
    $('#editBtn').attr('href', `product-edit.html?id=${productId}`);
}

function setupCreateInvoiceButton(product) {
    $('#createInvoiceBtn').on('click', function(e) {
        e.preventDefault();
        
        // Create a new invoice with this product pre-added
        createInvoiceWithProduct(product);
    });
}

function createInvoiceWithProduct(product) {
    console.log('📝 Creating invoice with product:', product.name);
    
    try {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) {
            Utils.showToast('Session expired. Please login again.', 'error');
            return;
        }
        
        // Generate a unique invoice ID
        const invoiceId = 'INV-' + Date.now();
        
        // Create invoice object
        const invoiceData = {
            id: invoiceId,
            userId: currentUser.id,
            invoiceNumber: `INV${Date.now().toString().slice(-6)}`,
            clientId: null,
            clientName: '',
            items: [
                {
                    productId: product.id,
                    name: product.name,
                    description: product.description || '',
                    quantity: 1,
                    price: product.price || 0,
                    taxRate: product.taxRate || 0,
                    total: product.price || 0
                }
            ],
            subtotal: product.price || 0,
            tax: 0,
            discount: 0,
            total: product.price || 0,
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Save invoice to database
        const db = DB.load();
        if (!db.invoices) {
            db.invoices = [];
        }
        
        db.invoices.push(invoiceData);
        
        if (DB.save(db)) {
            Utils.showToast('Invoice created with product. Redirecting...', 'success');
            
            // Redirect to invoice edit page
            setTimeout(() => {
                window.location.href = `invoice-edit.html?id=${invoiceId}`;
            }, 1500);
        } else {
            Utils.showToast('Failed to create invoice', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error creating invoice:', error);
        Utils.showToast('Error creating invoice', 'error');
    }
}

function setupEventListeners(currentUser, productId) {
    console.log('🔧 Setting up event listeners...');
    
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
    
    // Back button
    $('.btn-outline').on('click', function() {
        window.location.href = 'products.html';
    });
    
    // Print button (if you add one)
    setupPrintButton(productId);
}

function setupPrintButton(productId) {
    // Add a print button if needed
    $('.header-actions').append(`
        <button class="btn btn-info" id="printProductBtn">
            <i class="fas fa-print"></i> Print Details
        </button>
    `);
    
    $('#printProductBtn').on('click', function() {
        printProductDetails();
    });
}

function printProductDetails() {
    // Generate print-friendly version
    const printContent = generatePrintContent();
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load, then print
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}

function generatePrintContent() {
    const productName = $('#viewProductName').text();
    const productSKU = $('#viewProductSKU').text();
    const productPrice = $('#viewProductPrice').text();
    const productDescription = $('#viewProductDescription').text();
    const productStock = $('#viewStockLevel').text();
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${productName} - Product Details</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 40px;
                    color: #333;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #333;
                    padding-bottom: 20px;
                }
                .product-info {
                    margin-bottom: 20px;
                }
                .info-section {
                    margin-bottom: 15px;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                }
                .info-label {
                    font-weight: bold;
                    color: #666;
                    display: inline-block;
                    width: 150px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f4f4f4;
                }
                .footer {
                    margin-top: 40px;
                    text-align: center;
                    color: #666;
                    font-size: 12px;
                }
                @media print {
                    body {
                        margin: 20px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${productName}</h1>
                <p>${productSKU} | ${productPrice}</p>
            </div>
            
            <div class="product-info">
                <div class="info-section">
                    <h3>Overview</h3>
                    <p><span class="info-label">Description:</span> ${productDescription}</p>
                    <p><span class="info-label">Current Stock:</span> ${productStock}</p>
                </div>
                
                <div class="info-section">
                    <h3>Pricing Details</h3>
                    <div id="printPricingDetails">
                        <!-- Pricing details will be copied here -->
                    </div>
                </div>
                
                <div class="info-section">
                    <h3>Inventory Information</h3>
                    <div id="printInventoryDetails">
                        <!-- Inventory details will be copied here -->
                    </div>
                </div>
            </div>
            
            <div class="footer">
                <p>Printed from InvoicePro • ${new Date().toLocaleDateString()} • ${new Date().toLocaleTimeString()}</p>
            </div>
            
            <script>
                // Copy content from current page to print version
                document.getElementById('printPricingDetails').innerHTML = 
                    document.querySelector('#pricingTab .info-table').outerHTML;
                document.getElementById('printInventoryDetails').innerHTML = 
                    document.querySelector('#inventoryTab .info-card:first-child').innerHTML;
            </script>
        </body>
        </html>
    `;
}

// Utility function to get URL parameter
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Add some CSS for better product view styling (if not already in style.css)
function addCustomStyles() {
    const customStyles = `
        <style>
            /* Product view specific styles */
            .product-view {
                padding: 20px;
            }
            
            .product-header {
                display: flex;
                align-items: center;
                gap: 30px;
                margin-bottom: 30px;
                padding: 25px;
                background: white;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            }
            
            .product-image {
                width: 120px;
                height: 120px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 15px;
                font-size: 48px;
            }
            
            .product-info {
                flex: 1;
            }
            
            .product-info h2 {
                margin: 0 0 10px 0;
                color: #2c3e50;
            }
            
            .product-meta {
                display: flex;
                gap: 15px;
                align-items: center;
                margin-bottom: 15px;
                flex-wrap: wrap;
            }
            
            .product-sku {
                background: #f1f5f9;
                padding: 4px 10px;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
                font-size: 13px;
            }
            
            .product-category {
                color: #64748b;
                font-size: 14px;
            }
            
            .product-price h3 {
                margin: 5px 0;
                color: #10b981;
                font-size: 28px;
            }
            
            .product-price small {
                color: #94a3b8;
                font-size: 13px;
            }
            
            .product-tabs {
                background: white;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            }
            
            .tab-buttons {
                display: flex;
                background: #f8fafc;
                border-bottom: 1px solid #e2e8f0;
                padding: 0 20px;
            }
            
            .tab-btn {
                padding: 15px 25px;
                background: none;
                border: none;
                border-bottom: 3px solid transparent;
                color: #64748b;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .tab-btn:hover {
                color: #334155;
                background: rgba(99, 102, 241, 0.05);
            }
            
            .tab-btn.active {
                color: #6366f1;
                border-bottom-color: #6366f1;
                background: white;
            }
            
            .tab-content {
                padding: 30px;
            }
            
            .tab-pane {
                display: none;
            }
            
            .tab-pane.active {
                display: block;
            }
            
            .info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
            }
            
            .info-card {
                padding: 20px;
                background: #f8fafc;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
            }
            
            .info-card h4 {
                margin-top: 0;
                margin-bottom: 15px;
                color: #475569;
                font-size: 16px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .info-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .info-table tr {
                border-bottom: 1px solid #e2e8f0;
            }
            
            .info-table tr:last-child {
                border-bottom: none;
            }
            
            .info-table td {
                padding: 8px 0;
                color: #64748b;
            }
            
            .info-table td:first-child {
                width: 40%;
                font-weight: 500;
            }
            
            .info-table td:last-child {
                color: #334155;
                font-weight: 500;
            }
            
            .profit-calc {
                background: white;
                border-radius: 6px;
                padding: 15px;
                border: 1px solid #e2e8f0;
            }
            
            .calc-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #f1f5f9;
            }
            
            .calc-item:last-child {
                border-bottom: none;
                font-weight: bold;
                color: #10b981;
                font-size: 16px;
                padding-top: 12px;
            }
            
            .stock-level {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding: 12px;
                background: white;
                border-radius: 6px;
                border: 1px solid #e2e8f0;
            }
            
            .stock-label {
                font-weight: 500;
                color: #475569;
            }
            
            .stock-value {
                font-size: 24px;
                font-weight: bold;
                color: #10b981;
            }
            
            .stock-history {
                margin-top: 20px;
                padding-top: 15px;
                border-top: 1px solid #e2e8f0;
            }
            
            .stock-history h5 {
                margin: 0 0 10px 0;
                color: #64748b;
                font-size: 14px;
            }
            
            .invoice-list {
                margin-top: 15px;
            }
            
            .invoice-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                margin-bottom: 10px;
                transition: all 0.3s ease;
            }
            
            .invoice-item:hover {
                border-color: #6366f1;
                box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
            }
            
            .invoice-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 5px;
            }
            
            .invoice-details {
                display: flex;
                gap: 15px;
                font-size: 13px;
                color: #64748b;
                margin-bottom: 5px;
            }
            
            .invoice-client {
                font-size: 12px;
                color: #94a3b8;
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                .product-header {
                    flex-direction: column;
                    text-align: center;
                    gap: 20px;
                }
                
                .product-meta {
                    justify-content: center;
                }
                
                .tab-buttons {
                    flex-wrap: wrap;
                }
                
                .tab-btn {
                    flex: 1;
                    min-width: 120px;
                    text-align: center;
                }
                
                .info-grid {
                    grid-template-columns: 1fr;
                }
                
                .invoice-item {
                    flex-direction: column;
                    gap: 10px;
                    text-align: center;
                }
                
                .invoice-details {
                    flex-direction: column;
                    gap: 5px;
                }
            }
        </style>
    `;
    
    $('head').append(customStyles);
}

// Initialize custom styles when page loads
$(document).ready(function() {
    setTimeout(() => {
        addCustomStyles();
    }, 100);
});