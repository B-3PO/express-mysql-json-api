const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

var sharedData = require('./sharedData.js');
var mysql = require('mysql');
var dataTypes = require('./dataTypes.js');
var resources = sharedData.resources;
var types = sharedData.types;
var pools = sharedData.pools;




exports.getStructure = function (req, res, config) {
  var include = req.query.include !== undefined ? req.query.include.split(',') : undefined;
  var structure = getStructure(config, include);
  res.send(getClientStructure(structure));
};


exports.get = function (req, res, config) {
  var include = req.query.include !== undefined ? req.query.include.split(',') : undefined;
  var structure = getStructure(config, include);

  runQuery(buildQuery(structure, req.params.id), function (status, data) {
    // TODO handle no data
    res.status(status).send(formatData(structure, data));
  });
};



exports.addEdit = function (req, res) {
  var id = req.params.id;
  var data = req.body.data;
  // TODO handle no id
  // TODO handle no data

  runQuery(buildUpdateQuery(data, id), function (status) {
    res.status(status).end();
  });
};


exports.relationship = function (req, res, config) {
  var parentId = req.params.id;
  var property = req.params.property;
  var data = req.body.data;
  // TODO handle no id
  // TODO handle no data

  runQuery(buildRelationshipQuery(data, parentId, property, config), function (status) {
    res.status(status).end();
  });
};


exports.deleteResource = function (req, res, config) {
  var id = req.params.id;
  // TODO handle no id

  var query = 'delete from ' + config.type.table + ' where ' + getIdField(id) + '=\'' + id + '\'';
  runQuery(query, function (status) {
    res.status(status).end();
  });
};

exports.deleteRelations = function (req, res, config) {
  var parentId = req.params.id;
  var property = req.params.property;
  var data = req.body.data;
  // TODO handle no id
  // TODO handle no data

  runQuery(buildDeleteRelationQuery(parentId, property, data, config), function (status) {
    res.status(status).end();
  });
};




// --- Format Data -------------


// convert attrs to field names and cobine builds
function convertAttributesForSQL(dataAttrs, typeAttrs) {
  var splitString;
  var regEx;
  var data = {};
  var keys = Object.keys(typeAttrs);
  var key = keys.pop();

  while (key !== undefined) {
    if (typeAttrs[key].build === undefined) {

      // TODO do i need to wory about converting any other data types here?
      if (typeAttrs[key].dataType === 'boolean') {
        data[typeAttrs[key].field] = dataTypes.revert['boolean'](dataAttrs[key]);
      } else {
        data[typeAttrs[key].field] = dataAttrs[key];
      }
    } else {
      // build string from joins
      splitString = '';
      typeAttrs[key].build.forEach(function (a) {
        if (a.join !== undefined) {
          splitString += a.join;
        }
      });

      // turn joins into regex and split attribute with that
      if (splitString !== undefined && splitString.length > 0) {
        regEx = new RegExp(splitString, 'i');
        splitString = String(dataAttrs[key]).trim().split(regEx);

        typeAttrs[key].build.forEach(function (item) {
          if (item.field !== undefined) {
            data[item.field] = splitString.shift();
          }
        });
      }
    }

    key = keys.pop();
  }

  return data;
}








// --- Format return data -----------------


function formatData(structure, data) {
  if (data === null || data === undefined) { return undefined; }

  var set;
  var key;
  var keys;
  var descriptor;
  var dataByType = {};
  var returnData = {};
  var columnDescriptors = getColumnDescriptors(structure);
  var popped = data.pop();

  while (popped !== undefined) {
    set = {};
    keys = Object.keys(popped);
    key = keys.pop();

    while (key !== undefined) {
      descriptor = columnDescriptors[key];
      if (set[descriptor.type] === undefined) {
        set[descriptor.type] = {};
      }

      // run conversion on data based on type
      set[descriptor.type][descriptor.name] = dataTypes.convert[descriptor.dataType](popped[key]);
      key = keys.pop();
    }

    addDataSet(set, dataByType, structure)

    popped = data.pop();
  }

  formatDataAsJSONAPI(dataByType, structure);

  // format json api return
  returnData.data = dataByType[structure.type];
  returnData.included = pickReturnIncluded(structure.type, dataByType);

  return returnData;
}

function formatDataAsJSONAPI(data, structure) {
  var i;
  var length;
  var keys = Object.keys(data);
  var key = keys.pop();

  while (key !== undefined) {
    i = 0;
    length = data[key].length;

    while (i < length) {
      data[key][i] = {
        id: data[key][i].uuid,
        type: key,
        attributes: getReturnAttrubutes(walkTheStructureForStructure(key, structure), data[key][i]),
        relationships: data[key][i].relationships
      };
      i += 1;
    }
    key = keys.pop();
  }
}


