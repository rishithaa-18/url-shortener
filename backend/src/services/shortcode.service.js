// Short code generation strategy
// ---------------------------------
// Options considered:
//
// 1. Sequential ID + base62 encoding (e.g. id 12345 -> "3d7")
//    Pro: short, no collisions possible.
//    Con: predictable/guessable, reveals how many links exist, and requires
//         an extra DB round-trip to get the ID before you can create the row.
//
// 2. Hash of the URL (e.g. md5(url).slice(0,7))
//    Pro: deterministic.
//    Con: two different users shortening the SAME url would collide by design,
//         and hashes of similar URLs can produce visually similar prefixes.
//         Also doesn't support "shorten the same URL twice differently."
//
// 3. UUID
//    Pro: virtually zero collision risk.
//    Con: 36 characters — defeats the purpose of a *short* URL.
//
// 4. Random string from a fixed alphabet (chosen approach)
//    Pro: short, not sequential/guessable, generation doesn't depend on
//         reading anything from the DB first.
//    Con: needs collision handling, since two random generations could
//         theoretically produce the same code.
//
// We're using approach 4 via `nanoid`, which generates cryptographically
// strong random IDs from a given alphabet. 7 characters from a 62-character
// alphabet (a-z, A-Z, 0-9) gives ~3.5 trillion possible codes — collisions
// are rare enough that "generate, try to insert, retry on rare failure" is
// simpler and safer than trying to prevent collisions up front.

const { customAlphabet } = require('nanoid');

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CODE_LENGTH = 7;

const generate = customAlphabet(ALPHABET, CODE_LENGTH);

function generateShortCode() {
  return generate();
}

module.exports = { generateShortCode };
