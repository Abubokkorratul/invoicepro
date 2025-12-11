// js/product-edit.js - Product Edit Page with Category Management

// This will be called by app.js when the page is ready
function initPage() {
    console.log('✏️ Product edit page initialized by app.js');
    
    // Get current user from Auth module
    const currentUser = Auth.getCurrentUser();
    if (!currentUser) {
        console.error('❌ No user logged in');
        window.location.href = 'index.html';
        return;
    }
    
    console.log('👤 Current user:', currentUser.email);
    
    // Update user info in sidebar
    updateUserInfo(currentUser);
    
    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    console.log('🔍 URL productId:', productId);
    
    if (!productId) {
        console.error('❌ No product ID provided');
        showErrorMessage('No product selected. Please select a product from the products page.');
        return;
    }
    
    // Initialize product edit manager
    initializeProductEditManager(currentUser, productId);
}

function updateUserInfo(user) {
    if (typeof $ !== 'undefined') {
        $('#userName').text(user.name || 'User');
        $('#userEmail').text(user.email);
    } else {
        document.getElementById('userName').textContent = user.name || 'User';
        document.getElementById('userEmail').textContent = user.email;
    }
}

function initializeProductEditManager(currentUser, productId) {
    console.log('🚀 Initializing product edit manager...');
    
    // Load product details
    loadProductDetails(currentUser, productId);
    
    // Setup all event listeners
    setupEventListeners(currentUser, productId);
}

function loadProductDetails(currentUser, productId) {
    console.log('📦 Loading product details for editing...');
    
    try {
        // Load the product from database
        const product = getProductById(productId, currentUser.id);
        
        if (!product) {
            console.error('❌ Product not found');
            showErrorMessage('Product not found. It may have been deleted or you don\'t have permission to edit it.');
            return;
        }
        
        console.log('✅ Product loaded for editing:', product);
        
        // Populate form with product data
        populateEditForm(product, currentUser);
        
    } catch (error) {
        console.error('❌ Error loading product details:', error);
        showErrorMessage('Error loading product details. Please try again.');
    }
}

function getProductById(productId, userId) {
    try {
        const db = DB.load();
        console.log('🔍 Searching for product:', productId);
        console.log('📊 Total products in DB:', db.products ? db.products.length : 0);
        
        if (!db || !db.products) {
            console.error('❌ No products array in database');
            return null;
        }
        
        // Find the product by ID and user ID
        const product = db.products.find(p => {
            const match = p.id === productId && p.userId === userId;
            if (match) {
                console.log('✅ Found product:', p);
            }
            return match;
        });
        
        if (!product) {
            console.error('❌ Product not found');
            // List user's products for debugging
            const userProducts = db.products.filter(p => p.userId === userId);
            console.log('User products:', userProducts.map(p => ({ id: p.id, name: p.name })));
        }
        
        return product;
        
    } catch (error) {
        console.error('Error getting product:', error);
        return null;
    }
}

function populateEditForm(product, currentUser) {
    console.log('🎨 Populating edit form...');
    
    // Update page title
    document.title = `Edit ${product.name} - InvoicePro`;
    
    if (typeof $ === 'undefined') {
        populateFormVanillaJS(product, currentUser);
    } else {
        populateFormWithjQuery(product, currentUser);
    }
}

function populateFormVanillaJS(product, currentUser) {
    // Basic Information
    document.getElementById('editName').value = product.name || '';
    document.getElementById('editSKU').value = product.SKU || '';
    document.getElementById('editCategory').value = product.category || 'Product';
    
    // Pricing & Stock
    document.getElementById('editPrice').value = product.price || 0;
    document.getElementById('editTaxRate').value = product.taxRate || 0;
    document.getElementById('editUnit').value = product.unit || '';
    document.getElementById('editStock').value = product.stock || 0;
    
    // Description
    document.getElementById('editDescription').value = product.description || '';
    document.getElementById('editNotes').value = product.notes || '';
    
    // Status
    document.getElementById('editStatus').value = product.status || 'active';
    
    // Set currency
    setCurrencyVanillaJS(product, currentUser);
}

