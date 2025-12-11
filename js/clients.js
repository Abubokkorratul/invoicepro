// js/clients.js

class ClientsManager {
    constructor() {
        this.currentUser = Auth.getCurrentUser();
        this.clients = [];
        this.allInvoices = [];
        this.init();
    }

    init() {
        if (!this.currentUser) {
            Utils.showToast('Please login to manage clients', 'error');
            setTimeout(() => window.location.href = 'index.html', 1000);
            return;
        }
        
        console.log('👤 Clients manager initialized for:', this.currentUser.email);
        this.loadData();
        this.setupEventListeners();
    }

    loadData() {
        // 1. Load Clients (AND FILTER OUT TRASHED ITEMS)
        const rawClients = DB.getUserClients(this.currentUser.id);
        // This line hides deleted clients from the main list:
        const activeClients = rawClients.filter(c => !c.isDeleted);

        // 2. Load Invoices (to count totals)
        const db = DB.load();
        this.allInvoices = (db.invoices || []).filter(inv => inv.userId === this.currentUser.id);

        // 3. Map clients to include invoiceCount property
        this.clients = activeClients.map(client => {
            const count = this.allInvoices.filter(inv => inv.clientId === client.id).length;
            return { ...client, invoiceCount: count };
        });

        this.applyFilters();
    }

    applyFilters() {
        let filtered = [...this.clients];
        
        const invoiceFilter = document.getElementById('invoiceFilter');
        const sortFilter = document.getElementById('sortFilter');
        
        if (!invoiceFilter || !sortFilter) return;
        
        const selectedFilter = invoiceFilter.value;
        const selectedSort = sortFilter.value;
        
        // --- FILTER LOGIC ---
        if (selectedFilter === 'with_invoice') {
            filtered = filtered.filter(c => c.invoiceCount > 0);
        } else if (selectedFilter === 'no_invoice') {
            filtered = filtered.filter(c => c.invoiceCount === 0);
        }
        
        // --- SORT LOGIC ---
        filtered.sort((a, b) => {
            switch (selectedSort) {
                case 'newest': return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                case 'oldest': return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
                case 'high_invoice': return b.invoiceCount - a.invoiceCount;
                case 'low_invoice': return a.invoiceCount - b.invoiceCount;
                case 'name_asc': return (a.name || '').localeCompare(b.name || '');
                case 'name_desc': return (b.name || '').localeCompare(a.name || '');
                default: return 0;
            }
        });
        
        this.renderFilteredClients(filtered);
    }

