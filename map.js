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

class HexagonMap {
	constructor(svgElement) {
        this._svg = svgElement;
        // temporarily unhide all the hexagons to get the bounding rects
        svgElement.classList.remove('hide-hexagons');
        var mapDimensions = this.getDimensions(); // also enforces a style update
        this._hexagonDiameter = 0;
        var hexagons = svgElement.querySelectorAll('polygon');
        for (var i = 0; i < hexagons.length; ++i) {
            hexagons[i].cellId = i;
            var boundingBox = hexagons[i].getBoundingClientRect();
            // values relative to map width / height such that they work also when we resize the map
            hexagons[i].centerX = (boundingBox.left + boundingBox.width/2 - mapDimensions.left) / mapDimensions.width;
            hexagons[i].centerY = (boundingBox.top + boundingBox.height/2 - mapDimensions.top) / mapDimensions.height;
            // the hexagons differ very slightly in size, so we take the biggest
            this._hexagonDiameter = Math.max(this._hexagonDiameter, boundingBox.width / mapDimensions.width);
        }
        this._cells = hexagons;
        this._links = [];
        // after we got the hexagon bounding rects, we can hide them again
        svgElement.classList.add('hide-hexagons');
	}

    getDimensions() {
        return this._svg.getBoundingClientRect();
    }

    unhighlightCell(cell) {
        cell.setAttribute('class', '');
        cell.data = null;
    }

    highlightCell(cell, className, data) {
        cell.setAttribute('class', className);

        if (className === 'own-peer') {
            // put my own cell on top of everything else. In svg the stacking is not affected by z-index, but
            // only by document order. So we make the cell the last child
            cell.parentElement.appendChild(cell);
        }

        // XXX another hack
        if (data) {
            cell.data = data;
        }
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
        point.x = Math.max(0, point.x - 0.07045675413022352*fullMapWidth);
        point.y = Math.max(0, point.y - 0.012380952380952381*fullMapHeight);
        return point;
    }

    _getClosestCell(x, y) {
        var mapDimensions = this.getDimensions();
        var bestDistance = 0;
        var bestCell = null;
        for (var i = 0; i < this._cells.length; ++i) {
        	// Calculate position from bounding box.
        	var cell = this._cells[i];
            var centerX = cell.centerX * mapDimensions.width;
            var centerY = cell.centerY * mapDimensions.height;
            var xDist = centerX - x;
            var yDist = centerY - y;
            var distance = xDist*xDist + yDist*yDist;

            // Update best cell accordingly.
            if (!bestCell || distance < bestDistance) {
            	bestDistance = distance;
            	bestCell = cell;
			}
        }
        // Return best cell only if its distance in terms of cells is not too far.
        var hexagonDiameter = this._hexagonDiameter * mapDimensions.width;
        return bestDistance > HexagonMap.MAX_CELL_DISTANCE * hexagonDiameter ? null : bestCell;
    }

    getCellByLocation(latitude, longitude) {
        var convertedCoordinates = this._convertCoordinates(latitude, longitude);
        var closestCell = this._getClosestCell(convertedCoordinates.x, convertedCoordinates.y);
		return closestCell;
	}

    addLink(startCell, endCell) {
        if (!startCell || !endCell) {
            return;
        }
        // search whether we already drew that link
        for (var i=0, link; link = this._links[i]; ++i) {
            if (link.start === startCell && link.end === endCell
                || link.end === startCell && link.start === endCell) {
                return;
            }
        }
        // draw the link
        var svgBoundingRect = this.getDimensions();
        var viewBox = this._svg.viewBox;
        var viewBoxWidth = viewBox.baseVal.width;
        var viewBoxHeight = viewBox.baseVal.height;
        var pathEl = document.createElementNS(this._svg.namespaceURI, 'path');  
        var path = 'M'+(startCell.centerX*viewBoxWidth)+' '+(startCell.centerY*viewBoxHeight)
            +'L'+(endCell.centerX*viewBoxWidth)+' '+(endCell.centerY*viewBoxHeight);
        pathEl.setAttributeNS(null,'d', path);
        pathEl.classList.add('link');
        this._links.push({
            start: startCell,
            end: endCell,
            path: pathEl
        });
        // insert the path before the startCell such that it will not be drawn over the startCell
        startCell.parentElement.insertBefore(pathEl, startCell);
    }

    removeLink(startCell, endCell) {
        for (var i=0, link; link = this._links[i]; ++i) {
            if (link.start === startCell && link.end === endCell
                || link.end === startCell && link.start === endCell) {
                // we found the link
                startCell.parentElement.removeChild(link.path);
                this._links.splice(i, 1);
                return;
            }
        }
    }
}
HexagonMap.MAX_CELL_DISTANCE = 12; // in terms of cells