function pickReturnIncluded(dataType, data) {
  var included = [];
  var keys = Object.keys(data);
  var key = keys.pop();

  while (key !== undefined) {
    if (dataType !== key) {
      included = included.concat(data[key]);
    }
    key = keys.pop();
  }

  return included;
}

// data sets are used to format return data
// they are arrays brokn up by type
function addDataSet(set, obj, structure) {
  var i;
  var length;
  var canAdd;
  var keys = Object.keys(set);
  var key = keys.pop();

  while (key !== undefined) {
    attachReturnRelations(key, set, structure)

    if (obj[key] === undefined) { obj[key] = []; }
    i = 0;
    length = obj[key].length;

    if (set[key].id !== null) {
      canAdd = true;
      while (i < length) {
        if (set[key].id === obj[key][i].id) {
          combineRelations(obj[key][i], set[key]);
          canAdd = false;
        }

        i += 1;
      }

      if (canAdd === true) {
        obj[key].push(set[key]);
      }
    }

    key = keys.pop();
  }
}

function combineRelations(dest, src) {
  if (src.relationships === undefined) { return; }
  if (dest.relationships === undefined) { dest.relationships = {}; }

  var i;
  var length;
  var destKeys = Object.keys(dest.relationships);
  var srcKeys = Object.keys(src.relationships);
  var key = srcKeys.pop();

  while (key !== undefined) {
    if (destKeys.indexOf(key) === -1) {
      dest.relationships[key] = src.relationships[key];
    } else if (dest.relationships[key].data instanceof Array) {
      combineRelationArray(dest.relationships[key].data, src.relationships[key].data)
    }

    key = srcKeys.pop();
  }
}

function combineRelationArray(dest, src) {
  var i;
  var canAdd;
  var length = dest.length;

  src.forEach(function (item) {
    i = 0;
    canAdd = true;
    while (i < length) {
      if (dest[i].id === item.id) { canAdd = false; }
      i += 1;
    }

    if (canAdd === true) {
      dest.push(item);
    }
  });
}


function attachReturnRelations(parentKey, set, structure) {
  walkTheStructureForRelations(parentKey, structure, function (data) {
    var type;
    var keys = Object.keys(data);
    var key = keys.pop();

    while (key !== undefined) {
      type = data[key].type;

      if (set[type].id !== null) {
        if (set[parentKey].relationships === undefined) { set[parentKey].relationships = {}; }
        if (set[parentKey].relationships[key] === undefined) { set[parentKey].relationships[key] = {meta: {type: type}, data: []}; }

        if (data[key].parentRelation.single === true) {
          set[parentKey].relationships[key].data = {
            type: type,
            id: set[type].uuid
          };
        } else {
          set[parentKey].relationships[key].data.push({
            type: type,
            id: set[type].uuid
          });
        }
      }

      key = keys.pop();
    }
  });
}

function walkTheStructureForRelations(type, structure, callback) {
  if (structure.relationships === undefined) { return; }
  if (structure.type === type) {
    callback(structure.relationships);
    return;
  }

  var keys = Object.keys(structure.relationships);
  var key = keys.pop();

  while (key !== undefined) {
    walkTheStructureForRelations(type, structure.relationships[key], callback)
    key = keys.pop();
  }
}

function walkTheStructureForStructure(type, structure) {
  if (structure.type === type) {
    return structure;
  }

  if (structure.relationships !== undefined) {
    var keys = Object.keys(structure.relationships);
    var key = keys.pop();

    while (key !== undefined) {
      return walkTheStructureForStructure(type, structure.relationships[key]);
      key = keys.pop();
    }
  }
}

function getReturnAttrubutes(structure, item) {
  var attrs = {};
  var obj = {};
  var keys = Object.keys(item);
  var key = keys.pop();

  while (key !== undefined) {
    if (key !== 'id' && key !== 'uuid') {
      attrs[key] = item[key];
    }
    key = keys.pop();
  }

  keys = Object.keys(structure.attributes);
  key = keys.pop();

  while (key !== undefined) {
    if (structure.attributes[key].build === undefined) {
      obj[key] = attrs[key];
    } else {
      obj[key] = structure.attributes[key].build.reduce(function (a, b) {
        if (b.field !== undefined) {
          return a += attrs[b.field];
        } else if (b.join !== undefined) {
          return a += b.join;
        }
      }, '');
    }

    key = keys.pop();
  }

  return obj;
}







