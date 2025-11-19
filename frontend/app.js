
// --- Приход: таблица, модалка, логика через API ---
let incomeRows = [];
let editingIncomeId = null;

async function loadIncomes() {
    if (!selectedId) return;
    const res = await fetch(`/objects/${selectedId}/incomes/`);
    incomeRows = await res.json();
    renderIncomeTable();
}

function renderIncomeTable() {
    const tbody = document.getElementById('income-tbody');
    tbody.innerHTML = '';
    let total = 0;
    incomeRows.forEach((row, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${row.date}</td>
            <td>${row.photo ? `<img src="${row.photo}" class="income-photo-thumb income-photo-view" data-idx="${idx}">` : ''}</td>
            <td>${row.amount}</td>
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
    document.getElementById('income-total').textContent = total;

    // Кнопки удалить
    tbody.querySelectorAll('.income-delete').forEach(btn => {
        btn.onclick = async function() {
            const idx = Number(btn.dataset.idx);
            const row = incomeRows[idx];
            if (confirm('Удалить эту строку?')) {
                await fetch(`/objects/${selectedId}/incomes/${row.id}`, { method: 'DELETE' });
                await loadIncomes();
            }
        };
    });
    // Кнопки редактировать
    tbody.querySelectorAll('.income-edit').forEach(btn => {
        btn.onclick = function() {
            const idx = Number(btn.dataset.idx);
            const row = incomeRows[idx];
            document.getElementById('income-date').value = row.date;
            document.getElementById('income-amount').value = row.amount;
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
        img.onclick = function() {
            const idx = Number(img.dataset.idx);
            const row = incomeRows[idx];
            if (row.photo) {
                document.getElementById('photo-modal-img').src = row.photo;
                document.getElementById('photo-modal').style.display = 'flex';
            }
        };
    });
}

document.getElementById('add-income').onclick = function() {
    document.getElementById('income-modal').style.display = 'flex';
    document.getElementById('income-form').reset();
    document.getElementById('income-photo').value = '';
    document.getElementById('income-modal').dataset.photo = '';
    document.getElementById('income-edit-index').value = '';
    document.getElementById('income-date').value = new Date().toISOString().slice(0,10);
    editingIncomeId = null;
};

document.getElementById('income-modal-close').onclick = function() {
    document.getElementById('income-modal').style.display = 'none';
};

document.getElementById('income-photo').onchange = function(e) {
    // Предпросмотр не нужен, фото отправляется на сервер
};

document.getElementById('income-form').onsubmit = async function(e) {
    e.preventDefault();
    const date = document.getElementById('income-date').value;
    const amount = document.getElementById('income-amount').value;
    const sender = document.getElementById('income-from').value;
    const receiver = document.getElementById('income-to').value;
    const comment = document.getElementById('income-comment').value;
    const photoInput = document.getElementById('income-photo');
    // Валидация обязательных полей
    if (!date || !amount || isNaN(Number(amount))) {
        alert('Заполните дату и сумму (число)');
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

// При старте — отрисовать пустую таблицу
renderIncomeTable();
let selectedId = null;

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
    objects.forEach(obj => {
        const li = document.createElement('li');
        li.textContent = obj.name;
        li.onclick = () => selectObject(obj.id, li);
        if (obj.id === selectedId) li.classList.add('selected');
        list.appendChild(li);
    });
}

function showTabs(show) {
    document.getElementById('tabs-actions-row').style.display = show ? 'flex' : 'none';
    document.querySelectorAll('.tab-content').forEach(div => div.style.display = 'none');
}

function selectObject(id, li) {
    selectedId = id;
    document.querySelectorAll('#object-list li').forEach(el => el.classList.remove('selected'));
    li.classList.add('selected');
    showTabs(true);
    setActiveTab('income'); // Сразу показываем вкладку "приход"
    loadIncomes(); // Загружаем приходы для выбранного объекта
}

function clearSelection() {
    selectedId = null;
    showTabs(false);
    document.querySelectorAll('#object-list li').forEach(el => el.classList.remove('selected'));
}

document.getElementById('add-object').onclick = async () => {
    const name = prompt('Введите имя объекта:');
    if (!name) return;
    await fetch('/objects/', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name})
    });
    renderList();
};

document.getElementById('rename-btn').onclick = async () => {
    if (!selectedId) return;
    const name = prompt('Новое имя объекта:');
    if (!name) return;
    await fetch(`/objects/${selectedId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name})
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

// При старте скрываем вкладки и кнопки
clearSelection();
renderList();
