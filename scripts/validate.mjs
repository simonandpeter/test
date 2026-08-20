#!/usr/bin/env node
/**
 * Runs every check the build runs, writing nothing. For pre-commit hooks and
 * for checking a folder before it is pushed.
 *
 * This deliberately reuses build-manifest rather than reimplementing the
 * checks: two copies of the validation rules would drift, and the copy that
 * drifted would be the one that lets a bad folder through.
 */

import { build, report } from './build-manifest.mjs';

build({ write: false })
  .then((result) => process.exit(report(result, { write: false })))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
