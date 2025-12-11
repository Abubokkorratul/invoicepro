// js/client-add.js

document.addEventListener('DOMContentLoaded', function() {
    // Check Auth
    if (!Auth.isLoggedIn()) { window.location.href = 'index.html'; return; }
    
    setupImageHandler();
    
    document.getElementById('addClientForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveClient();
    });
});

// --- Image Compression Utility ---
function compressImage(file, maxWidth, quality) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Resize logic
                if (width > maxWidth) {
                    height = Math.round(height * (maxWidth / width));
                    width = maxWidth;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Compress to JPEG with reduced quality
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
        };
    });
}

// --- Image Handler with Remove Logic ---
function setupImageHandler() {
    const input = document.getElementById('clientImageInput');
    const area = document.getElementById('clientImageArea');

    if (!input || !area) return;

    // Remove old listeners to prevent duplicates
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);

    // 1. Handle File Selection
    newInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Show loading state
        area.innerHTML = `<i class="fas fa-spinner fa-spin"></i><div class="upload-overlay">Compressing...</div>`;

        try {
            // Compress Image
            const compressedBase64 = await compressImage(file, 800, 0.7);
            
            // Show Image + Remove Button
            area.innerHTML = `
                <img src="${compressedBase64}" alt="Client Image">
                <button type="button" class="remove-photo-btn" id="removePhotoBtn" title="Remove Photo" 
                        style="position: absolute; top: 0; right: 0; background: #ff4d4d; color: white; border: 2px solid white; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10;">
                    <i class="fas fa-times"></i>
                </button>
                <div class="upload-overlay">Change Photo</div>
            `;
            area.dataset.base64 = compressedBase64;
            
            // Attach listener to new Remove Button
            document.getElementById('removePhotoBtn').addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent opening file dialog
                removePhoto();
            });

        } catch (err) {
            console.error(err);
            Utils.showToast('Error processing image', 'error');
            removePhoto(); // Reset on error
        }
    });
    
    // 2. Trigger input on area click
    area.onclick = function(e) {
        // Don't trigger if clicking the remove button
        if (e.target.closest('.remove-photo-btn')) return;
        newInput.click();
    }
}

function removePhoto() {
    const area = document.getElementById('clientImageArea');
    const input = document.getElementById('clientImageInput');
    
    // Clear data
    delete area.dataset.base64;
    if(input) input.value = ''; 
    
    // Reset UI
    area.innerHTML = `<i class="fas fa-camera"></i><div class="upload-overlay">Upload Photo</div>`;
}

// --- Save Logic ---
function saveClient() {
    const currentUser = Auth.getCurrentUser();
    if (!currentUser) {
        Utils.showToast('Session expired. Please login.', 'error');
        return;
    }

    // Required Fields
    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    
    if(!name || !phone) {
        Utils.showToast('Name and Phone are required!', 'error');
        return;
    }

    // Optional Fields
    // Note: If you don't have these inputs in your HTML, use safe access or defaults
    const company = document.getElementById('clientCompany') ? document.getElementById('clientCompany').value.trim() : '';
    const email = document.getElementById('clientEmail') ? document.getElementById('clientEmail').value.trim() : '';
    const currency = document.getElementById('clientCurrency') ? document.getElementById('clientCurrency').value : '৳';
    const address = document.getElementById('clientAddress') ? document.getElementById('clientAddress').value.trim() : '';
    const note = document.getElementById('clientNote') ? document.getElementById('clientNote').value.trim() : '';
    
    // Get Image
    const area = document.getElementById('clientImageArea');
    const image = area ? area.dataset.base64 : null;

    // Generate IDs
    const timestamp = Date.now();
    const uniqueId = 'CLI-' + timestamp; 
    const barcodeCode = 'BAR-' + Math.floor(100000 + Math.random() * 900000);

    // Data Object
    const clientData = {
        id: uniqueId,
        userId: currentUser.id, // REQUIRED: Links client to logged-in user
        barcode: barcodeCode,
        name: name,
        companyName: company,
        phone: phone,
        email: email,
        currency: currency,
        address: address,
        note: note,
        image: image,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Save to Database
    try {
        const db = DB.load();
        if (!db.clients) db.clients = [];
        
        // Duplicate Check (scoped to user)
        const exists = db.clients.some(c => c.phone === phone && c.userId === currentUser.id && !c.isDeleted);
        if (exists) {
            if(!confirm('A client with this phone number already exists. Save duplicate?')) return;
        }

        db.clients.push(clientData);
        
        const saved = DB.save(db);

        if (saved) {
            Utils.showToast('Client Added Successfully!', 'success');
            
            // Add Activity Log
            if (DB.addActivity) {
                DB.addActivity({
                    userId: currentUser.id,
                    type: 'client_added',
                    title: 'New Client',
                    description: `Added: ${name}`,
                    timestamp: new Date().toISOString()
                });
            }

            resetForm();
        } else {
            // Storage full handling
            alert("Storage Full! Even compressed, this image is too big or your database is full.\n\nTry deleting old data or do not upload an image.");
            Utils.showToast('Storage full. Failed to save.', 'error');
        }

    } catch (e) {
        console.error(e);
        Utils.showToast('System error. Failed to save.', 'error');
    }
}

function resetForm() {
    document.getElementById('addClientForm').reset();
    removePhoto();
}