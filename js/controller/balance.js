/* global myApp */

myApp.controller("BalanceCtrl", [ '$scope', '$rootScope', '$location', '$http', 'XrpApi', 'Gateways', 'SettingFactory',
  function($scope, $rootScope, $location, $http, XrpApi, Gateways, SettingFactory) {
    $scope.working = false;
    $scope.refresh = function() {
      if ($scope.working) { return; }
      $scope.working = true;
      XrpApi.queryAccount(function(err){
        $scope.$apply(function(){
          $scope.working = false;
          $scope.removeState = {};
        });
        console.log($rootScope.lines);
      });
    };
    $scope.refresh();
    
    $scope.delTrust = function(code, issuer) {
      $scope.setRemoving(code, issuer, true);
      XrpApi.changeTrust(code, issuer, "0").then(result => {
        console.log(code + '.' + issuer + " remove submitted.")
        $scope.setRemoving(code, issuer, false);
        //$scope.$apply();
      }).catch(err => {
        console.error(err);
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

    $scope.hasService = function(code, issuer) {
      return !!$rootScope.getGateway(code, issuer).deposit;
    }

    $scope.show_deposit = false;
    $scope.deposit_error = "";
    $scope.deposit_info = {};
    $scope.deposit_msgs = [];
    $scope.deposit_working = false;
    $scope.resolveDeposit = function(code, issuer) {
      $scope.show_deposit = true;
      $scope.deposit_error = "";
      $scope.deposit_info = {};
      $scope.deposit_msgs = [];

      let gateway = $rootScope.getGateway(code, issuer);
      let api = gateway.deposit;      
      let url = api + "?address=" + $rootScope.address + "&currency=" + code + "&network=ripple&lang=" + SettingFactory.getLang(); 
      console.debug('resolve ' + url);
      $scope.deposit_working = true;
      $http({
        method: 'GET',
        url: url
      }).then(res => {
        if (res.data.error) {
          $scope.deposit_error  = res.data.error_message || res.data.error;
        } else if (!validateDepositResponse(res.data)) {
          $scope.deposit_error = "Can not parse result.";
        } else {
          $scope.deposit_info = res.data;
          $scope.deposit_msgs = res.data.extra_info;
          $scope.deposit_info.logo = res.data.logo || gateway.logo;
        }
        console.log(res);      
      }).catch(err => {
        $scope.deposit_error = err.error_message || err.error || err.message || 'NetworkError';
        console.error(err);
      }).finally(() => {
        $scope.deposit_working = false;
      });
    }

    function validateDepositResponse(data) {
      if (typeof data !== "object") {
        return false;
      }
      if (!data.extra_info && typeof data.extra_info !== "array") {
        return false;
      }
      if (!data.address) {
        return false;
      }
      return true;
    }

    $scope.goTrade = function(code, issuer) {
      console.log(code, issuer);
      let tradepair = SettingFactory.getTradepair();
      SettingFactory.setTradepair(code, issuer, tradepair.counter_code, tradepair.counter_issuer);
      $location.path('/trade');
    }

    $scope.goSend = function(code, issuer){
      let gateway = $rootScope.getGateway(code, issuer);
      $location.path('/send').search({ address: gateway.withdraw });
    }
    
    $scope.$on("balanceChange", function() {
      console.debug('balanceChange event got');
    });

  } ]);
