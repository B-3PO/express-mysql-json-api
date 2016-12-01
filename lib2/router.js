var express = require('express');
var data = require('./data.js');
var structureManager = require('./structure');
var dataBuilder = require('./dataBuilder');


module.exports = {
  Create: Create
};



function Create(resource) {
  var router = express.Router();

  // get data
  router.get('/:id?', function (req, res) {
    // res.setHeader('Cache-Control', 'public, max-age=31557600');
    var stucture = structureManager.get(resource, req.query.include);
    dataBuilder(stucture, req.params.id, req.query.include, function () {

    });
    res.end();
  });


  return router;
}
