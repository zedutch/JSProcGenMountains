// Document Setup
var canvas = document.getElementById('main-canvas');
var ctx = canvas.getContext('2d');

// RNG
var initialSeed = Math.floor(Math.random() * 100000);
var seed = initialSeed;

// JQuery Elements
var seedInput = $('#seed-input');

// The colors to choose from
var skyColorsTop = ["#6499BE", "#0000FF", "#0000CD", "#87CEEB", "#FA8072", "#FFA07A", "#FF6347"];
var skyColorsBot = ["#E5F2FB", "#FFFFFF", "#ADD8E6", "#FFF0F5", "#FFE4E1"];
var sunColors = ["#FFA500", "#FF8C00", "#DC143C", "#DAA520", "#FFD700", "#F0E68C", "#FAFAD2"];
var mountainColors = [[102, 51, 0], [153, 76, 0], [64, 64, 64], [88, 48, 30]];

// Seeded Random Number Generator, courtesy of http://stackoverflow.com/a/19303725
function random () {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// Return a random element from a given array
function getRandomElement(array) {
	var l = array.length;
	return array[Math.floor(l * random())];
}

// Convert a Hex color to RGB, courtesy of http://stackoverflow.com/a/5624139
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Generate using a random seed
function generateNewMountain () {
	initialSeed = Math.floor(Math.random() * 100000);
	seed = initialSeed;
	
	seedInput.val(initialSeed);
	
	generateMountain();
}

// Generate with a provided seed
function generateSeededMountain () {
	initialSeed = seedInput.val();
	seed = initialSeed;
	
	generateMountain();
}

// Generate with the currently set seed
function generateMountain () {
	// Generate the sky
	var offsetWidth = canvas.width * 3 / 8;
	var offset = random() * offsetWidth * 2 - offsetWidth;
	var sky = ctx.createLinearGradient(canvas.width / 2 + offset, 0, canvas.width / 2, canvas.height);
	
	sky.addColorStop(0, getRandomElement(skyColorsTop));
	sky.addColorStop(1, getRandomElement(skyColorsBot));

	ctx.fillStyle = sky;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	// Initiate mountain generation
	var mountainHeight = [];
	var topHeight = 200 + canvas.height * 2 / 3 * random();
	for (var i = 0; i < canvas.width; i++) {
		var height = 0;
		var distFromCenter = Math.abs(canvas.width / 2 - i);
		height = topHeight - distFromCenter;
		if (height < 0) height = 0;
		mountainHeight.push(height);
	}
	
	// Calculate where snow approx starts on the mountain
	var snowPercentage = 4 / 6;
	var snowStartY = snowPercentage * topHeight;
	var snowEndY = snowPercentage * topHeight;
	var snowOffset = topHeight * 1/6;
	snowStartY += random() * snowOffset - snowOffset / 2;
	snowEndY   += random() * snowOffset - snowOffset / 2;
	var snowStartX = canvas.width;
	var snowEndX = 0;
	
	for (var i = 0; i < canvas.width; i++) {
		var h = mountainHeight[i];
		if (h >= snowStartY && i < snowStartX) {
			snowStartX = i;
		} else if (h >= snowEndY && i > snowEndX) {
			snowEndX = i;
		}
	}
	
	// Generate the snow on top of the mountain
	var snowWidth = snowEndX - snowStartX;
	var snowLine = new Array(snowWidth);
	snowLine[0] = snowStartY;
	snowLine[snowWidth - 1] = snowEndY;
	
	generateSnow(snowLine, 0, snowWidth - 1, offset = snowOffset);
	
	// Draw the sun
	var maxSunOffset = canvas.width / 4;
	var sunOffset = maxSunOffset * 2 * random() - maxSunOffset;
	var sunX = Math.floor(canvas.width / 2 + sunOffset);
	var sunY = mountainHeight[sunX] + 1;
	if (sunY <= canvas.height / 10) {
		sunY = canvas.height / 10 + 1;
	}
	sunY = canvas.height - sunY;
	// Sometimes, raise the sun randomly so it can be above the mountain
	if (random() < 0.25) {
		sunY *= random();
	}
	var sunRadius = canvas.width / 10 * random() + canvas.width / 20;
	var sunColor = getRandomElement(sunColors);
	var c = hexToRgb(sunColor);
	var sunBluriness = 0.1 + random() * 0.9;
	
	var radgrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
	radgrad.addColorStop(0, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ', 1)');
	radgrad.addColorStop(sunBluriness, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ', 0.9)');
	radgrad.addColorStop(1, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ', 0)');
	
	var sunSize = 2 * sunRadius;
	// Make the size slightly bigger for better blurring
	sunSize += 1 / 4 * sunSize;

	// draw shape
	ctx.fillStyle = radgrad;
	ctx.fillRect(sunX - sunSize / 2, sunY - sunSize / 2, sunSize, sunSize);

	// Draw the mountain
	var mountainColor = getRandomElement(mountainColors);
	var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	var pix = imgData.data;
	for (var i = 0, n = pix.length; i < n; i += 4) {
		var pixelNr = Math.floor(i / 4);
		var x = pixelNr % canvas.width;
		var y = canvas.height - Math.floor(pixelNr / canvas.width);
		var height = mountainHeight[x];
		var heightPercentage = (100 + y) / topHeight;
		
		if (height < y) continue;
		
		pix[i    ] = mountainColor[0] * heightPercentage;
		pix[i + 1] = mountainColor[1] * heightPercentage;
		pix[i + 2] = mountainColor[2] * heightPercentage;
		// i+3 is alpha (the fourth element)
		
		// Generate snow
		var snowX = x - snowStartX;
		if (snowX >= 0 && snowX < snowWidth && snowLine[snowX] != undefined) {
			if (y >= snowLine[snowX]) {
				// Make alpha go down the lower you go
				var snowY = y - snowLine[snowX];
				var snowHeight = height - snowLine[snowX];
				// Sigmoid: 1 / (1 + exp(3*(0.3 - x))
				var snowPercentage = 1 / (1 + Math.exp(3 * (0.3 - (1 + snowY) / (1 + snowHeight))))
				
				if (snowPercentage >= 0.9) {
					snowPercentage = 1;
				}
				
				pix[i    ] = 255 * snowPercentage + pix[i    ] * (1 - snowPercentage);
				pix[i + 1] = 255 * snowPercentage + pix[i + 1] * (1 - snowPercentage);
				pix[i + 2] = 255 * snowPercentage + pix[i + 2] * (1 - snowPercentage);
			}
		}
	}
	
	// Swap the image data with the image containing the mountain
	ctx.putImageData(imgData, 0, 0);
}

// Recursively generate the snowline
function generateSnow (snow, x1, x2, offset = 50, offsetChance = 2) {
	var y1 = snow[x1];
	var y2 = snow[x2];
	var newY = Math.floor(y1 + (y2 - y1) / 2);
	var newX = Math.floor(x1 + (x2 - x1) / 2);
	
	if (random() < offsetChance) {
		newY += random() * offset - offset / 2;
	}
	
	snow[newX] = newY;
	
	if (newX > x1 + 1) {
		generateSnow(snow, x1, newX, offsetChance / 2, offset / 2);
	}
	
	if (x2 > newX + 1) {
		generateSnow(snow, newX, x2, offsetChance / 2, offset / 2);
	}
}