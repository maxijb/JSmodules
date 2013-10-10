
	
	
	registerNameSpace('Details.Modules.Panorama.SimplePanorama');
	
	Details.Modules.Panorama.SimplePanorama = (function($, undefined) {
	
		var _options = {};
		var $popup, $frame, $opaque, $list;
		var maxToursByPage = 4;
		var actualPage, itemWidth;
			
		function init(options) {

			logger.info("Inicializando SimplePanorama");

			_options = options;
			var content = "<div id='frame'></div><div class='list-holder'><ul>";
			for  (var i in options.virtualTours) {
					content += "<li id='" + options.virtualTours[i].key +"' data-type='"+options.virtualTours[i].multimediaType+"'>" + options.virtualTours[i].description + "</li>";
			}
			content += "<span class='prev'>&lsaquo;</span><span class='next'>&rsaquo;</span></ul></div>";
			Common.Utils.Helper.createUXPopup('panorama-popup', content, '', true, '', 'dialog');
			
			$popup = $('#panorama-popup');
			$frame = $popup.find('#frame');
			$opaque = $('.opaque');
			$list = $popup.find('.list-holder');
			$('.overlay360, .panoramaLauncher').off().click(function() {
				openPanoramaPopup();
			});
			
			$popup.find('li').click(function() {
				if ($(this).hasClass('active')) return;
				$(this).addClass('active').siblings().removeClass('active');
				var index = $list.find('li').index(this);
				scrollItems(Math.floor(index / maxToursByPage));
				launchPanorama(this);
			});
			
			$popup.find('.popup-close').off().click(function(e) {
				e.stopImmediatePropagation();
				$(document).off('keydown.panorama');
				$opaque.off('click.panorama').hide();
				$popup.hide();
				return false;
			});
			
			
			var itemsCount = $list.find('li').length;
			if (itemsCount <= maxToursByPage) {
				$list.find('.next, .prev').hide(); //addClass('disabled');
				maxPage = 0;
			}
			else {
				itemWidth = $list.find('li:first').outerWidth();
				actualPage = 0;
				maxPage = Math.floor((itemsCount - 1) / maxToursByPage);
				$list.find('.next, .prev').click(function() {
					if ($(this).hasClass('disabled')) return;
					var direction = $(this).hasClass('next') ? 1 : -1;
					scrollItems(actualPage + direction);
				});
			}
			var moveCount = itemsCount % maxToursByPage;
			if (moveCount) {
				var moveItemEq = maxPage * maxToursByPage;
				var moveTo = 731 / 2 - (moveCount * 100);
				$list.find("li:eq(" + moveItemEq + ")").css('margin-left', moveTo + 'px');
			}
			
			
			
		}
		
		function openPanoramaPopup() {
			$opaque.show()
				.on('click.panorama', function(e) {
					e.stopImmediatePropagation();
					$popup.find('.popup-close').click();
					return false;
				});
			
			$popup.removeClass('popup').show();
			//si no se abrio antes ninguno, abre el primer panorama
			if (!$frame.children().length) {
				$popup.find('li:first').click();
			}
			
			$(document).on('keydown.panorama', function(e) {
				if (e.keyCode == 27) {
					$popup.find('.popup-close').click();
				}
				if (e.keyCode == 39) {
					$list.find('li.active').next('li').click();
				}
				if (e.keyCode == 37) {
					$list.find('li.active').prev('li').click();
				}
			});
		}
	
		function launchPanorama(obj) {
			$frame.simplePanorama({ direction:0, 
									debug:false, 
									momentum:10, 
									img: _options.mediaBaseUrl + obj.id 

									},
									{ enabled:false });
		}

		function scrollItems(page) {
			actualPage = page;
			if (actualPage < 0) actualPage = maxPage;
			if (actualPage > maxPage) actualPage = 0;
			var left = - actualPage * itemWidth *  maxToursByPage;
			$list.find('ul').animate({'margin-left': left + 'px'});
		}
	
		return {
			init: init
		};
	
	}(jQuery));
	
	
	
/**
 * Plugin de jquery que se encarga de mostrar el panorama
 */	
	
