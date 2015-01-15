(function (global, undefined) {
    var roomId = global.roomId;
    var userId = global.userId;
    var myConnection, myMediaStream;
    var hub = $.connection.webRtcHub;
    var g;
    $.connection.hub.url = '/signalr/hubs';
    $.connection.hub.start(function () {
        console.log('connected to signal server.');
        initialize();
    });

    function initialize() {
        hub.server.addToRoom(userId, roomId).done(function (result) {
            if (result === "Full") {
                alert("Room is full");
            } else {
                getUserMedia(
                {
                    video: true,
                    audio: true
                },
                function (stream) {
                    var videoElement = document.querySelector('.video.mine');
                    myMediaStream = stream;
                    attachMediaStream(videoElement, myMediaStream);
                    if (result === "Connected") {
                        myConnection = myConnection || createConnection(null);
                        myConnection.addStream(myMediaStream);
                        myConnection.createOffer(function (desc) {
                            myConnection.setLocalDescription(desc, function () {
                                hub.server.send(JSON.stringify({ "sdp": desc }), roomId);
                            });
                        }, function (error) { console.log('Error creating session description: ' + error); });
                    }
                },
                function (error) {
                    alert(JSON.stringify(error));
                }
                );
            }
        });
    }

    function createConnection() {
        console.log('creating RTCPeerConnection...');
        var config = { "iceServers": [{ "url": "stun:stun.l.google.com:19302" }] };
        var connection = new RTCPeerConnection(config);

        connection.onicecandidate = function (event) {
            if (event.candidate) {
                hub.server.send(JSON.stringify({ "candidate": event.candidate }), roomId);
            }
        };

        connection.onaddstream = function (event) {
            var remoteVideoElement = document.querySelector('.video.remote');
            attachMediaStream(remoteVideoElement, event.stream);
            document.querySelector('#startBtn').setAttribute('disabled', 'disabled');
        };
        return connection;
    }

    hub.client.newMessage = function (data) {
        var message = JSON.parse(data),
            connection = myConnection || createConnection();
        if (message.sdp) {
            g = 1;
            connection.setRemoteDescription(new RTCSessionDescription(message.sdp), function () {
                if (connection.remoteDescription.type === 'offer') {
                    console.log('received offer, sending answer...');

                    connection.addStream(myMediaStream);

                    connection.createAnswer(function (desc) {
                        connection.setLocalDescription(desc, function () {

                            hub.server.send(JSON.stringify({ 'sdp': connection.localDescription }), roomId);
                        });
                    }, function (error) { console.log('Error creating session description: ' + error); });
                } else if (connection.remoteDescription.type === 'answer') {
                    console.log('got an answer');
                }
            });
        } else if (g === 1  && message.candidate) {
            console.log('adding ice candidate...');
            var cand = new RTCIceCandidate(message.candidate);
            connection.addIceCandidate(cand);
        }
        myConnection = connection;
    };

    var appender = function(user,message) {
        $('#chatMessages').append('<p><b>' + user
    + '</b>: ' + message + '</p>');
        var myDiv = $('#chatMessages')[0];
        myDiv.scrollTop = myDiv.scrollHeight;
    }

    hub.client.chatMessage = function (message) {
        appender('Remote', message);
    };

    $('#sendMessage').on('click', function () {
        var message = $('#message').val();
        appender('My', message);
        hub.server.sendMessage(message, roomId);
        $('#message').val("");
    });
})(this);