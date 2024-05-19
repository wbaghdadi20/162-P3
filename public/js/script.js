"use strict";
console.log('started '); // Debugging log

(function () {
    let activeField = null;
    let cursorPositions = {
        title: 0,
        content: 0
    };

    window.addEventListener('load', init);

    function init() {
        const emojiButton = createEmojiButton();
        const postForm = qs('.post-form form');
        postForm.appendChild(emojiButton);

        setupEmojiPicker();

        const titleField = qs('[name="title"]');
        const contentField = qs('[name="content"]');

        titleField.addEventListener('focus', () => setActiveField('title'));
        contentField.addEventListener('focus', () => setActiveField('content'));

        titleField.addEventListener('keyup', () => updateCursorPosition('title'));
        contentField.addEventListener('keyup', () => updateCursorPosition('content'));

        document.addEventListener('click', (event) => {
            const emojiPicker = qs('.emoji-picker');
            if (emojiPicker.style.display === 'flex' && !emojiPicker.contains(event.target) && event.target !== emojiButton) {
                emojiPicker.style.display = 'none';
            }
        });
    }

    function id(id) {
        return document.getElementById(id);
    }

    function qs(class_name) {
        return document.querySelector(class_name);
    }

    function qsa(class_name) {
        return document.querySelectorAll(class_name);
    }

    function setActiveField(fieldName) {
        activeField = fieldName;
    }

    function updateCursorPosition(fieldName) {
        const field = qs(`[name="${fieldName}"]`);
        cursorPositions[fieldName] = field.selectionStart;
        console.log(`Updated cursor position for ${fieldName}: ${cursorPositions[fieldName]}`);
    }

    function createEmojiButton() {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'emoji-button';
        button.innerText = '😀';
        button.addEventListener('click', toggleEmojiPicker);
        return button;
    }

    function setupEmojiPicker() {
        const emojiPicker = createEmojiPicker();
        document.body.appendChild(emojiPicker);
    }

    function createEmojiPicker() {
        const emojiPicker = document.createElement('div');
        emojiPicker.classList.add('emoji-picker');

        fetch('/emojis')
            .then(response => response.json())
            .then(emojis => {
                emojis.forEach(emoji => {
                    const button = document.createElement('button');
                    button.innerText = emoji;
                    button.addEventListener('click', () => {
                        if (activeField) {
                            const field = qs(`[name="${activeField}"]`);
                            insertAtCursor(field, emoji);
                            field.focus();
                        }
                    });
                    emojiPicker.appendChild(button);
                });
            })
            .catch(error => console.error('Error fetching emojis:', error));

        return emojiPicker;
    }

    function toggleEmojiPicker(event) {
        const emojiPicker = qs('.emoji-picker');
        const button = event.target;
        if (emojiPicker.style.display === 'none' || !emojiPicker.style.display) {
            emojiPicker.style.display = 'flex';
            const rect = button.getBoundingClientRect();
            emojiPicker.style.top = `${rect.bottom + window.scrollY}px`;
            emojiPicker.style.left = `${rect.left + window.scrollX}px`;
        } else {
            emojiPicker.style.display = 'none';
        }
    }

    function insertAtCursor(field, value) {
        const start = cursorPositions[activeField];
        const end = field.selectionEnd;
        console.log(`Cursor start position: ${start}`);
        const text = field.value;

        field.value = text.slice(0, start) + value + text.slice(end);
        const newCursorPosition = start + value.length;
        field.setSelectionRange(newCursorPosition, newCursorPosition);
        cursorPositions[activeField] = newCursorPosition;
        console.log(`Cursor new position: ${field.selectionStart}`);
    }
})();