// these are objects containing data to link the return sql rows to ther types and provide datatype conversion
function getColumnDescriptors(structure) {
  var sets = {};
  processColumnDescriptors(structure, sets);
  return sets;
}

function processColumnDescriptors(structure, sets) {
  var key;
  var keys

  // add sql attributes
  if (structure === undefined) { return; }
  keys = Object.keys(structure.sqlAttributes);
  key = keys.pop();
  while (key !== undefined) {
    sets[key] = structure.sqlAttributes[key];
    key = keys.pop();
  }

  // run process on relations
  if (structure.relationships === undefined) { return; }
  keys = Object.keys(structure.relationships);
  key = keys.pop();

  while (key !== undefined) {
    processColumnDescriptors(structure.relationships[key], sets);
    key = keys.pop();
  }
}






// --- Querying --------------

function runQuery(query, callback) {
  // TODO allow for passing of db name
  pools.default.getConnection(function(err, connection) {
    connection.query(query, function(err, rows, fields) {
      if (err !== null) {
        console.log(err);
        connection.release();
        callback(500);
        return;
      }

      connection.release();
      callback(200, rows);
    });
  });
}



function buildDeleteRelationQuery(parentId, property, data, resource) {
  var query;
  var relationship = resource.relationships[property];
  var type = relationship.resource.type;


  if (relationship.parentRelation.manyToMany === true) {
    query = 'delete ' + relationship.parentRelation.table + '\n';
    query += 'from ' + relationship.parentRelation.table + '\n';
    query += 'inner join ' + relationship.parentRelation.parentTable + ' on ' + relationship.parentRelation.table + '.' + relationship.parentRelation.parentField + '=' + relationship.parentRelation.parentTable + '.id\n';
    query += 'inner join ' + type.table + ' on ' + relationship.parentRelation.table + '.' + relationship.parentRelation.field + '=' + type.table + '.id\n';
    query += 'where ' + type.table + '.' + getIdField(data.id) + '=\'' + data.id + '\'';
  } else {

    if (relationship.parentRelation.many === true) {
      query = 'update ' + type.table + '\n';
      query += 'set ' + type.table + '.' + relationship.parentRelation.parentField + '=null\n';
    } else {
      query = 'update ' + relationship.parentRelation.parentTable + '\n';
      query += 'set ' + relationship.parentRelation.field + '=null\n';
    }

    query += 'where ' + relationship.parentRelation.parentTable + '.' + getIdField(parentId) + '=\'' + parentId + '\'';
  }

  return query;
}



function buildRelationshipQuery(data, parentId, property, resource) {
  var query;
  var relationship = resource.relationships[property];
  var type = relationship.resource.type;

  // TODO implement remove all relationships

  if (relationship.parentRelation.manyToMany === true) {
    // TODO get both parent and child ids and insert it into reference table
    query = 'insert into ' + relationship.parentRelation.table + ' (' + relationship.parentRelation.field + ',' + relationship.parentRelation.parentField + ')\n';
    query += 'select ' + type.table + '.id,' + relationship.parentRelation.parentTable + '.id\n';
    query += 'from ' + relationship.parentRelation.parentTable + '\n';
    query += 'left join ' + type.table + ' on ' + type.table + '.' + getIdField(data.id) + '=\'' + data.id + '\'\n';
    query += 'where ' + relationship.parentRelation.parentTable + '.' + getIdField(parentId) + '=\'' + parentId + '\'';


  } else {
    query = 'update ' + relationship.parentRelation.table + ',' + type.table + '\n';

    if (relationship.parentRelation.many === true) {
      // TODO get parent id and insert it into child field
      query += 'set ' + type.table + '.id=' + relationship.parentRelation.table + '.' + relationship.parentRelation.field + '\n';
    } else {
      // TODO get child id and insert it into parent field
      query += 'set ' + relationship.parentRelation.table + '.' + relationship.parentRelation.field + '=' + type.table + '.id\n';
    }

    query += 'where ' + relationship.parentRelation.table + '.' + getIdField(parentId) + '=\'' + parentId + '\' and ' + type.table + '.' + getIdField(data.id) + '=\'' + data.id + '\'';
  }

  return query;
}


