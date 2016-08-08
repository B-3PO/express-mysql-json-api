angular
  .module('testApp')
  .controller('HomeController', HomeController);




HomeController.$inject = ['$scope', 'jam'];
function HomeController($scope, jam) {
  var jsonapiSchema = {
    type: 'parents',
    relationships: {
      children: {
        meta: {
          toMany: true
        },
        type: 'childs'
      },
      // cousins: {
      //   meta: {
      //     toMany: true
      //   },
      //   type: 'cousins'
      // }
    }
  };

  var manager = jam.Create({
    schema: jsonapiSchema,
    url: 'parents'
  });

  manager.bind($scope, 'data');
  manager.get(function (error) {
    console.log($scope.data)
  })
}
