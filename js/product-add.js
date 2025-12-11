// js/product-add.js

document.addEventListener('DOMContentLoaded', function() {
    if (!Auth.isLoggedIn()) { window.location.href = 'index.html'; return; }
    
    loadCategories();
    generateUniqueCode();
    
    // --- Event Listeners ---

    // 1. Main Save (Publish)
    document.getElementById('productForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleSaveProduct('active');
    });

    // 2. Save as Draft
    document.getElementById('saveDraftBtn').addEventListener('click', function(e) {
        e.preventDefault();
        handleSaveProduct('draft'); 
    });

    // Category Logic
    document.getElementById('toggleCatBtn').addEventListener('click', () => {
        const box = document.getElementById('newCategoryBox');
        box.style.display = box.style.display === 'block' ? 'none' : 'block';
        if(box.style.display === 'block') document.getElementById('newCategoryInput').focus();
    });

    document.getElementById('saveCatBtn').addEventListener('click', addNewCategory);
    document.getElementById('cancelCatBtn').addEventListener('click', () => {
        document.getElementById('newCategoryBox').style.display = 'none';
        document.getElementById('newCategoryInput').value = '';
    });
});

// --- Unique Code Generator ---
function generateUniqueCode() {
    const el = document.getElementById('productBarcode');
    if (!el) return '';
    if (el.value) return el.value; // Don't overwrite if exists

    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    const uniqueCode = `PROD-${timestamp}-${random}`;
    el.value = uniqueCode;
    return uniqueCode;
}

// --- QR Code Generator ---
function generateQRCodeImage(text) {
    return new Promise((resolve) => {
        const container = document.getElementById('qrCodeContainer');
        if (!container) { resolve(null); return; }
        
        container.innerHTML = ''; 
        try {
            new QRCode(container, {
                text: text, width: 100, height: 100, // Reduced size
                colorDark : "#000000", colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.L // Lower correction level saves space
            });
            setTimeout(() => {
                const img = container.querySelector('img');
                if (img && img.src) resolve(img.src);
                else {
                    const canvas = container.querySelector('canvas');
                    resolve(canvas ? canvas.toDataURL('image/jpeg', 0.5) : null);
                }
            }, 100);
        } catch (e) {
            console.error("QR Generation failed", e);
            resolve(null);
        }
    });
}

// --- Main Save Function ---
async function handleSaveProduct(status) {
    const btn = status === 'active' 
        ? document.getElementById('saveProductBtn') 
        : document.getElementById('saveDraftBtn');
        
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    try {
        const currentUser = Auth.getCurrentUser();
        
        // 1. Get Form Values safely
        const getVal = (id) => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : '';
        };

        const uniqueCode = getVal('productBarcode') || generateUniqueCode();
        const sn = getVal('productSN');
        
        // 2. Generate QR (Optimized)
        const qrCodeBase64 = await generateQRCodeImage(uniqueCode);

        // 3. Construct Object
        const productData = {
            id: 'P-' + Date.now(),
            userId: currentUser.id,
            name: getVal('productName'),
            type: getVal('productType'),
            category: getVal('productCategory'),
            description: getVal('productDescription'),
            uniqueCode: uniqueCode,
            qrCode: qrCodeBase64,
            sn: sn,
            brand: getVal('productBrand'),
            model: getVal('productModel'),
            features: getVal('productFeatures'),
            price: parseFloat(getVal('productPrice')) || 0,
            warranty: getVal('productWarranty'),
            notes: getVal('productNotes'),
            status: status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // 4. Save
        const db = DB.load();
        if (!db.products) db.products = [];
        db.products.push(productData);
        
        const saved = DB.save(db);

        if (saved) {
            const msg = status === 'draft' ? 'Draft saved' : 'Product published';

            if (DB.addActivity) {
                DB.addActivity({
                    userId: currentUser.id,
                    type: 'product_created',
                    title: status === 'draft' ? 'Draft Saved' : 'New Product',
                    description: `${msg}: "${productData.name}"`,
                    timestamp: new Date().toISOString()
                });
            }

            Utils.showToast(`${msg} successfully!`, 'success');
            setTimeout(() => { window.location.href = 'products.html'; }, 1000);
        } else {
            throw new Error('Storage Quota Exceeded');
        }

    } catch (error) {
        console.error('Save Error:', error);
        
        // Specific Error Handling for Quota
        if (error.name === 'QuotaExceededError' || error.message.includes('Quota') || error.message.includes('Storage')) {
            alert("⚠️ STORAGE FULL!\n\nYour browser's storage is full. Please delete old products, invoices, or clear the recycle bin to make space.\n\nTip: Avoid adding large images.");
        } else {
            Utils.showToast('Error saving product.', 'error');
        }
        
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// --- Category Helpers ---
function loadCategories() {
    const db = DB.load();
    const currentUser = Auth.getCurrentUser();
    const select = document.getElementById('productCategory');
    if(!select) return;

    const defaults = ['Electronics', 'Computers', 'Accessories', 'Software', 'Services'];
    let saved = db.savedCategories && db.savedCategories[currentUser.id] ? db.savedCategories[currentUser.id] : [];
    const allCats = [...new Set([...defaults, ...saved])].sort();

    select.innerHTML = '<option value="">Select Category</option>';
    allCats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat; opt.textContent = cat;
        select.appendChild(opt);
    });
}

function addNewCategory() {
    const input = document.getElementById('newCategoryInput');
    const name = input.value.trim();
    if (!name) return Utils.showToast('Enter name', 'error');

    const db = DB.load();
    const currentUser = Auth.getCurrentUser();
    
    if (!db.savedCategories) db.savedCategories = {};
    if (!db.savedCategories[currentUser.id]) db.savedCategories[currentUser.id] = [];

    if (!db.savedCategories[currentUser.id].includes(name)) {
        db.savedCategories[currentUser.id].push(name);
        DB.save(db);
        Utils.showToast('Category added', 'success');
        loadCategories();
        
        const select = document.getElementById('productCategory');
        if(select) select.value = name;
        
        document.getElementById('newCategoryBox').style.display = 'none';
        input.value = '';
    }
}