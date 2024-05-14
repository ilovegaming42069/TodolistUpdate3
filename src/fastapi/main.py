from fastapi import FastAPI, HTTPException, Depends, Query
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import List, Optional

# Database setup
DATABASE_URL = "sqlite:///./todos.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# SQLAlchemy model
class TodoItemDB(Base):
    __tablename__ = "todos"
    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String, index=True)
    text = Column(String)
    status = Column(String)

# Pydantic models
class TodoItem(BaseModel):
    uid: str
    text: str
    status: str

    class Config:
        orm_mode = True

class TodoItem2(TodoItem):
    id: int

# Drop the existing table and create the new schema
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

# FastAPI app
app = FastAPI()

# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Routes
@app.post("/todos/", response_model=TodoItem2)
def create_todo_item(todo: TodoItem, db: Session = Depends(get_db)):
    db_todo = TodoItemDB(**todo.dict())
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return db_todo

@app.get("/todos/{uid}/", response_model=List[TodoItem2])
def get_todos_for_user(uid: str, status: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(TodoItemDB).filter(TodoItemDB.uid == uid)
    if status:
        query = query.filter(TodoItemDB.status == status)
    return query.all()

@app.patch("/todos/{id}/status", response_model=TodoItem)
def update_todo_status(id: int, status: str, db: Session = Depends(get_db)):
    todo = db.query(TodoItemDB).filter(TodoItemDB.id == id).first()
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    todo.status = status
    db.commit()
    return todo

@app.delete("/todos/{uid}/{text}/", response_model=TodoItem)
def delete_todo_item(uid: str, text: str, db: Session = Depends(get_db)):
    todo = db.query(TodoItemDB).filter(TodoItemDB.uid == uid, TodoItemDB.text == text).first()
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    db.delete(todo)
    db.commit()
    return todo

@app.delete("/todos/{uid}/status/{status}", response_model=List[TodoItem])
def clear_todos_by_status(uid: str, status: str, db: Session = Depends(get_db)):
    todos = db.query(TodoItemDB).filter(TodoItemDB.uid == uid, TodoItemDB.status == status).all()
    for todo in todos:
        db.delete(todo)
    db.commit()
    return todos

@app.delete("/todos/{uid}/clear/", response_model=List[TodoItem])
def clear_all_todos_for_user(uid: str, db: Session = Depends(get_db)):
    todos = db.query(TodoItemDB).filter(TodoItemDB.uid == uid).all()
    for todo in todos:
        db.delete(todo)
    db.commit()
    return todos
