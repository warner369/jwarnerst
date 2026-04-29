(function () {
    'use strict';

    // ** Constants **************************************************
    const GST_RATE = 0.10;

    // ** State *******************************************************
    let lineItemCount = 1;

    // ** Helpers *****************************************************
    function formatCurrency(amount) {
        return '$' + amount.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    function addDays(dateStr, days) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        d.setDate(d.getDate() + parseInt(days, 10));
        return formatDate(d.toISOString().split('T')[0]);
    }

    function getLineItems() {
        const rows = document.querySelectorAll('.line-item-row');
        const items = [];

        rows.forEach((row, index) => {
            const desc = row.querySelector('.line-description')?.value || '';
            const days = parseFloat(row.querySelector('.line-days')?.value) || 0;
            const rate = parseFloat(row.querySelector('.line-rate')?.value) || 0;
            const total = days * rate;

            if (desc || days > 0) {
                items.push({
                    num: index + 1,
                    description: desc,
                    days: days,
                    rate: rate,
                    total: total
                });
            }
        });

        return items;
    }

    function calculateTotals() {
        const items = getLineItems();
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const gst = Math.round(subtotal * GST_RATE);
        const total = subtotal + gst;

        document.getElementById('subtotal-value').textContent = formatCurrency(subtotal);
        document.getElementById('gst-value').textContent = formatCurrency(gst);
        document.getElementById('total-value').textContent = formatCurrency(total);

        return { subtotal, gst, total };
    }

    // ** Line Items ****************************************************
    function addLineItem() {
        const container = document.getElementById('line-items');
        const row = document.createElement('div');
        row.className = 'line-item-row';
        row.dataset.index = lineItemCount;

        row.innerHTML = `
            <div class="line-item-fields">
                <div class="field field-description">
                    <label class="field-label">Description</label>
                    <input type="text" class="line-description" placeholder="Service description" />
                </div>
                <div class="field field-days">
                    <label class="field-label">Days</label>
                    <input type="number" class="line-days" min="0" step="0.5" placeholder="1" />
                </div>
                <div class="field field-rate">
                    <label class="field-label">Rate (AUD)</label>
                    <input type="number" class="line-rate" min="0" step="1" placeholder="1200" />
                </div>
            </div>
            <button class="btn-remove-line" type="button">remove</button>
        `;

        container.appendChild(row);
        lineItemCount++;

        // Bind events to new row
        bindLineItemEvents(row);
        updateRemoveButtons();
    }

    function removeLineItem(row) {
        if (document.querySelectorAll('.line-item-row').length <= 1) return;
        row.remove();
        updateRemoveButtons();
        renumberLineItems();
        calculateTotals();
    }

    function updateRemoveButtons() {
        const rows = document.querySelectorAll('.line-item-row');
        rows.forEach((row, index) => {
            const btn = row.querySelector('.btn-remove-line');
            if (btn) {
                btn.style.display = rows.length <= 1 ? 'none' : 'inline';
            }
        });
    }

    function renumberLineItems() {
        const rows = document.querySelectorAll('.line-item-row');
        rows.forEach((row, index) => {
            row.dataset.index = index;
        });
    }

    function bindLineItemEvents(row) {
        const daysInput = row.querySelector('.line-days');
        const rateInput = row.querySelector('.line-rate');
        const removeBtn = row.querySelector('.btn-remove-line');

        if (daysInput) {
            daysInput.addEventListener('input', calculateTotals);
        }
        if (rateInput) {
            rateInput.addEventListener('input', calculateTotals);
        }
        if (removeBtn) {
            removeBtn.addEventListener('click', () => removeLineItem(row));
        }
    }

    // ** PDF Generation ************************************************
    function generatePDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Collect form data
        const invoiceNumber = document.getElementById('invoice-number').value || 'INV-001';
        const issueDateStr = document.getElementById('issue-date').value;
        const issueDate = formatDate(issueDateStr);
        const dueDays = parseInt(document.getElementById('due-days').value, 10) || 30;
        const dueDate = addDays(issueDateStr, dueDays);
        const period = document.getElementById('period').value || '';

        // FROM details
        const fromName = document.getElementById('from-name').value || '';
        const fromAbn = document.getElementById('from-abn').value || '';
        const fromEmail = document.getElementById('from-email').value || '';
        const fromPhone = document.getElementById('from-phone').value || '';

        // BILLED TO details
        const companyName = document.getElementById('company-name').value || '';
        const streetAddress = document.getElementById('street-address').value || '';
        const suburbPostcode = document.getElementById('suburb-postcode').value || '';

        const items = getLineItems();
        const { subtotal, gst, total } = calculateTotals();

        // Get payment details from form
        const bankName = document.getElementById('bank-name').value || '';
        const accountName = document.getElementById('account-name').value || '';
        const bsb = document.getElementById('bsb').value || '';
        const accountNumber = document.getElementById('account-number').value || '';

        // Page dimensions
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let y = 20;

        // Colors
        const darkGray = '#0d1117';
        const gray = '#7d8590';
        const accent = '#00c864';

        // ** Header **
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('TAX INVOICE', margin, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(gray);
        if (fromName) {
            doc.text(fromName, margin, y);
        }
        y += 15;

        // Reset color
        doc.setTextColor(darkGray);

        // ** Invoice Number & Details **
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`INVOICE #${invoiceNumber}`, margin, y);
        y += 10;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        if (issueDate) doc.text(`Issue Date: ${issueDate}`, margin, y), y += 5;
        if (dueDate) doc.text(`Due Date: ${dueDate}`, margin, y), y += 5;
        if (period) doc.text(`Period: ${period}`, margin, y);
        y += 15;

        // ** Two columns: FROM and BILLED TO **
        const col1X = margin;
        const col2X = 110;
        const colY = y;

        // FROM column
        doc.setFontSize(8);
        doc.setTextColor(gray);
        doc.text('FROM', col1X, colY);
        doc.setTextColor(darkGray);
        if (fromName) {
            doc.setFontSize(10);
            doc.text(fromName, col1X, colY + 6);
            doc.setFontSize(9);
            let fromY = colY + 12;
            if (fromAbn) { doc.text(`ABN: ${fromAbn}`, col1X, fromY); fromY += 6; }
            if (fromEmail) { doc.text(fromEmail, col1X, fromY); fromY += 6; }
            if (fromPhone) { doc.text(fromPhone, col1X, fromY); }
        } else {
            doc.setFontSize(10);
            doc.setTextColor(darkGray);
        }

        // BILLED TO column
        doc.setFontSize(8);
        doc.setTextColor(gray);
        doc.text('BILLED TO', col2X, colY);
        doc.setTextColor(darkGray);
        doc.setFontSize(10);
        if (companyName) doc.text(companyName, col2X, colY + 6), y += 6;
        doc.setFontSize(9);
        if (streetAddress) doc.text(streetAddress, col2X, colY + 12);
        if (suburbPostcode) doc.text(suburbPostcode, col2X, colY + 18);

        y = colY + 40;

        // ** Line Items Table **
        const tableTop = y;
        const colWidths = [15, 75, 25, 30, 30]; // #, Description, Days, Rate, Total
        const rowHeight = 8;

        // Table header
        doc.setFillColor('#f5f5f5');
        doc.rect(margin, tableTop, pageWidth - (margin * 2), rowHeight, 'F');
        doc.setFontSize(8);
        doc.setTextColor(gray);
        doc.text('#', margin + 2, tableTop + 5);
        doc.text('DESCRIPTION', margin + 20, tableTop + 5);
        doc.text('DAYS', margin + 95, tableTop + 5);
        doc.text('RATE (AUD)', margin + 120, tableTop + 5);
        doc.text('TOTAL (AUD)', margin + 150, tableTop + 5);

        doc.setTextColor(darkGray);
        y = tableTop + rowHeight + 2;

        // Table rows
        doc.setFontSize(9);
        items.forEach((item, index) => {
            const rowY = y + (index * rowHeight);
            doc.text(String(item.num), margin + 2, rowY + 4);
            doc.text(item.description.substring(0, 35), margin + 20, rowY + 4);
            doc.text(String(item.days), margin + 97, rowY + 4);
            doc.text(formatCurrency(item.rate), margin + 122, rowY + 4);
            doc.text(formatCurrency(item.total), margin + 152, rowY + 4);
        });

        y += items.length * rowHeight + 10;

        // ** Totals **
        const totalsX = pageWidth - margin - 50;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Subtotal', totalsX - 30, y);
        doc.text(formatCurrency(subtotal), totalsX + 20, y);
        y += 6;

        doc.text('GST (10%)', totalsX - 30, y);
        doc.text(formatCurrency(gst), totalsX + 20, y);
        y += 6;

        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL DUE', totalsX - 30, y);
        doc.text(formatCurrency(total), totalsX + 20, y);
        y += 15;

        // ** Payment Details **
        if (bankName || accountName || bsb || accountNumber) {
            doc.setFontSize(8);
            doc.setTextColor(gray);
            doc.text('PAYMENT DETAILS', margin, y);
            y += 6;

            doc.setTextColor(darkGray);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            if (bankName) doc.text(`Bank: ${bankName}`, margin, y), y += 5;
            if (accountName) doc.text(`Account Name: ${accountName}`, margin, y), y += 5;
            if (bsb && accountNumber) doc.text(`BSB: ${bsb}  |  Account: ${accountNumber}`, margin, y), y += 10;
        }

        doc.setFontSize(8);
        doc.setTextColor(gray);
        doc.text('Please include the invoice number as the payment reference. Thank you for your prompt payment.', margin, y);

        // Download
        const filename = `Invoice_${invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        doc.save(filename);
    }

    // ** Initialize *****************************************************
    function init() {
        // Bind initial line item events
        const firstRow = document.querySelector('.line-item-row');
        if (firstRow) bindLineItemEvents(firstRow);

        // Add line button
        document.getElementById('add-line-btn').addEventListener('click', addLineItem);

        // Generate PDF button
        document.getElementById('generate-btn').addEventListener('click', generatePDF);

        // Pre-fill issue date with today's date
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        document.getElementById('issue-date').value = todayStr;

        // Pre-fill period with current month and year
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const periodStr = `${monthNames[today.getMonth()]} ${today.getFullYear()}`;
        document.getElementById('period').value = periodStr;

        // Initial calculation
        calculateTotals();
        updateRemoveButtons();
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();