var util = require('./util.js');
var database = require('./database.js');
var idCounter = 0;
var cache = {};


module.exports = function (structure, id, include, callback) {
  id = id || '';
  include = include || '';
  var queryObject;
  var hash = util.hashString(structure.name+include+id);
  if (cache[hash] !== undefined) {
    queryObject = cache[hash];
  } else {
    queryObject = CreateQueryObject(structure, id);
    cache[hash] = queryObject;
  }


  database.query(queryObject.query, function (error, data) {
    if (error) {
      // callback(error);
      return;
    }

    // build rows using query items
    // buildData(data, queryObject.queryItems);
  });
};


function buildData(data, structure, queryItems) {
  var obj = {
    data: [],
    included: []
  };
  var row = data.pop();
  while (row !== undefined) {
    addRowData(row, structure, queryItems, obj);
    return;
    row = data.pop();
  }
}

function addRowData(row, structure, queryItems, obj) {
  console.log(structure);
  console.log(queryItems);
}



// ----- Query object Builder ----------------


function CreateQueryObject(structure, id) {
  var parentTable;
  var attributes = {};
  var joins = [];
  var queryItems = getQueryItems(structure);
  var types = getTypes(structure);
  // no parent might be found because of 2 manyToMany types referencing each other
  // in this case chose the parent type based on the resource
  var parentType = getParentType(types) || structure.type;
  buildQueryItems(parentType, queryItems);
  return {
    query: buildQuery(),
    queryItems: queryItems
    attributes: attributes
  };


  function buildQuery() {
    var str = 'select ';
    str += Object.keys(attributes).reduce(function (a, key) {
      var obj = attributes[key];
      return a + ',' + obj.itemId+obj.table+'.'+obj.attr.field+' as '+key;
    }, '').slice(1);
    str += '\nfrom ' + parentTable.table + ' ' + parentTable.alias + '\n';
    str += joins.join('\n');

    return str;
  }


  function buildQueryItems(parent, items) {
    var remainingItems = items.filter(function (item) {
      return item.resource.type !== parent;
    });
    var parentItem = items.filter(function (item) {
      return item.resource.type === parent;
    })[0];

    parentTable = {
      id: parentItem.id,
      table: parentItem.resource.type.table,
      alias: parentItem.id + parentItem.resource.type.table
    };
    addAttributes(parentItem.resource.type, parentItem.id);
    buildRelationships(parentItem, remainingItems);
  }

  function buildRelationships(parent, items) {
    var keys = Object.keys(parent.resource.type.relationships);
    if (!keys.length) { return; }

    keys.forEach(function (key) {
      var rel = parent.resource.type.relationships[key];
      if (types.indexOf(rel.type) === -1) { return; }
      var remainingItems = items.filter(function (item) {
        return item.resource.type !== rel.type;
      });
      var matchingItems = items.filter(function (item) {
        return item.resource.type === rel.type;
      });


      matchingItems.forEach(function (item) {
        addAttributes(rel.type, item.id);
        if (rel.manyToMany === true) { addManyToMany(parent, item, rel); }
        else if (rel.oneToMany === true) { addOneToMany(parent, item, rel); }
        else { addSingle(parent, item, rel); }
        buildRelationships(item, remainingItems);
      });
    });
  }



  function addAttributes(type, itemId) {
    var id = nextId();
    type.attributes.forEach(function (attr) {
      attributes[id+attr.name] = {
        itemId: itemId,
        table: type.table,
        attr: attr
      };
    });
  }

  function getQueryItems(structure, parent, arr) {
    arr = arr || []
    var relationshipKeys = structure.relationships ? Object.keys(structure.relationships) : [];
    var obj = {
      id: nextId(),
      resource: structure,
      parent: parent
    };
    arr.push(obj);

    // hookup relationships
    if (parent) {
      if (parent.relationships === undefined) { parent.relationships = {}; }
      parent.relationships[obj.id] = obj;
    }

    if (relationshipKeys.length) {
      relationshipKeys.forEach(function (key) {
        getQueryItems(structure.relationships[key], obj, arr);
      });
    }
    return arr;
  }


  function addManyToMany(parent, child, rel) {
    var parentTableAlias = parent.id + parent.resource.type.table;
    var childTableAlias = child.id + child.resource.type.table;
    var relTableAlias = child.id + rel.table;

    joins.push('left join ' + rel.table + ' '+ relTableAlias + ' on ' + relTableAlias+'.'+rel.field + ' = ' + parentTableAlias+'.'+child.resource.type.idField);
    joins.push('left join ' + rel.type.table + ' ' + childTableAlias + ' on ' + childTableAlias+'.'+rel.type.idField+ ' = ' + relTableAlias+'.'+rel.relationField);
  }

  function addOneToMany(parent, child, rel) {
    var parentTableAlias = parent.id + parent.resource.type.table;
    var childTableAlias = child.id + child.resource.type.table;
    var relTableAlias = child.id + rel.table;

    // TODO check if this is corect
    joins.push('left join ' + rel.table + ' '+ relTableAlias + ' on ' + relTableAlias+'.'+rel.field + ' = ' + childTableAlias+'.'+reltype.idField);
  }

  function addSingle(parent, child, rel) {
    var parentTableAlias = parent.id + parent.resource.type.table;
    var childTableAlias = child.id + child.resource.type.table;
    var relTableAlias = child.id + rel.table;

    // TODO check if this is corect
    joins.push('left join ' + rel.table + ' '+ relTableAlias + ' on ' + relTableAlias+'.'+rel.type.idField + ' = ' + childTableAlias+'.'+rel.field);
  }
}








