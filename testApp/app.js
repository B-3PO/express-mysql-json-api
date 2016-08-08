angular
  .module('testApp', [
    'ngRoute',
    'ngAnimate',
    'ngMaterial',
    'jsonapi-manager'
  ])
  .config(configApp);


configApp.$inject = ['$routeProvider'];
function configApp($routeProvider) {
  $routeProvider
    .when('/', {
      templateUrl: 'partials/home.html',
      controller: 'HomeController',
      controllerAs: 'vm'
    })
    .otherwise({
      redirectTo: '/'
    });
}
