hljs.initHighlightingOnLoad();

$(document).ready(function(){
  browserSupport();
  $("#write-btn").click(write);
  $("#read-btn").click(read);
  $("#keygen-btn").click(keygen);
  $("#section-encrypt").hide();
  $("#section-decrypt").hide();
  $("#section-signature").hide();
  $("#section-hash").hide();
});
