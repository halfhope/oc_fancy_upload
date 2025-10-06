<?php
/**
 * @author Shashakhmetov Talgat <talgatks@gmail.com>
 */
if (!function_exists('str_starts_with')) {
    function str_starts_with($haystack, $needle) {
        return (string)$needle !== '' && strncmp($haystack, $needle, strlen($needle)) === 0;
    }
}

class ControllerExtensionModuleFancyUpload extends Controller {
	
	private $_route 		= 'extension/module/fancy_upload';
	private $_model 		= 'model_extension_module_fancy_upload';
	private $_version 		= '1.0.1';
	
	private $_cached		= [];
	private $_catalog_path 	= 'catalog';

	/*
	*	STATIC DATA
	*/

	private $_event = [

		// Add widget html
		[
			'trigger'	=> 'admin/controller/catalog/product/before',
			'action'	=> 'eventAddScripts'
		],
		[
			'trigger'	=> 'admin/view/catalog/product_list/after',
			'action'	=> 'eventInitFancyUpload'
		]
	];

	/*
	*	INSTALLATION
	*/

	public function install() {
		$this->load->model('extension/event');

		foreach ($this->_event as $key => $_event) {
			$_event['code'] = 'fu_' . substr(md5(http_build_query($_event)), 3);

			if(!$result = $this->model_extension_event->getEvent($_event['code'], $_event['trigger'], $this->_route . '/' . $_event['action'])) {
				$this->model_extension_event->addEvent($_event['code'], $_event['trigger'], $this->_route . '/' . $_event['action']);
			}
		}

		$this->load->model($this->_route);
		$this->{$this->_model}->install();
		
		$this->load->model('setting/setting');

		$fancy_upload = [
			'fancy_upload_disable_confirm' 		=> 0,
			'fancy_upload_exec'					=> '',
			'fancy_upload_change_image_size'	=> 0,
			'fancy_upload_path'					=> 'products/[category_name]/[product_name]'
		];
		$this->model_setting_setting->editSetting('fancy_upload', $fancy_upload);
	}

	public function uninstall() {
		$this->load->model('extension/event');

		foreach ($this->_event as $key => $_event) {
			$_event['code'] = 'fu_' . substr(md5(http_build_query($_event)), 3);

			$this->model_extension_event->deleteEvent($_event['code']);
		}

		$this->load->model($this->_route);
		$this->{$this->_model}->uninstall();
	}

	/*
	*	MODULE
	*/

