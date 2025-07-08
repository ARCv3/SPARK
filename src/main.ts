import { Arc3 } from "./lib/arc/arc3.js";
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env'})

const arc = new Arc3.Arc3();

arc.runAsync().finally(() => {
  console.log("Running");
});
