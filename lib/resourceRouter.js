var express = require('express');
var handshake = require('./handshake.js');
var structureContstructor = require('./structure.js');
var dataManager = require('./dataManager.js');


exports.create = function (resource) {
  var interceptGetRequestFun;
  var interceptGetResponseFunc;
  var includeIds;

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
    } else if (typeof interceptGetRequestFun === 'function') {
      interceptGetRequestFun(req, res, function () {
        dataManager.get(req, res, resource, interceptGetResponseFunc, includeIds);
      });
    } else {
      dataManager.get(req, res, resource, interceptGetResponseFunc, includeIds);
    }
  });
  router.interceptGetRequest = function (func) {
    interceptGetRequestFun = func;
  };
  router.interceptGetResponse = function (func, _includeIds) {
    interceptGetResponseFunc = func;
    includeIds = _includeIds
  };

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
    if (typeof onRelationUpdateFunc === 'function') {
      onRelationUpdateFunc(req, res);
    } else {
      dataManager.addRelationship(req, res, resource);
    }
  });

  // add
  router.patch('/:id?', function(req, res) {
    if (typeof onCreateFun === 'function') {
      onCreateFun(req, res);
    } else {
      dataManager.addResource(req, res, resource);
    }
  });


  // edit
  router.post('/:id?', function(req, res) {
    if (typeof preUpdateFunc === 'function') {
      preUpdateFunc(req, res);
    } else {
      dataManager.addResource(req, res, resource);
    }
  });



  var onCreateFun;
  router.onCreate = function (func) {
    onCreateFun = func;
  };

  var onRelationUpdateFunc;
  router.onRelationUpdate = function (func) {
    onRelationUpdateFunc = func;
  };


  var preUpdateFunc;
  router.preUpdate = function (func) {
    preUpdateFunc = func;
  };


  return router;
}
