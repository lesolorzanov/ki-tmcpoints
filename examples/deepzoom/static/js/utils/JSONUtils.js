JSONUtils = {}
//This function calls all the points in the Fabric JS canvases and encodes them into JSON
//format in a way that is suitable for numpy.linalg.lstsq least squares to find the 
//affine transformation matrix.
//https://docs.scipy.org/doc/numpy/reference/generated/numpy.linalg.lstsq.html
/**
 * @function
 * Take the currently drawn SVG points, look at their transform attribute using 
 * {@link overlayUtils.transformToObject} and then 
 * find the coordinate in the image space in pixels by calling {@link overlayUtils.pointToImage}
 * @returns {Object} An object with two keys to the arrays of the points locations in the
 * two viewers
 */
JSONUtils.pointsToJSON = function () {
    var me = {};
    me.reference = Array();
    me.floating = Array();

    d3.selectAll(".TMCP-fixed").each(function () {
        var d3node = d3.select(this);
        var transformObj = overlayUtils.transformToObject(d3node.attr("transform"));
        var OSDPoint = new OpenSeadragon.Point(Number(transformObj.translate[0]), Number(transformObj.translate[1]));
        var imageCoord = overlayUtils.pointToImage(OSDPoint, "fixed");
        me.reference.push(Array(imageCoord.x, imageCoord.y, 1));
        //console.log(OSDPoint,imageCoord);
    });

    d3.selectAll(".TMCP-moving").each(function () {
        var d3node = d3.select(this);
        var transformObj = overlayUtils.transformToObject(d3node.attr("transform"));
        var OSDPoint = new OpenSeadragon.Point(Number(transformObj.translate[0]), Number(transformObj.translate[1]));
        var imageCoord = overlayUtils.pointToImage(OSDPoint, "moving");
        me.floating.push(Array(imageCoord.x, imageCoord.y, 1));
        // console.log(OSDPoint,imageCoord);
    });

    return me;
}
JSONUtils.dataToJSON = function () {
    var data = { "regions": { "fixed": {}, "moving": {} }, "points": { "fixed": {}, "moving": {} } };
    data.regions = regionUtils._regions;
    data.points = markerUtils._TMCPS;

    return data;
}
/**
 * @function
 * Save the data from a hiden <a> tag into a json file containing the locations of the points.
 */
JSONUtils.downloadJSON = function () {
    var a = document.getElementById("hiddena");
    var a = document.createElement("a");
    var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(JSONUtils.dataToJSON(), 0, 4));
    var namefile="";

    var name1=document.getElementById("thimg1") || "";
    var name2=document.getElementById("thimg2") || "";

    if(name1)
        namefile=namefile+document.getElementById("thimg1").innerText;
    if(name2)
        namefile=namefile+document.getElementById("thimg2").innerText;

    if(namefile.length==0)
        namefile="data.json"
    else
        namefile=namefile+".json"

    a.setAttribute("href", "data:" + data);
    a.setAttribute("download", namefile);
    a.setAttribute('visibility', 'hidden');
    a.setAttribute('display', 'none');
    a.click();
}
/**
 * @function
 * Fill the text area with the points JSON, be it current points in display or the imported points
 * @param {Object} jsonpoints - JSON obejct to stringify
 */
JSONUtils.setJSONString = function (jsonpoints) {
    var ta = document.getElementById('jsonpoints');
    ta.className = "form-control";

    if (jsonpoints) {
        ta.value = JSON.stringify(jsonpoints);
    } else {
        ta.value = JSON.stringify(JSONUtils.pointsToJSON(), 0, 4);
    }
}
/**
 * @function 
 * Read text area and create all the 
 * symbols dynamically. If the JSON is not well formatted or has different amount of points
 * in the images, the points will not be loaded.
 */