	public function index() {

		$data = $this->load->language($this->_route);
		
		$this->document->setTitle($this->language->get('heading_title'));
		$data['version'] = $this->_version;

		$this->load->model($this->_route);

		if (($this->request->server['REQUEST_METHOD'] == 'POST') && $this->validatePermission()) {
			
			$this->load->model('setting/setting');

			$this->model_setting_setting->editSetting('fancy_upload', $this->request->post);

			$this->session->data['success'] = $this->language->get('text_success');

			$this->response->redirect($this->url->link($this->_route, 'token=' . $this->session->data['token'], true));
		}

		// messages
		if (isset($this->error['warning'])) {
			$data['error_warning'] = $this->error['warning'];
		} else {
			$data['error_warning'] = '';
		}

		if (isset($this->session->data['success'])) {
			$data['success'] = $this->session->data['success'];

			unset($this->session->data['success']);
		} else {
			$data['success'] = '';
		}

		// breadchrumbs
		$data['breadcrumbs'] = [];

		$data['breadcrumbs'][] = [
			'text' => $this->language->get('text_home'),
			'href' => $this->url->link('common/dashboard', 'token=' . $this->session->data['token'], true)
		];

		$data['breadcrumbs'][] = [
			'text' => $this->language->get('text_extension'),
			'href' => $this->url->link('extension/extension', 'token=' . $this->session->data['token'] . '&type=module', true)
		];

		$data['breadcrumbs'][] = [
			'text' => $this->language->get('heading_title'),
			'href' => $this->url->link($this->_route, 'token=' . $this->session->data['token'], true)
		];

		// form data
		if (isset($this->request->post['fancy_upload_path'])) {
			$data['fancy_upload_path'] = $this->request->post['fancy_upload_path'];
		} else {
			$data['fancy_upload_path'] = $this->config->get('fancy_upload_path');
		}
		
		if (isset($this->request->post['fancy_upload_change_image_size'])) {
			$data['fancy_upload_change_image_size'] = $this->request->post['fancy_upload_change_image_size'];
		} else {
			$data['fancy_upload_change_image_size'] = $this->config->get('fancy_upload_change_image_size');
		}
		
		if (isset($this->request->post['fancy_upload_image_size_width'])) {
			$data['fancy_upload_image_size_width'] = $this->request->post['fancy_upload_image_size_width'];
		} else {
			$data['fancy_upload_image_size_width'] = $this->config->get('fancy_upload_image_size_width');
		}
		
		if (isset($this->request->post['fancy_upload_image_size_height'])) {
			$data['fancy_upload_image_size_height'] = $this->request->post['fancy_upload_image_size_height'];
		} else {
			$data['fancy_upload_image_size_height'] = $this->config->get('fancy_upload_image_size_height');
		}
		
		if (isset($this->request->post['fancy_upload_exec'])) {
			$data['fancy_upload_exec'] = $this->request->post['fancy_upload_exec'];
		} else {
			$data['fancy_upload_exec'] = $this->config->get('fancy_upload_exec');
		}

		if (isset($this->request->post['fancy_upload_disable_confirm'])) {
			$data['fancy_upload_disable_confirm'] = $this->request->post['fancy_upload_disable_confirm'];
		} else {
			$data['fancy_upload_disable_confirm'] = $this->config->get('fancy_upload_disable_confirm');
		}
		
		$data['ini_max_file_uploads'] 		= ini_get('max_file_uploads');
		$data['ini_max_input_time']			= ini_get('max_input_time');
		$data['ini_post_max_size']			= ini_get('post_max_size');
		$data['ini_upload_max_filesize']	= ini_get('upload_max_filesize');

		// top menu
		$data['action'] = $this->url->link($this->_route, 'token=' . $this->session->data['token'], true);
		$data['cancel'] = $this->url->link('extension/extension', 'token=' . $this->session->data['token'] . '&type=module', true);

		// controllers
		$data['header'] = $this->load->controller('common/header');
		$data['column_left'] = $this->load->controller('common/column_left');
		$data['footer'] = $this->load->controller('common/footer');

		$this->response->setOutput($this->load->view($this->_route, $data));
	}

	protected function validatePermission() {
		if (!$this->user->hasPermission('modify', $this->_route)) {
			$this->error['warning'] = $this->language->get('error_permission');
		}

		return !$this->error;
	}

	/*
	*	PRODUCT IMAGE FUNCTIONS
	*/

