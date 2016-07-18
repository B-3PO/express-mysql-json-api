var nextUniqueId = 0;
var types = {};

module.exports = {
  define: define,
  get: get
};



function get(name, parent) {
  var type = types[name];
  if (type === undefined) { throw Error('Cannot find type "' + name + '"'); }

  if (parent !== undefined) {
    if (type.parents === undefined) { type.parents = []; }
    if (type.parents.indexOf(parent) === -1) {
      type.parents.push(parent);
    }
  }

  if (type.built === true) { return type; }
  type.built = true;

  if (type.extends !== undefined) {
    type.extends = get(type.extends);
  }

  if (type.relationships !== undefined) {
    type.relationships.forEach(function (rel) {
      rel.type = get(rel.type, type);
    });
  }

  return type;
}





// --- Define -----------

function define(options) {
  validateOptions(options);

  var typeObj = {
    name : options.name,
    database: options.database || 'default',
    table: options.table,
    extends: options.extends,
    attributes: formatAttributes(options.attributes),
    relationships: options.relationships
  };

  types[options.name] = typeObj;
}

function formatAttributes(attrs) {
  return Object.keys(attrs).map(function (key) {
    var attr = attrs[key];
    var obj = {name: key};

    if (attr.extends !== undefined) {
      obj.extends = attr.extends;
    } else {
      obj.field = attr.field || key;
      obj.dataType = attr.dataType || 'string';
    }

    return obj;
  });
}


function validateOptions(options) {
  if (typeof options !== 'object' || options === null){
    throw Error('Requires an options object');
  }

  if (typeof options.name !== 'string' || options.name === '') {
    throw Error('Required property `name` of type `string`');
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
