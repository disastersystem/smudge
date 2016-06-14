(function() {
    // 'use strict';
    
    /**
     * Define our constructor.
     * The 'this' keyword is pointing to the window object, which means we're
     * attaching our constructor to the global scope.
     */
    this.AnnotationModal = function() {
        /* Create global element references */
        this.closeButton = null;
        this.modal = null;
        this.overlay = null;
        this.transitionEnd = transitionSelect(); /* Determine proper prefix */

        // Define option defaults
        var defaults = {
            className: 'fade-and-drop',
            closeButton: true,
            content: "",
            maxWidth: 600,
            minWidth: 280,
            overlay: true
        }

        /**
         * The arguments object. This is a magical object inside of every function that contains
         * an array of everything passed to it via arguments. Because we are only expecting
         * one argument, an object containing plugin settings, we check to make sure arguments[0]
         * exists, and that it is indeed an object.
         */

        // create options by extending defaults with the passed in arugments
        if (arguments[0] && typeof arguments[0] === "object") {
            // merge the two objects using a privately scoped utility method called extendDefaults
            this.options = extendDefaults(defaults, arguments[0]);
        }
    }

    /*# utility method to extend defaults with user options */
    function extendDefaults(source, properties) {
        var property;
        for (property in properties) {
            if (properties.hasOwnProperty(property)) {
                source[property] = properties[property];
            }
        }
        return source;
    }

    /* public */
    AnnotationModal.prototype.open = function() {

        /* Build out our Modal.
         * Call our buildOut method using the call method, similarly to the way we
         * did in our event binding with bind. We are simply passing the proper value of this to the method.
         */
        buildOut.call(this);

        /* Initialize our event listeners */
        initializeEvents.call(this);

        /**
         * After adding elements to the DOM, use getComputedStyle
         * to force the browser to recalc and recognize the elements
         * that we just added. This is so that CSS animation has a start point
         */
        window.getComputedStyle(this.modal).height;

        /**
         * Add our open class and check if the modal is taller than the window
         * If so, our anchored class is also applied
         */
        this.modal.className =
            this.modal.className + (this.modal.offsetHeight > window.innerHeight ?
                " scotch-open scotch-anchored"
                :
                " scotch-open");

        this.overlay.className = this.overlay.className + " scotch-open";
    }


    AnnotationModal.prototype.close = function() {
        /* Store the value of this */
        var self = this;

        /* Remove the open class name */
        this.modal.className = this.modal.className.replace(" scotch-open", "");
        this.overlay.className = this.overlay.className.replace(" scotch-open", "");

        /*
         * Listen for CSS transitionend event and then
         * Remove the nodes from the DOM
         */
        this.modal.addEventListener(this.transitionEnd, function() {
            self.modal.parentNode.removeChild(self.modal);
        });

        this.overlay.addEventListener(this.transitionEnd, function() {
            if (self.overlay.parentNode) self.overlay.parentNode.removeChild(self.overlay);
        });
    }

    function buildOut() {
        var content, contentHolder, input, docFrag;

        /* If content is an HTML string, append the HTML string.
           If content is a domNode, append its content. */
        if (typeof this.options.content === "string") {
            content = this.options.content;
        } else {
            content = this.options.content.innerHTML;
        }

        console.log(this.options.shape);

        /* Create a DocumentFragment to build with */
        docFrag = document.createDocumentFragment();

        /* Create modal element */
        this.modal = document.createElement("div");
        this.modal.className = "scotch-modal " + this.options.className;
        this.modal.style.minWidth = this.options.minWidth + "px";
        this.modal.style.maxWidth = this.options.maxWidth + "px";


        /* If overlay is true, add one */
        if (this.options.overlay === true) {
            this.overlay = document.createElement("div");
            this.overlay.className = "scotch-overlay " + this.options.classname;
            docFrag.appendChild(this.overlay);
        }

        /* Create content area */
        contentHolder = document.createElement("div");
        contentHolder.className = "scotch-content";
        contentHolder.innerHTML = content;

        /* Append content area to modal */
        this.modal.appendChild(contentHolder);


        /* Append modal to DocumentFragment */
        docFrag.appendChild(this.modal);

        /* Append DocumentFragment to body */
        document.body.appendChild(docFrag);
    }


    function initializeEvents() {
        if (this.closeButton) {
            /**
             * Notice we dont just call close, but we use the bind method and
             * pass our reference to this, which references our Modal object.
             * This makes sure that our method has the right context when using the this keyword.
             */
            this.closeButton.addEventListener('click', this.close.bind(this));
        }

        if (this.overlay) {
            this.overlay.addEventListener('click', this.close.bind(this));
        }
    }

    /* Utility method to determine which transistionend event is supported */
    function transitionSelect() {
        var el = document.createElement("div");
        if (el.style.WebkitTransition) return "webkitTransitionEnd";
        if (el.style.OTransition) return "oTransitionEnd";
        return 'transitionend';
    }


}());
