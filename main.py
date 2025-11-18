from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import HTMLResponse
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
def read_root():
    return """
    <html>
    <body>
    <h2>Загрузка текста и фото</h2>
    <form action='/upload' enctype='multipart/form-data' method='post'>
      <input name='name' type='text' placeholder='Введите текст'><br><br>
      <input name='photo' type='file'><br><br>
      <input type='submit'>
    </form>
    </body>
    </html>
    """

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
