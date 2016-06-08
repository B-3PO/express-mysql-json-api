var resourceBuilder = require('./resource.js');


exports.sendFootprint = function (req, res, resource) {
  // build resources if they have not been built yet
  resourceBuilder.build(resource);

  var include = formatIncludes(req.query.include);
  var cherryPicked = cherryPickStructure(resource, include);
  var footPrint = getFootprint(cherryPicked);

  // TODO handle errors and send back errored response
  res.send(footPrint);
};


// NOTE may need to add ability to include all resources
exports.getStructure = function (resource, includeString) {
  var include = formatIncludes(includeString);
  return cherryPickStructure(resource, include);
};




// TODO add momoize
function getFootprint(structure) {
  var footprint = {
    type: structure.type.name,
    attributes: extractClientStructureAttributes(structure.type.attributes)
  };
  getRelationshipFootprint(structure.relationships, footprint);

  return footprint;
}


function getRelationshipFootprint(relationships, footprint) {
  if (relationships === undefined || relationships === null) {
    return;
  }

  var keys = Object.keys(relationships);
  var key = keys.pop();

  footprint.relationships = {};

  while (key !== undefined) {
    footprint.relationships[key] = buildFootprintRelation(relationships[key]);
    getRelationshipFootprint(relationships[key].resource.relationships, footprint.relationships[key]);

    key = keys.pop();
  }
}


function buildFootprintRelation(relation) {
  var retrunObj = {
    type: relation.resource.type.name,
    attributes: extractClientStructureAttributes(relation.resource.type.attributes)
  };

  if (relation.meta) {
    retrunObj.meta = relation.meta;
  }

  return retrunObj;
}





// pick structure based on passed in included
// TODO add momoize
function cherryPickStructure(structure, include) {
  var cherry = copyResourceObj(structure);

  pickRelationships(structure.relationships, include, cherry);

  return cherry;
}

function pickRelationships(relationships, include, cherry) {
  if (relationships === undefined || relationships === null || include === undefined || !include.length) {
    return;
  }

  var keys = Object.keys(relationships);
  var remainingIncludes = getRemainingIncludes(include, keys);
  var key = keys.pop();


  while (key !== undefined) {
    if (findIncludeMatch(key, include) === true) {
      if (cherry.relationships === undefined) {
        cherry.relationships = {};
      }

      cherry.relationships[key] = copyRelationObj(relationships[key]);
      pickRelationships(relationships[key].resource.relationships, remainingIncludes, cherry.relationships[key].resource);
    }
    key = keys.pop();
  }
}


function copyRelationObj(relation) {
  var keys = Object.keys(relation);
  var key = keys.pop();
  var returnObj = {};

  while (key !== undefined) {
    if (key !== 'resource') {
      returnObj[key] = relation[key];
    } else {
      returnObj.resource = copyResourceObj(relation.resource);
    }

    key = keys.pop();
  }

  return returnObj;
}

function copyResourceObj(resource) {
  return {
    name: resource.name,
    type: resource.type
  };
}


// return new array of item that have depth and the first item matches a relationship
// then remove the first item
// This new array is to be used with the next depth of relationships
function getRemainingIncludes(includes, relationKeys) {
  return includes.filter(function (item) {
    return item.length > 1 && relationKeys.indexOf(item[0]) > -1;
  }).map(function (item) {
    return item.slice(1);
  });
}



// find and remove relevent matches
function findIncludeMatch(key, includes) {
  var i = 0;
  var length = includes.length;

  while (i < length) {
    if (includes[i][0] === key) {
      return true;
    }
    i += 1;
  }

  return false;
}



function extractClientStructureAttributes(attrs) {
  var returnAttrs = {};

  Object.keys(attrs).forEach(function (key) {
    returnAttrs[key] = attrs[key].dataType
  });

  return returnAttrs;
}


function formatIncludes(includeString) {
  if (includeString === undefined) { return undefined; }

  var includeArr = includeString.split(',');

  return includeArr.map(function (item) {
    return item.split('.');
  });
}
