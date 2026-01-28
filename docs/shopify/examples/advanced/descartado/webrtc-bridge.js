/**
 * @fileoverview WebRTC Bridge - Peer-to-Peer Communication Between Browser Tabs
 * @module webrtc-bridge
 * 
 * @description
 * Uses WebRTC DataChannels for direct peer-to-peer communication between browser
 * tabs without server hops. This enables real-time event synchronization across
 * multiple tabs of the same application with minimal latency.
 * 
 * Key Features:
 * - Direct P2P communication between browser tabs
 * - WebSocket signaling server for peer discovery
 * - Automatic reconnection with exponential backoff
 * - BroadcastChannel fallback for unsupported browsers
 * - Ordered data channel delivery
 * - Multi-peer support (mesh topology)
 * 
 * Architecture:
 * 1. Each tab connects to signaling server via WebSocket
 * 2. Peers exchange SDP offers/answers through signaling
 * 3. ICE candidates are relayed for NAT traversal
 * 4. Direct DataChannels are established between peers
 * 5. Events are broadcast to all connected peers
 * 
 * @example
 * // Initialize the bridge
 * const bridge = new WebRTCBridge({
 *   roomId: 'my-shop-events',
 *   signalingUrl: 'wss://signaling.tracklay.com'
 * });
 * 
 * // Listen for events from other tabs
 * bridge.on('event', (data, peerId) => {
 *   console.log('Received from peer:', peerId, data);
 * });
 * 
 * // Send event to all connected tabs
 * bridge.emit({
 *   type: 'cart_updated',
 *   items: [...]
 * });
 * 
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel}
 */

/**
 * Configuration options for WebRTCBridge
 * @typedef {Object} WebRTCBridgeOptions
 * @property {string} [roomId='default'] - Room identifier for peer grouping
 * @property {string} [signalingUrl='wss://signaling.tracklay.com'] - WebSocket signaling server URL
 */

/**
 * Event data structure for cross-tab communication
 * @typedef {Object} BridgeEvent
 * @property {string} type - Event type identifier
 * @property {*} payload - Event payload data
 * @property {string} _sender - Sender peer ID (auto-populated)
 * @property {number} _timestamp - Event timestamp (auto-populated)
 */

/**
 * Signaling message types
 * @typedef {Object} SignalingMessage
 * @property {string} type - Message type: 'join' | 'offer' | 'answer' | 'ice-candidate'
 * @property {string} [roomId] - Room identifier
 * @property {string} [peerId] - Source peer identifier
 * @property {string} [targetPeerId] - Destination peer identifier
 * @property {RTCSessionDescriptionInit} [offer] - SDP offer
 * @property {RTCSessionDescriptionInit} [answer] - SDP answer
 * @property {RTCIceCandidateInit} [candidate] - ICE candidate
 */

/**
 * WebRTC Bridge for P2P communication between browser tabs
 * Manages peer connections, signaling, and event routing
 * 
 * @class WebRTCBridge
 * @example
 * const bridge = new WebRTCBridge({
 *   roomId: 'shop-cart-sync',
 *   signalingUrl: 'wss://signaling.example.com'
 * });
 * 
 * bridge.on('event', (data, peerId) => {
 *   console.log('Event from', peerId, ':', data);
 * });
 */
export class WebRTCBridge {
  /**
   * Creates an instance of WebRTCBridge
   * @constructor
   * @param {WebRTCBridgeOptions} [options={}] - Configuration options
   * @property {string} roomId - Room identifier for peer grouping
   * @property {string} signalingUrl - WebSocket signaling server URL
   * @property {string} peerId - Unique identifier for this peer
   * @property {Map<string, RTCPeerConnection>} peers - Map of peer connections
   * @property {Map<string, RTCDataChannel>} dataChannels - Map of data channels
   * @property {Map<string, Set<Function>>} listeners - Event listeners map
   * @property {number} reconnectAttempts - Current reconnection attempt count
   * @property {WebSocket|null} ws - WebSocket connection
   * @property {BroadcastChannel|null} broadcastChannel - Fallback broadcast channel
   */
  constructor(options = {}) {
    /**
     * Room identifier for grouping peers
     * @type {string}
     */
    this.roomId = options.roomId || 'default';
    
    /**
     * WebSocket signaling server URL
     * @type {string}
     */
    this.signalingUrl = options.signalingUrl || 'wss://signaling.tracklay.com';
    
    /**
     * Unique identifier for this peer instance
     * @type {string}
     */
    this.peerId = this._generatePeerId();
    
    /**
     * Map of peer IDs to RTCPeerConnection instances
     * @type {Map<string, RTCPeerConnection>}
     */
    this.peers = new Map();
    
    /**
     * Map of peer IDs to RTCDataChannel instances
     * @type {Map<string, RTCDataChannel>}
     */
    this.dataChannels = new Map();
    
    /**
     * Map of event names to sets of callback functions
     * @type {Map<string, Set<Function>>}
     */
    this.listeners = new Map();
    
    /**
     * Number of reconnection attempts made
     * @type {number}
     */
    this.reconnectAttempts = 0;
    
    /**
     * WebSocket connection for signaling
     * @type {WebSocket|null}
     */
    this.ws = null;
    
    /**
     * BroadcastChannel for fallback communication
     * @type {BroadcastChannel|null}
     */
    this.broadcastChannel = null;
    
    // Initialize the bridge
    this._init();
  }

