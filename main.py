
# === Импорты и инициализация приложения ===
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Request
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import asyncpg
import os
import shutil
import time
from typing import List
from datetime import date as dtdate
import re
import tempfile
import subprocess
import shutil

app = FastAPI()
DATABASE_URL = os.getenv("DATABASE_URL")
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# === Модели для приходов ===
class IncomeIn(BaseModel):
    date: str
    amount: float
    sender: str
    receiver: str
    comment: str = ""


@app.get("/objects/{object_id}/incomes/")
async def get_incomes(object_id: int):
    try:
        query = "SELECT id, date, photo, amount, sender, receiver, comment FROM incomes WHERE object_id=$1 ORDER BY id;"
        async with app.state.db.acquire() as connection:
            rows = await connection.fetch(query, object_id)
        return [
            {
                "id": row["id"],
                "date": row["date"].isoformat() if row["date"] else None,
                "photo": row["photo"],
                "amount": float(row["amount"]),
                "sender": row["sender"],
                "receiver": row["receiver"],
                "comment": row["comment"]
            } for row in rows
        ]
    except Exception as e:
        print(f"Error in get_incomes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/health')
async def health():
    """Simple health check that verifies DB connection."""
    try:
        async with app.state.db.acquire() as conn:
            await conn.fetchval('SELECT 1')
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/uploads/list')
async def uploads_list():
    """Return a list of files currently present in the uploads directory (diagnostic)."""
    try:
        files = []
        for fn in os.listdir(UPLOAD_DIR):
            path = os.path.join(UPLOAD_DIR, fn)
            if os.path.isfile(path):
                files.append(fn)
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/objects/{object_id}/incomes/")
async def add_income(object_id: int, date: str = Form(...), amount: float = Form(...), sender: str = Form(...), receiver: str = Form(...), comment: str = Form(""), photo: UploadFile = File(None)):
    try:
        print(f"Adding income for object {object_id}. Date: {date}, Amount: {amount}, Photo: {photo.filename if photo else 'None'}")
        from datetime import date as dtdateclass
        photo_path = None
        if photo:
            # sanitize filename
            orig = os.path.basename(photo.filename)
            safe = re.sub(r'[^A-Za-z0-9_.-]', '_', orig)
            fname = f"income_{object_id}_{int(dtdate.today().strftime('%Y%m%d'))}_{safe}"
            dest = os.path.join(UPLOAD_DIR, fname)
            with open(dest, "wb") as f:
                shutil.copyfileobj(photo.file, f)
            photo_path = f"/uploads/{fname}"
            # log saved file for debugging
            print(f"Saved upload: {dest} -> {photo_path}")
        # Преобразуем строку date в объект datetime.date
        try:
            date_obj = dtdateclass.fromisoformat(date)
        except Exception:
            raise HTTPException(status_code=400, detail="Некорректный формат даты (ожидается YYYY-MM-DD)")
        query = """
            INSERT INTO incomes (object_id, date, photo, amount, sender, receiver, comment)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, date, photo, amount, sender, receiver, comment;
        """
        async with app.state.db.acquire() as connection:
            row = await connection.fetchrow(query, object_id, date_obj, photo_path, amount, sender, receiver, comment)
        return {
            "id": row["id"],
            "date": row["date"].isoformat() if row["date"] else None,
            "photo": row["photo"],
            "amount": float(row["amount"]),
            "sender": row["sender"],
            "receiver": row["receiver"],
            "comment": row["comment"]
        }
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"Error in add_income: {e}\n{tb}")
        raise HTTPException(status_code=500, detail=f"{e}\n{tb}")


