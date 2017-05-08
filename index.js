/**
 * Caxios - consistent Axios.
 *
 * General purpose HTTP request module with consistent responses.
 * This module does NOT modify the global Axios instance.
 *
 * Resolved response objects always have the following fields (Axios compatible):
 *   - status
 *   - statusText
 *   - headers
 *   - config
 *   - request
 *   - data
 *
 * Rejected request error objects are extended with the following additional methods:
 *   - isFormat()     - true if the client expected JSON response, but server returned malformed JSON
 *   - isCancel()     - true if the request was cancelled by the client
 *   - isNetwork()    - true for any network error (timeout, server unavailable, CORS etc.)
 *   - isValidation() - true if response status == 422 (Unprocessable Entity, used for validation errors)
 * These error types are mutually exclusive, so for any error only one of those methods returns true.
 */
const axios = require('axios');

// make sure we don't modify the global axios instance
const caxios = axios.create();


/**
 * Default fulfilled response interceptor.
 * Makes sure the resolved result has consistent format.
 *
 * @param response
 * @returns {object}
 */
const fulfilledResponseInterceptor = response => {
    const accept = response.config.headers['Accept'];

    const theResponseIsFine =
        // we did not expect JSON, so return whatever came back from the server
        accept.indexOf('application/json') < 0

        // we expected more than one content type, so it may be something else than valid JSON
        || accept.indexOf(',') > 0

        // Axios successfully JSON.parsed the response
        || typeof response.data === 'object';

    if (theResponseIsFine) return response;

    // If we got here, it means Axios failed to JSON.parse(data) the response,
    // but the client expected a JSON response. Capture the parsing error and reject.
    try {
        JSON.parse(response.data);
        return response;
    } catch (ex) {
        // ex is an instance of SyntaxError
        ex.response = response;
        ex.config = response.config;
        return rejectedResponseInterceptor(ex);
    }
};

/**
 * Default rejected response interceptor.
 * Extends `ex` object with additional methods for special error types.
 * 
 * @param ex
 */
const rejectedResponseInterceptor = ex => {
    ex.isFormat = ex.isCancel = ex.isNetwork = ex.isValidation = () => false;

    if (ex instanceof SyntaxError) {
        ex.isFormat = () => true;
    } else if (axios.isCancel(ex)) {
        ex.isCancel = () => true;
    } else if (!ex.response) {
        ex.isNetwork = () => true;
    } else if (ex.response.status === 422) {
        ex.isValidation = () => true;
    }
    throw ex;
};


/**
 * Creates a shallow copy of `baseConfig`.
 * The result config contains  headers.Accept = 'application/json'
 *
 * @param baseConfig
 * @returns {*}
 */
const withAcceptJSON = (baseConfig = {}) => {
    const defaultHeaders = Object.assign({}, { Accept: 'application/json' }, baseConfig.headers);
    return Object.assign({}, baseConfig, { headers:  defaultHeaders});
};


/**
 * Convenience function that creates a shallow copy of `baseConfig`.
 * If baseConfig contains cancelSource field, the result config object
 * is extended with `cancelToken` field, set to `baseConfig.cancelSource.token`.
 * <pre>
 *  // axios
 *  axios.get('/some/path', { cancelToken: cancelSource.token })
 *
 *  // caxios shortcut
 *  caxios.get('/some/path', { cancelSource })
 * </pre>
 *
 * @param {object} baseConfig
 * @returns {object}
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
const get = (url, config = {}) => caxios.get(url, withCancelToken(config));


/**
 * POST
 * @param url
 * @param data
 * @param config
 */
const post = (url, data = {}, config = {}) => caxios.post(url, data, withCancelToken(config));


/**
 * PUT
 * @param url
 * @param data
 * @param config
 */
const put = (url, data = {}, config = {}) => caxios.put(url, data, withCancelToken(config));


/**
 * PATCH
 * @param url
 * @param data
 * @param config
 */
const patch = (url, data = {}, config = {}) => caxios.patch(url, data, withCancelToken(config));


/**
 * DELETE
 * @param url
 * @param data
 * @param config
 */
const del = (url, data = {}, config = {}) => caxios.delete(url, data, withCancelToken(config));


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
 * PATCH request with  Accept: 'application/json'  header
 * @param url
 * @param data
 * @param config
 */
const patchJSON = (url, data = {}, config = {}) => patch(url, data, withAcceptJSON(config));


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


(function setCaxiosDefaults() {

    // By default, Axios has timeout set to 0
    caxios.defaults.timeout = 1000 * 3;

    // By default, Axios sends request payload as application/x-www-form-urlencoded
    ['post', 'put', 'patch'].forEach(m => caxios.defaults.headers[m]['Content-Type'] = 'application/json');

    // Make responses consistent
    caxios.interceptors.response.use(fulfilledResponseInterceptor, rejectedResponseInterceptor);

})();


module.exports = {
    get,
    post,
    put,
    patch,
    del,

    getJSON,
    postJSON,
    putJSON,
    patchJSON,
    delJSON,

    withCancelToken,
    withAcceptJSON,

    makeCancelSource,

    fulfilledResponseInterceptor,
    rejectedResponseInterceptor,

    /**
     * Caxios instance
     */
    caxios,

    /**
     * Unmodified Axios instance
     */
    axios,
};
