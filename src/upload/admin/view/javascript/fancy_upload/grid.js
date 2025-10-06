'use strict';

let _evtSubscribers 		= {};

let _containerSelector 		= '';
let _sortableSelector 		= '';
let _placeholder 			= '';

let _images 				= [];
let _image_row 				= 0;
let _language 				= {};

let _formData 				= 0;

let _product_id 			= 0;

let _$container				= null;
let _$grid					= null;
let _$sortable				= null;

let _altKey					= false;
let _stickyObserver			= null;

const _stop = (e) => {
	e.preventDefault();
	e.stopPropagation();
};
/**
 * INIT GRID
 */
const _generateGrid = (images) => {

	let html = `
	<div class="fu-overlay"><div class="dotted-border"><div class="overlay-text"><i class="fa fa-image fa-img"></i>Drop files here</div></div></div>
	<div class="fu-container">
		<div class="fu-panel sticky-header">
			<div class="left">
				<div class="controls">
					<button class="btn btn-sm btn-default" data-action="select-all">${_language.button_select_all}</button>
					<button class="btn btn-sm btn-default" data-action="unselect-all" disabled>${_language.button_unselect_all}</button>
					&nbsp;&nbsp;
					<button class="btn btn-sm btn-danger" 
					data-toggle="tooltip" data-bs-toggle="tooltip" title="${_language.button_delete}" 
					data-action="delete" disabled><i class="fa fa-trash"></i></button>
					<button class="btn btn-sm btn-warning" 
					data-toggle="tooltip" data-bs-toggle="tooltip" title="${_language.button_remove}" 
					data-action="remove" disabled><i class="fa fa-remove"></i></button>
					&nbsp;&nbsp;
					<button class="btn btn-sm btn-default" 
					data-toggle="tooltip" data-bs-toggle="tooltip" title="${_language.button_rotate_left}" 
					data-action="rotate-left" disabled><i class="fa fa-rotate-left"></i></button>
					<button class="btn btn-sm btn-default" 
					data-toggle="tooltip" data-bs-toggle="tooltip" title="${_language.button_rotate_right}" 
					data-action="rotate-right" disabled><i class="fa fa-rotate-right"></i></button>
					&nbsp;&nbsp;
					<button class="btn btn-sm btn-success" 
					data-toggle="tooltip" data-bs-toggle="tooltip" title="${_language.button_reload}" 
					data-action="reload"><i class="fa fa-refresh"></i></button>
					&nbsp;&nbsp;
					<button class="btn btn-sm btn-default" 
					data-toggle="tooltip" data-bs-toggle="tooltip" title="${_language.button_move}" 
					data-action="move_external"><i class="fa fa-files-o"></i></button>
					&nbsp;&nbsp;
					<button class="btn btn-sm btn-primary" 
					data-toggle="tooltip" data-bs-toggle="tooltip" title="${_language.button_upload}" 
					data-action="upload"><i class="fa fa-upload"></i></button>
				</div>
			</div>
			<div class="right">
				<button class="btn btn-sm btn-primary" 
				data-toggle="tooltip" data-bs-toggle="tooltip" title="${_language.button_settings}" 
				data-action="settings"><i class="fa fa-cog"></i></button>
			</div>
		</div>
		<div class="fu-message"></div>
		<div class="fu-grid fu-use-hover">
	`;

	// _image_row = 0;
	// _images.forEach((value, index) => { 
	// 	html += _generateGridItem(value['thumb_100'], value['image'], _image_row);
	// 	_image_row++;
	// });
	
	html +=	`
			<div class="image-wrapper sort-excluded">
				<div class="image">
					<div class="button_add_image t_100">
						<div class="plus_icon" draggable="false"><i class="fa fa-plus"></i></div>
					</div>
				</div>
			</div>
		</div>
	</div>
	`;
	return html;    
};
const _generateGridItem = (thumb, image, image_row) => {
	let noCache = '?' + new Date().getTime();
	let basename = image.split('/').reverse()[0];
	return `
	<div class="image-wrapper fu-sortable">
		<div class="image">
			<div class="fu-action-bar image-header t_100">
				<a href="#" data-action="delete" draggable="false"><i class="fa fa-trash-o"></i></a>
				<a href="#" data-action="remove" draggable="false"><i class="fa fa-remove"></i></a>
			</div>
			<img class="" id="thumb_${image_row}" alt="" title="" 
				src="${_placeholder}" 
				data-src="${thumb}${noCache}" 
				data-image="${image}" 
				loading="lazy" 
			/>
			<div class="fu-filename t_500"><span>${basename}</span></div>
			<div class="fu-action-bar image-footer t_100">
				<a href="#" data-action="rotate-left" draggable="false"><i class="fa fa-rotate-left"></i></a>
				<a href="#" data-action="rotate-right" draggable="false"><i class="fa fa-rotate-right"></i></a>
			</div>
		</div>
	</div>`;	
};

