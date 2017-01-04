const _ = require("lodash");

function inferTypeOf(value) {
  // Given a value from RethinkDB, tries to infer its ReQL type.
  // Returns a string value, similar to r.typeOf result, or an empty
  // string if the type is not recognized or unsupported.
  switch (typeof value) {
    case "string":
      return "STRING";
    case "number":
      return "NUMBER";
    case "boolean":
      return "BOOL";
    case "null":
      return "NULL";
    case "object":
      // TODO: Implement check for PTYPE<GEOMETRY>
      if (_.isArray(value)) {
        return "ARRAY";
      } else if (_.isDate(value)) {
        return "PTYPE<TIME>";
      } else if (_.isTypedArray(value)) {
        return "PTYPE<BINARY>";
      } else {
        return "OBJECT";
      }
    default:
      return "";
  }
}

function spaceship(a, b) {
  // A simple three-way comparison ("spaceship operator") function.
  // Using JS built-in comparison logic, returns 0, -1 or 1,
  // depending on whenever values compare equal, less or greater.
  // Returns null if neither of comparisons succeed (non-comparable).
  if (a === b) {
    return 0;
  } else if (a < b) {
    return -1;
  } else if (a > b) {
    return 1;
  } else {
    return null;
  }
}

function compareValues(a, b) {
  // Compares two values in a (hopefully) same manner as RethinkDB would do.
  // Returns 0, -1 or 1 (see `spaceship` function) or null if cannot compare.
  //
  // A special value of Infinity (a value that can't be stored in RethinkDB)
  // is treated as greater than any other value. However, please note that
  // the behavior of comparing two Infinity values is undefined.

  // Fast path for strings, improving performance for the most common case.
  if (typeof a === "string" && typeof b === "string") {
    return a === b ? 0 : (a < b ? -1 : 1);
  }

  if (a === Infinity) { return 1; }    // Infinity > *
  if (b === Infinity) { return -1; }   // * < Infinity

  const ta = inferTypeOf(a),
        tb = inferTypeOf(b);

  if (ta === "" || tb === "") {
    return null;
  }
  if (ta !== tb) {
    return spaceship(ta, tb);
  }

  switch (ta) {
    case "STRING":
    case "NUMBER":
    case "BOOL":
    case "NULL":
      return spaceship(a, b);
    case "PTYPE<TIME>":
      return spaceship(a.getTime(), b.getTime());
    case "PTYPE<BINARY>":
      return null; // unsupported
    case "ARRAY":
      for (let pair of _.zip(a, b)) {
        if (pair[0] === undefined) {
          return -1;
        } else if (pair[1] === undefined) {
          return 1;
        } else {
          const c = compareValues(pair[0], pair[1]);
          if (c !== 0) {
            return c;
          }
        }
      }
      return 0;
    case "OBJECT":
      return compareValues(_.toPairs(a).sort(), _.toPairs(b).sort());
    default:
      return null;
  }
}

module.exports = compareValues;
