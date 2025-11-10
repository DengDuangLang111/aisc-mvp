import { TransformStream } from 'stream/web';

export default async function globalSetup() {
  if (typeof (globalThis as any).TransformStream === 'undefined') {
    (globalThis as any).TransformStream = TransformStream;
  }
}
