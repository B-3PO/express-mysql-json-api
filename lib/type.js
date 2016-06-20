
var sharedData = require('./sharedData.js');
var types = sharedData.types;

exports.create = function (options) {
  validateOptions(options);


  var typeObj = {
    name : options.name,
    database: options.database || 'default',
    table: options.table || options.name,
    constraint: options.constraint
  };

  setupAttributes(typeObj, options.attributes);
  types[options.name] = typeObj;
};




function validateOptions(options) {
  if (options.name === undefined) {
    throw Error('Type Requires a property of "name"');
    return;
  }

  if (options.attributes === undefined || options.attributes === null) {
    throw Error('Type Requires a object containing attributes');
    return;
  }

  if (types[options.name] !== undefined) {
    throw Error('Type of "' + options.name + '" has been added already');
    return;
  }
}




function setupAttributes(typeObj, attributes) {
  var keys = Object.keys(attributes);
  var key = keys.pop();

  typeObj.attributes = {};
  while (key !== undefined) {
    if (attributes[key].build === undefined) {
      typeObj.attributes[key] = createAttr(typeObj, key, attributes[key]);
    } else {
      typeObj.attributes[key] = createBuildAttr(typeObj, attributes[key]);
    }

    key = keys.pop();
  }

  typeObj.attributes.uuid = createAttr(typeObj, 'uuid', {field: 'uuid', dataType: 'string'});
  typeObj.attributes.id = createAttr(typeObj, 'id', {field: 'id', dataType: 'string', fetch: false});
}



function createAttr(typeObj, key, attr) {
  var isDatatype = attr.dataType !== undefined;
  return {
    name: key,
    field: attr.field || key,
    alias: getAlias(typeObj, attr, key),
    dataType: attr.dataType || 'string',
    parse: typeof attr.parse === 'function' ? attr.parse : undefined,
    format: typeof attr.format === 'function' ? attr.format : undefined,
    fetch: attr.fetch
  };
}


// TODO add error checking and auto correction for mailformed objects
function createBuildAttr(typeObj, attr) {
  return attr.build.map(function (buildField) {
    if (buildField.field !== undefined) {
      return {
        name: buildField.field,
        field: buildField.field,
        alias: getAlias(typeObj, buildField),
        dataType: attr.dataType || 'auto'
      };
    } else if (buildField.join !== undefined) {
      return {
        join: buildField.join,
        dataType: attr.dataType || 'auto'
      };
    }
  });
}




function getAlias(typeObj, attr, key) {
  return typeObj.name + (attr.field || key);
}
