// TODO make these in to UI controls:
const IMAGE_URL = 'img/test-01.jpg';
const STEPS = 1; // minimal 1
const GREYSCALE = false;

// handle to the canvas element
const CANVAS = document.getElementById('canvas');
const HEIGHT = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
const WIDTH = window.innerWidth || document.documentElement.clientWdth || document.body.clientWidth;

let context;

/**
 * Convenience class that holds an RGBa color
 */
class Colour {

    /**
     * Constructs a new Colour instance
     *
     * @param {number} red
     * @param {number} green
     * @param {number} blue
     * @param {number} [alpha]
     */
    constructor(red, green, blue, alpha = 1) {
        this.red = red;
        this.green = green;
        this.blue = blue;
        this.alpha = alpha;
    }

    /**
     * Converts the image to greyscale, i.e. it takes the weighted avarage of
     * the Red, Green and Blue channels. The opacity (alpha) is set to 1 (255)
     *
     * @access public
     * @returns {Colour} the colour object so this method can be chained
     */
    greyScale(){
        const average = 0.3 * this.red + 0.59 * this.green + 0.11 * this.blue;
        this.red = average;
        this.green = average;
        this.blue = average;
        this.alpha = 255;
        return this;
    }
}

/**
 * Sets up the canvas
 */
function setUpCanvas() {
    CANVAS.height = HEIGHT;
    CANVAS.width = WIDTH;
    context = CANVAS.getContext('2d');
}

/**
 * Loads the image and uses 50% of the canvas with to display it
 *
 * @returns {Promise}
 */
async function loadImage() {
    const image = new Image();

    return new Promise((resolve, reject) => {
        image.onload = () => {
            if(context.imageSmoothingQuality) {
                context.imageSmoothingQuality = 'high';
                context.imageSmoothingEnabled = true;
            }
            const width = Math.floor(WIDTH * 0.5);
            const height = Math.floor(image.height * (width / image.width));
            context.drawImage(image, 0, 0, width, height);
            image.width = width;
            image.height = height;
            resolve(image);
        };

        image.onerror = () => {
            reject({error: 'error loading image'});
        };

        image.src = IMAGE_URL;
    });
}

/**
 *
 * @param x
 * @param y
 * @param width
 * @returns {*[]}
 */
function getIndices(x, y, width) {
    const index = y * (width * 4) + x * 4;
    return [index, index + 1, index + 2, index + 3];
}

/**
 * Returns the closest step for the provided value. Step 0 is always included
 * so the number of steps is always steps + 1
 *
 * @param value
 * @param steps
 * @returns {number}
 */
function getClosestStep(value, steps = 1) {
    const max = 255;
    return Math.round(steps * value / max) * Math.floor(max / steps);
}

/**
 * Returns a new Colour object with the colours at the specified x and y
 * coordinate
 *
 * @param {Uint8ClampedArray} imageData.data the colour data in an array with
 * @param {number} imageData.height the height of the image
 * @param {number} imageData.width the width of the image
 * 8-bit unsigned integers clamped to 0-255
 * @param {number} x the x coordinate
 * @param {number} y the y coordinate
 * @returns {Colour} new instance of a Colour object
 */
function getColourAtIndex(imageData, x, y) {
    const indices = getIndices(x, y, imageData.width);
    return new Colour(
        imageData.data[indices[0]],
        imageData.data[indices[1]],
        imageData.data[indices[2]],
        imageData.data[indices[3]]
    );
}

/**
 * Sets the provided Colour object at the provided x and y coordinate in the
 * provided imageData
 *
 * @param {Uint8ClampedArray} imageData.data the colour data in an array with
 * @param {number} imageData.height the height of the image
 * @param {number} imageData.width the width of the image
 * 8-bit unsigned integers clamped to 0-255
 * @param {Colour} colour the colour object to set
 * @param {number} x the x coordinate
 * @param {number} y the y coordinate
 * @returns {void}
 */
function setColourAtIndex(imageData, colour, x, y){
    const indices = getIndices(x, y, imageData.width);
    imageData.data[indices[0]] = colour.red;
    imageData.data[indices[1]] = colour.green;
    imageData.data[indices[2]] = colour.blue;
    imageData.data[indices[3]] = colour.alpha;
}

/**
 * Distributes the errors per colour channel to the surrounding pixels
 *
 * @param {ImageData} imageData the imageData object of the original
 * @param {Colour} colourDifference the difference between original and dithered colour
 * @param {number} x the x coordinate
 * @param {number} y the y coordinate
 * @returns {void}
 */
function distributeErrors(imageData, colourDifference, x, y) {

    /**
     * Adds the colour difference at the provided x and y coordinate
     * @access private
     * @param colour
     * @param fraction
     * @param x
     * @param y
     */
    function addColourDifference(colour, fraction, x, y) {
        if(x < 0 || x > imageData.width || y < 0 || y > imageData.height) {
            return;
        }

        const currentColour = getColourAtIndex(imageData, x, y);
        currentColour.red = currentColour.red + colour.red * fraction;
        currentColour.green = currentColour.green + colour.green * fraction;
        currentColour.blue = currentColour.blue + colour.blue * fraction;
        currentColour.alpha = currentColour.alpha + colour.alpha * fraction;
        setColourAtIndex(imageData, currentColour, x, y);
    }

    addColourDifference(colourDifference, 7 / 16, x + 1, y);
    addColourDifference(colourDifference, 3 / 16, x - 1, y + 1);
    addColourDifference(colourDifference, 5 / 16, x, y + 1);
    addColourDifference(colourDifference, 1 / 16, x + 1, y + 1);
}

/**
 * creates a dithered image from the provided image
 *
 * @param {HTMLElement} image
 */
function ditherImage(image) {
    const imageData = context.getImageData(0, 0, image.width, image.height);
    const ditheredImageData = context.createImageData(imageData);

    for(let y = 0; y < imageData.height; y++) {
        for(let x = 0; x < imageData.width; x++) {
            const currentColour = getColourAtIndex(imageData, x, y);
            const ditheredColour = new Colour(
                getClosestStep(currentColour.red, STEPS),
                getClosestStep(currentColour.green, STEPS),
                getClosestStep(currentColour.blue, STEPS),
                getClosestStep(currentColour.alpha, STEPS),
            );
            const colourDifference = new Colour(
                currentColour.red - ditheredColour.red,
                currentColour.green - ditheredColour.green,
                currentColour.blue - ditheredColour.blue,
                currentColour.alpha - ditheredColour.alpha
            );

            distributeErrors(imageData, colourDifference, x, y);

            if(GREYSCALE){
                ditheredColour.greyScale();
            }
            setColourAtIndex(ditheredImageData, ditheredColour, x,  y);
        }
    }

    context.putImageData(ditheredImageData, imageData.width, 0);

}

/**
 * Main app code
 */
async function app() {
    setUpCanvas();
    const image = await loadImage();
    ditherImage(image);
    console.log('done...');

}

app();
