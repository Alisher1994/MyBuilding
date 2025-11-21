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

    container.innerHTML = `
        <!-- Финансовые карточки -->
        <div class="analysis-cards-section">
            <h2 class="analysis-section-title">Аналитика по финансам (карточки)</h2>
            <div class="analysis-cards-grid">
                <div class="analysis-card">
                    <div class="analysis-card-title">Приход</div>
                    <div class="analysis-card-value positive">${formatNum(analysisData.income)} сум</div>
                </div>
                <div class="analysis-card">
                    <div class="analysis-card-title">Расход</div>
                    <div class="analysis-card-value negative">${formatNum(analysisData.expense)} сум</div>
                </div>
            </div>
            <div class="analysis-cards-grid">
                <div class="analysis-card">
                    <div class="analysis-card-title">Остаток</div>
                    <div class="analysis-card-value ${analysisData.balance >= 0 ? 'positive' : 'negative'}">${formatNum(analysisData.balance)} сум</div>
                </div>
                <div class="analysis-card">
                    <div class="analysis-card-title">Перерасход</div>
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
}

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
                    <div class="analysis-resource-title">${type}</div>
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