function buildUpdateQuery(data, id) {
  var type = types[data.type];
  var convertedAttrs = convertAttributesForSQL(data.attributes, type.attributes);

  //

  var query = 'insert into ' + type.table + ' (uuid';
  query += Object.keys(convertedAttrs).reduce(function (a, key) {
    if (convertedAttrs[key] !== undefined) {
      return a +=  ',' + key;
    }
    return a;
  }, '') + ')\n';
  query += 'values (\'' + id + '\'';
  query += Object.keys(convertedAttrs).reduce(function (a, key) {
    if (convertedAttrs[key] !== undefined) {
      return a +=  ',\'' + convertedAttrs[key] + '\'';
    }
    return a;
  }, '') + ')\n';
  query += 'on duplicate key update ';
  query += Object.keys(convertedAttrs).reduce(function (a, key) {
    if (convertedAttrs[key] !== undefined) {
      return a += key+'=\''+convertedAttrs[key] + '\',';
    }
    return a;
  }, '').slice(0, -1);

  return query;
}




function buildQuery(structure, id) {
  var query;
  var queryObj = {attributes: {}, joins: []};
  queryObj.attributes[structure.type] = structure.queryParams;

  addJoins(structure.relationships, queryObj);

  query = 'select ';
  query += Object.keys(queryObj.attributes).reduce(function (a, b) {
    return a + queryObj.attributes[b] + ',';
  }, '').slice(0, -1);

  query += ' from ' + structure.table + '\n';

  query += queryObj.joins.reduce(function (a, b) {
    return a + b + '\n';
  }, '');

  if (id !== undefined) {
    query += ' where ' + structure.table + '.' + getIdField(id) + '=\'' + id + '\'';
  }

  return query;
}


function addJoins(relations, queryObj) {
  if (relations === undefined) { return; }

  var relationship;
  var parentRelation;
  var keys = Object.keys(relations);
  var key = keys.pop();

  while (key !== undefined) {
    relationship = relations[key];
    parentRelation = relationship.parentRelation;

    queryObj.attributes[relationship.type] = relationship.queryParams;
    if (parentRelation.manyToMany === true) {
      queryObj.joins.push('left join ' + parentRelation.table + ' on ' + parentRelation.parentTable + '.id' + ' = ' + parentRelation.table + '.' + parentRelation.parentField);
      queryObj.joins.push('left join ' + relationship.table + ' on ' + parentRelation.table + '.' + parentRelation.field + ' = ' + relationship.table + '.id');
    } else if (parentRelation.many === true) {
      queryObj.joins.push('left join ' + relationship.table + ' on ' + parentRelation.parentTable + '.id' + ' = ' + relationship.table + '.' + parentRelation.field);
    } else if (parentRelation.single === true) {
      queryObj.joins.push('left join ' + relationship.table + ' on ' + parentRelation.parentTable + '.' + parentRelation.field + ' = ' + relationship.table + '.id');
    }

    if (relationship.relationships !== undefined) {
      addJoins(relationship.relationships, queryObj);
    }

    key = keys.pop();
  }
}


function getIdField(id) {
  return uuidPattern.test(id) === true ? 'uuid' : 'id';
}








// --- Build structure to send to client ---

function getClientStructure(structure) {
  var clientStructure = {
    type: structure.type,
    attributes: extractClientStructureAttributes(structure.attributes)
  };

  if (structure.relationships !== undefined) {
    clientStructure.relationships = getClientStructureRelationships(structure.relationships);
  }

  return clientStructure
}

function getClientStructureRelationships(relationships) {
  var keys = Object.keys(relationships);
  var key = keys.pop();
  var relObj = {};
  var relation;

  while (key !== undefined) {
    relation = relationships[key];
    relObj[key] = {
      type: relation.type,
      meta: {
        many: relation.parentRelation ? (relation.parentRelation.manyToMany || relation.parentRelation.many || false) : false,
        constrain: relation.parentRelation ? (relation.parentRelation.constrain || false) : false,
      },
      attributes: extractClientStructureAttributes(relation.attributes)
    };

    if (relation.relationships !== undefined) {
      relObj[key].relationships = getClientStructureRelationships(relation.relationships);
    }

    key = keys.pop();
  }

  return relObj;
}

function extractClientStructureAttributes(attrs) {
  var returnAttrs = {};

  Object.keys(attrs).forEach(function (key) {
    returnAttrs[key] = attrs[key].dataType
  });

  return returnAttrs;
}




// --- Build partial structrue based on includes ---

// build structure for query and json
function getStructure(config, include) {
  var structure = buildStructure(config);

  if (include === undefined) {
    return copyResource(config);
  } else {
    return addInclude(config, include);
  }
}


