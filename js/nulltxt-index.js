var NULLTXT_URL = "http://dev.nulltxt.se";
var RECV_MSGS_URL = "msg/in/";

var debug = 1;
function log(aMsg)
{
  if (debug) {
    console.log("comm-frame...");
    console.log(aMsg);
  }
}

$(document).ready(function (){
  console.log("document ready...");
  // UI tweaking
  $("#read-messages-view").hide();
  $("#compose-view").hide();

  $("#main-focus-fetch-msgs").click(function (evt){
    nulltxt.fetchMsgs();
  });

  // SETTINGS
  $("#main-focus-settings").click(function (evt){
    $(".top-view").hide();
    // load the settings into the view:
    $("#handle")[0].value = nulltxt.settings.handle;
    $("#incoming-url")[0].value = nulltxt.settings.incomingURL;
    $("#outgoing-url")[0].value = nulltxt.settings.outgoingURL;
    $("#api-key")[0].value = nulltxt.settings.apiKey;
    $("#settings-view").show();
  });

  $("#settings-view").hide();

  $("#settings-close").click(function (evt){
    $("#settings-view").hide();
  });

  $("#settings-save").click(function (evt){
    nulltxt.settingsSave();
  });

  $("#main-focus-compose").click(function (evt){
    nulltxt.showComposeUI();
  });
  $("#compose-cancel").click(function (evt){
    nulltxt.cancelCompose();
  });

  // double-click handler:
  $("#inbox").dblclick( function(evt){
    nulltxt.displayMsg(evt.target.getAttribute("id"));
  });

  // read message close operation
  $("#read-msg-close").click(function(evt){
    nulltxt.closeMsg();
  });
});

function notify(aMsg)
{
  // XXX: convert this to a growl-like notification
  alert(aMsg);
}

function iframeReady(aEvt)
{
  log("iframe loaded: " + aEvt);
}

$("#comm-frame-outgoing").load(function (aEvt){
  log("comm frame loaded");
  log(aEvt);
});

window.addEventListener("message", receiveMsg, false);

var STATUS_OK = 1;
var STATUS_ERR = 2;

function receiveMsg(aEvt)
{
  log("INCOMING MESSAGE: nulltxt-index");
  log("nulltxt data: " + aEvt.data);
  log("nulltxt source: " + aEvt.source);
  log("nulltxt origin: " + aEvt.origin);
  var msg = JSON.parse(aEvt.data); // JSON.parse(aEvt.data);
  log("nulltxt data as object: " + msg);
  if (msg) {
    if (msg.operation) {
      switch(msg.operation) {
      case "msg-reception":
        if (msg.status == STATUS_OK) {
          nulltxt.console.log(msg);
        }
        else {
          notify("Message delivery failed, see console");
          nulltxt.console.error(msg);
        }
        break;
      case "incoming-contact-meta-data":
        nulltxt.console.log("incoming-contact-meta-data: " + msg["user-handle"]);
        log("handle metadata");
        nulltxt.handleContactMetaData(msg);
        break;
      case "fetch-msgs-response":
        nulltxt.console.log("fetch msgs response: " + msg);
        nulltxt.handleIncomingMessages(JSON.parse(msg.msgs));
        break;
      default:
        break;
      }
    }
  }
  else {
    console.error("Incoming message failed to parse: " + aEvt.data);
  }
}

function NullTxt(){
  var settings = localStorage.getItem("settings");
  if (!settings) {
    this.console.warn("settings are null");
    this.init();
  }
  else {
    this._settings = JSON.parse(settings);
    this.console.log("settings are loaded");
  }
}

