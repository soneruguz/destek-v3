
@app.post("/tickets")
async def create_ticket(request: dict):
    try:
        logger.error(f"POST DATA: {request}")
        return {"success": True, "test": "OK"}
    except Exception as e:
        logger.error(f"ERROR: {e}")
        return {"error": str(e)}


@app.post("/tickets")
async def create_ticket():
    return {"success": True, "id": 123, "message": "OK"}
