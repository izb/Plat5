package com.kupio.plat5.tools.layout
{
	
	import flash.display.MovieClip;
	import flash.events.Event;
	import flash.display.DisplayObject;
	import flash.utils.getQualifiedClassName;
	
	
	public class Main extends MovieClip
	{
		public function Main()
		{
			this.addEventListener(Event.ADDED_TO_STAGE, onAdded);
		}
		
		public function onAdded(e :Event) :void
		{
			var layers :Array = [];
			
			for (var i = 0; i < numChildren; i++)
			{
				var child :MovieClip = getChildAt(i) as MovieClip;
				
				var lims :MovieClip = getLayerLimitClip(child);
				
				layers.push({name:getQualifiedClassName(child), type:"sprite", parallaxWidth:Math.floor(lims.width) + "px"});
			}
			
			dump(layers, "layers");
			trace(",");
			dumpResources(layers, "resources");
			dumpSprites(layers, "screen1");
		}
		
		private function dumpResources(a:Array, name:String):void
		{
			var seen :Object = new Object();
			
			trace("\""+name+"\":[");
			for (var i = 0; i < numChildren; i++)
			{
				var layer :MovieClip = getChildAt(i) as MovieClip;
				
				for (var j = 0; j < layer.numChildren; j++)
				{
					var s :MovieClip = layer.getChildAt(j) as MovieClip;
					var resName :String = getQualifiedClassName(s);
					if(seen.hasOwnProperty(resName))
					{
						continue;
					}
					seen[resName] = true;
					trace("    {\"name\":\""+resName+"\", \"img\":\"images/"+resName+".png\"},");
				}
			
			}
			trace("],");
		}
		
		private function dumpSprites(a:Array, name:String):void
		{
			trace("\"screens\":[");
			trace("    {");
			trace("        \"name\":\""+name+"\",");
			trace("        \"elements\":[");
			for (var i = 0; i < numChildren; i++)
			{
				var layer :MovieClip = getChildAt(i) as MovieClip;
				var layerName :String = getQualifiedClassName(layer);
				
				for (var j = 0; j < layer.numChildren; j++)
				{
					var s :MovieClip = layer.getChildAt(j) as MovieClip;
					var resName :String = getQualifiedClassName(s);
					trace("            {\"type\":\"img\", \"name\":\""+s.name+"\", \"res\":\""+resName+"\", \"layer\":\""
						  +layerName+"\", \"x\":"+Math.floor(s.x)+", \"y\":"+Math.floor(s.y)+"},");
				}
			
			}
			trace("        ]");
			trace("    },");
			trace("],");
		}
		
		private function dump(a:Array, name:String):void
		{
			trace("\""+name+"\":[");
			for each(var e:Object in a)
			{
				var ldata:String = "    {";
				for (var p:String in e)
				{
					ldata = ldata + "\""+p+"\": \""+e[p]+"\", ";
				}
				ldata = ldata + "},";
				
				trace(ldata);
			}
			trace("]");
		}
		
		private function getLayerLimitClip(e:MovieClip) :MovieClip
		{
			for (var i = 0; i < e.numChildren; i++)
			{
				var child :MovieClip = e.getChildAt(i) as MovieClip;
				if(getQualifiedClassName(child) == "LayerLimit")
				{
					return child;
				}				
			}
			trace("WARNING: Layer has no LayerLimit object. Oh dear.");
			return null;
		}
	}
	
}
