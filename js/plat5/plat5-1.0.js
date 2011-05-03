/**
* plat5: Platform game engine for HTML5 browsers.
* Author: Ian Beveridge
* Email: ian.beveridge@gmail.com
* URL: http://kupio.com/plat5
* Version: 1.0
*/

/* TODO: Make this check the version and alert if it's insufficient. */
log("Setting up Plat5 library. Using jQuery v" + $.fn.jquery);


/* TODO: Review error messages and turn relevant ones into exceptions. */

/* TODO: Refactoring job: functions can be split into two kinds.. those
 * that aren't allowed to change the DOM, and those that are. Those that
 * are are anything scheduled or called indirectly from requestAnimationFrame.
 * It might be an idea to separate out the ones that are into a different
 * namespace, just to clear up the code. */

/* TODO: For niceness, we should go through all the properties set on the
 * game object and initialise them in the constructor. And also review this
 * for other classes.
 */

/*
 * P5Game
 * 
 * This is the game class.
 */

var P5Game = (function() { /* Begin class definition */
	
	function P5Game(gameDataURL, gameContainer, gameCode)
	{
		this.gameCode = gameCode;
		
		this.gameDataURL = gameDataURL;
		this.gameContainer = gameContainer;
		
		this.loopEpoch = undefined;
		this.lastLoopTime = undefined;
		this.lastFPSReport = 0;
	}
	
	P5Game.prototype.loadLevel = function(lvl)
	{
		if (this.levels[lvl].hasOwnProperty("layers"))
		{
			/* Already loaded. */
			this.gameCode.levelInit(); /* Notify game code */
			this.preloadResources(); /* To be sure, and will trigger a goto start screen */
			return;
		}
		
		/* TODO: If we're still loading resources, reject this call. Remember that
		 * game.totalFiles may not exist on the object yet. Perhaps add dummy values
		 * on creation? */
		
	    log("Loading level: "+this.levels[lvl].data);
	    
		jQuery.ajax({
			url: this.levels[lvl].data,
			dataType: 'json',
			
			success: context(this).callback(function(data) {
				log("raw level data",data);
				
				data.resources = jQuery.extend(true, {}, this.unarray(data.resources), this.globalResources);
				data.spritedefs = jQuery.extend(true, {}, this.unarray(data.spritedefs), this.globalSprites);
				data.screens = this.unarray(data.screens, ["elements"]);
				for (var scrName in data.screens)
				{
					var scr = data.screens[scrName];
					scr.elements = scr.elements.concat(this.globalOverlayElements);
				}
				
				for (var i = 0; i < this.globalLayers.length; i++)
				{
					data.layers.push(jQuery.extend(true, {}, this.globalLayers[i]));
				}
				
				data.layerIdx = this.unarray(data.layers);
				
				this.levels[lvl] = data;
				
				this.currentLevel = this.levels[lvl];
				
				/* TODO: This replaces all the children with new layers. Perhaps we want to
				 * have level transitions one day. Ponder this... */
				this.scrn.children().remove();
	
				var lyrs = this.levels[lvl].layers;
				for (var i = 0; i < lyrs.length; i++)
				{
					var lyr = lyrs[i];
	
					var layerEle = jQuery("<div id=\"gamelayer"+(i+1)+"\" class=\"p5layer\" style=\"width:"+this.width+"px;height:"+this.height+"px\"></div>");
					lyr.element = layerEle;
	    			this.scrn.append(layerEle);
	    			
					layerEle = jQuery("<div id=\"parallax"+(i+1)+"\" class=\"p5parallax\" style=\"width:"+this.width+"px;height:"+this.height+"px\"></div>");
	    			lyr.element.append(layerEle);
					lyr.element = layerEle;
				}
				
				log("Level data for level: "+lvl, this.levels[lvl]);
	
				this.gameCode.levelInit();
				
				this.preloadResources();
			}),
			
			error: context(this).callback(function()
			{
				this.gameCode.err("Failed to parse level JSON on level "+lvl);
			})
		});
	}
	
	P5Game.prototype.preloadResources = function()
	{
		var res = this.currentLevel.resources;
	
		/* TODO: Worry about sound. Load sounds here too. */
		/* TODO: Worry about web fonts? Load fonts here too? */
		/* TODO: Worry about text fields on the screen. Declare in level? Overlay elements in game def? */
		
		var lvl = this.currentLevel;
		
		if (res.length == 0)
		{
			/* Must be a boring game, but each to their own... */
			this.gotoScreen(lvl.startScreen);
			return;
		}
		
		this.totalFiles = Object.keys(res).length;
		this.loadedFiles = 0;
		
		jQuery.each(res, context(this).callback(function(name, r)
		{
			var url = null;
			var slice = null;
			if (r.hasOwnProperty("img"))
			{
				url = r.img;
			}
			else if (r.hasOwnProperty("strip"))
			{
				url = r.strip;
				slice = { rows:r.rows, cols:r.columns };
			}
			else
			{
				this.gameCode.err("Resource '"+name+"' is missing an image URL.");
				return;
			}
	
			/* TODO: Do we need to store these objects in an array off-DOM in order
			 * to ensure they're cached? */
	        var img = new Image();
	        /* TODO: Is there a callback for when an image fails to load? */
	        img.onload = context(this).callback(function()
	        {
				if (slice==null)
				{
					r.width = img.width;
					r.height = img.height;
				}
				else
				{
					/* TODO: Check for exact divisions with a modulo */
					r.width = img.width/slice.cols;
					r.height = img.height/slice.rows;
					for (var sname in lvl.spritedefs)
					{
						var sprite = lvl.spritedefs[sname];
						if (sprite.res == name)
						{
							sprite.frames = [];
							for (var y=0; y < slice.rows; y++)
							{
								for (var x=0; x < slice.cols; x++)
								{
									sprite.frames.push({xshift:(x*-r.width), yshift:(y*-r.height)});
								}
							}
						}
					}
				}
				
				var total = this.totalFiles;
				var loadedFiles = ++this.loadedFiles;
				/* Rounding paranoia ensures we always have a 100%... */
				var pc = (total==loadedFiles)?100:Math.floor((100 * loadedFiles) / total);
				
				this.gameCode.resourceProgress(pc);
				
				if (total==loadedFiles)
				{
					this.gotoScreen(this.currentLevel.startScreen);
				}
	        });
	        img.src = url;
	    }));
	}
	
	P5Game.prototype.clearElementIndices = function()
	{
		for (var n in this.currentLevel.eleIdx)
		{
			delete this.gameCode[n];
		}
		this.currentLevel.eleIdx = {};
		this.currentLevel.sprIdx = {};
	}
	
	P5Game.prototype.gotoScreen = function(screenName)
	{
		var lvl = this.currentLevel;
		var scr = lvl.screens[screenName];
		
		this.clearElementIndices();
		
		for (var i =0; i < scr.elements.length; i++)
		{
			var e = scr.elements[i];
			this.createScreenElement(e, lvl, "sprite"+(i+1));
		}
	
		this.startLoop();
		this.gameCode.screenReady();
	}
	
	P5Game.prototype.createScreenElement = function(e, lvl, id)
	{
		var parent = lvl.layerIdx[e.layer].element;
		var ele = undefined;
				
		if (e.type == "img")
		{
			new P5Visual(this, e.name, parent, id, lvl.resources[e.res], e.x, e.y);
		}
		else if (e.type == "txt")
		{
			var labelOb = new P5Label(this, e.name, parent, id, e.x, e.y, e.cssClass, e.value);
		}
		else if (e.type == "sprite")
		{
			var sprDef = lvl.spritedefs[e.res];
			new P5Sprite(this, e.name, parent, id, lvl.resources[sprDef.res], e.x, e.y, sprDef, e.startRange);
		}
		else
		{
			this.gameCode.err("Not implemented: screen elements of type '"+e.type+"'");
			log("element", e);
			return;
		}
	}
	
	
	P5Game.prototype.startLoop = function()
	{
		this.loopEpoch = new Date().getTime();
		requestAnimationFrame(context(this).callback(this.gameLoop), this.scrn);
	}
	
	/** Callback function, so reference via context() to enclose 'this' */
	P5Game.prototype.gameLoop = function(time)
	{
		/* Since chrome fails to pass the time in its current build, we need to
		 * do some upsettingly unnecessary faffing to work out the loop time. */
		
		if (time == undefined)
		{
			time = new Date().getTime();
		}
		
		if (this.lastLoopTime == undefined)
		{
			/* This is the first frame. Don't do anything, just note the time and re-schedule... */
			/* Bit hacky, but our laziness will go unnoticed over 1/60th second. */
			this.lastLoopTime = time;
			requestAnimationFrame(context(this).callback(this.gameLoop), this.scrn);
			return;
		}
		
		if (time - this.lastFPSReport > 500)
		{
			this.lastFPSReport = time;
			this.fps = Math.floor(1000 / (time - this.lastLoopTime));
		}
		this.lastLoopTime = time;
		
		this.gameCode.update(time);
		
		var lvl = this.currentLevel;
		
		jQuery.each(lvl.sprIdx, function(name, e)
		{
			if (e.element.is(":visible")) /* TODO: Is there a faster test? Write your own? */
			{
				e.updateRange(time);
			}
		});
	
		requestAnimationFrame(context(this).callback(this.gameLoop), this.scrn);
	}
	
	P5Game.prototype.unarray = function(a,filter)
	{
		if (filter == null)
		{
			filter = [];
		}

		var o = new Object();
		
		for (var i = 0; i < a.length; i++)
		{
			var d = a[i];
			
			if (!d.hasOwnProperty("name"))
			{
				log("ERR", a);
				this.gameCode.err("JSON array must contain named objects.");
				return null;
			}
			
			var n = d.name;
			
			if (o.hasOwnProperty(n))
			{
				this.gameCode.err("Duplicate name in array: "+n);
				return null;
			}
			
			delete d.name;
			
			for (var prop in d)
			{
				if (d[prop].constructor == Array && jQuery.inArray(prop,filter) == -1)
				{
					d[prop] = this.unarray(d[prop]);
				}
			}
			
			o[n] = d;
		};
		
		return o;
	}
	
	P5Game.prototype.setParallaxPos = function(pc)
	{
		/* Queue this on the next animation update */
		requestAnimationFrame(context(this).callback(function() {
			var lyrs = this.currentLevel.layers;
			for (var i = 0; i < lyrs.length; i++)
			{
				var lyr = lyrs[i];
				if (lyr.hasOwnProperty("parallaxWidth"))
				{
					/* TODO: Optimise. Maintain a list of parallax layers to avoid this test. */
					/* TODO: Verify on load: Parallax width must be > game width */
					var pos = -Math.floor(pc * (lyr.parallaxWidth - this.width));
	
					/* TODO: Optimization. Multiple queued methods with requestAnimationFrame mean that
					 * each callback is likely to trigger a layout before the page is repainted. This can
					 * be avoided by batching DOM changes together. If we could somehow collate intended DOM
					 * changes in animation callbacks, but actually make those changes after all changes
					 * are known, then we'd only trigger a layout once. Not entirely sure how to do all that
					 * though. Meh. */
					lyr.element.css("left", pos+"px");
				}
			}
		}), this.scrn);
	}
	
	P5Game.prototype.run = function()
	{
		log("Loading game "+this.gameDataURL);
		
		jQuery.ajax({
			url: this.gameDataURL,
			dataType: 'json',
			
			success: context(this).callback(function(data) {
				log("raw game data", data);
				
				this.author = data.author;
				this.title = data.title;
				this.version = data.version;
				
				this.width = data.width;
				this.height = data.height;
				
				this.globalResources = this.unarray(data.resources);
				this.globalSprites = this.unarray(data.spritedefs);
				this.globalLayers = data.overlays;
				this.globalOverlayElements = data.overlayElements;
				
				this.levels = this.unarray(data.levels);
				
				/* TODO: Check for absense of anything and mark game as dead. */
				
				this.gameCode.gameInit(this);
				
				this.scrn = jQuery("<div id=\"plat5screen\" class=\"p5screen\" style=\"width:"+data.width+"px;height:"+data.height+"px;background-color:"+data.bgcolor+"\"></div>");
				this.gameContainer.append(this.scrn);
			}),
			
			error: context(this).callback(function()
			{
				this.gameCode.err("Failed to parse game JSON");
			})
		});
		
		return this;
	}
	
	P5Game.prototype.engineInfo = {version:"v1.0"};

return P5Game; })(); /* End class definition */


