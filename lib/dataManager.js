var structureGetter = require('./structure.js');
var query = require('./query.js');
var util = require('util');


var json = { data:
   [ { id: '60320926-7ea6-4e10-8479-d66c43d3ff55',
       type: 'locations',
       attributes: { name: 'test add 2', city: 'tester', state: 'towm' } },
     { id: '4b60187a-b0a0-4686-8c5d-19c0c1d42f96',
       type: 'locations',
       attributes: { name: 'Pre Data', city: 'Austin', state: 'Tx' } },
     { id: 'd4a22709-a19b-4261-9acf-589ad9456766',
       type: 'locations',
       attributes: { name: 'Coltons House2', city: 'ben', state: 'Some' },
       relationships: { categories: { data: [ { id: 'f713fa07-bfca-4847-9a50-aced6afe0ef9', type: 'categories' } ] } } },
     { id: '9d16411c-fe77-11e5-86aa-5e5517507c66',
       type: 'locations',
       attributes: { name: 'Bypass2', city: 'Austin', state: 'TX' },
       relationships: { menus: { data: [ { id: 'e444c4d0-c169-4647-ba4b-58219057d175', type: 'menus' } ] } } } ],
  included:
   [ { id: 'e444c4d0-c169-4647-ba4b-58219057d175',
       type: 'menus',
       attributes: { name: 'main', type: 'food' },
       relationships:
        { categories:
           { data:
              [ { id: '9ed74263-417d-430c-8cc0-e31b7abed409',
                  type: 'categories' },
                { id: '2784472d-7b4d-47c2-be52-5b605f2dd401',
                  type: 'categories' },
                { id: 'f713fa07-bfca-4847-9a50-aced6afe0ef9',
                  type: 'categories' } ] } } },
     { id: '9ed74263-417d-430c-8cc0-e31b7abed409',
       type: 'categories',
       attributes: { name: 'Drinks', type: 'beverages' } },
     { id: '2784472d-7b4d-47c2-be52-5b605f2dd401',
       type: 'categories',
       attributes: { name: 'Entrees', type: 'food' } },
     { id: 'f713fa07-bfca-4847-9a50-aced6afe0ef9',
       type: 'categories',
       attributes: { name: 'Apps', type: 'food' } } ] };

exports.get = function (req, res, resource, interceptGetResponseFunc, includeIds) {

  // res.send(json);
  // return;
  var structure = structureGetter.getStructure(resource, req.query.include);

  query.get(structure, req.params.id, function (status, data) {
    if (typeof interceptGetResponseFunc === 'function') {
      interceptGetResponseFunc(req, res, data, function () {
        res.status(status).send(data);
      });
    } else {
      res.status(status).send(data);
    }
  }, includeIds);
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


exports.addResource = function (req, res, resource) {
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
