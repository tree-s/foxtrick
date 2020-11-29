/**
 * load.js
 * loading files
 */

'use strict';

/* eslint-disable */
if (!this.Foxtrick)
	// @ts-ignore
	var Foxtrick = {};
/* eslint-enable */

/**
 * Parse data as JSON.
 *
 * Logs bad input in case of errors and returns null instead.
 *
 * @param  {string} data
 * @return {object}
 */
Foxtrick.parseJSON = function(data) {
	var ret = null;
	try {
		ret = JSON.parse(data);

		if (typeof ret !== 'object') {
			Foxtrick.log(new TypeError('Bad JSON: non-object'), data);
			ret = null;
		}
	}
	catch (e) {
		Foxtrick.log('Bad JSON:', e, data);
	}
	return ret;
};

/**
 * Parse data as YAML.
 *
 * Logs bad input in case of errors and returns null instead.
 *
 * @param  {string} data
 * @return {object}
 */
Foxtrick.parseYAML = function(data) {
	var ret = null;

	try {
		ret = data === null ? null : Foxtrick.jsyaml.safeLoad(data);
	}
	catch (e) {
		// invalid YML

		var InputDump = function(text) {
			this.text = text;
		};

		var yError = 'Please check to see if the text has tabs instead of spaces, ' +
			'unescaped quotes or other weird stuff.\n';

		Foxtrick.log('Cannot parse YAML\n', yError, e, new InputDump(data));

		ret = null;
	}

	return ret;
};

/**
 * Parse data as XML.
 *
 * Logs bad input in case of errors and returns null instead.
 *
 * @param  {string}      data
 * @return {XMLDocument}
 */
Foxtrick.parseXML = function(data) {
	const HTTP_ERROR = 503;
	var errCode = null;

	/**
	 * @param  {string}      text
	 * @return {XMLDocument}
	 */
	var parseXML = function(text) {
		/** @type {XMLDocument} */
		var xml = null;

		try {
			var parser = new window.DOMParser();
			xml = parser.parseFromString(text, 'text/xml');
		}
		catch (e) {
			// invalid XML
			Foxtrick.log('Cannot parse XML:', e, text);
		}

		return xml;
	};

	if (/!DOCTYPE html/.test(data)) {
		// e.g login page was returned
		// i. e, CHPP server not reachable

		var titleRe = /<title>(\d+)/i;
		if (titleRe.test(data))
			[errCode] = data.match(titleRe).slice(1);
		else
			errCode = HTTP_ERROR;

		Foxtrick.log('safeXML got an html page. Server could be down.',
		             'Assumed errCode:', errCode);

		return null;
	}

	return parseXML(data);
};

/**
 * Pre-process a URL to insert variables
 *
 * @param  {string} url
 * @return {string}
 */
Foxtrick.parseURL = function(url) {
	let pUrl = url.replace(/\/res\/%d\//, function() {
		// get a timestamp in the form 150324, i. e. $(date +'%y%m%d')
		// use HT date or -1 so as not to mess up due to wrong system time (in the future)
		// -1 refers to 691231 which was tagged for default cases
		let time = parseInt(Foxtrick.Prefs.getString('lastTime'), 10) || -1;
		let date = new Date(time).toISOString().slice(2, 10).replace(/\D/g, '');
		return `/res/${date}/`;
	});

	return pUrl;
};


/**
 * Fetch a url.
 *
 * Returns a Promise that fulfills with a string on success
 * or rejects with {url, status, text, params}.
 *
 * optional params can only be a urlEncoded param string
 * since only JSON-ifiable objects can be passed from content
 *
 * even if Fetch/XHR supports {document|BodyInit}
 *
 * using params switches to POST.
 *
 * @param  {string}          url
 * @param  {string}          [params]
 * @return {Promise<string|FetchError>}
 */