const _updateFormData = () => {
	
	_formData = new FormData();
	let orderIndex = 0;

	let items = _$container.querySelectorAll('img[data-image]');
	items.forEach((value, index) => { 
		let image = value.getAttribute('data-image');
		
		_formData.append('product_image[' + orderIndex + '][image]', image);
		_formData.append('product_image[' + orderIndex + '][sort_order]', orderIndex);
		
		orderIndex++;
	});

	_dispatchEvent('formdata.change', _formData);
	
	return _formData;
};
const _updateGrid = () => {
	
	let allItems = _getAllGridItems();
	
	allItems.forEach((value, index) => {
		_undelegateGridItemEvents(value);
		value.ref.remove();
	});
	
	_images.forEach((value, index) => { 
		_addImageItem(value['thumb_100'], value['image'], _image_row);
		_image_row++;
	});

};
const _addImageItem = (thumb, image) => {

	let html = _generateGridItem(thumb, image, _image_row);
	_image_row++;
	
	_$container.querySelector('.image-wrapper.sort-excluded').insertAdjacentHTML('beforebegin', html);
	
	_updateFormData();
	
	let sortableItems = _$container.querySelectorAll('.image-wrapper.fu-sortable');
	let lastItem = _structGridItem(sortableItems[sortableItems.length-1]);

	lastItem.img.setAttribute('src', lastItem.img.dataset.src);
	
	_delegateGridItemEvents(lastItem);

	return lastItem;
};
const _removeImages = ({e, tmp}) => {
	_dispatchEvent('panel.images.remove', {e, tmp});
	tmp.forEach((gridItem) => {
		if (!_$grid.querySelectorAll('.image-wrapper:nth-child(1):nth-last-child(2)').length) {
			gridItem.ref.remove();
		} else {
			gridItem.img.dataset.image = '';
			gridItem.img.setAttribute('src', _placeholder);
		}
	});
	_updateFormData();
};
const _deleteImages = ({e, tmp}) => {
	_dispatchEvent('panel.images.delete', {e, tmp});

	tmp.forEach((gridItem) => {
		if (!_$grid.querySelectorAll('.image-wrapper:nth-child(1):nth-last-child(2)').length) {
			gridItem.ref.remove();
			let similar = _getGridItemByImage(gridItem.image);
			similar.forEach((value, index) => {
				value.ref.remove();
			});
		} else {
			gridItem.img.dataset.image = '';
			gridItem.img.setAttribute('src', _placeholder);
		}
	});
	_updateFormData();
};
const _rotateImages = function ($wrapper) {
	_dispatchEvent('panel.images.rotate', $wrapper);
	_updateFormData();
};
const _reloadImages = function (e) {
	_dispatchEvent('panel.images.reload', e);
	_updateFormData();
};
const _toggleActionBarButtons = () => {
	let count = _$container.querySelectorAll('.fu-grid .image-wrapper.fu-selected').length;
	let total = _$container.querySelectorAll('.fu-grid .image-wrapper.fu-sortable').length;

	_$container.querySelectorAll('.fu-panel button[data-action=select-all]').forEach((value, index) => {
		if ((count == total)) {
			value.setAttribute('disabled', 'disabled');
		} else {
			value.removeAttribute('disabled');
		}
	});
	_$container.querySelectorAll('.fu-panel button[data-action=unselect-all]').forEach((value, index) => {
		if ((count == 0)) {
			value.setAttribute('disabled', 'disabled');
		} else {
			value.removeAttribute('disabled');
		}
	});
	_$container.querySelectorAll('.fu-panel button[data-action=delete],button[data-action=remove],button[data-action=rotate-left],button[data-action=rotate-right]').forEach((value, index) => {
		if ((count == 0)) {
			value.setAttribute('disabled', 'disabled');
		} else {
			value.removeAttribute('disabled');
		}
	});
};
const _gridItemAddHover = function (e) {
	e.target.classList.add('hover');
};
const _gridItemRemoveHover = function (e) {
	e.target.classList.remove('hover');
};
const _gridItemRemoveAllHover = function (e) {
	_$grid.querySelectorAll('.image.hover').forEach((value, indx) => {
		value.classList.remove('hover');
	});
};
const _gridImageClick = function (e) {
	if (!e.ctrlKey) {
		_dispatchEvent('grid.image.click', e);
	}
};
const _gridAddImageClick = function (e) {
	_stop(e);
	if (e.ctrlKey) {
		return;
	}
	_dispatchEvent('grid.addImage.click', e);
};
const _gridActionBarClick = function (e) {
	_stop(e);

	let tmp = [];
	let action = this.getAttribute('data-action');
	let img_ref = this.closest('.image-wrapper');

	_dispatchEvent('grid.actionBar.click', {e, action});
	
	switch (action) {
		case 'remove':
			tmp.push(_structGridItem(img_ref));
			_removeImages({e, tmp});
			break;
		case 'delete':
			tmp.push(_structGridItem(img_ref));
			_deleteImages({e, tmp});
			break;
		case 'rotate-right':
		case 'rotate-left':
			tmp.push(_structGridItem(img_ref));
			_rotateImages({e, tmp, action});
	}
};
const _keyDown = (e) => {
	if (e.altKey) {
		_stop(e);
		if (_altKey !== e.altKey) {
			_altKey = true;
			_addGridAltKeyClass(e);	
		}
	}
};
const _keyUp = (e) => {
	if (e.key == 'Alt') {
		_altKey = false;
	}
	_removeGridAltKeyClass(e);
};

