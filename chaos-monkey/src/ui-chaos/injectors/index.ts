import { UiChaosInjector } from '../types';
import clickEverything from './click-everything';
import formFuzzer from './form-fuzzer';
import rapidNavigation from './rapid-navigation';
import keyboardChaos from './keyboard-chaos';
import responsiveChaos from './responsive-chaos';
import networkChaos from './network-chaos';
import stateCorruption from './state-corruption';
import monkeyTesting from './monkey-testing';
import concurrentTabs from './concurrent-tabs';

const allUiInjectors: UiChaosInjector[] = [
  clickEverything,
  formFuzzer,
  rapidNavigation,
  keyboardChaos,
  responsiveChaos,
  networkChaos,
  stateCorruption,
  monkeyTesting,
  concurrentTabs,
];

export default allUiInjectors;