NullTxt.prototype = {
  init: function idx_init()
  {
    var _settings = { handle: "",
                      incomingURL: "comm.html",
                      outgoingURL: "comm.html",
                      apiKey: "123456789-09876-09876-1234"
                    };
    var settings = JSON.stringify(_settings);
    localStorage.setItem("settings", settings);
    this.console.log("settings created.");
    this._settings = _settings;
  },

  loadFrame: function idx_loadFrame(aURL)
  {
    $("#outer-frame").children().remove();
    var frameHtml = '<iframe id="comm-frame" src="' + aURL + '" width="10" height="10"><p>Your browser does not support iframes.</p></iframe>';
    $("#outer-frame").append(frameHtml);
    // XXX: need to listen for load event to set 'messagingReady'
  },

  loadOutgoingFrame: function idx_loadOutFrame(aURL, aCallback)
  {
    $("#comm-frame-out").children().remove();
    var frameHtml = '<iframe id="comm-frame-outgoing" src="' +
      aURL +
      '" width="200" height="1000"><p>Your browser does not support iframes.</p></iframe>';
    $("#comm-frame-out").append(frameHtml);

    console.log("Attaching outcoming comm frame, adding load event handler");
    $("#comm-frame-outgoing").load(aCallback);
  },

  loadIncomingFrame: function idx_loadIncomingFrame(aURL, aCallback)
  {
    $("#comm-frame-in").children().remove();
    var frameHtml = '<iframe id="comm-frame-incoming" src="' +
      aURL +
      '" width="200" height="1000"><p>Your browser does not support iframes.</p></iframe>';
    $("#comm-frame-in").append(frameHtml);
    console.log("Attaching incoming comm frame, adding load event handler");
    $("#comm-frame-incoming").load(aCallback);
  },

  get settings() {
    // Settings are stored in localStorage
    // handle, incomingURL, outgoingURL, apiKey
    // endpoints: { incoming: [{}],  outgoing: [{}] } // XXX: add support for multiple endpoints
    var test = localStorage.getItem("settings");
    if (test) {
      var settingsObj = JSON.parse(test);
      this._settings = settingsObj;
      return settingsObj;
    }
    else {
      throw new Error("Error: Settings are null");
    }
  },

  settingsConfig: {
    handle: "handle",
    incomingURL: "incomingURL",
    outgoingURL: "outgoingURL",
    apiKey: "apiKey"
  },

  settingsSave: function idx_settingsSave()
  {
    var updateObj = {
      handle: $("#handle")[0].value,
      incomingURL: $("#incoming-url")[0].value,
      outgoingURL: $("#outgoing-url")[0].value,
      apiKey: $("#api-key")[0].value
    };

    var settings = this.settings;
    var updateRequired = false;
    for (var prop in updateObj) {
      if (prop in this.settingsConfig) {
        this._settings[prop] = updateObj[prop];
        updateRequired = true;
      }
      else {
        this.console.warn("Settings: " + prop + " not a valid setting property.");
      }
    }
    if (updateRequired) {
      localStorage.setItem("settings", JSON.stringify(this._settings));
    }
  },

  getContactMetaData: function idx_getContactMetaData()
  {
    var _req = { operation: "contact-meta-data-request" };
    var req = JSON.stringify(_req);
    log(req);
    $("#comm-frame-outgoing")[0].contentWindow.postMessage(req, NULLTXT_URL);
  },

  sendMsg: function idx_sendMsg(aMsg, aMsgID)
  {
    log("sending message: " + aMsgID);
    log("message: " + aMsg);
    try {
      // XXX: change the NULLTXT_URL to document.location? or the origin?
      $("#comm-frame-outgoing")[0].contentWindow.postMessage(aMsg, NULLTXT_URL);
    }
    catch (ex) {
      log(ex);
      notify("Error: Could not postMessage. " + ex);
    }
  },

  _fetching: false,

  fetchMsgs: function idx_fetchMsgs()
  {
    // fetch messages via the iframe
    if (this.settings.incomingURL) {
      this._currentIncomingURL = this.settings.incomingURL;
    }
    var self = this;
    function callback()
    {
      var msg = JSON.stringify({ operation: "fetch-msgs-request",
                                 user: self.settings.handle,
                                 apiKey: self.settings.apiKey
                               });

      $("#comm-frame-incoming")[0].contentWindow.postMessage(msg, NULLTXT_URL);
    }

    this.loadIncomingFrame(this._currentIncomingURL, callback);
  },

  get incomingCommFrame() {
    return $("#incoming-url")[0].contentWindow;
  },

  _currentIncomingURL: null,

  handleIncomingMessages: function idx_handleIncomingMessages(aMsgs)
  {
    for (var idx in aMsgs) {
      console.log(aMsgs[idx]);
      // XXX: use IndexedDB instead, can we push storage off onto a worker?
      // XXX: message ids should be unique
      // localStorage.setItem("msg-" + aMsgs[idx].id, JSON.stringify(aMsgs[idx]));
      // XXX: use data attributes for all attrs in each message
      var msgFormat = '<option id=msg-' +
                        aMsgs[idx].id  +
                        '>' +
                        aMsgs[idx].content +
                        '</option>';
        $("#inbox")[0].appendChild($(msgFormat)[0]);
        self.console.log("Received message " + aMsgs[idx].id + " from " + "XXX"); //
        // XXX: set domain / path where we are getting this message from
      }
  },

  _fetchMsgs: function idx_fetchMsgs()
  {
    // XXX: Change: get all messages via postMessage to comm-frame-incoming
    // XXX: Cycle through all endpoints to collect messages from each server
    // XXX: design authentication routine? Persona? API-key?

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
      // var msgs = JSON.parse(data);

      self.cachedMsgs = msgs;
      msgs = JSON.parse(new String(msgs));
      for (var idx in msgs) {
        console.log(msgs[idx]);
        // XXX: use IndexedDB instead, can we push storage off onto a worker?
        localStorage.setItem("msg-" + msgs[idx].id, JSON.stringify(msgs[idx]));
        // XXX: use data attributes for all attrs in each message
        var msgFormat = '<option id=msg-' + msgs[idx].id  + '>'
                          + msgs[idx].content + '</option>';
        $("#inbox")[0].appendChild($(msgFormat)[0]);
        self.console.log("Recieved message " + msgs[idx].id + " from " + "XXX"); // XXX: set domain / path where we are getting this message from
      }
    });
  },

  displayMsg: function displayMsg(aMsgID)
  {
    var msg = JSON.parse(localStorage[aMsgID]);
    if (!msg) {
      console.error("Cannot get message from storage");
      return;
    }

    $("#inbox-view").hide();
    $("#read-messages-view").show();
    $("#read-msg-content").text(msg.content);
  },

  closeMsg: function closeMsg()
  {
    $("#read-msg-content").children().remove();
    $("#read-messages-view").hide();
    $("#inbox-view").show();
  },

  _composing: false,

  showComposeUI: function showComposeUI()
  {
    if (this._composing) {
      return;
    }
    $("#inbox-view").hide();
    $("#compose-view").show();
    this._composing = true;
  },

  cancelCompose: function canelCompose()
  {
    this._composing = false;
    $("#compose-message")[0].value = "";
    $("#compose-view").hide();
    $("#inbox-view").show();
  },

  saveCompose: function saveCompose()
  {

  },

  sendCompose: function sendCompose()
  {
    // 1. based on the selected contact(s), we need to load a frame or series of frames

    // 2. once the frame(s) is/are loaded we can cycle through them, calling sendMsg
    var frameURI = NULLTXT_URL;
    // x. Generate an ID for the message?
    var msgID = Date.now() + '-' + frameURI + '-' + Math.floor(Math.random() * 10000000);

    this.sendMsg($("#compose-message")[0].value, msgID);
    this.console.log("Attempting to send message " + msgID);
    // 3. once we have recieved back "OK", "MSG_ID" from the postMessage call, we can move the message from 'sending' to 'outbox'

    // x. add this action to a 'messaging log'

    // close this message compose view
    this.cancelCompose();
  },

  console: {

    format: function _format(aMsg)
    {
      if (typeof aMsg == "string") {
        return aMsg;
      }
      // assume an object: {status: 1, operation: "msg-reception", msg: "whoops!"}

      return "status: " + aMsg.status + " operation: " + aMsg.operation + " msg: " + aMsg.msg;
    },

    log: function _log(aMsg)
    {
      var html = '<div class="console-log">' + this.format(aMsg) + '</div>';
      this._write(html);
    },

    error: function _error(aMsg)
    {
      var html = '<div class="console-error">' + this.format(aMsg) + '</div>';
      this._write(html);
    },

    warn: function _warn(aMsg)
    {
      var html = '<div class="console-warn">' + this.format(aMsg) + '</div>';
      this._write(html);
    },

    _write: function _write(aNode)
    {
      $("#console").prepend($(aNode));
    }
  },

  handleContactMetaData:
  function handleContactMetaData(aMetaData, aSupplementalData)
  {
    log("aMetaData>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    log(aMetaData);
    if (aMetaData["user-handle"] &&
        aMetaData["default-endpoint"] &&
        aMetaData["public-key"]) {
      // store this in the database
      log("INSIDE aMetaData........................");
      log(aMetaData);
      var id = aMetaData["user-handle"] + "@" + aMetaData["default-endpoint"];
      this.saveContact(id, aMetaData);
    }
    else {
      console.error("nulltxt.handleContactMetaData: Malformed contact metadata");
    }
  },

  saveContact: function saveContact(aID, aContactObj)
  {
    var contacts = this.contacts;
    if (contacts[aID]) {
      // XXX: do a destructive update for now...
      for (var prop in aContactObj) {
        if (!(prop in contacts[aID][prop])) {
          contacts[aID][prop] = aContacts[prop];
        }
        else if (contacts[aID][prop] != aContacts[prop]) {
          contacts[aID][prop] = aContacts[prop];
        }
      }
    }

    contacts[aID] = aContactObj;
    this._contacts = contacts;
    localStorage.setItem("contacts", JSON.stringify(contacts));
  },

  get contacts() {
    log("get contacts()");
    if (this._contacts) {
      return this._contacts;
    }
    var contacts = localStorage.getItem("contacts");
    if (contacts) {
      this._contacts = JSON.parse(contacts);
      return this._contacts;
    }
    this.console.warn("Contacts is null, going to create it");
    localStorage.setItem("contacts", JSON.stringify({}));
    this._contacts = JSON.parse(localStorage["contacts"]);
    this.console.log("Created contacts.");
    return this._contacts;
  }

  // XXX: Login routine via Persona

  // XXX: Create handle routine: need to check for login before allowing operations

  // XXX: Generate key for handle, save public key on server

  // XXX: Edit comm page

  // XXX: handle search + add to contacts

  // XXX: load contact/handle's comm page, view details

  // XXX: whitelist handle/endpoint combinations

  // XXX: Express/node functionality:
  //  * Host comm page
  //  * Cache messages
  //  * Persona Login
  //

  // XXX: updated endpoints notifications
  //  * a message that contains an object that describes additional endpoints
  //  ... that accept incoming messages for you.
  //
  // XXX: make *all* message sending and recving happen via an iframe
};

var nulltxt = new NullTxt();
