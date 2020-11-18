/* global myApp */

myApp.controller("SecurityCtrl", ['$scope', '$rootScope', 'AuthenticationFactory', '$translate', 'Id', 'XrpApi',
  function($scope, $rootScope, AuthenticationFactory, $translate, Id, XrpApi) {
    $scope.mode = 'security';

    $scope.keyAmount = AuthenticationFactory.secretAmount;
    $scope.key = `${new Array(56).join("*")}`;

    $scope.showSec = function(flag) {
      $scope.showSecret = flag;
      $scope.keyOpen = AuthenticationFactory.secrets[0];  
      $scope.keyQRCode = $scope.keyOpen;
      
      $scope.mnemonic = AuthenticationFactory.mnemonic;
      $scope.lang = $translate.use();
      if (['cn', 'jp'].indexOf($scope.lang) >= 0) {
        $scope.mnemonic_lang = Id.getMnemonicLang($scope.mnemonic, $scope.lang);
      }
    };

    $scope.refresh = function() {
      $scope.error = '';
      XrpApi.checkSettings().then(data => {
        console.log(data);
        $scope.domain = data.domain;
        $scope.messagekey = data.messageKey;
        $scope.disallowxrp = !!data.disallowIncomingXRP;
        $scope.requiretag = !!data.requireDestinationTag;
        $scope.defaultrippling = !!data.defaultRipple;
        $scope.$apply();
      }).catch(err => {
        if (err.unfunded) {
          $scope.error = 'NotFoundError';
        } else {
          $scope.error = err.message;
        }
        $scope.$apply();
      });
    };
    $scope.refresh();
    
    $scope.domain = '';
    $scope.domain_working = false;
    $scope.domain_done = false;
    $scope.setDomain = function() {
      $scope.error = '';
      $scope.domain_done = false;
      $scope.domain_working = true;
      XrpApi.changeSettings({'domain': $scope.domain}).then(result => {
        $scope.domain_working = false;
        $scope.domain_done = true;
        $rootScope.$apply();
      }).catch(err => {
        $scope.domain_working = false;
        console.error(err);
        $scope.error = err.message;
        $rootScope.$apply();
      });
    };
    
    $scope.flags_working = false;
    $scope.flags_done = false;
    $scope.setFlags = function(field, value) {
      $scope.error = '';
      $scope.flags_done = false;
      $scope.flags_working = true;
      var settings = {};
      settings[field] = value;
      XrpApi.changeSettings(settings).then(result => {
        $scope.flags_working = false;
        $scope.flags_done = true;
        $rootScope.$apply();
      }).catch(err => {
        $scope.flags_working = false;
        console.error(err);
        $scope.error = err.message;
        $rootScope.$apply();
      });
    };
    
    $scope.messagekey = '';
    $scope.messagekey_working = false;
    $scope.messagekey_done = false;
    $scope.setMessagekey = function() {
      $scope.error = '';
      $scope.messagekey_done = false;
      $scope.messagekey_working = true;
      if ($scope.isEthAddress) {
        $scope.messagekey = '02' + '0'.repeat(24) + $scope.messagekey.slice(2).toUpperCase();
      }
      XrpApi.changeSettings({'messageKey': $scope.messagekey}).then(result => {
        $scope.messagekey_working = false;
        $scope.messagekey_done = true;
        $rootScope.$apply();
      }).catch(err => {
        $scope.messagekey_working = false;
        console.error(err);
        $scope.error = err.message;
        $rootScope.$apply();
      });
    };
    
    $scope.delete_warning = true;
    $scope.toggleWarning = function() {
      $scope.delete_warning = !$scope.delete_warning;
    }
    $scope.deleteAccount = function() {
      $scope.error = '';
      $scope.merge_done = false;
      $scope.merge_working = true;
      XrpApi.deleteAccount($scope.dest_account).then(result => {
        $scope.merge_working = false;
        $scope.merge_done = true;
        $rootScope.balance = 0;
        $rootScope.reserve = 0;
        $rootScope.$apply();
      }).catch(err => {
        $scope.merge_working = false;
        $scope.error = err.message;
        $rootScope.$apply();
      });
    };
    
  } ]);
