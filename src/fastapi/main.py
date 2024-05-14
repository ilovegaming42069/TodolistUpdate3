from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, validator
from sqlalchemy import create_engine, Column, String, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import List
from fastapi.middleware.cors import CORSMiddleware

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
    status = Column(String, default="not-started")

# Pydantic models
class TodoItem(BaseModel):
    uid: str
    text: str
    status: str = "not-started"

    @validator('status')
    def validate_status(cls, value):
        allowed_statuses = ['not-started', 'in-progress', 'done']
        if value not in allowed_statuses:
            raise ValueError('Status must be one of: not-started, in-progress, done')
        return value

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
    todo.status = "not-started"
    db_todo = TodoItemDB(**todo.dict())
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return db_todo

@app.get("/todos/{uid}/", response_model=List[TodoItem2])
def get_todos_for_user(uid: str, db: Session = Depends(get_db)):
    query = db.query(TodoItemDB).filter(TodoItemDB.uid == uid)
    return query.all()

@app.patch("/todos/{id}/status", response_model=TodoItem2)
def update_todo_status(id: int, db: Session = Depends(get_db)):
    allowed_transitions = {
        "not-started": "in-progress",
        "in-progress": "done"
    }

    todo = db.query(TodoItemDB).filter(TodoItemDB.id == id).first()
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    if todo.status not in allowed_transitions:
        raise HTTPException(status_code=400, detail=f"Invalid status transition from {todo.status}")

    todo.status = allowed_transitions[todo.status]
    db.commit()
    db.refresh(todo)
    return todo

@app.delete("/todos/{id}/", response_model=TodoItem)
def delete_todo_item(id: int, db: Session = Depends(get_db)):
    todo = db.query(TodoItemDB).filter(TodoItemDB.id == id).first()
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    db.delete(todo)
    db.commit()
    return todo

@app.delete("/todos/{uid}/status/{status}", response_model=List[TodoItem])
def clear_todos_by_status(uid: str, status: str, db: Session = Depends(get_db)):
    allowed_statuses = ['not-started', 'in-progress', 'done']
    if status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Status must be one of: not-started, in-progress, done")
    
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Replace with your frontend's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
