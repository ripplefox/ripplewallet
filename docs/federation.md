# Federation Protocol

The federation protocol is a way for the client software to resolve email-like addresses such as name@yourdomain.com. 

The client uses federation protocol to create a dynamic interface for user to transfer their assets.

## ripple.txt

The website should have a ripple.txt file. Either `https://yourdomain.com/ripple.txt` or `https://www.yourdomain.com/ripple.txt`

The ripple.txt should include a [federation_url] field. For example:

```````````
[currencies]
CNY rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y
ULT rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y

[domain]
ripplefox.com

[accounts]
rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y

[hotwallets]
rpWKyqptwSMyexGitY1ukR2Y4rbpzassQR
r3ipidkRUZWq8JYVjnSnNMf3v7o69vgLEW

[federation_url]
https://ripplefox.com/bridge
`````````````

## [federation_url]

The client will send `federation` and `quote` requests to the federation server.

### Step 1: federation request

The client will send a GET request with below parameters. 

| Name | Type | Description |
|:-------------------------|:-------------------------:|:-------------------------|
| type | string | Must be "federation". |
| domain | string | The string after "@". |
| destination | string | The string before "@". |
| address | string | *Optional* The address of the user. |
| client | string | *Optional* The client and version information. |

For example, when user input `bank@ripplefox.com`, the client would send below parameters to the [federation_url].

```````
type : "federation",
domain : "ripplefox.com",
destination : "bank",
address : "r3kmLJN5D28dHuH8vZNUZpMC43pEHpaocV",
client : "foxlet-1.0.0"
`````````

The response is a ripple address or some extra fields. If it is a address, the server returns an object with the following structure:

| Name | Type | Description |
|:-------------------------|:-------------------------:|:-------------------------|
| result | string | Must be "success". |
| federation_json | object | Object contains "destination_address" |
| *federation_json*.type | string | Must be "federation_record". |
| *federation_json*.destination_address | string | A ripple address. |
| *federation_json*.request | object | *Optional* The request parameters. |

Sample:

``````````
{
  "result": "success",
  "federation_json": {
    "type": "federation_record",
    "destination_address": "rLSnkKvMfPD9abLoQFxQJMYyZqJcsqkL3o",
    "request": {
      "type": "federation",
      "domain": "ripplefox.com",
      "destination": "withdraw"
    }
  }
}
``````````

The client would consider the email-like address as a alias of the destination_address account. Step 2 is not necessary in this case.

The server could also returns the extra_fields with the following structure:

| Name | Type | Description |
|:-------------------------|:-------------------------:|:-------------------------|
| result | string | Must be "success". |
| federation_json | object | Object contains extra fields. |
| *federation_json*.type | string | Must be "federation_record". |
| *federation_json*.destination | string | The value which will be sent in quote step. |
| *federation_json*.domain | string | The value which will be sent in quote step. |
| *federation_json*.quote_url | string | The quote url. |
| *federation_json*.currencies | array | The assets accepted by the destination. Each asset have currency and issuer field. |
| *federation_json*.extra_fields | array | An array contains the components (text, select, label) which could be used to create a dynamic form. |
| *federation_json*.request | object | *Optional* The request parameters. |


The client create a dynamic form according the extra_fields. Sample:

