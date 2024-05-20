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
        const prevButton = qs('.emoji-container .emoji-nav-button:first-child');
        const nextButton = qs('.emoji-container .emoji-nav-button:last-child');

        emojiButton.addEventListener('click', toggleEmojiPicker);
        prevButton.addEventListener('click', () => changeEmojiPage(-1));
        nextButton.addEventListener('click', () => changeEmojiPage(1));

        setupEmojiPicker();

        const titleField = qs('[name="title"]');
        const contentField = qs('[name="content"]');

        titleField.addEventListener('focus', () => setActiveField('title'));
        contentField.addEventListener('focus', () => setActiveField('content'));

        titleField.addEventListener('keyup', () => updateCursorPosition('title'));
        contentField.addEventListener('keyup', () => updateCursorPosition('content'));

        document.addEventListener('click', (event) => {
            const emojiPicker = qs('.emoji-container');
            if (emojiPicker.style.display === 'flex' && !emojiPicker.contains(event.target) && event.target !== emojiButton) {
                emojiPicker.style.display = 'none';
            }
        });
    }

    function qs(selector) {
        return document.querySelector(selector);
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
        fetchEmojis(currentEmojiPage);
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
                    button.classList.add('emoji');
                    button.addEventListener('click', (event) => {
                        event.preventDefault();
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

    function changeEmojiPage(direction) {
        if (direction === -1 && currentEmojiPage > 0) {
            currentEmojiPage--;
            fetchEmojis(currentEmojiPage);
        } else if (direction === 1 && currentEmojiPage < totalEmojiPages - 1) {
            currentEmojiPage++;
            fetchEmojis(currentEmojiPage);
        }
    }

    function toggleEmojiPicker(event) {
        const emojiPicker = qs('.emoji-container');
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
