var express = require('express');
var mysql = require('mysql');
var handshake = require('./lib/handshake.js');
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
