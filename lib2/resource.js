var resources = {};


module.exports = {
  Create: Create,
  get: get
};



function get(name) {
  return resources[name];
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
