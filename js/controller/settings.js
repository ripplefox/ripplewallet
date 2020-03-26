/* global myApp */

myApp.controller("SettingsCtrl", [ '$scope', '$rootScope', '$location', 'SettingFactory', 'XrpApi',
  function($scope, $rootScope, $location, SettingFactory, XrpApi) {
    $scope.mode = 'network';
    $scope.isMode = function(mode) {
      return $scope.mode === mode;
    }
    $scope.setMode = function(mode) {
      return $scope.mode = mode;
    }

    $scope.proxy = SettingFactory.getProxy();

    $scope.active_network = SettingFactory.getNetworkType();
    $scope.active_servers = SettingFactory.getServers();
    $scope.active_coin = SettingFactory.getCoin();
    $scope.network_type = SettingFactory.getNetworkType();
    $scope.network_servers = SettingFactory.getServers();
    $scope.network_coin = SettingFactory.getCoin();
    $scope.all_networks = SettingFactory.NETWORKS;
    $scope.network_timeout = parseFloat(SettingFactory.getTimeout());
    $scope.network_maxfee = parseFloat(SettingFactory.getMaxfee());

    $scope.fed_network = SettingFactory.getFedNetwork();
    $scope.fed_ripple  = SettingFactory.getFedRipple();
    $scope.fed_bitcoin = SettingFactory.getFedBitcoin();
    
    $scope.set = function(type) {
      $scope.network_type = type;
      $scope.network_servers = SettingFactory.getServers(type);
      if(type === 'other') {
        $scope.network_coin = SettingFactory.getCoin(type);
      }
    }
    $scope.addServer = function() {
      $scope.network_servers.push({"server": $scope.server_url, "port": $scope.server_port});
      SettingFactory.setServers($scope.network_servers, $scope.network_type);
    }
    $scope.removeServer = function(index) {
      $scope.network_servers.splice(index, 1);
      SettingFactory.setServers($scope.network_servers, $scope.network_type);
    }
    
    $scope.save = function(mode) {
      $scope.network_error = "";
      if (mode == 'network') {
        try {
          SettingFactory.setNetworkType($scope.network_type);
          SettingFactory.setCoin($scope.network_coin);
          SettingFactory.setTimeout($scope.network_timeout);
          SettingFactory.setMaxfee($scope.network_maxfee);

          $scope.active_network = SettingFactory.getNetworkType();
          $scope.active_servers = SettingFactory.getServers();
          $scope.active_coin = SettingFactory.getCoin();

          //StellarApi.setTimeout($scope.network_timeout);
          //StellarApi.setBasefee($scope.network_basefee);
          //StellarApi.setServer($scope.active_horizon, $scope.active_passphrase, SettingFactory.getAllowHttp());
          //StellarApi.logout();
          $rootScope.reset();
          $rootScope.$broadcast('$authUpdate');  // workaround to refresh and get changes into effect.
          location.reload();

        } catch (e) {
          console.error(e);
          $scope.network_error = e.message;
        }
      }

      if (mode == 'federation') {
        SettingFactory.setFedNetwork($scope.fed_network);
        SettingFactory.setFedRipple($scope.fed_ripple);
        SettingFactory.setFedBitcoin($scope.fed_bitcoin);
      }

      if (mode == 'proxy') {
        SettingFactory.setProxy($scope.proxy);
      }
    };

  } ]);
