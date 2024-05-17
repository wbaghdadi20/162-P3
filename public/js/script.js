"use strict";
console.log('started '); // Debugging log
(function () {
    
    
    window.addEventListener('load', init);

    function init() {
        const container = id('container');
        const register_btn = id('register');
        const login_btn = id('login');

        console.log('Init called'); // Debugging log

        register_btn.addEventListener('click', () => {
            console.log('Register button clicked'); // Debugging log
            container.classList.add('active');
        });

        login_btn.addEventListener('click', () => {
            console.log('Login button clicked'); // Debugging log
            container.classList.remove('active');
        });

        initEmojiPicker();
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

    function initEmojiPicker() {
        const button = qs('#emoji-button');
        const picker = new EmojiButton();

        picker.on('emoji', emoji => {
            const textarea = qs('textarea[name="content"]');
            textarea.value += emoji;
        });

        if (button) {
            button.addEventListener('click', () => {
                picker.togglePicker(button);
            });
        }
    }

    // other functions
})();



// "use strict";

// document.addEventListener('DOMContentLoaded', function () {
//     const emojiButton = document.getElementById('emoji-button');
//     const contentInput = document.getElementById('content');
//     const emojiPicker = document.getElementById('emoji-picker');

//     console.log('DOM fully loaded and parsed');

//     if (emojiButton) {
//         console.log('Emoji button found');
//         emojiButton.addEventListener('click', async () => {
//             console.log('Emoji button clicked');
//             if (emojiPicker.innerHTML === '') {
//                 // Fetch emojis from the Emoji API
//                 try {
//                     const response = await fetch('https://emoji-api.com/emojis?access_key=a729ae75125e31d971b07a7e010d993e1497d3c8');
//                     const emojis = await response.json();
//                     console.log('Emojis fetched:', emojis);
//                     displayEmojis(emojis);
//                 } catch (error) {
//                     console.error('Error fetching emojis:', error);
//                 }
//             }
//             emojiPicker.classList.toggle('visible'); // Toggle visibility of the emoji picker
//         });
//     } else {
//         console.log('Emoji button not found');
//     }

//     function displayEmojis(emojis) {
//         emojis.slice(0, 100).forEach(emoji => { // Display first 100 emojis
//             const button = document.createElement('button');
//             button.classList.add('emoji-button');
//             button.innerHTML = emoji.character;
//             button.addEventListener('click', () => {
//                 contentInput.value += emoji.character;
//                 emojiPicker.classList.remove('visible');
//             });
//             emojiPicker.appendChild(button);
//         });
//     }
// });
