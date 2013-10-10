registerNameSpace("Search.Modules");

Search.Modules.ManualCarrousel = (function($, undefined) {
	var playing = false;
	var $hotel; 
	var _options = {
		"carrouselConfig": {
			"photo":{
				"width": 110,
				"height": 110
			}
		}	
	}; 
	var _photosData = null;
	var $thisHotel = null;
	var activeTransition = false;
	function init(options) {
		logger.info("Inicializando ManualCarrousel");

		$.extend(_options, options);
		
		amplify.subscribe('resultsLoaded', function() {
			start();
		});
		amplify.subscribe("refreshUrlHash", function() {
			playing = false;
		});
	}
	
	function start() {
		if (isPlaying()) {
			//en la full si ya se hizo el request reasigna imagenes y listeners
			assignImagesAndUI();
			return;
		}
		//si es la primer llamada hace el request por las imagenes
		playing = true;
		var hotelIds = [];
		
		$('.hotel').each(function() {
			var $this = $(this);
			if ($this.attr('id')) {
				hotelIds.push($this.attr('id'));
			}
		});
		
	
		
		hotelIds = hotelIds.join(',');
		if (!hotelIds) {
			return;
		}
		$.validatedAjax({
			url : _options.serviceUrl + hotelIds,
			type : 'GET',
			timeout : 30000,
			dataType: 'json',
			cache: true,
			success : function(photosData) {
				_photosData = photosData;
				assignImagesAndUI();
				},
			    error : function() {
			    	activeTransition = false;
				    clientSideLogger.error("Error en la llamada AJAX de getPhotosByHotelId, ids: " + hotelIds, _options.serviceUrl + hotelIds, 324);
			    }
		    });
	}
	
	function assignImagesAndUI() {
		$hotel = $('.hotel');
		
		if (!_photosData) { return; }
		//toma el tamaño del container para pedir las imgs
		resize();
		//si es responsive actuliza el tamaño en cada resize
		if ($('body').hasClass('ux-common-responsive')) {
			$(window).resize(resize);
		}
		
		for (var i in _photosData) {
			var obj = $hotel.filter('#'+i); 
			if (_photosData[i].elements.length > 1) {
				obj.data('images', _photosData[i].elements).data('imageIndex', 0);
				if (!obj.find('.prev').length) {
					obj.find('div.imgHotel').append("<span class='ux-common-slidernav-prev prev active'>&lsaquo;</span><span class='ux-common-slidernav-next next active'>&rsaquo;</span>");
				}
			}
			//pone la cantidad de fotos para V3
			obj.find('.photos-count .quantity').html(_photosData[i].elements.length).parent().show();
			obj.find("div.imgHotel")
				.find('.next, .prev')
				.off().on('click', function(e) {
					e.stopImmediatePropagation();
					nextPhoto($(this));
				});
		}
		
	}
	
	
			
			function nextPhoto($this) {
				if (activeTransition) { return; }
				activeTransition = true;
				var delta = $this.hasClass('next') ? 1 : -1; //direccion del movimiento
				var $thisHotel = $this.closest('.hotel');
				var images = $thisHotel.data('images') || [];
				if (images.length < 2) { return; }
				var imageIndex = $thisHotel.data('imageIndex') + delta;
				if (imageIndex < 0) imageIndex = images.length - 1;
				if (imageIndex >= images.length) imageIndex = 0;
				$thisHotel.data('imageIndex', imageIndex);
				//carga la nueva imagen y dispara la transicion
				newImg = new Image();
				newImg.src = _options.baseUrl + images[imageIndex] + "/" + parseInt(_options.carrouselConfig.photo.width,10) + "x" + parseInt(_options.carrouselConfig.photo.height,10);
				if (newImg.complete || newImg.readyState == 4) {
					showImage($thisHotel, newImg, delta);
				}
				else {
					$(newImg).on('load', function() {
						showImage($thisHotel, newImg, delta);
					})
					.on('error', function() {
						activeTransition = false;
					});
				}
			}

			function showImage($thisHotel, img, delta) {
				$img = $(img);
				var $holder = $thisHotel.find('.imgHotel a:first').css('display', 'block');
				var newPhotoOrigin = (delta > 0) ? '150%' : '-50%';
				var oldPhotoDestination = (delta > 0) ? '-50%' : '150%';
				//situa la foto nueva	
				$img.addClass("photo-transition")
					.css({'display' : 'block', 'position': 'absolute', 'top' : '50%', 'margin-top': -img.height/2, 'margin-left' : -img.width/2, 'left' : newPhotoOrigin })
					.appendTo($holder);
				//anima la imagen vieja
				var imgFirst = $holder.find('img:first');
				imgFirst
					.css({'display' : 'block', 'position': 'absolute', 'top' : '50%', 'margin-top': -imgFirst.height()/2, 'margin-left' : -imgFirst.width()/2, 'left' : '50%' })
					.animate({left: oldPhotoDestination}, 400, function() {
					if (this[0] != img) $(this).remove();
				});
				//anima la imagen nueva
				$(img).stop().animate({left: '50%'}, 400, function() {
					activeTransition = false;
				});
			}
			
	
	function isPlaying() {
		return playing;
	}
	
	function resize() {
		var dimensionsFromObj = $hotel.find('.imgHotel:first');
		_options.carrouselConfig.photo.width = parseInt(dimensionsFromObj.width(),10);
		_options.carrouselConfig.photo.height = parseInt(dimensionsFromObj.height(),10);
	}
	
	
	 return {
			init : init,
			isPlaying : isPlaying,
			start : start
		};
	}(jQuery));