(function($) {
	
	$.fn.extend({
		simplePanorama: function( optPano, optCompass ) {
			
/* Initialize for each instance */
			
			this.each(function(){
				
			var setPano = {
				width		:	$(this).width(),            // width of the panoscoper frame
				height		:	$(this).height(),		// height of the panoscoper frame
				ratio 		:   $(this).height() / $(this).width(),
				direction	:	0,							// the point of view to start with
				momentum	:	80,							// speed at which to move
				zMomentum 	: 	0.12,
				autorotationSpeed : 25  
			};
			
			var setCompass = { 
				enabled		:	false,						// Sets the compass on or off
				url			:	'compass.png',				// URL string to the image used for the compass
				width		:	100,						// The width of the compass image
				height		:	100,						// the height of the compass image
				bearing		:	0							// The direction of north
			};
			
			var camera = {};
			
			var spinner = new Spinner({  
				lines: 11, // The number of lines to draw
				length: 7, // The length of each line
				width: 4, // The line thickness
				radius:11, // The radius of the inner circle
				color: '#fff', // #rgb or #rrggbb
				position: 'absolute',
				autoPosition: false //custom parameter for Despegar que indica si overridea al css
			});
			
			var autoRotation = false;
			var imgOriginal = {};
			var interAnim = null;
			var pano, panobox, panoviewer, panoframe, panotile, pagepos, panocompass, panodebug, boxwidth, initialMouseEvent;
			var xmov = 0,
			ymov = 0,
			zmov = 0,
			isDragging = false,
			dragState = {}; //estas tres definen el movieminto de la camara
			if ( optPano ) {
				setPano =  $.extend(setPano, optPano);
			}
			
			var $this = $(this).addClass('panorama-container').empty();
			//backgorund para ie
			if (!$this.prev('div#backPanorama').length) {
				$this.before("<div id='backPanorama' style='position:fixed; background: #000; top: 0; left: 0; width: 100%; height: 100%; display:none;'></div>");	
			}
			$this.append("<div class='overlays'><span class='sprite-360 full-screen spr-ico-fullscreen'></span><span class='sprite-360 zoom spr-ico-zoom'></span><span class='spr-ico-less-zoom sprite-360 less-zoom'></span><span class='left-autorotator'>&lsaquo;</span><span class='right-autorotator'>&rsaquo;</span><div class='sprite-360 line spr-ico-line'><span class='sprite-360 spr-ico-control-zoom zoomBar'></span></div></div>");
			spinner.spin($this[0]);
			$overlays = $('.overlays').hide();
			
			$overlays
			.find(".full-screen").mousedown(function(e) {
				e.preventDefault();
				e.stopPropagation();
				toggleFullScreen();
			})
			.end().find(".right-autorotator").mousedown(function(e) {
				e.preventDefault();
				e.stopPropagation();
				checkIfSizeSet();
				autoRotation = true;
				xmov = setPano.autorotationSpeed;
				ymov =0 ;
				startAnimation();
				return false;
			})
			.end().find(".left-autorotator").mousedown(function(e) {
				e.preventDefault();
				e.stopPropagation();
				checkIfSizeSet();
				autoRotation = true;
				xmov = -setPano.autorotationSpeed;
				ymov =0 ;
				startAnimation();
				return false;
			})
			.end().find(".zoom").mousedown(function(e) {
				e.preventDefault();
				e.stopPropagation();
				zmov = 1.02;
				if (!autoRotation)
				{ xmov=0; }
				startAnimation();
				$(document).on('mouseup', function() {
					zmov = 0;
					if (!autoRotation)
					{ killAnimation(); }
					$(document).off('mouseup');
				});
				return false;
			})
			.end().find(".less-zoom").mousedown(function(e) {
				e.preventDefault();
				e.stopPropagation();
				zmov = 0.98;
				if (!autoRotation)
				{ xmov=0; }
				startAnimation();
				$(document).on('mouseup', function() {
					zmov = 0;
					if (!autoRotation)
					{ killAnimation(); }
//					
					$(document).off('mouseup');
				});
				return false;
			})
			.end().find('.zoomBar').mousedown(function(e) {
				e.preventDefault();
				e.stopPropagation();
				isDragging = true;
				dragState = {
						min : 0,
	 					max : $this.find('.line').width() - $this.find('.zoomBar').width(),
	 					minMouse :  $this.find('.line').offset().left ,
	 					maxMouse :  $this.find('.line').offset().left + $this.find('.line').width() - $this.find('.zoomBar').width(),
	 					width :  $this.find('.line').width() - $this.find('.zoomBar').width(),
	 					lastX : e.clientX
				};
				$(document).bind('mouseup', function() {
					stopDrag();
				})
				.bind('mousemove', function(e) {
					e.preventDefault();
					e.stopPropagation();
					drag(e);
					return false;
				});
				return false;
			});
			
			
			function stopDrag() {
				$(document).unbind('mousemove').unbind('mouseup');
			}
			
			function drag(e) {
				if (e.clientX >= dragState.minMouse && e.clientX <= dragState.maxMouse) {
						var newX = e.clientX - dragState.minMouse;							
						$this.find('.zoomBar').css('left', newX+'px');
					
					var zoomPercent = (newX) / dragState.width;
					updateCameraHeight(null, false, (camera.minHeight + camera.deltaHeight * zoomPercent));
				}
			}
			
			/******* Load th eimages and launch the pnorama *******/
				imgLoaded = new Image();
				imgLoaded.src = setPano.img;
				if (imgLoaded.complete || imgLoaded.readyState == 4) {
					launchPanorama();
				}
				else {
					$(imgLoaded).load(function() {
						launchPanorama();
					});
				}
			
				
				
				
				function launchPanorama() {
					var panoappend = '<div id="'+$(this).attr('id')+'-viewer" class="panoviewer">\
					<div id="'+$(this).attr('id')+'-box" class="panobox">\
					<img src="'+setPano.img+'" id="'+$(this).attr('id')+'-img" class="pano-tile"/>\
					<img src="'+setPano.img+'" id="'+$(this).attr('id')+'-clone" class="pano-tile"/>\
					</div>\
					</div>';
					/******* Apply options and CSS, then wrap, clone the element and insert it after *******/
					$this.attr('id', $this.attr('id') )
						.addClass("panoframe")
						.attr('unselectable','on')
						.css('-moz-user-select','none')
						.css('-webkit-user-select','none')
						.append(panoappend)
						.find("img")
						.css('margin', '0')
						.css('float', 'left')
						.css('display', 'block');
					
					// takes the dimension of the origina img
					originalImage = { width: imgLoaded.width,
									  height: imgLoaded.height,
									  ratio : (imgLoaded.width / imgLoaded.height)
									};
					//camera is the object who records info of camera
					panotile = $('.pano-tile', $this).hide();
					pano = $this.find("img.pano-tile:first");
					panobox = pano.parent();
					camera = {
						x: 0
					};
					
					
					/******* The panoviewer is a wrapper for future features (multiple layering) *******/
					
					var panoviewer = panobox.parent();

					panoviewer.css('height', '100%')
					.css('width', '100%')
					.css('display', 'block')
					.css('overflow', 'hidden');
					
					
					
					/******* The panoframe houses all the elements, It is for decorations and mouse events. *******/
					
					panoframe = panoviewer.parent();
					panoframe.css('height', setPano.height)
					.css('width', setPano.width)
					.css('clear', 'both')
					.css('position', 'relative')
					.css('overflow', 'hidden');
					
					
					panoframe.mousedown(function(e){
						e.preventDefault();
						checkIfSizeSet();
						initialMouseEvent = {
								x : e.pageX,
								y: e.pageY
						};
						autoRotation = false;
						calculateMovFromMouse(e);
						startAnimation();
						
						$(document).on('mouseup', function() {
							killAnimation();
							$(document).off('mouseup');
							panoframe.off('mousemove');
						});
					
										
						panoframe.on('mousemove', function(e){
							e.preventDefault();
							calculateMovFromMouse(e);
							return false;
						});

					});
					
					//bindea el evento de la rueda
					try {
						$this[0].addEventListener("mousewheel", wheelAction);
						$this[0].addEventListener("DOMMouseScroll", wheelAction);
					}
					catch(e) {
						//para ie 7 y 8
						$this[0].attachEvent("onmousewheel", wheelAction);
					}
					
					//espera 100 milisegundos mientras se adecua el DOM y muetsra todo
					setTimeout(function() {
						updatePlayerSize();
						panotile.fadeIn(400);
						$overlays.show().find('.right-autorotator').mousedown();
						spinner.stop();
					}, 100);
				}
				
				//si no se seteo el tamaño lo inicializa
				function checkIfSizeSet() {
					if (!camera.width) {
						updatePlayerSize();
					}
				}
				
				/*
				 * re sets size when player is cretad and goes/comes from fullscreen
				 */ 
				function updatePlayerSize(isFull) {
					var maxH = Math.min($this.height() * 3, Math.max(originalImage.height * 4, $this.height()));
					var minH = Math.max($this.height(), $this.width() / originalImage.ratio); 
					panotile.height(minH);
					$.extend(camera, {
							minHeight : minH,
							maxHeight : maxH,
									z : $this.height(),
									y : ((pano.height() - $this.height()) / -2),
							     width: pano.width(),
								height: pano.height(),
								isFullScreen : isFull
					});
					
					camera.deltaHeight = camera.maxHeight - camera.minHeight;
					boxwidth = pano.outerWidth() * 2+1;
					
					panobox.width(boxwidth).css('marginLeft', -setPano.direction+'px');
					updateZoomBar();
				}
				
				
				/**
				 * maneja la rueda del mouse
				 */
				function wheelAction(e) {
					var _e = e ? e : window.event;
					//e.detail es para firefox, el resto para ie y webkit
					wheelDelta = _e.detail ? _e.detail *  -40 : _e.wheelDelta;
					try {
						_e.preventDefault();
					}
					catch(ex) {
						//para ie
						_e.returnValue = false;
					    _e.cancelBubble = true;
					    _e.cancel = true;
					}
			        var percentTransform =  1 + (wheelDelta * setPano.zMomentum / 100);
			        updateCameraHeight(percentTransform);
			        return false;
				}
				
				/**
				 * Se llama cuando se actualiza el zoom 
				 */
				function updateCameraHeight(percentTransform, dontUpdate, fixedHeight) {
					var h;
					if (!fixedHeight) {
						
						//calcula el nuvo height si viene un porcentaje
						h = limitValue((camera.height * percentTransform), camera.minHeight, camera.maxHeight);
						percentTransform = h / camera.height;
					}
					else {
						h = limitValue(fixedHeight, camera.minHeight, camera.maxHeigth);
						percentTransform = h / camera.height;
					}
					//no hubo cambios entonces cancela
					if (percentTransform == 1) return;
					panotile.height(h);
					camera.height = h;
					camera.width = panotile.filter(":first").width();
					panobox.height(h).width(camera.width*2+1);
					
					//actualiza valores de camara para hacer zoom desde el centro de la vista
					camera.x = camera.x * percentTransform;
					camera.x = camera.x + ($this.width()/2 * (1- percentTransform) );
					camera.y = camera.y + ($this.height()/2 * (1- percentTransform) );
					camera.y = limitValue(camera.y, -(camera.height - $this.height()), 0);
					
					//si no viene fixed height es porque el evento no se origina en la barra de zoom, por lo que hay que actualizarla
					if (!fixedHeight) updateZoomBar();
					//si hace falta actualizar la vista
					if (!dontUpdate) updatepano();
				}
				
				/**
				 * Actualiza la posicion de la barra de zoom
				 */
				function updateZoomBar() {
					var percentZoom = 100 / camera.deltaHeight * (camera.height - camera.minHeight);
					$this.find(".zoomBar").css("left", percentZoom+"%");
				}
				
				
				/*
				 * Calcula los movimientos que deben hacerse de acuerdo a la posicion del mouse
				 */
				function calculateMovFromMouse(e) {
					xmov = e.pageX-initialMouseEvent.x;
					if( camera.minHeight != camera.maxHeight ) {
						ymov = e.pageY-initialMouseEvent.y;
					}
				}
				
				/*
				 * Inicia la animacion que actualiza la vista cada 20 millisegundis
				 */
				function startAnimation() {
					if (interAnim) clearInterval( interAnim );
					interAnim = setInterval( function(){ updatepano(); } , 20);
				}
				/*
				 * Detiene el interval de refresh
				 */
				function killAnimation() {
					clearInterval( interAnim );
					interAnim = null;
				}
				
				/*
				 * devuelve el valor si esta en el rango, o sino el min o max
				 */
				function limitValue(actual, min, max) {
					if (actual < min) return min;
					return (actual > max) ? max : actual;
				}

				
				/**
				 *  Main update function 
				 *  */
				
				function updatepano() {
				
			/******* Get the current location and the amount of calculated movement *******/
					if (zmov != 0) {
						updateCameraHeight(zmov, true);
					}
					var amountToMove = (camera.x - xmov / setPano.momentum) % camera.width;
					// Check if it's too far to the left and jump to the opposite end if true *******/
					if (amountToMove >= 0) {
						camera.x -= camera.width;
						amountToMove = (camera.x - xmov / setPano.momentum) % camera.width;
					}
					camera.x = amountToMove;
					
			/******* Vertcial movement *******/
					if (ymov != 0) {
						yDestination = camera.y - ymov / setPano.momentum;
						if (yDestination > 0) yDestination = 0;
						if (yDestination <= -(camera.height - $this.height())) yDestination = -(camera.height - $this.height());
							camera.y = yDestination;
					}
					
					panobox.css({'marginLeft': camera.x, 'marginTop' : camera.y});
				}
			
				
				
				/*
				 * Pide la fullscreen de acuerdo al browser
				 */
				function toggleFullScreen() {
					element = $this[0];
					var requestMethod;
					if (!camera.isFullScreen) {
						// Supports most browsers and their versions.
						requestMethod = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || element.msRequestFullScreen;
						if (requestMethod) { // Native full screen.
							requestMethod.call(element);
						}
					} else {
						requestMethod = document.cancelFullScreen || document.webkitCancelFullScreen || document.mozCancelFullScreen || document.msCancelFullScreen;
						if (requestMethod) { // Native full screen.
							document.webkitIsFullScreen ? document.webkitCancelFullScreen() : document.mozFullScreen ? document.mozCancelFullScreen() : document.fullScreen && (document.cancelFullScreen ? document.cancelFullScreen() : document.exitFullscreen && document.exitFullscreen());
						}
					}
					// Older IE.
					if (!requestMethod) {
						try {
							if (typeof window.ActiveXObject !== "undefined") { 
								var wscript = new ActiveXObject("WScript.Shell");
								if (wscript !== null) {
									if ((!camera.isFullScreen && window.screenTop) || (camera.isFullScreen && !window.screenTop)) {
										$(document).off('keydown.fullScreen');
										wscript.SendKeys("{F11}");
									}
								}
							}
						}
						catch (e) {
							$(document).off('keydown.fullScreen');
						}
						fullScreenSize();
					}
					
				}
				
				//setea eventos para salida de fullscreeen en los diferentes navegadores
				try {
					document.addEventListener("webkitfullscreenchange", function(){
						fullScreenSize();
					}, false);
				} catch(e) {}
				
				try {
					document.addEventListener("mozfullscreenchange", function(){
						fullScreenSize();
					}	, false);
				} catch(e) {}
				
				try {
					document.addEventListener("msfullscreenchange", function(){
						fullScreenSize();
					}	, false);
				} catch(e) {}
				
	            	
				
				
				/*
				 * actualiza el tamanio player de acuerdo a si es fullscreen o no
				 */
				function fullScreenSize() {
					camera.isFullScreen = !camera.isFullScreen;
					if (camera.isFullScreen) {
						var h = $(window).height() * 0.7;
						h = setPano.height > h ? setPano.height : h;
						$this.width($(window).width()).height(h);
						$('#backPanorama').show();
						if ($.browser.msie) {
							var marginTop = ($(window).height() - h) / 2;
							$this.css({"position" : "fixed", "top": marginTop, "left" : 0});
							$('#panorama-popup').find('.list-holder, .popup-close').hide();
							//le agrega un timeout para dejar que vaya al fullscreen y despues impide el F11 en ie9
							setTimeout(function() {
								$(document).on('keydown.fullScreen', function(e) {
									if (e.keyCode == 122) {
										try {
											e.preventDefault();
										} catch(e) {}
										e.returnValue = false;
									     e.cancelBubble = true;
									     e.cancel = true;
										return false;
									}
								});
							}, 50);
						}
					}
					else {
						$this.width(setPano.width).height(setPano.height);
						$('#backPanorama').hide();
						if ($.browser.msie) {
//							$(document).off('keydown');
							$this.css({"position" : "relative", "top" : 0});
							$('#panorama-popup').find('.list-holder, .popup-close').show();
						}
					}
					updatePlayerSize(camera.isFullScreen);
					updateZoomBar();
					updatepano();
				}
				
				
			});
		}
	});
})(jQuery);