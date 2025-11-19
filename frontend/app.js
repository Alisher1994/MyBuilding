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
    document.getElementById('tabs').style.display = show ? '' : 'none';
}

function selectObject(id, li) {
    selectedId = id;
    document.querySelectorAll('#object-list li').forEach(el => el.classList.remove('selected'));
    li.classList.add('selected');
    document.getElementById('object-actions').style.display = '';
    showTabs(true);
    setActiveTab && setActiveTab('analysis');
}

function clearSelection() {
    selectedId = null;
    document.getElementById('object-actions').style.display = 'none';
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
