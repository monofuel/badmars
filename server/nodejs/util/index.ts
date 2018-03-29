
import * as jsonpatch from 'fast-json-patch';
import { DetailedError } from '../logger';

export function expectEqual(a: any, b: any, msg?: string) {
  const diff = jsonpatch.compare(a, b);
  if (diff.length > 0) {
    console.error(diff);
    throw new DetailedError(`not equal ${msg}`, { diff });
  }
}
