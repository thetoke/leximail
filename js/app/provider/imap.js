var BaseProvider = require('./base');
var Util = require('util');
var IMAP = require('imap');
var MailParser = require("mailparser").MailParser;


var ImapProvider = function()
{
	BaseProvider.apply(this, arguments);
};

Util.inherits(ImapProvider, BaseProvider);


ImapProvider.prototype = {
	getInfo: function()
	{
		return {
			id: 'imap',
			label: 'IMAP',
			description: 'IMAP Provider',
			icon: 'img/email.png'
		};
	},

	initialize: function(config)
	{
		var self = this;

		ImapProvider.super_.prototype.initialize.apply(self, arguments);

		self.imap = new IMAP(self.config);

		self.imap.once('error', function(err)
		{
			console.log(err);
		});

		self.imap.once('end', function()
		{
			console.log('Connection ended');
		});
	},

	connect: function()
	{
		var self = this;
		self.ready = false;

		var d = $.Deferred(function()
		{
			var def = this;

			self.imap.once('ready', function()
			{
				console.log('connection ready');

				self.ready = true;
				def.resolve(self);
			});

			self.imap.connect();
			console.log('connected');
		});

		return d;
	},

	disconnect: function()
	{
		var self = this;
		self.imap.end();
		self.imap.destroy();
		console.log('disconnected');
	},

	openInbox: function(callback)
	{
		var self = this;
		self.imap.openBox('INBOX', true, callback);
	},

	prepare: function()
	{
		var self = this;

		var d = $.Deferred(function()
		{
			var def = this;

			if (self.ready)
			{
				self.openInbox(function(err, box)
				{
					if (err)
					{
						console.log('ERROR', err);
						def.resolve([]);
						return;
					}

					var f = self.imap.seq.fetch('1:30', { bodies: '' });
					self.messages = [];
					
					var len = 0;

					f.on('message', function(msg, seqno)
					{
						console.log('Message #%d', seqno);
						len++;

						var prefix = '(#' + seqno + ') ';
						msg.on('body', function(stream, info)
						{
							var mailparser = new MailParser();
							mailparser.on("end", function(m)
							{
								console.log(prefix + 'Parsed');
								self.messages.push(m);

								if (self.messages.length == len)
								{
									def.resolve(self);
								}
							});
							stream.pipe(mailparser);
						});

						msg.once('attributes', function(attrs)
						{
							//console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
						});
					});
					
					f.once('error', function(err)
					{
						console.log('Fetch error: ' + err);
					});

					f.once('end', function()
					{
						console.log('Done fetching all messages!');
					});

				});
				return;
			}
			def.resolve([]);
		});
		
		return d;
	},

	fetchMessages: function()
	{
		return this.messages;
	},

	fetchFolders: function()
	{

	},

	fetchLabels: function()
	{

	},

	fetchMessage: function(id)
	{

	}
};

module.exports = ImapProvider;