``````````
{
  "result": "success",
  "federation_json": {
    "type": "federation_record",
    "destination": "bank",
    "domain": "ripplefox.com",
    "quote_url": "https://ripplefox.com/bridge",
    "currencies": [
      {
        "currency": "CNY",
        "issuer": "rNMAxEeU2KVuCZLmNkajfGR7TuPsJMyfox"
      }
    ],
    "extra_fields": [
      {
        "type":"label",
        "label":"银行提现24小时内以账",
        "hint":"We will credit your account in 24 hours."
      },
      {
        "type": "select",
        "name": "bank",
        "label": "Bank Name 银行名称",
        "hint": "Bank Name (Fee: 0.3%, 10CNY at least)",
        "required": true,
        "options": [
          {
            "label": "招商银行  CMB",
            "value": "CMB",
            "selected": false,
            "disabled": false
          },
          {
            "label": "工商银行  ICBC",
            "value": "ICBC",
            "selected": false,
            "disabled": false
          },
          {
            "label": "其他银行 OTHERS",
            "value": "Other",
            "selected": false,
            "disabled": false
          }
        ]
      },
      {
        "type": "text",
        "name": "bankAccount",
        "label": "账号",
        "hint": "Account Number",
        "required": true
      },
      {
        "type": "text",
        "name": "bankUser",
        "label": "真实姓名",
        "hint": "Account Name",
        "required": true
      },
      {
        "type": "text",
        "name": "email",
        "label": "电子邮箱 (重要！用于问题处理)",
        "hint": "Your Email. Please contact support@ripplefox.com if you have any queries.",
        "required": false
      }
    ]
  },
  "request": {
    "type": "federation",
    "domain": "ripplefox.com",
    "destination": "bank"
  }
`````````````

Server could return an error object with below structure:

| Name | Type | Description |
|:-------------------------|:-------------------------:|:-------------------------|
| result | string | Must be "error". |
| error | string | Error code |
| error_message | string | Error description |
| request | object | *Optional* The request parameters. |
 
Sample:

```````````````
{
  "result": "error",
  "error": "noSuchUser",
  "error_message": "The supplied user was not found.",
  "request": {
    "address": "rPVH2HkQPJz5WSrcdWLq2shxvHXR4H18Po",
    "client": "foxlet-1.0.0",
    "destination": "nouser",
    "domain": "ripplefox.com",
    "type": "federation"
  }
}
```````````````

### Step 2: quote request

After user fill the form generated with the extra_fields in step 1, a quote GET request should be fired to `quote_url`. 


| Name | Type | Description |
|:-------------------------|:-------------------------:|:-------------------------|
| type | string | Must be "quote". |
| domain | string | The string domain got in step 1. |
| destination | string | The string destination got in step 1. |
| amount | string | The amount user would send. Using "/" to seperate the currency, like "100/CNY".  |
| *extras* | string | The dynamic fields user provided. |
| address | string | The address of the user. |
| client | string | *Optional* The client and version information. |

````````````
type: "quote",
domain: "ripplefox.com",
destination : "bank",
address : "r3kmLJN5D28dHuH8vZNUZpMC43pEHpaocV",
client : "foxlet-1.0.0",
bank: "CMB",
bankUser: "Alice",
bankAccount: "6226090011114466",
email: "alice@gmail.com",
amount: "100/CNY"
`````````````````

The server will calculate the amount user need to send when get the quote requests. The return value has the following structure:

| Name | Type | Description |
|:-------------------------|:-------------------------:|:-------------------------|
| result | string | Must be "success". |
| timestamp | timestamp | When the quote would be expired. |
| quote | object | Object contains quote information. |
| *quote*.type | string | Must be "quote". |
| *quote*.destination | string | *Optional* |
| *quote*.domain | string | *Optional* |
| *quote*.address | string | *Optional* |
| *quote*.source | string | The source ripple account used in payment. |
| *quote*.destination_address | string | The destination ripple account used in payment. |
| *quote*.destination_tag | UInt | *Optional* The tag that can be used to identify a particular payment. |
| *quote*.invoice_id | string | *Optional* A 256-bit hash that can be used to identify a particular payment. |
| *quote*.memos | array | *Optional* Array of memos to attach to the transaction. (Not supported yet) |
| *quote*.send | array | Array of amounts. The calculated amounts need to send. |
| *quote*.request | object | *Optional* The request parameters. |

Sample: 

```````````````
{
  "result": "success",
  "quote": {
    "type": "quote",
    "destination": "bank",
    "domain": "ripplefox.com",
    "amount": "100/CNY",
    "source": "r3kmLJN5D28dHuH8vZNUZpMC43pEHpaocV",
    "destination_address": "rNMAxEeU2KVuCZLmNkajfGR7TuPsJMyfox",
    "address": "rNMAxEeU2KVuCZLmNkajfGR7TuPsJMyfox",
    "destination_tag": 60140273,
    "invoice_id": "00000000000000000000000000000000000000000000000359720A1587270684",
    "send": [
      {
        "value": "110",
        "issuer": "rNMAxEeU2KVuCZLmNkajfGR7TuPsJMyfox",
        "currency": "CNY"
      }
    ],
    "expires": 1587277884
  },
  "request": {
    "address": "r3kmLJN5D28dHuH8vZNUZpMC43pEHpaocV",
    "amount": "100/CNY",
    "bank": "CMB",
    "bankAccount": "6226090011114466",
    "bankUser": "Alice",
    "destination": "bank",
    "email": "alice@gmail.com",
    "type": "quote"
  },
  "timestamp": 1587270684
}
``````````````````````

Server could return an error object with below structure:

| Name | Type | Description |
|:-------------------------|:-------------------------:|:-------------------------|
| result | string | Must be "error". |
| error | string | Error code |
| error_message | string | Error description |
| request | object | *Optional* The request parameters. |
 
Sample:

```````````````
{
  "result": "error",
  "error": "noSupported",
  "error_message": "至少发送100 CNY。You should send at least 100 CNY",
  "request": {
    "address": "r3kmLJN5D28dHuH8vZNUZpMC43pEHpaocV",
    "amount": "10/CNY",
    "bank": "CMB",
    "bankAccount": "6226090011114466",
    "bankUser": "Alice",
    "destination": "bank",
    "email": "alice@gmail.com",
    "type": "quote"
  }
}
```````````````
