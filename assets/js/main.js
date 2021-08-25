var Galaxy = require('./components/galaxy.js');
var Utilities = require('./utils.js');
var Graphics = require('./graphics.js');

(function () {
	
	document.addEventListener('DOMContentLoaded',function(){

		Galaxy().init();
	});
})();