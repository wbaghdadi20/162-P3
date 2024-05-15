"use strict";

(function () {

    window.addEventListener('load', init)

    function init() {
        const container = id('container')
        const register_btn = id('register')
        const login_btn = id('login')

        register_btn.addEventListener('click', () => {
            container.classList.add('active')
        })

        login_btn.addEventListener('click', () => {
            container.classList.remove('active')
        })

    }

    function id(id) {
        return document.getElementById(id)
    }

    function qs(class_name) {
        return document.querySelector(class_name)
    }

    function qsa(class_name) {
        return document.querySelectorAll(class_name)
    }

    // other functions
}) ();