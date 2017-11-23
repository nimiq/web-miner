var _paq = _paq || [];
/* tracker methods like "setCustomDimension" should be called before "trackPageView" */
_paq.push(['trackPageView']);
_paq.push(['enableLinkTracking']);
_paq.push(['enableHeartBeatTimer']);
(function() {
  var u="https://stats.nimiq-network.com/";
  _paq.push(['setTrackerUrl', u+'nimiq.php']);
  _paq.push(['setSiteId', '1']);
  var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
  g.type='text/javascript'; g.async=true; g.defer=true; g.src=u+'nimiq.js'; s.parentNode.insertBefore(g,s);
})();