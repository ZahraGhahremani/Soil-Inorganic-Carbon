var Couns_boundary = ee.FeatureCollection("projects/ee-zahraghahremani/assets/CONUS_boundary");
//__________________________________________Initialize_____________________________________________//
Map.setCenter(-99.64, 40.68, 5);
var empty_image = ee.Image().byte();
var outline = empty_image.paint({
  featureCollection: Couns_boundary,
  color: 1,
  width: 5
});
var vis_opt = 'Full';//'Limited'//'Full';
Map.setOptions('satellite');
Map.style().set('cursor', 'crosshair');

// var Chosen_Geometry;
var Chosen_Geometry;

var Export_Method = 'Google Drive';
var ID = 0;

var data_loader_obj = require('users/zahraghahremani/SIC_app:data_loader')
                      .init(Couns_boundary);

var bands_cl = data_loader_obj.bands_cl;
var bands = data_loader_obj.bands;
var predic_image = data_loader_obj.predic_image;
var SIC_cl = data_loader_obj.SIC_cl;
var SIC_reg = data_loader_obj.SIC_reg;

// Create a panel with vertical flow layout.
var panel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {width: '400px'}
});

var vis_panel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {width: '500px'}
});

// Create a map panel.
var mapPanel = ui.Map();
// Take all tools off the map except the zoom and mapTypeControl tools.

// //__________________________________________Panel_____________________________________________//

var label_O = ui.Label('Soil Inorganic Carbon', {fontSize: '50px', fontWeight: 'bold', whiteSpace: 'pre'});
vis_panel.add(label_O);
var label_O = ui.Label('(SIC; g/kg)', {fontSize: '50px', fontWeight: 'bold', whiteSpace: 'pre'});
vis_panel.add(label_O);


var conus_panel = ui.Checkbox({label: 'Select to add conus boundary', style: {fontWeight: 'bold'}});
conus_panel.onChange(function(state){
  Map.addLayer(outline, {palette: 'FF0000'}, 'Boundary');
});
vis_panel.add(conus_panel);


var app = {};



var tilte_end = ui.Label('\n____________________________________________________\n', {fontWeight: 'bold', whiteSpace: 'pre'});
vis_panel.add(tilte_end);

var label2_O = ui.Label('\nDraw a ploygon:', {fontWeight: 'bold', whiteSpace: 'pre'});
vis_panel.add(label2_O);
var text = ui.Label(
    'Use the drawing tool (Select “AOI”) to define the region of interest for assessing SIC. Due to computational constraints, focus on a small area..',
    {fontSize: '15px'});
vis_panel.add(text);
var checkbox_GS = ui.Checkbox({label: 'Select "AOI" layer and draw (Step 1)', style: {fontWeight: 'bold'}});
// Define a global variable to store Chosen_Geometry
var globalChosenGeometry = null;

checkbox_GS.onChange(function(checked) {
  function removeAllLayers() {
    var layers = Map.layers();
    
    layers.forEach(function(layer) {
      Map.layers().remove(layer);
    });
  }
  
  // Call the function to remove all layers
  removeAllLayers();
  var drawing_tools = Map.drawingTools();
  var null_geometry = ui.Map.GeometryLayer({ geometries: null, name: 'geometry', color: 'red' });

  drawing_tools.layers().add(null_geometry);
  drawing_tools.setLinked(false);
  drawing_tools.setDrawModes(['polygon']);
  drawing_tools.addLayer([], 'AOI', 'red').setShown(false);
  drawing_tools.setShape('polygon');
  drawing_tools.draw();


  function calculateGeometryAndCallback() {
    // Safeguard: Check if the layer exists and has a geometry
    var layer = drawing_tools.layers().get(0);
    if (layer && layer.toGeometry()) {
        Chosen_Geometry = layer.toGeometry();
        var local_aoi = layer.getEeObject();
        var local_aoi_fc = ee.FeatureCollection(local_aoi);

        var empty = ee.Image().byte();
        var outline = empty.paint({
            featureCollection: local_aoi_fc,
            color: 1,
            width: 3
        });
    } else {
        console.error('No geometry found in the first layer.');
    }
  }
  var local_layers = drawing_tools.layers();
  local_layers.get(0).geometries().remove(local_layers.get(0).geometries().get(0));
  drawing_tools.onDraw(ui.util.debounce(calculateGeometryAndCallback, 100));

  var undraw = ui.util.debounce(function() {
    drawing_tools.setShape(null);
  }, 200);

  drawing_tools.onDraw(undraw);
  // Hide the drawn geometry from the map display
  
});

