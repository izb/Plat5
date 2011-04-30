/* Author: Ian Beveridge
 Initialises the Plat5 game engine with our demo game.
 
 TODO: This could be inlined on the page, really. Should it? Does it get gathered
 up by the boilderplate build anyway?
*/

var demogame = (function()
{
	return new Plat5Game("data/game.json", jQuery("#main"), new DemoGame()).run();
})();
