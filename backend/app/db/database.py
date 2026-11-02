from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=settings.DEBUG
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    try:
        import sqlite3
        db_path = settings.STORAGE_DIR / "fruitvision.db"
        if db_path.exists():
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(inspection_jobs)")
            columns = [row[1] for row in cursor.fetchall()]
            if "media_type" not in columns:
                cursor.execute("ALTER TABLE inspection_jobs ADD COLUMN media_type VARCHAR(16) DEFAULT 'video'")
            if "image_path" not in columns:
                cursor.execute("ALTER TABLE inspection_jobs ADD COLUMN image_path VARCHAR(512)")
            conn.commit()
            conn.close()
    except Exception:
        pass
