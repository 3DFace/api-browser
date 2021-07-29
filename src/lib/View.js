/* author: Ponomarev Denis <ponomarev@gmail.com> */

import ko from 'knockout';

function View(model, template, on_attach, on_show, on_hide){

	var view = this;
	var body = null;

	view.appendTo = function(target){
		var i;
		if(body){
			for(i = 0; i < body.length; i++){
				if(body[i].nodeName != '#text') {
					if (body[i].style.display == 'none') {
						body[i].style.display = '';
					}
				}
			}
			on_show && on_show();
		}else{
			body = ko.utils.parseHtmlFragment(template, target.ownerDocument);
			for(i = 0; i < body.length; i++){
				if(body[i].nodeName != '#text'){
					try{
						target.appendChild(body[i]);
						ko.applyBindings(model, body[i]);
					}catch(e){
						console.log(e.message || e);
					}
				}
			}
			on_attach && on_attach(body);
			on_show && on_show();
		}
	};

	view.remove = function(){
		for(var i = 0; i < body.length; i++){
			if(body[i].nodeName != '#text'){
				if(body[i].style.display != 'none'){
					body[i].style.display = 'none';
				}
			}
		}
		on_hide && on_hide();
	};

}

export default View;
