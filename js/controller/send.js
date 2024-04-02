/* global myApp */
const {isValidXAddress, xAddressToClassicAddress} = require('ripple-address-codec')

myApp.controller("SendCtrl", ['$scope', '$rootScope', '$routeParams', 'XrpApi', 'XrpPath', 'Id', 'SettingFactory', 'AuthenticationFactory', 'Federation', '$http',
  function($scope, $rootScope, $routeParams, XrpApi, XrpPath, Id, SettingFactory, AuthenticationFactory, Federation, $http) {
    console.log('Send to', $routeParams);
    var native = $rootScope.currentNetwork.coin;
    $scope.currencies = [];
    $scope.asset = {code: native.code};
    $scope.init = function(){
      $scope.mode = 'input';
      $scope.asset.amount = 0;
      $scope.send_error = "";
      $scope.stopPath(true);
      $scope.resolve();
    }
    
    $scope.input_address;
    $scope.tag_require = false;
    $scope.disallow_xrp = false;
    $scope.tag_provided;
    $scope.sending;
    
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

    $scope.runOnceWhenOpen = function(){
      if (AuthenticationFactory.getContact($routeParams.name)) {
        $scope.input_address = $routeParams.name;
      } else {
        $scope.input_address = $routeParams.address || "";
      }
      $scope.init();
    }
    
    $scope.act_loading;
    $scope.is_federation;
    $scope.resetService = function(){
      $scope.hash = "";
      $scope.tx_state = "";
      $scope.send_error = '';
      $scope.tag_require = false;
      $scope.tag_provided = false;

      $scope.real_address = '';
      $scope.real_not_fund = false;
      $scope.send = [];
      $scope.extra_fields = [];
      $scope.invoice = "";
      $scope.memos = [];

      $scope.service_error = "";
      $scope.service_amount = 0;
      $scope.service_currency = null;

      $scope.fed_url = "";
      $scope.quote_url = "";
      $scope.quote_error = "";
    }
    
    $scope.resolve = function() {
      $scope.resetService();
      $scope.stopPath(true);

      if (AuthenticationFactory.getContact($scope.input_address)){
        var contact = AuthenticationFactory.getContact($scope.input_address);
        $scope.input_address = contact.name;
        $scope.full_address = contact.address;
        $scope.real_address = $scope.full_address;
        if (contact.dt) {
          $scope.tag = contact.dt;
        }
      } else {
        $scope.full_address = autoCompleteURL($scope.input_address);
      }

      if ($scope.full_address.indexOf("@") < 0) {
        $scope.act_loading = false;
        $scope.is_federation = false;
        if (isValidXAddress($scope.full_address)) {
          var decoded = xAddressToClassicAddress($scope.full_address);
          $scope.real_address = decoded.classicAddress;
          $scope.tag = decoded.tag;
          $scope.tag_provided = true;
        } else {
          $scope.real_address = $scope.full_address;
          $scope.tag_provided = false;
        }
        $scope.resolveAccountInfo();
      } else {
        $scope.is_federation = true;
        $scope.invalid_address = false;
        $scope.resolveFederation($scope.full_address);
      }
    };
    
    $scope.pickCode = function(code) {
      console.log($scope.asset.code, '->', code);
      $scope.asset.code = code;
      $scope.updatePath();
    };
    
    $scope.stopPath = function(clean) {
      $scope.finding = false;
      clearInterval(timer);
      XrpPath.close();
      if (clean) {
        $scope.paths = [];
        $scope.found = false;
      }
    }
    
    $scope.updatePath = function() {
      $scope.invalid_amount = !$scope.asset.amount || $scope.asset.amount <= 0;
      if ($scope.invalid_amount) {
        $scope.stopPath(true);
        return;
      }
      
      var amount = null;
      if ($scope.asset.code == native.code) {
        amount = xrpl.xrpToDrops($scope.asset.amount);
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
      console.log('open', amount);
      XrpPath.open($rootScope.address, snapshot, amount, function(err, data) {
        if (snapshot !== $scope.real_address){
          console.warn($scope.real_address, 'is not same as', snapshot);
          return;
        }
        startTimer();

        if (err) {
          $scope.stopPath();
          if ($scope.mode !== "input") {
            return;
          }
          $scope.send_error = err.message; // "Unknown method." or other errors, can send anyway

          // s1, s2 does not support path;
          $scope.found = true;
          // only need to create for issued assets
          if ($scope.asset.code !== native.code) {
            if (!$scope.asset.issuer) { // Not federation protocol, it does not have issuer.
              var default_issuer = null;
              for (let i=0; i<$rootScope.lines.length; i++) {
                let line = $rootScope.lines[i];
                if (line.currency == $scope.asset.code && Number(line.value) > 0) {
                  default_issuer = line.issuer;
                }
              }
              amount.issuer = default_issuer || $rootScope.address;
            } else {
              amount.issuer = $scope.asset.issuer;
            }
            $scope.paths = [{
              origin : { source_amount : amount },
              code : $scope.asset.code,
              value : $scope.asset.amount,
              rate : "1"
            }];
          }
        } else {
          console.log('path', data);
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

      $scope.act_loading = true;
      $scope.service_error = "";
      Federation.get(domain).then(txt => {
        $scope.fed_url = txt.federation_url ? txt.federation_url[0] : null;
        console.log('resolve', txt, $scope.fed_url);
        if (!$scope.fed_url) {
          return Promise.reject(new Error("NoFederationUrl"));
        }
        return $http({
          method: 'GET',
          url: $scope.fed_url,
          params: {
            type : 'federation',
            domain: domain,
            destination: prestr,
            address: $rootScope.address,
            client : 'foxlet-' + appinfo.version,
            network: $rootScope.currentNetwork.networkType == 'other' ? native.code : $rootScope.currentNetwork.networkType,
            lang   : SettingFactory.getLang()
          }
        });
      }).then(res => {
        if (snapshot !== $scope.full_address) {
          return;
        }
        console.log(res.data);
        if (res.data.result === 'error') {
          $scope.service_error = res.data.error_message || res.data.error;
        } else {
          var data = res.data.federation_json;
          if (data.extra_fields) {
            if (data.domain == domain) {
              $scope.service_currency = (data.currencies || data.assets)[0].currency;
              $scope.extra_fields = data.extra_fields;
              $scope.quote_destination = data.destination;
              $scope.quote_domain = data.domain;
              $scope.quote_url = data.quote_url;
            } else {
              $scope.service_error = "The domain field in response must be " + domain;
            }
          } else {
            $scope.extra_fields = null;
            $scope.real_address = data.destination_address;
            $scope.resolveAccountInfo();
          }
        }
        $scope.act_loading = false;
      }).catch(err => {
        if (snapshot !== $scope.full_address) {
          return;
        }
        $scope.service_error = err.message;
        $scope.act_loading = false;
        console.log(snapshot, err);
      });
    };

    $scope.$watch('service_currency', function () { $scope.quote(); }, true);
    $scope.$watch('service_amount',   function () { $scope.quote(); }, true);
    $scope.$watch('extra_fields',     function () { $scope.quote(); }, true);

    $scope.quote_data;
    $scope.quote = function() {
      if (!$scope.serviceForm || !$scope.serviceForm.$valid || !$scope.service_amount) {
        return;
      }
      var data = {
        type: "quote",
        amount       : $scope.service_amount + "/" + $scope.service_currency,
        destination  : $scope.quote_destination,
        domain       : $scope.quote_domain,
        address      : $rootScope.address,
        client       : 'foxlet-' + appinfo.version,
        network      : $rootScope.currentNetwork.networkType == 'other' ? native.code : $rootScope.currentNetwork.networkType,
        lang         : SettingFactory.getLang()
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
        url: $scope.quote_url || $scope.fed_url,
        params: data
      }).then(function(res) {
        if (snapshot !== $scope.quote_data) {
          return;
        }
        console.log(res.data);
        if (res.data.result === 'error') {
          $scope.quote_error = res.data.error_message || res.data.error;
          $scope.send = [];
          $scope.stopPath(true);
        } else {
          $scope.send = res.data.quote.send;
          $scope.asset = {code: $scope.send[0].currency, amount: $scope.send[0].value, issuer: $scope.send[0].issuer};
          $scope.tag = res.data.quote.destination_tag;
          $scope.invoice = res.data.quote.invoice_id;
          $scope.memos = res.data.quote.memos;
          $scope.real_address = res.data.quote.destination_address || res.data.quote.address;
          $scope.updatePath();
        }
        $scope.quote_loading = false;
      }).catch(function(err) {
        if (snapshot !== $scope.quote_data) {
          return;
        }
        $scope.send = [];
        $scope.stopPath(true);
        console.error('quote', err);
        $scope.quote_error = err.message;
        $scope.quote_loading = false;
      });
    };

    $scope.resolveAccountInfo = function() {
      $scope.invalid_address = !Id.isValidAddress($scope.real_address);
      if ($scope.invalid_address) {
        return;
      }
      var snapshot = $scope.real_address;
      console.debug('resolve ' + snapshot);
      $scope.act_loading = true;
      XrpApi.checkSettings(snapshot).then(settings => {
        console.log(snapshot, 'settings', settings);
        $scope.tag_require = !!settings.requireDestinationTag || !!special_destinations[$scope.real_address];
        $scope.disallow_xrp = !!settings.disallowIncomingXRP;
        $scope.$apply();
        return XrpApi.checkCurrencies(snapshot);
      }).then(data => {
        console.log(data);
        $scope.act_loading = false;
        $scope.currencies = data.receive_currencies;
        if ($scope.currencies.indexOf($scope.asset.code) < 0) {
          $scope.pickCode(native.code);
        }
        $scope.$apply();
        $scope.updatePath();
      }).catch(err => {
        $scope.act_loading = false;
        if (err.unfunded) {
          $scope.real_not_fund = true;
          $scope.currencies = [];
          $scope.pickCode(native.code);
        } else {
          $scope.send_error.message = err.message;
          console.error('resolveAccountInfo', err);
        }
        $scope.$apply();
      });
    };
    
    $scope.checkTag = function(){
      if ($scope.tag) {
        var tag = Number($scope.tag);
        $scope.invalid_tag = !(Number.isInteger(tag) && tag > 0 && tag < Math.pow(256, 4));
      } else {
        $scope.invalid_tag = $scope.tag_require;
      }
    }
    
    $scope.pickPath = function(code) {
      $scope.checkTag();
      console.log('tag:', $scope.tag, $scope.invalid_tag, $scope.tag_require);
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
      $scope.stopPath();
      $scope.mode = 'confirm';
    };
    $scope.cancelConfirm = function() {
      $scope.mode = 'input';
      $scope.updatePath();
    }

    $scope.send_confirmed = function() {
      $scope.mode = 'submit';
      $scope.sending = true;
      $scope.send_error = '';
      $scope.hash = "";
      $scope.tx_state = "";
      console.log('sending', $scope.asset, $scope.tag);
      
      var alt = $scope.path.origin;
      var srcAmount, dstAmount;
      if (alt) {
        if ("string" === typeof alt.source_amount) {
          srcAmount = {
              currency : 'XRP',
              value : xrpl.dropsToXrp(alt.source_amount * 1.01)
          }
        } else {
          srcAmount = {
              currency : alt.source_amount.currency,
              issuer : alt.source_amount.issuer,
              value : new BigNumber(alt.source_amount.value).multipliedBy(1.01).toString()
          }
        }
      } else {
        srcAmount = {
            currency : 'XRP',
            value : $scope.asset.amount.toString()
        }
      }
      if ($scope.asset.code == native.code) {
        dstAmount = {
            currency : 'XRP',
            value : $scope.asset.amount.toString()
        }
      } else {
        dstAmount = {
            currency : $scope.asset.code,
            issuer : $scope.real_address,
            value : $scope.asset.amount.toString()
        }
      }

      var pathArray = alt && alt.paths_computed ? alt.paths_computed : null;
      XrpApi.payment($scope.real_address, srcAmount, dstAmount, $scope.tag, $scope.invoice, $scope.memos, pathArray).then(hash => {
        $scope.hash = hash;
        $scope.tx_state = "submitted";
        $scope.sending = false;
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
      // if (!isNaN(ripple.Base.decode_check([0, 5], address, 'bitcoin'))) {
      //   return address + "@" + SettingFactory.getFedBitcoin();
      // }
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
      $scope.stopPath();
    });

    $scope.runOnceWhenOpen();

} ]);

