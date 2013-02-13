// sending message via iframe
var _msg = {
  to: "you",
  from: "me",
  content: "w00t!",
  time: Date.now()
};

var msg = JSON.stringify(_msg);
nulltxt.sendMsg(msg);
