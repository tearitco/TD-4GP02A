java  -jar tools\compiler.jar  --js_output_file=dest\js\td4.min.js  js\ec.js  js\ve.js  js\td4.js  js\td4.shell.js  js\td4.schematic.js  js\td4.ctrl.js  js\td4.asm.js

del css\td4all.css
copy css\td4.css + css\td4.shell.css + css\td4.schematic.css + css\td4.ctrl.css + css\td4.asm.css   css\td4all.css

java  -jar tools\yuicompressor.jar  -o  dest\css\td4.min.css  css\td4all.css

pause
