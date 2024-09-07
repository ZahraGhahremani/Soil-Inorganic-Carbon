exports.init = function(predic_image, regression, Couns_boundary, final_map, Chosen_Geometry) {
    var crs = predic_image.projection();
    var palette = ['ff8d33', 'FCFF33', 'bcff46', '33fffc', '0646f0'];
    var vis_opt = 'custom';
    switch(vis_opt) {
        case 'Limited':
          var regressionMin = (regression.reduceRegion({
            reducer: ee.Reducer.min(),
            scale: 30, 
            crs: crs,
            bestEffort: true,
            geometry: Couns_boundary,
            maxPixels:1e13,
            tileScale: 16
          }));
          var regressionMax = (regression.reduceRegion({
            reducer: ee.Reducer.max(),
            scale: 30, 
            crs: crs,
            bestEffort: true,
            geometry: Couns_boundary,
            maxPixels:1e13,
            tileScale: 16
          }));
          var viz = {palette: palette, min: regressionMin.getNumber('predicted').getInfo(), max: regressionMax.getNumber('predicted').getInfo()};
          min_vis = regressionMin.getNumber('predicted').getInfo();
          max_vis = regressionMax.getNumber('predicted').getInfo();
        break;
        default:
          var min_vis = 0;
          var max_vis = 24; 
          var viz = {palette: palette, min: min_vis, max: max_vis};
        break;
    }
     
    Map.addLayer(ee.Image(1), {palette: ['FFFFFF']}, 'background');
    
    // Set the fill opacity for all features in the collection (e.g., 0.5 for 50% opacity)
    var transparentFeatures = Couns_boundary.map(function(feature) {
      return feature.set('fill-opacity', 0);
    });
    
    Map.addLayer(final_map, viz, 'SIC_regression', true);
    Chosen_Geometry = ee.FeatureCollection(Chosen_Geometry);
    print(Chosen_Geometry);
    if (Chosen_Geometry && Chosen_Geometry.size().getInfo() > 0) {
      var local_aoi_fc = ee.FeatureCollection(Chosen_Geometry);
      var empty = ee.Image().byte();
      var outline = empty.paint({
        featureCollection: local_aoi_fc,
        color: 1,
        width: 3
      });
      Map.addLayer(outline, { palette: 'red' }, 'AOI');
    }
  
    return{
      palette: palette
    };
  };