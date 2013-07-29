var atan2       = Math.atan2,
    sqrt        = Math.sqrt;

var EAST        = 0,
    SOUTH       = Math.PI / 2,
    WEST        = Math.PI,
    NORTH       = -Math.PI / 2;

function distancesq(x1, y1, x2, y2) {
  var dx = (x2 - x1), dy = (y2 - y1);
  return dx*dx + dy*dy;
}

function filter(points, minLength) {

  if (points.length < 2) 
    return points;

  var out   = [points[0], points[1]],
      lx    = points[0],
      ly    = points[1],
      minsq = minLength * minLength;

  for (var i = 2; i < points.length; i += 2) {
    if (distancesq(lx, ly, points[i], points[i+1]) >= minsq) {
      out.push(lx = points[i]);
      out.push(ly = points[i+1]);
    }
  }

  return out;

}

function parse(points) {

  var out = [];

  for (var i = 2; i < points.length; i += 2) {

    var x1 = points[i-2],
        y1 = points[i-1],
        x2 = points[i],
        y2 = points[i+1];

    var angle       = atan2(y2 - y1, x2 - x1),
        distance    = sqrt(distancesq(x1, y1, x2, y2)),
        htolerance  = Math.PI / 8,
        vtolerance  = Math.PI / 8,
        direction   = null;

    if (angle >= 0) {
      if (angle < htolerance) {
        direction = 'e';
      } else if (angle < SOUTH - vtolerance) {
        direction = 'se';
      } else if (angle < SOUTH + vtolerance) {
        direction = 's';
      } else if (angle < WEST - htolerance) {
        direction = 'sw';
      } else if (angle <= WEST) {
        direction = 'w';
      } else {
        console.log("warning: unexpected angle - " + angle);
        return null;
      }
    } else {
      if (angle > -htolerance) {
        direction = 'e';
      } else if (angle > NORTH + vtolerance) {
        direction = 'ne';
      } else if (angle > NORTH - vtolerance) {
        direction = 'n';
      } else if (angle > -WEST + htolerance) {
        direction = 'nw';
      } else if (angle >= -WEST) {
        direction = 'w';
      } else {
        console.log("warning: unexpected angle - " + angle);
        return null;
      }
    }

    out.push({direction: direction, distance: distance});

  }

  return out;

}

function mergeDuplicates(motions) {

  var lastDirection = null, out = [];

  for (var i = 0; i < motions.length; ++i) {
    var motion = motions[i];
    if (motion.direction === lastDirection) {
      out[out.length - 1].distance += motion.distance;
    } else {
      out.push(motion);
      lastDirection = motion.direction;
    }
  }

  return out;

}

function removeShortestMotion(motions) {

  var shortestDistance = Infinity, shortestIx = -1;

  for (var i = 0; i < motions.length; ++i) {
    var motion = motions[i];
    if (motion.distance < shortestDistance) {
      shortestDistance = motion.distance;
      shortestIx = i;
    }
  }

  if (shortestIx > 0)
    motions.splice(shortestIx, 1);

}

function gesture(points, options) {

  options = options || {};

  var filteredPoints = filter(points, options.minLength || 10);
  var motions = parse(filteredPoints);
  var merged = mergeDuplicates(motions);

  return merged;

}



var points = [
  0, 0,
  40, 0,
  40, 100,
  20, 100,
  20, 20,
  20, -80,
  40, 100
];

console.log(mergeDuplicates(parse(points)));



