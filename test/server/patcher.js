var mysql = require('mysql');
var connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'tester',
  password: 'testTester',
  database: 'datamanager'
});



function getPatches(idsByType, callback) {
  var query = 'select value,type from patches\n';
  query += 'where ' + getWheres(idsByType) + '\n';
  query += 'order by created_at'

  connection.query(query, function(error, rows, fields) {
    callback(groupByType(rows));
  });
}

function getWheres(idsByType) {
  return Object.keys(idsByType).map(function (typeKey) {
    return '(type=\'' + typeKey + '\' and resource_id in (' + idsByType[typeKey].join(',') + '))';
  }).join(' or ');
}


function groupByType(rows) {
  var byType = {};
  var row = rows.pop();

  while (row !== undefined) {
    if (byType[row.type] === undefined) {
      byType[row.type] = [];
    }

    byType[row.type] = byType[row.type].concat(JSON.parse(row.value));
    row = rows.pop();
  }
  return byType;
}





function applyPatches(value, patches) {
  Object.keys(patches).forEach(function (typeName) {
    patches[typeName].forEach(function (patch) {
      var item = value[typeName][patch.id];
      patchOps[patch.op](item, patch)
    });
  });
}

var patchOps = {
  replace: replace,
  add: add,
  remove: remove
};

function replace(value, patch) {
  value[patch.prop] = patch.value;
}


function add(value, patch) {

}

function remove(value, patch) {
  var i;
  var length;
  var item = value[patch.prop];

  if (item === undefined || item === null) { return; }
  if (item instanceof Array) {

    i = 0;
    length = item.length;
    while (i < length) {
      if (item[i].id === patch.value) {
        item.splice(i, 1);
        break;
      }
      i += 1;
    }

  } else if (item.id === patch.value) {
    delete value[patch.prop];
  }
}



module.exports = {
  getPatches: getPatches,
  applyPatches: applyPatches
};
