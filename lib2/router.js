var express = require('express');
var data = require('./data.js');


module.exports = {
  Create: Create
};



function Create(resource) {
  var router = express.Router();


  // get data
  router.get('/:id?', function (req, res) {
    res.setHeader('Cache-Control', 'public, max-age=31557600');

    data.get(req, resource, function (data) {
      res.send(data);
    });
  });


  return router;
}
