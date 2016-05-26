"'use strict";

var sm = {};

// Allow importing as require.
if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = sm;
    }
    exports.sm = sm;
} else {
    this.sm = sm;
}

sm.id = 0;

sm.toType = function(obj) {
    return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
};


sm.hasLength = function(obj) {
    if (!obj) {
        return false;
    }
    return typeof obj.length === 'number';
};


sm.Queue = function() {
    var self = this;
    self.queue = [];
};


sm.Queue.prototype.put = function (value) {
    var self = this;
    self.queue.push(value);
};


sm.Queue.prototype.get = function () {
    var self = this;
    return self.queue.shift();
};


sm.Queue.prototype.empty = function () {
    var self = this;
    return self.queue.length === 0;
};


sm.StateMachineException = function(message) {
    var self = this;
    self.name = "StateMachineException";
    self.message = message;
};


sm.Event = function (name, input, propagate, cargo) {
    var self = this;
    self.name = name;
    self.input = input;
    self.propagate = typeof propagate !== 'undefined' ? propagate : true;
    self.cargo = cargo;
    // self.stateMachine has to be always the root state machine.
    self.stateMachine = null;
};


sm.State = function (name) {
    var self = this;
    self.parent = null;
    self.name = name;
    self.id = sm.id++;
    self.handlers = {};
    self.initial = false;
    self.registerHandlers();
};


sm.State.prototype.toString = function () {
    var self = this;
    return '<State ' + self.name + ' #' + self.id + '>';
};


sm.State.prototype.isSubstate = function (state) {
    var self = this;
    if (state === self){
        return true;
    }
    var parent = self.parent;
    while (parent !== null){
        if (parent === state){
            return true;
        }
        parent = parent.parent;
    }
    return false;
};


sm.State.prototype.registerHandlers = function () {
    var self = this;
};


sm.State.prototype.on = function (event) {
    var self = this;
    if (self.handlers.hasOwnProperty(event.name)){
        event.propagate = false;
        self.handlers[event.name](self, event);
    }
    // Never propagate exit/enter events, even if propagate is set to True
    if (self.parent && event.propagate &&
            (event.name !== 'exit' || event.name !== 'enter')){
        self.parent.on(event);
    }
};


sm.State.prototype._nop = function (state, event) {
    var self = this;
    return true;
};


sm.TransitionContainer = function (stateMachine) {
    var self = this;
    self.stateMachine = stateMachine;
    self._transitions = {};
};


sm.TransitionContainer.prototype.add = function (key, transition) {
    var self = this;
    if (!self._transitions.hasOwnProperty(key)){
        self._transitions[key] = [];
    }
    self._transitions[key].push(transition);
};


sm.TransitionContainer.prototype.get = function (event) {
    var self = this;
    var key = [self.stateMachine.state, event.name, event.input];
    return self._getTransitionMatchingCondition(key, event);
};

sm.TransitionContainer.prototype._getTransitionMatchingCondition = function(
        key, event) {
    var self = this;
    key = key.toString();
    var transitions = self._transitions[key] || [];
    var fromState = self.stateMachine.leafState();
    for (var i = 0; i < transitions.length; i++){
        var transition = transitions[i];
        if (transition.condition(fromState, event) === true){
            return transitions[i];
        }
    }
};


sm.Stack = function (maxlen) {
    var self = this;
    self.stack = [];
    self.maxlen = maxlen;
};

sm.Stack.prototype.pop = function () {
    var self = this;
    self.stack.pop();
};

sm.Stack.prototype.push = function (value) {
    var self = this;
    self.stack.push(value);
    if (self.maxlen && self.stack.length > self.maxlen){
        self.stack.shift();
    }
};

sm.Stack.prototype.peek = function () {
    var self = this;
    return self.stack[self.stack.length - 1];
};


sm.StateMachine = function (name) {
    var self = this;
    sm.State.call(self, name);
    self.states = [];
    self.state = null;
    self._transitions = new sm.TransitionContainer(self);
    self.stateStack = new sm.Stack(32);
    self.leafStateStack = new sm.Stack(32);
    self.stack = new sm.Stack();
};
sm.StateMachine.prototype = new sm.State();
sm.StateMachine.prototype.constructor = sm.StateMachine;


