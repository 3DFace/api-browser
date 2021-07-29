/* author: Ponomarev Denis <ponomarev@gmail.com> */

import ko from 'knockout';

function I18nBindingProvider(defProvider){

	var provider = this;

	var bindingCache = {};

	provider.nodeHasBindings = function(node){
		return defProvider.nodeHasBindings(node);
	};

	provider.getBindingAccessors = function(node, bindingContext){
		var bindingsString = defProvider.getBindingsString(node, bindingContext);
		return bindingsString ? parseBindingsString(bindingsString, bindingContext, node) : null;
	};

	function parseBindingsString(bindingsString, bindingContext, node){
		try{
			var bindingFunction = createBindingsStringEvaluatorViaCache(bindingsString);
			if(bindingFunction[0] && !bindingContext.hasOwnProperty('getMessage')){
				findI18n(bindingContext);
			}
			return bindingFunction[1](bindingContext, node);
		}catch(ex){
			ex.message = "Unable to parse bindings.\nBindings value: " + bindingsString + "\nMessage: " + ex.message;
			throw ex;
		}
	}

	function createBindingsStringEvaluatorViaCache(bindingsString){
		return bindingCache[bindingsString] || (bindingCache[bindingsString] = createBindingsStringEvaluator(bindingsString));
	}

	function createBindingsStringEvaluator(bindingsString){
		var i18nRequired = bindingsString.indexOf("getMessage") >= 0;
		var localizedBindings = bindingsString.replace(/`([^`]+)`/g, function(str, key){
			i18nRequired = true;
			return 'getMessage("' + key + '")';
		});
		var rewrittenBindings = ko.expressionRewriting.preProcessBindings(localizedBindings, {'valueAccessors': true}),
			functionBody = "with($context){with($data||{}){return{" + rewrittenBindings + "}}}";
		return [i18nRequired, new Function("$context", "$element", functionBody)];
	}

	function findI18n(bindingContext, bindingsString){
		var i18n = bindingContext.$data.i18n || (bindingContext.$parent && bindingContext.$parent.i18n) || bindingContext.$root.i18n;
		if(i18n){
			bindingContext.getMessage = function(key){
				try{
					return i18n.getMessage(key);
				}catch(e){
					console.error("Failed to get " + key + " while evaluating binding '" + bindingsString + "': ", e);
					return "";
				}
			}
		}else{
			console.warn("I18n required for bindings: " + bindingsString);
			bindingContext.getMessage = function(key){
				return key;
			}
		}
	}

}

ko.bindingProvider.instance = new I18nBindingProvider(new ko.bindingProvider());
