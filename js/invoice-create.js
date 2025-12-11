// js/invoice-create.js

document.addEventListener('DOMContentLoaded', function() {
    initInvoicePage();
});

let _products = [];
let _clients = [];
let _settings = {};

function initInvoicePage() {
    // 1. Check Auth
    if (!Auth.isLoggedIn()) { window.location.href = 'index.html'; return; }

    // 2. Load Data
    loadSettingsData();
    loadDatabaseData();

    // 3. Set Defaults
    document.getElementById('invDate').valueAsDate = new Date();
    // Set Due Date to +7 days by default
    const due = new Date(); due.setDate(due.getDate() + 7);
    document.getElementById('invDueDate').valueAsDate = due;
    generateInvoiceNumber();

    // 4. Setup Listeners
    setupClientSearch();
    setupProductSearch();
}

// --- Data Loading ---
function loadSettingsData() {
    const user = Auth.getCurrentUser();
    _settings = user.settings || {};

    // Populate Company Info from Settings
    const comp = _settings.company || {};
    const html = `
        <strong>${comp.name || 'Company Name'}</strong>
        ${comp.address ? `<div>${comp.address}</div>` : ''}
        <div>${comp.phone ? comp.phone : ''} ${comp.email ? ' | ' + comp.email : ''}</div>
    `;
    document.getElementById('companyInfoDisplay').innerHTML = html;

    // Populate Warranty & Footer from Settings
    const invSettings = _settings.invoice || {};
    document.getElementById('invWarrantyMsg').value = invSettings.warranty || '';
    document.getElementById('invFinishLine').value = invSettings.finishLine || '';
}

function loadDatabaseData() {
    const db = DB.load();
    _products = db.products || [];
    _clients = db.clients || [];
}

function generateInvoiceNumber() {
    const db = DB.load();
    const count = (db.invoices || []).length + 1;
    // Format: INV-YYYY-001
    const year = new Date().getFullYear();
    const num = String(count).padStart(4, '0');
    document.getElementById('invNumber').value = `INV-${year}-${num}`;
}

// --- Smart Search: Clients ---
function setupClientSearch() {
    const input = document.getElementById('clientSearch');
    const dropdown = document.getElementById('clientDropdown');
    const detailsDiv = document.getElementById('clientInputs');

    input.addEventListener('input', function() {
        const val = this.value.toLowerCase();
        dropdown.innerHTML = '';
        
        // Show details box immediately for manual entry capability
        detailsDiv.classList.add('active');
        // Clear ID if typing fresh
        document.getElementById('clId').value = ''; 

        if (val.length < 1) { dropdown.style.display = 'none'; return; }

        const matches = _clients.filter(c => c.name.toLowerCase().includes(val) || c.phone.includes(val));
        
        if (matches.length > 0) {
            dropdown.style.display = 'block';
            matches.forEach(c => {
                const div = document.createElement('div');
                div.className = 'search-item';
                div.innerHTML = `<span>${c.name}</span> <small class="text-muted">${c.phone || ''}</small>`;
                div.onclick = () => selectClient(c);
                dropdown.appendChild(div);
            });
        } else {
            dropdown.style.display = 'none';
        }
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.client-search-wrapper')) dropdown.style.display = 'none';
    });
}

function selectClient(client) {
    document.getElementById('clientSearch').value = client.name;
    document.getElementById('clId').value = client.id;
    document.getElementById('clPhone').value = client.phone || '';
    document.getElementById('clEmail').value = client.email || '';
    document.getElementById('clAddress').value = client.address || '';
    document.getElementById('clientDropdown').style.display = 'none';
    document.getElementById('clientInputs').classList.add('active');
}