@app.get('/objects/{object_id}/analysis_photos/')
async def list_analysis_photos(object_id: int):
    try:
        async with app.state.db.acquire() as conn:
            rows = await conn.fetch("SELECT id, file_path FROM object_analysis_photos WHERE object_id=$1 ORDER BY id", object_id)
        return [{"id": r["id"], "url": r["file_path"]} for r in rows]
    except Exception as e:
        print(f"Error listing analysis photos: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/objects/{object_id}/analysis_photos/')
async def upload_analysis_photo(object_id: int, photo: UploadFile = File(...)):
    """Save an analysis photo to uploads, insert DB record and return id+url."""
    try:
        orig = os.path.basename(photo.filename)
        safe = re.sub(r'[^A-Za-z0-9_.-]', '_', orig)
        fname = f"analysis_{object_id}_{int(time.time())}_{safe}"
        dest = os.path.join(UPLOAD_DIR, fname)
        with open(dest, 'wb') as f:
            shutil.copyfileobj(photo.file, f)
        url = f"/uploads/{fname}"
        # Insert into DB
        async with app.state.db.acquire() as conn:
            row = await conn.fetchrow("INSERT INTO object_analysis_photos (object_id, file_path) VALUES ($1, $2) RETURNING id, file_path", object_id, url)
        return {"id": row["id"], "url": row["file_path"]}
    except Exception as e:
        print(f"Error saving analysis photo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete('/objects/{object_id}/analysis_photos/{photo_id}')
async def delete_analysis_photo(object_id: int, photo_id: int):
    try:
        async with app.state.db.acquire() as conn:
            row = await conn.fetchrow("SELECT file_path FROM object_analysis_photos WHERE id=$1 AND object_id=$2", photo_id, object_id)
            if not row:
                raise HTTPException(status_code=404, detail='Photo not found')
            file_path = row['file_path']
            # Delete DB row
            await conn.execute("DELETE FROM object_analysis_photos WHERE id=$1", photo_id)
        # Remove file from disk if exists
        if file_path and file_path.startswith('/uploads/'):
            fn = file_path.replace('/uploads/', '')
            dest = os.path.join(UPLOAD_DIR, fn)
            try:
                if os.path.exists(dest):
                    os.remove(dest)
            except Exception as e:
                print(f"Failed to remove file {dest}: {e}")
        return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting analysis photo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/export/analysis/pdf')
async def export_analysis_pdf(request: Request):
    """Accept an HTML payload (text/html in body or JSON {html: ...}) and attempt to produce a PDF using wkhtmltopdf.
    If wkhtmltopdf is not available, return the HTML as-is with a 501 message explaining server-side PDF is unavailable.
    """
    try:
        content_type = request.headers.get('content-type', '')
        if 'application/json' in content_type:
            payload = await request.json()
            html = payload.get('html', '')
        else:
            html = await request.body()
            html = html.decode('utf-8')

        wk = shutil.which('wkhtmltopdf')
        if not wk:
            # Not installed; return HTML with informative header
            return HTMLResponse(content=html, status_code=501)

        # Insert logo into HTML (top-right corner) if file exists
        try:
            logo_rel = os.path.join('frontend', 'assets', 'design_key.png')
            logo_abs = os.path.abspath(logo_rel)
            if os.path.exists(logo_abs):
                # Use file:// URL for wkhtmltopdf to embed local file
                logo_src = 'file://' + logo_abs.replace('\\', '/')
                # CSS for positioning the logo in PDF
                style_block = """
<style>
  .pdf-logo { position: fixed; top: 10px; right: 10px; width: 64px; height: auto; opacity: 0.95; z-index: 9999; }
</style>
"""
                # Insert style into <head> or at the top
                if re.search(r"<head[^>]*>", html, flags=re.IGNORECASE):
                    html = re.sub(r"(<head[^>]*>)", r"\1\n" + style_block, html, flags=re.IGNORECASE)
                else:
                    html = style_block + html

                # Prepare img tag
                img_tag = f"<img class=\"pdf-logo\" src=\"{logo_src}\" alt=\"logo\">"
                # Insert right after opening <body> if present, otherwise prepend
                if re.search(r"<body[^>]*>", html, flags=re.IGNORECASE):
                    html = re.sub(r"(<body[^>]*>)", r"\1\n" + img_tag, html, flags=re.IGNORECASE)
                else:
                    html = img_tag + html
        except Exception as e:
            print(f"Logo injection failed: {e}")

        # Create temp files
        with tempfile.NamedTemporaryFile(prefix='report_', suffix='.html', delete=False, mode='w', encoding='utf-8') as tf:
            tf.write(html)
            html_path = tf.name
        pdf_fd, pdf_path = tempfile.mkstemp(suffix='.pdf')
        os.close(pdf_fd)

        cmd = [wk, html_path, pdf_path]
        subprocess.check_call(cmd)

        return FileResponse(pdf_path, media_type='application/pdf', filename='analysis_report.pdf')
    except subprocess.CalledProcessError as e:
        print(f"wkhtmltopdf failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Error in export_analysis_pdf: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/objects/{object_id}/incomes/{income_id}")
async def update_income(object_id: int, income_id: int, date: str = Form(...), amount: float = Form(...), sender: str = Form(...), receiver: str = Form(...), comment: str = Form(""), photo: UploadFile = File(None)):
    try:
        print(f"Updating income {income_id} for object {object_id}. Photo: {photo.filename if photo else 'None'}")
        from datetime import date as dtdateclass
        # Получаем старую запись для удаления старого фото, если нужно
        old_photo = None
        async with app.state.db.acquire() as connection:
            old = await connection.fetchrow("SELECT photo FROM incomes WHERE id=$1 AND object_id=$2", income_id, object_id)
            if old:
                old_photo = old["photo"]
        photo_path = old_photo
        if photo:
            # sanitize filename for update flow
            orig = os.path.basename(photo.filename)
            safe = re.sub(r'[^A-Za-z0-9_.-]', '_', orig)
            fname = f"income_{object_id}_{int(dtdate.today().strftime('%Y%m%d'))}_{safe}"
            dest = os.path.join(UPLOAD_DIR, fname)
            with open(dest, "wb") as f:
                shutil.copyfileobj(photo.file, f)
            photo_path = f"/uploads/{fname}"
            print(f"Saved upload (update): {dest} -> {photo_path}")
            # optionally: remove old file
        # Parse date string to date object
        try:
            date_obj = dtdateclass.fromisoformat(date)
        except Exception:
            raise HTTPException(status_code=400, detail="Некорректный формат даты (ожидается YYYY-MM-DD)")
        query = """
            UPDATE incomes SET date=$1, photo=$2, amount=$3, sender=$4, receiver=$5, comment=$6
            WHERE id=$7 AND object_id=$8
            RETURNING id, date, photo, amount, sender, receiver, comment;
        """
        async with app.state.db.acquire() as connection:
            row = await connection.fetchrow(query, date_obj, photo_path, amount, sender, receiver, comment, income_id, object_id)
        if not row:
            raise HTTPException(status_code=404, detail="Строка не найдена")
        return {
            "id": row["id"],
            "date": row["date"].isoformat() if row["date"] else None,
            "photo": row["photo"],
            "amount": float(row["amount"]),
            "sender": row["sender"],
            "receiver": row["receiver"],
            "comment": row["comment"]
        }
    except Exception as e:
        print(f"Error in update_income: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/objects/{object_id}/incomes/{income_id}")
async def delete_income(object_id: int, income_id: int):
    query = "DELETE FROM incomes WHERE id=$1 AND object_id=$2 RETURNING id;"
    async with app.state.db.acquire() as connection:
        row = await connection.fetchrow(query, income_id, object_id)
    if not row:
        raise HTTPException(status_code=404, detail="Строка не найдена")
    return {"status": "deleted"}

# === API для объектов ===
@app.on_event("startup")
async def create_tables():
    # Создаём pool для БД
    app.state.db = await asyncpg.create_pool(DATABASE_URL)
    
    async with app.state.db.acquire() as connection:
        # Таблица objects
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS objects (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL
            );
        """)
        # Ensure additional optional columns exist for Analysis metadata
        # (start_date, end_date, area) - add if missing
        await connection.execute("ALTER TABLE objects ADD COLUMN IF NOT EXISTS start_date DATE;")
        await connection.execute("ALTER TABLE objects ADD COLUMN IF NOT EXISTS end_date DATE;")
        await connection.execute("ALTER TABLE objects ADD COLUMN IF NOT EXISTS area NUMERIC(15,3) DEFAULT 0;")
        
        # Таблица budget_stages (этапы)
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS budget_stages (
                id SERIAL PRIMARY KEY,
                object_id INTEGER NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                order_index INTEGER NOT NULL DEFAULT 0,
                collapsed BOOLEAN DEFAULT FALSE
            );
        """)
        
        # Таблица budget_work_types (виды работ)
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS budget_work_types (
                id SERIAL PRIMARY KEY,
                stage_id INTEGER NOT NULL REFERENCES budget_stages(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                unit TEXT DEFAULT 'шт',
                quantity NUMERIC(15,3) DEFAULT 0,
                order_index INTEGER NOT NULL DEFAULT 0,
                collapsed BOOLEAN DEFAULT FALSE
            );
        """)
        
        # Таблица budget_resources (ресурсы)
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS budget_resources (
                id SERIAL PRIMARY KEY,
                work_type_id INTEGER NOT NULL REFERENCES budget_work_types(id) ON DELETE CASCADE,
                photo TEXT,
                resource_type TEXT NOT NULL,
                name TEXT NOT NULL,
                unit TEXT DEFAULT 'шт',
                quantity NUMERIC(15,3) DEFAULT 0,
                price NUMERIC(15,2) DEFAULT 0,
                supplier TEXT,
                order_index INTEGER NOT NULL DEFAULT 0
            );
        """)
        
        # Таблица resource_expenses (фактические расходы по ресурсам)
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS resource_expenses (
                id SERIAL PRIMARY KEY,
                resource_id INTEGER NOT NULL REFERENCES budget_resources(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                actual_quantity NUMERIC(15,3) NOT NULL,
                actual_price NUMERIC(15,2) NOT NULL,
                receipt_photo_1 TEXT,
                receipt_photo_2 TEXT,
                receipt_photo_3 TEXT,
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Таблица для фото, загружаемых в разделе Анализ
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS object_analysis_photos (
                id SERIAL PRIMARY KEY,
                object_id INTEGER NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
                file_path TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Таблица для share токенов (постоянные ссылки на объекты)
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS share_tokens (
                id SERIAL PRIMARY KEY,
                object_id INTEGER NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
                token TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

@app.on_event("shutdown")
async def shutdown():
    await app.state.db.close()

@app.get("/objects/")
async def get_objects():
    query = "SELECT id, name FROM objects ORDER BY id;"
    async with app.state.db.acquire() as connection:
        rows = await connection.fetch(query)
    return [{"id": row["id"], "name": row["name"]} for row in rows]


@app.get('/objects/{object_id}')
async def get_object(object_id: int):
    query = "SELECT id, name, start_date, end_date, area FROM objects WHERE id=$1;"
    async with app.state.db.acquire() as connection:
        row = await connection.fetchrow(query, object_id)
    if not row:
        raise HTTPException(status_code=404, detail='Объект не найден')
    return {
        'id': row['id'],
        'name': row['name'],
        'start_date': row['start_date'].isoformat() if row['start_date'] else None,
        'end_date': row['end_date'].isoformat() if row['end_date'] else None,
        'area': float(row['area']) if row['area'] is not None else 0
    }

@app.post("/objects/")
async def add_object(data: dict):
    name = data.get("name", "Новый объект")
    query = "INSERT INTO objects (name) VALUES ($1) RETURNING id, name;"
    async with app.state.db.acquire() as connection:
        row = await connection.fetchrow(query, name)
    return {"id": row["id"], "name": row["name"]}

@app.put("/objects/{object_id}")
async def update_object(object_id: int, data: dict):
    # Accepts partial updates: name, startDate, endDate, area
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail='Invalid payload')
    fields = []
    params = []
    idx = 1
    # map incoming keys to DB columns
    if 'name' in data:
        if not data.get('name'):
            raise HTTPException(status_code=400, detail='Имя не может быть пустым')
        fields.append(f"name=${idx}")
        params.append(data.get('name'))
        idx += 1
    if 'startDate' in data or 'start_date' in data:
        sd = data.get('startDate') or data.get('start_date')
        fields.append(f"start_date=${idx}")
        params.append(sd or None)
        idx += 1
    if 'endDate' in data or 'end_date' in data:
        ed = data.get('endDate') or data.get('end_date')
        fields.append(f"end_date=${idx}")
        params.append(ed or None)
        idx += 1
    if 'area' in data:
        try:
            area = float(data.get('area') or 0)
        except Exception:
            raise HTTPException(status_code=400, detail='Некорректная площадь')
        fields.append(f"area=${idx}")
        params.append(area)
        idx += 1

    if not fields:
        raise HTTPException(status_code=400, detail='Нет полей для обновления')

    set_clause = ','.join(fields)
    query = f"UPDATE objects SET {set_clause} WHERE id=${idx} RETURNING id, name, start_date, end_date, area;"
    params.append(object_id)
    async with app.state.db.acquire() as connection:
        row = await connection.fetchrow(query, *params)
    if not row:
        raise HTTPException(status_code=404, detail='Объект не найден')
    return {
        'id': row['id'],
        'name': row['name'],
        'start_date': row['start_date'].isoformat() if row['start_date'] else None,
        'end_date': row['end_date'].isoformat() if row['end_date'] else None,
        'area': float(row['area']) if row['area'] is not None else 0
    }

@app.delete("/objects/{object_id}")
async def delete_object(object_id: int):
    query = "DELETE FROM objects WHERE id=$1 RETURNING id;"
    async with app.state.db.acquire() as connection:
        row = await connection.fetchrow(query, object_id)
    if not row:
        raise HTTPException(status_code=404, detail="Объект не найден")
    return {"status": "deleted"}

# === Share Token Endpoints ===
@app.post("/objects/{object_id}/share")
async def generate_share_token(object_id: int):
    """Generate or retrieve permanent share token for readonly access to object."""
    import secrets
    try:
        async with app.state.db.acquire() as conn:
            # Check if token already exists
            existing = await conn.fetchrow("SELECT token FROM share_tokens WHERE object_id=$1", object_id)
            if existing:
                return {"token": existing["token"], "url": f"/share/{existing['token']}"}
            # Generate new token
            token = secrets.token_urlsafe(16)
            await conn.execute("INSERT INTO share_tokens (object_id, token) VALUES ($1, $2)", object_id, token)
            return {"token": token, "url": f"/share/{token}"}
    except Exception as e:
        print(f"Error generating share token: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/share/{token}", response_class=HTMLResponse)
async def share_view(token: str):
    """Readonly view of shared object - serves static HTML with embedded data."""
    try:
        async with app.state.db.acquire() as conn:
            share = await conn.fetchrow("SELECT object_id FROM share_tokens WHERE token=$1", token)
            if not share:
                return HTMLResponse("<h1>Ссылка не найдена</h1>", status_code=404)
            object_id = share["object_id"]
            
            # Fetch object info
            obj = await conn.fetchrow("SELECT id, name FROM objects WHERE id=$1", object_id)
            if not obj:
                return HTMLResponse("<h1>Объект не найден</h1>", status_code=404)
            
        # Return minimal HTML that loads app in readonly mode with disabled editing
        html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{obj['name']} - Просмотр</title>
    <link rel="stylesheet" href="/frontend/style.css">
    <link rel="stylesheet" href="/frontend/budget.css">
    <link rel="stylesheet" href="/frontend/expense.css">
    <link rel="stylesheet" href="/frontend/analysis.css">
    <style>
        /* Complete readonly mode - disable all editing */
        body {{
            pointer-events: auto;
            display: flex;
            flex-direction: column;
            overflow-x: hidden;
        }}
        
        /* Hide all edit controls and sidebar completely */
        .icon-btn,
        #object-actions,
        #add-object,
        .btn-add,
        .btn-delete,
        .btn-icon,
        input[type="file"],
        .modal:not(#photo-modal),
        .sidebar,
        .sidebar-close,
        .sidebar-toggle,
        .collapse-btn,
        .income-edit,
        .income-delete,
        .photo-overlay,
        .tab-actions,
        .btn-save-row,
        .btn-upload-photo,
        .res-photo-delete,
        .add-receipt-box,
        .add-row,
        button[title="Сохранить"],
        button[title="Удалить фото"] {{
            display: none !important;
            visibility: hidden !important;
        }}
        
        /* Allow photo modal for viewing */
        #photo-modal {{
            display: none;
        }}
        
        /* Keep photo thumbnails visible for viewing (but clickable to open) */
        .res-photo-thumb,
        .res-photo-view,
        .expense-photo-thumb,
        .receipt-thumb-box {{
            display: inline-block !important;
            visibility: visible !important;
            cursor: pointer !important;
        }}
        
        .receipt-thumb-box.add-receipt-box {{
            display: none !important;
        }}
        
        /* Disable editing on all text elements */
        .editable,
        .editable-select,
        .stage-name,
        .wt-name,
        .wt-unit,
        .wt-quantity,
        .res-name,
        .res-type,
        .res-unit,
        .res-quantity,
        .res-price,
        .res-supplier,
        .object-name {{
            cursor: default !important;
            pointer-events: none !important;
            user-select: text !important;
        }}
        
        /* Disable hover effects */
        .editable:hover,
        .editable-select:hover,
        .stage-name:hover,
        .wt-name:hover,
        .res-name:hover {{
            background: transparent !important;
        }}
        
        /* Make inputs readonly visually */
        input[type="number"],
        input[type="date"],
        input[type="text"],
        textarea,
        select {{
            pointer-events: none !important;
            background: #f9f9f9 !important;
            border-color: #e0e0e0 !important;
            cursor: default !important;
        }}
        
        /* Ensure main content takes full width without sidebar */
        .main-content {{
            margin-left: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            flex: 1;
        }}
        
        /* Center content container */
        .tab-content {{
            max-width: 1400px;
            margin: 0 auto;
            padding: 24px;
        }}
        
        /* Horizontal scroll for tables on mobile */
        .income-table-wrap,
        .budget-stage,
        .budget-work-types-container,
        .budget-resources-container,
        .expense-resource-container,
        .expense-history-table {{
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
        }}
        
        /* Ensure tables maintain their width */
        .income-table,
        .budget-work-type-header,
        .budget-resource,
        .expense-history-table table {{
            min-width: 800px !important;
        }}
        
        /* Mobile responsive adjustments */
        @media (max-width: 768px) {{
            .tab-content {{
                padding: 12px;
            }}
            
            /* Make all table containers scrollable */
            .income-table-wrap,
            .budget-stage,
            .expense-resource-container {{
                overflow-x: auto !important;
                -webkit-overflow-scrolling: touch !important;
                width: 100% !important;
            }}
            
            /* Scrollbar styling for mobile */
            .income-table-wrap::-webkit-scrollbar,
            .budget-stage::-webkit-scrollbar,
            .expense-resource-container::-webkit-scrollbar {{
                height: 8px;
            }}
            
            .income-table-wrap::-webkit-scrollbar-thumb,
            .budget-stage::-webkit-scrollbar-thumb,
            .expense-resource-container::-webkit-scrollbar-thumb {{
                background: #888;
                border-radius: 4px;
            }}
        }}
        
        .readonly-banner {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            padding: 16px 20px;
            text-align: center;
            font-weight: 600;
            color: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            font-size: 16px;
        }}
        
        #tabs-actions-row {{
            padding: 0 24px;
            height: 60px;
        }}
    </style>
