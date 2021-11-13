const aesjs = require('aes-js');
const msgpack5 = require('msgpack5');

// decrypt attempts to decrypt the traffic with the obtained
const decrypt = (data) => {
  if (!global.config.Config.Configuration.ivKey) return;

  const aesBody = data.subarray(0, data.length - 32);
  const aesKey = data.subarray(data.length - 32, data.length);
  const ivKey = Buffer.from(global.config.Config.Configuration.ivKey, 'utf8');

  const rawBody = new aesjs.ModeOfOperation.cbc(aesKey, ivKey).decrypt(aesBody);
  const body = rawBody.subarray(0, rawBody.length - rawBody[rawBody.length - 1]);
  const msgpack = msgpack5().decode(body);
  return msgpack;
};

module.exports = decrypt;
