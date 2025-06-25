from contextlib import contextmanager
from typing import Generator, Optional

try:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker, Session
    from sqlalchemy.exc import SQLAlchemyError
    from ..core.config import settings

    engine = create_engine(settings.SUPABASE_URL.replace("https://", "postgresql+psycopg2://"), echo=False)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def get_db() -> Generator[Session, None, None]:
        """FastAPI dependency that yields a SQLAlchemy session.
        Falls back to a dummy generator if SQLAlchemy isn't configured/available."""
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
except Exception:
    # SQLAlchemy not installed or URL invalid—provide a no-op fallback
    def get_db():  # type: ignore
        yield None  # pragma: no cover 