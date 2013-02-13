nulltxt (messaging system)
--------------------------

node/mongodb server and JS frontend proof-of-concept application that consumes the browser API provided by the nulltxt-extension.

This messaging system performs public key and message exchange between 2 users at a time.

Requirements
------------

node.js
MongoDB

* node modules:
ejs  
express  
jade  
mongojs

How nulltxt works
-----------------

Think of it as a "more secure" parallel email application that encrypts all message contents in the browser chrome prior to sending. No JS crypto libraries are used at all. The nulltxt-extension ( https://addons.mozilla.org/en-US/firefox/addon/nulltxt/versions/0.1.4 ) surfaces crypto operations to JS via a "bridge API" (window.navigator.bridge.getCipherObject) which can create a keypair and return the public half, encrypt (and sign) plaintext with a public key, returning a JSON object. Decryption, reading and writing are all performed inside of a special textarea widget provided by the nulltxt-extension.

XXX TODO WTF
------------

nulltxt-extension: The signature is created but not verified on decrypt. P1 BUG!
  * I think it is a text-encoding issue.  

Author
------
David Dahl <ddahl AT nulltxt DOT se>

License
-------
Mozilla Public License
https://www.mozilla.org/MPL/
