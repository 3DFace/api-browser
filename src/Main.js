/* author: Ponomarev Denis <ponomarev@gmail.com> */

import ko from 'knockout';
import * as rpc from 'rpc_client';
import View from "lib/View";
import template from 'Main.html';
import ContainerBrowser from 'UI/ContainerBrowser/ContainerBrowser';
import UrlHistory from 'UI/UrlHistory/UrlHistory';

(function(){

	var main = {};
	main.rpc_url = ko.observable().persist('rpc_url');
	main.url_history = new UrlHistory(main.rpc_url);
	main.contents = ko.observable({});

	ko.computed(function(){
		var rpc_url = main.rpc_url();
		var url_added = false;
		if(rpc_url && rpc_url.trim().length > 0){
			var ajaxLayer = new rpc.AjaxLayer(rpc_url, null, function(xhr){
				if(!url_added && xhr.status >= 200 && xhr.status < 300){
					url_added = true;
					main.url_history.add_url(rpc_url);
				}
			});
			var jsonLayer = new rpc.JsonLayer(ajaxLayer);
			var protocolLayer = new rpc.ProtocolLayer(jsonLayer);
			var logger = console.log.bind(console);
			var logLayer = new rpc.LogLayer(protocolLayer, logger, logger, logger);
			var rpcClient = new rpc.RpcClient(logLayer);
			main.contents(new ContainerBrowser(null, null, 'Root', rpcClient));
		}else{
			main.contents(null);
		}
	});

	var view = new View(main, template);
	ko.cleanNode(window.document.body);
	view.appendTo(window.document.body);

})();



