// ===== BUDGET TAB LOGIC =====

let budgetData = []; // Полное дерево: stages -> work_types -> resources
let selectedObjectId = null;

// Типы ресурсов с цветами и SVG иконками
const RESOURCE_TYPES = {
    'Трудоресурсы': {
        color: '#9C27B0',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'
    },
    'Материал': {
        color: '#8BC34A',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/></svg>'
    },
    'Доставка': {
        color: '#2196F3',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm1.5-9H17V12h4.46L19.5 9.5zM6 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zM20 8l3 4v5h-2c0 1.66-1.34 3-3 3s-3-1.34-3-3H9c0 1.66-1.34 3-3 3s-3-1.34-3-3H1V6c0-1.1.9-2 2-2h14v4h3zM3 6v9h.76c.55-.61 1.35-1 2.24-1 .89 0 1.69.39 2.24 1H15V6H3z"/></svg>'
    },
    'Оборудование': {
        color: '#673AB7',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"/></svg>'
    },
    'Мебель': {
        color: '#00BCD4',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V7H1v10h22V7h-2v6h-2z"/><path d="M19 10h-2v3h2v-3z"/></svg>'
    },
    'Инструменты': {
        color: '#4CAF50',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>'
    },
    'Коммуналка': {
        color: '#E91E63',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3zm0 2.84L18 11v8h-2v-6H8v6H6v-8l6-5.16z"/></svg>'
    },
    'Документация': {
        color: '#FF9800',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>'
    },
    'Расходные материалы': {
        color: '#FFEB3B',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>'
    }
};

