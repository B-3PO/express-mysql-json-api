var express = require('express');

var database = require('./lib2/database.js');
var type = require('./lib2/type.js');
var resourceManager = require('./lib2/resource.js');
var dataTypes = require('./lib2/dataTypes.js');
var resourceRouter = require('./lib2/router.js');

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
  defineType: defineType,
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
  database.add(config);
}



/**
 * @name defineType
 * @function
 *
 * @description
 * adds type to list
 *
 * @param {object} config - type config
 *
 */
function defineType(config) {
 type.define(config);
}



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
  var resource = resourceManager.Create(config);
  return resourceRouter.Create(resource);
}
