/* global myApp */

myApp.controller("SecurityCtrl", ['$scope', '$rootScope', 'AuthenticationFactory',
  function($scope, $rootScope, AuthenticationFactory) {
    $scope.mode = 'security';
    $scope.isMode = function(mode) {
      return $scope.mode === mode;
    }
    $scope.setMode = function(mode) {
      return $scope.mode = mode;
    }

    $scope.keyAmount = AuthenticationFactory.secretAmount;
    $scope.key = `${new Array(56).join("*")}`;

    $scope.showSec = function(flag) {
      $scope.showSecret = flag;
      $scope.keyOpen = AuthenticationFactory.secrets[0];  
      $scope.keyQRCode = $scope.keyOpen;
    };

    $scope.domain = '';
    $scope.domain_working = false;
    $scope.domain_error = '';
    $scope.domain_done = false;
    $scope.setDomain = function() {
      $scope.domain_error = '';
      $scope.domain_done = false;
      $scope.domain_working = true;
      StellarApi.setOption('homeDomain', $scope.domain, function(err, hash){
        $scope.domain_working = false;
        if (err) {
          $scope.domain_error = StellarApi.getErrMsg(err);
        } else {
          $scope.domain_done = true;
        }
        $scope.$apply();
      });
    };

  }
]);
