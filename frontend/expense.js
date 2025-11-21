// ===== EXPENSE TAB LOGIC =====
// Mirrors budget structure, adds actual expense data

let expenseData = []; // Budget tree with expense data
let selectedExpenseObjectId = null;

// Load expenses (budget tree with expense data)
async function loadExpenses(objectId) {
    if (!objectId) return;
    selectedExpenseObjectId = objectId;

    try {
        const res = await fetch(`/objects/${objectId}/expenses/tree`);
        if (!res.ok) throw new Error('Failed to load expenses');
        expenseData = await res.json();
        renderExpenseTree();
    } catch (err) {
        console.error('Error loading expenses:', err);
        document.getElementById('expense-container').innerHTML = '<p>Ошибка загрузки данных</p>';
    }
}

// Render expense tree (mirrors budget structure)
function renderExpenseTree() {
    const container = document.getElementById('expense-container');
    if (!container) return;

    if (!expenseData || expenseData.length === 0) {
        container.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">Нет данных. Добавьте ресурсы в Бюджет.</p>';
        return;
    }

    container.innerHTML = '';

    expenseData.forEach(stage => {
        const stageEl = createExpenseStageElement(stage);
        container.appendChild(stageEl);
    });
}

// Create stage element
function createExpenseStageElement(stage) {
    const div = document.createElement('div');
    div.className = 'budget-stage';
    div.dataset.stageId = stage.id;

    const stageBudget = calculateStageBudget(stage);
    const stageActual = calculateStageActual(stage);
    const isOverBudget = stageActual > stageBudget;

    const header = document.createElement('div');
    header.className = 'budget-stage-header';
    header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span class="collapse-icon">▼</span>
            <strong>${stage.name}</strong>
        </div>
        <div style="display: flex; gap: 20px; align-items: center;">
            <span style="color: #666;">Бюджет: ${formatNumber(stageBudget)}</span>
            <span class="${isOverBudget ? 'over-budget' : ''}" style="font-weight: 600;">
                Факт: ${formatNumber(stageActual)}
            </span>
        </div>
    `;

    const workTypesContainer = document.createElement('div');
    workTypesContainer.className = 'budget-work-types-container';

    if (stage.work_types && stage.work_types.length > 0) {
        stage.work_types.forEach(wt => {
            const wtEl = createExpenseWorkTypeElement(wt);
            workTypesContainer.appendChild(wtEl);
        });
    }

    // Collapse toggle
    header.querySelector('.collapse-icon').addEventListener('click', (e) => {
        e.stopPropagation();
        const icon = e.target;
        const isCollapsed = workTypesContainer.style.display === 'none';

        if (isCollapsed) {
            workTypesContainer.style.display = '';
            icon.textContent = '▼';
        } else {
            workTypesContainer.style.display = 'none';
            icon.textContent = '▶';
        }
    });

    div.appendChild(header);
    div.appendChild(workTypesContainer);

    return div;
}

// Create work type element
function createExpenseWorkTypeElement(workType) {
    const div = document.createElement('div');
    div.className = 'budget-work-type';
    div.dataset.workTypeId = workType.id;

    const wtBudget = calculateWorkTypeBudget(workType);
    const wtActual = calculateWorkTypeActual(workType);
    const isOverBudget = wtActual > wtBudget;

    const header = document.createElement('div');
    header.className = 'budget-work-type-header';
    header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span class="collapse-icon">▼</span>
            <span>${workType.name}</span>
        </div>
        <div style="display: flex; gap: 20px; align-items: center;">
            <span style="color: #666;">Бюджет: ${formatNumber(wtBudget)}</span>
            <span class="${isOverBudget ? 'over-budget' : ''}" style="font-weight: 600;">
                Факт: ${formatNumber(wtActual)}
            </span>
        </div>
    `;

    const resourcesContainer = document.createElement('div');
    resourcesContainer.className = 'budget-resources-container';

    if (workType.resources && workType.resources.length > 0) {
        workType.resources.forEach(res => {
            const resEl = createExpenseResourceElement(res);
            resourcesContainer.appendChild(resEl);
        });
    }

    // Collapse toggle
    header.querySelector('.collapse-icon').addEventListener('click', (e) => {
        e.stopPropagation();
        const icon = e.target;
        const isCollapsed = resourcesContainer.style.display === 'none';

        if (isCollapsed) {
            resourcesContainer.style.display = '';
            icon.textContent = '▼';
        } else {
            resourcesContainer.style.display = 'none';
            icon.textContent = '▶';
        }
    });

    div.appendChild(header);
    div.appendChild(resourcesContainer);

    return div;
}

