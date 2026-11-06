import {Resvg} from '@resvg/resvg-js';import {readFileSync,writeFileSync} from 'node:fs';
const source=readFileSync(new URL('../templates/silvana-mark.svg',import.meta.url));writeFileSync(new URL('../templates/silvana-mark.png',import.meta.url),new Resvg(source,{fitTo:{mode:'width',value:192}}).render().asPng());console.log('Logo de correo generado desde el símbolo original de Silvana.');
