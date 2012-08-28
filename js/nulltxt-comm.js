var NULLTXT_URL = "http://dev.nulltxt.se";
var MSG_STORE_URL = "msg/store/";

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
  // aEvt.source.postMessage("iframe rcvd message...", NULLTXT_URL);
  log("data: " + aEvt.data);
  log("source: " + aEvt.source);
  log(aEvt.source);
  log("origin: " + aEvt.origin);
  // if (aEvt.origin == NULLTXT_URL) {

  // }
  // else {
  //   throw new Error("Cannot send message, origin verification failed.");
  // }
  log("comm: recieveMsg: msg ");
  var msg = JSON.parse(aEvt.data);

  switch(msg.operation) {
  case "incoming-message":
    if (msg.content) {
      comm.storeMessage(msg);
    }
    else {
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
  case "messages-available-request":
    // XXX: xhr to get the messages, return the response to calling window
    // XXX: API key needed here to fetch the messages?
    comm.messagesAvailable();
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

  //
};
