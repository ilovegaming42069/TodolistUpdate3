import React, { useState } from 'react';
import { db, auth } from '../firebase/firebase-config';
import { collection, addDoc } from 'firebase/firestore';

function TodoInput() {
    const [inputText, setInputText] = useState('');

    const addToFirestore = async (inputText) => {
        const user = auth.currentUser;
        if (!inputText.trim() || !user) return;
        try {
            await fetch('http://localhost:8000', {
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
            console.log('Item added via FastAPI');
        } catch (error) {
            console.error('Error adding item via FastAPI:', error);
        }
    };
    

    const handleEnterPress = async (e) => {
        if (e.keyCode === 13) {
            await addToFirestore(inputText);
            setInputText("");
        }
    };

    return (
        <div className="input-container">
            <input
                type="text"
                className="input-box-todo"
                placeholder="This is my to do list!"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleEnterPress}
            />
            <button
                className="add-btn"
                onClick={async () => {
                    await addToFirestore(inputText);
                    setInputText("");
                }}
            >+</button>
        </div>
    );
}

export default TodoInput;