const _addGridAltKeyClass = (e) => {
	_$grid.classList.add('alt-key');
};
const _removeGridAltKeyClass = (e) => {
	_$grid.classList.remove('alt-key');
};
const _gridImageBaseName = (e) => {
	let gridItem = _structGridItem(e.target.closest('.image-wrapper'));
	gridItem.filename_ref.innerText = gridItem.image.split('/').reverse()[0];
};
const _delegateGridItemEvents = (item) => {
	let imageWrapper = item.ref.querySelector('.image');
	
	imageWrapper.addEventListener('mouseenter', _gridItemAddHover);
	imageWrapper.addEventListener('dragstart', _gridItemRemoveHover);
	imageWrapper.addEventListener('mouseleave', _gridItemRemoveHover);
	imageWrapper.addEventListener('dragover', _gridItemRemoveAllHover);
	imageWrapper.querySelectorAll('.fu-action-bar a').forEach((value, index) => {
		value.addEventListener('click', _gridActionBarClick);
	});
	item.ref.addEventListener('click', _gridImageClick);
	item.img.addEventListener('load', _gridImageBaseName);
};
const _undelegateGridItemEvents = (item) => {
	let imageWrapper = item.ref.querySelector('.image');

	imageWrapper.removeEventListener('mouseenter', _gridItemAddHover);
	imageWrapper.removeEventListener('dragstart', _gridItemRemoveHover);
	imageWrapper.removeEventListener('mouseleave', _gridItemRemoveHover);
	imageWrapper.removeEventListener('dragover', _gridItemRemoveAllHover);
	imageWrapper.querySelectorAll('.fu-action-bar a').forEach((value, index) => {
		value.removeEventListener('click', _gridActionBarClick);
	});
	item.ref.removeEventListener('click', _gridImageClick);
	item.img.removeEventListener('load', _gridImageBaseName);
};
const _delegateGridEvents = () => {
	_$grid.querySelectorAll('.image-wrapper.sort-excluded').forEach((value, index) => {
		let addBtnWrapper = value.querySelector('.image');
		
		addBtnWrapper.addEventListener('mouseenter', _gridItemAddHover);
		addBtnWrapper.addEventListener('dragstart', _gridItemRemoveHover);
		addBtnWrapper.addEventListener('mouseleave', _gridItemRemoveHover);
		addBtnWrapper.addEventListener('dragover', _gridItemRemoveAllHover);
		
		value.addEventListener('click', _gridAddImageClick);
	});
	document.body.addEventListener('keydown', _keyDown);
	document.body.addEventListener('keyup', _keyUp);
	window.addEventListener('focus', _keyUp);
};
const _undelegateGridEvents = () => {
	if (_$grid !== null) {
		_$grid.querySelectorAll('.image-wrapper.sort-excluded').forEach((value, index) => {
			let addBtnWrapper = value.querySelector('.image');
		
			addBtnWrapper.removeEventListener('mouseenter', _gridItemAddHover);
			addBtnWrapper.removeEventListener('dragstart', _gridItemRemoveHover);
			addBtnWrapper.removeEventListener('mouseleave', _gridItemRemoveHover);
			addBtnWrapper.removeEventListener('dragover', _gridItemRemoveAllHover);
			
			value.removeEventListener('click', _gridAddImageClick);
		});
	}
	document.body.removeEventListener('keydown', _keyDown);
	document.body.removeEventListener('keyup', _keyUp);
	window.removeEventListener('focus', _keyUp);
};

