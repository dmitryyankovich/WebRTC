(function() {
    var hub = $.connection.webRtcHub;
    $.connection.hub.url = '/signalr/hubs';
    document.querySelector('#add').addEventListener('click', function () {
        var name = document.querySelector('#name').value;
        hub.server.newUser(name);
    });
})();