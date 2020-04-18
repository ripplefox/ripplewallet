/* global myApp */

myApp.controller("SecurityCtrl", ['$scope', '$rootScope', 'AuthenticationFactory', '$translate', 'Id',
  function($scope, $rootScope, AuthenticationFactory, $translate, Id) {
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
      
      $scope.mnemonic = AuthenticationFactory.mnemonic;
      $scope.lang = $translate.use();
      if (['cn', 'jp'].indexOf($scope.lang) >= 0) {
        $scope.mnemonic_lang = Id.getMnemonicLang($scope.mnemonic, $scope.lang);
      }
    };

    /*
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
    */
  }
]);
