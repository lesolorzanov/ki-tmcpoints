var osdcontext={osdimgurl:""};

var tmcpoints= {
    url_prefix: "",
    fixed_viewer: null,
    moving_viewer: null,
	fixed:null,
	moving:null,
    fixed_image_width:0,
    moving_image_width:0,
    //This function is called when the document is loaded. the tmcpoints object is built as an "app" and init is its main function 
    emptyViewers: function(options){
	    var containers= options.containers || ["fixed","moving"];
		containers.forEach(function (c){
            var container=document.getElementById(c+"_viewer");
            while (container.lastChild) {
                container.removeChild(container.lastChild);
            }
        });
    },
    init: function(options){ 
		tmcpoints.emptyViewers({});
	    //tmcpoints.fixed=options.fixed;
		//tmcpoints.moving=options.moving;
	    var fixed_container=document.getElementById("fixed_viewer");
        //OSD viewer for the fixed image
        var fixed_viewer;
        //OSD viewer for the moving image
        var moving_viewer;
        //default icon stroke color
        var strokeColor="#234";
        if(tmcpoints.fixed_file==null || tmcpoints.moving_file==null){
            alert("No images chosen.");
            return;
        }  
        //Initialize OSD with options (Options are written at the end of this file)
        fixed_viewer = OpenSeadragon(tmcpoints.options_fixed);
        //open the DZI xml file pointing to the tiles
        fixed_viewer.open(tmcpoints.url_prefix+tmcpoints.fixed_file);
        tmcpoints.fixed_viewer=fixed_viewer;

        //Do the same for moving images
        moving_viewer = OpenSeadragon( tmcpoints.options_moving);
        moving_viewer.open(tmcpoints.url_prefix+tmcpoints.moving_file);
        tmcpoints.moving_viewer=moving_viewer;
        
        tmcpoints.fixed_svgov=tmcpoints.fixed_viewer.svgOverlay();
        tmcpoints.moving_svgov=tmcpoints.moving_viewer.svgOverlay();

        tmcpoints.fixed_singleTMCPS=d3.select(tmcpoints.fixed_svgov.node()).append('g').attr('class', "fixed singleTMCPS");
        tmcpoints.moving_singleTMCPS=d3.select(tmcpoints.moving_svgov.node()).append('g').attr('class', "moving singleTMCPS");
        
        //This is the OSD click handler, when the event is quick it triggers the creation of an icon
        var click_handler= function(event) {          
            if(event.quick){
                if(!overlayUtils._drawRegions){ 
                    overlayUtils.addTMCPtoViewers(event);
                    //console.log("another thing");
                }else{
                   //call region creator and drawer
                   //the viewer is that to whićh the click hanlder is added
                   //so every veiwer will have a regionutils manager...
                   //This is bound to this.fixed_viewer.canvas
                   regionUtils.manager(event);
                   //console.log("draw regions");
               }
            }else{
                //if it is not quick then it is dragged
                if(document.getElementById("syncpan").checked){
                    var f_center = fixed_viewer.viewport.getCenter();
                    moving_viewer.viewport.panTo(f_center, true);
                }
            }
        };

        var scaleZoom_handler = function(event){
            if(document.getElementById("synczoom").checked){
                var fixed_zoom=fixed_viewer.viewport.getZoom();
                moving_viewer.viewport.zoomTo(fixed_zoom, null, true);
                click_handler(event);
            }
        };

        //OSD handlers are not registered manually they have to be registered
        //using MouseTracker OSD objects 
        var fixed_mouse_tracker = new OpenSeadragon.MouseTracker({
            //element: this.fixed_svgov.node().parentNode, 
            element: this.fixed_viewer.canvas,
            clickHandler: click_handler,
            scrollHandler: scaleZoom_handler
        }).setTracking(true);
        
        //Assign the function to the button in the document (this will be done dynamically)
        document.getElementById('pointstojson').addEventListener('click', JSONUtils.downloadJSON);
        //Function to button
        //document.getElementById('jsontopoints').addEventListener('click', JSONUtils.importPointsFromJSON);
        document.getElementById('jsontodata').addEventListener('click', JSONUtils.readJSONToData);
        document.getElementById("drawregions_btn").addEventListener('click', function(){ regionUtils.regionsOnOff()}); 

    }, //finish init
    //options for the fixed and moving OSD 
    //https://openseadragon.github.io/docs/OpenSeadragon.html#.Options
    options_fixed: {
        id: "fixed_viewer",
        prefixUrl: osdcontext.osdimgurl,
        navigatorSizeRatio: 1,
        wrapHorizontal: false,
        showNavigator: false,
        showNavigationControl: false,
        navigatorPosition: "BOTTOM_LEFT",
        navigatorSizeRatio: 0.25,
        animationTime: 0.0,
        blendTime: 0,
        minZoomImageRatio: 1,
        maxZoomPixelRatio: 1,
        zoomPerClick: 1.0,
        constrainDuringPan: true,
        visibilityRatio: 1
    },
    options_moving: { 
        id: "moving_viewer",
        prefixUrl:  osdcontext.osdimgurl,
        navigatorSizeRatio: 1,
        wrapHorizontal: false,
        showNavigator: false,
        navigatorPosition: "BOTTOM_LEFT",
        navigatorSizeRatio: 0.25,
        animationTime: 0.0,
        blendTime: 0,
        minZoomImageRatio: 1,
        maxZoomPixelRatio: 1,
        zoomPerClick: 1.0,
        constrainDuringPan: true,
        visibilityRatio: 1,
        showNavigationControl: false
    }
}
