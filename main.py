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
