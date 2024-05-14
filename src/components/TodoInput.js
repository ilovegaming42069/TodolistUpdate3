import React, { useState } from 'react';

function TodoInput({ addItem }) {
    const [inputText, setInputText] = useState('');

    const handleEnterPress = async (e) => {
        if (e.keyCode === 13) {
            await addItem(inputText);
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
                    await addItem(inputText);
                    setInputText("");
                }}
            >+</button>
        </div>
    );
}

export default TodoInput;