function setCurrencyVanillaJS(product, currentUser) {
    try {
        const db = DB.load();
        let currency = '৳';
        
        if (product.currency) {
            currency = product.currency;
        } else if (currentUser && currentUser.settings && currentUser.settings.currency) {
            currency = currentUser.settings.currency;
        } else if (db.settings && db.settings.defaultCurrency) {
            currency = db.settings.defaultCurrency;
        }
        
        document.getElementById('editCurrency').value = currency;
        
    } catch (error) {
        console.error('Error setting currency:', error);
        document.getElementById('editCurrency').value = '৳';
    }
}

function populateFormWithjQuery(product, currentUser) {
    // Update page title and header
    document.title = `Edit ${product.name} - InvoicePro`;
    $('h1').text(`Edit Product: ${product.name || 'Unnamed Product'}`);
    
    // Basic Information
    $('#editName').val(product.name || '');
    $('#editSKU').val(product.SKU || '');
    $('#editCategory').val(product.category || 'Product');
    
    // Pricing & Stock
    $('#editPrice').val(product.price || 0);
    $('#editTaxRate').val(product.taxRate || 0);
    $('#editUnit').val(product.unit || '');
    $('#editStock').val(product.stock || 0);
    
    // Description
    $('#editDescription').val(product.description || '');
    $('#editNotes').val(product.notes || '');
    
    // Status
    $('#editStatus').val(product.status || 'active');
    
    // Set currency
    setCurrencyWithjQuery(product, currentUser);
    
    // Load additional fields
    loadAdditionalFieldsWithjQuery(product);
    
    // Load categories with "Add New" option
    loadCategoriesWithAddOption(currentUser.id);
}

