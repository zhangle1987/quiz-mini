function equal(a, b) {
  if (a === b) {
    return true;
  }

  if (a && b && typeof a === "object" && typeof b === "object") {
    if (a.constructor !== b.constructor) {
      return false;
    }

    if (Array.isArray(a)) {
      if (a.length !== b.length) {
        return false;
      }
      for (let index = 0; index < a.length; index += 1) {
        if (!equal(a[index], b[index])) {
          return false;
        }
      }
      return true;
    }

    if (a.constructor === RegExp) {
      return a.source === b.source && a.flags === b.flags;
    }

    if (a.valueOf !== Object.prototype.valueOf) {
      return a.valueOf() === b.valueOf();
    }

    if (a.toString !== Object.prototype.toString) {
      return a.toString() === b.toString();
    }

    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) {
      return false;
    }

    for (let index = 0; index < keys.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(b, keys[index])) {
        return false;
      }
    }

    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      if (!equal(a[key], b[key])) {
        return false;
      }
    }

    return true;
  }

  return a !== a && b !== b;
}

export default equal;
