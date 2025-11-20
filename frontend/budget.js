// ===== BUDGET TAB LOGIC =====

let budgetData = []; // Полное дерево: stages -> work_types -> resources
let selectedObjectId = null;

// Типы ресурсов
const RESOURCE_TYPES = [
    'Трудоресурсы',
    'Материал',
    'Доставка',
    'Оборудование',
    'Мебель',
    'Инструменты',
    'Коммуналка',
    'Документация',
    'Расходные материалы'
];

// Единицы измерения
const UNITS = ['шт', 'м', 'м2', 'м3', 'кг', 'л', 'пачка', 'комплект', 'мешок', 'ведро'];

// Форматирование чисел с разделителями
function formatNum(num) {
    if (num === null || num === undefined || num === '') return '0';
    return parseFloat(num).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Парсинг чисел
function parseNum(str) {
    if (!str) return 0;
    return parseFloat(str.toString().replace(/\s/g, '').replace(',', '.')) || 0;
}

// Загрузка данных бюджета
async function loadBudget(objectId) {
    selectedObjectId = objectId;
    try {
        const res = await fetch(`/objects/${objectId}/budget/tree/`);
        if (!res.ok) throw new Error('Failed to load budget');
        budgetData = await res.json();
        renderBudget();
    } catch (err) {
        console.error('Error loading budget:', err);
        alert('Ошибка загрузки бюджета: ' + err.message);
    }
}

// Рендеринг всего бюджета
function renderBudget() {
    const container = document.getElementById('budget-container');
    if (!container) return;

    container.innerHTML = '';

    let workTypeCounter = 1; // Сквозная нумерация видов работ

    budgetData.forEach((stage, stageIdx) => {
        const stageEl = createStageElement(stage, stageIdx, workTypeCounter);
        container.appendChild(stageEl);

        // Обновляем счетчик видов работ
        workTypeCounter += stage.work_types.length;
    });

    // Добавляем итоговую сумму
    const totalSum = calculateTotalSum();
    const totalRow = document.createElement('div');
    totalRow.className = 'budget-total-row';
    totalRow.innerHTML = `<strong>ИТОГО ПО БЮДЖЕТУ:</strong> <span>${formatNum(totalSum)} сум</span>`;
    container.appendChild(totalRow);
}

// Создание элемента этапа
function createStageElement(stage, stageIdx, startWorkTypeNum) {
    const div = document.createElement('div');
    div.className = 'budget-stage';
    div.dataset.stageId = stage.id;
    div.draggable = true;

    // Расчет суммы этапа
    const stageSum = stage.work_types.reduce((sum, wt) => sum + calculateWorkTypeSum(wt), 0);

    // Заголовок этапа
    const header = document.createElement('div');
    header.className = 'budget-stage-header';
    header.innerHTML = `
        <span class="collapse-btn" data-stage-id="${stage.id}">${stage.collapsed ? '▶' : '▼'}</span>
        <span class="stage-name editable" data-stage-id="${stage.id}" data-field="name">${stage.name}</span>
        <span class="stage-sum">${formatNum(stageSum)} сум</span>
        <button class="btn-icon btn-add" data-stage-id="${stage.id}" title="Добавить вид работ">+</button>
        <button class="btn-icon btn-delete" data-stage-id="${stage.id}" title="Удалить этап">✕</button>
    `;
    div.appendChild(header);

    // Контейнер для видов работ
    const workTypesContainer = document.createElement('div');
    workTypesContainer.className = 'budget-work-types-container';
    workTypesContainer.style.display = stage.collapsed ? 'none' : 'block';

    let workTypeNum = startWorkTypeNum;
    stage.work_types.forEach((wt, wtIdx) => {
        const wtEl = createWorkTypeElement(wt, workTypeNum, stage.id);
        workTypesContainer.appendChild(wtEl);
        workTypeNum++;
    });

    div.appendChild(workTypesContainer);

    // Обработчики событий
    setupStageEvents(div, stage);

    return div;
}

// Создание элемента вида работ
function createWorkTypeElement(workType, num, stageId) {
    const div = document.createElement('div');
    div.className = 'budget-work-type';
    div.dataset.workTypeId = workType.id;
    div.dataset.stageId = stageId;
    div.draggable = true;

    const wtSum = calculateWorkTypeSum(workType);
    const wtPrice = workType.quantity > 0 ? wtSum / workType.quantity : 0;

    const header = document.createElement('div');
    header.className = 'budget-work-type-header';
    header.innerHTML = `
        <span class="wt-num">${num}.</span>
        <span class="collapse-btn" data-wt-id="${workType.id}">${workType.collapsed ? '▶' : '▼'}</span>
        <span class="wt-name editable" data-wt-id="${workType.id}" data-field="name">${workType.name}</span>
        <span class="wt-unit editable-select" data-wt-id="${workType.id}" data-field="unit">${workType.unit}</span>
        <span class="wt-quantity editable" data-wt-id="${workType.id}" data-field="quantity">${formatNum(workType.quantity)}</span>
        <span class="wt-price">${formatNum(wtPrice)}</span>
        <span class="wt-sum">${formatNum(wtSum)}</span>
        <button class="btn-icon btn-add" data-wt-id="${workType.id}" title="Добавить ресурс">+</button>
        <button class="btn-icon btn-delete" data-wt-id="${workType.id}" title="Удалить вид работ">✕</button>
    `;
    div.appendChild(header);

    // Контейнер для ресурсов
    const resourcesContainer = document.createElement('div');
    resourcesContainer.className = 'budget-resources-container';
    resourcesContainer.style.display = workType.collapsed ? 'none' : 'block';

    workType.resources.forEach((res, resIdx) => {
        const resEl = createResourceElement(res, resIdx + 1, workType.id);
        resourcesContainer.appendChild(resEl);
    });

    div.appendChild(resourcesContainer);

    // Обработчики событий
    setupWorkTypeEvents(div, workType);

    return div;
}

// Создание элемента ресурса
function createResourceElement(resource, num, workTypeId) {
    const div = document.createElement('div');
    div.className = 'budget-resource';
    div.dataset.resourceId = resource.id;
    div.dataset.workTypeId = workTypeId;
    div.draggable = true;

    const resSum = resource.quantity * resource.price;

    div.innerHTML = `
        <span class="res-num">${num}</span>
        <span class="res-photo">
            ${resource.photo ?
            `<img src="${resource.photo}" alt="Фото" class="res-photo-thumb">` :
            `<button class="btn-upload-photo" data-res-id="${resource.id}">📷</button>`
        }
        </span>
        <span class="res-type editable-select" data-res-id="${resource.id}" data-field="resource_type">${resource.resource_type}</span>
        <span class="res-name editable" data-res-id="${resource.id}" data-field="name">${resource.name}</span>
        <span class="res-unit editable-select" data-res-id="${resource.id}" data-field="unit">${resource.unit}</span>
        <span class="res-quantity editable" data-res-id="${resource.id}" data-field="quantity">${formatNum(resource.quantity)}</span>
        <span class="res-price editable" data-res-id="${resource.id}" data-field="price">${formatNum(resource.price)}</span>
        <span class="res-sum">${formatNum(resSum)}</span>
        <span class="res-supplier editable" data-res-id="${resource.id}" data-field="supplier">${resource.supplier || ''}</span>
        <button class="btn-icon btn-delete" data-res-id="${resource.id}" title="Удалить ресурс">✕</button>
    `;

    // Обработчики событий
    setupResourceEvents(div, resource);

    return div;
}

// Расчет суммы вида работ
function calculateWorkTypeSum(workType) {
    return workType.resources.reduce((sum, res) => sum + (res.quantity * res.price), 0);
}

// Расчет общей суммы бюджета
function calculateTotalSum() {
    return budgetData.reduce((sum, stage) => {
        return sum + stage.work_types.reduce((wtSum, wt) => wtSum + calculateWorkTypeSum(wt), 0);
    }, 0);
}

// Обработчики событий для этапа
function setupStageEvents(div, stage) {
    // Свернуть/развернуть
    const collapseBtn = div.querySelector('.collapse-btn');
    collapseBtn.onclick = async () => {
        stage.collapsed = !stage.collapsed;
        await updateStage(stage.id, { collapsed: stage.collapsed });
        renderBudget();
    };

    // Редактирование названия
    const nameEl = div.querySelector('.stage-name');
    makeEditable(nameEl, async (newValue) => {
        await updateStage(stage.id, { name: newValue });
        stage.name = newValue;
    });

    // Добавить вид работ
    const addBtn = div.querySelector('.btn-add');
    addBtn.onclick = async () => {
        await addWorkType(stage.id);
        await loadBudget(selectedObjectId);
    };

    // Удалить этап
    const deleteBtn = div.querySelector('.btn-delete');
    deleteBtn.onclick = async () => {
        if (confirm('Удалить этап и все его виды работ?')) {
            await deleteStage(stage.id);
            await loadBudget(selectedObjectId);
        }
    };

    // Drag and drop
    setupDragDrop(div, 'stage');
}

// Обработчики событий для вида работ
function setupWorkTypeEvents(div, workType) {
    // Свернуть/развернуть
    const collapseBtn = div.querySelector('.collapse-btn');
    collapseBtn.onclick = async () => {
        workType.collapsed = !workType.collapsed;
        await updateWorkType(workType.id, { collapsed: workType.collapsed });
        renderBudget();
    };

    // Редактирование полей
    const nameEl = div.querySelector('.wt-name');
    makeEditable(nameEl, async (newValue) => {
        await updateWorkType(workType.id, { name: newValue });
        workType.name = newValue;
    });

    const unitEl = div.querySelector('.wt-unit');
    makeEditableSelect(unitEl, UNITS, async (newValue) => {
        await updateWorkType(workType.id, { unit: newValue });
        workType.unit = newValue;
    });

    const quantityEl = div.querySelector('.wt-quantity');
    makeEditable(quantityEl, async (newValue) => {
        const num = parseNum(newValue);
        await updateWorkType(workType.id, { quantity: num });
        workType.quantity = num;
        renderBudget();
    });

    // Добавить ресурс
    const addBtn = div.querySelector('.btn-add');
    addBtn.onclick = async () => {
        await addResource(workType.id);
        await loadBudget(selectedObjectId);
    };

    // Удалить вид работ
    const deleteBtn = div.querySelector('.btn-delete');
    deleteBtn.onclick = async () => {
        if (confirm('Удалить вид работ и все его ресурсы?')) {
            await deleteWorkType(workType.id);
            await loadBudget(selectedObjectId);
        }
    };

    // Drag and drop
    setupDragDrop(div, 'work-type');
}

// Обработчики событий для ресурса
function setupResourceEvents(div, resource) {
    // Редактирование полей
    const fields = ['name', 'quantity', 'price', 'supplier'];
    fields.forEach(field => {
        const el = div.querySelector(`[data-field="${field}"]`);
        if (el) {
            makeEditable(el, async (newValue) => {
                const isNumber = ['quantity', 'price'].includes(field);
                const value = isNumber ? parseNum(newValue) : newValue;
                await updateResource(resource.id, { [field]: value });
                resource[field] = value;
                renderBudget();
            });
        }
    });

    // Dropdown для типа ресурса
    const typeEl = div.querySelector('.res-type');
    makeEditableSelect(typeEl, RESOURCE_TYPES, async (newValue) => {
        await updateResource(resource.id, { resource_type: newValue });
        resource.resource_type = newValue;
    });

    // Dropdown для единицы измерения
    const unitEl = div.querySelector('.res-unit');
    makeEditableSelect(unitEl, UNITS, async (newValue) => {
        await updateResource(resource.id, { unit: newValue });
        resource.unit = newValue;
    });

    // Загрузка фото
    const uploadBtn = div.querySelector('.btn-upload-photo');
    if (uploadBtn) {
        uploadBtn.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await uploadResourcePhoto(resource.id, file);
                    await loadBudget(selectedObjectId);
                }
            };
            input.click();
        };
    }

    // Удалить ресурс
    const deleteBtn = div.querySelector('.btn-delete');
    deleteBtn.onclick = async () => {
        if (confirm('Удалить ресурс?')) {
            await deleteResource(resource.id);
            await loadBudget(selectedObjectId);
        }
    };

    // Drag and drop
    setupDragDrop(div, 'resource');
}

