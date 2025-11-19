
# === Импорты и инициализация приложения ===
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import asyncpg
import os
import shutil
from typing import List
from datetime import date as dtdate
import re

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

@app.post("/objects/{object_id}/incomes/")
async def add_income(object_id: int, date: str = Form(...), amount: float = Form(...), sender: str = Form(...), receiver: str = Form(...), comment: str = Form(""), photo: UploadFile = File(None)):
    try:
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
        raise HTTPException(status_code=500, detail=f"{e}\n{tb}")

@app.put("/objects/{object_id}/incomes/{income_id}")
async def update_income(object_id: int, income_id: int, date: str = Form(...), amount: float = Form(...), sender: str = Form(...), receiver: str = Form(...), comment: str = Form(""), photo: UploadFile = File(None)):
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
    query = """
        UPDATE incomes SET date=$1, photo=$2, amount=$3, sender=$4, receiver=$5, comment=$6
        WHERE id=$7 AND object_id=$8
        RETURNING id, date, photo, amount, sender, receiver, comment;
    """
    async with app.state.db.acquire() as connection:
        row = await connection.fetchrow(query, date, photo_path, amount, sender, receiver, comment, income_id, object_id)
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
async def create_objects_table():
    # Создаём таблицу objects, если не существует
    query = """
    CREATE TABLE IF NOT EXISTS objects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL
    );
    """
    # Также создаём pool для БД
    app.state.db = await asyncpg.create_pool(DATABASE_URL)
    async with app.state.db.acquire() as connection:
        await connection.execute(query)

@app.on_event("shutdown")
async def shutdown():
    await app.state.db.close()

@app.get("/objects/")
async def get_objects():
    query = "SELECT id, name FROM objects ORDER BY id;"
    async with app.state.db.acquire() as connection:
        rows = await connection.fetch(query)
    return [{"id": row["id"], "name": row["name"]} for row in rows]

@app.post("/objects/")
async def add_object(data: dict):
    name = data.get("name", "Новый объект")
    query = "INSERT INTO objects (name) VALUES ($1) RETURNING id, name;"
    async with app.state.db.acquire() as connection:
        row = await connection.fetchrow(query, name)
    return {"id": row["id"], "name": row["name"]}

@app.put("/objects/{object_id}")
async def rename_object(object_id: int, data: dict):
    name = data.get("name", "")
    if not name:
        raise HTTPException(status_code=400, detail="Имя не может быть пустым")
    query = "UPDATE objects SET name=$1 WHERE id=$2 RETURNING id, name;"
    async with app.state.db.acquire() as connection:
        row = await connection.fetchrow(query, name, object_id)
    if not row:
        raise HTTPException(status_code=404, detail="Объект не найден")
    return {"id": row["id"], "name": row["name"]}

@app.delete("/objects/{object_id}")
async def delete_object(object_id: int):
    query = "DELETE FROM objects WHERE id=$1 RETURNING id;"
    async with app.state.db.acquire() as connection:
        row = await connection.fetchrow(query, object_id)
    if not row:
        raise HTTPException(status_code=404, detail="Объект не найден")
    return {"status": "deleted"}

@app.get("/")
def root_redirect():
    return RedirectResponse(url="/frontend/index.html")

