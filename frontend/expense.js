// ===== EXPENSE TAB LOGIC =====

let expenseData = [];
let selectedExpenseObjectId = null;

const EXP_RESOURCE_TYPES = {
    'Трудоресурсы': { color: '#9C27B0', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>' },
    'Материал': { color: '#8BC34A', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/></svg>' },
    'Доставка': { color: '#2196F3', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm1.5-9H17V12h4.46L19.5 9.5zM6 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zM20 8l3 4v5h-2c0 1.66-1.34 3-3 3s-3-1.34-3-3H9c0 1.66-1.34 3-3 3s-3-1.34-3-3H1V6c0-1.1.9-2 2-2h14v4h3zM3 6v9h.76c.55-.61 1.35-1 2.24-1 .89 0 1.69.39 2.24 1H15V6H3z"/></svg>' },
    'Оборудование': { color: '#673AB7', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"/></svg>' },
    'Мебель': { color: '#00BCD4', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V7H1v10h22V7h-2v6h-2z"/><path d="M19 10h-2v3h2v-3z"/></svg>' },
    'Инструменты': { color: '#4CAF50', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>' },
    'Коммуналка': { color: '#E91E63', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3zm0 2.84L18 11v8h-2v-6H8v6H6v-8l6-5.16z"/></svg>' },
    'Документация': { color: '#FF9800', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>' },
    'Расходные материалы': { color: '#FFEB3B', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>' }
};

async function loadExpenses(objectId) {
    if (!objectId) return;
    selectedExpenseObjectId = objectId;

    try {
        const res = await fetch(`/objects/${objectId}/expenses/tree`);
        if (!res.ok) throw new Error('Failed');
        expenseData = await res.json();
        renderExpenseTree();
    } catch (err) {
        console.error('Error:', err);
        document.getElementById('expense-container').innerHTML = '<p style="padding:20px;text-align:center;color:#999;">Ошибка загрузки</p>';
    }
}

function renderExpenseTree() {
    const container = document.getElementById('expense-container');
    if (!container) return;

    if (!expenseData || expenseData.length === 0) {
        container.innerHTML = '<p style="padding:20px;text-align:center;color:#999;">Нет данных. Добавьте ресурсы в Бюджет.</p>';
        return;
    }

    container.innerHTML = '';

    expenseData.forEach((stage, idx) => {
        const stageEl = createExpenseStageElement(stage, idx + 1);
        container.appendChild(stageEl);
    });

    const totalBudget = expenseData.reduce((sum, s) => sum + calcStageBudget(s), 0);
    const totalActual = expenseData.reduce((sum, s) => sum + calcStageActual(s), 0);
    const totalRow = document.createElement('div');
    totalRow.className = 'budget-total-row';
    totalRow.innerHTML = `
        <span>ИТОГО:</span>
        <span>Бюджет: ${fmt(totalBudget)} | Факт: <span class="${totalActual > totalBudget ? 'over-budget' : ''}">${fmt(totalActual)}</span></span>
    `;
    container.appendChild(totalRow);
}

function createExpenseStageElement(stage, stageNum) {
    const div = document.createElement('div');
    div.className = 'budget-stage';

    const stageBudget = calcStageBudget(stage);
    const stageActual = calcStageActual(stage);

    const header = document.createElement('div');
    header.className = 'budget-stage-header';
    header.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
            <span class="collapse-icon">▼</span>
            <strong>${stage.name}</strong>
        </div>
        <div style="display:flex;gap:20px;">
            <span>Бюджет: ${fmt(stageBudget)}</span>
            <span class="${stageActual > stageBudget ? 'over-budget' : ''}">Факт: ${fmt(stageActual)}</span>
        </div>
    `;

    const workTypesContainer = document.createElement('div');
    workTypesContainer.className = 'budget-work-types-container';

    if (stage.work_types && stage.work_types.length > 0) {
        stage.work_types.forEach((wt, wtIdx) => {
            const wtEl = createExpenseWorkTypeElement(wt, wtIdx + 1);
            workTypesContainer.appendChild(wtEl);
        });
    }

    header.querySelector('.collapse-icon').addEventListener('click', (e) => {
        e.stopPropagation();
        const isCollapsed = workTypesContainer.style.display === 'none';
        workTypesContainer.style.display = isCollapsed ? '' : 'none';
        e.target.textContent = isCollapsed ? '▼' : '▶';
    });

    div.appendChild(header);
    div.appendChild(workTypesContainer);
    return div;
}

function createExpenseWorkTypeElement(workType, wtNum) {
    const div = document.createElement('div');
    div.className = 'budget-work-type';

    const wtBudget = calcWTBudget(workType);
    const wtActual = calcWTActual(workType);

    const header = document.createElement('div');
    header.className = 'budget-work-type-header';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
            <span class="collapse-icon">▼</span>
            <span>${workType.name} (${workType.unit})</span>
        </div>
        <div style="display:flex;gap:20px;">
            <span>Бюджет: ${fmt(wtBudget)}</span>
            <span class="${wtActual > wtBudget ? 'over-budget' : ''}">Факт: ${fmt(wtActual)}</span>
        </div>
    `;

    const resourcesContainer = document.createElement('div');
    resourcesContainer.className = 'budget-resources-container';

    const resHeader = document.createElement('div');
    resHeader.className = 'budget-resource-header';
    resHeader.innerHTML = `
        <span>№</span>
        <span>Фото</span>
        <span>Тип</span>
        <span>Название</span>
        <span>Ед.изм</span>
        <span>Кол-во (план)</span>
        <span>Цена (план)</span>
        <span>Сумма (план)</span>
        <span>Кол-во (факт)</span>
        <span>Цена (факт)</span>
        <span>Сумма (факт)</span>
        <span>Чеки</span>
        <span>Комментарий</span>
    `;
    resourcesContainer.appendChild(resHeader);

    if (workType.resources && workType.resources.length > 0) {
        workType.resources.forEach((res, resIdx) => {
            const resEl = createExpenseResourceElement(res, wtNum, resIdx + 1);
            resourcesContainer.appendChild(resEl);
        });
    }

    header.querySelector('.collapse-icon').addEventListener('click', (e) => {
        e.stopPropagation();
        const isCollapsed = resourcesContainer.style.display === 'none';
        resourcesContainer.style.display = isCollapsed ? '' : 'none';
        e.target.textContent = isCollapsed ? '▼' : '▶';
    });

    div.appendChild(header);
    div.appendChild(resourcesContainer);
    return div;
}

function createExpenseResourceElement(resource, wtNum, resNum) {
    const div = document.createElement('div');
    div.className = 'budget-resource';
    div.dataset.resourceId = resource.id;

    const budgetSum = (resource.quantity || 0) * (resource.price || 0);
    const resType = EXP_RESOURCE_TYPES[resource.resource_type] || EXP_RESOURCE_TYPES['Материал'];
    const resIcon = `<div class="res-type-icon" style="background-color: ${resType.color}" title="${resource.resource_type}">${resType.icon}</div>`;

    const expense = resource.expenses && resource.expenses.length > 0 ? resource.expenses[0] : null;
    const actualQty = expense ? expense.actual_quantity : '';
    const actualPrice = expense ? expense.actual_price : '';
    const actualSum = expense ? (expense.actual_quantity * expense.actual_price) : 0;
    const comment = expense ? (expense.comment || '') : '';

    const isOverBudget = actualSum > budgetSum && actualSum > 0;

    div.innerHTML = `
        <span class="res-num">${wtNum}.${resNum}</span>
        <span class="res-photo">
            ${resource.photo ? `<img src="${resource.photo}" alt="Фото" class="res-photo-thumb">` : '<span style="color:#ccc;">—</span>'}
        </span>
        <span class="res-type">${resIcon}</span>
        <span class="res-name">${resource.name}</span>
        <span class="res-unit">${resource.unit}</span>
        <span class="res-quantity">${fmt(resource.quantity)}</span>
        <span class="res-price">${fmt(resource.price)}</span>
        <span class="res-sum">${fmt(budgetSum)}</span>
        <span class="res-actual-qty">
            <input type="number" step="0.001" value="${actualQty}" data-res-id="${resource.id}" data-field="actual_quantity" class="expense-input" placeholder="0">
        </span>
        <span class="res-actual-price">
            <input type="number" step="0.01" value="${actualPrice}" data-res-id="${resource.id}" data-field="actual_price" class="expense-input" placeholder="0">
        </span>
        <span class="res-actual-sum ${isOverBudget ? 'over-budget' : ''}">${actualSum > 0 ? fmt(actualSum) : '—'}</span>
        <span class="res-receipts">
            <input type="file" accept="image/*" data-res-id="${resource.id}" data-receipt="1" class="receipt-input" style="display:none;">
            <input type="file" accept="image/*" data-res-id="${resource.id}" data-receipt="2" class="receipt-input" style="display:none;">
            <input type="file" accept="image/*" data-res-id="${resource.id}" data-receipt="3" class="receipt-input" style="display:none;">
            <div class="receipt-boxes">
                <div class="receipt-box" data-receipt="1" data-res-id="${resource.id}">
                    ${expense && expense.receipt_photo_1 ? `<img src="${expense.receipt_photo_1}" alt="Чек 1">` : '📷'}
                </div>
                <div class="receipt-box" data-receipt="2" data-res-id="${resource.id}">
                    ${expense && expense.receipt_photo_2 ? `<img src="${expense.receipt_photo_2}" alt="Чек 2">` : '📷'}
                </div>
                <div class="receipt-box" data-receipt="3" data-res-id="${resource.id}">
                    ${expense && expense.receipt_photo_3 ? `<img src="${expense.receipt_photo_3}" alt="Чек 3">` : '📷'}
                </div>
            </div>
        </span>
        <span class="res-comment">
            <input type="text" value="${comment}" data-res-id="${resource.id}" data-field="comment" class="expense-input" placeholder="Комментарий">
        </span>
    `;

    div.querySelectorAll('.expense-input').forEach(input => {
        input.addEventListener('blur', async () => {
            await saveExpenseData(resource.id);
        });
    });

    div.querySelectorAll('.receipt-box').forEach(box => {
        box.addEventListener('click', () => {
            const receiptNum = box.dataset.receipt;
            const resId = box.dataset.resId;
            const fileInput = div.querySelector(`input[data-res-id="${resId}"][data-receipt="${receiptNum}"]`);
            fileInput.click();
        });
    });

    div.querySelectorAll('.receipt-input').forEach(input => {
        input.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files[0]) {
                await uploadReceipt(resource.id, e.target.dataset.receipt, e.target.files[0]);
            }
        });
    });

    return div;
}

async function saveExpenseData(resourceId) {
    try {
        const resource = findResourceById(resourceId);
        if (!resource) return;

        const qtyInput = document.querySelector(`input[data-res-id="${resourceId}"][data-field="actual_quantity"]`);
        const priceInput = document.querySelector(`input[data-res-id="${resourceId}"][data-field="actual_price"]`);
        const commentInput = document.querySelector(`input[data-res-id="${resourceId}"][data-field="comment"]`);

        const qty = parseFloat(qtyInput.value);
        const price = parseFloat(priceInput.value);
        const comment = commentInput.value;

        if (!qty && !price) return;

        const expense = resource.expenses && resource.expenses.length > 0 ? resource.expenses[0] : null;

        const data = {
            date: new Date().toISOString().split('T')[0],
            actual_quantity: qty || 0,
            actual_price: price || 0,
            comment: comment || ''
        };

        let response;
        if (expense) {
            response = await fetch(`/expenses/${expense.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch(`/budget/resources/${resourceId}/expenses/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        if (!response.ok) throw new Error('Save failed');

        await loadExpenses(selectedExpenseObjectId);
    } catch (err) {
        console.error('Save error:', err);
        alert('Ошибка сохранения: ' + err.message);
    }
}

async function uploadReceipt(resourceId, receiptNum, file) {
    try {
        const resource = findResourceById(resourceId);
        if (!resource) return;

        const expense = resource.expenses && resource.expenses.length > 0 ? resource.expenses[0] : null;
        if (!expense) {
            alert('Сначала введите количество и цену');
            return;
        }

        const formData = new FormData();
        formData.append(`receipt_${receiptNum}`, file);

        const response = await fetch(`/expenses/${expense.id}/receipt/${receiptNum}`, {
            method: 'PUT',
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');

        await loadExpenses(selectedExpenseObjectId);
    } catch (err) {
        console.error('Upload error:', err);
        alert('Ошибка загрузки чека');
    }
}

function calcStageBudget(stage) {
    if (!stage.work_types) return 0;
    return stage.work_types.reduce((sum, wt) => sum + calcWTBudget(wt), 0);
}

function calcStageActual(stage) {
    if (!stage.work_types) return 0;
    return stage.work_types.reduce((sum, wt) => sum + calcWTActual(wt), 0);
}

function calcWTBudget(wt) {
    if (!wt.resources) return 0;
    return wt.resources.reduce((sum, r) => sum + ((r.quantity || 0) * (r.price || 0)), 0);
}

function calcWTActual(wt) {
    if (!wt.resources) return 0;
    return wt.resources.reduce((sum, r) => {
        if (!r.expenses || r.expenses.length === 0) return sum;
        const exp = r.expenses[0];
        return sum + (exp.actual_quantity * exp.actual_price);
    }, 0);
}

function findResourceById(id) {
    for (const stage of expenseData) {
        if (!stage.work_types) continue;
        for (const wt of stage.work_types) {
            if (!wt.resources) continue;
            const res = wt.resources.find(r => r.id === id);
            if (res) return res;
        }
    }
    return null;
}

function fmt(num) {
    if (num === null || num === undefined) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

window.loadExpenses = loadExpenses;