// Inline редактирование (текстовое поле)
function makeEditable(element, onSave) {
    element.onclick = function () {
        const currentValue = element.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        input.className = 'inline-edit-input';

        input.onblur = async function () {
            const newValue = input.value.trim();
            if (newValue && newValue !== currentValue) {
                await onSave(newValue);
            }
            element.textContent = newValue || currentValue;
        };

        input.onkeydown = function (e) {
            if (e.key === 'Enter') {
                input.blur();
            } else if (e.key === 'Escape') {
                element.textContent = currentValue;
            }
        };

        element.textContent = '';
        element.appendChild(input);
        input.focus();
        input.select();
    };
}

// Inline редактирование (dropdown)
function makeEditableSelect(element, options, onSave) {
    element.onclick = function () {
        const currentValue = element.textContent;
        const select = document.createElement('select');
        select.className = 'inline-edit-select';

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            if (opt === currentValue) option.selected = true;
            select.appendChild(option);
        });

        select.onblur = async function () {
            const newValue = select.value;
            if (newValue !== currentValue) {
                await onSave(newValue);
            }
            element.textContent = newValue;
        };

        select.onchange = function () {
            select.blur();
        };

        element.textContent = '';
        element.appendChild(select);
        select.focus();
    };
}

// Drag and Drop
let draggedElement = null;
let draggedType = null;

