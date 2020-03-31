/* global myApp */

myApp.controller("BalanceCtrl", [ '$scope', '$rootScope', 'XrpApi', 'Gateways', 
  function($scope, $rootScope, XrpApi, Gateways) {
    $scope.working = false;
    $scope.refresh = function() {
      if ($scope.working) { return; }
      $scope.working = true;
      XrpApi.queryAccount(function(err){
        $scope.$apply(function(){
          $scope.working = false;
        });
        console.log($rootScope.lines);
      });
    };
    $scope.delTrust = function(code, issuer) {
      $scope.setRemoving(code, issuer, true);
      StellarApi.changeTrust(code, issuer, "0", function(err, data){
        if (err) {
          console.error(StellarApi.getErrMsg(err));
        }
        $scope.setRemoving(code, issuer, false);
        $scope.$apply();
      });
    };

    $scope.removeState = {};
    $scope.setRemoving = function(code, issuer, state) {
      if (!$scope.removeState[code]) {
        $scope.removeState[code] = {};
      }
      $scope.removeState[code][issuer] = state;
    };
    $scope.isRemoving = function(code, issuer) {
      if ($scope.removeState[code] && $scope.removeState[code][issuer]) {
        return $scope.removeState[code][issuer];
      } else {
        return false;
      }
    }
    
    $scope.getGateway = function(code, issuer) {
      return Gateways.getGateway(code, issuer);
    }

    $scope.$on("balanceChange", function() {
      console.debug('balanceChange event got');
    });

  } ]);
