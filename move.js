/*
* Move elements.
* https://github.com/psyonline/move
* by @psyonline (http://www.psyonline.kr/, majorartist@gmail.com)
* License - http://creativecommons.org/licenses/by-sa/2.0/kr/
*/
;(function() {

	'use strict';

	var
		isoldie = (/msie/i).test(navigator.userAgent), // ie < 11
		poorbrowser = (/msie [5-8]/i).test(navigator.userAgent),

		$html = document.documentElement,
		$body = null,

		items = [],

		$blocker = create('<div style="position: fixed; left: 0; top: 0; right: 0; bottom: 0; background: #000; z-index: 9999999; opacity: 0;" />'),
		blockeradded = false,

		checkfunctionnames = '',
		functions,

		indexdataname = 'data-movejs-index',

		currentmoveproperty = '',

		supportonwheelevent = 'onwheel' in document || (isoldie && !poorbrowser),

		regblanks = /(	| )+/g,
		regcommas = /,/g,
		regisx = /^(x|f)/,
		regisy = /^(y|f)/,
		regtrim = /(^ +| +$)/g,

		pointerenabled = window.navigator.pointerEnabled || window.navigator.msPointerEnabled || false,

		transformname = 'transform',
		transformable = true,
		transform3dable = true,

		moveoption = {
			minduration: 500,
			maxduration: 1750,
			normal: {easing: 'easeOutCubic', onupdate: onanimate, onend: onanimated},
			wheel: {easing: 'easeOutQuart', onupdate: onbackanimate, onend: onanimated},
			back: {easing: 'easeOutCubic', onupdate: onbackanimate, onend: onbackanimated},
			zoom: {duration: 450, easing: 'easeInOutQuad', onupdate: onbackanimate, onend: onbackanimated},
			zoomback: {duration: 250, easing: 'easeOutCubic', onupdate: onbackanimate, onend: onbackanimated}
		},

		minmovesize = 2,

		scrollleft = 0,
		scrolltop = 0,

		isscaling = false,

		prevbodycsstext,
		prevbodyonselectstart;


	window._move = initialize;

	if (window.jQuery) {
		jQuery.fn._move = function(_option) {
			if (!_option || $.isPlainObject(_option)) {
				this.each(function() {
					jQuery(this).data('_move', initialize(this, _option));
				});
			}
			return this;
		}
	}

	window.addEventListener('scroll', function(e) {
		scrollleft = window.scrollX || $html.scrollLeft || $body.scrollLeft;
		scrolltop = window.scrollY || $html.scrollTop || $body.scrollTop;
	});


	function initialize(target, option) {

		var index = items.length,
			// _option = $.extend(true, {}, _option);
			_option = option || {},
			item, control, touchaction;


		_option.direction = (_option.direction || 'auto').replace(regblanks, '').replace(regcommas, '');
		_option.animate = _option.animate === false ? false : true;
		_option.throwable = _option.throwable === false ? false : true;
		_option.outofbounds = _option.outofbounds === false ? false : true;
		_option.preventtouches = _option.preventtouches === false ? false : true;

		item = {
			a: true, // activated
			b: null, // bounds
			c: _option.classongrabbing === undefined ? 'grabbing' : _option.classongrabbing,
			d: false, // swipe direction
			e: { // each event handlers for handle event from document element
				m: createeventhandler(move, target, index),
				u: createeventhandler(up, target, index),
				s: createeventhandler(snapafterwheel, target, index),
				p: createeventhandler(pinchchange, target, index),
				e: createeventhandler(pinchend, target, index)
			},
			h: target.offsetHeight,
			i: index,
			l: 0, // last move time,
			m: 'd', // move by. d = drag, w = wheel, c = custom
			o: _option,
			p: {}, // points
			q: false, // target is out of bounds
			r: 0, // check need return to bounds
			s: null, // scroll mode options
			t: {
				min: _option.minduration || moveoption.minduration,
				max: _option.maxduration || moveoption.maxduration
			},
			$t: target,
			u: poorbrowser || !transformable || _option.usetransform === false ? 'left-top' :
				!transform3dable || _option.usetransform == '2d' ? 'x-y-2d' :
				'x-y',
			v: !!_option.valuesonly,
			w: target.offsetWidth,
			x: 0, // current x
			y: 0, // current y
			_x: 0, // destination x
			_y: 0, // destination y
			z: 1, // current scale
			_z: 1, // destination scale
			z_: null, // scale mode options
			_: null // bar
		};

		item.$t.setAttribute(indexdataname, index);

		if (!item.v) {

			item.$t.style[transformname +'Origin'] = '0 0 0';
			item.$t.style.willChange = 'transform';
			if (getstyle(item.$t, 'position') == 'static') {
				item.$t.style.position = 'relative';
			}

			// set ms tablet enable touch direction
			if (pointerenabled) {
				touchaction = _option.direction == 'x' ? 'pan-y' : _option.direction == 'y' ? 'pan-x' : 'none';
				if (window.navigator.pointerEnabled) {
					item.$t.style.cssText += 'touch-action: '+ touchaction +';';
				} else if (window.navigator.msPointerEnabled){
					item.$t.style.cssText += '-ms-touch-action '+ touchaction +';';
				}
			}

		}

		addevent(item.$t, {'mousedown touchstart': down, 'dragstart': preventdefault});

		if (_option.scroll) {
			item.s = typeof(_option.scroll) == 'object' ? _option.scroll : {};
			item.s.wheelanimate = item.s.wheelanimate === false ? false : true;
			item.s.preventwheels = item.s.preventwheels === false ? false : true;
			item.s.usewheel !== false && addevent(item.$t, supportonwheelevent ? {'wheel': wheel} : {'mousewheel DOMMouseScroll': wheel});
			if (item.s.bar !== false) {
				// item._ = _move._bar(item, item.s.bar, globals);
				item._ = bar(item, item.s.bar);
			}
			delete item.s.usewheel;
			delete item.s.bar;
		}

		item.z_ = typeof(_option.scale) == 'object' ? _option.scale : {};
		item.z_.min = item.z_.min || item.z_.min === 0 ? item.z_.min : 1;
		item.z_.max = item.z_.max || 1;
		item.z = item._z = Math.max(item.z_.min, Math.min(item.z_.max, item.z_.initial || 1));
		item.z_.dbl = item.z_.dblclick !== false;
		if (item.z != item.z_.min || item.z != item.z_.max) {
			addevent(item.$t, {
				'dblclick': item.z_.dblclick !== false ? zoom : null,
				'gesturestart': item.z_.pinch !== false ? pinchstart : null
			});
			delete item.z_.initial;
			delete item.z_.dblclick;
			delete item.z_.pinch;
		} else {
			delete item.z_;
		}

		if (_option.snap) {
			item.e.s = createeventhandler(snapafterwheel, target, index);
			item.e.t = null; // snap timer
		}

		if (!isarray(_option.bounds)) {
			if (iselement(_option.bounds)) {
				item.$b = _option.bounds;
			} else {
				item.$b = target.parentNode;
			}
			if (item.v) {
				item.o.bounds = [-Infinity, -Infinity, Infinity, Infinity];
			} else {
				item.o.bounds = [0, 0, 0, 0];
			}
		}

		items[index] = item;

		item.f = control = controller.set({index: index});

		if (!$body) {
			$body = document.body;
		}

		reset(index, true);

		return control;

	};

	var controller = {

		left: function(x, withoutanimation) {
			if (x == undefined) {
				return -items[this.index].x;
			}
			movebox(this.index, -x, '', '', '', withoutanimation);
		},

		top: function(y, withoutanimation) {
			if (y == undefined) {
				return -items[this.index].y;
			}
			movebox(this.index, '', -y, '', '', withoutanimation);
		},

		to: function(x, y, withoutanimation) {
			movebox(this.index, -x, -y, '', '', withoutanimation);
		},

		scale: function(value, percentx, percenty, withoutanimation) {
			if (value == undefined || value == items[this.index].z) {
				return items[this.index].z;
			}
			setscale(this.index, value, percentx, percenty, withoutanimation);
		},

		enable: function() {
			items[this.index].a = true;
		},

		disable: function() {
			items[this.index].a = false;
		},

		reset: function() {
			reset(this.index);
		},

		// set controls to item. won't return.
		set: function(target) {
			var key;
			for (key in this) {
				if (key != 'set') {
					target[key] = this[key];
				}
			}
			target.x = target.left;
			target.y = target.top;
			return target;
		}

	}

	function reset(index, frominitialize) {

		var item = items[index],
			x, y;

		setbounds(item, frominitialize === true);

		x = getedgex(item);
		y = getedgey(item);
		
		setposition(item, x, y);

		// fireevent(item, 'reset', x, y); // must fire with set bounds

	}

	function setbounds(item, setdefault) {

		var bounds = item.o.bounds.slice(),
			boundwidth, boundheight,
			x, y, itemwidth, itemheight;

		if (item.v) {
			item.b = bounds;
			return;
		}

		itemwidth = item.$t.offsetWidth;
		itemheight = item.$t.offsetHeight;

		item.w = itemwidth*item._z;
		item.h = itemheight*item._z;

		if (item.$b) { // bounds is element
			boundwidth = item.$b.offsetWidth;
			boundheight = item.$b.offsetHeight;
		} else {
			boundwidth = bounds[2];
			boundheight = bounds[3];
		}
		if (item.s || itemwidth > boundwidth) {
			bounds[2] = bounds[0];
			bounds[0] = boundwidth-item.w;
			if (setdefault) { // set to default position
				item.x = bounds[2];
			}
		} else {
			bounds[2] = item.s ? item.w : boundwidth-item.w;
			if (setdefault) { // set to default position
				item.x = bounds[0];
			}
		}
		if (item.s || itemheight > boundheight) {
			bounds[3] = bounds[1];
			bounds[1] = boundheight-item.h;
			if (setdefault) { // set to default position
				item.y = bounds[3];
			}
		} else {
			bounds[3] = item.s ? item.h : boundheight-item.h;
			if (setdefault) { // set to default position
				item.y = bounds[1];
			}
		}
		bounds[4] = boundwidth;
		bounds[5] = boundheight;
		item.b = bounds.slice();

		// displaybounds(item.index, bounds, item.$t.parentNode); // test

		fireevent(item, 'reset', x, y);

	}

	function down(e) {

		var index, item;

		if (2 > e.which) {

			index = getindex(this);
			item = items[index];

			if (!item.a) {
				return false;
			}

			stopanimation(index);

			if (item.z != item._z) {
				item._z = item.z;
				setbounds(item);
			}

			setposition(item, getedgex(item, true), getedgey(item, true));

			item.d = false;
			item.p.d = getpoint(e);
			item.p.m = item.p.l = item.p.d.slice();
			item.p.p = [item.x, item.y];

			item.m = 'd';

			addevent($html, {
				'mousemove touchmove': item.e.m,
				'mouseup touchend': item.e.u
			});

			if (e.type == 'mousedown' && item.c) {
				$body.className += ' '+ item.c;
			}

			disablebodyselect();

			// preventdefault(e); // this function blocks click in touch based device

		}

	}

	function disablebodyselect() {
		prevbodycsstext = $body.style.cssText;
		$body.style.cssText += '-webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none;';
		prevbodyonselectstart = $body.onselectstart;
		$body.onselectstart = returnfalse;
	}

	function enablebodyselect() {
		$body.style.cssText = prevbodycsstext;
		$body.onselectstart = prevbodyonselectstart;
	}

	function move(index, e) {

		var	item = items[index],
			points = item.p,
			bounds = item.b,
			x, y, degree;


		if (points.c > 0) { // save points one step before.
			points.k = points.l;
		}

		points.l = points.m;
		points.m = getpoint(e);

		if (!item.d) {
			item.d = item.o.direction;
			//  / 0 \
			// 90   90
			//  \180/
			degree = Math.abs((Math.atan2(points.d[0]-points.m[0], points.d[1]-points.m[1])*180)/Math.PI);
			if (item.d == 'auto') {
				item.d = 121 > degree && degree > 59 ? 'x' : 31 > degree || degree > 149 ? 'y' : 'free';
			} else if (item.d == 'xy') {
				item.d = degree > 45 && 135 > degree ? 'x' : 'y';
			}
			if (!item.o.preventtouches && !isscaling && istouch(e)) {
				if (
					// opposite direction
					(item.d == 'x' && (45 > degree || degree > 135)) || 
					(item.d == 'y' && (degree > 45 && 135 > degree)) ||
					// same direction
					(item.d == 'x' && ((item.x == bounds[2] && points.m[0] > points.l[0]) || (item.x == bounds[0] && points.l[0] > points.m[0]))) ||
					(item.d == 'y' && ((item.y == bounds[3] && points.m[1] > points.l[1]) || (item.y == bounds[1] && points.l[1] > points.m[1])))
				) {
					removeeventsformove(item);
					return true;
				}
			}
		}

		if (regisx.test(item.d)) {
			x = points.p[0]+points.m[0]-points.d[0];
			if (!item.o.outofbounds) {
				x = getedgex(item, true, x);
			}
		}
		if (regisy.test(item.d)) {
			y = points.p[1]+points.m[1]-points.d[1];
			if (!item.o.outofbounds) {
				y = getedgey(item, true, y);
			}
		}

		!isscaling && setposition(item, x, y);

		item.l = gettime();
		points.c++;

		if (!blockeradded && !istouch(e) &&
			Math.max(Math.abs(points.d[0]-points.m[0]), Math.abs(points.d[1]-points.m[1])) > minmovesize) {
			$body.appendChild($blocker);
			blockeradded = true;
		}

		preventdefault(e);

	}

	function up(index, e) {

		var	item = items[index],
			points = item.p,
			lastpoint = points.k || points.l,
			movedx = points.m[0]-points.l[0],
			movedy = points.m[1]-points.l[1],
			x, y, time;

		if (item.o.throwable && (!item.q || 
				((item.q == 1 || item.q == 3) && 0 > movedx) ||
				((item.q == -1 || item.q == -3) && 0 < movedx) ||
				((item.q == 2 || item.q == 3) && 0 > movedy) ||
				((item.q == -2 || item.q == -3) && 0 < movedy)
			) && 100 > gettime()-item.l) {
			if (regisx.test(item.d) && Math.abs(movedx) > minmovesize) {
				x = item.x+(points.m[0]-lastpoint[0])*20;
			}
			if (regisy.test(item.d) && Math.abs(movedy) > minmovesize) {
				y = item.y+(points.m[1]-lastpoint[1])*20;
			}
			movebox(index, x, y);
		} else if (item.q) { // return to bounds
			item.r = 1;
			onanimated.call(items[index]);
		} else if (movedx || movedy) { // snap and position rounding
			movebox(index, x, y, 'back');
		}

		// check double tab for zoom
		if (item.z_ && item.z_.dbl && istouch(e) &&
			minmovesize > Math.max(Math.abs(movedx), Math.abs(movedy))) {
			time = new Date().getTime();
			if (item.z_.l && 500 > time-item.z_.l) {
				zoom.call(item.$t, e);
			}
			item.z_.l = time;
		}

		item.p.c = 0;
		item.p.k = null;

		removeeventsformove(item);

		if (blockeradded) {
			removeme.call($blocker);
			blockeradded = false;
		}

		if (item.c) {
			$body.className = $body.className.replace(item.c, '');
		}

		isscaling = false;

		// preventdefault(e);

	}

	function wheel(e) {

		var index, item, bounds,
			deltax, deltay, x, y;

		if (e.ctrlKey) { // zoomming action in some browsers
			return true;
		}

		index = getindex(this);
		item = items[index];

		if (!item.a) {
			return false;
		}

		bounds = item.b;
		deltax = e.deltaX !== undefined ? e.deltaX : e.wheelDeltaX || 0;
		deltay = e.deltaY !== undefined ? e.deltaY : e.wheelDeltaY !== undefined ? e.wheelDeltaY : e.detail || e.wheelDelta*-1;

		if (item.s.wheelforx && !deltax) {
			deltax = deltay;
			deltay = 0;
		}
		if (item.o.direction == 'x') {
			deltay = 0;
		} else if (item.o.direction == 'y') {
			deltax = 0;
		}

		if (item.s.wheelanimate && 2 > Math.max(Math.abs(deltax), Math.abs(deltay))) {
			preventdefault(e);
			return false;
		}

		stopanimation(index);

		// sync _x(_y) with x(y)
		if (item.m != 'w') {
			item._x = item.x;
			item._y = item.y;
			item.m = 'w';
		}

		if (!item.s.preventwheels && (
			((deltax > 0 && item.x == bounds[0]) || (0 > deltax && item.x == bounds[2])) ||
			((deltay > 0 && item.y == bounds[1]) || (0 > deltay && item.y == bounds[3]))
			)) {
			return true;
		}

		item._x = Math.max(bounds[0], Math.min(bounds[2], item._x-deltax));
		item._y = Math.max(bounds[1], Math.min(bounds[3], item._y-deltay));

		if (item.s.wheelanimate) {
			movebox(index, item._x, item._y, 'wheel', true);
		} else {
			setposition(item, item._x, item._y, 'b');
		}

		if (item.e.s) {
			clearTimeout(item.e.t);
			item.e.t = setTimeout(item.e.s, 75);
		}

		preventdefault(e);

	}

	function removeeventsformove(item) {
		removeevent($html, {
			'mousemove touchmove': item.e.m,
			'mouseup touchend': item.e.u
		});
		enablebodyselect();
	}

	function movebox(index, x, y, moveoptionkey, withoutsnap, withoutanimation) {

		var item = items[index],
			iszoomming = moveoptionkey && moveoptionkey.indexOf('zoom') != -1,
			withoutanimation, movegap;

		if (!withoutsnap) {
			x = snap(item.o.snap, 'x', x || x === 0 ? x : getedgex(item), item.b[0], item.b[2], item.w > item.b[2]);
			y = snap(item.o.snap, 'y', y || y === 0 ? y : getedgey(item), item.b[1], item.b[3], item.h > item.b[3]);
		}
		if (!item.o.outofbounds || iszoomming || moveoptionkey == 'back' || moveoptionkey == 'wheel') {
			x = getedgex(item, true, x);
			y = getedgey(item, true, y);
		}

		movegap = Math.max(Math.abs(x-item.x), Math.abs(y-item.y));

		!isscaling && movegap && stopanimation(index);
		item.r = 0;

		if (!item.o.animate || withoutanimation === true || (!iszoomming && item.x == x && item.y == y)) {
			if (iszoomming) {
				item.z = item._z;
			}
			setposition(item, x, y, 'b');
			fireevent(item, 'moveend', x, y);
		} else if (iszoomming) {
			animator.set(item, {x: x, y: y, z: item._z}, moveoption[moveoptionkey]);
		} else if (!isscaling) {
			if (!moveoptionkey) {
				moveoptionkey = movegap ? 'normal' : 'back';
			}
			if (moveoptionkey != 'back') {
				fireevent(item, 'throw', x, y);
			}
			if (moveoptionkey == 'wheel') {
				moveoption[moveoptionkey].duration = Math.min(750, item.t.min*2);
			} else if (!iszoomming) {
				moveoption[moveoptionkey].duration = Math.max(item.t.min,
					Math.min(item.t.max,
						moveoptionkey == 'back' ? 0 : movegap*5)
					);
			}
			animator.set(item, {x: x, y: y, z: item._z}, moveoption[moveoptionkey]);
		}

	}

	function setscale(index, _scale, percentx, percenty, withoutanimation, fromgesture) {

		var item = items[index],
			bounds = item.b,
			scale = _scale,
			relatedscale;

		if (fromgesture) {

			relatedscale = scale/item.z_.s;
			item.z = item._z = scale;
			setbounds(item);

			setposition(item,
				(item.z_.p[0]-item.z_.rs[0]*bounds[4])*relatedscale + bounds[4]*percentx,
				(item.z_.p[1]-item.z_.rs[1]*bounds[5])*relatedscale + bounds[5]*percenty);

		} else {

			scale = Math.min(item.z_.max, Math.max(item.z_.min, scale));

			if (scale != item.z) {

				relatedscale = scale/item._z;

				item._z = scale;
				setbounds(item);

				movebox(index,
					(item.x-(percentx || percentx === 0 ? percentx : 0.5)*bounds[4])*relatedscale + bounds[4]*0.5,
					(item.y-(percenty || percenty === 0 ? percenty : 0.5)*bounds[5])*relatedscale + bounds[5]*0.5,
					item.z > item.z_.max || item.z_.min > item.z ? 'zoomback' : 'zoom', false, withoutanimation);

			} else {
				isscaling = false;
				onanimated.call(item);
			}

		}

	}

	function zoom(e) {
		var item = items[getindex(this)], pointrates = getpointratebyparent(item, getpoint(e));
		setscale(item.i, item.z > item.z_.min ? item.z_.min : item.z_.max, pointrates[0], pointrates[1]);
		preventdefault(e);
	}

	function pinchstart(e) {

		var index = getindex(this),
			item = items[index];

		isscaling = true;

		item.z_.s = item.z;
		item.z_.p = [item.x, item.y];
		item.z_.rs = getpointratebyparent(item, getpoint(e));

		addevent($html, {
			'gesturechange': item.e.p,
			'gestureend': item.e.e
		});

	}

	function pinchchange(index, e) {

		var item = items[index],
			scale = item.z_.s*e.scale,
			pointrates = getpointratebyparent(item, getpoint(e));

		if (item.z_.min > scale) {
			scale = item.z_.min+(scale-item.z_.min)/2;
		} else if (scale > item.z_.max) {
			scale = item.z_.max+(scale-item.z_.max)/2;
		}

		setscale(item.i, scale, pointrates[0], pointrates[1], 0, true);

	}

	function pinchend(index, e) {

		var item = items[index],
			pointrates = getpointratebyparent(item, getpoint(e));

		setscale(index, item.z);

		removeevent($html, {
			'gesturechange': item.e.p,
			'gestureend': item.e.e
		});

	}

	function setposition(item, x, y, flag, progress) {

		var bounds, transform;

		if (!x && x !== 0) {
			x = item.x;
		}
		if (!y && y !== 0) {
			y = item.y;
		}

		if (flag != 'b') { // 'b' is 'back'
			bounds = item.b;
			item.q = 0;
			if (bounds[0] > x) {
				x = bounds[0]+(x-bounds[0])/2;
				item.q = -1;
			} else if (x > bounds[2]) {
				x = bounds[2]+(x-bounds[2])/2;
				item.q = 1;
			}
			if (bounds[1] > y) {
				y = bounds[1]+(y-bounds[1])/2;
				item.q = item.q == -1 ? -3 : -2;
			} else if (y > bounds[3]) {
				y = bounds[3]+(y-bounds[3])/2;
				item.q = item.q == 1 ? 3 : 2;
			}
			if (flag == 'f' && item.q) { // 'f' is 'flow'
				if (!item.r) {
					item.r = progress;
				}
				if (progress-item.r > 0.05) {
					stopanimation(item.i);
					onanimated.call(items[item.i]);
				}
			}
		}

		if (item.x != x || item.y != y) {
			fireevent(item, 'move', x, y);
		}

		item.x = x;
		item.y = y;

		if (!item.v) {
			if (item.u != 'left-top') {
				if (item.u == 'x-y') {
					transform = 'translate3d('+ x +'px, '+ y +'px, 0) scale3d('+ item.z +','+ item.z +', 1)';
				} else { // x-y-2d
					transform = 'translate('+ x +'px, '+ y +'px) scale('+ item.z +','+ item.z +')';
				}
				item.$t.style[transformname] = transform;
			} else {
				item.$t.style.left = x +'px';
				item.$t.style.top = y +'px';
			}
		}

	}

	function fireevent(item, type, x, y) {

		var eventdata;

		if (item.o['on'+ type]) {

			// all event datas set to from 0, so min value is always 0.
			eventdata = {
				type: type,
				x: item.b[0] == -Infinity ? -x : x-item.b[0],
				y: item.b[1] == -Infinity ? -y : y-item.b[1],
				scale: item.z,
				max: {x: item.b[2]-item.b[0], y: item.b[3]-item.b[1]}
			};

			if (item.w > item.b[2]) {
				eventdata.x = (eventdata.x-eventdata.max.x)*-1;
			}
			if (item.h > item.b[3]) {
				eventdata.y = (eventdata.y-eventdata.max.y)*-1;
			}

			if (type == 'throw') {
				eventdata.x = item.x;
				eventdata.y = item.y;
				eventdata.destination = {
					x: Math.max(item.b[0], Math.min(item.b[2], x))-item.b[0],
					y: Math.max(item.b[1], Math.min(item.b[3], y))-item.b[1]
				};
				if (item.w > item.b[2]) {
					eventdata.destination.x = (eventdata.destination.x-eventdata.max.x)*-1;
				}
				if (item.h > item.b[3]) {
					eventdata.destination.y = (eventdata.destination.y-eventdata.max.y)*-1;
				}
			}

			eventdata.percent = {x: eventdata.x/eventdata.max.x, y: eventdata.y/eventdata.max.y};

			item.o['on'+ type].call(item.$t, eventdata);
		}

	}

	function onanimate(e) {
		setposition(this, e.x, e.y, 'f', e.progress);
	}

	function onanimated(e) {
		if (this.q) { // return to bounds
			movebox(this.i, this.x, this.y, 'back');
		} else {
			fireevent(this, 'moveend', this.x, this.y);
		}
	}

	function onbackanimate(e) {
		if (e.z) {
			this.z = e.z;
		}
		setposition(this, e.x, e.y, 'b');
	}

	// function onzoomanimate(e) {
	// 	setposition(this, e.x, e.y, 'b');
	// }

	function onbackanimated(e) {
		this.q = false;
		onanimated.call(this);
	}

	function stopanimation(index) {
		animator.stop(items[index]);
	}

	function getedgex(item, round, value) {
		var bounds = item.b,
			x = value || value === 0 ? value : item.x;
		if (round) {
			x = parseInt(x);
		}
		if (bounds[0] > x) {
			x = bounds[0];
		} else if (x > bounds[2]) {
			x = bounds[2];
		}
		return x;
	}

	function getedgey(item, round, value) {
		var bounds = item.b,
			y = value || value === 0 ? value : item.y;
		if (round) {
			y = parseInt(y);
		}
		if (bounds[1] > y) {
			y = bounds[1];
		} else if (y > bounds[3]) {
			y = bounds[3];
		}
		return y;
	}

	function snap(snapper, flag, to, min, max, reversed) {
		var _to;
		if (snapper !== undefined) {
			if (typeof(snapper) == 'number' || isfunction(snapper)) {
				if (reversed) {
					_to = max;
					max = min;
					min = _to;
				}
				to = to-min;
				max = max-min;
				if (typeof(snapper) == 'number') {
					_to = Math.round(to/snapper)*snapper;
				} else {
					_to = snapper(to*-1)*-1;
				}
				if (Math.abs(to-_to) > Math.abs(to-max)) {
					_to = max;
				}
				return _to+min;
			} else if (isarray(snapper)) {
				return snap(snapper[flag == 'x' ? 0 : 1], flag, to, min, max, reversed);
			} else {
				return snap(snapper[flag], flag, to, min, max, reversed);
			}
		}
		return to;
	}

	function snapafterwheel(index) {
		movebox(index, items[index]._x, items[index]._y, 'wheel');
	}

	function createeventhandler(_function, target, index) {
		return function(e) {
			_function.call(target, index, e);
		}
	}

	function getcssproperty(item, x, y) {
		return item.u == 'x-y' ? {x: x, y: y} : {left: x, top: y};
	}

	function getindex(target) {
		return parseInt(target.getAttribute(indexdataname));
	}

	function displaybounds(index, bounds, parent) {
		var classname = 'dragable-bounds-indicator-'+ index;
		if (!isoldie) {
			// removeme.call(document.querySelector('.'+ classname));
			create('<div class="'+ classname +'" style="position: absolute; left: '+ bounds[0] +'px; top: '+ bounds[1] +'px; width: '+ (bounds[2]-bounds[0]) +'px; height: '+ (bounds[3]-bounds[1]) +'px; border: 1px solid #000; box-sizing: border-box; background: rgba(255, 255, 255, 0.1); z-index: 999; pointer-events: none;" />', parent);
		}
	}

	function create(tag, parent) {
		var element = document.createElement('div');
		element.innerHTML = tag;
		element = element.children[0];
		if (parent) {
			parent.appendChild(element);
		}
		return element;
	}

	function iselement(target) {
		if (target && target.length) {
			return iselement(target[0]);
		}
		return target && target.nodeType && target.nodeType == 1;
	}

	function isarray(target) {
		return target && target.constructor && target.constructor == Array;
	}

	function isobject(target) {
		return $.isPlainObject(target);
	}

	function isfunction(target) {
		return target && target.constructor == Function;
	}

	function removeme() {
		this && this.parentNode && this.parentNode.removeChild(this);
	}

	function getstyle(target, property) {
		return window.getComputedStyle(target, null)[property];
	}


	function setclass(flag, target, name) {
		var base;
		if (target.classList) {
			target.classList[flag](name);
		} else {
			base = (' '+ target.className +' ').replace(new RegExp(' '+ name +' ', 'g'), ' ');
			target.className = trim(((flag == 'add')? base +' '+ name : base).replace(/ +/g, ' '));
		}
	}

	function addclass(target) {
		for (var i = 1; i < arguments.length; i++) {
			setclass('add', target, arguments[i]);
		}
	}

	function removeclass(target) {
		for (var i = 1; i < arguments.length; i++) {
			setclass('remove', target, arguments[i]);
		}
	}

	function setevent(flag, target, pairs) {
		for (var type in pairs) {
			type.split(' ').map(function(current) {
				target[flag +'EventListener'](current, pairs[type], false);
			});
		}
	}

	function addevent(target, pairs) {
		setevent('add', target, pairs);
	}

	function removeevent(target, pairs) {
		setevent('remove', target, pairs);
	}

	function getpoint(e) {
		if (e.touches) {
			e = e.touches[0] || e.changedTouches[0];
		}
		return [e.clientX || e.pageX-scrollleft, e.clientY || e.pageY-scrolltop];
	}

	function getpointratebyparent(item, points) {
		var parent = item.$b || item.$t.parentNode,
			parentposition = parent.getBoundingClientRect();
		return [(points[0]-parentposition.left)/parent.offsetWidth, (points[1]-parentposition.top)/parent.offsetHeight];
	}

	function istouch(e) {
		return e.type.indexOf('touch') != -1;
	}

	function gettime() {
		return new Date().getTime();
	}

	function trim(text) {
		return text.replace(regtrimspace, '');
	}

	function preventdefault(e) {
		e.preventDefault();
	}

	function returnfalse() {
		return false;
	}


	// bar
	var bar = (function() {

		var bars = [],

			directiondataname = 'data-movejs-direction',

			downbar = null,
			downdirection = '',
			downdirectionindex = -1,
			downposition,

			sizeflags = {x: 'width', y: 'height'},
			offsetsizeflags = {x: 'offsetWidth', y: 'offsetHeight'},

			_classnames = {
				x: 'x',
				y: 'y',
				track: 'scroll-track',
				bar: 'bar',
				display: 'display', // when bar need to displayed
				hover: 'hover', // mouse over on content box(movers parent)
				active: 'active' // on drag, on bar move
			},

			minsize = 10;


		function createbar(item, option) {

			var _option = option || {},
				bar = {
					a: false, // active
					c: _option.classnames || {}, // classnames
					g: false, // moving
					i: item.i,
					item: item,
					x: {
						a: 0, // moveable size
						$b: null, // bar element
						c: 0, // current position
						m: false, // size modified
						max: 0, // move target max moveable size
						s: 0, // size
						$t: null // track element
					}, // x bar
					y: {} // y bar, same with x bar
				},
				key;


			for (key in _classnames) {
				bar.c[key] = bar.c[key] || _classnames[key];
			}

			createelements(bar, 'x', bar.c);
			createelements(bar, 'y', bar.c);

			addevent(item.$t.parentNode, {
				'mouseenter': createeventhandler(mouseenter, bar, item.i),
				'mouseleave': createeventhandler(mouseleave, bar, item.i)
			});
			overrideeventhandler(item, 'reset', createeventhandler(onreset, bar, item.i));
			overrideeventhandler(item, 'move', createeventhandler(onmove, bar, item.i));
			overrideeventhandler(item, 'moveend', createeventhandler(onmoveend, bar, item.i));

			bars[item.i] = bar;

			return bar;

		}

		function bardown(e) {

			if (2 > e.which) {

				downbar = bars[getindex(this)];
				downdirection = this.getAttribute(directiondataname);
				downdirectionindex = downdirection == 'x' ? 0 : 1;

				if (!downbar[downdirection].a) {
					return true;
				}

				downposition = getpoint(e);
				downposition[2] = downbar[downdirection].c;

				addevent($html, {
					'mousemove touchmove': barmove,
					'mouseup touchend': barup
				});

				preventdefault(e);

			}

		}

		function barmove(e) {
			var currentposition = getpoint(e),
				to = downposition[2]+currentposition[downdirectionindex]-downposition[downdirectionindex];
			to = Math.max(0, Math.min(downbar[downdirection].a, to));
			downbar.item.f[downdirection](downbar[downdirection].max * to/downbar[downdirection].a, true);
			preventdefault(e);
		}

		function barup(e) {
			unsetactive(downbar);
			downbar = null;
			removeevent($html, {
				'mousemove touchmove': barmove,
				'mouseup touchend': barup
			});
		}

		function mouseenter() {
			addclass(this.x.$t, this.c.hover);
			addclass(this.y.$t, this.c.hover);
		}

		function mouseleave() {
			removeclass(this.x.$t, this.c.hover);
			removeclass(this.y.$t, this.c.hover);
		}

		function onreset(index, e, a) {
			var bar = bars[index], bounds = bar.item.b;
			bar.x.max = e.max.x;
			bar.y.max = e.max.y;
			setsize(bar, 'x', bar.x.max, bounds[4]);
			setsize(bar, 'y', bar.y.max, bounds[5]);
		}

		function onmove(index, e) {
			setposition(this, 'x', e.x/this.x.max);
			setposition(this, 'y', e.y/this.y.max);
		}

		function onmoveend(index, e) {
			setposition(this, 'x', e.x/this.x.max, true);
			setposition(this, 'y', e.y/this.y.max, true);
		}

		function setactive(bar) {
			if (!bar.g) {
				addclass(bar.x.$t, bar.c.active);
				addclass(bar.y.$t, bar.c.active);
				bar.g = true;
			}
		}

		function unsetactive(bar) {
			if (bar.g) {
				removeclass(bar.x.$t, bar.c.active);
				removeclass(bar.y.$t, bar.c.active);
				bar.g = false;
			}
		}

		function setposition(bar, flag, percent, isend) {

			var currentbar = bar[flag],
				$bar = currentbar.$b,
				property = bar.item.u,
				x = flag == 'x' && percent ? currentbar.a*percent : 0,
				y = flag == 'y' && percent ? currentbar.a*percent : 0,
				value = x || y, // assign value before set min/max position
				barsize, transform;

			if (isend) {
				x = Math.round(x);
				y = Math.round(y);
				!downbar && unsetactive(bar); // moved from mover. not bar
			} else {
				setactive(bar);
			}

			x = Math.max(0, Math.min(currentbar.a, x));
			y = Math.max(0, Math.min(currentbar.a, y));
			currentbar.c = x || y;

			// set bar size
			if (0 > value) {
				barsize = currentbar.s+value;
			} else if (value > currentbar.a) {
				barsize = Math.ceil(currentbar.s-(value-currentbar.a));
				value = currentbar.a+currentbar.s-barsize; // fix to end point
				x = !x ? x : value;
				y = !y ? y : value;
			}
			if (barsize !== undefined) {
				currentbar.$b.style[sizeflags[flag]] = (barsize || currentbar.s) +'px';
				currentbar.m = true;
			} else if (currentbar.m) {
				currentbar.$b.style[sizeflags[flag]] = currentbar.s +'px';
			}

			if (property != 'left-top') {
				if (property == 'x-y') {
					transform = 'translate3d('+ x +'px, '+ y +'px, 0)';
				} else { // x-y-2d
					transform = 'translate('+ x +'px, '+ y +'px)';
				}
				$bar.style[transformname] = transform;
			} else {
				$bar.style.left = x +'px';
				$bar.style.top = y +'px';
			}

		}

		function setsize(bar, flag, moveablesize, boundsize) {

			var currentbar = bar[flag],
				tracklength = currentbar.$t[offsetsizeflags[flag]];

			currentbar.c = currentbar.c || 0;
			currentbar.s = Math.round(tracklength*moveablesize/(moveablesize+boundsize));
			if (currentbar.s) {
				currentbar.s = Math.max(minsize, tracklength-currentbar.s);
				currentbar.a = tracklength-currentbar.s;
				currentbar.$b.style[sizeflags[flag]] = currentbar.s +'px';
				addclass(currentbar.$t, bar.c.display);
			} else {
				currentbar.a = 0;
				currentbar.$b.style[sizeflags[flag]] = tracklength +'px';
				removeclass(currentbar.$t, bar.c.display);
			}

		}

		function createelements(bar, flag, classnames) {
			var currentbar = bar[flag];
			currentbar.$t = document.createElement('div');
			currentbar.$t.className = classnames.track +' '+ classnames[flag];
			currentbar.$t.setAttribute(indexdataname, bar.i);
			currentbar.$t.innerHTML = '<div class="'+ classnames.bar +'" '+ indexdataname +'="'+ bar.i +'" '+ directiondataname +'="'+ flag +'"></div>';
			currentbar.$b = currentbar.$t.children[0];
			addevent(currentbar.$b, {'mousedown touchstart': bardown});
			bar.item.$t.parentNode.appendChild(currentbar.$t);
		}

		function overrideeventhandler(item, flag, beforecall) {
			var presetted = item.o['on'+ flag];
			item.o['on'+ flag] = function(e) {
				beforecall(e);
				presetted && presetted.call(item.$t, e);
			}
		}

		return createbar;

	})();


	// support tests for animate
	(function() {

		var div = document.createElement('div'),
			requestanimationframe = 'requestAnimationFrame',
			prefixs = ['Webkit', 'Moz', 'O', 'ms'],
			i, numprefixs = prefixs.length;

		if (div.style[transformname] === undefined) {
			transformname = 'Transform';
			for (i = 0; i < numprefixs; i++) {
				if (div.style[prefixs[i]+transformname] !== undefined) {
					transformname = prefixs[i]+transformname;
					break;
				}
			}
			if ((/^msT/i).test(transformname)) {
				transform3dable = false;
			}
			if (i == numprefixs) {
				transformname = '';
				transformable = transform3dable = false;
			}
		}

		if (!window[requestanimationframe]) {
			requestanimationframe = 'RequestAnimationFrame';
			for (i = 0; i < numprefixs; i++) {
				if (window[prefixs[i]+requestanimationframe] !== undefined) {
					window.requestAnimationFrame = window[prefixs[i]+requestanimationframe];
					window.cancelAnimationFrame = window[prefixs[i] +'CancelAnimationFrame'];
					break;
				}
			}
		}
		if (!window.requestAnimationFrame) {
			window.requestAnimationFrame = (function() {
				var lasttime = 0;
				return function(callback) {
					var currenttime = gettime();
					var timetocall = Math.max(0, 16-(currenttime-lasttime));
					lasttime = currenttime+timetocall;
					return setTimeout(function() { callback(currenttime+timetocall); }, timetocall);
				}
			})();
			window.cancelAnimationFrame = function(id) {
				clearTimeout(id);
			}
		}

		div = null;

	})();


	// simple animator for only set value x/y
	var animator = (function() {

		var tweens = [],

			fps = 60,
			_easing = 'easeOutCubic',

			nowframe = 0,
			totalframes = 0,
			starttime = 0,
			playing = false,

			timer = null,
			timerdelay = 1000/fps,

			easings = {
				easeOutCubic: function(t,b,c,d) {return c*((t=t/d-1)*t*t+1)+b;},
				easeOutQuart: function(t,b,c,d) {return -c*((t=t/d-1)*t*t*t-1)+b;},
				easeInOutQuad: function(t,b,c,d) {if((t/=d/2)<1)return c/2*t*t+b;return -c/2*((--t)*(t-2)-1)+b;}
			};


		function set(target, property, option) {

			var frames = Math.round(fps*option.duration/1000),
				easing = option.easing || _easing,
				tween, p, values = {}, different = false;

			for (p in property) {
				if (target[p] != property[p]) {
					values[p] = getvalues(p, target[p], property[p], frames, easing);
					different = true;
				}
			}

			if (!different) {
				return false;
			}

			stop(target, property);

			tweens.push({
				tg: target,
				vs: values,
				sf: nowframe,
				tf: frames,
				eu: option.onupdate,
				ee: option.onend
			});

			totalframes = Math.max(totalframes, nowframe+frames+fps);

			if ( !playing ) {
				starttime = gettime();
				timer = window.requestAnimationFrame(action);
				playing = true;
			}

		}

		function stop(target) {
			var i = 0, max = tweens.length,
				tween, key;
			for (; i < max; i++) {
				tween = tweens[i];
				if (tween && tween.tg == target) {
					tweens[i] = null;
				}
			}
		}

		function action() {
			nowframe = Math.floor((gettime()-starttime)/timerdelay);
			if (totalframes > nowframe) {
				setproperties(nowframe);
				timer = window.requestAnimationFrame(action);
			} else {
				window.cancelAnimationFrame(timer);
				setproperties(totalframes);
				nowframe = totalframes = 0;
				tweens = [];
				playing = false;
			}
		}

		function setproperties(step) {

			var tween, mystep, myframes,
				p, i = 0, max = tweens.length;

			for (; i < max; i++) {
				tween = tweens[i];
				if (tween && step >= tween.sf) {
					myframes = tween.tf-1;
					mystep = Math.min(myframes, step-tween.sf);
					if (mystep > -1) {
						tween.eu && tween.eu.call(tween.tg, geteventvalue(tween, 'update', mystep, myframes));
						if (mystep == myframes) {
							tween.ee && tween.ee.call(tween.tg, geteventvalue(tween, 'end', mystep, myframes));
							tweens[i] = null;
						}
					}
				}
			}

		}

		function geteventvalue(tween, type, step, totalstep) {
			var values = tween.vs,
				eventvalue = {type: type, progress: step/totalstep},
				p;
			for (p in values) {
				eventvalue[p] = values[p][step];
			}
			return eventvalue;
		}

		function getvalues(property, from, to, totalframe, easing) {
			var rv = [], gap = to-from, i = 0;
			totalframe--;
			for ( ; i <= totalframe; i++ ) {
				rv.push(easings[easing](i, from, gap, totalframe));
			}
			return rv;
		}

		return {set: set, stop: stop, easings: easings};

	})();

	initialize.animator = animator;


	window.trace = (function() {

		var box, values, i;

		return function() {

			if (!box) {
				box = document.createElement('div');
				box.style.cssText = 'position: fixed; left: 0; top: 0; max-height: 100%; font-size: 11px; color: #000; line-height: 2; padding: 10px; background: rgba(255, 255, 255, 0.5); z-index: 99999; overflow: auto; pointer-events: none;';
				document.body.appendChild(box)
			}

			values = [];
			for (i = 0; i < arguments.length; i++) {
				values.push(arguments[i]);
			}
			box.innerHTML += values.join(', ') +'<br>';

		}

	})();


})();