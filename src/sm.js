'use strict';

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
    self.cargo = cargo
    // self.state_machine has to be always the root state machine.
    self.state_machine = null;
};


sm.State = function (name) {
    var self = this;
    self.parent = null;
    self.name = name;
    self.id = sm.id++;
    self.handlers = {};
    self.initial = false;
    self.register_handlers();
};


sm.State.prototype.toString = function () {
    var self = this;
    return '<State ' + self.name + ' #' + self.id + '>';
};


sm.State.prototype.is_substate = function (state) {
    var self = this;
    if (state === self){
        return true;
    }
    var parent = self.parent
    while (parent !== null){
        if (parent === state){
            return true;
        }
        parent = parent.parent;
    }
    return false;
};


sm.State.prototype.register_handlers = function () {
    var self = this;
};


sm.State.prototype.on = function (event) {
    var self = this;
    if (self.handlers.hasOwnProperty(event.name)){
        event.propagate = false;
        self.handlers[event.name](event);
    }
    // Never propagate exit/enter events, even if propagate is set to True
    if (self.parent && event.propagate &&
            (event.name !== 'exit' || event.name !== 'enter')){
        self.parent.on(event);
    }
};


sm.State.prototype._nop = function (event) {
    var self = this;
    return true;
}


sm.TransitionContainer = function (state_machine) {
    var self = this;
    self.state_machine = state_machine;
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
    var key = [self.state_machine.state, event.name, event.input];
    return self._get_transition_matching_condition(key, event);
};

