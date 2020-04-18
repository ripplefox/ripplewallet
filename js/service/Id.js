const bip39 = require('bip39');
const {derivePath} = require('ed25519-hd-key');
const keypairs = require('ripple-keypairs');

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
    isValidMnemonic : function(value) {
      var wl1 = bip39.wordlists.english;
      var wl2 = bip39.wordlists.chinese_simplified;
      var wl3 = bip39.wordlists.japanese;
      
      return bip39.validateMnemonic(value, wl1) || bip39.validateMnemonic(value, wl2) || bip39.validateMnemonic(value, wl3);
      
    },
    generateMnemonic : function() {
      return bip39.generateMnemonic();
    },
    getMnemonicInEnglish : function(input) {
      if (bip39.validateMnemonic(input, bip39.wordlists.english)) return input;
      if (bip39.validateMnemonic(input, bip39.wordlists.chinese_simplified)) {
        const entropy = bip39.mnemonicToEntropy(input, bip39.wordlists.chinese_simplified);
        return bip39.entropyToMnemonic(entropy);
      }
      if (bip39.validateMnemonic(input, bip39.wordlists.japanese)) {
        const entropy = bip39.mnemonicToEntropy(input, bip39.wordlists.japanese);
        return bip39.entropyToMnemonic(entropy);
      }
    },
    getMnemonicLang : function(mnemonic, lang) {
      if (!mnemonic) return "";
      var wl = bip39.wordlists.english;
      if (lang == 'cn') wl = bip39.wordlists.chinese_simplified;
      if (lang == 'jp') wl = bip39.wordlists.japanese;
      const entropy = bip39.mnemonicToEntropy(mnemonic);
      return bip39.entropyToMnemonic(entropy, wl);
    },
    generateAccount : function(mnemonic) {
      var kp;
      if (mnemonic) {
        var seedHex = bip39.mnemonicToSeedSync(mnemonic).toString("hex");
        var hddata = derivePath("m/44'/144'/0'", seedHex);
        const secret = keypairs.generateSeed({entropy: hddata.key})
        const keypair = keypairs.deriveKeypair(secret);
        const classicAddress = keypairs.deriveAddress(keypair.publicKey)
        return {address: classicAddress, secret: secret};
      } else {
        kp = _ripple.generateAddress();
      }
      return {address: kp.address, secret: kp.secret};
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
