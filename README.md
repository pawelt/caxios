# Caxios.

General purpose HTTP request library with consistent behaviour.

It is 100% [Axios](https://github.com/mzabriskie/axios) compatible, with some extra defaults and features.

## Defaults

`Caxios` uses the following defaults:

- request timeout = 3 seconds (by default `Axios` uses infinity)
- `post`, `put` and `patch` methods send `Content: application/json` header (by default `Axios` uses `application/x-www-form-urlencoded`)
- all utility functions with suffixed with JSON (`getJSON`,  `postJSON`,  `putJSON`,  `delJSON`) send `Accept` header set to `application/json` (by default `Axios` uses `application/json, text/plain, */*` for all requests)

`Caxios` does NOT modify the global `axios` instance.

## Features

While `Axios` is an excellent library, its default behaviour may not be ideal. `Caxios` aims to address this by introducing the following features:

  - easier and consistent error handling
  - utility functions for making requests that accept only JSON responses
  - support for HTTP status code 422 - Unprocessable Entity (used for validation errors)
  - support for malformed JSON response handling

Rejected request error objects are extended with the following additional methods:

  - isFormat()     - true if the client expected JSON response, but server returned malformed JSON
  - isCancel()     - true if the request was cancelled by the client
  - isNetwork()    - true for any network error (timeout, server unavailable, CORS etc.)
  - isValidation() - true if response `status` == `422` (`Unprocessable Entity`, used for validation errors)

These error types are mutually exclusive, so only one of those methods returns true for any error.

## Examples

### Send a request that accepts only `application/json` responses

```js
const { getJSON } = require('caxios');
getJSON('/some/data') 

// Axios 
axios.get('/some/data', { headers: { 'Accept': 'application/json' } }) 
```


### Easier cancel token passing

```js
const { getJSON, makeCancelSource } = require('caxios');
const cancelSource = makeCancelSource();

getJSON('/some/data',  { cancelSource })
    .catch(err => console.log(err.isCancel())); // true

// Axios 
axios.get('/some/data', { cancelToken: cancelSource.token })
    .catch(err => console.log(axios.isCancel(err))); // true
```


### Easy error handling

```js
getJSON('http://no-such-address.com')
    .catch(err => {
        console.log(err.isCancel());  // false
        console.log(err.isNetwork()); // true
    }); 

// Axios 
axios.get('http://no-such-address.com')
    .catch(err => {
        console.log(axios.isCancel(err));                   // false
        console.log(!axios.isCancel(err) && !err.response); // true
    }); 
```

### Consistent JSON response format error handling

```js
getJSON('/returns/non-json-response')
    .catch(err => {
        console.log(err.isFormat());  // true
        console.log(err.message);     // JSON parsing error message
    }); 

// Axios swallows JSON parsing errors, so you have to
// manually verify response format in the successful response handler
```


### Special case for validation errors (422 HTTP status code)

```js
getJSON('/this/returns/422')
     .catch(err => {
         console.log(err.response.status); // 422
         console.log(err.isValidation());  // true
         console.log(err.response.data);   // validation errors passed in response body
     });
```