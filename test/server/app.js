var http = require('http');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var dataManager = require('../../index.js');

var app = express();
var port = 4000;
var ipaddress = '0.0.0.0';





dataManager.addDatabase({
  host: '127.0.0.1',
  user: 'root',
  database: 'jsonapiTest',
  connectionLimit: 10,
  default: true
});


var server = http.createServer(app);
server.listen(port, ipaddress, function (){
  console.log('Server Listening on port: 4000');
});


var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, jam-handshake, jam-version, jam-get-structure, jam-test');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.send(200);
    }
    else {
      next();
    }
};

app.use(logger('dev'));
app.use(allowCrossDomain);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));




dataManager.defineType({
  name: 'menus',
  table: 'menus',

  attributes: {
    name: {dataType: dataManager.dataType.STRING},
    type: {dataType: dataManager.dataType.STRING},
    description: {dataType: dataManager.dataType.STRING}
  }
});


dataManager.defineType({
  name: 'categories',
  table: 'categories',

  attributes: {
    name: {dataType: dataManager.dataType.STRING},
    type: {dataType: dataManager.dataType.STRING},
    description: {dataType: dataManager.dataType.STRING}
  },

  relationships: [
    {
      type: 'taxGroups',
      manyToMany: true,
      table: 'categories_tax_groups',
      field: 'category_id',
      relationshipField: 'tax_group_id'
    }
  ]
});

dataManager.defineType({
  name: 'taxGroups',
  table: 'tax_groups',

  attributes: {
    name: {dataType: dataManager.dataType.STRING}
  }
});



dataManager.defineType({
  name: 'menuItems',
  table: 'menu_items',
  extends: 'items',

  attributes: {
    name: {dataType: dataManager.dataType.STRING},
    price: {dataType: dataManager.dataType.NUMBER},
    baseItem: {extends: true}
  },

  relationships: [
    {
      type: 'menus',
      field: 'menu_id',
      single: true
    },
    {
      type: 'categories',
      field: 'category_id',
      single: true
    },
    {
      type: 'items',
      field: 'item_id',
      single: true
    }
  ]
});

dataManager.defineType({
  name: 'items',
  table: 'items',

  attributes: {
    name: {dataType: dataManager.dataType.STRING},
    price: {dataType: dataManager.dataType.NUMBER},
    description: {dataType: dataManager.dataType.STRING},
  }
});




app.use('/menuItems', dataManager.CreateResource({
  name: 'menuItems',
  type: 'menuItems'
}));

app.use('/categories', dataManager.CreateResource({
  name: 'categories',
  type: 'categories',
  relationships: {
    menuItems: {
      resource: 'menuItems'
    },
    taxGroups: {
      resource: 'taxGroups'
    }
  }
}));


app.use('/taxGroups', dataManager.CreateResource({
  name: 'taxGroups',
  type: 'taxGroups'
}));



app.use('/menus', dataManager.CreateResource({
  name: 'menus',
  type: 'menus',
  relationships: {
    categories: {
      resource: 'categories'
    }
  }
}));
