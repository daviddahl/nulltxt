/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Author: David Dahl <ddahl@nulltxt.se> */

var NULLTXT_URL = window.location.protocol + "//" +  window.location.host;
// "https://dev.nulltxt.se:8000";
var RECV_MSGS_URL = "msg/in/";
var SUCCESS = "success";
var FAILURE = "failure";

var ACCT_STATUS_BEGIN = 2; // Contacts may exist, but no account created yet
var ACCT_STATUS_HANDLE_ONLY = 3; // Handle was created, keys not yet created
var ACCT_STATUS_COMPLETE = 4; // Handle and Keys exist

var debug = 1;
function log(aMsg)
{
  if (debug) {
    var msg = [];
    for (var prop in arguments) {
      msg.push(arguments[prop]);
    }
    console.log(document.location.pathname + ": " + msg.join(" "));
  }
}

function pprint(aObj, aRecurse)
{
  var depth = "";
  if (typeof aObj == "object") {
    if (aObj.constructor == Array) {
      log("Array:", aObj);
      console.log(aObj);
    }
    else {
      log("Object: ", aObj.constructor);
      for (var prop in aObj) {
        if (aRecurse) {
          pprint(aObj[prop]);
        }
        if (typeof aObj[prop] == "function") {
          log("function ", prop);
        }
        else {
          log(prop, ": ", aObj[prop]);
          if ((aObj[prop] != "" && aObj[prop] != undefined) &&
            (typeof aObj[prop] != "number" || typeof aObj[prop] != "string")) {
            console.log(aObj[prop]);
          }
        }
      }
    }
  }
  else {
    log((typeof aObj),": ", aObj);
  }
}

function wipeAccount()
{
  log("WIPING CLIENT SIDE ACCOUNT DATA");
  window.onbeforeunload = null;
  localStorage.clear();
}

function wipeServer()
{
  // TODO
}

var nulltxt;