// Create resource element with expense data
function createExpenseResourceElement(resource) {
    const div = document.createElement('div');
    div.className = 'budget-resource';
    div.dataset.resourceId = resource.id;

    const budgetAmount = (resource.quantity || 0) * (resource.price || 0);
    const actualAmount = calculateResourceActual(resource);
    const isOverBudget = actualAmount > budgetAmount;

    const hasExpenses = resource.expenses && resource.expenses.length > 0;

    div.innerHTML = `
        <div class="budget-resource-main">
            <div class="budget-resource-info">
                <span class="resource-type-icon" style="background-color: ${getResourceTypeColor(resource.resource_type)}">
                    ${getResourceTypeIcon(resource.resource_type)}
                </span>
                <span class="resource-name">${resource.name}</span>
            </div>
            <div class="budget-resource-data">
                <span>Бюджет: ${formatNumber(resource.quantity)} × ${formatNumber(resource.price)} = ${formatNumber(budgetAmount)}</span>
                ${hasExpenses ? `
                    <span class="${isOverBudget ? 'over-budget' : ''}" style="font-weight: 600;">
                        Факт: ${formatNumber(actualAmount)} ${isOverBudget ? '🔴' : '✅'}
                    </span>
                ` : '<span style="color: #999;">Нет данных</span>'}
            </div>
            <button class="icon-btn add-expense-btn" data-resource-id="${resource.id}" title="Добавить факт">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" stroke="#0057d8" stroke-width="2" />
                    <path d="M10 6v8M6 10h8" stroke="#0057d8" stroke-width="2" stroke-linecap="round" />
                </svg>
            </button>
        </div>
        ${hasExpenses ? `<div class="expense-list">${renderExpenseList(resource.expenses)}</div>` : ''}
    `;

    // Add expense button handler
    div.querySelector('.add-expense-btn').addEventListener('click', () => {
        openAddExpenseModal(resource);
    });

    return div;
}

// Render expense list for resource
function renderExpenseList(expenses) {
    return expenses.map(exp => `
        <div class="expense-item">
            <span>${exp.date}</span>
            <span>${formatNumber(exp.actual_quantity)} × ${formatNumber(exp.actual_price)} = ${formatNumber(exp.actual_quantity * exp.actual_price)}</span>
            ${exp.comment ? `<span style="color: #666; font-size: 0.9em;">${exp.comment}</span>` : ''}
            <div class="expense-receipts">
                ${exp.receipt_photo_1 ? `<img src="${exp.receipt_photo_1}" class="receipt-thumb" alt="Чек 1">` : ''}
                ${exp.receipt_photo_2 ? `<img src="${exp.receipt_photo_2}" class="receipt-thumb" alt="Чек 2">` : ''}
                ${exp.receipt_photo_3 ? `<img src="${exp.receipt_photo_3}" class="receipt-thumb" alt="Чек 3">` : ''}
            </div>
        </div>
    `).join('');
}

// Helper functions
function calculateStageBudget(stage) {
    if (!stage.work_types) return 0;
    return stage.work_types.reduce((sum, wt) => sum + calculateWorkTypeBudget(wt), 0);
}

function calculateStageActual(stage) {
    if (!stage.work_types) return 0;
    return stage.work_types.reduce((sum, wt) => sum + calculateWorkTypeActual(wt), 0);
}

function calculateWorkTypeBudget(workType) {
    if (!workType.resources) return 0;
    return workType.resources.reduce((sum, res) => sum + ((res.quantity || 0) * (res.price || 0)), 0);
}

function calculateWorkTypeActual(workType) {
    if (!workType.resources) return 0;
    return workType.resources.reduce((sum, res) => sum + calculateResourceActual(res), 0);
}

function calculateResourceActual(resource) {
    if (!resource.expenses || resource.expenses.length === 0) return 0;
    return resource.expenses.reduce((sum, exp) => sum + (exp.actual_quantity * exp.actual_price), 0);
}

function getResourceTypeColor(type) {
    const types = {
        'Трудоресурсы': '#9C27B0',
        'Материал': '#8BC34A',
        'Доставка': '#2196F3',
        'Оборудование': '#673AB7',
        'Мебель': '#00BCD4',
        'Инструменты': '#4CAF50',
        'Коммуналка': '#E91E63',
        'Документация': '#FF9800',
        'Расходные материалы': '#FFEB3B'
    };
    return types[type] || '#999';
}

function getResourceTypeIcon(type) {
    // Simplified - just return first letter
    return type.charAt(0);
}

function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Open add expense modal
function openAddExpenseModal(resource) {
    // TODO: Create modal for adding expense
    alert(`Добавить расход для: ${resource.name}\nБюджет: ${resource.quantity} × ${resource.price}`);
}

// Make loadExpenses global
window.loadExpenses = loadExpenses;
