/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* import-globals-from ../shared-head.js */

// This Services declaration may shadow another from head.js, so define it as
// a var rather than a const.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

const { AppConstants } = ChromeUtils.import(
  "resource://gre/modules/AppConstants.jsm"
);
const { setTimeout } = ChromeUtils.import("resource://gre/modules/Timer.jsm");

// Load the shared head
const sharedHead = do_get_file("shared-head.js", false);
if (!sharedHead) {
  throw new Error("Could not load the shared head.");
}
Services.scriptloader.loadSubScript(
  Services.io.newFileURI(sharedHead).spec,
  this
);

/**
 * This function takes a thread, and a sample tuple from the "data" array, and
 * inflates the frame to be an array of strings.
 *
 * @param {Object} thread - The thread from the profile.
 * @param {Array} sample - The tuple from the thread.samples.data array.
 * @returns {Array<string>} An array of function names.
 */
function getInflatedStackLocations(thread, sample) {
  let stackTable = thread.stackTable;
  let frameTable = thread.frameTable;
  let stringTable = thread.stringTable;
  let SAMPLE_STACK_SLOT = thread.samples.schema.stack;
  let STACK_PREFIX_SLOT = stackTable.schema.prefix;
  let STACK_FRAME_SLOT = stackTable.schema.frame;
  let FRAME_LOCATION_SLOT = frameTable.schema.location;

  // Build the stack from the raw data and accumulate the locations in
  // an array.
  let stackIndex = sample[SAMPLE_STACK_SLOT];
  let locations = [];
  while (stackIndex !== null) {
    let stackEntry = stackTable.data[stackIndex];
    let frame = frameTable.data[stackEntry[STACK_FRAME_SLOT]];
    locations.push(stringTable[frame[FRAME_LOCATION_SLOT]]);
    stackIndex = stackEntry[STACK_PREFIX_SLOT];
  }

  // The profiler tree is inverted, so reverse the array.
  return locations.reverse();
}

/**
 * This utility matches up stacks to see if they contain a certain sequence of
 * stack frames. A correctly functioning profiler will have a certain sequence
 * of stacks, but we can't always determine exactly which stacks will show up
 * due to implementation changes, as well as memory addresses being arbitrary to
 * that particular build.
 *
 * This function triggers a test failure with a nice debug message when it
 * fails.
 *
 * @param {Array<string>} actualStackFrames - As generated by
 *     inflatedStackFrames.
 * @param {Array<string | RegExp>} expectedStackFrames - Matches a subset of
 *     actualStackFrames
 */
function expectStackToContain(
  actualStackFrames,
  expectedStackFrames,
  message = "The actual stack and expected stack do not match."
) {
  // Log the stacks that are being passed to this assertion, as it could be
  // useful for when these tests fail.
  console.log("Actual stack: ", actualStackFrames);
  console.log(
    "Expected to contain: ",
    expectedStackFrames.map(s => s.toString())
  );

  let actualIndex = 0;

  // Start walking the expected stack and look for matches.
  for (
    let expectedIndex = 0;
    expectedIndex < expectedStackFrames.length;
    expectedIndex++
  ) {
    const expectedStackFrame = expectedStackFrames[expectedIndex];

    while (true) {
      // Make sure that we haven't run out of actual stack frames.
      if (actualIndex >= actualStackFrames.length) {
        info(`Could not find a match for: "${expectedStackFrame.toString()}"`);
        Assert.ok(false, message);
      }

      const actualStackFrame = actualStackFrames[actualIndex];
      actualIndex++;

      const itMatches =
        typeof expectedStackFrame === "string"
          ? expectedStackFrame === actualStackFrame
          : actualStackFrame.match(expectedStackFrame);

      if (itMatches) {
        // We found a match, break out of this loop.
        break;
      }
      // Keep on looping looking for a match.
    }
  }

  Assert.ok(true, message);
}