sm.TransitionContainer.prototype._get_transition_matching_condition = function(
        key, event) {
    var self = this;
    key = key.toString();
    var transitions = self._transitions[key] || [];
    for (var i = 0; i < transitions.length; i++){
        if (transitions[i]['condition'](event) === true){
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
    self.state_stack = new sm.Stack(32);
    self.leaf_state_stack = new sm.Stack(32);
    self.stack = new sm.Stack();
};
sm.StateMachine.prototype = new sm.State();
sm.StateMachine.prototype.constructor = sm.StateMachine;


sm.StateMachine.prototype.add_state = function (state, initial) {
    var self = this;
    new sm.Validator(self).validate_add_state(state, initial);
    state.initial = initial;
    state.parent = self;
    self.states.push(state);
};


sm.StateMachine.prototype.add_states = function (states) {
    var self = this;
    for (var i = 0; i < states.length; i++) {
        self.states.push(states[i]);
    }
};

sm.StateMachine.prototype.set_initial_state = function (state) {
    var self = this;
    new sm.Validator(self).validate_set_initial(state);
    state.initial = true;
};


sm.StateMachine.prototype.initial_state = function () {
    var self = this;
    var initial_state = null;
    //self.states.forEach(function(state) {
        //if (state.initial) {
            //initial_state = state;;
        //}
    //});
    for (var i = 0; i < self.states.length; i++){
        var state = self.states[i];
        if (state.initial) {
            return state;
        }
    }
    return initial_state;
};


sm.StateMachine.prototype.root_machine = function () {
    var self = this;
    var machine = self;
    while (machine.parent) {
        machine = machine.parent;
    }
    return machine;
}

sm.StateMachine.prototype.add_transition = function (
        from_state, to_state, events, input, action, condition, before, after){
    var self = this;
    if (!input) { input = [null]; }
    if (!action){ action = self._nop; }
    if (!before){ before = self._nop; }
    if (!after){ after = self._nop; }
    if (!condition){ condition = self._nop; }

    new sm.Validator(self).validate_add_transition(
        from_state, to_state, events, input);

    for (var i = 0; i < input.length; i++){
        for (var j = 0; j < events.length; j++){
            var key = [from_state, events[j], input[i]];
            var transition = {
                'from_state': from_state,
                'to_state': to_state,
                'action': action,
                'condition': condition,
                'before': before,
                'after': after
            }
            self._transitions.add(key, transition);
        }
    }
};


sm.StateMachine.prototype.get_transition = function (event) {
    var self = this;
    var machine = self.leaf_state().parent;
    while (machine) {
        var transition = machine._transitions.get(event);
        if (transition) {
            return transition;
        }
        machine = machine.parent;
    }
};


sm.StateMachine.prototype.leaf_state = function () {
    var self = this;
    return self._get_leaf_state(self);
};


sm.StateMachine.prototype._get_leaf_state = function (state) {
    var self = this;
    while (state.hasOwnProperty('state') && state.state) {
        state = state.state;
    }
    return state;
};


sm.StateMachine.prototype.initialize = function () {
    var self = this;
    // TODO: Implement Deque
    // TODO: put or append / popleft or get?
    var machines = new sm.Queue();
    machines.put(self);
    while (!machines.empty()){
        var machine = machines.get();
        new sm.Validator(self).validate_initial_state(machine);
        machine.state = machine.initial_state();
        var states = machine.states;
        states.forEach(function(state){
            if (state instanceof sm.StateMachine){
                machines.put(state);
            }
        });
        //for (var i = 0; i < states.length; i++) {
            //if (states[i] instanceof sm.StateMachine){
                //machines.put(states[i]);
            //}
        //}
    }
};


sm.StateMachine.prototype.dispatch = function (event) {
    var self = this;
    self.leaf_state().on(event);
    var transition = self.get_transition(event);
    if (!transition) {
        return null;
    }
    var to_state = transition['to_state'];
    var from_state = transition['from_state'];
    if (!to_state){
        transition['action'](event);
        return null;
    }

    transition['before'](event);
    var top_state = self._exit_states(event, from_state, to_state);
    transition['action'](event);
    self._enter_states(event, top_state, to_state);
    transition['after'](event);
};


sm.StateMachine.prototype._exit_states = function(event, from_state, to_state){
    var self = this;
    var state = self.leaf_state();
    self.leaf_state_stack.push(state);
    while (state.parent &&
            !(from_state.is_substate(state) &&
                to_state.is_substate(state))
            || (state === from_state && state === to_state)){
        console.log('exiting ' + state.name);
        var exit_event = new sm.Event(
            'exit', undefined, false, {'source_event': event});
        exit_event.state_machine = self;
        state.on(exit_event);
        state.parent.state_stack.push(state);
        state.parent.state = state.parent.initial_state();
        state = state.parent;
    }
    return state;
};


sm.StateMachine.prototype._enter_states = function(event, top_state, to_state){
    var self = this;
    var path = [];
    var state = self._get_leaf_state(to_state);

    while (state.parent && state !== top_state) {
        path.push(state);
        state = state.parent;
    }
    path.reverse();
    // Iterate backwards? It'd be different tham pysm.
    for (var i = 0; i < path.length; i++){
        state = path[i];
        console.log('entering ' + state.name);
        var enter_event = new sm.Event(
            'enter', undefined, false, {'source_event': event});
        enter_event.state_machine = self;
        state.on(enter_event);
        state.parent.state = state;
    }
};


sm.Validator = function (state_machine) {
    var self = this;
    self.state_machine = state_machine;
    self.template = 'Machine "' + state_machine.name + '" error: '
};

sm.Validator.prototype._raise = function (msg) {
    var self = this;
    throw new sm.StateMachineException(self.template + msg);
};


sm.Validator.prototype.validate_add_state = function (state, initial) {
    var self = this;
    if(!(state instanceof sm.State)){
        var msg = 'Unable to add state of type ' + sm.toType(state);
        self._raise(msg);
    }
    self._validate_state_already_added(state);
    if (initial){
        self.validate_set_initial(state);
    }
};

sm.Validator.prototype._validate_state_already_added = function (state) {
    var self = this;
    var root_machine = self.state_machine.root_machine();
    var machines = new sm.Queue();
    machines.put(root_machine);
    while(!machines.empty()){
        var machine = machines.get();
        var states = machine.states;
        if (states.indexOf(state) >= 0 && machine !== self.state_machine){
            var msg = 'Machine "' + self.state_machine.name + 
                '" error: State "' + state.name + '" is already added to ' +
                'machine "' + machine.name + '"';
            self._raise(msg)
        }
        states.forEach(function(state_){
            if (state_ instanceof sm.StateMachine){
                machines.put(state_);
            }
        });

    }
};

sm.Validator.prototype.validate_set_initial = function (state) {
    var self = this;
    var states = self.state_machine.states;
    states.forEach(function(added_state){
        if(added_state.initial && added_state !== state){
            var msg = 'Unable to set initial state to "' + state.name + '". ' +
               'Initial state is already set to "' + added_state.name + '"';
            self._raise(msg);
        }
    });
};


sm.Validator.prototype.validate_add_transition = function (
        from_state, to_state, events, input) {
    var self = this;
    self._validate_from_state(from_state)
    self._validate_to_state(to_state)
    self._validate_events(events)
    self._validate_input(input)
};


sm.Validator.prototype._validate_from_state = function (from_state) {
    var self = this;
    if(self.state_machine.states.indexOf(from_state) < 0){
        var msg = 'Unable to add transition from unknown state "' +
            from_state.name + '"';
        self._raise(msg);
    }
};


sm.Validator.prototype._validate_to_state = function (to_state) {
    var self = this;
    var root_machine = self.state_machine.root_machine();
    if(!to_state){
        return;
    }
    else if (to_state === root_machine) {
        return;
    }
    else if (!to_state.is_substate(root_machine)){
        var msg = 'Unable to add transition to unknown state "' +
            to_state.name + '"';
        self._raise(msg);
    }
};


sm.Validator.prototype._validate_events = function (events) {
    var self = this;
    if (!sm.hasLength(events)){
        var msg = 'Unable to add transition, events is not iterable: ' +
            events;
        self._raise(msg);
    }
};


sm.Validator.prototype._validate_input = function (input) {
    var self = this;
    if (!sm.hasLength(input)){
        var msg = 'Unable to add transition, input is not iterable: ' + events;
        self._raise(msg);
    }
};


sm.Validator.prototype.validate_initial_state = function (machine) {
    var self = this;
    if(machine.states.length > 0 && !machine.initial_state()){
        var msg = 'Machine "' + machine.name + '" has no initial state';
        self._raise(msg);
    }
};



// ------------------------------ sanity test --------
//var assert = require('assert');

var q = new sm.Queue();

var m = new sm.StateMachine('m');
var s0 = new sm.State('s0');
var s1 = new sm.State('s1');
m.add_state(s0, true);
m.add_state(s1);
m.add_transition(s0, s1, 'a');
m.add_transition(s1, s0, 'b');

m.initialize();

//assert(m.state === s0);
//assert(m.leaf_state() === s0);
m.dispatch(new sm.Event('nonexistent'));
//assert(m.state === s0);
//assert(m.leaf_state() === s0);

m.dispatch(new sm.Event('a'));
//assert(m.state === s1);
//assert(m.leaf_state() === s1);

m.dispatch(new sm.Event('a'));
//assert(m.state === s1);
//assert(m.leaf_state() === s1);

m.dispatch(new sm.Event('b'));
//assert(m.state === s0);
//assert(m.leaf_state() === s0);
console.log('---')


var StateMachine = sm.StateMachine;
var State = sm.State;
var Event = sm.Event;
var Stack = sm.Stack;


var mm = new StateMachine('mm');
var s0 = new StateMachine('s0');
var s1 = new StateMachine('s1');
var s2 = new StateMachine('s2');
var s11 = new State('s11');
var s21 = new State('s21');

s1.handlers = {'a': function(event) { console.log('handling event...'); }};

mm.add_state(s0, true);
s0.add_state(s1, true);
s0.add_state(s2);
s1.add_state(s11, true);
s2.add_state(s21, true);

s1.add_transition(s11, s21, 'a',
    undefined, function(event) {console.log('WOOOHOO, transition!');});
s2.add_transition(s21, s1, 'a');

mm.initialize();

mm.dispatch(new Event('nonexistent'));
mm.dispatch(new sm.Event('a'));
console.log('---')
mm.dispatch(new sm.Event('a'));
console.log('---')
mm.dispatch(new sm.Event('a'));


var stack = new Stack(2);
stack.push(1);
stack.push(2);
//assert(stack.stack.length === 2);
//assert(stack.peek() === 2);
stack.push(3);
//assert(stack.stack.length === 2);
//assert(stack.peek() === 3);
