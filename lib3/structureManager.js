var resourceManager = require('./resourceManager.js');
var typeManager = require('./typeManager.js');
var util = require('./util.js');
var idCounter = 0;
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
  var usedTypes = getTypes(built);
  var types = [];
  var picked = pickResource(built, include, usedTypes, 0, types);
  connectTypes(types, 0);

  return {
    resource: picked,
    parentType: getParentType(types)
  };
}


function getParentType(types) {
  if (types.length === 1) { return types[0]; }

  var type;
  var j;
  var rel;
  var relLength;
  var canBeParent;
  var i = 0;
  var length = types.length;
  var parent = types[0][0];
  while (i < length) {
    k = 0;
    layerLength = types[i].length;
    while (k < layerLength) {
      type = types[i][k];
      k += 1;
      if (type.relationshipsReference && type.relationships.length) {
        j = 0;
        relLength = type.relationships.length;
        canBeParent = true;
        while (j < relLength) {
          rel = type.relationships[j];
          j += 1;


          // is parent
          if (rel.single === true && parent.name === rel.name) {
            break;
          }
          // cant be parent
          if (rel.single !== true && parent.name === rel.name) {
            canBeParent = false;
            break;
          }
        }

        if (canBeParent === true) {
          parent = type;
        }
      }
      i += 1;
    }
  }

  return parent;
}




function connectTypes(types, layer) {
  if (types[layer] === undefined) { return; }

  var j;
  var k;
  var l;
  var t;
  var rel;
  var layerLength;
  var topType;
  var lowerType;
  var lowerLength;
  var relLength;
  var i = layer;
  var length = types.length;


  while (i < length) {
    j = 0;
    k = i + 1;
    layerLength = types[i].length;
    while (j < layerLength) {
      topType = types[i][j];
      while (k < length) {
        l = 0;
        lowerLength = types[k].length;
        while (l < lowerLength) {
          lowerType = types[k][l];
          l += 1;

          if (topType.relationshipsReference) {
            t = 0;
            relLength = topType.relationshipsReference.length;
            while (t < relLength) {
              rel = topType.relationshipsReference[t];
              if (lowerType.name === rel.type) {
                topType.relationships.push(lowerType);
                lowerType.relationships.push(topType);
                break;
              }
              t += 1;
            }
          }
        }
        k += 1;
      }

      j += 1;
    }

    i += 1;
  }

  connectTypes(types, layer+1);
}

function pickResource(built, include, usedTypes, layer, types) {
  var copy = copyResource(built, usedTypes, layer, types);

  if (include !== undefined && built.relationships !== undefined) {
    Object.keys(include).forEach(function (key) {
      if (built.relationships[key] !== undefined) {
        if (copy.relationships === undefined) { copy.relationships = {}; }
        copy.relationships[key] = pickResource(built.relationships[key], include[key], usedTypes, layer+1, types);
      }
    });
  }

  return copy;
}

function copyResource(resource, usedTypes, layer, types) {
  var type = getFilteredType(resource, usedTypes);
  type.id = nextId();
  type.prefix = 'id_'+type.id+'_';
  type.tableAlias = type.prefix + type.table;
  if (types[layer] === undefined) {
    types.push([]);
  }
  types[layer].push(type);

  var copy = {
    name: resource.name,
    type: type
  };
  // type.resource = copy;
  return copy;
}

function getFilteredType(resource, types) {
  var type = typeManager.get(resource.type);

  if (type.relationships && type.relationships.length) {
    type.relationshipsReference = type.relationships.filter(function (rel) {
      return types.indexOf(rel.type) > -1;
    });
    type.relationships = [];
  }

  return type;
}




function getTypes(built, arr) {
  arr = arr || [];
  if (arr.indexOf(built.type) === -1) {
    arr.push(built.type);
  }

  if (built.relationships) {
    Object.keys(built.relationships).forEach(function (key) {
      getTypes(built.relationships[key], arr);
    });
  }

  return arr;
}

function nextId() {
  return idCounter++;
}
