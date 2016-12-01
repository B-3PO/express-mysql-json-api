var http = require('http');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var dataManager = require('../index.js');

var app = express();
var port = 4000;
var ipaddress = '0.0.0.0';

dataManager.addDatabase({
  host: '127.0.0.1',
  user: 'root',
  database: 'bypass',
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
app.use(express.static(path.join(__dirname, '../testApp')));
app.use(express.static(path.join(__dirname, '../bower_components')));





// --- Types -------------------


dataManager.defineType({
  name: 'locations',
  table: 'locations',

  fields: {
    id: {dataType: dataManager.ID},
    uuid: {dataType: dataManager.UUID},
    name: {dataType: dataManager.STRING},
    description: {dataType: dataManager.STRING}
  },

  attributes: [
    'name',
    'description'
  ],

  relationships: [
    {
      type: 'menus',
      manyToMany: true,
      table: 'location_menus',
      field: 'location_id',
      relationField: 'menu_id'
    }
  ]
});


dataManager.defineType({
  name: 'menus',
  table: 'menus',

  fields: {
    id: {dataType: dataManager.ID},
    name: {dataType: dataManager.STRING}
  },

  attributes: [
    'name'
  ],

  relationships: [
    {
      type: 'items',
      manyToMany: true,
      table: 'menu_items',
      field: 'menu_id',
      relationField: 'item_id'
    }
  ]
});


dataManager.defineType({
  name: 'items',
  table: 'items',

  fields: {
    id: {dataType: dataManager.ID},
    name: {dataType: dataManager.STRING},
    base_price: {dataType: dataManager.NUMBER}
  },

  attributes: [
    'name',
    'base_price'
  ]
});







// --- Routes ----


app.use('/locations', dataManager.CreateResource({
  name: 'locations',
  type: 'locations',

  relationships: {
    menus: 'menus'
  },
  filters: [
    {
      field: 'venue_id',
      // equal: function (req) {
      //   return req.get('x-bypass-admin-venue');
      // },
      equal: '86'
    }
  ]
}));

app.use('/menus', dataManager.CreateResource({
  name: 'menus',
  type: 'menus',

  relationships: {
    items: 'items'
  },
  filters: [
    {
      field: 'venue_id',
      equal: '86'
    }
  ]
}));

app.use('/items', dataManager.CreateResource({
  name: 'items',
  type: 'items'
}));





// --- transformers ---

transformer.defineResource('menus', {
  table: 'menus',
  fields: {
    id: {dataType: transformer.ID},
    name: {dataTpe: transformer.STRING}
  },

  relationships: [
    {
      resouce: 'menu_items.menu_id',
      field: 'id'
    }
  ]
});


transformer.defineResource('menu_items', {
  table: 'menu_items',
  fields: {
    id: {dataType: transformer.ID},
    item_id: {dataType: transformer.INT},
    menu_id: {dataType: transformer.INT},
    name: {dataTpe: transformer.STRING},
    base_price: {dataType: transformer.NUMBER}
  },

  relationships: [
    {
      resource: 'items.id',
      field: 'item_id'
    }
  ]
});

transformer.defineResource('items', {
  table: 'items',
  fields: {
    id: {dataType: transformer.ID},
    name: {dataTpe: transformer.STRING},
    price: {dataType: transformer.NUMBER}
  }
});


var struct = transformer.defineStruct({
  id: 'menus.id',
  name: 'menus.name',

  menuItems: transformer.defineStruct({
    id: 'menu_items.id',
    name: 'items.name',
    price: {
      default: 'menu_items.base_price',
      override: 'items.price'
    }
  });
});



// var menuRouter = transformer.routes(struct);
// var menuItemsRouter = transformer.Routes(struct.menuItems);
// var itemsRouter = transformer.routes('itmes');
//
//
// app.use('/menus', menuRouter);
// app.use('/menu_items', menuItemsRouter);
// app.use('/items', itemsRouter);
