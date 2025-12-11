// js/trash.js

let currentTab = 'clients'; // Default tab
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check Auth
    if (!Auth.isLoggedIn()) { 
        window.location.href = 'index.html'; 
        return; 
    }
    
    currentUser = Auth.getCurrentUser();
    console.log('🗑️ Trash Manager initialized for:', currentUser.email);

    // 2. Load Data
    loadTrashCounts();
    loadTrashItems();
});

// --- Tab Switching ---
window.switchTab = function(tabName) {
    currentTab = tabName;
    
    // Update UI Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    // Find the button that calls this function with this tab name
    const activeBtn = document.querySelector(`.tab-btn[onclick*="${tabName}"]`);
    if(activeBtn) activeBtn.classList.add('active');
    
    loadTrashItems();
}

// --- Load Counts for Badges ---
function loadTrashCounts() {
    // We use the new DB method getTrashItems for consistent counting
    const clientCount = DB.getTrashItems(currentUser.id, 'clients').length;
    const invCount = DB.getTrashItems(currentUser.id, 'invoices').length;
    const prodCount = DB.getTrashItems(currentUser.id, 'products').length;

    // Update DOM
    const badgeClients = document.getElementById('badge-clients');
    const badgeInvoices = document.getElementById('badge-invoices');
    const badgeProducts = document.getElementById('badge-products');

    if(badgeClients) badgeClients.textContent = clientCount;
    if(badgeInvoices) badgeInvoices.textContent = invCount;
    if(badgeProducts) badgeProducts.textContent = prodCount;
}

// --- Load List Items ---
function loadTrashItems() {
    const tbody = document.getElementById('trashTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';

    // FIX: Use the new DB method directly
    const items = DB.getTrashItems(currentUser.id, currentTab);

    console.log(`Found ${items.length} items in ${currentTab} trash`);

    if (items.length === 0) {
        if(tbody.parentElement) tbody.parentElement.style.display = 'none'; // Hide table
        if(emptyState) emptyState.style.display = 'block';
        return;
    }

    // Show table, hide empty state
    if(tbody.parentElement) tbody.parentElement.style.display = 'table';
    if(emptyState) emptyState.style.display = 'none';

    items.forEach(item => {
        const deletedDate = item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : 'Unknown';
        
        let details = '';
        let name = '';

        // Format data based on type
        if (currentTab === 'clients') {
            name = item.name;
            details = `<span style="color:#666"><i class="fas fa-envelope"></i> ${item.email || 'N/A'}</span>`;
        } else if (currentTab === 'invoices') {
            name = item.id;
            details = `Total: <strong>${item.total || 0}</strong> | Status: ${item.status}`;
        } else if (currentTab === 'products') {
            name = item.name;
            details = `Price: ${item.price}`;
        }

        const row = `
            <tr>
                <td><strong>${name}</strong></td>
                <td>${deletedDate}</td>
                <td style="font-size:13px;">${details}</td>
                <td style="text-align: right;">
                    <button class="btn-restore" onclick="executeRestore('${item.id}')" title="Restore">
                        <i class="fas fa-undo"></i> Restore
                    </button>
                    <button class="btn-delete-perm" onclick="executePermanentDelete('${item.id}')" title="Delete Forever">
                        <i class="fas fa-times"></i> Delete
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// --- Actions ---

window.executeRestore = function(id) {
    if (confirm('Restore this item?')) {
        const success = DB.restoreFromTrash(currentTab, id); // Uses new DB method
        if (success) {
            Utils.showToast('Item restored successfully', 'success');
            
            // Add Activity
            DB.addActivity({
                userId: currentUser.id,
                type: 'item_restored',
                title: 'Item Restored',
                description: `Restored item from ${currentTab}`,
                timestamp: new Date().toISOString()
            });

            loadTrashCounts();
            loadTrashItems();
        } else {
            Utils.showToast('Failed to restore item', 'error');
        }
    }
}

window.executePermanentDelete = function(id) {
    if (confirm('⚠️ Are you sure? This cannot be undone!')) {
        const success = DB.permanentDelete(currentTab, id); // Uses new DB method
        if (success) {
            Utils.showToast('Item permanently deleted', 'success');
            loadTrashCounts();
            loadTrashItems();
        } else {
            Utils.showToast('Failed to delete item', 'error');
        }
    }
}

window.emptyTrash = function() {
    // Safety check
    const items = DB.getTrashItems(currentUser.id, currentTab);
    if (items.length === 0) {
        Utils.showToast('Trash is already empty', 'info');
        return;
    }

    if (!confirm(`Are you sure you want to PERMANENTLY delete all ${items.length} items in ${currentTab}?`)) return;
    
    let successCount = 0;
    items.forEach(item => {
        if(DB.permanentDelete(currentTab, item.id)) successCount++;
    });
    
    if (successCount > 0) {
        Utils.showToast(`${successCount} items deleted permanently`, 'success');
        loadTrashCounts();
        loadTrashItems();
    }
}