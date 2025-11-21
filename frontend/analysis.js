// ===== ANALYSIS TAB LOGIC =====

let analysisData = {
    budget: 0,
    income: 0,
    expense: 0,
    balance: 0,
    overrun: 0,
    resources: {}
};

// Загрузка данных для анализа
async function loadAnalysis(objectId) {
    if (!objectId) return;
    analysisData.objectId = objectId;

    try {
        // Загружаем все данные параллельно
        const [budgetRes, incomeRes, expenseRes] = await Promise.all([
            fetch(`/objects/${objectId}/budget/tree/`),
            fetch(`/objects/${objectId}/incomes/`),
            fetch(`/objects/${objectId}/expenses/tree`)
        ]);

        if (!budgetRes.ok || !incomeRes.ok || !expenseRes.ok) {
            throw new Error('Failed to load data');
        }

        const budgetData = await budgetRes.json();
        const incomeData = await incomeRes.json();
        const expenseData = await expenseRes.json();

        // Рассчитываем показатели
        calculateAnalysis(budgetData, incomeData, expenseData);
        renderAnalysis();
    } catch (err) {
        console.error('Error loading analysis:', err);
        document.getElementById('analysis-container').innerHTML = 
            '<p style="padding:20px;text-align:center;color:#999;">Ошибка загрузки данных</p>';
    }
}

// Расчет всех показателей
function calculateAnalysis(budgetData, incomeData, expenseData) {
    // Бюджет
    analysisData.budget = calculateTotalBudget(budgetData);

    // Приход
    analysisData.income = incomeData.reduce((sum, item) => sum + (item.amount || 0), 0);

    // Расход
    analysisData.expense = calculateTotalExpense(expenseData);

    // Остаток (приход - расход)
    analysisData.balance = analysisData.income - analysisData.expense;

    // Перерасход (бюджет - расходы)
    analysisData.overrun = analysisData.budget - analysisData.expense;

    // По типам ресурсов
    analysisData.resources = calculateResourcesByType(budgetData, expenseData);
}

// Расчет общей суммы бюджета
function calculateTotalBudget(budgetData) {
    return budgetData.reduce((sum, stage) => {
        return sum + (stage.work_types || []).reduce((wtSum, wt) => {
            return wtSum + (wt.resources || []).reduce((resSum, res) => {
                return resSum + ((res.quantity || 0) * (res.price || 0));
            }, 0);
        }, 0);
    }, 0);
}

// Расчет общей суммы расходов
function calculateTotalExpense(expenseData) {
    return expenseData.reduce((sum, stage) => {
        return sum + (stage.work_types || []).reduce((wtSum, wt) => {
            return wtSum + (wt.resources || []).reduce((resSum, res) => {
                if (!res.expenses) return resSum;
                return resSum + res.expenses.reduce((expSum, exp) => {
                    return expSum + ((exp.actual_quantity || 0) * (exp.actual_price || 0));
                }, 0);
            }, 0);
        }, 0);
    }, 0);
}

// Расчет по типам ресурсов
function calculateResourcesByType(budgetData, expenseData) {
    const resources = {};

    // Типы ресурсов из константы
    const resourceTypes = [
        'Трудоресурсы', 'Материал', 'Доставка', 'Оборудование',
        'Мебель', 'Инструменты', 'Коммуналка', 'Документация',
        'Расходные материалы', 'Питание'
    ];

    // Инициализируем все типы
    resourceTypes.forEach(type => {
        resources[type] = { plan: 0, fact: 0 };
    });

    // Считаем план из бюджета
    budgetData.forEach(stage => {
        (stage.work_types || []).forEach(wt => {
            (wt.resources || []).forEach(res => {
                const type = res.resource_type || 'Материал';
                if (resources[type]) {
                    resources[type].plan += (res.quantity || 0) * (res.price || 0);
                }
            });
        });
    });

    // Считаем факт из расходов
    expenseData.forEach(stage => {
        (stage.work_types || []).forEach(wt => {
            (wt.resources || []).forEach(res => {
                const type = res.resource_type || 'Материал';
                if (resources[type] && res.expenses) {
                    res.expenses.forEach(exp => {
                        resources[type].fact += (exp.actual_quantity || 0) * (exp.actual_price || 0);
                    });
                }
            });
        });
    });

    return resources;
}

