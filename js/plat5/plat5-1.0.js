/**
* plat5: Platform game engine for HTML5 browsers.
* Author: Ian Beveridge
* Email: ian.beveridge@gmail.com
* URL: http://kupio.com/plat5
* Version: 1.0
*/

/* TODO: Make this check the version and alert if it's insufficient. */
log("Setting up Plat5 library. Using jQuery v"+$.fn.jquery);

/* TODO: Move these into the class and do away with the error that forbids 2 games on one
 * page. */
var loopEpoch = undefined;
var lastLoopTime = undefined;
var lastFPSReport = 0;
var theGame = undefined;


/* TODO: Review error messages and turn relevant ones into exceptions. */

/* TODO: Refactoring job: functions can be split into two kinds.. those
 * that aren't allowed to change the DOM, and those that are. Those that
 * are are anything scheduled or called indirectly from requestAnimationFrame.
 * It might be an idea to separate out the ones that are into a different
 * namespace, just to clear up the code. */


Plat5Game.prototype.loadLevel = function(lvl)
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
		url: theGame.levels[lvl].data,
		dataType: 'json',
		
		success: function(data) {
			log("raw level data",data);
			
			data.resources = jQuery.extend(true, {}, theGame.unarray(data.resources), theGame.globalResources);
			data.spritedefs = jQuery.extend(true, {}, theGame.unarray(data.spritedefs), theGame.globalSprites);
			data.screens = theGame.unarray(data.screens, ["elements"]);
			for (var scrName in data.screens)
			{
				var scr = data.screens[scrName];
				scr.elements = scr.elements.concat(theGame.globalOverlayElements);
			}
			
			for (var i = 0; i < theGame.globalLayers.length; i++)
			{
				data.layers.push(jQuery.extend(true, {}, theGame.globalLayers[i]));
			}
			
			data.layerIdx = theGame.unarray(data.layers);
			
			theGame.levels[lvl] = data;
			
			theGame.currentLevel = theGame.levels[lvl];
			
			/* TODO: This replaces all the children with new layers. Perhaps we want to
			 * have level transitions one day. Ponder this... */
			theGame.scrn.children().remove();

			var lyrs = theGame.levels[lvl].layers;
			for (var i = 0; i < lyrs.length; i++)
			{
				var lyr = lyrs[i];

				var layerEle = jQuery("<div id=\"gamelayer"+(i+1)+"\" class=\"p5layer\" style=\"width:"+theGame.width+"px;height:"+theGame.height+"px\"></div>");
				lyr.element = layerEle;
    			theGame.scrn.append(layerEle);
    			
				layerEle = jQuery("<div id=\"parallax"+(i+1)+"\" class=\"p5parallax\" style=\"width:"+theGame.width+"px;height:"+theGame.height+"px\"></div>");
    			lyr.element.append(layerEle);
				lyr.element = layerEle;
			}
			
			log("Level data for level: "+lvl, theGame.levels[lvl]);

			theGame.gameCode.levelInit();
			
			theGame.loadResources();
		},
		
		error: function()
		{
			theGame.gameCode.err("Failed to parse level JSON on level "+lvl);
		}
	});
}

Plat5Game.prototype.loadResources = function()
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
	
	jQuery.each(res, function(name, r)
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
        img.onload = function()
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
			
			var total = theGame.totalFiles;
			var loadedFiles = ++theGame.loadedFiles;
			/* Rounding paranoia ensures we always have a 100%... */
			var pc = (total==loadedFiles)?100:Math.floor((100 * loadedFiles) / total);
			
			theGame.gameCode.resourceProgress(pc);
			
			if (total==loadedFiles)
			{
				theGame.gotoScreen(theGame.currentLevel.startScreen);
			}
        }
        img.src = url;
    });
}

Plat5Game.prototype.gotoScreen = function(screenName)
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

Plat5Game.prototype.startRange = function(sprName, rangeName)
{
	var lvl = theGame.currentLevel;
	var e = lvl.eleIdx[sprName];
	e.currentRange = e.spriteDef.ranges[rangeName];
	e.frameDuration = 1000 / e.currentRange.fps;
	e.updateRange = this["updateRange_"+e.currentRange.type];
	e.rangeEpoch = new Date().getTime();
}

Plat5Game.prototype.createScreenElement = function(e, lvl, id)
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
		theGame.startRange(e.name, e.startrange);
		e.updateRange(new Date().getTime());
	}
	else
	{
		this.gameCode.err("Not implemented: screen elements of type '"+e.type+"'");
		log("element", e);
		return;
	}
}

Plat5Game.prototype.setText = function(eleName, val)
{
	var ele = this.currentLevel.eleIdx[eleName].element;
	
	/* TODO: Verify that this is a text node? Possibly not.. I'm leaning towards
	 * seat-of-pants optimisation, and to hell with telling anyone what went wrong.
	 * If it explodes, I want you to cry whilst debugging it. */
	
	ele.text(val);
}

