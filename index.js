var express = require('express');
var database = require('./lib3/database.js');
var typeManager = require('./lib3/typeManager.js');
var resourceManager = require('./lib3/resourceManager.js');
var resourceRouter = require('./lib3/resourceRouter.js');


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

  // data types
  STRING: 'string',
  NUMBER: 'number',
  ID: 'id',
  UUID: 'uuid',
  BOOLEAN: 'boolean'
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
 typeManager.define(config);
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
