const Imap = require('imap');
const EventEmitter = require('events').EventEmitter;
const MailParser = require("mailparser").MailParser;
let Parser = require('./lib/Parser');

class SimpleImapMail extends EventEmitter {
  constructor(options) {
    super();
    this.uids = [];
    this.isFetchingUnreadMails = false;
    this.setCofigurationOptions(options);
    this.instantiateImap(options);
    this.setEventListeners();
    this.instances = [];
    this.isInstanceSkipped = false;
    this.isInstanceRunning = false;
    this.parsedMessage;
  }

  instantiateImap(options) {
    this.imap = new Imap({
      xoauth2: options.xoauth2,
      user: options.username,
      password: options.password,
      host: options.host,
      port: options.port,
      tls: options.tls,
      tlsOptions: options.tlsOptions || {},
      connTimeout: options.connTimeout || null,
      authTimeout: options.authTimeout || null,
      debug: options.debug || null
    });
  }

  processSearchFilterValue(value) {
    if (Array.isArray(value) == true && value.length > 0) {
      return value;
    }

    if (typeof value === 'string') {
      return [value];
    }

    return ['UNSEEN']
  }

  setCofigurationOptions(options) {
    this.markSeen = options.markSeen === true;
    this.mailbox = options.mailbox || "INBOX";
    this.fetchUnreadOnStart = options.fetchUnreadOnStart === true;
    this.mailParserOptions = options.mailParserOptions || {};
    this.attachmentOptions = options.attachmentOptions || {};
    this.attachments = options.attachments || false;
    this.searchFilter = this.processSearchFilterValue(options.searchFilter);

    this.attachmentOptions.directory = (this.attachmentOptions.directory ? this.attachmentOptions.directory : '');

    if (options.attachments && options.attachmentOptions && options.attachmentOptions.stream) {
      this.mailParserOptions.streamAttachments = true;
    }
  }

  setEventListeners() {
    this.imap.once('ready', () => this.imapReady());
    this.imap.once('close', () => this.imapClose());
    this.imap.on('error', (error) => this.imapError(error));
  }

  /** */
  start() {
    this.imap.connect();
  };

  stop() {
    this.imap.end();
  };

  /** */


  imapReady() {
    this.imap.openBox(this.mailbox, false, async (err, mailbox) => {
      if (err) {
        this.emit('error', err);
      } else {
        this.emit('server:connected');
        if (this.fetchUnreadOnStart) {
          await this.parseUnreadMessages();
        }
        this.imap.on('mail', async () => await this.imapMail());
        this.imap.on('update', async () => await this.imapMail());
      }
    });
  }

  imapClose() {
    this.emit('server:disconnected');
  }

  imapError(err) {
    this.emit('error', err);
  }

  async imapMail() {
    // console.log(this.isInstanceRunning, 'this.isInstanceRunning')
    if (!this.isInstanceRunning) {
      // console.log("Starting parseUnreadMessages")
      await this.parseUnreadMessages();
      // console.log("Ending parseUnreadMessages")
      /**
       * Check if this.isInstanceSkipped is true
       * and this.isInstanceRunning is false
       * and this.instances is empty
       */
      // console.log("Is There Skipped instance?", this.isInstanceSkipped)
      if (this.isInstanceSkipped && !this.isInstanceRunning && this.instances.length === 0) {
        // console.log("Rerunning skipped instance")
        this.isInstanceSkipped = false;
        await this.parseUnreadMessages();
      }
    } else {
      this.isInstanceSkipped = true;
    }
  }

  async parseUnreadMessages() {
    this.isInstanceRunning = true;
    return new Promise((resolve) => {
      this.imap.search(this.searchFilter, async (err, results) => {
        if (err) this.emit('error', err);
        this.instances = results;
        for (const result of results) {
          await this.getMessage(result);
        }
        this.isInstanceRunning = false;
        // console.log("All done", results);
        resolve();
      });
    });
  }

  async getMessage(uid) {
    return new Promise((resolve) => {
      this.imap.search([['UID', uid]], async (err, results) => {
        if (err) this.emit('message:error', err);

        if (results.length > 0) {
          let messageFetchQuery = this.imap.fetch(results[0], {
            markSeen: true,
            bodies: ''
          });

          messageFetchQuery.on('message', (message, sequenceNumber) => {
            let parser = new MailParser(this.mailParserOptions);

            message.on('body', body => {
              body.pipe(parser);
            })

            parser.on('headers', headers => Parser.parseHeaders(headers));

            parser.on('data', data => Parser.parseMessageData(data));

            parser.on('end', () => {
              this.emit('message', Parser.getParseResult());
              Parser.parseResult.attachments = [];
              this.instances = this.instances.filter(e => e !== results[0]);
              // console.log('RUNNING INSTANCE REMAINING:::', this.instances)
              resolve(results);
            })

            parser.on('error', error => this.emit('error', error));
          });

          messageFetchQuery.on('error', err => this.emit('message:error', err));
        }
      });
    });
  }
}

module.exports = SimpleImapMail;