// Рендеринг анализа
function renderAnalysis() {
    const container = document.getElementById('analysis-container');
    if (!container) return;

    // Ensure images array exists (4 slots)
    if (!analysisData.images) analysisData.images = [null, null, null, null];

    container.innerHTML = `
        <!-- Данные объекта -->
        <div class="analysis-object-section">
            <h2 class="analysis-section-title">Данные объекта</h2>
            <div class="analysis-object-photos">
                ${renderImageUploadGrid()}
            </div>
            <div class="analysis-object-params">
                <div class="object-param-row">
                    <label>Дата начала <input type="date" id="obj-start-date" onchange="onObjectFieldChange()"></label>
                    <label>Дата окончания <input type="date" id="obj-end-date" onchange="onObjectFieldChange()"></label>
                    <label>Общая площадь (м²) <input type="number" id="obj-area" min="0" step="0.01" value="0" oninput="onObjectFieldChange()"></label>
                </div>
                <div class="object-param-row prices-row">
                    <div class="price-per-m2">
                        <div class="price-label">Цена / м² (план)</div>
                        <div class="price-value" id="price-plan">0</div>
                    </div>
                    <div class="price-per-m2">
                        <div class="price-label">Цена / м² (факт)</div>
                        <div class="price-value" id="price-fact">0</div>
                    </div>
                    <div class="export-btn-wrap">
                        <button id="export-analysis-btn" class="btn" onclick="exportAnalysisReport()">Скачать</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Финансовые карточки -->
        <div class="analysis-cards-section">
            <h2 class="analysis-section-title">Аналитика по финансам</h2>
            <div class="analysis-cards-grid single-row">
                <div class="analysis-card">
                    <div class="analysis-card-title"><span class="card-icon">${svgIcon('income')}</span>Приход</div>
                    <div class="analysis-card-value positive">${formatNum(analysisData.income)} сум</div>
                </div>
                <div class="analysis-card">
                    <div class="analysis-card-title"><span class="card-icon">${svgIcon('expense')}</span>Расход</div>
                    <div class="analysis-card-value negative">${formatNum(analysisData.expense)} сум</div>
                </div>
                <div class="analysis-card">
                    <div class="analysis-card-title"><span class="card-icon">${svgIcon('balance')}</span>Остаток</div>
                    <div class="analysis-card-value ${analysisData.balance >= 0 ? 'positive' : 'negative'}">${formatNum(analysisData.balance)} сум</div>
                </div>
                <div class="analysis-card">
                    <div class="analysis-card-title"><span class="card-icon">${svgIcon('overrun')}</span>Перерасход</div>
                    <div class="analysis-card-value ${analysisData.overrun >= 0 ? 'positive' : 'negative'}">${formatNum(analysisData.overrun)} сум</div>
                </div>
            </div>
        </div>

        <!-- Прогресс-бары -->
        <div class="analysis-progress-section">
            <h2 class="analysis-section-title">Аналитика по финансам (прогресс-бары)</h2>
            ${renderProgressBars()}
        </div>

        <!-- По типам ресурсов -->
        <div class="analysis-resources-section">
            <h2 class="analysis-section-title">Аналитика по типам ресурсов</h2>
            <div class="analysis-resources-grid">
                ${renderResourceColumns()}
            </div>
        </div>
    `;

    // Populate area-derived values if inputs already exist
    setTimeout(() => {
        const areaInput = document.getElementById('obj-area');
        if (areaInput) areaInput.value = analysisData.area || 0;
        const start = document.getElementById('obj-start-date');
        if (start && analysisData.startDate) start.value = analysisData.startDate;
        const end = document.getElementById('obj-end-date');
        if (end && analysisData.endDate) end.value = analysisData.endDate;
        updatePricePerM2();
    }, 0);
}

