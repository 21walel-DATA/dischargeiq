// SYNTHETIC sample letter files for the upload demo (D-054), served by the app from client/public/demo-letters/.
// Demo mode (no AI key, and always in tests) has no AI to read a file, so it recognises these exact files by their
// SHA-256 fingerprint and returns the matching demo letter's text. A test checks these fingerprints still match
// the files, so they can't drift apart.
import { DMS_0042 } from "./demoCases";

export type DemoLetterFile = { file: string; sha256: string; letterText: string };

export const DEMO_LETTER_FILES: DemoLetterFile[] = [
  {
    file: "dms-0042-letter.pdf",
    sha256: "04ab8f2d1cc1c86991d23889062d3d6a363a8908899b9f46aa6c28711f9751cb",
    letterText: DMS_0042.letterText,
  },
  {
    file: "dms-0042-letter-photo.jpg",
    sha256: "c04d32f6bce1323f43d32006abd957433d8d8d8887001a98d9fc43872d42b03d",
    letterText: DMS_0042.letterText,
  },
];
