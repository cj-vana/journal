import { Injector } from '../types';
import dbStress from './db-stress';
import uploadChaos from './upload-chaos';
import authChaos from './auth-chaos';
import exportStress from './export-stress';
import diskFiller from './disk-filler';
import concurrentWrites from './concurrent-writes';
import processKiller from './process-killer';
import networkThrottle from './network-throttle';

const allInjectors: Injector[] = [
  dbStress,
  uploadChaos,
  authChaos,
  exportStress,
  diskFiller,
  concurrentWrites,
  processKiller,
  networkThrottle,
];

export default allInjectors;
