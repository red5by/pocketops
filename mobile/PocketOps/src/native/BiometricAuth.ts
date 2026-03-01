import {NativeModules} from 'react-native';

const {BiometricAuth} = NativeModules as {
  BiometricAuth: {
    authenticate: () => Promise<boolean>;
  };
};

export default BiometricAuth;