Foxtrick.fetch = function(url, params) {
	const ERROR_XHR_FATAL = 'FATAL error in XHR:';

	let pUrl = Foxtrick.parseURL(url);

	if (Foxtrick.context == 'content') {

		return new Promise(function(fulfill, reject) {
			let req = { req: 'fetch', url: pUrl, params };
			Foxtrick.SB.ext.sendRequest(req, (response) => {
				if (typeof response === 'string') {
					fulfill(response);
				}
				else {
					Foxtrick.log('XHR failed:', response);
					reject(response);
				}
			});
		});

	}

	return new Promise(function(fulfill, reject) {
		const HTTP_OK = 200, HTTP_REDIR = 300;
		try {
			let type = params ? 'POST' : 'GET';

			/** @type {XMLHttpRequest} */
			// @ts-ignore
			let req = new window.XMLHttpRequest();
			req.open(type, pUrl, true);

			if (typeof req.overrideMimeType === 'function')
				req.overrideMimeType('text/plain');

			// Send the proper header information along with the request
			if (type == 'POST' && typeof req.setRequestHeader === 'function')
				req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

			req.onload = function() {
				// README: safari returns chrome resources with status=0
				if (this.status >= HTTP_OK && this.status < HTTP_REDIR ||
				    this.status === 0 && this.responseText) {

					fulfill(this.responseText);
					return;
				}

				/** @type {FetchError} */
				let error = { url: pUrl, status: this.status, text: this.responseText, params };

				// eslint-disable-next-line prefer-promise-reject-errors
				reject(error);
			};

			req.onerror = function() {
				/** @type {FetchError} */
				let error = { url: pUrl, status: this.status, text: this.responseText, params };

				// eslint-disable-next-line prefer-promise-reject-errors
				reject(error);
			};

			req.onabort = function() {
				/** @type {FetchError} */
				let error = { url: pUrl, status: -1, text: this.responseText, params };

				// eslint-disable-next-line prefer-promise-reject-errors
				reject(error);
			};

			req.send(params);

		}
		catch (e) {
			// handle fatal errors here
			Foxtrick.log(ERROR_XHR_FATAL, e);

			/** @type {FetchError} */
			let error = { url: pUrl, status: -1, text: ERROR_XHR_FATAL + e.message, params };

			// eslint-disable-next-line prefer-promise-reject-errors
			reject(error);
		}
	});

};

/**
 * Load a url via cache, if possible
 *
 * Returns a Promise that fulfills with a string on success
 * or rejects with {url, status, text, params}.
 *
 * params is optional, switch to POST.
 *
 * @param  {string}          url
 * @param  {object}          [params]
 * @param  {number|string}   [lifeTime]
 * @param  {number}          [now]
 * @return {Promise<string|FetchError>}
 */
Foxtrick.load = function(url, params, lifeTime, now) {
	let pUrl = Foxtrick.parseURL(url);

	if (Foxtrick.context == 'content') {
		return new Promise(function(fulfill, reject) {

			var HT_TIME = Foxtrick.modules.Core.HT_TIME;
			if (!HT_TIME) {
				// No HT_TIME yet. We have been too quick
				// Lets put us 1 day in the future
				Foxtrick.log('no HT_TIME yet');
				HT_TIME = Date.now() + Foxtrick.util.time.MSECS_IN_DAY;
			}

			let req = {
				req: 'load',
				url: pUrl,
				params,
				lifeTime,
				now: HT_TIME,
			};

			Foxtrick.SB.ext.sendRequest(req, function(response) {
				if (typeof response === 'string') {
					fulfill(response);
				}
				else {
					Foxtrick.log('load failed:', response);
					reject(response);
				}
			});
		});
	}

	let obj = Foxtrick.cache.getFor(pUrl, params, lifeTime, now);
	if (obj && 'promise' in obj)
		return obj.promise;

	Foxtrick.log('Promise cache replied:', obj, 'Fetching from', pUrl);

	let pString;
	if (typeof params == 'string')
		pString = params;
	else
		pString = JSON.stringify(params);

	let promise = Foxtrick.fetch(pUrl, pString);
	Foxtrick.cache.setFor(pUrl, params, lifeTime)(promise);

	return promise;
};

/**
 * @typedef FetchError
 * @prop {number} status
 * @prop {string} text
 * @prop {string} [url]
 * @prop {string} [params]
 */

