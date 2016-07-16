var http = require('http');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var dataManager = require('../../index.js');
// var resourcePatch = require('./resourcePatch.js');

var app = express();
var port = 4000;
var ipaddress = '0.0.0.0';

var menus = require('./menus.js');



// var connection = mysql.createConnection({
//   host: '127.0.0.1',
//   user: 'tester',
//   password: 'testTester',
//   database: 'newAdminExamles'
// });



dataManager.addDatabase({
  host: '127.0.0.1',
  user: 'root',
  database: 'datamanager',
  connectionLimit: 10,
  default: true
});


var server = http.createServer(app);
server.listen(port, ipaddress, function (){
  console.log('Server Listening on port: 4000');
});


var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH');
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



// menus();



dataManager.addType({
  name: 'locations',
  table: 'locations',
  attributes: {
    name: {dataType: dataManager.dataType.STRING},
    city: {dataType: dataManager.dataType.STRING},
    state: {dataType: dataManager.dataType.STRING}
  }
});


dataManager.addType({
  name: 'rooms',
  table: 'rooms',
  attributes: {
    name: {dataType: dataManager.dataType.STRING}
  }
});

dataManager.addType({
  name: 'people',
  table: 'people',
  attributes: {
    name: {
      dataType: 'string',
      build: [
        {field: 'first', dataType: dataManager.dataType.STRING},
        {join: ' '},
        {field: 'last', dataType: dataManager.dataType.STRING}
      ]
    },
    age: {dataType: dataManager.dataType.INT},
    email: {dataType: dataManager.dataType.STRING},
    working: {dataType: dataManager.dataType.BOOLEAN}
  }
});

dataManager.addType({
  name: 'tester',
  table: 'tester',
  attributes: {
    name: {dataType: dataManager.dataType.STRING}
  }
});


dataManager.addType({
  name: 'jobs',
  table: 'jobs',
  attributes: {
    title: {dataType: dataManager.dataType.STRING},
    pay: {dataType: dataManager.dataType.CURRENCY}
  }
});


var locationsManager = dataManager.CreateResource({
  name: 'locations',
  type: 'locations',
  relationships: {
    people: {
      resource: 'people',
      manyToMany: true
    },
    rooms: {
      resource: 'rooms',
      oneToMany: true,
      // constraint: true,
      field: 'locations_id'
    },
    tester: {
      resource: 'tester',
      manyToMany: true
    }
  }
});
app.use('/locations', locationsManager);



app.use('/rooms', dataManager.CreateResource({
  name: 'rooms',
  type: 'rooms'
}));

app.use('/people', dataManager.CreateResource({
  name: 'people',
  type: 'people',
  relationships: {
    job: {
      resource: 'job',
      field: 'job'
    },
    tester: {
      resource: 'tester',
      manyToMany: true
    }
  }
}));

app.use('/job', dataManager.CreateResource({
  name: 'job',
  type: 'jobs'
}));


var testerManager = dataManager.CreateResource({
  name: 'tester',
  type: 'tester'
});
app.use('/tester', testerManager);

testerManager.onCreate(function (req, res) {
  // console.log(req.body);
  //
  // var query = 'upda users.first,users.last,userscope.admin,userscope.organization_id,userscope.venue_id from users';
  // query += ' left join userscope on userscope.user_id = users.id';
  // query += ' where email=\'' + email + '\' and password=\'' + password + '\'';

  // connection.query(query, function(error, rows, fields) {
  //   if (error) {
  //     return;
  //   }
  // });


  res.end();
});
testerManager.onRelationUpdate(function (req, res) {
  res.end();
});


//
//
//
// dataManager.addType({
//   name: 'locations',
//   table: 'locations',
//   attributes: {
//     name: {dataType: dataManager.dataType.STRING},
//     city: {dataType: dataManager.dataType.STRING},
//     state: {dataType: dataManager.dataType.STRING}
//   },
//   relationships: [
//     {
//       type: 'people',
//       manyToMany: true
//     },
//     {
//       type: 'rooms',
//       oneToMany: true
//     }
//   ]
// });
//
//
// dataManager.addType({
//   name: 'rooms',
//   table: 'rooms',
//   constraint: true,
//   attributes: {
//     name: {dataType: dataManager.dataType.STRING}
//   }
// });
//
// dataManager.addType({
//   name: 'people',
//   table: 'people',
//   constraint: true,
//   attributes: {
//     name: {
//       dataType: 'string',
//       build: [
//         {field: 'first', dataType: dataManager.dataType.STRING},
//         {join: ' '},
//         {field: 'last', dataType: dataManager.dataType.STRING}
//       ]
//     },
//     age: {dataType: dataManager.dataType.INT},
//     email: {dataType: dataManager.dataType.STRING},
//     working: {dataType: dataManager.dataType.BOOLEAN}
//   },
//   relationships: [
//     {
//       type: 'jobs',
//       field: 'job',
//       single: true
//     }
//   ]
// });
//
// dataManager.addType({
//   name: 'jobs',
//   table: 'jobs',
//   attributes: {
//     title: {dataType: dataManager.dataType.STRING},
//     pay: {dataType: dataManager.dataType.CURRENCY}
//   }
// });
//
//
//
// app.use('/locations', dataManager.CreateResource({
//   name: 'locations',
//   type: 'locations',
//   relationships: {
//     people: {resource: 'people'},
//     rooms: {resource: 'rooms'}
//   }
// }));
//
// app.use('/rooms', dataManager.CreateResource({
//   name: 'rooms',
//   type: 'rooms'
// }));
//
// app.use('/people', dataManager.CreateResource({
//   name: 'people',
//   type: 'people',
//   relationships: {
//     job: {resource: 'job'}
//   }
// }));
//
// app.use('/job', dataManager.CreateResource({
//   name: 'job',
//   type: 'jobs'
// }));
