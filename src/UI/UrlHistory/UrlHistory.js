import URI from "urijs";
import ko from "knockout";
import View from "lib/View";
import template from "./UrlHistory.html";

/**
 * @param rpc_url
 * @constructor
 */
function UrlHistory(rpc_url){

	var history = this;

	history.view = new View(history, template);

	history.apply_url = function(url){
		rpc_url(url.value);
	};

	history.add_url = function(url){
		var obj = history.url_history_obj();
		obj[url] = 1;
		history.url_history_obj(obj);
	};

	history.remove_url = function(url){
		var obj = history.url_history_obj();
		delete(obj[url.value]);
		history.url_history_obj(obj);
		return false;
	};

	history.url_history_obj = ko.observable({}).persist('url_history');

	history.url_history = ko.pureComputed(function(){
		var groups = {};
		var current = rpc_url();
		Object.keys(history.url_history_obj()).sort().forEach(function(url_str){
			var url = new URI(url_str);
			var host = url.hostname();
			var domain_arr = host.split(".");
			var tail_position = domain_arr.length > 3 ? -3 : Math.max(-2, -domain_arr.length);
			var domain = domain_arr.slice(tail_position).join(".");
			if(!groups[domain]){
				groups[domain] = {
					name: domain,
					items: [],
					expanded: ko.observable(false).persist('domain_' + domain)
				};
			}
			groups[domain].items.push({
				value: url_str,
				active: current === url_str
			});

		});
		var groups_list = Object.keys(groups).map(function (key) { return groups[key]; });
		return groups_list.sort(function(g1, g2){
			return g1.name.localeCompare(g2.name);
		});
	});

}

export default UrlHistory;
