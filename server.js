'use strict';

// const http = require('http');
import http from 'http';
import https from 'https';
import webpush from 'web-push';
import fetch from 'node-fetch';

// import 'log-timestamp';
// import { parse } from 'url';
// import { webpush } from 'node_modules/web-push/index.js'

class HttpRequestProcessor {

	init(options) {

		const subject = options.subject;
		const publicVapidKey = options.publicVapidKey;
		const privateVapidKey = options.privateVapidKey;

		webpush.setVapidDetails(subject, publicVapidKey, privateVapidKey);

		this.webpush = webpush;

		const maxWebhookSockets = options.maxWebhookSockets || 10;

		this.httpAgent = new http.Agent({maxSockets: maxWebhookSockets});
		this.httpsAgent = new https.Agent({maxSockets: maxWebhookSockets});

	}

	handleHttpRequest(request, response) {

	    var res = '';

	    if (request.method == 'POST') {

	        let body = '';
	        request.on('data', chunk => {
	            body += chunk.toString(); // convert Buffer to string
	        });

	        let sendPushMessages = this.sendPushMessages.bind(this);

	        request.on('end', () => {

	        	let requestObject;

	        	try {
	        		requestObject = JSON.parse(body);
	        	} catch (e) {

					console.log("Could not parse request body: " + body);

	        	}

	        	if (requestObject != null) {

	        		if ((requestObject.messages != null) && (requestObject.messages.length > 0)) {

						console.log('Sending ' + requestObject.messages.length + (requestObject.messages.length == 1 ? ' message' : ' messages'));

	        			sendPushMessages(requestObject.messages);

						response.end('ok');

	        		} else {

						response.end('no messages element found in body');

					}

	        	} else {

	        		response.end('cannot process body', body);

	        	}

	        });

	    }

	    response.end(res);

	}

	sendPushMessages(messages) {

		if (messages && (messages.length > 0)) {

			for (var i = 0; i < messages.length; i++) {

				var message = messages[i];

				var subscription = message.subscription;
				var payload = message.payload;
				var webhookUrl = message.webhook;

				// console.log('sending push payload', payload, subscription);

				var onSuccess = this.processPushSuccess.bind(this, webhookUrl);
				var onError = this.processPushError.bind(this, webhookUrl);

				this.webpush.sendNotification(subscription, payload).then(onSuccess).catch(onError);

			}

		}

	}

	processPushSuccess(webhookUrl, result) {

		if (webhookUrl) {

			this.sendPushResult(webhookUrl, result);

		} else {

			console.log('push succeeded', webhookUrl, result);

		}

	}

	processPushError(webhookUrl, error) {

		if (webhookUrl) {

			this.sendPushResult(webhookUrl, error);

		}

		console.log('push failed', webhookUrl, error);

	}

	sendPushResult(webhookUrl, result) {

		fetch(webhookUrl, {
			method: 'POST',
			body: JSON.stringify(result),
			headers: {'Content-Type': 'application/json'},
			agent: function(_parsedURL) {
				if (_parsedURL.protocol == 'http:') {
					return this.httpAgent;
				} else {
					return this.httpsAgent;
				}
			}.bind(this)
		});

	}

}

const options = {};

if (process.env.WEBPUSH_SUBJECT) {

	options.subject = process.env.WEBPUSH_SUBJECT;

} else {

	console.log("Error: WEBPUSH_SUBJECT environment parameter required");
	process.exit(1);

}

if (process.env.WEBPUSH_PUBLIC_KEY) {

	options.publicVapidKey = process.env.WEBPUSH_PUBLIC_KEY;

} else {

	console.log("Error: WEBPUSH_PUBLIC_KEY environment parameter required");
	process.exit(1);

}

if (process.env.WEBPUSH_PRIVATE_KEY) {

	options.privateVapidKey = process.env.WEBPUSH_PRIVATE_KEY;

} else {

	console.log("Error: WEBPUSH_PRIVATE_KEY environment parameter required");
	process.exit(1);

}

var listenPortHttp = process.env.HTTP_PORT || 8080;

options.maxWebhookSockets = process.env.MAX_WEBHOOK_SOCKETS || 20;

var httpRequestProcessor = new HttpRequestProcessor();
httpRequestProcessor.init(options);

var handleHttpRequest = httpRequestProcessor.handleHttpRequest.bind(httpRequestProcessor);

// create servers
var httpServer = http.createServer(handleHttpRequest);

httpServer.listen(listenPortHttp, function(){
    // Callback triggered when http server is successfully listening.
    console.log("HTTP server listening on port " + listenPortHttp);
});

export default httpServer;
