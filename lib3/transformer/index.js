var resourceManager = require('./resourceManager');
var structManager = require('./structManager');

module.exports = {
  defineResource: resourceManager.define,
  defineStruct: resourceManager.define

  // data types
  STRING: 'string',
  NUMBER: 'number',
  INT: 'int',
  ID: 'id',
  UUID: 'uuid',
  BOOLEAN: 'boolean'
};
