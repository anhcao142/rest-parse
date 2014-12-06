rest-parse
==========

Parse REST API for Node js

##Installation##

* Simply run
```
npm install rest-parse
```
* Or if you want to save it to package.json
```
npm install rest-parse --save
```
* Or add `rest-parse` in your package.json
```
"dependencies": {
  "rest-parse": "*",
  ...
},
```
&nbsp;&nbsp;&nbsp;&nbsp;then run
```
npm install
```

##Setup##
```
var restParse = require('rest-parse');

//prepare your keys
var APP_ID = '<your-parse-app-id>';
var REST_API_KEY = '<your-parse-rest-api-key>';

//create parse object with your keys
var Parse = new restParse(APP_ID, REST_API_KEY);
```
##Callback##
All callbacks should follow this format: function(error, response, body, success) { ... }. This is because Kaiseki is based on Request and I thought it would be best to pass the same callback parameters. The error and response parameters are passed as is. On most methods, body is changed and parsed from JSON for your convenience.

* **error**: If there's an error during the request (e.g. no internet connection), this will not be empty. Note that if the API returns a statusCode that is not 2xx, it is not marked as an error.

* **response**: You can check lots of info about the request in here. For example, the REST API will return a response.statusCode value of 4xx on failures. In these cases, the API will still return a JSON object containing the fields code and error. You can get this in the body parameter.
  ```
  { "code": 105,
    "error": "invalid field name: bl!ng" }
  ```
&nbsp;&nbsp;&nbsp;&nbsp;Read more about the Response format [here](https://parse.com/docs/rest#general-responses).

* **body**: On successful requests, this will be an object or array depending on the method called.

* **success**: A convenience parameter, this is a boolean indicating if the request was a success.

##User##
####Setup####
This is to init the parse user before you could use it.
```
var parseUser = Parse.user();
```

####Sign up####
```
var newUser = {
  username: 'boylove142',
  password: '123456',
  email: 'email@gmail.com',
  //...
}

parseUser.signUp(newUser, callback);
```

####Login####
```
var username = 'boylove142';
var password = '123456';

parseUser.logIn(username, password, callback);
```
