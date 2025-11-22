// ===== ANALYSIS TAB LOGIC =====

let analysisData = {
    budget: 0,
    income: 0,
    expense: 0,
    balance: 0,
    overrun: 0,
    resources: {}
};

// Icons for resource types in Analysis (black stroke)
const ANALYSIS_RESOURCE_ICONS = {
    'Материал': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box-icon lucide-box"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
    'Доставка': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bus-icon lucide-bus"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>`,
    'Инструменты': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-drill-icon lucide-drill"><path d="M10 18a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H5a3 3 0 0 1-3-3 1 1 0 0 1 1-1z"/><path d="M13 10H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1l-.81 3.242a1 1 0 0 1-.97.758H8"/><path d="M14 4h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3"/><path d="M18 6h4"/><path d="m5 10-2 8"/><path d="m7 18 2-8"/></svg>`,
    'Оборудование': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cable-icon lucide-cable"><path d="M17 19a1 1 0 0 1-1-1v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1z"/><path d="M17 21v-2"/><path d="M19 14V6.5a1 1 0 0 0-7 0v11a1 1 0 0 1-7 0V10"/><path d="M21 21v-2"/><path d="M3 5V3"/><path d="M4 10a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2z"/><path d="M7 5V3"/></svg>`,
    'Питание': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-utensils-icon lucide-utensils"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
    'Коммуналка': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flame-kindling-icon lucide-flame-kindling"><path d="M12 2c1 3 2.5 3.5 3.5 4.5A5 5 0 0 1 17 10a5 5 0 1 1-10 0c0-.3 0-.6.1-.9a2 2 0 1 0 3.3-2C8 4.5 11 2 12 2Z"/><path d="m5 22 14-4"/><path d="m5 18 14 4"/></svg>`,
    'Документация': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text-icon lucide-file-text"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`,
    'Расходные материалы': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-paint-roller-icon lucide-paint-roller"><rect width="16" height="6" x="2" y="2" rx="2"/><path d="M10 16v-2a2 2 0 0 1 2-2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect width="4" height="6" x="8" y="16" rx="1"/></svg>`,
    'Трудоресурсы': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hard-hat-icon lucide-hard-hat"><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M14 6a6 6 0 0 1 6 6v3"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><rect x="2" y="15" width="20" height="4" rx="1"/></svg>`,
    'Мебель': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-armchair-icon lucide-armchair"><path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z"/><path d="M5 18v2"/><path d="M19 18v2"/></svg>`
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
        // Загрузим сохранённые фото для этого объекта
        await loadAnalysisPhotos(objectId);
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

    // Ensure analysisPhotos array exists (4 slots)
    if (!analysisData.analysisPhotos) analysisData.analysisPhotos = [null, null, null, null];

    container.innerHTML = `
        <!-- Данные объекта -->
        <div class="analysis-object-section">
            <h2 class="analysis-section-title">Данные объекта</h2>
            <div class="analysis-object-header">
                <div class="object-name-wrap"><span id="object-name" class="object-name editable">Объект</span></div>
                <div class="object-quick-params">
                    <label>Общая площадь (м²)<br><input type="number" id="obj-area" min="0" step="0.01" value="0" oninput="onObjectFieldChange()"></label>
                    <label>Дата начала<br><input type="date" id="obj-start-date" onchange="onObjectFieldChange()"></label>
                    <label>Дата окончания<br><input type="date" id="obj-end-date" onchange="onObjectFieldChange()"></label>
                </div>
            </div>

            <div class="analysis-object-photos">
                ${renderImageUploadGrid()}
            </div>

            <div class="analysis-object-params">
                <div class="object-param-row prices-row">
                            <div class="price-m2-section" style="width:100%">
                                <div class="analysis-progress-item">
                                    <div class="analysis-progress-header">
                                        <span class="analysis-progress-label">Цена / м² (план)</span>
                                        <span class="analysis-progress-value" id="price-plan-value">0 сум</span>
                                    </div>
                                    <div class="analysis-progress-bar-container">
                                        <div class="analysis-progress-bar neutral" id="price-plan-bar" style="width:0%"> </div>
                                    </div>
                                </div>

                                <div class="analysis-progress-item">
                                    <div class="analysis-progress-header">
                                        <span class="analysis-progress-label">Цена / м² (факт)</span>
                                        <span class="analysis-progress-value" id="price-fact-value">0 сум</span>
                                    </div>
                                    <div class="analysis-progress-bar-container">
                                        <div class="analysis-progress-bar" id="price-fact-bar" style="width:0%"> </div>
                                    </div>
                                </div>
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

    // Populate area-derived values if inputs already exist and attach inline editing
    setTimeout(async () => {
        const areaInput = document.getElementById('obj-area');
        if (areaInput) areaInput.value = analysisData.area || 0;
        const start = document.getElementById('obj-start-date');
        if (start && analysisData.startDate) start.value = analysisData.startDate;
        const end = document.getElementById('obj-end-date');
        if (end && analysisData.endDate) end.value = analysisData.endDate;

        // Load object metadata (name etc.) from server if available
        if (analysisData.objectId) {
            try {
                const res = await fetch(`/objects/${analysisData.objectId}`);
                if (res.ok) {
                    const obj = await res.json();
                    const nameEl = document.getElementById('object-name');
                    if (nameEl) nameEl.textContent = obj.name || 'Объект';
                        if (areaInput && (obj.area !== undefined && obj.area !== null)) {
                            areaInput.value = obj.area;
                            analysisData.area = parseFloat(obj.area) || 0;
                        }
                        if (start && obj.start_date) {
                            start.value = obj.start_date;
                            analysisData.startDate = obj.start_date;
                        }
                        if (end && obj.end_date) {
                            end.value = obj.end_date;
                            analysisData.endDate = obj.end_date;
                        }
                    // attach inline edit behaviour for object name (reuse makeEditable from budget.js if present)
                    const nameElem = document.getElementById('object-name');
                    if (nameElem) {
                        if (typeof makeEditable === 'function') {
                            makeEditable(nameElem, async (newValue) => {
                                // save to server
                                await fetch(`/objects/${analysisData.objectId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newValue }) });
                                // update sidebar item text if selected
                                const sel = document.querySelector('#object-list li.selected');
                                if (sel) sel.textContent = newValue;
                            });
                        } else {
                            // fallback simple inline edit
                            nameElem.onclick = () => {
                                const cur = nameElem.textContent;
                                const input = document.createElement('input');
                                input.type = 'text'; input.value = cur; input.className = 'inline-edit-input';
                                input.onblur = async () => {
                                    const nv = input.value.trim() || cur;
                                    await fetch(`/objects/${analysisData.objectId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: nv }) });
                                    nameElem.textContent = nv;
                                    const sel = document.querySelector('#object-list li.selected'); if (sel) sel.textContent = nv;
                                };
                                input.onkeydown = (e) => { if (e.key === 'Enter') input.blur(); else if (e.key === 'Escape') { nameElem.textContent = cur; } };
                                nameElem.textContent = ''; nameElem.appendChild(input); input.focus(); input.select();
                            };
                        }
                    }
                    // ensure price bars reflect loaded area immediately
                    updatePricePerM2();
                }
            } catch (err) {
                console.warn('Could not fetch object metadata', err);
            }
        }

        updatePricePerM2();
    }, 0);
}

