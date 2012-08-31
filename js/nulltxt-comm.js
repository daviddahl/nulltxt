var NULLTXT_URL = "http://dev.nulltxt.se";
var MSG_STORE_URL = "msg/store/";
var RECV_MSGS_URL = "msg/in/";
var SEND_MSGS_URL = "msg/out/";

var debug = 1;
function log(aMsg)
{
  if (debug) {
    console.log("comm.js...");
    console.log(aMsg);
  }
}

window.addEventListener("load", docLoad, false);

function docLoad(aEvent)
{
  log("nulltxt-comm.js loaded");
}

window.addEventListener("message", receiveMsg, false);

function receiveMsg(aEvt)
{
  log("INCOMING MESSAGE: nulltxt-comm");
  log("msg: " + aEvt.data);
  log("source: " + aEvt.source);
  log("origin: " + aEvt.origin);
  // if (aEvt.origin == NULLTXT_URL) {
  // // XXX: Deal with it
  // }
  // else {
  //   throw new Error("Cannot send message, origin verification failed.");
  // }
  var msg = JSON.parse(aEvt.data);

  switch(msg.operation) {
  case "incoming-message":
    if (msg.content) {
      comm.storeMessage(msg);
    }
    else {
      // XXX: need to respond back to the calling window with this information
      throw new Error("Message missing message content");
    }
    break;
  case "contact-meta-data-request":
    // get the meta data form the comm-data meta tag
    log("recieveMsg commData");
    var commData = JSON.parse($("#comm-data")[0].getAttribute("content"));
    commData["operation"] = "incoming-contact-meta-data";
    log(commData);
    // convert to string
    var commDataJSON = JSON.stringify(commData);
    aEvt.source.postMessage(commData, NULLTXT_URL);
    break;
  case "fetch-msgs-request":
    // XXX: xhr to get the messages, return the response to calling window
    // XXX: API key needed here to fetch the messages?
    if (msg.user && msg.apiKey) {
      comm.fetchIncomingMsgs(msg.user, msg.apiKey, aEvt.source);
    }
  case "send-msgs-request":
    if (msg.user && msg.apiKey && msg.msgs) {
      comm.sendOutgoingMsgs(msg, aEvt.source);
    }
    break;
  case "user-lookup-request":
    if (msg.user) {
      comm.userLookup(msg, aEvt.source);
    }
    break;
  default:
    break;
  }
}

var comm = {

  storeMessage: function comm_storeMessage(aMsgObj)
  {
    if (aMsgObj.content) {
      $.ajax({
        type: "POST",
        url: MSG_STORE_URL,
        data: { message: JSON.stringify(aMsgObj) } // XXX: use arrayBuffer eventually
      }).done(function(msg) {
        alert("Message Sent");
      });
    }
  },

  _fetching: false,

  fetchIncomingMsgs: function comm_getIncomingMsgs(aUser, aApiKey, aWindow)
  {
    $.ajax({
      type: "GET",
      url: RECV_MSGS_URL,
      dataType: "json"
    }).done(function(msgs) {
      console.log(msgs);
      var msg = {
        operation: "fetch-msgs-response",
        status: "success",
        msgs: msgs
      };
      aWindow.postMessage(JSON.stringify(msg), NULLTXT_URL);
    });
  },

  sendOutgoingMsgs: function comm_sendOutgoingMsgs(aMsg, aWindow)
  {
    // xhr the messages to the server
    $.ajax({
      type: "POST",
      url: SEND_MSGS_URL,
      dataType: "json",
      data: {
        msgs: JSON.stringify(aMsg.msgs), // message array - single origin for now
        user: aMsg.user,
        apiKey: aMsg.apiKey
      }
      // XXX: Need error callback
    }).done(function(msg) {
      console.log("send messages response: " + msg);
      if (msg.status == "success") {
        var response = {
          operation: "send-msgs-response",
          status: "success"
        };
      }
      else {
        var response = {
          operation: "send-msgs-response",
          status: "failure"
        };
      }
      aWindow.postMessage(JSON.stringify(msg), NULLTXT_URL);
    });
  },

  userLookup: function comm_userLookup(aReq, aHost)
  {
    // aReq.userHandle, aReq.host
    
  }
};
