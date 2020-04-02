/* global myApp, StellarSdk */

myApp.controller("TrustCtrl", [ '$scope', '$rootScope', 'XrpApi', 'Gateways', 'Federation',
  function($scope, $rootScope, XrpApi, Gateways, Federation) {
  
    $scope.gatewaylist = Gateways.gateways;
    console.log($scope.gatewaylist);
    
    $scope.manual_code;
    $scope.manual_issuer;
    $scope.manual_logo = Gateways.getGateway('', $scope.manual_issuer).logo;
    $scope.manual_name;
    $scope.fed_url;
    $scope.fed_currencies = [];
    $scope.fed_error;
    $scope.fed_loading;

    $scope.show_all = false;
    $scope.showHide = function() {
      $scope.show_all = !$scope.show_all;
    }

    $scope.resolve = function() {
      var snapshot = $scope.fed_url;
      $scope.fed_error = false;
      $scope.fed_loading = true;
      Federation.get($scope.fed_url).then(txt => {
        console.log('resolve', txt);
        $scope.fed_error = false;
        $scope.fed_loading = false;
        $scope.fed_currencies = (txt.currencies || []).map(code => {
          return {code: code, issuer: txt.accounts[0]};
        });
      }).catch(err => {
        if (snapshot !== $scope.fed_url) {
          return;
        }
        $scope.fed_currencies = [];
        $scope.fed_error = true;
        $scope.fed_loading = false;
        console.log(snapshot, err);
      });
    }
    $scope.issuerChange = function() {
      var gateway = Gateways.getGateway('', $scope.manual_issuer);
      $scope.manual_logo = gateway.logo;
      $scope.manual_name = gateway.name;
    }
    $scope.hasLine = function(code, issuer) {
      if (!$rootScope.lines[code] || !$rootScope.lines[code][issuer]) {
        return false;
      }
      return $rootScope.lines[code][issuer].limit > 0;
    };
    $scope.changeState = {};
    $scope.setChanging = function(code, issuer, state) {
      if (!$scope.changeState[code]) {
        $scope.changeState[code] = {};
      }
      $scope.changeState[code][issuer] = state;
    };
    $scope.isChanging = function(code, issuer) {
      if ($scope.changeState[code] && $scope.changeState[code][issuer]) {
        return $scope.changeState[code][issuer];
      } else {
        return false;
      }
    }
    $scope.addTrust = function(code, issuer, amount) {
      amount = amount || "100000000000";
      $scope.trust_error = "";
      $scope.trust_done = false;

      $scope.setChanging(code, issuer, true);
      XrpApi.changeTrust(code, issuer, amount).then(result => {
        $scope.setChanging(code, issuer, false);
        $scope.trust_done = true;
        $rootScope.$apply();
      }).catch(err => {
        $scope.trust_error = err.message;
        $rootScope.$apply();
      });
    };
    
    $scope.delTrust = function(code, issuer) {
      code = code || $scope.manual_code;
      issuer = issuer || $scope.manual_issuer;
      $scope.setChanging(code, issuer, true);
      $scope.trust_error = "";
      $scope.trust_done = false;
      XrpApi.changeTrust(code, issuer, "0").then(result => {
        $scope.setChanging(code, issuer, false);
        $scope.trust_done = true;
      }).catch(err=>{
        $scope.trust_error = err;
      });
    };
    
    $scope.getGateway = function(code, issuer) {
      return Gateways.getGateway(code, issuer);
    }
  } ]);
