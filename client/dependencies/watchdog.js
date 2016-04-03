
setTimeout(() => {
  if (!window.debug) {
    console.log("looks like the game isn't running, reloading.");
    location.reload();
  }
},3000);
