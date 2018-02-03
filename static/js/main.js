var ws = new WebSocket(location.href.replace('http', 'ws').replace('room', 'ws'));
var initiator;
var pc;

function initiatorCtrl(event) {
    console.log(event.data);
    if (event.data == "fullhouse") {
        alert("full house");
    }
    if (event.data == "initiator") {
        console.log('initiator!');
        initiator = false;
        init();
    }
    if (event.data == "not initiator") {
        initiator = true;
        init();
    }
}

ws.onmessage = initiatorCtrl;


function init() {
    var constraints = {
        audio: true,
        video: true
    };
    getUserMedia(constraints, connect, fail);
}


function connect(stream) {
    var iceConfig = {"iceServers": [
        {"url": "stun:stun.l.google.com:19302"},
        {"url": "turn:turn.salar.click:3478?transport=udp", 'credential': 'PASSWORD', 'username': 'salar'}
    ]};
    pc = new RTCPeerConnection(iceConfig);

    if (stream) {
        pc.addStream(stream);
        $('#local').attachStream(stream);
    }

    pc.onaddstream = function(event) {
        $('#remote').attachStream(event.stream);
        logStreaming(true);
    };
    pc.onicecandidate = function(event) {
        console.log("condidate:", event.candidate);
        if (event.candidate) {
            ws.send(JSON.stringify(event.candidate));
        }
    };
    ws.onmessage = function (event) {
        var data = JSON.parse(event.data);
        if (data.sdp) {
            if (initiator) {
                receiveAnswer(data);
            } else {
                receiveOffer(data);
            }
        } else if (data.candidate) {
            console.log("candidate:", data.candidate);
            pc.addIceCandidate(new RTCIceCandidate(data));
        }
    };

    if (initiator) {
        createOffer();
    } else {
        log('waiting for offer...');
    }
    logStreaming(false);
}


function createOffer() {
    log('creating offer...');
    pc.createOffer(function(offer) {
        log('created offer...');
        pc.setLocalDescription(offer, function() {
            log('sending to remote...');
            ws.send(JSON.stringify(offer));
        }, fail);
    }, fail);
}


function receiveOffer(offer) {
    log('received offer...');
    pc.setRemoteDescription(new RTCSessionDescription(offer), function() {
        log('creating answer...');
        pc.createAnswer(function(answer) {
            log('created answer...');
            pc.setLocalDescription(answer, function() {
                log('sent answer');
                ws.send(JSON.stringify(answer));
            }, fail);
        }, fail);
    }, fail);
}


function receiveAnswer(answer) {
    log('received answer');
    pc.setRemoteDescription(new RTCSessionDescription(answer));
}


function log() {
    $('#status').text(Array.prototype.join.call(arguments, ' '));
    console.log.apply(console, arguments);
}


function logStreaming(streaming) {
    console.log("streaming:", streaming);
    $('#streaming').text(streaming ? '[streaming]' : '[..]');
}


function fail() {
    $('#status').text(Array.prototype.join.call(arguments, ' '));
    $('#status').addClass('error');
    console.error.apply(console, arguments);
}


jQuery.fn.attachStream = function(stream) {
    this.each(function() {
        this.src = URL.createObjectURL(stream);
        this.play();
    });
};
