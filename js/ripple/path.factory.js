/* global myApp */

myApp.factory('XrpPath', ['$rootScope', function($rootScope) {
  let _remote;
  let _src_act;
  let _myHandler;

  return {

    set client(client) {
      _client = client;
    },
    
    connect() {
      if (!_client) throw new Error("NotConnectedError");
      return _client.isConnected() ? Promise.resolve() : _client.connect();
    },
    
    close() {
      if (_myHandler) {
        _client.connection.removeListener('path_find', _myHandler);
        _myHandler = undefined;
        _client.request({
          command : "path_find",
          subcommand: "close"
        }).then(response => {
          console.log('close path_find', response);
        }).catch(function(error) {
          console.error('path_find close', error);
        });
      }
    },
    
    open(src_act, dest_act, xrpDropsOrAmountObj, handler) {
      this.close();
      _myHandler = function(e){
        handler(null, e);
      };

      _client.connection.on('path_find', _myHandler);
      _client.request({
        command : "path_find",
        subcommand: "create",
        source_account: src_act,
        destination_account: dest_act,
        destination_amount: xrpDropsOrAmountObj
      }).then(response => {
        handler(null, response.result);
      }).catch(err => {
        console.error("Error request 'path_find' subcommand 'create': ", err);
        handler(err, null)
      });
    },

  };
} ]);
