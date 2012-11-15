function log(msg)
{
  console.log(msg);
}

var express = require("express");
var app = express();
app.listen(8000); //the server is created on localhost, port 8000

var dbuser = "nulltxt";
var passwd = "password";
var host = "localhost";
var port = "27017";
var dbname = "nulltxt";

var dbconn = dbuser + ":" + passwd + "@" + host + ":" + port + "/" + dbname;
var collections = ["nulltxt.messages"];
var db = require("mongojs").connect(dbconn, collections);

/* The server will respond with the relevant text
on the GET request of the root uri. */
app.get("/", function(req, res) {
  res.send("this is a web service");
});

// GET MESSAGES
app.get("/msg/in/", function (req, res) {
  var handle = req.param("handle");
  // var dbPassCode = req.param("passcode");
  log("handle: " + handle);
  log(db);
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