	public function uploadImages() {
		$this->load->language('common/filemanager');
		$this->load->language($this->_route);

		$json = [];
		if (!$this->user->hasPermission('modify', $this->_route)) {
			$json['error'] = $this->language->get('error_permission');
		}

		if ($this->request->server['REQUEST_METHOD'] == 'POST' && !empty($this->request->post) && !isset($json['error'])) {
			$this->load->model('tool/image');

			$product_id = (int) $this->request->post['product_id'];

			$path_spec = $this->config->get('fancy_upload_path');
			$generated_path = $this->processPath($product_id, '/' . $path_spec . '/');

			$path = DIR_IMAGE . $this->_catalog_path . $generated_path;
			$short_path = str_replace(DIR_IMAGE . $this->_catalog_path . '/', '', $path);
			
			$json['directory'] = $short_path;

			if (!is_dir($path)) {
				mkdir($path, 0777, true);
				chmod($path, 0777);
				@touch($path . '/' . 'index.html');
			}

			if (!isset($json['error'])) {

				$product_images = $this->getAllImages($product_id);

				$files = [];
	
				if (!empty($this->request->files['file']['name']) && is_array($this->request->files['file']['name'])) {
					foreach (array_keys($this->request->files['file']['name']) as $key) {
						$files[] = [
							'name'     => $this->request->files['file']['name'][$key],
							'type'     => $this->request->files['file']['type'][$key],
							'tmp_name' => $this->request->files['file']['tmp_name'][$key],
							'error'    => $this->request->files['file']['error'][$key],
							'size'     => $this->request->files['file']['size'][$key],
						];
					}
				}

				foreach ($files as $key => $file) {
					if (is_file($file['tmp_name'])) {
						$filename = $this->basename_fixed(html_entity_decode($file['name'], ENT_QUOTES, 'UTF-8'));

						$json['files'][$key]['name'] = $filename;

						$allowed = array_map('trim', explode(PHP_EOL, $this->config->get('config_file_ext_allowed')));
	
						if (!in_array(utf8_strtolower(utf8_substr(strrchr($filename, '.'), 1)), $allowed)) {
							$json['files'][$key]['error'] = $this->language->get('error_filetype');
						}

						$allowed = array_map('trim', explode(PHP_EOL, $this->config->get('config_file_mime_allowed')));
	
						if (!in_array($file['type'], $allowed)) {
							$json['files'][$key]['error'] = $this->language->get('error_filetype');
						}
	
						if ($file['size'] > $this->config->get('config_file_max_size')) {
							$json['files'][$key]['error'] = $this->language->get('error_filesize');
						}
	
						if ($file['error'] != UPLOAD_ERR_OK) {
							$json['files'][$key]['error'] = $this->language->get('error_upload_' . $file['error']);
						}
						
					} else {
						$json['files'][$key] = $file;
						$json['files'][$key]['error'] = $this->language->get('error_upload');
					}
	
					if (!isset($json['error']) && !isset($json['files'][$key]['error'])) {
						$filename = $this->processName($filename);
						$filename = $this->renameIfExists($path, $filename);

						move_uploaded_file($file['tmp_name'], $path . $filename);

						// change image size 
						$change_image_size = (bool) $this->config->get('fancy_upload_change_image_size');
						if ($change_image_size) {
							$this->resizeImage($path . $filename, $this->config->get('fancy_upload_image_size_width'), $this->config->get('fancy_upload_image_size_height'));
						}

						// shell exec
						$fancy_upload_exec = $this->config->get('fancy_upload_exec');
						if (!empty($fancy_upload_exec)) {
							$command = str_replace('${image}', $path . $filename, $fancy_upload_exec);
							shell_exec($command);
						}

						if (!isset($json['files'][$key]['error'])) {
							$thumb = $this->model_tool_image->resize($this->_catalog_path . '/' . $short_path . $filename, 40, 40);
							$thumb_100 = $this->model_tool_image->resize($this->_catalog_path . '/' . $short_path . $filename, 100, 100);

							$json['files'][$key] = [
								'name' 		=> $filename,
								'image' 	=> $short_path . $filename,
								'thumb' 	=> $thumb,
								'thumb_100' => $thumb_100,
								'path' 		=> $path . $filename
							];

							$product_images[] = [
								'status' 		=> 1,
								'image' 		=> $this->_catalog_path . '/' . $short_path . $filename,
								'sort_order' 	=> count($product_images),
								'thumb' 		=> $thumb,
								'thumb_100' 	=> $thumb_100
							];
						}
					}
				}
				
				$json['product_images'] = $product_images;
				$this->setAllImages($product_id, $product_images);
			}
		}
		$this->response->addHeader('Content-Type: application/json');
		$this->response->setOutput(json_encode($json));
	}
	
