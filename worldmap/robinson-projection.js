// Ported to Javascript by Nathan Manousos (nathanm@gmail.com) for AFAR Media (http://afar.com)

  // Original ActionScript Code written and owned by Chris Youderian
  // All code is licensed under the GPLv2.  
  // This means that any derivate works that you create using this code must be released under the same license.  
  // If you wish to use this code in a product you want to resell, you need to ask for permission.
  // Contact form available at:  http://www.flashworldmap.com/contactus.php
  // See original posting at: http://www.flashmap.org/robinson-projection-in-as3-gpl/

var Robinson = function(mapWidth, mapHeight, fudgeX, fudgeY){
  // map width and height are asked for because they are what the
  // earthRadius value relies upon. You can use either, as long as
  // the image is sized such that width = height*1.97165551906973 
  // you can use either to do the calculation, but as of now I
  // require both and only use width. both are used in projectToCSS.
  this.mapWidth = mapWidth;
  this.mapHeight = mapHeight;
  this.earthRadius = (mapWidth/2.666269758)/2;
  
  // fudgeX, fudgeY are used to offset points, this is to calibrate
  // the points if they aren't showing up in the right place exactly 
  this.fudgeX = (typeof fudgeX === 'undefined') ? 0 : fudgeX;
  this.fudgeY = (typeof fudgeY === 'undefined') ? 0 : fudgeY;
  
  // these tables are created by robinson and are what the projection is based upon
  this.AA = [0.8487,0.84751182,0.84479598,0.840213,0.83359314,0.8257851,0.814752,0.80006949,0.78216192,0.76060494,0.73658673,0.7086645,0.67777182,0.64475739,0.60987582,0.57134484,0.52729731,0.48562614,0.45167814];
  this.BB = [0,0.0838426,0.1676852,0.2515278,0.3353704,0.419213,0.5030556,0.5868982,0.67182264,0.75336633,0.83518048,0.91537187,0.99339958,1.06872269,1.14066505,1.20841528,1.27035062,1.31998003,1.3523];
};

Robinson.prototype.projectToCSS = function(lat,lng){
  // changes the coordinate system of a projected point to the one CSS uses
  var point = this.project(lat,lng);
  point.x = (point.x + (this.mapWidth/2));
  point.y = ((this.mapHeight/2) - point.y);
  return point;
};

Robinson.prototype.project = function(lat,lng){
  // returns the robinson projected point for a given lat/lng based on
  // the earth radius value determined in the contructor
  
  var roundToNearest = function(roundTo, value){
    return Math.floor(value/roundTo)*roundTo;  //rounds down
  };
  var getSign = function(value){
    return value < 0 ? -1 : 1;
  };
  
	var lngSign = getSign(lng), latSign = getSign(lat); //deals with negatives
	lng = Math.abs(lng); lat = Math.abs(lat); //all calculations positive
  var radian = 0.017453293; //pi/180
  var low = roundToNearest(5, lat-0.0000000001); //want exact numbers to round down
  low = (lat == 0) ? 0 : low; //except when at 0
  var high = low + 5;
  
  // indicies used for interpolation
  var lowIndex = low/5;
  var highIndex = high/5;
  var ratio = (lat-low)/5;

  // interpolation in one dimension
  var adjAA = ((this.AA[highIndex]-this.AA[lowIndex])*ratio)+this.AA[lowIndex];
	var adjBB = ((this.BB[highIndex]-this.BB[lowIndex])*ratio)+this.BB[lowIndex];
	
  //create point from robinson function
  var point = {
    x : (adjAA * lng * radian * lngSign * this.earthRadius) + this.fudgeX,
    y : (adjBB * latSign * this.earthRadius) + this.fudgeY
  };
  
  return point;
  
};