/* global myApp */

myApp.factory('XrpPath', ['$rootScope', function($rootScope) {
  let _remote;
  let _myHandler;

  return {

    set remote(remote) {
      _remote = remote;
    },
    
    connect() {
      if (!_remote) throw new Error("NotConnectedError");
      return _remote.isConnected() ? Promise.resolve() : _remote.connect();
    },
    
    close() {
      if (_myHandler) {
        _remote.connection.removeListener('path_find', _myHandler);
        _myHandler = undefined;
        _remote.request('path_find', {
          'subcommand': 'close',
        }).then(response => {
          console.log('close path_find', response);
        }).catch(function(error) {
          console.error('path_find close', error);
        });
      }
    },
    
    open(src_act, dest_act, xrpDropsOrAmountObj, handler) {
      var self = this;
      self.close();
      _myHandler = function(e){
        handler(null, e);
      };
      _remote.connection.on('path_find', _myHandler);
      _remote.request('path_find', {
        'subcommand': 'create',
        'source_account': src_act,
        'destination_account': dest_act,
        'destination_amount': xrpDropsOrAmountObj
      }).then(response => {
        handler(null, response);
      }).catch(err => {
        console.error("Error request 'path_find' subcommand 'create': ", err);
        handler(err, null)
      });
    },

  };
} ]);
