import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Navigate, Routes } from 'react-router-dom';
import { auth } from './firebase/firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import './App.css';
import TodoInput from './components/TodoInput';
import TodoList from './components/TodoList';
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

    const fetchTodos = async () => {
      try {
        const response = await fetch(`http://localhost:8000/todos/${currentUser.uid}/`);
        const todos = await response.json();
        setListTodo(todos);
      } catch (error) {
        console.error('Error fetching todos:', error);
      }
    };

    fetchTodos();
  }, [currentUser]);

  const addItem = async (inputText) => {
    const user = auth.currentUser;
    if (!inputText.trim() || !user) return;
    try {
      const response = await fetch('http://localhost:8000/todos/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          text: inputText,
          status: 'not-started'
        })
      });
      if (response.ok) {
        const newTodo = await response.json();
        setListTodo(prev => [...prev, newTodo]);
        console.log('Item added via FastAPI');
      } else {
        const message = await response.text();
        console.error('Failed to add item via FastAPI:', message);
      }
    } catch (error) {
      console.error('Error adding item via FastAPI:', error);
    }
  };

  const deleteListItem = async (id) => {
    try {
      await fetch(`http://localhost:8000/todos/${id}/`, {
        method: 'DELETE'
      });
      setListTodo(prev => prev.filter(item => item.id !== id));
      console.log('Todo deleted via FastAPI');
    } catch (error) {
      console.error('Error deleting todo via FastAPI:', error);
    }
  };

  const statusTransitions = {
    'not-started': 'in-progress',
    'in-progress': 'done',
  };

  const updateStatus = async (id, currentStatus) => {
    const newStatus = statusTransitions[currentStatus];  // Determine the new status based on the current one

    if (!newStatus) {
      console.error('Invalid current status:', currentStatus);
      return;  // If currentStatus is invalid, exit the function
    }

    try {
      await fetch(`http://localhost:8000/todos/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });
      setListTodo(prev => prev.map(item => (item.id === id ? { ...item, status: newStatus } : item)));
      console.log('Status updated via FastAPI');
    } catch (error) {
      console.error('Error updating status via FastAPI:', error);
    }
  };

  const clearAllItemsBasedOnFilter = async () => {
    const filteredItems = listTodo.filter(todo => filter === 'all' || todo.status === filter);
    try {
      for (const item of filteredItems) {
        await fetch(`http://localhost:8000/todos/${item.id}/`, {
          method: 'DELETE'
        });
      }
      setListTodo(prev => prev.filter(item => filter === 'all' || item.status !== filter));
      console.log('Todos cleared via FastAPI');
    } catch (error) {
      console.error('Error clearing todos via FastAPI:', error);
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
          <TodoInput addItem={addItem} />
          <FilterButtons currentFilter={filter} setFilter={setFilter} />
          <h1 className="app-heading">Abdullah Akmal Sutoyo 2602239320</h1>
          {listTodo.filter(todo => filter === 'all' || todo.status === filter).map((listItem) => (
            <TodoList
              id={listItem.id}
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
