// js/client-edit.js

let currentClientId = null;
let currentClient = null;

document.addEventListener('DOMContentLoaded', function() {
    if (!Auth.isLoggedIn()) { window.location.href = 'index.html'; return; }
    
    // Get ID
    const urlParams = new URLSearchParams(window.location.search);
    currentClientId = urlParams.get('id');

    if (!currentClientId) {
        alert("No Client ID specified.");
        window.location.href = 'clients.html';
        return;
    }

    // Load Data
    loadClientData();
    setupImageHandler();
    setupDeleteModal();

    // Form Submit
    document.getElementById('editClientForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveChanges();
    });
});

function loadClientData() {
    const db = DB.load();
    currentClient = db.clients.find(c => c.id === currentClientId);

    if (!currentClient) {
        alert("Client not found.");
        window.location.href = 'clients.html';
        return;
    }

    // Fill Form (Status field removed from UI, preserved in logic)
    document.getElementById('editName').value = currentClient.name || '';
    document.getElementById('editPhone').value = currentClient.phone || '';
    document.getElementById('editEmail').value = currentClient.email || '';
    document.getElementById('editCompany').value = currentClient.company || ''; 
    document.getElementById('editAddress').value = currentClient.address || '';
    document.getElementById('editCurrency').value = currentClient.currency || '৳';
    document.getElementById('editNote').value = currentClient.note || '';

    // Handle Image
    const area = document.getElementById('clientImageArea');
    
    if (currentClient.image) {
        renderImageWithRemoveBtn(currentClient.image);
    }
}

// --- Helper to Render Image ---
function renderImageWithRemoveBtn(base64) {
    const area = document.getElementById('clientImageArea');
    area.innerHTML = `
        <img src="${base64}" alt="Client Image">
        <button type="button" class="remove-photo-btn" id="removePhotoBtn" title="Remove Photo">
            <i class="fas fa-times"></i>
        </button>
        <div class="upload-overlay">Change Photo</div>
    `;
    area.dataset.base64 = base64;

    // Attach listener to new button
    document.getElementById('removePhotoBtn').addEventListener('click', function(e) {
        e.stopPropagation(); // Stop click from triggering upload
        removePhoto();
    });
}

function removePhoto() {
    const area = document.getElementById('clientImageArea');
    const input = document.getElementById('clientImageInput');
    
    // Clear data
    delete area.dataset.base64;
    input.value = ''; // Clear file input
    
    // Reset UI
    area.innerHTML = `<i class="fas fa-camera"></i><div class="upload-overlay">Upload Photo</div>`;
}

// --- Image Handler Logic ---
function setupImageHandler() {
    const input = document.getElementById('clientImageInput');
    const area = document.getElementById('clientImageArea');

    // Trigger input on area click
    area.addEventListener('click', (e) => {
        // Only trigger if NOT clicking the remove button
        if (!e.target.closest('.remove-photo-btn')) {
            input.click();
        }
    });

    input.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        area.innerHTML = `<i class="fas fa-spinner fa-spin"></i><div class="upload-overlay">Compressing...</div>`;

        try {
            const compressedBase64 = await compressImage(file, 800, 0.7);
            renderImageWithRemoveBtn(compressedBase64);
        } catch (err) {
            console.error(err);
            Utils.showToast('Error processing image', 'error');
            area.innerHTML = `<i class="fas fa-camera"></i><div class="upload-overlay">Upload Photo</div>`;
        }
    });
}

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
                if (width > maxWidth) {
                    height = Math.round(height * (maxWidth / width));
                    width = maxWidth;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
        };
    });
}

function saveChanges() {
    const name = document.getElementById('editName').value.trim();
    const phone = document.getElementById('editPhone').value.trim();

    if(!name || !phone) {
        Utils.showToast('Name and Phone are required!', 'error');
        return;
    }

    const db = DB.load();
    const index = db.clients.findIndex(c => c.id === currentClientId);

    if (index === -1) {
        Utils.showToast('Client not found in DB', 'error');
        return;
    }

    // Update Object (Preserving Status)
    const updatedClient = {
        ...db.clients[index], // Keep existing fields (including status)
        name: name,
        phone: phone,
        email: document.getElementById('editEmail').value.trim(),
        company: document.getElementById('editCompany').value.trim(),
        address: document.getElementById('editAddress').value.trim(),
        currency: document.getElementById('editCurrency').value,
        note: document.getElementById('editNote').value.trim(),
        image: document.getElementById('clientImageArea').dataset.base64 || null,
        updatedAt: new Date().toISOString()
    };

    db.clients[index] = updatedClient;
    DB.save(db);

    Utils.showToast('Client Updated Successfully!', 'success');
    
    setTimeout(() => {
        window.location.href = `client-detail.html?id=${currentClientId}`;
    }, 1000);
}

// --- Delete Logic ---
function setupDeleteModal() {
    const modal = document.getElementById('deleteModal');
    const btn = document.getElementById('deleteClientBtn');
    const closeBtns = document.querySelectorAll('.close-modal-btn');
    const confirmBtn = document.getElementById('confirmDeleteBtn');

    if(btn) btn.addEventListener('click', () => modal.classList.add('active'));
    
    closeBtns.forEach(b => b.addEventListener('click', () => {
        modal.classList.remove('active');
        document.getElementById('passwordError').style.display = 'none';
        document.getElementById('passwordInput').value = '';
    }));

    if(confirmBtn) confirmBtn.addEventListener('click', () => {
        const pwd = document.getElementById('passwordInput').value;
        const currentUser = Auth.getCurrentUser();
        const userInDb = DB.findUserById(currentUser.id);

        if (userInDb && userInDb.password === pwd) {
            deleteClient();
        } else {
            document.getElementById('passwordError').style.display = 'block';
        }
    });
}

// --- UPDATED DELETE FUNCTION (Uses DB directly) ---
function deleteClient() {
    // 1. Check if DB exists
    if (typeof DB === 'undefined' || !DB.moveToTrash) {
        console.error("Database not initialized correctly.");
        alert("System Error: Database not ready.");
        return;
    }

    // 2. Use the DB method directly instead of TrashSystem
    const success = DB.moveToTrash('clients', currentClientId);
    
    if (success) {
        Utils.showToast('Client moved to trash', 'success');
        
        // Log activity
        if (DB.addActivity) {
            DB.addActivity({
                userId: Auth.getCurrentUser().id,
                type: 'client_trashed',
                title: 'Client Trashed',
                description: `Moved client ${currentClient.name} to trash`,
                timestamp: new Date().toISOString()
            });
        }

        // Redirect after short delay
        setTimeout(() => {
            window.location.href = 'clients.html';
        }, 1000);
    } else {
        Utils.showToast('Error moving to trash', 'error');
    }
}