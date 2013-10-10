/* Modulo del nuevo Slider de Photos
	Popup de fotos central
 */

Details.Modules.Photos.Slider = (function($, undefined) {
	var _settings = {
		"target" : "photos-holder", // aqui se encuentran las imagenes
		"showedPhotos" : 9,
		stripBottomOffPage : '-85px', // distancia que debe subir el strip de fotos para ser visible
		spinnerOptions : {  
			lines: 11, // The number of lines to draw
			length: 7, // The length of each line
			width: 4, // The line thickness
			radius:11, // The radius of the inner circle
			color: '#fff', // #rgb or #rrggbb
			position: 'fixed',
			autoPosition: false //custom parameter for Despegar que indica si overridea al css
		},
		photoStrip: "ul.photos-strip",
		photoContainer: ".photos-strip-container",
		popup: '#photo',
		opaque: '.opaque',
		minWidth : 490
	};
	//guarda el estado del modulo
	var _indexState = {
		photosCount : $('ul.photos-strip li.photo').length,
		photoPage : 0,
		photoMaxPage : Math.floor($('ul.photos-strip li.photo').length 	/ _settings.showedPhotos),
		photoSelected : 0,
		shouldLoad : false
	};

	
	var $photoStrip, $photoContainer, $popup, $opaque, spinner, newImage;

	function init(options) {
		$.extend(_settings, options);

		$target = $("." + _settings.target);
		$("img", $target).click(function() {
			open();
			selectPhoto($(this).data('index'));
		});
		$(".more-photos-button", $target).click(function() {
			open();
			selectPhoto('1');
		});
		
		$(".main-photo img").live('click', function() {
			open();
			selectPhoto(getPhotoIndexFromSrc($(this).attr('src')));
		});
		
		$photoStrip = $(_settings.photoStrip);
		$photoContainer = $(_settings.photoContainer);
		$popup = $(_settings.popup);
		$opaque = $(_settings.opaque);
		spinner = new Spinner(_settings.spinnerOptions);
		
		$popup.find('span.popup-close').click(function(event) {
			event.stopImmediatePropagation()
			close();
		});
		bindAnimationsOnSlider();
		updateMaxSize();
	}
	
	

	function getPhotoIndexFromSrc(src) {
		src = baseFile(src);
		var photoIndex = 1;
		$photoStrip.find('img').each(function() {
			if  (baseFile($(this).attr('src')) == src) {
				photoIndex = $(this).data('index');
				return false;
			} 
		});
		return photoIndex;
	}
	
	function baseFile(src) {
		return src.substring(src.lastIndexOf('/')+1);
	}
	
	function open() {
		_indexState.shouldLoad = true;
		$photoContainer.animate({
			"bottom" : '2px'
		}, 700).animate({
			bottom : '-5px'
		}, 100);
		($.browser.msie  && $.browser.version < 9 ) ? $opaque.show()
													: $opaque.fadeIn(400);

		$popup.find('span.popup-close').show();
		$popup.find('.popup-content').find('.next, .prev').hide();
		$opaque.on('click.photoSlider', function() {
			close();
		});
		
		$popup.css('display', 'block').stop(true, false).animate({
			'opacity' : 1
		}, 800);
		
	spinner.spin($popup.find('.popup-content')[0]);
	}

	function close() {
		_indexState.shouldLoad = false;
		$opaque.off('click.photoSlider');
		$popup.animate({
			opacity : 0
		}, 400, function() {
			$popup.css('display', 'none');
//			$(this).find('img, span').hide();
			($.browser.msie  && $.browser.version < 9 ) ? $opaque.hide()
														: $opaque.fadeOut(400);
		});
	}

	function fillPopup(selectedPhoto) {
		_indexState.photoSelected = selectedPhoto.data('index');
		$('.prev, .next', '.popup-content').fadeOut(200);
		
		if (!$(".popup-content img", $popup).length) {
			loadImage(selectedPhoto);
		}
		else if ($(".popup-content img", $popup).attr('src') != '') {
				$(".popup-content img", $popup).stop(true, false).fadeOut(200,
						function() {
							loadImage(selectedPhoto);
						});
		}
		else {
			$(".popup-content img", $popup).hide();
			loadImage(selectedPhoto);
		}

	}
	
	function loadImage(selectedPhoto) {
		var target = $popup.find('.popup-content')[0];
		spinner.spin(target);
		newImage = new Image();
		
		//tomamos la imagen original
		newImage.src = selectedPhoto.attr('src').replace("/40x40/",	"/").replace("/64x64/", "/");
		if (newImage.complete || newImage.readyState == 4) {
			animatePopup(newImage);
		} else {
			$(newImage).off().on('load', function() {
				animatePopup(newImage);
			});
		}
	}

	function animatePopup(img) {
		if (!_indexState.shouldLoad) {
			return;
		}
		updateSlider();
		updateButtons();
		//escala al tamaño maximo del alto de la pantalla menos el espacio que ocupa el resto de la UI
		if (img.height > _settings.maxHeight) {
			var ratio = _settings.maxHeight / img.height;
			img.height = _settings.maxHeight;
			img.width = parseInt(img.width * ratio);
		}
		var widthToPosition = img.width < _settings.minWidth ? _settings.minWidth : img.width;
		$popup.css('display', 'block').stop(true, false).animate({
			'margin-left' : -(widthToPosition / 2 + 5) + 'px',
			'margin-top' : -(img.height / 2 + 40) + 'px',
			'opacity' : 1
		}, 200);

		//si hay que actualizar tamaño
		if ($(".popup-content", $popup).width() != img.width || $(".popup-content", $popup).height() != img.height) {
				$(".popup-content", $popup).stop(true, false).animate(
						{ 
							"width" : widthToPosition + 'px',
							"height" : img.height + 'px'
						}, 200,
						function() {
		
							showNewPhoto(img);	
						});
		}
		else {
			showNewPhoto(img);
		}
	}
	
	function showNewPhoto(img) {
		$(".popup-content", $popup)
			.find('img').remove()
			.end()
		.append(img).hide()
		.attr('height', img.height)
		.fadeTo(200, 1);
		
		//if (spinner) {
			spinner.stop();
		//}
		$('.prev, .next', $popup).fadeIn(200);
	}

	function updateSlider() {
		// calcula la pagina de imagenes que tiene que mostrar
		var newPage = Math.floor((_indexState.photoSelected - 1) / _settings.showedPhotos);
		if (newPage != _indexState.photoPage) {
			var left = - $photoStrip.find('li:first').outerWidth(true) * _settings.showedPhotos * newPage;
			$photoStrip.animate({
				left : parseInt(left) + 'px'
			}, 800);
			_indexState.photoPage = newPage;
		}

	}

	function updateButtons() {
		(_indexState.photoSelected > 1) ? $('.prev', $popup).removeClass('disabled') 
										: $('.prev', $popup).addClass('disabled');

		(_indexState.photoSelected < _indexState.photosCount) ? $('.next', $popup).removeClass('disabled') 
															  : $('.next', $popup).addClass('disabled');

		(_indexState.photoPage > 0) ? $('.prev', $photoContainer).removeClass('disabled') 
									: $('.prev', $photoContainer).addClass('disabled');

		(_indexState.photoPage < _indexState.photoMaxPage) ? $('.next', $photoContainer).removeClass('disabled') 
														   : $('.next', $photoContainer).addClass('disabled');

	}

	function selectPhoto(indexNumber) {
		var selectedImage = $photoStrip.find("[data-index='" + indexNumber + "']");
		if (selectedImage.length) {
			selectedImage.closest('li').addClass("selected").siblings().removeClass('selected');
			fillPopup(selectedImage);
		}
	}

	function updateMaxSize() {
		_settings.maxHeight = $(window).height() - $photoContainer.height() - 110;
	}

	function bindAnimationsOnSlider() {
		// next page
		$(".next, .prev", $photoContainer).on({
			"click" : function() {
				var moveDirection = $(this).hasClass('next') ? 1 : -1;
				var newPage = (_indexState.photoPage + moveDirection)
				selectPhoto(newPage * _settings.showedPhotos + 1);
			}
		});

		// next image
		$popup.find('.popup-content').find(".prev, .next").on({
			"click" : function() {
				var moveDirection = $(this).hasClass('next') ? 1 : -1;
				selectPhoto(_indexState.photoSelected + moveDirection);
			}
		});

		$(".photo img", $photoStrip).on({
			"click" : function() {
				selectPhoto($(this).data('index'));
			}
		});

		$(window).resize(function() {
			updateMaxSize();
		});
		
		$(document).keydown(function(event) {
			if (event.keyCode == 37) {
				selectPhoto(_indexState.photoSelected - 1);
			} else if (event.keyCode == 39) {
				selectPhoto(_indexState.photoSelected + 1);
			}
			else if (event.keyCode == 27) {
				close();
			}
		});
	}

	return {
		init : init
	}
}(jQuery));