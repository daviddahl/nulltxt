// demo code
function keygen()
{
  var cipherObj = {
    type: "keygen",
    format: "DER_BASE64"
  };

  var request = window.navigator.bridge.getCipherObject(cipherObj);

  request.onsuccess = function ()
  {
    console.log(this.result);
  };

  request.onerror = function (error)
  {
    console.log(error.name);
  };
}

function write()
{
  var pubKey = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqk5LsmADKkK8F20MUhCSR7qPNxU/XAa/B06q2LTB1E6Uz5pYcJ+gkCzd/BzYXv8zJOAcqC4KtNzUWAwF8X7UmSn9TH6TiI0uP84OmknQI6U9g7aTcFUKq3nwoYvR2VQL0bml+bRoUF2ItROJHPhh6ER5nn3VFXQte7VZs8OMyihn2RiyGkgGqH5p6lf1HAvGmEt8116EVIxw9KtfQJUaD2SeZMCf9e/heFCKx3Cp/1s8eEzoibHh4B7/cSBVtD7xoeDkH26QcaW0FpQ64SnEMNS9sO02h6aUR54Ynn7vg2EZZicTHe1PmmQl4R4vH+c8Rudrcib0+xcqDmLoqkzhCwIDAQAB";

  var writeCipherObject = {
    type: "write",
    format: "DER_BASE64",
    recipientName: "drzhivago",
    publicKey: pubKey,
    // PREFILLED CONTENT FOR DEMO PURPOSES ONLY
    content: "THE  rue  du Coq  d'Or, Paris,  seven in the  morning. A succession of furious,  choking yells  from the street. Madame Monce, who kept the little hotel opposite mine, had come out on to the pavement to address a lodger on the third floor. Her bare feet were stuck into sabots and her grey hair was streaming down. \nMADAME MONCE: ‘SALOPE! SALOPE! How many times have I told you not tosquash bugs on the wallpaper? Do you think you’ve bought the hotel, eh? Whycan’t you throw them out of the window like everyone else? PUTAIN! SALOPE!’\nTHE WOMAN ON THE THIRD FLOOR: ‘VACHE!’\nThereupon a whole variegated chorus of yells, as windows were flung open on every side and half the street joined in the quarrel. They shut up abruptly ten minutes later, when a squadron of cavalry rode past and people stopped shouting to look at them."
  };

  var request = window.navigator.bridge.getCipherObject(writeCipherObject);

  request.onsuccess = function ()
  {
    window._cipherObj = this.result;
    $("#writebox").text(this.result.content);
    $("#signature").text(this.result.signature);
    $("#raw-object").text(JSON.stringify(this.result, undefined, 2));
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

  var request = window.navigator.bridge.getCipherObject(readCipherObject);

  request.onsuccess = function ()
  {
    console.log("Message decrypted, must be read in Browser UI");
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

