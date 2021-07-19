# RTlogs

Open Source Real-time Monitoring and Error Tracking stack.

## Features

- Web Socket Server: https://rtlogs-ws.example.com
- Logging Dashboad: https://rtlogs.example.com
- RTlogs Rest API.

## Intergration

### Create a Client

- Menu \ Client \ Create.

updating...

### Client Authentication

A sample client

```javascript
Client ID: client_1
Client Secret: cadb2668033deb03245e79a4ee069075
```

**Get an access token**

You need to use Client ID & Client Secret to get new access token.

The access token with live forever until you request the new one.

Request a token

```shell
curl --location --request POST 'http://localhost:4000/auth/access_token' \
--header 'Content-Type: application/json' \
--data-raw '{
    "client_id": "client_1",
    "client_secret": "cadb2668033deb03245e79a4ee069075"
}'
```

Result

```json
{
    "message": "Create new access token successfully.",
    "data": {
        "access_token": "f0b6f16c70e0f423bdd2bc5f7dea8fe32d4eb18a02b29fdd51de9806c2bb6ca0"
    }
}
```

## Push a log

Push a log data

```shell
curl --location --request POST 'http://localhost:4000/logs' \
--header 'x-authorization: fa35882ce52add85c44fa126a397405bec8cf5b766d2adf71fcbc67ad175f7d6' \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data-raw '{
    "environment": "local",
    "type": "error",
    "message": "Error connect to database",
    "data": "[2021-06-29 14:17:30] local.ERROR: SQLSTATE[HY000] [1045] Access denied for user '\''root'\''@'\''localhost'\'' (using password: NO)"
}'
```

Result

```json
{
    "message": "Sent logs to channel: error."
}
```
