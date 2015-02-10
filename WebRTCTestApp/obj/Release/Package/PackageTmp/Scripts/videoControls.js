(function (global, undefined) {
    'use strict';
    $(document).ready(function () {
        var currentVolume;
        var videoElement = document.querySelector('.video.remote');
        var playPause = $('#play-pause')[0];
        var mute = $('#mute')[0];
        var fullscreen = $('#fullscreen')[0];

        $('#volumebar').slider({ step: 5, min: 0, max: 100, value: 100 });
        $('#volumebar').on('slide', function (slideEvt) {
            if (videoElement.muted === true) {
                toogleMute();
            }
            videoElement.volume = slideEvt.value / 100;
        });

        playPause.addEventListener('click', function () {
            if (videoElement.paused === true) {
                videoElement.play();
                $('.glyphicon-play').attr('class', 'glyphicon glyphicon-pause');
            } else {
                videoElement.pause();
                $('.glyphicon-pause').attr('class', 'glyphicon glyphicon-play');
            }
        });

        mute.addEventListener('click', toogleMute);

        function toogleMute() {
            if (videoElement.muted === false) {
                currentVolume = videoElement.volume;
                videoElement.muted = true;
                videoElement.volume = 0;
                $('#volumebar').slider('setValue', 0);
                $('.glyphicon-volume-off').attr('class', 'glyphicon glyphicon-volume-up');
            } else {
                videoElement.muted = false;
                videoElement.volume = currentVolume;
                $('#volumebar').slider('setValue', currentVolume * 100);
                $('.glyphicon-volume-up').attr('class', 'glyphicon glyphicon-volume-off');
            }
        }
        fullscreen.addEventListener('click', function () {
            if (videoElement.requestFullscreen) {
                videoElement.requestFullscreen();
            } else if (videoElement.mozRequestFullScreen) {
                videoElement.mozRequestFullScreen();
            } else if (videoElement.webkitRequestFullscreen) {
                videoElement.webkitRequestFullscreen();
            }
        });
    });
})(this);