/**
 * Consistent Axios.
 *
 * General purpose HTTP request module with consistent responses.
 * Based on the excellent Axios package.
 *
 * Resolved response / rejected error objects always have the following fields:
 *   - status
 *   - statusText
 *   - headers
 *   - config
 *   - request
 *   - data
 *
 * In addition, rejected error objects have the following fields:
 *   - message
 *   - cancelled  - true if the request was cancelled by the client
 *   - invalid    - true if response status == 422 (Unprocessable Entity)
 */
const axios = require('axios');


/**
 * Default fulfilled response interceptor.
 * Makes sure the resolved result has consistent format.
 *
 * @param response
 * @returns {*}
 */
const fulfilledResponseInterceptor = response => {
    // All xxxJSON() functions set Accept header explicitly, so check if JSON response was expected and received.
    if (response.config.headers['Accept'] !== 'application/json' || typeof response.data === 'object')
        return response;

    // A JSON response is expected, but typeof data != 'object'.
    // That means axios silently failed JSON.parse(data) call, so capture the parsing error and reject.
    try {
        JSON.parse(response.data);
        return response;
    } catch (ex) {
        throw Object.assign(ex, response, {
            message: 'Malformed JSON: ' + ex.message,
            status: 415,
            statusText: 'Unsupported Media Type',
        });
    }
};

/**
 * Default rejected response interceptor.
 * Makes sure the rejected result has consistent format.
 * @param ex
 */
const rejectedResponseInterceptor = ex => {
    // Special case for server validation errors
    ex.message = ex.response && ex.response.status === 422 ? 'Validation errors' : ex.message;

    // Lack of response means either 1) request timeout, 2) unavailable server or 3) a cancellation.
    Object.assign(ex, ex.response || {
            status: 503,
            statusText: 'Service Unavailable',
            config: ex.config || {},
            headers: {},
            request: {},
            data: isCancelled(ex) ? 'Request cancelled' : 'Request timeout or server unavailable',
        });

    // This is already merged into ex
    delete ex.response;

    ex.cancelled = isCancelled(ex);
    ex.invalid = isInvalid(ex);

    throw ex;
};


/**
 * Creates a shallow copy of `baseConfig`.
 * The result config contains  headers['Accept'] = 'application/json'
 *
 * @param baseConfig
 * @returns {*}
 */
const withAcceptJSON = (baseConfig = {}) => {
    const defaultHeaders = Object.assign({}, { Accept: 'application/json' }, baseConfig.headers);
    return Object.assign({}, baseConfig, { headers:  defaultHeaders});
};


/**
 * Creates a shallow copy of `baseConfig`.
 * If baseConfig contains cancelSource field,
 * the result config object gets `cancelToken` field with  `baseConfig.cancelSource.token`.
 *
 * @param baseConfig
 * @returns {*}
 */
const withCancelToken = baseConfig => {
    const cancelToken = { cancelToken: baseConfig.cancelToken || (baseConfig.cancelSource || {}).token };
    return Object.assign({}, baseConfig, cancelToken);
};


/**
 * GET
 * @param url
 * @param config
 */
const get = (url, config = {}) => axios.get(url, withCancelToken(config));


/**
 * POST
 * @param url
 * @param data
 * @param config
 */
const post = (url, data = {}, config = {}) => axios.post(url, data, withCancelToken(config));


/**
 * PUT
 * @param url
 * @param data
 * @param config
 */
const put = (url, data = {}, config = {}) => axios.put(url, data, withCancelToken(config));


/**
 * DELETE
 * @param url
 * @param data
 * @param config
 */
const del = (url, data = {}, config = {}) => axios.delete(url, data, withCancelToken(config));


/**
 * GET request with  Accept: 'application/json'  header
 * @param url
 * @param config
 */
const getJSON = (url, config = {}) => get(url, withAcceptJSON(config));


/**
 * POST request with  Accept: 'application/json'  header
 * @param url
 * @param data
 * @param config
 */
const postJSON = (url, data = {}, config = {}) => post(url, data, withAcceptJSON(config));


/**
 * PUT request with  Accept: 'application/json'  header
 * @param url
 * @param data
 * @param config
 */
const putJSON = (url, data = {}, config = {}) => put(url, data, withAcceptJSON(config));


/**
 * DELETE request with  Accept: 'application/json'  header
 * @param url
 * @param data
 * @param config
 */
const delJSON = (url, data = {}, config = {}) => del(url, data, withAcceptJSON(config));


/**
 * Creates a new cancel source, which can be passed directly to get/post options as <i>cancelSource</i>
 */
const makeCancelSource = () => axios.CancelToken.source();


/**
 * Returns true if err was triggered by cancel token.
 * @param {Error} err error thrown by an ajax function
 */
const isCancelled = err => axios.isCancel(err);


/**
 * Returns true if the status == 422, which is used to return server validation errors.
 * @param {HttpError} err
 */
const isInvalid = err => err.status == 422;


(function setGlobalDefaults() {

    // By default, axios has timeout set to 0
    axios.defaults.timeout = 1000 * 3;

    // By default, axios sends request payload as application/x-www-form-urlencoded
    ['post', 'put', 'patch'].forEach(m => axios.defaults.headers[m]['Content-Type'] = 'application/json');

    // Make responses consistent
    axios.interceptors.response.use(fulfilledResponseInterceptor, rejectedResponseInterceptor);

})();


module.exports = {
    get,
    post,
    put,
    del,

    getJSON,
    postJSON,
    putJSON,
    delJSON,

    withCancelToken,
    withAcceptJSON,

    makeCancelSource,
    isCancelled,
    isInvalid,

    fulfilledResponseInterceptor,
    rejectedResponseInterceptor,

    axios,
};
