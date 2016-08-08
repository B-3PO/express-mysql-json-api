var express = require('express');
var structureManager = require('./structureManager');
var dataGetter = require('./dataGetter');


module.exports = {
  Create: Create
};



function Create(resource) {
  var router = express.Router();

  // get data
  router.get('/:id?', function (req, res) {
    // res.setHeader('Cache-Control', 'public, max-age=31557600');
    var stucture = structureManager.get(resource, req.query.include);
    dataGetter(stucture);
    // dataBuilder(stucture, req.params.id, req.query.include, function () {
    //
    // });
    res.end();
  });


  return router;
}
