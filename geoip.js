/**
 * Created by pb on 02.06.17.
 */

class GeoIP {
    static _cached(host) {
        if (!GeoIP._cacheStore) {
            GeoIP._cacheStore = {};
            GeoIP._cacheOrder = [];
        }
        return GeoIP._cacheStore[host];
    }

    static _cache(host, response) {
        if (!GeoIP._cacheStore) {
            GeoIP._cacheStore = {};
            GeoIP._cacheOrder = [];
        }
        // clear cache
        if (GeoIP._cacheOrder.length >= GeoIP.CACHE_MAX_SIZE) {
            var oldestHost = GeoIP._cacheOrder.shift();
            delete GeoIP._cacheStore[oldestHost];
        }
        // save in cache
        GeoIP._cacheStore[host] = response;
        // if not own host, allow to remove
        if (host.length > 0) {
            GeoIP._cacheOrder.push(host);
        }
    }

    static retrieveOwn(callback) {
        GeoIP.retrieve(callback, '');
    }

    static retrieve(callback, host) {
        var response = GeoIP._cached(host);
        if (response) {
            callback(response);
            return;
        }

        if (window.location.origin.indexOf('miner.localhost') !== -1) return;

        var xmlhttp = new XMLHttpRequest();
        var url = 'https://geoip.nimiq-network.com:8443/v1/locate' + (host && host.length > 0 ? '?host=' + host : '');

        xmlhttp.onreadystatechange = function() {
            if (this.readyState === 4 && this.status === 200) {
                var response = JSON.parse(this.responseText);
                if (response.country === 'N/A') response.country = undefined;
                if (response.city === 'N/A') response.city = undefined;
                GeoIP._cache(host, response);
                callback(response);
            }
        };
        xmlhttp.open('GET', url, true);
        xmlhttp.send();
    }
}
GeoIP.CACHE_MAX_SIZE = 1000;