</head>
<body>
    <div class="readonly-banner">🔒 Режим просмотра — {obj['name']}</div>
    <div class="main-content">
        <div id="tabs-actions-row" style="display:flex; align-items:center;">
            <div id="tabs" style="margin-top:30px;">
                <div class="tabs-header">
                    <button class="tab-btn active" data-tab="analysis">Анализ</button>
                    <button class="tab-btn" data-tab="income">Приход</button>
                    <button class="tab-btn" data-tab="budget">Бюджет</button>
                    <button class="tab-btn" data-tab="expense">Расход</button>
                </div>
            </div>
        </div>
        <div id="tab-analysis" class="tab-content"><div id="analysis-container"></div></div>
        <div id="tab-income" class="tab-content" style="display:none;">
            <div class="income-table-wrap">
                <table class="income-table">
                    <thead><tr><th>№</th><th>Дата</th><th>Фото</th><th>Сумма</th><th>Кто передал</th><th>Кто получил</th><th>Комментарии</th></tr></thead>
                    <tbody id="income-tbody"></tbody>
                    <tfoot><tr><td colspan="3" style="text-align:right;font-weight:600;">Итого:</td><td id="income-total" style="font-weight:600;">0</td><td colspan="3"></td></tr></tfoot>
                </table>
            </div>
        </div>
        <div id="tab-budget" class="tab-content" style="display:none;"><div id="budget-container"></div></div>
        <div id="tab-expense" class="tab-content" style="display:none;"><div id="expense-container"></div></div>
    </div>
    <script>
        const READONLY_MODE = true;
        const SHARED_OBJECT_ID = {object_id};
        let selectedId = {object_id};
        
        // Disable all click events on editable elements
        document.addEventListener('click', function(e) {{
            if (e.target.classList.contains('editable') || 
                e.target.classList.contains('editable-select') ||
                e.target.classList.contains('stage-name') ||
                e.target.classList.contains('wt-name') ||
                e.target.classList.contains('res-name')) {{
                e.preventDefault();
                e.stopPropagation();
                return false;
            }}
        }}, true);
        
        // Override inline editing functions
        window.enableInlineEdit = function() {{ return false; }};
        window.saveInlineEdit = function() {{ return false; }};
    </script>
    <script src="/frontend/app.js"></script>
    <script src="/frontend/budget.js"></script>
    <script src="/frontend/expense.js"></script>
    <script src="/frontend/analysis.js"></script>
    <script>
        // Auto-load data for shared object
        document.addEventListener('DOMContentLoaded', () => {{
            if (window.loadAnalysis) window.loadAnalysis({object_id});
            
            document.querySelectorAll('.tab-btn').forEach(btn => {{
                btn.onclick = () => {{
                    const tab = btn.dataset.tab;
                    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    document.querySelectorAll('.tab-content').forEach(div => div.style.display = 'none');
                    document.getElementById('tab-' + tab).style.display = '';
                    
                    if (tab === 'income') {{
                        fetch(`/objects/{object_id}/incomes/`).then(r => r.json()).then(data => {{
                            const tbody = document.getElementById('income-tbody');
                            tbody.innerHTML = '';
                            let total = 0;
                            data.forEach((row, idx) => {{
                                const tr = document.createElement('tr');
                                const photoHtml = row.photo ? `<img src="${{row.photo}}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;" alt="Фото">` : '';
                                tr.innerHTML = `<td>${{idx + 1}}</td><td>${{row.date}}</td><td>${{photoHtml}}</td><td>${{row.amount.toLocaleString()}}</td><td>${{row.sender}}</td><td>${{row.receiver}}</td><td>${{row.comment}}</td>`;
                                tbody.appendChild(tr);
                                total += row.amount;
                            }});
                            document.getElementById('income-total').textContent = total.toLocaleString();
                        }});
                    }} else if (tab === 'budget' && window.loadBudget) {{
                        window.loadBudget({object_id});
                    }} else if (tab === 'expense' && window.loadExpenses) {{
                        window.loadExpenses({object_id});
                    }}
                }};
            }});
            
            // Disable all inputs after page loads
            setTimeout(() => {{
                document.querySelectorAll('input, textarea, select').forEach(el => {{
                    el.setAttribute('readonly', 'readonly');
                    el.setAttribute('disabled', 'disabled');
                    el.style.pointerEvents = 'none';
                }});
            }}, 500);
        }});
    </script>
</body>
</html>"""
        return HTMLResponse(html)
    except Exception as e:
        print(f"Error in share_view: {e}")
        return HTMLResponse(f"<h1>Ошибка: {str(e)}</h1>", status_code=500)

@app.get("/")
async def root_redirect():
    return RedirectResponse(url="/frontend/index.html")

# === Budget API ===
exec(open("budget_api.py", encoding="utf-8").read())

# === Expense API ===
exec(open("expense_api.py", encoding="utf-8").read())

