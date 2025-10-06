'use strict';

let _evtSubscribers = {};

let _data = [];
let _current = -1;
let _count = 0;

let _rowSelector = '';
let _productIdSelector = '';
let _imageSelector = '';
let _productNameSelector = '';

let _progress = 0;
let _fakeProgress = null;

const _stop = (e) => {
	e.preventDefault();
	e.stopPropagation();
};
const _setProgress = (progress) => {
	if (progress > 0 && progress < 100) {
		_data[_current].ref.style.background = 'linear-gradient(90deg, transparent ' + (progress - 10) + '%, #1e91cf1f ' + progress + '%, transparent ' + (progress + 10) + '%)';
	} else {
		_data[_current].ref.style = '';
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
const _onImgClick = function (e, item) {
	_stop(e);
	_dispatchEvent('list.image.click', { e, item });
};
const _rowDrag = (e) => {
	_stop(e);
	e.currentTarget.closest('tr').classList.add('dragging');
};
const _rowDragLeave = (e) => {
	_stop(e);
	e.currentTarget.closest('tr').classList.remove('dragging');
};
const _containerDrop = (e) => {
	_stop(e);
	let rowRef = e.target.closest('tr');
	if (rowRef !== null) {
		rowRef.classList.remove('dragging');

		let item = _getItemByRowRef(rowRef);

		_setActive(item);

		let formData = new FormData();
		formData.append('product_id', item.product_id);

		_dispatchEvent('list.row.drop', { e, item, formData });

	} else {
		return false;
	}
};
const _updateProductImageByImage = (old_image, new_image) => {
	let listItems = _getItemsByImage(old_image);
	listItems.forEach((val, idx) => {
		val.ref_img.setAttribute('src', new_image + '?' + new Date().getTime());

		let index = _getItemIndex(val);
		_data[index].image = new_image;
	});
	return listItems;
};
const _updateProductImageByProductId = (product_id, image) => {
	let listItem = _getItemByProductId(product_id);
	listItem.ref_img.setAttribute('src', image + '?' + new Date().getTime());

	let index = _getItemIndex(listItem);
	_data[index].image = image;
	return listItem;
};
const _getItemsByImage = (image) => {
	return _data.filter(e => e.img && e.img.includes(image));
};
const _getItemByProductId = (productId) => {
	let items = _data.filter(e => e.product_id && e.product_id == productId);
	return (items.length ? items[0] : false);
};
const _getItemByRowRef = (rowRef) => {
	let items = _data.filter(e => e.ref && e.ref == rowRef);
	return (items.length ? items[0] : false);
};
const _getItemIndex = (item) => {
	return Object.keys(_data).find(itemKey => _data[itemKey] === item);
};
const _setActive = (item) => {
	_data.filter(e => e.active).map(activeItem => {
		activeItem.ref.classList = '';
	});

	if (item !== null) {
		item.active = false;
		_current = parseInt(Object.keys(_data).find(itemKey => _data[itemKey] === item));
		_data[_current].active = true;
		_data[_current].ref.classList = 'row-active t_100';
		_dispatchEvent('list.row.active', item);
		_scrollTo(_data[_current].ref);
	}
};
const _dispatchEvent = (eventName, payload) => {
	if (_evtSubscribers.hasOwnProperty(eventName)) {
		_evtSubscribers[eventName].forEach((eventHandler) => {
			eventHandler(payload);
		});
	}

	return true;
};
const _scrollTo = (el) => {
	let topOfPage = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
	let heightOfPage = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
	let elY = 0;
	let elH = 0;
	if (document.layers) {
		elY = el.y;
		elH = el.height;
	}
	else {
		for (let p = el; p && p.tagName != 'BODY'; p = p.offsetParent) {
			elY += p.offsetTop;
		}
		elH = el.offsetHeight;
	}
	if ((topOfPage + heightOfPage) < (elY + elH)) {
		el.scrollIntoView(false);
	}
	else if (elY < topOfPage) {
		el.scrollIntoView(true);
	}
};
const _subscribe = (eventName, handler) => {
	if (typeof handler !== 'function') {
		return;
	}

	if (!_evtSubscribers.hasOwnProperty(eventName)) {
		_evtSubscribers[eventName] = [];
	}

	_evtSubscribers[eventName].push(handler);

	return () => {
		_evtSubscribers[eventName] = _evtSubscribers[eventName].filter((currentHandler) => {
			return currentHandler !== handler;
		});
	}
};
const _structListItem = (row) => {
	let image = row.querySelector(_imageSelector);

	return {
		ref: row,
		ref_img: image,
		img: image.src,
		product_id: row.querySelector(_productIdSelector).value,
		title: row.querySelector(_productNameSelector).textContent,
		active: row.classList.contains('row-active')
	}
};
const _setOptions = (options) => {
	_rowSelector = options.rowSelector || '',
		_productIdSelector = options.productIdSelector || '',
		_imageSelector = options.imageSelector || '',
		_productNameSelector = options.productNameSelector || ''
};

export const fancyProductList = {
	init: (options) => {
		_setOptions(options);
		
		let rows = document.querySelectorAll(_rowSelector);

		rows.forEach((value, index) => {

			let listItem = _structListItem(value);

			_data.push(listItem);

			listItem.ref_img.addEventListener('click', (e) => { _onImgClick(e, listItem) });
			'deagmove dragenter dragover'.split(' ').forEach(function (eventName) {
				listItem.ref.addEventListener(eventName, (e) => { _rowDrag(e, listItem) });
			});
			listItem.ref.addEventListener('dragleave', (e) => { _rowDragLeave(e, listItem) });

		});
		document.addEventListener('drop', _containerDrop);

		_count = _data.length;
	},
	getItemsByImage: (image) => {
		return _getItemsByImage(image)
	},
	getItemByProductId: (productId) => {
		return _getItemByProductId(productId);
	},
	getItemByRowRef: (rowRef) => {
		return _getItemByRowRef(rowRef);
	},
	getItemIndex: (item) => {
		return _getItemIndex(item);
	},
	updateProductImageByImage: (old_image, new_image) => {
		return _updateProductImageByImage(old_image, new_image);
	},
	updateProductImageByProductId: (product_id, image) => {
		return _updateProductImageByProductId(product_id, image);
	},
	setActive: (item) => {
		_setActive(item);
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
	movePrev: () => {
		if (_current == 0) {
			return false;
		} else {
			_current--;
			return true;
		}
	},
	moveNext: () => {
		if (_current == _count - 1) {
			return false;
		} else {
			_current++;
			return true;
		}
	},
	each: (callback) => {
		_data.map(callback);
	},
	setCurrent: () => {
		return _data[_current];
	},
	getCurrent: () => {
		return _data[_current];
	},
	getNext: () => {
		return (_data[_current + 1] === undefined) ? false : _data[_current + 1];
	},
	getPrev: () => {
		return (_data[_current - 1] === undefined) ? false : _data[_current - 1];
	},
	reset: () => {
		_current = -1;
	},
	subscribe: (eventName, handler) => {
		return _subscribe(eventName, handler);
	}
}