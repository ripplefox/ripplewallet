/* global myApp */

myApp.controller("SettingsCtrl", [ '$scope', '$rootScope', '$location', 'SettingFactory', 'XrpApi', 'ServerManager', 
  function($scope, $rootScope, $location, SettingFactory, XrpApi, SM) {
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

    if ($scope.network_servers.length == 0 && $scope.all_networks[$scope.network_type].servers[0]) {
      $scope.server_url = $scope.all_networks[$scope.network_type].servers[0].server;
      $scope.server_port = $scope.all_networks[$scope.network_type].servers[0].port;;
    }
    
    
    $scope.fed_ripple  = SettingFactory.getFedRipple();
    $scope.fed_bitcoin = SettingFactory.getFedBitcoin();
    
    $scope.set = function(type) {
      $scope.network_type = type;
      $scope.network_servers = SettingFactory.getServers(type);
      $scope.network_coin = SettingFactory.getCoin(type);
    }
    $scope.addServer = function() {
      $scope.server_port = $scope.server_port || 443;
      $scope.network_servers.push({"server": $scope.server_url, "port": $scope.server_port});
      SettingFactory.setServers($scope.network_servers, $scope.network_type);
    }
    $scope.removeServer = function(index) {
      $scope.network_servers.splice(index, 1);
      SettingFactory.setServers($scope.network_servers, $scope.network_type);
    }
    $scope.resetServer = function() {
      SettingFactory.resetServers($scope.network_type);
      $scope.network_servers = SettingFactory.getServers($scope.network_type);
    }
    
    $scope.save = function(mode) {
      $scope.network_error = "";
      if (mode == 'network') {
        try {
          SettingFactory.setNetworkType($scope.network_type);
          SettingFactory.setCoin($scope.network_coin);

          $scope.active_network = SettingFactory.getNetworkType();
          $scope.active_servers = SettingFactory.getServers();
          $scope.active_coin = SettingFactory.getCoin();

          SM.setServers(SettingFactory.getServers());
          XrpApi.logout();
          SM.connect().then((name)=>{
            console.log(`ServerManager connect to ${name}`);
            XrpApi.remote = SM.remote;
          });
          $rootScope.reset();
          $rootScope.currentNetwork = SettingFactory.getCurrentNetwork();
          location.reload();
        } catch (e) {
          console.error(e);
          $scope.network_error = e.message;
        }
      }
      
      if (mode == 'settings') {
        try {
          SettingFactory.setTimeout($scope.network_timeout);
          SettingFactory.setMaxfee($scope.network_maxfee);

          SM.setMaxfee(SettingFactory.getMaxfee());
          SM.setTimeout(SettingFactory.getTimeout());
          XrpApi.logout();
          SM.connect().then((name)=>{
            console.log(`ServerManager connect to ${name}`);
            XrpApi.remote = SM.remote;
          });
          $rootScope.reset();
          location.reload();
        } catch (e) {
          console.error(e);
          $scope.network_error = e.message;
        }
      }

      if (mode == 'federation') {
        SettingFactory.setFedRipple($scope.fed_ripple);
        SettingFactory.setFedBitcoin($scope.fed_bitcoin);
      }

      if (mode == 'proxy') {
        SettingFactory.setProxy($scope.proxy);
      }
    };

  } ]);
