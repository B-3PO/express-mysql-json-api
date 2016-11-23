angular
  .module('testApp')
  .controller('HomeController', HomeController);



  HomeController.$inject = ['$scope', 'jam'];
  function HomeController($scope, jam) {
    var jsonapiSchema = {
      type: 'locations',
      relationships: {
        menus: {
          meta: {
            toMany: true
          },
          type: 'menus',
          relationships: {
            items: {
              meta: {
                toMany: true
              },
              type: 'items'
            }
          }
        }
      }
    };

    var manager = jam.Create({
      schema: jsonapiSchema,
      url: 'locations'
    });

    manager.bind($scope, 'data');
    manager.get(function (error) {
      console.log($scope.data)
    });
  }




// server.js
// HomeController.$inject = ['$scope', 'jam'];
// function HomeController($scope, jam) {
//   var jsonapiSchema = {
//     type: 'parents',
//     relationships: {
//       children: {
//         meta: {
//           toMany: true
//         },
//         type: 'childs'
//       },
//       // cousins: {
//       //   meta: {
//       //     toMany: true
//       //   },
//       //   type: 'cousins'
//       // }
//     }
//   };
//
//   var manager = jam.Create({
//     schema: jsonapiSchema,
//     url: 'parents'
//   });
//
//   manager.bind($scope, 'data');
//   manager.get(function (error) {
//     console.log($scope.data)
//   })
// }