function setupDragDrop(element, type) {
    element.addEventListener('dragstart', (e) => {
        draggedElement = element;
        draggedType = type;
        element.classList.add('dragging');
    });

    element.addEventListener('dragend', (e) => {
        element.classList.remove('dragging');
        draggedElement = null;
        draggedType = null;
    });

    element.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (draggedType === type) {
            const afterElement = getDragAfterElement(element.parentElement, e.clientY);
            if (afterElement == null) {
                element.parentElement.appendChild(draggedElement);
            } else {
                element.parentElement.insertBefore(draggedElement, afterElement);
            }
        }
    });

    element.addEventListener('drop', async (e) => {
        e.preventDefault();
        if (draggedType === type) {
            await handleDrop(type);
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll(`.budget-${draggedType}:not(.dragging)`)];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

async function handleDrop(type) {
    if (type === 'stage') {
        const stages = [...document.querySelectorAll('.budget-stage')];
        const stageIds = stages.map(s => parseInt(s.dataset.stageId));
        await reorderStages(stageIds);
    } else if (type === 'work-type') {
        const container = draggedElement.parentElement;
        const workTypes = [...container.querySelectorAll('.budget-work-type')];
        const workTypeIds = workTypes.map(wt => parseInt(wt.dataset.workTypeId));
        const stageId = parseInt(draggedElement.dataset.stageId);
        await reorderWorkTypes(stageId, workTypeIds);
    } else if (type === 'resource') {
        const container = draggedElement.parentElement;
        const resources = [...container.querySelectorAll('.budget-resource')];
        const resourceIds = resources.map(r => parseInt(r.dataset.resourceId));
        const workTypeId = parseInt(draggedElement.dataset.workTypeId);
        await reorderResources(workTypeId, resourceIds);
    }

    await loadBudget(selectedObjectId);
}

// === API CALLS ===

async function updateStage(stageId, data) {
    const res = await fetch(`/objects/${selectedObjectId}/budget/stages/${stageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update stage');
}

async function deleteStage(stageId) {
    const res = await fetch(`/objects/${selectedObjectId}/budget/stages/${stageId}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete stage');
}

async function addWorkType(stageId) {
    const res = await fetch(`/budget/stages/${stageId}/work-types/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Новый вид работ' })
    });
    if (!res.ok) throw new Error('Failed to add work type');
}

async function updateWorkType(workTypeId, data) {
    const res = await fetch(`/budget/work-types/${workTypeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update work type');
}

async function deleteWorkType(workTypeId) {
    const res = await fetch(`/budget/work-types/${workTypeId}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete work type');
}

async function addResource(workTypeId) {
    const formData = new FormData();
    formData.append('resource_type', 'Материал');
    formData.append('name', 'Новый ресурс');
    formData.append('unit', 'шт');
    formData.append('quantity', '0');
    formData.append('price', '0');
    formData.append('supplier', '');

    const res = await fetch(`/budget/work-types/${workTypeId}/resources/`, {
        method: 'POST',
        body: formData
    });
    if (!res.ok) throw new Error('Failed to add resource');
}

async function updateResource(resourceId, data) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(data)) {
        formData.append(key, value);
    }

    const res = await fetch(`/budget/resources/${resourceId}`, {
        method: 'PUT',
        body: formData
    });
    if (!res.ok) throw new Error('Failed to update resource');
}

async function deleteResource(resourceId) {
    const res = await fetch(`/budget/resources/${resourceId}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete resource');
}

async function uploadResourcePhoto(resourceId, file) {
    const formData = new FormData();
    formData.append('photo', file);

    const res = await fetch(`/budget/resources/${resourceId}`, {
        method: 'PUT',
        body: formData
    });
    if (!res.ok) throw new Error('Failed to upload photo');
}

async function reorderStages(stageIds) {
    const res = await fetch(`/objects/${selectedObjectId}/budget/stages/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_ids: stageIds })
    });
    if (!res.ok) throw new Error('Failed to reorder stages');
}

async function reorderWorkTypes(stageId, workTypeIds) {
    const res = await fetch(`/budget/stages/${stageId}/work-types/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_type_ids: workTypeIds })
    });
    if (!res.ok) throw new Error('Failed to reorder work types');
}

async function reorderResources(workTypeId, resourceIds) {
    const res = await fetch(`/budget/work-types/${workTypeId}/resources/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_ids: resourceIds })
    });
    if (!res.ok) throw new Error('Failed to reorder resources');
}

// === INITIALIZATION ===

// Добавить этап
document.getElementById('add-budget-group')?.addEventListener('click', async () => {
    if (!selectedObjectId) return;

    const res = await fetch(`/objects/${selectedObjectId}/budget/stages/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Новый этап' })
    });

    if (res.ok) {
        await loadBudget(selectedObjectId);
    }
});

// Экспорт функции для вызова из app.js
window.loadBudget = loadBudget;
