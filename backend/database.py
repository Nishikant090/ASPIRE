"""
database.py - SQLAlchemy database configuration
Sets up SQLite connection and session factory
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# SQLite database file stored locally
DATABASE_URL = "sqlite:///./aspire.db"

# Create the engine (connect_args needed for SQLite + FastAPI threading)
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# Session factory - used to create DB sessions per request
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all ORM models
Base = declarative_base()


def get_db():
    """
    Dependency function that provides a database session.
    Used with FastAPI's Depends() injection system.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