function CreateQueryObject_old(structure, id) {
  var types = getTypes(structure);
  // no parent might be found because of 2 manyToMany types referencing each other
  // in this case chose the parent type based on the resource
  var parentType = getParentType(types) || structure.type;
  var attributes = {};
  var joins = [];
  var queryStructure = {
    id: nextId(),
    type: parentType,
    parent: {}
  };
  addAttributes(parentType, queryStructure.id);
  buildRelationships(queryStructure);

  return {
    query: buildQuery(),
    structure: queryStructure
  };




  function buildQuery() {
    var str = 'select ';
    str += Object.keys(attributes).reduce(function (a, key) {
      var obj = attributes[key];
      return a + ',' + obj.id+obj.table+'.'+obj.attr.field+' as '+key;
    }, '').slice(1);
    str += '\nfrom ' + parentType.table + ' ' + queryStructure.id + parentType.table + '\n';
    str += joins.join('\n');

    return str;
  }


  function buildRelationships(structure) {
    var keys = Object.keys(structure.type.relationships);
    if (!keys.length) { return; }


    keys.forEach(function (key) {
      var rel = structure.type.relationships[key];
      if (types.indexOf(rel.type) === -1 || rel.type === structure.parent.type) { return; }
      var obj = {
        id: nextId(),
        type: rel.type,
        parent: structure
      };
      addAttributes(rel.type, obj.id);
      if (rel.manyToMany === true) { addManyToMany(structure, obj, rel); }
      else if (rel.oneToMany === true) { addOneToMany(structure.type, rel, obj.id); }
      else { addSingle(structure.type, rel, obj.id); }

      buildRelationships(obj);
      if (structure.relationships === undefined) { structure.relationships = []; }
      structure.relationships.push(obj);
    });
  }

  function addAttributes(type, id) {
    type.attributes.forEach(function (attr) {
      attributes[id+attr.name] = {
        id: id,
        table: type.table,
        attr: attr
      };
    });
  }

  function addManyToMany(parent, child, rel) {
    var parentTableAlias = parent.id + parent.type.table;
    var childTableAlias = child.id + child.type.table;
    var relTableAlias = child.id + rel.table;

    joins.push('left join ' + rel.table + ' '+ relTableAlias + ' on ' + relTableAlias+'.'+rel.field + ' = ' + parentTableAlias+'.'+child.type.idField);
    joins.push('left join ' + rel.type.table + ' ' + childTableAlias + ' on ' + childTableAlias+'.'+rel.type.idField+ ' = ' + relTableAlias+'.'+rel.relationField);
  }

  function addOneToMany(parent, child, rel) {
    var parentTableAlias = parent.id + parent.type.table;
    var childTableAlias = child.id + child.type.table;
    var relTableAlias = child.id + rel.table;

    // TODO check if this is corect
    joins.push('left join ' + rel.table + ' '+ relTableAlias + ' on ' + relTableAlias+'.'+rel.field + ' = ' + childTableAlias+'.'+type.idField);
  }

  function addSingle(parent, child, rel) {
    var parentTableAlias = parent.id + parent.type.table;
    var childTableAlias = child.id + child.type.table;
    var relTableAlias = child.id + rel.table;

    // TODO check if this is corect
    joins.push('left join ' + rel.table + ' '+ relTableAlias + ' on ' + relTableAlias+'.'+rel.type.idField + ' = ' + childTableAlias+'.'+rel.field);
  }
}









function getParentType(types) {
  if (types.length === 1) { return types[0]; }
  var keys;
  var key
  var type;
  var i = 0;
  var length = types.length;
  var topLevel = true;

  while (i < length) {
    type = types[i];
    if (type.parents === undefined) { continue; }

    keys = Object.keys(type.parents);
    key = keys.pop();
    while (key !== undefined) {
      if (types.indexOf(type.parents[key]) > -1) {
        topLevel = false;
      }
      key = keys.pop();
    }

    if (topLevel === true) { return type; }

    i += 1;
  }

  return undefined;
}


function getTypes(resource, arr) {
  arr = arr || [];
  if (arr.indexOf(resource.type) === -1) {
    arr.push(resource.type);
  }

  if (resource.relationships) {
    Object.keys(resource.relationships).forEach(function (key) {
      getTypes(resource.relationships[key], arr);
    });
  }

  return arr;
}


function nextId() {
  return 'id_' + idCounter++ +'_';
}
