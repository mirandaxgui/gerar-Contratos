// utils/pipefyToken.js

let PIPEFY_TOKEN = null;

export function setPipefyToken(token) {
  PIPEFY_TOKEN = token;
}

export function getPipefyToken() {
  if (!PIPEFY_TOKEN) {
    throw new Error('PIPEFY_TOKEN ainda não foi carregado.');
  }

  return PIPEFY_TOKEN;
}