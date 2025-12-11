// ==================== ENHANCED EXPORT WITH OPTIONS ====================


function showExportOptionsModal(currentUser) {
    // Get all products
    let allProducts = [];
    
    if (DB && DB.getUserProducts) {
        allProducts = DB.getUserProducts(currentUser.id);
    } else {
        const db = DB.load();
        if (db && db.products) {
            allProducts = db.products.filter(p => p.userId === currentUser.id);
        }
    }
    
    if (allProducts.length === 0) {
        Utils.showToast('No products to export', 'warning');
        return;
    }
    
    // Store filtered products in a variable accessible to event handlers
    let currentFilteredProducts = [...allProducts];
    
    // Function to update filtered products based on checkboxes
    function updateFilteredProducts() {
        const includeDrafts = $('#includeDrafts').is(':checked');
        const includeInactive = $('#includeInactive').is(':checked');
        
        currentFilteredProducts = [...allProducts];
        
        if (!includeDrafts) {
            currentFilteredProducts = currentFilteredProducts.filter(p => p.status !== 'draft');
        }
        if (!includeInactive) {
            currentFilteredProducts = currentFilteredProducts.filter(p => p.status === 'active');
        }
        
        // Update the count display
        $('#exportProductCount').text(currentFilteredProducts.length);
    }
    
    const modalHTML = `
        <div class="modal active" id="exportOptionsModal">
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3><i class="fas fa-file-export"></i> Export Products</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="export-stats">
                        <p>Total products in database: <strong>${allProducts.length}</strong></p>
                        <p>Products to export: <strong id="exportProductCount">${allProducts.length}</strong></p>
                    </div>
                    
                    <p>Export in different formats:</p>
                    
                    <div class="export-options">
                        <div class="export-option" data-format="csv">
                            <div class="export-icon">
                                <i class="fas fa-file-csv"></i>
                            </div>
                            <div class="export-info">
                                <h4>CSV Format</h4>
                                <p>Compatible with Excel, Google Sheets</p>
                            </div>
                        </div>
                        
                        <div class="export-option" data-format="excel">
                            <div class="export-icon">
                                <i class="fas fa-file-excel"></i>
                            </div>
                            <div class="export-info">
                                <h4>Excel Format</h4>
                                <p>Microsoft Excel (.xlsx)</p>
                            </div>
                        </div>
                        
                        <div class="export-option" data-format="pdf">
                            <div class="export-icon">
                                <i class="fas fa-file-pdf"></i>
                            </div>
                            <div class="export-info">
                                <h4>PDF Report</h4>
                                <p>Printable report with statistics</p>
                            </div>
                        </div>
                        
                        <div class="export-option" data-format="json">
                            <div class="export-icon">
                                <i class="fas fa-code"></i>
                            </div>
                            <div class="export-info">
                                <h4>JSON Data</h4>
                                <p>Raw data for backup</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Column Selection Section -->
                    <div class="export-column-selection">
                        <h4><i class="fas fa-columns"></i> Select Columns to Export</h4>
                        <div class="export-actions">
                            <button type="button" class="btn btn-sm btn-outline" id="selectAllColumns">Select All</button>
                            <button type="button" class="btn btn-sm btn-outline" id="deselectAllColumns">Deselect All</button>
                        </div>
                        <div class="columns-selection">
                            <div class="columns-grid">
                                <label class="column-checkbox">
                                    <input type="checkbox" name="exportColumn" value="name" checked>
                                    <span>Product Name</span>
                                </label>
                                <label class="column-checkbox">
                                    <input type="checkbox" name="exportColumn" value="sku" checked>
                                    <span>SKU Code</span>
                                </label>
                                <label class="column-checkbox">
                                    <input type="checkbox" name="exportColumn" value="category" checked>
                                    <span>Category</span>
                                </label>
                                <label class="column-checkbox">
                                    <input type="checkbox" name="exportColumn" value="type">
                                    <span>Product Type</span>
                                </label>
                                <label class="column-checkbox">
                                    <input type="checkbox" name="exportColumn" value="price" checked>
                                    <span>Price</span>
                                </label>
                                <label class="column-checkbox">
                                    <input type="checkbox" name="exportColumn" value="cost">
                                    <span>Cost Price</span>
                                </label>
                                <label class="column-checkbox">
                                    <input type="checkbox" name="exportColumn" value="stock" checked>
                                    <span>Stock Quantity</span>
                                </label>
                                <label class="column-checkbox">
                                    <input type="checkbox" name="exportColumn" value="unit">
                                    <span>Unit Type</span>
                                </label>
                                <label class="column-checkbox">
                                    <input type="checkbox" name="exportColumn" value="lowStockAlert">
                                    <span>Low Stock Alert</span>
                                </label>
                                <label class="column-checkbox">
                                    <input type="checkbox" name="exportColumn" value="status" checked>
                                    <span>Status</span>
                                </label>
                                <label class="column-checkbox">
                                    <input type="checkbox" name="exportColumn" value="description">
                                    <span>Description</span>
                                </label>
                                <label class="column-checkbox">
                                    <input type="checkbox" name="exportColumn" value="createdAt">
                                    <span>Created Date</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="export-advanced">
                        <h4 style="margin-bottom: 10px;">Filter Options:</h4>
                        <label class="checkbox">
                            <input type="checkbox" id="includeDrafts" checked>
                            <span>Include draft products</span>
                        </label>
                        <label class="checkbox">
                            <input type="checkbox" id="includeInactive" checked>
                            <span>Include inactive products</span>
                        </label>
                        
                        <h4 style="margin-top: 15px; margin-bottom: 10px;">Export Settings:</h4>
                        <label class="checkbox">
                            <input type="checkbox" id="includeHeaders" checked>
                            <span>Include column headers</span>
                        </label>
                        <label class="checkbox">
                            <input type="checkbox" id="formatCurrency" checked>
                            <span>Format currency values</span>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="cancelExport">Cancel</button>
                    <button class="btn btn-success" id="confirmExport" disabled>
                        <i class="fas fa-download"></i> Export Selected Format
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    $('body').append(modalHTML);
    
    // Setup event listeners
    $('.export-option').on('click', function() {
        $('.export-option').removeClass('selected');
        $(this).addClass('selected');
        $('#confirmExport').prop('disabled', false);
    });
    
    // Column selection buttons
    $('#selectAllColumns').on('click', function() {
        $('input[name="exportColumn"]').prop('checked', true);
    });
    
    $('#deselectAllColumns').on('click', function() {
        $('input[name="exportColumn"]').prop('checked', false);
    });
    
    // Update filtered products when filter checkboxes change
    $('#includeDrafts, #includeInactive').on('change', function() {
        updateFilteredProducts();
    });
    
    $('#confirmExport').on('click', function() {
        const selectedFormat = $('.export-option.selected').data('format');
        const includeHeaders = $('#includeHeaders').is(':checked');
        const formatCurrency = $('#formatCurrency').is(':checked');
        
        // Get selected columns
        const selectedColumns = [];
        $('input[name="exportColumn"]:checked').each(function() {
            selectedColumns.push($(this).val());
        });
        
        if (selectedColumns.length === 0) {
            Utils.showToast('Please select at least one column to export', 'warning');
            return;
        }
        
        if (currentFilteredProducts.length === 0) {
            Utils.showToast('No products match your filter criteria', 'warning');
            return;
        }
        
        console.log('Exporting:', currentFilteredProducts.length, 'products');
        console.log('Selected columns:', selectedColumns);
        console.log('Format:', selectedFormat);
        
        // Export based on format with selected columns
        switch(selectedFormat) {
            case 'csv':
                exportToCSV(currentFilteredProducts, selectedColumns, { includeHeaders, formatCurrency });
                break;
            case 'excel':
                exportToExcel(currentFilteredProducts, selectedColumns, { includeHeaders, formatCurrency });
                break;
            case 'pdf':
                exportToPDFReport(currentFilteredProducts, currentUser, selectedColumns);
                break;
            case 'json':
                exportToJSON(currentFilteredProducts, selectedColumns);
                break;
            default:
                Utils.showToast('Please select an export format', 'warning');
                return;
        }
        
        $('#exportOptionsModal').remove();
        Utils.showToast(`Exported ${currentFilteredProducts.length} products as ${selectedFormat.toUpperCase()}`, 'success');
    });
    
    $('#cancelExport, #exportOptionsModal .modal-close').on('click', function() {
        $('#exportOptionsModal').remove();
    });
    
    // Select CSV by default
    $('.export-option[data-format="csv"]').click();
    
    // Initialize filtered products
    updateFilteredProducts();
}







function exportToCSV(products, selectedColumns, options = {}) {
    const { includeHeaders = true, formatCurrency = true } = options;
    
    try {
        // Map column names to display names
        const columnMap = {
            'name': 'Product Name',
            'sku': 'SKU Code',
            'category': 'Category',
            'type': 'Product Type',
            'price': 'Price',
            'cost': 'Cost',
            'stock': 'Stock',
            'unit': 'Unit',
            'lowStockAlert': 'Low Stock Alert',
            'status': 'Status',
            'description': 'Description',
            'createdAt': 'Created Date'
        };
        
        const csvRows = [];
        
        // Add headers if enabled
        if (includeHeaders) {
            const headers = selectedColumns.map(col => columnMap[col] || col);
            csvRows.push(headers.join(','));
        }
        
        // Add data rows
        products.forEach(product => {
            const row = selectedColumns.map(col => {
                let value = '';
                
                // Get value based on column
                if (col === 'name') value = product.name || '';
                else if (col === 'sku') value = product.SKU || '';
                else if (col === 'category') value = product.category || '';
                else if (col === 'type') value = product.type || '';
                else if (col === 'price') value = formatCurrency ? Utils.formatCurrency(product.price || 0) : (product.price || 0);
                else if (col === 'cost') value = formatCurrency ? Utils.formatCurrency(product.cost || 0) : (product.cost || 0);
                else if (col === 'stock') value = product.stock || '';
                else if (col === 'unit') value = product.unit || '';
                else if (col === 'lowStockAlert') value = product.lowStockAlert || '';
                else if (col === 'status') value = product.status || '';
                else if (col === 'description') value = product.description || '';
                else if (col === 'createdAt') value = product.createdAt || '';
                else value = product[col] || '';
                
                // Escape quotes and wrap in quotes
                const escapedValue = String(value).replace(/"/g, '""');
                return `"${escapedValue}"`;
            });
            csvRows.push(row.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return true;
        
    } catch (error) {
        console.error('Error exporting CSV:', error);
        Utils.showToast('Error exporting to CSV', 'error');
        return false;
    }
}

function exportToExcel(products, selectedColumns, options = {}) {
    const { includeHeaders = true, formatCurrency = true } = options;
    
    try {
        // Map column names to display names
        const columnMap = {
            'name': 'Product Name',
            'sku': 'SKU Code',
            'category': 'Category',
            'type': 'Product Type',
            'price': 'Price',
            'cost': 'Cost',
            'stock': 'Stock',
            'unit': 'Unit',
            'lowStockAlert': 'Low Stock Alert',
            'status': 'Status',
            'description': 'Description',
            'createdAt': 'Created Date'
        };
        
        // Create HTML table for Excel
        let html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" 
                  xmlns:x="urn:schemas-microsoft-com:office:excel" 
                  xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8">
                <!--[if gte mso 9]>
                <xml>
                    <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                                <x:Name>Products</x:Name>
                                <x:WorksheetOptions>
                                    <x:DisplayGridlines/>
                                </x:WorksheetOptions>
                            </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                    </x:ExcelWorkbook>
                </xml>
                <![endif]-->
                <style>
                    table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
                    th { background: #2c3e50; color: white; padding: 8px; text-align: left; font-weight: bold; }
                    td { padding: 6px 8px; border: 1px solid #ddd; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                </style>
            </head>
            <body>
                <h1>Products Export</h1>
                <p>Generated: ${new Date().toLocaleString()}</p>
                <p>Total Products: ${products.length}</p>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
        `;
        
        // Add headers for selected columns
        selectedColumns.forEach(col => {
            html += `<th>${columnMap[col] || col}</th>`;
        });
        
        html += `
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        // Add data rows
        products.forEach((product, index) => {
            html += '<tr>';
            html += `<td>${index + 1}</td>`;
            
            selectedColumns.forEach(col => {
                let value = '';
                
                // Get value based on column
                if (col === 'name') value = product.name || '';
                else if (col === 'sku') value = product.SKU || '';
                else if (col === 'category') value = product.category || '';
                else if (col === 'type') value = product.type || '';
                else if (col === 'price') value = formatCurrency ? Utils.formatCurrency(product.price || 0) : (product.price || 0);
                else if (col === 'cost') value = formatCurrency ? Utils.formatCurrency(product.cost || 0) : (product.cost || 0);
                else if (col === 'stock') value = product.stock || '';
                else if (col === 'unit') value = product.unit || '';
                else if (col === 'lowStockAlert') value = product.lowStockAlert || '';
                else if (col === 'status') value = product.status || '';
                else if (col === 'description') value = product.description || '';
                else if (col === 'createdAt') value = product.createdAt ? new Date(product.createdAt).toLocaleDateString() : '';
                else value = product[col] || '';
                
                const isNumeric = ['price', 'cost', 'stock', 'lowStockAlert'].includes(col);
                html += `<td ${isNumeric ? 'class="text-right"' : ''}>${value}</td>`;
            });
            
            html += '</tr>';
        });
        
        html += `
                    </tbody>
                </table>
            </body>
            </html>
        `;
        
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `products_${new Date().toISOString().split('T')[0]}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return true;
        
    } catch (error) {
        console.error('Error exporting Excel:', error);
        Utils.showToast('Error exporting to Excel', 'error');
        return false;
    }
}