	public function getImages() {
		$this->load->language($this->_route);

		$json = [];
		if (!$this->user->hasPermission('access', $this->_route)) {
			$json['error'] = $this->language->get('error_permission');
		}

		if ($this->request->server['REQUEST_METHOD'] == 'POST' && !isset($json['error'])) {

			$product_id = $this->request->post['product_id'];
			
			$path_spec = $this->config->get('fancy_upload_path');
			$generated_path = $this->processPath($product_id, '/' . $path_spec . '/');

			$path = DIR_IMAGE . $this->_catalog_path . $generated_path;
			$short_path = str_replace(DIR_IMAGE . $this->_catalog_path . '/', '', $path);

			if (!is_dir($path)) {
				mkdir($path, 0777, true);
				chmod($path, 0777);
				@touch($path . '/' . 'index.html');
			}

			$json['directory'] = $short_path;
			
			$json['files'] = $this->getAllImages($product_id);
		}
		$this->response->addHeader('Content-Type: application/json');
		$this->response->setOutput(json_encode($json));
	}
	
	public function setImages() {
		$this->load->language($this->_route);

		$json = [];
		if (!$this->user->hasPermission('modify', $this->_route)) {
			$json['error'] = $this->language->get('error_permission');
		}
		if (!isset($json['error'])) {
			if ($this->request->server['REQUEST_METHOD'] == 'POST' && isset($this->request->post['product_image'])) {
				
				$this->load->model($this->_route);

				$product_id = $this->request->post['product_id'];

				$this->setAllImages($product_id, $this->request->post['product_image']);
				$result = ['success' => $this->language->get('text_success_set')];
			} else {
				$result = ['error' => $this->language->get('error_empty_images')];
			}
		}
		$this->response->addHeader('Content-Type: application/json');
		$this->response->setOutput(json_encode($result));
	}
	
	/*
	*	MODEL FUNCTIONS
	*/

	private function getAllImages($product_id) {
		$this->load->model($this->_route);
		$this->load->model('tool/image');

		$common_image = $this->{$this->_model}->getProductImage($product_id);
		$additional_images = $this->{$this->_model}->getProductImages($product_id);

		$result = [];

		$result[] = [
			'image' 		=> $common_image,
			'sort_order' 	=> 0,
			'thumb' 		=> $this->model_tool_image->resize($common_image, 40, 40),
			'thumb_100' 	=> $this->model_tool_image->resize($common_image, 100, 100),
			'selected' 		=> false
		];
		
		foreach ($additional_images as $image) {
			$result[] = [
				'image' 		=> $image['image'],
				'sort_order' 	=> (int) $image['sort_order'],
				'thumb' 		=> $this->model_tool_image->resize($image['image'], 40, 40),
				'thumb_100' 	=> $this->model_tool_image->resize($image['image'], 100, 100),
				'selected'		=> false
			];
		}

		return $result;
	}

	private function setAllImages($product_id, $images) {
		$this->load->model($this->_route);

		$image = array_shift($images);
		$this->{$this->_model}->setProductImage($product_id, $image['image']);

		$this->{$this->_model}->setProductImages($product_id, $images);
	}
	
	/*
	*	PROCESSING FUNCTIONS
	*/
	
	private function processName($path, $translit = true, $sanitize = true, $beautify = true) {
		if (empty($path)) {
			return $path;
		}

		$path = $translit ? self::translitPath($path) : $path;
		$path = $sanitize ? self::sanitizePath($path) : $path;
		$path = $beautify ? self::beautifyPath($path) : $path;

		return $path;
	}

	private function processImage($image) {
		return $image;
	}

	private function processPath($product_id, $path_spec) {

		$shortcode_data = $this->getShortcodeData($product_id);
		
		preg_match_all('/\[([^\]]*)\]/', $path_spec, $matches);
		if (isset($matches[1])) {
			foreach ($matches[1] as $index => $match) {
				// category
				if (str_starts_with($match, 'category_')) {
					$true_value = [];
					foreach ($shortcode_data['categories'] as $key => $value) {
						if (isset($value[$match])) {
							$true_value[] = $value[$match];
						}
					}
					$true_value = implode('/', array_filter($true_value));
				// product and manufacturer
				} else {
					if (isset($shortcode_data[$match])) {
						$true_value = $shortcode_data[$match];
					}
				}
				$path_spec = str_replace(['//', '\\\\'], '', preg_replace('/\[' . $match . '\]/', $true_value, $path_spec));
			}
		}
		return $path_spec;
	}
	
