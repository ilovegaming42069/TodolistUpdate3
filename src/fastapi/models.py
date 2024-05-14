from fastapi import FastAPI, HTTPException, Depends, Path, Query
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import List, Optional

DATABASE_URL = "sqlite:///./todos.db"
origins  = "http://localhost:8000"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
class TodoItemDB(Base):
    __tablename__ = "todos"
    id = Column(Integer, primary_key=True, index=False)
    uid = Column(String)
    text = Column(String)
    status = Column(String)

Base.metadata.create_all(bind=engine)

# Pydantic models for data validation
class TodoItem(BaseModel):
    uid: str
    text: str
    status: str

class TodoItem2(TodoItem):
    id: int
    class Config:
        orm_mode = True