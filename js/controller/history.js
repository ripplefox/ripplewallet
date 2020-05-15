/* global myApp */

myApp.controller("HistoryCtrl", [ '$scope', '$rootScope', 'XrpApi', 'AuthenticationFactory',
  function($scope, $rootScope, XrpApi, AuthenticationFactory) {
    $scope.history = [];
    $scope.marker = null;
    $scope.loading = false;
    
    $scope.load_more = function() {
      if ($scope.loading) { return; }
      $scope.loading = true;
      XrpApi.checkTx($scope.marker).then(data => {
        $scope.loading = false;
        $scope.error_msg = "";
        $scope.marker = data.marker;
        data.transactions.forEach(tx => {
          var item = filterEffects(tx);
          $scope.history.push(item);
        });
        console.debug(data);
        $scope.$apply();
      }).catch(err => {
        $scope.loading = false;
        $scope.error_msg = err.message;
        $scope.$apply();
      });
    };

    $scope.refresh = function() {
      $scope.history = [];
      $scope.marker = null;
      $scope.load_more();
    };
    $scope.refresh();
    
    
    // filter effect types
    // Show only offer_funded, offer_partially_funded, offer_cancelled,
    // offer_bought, trust_change_no_ripple side effects
    var filterEffects = function (tx) {
      if (!tx) return null;

      var event = $.extend(true, {}, tx);
      var effects = [];

      if (event.effects) {
        event.effects.forEach(effect => {
          if (effect.type == 'offer_funded'
            || effect.type == 'offer_partially_funded'
            || effect.type == 'offer_bought'
            || effect.type == 'trust_change_no_ripple'
            || effect.type === 'offer_cancelled')
          {
            if (effect.type === 'offer_cancelled' && event.transaction
              && event.transaction.type === 'offercancel') {
              return
            }
            effects.push(effect);
          } else if (effect.type == 'balance_change' & tx.tx_type == 'AccountDelete') {
            effects.push(effect);
          }
        });
        event.showEffects = effects;
      }

      if (effects.length || event.transaction) {
        return event;
      } else {
        return null;
      }
    };
    
  } ]);