const RESOURCE_TYPE_NAMES = Object.keys(RESOURCE_TYPES);

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
        <span class="collapse-btn ${stage.collapsed ? 'collapsed' : ''}" title="Свернуть/развернуть">▶</span>
        <span class="stage-name editable" data-stage-id="${stage.id}" data-field="name">${stage.name}</span>
        <span class="stage-sum">${formatNum(stageSum)} сум</span>
        <button class="btn-icon btn-add" data-stage-id="${stage.id}" title="Добавить вид работ">+</button>
        <button class="btn-icon btn-delete" data-stage-id="${stage.id}" title="Удалить этап">✕</button>
    `;
    div.appendChild(header);

    // Контейнер для видов работ
    const workTypesContainer = document.createElement('div');
    workTypesContainer.className = 'budget-work-types-container';
    if (stage.collapsed) {
        workTypesContainer.classList.add('collapsed');
    }

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
        <span class="collapse-btn ${workType.collapsed ? 'collapsed' : ''}" title="Свернуть/развернуть">▶</span>
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
    if (workType.collapsed) {
        resourcesContainer.classList.add('collapsed');
    }

    // Добавляем заголовок таблицы ресурсов
    if (workType.resources.length > 0) {
        const headerRow = document.createElement('div');
        headerRow.className = 'budget-resource-header';
        headerRow.innerHTML = `
            <span>№</span>
            <span>Фото</span>
            <span>Тип</span>
            <span>Название</span>
            <span>Ед.изм</span>
            <span>Кол-во</span>
            <span>Цена</span>
            <span>Сумма</span>
            <span>Поставщик</span>
            <span></span>
        `;
        resourcesContainer.appendChild(headerRow);
    }

    workType.resources.forEach((res, resIdx) => {
        const resEl = createResourceElement(res, num, resIdx + 1, workType.id);
        resourcesContainer.appendChild(resEl);
    });

    div.appendChild(resourcesContainer);

    // Обработчики событий
    setupWorkTypeEvents(div, workType);

    return div;
}

// Создание элемента ресурса
function createResourceElement(resource, workTypeNum, resNum, workTypeId) {
    const div = document.createElement('div');
    div.className = 'budget-resource';
    div.dataset.resourceId = resource.id;
    div.dataset.workTypeId = workTypeId;
    div.draggable = true;

    const resSum = resource.quantity * resource.price;
    const resType = RESOURCE_TYPES[resource.resource_type] || RESOURCE_TYPES['Материал'];
    const resIcon = `<div class="res-type-icon" style="background-color: ${resType.color}" title="${resource.resource_type}">${resType.icon}</div>`;

    div.innerHTML = `
        <span class="res-num">${workTypeNum}.${resNum}</span>
        <span class="res-photo">
            ${resource.photo ?
            `<div class="res-photo-container">
                <img src="${resource.photo}" alt="Фото" class="res-photo-thumb" data-res-id="${resource.id}">
                <div class="res-photo-actions">
                    <button class="res-photo-view" data-photo="${resource.photo}" title="Просмотр">👁</button>
                    <button class="res-photo-delete" data-res-id="${resource.id}" title="Удалить фото">🗑</button>
                </div>
            </div>` :
            `<button class="btn-upload-photo" data-res-id="${resource.id}">📷</button>`
        }
        </span>
        <span class="res-type editable-select" data-res-id="${resource.id}" data-field="resource_type">${resIcon}</span>
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
    makeEditableSelectWithIcons(typeEl, RESOURCE_TYPE_NAMES, async (newValue) => {
        await updateResource(resource.id, { resource_type: newValue });
        resource.resource_type = newValue;
        renderBudget();
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

    // Просмотр фото
    const photoView = div.querySelector('.res-photo-view');
    if (photoView) {
        photoView.onclick = (e) => {
            e.stopPropagation();
            const modal = document.getElementById('photo-modal');
            const modalImg = document.getElementById('photo-modal-img');
            modalImg.src = photoView.dataset.photo;
            modal.style.display = 'flex';
        };
    }

    // Удаление фото
    const photoDelete = div.querySelector('.res-photo-delete');
    if (photoDelete) {
        photoDelete.onclick = async (e) => {
            e.stopPropagation();
            if (confirm('Удалить фото?')) {
                await updateResource(resource.id, { photo: '' });
                await loadBudget(selectedObjectId);
            }
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
    element.onclick = function (e) {
        e.stopPropagation();
        e.preventDefault();

        // Проверяем что уже не редактируем
        if (element.querySelector('select')) return;

        const currentValue = element.textContent.trim();
        const select = document.createElement('select');
        select.className = 'inline-edit-select';

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            if (opt === currentValue) option.selected = true;
            select.appendChild(option);
        });

        select.onchange = async function () {
            const newValue = select.value;
            if (newValue && newValue !== currentValue) {
                await onSave(newValue);
            }
            element.textContent = newValue || currentValue;
        };

        select.onblur = function () {
            element.textContent = select.value || currentValue;
        };

        element.textContent = '';
        element.appendChild(select);
        select.focus();
    };
}

// Inline редактирование (dropdown с иконками)
function makeEditableSelectWithIcons(element, options, onSave) {
    element.onclick = function (e) {
        e.stopPropagation();
        e.preventDefault();

        // Проверяем что уже не редактируем
        if (element.querySelector('select')) return;

        const currentValue = element.querySelector('.res-type-icon')?.title || element.textContent.trim();
        const select = document.createElement('select');
        select.className = 'inline-edit-select';

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            const resType = RESOURCE_TYPES[opt];
            option.textContent = opt;
            if (opt === currentValue) option.selected = true;
            select.appendChild(option);
        });

        select.onchange = async function () {
            const newValue = select.value;
            if (newValue && newValue !== currentValue) {
                await onSave(newValue);
            }
            const resType = RESOURCE_TYPES[newValue || currentValue];
            element.innerHTML = `<div class="res-type-icon" style="background-color: ${resType.color}" title="${newValue || currentValue}">${resType.icon}</div>`;
        };

        select.onblur = function () {
            const newValue = select.value || currentValue;
            const resType = RESOURCE_TYPES[newValue];
            element.innerHTML = `<div class="res-type-icon" style="background-color: ${resType.color}" title="${newValue}">${resType.icon}</div>`;
        };

        const iconHtml = element.innerHTML;
        element.textContent = '';
        element.appendChild(select);
        select.focus();
    };
}

// Drag and Drop
let draggedElement = null;
let draggedType = null; // 'stage', 'work-type', 'resource'

