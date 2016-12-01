var resourceManager = require('./resource.js');
var util = require('./util.js');
var cache = {};

module.exports = {
  get: get
};


// caches results based on resource and includes
function get(resource, include) {
  include = include || '';
  var hash = util.hashString(resource.name+include);
  if (cache[hash] === undefined) {
    var built = resourceManager.get(resource.name);
    if (include !== '') {
      built = pickBuilt(built, buildIncludeObj(include));
    }
    cache[hash] = built;
  }

  return cache[hash];
}


function buildIncludeObj(include) {
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
