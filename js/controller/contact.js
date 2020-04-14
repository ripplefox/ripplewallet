/* global myApp */

myApp.controller("ContactCtrl", ['$scope', '$rootScope', 'AuthenticationFactory', 'Id',
  function($scope, $rootScope, AuthenticationFactory, Id) {

    $scope.toggle_form = function() {
      $scope.addform_visible = !$scope.addform_visible;
      $scope.reset_form();
    };

    $scope.reset_form = function() {
      $scope.contact = {
        name     : '',
        view     : '',
        address  : '',
        tag      : ''
      };
      $scope.error = {};
    };
    $scope.reset_form();

    $scope.invalid = function(obj) {
      return $scope.error['exist'] || $scope.error['address'] || $scope.error['tag'];
    }

    $scope.resolve = function() {
      if ($scope.contact.name) {
        var item = $rootScope.contacts.find(function(element){
          return element.name == $scope.contact.name;
        });
        $scope.error['exist'] = item;
      } else {
        $scope.error['exist'] = null;
      }

      if ($scope.contact.address) {
        $scope.error['address'] = !Id.isValidAddress($scope.contact.address) && !Id.isValidEmail($scope.contact.address);
      } else {
        $scope.error['address'] = null;
      }

      if ($scope.contact.tag) {
        $scope.error['tag'] = !(/(^[1-9]\d*$)/.test($scope.contact.tag));
      } else {
        $scope.error['tag'] = null;
      }
    };

    $scope.create = function() {
      var contact = {
        name    : $scope.contact.name,
        view    : $scope.contact.view,
        address : $scope.contact.address
      };

      if ($scope.contact.tag) {
        contact.dt = $scope.contact.tag;
      }

      AuthenticationFactory.addContact(contact, function(err){
        if (err) {
          $scope.error_message = err.message;
        } else {
          $scope.error_message = "";
          $rootScope.contacts = AuthenticationFactory.contacts;
        }
        $scope.$apply();
      });

      $scope.toggle_form();
      $scope.reset_form();
    };

  }]);

myApp.controller("ContactRowCtrl", ['$scope', '$rootScope', '$location', 'AuthenticationFactory', 'Id',
  function($scope, $rootScope, $location, AuthenticationFactory, Id) {

    $scope.editing = false;
    $scope.cancel = function (index) {
      $scope.editing = false;
    };

    //Switch to edit mode
    $scope.edit = function (index){
      $scope.editing      = true;
      $scope.editname     = $scope.entry.name;
      $scope.editaddress  = $scope.entry.address;
      $scope.editview     = $scope.entry.view || $scope.entry.address;
      $scope.edittag      = $scope.entry.dt;
    };

    $scope.error = {};
    $scope.invalid = function(obj) {
      return $scope.error['exist'] || $scope.error['address'] || $scope.error['tag'];
    }

    $scope.resolve = function() {
      if ($scope.editname && $scope.editname != $scope.entry.name) {
        var item = $rootScope.contacts.find(function(element){
          return element.name == $scope.editname;
        });
        $scope.error['exist'] = item;
      } else {
        $scope.error['exist'] = null;
      }

      if ($scope.editaddress) {
        $scope.error['address'] = !Id.isValidAddress($scope.editaddress) && !Id.isValidEmail($scope.editaddress);;
      } else {
        $scope.error['address'] = null;
      }

      if ($scope.edittag) {
        $scope.error['tag'] = !(/(^[1-9]\d*$)/.test($scope.edittag));
      } else {
        $scope.error['tag'] = null;
      }
    };

    $scope.update = function (index){
      if ($scope.invalid()) {
        return;
      }

      var contact = {
        name    : $scope.editname,
        view    : $scope.editview,
        address : $scope.editaddress
      };

      if ($scope.edittag) {
        contact.dt = $scope.edittag;
      }

      AuthenticationFactory.updateContact($scope.entry.name, contact, function(err){
        if (err) {
          $scope.error_message = err.message;
        } else {
          $scope.error_message = "";
          $rootScope.contacts = AuthenticationFactory.contacts;
        }
        $scope.$apply();
      });

      $scope.editing = false;
    };

    $scope.remove = function (index){
      AuthenticationFactory.deleteContact($scope.entry.name, function(err){
        if (err) {
          $scope.error_message = err.message;
        } else {
          $scope.error_message = "";
          $rootScope.contacts = AuthenticationFactory.contacts;
        }
        $scope.$apply();
      });
    };

    $scope.send = function(index){
      $location.path('/send').search($scope.entry);
    }
  }]);