JSONUtils.importPointsFromJSON = function () {
    iconId = 1;
    d3.select(tmcpoints.fixed_svgov.node()).selectAll("*").remove();
    d3.select(tmcpoints.moving_svgov.node()).selectAll("*").remove();
    var tablebody = document.getElementById("tmcptablebody");
    //didnt want to but use jquery for simplicity
    $("#tmcptablebody").children().remove();

    var ta = document.getElementById('jsonpoints');
    ta.className = "form-control";
    try {
        var jsonobjects = JSON.parse(ta.value);
    } catch (e) {
        alert("The points syntax is wrong, verify your JSON notation. Points were not loaded.");
    }


    if (jsonobjects.reference.length == jsonobjects.floating.length && jsonobjects.floating.length > 0) {

        for (var i = 0; i < jsonobjects.reference.length; i++) {

            var ref = jsonobjects.reference[i];
            var flo = jsonobjects.floating[i];

            var normref = tmcpoints.fixed_viewer.viewport.imageToViewportCoordinates(ref[0], ref[1]);
            var normflo = tmcpoints.moving_viewer.viewport.imageToViewportCoordinates(flo[0], flo[1]);

            var options = overlayUtils.drawTMCP("fixed", { "x": normref.x, "y": normref.y });
            var internaloptions = overlayUtils.drawTMCP("moving", { "x": normflo.x, "y": normflo.y, "strokeColor": options.strokeColor });
            overlayUtils.addRowToTable("tmcptablebody", internaloptions.id, ref[0], ref[1], flo[0], flo[1]);


        }
    } else {
        alert("The amount of points on each image should be the same! Points were not loaded, verify your notation");
        ta.className += " alert-danger";
    }


}
JSONUtils.importRegionsAndPointsFromJSON = function () {
    iconId = 1;
    d3.select(tmcpoints.fixed_svgov.node()).selectAll("*").remove();
    d3.select(tmcpoints.moving_svgov.node()).selectAll("*").remove();
    var tablebody = document.getElementById("tmcptablebody");
    //didnt want to but use jquery for simplicity
    $("#tmcptablebody").children().remove();

    var ta = document.getElementById('jsonpoints');
    ta.className = "form-control";
    try {
        var jsonobjects = JSON.parse(ta.value);
    } catch (e) {
        alert("The points syntax is wrong, verify your JSON notation. Points were not loaded.");
    }

    //find that there is reference and floating and then check every region
    if (jsonobjects.hasOwnProperty("reference") && jsonobjects.hasOwnProperty("floating")) {
        for (var region in jsonobjects.reference) {
            if (jsonobjects.reference[region].points.length != jsonobjects.floating[region].points.length) {
                alert("The amount of points on each image should be the same! Points were not loaded, verify your notation");
                return null;
            }

        }
        for (var region in jsonobjects.reference) {
            for (var i = 0; i < jsonobjects.reference[region].points.length; i++) {
                var ref = jsonobjects.reference[region].points[i];
                var flo = jsonobjects.floating[region].points[i];

                var normref = tmcpoints.fixed_viewer.viewport.imageToViewportCoordinates(ref[0], ref[1]);
                var normflo = tmcpoints.moving_viewer.viewport.imageToViewportCoordinates(flo[0], flo[1]);

                var options = overlayUtils.drawTMCP("fixed", { "x": normref.x, "y": normref.y });
                var internaloptions = overlayUtils.drawTMCP("moving", { "x": normflo.x, "y": normflo.y, "strokeColor": options.strokeColor });
                overlayUtils.addRowToTable("tmcptablebody", internaloptions.id, ref[0], ref[1], flo[0], flo[1]);

            }

        }
    }
}
JSONUtils.readJSONToData = function () {
    overlayUtils.removeAllFromOverlay("fixed");
    overlayUtils.removeAllFromOverlay("moving");
    var tablebody = document.getElementById("tmcptablebody");
    tablebody.innerHTML = "";
    overlayUtils.TMCPCount["fixed"] = 0;
    overlayUtils.TMCPCount["moving"] = 0;
    regionUtils._currentRegionId = 0;
    if (window.File && window.FileReader && window.FileList && window.Blob) {

        var text = document.getElementById("data_files_import");
        var file = text.files[0];
        if (!file) { alert('No file selected'); return; }
        if (file.type.match('json')) {
            //console.log(file);
            var reader = new FileReader();
            reader.onload = function (event) {
                JSONUtils.importDataFromJSON(JSON.parse(event.target.result));
                //console.log(JSON.parse(event.target.result));
            };
            //var result=
            reader.readAsText(file);
        }
    } else {
        alert('The File APIs are not fully supported in this browser.');
    }

}
JSONUtils.importDataFromJSON = function (datainJSONFormat) {

    if ('regions' in datainJSONFormat) {
        if (Object.keys(datainJSONFormat.regions.fixed).len == Object.keys(datainJSONFormat.regions.moving).len) {
            for (r in datainJSONFormat.regions.fixed) {
                var region = datainJSONFormat.regions.fixed[r];
                regionUtils.importRegion(region, "fixed");
            }
            for (r in datainJSONFormat.regions.moving) {
                var region = datainJSONFormat.regions.moving[r];
                regionUtils.importRegion(region, "moving");
            }
        }
    }
    if (Object.keys(datainJSONFormat.points.fixed).len == Object.keys(datainJSONFormat.points.moving).len) {
        var combined = {}

        for (point in datainJSONFormat.points.fixed) {
            var rawname = point.replace("-fixed-", "");
            if (!combined[rawname]) combined[rawname] = {};
            //if(!combined[rawname]["fixed"])combined[rawname]["fixed"]={};
            combined[rawname]["fixed"] = datainJSONFormat.points.fixed[point];
            //overlayUtils.drawSingleTMCP("fixed",{"saveToTMCPS":true,"x":point.vx,"y":point.vy});
        }
        for (point in datainJSONFormat.points.moving) {
            var rawname = point.replace("-moving-", "");
            if (!combined[rawname]) combined[rawname] = {};
            //if(!combined[rawname]["moving"])combined[rawname]["moving"]={};
            combined[rawname]["moving"] = datainJSONFormat.points.moving[point];
        }

        for (pair in combined) {
            var pointf = combined[pair]["fixed"];
            var pointm = combined[pair]["moving"];
            var returnedmarker = overlayUtils.drawSingleTMCP("fixed", {
                "saveToTMCPS": true,
                "x": pointf.vx, "y": pointf.vy, "strokeColor": pointf.color
            });
            overlayUtils.drawSingleTMCP("moving", {
                "saveToTMCPS": true,
                "x": pointm.vx, "y": pointm.vy, "strokeColor": pointm.color
            });
            var thisid = returnedmarker.id;
            overlayUtils.addRowToTable("tmcptablebody", thisid, pointf.gx, pointf.gy, pointm.gx, pointm.gy);


        }
        //console.log(combined);           
    }

    
}
