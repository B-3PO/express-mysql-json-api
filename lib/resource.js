var sharedData = require('./sharedData.js');
var resourceRouter = require('./resourceRouter.js');
var types = sharedData.types;
var resources = sharedData.resources;




exports.create = function (options) {
  validateOptions(options);

  options.type = types[options.type];
  resources[options.name] = options;

  return resourceRouter.create(options);
};


// hook up the resources to the relationships
exports.build = function (resource) {
  buildResource(resource);
};



function buildResource(resource, parentResource) {
  if (resource.built === true || resource.relationships === undefined) { return; }

  var relation;
  var isToMany;
  var keys = Object.keys(resource.relationships);
  var key = keys.pop();


  while (key !== undefined) {
    relation = resource.relationships[key];

    relation.resource = resources[relation.resource];
    isToMany = relation.manyToMany || relation.oneToMany || false;

    // there is a join table
    if (relation.manyToMany === true) {
      relation.field = relation.field || relation.resource.type.table;
      // assume the parents id field name is the same as the parents table name
      relation.parentField = relation.parentField || resource.type.table;
      relation.table = relation.table || buildManyToManyTableName(relation);

    // the resources table has a reference id to its parent
    } else if (relation.oneToMany === true) {
      relation.table = relation.table || relation.resource.type.table;
      // assume the relations id field name is the same as the parents table name
      relation.field = relation.field || resource.type.table;

    // parent has a id to its child resource
    } else {
      relation.single = true;
      relation.table = resource.type.table;
      // use type ase relation field name if none is given
      relation.field = relation.field || relation.resource.type.name;
    }

    // create alias after field is choosen
    // relation.alias = getAlias(relation.resource.type, relation);

    if (relation.resource.type.constraint === true) {
      relation.meta = {};
      relation.meta.constraint = {
        resource: resource.name
      };
    }

    if (isToMany) {
      relation.meta = relation.meta || {};
      relation.meta.toMany = isToMany;
    }

    buildResource(relation.resource, resources[relation.resource]);

    key = keys.pop();
  }

  resource.built = true;
}



function validateOptions(options) {
  if (options.name === undefined) {
    throw Error('Resource Requires a property of "name"');
    return;
  }

  if (options.type === undefined || types[options.type] === undefined) {
    throw Error('Resource Requires a property of "type" that has a matching created type');
    return;
  }

  if (resources[options.name] !== undefined) {
    throw Error('Resource with name of "' + options.name + '" already exists');
  }
}




function buildManyToManyTableName(relationshipObj) {
  return relationshipObj.parentField + '_' + relationshipObj.field;
  // alphabetical
  // return [relationshipObj.parentField, relationshipObj.field].sort(function (a, b) {
  //   if (a < b) { return -1; }
  //   if (a > b) { return 1; }
  //   return 0;
  // }).join('_');
}

function getAlias(typeObj, attr, key) {
  return typeObj.name + (attr.field || key);
}
