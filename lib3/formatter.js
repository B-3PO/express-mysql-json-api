module.exports = function (data, structure) {
  var formatted = {
    data: [],
    included: {}
  };

  if (data instanceof Array) {
    data.forEach(function (sub) {
      traverse(sub, structure.resource, formatted, true);
    });
  } else {
    traverse(data, structure.resource, formatted, true);
  }

  formatted.data = Object.keys(formatted.data).map(function (key) {
    return formatted.data[key];
  });

  formatted.included = Object.keys(formatted.included).reduce(function (a, typeKey) {
    return a = [].concat(Object.keys(formatted.included[typeKey]).map(function (idKey) {
      return formatted.included[typeKey][idKey];
    }));
  }, []);

  return formatted;
};



function traverse(data, resource, formatted, root) {
  if (!isNonEmptyObject(data)) { return; }

  var item = {
    id: data[resource.type.idField],
    type: resource.type.name,
    attributes: {},
  };

  if (root) {
    if (formatted.data[item.id]) {
      item = formatted.data[item.id];
    } else {
      formatted.data[item.id] = item;
    }
  } else {
    formatted.included[item.type] = formatted.included[item.type] || {};
    if (formatted.included[item.type][item.id]) { return; }
    formatted.included[item.type][item.id] = item;
  }

  resource.type.attributes.forEach(function (attrDesciption) {
    if (data.hasOwnProperty(attrDesciption.name)) {
      item.attributes[attrDesciption.name] = data[attrDesciption.name];
    }
  });

  if (resource.relationships && Object.keys(resource.relationships).length) {
    item.relationships = item.relationships || {};
    Object.keys(resource.relationships).forEach(function (key) {
      var toMany;
      var id;
      resource.type.relationshipsReference.every(function (relItem) {
        if (relItem.type === resource.relationships[key].name) {
          toMany = relItem.manyToMany;
          return false;
        }
        return true;
      });

      item.relationships[key] = item.relationships[key] || {
        meta: {
          toMany: toMany,
          type: resource.relationships[key].type.name
        },
        data: toMany ? [] : null
      };

      if (data.hasOwnProperty(key)) {
        if (toMany) {
          id = data[key][resource.relationships[key].type.idField];
          if (id) {
            item.relationships[key].data.push({
              id: id,
              type: resource.relationships[key].type.name
            });
            traverse(data[key], resource.relationships[key], formatted);
          }
        } else if (isNonEmptyObject(data[key])) {
          item.relationships[key].data = {};
          item.relationships[key].data.id = data[key][resource.relationships[key].type.idField];
          item.relationships[key].data.type = resource.relationships[key].type.name;
          traverse(data[key], resource.relationships[key], formatted);
        }
      }
    });
  }
}



function isNonEmptyObject(obj) {
  return typeof obj === 'object' && obj !== null && Object.keys(obj).length > 0;
}
