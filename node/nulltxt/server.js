function log(msg)
{
  console.log(msg);
}

var express = require('express')
  , https = require('https')
  , fs = require('fs')
  , crypto = require('crypto');

var privateKey = fs.readFileSync('private-key.pem').toString();
var certificate = fs.readFileSync('public-cert.pem').toString();

var options = {
  key : privateKey
, cert : certificate
}

var app = express();
app.set("port", 8000);

app.use(express.static(__dirname + '/html'));

app.set('views', __dirname + '/html');
app.engine('html', require('ejs').renderFile);
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

// REGISTER USER KEY/ACCT

app.get('/verify-handle', function (req, res) {
  log("verfiy-handle");
  var handle = req.param("handle");
  log("handle: " + handle);
  var result = db["nulltxt.handles"].findOne({handle: handle}, function (err, result){
    log("findOne callback");
    log(result);
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
  // var dbPassCode = req.param("passcode");
  log("handle: " + handle);
  // log(db);
  db["nulltxt.messages"].find(function (err, docs) {
    if (err) {
      var _res = {
        status: "failure",
        msg: "Could not get messages!"
      };
      res.send(JSON.stringify(_res));
      return;
    }

    log("docs: " + docs);

    var _res = {
      msgs: docs,
      status: "success"
    };

    res.send(JSON.stringify(_res));
  });
});

// SEND MESSAGES

app.post("/msg/out/", function (req, res) {
  var handle = req.param("handle");
  // var dbPassCode = req.param("passcode");
  var _msgs = req.param("msgs");
  var msgs;
  try {
    msgs = JSON.stringify(_msgs);
    for (var i = 0; i < msgs.length; i++) {
      db["nulltxt.messages"].save(msgs[i]);
    }

    var _res = {
      status: "success",
      msg: "Messages accepted"
    };

    res.send(JSON.stringify(_res));
  }
  catch (ex) {
    res.send("{\"status\": \"failure\", \"msg\": \"No outgoing messages detetcted\"}");
  }
});

// LOOKUP USER KEY/ACCT

// AUTHENTICATION

function authenticate(aHandle, aToken, aCallback)
{
  var hash = crypto.createHash("sha256");
  hash.update(aToken);
  var hashedToken = hash.digest(encoding='base64');

  db["nulltxt.handles"].findOne({handle: aHandle, token: hashedToken},
  function (err, result) {
    if (!result) {
      return false;
    }
    else if (result) {
      if (result.handle == aHandle) {
        return true;
      }
      else {
        return false;
      }
    }
  });
}

// INVITATION LINK GENERATION

app.post("/invite/", function (req, res) {
  log("/invite/");
  log(req.body);
  var handle = req.param('handle');
  log(handle);
  var token = req.param('token');
  log(token);
  var senderPublicKey = req.param('publicKey');

  var hash = crypto.createHash("sha256");
  hash.update(token);
  var hashedToken = hash.digest(encoding='base64');

  db["nulltxt.handles"].findOne({handle: handle, token: hashedToken},
  function (err, result) {
    if (!result) {
      return false;
    }
    else if (result) {
      if (result.handle == handle) {
        // return true;
        // generate an invite link, include the handle and pubkey in the db record
        // XXX: this should time out after 1 day?? 1 hour?? user specified?
        db["nulltxt.invites"].save({handle: handle, publicKey: senderPublicKey},
        function (err, result){
          log("invites save callback");
          log(result);
          if (!err) {
            res.send(JSON.stringify({inviteID: result._id, status: "success"}));
          }
          else {
            res.send(JSON.stringify({status: "failure",
                                     msg: "Error creating invite"}));
          }
        });
      }
      else {
        // return false;
        res.send(JSON.stringify({status: "failure", msg: "authentication failed"}));
      }
    }
  });
});
