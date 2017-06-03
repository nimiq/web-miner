class RobinsonProjection {
    constructor(width) {
        this._width = width;
        this._r = this._width / 5.332539516;
    }

    static _project(lat, lng)
    {
        // 5 degree intervals, so find right indices
        var lI = Math.floor((Math.abs(lat)-RobinsonProjection.EPS)/RobinsonProjection.INTERVAL);
        lI = Math.max(lI, 0);
        var hI = lI + 1;
        var ratio = (Math.abs(lat)-lI*RobinsonProjection.INTERVAL) / RobinsonProjection.INTERVAL;

        // interpolate x and y
        var xDist = RobinsonProjection.X[hI]-RobinsonProjection.X[lI];
        var yDist = RobinsonProjection.Y[hI]-RobinsonProjection.Y[lI];
        var x = ((xDist*ratio)+RobinsonProjection.X[lI]) * (Math.abs(lng) * RobinsonProjection.radians);
        x = lng < 0 ? -x : x;
        var y = (yDist*ratio)+RobinsonProjection.Y[lI];
        y = lat < 0 ? -y : y;

        return {
            x : x,
            y : y
        };
    }

    project(lat, lng) {
        var p = RobinsonProjection._project(lat, lng);
        return {
            x: p.x * this._r,
            y: p.y * this._r
        };
    }
}
RobinsonProjection.X = [
    0.8487, 0.84751182, 0.84479598, 0.840213,
    0.83359314, 0.8257851, 0.814752, 0.80006949,
    0.78216192, 0.76060494, 0.73658673, 0.7086645,
    0.67777182, 0.64475739, 0.60987582, 0.57134484,
    0.52729731, 0.48562614, 0.45167814
];

RobinsonProjection.Y = [
    0, 0.0838426, 0.1676852, 0.2515278, 0.3353704,
    0.419213, 0.5030556, 0.5868982, 0.67182264,
    0.75336633, 0.83518048, 0.91537187, 0.99339958,
    1.06872269, 1.14066505, 1.20841528, 1.27035062,
    1.31998003, 1.3523
];

RobinsonProjection.EPS = 1e-8;
RobinsonProjection.INTERVAL = 5;
RobinsonProjection.pi = Math.PI;
RobinsonProjection.radians = RobinsonProjection.pi / 180;
RobinsonProjection.degrees = 180 / RobinsonProjection.pi;

class Map {
	constructor(svgElement) {
        this._svg = svgElement;
        var hexagons = svgElement.querySelectorAll('polygon');
        for (var i = 0; i < hexagons.length; ++i) {
            hexagons[i].cellId = i;
        }
        this._cells = hexagons;
	}

    getDimensions() {
        return this._svg.getBoundingClientRect();
    }

    unhighlightCell(cell) {
        cell.setAttribute('class', '');
    }

    highlightCell(cell, className) {
	    // XXX hack
	    var curClass = cell.getAttribute('class');
	    if (curClass === 'own-peer' || curClass === 'connected-peer') return;

        cell.setAttribute('class', className);
    }

    _convertCoordinates(latitude, longitude) {
        var mapDimensions = this.getDimensions();
        // the map that we have is cropped out from the full robinson projected map. We have to make
        // the computation on the full/original map, so we calculate the full size.
        var fullMapWidth = 1.0946808510638297 * mapDimensions.width;
        var fullMapHeight = fullMapWidth / 1.97165551906973; // RobinsonProjection maps have a fixed aspect ratio
        var projection = new RobinsonProjection(fullMapWidth, fullMapHeight);
        var point = projection.project(latitude, longitude);
        // the origin is centered in the middle of the map, so we translate it
        // to the top left corner
        point.x = fullMapWidth/2 + point.x;
        point.y = fullMapHeight/2 - point.y;
        // the map that we have is robinson projected and then cropped out and scaled
        point.x = mapDimensions.left + Math.max(0, point.x - 0.07045675413022352*fullMapWidth);
        point.y = mapDimensions.top + Math.max(0, point.y - 0.012380952380952381*fullMapHeight);
        return point;
    }

    _testCoordinateConversion(latitude, longitude) {
        var testDot = window.testDot;
        if (!testDot) {
            testDot = document.createElement('div');
            testDot.style.background = 'red';
            testDot.style.width = '5px';
            testDot.style.height = '5px';
            testDot.style.position = 'absolute';
            document.body.appendChild(testDot);
            window.testDot = testDot;
        }
        var convertedCoordinates = this._convertCoordinates(latitude, longitude);
        console.log(convertedCoordinates);
        testDot.style.left = convertedCoordinates.x-2+'px';
        testDot.style.top = convertedCoordinates.y-2+'px';
    }

    _getClosestCell(x, y) {
        var hexagonSize = 0; // we use this to estimate the distance in terms of cells
        var bestDistance = 0;
        var bestCell = null;
        for (var i = 0; i < this._cells.length; ++i) {
        	// Calculate position from bounding box.
        	var cell = this._cells[i];
        	var box = cell.getBoundingClientRect();
            var centerX = box.left + box.width / 2;
            var centerY = box.top + box.height / 2;
            var xDist = centerX - x;
            var yDist = centerY - y;
            var distance = xDist*xDist + yDist*yDist;

            // Find maximal size;
            hexagonSize = Math.max(hexagonSize, box.width, box.height);

            // Update best cell accordingly.
            if (!bestCell || distance < bestDistance) {
            	bestDistance = distance;
            	bestCell = cell;
			}
        }
        // Return best cell only if its distance in terms of cells is not too far.
        return bestDistance > Map.MAX_CELL_DISTANCE * hexagonSize ? null : bestCell;
    }

    highlightLocation(latitude, longitude, className) {
        var convertedCoordinates = this._convertCoordinates(latitude, longitude);
        var closestCell = this._getClosestCell(convertedCoordinates.x, convertedCoordinates.y);
        if (closestCell) {
        	this.highlightCell(closestCell, className);
		}
		return closestCell;
	}
}
Map.MAX_CELL_DISTANCE = 3; // in terms of cells