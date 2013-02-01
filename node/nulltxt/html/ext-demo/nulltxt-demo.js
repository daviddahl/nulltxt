// demo code
function browserSupport()
{
  try {
    window.navigator.bridge.getCipherObject;
    $("#warning").hide();
  }
  catch (ex) {
    $("#warning").show();
  }
}

function keygen()
{
  var cipherObj = {
    type: "keygen",
    format: "DER_BASE64"
  };

  var request = window.navigator.bridge.getCipherObject(cipherObj);

  request.onsuccess = function ()
  {
    window._pubKey = this.result.publicKey;
    window._keyID = this.result.id;
    var html = "<h4>" +
      this.result.id + "</h4>"
      + "<h4>"
      + this.result.publicKey
      + "</h4>";
    $("#keygen").append($(html));
    console.log(this.result);
    $("#section-encrypt").show();
  };

  request.onerror = function (error)
  {
    alert(error.name);
    console.log(error.name);
  };
}

function write()
{
  var writeCipherObject = {
    type: "write",
    format: "DER_BASE64",
    recipientName: "drzhivago",
    publicKey: window._pubKey,
    keyID: window._keyID
  };

  var request = window.navigator.bridge.getCipherObject(writeCipherObject);

  request.onsuccess = function ()
  {
    window._cipherObj = this.result;
    $("#writebox").text(this.result.content);
    $("#signature").text(this.result.signature);
    $("#raw-object").text(JSON.stringify(this.result, undefined, 2));
    $("#section-decrypt").show();
    window.location = "#decryption";
  };

  request.onerror   = function (aError)
  {
    console.log(aError.name);
  };
}

function read()
{
  if (!window._cipherObj) {
    alert("Run the 'Write' demo before 'Read'");
    throw new Error("Abort 'read'. No cipher object to operate on.");
  }
  var readCipherObject = window._cipherObj;
  readCipherObject.type = "read";
  readCipherObject.format = "DER_BASE64";
  readCipherObject.authorName = "drzhivago";
  readCipherObject.keyID = window._keyID;

  var request = window.navigator.bridge.getCipherObject(readCipherObject);

  request.onsuccess = function ()
  {
    console.log("Message decrypted, must be read in Browser UI");
    console.log(this.result);
    $("#verified-signature").text(this.result.verification);
  };

  request.onerror = function (aError)
  {
    console.log(aError.name);
  };
}

function sign()
{

}

function verify()
{

}

function hash()
{

}

