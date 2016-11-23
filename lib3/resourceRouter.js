var express = require('express');
var structureManager = require('./structureManager');
var dataGetter = require('./dataGetter');
var format = require('./formatter');


module.exports = {
  Create: Create
};



function Create(resource) {
  var router = express.Router();

  // get data
  router.get('/:id?', function (req, res) {
    // res.setHeader('Cache-Control', 'public, max-age=31557600');
    var stucture = structureManager.get(resource, req.query.include);
    var nestedData = dataGetter(stucture, function (error, nestedData) {
      if (error) {
        res.status(409).send(error);
        return;
      }

      var formatted = format(nestedData, stucture);
      res.send(formatted);
    });
  });


  return router;
}