    renderFilteredClients(filteredClients) {
        const tableBody = document.getElementById('clientsTableBody');
        const emptyState = document.getElementById('emptyStateContainer');
        
        if (!tableBody) return;

        if (filteredClients.length === 0) {
            tableBody.innerHTML = '';
            if(emptyState) emptyState.style.display = 'block';
            this.updateStats(filteredClients);
            return;
        }

        if(emptyState) emptyState.style.display = 'none';

        tableBody.innerHTML = filteredClients.map((client, index) => {
            const initials = this.getInitials(client.name);
            const createdDate = new Date(client.createdAt || Date.now()).toLocaleDateString();
            
            return `
                <tr class="client-row" data-client-id="${client.id}">
                    <td><strong>${index + 1}</strong></td>
                    <td>
                        <div class="profile-cell">
                            <div class="table-avatar">
                                ${client.image ? 
                                    `<img src="${client.image}" onerror="this.parentElement.innerHTML='${initials}'">` : 
                                    initials
                                }
                            </div>
                            <div>
                                <span class="client-name-text">${client.name}</span>
                                <span class="client-company-text">${client.company || 'Individual'}</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div><i class="fas fa-envelope fa-xs"></i> ${client.email || 'N/A'}</div>
                        <div style="font-size: 12px; color: #888; margin-top:2px;">
                            <i class="fas fa-phone fa-xs"></i> ${client.phone || 'N/A'}
                        </div>
                    </td>
                    <td style="text-align: center;">
                         <span class="inv-count-badge">${client.invoiceCount}</span>
                    </td>
                    <td style="font-size: 13px;">${createdDate}</td>
                    <td style="text-align: right;">
                        <button class="action-btn view-client" title="View"><i class="fas fa-eye"></i></button>
                        <button class="action-btn edit-client" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete delete-client" title="Move to Trash"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');

        this.attachEventListeners();
        this.updateStats(filteredClients);
    }

    updateStats(filteredClients) {
        const totalClientsEl = document.getElementById('totalClientsCount');
        if (totalClientsEl) totalClientsEl.textContent = this.clients.length;

        const totalInvoicesEl = document.getElementById('totalInvoicesCount'); 
        if (totalInvoicesEl) totalInvoicesEl.textContent = this.allInvoices.length;
    }

    attachEventListeners() {
        document.querySelectorAll('.delete-client').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const clientRow = e.target.closest('.client-row');
                const clientId = clientRow.dataset.clientId;
                const client = this.clients.find(c => c.id === clientId);
                if (client) this.showPasswordVerification(clientId, client.name);
            });
        });

        document.querySelectorAll('.view-client').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const clientRow = e.target.closest('.client-row');
                this.viewClient(clientRow.dataset.clientId);
            });
        });

        document.querySelectorAll('.edit-client').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const clientRow = e.target.closest('.client-row');
                this.editClient(clientRow.dataset.clientId);
            });
        });
    }

    getInitials(name) {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    setupEventListeners() {
        const exportBtn = document.getElementById('exportClientsBtn');
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportClients());

        const refreshBtn = document.getElementById('refreshClientsBtn');
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.refreshClients());

        const searchInput = document.getElementById('clientSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.searchClients(e.target.value));
        }

        const invoiceFilter = document.getElementById('invoiceFilter');
        const sortFilter = document.getElementById('sortFilter');
        
        if (invoiceFilter) invoiceFilter.addEventListener('change', () => this.applyFilters());
        if (sortFilter) sortFilter.addEventListener('change', () => this.applyFilters());
    }

    viewClient(clientId) {
        window.location.href = `client-detail.html?id=${clientId}`;
    }

    editClient(clientId) {
        window.location.href = `client-edit.html?id=${clientId}`;
    }

    searchClients(query) {
        if (!query.trim()) {
            this.applyFilters();
            return;
        }

        const searchTerm = query.toLowerCase();
        let filtered = [...this.clients];
        
        filtered = filtered.filter(client => {
            return (
                (client.name && client.name.toLowerCase().includes(searchTerm)) ||
                (client.email && client.email.toLowerCase().includes(searchTerm)) ||
                (client.company && client.company.toLowerCase().includes(searchTerm))
            );
        });
        
        this.renderFilteredClients(filtered);
    }

    exportClients() {
        if (this.clients.length === 0) {
            Utils.showToast('No clients to export', 'warning');
            return;
        }
        try {
            const headers = ['#', 'Name', 'Email', 'Phone', 'Company', 'Invoices', 'Created At'];
            const csvRows = [headers.join(',')];
            
            this.clients.forEach((client, index) => {
                const row = [
                    index + 1,
                    `"${client.name || ''}"`,
                    `"${client.email || ''}"`,
                    `"${client.phone || ''}"`,
                    `"${client.company || ''}"`,
                    client.invoiceCount,
                    new Date(client.createdAt).toLocaleDateString()
                ];
                csvRows.push(row.join(','));
            });
            
            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const link = document.createElement('a');
            link.download = `clients_export_${new Date().toISOString().split('T')[0]}.csv`;
            link.href = URL.createObjectURL(blob);
            link.click();
            
            Utils.showToast('Export successful!', 'success');
        } catch (error) {
            console.error('Export failed', error);
            Utils.showToast('Export failed', 'error');
        }
    }

    refreshClients() {
        const btn = document.getElementById('refreshClientsBtn');
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        setTimeout(() => {
            this.loadData();
            btn.innerHTML = originalContent;
            Utils.showToast('Client list refreshed', 'success');
        }, 500);
    }

    showPasswordVerification(clientId, clientName) {
        const modalHTML = `
            <div class="password-modal" id="passwordModal">
                <div class="password-modal-content">
                    <div class="password-modal-header">
                        <h3><i class="fas fa-lock"></i> Verify Deletion</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="password-modal-body">
                        <p>To move <strong>${clientName}</strong> to Trash, enter your password:</p>
                        <div class="password-input-group">
                            <input type="password" id="passwordInput" placeholder="Enter password">
                        </div>
                        <div class="password-error" id="passwordError" style="display:none; color:red; margin-top:5px; font-size:12px;">Incorrect password</div>
                    </div>
                    <div class="password-modal-footer">
                        <button class="btn btn-outline" id="cancelBtn">Cancel</button>
                        <button class="btn btn-danger" id="confirmBtn">Move to Trash</button>
                    </div>
                </div>
            </div>
        `;
        
        const existing = document.getElementById('passwordModal');
        if(existing) existing.remove();
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modal = document.getElementById('passwordModal');
        setTimeout(() => modal.classList.add('active'), 10);

        const closeModal = () => modal.remove();
        
        modal.querySelector('.close-btn').onclick = closeModal;
        document.getElementById('cancelBtn').onclick = closeModal;
        
        document.getElementById('confirmBtn').onclick = () => {
            const pwd = document.getElementById('passwordInput').value;
            const currentUser = Auth.getCurrentUser();
            const userInDb = DB.findUserById(currentUser.id);

            if(userInDb && userInDb.password === pwd) {
                this.deleteClient(clientId);
                closeModal();
            } else {
                document.getElementById('passwordError').style.display = 'block';
            }
        };
    }

deleteClient(clientId) {
        // Use DB.moveToTrash instead of splicing or TrashSystem
        const success = DB.moveToTrash('clients', clientId);
        
        if (success) {
            Utils.showToast('Client moved to trash', 'success');
            
            // Log Activity
            DB.addActivity({
                userId: this.currentUser.id,
                type: 'client_trashed',
                title: 'Client Trashed',
                description: 'Moved client to trash',
                timestamp: new Date().toISOString()
            });

            this.loadData(); // Refresh the list to hide the deleted item
        } else {
            Utils.showToast('Error moving to trash', 'error');
        }
    }
}

// Styles for Modal (re-injected to ensure existence)
const style = document.createElement('style');
style.innerHTML = `
    .password-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; opacity: 0; transition: opacity 0.3s; pointer-events: none; }
    .password-modal.active { opacity: 1; pointer-events: all; }
    .password-modal-content { background: white; padding: 20px; border-radius: 8px; width: 350px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
    .password-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .password-modal-footer { margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px; }
    .password-input-group input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
    .close-btn { background: none; border: none; font-size: 20px; cursor: pointer; }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
    window.clientsManager = new ClientsManager();
});