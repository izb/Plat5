/* Author: Ian Beveridge
 Game logic for the Plat5 demo game.
*/


function DemoGame()
{
	log("Demo game constructed");
}

DemoGame.prototype.update = function()
{
	theGame.setText("fpstxt", theGame.fps);
	theGame.translate("aplatform1", -50, 0);
}

DemoGame.prototype.gameInit = function()
{
	log("Game init. Plat5 engine version "+theGame.engineInfo.version);
	log("parsed game",theGame);
	
	theGame.loadLevel("first");
}

DemoGame.prototype.levelInit = function()
{
	log("Level init");
}

DemoGame.prototype.resourceProgress = function(pc)
{
	log("Load progress: "+pc+"%");
}

DemoGame.prototype.screenReady = function()
{
	log("Screen ready");
}

DemoGame.prototype.err = function(err)
{
	log("ERROR: "+err);
	/* TODO: Destroy the game and do not permit it to comtinue. Perhaps create
	 * an error div in its place. */
}
