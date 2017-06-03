/**
 * Created by pb on 02.06.17.
 */

class GeoIP {
    static retrieveOwn(callback) {
        GeoIP.retrieve(callback, '');
    }

    static retrieve(callback, host) {
        var xmlhttp = new XMLHttpRequest();
        var url = 'https://geoip.nimiq-network.com:8443/v1/locate' + (host && host.length > 0 ? '?host=' + host : '');

        xmlhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                var response = JSON.parse(this.responseText);
                callback(response);
            }
        };
        xmlhttp.open('GET', url, true);
        xmlhttp.send();
    }
}