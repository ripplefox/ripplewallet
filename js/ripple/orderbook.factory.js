/* global myApp */

myApp.factory('XrpOrderbook', ['$rootScope', 'AuthenticationFactory', function($rootScope, AuthenticationFactory) {
  let _remote;
  let _myHandler;

  return {
    get address() {
      return AuthenticationFactory.address;
    },
    
    get nativeCode() {
      return $rootScope.currentNetwork.coin.code;
    },

    set remote(remote) {
      _remote = remote;
    },
    
    checkBook(info, address) {
      address = address || this.address;
      if (this.nativeCode === info.base.currency) {
        info.base.currency = 'XRP';
        delete info.base.counterparty;
      }
      if (this.nativeCode === info.counter.currency) {
        info.counter.currency = 'XRP';
        delete info.counter.counterparty;
      }
      return new Promise(async (resolve, reject)=>{
        try {
          if (!_remote.isConnected()) {
            await _remote.connect();
          }
          const response = await _remote.getOrderbook(address, info, {limit: 30});
          resolve(response);
        } catch (err) {
          console.error(err);
          reject(err);
        }
      });
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
        console.log('open', response);
        handler(null, response);
      }).catch(err => {
        console.error("Error request 'path_find' subcommand 'create': ", err);
        handler(err, null)
      });
    },

  };
} ]);
