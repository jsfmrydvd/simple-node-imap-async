# Overview

Original package https://www.npmjs.com/package/simple-node-imap
Adding async/await when fetching of messages

## Use

Install

`npm install simple-node-imap-async`


JavaScript Code:


```javascript

var SimpleImapAsync = require("simple-node-imap-async");

var simpleImapAsync = new SimpleImapAsync({
  username: "imap-username",
  password: "imap-password",
  host: "imap-host",
  port: 993, // imap port
  tls: true,
  connTimeout: 10000, // Default by node-imap
  authTimeout: 5000, // Default by node-imap,
  debug: console.log, // Or your custom function with only one incoming argument. Default: null
  tlsOptions: { rejectUnauthorized: false },
  mailbox: "INBOX", // mailbox to monitor
  searchFilter: ["UNSEEN", "FLAGGED"], // the search filter being used after an IDLE notification has been retrieved
  markSeen: true, // all fetched email willbe marked as seen and not fetched next time
  fetchUnreadOnStart: true, // use it only if you want to get all unread email on lib start. Default is `false`,
  mailParserOptions: {streamAttachments: true}, // options to be passed to mailParser lib.
  attachments: true, // download attachments as they are encountered to the project directory
});

simpleImapAsync.start(); // start listening


simpleImapAsync.on("server:connected", () => {
  console.log("imapConnected");
});

simpleImapAsync.on("server:disconnected", () => {
  console.log("imapDisconnected");
});

simpleImapAsync.on("error", err => {
  console.log(err);
});

//
simpleImapAsync.on("message", message => {
  console.log(message);
});


// stop listening
simpleImapAsync.stop();

```

## Attachments

Attachments are converted into base64 strings.

## License

MIT