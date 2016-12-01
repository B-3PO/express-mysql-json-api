var types = require('./type.js')
var resources = {};


module.exports = {
  Create: Create,
  get: get
};



function get(name) {
  var resource = resources[name];
  if (resource === undefined) { throw Error('Cannot find resource "' + resource + '"'); }
  if (resource.built === true) { return resource; }
  resource.built = true;

  resource.type = types.get(resource.type);

  if (resource.relationships) {
    Object.keys(resource.relationships).forEach(function (key) {
      resource.relationships[key] = get(resource.relationships[key]);
    });
  }

  return resource;
}

function Create(options) {
  validateOptions(options);
  resources[options.name] = options;
  return resources[options.name];
}


function validateOptions(options) {
  if (typeof options !== 'object' || options === null){
    throw Error('Requires an options object');
  }

  if (typeof options.name !== 'string' || options.name === 'undefined') {
    throw Error('Requires a property `name` of type `string`');
  }

  if (resources[options.name] !== undefined) {
    throw Error('Resource with name of "' + options.name + '" already exists');
  }
}