sm.StateMachine.prototype.addState = function (state, initial) {
    var self = this;
    new sm.Validator(self).validateAddState(state, initial);
    state.initial = initial;
    state.parent = self;
    self.states.push(state);
};


sm.StateMachine.prototype.addStates = function (states) {
    var self = this;
    for (var i = 0; i < states.length; i++) {
        self.states.push(states[i]);
    }
};

sm.StateMachine.prototype.setInitialState = function (state) {
    var self = this;
    new sm.Validator(self).validateSetInitial(state);
    state.initial = true;
};


sm.StateMachine.prototype.initialState = function () {
    var self = this;
    var initialState = null;
    //self.states.forEach(function(state) {
        //if (state.initial) {
            //initialState = state;;
        //}
    //});
    for (var i = 0; i < self.states.length; i++){
        var state = self.states[i];
        if (state.initial) {
            return state;
        }
    }
    return initialState;
};


sm.StateMachine.prototype.rootMachine = function () {
    var self = this;
    var machine = self;
    while (machine.parent) {
        machine = machine.parent;
    }
    return machine;
};

sm.StateMachine.prototype.addTransition = function (
        fromState, toState, events, input, action, condition, before, after){
    var self = this;
    if (!input) { input = [null]; }
    if (!action){ action = self._nop; }
    if (!before){ before = self._nop; }
    if (!after){ after = self._nop; }
    if (!condition){ condition = self._nop; }

    new sm.Validator(self).validateAddTransition(
        fromState, toState, events, input);

    for (var i = 0; i < input.length; i++){
        for (var j = 0; j < events.length; j++){
            var key = [fromState, events[j], input[i]];
            var transition = {
                'fromState': fromState,
                'toState': toState,
                'action': action,
                'condition': condition,
                'before': before,
                'after': after
            };
            self._transitions.add(key, transition);
        }
    }
};


sm.StateMachine.prototype.getTransition = function (event) {
    var self = this;
    var machine = self.leafState().parent;
    while (machine) {
        var transition = machine._transitions.get(event);
        if (transition) {
            return transition;
        }
        machine = machine.parent;
    }
};


sm.StateMachine.prototype.leafState = function () {
    var self = this;
    return self._getLeafState(self);
};


sm.StateMachine.prototype._getLeafState = function (state) {
    var self = this;
    while (state.hasOwnProperty('state') && state.state) {
        state = state.state;
    }
    return state;
};


sm.StateMachine.prototype.initialize = function () {
    var self = this;
    var machines = new sm.Queue();
    machines.put(self);
    while (!machines.empty()){
        var machine = machines.get();
        new sm.Validator(self).validateInitialState(machine);
        machine.state = machine.initialState();
        var states = machine.states;
        states.forEach(addStateToMachines);

    }
    function addStateToMachines(state) {
        if (state instanceof sm.StateMachine){
            machines.put(state);
        }
    }
};


sm.StateMachine.prototype.dispatch = function (event) {
    var self = this;
    leafStateBefore = self.leafState();
    leafStateBefore.on(event);
    var transition = self.getTransition(event);
    if (!transition) {
        return null;
    }
    var toState = transition.toState;
    var fromState = transition.fromState;
    transition.before(leafStateBefore, event);
    var topState = self._exitStates(event, fromState, toState);
    transition.action(leafStateBefore, event);
    self._enterStates(event, topState, toState);
    transition.after(self.leafState(), event);
};


sm.StateMachine.prototype._exitStates = function(event, fromState, toState){
    if(!toState) {
        return;
    }
    var self = this;
    var state = self.leafState();
    self.leafStateStack.push(state);
    while (state.parent &&
            !(fromState.isSubstate(state) &&
                toState.isSubstate(state)) ||
            (state === fromState && state === toState)){
        // console.log('exiting ' + state.name);
        var exitEvent = new sm.Event(
            'exit', undefined, false, {'sourceEvent': event});
        exitEvent.stateMachine = self;
        state.on(exitEvent);
        state.parent.stateStack.push(state);
        state.parent.state = state.parent.initialState();
        state = state.parent;
    }
    return state;
};


