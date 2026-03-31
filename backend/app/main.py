from fastapi import FastAPI

app = FastAPI(title="Argex")

@app.get("/")
def root():
    return {"message": "Argex API Running."}