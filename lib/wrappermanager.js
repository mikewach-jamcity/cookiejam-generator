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
     * Render Wrapper AS3 using each layer inside document
     * 
     * @private
     */
    WrapperManager.prototype.render = function() {
        var wrapper = 
            `/** \n` +
            ` * AUTO GENERATED WRAPPER \n` +
            ` * DO NOT MODIFY THIS CLASS! \n` +
            ` * Extend this class instead \n` +
            ` */ \n` +
            // todo: make package using config data
            `package com.mobscience.match.ui.wrappers \n` +
            `{ \n` +
                 this._fetchImports() +
            `    \n` +
            `    public class ${this._fileManager.getLayoutName(this._document)}Wrapper extends BasePopup \n` +
            `    { \n` +
                     this._fetchMembers() +
            `        \n` +
            `        public function ${this._fileManager.getLayoutName(this._document)}Wrapper(callback:Function = null, acceptCallback:Function = null) \n` +
            `        { \n` +
            `            super(); \n` +
            `        } \n` +
            `        \n` +
            `        override protected function createElements():void \n` +
            `        { \n` +
                         this._fetchInitializers() +
            `        } \n` +
                     this._fetchButtonCallbacks() +
            `    } \n` +
            `} \n`;
        
        // write wrapper to file
        console.log("WRAPPERS PATH: " + this._fileManager.wrappersPath);
        this._fileManager.writeFileAbsolute(this._fileManager.wrappersPath, wrapper);
        console.log(wrapper);
    };

    WrapperManager.prototype._fetchImports = function() {
        var result = "";
        // todo: determine member dependencies
        // todo: determine base class via document name
        // todo: check for button handler event reqs
        result = result.concat(`    import com.mobscience.match.ui.popup.BasePopup; \n`);
        return result;
    };

    WrapperManager.prototype._fetchMembers = function() {
        var result = "";
        // todo: determine member types
        // todo: use parsed name instead of layer name
        this._document.layers.layers.forEach(function(layer){
            result = result.concat(`        public var _${layer.name}; \n`);
        });
        return result;
    };

    WrapperManager.prototype._fetchInitializers = function() {
        var result = "";
        // todo: determine member types
        // todo: use parsed name instead of layer name
        this._document.layers.layers.forEach(function(layer){
            result = result.concat(`            _${layer.name} = LayoutUtils.initAsset("${layer.name}", layout, this) as DisplayObject; \n`);
        });
        return result;
    };

    WrapperManager.prototype._fetchButtonCallbacks = function() {
        var result = "";
        // todo: get array of unique button callbacks
        var cbs = [0];
        cbs.forEach(function(cb) {
            result = result.concat(`        \n`);
            result = result.concat(`        public function onButton(event:Event):void \n`);
            result = result.concat(`        { \n`);
            result = result.concat(`        } \n`);
        });
        return result;
    };

    module.exports = WrapperManager;
}());