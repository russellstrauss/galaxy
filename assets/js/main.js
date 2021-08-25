var Cluster = require('./components/cluster.js');
var UI = require('./components/ui.js');
var Utilities = require('./utils.js');
var Graphics = require('./graphics.js');

(function () {
	
	document.addEventListener('DOMContentLoaded',function(){

		Cluster().init();
		UI().init();
	});
})();