/* @flow */
import _ from 'lodash';

export async function makeRequest(url: string, method: string, params: ?Object, body?: FormData): Promise<any> {
    const xhttp = new XMLHttpRequest();
    const requestUrl = url + objectToParams(params);
    return new Promise((resolve, reject) => {
        xhttp.onload = () => {
            if (xhttp.readyState == 4) {
                try {
									const resp = JSON.parse(xhttp.responseText);
									if (xhttp.status === 200) {
										console.log('response',method,url,resp);
										resolve(resp);
									} else {
										console.error('reject',method,url,resp);
										reject(resp);
									}
								} catch (err) {
									console.log('response was probably not json');
									resolve(xhttp.responseText);
								}
            }
        };
				xhttp.onerror = (e) => {
					console.log('failed to send request',e);
					reject(e);
				}
        xhttp.open(method, requestUrl, true);
				xhttp.send(body);
    });
}

function objectToParams(params: ?Object): string {
    if (!params) {
        return '';
    }
    const paramsList = [];
    _.each(params, (value: any, name: string) => {
        if (Array.isArray(value)) {
            _.each(value, (element) => {
                paramsList.push(name + '=' + encodeURIComponent(element));
            });
        } else {
            paramsList.push(name + '=' + encodeURIComponent(value));
        }
    });
    return '?' + paramsList.join('&');
}
