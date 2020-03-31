/* global myApp, nw */

myApp.controller('RegisterCtrl', ['$scope', '$rootScope', '$window', '$location', 'FileDialog', 'AuthenticationFactory', 'Id',
  function($scope, $rootScope, $window, $location, FileDialog, AuthenticationFactory, Id) {
    $scope.password = '';
    $scope.passwordSet = {};
    $scope.password1 = '';
    $scope.password2 = '';
    $scope.key = '';
    $scope.mode = 'register_new_account';
    $scope.showMasterKeyInput = false;
    $scope.submitLoading = false;

    $scope.changeMode = function(mode) {
      $scope.mode = mode;
    };
    $scope.showPass = function(flag) {
      $scope.showPassword = flag;
    };
    $scope.showSec = function(flag) {
      $scope.showSecret = flag;
    };

    $scope.reset = function() {
      $scope.password = '';
      $scope.password1 = '';
      $scope.password2 = '';
      $scope.masterkey = '';
      $scope.key = '';
      $scope.mode = 'register_new_account';
      $scope.showMasterKeyInput = false;
      $scope.submitLoading = false;

      if ($scope.registerForm) $scope.registerForm.$setPristine(true);
    };

    $scope.fileInputClick = function() {
      const txtfilename = Id.generateFilename();
      FileDialog.saveAs(function(filename) {
        $scope.$apply(function() {
          $scope.walletfile = filename;
          $scope.mode = 'register_empty_wallet';
          $scope.save_error = '';
        });
      }, txtfilename);
    };

    $scope.submitForm = function() {
      const keypair = Id.generateAccount();
      if(!$scope.masterkey) $scope.masterkey = keypair.secret;

      const options = {
        address: Id.fromSecret($scope.masterkey).address,  
        secrets: [$scope.masterkey],
        password: $scope.password1,
        path: $scope.walletfile
      };
      AuthenticationFactory.create(AuthenticationFactory.TYPE.FILESYSTEM, options, (err) => {
        if (err) {
          console.error('Registration failed!', err);
          $scope.save_error = err.message;
          $scope.$apply();
          return;
        }

        $scope.password = new Array($scope.password1.length+1).join("*");
        $scope.key = `${new Array(56).join("*")}`;
        $scope.mode = 'welcome';
        $scope.$apply();
      });
    };

    $scope.submitSecretKeyForm = function(){
      $scope.masterkey = $scope.secretKey;
      $scope.fileInputClick();
    };

    $scope.gotoFund = function() {
      $scope.mode = 'register_empty_wallet';
      $scope.reset();

      $location.path('/');
    };

  }
]);
