/* author: Ponomarev Denis <ponomarev@gmail.com> */

import ko from "knockout";
import Hjson from 'hjson';
import View from "lib/View";
import I18n from "lib/I18n";
import template from "./ContainerBrowser.html";
import messages from "./ContainerBrowserMessages";

var i18n = new I18n(messages);

function bool(ob, when_true, when_false){
	return ko.pureComputed(function(){
		return ko.utils.unwrapObservable(ob() ? when_true : when_false);
	});
}

/**
 * @param {string} path
 * @param {string} name
 * @param {string} desc
 * @param {rpc.RpcClient} batch
 * @param level
 * @constructor
 */
function ContainerBrowser(path, name, desc, batch, level){

	var container = this;

	container.view = new View(container, template);
	container.i18n = i18n;

	container.name = name;
	container.fullName = path ? path + '/' + name : name;
	container.desc = desc;
	container.expanded = ko.observable(!name).persist(container.fullName + '.expand');
	container.expandedSign = bool(container.expanded, '-', '+');
	container.template = "container";
	container.level = level || 0;

	container.toggle = function(){
		if(container.expanded()){
			container.close();
		}else{
			container.expanded(true);
		}
	};

	container.close = function(){
		container.expanded(false);
		container.items().forEach(function(item){
			item.close(false);
		})
	};

	function Service(s){

		var service = this;

		service.name = s.name;
		service.fullName = (container.fullName ? container.fullName + '/' : '') + s.name;
		service.className = s.className;
		service.classHelp = 'build/responsive/classes/' + s.className.replace(/\\/g, '.') + '.html';
		service.desc = s.desc;
		service.expanded = ko.observable(false).persist(service.name + '.expand');
		service.expandedSign = bool(service.expanded, '-', '+');
		service.template = "service";
		service.level = container.level + 1;

		service.call = function(methodName, params){
			return batch.call(service.fullName, methodName, params);
		};

		service.toggle = function(){
			if(service.expanded()){
				service.close();
			}else{
				service.expanded(true);
			}
		};

		service.close = function(){
			service.expanded(false);
			service.methods.forEach(function(m){
				m.expanded(false);
			})
		};

		function Method(m){

			var method = this;

			method.name = m.name;
			method.doc = m.doc;
			var desc_exp = /^[ \t]*\*[ \t]([ \t]*[^@\s][^\n]*)$/mg;
			var method_desc = desc_exp.exec(m.doc);
			method.first_desc = method_desc && method_desc[1];
			method.more_desc = '';
			// noinspection JSAssignmentUsedAsCondition
			while(method_desc = desc_exp.exec(m.doc)){
				method.more_desc += '<br>' + method_desc[1];
			}
			method.help = service.classHelp + '#method_' + method.name;
			method.expanded = ko.observable(false).persist(service.name + '->' + method.name + '.expand');
			method.deprecated = m.doc && m.doc.indexOf('@deprecated') >= 0;

			var params_desc_exp = /^\s*\*\s*@param[ \t]+([\w|\[\]]+)[ \t]+\$(\w+)[ \t]*([^\n]*)$/mg;

			var params_desc_map = {};
			var params_desc;
			// noinspection JSAssignmentUsedAsCondition
			while(params_desc = params_desc_exp.exec(m.doc)){
				params_desc_map[params_desc[2]] = {data_type: params_desc[1], desc: params_desc[3]};
			}

			function Param(p){

				var param = this;

				var name =  p.name || p;
				var type =  p.type || null;
				param.name = name;
				param.data_type = params_desc_map[name] && params_desc_map[name].data_type;
				param.desc = params_desc_map[name] && params_desc_map[name].desc;
				if(type !== null){
					param.data_type = type.split('\\').pop();
				}

				param.value = ko.observable();
				param.isPassword = param.name.indexOf("pass") >= 0;
				if(!param.isPassword){
					param.value.persist(service.name + '->' + method.name + '/' + param.name);
				}
				param.json = ko.observable(false).persist(service.name + '->' + method.name + '/' + param.name + '/json');

				param.multiline = ko.observable(false).persist(service.name + '->' + method.name + '/' + param.name + '/multiline');

				param.parsed = ko.pureComputed(function(){
					var v = param.value();
					try{
						return param.json() ? Hjson.parse(v) : v;
					}catch(e){
						console.error(e);
						return null;
					}
				});

				param.type = param.name.indexOf('password') >= 0 ? "password" : "text";

				param.valid = ko.pureComputed(function(){
					try{
						return !param.json() || Hjson.parse(param.value()) || true;
					}catch(e){
						return false;
					}
				});

				param.clear = function(){
					param.value(undefined);
				}

			}

			method.params = m.params.map(function(p){
				return new Param(p);
			});

			var plain_result = ko.observable();
			var plain_error = ko.observable();

			method.result = ko.pureComputed(function(){
				var r = plain_result();
				return typeof r === "object" ?
					JSON.stringify(r, null, 4) : r;
			});

			method.error = ko.pureComputed(function(){
				var e = plain_error();
				if(e && e.name && e.message){
					e = {type: e.name, message: e.message, code: e.code};
				}
				return JSON.stringify(e, null, 4);
			});

			method.nextToClipboard = function(x, ev){
				copy(ev.target.nextSibling);
			};

			method.toClipboard = function(x, ev){
				copy(ev.target);
			};

			function copy(element){
				var sel = window.getSelection();
				var range = document.createRange();
				range.selectNodeContents(element);
				sel.removeAllRanges();
				sel.addRange(range);
				document.execCommand('copy');
			};

			method.success = ko.pureComputed(function(){
				return plain_result() !== undefined;
			});

			method.failure = ko.pureComputed(function(){
				return plain_error() !== undefined;
			});

			method.progress = ko.observable(false);

			method.execute = function(){
				var params = [];
				method.params.forEach(function(p){
					params.push(p.parsed());
				});
				plain_result(undefined);
				plain_error(undefined);
				method.progress(true);
				service.call(method.name, params).then(plain_result, plain_error).then(function(){
					method.progress(false);
				});

			};

			method.clear = function(){
				plain_result(undefined);
				plain_error(undefined);
				method.params.forEach(function(p){
					p.clear();
				});
			};

		}

		service.methods = s.methods.map(function(m){
			return new Method(m);
		});

	}

	var items = ko.observable([]);
	var loaded = false;

	container.progress = ko.observable(false);

	container.load = function(){
		loaded = true;
		batch.call('explorer', 'getServicesInfo', [container.fullName])
			.then(items)
			.catch(function(err){
				console.log(err);
				return [];
			})
			.then(function(){
				container.progress(false);
			});
	};

	ko.computed(function(){
		var ex = container.expanded();
		ex && !loaded && container.load();
	});

	container.items = ko.pureComputed(function(){
		return items().map(function(x){
			if(x['container']){
				return new ContainerBrowser(container.fullName, x['name'], x['desc'], batch, container.level + 1);
			}else{
				return new Service(x);
			}
		});
	});

}

export default ContainerBrowser;