  /**
   * Generate unique peer identifier
   * Combines timestamp with random string for uniqueness
   * 
   * @private
   * @function _generatePeerId
   * @returns {string} Unique peer ID
   * @example
   * // Returns: '1706203200000-abc123def-xyz12'
   */
  _generatePeerId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize the WebRTC bridge
   * Checks for WebRTC support and establishes connections
   * Sets up fallback mechanisms
   * 
   * @private
   * @function _init
   * @returns {Promise<void>}
   */
  async _init() {
    if (!this._isSupported()) {
      console.warn('[WebRTCBridge] WebRTC not supported');
      return;
    }
    await this._connectSignaling();
    this._initBroadcastFallback();
  }

  /**
   * Check if WebRTC is supported in current browser
   * Verifies RTCPeerConnection and WebSocket availability
   * 
   * @private
   * @function _isSupported
   * @returns {boolean} True if WebRTC is supported
   */
  _isSupported() {
    return !!(window.RTCPeerConnection && window.WebSocket);
  }

  /**
   * Connect to WebSocket signaling server
   * Handles connection lifecycle and reconnection logic
   * 
   * @private
   * @function _connectSignaling
   * @returns {Promise<void>}
   * @throws {Error} Logs connection errors to console
   */
  async _connectSignaling() {
    try {
      this.ws = new WebSocket(this.signalingUrl);
      
      /**
       * WebSocket open event handler
       * Joins room and resets reconnection counter
       */
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this._sendSignaling({
          type: 'join',
          roomId: this.roomId,
          peerId: this.peerId
        });
      };
      
      /**
       * WebSocket message event handler
       * Routes signaling messages to appropriate handlers
       * @param {MessageEvent} event - WebSocket message event
       */
      this.ws.onmessage = (event) => {
        this._handleSignalingMessage(JSON.parse(event.data));
      };
      
      /**
       * WebSocket close event handler
       * Triggers reconnection attempt
       */
      this.ws.onclose = () => this._attemptReconnect();
      
    } catch (e) {
      console.error('[WebRTCBridge] Signaling failed:', e);
    }
  }

  /**
   * Send signaling message to server
   * Only sends if WebSocket is in OPEN state
   * 
   * @private
   * @function _sendSignaling
   * @param {SignalingMessage} data - Signaling message to send
   * @returns {void}
   */
  _sendSignaling(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /**
   * Handle incoming signaling message
   * Dispatches to appropriate handler based on message type
   * 
   * @private
   * @function _handleSignalingMessage
   * @param {SignalingMessage} msg - Signaling message
   * @returns {Promise<void>}
   */
  async _handleSignalingMessage(msg) {
    switch (msg.type) {
      case 'peer-joined':
        await this._createOffer(msg.peerId);
        break;
      case 'offer':
        await this._handleOffer(msg.peerId, msg.offer);
        break;
      case 'answer':
        await this._handleAnswer(msg.peerId, msg.answer);
        break;
      case 'ice-candidate':
        await this._handleIceCandidate(msg.peerId, msg.candidate);
        break;
    }
  }

  /**
   * Create new RTCPeerConnection for peer
   * Configures ICE servers and event handlers
   * 
   * @private
   * @function _createPeerConnection
   * @param {string} peerId - Remote peer identifier
   * @returns {Promise<RTCPeerConnection>} Configured peer connection
   */
  async _createPeerConnection(peerId) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    /**
     * ICE candidate event handler
     * Sends candidates to remote peer via signaling
     * @param {RTCPeerConnectionIceEvent} event - ICE candidate event
     */
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this._sendSignaling({
          type: 'ice-candidate',
          targetPeerId: peerId,
          candidate: event.candidate
        });
      }
    };
    
    this.peers.set(peerId, pc);
    return pc;
  }

  /**
   * Create and send SDP offer to peer
   * Initializes data channel and sends connection offer
   * 
   * @private
   * @function _createOffer
   * @param {string} peerId - Target peer identifier
   * @returns {Promise<void>}
   */
  async _createOffer(peerId) {
    const pc = await this._createPeerConnection(peerId);
    
    /**
     * Create ordered data channel for event transmission
     * @type {RTCDataChannel}
     */
    const channel = pc.createDataChannel('events', { ordered: true });
    this._setupDataChannel(peerId, channel);
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    this._sendSignaling({
      type: 'offer',
      targetPeerId: peerId,
      offer: offer
    });
  }

  /**
   * Handle incoming SDP offer from peer
   * Creates answer and sets up data channel listener
   * 
   * @private
   * @function _handleOffer
   * @param {string} peerId - Source peer identifier
   * @param {RTCSessionDescriptionInit} offer - SDP offer
   * @returns {Promise<void>}
   */
  async _handleOffer(peerId, offer) {
    const pc = await this._createPeerConnection(peerId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    
    /**
     * Data channel event handler
     * Called when remote peer creates data channel
     * @param {RTCDataChannelEvent} event - Data channel event
     */
    pc.ondatachannel = (event) => {
      this._setupDataChannel(peerId, event.channel);
    };
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    this._sendSignaling({
      type: 'answer',
      targetPeerId: peerId,
      answer: answer
    });
  }

  /**
   * Handle incoming SDP answer from peer
   * Sets remote description to complete connection
   * 
   * @private
   * @function _handleAnswer
   * @param {string} peerId - Source peer identifier
   * @param {RTCSessionDescriptionInit} answer - SDP answer
   * @returns {Promise<void>}
   */
  async _handleAnswer(peerId, answer) {
    const pc = this.peers.get(peerId);
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  /**
   * Handle incoming ICE candidate from peer
   * Adds candidate to peer connection for NAT traversal
   * 
   * @private
   * @function _handleIceCandidate
   * @param {string} peerId - Source peer identifier
   * @param {RTCIceCandidateInit} candidate - ICE candidate
   * @returns {Promise<void>}
   */
  async _handleIceCandidate(peerId, candidate) {
    const pc = this.peers.get(peerId);
    if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  /**
   * Configure data channel event handlers
   * Sets up message processing and error handling
   * 
   * @private
   * @function _setupDataChannel
   * @param {string} peerId - Peer identifier
   * @param {RTCDataChannel} channel - Data channel instance
   * @returns {void}
   */
  _setupDataChannel(peerId, channel) {
    this.dataChannels.set(peerId, channel);
    
    /**
     * Data channel message event handler
     * Parses JSON and emits to listeners
     * @param {MessageEvent} event - Data channel message event
     */
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this._emit('event', data, peerId);
      } catch (e) {
        console.error('[WebRTCBridge] Parse error:', e);
      }
    };
  }

  /**
   * Emit event to all connected peers
   * Falls back to BroadcastChannel if no P2P connections available
   * 
   * @function emit
   * @param {BridgeEvent|Object} data - Event data to send
   * @returns {number} Number of peers that received the message
   * @example
   * bridge.emit({
   *   type: 'cart_updated',
   *   items: [{ id: 1, qty: 2 }]
   * });
   * // Returns: 2 (sent to 2 peers)
   */
  emit(data) {
    const message = JSON.stringify({ ...data, _sender: this.peerId, _timestamp: Date.now() });
    let sentCount = 0;
    
    for (const [peerId, channel] of this.dataChannels) {
      if (channel.readyState === 'open') {
        channel.send(message);
        sentCount++;
      }
    }
    
    // Fallback to BroadcastChannel if no P2P connections
    if (sentCount === 0 && this.broadcastChannel) {
      this.broadcastChannel.postMessage(data);
    }
    
    return sentCount;
  }

  /**
   * Subscribe to events from other tabs
   * Returns unsubscribe function
   * 
   * @function on
   * @param {string} event - Event name to listen for
   * @param {Function} callback - Event handler callback
   * @param {BridgeEvent} callback.data - Event data
   * @param {string} callback.peerId - Source peer identifier
   * @returns {Function} Unsubscribe function
   * @example
   * const unsubscribe = bridge.on('event', (data, peerId) => {
   *   console.log('Received:', data);
   * });
   * 
   * // Later: unsubscribe()
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event).delete(callback);
  }

  /**
   * Emit event to local listeners
   * Internal event routing mechanism
   * 
   * @private
   * @function _emit
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @param {string} peerId - Source peer identifier
   * @returns {void}
   */
  _emit(event, data, peerId) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try { cb(data, peerId); } catch (e) {}
      });
    }
  }

  /**
   * Initialize BroadcastChannel fallback
   * Used when WebRTC is not available or for backup communication
   * 
   * @private
   * @function _initBroadcastFallback
   * @returns {void}
   */
  _initBroadcastFallback() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel(`webrtc-bridge-${this.roomId}`);
      
      /**
       * BroadcastChannel message handler
       * @param {MessageEvent} event - BroadcastChannel message event
       */
      this.broadcastChannel.onmessage = (event) => {
        this._emit('event', event.data, 'broadcast');
      };
    }
  }

  /**
   * Attempt to reconnect to signaling server
   * Uses exponential backoff with max 5 attempts
   * 
   * @private
   * @function _attemptReconnect
   * @returns {void}
   */
  _attemptReconnect() {
    if (++this.reconnectAttempts > 5) return;
    setTimeout(() => this._connectSignaling(), 1000 * Math.pow(2, this.reconnectAttempts));
  }
}
