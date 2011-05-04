/* Author: Ian Beveridge
 Game logic for the Plat5 demo game.
*/


var DemoGame = (function() { /* Begin class definition */

	function DemoGame()
	{
		log("Demo game constructed");
	}
	
	DemoGame.prototype.gameInit = function(game)
	{
		this.game = game;
		
		log("Game init. Plat5 engine version "+game.engineInfo.version);
		log("parsed game",game);
		
		game.loadLevel("first");
	}
	
	DemoGame.prototype.update = function(time)
	{
		var g = this.game;
		
		this.fpstxt.setText(g.fps);
		this.aplatform1.setPos(100 +(time %50), 100 +(time %70));
	}
	
	DemoGame.prototype.levelInit = function()
	{
		log("Level init");
	}
	
	DemoGame.prototype.resourceProgress = function(pc)
	{
		/* TODO: Cheeky thought.. could we have a smaller game that acted as
		 * a pre-loader? That'd be interesting... */
		log("Load progress: "+pc+"%");
	}
	
	DemoGame.prototype.screenReady = function()
	{
		log("Screen ready");
	}
	
	DemoGame.prototype.err = function(err)
	{
		log("ERROR: "+err);
		/* TODO: Destroy the game and do not permit it to continue. Perhaps create
		 * an error div in its place with a big, red, flashing warning sign. */
	}

return DemoGame; })(); /* End class definition */
