(function (global, undefined) {
    document.querySelector("input[type=file]").onchange = function () {
        var file = this.files[0];
    };

})(this);