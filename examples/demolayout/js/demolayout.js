/* Author: Ian Beveridge
 Game logic for the Plat5 demo layout game.
*/


var DemoLayout = (function() { /* Begin class definition */

	function DemoLayout()
	{
	}
	
	DemoLayout.prototype.gameInit = function(game)
	{
		this.game = game;
		
		log("Game init",game);
		
		game.loadLevel("first");
	}
	
	DemoLayout.prototype.update = function(time)
	{
		var g = this.game;
		
		var xp = (Math.sin(time/600) + 1)/2;
		var yp = (Math.cos(time/400) + 1)/2;
		
		g.setParallaxPos(xp, yp);
		this.fpstxt.setText(g.fps);
	}
	
	DemoLayout.prototype.levelInit = function()
	{
		log("Level init");
	}
	
	DemoLayout.prototype.resourceProgress = function(pc)
	{
		log("Load progress: "+pc+"%");
	}
	
	DemoLayout.prototype.screenReady = function()
	{
		log("Screen ready");
	}
	
	DemoLayout.prototype.err = function(err)
	{
		log("ERROR: "+err);
	}

return DemoLayout; })(); /* End class definition */
