const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

var express = require('express');
var mysql = require('mysql');
var handshake = require('./lib/handshake.js');
var dataHandler = require('./lib/dataHandler.js');
var sharedData = require('./lib/sharedData.js');
var dataTypes = require('./lib/dataTypes.js');
var resources = sharedData.resources;
var types = sharedData.types;
var pools = sharedData.pools;


var typeContstructor = require('./lib/type.js');
var resourceContstructor = require('./lib/resource.js');



/**
  * @name nodeJSONapi
  * @module nodeJSONapi
  *
  *
  * @description
  * interface to json api
  *
  */
module.exports = {
  addDatabase: addDatabase,
  addType: addType,
  CreateResource: CreateResource,
  dataType: dataTypes.types
};



/**
 * @name addDatabase
 * @function
 *
 * @description
 * add database to manager
 *
 * @param {object} config - database config
 *
 */
function addDatabase(config) {
  // TODO validate config

  pools[config.database] = mysql.createPool({
    connectionLimit: config.connectionlimit || 100,
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database
  });

  if (config.default === true || pools.default === undefined) {
    pools.default = pools[config.database];
  }
}



/**
 * @name addType
 * @function
 *
 * @description
 * adds type to list
 *
 * @param {object} config - type config
 *
 */
function addType(config) {
 typeContstructor.create(config);
}
function addType_old(config) {
  if (config.name === undefined) {
    console.error('Type Requires a property of "name"');
    return;
  }

  if (types[config.name] !== undefined) {
    console.error('Type "' + config.name + '" has been added already');
    return;
  }

  types[config.name] = processType(config);
}

// function processType(config) {
//   var keys;
//   var key;
//
//   config.database = config.database || 'default';
//   config.table = config.table || config.name;
//
//   if (typeof config.attributes === 'object' && config.attributes !== null) {
//     keys = Object.keys(config.attributes);
//     key = keys.pop();
//
//     while (key !== undefined) {
//       if (config.attributes[key].build === undefined) {
//         config.attributes[key].field = config.attributes[key].field || key;
//         config.attributes[key].alias = config.name + config.attributes[key].field;
//         config.attributes[key].type = config.name;
//         config.attributes[key].name = key;
//       } else {
//         config.attributes[key].build.forEach(function (buildField) {
//           if (buildField.field !== undefined) {
//             buildField.alias = config.name + buildField.field;
//             buildField.type = config.name;
//             buildField.name = buildField.field;
//           }
//         });
//       }
//
//       key = keys.pop();
//     }
//   }
//
//   if (typeof config.relationships === 'object' && config.relationships !== null) {
//     config.relationships.forEach(function (item) {
//       item.field = item.field || item.type;
//       item.alias = item.type + item.field;
//       item.parentTable = config.table;
//       if (item.manyToMany === true) {
//         item.parentField = item.parentField || config.table;
//         // TODO find out current conventions
//         item.table = item.table || [item.parentField, item.field].sort(function (a, b) {
//           if (a < b) { return -1; }
//           if (a > b) { return 1; }
//           return 0;
//         }).join('_');
//       } else if (item.oneToMany === true) {
//         item.parentField = item.parentField || (config.table + '_id');
//       } else {
//         item.table = item.table || config.table;
//       }
//     });
//   }
//
//   return config;
// }



/**
 * @name CreateResource
 * @function
 *
 * @description
 * add resource
 *
 * @param {object} config - resource config
 * @return {object} Express Router
 */
function CreateResource(config) {
  return resourceContstructor.create(config);
}
function CreateResource_old(config) {
  var router;

  if (resources[config.name] !== undefined) {
    throw Error('Resource with name "' + config.name + '" already exists');
  }

  resources[config.name] = config;
  router = express.Router();


  // version
  router.head('/:id?', function (req, res) {
    res.setHeader('Access-Control-Expose-Headers', 'jam-versioning, jam-handshake, jam-no-updates');
    handshake.do(req, res, config);
  });

  // get data
  router.get('/:id?', function (req, res) {
    res.setHeader('Cache-Control', 'public, max-age=31557600');

    if (req.get('jam-get-structure') !== undefined) {
      dataHandler.getStructure(req, res, config);
    } else {
      dataHandler.get(req, res, config);
    }
  });

  // delete resource
  router.delete('/:id?', function(req, res) {
    dataHandler.deleteResource(req, res, config);
  });

  // delete relation
  router.delete('/:id/relationships/:property/:relationId?', function(req, res) {
    dataHandler.deleteRelations(req, res, config);
  });

  // relationships
  router.post('/:id/relationships/:property/:relationId?', function(req, res) {
    dataHandler.relationship(req, res, config);
  });

  // add
  router.put('/:id?', function(req, res) {
    dataHandler.addEdit(req, res, config);
  });


  // edit
  router.post('/:id?', function(req, res) {
    dataHandler.addEdit(req, res, config);
  });



  return router;
}
