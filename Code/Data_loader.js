var SIC_cl = ee.FeatureCollection("projects/ee-zahraghahremani/assets/GEE_P_A_10"),
    SIC_reg = ee.FeatureCollection("projects/ee-zahraghahremani/assets/reg_gee_data_above10");

    exports.init = function(Couns_boundary) {
        // Predictor data
        //__________________________________Lat and long
        var lati = ee.Image.pixelLonLat( ).select('latitude').clip(Couns_boundary);
        var long = ee.Image.pixelLonLat( ).select('longitude').clip(Couns_boundary);
        
        // ______________________DEM: Slope, aspect, elevation______________
        var elevation_ave = ee.Image("USGS/3DEP/10m").select('elevation').clip(Couns_boundary);
        
        var DEM_slope = ee.Terrain.slope(elevation_ave.select('elevation'));
        var DEM_aspect = ee.Terrain.aspect(elevation_ave.select('elevation'));
        // ______________Ppt
        var PRISM_precip = ee.ImageCollection('OREGONSTATE/PRISM/Norm91m');
        var monthlyMeanPrecip = PRISM_precip.mean().select('ppt').clip(Couns_boundary); 
        var monthlyMaxPrecip = PRISM_precip.max().select('ppt').clip(Couns_boundary);
        var monthlyMinPrecip = PRISM_precip.min().select('ppt').clip(Couns_boundary);
        var yearly = PRISM_precip.sum().select('ppt').clip(Couns_boundary); 
        // _______________NDVI_
        var dataset = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
            .filterDate('2013-03-18', '2016-12-01');
        
        // Applies scaling factors.
        function applyScaleFactors(image) {
          var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
          var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
          return image.addBands(opticalBands, null, true)
                      .addBands(thermalBands, null, true);
        }
        
        var sr14 = dataset.map(applyScaleFactors);
        
        //load images for composite
        
        var getQABits = function(image, start, end, newName) {
            // Compute the bits we need to extract.
            var pattern = 0;
            for (var i = start; i <= end; i++) {
              pattern += Math.pow(2, i);
            }
            // Return a single band image of the extracted QA bits, giving the band
            // a new name.
            return image.select([0], [newName])
                          .bitwiseAnd(pattern)
                          .rightShift(start);
        };
        
        // A function to mask out cloudy pixels.
        var cloud_shadows = function(image) {
          // Select the QA band.
          var QA = image.select(['QA_PIXEL']);
          // Get the internal_cloud_algorithm_flag bit.
          return getQABits(QA, 4,4, 'cloud_shadows').eq(0);
          // Return an image masking out cloudy areas.
        };
        
        // A function to mask out cloudy pixels.
        var clouds = function(image) {
          // Select the QA band.
          var QA = image.select(['QA_PIXEL']);
          // Get the internal_cloud_algorithm_flag bit.
          return getQABits(QA, 3,3, 'Cloud').eq(0);
          // Return an image masking out cloudy areas.
        };
        
        var maskClouds = function(image) {
          var cs = cloud_shadows(image);
          var c = clouds(image);
          image = image.updateMask(cs);
          return image.updateMask(c);
        };
        
        var composite_free = sr14.map(maskClouds);
        
        function makeNDVI(image){
          var red = image.select('SR_B4');
          var nired = image.select('SR_B5');
          var NdviBand = nired.subtract(red).divide(red.add(nired)).rename('NDVI');
          return NdviBand;
        }
        
        var NDVI = ee.ImageCollection(composite_free.map(makeNDVI)).mean();
        var NDVI_max = ee.ImageCollection(composite_free.map(makeNDVI)).max();
        var NDVI_min = ee.ImageCollection(composite_free.map(makeNDVI)).min();
        
        // ___________________LEAF AREA INDEX (LAI)
        var LAI = ee.ImageCollection('MODIS/061/MOD15A2H').filterDate('2000-02-18', '2016-12-01').mean().select('Lai_500m').clip(Couns_boundary);
        
        // ___________________Aridity Index
        var AI = ee.Image("projects/sat-io/open-datasets/global_ai/global_ai_yearly")
                                  .clip(Couns_boundary);
        print(AI, 'AI');
        // __________________ET
        var ET = ee.ImageCollection('MODIS/006/MOD16A2').filterDate('2001-01-01', '2016-12-01').mean().select('ET').clip(Couns_boundary);
        
        // ___________Soil Temperature
        var temp =ee.ImageCollection('NASA/FLDAS/NOAH01/C/GL/M/V001').filterDate('1982-01-01', '2016-12-01');
        var ST_ave = temp.mean().select('SoilTemp00_10cm_tavg').clip(Couns_boundary);
        var Wind_ave = temp.mean().select('Wind_f_tavg');
        
        //_______________________________Polaris
        var bd_mean = ee.ImageCollection('projects/sat-io/open-datasets/polaris/bd_mean')
        .filter(ee.Filter.lte('max_depth', 100)).mean().clip(Couns_boundary);
        
        var clay_mean = ee.ImageCollection('projects/sat-io/open-datasets/polaris/clay_mean')
        .filter(ee.Filter.lte('max_depth', 100)).mean().clip(Couns_boundary);
        var ksat_mean = ee.ImageCollection('projects/sat-io/open-datasets/polaris/ksat_mean')
        .filter(ee.Filter.lte('max_depth', 100)).mean().clip(Couns_boundary);
        
        var om_mean = ee.ImageCollection('projects/sat-io/open-datasets/polaris/om_mean')
        .filter(ee.Filter.lte('max_depth', 100)).mean().clip(Couns_boundary);
        
        var ph_mean = ee.ImageCollection('projects/sat-io/open-datasets/polaris/ph_mean')
        .filter(ee.Filter.lte('max_depth', 100)).mean().clip(Couns_boundary);
        
        var sand_mean = ee.ImageCollection('projects/sat-io/open-datasets/polaris/sand_mean')
        .filter(ee.Filter.lte('max_depth', 100)).mean().clip(Couns_boundary);
        
        var silt_mean = ee.ImageCollection('projects/sat-io/open-datasets/polaris/silt_mean')
        .filter(ee.Filter.lte('max_depth', 100)).mean().clip(Couns_boundary);
        
        //_______________________________ Land Cover
        var NLCD = ee.ImageCollection('USGS/NLCD_RELEASES/2019_REL/NLCD')
        // Filter the collection to the 2016 product.
        var nlcd2016 = NLCD.filter(ee.Filter.eq('system:index', '2016')).first();
        // Select the land cover band.
        var landcover = nlcd2016.select('landcover').clip(Couns_boundary);
        // ________________Soil Salinity
        var soil_salinity = ee.ImageCollection("projects/sat-io/open-datasets/global_soil_salinity").mean().clip(Couns_boundary);
        
        // ____________________Lithology
        var lithology = ee.Image('CSP/ERGo/1_0/US/lithology').select('b1');
        
        // Create a new image by combining the selected bands
        var predic_image = ee.Image([lati, long, monthlyMeanPrecip, monthlyMaxPrecip, monthlyMinPrecip, yearly, elevation_ave, DEM_slope,
        DEM_aspect, NDVI, NDVI_max, NDVI_min, LAI, AI, ET, ST_ave, Wind_ave, bd_mean, clay_mean, ksat_mean, om_mean, ph_mean,
        sand_mean, silt_mean, landcover, soil_salinity, lithology]).rename(['latitude', 'longitude', 'monthlyMeanPrecip', 'monthlyMaxPrecip', 'monthlyMinPrecip', 'yearly_ppt', 'elevation_ave', 'slope', 'aspect',
          'NDVI', 'NDVI_max', 'NDVI_min', 'LAI_ave', 'AI', 'ET_ave', 'ST_ave', 'Wind_ave', 'bd_mean', 'clay_mean', 'ksat_mean', 'om_mean', 'ph_mean',
          'sand_mean', 'silt_mean', 'landcover', 'soil_salinity', 'lithology']); // Rename bands if needed
          
        
        function normalizeData(feature) {
          var lat = ee.Number(feature.get('latitude1'));
          var lon = ee.Number(feature.get('longitude2'));
          var b = ee.Number(feature.get('aspect'));
          var g = ee.Number(feature.get('AI'));
          var r = ee.Number(feature.get('yearly_ppt'));
          var n = ee.Number(feature.get('ST_ave'));
          var s1 = ee.Number(feature.get('slope'));
          var s2 = ee.Number(feature.get('silt_mean'));
          var bg = ee.Number(feature.get('sand_mean'));
          var br = ee.Number(feature.get('NDVI'));
          var bn = ee.Number(feature.get('monthlyMeanPrecip'));
          var bs1 = ee.Number(feature.get('monthlyMaxPrecip'));
          var bs2 = ee.Number(feature.get('landcover'));
          var gr = ee.Number(feature.get('LAI_ave'));
          var gn = ee.Number(feature.get('ET_ave'));
          var gs1 = ee.Number(feature.get('elevation_ave'));
          var gs2 = ee.Number(feature.get('clay_mean'));
          var rn = ee.Number(feature.get('Wind_ave'));
          var rs1 = ee.Number(feature.get('soil_salinity'));
          var rs2 = ee.Number(feature.get('ph_mean'));
          var ns1 = ee.Number(feature.get('om_mean'));
          var ns2 = ee.Number(feature.get('NDVI_min'));
          var s1s2 = ee.Number(feature.get('NDVI_max'));
          var ANDWI = ee.Number(feature.get('monthlyMinPrecip'));
          var MNDWI = ee.Number(feature.get('lithology'));
          var NDSSI = ee.Number(feature.get('bd_mean'));
          var NDWI = ee.Number(feature.get('ksat_mean'));
          var SIC =  ee.Number(feature.get('SIC_g_kg'));
          var CL =  ee.Number(feature.get('binary'));
        
          return feature.set({'aspect': b,
                              'latitude': lat,
                              'longitude': lon,
                              'AI': g,
                              'yearly_ppt': r,
                              'ST_ave': n,
                              'slope': s1,
                              'silt_mean': s2,
                              'sand_mean': bg,
                              'NDVI': br,
                              'monthlyMeanPrecip': bn,
                              'monthlyMaxPrecip': bs1,
                              'landcover': bs2,
                              'LAI_ave': gr,
                              'ET_ave': gn,
                              'elevation_ave': gs1,
                              'clay_mean': gs2,
                              'Wind_ave': rn,
                              'soil_salinity': rs1,
                              'ph_mean': rs2,
                              'om_mean': ns1,
                              'NDVI_min': ns2,
                              'NDVI_max': s1s2,
                              'monthlyMinPrecip': ANDWI,
                              'lithology': MNDWI,
                              'bd_mean': NDSSI,
                              'ksat_mean': NDWI,
                              'binary': CL,
                              'SIC_g_kg': SIC.sqrt()
          });
        }
        
        
        // generate a new property for all features
        SIC_reg = SIC_reg.map(normalizeData);
        SIC_cl = SIC_cl.map(normalizeData);
        var bands = SIC_reg.first().toDictionary().keys();
        var extra = ee.List(['bottom','top', 'system:index', 'profile_id', 'SIC_g_kg', 'latitude1', 'longitude2', 'binary']);     
        bands = bands.removeAll(extra);
        var bands_cl = SIC_cl.first().toDictionary().keys();
        var extra_cl = ee.List(['bottom','top', 'system:index', 'profile_id', 'SIC_g_kg', 'latitude1', 'longitude2', 'binary']);     
        bands_cl = bands_cl.removeAll(extra_cl);
        return {
          bands_cl: bands_cl,
          bands: bands,
          predic_image: predic_image,
          SIC_cl: SIC_cl,
          SIC_reg: SIC_reg,
        };
      };
      