(function() {

    /**
     * The 'this' keyword is pointing to the window object, which means we're
     * attaching our constructor to the global scope.
     */
    this.Smudge = function(elems, options) {
        this.shapes = [];

        var self = this;
        forEach(document.querySelectorAll(elems), function(canvasIndex, element) {
            initSmudge.apply(element, [canvasIndex, element, options, self]);
            self.shapes.push([]);
        });
    }

    function initSmudge(canvasIndex, element, options, smudge) {
        'use strict';

        /* establish our default settings, override if any provided */
        var settings = extendDefaults({
            imageUrl: this.getAttribute('data-image-url'),
            borderColor: 'rgb(255, 255, 255)',
            fillColor: 'rgba(0, 0, 0, 0.3)',
            annotation: false
        }, options);

        /* create the canvas where the drawing will take place */
        var drawingCanvas = document.createElement('canvas');
        var drawingCtx = drawingCanvas.getContext('2d');

        /* put our savedShapes on another canvas,
         * so we don't have to redraw them every time something changes
         * on the main canvas */
        var savedCanvas = document.createElement('canvas');
		var savedCtx = savedCanvas.getContext('2d');

        var canvasContainer = element;

        /* here we will store the coordinates of the shape currently being drawn */
        var activeShape = [];
        /* here we will store any annotations the user adds to the finished shapes */
        var annotations = [];

        /* set the canvas size to that of the provided image */
        setCanvasImage();

        /* we're all set, allow the user to start marking
         * by setting up the drawing events */
        drawingCanvas.addEventListener('mousedown', startDraw);
        drawingCanvas.addEventListener('mouseup', stopDraw);
        drawingCanvas.addEventListener('dblclick', isPointInShape);

        /**
         * Figure out the size of the image, so we can set the canvases to the same size.
         */
        function setCanvasImage() {
            var image = new Image();
            image.src = settings.imageUrl;

            image.onload = function() {
                /* make the container the same size as the image */
                canvasContainer.style.height = this.height + 'px';
                canvasContainer.style.width = this.width + 'px';
                /* make sure our absolute positioned canvases
                 * are placed relative to the container */
                canvasContainer.style.position = 'relative';

                /* make canvases the same size as the image */
                drawingCanvas.setAttribute('height', image.height);
                drawingCanvas.setAttribute('width', image.width);

                savedCanvas.setAttribute('height', image.height);
                savedCanvas.setAttribute('width', image.width);

                /* position the canvases on the page with CSS */
                drawingCanvas.style.position = 'absolute';
                drawingCanvas.style.top = 0;
                drawingCanvas.style.right = 0;

                savedCanvas.style.background = 'url(' + image.src + ')';
                savedCanvas.style.position = 'absolute';
                savedCanvas.style.top = 0;
                savedCanvas.style.right = 0;

                /* append the resized canvases to the DOM */
                canvasContainer.appendChild(savedCanvas);
                canvasContainer.appendChild(drawingCanvas);
            };
        }

        /**
         * Start the mousemove event so we can draw.
         */
        function startDraw() {
            this.addEventListener('mousemove', checkDistance);
        }

        /**
         * Remove the mousemove event when we're not drawing.
         */
        function stopDraw(e) {
            this.removeEventListener('mousemove', checkDistance);
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

            smudge.shapes[canvasIndex].forEach(function(shape) {

                savedCtx.beginPath();
                /* start drawing the shape from the first coordinate in the array */
                savedCtx.moveTo(shape.coords[0].x, shape.coords[0].y);

                /* go through the array in in sequential order, drawing a line between each point */
                shape.coords.forEach(function(point) {
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
            /* the newest shape containing the coordinate */
            var selectedShape = {};

            drawingCtx.lineWidth = 2;

            smudge.shapes[canvasIndex].forEach(function(shape) {
                drawingCtx.beginPath();
                /* start the shape at the first coordinate in the array */
                drawingCtx.moveTo(shape.coords[0].x, shape.coords[0].y);

                shape.coords.forEach(function(point) {
                    drawingCtx.lineTo(point.x, point.y);
                });

                /* is the mouse coordinate inside the shape last drawn in the canvas context */
                if (drawingCtx.isPointInPath(mouseX, mouseY)) {
                    /*  */
                    selectedShape.id = shape.id;
                    selectedShape.text = (shape.hasOwnProperty('annotation')) ? shape.annotation : '';
                }

                drawingCtx.closePath();
            });

            /* display the annotation modal if the user-click was inside a shape */
            if (selectedShape.hasOwnProperty('id')) {
                if (settings.annotation == true) {
                    openAnnotationModal(selectedShape.id, selectedShape.text);
                }
            }

        }

        /**
         * Create and open the annotation modal.
         *
         * @return void
         */
        function openAnnotationModal(id, text) {

            var inputModal = new AnnotationModal({
                /* display the text in the input field, if the selected shape already has a annotation saved */
                inputValue: ( (text != '') ? text : '' ),
                /* save the annotation whenever the modal closes */
                onClose: function(event) {
                    saveAnnotation(id, inputModal.getInputValue());
                }
            });

            inputModal.open();
        }

        /**
         * Save a annotation by adding a new property in the shapes object
         * in the savedShapes array.
         * If a annotation property exists but the user has now deleted
         * the text (they submitted an empty input field),
         * then delete the annotation property for that shape.
         *
         * @return void
         */
        function saveAnnotation(id, text) {

            smudge.shapes[canvasIndex].forEach(function(shape) {
                /*  */
                if (shape.id == id) {
                    /* if an annotation has already been saved for this shape,
                     * and the new text provided is empty: delete the shapes annotation property */
                    if (shape.hasOwnProperty('annotation') && text == '') {
                        delete shape.annotation;
                        return;
                    }

                    /*  */
                    if (shape.hasOwnProperty('annotation')) {
                        shape.annotation = text;
                        return;
                    }

                    if (text != '') {
                        /* create an annotation property, with the provided text string, in the shape object */
                        shape.annotation = text;
                    }
                }
            });
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
                smudge.shapes[canvasIndex].push({
                    id: smudge.shapes[canvasIndex].length + 1,
                    coords: activeShape
                });
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
            (activeShape.length > 0) ? activeShape = [] : smudge.shapes[canvasIndex].pop();

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
            smudge.shapes[canvasIndex] = [];

            draw();
            drawSavedShapes();
        }

    } /* end of initSmudge function */

    /* Extend defaults with user options. */
    function extendDefaults(source, properties) {
        var property;
        for (property in properties) {
            if (properties.hasOwnProperty(property)) {
                source[property] = properties[property];
            }
        }
        return source;
    }

    /* forEach method for iterating thorugh NodeLists.
     * Such as the one returned from querySelectorAll */
    function forEach(array, callback, scope) {
        for (var i = 0; i < array.length; i++) {
            /* passes back stuff we need */
            callback.call(scope, i, array[i]);
        }
    }

})();

(function() {

    /**
     * Define our constructor.
     * The 'this' keyword is pointing to the window object, which means we're
     * attaching our constructor to the global scope.
     */
    this.AnnotationModal = function() {
        'use strict';

        /* Create global element references */
        this.modal = null;
        this.annotationForm = null;
        this.annotationInput = null;
        this.overlay = null;

        /* Define option defaults */
        var defaults = {
            className: 'fade-and-drop',
            content: '',
            inputValue: '',
            maxWidth: 400,
            minWidth: 280
        }

        /**
         * The arguments object. This is a magical object inside of every function that contains
         * an array of everything passed to it via arguments. Because we are only expecting
         * one argument, an object containing plugin settings, we check to make sure arguments[0]
         * exists, and that it is indeed an object.
         * -------------------
         * create options by extending defaults with the passed in arguments
         */
        if (arguments[0] && typeof arguments[0] === "object") {
            /* merge the two objects using a privately scoped utility method called extendDefaults */
            this.options = extendDefaults(defaults, arguments[0]);
        }
    }

    /* Extend defaults with user options. */
    function extendDefaults(source, properties) {
        var property;
        for (property in properties) {
            if (properties.hasOwnProperty(property)) {
                source[property] = properties[property];
            }
        }
        return source;
    }


    /**
     * Open the modal.
     */
    AnnotationModal.prototype.open = function() {
        /*
         * Build out our Modal.
         * Call our createMarkup method using the call method, similarly to the way we
         * did in our event binding with bind. We are simply passing the proper value of this to the method.
         */
        createMarkup.call(this);

        /* Initialize our event listeners */
        initializeEvents.call(this);

        /*
         * After adding elements to the DOM, use getComputedStyle
         * to force the browser to recalc and recognize the elements
         * that we just added. This is so that CSS animation has a start point
         */
        window.getComputedStyle(this.modal).height;

        /*
         * Add our open class and check if the modal is taller than the window.
         * If so, our anchored class is also applied.
         */
        this.modal.className =
            this.modal.className + (this.modal.offsetHeight > window.innerHeight ?
                " annotation-modal-open annotation-modal-anchored" : " annotation-modal-open");

        this.overlay.className = this.overlay.className + " annotation-modal-open";
    }

    /**
     * Close the modal by removing the nodes from the DOM when the CSS animation has ended.
     */
    AnnotationModal.prototype.close = function(event) {
        /* stop the form from submitting */
        event.preventDefault();

        /* Store the current value of this */
        var self = this;

        removeEvents.call(this);

        /* Remove the open class name */
        this.modal.className = this.modal.className.replace(" annotation-modal-open", "");
        this.overlay.className = this.overlay.className.replace(" annotation-modal-open", "");

        /*
         * Listen for CSS transitionend event and then
         * Remove the nodes from the DOM
         */
        this.modal.addEventListener('transitionend', function() {
            self.modal.parentNode.removeChild(self.modal);
        });

        this.overlay.addEventListener('transitionend', function() {
            if (self.overlay.parentNode) {
                self.overlay.parentNode.removeChild(self.overlay);
            }
        });

        /* trigger the  */
        if (this.options.hasOwnProperty('onClose')) {
            this.options.onClose();
        }
    }

    /**
     * Public method for getting the value of the input text field.
     */
    AnnotationModal.prototype.getInputValue = function() {
        return this.annotationInput.value;
    }

    /**
     * Build the HTML for the modal.
     */
    function createMarkup() {

        /* Create a DocumentFragment to build with */
        var docFrag = document.createDocumentFragment();

        /* Create modal element */
        this.modal = document.createElement("div");
        this.modal.className = "annotation-modal " + this.options.className;
        this.modal.style.minWidth = this.options.minWidth + "px";
        this.modal.style.maxWidth = this.options.maxWidth + "px";

        /* Create overlay */
        this.overlay = document.createElement("div");
        this.overlay.className = "annotation-modal-overlay " + this.options.classname;
        docFrag.appendChild(this.overlay);

        /* Create content area */
        var contentHolder = document.createElement("div");
        contentHolder.className = "annotation-modal-content";

        /* Create form */
        this.annotationForm = document.createElement("form");
        this.annotationForm.className = 'annotation-modal-form';

        /* Create form input */
        this.annotationInput = document.createElement("input");
        this.annotationInput.setAttribute("type", "text");
        this.annotationInput.setAttribute("placeholder", "What do you see?");
        this.annotationInput.value = this.options.inputValue;
        this.annotationInput.className = 'annotation-modal-input';

        /* Append input to form */
        this.annotationForm.appendChild(this.annotationInput);

        /* Append form to contet area */
        contentHolder.appendChild(this.annotationForm);

        /* Append content area to modal */
        this.modal.appendChild(contentHolder);

        /* Append modal to DocumentFragment */
        docFrag.appendChild(this.modal);

        /* Append DocumentFragment to body */
        document.body.appendChild(docFrag);

        /* automatically put mouse focus inside the input field */
        this.annotationInput.focus();
    }


    function initializeEvents(event) {
        this.overlay.addEventListener(
            /*
             * Call close by using the bind method, which makes sure
             * this will reference the same thing inside our close method,
             * which is our modal object.
             */
            'click', this.close.bind(this)
        );

        this.annotationForm.addEventListener(
            'submit', this.close.bind(this)
        );
    }

    /**
     * Removes event listeners to avoid duplication when the modal
     * is opened and closed multiple times.
     */
    function removeEvents(event) {
        this.overlay.removeEventListener(
            'click', this.close.bind(this)
        );

        this.annotationForm.removeEventListener(
            'submit', this.close.bind(this)
        );
    }

}());
