// ===== EXPENSE TAB LOGIC =====
// Точная копия структуры Budget с добавлением полей для фактических данных

let expenseData = [];
let selectedExpenseObjectId = null;

// Типы ресурсов (копия из budget.js)
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

// Загрузка данных расходов (бюджет + фактические данные)
async function loadExpenses(objectId) {
    if (!objectId) return;
    selectedExpenseObjectId = objectId;

    try {
        const res = await fetch(`/objects/${objectId}/expenses/tree`);
        if (!res.ok) throw new Error('Failed to load');
        expenseData = await res.json();
        renderExpenseTree();
    } catch (err) {
        console.error('Error:', err);
        document.getElementById('expense-container').innerHTML = '<p style="padding:20px;text-align:center;color:#999;">Ошибка загрузки</p>';
    }
}

// Отрисовка дерева расходов
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

    // Добавить итоговую строку
    const totalBudget = expenseData.reduce((sum, s) => sum + calcStageBudget(s), 0);
    const totalActual = expenseData.reduce((sum, s) => sum + calcStageActual(s), 0);
    const totalRow = document.createElement('div');
    totalRow.className = 'budget-total-row';
    totalRow.innerHTML = `
        <span>ИТОГО:</span>
        <span>Бюджет: ${fmtNum(totalBudget)} | Факт: <span class="${totalActual > totalBudget ? 'over-budget' : ''}">${fmtNum(totalActual)}</span></span>
    `;
    container.appendChild(totalRow);
}

// Создание элемента этапа
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
            <span>Бюджет: ${fmtNum(stageBudget)}</span>
            <span class="${stageActual > stageBudget ? 'over-budget' : ''}">Факт: ${fmtNum(stageActual)}</span>
        </div>
    `;

    const workTypesContainer = document.createElement('div');
    workTypesContainer.className = 'budget-work-types-container';

    if (stage.work_types && stage.work_types.length > 0) {
        stage.work_types.forEach((wt, wtIdx) => {
            const wtEl = createExpenseWorkTypeElement(wt, stageNum, wtIdx + 1);
            workTypesContainer.appendChild(wtEl);
        });
    }

    // Collapse
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

// Создание элемента вида работ
function createExpenseWorkTypeElement(workType, stageNum, wtNum) {
    const div = document.createElement('div');
    div.className = 'budget-work-type';

    const wtBudget = calcWTBudget(workType);
    const wtActual = calcWTActual(workType);

    const header = document.createElement('div');
    header.className = 'budget-work-type-header';
    header.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
            <span class="collapse-icon">▼</span>
            <span>${workType.name} (${workType.unit})</span>
        </div>
        <div style="display:flex;gap:20px;">
            <span>Бюджет: ${fmtNum(wtBudget)}</span>
            <span class="${wtActual > wtBudget ? 'over-budget' : ''}">Факт: ${fmtNum(wtActual)}</span>
        </div>
    `;

    const resourcesContainer = document.createElement('div');
    resourcesContainer.className = 'budget-resources-container';

    // Добавить заголовок таблицы ресурсов
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
            const resEl = createExpenseResourceElement(res, stageNum, wtNum, resIdx + 1);
            resourcesContainer.appendChild(resEl);
        });
    }

    // Collapse
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

