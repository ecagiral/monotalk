var isOrig = false;

  function init(orig,host)
  {
	isOrig = orig;
	printStatus("web socket aciliyor. ");
    websocket = new WebSocket("ws://"+host+"/channel");
    websocket.onopen = function(evt) { onOpen(evt) };
    websocket.onclose = function(evt) { onClose(evt) };
    websocket.onmessage = function(evt) { onMessage(evt) };
    websocket.onerror = function(evt) { onError(evt) };
    printStatus("webrtc init");
    //initializeWEBRTC();
  }

  function onOpen(evt)
  {
	  printStatus("web socket acildi. karsi taraf bekleniyor");
	  setTimeout(sendPing, 20000);
  }

  function onClose(evt)
  {
    
  }

  function onMessage(evt)
  {
	  console.log(evt.data);
	  var message = $.parseJSON(evt.data);
	  if(message.type==="chat"){
		  $('#messages').append('<div>O   : '+message.msg+'</div>')  
	  }else if(message.type==="join"){
		  printStatus("karsi taraf baglandi");
		  displayTalk();
		  if(isOrig){
		  	initializeWEBRTC();
	  	  }else{
	  		setTimeout(sendJoin, 1000);
	  	  }
	  }else if(message.type==="offer"){
		  displayTalk();
		  printStatus("karsi taraf baglandi");
		  initializeWEBRTC(message.msg); 		  
	  }else if(message.type==="answer"){
		  handleAnswer(message.msg);
	  }else if(message.type==="ice"){
		  handleICE(message.msg);
	  }else if(message.type==="ping"){
		  //reply?
	  }
	
  }

  function onError(evt)
  {
    alert('hata: ' + evt.data);
  }

  function doSend()
  {
	var message =  $('#msgToSend').val();

	$('#messages').append('<div>Ben : '+message+'</div>')
	var data = {};
	data.type = "chat";
	data.msg = message;
    websocket.send(JSON.stringify(data));
  }
  
  function doJoin()
  {
	var talkId =  $('#talkToJoin').val();

	window.location = "/"+talkId;
  }
  
  function doCreate()
  {
	window.location = "/create";
  }
  
  JSON.stringify = JSON.stringify || function (obj) {
	    var t = typeof (obj);
	    if (t != "object" || obj === null) {
	        // simple data type
	        if (t == "string") obj = '"'+obj+'"';
	        return String(obj);
	    }
	    else {
	        // recurse array or object
	        var n, v, json = [], arr = (obj && obj.constructor == Array);
	        for (n in obj) {
	            v = obj[n]; t = typeof(v);
	            if (t == "string") v = '"'+v+'"';
	            else if (t == "object" && v !== null) v = JSON.stringify(v);
	            json.push((arr ? "" : '"' + n + '":') + String(v));
	        }
	        return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
	    }
	};
	
	var pc;
	var video;
	var remoteStream;
	var config = new Object();
	var sdpConstraints;
	var sessionData;
	var streamToAttach;
	var localAttached = false;
	var iceReady = false;
	var iceList = new Array();

	var attachLocalMedia =function(audioData,offer){
        
	    if (getUserMedia) {
	    	getUserMedia({ audio: audioData, video: true },
		        function (stream) {
	    			localAttached = true;
		            streamToAttach = stream;
		            localvideo = document.querySelector('#local-stream');
		            attachMediaStream(localvideo,stream);
				    pc.addStream (streamToAttach);
				    if(offer){
				    	handleOffer(offer);
				    }else{
				    	createOffer();
				    }
		        },
		        function (err) {
		            console.log("get user media error occured: " + err);
		        }
	    	);
	    }else{
	            alert("This browser does not support video communication");
	    }
	}
	
	var initializeWEBRTC = function(offer,attach){
		unsetIceReady();
	    try{
	        if(navigator.mozGetUserMedia){
	            //firefox
	            config = {"iceServers": [{"url":"stun:stun1.l.google.com:19302"}]};
	            pc = new RTCPeerConnection(config);
	            sdpConstraints = {
	                optional: [],
	                mandatory: {
	                    OfferToReceiveAudio: false,
	                    OfferToReceiveVideo: true,
	                    MozDontOfferDataChannel: true
	                }
	            };
	        }else if(navigator.webkitGetUserMedia){
	            //chrome
	            config = {"iceServers": [{"url":"turn:guven@192.241.208.203:3478", "credential":"12345"}]};
	            pc = new RTCPeerConnection(config,{optional: [{ DtlsSrtpKeyAgreement: true}]});
	            sdpConstraints = {
	                optional: [],
	                mandatory: {
	                    OfferToReceiveAudio: true,
	                    OfferToReceiveVideo: true,
	                }
	            };
	        }
	    }catch(e){
	        console.log("error on connection create: ",e);
	    }

	    if(!pc){
	        return;
	    }

	    pc.onicecandidate = function (evt) {
	        if (!pc || !evt || !evt.candidate) return;
	        sendCandidate(evt.candidate);

	    };

	    pc.oniceconnectionstatechange = function (evt) {
	        console.log("ice connection state changed: "+pc.iceConnectionState);
	        printStatus(pc.iceConnectionState);
	    };

	    pc.onsignallingstatechanged = function (evt) {
	        console.log("signalling state change");
	    };

	    pc.onnegotiationneeded = function () {
	        console.log("negatiation needed");
	    };

	    pc.onaddstream = function (evt) {
	         if (!evt) return;
	         remoteStream = evt.stream;
	         video = document.querySelector('#remote-stream');
	         attachMediaStream(video,remoteStream);
	         waitUntilRemoteStreamStartsFlowing();
	    };
	    attachLocalMedia(false,offer)

	}
	

	var handleICE = function(data){
	   if(pc){

           var iceCand = new RTCIceCandidate({
               sdpMLineIndex: data.sdpMLineIndex,
               candidate: data.candidate
           })
		   if(iceReady){
			   pc.addIceCandidate(iceCand); 
		   }else{
			   iceList.push(iceCand);
		   }
           
	   }
	};

	var handleOffer = function(data){
	    if(pc){
	    	printStatus("handshake started");
	        var sdp = data;
	        var remoteDesc = new RTCSessionDescription(sdp);
	        try{
	            pc.setRemoteDescription(remoteDesc, function () {
	                // if we received an offer, we need to answer
	                if (pc.remoteDescription.type == "offer")
	                	setIceReady();
	                    createAnswer();
	            }, logError)
	        }catch(e){
	            console.log("handle offer hata:",e);
	        }
	    }

	};

	var createAnswer = function(){
	    if(pc){
	        try{
	            pc.createAnswer(function (sessionDescription) {
	                console.log("answer created");
	                pc.setLocalDescription(sessionDescription);
	                sendAnswerSignal(sessionDescription);
	                //now wait for ice candidates

	            }, null, sdpConstraints);
	        }catch(e){
	            console.log("create answer ex:",e);
	        }
	    }
	}

	var sendAnswerSignal = function(signal){
		var data = {};
		data.type = "answer";
		data.msg = signal;
	    websocket.send(JSON.stringify(data));
	}

	var sendCandidate = function(signal){
		var data = {};
		data.type = "ice";
		data.msg = signal;
	    websocket.send(JSON.stringify(data));
	}
	
	var sendJoin = function(){
		var data = {};
		data.type = "join";
	    websocket.send(JSON.stringify(data));
	}
	
	var sendPing = function(){
		var data = {};
		data.type = "ping";
	    websocket.send(JSON.stringify(data));
	    setTimeout(sendPing, 20000);
	}
	

	function waitUntilRemoteStreamStartsFlowing()
	{
	    if (!(video.readyState <= HTMLMediaElement.HAVE_CURRENT_DATA
	        || video.paused || video.currentTime <= 0))
	    {        

	        console.log("ready");
	    }
	    else{
	        console.log(" not ready");
	        setTimeout(waitUntilRemoteStreamStartsFlowing, 500);
	    }
	}




	var createOffer = function(){
	    if(pc){
	    	printStatus("handshake started");
	        pc.createOffer(function (sessionDescription) {
	        	setIceReady();
	            //sessionDescription.sdp = sessionDescription.sdp.replace("a=sendrecv","a=sendonly");
	            pc.setLocalDescription(sessionDescription);
	            sendOfferSignal(sessionDescription);
	            //now wait for answer from customer

	        }, null, sdpConstraints);
	    }
	}

	var sendOfferSignal = function(signal){
		var data = {};
		data.type = "offer";
		data.msg = signal;
	    websocket.send(JSON.stringify(data));
	}

	var handleAnswer = function(data){
	    var remoteDesc = new RTCSessionDescription(data);
	    pc.setRemoteDescription(remoteDesc, function () {
	        // if we received an offer, we need to answer
	        if (pc.remoteDescription.type == "answer")
	            console.log("offer answer completed");
	        	printStatus("handshake finished");
	            //now wait for ice candidates from customer
	            //getCustomerSignal();
	    }, logError)
	};

	var setIceReady = function(){
		iceReady = true;
		for (var i = 0; i < iceList.length; i++) {
		    pc.addIceCandidate(iceList[i]);
		}
		iceList = new Array();
	}
	
	var unsetIceReady = function(){
		iceReady = false;
		iceList = new Array();
	}

	var logError = function(data){
	    console.log("hata",data);
	}
	
	var printStatus = function(status){
		$('#talkStatus').text(status);
	}
	
	var displayTalk = function(){
		$('#talkWindow').show();
	}