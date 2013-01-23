onload = function() {
  var start = document.getElementById("start");
  var stop = document.getElementById("stop");
  var saveButtonEl = document.getElementById("save");
  var findProfilesButtonEl = document.getElementById("findProfiles");
  var profileFormEl = document.getElementById("profile");
  var hostedProfileEl = document.getElementById("hostedProfile");
  var foundProfilesEl = document.getElementById("Profiles");
  var hosts = document.getElementById("hosts");
  var directory = document.getElementById("directory");
  var firstName = "[first not set]";
  var lastName = "[last not set]";

  var socket = chrome.experimental.socket || chrome.socket;
  var socketInfo;
  var filesMap = {};

  var stringToUint8Array = function(string) {
    var buffer = new ArrayBuffer(string.length);
    var view = new Uint8Array(buffer);
    for(var i = 0; i < string.length; i++) {
      view[i] = string.charCodeAt(i);
    }
    return view;
  };

  var arrayBufferToString = function(buffer) {
    var str = '';
    var uArrayVal = new Uint8Array(buffer);
    for(var s = 0; s < uArrayVal.length; s++) {
      str += String.fromCharCode(uArrayVal[s]);
    }
    return str;
  };

  var logToScreen = function(log) {
    logger.textContent += log + "\n";
  }

  var writeErrorResponse = function(socketId, errorCode) {
    var file = { size: 0 };
    console.info("writeErrorResponse:: begin... ");
    console.info("writeErrorResponse:: file = " + file);
    var contentType = "text/plain";  //(file.type === "") ? "text/plain" : file.type;
    var contentLength = file.size;
    var header = stringToUint8Array("HTTP/1.0 " +errorCode+ " Not Found\nContent-length: " + file.size + "\nContent-type:" + contentType + "\n\n");
    console.info("writeErrorResponse:: Done setting header...");
    var outputBuffer = new ArrayBuffer(header.byteLength + file.size);
    var view = new Uint8Array(outputBuffer)
    view.set(header, 0);
    console.info("writeErrorResponse:: Done setting view...");
    socket.write(socketId, outputBuffer, function(writeInfo) {
      console.log("WRITE", writeInfo);
      socket.destroy(socketId);
      socket.accept(socketInfo.socketId, onAccept);
    });
    console.info("writeErrorResponse::filereader:: end onload...");

    console.info("writeErrorResponse:: end...");
  };

    var write200ResponseJson = function(socketId, obj) {
        var file = { size: 0 };

        var json = JSON.stringify(obj);

        console.info("write200ResponseJson:: begin... ");
        console.info("write200ResponseJson:: json = " + json);
        var contentType = "application/json";  //(file.type === "") ? "text/plain" : file.type;
        var contentLength = json.length;
        var header = stringToUint8Array("HTTP/1.0 200 OK\nContent-length: " + contentLength + "\nContent-type:" + contentType + "\n\n" + json);
        console.info("write200ResponseJson:: Done setting header...");
        var outputBuffer = new ArrayBuffer(header.byteLength + contentLength);
        var view = new Uint8Array(outputBuffer);
        view.set(header, 0);
        console.info("writeErrorResponse:: Done setting view...");
        socket.write(socketId, outputBuffer, function(writeInfo) {
            console.log("WRITE COMPLETE", writeInfo);
            socket.destroy(socketId);
            socket.accept(socketInfo.socketId, onAccept);
        });
        console.info("write200ResponseJson::filereader:: end onload...");

        console.info("write200ResponseJson:: end...");
    };

  var onAccept = function(acceptInfo) {
    console.log("ACCEPT", acceptInfo)
    //  Read in the data from the client
    socket.read(acceptInfo.socketId, function(readInfo) {
      console.log("READ", readInfo);
      // Parse the request.
      var data = arrayBufferToString(readInfo.data);

      console.log(data);

      if (data.indexOf("GET /profile.json") == 0) {
          // we're getting the user profile

          write200ResponseJson(acceptInfo.socketId, {"firstName":firstName,"lastName":lastName});
      }
      else {
        writeErrorResponse(acceptInfo.socketId, 404);
        // Throw an error
        //socket.destroy(acceptInfo.socketId);
      }
    }); 
  };

  saveButtonEl.onclick = function() {
      var fullName = profileFormEl["firstName"].value + "  " + profileFormEl["lastName"].value;
      firstName = profileFormEl["firstName"].value;
      lastName = profileFormEl["lastName"].value;
      hostedProfileEl.innerHTML = fullName;
  }

  start.onclick = function() {
    socket.create("tcp", {}, function(_socketInfo) {
      socketInfo = _socketInfo;
      socket.listen(socketInfo.socketId, hosts.value, 8082, 20, function(result) {
        console.log("LISTENING:", result);
        console.log(socketInfo.socketId);
        socket.accept(socketInfo.socketId, onAccept);
      });
    });

    stop.disabled = false;
    start.disabled = true;
  };

  stop.onclick = function() {
    stop.disabled = true;
    start.disabled = false;
    socket.destroy(socketInfo.socketId);
  };

  findProfiles.onclick = function() {
      console.log("------- finding profiles on the network!");

      var myHost = hosts.value;

      console.log(myHost);
      var hostParts = myHost.split(".");

      var myHostPart = parseInt(hostParts[3]);

      for (var i = 2; i < 256; i++) {
          if (i != myHostPart) {
              console.log("Requesting profile from " + i);
              $.ajax({
                  url: 'http://' + hostParts[0] + "." + hostParts[1] + "." + hostParts[2] + "." + i + '/profile.json',
                  success: function(o, success, responseText) {
                      if (success) {
                          console.log("responseText: " + responseText);
                          var obj = JSON.parse(responseText);
                          foundProfilesEl.innerHTML = foundProfilesEl.innerHTML + "<br>" + obj.firstName + " " + obj.lastName;
                      } else {
                          console.error("Response was something not successful");
                      }
                  },
                  error: function(xhr, textStatus, errorThrown) {
                      console.error("THERE WAS AN ERROR!!");
                      console.error(error.message);
//                      if(xhr.status == 401){
//                          var validator = $('#loginForm').validate();
//                          if(xhr.responseText.indexOf("Invalid username/password") != -1){
//                              validator.showErrors({'loginUsername':'Invalid username/password','loginPassword':''});
//                          } else if(xhr.responseText.indexOf("Unverified account.") != -1){
//                              validator.showErrors({'loginUsername':'Check your email and verify your email','loginPassword':''});
//                          } else {
//                              validator.showErrors({'loginUsername':'Error while trying to authenticate','loginPassword':''});
//                          }
//                      }
                  }
              });

          } else {
              console.log("skipped: " + i);
          }
      }



      // take the selected network, and use that as the basis of searching
  }

  socket.getNetworkList(function(interfaces) {
    for(var i in interfaces) {
      var interface = interfaces[i];
      var opt = document.createElement("option");
      opt.value = interface.address;
      opt.innerText = interface.name + " - " + interface.address;
      hosts.appendChild(opt);
    }
  });


};