function loadCategoriesWithAddOption(userId) {
    try {
        const db = DB.load();
        const categorySelect = $('#editCategory');
        
        // Get current value
        const currentValue = categorySelect.val();
        
        // Get all unique categories from database
        const categories = new Set(['Service', 'Product', 'Software', 'Consulting', 'Hardware', 'Other']);
        
        // Initialize savedCategories if it doesn't exist
        if (!db.savedCategories) {
            db.savedCategories = {};
            console.log('📝 Initialized savedCategories object');
        }
        
        if (!db.savedCategories[userId]) {
            db.savedCategories[userId] = [];
            console.log('📝 Initialized savedCategories array for user');
        }
        
        // Add categories from existing products
        if (db.products) {
            db.products.forEach(product => {
                if (product.userId === userId && product.category && product.category.trim()) {
                    categories.add(product.category.trim());
                }
            });
        }
        
        // Add categories from saved categories
        if (db.savedCategories[userId]) {
            db.savedCategories[userId].forEach(category => {
                if (category && category.trim()) {
                    categories.add(category.trim());
                }
            });
        }
        
        // Sort categories alphabetically
        const sortedCategories = Array.from(categories).sort();
        
        // Clear and rebuild select options
        categorySelect.empty();
        
        // Add all categories
        sortedCategories.forEach(category => {
            categorySelect.append(new Option(category, category));
        });
        
        // Add "Add New Category" option
        categorySelect.append(new Option('＋ Add New Category...', 'new_category'));
        
        // Restore previous selection
        if (currentValue && sortedCategories.includes(currentValue)) {
            categorySelect.val(currentValue);
        }
        
        // Setup change event for "Add New Category" option
        categorySelect.off('change').on('change', function() {
            if ($(this).val() === 'new_category') {
                showNewCategoryModal(userId);
            }
        });
        
        console.log('📋 Loaded categories:', sortedCategories);
        console.log('💾 savedCategories for user:', db.savedCategories[userId]);
        
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function showNewCategoryModal(userId) {
    console.log('➕ Opening new category modal...');
    
    // Create modal HTML
    const modalHTML = `
        <div class="modal active" id="newCategoryModal">
            <div class="modal-content modal-sm">
                <div class="modal-header">
                    <h3><i class="fas fa-plus-circle"></i> Add New Category</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="newCategoryName">Category Name *</label>
                        <input type="text" id="newCategoryName" 
                               class="form-control" 
                               placeholder="Enter new category name"
                               autocomplete="off">
                        <div class="form-hint">Enter a unique category name</div>
                        <div id="categoryError" class="error-message" style="display: none; color: #e74c3c; font-size: 12px; margin-top: 5px;"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="cancelNewCategory">Cancel</button>
                    <button class="btn btn-primary" id="saveNewCategory">
                        <i class="fas fa-plus"></i> Add Category
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    $('body').append(modalHTML);
    
    // Focus on input
    $('#newCategoryName').focus();
    
    // Save new category
    $('#saveNewCategory').on('click', function() {
        saveNewCategory(userId);
    });
    
    // Cancel button
    $('#cancelNewCategory, #newCategoryModal .modal-close').on('click', function() {
        $('#newCategoryModal').remove();
        $('#editCategory').val('');
    });
    
    // Allow Enter key to save
    $('#newCategoryName').on('keypress', function(e) {
        if (e.which === 13) { // Enter key
            saveNewCategory(userId);
        }
    });
    
    // Close on escape
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape' && $('#newCategoryModal').length) {
            $('#newCategoryModal').remove();
            $('#editCategory').val('');
        }
    });
}

function saveNewCategory(userId) {
    const categoryName = $('#newCategoryName').val().trim();
    const categoryError = $('#categoryError');
    
    // Reset error
    categoryError.hide().text('');
    
    // Validate
    if (!categoryName) {
        categoryError.text('Category name is required').show();
        $('#newCategoryName').focus();
        return;
    }
    
    if (categoryName.length < 2) {
        categoryError.text('Category name must be at least 2 characters').show();
        $('#newCategoryName').focus();
        return;
    }
    
    if (categoryName.length > 50) {
        categoryError.text('Category name is too long (max 50 characters)').show();
        $('#newCategoryName').focus();
        return;
    }
    
    try {
        // Load fresh database state
        const db = DB.load();
        
        // Initialize savedCategories if needed
        if (!db.savedCategories) {
            db.savedCategories = {};
        }
        if (!db.savedCategories[userId]) {
            db.savedCategories[userId] = [];
        }
        
        // Check if category already exists in savedCategories
        const lowerCaseCategories = db.savedCategories[userId].map(cat => cat.toLowerCase());
        if (lowerCaseCategories.includes(categoryName.toLowerCase())) {
            categoryError.text('This category already exists').show();
            $('#newCategoryName').focus();
            return;
        }
        
        // Check if category exists in products
        const productCategories = new Set();
        if (db.products) {
            db.products.forEach(product => {
                if (product.userId === userId && product.category && product.category.trim()) {
                    productCategories.add(product.category.toLowerCase());
                }
            });
        }
        
        if (productCategories.has(categoryName.toLowerCase())) {
            categoryError.text('This category already exists in your products').show();
            $('#newCategoryName').focus();
            return;
        }
        
        // Add new category to savedCategories
        db.savedCategories[userId].push(categoryName);
        
        // Sort alphabetically
        db.savedCategories[userId].sort();
        
        // Save database
        const saved = DB.save(db);
        
        if (saved) {
            console.log('✅ New category saved to database:', categoryName);
            console.log('📋 Updated savedCategories:', db.savedCategories[userId]);
            
            // Update the dropdown immediately without reloading
            updateCategoryDropdown(categoryName, userId);
            
            // Close modal
            $('#newCategoryModal').remove();
            
            // Show success message
            Utils.showToast(`Category "${categoryName}" added successfully!`, 'success');
            
        } else {
            categoryError.text('Failed to save category. Please try again.').show();
        }
        
    } catch (error) {
        console.error('Error saving new category:', error);
        categoryError.text('Error saving category. Please try again.').show();
    }
}

function updateCategoryDropdown(newCategory, userId) {
    const categorySelect = $('#editCategory');
    const existingCategories = [];
    
    // Get all existing options (excluding "Add New Category")
    categorySelect.find('option').each(function() {
        if ($(this).val() !== 'new_category') {
            existingCategories.push($(this).val());
        }
    });
    
    // Check if category already exists in dropdown
    if (!existingCategories.includes(newCategory)) {
        // Remove "Add New Category" option
        categorySelect.find('option[value="new_category"]').remove();
        
        // Add the new category
        categorySelect.append(new Option(newCategory, newCategory));
        
        // Add "Add New Category" option back at the end
        categorySelect.append(new Option('＋ Add New Category...', 'new_category'));
        
        // Sort options alphabetically (excluding "Add New Category")
        sortCategoryOptions(categorySelect);
        
        // Select the new category
        categorySelect.val(newCategory);
        
        console.log('✅ Category added to dropdown:', newCategory);
    }
}

function sortCategoryOptions(selectElement) {
    const options = selectElement.find('option');
    const lastOption = options.last(); // Keep "Add New Category" at the end
    
    // Remove and sort all options except the last one
    const sortableOptions = options.slice(0, -1).get();
    
    sortableOptions.sort(function(a, b) {
        const textA = $(a).text().toUpperCase();
        const textB = $(b).text().toUpperCase();
        return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
    });
    
    // Clear all options
    selectElement.empty();
    
    // Add sorted options
    sortableOptions.forEach(option => {
        selectElement.append(option);
    });
    
    // Re-add the "Add New Category" option
    selectElement.append(lastOption);
}


function setCurrencyWithjQuery(product, currentUser) {
    try {
        const db = DB.load();
        
        if (product.currency) {
            $('#editCurrency').val(product.currency);
        } else if (currentUser && currentUser.settings && currentUser.settings.currency) {
            $('#editCurrency').val(currentUser.settings.currency);
        } else if (db.settings && db.settings.defaultCurrency) {
            $('#editCurrency').val(db.settings.defaultCurrency);
        }
        
    } catch (error) {
        console.error('Error setting currency:', error);
        $('#editCurrency').val('৳');
    }
}

function loadAdditionalFieldsWithjQuery(product) {
    // Load cost price if exists
    if (product.cost !== undefined) {
        if (!$('#editCost').length) {
            addCostField();
        }
        $('#editCost').val(product.cost || 0);
    }
    
    // Load low stock alert if exists
    if (product.lowStockAlert !== undefined) {
        if (!$('#editLowStockAlert').length) {
            addLowStockAlertField();
        }
        $('#editLowStockAlert').val(product.lowStockAlert || 0);
    }
    
    // Load product type if exists
    if (product.type) {
        if (!$('#editType').length) {
            addProductTypeField();
        }
        $('#editType').val(product.type || 'physical');
    }
}

function addCostField() {
    const pricingSection = $('.form-section:contains("Pricing & Stock")');
    const formGrid = pricingSection.find('.form-grid');
    
    const costField = `
        <div class="form-group">
            <label for="editCost">Cost Price</label>
            <input type="number" id="editCost" 
                   min="0" step="0.01" class="form-control">
            <div class="form-hint">Purchase cost per unit</div>
        </div>
    `;
    
    formGrid.prepend(costField);
}

function addLowStockAlertField() {
    const pricingSection = $('.form-section:contains("Pricing & Stock")');
    const formGrid = pricingSection.find('.form-grid');
    
    const alertField = `
        <div class="form-group">
            <label for="editLowStockAlert">Low Stock Alert</label>
            <input type="number" id="editLowStockAlert" 
                   min="0" class="form-control">
            <div class="form-hint">Alert when stock reaches this level</div>
        </div>
    `;
    
    formGrid.append(alertField);
}

function addProductTypeField() {
    const basicInfoSection = $('.form-section:contains("Basic Information")');
    const formGrid = basicInfoSection.find('.form-grid');
    
    const typeField = `
        <div class="form-group">
            <label for="editType">Product Type</label>
            <div class="select-wrapper">
                <select id="editType" class="form-control">
                    <option value="physical">Physical Product</option>
                    <option value="service">Service</option>
                    <option value="digital">Digital Product</option>
                </select>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div class="form-hint">Type of product or service</div>
        </div>
    `;
    
    formGrid.append(typeField);
}

function setupEventListeners(currentUser, productId) {
    console.log('🔧 Setting up event listeners...');
    
    if (typeof $ === 'undefined') {
        setupEventListenersVanillaJS(currentUser, productId);
    } else {
        setupEventListenersWithjQuery(currentUser, productId);
    }
}

function setupEventListenersVanillaJS(currentUser, productId) {
    // Form submission
    document.getElementById('editProductForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveProductChangesVanillaJS(currentUser, productId);
    });
    
    // Cancel/Back button
    document.getElementById('backBtn').addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('Are you sure? Any unsaved changes will be lost.')) {
            window.location.href = 'product-view.html?id=' + productId;
        }
    });
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            Auth.logout();
        }
    });
}

function setupEventListenersWithjQuery(currentUser, productId) {
    // Form submission
    $('#editProductForm').on('submit', function(e) {
        e.preventDefault();
        saveProductChanges(currentUser, productId);
    });
    
    // Cancel/Back button
    $('#backBtn').on('click', function(e) {
        e.preventDefault();
        if (confirm('Are you sure? Any unsaved changes will be lost.')) {
            window.location.href = 'product-view.html?id=' + productId;
        }
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
    
    // Success modal buttons
    $('#viewProductBtn').on('click', function(e) {
        e.preventDefault();
        window.location.href = 'product-view.html?id=' + productId;
    });
    
    $('#closeModalBtn').on('click', function() {
        window.location.href = 'products.html';
    });
    
    // Close modal when clicking outside
    $('#successModal').on('click', function(e) {
        if ($(e.target).hasClass('modal')) {
            window.location.href = 'products.html';
        }
    });
    
    // Add form validation
    addFormValidation();
}

function addFormValidation() {
    // Validate price
    $('#editPrice').on('change', function() {
        const price = parseFloat($(this).val()) || 0;
        if (price < 0) {
            $(this).val(0);
            Utils.showToast('Price cannot be negative', 'warning');
        }
    });
    
    // Validate stock
    $('#editStock').on('change', function() {
        const stock = parseInt($(this).val()) || 0;
        if (stock < 0) {
            $(this).val(0);
            Utils.showToast('Stock cannot be negative', 'warning');
        }
    });
    
    // Validate low stock alert
    $(document).on('change', '#editLowStockAlert', function() {
        const alert = parseInt($(this).val()) || 0;
        const stock = parseInt($('#editStock').val()) || 0;
        
        if (alert < 0) {
            $(this).val(0);
            Utils.showToast('Alert level cannot be negative', 'warning');
        }
    });
}

function saveProductChanges(currentUser, productId) {
    console.log('💾 Saving product changes...');
    
    if (!validateForm()) {
        return;
    }
    
    try {
        const productData = collectFormData();
        const db = DB.load();
        
        const productIndex = db.products.findIndex(p => 
            p.id === productId && 
            p.userId === currentUser.id
        );
        
        if (productIndex === -1) {
            Utils.showToast('Product not found in database', 'error');
            return;
        }
        
        const originalProduct = db.products[productIndex];
        
        db.products[productIndex] = {
            ...originalProduct,
            ...productData,
            updatedAt: new Date().toISOString()
        };
        
        const saved = DB.save(db);
        
        if (saved) {
            // Log activity
            DB.addActivity({
                userId: currentUser.id,
                type: 'product_updated',
                title: 'Product Updated',
                description: `Product "${productData.name}" was updated`,
                timestamp: new Date().toISOString(),
                metadata: { 
                    productId: productId,
                    changes: getChangedFields(originalProduct, productData)
                }
            });
            
            showSuccessModal(productId);
            
        } else {
            Utils.showToast('Failed to save product changes', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error saving product:', error);
        Utils.showToast('Error saving product changes', 'error');
    }
}

function validateForm() {
    const name = $('#editName').val().trim();
    const price = $('#editPrice').val().trim();
    
    if (!name) {
        Utils.showToast('Product name is required', 'warning');
        $('#editName').focus();
        return false;
    }
    
    if (!price || parseFloat(price) < 0) {
        Utils.showToast('Valid price is required', 'warning');
        $('#editPrice').focus();
        return false;
    }
    
    return true;
}

function collectFormData() {
    const productData = {
        name: $('#editName').val().trim(),
        SKU: $('#editSKU').val().trim(),
        category: $('#editCategory').val(),
        price: parseFloat($('#editPrice').val()) || 0,
        taxRate: parseFloat($('#editTaxRate').val()) || 0,
        unit: $('#editUnit').val().trim() || 'pcs',
        stock: parseInt($('#editStock').val()) || 0,
        description: $('#editDescription').val().trim(),
        notes: $('#editNotes').val().trim(),
        status: $('#editStatus').val(),
        currency: $('#editCurrency').val()
    };
    
    // Additional fields
    if ($('#editCost').length) {
        productData.cost = parseFloat($('#editCost').val()) || 0;
    }
    
    if ($('#editLowStockAlert').length) {
        const alertValue = parseInt($('#editLowStockAlert').val());
        if (!isNaN(alertValue)) {
            productData.lowStockAlert = alertValue;
        }
    }
    
    if ($('#editType').length) {
        productData.type = $('#editType').val();
    }
    
    return productData;
}

function showSuccessModal(productId) {
    // Update view product button URL
    $('#viewProductBtn').attr('href', 'product-view.html?id=' + productId);
    
    // Show modal with animation
    $('#successModal').addClass('active');
}

function showErrorMessage(message) {
    const errorHTML = `
        <div class="error-container" style="
            max-width: 600px;
            margin: 50px auto;
            padding: 30px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        ">
            <div style="font-size: 60px; color: #e74c3c; margin-bottom: 20px;">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h2 style="color: #2c3e50; margin-bottom: 15px;">Error Loading Product</h2>
            <p style="color: #7f8c8d; margin-bottom: 25px; font-size: 16px;">${message}</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <a href="products.html" class="btn btn-primary">
                    <i class="fas fa-arrow-left"></i> Back to Products
                </a>
            </div>
        </div>
    `;
    
    document.querySelector('.main-content').innerHTML = errorHTML;
}

function saveProductChangesVanillaJS(currentUser, productId) {
    console.log('💾 Saving product changes (vanilla JS)...');
    
    if (!validateFormVanillaJS()) {
        return;
    }
    
    try {
        const productData = collectFormDataVanillaJS();
        const db = DB.load();
        
        const productIndex = db.products.findIndex(p => 
            p.id === productId && 
            p.userId === currentUser.id
        );
        
        if (productIndex === -1) {
            alert('Product not found in database');
            return;
        }
        
        const originalProduct = db.products[productIndex];
        
        db.products[productIndex] = {
            ...originalProduct,
            ...productData,
            updatedAt: new Date().toISOString()
        };
        
        const saved = DB.save(db);
        
        if (saved) {
            document.getElementById('successModal').classList.add('active');
        } else {
            alert('Failed to save product changes');
        }
        
    } catch (error) {
        console.error('❌ Error saving product:', error);
        alert('Error saving product changes');
    }
}

function validateFormVanillaJS() {
    const name = document.getElementById('editName').value.trim();
    const price = document.getElementById('editPrice').value.trim();
    
    if (!name) {
        alert('Product name is required');
        document.getElementById('editName').focus();
        return false;
    }
    
    if (!price || parseFloat(price) < 0) {
        alert('Valid price is required');
        document.getElementById('editPrice').focus();
        return false;
    }
    
    return true;
}

function collectFormDataVanillaJS() {
    const productData = {
        name: document.getElementById('editName').value.trim(),
        SKU: document.getElementById('editSKU').value.trim(),
        category: document.getElementById('editCategory').value,
        price: parseFloat(document.getElementById('editPrice').value) || 0,
        taxRate: parseFloat(document.getElementById('editTaxRate').value) || 0,
        unit: document.getElementById('editUnit').value.trim() || 'pcs',
        stock: parseInt(document.getElementById('editStock').value) || 0,
        description: document.getElementById('editDescription').value.trim(),
        notes: document.getElementById('editNotes').value.trim(),
        status: document.getElementById('editStatus').value,
        currency: document.getElementById('editCurrency').value
    };
    
    return productData;
}

function getChangedFields(original, updated) {
    const changes = [];
    
    const fieldsToCheck = [
        'name', 'category', 'price', 'stock', 
        'status', 'description', 'unit', 'taxRate'
    ];
    
    fieldsToCheck.forEach(field => {
        if (original[field] !== updated[field]) {
            changes.push({
                field: field,
                from: original[field],
                to: updated[field]
            });
        }
    });
    
    return changes;
}

// Add CSS for the modal
function addModalStyles() {
    const styles = `
        <style>
            .modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 1000;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            }
            
            .modal.active {
                display: flex;
            }
            
            .modal-content {
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
                animation: slideIn 0.3s ease;
                max-width: 95%;
                max-height: 95vh;
                overflow-y: auto;
            }
            
            .modal-sm {
                width: 90%;
                max-width: 400px;
            }
            
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #eaeaea;
            }
            
            .modal-header h3 {
                margin: 0;
                color: #2c3e50;
                font-size: 18px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #6b7280;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.3s ease;
            }
            
            .modal-close:hover {
                background: #f3f4f6;
                color: #374151;
            }
            
            .modal-body {
                padding: 25px 30px;
            }
            
            .modal-footer {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                padding: 20px;
                border-top: 1px solid #eaeaea;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
}

// Initialize styles when page loads
document.addEventListener('DOMContentLoaded', function() {
    addModalStyles();
});

// Make initPage function available globally
window.initPage = initPage;