	/*
	*	FILESYSTEM FUNCTIONS
	*/
	
	public function rotateImages() {
		$this->load->language($this->_route);

		$json = [];
		if (!$this->user->hasPermission('modify', $this->_route)) {
			$json['error'] = $this->language->get('error_permission');
		}
		if (!isset($json['error'])) {
			if ($this->request->server['REQUEST_METHOD'] == 'POST' && isset($this->request->post['images'])) {
				$this->load->model('tool/image');
				
				$direction = isset($this->request->post['direction']) ? $this->request->post['direction'] : 'rotate-left';
				
				$json = [];
				foreach ($this->request->post['images'] as $image) {
					
					$deg = ($direction == 'rotate-left') ? 90 : -90;
					
					$img = new Image(DIR_IMAGE . $image);
					$img->rotate($deg);
					$img->save(DIR_IMAGE . $image);
					
					$this->clearImageCacheByImage($image);
					
					$json['success'][] = [
						'image' 	=> $image,
						'thumb' 	=> $this->model_tool_image->resize($image, 40, 40),
						'thumb_100' => $this->model_tool_image->resize($image, 100, 100)
					];
				}
			} else {
				$json['error'] = $this->language->get('error_empty_images');
			}
		}
		$this->response->addHeader('Content-Type: application/json');
		$this->response->setOutput(json_encode($json));
	}
	
	public function deleteImages() {
		$this->load->language($this->_route);

		$json = [];
		if (!$this->user->hasPermission('modify', $this->_route)) {
			$json['error'] = $this->language->get('error_permission');
		}
		if (!isset($json['error'])) {
			if ($this->request->server['REQUEST_METHOD'] == 'POST' && isset($this->request->post['images'])) {
				foreach ($this->request->post['images'] as $image) {
					$this->clearImageCacheByImage($image);
					@unlink(DIR_IMAGE . $image);
				}
				$json['success'] = $this->language->get('text_success_deleted');
			} else {
				$json['error'] = $this->language->get('error_empty_images');			
			}
		}

		$this->response->addHeader('Content-Type: application/json');
		$this->response->setOutput(json_encode($json));
	}
	
	public function moveExternalImages() {
		$this->load->language($this->_route);

		$json = [];
		if (!$this->user->hasPermission('modify', $this->_route)) {
			$json['error'] = $this->language->get('error_permission');
		}
		if (!isset($json['error'])) {
			if ($this->request->server['REQUEST_METHOD'] == 'POST' && isset($this->request->post['product_id'])) {

				$product_id = (int) $this->request->post['product_id'];

				$path_spec = '/products/[category_name]/[product_name]/';
				$generated_path = $this->processPath($product_id, $path_spec);

				$path = DIR_IMAGE . $this->_catalog_path . $generated_path;
				
				if (!is_dir($path)) {
					mkdir($path, 0777, true);
					chmod($path, 0777);
					@touch($path . '/' . 'index.html');
				}

				$product_images = $this->getAllImages($product_id);
				$files = glob($path . '*');
				foreach ($product_images as $key => $value) {

					$full_path = DIR_IMAGE . $value['image'];

					if (!in_array($full_path, $files) && file_exists($full_path)) {

						$filename = $this->renameIfExists($path, pathinfo($value['image'], PATHINFO_BASENAME));
						$new_path = $path . $filename;
						
						rename($full_path, $new_path);

						$product_images[$key]['image'] = str_replace(DIR_IMAGE, '', $new_path);
						$product_images[$key]['success'] = $this->language->get('text_success_moved');
						$product_images[$key]['name'] = $filename;
					}
				}
				
				$this->setAllImages($product_id, $product_images);
				
				$json['files'] = $product_images;
			} else {
				$json['error'] = $this->language->get('error_empty_images');
			}
		}
		$this->response->addHeader('Content-Type: application/json');
		$this->response->setOutput(json_encode($json));
	}

