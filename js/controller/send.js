/* global myApp */

myApp.controller("SendCtrl", ['$scope', '$rootScope', '$routeParams', 'XrpApi', 'XrpPath', 'Id', 'SettingFactory', 'AuthenticationFactory', 'Federation', '$http',
  function($scope, $rootScope, $routeParams, XrpApi, XrpPath, Id, SettingFactory, AuthenticationFactory, Federation, $http) {
    console.log('Send to', $routeParams);
    var native = $rootScope.currentNetwork.coin;
    $scope.currencies = [];
    $scope.asset = {code: native.code};
    $scope.init = function(){
      $scope.mode = 'input';
      $scope.asset.amount = 0;
      $scope.service_amount = 0;
      $scope.finding = false;
      $scope.found = false;
      $scope.send_error = "";
      $scope.paths = [];
    }
    $scope.init();
    
    $scope.input_address;
    $scope.tag_require = false;
    $scope.disallow_xrp = false;
    $scope.tag_provided;
    $scope.sending;
    $scope.send_done = false;

    $scope.initSend = function(){
      if (AuthenticationFactory.getContact($routeParams.name)) {
        $scope.input_address = $routeParams.name;
        $scope.resolve();
      }
    }

    
    $scope.target_domain;
    $scope.real_address;
    $scope.real_not_fund = false;
    $scope.send = [];
    $scope.extra_fields = [];
    $scope.extra_assets = [];
    $scope.act_loading;
    $scope.is_federation;
    $scope.is_contact;

    $scope.pickCode = function(code) {
      console.log($scope.asset.code, '->', code);
      $scope.asset.code = code;
      $scope.updatePath();
    };
    
    $scope.resetService = function(){
      $scope.send_error = '';
      $scope.tag_require = false;
      $scope.send_done = false;

      $scope.real_address = '';
      $scope.real_not_fund = false;
      $scope.send = [];
      $scope.extra_fields = [];
      $scope.extra_assets = [];
      $scope.mulipleAsset = false;

      $scope.service_error = "";
      $scope.service_amount = 0;
      $scope.service_currency = "";

      $scope.fed_url = "";
      $scope.quote_id = "";
      $scope.quote_error = "";
    }
    $scope.resolve = function() {
      $scope.resetService();

      if (AuthenticationFactory.getContact($scope.input_address)){
        $scope.is_contact = true;
        var contact = AuthenticationFactory.getContact($scope.input_address);
        $scope.input_address = contact.name;
        $scope.full_address = contact.address;
        $scope.real_address = $scope.full_address;
        if (contact.dt) {
          $scope.tag = contact.dt;
        }
      } else {
        $scope.is_contact = false;
        $scope.full_address = autoCompleteURL($scope.input_address);
      }

      if ($scope.full_address.indexOf("@") < 0) {
        $scope.act_loading = false;
        $scope.is_federation = false;
        $scope.tag_provided = false;
        $scope.real_address = $scope.full_address;
        $scope.invalid_address = !Id.isValidAddress($scope.real_address);
        if (special_destinations[$scope.real_address]) {
          $scope.tag_require = true;
        }
        $scope.resolveAccountInfo();
      } else {
        $scope.is_federation = true;
        $scope.resolveFederation($scope.full_address);
      }
    };
    
    $scope.updatePath = function() {
      $scope.invalid_amount = !$scope.asset.amount || $scope.asset.amount <= 0;
      if ($scope.invalid_amount) {
        $scope.finding = false;
        $scope.paths = [];
        clearInterval(timer);
        XrpPath.close();
        return;
      }
      
      var amount = null;
      if ($scope.asset.code == native.code) {
        amount = round($scope.asset.amount * 1000000).toString();
      } else {
        amount = {
            currency : $scope.asset.code,
            issuer : $scope.real_address,
            value : $scope.asset.amount.toString()
        }
      }

      $scope.found = false;
      $scope.finding = true;
      $scope.send_error = '';
      $scope.lastUpdate = 0;
      
      var snapshot = $scope.real_address;
      XrpPath.open($rootScope.address, snapshot, amount, function(err, data) {
        if (snapshot !== $scope.real_address){
          console.log($scope.real_address, 'changed from', snapshot);
          return;
        }
        startTimer();

        if (err) {
          $scope.send_error = err.message;
          $scope.finding = false;
          XrpPath.close();
        } else {
          console.log(data);
          $scope.found = true;
          $scope.paths = [];
          var current = null;
          data.alternatives.forEach(alt => {
            if ("string" === typeof alt.source_amount) {
              $scope.paths.push({
                  origin : alt,
                  code  : native.code,
                  value : round(alt.source_amount / 1000000, 6).toString(),
                  rate  : round(alt.source_amount/1000000/$scope.asset.amount, 6).toString()
              });
            } else {
              // Selected currency should be the first option
              var path = {
                  origin : alt,
                  code  : alt.source_amount.currency,
                  value : round(alt.source_amount.value, 6).toString(),
                  rate  : round(alt.source_amount.value/$scope.asset.amount, 6).toString()
              }
              if (alt.source_amount.currency == $scope.asset.code) {
                current = path;
              } else {
                $scope.paths.push(path);
              }
            }
          });
          if (current) {
            $scope.paths.unshift(current);
          }
        }
        $scope.$apply();
      });
    };

    $scope.resolveFederation = function(snapshot) {
      console.debug('resolve', snapshot);
      var i = snapshot.indexOf("@");
      var prestr = snapshot.substring(0, i);
      var domain = snapshot.substring(i+1);

      $scope.target_domain = domain;
      $scope.act_loading = true;
      
      Federation.get(domain).then(txt => {
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
      /*
      StellarSdk.StellarTomlResolver.resolve(domain).then(function(stellarToml) {
        $scope.fed_url = stellarToml.FEDERATION_SERVER;
        var server = new StellarSdk.FederationServer(stellarToml.FEDERATION_SERVER, domain, {});
        server.resolveAddress(prestr).then(function(data){
          console.debug(prestr, data);
          $scope.act_loading = false;
          $scope.send_error.message = '';
          $scope.real_address = data.account_id;

          if (data.memo) {
            $scope.memo = data.memo.toString();
            $scope.memo_type = data.memo_type;
            $scope.memo_provided = true;
          } else {
            $scope.memo = '';
            $scope.memo_provided = false;
          }

          if (data.error) {
            $scope.send_error.message = data.detail || data.error;
          } else {
            if (data.extra_fields) {
              $scope.quote_id = data.account_id;
              $scope.extra_fields = data.extra_fields;
              $scope.extra_assets = data.assets;
              $scope.mulipleAsset = $scope.extra_assets.length > 1;
              $scope.service_currency = $scope.extra_assets[0].code + "." + $scope.extra_assets[0].issuer;
            } else {
              $scope.resolveAccountInfo();
            }
          }

          $scope.$apply();
        }).catch(function(err){
          if (snapshot !== $scope.full_address) {
            return;
          }
          console.debug(prestr, err);
          if (typeof err == "string") {
            $scope.send_error.message = err;
          } else {
            $scope.send_error.message = err.detail || err.message || err;
          }
          $scope.act_loading = false;
          $scope.$apply();
        });

      }).catch(function(err){
        console.error(err);
        if (snapshot !== $scope.full_address) {
          return;
        }
        $scope.send_error.domain = true;
        $scope.act_loading = false;
        $scope.$apply();
      });
      */
    };

    $scope.$watch('service_currency', function () { $scope.quote(); }, true);
    $scope.$watch('service_amount',   function () { $scope.quote(); }, true);
    $scope.$watch('extra_fields',     function () { $scope.quote(); }, true);

    $scope.quote_data;
    $scope.quote = function() {
      //$scope.asset = {};
      if (!$scope.serviceForm || !$scope.serviceForm.$valid || !$scope.service_amount) {
        return;
      }

      var arr = $scope.service_currency.split(".");
      var data = {
        type: "quote",
        amount       : $scope.service_amount,
        asset_code   : arr[0],
        asset_issuer : arr[1],
        account_id   : $scope.quote_id,
        address      : $rootScope.address
      };
      $scope.extra_fields.forEach(function(field){
        if (field.name) {
          data[field.name] = field.value;
        }
      });

      var snapshot = JSON.stringify(data);
      $scope.quote_data = snapshot;

      $scope.quote_error = "";
      $scope.quote_loading = true;
      $http({
        method: 'GET',
        url: $scope.fed_url,
        params: data
      }).then(function(res) {
        if (snapshot !== $scope.quote_data) {
          return;
        }
        $scope.send = res.data.send;
        $scope.asset = $scope.send[0];
        $scope.memo        = res.data.memo;
        $scope.memo_type   = res.data.memo_type;
        $scope.real_address = res.data.account_id;

        var gateway = $rootScope.gateways.getSourceById($scope.asset.issuer);
        $scope.asset.logo = gateway.logo;
        $scope.asset.name = gateway.name;

        $scope.quote_loading = false;
        console.debug(res.data);
      }).catch(function(err) {
        if (snapshot !== $scope.quote_data) {
          return;
        }
        console.debug(err);
        if (typeof err == "string") {
          $scope.quote_error = err;
        } else {
          if (err.data && err.data.detail) {
            $scope.quote_error = err.data.detail;
          } else {
            $scope.quote_error = err.message;
          }
        }
        $scope.quote_loading = false;
      });
    };

    $scope.resolveAccountInfo = function() {
      if (!$scope.real_address || !Id.isValidAddress($scope.real_address)) {
        return;
      }
      var snapshot = $scope.real_address;
      console.debug('resolve ' + snapshot);
      $scope.act_loading = true;
      XrpApi.checkSettings(snapshot).then(settings => {
        console.log(snapshot, 'settings', settings);
        $scope.tag_require = !!settings.requireDestinationTag;
        $scope.disallow_xrp = !!settings.disallowIncomingXRP;
        $scope.$apply();
        return XrpApi.checkCurrencies(snapshot);
      }).then(data => {
        console.log(data);
        $scope.act_loading = false;
        $scope.currencies = data.receive_currencies;
        $scope.$apply();
      }).catch(err => {
        $scope.act_loading = false;
        if (err.unfunded) {
          $scope.real_not_fund = true;
          $scope.pickCode(native.code);
        } else {
          $scope.send_error.message = err.message;
          console.error('resolveAccountInfo', err);
        }
        $scope.$apply();
      });
    };
    
    $scope.pickPath = function(code) {
      if ($scope.tag) {
        var tag = Number($scope.tag);
        $scope.invalid_tag = !(Number.isInteger(tag) && tag > 0 && tag < Math.pow(256, 4));
      } else {
        $scope.invalid_tag = false;
      }
      console.log($scope.tag, $scope.invalid_tag);
      if ($scope.invalid_tag) return;
      $scope.path = $scope.paths.find(item => {return item.code == code});
      if (!$scope.path && code == native.code) {
        // send XRP/native
        $scope.path = {
            origin : null,
            code  : native.code,
            value : $scope.asset.amount.toString(),
            rate  : "1"
        }
      }
      $scope.finding = false;
      XrpPath.close();
      clearInterval(timer);
      $scope.mode = 'confirm';
    };
    $scope.cancelConfirm = function() {
      $scope.mode = 'input';
      $scope.updatePath();
    }

    $scope.send_confirmed = function() {
      $scope.mode = 'submit';
      $scope.sending = true;
      $scope.send_done = false;
      $scope.send_error = '';
      console.log('sending', $scope.asset, $scope.tag);
      
      var alt = $scope.path.origin;
      var srcAmount, dstAmount;
      if (alt) {
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
      } else {
        srcAmount = {
            currency : 'drops',
            value : round($scope.asset.amount * 1000000).toString()
        }
      }
      if ($scope.asset.code == native.code) {
        dstAmount = {
            currency : 'drops',
            value : round($scope.asset.amount * 1000000).toString()
        }
      } else {
        dstAmount = {
            currency : $scope.asset.code,
            counterparty : $scope.real_address,
            value : $scope.asset.amount.toString()
        }
      }
      
      var payment = !alt ? XrpApi.payment($scope.real_address, srcAmount, dstAmount, $scope.tag) :
                       XrpApi.pathPayment($scope.real_address, srcAmount, dstAmount, alt.paths_computed, $scope.tag);
      payment.then(result => {
        $scope.sending = false;
        $scope.send_done = true;
        $scope.service_amount = 0;
        $scope.asset.amount = 0;
        $rootScope.$apply();
      }).catch(err => {
        $scope.sending = false;
        console.error(err);
        $scope.send_error = err.message;
        $rootScope.$apply();
      });
    };

    function autoCompleteURL(address) {
      //TODO: add more network
      address = address || "";
      if (address.indexOf("@") >=0) {
        return address;
      }
      if (!isNaN(ripple.Base.decode_check([0, 5], address, 'bitcoin'))) {
        return address + "@" + SettingFactory.getFedBitcoin();
      }
      return address;
    }

    function fmtbal(code, value) {
      if (['BTC', 'ETH', 'LTC'].indexOf(code) >= 0) {
        return round(value, 6) + " " + code;
      } else {
        return round(value) + " " + code;
      }
     
    };
    
    // exchange address
    var special_destinations = {
      'r3ipidkRUZWq8JYVjnSnNMf3v7o69vgLEW' : {name: 'RippleFox'},
    }
    
    var timer = null;
    var lastUpdateTime;
    function startTimer() {
      clearInterval(timer);
      lastUpdateTime = new Date();
      timer = setInterval(function() {
        $scope.$apply(function() {
          $scope.lastUpdate = round((new Date() - lastUpdateTime) / 1000);
        });
      }, 1000);
    };
    
    $scope.$on("$destroy", function() {
      clearInterval(timer);
      XrpPath.close();
    });

    $scope.initSend();

} ]);

