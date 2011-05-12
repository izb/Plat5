/* Author: Ian Beveridge
 Initialises the Plat5 game engine with our demo game.
 
 TODO: This could be inlined on the page, really. Should it? Does it get gathered
 up by the boilderplate build anyway?
*/

var thegame = (function()
{
	//return new P5Game("examples/demogame/data/game.json", jQuery("#main"), new DemoGame()).run();
	return new P5Game("examples/demolayout/data/game.json", jQuery("#main"), new DemoLayout()).run();
})();
