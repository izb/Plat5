/**
* plat5: Platform game engine for HTML5 browsers.
* Author: Ian Beveridge
* Email: ian.beveridge@gmail.com
* URL: http://kupio.com/plat5
* Version: 1.0
*/

/* TODO: Make this check the version and alert if it's insufficient. */
log("Setting up Plat5 library. Using jQuery v"+$.fn.jquery);


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

P5Game.prototype.loadLevel = function(lvl)
{
	if (this.levels[lvl].hasOwnProperty("layers"))
	{
		/* Already loaded. */
		this.gameCode.levelInit();
		this.loadResources();
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
			
			this.loadResources();
		}),
		
		error: context(this).callback(function()
		{
			this.gameCode.err("Failed to parse level JSON on level "+lvl);
		})
	});
}

P5Game.prototype.loadResources = function()
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

P5Game.prototype.gotoScreen = function(screenName)
{
	var lvl = this.currentLevel;
	var scr = lvl.screens[screenName];
	
	this.currentLevel.eleIdx = {};
	this.currentLevel.sprIdx = {};
	
	for (var i =0; i < scr.elements.length; i++)
	{
		var e = scr.elements[i];
		this.createScreenElement(e, lvl, "sprite"+(i+1));
	}

	this.startLoop();
	this.gameCode.screenReady();
}

P5Game.prototype.startRange = function(sprName, rangeName)
{
	var lvl = this.currentLevel;
	var e = lvl.eleIdx[sprName];
	e.currentRange = e.spriteDef.ranges[rangeName];
	e.frameDuration = 1000 / e.currentRange.fps;
	e.updateRange = this["updateRange_"+e.currentRange.type];
	e.rangeEpoch = new Date().getTime();
}

P5Game.prototype.createScreenElement = function(e, lvl, id)
{
	var parent = lvl.layerIdx[e.layer].element;
	var ele = undefined;
		
	if (lvl.eleIdx.hasOwnProperty(e.name))
	{
		this.gameCode.err("Element name collision: "+e.name);
		return;
	}

	if (e.type == "img")
	{
		var res = lvl.resources[e.res];
		ele = jQuery("<div id=\""+id+"\" class=\"p5image\" style=\"-webkit-transform: translate3d("+e.x+"px,"+e.y+"px,0px);\"><img src=\""+res.img+"\"/></div>");
		e.element = ele;
		lvl.eleIdx[e.name] = e;
		parent.append(ele);
	}
	else if (e.type == "txt")
	{
		ele = jQuery("<div id=\""+id+"\" class=\"p5text "+e.cssClass+"\" style=\"-webkit-transform: translate3d("+e.x+"px,"+e.y+"px,0px);\">"+e.value+"</div>");
		e.element = ele;
		lvl.eleIdx[e.name] = e;
		parent.append(ele);
	}
	else if (e.type == "sprite")
	{
		var sprDef = lvl.spritedefs[e.res];
		var res = lvl.resources[sprDef.res];
		ele = jQuery("<div id=\""+id+"\" style=\"background-image:url('"+res.strip+"');width:"+res.width+"px;height:"+res.height+"px;position: absolute;top:0;left:0;-webkit-transform: translate3d("+e.x+"px,"+e.y+"px,0px);\"></div>");
		
		e.updateRange = jQuery.noop;
		e.element = ele;
		e.spriteDef = sprDef;
		
		lvl.eleIdx[e.name] = e;
		lvl.sprIdx[e.name] = e;
		
		parent.append(ele);
		this.startRange(e.name, e.startrange);
		e.updateRange(new Date().getTime());
	}
	else
	{
		this.gameCode.err("Not implemented: screen elements of type '"+e.type+"'");
		log("element", e);
		return;
	}
}

P5Game.prototype.setText = function(eleName, val)
{
	var ele = this.currentLevel.eleIdx[eleName].element;
	
	/* TODO: Verify that this is a text node? Possibly not.. I'm leaning towards
	 * seat-of-pants optimisation, and to hell with telling anyone what went wrong.
	 * If it explodes, I want you to cry whilst debugging it. */
	
	ele.text(val);
}

P5Game.prototype.setPos = function(eleName, x, y)
{
	var ele = this.currentLevel.eleIdx[eleName];
	ele.element.css("-webkit-transform", "translate3d("+x+"px,"+y+"px,0)");
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

P5Game.prototype.updateRange_cycle = function(time)
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

P5Game.prototype.updateRange_static = function(time)
{
	this.currentFrame = this.currentRange.frame;
	var fr = this.spriteDef.frames[this.currentFrame];
	this.element.css("background-position", fr.xshift+"px "+fr.yshift+"px");
	this.updateRange = jQuery.noop;
}

P5Game.prototype.unarray = function(a,filter)
{
	if (filter == null)
	{
		filter = [];
	}
		
	var o = new Object();
	for (var i =0; i < a.length; i++)
	{
		var d = a[i];
		if (!d.hasOwnProperty("name"))
		{
			log("ERR", a);
			this.gameCode.err("JSON array must contain named objects.");
			return null;
		};
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


function P5Game(gameDataURL, gameContainer, gameCode)
{
	this.gameCode = gameCode;
	
	this.gameDataURL = gameDataURL;
	this.gameContainer = gameContainer;
	
	this.loopEpoch = undefined;
	this.lastLoopTime = undefined;
	this.lastFPSReport = 0;
}


/*
 * P5Visual
 * 
 * This is the parent class for all things on the screen, and also the
 * class used for simple, static images.
 */

function P5Visual(game)
{
	this.theGame = game;
}




/*
 * P5Sprite
 * 
 * This is the sprite class for visual elements with frames of animation.
 */


P5Sprite.prototype = new P5Visual();
P5Sprite.prototype.constructor=P5Sprite;
function P5Sprite(game)
{
	P5Visual.prototype.constructor.call(this, game);
}




/*
 * P5Label
 * 
 * This is the class for a piece of text on-screen.
 */


P5Label.prototype = new P5Visual();
P5Label.prototype.constructor=P5Label;
function P5Label(game)
{
	P5Label.prototype.constructor.call(this, game);
}


/*
 * P5Layer
 * 
 * This is the class for a screen layer containing visuals.
 */


function P5Layer(game)
{
	this.theGame = game;
}