// Helper: load analysis photos from server
async function loadAnalysisPhotos(objectId) {
    try {
        const res = await fetch(`/objects/${objectId}/analysis_photos/`);
        if (!res.ok) throw new Error('Failed to load photos');
        const list = await res.json();
        // Build fixed-size array of 4 slots
        analysisData.analysisPhotos = [null, null, null, null];
        for (let i = 0; i < Math.min(list.length, 4); i++) {
            analysisData.analysisPhotos[i] = { id: list[i].id, url: list[i].url };
        }
    } catch (err) {
        console.warn('Could not load analysis photos:', err);
        analysisData.analysisPhotos = [null, null, null, null];
    }
}

// Helper: render 4 image upload slots using analysisData.analysisPhotos
function renderImageUploadGrid() {
    if (!analysisData.analysisPhotos) analysisData.analysisPhotos = [null, null, null, null];
    return analysisData.analysisPhotos.map((item, idx) => {
        const src = item ? item.url : null;
        return `
            <div class="photo-slot">
                <div class="photo-preview" id="photo-preview-${idx}" data-idx="${idx}" onclick="onPreviewClick(event, ${idx})">
                    ${src ? `<img src="${src}" alt="photo-${idx}">` : `<div class="photo-placeholder">+</div>`}
                    ${src ? `<div class="photo-overlay"><button class="overlay-btn view" onclick="viewImageFromSlot(event, ${idx})" title="Просмотр">👁</button><button class="overlay-btn del" onclick="removeImageFromSlot(event, ${idx})" title="Удалить">✕</button></div>` : ''}
                </div>
                <input type="file" accept="image/*" id="photo-input-${idx}" style="display:none;" onchange="onImageSelected(event, ${idx})">
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
                    // store as object with id
                    analysisData.analysisPhotos[idx] = { id: data.id, url: data.url };
                    renderAnalysis();
                }
            })
            .catch(err => {
                console.error('Upload failed', err);
                // fallback to local data URL
                const reader = new FileReader();
                reader.onload = function(e) {
                    analysisData.analysisPhotos[idx] = { id: null, url: e.target.result };
                    renderAnalysis();
                };
                reader.readAsDataURL(file);
            });
    } else {
        const reader = new FileReader();
        reader.onload = function(e) {
            analysisData.analysisPhotos[idx] = { id: null, url: e.target.result };
            renderAnalysis();
        };
        reader.readAsDataURL(file);
    }
}

function removeImageFromSlot(event, idx) {
    event.stopPropagation();
    const item = analysisData.analysisPhotos[idx];
    if (!item) return;
    if (item.id) {
        // delete on server
        fetch(`/objects/${analysisData.objectId}/analysis_photos/${item.id}`, { method: 'DELETE' })
            .then(res => {
                if (res.ok) {
                    analysisData.analysisPhotos[idx] = null;
                    renderAnalysis();
                } else {
                    alert('Не удалось удалить фото на сервере');
                }
            }).catch(err => { console.error(err); alert('Ошибка удаления'); });
    } else {
        analysisData.analysisPhotos[idx] = null;
        renderAnalysis();
    }
}

function viewImageFromSlot(event, idx) {
    event.stopPropagation();
    const item = analysisData.analysisPhotos[idx];
    if (!item || !item.url) return;
    const modal = document.getElementById('photo-modal');
    const modalImg = document.getElementById('photo-modal-img');
    modalImg.src = item.url;
    modal.style.display = 'flex';
}

function onPreviewClick(event, idx) {
    // Clicking the preview opens file picker for that slot
    const input = document.getElementById(`photo-input-${idx}`);
    if (input) input.click();
}

function onObjectFieldChange() {
    const area = parseFloat(document.getElementById('obj-area').value || 0);
    const start = document.getElementById('obj-start-date').value;
    const end = document.getElementById('obj-end-date').value;
    analysisData.area = area;
    analysisData.startDate = start;
    analysisData.endDate = end;
    updatePricePerM2();

    // Persist these fields to server (partial update)
    if (analysisData.objectId) {
        fetch(`/objects/${analysisData.objectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate: start || null, endDate: end || null, area: area })
        }).then(res => {
            if (!res.ok) console.warn('Failed to save object fields');
        }).catch(err => console.error('Save object fields error', err));
    }
}

