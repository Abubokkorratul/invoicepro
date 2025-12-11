// js/client-details.js

let currentClient = null;
let clientInvoices = [];

document.addEventListener('DOMContentLoaded', function() {
    initClientDetails();
});

function initClientDetails() {
    // 1. Get ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('id');

    if (!clientId) {
        alert("No Client ID specified.");
        window.location.href = 'clients.html';
        return;
    }

    // 2. Load Data
    const db = DB.load();
    currentClient = db.clients.find(c => c.id === clientId);
    
    if (!currentClient) {
        alert("Client not found.");
        window.location.href = 'clients.html';
        return;
    }

    // 3. Find Invoices
    clientInvoices = (db.invoices || []).filter(inv => inv.clientId === clientId);

    // 4. Render Page
    renderProfile(currentClient);
    renderStats(clientInvoices, currentClient.currency || 'BDT');
    renderInvoiceTable(clientInvoices);
    
    // 5. Generate QR Code
    if(typeof generateQRCode === 'function') generateQRCode();
}

function renderProfile(client) {
    // Avatar Logic
    const avatarEl = document.getElementById('clientAvatar');
    if (client.image) {
        avatarEl.innerHTML = `<img src="${client.image}" alt="Avatar">`;
        avatarEl.style.border = "4px solid #fff";
    } else {
        const initials = client.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
        avatarEl.innerText = initials || '??';
    }

    // Standard Fields
    document.getElementById('clientName').innerText = client.name;
    document.getElementById('clientCompany').innerText = client.companyName || 'Individual';
    document.getElementById('clientEmail').innerText = client.email || 'No Email';
    document.getElementById('clientPhone').innerText = client.phone || 'No Phone';
    document.getElementById('clientAddr').innerText = client.address || 'No Address';
    document.getElementById('clientCurrency').innerText = client.currency || 'BDT';
    
    // Note Field (Ensure your HTML has an element with id="clientNote" to see this on screen)
    const noteEl = document.getElementById('clientNote');
    if (noteEl) {
        noteEl.innerText = client.note || 'No notes available.';
    }
    
    document.getElementById('clientSince').innerText = new Date(client.createdAt).toLocaleDateString();
    document.getElementById('clientUpdated').innerText = new Date(client.updatedAt).toLocaleDateString();

    document.getElementById('clientIdCode').innerText = client.barcode || client.id;
    document.getElementById('editLink').href = `client-edit.html?id=${client.id}`;
}

function renderStats(invoices, currency) {
    let total = 0, paid = 0, pending = 0;
    invoices.forEach(inv => {
        const amt = parseFloat(inv.totals?.grandTotal || inv.total || 0);
        total += amt;
        if (inv.status === 'Paid' || inv.status === 'paid') paid += amt;
        else pending += amt;
    });

    document.getElementById('statTotalInv').innerText = invoices.length;
    document.getElementById('statPaid').innerText = Utils.formatCurrency(paid) + (currency !== 'BDT' ? ' ' + currency : '');
    document.getElementById('statPending').innerText = Utils.formatCurrency(pending) + (currency !== 'BDT' ? ' ' + currency : '');
}

