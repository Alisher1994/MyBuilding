
// --- Приход: таблица, модалка, логика через API ---
let incomeRows = [];
let editingIncomeId = null;
let selectedId = null;

// --- Helper: Format Number (1 000 000) ---
function formatNumber(num) {
    if (num === null || num === undefined) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// --- Helper: Parse Number (remove spaces) ---
function parseNumber(str) {
    if (!str) return 0;
    return parseFloat(str.toString().replace(/\s/g, '')) || 0;
}

// --- Input Formatting for Amount ---
const amountInput = document.getElementById('income-amount');
if (amountInput) {
    amountInput.addEventListener('input', function (e) {
        // Remove non-digits
        let val = e.target.value.replace(/\D/g, '');
        // Format
        e.target.value = val.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    });
}

async function loadIncomes() {
    if (!selectedId) return;
    try {
        const res = await fetch(`/objects/${selectedId}/incomes/`);
        if (!res.ok) {
            throw new Error(`Server error: ${res.status}`);
        }
        incomeRows = await res.json();
        renderIncomeTable();
    } catch (err) {
        console.error("Failed to load incomes:", err);
        alert("Не удалось загрузить данные: " + err.message);
    }
}

function renderIncomeTable() {
    const tbody = document.getElementById('income-tbody');
    tbody.innerHTML = '';
    let total = 0;
    incomeRows.forEach((row, idx) => {
        const tr = document.createElement('tr');
        // Safe fallback for image
        const photoHtml = row.photo
            ? `<img src="${row.photo}?t=${Date.now()}" class="income-photo-thumb income-photo-view" data-idx="${idx}" alt="Фото">`
            : '<span style="color:#ccc;font-size:0.8em;">Нет фото</span>';

        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${row.date}</td>
            <td>${photoHtml}</td>
            <td>${formatNumber(row.amount)}</td>
            <td>${row.sender || row.from || ''}</td>
            <td>${row.receiver || row.to || ''}</td>
            <td>${row.comment || ''}</td>
            <td>
                <button class="icon-btn income-edit" title="Изменить" data-idx="${idx}">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M4 13.5V16h2.5l7.1-7.1-2.5-2.5L4 13.5z" stroke="#0057d8" stroke-width="1.5"/><path d="M13.5 6.5l2 2" stroke="#0057d8" stroke-width="1.5" stroke-linecap="round"/></svg>
                </button>
                <button class="icon-btn income-delete" title="Удалить" data-idx="${idx}">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="5" y="8" width="10" height="7" rx="2" stroke="#d80027" stroke-width="1.5"/><path d="M8 10v3M12 10v3" stroke="#d80027" stroke-width="1.5" stroke-linecap="round"/><rect x="8" y="4" width="4" height="2" rx="1" fill="#d80027"/></svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
        total += Number(row.amount) || 0;
    });
    document.getElementById('income-total').textContent = formatNumber(total);

    // Кнопки удалить
    tbody.querySelectorAll('.income-delete').forEach(btn => {
        btn.onclick = async function () {
            const idx = Number(btn.dataset.idx);
            const row = incomeRows[idx];
            if (confirm('Удалить эту строку?')) {
                try {
                    const res = await fetch(`/objects/${selectedId}/incomes/${row.id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Delete failed');
                    await loadIncomes();
                } catch (e) {
                    alert("Ошибка удаления: " + e.message);
                }
            }
        };
    });
    // Кнопки редактировать
    tbody.querySelectorAll('.income-edit').forEach(btn => {
        btn.onclick = function () {
            const idx = Number(btn.dataset.idx);
            const row = incomeRows[idx];
            document.getElementById('income-date').value = row.date;
            document.getElementById('income-amount').value = formatNumber(row.amount);
            document.getElementById('income-from').value = row.sender || row.from || '';
            document.getElementById('income-to').value = row.receiver || row.to || '';
            document.getElementById('income-comment').value = row.comment;
            document.getElementById('income-edit-index').value = idx;
            document.getElementById('income-modal').dataset.photo = row.photo || '';
            editingIncomeId = row.id;
            document.getElementById('income-modal').style.display = 'flex';
        };
    });
    // Просмотр фото
    tbody.querySelectorAll('.income-photo-view').forEach(img => {
        img.onclick = function () {
            const idx = Number(img.dataset.idx);
            const row = incomeRows[idx];
            if (row.photo) {
                const modal = document.getElementById('photo-modal');
                const modalImg = document.getElementById('photo-modal-img');
                modalImg.src = row.photo;
                modal.style.display = 'flex';
            }
        };
    });
}

document.getElementById('add-income').onclick = function () {
    document.getElementById('income-modal').style.display = 'flex';
    document.getElementById('income-form').reset();
    document.getElementById('income-photo').value = '';
    document.getElementById('income-modal').dataset.photo = '';
    document.getElementById('income-edit-index').value = '';
    document.getElementById('income-date').value = new Date().toISOString().slice(0, 10);
    editingIncomeId = null;
};

// Закрытие модалок (универсальное)
document.querySelectorAll('.modal-close').forEach(btn => {
    btn.onclick = function () {
        btn.closest('.modal').style.display = 'none';
        // Очистка src для фото-модалки
        if (btn.id === 'photo-modal-close') {
            document.getElementById('photo-modal-img').src = '';
        }
    };
});

// Закрытие по клику на фон
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
        if (event.target.id === 'photo-modal') {
            document.getElementById('photo-modal-img').src = '';
        }
    }
};

document.getElementById('income-photo').onchange = function (e) {
    // Предпросмотр не нужен, фото отправляется на сервер
};

document.getElementById('income-form').onsubmit = async function (e) {
    e.preventDefault();
    const date = document.getElementById('income-date').value;
    const amountStr = document.getElementById('income-amount').value;
    const amount = parseNumber(amountStr);
    const sender = document.getElementById('income-from').value;
    const receiver = document.getElementById('income-to').value;
    const comment = document.getElementById('income-comment').value;
    const photoInput = document.getElementById('income-photo');
    // Валидация обязательных полей
    if (!date || isNaN(amount) || amount <= 0) {
        alert('Заполните дату и сумму (число > 0)');
        return false;
    }
    const formData = new FormData();
    formData.append('date', date);
    formData.append('amount', amount);
    formData.append('sender', sender);
    formData.append('receiver', receiver);
    formData.append('comment', comment);
    if (photoInput.files[0]) {
        formData.append('photo', photoInput.files[0]);
    }
    let response;
    try {
        if (editingIncomeId) {
            response = await fetch(`/objects/${selectedId}/incomes/${editingIncomeId}`, {
                method: 'PUT',
                body: formData
            });
        } else {
            response = await fetch(`/objects/${selectedId}/incomes/`, {
                method: 'POST',
                body: formData
            });
        }
        if (!response.ok) {
            const err = await response.text();
            alert('Ошибка: ' + err);
            return false;
        }
    } catch (err) {
        alert('Ошибка сети: ' + err);
        return false;
    }
    document.getElementById('income-modal').style.display = 'none';
    await loadIncomes();
    return false;
};

async function fetchObjects() {
    const res = await fetch('/objects/');
    return res.json();
}

function setActiveTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.tab-content').forEach(div => {
        div.style.display = div.id === 'tab-' + tab ? '' : 'none';
    });
    // Save active tab
    localStorage.setItem('activeTab', tab);

    // Если выбрана вкладка "приход" — обновить данные
    if (tab === 'income') {
        loadIncomes();
    }
}

// Вкладки переключение (инициализация сразу после определения)
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => setActiveTab(btn.dataset.tab);
    });
});

async function renderList() {
    const list = document.getElementById('object-list');
    list.innerHTML = '';
    const objects = await fetchObjects();
    objects.forEach((obj, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${obj.name}`;
        li.dataset.id = obj.id; // Store ID for restoration
        li.onclick = () => {
            selectObject(obj.id, li);
            // Close sidebar on mobile selection
            if (window.innerWidth <= 700) {
                sidebar.classList.remove('open');
                sidebarToggle.style.display = 'block';
            }
        };
        if (obj.id === selectedId) li.classList.add('selected');
        list.appendChild(li);
    });

    // Restore state after list render
    restoreState();
}

function showTabs(show) {
    document.getElementById('tabs-actions-row').style.display = show ? 'flex' : 'none';
    document.querySelectorAll('.tab-content').forEach(div => div.style.display = 'none');
}

function selectObject(id, li) {
    selectedId = id;
    // Save selected object
    localStorage.setItem('selectedId', id);

    document.querySelectorAll('#object-list li').forEach(el => el.classList.remove('selected'));
    if (li) li.classList.add('selected');

    showTabs(true);

    // Restore tab or default to 'income'
    const savedTab = localStorage.getItem('activeTab') || 'income';
    setActiveTab(savedTab);

    loadIncomes().then(() => {
        // Restore scroll position after data load
        const scrollY = localStorage.getItem('scrollY');
        if (scrollY) {
            window.scrollTo(0, parseInt(scrollY));
        }
    });
}

function clearSelection() {
    selectedId = null;
    localStorage.removeItem('selectedId');
    showTabs(false);
    document.querySelectorAll('#object-list li').forEach(el => el.classList.remove('selected'));
}

// --- State Restoration ---
function restoreState() {
    const savedId = localStorage.getItem('selectedId');
    if (savedId) {
        const id = parseInt(savedId);
        // Find list item
        const li = document.querySelector(`#object-list li[data-id="${id}"]`);
        if (li) {
            selectObject(id, li);
        }
    }
}

// Save scroll position on unload
window.addEventListener('beforeunload', () => {
    localStorage.setItem('scrollY', window.scrollY);
});

document.getElementById('add-object').onclick = async () => {
    const name = prompt('Введите имя объекта:');
    if (!name) return;
    await fetch('/objects/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    renderList();
};

document.getElementById('rename-btn').onclick = async () => {
    if (!selectedId) return;
    const name = prompt('Новое имя объекта:');
    if (!name) return;
    await fetch(`/objects/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    renderList();
};

document.getElementById('delete-btn').onclick = async () => {
    if (!selectedId) return;
    if (!confirm('Удалить объект?')) return;
    await fetch(`/objects/${selectedId}`, { method: 'DELETE' });
    clearSelection();
    renderList();
};

// Mobile Sidebar Toggle
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarClose = document.getElementById('sidebar-close');

if (sidebarToggle) {
    sidebarToggle.onclick = function () {
        sidebar.classList.add('open');
        sidebarToggle.style.display = 'none';
    };
}
if (sidebarClose) {
    sidebarClose.onclick = function () {
        sidebar.classList.remove('open');
        // Show toggle button again if on mobile
        if (window.innerWidth <= 700) {
            sidebarToggle.style.display = 'block';
        }
    };
}

// Print Button Logic
document.addEventListener('DOMContentLoaded', () => {
    const printBtn = document.getElementById('download-income');
    if (printBtn) {
        printBtn.onclick = function () {
            // Update header
            const title = document.getElementById('print-title');
            const date = document.getElementById('print-date');
            const objName = document.querySelector('#object-list li.selected')?.textContent || 'Объект';

            if (title) title.textContent = `Отчет: ${objName}`;
            if (date) {
                const now = new Date();
                date.textContent = `Дата формирования: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
            }

            window.print();
        };
    }
});

// При старте скрываем вкладки и кнопки
// clearSelection(); // Don't clear on start, let restoreState handle it
renderList();
