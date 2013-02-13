/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Author: David Dahl <ddahl@nulltxt.se> */

function log(msg)
{
  console.log(msg);
}

var express = require('express')
  , https = require('https')
  , fs = require('fs')
  , crypto = require('crypto')
  , config = require('./config');

// Let's get SSL working shall we?
var privateKey = fs.readFileSync(config.privateKeyFile).toString();
var certificate = fs.readFileSync(config.publicCertFile).toString();

var options = {
  key : privateKey
  , cert : certificate
};

var ca = null;
if (config.caFile) {
  ca = fs.readFileSync(config.caFile).toString();
  options.ca = ca;
}

var app = express();
app.set("port", config.port);

app.use(express.static(__dirname + '/html'));

app.set('views', __dirname + '/html');
app.engine('html', require('ejs').renderFile);
app.engine('html/ext-demo', require('ejs').renderFile);
app.use(express.bodyParser());

// start server
https.createServer(options,app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

var dbuser = "nulltxt";
var passwd = "password";
var host = "localhost";
var port = "27017";
var dbname = "nulltxt";

var dbconn = dbuser + ":" + passwd + "@" + host + ":" + port + "/" + dbname;
var collections = ["nulltxt.messages", "nulltxt.handles", "nulltxt.invites"];
var db = require("mongojs").connect(dbconn, collections);

/* The server will respond with the relevant text
on the GET request of the root uri. */

app.get('/comm.html', function(req, res) {
  res.render('comm.html');
});

app.get('/', function(req, res) {
  res.render('index.html');
});

app.get('/ext-demo/demo.html', function (req, res) {
  res.render('ext-demo/demo.html');
});

// REGISTER USER KEY/ACCT

app.get('/verify-handle', function (req, res) {
  log("verfiy-handle");
  var handle = req.param("handle");
  var result = db["nulltxt.handles"].findOne({handle: handle},
  function (err, result){
    if (result) {
      if (result.handle == handle) {
        log("handle: " + result.handle);
        log("failure");
        res.send(JSON.stringify({status: "failure",
                                 msg: "Sorry, the handle, " + handle
                                 + "  is not available"}));
      }
    }
    else {
      log("success");
      res.send(JSON.stringify({status: "success",
                               msg: "Handle is available",
                               handle: handle
                              }));
    }
  });
});

app.get('/claim-handle', function (req, res) {
  log("claim-handle()");
  var handle = req.param("handle");
  var token = req.param("token");
  log("handle: " + handle);
  log("token: " + token);
  db["nulltxt.handles"].findOne({handle: handle}, function (err, result) {
    if (result) {
      if (result.handle == handle) { // XXX: ask mongodb to handle unique value here
        res.send(JSON.stringify({status: "failure",
                                 msg: "Error: handle " + handle +
                                 " is not available"
                                }));
      }
    }
    else {
      var hash = crypto.createHash("sha256");
      hash.update(token);
      var hashedToken = hash.digest(encoding='base64');
      db["nulltxt.handles"].save({handle: handle, token: hashedToken});
      res.send(JSON.stringify({status: "success",
                               msg: "Account created"}));
    }
  });
});

// GET MESSAGES

app.get("/msg/in/", function (req, res) {
  var handle = req.param("handle");
  var token = req.param("token");
  log("handle: " + handle);

  function authSuccess()
  {
    // XXX: need to get only unread messages
    db["nulltxt.messages"].find({recipient: handle}, function (err, result) {
      if (err) {
        res.send(JSON.stringify({status: "failure", msg: err}));
      }
      if (result) {
        res.send(JSON.stringify({status: "success", msgs: result}));
        // delete all messages as we have already downloaded them
        // XXX: lets flag all "fetched" messages in the future and remove them
        // via a cron job
        // log(result);
        for (var idx in result) {
          db["nulltxt.messages"].remove({_id: db.ObjectId(result[idx]._id.toString())}, 1);
        }
      }
      else {
        // XXX: check for zero messages, which is not an error condition
        res.send(JSON.stringify({status: "success", msgs: []}));
      }
    });
  }
  function authError(err)
  {
    res.send(JSON.stringify({status: "failure", msg: err}));
  }
  authenticate(handle, token, authSuccess, authError);
});

// SEND MESSAGES

app.post("/msg/out/", function (req, res) {
  log("/msg/out/");
  var handle = req.param("handle");
  var token = req.param("token");
  var message = req.param("message");
  var recipient = req.param("recipient");
  var publicKey = req.param("publicKey");

  // success callback
  function authSuccess()
  {
    // make sure the recipient exists (XXX: and the sender can send the message!)
    db["nulltxt.handles"].findOne({handle: handle}, function (err, result) {
      if (err) {
        res.send(JSON.stringify({status: "failure", msg: err}));
        return;
      }
      if (result) {
        // the recipient exists, we should save the message!
        db["nulltxt.messages"].save({recipient: recipient,
                                     from: handle,
                                     fromPublickey: publicKey,
                                     message: message,
                                     recieved: Date.now()}, function (err, result) {
          if (err) {
            res.send(JSON.stringify({status: "failure", msg: err }));
          }
          if (result) {
            var _res = {
              status: "success",
              msg: "Messages accepted"
            };

            res.send(JSON.stringify(_res));
          }
        });
      }
    });
  }
  // error callback
  function authError(err)
  {
    res.send(JSON.stringify({status: "failure", msg: err}));
  }
  // authenticate
  authenticate(handle, token, authSuccess, authError);
});

// LOOKUP USER KEY/ACCT

// AUTHENTICATION

function authenticate(aHandle, aToken, aSuccessCallback, aFailureCallback)
{
  log("authenticate()");
  log("aToken" + aToken);
  var hash = crypto.createHash("sha256");
  hash.update(aToken);
  var hashedToken = hash.digest(encoding='base64');

  db["nulltxt.handles"].findOne({handle: aHandle, token: hashedToken},
  function (err, result) {
    if (err) {
      aFailureCallback(err);
    }
    else if (result) {
      if (result.handle == aHandle) {
        aSuccessCallback();
      }
      else {
        aFailureCallback("Error: Cannot authenticate!");
      }
    }
  });
}

// INVITATION LINK GENERATION

app.post("/invite/", function (req, res) {
  log("/invite/");
  var handle = req.param('handle');
  var token = req.param('token');
  var senderPublicKey = req.param('publicKey');

  var hash = crypto.createHash("sha256");
  hash.update(token);
  var hashedToken = hash.digest(encoding='base64');

  db["nulltxt.handles"].findOne({handle: handle, token: hashedToken},
  function (err, result) {
    if (!result) {
      log("Error: Handle not found.");
      res.send({status: "failure",
                msg: "Handle not found"});
      return false;
    }
    else if (result) {
      if (result.handle == handle) {
        log("handle found! " + handle);
        // generate an invite link, include the handle and pubkey in the db record
        // XXX: this should time out after 1 day?? 1 hour?? user specified?
        db["nulltxt.invites"].save({handle: handle, publicKey: senderPublicKey},
        function (err, result){
          if (!err) {
            log("invite saved");
            res.send(JSON.stringify({inviteID: result._id, status: "success"}));
          }
          else {
            log("invite not saved: " + err);
            res.send(JSON.stringify({status: "failure",
                                     msg: "Error creating invite"}));
          }
        });
      }
      else {
        log("handle not found!");
        res.send(JSON.stringify({status: "failure", msg: "authentication failed"}));
      }
    }
  });
});

// ACCEPT INVITATION

app.get("/lookup-invite/", function (req, res) {
  log("/lookup-invite/");
  // XXX: Landing page explains the process of connection with your colleague

}) ;

app.get("/accept-invite/", function (req, res) {
  log("/accept-invite/");
  var iid = req.param('iid');
  log(iid);
  log(db.ObjectId);
  // lookup invite in mongo
  db["nulltxt.invites"].findOne({_id: db.ObjectId(iid)},
  function (err, result) {
    if (err) {
      log("nulltxt.invites err: " + err);
      res.send(JSON.stringify({status: "failure",
                               msg: "Error: No such invitation code exists"}));
    }
    if (!result) {
      log("nulltxt.invites: result is null. ");
      res.send(JSON.stringify({status: "failure",
                               msg: "DB result was null. No such invitation code exists"}));
    }
    else {
      if (result._id == iid) {
        res.send(JSON.stringify({status: "success",
                                 msg: "Invitation found",
                                 invite: {id: iid,
                                          inviterPublicKey: result.publicKey,
                                          inviterHandle: result.handle}
                                }));
        // remove the invite from mongo
        db["nulltxt.invites"].remove({_id: db.ObjectId(iid)}, 1);

      }
    }
  });
});