function renderInvoiceTable(invoices) {
    const tbody = document.getElementById('invoiceListBody');
    tbody.innerHTML = '';

    if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No Invoices Found</td></tr>';
        return;
    }

    invoices.forEach(inv => {
        const amt = parseFloat(inv.totals?.grandTotal || inv.total || 0);
        const statusClass = `status-${(inv.status || 'draft').toLowerCase()}`;
        
        const row = `
            <tr>
                <td><strong>${inv.id}</strong></td>
                <td>${Utils.formatDate(inv.date)}</td>
                <td>${Utils.formatDate(inv.dueDate)}</td>
                <td>${Utils.formatCurrency(amt)}</td>
                <td><span class="status-badge ${statusClass}">${inv.status || 'Draft'}</span></td>
                <td style="text-align: right;">
                    <button class="btn btn-outline btn-sm" onclick="alert('Print functionality linked to invoice view')" title="Print/Download"><i class="fas fa-print"></i></button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function generateQRCode() {
    const qrContainer = document.getElementById('clientQrCode');
    if(!qrContainer) return;
    qrContainer.innerHTML = ""; 
    const urlToEncode = window.location.href;
    try {
        new QRCode(qrContainer, {
            text: urlToEncode,
            width: 80, height: 80,
            colorDark : "#000000", colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.M
        });
    } catch(e) { console.log("QR Library not loaded"); }
}

window.filterInvoices = function(status) {
    if (status === 'all') {
        renderInvoiceTable(clientInvoices);
    } else {
        const filtered = clientInvoices.filter(inv => (inv.status || '').toLowerCase() === status);
        renderInvoiceTable(filtered);
    }
}

// ============================================================
// ==================== EXPORT FUNCTIONALITY ==================
// ============================================================

window.openExportModal = function() {
    showClientExportModal();
}

let currentFilteredInvoices = [];

function showClientExportModal() {
    if (clientInvoices.length === 0) {
        Utils.showToast('No invoices to export', 'warning');
        return;
    }
    
    currentFilteredInvoices = [...clientInvoices];
    
    // Remove existing modal
    const existingModal = document.getElementById('exportOptionsModal');
    if (existingModal) existingModal.remove();

    const modalHTML = `
        <div class="modal active" id="exportOptionsModal" style="display: flex;">
            <div class="modal-content modal-lg" style="max-width: 800px; width: 90%;">
                <div class="modal-header">
                    <h3><i class="fas fa-file-export"></i> Export Client Data</h3>
                    <button class="modal-close" onclick="closeExportModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="export-stats" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between;">
                        <div>Client: <strong>${currentClient.name}</strong></div>
                        <div>Invoices: <strong id="exportCount" style="color: var(--primary-color);">${clientInvoices.length}</strong></div>
                    </div>
                    
                    <div class="export-layout" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                        <div class="export-left-col">
                            <h4 style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">1. Select Format</h4>
                            <div class="export-options" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                                <div class="export-option selected" data-format="pdf" onclick="selectExportFormat(this, 'pdf')">
                                    <i class="fas fa-print" style="color: #e74c3c;"></i> <span>Print / PDF</span>
                                </div>
                                <div class="export-option" data-format="csv" onclick="selectExportFormat(this, 'csv')">
                                    <i class="fas fa-file-csv" style="color: #2ecc71;"></i> <span>CSV</span>
                                </div>
                                <div class="export-option" data-format="excel" onclick="selectExportFormat(this, 'excel')">
                                    <i class="fas fa-file-excel" style="color: #27ae60;"></i> <span>Excel</span>
                                </div>
                                <div class="export-option" data-format="json" onclick="selectExportFormat(this, 'json')">
                                    <i class="fas fa-code" style="color: #f39c12;"></i> <span>JSON</span>
                                </div>
                            </div>
                            
                            <h4 style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">2. Filter Invoices</h4>
                            <div class="filter-options">
                                <label class="checkbox-container">
                                    <input type="checkbox" id="incPaid" checked onchange="updateExportFilters()"> <span>Include Paid</span>
                                </label>
                                <label class="checkbox-container">
                                    <input type="checkbox" id="incPending" checked onchange="updateExportFilters()"> <span>Include Pending</span>
                                </label>
                                <label class="checkbox-container">
                                    <input type="checkbox" id="incOverdue" checked onchange="updateExportFilters()"> <span>Include Overdue</span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="export-right-col">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                                <h4 style="margin: 0;">3. Select Data Points</h4>
                                <div class="column-actions">
                                    <button type="button" class="btn btn-sm btn-link" onclick="toggleAllColumns(true)">All</button> |
                                    <button type="button" class="btn btn-sm btn-link" onclick="toggleAllColumns(false)">None</button>
                                </div>
                            </div>
                            <div class="columns-grid" style="display: grid; gap: 8px;">
                                <label class="column-checkbox"><input type="checkbox" name="exCol" value="id" checked> <span>Invoice Number</span></label>
                                <label class="column-checkbox"><input type="checkbox" name="exCol" value="date" checked> <span>Date</span></label>
                                <label class="column-checkbox"><input type="checkbox" name="exCol" value="dueDate" checked> <span>Due Date</span></label>
                                <label class="column-checkbox"><input type="checkbox" name="exCol" value="total" checked> <span>Amount</span></label>
                                <label class="column-checkbox"><input type="checkbox" name="exCol" value="status" checked> <span>Status</span></label>
                                <label class="column-checkbox"><input type="checkbox" name="exCol" value="notes"> <span>Notes</span></label>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="closeExportModal()">Cancel</button>
                    <button class="btn btn-success" id="confirmExportBtn" onclick="executeExport()">
                        <i class="fas fa-download"></i> Generate
                    </button>
                </div>
            </div>
        </div>
        <style>
            .export-option { padding: 10px; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px; text-align: center; }
            .export-option:hover { background: #f8f9fa; }
            .export-option.selected { border-color: var(--primary-color); background: rgba(67, 97, 238, 0.05); }
            .checkbox-container { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; cursor: pointer; }
            .column-checkbox { display: flex; align-items: center; gap: 10px; padding: 5px; border-radius: 4px; cursor: pointer; }
            .column-checkbox:hover { background: #f8f9fa; }
        </style>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

window.closeExportModal = function() {
    const modal = document.getElementById('exportOptionsModal');
    if (modal) modal.remove();
}

window.selectExportFormat = function(el, format) {
    document.querySelectorAll('.export-option').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    el.dataset.format = format;
}

window.toggleAllColumns = function(checked) {
    document.querySelectorAll('input[name="exCol"]').forEach(cb => cb.checked = checked);
}

window.updateExportFilters = function() {
    const incPaid = document.getElementById('incPaid').checked;
    const incPending = document.getElementById('incPending').checked;
    const incOverdue = document.getElementById('incOverdue').checked;

    currentFilteredInvoices = clientInvoices.filter(inv => {
        const st = (inv.status || 'draft').toLowerCase();
        if (st === 'paid' && !incPaid) return false;
        if ((st === 'pending' || st === 'draft') && !incPending) return false;
        if (st === 'overdue' && !incOverdue) return false;
        return true;
    });

    document.getElementById('exportCount').innerText = currentFilteredInvoices.length;
}

window.executeExport = function() {
    const format = document.querySelector('.export-option.selected').dataset.format;
    const columns = [];
    document.querySelectorAll('input[name="exCol"]:checked').forEach(cb => columns.push(cb.value));

    if(columns.length === 0) { alert("Select at least one column."); return; }
    if(currentFilteredInvoices.length === 0) { alert("No invoices match filter."); return; }

    if(format === 'pdf') {
        generateSmartPDF(currentFilteredInvoices, columns);
    } else if (format === 'csv') {
        generateCSV(currentFilteredInvoices, columns);
    } else if (format === 'excel') {
        generateExcel(currentFilteredInvoices, columns);
    } else if (format === 'json') {
        generateJSON(currentFilteredInvoices, columns);
    }
    
    closeExportModal();
    Utils.showToast("Export generated successfully!", "success");
}

// --- Generators ---

function generateCSV(data, cols) {
    const header = cols.map(c => c.toUpperCase()).join(",");
    const rows = data.map(inv => {
        return cols.map(c => {
            let val = getInvoiceVal(inv, c);
            return `"${val}"`;
        }).join(",");
    });
    
    const csv = [header, ...rows].join("\n");
    downloadFile(csv, `${currentClient.name}_statement.csv`, 'text/csv');
}

function generateExcel(data, cols) {
    let html = `<table><thead><tr>${cols.map(c => `<th>${c.toUpperCase()}</th>`).join('')}</tr></thead><tbody>`;
    data.forEach(inv => {
        html += `<tr>${cols.map(c => `<td>${getInvoiceVal(inv,c)}</td>`).join('')}</tr>`;
    });
    html += `</tbody></table>`;
    downloadFile(html, `${currentClient.name}_statement.xls`, 'application/vnd.ms-excel');
}

function generateJSON(data, cols) {
    const cleanData = data.map(inv => {
        let obj = {};
        cols.forEach(c => obj[c] = getInvoiceVal(inv, c));
        return obj;
    });
    downloadFile(JSON.stringify(cleanData, null, 2), `${currentClient.name}_data.json`, 'application/json');
}


// =======================================================
// ========= BLACK & WHITE A4 SMART PDF ==================
// =======================================================

function generateSmartPDF(data, cols) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("PDF Library not loaded.");
        return;
    }

    const { jsPDF } = window.jspdf;
    
    // SETUP: A4 Paper
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    // --- LAYOUT CONFIG ---
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10; 
    const contentWidth = pageWidth - (margin * 2);

    // --- COLOR THEME (STRICTLY BLACK/GRAY) ---
    const theme = {
        primary: [0, 0, 0],         // Pure Black for Titles/Headers
        secondary: [60, 60, 60],    // Dark Gray for Table Headers
        textDark: [0, 0, 0],        // Black Text
        textGray: [80, 80, 80],     // Gray Text for labels
        bgLight: [250, 250, 250],   // Very Light Gray bg
        border: [200, 200, 200]     // Borders
    };

    // --- DATA ---
    const user = (typeof Auth !== 'undefined' && Auth.getCurrentUser()) ? Auth.getCurrentUser() : {};
    const company = (user.settings && user.settings.company) ? user.settings.company : {
        name: "MIND ART LTD.", 
        address: "44/42, Morhum Tomij uddin khan Len, Matuail School Road, Jatrabari Dhaka-1362",
        phone: "+8801927770373",
        email: "storeness458@gmail.com",
        logo: "" 
    };

    // Helper: Wrapped Text
    function writeWrappedText(text, x, y, maxWidth, fontSize = 9, color = theme.textDark, fontStyle = 'normal') {
        if (!text) return y;
        doc.setFont("helvetica", fontStyle);
        doc.setFontSize(fontSize);
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return y + (lines.length * (fontSize / 2.5)) + 1; 
    }

    // ==========================================
    // 1. HEADER SECTION
    // ==========================================
    let cursorY = 15; 
    let headerTextStartX = margin;

    // Logo
    if (company.logo) {
        try {
            const logoSize = 22;
            doc.addImage(company.logo, 'JPEG', margin, cursorY, logoSize, logoSize);
            headerTextStartX += (logoSize + 5); 
        } catch (e) { }
    }

    // Company Info
    const maxHeaderW = (contentWidth / 2) - 10; 
    let leftColY = cursorY + 5;

    leftColY = writeWrappedText(company.name, headerTextStartX, leftColY, maxHeaderW, 14, theme.textDark, 'bold');
    leftColY += 2; 
    leftColY = writeWrappedText(company.address, headerTextStartX, leftColY, maxHeaderW, 9, theme.textGray, 'normal');
    
    const contactStr = [company.phone, company.email].filter(Boolean).join(" | ");
    leftColY = writeWrappedText(contactStr, headerTextStartX, leftColY, maxHeaderW, 9, theme.textGray, 'normal');

    // Report Title (SMALLER & BLACK)
    doc.setFont("helvetica", 'bold');
    doc.setFontSize(16); // Reduced size
    doc.setTextColor(...theme.primary);
    doc.text("ACCOUNT STATEMENT", pageWidth - margin, cursorY + 8, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont("helvetica", 'normal');
    doc.setTextColor(...theme.textDark);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, cursorY + 15, { align: 'right' });
    doc.text(`Total Invoices: ${data.length || 0}`, pageWidth - margin, cursorY + 20, { align: 'right' });

    cursorY = Math.max(leftColY, cursorY + 24) + 6;

    doc.setDrawColor(...theme.border);
    doc.setLineWidth(0.5);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 8;

    // ==========================================
    // 2. CLIENT INFO BOX
    // ==========================================
    const boxStart = cursorY;
    const midPoint = pageWidth / 2;
    let clientY = boxStart + 8;
    const leftColMaxW = (contentWidth / 2) - 10;

    // Headers in Black
    doc.setFontSize(8); doc.setTextColor(...theme.primary); doc.setFont("helvetica", 'bold');
    doc.text("BILL TO:", margin + 5, clientY);
    clientY += 5;

    clientY = writeWrappedText(currentClient.name, margin + 5, clientY, leftColMaxW, 11, theme.textDark, 'bold');
    clientY = writeWrappedText(currentClient.companyName, margin + 5, clientY, leftColMaxW, 10, theme.textGray, 'normal');
    
    doc.setFontSize(9); doc.setTextColor(...theme.textGray);
    doc.text(`ID: ${currentClient.barcode || currentClient.id}`, margin + 5, clientY + 5);
    doc.text(`Joined: ${new Date(currentClient.createdAt).toLocaleDateString()}`, margin + 5, clientY + 10); // Added Joined Date

    // Right Column
    let contactY = boxStart + 8;
    const col2X = midPoint + 5; 
    
    doc.setFontSize(8); doc.setTextColor(...theme.primary); doc.setFont("helvetica", 'bold');
    doc.text("CONTACT DETAILS:", col2X, contactY);
    contactY += 6;

    // --- ADDED NOTE HERE ---
    const contactLabels = [
        { l: "Phone:", v: currentClient.phone },
        { l: "Email:", v: currentClient.email },
        { l: "Address:", v: currentClient.address },
        { l: "Note:", v: currentClient.note } // Note included
    ];

    contactLabels.forEach(item => {
        if(item.v) {
            doc.setFontSize(9); doc.setFont("helvetica", 'bold'); doc.setTextColor(...theme.secondary);
            doc.text(item.l, col2X, contactY);
            
            const valX = col2X + 18; 
            const valMaxW = (contentWidth / 2) - 25;
            const valY = writeWrappedText(item.v, valX, contactY, valMaxW, 9, theme.textGray, 'normal');
            contactY = Math.max(contactY + 5, valY + 1); 
        }
    });

    const boxHeight = Math.max(clientY + 10, contactY) - boxStart + 6; 

    doc.setDrawColor(...theme.border);
    doc.setFillColor(...theme.bgLight);
    doc.roundedRect(margin, boxStart, contentWidth, boxHeight, 1, 1, 'S'); 
    doc.line(midPoint, boxStart + 5, midPoint, boxStart + boxHeight - 5);

    cursorY = boxStart + boxHeight + 10;

    // ==========================================
    // 3. TABLE (CENTERED AMOUNT)
    // ==========================================
    const tableHeaders = cols.map(c => {
        const map = { id: 'INVOICE #', date: 'DATE', dueDate: 'DUE DATE', total: 'AMOUNT', status: 'STATUS' };
        return map[c] || c.toUpperCase();
    });

    const tableBody = data.map(inv => cols.map(c => getInvoiceVal(inv, c)));

    doc.autoTable({
        startY: cursorY,
        margin: { left: margin, right: margin },
        head: [tableHeaders],
        body: tableBody,
        theme: 'grid',
        headStyles: {
            fillColor: theme.secondary, // Dark Gray Header
            textColor: 255,
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 4
        },
        bodyStyles: {
            textColor: theme.textDark,
            fontSize: 9,
            cellPadding: 4,
            valign: 'middle'
        },
        columnStyles: {
            0: { fontStyle: 'bold' },
            // CHANGED: halign: 'center' for Amount
            [cols.indexOf('total')]: { halign: 'center', fontStyle: 'bold' }, 
            [cols.indexOf('status')]: { halign: 'center' }
        },
        alternateRowStyles: { fillColor: [252, 252, 252] },
        
        // Footer
        didDrawPage: function (data) {
            const footerY = pageHeight - 10;
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.setFont("helvetica", 'italic');
            doc.text("This is a computer generated report. Signature is not required.", pageWidth / 2, footerY - 5, { align: 'center' });
            
            doc.setFont("helvetica", 'bold');
            doc.setTextColor(50); // Darker credit
            doc.text("all credit goes to 23108003@uap-bd.edu", pageWidth / 2, footerY, { align: 'center' });
            
            doc.setFont("helvetica", 'normal');
            doc.setTextColor(100);
            doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, footerY, { align: 'right' });
        }
    });

    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
}

// Clean Helper Function
function getInvoiceVal(inv, col) {
    if(col === 'id') return inv.id;
    if(col === 'date') return Utils.formatDate(inv.date); 
    if(col === 'dueDate') return Utils.formatDate(inv.dueDate);
    if(col === 'total') return Utils.formatCurrency(inv.totals?.grandTotal || inv.total || 0);
    if(col === 'status') return (inv.status || 'draft').toUpperCase();
    if(col === 'notes') return inv.notes || '';
    return inv[col] || '';
}

function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}