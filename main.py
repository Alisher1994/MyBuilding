from fastapi.staticfiles import StaticFiles
# Монтируем статику для фронтенда
app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")

# API для объектов
@app.on_event("startup")
async def create_objects_table():
    # Создаём таблицу objects, если не существует
    query = """
    CREATE TABLE IF NOT EXISTS objects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL
    );
    """
    async with app.state.db.acquire() as connection:
        await connection.execute(query)

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
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
import asyncpg
import os
import shutil

app = FastAPI()

DATABASE_URL = os.getenv("DATABASE_URL")
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class Item(BaseModel):
    name: str
    description: str
    photo_filename: str = None

@app.on_event("startup")
async def startup():
    app.state.db = await asyncpg.create_pool(DATABASE_URL)

@app.on_event("shutdown")
async def shutdown():
    await app.state.db.close()

@app.get("/", response_class=HTMLResponse)
async def read_root():
    # Получаем все записи
    query = "SELECT id, name, description FROM items;"
    async with app.state.db.acquire() as connection:
        rows = await connection.fetch(query)
    # Формируем HTML-страницу
    html = """
    <html>
    <body>
    <h2>Загрузка текста и фото</h2>
    <form action='/upload' enctype='multipart/form-data' method='post'>
      <input name='name' type='text' placeholder='Введите текст'><br><br>
      <input name='photo' type='file'><br><br>
      <input type='submit'>
    </form>
    <h2>Список загруженных записей</h2>
    <ul>
    """
    for row in rows:
        # Пытаемся извлечь имя файла из description
        photo = ""
        if row["description"].startswith("Фото: "):
            photo = row["description"][6:]
        if photo:
            html += f'<li>{row["name"]} — <a href="/uploads/{photo}" target="_blank">{photo}</a></li>'
        else:
            html += f'<li>{row["name"]}</li>'
    html += """
    </ul>
    </body>
    </html>
    """
    return html
# Эндпоинт для отдачи файлов из папки uploads
@app.get("/uploads/{filename}")
def get_uploaded_file(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    return FileResponse(file_path)

@app.post("/upload")
async def upload(name: str = Form(...), photo: UploadFile = File(...)):
    # Сохраняем фото в папку uploads
    photo_path = os.path.join(UPLOAD_DIR, photo.filename)
    with open(photo_path, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)
    # Сохраняем запись в БД
    query = "INSERT INTO items (name, description) VALUES ($1, $2) RETURNING id;"
    description = f"Фото: {photo.filename}"
    async with app.state.db.acquire() as connection:
        item_id = await connection.fetchval(query, name, description)
    return {"id": item_id, "name": name, "photo_filename": photo.filename}

@app.get("/items/")
async def read_items():
    query = "SELECT id, name, description FROM items;"
    async with app.state.db.acquire() as connection:
        rows = await connection.fetch(query)
    return [{"id": row["id"], "name": row["name"], "description": row["description"]} for row in rows]
