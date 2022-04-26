var SimpleImapAsync = require("./");

var simpleImapAsync = new SimpleImapAsync({
  username: "username",
  password: "password",
  host: "host",
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
  mailbox: "INBOX",
  markSeen: false,
  fetchUnreadOnStart: true,
  attachments: true,
  // attachmentOptions: { directory: "attachments/" }
});

simpleImapAsync.start();

simpleImapAsync.on("server:connected", () => {
  console.log("imapConnected");
});

simpleImapAsync.on("server:disconnected", () => {
  console.log("imapDisconnected");
});

simpleImapAsync.on("error", function(err){
  console.log(err);
});

simpleImapAsync.on("message", (message, seqno, attributes) => {
  console.log(message);
});


