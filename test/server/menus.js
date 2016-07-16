var mysql = require('mysql');
var patcher = require('./patcher.js');
var connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'tester',
  password: 'testTester',
  database: 'datamanager'
});

var attrsByType = {
  menus: {
    menusid: 'id',
    menusname: 'name',
    menustype: 'type'
  },

  categories: {
    categoriesid: 'id',
    categoriesname: 'name',
    categoriestype: 'type'
  },

  menu_items: {
    menu_itemsid: 'id',
    menu_itemsname: 'name',
    menu_itemsprice: 'price',
    menu_itemsdescription: 'description'
  }
};

var menuQuery = 'select ' + getAttrs() + ' from menus\n';
menuQuery += 'left join categories on categories.menu_id = menus.id\n';
menuQuery += 'left join menu_items on menu_items.categories_id = categories.id\n';
menuQuery += 'where menus.id = \'1\'';


var patch = {
  id: 1,
  name: 'new name',
};
var insertQuery = 'INSERT INTO patches (resource_id, operation, patch)\n';
insertQuery += 'VALUES (\'1\', \'replace\', \'' + JSON.stringify(patch) + '\')'



function getMenu() {
  connection.query(menuQuery, function(error, rows, fields) {
    buildByTypMenu(rows);
  });
}


function getAttrs() {
  return Object.keys(attrsByType).reduce(function (arr, typeKey) {
    return arr.concat(Object.keys(attrsByType[typeKey]).map(function (alias) {
      return typeKey + '.' + attrsByType[typeKey][alias] + ' as ' + alias;
    }));
  }, []).join(',');
}




function buildByTypMenu(rows) {
  var byTypes = {
    menus: {},
    categories: {},
    menu_items: {}
  };
  var row = rows.pop();


  while (row !== undefined) {
    addRowByType(row, byTypes);
    row = rows.pop();
  }

  var idsByType = {
    menus: Object.keys(byTypes.menus),
    categories: Object.keys(byTypes.categories),
    menu_items: Object.keys(byTypes.menu_items)
  }
  patcher.getPatches(idsByType, function(patchesByType) {
    patcher.applyPatches(byTypes, patchesByType);

  });
}

function addRowByType(row, byTypes) {
  var rowByType = {};
  Object.keys(row).forEach(function (alias) {
    var attInfo = findTypeAndName(alias);
    if (rowByType[attInfo.type] === undefined) { rowByType[attInfo.type] = {}; }
    if (attInfo.name === 'id') { row[alias] = row[alias].toString(); }
    rowByType[attInfo.type][attInfo.name] = row[alias];
  });


  if (byTypes.menus[rowByType.menus.id] === undefined) {
    rowByType.menus.categories = [];
    byTypes.menus[rowByType.menus.id] = rowByType.menus;
  }

  if (byTypes.categories[rowByType.categories.id] === undefined) {
    rowByType.categories.items = [];
    byTypes.categories[rowByType.categories.id] = rowByType.categories;
    byTypes.menus[rowByType.menus.id].categories.push(rowByType.categories);
  }

  if (byTypes.menu_items[rowByType.menu_items.id] === undefined) {
    byTypes.menu_items[rowByType.menu_items.id] = rowByType.menu_items;
    byTypes.categories[rowByType.categories.id].items.push(rowByType.menu_items);
  }
}



function convertObjToArr(menus) {
  return Object.keys(menus).map(function (menusKey) {
    menus[menusKey].categories = Object.keys(menus[menusKey].categories).map(function (categoriesKey) {
      menus[menusKey].categories[categoriesKey].items = Object.keys(menus[menusKey].categories[categoriesKey].items).map(function (itemsKey) {
        return menus[menusKey].categories[categoriesKey].items[itemsKey];
      });
      return menus[menusKey].categories[categoriesKey];
    });
    return menus[menusKey];
  });
}

function findTypeAndName(key) {
  var attrKeys;
  var attrKey;
  var typeKeys = Object.keys(attrsByType);
  var typeKey = typeKeys.pop();

  while (typeKey !== undefined) {
    attrKeys = Object.keys(attrsByType[typeKey]);
    attrKey = attrKeys.pop();

    while (attrKey !== undefined) {
      if (attrKey === key) {
        return {
          type: typeKey,
          name: attrsByType[typeKey][attrKey]
        };
      }
      attrKey = attrKeys.pop();
    }
    typeKey = typeKeys.pop();
  }
}


module.exports = function () {
  getMenu();
};
