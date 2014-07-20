/*
 * td4.asm.js
 * assembler module for TD4
*/

/*jslint         browser : true, continue : true,
  devel  : true, indent  : 4,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true, bitwise : true
*/
/*global $, td4 */

td4.asm = (function ()
{
    var
        MAX_PC = 16,

        RE_PARSE_EMPTY = /^\s*((;|#|\/\/).*)?$/,
        RE_PARSE_NOP   = /^\s*nop\s*((;|#|\/\/).*)?$/i,
        RE_PARSE_LABEL = /^\s*([\w\d_]+):\s*((;|#|\/\/).*)?$/,
        RE_PARSE_ARG1  = /^\s*(\w+)\s+([\w\d_]+)\s*((;|#|\/\/).*)?$/,
        RE_PARSE_ARG2  = /^\s*(\w+)\s+([\w\d_]+)\s*(?:\s|,)\s*([\w\d_]+)\s*((;|#|\/\/).*)?$/,

        RE_BIN_LIT = /^(?:0b)?((?:0|1){4})$/i,
        RE_HEX_LIT = /^0x0?([\da-f])$/i,
        RE_DEC_LIT = /^(1?\d)$/,

        OP_ADD_A_IM = 0x00,
        OP_MOV_A_B  = 0x10,
        OP_IN_A     = 0x20,
        OP_MOV_A_IM = 0x30,
        OP_MOV_B_A  = 0x40,
        OP_ADD_B_IM = 0x50,
        OP_IN_B     = 0x60,
        OP_MOV_B_IM = 0x70,
        OP_OUT_B    = 0x90,
        OP_OUT_IM   = 0xB0,
        OP_JNC_IM   = 0xE0,
        OP_JMP_IM   = 0xF0,

        ARG_OPS_NONE = 0,
        ARG_OPS_A    = 1,
        ARG_OPS_B    = 2,
        ARG_OPS_AB   = 3,
        ARG_OPS_IM   = 4,

        SAMPLE_RAMEN_TIMER = [ 0xB7, 0x01, 0xE1, 0x01, 0xE3, 0xB6, 0x01, 0xE6,
              0x01, 0xE8, 0xB0, 0xB4, 0x01, 0xEA, 0xB8, 0xFF ],

        SAMPLE_KNIGHT2K = [ 0xB3, 0xB6, 0xBC, 0xB8, 0xB8, 0xBC, 0xB6, 0xB3,
              0xB1, 0xF0 ],

        OPNAME_TO_OPCODE = {
            nop:   OP_ADD_A_IM,
            add:   OP_ADD_A_IM,
            mov:   OP_MOV_A_IM,
            out:   OP_OUT_IM,
            jmp:   OP_JMP_IM,
            'in':  OP_IN_A,
            jnc:   OP_JNC_IM
        },

        configMap = {
            main_html : '<div class="td4-asm">'

                        + '<fieldset class="td4-asm-code-table">'
                            + '<legend>Code</legend>'
                            + '<div><select class="td4-asm-code-table-sample">'
                                + '<option value="ramen">Ramen Timer</option>'
                                + '<option value="knight">Knight2K</option>'
                                + '<option value="custom">Custom</option>'
                            + '</select></div>'
                            + '{{TD4-ASM-CODE-ROWS}}'
                        + '</fieldset>'

                        + '<fieldset class="td4-asm-assembler">'
                            + '<legend>Assembler</legend>'
                            + '<div>'
                                + '<input type="button" value="Load"></input>'
                                + '<input type="button" value="Assemble"></input>'
                            + '</div>'
                            + '<textarea class="td4-asm-editor" rows="20" cols="40"></textarea>'
                            + '<textarea class="td4-asm-console rows="2" cols="40" readonly></textarea>'
                        + '</fieldset>'

                        + '</div>',

            init_code: SAMPLE_RAMEN_TIMER

        },
        stateMap = {
            code: null,
            currentPc: 0
        },
        jq = {},  // jQuery map
        codeChangeListeners = [];



    function setJqueryMap ( $container )
    {
        var i, $codeTbl, $selects, $buttons;

        jq = {
            $container: $container,
            $editor: $container.find( '.td4-asm-editor' ),
            $console: $container.find( '.td4-asm-console' ),
            $sample: $container.find( '.td4-asm-code-table-sample' )
        };

        jq.$codeTbl = [];
        jq.$opcodes = [];
        jq.$arg1 = [];
        jq.$arg2 = [];
        jq.$bin = [];
        jq.$breakPoints = [];

        $codeTbl = $container.find( '.td4-asm-code-row' );

        for ( i = 0; i < $codeTbl.length; i++ ) {
            jq.$codeTbl[i] = $( $codeTbl[i] );

            jq.$breakPoints[i] = jq.$codeTbl[i].find( 'input[type=checkbox]' );

            $selects = jq.$codeTbl[i].find( 'select' );
            jq.$opcodes[i] = $( $selects[0] );
            jq.$arg1[i] = $( $selects[1] );
            jq.$arg2[i] = $( $selects[2] );

            jq.$bin[i] = jq.$codeTbl[i].find( '.td4-asm-code-row-bin' );
        }


        $buttons = $container.find( '.td4-asm-assembler input[type=button]' );
        jq.$loadBtn = $( $buttons[0] );
        jq.$assembleBtn = $( $buttons[1] );
    }



    function pad ( num, len )
    {
        var s = num + String();

        while ( s.length < len ) {
            s = '0' + s;
        }

        return s;
    }



    function consoleWrite ( lineNo, msg )
    {
        if ( lineNo === null ) {
            jq.$console.text( msg );
        } else {
            jq.$console.text( ['line ', lineNo, ': ', msg ].join( '' ) );
        }
    }



    function getRegisterName ( s )
    {
        if ( s.toLowerCase() === 'a' || s.toLowerCase() === 'b' ) {
            return s.toLowerCase();
        }

        return null;
    }


    function getImmediateValue ( s )
    {
        var m, v;

        m = s.match( RE_BIN_LIT );

        if ( m ) {
            return parseInt( m[1], 2 );
        }

        m = s.match( RE_HEX_LIT );

        if ( m )
        {
            return parseInt( m[1], 16 );
        }

        m = s.match( RE_DEC_LIT );

        if ( ! m ) {
            return null;
        }

        v = parseInt( m[1], 10 );

        if ( v >= MAX_PC ) {
            return null;
        }

        return v;
    }



    function evalImmediateValue ( opcode, arg, lineNo )
    {
        var im = getImmediateValue( arg );

        if ( im === null ) {
            consoleWrite( lineNo, 'invalid immediate value ' + arg );
            return null;
        }

        return opcode | im;
    }



    function evalJump ( opcode, arg1, lineNo, labels )
    {
        if ( labels[arg1] !== undefined ) {
            return opcode | labels[arg1];
        }

        return evalImmediateValue( opcode, arg1, lineNo );
    }



    function evalOpArg1 ( op, arg1, lineNo, labels )
    {
        var reg;

        op = op.toLowerCase();
        arg1 = arg1.toLowerCase();

        if ( op === 'in' )
        {
            reg = getRegisterName( arg1 );

            if ( reg === null ) {
                consoleWrite( lineNo, "'in' op must take a or b argument" );
                return null;
            }

            if ( reg === 'a' ) {
                return OP_IN_A;
            }

            return OP_IN_B;
        }


        if ( op === 'out' )
        {
            if ( arg1.toLowerCase() === 'b' ) {
                return OP_OUT_B;
            }

            return evalImmediateValue( OP_OUT_IM, arg1, lineNo );
        }


        if ( op === 'jnc' ) {
            return evalJump( OP_JNC_IM, arg1, lineNo, labels );
        }


        if ( op === 'jmp' ) {
            return evalJump( OP_JMP_IM, arg1, lineNo, labels );
        }


        consoleWrite( lineNo, 'invalid op ' + op );
        return null;
    }



    function evalOpArg2 ( op, arg1, arg2, lineNo )
    {
        var reg, reg2;

        op = op.toLowerCase();
        arg1 = arg1.toLowerCase();
        arg2 = arg2.toLowerCase();


        if ( op === 'add' )
        {
            reg = getRegisterName( arg1 );

            if ( reg === null ) {
                consoleWrite( lineNo, "'add' op must take a or b argument" );
                return null;
            }

            if ( reg === 'a' ) {
                return evalImmediateValue( OP_ADD_A_IM, arg2, lineNo );
            }

            return evalImmediateValue( OP_ADD_B_IM, arg2, lineNo );
        }


        if ( op === 'mov' )
        {
            reg = getRegisterName( arg1 );

            if ( reg === null ) {
                consoleWrite( lineNo, "'in' op must take a or b argument" );
                return null;
            }

            reg2 = getRegisterName( arg2 );

            if ( reg === 'a' && reg2 === 'b' ) {
                return OP_MOV_A_B;
            }

            if ( reg === 'b' && reg2 === 'a' ) {
                return OP_MOV_B_A;
            }

            if ( reg === 'a' ) {
                return evalImmediateValue( OP_MOV_A_IM, arg2, lineNo );
            }

            return evalImmediateValue( OP_MOV_B_IM, arg2, lineNo );
        }


        consoleWrite( lineNo, 'invalid op ' + op );
        return null;
    }



    function addCode ( dst, code, lineNo )
    {
        if ( dst.length >= MAX_PC ) {
            consoleWrite( lineNo, 'over ' + MAX_PC + ' instructions' );
            return false;
        }

        dst.push( code );

        return true;
    }



    function assemble ( src )
    {
        var dst = [],
            lines = src.split( '\n' ),
            lineNo, line, labels = {}, labelName, m, code;

        for ( lineNo = 1; lineNo <= lines.length; lineNo++ )
        {
            line = lines[lineNo-1];

            // empty

            m = line.match( RE_PARSE_EMPTY );

            if ( m ) {
                continue;
            }


            // nop

            m = line.match( RE_PARSE_NOP );

            if ( m ) {
                if ( ! addCode( dst, OP_ADD_A_IM, lineNo ) ) {
                    return null;
                }

                continue;
            }


            // label

            m = line.match( RE_PARSE_LABEL );

            if ( m ) {
                labelName = m[1];

                if ( getRegisterName( labelName ) ) {
                    consoleWrite( lineNo, 'label name error. ' + labelName + ' is register name' );
                    return null;
                }

                if ( labels[labelName] !== undefined ) {
                    consoleWrite( lineNo, 'label name conflict error' );
                    return null;
                }

                labels[labelName] = dst.length;

                continue;
            }


            // arg1 op

            m = line.match( RE_PARSE_ARG1 );

            if ( m ) {
                code = evalOpArg1( m[1], m[2], lineNo, labels );

                if ( code === null ) {
                    return null;
                }

                if ( ! addCode( dst, code, lineNo ) ) {
                    return null;
                }

                continue;
            }


            // arg2 op

            m = line.match( RE_PARSE_ARG2 );

            if ( m ) {
                code = evalOpArg2( m[1], m[2], m[3], lineNo );

                if ( code === null ) {
                    return null;
                }

                if ( ! addCode( dst, code, lineNo ) ) {
                    return null;
                }

                continue;
            }


            consoleWrite( lineNo, 'syntax error' );
            return null;
        }

        return dst;
    }



    function createCodeTable ()
    {
        var i, a = [];

        for ( i = 0; i < MAX_PC; i++ )
        {
            a = a.concat( [ '<div class="td4-asm-code-row">',
                    '<input type="checkbox"></input><span>',
                    pad( i, 2 ),
                    '</span><select><option value="',
                    i, ',add">ADD</option><option value="',
                    i, ',mov">MOV</option><option value="',
                    i, ',out">OUT</option><option value="',
                    i, ',jmp">JMP</option><option value="',
                    i, ',in">IN</option><option value="',
                    i, ',jnc">JNC</option></select>',
                    '<select disabled></select><select disabled></select>',
                    '<span class="td4-asm-code-row-bin">0000 0000 (0x00)</span></div>' ] );
        }

        configMap.main_html = configMap.main_html.replace( '{{TD4-ASM-CODE-ROWS}}', a.join( '' ) );
    }



    function setArgSelectSub( i, sel, ops )
    {
        var k;

        sel.text( '' );

        if ( ops === ARG_OPS_NONE )
        {
            sel.prop( 'disabled', 'disabled' );
            return;
        }

        sel.prop( 'disabled', false );

        if ( ops & ARG_OPS_A ) {
            sel.append( $( '<option>A</option>' ).val( i + ',a' ) );
        }

        if ( ops & ARG_OPS_B ) {
            sel.append( $( '<option>B</option>' ).val( i + ',b' ) );
        }

        if ( ops & ARG_OPS_IM ) {
            for ( k = 0; k < MAX_PC; k++ ) {
                sel.append( $( '<option></option>' ).val( i + ',' + k ).text( k ) );
            }
        }
    }



    function setArgSelect( i, opsArg1, opsArg2 )
    {
        setArgSelectSub( i, jq.$arg1[i], opsArg1 );
        setArgSelectSub( i, jq.$arg2[i], opsArg2 );
    }



    function setBinText ( i, val )
    {
        var a, hi = (val & 0xF0) >> 4, low = val & 0x0F;

        a = [ pad( hi.toString( 2 ), 4), ' ', pad( low.toString( 2 ), 4 ), ' (0x', pad( val.toString( 16 ).toUpperCase(), 2 ), ')' ];

        jq.$bin[i].text( a.join( '' ) );
    }



    function notifyCodeChange ( addr, data )
    {
        var i;

        for ( i = 0; i < codeChangeListeners.length; i++ ) {
            codeChangeListeners[i].onCodeChange( addr, data );
        }
    }



    function setCode ( addr, data )
    {
        stateMap.code[addr] = data;

        setBinText( addr, data );

        notifyCodeChange( addr, data );
    }



    function writeCode ( addr, data )
    {
        var opcode, im;

        if ( ! ( addr >= 0 && addr < MAX_PC && data >= 0 && data < 256 ) ) {
            console.log( '[asm] write code error: addr = ' + addr + ', data = ' + data );
            return false;
        }


        opcode = data & 0xF0;
        im = data & 0x0F;

        switch ( opcode )
        {
        case OP_ADD_A_IM:
            setArgSelect( addr, ARG_OPS_AB, ARG_OPS_IM );
            jq.$opcodes[addr].val( addr + ',add' );
            jq.$arg1[addr].val( addr + ',a' );
            jq.$arg2[addr].val( addr + ',' + im );

            break;


        case OP_MOV_A_B:
            setArgSelect( addr, ARG_OPS_AB, ARG_OPS_AB | ARG_OPS_IM );
            jq.$opcodes[addr].val( addr + ',mov' );
            jq.$arg1[addr].val( addr + ',a' );
            jq.$arg2[addr].val( addr + ',b' );

            if ( im ) {
                console.log( 'writeCode error: addr = ' + addr + ', data = ' + data );
                return false;
            }

            break;


        case OP_IN_A:
            setArgSelect( addr, ARG_OPS_AB, ARG_OPS_NONE );
            jq.$opcodes[addr].val( addr + ',in' );
            jq.$arg1[addr].val( addr + ',a' );

            if ( im ) {
                console.log( 'writeCode error: addr = ' + addr + ', data = ' + data );
                return false;
            }

            break;


        case OP_MOV_A_IM:
            setArgSelect( addr, ARG_OPS_AB, ARG_OPS_AB | ARG_OPS_IM );
            jq.$opcodes[addr].val( addr + ',mov' );
            jq.$arg1[addr].val( addr + ',a' );
            jq.$arg2[addr].val( addr + ',' + im );
            break;


        case OP_MOV_B_A:
            setArgSelect( addr, ARG_OPS_AB, ARG_OPS_AB | ARG_OPS_IM );
            jq.$opcodes[addr].val( addr + ',mov' );
            jq.$arg1[addr].val( addr + ',b' );
            jq.$arg2[addr].val( addr + ',a' );

            if ( im ) {
                console.log( 'writeCode error: addr = ' + addr + ', data = ' + data );
                return false;
            }

            break;


        case OP_ADD_B_IM:
            setArgSelect( addr, ARG_OPS_AB, ARG_OPS_IM );
            jq.$opcodes[addr].val( addr + ',add' );
            jq.$arg1[addr].val( addr + ',b' );
            jq.$arg2[addr].val( addr + ',' + im );
            break;


        case OP_IN_B:
            setArgSelect( addr, ARG_OPS_AB, ARG_OPS_NONE );
            jq.$opcodes[addr].val( addr + ',in' );
            jq.$arg1[addr].val( addr + ',b' );

            if ( im ) {
                console.log( 'writeCode error: addr = ' + addr + ', data = ' + data );
                return false;
            }

            break;


        case OP_MOV_B_IM:
            setArgSelect( addr, ARG_OPS_AB, ARG_OPS_AB | ARG_OPS_IM );
            jq.$opcodes[addr].val( addr + ',mov' );
            jq.$arg1[addr].val( addr + ',b' );
            jq.$arg2[addr].val( addr + ',' + im );
            break;


        case OP_OUT_B:
            setArgSelect( addr, ARG_OPS_B | ARG_OPS_IM, ARG_OPS_NONE );
            jq.$opcodes[addr].val( addr + ',out' );
            jq.$arg1[addr].val( addr + ',b' );

            if ( im ) {
                console.log( 'writeCode error: addr = ' + addr + ', data = ' + data );
                return false;
            }

            break;


        case OP_OUT_IM:
            setArgSelect( addr, ARG_OPS_B | ARG_OPS_IM, ARG_OPS_NONE );
            jq.$opcodes[addr].val( addr + ',out' );
            jq.$arg1[addr].val( addr + ',' + im );
            break;


        case OP_JNC_IM:
            setArgSelect( addr, ARG_OPS_IM, ARG_OPS_NONE );
            jq.$opcodes[addr].val( addr + ',jnc' );
            jq.$arg1[addr].val( addr + ',' + im );
            break;


        case OP_JMP_IM:
            setArgSelect( addr, ARG_OPS_IM, ARG_OPS_NONE );
            jq.$opcodes[addr].val( addr + ',jmp' );
            jq.$arg1[addr].val( addr + ',' + im );
            break;


        default:
            console.log( 'onOpcodeChange error: invalid opcode ' + opcode );
            break;
        }

        setCode( addr, data );

        return true;
    }



    function onOpcodeChange ()
    {
        var i, op, a;

        a = $(this).val().split( ',' );
        i = parseInt( a[0], 10 );
        op = a[1];

        if ( OPNAME_TO_OPCODE[op] !== undefined ) {
            writeCode( i, OPNAME_TO_OPCODE[op] );

            jq.$sample.val( 'custom' );
        } else {
            console.log( 'onOpcodeChange error: invalid op ' + op );
        }
    }



    function getBinaryCode ( i )
    {
        var op, arg1, arg2, im;

        if ( ! ( i >= 0 && i < MAX_PC ) ) {
            return null;
        }

        op = jq.$opcodes[i].val().split( ',' )[1];
        arg1 = jq.$arg1[i].val().split( ',')[1];
        try {
            arg2 = jq.$arg2[i].val().split( ',' )[1];
        } catch ( err ) {
            arg2 = null;
        }


        if ( op === 'add' )
        {
            im = parseInt( arg2, 10 );

            if ( arg1 === 'a' ) {
                return OP_ADD_A_IM | im;
            }

            return OP_ADD_B_IM | im;
        }


        if ( op === 'mov' )
        {
            if ( arg1 === 'a' && arg2 === 'b' ) {
                return OP_MOV_A_B;
            }

            if ( arg1 === 'b' && arg2 === 'a' ) {
                return OP_MOV_B_A;
            }

            im = parseInt( arg2, 10 );

            if ( arg1 === 'a' ) {
                return OP_MOV_A_IM | im;
            }

            return OP_MOV_B_IM | im;
        }


        if ( op === 'out' )
        {
            if ( arg1 === 'b' ) {
                return OP_OUT_B;
            }

            return OP_OUT_IM | parseInt( arg1, 10 );
        }


        if ( op === 'jmp' ) {
            return OP_JMP_IM | parseInt( arg1, 10 );
        }


        if ( op === 'in' )
        {
            if ( arg1 === 'a' ) {
                return OP_IN_A;
            }

            return OP_IN_B;
        }


        if ( op === 'jnc' ) {
            return OP_JNC_IM | parseInt( arg1, 10 );
        }


        return null;
    }



    function onArgChange ()
    {
        var i, a, bin;

        a = $(this).val().split( ',' );
        i = parseInt( a[0], 10 );

        bin = getBinaryCode( i );

        if ( bin !== null ) {
            setCode( i, bin );
        }

        jq.$sample.val( 'custom' );
    }



    function onPcChange ( pc )
    {
        if ( pc === stateMap.currentPc ) {
            return;
        }

        jq.$codeTbl[stateMap.currentPc].css( 'background-color', '' );
        jq.$codeTbl[pc].css( 'background-color', '#ABBFFE' );

        stateMap.currentPc = pc;

        if ( jq.$breakPoints[pc].is( ':checked' ) ) {
            jq.$codeTbl[pc].css( 'background-color', '#FEABBF' );
            td4.shell.stopClock();
        }
    }



    function readCode ( addr )
    {
        if ( ! ( addr >= 0 && addr < MAX_PC ) ) {
            console.log( '[asm] read code error: addr = ' + addr );
            return 0;
        }


        return stateMap.code[addr];
    }



    function loadCode ()
    {
        var i, code;

        if ( typeof configMap.init_code === 'string' )
        {
            jq.$editor.text( configMap.init_code );

            code = assemble( configMap.init_code );

            if ( code ) {
                stateMap.code = code;
            } else {
                stateMap.code = [];
            }
        }
        else {
            stateMap.code = configMap.init_code.slice( 0 );  // copy
        }

        for ( i = 0; i < MAX_PC; i++ ) {
            if ( i >= stateMap.code.length ) {
                stateMap.code[i] = 0;
            }

            writeCode( i, stateMap.code[i] );
        }
    }



    function addCodeChangeListener ( listener )
    {
        codeChangeListeners.push( listener );
    }



    function getAssemblerText ()
    {
        var i, maxInstNo, a = [ '' ], opcode, im;

        maxInstNo = MAX_PC;

        for ( i = MAX_PC - 1; i >= 0; i-- )
        {
            if ( stateMap.code[i] !== 0 ) {
                break;
            }
        }

        if ( i === -1 ) {
            return '';
        }

        maxInstNo = i + 1;

        for ( i = 0; i < maxInstNo; i++ )
        {
            opcode = stateMap.code[i] & 0xF0;
            im = stateMap.code[i] & 0x0F;

            if ( opcode === OP_ADD_A_IM ) {
                if ( im === 0 ) {
                    a.push( 'nop\n' );
                } else {
                    a.push( 'add a, ' );
                    a.push( im );
                    a.push( '\n' );
                }
            } else if ( opcode === OP_MOV_A_B ) {
                a.push( 'mov a, b\n' );
            } else if ( opcode === OP_IN_A ) {
                a.push( 'in  a\n' );
            } else if ( opcode === OP_MOV_A_IM ) {
                a.push( 'mov a, ' );
                a.push( im );
                a.push( '\n' );
            } else if ( opcode === OP_MOV_B_A ) {
                a.push( 'mov b, a\n' );
            } else if ( opcode === OP_ADD_B_IM ) {
                if ( im === 0 ) {
                    a.push( 'nop\n' );
                } else {
                    a.push( 'add b, ' );
                    a.push( im );
                    a.push( '\n' );
                }
            } else if ( opcode === OP_IN_B ) {
                a.push( 'in  b\n' );
            } else if ( opcode === OP_MOV_B_IM ) {
                a.push( 'mov b, ' );
                a.push( im );
                a.push( '\n' );
            } else if ( opcode === OP_OUT_B ) {
                a.push( 'out b\n' );
            } else if ( opcode === OP_OUT_IM ) {
                a.push( 'out ' );
                a.push( im );
                a.push( '\n' );
            } else if ( opcode === OP_JNC_IM ) {
                a.push( 'jnc ' );
                a.push( im );
                a.push( '\n' );
            } else if ( opcode === OP_JMP_IM ) {
                a.push( 'jmp ' );
                a.push( im );
                a.push( '\n' );
            } else {
                console.log( 'getAssemblerText error: invalid opcode ' + opcode );
            }
        }

        return a.join( '' );
    }



    function initModule ( $container )
    {
        var i;

        createCodeTable();

        $container.html( configMap.main_html );
        setJqueryMap( $container );

        for ( i = 0; i < MAX_PC; i++ )
        {
            jq.$opcodes[i].change( onOpcodeChange );
            jq.$arg1[i].change( onArgChange );
            jq.$arg2[i].change( onArgChange );
        }

        jq.$codeTbl[0].css( 'background-color', '#ABBFFE' );

        td4.shell.addPcChangeListener( { onPcChange: onPcChange } );

        loadCode();


        jq.$loadBtn.click( function () {
            jq.$editor.val( getAssemblerText() );
            consoleWrite( null, 'done' );
        } );


        jq.$assembleBtn.click( function () {
            var i, code;

            code = assemble( jq.$editor.val() );

            if ( ! code ) {
                return;
            }

            stateMap.code = code;

            for ( i = 0; i < MAX_PC; i++ ) {
                if ( i >= stateMap.code.length ) {
                    stateMap.code[i] = 0;
                }

                writeCode( i, stateMap.code[i] );
            }

            consoleWrite( null, 'well done' );
            jq.$sample.val( 'custom' );
        } );


        jq.$sample.change( function () {
            var i, val = $( this ).val(), code;

            if ( val === 'ramen' ) {
                code = SAMPLE_RAMEN_TIMER;
            } else if ( val === 'knight' ) {
                code = SAMPLE_KNIGHT2K;
            } else {
                return;
            }

            stateMap.code = code.slice( 0 );  // copy

            if ( td4.shell.isRunning() ) {
                td4.shell.stopClock();
            }

            for ( i = 0; i < MAX_PC; i++ ) {
                if ( i >= stateMap.code.length ) {
                    stateMap.code[i] = 0;
                }

                writeCode( i, stateMap.code[i] );
            }

            td4.shell.reset();
            td4.shell.reset();

        } );
    }


    return {
        initModule : initModule,
        MAX_PC: MAX_PC,
        readCode: readCode,
        wirteCode: writeCode,
        assemble: assemble,
        addCodeChangeListener: addCodeChangeListener
    };
}());