function exportToPDFReport(products, currentUser, selectedColumns) {
    try {
        // Use the existing print report with filtered products
        // Create a custom print report function that uses filtered products
        generateCustomPrintReport(products, currentUser, selectedColumns);
    } catch (error) {
        console.error('Error exporting PDF:', error);
        Utils.showToast('Error exporting to PDF', 'error');
    }
}

function generateCustomPrintReport(products, currentUser, selectedColumns) {
    try {
        if (products.length === 0) {
            Utils.showToast('No products to print', 'warning');
            return;
        }
        
        // Calculate statistics
        const stats = calculateProductStatistics(products);
        
        // Generate the print HTML with selected columns
        const printHTML = createPrintHTMLWithColumns(products, stats, currentUser, selectedColumns);
        
        // Open print window
        openPrintWindow(printHTML);
        
    } catch (error) {
        console.error('❌ Error generating print report:', error);
        Utils.showToast('Error generating print report', 'error');
    }
}

function createPrintHTMLWithColumns(products, stats, currentUser, selectedColumns) {
    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Map column names to display names
    const columnMap = {
        'name': 'Product Name',
        'sku': 'SKU',
        'category': 'Category',
        'type': 'Type',
        'price': 'Price',
        'cost': 'Cost',
        'stock': 'Stock',
        'unit': 'Unit',
        'lowStockAlert': 'Low Stock Alert',
        'status': 'Status',
        'description': 'Description',
        'createdAt': 'Created On'
    };
    
    // Filter selected columns to include only valid ones
    const validColumns = selectedColumns.filter(col => columnMap[col]);
    
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Products Report - InvoicePro</title>
            <style>
                ${getPrintStyles()}
            </style>
        </head>
        <body>
            <div class="print-container">
                <div class="print-header">
                    <h1><i class="fas fa-box"></i> Products Report</h1>
                    <div class="company-info">
                        <strong>InvoicePro</strong> | Generated on: ${currentDate}
                    </div>
                    <div class="company-info">
                        User: ${currentUser.name || currentUser.email} | Products: ${products.length}
                    </div>
                </div>
                
                <h3 style="margin-top: 30px; margin-bottom: 15px;">
                    <i class="fas fa-list"></i> Product Details (${products.length} items)
                </h3>
                
                <table class="print-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            ${validColumns.map(col => `<th>${columnMap[col]}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map((product, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                ${validColumns.map(col => {
                                    let value = '';
                                    if (col === 'name') value = product.name || '';
                                    else if (col === 'sku') value = product.SKU || '';
                                    else if (col === 'category') value = product.category || 'Uncategorized';
                                    else if (col === 'type') value = product.type || 'physical';
                                    else if (col === 'price') value = Utils.formatCurrency(product.price || 0);
                                    else if (col === 'cost') value = Utils.formatCurrency(product.cost || 0);
                                    else if (col === 'stock') value = product.stock || 0;
                                    else if (col === 'unit') value = product.unit || 'pcs';
                                    else if (col === 'lowStockAlert') value = product.lowStockAlert || 0;
                                    else if (col === 'status') value = product.status || 'active';
                                    else if (col === 'description') value = product.description || '';
                                    else if (col === 'createdAt') value = product.createdAt ? new Date(product.createdAt).toLocaleDateString() : '';
                                    return `<td>${value}</td>`;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="print-footer">
                    <div style="text-align: center; color: #999;">
                        <hr style="border: none; border-top: 1px solid #ddd; margin: 10px 0;">
                        <div>Generated by InvoicePro • ${currentDate} • Page 1 of 1</div>
                    </div>
                </div>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        window.close();
                    }, 1000);
                };
            </script>
        </body>
        </html>
    `;
}

function exportToJSON(products, selectedColumns) {
    try {
        const data = {
            meta: {
                exportDate: new Date().toISOString(),
                format: 'JSON',
                columns: selectedColumns,
                totalRecords: products.length
            },
            products: products.map(product => {
                const filteredProduct = {};
                selectedColumns.forEach(col => {
                    // Map column names to actual product properties
                    if (col === 'sku') filteredProduct[col] = product.SKU || '';
                    else if (col === 'lowStockAlert') filteredProduct[col] = product.lowStockAlert || '';
                    else if (col === 'createdAt') filteredProduct[col] = product.createdAt || '';
                    else filteredProduct[col] = product[col] || '';
                });
                return filteredProduct;
            })
        };
        
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `products_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return true;
        
    } catch (error) {
        console.error('Error exporting JSON:', error);
        Utils.showToast('Error exporting to JSON', 'error');
        return false;
    }
}