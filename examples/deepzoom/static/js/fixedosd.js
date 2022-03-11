var tmcpoints= {
    //This function is called when the document is loaded. the tmcpoints object is built as an "app" and init is its main function 
    init: function(){ 
   
    // Reference to tmcpoints object 
    var that=this;
    //OSD viewer for the fixed image
    var fixed_viewer;
    //Fabric JS canvas overlay for OSD fixed
    var fixed_overlay;
    //OSD viewer for the moving image
    var moving_viewer;
    //Fabric JS canvas overlay for OSD moving
    var moving_overlay;
    //Global radius of the icon in image size coordinates
    var pointRadius=500;
    //Global  stroke width of the icon in image size coordinates
    var pointStrokeWidth=70;
    //Counter of icons to display on top of each icon
    var iconId=1;
    //Variables for resizing icons (currently disabled by "scaleIconWithZoom"
    var f_lastZoom=0.8;
    var m_lastZoom=0.8;
    //Boolean to color each icon randomly
    var randomIconStroke=true; 
    //default icon stroke color
    var strokeColor="#234";
    //boolean to scale icons acoording to zoom (It works but is jittery)
    var scaleIconWithZoom=false;

    var drawmode=false;

    //Initialize OSD with options (Options are written at the end of this file)
    fixed_viewer = OpenSeadragon(this.options_fixed);
    //open the DZI xml file pointing to the tiles
    fixed_viewer.open("http://www.cb.uu.se/~tissuemaps/images/portugal/C-2551/vips.dzi");
    //initialize the fabric js canvas overlay with the options at the end of the file, 
    //so far in this version it is needed to use scale, using the width of the displayed image
    //Has to be manually written altough there are ways in which OSD can tell you the image size
    fixed_overlay = fixed_viewer.fabricjsOverlay(this.options_fixed_fabric);
    //expose pointer to fixed fabric
    this.fixed_fabric_canvas=fixed_overlay;
    //Do the same for moving image
    moving_viewer = OpenSeadragon( this.options_moving);
    moving_viewer.open("http://www.cb.uu.se/~tissuemaps/images/portugal/A-2554/vips.dzi");
 
    moving_overlay = moving_viewer.fabricjsOverlay(this.options_moving_fabric);
 
    //This function calls all the points in the Fabric JS canvases and encodes them into JSON
    //format in a way that is suitable for numpy.linalg.lstsq least squares to find the 
    //affine transformation matrix.
    //https://docs.scipy.org/doc/numpy/reference/generated/numpy.linalg.lstsq.html
    var pointsToJSON = function(){
      var me={ };
      me.reference=Array();
      me.floating=Array(); 

      fixed_overlay.fabricCanvas().forEachObject(function(group){
         var point=group.getCenterPoint();
         me.reference.push(Array(point.x, point.y,1));
      });

      moving_overlay.fabricCanvas().forEachObject(function(group){
         var point=group.getCenterPoint();       
         me.floating.push(Array(point.x, point.y,1));
      });
      return me;
    };

    //this line makes this function available to call from the JS console within the app scope
    this.pointsToJSON=pointsToJSON;

    //Function to download points as a JSON file
    var downloadJSON= function(){
      var a=document.getElementById("hiddena");
      var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(pointsToJSON(),0,4));
      a.setAttribute("href", "data:"+data);
      a.setAttribute("download", "data.json");
      a.setAttribute('visibility', 'hidden');
      a.setAttribute('display', 'none');
      a.click();
    };

    //Fill the text area with the points JSON, be it current points in display or the imported points
    var setJSONString= function(jsonpoints){
      var ta=document.getElementById('jsonpoints');
      ta.className="form-control";

      if(jsonpoints){ 
        ta.value=JSON.stringify(jsonpoints);
      }else{
        ta.value=JSON.stringify(pointsToJSON(),0,4);
      }
    }

    //Assign the function to the button in the document (this will be done dynamically)
    document.getElementById('pointstojson').addEventListener('click', downloadJSON);

    //fixed_overlay.fabricCanvas().setBackgroundColor('rgba(255, 73, 64, 0.6)');
 
    //Fucntion in charged with the reading of the text area and creating all the 
    //symbols dynamically. If the JSON is not well formatted or has different amount of points
    //in the images, the points will not be loaded.
    var importpoints = function(){
      iconId=1;

      fixed_overlay.fabricCanvas().clear();
      moving_overlay.fabricCanvas().clear();
      var tablebody=document.getElementById("tmcptablebody");
      //didnt want to but use jquery for simplicity
      $("#tmcptablebody").children().remove();       

      var ta=document.getElementById('jsonpoints');
      ta.className="form-control";
      try{
        var jsonobjects=JSON.parse(ta.value);
      }catch(e){

         alert("The points syntax is wrong, verify your JSON notation. Points were not loaded.");
      }
    
 
      if(jsonobjects.reference.length==jsonobjects.floating.length && jsonobjects.floating.length>0){

        for(var i=0; i <jsonobjects.reference.length; i++){

          if(randomIconStroke){
            //strokeColor='#'+Math.floor(Math.random()*16777215).toString(16);
            strokeColor=TMCPIconUtils.randomColor();
          }

          var ref=jsonobjects.reference[i];
          var flo=jsonobjects.floating[i];

          var f_icon=TMCPIconUtils.createIconGroup({stroke:strokeColor,left: ref[0], top: ref[1], number:String(iconId)});
          fixed_overlay.fabricCanvas().add(f_icon);
          var m_icon=TMCPIconUtils.createIconGroup({stroke:strokeColor,left: flo[0], top: flo[1], number:String(iconId)});
          moving_overlay.fabricCanvas().add(m_icon);

          addRowToTable(ref[0],ref[1],flo[0],flo[1]);

          iconId+=1;

        } 
      }else {
          alert("The amount of points on each image should be the same! Points were not loaded, verify your notation");
          ta.className+=" alert-danger"; 
        }


    }

    //Function to button
    document.getElementById('jsontopoints').addEventListener('click', importpoints);

    //This is the OSD click handler, when the event is quick it triggers the creation of an icon
    var click_handler= function(event) {
      
      if(event.quick){
        // The canvas-click event gives us a position in web coordinates.
        // Convert that to viewport coordinates, the lingua franca of OpenSeadragon coordinates.
        // Convert from viewport coordinates to image coordinates.
        var imagePoint = fixed_viewer.viewport.viewportToImageCoordinates( fixed_viewer.viewport.pointFromPixel( event.position ));

        if(randomIconStroke){
          //strokeColor='#'+Math.floor(Math.random()*16777215).toString(16);
          strokeColor=TMCPIconUtils.randomColor();
        }

        //TMCPIconUtils is an external JS Object that handles the icon creation consisting of a 
        //rotated square, a circle and a number check the js/tmcpFabricIcon.js file for details
        //returns a fabric js obejct to add to the canvas
        var f_icon=TMCPIconUtils.createIconGroup({stroke:strokeColor,left: imagePoint.x, top: imagePoint.y, number:String(iconId)});
        var m_icon=TMCPIconUtils.createIconGroup({stroke:strokeColor,left: imagePoint.x, top: imagePoint.y, number:String(iconId)});
 
        if(scaleIconWithZoom){
          f_icon.scaleX=f_icon.scaleY=1/fixed_viewer.viewport.getZoom(true);
          m_icon.scaleX=m_icon.scaleY=1/moving_viewer.viewport.getZoom(true);
        }

        //Adds a row to the HTML table
        addRowToTable(imagePoint.x,imagePoint.y,imagePoint.x,imagePoint.y);
  
        //Add icons to fabric js canvas
        fixed_overlay.fabricCanvas().add(f_icon);
        moving_overlay.fabricCanvas().add(m_icon);

        //fill the text area with the new points
        setJSONString();

        //prepare for next icon
        iconId+=1;
      }else{
        //if it is not quick then maybe it was pan (zoom is handled y other function)
        //if syncpan is checked in the UI then when the event is not quick and is drag
        //then zoom the moving image along with it
        if(document.getElementById("syncpan").checked){
          var f_center = fixed_viewer.viewport.getCenter();
          moving_viewer.viewport.panTo(f_center, true);          
          //console.log(f_center);
        }

      }
    };

    //function to add rows to the HTML table 
    var addRowToTable = function(x1,y1,x2,y2){

      var tablebody=document.getElementById("tmcptablebody");
      var row=tablebody.insertRow(0);

      var cell1=row.insertCell(0);
      var cell2=row.insertCell(1);
      var cell3=row.insertCell(2);

      cell1.textContent= iconId;
      cell2.id="f_icon"+iconId; cell2.textContent= "("+Math.floor(x1)+", "+ Math.floor(y1)+")";
      cell3.id="m_icon"+iconId; cell3.textContent= "("+Math.floor(x2)+", "+ Math.floor(y2)+")";

    };

    //When an icon is moved, it's coordinates must change in the UI as well
    //this is the Fabric JS handler for it
    var f_move_handler =function(event){
      setJSONString();
      var group = event.target;
      var point=group.getCenterPoint();
      document.getElementById("f_icon"+group.item(2).text).textContent="("+Math.floor(point.x)+", "+ Math.floor(point.y)+")";
    };

    var m_move_handler =function(event){
      setJSONString();
      var group = event.target;
      var point=group.getCenterPoint();
      document.getElementById("m_icon"+group.item(2).text).textContent="("+Math.floor(point.x)+", "+ Math.floor(point.y)+")";
    };
 
    //Assign handlers
    fixed_overlay.fabricCanvas().on('object:moving', f_move_handler);
    moving_overlay.fabricCanvas().on('object:moving', m_move_handler);

    //OSD wheel button (or wheel emulation) handler
    var scaleZoom_handler = function(event){
      if(scaleIconWithZoom){
        scaleObjects(fixed_viewer,fixed_overlay);
        scaleObjects(moving_viewer,moving_overlay);
      }

      if(document.getElementById("synczoom").checked){
        moving_viewer.viewport.zoomTo(fixed_viewer.viewport.getZoom(true), null, true);
      } 
    };

    

    
    //Function to calculate icon size if sclaing is enabled with zoom
    var scaleObjects = function(viewer,overlay){
      var zoom =  viewer.viewport.getZoom(true);
      var maxZoom=viewer.viewport.getMaxZoom();
      var minZoom=viewer.viewport.getMinZoom();

      var scaleTo=1/zoom;   
  
      if(zoom != minZoom && zoom!=maxZoom){
        overlay.fabricCanvas().forEachObject(function(obj){
          obj.scaleX=obj.scaleY=scaleTo;
        });
      }
      lastZoomVar=zoom;
    };


    //OSD handlers are not registered manually they have to be registered
    //using MouseTracker OSD objects 
    var fixed_mouse_tracker = new OpenSeadragon.MouseTracker({
      element: fixed_viewer.canvas,
      clickHandler: click_handler,
      scrollHandler: scaleZoom_handler
    }).setTracking(true);

    var moving_mouse_tracker = new OpenSeadragon.MouseTracker({
      element: moving_viewer.canvas,
      scrollHandler: scaleObjects(moving_viewer,moving_overlay)
    }).setTracking(true);
 
   
  var drawmodebutton=document.getElementById('drawmode');
    drawmodebutton.onclick=function(){
      //that.options_fixed_fabric.isDrawingMode=!that.options_fixed_fabric.isDrawingMode;
      that.fixed_fabric_canvas.isDrawingMode=!that.fixed_fabric_canvas.isDrawingMode;
      if(that.fixed_fabric_canvas.isDrawingMode){
        drawmodebutton.className="btn btn-success";
        drawmodebutton.innerHTML="Draw mode ON";
        fixed_mouse_tracker.setTracking(false);
        fixed_overlay.fabricCanvas().freeDrawingBrush.color='red';
        fixed_overlay.fabricCanvas().freeDrawingBrush.width=100; 
        fixed_overlay.fabricCanvas().isDrawingMode=true;
      }else{
        drawmodebutton.className="btn btn-primary";
        drawmodebutton.innerHTML="Draw mode OFF";
        fixed_mouse_tracker.setTracking(true);
        fixed_overlay.fabricCanvas().isDrawingMode=false;
      }
    }
  
  }, //finish init
  //options for the fixed and moving OSD 
  //https://openseadragon.github.io/docs/OpenSeadragon.html#.Options
  options_fixed: {
    id: "fixed_viewer",
    prefixUrl: "js/openseadragon/images/",
    navigatorSizeRatio: 1,
    wrapHorizontal: false,
    showNavigator: true,
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
    prefixUrl: "js/openseadragon/images/",
    navigatorSizeRatio: 1,
    wrapHorizontal: false,
    showNavigator: true,
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
  //scale to the width of the image to get global point coordinates
  options_fixed_fabric: { scale: 80656, isDrawingMode: false },
  options_moving_fabric: { scale: 80000 },
  fixed_fabric_canvas: undefined,
  //tmcp app function to call the JSON from outside app context.
  pointsToJSON: function(){}
}
