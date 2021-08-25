var howler = require('howler');

module.exports = function() {
	
	var sound, initialized = false;
	
	return {
		
		init: function() {
			this.setUpSoundButton();
		},
		
		setUpSoundButton: function() {
			
			
			let soundEnable = document.querySelector('.sound-controls .enable');
			let soundDisable = document.querySelector('.sound-controls .disable');
			
			soundEnable.addEventListener('click', (pointerEvent) => {
				
				if (initialized === false) {
					
					sound = new Howl({
						src: ['assets/audio/vogelsinger.webm', 'assets/audio/vogelsinger.mp3'],
						html5: false,
						loop: true,
						preload: true,
						volume: .5
					});
					initialized = true;
				}
				
				sound.play();
				
				soundEnable.classList.remove('active');
				soundDisable.classList.add('active');
				
				console.log('enable');
				
			});
			
			soundDisable.addEventListener('click', (pointerEvent) => {
				soundEnable.classList.add('active');
				soundDisable.classList.remove('active');
				
				sound.pause();
			});
		}
	}
}