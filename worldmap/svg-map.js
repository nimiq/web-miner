function Map(mapObjectEl) {
	if (!mapObjectEl || !mapObjectEl.nodeName || mapObjectEl.nodeName.toLowerCase()!=="object"
		|| mapObjectEl.type !== "image/svg+xml" || typeof mapObjectEl.data !== "string"
		|| mapObjectEl.data.indexOf('map.svg')===-1) {
		throw Error('invalid map object');
	}
	function init() {
		var svgDocument = mapObjectEl.contentDocument;
		this.svg = svgDocument.querySelector('svg');
		var mapDimensions = this.getDimensions();
		var cells = [];
		var cellPositions = [];
		var hexagons = svgDocument.querySelectorAll('polygon');
		var hexagonCenterOffsetX = hexagons[0].offsetWidth / 2;
		var hexagonCenterOffsetY = hexagons[0].offsetHeight / 2;
		for (var i=0, hexagon; hexagon=hexagons[i]; ++i) {
			cells.push(hexagon);
			// save the positions of all of the cells as relative positions
			cellPositions.push({
				x: (hexagon.offsetLeft + hexagonCenterOffsetX) / mapDimensions.width,
				y: (hexagon.offsetTop + hexagonCenterOffsetY) / mapDimensions.height
			});
		}
		this.cells = cells;
		this.cellPositions = cellPositions;
		this.highlightedCells = [];
	}
	if (!mapObjectEl.contentDocument) {
		mapObjectEl.onload = init.bind(this);
	} else {
		init.call(this);
	}
}


Map.MAX_HIGHLIGHT_COUNT = 50;
Map.HIGHLIGHT_COLOR = "#F6AE2D";


Map.prototype.getDimensions = function() {
	return {
		width: this.svg.width.baseVal.value,
		height: this.svg.height.baseVal.value
	}
}


Map.prototype.highlightRandomCell = function() {
	var cell;
	do {
		var randomIndex = Math.floor(Math.random()*this.cells.length);
		console.log(randomIndex);
		cell = this.cells[randomIndex];
	} while(this.highlightedCells.indexOf(cell) !== -1);
	this.highlightCell(cell);
};


Map.prototype.highlightCell = function(cell) {
	if (this.highlightedCells.length >= Map.MAX_HIGHLIGHT_COUNT || this.highlightedCells.indexOf(cell)!==-1) {
		return;
	}
	this.highlightedCells.push(cell);
	var style = cell.style;
	style.transition = "fill 1s";
	style.fill = "#F6AE2D";
};


Map.prototype.convertCoordinates = function(latitude, longitude) {
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
};


Map.prototype.testCoordinateConversion = function(latitude, longitude) {
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
	var convertedCoordinates = this.convertCoordinates(latitude, longitude);
	console.log(convertedCoordinates);
	testDot.style.left = convertedCoordinates.x-2+'px';
	testDot.style.top = convertedCoordinates.y-2+'px';
};


Map.prototype.getClosestCell = function(x,y) {
	var mapDimensions = this.getDimensions();
	// go over all cells to find the closest one. TODO: a better data structure would make this faster
	var bestDistance = 999999;
	var bestCell = null;
	for (var i=0; i<this.cells.length; ++i) {
		var cellPosition = this.cellPositions[i];
		var cellX = cellPosition.x * mapDimensions.width;
		var cellY = cellPosition.y * mapDimensions.height;
		var distance = Math.sqrt(Math.pow(cellX-x,2) + Math.pow(cellY-y,2));
		if (distance < bestDistance) {
			bestDistance = distance;
			bestCell = this.cells[i];
		}
	}
}