/*
 * P5Webkit
 * 
 * This is the parent class for all visual elements which adds in a bunch of platform specific
 * stuff on WebKit browsers.
 */
var P5Webkit = (function() { /* Begin class definition */

	function P5Webkit()
	{
		this.element = undefined;
	}
	
	P5Webkit.prototype.setPos = function(x, y)
	{
		this.element.css("-webkit-transform", "translate3d("+x+"px,"+y+"px,0)");
	}

return P5Webkit; })(); /* End class definition */


/*
 * P5Mozilla
 * 
 * This is the parent class for all visual elements which adds in a bunch of platform specific
 * stuff on Mozilla browsers.
 */
var P5Mozilla = (function() { /* Begin class definition */

	function P5Mozilla()
	{
		this.element = undefined;
	}
	
	P5Mozilla.prototype.setPos = function(x, y)
	{
		this.element.css("-moz-transform", "translate("+x+"px,"+y+"px)");
	}

return P5Mozilla; })(); /* End class definition */


/*
 * P5IE
 * 
 * This is the parent class for all visual elements which adds in a bunch of platform specific
 * stuff on IE browsers.
 */
var P5IE = (function() { /* Begin class definition */

	function P5IE()
	{
		this.element = undefined;
	}
	
	P5IE.prototype.setPos = function(x, y)
	{
		/* Ok, IE is ambitious right now. */
		//this.element.css("-moz-transform", "translate("+x+"px,"+y+"px)");
	}

return P5IE; })(); /* End class definition */


