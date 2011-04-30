/* Author: Ian Beveridge
 Initialises the Plat5 game engine with our demo game.
*/

(function() {
// Scope->

log("Setting up demo game");

new Plat5Game("data/game.json", jQuery("#main"), new DemoGame()).run();

// <-Scope
})();
