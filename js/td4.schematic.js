/*
 * td4.schematic.js
 * Schematic module for TD4
*/

/*jslint         browser : true, continue : true,
  devel  : true, indent  : 4,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true, bitwise : true
*/
/*global $, td4, ec, ve */

td4.schematic = (function ()
{
    var
        MAX_PC = 16,

        configMap = {
            main_html : '<canvas class="td4-schematic-canvas" width="800" height="590">'
                            + 'Canvas not supported'
                        + '</canvas>'
        },
        stateMap = {
            currentPc: 0
        },
        jq = {},  // jQuery map
        elems = {},
        wires = {},
        bus = {},
        paths,
        outpChangeListeners = [],
        pcChangeListeners = [],
        clockStartedListeners = [],
        clockStoppedListeners = [],

        DFlipFlop, IC74HC153, IC74HC161, IC74HC283, MemoryA4D8;



    DFlipFlop = ve.createDIP_IC( ec.DFlipFlop, 4,
            { PR_B: 1, CK: 2, D: 3, CLR_B: 4 },
            { Q: 2, Q_B: 3 } );



    IC74HC153 = ve.createDIP_IC( ec.IC74HC153, 13,
            { A: 1, B: 2, G_1_B: 4, C0_1: 5, C1_1: 6, C2_1: 7, C3_1: 8, G_2_B: 9, C0_2: 10, C1_2: 11, C2_2: 12, C3_2: 13 },
            { Y_1: 6, Y_2: 7 } );



    IC74HC161 = ve.createDIP_IC( ec.IC74HC161, 7,
            { CLR_B: 1, LD_B: 2, CK: 3, A: 4, B: 5, C: 6, D: 7 },
            { ENT: 1, ENP: 2, QA: 4, QB: 5, QC: 6, QD: 7 } );



    IC74HC283 = ve.createDIP_IC( ec.IC74HC283, 11,
            { A1: 1, A2: 2, A3: 3, A4: 4, B1: 6, B2: 7, B3: 8, B4: 9, C0: 11 },
            { S1: 1, S2: 2, S3: 3, S4: 4, C4: 6 } );



    MemoryA4D8 = ve.createDIP_IC( ec.MemoryA4D8, 13,
            { D0: 1, D1: 2, D2: 3, D3: 4, D4: 5, D5: 6, D6: 7, D7: 8, A0: 10, A1: 11, A2: 12, A3: 13 },
            {} );



    function getIC74HC161Output ( ic )
    {
        var qa, qb, qc, qd, ret;

        qa = ic.QA.getSignal();
        qb = ic.QB.getSignal();
        qc = ic.QC.getSignal();
        qd = ic.QD.getSignal();

        ret = qd << 3 | qc << 2 | qb << 1 | qa;

        if ( ret >= 0 && ret < 16 ) {
            return ret;
        }

        return null;
    }



    function drawElements ()
    {
        for ( name in elems ) {
            if ( elems.hasOwnProperty( name ) ) {
                elems[name].draw();
            }
        }
    }



    function drawConnectors ()
    {
        for ( name in elems ) {
            if ( elems.hasOwnProperty( name ) ) {
                for ( pinName in elems[name].cn_pos ) {
                    if ( elems[name].cn_pos.hasOwnProperty( pinName ) ) {
                        elems[name].cn[pinName].action();
                    }
                }
            }
        }
    }



    function createTD4Schematic ()
    {
        function createWires ()
        {
            wires.ck = new ec.Wire();
            wires.reset = new ec.Wire();
        }


        function createBusses ()
        {
            bus.a = new ec.Bus( 4 );
            bus.b = new ec.Bus( 4 );
            bus.result = new ec.Bus( 4 );
            bus.addr = new ec.Bus( 4 );
            bus.data = new ec.Bus( 8 );
            bus.outp = new ec.Bus( 4 );
        }


        function createElements ()
        {
            var i;

            elems.clock    = new ve.Clock();
            elems.resetBtn = new ve.ResetButton();
            elems.rom      = new MemoryA4D8();
            elems.aReg     = new IC74HC161();  // A register
            elems.bReg     = new IC74HC161();  // B register
            elems.outp     = new IC74HC161();  // output port
            elems.pc       = new IC74HC161();  // program counter
            elems.sel1     = new IC74HC153();  // selector1
            elems.sel2     = new IC74HC153();  // selector2
            elems.inp      = new ve.DIPSW4();  // input port
            elems.adder    = new IC74HC283();
            elems.cf       = new DFlipFlop();  // carry flag
            elems.ic8a     = new ve.OrGate();
            elems.ic8b     = new ve.OrGate();
            elems.ic8c     = new ve.OrGate();
            elems.ic10c    = new ve.Nand3Gate();
            elems.ic8d     = new ve.OrGate();
            elems.ic10a    = new ve.Nand3Gate();
            elems.ic10b    = new ve.Nand3Gate();

            for ( i = 0; i < 4; i++ ) {
                elems['outLed' + i] = new ve.LED();
            }
        }


        function setElementsPos ()
        {
            var i,
                H_161 = 110,
                D_LOGIC_VERT = 10;

            elems.clock.setPos( 24, 21 );
            elems.resetBtn.setPos( 64, 39 );
            elems.rom.setPos( 730, 500 );
            elems.aReg.setPos( 150, 200 );
            elems.bReg.setPos( elems.aReg.x, elems.aReg.y + H_161 );
            elems.outp.setPos( elems.bReg.x, elems.bReg.y + H_161 );
            elems.pc.setPos( elems.outp.x, elems.outp.y + H_161 );
            elems.sel1.setPos( elems.aReg.x + 225, 220 );
            elems.sel2.setPos( elems.sel1.x, elems.sel1.y + 160 );
            elems.inp.setPos( elems.sel2.x - 90, elems.sel2.y + 100 );
            elems.adder.setPos( elems.sel1.x + 160, elems.sel1.y - 24 );
            elems.cf.setPos( elems.adder.x + 150, elems.adder.y - 30 );
            elems.ic8a.setPos( elems.rom.x - 370, elems.rom.y + 9 );
            elems.ic8b.setPos( elems.rom.x - 120, elems.rom.y - 104 );
            elems.ic8c.setPos( elems.rom.x - 14, elems.cf.y + elems.cf.h + 54 );
            elems.ic8d.setPos( elems.ic8c.x, elems.ic8c.y + elems.ic8c.h + D_LOGIC_VERT );
            elems.ic10a.setPos( elems.ic8b.x, elems.ic8d.y - 8 );
            elems.ic10b.setPos( elems.ic8d.x, elems.ic8d.y + elems.ic8d.h + D_LOGIC_VERT );
            elems.ic10c.setPos( elems.ic10b.x, elems.ic10b.y + elems.ic10b.h + D_LOGIC_VERT );

            for ( i = 0; i < 4; i++ )
            {
                elems['outLed' + i].setPos( elems.outp.x + elems.outp.w + ((3-i) * ve.DIP_H_UNIT), elems.outp.y + 60 );
            }
        }


        function confClock ()
        {
            var e = elems.clock;

            e.setHz( 1 );
            e.CK.connect( wires.ck );
        }


        function confResetButton ()
        {
            elems.resetBtn.Y.connect( wires.reset );
        }


        function confMemory ()
        {
            var e = elems.rom;

            e.connectAddrBus( bus.addr );
            e.connectDataBus( bus.data );
        }


        function confAReg ()
        {
            var e = elems.aReg;

            e.CK.connect( wires.ck );
            e.CLR_B.connect( wires.reset );
            e.ENT.inn.setSignal( 0 );
            e.ENP.inn.setSignal( 0 );
            e.LD_B.connect( elems.ic8c.Y );
            e.connectInput( bus.result );
            e.connectOutput( bus.a );
        }


        function confBReg ()
        {
            var e = elems.bReg;

            e.CK.connect( wires.ck );
            e.CLR_B.connect( wires.reset );
            e.ENT.inn.setSignal( 0 );
            e.ENP.inn.setSignal( 0 );
            e.LD_B.connect( elems.ic8d.Y );
            e.connectInput( bus.result );
            e.connectOutput( bus.b );
        }


        function confOutPort ()
        {
            var e = elems.outp;

            e.CK.connect( wires.ck );
            e.CLR_B.connect( wires.reset );
            e.ENT.inn.setSignal( 0 );
            e.ENP.inn.setSignal( 0 );
            e.LD_B.connect( elems.ic10b.Y );
            e.connectInput( bus.result );
            e.connectOutput( bus.outp );
        }


        function confProgramCounter ()
        {
            var e = elems.pc;

            e.CK.connect( wires.ck );
            e.CLR_B.connect( wires.reset );
            e.ENT.inn.setSignal( 1 );
            e.ENP.inn.setSignal( 1 );
            e.LD_B.connect( elems.ic10c.Y );
            e.connectInput( bus.result );
            e.connectOutput( bus.addr );
        }


        function confOutLed ()
        {
            var i;

            for ( i = 0; i < 4; i++ ) {
                elems['outLed' + i].A.connect( elems.outp['PIN' + (14-i)] );
            }
        }


        function confSelector ()
        {
            var sel1 = elems.sel1,
                sel2 = elems.sel2,
                aReg = elems.aReg,
                bReg = elems.bReg,
                inp  = elems.inp;

            sel1.G_1_B.inn.setSignal( 0 );
            sel1.G_2_B.inn.setSignal( 0 );
            sel2.G_1_B.inn.setSignal( 0 );
            sel2.G_2_B.inn.setSignal( 0 );

            sel1.A.connect( elems.ic8a.Y );
            sel1.B.connect( bus.data[5] );
            sel2.A.connect( elems.ic8a.Y );
            sel2.B.connect( bus.data[5] );

            sel1.C0_1.connect( aReg.QA );
            sel1.C0_2.connect( aReg.QB );
            sel2.C0_1.connect( aReg.QC );
            sel2.C0_2.connect( aReg.QD );

            sel1.C1_1.connect( bReg.QA );
            sel1.C1_2.connect( bReg.QB );
            sel2.C1_1.connect( bReg.QC );
            sel2.C1_2.connect( bReg.QD );

            sel1.C2_1.connect( inp.Y0 );
            sel1.C2_2.connect( inp.Y1 );
            sel2.C2_1.connect( inp.Y2 );
            sel2.C2_2.connect( inp.Y3 );

            sel1.C3_1.inn.setSignal( 0 );
            sel1.C3_2.inn.setSignal( 0 );
            sel2.C3_1.inn.setSignal( 0 );
            sel2.C3_2.inn.setSignal( 0 );
        }


        function confAdder ()
        {
            var e = elems.adder,
                sel1 = elems.sel1,
                sel2 = elems.sel2,
                d = bus.data;

            e.C0.inn.setSignal( 0 );
            e.connectA( sel1.Y_1, sel1.Y_2, sel2.Y_1, sel2.Y_2 );
            e.connectB( d[0], d[1], d[2], d[3] );
            e.connectS( bus.result );
        }


        function confCarryFlag ()
        {
            var e = elems.cf;

            e.PR_B.inn.setSignal( 1 );
            e.CK.connect( wires.ck );
            e.CLR_B.connect( wires.reset );
            e.D.connect( elems.adder.C4 );
        }


        function confIC8 ()
        {
            var ic8a = elems.ic8a,
                ic8b = elems.ic8b,
                ic8c = elems.ic8c,
                ic8d = elems.ic8d,
                d = bus.data;

            ic8a.A.connect( d[4] );
            ic8a.B.connect( d[7] );
            ic8a.flip();

            ic8b.A.connect( elems.cf.Q_B );
            ic8b.B.connect( d[4] );

            ic8c.A.connect( d[6] );
            ic8c.B.connect( d[7] );

            ic8d.A.connect( elems.ic10a.Y );
            ic8d.B.connect( d[7] );
        }


        function confIC10 ()
        {
            var a = elems.ic10a,
                b = elems.ic10b,
                c = elems.ic10c,
                d = bus.data;


            a.A.inn.setSignal( 1 );
            a.B.inn.setSignal( 1 );
            a.C.connect( d[6] );

            b.A.inn.setSignal( 1 );
            b.B.connect( elems.ic10a.Y );
            b.C.connect( d[7] );

            c.A.connect( d[6] );
            c.B.connect( d[7] );
            c.C.connect( elems.ic8b.Y );
        }


        function createPaths ()
        {
            var pos,
                cf = elems.cf,
                rom = elems.rom,
                aReg = elems.aReg,
                bReg = elems.bReg,
                outp = elems.outp,
                pc = elems.pc,
                sel1 = elems.sel1,
                sel2 = elems.sel2,
                adder = elems.adder,
                ic8a = elems.ic8a,
                ic8c = elems.ic8c,
                ic8d = elems.ic8d,
                ic10b = elems.ic10b,
                ic10c = elems.ic10c,
                D_WW  = ve.DIP_H_UNIT - 2;

            paths = ve.createAutoPath( elems );

            paths.clock = paths.getPath( elems.clock.cn.CK );
            paths.reset = paths.getPath( elems.aReg.cn.CLR_B );
            paths.inp0 = paths.getPath( elems.inp.cn.Y0 );
            paths.inp1 = paths.getPath( elems.inp.cn.Y1 );
            paths.inp2 = paths.getPath( elems.inp.cn.Y2 );
            paths.inp3 = paths.getPath( elems.inp.cn.Y3 );

            paths.setAlign( cf.cn.CK, ve.ALIGN_TOP, 20 );
            paths.setAlign( cf.cn.CLR_B, ve.ALIGN_TOP, 20 + D_WW );
            paths.setAlign( cf.cn.CLR_B, ve.ALIGN_PIN_TURN, D_WW - 6 );
            paths.setAlign( cf.cn.Q_B, ve.ALIGN_MID, -56 );
            paths.setAlign( cf.cn.D, ve.ALIGN_PIN_TURN, D_WW * 2 );


            paths.setAlign( aReg.cn.QB, ve.ALIGN_PIN_TURN, D_WW * 2 );
            paths.setAlign( aReg.cn.QC, ve.ALIGN_PIN_TURN, D_WW );
            paths.setAlign( bReg.cn.QA, ve.ALIGN_PIN_TURN, D_WW * 3 );
            paths.setAlign( bReg.cn.QB, ve.ALIGN_PIN_TURN, D_WW * 4 );
            paths.setAlign( bReg.cn.QC, ve.ALIGN_PIN_TURN, D_WW );


            paths.setAlign( sel1.cn.A, ve.ALIGN_PIN_TURN, D_WW );
            paths.setAlign( sel2.cn.A, ve.ALIGN_PIN_TURN, D_WW );

            paths.setAlign( sel1.cn.C1_1, ve.ALIGN_PIN, 0 );
            paths.setAlign( sel1.cn.C0_2, ve.ALIGN_PIN, 0 );
            paths.setAlign( sel1.cn.C1_2, ve.ALIGN_PIN, 0 );

            paths.setAlign( sel2.cn.C0_1, ve.ALIGN_PIN_TURN, 52 );
            paths.setAlign( sel2.cn.C0_1, ve.ALIGN_MID, -20 );
            paths.setAlign( sel2.cn.C1_1, ve.ALIGN_PIN, 0 );
            paths.setAlign( sel2.cn.C0_2, ve.ALIGN_PIN_TURN, 64 );
            paths.setAlign( sel2.cn.C0_2, ve.ALIGN_MID, -40 );
            paths.setAlign( sel2.cn.C1_2, ve.ALIGN_PIN_TURN, 84 );

            paths.setAlign( sel1.cn.Y_2, ve.ALIGN_PIN_TURN, D_WW );
            paths.setAlign( sel2.cn.Y_1, ve.ALIGN_PIN_TURN, D_WW * 2 );
            paths.setAlign( sel2.cn.Y_2, ve.ALIGN_PIN_TURN, D_WW * 3 );


            pos = 50;
            paths.setAlign( adder.cn.S1, ve.ALIGN_TOP, pos );
            paths.setAlign( adder.cn.S2, ve.ALIGN_TOP, pos + D_WW );
            paths.setAlign( adder.cn.S3, ve.ALIGN_TOP, pos + D_WW * 2 );
            paths.setAlign( adder.cn.S4, ve.ALIGN_TOP, pos + D_WW * 3 );

            paths.setAlign( adder.cn.S2, ve.ALIGN_PIN_TURN, D_WW );
            paths.setAlign( adder.cn.S3, ve.ALIGN_PIN_TURN, D_WW * 2 );
            paths.setAlign( adder.cn.S4, ve.ALIGN_PIN_TURN, D_WW * 3 );

            paths.setAlign( adder.cn.B2, ve.ALIGN_PIN_TURN, D_WW );
            paths.setAlign( adder.cn.B3, ve.ALIGN_PIN_TURN, D_WW * 2 );
            paths.setAlign( adder.cn.B4, ve.ALIGN_PIN_TURN, D_WW * 3 );

            paths.setAlign( adder.cn.A1, ve.ALIGN_PIN, 0 );
            paths.setAlign( adder.cn.A2, ve.ALIGN_PIN, 0 );
            paths.setAlign( adder.cn.A3, ve.ALIGN_PIN, 0 );
            paths.setAlign( adder.cn.A4, ve.ALIGN_PIN, 0 );

            paths.setAlign( adder.cn.C4, ve.ALIGN_PIN, 0 );



            pos = 56;
            paths.setAlign( pc.cn.A, ve.ALIGN_PIN_TURN, pos + D_WW * 3 );
            paths.setAlign( pc.cn.B, ve.ALIGN_PIN_TURN, pos + D_WW * 2 );
            paths.setAlign( pc.cn.C, ve.ALIGN_PIN_TURN, pos + D_WW );
            paths.setAlign( pc.cn.D, ve.ALIGN_PIN_TURN, pos );


            pos = 140;
            paths.setAlign( ic8a.cn.B, ve.ALIGN_PIN, 0 );
            paths.setAlign( ic8c.cn.A, ve.ALIGN_PIN_TURN, pos );
            paths.setAlign( ic8c.cn.B, ve.ALIGN_PIN_TURN, pos + D_WW );
            paths.setAlign( ic8d.cn.B, ve.ALIGN_PIN_TURN, 4 );
            paths.setAlign( ic10b.cn.B, ve.ALIGN_PIN, 0 );
            paths.setAlign( ic10b.cn.B, ve.ALIGN_PIN_TURN, D_WW );
            paths.setAlign( ic10c.cn.A, ve.ALIGN_PIN_TURN, D_WW * 2 );


            pos = 90;
            paths.setAlign( ic8c.cn.Y,  ve.ALIGN_TOP, pos );
            paths.setAlign( ic8d.cn.Y,  ve.ALIGN_TOP, pos + D_WW );
            paths.setAlign( ic10b.cn.Y, ve.ALIGN_TOP, pos + D_WW * 2 );
            paths.setAlign( ic10c.cn.Y, ve.ALIGN_TOP, pos + D_WW * 3 );

            paths.setAlign( ic8d.cn.Y,  ve.ALIGN_PIN_TURN, D_WW );
            paths.setAlign( ic10b.cn.Y, ve.ALIGN_PIN_TURN, D_WW * 2 - 4 );
            paths.setAlign( ic10c.cn.Y, ve.ALIGN_PIN_TURN, D_WW * 3 - 4 );


            paths.setAlign( ic8a.cn.Y,  ve.ALIGN_PIN, 0 );


            paths.setAlign( pc.cn.CLR_B,   ve.ALIGN_PIN_TURN, D_WW - 6 );
            paths.setAlign( outp.cn.CLR_B, ve.ALIGN_PIN_TURN, D_WW - 6 );
            paths.setAlign( bReg.cn.CLR_B, ve.ALIGN_PIN_TURN, D_WW - 6 );
            paths.setAlign( aReg.cn.CLR_B, ve.ALIGN_PIN_TURN, D_WW - 6 );

            paths.setAlign( pc.cn.LD_B,   ve.ALIGN_PIN_TURN, D_WW * 2 - 6 );
            paths.setAlign( outp.cn.LD_B, ve.ALIGN_PIN_TURN, D_WW * 3 - 6 );
            paths.setAlign( bReg.cn.LD_B, ve.ALIGN_PIN_TURN, D_WW * 4 - 6 );
            paths.setAlign( aReg.cn.LD_B, ve.ALIGN_PIN_TURN, D_WW * 5 - 6 );


            paths.setAlign( rom.cn.A1, ve.ALIGN_MID, -D_WW );
            paths.setAlign( rom.cn.A2, ve.ALIGN_MID, -D_WW * 2 );
            paths.setAlign( rom.cn.A3, ve.ALIGN_MID, -D_WW * 3 );

            paths.setAlign( rom.cn.D0, ve.ALIGN_PIN, 0 );
            paths.setAlign( rom.cn.D1, ve.ALIGN_PIN, 0 );
            paths.setAlign( rom.cn.D2, ve.ALIGN_PIN, 0 );
            paths.setAlign( rom.cn.D3, ve.ALIGN_PIN, 0 );

            paths.setAlign( rom.cn.D4, ve.ALIGN_PIN, 0 );
            paths.setAlign( rom.cn.D5, ve.ALIGN_PIN, 0 );
            paths.setAlign( rom.cn.D6, ve.ALIGN_PIN, 0 );


            paths.calc();

            paths.setClockListener( elems.clock );
        }


        function draw ()
        {
            var name, pinName;

            drawElements();
            drawConnectors();

            ve.drawLabel( 'A REG - 74HC161', elems.aReg );
            ve.drawLabel( 'B REG - 74HC161', elems.bReg );
            ve.drawLabel( 'OUTP - 74HC161', elems.outp );
            ve.drawLabel( 'PC - 74HC161', elems.pc );
            ve.drawLabel( 'SEL1 - 74HC153', elems.sel1 );
            ve.drawLabel( 'SEL2 - 74HC153', elems.sel2 );
            ve.drawLabel( 'ADDER - 74HC283', elems.adder );
            ve.drawLabel( 'FLAG - D Flip-Flop', elems.cf );
            ve.drawLabel( 'ROM', elems.rom );

            paths.draw();
        }


        function setOnClockHandler ()
        {
            function OnClockHandler () {
                this.onClock = function ( s ) {
                    var pc;

                    if ( s !== 1 ) {
                        return;
                    }

                    pc = getIC74HC161Output( elems.pc );

                    if ( pc !== null )
                    {
                        if ( pc !== stateMap.currentPc ) {
                            notifyPcChange( pc, stateMap.currentPc );
                            stateMap.currentPc = pc;
                        }
                    }
                }
            }

            elems.clock.addClockListener( new OnClockHandler() );
        }


        function setOutpChangeHandler ()
        {
            function OutpChangeHandler ( i ) {
                this.action = function ( s ) {
                    if ( s === 1 ) {
                        notifyOutpChange( i, true );
                    } else {
                        notifyOutpChange( i, false );
                    }
                }
            }

            elems.outp.QA.addChangeListener( new OutpChangeHandler( 0 ) );
            elems.outp.QB.addChangeListener( new OutpChangeHandler( 1 ) );
            elems.outp.QC.addChangeListener( new OutpChangeHandler( 2 ) );
            elems.outp.QD.addChangeListener( new OutpChangeHandler( 3 ) );
        }


        createWires();
        createBusses();
        createElements();
        setElementsPos();

        confClock();
        confResetButton();
        confMemory();
        confAReg();
        confBReg();
        confOutPort();
        confProgramCounter();
        confOutLed();
        confSelector();
        confAdder();
        confCarryFlag();
        confIC8();
        confIC10();

        createPaths();

        draw();

        setOnClockHandler();
        setOutpChangeHandler();
    }



    function setJqueryMap ( $container )
    {
        jq = {
            $container: $container,
            $canvas: $container.find ( '.td4-schematic-canvas' )[0]
        };
    }



    function reset ()
    {
        elems.resetBtn.down();
        ec.start();

        manualClock();

        elems.resetBtn.up();
        ec.start();
    }



    function isRunning ()
    {
        return elems.clock.isRunning();
    }



    function startClock ( hz )
    {
        elems.clock.start( hz );

        notifyClockStarted( hz );
    }



    function stopClock ()
    {
        elems.clock.stop();

        notifyClockStopped();
    }



    function manualClock ()
    {
        elems.clock.stop();
        elems.clock.e.signal = 1;
        elems.clock.next();
        elems.clock.next();
    }



    function setInPort ( i, isOn )
    {
        if ( isOn ) {
            elems.inp.on( i );
        } else {
            elems.inp.off( i );
        }
    }



    function addOutpChangeListener ( listener )
    {
        outpChangeListeners.push( listener );
    }



    function notifyOutpChange ( index, isOn )
    {
        var i;

        for ( i = 0; i < outpChangeListeners.length; i++ ) {
            outpChangeListeners[i].onOutpChange( index, isOn );
        }
    }



    function addPcChangeListener ( listener )
    {
        pcChangeListeners.push( listener );
    }



    function notifyPcChange ( newPc, oldPc )
    {
        var i;

        for ( i = 0; i < pcChangeListeners.length; i++ ) {
            pcChangeListeners[i].onPcChange( newPc, oldPc );
        }
    }



    function addClockStartedListener ( listener )
    {
        clockStartedListeners.push( listener );
    }



    function notifyClockStarted ( hz )
    {
        var i;

        for ( i = 0; i < clockStartedListeners.length; i++ ) {
            clockStartedListeners[i].onClockStart( hz );
        }
    }



    function addClockStoppedListener ( listener )
    {
        clockStoppedListeners.push( listener );
    }



    function notifyClockStopped ()
    {
        var i;

        for ( i = 0; i < clockStoppedListeners.length; i++ ) {
            clockStoppedListeners[i].onClockStop();
        }
    }



    function showWire ( name, isVisible )
    {
        var i, p = [];

        if ( name === 'clock' ) {
            p.push( paths.clock );
        } else if ( name === 'reset' ) {
            p.push( paths.reset );
        } else if ( name === 'inp' ) {
            p.push( paths.inp0 );
            p.push( paths.inp1 );
            p.push( paths.inp2 );
            p.push( paths.inp3 );
        } else {
            return;
        }

        for ( i = 0; i < p.length; i++ )
        {
            p[i].setVisible( isVisible );
        }

        paths.draw();
        drawConnectors();
    }



    function readCode ( addr )
    {
        if ( ! ( addr >= 0 && addr < MAX_PC ) ) {
            console.log( '[schematic] read code error: addr = ' + addr );
            return 0;
        }

        return elems.rom.load( addr );
    }



    function writeCode ( addr, data )
    {
        var path;

        if ( ! ( addr >= 0 && addr < MAX_PC && data >= 0 && data < 256 ) ) {
            console.log( '[schematic] write code error: addr = ' + addr + ', data = ' + data );
            return;
        }

        elems.rom.store( addr, data );

        if ( stateMap.currentPc === addr ) {
            elems.rom.action();
            ec.start();

            paths.onClock( 1 );
            ec.start();
        }
    }



    function getRegisterA ()
    {
        return getIC74HC161Output( elems.aReg );
    }



    function getRegisterB ()
    {
        return getIC74HC161Output( elems.bReg );
    }



    function getCarryFlag ()
    {
        return elems.cf.Q.getSignal();
    }



    function initModule ( $container )
    {
        var ctx;

        $container.html( configMap.main_html );
        setJqueryMap( $container );

        ctx = jq.$canvas.getContext( '2d' );

        ve.setCanvasContext( ctx );

        createTD4Schematic();
    }


    return {
        initModule : initModule,
        reset: reset,
        isRunning: isRunning,
        startClock: startClock,
        stopClock: stopClock,
        manualClock: manualClock,
        setInPort: setInPort,
        addOutpChangeListener: addOutpChangeListener,
        addPcChangeListener: addPcChangeListener,
        addClockStartedListener: addClockStartedListener,
        addClockStoppedListener: addClockStoppedListener,
        getRegisterA: getRegisterA,
        getRegisterB: getRegisterB,
        getCarryFlag: getCarryFlag,
        showWire: showWire,
        readCode: readCode,
        writeCode: writeCode
    };
}());
