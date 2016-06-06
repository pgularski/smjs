(function(){
    QUnit.module('smjs');

    var StateMachine = sm.StateMachine;
    var State = sm.State;
    var Event = sm.Event;
    var _e = Event;

    var buildMachine = function(states) {
        if(!states) states = {};

        var m = new StateMachine('m');
        // exit = m.addState('exit', terminal=True)
        var s0 = new StateMachine('s0')
        var s1 = new StateMachine('s1')
        var s2 = new StateMachine('s2')

        var s11 = new State('s11')
        var s21 = new StateMachine('s21')
        var s211 = new State('s211')
        var s212 = new State('s212')

        states[m.name] = m;
        states[s0.name] = s0;
        states[s1.name] = s1;
        states[s2.name] = s2;
        states[s11.name] = s11;
        states[s21.name] = s21;
        states[s211.name] = s211;
        states[s212.name] = s212;

        m.addState(s0, true)
        s0.addState(s1, true)
        s0.addState(s2)
        s1.addState(s11, true)
        s2.addState(s21, true)
        s21.addState(s211, true)
        s21.addState(s212)

        s0.addTransition(s1, s1, events='a')
        s0.addTransition(s1, s11, events='b')
        s2.addTransition(s21, s211, events='b')
        s0.addTransition(s1, s2, events='c')
        s0.addTransition(s2, s1, events='c')
        s0.addTransition(s1, s0, events='d')
        s21.addTransition(s211, s21, events='d')
        m.addTransition(s0, s211, events='e')
        m.addTransition(s0, s212, events='z')
        s0.addTransition(s2, s11, events='f')
        s0.addTransition(s1, s211, events='f')
        s1.addTransition(s11, s211, events='g')
        s21.addTransition(s211, s0, events='g')

        return m;
    };

    QUnit.test( "Simple Machine instantiation", function( assert ) {
        var m = new StateMachine('sm');
        assert.ok( m , "Machine should be created" );
    });

    QUnit.test( "Complex Machine instantiation", function( assert ) {
        var m = buildMachine();
        assert.ok( m , "Machine should be created" );
    });

    QUnit.test( "Check stack size", function( assert ) {
        var m = buildMachine();
        assert.equal(m.STACK_SIZE, 32);
        assert.equal(m.leafStateStack.maxlen, 32);
        assert.equal(m.stateStack.maxlen, 32);
    });

    QUnit.test( "Transitions without actions", function( assert ) {
        var m = buildMachine();
        m.initialize();
        assert.equal(m.leafState().name, 's11', 'Invalid target state');
        m.dispatch(new _e('a'));
        assert.equal(m.leafState().name, 's11', 'Invalid target state');
        m.dispatch(new _e('b'));
        assert.equal(m.leafState().name, 's11', 'Invalid target state');
        m.dispatch(new _e('c'));
        assert.equal(m.leafState().name, 's211', 'Invalid target state');
        m.dispatch(new _e('d'));
        assert.equal(m.leafState().name, 's211', 'Invalid target state');
        m.dispatch(new _e('e'));
        assert.equal(m.leafState().name, 's211', 'Invalid target state');
        m.dispatch(new _e('c'));  // Bring it back to 's11'
        assert.equal(m.leafState().name, 's11', 'Invalid target state');
        m.dispatch(new _e('d'));
        assert.equal(m.leafState().name, 's11', 'Invalid target state');
        m.dispatch(new _e('e'));
        assert.equal(m.leafState().name, 's211', 'Invalid target state');
        m.dispatch(new _e('f'));
        assert.equal(m.leafState().name, 's11', 'Invalid target state');
        m.dispatch(new _e('f'));
        assert.equal(m.leafState().name, 's211', 'Invalid target state');
        m.dispatch(new _e('g'));
        assert.equal(m.leafState().name, 's11', 'Invalid target state');
        m.dispatch(new _e('g'));
        assert.equal(m.leafState().name, 's211', 'Invalid target state');
        m.dispatch(new _e('z'));
        assert.equal(m.leafState().name, 's212', 'Invalid target state');
        m.dispatch(new _e('g'));  // Nothing should happen
        assert.equal(m.leafState().name, 's212', 'Invalid target state');
        m.dispatch(new _e('e'));
        assert.equal(m.leafState().name, 's211', 'Invalid target state');
        m.dispatch(new _e('z'));
        assert.equal(m.leafState().name, 's212', 'Invalid target state');
    });

    QUnit.test( "enter/exit actions in a complex machine", function( assert ) {
        var testList = [];
        var clearTestList = function () {
            while(testList.length > 0){
                testList.pop();
            }
        };
        var onEnter = function(state, event) {
            testList.push(['enter', state.name]);
        };
        var onExit = function(state, event){
            testList.push(['exit', state.name]);
        };

        var states = {};
        var m = buildMachine(states);
        m.initialize();

        for (var name in states){
            states[name].handlers = {'enter': onEnter, 'exit': onExit}
        }

        clearTestList();
        m.dispatch(new _e('a'));
        assert.deepEqual(testList, [['exit', 's11'], ['exit', 's1'], ['enter', 's1'], ['enter', 's11']]);

        clearTestList();
        m.dispatch(new _e('b'));
        assert.deepEqual(testList,  [['exit', 's11'], ['enter', 's11']]);
        m.dispatch(new _e('c'));

        clearTestList();
        m.dispatch(new _e('b'));
        assert.deepEqual(testList,  [['exit', 's211'], ['enter', 's211']]);
        m.dispatch(new _e('c'));

        clearTestList();
        m.dispatch(new _e('c'));
        assert.deepEqual(testList,  [['exit', 's11'], ['exit', 's1'], ['enter', 's2'], ['enter', 's21'], ['enter', 's211']]);
        clearTestList();
        m.dispatch(new _e('c'));
        assert.deepEqual(testList,  [['exit', 's211'], ['exit', 's21'],  ['exit', 's2'], ['enter', 's1'], ['enter', 's11']]);

        clearTestList();
        m.dispatch(new _e('d'));
        assert.deepEqual(testList,  [['exit', 's11'], ['exit', 's1'],  ['enter', 's1'], ['enter', 's11']]);
        m.dispatch(new _e('c'));
        clearTestList();
        m.dispatch(new _e('d'));
        assert.deepEqual(testList,  [['exit', 's211'], ['enter', 's211']]);
        m.dispatch(new _e('c'));

        clearTestList();
        m.dispatch(new _e('e'));
        assert.deepEqual(testList,  [['exit', 's11'], ['exit', 's1'],  ['enter', 's2'], ['enter', 's21'], ['enter', 's211']]);
        clearTestList();
        m.dispatch(new _e('e'));
        assert.deepEqual(testList,  [['exit', 's211'], ['exit', 's21'],  ['exit', 's2'], ['enter', 's2'], ['enter', 's21'], ['enter', 's211']]);

        clearTestList();
        m.dispatch(new _e('f'));
        assert.deepEqual(testList,  [['exit', 's211'], ['exit', 's21'],  ['exit', 's2'], ['enter', 's1'], ['enter', 's11']]);
        clearTestList();
        m.dispatch(new _e('f'));
        assert.deepEqual(testList,  [['exit', 's11'], ['exit', 's1'],  ['enter', 's2'], ['enter', 's21'], ['enter', 's211']]);

        clearTestList();
        m.dispatch(new _e('g'));
        assert.deepEqual(testList,  [['exit', 's211'], ['exit', 's21'],  ['exit', 's2'], ['enter', 's1'], ['enter', 's11']]);
        clearTestList();
        m.dispatch(new _e('g'));
        assert.deepEqual(testList,  [['exit', 's11'], ['exit', 's1'],  ['enter', 's2'], ['enter', 's21'], ['enter', 's211']]);

        clearTestList();
        m.dispatch(new _e('z'));
        assert.deepEqual(testList,  [['exit', 's211'], ['exit', 's21'], ['exit', 's2'], ['enter', 's2'], ['enter', 's21'], ['enter', 's212']]);
        assert.equal(m.leafState().name, 's212');

        clearTestList();
        m.dispatch(new _e('c'));
        assert.deepEqual(testList,  [['exit', 's212'], ['exit', 's21'], ['exit', 's2'], ['enter', 's1'], ['enter', 's11']]);
        assert.equal(m.leafState().name, 's11');

        clearTestList();
        m.dispatch(new _e('g'));
        assert.equal(m.leafState().name, 's211');
        assert.deepEqual(testList,  [['exit', 's11'], ['exit', 's1'],  ['enter', 's2'], ['enter', 's21'], ['enter', 's211']]);
        assert.equal(m.leafState().name, 's211');
    });


    QUnit.test( "Transitions with actions", function( assert ) {
        var foo = true;

        var testList = [];
        var clearTestList = function () {
            while(testList.length > 0){
                testList.pop();
            }
        };

        var onEnter = function(state, event) {
            testList.push(['enter', state.name]);
        };
        var onExit = function(state, event){
            testList.push(['exit', state.name]);
        };

        var actionI = function (state, event) {
            testList.push('actionI');
        };

        var actionJ = function (state, event) {
            testList.push('actionJ');
        };

        var actionK = function (state, event) {
            testList.push('actionK');
        };

        var actionL = function (state, event) {
            testList.push('actionL');
        };

        var actionM = function (state, event) {
            testList.push('actionM');
        };

        var actionN = function (state, event) {
            testList.push('actionN');
        };

        var unsetFoo = function (state, event) {
            testList.push('unsetFoo');
            foo = false;
        };

        var setFoo = function (state, event) {
            testList.push('setFoo');
            foo = true;
        };

        var states = {};
        var m = buildMachine(states);
        var s0 = states.s0;
        var s1 = states.s1;
        var s11 = states.s11;
        var s2 = states.s2;
        var s21 = states.s21;
        var s211 = states.s211;

        // Internal transitions
        m.addTransition(s0, null, events='i', null, action=actionI);
        s0.addTransition(s1, null, events='j', null, action=actionJ);
        s0.addTransition(s2, null, events='k', null, action=actionK);
        s1.addTransition(s11, null, events='n', null, action=actionN);
        s1.addTransition(s11, null, events='h', null, action=unsetFoo,
            condition=function(s, e) {return foo === true });
        s2.addTransition(s21, null, events='l', null, action=actionL,
            condition=function(s, e) {return foo === true});
        s21.addTransition(s211, null, events='m', null, action=actionM);
        // External transition
        s2.addTransition(s21, s21, events='h', null, action=setFoo,
            condition=function(s, e) {return foo === false});

        for (var name in states){
            states[name].handlers = {'enter': onEnter, 'exit': onExit}
        }

        m.initialize();

        clearTestList();
        m.dispatch(new _e('i'));
        assert.deepEqual(testList, ['actionI']);
        assert.equal(m.leafState().name, 's11');

        clearTestList();
        m.dispatch(new _e('j'))
        assert.deepEqual(testList, ['actionJ']);
        assert.equal(m.leafState().name, 's11');

        clearTestList();
        m.dispatch(new _e('n'))
        assert.deepEqual(testList, ['actionN']);
        assert.equal(m.leafState().name, 's11');

        // This transition toggles state between s11 and s211
        m.dispatch(new _e('c'))
        assert.equal(m.leafState().name, 's211');

        clearTestList();
        m.dispatch(new _e('i'))
        assert.deepEqual(testList, ['actionI']);
        assert.equal(m.leafState().name, 's211');

        clearTestList();
        m.dispatch(new _e('k'))
        assert.deepEqual(testList, ['actionK']);
        assert.equal(m.leafState().name, 's211');

        clearTestList();
        m.dispatch(new _e('m'))
        assert.deepEqual(testList, ['actionM']);
        assert.equal(m.leafState().name, 's211');

        clearTestList();
        m.dispatch(new _e('n'))
        assert.deepEqual(testList, []);
        assert.equal(m.leafState().name, 's211');

        // This transition toggles state between s11 and s211
        m.dispatch(new _e('c'))
        assert.equal(m.leafState().name, 's11');

        clearTestList();
        assert.equal(foo, true);
        m.dispatch(new _e('h'))
        assert.equal(foo, false);
        assert.deepEqual(testList, ['unsetFoo']);
        assert.equal(m.leafState().name, 's11');

        clearTestList();
        m.dispatch(new _e('h'))
        assert.deepEqual(testList, []);  // Do nothing if foo is false
        assert.equal(m.leafState().name, 's11');

        // This transition toggles state between s11 and s211
        m.dispatch(new _e('c'))
        assert.equal(m.leafState().name, 's211');

        clearTestList();
        assert.equal(foo, false);
        m.dispatch(new _e('h'));
        assert.deepEqual(testList, [['exit', 's211'], ['exit', 's21'], 'setFoo', ['enter', 's21'], ['enter', 's211']]);
        assert.equal(foo, true);
        assert.equal(m.leafState().name, 's211');

        clearTestList();
        m.dispatch(new _e('h'))
        assert.deepEqual(testList, []);
        assert.equal(m.leafState().name, 's211');

    });

}());
