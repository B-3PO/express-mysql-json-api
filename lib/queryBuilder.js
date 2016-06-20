var sharedData = require('./sharedData.js');
var resources = sharedData.resources;
var dataTypes = require('./dataTypes.js');

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


exports.create = function () {
  return createQueryBuilder();
};

// --- Query biulder -----

function createQueryBuilder() {
  var attributes = {};
  var isSelect = false;
  var query = '';
  var table = '';
  var whereId;
  var joinByType = {};
  var includeIds;

  return {
    build: build,
    select: select,
    addRelation: addRelation,
    updateSingleRelationship: updateSingleRelationship,
    updateResource: updateResource,
    updateOneToManyRelationship: updateOneToManyRelationship,
    updateManyToManyRelationship: updateManyToManyRelationship,
    deleteRelationship: deleteRelationship,
    deleteResource: deleteResource
  };


  function select(resource, id, _includeIds) {
    includeIds = _includeIds;
    addAttributes(resource.type);
    table = resource.type.table;
    isSelect = true;
    whereId = id;
  }


  function updateResource(structure, data, meta, id) {
    var oneToMany;
    var convertedAttrs = convertAttributesForSQL(data.attributes, structure.type.attributes);
    var constraintResource = meta && meta.constraint ? resources[meta.constraint.resource] : undefined;

    if (constraintResource !== undefined) {
      oneToMany = constraintResource.relationships[structure.name].oneToMany;
    }

    query = 'insert into ' + structure.type.table + ' (uuid';
    query += Object.keys(convertedAttrs).reduce(function (a, key) {
      if (convertedAttrs[key] !== undefined) {
        return a +  ',' + key;
      }
      return a;
    }, '');

    if (constraintResource !== undefined && oneToMany === true) {
      query += ',' + constraintResource.relationships[structure.name].field;
    }

    query += ')';


    if (constraintResource !== undefined && oneToMany === true) {
      query += '\nselect \'' + id + '\'';
      query += Object.keys(convertedAttrs).reduce(function (a, key) {
        if (convertedAttrs[key] !== undefined) {
          return a +=  ',\'' + convertedAttrs[key] + '\'';
        }
        return a;
      }, '');
      query += ',' + constraintResource.type.table + '.id\n';
      query += 'from ' + constraintResource.type.table;
      query += '\nwhere ' + constraintResource.type.table + '.' +getIdField(meta.constraint.id) + '=\'' + meta.constraint.id + '\'';
    } else {
      query += '\nvalues (\'' + id + '\'';
      query += Object.keys(convertedAttrs).reduce(function (a, key) {
        if (convertedAttrs[key] !== undefined) {
          return a +=  ',\'' + convertedAttrs[key] + '\'';
        }
        return a;
      }, '') + ')';
    }


    query += '\non duplicate key update ';
    query += Object.keys(convertedAttrs).reduce(function (a, key) {
      if (convertedAttrs[key] !== undefined) {
        return a + key+'=\''+convertedAttrs[key] + '\',';
      }
      return a;
    }, '').slice(0, -1);
  }


  function addRelation(relation, parentRelation) {
    addAttributes(relation.resource.type);
    if (joinByType[relation.resource.name] === undefined) {
      joinByType[relation.resource.name] = {
        manyToMany: relation.manyToMany,
        oneToMany: relation.oneToMany,
        relationJoins: [],
        resourceOns: []
      };
    }

    if (relation.manyToMany === true) {
      joinByType[relation.resource.name].relationJoins.push('left join ' + relation.table + ' on ' + relation.table+'.'+relation.parentField + ' = ' + (parentRelation.resource ? parentRelation.resource.type.table || parentRelation.table || table : parentRelation.table || table)+'.id');
      joinByType[relation.resource.name].resourceJoin = 'left join ' + relation.resource.type.table + ' on ';
      joinByType[relation.resource.name].resourceOns.push(relation.resource.type.table+'.id = ' + relation.table+'.'+relation.field);
    } else if (relation.oneToMany === true) {
      joinByType[relation.resource.name].relationJoins.push('left join ' + relation.resource.type.table + ' on ' + relation.resource.type.table+'.'+relation.field + ' = ' + (parentRelation.resource ? parentRelation.resource.type.table || parentRelation.table || table : parentRelation.table || table)+'.id');
    } else {
      joinByType[relation.resource.name].relationJoins.push('left join ' + relation.resource.type.table + ' on ' + relation.resource.type.table+'.id' + ' = ' + relation.table+'.'+relation.field);
    }
  }


  function updateSingleRelationship(structure, data, parentId, property) {
    var relation = structure.relationships[property];

    query = 'update ' + relation.resource.type.table + ',' + structure.type.table + '\n';
    query += 'set ' + structure.type.table+'.'+relation.field + '=' + relation.resource.type.table+'.id\n';
    query += 'where ' + structure.type.table+'.'+getIdField(parentId) + '=\'' + parentId + '\' and ' + relation.resource.type.table + '.' + getIdField(data.id) + '=\'' + data.id + '\'';
  }


  function updateOneToManyRelationship(structure, data, parentId, property) {
    var relation = structure.relationships[property];
    data = [].concat(data);

    query = 'update ' + relation.resource.type.table + ',' + structure.type.table + '\n';
    query += 'set ' + relation.resource.type.table+'.'+relation.field + '=' + structure.type.table+'.id\n';
    query += 'where ' + structure.type.table+'.'+getIdField(parentId) + '=\'' + parentId + '\' and ' + relation.resource.type.table + '.' + getIdField(data[0].id) + '=\'' + data[0].id + '\'';
  }


  function updateManyToManyRelationship(structure, data, parentId, property) {
    var relation = structure.relationships[property];
    data = [].concat(data);

    query = 'insert into ' + relation.table + ' (' + relation.field + ',' + relation.parentField + ')\n';
    query += 'select ' + relation.resource.type.table + '.id,' + structure.type.table + '.id\n';
    query += 'from ' + relation.resource.type.table + '\n';
    query += 'left join ' + structure.type.table + ' on ' + structure.type.table + '.' + getIdField(parentId) + '=\'' + parentId + '\'\n';
    query += 'where ' + relation.resource.type.table + '.' + getIdField(data[0].id) + '=\'' + data[0].id + '\'';
  }


  function deleteRelationship(structure, property, parentId, data) {
    var relation = structure.relationships[property];

    if (relationship.parentRelation.manyToMany === true) {
      query = 'delete ' + relation.table + '\n';
      query += 'from ' + relation.table + '\n';
      query += 'inner join ' + structure.type.table + ' on ' + relation.table + '.' + relation.parentField + '=' + structure.type.table + '.id\n';
      query += 'inner join ' + relation.resource.type.table + ' on ' + relation.table + '.' + relation.field + '=' + relation.resource.type.table + '.id\n';
      query += 'where ' + relation.resource.type.table + '.' + getIdField(data.id) + '=\'' + data.id + '\'';

    } else if (relationship.parentRelation.oneToMany === true) {
      query = 'update ' + relation.resource.type.table + '\n';
      query += 'set ' + relation.resource.type.table + '.' + relation.field + '=null\n';

    } else {
      query = 'update ' + structure.type.table + '\n';
      query += 'set ' + relation.field + '=null\n';
    }

    query += 'where ' + structure.type.table + '.' + getIdField(parentId) + '=\'' + parentId + '\'';
  }


  function deleteResource(structure, id) {
    query = 'delete from ' + structure.type.table + ' where ' + getIdField(id) + '=\'' + id + '\'';
  }


  function build() {
    if (isSelect === true) {
      buildSelect();
    }

    return query;
  }


  function buildSelect() {
    query = 'select ' + getAttributes();

    query += ' from ' + table + '\n';

    query += Object.keys(joinByType).map(function (key) {
      if (joinByType[key].manyToMany === true) {
        return joinByType[key].relationJoins.join(' ') + '\n' + joinByType[key].resourceJoin + joinByType[key].resourceOns.join(' or ');
      } else {
        return joinByType[key].relationJoins.join(' ');
      }
    }).reduce(function (a, b) {
      return a + b + '\n';
    }, '');

    if (whereId !== undefined) {
      query += ' where ' + table + '.' + getIdField(whereId) + '=\'' + whereId + '\'';
    }
  }


  function addAttributes(type, filterArr) {
    attributes[type.name] = [];

    Object.keys(type.attributes).forEach(function (key) {
      if (filterArr !== undefined && filterArr.indexOf(key) === -1) { return; }

      if (type.attributes[key] instanceof Array) {
        attributes[type.name].push(type.attributes[key].reduce(function (a, build) {
          if (build.join !== undefined) { return a; }
          return a + type.table + '.' + build.field + ' as ' + build.alias + ',';
        }, '').slice(0, -1));

      } else if (type.attributes[key].fetch !== false || (key === 'id' && includeIds === true)) {
        attributes[type.name].push(type.table + '.' + type.attributes[key].field + ' as ' + type.attributes[key].alias);
      }
    });
  }

  function getAttributes() {
    return Object.keys(attributes).reduce(function (a, b) {
      return a + attributes[b] + ',';
    }, '').slice(0, -1);
  }



  // convert attrs to field names and cobine builds
  function convertAttributesForSQL(dataAttrs, typeAttrs) {
    var splitString;
    var regEx;
    var data = {};
    var keys = Object.keys(typeAttrs);
    var key = keys.pop();

    while (key !== undefined) {
      if (!(typeAttrs[key] instanceof Array)) {

        // TODO do i need to wory about converting any other data types here?
        if (typeAttrs[key].parse !== undefined) {
          data[typeAttrs[key].field] = typeAttrs[key].parse(dataAttrs[key]);
        } else if (typeAttrs[key].dataType === 'boolean') {
          data[typeAttrs[key].field] = dataTypes.revert['boolean'](dataAttrs[key]);
        } else {
          data[typeAttrs[key].field] = dataAttrs[key];
        }
      } else {
        // build string from joins
        splitString = '';
        typeAttrs[key].forEach(function (a) {
          if (a.join !== undefined) {
            splitString += a.join;
          }
        });

        // turn joins into regex and split attribute with that
        if (splitString !== undefined && splitString.length > 0) {
          regEx = new RegExp(splitString, 'i');
          splitString = String(dataAttrs[key]).trim().split(regEx);

          typeAttrs[key].forEach(function (item) {
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
};





function getIdField(id) {
  return uuidPattern.test(id) === true ? 'uuid' : 'id';
}
