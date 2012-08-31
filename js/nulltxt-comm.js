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
  case "fetch-msgs-request":
    // XXX: xhr to get the messages, return the response to calling window
    // XXX: API key needed here to fetch the messages?
    if (msg.user && msg.apiKey) {
      comm.fetchIncomingMsgs(msg.user, msg.apiKey, aEvt.source);
    }

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
        // 1. check to see if recv operation is already underway first
    if (this._fetching) {
      return;
    }

    this._fetching = true;
    var self = this;

    $.ajax({
      type: "GET",
      url: RECV_MSGS_URL,
      dataType: "json"
      // XXX: add error handler to set _fetching back to false
    }).done(function(msgs) {
      self._fetching = false;
      console.log(msgs);
      var msg = {
        operation: "fetch-msgs-response",
        status: "success",
        msgs: msgs
      };

      aWindow.postMessage(JSON.stringify(msg), NULLTXT_URL);

      // msgs = JSON.parse(new String(msgs));
      // for (var idx in msgs) {
        // console.log(msgs[idx]);
        // XXX: use IndexedDB instead, can we push storage off onto a worker?
        // localStorage.setItem("msg-" + msgs[idx].id, JSON.stringify(msgs[idx]));
        // // XXX: use data attributes for all attrs in each message
        // var msgFormat = '<option id=msg-' + msgs[idx].id  + '>'
        //                   + msgs[idx].content + '</option>';
        // $("#inbox")[0].appendChild($(msgFormat)[0]);
        // self.console.log("Recieved message " + msgs[idx].id + " from " + "XXX"); //
        // XXX: set domain / path where we are getting this message from
      /// }
    });
  }

  //
};