function setupDragDrop(element, type) {
    element.addEventListener('dragstart', (e) => {
        draggedElement = element;
        draggedType = type;
        element.classList.add('dragging');
        e.stopPropagation();
    });

    element.addEventListener('dragend', () => {
        element.classList.remove('dragging');
        draggedElement = null;
        draggedType = null;
    });

    element.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const container = element.parentElement;
        const afterElement = getDragAfterElement(container, e.clientY);
        if (afterElement == null) {
            container.appendChild(draggedElement);
        } else {
            container.insertBefore(draggedElement, afterElement);
        }
    });

    element.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Сохраняем новый порядок
        if (draggedType === 'stage') {
            const stageIds = [...document.querySelectorAll('.budget-stage')].map(el => el.dataset.stageId);
            await reorderStages(stageIds);
        } else if (draggedType === 'work-type') {
            // TODO: Реализовать перетаскивание видов работ между этапами (пока только внутри этапа)
            // Для простоты пока считаем что перетаскиваем только внутри одного контейнера
        } else if (draggedType === 'resource') {
            const workTypeId = draggedElement.dataset.workTypeId;
            const container = draggedElement.parentElement;
            const resourceIds = [...container.querySelectorAll('.budget-resource')].map(el => el.dataset.resourceId);
            await reorderResources(workTypeId, resourceIds);
        }

        // Перезагружаем чтобы обновить нумерацию
        await loadBudget(selectedObjectId);
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