vis_panel.add(checkbox_GS);

var text3 = ui.Label(
    'Downloading the image will open a new tab and can take a while to complete.',
    {fontSize: '15px'});
vis_panel.add(text3);    


function updateSIC() {
  // Map.centerObject(Chosen_Geometry, 13);
  var ml_model_obj = require('users/zahraghahremani/SIC_app:ml_model')
    .init(bands_cl, bands, predic_image, SIC_cl, SIC_reg);
  var errorOccurred = false;
  var final_map = ee.Image(ml_model_obj.final_map);
  var regression = ml_model_obj.regression;
  return {errorOccurred: errorOccurred, final_map: final_map, regression: regression};                           
                          
}

var Button_GV_O = ui.Button({label: 'Visualize SIC', 
                              onClick: function() {
                              
                              var obj = updateSIC();
                              var errorOccurred = obj.errorOccurred;
                              var palette = obj.palette;
                              var final_map = obj.final_map;
                              var regression = obj.regression;
                              var visualization = require('users/zahraghahremani/SIC_app:visualization')
                                .init(predic_image, regression, Couns_boundary, final_map, Chosen_Geometry);
                              var palette = visualization.palette;
                              
                              // Try adding the layer, catch any potential errors
                              if (errorOccurred) {
                                var inspector_panel = ui.Panel([ui.Label('No images in selected period, restart the app')]);
                                inspector_panel.style().set({position: 'middle-right', fontSize: '200px', color: '#FF0000',
                                                              fontWeight: 'bold'});
                                Map.add(inspector_panel);
                              }
                              
                              var drawingTools = Map.drawingTools();
                                while (drawingTools.layers().length() > 0) {
                                  var layer = drawingTools.layers().get(0);
                                  drawingTools.layers().remove(layer);
                                }
                                
                                // Legend
                                // set position of panel
                                var legend = ui.Panel({
                                  style: {
                                    position: 'bottom-left',
                                    padding: '8px 15px'
                                  }
                                });
                                 
                                // Create legend title
                                var legendTitle = ui.Label({
                                  value: 'SIC (g/kg)',
                                  style: {
                                    fontWeight: 'bold',
                                    fontSize: '18px',
                                    margin: '0 0 4px 0',
                                    padding: '0'
                                    }
                                });
                                 
                                // Add the title to the panel
                                legend.add(legendTitle);
                                 
                                // Creates and styles 1 row of the legend.
                                var makeRow = function(color, name) {
                                 
                                      // Create the label that is actually the colored box.
                                      var colorBox = ui.Label({
                                        style: {
                                          backgroundColor: '#' + color,
                                          // Use padding to give the box height and width.
                                          padding: '8px',
                                          margin: '0 0 4px 0'
                                        }
                                      });
                                 
                                      // Create the label filled with the description text.
                                      var description = ui.Label({
                                        value: name,
                                        style: {margin: '0 0 4px 6px'}
                                      });
                                 
                                      // return the panel
                                      return ui.Panel({
                                        widgets: [colorBox, description],
                                        layout: ui.Panel.Layout.Flow('horizontal')
                                      });
                                };
                                
                                var steps = 4;
                                for (var i = 0; i < 4; i++) {   
                                  var val = i*steps;
                                
                                  legend.add(makeRow(palette[i], val));
                                  // count = count+2
                                }  
                                legend.add(makeRow(palette[4], '> 24'));
                                 
                                // add legend to map (alternatively you can also print the legend to the console)
                                Map.add(legend);
                                // extract point values
                                var inspector_panel = ui.Panel([ui.Label('Click to get SIC')]);
                                inspector_panel.style().set({position: 'bottom-center'});
                                Map.add(inspector_panel);
                                Map.onClick(function(coords) {
                                  // Show the loading label.
                                  inspector_panel.widgets().set(0, ui.Label({
                                    value: 'Processing...',
                                    style: {color: 'gray'}
                                  }));
                                  
                                  // add point to the map
                                  var point = ee.Geometry.Point(coords.lon, coords.lat);
                                  var dot = ui.Map.Layer(point, {color: 'FF0000'});
                                  Map.layers().set(5, dot);
                                        
                                  
                                  var click_point = ee.Geometry.Point(coords.lon, coords.lat);
                                  var sicValue = final_map.reduceRegion(ee.Reducer.first(), click_point, 30).evaluate(function(val){
                                    var demText = (val.predicted !== null) ? 'SIC at POI (g/kg): ' + ee.Number(val.predicted).int().getInfo() : null;
                                    inspector_panel.widgets().set(2, ui.Label({value: demText}));
                                    // Remove the 'Processing...' label after displaying demText
                                    inspector_panel.widgets().set(0, ui.Label({value: null}));
                                  });
                               
                                  inspector_panel.widgets().set(1, ui.Label({value: 'Long: ' 
                                       + coords.lon 
                                       + '  '
                                       + ' Lat: '+ coords.lat}));
                                });
                              
                                // Define a function to generate a download URL of the image for the
                                // viewport region. 
                                
                                function downloadImg() {
                                  var viewBounds = Chosen_Geometry;
                                  print(Chosen_Geometry)
                                  var downloadArgs = {
                                    name: 'ee_image',
                                    crs: final_map.projection().crs(),
                                    scale: 30,
                                    region: viewBounds.toGeoJSONString()
                                 };
                                 var url = final_map.getDownloadURL(downloadArgs);
                                 urlLabel.setUrl(url);
                                 urlLabel.style().set({shown: true});
                                }
                                
                                // Add UI elements to the Map.
                                var downloadButton = ui.Button('Download SIC Raster', downloadImg);
                                var urlLabel = ui.Label('Download', {shown: false});
                              
                                var panel = ui.Panel([downloadButton, urlLabel]);
                                Map.add(panel);
                              }
                                
});

