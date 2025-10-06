'use strict';

import { fancyProductList } from "./product-list.js";
import { fancyModal } from "./modal.js";
import { fancyGrid } from "./grid.js";
import { fancyApi } from "./api.js";
import { fancyDropzone } from "./dropzone.js";

export const App = {

	init: function (fu_data) {
		let sprintf = (str, ...argv) => !argv.length ? str : 
		sprintf(str = str.replace('$', argv.shift()), ...argv);
		let docTitle = document.title;
		let currentImagePath = '';
		// init
	
		let dropzone = fancyDropzone;
	
		let productList = fancyProductList;
		productList.init(fu_data.list);
	
		let modal = fancyModal;
		modal.init(fu_data.modal);
	
		let api = fancyApi;
		api.init(fu_data.api);
	
		let grid = fancyGrid;
		fu_data.grid.containerSelector = modal.getContainerSelector();
		grid.init(fu_data.grid);
	
		const showResponseMessage = (response, arg) => {
			if (response.success) {
				modal.showStatusBarMessage('<span class="alert-success"><i class="fa fa-check-circle fa-fw"></i>' + response.success + '</span>', 5000);
			} else if (response.error) {
				modal.showStatusBarMessage('<span class="alert-danger"><i class="fa fa-times-circle fa-fw"></i>' + response.error + '</span>', 5000);
			} else if (response == '') {
				modal.showStatusBarMessage('');
			}
	
			if (response.files) {
				let files = response.files;
				let total = files.length;
				let error = files.filter(v => v.error);
				let success = files.filter(v => v.success);
	
				// let directory = '';
				// files.map((value, index) => {
				// 	directory = value.image.split('/').slice(0, -1).join('/');
				// });
	
				let message = '';
				let full_message = '';
				if (arg == 'upload') {
					if (error.length) {
						error.map((value, index) => {
							full_message += '<i class="fa fa-exclamation-triangle fa-fw"></i>' + value.name + ': ' + value.error + '<br />';
						});
						message = sprintf(fu_data.language.text_upload_message_d, (total - error.length), total, currentImagePath);
						modal.showStatusBarMessage('<span class="alert-danger"><i class="fa fa-times-circle fa-fw"></i>' + message + '</span>', 10000);
						modal.showMessage('<div class="alert alert-danger alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' + full_message + '</div>');
					} else {
						message = sprintf(fu_data.language.text_upload_message_d, (total - error.length), total, currentImagePath);
						modal.showStatusBarMessage('<span class="alert-success"><i class="fa fa-check-circle fa-fw"></i>' + message + '</span>', 10000);
					}
				} else if (arg == 'move_external') {
					if (success.length) {
						success.map((value, index) => {
							full_message += '<i class="fa fa-exclamation-triangle fa-fw"></i>' + value.name + ': ' + value.success + '<br />';
						});
						message = sprintf(fu_data.language.text_moved_message_d, success.length, total, currentImagePath);
						modal.showStatusBarMessage('<span class="alert-success"><i class="fa fa-times-circle fa-fw"></i>' + message + '</span>', 10000);
						modal.showMessage('<div class="alert alert-success alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' + full_message + '</div>');
					} else {
						message = sprintf(fu_data.language.text_moved_message_d, success.length, total, currentImagePath);
						modal.showStatusBarMessage('<span class="alert-success"><i class="fa fa-check-circle fa-fw"></i>' + message + '</span>', 10000);
					}
				}
			}
	
		};
		
		// fancyProductList
			// list.image.click 	=> ({e, item});
			// list.row.drop 		=> ({e, item, formData});
			// list.row.active 		=> (item);
		productList.subscribe('list.image.click', ({e, item}) => {
			productList.setActive(item);
			productList.startFakeProgress();
	
			let formData = new FormData();
	
			formData.append('product_id', item.product_id);
	
			api.post('getImages', formData).then((response) => {
				grid.setImages(response.files);
				currentImagePath = response.directory;
	
				let link = '&nbsp;<a href="/../index.php?route=product/product&product_id=' + item.product_id + '" target="_blank"><i class="fa fa-fw fa-external-link"></i></a>';
				modal.setTitle(item.title + link);
	
				modal.show();
	
				grid.initGrid();
	
				grid.setProductId(item.product_id);
				
				modal.setPrevNextStatus({
					prev: (productList.getPrev() === false),
					next: (productList.getNext() === false)
				});
	
				productList.stopProgress();
	
			});
		});
	
		productList.subscribe('list.row.drop', ({e, item, formData}) => {
			const uploadImages = (formData) => {
				api.postXhr('uploadImages', formData, (response) => {
					showResponseMessage(response, 'upload');
	
					if (response.product_images) {
						grid.setImages(response.product_images);
					}
					
					currentImagePath = response.directory;
	
					let link = '&nbsp;<a href="/../index.php?route=product/product&product_id=' + item.product_id + '" target="_blank"><i class="fa fa-fw fa-external-link"></i></a>';
					modal.setTitle(item.title + link);
	
					modal.show();
		
					grid.initGrid();
		
					modal.setPrevNextStatus({
						prev: (productList.getPrev() === false),
						next: (productList.getNext() === false)
					});
	
				});
			}
	
			if (dropzone === undefined) {
				let files = e.dataTransfer.files;
				files.map(file => formData.append('file[]', file));
				uploadImages(formData);
			} else {
				dropzone.getDroppedOrSelectedFiles(e).then((files) => {
					files.map(file => formData.append('file[]', file.fileObject));
					uploadImages(formData);
				});
			}
		});
	
		// fancyApi
			// 'api.upload.progress', 	(progress)
			// 'api.error',			 	(e)
		api.subscribe('api.upload.progress', (progress) => {
			if (!modal.isActive()) {
				productList.setProgress(progress);
				document.title = sprintf(fu_data.language.text_uploading_files, progress);
				if (progress == 100) {
					productList.startFakeProgress();
					document.title = docTitle;
				}
			} else {
				modal.setProgress(progress);
				modal.showStatusBarMessage(sprintf(fu_data.language.text_uploading_files, progress));
				if (progress == 100) {
					modal.showStatusBarMessage('<span class="alert-success"><i class="fa fa-check-circle fa-fw"></i>' + fu_data.language.text_uploaded + '</span>', 5000);
				}
			}
			if (progress == 100) {
			} 
		});
	
		api.subscribe('api.error', (e) => {
			modal.showStatusBarMessage('<span class="alert-danger"><i class="fa fa-exclamation-triangle fa-fw"></i>' + e + '</span>', 5000);
			console.log(e);
		});
	
		// fancyModal
		// modal.button.click	=> ({e, action})
		// modal.show 			=> (e)
		// modal.hide			=> (e)
	
		modal.subscribe('modal.show', (e) => {
			productList.stopProgress();
		});
	
		modal.subscribe('modal.hide', (e) => {
			productList.setActive(null);
		});
		const saveSettings = (action) => {
			modal.showStatusBarMessage(fu_data.language.text_saving);
			
			modal.startFakeProgress();
	
			let item = productList.getCurrent();
	
			let formData = grid.getFormData();
			formData.append('product_id', item.product_id);
			
			let gridItem = grid.getFirstImageItem();
			productList.updateProductImageByProductId(item.product_id, gridItem.src);
	
			api.post('setImages', formData).then((response) => {
				modal.stopProgress();
				if (action == 'save' && response.success) {
					modal.hide();
				}
				showResponseMessage(response);
			});
		}
		modal.subscribe('modal.button.click', ({e, action}) => {
			if (action == 'prev' || action == 'next') {
				let item;
				let move = (action == 'prev') ? productList.movePrev() : productList.moveNext();
				if (move) {
					item = productList.getCurrent();
					productList.setActive(item);
	
					modal.setPrevNextStatus({
						prev: (productList.getPrev() === false),
						next: (productList.getNext() === false)
					});
				} else {
					return;
				}
	
				modal.startFakeProgress();
	
				modal.hideMessage();
				modal.hideStatusBarMessage();
	
				let formData = new FormData();
				formData.append('product_id', item.product_id);
	
				api.post('getImages', formData).then((response) => {
					grid.setImages(response.files);
					currentImagePath = response.directory;
				
					let link = '&nbsp;<a href="/../index.php?route=product/product&product_id=' + item.product_id + '" target="_blank"><i class="fa fa-fw fa-external-link"></i></a>';
					modal.setTitle(item.title + link);
	
					grid.updateGrid();
					
					grid.setProductId(item.product_id);
	
					modal.stopProgress();
				});
			}	
			if (action == 'apply' || action == 'save') {
				saveSettings(action);
			}
			if (action == 'close') {
				modal.hide();
			}
		});
	
		// fancyGrid
		// formdata.change 		=> (formData)
	
		// panel.images.remove 		=> ({e, tmp})
		// panel.images.delete 		=> ({e, tmp})
		// panel.images.rotate 		=> ({e, tmp, action})
		// panel.images.reload 		=> (e)
		// panel.images.move_external => (e)
		// panel.images.upload 		=> (e)
		
		// panel.tooltip.create 	=> (elements)
		// panel.tooltip.destroy 	=> (elements)
		// panel.tooltip.hide 		=> (element)
		
		// grid.sort 			=> (e)
		// grid.image.click 	=> (e)
		// grid.addImage.click 	=> (e)
		// grid.actionBar.click => ({e, action})
		// grid.container.drop  => ({e, formData})
		
		grid.subscribe('panel.tooltip.create', (elements) => {
			$(elements).tooltip({trigger : 'hover'});
		});
		
		grid.subscribe('panel.tooltip.destroy', (elements) => {
			$(elements).tooltip('destroy');
		});
		
		grid.subscribe('panel.tooltip.hide', (element) => {
			$(element).tooltip('hide');
		});
	
		grid.subscribe('panel.images.move_external', (e) => {
			if (fu_data.common.disable_confirm || confirm(fu_data.language.text_confirm_relocate)) {
				modal.startFakeProgress();
				
				let item = productList.getCurrent();
	
				let formData = new FormData();
				formData.append('product_id', item.product_id);
				
				api.post('moveExternalImages', formData).then((response) => {
					grid.setImages(response.files);
					grid.updateGrid();
					modal.stopProgress();
	
					showResponseMessage(response, 'move_external');
				});
			}
		});
	
		grid.subscribe('panel.images.upload', (e) => {
			const uploadImages = (formData, input) => {
				api.postXhr('uploadImages', formData, (response) => {
					showResponseMessage(response, 'upload');
					
					if (response.product_images) {
						response.product_images.filter(v => v.status && v.status == 1).forEach((image) => {
							grid.addImageItem(image.thumb_100, image.image);
						});	
					}
					currentImagePath = response.directory;
	
					modal.stopProgress();
	
					input.remove();
				});
			};
	
			let input = document.createElement('input');
			input.value = null;
			input.type = 'file';
			input.multiple = true;
			input.onchange = e => {
	
				let formData = new FormData();
				let item = productList.getCurrent();
				formData.append('product_id', item.product_id);
	
				dropzone.getDroppedOrSelectedFiles(e).then((files) => {
					files.map(file => formData.append('file[]', file.fileObject));
					uploadImages(formData, input);
				});
			}
	
			input.click();
		});
	
		grid.subscribe('panel.images.reload', (e) => {
			modal.startFakeProgress();
	
			let item = productList.getCurrent();
	
			let formData = new FormData();
			formData.append('product_id', item.product_id);
			
			api.post('getImages', formData).then((response) => {
				grid.setImages(response.files);
				currentImagePath = response.directory;
				grid.updateGrid();
	
				modal.stopProgress();
			});
		});
	
		grid.subscribe('grid.image.click', (e) => {
			modal.startFakeProgress();
	
			let item = e.target.closest('.image-wrapper').querySelector('img[data-image]');
			let directory = $(item).attr('data-image').split('/').slice(1, -1).join('/');
	
			$('#modal-image').remove();
	
			$.ajax({
				url: 'index.php?route=common/filemanager&' + fu_data.api.tokenKey + '=' + fu_data.api.token + '&directory=' + directory,
				dataType: 'html',
				success: function(html) {
					$('body').append('<div id="modal-image" class="modal">' + html + '</div>');
					
					$('#modal-image').delegate('a.thumbnail', 'click', function(e) {
						e.preventDefault();
						e.stopPropagation();
						
						$(item).attr('src', $(this).find('img').attr('src'));
						$(item).attr('data-image', $(this).parent().find('input').val());
						
						$('#modal-image').modal('hide');
						$('#modal-image').undelegate('a.thumbnail', 'click');
	
						$('.fu-grid .image.hover').removeClass('hover');
	
					});
	
					$('#modal-image').modal('show');
	
					modal.stopProgress();
				}
			});
		});	
		
		grid.subscribe('grid.addImage.click', (e) => {
			modal.startFakeProgress();
	
			$('#modal-image').remove();
	
			$.ajax({
				url: 'index.php?route=common/filemanager&' + fu_data.api.tokenKey + '=' + fu_data.api.token + '&directory=' + currentImagePath,
				dataType: 'html',
				success: function(html) {
					$('body').append('<div id="modal-image" class="modal">' + html + '</div>');
					
					$('#modal-image').delegate('a.thumbnail', 'click', function(e) {
						e.preventDefault();
						e.stopPropagation();
	
						let item = grid.addImageItem(fu_data.common.placeholder_100, '');
						
						$(item.img).attr('src', $(this).find('img').attr('src'));
						$(item.img).attr('data-image', $(this).parent().find('input').val());
						
						$('#modal-image').modal('hide');
						$('#modal-image').undelegate('a.thumbnail', 'click');
						
						$('.fu-grid .image.hover').removeClass('hover');
	
					});
					
					$('#modal-image').modal('show');
	
					modal.stopProgress();
				}
			});	
		});	
		
		grid.subscribe('panel.images.delete', ({e, tmp}) => {
			modal.startFakeProgress();
			
			let formData = new FormData();
			tmp.filter(v => v.image !== '').forEach((gridItem) => {
				formData.append('images[]', gridItem.image);
			});
	
			api.post('deleteImages', formData).then((response) => {
				modal.stopProgress();
				showResponseMessage(response);
			});
		});
		
		grid.subscribe('panel.images.rotate', ({e, tmp, action}) => {
			modal.startFakeProgress();
			
			let formData = new FormData();
			tmp.filter(v => v.image !== '').forEach((gridItem) => {
				formData.append('images[]', gridItem.image);
			});
			formData.append('direction', action);
	
			api.post('rotateImages', formData).then((response) => {
				if (response.success) {
					response.success.forEach((value, index) => {
						let gridItems = grid.getGridItemByImage(value.image);
						gridItems.forEach((val, idx) => {
							val.img.setAttribute('src', value.thumb_100 + '?' + new Date().getTime());
						});
						
						productList.updateProductImageByImage(value.thumb, value.thumb);
						productList.updateProductImageByImage(value.thumb_100, value.thumb);
	
					});
				}
				modal.stopProgress();
			});
		});
	
		grid.subscribe('grid.container.drop', ({e, formData}) => {
			modal.setProgress(1);
	
			const uploadImages = (formData) => {
				api.postXhr('uploadImages', formData, (response) => {
					showResponseMessage(response, 'upload');
	
					if (response.product_images) {
						response.product_images.filter(v => v.status && v.status == 1).forEach((image) => {
							grid.addImageItem(image.thumb_100, image.image);
						});
					}
	
					currentImagePath = response.directory;
	
					modal.stopProgress();
				});
			};
	
			if (dropzone === undefined) {
				let files = e.dataTransfer.files;
				files.map(file => formData.append('file[]', file));
				uploadImages(formData);
			} else {
				dropzone.getDroppedOrSelectedFiles(e).then((files) => {
					files.map(file => formData.append('file[]', file.fileObject));
					uploadImages(formData);
				});
			}		
		});	
	}
}