// js/settings-complete.js

document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    setupImageHandlers();
});

// --- Tab Switching Logic ---
window.openTab = function(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // Show specific tab
    document.getElementById(tabName).classList.add('active');
    // Add active class to clicked button (hacky way for demo, better to pass 'this')
    const buttons = document.querySelectorAll('.tab-btn');
    if(tabName === 'company') buttons[0].classList.add('active');
    if(tabName === 'invoice') buttons[1].classList.add('active');
    if(tabName === 'account') buttons[2].classList.add('active');
};

// --- Data Loading ---
function loadSettings() {
    const user = Auth.getCurrentUser();
    if (!user) return; // Auth handled in app.js

    // 1. Load Company Info
    const company = user.settings?.company || {};
    document.getElementById('compName').value = company.name || '';
    document.getElementById('compWeb').value = company.web || '';
    document.getElementById('compPhone').value = company.phone || '';
    document.getElementById('compEmail').value = company.email || '';
    document.getElementById('compAddress').value = company.address || '';
    document.getElementById('compFb').value = company.facebook || '';
    document.getElementById('compWhatsapp').value = company.whatsapp || '';

    // Load Images (Logo, Extra 1, Extra 2)
    if(company.logo) setImgPreview('mainLogoPreview', company.logo);
    if(company.extra1) setImgPreview('extra1Preview', company.extra1);
    if(company.extra2) setImgPreview('extra2Preview', company.extra2);

    // 2. Load Invoice Settings
    const inv = user.settings?.invoice || {};
    document.getElementById('invBottomNote').value = inv.bottomNote || '';
    document.getElementById('invWarranty').value = inv.warranty || '';
    document.getElementById('invFinishLine').value = inv.finishLine || '';
    
    // Load Signature
    if(inv.signature) {
        document.getElementById('signaturePreview').innerHTML = `<img src="${inv.signature}" style="max-height:100%; max-width:100%;">`;
    }

    // 3. Load Account Info
    document.getElementById('accName').value = user.name || '';
    document.getElementById('accEmail').value = user.email || '';
    // Prefs
    document.getElementById('prefEmailNotif').checked = user.settings?.prefs?.emailNotif || false;
    document.getElementById('prefAutoBackup').checked = user.settings?.prefs?.autoBackup || false;
}

// --- Image Handling Helper ---
function setImgPreview(elementId, base64) {
    const el = document.getElementById(elementId);
    el.innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:contain;">`;
}

function setupImageHandlers() {
    const setupReader = (inputId, previewId, storageKey) => {
        const input = document.getElementById(inputId);
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                const base64 = evt.target.result;
                // Update Preview
                if(previewId === 'signaturePreview') {
                    document.getElementById(previewId).innerHTML = `<img src="${base64}" style="max-height:100%; max-width:100%;">`;
                } else {
                    setImgPreview(previewId, base64);
                }
                // Store temporarily in DOM dataset to save later
                input.dataset.tempBase64 = base64; 
            };
            reader.readAsDataURL(file);
        });
    };

    setupReader('mainLogoInput', 'mainLogoPreview', 'logo');
    setupReader('extra1Input', 'extra1Preview', 'extra1');
    setupReader('extra2Input', 'extra2Preview', 'extra2');
    setupReader('sigInput', 'signaturePreview', 'signature');
}

window.removeImage = function(type) {
    if(confirm('Remove this image?')) {
        if(type === 'mainLogo') {
            document.getElementById('mainLogoPreview').innerHTML = '<i class="fas fa-image"></i>';
            document.getElementById('mainLogoInput').dataset.tempBase64 = "REMOVED";
        }
        if(type === 'signature') {
            document.getElementById('signaturePreview').innerHTML = '<span style="color:#ccc">No Signature</span>';
            document.getElementById('sigInput').dataset.tempBase64 = "REMOVED";
        }
        // Add logic for extras if needed
    }
}

// --- Save Functions ---

window.saveCompanySettings = function() {
    const user = Auth.getCurrentUser();
    
    // Construct Company Object
    const companyData = {
        name: document.getElementById('compName').value,
        web: document.getElementById('compWeb').value,
        phone: document.getElementById('compPhone').value,
        email: document.getElementById('compEmail').value,
        address: document.getElementById('compAddress').value,
        facebook: document.getElementById('compFb').value,
        whatsapp: document.getElementById('compWhatsapp').value,
        // Keep existing images unless replaced
        logo: getNewOrOldImage('mainLogoInput', user.settings?.company?.logo),
        extra1: getNewOrOldImage('extra1Input', user.settings?.company?.extra1),
        extra2: getNewOrOldImage('extra2Input', user.settings?.company?.extra2),
    };

    // Deep update settings
    const updates = {
        settings: {
            ...user.settings,
            company: companyData
        }
    };

    if(Auth.updateUserProfile(updates)) {
        Utils.showToast('Company Information Saved!', 'success');
    } else {
        Utils.showToast('Failed to save.', 'error');
    }
};

window.saveInvoiceSettings = function() {
    const user = Auth.getCurrentUser();

    const invoiceData = {
        bottomNote: document.getElementById('invBottomNote').value,
        warranty: document.getElementById('invWarranty').value,
        finishLine: document.getElementById('invFinishLine').value,
        signature: getNewOrOldImage('sigInput', user.settings?.invoice?.signature)
    };

    const updates = {
        settings: {
            ...user.settings,
            invoice: invoiceData
        }
    };

    if(Auth.updateUserProfile(updates)) {
        Utils.showToast('Invoice Settings Saved!', 'success');
    } else {
        Utils.showToast('Failed to save.', 'error');
    }
};

window.saveAccountSettings = function() {
    const name = document.getElementById('accName').value;
    const email = document.getElementById('accEmail').value;
    const newPass = document.getElementById('newPass').value;
    const confPass = document.getElementById('confPass').value;

    const updates = {
        name: name,
        email: email,
        settings: {
            ...Auth.getCurrentUser().settings,
            prefs: {
                emailNotif: document.getElementById('prefEmailNotif').checked,
                autoBackup: document.getElementById('prefAutoBackup').checked
            }
        }
    };

    // Handle Password Change
    if(newPass) {
        if(newPass !== confPass) {
            Utils.showToast('Passwords do not match!', 'error');
            return;
        }
        if(newPass.length < 6) {
            Utils.showToast('Password too short!', 'error');
            return;
        }
        updates.password = newPass; // In real app, verify current password first
    }

    if(Auth.updateUserProfile(updates)) {
        Utils.showToast('Account Updated Successfully!', 'success');
        document.getElementById('userName').textContent = name; // Update sidebar immediately
        // Clear password fields
        document.getElementById('currPass').value = '';
        document.getElementById('newPass').value = '';
        document.getElementById('confPass').value = '';
    } else {
        Utils.showToast('Failed to update account.', 'error');
    }
};

// Helper to check if user uploaded new image, removed it, or kept old one
function getNewOrOldImage(inputId, oldBase64) {
    const input = document.getElementById(inputId);
    if(input.dataset.tempBase64 === "REMOVED") return null;
    return input.dataset.tempBase64 || oldBase64 || null;
}