// Helper: render 4 image upload slots
function renderImageUploadGrid() {
    if (!analysisData.images) analysisData.images = [null, null, null, null];
    return analysisData.images.map((src, idx) => {
        return `
            <div class="photo-slot">
                <div class="photo-preview" id="photo-preview-${idx}">
                    ${src ? `<img src="${src}" alt="photo-${idx}" onclick="viewImage(${idx})">` : `<div class="photo-placeholder">+</div>`}
                </div>
                <div class="photo-controls">
                    <input type="file" accept="image/*" id="photo-input-${idx}" style="display:none;" onchange="onImageSelected(event, ${idx})">
                    <button class="btn small" onclick="document.getElementById('photo-input-${idx}').click()">Выбрать</button>
                    ${src ? `<button class="btn small" onclick="viewImage(${idx})">Просмотр</button><button class="btn small danger" onclick="removeImage(${idx})">Удалить</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Image handlers
function onImageSelected(event, idx) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    // If we have objectId, upload to server; otherwise fallback to data URL
    const objectId = analysisData.objectId;
    if (objectId) {
        const fd = new FormData();
        fd.append('photo', file, file.name);
        fetch(`/objects/${objectId}/analysis_photos/`, { method: 'POST', body: fd })
            .then(res => res.json())
            .then(data => {
                if (data && data.url) {
                    analysisData.images[idx] = data.url;
                    renderAnalysis();
                }
            })
            .catch(err => {
                console.error('Upload failed', err);
                // fallback to local data URL
                const reader = new FileReader();
                reader.onload = function(e) {
                    analysisData.images[idx] = e.target.result;
                    renderAnalysis();
                };
                reader.readAsDataURL(file);
            });
    } else {
        const reader = new FileReader();
        reader.onload = function(e) {
            analysisData.images[idx] = e.target.result;
            renderAnalysis();
        };
        reader.readAsDataURL(file);
    }
}

function removeImage(idx) {
    analysisData.images[idx] = null;
    renderAnalysis();
}

function viewImage(idx) {
    const src = analysisData.images[idx];
    if (!src) return;
    const w = window.open('about:blank', '_blank');
    w.document.write(`<img src="${src}" style="max-width:100%;height:auto;display:block;margin:0 auto;">`);
}

function onObjectFieldChange() {
    const area = parseFloat(document.getElementById('obj-area').value || 0);
    const start = document.getElementById('obj-start-date').value;
    const end = document.getElementById('obj-end-date').value;
    analysisData.area = area;
    analysisData.startDate = start;
    analysisData.endDate = end;
    updatePricePerM2();
}

function updatePricePerM2() {
    const area = parseFloat(analysisData.area || 0) || 0;
    const planEl = document.getElementById('price-plan');
    const factEl = document.getElementById('price-fact');
    const planPrice = area > 0 ? analysisData.budget / area : 0;
    const factPrice = area > 0 ? analysisData.expense / area : 0;
    if (planEl) planEl.innerText = formatNum(planPrice) + ' сум';
    if (factEl) factEl.innerText = formatNum(factPrice) + ' сум';
}

// Simple SVG icon helper (returns small inline svg string)
function svgIcon(name) {
    const common = 'width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"';
    switch(name) {
        case 'income': return `<svg ${common}><path d="M12 2v20M5 9l7-7 7 7" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        case 'expense': return `<svg ${common}><path d="M4 6h16M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        case 'balance': return `<svg ${common}><circle cx="12" cy="12" r="9" stroke="#000" stroke-width="1.5"/><path d="M8 12h8" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`;
        case 'overrun': return `<svg ${common}><path d="M12 2v20M5 15l7 7 7-7" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        default: return `<svg ${common}><rect x="3" y="3" width="18" height="18" rx="3" stroke="#000" stroke-width="1.5"/></svg>`;
    }
}

// Export current analysis as a simple HTML report in new tab
function exportAnalysisReport() {
    // Client-side export: open HTML in new window and print (no server call)
    const content = document.getElementById('analysis-container').innerHTML;
    if (!content) {
        alert('Нет данных для экспорта');
        return;
    }

    // Object name (if selected in sidebar)
    const objectName = document.querySelector('#object-list li.selected')?.textContent.trim() || 'Объект';
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Анализ - ${objectName}</title><style>
        body{font-family:Arial,Helvetica,sans-serif;padding:20px;background:#fff;color:#222}
        .header{text-align:center;margin-bottom:20px;border-bottom:2px solid #333;padding-bottom:12px}
        .header h1{font-size:20px;margin-bottom:6px}
        .header p{font-size:13px;color:#666}
        .analysis-wrap{margin-top:16px}
        img{max-width:100%;height:auto}
        @media print{ body{padding:10px} }
    </style></head><body>
        <div class="header"><h1>${objectName}</h1><p>Дата формирования: ${dateStr}</p></div>
        <div class="analysis-wrap">${content}</div>
    </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.onload = function () { try { win.print(); } catch (e) { console.warn('Print failed', e); } };
}

// Expose handlers to global scope for inline handlers
window.onImageSelected = onImageSelected;
window.removeImage = removeImage;
window.viewImage = viewImage;
window.onObjectFieldChange = onObjectFieldChange;
window.exportAnalysisReport = exportAnalysisReport;


// Рендеринг прогресс-баров
function renderProgressBars() {
    const maxValue = Math.max(
        analysisData.budget,
        analysisData.income,
        analysisData.expense,
        Math.abs(analysisData.balance),
        Math.abs(analysisData.overrun)
    );

    const items = [
        { label: 'Бюджет', value: analysisData.budget, class: 'neutral' },
        { label: 'Приход', value: analysisData.income, class: 'positive' },
        { label: 'Расход', value: analysisData.expense, class: 'negative' },
        { label: 'Остаток', value: analysisData.balance, class: analysisData.balance >= 0 ? 'positive' : 'negative' },
        { label: 'Перерасход', value: analysisData.overrun, class: analysisData.overrun >= 0 ? 'positive' : 'negative' }
    ];

    return items.map(item => {
        const percentage = maxValue > 0 ? Math.abs((item.value / maxValue) * 100) : 0;
        return `
            <div class="analysis-progress-item">
                <div class="analysis-progress-header">
                    <span class="analysis-progress-label">${item.label}</span>
                    <span class="analysis-progress-value">${formatNum(item.value)} сум</span>
                </div>
                <div class="analysis-progress-bar-container">
                    <div class="analysis-progress-bar ${item.class}" style="width: ${percentage}%">
                        ${percentage > 10 ? formatNum(item.value) + ' сум' : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Рендеринг колонок по типам ресурсов
function renderResourceColumns() {
    // Показываем все типы ресурсов в определенном порядке
    const resourceOrder = [
        'Трудоресурсы', 'Материал', 'Доставка', 'Оборудование',
        'Мебель', 'Инструменты', 'Коммуналка', 'Документация',
        'Расходные материалы', 'Питание'
    ];

    return resourceOrder.map(type => {
        const data = analysisData.resources[type] || { plan: 0, fact: 0 };
        const diff = data.fact - data.plan;
        const diffClass = diff >= 0 ? 'negative' : 'positive';
        const diffLabel = diff >= 0 ? 'Перерасход' : 'Экономия';
        const diffSign = diff >= 0 ? '-' : '+';

        // Находим максимальное значение для масштабирования столбцов
        const maxValue = Math.max(data.plan, data.fact, 1);
        const planHeight = (data.plan / maxValue) * 100;
        const factHeight = (data.fact / maxValue) * 100;

        return `
            <div class="analysis-resource-column">
                <div class="analysis-resource-title">${svgIcon('resource')}${type}</div>
                    <div class="analysis-resource-chart">
                        <div class="analysis-resource-bar-container">
                            <div class="analysis-resource-bar-label">План</div>
                            <div class="analysis-resource-bar-wrapper">
                                <div class="analysis-resource-bar plan" style="height: ${planHeight}%">
                                    ${planHeight > 15 ? formatNum(data.plan) : ''}
                                </div>
                            </div>
                            <div class="analysis-resource-bar-value">${formatNum(data.plan)}</div>
                        </div>
                        <div class="analysis-resource-bar-container">
                            <div class="analysis-resource-bar-label">Факт</div>
                            <div class="analysis-resource-bar-wrapper">
                                <div class="analysis-resource-bar fact" style="height: ${factHeight}%">
                                    ${factHeight > 15 ? formatNum(data.fact) : ''}
                                </div>
                            </div>
                            <div class="analysis-resource-bar-value">${formatNum(data.fact)}</div>
                        </div>
                    </div>
                    <div class="analysis-resource-diff ${diffClass}">
                        ${diffSign}${formatNum(Math.abs(diff))}
                    </div>
                </div>
            `;
        }).join('');
}

// Форматирование чисел
function formatNum(num) {
    if (num === null || num === undefined || num === '') return '0';
    return parseFloat(num).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Экспорт функции для использования в app.js
window.loadAnalysis = loadAnalysis;