class PeerDescUI {
    constructor() {
        this._container = document.querySelector('.peer-desc');
        this._iconBrowser = document.querySelector('.peer-desc .browser');
        this._iconBackbone = document.querySelector('.peer-desc .backbone');
        this._text = document.querySelector('.peer-desc .peer-desc-text');
    }

    _setNodeType(isBrowser) {
        if (isBrowser) {
            this._iconBrowser.style.display = 'inline-block';
            this._iconBackbone.style.display = 'none';
        } else {
            this._iconBrowser.style.display = 'none';
            this._iconBackbone.style.display = 'inline-block';
        }
    }

    show(desc) {
        const isBrowser = desc.protocol === Nimiq.Protocol.RTC;
        this._setNodeType(isBrowser);
        const nodeType = isBrowser ? 'Browser' : 'Backbone';
        this._text.innerHTML = `<b>${desc.status} ${nodeType}</b><br>${desc.country} ${desc.city}<br><small>${desc.addr || '&nbsp;'}</small>`;
        this._container.style.opacity = 1;
    }

    hide() {
        this._container.style.opacity = 0;
    }
}

class CellCounter {
    constructor() {
        this._cellCount = {};
    }

    incCellCount(cell) {
        if (!this._cellCount[cell.cellId]) {
            this._cellCount[cell.cellId] = 0;
        }
        this._cellCount[cell.cellId]++;
    }

    decCellCount(cell) {
        if (!this._cellCount[cell.cellId]) {
            this._cellCount[cell.cellId] = 0;
        }
        if (this._cellCount[cell.cellId] > 0) {
            return --this._cellCount[cell.cellId];
        }
        return 0;
    }

    getCellCount(cell) {
        return this._cellCount[cell.cellId] || 0;
    }
}

class MapUI {
    constructor($) {
        this._mapElem = document.querySelector('#map svg');
        this._map = new HexagonMap(this._mapElem);
        this.$ = $;
        this._polledPeers = new Nimiq.HashSet(peer => this._getPeerHost(peer));
        this._polledPeersToDisplay = [];
        this._polledPeerDisplayIntervall = null;
        this._connectedPeers = new Nimiq.HashMap();
        this._knownPeers = new Nimiq.HashMap();
        this._cellCountKnown = new CellCounter();
        this._cellCountConnected = new CellCounter();
        this._peerDescUI = new PeerDescUI();

        $.network.on('peer-joined', peer => this._onPeerJoined(peer));
        $.network.on('peer-left', peer => this._onPeerLeft(peer));

        GeoIP.retrieveOwn(response => this._highlightOwnPeer(response));

        this._mapElem.onmousemove = e => this._mapHighlight(e);
    }

    fadeIn() {
        this._mapElem.style.opacity = 1;
        this._polledPeers.addAll(Nimiq.GenesisConfig.SEED_PEERS
            .concat(this.$.network._addresses.query(Nimiq.Protocol.WSS | Nimiq.Protocol.WS | Nimiq.Protocol.RTC,
                Nimiq.Services.NANO | Nimiq.Services.LIGHT | Nimiq.Services.FULL))
            .filter(peerAddress => !!this._getPeerHost(peerAddress)));
        this._polledPeersToDisplay = this._polledPeers.values();
        this.$.network._addresses.on('added', peers => {
            for (const peer of peers) {
                const hostOrIp = this._getPeerHost(peer);
                if (hostOrIp && !this._polledPeers.contains(peer)) {
                    this._polledPeers.add(peer);
                    this._polledPeersToDisplay.push(peer);
                }
            }
            this._displayPolledPeers();
        });
        this._displayPolledPeers();
    }

    _mapHighlight(e) {
        if (e.target.data) {
            const data = e.target.data;
            this._peerDescUI.show(data);
        } else {
            this._peerDescUI.hide();
        }
    }

    _getPeerHost(peer) {
        const peerAddress = peer.peerAddress || peer;
        if (peerAddress.protocol === Nimiq.Protocol.WS || peerAddress.protocol === Nimiq.Protocol.WSS) {
            return peerAddress.host;
        } else if (peerAddress.netAddress && !peerAddress.netAddress.isPrivate()) {
            return peerAddress.netAddress.toString();
        } else {
            return null;
        }
    }

    _onPeerJoined(peer) {
        var host = this._getPeerHost(peer);
        if (host && !this._connectedPeers.contains(host)) {
            GeoIP.retrieve(response => this._highlightConnectedPeer(peer.peerAddress.protocol, host, response), host);
        }
    }

