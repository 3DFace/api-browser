/* author: Ponomarev Denis <ponomarev@gmail.com> */

define(function(require){

	var ko = require('knockout');

	require('ko_tools');

	/**
	 * @param packs
	 * @param {I18n} [parent]
	 * @constructor
	 */
	function I18n(packs, parent){

		var i18n = this;

		i18n.lang = ko.pureComputed(I18n.lang);

		i18n.messages = ko.pureComputed(function(){
			var l = i18n.lang();
			return packs && (packs.hasOwnProperty(l) ? packs[l] : packs) || {};
		});

		i18n.create = function(extension_packs){
			return new I18n(extension_packs, i18n);
		};

		i18n.getLocalized = function(key){
			var m = i18n.messages();
			return m.hasOwnProperty(key) && m[key] || parent && parent.getLocalized(key) || null;
		};

		i18n.getNumericMessage = function(key, number){
			var n = 0;
			number = number % 100;
			if(number >= 20){
				number = number % 10;
			}
			if(number == 0){
				n = 2;
			}else{
				if(number == 1){
					n = 0;
				}else{
					if(number < 5){
						n = 1;
					}else{
						n = 2;
					}
				}
			}
			return this.getMessage(key, n);
		};

		i18n.getMessage = function(key, index){
			var text = this.getLocalized(key);
			if(text !== null && index !== undefined){
				text = text[index];
			}
			if(text === null){
				text = key;
			}
			return text;
		};

		i18n.message = function(key, index){
			return ko.pureComputed(function(){
				return i18n.getMessage(key, index);
			});
		};

		i18n.translated = function (target){
			return function(key){
				return target(i18n.getMessage(key));
			};
		};

		i18n.log = i18n.translated(console.log);

		i18n.alert = i18n.translated(alert);

		i18n.confirm = i18n.translated(confirm);

	}

	I18n.lang = ko.observable('ru').persist('lang');

	return I18n;

});
