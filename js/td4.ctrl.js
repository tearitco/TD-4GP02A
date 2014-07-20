/*
 * td4.ctrl.js
 * controller module
*/

/*jslint         browser : true, continue : true,
  devel  : true, indent  : 4,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true
*/
/*global $, td4 */

td4.ctrl = (function ()
{
    var
        PI2 = 2 * Math.PI,

        configMap = {
            main_html : '<div class="td4-ctrl">'
                        + '<fieldset class="td4-ctrl-show-wires">'
                            + '<legend>Show Wires</legend>'
                            + '<input type="checkbox" value="clock" checked>Clock&nbsp;&nbsp;</input>'
                            + '<input type="checkbox" value="reset" checked>Reset&nbsp;&nbsp;</input>'
                            + '<input type="checkbox" value="inp" checked>IN Port&nbsp;&nbsp;</input>'
                        + '</fieldset>'

                        + '<fieldset class="td4-ctrl-reset">'
                            + '<legend>Reset</legend>'
                            + '<input type="button" value="RESET" />'
                        + '</fieldset>'

                        + '<fieldset class="td4-ctrl-outp">'
                            + '<legend>OUT PORT</legend>'
                            + '<canvas class="td4-ctrl-outp-canvas" width="92" height="20">'
                            + 'Canvas not supported'
                            + '</canvas>'
                        + '</fieldset>'

                        + '<fieldset class="td4-ctrl-inp">'
                            + '<legend>IN PORT</legend>'
                            + '<input type="checkbox" value="3" />'
                            + '<input type="checkbox" value="2" />'
                            + '<input type="checkbox" value="1" />'
                            + '<input type="checkbox" value="0" />'
                        + '</fieldset>'

                        + '<fieldset class="td4-ctrl-clock">'
                            + '<legend>Clock</legend>'
                            + '<input type="button" value="Manual" />'
                            + '<input type="button" value="1Hz" />'
                            + '<input type="button" value="10Hz" />'
                        + '</fieldset>'

                        + '<fieldset class="td4-ctrl-registers">'
                            + '<legend>Registers</legend>'
                            + '<p>A: <span>0000 (0)</span>&nbsp;&nbsp;PC: <span>0000 (0)</span><br />B: <span>0000 (0)</span>&nbsp;&nbsp;CF: <span>OFF</span></p>'
                        + '</fieldset>'

                        + '</div>'
        },
        stateMap = {
            regA: 0,
            regB: 0,
            regPC: 0,
            regCF: 0
        },
        outpCtx,
        jq = {};  // jQuery map



    function setJqueryMap ( $container )
    {
        var $clock = $container.find( '.td4-ctrl-clock input[type=button]' ),
            $registers = $container.find( '.td4-ctrl-registers span' );

        jq = {
            $container: $container,
            $resetBtn: $container.find( '.td4-ctrl-reset input[type=button]' ),
            $manualClockBtn: $($clock[0]),
            $clock1Btn: $($clock[1]),
            $clock10Btn: $($clock[2]),
            $inp: $container.find( '.td4-ctrl-inp input[type=checkbox]' ),
            $outp: $container.find( '.td4-ctrl-outp-canvas' ),
            $showWires: $container.find( '.td4-ctrl-show-wires input[type=checkbox]' )
        };

        jq.$regA  = $( $registers[0] );
        jq.$regPC = $( $registers[1] );
        jq.$regB  = $( $registers[2] );
        jq.$regCF = $( $registers[3] );
    }



    function stopClock ()
    {
        if ( ! td4.shell.isRunning() ) {
            return;
        }

        td4.shell.stopClock();
    }



    function createClockBtnHandler ( lblName, hz )
    {
        return function () {
            var start = false;

            if ( this.value === lblName ) {
                start = true;
            }

            stopClock();

            if ( start ) {
                td4.shell.startClock( hz );
            }
        };
    }



    function onClockStart ( hz )
    {
        if ( hz === 1 ) {
            jq.$clock1Btn.val( 'stop' );
        } else if ( hz === 10 ) {
            jq.$clock10Btn.val( 'stop' );
        }
    }



    function onClockStop ()
    {
        if ( jq.$clock1Btn.val() === 'stop') {
            jq.$clock1Btn.val( '1Hz' );
        } else if ( jq.$clock10Btn.val() === 'stop' ) {
            jq.$clock10Btn.val( '10Hz' );
        }
    }



    function drawOutp ( i, isOn )
    {
        var x = (3-i) * 24 + 10;

        if ( isOn ) {
            outpCtx.fillStyle = "red";
        } else {
            outpCtx.fillStyle = "white";
        }

        outpCtx.beginPath();
        outpCtx.arc( x, 10, 9, 0, PI2 );
        outpCtx.fill();
        outpCtx.stroke();
    }



    function onOutpChange ( i, isOn )
    {
        drawOutp( i, isOn );
    }



    function pad ( num, len )
    {
        var s = num + String();

        while ( s.length < len ) {
            s = '0' + s;
        }

        return s;
    }



    function getRegValStr ( val )
    {
        return [ pad( val.toString( 2 ), 4), ' (', val, ')' ].join( '' );
    }



    function onPcChange ( pc )
    {
        var a, b, cf;

        a = td4.shell.getRegisterA();
        b = td4.shell.getRegisterB();
        cf = td4.shell.getCarryFlag();

        if ( stateMap.regA !== a ) {
            jq.$regA.text( getRegValStr( a ) );
            jq.$regA.css( 'background-color', '#ABFEBF' );
            stateMap.regA = a;
        } else {
            jq.$regA.css( 'background-color', '' );
        }

        if ( stateMap.regB !== b ) {
            jq.$regB.text( getRegValStr( b ) );
            jq.$regB.css( 'background-color', '#ABFEBF' );
            stateMap.regB = b;
        } else {
            jq.$regB.css( 'background-color', '' );
        }

        if ( stateMap.regPC !== pc ) {
            jq.$regPC.text( getRegValStr( pc ) );
            stateMap.regPC = pc;
        }

        if ( stateMap.regCF !== cf ) {
            if ( cf === 1 ) {
                jq.$regCF.text( 'ON' );
            } else if ( cf === 0 ) {
                jq.$regCF.text( 'OFF' );
            } else {
                jq.$regCF.text( '?' );
            }
            jq.$regCF.css( 'background-color', '#ABFEBF' );
            stateMap.regCF = cf;
        } else {
            jq.$regCF.css( 'background-color', '' );
        }
    }



    function initModule ( $container )
    {
        var i;

        $container.html( configMap.main_html );
        setJqueryMap( $container );


        td4.shell.addClockStartedListener( { onClockStart: onClockStart } );

        td4.shell.addClockStoppedListener( { onClockStop: onClockStop } );

        td4.shell.addOutpChangeListener( { onOutpChange: onOutpChange } );

        td4.shell.addPcChangeListener( { onPcChange: onPcChange } );


        jq.$resetBtn.click( function () {
            var state;

            if ( jq.$clock1Btn.val() === 'stop' ) {
                state = 1;
            } else if ( jq.$clock10Btn.val() === 'stop' ) {
                state = 10;
            }

            stopClock();

            td4.shell.reset();
            td4.shell.reset();

            if ( state === 1 ) {
                jq.$clock1Btn.click();
            } else if ( state === 10 ) {
                jq.$clock10Btn.click();
            }
        } );


        jq.$clock1Btn.click( createClockBtnHandler( '1Hz', 1 ) );
        jq.$clock10Btn.click( createClockBtnHandler( '10Hz', 10 ) );


        jq.$manualClockBtn.click( function () {
            stopClock();

            td4.shell.manualClock();
        } );


        jq.$inp.change( function() {
            td4.shell.setInPort( $(this).val(), $(this).is( ':checked' ) );
        } );


        jq.$showWires.change( function() {
            td4.shell.showWire( $(this).val(), $(this).is( ':checked' ) );
        } );


        outpCtx = jq.$outp[0].getContext( '2d' );
        outpCtx.strokeStyle = "black";

        for ( i = 0; i < 4; i++ ) {
            drawOutp( i, false );
        }
    }


    return { initModule : initModule };
}());
