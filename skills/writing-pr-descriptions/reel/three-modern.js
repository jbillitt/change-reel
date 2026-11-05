// window.THREE_MODERN: unpatched three for lit 3D frames, plus the two addons they use. Bundled by build-reel.mjs.
import * as T from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

window.THREE_MODERN = { ...T, RoomEnvironment, RoundedBoxGeometry };
