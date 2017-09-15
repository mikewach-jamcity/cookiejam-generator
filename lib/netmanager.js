/*
 * Cookie Jam: Net Manager
 * Copyright (c) 2017 Jam City. All rights reserved
 * @author Michael Wach
 */

(function () {
    "use strict";
    
    var net = require('net'),
        Q = require('q');
    
    NetManager.prototype._port = 8124;
    NetManager.prototype._enabled = false;
    NetManager.prototype._rendering = false;

    /**
     * The Net Manager creates a server for Cookie Jam
     * plugins to communicate with
     * 
     * @constructor
     * @param {Logger} logger
     * @param {RenderManager} renderManager
     */
    function NetManager(logger, stateManager, renderManager) {
        // store constructor params
        this._logger = logger;
        this._stateManager = stateManager;
        this._renderManager = renderManager;

        // bind this scope to event handlers
        this._handleClientConnection = this._handleClientConnection.bind(this);
        this._handleClientData = this._handleClientData.bind(this);
        this._handleClientEnd = this._handleClientEnd.bind(this);
        this._handleServerBound = this._handleServerBound.bind(this);
        this._handleServerError = this._handleServerError.bind(this);
        this._handleStateEnabled = this._handleStateEnabled.bind(this);
        this._handleStateDisabled = this._handleStateDisabled.bind(this);
        this._handleRenderActive = this._handleRenderActive.bind(this);
        this._handleRenderIdle = this._handleRenderIdle.bind(this);

        // start net server
        this._server = net.createServer(this._handleClientConnection);

        // handle error events
        this._server.on('error', this._handleServerError);

        // make server listen to specified port
        this._server.listen(this._port, this._handleServerBound);
        
        // listen for state manager events
        this._enabled = this._stateManager.enabled;
        this._stateManager.on('enabled', this._handleStateEnabled);
        this._stateManager.on('disabled', this._handleStateDisabled);
        
        // listen for render manager events
        this._renderManager.on('active', this._handleRenderActive);
        this._renderManager.on('idle', this._handleRenderIdle);
    }

    NetManager.prototype._handleClientConnection = function(socket) {
        // 'connection' listener
        this._logger.debug('A client was connected');

        // add connection event handlers
        socket.on('end', this._handleClientEnd);
        socket.on('data', this._handleClientData);

        var sendStatus = function() {
            var status = this._enabled ? this._rendering ? "active" : "idle"
                                       : "disabled";
            socket.write(this._makeMessage("status", status));
            this._logger.debug(`SENT: ${this._makeMessage("status", status)}`)
        };

        // send status updates on state manager events
        this._stateManager.on('enabled', sendStatus.bind(this));
        this._stateManager.on('disabled', sendStatus.bind(this));
        
        // send status updates on render manager events
        this._renderManager.on('active', sendStatus.bind(this));
        this._renderManager.on('idle', sendStatus.bind(this));

        // always send status to new client connection
        sendStatus.bind(this)();
    };
    
    NetManager.prototype._handleClientData = function(data) {
        var result = JSON.parse(data);
        switch(result.type) {
            case "request":
                switch(result.data) {
                    case "disable":
                        this._stateManager.deactivate(this._stateManager._activeDocumentId);
                        break;
                    case "enable":
                        this._stateManager.activate(this._stateManager._activeDocumentId);
                        break;
                }
                break;
        }
        this._logger.debug(`RECEIVED: ${JSON.stringify(result)}`);
    };

    NetManager.prototype._handleClientEnd = function() {
        this._logger.debug('A client was disconnected');
    };

    NetManager.prototype._handleServerBound = function() {
        this.online = true;
        this._logger.debug(`Cookie Jam server bound to port ${this._port}`);
    };

    NetManager.prototype._handleServerError = function(err) {
        this._logger.debug(err);
    };

    NetManager.prototype._handleStateEnabled = function() {
        this._enabled = true;
        this._logger.debug("*ENABLED*");
    };

    NetManager.prototype._handleStateDisabled = function() {
        this._enabled = false;
        this._logger.debug("*DISABLED*");
    };

    NetManager.prototype._handleRenderActive = function() {
        this._rendering = true;
        this._logger.debug("*ACTIVE*");
    };

    NetManager.prototype._handleRenderIdle = function() {
        this._rendering = false;
        this._logger.debug("*IDLE*");
    };

    NetManager.prototype._makeMessage = function(type, data) {
        return JSON.stringify({
            type: type,
            data: data
        });
    }

    module.exports = NetManager;
}());