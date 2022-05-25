markerUtils={}

markerUtils._TMCPStyle={ strokeWidth: 10, radius: 3, drawText:true, textSize:1, textYoffset:0.010 };

markerUtils._TMCPS={"fixed":{},"moving":{}};


markerUtils.getPoints = function(){
    return markerUtils._TMCPS
}

markerUtils.TMCP = function(element,options){
	var overlay = options.overlay || "fixed";
	var drawText = options.drawText || markerUtils._TMCPStyle.drawText;
	var imageWidth=options.imageWidth || overlayUtils.OSDimageWidth(overlay);
	var tmcpid=overlayUtils.TMCPCount[overlay]
	var strokeWidth=options.strokeWidth || markerUtils._TMCPStyle.strokeWidth; strokeWidth/=imageWidth/10;
	var radius=options.radius || markerUtils._TMCPStyle.radius; radius/=imageWidth;
	var strokeColor=options.strokeColor || overlayUtils.randomColor();
	var extraClass=options.extraClass || null;
	var x = options.x || null;
	var y = options.y || null;
	var gx =options.gx || x*imageWidth;
	var gy =options.gy || y*imageWidth;
	var elemEnter = element
	.append("g")
		.attr("id","TMCP-"+overlay+"-"+tmcpid)
		.attr( 'transform','translate('+ x +','+ y +')')
		.attr( 'vx',x)
		.attr( 'vy',y)
		.attr( 'gx',gx)
		.attr( 'gy',gy);
	if(extraClass){
		elemEnter.attr("class","TMCP-"+overlay+" "+extraClass)
	}else{
		elemEnter.attr("class","TMCP-"+overlay)
	}		
	var square=elemEnter
	.append("path")
		.attr( "d", d3.symbol().size(radius).type(d3.symbolSquare))
		.attr("transform", "rotate(45)")
		.attr('stroke-width',strokeWidth)
		.attr('stroke', strokeColor).style("fill","rgba(0,0,0,0.2)" );
		//.attr('stroke', strokeColor).style("fill","transparent" )
	var circle=elemEnter
	.append("path")
		.attr( "d", d3.symbol().size(radius/25).type(d3.symbolCircle))
		.attr("transform", "rotate(45)")
		.attr('stroke-width',strokeWidth/2)
		.attr('stroke', "gray").style("fill","transparent" );
	if(drawText){
		var text = elemEnter
		.append("text").style("fill", "blue").style("stroke", "white").style("stroke-width", 0.004)
		.style("font-size", "1%").attr("text-anchor", "middle")
        .attr( 'transform','translate(0,'+markerUtils._TMCPStyle.textYoffset+') scale('+(markerUtils._TMCPStyle.textSize/20).toString()+ ') rotate('+(360 - tmcpoints[overlay+'_viewer'].viewport.getRotation()).toString()+')')
		.text(function(){
			var toreturn=String(tmcpid); 
			overlayUtils.TMCPCount[overlay]+=1; 
			return toreturn
		});
	}
	
	if(options.saveToTMCPS){
		markerUtils._TMCPS[overlay]["TMCP-"+overlay+"-"+tmcpid]={"vx":x,"vy":y,
		"gx":gx,"gy":gy,"id":tmcpid,"color":strokeColor};
	}

	d3.select("#TMCP-"+overlay+"-"+(tmcpid)).each(function() {
		overlayUtils.addTrackingToDOMElement(this,overlay);
	});

	return {"strokeColor":strokeColor,"radius":radius,"strokeWidth":strokeWidth,"id":tmcpid };
}

markerUtils.modifyPoint= function(options){

	if(!options.hasOwnProperty('overlay')){
		console.log("can't modify point if I don't know which overlay it is");
		return;
	}

	var overlay=options.overlay;

	if(!options.hasOwnProperty('htmlid')){
		console.log("can't modify point if I don't know which id it is");
		return;
	}

	var htmlid=options.htmlid;

	//var drawText = options.drawText || markerUtils._TMCPStyle.drawText;
	var imageWidth=options.imageWidth || overlayUtils.OSDimageWidth(overlay);
	var htmlid=options.htmlid;
	//var strokeWidth=options.strokeWidth || markerUtils._TMCPStyle.strokeWidth; strokeWidth/=imageWidth/10;
	//var radius=options.radius || markerUtils._TMCPStyle.radius; radius/=imageWidth;
	var strokeColor=options.strokeColor || overlayUtils.randomColor();
	//var extraClass=options.extraClass || null;
	var x = options.x || null;
	var y = options.y || null;
	var gx =options.gx || x*imageWidth;""
	var gy =options.gy || y*imageWidth;

	markerUtils._TMCPS[overlay][htmlid]["vx"]=x
	markerUtils._TMCPS[overlay][htmlid]["vy"]=y
	markerUtils._TMCPS[overlay][htmlid]["gx"]=gx
	markerUtils._TMCPS[overlay][htmlid]["gy"]=gy
	

}
