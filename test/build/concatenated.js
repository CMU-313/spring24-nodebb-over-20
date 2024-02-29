(function (window, document) {
    window.doStuff = function () {
        document.body.innerHTML = 'Stuff has been done';
    };
})(window, document);

;function foo(name, age) {
    return 'The person known as "' + name + '" is ' + age + ' years old';
}
