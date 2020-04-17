myApp.factory('Id', function($window) {
  let _ripple = new RippleAPI();
  
  return {
    isValidAddress : function(address) {
      return RippleAPI.isValidClassicAddress(address);
    },
    isValidSecret : function(secret) {
      return _ripple.isValidSecret(secret);
    },
    isValidEmail : function(email) {
      var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return re.test(email);
    },
    generateAccount : function() {
      var keypair = _ripple.generateAddress();
      return {address: keypair.address, secret: keypair.secret};
    },
    fromSecret : function(secret) {
      var keypair = _ripple.deriveKeypair(secret);
      return {address:  RippleAPI.deriveClassicAddress(keypair.publicKey), secret: secret};
    },
    sign : function(txtJson, secret) {
      return _ripple.sign(txtJson, secret);
    },
    generateFilename : function() {
      var dt = new Date();
      var datestr = (''+dt.getFullYear()+(dt.getMonth()+1)+dt.getDate()+'_'+dt.getHours()+dt.getMinutes()+dt.getSeconds()).replace(/([-: ])(\d{1})(?!\d)/g,'$10$2');
      return "ripple" + datestr + ".txt";
    }
  };
});
