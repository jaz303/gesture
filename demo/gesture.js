;(function() {

var exports = {};

var atan2       = Math.atan2,
    sqrt        = Math.sqrt;

var DEFAULT_MIN_SEGMENT_LENGTH = 20;

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

function calculateBoundingBox(points) {

  var minX = Infinity, maxX = -Infinity,
      minY = Infinity, maxY = -Infinity;

  for (var i = 0; i < points.length; i += 2) {
    var x = points[i], y = points[i+1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return {
    x       : minX,
    y       : minY,
    width   : maxX - minX,
    height  : maxY - minY
  };

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

  if (shortestIx >= 0) {
    motions.splice(shortestIx, 1);
    return shortestDistance;
  } else {
    return 0;
  }
    
}

function recognise(allGestures, thisGesture) {
  var m1 = thisGesture.motions;
  for (var i = 0, gl = allGestures.length; i < gl; ++i) {
    var g = allGestures[i], m2 = g.motions;
    if (m1.length != m2.length) {
      continue;
    } else {
      var match = true;
      for (var j = 0, ml = m1.length; j < ml; ++j) {
        if (m1[j].direction !== m2[j]) {
          match = false;
          break;
        }
      }
      if (match && (!g.guard || g.guard(thisGesture))) {
        return g.id;
      }
    }
  }
  return null;
}

/**
 * creates a gesture recogniser.
 * 
 * gestures is an array of recognised gestures.
 * each gesture looks like this:
 *
 * { id: 'foo',
 *   motions: ['n', 's', 'e'],
 *   guard: function(gesture) { ... }
 * }
 *
 * `id` is the string to be returned when this gestured is
 * successfully recognised.
 *
 * `motions` is the sequence of motions a gesture must match before
 * it will be recognised.
 *
 * `guard` is an optional callback function that can perform a final
 * acceptance check on a gesture that matches the motion sequence.
 * for example, you way wish to check the ratio of the gesture's
 * bounding box falls within some acceptable range.
 *
 * the guard function, when specified, receives the entire gesture
 * description as an input. a gesture looks like this:
 *
 * { x: 10, y: 20,
 *   width: 252, height: 310,
 *   motions: [
 *     {direction: 'e', distance: 252},
 *     {direction: 's', distance: 310}
 *   ]
 * }
 *
 */
function create(gestures, options) {

  var options           = options || {},
      minSegmentLength  = options.minSegmentLength || DEFAULT_MIN_SEGMENT_LENGTH,
      removalThreshold  = options.removalThreshold || 0.2;

  return function(points) {

    points = filter(points, minSegmentLength);

    var gesture = calculateBoundingBox(points);
    gesture.motions = mergeDuplicates(parse(points));

    var totalDistance = 0;
    gesture.motions.forEach(function(m) { totalDistance += m.distance; });

    var minDistance = totalDistance - (totalDistance * removalThreshold);

    while (gesture.motions.length) {
      gesture.id = recognise(gestures, gesture);
      if (gesture.id) {
        return gesture;
      } else {
        totalDistance -= removeShortestMotion(gesture.motions);
        if (totalDistance < minDistance) {
          break;
        } else {
          gesture.motions = mergeDuplicates(gesture.motions);
        }
      }
    }

    return null;

  }

}

exports.createGestureRecogniser = create;
window.createGestureRecogniser = create;

})();