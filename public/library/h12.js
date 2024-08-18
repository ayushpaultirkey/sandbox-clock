window.$fx = {};

/**
    * H12 component class
    * @description
    * * Client version: `v2.1.0`
    * * Transform version: `v2.1.0`
    * * Github: https://github.com/ayushpaultirkey/h12
*/
export default class H12 {
    constructor() {
        
        /** @type {string} */
        this.id = crypto.randomUUID();

        /** @type {Element} */
        this.root = null;

        /** @type {any} */
        this.args = {};

        /** @type {H12} */
        this.parent = null;

        /** @type {Object<string, H12>} */
        this.child = {};

        /** @type {Object<string, Element>} */
        this.element = {};

    }

    #binding = {};

    /**
        * Create's a render template for the element
        * @async
        * @returns {Promise<Element | null>}
        * @example
        * async render() {
        *   return <>
        *       <div>Hello world</div>
        *   </>
        * }
        * Will be converted to:
        * async render() {
        *   return this.node("div", ["Hello world"])
        * }
    */
    async render() {
        return this.node("div");
    }

    /**
        * This function is called after component build and is ready to be rendered.
        * @async
        * @param {*} args The arguments passed by the `pre()` function, alternatively it can also be accessed by `this.args`
        * @example
        * async init(args = {}) {
        *   this.set("{color}", "red");
        * }
    */
    async init(args = {}) {}

    /**
        * This function is called after the component is rendered. This only work on root component, the child component wont call this function.
        * To use this you can register a dispatcher event.
        * 
        * @async
        * @example
        * async finally(args = {}) {
        *   console.log(this.id, "loaded !");
        * }
    */
    async finally() {}
    
    /**
        * Preapre the component for rendering and initialize the values.
        * @async
        * @param {string} element The element's query selector
        * @param {*} args The argument to be passed while creating component
        * @returns {Promise<Element, null>}
        * 
        * @example
        * const app = new App();
        * app.pre(".root");
    */
    async pre(element = null, args = {}) {

        // Try and render the component
        try {

            // Create the root element for the component and find the unique id
            this.root = await this.render();
            this.#unique("id", this.element);

            // If the arguments contain child then try to set the {child} key
            // It is usually passed is the component tag have a child element
            if(this.args.child instanceof Element) {
                this.set("{child}", this.args.child);
            }

            // Initialize the component
            await this.init(args);
            
            // If the element is not null then render it
            if(element !== null) {
                document.querySelector(element).appendChild(this.root);
                await this.finally();
            }

            // Else return the root node
            return this.root;

        }
        catch(error) {
            console.error(error);
        };

    }

    /**
        * Create a element to render it along with bindings.
        * 
        * `1 | T`: Text, 
        * `2 | E`:  Element, 
        * `3 | A`:  Attribute
        * 
        * 
        * @param {string} type Element or component name
        * @param {Array<Element|string>} children Array of child elements or string
        * @param {Object<string, string | Function>} attribute Object with key as attribute name and with value
        * @returns {Element}
        * 
        * @example
        * this.node("div", ["Hello world"])
        * this.node("div", ["Hello world"], { class: "bg-red-500" })
        * this.node("div", ["Hello world"], { onclick: () => {} })
    */
    node(type = "", children = [], attributes = {}) {

        const element = document.createElement(type);
        const attributeList = [];

        for(const child of children) {
            
            const childType = typeof(child);

            if(childType === "string") {

                const textNode = document.createTextNode(child);
                element.append(textNode);

                // Match for any possible key
                // If no key then skip other steps
                const textMatch = child.match(/\{[^{}\s]*\}/gm);
                if(!textMatch) {
                    continue;
                }

                // Add binding and continue
                if(typeof(this.#binding[textMatch[0]]) === "undefined") {
                    this.#binding[textMatch[0]] = { element: [], data: "" };
                }
                this.#binding[textMatch[0]].element.push({ node: textNode, type: "T", parent: textNode.parentNode, clone: [] });
                continue;

            }
            else if(childType === "function") {
                element.append(child.bind(this)());
                continue;
            }
            
            element.append(child);

        }

        for(const attribute in attributes) {
            
            const value = attributes[attribute];
            const valueType = typeof(value);

            if(valueType === "string" && value.match(/\{[^{}\s]*\}/gm)) {

                attributeList.push(attribute);

            }
            else if(valueType === "function") {

                const eventName = (attribute.indexOf("on") == 0 ? attribute.replace("on", "") : attribute);
                element.addEventListener(eventName, value.bind(this));
                continue;

            }

            element.setAttribute(attribute, value);

        };

        for(const attribute of attributeList) {

            const value = element.getAttribute(attribute);
            const match = value.match(/\{[^{}\s]*\}/gm);

            if(match) {
                for(const item of match) {

                    if(typeof(this.#binding[item]) === "undefined") {
                        this.#binding[item] = { element: [], data: item };
                    };
                    this.#binding[item].element.push({ node: element, type: "A", name: attribute, map: value });

                }
            }

        }

        return element;

    }

    /**
        * 
        * @param {H12} node 
        * @param {Array<Element> | Function} child
        * @param {any} args
        * @returns {Promise<H12 | undefined>}
    */
    async component(node = null, children = [], args = {}) {

        if(node instanceof Object) {

            /**
             * @type {H12}
            */
            const component = new node();
            component.parent = this;
            component.args = args;
            component.args.child = children[0];

            if(typeof(args.id) !== "undefined") {
                component.id = args.id;
            }

            this.child[(typeof(args.id) !== "undefined") ? args.id : component.id] = component;

            return await component.pre(null, args);

        };

    }

    /**
        * For checking value types.
        * `string`, `boolean`, `number`, `string` returns true
        * @param {*} value 
        * @returns {boolean}
    */
    #valueType(value = "") {
        if(typeof(value) === "bigint" || typeof(value) === "boolean" || typeof(value) === "number" || typeof(value) === "string") {
            return true;
        }
        return false;
    }

    /**
        * Bind events into an element
        * @param {Function} event 
        * @returns {string}
    */
    #eventBind(event = null) {
        const id = crypto.randomUUID();
        $fx[id] = event.bind(this);
        return `$fx['${id}'](event, this);`;
    }
    
