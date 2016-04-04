
var errors = false;

setTimeout(() => {
  if (!window.debug) {
    document.body.innerHTML = "<h4>Looks like there has been an issue with running the game. The issue has been reported, and your browser will refresh</h4>";
    document.body.innerHTML += "<p>If this issue persists, make sure you don't have any plugins that interfere (eg: noscript)</p>";
    window.track("start_failed");
    setTimeout(() => {
      console.log("looks like the game isn't running, reloading.");
      location.reload();
    },3000);
  }
},3000);

window.track = (name, kargs) => {
	if (!kargs)
		kargs = {};
	var xhr = new XMLHttpRequest();
	xhr.open("POST", "http://104.197.78.205:9001/track/event");
	kargs.name = "badmars_watchdog_" + name;
	console.log('tracking ' + name);
	console.log(kargs);
	xhr.send(JSON.stringify(kargs));

}

window.onerror = (msg, url, line, col, error) => {
  errors = true;
	var body = {
		msg: msg,
		url: url,
		line: line,
		col: col
	}
	window.track("error", body);
	fireBusEvent('error');
}