function updatePricePerM2() {
    const area = parseFloat(analysisData.area || 0) || 0;
    const planBar = document.getElementById('price-plan-bar');
    const factBar = document.getElementById('price-fact-bar');
    const planValueEl = document.getElementById('price-plan-value');
    const factValueEl = document.getElementById('price-fact-value');
    const planPrice = area > 0 ? analysisData.budget / area : 0;
    const factPrice = area > 0 ? analysisData.expense / area : 0;

    // Normalize widths relative to the larger value (or 1 to avoid division by zero)
    const maxVal = Math.max(planPrice, factPrice, 1);
    const planPct = maxVal > 0 ? (planPrice / maxVal) * 100 : 0;
    const factPct = maxVal > 0 ? (factPrice / maxVal) * 100 : 0;

    // Set widths and labels
    if (planBar) {
        planBar.style.width = planPct + '%';
        planBar.className = 'analysis-progress-bar neutral';
        planBar.innerText = planPct > 10 ? formatNum(planPrice) + ' сум' : '';
    }
    if (factBar) {
        factBar.style.width = factPct + '%';
        // Choose class depending on whether fact > plan
        const factClass = factPrice > planPrice ? 'negative' : 'positive';
        factBar.className = 'analysis-progress-bar ' + factClass;
        factBar.innerText = factPct > 10 ? formatNum(factPrice) + ' сум' : '';
    }
    if (planValueEl) planValueEl.innerText = formatNum(planPrice) + ' сум';
    if (factValueEl) factValueEl.innerText = formatNum(factPrice) + ' сум';
}

// Custom SVG icons for financial cards
function svgIcon(name) {
    switch (name) {
        case 'income':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>`;
        case 'expense':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>`;
        case 'balance':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>`;
        case 'overrun':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"/><path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 16 6 6"/><circle cx="16" cy="9" r="2.9"/><circle cx="6" cy="5" r="3"/></svg>`;
        default:
            return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="#000" stroke-width="1.5"/></svg>`;
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
window.removeImageFromSlot = removeImageFromSlot;
window.viewImageFromSlot = viewImageFromSlot;
window.onPreviewClick = onPreviewClick;
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
        // 'Остаток' will use orange (balance) regardless of sign as requested
        { label: 'Остаток', value: analysisData.balance, class: 'balance' },
        // 'Перерасход' uses purple/pink gradient
        { label: 'Перерасход', value: analysisData.overrun, class: 'overrun' }
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
                <div class="analysis-resource-title">${ANALYSIS_RESOURCE_ICONS[type] || svgIcon('resource')}${type}</div>
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