    /**
        * 
        * @param {string} key 
        * @param {string | Element | Function} value 
        * @param {H12} component
    */
    set(key = "", value = "", component) {

        if(component) {
            for(const id in this.child) {
                if(this.child[id] instanceof component) {
                    delete this.child[id];
                }
            }
        }

        // Get position index and remove from key
        const index = key.indexOf("++");
        key = key.replace("++", "");

        // Get binding and check it
        const binding = this.#binding[key];
        if(typeof(binding) === "undefined") {
            return null;
        }

        // Check if the value is function, if so then bind the event
        if(typeof(value) === "function") {
            value = this.#eventBind(value);
        }

        // Iterate for all binding elements
        const elements = binding.element;
        for(const element of elements) {

            /** @type {Element} */
            const node = element.node;
            const parent = (element.parent) ? element.parent : node.parentNode;

            if(element.type == "T") {

                // Check if the new value is element or text
                if(value instanceof Element) {

                    // Replace the text node with element
                    parent.replaceChild(value, node);

                    // Update the binding
                    element.type = "E";
                    element.node = value;

                }
                else if(this.#valueType(value)) {

                    // Check for append position and insert text
                    // Avoid updating the binding value
                    if(index < 0) {
                        node.nodeValue = value;
                    }
                    else {
                        node.nodeValue = index === 0 ? value + node.nodeValue : node.nodeValue + value;
                    }

                }

            }
            else if(element.type == "E") {
                
                // Check if the new value is element or text
                if(value instanceof Element) {

                    // Check for position for insertign element
                    let position = (index == 0) ? "afterbegin" : "beforeend";

                    // Check the position defined then append it at certain position and avoid removing clone by `continue`
                    if(index !== -1) {

                        // Append clone and continue
                        parent.insertAdjacentElement(position, value);
                        element.clone.push(value);

                        // Ignore the removing of clones
                        continue;

                    }
                    else {

                        // Replace the current child and update the binding value
                        parent.replaceChild(value, node);
                        element.node = value;

                    }
                    
                }
                else if(this.#valueType(value)) {

                    // Create new text node and replace it with the old node
                    const textNode = document.createTextNode(value);
                    parent.replaceChild(textNode, node);

                    // Update the element binding
                    element.type = "T";
                    element.node = textNode;

                }

                // Remove all clones if the value is not appending or if value type changes
                element.clone.forEach(x => {
                    x.remove();
                })
                element.clone = [];

            }
            else if(element.type == "A") {

                // Get the mapping pattern for the attribute value and match the key
                let elementMapping = element.map;
                let keyMatch = elementMapping.match(/\{[^{}\s]*\}/gm);

                // If the match is success full, then iterate over all keys
                if(keyMatch) {
                    for(const keyFound of keyMatch) {

                        // If the key is same as the current matched key in map then replace
                        // it can ignore other steps
                        if(keyFound === key) {
                            elementMapping = elementMapping.replace(keyFound, value);
                            continue;
                        }

                        // If the binding contain more keys then search for other key's value
                        const subKeyBinding = this.#binding[keyFound];
                        if(typeof(subKeyBinding) === "undefined") {
                            continue;
                        };

                        // Make a new attribute value
                        elementMapping = map.replace(keyFound, subKeyBinding.data);

                    }
                }

                // Set the new attribute value and update the binding data
                node.setAttribute(element.name, elementMapping);
                this.#binding[key].data = value;

            }

        }

    }

    /**
        * Get the value of the key, it will only work it the key is of type attribute
        * @param {string} key 
        * @returns { null | string }
    */
    get(key = "") {
        return typeof(this.#binding[key]) === "undefined" ? undefined : this.#binding[key].data;
    }

    /**
        * Create unique element in the component
        * @param {string} unique 
        * @param {object} store 
    */
    #unique(unique = "id", store = this.element) {

        this.root.querySelectorAll(`[${unique}]`).forEach(x => {
            store[x.getAttribute(unique)] = x;
            x.setAttribute(unique, "x" + Math.random().toString(36).slice(6));
        });
        
    }

    /**
        * Load the component into element
        * @param {H12} component 
        * @param {string} element 
    */
    static async load(component = null, element = null) {
        try {
            const instance = new component();
            await instance.pre(element);
        }
        catch(error) {
            console.error(error);
        }
    }

};