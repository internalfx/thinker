var hash = function (str) {
  var hash = 5381;
  var i = str.length;
  while (i) { hash = (hash * 33) ^ str.charCodeAt(--i) };
  return hash >>> 0;
}
