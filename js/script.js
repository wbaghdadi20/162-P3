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

    // other functions
})();
