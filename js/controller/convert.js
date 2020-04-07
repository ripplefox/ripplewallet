/* global myApp */

myApp.controller("ConvertCtrl", ['$scope', '$rootScope', 'XrpApi', 'XrpPath', 'SettingFactory', '$http',
  function($scope, $rootScope, XrpApi, XrpPath, SettingFactory, $http) {
    $scope.mode = 'input';
    $scope.isMode = function(val) {
      console.log($scope.mode, val);
      return $scope.mode == val;
    }
    $scope.currencies = [];
    $scope.send = [];
    $scope.dst_amount = 0;
    $scope.dst_currency = '';
    
    $scope.init = function(){
      $scope.currencies.push($rootScope.currentNetwork.coin.code);
      for (var code in $rootScope.lines) {
        $scope.currencies.push(code);
      }
      $scope.dst_currency = $scope.currencies[0];
    }
    $scope.init();

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
      $scope.paths = {};
      $scope.asset = {};
      $scope.finding = true;
      $scope.send_done = false;
      $scope.send_error = '';
      
      $rootScope.timer = null;
      $rootScope.lastUpdateTime;
      XrpPath.open($rootScope.address, $rootScope.address, amount, function(err, data) {
        $rootScope.lastUpdateTime = new Date();
        clearInterval($rootScope.timer);
        timer = setInterval(function() {
          $scope.$apply(function() {
            $scope.lastUpdate = round((new Date() - $rootScope.lastUpdateTime) / 1000);
          });
        }, 1000);

        if (err) {
          $scope.send_error = err.message;
          $scope.finding = false;
          XrpPath.close();
        } else {
          console.log(data);
          $scope.found = true;
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
      /*
      StellarApi.queryPath($rootScope.address, $rootScope.address, arr[0], arr[1], amount, function(err, data){
        $scope.finding = false;
        if (err) {
          if (typeof err == "string") {
            $scope.send_error = err;
          } else {
            $scope.send_error = err.detail || err.message;
          }
        } else {
          data.records.forEach(function(item){
            var alt = {
              origin: item,
              dst_code   : item.destination_asset_type == 'native' ? $rootScope.currentNetwork.coin.code : item.destination_asset_code,
              dst_issuer : item.destination_asset_type == 'native' ? '' : item.destination_asset_issuer,
              src_amount : parseFloat(item.source_amount),
              src_code   : item.source_asset_type == 'native' ? $rootScope.currentNetwork.coin.code : item.source_asset_code,
              src_issuer : item.source_asset_type == 'native' ? '' : item.source_asset_issuer,
            };
            alt.precise = alt.src_code == 'BTC' ? 6 : 3;
            alt.price = alt.src_amount / item.destination_amount;

            var gateway = $rootScope.gateways.getSourceById(alt.src_issuer);
            alt.src_logo = gateway.logo;
            alt.src_name = gateway.name;

            var isValid = true;
            if (alt.src_amount <= 0) {
              isValid = false;
            } else {
              if (alt.src_code == $rootScope.currentNetwork.coin.code) {
                if ($rootScope.balance - alt.src_amount < 0) {
                  isValid = false;
                }
              } else {
                if ($rootScope.lines[alt.src_code][alt.src_issuer].balance - alt.src_amount < 0) {
                  isValid = false;
                }
              }

              if (alt.src_code == alt.dst_code && alt.src_issuer == alt.dst_issuer && alt.price >= 1) {
                isValid = false;
              }
            }

            if (isValid) {
              if ($scope.paths[alt.src_code + '.' + alt.src_issuer]) {
                if ($scope.paths[alt.src_code + '.' + alt.src_issuer].src_amount > alt.amount) {
                  $scope.paths[alt.src_code + '.' + alt.src_issuer] = alt;
                }
              } else {
                $scope.paths[alt.src_code + '.' + alt.src_issuer] = alt;
              }
            }
          });
        }
      });*/
    };
    
    $scope.asset = {};
    $scope.pick = function(code) {
      $scope.asset = $scope.paths[code];
      $scope.finding = false;
      XrpPath.close();
      clearInterval($rootScope.timer);
      $scope.mode = 'confirm';
    };
    $scope.cancelConfirm = function() {
      $scope.mode = 'input';
      $scope.updatePath();
    }

    $scope.sending;
    $scope.send_done = false;
    $scope.send_error = '';

    $scope.send_asset = function() {
      $scope.sending = true;
      $scope.send_done = false;
      $scope.send_error = '';

      $scope.asset.max_rate = 1.0001;
      StellarApi.convert($scope.asset, function(err, hash){
        $scope.sending = false;

        if (err) {
          $scope.send_error = StellarApi.getErrMsg(err);
        } else {
          $scope.dst_amount = 0;
          $scope.paths = {};
          $scope.asset = {};
          $scope.send_done = true;
        }
        $rootScope.$apply();
      });
    };
    
    $scope.$on("$destroy", function() {
      clearInterval($rootScope.timer);
      XrpPath.close();
    });
   
  } ]);

