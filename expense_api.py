# === Expense API Endpoints ===

# Get budget tree with expense data
@app.get("/objects/{object_id}/expenses/tree")
async def get_expenses_tree(object_id: int):
    """Получить дерево бюджета с данными о расходах"""
    async with app.state.db.acquire() as conn:
        # Получаем этапы
        stages = await conn.fetch(
            "SELECT * FROM budget_stages WHERE object_id=$1 ORDER BY order_index",
            object_id
        )
        
        result = []
        for stage in stages:
            stage_dict = dict(stage)
            
            # Получаем виды работ для этапа
            work_types = await conn.fetch(
                "SELECT * FROM budget_work_types WHERE stage_id=$1 ORDER BY order_index",
                stage['id']
            )
            
            stage_dict['work_types'] = []
            for wt in work_types:
                wt_dict = dict(wt)
                
                # Получаем ресурсы для вида работ
                resources = await conn.fetch(
                    "SELECT * FROM budget_resources WHERE work_type_id=$1 ORDER BY order_index",
                    wt['id']
                )
                
                wt_dict['resources'] = []
                for res in resources:
                    res_dict = dict(res)
                    
                    # Получаем расходы для ресурса
                    expenses = await conn.fetch(
                        "SELECT * FROM resource_expenses WHERE resource_id=$1 ORDER BY date DESC",
                        res['id']
                    )
                    res_dict['expenses'] = [dict(exp) for exp in expenses]
                    
                    wt_dict['resources'].append(res_dict)
                
                stage_dict['work_types'].append(wt_dict)
            
            result.append(stage_dict)
        
        return result

# Add expense for resource
@app.post("/budget/resources/{resource_id}/expenses/")
async def add_expense(resource_id: int, data: dict = None, 
            filepath = os.path.join(UPLOAD_DIR, filename)
            with open(filepath, "wb") as f:
                f.write(await receipt.read())
            receipt_paths[idx] = f"/uploads/{filename}"
    
    async with app.state.db.acquire() as conn:
        row = await conn.fetchrow("""
            INSERT INTO resource_expenses 
            (resource_id, date, actual_quantity, actual_price, receipt_photo_1, receipt_photo_2, receipt_photo_3, comment)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        """, resource_id, date, actual_quantity, actual_price, 
            receipt_paths[0], receipt_paths[1], receipt_paths[2], comment)
    
    return dict(row)

# Update expense
@app.put("/expenses/{expense_id}")
async def update_expense(expense_id: int, data: dict = None,
                        receipt_1: UploadFile = File(None),
                        receipt_2: UploadFile = File(None),
                        receipt_3: UploadFile = File(None)):
    """Обновить расход"""
    updates = []
    params = []
    param_count = 1
    
    if data:
        if "date" in data:
            updates.append(f"date=${param_count}")
            params.append(data["date"])
            param_count += 1
        if "actual_quantity" in data:
            updates.append(f"actual_quantity=${param_count}")
            params.append(float(data["actual_quantity"]))
            param_count += 1
        if "actual_price" in data:
            updates.append(f"actual_price=${param_count}")
            params.append(float(data["actual_price"]))
            param_count += 1
        if "comment" in data:
            updates.append(f"comment=${param_count}")
            params.append(data["comment"])
            param_count += 1
    
    # Handle receipt photos
    for idx, receipt in enumerate([receipt_1, receipt_2, receipt_3], 1):
        if receipt and receipt.filename:
            filename = f"{int(time.time() * 1000)}_{receipt.filename}"
            filepath = os.path.join(UPLOAD_DIR, filename)
            with open(filepath, "wb") as f:
                f.write(await receipt.read())
            updates.append(f"receipt_photo_{idx}=${param_count}")
            params.append(f"/uploads/{filename}")
            param_count += 1
    
    if updates:
        params.append(expense_id)
        query = f"UPDATE resource_expenses SET {', '.join(updates)} WHERE id=${param_count} RETURNING *"
        async with app.state.db.acquire() as conn:
            row = await conn.fetchrow(query, *params)
        return dict(row) if row else {"error": "Not found"}
    
    return {"error": "No updates"}

# Delete expense
@app.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: int):
    """Удалить расход"""
    async with app.state.db.acquire() as conn:
        await conn.execute("DELETE FROM resource_expenses WHERE id=$1", expense_id)
    return {"status": "deleted"}
