var Raindrop = function() {
	function Raindrop(cxt, grid_size, terrain, x, y) {
		this.cxt = cxt;

		this.grid_size = grid_size;
		this.terrain = terrain;

		this.x = x;
		this.y = y;
		this.speed = Math.random()*0.2;

		this.update = this.update.bind(this);
		this.draw = this.draw.bind(this);
	}

	Raindrop.prototype.update = function(ellapsed_time) {
		// Don't do any work unless we need to
		if (this.speed === 0) {
			return;
		}

		this.y += ellapsed_time * this.speed;

		var floor = this.terrain[this.x];
		if (this.y >= floor) {
			this.y = floor;
			this.terrain[this.x] -= this.grid_size;
			this.speed = 0;
		}
	};

	// We draw the hash, because it's a pain to reliably get the font height
	// The size is 10px square (hence the grid being 10px)
	Raindrop.prototype.draw = function() {
		// Make sure we draw to the grid
		var x = parseInt(this.x / this.grid_size) * this.grid_size;
		var y = parseInt(this.y / this.grid_size) * this.grid_size;

		this.cxt.beginPath();
		this.cxt.moveTo(x+5, y);
		this.cxt.lineTo(x+2, y+10);
		this.cxt.stroke();

		this.cxt.beginPath();
		this.cxt.moveTo(x+8, y);
		this.cxt.lineTo(x+5, y+10);
		this.cxt.stroke();

		this.cxt.beginPath();
		this.cxt.moveTo(x+1.5, y+3);
		this.cxt.lineTo(x+10-0.5, y+3);
		this.cxt.stroke();

		this.cxt.beginPath();
		this.cxt.moveTo(x+0.5, y+6);
		this.cxt.lineTo(x+10-1.5, y+6);
		this.cxt.stroke();
	};

	return Raindrop;
}();

var Game = function() {
	function Game(cxt, width, height, grid_size) {
		this.cxt = cxt;
		this.width = width;
		this.height = height;
		this.grid_size = grid_size;

		this.last_update = 0;
		this.last_added_drop = 0;

		this.cursor = { 'x': 0, 'y': 0 };
		this.is_mouse_down = false;

		this.raindrops = [];
		this.terrain = [];
		for (var i = 0; i < this.width; i += 10) {
			this.terrain[i] =
				(parseInt(this.height / this.grid_size) * this.grid_size)
				- this.grid_size;
		}

		this.mouse_move = this.mouse_move.bind(this);
		this.mouse_down = this.mouse_down.bind(this);
		this.mouse_up = this.mouse_up.bind(this);

		this.loop = this.loop.bind(this);
		this.update = this.update.bind(this);
		this.draw = this.draw.bind(this);
	}

	Game.prototype.mouse_move = function(event) {
		// Map to the grid
		this.cursor.x = event.clientX;
		this.cursor.y = event.clientY;
	};

	Game.prototype.mouse_down = function(event) {
		this.is_mouse_down = true;
	};

	Game.prototype.mouse_up = function(event) {
		this.is_mouse_down = false;
	};

	Game.prototype.loop = function(time) {
		// Add a drop if we have the mouse down and enough time has passed
		if (this.is_mouse_down && time - this.last_added_drop > 200) {
			var raindrop = new Raindrop(
				this.cxt,
				this.grid_size,
				this.terrain,
				parseInt(this.cursor.x / this.grid_size) * this.grid_size,
				parseInt(this.cursor.y / this.grid_size) * this.grid_size);
			this.raindrops.push(raindrop);

			this.last_added_drop = time;
		}

		this.update(time - this.last_update);
		this.draw();

		this.last_update = time;
		window.requestAnimationFrame(this.loop);
	};

	Game.prototype.update = function(ellapsed_time) {
		for (var i = 0; i < this.raindrops.length; ++i) {
			this.raindrops[i].update(ellapsed_time);
		}
	};

	Game.prototype.draw = function() {
		this.cxt.clearRect(0, 0, this.width, this.height);

		for (var i = 0; i < this.raindrops.length; ++i) {
			this.raindrops[i].draw();
		}
	};

	return Game;
}();

var cvs = document.getElementById('rain');
cvs.width = window.innerWidth;
cvs.height = window.innerHeight;

var cxt = cvs.getContext('2d');
cxt.strokeStyle = '#363636';

var game = new Game(cxt, cvs.width, cvs.height, 10);
cvs.addEventListener('mousemove', game.mouse_move);
cvs.addEventListener('mousedown', game.mouse_down);
cvs.addEventListener('mouseup', game.mouse_up);
game.loop(0);
