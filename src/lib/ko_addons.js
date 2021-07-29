/* author: Ponomarev Denis <ponomarev@gmail.com> */

import ko from 'knockout';

require('./I18nBindingProvider');

ko.subscribable.fn.persist = function(key){
	var def = this.peek();
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

ko.bindingHandlers.toggle = {

	init: function(element, valueAccessor){
		var value = valueAccessor();
		ko.applyBindingsToNode(element, {
			click: function(){
				value(!value());
			}
		});
	}

};

ko.bindingHandlers.hidden = {

	update: function(element, valueAccessor){
		var value = ko.utils.unwrapObservable(valueAccessor());
		ko.bindingHandlers.visible.update(element, function(){
			return !value;
		});
	}

};

ko.bindingHandlers.number = {

	update: function(element, valueAccessor){
		var data = ko.utils.unwrapObservable(valueAccessor());
		var num = parseFloat(ko.utils.unwrapObservable(data.value) || 0);
		var decimals = ko.utils.unwrapObservable(data.decimals) || 0;
		var prefix = ko.utils.unwrapObservable(data.prefix) || '';
		var suffix = ko.utils.unwrapObservable(data.suffix) || '';
		var shift = Math.pow(10, decimals);
		var val = Math.round(num * shift) / shift;
		element.textContent = prefix + val.toFixed(decimals) + suffix;
	}

};

ko.bindingHandlers.currency = {

	update: function(element, valueAccessor){
		ko.bindingHandlers.number.update(element, function(){
			return {value: valueAccessor(), decimals: 2}
		});
	}

};

ko.bindingHandlers.src = {

	update: function(element, valueAccessor){
		ko.bindingHandlers.attr.update(element, function(){
			return {src: valueAccessor()}
		});
	}

};

ko.bindingHandlers.href = {

	update: function(element, valueAccessor){
		ko.bindingHandlers.attr.update(element, function(){
			return {href: valueAccessor()}
		});
	}

};

ko.bindingHandlers.content = {

	'init': function() {
		return { 'controlsDescendantBindings': true };
	},

	update: function(element, valueAccessor){
		var cfg = valueAccessor();
		var val = function(){
			return cfg.value;
		};
		if(cfg.html){
			ko.bindingHandlers.html.update(element, val);
		}else{
			ko.bindingHandlers.text.update(element, val);
		}

	}

};

ko.bindingHandlers.scrollPercent = {

	'init': function(element, valueAccessor) {
		var value = valueAccessor();
		element.addEventListener('scroll', function(){
			value(element.scrollTop/(element.scrollHeight - element.offsetHeight) || 0);
		});
	},

	update: function(element, valueAccessor){
		var value = valueAccessor();
		var k = value();
		var newTop = (element.scrollHeight - element.offsetHeight) * k || 0;
		if(Math.abs(newTop - element.scrollTop) > 0.0001){
			//console.log(newTop);
			element.scrollTop = newTop;
		}
	}

};

ko.bindingHandlers['wrap_if'] = {
	'init': function(element, valueAccessor, allBindings, viewModel, bindingContext){
		var didDisplayOnLastUpdate, savedNodes;
		ko.computed(function(){
			var dataValue = ko.utils.unwrapObservable(valueAccessor()),
				shouldDisplay = !!dataValue,
				isFirstRender = !savedNodes,
				needsRefresh = isFirstRender || (shouldDisplay !== didDisplayOnLastUpdate);
			if(needsRefresh){
				if(isFirstRender && ko.computedContext.getDependenciesCount()){
					savedNodes = cloneNodes(element.childNodes, true);
				}
				if(shouldDisplay){
					if(!isFirstRender){
						replaceDomNodes(savedNodes, element);
						ko.setDomNodeChildren(element, cloneNodes(savedNodes));
					}
					ko.applyBindingsToDescendants(bindingContext, element);
				}else{
					var append = cloneNodes(savedNodes);
					replaceDomNodes(element, append);
					ko.utils.arrayForEach(append, function(x){
						if(x.nodeType == 1 || x.nodeType == 8){
							try{
								ko.applyBindings(bindingContext, x);
							}catch(e){
								console.log(e);
							}
						}
					});
				}
				didDisplayOnLastUpdate = shouldDisplay;
			}
		}, null);
		return {'controlsDescendantBindings': true};
	}
};

ko.bindingHandlers.delayed = {

	'init': function(element, valueAccessor, allBindings, viewModel, bindingContext){
		var timeout = ko.utils.unwrapObservable(valueAccessor());
		var x = ko.observable(false);
		ko.bindingHandlers.if.init(element, function(){
			return x;
		}, allBindings, viewModel, bindingContext);
		setTimeout(function(){
			x(true);
		}, timeout);
	}

};

ko.bindingHandlers.view = {

	init: function(){
		return { controlsDescendantBindings: true};
	},

	update: function(element, valueAccessor, allBindings, viewModel, bindingContext){
		try{
			var config = ko.utils.unwrapObservable(valueAccessor());
			var view = config && ko.utils.unwrapObservable(config.view);
			if(view !== element.prev_view){
				if(element.prev_view){
					element.prev_view.remove();
				}
				if(view){
					view.appendTo(element, bindingContext);
					element.prev_view = view;
				}
			}
		}catch(e){
			console.error(e);
			throw e;
		}
	}

};

ko.bindingHandlers.placeholder = {

	'update': function(element, valueAccessor){
		try{
			ko.bindingHandlers.attr.update(element, function(){
				return {placeholder: valueAccessor()}
			});
		}catch(e){
			console.error(e.message || e);
		}
	}

};

function store_pref(key, val){
	try{
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

function cloneNodes(nodesArray, shouldCleanNodes) {
	for (var i = 0, j = nodesArray.length, newNodesArray = []; i < j; i++) {
		var clonedNode = nodesArray[i].cloneNode(true);
		newNodesArray.push(shouldCleanNodes ? ko.cleanNode(clonedNode) : clonedNode);
	}
	return newNodesArray;
}

function replaceDomNodes(nodeToReplaceOrNodeArray, newNodesArray) {
	var nodesToReplaceArray = nodeToReplaceOrNodeArray.nodeType ? [nodeToReplaceOrNodeArray] : nodeToReplaceOrNodeArray;
	if (nodesToReplaceArray.length > 0) {
		var insertionPoint = nodesToReplaceArray[0];
		var parent = insertionPoint.parentNode;
		var i, j;
		for (i = 0, j = newNodesArray.length; i < j; i++)
			parent.insertBefore(newNodesArray[i], insertionPoint);
		for (i = 0, j = nodesToReplaceArray.length; i < j; i++) {
			ko.removeNode(nodesToReplaceArray[i]);
		}
	}
}

export default ko;