var P5PlatformCode = P5IE;
if (jQuery.browser.webkit)
{
	P5PlatformCode = P5Webkit;
}
else if (jQuery.browser.mozilla)
{
	P5PlatformCode = P5Mozilla;
}


/*
 * P5Visual
 * 
 * This is the parent class for all things on the screen, and also the
 * class used for simple, static images.
 */
var P5Visual = (function() { /* Begin class definition */

	/* TODO: Refactor: Move the creation of the elements into the constructors of these
	 * classes. Just pass in a parent DOM node and the class creates its own element and
	 * inserts itself. A parent class could provide browser specifics via this mechanism. */

	P5Visual.prototype = new P5PlatformCode();
	P5Visual.prototype.constructor=P5Visual;
	function P5Visual(game, name, parent, id, resDef, x, y)
	{
		var lvl = game.currentLevel;
		var gc = game.gameCode;
		
		if (lvl.eleIdx.hasOwnProperty(name) || gc.hasOwnProperty(name))
		{
			gc.err("Element name collision (image): "+e.name);
			return null;
		}
		
		this.theGame = game;
		
		this.element = jQuery("<div id=\""+id+"\" class=\"p5image\" style=\"-webkit-transform: translate3d("+x+"px,"+y+"px,0px);\"><img src=\""+resDef.img+"\"/></div>");
		
		lvl.eleIdx[name] = this;
		gc[name] = this;

		parent.append(this.element);
	}
	

return P5Visual; })(); /* End class definition */