var text2 = ui.Label(
    '\nStep 2:\n',
    {fontSize: '15px'});
vis_panel.add(text2);
vis_panel.add(Button_GV_O);

// vis_panel.add(text1);
var text2 = ui.Label(
    '\nPlease disregard the "Geometry Imports" panel as it is managed automatically by the application.\n',
    {fontSize: '15px'});
vis_panel.add(text2);

var Button_r = ui.Button({
  label: 'Reset APP',
  onClick: function() {
    // Clearing UI elements but not resetting globalChosenGeometry
    Map.clear();
    ui.root.clear();
    ui.root.add(oldMap);
    ui.root.add(oldApp);
    function removeAllLayers() {
      var layers = Map.layers();
      var count = layers.length();
      
      for (var i = 0; i < count; i++) {
        Map.layers().get(0).remove(); // Remove the first layer in each iteration
      }
    }
    
    // Call the function to remove all layers
    removeAllLayers();
    // Map.addLayer(outline, { palette: 'FF0000' }, 'Boundary');
    var storedCenter = Map.getCenter();
    var storedZoom = Map.getZoom();
    Map.setCenter(
      storedCenter.coordinates().get(0).getInfo(),
      storedCenter.coordinates().get(1).getInfo(),
      storedZoom
    );
  },
  style: {
    stretch: 'horizontal',
    color: '#FF0000',
    fontSize: '20px',
    fontWeight: 'bold'
  }
});

vis_panel.add(Button_r);

ui.root.add(vis_panel);
var oldMap = ui.root.widgets().get(0);
var oldApp = ui.root.widgets().get(1);
