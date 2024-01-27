/* global myApp, StellarSdk */

myApp.controller("TrustCtrl", [ '$scope', '$rootScope', 'XrpApi', 'Gateways', 'Federation',
  function($scope, $rootScope, XrpApi, Gateways, Federation) {
    $scope.mode = 'community';
    $scope.gatewaylist = Gateways.gateways;
    console.log($scope.gatewaylist);
    
    $scope.manual_code;
    $scope.manual_issuer;
    $scope.manual_logo = Gateways.getGateway('', $scope.manual_issuer).logo;
    $scope.manual_name;
    
    $scope.fed_url;
    $scope.fed_currencies = [];
    $scope.fed_error = "";
    $scope.fed_loading;

    $scope.show_all = false;
    $scope.showHide = function() {
      $scope.show_all = !$scope.show_all;
    }

    $scope.resolve = function() {
      var snapshot = $scope.fed_url;
      $scope.fed_error = "";
      $scope.fed_currencies = [];
      $scope.fed_loading = true;
      Federation.get($scope.fed_url).then(txt => {
        console.log('resolve', txt);
        $scope.fed_loading = false;
        $scope.fed_currencies = (txt.currencies || []).map(line => {
          var arr = line.split(" ");
          var issuer = arr.length > 1 ? arr[1] : txt.accounts[0];
          return {code: arr[0], issuer: issuer};
        });
        if ($scope.fed_currencies.length == 0) {
          $scope.fed_error = "fed_unable";
        }
      }).catch(err => {
        if (snapshot !== $scope.fed_url) {
          return;
        }
        $scope.fed_currencies = [];
        $scope.fed_error = err.message;
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
      code = realCode(code);
      if (!$rootScope.lines[code] || !$rootScope.lines[code][issuer]) {
        return false;
      }
      return $rootScope.lines[code][issuer].limit > 0;
    };
    
    var changing = {};
    var errors = {};
    var states = {};
    
    function updateState(hash, state) {
      for (var keystr in states) {
        if (states[keystr].hash == hash) {
          return states[keystr].state = state;
        }
      }
    }
    
    $scope.isChanging = function(code, issuer) {
      return !!changing[key(code, issuer)];
    }
    $scope.getError = function(code, issuer) {
      return errors[key(code, issuer)] || "";
    }
    $scope.isSubmitted = function(code, issuer) {
      var value = states[key(code, issuer)];
      return value && value.state == 'submitted';
    }
    $scope.isDone = function(code, issuer) {
      var value = states[key(code, issuer)];
      return value && value.state == 'success';
    }
    
    $scope.addTrust = function(code, issuer, amount) {
      amount = amount || "1000000000";
      var keystr = key(code, issuer);
      
      errors[keystr] = "";
      states[keystr] = "";
      changing[keystr] = true;
      XrpApi.changeTrust(code, issuer, amount).then(hash => {
        changing[keystr] = false;
        states[keystr] = {hash : hash, state: 'submitted'};
        $rootScope.$apply();
      }).catch(err => {
        changing[keystr] = false;
        errors[keystr] = err.message;
        $rootScope.$apply();
      });
    };
    
    $scope.delTrust = function(code, issuer) {
      code = code || $scope.manual_code;
      issuer = issuer || $scope.manual_issuer;
      var keystr = key(code, issuer);
      
      errors[keystr] = "";
      states[keystr] = "";
      changing[keystr] = true;
      XrpApi.changeTrust(code, issuer, "0").then(hash => {
        changing[keystr] = false;
        states[keystr] = {hash : hash, state: 'submitted'};
        $rootScope.$apply();
      }).catch(err=>{
        changing[keystr] = false;
        errors[keystr] = err.message;
        $rootScope.$apply();
      });
    };
    
    $scope.$on("txSuccess", function(e, tx) {
      console.debug('txSuccess event', tx);
      updateState(tx.hash, 'success');
      console.log(states);
      $scope.$apply();
    });
    $scope.$on("txFail", function(e, tx) {
      console.debug('txFail event', tx);
      updateState(tx.hash, 'fail');
      $scope.$apply();
    });
    
  } ]);