/*
 * P5Sprite
 * 
 * This is the sprite class for visual elements with frames of animation.
 */

var P5Sprite = (function() { /* Begin class definition */
	
	P5Sprite.prototype = new P5Visual();
	P5Sprite.prototype.constructor=P5Sprite;
	function P5Sprite(game, name, parent, id, resDef, x, y, spriteDef, startRange)
	{
		/*
		 * TODO: It would be nice to call the parent constructor, like this:
		 * P5Visual.prototype.constructor.call(this, game, name, parent, id, resDef, x, y);
		 * but I can't figure out a way to do that and have different markup for element, and
		 * keep all the functionality in one function. So replicated code it is for the timebeing.
		 */
		var lvl = game.currentLevel;
		var gc = game.gameCode;
		
		if (lvl.eleIdx.hasOwnProperty(name) || gc.hasOwnProperty(name))
		{
			gc.err("Element name collision (sprite): "+name);
			return null;
		}
		
		this.theGame = game;
		
		this.element = jQuery("<div id=\""+id+"\" style=\"background-image:url('"+resDef.strip+"');width:"+resDef.width+"px;height:"+resDef.height+"px;position: absolute;top:0;left:0;-webkit-transform: translate3d("+x+"px,"+y+"px,0px);\"></div>");
		
		this.spriteDef = spriteDef;
		
		lvl.eleIdx[name] = this;
		lvl.sprIdx[name] = this;
		gc[name] = this;
		
		parent.append(this.element);
		this.startRange(startRange);
		this.updateRange(new Date().getTime());
	}
	
	P5Sprite.prototype.startRange = function(rangeName)
	{
		this.currentRange = this.spriteDef.ranges[rangeName];
		this.frameDuration = 1000 / this.currentRange.fps;
		this.updateRange = this["updateRange_"+this.currentRange.type];
		this.rangeEpoch = new Date().getTime();
	}

	P5Sprite.prototype.updateRange_cycle = function(time)
	{
		var r = this.currentRange;
		var dt = Math.floor((time - this.rangeEpoch) / this.frameDuration);
		var fIdx;
		if (dt <= 0)
		{
			fIdx = 0;
		}
		else
		{
			fIdx = (dt % (r.to - r.from + 1)) + r.from;
		}
		if (fIdx == this.currentFrame)
		{
			return;
		}
		this.currentFrame = fIdx;
		var fr = this.spriteDef.frames[fIdx];
	
		this.element.css("background-position", fr.xshift+"px "+fr.yshift+"px");
	}
	
	P5Sprite.prototype.updateRange_static = function(time)
	{
		this.currentFrame = this.currentRange.frame;
		var fr = this.spriteDef.frames[this.currentFrame];
		this.element.css("background-position", fr.xshift+"px "+fr.yshift+"px");
		this.updateRange = jQuery.noop; /* Remove the update function to stop the sprite. */
	}
	
return P5Sprite; })(); /* End class definition */




