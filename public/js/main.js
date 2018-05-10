// const FACTOR = 1;

// handle to the canvas element
const CANVAS = document.getElementById('canvas');
const HEIGHT = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
const WIDTH = document.body.clientWidth;

let context;

/**
 * Sets up the canvas
 */
function setUpCanvas(){
    CANVAS.height = HEIGHT;
    CANVAS.width = WIDTH;
    context = CANVAS.getContext('2d');
}

/**
 * Loads the image and uses 50% of the canvas with to display it
 */
function loadImage(){

    const image = new Image();

    image.onload = () => {
        if(context.imageSmoothingQuality){
            context.imageSmoothingQuality = 'high';
            context.imageSmoothingEnabled = true;
        }
        const width = WIDTH * 0.5;
        const height = image.height * ((WIDTH * 0.5)/ image.width);
        context.drawImage(image, 0, 0, width, height);
    };

    image.src = 'img/test-01.jpg';
}

/**
 * Main app code
 */
function app(){
    setUpCanvas();
    loadImage();
    ditherImage();
    console.log('done...');
}

app();