const _dispatchEvent = (eventName, payload) => {
	if(_evtSubscribers.hasOwnProperty(eventName)){
		_evtSubscribers[eventName].forEach((eventHandler) => {
			eventHandler(payload);
		});
	}

	return true;
};
const _structGridItem = (value) => {
	let img = value.querySelector('img[data-image]');
	return {
		ref: value,
		img: img,
		filename_ref: value.querySelector('.fu-filename > span'),
		image: img.getAttribute('data-image'),
		src: img.getAttribute('src')
	};
};
const _getFirstImageItem = () => {
	return _structGridItem(_$grid.querySelector('.image-wrapper:first-child'));
};
const _getAllGridItems = () => {
	let tmp = [];
	_$grid.querySelectorAll('.image-wrapper.fu-sortable').forEach((value, index) => { 
		tmp.push(_structGridItem(value));
	});
	return tmp;
};
const _getSelectedGridItems = () => {
	let tmp = [];
	_$grid.querySelectorAll('.image-wrapper.fu-sortable.fu-selected').forEach((value, index) => { 
		tmp.push(_structGridItem(value));
	});
	return tmp;
};
const _getGridItemByImage = (image) => {
	let items = _getAllGridItems();
	return items.filter(v => v.image && v.image == image);
};
const _panelClick = function (e) {
	_stop(e);
	_dispatchEvent('panel.tooltip.hide', this);

	let tmp;
	let action = this.getAttribute('data-action');

	if (action == 'select-all') {
		tmp = _getAllGridItems();
		tmp.forEach((value, index) => {
			Sortable.utils.select(value.ref);
		});
	}

	if (action == 'unselect-all') {
		tmp = _getAllGridItems();
		tmp.forEach((value, index) => { 
			Sortable.utils.deselect(value.ref);
		});
	}

	if (action == 'delete') {
		tmp = _getSelectedGridItems();
		_deleteImages({e, tmp});
	}

	if (action == 'remove') {
		tmp = _getSelectedGridItems();
		_removeImages({e, tmp});
	}

	if (action == 'rotate-left' || action == 'rotate-right') {
		tmp = _getSelectedGridItems();
		_rotateImages({e, tmp, action});
	}

	if (action == 'reload') {
		_reloadImages(e);
	}

	if (action == 'settings') {
		window.open(_language.settings_link.replace(/&amp;/g, '&'));
	}

	if (action == 'upload') {
		_dispatchEvent('panel.images.upload', e);
	}

	if (action == 'move_external') {
		_dispatchEvent('panel.images.move_external', e);
	}
	
	_toggleActionBarButtons(e);
};
const _delegatePanelEvents = function () {
	_$container.querySelectorAll('.fu-panel button[data-action]').forEach((value, index) => {
		value.addEventListener('click', _panelClick);
	});
	'pointerup mouseup touchend'.split(' ').forEach(function (eventName) {
		_$container.querySelectorAll('.fu-panel button[data-action]').forEach((value, index) => {
			value.addEventListener(eventName, _stop);
		});
	});
	_dispatchEvent('panel.tooltip.create', _$container.querySelectorAll('.fu-panel button[data-action]'));
};
const _undelegatePanelEvents = function () {
	if (_$container !== null) {
		_$container.querySelectorAll('.fu-panel button[data-action]').forEach((value, index) => {
			value.removeEventListener('click', _panelClick);
		});
		'pointerup mouseup touchend'.split(' ').forEach(function (eventName) {
			_$container.querySelectorAll('.fu-panel button[data-action]').forEach((value, index) => {
				value.removeEventListener(eventName, _stop);
			});
		});
		_dispatchEvent('panel.tooltip.destroy', _$container.querySelectorAll('.fu-panel button[data-action]'));
	}
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
const _delegateDragAndDropEvents = function () {
	'deagmove dragenter dragover'.split(' ').forEach(function (eventName) {
		document.querySelector(_containerSelector).addEventListener(eventName, _containerDrag);
	});
	
	let fancyOverlay = document.querySelector(_containerSelector + ' .fu-overlay'); 
	if (fancyOverlay !== null) {
		document.querySelector(_containerSelector + ' .fu-overlay').addEventListener('dragleave', _containerDragLeave);
		document.querySelector(_containerSelector + ' .fu-overlay').addEventListener('drop', _containerDrop);
	}
};
const _undelegateDragAndDropEvents = function () {
	'deagmove dragenter dragover'.split(' ').forEach(function (eventName) {
		document.querySelector(_containerSelector).removeEventListener(eventName, _containerDrag);
	});
	
	let fancyOverlay = document.querySelector(_containerSelector + ' .fu-overlay'); 
	if (fancyOverlay !== null) {
		document.querySelector(_containerSelector + ' .fu-overlay').removeEventListener('dragleave', _containerDragLeave);
		document.querySelector(_containerSelector + ' .fu-overlay').removeEventListener('drop', _containerDrop);
	}
};
const _containerDrag = (e) => {
	_stop(e);
	if (e.dataTransfer.types[0] == 'Files') {
		document.querySelector('body').classList.add('dragging');
	} else {
		return true;
	}
};
const _containerDragLeave = (e) => {
	_stop(e);
	if (e.dataTransfer.types[0] == 'Files' && e.target.closest(_containerSelector) !== null) {
		document.querySelector('body').classList.remove('dragging');
	} else {
		return true;
	}
};
const _containerDrop = (e) => {
	_stop(e);
	if (e.dataTransfer.types[0] == 'Files') {
		document.querySelector('body').classList.remove('dragging');
		
		let formData = new FormData();
		formData.append('product_id', _product_id);

		_dispatchEvent('grid.container.drop', {e, formData});
	}
};
const _showMessage = (message, className) => {
	let messageArea = _$container.querySelector('.fu-message');

	messageArea.className = 'fu-message';
	messageArea.classList.add(className);
	messageArea.textContent = message;
};

const _hideMessage = () => {
	let messageArea = _$container.querySelector('.fu-message');

	messageArea.className = 'fu-message';
	messageArea.textContent = '';
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
	_containerSelector = options.containerSelector || '.modal-body';
	_sortableSelector = options.sortableSelector || '.fu-grid';
	_placeholder = options.placeholder || 'no_image.png';
	
	_language.settings_link = options.settings_link || '#';

	_language.button_select_all = options.button_select_all || 'Select all';
	_language.button_unselect_all = options.button_unselect_all || 'Unselect all';
	_language.button_delete = options.button_delete || 'Delete';
	_language.button_remove = options.button_remove || 'Remove';
	_language.button_rotate_left = options.button_rotate_left || 'Rotate left';
	_language.button_rotate_right = options.button_rotate_right || 'Rotate right';
	_language.button_reload = options.button_reload || 'Reload';
	_language.button_move = options.button_move || 'Move external';
	_language.button_upload = options.button_upload || 'Upload';
	_language.button_settings = options.button_settings || 'Settings';
};


export const fancyGrid = {
	init: (options) => {
		_setOptions(options);
	},
	removeGrid: () => {
		_undelegateGridEvents();
		_undelegateDragAndDropEvents();
		_undelegatePanelEvents();
	},
	initGrid: (options) => {
		_undelegateGridEvents();
		_undelegateDragAndDropEvents();
		_undelegatePanelEvents();

		_$container = document.querySelector(_containerSelector);

		let grid = _generateGrid(_images);
		_$container.innerHTML = grid;

		_$grid = _$container.querySelector(_sortableSelector);

		_images.forEach((value, index) => { 
			_addImageItem(value['thumb_100'], value['image'], _image_row);
			_image_row++;
		});
		
		_$sortable = new Sortable(_$grid, {
		
			multiDrag: true,
			selectedClass: 'fu-selected',
			multiDragKey: 'CTRL',
			avoidImplicitDeselect: false,
			fallbackTolerance: 3,
			
			fallbackOnBody: true,

			swapThreshold: 1,
			draggable: '.fu-sortable',
			animation: 150,
			handle: 'img',
			ghostClass: 'fu-ghost',

			onStart: function (e) {
				document.body.classList.add('fu-drag');
				this.el.classList.remove('fu-use-hover');
			},
			onEnd: function (e) {
				this.el.classList.add('fu-use-hover');
				document.body.classList.remove('fu-drag');
				
				let mouseOverEvent = new Event('mouseover');
				e.item.closest('.image-wrapper').querySelector('.image').dispatchEvent(mouseOverEvent);
	
				_updateFormData();

				_dispatchEvent('grid.sort', e);
			},
			onSelect: _toggleActionBarButtons,
			onDeselect: _toggleActionBarButtons
		});

		_updateFormData(true);
		
		_delegateGridEvents();
		_delegatePanelEvents();
		_delegateDragAndDropEvents();

		_toggleActionBarButtons();
		
		_$grid.querySelectorAll('.image img').forEach((value, index) => {
			value.setAttribute('src', value.dataset.src);
		});
			
		_startStickyObserver(_containerSelector + ' .fu-panel.sticky-header');
	},
	getContainer: () => {
		return _$container;
	},
	getGrid: () => {
		return _$grid;
	},
	setImages: (images) => {
		_images = images;
	},
	setProductId: (product_id) => {
		_product_id = product_id;
	},
	getProductId: () => {
		return _product_id;
	},
	updateGrid: () => {
		_updateGrid();
	},
	addImageItem: (thumb, image) => {
		return _addImageItem(thumb, image);
	},
	getFirstImageItem: () => {
		return _getFirstImageItem();
	},
	getAllGridItems: () => {
		return _getAllGridItems();
	},
	getSelectedGridItems: () => {
		return _getSelectedGridItems();
	},
	getGridItemByImage: (image) => {
		return _getGridItemByImage(image);
	},
	getFormData: () => {
		return _updateFormData();
	},
	showMessage: (message, className) => {
		return _showMessage(message, className);
	},
	hideMessage: (message, className) => {
		return _hideMessage(message, className);
	},
	subscribe: (eventName, handler) => {
		return _subscribe(eventName, handler);
	}
}