// Создание элемента ресурса с полями для фактических данных
function createExpenseResourceElement(resource, stageNum, wtNum, resNum) {
    const div = document.createElement('div');
    div.className = 'budget-resource';
    div.dataset.resourceId = resource.id;

    const budgetSum = (resource.quantity || 0) * (resource.price || 0);
    const resType = EXP_RESOURCE_TYPES[resource.resource_type] || EXP_RESOURCE_TYPES['Материал'];
    const resIcon = `<div class="res-type-icon" style="background-color: ${resType.color}" title="${resource.resource_type}">${resType.icon}</div>`;

    // Получить фактические данные (если есть)
    const expense = resource.expenses && resource.expenses.length > 0 ? resource.expenses[0] : null;
    const actualQty = expense ? expense.actual_quantity : '';
    const actualPrice = expense ? expense.actual_price : '';
    const actualSum = expense ? (expense.actual_quantity * expense.actual_price) : 0;
    const comment = expense ? expense.comment : '';

    const isOverBudget = actualSum > budgetSum && actualSum > 0;

    div.innerHTML = `
        <span class="res-num">${stageNum}.${wtNum}.${resNum}</span>
        <span class="res-photo">
            ${resource.photo ?
            `<img src="${resource.photo}" alt="Фото" class="res-photo-thumb" style="width:40px;height:40px;object-fit:cover;border-radius:4px;">` :
            `<span style="color:#ccc;">—</span>`
        }
        </span>
        <span class="res-type">${resIcon}</span>
        <span class="res-name">${resource.name}</span>
        <span class="res-unit">${resource.unit}</span>
        <span class="res-quantity">${fmtNum(resource.quantity)}</span>
        <span class="res-price">${fmtNum(resource.price)}</span>
        <span class="res-sum">${fmtNum(budgetSum)}</span>
        <span class="res-actual-qty">
            <input type="number" step="0.001" value="${actualQty}" 
                   data-res-id="${resource.id}" data-field="actual_quantity" 
                   class="expense-input" placeholder="0" style="width:80px;">
        </span>
        <span class="res-actual-price">
            <input type="number" step="0.01" value="${actualPrice}" 
                   data-res-id="${resource.id}" data-field="actual_price" 
                   class="expense-input" placeholder="0" style="width:100px;">
        </span>
        <span class="res-actual-sum ${isOverBudget ? 'over-budget' : ''}">${actualSum > 0 ? fmtNum(actualSum) : '—'}</span>
        <span class="res-receipts">
            <button class="btn-upload-receipt" data-res-id="${resource.id}" title="Загрузить чеки">📷</button>
            ${expense && (expense.receipt_photo_1 || expense.receipt_photo_2 || expense.receipt_photo_3) ?
            `<span style="color:#4CAF50;">✓</span>` : ''}
        </span>
        <span class="res-comment">
            <input type="text" value="${comment}" 
                   data-res-id="${resource.id}" data-field="comment" 
                   class="expense-input" placeholder="Комментарий" style="width:150px;">
        </span>
    `;

    // Обработчики для сохранения данных
    div.querySelectorAll('.expense-input').forEach(input => {
        input.addEventListener('change', async (e) => {
            await saveExpenseData(resource.id, e.target.dataset.field, e.target.value);
        });
    });

    return div;
}

// Сохранение фактических данных
async function saveExpenseData(resourceId, field, value) {
    try {
        // Получить текущие данные ресурса
        const resource = findResourceById(resourceId);
        if (!resource) return;

        const expense = resource.expenses && resource.expenses.length > 0 ? resource.expenses[0] : null;

        const data = {
            date: new Date().toISOString().split('T')[0],
            actual_quantity: parseFloat(document.querySelector(`input[data-res-id="${resourceId}"][data-field="actual_quantity"]`).value) || 0,
            actual_price: parseFloat(document.querySelector(`input[data-res-id="${resourceId}"][data-field="actual_price"]`).value) || 0,
            comment: document.querySelector(`input[data-res-id="${resourceId}"][data-field="comment"]`).value || ''
        };

        if (expense) {
            // Обновить существующий
            await fetch(`/expenses/${expense.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            // Создать новый
            await fetch(`/budget/resources/${resourceId}/expenses/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        // Перезагрузить данные
        await loadExpenses(selectedExpenseObjectId);
    } catch (err) {
        console.error('Save error:', err);
        alert('Ошибка сохранения');
    }
}

// Вспомогательные функции
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

function fmtNum(num) {
    if (num === null || num === undefined) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Экспорт
window.loadExpenses = loadExpenses;
