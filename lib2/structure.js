var resourceManager = require('./resource.js');
var typeManager = require('./type.js')

module.exports = {
  get: get
};



function get(resource, include) {
  var includeObj;
  var built = buildResource(resource);
  return pickBuilt(built, buildIncludeObj(include));
}


function buildIncludeObj(include) {
  if (include === undefined) { return undefined; }
  var obj = {};
  include.split(',').forEach(function (path) {
    buildIncludePath(path, obj);
  });
  return obj;
}

function buildIncludePath(path, obj) {
  path.split('.').forEach(function (key) {
    if (obj[key] === undefined) { obj[key] = {}; }
    obj = obj[key];
  });
}




function pickBuilt(built, include) {
  var copy = copyResource(built);

  if (include !== undefined && built.relationships !== undefined) {
    Object.keys(include).forEach(function (key) {
      if (built.relationships[key] !== undefined) {
        if (copy.relationships === undefined) { copy.relationships = {}; }
        copy.relationships[key] = pickBuilt(built.relationships[key], include[key]);
      }
    });
  }

  return copy;
}

function copyResource(resource) {
  return {
    name: resource.name,
    type: resource.type
  };
}




// --- Build Resource ----
function buildResource(resource) {
  // TODO handle toMany and return empty arr
  if (resource === undefined) { return null; }
  if (resource.built) { return resource; }

  resource.type = typeManager.get(resource.type);

  if (resource.relationships) {
    Object.keys(resource.relationships).forEach(function (key) {
      resource.relationships[key] = buildResource(resourceManager.get(key));
    });
  }

  resource.built = true;

  return resource;
}
