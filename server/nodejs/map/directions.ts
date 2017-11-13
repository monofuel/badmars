
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license


export const N = Symbol();
export const S = Symbol();
export const E = Symbol();
export const W = Symbol();
export const C = Symbol();

export function getTypeName(type: Symbol): string {
	switch (type) {
		case N:
			return 'N';
		case S:
			return 'S';
		case W:
			return 'W';
		case E:
			return 'E';
		case C:
			return 'C';
		default:
			return 'unknown';
	}
}

export function getTypeFromName(name: string): Symbol {
	switch (name) {
		case 'N':
			return N;
		case 'S':
			return S;
		case 'E':
			return E;
		case 'W':
			return W;
		case 'C':
		default:
			return C;
	}
}
export default {
	N,
	S,
	E,
	W,
	C,
	getTypeName,
	getTypeFromName
};
