/* global myApp, round */

myApp.controller("HeaderCtrl", ['$scope', '$rootScope', '$location', 'AuthenticationFactory', 'SettingFactory', 'XrpApi', 'ServerManager', 
  function($scope, $rootScope, $location, AuthenticationFactory, SettingFactory, XrpApi, SM) {

    $rootScope.online = SM.online;
    $scope.$on("networkChange", function() {
      $rootScope.online = SM.online;
    });
  
    $scope.isActive = function(route) {
      return route === $location.path();
    }

    $scope.logout = function () {
      XrpApi.logout();
      AuthenticationFactory.logout();
      $rootScope.reset();
      $location.path("/login");
    }
  }
]);

myApp.controller("FooterCtrl", [ '$scope', '$rootScope', '$translate', 'SettingFactory', '$http',
  function($scope, $rootScope, $translate, SettingFactory, $http) {
    $scope.changeLanguage = function (key) {
      $translate.use(key);
      SettingFactory.setLang(key);
    };

    $scope.version = appinfo.version;
    $scope.new_version = "";
    $scope.diff = false;
    
    $http({
      method: 'GET',
      url: "https://raw.githubusercontent.com/ripplefox/ripplewallet/master/version.json"
    }).then(function(res) {
      console.log(res.data);
      $scope.new_version = res.data.version;
      $scope.diff = $scope.version != $scope.new_version && $scope.version != res.data.beta;
      if ($scope.diff) $rootScope.updateMessage = res.data.message[$translate.use()];
    }).catch(err => {
      console.log('ignore version check', err);
    });
  }]);

myApp.controller("HomeCtrl", ['$scope', '$rootScope',
  function($scope, $rootScope) {
  
    if ($rootScope.runOnce) return;
    
    $scope.stopCountdown = function() {
      clearInterval(timer);
      $scope.stop = true;
    }
    
    $scope.countdown = 6;
    var timer = setInterval(function() {
      $scope.$apply(function() {
        $scope.countdown = $scope.countdown - 1;
        if ($scope.countdown <= 0) {
          $rootScope.goTo('balance');
        }
      });
    }, 1000);
  
    $scope.$on("$destroy", function() {
      console.log("$destroy");
      $rootScope.runOnce = true;
      clearInterval(timer);
    });

  }]);