    _onPeerLeft(peer) {
        var host = this._getPeerHost(peer);
        if (!host) return;

        var cell = this._connectedPeers.get(host);
        if (cell) {
            // Only remove highlight if there are no more peers on this cell.
            if (this._cellCountConnected.decCellCount(cell) === 0) {
                // Either change class if there are still known peers there.
                if (this._cellCountKnown.getCellCount(cell) > 0) {
                    this._map.highlightCell(cell, 'known-peer', undefined);
                }
                // Or remove class at all.
                else {
                    this._map.unhighlightCell(cell);
                }
                this._map.removeLink(this._ownCell, cell);
            }
            this._connectedPeers.remove(host);
        }
    }

    _noise() {
        return 0; //(1 - Math.random() * 2) * 0.9;
    }

    _highlightOwnPeer(response) {
        if (response && response.location && response.location.latitude) {
            var loc = response.location;
            var locDesc = this._responseToDesc(response, Nimiq.Protocol.RTC, null, 'My');
            var cell = this._map.getCellByLocation(loc.latitude, loc.longitude);
            if (cell) {
                this._ownCell = cell;
                this._map.highlightCell(cell, 'own-peer', locDesc);
                this._cellCountConnected.incCellCount(cell);
                var connectedPeersCells = this._connectedPeers.values();
                for (var i = 0, peerCell; peerCell = connectedPeersCells[i]; ++i) {
                    this._map.addLink(cell, peerCell);
                }
            }
        }
    }

    _highlightConnectedPeer(protocol, addr, response) {
        if (response && response.location && response.location.latitude) {
            var loc = response.location;
            var locDesc = this._responseToDesc(response, protocol, addr, 'Connected');
            var cell = this._map.getCellByLocation(loc.latitude + this._noise(), loc.longitude + this._noise());
            if (cell) {
                if (this._ownCell !== cell) {
                    // do not highlight own cell
                    this._map.highlightCell(cell, 'connected-peer', locDesc);
                }
                this._connectedPeers.put(addr, cell);
                this._cellCountConnected.incCellCount(cell);
                this._map.addLink(this._ownCell, cell);
            }
        }
    }

    _responseToDesc(response, protocol, addr, status) {
        return {
            status: status,
            city: response.city ? response.city : '',
            country: response.country ? isoCountries[response.country] : '',
            protocol: protocol,
            addr: addr
        }
    }

    _highlightKnownPeer(protocol, addr, response) {
        if (response && response.location && response.location.latitude) {
            var loc = response.location;
            var locDesc = this._responseToDesc(response, protocol, addr, 'Available');
            var cell = this._map.getCellByLocation(loc.latitude + this._noise(), loc.longitude + this._noise());
            if (cell) {
                var numKnown = this._knownPeers.length;
                this._knownPeers.put(addr, cell);
                this._cellCountKnown.incCellCount(cell);
                // Highlight only if necessary.
                if (this._cellCountConnected.getCellCount(cell) === 0) {
                    this._map.highlightCell(cell, 'known-peer', locDesc);
                }
                // If too many are already highlighted, remove a random one.
                if (numKnown >= MapUI.KNOWN_PEERS_MAX) {
                    var i = Math.floor(Math.random() * numKnown);
                    var addr = this._knownPeers.keys()[i];
                    var cell = this._knownPeers.get(addr);
                    this._knownPeers.remove(addr);
                    this._cellCountKnown.decCellCount(cell);
                    // If we now have neither connected nor known peers, remove highlight.
                    if (this._cellCountKnown.getCellCount(cell) === 0 && this._cellCountConnected.getCellCount(cell) === 0) {
                        this._map.unhighlightCell(cell);
                    }
                    // Otherwise, we either have a connected peer -> do not change the class.
                    // Or we still have known peers -> do not change the class.
                }
            }
        }
    }

    _displayPolledPeers() {
        if (this._polledPeersToDisplay.length === 0) {
            window.clearInterval(this._polledPeerDisplayIntervall);
            this._polledPeerDisplayIntervall = null;
            return;
        }
        const peer = this._polledPeersToDisplay.shift(); // remove the entry from the _polledPeersToDisplay list but not
        // from the HashSet _polledPeers to avoid that a new draw gets triggered when added again
        const hostOrIp = this._getPeerHost(peer);
        GeoIP.retrieve(response => this._highlightKnownPeer(peer.protocol, hostOrIp, response), hostOrIp);
        if (this._polledPeerDisplayIntervall === null) {
            this._polledPeerDisplayIntervall = window.setInterval(() => this._displayPolledPeers(),
                MapUI.REFRESH_INTERVAL);
        }
    }
}
MapUI.KNOWN_PEERS_MAX = 500;
MapUI.REFRESH_INTERVAL = 1000;


