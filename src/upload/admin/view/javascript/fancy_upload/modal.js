'use strict';

let _evtSubscribers = {};

let _$modal 		= {};
let _$statusBar 	= {};
let _$message 		= null;
let _isActive 		= false;

let _title 			= '';

let _language		= {}

let _progress 		= 0;
let _fakeProgress	= null;
let _plugins		= [];

let _stickyObserver	= null;

const _dispatchEvent = (eventName, payload) => {
	if(_evtSubscribers.hasOwnProperty(eventName)){
		_evtSubscribers[eventName].forEach((eventHandler) => {
			eventHandler(payload);
		});
	}
	return true;
};
const _setProgress = (progress) => {
	if (progress > 0 && progress < 100) {
		_$modal.find('.modal-header').css('background', 'linear-gradient(90deg, transparent ' + (progress - 10) + '%, #1e91cf1f ' + progress + '%, transparent ' + (progress + 10) + '%)');
	} else {
		_$modal.find('.modal-header').removeAttr('style');
	}
};

const _startFakeProgress = () => {
	clearInterval(_fakeProgress);

	_progress = 0;
	_fakeProgress = setInterval(() => {
		_progress += 1;
		_setProgress(_progress);
		if (_progress >= 100) {
			clearInterval(_fakeProgress);
		}
	}, 5);
};

const _stopProgress = () => {
	clearInterval(_fakeProgress);
	_setProgress(99);
	setTimeout(() => {
		_setProgress(0);
	}, 50);
};

const _startStickyObserver = (selector) => {
	const element = document.querySelector(selector);
	_stickyObserver = new IntersectionObserver (
		([e]) => e.target.classList.toggle('is-pinned', e.intersectionRatio < 1), 
		{threshold:[1]}
	);
	_stickyObserver.observe(element);
};

const _stopStickyObserver = (selector) => {
	const element = document.querySelector(selector);
	_stickyObserver.unobserve(element);
};

const _subscribe = (eventName, handler) => {
	if(typeof handler !== 'function') {
		return;
	}

	if(!_evtSubscribers.hasOwnProperty(eventName)) {
		_evtSubscribers[eventName] = [];
	}

	_evtSubscribers[eventName].push(handler);

	return () => {
		_evtSubscribers[eventName] = _evtSubscribers[eventName].filter((currentHandler) => {
			return currentHandler !== handler;
		});
	}
};
const _showStatusBarMessage = (message, timeOut) => {
	_$statusBar.html(message);
	_$statusBar.removeClass('op_0');
	if (timeOut !== undefined) {
		setTimeout(() => {
			_hideStatusBarMessage();
		}, timeOut);
	}
};
const _hideStatusBarMessage = () => {
	_$statusBar.addClass('op_0');		
};
const _showMessage = (message) => {
	_$message = _$modal.find('.fu-message');
	_$message.html(message);
}
const _hideMessage = () => {
	_$message = _$modal.find('.fu-message');
	if (_$message !== null) {
		_$message.html('');
	}
}
const _setOptions = (options)  => {
	_language.button_apply = options.button_apply || 'Apply';
	_language.button_save = options.button_save || 'Save';
	_language.button_close = options.button_close || 'Close';
}

export const fancyModal = {
	init: (options) => {
		_setOptions(options);
		
		if ($('#fu-modal').length === 0) {
			
			$('body').append(`
				<div id="fu-modal" class="modal"><div class="modal-dialog modal-lg">
					<div class="modal-content">
						<div class="modal-header t_100">
							<div class="controls">
								<button type="button" class="btn btn-sm btn-default" data-action="prev"><i class="fa fa-arrow-left"></i></button>&nbsp;
								<button type="button" class="btn btn-sm btn-default" data-action="next"><i class="fa fa-arrow-right"></i></button>&nbsp;&nbsp;
								<h4 class="modal-title"></h4>
							</div>
							<button type="button" class="close" data-dismiss="modal" aria-hidden="true"><i class="fa fa-close"></i></button>
						</div>
						<div class="modal-body"></div>
						<div class="modal-footer sticky-footer stripped-footer">
							<div class="status-bar t_100"></div>
							<div class="controls">
								<button type="button" class="btn btn-sm btn-success" data-action="apply">${_language.button_apply}</button>
								<button type="button" class="btn btn-sm btn-primary" data-action="save">${_language.button_save}</button>
								<button type="button" class="btn btn-sm btn-default" data-action="close">${_language.button_close}</button>
							</div>
						</div>
					</div>
				</div>
			`);
			_$modal = $('#fu-modal');
			_$statusBar = _$modal.find('.status-bar');

			_$modal.delegate('button[data-action]', 'click', (e) => {
				let action = e.currentTarget.dataset.action;
				_dispatchEvent('modal.button.click', {e, action});
			});
			_$modal.on('show.bs.modal', (e) => {_isActive = true;	_dispatchEvent('modal.show', e)});
			_$modal.on('hide.bs.modal', (e) => {_isActive = false;	_dispatchEvent('modal.hide', e)});

			_startStickyObserver('#fu-modal .sticky-footer');
		}
		return _$modal;
	},
	show: () => {
		_$modal.modal('show');
	},
	hide: () => {
		_$modal.modal('hide');
	},
	isActive: () => {
		return _isActive;
	},
	setTitle: (title) => {
		_title = title;
		_$modal.find('.modal-title').html(_title);
	},
	getContainer: () => {
		return _$modal.find('.modal-body');
	},
	getContainerSelector: () => {
		return '#fu-modal .modal-body';
	},
	setContent: (content) => {
		_$modal.find('.modal-body').html(content);
	},
	showStatusBarMessage: (message, timeOut) => {
		_showStatusBarMessage(message, timeOut);
	},
	hideStatusBarMessage: () => {
		_hideStatusBarMessage();
	},
	showMessage: (message) => {
		_showMessage(message);
	},
	hideMessage: () => {
		_hideMessage();
	},
	setProgress: (progress) => {
		_setProgress(progress);
	},
	startFakeProgress: () => {
		_startFakeProgress();
	},
	stopProgress: () => {
		_stopProgress();
	},
	setPrevNextStatus: (status) => {
		_$modal.find('button[data-action="next"]').prop('disabled', status.next);
		_$modal.find('button[data-action="prev"]').prop('disabled', status.prev);
	},
	subscribe: (eventName, handler) => {
		return _subscribe(eventName, handler);
	}
}