Plat5Game.prototype.setPos = function(eleName, x, y)
{
	var ele = this.currentLevel.eleIdx[eleName];
	ele.element.css("-webkit-transform", "translate3d("+x+"px,"+y+"px,0)");
}

Plat5Game.prototype.startLoop = function()
{
	loopEpoch = new Date().getTime();
	requestAnimationFrame(this.gameLoop, theGame.scrn);
}

/** Callback function, so no 'this' context. */
Plat5Game.prototype.gameLoop = function(time)
{
	/* Since chrome fails to pass the time in its current build, we need to
	 * do some upsettingly unnecessary faffing to work out the loop time. */
	
	if (time == undefined)
	{
		time = new Date().getTime();
	}
	
	if (lastLoopTime == undefined)
	{
		/* This is the first frame. Don't do anything, just note the time and re-schedule... */
		/* Bit hacky, but our laziness will go unnoticed over 1/60th second. */
		lastLoopTime = time;
		requestAnimationFrame(theGame.gameLoop, theGame.scrn);
		return;
	}
	
	if (time - lastFPSReport > 500)
	{
		lastFPSReport = time;
		theGame.fps = Math.floor(1000 / (time - lastLoopTime));
	}
	lastLoopTime = time;
	
	theGame.gameCode.update(time);
	
	var lvl = theGame.currentLevel;
	
	jQuery.each(lvl.sprIdx, function(name, e)
	{
		if (e.element.is(":visible")) /* TODO: Is there a faster test? Write your own? */
		{
			e.updateRange(time);
		}
	});

	requestAnimationFrame(theGame.gameLoop, theGame.scrn);
}

Plat5Game.prototype.updateRange_cycle = function(time)
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

	this.element.css({backgroundPosition: fr.xshift+"px "+fr.yshift+"px"});
}

Plat5Game.prototype.updateRange_static = function(time)
{
	/* TODO: 'this' is a sprite element, but the class is Plat5Game. Oh JS, you demented
	 * buffoon. Untwist this code. */
	this.currentFrame = this.currentRange.frame;
	var fr = this.spriteDef.frames[this.currentFrame];
	this.element.css({backgroundPosition: fr.xshift+"px "+fr.yshift+"px"});
	this.updateRange = jQuery.noop;
}

Plat5Game.prototype.unarray = function(a,filter)
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

Plat5Game.prototype.setParallaxPos = function(pc)
{
	/* Queue this on the next animation update */
	requestAnimationFrame(function() {
		var lyrs = theGame.currentLevel.layers;
		for (var i = 0; i < lyrs.length; i++)
		{
			var lyr = lyrs[i];
			if (lyr.hasOwnProperty("parallaxWidth"))
			{
				/* TODO: Optimise. Maintain a list of parallax layers to avoid this test. */
				/* TODO: Verify on load: Parallax width must be > game width */
				var pos = -Math.floor(pc * (lyr.parallaxWidth - theGame.width));

				/* TODO: Optimization. Multiple queued methods with requestAnimationFrame mean that
				 * each callback is likely to trigger a layout before the page is repainted. This can
				 * be avoided by batching DOM changes together. If we could somehow collate intended DOM
				 * changes in animation callbacks, but actually make those changes after all changes
				 * are known, then we'd only trigger a layout once. Not entirely sure how to do all that
				 * though. Meh. */
				lyr.element.css("left", pos+"px");
			}
		}
	}, this.scrn);
}

Plat5Game.prototype.run = function()
{
	log("Loading game "+this.gameDataURL);
	
	jQuery.ajax({
		url: theGame.gameDataURL,
		dataType: 'json',
		
		success: function(data) {
			log("raw game data", data);
			
			theGame.author = data.author;
			theGame.title = data.title;
			theGame.version = data.version;
			
			theGame.width = data.width;
			theGame.height = data.height;
			
			theGame.globalResources = theGame.unarray(data.resources);
			theGame.globalSprites = theGame.unarray(data.spritedefs);
			theGame.globalLayers = data.overlays;
			theGame.globalOverlayElements = data.overlayElements;
			
			theGame.levels = theGame.unarray(data.levels);
			
			/* TODO: Check for absense of anything and mark game as dead. */
			
			theGame.gameCode.gameInit();
			
			theGame.scrn = jQuery("<div id=\"plat5screen\" class=\"p5screen\" style=\"width:"+data.width+"px;height:"+data.height+"px;background-color:"+data.bgcolor+"\"></div>");
			theGame.gameContainer.append(theGame.scrn);
		},
		
		error: function()
		{
			theGame.gameCode.err("Failed to parse game JSON");
		}
	});
}


Plat5Game.prototype.engineInfo = {version:"v1.0"};


function Plat5Game(gameDataURL, gameContainer, gameCode)
{
	this.gameCode = gameCode;
	
	this.gameDataURL = gameDataURL;
	this.gameContainer = gameContainer;
	
	if (theGame != undefined)
	{
		gameCode.err("You can only have one game running on a page.");
	}

	theGame = this;
}
