"use strict";
console.log('started '); // Debugging log

(function () {
    let activeField = null;
    let cursorPositions = {
        title: 0,
        content: 0
    };
    let currentEmojiPage = 0;
    let totalEmojiPages = 0; // To be updated after fetching emojis

    window.addEventListener('load', init);

    function init() {
        const emojiButton = qs('.emoji-button');
        const postForm = qs('.post-form form');

        emojiButton.addEventListener('click', toggleEmojiPicker);

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

    function setupEmojiPicker() {
        const emojiPicker = createEmojiPicker();
        document.body.appendChild(emojiPicker);
        fetchEmojis(currentEmojiPage);
    }

    function createEmojiPicker() {
        const emojiPicker = document.createElement('div');
        emojiPicker.classList.add('emoji-picker');

        const prevButton = document.createElement('button');
        prevButton.innerText = '<';
        prevButton.classList.add('emoji-nav-button');
        prevButton.addEventListener('click', () => {
            if (currentEmojiPage > 0) {
                currentEmojiPage--;
                fetchEmojis(currentEmojiPage);
            }
        });

        const nextButton = document.createElement('button');
        nextButton.innerText = '>';
        nextButton.classList.add('emoji-nav-button');
        nextButton.addEventListener('click', () => {
            if (currentEmojiPage < totalEmojiPages - 1) {
                currentEmojiPage++;
                fetchEmojis(currentEmojiPage);
            }
        });

        const emojiContent = document.createElement('div');
        emojiContent.classList.add('emoji-content');

        emojiPicker.appendChild(prevButton);
        emojiPicker.appendChild(emojiContent);
        emojiPicker.appendChild(nextButton);

        return emojiPicker;
    }

    function fetchEmojis(page) {
        fetch(`/emojis?page=${page}`)
            .then(response => response.json())
            .then(data => {
                const emojis = data.emojis;
                totalEmojiPages = data.totalPages;

                const emojiContent = qs('.emoji-content');
                emojiContent.innerHTML = '';

                emojis.forEach(emoji => {
                    const button = document.createElement('button');
                    button.innerText = emoji;
                    button.classList.add('emoji-button');
                    button.addEventListener('click', () => {
                        if (activeField) {
                            const field = qs(`[name="${activeField}"]`);
                            insertAtCursor(field, emoji);
                            field.focus();
                        }
                    });
                    emojiContent.appendChild(button);
                });
            })
            .catch(error => console.error('Error fetching emojis:', error));
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
