(function (global, undefined) {
    'use strict';
    var roomId = global.roomId;
    var userId;
    var file;
    var reader = new FileReader();
    var myDataChannel, remoteDataChannel;
    var myConnection, myMediaStream;
    var missingICE;
    var fileName, fileSize;
    var chunkLength = 66000;
    var numberOfChunks;
    var currentWidth = 0;
    var exitFlag = false;
    var count = 0;
    var timer;
    var receivedChunksArray = [], receivedIndexArray = [], missingIndexArray = [];
    var sendedChunksArray = [];
    var hub = $.connection.webRtcHub;
    var sdpReceived = false;
    $.connection.hub.url = '/signalr/hubs';
    $.connection.hub.start(function () {
        console.log('connected to signal server.');
        hub.server.returnUserId().done(function (result) {
            userId = result;
            initialize();
        });
    });

    function browserIdentify() {
        var browser = navigator.userAgent;
        if (browser.indexOf('Chrome') > -1) {
            return 'Chrome';
        } else {
            return 'Firefox';
        }
    }

    function initialize() {
        hub.server.addToRoom(userId, roomId).done(function (result) {
            if (result === 'Full') {
                alert('Room is full');
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
                    if (result === 'Connected') {
                        myConnection = myConnection || createConnection();
                        myConnection.addStream(myMediaStream);
                        myConnection.createOffer(function (desc) {
                            myConnection.setLocalDescription(desc, function () {
                                hub.server.send(JSON.stringify({ 'sdp': desc }), roomId);
                            }, logErr);
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

    function logErr(error) {
        console.log(error);
    }

    hub.client.disconnected = function () {
        var remoteVideoElement = document.querySelector('.video.remote');
        if (browserIdentify() === 'Chrome') {
            remoteVideoElement.src = '';
        } else {
            attachMediaStream(remoteVideoElement, null);
        }
        $('.video-controls').css('visibility', 'hidden');
        console.log('Someone disconnected');
        myConnection = null;
    };

    function createConnection() {
        sdpReceived = false;
        missingICE = [];
        console.log('creating RTCPeerConnection...');
        var config = {
            'iceServers': [
                {
                    'url': 'stun:stun.l.google.com:19302'
                },
                {
                    'url': 'stun:stun1.l.google.com:19302'
                },
                {
                    'url': 'stun:stun2.l.google.com:19302'
                },
                {
                    'url': 'stun:stun3.l.google.com:19302'
                },
                {
                    'url': 'stun:stun4.l.google.com:19302'
                },
                {
                    'url': 'stun:stun.ekiga.net'
                },
                {
                    'url': 'stun:stun.ideasip.com'
                },
                {
                    'url': 'stun:stun.iptel.org'
                },
                {
                    'url': 'stun:stun.rixtelecom.se'
                },
                {
                    'url': 'stun:stun.schlund.de'
                },
                {
                    'url': 'stun:stun.stunprotocol.org:3478'
                },
                {
                    'url': 'stun:stun.voiparound.com'
                },
                {
                    'url': 'stun:stun.voipbuster.com'
                },
                {
                    'url': 'stun:stun.voipstunt.com'
                },
                {
                    'url': 'stun:stun.voxgratia.org'
                },
                {
                    'url': 'turn:192.158.29.39:3478?transport=udp',
                    'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
                    'username': '28224511:1379330808'
                },
                {
                    'url': 'turn:192.158.29.39:3478?transport=tcp',
                    'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
                    'username': '28224511:1379330808'
                }
            ]
        };
        var connection = new RTCPeerConnection(config);

        var dataChannel = connection.createDataChannel('myLabel', { reliable: false });
        myDataChannel = dataChannel;

        connection.ondatachannel = function (event) {
            gotRemoteDatachannel(event);
        };

        connection.onicecandidate = function (event) {
            if (event.candidate) {
                hub.server.send(JSON.stringify({ 'candidate': event.candidate }), roomId);
            }
        };

        connection.onaddstream = function (event) {
            var remoteVideoElement = document.querySelector('.video.remote');
            attachMediaStream(remoteVideoElement, event.stream);
            $('.video-controls').css('visibility', 'visible');
            console.log('Added stream');
        };
        return connection;
    }

    function errorHandler(e) {
        console.log('Error: ' + e);
    }

    function gotRemoteDatachannel(event) {
        remoteDataChannel = event.channel;

        remoteDataChannel.onerror = function (error) {
            console.log('Datachannel error:', error);
        };

        remoteDataChannel.onmessage = function (message) {
            var mess = JSON.parse(message.data);
            numberOfChunks = mess.numberOfChunks ? mess.numberOfChunks : numberOfChunks;
            switch (mess.type) {
                case 'file':
                    if (timer) {
                        clearTimeout(timer);
                        timer = null;
                    }
                    count++;
                    changeProgress();
                    console.log(mess.chunkNumber);
                    fileSize = mess.size;
                    fileName = mess.ext;
                    receivedChunksArray[mess.chunkNumber] = mess.chunk;
                    receivedIndexArray.push(mess.chunkNumber);
                    if (mess.last === true) {
                        console.log('last');
                    }
                    timer = setTimeout(createFile, 2000);
                    break;
                case 'message':
                    console.log('mess');
                    appender('Remote', mess.text);
                    break;
                case 'accept':
                    //$('.waiting').remove();
                    appender('Downloading', null);
                    reader.readAsDataURL(file);
                    reader.onload = onReadAsDataUrl;
                    break;
                case 'cancel':
                    //$('.waiting').remove();
                    appender('Cancel', null);
                    break;
                case 'cancelWhileDownloading':
                    //$('.waiting').remove();
                    exitFlag = true;
                    appender('CancelWhileDownloading', null);
                    break;
                case 'fileNotify':
                    exitFlag = false;
                    appender('Receive', {
                        name: mess.name,
                        size: mess.size
                    });
                    break;
                case 'miss':
                    sendMissingChunks(mess.arr);
                    break;
                case 'complete':
                    alert(count);
                    count = 0;
                    sendedChunksArray = [];
                    appender('Complete', null);
                    break;
            }
        };

        remoteDataChannel.onopen = function () {
            console.log('Datachannel opened');
        };

        remoteDataChannel.onclose = function () {
            console.log('Datachannel closed');
        };
    }

    function createFile() {
        receivedIndexArray.sort();
        checkMissingChunks();
        if (missingIndexArray.length > 0) {
            var missing = {
                type: 'miss',
                arr: missingIndexArray
            }
            myDataChannel.send(JSON.stringify(missing));
        } else {
            var joinedChunks = receivedChunksArray.join('');
            var blob = dataURItoBlob(joinedChunks);
            var url = URL.createObjectURL(blob);
            appender('Complete', url);
            myDataChannel.send(JSON.stringify({ type: 'complete' }));
            receivedChunksArray = [];
            missingIndexArray = [];
            receivedIndexArray = [];
            count = 0;
            console.log('Got file');
        }
        timer = null;
    }

    function checkMissingChunks() {
        for (var i = 0, length = receivedIndexArray.length; i < length; i++) {
            if (typeof (receivedChunksArray[i]) === 'undefined') {
                missingIndexArray.push(i);
            }
        }
        alert(JSON.stringify(missingIndexArray));
    }

    function sendMissingChunks(array) {
        for (var i = 0, length = array.length; i < length; i++) {
            var index = array[i];
            var missedChunk = sendedChunksArray[index];
            myDataChannel.send(JSON.stringify(missedChunk));
        }
    }

    function dataURItoBlob(dataURI) {
        var byteString = atob(dataURI.split(',')[1]);
        var ab = new ArrayBuffer(byteString.length);
        var ia = new Uint8Array(ab);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        var blob = new Blob([ab]);
        return blob;
    }

    hub.client.newMessage = function (data) {
        var message = JSON.parse(data),
    connection = myConnection || createConnection(), cand;
        if (message.sdp) {
            sdpReceived = true;
            connection.setRemoteDescription(new RTCSessionDescription(message.sdp), function () {
                if (connection.remoteDescription.type === 'offer') {
                    console.log('received offer, sending answer...');

                    connection.addStream(myMediaStream);

                    connection.createAnswer(function (desc) {
                        connection.setLocalDescription(desc, function () {
                            hub.server.send(JSON.stringify({ 'sdp': connection.localDescription }), roomId);
                        }, logErr);
                    }, function (error) { console.log('Error creating session description: ' + error); });
                } else if (connection.remoteDescription.type === 'answer') {
                    console.log('got an answer');
                }
                for (var i = 0, length = missingICE.length; i < length; i++) {
                    console.log('adding missing ice candidate...');
                    cand = new RTCIceCandidate(missingICE[i]);
                    connection.addIceCandidate(cand);
                }
            }, logErr);
        } else if (message.candidate) {
            if (sdpReceived === true) {
                console.log('adding ice candidate...');
                cand = new RTCIceCandidate(message.candidate);
                connection.addIceCandidate(cand);
            } else {
                missingICE.push(message.candidate);
            }
        }
        myConnection = connection;
    };

    $('#message').on('keydown', function (e) {
        if (e.keyCode === 13) {
            e.preventDefault();
            messageSender();
        }
    });

    $(document).on('click', '.cancel', cancelClick);
    $(document).on('click', '.accept', acceptClick);
    $(document).on('click', '.reject', cancelClick);
    $(document).on('change', 'input[type=file]', fileChange);
    $(document).on('click', '.cancelDownload', cancelDownloadClick);


    var appender = function (user, message) {
        var chat = $('#chatMessages');
        switch (user) {
            case 'Complete':
                $('.cancelDownload').remove();
                $('.progress').removeClass('active progress-striped');
                $('.progress-bar').removeClass('progress-bar-info').addClass('progress-bar-success');
                if (message !== null) {
                    chat.append(jQuery('<a/>').attr({
                        'href': message,
                        'download': fileName
                    }).text('Click to download'));
                } else {
                    chat.append('<p class="completed">Completed</p>');
                }
                currentWidth = 0;
                break;
            case 'Wait':
                $('#fileInput').unbind('click');
                chat.append('<p class="waiting">Waiting for confirmation<button class="btn btn-default btn-sm cancel">Cancel</button></p>');
                break;
            case 'Cancel':
                $('.waiting').remove();
                chat.append('<p class="canceled">Canceled</p>');
                break;
            case 'CancelWhileDownloading':
                $('.progressThere').remove();
                chat.append('<p class="canceled">Canceled</p>');
                break;
            case 'Downloading':
                $('.waiting').remove();
                if (message === 'Me') {
                    chat.append('<div class="progressThere">' +
                        '<div class="progress  progress-striped active download">' +
                        '<div class="progress-bar progress-bar-info" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">' +
                        '</div>' +
                        '</div>' +
                        '<button class="btn btn-default btn-sm cancelDownload">Cancel</button>' +
                        '</div>');
                } else {
                    chat.append('<div class="progressThere">' +
                        '<div class="progress  progress-striped active download">' +
                        '<div class="progress-bar progress-bar-info" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">' +
                        '</div>' +
                        '</div>' +
                        '<button class="btn btn-default btn-sm cancelDownload">Cancel</button>' +
                        '</div>');
                }
                break;
            case 'Receive':
                chat.append('<p class="waiting">Remote user offers file:' + message.name + ' ' + (message.size / 1024 / 1024).toFixed(2) + 'MB' +
                    '<button class="btn btn-primary btn-sm accept" type="button">Accept</button>' +
                    '<button class="btn btn-default btn-sm reject" type="button">Reject</button></p>');
                break;
            default:
                var p = document.createElement('p');
                p.innerHTML += ('<b>' + user + ':</b> ');
                var text = document.createTextNode(message);
                p.appendChild(text);
                chat.append(p);

        }
        var myDiv = $('#chatMessages')[0];
        myDiv.scrollTop = myDiv.scrollHeight;
    };

    function acceptClick() {
        myDataChannel.send(JSON.stringify({ type: 'accept' }));
        appender('Downloading', 'Me');
    }

    function cancelClick() {
        myDataChannel.send(JSON.stringify({ type: 'cancel' }));
        appender('Cancel', null);
    }

    function cancelDownloadClick() {
        if (receivedChunksArray.length !== 0) {
            receivedChunksArray = [];
        } else {
            exitFlag = true;
        }
        myDataChannel.send(JSON.stringify({ type: 'cancelWhileDownloading' }));
        appender('CancelWhileDownloading', null);
    }

    var messageSender = function () {
        var text = $('#message').val();
        if (text) {
            appender('My', text);
            var message = {};
            message.type = 'message';
            message.text = text;
            myDataChannel.send(JSON.stringify(message));
            $('#message').val('');
        }
    };

    $('#sendMessage').on('click', messageSender);

    function fileChange() {
        file = this.files[0];
        myDataChannel.send(JSON.stringify({ type: 'fileNotify', name: file.name, size: file.size }));
        appender('Wait', null);
        exitFlag = false;
    }

    function changeProgress() {
        currentWidth = (count / numberOfChunks * 100);
        $('.progress-bar').last().width(Math.ceil(currentWidth) + '%');
    }

    $('#fileInput').on('click', function () {
        $('input').val('');
    });

    function onReadAsDataUrl(event, text) {
        if (!exitFlag) {
            var data = {};
            data.type = 'file';
            data.ext = file.name;
            data.size = file.size;
            data.chunkNumber = count++;

            if (event) {
                text = event.target.result;
                data.numberOfChunks = numberOfChunks = Math.ceil(text.length / chunkLength);
            }

            if (text.length > chunkLength) {
                data.chunk = text.slice(0, chunkLength);
            } else {
                data.chunk = text;
                data.last = true;
            }

            changeProgress();
            sendedChunksArray[data.chunkNumber] = data;
            myDataChannel.send(JSON.stringify(data));

            var remainingDataURL = text.slice(data.chunk.length);

            if (remainingDataURL.length) {
                if (browserIdentify() === 'Chrome') {
                    setTimeout(function () {
                        onReadAsDataUrl(null, remainingDataURL);
                    }, 4);
                } else {
                    onReadAsDataUrl(null, remainingDataURL);
                }
            }
        }
    }
})(this);