import { registerRootComponent } from 'expo';

import App from './App';

// Nothing to configure. The module resolves its own backend and identifies this app
// by its bundle id (ai.feedb.example), so there is no endpoint, no key and no timing
// to get wrong. `initializeFeedbAI` is still there if you want to restyle the board
// or route its errors — see App.tsx for how little the integration is.

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
