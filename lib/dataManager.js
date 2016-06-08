var structureGetter = require('./structure.js');
var query = require('./query.js');

exports.get = function (req, res, resource) {
  var structure = structureGetter.getStructure(resource, req.query.include);
  query.get(structure, req.params.id, function (status, data) {
    res.status(status).send(data);
  });
};


exports.addRelationship = function (req, res, resource) {
  // TODO handle no id
  // TODO handle no data

  var parentId = req.params.id;
  var property = req.params.property;
  var data = req.body.data;
  var structure = structureGetter.getStructure(resource, property);

  query.addRelationship(structure, data, parentId, property, function (status) {
    res.status(status).end();
  });
};


exports.updateResource = function (req, res, resource) {
  // TODO handle no id
  // TODO handle no data

  var id = req.params.id;
  var data = req.body.data;
  var meta = req.body.meta;
  var structure = structureGetter.getStructure(resource);

  query.updateResource(structure, data, meta, id, function (status) {
    res.status(status).end();
  });
};


exports.deleteRelationship = function(req, res, resource) {
  // TODO handle no id
  // TODO handle no data
  var parentId = req.params.id;
  var property = req.params.property;
  var data = req.body.data;

  query.deleteRelationship(structure, property, parentId, data, function (status) {
    res.status(status).end();
  });
};


exports.deleteResource = function(req, res, resource) {
  // TODO handle no id
  var id = req.params.id;

  query.deleteResource(structure, id, function (status) {
    res.status(status).end();
  });
};
