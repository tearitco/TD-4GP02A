/*
 * ec.js
 * Electronic Circuit module
*/

/*jslint           browser : true,   continue : true,
  devel  : true,    indent : 4,       maxerr  : 50,
  newcap : true,     nomen : true,   plusplus : true,
  regexp : true,    sloppy : true,       vars : false,
  white  : true,  bitwise  : true
*/
/*global ec */

var ec = (function () {

    var indexOf,

        T_IN = 1, T_OUT = 2, T_VCC = 3, T_GND = 4,
        VCC, GND,

        agenda,

        Wire,
        Bus,
        InConnector,
        OutConnector,
        Clock,
        LED,
        PushSW,
        Switch,
        DIPSW4,
        DIPSW8,
        DFlipFlop,
        Inverter,
        OrGate,
        AndGate,
        NandGate,
        Nand3Gate,
        IC74HC153,
        IC74HC161,
        IC74HC283,
        HalfAdder,
        FullAdder,
        MemoryA4D8;


    function error ( msg )
    {
        console.log( msg );
        throw msg;
    }



    function bind ( context, name )
    {
        return function () {
            return context[name].apply( context, arguments );
        };
    }



    indexOf = function ( needle )
    {
        var indexOf;

        if ( typeof Array.prototype.indexOf === 'function' )
        {
            indexOf = Array.prototype.indexOf;
        }
        else
        {
            indexOf = function ( needle )
            {
                var i = -1, index = -1;

                for ( i = 0; i < this.length; i++ )
                {
                    if ( this[i] === needle )
                    {
                        index = i;
                        break;
                    }
                }

                return index;
            };
        }

        return indexOf.call( this, needle );
    };



    agenda = {
        isProcessing: false,
        queue: [],


        add: function ( fn )
        {
            this.queue.push( fn );
        },


        start: function ()
        {
            var fn;

            if ( this.isProcessing )
            {
                return;
            }

            this.isProcessing = true;

            while ( this.queue.length > 0 && this.isProcessing )
            {
                fn = this.queue.shift();

                fn();
            }

            this.isProcessing = false;
        },


        stop: function ()
        {
            this.isProcessing = false;
        }

    };



    function start () {
        agenda.start();
    }

    function delay ( fn ) {
        agenda.add( fn );
    }



    function IN ( pinName ) {
        return { type: T_IN, name: pinName };
    }

    function OUT ( pinName ) {
        return { type: T_OUT, name: pinName };
    }

    VCC = { type: T_VCC, name: 'VCC' };
    GND = { type: T_GND, name: 'GND' };




    function setupElement ( e, pins, wires ) {
        var i, name, pin, cn;

        e.PINS = pins;

        for ( i = 0; i < pins.length; i++ )
        {
            if ( ! pins[i] ) {
                continue;
            }

            switch ( pins[i].type )
            {
            case T_IN:
                pin = new InConnector( e );
                break;

            case T_OUT:
                pin = new OutConnector();
                break;

            case T_VCC:
                pin = null;
                break;

            case T_GND:
                pin = null;
                break;

            default:
                error( 'unknown io type' );
                break;
            }

            name = pins[i].name;

            if ( e[name] ) {
                error( name + ' exists already' );
            }

            e[name] = pin;
            e['PIN' + (i+1)] = pin;
        }


        if ( wires ) {
            wires = Array.prototype.slice.call( wires, 0 );

            for ( i = 0; i < wires.length; i++ )
            {
                cn = e['PIN' + (i+1)];

                if ( cn ) {
                    cn.connect( wires[i] );
                }
            }
        }


        if ( ! e.action ) {
            if ( e._action ) {
                Object.getPrototypeOf(e).action = function () { delay( bind( this, '_action' ) ); };
            } else {
                Object.getPrototypeOf(e).action = function () { return; };
            }
        }


        Object.getPrototypeOf(e).connect = function ( pin, wire )
        {
            if ( ! this[pin] ) {
                error( 'has not ' + pin + ' pin' );
            }

            this[pin].connect( wire );
        };
    }



    Wire = (function ()
    {
        var instanceNo = 0;

        function Wire ()
        {
            this.instanceNo = instanceNo++;
            this.instanceName = 'Wire' + this.instanceNo;

            this.isWire = true;
            this._signal = null;
            this._listeners = [];
        }


        Wire.prototype.toString = function ()
        {
            return this.instanceName;
        };


        Wire.prototype.getSignal = function ()
        {
            return this._signal;
        };


        Wire.prototype.setDelayedSignal = function ( val )
        {
            this.setSignal( val, true );
        };


        Wire.prototype.setSignal = function ( val, isDelayed )
        {
            var wire, fn;

            if ( val === null  ||  ( val >= 0 && val <= 1 ) )
            {
                if ( this._signal !== val )
                {
                    wire = this;

                    fn = function () {
                        wire._signal = val;

                        wire.notifyListeners();
                    };

                    if ( isDelayed ) {
                        delay( fn );
                    } else {
                        fn();
                    }
                }
            }
            else
            {
                error( 'Invalid signal ' + val );
            }
        };


        Wire.prototype.addChangeListener = function ( listener )
        {
            var i = indexOf.call( this._listeners, listener );

            if ( i !== -1 ) {
                error( "couldn't add the listener. this listener was already added" );
            }

            this._listeners.push( listener );
        };


        Wire.prototype.removeChangeListener = function ( listener )
        {
            var i = indexOf.call( this._listeners, listener );

            if ( i === -1 ) {
                error( "couldn't remove the listener. this listener doesn't exist" );
            }

            this._listeners.splice( i, 1 );
        };


        Wire.prototype.notifyListeners = function ()
        {
            var i;

            for ( i = 0; i < this._listeners.length; i++ ) {
                this._listeners[i].action( this._signal );
            }
        };


        return Wire;
    }());



    Bus = (function ()
    {
        function Bus ( width )
        {
            var i;

            this.isBus = true;

            for ( i = 0; i < width; i++ ) {
                this.push( new Wire() );
            }
        }


        Bus.prototype = [];


        Bus.prototype.getSignals = function ()
        {
            var i, v = [];

            for ( i = 0; i < this.length; i++ ) {
                v.push( this[i].getSignal() );
            }

            return v;
        };


        Bus.prototype.setSignals = function ()
        {
            var i;

            for ( i = 0; i < this.length; i++ ) {
                this[i].setSignal( arguments[i] );
            }
        };


        Bus.prototype.getValue = function ()
        {
            var i, t, v = 0;

            for ( i = 0; i < this.length; i++ )
            {
                t = this[i].getSignal();

                if ( t === null ) {
                    return null;
                }

                v |= t << i;
            }

            return v;
        };


        Bus.prototype.setValue = function ( v )
        {
            var i;

            for ( i = 0; i < this.length; i++ ) {
                this[i].setSignal( (v & (1 << i)) >> i );
            }
        };


        return Bus;
    }());



    function createConnectBus ( pinPrefix, num, isBase0, no )
    {
        return function( wires ) {
            var i, sufix = '';

            if ( arguments.length === num ) {
                wires = Array.prototype.slice.call( arguments, 0 );
            }

            if ( no ) {
                sufix = '_' + no;
            }

            if ( isBase0 )
            {
                for ( i = 0; i < num; i++ ) {
                    this[pinPrefix + i + sufix].connect( wires[i] );
                }
            }
            else
            {
                for ( i = 0; i < num; i++ ) {
                    this[pinPrefix + (i+1) + sufix].connect( wires[i] );
                }
            }
        };
    }



    function createConnector ( isInput )
    {
        function Connector ( listener )
        {
            this.isConnector = true;
            this.inn = new Wire();
            this.out = null;

            if ( ! isInput ) {
                this.inn.addChangeListener( this );
            }

            if ( listener ) {
                this.addChangeListener( listener );
            }
        }


        Connector.prototype.isInput = function ()
        {
            return isInput;
        };


        Connector.prototype.isOutput = function ()
        {
            return ! isInput;
        };


        Connector.prototype.addChangeListener = function ( listener )
        {
            this.inn.addChangeListener( listener );
        };


        Connector.prototype.connect = function ( p )
        {
            var wire;

            if ( p.isWire )
            {
                wire = p;

                if ( this.out ) {
                    error( "couldn't connect wire" );
                }
            }
            else if ( p.isConnector )
            {
                if ( this.isOutput() && p.isOutput() ) {
                    error( "couldn't connect. output <=> output" );
                }

                if ( this.isInput() && p.isInput() ) {
                    error( "couldn't connect. input <=> input" );
                }

                if ( this.out && ! p.out )
                {
                    p.connect( this );
                    return;
                }

                if ( ! this.out && p.out )
                {
                    wire = p.out;
                }
                else if ( ! this.out && ! p.out )
                {
                    wire = new Wire();
                    p.connect( wire );
                }
                else
                {
                    error( "couldn't connect. wire <=> wire" );
                }
            }
            else
            {
                error( "couldn't connect type" );
            }

            this.out = wire;

            if ( isInput ) {
                wire.addChangeListener( this );
            }

            this.action();
        };


        Connector.prototype.action = function ()
        {
            if ( ! this.out ) {
                return;
            }

            if ( this.inn.getSignal() === this.out.getSignal() ) {
                return;
            }

            if ( isInput ) {
                this.inn.setSignal( this.out.getSignal() );
            } else {
                this.out.setSignal( this.inn.getSignal() );
            }
        };


        Connector.prototype.getSignal = function ()
        {
            return this.inn.getSignal();
        };


        Connector.prototype.setSignal = function ( val )
        {
            if ( isInput ) {
                error( 'can not set signal to a input connector' );
            }

            this.inn.setSignal( val );
        };


        return Connector;
    }



    InConnector = createConnector( true );
    OutConnector = createConnector( false );



    Clock = (function ()
    {
        var pins = [ OUT('CK') ];

        function Clock ()
        {
            setupElement( this, pins, arguments );

            this._interval = 1000;
            this._timerId = null;
            this._listeners = [];
            this.signal = 1;
        }


        Clock.prototype.isRunning = function ()
        {
            if ( this._timerId ) {
                return true;
            }

            return false;
        };


        Clock.prototype.start = function ( hz )
        {
            if ( this._timerId ) {
                return;
            }

            if ( hz ) {
                this.setHz( hz );
            }

            this._timerId = setInterval( bind( this, 'next' ), this._interval / 2 );
        };


        Clock.prototype.stop = function ()
        {
            if ( ! this._timerId ) {
                return;
            }

            clearInterval( this._timerId );

            this._timerId = null;
        };


        Clock.prototype.setHz = function ( hz )
        {
            this._interval = 1000 / hz;

            if ( this._timerId )
            {
                this.stop();
                this.start();
            }
        };


        Clock.prototype.next = function ()
        {
            this.signal = 1 - this.signal;

            this.CK.setSignal( this.signal );

            start();

            this.notifyListeners();
        };


        Clock.prototype.addClockListener = function ( listener )
        {
            var i = indexOf.call( this._listeners, listener );

            if ( i !== -1 ) {
                error( "couldn't add the listener. this listener was already added" );
            }

            this._listeners.push( listener );
        };


        Clock.prototype.notifyListeners = function ()
        {
            var i;

            for ( i = 0; i < this._listeners.length; i++ ) {
                this._listeners[i].onClock( this.signal );
            }
        };


        return Clock;
    }());



    PushSW = (function ()
    {
        var pins = [ OUT('Y') ];

        function PushSW ( normalSignal )
        {
            var args;

            if ( normalSignal !== 1 ) {
                normalSignal = 0;
            }

            this.normalSignal = normalSignal;
            this.pushed = false;

            args = Array.prototype.slice.call( arguments, 1 );

            setupElement( this, pins, args );
        }


        PushSW.prototype._action = function ()
        {
            if ( this.pushed ) {
                this.Y.setSignal( 1 - this.normalSignal );
            } else {
                this.Y.setSignal( this.normalSignal );
            }
        };


        PushSW.prototype.down = function ()
        {
            this.pushed = true;

            this.action();
        };


        PushSW.prototype.up = function ()
        {
            this.pushed = false;

            this.action();
        };


        return PushSW;
    }());



    LED = (function ()
    {
        var pins = [ IN('A') ];

        function LED ()
        {
            setupElement( this, pins, arguments );
        }


        return LED;
    }());



    Switch = (function ()
    {
        var pins = [ IN('L1'), IN('L2'), OUT('C') ];

        function Switch ()
        {
            setupElement( this, pins, arguments );
        }


        Switch.prototype._action = function ()
        {
            var val;

            if ( this.sw ) {
                val = this.L2.getSignal();
            } else {
                val = this.L1.getSignal();
            }

            this.C.setSignal( val );
        };


        Switch.prototype.toggle = function ()
        {
            this.sw = ! this.sw;

            this.action();
        };


        return Switch;
    }());



    function createDIPSW ( num )
    {
        var i,
            pins = [];

        for ( i = 0; i < num; i++ ) {
            pins.push( OUT( 'Y' + i ) );
        }


        function DIPSW ()
        {
            var i;

            setupElement( this, pins, arguments );

            this.state = [];

            for ( i = 0; i < num; i++ )
            {
                this.state.push( 0 );
                this['Y' + i].setSignal( 0 );
            }
        }


        DIPSW.prototype.on = function ( i )
        {
            if ( i < 0 || i >= num ) {
                error( '[DIPSW on] out of index' );
            }

            this.state[i] = 1;
            this['Y' + i].setSignal( this.state[i] );
        };


        DIPSW.prototype.off = function ( i )
        {
            if ( i < 0 || i >= num ) {
                error( '[DIPSW off] out of index' );
            }

            this.state[i] = 0;
            this['Y' + i].setSignal( this.state[i] );
        };


        DIPSW.prototype.toggle = function ( i )
        {
            if ( i < 0 || i >= num ) {
                error( '[DIPSW toggle] out of index' );
            }

            this.state[i] = 1 - this.state[i];
            this['Y' + i].setSignal( this.state[i] );
        };


        DIPSW.prototype.connectBus = createConnectBus( 'Y', num, true );


        return DIPSW;
    }



    DIPSW4 = createDIPSW( 4 );
    DIPSW8 = createDIPSW( 8 );



    DFlipFlop = (function ()
    {
        var pins = [ IN('CK'), IN('D'), IN('CLR_B'), IN('PR_B'), OUT('Q'), OUT('Q_B') ];

        function DFlipFlop ()
        {
            setupElement( this, pins, arguments );
        }


        DFlipFlop.prototype._action = function ()
        {
            var ck_val = this.CK.getSignal(),
                d_val;

            if ( this.CLR_B.getSignal() === 0 )
            {
                this.Q.setSignal( 0 );
                this.Q_B.setSignal( 1 );
            }
            else if ( this.PR_B.getSignal() === 0 )
            {
                this.Q.setSignal( 1 );
                this.Q_B.setSignal( 0 );
            }
            else if ( this._prev_ck === 0 && ck_val === 1 )
            {
                d_val = this.D.getSignal();

                if ( d_val === 0 || d_val === 1 )
                {
                    this.Q.setSignal( d_val );
                    this.Q_B.setSignal( 1 - d_val );
                }
                else
                {
                    this.Q.setSignal( null );
                    this.Q_B.setSignal( null );
                }
            }

            this._prev_ck = ck_val;
        };


        return DFlipFlop;
    }());



    function logicalNot ( s )
    {
        if ( s === null ) {
            return null;
        }

        if ( s === 0 ) {
            return 1;
        }

        if ( s === 1 ) {
            return 0;
        }

        error( '[not] Invalid signal. s = ' + s );
    }



    function logicalAnd ( s1, s2 )
    {
        if ( s1 === null  ||  s2 === null ) {
            return null;
        }

        if ( s1 === 1  &&  s2 === 1 ) {
            return 1;
        }

        return 0;
    }



    function logicalOr ( s1, s2 )
    {
        if ( s1 === null  ||  s2 === null ) {
            return null;
        }

        if ( s1 === 0  &&  s2 === 0 ) {
            return 0;
        }

        return 1;
    }



    function logicalNand ( s1, s2 )
    {
        if ( s1 === null  ||  s2 === null ) {
            return null;
        }

        if ( s1 === 1  &&  s2 === 1 ) {
            return 0;
        }

        return 1;
    }



    function logicalNand3 ( s1, s2, s3 )
    {
        if ( s1 === null  ||  s2 === null  ||  s3 === null ) {
            return null;
        }
 
        if ( s1 === 1  &&  s2 === 1  &&  s3 === 1 ) {
            return 0;
        }

        return 1;
    }



    Inverter = (function ()
    {
        var pins = [ IN('A'), OUT('Y') ];

        function Inverter ()
        {
            setupElement( this, pins, arguments );
        }


        Inverter.prototype._action = function ()
        {
            var val = logicalNot( this.A.getSignal() );

            this.Y.setSignal( val );
        };


        return Inverter;
    }());



    AndGate = (function ()
    {
        var pins = [ IN('A'), IN('B'), OUT('Y') ];

        function AndGate ()
        {
            setupElement( this, pins, arguments );
        }


        AndGate.prototype._action = function ()
        {
            var val = logicalAnd( this.A.getSignal(), this.B.getSignal() );

            this.Y.setSignal( val );
        };


        return AndGate;
    }());



    OrGate = (function ()
    {
        var pins = [ IN('A'), IN('B'), OUT('Y') ];

        function OrGate ()
        {
            setupElement( this, pins, arguments );
        }


        OrGate.prototype._action = function ()
        {
            var val = logicalOr( this.A.getSignal(), this.B.getSignal() );

            this.Y.setSignal( val );
        };


        return OrGate;
    }());



    NandGate = (function ()
    {
        var pins = [ IN('A'), IN('B'), OUT('Y') ];

        function NandGate ()
        {
            setupElement( this, pins, arguments );
        }


        NandGate.prototype._action = function ()
        {
            var val = logicalNand( this.A.getSignal(), this.B.getSignal() );

            this.Y.setSignal( val );
        };


        return NandGate;
    }());



    Nand3Gate = (function ()
    {
        var pins = [ IN('A'), IN('B'), IN('C'), OUT('Y') ];

        function Nand3Gate ()
        {
            setupElement( this, pins, arguments );
        }


        Nand3Gate.prototype._action = function ()
        {
            var val = logicalNand3( this.A.getSignal(), this.B.getSignal(), this.C.getSignal() );

            this.Y.setSignal( val );
        };


        return Nand3Gate;
    }());



    HalfAdder = (function ()
    {
        var pins = [ IN('A'), IN('B'), OUT('S'), OUT('C') ];

        function HalfAdder ()
        {
            var d = new Wire(),
                e = new Wire();

            setupElement( this, pins, arguments );

            this.elems = [];
            this.elems[0]   = new OrGate( this.A.inn, this.B.inn, d );
            this.elems[1] = new AndGate( this.A.inn, this.B.inn, this.C.inn );
            this.elems[2]  = new Inverter( this.C.inn, e );
            this.elems[3] = new AndGate( d, e, this.S.inn );
        }


        return HalfAdder;
    }());



    FullAdder = (function ()
    {
        var pins = [ IN('A'), IN('B'), IN('C_IN'), OUT('S'), OUT('C_OUT') ];

        function FullAdder ()
        {
            var s  = new Wire(),
                c1 = new Wire(),
                c2 = new Wire();

            setupElement( this, pins, arguments );

            this.elems = [];
            this.elems[0] = new HalfAdder( this.B.inn, this.C_IN.inn, s, c1 );
            this.elems[1] = new HalfAdder( this.A.inn, s, this.S.inn, c2 );
            this.elems[2] = new OrGate( c1, c2, this.C_OUT.inn );
        }


        return FullAdder;
    }());



    // Dual 4-input multiplexer
    IC74HC153 = (function ()
    {
        var pins = [ IN('G_1_B'), IN('B'),    IN('C3_1'), IN('C2_1'), IN('C1_1'), IN('C0_1'), OUT('Y_1'),  GND,
                     OUT('Y_2'),  IN('C0_2'), IN('C1_2'), IN('C2_2'), IN('C3_2'), IN('A'),    IN('G_2_B'), VCC ];

        function IC74HC153 ()
        {
            setupElement( this, pins, arguments );
        }


        IC74HC153.prototype._action = function ()
        {
            var i,
                a = this.A.getSignal(),
                b = this.B.getSignal(),
                no;

            for ( i = 1; i <= 2; i++ )
            {
                if ( this['G_' + i + '_B'].getSignal() === 1 )
                {
                    this['Y_' + i].setSignal( 0 );
                }
                else
                {
                    if ( a === null || b === null ) {
                        return;
                    }

                    no = (b << 1) + a;

                    if ( ! (no >= 0 && no < 4) ) {
                        error( 'IC74HC153: out of index. [' + no + ']' );
                    }

                    this['Y_' + i].setSignal( this['C' + no + '_' + i].getSignal() );
                }
            }
        };


        IC74HC153.prototype.connectC_1 = createConnectBus( 'C', 4, true, 1 );
        IC74HC153.prototype.connectC_2 = createConnectBus( 'C', 4, true, 2 );


        return IC74HC153;
    }());



    // Presettable synchronous 4-bit binary counter; asynchronous reset
    // ENT=1, ENP=1 countup
    // ENT=0, ENP=0 not countup
    IC74HC161 = (function ()
    {
        var pins = [ IN('CLR_B'), IN('CK'),  IN('A'),   IN('B'),   IN('C'),   IN('D'),   IN('ENP'), GND,
                     IN('LD_B'),  IN('ENT'), OUT('QD'), OUT('QC'), OUT('QB'), OUT('QA'), OUT('CO'), VCC ];

        function IC74HC161 ()
        {
            setupElement( this, pins, arguments );

            this.counter = 0;
            this.carry = 0;

            this.outputSignal();
        }


        IC74HC161.prototype._action = function ()
        {
            var ck_val = this.CK.getSignal();

            if ( this.CLR_B.getSignal() === 0 )
            {
                this.counter = 0;
                this.carry = 0;
                this.outputSignal();
            }
            else if ( this._prev_ck === 0 && ck_val === 1 )
            {
                if ( this.LD_B.getSignal() === 0 )
                {
                    this.load();
                    this.outputSignal();
                }
                else if ( this.ENP.getSignal() === 1 && this.ENT.getSignal() === 1 )
                {
                    this.countup();
                    this.outputSignal();
                }
            }

            this._prev_ck = ck_val;
        };


        IC74HC161.prototype.load = function ()
        {
            var a = this.A.getSignal(),
                b = this.B.getSignal(),
                c = this.C.getSignal(),
                d = this.D.getSignal();

            if ( a === null || b === null || c === null || d === null ) {
                error( 'IC74HC161: load error' );
            }

            this.counter = (d << 3) | (c << 2) | (b << 1) | a;
        };


        IC74HC161.prototype.outputSignal = function ()
        {
            var c = this.counter;

            this.QA.setSignal( (c & 1) );
            this.QB.setSignal( (c & 2) >> 1 );
            this.QC.setSignal( (c & 4) >> 2 );
            this.QD.setSignal( (c & 8) >> 3 );
            this.CO.setSignal( this.carry );
        };


        IC74HC161.prototype.countup = function ()
        {
            this.counter++;

            if ( this.counter >= 16 )
            {
                this.counter = 0;
                this.carry = 1;
            }
            else
            {
                this.carry = 0;
            }
        };


        IC74HC161.prototype.connectInput = function ( p )
        {
            if ( arguments.length === 4 ) {
                p = Array.prototype.slice.call( arguments, 0 );
            }

            this.A.connect( p[0] );
            this.B.connect( p[1] );
            this.C.connect( p[2] );
            this.D.connect( p[3] );
        };


        IC74HC161.prototype.connectOutput = function ( p )
        {
            if ( arguments.length === 4 ) {
                p = Array.prototype.slice.call( arguments, 0 );
            }

            this.QA.connect( p[0] );
            this.QB.connect( p[1] );
            this.QC.connect( p[2] );
            this.QD.connect( p[3] );
        };



        return IC74HC161;
    }());




    // 4-bit binary full adder with fast carry
    IC74HC283 = (function ()
    {
        var pins = [ OUT('S2'), IN('B2'),  IN('A2'), OUT('S1'), IN('A1'),  IN('B1'), IN('C0'), GND,
                     OUT('C4'), OUT('S4'), IN('B4'), IN('A4'),  OUT('S3'), IN('A3'), IN('B3'), VCC ];

        function IC74HC283 ()
        {
            var i, cIn = this.C0, cOut;

            setupElement( this, pins, arguments );

            cIn = this.C0.inn;

            for ( i = 1; i <= 4; i++ )
            {
                if ( i === 4 ) {
                    cOut = this.C4.inn;
                } else {
                    cOut = new Wire();
                }

                this['fa' + i] = new FullAdder( this['A' + i].inn, this['B' + i].inn, cIn, this['S' + i].inn, cOut );

                cIn = cOut;
            }
        }


        IC74HC283.prototype.connectA = createConnectBus( 'A', 4, false );
        IC74HC283.prototype.connectB = createConnectBus( 'B', 4, false );
        IC74HC283.prototype.connectS = createConnectBus( 'S', 4, false );


        return IC74HC283;
    }());



    function createMemory ( addrBits, dataBits )
    {
        var i, pins = [];

        for ( i = 0; i < addrBits; i++ ) {
            pins.push( IN( 'A' + i ) );
        }

        for ( i = 0; i < dataBits; i++ ) {
            pins.push( OUT( 'D' + i ) );
        }


        function Memory ()
        {
            var i, size;

            setupElement( this, pins, arguments );

            size = 1 << dataBits;

            this.data = [];

            for ( i = 0; i < size; i++ ) {
                this.data.push( 0 );
            }
        }


        Memory.prototype._action = function ()
        {
            var addr, data;

            addr = this.getAddr();
            data = this.load( addr );
            this.setData( data );
        };


        Memory.prototype.getAddr = function ()
        {
            var i, val, a = [], addr;

            for ( i = 0; i < addrBits; i++ )
            {
                val = this['A' + i].getSignal();

                if ( val === null ) {
                    return null;
                }

                a.push( val );
            }

            addr = 0;

            for ( i = 0; i < addrBits; i++ ) {
                addr |= a[i] << i;
            }

            return addr;
        };


        Memory.prototype.setData = function ( data )
        {
            var i;

            if ( data === null )
            {
                for ( i = 0; i < dataBits; i++ ) {
                    this['D' + i].setSignal( null );
                }

                return;
            }

            for ( i = 0; i < dataBits; i++ ) {
                this['D' + i].setSignal( (data & (1 << i)) >> i );
            }
        };


        Memory.prototype.load = function ( addr )
        {
            if ( addr === null ) {
                return null;
            }

            if ( addr < 0 || addr >= this.data.length ) {
                error( 'memory load: out of addr' );
            }

            return this.data[addr];
        };


        Memory.prototype.store = function ( addr, data )
        {
            if ( addr === null ) {
                return null;
            }

            if ( addr < 0 || addr >= this.data.length ) {
                error( 'memory store: out of addr' );
            }

            this.data[addr] = data;
        };


        Memory.prototype.connectAddrBus = createConnectBus( 'A', addrBits, true );
        Memory.prototype.connectDataBus = createConnectBus( 'D', dataBits, true );


        return Memory;
    }



    MemoryA4D8 = createMemory( 4, 8 );



    return {
        Wire: Wire,
        Bus: Bus,
        LED: LED,
        PushSW: PushSW,
        Switch: Switch,
        DIPSW4: DIPSW4,
        DIPSW8: DIPSW8,
        Clock: Clock,

        Inverter: Inverter,
        AndGate: AndGate,
        OrGate: OrGate,
        NandGate: NandGate,
        Nand3Gate: Nand3Gate,

        DFlipFlop: DFlipFlop,
        HalfAdder: HalfAdder,
        FullAdder: FullAdder,

        IC74HC153: IC74HC153,
        IC74HC161: IC74HC161,
        IC74HC283: IC74HC283,

        MemoryA4D8: MemoryA4D8,

        delay: delay,
        start: start
    };
}());