/*************************** Country Codes *************************************************************/


var isoCountries = {
    'AF': 'Afghanistan',
    'AX': 'Aland Islands',
    'AL': 'Albania',
    'DZ': 'Algeria',
    'AS': 'American Samoa',
    'AD': 'Andorra',
    'AO': 'Angola',
    'AI': 'Anguilla',
    'AQ': 'Antarctica',
    'AG': 'Antigua And Barbuda',
    'AR': 'Argentina',
    'AM': 'Armenia',
    'AW': 'Aruba',
    'AU': 'Australia',
    'AT': 'Austria',
    'AZ': 'Azerbaijan',
    'BS': 'Bahamas',
    'BH': 'Bahrain',
    'BD': 'Bangladesh',
    'BB': 'Barbados',
    'BY': 'Belarus',
    'BE': 'Belgium',
    'BZ': 'Belize',
    'BJ': 'Benin',
    'BM': 'Bermuda',
    'BT': 'Bhutan',
    'BO': 'Bolivia',
    'BA': 'Bosnia And Herzegovina',
    'BW': 'Botswana',
    'BV': 'Bouvet Island',
    'BR': 'Brazil',
    'IO': 'British Indian Ocean Territory',
    'BN': 'Brunei Darussalam',
    'BG': 'Bulgaria',
    'BF': 'Burkina Faso',
    'BI': 'Burundi',
    'KH': 'Cambodia',
    'CM': 'Cameroon',
    'CA': 'Canada',
    'CV': 'Cape Verde',
    'KY': 'Cayman Islands',
    'CF': 'Central African Republic',
    'TD': 'Chad',
    'CL': 'Chile',
    'CN': 'China',
    'CX': 'Christmas Island',
    'CC': 'Cocos (Keeling) Islands',
    'CO': 'Colombia',
    'KM': 'Comoros',
    'CG': 'Congo',
    'CD': 'Congo, Democratic Republic',
    'CK': 'Cook Islands',
    'CR': 'Costa Rica',
    'CI': 'Cote D\'Ivoire',
    'HR': 'Croatia',
    'CU': 'Cuba',
    'CY': 'Cyprus',
    'CZ': 'Czech Republic',
    'DK': 'Denmark',
    'DJ': 'Djibouti',
    'DM': 'Dominica',
    'DO': 'Dominican Republic',
    'EC': 'Ecuador',
    'EG': 'Egypt',
    'SV': 'El Salvador',
    'GQ': 'Equatorial Guinea',
    'ER': 'Eritrea',
    'EE': 'Estonia',
    'ET': 'Ethiopia',
    'FK': 'Falkland Islands (Malvinas)',
    'FO': 'Faroe Islands',
    'FJ': 'Fiji',
    'FI': 'Finland',
    'FR': 'France',
    'GF': 'French Guiana',
    'PF': 'French Polynesia',
    'TF': 'French Southern Territories',
    'GA': 'Gabon',
    'GM': 'Gambia',
    'GE': 'Georgia',
    'DE': 'Germany',
    'GH': 'Ghana',
    'GI': 'Gibraltar',
    'GR': 'Greece',
    'GL': 'Greenland',
    'GD': 'Grenada',
    'GP': 'Guadeloupe',
    'GU': 'Guam',
    'GT': 'Guatemala',
    'GG': 'Guernsey',
    'GN': 'Guinea',
    'GW': 'Guinea-Bissau',
    'GY': 'Guyana',
    'HT': 'Haiti',
    'HM': 'Heard Island & Mcdonald Islands',
    'VA': 'Holy See (Vatican City State)',
    'HN': 'Honduras',
    'HK': 'Hong Kong',
    'HU': 'Hungary',
    'IS': 'Iceland',
    'IN': 'India',
    'ID': 'Indonesia',
    'IR': 'Iran, Islamic Republic Of',
    'IQ': 'Iraq',
    'IE': 'Ireland',
    'IM': 'Isle Of Man',
    'IL': 'Israel',
    'IT': 'Italy',
    'JM': 'Jamaica',
    'JP': 'Japan',
    'JE': 'Jersey',
    'JO': 'Jordan',
    'KZ': 'Kazakhstan',
    'KE': 'Kenya',
    'KI': 'Kiribati',
    'KR': 'Korea',
    'KW': 'Kuwait',
    'KG': 'Kyrgyzstan',
    'LA': 'Lao People\'s Democratic Republic',
    'LV': 'Latvia',
    'LB': 'Lebanon',
    'LS': 'Lesotho',
    'LR': 'Liberia',
    'LY': 'Libyan Arab Jamahiriya',
    'LI': 'Liechtenstein',
    'LT': 'Lithuania',
    'LU': 'Luxembourg',
    'MO': 'Macao',
    'MK': 'Macedonia',
    'MG': 'Madagascar',
    'MW': 'Malawi',
    'MY': 'Malaysia',
    'MV': 'Maldives',
    'ML': 'Mali',
    'MT': 'Malta',
    'MH': 'Marshall Islands',
    'MQ': 'Martinique',
    'MR': 'Mauritania',
    'MU': 'Mauritius',
    'YT': 'Mayotte',
    'MX': 'Mexico',
    'FM': 'Micronesia, Federated States Of',
    'MD': 'Moldova',
    'MC': 'Monaco',
    'MN': 'Mongolia',
    'ME': 'Montenegro',
    'MS': 'Montserrat',
    'MA': 'Morocco',
    'MZ': 'Mozambique',
    'MM': 'Myanmar',
    'NA': 'Namibia',
    'NR': 'Nauru',
    'NP': 'Nepal',
    'NL': 'Netherlands',
    'AN': 'Netherlands Antilles',
    'NC': 'New Caledonia',
    'NZ': 'New Zealand',
    'NI': 'Nicaragua',
    'NE': 'Niger',
    'NG': 'Nigeria',
    'NU': 'Niue',
    'NF': 'Norfolk Island',
    'MP': 'Northern Mariana Islands',
    'NO': 'Norway',
    'OM': 'Oman',
    'PK': 'Pakistan',
    'PW': 'Palau',
    'PS': 'Palestinian Territory, Occupied',
    'PA': 'Panama',
    'PG': 'Papua New Guinea',
    'PY': 'Paraguay',
    'PE': 'Peru',
    'PH': 'Philippines',
    'PN': 'Pitcairn',
    'PL': 'Poland',
    'PT': 'Portugal',
    'PR': 'Puerto Rico',
    'QA': 'Qatar',
    'RE': 'Reunion',
    'RO': 'Romania',
    'RU': 'Russian Federation',
    'RW': 'Rwanda',
    'BL': 'Saint Barthelemy',
    'SH': 'Saint Helena',
    'KN': 'Saint Kitts And Nevis',
    'LC': 'Saint Lucia',
    'MF': 'Saint Martin',
    'PM': 'Saint Pierre And Miquelon',
    'VC': 'Saint Vincent And Grenadines',
    'WS': 'Samoa',
    'SM': 'San Marino',
    'ST': 'Sao Tome And Principe',
    'SA': 'Saudi Arabia',
    'SN': 'Senegal',
    'RS': 'Serbia',
    'SC': 'Seychelles',
    'SL': 'Sierra Leone',
    'SG': 'Singapore',
    'SK': 'Slovakia',
    'SI': 'Slovenia',
    'SB': 'Solomon Islands',
    'SO': 'Somalia',
    'ZA': 'South Africa',
    'GS': 'South Georgia And Sandwich Isl.',
    'ES': 'Spain',
    'LK': 'Sri Lanka',
    'SD': 'Sudan',
    'SR': 'Suriname',
    'SJ': 'Svalbard And Jan Mayen',
    'SZ': 'Swaziland',
    'SE': 'Sweden',
    'CH': 'Switzerland',
    'SY': 'Syrian Arab Republic',
    'TW': 'Taiwan',
    'TJ': 'Tajikistan',
    'TZ': 'Tanzania',
    'TH': 'Thailand',
    'TL': 'Timor-Leste',
    'TG': 'Togo',
    'TK': 'Tokelau',
    'TO': 'Tonga',
    'TT': 'Trinidad And Tobago',
    'TN': 'Tunisia',
    'TR': 'Turkey',
    'TM': 'Turkmenistan',
    'TC': 'Turks And Caicos Islands',
    'TV': 'Tuvalu',
    'UG': 'Uganda',
    'UA': 'Ukraine',
    'AE': 'United Arab Emirates',
    'GB': 'United Kingdom',
    'US': 'United States',
    'UM': 'United States Outlying Islands',
    'UY': 'Uruguay',
    'UZ': 'Uzbekistan',
    'VU': 'Vanuatu',
    'VE': 'Venezuela',
    'VN': 'Viet Nam',
    'VG': 'Virgin Islands, British',
    'VI': 'Virgin Islands, U.S.',
    'WF': 'Wallis And Futuna',
    'EH': 'Western Sahara',
    'YE': 'Yemen',
    'ZM': 'Zambia',
    'ZW': 'Zimbabwe'
};
