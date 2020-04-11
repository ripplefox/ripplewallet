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
    
    connect() {
      if (!_remote) throw new Error("NotConnectedError");
      return _remote.isConnected() ? Promise.resolve() : _remote.connect();
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
          await this.connect();
          const response = await _remote.getOrderbook(address, info, {limit: 30});
          resolve(response);
        } catch (err) {
          console.error(err);
          reject(err);
        }
      });
    },
    
    // TODO: use ripple data api as another source of orderbook

  };
} ]);
