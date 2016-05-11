//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

exports.success = (type, data) => {
    data = data || {
        type: type,
        success: true
    };

    return JSON.stringify(data);
};

exports.errMsg = (type,errMsg) => {
    return JSON.stringify({ type: type, success: false, reason: errMsg});
};