// add include relations to copy object for building query and json
function addInclude(resource, includes, copy) {
  var key;
  var keys;
  copy = copy || copyResource(resource);
  includes = includes || [];

  includes.forEach(function (path) {
    var split = path instanceof Array ? path : path.split('.');

    if (resource.relationships !== undefined) {
      keys = Object.keys(resource.relationships);
      key = keys.pop();

      while (key !== undefined) {
        if (key === split[0]) {

          if (copy.relationships === undefined) { copy.relationships = {}; }
          if (copy.relationships[key] === undefined) {
            copy.relationships[key] = copyResource(resource.relationships[key].resource, resource.relationships[key].parentRelation);
          }

          if (split.length > 1) {
            addInclude(resource.relationships[key].resource, split.slice(1), copy.relationships[key]);
          }
          break;
        }

        key = keys.pop();
      }
    }

  });

  return copy;
}


function copyResource(resource, relation) {
  return {
    type: resource.type.name,
    database: resource.type.database,
    table: resource.type.table,
    queryParams: resource.type.queryParams,
    sqlAttributes: resource.type.sqlAttributes,
    attributes: resource.type.attributes, // NOTE this is holding reference
    parentRelation: relation // NOTE this is holding reference || undefined
  };
}









// --- Build Full Structure ----


// build full structure based on resources and there relations
// this will only build once
function buildStructure(config) {
  var includeTransformed = [];
  if (config.built === true) { return config.structure; } // structure was built succesfully

  config.type = types[config.type]; // replace type name with type obj
  if (config.type === undefined) {
    throw Error('Type of "' + config.type + '" for resource "' + config.name + '" could not be found');
    return;
  }

  config.type.queryParams = getQueryParams(config.type);
  config.type.sqlAttributes = getFlatAttributes(config.type);
  buildRelationships(config.type, config.relationships);
  config.built = true;

  return config;
}

function buildRelationships(parentType, relationships) {
  if (relationships === undefined) { return; }
  var keys = Object.keys(relationships);
  var key = keys.pop();

  while (key !== undefined) {
    relationships[key].resource = resources[relationships[key].resource];
    if (relationships[key].resource === undefined) {
      throw Error('Resource of "' + relationships[key].resource + '" cannot be found');
      return;
    }

    // replace relation name with relation object
    relationships[key].resource.type = types[relationships[key].resource.type];
    relationships[key].resource.type.constrain = relationships[key].resource.type.constrain || false;
    relationships[key].resource.type.queryParams = getQueryParams(relationships[key].resource.type);
    relationships[key].resource.type.sqlAttributes = getFlatAttributes(relationships[key].resource.type);

    // add relation from parent type object
    relationships[key].parentRelation = getRelationshipFromType(parentType, relationships[key].resource.type);

    buildRelationships(relationships[key].resource.type, relationships[key].resource.relationships);

    key = keys.pop();
  }
}

function getRelationshipFromType(parentType, childType) {
  if (parentType.relationships === undefined) { return undefined; }

  var i = 0;
  var length = parentType.relationships.length;

  while (i < length) {
    if (parentType.relationships[i].type === childType.name) {
      return parentType.relationships[i];
    }
    i += 1;
  }
}


// return a comma seperated string of field names
// structure = type
function getQueryParams(structure) {
  if (structure.attributes === undefined) { return '*'; }

  return Object.keys(structure.attributes).reduce(function (arr, key) {
    if (structure.attributes[key].build !== undefined) {
      return arr.concat(structure.attributes[key].build.filter(function (builder) {
        return builder.field !== undefined;
      }).map(function (builder) {
        return structure.table + '.' + builder.field + ' as ' + builder.alias;
      }));
    }
    return arr.concat(structure.table + '.' + structure.attributes[key].field + ' as ' + structure.attributes[key].alias);
  }, []).join(',') + ',' + structure.table + '.id as ' + structure.name + 'id,' + structure.table + '.uuid as ' + structure.name + 'uuid';
}

function getFlatAttributes(type) {
  var flat = {};
  var keys = Object.keys(type.attributes);
  var key = keys.pop();

  while (key !== undefined) {
    if (type.attributes[key].build !== undefined) {
      type.attributes[key].build.forEach(function (build) {
        if (build.field !== undefined) {
          flat[build.alias] = build;
        }
      });
    } else {
      flat[type.attributes[key].alias] = type.attributes[key];
    }

    key = keys.pop();
  }

  flat[type.name + 'id'] = {dataType: 'id', field: 'id', alias: type.name + 'id', type: type.name, name: 'id'};
  flat[type.name + 'uuid'] = {dataType: 'string', field: 'uuid', alias: type.name + 'uuid', type: type.name, name: 'uuid'};

  return flat;
}
