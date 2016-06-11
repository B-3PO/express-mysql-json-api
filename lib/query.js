var queyBuilder = require('./queryBuilder.js');
var sharedData = require('./sharedData.js');
var dataTypes = require('./dataTypes.js');
var pools = sharedData.pools;
var types = sharedData.types;
var resources = sharedData.types;


exports.get = function (structure, id, callback) {
  var queryBuilder = queyBuilder.create();

  queryBuilder.select(structure, id);
  addJoins(structure.relationships, structure, queryBuilder);
  var query = queryBuilder.build();
  runQuery(query, function (error, rows) {
    if (error !== undefined) {
      callback(500);
      return;
    }

    callback(200, buildData(structure, rows, id === undefined));
  });
};


exports.addRelationship = function (structure, data, parentId, property, callback) {
  var queryBuilder = queyBuilder.create();

  if (structure.relationships[property].manyToMany === true) {
    queryBuilder.updateManyToManyRelationship(structure, data, parentId, property);
  } else if (structure.relationships[property].oneToMany === true) {
    queryBuilder.updateOneToManyRelationship(structure, data, parentId, property);
  } else {
    queryBuilder.updateSingleRelationship(structure, data, parentId, property);
  }


  var query = queryBuilder.build();
  runQuery(query, function (error, rows) {
    if (error !== undefined) {
      callback(500);
      return;
    }

    callback(200);
  });

  callback(200);
};


exports.updateResource = function (structure, data, meta, id, callback) {
  var queryBuilder = queyBuilder.create();
  queryBuilder.updateResource(structure, data, meta, id)

  var query = queryBuilder.build();
  runQuery(query, function (error, rows) {
    if (error !== undefined) {
      callback(500);
      return;
    }

    callback(200);
  });
  callback(200);
};


exports.deleteRelationship = function(structure, property, parentId, data, callback) {
  var queryBuilder = queyBuilder.create();
  queryBuilder.deleteRelationship(structure, property, parentId, data);

  var query = queryBuilder.build();
  runQuery(query, function (error, rows) {
    if (error !== undefined) {
      callback(500);
      return;
    }

    callback(200);
  });
  callback(200);
};

exports.deleteResource = function(structure, id, callback) {
  var queryBuilder = queyBuilder.create();
  queryBuilder.deleteResource(structure, id);

  var query = queryBuilder.build();
  runQuery(query, function (error, rows) {
    if (error !== undefined) {
      callback(500);
      return;
    }

    callback(200);
  });
  callback(200);
};






function addJoins(relationships, parentRelation, queryBuilder) {
  if (relationships === undefined) { return; }

  var keys = Object.keys(relationships);
  var key = keys.pop();

  while (key !== undefined) {
    queryBuilder.addRelation(relationships[key], parentRelation);
    addJoins(relationships[key].resource.relationships, relationships[key], queryBuilder);
    key = keys.pop();
  }
}


function runQuery(query, callback) {
  // TODO allow for passing of db name
  pools.default.getConnection(function(err, connection) {
    connection.query(query, function(err, rows, fields) {
      if (err !== null) {
        console.log(err);
        connection.release();
        callback(err);
        return;
      }

      connection.release();
      callback(undefined, rows);
    });
  });
}




// format data for json api
function buildData(structure, data, toMany) {
  if (data === null || data === undefined) { return undefined; }

  var sets = [];
  var set;
  var key;
  var keys;
  var descriptor;
  var dataByType;
  var returnData = {};
  var columnDescriptors = getColumnDescriptors(structure, {});
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
      set[descriptor.type][descriptor.attr.name] = dataTypes.convert[descriptor.attr.dataType](popped[key]);
      key = keys.pop();
    }

    sets.push(set);
    popped = data.pop();
  }

  var processedSets = processDataSets(sets, structure);
  return formatJsonApi(processedSets, structure, toMany);
}


function processDataSets(sets, structure) {
  var dataByType = {};

  sets.forEach(function (set) {
    var addedSetType = addSet(dataByType, set, structure.type.name);

    if (addedSetType !== undefined) {
      addSetRelationships(addedSetType, set, structure.relationships);
    }

    processDataSetRelationships(dataByType, set, structure.relationships);
  });

  return dataByType;
}

