# === Импорты ===
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import asyncpg
import os
import shutil

# === Инициализация приложения ===
app = FastAPI()

DATABASE_URL = os.getenv("DATABASE_URL")
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Монтируем статику для фронтенда
app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")

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

