var typeManager = require('./type.js');

module.exports = {
  Create: Create
};



function Create(data, id) {
  var idCounter = 0;
  var types = [];
  var parentTypes = [];
  var attributes = {};
  var typeQueryObjects = [];
  var queries = [];

  init2();
  return {

  };


  function init2() {
    getTypes(data);
    findParentTypes();
    buildTypeQueryObjs(data);
    buildQueries();
  }


  function buildQueries() {
    parentTypes.forEach(function (parent) {
      var query;
      var joins = [];
      var queryObjs = getQueryObjs(parent)[0];

      buildRelationshipsJoins(queryObjs, joins);

      query = 'select ';
      console.log(attributes);
      query += Object.keys(attributes).map(function (key) {
        return attributes[key].id +'.'+ attributes[key].data.field + ' as ' + key;
      }).join(',');
      query += ' from ' + queryObjs.type.table + ' ' + queryObjs.id + '\n';
      query += joins.join('\n');
      console.log(query);
    });
  }

  function buildRelationshipsJoins(queryObj, joins) {
    if (queryObj.type.relationships === undefined) { return; }

    queryObj.type.relationships.forEach(function (rel) {
      var relQueryObjs = getQueryObjs(rel.type);

      relQueryObjs.forEach(function (qObj) {
        if (rel.single === true) {
          joins.push('left join ' + rel.type.table + ' ' + qObj.id + ' on ' + qObj.id+'.id = ' + queryObj.id+'.'+rel.field);
        } else if (rel.manyToMany === true) {
          // var parentQueryObj = getQueryObjs(rel.parent.type).filter(function (a) { return a.resource === rel.parent.resource; });
          joins.push('left join ' + rel.table + ' r_'+qObj.id + ' on ' + ' r_'+qObj.id+'.'+rel.field + ' = ' + queryObj.id+'.id');
          joins.push('left join ' + rel.type.table + ' ' + qObj.id + ' on ' + qObj.id+'.id = r_' + qObj.id+'.'+rel.relationshipField);
        }

        buildRelationshipsJoins(qObj, joins);
      });
    });
  }

  function getQueryObjs(type) {
    return typeQueryObjects.filter(function (item) {
      return item.type === type;
    });
  }



  function buildTypeQueryObjs(resource, parent) {
    var queryObj = createQueryObj(resource, parent);

    if (resource.relationships) {
      Object.keys(resource.relationships).forEach(function (key) {
        buildTypeQueryObjs(resource.relationships[key], queryObj);
      });
    }

    return queryObj;
  }

  function createQueryObj(resource, parent) {
    var id = nextId();
    buildAttributes(resource.type.attributes, id);

    var obj = {
      id: id,
      type: resource.type,
      resource: resource,
      parent: parent
    };

    typeQueryObjects.push(obj);
  }

  function buildAttributes(attrs, id) {
    Object.keys(attrs).forEach(function (key) {
      if (attrs[key].extends !== undefined) {
        // buildAttributes(attrs[key].extends.attributes, 'e_'+id);
      } else {
        attributes[id + attrs[key].field] = {
          id: id,
          data: attrs[key]
        };
      }
    });
  }




  function findParentTypes() {
    types.sort(function (a) {
      return a.parents === undefined;
    }).forEach(function (type) {
      walkUp(type);
    });

    function walkUp(type) {
      var validParent = false;

      if (type.parents !== undefined) {
        type.parents.forEach(function (parent) {
          if (types.indexOf(parent) > -1) {
            validParent = true;
            walkUp(parent);
          }
        });

        if (validParent === false) {
          parentTypes.push(type);
        }
      } else if (types.indexOf(type) > -1 && parentTypes.indexOf(type) === -1) {
        parentTypes.push(type);
      }
    }
  }





  function getTypes(resource) {
    if (types.indexOf(resource.type) === -1) {
      types.push(resource.type);
    }

    if (resource.relationships) {
      Object.keys(resource.relationships).forEach(function (key) {
        getTypes(resource.relationships[key]);
      });
    }
  }




  //
  // function init() {
  //   var extendTypes = [];
  //   var types = data.types.map(function (name) {
  //     var type = typeManager.get(name);
  //     if (type.extends && data.types.indexOf(type.extends.name) === -1) {
  //       extendTypes.push(type.extends.name);
  //     }
  //     return type;
  //   });
  //
  //   if (extendTypes.length) { data.types = data.types.concat(extendTypes); }
  //
  //   var relationships = typeManager.getRelationships(data.types);
  //   var parentType = types.filter(function (item) {
  //     return hasParentRelationship(item.name, relationships) === false;
  //   })[0];
  //
  //
  //   // TODO assign unique table names
  //   // TODO figure out sorting for joins
  //
  //   buildQueries(parentType, types);
  // }
  //
  //
  //
  // function buildQueries(parent, types) {
  //   var query;
  //   var joins = [];
  //   var attributes = {};
  //
  //   addAttributes(parent, attributes);
  //   buildRelationshipsQuery(parent.relationships, joins, attributes);
  //
  //   query = 'select ';
  //   query += Object.keys(attributes).map(function (key) {
  //     return attributes[key].table +'.'+ attributes[key].field + ' as ' + attributes[key].alias
  //   }).join(',');
  //   query += ' from ' + parent.table + '\n';
  //   query += joins.join('\n');
  //   console.log(query);
  // }
  //
  // function buildRelationshipsQuery(relationships, joins, attrs) {
  //   if (relationships === undefined) { return; }
  //
  //   relationships.forEach(function (rel) {
  //     if (data.types.indexOf(rel.type) === -1) { return; }
  //
  //     var type = typeManager.get(rel.type);
  //     var parentType = typeManager.get(rel.parentType);
  //
  //     if (rel.single === true) {
  //       joins.push('left join ' + type.table + ' on ' + type.table+'.id = ' + parentType.table+'.'+rel.field);
  //     } else if (rel.manyToMany === true) {
  //       joins.push('left join ' + rel.table + ' on ' + rel.table+'.'+rel.field + ' = ' + parentType.table+'.id');
  //       joins.push('left join ' + type.table + ' on ' + type.table+'.id = ' + rel.table+'.'+rel.relationshipField);
  //     }
  //
  //     addAttributes(type, attrs);
  //     buildRelationshipsQuery(type.relationships, joins, attrs);
  //   });
  // }
  //
  // function addAttributes(type, obj) {
  //   Object.keys(type.attributes).forEach(function (key) {
  //     if (!type.attributes[key].alias) { return; }
  //     obj[type.attributes[key].alias] = type.attributes[key];
  //   });
  // }
  //
  //
  //
  // function hasParentRelationship(type, relationships) {
  //   var i = 0;
  //   var length = relationships.length;
  //
  //   while (i < length) {
  //     if (relationships[i].type === type) { return true; }
  //     i += 1;
  //   }
  //
  //   return false;
  // }


  function nextId() {
    return 't_' + idCounter++;
  }

}