// ----------------------- internal helpers ------------------------
Foxtrick.cache = (function() {

	if (Foxtrick.context === 'background') {

		/**
		 * Promise cache
		 *
		 * Stores cache objects {promise: Promise, lifeTime}
		 * @type {Map<string, FTCacheObject>}
		 */
		const CACHE_OBJECTS = new Map();

		/**
		 * Generate an ID to index cache objects by
		 *
		 * @param  {string} url
		 * @param  {object} [params]
		 * @return {string}
		 */
		var genId = function(url, params) {
			let id = url;
			if (params)
				id += ';' + JSON.stringify(params);

			return id;
		};

		/**
		 * Get a cache object for {url, params}
		 *
		 * @param  {string}        url
		 * @param  {object}        [params]
		 * @return {FTCacheObject}
		 */
		var get = function(url, params) {
			let id = genId(url, params);

			let obj = CACHE_OBJECTS.get(id);
			if (!obj) {
				// no cache
				return null;
			}

			return obj;
		};

		/**
		 * Save a Promise cache object for {url, params}.
		 *
		 * obj should be {promise: Promise, lifeTime}.
		 *
		 * @param  {string}        url
		 * @param  {object}        [params]
		 * @param  {FTCacheObject} obj
		 */
		var set = function(url, params, obj) {
			let id = genId(url, params);
			CACHE_OBJECTS.set(id, obj);

			if (obj && obj.promise) {
				obj.promise.catch(() => {
					// bad promise: remove cache object
					if (CACHE_OBJECTS.get(id) === obj)
						CACHE_OBJECTS.delete(id);
				});
			}
		};

		return {

			/**
			 * Get a Promise cache object for {url, params}.
			 *
			 * cache object is {promise, lifeTime}.
			 *
			 * returns null if cache failed
			 * or {stale, now: string} if cache lifeTime is over.
			 *
			 * aLifeTime is an optional timestamp to decrease cache lifeTime.
			 * now is also optional and defaults to Date.now().
			 *
			 * @param  {string}        url
			 * @param  {object}        [params]
			 * @param  {number|string} [aLifeTime]
			 * @param  {number}        [now]
			 * @return {FTCacheObject|FTCacheMiss}
			 */
			getFor: function(url, params, aLifeTime, now) {

				let obj = get(url, params);
				if (!obj)
					return null;

				let date = now ? new Date(now) : new Date();

				/** @type {string|Date} */
				let cache = 'session';

				// deal with Promise lifeTime
				if (typeof obj.lifeTime === 'number') {
					cache = new Date(obj.lifeTime);
					if (cache < date) {
						// stale cache

						this.delete(url, params);

						return { stale: cache.toString(), now: date.toString() };
					}
				}
				else if (obj.lifeTime) {
					// string?
					cache = obj.lifeTime;
				}

				if (typeof aLifeTime === 'number' &&
				    (typeof cache !== 'object' || cache.getTime() > aLifeTime)) {
					// obj.lifeTime was not a number but aLifeTime is
					// or aLifeTime is sooner than obj.lifeTime

					// update for logging
					cache = new Date(aLifeTime);
					if (cache < date) {
						// stale get

						this.delete(url, params);

						return { stale: cache.toString(), now: date.toString() };
					}

					Foxtrick.log('New lifeTime for cached', url, params, aLifeTime);

					// set new lifeTime
					this.setFor(url, params, aLifeTime)(obj.promise);
				}

				Foxtrick.log('Using cache for:', url, 'until', cache.toString(),
				             'now:', date.toString());

				return obj;

			},

			/**
			 * Save a promise in promise cache with specified properties
			 *
			 * Returns {function(Promise)} to give the promise to.
			 *
			 * lifeTime is an optional timestamp.
			 *
			 * @param  {string}        url
			 * @param  {object}        [params]
			 * @param  {number|string} [lifeTime]
			 * @return {function(Promise<string|FetchError>):void}
			 */
			setFor: function(url, params, lifeTime) {
				return (pr) => {
					// promisify
					let promise = Promise.resolve(pr);

					/** @type {FTCacheObject} */
					let cacheObj = { promise };

					if (lifeTime)
						cacheObj.lifeTime = lifeTime;

					set(url, params, cacheObj);
				};
			},

			/**
			 * Delete a cached promise if any
			 *
			 * @param  {string} url
			 * @param  {object} [params]
			 */
			delete: function(url, params) {
				set(url, params, null);
			},

			/**
			 * Clear promise cache
			 */
			clear: function() {
				CACHE_OBJECTS.clear();
			},
		};

	}

	// TODO add distinct types behind type guard (arch context)
	return {
		clear: function() {
			Foxtrick.SB.ext.sendRequest({ req: 'cacheClear' });
		},
	};

})();


// --------------------- old implementation -------------------------
if (!Foxtrick.util)
	Foxtrick.util = {};

Foxtrick.util.load = {};

/**
 * Load an internal URL synchronously
 *
 * TODO: consider going full async
 *
 * @param  {string} url
 * @return {string}
 */
Foxtrick.util.load.sync = function(url) {
	if (url.replace(/^\s+/, '').indexOf(Foxtrick.InternalPath) !== 0) {
		Foxtrick.log('loadSync only for internal resources.', url, "isn't , only",
		             Foxtrick.InternalPath, 'is');

		return null;
	}

	// load
	let req = new window.XMLHttpRequest();

	req.open('GET', url, false); // sync load of a chrome resource

	if (typeof req.overrideMimeType === 'function')
		req.overrideMimeType('text/plain');

	try {
		req.send(null);

		return req.responseText;
	}
	catch (e) {
		// catch non-existing
		Foxtrick.log('loadSync: cannot find or load:', url);

		return null;
	}
};

