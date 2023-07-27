# WebPush-dispatcher

Node server application to simplify sending bulk Web Push Messages. Submit hundreds of web push messages in a single HTTP request. The server will dispatch those messages asynchronously and concurrently.

# Tracking messages using webhooks

You likely want to know keep track if a push subscription had expired or not in order to keep your subscriber database up-to-date. If you supply a webhook url to a message a POST will be sent to it holding the submission response.

# Concurrency

There is no limit on the number of simultaneous requests to the push endpoints. This ensures the messages will be sent as quickly as possible. 

The webhook calls are limited to 20 concurrent requests per origin. This number can be configured.

# Configuration

Create .env file to set the environment variables:

```
HTTP_PORT=8080
WEBPUSH_SUBJECT=https://example.com
WEBPUSH_PUBLIC_KEY=<PUBLIC KEY>
WEBPUSH_PRIVATE_KEY=<PRIVATE KEY>
MAX_WEBHOOK_SOCKETS=20
```

# Running using NodeJS

Install NodeJS and NPM, then start the server as follows:
```console
$ npm install
$ export $(cat .env | xargs) && node server.js
```

# Running from Docker

Check out the repository, edit docker-compose.yml to your taste and run the following command:

```console
$ docker-compose up
```

The above command keeps the container in the foreground so you can stop it again using Ctrl-C. 

To create a container and run it in the background:

```console
$ docker-compose up -d
```

# Configuration

The following environment variables can be set:

| name                | description                                                | default |
| ------------------- | ---------------------------------------------------------- | ------- |
| HTTP_PORT           | The TCP port the web server listens to                     | 8080    |
| WEBPUSH_SUBJECT     | the subject used to create the VAPID keypair for           | none.   |
| WEBPUSH_PUBLIC_KEY  | the VAPID public key                                       | none    |
| WEBPUSH_PRIVATE_KEY | the VAPID private key                                      | none    |
| MAX_WEBHOOK_SOCKETS | maximum concurrent connection per origin for webhook calls | 20      |

# Sending messages

To send messages, send a JSON body in a POST request to the server.

Here is a minimal example for sending a single push message:

```json
{
  "messages": [
    {
      "subscription" : {
        "endpoint" : "subscription_endpoint_url",
        "keys" : {
          "auth" : "auth_token",
          "p256dh" : "auth_publickey"
        }
      },
      "payload": "message payload"
    }
  ]
}
```

Here is a full example with multiple messages and webhook urls:

```json
{
  "messages": [
    {
      "subscription" : {
        "endpoint" : "subscription_endpoint_url",
        "keys" : {
          "auth" : "auth_token",
          "p256dh" : "auth_publickey"
        }
      },
      "payload": "message payload",
      "webhook": "https://www.example.com/push-webhook/?message=1"
    },
    {
      "subscription" : {
        "endpoint" : "subscription_endpoint_url",
        "keys" : {
          "auth" : "auth_token",
          "p256dh" : "auth_publickey"
        }
      },
      "payload": "message payload",
      "webhook": "https://www.example.com/push-webhook/?message=2"
    }
  ]
}
```

# Processing WebHook calls

If a webhook url is set for a message, the web push result will be sent as a JSON POST request.

Usually, submitting a web push will result in a 201 response like this:

```json
{
	"statusCode": 201,
	"body": "",
	"headers": {
		"content-length": "0",
		"location": "https://wns2-am3p.notify.windows.com/messageId/4901058...",
		"x-wns-notificationstatus": "received",
		"x-wns-status": "received",
		"x-wns-msg-id": "44040BAAD807E576",
		"strict-transport-security": "max-age=31536000; includeSubDomains",
		"date": "Wed, 26 Jul 2023 18:21:46 GMT"
	}
}
```

If a web push subscription has expired, the web push will result in a 410 (Gone) response:

```json
{
	"name": "WebPushError",
	"message": "Received unexpected response code",
	"statusCode": 410,
	"headers": {
		"content-type": "text/plain; charset=utf-8",
		"x-content-type-options": "nosniff",
		"x-frame-options": "SAMEORIGIN",
		"x-xss-protection": "0",
		"date": "Wed, 26 Jul 2023 18:26:36 GMT",
		"content-length": "47",
		"alt-svc": "h3=\":443\"; ma=2592000,h3-29=\":443\"; ma=2592000"
	},
	"body": "push subscription has unsubscribed or expired.\n",
	"endpoint": "https://fcm.googleapis.com/fcm/send/esbX9MtCVko..."
}
```
