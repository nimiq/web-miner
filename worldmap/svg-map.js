class Map {
	constructor(mapObjectElement) {
        if (!mapObjectElement || !mapObjectElement.nodeName || mapObjectElement.nodeName.toLowerCase() !== "object"
            || mapObjectElement.type !== "image/svg+xml" || typeof mapObjectElement.data !== "string"
            || mapObjectElement.data.indexOf('map.svg') === -1) {
            throw Error('invalid map object');
        }

        function init() {
            var svgDocument = mapObjectElement.contentDocument;
            this._svg = svgDocument.querySelector('svg');
            var hexagons = svgDocument.querySelectorAll('polygon');
            this._cells = hexagons;
            // var style = this._svg.style;
            // style.transition = 'fill 1s';
            // style.fill = this._standardColor;
        }

        this._highlightedCells = [];
        this._cells = [];

        if (!mapObjectElement.contentDocument) {
            mapObjectElement.onload = init.bind(this);
        } else {
            init.call(this);
        }
	}

    getDimensions() {
        return {
            width: this._svg.width.baseVal.value,
            height: this._svg.height.baseVal.value
        };
    }

    _highlightCell(cell, className) {
		// The cell is already highlighted.
		if (this._highlightedCells.indexOf(cell) !== -1) {
			return;
		}
		// We highlighted too many cells. Unhighlight the oldest cell.
        if (this._highlightedCells.length >= Map.MAX_HIGHLIGHT_COUNT) {
			var oldestCell = this._highlightedCells.shift();
			oldestCell.setAttribute('class', '');
        }

        this._highlightedCells.push(cell);
        cell.setAttribute('class', className);
    }

    _convertCoordinates(latitude, longitude) {
        var mapDimensions = this.getDimensions();
        // the map that we have is cropped out from the full robinson projected map. We have to make
        // the computation on the full/original map, so we calculate the full size.
        var fullMapWidth = 1.0946808510638297 * mapDimensions.width;
        var fullMapHeight = fullMapWidth / 1.97165551906973; // Robinson maps have a fixed aspect ratio
        var projection = new Robinson(fullMapWidth, null);
        var point = projection.project(latitude, longitude);
        // the origin is centered in the middle of the map, so we translate it
        // to the top left corner
        point.x = fullMapWidth/2 + point.x;
        point.y = fullMapHeight/2 - point.y;
        // the map that we have is robinson projected and then cropped out and scaled
        point.x = Math.max(0, point.x - 0.07045675413022352*fullMapWidth);
        point.y = Math.max(0, point.y - 0.012380952380952381*fullMapHeight);
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
        for (var i=0; i<this._cells.length; ++i) {
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
        	this._highlightCell(closestCell, className);
		}
	}
}
Map.MAX_HIGHLIGHT_COUNT = 2;
Map.MAX_CELL_DISTANCE = 3; // in terms of cells
