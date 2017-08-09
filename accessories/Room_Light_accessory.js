var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;
var child_process = require('child_process')
var getStatus = function () {return !!parseInt(child_process.execSync('/usr/local/bin/gpio -1 read 22', {encoding: 'utf8'}), 10)}
var switchOn = function () {return child_process.execSync('light 1')}
var switchOff = function () {return child_process.execSync('light 0')}

// here's a hardware device that we'll expose to HomeKit
var LIGHT_PROPS = {
  powerOn: getStatus(),
  
  setPowerOn: function(on) { 
    console.log("Turning the light %s!", on ? "on" : "off");

    on ? switchOn() :  switchOff()

    LIGHT_PROPS.powerOn = on;
  },
  identify: function() {
    console.log("Identify the light!");
  }
}

// Generate a consistent UUID for our light Accessory that will remain the same even when
// restarting our server. We use the `uuid.generate` helper function to create a deterministic
// UUID based on an arbitrary "namespace" and the word "light".
var lightUUID = uuid.generate('hap-nodejs:accessories:light');

// This is the Accessory that we'll return to HAP-NodeJS that represents our light.
var light = exports.accessory = new Accessory('Light', lightUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
light.username = "1A:2B:3C:4D:5E:FA";
light.pincode = "999-42-000";

// set some basic properties (these values are arbitrary and setting them is optional)
light
  .getService(Service.AccessoryInformation)
  .setCharacteristic(Characteristic.Manufacturer, "Mxtnr")
  .setCharacteristic(Characteristic.Model, "Rev-1")
  .setCharacteristic(Characteristic.SerialNumber, "gpio-25-01");

// listen for the "identify" event for this Accessory
light.on('identify', function(paired, callback) {
  LIGHT_PROPS.identify();
  callback(); // success
});

// Add the actual Lightbulb Service and listen for change events from iOS.
// We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
light
  .addService(Service.Lightbulb, "Room light") // services exposed to the user should have "names" like "Fake Light" for us
  .getCharacteristic(Characteristic.On)
  .on('set', function(value, callback) {
    LIGHT_PROPS.setPowerOn(value);
    callback(); // Our Light is synchronous - this value has been successfully set
  });

// We want to intercept requests for our current power state so we can query the hardware itself instead of
// allowing HAP-NodeJS to return the cached Characteristic.value.
light
  .getService(Service.Lightbulb)
  .getCharacteristic(Characteristic.On)
  .on('get', function(callback) {
    
    // this event is emitted when you ask Siri directly whether your light is on or not. you might query
    // the light hardware itself to find this out, then call the callback. But if you take longer than a
    // few seconds to respond, Siri will give up.
    
    var err = null; // in case there were any problems
    
    if (LIGHT_PROPS.powerOn) {
      console.log("Are we on? Yes.");
      callback(err, true);
    }
    else {
      console.log("Are we on? No.");
      callback(err, false);
    }
  });
