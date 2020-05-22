/* global myApp */

myApp.controller("ConvertCtrl", ['$scope', '$rootScope', 'XrpApi', 'XrpPath', 'SettingFactory', '$http',
  function($scope, $rootScope, XrpApi, XrpPath, SettingFactory, $http) {
    $scope.init = function(){
      $scope.mode = 'input';
      $scope.currencies = [];
      for (var code in $rootScope.lines) {
        $scope.currencies.push(code);
      }
      $scope.dst_amount = 0;
      $scope.dst_currency = $scope.dst_currency? $scope.dst_currency : $rootScope.native.code;
      $scope.paths = {};
      $scope.asset = {};
    }
    $scope.init();
    
    $scope.pickCode = function(code) {
      console.log($scope.dst_currency, '->', code);
      $scope.dst_currency = code;
      $scope.updatePath();
    };

    $scope.paths = {};
    $scope.finding = false;
    $scope.updatePath = function() {
      if ($scope.dst_amount == 0) {
        $scope.finding = false;
        XrpPath.close();
        return;
      }
      
      var amount = null;
      if ($scope.dst_currency == $rootScope.currentNetwork.coin.code) {
        amount = round($scope.dst_amount * 1000000).toString();
      } else {
        amount = {
            currency : $scope.dst_currency,
            issuer : $rootScope.address,
            value : $scope.dst_amount.toString()
        }
      }

      $scope.found = false;
      $scope.asset = {};
      $scope.finding = true;
      $scope.hash = "";
      $scope.tx_state = "";
      $scope.send_error = '';
      $scope.lastUpdate = 0;
      
      XrpPath.open($rootScope.address, $rootScope.address, amount, function(err, data) {
        startTimer();

        if (err) {
          $scope.send_error = err.message;
          $scope.finding = false;
          XrpPath.close();
        } else {
          console.log(data);
          $scope.found = true;
          $scope.paths = {};
          data.alternatives.forEach(alt => {
            if ("string" === typeof alt.source_amount) {
              $scope.paths[$rootScope.currentNetwork.coin.code] = {
                  origin : alt,
                  code  : $rootScope.currentNetwork.coin.code,
                  value : round(alt.source_amount / 1000000, 6).toString(),
                  rate  : round(alt.source_amount/1000000/$scope.dst_amount, 6).toString()
              }
            } else {
              $scope.paths[alt.source_amount.currency] = {
                  origin : alt,
                  code  : alt.source_amount.currency,
                  value : round(alt.source_amount.value, 6).toString(),
                  rate  : round(alt.source_amount.value/$scope.dst_amount, 6).toString()
              }
            }
          });
        }
        $scope.$apply();
      });
    };
    
    $scope.pick = function(code) {
      $scope.asset = $scope.paths[code];
      $scope.finding = false;
      XrpPath.close();
      clearInterval(timer);
      $scope.mode = 'confirm';
    };
    $scope.cancelConfirm = function() {
      $scope.mode = 'input';
      $scope.updatePath();
    }

    $scope.sending;
    $scope.send_error = '';
    
    $scope.hash = "";
    $scope.tx_state = "";
    $scope.$on("txSuccess", function(e, tx) {
      console.debug('txSuccess event', tx);
      if (tx.hash == $scope.hash) $scope.tx_state = "success";
      $scope.$apply();
    });
    $scope.$on("txFail", function(e, tx) {
      console.debug('txFail event', tx);
      if (tx.hash == $scope.hash) $scope.tx_state = "fail";
      $scope.$apply();
    });

    $scope.convert_confirmed = function() {
      $scope.mode = 'submit';
      $scope.sending = true;
      $scope.hash = "";
      $scope.tx_state = "";
      $scope.send_error = '';
      
      var alt = $scope.asset.origin;
      var srcAmount, dstAmount;
      if ("string" === typeof alt.source_amount) {
        srcAmount = {
            currency : 'drops',
            value : round(alt.source_amount * 1.01).toString()
        }
      } else {
        srcAmount = {
            currency : alt.source_amount.currency,
            counterparty : alt.source_amount.issuer,
            value : new BigNumber(alt.source_amount.value).multipliedBy(1.01).toString()
        }
      }
      if ($scope.dst_currency == $rootScope.currentNetwork.coin.code) {
        dstAmount = {
            currency : 'drops',
            value : round($scope.dst_amount * 1000000).toString()
        }
      } else {
        dstAmount = {
            currency : $scope.dst_currency,
            counterparty : $rootScope.address,
            value : $scope.dst_amount.toString()
        }
      }
      XrpApi.convert(srcAmount, dstAmount, alt.paths_computed).then(hash => {
        $scope.sending = false;
        $scope.hash = hash;
        $scope.tx_state = "submitted";
        $rootScope.$apply();
      }).catch(err => {
        $scope.sending = false;
        console.error(err);
        $scope.send_error = err.message;
        $rootScope.$apply();
      });
    };
    
    var timer;
    var lastUpdateTime;
    function startTimer() {
      lastUpdateTime = new Date();
      clearInterval(timer);
      timer = setInterval(function() {
        $scope.$apply(function() {
          $scope.lastUpdate = round((new Date() - lastUpdateTime) / 1000);
        });
      }, 1000);
    };
    
    $scope.$on("$destroy", function() {
      clearInterval($scope.timer);
      XrpPath.close();
    });
   
} ]);

