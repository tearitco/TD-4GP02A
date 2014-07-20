/*
 * td4.js
 * TD4
*/

/*jslint         browser : true, continue : true,
  devel  : true, indent  : 4,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true
*/
/*global $, td4 */

var td4 = (function ()
{
    function initModule ( $container )
    {
        td4.shell.initModule( $container );
    }

    return { initModule: initModule };
}());