// API Calls
async function updateStage(stageId, data) {
    const res = await fetch(`/objects/${selectedObjectId}/budget/stages/${stageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update stage');
}

async function updateWorkType(workTypeId, data) {
    const res = await fetch(`/budget/work-types/${workTypeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update work type');
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

async function addWorkType(stageId) {
    const res = await fetch(`/budget/stages/${stageId}/work-types/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Новый вид работ' })
    });
    if (!res.ok) throw new Error('Failed to add work type');
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

async function deleteStage(stageId) {
    const res = await fetch(`/objects/${selectedObjectId}/budget/stages/${stageId}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete stage');
}

async function deleteWorkType(workTypeId) {
    const res = await fetch(`/budget/work-types/${workTypeId}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete work type');
}

async function deleteResource(resourceId) {
    const res = await fetch(`/budget/resources/${resourceId}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete resource');
}

async function reorderStages(stageIds) {
    const res = await fetch(`/objects/${selectedObjectId}/budget/stages/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_ids: stageIds })
    });
    if (!res.ok) throw new Error('Failed to reorder stages');
}

async function reorderResources(workTypeId, resourceIds) {
    const res = await fetch(`/budget/work-types/${workTypeId}/resources/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_ids: resourceIds })
    });
    if (!res.ok) throw new Error('Failed to reorder resources');
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

// Добавление нового этапа
async function addStage(objectId) {
    const res = await fetch(`/objects/${objectId}/budget/stages/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Новый этап' })
    });
    if (!res.ok) throw new Error('Failed to add stage');
}

// Генерация HTML для скачивания/печати бюджета
function downloadBudget() {
    if (!selectedObjectId || !budgetData || budgetData.length === 0) {
        alert('Нет данных для скачивания');
        return;
    }

    // Получаем название объекта
    const objectName = document.querySelector('#object-list li.selected')?.textContent.trim() || 'Объект';

    // Форматируем дату
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Генерируем HTML таблицы
    let tableHTML = '';
    let workTypeCounter = 1;

    budgetData.forEach((stage) => {
        const stageSum = stage.work_types.reduce((sum, wt) => sum + calculateWorkTypeSum(wt), 0);

        tableHTML += `
            <tr class="stage-row">
                <td colspan="9"><strong>${stage.name}</strong></td>
                <td class="text-right"><strong>${formatNum(stageSum)} сум</strong></td>
            </tr>
        `;

        stage.work_types.forEach((wt) => {
            const wtSum = calculateWorkTypeSum(wt);
            const wtPrice = wt.quantity > 0 ? wtSum / wt.quantity : 0;

            tableHTML += `
                <tr class="work-type-row">
                    <td>${workTypeCounter}.</td>
                    <td colspan="3">${wt.name}</td>
                    <td>${wt.unit}</td>
                    <td class="text-right">${formatNum(wt.quantity)}</td>
                    <td class="text-right">${formatNum(wtPrice)}</td>
                    <td class="text-right"><strong>${formatNum(wtSum)} сум</strong></td>
                    <td colspan="2"></td>
                </tr>
            `;

            if (wt.resources.length > 0) {
                tableHTML += `
                    <tr class="resource-header-row">
                        <td>№</td>
                        <td>Фото</td>
                        <td>Тип</td>
                        <td>Название</td>
                        <td>Ед.изм</td>
                        <td>Кол-во</td>
                        <td>Цена</td>
                        <td>Сумма</td>
                        <td>Поставщик</td>
                    </tr>
                `;

                wt.resources.forEach((res, resIdx) => {
                    const resSum = res.quantity * res.price;
                    const resType = RESOURCE_TYPES[res.resource_type] || RESOURCE_TYPES['Материал'];
                    const photoHtml = res.photo
                        ? `<img src="${res.photo}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 3px;" alt="Фото">`
                        : '<span style="color: #ccc; font-size: 10px;">—</span>';

                    tableHTML += `
                        <tr class="resource-row">
                            <td>${workTypeCounter}.${resIdx + 1}</td>
                            <td>${photoHtml}</td>
                            <td><span class="type-badge" style="background-color: ${resType.color}">${res.resource_type}</span></td>
                            <td>${res.name}</td>
                            <td>${res.unit}</td>
                            <td class="text-right">${formatNum(res.quantity)}</td>
                            <td class="text-right">${formatNum(res.price)}</td>
                            <td class="text-right">${formatNum(resSum)}</td>
                            <td>${res.supplier || ''}</td>
                        </tr>
                    `;
                });
            }

            workTypeCounter++;
        });
    });

    const totalSum = calculateTotalSum();

    // Полный HTML документ
    const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Бюджет - ${objectName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #fff;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #333;
        }
        .header h1 {
            font-size: 24px;
            margin-bottom: 10px;
            color: #333;
        }
        .header p {
            font-size: 14px;
            color: #666;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 12px;
        }
        th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .stage-row td {
            background-color: #e8f4ff;
            font-size: 13px;
            padding: 6px 8px;
        }
        .work-type-row {
            background-color: #f9f9f9;
        }
        .work-type-row td {
            font-weight: 600;
            padding: 6px 8px;
        }
        .resource-header-row {
            background-color: #f0f0f0;
            font-size: 10px;
        }
        .resource-header-row td {
            font-weight: bold;
            color: #666;
        }
        .resource-row td {
            padding: 6px 8px;
        }
        .text-right {
            text-align: right;
        }
        .type-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            color: white;
            font-size: 10px;
            font-weight: bold;
        }
        .total-row {
            background-color: #f0f7ff;
            font-size: 16px;
            font-weight: bold;
        }
        .total-row td {
            padding: 12px 8px;
            border: 2px solid #0067c0;
        }
        @media print {
            body {
                padding: 10px;
            }
            .header {
                margin-bottom: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${objectName}</h1>
        <p>Дата формирования: ${dateStr}</p>
    </div>
    
    <table>
        <thead>
            <tr>
                <th style="width: 30px;">№</th>
                <th>Наименование</th>
                <th style="width: 50px;">Фото</th>
                <th style="width: 80px;">Тип</th>
                <th>Описание</th>
                <th style="width: 60px;">Ед.изм</th>
                <th style="width: 80px;">Кол-во</th>
                <th style="width: 90px;">Цена</th>
                <th style="width: 100px;">Сумма</th>
                <th style="width: 120px;">Поставщик</th>
            </tr>
        </thead>
        <tbody>
            ${tableHTML}
            <tr class="total-row">
                <td colspan="7">ИТОГО ПО БЮДЖЕТУ:</td>
                <td class="text-right">${formatNum(totalSum)} сум</td>
                <td colspan="2"></td>
            </tr>
        </tbody>
    </table>
</body>
</html>
    `;

    // Открываем в новом окне
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();

    // Автоматически открываем диалог печати
    printWindow.onload = function () {
        printWindow.print();
    };
}

// Обработчики кнопок
document.addEventListener('DOMContentLoaded', () => {
    // Кнопка "Добавить этап"
    const addStageBtn = document.getElementById('add-budget-group');
    if (addStageBtn) {
        addStageBtn.onclick = async () => {
            if (!selectedObjectId) {
                alert('Сначала выберите объект');
                return;
            }
            try {
                await addStage(selectedObjectId);
                await loadBudget(selectedObjectId);
            } catch (err) {
                console.error('Error adding stage:', err);
                alert('Ошибка при добавлении этапа: ' + err.message);
            }
        };
    }

    // Кнопка "Скачать"
    const downloadBtn = document.getElementById('download-budget');
    if (downloadBtn) {
        downloadBtn.onclick = () => {
            downloadBudget();
        };
    }
});
