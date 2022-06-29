overlayUtils={
    TMCPCount: {"fixed":1,"moving":1},
    _drawRegions: false,
    _singleTMCPD3Groups:  {"fixed":null,"moving":null}
}

overlayUtils.drawSingleTMCP =  function(overlay,options){    
    options.imageWidth=overlayUtils.OSDimageWidth(overlay);
    options.overlay=overlay;
    
    var elem=d3.select( tmcpoints[overlay+"_singleTMCPS"].node());
    return markerUtils.TMCP(elem,options); 
};

overlayUtils.OSDimageWidth= function(overlay,options){
    if(overlay=="fixed")
        return tmcpoints.fixed_viewer.world.getItemAt(0).getContentSize().x
    else if(overlay=="moving")
        return tmcpoints.moving_viewer.world.getItemAt(0).getContentSize().x
    else
        console.log("no width image");
};

overlayUtils.randomColor=function(){
    //I need random colors that are far away from the palette in the image
    //in this case Hematoxilyn and DAB so far away from brown and light blue
    //and avoid light colors because of the white  background 
    //in HSL color space this means L from 0.2 to 0.75
    //H [60,190],[220,360], S[0.3, 1.0]
    var rh1=Math.floor(Math.random() * (190 - 60 + 1)) +60;
    var rh2=Math.floor(Math.random() * (360 - 220 + 1)) +220;
    var H=0.0;
    
    if(Math.random() > 0.5){ H=rh1; }else{ H=rh2; }
    
    var L=Math.floor(Math.random() * (75-20+1)) + 20 + '%';
    var S=Math.floor(Math.random() * (100-30+1)) + 30 + '%';
    
    return 'hsl('+H.toString()+','+S.toString()+','+L.toString()+')';
};

//https://stackoverflow.com/questions/17824145/parse-svg-transform-attribute-with-javascript
overlayUtils.transformToObject= function(transform){
    var b={};
    for (var i in a = transform.match(/(\w+\((\-?\d+\.?\d*e?\-?\d*,?)+\))+/g))
    {
        var c = a[i].match(/[\w\.\-]+/g);
        b[c.shift()] = c;
    }
    return b;
    
};