	private function resizeImage($image, $width, $height) {
		$img = new Image($image);
		$img->resize($width, $height);
		$img->save($image);
	}
	
	private function renameIfExists($path, $filename) {
		if (file_exists($path . $filename)) {
			$i = 1;
			$pathinfo = pathinfo($filename);
			while (file_exists($path . $filename)) {
				$filename = $pathinfo['filename'] . '-' . $i . '.' . $pathinfo['extension'];
				$i++;
			}
		}
		return $filename;
	}

	private function clearImageCacheByImage($image) {
		$pathinfo = pathinfo($image);
		$cache_path_mask = DIR_IMAGE . implode('/', ['cache', $pathinfo['dirname'], $pathinfo['filename'] . '*']);
		
		$files = glob($cache_path_mask);
		
		foreach ($files as $key => $filename) {
			@unlink($filename);
		}
	}
	
	/*
	*	SHORTCODE FUCNTIONS
	*/	
	
	private function addPrefixToData($prefix, $data, $translit = true) {
		$result = [];
		foreach ($data as $key => $value) {
			$result[$prefix . '_' . str_replace($prefix . '_', '', $key)] = $this->processName($value);
		}
		return $result;
	}

	private function getShortcodeData($product_id) {
		if (!$this->_cached) {

			$this->load->model('catalog/product');
			$this->load->model('catalog/category');
			$this->load->model('catalog/manufacturer');
			
			$categories_info = [];

			$product_category_path = $this->getProductPath($product_id);
			foreach ($product_category_path as $key => $category_id) {
				$category_info = $this->model_catalog_category->getCategory($category_id);
				$categories_info[$category_id] = $this->addPrefixToData('category', $category_info);
			}

			$product_info = $this->model_catalog_product->getProduct($product_id);
			$manufacturer_id = $product_info['manufacturer_id'];
			$product_info = $this->addPrefixToData('product', $product_info);
			
			$class_name = preg_replace('/[^a-zA-Z0-9]/', '', 'model_catalog_manufacturer');
			if (is_callable([$class_name, 'getManufacturerDescriptions'])) {
				$manufacturer_info = $this->model_catalog_manufacturer->getManufacturerDescriptions($manufacturer_id);
				$manufacturer_info = !empty($manufacturer_info) ? $manufacturer_info[(int)$this->config->get('config_language_id')] : [];
			} else {
				$manufacturer_info = $this->model_catalog_manufacturer->getManufacturer($manufacturer_id);
			}

			$manufacturer_info = $this->addPrefixToData('manufacturer', $manufacturer_info);
			$manufacturer_info['manufacturer_id'] = $manufacturer_id;

			$result = [
				'categories' 	=> $categories_info
			];

			$result += $product_info;
			$result += $manufacturer_info;

			$this->_cached = $result;

			return $result;
		} else {
			return $this->_cached;
		}
	}

	private function getProductPath($product_id) {
		// Filters
		$path = [];
		$class_name = preg_replace('/[^a-zA-Z0-9]/', '', 'model_catalog_product');
		if (is_callable([$class_name, 'getProductMainCategoryId'])) {
			$main_category_id = $this->model_catalog_product->getProductMainCategoryId($product_id);
			$category_path = $this->model_catalog_category->getCategoryPath($main_category_id);
			$i_path = [];
			foreach ($category_path as $key => $value) {
				$i_path[] = $value['path_id'];
			}
		} else {
			$categories_paths = [];
			$product_categories = $this->model_catalog_product->getProductCategories($product_id);
			foreach ($product_categories as $key => $category_id) {
				$category_path = $this->model_catalog_category->getCategoryPath($category_id);
				$i_path = [];
				foreach ($category_path as $key => $value) {
					$i_path[] = $value['path_id'];
				}
				$categories_paths[$category_id] = $i_path;
			}
			$max = 0;
			$i_path = [];
			foreach ($categories_paths as $category_id => $paths) {
				if ($max <= count($paths)) {
					$i_path = $paths;
				}
			}
		}
		return $i_path;
	}

