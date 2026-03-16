"""NovaHealth API -- FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.auth import router as auth_router
from backend.api.chat import router as chat_router
from backend.api.documents import router as documents_router
from backend.api.medications import router as medications_router
from backend.api.patients import router as patients_router
from backend.api.search import router as search_router
from backend.api.voice import router as voice_router
from backend.config import SKIP_SEED
from backend.data.seed import seed_db, seed_documents
from backend.database import SessionLocal, init_db
from backend.services.auth import ensure_demo_user

app = FastAPI(title="NovaHealth API")


@app.on_event("startup")
def on_startup():
    init_db()
    db = SessionLocal()
    try:
        ensure_demo_user(db)
        if not SKIP_SEED:
            seed_db(db)
            seed_documents(db)
        else:
            print("SKIP_SEED is set — skipping seed data and document ingestion")
    finally:
        db.close()

from backend.config import CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(documents_router)
app.include_router(medications_router)
app.include_router(patients_router)
app.include_router(search_router)
app.include_router(voice_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
