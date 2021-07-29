/* author: Ponomarev Denis <ponomarev@gmail.com> */

define(function(require){

	var $ = require('jquery'),
		ko = require('knockout'),
		when = require('when');

	ko.subscribable.fn.when = function(val){
		var ob = this;
		var def = when.defer();
		if(ob() === val){
			def.resolve(val);
		}else{
			var s = ob.subscribe(function(v){
				if(v === val){
					def.resolve(val);
					s.dispose();
				}
			});
		}
		return def.promise;
	};

	ko.subscribable.fn.versioned = function(){
		var ob = this;
		var version = ko.observable(0);
		var x = ko.computed({
			read: this,
			write: function(val){
				ob(val);
				version(version() + 1);
			}
		}, this);
		x.version = ko.computed(version);
		return x;
	};

	function mapped_array(src_ob_array, map_func, key_func){

		var ob_map = ko.observable({});
		var ob_keys = ko.observable([]);

		key_func = key_func || function(x){
			return ko.utils.unwrapObservable(x.id);
		};

		ko.computed(function(){
			try{
				var prev = ob_map.peek();
				var next = {};
				var key_list = [];
				$.each(src_ob_array(), function(i, data){
					var k = "k" + key_func(data, i);
					if(prev.hasOwnProperty(k)){
						var item = prev[k];
						item.src(data);
						next[k] = item;
					}else{
						var src = ko.observable(data);
						var m = ko.computed(function(){
							return map_func(src, i);
						});
						next[k] = {mapped: m.peek(), src: src};
						m.dispose();
					}
					key_list.push(k);
				});
				ob_map(next);
				ob_keys(key_list);
			}catch(e){
				console.log(e);
				throw e;
			}
		}).extend({rateLimit: 1});

		return ko.computed(function(){
			var result = [];
			var keys = ob_keys(),
				map = ob_map();
			$.each(keys, function(i, k){
				var x = map[k];
				result.push(x.mapped);
			});
			return result;
		}).extend({rateLimit: 1});

	}

	function View(model, template, on_attach, on_show, on_hide){

		var view = this;
		var $element = null;

		view.appendTo = function(target, parentContext){
			if($element){
				$element.each(function(){
					$(this).toggle(true);
				});
				on_show && on_show();
			}else{
				$element = $(template);
				var childBindingContext = /*parentContext && parentContext.createChildContext(model) || */ model;
				$element.appendTo(target).each(function(){
					if(this.nodeName != '#text'){
						try{
							ko.applyBindings(childBindingContext, this);
						}catch(e){
							console.log(e.message || e);
						}
					}
				});
				on_attach && on_attach($element);
				on_show && on_show();
			}
		};

		view.remove = function(){
			//console.log("remove");
			$element.toggle(false);
			on_hide && on_hide();
		};

	}

	function delayed(observable, delay_callback){
		var ob = ko.observable();
		var timeout = null;
		ko.computed(function(){
			if(timeout){
				clearTimeout(timeout);
			}
			var val = observable();
			var delay = delay_callback(val);
			if(delay > 0){
				timeout = setTimeout(function(){
					ob(val);
				}, delay);
			}else{
				ob(val);
			}
		});
		return ko.computed(ob);
	}

	function toggle(observable){
		return function(){
			observable(!observable.peek());
		};
	}

	function setter(observable, value){
		return function(){
			observable(value);
		}
	}

	function property(ob, property_name){
		return ko.pureComputed(function(){
			return ob()[property_name];
		});
	}

	function offset(observable, step){
		return function(){
			observable(observable.peek() + step);
		};
	}

	function not(ob){
		return ko.pureComputed(function(){
			return !ko.utils.unwrapObservable(ob);
		});
	}

	function any(observables){
		return ko.pureComputed(function(){
			for(var i = 0; i < observables.length; i++){
				if(ko.utils.unwrapObservable(observables[i])){
					return true;
				}
			}
			return false;
		});
	}

	function all(observables){
		return ko.pureComputed(function(){
			for(var i = 0; i < observables.length; i++){
				if(!ko.utils.unwrapObservable(observables[i])){
					return false;
				}
			}
			return true;
		});
	}

	function compare(ob1, ob2, cmp_func){
		return ko.pureComputed(function(){
			var x1 = ko.utils.unwrapObservable(ob1),
				x2 = ko.utils.unwrapObservable(ob2);
			return cmp_func(x1, x2);
		});
	}

	function equals(ob1, ob2, strict){
		return compare(ob1, ob2, function(x1, x2){
			return strict ? x1 === x2 : x1 == x2;
		});
	}

	function differ(ob1, ob2){
		return compare(ob1, ob2, function(x1, x2){
			return x1 != x2;
		});
	}

	function greater(ob1, ob2){
		return compare(ob1, ob2, function(x1, x2){
			return x1 > x2;
		});
	}

	function less(ob1, ob2){
		return compare(ob1, ob2, function(x1, x2){
			return x1 < x2;
		});
	}

	ko.subscribable.fn.toggle = function(){
		var ob = this;
		this.toggle = function(){
			var x = !ob();
			ob(x);
			return x;
		};
		this.on = function(){
			ob(true);
		};
		this.off = function(){
			ob(false);
		};
		this.is_on = ko.pureComputed(function(){
			return ob();
		});
		this.is_off = ko.pureComputed(function(){
			return !ob();
		});
		return this;
	};

	ko.subscribable.fn.persist = function(key){
		var def = this();
		console.log("def", key, def);
		restore_pref(key, this);
		this.subscribe(function(val){
			if(val === def){
				remove_pref(key);
			}else{
				store_pref(key, val);
			}
		});
		this.key = key;
		return this;
	};

	ko.subscribable.fn.sanitize = function(sanitizeFn){
		var ob = this;
		return ko.pureComputed({
			read: ob,
			write: function(val){
				ob(sanitizeFn(val));
			}
		});
	};

	ko.subscribable.fn.comparedWith = function(sample){
		this.greater = greater(this, sample);
		this.less = less(this, sample);
		this.differ = differ(this, sample);
		this.equals = equals(this, sample);
		return this;
	};

	function grep(ob_array, callback){
		return ko.pureComputed(function(){
			return $.grep(ko.utils.unwrapObservable(ob_array), callback);
		});
	}

	function map(ob, map){
		return ko.pureComputed(function(){
			return ko.utils.unwrapObservable(map[ob()]);
		});
	}

	function bool(ob, when_true, when_false){
		return ko.pureComputed(function(){
			return ko.utils.unwrapObservable(ob() ? when_true : when_false);
		});
	}

	function store_pref(key, val){
		try{
			//console.log("store", key, val);
			window.localStorage.setItem(key, JSON.stringify(val));
		}catch(e){
			console.error(e);
		}
	}

	function remove_pref(key){
		try{
			//console.log("store", key, val);
			window.localStorage.removeItem(key);
		}catch(e){
			console.error(e);
		}
	}

	function restore_pref(key, target_fn){
		var stored = window.localStorage.getItem(key);
		if(stored !== null && stored !== undefined && stored !== "undefined"){
			try{
				target_fn(JSON.parse(stored));
			}catch(e){
				console.error("cant parse", stored);
			}
		}
	}

	function pref_observable(key, def){
		var ob = ko.observable(def);
		restore_pref(key, ob);
		var result = ko.computed({
			read: ob,
			write: function(val){
				ob(val);
				store_pref(key, val);
			}
		});
		result.key = key;
		return result;
	}

	function ticker(interval){
		var ob = ko.observable(0);
		var interval_id = null;

		function tick(){
//			console.log('tick');
			ob(ob() + 1);
		}

		var co = ko.computed({
			read: ob,
			write: function(){
				if(interval_id){
					clearTimeout(interval_id);
				}
				interval_id = setTimeout(tick, interval);
			}
		});

		co.tick = function(){
			co(co() + 1);
		};

		return co;
	}

	function unwrap(obj){
		var result = {};
		$.each(ko.utils.unwrapObservable(obj) || {}, function(prop, val){
			val = ko.utils.unwrapObservable(val);
			result[prop] = val;
		});
		return result;
	}

	function track(ob, callback){
		var prev_val;
		return ko.computed(function(){
			var new_val = ob();
			var result = callback(new_val, prev_val);
			prev_val = new_val;
			return result;
		});
	}

	function liveGuard(ob){
		var inner = ko.observable(ob());
		inner.submit = function(){
			ob(inner());
		};
		inner.reset = function(){
			inner(ob());
		};
		ob.subscribe(function(val){
			inner(val);
		});
		return inner;
	}

	function bind(ob1, ob2){
		ob1.subscribe(function(v1){
			ob2(v1);
		});
		ob2.subscribe(function(v2){
			ob1(v2);
		});
	}

	return {
		mapped_array: mapped_array,
		View: View,
		delayed: delayed,
		toggle: toggle,
		store_pref: store_pref,
		restore_pref: restore_pref,
		pref_observable: pref_observable,
		ticker: ticker,
		grep: grep,
		any: any,
		all: all,
		not: not,
		greater: greater,
		less: less,
		equals: equals,
		differ: differ,
		offset: offset,
		map: map,
		bool: bool,
		setter: setter,
		property: property,
		unwrap: unwrap,
		track: track,
		liveGuard: liveGuard,
		bind: bind
	};

});