	/*
	*	EVENTS
	*/
	
	public function eventAddScripts(&$route, &$args) {
		if (!$this->user->hasPermission('view', $this->_route)) {
			$this->document->addStyle('view/javascript/fancy_upload/form.css?v=' . $this->_version);

			$this->document->addScript('view/javascript/fancy_upload/sortable.js?v=' . $this->_version);
		}
	}

	public function eventInitFancyUpload(&$route, &$data, &$output) {
		$this->load->language($this->_route);

		if (!$this->user->hasPermission('view', $this->_route)) {
			
			$json = [
				'list' => [
					'rowSelector' 			=> '#form-product table tbody > tr',
					'productIdSelector' 	=> 'input[name^=selected]',
					'imageSelector' 		=> 'td:nth-child(2)>img',
					'productNameSelector' 	=> 'td:nth-child(3)'					
				],
				'modal' => [
					'button_apply' 			=> $this->language->get('button_apply'), 
					'button_save' 			=> $this->language->get('button_save'), 
					'button_close' 			=> $this->language->get('button_close'),
				],
				'api' => [
					'apiPath'				=> HTTPS_SERVER . 'index.php?route=' . $this->_route,
					'methodSeparator'		=> '/',
					'tokenKey'				=> 'token',
					'token'					=> $this->session->data['token'],
				],
				'grid' => [
					'containerSelector' 	=> '.modal-body', //modal or form
					'sortableSelector'		=> '.fu-grid',
					'placeholder'			=> $this->model_tool_image->resize('no_image.png', 100, 100),

					'settings_link'			=> $this->url->link($this->_route, 'token=' . $this->session->data['token'], true),

					'button_select_all' 	=> $this->language->get('button_select_all'), 
					'button_unselect_all' 	=> $this->language->get('button_unselect_all'), 
					'button_delete'			=> $this->language->get('button_delete'),
					'button_remove'			=> $this->language->get('button_remove'),
					'button_rotate_left'	=> $this->language->get('button_rotate_left'),
					'button_rotate_right'	=> $this->language->get('button_rotate_right'),
					'button_reload'			=> $this->language->get('button_reload'),
					'button_move'			=> $this->language->get('button_move'),
					'button_upload'			=> $this->language->get('button_upload'),
					'button_settings'		=> $this->language->get('button_settings'),
				],
				'common' => [
					'placeholder' 			=> $this->model_tool_image->resize('no_image.png', 40, 40),
					'placeholder_100' 		=> $this->model_tool_image->resize('no_image.png', 100, 100),
					'disable_confirm'		=> (bool) $this->config->get('fancy_upload_disable_confirm'),
				],
				'language' => [
					// modal
					// messages
					'text_uploading_files' 	=> $this->language->get('text_uploading_files'), 
					'text_uploaded' 		=> $this->language->get('text_uploaded'),
					'text_upload_message_d'	=> $this->language->get('text_upload_message_d'), 
					'text_upload_message' 	=> $this->language->get('text_upload_message'), 
					'text_moved_message_d' 	=> $this->language->get('text_moved_message_d'),
					'text_moved_message' 	=> $this->language->get('text_moved_message'),
					'text_saving' 			=> $this->language->get('text_saving'),
					'text_upload_errors' 	=> $this->language->get('text_upload_errors'),
					'text_confirm_relocate'	=> $this->language->get('text_confirm_relocate'),
				]
			];
			
			$json = json_encode($json);

			$script = "
			<script type=\"module\">
			\"use strict\";
			import { App } from '/admin/view/javascript/fancy_upload/app.js';

			var fu_data = $json;
			window.addEventListener(\"load\", (event) => {
				App.init(fu_data);
			});
			</script>";
			
			$output = $output . $script;
		}
	}

	/*
	*	HELPER
	*/	
	
	// FIX: basename not work with UTF-8 multibyte names
    private static function basename_fixed($path) {
        $path_part = explode('/', $path);
        return array_pop($path_part);
    }
	
	private static function sanitizePath($path) {
		// sanitize filename
		$path = preg_replace(
			'~
			[<>:"/\\\|?*]|           # file system reserved https://en.wikipedia.org/wiki/Filename#Reserved_characters_and_words
			[\x00-\x1F]|             # control characters http://msdn.microsoft.com/en-us/library/windows/desktop/aa365247%28v=vs.85%29.aspx
			[\x7F\xA0\xAD]|          # non-printing characters DEL, NO-BREAK SPACE, SOFT HYPHEN
			[#\[\]@!$&\'()+,;=]|     # URI reserved https://www.rfc-editor.org/rfc/rfc3986#section-2.2
			[{}^\~`]                 # URL unsafe characters https://www.ietf.org/rfc/rfc1738.txt
			~x',
			'-', $path);
		// avoids ".", ".." or ".hiddenFiles"
		$path = ltrim($path, '.-');

		return $path;
	}

	private static function beautifyPath($path) {
		// reduce consecutive characters
		$path = preg_replace([
			// "file   name.zip" becomes "file-name.zip"
			'/ +/',
			// "file___name.zip" becomes "file-name.zip"
			'/_+/',
			// "file---name.zip" becomes "file-name.zip"
			'/-+/'
		], '-', $path);
		$path = preg_replace([
			// "file--.--.-.--name.zip" becomes "file.name.zip"
			'/-*\.-*/',
			// "file...name..zip" becomes "file.name.zip"
			'/\.{2,}/'
		], '.', $path);
		// lowercase for windows/unix interoperability http://support.microsoft.com/kb/100625
		$path = mb_strtolower($path, mb_detect_encoding($path));
		// ".file-name.-" becomes "file-name"
		$path = trim($path, '.-');
		
		// maximize filename length to 255 bytes http://serverfault.com/a/9548/44086
		$ext = pathinfo($path, PATHINFO_EXTENSION);
		$path = mb_strcut(pathinfo($path, PATHINFO_FILENAME), 0, 255 - ($ext ? strlen($ext) + 1 : 0), mb_detect_encoding($path)) . ($ext ? '.' . $ext : '');

		return $path;
	}

	private static function translitPath($path) {
		$rus = ["а","А","б","Б","в","В","г","Г","д","Д","е","Е","ё","Ё","є","Є","ж", "Ж",  "з","З","и","И","і","І","ї","Ї","й","Й","к","К","л","Л","м","М","н","Н","о","О","п","П","р","Р", "с","С","т","Т","у","У","ф","Ф","х","Х","ц","Ц","ч", "Ч", "ш", "Ш", "щ",  "Щ", "ъ","Ъ", "ы","Ы","ь","Ь","э","Э","ю", "Ю", "я","Я",'/',' '];
		$eng = ["a","A","b","B","v","V","g","G","d","D","e","E","e","E","e","E", "zh","ZH","z","Z","i","I","i","I","yi","YI","j","J","k","K","l","L","m","M","n","N","o","O", "p","P","r","R","s","S","t","T","u","U","f","F","h","H","c","C","ch","CH", "sh","SH","sch","SCH","", "", "y","Y","","","e","E","ju","JU","ja","JA",'',' '];
		$path = strtolower(str_replace($rus, $eng, $path));
		$disallow_symbols = [
			' ' => '-', '\\' => '-', '/' => '-', ':' => '-', '*' => '',
			'?' => '', ',' => '', '"' => '', '\'' => '', '<' => '', '>' => '', '|' => ''
		];
		return trim(strip_tags(str_replace(array_keys($disallow_symbols), array_values($disallow_symbols), trim(html_entity_decode($path, ENT_QUOTES, 'UTF-8')))), '-');
	}
}