sm.StateMachine.prototype._enterStates = function(event, topState, toState){
    if(!toState) {
        return;
    }
    var self = this;
    var path = [];
    var state = self._getLeafState(toState);

    while (state.parent && state !== topState) {
        path.push(state);
        state = state.parent;
    }
    path.reverse();
    // Iterate backwards? It'd be different tham pysm.
    for (var i = 0; i < path.length; i++){
        state = path[i];
        // console.log('entering ' + state.name);
        var enterEvent = new sm.Event(
            'enter', undefined, false, {'sourceEvent': event});
        enterEvent.stateMachine = self;
        state.on(enterEvent);
        state.parent.state = state;
    }
};


sm.Validator = function (stateMachine) {
    var self = this;
    self.stateMachine = stateMachine;
    self.template = 'Machine "' + stateMachine.name + '" error: ';
};

sm.Validator.prototype._raise = function (msg) {
    var self = this;
    throw new sm.StateMachineException(self.template + msg);
};


sm.Validator.prototype.validateAddState = function (state, initial) {
    var self = this;
    if(!(state instanceof sm.State)){
        var msg = 'Unable to add state of type ' + sm.toType(state);
        self._raise(msg);
    }
    self._validateStateAlreadyAdded(state);
    if (initial){
        self.validateSetInitial(state);
    }
};

sm.Validator.prototype._validateStateAlreadyAdded = function (state) {
    var self = this;
    var rootMachine = self.stateMachine.rootMachine();
    var machines = new sm.Queue();
    machines.put(rootMachine);
    while(!machines.empty()){
        var machine = machines.get();
        var states = machine.states;
        if (states.indexOf(state) >= 0 && machine !== self.stateMachine){
            var msg = 'Machine "' + self.stateMachine.name + 
                '" error: State "' + state.name + '" is already added to ' +
                'machine "' + machine.name + '"';
            self._raise(msg);
        }
        states.forEach(addStateToMachines);
    }
    function addStateToMachines(state) {
        if (state instanceof sm.StateMachine){
            machines.put(state);
        }
    }
};

sm.Validator.prototype.validateSetInitial = function (state) {
    var self = this;
    var states = self.stateMachine.states;
    states.forEach(function(addedState){
        if(addedState.initial && addedState !== state){
            var msg = 'Unable to set initial state to "' + state.name + '". ' +
               'Initial state is already set to "' + addedState.name + '"';
            self._raise(msg);
        }
    });
};


sm.Validator.prototype.validateAddTransition = function (
        fromState, toState, events, input) {
    var self = this;
    self._validateFromState(fromState);
    self._validateToState(toState);
    self._validateEvents(events);
    self._validateInput(input);
};


sm.Validator.prototype._validateFromState = function (fromState) {
    var self = this;
    if(self.stateMachine.states.indexOf(fromState) < 0){
        var msg = 'Unable to add transition from unknown state "' +
            fromState.name + '"';
        self._raise(msg);
    }
};


sm.Validator.prototype._validateToState = function (toState) {
    var self = this;
    var rootMachine = self.stateMachine.rootMachine();
    if(!toState){
        return;
    }
    else if (toState === rootMachine) {
        return;
    }
    else if (!toState.isSubstate(rootMachine)){
        var msg = 'Unable to add transition to unknown state "' +
            toState.name + '"';
        self._raise(msg);
    }
};


sm.Validator.prototype._validateEvents = function (events) {
    var self = this;
    if (!sm.hasLength(events)){
        var msg = 'Unable to add transition, events is not iterable: ' +
            events;
        self._raise(msg);
    }
};


sm.Validator.prototype._validateInput = function (input) {
    var self = this;
    if (!sm.hasLength(input)){
        var msg = 'Unable to add transition, input is not iterable: ' + input;
        self._raise(msg);
    }
};


sm.Validator.prototype.validateInitialState = function (machine) {
    var self = this;
    if(machine.states.length > 0 && !machine.initialState()){
        var msg = 'Machine "' + machine.name + '" has no initial state';
        self._raise(msg);
    }
};