// --- Smart Search: Products ---
function setupProductSearch() {
    const input = document.getElementById('prodSearch');
    const dropdown = document.getElementById('prodDropdown');

    input.addEventListener('input', function() {
        const val = this.value.toLowerCase();
        dropdown.innerHTML = '';
        if (val.length < 1) { dropdown.style.display = 'none'; return; }

        const matches = _products.filter(p => p.name.toLowerCase().includes(val));
        
        if (matches.length > 0) {
            dropdown.style.display = 'block';
            matches.forEach(p => {
                const div = document.createElement('div');
                div.className = 'search-item';
                div.innerHTML = `
                    <span>${p.name}</span> 
                    <span>
                        <span class="badge">${p.warranty || 'No Warranty'}</span>
                        <strong>${p.price}</strong>
                    </span>`;
                div.onclick = () => {
                    addProductRow(p);
                    input.value = '';
                    dropdown.style.display = 'none';
                };
                dropdown.appendChild(div);
            });
        } else {
            // Option to add as new manual item immediately
            dropdown.style.display = 'block';
            dropdown.innerHTML = `<div class="search-item" onclick="addManualRow('${this.value}')"><i class="fas fa-plus"></i> &nbsp; Add "${this.value}" as new item</div>`;
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.product-search-row')) dropdown.style.display = 'none';
    });
}

// --- Table Logic ---
function addProductRow(product) {
    const tbody = document.getElementById('itemsBody');
    const row = document.createElement('tr');
    
    // Fallback values if adding empty row
    const p = product || { name: '', warranty: '', price: 0 };
    const nameVal = typeof product === 'string' ? product : p.name; // Handle manual string input

    row.innerHTML = `
        <td><input type="text" class="i-name" value="${nameVal}" placeholder="Description"></td>
        <td><input type="text" class="i-warranty" value="${p.warranty || ''}" placeholder="e.g. 1 Year"></td>
        <td><input type="number" class="i-qty num-input" value="1" min="1" oninput="calculateTotals()"></td>
        <td><input type="number" class="i-price num-input" value="${p.price || 0}" oninput="calculateTotals()"></td>
        <td style="text-align:right; padding-top:14px;"><span class="i-total">0.00</span></td>
        <td style="text-align:center;"><button type="button" class="btn-remove-row" onclick="removeRow(this)"><i class="fas fa-times"></i></button></td>
    `;
    tbody.appendChild(row);
    calculateTotals();
}

function addManualRow(text = '') {
    addProductRow(text);
    document.getElementById('prodSearch').value = '';
    document.getElementById('prodDropdown').style.display = 'none';
}

window.removeRow = function(btn) {
    btn.closest('tr').remove();
    calculateTotals();
}

// --- Calculations ---
window.calculateTotals = function() {
    let subtotal = 0;
    const rows = document.querySelectorAll('#itemsBody tr');

    rows.forEach(row => {
        const qty = parseFloat(row.querySelector('.i-qty').value) || 0;
        const price = parseFloat(row.querySelector('.i-price').value) || 0;
        const total = qty * price;
        row.querySelector('.i-total').innerText = total.toFixed(2);
        subtotal += total;
    });

    const discount = parseFloat(document.getElementById('valDiscount').value) || 0;
    const total = subtotal - discount; // Tax is 0 based on request

    document.getElementById('valSubtotal').innerText = subtotal.toFixed(2);
    document.getElementById('valTotal').innerText = total.toFixed(2);
    
    document.getElementById('amountWords').innerText = numberToWords(total);
}

// --- Number to Words (Simple implementation) ---
function numberToWords(amount) {
    if (amount === 0) return "Zero Taka Only";
    // Simplified logic for demo. Ideally use a library like number-to-words
    return `Total Amount: ${amount.toLocaleString('en-BD')} Taka`; 
}

// --- Save & Create ---
window.saveInvoice = function(type) {
    const rows = document.querySelectorAll('#itemsBody tr');
    if(rows.length === 0) { alert("Please add at least one item."); return; }

    // 1. Handle Client (Auto-Add if new)
    const clientName = document.getElementById('clientSearch').value;
    if(!clientName) { alert("Client Name is required"); return; }

    const db = DB.load();
    let clientId = document.getElementById('clId').value;

    // Check if we need to save a new client
    if (!clientId) {
        const newClient = {
            id: 'cli_' + Date.now(),
            name: clientName,
            phone: document.getElementById('clPhone').value,
            email: document.getElementById('clEmail').value,
            address: document.getElementById('clAddress').value,
            created: new Date().toISOString()
        };
        db.clients = db.clients || [];
        db.clients.push(newClient);
        clientId = newClient.id;
        // Update local cache
        _clients.push(newClient);
    }

    // 2. Build Invoice Object
    const invoice = {
        id: document.getElementById('invNumber').value,
        date: document.getElementById('invDate').value,
        dueDate: document.getElementById('invDueDate').value,
        clientId: clientId,
        clientName: clientName, // Denormalize for easier access
        clientData: { // Snapshot of client info at time of invoice
            phone: document.getElementById('clPhone').value,
            address: document.getElementById('clAddress').value
        },
        items: [],
        totals: {
            subtotal: document.getElementById('valSubtotal').innerText,
            discount: document.getElementById('valDiscount').value,
            grandTotal: document.getElementById('valTotal').innerText
        },
        notes: document.getElementById('invNotes').value,
        warrantyMsg: document.getElementById('invWarrantyMsg').value,
        finishLine: document.getElementById('invFinishLine').value,
        status: (type === 'Draft') ? 'Draft' : document.getElementById('invStatus').value
    };

    // 3. Get Items
    rows.forEach(row => {
        invoice.items.push({
            name: row.querySelector('.i-name').value,
            warranty: row.querySelector('.i-warranty').value,
            qty: row.querySelector('.i-qty').value,
            price: row.querySelector('.i-price').value,
            total: row.querySelector('.i-total').innerText
        });
    });

    // 4. Save to DB
    db.invoices = db.invoices || [];
    db.invoices.push(invoice);
    DB.save(db);

    Utils.showToast(`${type === 'Draft' ? 'Draft Saved' : 'Invoice Created'} Successfully!`, 'success');
    
    // Redirect after slight delay
    setTimeout(() => {
        window.location.href = 'invoices.html'; 
    }, 1000);
}

window.previewInvoice = function() {
    alert("Preview functionality usually opens a printable PDF view. In this static demo, assume the data is ready!");
}