overlayUtils.objectToTransform= function(tobj){
    var jsonstr=JSON.stringify(tobj);
    //console.log("jsonstr",jsonstr);
    jsonstr=jsonstr.replace("{","");
    jsonstr=jsonstr.replace("}","");
    jsonstr=jsonstr.replace(/("|:)/g, "");
    jsonstr=jsonstr.replace("[","(");
    jsonstr=jsonstr.replace("]",")");
    //console.log("after jsonstr",jsonstr);
    return jsonstr;
};

overlayUtils.addTrackingToDOMElement= function(node,overlay) {
    new OpenSeadragon.MouseTracker({
        element:node,
        dragHandler:function(event) {
            var viewportDelta=overlayUtils.viewportDelta(event.delta,overlay); 
            var d3node=d3.select(node);
            console.log(nodetable)
            var transformobj=overlayUtils.transformToObject(d3node.attr("transform"));

            transformobj.translate[0]=Number(transformobj.translate[0])+Number(viewportDelta.x);
            transformobj.translate[1]=Number(transformobj.translate[1])+Number(viewportDelta.y);
            //console.log(transformobj);
            d3node.attr("transform",overlayUtils.objectToTransform(transformobj));
            
        },
        dragEndHandler: function(event){
            var d3node=d3.select(node);
            //redraw regions to accomodate the change
            //perhaps do it only for region elements if possible
            //although this will imply differentiatin elemtns from regions ot nonreginos
            if(d3node.classed("regionp")){
              
            } else if(!d3node.classed("regionp")){
                //if it is not region it's point
                var htmlid=d3node.attr("id");
                //console.log(htmlid);
                var transformobj=overlayUtils.transformToObject(d3node.attr("transform"));
                //that weird bug was here:
                //markerUtils._TMCPS[overlay][htmlid]={"x":Number(transformobj.translate[0]),"y":Number(transformobj.translate[1])};
                markerUtils.modifyPoint({"overlay":overlay,"htmlid":htmlid,
                    "x":Number(transformobj.translate[0]),"y":Number(transformobj.translate[1])});
            }
        },
        clickHandler: function(event){
            var d3node=d3.select(node);
            if(d3node.classed("first")){
                regionUtils.closePolygon();
                d3node.classed("first",false);//so that we dont call close anymore
            }
        }
    }).setTracking(true);
};

overlayUtils.addRowToTable= function(tableid,id,x1,y1,x2,y2){
    
    var tablebody=document.getElementById(tableid);
    var row=tablebody.insertRow(0);
    
    var cell1=row.insertCell(0);
    var cell2=row.insertCell(1);
    var cell3=row.insertCell(2);
    var cell4=row.insertCell(3);
    var cell5=row.insertCell(4);
    var cell6=row.insertCell(5);
    
    cell1.textContent= id;
    cell2.id="cell-fixed-"+id; cell2.textContent= "("+Math.floor(x1)+", "+ Math.floor(y1)+")";
    cell3.id="cell-moving-"+id; cell3.textContent= "("+Math.floor(x2)+", "+ Math.floor(y2)+")";
    cell4.id="cell-gobutton"+id; 
    cell6.id="cell-visibility"+id; 

    gobutton=document.createElement("button");    
    gobutton.id="go-button-"+id;
    gobutton.classList.add("btn","btn-primary");
    gobutton.setAttribute("type","button");
    gobutton.innerText="Go"
    gobutton.addEventListener("click", function(event){
        //get viewer coords of desired point to pan to it. Don't complicat with zoom, just pan to it
        console.log(event);
        //moving
        TMCPmid=event.target.id.replace("go-button-","TMCP-moving-");
        apointm=markerUtils._TMCPS.moving[TMCPmid];
        pantom={x:apointm.vx, y:apointm.vy};
        tmcpoints.moving_viewer.viewport.panTo(pantom);

        //fixed I guess has to be done too haha
        TMCPfid=event.target.id.replace("go-button-","TMCP-fixed-");
        apointf=markerUtils._TMCPS.fixed[TMCPfid];
        pantof={x:apointf.vx, y:apointf.vy};
        tmcpoints.fixed_viewer.viewport.panTo(pantof);
    });

    checkme=document.createElement("input"); 
    //checkme.id="go-button-"+id;
    checkme.classList.add("form-check-input");
    checkme.setAttribute("type","checkbox");

    cell4.appendChild(gobutton);
    cell6.appendChild(checkme);


    visibilitybutton=document.createElement("button");    
    visibilitybutton.id="visibility-button-"+id;
    visibilitybutton.classList.add("btn","btn-primary");
    visibilitybutton.setAttribute("type","button");
    visibilitybutton.innerHTML="&#128065;"
    visibilitybutton.addEventListener("click", function(event){
        //get viewer coords of desired point to pan to it. Don't complicat with zoom, just pan to it
        //console.log(event);
        //moving
        TMCPmid=event.target.id.replace("visibility-button-","TMCP-moving-");
        domTMCPmid=interfaceUtils.getElementById(TMCPmid);
        if(domTMCPmid.style.visibility.length==0){
            domTMCPmid.style.visibility="hidden";
        }else{
            domTMCPmid.style.visibility="";
        }
        //fixed I guess has to be done too haha
        TMCPfid=event.target.id.replace("visibility-button-","TMCP-fixed-");
        domTMCPfid=interfaceUtils.getElementById(TMCPfid);
        if(domTMCPfid.style.visibility.length==0){
            domTMCPfid.style.visibility="hidden";
        }else{
            domTMCPfid.style.visibility="";
        }
    });

    cell5.appendChild(visibilitybutton);



    
};

overlayUtils.pointToImage= function(point,overlay){
    if (overlay+"_viewer" in tmcpoints){
        return tmcpoints[overlay+"_viewer"].viewport.viewportToImageCoordinates( point );
    }
};

overlayUtils.pointFromOSDPixel=function(position,overlay){
    if (overlay+"_viewer" in tmcpoints){
        return tmcpoints[overlay+"_viewer"].viewport.pointFromPixel( position );
    }
};

overlayUtils.imageToViewport=function(imcoords,overlay){
    if (overlay+"_viewer" in tmcpoints){
        return tmcpoints[overlay+"_viewer"].viewport.imageToViewportCoordinates( imcoords );
    }
};

overlayUtils.viewportDelta= function(eventdelta,overlay){
    if (overlay+"_viewer" in tmcpoints){
        return tmcpoints[overlay+"_viewer"].viewport.deltaPointsFromPixels(eventdelta);  
    }      
};


overlayUtils.imagePointFToImagePointM= function(imagePointF){
    // approximates a sensible location for the matching point in moving image
    // If there are no points, uses the same distance ratios from images edges for the moving point as for the fixed point
    // If there are already at least one point, use the offset between previous fixed point and new fixed point to guess location for the new moving point

    var points = markerUtils.getPoints()
    var numPoints = Object.keys(points.fixed).length

    // get moving and fixed image sizes
    const fixedSize = {"x":tmcpoints.fixed_viewer.world.getItemAt(0).getContentSize().x, "y":tmcpoints.fixed_viewer.world.getItemAt(0).getContentSize().y}
    const movingSize = {"x":tmcpoints.moving_viewer.world.getItemAt(0).getContentSize().x, "y":tmcpoints.moving_viewer.world.getItemAt(0).getContentSize().y}

    var imagePointM = new OpenSeadragon.Point(0, 0)

    // if no points are set yet, use the logic below. Otherwise use offset of the last fixed and moving points to approximate location for the new point
    if (numPoints > 1) {
        //sometimes the prevPointM does not yet exist,
        //this might be also due to a problem with 0 and 1 indexing.
        //Long ago I had to draw points from 1 for no good reason (user request)
        //so it affected the rest. I think it works now but this part had to be removed

        prevPointF = points.fixed["TMCP-fixed-"+(numPoints-1).toString()]
        prevPointM = points.moving["TMCP-moving-"+(numPoints-1).toString()]

        // const offset = {"x": imagePointF["x"] - prevPointF["gx"], "y": imagePointF["y"] - prevPointF["gy"]}
        // // relative offset
        const offset = {"x": (imagePointF["x"] - prevPointF["gx"]) / fixedSize.x, "y": (imagePointF["y"] - prevPointF["gy"]) / fixedSize.y}

        // insert point into the same relative location in moving image
        rot = tmcpoints.moving_viewer.viewport.getRotation()
        if (rot == 90) {
            imagePointM.x = prevPointM.gx + (movingSize.x * offset.y)
            imagePointM.y = prevPointM.gy - (movingSize.y * offset.x)
        } else if (rot == 180) {
            // make offset relative
            imagePointM.x = prevPointM.gx - (movingSize.x * offset.x)
            imagePointM.y = prevPointM.gy - (movingSize.y * offset.x)
        } else if (rot == 270) {
            imagePointM.x = prevPointM.gx - (movingSize.x * offset.y)
            imagePointM.y = prevPointM.gy + (movingSize.y * offset.x)
        } else {
            imagePointM.x = prevPointM.gx + (movingSize.x * offset.x)
            imagePointM.y = prevPointM.gy + (movingSize.y * offset.y)
        }


    } else {

        // find relative location of imagePointF
        const relativeF = {"x":imagePointF.x / fixedSize.x, "y":imagePointF.y / fixedSize.y}

        // insert point into the same relative location in moving image
        rot = tmcpoints.moving_viewer.viewport.getRotation()
        if (rot == 90) {
            imagePointM.x = movingSize.x * relativeF.y
            imagePointM.y = movingSize.y * (1.0 - relativeF.x)
        } else if (rot == 180) {
            imagePointM.x = movingSize.x * (1.0 - relativeF.x)
            imagePointM.y = movingSize.y * (1.0 - relativeF.y)
        } else if (rot == 270) {
            imagePointM.x = movingSize.x * (1.0 - relativeF.y)
            imagePointM.y = movingSize.y * relativeF.x
        } else {
            imagePointM.x = movingSize.x * relativeF.x
            imagePointM.y = movingSize.y * relativeF.y
        }

    }

    // make sure imagePointM is within the image (and add a margin)
    const margin = 1000
    if (imagePointM.x > movingSize.x - margin) {
        imagePointM.x = movingSize.x - margin
    }
    else if (imagePointM.x < margin) {
        imagePointM.x = margin
    }

    if (imagePointM.y > movingSize.y - margin) {
        imagePointM.y = movingSize.y - margin
    }
    else if (imagePointM.y < margin) {
        imagePointM.y = margin
    }

    return imagePointM
}

//overlayUtils.addTMCPtoViewers= function(event){
//    // The canvas-click event gives us a position in web coordinates.
//    //The event position is relative to OSD viewer 
//    // Convert that to viewport coordinates, the lingua franca of OpenSeadragon coordinates.
//    var normalizedPointF=overlayUtils.pointFromOSDPixel( event.position, "fixed" );
//    //draw in the fixed viewer, now we need to convert it to pixels and then to the moving space viewport to put there 
//    var optionsF=overlayUtils.drawSingleTMCP("fixed",{"saveToTMCPS":true,"x":normalizedPointF.x,"y":normalizedPointF.y});
//    //get the pixel coordinates in fixed image 
//    var imagePointF = overlayUtils.pointToImage(normalizedPointF,"fixed");
//    //get this pixel in moving normal space
//    var normalizedPointM=overlayUtils.imageToViewport( imagePointF, "moving" );
//    //draw in the correct position in moving space
//    var optionsM=overlayUtils.drawSingleTMCP("moving",{"saveToTMCPS":true,"x":normalizedPointM.x,"y":normalizedPointM.y,"strokeColor":optionsF.strokeColor}); 
//    overlayUtils.addRowToTable("tmcptablebody",optionsF.id,imagePointF.x,imagePointF.y,imagePointF.x,imagePointF.y);
//};

//// VERSION 2 - Approximate new point locations from previous points. This causes unpleasant bugs.
//overlayUtils.addTMCPtoViewers= function(event){
//    // The canvas-click event gives us a position in web coordinates.
//    //The event position is relative to OSD viewer 
//    // Convert that to viewport coordinates, the lingua franca of OpenSeadragon coordinates.
//    var normalizedPointF=overlayUtils.pointFromOSDPixel( event.position, "fixed" );
//    //draw in the fixed viewer, now we need to convert it to pixels and then to the moving space viewport to put there 
//    var optionsF=overlayUtils.drawSingleTMCP("fixed",{"saveToTMCPS":true,"x":normalizedPointF.x,"y":normalizedPointF.y});
//    //get the pixel coordinates in fixed image 
//    var imagePointF = overlayUtils.pointToImage(normalizedPointF,"fixed");
//    // approximate a sensible location for the corresponding point in moving image given point in fixed image
//    var imagePointM = overlayUtils.imagePointFToImagePointM(imagePointF)
//    // convert that to viewport coordinates
//    var normalizedPointM=overlayUtils.imageToViewport( imagePointM, "moving" );
//    //draw in the correct position in moving space
//    var optionsM=overlayUtils.drawSingleTMCP("moving",{"saveToTMCPS":true,"x":normalizedPointM.x,"y":normalizedPointM.y,"strokeColor":optionsF.strokeColor}); 
//    overlayUtils.addRowToTable("tmcptablebody",optionsF.id,imagePointF.x,imagePointF.y,imagePointM.x,imagePointM.y);
//};

// VESRION 3 - Set moving point to the middle of the view
overlayUtils.addTMCPtoViewers= function(event){
    // The canvas-click event gives us a position in web coordinates.
    //The event position is relative to OSD viewer 
    // Convert that to viewport coordinates, the lingua franca of OpenSeadragon coordinates.
    var normalizedPointF=overlayUtils.pointFromOSDPixel( event.position, "fixed" );
    //draw in the fixed viewer, now we need to convert it to pixels and then to the moving space viewport to put there 
    var optionsF=overlayUtils.drawSingleTMCP("fixed",{"saveToTMCPS":true,"x":normalizedPointF.x,"y":normalizedPointF.y});
    //get the pixel coordinates in fixed image 
    var imagePointF = overlayUtils.pointToImage(normalizedPointF,"fixed");

    // console.log(tmcpoints["fixed_viewer"].viewport.getBounds())
    boundsF = tmcpoints["fixed_viewer"].viewport.getBounds()
    boundsM = tmcpoints["moving_viewer"].viewport.getBounds()

    var normalizedPointM={"x": boundsM.x + boundsM.width / 2, "y": boundsM.y + boundsM.height / 2}

    var imagePointM = overlayUtils.pointToImage(normalizedPointM,"moving");

    //draw in the correct position in moving space
    var optionsM=overlayUtils.drawSingleTMCP("moving",{"saveToTMCPS":true,"x":normalizedPointM.x,"y":normalizedPointM.y,"strokeColor":optionsF.strokeColor}); 
    overlayUtils.addRowToTable("tmcptablebody",optionsF.id,imagePointF.x,imagePointF.y,imagePointM.x,imagePointM.y);
};

/** @function getMatchingPointsFromClickFixed takes an evnet happening in the fixed viewer
 * and returns the normalized coordinates in both viewers
 *  @param event comming from the fixed viewer   */
    overlayUtils.getMatchingPointsFromClickFixed= function(event){
    var normalizedPointF=overlayUtils.pointFromOSDPixel( event.position, "fixed" );
    var imagePointF = overlayUtils.pointToImage(normalizedPointF,"fixed");
    var normalizedPointM=overlayUtils.imageToViewport( imagePointF, "moving" );
    return {"fixed":normalizedPointF,"moving":normalizedPointM};
};

overlayUtils.removeAllFromOverlay= function(overlay){
    d3.select(tmcpoints[overlay+"_svgov"].node()).selectAll("*").remove();
    tmcpoints[overlay+"_singleTMCPS"] = d3.select(tmcpoints[overlay+"_svgov"].node()).append('g').attr('class', overlay+" singleTMCPS");
    
}
    
    