$(document).ready(function (){
  console.log("document ready...");

  $("#console-wrapper").hide();
  $("#console-toggle-btn").toggle(
    function () {
      $("#console-wrapper").show();
    },
    function () {
      $("#console-wrapper").hide();
    }
  );

  nulltxt = new NullTxt(); // construct the app

  window.onbeforeunload = function _beforeUnload(evt) {
    nulltxt.sync();
  };

  // UI tweaking
  $("#read-messages-view").hide();
  $("#compose-view").hide();
  $("#contact-lookup").hide();

  $("#main-focus-fetch-msgs").click(function (evt) {
    nulltxt.fetchMsgs();
  });

  // CONTACTS

  $("#main-focus-contacts").click(function (evt) {
    $(".top-view").hide();
    $("#contact-lookup-progress").hide();
    $("#contact-lookup").show();
    $("#contact-input")[0].focus();
  });

  $("#choose-contact-message-btn").click(function (evt) {
    // nulltxt.chooseContact();
    nulltxt.composeRun();
  });

  $("#invite-new-contact-message-btn").click(function (evt) {
    nulltxt.inviteColleague();
  });

  $("#invite-new-contact-btn").click(function (evt) {
    nulltxt.inviteColleague();
  });

  $("#contact-lookup-btn").click(function (evt) {
    $("#contact-lookup-progress").show();
    this.disabled = true;
    var url = $("#contact-input")[0].value;
    log("url: ", url);
    if (url) {
      nulltxt.lookupContact(url);
    }
  });

  $("#contact-lookup-cancel-btn").click(function (evt) {
    $("#contact-lookup-progress").hide();
    $("#contact-lookup-btn")[0].disabled = false;
    $("#contact-input")[0].value = "";
    $("#contact-lookup-result").children().remove();
    // cancel the postMessage
    $("#contact-lookup").hide();
    $("#inbox-view").show();
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
  $("#invite-view").hide();
  $("#lookup-invite-view").hide();

  $("#create-handle-btn").click(function (evt) {
    nulltxt.chooseHandle();
    this.disabled = true;
  });

  $("#begin-using-btn").click(function (evt) {
    nulltxt.reload();
  });

  $("#verify-invite-btn").click(function (evt) {
    var inviteID = localStorage.getItem("currentInvitation");
    $("#begin-view").hide();
    nulltxt.verifyAcceptInvite();
  });

  $("#settings-close").click(function (evt){
    $("#settings-view").hide();
    $("#inbox-view").show();
  });

  $("#settings-save").click(function (evt){
    nulltxt.settingsSave();
  });

  $("#main-focus-compose").click(function (evt){
    nulltxt.showComposeUI();
  });
  $("#compose-cancel").click(function (evt){
    nulltxt.composeCancel();
  });
  $("#compose-send").click(function (evt){
    nulltxt.composeSend();
  });
  // $("#compose-save").click(function (evt){
  //   nulltxt.composeSave();
  // });

  // double-click handler:
  $("#inbox").dblclick( function(evt){
    nulltxt.displayMsg(evt.target.getAttribute("id"));
  });

  // read message close operation
  $("#read-msg-close").click(function(evt){
    $("#read-msg-decrypt")[0].disabled = false;
    nulltxt.closeMsg();
  });

  // Open decrypt UI
  $("#read-msg-decrypt").click(function(evt){
    this.disabled = true;
    nulltxt.decryptMessage();
  });

  $("#verify-invite-view").hide();

  var re = /lookup-invite/;
  if (re.exec(document.location.search)) {
    var iid = URI.parse(document.location).query.split("&")[0].split("=")[1];
    log("IID: " + iid);
    if (iid) {
      localStorage.setItem("currentInvitation", iid);
      setTimeout(function () {
        nulltxt.lookupInvite();
      }, 1000);
    }
  }

  re = /invitation/;
  log(document.location.search);
  if (re.exec(document.location.search)) {
    log("INVITE FOUND");
    var iid = URI.parse(document.location).query.split("&")[0].split("=")[1];
    log(iid);
    if (iid) {
      localStorage.setItem("currentInvitation", iid);
      setTimeout(function () {
        nulltxt.verifyInvite();
      }, 1000);
    }
  } else {
    log("No special operation to handle...");
  }

  // load any messages in the inbox
  nulltxt.loadInboxMessages();
// END initialization of events
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
        try {
          nulltxt.handleIncomingMessages(msg.msgs);
        }
        catch (ex) {
          log(ex);
          log(ex.stack);
        }
        break;
      case "send-msgs-response":
        nulltxt.console.log("send msgs response: " + msg);
        nulltxt.handleOutgoingMessagesResponse(JSON.parse(msg.msgs));
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
  else if (!settings.handle){
    this._settings = JSON.parse(settings);
    this.console.log("settings are loaded");
    if (this._settings.accountStatus == 4) {
      $("#begin-view").hide();
    }
    else {
      $("#inbox-view").hide();
    }
  }
}

NullTxt.prototype = {
  init: function idx_init()
  {
    var _settings = { handle: "",
                      incomingURL: "comm.html",
                      outgoingURL: "comm.html",
                      apiKey: UUID.generate(),
                      token: null,
                      accountStatus: ACCT_STATUS_BEGIN
                    };
    var settings = JSON.stringify(_settings);
    localStorage.setItem("settings", settings);
    this.console.log("settings created.");
    this._settings = _settings;

    // display the 'begin view'
    this.begin();
  },

  chooseHandle: function idx_chooseHandle()
  {
    var handle = prompt("Please choose a user 'handle' (username)");
    if (handle) {
      this.verifyHandle(handle);
    }
  },

  verifyHandle: function idx_verifyHandle(aHandle)
  {
    var url = "/verify-handle?handle=" +
      aHandle; // XXX: [A-Z][a-z][0-9][_] regex
    var self = this;
    $.ajax({
      type: "GET",
      url: url,
      dataType: "json"
    }).done(function(msg) {
      if (msg.status == "success") {
        var token = UUID.generate();
        url = "/claim-handle?handle=" + aHandle + "&token=" + token;
        log(url);
        // createHandle
        log("claiming handle!!!!");
        $.ajax({
          type: "GET",
          url: url,
          dataType: "json"
        }).done(function(msg) {
          log("claim handle done!!!");
          if (msg.status == "success") {
            log("claim handle success!!!");
            self.updateSettings({handle: aHandle,
                                 token: token,
                                 accountStatus: ACCT_STATUS_HANDLE_ONLY});
            // log this action to the visible console
            self.console.log("The account for " + aHandle + " is now set up.");
            self.console.log("Beginning key generation...");
            self.generateKeypair();
            $("#begin-using-btn")[0].disabled = false;
          }
          else {
            alert(msg.msg);
          }
        });
      }
      else {
        alert("Could not verify the handle you chose, another user has claimed it.");
        self.chooseHandle();
      }
    });
  },

  generateKeypair: function idx_generateKeypair()
  {
    // make sure navigator.bridge.getCipherObject is available...
    this.console.log("Checking for nulltxt extension...");
    if (window.navigator.bridge) {
      // check to see if there is a keyID in the settings first
      if (this.settings.keyID) {
        this.console.log("Keypair found in settings");
        return;
      }

      var that = this;

      function success ()
      {
        log("success!");
        var self = this;
        // save the keypair's public key to the settings, also save the ID
        var settings = {
          keyID: self.result.id,
          publicKey: self.result.publicKey,
          accountStatus: ACCT_STATUS_COMPLETE
        };
        log(settings.keyID);
        log(settings.publicKey);
        log("updateSettings...");
        that.updateSettings(settings);
        that.console.log("KeyGen complete! KeyID: " + self.result.id);
      }

      function error(aError)
      {
        that.console.error(aError);
      }
      cryptoKeygen(success, error);
      // tell the user about inviting friends to nulltxt
      // XXX: generate a hash that sets up a key-to-key relationship
    }
    else {
      this.console.error("navigator.bridge.getCipherObject does not exist!");
      this.console.error("You can download the 'nulltxt' extension here: https://www.nulltxt.se/ ");
    }
  },

  reload: function reload()
  {
    document.location = "/?begin=true&" + Math.random();
  },

  loadFrame: function idx_loadFrame(aURL)
  {
    $("#outer-frame").children().remove();
    var frameHtml = '<iframe id="comm-frame" src="' + aURL + '" width="10" height="10"><p>Your browser does not support iframes.</p></iframe>';
    $("#outer-frame").append(frameHtml);
    // XXX: need to listen for load event to set 'messagingReady'
  },

  loadIncomingFrame: function idx_loadIncomingFrame(aURL, aCallback)
  {
    $("#comm-frame-in").children().remove();
    var frameHtml = '<iframe id="comm-frame-incoming" src="' +
      aURL +
      '" width="10" height="10"><p>Your browser does not support iframes.</p></iframe>';
    $("#comm-frame-in").append(frameHtml);
    console.log("Attaching incoming comm frame, adding load event handler");
    $("#comm-frame-incoming").load(aCallback);
  },

  sync: function _sync()
  {
    log("sync()");
    // onbeforeunload!
    this.saveMessages();
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
    apiKey: "apiKey",
    token: "token",
    keyID: "aPublicKeyID",
    publicKey: "aPublicKey",
    accountStatus: "accountStatus"
  },

  settingsSave: function idx_settingsSave()
  {
    var updateObj = {
      handle: $("#handle")[0].value,
      incomingURL: $("#incoming-url")[0].value,
      outgoingURL: $("#outgoing-url")[0].value,
      apiKey: $("#api-key")[0].value
    };

    var settings = this._settings;
    var updateRequired = false;
    for (var prop in updateObj) {
      if (this.settingsConfig[prop]) {
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

  updateSettings: function idx_updateSettings(aNewSettings)
  {
    log("updateSettings...");
    var updateRequired = false;
    var settings = this._settings;
    console.log(settings);
    for (var prop in aNewSettings) {
      log(prop);
      if (this.settingsConfig[prop]) {
        settings[prop] = aNewSettings[prop];
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
    else {
      this.console.error("Cannot load incoming frame, check settings to verify incomingURL");
      return;
    }
    var self = this;
    function callback()
    {
      var msg = JSON.stringify({ operation: "fetch-msgs-request",
                                 user: self.settings.handle,
                                 token: self.settings.token
                               });

      $("#comm-frame-incoming")[0].contentWindow.postMessage(msg, NULLTXT_URL);
    }

    this.loadIncomingFrame(this._currentIncomingURL, callback);
  },

  _currentIncomingURL: null,

  handleIncomingMessages: function idx_handleIncomingMessages(aMsgs)
  {
    var msgs = aMsgs.msgs;
    log("handleIncomingMessages()");
    for (var idx in msgs) {
      for (var prop in msgs[idx]) {
        log("typeof msg: " + typeof msgs[idx][prop]);
        log(prop + ": " + msgs[idx][prop]);
      }
      console.log("a message: " +  msgs[idx]);
      console.log(msgs[idx]);
      // XXX: use IndexedDB instead, can we push storage off onto a worker?
      // JSON.parse failure here.
      log("msgs[idx][prop]...");
      console.log(msgs[idx][prop]);
      var message = JSON.parse(msgs[idx].message);
      // localStorage.setItem("msg-" + msgs[idx]._id, JSON.stringify(msgs[idx]));
      // XXX: use data attributes for all attrs in each message
      var msgFormat = this.formatMessage(msgs[idx]);
      console.log(msgFormat);
      $("#inbox")[0].appendChild($(msgFormat)[0]);
      self.console.log("Received message " + msgs[idx]._id +
                       " from " + msgs[idx].from);
      // XXX: set domain / path where we are getting this message from
    }
    this.saveIncomingMessages(msgs);
  },

  formatMessage: function formatMessage(aMsg)
  {
    var _date = new Date(aMsg.recieved);
    log(_date);
    var msgFormat = '<option id=\'' +
                      aMsg._id  +
                      "'>" + "id: " +
                      aMsg._id +
                      " from: " +
                      aMsg.from +
                      "   date/time: " +
                      _date +
                      '</option>';
    log(msgFormat);
    return msgFormat;
  },

  saveIncomingMessages: function saveIncomingMessages(aMsgs)
  {
    this._savingNow = true;
    var saveNow = false;
    if (!this._messages) {
      this._messages = {};
      saveNow = true;
    }
    if (!this._messageIdx) {
      this._messageIdx = [];
    }
    if (this._messagesLastSaved) {
      this._messagesLastSaved = (Date.now() - 30000);
    }
    else {
      this._messagesLastSaved = (Date.now(0));
    }
    for (var idx in aMsgs) {
      this._messages[aMsgs[idx]._id] = aMsgs[idx];
      this._messageIdx.push(aMsgs[idx]._id);
    }

    if (!localStorage.getItem("messages")) {
      localStorage.setItem("messages", "{}");
      localStorage.setItem("messageIdx", "[]");
    }
    if (Date.now() > (this._messagesLastSaved + (30 * 1000))) {
      localStorage.setItem("messages", JSON.stringify(this._messages));
      localStorage.setItem("messageIdx", JSON.stringify(this._messageIdx));
      this._messagesLastSaved = Date.now();
    }
    if (saveNow) {
      this.saveMessages();
    }
    this._savingNow = false;
  },

  saveMessages: function saveMessages()
  {
    log("saveMessages()");
    if (!this._savingNow) {
      var index;
      if (!this._messageIdx) {
        index = [];
      }
      else {
        index = this._messageIdx;
      }
      if (typeof index == "object") {
        localStorage.setItem("messages", JSON.stringify(this._messages));
        localStorage.setItem("messageIdx", JSON.stringify(this._messageIdx));
      }
    }
  },

  loadInboxMessages: function loadInboxMessages()
  {
    log("loadInboxMessages()");
    var _savedMessages = localStorage.getItem("messages");
    var _index = localStorage.getItem("messageIdx");
    if (_index == "undefined") {
      _index = "[]";
      localStorage.setItem("messageIdx", "[]");
    }
    if (_savedMessages == "undefined") {
      _savedMessages = "{}";
      localStorage.setItem("messages", "{}");
    }
    if (_index && (_index != "undefined") && _savedMessages && (_savedMessages != "undefined")) {
      var savedMessages = JSON.parse(_savedMessages);
      if (!(typeof savedMessages == "object")) {
        this.console.error("ERROR: Cannot load messages from storage!!");
        return; // fail!
      }
      console.log(savedMessages);
      var index = JSON.parse(_index);
      console.log(index);
      for (var idx in index) {
        console.log(idx);
        var _idx = index[idx];
        if (!savedMessages[_idx]) {
          log("Saved Message not found!!!???");
          continue;
        }

        var msgFormat = this.formatMessage(savedMessages[_idx]);
        $("#inbox")[0].appendChild($(msgFormat)[0]);
      }
      // set internal inbox cache
      this._messages = savedMessages;
      this._messageIdx = index;
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
        localStorage.setItem("msg-" + msgs[idx]._id, JSON.stringify(msgs[idx]));
        // XXX: use data attributes for all attrs in each message
        var msgFormat = '<option id=msg-' + msgs[idx].id  + '>'
                          + msgs[idx].content + '</option>';
        $("#inbox")[0].appendChild($(msgFormat)[0]);
        self.console.log("Recieved message " + msgs[idx].id + " from " + "XXX"); // XXX: set domain / path where we are getting this message from
      }
    });
  },

  /////////////////////////////////////////////////////////////////////////////////
  // SEND MESSAGES
  /////////////////////////////////////////////////////////////////////////////////

  _currentOutgoingURL: null,

  loadOutgoingFrame: function idx_loadOutFrame(aURL, aCallback)
  {
    $("#comm-frame-out").children().remove();
    var frameHtml = '<iframe id="comm-frame-outgoing" src="' +
      aURL +
      '" width="10" height="10"><p>Your browser does not support iframes.</p></iframe>';
    $("#comm-frame-out").append(frameHtml)
;
    console.log("Attaching outcoming comm frame, adding load event handler");
    $("#comm-frame-outgoing").load(aCallback);
  },

  sendMsgs: function idx_sendMsgs(aMsgs)
  {
    // check to see if a send operation is in process
    if (this._sending) {
      return;
    }
    this._sending = true;
    // load outgoing frame
    if (this.settings.outgoingURL) {
      this._currentOutgoingURL = this.settings.outgoingURL;
    }
    else {
      this.console.error("Cannot load outgoing frame, check settings to verify outgoingURL");
      return;
    }

    var self = this;
    function callback()
    {
      var msg = JSON.stringify({ operation: "send-msgs-request",
                                 user: self.settings.handle,
                                 apiKey: self.settings.apiKey,
                                 msgs: aMsgs
                               });

      $("#comm-frame-outgoing")[0].contentWindow.postMessage(msg, NULLTXT_URL);
    }

    this.loadOutgoingFrame(this._currentOutgoingURL, callback);
  },

  handleOutgoingMessagesResponse:
  function idx_handleOutgoingMessagesResponse(aRsp)
  {
    this._sending = false;  // XXX: for now we will just toggle this
    if (aRsp.status == SUCCESS) {
      this.console.log("Message sent");
    }
    else {
      this.console.error("Message sending failed");
    }
  },

  _sending: false,

  /////////////////////////////////////////////////////////////////////////////////
  // READ MESSAGES
  /////////////////////////////////////////////////////////////////////////////////

  displayMsg: function displayMsg(aMsgID)
  {
    log("aMsgID", aMsgID);
    // var msg = JSON.parse(localStorage[aMsgID]);
    var msg = this._messages[aMsgID];
    console.log(msg);
    if (!msg) {
      console.error("Cannot get message from storage");
      return;
    }

    $("#inbox-view").hide();
    $("#read-messages-view").show();
    var message = JSON.parse(msg.message);
    $("#read-msg-from")[0].innerHTML = msg.from;
    $("#read-msg-content").text(message.content);
    $("#read-msg-recieved").text(new Date(msg.recieved));
    this._currentMessageID = msg._id;
  },

  _displayMsg: function _displayMsg()
  {

  },

  decryptMessage: function decryptMessage()
  {
    if (this._currentMessageID) {
      // var metaMsg = localStorage.getItem(this._currentMessageID);
      var metaMsg = this._messages[this._currentMessageID];
      if (metaMsg) {
        // metaMsg = JSON.parse(metaMsg);
        console.log(metaMsg);
        var msg = JSON.parse(metaMsg.message);
        console.log(msg);
        if (!msg) {
          this.console.error("Cannot JSON parse current message");
        }
        else {
          this._currentMessageID = null;
          // call the nav.bridge API
          function success()
          {
            if (this.result) {
              console.log(this.result);
              // message signature is verified
              self.console.log("Message signature verified");
            }
          }
          function error(err)
          {
            alert("Cannot verify and decrypt message: " + err);
          }
          cryptoRead(metaMsg.from,
                     this.settings.keyID,
                     msg,
                     success,
                     error);
        }
      }
      else {
        this.console.error("Cannot get message from storage");
      }
    }
  },

  closeMsg: function closeMsg()
  {
    $("#read-msg-content").children().remove();
    $("#read-messages-view").hide();
    $("#inbox-view").show();
  },

  /////////////////////////////////////////////////////////////////////////////////
  // ADDRESSING
  /////////////////////////////////////////////////////////////////////////////////

  populateContacts: function idx_populateContacts()
  {
    // generate contacts list addresses can be chosen from
    var html = "";
    for (var handle in this.contacts) {
      html = '<option id="' + handle + '">' + handle + '</option>';
      $("#contacts-list").append($(html));
    }
  },

  chooseContact: function idx_chooseContact()
  {
    // get the selected contact and add them to the message 'to:'
    var select = $("#contacts-list")[0];
    var value = select.childNodes.item(select.selectedIndex).value;
    console.log("value: ", value);
    if (value) {
      var html = '<li>'
                 + value
                 + '</li>';
      $("#compose-addressees").append($(html));
    }
  },

  /////////////////////////////////////////////////////////////////////////////////
  // INVITE
  /////////////////////////////////////////////////////////////////////////////////

  inviteColleague: function inviteColleague()
  {
    if($('#compose-view').is(':visible')) {
      this._revertToView = $('#compose-view');
      $('#compose-view').hide();
    }
    if($('#contacts-view').is(':visible')) {
      this._revertToView = $('#contacts-view');
      $('#contacts-view').hide();
    }

    var self = this;
    var url = "/invite/";
    // Authenticate with server, get back an invite URL to share...
    $.ajax({
      type: "POST",
      url: url,
      dataType: "json",
      data: {
        publicKey: self.settings.publicKey,
        handle: self.settings.handle,
        token: self.settings.token
      }
    }).done(function(res) {
      log("invite done() callback");
      log(res);
      if (res.status == "success") {
        self.displayInvite(res.inviteID);
      }
      else {
        self.console.log("Error fetching invite: " + res.msg);
      }
    });
  },

  _revertToView: $("#inbox-view"),

  displayInvite: function displayInvite(aInviteID)
  {
    var html = "<div><h1>nulltxt invitation</h1>"
               + "<h2>Send this link to your friend<h2>"
               + "<h3>" + NULLTXT_URL +"/?invitation="
               + aInviteID
               + "</h3>"
               + "<button onclick=\"nulltxt.closeInvite();\">done</button>";
    log(html);
    $("#invite-view").append($(html));
    this.showDisplayInviteUI();
  },

  showDisplayInviteUI: function showDisplayInviteUI()
  {
    $("#inbox-view").hide();
    $("#invite-view").show();
  },

  closeInvite: function closeInvite()
  {
    $("#invite-view").children().remove();
    $("#invite-view").hide();
    this._revertToView = $("#inbox-view");
    this._revertToView.show();

  },

  verifyInvite: function verifyInvite()
  {
    $("#inbox-view").hide();
    $("#verify-invite-view").show();
  },

  verifyAcceptInvite: function verifyAcceptInvite()
  {
    var self = this;
    // check if invite is legit and accept it
    var iid = localStorage.getItem("currentInvitation");
    var url = "/accept-invite/?iid=" + iid;
    $.ajax({
      type: "GET",
      url: url,
      dataType: "json"
    }).done(function(msg) {
      if (msg.status == "success") {
        // add this contact to "contacts"
        var contacts = self._contacts;
        var idx = msg.invite.inviterHandle + "@" + NULLTXT_URL;

        var metaData = {
          "user-handle": msg.invite.inviterHandle,
          "default-endpoint": NULLTXT_URL,
          "public-key": msg.invite.inviterPublicKey
        };

        self.saveContact(idx, metaData);
        self.contactLookupReset();

        // XXXddahl: respond in kind: add a new invite back to the existing
        // user when/if account is created
        localStorage.setItem("invitationResponse",
                             JSON.stringify({recv: msg.invite.inviterHandle}));
        // clean up - does this user have an account?
        if (self.settings.accountStatus == 2) {
          // clean up
          $("#verify-invite-view").hide();
          $("#inbox-view").show();
          return;
        }
        self.checkAccountStatus();
        // create account routine
      }
      else {
        self.console.error("Could not verify/accept new contact information");
      }
    });
  },

  checkAccountStatus: function checkAccountStatus()
  {
    log("checkAccountStatus()");
    switch(this.settings.accountStatus)
    {
    case 4:
      this.reload();
      break;
    case 3:
      // need to create a keypair // XXX: this seems unlikely
      break;
    case 2:
      // need to create a server account and keys
      var handle = this._settings["handle"];
      if (!handle) {
        // XXX: begin this process with an explanation of how to get started
        this.begin();
      }
      break;
    default:
      break;
    }
  },

  begin: function begin()
  {
    log("begin()");
    $(".top-view").hide();
    $("#begin-view").show();
    $("#begin-using-btn")[0].disabled = true;
  },

  /////////////////////////////////////////////////////////////////////////////////
  // COMPOSE
  /////////////////////////////////////////////////////////////////////////////////

  _composing: false,

  showComposeUI: function showComposeUI()
  {
    this._currentViewID = "#compose-view";
    if (this._composing) {
      return;
    }
    $("#inbox-view").hide();
    $("#compose-view").show();
    $("#compose-controls").hide();
    this._composing = true;
    // XXX: change this so we only call it when a contact is added or removed
    this.populateContacts();

  },

  composeRun: function composeRun()
  {
    try {
      var select = $("#contacts-list")[0];
      var recipient = select.childNodes.item(select.selectedIndex).value;
      // var recipient = $("#contacts-list")[0].firstChild.id;
    }
    catch (ex) {
      alert("Error: No contacts found. You need to accept an invitation from a colleague in order to compose a message");
      return;
    }

    // Make callbacks
    function success() {
      $("#compose-controls").show();
      $("#compose-message")[0].value = JSON.stringify(this.result);
    }
    function error(err) {
      console.log(err);
      console.log("Error: encryption failed.");
      // XXX: need to create a try again button, etc
    }
    var recipientPubKey = nulltxt.contacts[recipient]["public-key"];
    cryptoWrite(recipientPubKey,
                nulltxt.settings.keyID,
                recipient.split("@")[0],
                success,
                error);
    this._currentRecipient = recipient;
  },

  composeCancel: function canelCompose()
  {
    this._composing = false;
    $("#compose-message")[0].value = "";
    $("#compose-view").hide();
    $("#inbox-view").show();
  },

  composeSave: function saveCompose()
  {
    // TODO: drafts object
    // XXX: get uuid if no ID exists, branch on that as we have to lookup
    // the draft and re-save
    var uuid = UUID.generate();
    var _addresses = $("#compose-addressees").children();
    var addrs = [];
    $.map(_addresses, function (node){addrs.push(node.textContent);});
    var self = this;
    var draftMessage = {
      id: uuid,
      to: addrs,
      message: $("#compose-message")[0].value,
      from: self.settings.handle,
      time: Date.now()
    };
    console.log(draftMessage);
    this._drafts[uuid] = draftMessage;
    // Let 15 seconds elapse before saving the drafts again
    if (!this.draftsSaved || ((this.draftsSaved - Date.now()) > 900)) {
      localStorage.setItem("drafts", JSON.stringify(this._drafts));
      this.console.log("Drafts saved to disk");
    }
  },

  draftsSaved: null,

  get drafts() {
    log("get drafts()");
    if (this._drafts) {
      return this._drafts;
    }
    var drafts = localStorage.getItem("drafts");
    if (drafts) {
      this._drafts = JSON.parse(drafts);
      return this._drafts;
    }
    this.console.warn("Drafts is null, going to create it");
    localStorage.setItem("drafts", JSON.stringify({}));
    this._drafts = JSON.parse(localStorage["drafts"]);
    this.console.log("Created drafts.");
    return this._drafts;
  },

  _drafts: {},

  composeLoadDraft: function idx_composeLoadDraft(aMsgID)
  {

  },

  composeSendOrig: function composeSendOrig()
  {
    this.console.log("sending message...");
    // 1. based on the selected contact(s), we need to load a frame or series of frames
    var addressees = [];
    $("#compose-addressees").map(function (aNode){
      addressees.push(aNode.text());
    });
    if (addressees.length) {
      // begin loading addressees' comm pages
      for (var idx in addressees) {
        var commPage = this.contacts[addressees[idx]].split("@")[1];
        // load the commPage

        // postMessage the message
      }
    }


    // 2. once the frame(s) is/are loaded we can cycle through them, calling sendMsg
    var frameURI = NULLTXT_URL;
    // x. Generate an ID for the message?
    var msgID = UUID.generate();

    this.sendMsg($("#compose-message")[0].value, msgID);
    this.console.log("Attempting to send message " + msgID);
    // 3. once we have recieved back "OK", "MSG_ID" from the postMessage call, we can move the message from 'sending' to 'outbox'

    // x. add this action to a 'messaging log'

    // close this message compose view
    this.cancelCompose();
  },

  composeSend: function composeSend()
  {
    // get the to: handle
    var recipient = this._currentRecipient.split("@")[0];

    var url = "/msg/out/";
    var self = this;

    $.ajax({
      type: "POST",
      url: url,
      dataType: "json",
      data: {
        publicKey: self.settings.publicKey,
        handle: self.settings.handle,
        token: self.settings.token,
        recipient: recipient,
        message: $("#compose-message")[0].value
      }
      // XXX: need a indeterminate progress indicator
    }).done(function(res) {
      // XXX: save the sent message to sent folder
      if (res.status == "success") {
        self.console.log("Success: MESSAGE SENT");
      }
      else {
        self.console.log("Error: " + res.msg);
      }
      // XXX: Need a growl-like message here
      self.console.log("Message sent");
      // clear and hide compose area
      $("#compose-message")[0].value = "";
      self._currentRecipient = "";
      $("#compose-controls").hide();
      $("#compose-view").hide();
      $("#inbox-view").show();
    });
  },

  /////////////////////////////////////////////////////////////////////////////////
  // SENT MESSAGES
  /////////////////////////////////////////////////////////////////////////////////

  _sentMsgs: null,

  get sentMsgs() {
    if (!this._sentMsgs) {
      // Try to load msgs from localStorage
      if (localStorage["sentMsgs"]) {
        this._sentMsgs = JSON.parse(localStorage["sentMsgs"]);
      }
      else {
        var _sentMsgs = {_index:[]};
        localStorage["sentMsgs"] = JSON.stringify(_sentMsgs);
        this._sentMsgs = _sentMsgs;
      }
    }
    return this._sentMsgs;
  },

  saveSentMsgs: function idx_saveSentMsgs(aMsgs)
  {
    var self = this;
    var numSaved = 0;
    function saveSentMsg(aMsg)
    {
      if (aMsg.id == "_index") {
        self.console.error("A message cannot use '_index' as an ID!");
        return;
      }
      // Make sure the message is not already in the database:
      var _msg = self._sentMsgs[aMsg.id];
      if (_msg) {
        self._sentMsgs._index.push(aMsg.id);
      }
      self._sentMsgs[aMsg.id] = aMsg;
      numSaved++;
    }
    if (aMsgs.length) {
      // Array of messages passed in
      for (var msg in aMsgs) {
        saveSentMsg(msg);
      }
    }
    else {
      saveSentMsg(aMsgs);
    }
    if (numSaved) {
      localStorage.setItem("sentMsgs", JSON.stringify(this._sentMsgs));
    }
  },

  loadSentMsgs: function idx_loadSentMsgs(aSelectNode)
  {
    $(aSelectNode).children().remove();
    for (var idx in this.sentMsgs["_index"]) {
      var html = '<option>'
                   + this.sentMsgs[idx].content
                 + '</option>';
      aSelectNode.appendChild($(html)[0]);
    }
  },

  /////////////////////////////////////////////////////////////////////////////////
  // OUTBOX MESSAGES
  /////////////////////////////////////////////////////////////////////////////////

  _outBoxMsgs: null,

  get outBoxMsgs() {
    if (!this._outBoxMsgs) {
      // Try to load msgs from localStorage
      if (localStorage["outBoxMsgs"]) {
        this._outBoxMsgs = JSON.parse(localStorage["outBoxMsgs"]);
      }
      else {
        var _outBoxMsgs = {_index:[]};
        localStorage["outBoxMsgs"] = JSON.stringify(_outBoxMsgs);
        this._outBoxMsgs = _outBoxMsgs;
      }
    }
    return this._outBoxMsgs;
  },

  saveOutboxMsgs: function idx_saveOutBoxMsgs(aMsgs)
  {
    var self = this;
    var numSaved = 0;
    function saveOutBoxMsg(aMsg)
    {
      if (aMsg.id == "_index") {
        self.console.error("A message cannot use '_index' as an ID!");
        return;
      }
      // Make sure the message is not already in the database:
      var _msg = self._outBoxMsgs[aMsg.id];
      if (_msg) {
        self._outBoxMsgs._index.push(aMsg.id);
      }
      self._outBoxMsgs[aMsg.id] = aMsg;
      numSaved++;
    }
    if (aMsgs.length) {
      // Array of messages passed in
      for (var msg in aMsgs) {
        saveOutBoxMsg(msg);
      }
    }
    else {
      saveOutBoxMsg(aMsgs);
    }
    if (numSaved) {
      localStorage.setItem("outBoxMsgs", JSON.stringify(this._outBoxMsgs));
    }
  },

  loadOutBox: function idx_loadOutBox(aSelectNode)
  {
    $(aSelectNode).children().remove();
    for (var idx in this.outBoxMsgs["_index"]) {
      var html = '<option>'
                   + this.outBoxMsgs[idx].content
                 + '</option>';
      aSelectNode.appendChild($(html)[0]);
    }
  },

  removeBoxedMessage: function idx_removeBoxedMessage(aID, aBox)
  {
    switch(aBox) {
    case "out":
      if (this._outBoxMsgs[aID]) {
        delete this._outBoxMsgs[aID];
        var idx = this._outBoxMsgs._index.indexOf(aID);
        if (idx) {
          // XXX: fix this - got rid of Array.prototype.remove
          this._outBoxMsgs._index.remove(idx);
        }
      }
      break;
    case "sent":
      if (this._sentMsgs[aID]) {
        delete this._sentMsgs[aID];
        var idx = this._sentMsgs._index.indexOf(aID);
        if (idx) {
          this._sentMsgs._index.remove(idx);
        }
      }
      break;
    default:
      this.console.warn("Cannot remove message from non-existant box");
      return;
    }
  },

  /////////////////////////////////////////////////////////////////////////////////
  // CONTACTS
  /////////////////////////////////////////////////////////////////////////////////

  lookupContact: function idx_lookupContact(aURL)
  {
    log(typeof aURL);
    if (!aURL) {
      this.console.log("Lookup contact: URL/path is missing");
      return;
    }
    //  parse uri
    var uri = URI.parse(aURL);
    if (uri.errors.length) {
      this.console.error("Lookup contact: Malformed URL");
      return;
    }
    var scheme, host, port, path;
    if (uri.reference == "relative") {
      scheme = document.location.protocol;
      host = document.location.host;
      port = document.location.port;
      path = document.location.pathname + $("#contact-input")[0].value;
    }
    else {
      scheme = uri.scheme;
      host = uri.host;
      port = uri.port;
      path = uri.path;
    }
    console.log(scheme, host, port, path);
    var url = URI.serialize({scheme : scheme,
                             host : host,
                             path: path,
                             port: port
                            });
    console.log(url);
    $("#comm-frame-user").children().remove();
    var frameHtml = '<iframe id="comm-frame-user-lookup" src="' +
      url +
      '" width="10" height="10"><p>Your browser does not support iframes.</p></iframe>';
    $("#comm-frame-user").append(frameHtml);

    function callback (aResult)
    {
      // XXX: set thee postMessage here
      var _req = { operation: "contact-meta-data-request" };
      var req = JSON.stringify(_req);

      $("#comm-frame-user-lookup")[0].contentWindow.postMessage(req, NULLTXT_URL);
    }

    console.log("Attaching user lookup comm frame, adding load event handler");
    $("#comm-frame-user-lookup").load(callback);
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
      // tell user the contact was found
      this.contactLookupSuccess(aMetaData);
      // reset contact lookup UI
      this.contactLookupReset();
    }
    else {
      console.error("nulltxt.handleContactMetaData: Malformed contact metadata");
    }
  },

  contactLookupSuccess: function idx_contactLookupSuccess(aUserData)
  {
    // XXX: aUserData might be an array??
    var node = '<li>' + aUserData["user-handle"] + '</li>';
    var result = $(node);
    $("#contact-lookup-result").append(result);
    this.console.log("User lookup successful");
    $("#contact-lookup-progress").hide();
  },

  contactLookupReset: function idx_contactLookupReset()
  {
    $("#contact-lookup-btn")[0].disabled = false;
  },

  saveContact: function saveContact(aID, aContactObj)
  {
    var contacts = this.contacts;
    if (contacts[aID]) {
      // XXX: do a destructive update for now...
      for (var prop in aContactObj) {
        if (!(contacts[aID][prop])) {
          contacts[aID][prop] = aContactObj[prop];
        }
        else if (contacts[aID][prop] != aContactObj[prop]) {
          contacts[aID][prop] = aContactObj[prop];
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
  },

  inboxView: function inboxView()
  {
    document.location = "/";
  },

  /////////////////////////////////////////////////////////////////////////////////
  // CONSOLE
  /////////////////////////////////////////////////////////////////////////////////

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


  // XXX: Login routine via Persona

  // XXX: Create handle routine: need to check for login before allowing operations

  // XXX: Generate key for handle, save public key on server

  // XXX: Edit comm page

  // XXX: handle search + add to contacts

  // XXX: User lookup frame : load contact/handle's comm page, view details

  // XXX: whitelist handle/endpoint combinations

  // XXX: Express/node functionality:
  //  * Host comm page
  //  * Cache messages
  //  * Persona Login
  //

  // XXX: updated endpoints notifications
  //  * a message that contains an object that describes additional endpoints
  //    ... that accept incoming messages for you.
  //
  // XXX: make *all* message sending and recving happen via an iframe

  // XXX: separate INBOX for whitelist requests. allow one per publicKey
  //      * auto delete these requests so they do not fill up disks
  //      * treat the whitelist request as less important than a message

  // XXX: DEFINE THESE THINGS:
  //      * message object
  //      * incoming endpoint url/frame
  //        ** XHR operation
  //      * outgoing endpoint url/frame
  //        ** XHR operation
  //      * whitelist operation
  //
};

// Prototype extensions
// Array.prototype.remove = function(from, to) {
//   var rest = this.slice((to || from) + 1 || this.length);
//   this.length = from < 0 ? this.length + from : from;
//   return this.push.apply(this, rest);
// };

////////////////////////////////////////////////////////////////////////////////
// Nulltxt Crypto functions
////////////////////////////////////////////////////////////////////////////////

function cryptoKeygen(aSuccessCallback, aErrorCallback)
{
  var cipherObj = {
    type: "keygen",
    format: "DER_BASE64"
  };

  var request = window.navigator.bridge.getCipherObject(cipherObj);

  request.onsuccess = aSuccessCallback;
  request.onerror = aErrorCallback;
}

function
cryptoWrite(aPublicKey, aSenderKeyID, aRecipient, aSuccessCallback, aErrorCallback)
{
  var writeCipherObject = {
    type: "write",
    format: "DER_BASE64",
    recipientName: aRecipient,
    publicKey: aPublicKey,
    keyID: aSenderKeyID
  };

  var request = window.navigator.bridge.getCipherObject(writeCipherObject);

  request.onsuccess = aSuccessCallback;
  request.onerror = aErrorCallback;
}

function
cryptoRead(aAuthor, aRecipientKeyID, aCipherObject,  aSuccessCallback, aErrorCallback)
{
  var readCipherObject = aCipherObject;
  readCipherObject.type = "read";
  readCipherObject.authorName = aAuthor;
  readCipherObject.keyID = aRecipientKeyID;

  var request = window.navigator.bridge.getCipherObject(readCipherObject);

  request.onsuccess = aSuccessCallback;
  request.onerror = aErrorCallback;
}
