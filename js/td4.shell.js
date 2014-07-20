/*
 * td4.shell.js
 * Shell module for TD4
*/

/*jslint         browser : true, continue : true,
  devel  : true, indent  : 4,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true
*/
/*global $, td4 */

td4.shell = (function ()
{
    var
        configMap = {
            main_html : '<div class="td4-shell-head"><h1>TD-4GP02A</h1><</div>'
                        + '<div class="td4-shell-main">'
                            + '<div class="td4-shell-main-left">'
                                + '<div class="td4-shell-main-schematic"></div>'
                                + '<div class="td4-shell-main-ctrl"></div>'
                            + '</div>'
                            + '<div class="td4-shell-main-right">'
                                + '<div class="td4-shell-main-asm"></div>'
                            + '</div>'
                        + '</div>'
                        + '<div class="td4-shell-foot">Created Date: 2014-07-20</div>'
        },
        //stateMap = {},
        jq = {};  // jQuery map



    function setJqueryMap ( $container )
    {
        jq = {
            $container: $container,
            $schematic: $container.find( '.td4-shell-main-schematic' ),
            $ctrl: $container.find( '.td4-shell-main-ctrl' ),
            $asm: $container.find( '.td4-shell-main-asm' )
        };
    }



    function reset ()
    {
        td4.schematic.reset();
    }



    function isRunning ()
    {
        return td4.schematic.isRunning();
    }



    function startClock ( hz )
    {
        td4.schematic.startClock( hz );
    }



    function stopClock ()
    {
        td4.schematic.stopClock();
    }



    function manualClock ()
    {
        td4.schematic.manualClock();
    }



    function setInPort ( i, isOn )
    {
        td4.schematic.setInPort( i, isOn );
    }



    function addOutpChangeListener ( listener )
    {
        td4.schematic.addOutpChangeListener( listener );
    }



    function addPcChangeListener ( listener )
    {
        td4.schematic.addPcChangeListener( listener );
    }



    function addClockStartedListener ( listener )
    {
        td4.schematic.addClockStartedListener( listener );
    }



    function addClockStoppedListener ( listener )
    {
        td4.schematic.addClockStoppedListener( listener );
    }



    function showWire ( name, isVisible )
    {
        td4.schematic.showWire( name, isVisible );
    }



    function onCodeChange ( addr, data )
    {
        td4.schematic.writeCode( addr, data );
    }



    function getRegisterA ()
    {
        return td4.schematic.getRegisterA();
    }



    function getRegisterB ()
    {
        return td4.schematic.getRegisterB();
    }



    function getCarryFlag ()
    {
        return td4.schematic.getCarryFlag();
    }



    function initModule ( $container )
    {
        var addr, data;

        $container.html( configMap.main_html );
        setJqueryMap( $container );

        td4.schematic.initModule( jq.$schematic );
        td4.ctrl.initModule( jq.$ctrl );
        td4.asm.initModule( jq.$asm );

        td4.asm.addCodeChangeListener( { onCodeChange: onCodeChange } );

        for ( addr = 0; addr < td4.asm.MAX_PC; addr++ ) {
            data = td4.asm.readCode( addr );
            td4.schematic.writeCode( addr, data );
        }

        td4.schematic.reset();

        td4.schematic.startClock( 1 );
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
        showWire: showWire
    };
}());
