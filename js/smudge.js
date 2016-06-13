(function($) {
    'use strict';

    $.fn.smudge = function(options) {
        this.each(function(canvasIndex, element) {
            /* first argument sets the context of "this" in the initSmudge function */
            initSmudge.apply(element, [canvasIndex, element, options]);
        });
    };

    function initSmudge(canvasIndex, element, options) {

        /* establish our default settings, override if any provided */
        var settings = $.extend({
            imageUrl: $(this).attr('data-image-url'),
            borderColor: 'rgb(255, 255, 255)',
            fillColor: 'rgba(0, 0, 0, 0.3)'
        }, options);

        /* create the canvas where the drawing will take place */
        var drawingCanvas = $('<canvas>');
        var drawingCtx = drawingCanvas[0].getContext('2d');

        /* put our savedShapes on another canvas,
         * so we don't have to redraw them every time something changes
         * on the main canvas */
        var savedCanvas = $('<canvas>');
		var savedCtx = savedCanvas[0].getContext('2d');

        var canvasContainer = element;

        /* here we will store the coordinates of the shape currently being drawn */
        var activeShape = [];
        /* here we will store the coordinates of the finished shapes */
        var savedShapes = [];

        /* set the canvas size to that of the provided image */
        setCanvasImage();

        /* set the color of the drawing pen and fill based in the colors of the image */
        // setPenColor();

        /* we're all set, allow the user to start marking
         * by setting up the drawing events */
        drawingCanvas.on('mousedown', startDraw);
        drawingCanvas.on('mouseup', stopDraw);
        drawingCanvas.on('dblclick', isPointInShape);


        /**
         * Figure out the size of the image, so we can set the canvases to the same size.
         */
        function setCanvasImage() {
            var image = new Image();
            image.src = settings.imageUrl;

            image.onload = function() {
                /* make container the same size as the image */
                $(canvasContainer).css({
                    height: image.height,
                    width: image.width,
                    /* make sure our absolute positioned canvases
                     * are placed relative to the container */
                    position: 'relative'
                });

                /* make canvases the same size as the image */
                drawingCanvas.attr('height', image.height).attr('width', image.width);
                savedCanvas.attr('height', image.height).attr('width', image.width);

                drawingCanvas.css({
                    position: "absolute",
                    top: 0,
                    right: 0
                });

                savedCanvas.css({
                    background: 'url(' + image.src + ')',
                    position: "absolute",
                    top: 0,
                    right: 0
                });

                /* append the resized canvases to the DOM */
                $(canvasContainer).append(savedCanvas);
                $(canvasContainer).append(drawingCanvas);
            };
        }

        /**
         * Start the mousemove event so we can draw.
         */
        function startDraw() {
            $(this).on('mousemove', checkDistance);
        }

        /**
         * Remove the mousemove event when we're not drawing.
         */
        function stopDraw(e) {
            $(this).off('mousemove');
            /* we're done drawing, save the shape */
            saveShape(e);
        }

        /**
         * Calls the drawing function if the current mouse point
         * is atleast 6 pixels away from the last point (in either the y or x direction).
         *
         * @return {boolean} false
         */
        function checkDistance(e) {
            e.preventDefault();

            var distance;
            var x = e.offsetX;
            var y = e.offsetY;

            for (var i = 0; i < activeShape.length; i++) {
                distance = Math.sqrt(
                    Math.pow(x - activeShape[i].x, 2) + Math.pow(y - activeShape[i].y, 2)
                );

                if (distance < 6) {
                    /* return out of this function since we do not have enough distance */
                    return false;
                }
            }

            /* the new coordinate is atleast 6 pixels away from the previous one,
             * we can save the coordinate and draw the shape again */
            activeShape.push({ x: Math.round(x), y: Math.round(y) });
            draw();
        }

        /**
         * Takes the values from the activeShape array,
         * and draws a line between each point.
         * This function is called from the checkDistance function.
         *
         * @return void
         */
        function draw() {
            /* clear the canvas each time */
            drawingCtx.clearRect(0, 0, drawingCtx.canvas.width, drawingCtx.canvas.height);

            /* do not draw before we have atleast two points to draw a line between */
            if (activeShape.length > 1) {
                drawingCtx.fillStyle = settings.fillColor;
                drawingCtx.strokeStyle = settings.borderColor;
                drawingCtx.lineWidth = 2;

                drawingCtx.beginPath();
                /* start drawing the shape from the first coordinate in the array */
                drawingCtx.moveTo(activeShape[0].x, activeShape[0].y);

                /* go through the array in in sequential order, drawing a line between each point */
                for (var i = 0; i < activeShape.length; i++) {
                    drawingCtx.lineTo(activeShape[i].x, activeShape[i].y);
                }

                drawingCtx.fill();
                drawingCtx.stroke();

                /* close off the path, by drawing a line between the first and last  */
                drawingCtx.closePath();
            }
        }

        /**
         * Draw the all the shapes in the savedShapes array.
         *
         * @return void
         */
         function drawSavedShapes() {
            /* clear the canvas each time */
            savedCtx.clearRect(0, 0, savedCtx.canvas.width, savedCtx.canvas.height);

            savedCtx.fillStyle = 'rgba(0, 100, 0, 0.6)';
            savedCtx.strokeStyle = 'rgba(0, 100, 0, 0.6)';
            savedCtx.lineWidth = 2;

            savedShapes.forEach(function(shape) {

                savedCtx.beginPath();
                /* start drawing the shape from the first coordinate in the array */
                savedCtx.moveTo(shape[0].x, shape[0].y);

                /* go through the array in in sequential order, drawing a line between each point */
                shape.forEach(function(point) {
                    savedCtx.lineTo(point.x, point.y);
                });

                /* close off the path, by drawing a line between the first and last  */
                savedCtx.closePath();

                savedCtx.fill();
                savedCtx.stroke();
            });

        }

        /**
         * Whenever a double click event takes place on the canvas this function
         * checks whether the click is inside a shape.
         *
         * Note: We have to redraw before we can call isPointInPath()
         */
        function isPointInShape(e) {
            /* x and y coordinates of the double click event */
            var mouseX  = e.offsetX;
            var mouseY  = e.offsetY;
            /* number of shapes containing the coordinate */
            var numShapes = 0;

            drawingCtx.lineWidth = 2;

            savedShapes.forEach(function(shape) {
                drawingCtx.beginPath();
                /* start the shape at the first coordinate in the array */
                drawingCtx.moveTo(shape[0].x, shape[0].y);

                shape.forEach(function(point) {
                    drawingCtx.lineTo(point.x, point.y);
                });

                if (drawingCtx.isPointInPath(mouseX, mouseY)) {
                    numShapes++;
                }

                drawingCtx.closePath();
            });

            /* alert the amount of shapes the users double click is inside */
            var plural = (numShapes == 1) ? '' : 's';
            alert('Inside ' + numShapes + ' shape' +  plural);
        }

        /**
         * Save the shape by putting all the points from the activeShape array into the savedShape array,
         * and then emptying the activeShape array.
         *
         * @return void
         */
        function saveShape(e) {
            /* only save the shape if we have atleast 3 points */
            if (activeShape.length > 2) {
                savedShapes.push(activeShape);
            }

            /* remove the current shape now that it's saved */
            activeShape = [];

            /* call draw() to remove the active shape from the canvas */
            draw();
            drawSavedShapes();
        }

        /**
         * Delete one shape, by removing the last array element.
         * If no shapes are saved, empty the active shape.
         *
         * @return void
         */
        function undo() {
            (activeShape.length > 0) ? activeShape = [] : savedShapes.pop();

            draw();
            drawSavedShapes();
        }

        /**
         * Delete the active shape and all saved shapes,
         * and redraw the canvases.
         *
         * @return void
         */
        function reset() {
            activeShape = [];
            savedShapes = [];

            draw();
            drawSavedShapes();
        }

        /**
         * Uses a plugin called color-thief to get the main
         * colors of the image.
         * @param {callback function}
         * @callback callback
         */
        function getImageColors(callback) {
            var image = new Image();
            image.src = settings.imageUrl;

            image.onload = function() {
                var colorThief = new ColorThief();
                var palette = colorThief.getPalette(image, 2);

                callback(palette);
            };
        }

        /**
         * Set the border color and fill color based on the
         * colors found by the color-thief plugin.
         *
         * @return void
         */
        function setPenColor() {
            getImageColors(function(imageColors) {
                var rgb1 = {
                    'r': imageColors[0][0],
                    'g': imageColors[0][1],
                    'b': imageColors[0][2]
                };

                var rgb2 = {
                    'r': imageColors[1][0],
                    'g': imageColors[1][1],
                    'b': imageColors[1][2]
                };

                var color1 = Color().getComplementary(rgb1);
                var color2 = Color().getComplementary(rgb2);

                settings.fillColor = 'rgba(' + color2.r + ', ' + color2.g + ', ' + color2.b + ', 0.5)';
                settings.borderColor = 'rgb(' + color1.r + ', ' + color1.g + ', ' + color1.b + ')';
            });
        }

    } /* end of initSmudge function */

})(jQuery);
