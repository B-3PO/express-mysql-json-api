var types = {};

module.exports = {
  define: define,
  get: get
};



function get(name) {
  var type = types[name];
  if (type === undefined) { throw Error('Cannot find type "' + name + '"'); }
  // deep copy with json
  return JSON.parse(JSON.stringify(type));
}



// --- Define -----------

function define(options) {
  validateOptions(options);

  var typeObj = {
    name : options.name,
    database: options.database || 'default',
    table: options.table,
    relationships: options.relationships,
    fields: [],
    attributes: [],
  };

  Object.keys(options.fields).forEach(function (key) {
    var field = options.fields[key];
    var attr = options.attributes[key];

    if (attr) {
      typeObj.attributes.push({
        field: key,
        name: attr,
        dataType: field.dataType
      });

      typeObj.fields.push({
        name: key,
        dataType: field.dataType
      });
    }

    if (field.dataType === 'uuid') {
      typeObj.uuidField = {
        field: key,
        name: 'id',
        dataType: field.dataType
      };
    }

    if (field.dataType === 'id') {
      typeObj.idField = key;
    }
  });

  types[options.name] = typeObj;
}


function validateOptions(options) {
  if (typeof options !== 'object' || options === null){
    throw Error('Requires an options object');
  }

  if (typeof options.name !== 'string' || options.name === '') {
    throw Error('Required property `name` of type `string`');
  }

  if (typeof options.fields !== 'object' || options.fields === null) {
    throw Error('Type Requires a object containing fields');
  }

  if (typeof options.attributes !== 'object' || options.attributes === null) {
    throw Error('Type Requires a object containing attributes');
  }

  if (types[options.name] !== undefined) {
    throw Error('Type of "' + options.name + '" has been added already');
  }
}
