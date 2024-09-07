exports.init = function(bands_cl, bands, predic_image, SIC_cl, SIC_reg) {
    var classifier = ee.Classifier.smileRandomForest({numberOfTrees: 100,
                                                      variablesPerSplit: 2,
                                                      minLeafPopulation: 1,
                                                      bagFraction: 1,
                                                      seed: 0})
      .setOutputMode('CLASSIFICATION')
      .train({
              features: SIC_cl,
              classProperty: 'binary',
              inputProperties: bands_cl
      });
    
    var regressor = ee.Classifier.smileRandomForest({numberOfTrees: 2000,
                                                      variablesPerSplit: 5,
                                              
                                                      bagFraction: 1,
                                                      maxNodes: 20,
                                                      seed: 0})
      .setOutputMode('REGRESSION')
      .train({
              features: SIC_reg,
              classProperty: 'SIC_g_kg',
              inputProperties: bands
      });
  
    
    // _______________________________
    var classification = predic_image.select(bands_cl).classify(classifier, 'predicted_cl');
    var regression = predic_image.select(bands).classify(regressor, 'predicted');
    regression = regression.pow(2);
    var final_map = regression.multiply(classification);
    final_map = final_map.multiply(0.12);
    return {
      final_map: final_map,
      regression: regression
    };
  };
    
  