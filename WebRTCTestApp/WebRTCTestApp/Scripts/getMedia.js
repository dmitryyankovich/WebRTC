(function () {
    'use strict';

    var video = document.querySelector('video');
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    function successCallback(stream) {
        window.stream = stream;
        if (window.URL) {
            video.src = window.URL.createObjectURL(stream);
        } else {
            video.src = stream;
        }
    }

    function errorCallback(error) {
        console.log('navigator.getUserMedia error: ', error);
    }

    navigator.getUserMedia({audio: false, video: true}, successCallback, errorCallback);
}());