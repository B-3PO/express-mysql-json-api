var express = require('express');
var handshake = require('./handshake.js');
var structureContstructor = require('./structure.js');
var dataManager = require('./dataManager.js');


exports.create = function (resource) {
  var router = express.Router();

  // version
  router.head('/:id?', function (req, res) {
    res.setHeader('Access-Control-Expose-Headers', 'jam-versioning, jam-handshake, jam-no-updates');
    handshake.do(req, res, resource);
  });

  // get data
  router.get('/:id?', function (req, res) {
    res.setHeader('Cache-Control', 'public, max-age=31557600');

    if (req.get('jam-get-structure') !== undefined) {
      structureContstructor.sendFootprint(req, res, resource);
    } else {
      dataManager.get(req, res, resource);
    }
  });

  // delete resource
  router.delete('/:id?', function(req, res) {
    dataManager.deleteRelationship(req, res, resource);
  });

  // delete relation
  router.delete('/:id/relationships/:property/:relationId?', function(req, res) {
    dataManager.deleteResource(req, res, resource);
  });

  // relationships
  router.post('/:id/relationships/:property/:relationId?', function(req, res) {
    dataManager.addRelationship(req, res, resource);
  });

  // add
  router.put('/:id?', function(req, res) {
    dataManager.updateResource(req, res, resource);
  });


  // edit
  router.post('/:id?', function(req, res) {
    dataManager.updateResource(req, res, resource);
  });


  return router;
}
