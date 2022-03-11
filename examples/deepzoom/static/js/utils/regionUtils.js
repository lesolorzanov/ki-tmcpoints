regionUtils = {
	/** if _isNewRegion is true then a new region will start */
	_isNewRegion: true,
	/** _currentlyDrawing:false, */
	_currentlyDrawing: false,
	/** __currentRegionId: keep then number of drawn regions and also let them be the id, */
	_currentRegionId: 0,
	/** _currentPoints: array of points for the current region, */
	_currentPoints: { "fixed": [], "moving": [] },
	/** _currentColor: hsl() or rgb() color of the region, to be appleid only to a region, */
	_currentColor: null,
	/** _colorInactiveHandle:"#cccccc", */
	_colorInactiveHandle: "#cccccc",
	/** _colorActiveHandle: Color of the point in the region, */
	_colorActiveHandle: "#ffff00",
	/** _scaleHandle: scale of the point in regions, */
	_scaleHandle: 0.0025,
	/** _polygonStrokeWidth: width of the stroke of the polygon, */
	_polygonStrokeWidth: 0.0006,
	/** _handleRadius:Radius of the point of the region, */
	_handleRadius: 0.1,
	/** _epsilonDistance: distance at which a click from the first point will consider to be closing the region, */
	_epsilonDistance: 0.004,
	/** _regions: object that contains the regions in the viewer, */
	_regions: { "fixed": {}, "moving": {} },
	/** _drawingclass: add this class to regionobejcts so that they can be removed easily */
	_drawingclass: "drawPoly",
	/** D3 groups to draw polys on */
	_regionD3Groups: { "fixed": null, "moving": null },
	resetManager: function () {
		//var drawingclass=regionUtils._drawingclass;
		//d3.select("."+drawingclass).remove();
		regionUtils._isNewRegion = true;
		regionUtils._currentPoints = { "fixed": [], "moving": [] };
		regionUtils._currentColor = overlayUtils.randomColor();
		regionUtils._regionD3Groups = { "fixed": null, "moving": null };
	},
	manager: function (event) {

		var drawingclass = regionUtils._drawingclass;
		var regiongrm;

		var viwerPoint = overlayUtils.getMatchingPointsFromClickFixed(event);
		var epointf = viwerPoint.fixed;
		var epointm = viwerPoint.moving;
		var canvasF = tmcpoints.fixed_svgov.node();
		var canvasM = tmcpoints.moving_svgov.node();

		if (regionUtils._isNewRegion) {
			regionUtils.resetManager();
			//if this region is new then there should be no points, create a new array of points
			regionUtils._currentPoints = { "fixed": [], "moving": [] };
			//it is not a new region anymore
			regionUtils._isNewRegion = false;
			//give a new id
			regionUtils._currentRegionId += 1;
			var id = regionUtils._currentRegionId;


			regionUtils._currentPoints.fixed.push([epointf.x, epointf.y]);
			regionUtils._currentPoints.moving.push([epointm.x, epointm.y]);
			//create a group to store region
			regionUtils._regionD3Groups["fixed"] = d3.select(canvasF).append('g').attr('class', "fixed regionpolygr fixed"+ id);
			regionUtils._regionD3Groups["moving"] = d3.select(canvasM).append('g').attr('class', "moving regionpolygr moving"+ id);

			regiongrf = regionUtils._regionD3Groups["fixed"];
			regiongrm = regionUtils._regionD3Groups["moving"];
			//instead of a circle put a TMCP
			markerUtils.TMCP(regiongrf, {
				"extraClass": "first regionp regionp-" + id,
				"x": epointf.x, "y": epointf.y, "strokeColor": regionUtils._currentColor,
				"overlay": "fixed"
			})
			markerUtils.TMCP(regiongrm, {
				"extraClass": "first regionp regionp-" + id,
				"x": epointm.x, "y": epointm.y, "strokeColor": regionUtils._currentColor,
				"overlay": "moving"
			})

		} else {
			var id = regionUtils._currentRegionId;
			var count = regionUtils._currentPoints.fixed.length - 1;

			regionUtils._currentPoints.fixed.push([epointf.x, epointf.y]);
			regionUtils._currentPoints.moving.push([epointm.x, epointm.y]);

			regiongrf = regionUtils._regionD3Groups["fixed"];
			regiongrm = regionUtils._regionD3Groups["moving"];

			//instead of a circle put a TMCP
			markerUtils.TMCP(regiongrf, {
				"extraClass": "fixed regionp regionp-" + id,
				"x": epointf.x, "y": epointf.y, "strokeColor": regionUtils._currentColor, "overlay": "fixed"
			})
			markerUtils.TMCP(regiongrm, {
				"extraClass": "moving regionp regionp-" + id,
				"x": epointm.x, "y": epointm.y, "strokeColor": regionUtils._currentColor, "overlay": "moving"
			})

			regiongrf.select('polyline').remove();
			var polylinef = regiongrf.append('polyline').attr('points', regionUtils._currentPoints.fixed)
				.style('fill', 'none')
				.attr('stroke-width', regionUtils._polygonStrokeWidth.toString())
				.attr('stroke', '#000').attr('class', "region-" + id);

			regiongrm.select('polyline').remove();
			var polylinem = regiongrm.append('polyline').attr('points', regionUtils._currentPoints.moving)
				.style('fill', 'none')
				.attr('stroke-width', '0.0015')
				.attr('stroke', '#000').attr('class', "region-" + id);

		}
	},
	distance: function (p1, p2) {
		return Math.sqrt((p1[0] - p2[0]) * (p1[0] - p2[0]) + (p1[1] - p2[1]) * (p1[1] - p2[1]))

	},
	addRegion: function (points, regionid, overlay) {
		var region = { "id": regionid, "points": [], "globalPoints": [], "regionName": regionid, "regionClass": null, "color": regionUtils._currentColor };
		var imageWidth = overlayUtils.OSDimageWidth(overlay);
		region.len = points.length;
		var _xmin = points[0][0], _xmax = points[0][0], _ymin = points[0][1], _ymax = points[0][1];
		var objectPointsArray = [];
		for (var i = 0; i < region.len; i++) {
			if (points[i][0] > _xmax) _xmax = points[i][0];
			if (points[i][0] < _xmin) _xmin = points[i][0];
			if (points[i][1] > _ymax) _ymax = points[i][1];
			if (points[i][1] < _ymin) _ymin = points[i][1];
			region.points.push({ "x": points[i][0], "y": points[i][1] });
			region.globalPoints.push({ "x": points[i][0] * imageWidth, "y": points[i][1] * imageWidth });
		}
		region._xmin = _xmin, region._xmax = _xmax, region._ymin = _ymin, region._ymax = _ymax;
		region._gxmin = _xmin * imageWidth, region._gxmax = _xmax * imageWidth, region._gymin = _ymin * imageWidth, region._gymax = _ymax * imageWidth;
		regionUtils._regions[overlay][regionid] = region;
		//and in case I have a region UI add it
		//regionUtils.regionUI(regionid);
	},
	closePolygon: function () {
		var id = regionUtils._currentRegionId
		regiongrf = regionUtils._regionD3Groups["fixed"];
		regiongrm = regionUtils._regionD3Groups["moving"];

		regiongrf.select('polyline').remove();
		var polylinef = regiongrf.append('polygon').attr('points', regionUtils._currentPoints.fixed)
			.style('fill', 'none').style("stroke", regionUtils._currentColor)
			.attr('stroke-width', regionUtils._polygonStrokeWidth.toString())
			.attr('class', "regionpoly regionpoly-" + id);

		regiongrm.select('polyline').remove();
		var polylinem = regiongrm.append('polygon').attr('points', regionUtils._currentPoints.moving)
			.style('fill', 'none').style("stroke", regionUtils._currentColor)
			.attr('stroke-width', regionUtils._polygonStrokeWidth.toString())
			.attr('class', "regionpoly regionpoly-" + id);

		regionUtils._isNewRegion = true;

		regionUtils.addRegion(regionUtils._currentPoints["fixed"], "fixed" + id, "fixed");
		regionUtils.addRegion(regionUtils._currentPoints["moving"], "moving" + id, "moving");

		regionUtils.resetManager();
	},
	removeRegionIdOverlay: function (id, overlay) {
		d3.select('.regionpolygr .' + overlay+id).selectAll("polygon").remove();
	},
	//returns the D3 object
	removeRegionContent:function(regionid){
		var regiongr=d3.select('.regionpolygr .' + regionid)
		regiongr.selectAll("*").remove();
		return regiongr;
	},
	removePoly: function (id, overlay) {
		d3.select(".regionpolygr"+"."+overlay+id).selectAll("polygon").remove();
	},
	getRegion: function (id, overlay) {
		return regionUtils._regions[overlay][overlay + id.toString()];
	},
	getRegionByRID: function(regionid) {
		for (var v in regionUtils._regions){ 
 			for (r in regionUtils._regions[v]) {
				if(r==regionid) return regionUtils._regions[v][r];
			}
		}
        	
		return null;
        },
	modifyRegion: function (points, id, overlay) {
		if (regionUtils._isNewRegion) {
			var region = regionUtils.getRegion(id, overlay);
			region.points = []
			region.globalPoints = []
			var imageWidth = overlayUtils.OSDimageWidth(overlay);
			region.len = points.length;
			var _xmin = points[0][0], _xmax = points[0][0], _ymin = points[0][1], _ymax = points[0][1];
			var objectPointsArray = [];
			for (var i = 0; i < region.len; i++) {
				if (points[i][0] > _xmax) _xmax = points[i][0];
				if (points[i][0] < _xmin) _xmin = points[i][0];
				if (points[i][1] > _ymax) _ymax = points[i][1];
				if (points[i][1] < _ymin) _ymin = points[i][1];
				region.points.push({ "x": points[i][0], "y": points[i][1] });
				region.globalPoints.push({ "x": points[i][0] * imageWidth, "y": points[i][1] * imageWidth });
			}
			region._xmin = _xmin, region._xmax = _xmax, region._ymin = _ymin, region._ymax = _ymax;
			region._gxmin = _xmin * imageWidth, region._gxmax = _xmax * imageWidth, region._gymin = _ymin * imageWidth, region._gymax = _ymax * imageWidth;
			regionUtils._regions[overlay][overlay + id] = region;
			//and in case I have a region UI add it
			//regionUtils.regionUI(regionid);
		} else {
			console.log("region is still under construction");
		}
	},
	importRegion: function (region, overlay, options) {
		//regionUtils._currentRegionId+=1;
		//region obejcts contain id,points,globalPoints,regionName,regionClass,color,len,_xmin,_xmax,_ymin,_ymax,_gxmin,_gxmax,_gymin,_gymax
		var canvas = tmcpoints[overlay + "_svgov"].node();
		//var id=regionUtils._currentRegionId;
		var id = region.id.replace(overlay, "");
		if (Number(id) > regionUtils._currentRegionId) regionUtils._currentRegionId = Number(id);
		var imwidth= overlayUtils.OSDimageWidth(overlay);
		//create a group to store region
		var regiongr = d3.select(canvas).append('g')
			.attr('class', overlay +" "+ overlay+id + " regionpolygr");

		regionUtils._regions[overlay][region.id] = region;
		var xmax=region.points[0].x, xmin=region.points[0].x, ymin=region.points[0].y, ymax=region.points[0].y;
		var svgpolygonformattedpoints = [];
		region.points.forEach(function (point) {
			svgpolygonformattedpoints.push([point.x, point.y]);
			if(point.x >xmax) xmax=Number(point.x);
			if(point.x <xmin) xmin=Number(point.x);
			if(point.y >ymax) ymax=Number(point.y);
			if(point.y <ymin) ymin=Number(point.y);
			markerUtils.TMCP(regiongr, {
				"extraClass": overlay + " regionp regionp-" + id,
				"x": point.x, "y": point.y, "strokeColor": region.color,
				"overlay": overlay
			});
		});
		region._gxmax=xmax*imwidth; region._gxmin=xmin*imwidth; region._gymax=ymax*imwidth; region._gymin=ymin*imwidth;
		region._xmax=xmax; region._xmin=xmin; region._ymax=ymax; region._ymin=ymin;
		regiongr.append('polygon').attr('points', svgpolygonformattedpoints)
			.style('fill', 'none').style("stroke", region.color)
			.attr('stroke-width', '0.0015').attr('class', "regionpoly regionpoly-" + id);

	},
	regionsOnOff: function () {
		overlayUtils._drawRegions = !overlayUtils._drawRegions;
		if (overlayUtils._drawRegions) {
			document.getElementById('drawregions_btn').setAttribute("class", "btn btn-primary")
		} else {
			regionUtils.resetManager();
			document.getElementById('drawregions_btn').setAttribute("class", "btn btn-secondary")
		}
	},
	//if a region already exists you can re draw it
	redrawRegion: function(regionid,overlay){
		var regiongr=d3.select('.regionpolygr.'+regionid);
		regiongr.selectAll("*").remove();

		//extract number from regionid
		var id=regionid.replace(/\D/g,'');id=id.toString();

		var region=regionUtils._regions[overlay][regionid];

		var svgpolygonformattedpoints = [];
		region.points.forEach(function (point) {
			svgpolygonformattedpoints.push([point.x, point.y]);
			markerUtils.TMCP(regiongr, {
				"extraClass": overlay + " regionp regionp-" + id,
				"x": point.x, "y": point.y, "strokeColor": region.color,
				"overlay": overlay
			});
		});

		regiongr.append('polygon').attr('points', svgpolygonformattedpoints)
			.style('fill', 'none').style("stroke", region.color)
			.attr('stroke-width', '0.0015').attr('class', "regionpoly regionpoly-" + id);
	},
	//regionid, x, y, bool global, string overlayid
	moveregion: function(regionid,x,y,global,overlay){
		var imwidth= overlayUtils.OSDimageWidth(overlay);
		var region=regionUtils.getRegionByRID(regionid);
		var points=[];
		var globalPoints=[]
		if(!global){
			region.points.forEach(function(elem){
				var temp=elem;
                                temp.x+=x; temp.y+=y;
                                points.push(temp);
			});
			region.globalPoints.forEach(function(elem){
				var temp=elem;
				elem.x+=x*imwidth; elem.y+=y*imwidth;
				globalPoints.push(temp);
			});
		}else{
			region.points.forEach(function(elem){
				var temp=elem;
				elem.x+=x/imwidth; elem.y+=y/imwidth;
                                points.push(temp);
			});
			region.globalPoints.forEach(function(elem){
				var temp=elem;
				elem.x+=x; elem.y+=y;
				globalPoints.push(temp);
			});		
		}
		var xmax=points[0].x, xmin=points[0].x, ymin=points[0].y, ymax=points[0].y;

		points.forEach(function (point) {
			if(point.x >xmax) xmax=Number(point.x);
			if(point.x <xmin) xmin=Number(point.x);
			if(point.y >ymax) ymax=Number(point.y);
			if(point.y <ymin) ymin=Number(point.y);
		});
		regionUtils._regions[overlay][regionid]._gxmax=xmax*imwidth; 
		regionUtils._regions[overlay][regionid]._gxmin=xmin*imwidth; 
		regionUtils._regions[overlay][regionid]._gymax=ymax*imwidth; 
		regionUtils._regions[overlay][regionid]._gymin=ymin*imwidth;
		regionUtils._regions[overlay][regionid]._xmax=xmax; 
		regionUtils._regions[overlay][regionid]._xmin=xmin; 
		regionUtils._regions[overlay][regionid]._ymax=ymax; 
		regionUtils._regions[overlay][regionid]._ymin=ymin;

		regionUtils._regions[overlay][regionid].points=points;
		regionUtils._regions[overlay][regionid].globalPoints=globalPoints;
		regionUtils.redrawRegion(regionid,overlay);
	
	}



}
