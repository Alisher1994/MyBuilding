// --- Приход: таблица, модалка, логика ---
const incomeRows = [];

function renderIncomeTable() {
    const tbody = document.getElementById('income-tbody');
    tbody.innerHTML = '';
    let total = 0;
    incomeRows.forEach((row, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${row.date}</td>
            <td>${row.photo ? `<img src="${row.photo}" class="income-photo-thumb">` : ''}</td>
            <td>${row.amount}</td>
            <td>${row.from}</td>
            <td>${row.to}</td>
            <td>${row.comment || ''}</td>
        `;
        tbody.appendChild(tr);
        total += Number(row.amount) || 0;
    });
    document.getElementById('income-total').textContent = total;
}

// Открытие модалки
document.getElementById('add-income').onclick = function() {
    document.getElementById('income-modal').style.display = 'flex';
    // Дата по умолчанию сегодня
    document.getElementById('income-date').value = new Date().toISOString().slice(0,10);
    document.getElementById('income-form').reset();
    document.getElementById('income-photo').value = '';
    document.getElementById('income-modal').dataset.photo = '';
};

// Закрытие модалки
document.getElementById('income-modal-close').onclick = function() {
    document.getElementById('income-modal').style.display = 'none';
};

// Предпросмотр фото (base64)
document.getElementById('income-photo').onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        document.getElementById('income-modal').dataset.photo = ev.target.result;
    };
    reader.readAsDataURL(file);
};

// Сохранение новой строки
document.getElementById('income-form').onsubmit = function(e) {
    e.preventDefault();
    const date = document.getElementById('income-date').value;
    const amount = document.getElementById('income-amount').value;
    const from = document.getElementById('income-from').value;
    const to = document.getElementById('income-to').value;
    const comment = document.getElementById('income-comment').value;
    const photo = document.getElementById('income-modal').dataset.photo || '';
    incomeRows.push({ date, amount, from, to, comment, photo });
    renderIncomeTable();
    document.getElementById('income-modal').style.display = 'none';
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
    setActiveTab('analysis');
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
