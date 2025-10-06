'use strict';

let _evtSubscribers 	= {};

let _apiPath 			= '';
let _methodSeparator 	= '';
let _tokenKey 			= '';
let _token 				= '';

const _error = (e) => {
	_dispatchEvent('api.error', e);
};
const _getApiPath = (method) => {
	return _apiPath + _methodSeparator + method + '&' + _tokenKey + '=' + _token;
};
const _dispatchEvent = (eventName, payload) => {
	if(_evtSubscribers.hasOwnProperty(eventName)){
		_evtSubscribers[eventName].forEach(function (eventHandler){
			eventHandler(payload);
		});
	}

	return true;
};
const _subscribe = (eventName, handler) => {
	if(typeof handler !== 'function'){
		return;
	}

	if(!_evtSubscribers.hasOwnProperty(eventName)){
		_evtSubscribers[eventName] = [];
	}

	_evtSubscribers[eventName].push(handler);

	return () => {
		_evtSubscribers[eventName] = _evtSubscribers[eventName].filter((currentHandler) => {
			return currentHandler !== handler;
		});
	}
};
const _setOptions = (options) => {
	_apiPath 			= options.apiPath || '';
	_methodSeparator 	= options.methodSeparator || '/';
	_tokenKey 			= options.tokenKey || 'token';
	_token 				= options.token || '';
};

export const fancyApi = {
	init: (options) => {
		_setOptions(options);
	},
	post: async (method, formData) => {
		try {
			const response = await fetch(_getApiPath(method), {
				method: 'POST',
				body: formData
			});

			if (!response?.ok) {
				throw `Error! ${response.status}: ${response.statusText}`;
			}

			if (response.body == null) {
				throw `Error! ${response.status}: Empty response`;
			}

			return response.json();				
		} catch (error) {
			_error(error);
		}
	},
	postXhr: async (method, formData, callback) => {
		try {

			let xhr = new XMLHttpRequest();
			xhr.open('post', _getApiPath(method), true);
			xhr.responseType = 'json';
			xhr.onload = () => {
				try {
					if (xhr.status != 200) {
						throw `Error! ${xhr.status}: ${xhr.statusText}`;
					} else {
						if (xhr.response == null) {
							throw `Error! ${xhr.status}: Empty response`;
						} else {
							callback(xhr.response);
						}
					}
				} catch (error) {
					_error(error);	
				}
			};
			xhr.onerror = _error;

			xhr.upload.addEventListener('progress', (e) => {
				if (e.lengthComputable) {
					let progress = parseInt((e.loaded / e.total) * 100);
					_dispatchEvent('api.upload.progress', progress);
				}
			}, false);
			
			xhr.send(formData);
		} catch (error) {
			_error(error);
		}
	},
	subscribe: (eventName, handler) => {
		return _subscribe(eventName, handler);
	}
}