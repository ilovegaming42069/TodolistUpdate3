import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Navigate, Routes } from 'react-router-dom';
import { db, auth } from './firebase/firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, updateDoc, doc, deleteDoc, query, getDocs, where, writeBatch } from 'firebase/firestore';
import './App.css';
import TodoInput from './components/TodoInput';
import Todolist from './components/TodoList';
import FilterButtons from './components/FilterButton';
import LoginPage from './login/LoginPage';
import RegisterPage from './login/RegisterPage';
import NavBoard from './components/NavBoard'; // Import NavBoard component

function App() {
  const [listTodo, setListTodo] = useState([]);
  const [filter, setFilter] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'todos'),
      where("uid", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const todosArray = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setListTodo(todosArray);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const deleteListItem = async (uid, todoId) => {
    try {
        await fetch(`http://localhost:8000/${uid}/${todoId}`, {
            method: 'DELETE'
        });
        console.log('Todo deleted via FastAPI');
    } catch (error) {
        console.error('Error deleting todo via FastAPI:', error);
    }
};

  const statusTransitions = {
    'not-started': 'in-progress',
    'in-progress': 'done',
  };

  const clearAllItemsBasedOnFilter = async () => {
    const todosRef = collection(db, "todos");
    let queryConstraints = [];
    if (filter !== 'all') {
      queryConstraints.push(where("status", "==", filter));
    }
    const q = query(todosRef, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    querySnapshot.forEach((document) => {
      batch.delete(document.ref);
    });
    await batch.commit();
    setListTodo(prev => prev.filter(item => item.status !== filter));
  };

  // UpdateStatus example:

const updateStatus = async (uid, text, currentStatus) => {
    const newStatus = statusTransitions[currentStatus];  // Determine the new status based on the current one

    if (!newStatus) {
        console.error('Invalid current status:', currentStatus);
        return;  // If currentStatus is invalid, exit the function
    }

    try {
        await fetch(`http://localhost:8000/todos/${uid}/${text}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus })
        });
        console.log('Status updated via FastAPI');
    } catch (error) {
        console.error('Error updating status via FastAPI:', error);
    }
};



  if (!authReady) return null;

  return (
    <Router>
      <div className="main-container">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<AuthenticatedRoutes />} />
          <Route path="*" element={<Navigate replace to="/login" />} />
        </Routes>
      </div>
    </Router>
  );

  function AuthenticatedRoutes() {
    if (!currentUser) return <Navigate to="/login" />;

    return (
      <>
        <NavBoard currentUser={currentUser} /> {/* Render NavBoard component */}
        <div className="center-container">
          <TodoInput />
          <FilterButtons currentFilter={filter} setFilter={setFilter} />
          <h1 className="app-heading">Abdullah Akmal Sutoyo 2602239320</h1>
          {listTodo.filter(todo => filter === 'all' || todo.status === filter).map((listItem) => (
            <Todolist
              key={listItem.id}
              item={listItem.text}
              status={listItem.status}
              deleteItem={() => deleteListItem(listItem.id)}
              updateStatus={() => updateStatus(listItem.id, listItem.status)}
            />
          ))}
          {listTodo.length > 0 && (
            <button className="clear-all-btn" onClick={clearAllItemsBasedOnFilter}>Clear All</button>
          )}
        </div>
      </>
    );
  }
}

export default App;
