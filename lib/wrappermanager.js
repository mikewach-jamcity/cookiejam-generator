/*
 * Cookie Jam: Wrapper Manager
 * Copyright (c) 2017 Jam City. All rights reserved
 * @author Michael Wach
 */

(function () {
    "use strict";

    /**
     * The Wrapper Manager renders ActionScript classes for 
     * components found within a given document
     * 
     * @constructor
     * @param {Logger} logger
     * @param {Document} document
     * @param {FileManager} fileManager
     * @param {ComponentManager} componentManager
     */
    function WrapperManager(logger, document, fileManager, componentManager) {
        this._logger = logger;
        this._document = document;
        this._fileManager = fileManager;
        this._componentManager = componentManager;
    }

    /**
     * Render Wrapper AS3 using each component inside document
     */
    WrapperManager.prototype.render = function() {
        var wrapper = 
            `/** \n` +
            ` * AUTO GENERATED WRAPPER \n` +
            ` * DO NOT MODIFY THIS CLASS! \n` +
            ` * Extend this class instead \n` +
            ` * @author Adobe Photoshop CC \n` +
            ` */ \n` +
            // todo: maybe nest wrappers package inside ui.popups or ui.elements
            `package com.mobscience.match.ui.wrappers \n` +
            `{ \n` +
                 this._fetchImports() + `\n` +
            `    \n` +
            `    public class ${this._fileManager.getLayoutName(this._document)}Wrapper extends ${this._isPopUp ? "BasePopup" : "UiElement"} \n` +
            `    { \n` +
                     this._fetchMembers() + `\n` +
            `        \n` +
            `        public function ${this._fileManager.getLayoutName(this._document)}Wrapper(callback:Function = null, acceptCallback:Function = null) \n` +
            `        { \n` +
            `            super(); \n` +
            `        } \n` +
            `        \n` +
            `        override protected function createElements():void \n` +
            `        { \n` +
                         this._fetchInitializers() + `\n` +
            `        } \n` +
                     this._fetchButtonCallbacks() +
            `    } \n` +
            `} \n`;
        
        // write wrapper to file
        this._fileManager.writeFileAbsolute(this._fileManager.wrappersPath, wrapper);
    };

    /**
     * Fetch all import strings required for the current components
     * 
     * @return alphabetically sorted import strings
     */
    WrapperManager.prototype._fetchImports = function() {
        // always import layoututils
        var imports = ["com.mobscience.match.ui.LayoutUtils"];
        
        // flag indicating event for button handler required
        var hasButtonHandler = false;

        // add imports for each component type
        this._componentManager.getAllComponents().forEach(function(component){
            // maybe flag for button import
            if(component.type == "Button") hasButtonHandler = true;
            
            // don't try to get class path for layer groups
            if(component.layer.type != "layerSection") {
                // get class path for current component type
                imports.push(this._getClassPathForComponent(component));
            }
        }, this);

        // maybe add button handler event import
        if(hasButtonHandler) imports.push("starling.events.Event");

        // determine base class (UiElement or BasePopup) via document name
        imports.push(this._isPopUp ? "com.mobscience.match.ui.popup.BasePopup" 
                                   : "com.mobscience.match.ui.elements.BaseUiElement");

        // return alphabetically sorted import strings
        return imports.filter(this._unique)
                      .sort()
                      .map((classPath) => `    import ${classPath};`)
                      .join(`\n`);
    };

    /**
     * Fetch all member declaration strings for the current components
     * 
     * @return all component names and class type declarations
     */
    WrapperManager.prototype._fetchMembers = function() {
        var members = [];

        // add member names and class types for each component type
        this._componentManager.getAllComponents().forEach(function(component){
            // don't try to get class type for layer groups
            if(component.layer.type != "layerSection") {
                members.push(`${component.name}:${this._getClassTypeForComponent(component)}`);
            }
        }, this);

        // return all component names and class type declarations
        return members.map(function(member){
            return `        public var _${member};`;
        }).join(`\n`);
    };

    /**
     * Fetch all member instantiation strings for the current components
     * 
     * @return all member instantiation strings
     */
    WrapperManager.prototype._fetchInitializers = function() {
        // return all member instantiation strings
        return this._componentManager
                .getAllComponents()
                // don't try to initialize layer groups
                .filter((component) => component.layer.type != "layerSection")
                .map((component) => `            _${component.name} = LayoutUtils.initAsset("${component.name}", layout, this) as ${this._getClassTypeForComponent(component)};`, this)
                .join(`\n`);
    };

    WrapperManager.prototype._fetchButtonCallbacks = function() {
        // fetch array of unique button callbacks
        var buttons = this._componentManager.getAllComponents().filter(function(value, index, self){
            if(value.type == "Button" || value.type == "ScaleButton" || value.type == "ScaleButtonIcons")
            {
                // skip (existing) onExit callback if extending BasePopUp
                return (value.trig == "onExit" && this._isPopUp) ? false : true;
            }
        }, this);
        var callbacks = buttons.map((component) => component.trig)
                               .filter(this._unique);
        
        // return callback implementation strings
        var result = "";
        callbacks.forEach(function(cb) {
            result = result.concat(`        \n`);
            result = result.concat(`        public function ${cb}(event:Event):void \n`);
            result = result.concat(`        { \n`);
            result = result.concat(`        } \n`);
        });
        return result;
    };

    WrapperManager.prototype._getClassPathForComponent = function(component) {
        switch(component.type) {
            case "Image":
                return "starling.display." + (component.file ? "Image" : "DisplayObject");
            case "Text":
                return "starling.text.TextField";
            case "Button":
                return "com.mobscience.match.ui.elements.buttons.MSButton";
            case "ScaleButton":
                return "com.mobscience.match.ui.elements.buttons.MSScaleButton";
            case "ScaleButtonIcons":
                return "com.mobscience.match.ui.elements.buttons.MSScaleButtonIcons";
        }
    };

    WrapperManager.prototype._getClassTypeForComponent = function(component) {
        switch(component.type) {
            case "Image":
                return component.file ? "Image" : "DisplayObject";
            case "Text":
                return "TextField";
            case "Button":
                return "MSButton";
            case "ScaleButton":
                return "MSScaleButton";
            case "ScaleButtonIcons":
                return "MSScaleButtonIcons";
        }
    };

    /** Utility function for determining if document maps to a popup */
    WrapperManager.prototype._isPopUp = function() {
        this._document.name.toLowerCase().indexOf("popup") != -1;
    };

    /** Utility function for filtering unique items from array */
    WrapperManager.prototype._unique = function(value, index, self) {
        return self.indexOf(value) === index;
    };

    module.exports = WrapperManager;
}());