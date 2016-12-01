var nextUniqueId = 0;
var types = {};

module.exports = {
  define: define,
  get: get
};



function get(name) {
  var type = types[name];
  if (type === undefined) { throw Error('Cannot find type "' + name + '"'); }
  if (type.built === true) { return type; }
  type.built = true;
  type.parents = [];

  if (type.relationships !== undefined) {
    type.relationships.forEach(function (rel) {
      var relType = get(rel.type);
      relType.parents.push(type);
      rel.type = relType;
    });
  }

  // TODO may need to sweep all types for relationships incase a manyToManu is not specified. currently both types need to have the relationship

  return type;
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

  // var attrKeys = Object.keys(options.attributes);
  // Object.keys(options.fields).map(function (key) {
  //   var field = options.fields[key];
  //   if (field.dataType === 'id') {
  //     typeObj.idField = key;
  //   }
  //   if (field.dataType === 'uuid') {
  //     typeObj.uuidField = {
  //       field: key,
  //       name: 'id',
  //       dataType: field.dataType
  //     };
  //   }
  //   if (options.attributes[key] !== undefined) {
  //     typeObj.attributes.push({
  //       field: key,
  //       name: options.attributes[key],
  //       dataType: field.dataType
  //     });
  //   }
  //
  //   typeObj.fields.push({
  //     name: key,
  //     dataType: field.dataType
  //   });
  //
  // });

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
      typeObj.idField = {
        field: key,
        name: 'data_id',
        dataType: field.dataType
      };
    }
  });
  console.log(typeObj.uuidField)
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

  if (options.extends !== undefined && (typeof options.extends !== 'string' || options.extends === '')) {
    throw Error('Property `extends` must be type `string`');
  }

  if (types[options.name] !== undefined) {
    throw Error('Type of "' + options.name + '" has been added already');
  }
}
