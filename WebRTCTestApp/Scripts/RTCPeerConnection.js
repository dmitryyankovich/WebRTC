(function (global, undefined) {
    "use strict";
    var roomId = global.roomId;
    var userId;
    var myDataChannel, remoteDataChannel;
    var myConnection, myMediaStream;
    var missingICE;
    var hub = $.connection.webRtcHub;
    var sdpReceived = false;
    $.connection.hub.url = "/signalr/hubs";
    $.connection.hub.start(function () {
        console.log("connected to signal server.");
        hub.server.returnUserId().done(function (result) {
            userId = result;
            initialize();
        });
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
                    var videoElement = document.querySelector(".video.mine");
                    myMediaStream = stream;
                    attachMediaStream(videoElement, myMediaStream);
                    if (result === "Connected") {
                        myConnection = myConnection || createConnection();
                        myConnection.addStream(myMediaStream);
                        myConnection.createOffer(function (desc) {
                            myConnection.setLocalDescription(desc, function () {
                                hub.server.send(JSON.stringify({ "sdp": desc }), roomId);
                            }, logErr);
                        }, function (error) { console.log("Error creating session description: " + error); });
                    }
                },
                function (error) {
                    alert(JSON.stringify(error));
                }
                );
            }
        });
    }

    function logErr(error) {
        console.log(error);
    }

    hub.client.disconnected = function () {
        var remoteVideoElement = document.querySelector(".video.remote");
        var browser = navigator.userAgent;
        if (browser.indexOf("Chrome") > -1) {
            remoteVideoElement.src = "";
        }
        if (browser.indexOf("Firefox") > -1) {
            attachMediaStream(remoteVideoElement, null);
        }
        $(".video-controls").css("visibility", "hidden");
        console.log("Someone disconnected");
        myConnection = null;
    };

    function createConnection() {
        sdpReceived = false;
        missingICE = [];
        console.log("creating RTCPeerConnection...");
        var config = {
            "iceServers": [
                {
                    "url": "stun:stun.l.google.com:19302"
                },
                {
                    "url": "stun:stun1.l.google.com:19302"
                },
                {
                    "url": "stun:stun2.l.google.com:19302"
                },
                {
                    "url": "stun:stun3.l.google.com:19302"
                },
                {
                    "url": "stun:stun4.l.google.com:19302"
                },
                {
                    "url": "stun:stun.ekiga.net"
                },
                {
                    "url": "stun:stun.ideasip.com"
                },
                {
                    "url": "stun:stun.iptel.org"
                },
                {
                    "url": "stun:stun.rixtelecom.se"
                },
                {
                    "url": "stun:stun.schlund.de"
                },
                {
                    "url": "stun:stun.stunprotocol.org:3478"
                },
                {
                    "url": "stun:stun.voiparound.com"
                },
                {
                    "url": "stun:stun.voipbuster.com"
                },
                {
                    "url": "stun:stun.voipstunt.com"
                },
                {
                    "url": "stun:stun.voxgratia.org"
                },
                {
                    "url": "turn:192.158.29.39:3478?transport=udp",
                    "credential": "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
                    "username": "28224511:1379330808"
                },
                {
                    "url": "turn:192.158.29.39:3478?transport=tcp",
                    "credential": "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
                    "username": "28224511:1379330808"
                }
            ]
        };
        var connection = new RTCPeerConnection(null);

        var dataChannel = connection.createDataChannel("myLabel", { reliable: false });
        myDataChannel = dataChannel;

        connection.ondatachannel = function (event) {
            gotRemoteDatachannel(event);
        };

        connection.onicecandidate = function (event) {
            if (event.candidate) {
                hub.server.send(JSON.stringify({ "candidate": event.candidate }), roomId);
            }
        };

        connection.onaddstream = function (event) {
            var remoteVideoElement = document.querySelector(".video.remote");
            attachMediaStream(remoteVideoElement, event.stream);
            $(".video-controls").css("visibility", "visible");
            console.log("Added stream");
        };
        return connection;
    }

    function gotRemoteDatachannel(event) {
        remoteDataChannel = event.channel;

        remoteDataChannel.onerror = function (error) {
            console.log("Datachannel error:", error);
        };

        remoteDataChannel.onmessage = function (message) {
            console.log("Got Datachannel message:", message.data);
            appender("Remote", message.data);
        };

        remoteDataChannel.onopen = function () {
            console.log("Datachannel opened");
        };

        remoteDataChannel.onclose = function () {
            console.log("Datachannel closed");
        };

    }

    hub.client.newMessage = function (data) {
        var message = JSON.parse(data),
    connection = myConnection || createConnection(), cand;
        if (message.sdp) {
            sdpReceived = true;
            connection.setRemoteDescription(new RTCSessionDescription(message.sdp), function () {
                if (connection.remoteDescription.type === "offer") {
                    console.log("received offer, sending answer...");

                    connection.addStream(myMediaStream);

                    connection.createAnswer(function (desc) {
                        connection.setLocalDescription(desc, function () {
                            hub.server.send(JSON.stringify({ "sdp": connection.localDescription }), roomId);
                        }, logErr);
                    }, function (error) { console.log("Error creating session description: " + error); });
                } else if (connection.remoteDescription.type === "answer") {
                    console.log("got an answer");
                }
                for (var i = 0, length = missingICE.length; i < length; i++) {
                    console.log("adding missing ice candidate...");
                    cand = new RTCIceCandidate(missingICE[i]);
                    connection.addIceCandidate(cand);
                }
            }, logErr);
        } else if (message.candidate) {
            if (sdpReceived === true) {
                console.log("adding ice candidate...");
                cand = new RTCIceCandidate(message.candidate);
                connection.addIceCandidate(cand);
            } else {
                missingICE.push(message.candidate);
            }
        }
        myConnection = connection;
    };

    $("#message").on("keydown", function (e) {
        if (e.keyCode === 13) {
            e.preventDefault();
            messageSender();
        }
    });

    var appender = function (user, message) {
        $("#chatMessages").append("<p><b>" + user
            + "</b>: " + message + "</p>");
        var myDiv = $("#chatMessages")[0];
        myDiv.scrollTop = myDiv.scrollHeight;
    };

    var messageSender = function () {
        var message = $("#message").val();
        if (message) {
            appender("My", message);
            myDataChannel.send(message);
            $("#message").val("");
        }
    };

    $("#sendMessage").on("click", messageSender);

})(this);