/**
 * Load an external URL asynchronously.
 *
 * params is any data to POST.
 *
 * @deprecated use load() instead
 *
 * @param  {string} url
 * @param  {function(string, number):void} callback
 * @param  {string} [params]
 */
Foxtrick.util.load.async = function(url, callback, params) {

	const HTTP_OK = 200;

	Foxtrick.load(url, params).then((text) => {
		callback(/** @type {string} */ (text), HTTP_OK);
	}, (/** @type {FetchError} */ resp) => {
		callback(resp.text, resp.status);
	}).catch((e) => {
		Foxtrick.log('Uncaught callback error: - url:', url, 'params:', params, e);
	});

};

/**
 * Load an external URL asynchronously (without cache)
 *
 * params is any data to POST.
 *
 * @deprecated use fetch() instead
 *
 * @param  {string} url
 * @param  {function(string, number):void} callback
 * @param  {string} [params]
 */
Foxtrick.util.load.fetch = function(url, callback, params) {
	const HTTP_OK = 200;
	Foxtrick.fetch(url, params).then((text) => {
		if (typeof text != 'string')
			return;

		callback(text, HTTP_OK);
	}, (/** @type {FetchError} */ resp) => {
		callback(resp.text, resp.status);
	}).catch((e) => {
		Foxtrick.log('Uncaught callback error: - url:', url, 'params:', params, e);
	});

};

/**
 * Load an external URL asynchronously and parse XML content.
 *
 * @deprecated use Promises
 *
 * @param  {string} url
 * @param  {function(XMLDocument, number):void} callback
 */
Foxtrick.util.load.xml = function(url, callback) {

	const HTTP_OK = 200, HTTP_ERROR = 503;

	// README: no promise cache
	Foxtrick.util.load.fetch(url, (text, status) => {
		let xml = Foxtrick.parseXML(text);
		let st = status;

		if (xml == null && st == HTTP_OK)
			st = HTTP_ERROR;

		callback(xml, st);
	});
};


// FIXME: rewrite file pickers into a new async pattern

/**
 * html5 filepicker for dataUrl. eg pictures and sounds
 *
 * @param  {document}             doc
 * @param  {function(string):any} callback
 * @return {HTMLInputElement}
 */
Foxtrick.util.load.filePickerForDataUrl = function(doc, callback) {
	var input = doc.createElement('input');
	input.type = 'file';

	input.addEventListener('change', function(ev) {
		// eslint-disable-next-line no-invalid-this
		var win = this.ownerDocument.defaultView, file = this.files[0];

		/** @type {FileReader} */
		var reader;

		// @ts-ignore
		reader = new win.FileReader();

		reader.onerror = function(e) {
			win.alert('Error code: ' + e.target.error.code);
			callback(null);
		};

		reader.onload = function(e) {
			var dataUrl = /** @type {string} */ (e.target.result);

			// eslint-disable-next-line no-magic-numbers
			if (dataUrl.length > 164000) {
				win.alert('File too large. Limit: 164kB');
				dataUrl = null;
			}

			callback(dataUrl);
		};

		reader.readAsDataURL(file);

	}, false);

	return input;
};

/**
 * html5 filepicker for text
 *
 * @param  {document}             doc
 * @param  {function(string):any} callback
 * @return {HTMLInputElement}
 */
Foxtrick.util.load.filePickerForText = function(doc, callback) {
	var input = doc.createElement('input');
	input.type = 'file';

	Foxtrick.listen(input, 'change', function(ev) {
		// eslint-disable-next-line no-invalid-this
		var win = this.ownerDocument.defaultView, file = this.files[0];

		/** @type {FileReader} */
		var reader;

		// @ts-ignore
		reader = new win.FileReader();

		reader.onerror = function(e) {
			win.alert('Error code: ' + e.target.error.code);
			callback(null);
		};

		reader.onload = function(e) {
			var text = /** @type {string} */ (e.target.result);

			// eslint-disable-next-line no-magic-numbers
			if (text.length > 64000) {
				win.alert('File too large. Limit: 64kB');
				text = null;
			}

			callback(text);
		};

		reader.readAsText(file);

	}, false);

	return input;
};

/**
 * @typedef FTCacheObject
 * @prop {Promise<string|FetchError>} promise
 * @prop {number|string}   [lifeTime]
 */

/**
 * @typedef FTCacheMiss
 * @prop {string} stale
 * @prop {string} now
 */
