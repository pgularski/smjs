(function(){
    QUnit.module('smjs');

    var StateMachine = sm.StateMachine;
    var State = sm.State;
    var Event = sm.Event;
    var _e = Event;

    var buildMachine = function(states) {
        if(!states) states = {};

        var m = new StateMachine('m');
        // exit = m.add_state('exit', terminal=True)
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

        m.add_state(s0, true)
        s0.add_state(s1, true)
        s0.add_state(s2)
        s1.add_state(s11, true)
        s2.add_state(s21, true)
        s21.add_state(s211, true)
        s21.add_state(s212)

        s0.add_transition(s1, s1, events='a')
        s0.add_transition(s1, s11, events='b')
        s2.add_transition(s21, s211, events='b')
        s0.add_transition(s1, s2, events='c')
        s0.add_transition(s2, s1, events='c')
        s0.add_transition(s1, s0, events='d')
        s21.add_transition(s211, s21, events='d')
        m.add_transition(s0, s211, events='e')
        m.add_transition(s0, s212, events='z')
        s0.add_transition(s2, s11, events='f')
        s0.add_transition(s1, s211, events='f')
        s1.add_transition(s11, s211, events='g')
        s21.add_transition(s211, s0, events='g')

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

    QUnit.test( "Transitions without actions", function( assert ) {
        var m = buildMachine();
        m.initialize();
        assert.equal(m.leaf_state().name, 's11', 'Invalid target state');
        m.dispatch(new _e('a'));
        assert.equal(m.leaf_state().name, 's11', 'Invalid target state');
        m.dispatch(new _e('b'));
        assert.equal(m.leaf_state().name, 's11', 'Invalid target state');
        m.dispatch(new _e('c'));
        assert.equal(m.leaf_state().name, 's211', 'Invalid target state');
        m.dispatch(new _e('d'));
        assert.equal(m.leaf_state().name, 's211', 'Invalid target state');
        m.dispatch(new _e('e'));
        assert.equal(m.leaf_state().name, 's211', 'Invalid target state');
        m.dispatch(new _e('c'));  // Bring it back to 's11'
        assert.equal(m.leaf_state().name, 's11', 'Invalid target state');
        m.dispatch(new _e('d'));
        assert.equal(m.leaf_state().name, 's11', 'Invalid target state');
        m.dispatch(new _e('e'));
        assert.equal(m.leaf_state().name, 's211', 'Invalid target state');
        m.dispatch(new _e('f'));
        assert.equal(m.leaf_state().name, 's11', 'Invalid target state');
        m.dispatch(new _e('f'));
        assert.equal(m.leaf_state().name, 's211', 'Invalid target state');
        m.dispatch(new _e('g'));
        assert.equal(m.leaf_state().name, 's11', 'Invalid target state');
        m.dispatch(new _e('g'));
        assert.equal(m.leaf_state().name, 's211', 'Invalid target state');
        m.dispatch(new _e('z'));
        assert.equal(m.leaf_state().name, 's212', 'Invalid target state');
        m.dispatch(new _e('g'));  // Nothing should happen
        assert.equal(m.leaf_state().name, 's212', 'Invalid target state');
        m.dispatch(new _e('e'));
        assert.equal(m.leaf_state().name, 's211', 'Invalid target state');
        m.dispatch(new _e('z'));
        assert.equal(m.leaf_state().name, 's212', 'Invalid target state');
    });

    QUnit.test( "enter/exit actions in a complex machine", function( assert ) {
        var test_list = [];
        var clear_test_list = function () {
            while(test_list.length > 0){
                test_list.pop();
            }
        };
        var on_enter = function(state, event) {
            test_list.push(['enter', state.name]);
        };
        var on_exit = function(state, event){
            test_list.push(['exit', state.name]);
        };

        var states = {};
        var m = buildMachine(states);
        m.initialize();

        for (var name in states){
            states[name].handlers = {'enter': on_enter, 'exit': on_exit}
        }

        clear_test_list();
        m.dispatch(new _e('a'));
        assert.deepEqual(test_list, [['exit', 's11'], ['exit', 's1'], ['enter', 's1'], ['enter', 's11']]);

        clear_test_list();
        m.dispatch(new _e('b'));
        assert.deepEqual(test_list,  [['exit', 's11'], ['enter', 's11']]);
        m.dispatch(new _e('c'));

        clear_test_list();
        m.dispatch(new _e('b'));
        assert.deepEqual(test_list,  [['exit', 's211'], ['enter', 's211']]);
        m.dispatch(new _e('c'));

        clear_test_list();
        m.dispatch(new _e('c'));
        assert.deepEqual(test_list,  [['exit', 's11'], ['exit', 's1'], ['enter', 's2'], ['enter', 's21'], ['enter', 's211']]);
        clear_test_list();
        m.dispatch(new _e('c'));
        assert.deepEqual(test_list,  [['exit', 's211'], ['exit', 's21'],  ['exit', 's2'], ['enter', 's1'], ['enter', 's11']]);

        clear_test_list();
        m.dispatch(new _e('d'));
        assert.deepEqual(test_list,  [['exit', 's11'], ['exit', 's1'],  ['enter', 's1'], ['enter', 's11']]);
        m.dispatch(new _e('c'));
        clear_test_list();
        m.dispatch(new _e('d'));
        assert.deepEqual(test_list,  [['exit', 's211'], ['enter', 's211']]);
        m.dispatch(new _e('c'));

        clear_test_list();
        m.dispatch(new _e('e'));
        assert.deepEqual(test_list,  [['exit', 's11'], ['exit', 's1'],  ['enter', 's2'], ['enter', 's21'], ['enter', 's211']]);
        clear_test_list();
        m.dispatch(new _e('e'));
        assert.deepEqual(test_list,  [['exit', 's211'], ['exit', 's21'],  ['exit', 's2'], ['enter', 's2'], ['enter', 's21'], ['enter', 's211']]);

        clear_test_list();
        m.dispatch(new _e('f'));
        assert.deepEqual(test_list,  [['exit', 's211'], ['exit', 's21'],  ['exit', 's2'], ['enter', 's1'], ['enter', 's11']]);
        clear_test_list();
        m.dispatch(new _e('f'));
        assert.deepEqual(test_list,  [['exit', 's11'], ['exit', 's1'],  ['enter', 's2'], ['enter', 's21'], ['enter', 's211']]);

        clear_test_list();
        m.dispatch(new _e('g'));
        assert.deepEqual(test_list,  [['exit', 's211'], ['exit', 's21'],  ['exit', 's2'], ['enter', 's1'], ['enter', 's11']]);
        clear_test_list();
        m.dispatch(new _e('g'));
        assert.deepEqual(test_list,  [['exit', 's11'], ['exit', 's1'],  ['enter', 's2'], ['enter', 's21'], ['enter', 's211']]);

        clear_test_list();
        m.dispatch(new _e('z'));
        assert.deepEqual(test_list,  [['exit', 's211'], ['exit', 's21'], ['exit', 's2'], ['enter', 's2'], ['enter', 's21'], ['enter', 's212']]);
        assert.equal(m.leaf_state().name, 's212');

        clear_test_list();
        m.dispatch(new _e('c'));
        assert.deepEqual(test_list,  [['exit', 's212'], ['exit', 's21'], ['exit', 's2'], ['enter', 's1'], ['enter', 's11']]);
        assert.equal(m.leaf_state().name, 's11');

        clear_test_list();
        m.dispatch(new _e('g'));
        assert.equal(m.leaf_state().name, 's211');
        assert.deepEqual(test_list,  [['exit', 's11'], ['exit', 's1'],  ['enter', 's2'], ['enter', 's21'], ['enter', 's211']]);
        assert.equal(m.leaf_state().name, 's211');
    });

}());
