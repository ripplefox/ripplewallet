/* global _, myApp, round, RippleAPI */

myApp.factory('ServerManager', ['$rootScope',
  function($rootScope) {
  
    let _servers = {};
    let _maxfee = 0.2;
    let _timeout = 100000;
    let _active = undefined;
    
    return {
      setMaxfee(maxfee) {
        _maxfee = parseFloat(maxfee);
      },
      
      setTimeout(seconds) {
        _timeout = parseFloat(seconds) * 1000;
      },
      
      getRemote() {
        return _active ? _active.server : null;
      },
      
      disconnect() {
        for (var name in _servers) {
          var server = _servers[name];
          if (server.isConnected()) {
            server.disconnect().then(()=>{ console.log(`${server.connection._url} disconnect.`)});
          }
        }
      },
      
      _connect(remote, name) {
        return new Promise((resolve, reject)=>{
          if (!remote.isConnected()) {
            console.log(`connect to ${name} ...`);
            remote.connect().then(()=>{
              console.log(`${remote.connection._url} connectted.`);
              resolve({server: remote, name: name});
            }).catch((err) => {
              console.log(`${name} cannot connect.`);
              reject(err);
            });
          } else {
            resolve(remote, name);
          }
        });
      },
      
      connect() {
        var self = this;
        _active = undefined;
        return new Promise((resolve, reject)=>{
          for (var name in _servers) {
            this._connect(_servers[name], name).then((result) => {
              if(!_active) {
                console.log(`${result.server.connection._url} is the fatest`);
                _active = result;
                resolve(result.name);
              } else {
                result.server.disconnect();
              }
            }).catch((err) => {
              console.log('ignore', err);
            });
          }
        });
      },
      
      _removeAll() {
        this.disconnect();
        _servers = {};
        _active = undefined;
      },

      setServers(arr) {
        this._removeAll();
        arr.forEach((item)=>{
            var url = item.server.indexOf("://") < 0 ? "wss://" + item.server : item.server;
            var port = item.port;
            
            var server = new RippleAPI({
              server: url + ":" + port,
              feeCushion: 1.1,
              maxFeeXRP: _maxfee.toString() 
            });
            server.connection._config.connectionTimeout = _timeout;
            _servers[item.server] = server;
        });
      },
    };
  } ]);