function processDataSetRelationships(dataByType, set, relationships) {
  if (relationships === undefined) { return; }

  Object.keys(relationships).forEach(function (key) {
    var resource = relationships[key].resource;
    var addedSetType = addSet(dataByType, set, resource.type.name);
    if (addedSetType !== undefined) {
      addSetRelationships(addedSetType, set, resource.relationships);
    }

    processDataSetRelationships(dataByType, set, resource.relationships);
  });
}

function addSetRelationships(data, set, relationships) {
  if (relationships === undefined) { return; }

  Object.keys(relationships).forEach(function (key) {
    var typeName = relationships[key].resource.type.name;

    if (set[typeName] === undefined || set[typeName].uuid === null) { return; }
    if (setRelationExists(data, key, set[typeName].uuid) === false) {
      data.relationships[key].data.push({
        id: set[typeName].uuid,
        type: typeName
      });
    }
  });
}

function setRelationExists(data, key, uuid) {
  if (data.relationships === undefined) { data.relationships = {}; }
  if (data.relationships[key] === undefined) { data.relationships[key] = {data: []}; }

  var i = 0;
  var relationData = data.relationships[key].data;
  var length = relationData.length;

  while (i < length) {
    if (relationData[i].id === uuid) {
      return true;
    }
    i += 1;
  }

  return false;
}

function addSet(dataByType, set, typeName) {
  var addedSet;
  var dataTypeList;
  var length;
  var uuid = set[typeName].uuid;
  var i = 0;

  if (uuid === null) { return undefined; }
  if (dataByType[typeName] === undefined) { dataByType[typeName] = []; }
  dataTypeList = dataByType[typeName];
  length = dataTypeList.length


  while (i < length) {
    if (dataTypeList[i].uuid === uuid) {
      addedSet = dataTypeList[i];
    }
    i += 1;
  }

  if (addedSet === undefined) {
    addedSet = {
      uuid: uuid,
      attributes: set[typeName]
    };
    dataByType[typeName].push(addedSet);
  }

  return addedSet;
}








function formatJsonApi(dataByType, structure, toMany) {
  var returnData = {};
  var data = formatJsonApiDataObj(dataByType[structure.type.name], structure.type);
  delete dataByType[structure.type.name];
  var includes = buildJsonApiIncludes(dataByType);

  returnData.data = toMany ? data || [] : data[0] || null;
  if (includes !== undefined && includes.length > 0) {
    returnData.included = includes;
  }

  return returnData;
}

function buildJsonApiIncludes(dataByType) {
  var includes = [];

  Object.keys(dataByType).forEach(function (typeName) {
    var type = types[typeName];
    var formated = formatJsonApiDataObj(dataByType[typeName], type);

    if (formated.length > 0) {
      includes = includes.concat(formated);
    }
  });

  return includes;
}


function formatJsonApiDataObj(data, type) {
  if (data === undefined) {
    return [];
  }

  return data.map(function (item) {
     var returnObj = {
      id: item.uuid,
      type: type.name,
      attributes: proccessAttrbutes(item.attributes, type.attributes)
    };

    if (item.relationships !== undefined) {
      returnObj.relationships = item.relationships;
    }

    return returnObj;
  });
}


function proccessAttrbutes(item, attrDescription) {
  var obj = {};
  var keys = Object.keys(attrDescription);
  var key = keys.pop();

  while (key !== undefined) {
    if (key === 'id' || key === 'uuid') {
      key = keys.pop();
      continue;
    }

    if (attrDescription[key] instanceof Array) {
      obj[key] = attrDescription[key].reduce(function (a, b) {
        if (b.field !== undefined) {
          return a += item[b.field];
        } else if (b.join !== undefined) {
          return a += b.join;
        }
      }, '');
    } else {
      obj[key] = item[key];
    }

    key = keys.pop();
  }

  return obj;
}



function getColumnDescriptors(structure, obj) {
  var resource = structure.resource || structure;
  var attrs = resource.type.attributes;

  // create hash table of attrs
  Object.keys(attrs).forEach(function (key) {
    if (attrs[key] instanceof Array) {
      attrs[key].forEach(function (item) {
        if (item.join !== undefined) { return; }

        obj[item.alias] = {
          attr: item,
          type: resource.type.name
        };
      });
    } else {
      obj[attrs[key].alias] = {
        attr: attrs[key],
        type: resource.type.name
      };
    }
  });


  // call on relations
  if (resource.relationships) {
    var keys = Object.keys(resource.relationships);
    var key = keys.pop();
    while (key !== undefined) {
      getColumnDescriptors(resource.relationships[key], obj);
      key = keys.pop();
    }
  }


  return obj;
}
