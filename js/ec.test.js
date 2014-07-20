/*
 * ec.test.js
 * Electronic Circuit Test module
*/

/*jslint           browser : true,   continue : true,
  devel  : true,    indent : 4,       maxerr  : 50,
  newcap : true,     nomen : true,   plusplus : true,
  regexp : true,    sloppy : true,       vars : false,
  white  : true,   bitwise : true
*/
/*global ec */

ec.test = (function () {

    var failedNum = 0,
        testedNum = 0;


    function error ( msg )
    {
        console.log( msg );
        alert( msg );
        throw msg;
    }



    function isArray ( obj )
    {
        if ( obj.isBus ) {
            return true;
        }

        return Object.prototype.toString.call( obj ) === "[object Array]";
    }



    function checkAssertResult ( wires, expects, msg )
    {
        var i,
            failed = false,
            results = [],
            wire,
            expect,
            val;

        if ( ! isArray( wires ) )
        {
            wires = [wires];
            expects = [expects];
        }

        if ( wires.length !== expects.length ) {
            error( "wires.length !== expects.length" );
        }

        for ( i = 0; i < wires.length; i++ )
        {
            wire = wires[i];
            expect = expects[i];
            val = wire.getSignal();

            results.push( val );

            if ( val !== expect ) {
                failed = true;
            }
        }

        if ( failed )
        {
            console.log( [ "[ assert ", msg, " ] NG **********   expects=", expects, ", results=", results ].join("") );
            failedNum++;
        }
        else
        {
            console.log( [ "[ assert ", msg, " ] OK   expects=", expects ].join("") );
        }
    }



    function assertWires ( wires, expects, msg, fn, reset )
    {
        ec.delay( fn );
        ec.start();

        checkAssertResult( wires, expects, msg );

        if ( reset )
        {
            ec.delay( reset );
            ec.start();
        }

        testedNum++;
    }



    function assertTruthValue ( msg, truthTable, reset )
    {
        var i,
            vars = truthTable.shift(),
            inVars = vars.shift(),
            outVars = vars.shift(),
            no = 1,
            vals,
            inVals ,
            outVals;

        while ( truthTable.length )
        {
            vals = truthTable.shift();
            inVals = vals.shift();
            outVals = vals.shift();

            assertWires( outVars, outVals, msg + "[" + (no++) + "]", (function ( inVals ) {
                return function () {
                    for ( i = 0; i < inVars.length; i++ ) {
                        inVars[i].setSignal( inVals[i] );
                    }
                };
            }( inVals )), reset );
        }
    }



    function testInverter ()
    {
        var inv = new ec.Inverter(),
            a   = new ec.Wire(),
            y   = new ec.Wire(),
            msg = "Inverter",
            truthTable;

        inv.connect( "A", a );
        inv.connect( "Y", y );

        truthTable = [
            [[a], [y]],
            [[0], [1]],
            [[1], [0]]
        ];

        function reset ()
        {
            a.setSignal( null );
        }

        assertTruthValue( msg, truthTable, reset );
    }



    function testAndGate ()
    {
        var and = new ec.AndGate(),
            a   = new ec.Wire(),
            b   = new ec.Wire(),
            y   = new ec.Wire(),
            msg = "And Gate",
            truthTable;

        and.connect( "A", a );
        and.connect( "B", b );
        and.connect( "Y", y );

        truthTable = [
            [[a, b], [y]],
            [[0, 0], [0]],
            [[1, 0], [0]],
            [[0, 1], [0]],
            [[1, 1], [1]]
        ];

        function reset ()
        {
            a.setSignal( null );
            b.setSignal( null );
        }

        assertTruthValue( msg, truthTable, reset );
    }



    function testOrGate ()
    {
        var or = new ec.OrGate(),
            a  = new ec.Wire(),
            b  = new ec.Wire(),
            y  = new ec.Wire(),
            msg = "Or Gate",
            truthTable;

        or.connect( "A", a );
        or.connect( "B", b );
        or.connect( "Y", y );

        truthTable = [
            [[a, b], [y]],
            [[0, 0], [0]],
            [[1, 0], [1]],
            [[0, 1], [1]],
            [[1, 1], [1]]
        ];

        function reset ()
        {
            a.setSignal( null );
            b.setSignal( null );
        }

        assertTruthValue( msg, truthTable, reset );
    }



    function testNandGate ()
    {
        var nand = new ec.NandGate(),
            a    = new ec.Wire(),
            b    = new ec.Wire(),
            y    = new ec.Wire(),
            msg = "Nand Gate",
            truthTable;

        nand.connect( "A", a );
        nand.connect( "B", b );
        nand.connect( "Y", y );

        truthTable = [
            [[a, b], [y]],
            [[0, 0], [1]],
            [[1, 0], [1]],
            [[0, 1], [1]],
            [[1, 1], [0]]
        ];

        function reset ()
        {
            a.setSignal( null );
            b.setSignal( null );
        }

        assertTruthValue( msg, truthTable, reset );
    }



    function testNand3Gate ()
    {
        var nand = new ec.Nand3Gate(),
            a    = new ec.Wire(),
            b    = new ec.Wire(),
            c    = new ec.Wire(),
            y    = new ec.Wire(),
            msg = "Nand3 Gate",
            truthTable;

        nand.connect( "A", a );
        nand.connect( "B", b );
        nand.connect( "C", c );
        nand.connect( "Y", y );

        truthTable = [
            [[a, b, c], [y]],
            [[0, 0, 0], [1]],
            [[1, 0, 0], [1]],
            [[0, 1, 0], [1]],
            [[1, 1, 0], [1]],
            [[0, 0, 1], [1]],
            [[1, 0, 1], [1]],
            [[0, 1, 1], [1]],
            [[1, 1, 1], [0]]
        ];

        function reset ()
        {
            a.setSignal( null );
            b.setSignal( null );
            c.setSignal( null );
        }

        assertTruthValue( msg, truthTable, reset );
    }



    function testDFlipFlop ()
    {
        var ff    = new ec.DFlipFlop(),
            d     = new ec.Wire(),
            ck    = new ec.Wire(),
            clr_b = new ec.Wire(),
            pr_b  = new ec.Wire(),
            q     = new ec.Wire(),
            q_b   = new ec.Wire(),
            msg = "D Flip-Flop";

        ff.connect( "D", d );
        ff.connect( "CK", ck );
        ff.connect( "CLR_B", clr_b );
        ff.connect( "PR_B", pr_b );
        ff.connect( "Q", q );
        ff.connect( "Q_B", q_b );

        function reset ()
        {
            clr_b.setSignal( 1 );
            pr_b.setSignal( 1 );

            d.setSignal( null );

            ck.setSignal( 0 );
            ck.setDelayedSignal( 1 );
        }

        reset();
        ec.start();

        assertWires( [q, q_b], [0, 1], msg, function () {
            d.setSignal( 0 );

            ck.setSignal( 0 );
            ck.setDelayedSignal( 1 );
        }, reset );

        assertWires( [q, q_b], [1, 0], msg, function () {
            d.setSignal( 1 );

            ck.setSignal( 0 );
            ck.setDelayedSignal( 1 );
        }, reset );
    }



    function testSwitch ()
    {
        var sw = new ec.Switch(),
            l1 = new ec.Wire(),
            l2 = new ec.Wire(),
            c  = new ec.Wire(),
            msg = "Switch";

        sw.connect( "L1", l1 );
        sw.connect( "L2", l2 );
        sw.connect( "C", c );

        assertWires( c, 1, msg, function () {
            l1.setSignal( 1 );
            l2.setSignal( 0 );
        } );

        assertWires( c, 0, msg, function () {
            sw.toggle();
        } );
    }



    function testDIPSW8 ()
    {
        var sw = new ec.DIPSW8(),
            y  = new ec.Bus( 8 ),
            msg = "DIPSW8";

        sw.connectBus( y );

        sw.on( 1 );

        assertWires( y[0], 1, msg, function () {
            sw.on( 0 );
        } );

        assertWires( y[1], 0, msg, function () {
            sw.off( 1 );
        } );

        assertWires( y[2], 1, msg, function () {
            sw.toggle( 2 );
        } );
    }



    function testHalfAdder ()
    {
        var ha = new ec.HalfAdder(),
            a  = new ec.Wire(),
            b  = new ec.Wire(),
            s  = new ec.Wire(),
            c  = new ec.Wire(),
            msg = "Half Adder",
            truthTable;

        ha.connect( "A", a );
        ha.connect( "B", b );
        ha.connect( "S", s );
        ha.connect( "C", c );

        truthTable = [
            [[a, b], [s, c]],
            [[0, 0], [0, 0]],
            [[1, 0], [1, 0]],
            [[0, 1], [1, 0]],
            [[1, 1], [0, 1]]
        ];

        function reset ()
        {
            a.setSignal( null );
            b.setSignal( null );
        }

        assertTruthValue( msg, truthTable, reset );
    }



    function testFullAdder ()
    {
        var fa    = new ec.FullAdder(),
            a     = new ec.Wire(),
            b     = new ec.Wire(),
            c_in  = new ec.Wire(),
            s     = new ec.Wire(),
            c_out = new ec.Wire(),
            msg = "Full Adder",
            truthTable;

        fa.connect( "A", a );
        fa.connect( "B", b );
        fa.connect( "C_IN", c_in );
        fa.connect( "S", s );
        fa.connect( "C_OUT", c_out );

        truthTable = [
            [[a, b, c_in], [s, c_out]],

            [[0, 0, 0], [0, 0]],
            [[1, 0, 0], [1, 0]],
            [[0, 1, 0], [1, 0]],
            [[1, 1, 0], [0, 1]],

            [[0, 0, 1], [1, 0]],
            [[1, 0, 1], [0, 1]],
            [[0, 1, 1], [0, 1]],
            [[1, 1, 1], [1, 1]]
        ];

        function reset ()
        {
            a.setSignal( null );
            b.setSignal( null );
            c_in.setSignal( null );
        }

        assertTruthValue( msg, truthTable, reset );
    }



    function testIC74HC153 ()
    {
        var ic  = new ec.IC74HC153(),
            a   = new ec.Wire(),
            b   = new ec.Wire(),
            c_1 = new ec.Bus( 4 ),
            y   = new ec.Wire(),
            g_b = new ec.Wire(),
            c_2 = new ec.Bus( 4 ),
            y_2   = new ec.Wire(),
            g_b_2 = new ec.Wire(),
            msg = "IC74HC153",
            truthTable;

        ic.connect( "A", a );
        ic.connect( "B", b );
        ic.connectC_1( c_1 );
        ic.connect( "G_1_B", g_b );
        ic.connectC_2( c_2 );
        ic.connect( "G_2_B", g_b_2 );
        ic.connect( "Y_1", y );
        ic.connect( "Y_2", y_2 );

        truthTable = [
            [[b, a, c_1[0], c_1[1], c_1[2], c_1[3]], [y]],

            [[0, 0, 0, null, null, null], [0]],
            [[0, 0, 1, null, null, null], [1]],
            [[0, 1, null, 0, null, null], [0]],
            [[0, 1, null, 1, null, null], [1]],

            [[1, 0, null, null, 0, null], [0]],
            [[1, 0, null, null, 1, null], [1]],
            [[1, 1, null, null, null, 0], [0]],
            [[1, 1, null, null, null, 1], [1]]
        ];

        assertTruthValue( msg, truthTable );
    }



    function testIC74HC161 ()
    {
        var ic    = new ec.IC74HC161(),
            inBus = new ec.Bus( 4 ),
            ck    = new ec.Wire(),
            ld_b  = new ec.Wire(),
            clr_b = new ec.Wire(),
            ent   = new ec.Wire(),
            enp   = new ec.Wire(),
            outBus = new ec.Bus( 4 ),
            msg = "IC74HC161";

        ic.connectInput( inBus );
        ic.connect( "CK", ck );
        ic.connect( "LD_B", ld_b );
        ic.connect( "CLR_B", clr_b );
        ic.connect( "ENT", ent );
        ic.connect( "ENP", enp );
        ic.connectOutput( outBus );

        function reset ()
        {
            clr_b.setSignal( 1 );
            ld_b.setSignal( 0 );

            inBus.setSignals( 1, 1, 1, 1 );

            ck.setSignal( 0 );
            ck.setDelayedSignal( 1 );
        }

        reset();
        ec.start();

        // clear
        assertWires( outBus, [0, 0, 0, 0], msg, function () {
            clr_b.setSignal( 0 );
        }, reset );

        // countup
        assertWires( outBus, [0, 0, 0, 0], msg, function () {
            ld_b.setSignal( 1 );
            ent.setSignal( 1 );
            enp.setSignal( 1 );

            ck.setSignal( 0 );
            ck.setDelayedSignal( 1 );
        }, reset );
    }



    function testIC74HC283 ()
    {
        var ic = new ec.IC74HC283(),
            a  = new ec.Bus( 4 ),
            b  = new ec.Bus( 4 ),
            c0 = new ec.Wire(),
            s  = new ec.Bus( 4 ),
            c4 = new ec.Wire(),
            msg = "IC74HC283",
            truthTable,
            i,
            av,
            bv,
            cv,
            sv,
            aa,
            ba,
            sa;

        ic.connectA( a );
        ic.connectB( b );
        ic.connectS( s );

        ic.connect( "C0", c0 );
        ic.connect( "C4", c4 );

        truthTable = [
            [[a[0], a[1], a[2], a[3], b[0], b[1], b[2], b[3], c0], [s[0], s[1], s[2], s[3], c4]]
        ];

        for ( cv = 0; cv < 2; cv++ )
        {
            for ( bv = 0; bv < 16; bv++ )
            {
                for ( av = 0; av < 16; av++ )
                {
                    sv = av + bv + cv;
                    aa = [];
                    ba = [];
                    sa = [];

                    for ( i = 0; i < 4; i++ )
                    {
                        aa.push( ( av & (1 << i) )  >>  i );
                        ba.push( ( bv & (1 << i) )  >>  i );
                        sa.push( ( sv & (1 << i) )  >>  i );
                    }

                    truthTable.push( [[ aa[0], aa[1], aa[2], aa[3],
                                        ba[0], ba[1], ba[2], ba[3], cv ],
                                      [ sa[0], sa[1], sa[2], sa[3], (sv&16)>>4 ]] );
                }
            }
        }

        function reset ()
        {
            var i;

            for ( i = 0; i < 4; i++ )
            {
                a[i].setSignal( null );
                b[i].setSignal( null );
            }

            c0.setSignal( null );
        }

        assertTruthValue( msg, truthTable, reset );
    }



    function testMemoryA4D8 ()
    {
        var m = new ec.MemoryA4D8(),
            a = new ec.Bus( 4 ),
            d = new ec.Bus( 8 ),
            msg = "MemoryA4D8";

        m.connectAddrBus( a );
        m.connectDataBus( d );

        m.store( 10, 255 );

        assertWires( d, [1, 1, 1, 1, 1, 1, 1, 1], msg, function () {
            a.setValue( 10 );
        } );
    }



    function test ()
    {
        testInverter();
        testAndGate();
        testOrGate();
        testNandGate();
        testNand3Gate();
        testDFlipFlop();
        testSwitch();
        testDIPSW8();
        testHalfAdder();
        testFullAdder();
        testIC74HC153();
        testIC74HC161();
        testIC74HC283();
        testMemoryA4D8();

        ec.delay( function () {
            console.log( testedNum + " tests completed" );

            if ( failedNum === 0 ) {
                console.log( "all tests passed" );
            } else {
                console.log( "***** " + failedNum + " tests failed *****" );
            }
        } );

        ec.start();
    }



    return test;
}());