/*
 * P5Label
 * 
 * This is the class for a piece of text on-screen.
 */


var P5Label = (function() { /* Begin class definition */
	
	P5Label.prototype = new P5Visual();
	P5Label.prototype.constructor=P5Label;
	function P5Label(game, name, parent, id, x, y, cssClass, text)
	{
		var lvl = game.currentLevel;
		var gc = game.gameCode;

		if (lvl.eleIdx.hasOwnProperty(name) || gc.hasOwnProperty(name))
		{
			gc.err("Element name collision (label): "+name);
			return null;
		}
		
		this.theGame = game;
		
		this.element = jQuery("<div id=\""+id+"\" class=\"p5text "+cssClass+"\" style=\"-webkit-transform: translate3d("+x+"px,"+y+"px,0px);\">"+text+"</div>");

		lvl.eleIdx[name] = this;
		gc[name] = this;
		parent.append(this.element);
	}

	P5Label.prototype.setText = function(val)
	{
		this.element.text(val);
	}
	
	/* TODO: getText, retrieves from DOM */
	
return P5Label; })(); /* End class definition */


/*
 * P5Layer
 * 
 * This is the class for a screen layer containing visuals.
 */

var P5Layer = (function() { /* Begin class definition */

	function P5Layer(game)
	{
		this.theGame = game;
	}

return P5Layer; })(); /* End class definition */

